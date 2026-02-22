import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  exportAllElos,
  importAllElos,
  getBackupCode,
  setBackupCode,
} from '../lib/storage'
import { supabase } from '../lib/supabase'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const seg2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `CAT-${seg1}${seg2}`
}

export default function BackupRestore() {
  const navigate = useNavigate()
  const [existingCode, setExistingCode] = useState<string | null>(null)
  const [restoreInput, setRestoreInput] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getBackupCode().then(setExistingCode)
  }, [])

  const handleBackup = async () => {
    setBusy(true)
    setStatus('')
    try {
      const data = await exportAllElos()
      if (Object.keys(data).length === 0) {
        setStatus('Nothing to backup — play some games first!')
        setBusy(false)
        return
      }

      const code = existingCode ?? generateCode()

      const { error } = await supabase
        .from('backups')
        .upsert({ code, data, created_at: new Date().toISOString() })

      if (error) throw error

      await setBackupCode(code)
      setExistingCode(code)
      setStatus(`Backed up! Your code: ${code}`)
    } catch (err) {
      console.error(err)
      setStatus('Backup failed — check console for details')
    }
    setBusy(false)
  }

  const handleRestore = async () => {
    const code = restoreInput.trim().toUpperCase()
    if (!code) return

    setBusy(true)
    setStatus('')
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('data')
        .eq('code', code)
        .single()

      if (error || !data) {
        setStatus('Code not found. Double-check and try again.')
        setBusy(false)
        return
      }

      await importAllElos(data.data)
      await setBackupCode(code)
      setExistingCode(code)
      setStatus('Rankings restored successfully!')
    } catch (err) {
      console.error(err)
      setStatus('Restore failed — check console for details')
    }
    setBusy(false)
  }

  return (
    <div
      className="screen"
      style={{
        justifyContent: 'flex-start',
        paddingTop: 48,
        gap: 24,
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
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>💾 Backup & Restore</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: 20,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Create Backup</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          Save your rankings to the cloud. You'll get a short code to restore on any device.
        </p>
        {existingCode && (
          <div
            style={{
              background: 'rgba(255,215,0,0.1)',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--gold)',
              textAlign: 'center',
              letterSpacing: 2,
            }}
          >
            {existingCode}
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={handleBackup}
          disabled={busy}
          style={{ width: '100%' }}
        >
          {existingCode ? 'Update Backup' : 'Create Backup'}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: 20,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Restore Rankings</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
          Enter your backup code to restore rankings from another device.
        </p>
        <input
          type="text"
          placeholder="e.g. CAT-7X3ABC"
          value={restoreInput}
          onChange={(e) => setRestoreInput(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text)',
            fontSize: 16,
            fontFamily: 'inherit',
            textAlign: 'center',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 12,
            outline: 'none',
          }}
        />
        <button
          className="btn btn-secondary"
          onClick={handleRestore}
          disabled={busy || !restoreInput.trim()}
          style={{ width: '100%' }}
        >
          Restore
        </button>
      </motion.div>

      {status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 14,
            color: status.includes('fail') || status.includes('not found')
              ? 'var(--accent)'
              : 'var(--gold)',
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          {status}
        </motion.div>
      )}
    </div>
  )
}
