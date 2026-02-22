import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchAllImages } from '../lib/supabase'
import type { ImageRecord } from '../lib/supabase'
import { getAllElos, getElo } from '../lib/storage'
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
    startTournament()
  }, [startTournament])

  const handleResult = useCallback(
    async (winId: string | null) => {
      const currentMatchup = matchups[currentIdx]

      if (!winId) {
        await updateEloBothLose(currentMatchup.left.id, currentMatchup.right.id)

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
    [matchups, currentIdx, roundWinners]
  )

  if (state === 'loading') {
    return (
      <div className="screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ fontSize: 48 }}
        >
          🐱
        </motion.div>
        <p style={{ color: 'var(--text-dim)', marginTop: 16 }}>Loading cats...</p>
      </div>
    )
  }

  if (state === 'not-enough') {
    return (
      <div className="screen" style={{ gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>📷</div>
        <h2>Not enough photos</h2>
        <p style={{ color: 'var(--text-dim)', maxWidth: 280 }}>
          Upload at least 2 cat photos to start a tournament. Tap the + button on the home screen.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go Home
        </button>
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
        onGoHome={() => navigate('/')}
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
