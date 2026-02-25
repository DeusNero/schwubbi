import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Easing } from 'framer-motion'
import type { Matchup } from '../engine/tournament'
import { getThumbUrl } from '../lib/supabase'
import { playLaunch, playTap, playElimination, playCountdownReminder, playSurprisedMeow } from '../lib/sounds'
import { TrailCatSketchIcon, TrailHappyCatSketchIcon, TrailHeartSketchIcon } from './icons/SketchIcons'

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
const TRAIL_ACCENT = 'rgba(223, 122, 55, 0.62)'
const TRAIL_LINE = 'rgba(28, 16, 8, 1)'

type TrailKind = 'cat' | 'happy' | 'heart'

interface TrailParticle {
  id: string
  kind: TrailKind
  x: number
  y: number
  drift: number
  spin: number
  delay: number
  size: number
}

function makeTrailParticles(seed: string): TrailParticle[] {
  return Array.from({ length: 14 }).map((_, i) => {
    const n = seed.charCodeAt(i % seed.length) + i * 17
    const kind: TrailKind = i % 5 === 4 ? 'heart' : i % 2 === 0 ? 'cat' : 'happy'
    return {
      id: `${seed}-${i}`,
      kind,
      x: 16 + (n % 66),
      y: 18 + (i % 5) * 12,
      drift: ((n % 18) - 9) * 1.5,
      spin: i % 2 === 0 ? 28 : -24,
      delay: i * 0.09,
      size: kind === 'heart' ? 24 + (n % 5) : 26 + (n % 6),
    }
  })
}

