import { createContext } from 'react'

export interface UploadManagerValue {
  uploading: boolean
  stoppingUpload: boolean
  queuedCount: number
  uploadProgress: string
  sessionUploaded: number
  sessionSkipped: number
  sessionFailed: number
  lastUploadEvent: string
  totalPhotos: number
  enqueueFiles: (files: FileList | File[]) => void
  stopUploads: () => void
}

export const UploadManagerContext = createContext<UploadManagerValue | null>(null)

