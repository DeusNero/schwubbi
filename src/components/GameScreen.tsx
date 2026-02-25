import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchAllImages, fetchCloudLeaderboard, upsertCloudLeaderboard } from '../lib/supabase'
import type { ImageRecord } from '../lib/supabase'
import { getAllElos, getElo, upsertAllElos } from '../lib/storage'
import type { EloEntry } from '../lib/storage'
import { selectTournamentImages, generateBracket } from '../engine/tournament'
import type { Matchup } from '../engine/tournament'
import { updateElo, updateEloBothLose } from '../engine/elo'
import Battle from './Battle'
import Finale from './Finale'

type GameState = 'loading' | 'not-enough' | 'playing' | 'finale'

export default function GameScreen() {
  const navigate = useNavigate()
  const [state, setState] = useState<GameState>('loading')
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [roundWinners, setRoundWinners] = useState<ImageRecord[]>([])
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(5)
  const [matchInRound, setMatchInRound] = useState(1)
  const [matchesInRound, setMatchesInRound] = useState(0)
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [winnerElo, setWinnerElo] = useState<EloEntry | null>(null)
  const [winnerRank, setWinnerRank] = useState(0)
  const [totalImages, setTotalImages] = useState(0)
  const [allImages, setAllImages] = useState<ImageRecord[]>([])
  const cloudHydratedRef = useRef(false)

  const isAppHidden = () =>
    typeof document !== 'undefined' &&
    (document.visibilityState !== 'visible' || !document.hasFocus())

  const syncCloudSnapshot = useCallback(async () => {
    try {
      const snapshot = await getAllElos()
      await upsertCloudLeaderboard(snapshot)
    } catch (err) {
      console.warn('Cloud leaderboard sync failed', err)
    }
  }, [])

  const startTournament = useCallback(async (images?: ImageRecord[]) => {
    setState('loading')
    try {
      const imgs = images ?? await fetchAllImages()
      setAllImages(imgs)
      setTotalImages(imgs.length)

      if (imgs.length < 2) {
        setState('not-enough')
        return
      }

      if (!cloudHydratedRef.current) {
        const localElos = await getAllElos()
        if (localElos.length === 0) {
          try {
            const cloudElos = await fetchCloudLeaderboard()
            if (cloudElos.length > 0) {
              await upsertAllElos(cloudElos)
            }
          } catch (err) {
            console.warn('Cloud leaderboard load failed', err)
          }
        }
        cloudHydratedRef.current = true
      }

      const elos = await getAllElos()
      const eloMap = new Map<string, EloEntry>()
      for (const e of elos) eloMap.set(e.imageId, e)

      const selected = selectTournamentImages(imgs, eloMap)
      const bracket = generateBracket(selected)

      const rounds = Math.ceil(Math.log2(selected.length))
      setTotalRounds(rounds)
      setRound(1)
      setMatchInRound(1)
      setMatchesInRound(bracket.length)
      setMatchups(bracket)
      setCurrentIdx(0)
      setRoundWinners([])
      setWinnerId(null)
      setWinnerElo(null)
      setState('playing')
    } catch (err) {
      console.error('Failed to load images', err)
      setState('not-enough')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      startTournament()
    }, 0)

    return () => window.clearTimeout(id)
  }, [startTournament])

  useEffect(() => {
    const handleHidden = () => {
      if (isAppHidden()) {
        navigate('/')
      }
    }

    document.addEventListener('visibilitychange', handleHidden)
    window.addEventListener('blur', handleHidden)
    window.addEventListener('pagehide', handleHidden)

    return () => {
      document.removeEventListener('visibilitychange', handleHidden)
      window.removeEventListener('blur', handleHidden)
      window.removeEventListener('pagehide', handleHidden)
    }
  }, [navigate])

  const handleResult = useCallback(
    async (winId: string | null) => {
      if (isAppHidden()) {
        return
      }
      const currentMatchup = matchups[currentIdx]

      if (!winId) {
        await updateEloBothLose(currentMatchup.left.id, currentMatchup.right.id)
        void syncCloudSnapshot()

        if (currentIdx < matchups.length - 1) {
          setCurrentIdx((i) => i + 1)
          setMatchInRound((m) => m + 1)
          return
        }

        const newWinners = roundWinners
        if (newWinners.length === 0) {
          startTournament(allImages)
          return
        }

        const nextBracket = generateBracket(newWinners)
        setMatchups(nextBracket)
        setCurrentIdx(0)
        setRound((r) => r + 1)
        setMatchInRound(1)
        setMatchesInRound(nextBracket.length)
        setRoundWinners([])
        return
      }

      const loserId =
        currentMatchup.left.id === winId
          ? currentMatchup.right.id
          : currentMatchup.left.id
      const winner =
        currentMatchup.left.id === winId
          ? currentMatchup.left
          : currentMatchup.right

      await updateElo(winId, loserId)
      void syncCloudSnapshot()

      const newWinners = [...roundWinners, winner]

      if (currentIdx < matchups.length - 1) {
        setCurrentIdx((i) => i + 1)
        setMatchInRound((m) => m + 1)
        setRoundWinners(newWinners)
        return
      }

      if (newWinners.length === 1) {
        const elo = await getElo(newWinners[0].id)
        const allElos = await getAllElos()
        const sorted = allElos.filter(e => e.matchups > 0).sort((a, b) => b.elo - a.elo)
        const rank = sorted.findIndex(e => e.imageId === newWinners[0].id) + 1
        setWinnerId(newWinners[0].id)
        setWinnerElo(elo)
        setWinnerRank(rank || 1)
        setState('finale')
        return
      }

      const nextBracket = generateBracket(newWinners)
      setMatchups(nextBracket)
      setCurrentIdx(0)
      setRound((r) => r + 1)
      setMatchInRound(1)
      setMatchesInRound(nextBracket.length)
      setRoundWinners([])
    },
    [allImages, currentIdx, matchups, roundWinners, startTournament, syncCloudSnapshot]
  )

  if (state === 'loading') {
    return (
      <div className="screen" style={{ gap: 16 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ fontSize: 48 }}
        >
          🧶
        </motion.div>
        <div className="paper-note">
          <p style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Loading cats...</p>
        </div>
      </div>
    )
  }

  if (state === 'not-enough') {
    return (
      <div className="screen" style={{ gap: 16, textAlign: 'center' }}>
        <div className="paper-card" style={{ maxWidth: 320 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
          <h2 style={{ marginBottom: 8 }}>Not enough photos</h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: 280, margin: '0 auto 14px' }}>
            Upload at least 2 cat photos to start a tournament. Tap the + button on the home screen.
          </p>
          <button className="btn btn-primary btn-note" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (state === 'finale' && winnerId) {
    return (
      <Finale
        winnerId={winnerId}
        eloEntry={winnerElo}
        totalImages={totalImages}
        rank={winnerRank}
        onPlayAgain={() => startTournament(allImages)}
        onGoHome={() => navigate('/leaderboard', { replace: true })}
      />
    )
  }

  const currentMatchup = matchups[currentIdx]
  if (!currentMatchup) return null

  return (
    <Battle
      matchup={currentMatchup}
      onResult={handleResult}
      roundLabel={`Round ${round}/${totalRounds} · Match ${matchInRound}/${matchesInRound}`}
      round={round}
      totalRounds={totalRounds}
    />
  )
}
