import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { getFullUrl } from '../lib/supabase'
import { playFinale } from '../lib/sounds'
import type { EloEntry } from '../lib/storage'

interface FinaleProps {
  winnerId: string
  eloEntry: EloEntry | null
  totalImages: number
  onPlayAgain: () => void
  onGoHome: () => void
}

export default function Finale({
  winnerId,
  eloEntry,
  totalImages,
  onPlayAgain,
  onGoHome,
}: FinaleProps) {
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
        colors: ['#ffd700', '#e94560', '#fff', '#ff6b6b'],
      })
    }
    fire()
    setTimeout(fire, 300)
    setTimeout(fire, 600)
  }, [])

  const fullUrl = getFullUrl(winnerId)

  return (
    <div className="screen" style={{ gap: 24, background: 'var(--bg)' }}>
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, delay: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 16, color: 'var(--gold)', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
          ★ THE CHAMPION ★
        </div>
      </motion.div>

      <motion.img
        src={fullUrl}
        alt="Winner"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, delay: 0.1 }}
        style={{
          width: 'min(70vw, 280px)',
          height: 'min(70vw, 280px)',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '4px solid var(--gold)',
          boxShadow: '0 0 40px rgba(255, 215, 0, 0.4), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      />

      {eloEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            textAlign: 'center',
            background: 'var(--bg-card)',
            padding: '16px 24px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700 }}>ELO {eloEntry.elo}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            {eloEntry.wins}W / {eloEntry.losses}L · Ranked among {totalImages} photos
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ display: 'flex', gap: 12, marginTop: 8 }}
      >
        <button className="btn btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={onGoHome}>
          Home
        </button>
      </motion.div>
    </div>
  )
}
