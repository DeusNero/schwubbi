import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Matchup } from '../engine/tournament'
import { getThumbUrl } from '../lib/supabase'
import { playLaunch, playTap, playElimination } from '../lib/sounds'

interface BattleProps {
  matchup: Matchup
  onResult: (winnerId: string | null) => void
  roundLabel: string
  round: number
  totalRounds: number
}

const ANIMATION_DURATION = 5
const TIMEOUT_EXTRA = 3

export default function Battle({ matchup, onResult, roundLabel, round, totalRounds }: BattleProps) {
  const [phase, setPhase] = useState<'animate' | 'timeout' | 'chosen'>('animate')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(ANIMATION_DURATION + TIMEOUT_EXTRA)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const matchupIdRef = useRef(`${matchup.left.id}-${matchup.right.id}`)

  useEffect(() => {
    matchupIdRef.current = `${matchup.left.id}-${matchup.right.id}`
    setPhase('animate')
    setChosenId(null)
    setTimeLeft(ANIMATION_DURATION + TIMEOUT_EXTRA)

    playLaunch()

    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    timerRef.current = setTimeout(() => {
      setPhase('timeout')
      timeoutTimerRef.current = setTimeout(() => {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setPhase('chosen')
        setChosenId(null)
        setTimeout(() => onResult(null), 800)
      }, TIMEOUT_EXTRA * 1000)
    }, ANIMATION_DURATION * 1000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchup.left.id, matchup.right.id])

  const handleChoice = useCallback(
    (id: string, _isTimeout = false) => {
      if (phase === 'chosen') return
      if (timerRef.current) clearTimeout(timerRef.current)
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)

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
  const scaleFactor = 0.85 + 0.15 * progress
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

  const flexOffset = imgSize / 2 + 8
  const maxSpreadX = (vw / 2) - flexOffset - imgSize / 2 - 12
  const spreadX = Math.min(vw * 0.25, Math.max(maxSpreadX, 20))

  const topSafe = 140 + imgSize / 2
  const restFromTop = vh * 0.88
  const riseY = -(restFromTop - topSafe)

  const leftKeyframes = {
    x: [0, 0, 0, -spreadX * 0.15, -spreadX * 0.5, -spreadX * 0.85, -spreadX],
    y: [0, riseY * 0.5, riseY, riseY * 0.85, riseY * 0.5, riseY * 0.15, 0],
  }

  const rightKeyframes = {
    x: [0, 0, 0, spreadX * 0.15, spreadX * 0.5, spreadX * 0.85, spreadX],
    y: [0, riseY * 0.5, riseY, riseY * 0.85, riseY * 0.5, riseY * 0.15, 0],
  }

  const animationTransition = {
    duration: ANIMATION_DURATION,
    times: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
    ease: ['easeIn', 'easeOut', 'easeInOut', 'easeInOut', 'easeInOut', 'easeOut'] as const,
  }

  const frozenLeft = { x: -spreadX, y: 0 }
  const frozenRight = { x: spreadX, y: 0 }

  return (
    <div className="screen">
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

      {phase !== 'chosen' && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            zIndex: 10,
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 32,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: timeLeft <= TIMEOUT_EXTRA ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
            textShadow: timeLeft <= TIMEOUT_EXTRA ? '0 0 20px var(--accent-glow)' : 'none',
          }}>
            {timeLeft}
          </div>
          <AnimatePresence mode="wait">
            {phase === 'animate' && !chosenId && (
              <motion.div
                key="choose-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}
              >
                CHOOSE!
              </motion.div>
            )}
            {phase === 'timeout' && !chosenId && (
              <motion.div
                key="lastchance-prompt"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
                exit={{ scale: 0, opacity: 0 }}
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: 'var(--accent)',
                  textShadow: '0 0 20px var(--accent-glow)',
                  marginTop: 4,
                }}
              >
                LAST CHANCE!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '12%',
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
                  ? { x: 0, y: riseY * 0.3, scale: 1.15 }
                  : { opacity: 0, scale: 0.5 }
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
                  ? { x: 0, y: riseY * 0.3, scale: 1.15 }
                  : { opacity: 0, scale: 0.5 }
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
