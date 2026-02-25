import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getThumbUrl } from '../lib/supabase'
import { LeaderboardSketchIcon } from './icons/SketchIcons'
import { getAllElos } from '../lib/storage'
import { useUploadManager } from '../upload/useUploadManager'

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

export default function HomeScreen() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevSessionUploadedRef = useRef(0)
  const {
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
  } = useUploadManager()
  const defaultHeroSrc = `${import.meta.env.BASE_URL}schwubbi-hero.png`
  const [showPaw, setShowPaw] = useState(false)
  const [celebrateUpload, setCelebrateUpload] = useState(false)
  const [uploadAuthOpen, setUploadAuthOpen] = useState(false)
  const [uploadPasswordInput, setUploadPasswordInput] = useState('')
  const [uploadPasswordError, setUploadPasswordError] = useState('')
  const [uploadUnlocked, setUploadUnlocked] = useState(false)
  const [heroOptions, setHeroOptions] = useState<HeroOption[]>([{ src: defaultHeroSrc, rank: null }])
  const [heroIdx, setHeroIdx] = useState(0)
  const uploadPasswordRequired = import.meta.env.VITE_UPLOAD_PASSWORD ?? '123456789'
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

  const showPreviousHero = useCallback(() => {
    if (heroOptions.length <= 1) return
    setHeroIdx((i) => (i - 1 + heroOptions.length) % heroOptions.length)
  }, [heroOptions.length])

  const showNextHero = useCallback(() => {
    if (heroOptions.length <= 1) return
    setHeroIdx((i) => (i + 1) % heroOptions.length)
  }, [heroOptions.length])

  const activeHero = heroOptions[heroIdx] ?? heroOptions[0]

  useEffect(() => {
    let pawTimer = 0
    let celebrateTimer = 0
    let kickOffTimer = 0
    if (sessionUploaded > prevSessionUploadedRef.current) {
      kickOffTimer = window.setTimeout(() => {
        setShowPaw(true)
        setCelebrateUpload(true)
        pawTimer = window.setTimeout(() => setShowPaw(false), 1200)
        celebrateTimer = window.setTimeout(() => setCelebrateUpload(false), 1400)
      }, 0)
    }
    prevSessionUploadedRef.current = sessionUploaded
    return () => {
      window.clearTimeout(kickOffTimer)
      window.clearTimeout(pawTimer)
      window.clearTimeout(celebrateTimer)
    }
  }, [sessionUploaded])

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    enqueueFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [enqueueFiles])

  const openUploadPicker = useCallback(() => {
    if (uploadUnlocked) {
      fileInputRef.current?.click()
      return
    }
    setUploadAuthOpen(true)
    setUploadPasswordInput('')
    setUploadPasswordError('')
  }, [uploadUnlocked])

  const confirmUploadPassword = useCallback(() => {
    if (uploadPasswordInput.trim() === uploadPasswordRequired) {
      setUploadUnlocked(true)
      setUploadAuthOpen(false)
      setUploadPasswordError('')
      fileInputRef.current?.click()
      return
    }
    setUploadPasswordError('Wrong password')
  }, [uploadPasswordInput, uploadPasswordRequired])

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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.3, ease: 'linear' }}
              style={{ display: 'inline-block', fontSize: 31, lineHeight: 1 }}
              aria-hidden="true"
            >
              🧶
            </motion.span>
            <span style={{ position: 'relative', display: 'inline-block', paddingBottom: 2, marginLeft: -1 }}>
              Play
              <motion.svg
                width="62"
                height="12"
                viewBox="0 0 62 12"
                fill="none"
                aria-hidden="true"
                style={{ position: 'absolute', left: -18, bottom: -8, pointerEvents: 'none' }}
              >
                <motion.path
                  d="M2 7 C 13 4, 19 8, 26 7 C 35 10, 47 2, 60 7"
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
          onClick={openUploadPicker}
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
                Upload photo
              </span>
              <span style={{ fontSize: 9, color: 'rgba(72, 45, 26, 0.45)', textAlign: 'left' }}>
                (Total photos: {totalPhotos})
              </span>
            </span>
          ) : (
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'left' }}>
                {uploadProgress || 'Preparing upload...'}{queuedCount > 0 ? ` (${queuedCount} queued)` : ''}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(72, 45, 26, 0.52)', textAlign: 'left' }}>
                New: {sessionUploaded} · Duplicates: {sessionSkipped} · Failed: {sessionFailed}
              </span>
              {lastUploadEvent && (
                <span style={{ fontSize: 10, color: 'rgba(72, 45, 26, 0.52)', textAlign: 'left' }}>
                  {lastUploadEvent}
                </span>
              )}
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
            onClick={stopUploads}
            disabled={stoppingUpload}
            style={{
              width: '48%',
              maxWidth: 172,
              margin: '8px auto 0',
              display: 'block',
              fontSize: 13,
              color: 'rgba(72, 45, 26, 0.7)',
              borderColor: 'rgba(113, 72, 39, 0.3)',
              background: 'linear-gradient(145deg, rgba(247, 235, 214, 0.9), rgba(232, 214, 184, 0.86))',
            }}
          >
            {stoppingUpload ? 'Stopping...' : 'Stop upload'}
          </button>
        )}
      </motion.div>

      {uploadAuthOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(0,0,0,0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div className="paper-card" style={{ width: '100%', maxWidth: 330, textAlign: 'center' }}>
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Upload password</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
              Enter password to add photos.
            </p>
            <input
              type="password"
              value={uploadPasswordInput}
              onChange={(e) => setUploadPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmUploadPassword()
                }
              }}
              className="paper-input"
              style={{ marginBottom: 10, textAlign: 'center' }}
              autoFocus
            />
            {uploadPasswordError && (
              <div style={{ fontSize: 12, color: '#a44a30', marginBottom: 10 }}>
                {uploadPasswordError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                className="btn btn-secondary btn-note"
                onClick={() => setUploadAuthOpen(false)}
                style={{ minWidth: 100 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-note"
                onClick={confirmUploadPassword}
                style={{ minWidth: 100 }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(64,40,24,0.33)' }}>
        {buildLabel}
      </div>
    </div>
  )
}
