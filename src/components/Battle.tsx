import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Matchup } from '../engine/tournament'
import { getThumbUrl } from '../lib/supabase'
import { playLaunch, playTap, playElimination } from '../lib/sounds'

interface BattleProps {
  matchup: Matchup
  onResult: (winnerId: string) => void
  roundLabel: string
  round: number
  totalRounds: number
}

const ANIMATION_DURATION = 5
const TIMEOUT_EXTRA = 3

export default function Battle({ matchup, onResult, roundLabel, round, totalRounds }: BattleProps) {
  const [phase, setPhase] = useState<'animate' | 'timeout' | 'chosen'>('animate')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matchupIdRef = useRef(`${matchup.left.id}-${matchup.right.id}`)

  useEffect(() => {
    matchupIdRef.current = `${matchup.left.id}-${matchup.right.id}`
    setPhase('animate')
    setChosenId(null)

    playLaunch()

    timerRef.current = setTimeout(() => {
      setPhase('timeout')
      timeoutTimerRef.current = setTimeout(() => {
        const randomWinner = Math.random() > 0.5 ? matchup.left.id : matchup.right.id
        handleChoice(randomWinner, true)
      }, TIMEOUT_EXTRA * 1000)
    }, ANIMATION_DURATION * 1000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchup.left.id, matchup.right.id])

  const handleChoice = useCallback(
    (id: string, _isTimeout = false) => {
      if (phase === 'chosen') return
      if (timerRef.current) clearTimeout(timerRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)

      setChosenId(id)
      setPhase('chosen')
      playTap()

      setTimeout(() => {
        playElimination()
      }, 200)

      setTimeout(() => {
        onResult(id)
      }, 800)
    },
    [phase, onResult]
  )

  const leftUrl = getThumbUrl(matchup.left.id)
  const rightUrl = getThumbUrl(matchup.right.id)

  const progress = totalRounds > 1 ? (round - 1) / (totalRounds - 1) : 1
  const scaleFactor = 0.7 + 0.3 * progress
  const baseSize = Math.min(window.innerWidth * 0.4, 160)
  const imgSize = baseSize * scaleFactor

  const imageStyle: React.CSSProperties = {
    width: imgSize,
    height: imgSize,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }

  const getChosenStyle = (id: string): React.CSSProperties => {
    if (!chosenId) return {}
    if (chosenId === id) {
      return {
        border: '3px solid var(--gold)',
        boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
      }
    }
    return { opacity: 0.3, filter: 'grayscale(1)' }
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const maxSpreadX = (vw / 2) - (imgSize / 2) - 16
  const spreadX = Math.min(vw * 0.25, maxSpreadX)

  const leftKeyframes = {
    x: [0, -10, -spreadX, -spreadX],
    y: [0, -vh * 0.2, -vh * 0.25, 0],
  }

  const rightKeyframes = {
    x: [0, 10, spreadX, spreadX],
    y: [0, -vh * 0.2, -vh * 0.25, 0],
  }

  const animationTransition = {
    duration: ANIMATION_DURATION,
    times: [0, 0.3, 0.6, 1],
    ease: 'easeInOut' as const,
  }

  const frozenLeft = {
    x: -spreadX,
    y: 0,
  }

  const frozenRight = {
    x: spreadX,
    y: 0,
  }

  return (
    <div className="screen" style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 48,
          fontSize: 14,
          color: 'var(--text-dim)',
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {roundLabel}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'timeout' && !chosenId && (
          <motion.div
            key="choose-prompt"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              position: 'absolute',
              top: '15%',
              zIndex: 10,
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--accent)',
              textShadow: '0 0 20px var(--accent-glow)',
            }}
          >
            CHOOSE!
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          display: 'flex',
          gap: 16,
        }}
      >
        <motion.img
          key={`left-${matchup.left.id}`}
          src={leftUrl}
          alt="Left cat"
          style={{ ...imageStyle, ...getChosenStyle(matchup.left.id) }}
          animate={
            phase === 'timeout'
              ? frozenLeft
              : phase === 'chosen'
                ? chosenId === matchup.left.id
                  ? { x: 0, y: -vh * 0.1, scale: 1.15 }
                  : { x: -vw * 0.5, y: 0, opacity: 0 }
                : leftKeyframes
          }
          transition={
            phase === 'animate'
              ? animationTransition
              : { duration: 0.4, ease: 'easeOut' }
          }
          onClick={() => handleChoice(matchup.left.id)}
          draggable={false}
        />

        <motion.img
          key={`right-${matchup.right.id}`}
          src={rightUrl}
          alt="Right cat"
          style={{ ...imageStyle, ...getChosenStyle(matchup.right.id) }}
          animate={
            phase === 'timeout'
              ? frozenRight
              : phase === 'chosen'
                ? chosenId === matchup.right.id
                  ? { x: 0, y: -vh * 0.1, scale: 1.15 }
                  : { x: vw * 0.5, y: 0, opacity: 0 }
                : rightKeyframes
          }
          transition={
            phase === 'animate'
              ? animationTransition
              : { duration: 0.4, ease: 'easeOut' }
          }
          onClick={() => handleChoice(matchup.right.id)}
          draggable={false}
        />
      </div>
    </div>
  )
}
