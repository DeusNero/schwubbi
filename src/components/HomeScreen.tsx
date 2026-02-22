import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { uploadImage } from '../lib/supabase'
import imageCompression from 'browser-image-compression'

export default function HomeScreen() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

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
    setTimeout(() => {
      setUploading(false)
      setUploadProgress('')
    }, 2000)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  return (
    <div className="screen" style={{ gap: 32 }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{ textAlign: 'center' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}schwubbi-hero.png`}
          alt="Schwubbi"
          style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          Cat Tournament
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          Find the best cat photo
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}
      >
        <button className="btn btn-primary" onClick={() => navigate('/play')} style={{ width: '100%' }}>
          ⚔️ Play
        </button>

        <button className="btn btn-secondary" onClick={() => navigate('/leaderboard')} style={{ width: '100%' }}>
          🏆 Leaderboard
        </button>

        <button className="btn btn-secondary" onClick={() => navigate('/backup')} style={{ width: '100%' }}>
          💾 Backup & Restore
        </button>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ position: 'absolute', bottom: 40, right: 24 }}
      >
        <button
          className="btn btn-icon btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ fontSize: 28 }}
        >
          +
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

      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
        v1.0.0
      </div>

      {uploading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            bottom: 110,
            background: 'var(--bg-card)',
            padding: '12px 20px',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {uploadProgress}
        </motion.div>
      )}
    </div>
  )
}
