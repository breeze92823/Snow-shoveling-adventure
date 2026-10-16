// A training-zone snow pile: a smooth, lumpy snow dome. It never changes. dig.js / trainPads.js drive it
// through `target.blow`; props.js calls `update` each frame (nothing to animate now).
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  RepeatWrapping,
} from 'three'
import { addPusher } from './colliders.js'

const R = 1.55 // pile radius, m
const HM = 1.3 // pile height, m

// Fine snow-grain bump shared by every pile (built once, lazily).
let grainTex = null
function grainTexture() {
  if (grainTex) return grainTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 2600; i++) {
    const v = 90 + Math.random() * 110
    g.fillStyle = `rgb(${v},${v},${v})`
    const r = 0.6 + Math.random() * 1.4
    g.beginPath()
    g.arc(Math.random() * 128, Math.random() * 128, r, 0, Math.PI * 2)
    g.fill()
  }
  grainTex = new CanvasTexture(c)
  grainTex.wrapS = grainTex.wrapT = RepeatWrapping
  return grainTex
}

export function createTrainingPile({ x, y, z, color, lava = false, seed = 1, floorAt = () => y, hp = 1 }) {
  const group = new Group()
  const rnd = (() => {
    let s = Math.floor(seed * 9301 + 49297) % 233280 || 1
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  const lump = rnd() * 6
  const windDir = rnd() * Math.PI * 2 // the drift is stretched/skewed along this direction
  const off = rnd() * 100

  // Seeded 2D value noise + fbm: gives the heap its wind-blown, clumpy surface.
  const hash = (i, j) => {
    const v = Math.sin((i + off) * 127.1 + (j + off) * 311.7) * 43758.5453
    return v - Math.floor(v)
  }
  const vnoise = (px, pz) => {
    const i = Math.floor(px)
    const j = Math.floor(pz)
    const fx = px - i
    const fz = pz - j
    const u = fx * fx * (3 - 2 * fx)
    const w = fz * fz * (3 - 2 * fz)
    return (
      hash(i, j) * (1 - u) * (1 - w) + hash(i + 1, j) * u * (1 - w) + hash(i, j + 1) * (1 - u) * w + hash(i + 1, j + 1) * u * w
    )
  }
  const fbm = (px, pz) => vnoise(px, pz) * 0.55 + vnoise(px * 2.1, pz * 2.1) * 0.3 + vnoise(px * 4.3, pz * 4.3) * 0.15

  const cw = Math.cos(windDir)
  const sw = Math.sin(windDir)
  const height = (px, pz) => {
    // stretch along the wind so it reads as a drift, not a perfect cone
    const al = px * cw + pz * sw
    const cr = -px * sw + pz * cw
    const ex = al / (R * 1.12)
    const ez = cr / (R * 0.9)
    const th = Math.atan2(pz, px)
    // irregular outline
    const edge = 1 + 0.12 * (fbm(px * 1.3 + 5, pz * 1.3 + 5) - 0.5) * 2 + 0.05 * Math.sin(4 * th + lump)
    const r2 = (ex * ex + ez * ez) / (edge * edge)
    if (r2 >= 1) return 0
    // steeper shoulders than a plain dome, a slightly lopsided summit
    const base = HM * Math.pow(1 - r2, 0.75) * (1 + 0.18 * (al / R))
    const clump = (fbm(px * 2.2, pz * 2.2) - 0.5) * 0.34 // lumpy mounds
    const ripple = Math.sin((cr * 7 + fbm(px * 3, pz * 3) * 3) * 1.0) * 0.018 // wind ripples
    const fade = Math.min(1, (1 - r2) * 4) // keep the rim glued to the ground
    return Math.max(0, base + (clump + ripple) * fade * (0.4 + base / HM))
  }

  const rings = 30
  const segs = 72
  const verts = []
  const uvs = []
  const idx = []
  for (let r = 0; r <= rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2
      // ease radius so the dense rings sit near the rim where the slope is steepest
      const rr = Math.pow(r / rings, 0.85) * R * 1.2
      const px = Math.cos(a) * rr
      const pz = Math.sin(a) * rr
      verts.push(px, height(px, pz), pz)
      uvs.push(px * 1.6, pz * 1.6)
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * segs + s
      const b = r * segs + ((s + 1) % segs)
      idx.push(a, a + segs, b, b, a + segs, b + segs)
    }
  }
  const coreGeo = new BufferGeometry()
  coreGeo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
  coreGeo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  coreGeo.setIndex(idx)
  coreGeo.computeVertexNormals()

  // Baked shading: bright sunlit crowns, cool blue-grey hollows and steep flanks.
  const pos = coreGeo.attributes.position
  const nor = coreGeo.attributes.normal
  const cols = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / HM
    const flat = Math.max(0, nor.getY(i))
    const ao = Math.min(1, 0.55 + h * 0.5 + flat * 0.35)
    const k = 0.78 + 0.22 * ao
    cols[i * 3] = k * (0.93 + 0.07 * ao)
    cols[i * 3 + 1] = k * (0.96 + 0.04 * ao)
    cols[i * 3 + 2] = Math.min(1, k * 1.04 + 0.04 * (1 - ao))
  }
  coreGeo.setAttribute('color', new BufferAttribute(cols, 3))

  // The colour is the matching snow-field zone's palette tint.
  const grain = grainTexture()
  const coreMat = new MeshStandardMaterial({
    color: new Color(color),
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    bumpMap: grain,
    bumpScale: 1.4,
    side: DoubleSide,
    ...(lava ? { emissive: '#ff3a00', emissiveIntensity: 0.3 } : {}),
  })
  const core = new Mesh(coreGeo, coreMat)
  core.position.y = 0.05
  group.add(core)

  // Loose snow chunks and clods resting around the base and on the flanks.
  const clodGeo = new IcosahedronGeometry(1, 1)
  const cp = clodGeo.attributes.position
  for (let i = 0; i < cp.count; i++) {
    const f = 0.8 + 0.4 * hash(Math.round(cp.getX(i) * 9), Math.round(cp.getZ(i) * 9) + i * 0.01)
    cp.setXYZ(i, cp.getX(i) * f, cp.getY(i) * f * 0.7, cp.getZ(i) * f)
  }
  clodGeo.computeVertexNormals()
  const clodMat = new MeshStandardMaterial({ color: new Color(color), roughness: 0.95, bumpMap: grain, bumpScale: 1.2 })
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2
    const d = R * (0.55 + rnd() * 0.65)
    const px = Math.cos(a) * d
    const pz = Math.sin(a) * d
    const hh = height(px, pz)
    const sc = 0.07 + rnd() * 0.13
    const m = new Mesh(clodGeo, clodMat)
    m.scale.set(sc * (1 + rnd() * 0.5), sc, sc * (1 + rnd() * 0.5))
    m.position.set(px, 0.05 + hh + sc * 0.15, pz)
    m.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3)
    group.add(m)
  }

  // Glittering ice crystals scattered over the surface.
  const sp = []
  for (let i = 0; i < 170; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.sqrt(rnd()) * R * 0.95
    const px = Math.cos(a) * d
    const pz = Math.sin(a) * d
    const hh = height(px, pz)
    if (hh > 0.04) sp.push(px, 0.06 + hh, pz)
  }
  const sparkGeo = new BufferGeometry()
  sparkGeo.setAttribute('position', new Float32BufferAttribute(sp, 3))
  const sparkles = new Points(
    sparkGeo,
    new PointsMaterial({ color: '#ffffff', size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }),
  )
  group.add(sparkles)

  const target = {
    x,
    y: y + 0.7,
    z,
    radius: R,
    blow() {},
  }

  addPusher((p, radius) => {
    const dx = p.x - x
    const dz = p.z - z
    const d = Math.hypot(dx, dz)
    const lim = R * 0.8 + radius
    if (d >= lim) return
    if (d > 1e-6) {
      p.x += (dx / d) * (lim - d)
      p.z += (dz / d) * (lim - d)
    } else p.x += lim
  })

  return { group, target, coreMat, update() {} }
}
