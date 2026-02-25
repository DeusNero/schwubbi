import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { getFullUrl } from '../lib/supabase'
import { playFinale } from '../lib/sounds'
import type { EloEntry } from '../lib/storage'

interface FinaleProps {
  winnerId: string
  eloEntry: EloEntry | null
  totalImages: number
  rank: number
  onPlayAgain: () => void
  onGoHome: () => void
}

export default function Finale({
  winnerId,
  eloEntry,
  totalImages,
  rank,
  onPlayAgain,
  onGoHome,
}: FinaleProps) {
  const [showFullImage, setShowFullImage] = useState(false)
  const confettiFired = useRef(false)

  useEffect(() => {
    if (confettiFired.current) return
    confettiFired.current = true

    playFinale()

    const fire = () => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#bf7a1b', '#df7a37', '#f9e8c5', '#c18a55'],
      })
    }
    fire()
    setTimeout(fire, 300)
    setTimeout(fire, 600)
  }, [])

  const fullUrl = getFullUrl(winnerId)

  return (
    <div className="screen" style={{ gap: 24 }}>
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, delay: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <div className="paper-note" style={{ fontSize: 16, color: 'var(--gold)', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
          ★ THE CHAMPION ★
        </div>
      </motion.div>

      <motion.img
        src={fullUrl}
        alt="Winner"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.1 }}
        onClick={() => setShowFullImage(true)}
        style={{
          width: 'min(70vw, 280px)',
          height: 'min(70vw, 280px)',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '4px solid var(--gold)',
          boxShadow: '0 0 30px rgba(191, 122, 27, 0.3), 0 8px 26px rgba(68, 39, 18, 0.32)',
          cursor: 'pointer',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ fontSize: 12, color: 'var(--text-dim)' }}
      >
        Tap photo to view full size
      </motion.div>

      {eloEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="paper-card"
          style={{ textAlign: 'center', maxWidth: 320 }}
        >
          <div style={{ fontSize: 24, fontWeight: 700 }}>#{rank} of {totalImages}</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>
            {Math.round((eloEntry.wins / (eloEntry.wins + eloEntry.losses)) * 100)}% win rate · {eloEntry.wins}W / {eloEntry.losses}L
          </div>
        </motion.div>
      )}

      {showFullImage && (
        <div
          onClick={() => setShowFullImage(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <img
            src={fullUrl}
            alt="Winner full size"
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ display: 'flex', gap: 12, marginTop: 8 }}
      >
        <button className="btn btn-primary btn-note" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn btn-secondary btn-note" onClick={onGoHome}>
          Leaderboard
        </button>
      </motion.div>
    </div>
  )
}
