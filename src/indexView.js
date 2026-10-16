// Live 3D previews for the Index window. ONE shared WebGL renderer draws each visible tile's loot
// model (slowly turning) and copies it into that tile's 2D canvas. Undiscovered items are drawn as a
// flat black silhouette. Tiles scrolled out of view are skipped; nothing runs while the window is closed.
import {
  ACESFilmicToneMapping, AmbientLight, DirectionalLight, Group, MeshBasicMaterial, PerspectiveCamera,
  PMREMGenerator, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildModel } from './r3f.js'
import { GenericItem, MODELS } from './lootModels.jsx'

const SIZE = 192 // px of each preview (the tile is ~140 CSS px)
const FRAME_GAP = 1 / 30 // s between redraws: the slow spin doesn't need 60 fps

export function createIndexViews(slots, scrollRoot, isFound) {
  let renderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    return { setActive() {} } // no WebGL: tiles stay empty
  }
  renderer.setSize(SIZE, SIZE, false)
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.85
  scene.add(new AmbientLight('#ffffff', 0.5))
  const key = new DirectionalLight('#ffffff', 2.2)
  key.position.set(3, 4, 4)
  scene.add(key)
  const silhouette = new MeshBasicMaterial({ color: '#06060a' })

  const camera = new PerspectiveCamera(30, 1, 0.1, 40)
  camera.position.set(0, 0.35, 4.6)
  camera.lookAt(0, 0.1, 0)

  const models = new Map() // name -> { pivot, tick }
  const visible = new Set()
  let active = false
  let raf = 0
  let last = 0

  function modelFor(name) {
    let m = models.get(name)
    if (!m) {
      const built = buildModel(MODELS[name] ?? GenericItem)
      const pivot = new Group()
      built.object.position.y = -0.5 // models are ~1 m across and rest on y = 0
      pivot.add(built.object)
      pivot.rotation.x = 0.18
      models.set(name, (m = { pivot, tick: built.tick, spin: new Group() }))
      m.spin.add(pivot)
    }
    return m
  }

  // Build every model a little at a time while the window is open, so scrolling a tile into
  // view never has to construct geometry / materials (the main source of scroll hitches).
  let warmIdx = 0
  function warm() {
    const t0 = performance.now()
    while (warmIdx < slots.length && performance.now() - t0 < 4) modelFor(slots[warmIdx++].name)
  }

  function frame(t, dt) {
    warm()
    for (const slot of slots) {
      if (!visible.has(slot.canvas)) continue
      const found = isFound(slot.name)
      // Undiscovered tiles are a static silhouette: draw once, not every frame.
      if (!found && slot.shown === 'sil') continue
      const m = modelFor(slot.name)
      if (found) m.tick(dt)
      m.spin.rotation.y = found ? t * 1.1 + slot.index * 0.7 : slot.index * 0.7
      slot.shown = found ? 'live' : 'sil'
      scene.overrideMaterial = found ? null : silhouette
      scene.add(m.spin)
      renderer.render(scene, camera)
      scene.remove(m.spin)
      const ctx = slot.canvas.getContext('2d')
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(renderer.domElement, 0, 0, SIZE, SIZE)
    }
    scene.overrideMaterial = null
  }

  const io = new IntersectionObserver(
    (list) => {
      for (const it of list) (it.isIntersecting ? visible.add(it.target) : visible.delete(it.target))
    },
    { root: scrollRoot, threshold: 0.01 },
  )
  slots.forEach((s, i) => {
    s.index = i
    s.canvas.width = s.canvas.height = SIZE
    io.observe(s.canvas)
  })

  function loop(ms) {
    if (!active) return
    const t = ms / 1000
    if (t - last < FRAME_GAP) {
      raf = requestAnimationFrame(loop)
      return
    }
    try {
      frame(t, Math.min(0.1, t - last))
    } catch (err) {
      console.warn('[index preview]', err)
      active = false
      return
    }
    last = t
    raf = requestAnimationFrame(loop)
  }
  return {
    setActive(on) {
      if (on === active) return
      active = on
      cancelAnimationFrame(raf)
      if (on) {
        last = performance.now() / 1000
        raf = requestAnimationFrame(loop)
      }
    },
  }
}
