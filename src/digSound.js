// Procedural snow-shovel audio (Web Audio, no files). Every stroke is three parts:
//   hit()   blade scrape + packed-snow crunch (random micro-clicks) when the blade digs in
//   throw() low "fwump" as the load leaves the blade, a soft swish, then flakes landing
// Each call is randomised (pitch/level/timing) so held digging never sounds like a loop.
// Soft and muffled on purpose: everything is rolled off above ~6 kHz. Lazy init, never throws.
import { sfx } from './settings.js'

const rnd = (a, b) => a + Math.random() * (b - a)
const vary = (v, amt = 0.15) => v * (1 + rnd(-amt, amt))

export function createDigSound() {
  let ctx = null
  let noise = null
  let bus = null
  let failed = false

  function init() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) throw new Error('no WebAudio')
      ctx = new AC()
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const d = noise.getChannelData(0)
      let last = 0
      // slightly pink noise: softer than white, closer to snow
      for (let i = 0; i < d.length; i++) {
        last = last * 0.4 + (Math.random() * 2 - 1) * 0.6
        d[i] = last
      }
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -20
      comp.knee.value = 20
      comp.ratio.value = 5
      const soften = ctx.createBiquadFilter() // snow has no sharp highs
      soften.type = 'lowpass'
      soften.frequency.value = 6000
      soften.Q.value = 0.5
      bus = ctx.createGain()
      bus.connect(soften).connect(comp).connect(ctx.destination)
    } catch (e) {
      failed = true
      console.warn('[digSound] audio init failed', e)
    }
  }

  function run(fn) {
    if (failed) return
    if (!ctx) init()
    if (failed) return
    try {
      if (ctx.state !== 'running') ctx.resume()
      bus.gain.value = sfx() * 3 // layers are quiet band-passed noise; the compressor catches peaks
      fn(ctx.currentTime)
    } catch (e) {
      console.warn('[digSound] play failed', e) // keep trying: one bad call must not mute the game
    }
  }

  // Create/unlock the context on the first real input so browsers never leave it suspended.
  const unlock = () => {
    if (!failed && !ctx) init()
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {})
  }
  for (const ev of ['pointerdown', 'keydown'])
    window.addEventListener(ev, unlock, { capture: true, passive: true })

  let t = -1 // seconds into the current stroke, -1 = idle
  let threw = false

  // Filtered noise: filter sweeps f0 -> f1, envelope attacks over `atk` then decays to `dur`.
  function tone(t, type, f0, f1, q, vol, atk, dur) {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.Q.value = q
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(f1, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(vol, t + atk)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(bus)
    src.start(t, rnd(0, 0.5), dur + 0.05)
  }

  // A single tiny click/crackle: ~10-30 ms of high-passed noise.
  function click(t, freq, vol) {
    tone(t, 'bandpass', freq, freq * 0.7, 1.4, vol, 0.002, rnd(0.012, 0.03))
  }

  const api = {
    // Call each frame. Sound is driven by the held input itself (not the animation), so it works
    // anywhere, even while walking or for a click shorter than the swing. A started stroke always
    // finishes (hit, then throw `gap` s later); while still held, the next stroke follows at `cycle` s.
    update(dt, active, cycle = 0.85, gap = 0.37) {
      if (t < 0) {
        if (!active) return
        t = 0
        threw = false
        api.hit()
        return
      }
      t += dt
      if (!threw && t >= gap) {
        threw = true
        api.throw()
      }
      if (t >= cycle) {
        t = -1
        if (active) api.update(0, true, cycle, gap)
      }
    },
    hit: () =>
      run((t) => {
        // 1. scrape: blade drags, slow attack, pitch rises as it bites
        const scr = rnd(0.08, 0.15)
        tone(t, 'bandpass', vary(1100, 0.2), vary(2600, 0.2), 1.6, vary(0.2), scr * 0.6, scr)
        // 2. crunch: 15-30 random micro-clicks over ~120 ms
        const n = Math.floor(rnd(15, 30))
        for (let i = 0; i < n; i++) {
          const dt = rnd(0.015, 0.135) // after the scrape begins
          click(t + dt, rnd(2000, 4200), rnd(0.05, 0.22))
        }
        // dull compression under the crunch
        tone(t + 0.02, 'lowpass', vary(500), 160, 0.7, vary(0.28), 0.015, rnd(0.12, 0.2))
      }),
    throw: () =>
      run((t) => {
        // 3. fwump: soft low thud as the load leaves the blade
        tone(t, 'lowpass', vary(280, 0.2), vary(150, 0.2), 0.8, vary(0.35), 0.02, rnd(0.12, 0.2))
        // light airy swish after it
        tone(t + 0.03, 'bandpass', vary(900), vary(2800), 0.7, vary(0.1), 0.08, rnd(0.2, 0.3))
        // flakes landing: quiet granular scatter over 200-300 ms
        const n = Math.floor(rnd(8, 16))
        const span = rnd(0.2, 0.3)
        for (let i = 0; i < n; i++) click(t + 0.12 + rnd(0, span), rnd(2500, 5000), rnd(0.02, 0.07))
      }),
  }
  return api
}