export default function Battle({ matchup, onResult, roundLabel, round, totalRounds }: BattleProps) {
  const [phase, setPhase] = useState<'animate' | 'timeout' | 'timeout-fall' | 'chosen'>('animate')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const matchupIdRef = useRef(`${matchup.left.id}-${matchup.right.id}`)
  const endedRef = useRef(false)
  const lastResultRef = useRef(onResult)

  useEffect(() => {
    lastResultRef.current = onResult
  }, [onResult])

  const forceEndMatch = useCallback(() => {
    if (endedRef.current || phase === 'chosen' || phase === 'timeout-fall') return
    endedRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (watchdogRef.current) clearInterval(watchdogRef.current)
    setPhase('timeout-fall')
    setChosenId(null)
    setTimeout(() => lastResultRef.current(null), 120)
  }, [phase])

  useEffect(() => {
    endedRef.current = false
    matchupIdRef.current = `${matchup.left.id}-${matchup.right.id}`
    setPhase('animate')
    setChosenId(null)
    setTimeLeft(TOTAL_TIME)

    if (document.visibilityState === 'visible' && document.hasFocus()) {
      playLaunch()
    }

    countdownRef.current = setInterval(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        forceEndMatch()
        return
      }
      setTimeLeft(prev => {
        const next = prev <= 1 ? 0 : prev - 1
        if (next <= TIMEOUT_EXTRA && next > 0) {
          playCountdownReminder(next)
        }
        return next
      })
    }, 1000)

    timerRef.current = setTimeout(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        forceEndMatch()
        return
      }
      setPhase('timeout')
      timeoutTimerRef.current = setTimeout(() => {
        if (document.visibilityState !== 'visible' || !document.hasFocus()) {
          forceEndMatch()
          return
        }
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
      if (watchdogRef.current) clearInterval(watchdogRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchup.left.id, matchup.right.id])

  useEffect(() => {
    const endMatchIfBackgrounded = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        forceEndMatch()
      }
    }

    document.addEventListener('visibilitychange', endMatchIfBackgrounded)
    window.addEventListener('blur', endMatchIfBackgrounded)
    window.addEventListener('pagehide', endMatchIfBackgrounded)
    window.addEventListener('freeze', endMatchIfBackgrounded as EventListener)
    watchdogRef.current = setInterval(endMatchIfBackgrounded, 250)

    return () => {
      document.removeEventListener('visibilitychange', endMatchIfBackgrounded)
      window.removeEventListener('blur', endMatchIfBackgrounded)
      window.removeEventListener('pagehide', endMatchIfBackgrounded)
      window.removeEventListener('freeze', endMatchIfBackgrounded as EventListener)
      if (watchdogRef.current) clearInterval(watchdogRef.current)
    }
  }, [forceEndMatch])

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

  const yarnWidth = Math.max(0, (timeLeft / TOTAL_TIME) * 100)
  const leftTrailParticles = useMemo(() => makeTrailParticles(matchup.left.id), [matchup.left.id])
  const rightTrailParticles = useMemo(() => makeTrailParticles(matchup.right.id), [matchup.right.id])
  const burstParticles = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i): { id: string; kind: TrailKind; angle: number; size: number } => ({
        id: `burst-${i}`,
        kind: i % 3 === 0 ? 'heart' : i % 2 === 0 ? 'happy' : 'cat',
        angle: (i / 9) * Math.PI * 2,
        size: i % 3 === 0 ? 34 : 30,
      })),
    []
  )
  const trailDuration = 0.95

  const renderTrailIcon = (kind: TrailKind, size: number) => {
    const iconStyle: React.CSSProperties = { width: size, height: size, strokeWidth: 2.3 }
    if (kind === 'heart') return <TrailHeartSketchIcon size={size} style={iconStyle} />
    if (kind === 'happy') return <TrailHappyCatSketchIcon size={size} style={iconStyle} />
    return <TrailCatSketchIcon size={size} style={iconStyle} />
  }

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
        <motion.div
          key={`left-${matchup.left.id}`}
          className="polaroid-card"
          style={{ width: cardWidth, transform: 'rotate(-2.8deg)', cursor: 'pointer', overflow: 'visible', ...getChosenStyle(matchup.left.id) }}
          animate={
            phase === 'timeout'
              ? { x: -spreadX, y: 0, scale: 1.3, rotate: [-8, 2, -7, 3, -8] }
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
              : phase === 'timeout'
                ? { duration: 0.55, ease: 'easeInOut', repeat: Infinity }
              : phase === 'timeout-fall'
                ? { duration: 0.6, ease: 'easeOut' }
                : { duration: 0.4, ease: 'easeOut' }
          }
          onClick={() => handleChoice(matchup.left.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleChoice(matchup.left.id)
          }}
        >
          {(phase === 'animate' || phase === 'timeout-fall') && leftTrailParticles.map((p) => (
            <motion.div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: p.y,
                color: TRAIL_LINE,
                zIndex: 1,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 1px 0 rgba(255, 236, 207, 0.45))',
              }}
              animate={{
                x: [0, p.drift],
                y: phase === 'animate'
                  ? [0, 60 + (p.size * 1.05)]
                  : [0, -70 - (p.size * 1.25)],
                rotate: [0, p.spin],
                opacity: [0.95, 0.7, 0],
                scale: [0.78, 1.02, 1.12],
              }}
              transition={{
                duration: phase === 'animate' ? trailDuration : 0.55,
                delay: p.delay,
                repeat: phase === 'animate' ? Infinity : 0,
                ease: 'easeOut',
                repeatDelay: phase === 'animate' ? 0.02 : 0,
              }}
            >
              <div style={{ position: 'absolute', inset: -6, borderRadius: 999, background: TRAIL_ACCENT, opacity: 0.48 }} />
              {renderTrailIcon(p.kind, p.size)}
            </motion.div>
          ))}
          {phase === 'chosen' && chosenId === matchup.left.id && (
            <div style={{ position: 'absolute', inset: -34, zIndex: 50, pointerEvents: 'none' }}>
              {burstParticles.map((p, idx) => (
                <motion.div
                  key={`left-burst-${p.id}`}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
                  animate={{
                    x: Math.cos(p.angle) * (82 + (idx % 3) * 28),
                    y: Math.sin(p.angle) * (82 + (idx % 3) * 28),
                    opacity: [0, 1, 0],
                    scale: [0.68, 1.16, 0.82],
                    rotate: idx % 2 === 0 ? 28 : -28,
                  }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.02 }}
                  style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -8, marginTop: -8, color: TRAIL_LINE }}
                >
                  {renderTrailIcon(p.kind, p.size)}
                </motion.div>
              ))}
            </div>
          )}
          <img
            src={leftUrl}
            alt="Left cat"
            className="polaroid-photo"
            style={{ position: 'relative', zIndex: 20 }}
            draggable={false}
          />
        </motion.div>

        <motion.div
          key={`right-${matchup.right.id}`}
          className="polaroid-card"
          style={{ width: cardWidth, transform: 'rotate(2.2deg)', cursor: 'pointer', overflow: 'visible', ...getChosenStyle(matchup.right.id) }}
          animate={
            phase === 'timeout'
              ? { x: spreadX, y: 0, scale: 1.3, rotate: [8, -2, 7, -3, 8] }
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
              : phase === 'timeout'
                ? { duration: 0.55, ease: 'easeInOut', repeat: Infinity }
              : phase === 'timeout-fall'
                ? { duration: 0.6, ease: 'easeOut' }
                : { duration: 0.4, ease: 'easeOut' }
          }
          onClick={() => handleChoice(matchup.right.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleChoice(matchup.right.id)
          }}
        >
          {(phase === 'animate' || phase === 'timeout-fall') && rightTrailParticles.map((p) => (
            <motion.div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: p.y,
                color: TRAIL_LINE,
                zIndex: 1,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 1px 0 rgba(255, 236, 207, 0.45))',
              }}
              animate={{
                x: [0, p.drift],
                y: phase === 'animate'
                  ? [0, 60 + (p.size * 1.05)]
                  : [0, -70 - (p.size * 1.25)],
                rotate: [0, p.spin],
                opacity: [0.95, 0.7, 0],
                scale: [0.78, 1.02, 1.12],
              }}
              transition={{
                duration: phase === 'animate' ? trailDuration : 0.55,
                delay: p.delay,
                repeat: phase === 'animate' ? Infinity : 0,
                ease: 'easeOut',
                repeatDelay: phase === 'animate' ? 0.02 : 0,
              }}
            >
              <div style={{ position: 'absolute', inset: -6, borderRadius: 999, background: TRAIL_ACCENT, opacity: 0.48 }} />
              {renderTrailIcon(p.kind, p.size)}
            </motion.div>
          ))}
          {phase === 'chosen' && chosenId === matchup.right.id && (
            <div style={{ position: 'absolute', inset: -34, zIndex: 50, pointerEvents: 'none' }}>
              {burstParticles.map((p, idx) => (
                <motion.div
                  key={`right-burst-${p.id}`}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
                  animate={{
                    x: Math.cos(p.angle) * (82 + (idx % 3) * 28),
                    y: Math.sin(p.angle) * (82 + (idx % 3) * 28),
                    opacity: [0, 1, 0],
                    scale: [0.68, 1.16, 0.82],
                    rotate: idx % 2 === 0 ? 28 : -28,
                  }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.02 }}
                  style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -8, marginTop: -8, color: TRAIL_LINE }}
                >
                  {renderTrailIcon(p.kind, p.size)}
                </motion.div>
              ))}
            </div>
          )}
          <img
            src={rightUrl}
            alt="Right cat"
            className="polaroid-photo"
            style={{ position: 'relative', zIndex: 20 }}
            draggable={false}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
