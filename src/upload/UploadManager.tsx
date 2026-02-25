import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import {
  uploadImage,
  hashBlobSha256,
  hasImageWithContentHash,
  backfillMissingContentHashes,
  fetchAllImages,
} from '../lib/supabase'
import { addUploadHistoryEntry } from '../lib/storage'
import { UploadManagerContext } from './UploadManagerContext'
import type { UploadManagerValue } from './UploadManagerContext'

interface UploadQueueItem {
  file: File
  batchId: string
}

interface UploadBatchMeta {
  id: string
  startedAt: string
  selected: number
  isLargeBatch: boolean
  processed: number
  uploaded: number
  skipped: number
  failed: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function UploadManagerProvider({ children }: { children: React.ReactNode }) {
  const uploadQueueRef = useRef<UploadQueueItem[]>([])
  const processingQueueRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const backfillCompletedRef = useRef(false)
  const uploadBatchMetaRef = useRef<Record<string, UploadBatchMeta>>({})

  const [uploading, setUploading] = useState(false)
  const [stoppingUpload, setStoppingUpload] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [uploadProgress, setUploadProgress] = useState('')
  const [sessionUploaded, setSessionUploaded] = useState(0)
  const [sessionSkipped, setSessionSkipped] = useState(0)
  const [sessionFailed, setSessionFailed] = useState(0)
  const [lastUploadEvent, setLastUploadEvent] = useState('')
  const [totalPhotos, setTotalPhotos] = useState(0)

  const loadTotalPhotos = useCallback(async () => {
    try {
      const images = await fetchAllImages()
      setTotalPhotos(images.length)
    } catch (err) {
      console.warn('Failed to load total photo count', err)
    }
  }, [])

  const uploadWithRetry = useCallback(async (
    id: string,
    thumbBlob: Blob,
    fullBlob: Blob,
    filename: string,
    contentHash: string,
    isLargeBatch: boolean
  ) => {
    let lastError: unknown = null
    const maxAttempts = isLargeBatch ? 4 : 2
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await uploadImage(id, thumbBlob, fullBlob, filename, contentHash)
      } catch (err) {
        lastError = err
        if (attempt === maxAttempts) break
        const delay = isLargeBatch
          ? 650 * 2 ** (attempt - 1) + Math.floor(Math.random() * 220)
          : 500 * attempt
        await sleep(delay)
      }
    }
    throw lastError
  }, [])

  const drainUploadQueue = useCallback(async () => {
    if (processingQueueRef.current) return
    processingQueueRef.current = true
    setUploading(true)
    setSessionUploaded(0)
    setSessionSkipped(0)
    setSessionFailed(0)
    setLastUploadEvent('')
    let uploaded = 0
    let skipped = 0
    let failed = 0
    let processed = 0
    let consecutiveFailures = 0

    try {
      if (!backfillCompletedRef.current) {
        setUploadProgress('Backfilling existing photos...')
        const backfill = await backfillMissingContentHashes((progress) => {
          if (progress.total === 0) {
            setUploadProgress('Backfilling existing photos... already up to date')
            return
          }
          setUploadProgress(`Backfilling existing photos... ${progress.processed}/${progress.total}`)
        })
        if (backfill.failed > 0) {
          console.warn('Some existing images could not be backfilled', backfill)
        } else {
          backfillCompletedRef.current = true
        }
      }

      while (uploadQueueRef.current.length > 0 && !stopRequestedRef.current) {
        const nextItem = uploadQueueRef.current.shift()
        if (!nextItem) break
        const { file, batchId } = nextItem
        const batch = uploadBatchMetaRef.current[batchId]
        const isLargeBatch = batch?.isLargeBatch ?? false
        setQueuedCount(uploadQueueRef.current.length)
        processed++
        setUploadProgress(`Processing ${processed}... ${uploadQueueRef.current.length} queued`)
        try {
          const thumbBlob = await imageCompression(file, {
            maxWidthOrHeight: 400,
            fileType: 'image/webp',
            maxSizeMB: 0.05,
            useWebWorker: true,
          })

          const fullBlob = await imageCompression(file, {
            maxWidthOrHeight: 1920,
            fileType: 'image/webp',
            maxSizeMB: 0.4,
            useWebWorker: true,
          })

          const contentHash = await hashBlobSha256(fullBlob)
          const exists = await hasImageWithContentHash(contentHash)
          if (exists) {
            skipped++
            setSessionSkipped(skipped)
            setLastUploadEvent(`Duplicate found: ${file.name}`)
            if (batch) batch.skipped++
            setUploadProgress(`Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''} · ${uploadQueueRef.current.length} queued`)
            continue
          }

          const id = crypto.randomUUID()
          const result = await uploadWithRetry(id, thumbBlob, fullBlob, file.name, contentHash, isLargeBatch)

          if (result.status === 'duplicate') {
            skipped++
            setSessionSkipped(skipped)
            setLastUploadEvent(`Duplicate found: ${file.name}`)
            if (batch) batch.skipped++
            setUploadProgress(`Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''} · ${uploadQueueRef.current.length} queued`)
            continue
          }

          uploaded++
          setSessionUploaded(uploaded)
          setLastUploadEvent(`Uploaded: ${file.name}`)
          consecutiveFailures = 0
          setTotalPhotos((prev) => prev + 1)
          if (batch) batch.uploaded++
          setUploadProgress(`Uploaded ${uploaded} · Skipped ${skipped} · ${uploadQueueRef.current.length} queued`)
        } catch (err) {
          consecutiveFailures++
          failed++
          setSessionFailed(failed)
          setLastUploadEvent(`Failed: ${file.name}`)
          if (batch) batch.failed++
          console.error('Upload failed for', file.name, err)
          setUploadProgress(`Failed ${failed} · ${uploadQueueRef.current.length} queued (retrying with backoff)`)
          await sleep(isLargeBatch && consecutiveFailures >= 3 ? 3600 : 1200)
        } finally {
          if (batch) {
            batch.processed++
            if (batch.processed >= batch.selected) {
              await addUploadHistoryEntry({
                id: batch.id,
                startedAt: batch.startedAt,
                finishedAt: new Date().toISOString(),
                selected: batch.selected,
                uploaded: batch.uploaded,
                skipped: batch.skipped,
                failed: batch.failed,
              })
              delete uploadBatchMetaRef.current[batch.id]
            }
          }
          if (isLargeBatch) {
            await sleep(120)
          }
        }
      }

      setUploadProgress(
        `${stopRequestedRef.current ? 'Stopped!' : 'Done!'} Uploaded ${uploaded}, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}${failed > 0 ? `, failed ${failed}` : ''}`
      )
    } catch (err) {
      console.error('Upload queue failed', err)
      setUploadProgress('Upload queue hit an error. You can add photos again to retry.')
    } finally {
      processingQueueRef.current = false
      if (stopRequestedRef.current) {
        uploadQueueRef.current = []
      }
      setQueuedCount(uploadQueueRef.current.length)
      if (uploadQueueRef.current.length > 0 && !stopRequestedRef.current) {
        void drainUploadQueue()
      } else {
        setStoppingUpload(false)
        stopRequestedRef.current = false
        await loadTotalPhotos()
        setTimeout(() => {
          if (!processingQueueRef.current && uploadQueueRef.current.length === 0) {
            setUploading(false)
            setUploadProgress('')
            setLastUploadEvent('')
          }
        }, 2000)
      }
    }
  }, [loadTotalPhotos, uploadWithRetry])

  const stopUploads = useCallback(() => {
    if (!uploading) return
    stopRequestedRef.current = true
    setStoppingUpload(true)
    uploadQueueRef.current = []
    setQueuedCount(0)
    setUploadProgress('Stopping after current photo...')
  }, [uploading])

  const enqueueFiles = useCallback((filesInput: FileList | File[]) => {
    const files = Array.isArray(filesInput) ? filesInput : Array.from(filesInput)
    if (files.length === 0) return
    stopRequestedRef.current = false
    setStoppingUpload(false)
    const batchId = crypto.randomUUID()
    uploadBatchMetaRef.current[batchId] = {
      id: batchId,
      startedAt: new Date().toISOString(),
      selected: files.length,
      isLargeBatch: files.length > 50,
      processed: 0,
      uploaded: 0,
      skipped: 0,
      failed: 0,
    }
    uploadQueueRef.current.push(...files.map((file) => ({ file, batchId })))
    setQueuedCount(uploadQueueRef.current.length)

    if (!processingQueueRef.current) {
      void drainUploadQueue()
    } else {
      setUploadProgress(`Added ${files.length} more · ${uploadQueueRef.current.length} queued`)
    }
  }, [drainUploadQueue])

  useEffect(() => {
    void loadTotalPhotos()
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadTotalPhotos()
        if (uploadQueueRef.current.length > 0 && !processingQueueRef.current) {
          void drainUploadQueue()
        }
      }
    }
    window.addEventListener('focus', refreshOnVisible)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      window.removeEventListener('focus', refreshOnVisible)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [drainUploadQueue, loadTotalPhotos])

  const value = useMemo<UploadManagerValue>(() => ({
    uploading,
    stoppingUpload,
    queuedCount,
    uploadProgress,
    sessionUploaded,
    sessionSkipped,
    sessionFailed,
    lastUploadEvent,
    totalPhotos,
    enqueueFiles,
    stopUploads,
  }), [
    uploading,
    stoppingUpload,
    queuedCount,
    uploadProgress,
    sessionUploaded,
    sessionSkipped,
    sessionFailed,
    lastUploadEvent,
    totalPhotos,
    enqueueFiles,
    stopUploads,
  ])

  return (
    <UploadManagerContext.Provider value={value}>
      {children}
    </UploadManagerContext.Provider>
  )
}

