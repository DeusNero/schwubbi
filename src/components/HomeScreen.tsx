import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  uploadImage,
  getThumbUrl,
  hashBlobSha256,
  hasImageWithContentHash,
  backfillMissingContentHashes,
  fetchAllImages,
} from '../lib/supabase'
import imageCompression from 'browser-image-compression'
import { LeaderboardSketchIcon } from './icons/SketchIcons'
import { getAllElos, addUploadHistoryEntry } from '../lib/storage'

interface HeroOption {
  src: string
  rank: number | null
}

const HERO_MEDAL_COLORS: Record<number, string> = {
  1: 'var(--gold)',
  2: 'var(--silver)',
  3: 'var(--bronze)',
}

const HERO_MEDAL_ICONS: Record<number, string> = {
  1: '👑',
  2: '🥈',
  3: '🥉',
}

interface UploadQueueItem {
  file: File
  batchId: string
}

interface UploadBatchMeta {
  id: string
  startedAt: string
  selected: number
  processed: number
  uploaded: number
  skipped: number
  failed: number
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadQueueRef = useRef<UploadQueueItem[]>([])
  const processingQueueRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const backfillCompletedRef = useRef(false)
  const uploadBatchMetaRef = useRef<Record<string, UploadBatchMeta>>({})
  const defaultHeroSrc = `${import.meta.env.BASE_URL}schwubbi-hero.png`
  const [uploading, setUploading] = useState(false)
  const [stoppingUpload, setStoppingUpload] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showPaw, setShowPaw] = useState(false)
  const [celebrateUpload, setCelebrateUpload] = useState(false)
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [heroOptions, setHeroOptions] = useState<HeroOption[]>([{ src: defaultHeroSrc, rank: null }])
  const [heroIdx, setHeroIdx] = useState(0)
  const buildDate = new Date(import.meta.env.VITE_BUILD_TIME ?? '')
  const buildLabel = Number.isNaN(buildDate.getTime())
    ? 'Build time unavailable'
    : `Built ${buildDate.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`

  useEffect(() => {
    let isMounted = true

    const loadHeroOptions = async () => {
      try {
        const all = await getAllElos()
        if (!isMounted) return

        const topThree = all
          .filter((entry) => entry.matchups > 0)
          .sort((a, b) => b.elo - a.elo)
          .slice(0, 3)

        if (topThree.length === 0) {
          setHeroOptions([{ src: defaultHeroSrc, rank: null }])
          setHeroIdx(0)
          return
        }

        const options: HeroOption[] = topThree.map((entry, i) => {
          const thumbSrc = getThumbUrl(entry.imageId)
          return {
            src: thumbSrc || defaultHeroSrc,
            rank: i + 1,
          }
        })

        setHeroOptions(options)
        setHeroIdx(0)
      } catch (err) {
        console.warn('Failed to load hero choices', err)
        if (!isMounted) return
        setHeroOptions([{ src: defaultHeroSrc, rank: null }])
        setHeroIdx(0)
      }
    }

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadHeroOptions()
      }
    }

    void loadHeroOptions()
    window.addEventListener('focus', refreshOnVisible)
    document.addEventListener('visibilitychange', refreshOnVisible)

    return () => {
      isMounted = false
      window.removeEventListener('focus', refreshOnVisible)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [defaultHeroSrc])

  useEffect(() => {
    let isMounted = true
    const loadTotalPhotos = async () => {
      try {
        const images = await fetchAllImages()
        if (!isMounted) return
        setTotalPhotos(images.length)
      } catch (err) {
        console.warn('Failed to load total photo count', err)
      }
    }

    void loadTotalPhotos()
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadTotalPhotos()
      }
    }
    window.addEventListener('focus', refreshOnVisible)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      isMounted = false
      window.removeEventListener('focus', refreshOnVisible)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [])

  const showPreviousHero = useCallback(() => {
    if (heroOptions.length <= 1) return
    setHeroIdx((i) => (i - 1 + heroOptions.length) % heroOptions.length)
  }, [heroOptions.length])

  const showNextHero = useCallback(() => {
    if (heroOptions.length <= 1) return
    setHeroIdx((i) => (i + 1) % heroOptions.length)
  }, [heroOptions.length])

  const activeHero = heroOptions[heroIdx] ?? heroOptions[0]

  const uploadWithRetry = async (
    id: string,
    thumbBlob: Blob,
    fullBlob: Blob,
    filename: string,
    contentHash: string
  ) => {
    let lastError: unknown = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await uploadImage(id, thumbBlob, fullBlob, filename, contentHash)
      } catch (err) {
        lastError = err
        if (attempt === 2) break
        await new Promise((r) => setTimeout(r, 500 * attempt))
      }
    }
    throw lastError
  }

  const drainUploadQueue = useCallback(async () => {
    if (processingQueueRef.current) return
    processingQueueRef.current = true
    setUploading(true)
    let uploaded = 0
    let skipped = 0
    let failed = 0
    let processed = 0

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
            if (batch) {
              batch.skipped++
            }
            setUploadProgress(`Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''} · ${uploadQueueRef.current.length} queued`)
            continue
          }

          const id = crypto.randomUUID()
          const result = await uploadWithRetry(id, thumbBlob, fullBlob, file.name, contentHash)

          if (result.status === 'duplicate') {
            skipped++
            if (batch) {
              batch.skipped++
            }
            setUploadProgress(`Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''} · ${uploadQueueRef.current.length} queued`)
            continue
          }

          uploaded++
          if (batch) {
            batch.uploaded++
          }
          setUploadProgress(`Uploaded ${uploaded} · Skipped ${skipped} · ${uploadQueueRef.current.length} queued`)
        } catch (err) {
          failed++
          if (batch) {
            batch.failed++
          }
          console.error('Upload failed for', file.name, err)
          setUploadProgress(`Failed ${failed} · ${uploadQueueRef.current.length} queued (check connection)`)
          await new Promise((r) => setTimeout(r, 900))
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
        }
      }

      setUploadProgress(
        `${stopRequestedRef.current ? 'Stopped!' : 'Done!'} Uploaded ${uploaded}, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}${failed > 0 ? `, failed ${failed}` : ''}`
      )
      if (uploaded > 0) {
        setShowPaw(true)
        setCelebrateUpload(true)
        setTimeout(() => setShowPaw(false), 1200)
        setTimeout(() => setCelebrateUpload(false), 1400)
      }
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
        setTimeout(() => {
          if (!processingQueueRef.current && uploadQueueRef.current.length === 0) {
            setUploading(false)
            setUploadProgress('')
          }
        }, 2000)
      }
    }
  }, [])

  const handleStopUploads = useCallback(() => {
    if (!uploading) return
    stopRequestedRef.current = true
    setStoppingUpload(true)
    uploadQueueRef.current = []
    setQueuedCount(0)
    setUploadProgress('Stopping after current photo...')
  }, [uploading])

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    stopRequestedRef.current = false
    setStoppingUpload(false)
    const batchId = crypto.randomUUID()
    uploadBatchMetaRef.current[batchId] = {
      id: batchId,
      startedAt: new Date().toISOString(),
      selected: files.length,
      processed: 0,
      uploaded: 0,
      skipped: 0,
      failed: 0,
    }
    uploadQueueRef.current.push(...Array.from(files).map((file) => ({ file, batchId })))
    setQueuedCount(uploadQueueRef.current.length)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (!processingQueueRef.current) {
      void drainUploadQueue()
    } else {
      setUploadProgress(`Added ${files.length} more · ${uploadQueueRef.current.length} queued`)
    }
  }, [drainUploadQueue])

  return (
    <div className="screen" style={{ gap: 28 }}>
      <motion.button
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="btn btn-icon btn-secondary btn-note"
        onClick={() => navigate('/backup')}
        style={{ position: 'absolute', top: 24, right: 24, fontSize: 22 }}
        aria-label="Open settings"
      >
        ⚙
      </motion.button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="paper-card"
        style={{ textAlign: 'center', maxWidth: 320 }}
      >
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={showPreviousHero}
              disabled={heroOptions.length <= 1}
              aria-label="Show previous leaderboard image"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid rgba(113, 72, 39, 0.32)',
                color: 'var(--text-dim)',
                background: 'rgba(255, 248, 236, 0.65)',
                cursor: heroOptions.length <= 1 ? 'default' : 'pointer',
                opacity: heroOptions.length <= 1 ? 0.4 : 0.82,
              }}
            >
              ‹
            </button>
            <div style={{ position: 'relative', display: 'inline-grid', placeItems: 'center' }}>
              {celebrateUpload && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
                  animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.08, 1.2], rotate: [0, 18, 36] }}
                  transition={{ duration: 1.1 }}
                  style={{
                    position: 'absolute',
                    width: 126,
                    height: 126,
                    borderRadius: '50%',
                    border: '2px dashed rgba(223, 122, 55, 0.52)',
                  }}
                />
              )}
              <motion.img
                key={`${activeHero.src}-${activeHero.rank ?? 'default'}`}
                src={activeHero.src}
                alt={activeHero.rank ? `Leaderboard rank ${activeHero.rank}` : 'Schwubbi'}
                animate={celebrateUpload ? { rotate: [0, -2.5, 2.5, -1.4, 1.4, 0] } : { rotate: 0 }}
                transition={{ duration: 0.7 }}
                drag={heroOptions.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 32) showPreviousHero()
                  if (info.offset.x < -32) showNextHero()
                }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(98, 62, 32, 0.32)',
                  boxShadow: '0 8px 22px rgba(78, 46, 21, 0.2)',
                }}
              />
              {activeHero.rank && (
                <div
                  style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    fontSize: 10,
                    lineHeight: 1,
                    padding: '3px 6px',
                    borderRadius: 9,
                    border: `1px solid ${HERO_MEDAL_COLORS[activeHero.rank]}`,
                    background: 'rgba(255, 248, 236, 0.92)',
                    color: HERO_MEDAL_COLORS[activeHero.rank],
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span aria-hidden="true">{HERO_MEDAL_ICONS[activeHero.rank]}</span>
                  #{activeHero.rank}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={showNextHero}
              disabled={heroOptions.length <= 1}
              aria-label="Show next leaderboard image"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid rgba(113, 72, 39, 0.32)',
                color: 'var(--text-dim)',
                background: 'rgba(255, 248, 236, 0.65)',
                cursor: heroOptions.length <= 1 ? 'default' : 'pointer',
                opacity: heroOptions.length <= 1 ? 0.4 : 0.82,
              }}
            >
              ›
            </button>
          </div>
          {heroOptions.length > 1 && (
            <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(72, 45, 26, 0.58)' }}>
              Swipe image or tap arrows
            </div>
          )}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, letterSpacing: 0.4 }}>
          Schwubbi Tournament
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          Find the best photo
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}
      >
        <button className="btn btn-primary btn-note" onClick={() => navigate('/play')} style={{ width: '100%' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
            <motion.svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              style={{ display: 'inline-block' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8.25" fill="#f7c7db" stroke="#c86e98" strokeWidth="1.4" />
              <path
                d="M6.8 12.3c1.4-1.2 2.6-1.7 4.1-1.7 1.8 0 3.2.8 5.2 2.8M7.8 9.4c1.9-1.2 3.5-1.3 5.3-.5m-4.5 7c1.8-.7 3.4-.5 5.6.7"
                stroke="#ad4f7e"
                strokeLinecap="round"
                strokeWidth="1.35"
              />
              <path d="M18.6 7.8l2.3-1.7" stroke="#ad4f7e" strokeLinecap="round" strokeWidth="1.35" />
            </motion.svg>
            <span style={{ position: 'relative', display: 'inline-block', paddingBottom: 2 }}>
              Play
              <motion.svg
                width="46"
                height="12"
                viewBox="0 0 46 12"
                fill="none"
                aria-hidden="true"
                style={{ position: 'absolute', left: -2, bottom: -8, pointerEvents: 'none' }}
              >
                <motion.path
                  d="M2 7 C 12 10, 24 2, 44 7"
                  stroke="#c86e98"
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{ pathLength: [0.45, 1, 0.45], x: [-1, 1.5, -1] }}
                  transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}
                />
              </motion.svg>
            </span>
          </span>
        </button>

        <button className="btn btn-secondary btn-note" onClick={() => navigate('/leaderboard')} style={{ width: '100%' }}>
          <LeaderboardSketchIcon />
          Leaderboard
        </button>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}
      >
        <motion.button
          type="button"
          className="album-slot"
          animate={celebrateUpload ? { rotate: [0, -1.5, 1.5, -0.8, 0.8, 0] } : { rotate: 0 }}
          transition={{ duration: 0.7 }}
          onClick={() => fileInputRef.current?.click()}
          style={{ position: 'relative', padding: '10px 14px', width: '100%', maxWidth: 360, margin: '0 auto', justifyContent: 'flex-start', gap: 10 }}
        >
          <span
            style={{
              minWidth: 34,
              height: 34,
              display: 'inline-grid',
              placeItems: 'center',
              borderRadius: 10,
              border: '1px solid rgba(113, 72, 39, 0.4)',
              background: 'linear-gradient(142deg, #ef9a58, #d86f2d)',
              color: '#fff9ef',
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            +
          </span>
          {!(uploading || uploadProgress) ? (
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontSize: 13, textAlign: 'left' }}>
                Photo Here
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'left' }}>
                (Total fotos: {totalPhotos})
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'left' }}>
              {uploadProgress || 'Preparing upload...'}{queuedCount > 0 ? ` (${queuedCount} queued)` : ''}
            </span>
          )}
          <AnimatePresence>
            {showPaw && (
              <motion.div
                className="paw-pop"
                initial={{ opacity: 0, scale: 0.5, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: -6 }}
              >
                🐾
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        {uploading && (
          <button
            type="button"
            className="btn btn-secondary btn-note"
            onClick={handleStopUploads}
            disabled={stoppingUpload}
            style={{ width: '100%', maxWidth: 360, margin: '8px auto 0', fontSize: 13 }}
          >
            {stoppingUpload ? 'Stopping...' : 'Stop upload'}
          </button>
        )}
      </motion.div>

      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(64,40,24,0.33)' }}>
        {buildLabel}
      </div>
    </div>
  )
}
