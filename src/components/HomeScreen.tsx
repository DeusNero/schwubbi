import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadImage } from '../lib/supabase'
import imageCompression from 'browser-image-compression'
import { LeaderboardSketchIcon } from './icons/SketchIcons'

export default function HomeScreen() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showPaw, setShowPaw] = useState(false)
  const [celebrateUpload, setCelebrateUpload] = useState(false)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const total = files.length
    let done = 0

    for (const file of Array.from(files)) {
      try {
        setUploadProgress(`Processing ${done + 1}/${total}...`)

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

        const id = crypto.randomUUID()
        await uploadImage(id, thumbBlob, fullBlob, file.name)
        done++
        setUploadProgress(`Uploaded ${done}/${total}`)
      } catch (err) {
        console.error('Upload failed for', file.name, err)
        setUploadProgress(`Failed: ${file.name}`)
        await new Promise((r) => setTimeout(r, 1500))
      }
    }

    setUploadProgress(`Done! ${done} photo${done !== 1 ? 's' : ''} added`)
    if (done > 0) {
      setShowPaw(true)
      setCelebrateUpload(true)
      setTimeout(() => setShowPaw(false), 1200)
      setTimeout(() => setCelebrateUpload(false), 1400)
    }
    setTimeout(() => {
      setUploading(false)
      setUploadProgress('')
    }, 2000)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

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
        <div style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', marginBottom: 10 }}>
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
            src={`${import.meta.env.BASE_URL}schwubbi-hero.png`}
            alt="Schwubbi"
            animate={celebrateUpload ? { rotate: [0, -2.5, 2.5, -1.4, 1.4, 0] } : { rotate: 0 }}
            transition={{ duration: 0.7 }}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(98, 62, 32, 0.32)',
              boxShadow: '0 8px 22px rgba(78, 46, 21, 0.2)',
            }}
          />
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, letterSpacing: 0.4 }}>
          Schwubbi Tournament
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          Find the best foto
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}
      >
        <button className="btn btn-primary btn-note" onClick={() => navigate('/play')} style={{ width: '100%' }}>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            🧶
          </motion.span>
          Play
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
          disabled={uploading}
          style={{ position: 'relative', padding: '10px 14px', width: '100%', maxWidth: 360, margin: '0 auto', justifyContent: 'flex-start', gap: 10 }}
        >
          {!(uploading || uploadProgress) ? (
            <>
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
              <span style={{ fontSize: 13, textAlign: 'left' }}>
                Photo Here
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'left' }}>
              {uploadProgress || 'Preparing upload...'}
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
      </motion.div>

      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(64,40,24,0.33)' }}>
        v1.2.0
      </div>
    </div>
  )
}
