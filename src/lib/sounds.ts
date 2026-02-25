let audioCtx: AudioContext | null = null
let tapVariant = 0

function canPlaySound(): boolean {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible' && document.hasFocus()
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended' && canPlaySound()) {
    void audioCtx.resume()
  }
  return audioCtx
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.9
  }
  return buffer
}

function playFilteredNoise(ctx: AudioContext, opts: { start: number; duration: number; frequency: number; gain: number; q?: number }) {
  const src = ctx.createBufferSource()
  src.buffer = createNoiseBuffer(ctx, opts.duration)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(opts.frequency, opts.start)
  filter.Q.setValueAtTime(opts.q ?? 0.9, opts.start)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, opts.start)
  gain.gain.exponentialRampToValueAtTime(opts.gain, opts.start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  src.start(opts.start)
  src.stop(opts.start + opts.duration + 0.02)
}

export function playLaunch() {
  if (!canPlaySound()) return
  const ctx = getCtx()
  const t = ctx.currentTime
  playFilteredNoise(ctx, { start: t, duration: 0.2, frequency: 760, gain: 0.08, q: 0.8 })
  const whisk = ctx.createOscillator()
  const whiskGain = ctx.createGain()
  whisk.type = 'triangle'
  whisk.frequency.setValueAtTime(200, t)
  whisk.frequency.exponentialRampToValueAtTime(520, t + 0.14)
  whiskGain.gain.setValueAtTime(0.0001, t)
  whiskGain.gain.linearRampToValueAtTime(0.05, t + 0.04)
  whiskGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24)
  whisk.connect(whiskGain)
  whiskGain.connect(ctx.destination)
  whisk.start(t)
  whisk.stop(t + 0.24)
}

export function playTap() {
  if (!canPlaySound()) return
  const ctx = getCtx()
  const t = ctx.currentTime
  const variant = tapVariant % 3
  tapVariant += 1

  if (variant === 0) {
    playFilteredNoise(ctx, { start: t, duration: 0.11, frequency: 340, gain: 0.06, q: 1.2 })
    const thud = ctx.createOscillator()
    const gain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(122, t)
    thud.frequency.exponentialRampToValueAtTime(85, t + 0.1)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(0.055, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    thud.connect(gain)
    gain.connect(ctx.destination)
    thud.start(t)
    thud.stop(t + 0.12)
    return
  }

  if (variant === 1) {
    const mew = ctx.createOscillator()
    const gain = ctx.createGain()
    mew.type = 'triangle'
    mew.frequency.setValueAtTime(660, t)
    mew.frequency.linearRampToValueAtTime(930, t + 0.05)
    mew.frequency.linearRampToValueAtTime(720, t + 0.1)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(0.052, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    mew.connect(gain)
    gain.connect(ctx.destination)
    mew.start(t)
    mew.stop(t + 0.12)
    return
  }

  const purr = ctx.createOscillator()
  const gain = ctx.createGain()
  purr.type = 'sawtooth'
  purr.frequency.setValueAtTime(185, t)
  purr.frequency.exponentialRampToValueAtTime(225, t + 0.08)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(0.035, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  purr.connect(gain)
  gain.connect(ctx.destination)
  purr.start(t)
  purr.stop(t + 0.14)
  playFilteredNoise(ctx, { start: t + 0.015, duration: 0.08, frequency: 1200, gain: 0.012, q: 1.5 })
}

export function playElimination() {
  if (!canPlaySound()) return
  const ctx = getCtx()
  const t = ctx.currentTime
  playFilteredNoise(ctx, { start: t, duration: 0.2, frequency: 500, gain: 0.045 })
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(240, t)
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.28)
  gain.gain.setValueAtTime(0.04, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
  osc.start(t)
  osc.stop(t + 0.3)
}

export function playCountdownReminder(second: number) {
  if (!canPlaySound()) return
  const ctx = getCtx()
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const freq = second === 1 ? 620 : second === 2 ? 560 : 510
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(0.04, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.24)
}

export function playSurprisedMeow() {
  if (!canPlaySound()) return
  const ctx = getCtx()
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(720, t)
  osc.frequency.linearRampToValueAtTime(980, t + 0.08)
  osc.frequency.linearRampToValueAtTime(760, t + 0.18)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(0.055, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.24)
}

export function playFinale() {
  if (!canPlaySound()) return
  const ctx = getCtx()
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    const t = ctx.currentTime + i * 0.15
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4)
    osc.start(t)
    osc.stop(t + 0.4)
  })
}
