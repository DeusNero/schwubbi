import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getAllElos } from '../lib/storage'
import type { EloEntry } from '../lib/storage'
import { getFullUrl } from '../lib/supabase'

const MEDAL_COLORS = ['var(--gold)', 'var(--silver)', 'var(--bronze)']
const MEDAL_ICONS = ['👑', '🥈', '🥉', '4', '5']

export default function Leaderboard() {
  const navigate = useNavigate()
  const [topEntries, setTopEntries] = useState<EloEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const all = await getAllElos()
      const sorted = all
        .filter((e) => e.matchups > 0)
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 5)
      setTopEntries(sorted)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ fontSize: 48 }}
        >
          🏆
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
          className="btn btn-secondary"
          onClick={() => navigate('/')}
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          ← Back
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>🏆 Leaderboard</h2>
      </div>

      {topEntries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏜️</div>
          <p>No rankings yet. Play some games first!</p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topEntries.map((entry, i) => (
            <motion.div
              key={entry.imageId}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setViewingImage(entry.imageId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--bg-card)',
                padding: 14,
                borderRadius: 'var(--radius)',
                border: i === 0 ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: i === 0 ? '0 0 20px rgba(255, 215, 0, 0.15)' : undefined,
                cursor: 'pointer',
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
                {MEDAL_ICONS[i]}
              </div>

              <img
                src={getFullUrl(entry.imageId)}
                alt={`Rank ${i + 1}`}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${MEDAL_COLORS[i] ?? 'rgba(255,255,255,0.1)'}`,
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
    </div>
  )
}
