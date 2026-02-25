import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getAllElos, clearAllElos } from '../lib/storage'
import type { EloEntry } from '../lib/storage'
import { clearCloudLeaderboard, getFullUrl } from '../lib/supabase'
import { LeaderboardSketchIcon } from './icons/SketchIcons'

const MEDAL_COLORS = ['var(--gold)', 'var(--silver)', 'var(--bronze)']
const MEDAL_ICONS = ['👑', '🥈', '🥉']

export default function Leaderboard() {
  const navigate = useNavigate()
  const [topEntries, setTopEntries] = useState<EloEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetStatus, setResetStatus] = useState('')

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const all = await getAllElos()
      const sorted = all
        .filter((e) => e.matchups > 0)
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 10)
      setTopEntries(sorted)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLeaderboard()
  }, [])

  const handleConfirmReset = async () => {
    setResetting(true)
    setResetStatus('')
    try {
      await clearAllElos()
      try {
        await clearCloudLeaderboard()
      } catch (err) {
        console.warn('Cloud leaderboard clear failed', err)
      }
      await loadLeaderboard()
      setConfirmResetOpen(false)
      setResetStatus('Leaderboard reset. A new leaderboard will begin now.')
    } catch (err) {
      console.error('Failed to reset leaderboard', err)
      setResetStatus('Could not reset leaderboard. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ fontSize: 48, color: 'var(--accent)' }}
        >
          <LeaderboardSketchIcon size={48} />
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="screen"
      style={{
        justifyContent: 'flex-start',
        paddingTop: 48,
        gap: 20,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 360 }}>
        <button
          className="btn btn-secondary btn-note"
          onClick={() => navigate('/')}
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          ← Back
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LeaderboardSketchIcon size={24} />
          Leaderboard
        </h2>
      </div>
      <button
        className="btn btn-secondary btn-note"
        onClick={() => setConfirmResetOpen(true)}
        disabled={resetting}
        style={{ width: '100%', maxWidth: 360, color: '#8a3f2a' }}
      >
        Reset leaderboard
      </button>

      {topEntries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.3, ease: 'linear' }}
            style={{ fontSize: 96, marginBottom: 12, display: 'inline-block' }}
          >
            🧶
          </motion.div>
          <p>No rankings yet. Play some games first!</p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 18 }}>
          {topEntries.map((entry, i) => (
            <motion.div
              key={entry.imageId}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setViewingImage(entry.imageId)}
              className="paper-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                borderRadius: 'var(--radius-note)',
                border: i === 0 ? '1px solid var(--gold)' : '1px solid var(--border)',
                boxShadow: i === 0 ? '0 0 20px rgba(255, 215, 0, 0.15)' : undefined,
                cursor: 'pointer',
                width: i < 3 ? '100%' : '80%',
                maxWidth: i < 3 ? 360 : 288,
                alignSelf: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  width: 36,
                  textAlign: 'center',
                  color: MEDAL_COLORS[i] ?? 'var(--text-dim)',
                  fontWeight: 700,
                }}
              >
                {MEDAL_ICONS[i] ?? `${i + 1}`}
              </div>

              <img
                src={getFullUrl(entry.imageId)}
                alt={`Rank ${i + 1}`}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${MEDAL_COLORS[i] ?? 'rgba(118,88,61,0.4)'}`,
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {Math.round((entry.wins / (entry.wins + entry.losses)) * 100)}% win rate
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {entry.wins}W / {entry.losses}L · {entry.matchups} games
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
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
            src={getFullUrl(viewingImage)}
            alt="Full size"
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      )}
      {confirmResetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div className="paper-card" style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Reset leaderboard?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
              If you confirm, all past games will be deleted and a new leaderboard will begin.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                className="btn btn-secondary btn-note"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetting}
                style={{ minWidth: 110 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-note"
                onClick={handleConfirmReset}
                disabled={resetting}
                style={{ minWidth: 110, background: 'linear-gradient(145deg, #d06f42, #b24f2a)' }}
              >
                {resetting ? 'Resetting...' : 'Confirm reset'}
              </button>
            </div>
          </div>
        </div>
      )}
      {resetStatus && (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 360 }}>
          {resetStatus}
        </div>
      )}
    </div>
  )
}
