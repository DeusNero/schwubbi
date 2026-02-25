import { useContext } from 'react'
import { UploadManagerContext } from './UploadManagerContext'

export function useUploadManager() {
  const ctx = useContext(UploadManagerContext)
  if (!ctx) {
    throw new Error('useUploadManager must be used within UploadManagerProvider')
  }
  return ctx
}

