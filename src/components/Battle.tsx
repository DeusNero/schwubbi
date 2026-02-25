import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Easing } from 'framer-motion'
import type { Matchup } from '../engine/tournament'
import { getThumbUrl } from '../lib/supabase'
import { playLaunch, playTap, playElimination, playCountdownReminder, playSurprisedMeow } from '../lib/sounds'

interface BattleProps {
  matchup: Matchup
  onResult: (winnerId: string | null) => void
  roundLabel: string
  round: number
  totalRounds: number
}

const ANIMATION_DURATION = 5
const TIMEOUT_EXTRA = 3
const TOTAL_TIME = ANIMATION_DURATION + TIMEOUT_EXTRA

export default function Battle({ matchup, onResult, roundLabel, round, totalRounds }: BattleProps) {
  const [phase, setPhase] = useState<'animate' | 'timeout' | 'timeout-fall' | 'chosen'>('animate')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const matchupIdRef = useRef(`${matchup.left.id}-${matchup.right.id}`)

  useEffect(() => {
    matchupIdRef.current = `${matchup.left.id}-${matchup.right.id}`
    setPhase('animate')
    setChosenId(null)
    setTimeLeft(TOTAL_TIME)

    playLaunch()

    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev <= 1 ? 0 : prev - 1
        if (next <= TIMEOUT_EXTRA && next > 0) {
          playCountdownReminder(next)
        }
        return next
      })
    }, 1000)

    timerRef.current = setTimeout(() => {
      setPhase('timeout')
      timeoutTimerRef.current = setTimeout(() => {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setPhase('timeout-fall')
        setChosenId(null)
        playSurprisedMeow()
        setTimeout(() => onResult(null), 1350)
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
    (id: string) => {
      if (phase === 'chosen' || phase === 'timeout-fall') return
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
  const cardWidth = Math.min(window.innerWidth * 0.4, 190) * scaleFactor

  const getChosenStyle = (id: string): React.CSSProperties => {
    if (!chosenId) return {}
    const belongsToMatchup = chosenId === matchup.left.id || chosenId === matchup.right.id
    if (!belongsToMatchup) return {}
    if (chosenId === id) {
      return {
        boxShadow: '0 0 0 3px rgba(191, 122, 27, 0.65), 0 13px 28px rgba(64, 38, 20, 0.32)',
      }
    }
    return { opacity: 0.3, filter: 'grayscale(1)' }
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 400
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  const flexOffset = cardWidth / 2 + 8
  const maxSpreadX = (vw / 2) - flexOffset - cardWidth / 2 - 12
  const spreadX = Math.min(vw * 0.25, Math.max(maxSpreadX, 20))

  const cardHeight = cardWidth + 28
  const topSafe = 150 + cardHeight / 2
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

  const animationEase: Easing[] = ['easeIn', 'easeOut', 'easeIn', 'linear', 'linear', 'easeOut']
  const animationTransition = {
    duration: ANIMATION_DURATION,
    times: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
    ease: animationEase,
  }

  const frozenLeft = { x: -spreadX, y: 0, rotate: -3 }
  const frozenRight = { x: spreadX, y: 0, rotate: 3 }
  const yarnWidth = Math.max(0, (timeLeft / TOTAL_TIME) * 100)

  return (
    <motion.div
      className="screen"
      animate={phase === 'timeout-fall' ? { x: [-8, 8, -6, 6, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="paper-note"
        style={{
          position: 'absolute',
          top: 30,
          fontSize: 14,
          color: 'var(--text-dim)',
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          padding: '8px 16px',
        }}
      >
        {roundLabel}
      </div>

      {phase !== 'chosen' && (
        <div
          style={{
            position: 'absolute',
            top: 76,
            zIndex: 10,
            textAlign: 'center',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div className="yarn-timer">
            <motion.div
              className="yarn-timer-thread"
              animate={{ width: `${yarnWidth}%` }}
              transition={{ duration: 0.25 }}
            >
              <div className="yarn-ball" />
            </motion.div>
          </div>
          <AnimatePresence mode="wait">
            {phase === 'animate' && !chosenId && (
              <motion.div
                key="choose-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 18, fontWeight: 700, color: 'rgba(72,45,26,0.56)', marginTop: 4 }}
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
                  color: 'rgba(72,45,26,0.56)',
                  marginTop: 4,
                }}
              >
                Choose soon
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
          gap: 18,
        }}
      >
        <motion.button
          key={`left-${matchup.left.id}`}
          className="polaroid-card"
          style={{ width: cardWidth, transform: 'rotate(-2.8deg)', cursor: 'pointer', ...getChosenStyle(matchup.left.id) }}
          animate={
            phase === 'timeout'
              ? frozenLeft
              : phase === 'timeout-fall'
                ? { x: -spreadX * 0.4, y: vh * 0.72, rotate: -18, opacity: 0.15 }
              : phase === 'chosen'
                ? chosenId === matchup.left.id
                  ? { x: 0, y: riseY * 0.23, scale: 1.08, rotate: -1.2 }
                  : { opacity: 0, scale: 0.5, y: vh * 0.54, rotate: -15 }
                : leftKeyframes
          }
          transition={
            phase === 'animate'
              ? animationTransition
              : phase === 'timeout-fall'
                ? { duration: 0.6, ease: 'easeOut' }
                : { duration: 0.4, ease: 'easeOut' }
          }
          onClick={() => handleChoice(matchup.left.id)}
          draggable={false}
        >
          <img
            src={leftUrl}
            alt="Left cat"
            className="polaroid-photo"
            draggable={false}
          />
        </motion.button>

        <motion.button
          key={`right-${matchup.right.id}`}
          className="polaroid-card"
          style={{ width: cardWidth, transform: 'rotate(2.2deg)', cursor: 'pointer', ...getChosenStyle(matchup.right.id) }}
          animate={
            phase === 'timeout'
              ? frozenRight
              : phase === 'timeout-fall'
                ? { x: spreadX * 0.4, y: vh * 0.74, rotate: 20, opacity: 0.15 }
              : phase === 'chosen'
                ? chosenId === matchup.right.id
                  ? { x: 0, y: riseY * 0.23, scale: 1.08, rotate: 1.2 }
                  : { opacity: 0, scale: 0.5, y: vh * 0.54, rotate: 15 }
                : rightKeyframes
          }
          transition={
            phase === 'animate'
              ? animationTransition
              : phase === 'timeout-fall'
                ? { duration: 0.6, ease: 'easeOut' }
                : { duration: 0.4, ease: 'easeOut' }
          }
          onClick={() => handleChoice(matchup.right.id)}
          draggable={false}
        >
          <img
            src={rightUrl}
            alt="Right cat"
            className="polaroid-photo"
            draggable={false}
          />
        </motion.button>
      </div>
    </motion.div>
  )
}
