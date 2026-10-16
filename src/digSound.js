// Procedural shovel audio: a crunchy filtered-noise bite when the blade hits the snow and a
// softer swish when the load is thrown. Built lazily on first use (needs a user gesture) and never throws.
import { sfx } from './settings.js'

export function createDigSound() {
  let ctx = null
  let noise = null
  let failed = false

  function init() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) throw new Error('no WebAudio')
      ctx = new AC()
      const len = ctx.sampleRate
      noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    } catch {
      failed = true
    }
  }

  // One noise burst through a band-pass that sweeps from `f0` to `f1` Hz over `dur` s.
  function burst(vol, f0, f1, dur) {
    if (failed) return
    if (!ctx) init()
    if (failed) return
    try {
      if (ctx.state === 'suspended') ctx.resume()
      const t = ctx.currentTime
      const src = ctx.createBufferSource()
      src.buffer = noise
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.Q.value = 0.9
      bp.frequency.setValueAtTime(f0, t)
      bp.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(vol * sfx(), t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      src.connect(bp).connect(g).connect(ctx.destination)
      src.start(t, Math.random() * 0.5, dur + 0.05)
    } catch {
      failed = true
    }
  }

  return {
    hit: () => burst(0.5, 1800, 500, 0.2), // blade bites the snow
    throw: () => burst(0.22, 700, 2600, 0.28), // load flung
  }
}
