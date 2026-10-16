// The hub's architecture: studded lavender plaza, two terraces of orange
// checkered walls with green overhangs, voxel trees, the canyon field to the
// west and clouds. Props (stands, boards, portal...) are in props.js.
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  CanvasTexture,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addCollider } from './colliders.js'
import { buildFrozenFountain } from './frozenFountain.js'
import { buildPlazaDecor } from './plazaDecor.js'
import { buildVillage } from './village.js'
import { HUB, HUB_COLORS as C } from './config.js'
import { dripTexture, studTile, plazaLayoutTexture, PLAZA_DECAL as PD } from './textures.js'

const PLAZA_TILE_M = 8 // one plaza floor tile covers 8 m

const STUD_TILE_M = 4 // one studTile covers 4 m (2 m checker cells)
const DRIP_W = 8 // drip texture covers 8 m wide x 4 m tall
const DRIP_H = 4

const matCache = new Map()
export function studMat(a, b, studs = 2) {
  const key = `${a}${b}${studs}`
  if (!matCache.has(key)) matCache.set(key, new MeshStandardMaterial({ map: studTile(a, b, studs), roughness: 0.85 }))
  return matCache.get(key)
}

// BoxGeometry with UVs in world metres / tile, so a shared repeating texture
// keeps the same stud size on every box. Face order: +x -x +y -y +z -z.
export function worldBox(w, h, d, tile = STUD_TILE_M) {
  const g = new BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile)
    }
  }
  return g
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = shadow
  m.receiveShadow = true
  return m
}

const dripMats = new Map()
function dripMat(seed) {
  if (!dripMats.has(seed)) {
    dripMats.set(seed, new MeshStandardMaterial({ map: dripTexture(C.topA, C.topB, seed), alphaTest: 0.5, roughness: 0.85 }))
  }
  return dripMats.get(seed)
}

// A solid terrace block from the ground to `h`, with a green overhang slab on
// top and blocky green drips down each face.
function block(parent, x0, x1, z0, z1, h, { seed = 1, wall = [C.wallA, C.wallB], collide = true } = {}) {
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const body = mesh(worldBox(w, h, d), studMat(...wall), cx, h / 2, cz)
  body.userData.cave = 'wall' // re-skinned as rock under the Frost Realm (frostRealm.js)
  parent.add(body)
  const cap = mesh(worldBox(w + 0.6, 0.8, d + 0.6), studMat(C.topA, C.topB), cx, h - 0.3, cz)
  cap.userData.cave = 'cap'
  parent.add(cap)
  if (collide) addCollider(cx, cz, w, d, h)

  // Drips on the four faces, just proud of the wall.
  const faces = [
    [w, cx, cz + d / 2 + 0.05, 0],
    [w, cx, cz - d / 2 - 0.05, Math.PI],
    [d, cx + w / 2 + 0.05, cz, Math.PI / 2],
    [d, cx - w / 2 - 0.05, cz, -Math.PI / 2],
  ]
  faces.forEach(([len, px, pz, rot], i) => {
    const g = new PlaneGeometry(len, DRIP_H)
    const uv = g.attributes.uv
    for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * len) / DRIP_W)
    const m = mesh(g, dripMat(seed + i), px, h - 0.7 - DRIP_H / 2, pz, false)
    m.rotation.y = rot
    m.userData.cave = 'drip'
    parent.add(m)
  })
}

// --- Trees ------------------------------------------------------------------
// Four species (oak, pine, maple, birch), two shape variants each. Every variant is
// built once with its boxes merged per material, then planted as InstancedMeshes, so
// a detailed tree costs a few draw calls however many are planted.
const rng = (seed) => {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const barkMat = () => studMat(C.trunk, '#a34a24', 1)
const palettes = {
  oak: [studMat('#e6f1fa', '#d3e4f2'), studMat('#f5fbff', '#e2eef8')],
  pine: [studMat('#1f5e4a', '#194f3e'), studMat('#d8ebe6', '#c4ddd6')],
  maple: [studMat('#b9d3e8', '#a6c4dc'), studMat('#9cbbd6', '#8aabc9'), studMat('#d3e6f5', '#c0d8ec')],
  birch: [studMat('#eaf4fb', '#d9eaf6'), studMat('#cfe3f2', '#bcd5e8')],
}
const birchBark = () => studMat('#ece8e0', '#d8d2c6', 1)
const darkBark = () => studMat('#3a3430', '#2c2623', 1)

// Collects boxes by material (transform baked in), then merges each group.
function builder() {
  const groups = new Map()
  const q = new Quaternion()
  const e = new Euler()
  return {
    box(mat, w, h, d, x, y, z, ry = 0, rz = 0, rx = 0) {
      const g = worldBox(w, h, d)
      g.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new Vector3(1, 1, 1)))
      if (!groups.has(mat)) groups.set(mat, [])
      groups.get(mat).push(g)
    },
    parts: () => [...groups].map(([mat, gs]) => ({ mat, geo: mergeGeometries(gs) })),
  }
}

// A lumpy ball of canopy blobs, the biggest low and central, smaller ones toward the top.
function canopy(b, r, mats, cx, cy, cz, rx, ry, rz, n) {
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2
    const t = Math.sqrt(r())
    const hy = (r() * 2 - 1) * ry
    const k = Math.sqrt(Math.max(0, 1 - (hy / ry) ** 2))
    const s = 2.6 - (hy / ry + 1) * 0.5 + r() * 1.6
    b.box(mats[(r() * mats.length) | 0], s * (1 + r() * 0.5), s * (0.8 + r() * 0.3), s * (1 + r() * 0.5),
      cx + Math.cos(a) * t * k * rx, cy + hy, cz + Math.sin(a) * t * k * rz, r() * 1.5)
  }
}

function trunk(b, bark, h, w, r, roots = 4) {
  b.box(bark, w * 1.5, 1.0, w * 1.5, 0, 0.5, 0)
  b.box(bark, w, h * 0.55, w, 0, 1 + h * 0.275, 0)
  b.box(bark, w * 0.8, h * 0.5, w * 0.8, 0, 1 + h * 0.55 + h * 0.2, 0)
  for (let i = 0; i < roots; i++) {
    const a = (i / roots) * Math.PI * 2 + r()
    b.box(bark, 0.7, 0.8, 1.6, Math.cos(a) * w * 0.9, 0.35, Math.sin(a) * w * 0.9, -a, 0.2)
  }
}

const SPECIES = {
  oak(b, r) {
    const bark = barkMat()
    trunk(b, bark, 7 + r() * 1.5, 1.9, r)
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI * 2
      b.box(bark, 3.4, 0.9, 0.9, Math.cos(a) * 1.6, 6 + i * 0.6, Math.sin(a) * 1.6, -a, 0.5)
    }
    canopy(b, r, palettes.oak, 0, 10, 0, 5.2, 3.4, 5.2, 16)
    canopy(b, r, palettes.oak, 0, 7.6, 0, 6.2, 1, 6.2, 5)
  },
  maple(b, r) {
    const bark = barkMat()
    trunk(b, bark, 6 + r(), 2.1, r)
    b.box(bark, 3.4, 0.9, 1, 1.6, 6.4, 0, 0, 0.6)
    b.box(bark, 3.4, 0.9, 1, -1.6, 6.8, 0, 0, -0.6)
    canopy(b, r, palettes.maple, 0, 9.6, 0, 6.2, 3.2, 6.2, 18)
    canopy(b, r, palettes.maple, 0, 7.2, 0, 6.8, 1, 6.8, 5)
  },
  pine(b, r) {
    const bark = barkMat()
    const g = palettes.pine
    b.box(bark, 1.4, 11, 1.4, 0, 5.5, 0)
    b.box(bark, 2.2, 0.8, 2.2, 0, 0.4, 0)
    const tiers = 6 + ((r() * 2) | 0)
    for (let i = 0; i < tiers; i++) {
      const w = 11.5 - i * (10 / tiers)
      const y = 3.2 + i * 1.9
      b.box(g[i % 2], w, 1.5, w, 0, y, 0, i * 0.4)
      b.box(g[(i + 1) % 2], w * 0.62, 1.2, w * 0.62, 0, y + 1.1, 0, i * 0.4 + 0.5)
    }
    b.box(g[1], 1.2, 2.6, 1.2, 0, 3.2 + tiers * 1.9, 0)
  },
  birch(b, r) {
    const bark = birchBark()
    const dark = darkBark()
    b.box(bark, 1.3, 11, 1.3, 0, 5.5, 0)
    b.box(bark, 2, 0.8, 2, 0, 0.4, 0)
    for (let i = 0; i < 6; i++) {
      const f = r() < 0.5 ? 1 : -1
      b.box(dark, 1.36, 0.35, 0.5, 0, 1.5 + i * 1.6, f * 0.4)
    }
    b.box(bark, 3, 0.7, 0.7, 1.4, 8.2, 0, 0, 0.7)
    canopy(b, r, palettes.birch, 0, 11.5, 0, 3.8, 3.8, 3.8, 14)
  },
}
const KINDS = ['oak', 'pine', 'maple', 'birch']
const variants = new Map() // 'kind0' -> merged parts (built lazily)
const plantings = new Map() // variant key -> [Matrix4]

function variantParts(kind, v) {
  const key = kind + v
  if (!variants.has(key)) {
    const b = builder()
    SPECIES[kind](b, rng(KINDS.indexOf(kind) * 7 + v * 31 + 5))
    variants.set(key, b.parts())
  }
  return variants.get(key)
}

// Queue a tree; seed picks the species and shape variant, and a yaw.
function tree(parent, x, y, z, s = 1, seed = 0, kind = KINDS[seed % KINDS.length]) {
  const key = kind + ((seed >> 2) & 1)
  if (!plantings.has(key)) plantings.set(key, [])
  const m = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), seed * 1.7), new Vector3(s, s, s))
  plantings.get(key).push(m)
}

function flushTrees(parent) {
  for (const [key, mats] of plantings) {
    const kind = key.slice(0, -1)
    for (const { mat, geo } of variantParts(kind, +key.slice(-1))) {
      const im = new InstancedMesh(geo, mat, mats.length)
      mats.forEach((m, i) => im.setMatrixAt(i, m))
      im.castShadow = true
      im.receiveShadow = true
      im.userData.tree = true // swapped for ice-crystal trees under the Frost Realm (frostRealm.js)
      parent.add(im)
    }
  }
  plantings.clear()
}

function stoneCluster(parent, x, y, z, seed) {
  const mat = studMat(C.stone, '#a9bccd')
  const r = (k) => Math.sin(seed * 7.13 + k * 3.7) * 0.5 + 0.5
  for (let i = 0; i < 5; i++) {
    const s = 2 + r(i) * 2.5
    parent.add(mesh(worldBox(s, s * (0.8 + r(i + 9)), s), mat, x + (r(i + 1) - 0.5) * 5, y + s * 0.4 + r(i + 4) * 2, z + (r(i + 2) - 0.5) * 5))
  }
}

function cloudSprite() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')
  const puffs = [[70, 80, 40], [120, 64, 52], [175, 78, 40], [100, 92, 34], [150, 94, 34], [205, 94, 26], [45, 96, 24]]
  for (const [x, y, r] of puffs) {
    const grad = g.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.8, '#f4f8ff')
    grad.addColorStop(1, 'rgba(225,236,250,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// --- Rocky cliffs -----------------------------------------------------------
// Jagged strata, buttresses, snow-capped ledges and spires hung on the outward face
// of a wall, so the outer walls read as natural cliffs. Boxes are merged per material.
// `face` is the outward direction: 'n' (-z), 's' (+z), 'e' (+x), 'w' (-x), 'back' = same as 'w'.
function cliffFace(parent, { face, fixed, from, to, height, seed }) {
  const r = rng(seed)
  const rock = [
    studMat('#7b8797', '#6c7888', 1),
    studMat('#8c97a6', '#7d899a', 1),
    studMat('#5f6b7c', '#545f6f', 1),
    studMat('#9aa6b5', '#8a97a8', 1),
  ]
  const snow = studMat('#f4f9ff', '#e3eefa', 1)
  const groups = new Map()
  const add = (mat, w, h, d, x, y, z, ry, rx, rz) => {
    const g = worldBox(w, h, d)
    g.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(1, 1, 1)))
    if (!groups.has(mat)) groups.set(mat, [])
    groups.get(mat).push(g)
  }
  // Maps (along the wall, out from the wall) to world x/z for the chosen face.
  const place = (t, out) => {
    if (face === 'n') return [t, fixed - out]
    if (face === 's') return [t, fixed + out]
    if (face === 'e') return [fixed + out, t]
    return [fixed - out, t]
  }
  const yawBase = face === 'e' || face === 'w' ? Math.PI / 2 : 0
  for (let t = from; t < to; t += 2.2 + r() * 2.2) {
    // Stacked, receding strata make the face look layered and broken.
    let y = 0
    let out = 0.4 + r() * 1.4
    while (y < height - 1) {
      const h = 3 + r() * 6
      const w = 3 + r() * 4
      const depth = 1.5 + r() * 3.5
      const hh = Math.min(h, height + 1 - y)
      const mat = rock[Math.floor(r() * rock.length)]
      const [x, z] = place(t + (r() - 0.5) * 1.2, out + depth / 2 - 1)
      add(mat, w, hh, depth, x, y + hh / 2, z, yawBase + (r() - 0.5) * 0.35, (r() - 0.5) * 0.12, (r() - 0.5) * 0.12)
      // Snow resting on the ledge.
      if (r() < 0.7) {
        const [sx, sz] = place(t, out + depth / 2 - 1)
        add(snow, w * 0.9, 0.35, depth * 0.9, sx, y + hh + 0.1, sz, yawBase, 0, 0)
      }
      y += hh * (0.55 + r() * 0.3)
      out = Math.max(0, out + (r() - 0.55) * 1.8) // tends to step back as it climbs
    }
    // Occasional spire poking above the rim.
    if (r() < 0.35) {
      const sh = 4 + r() * 7
      const [x, z] = place(t, 0.5 + r())
      add(rock[Math.floor(r() * 3)], 1.6 + r() * 1.6, sh, 1.6 + r() * 1.6, x, height + sh / 2 - 1, z, r() * 3, (r() - 0.5) * 0.2, (r() - 0.5) * 0.2)
      add(snow, 1.2, 0.5, 1.2, x, height + sh - 1, z, 0, 0, 0)
    }
    // Boulders at the foot.
    if (r() < 0.5) {
      const s = 1.2 + r() * 2.2
      const [x, z] = place(t + 1, 2 + r() * 3)
      add(rock[Math.floor(r() * rock.length)], s, s * 0.8, s, x, s * 0.4, z, r() * 3, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4)
    }
  }
  for (const [mat, geos] of groups) {
    const m = new Mesh(mergeGeometries(geos), mat)
    m.castShadow = true
    m.receiveShadow = true
    m.userData.cave = 'wall'
    parent.add(m)
    geos.forEach((g) => g.dispose())
  }
}

// --- Mountains ----------------------------------------------------------------
// A mountain range along each side of the Snow Fields (see buildMountains below).
const hash2 = (x, y) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const fx = x - xi, fy = y - yi
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y, oct = 5) {
  let amp = 0.5, f = 1, sum = 0
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * f, y * f)
    f *= 2.03
    amp *= 0.5
  }
  return sum
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function pineGeometry() {
  const parts = []
  const paint = (g, hex) => {
    const c = new Color(hex)
    const n = g.attributes.position.count
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3)
    g.setAttribute('color', new BufferAttribute(a, 3))
    g.deleteAttribute('uv')
    parts.push(g)
  }
  const trunk = new CylinderGeometry(0.18, 0.28, 1.2, 5)
  trunk.translate(0, 0.6, 0)
  paint(trunk, '#4a3a2c')
  const tiers = [[1.7, 2.2, 1.0, '#1e4d3b'], [1.35, 2.0, 2.2, '#245a45'], [0.95, 1.8, 3.3, '#2b6650'], [0.55, 1.5, 4.3, '#e9f2f8']]
  for (const [r, h, y, col] of tiers) {
    const c = new ConeGeometry(r, h, 7)
    c.translate(0, y + h / 2, 0)
    paint(c, col)
  }
  return mergeGeometries(parts)
}

// Tileable grey grain with cracks and flecks (the red channel is read as a brightness multiplier).
function terrainDetailTexture() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#8c8c8c'
  g.fillRect(0, 0, S, S)
  const r = rng(99)
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy) }
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, rad = 3 + r() * 16, v = r() < 0.5 ? 0 : 255
    g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.07})`
    wrap((ox, oy) => { g.beginPath(); g.arc(x + ox, y + oy, rad, 0, 6.283); g.fill() })
  }
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 1
  for (let i = 0; i < 40; i++) {
    let x = r() * S, y = r() * S
    const pts = [[x, y]]
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.2) * 40; pts.push([x, y]) }
    wrap((ox, oy) => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.stroke() })
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'
    g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  return t
}

// Two mountain ranges, one along each side of the Snow Fields: a near-sheer wall rising from the field edge, then
// ridged-noise peaks climbing away to the horizon. Coloured by height and slope, with pines on the gentle lower slopes.
function buildMountains(parent, { end, IW, F }) {
  const xA = end - 16, xB = -IW // the strip runs from the far end wall to the hub's west wall
  const depth = 260 // how far back each range extends from the field edge
  const cell = 2
  // Rows get sparser with distance from the field edge, so the ground near the player is finely meshed.
  const nx = Math.ceil((xB - xA) / cell), nz = 110
  const rowU = (j) => { const t = j / nz; return depth * (0.4 * t + 0.6 * t * t) }
  const near = (u) => 1 - smooth(0, 70, u)
  const heightAt = (x, u) => {
    const taper = smooth(0, 50, x - xA) * smooth(0, 50, xB - x) // eases down to the ground at both ends of the strip
    const wall = (14 + 8 * (1 - smooth(xA, xA + 60, x))) * smooth(0, 6, u)
    const broad = fbm(x * 0.007 + 11, u * 0.007 + 3, 4)
    const ridge = 1 - Math.abs(2 * fbm(x * 0.013 + 40, u * 0.013 + 17, 5) - 1)
    const peaks = Math.pow(ridge, 1.6)
    const far = 0.5 + 0.5 * smooth(40, 200, u)
    const detail = fbm(x * 0.05, u * 0.05, 4) - 0.5
    const climb = smooth(0, 140, u) * (20 + 115 * peaks * (0.4 + broad)) * far
    // Fine rubble, drifts and ledges close to the field, fading out with distance.
    const rubble = (fbm(x * 0.28 + 7, u * 0.28 + 2, 3) - 0.5) * 2.2 + (fbm(x * 0.9 + 3, u * 0.9 + 8, 2) - 0.5) * 0.7
    const ledges = Math.round(fbm(x * 0.05 + 9, u * 0.05 + 4, 3) * 6) / 6 * 3 * smooth(4, 30, u)
    return (wall + climb + detail * (3 + smooth(0, 60, u) * 12) + (rubble + ledges) * near(u)) * taper - 0.6
  }
  const rockLo = new Color('#59636f'), rockHi = new Color('#8b95a3'), rockDk = new Color('#454e5a')
  const snow = new Color('#f4f8fd'), snowShade = new Color('#dce8f4')
  const tmp = new Color()
  const gravel = new Color('#7d8794'), iceTint = new Color('#a9c8e0')
  const side = (s) => {
    const verts = (nx + 1) * (nz + 1)
    const pos = new Float32Array(verts * 3)
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) {
        const gx = xA + i * cell, u = rowU(j)
        // Jitter only away from the field edge and the strip ends so the seams stay straight.
        const jit = smooth(4, 20, u) * smooth(0, 30, Math.min(gx - xA, xB - gx)) * cell * 0.5
        const x = gx + (hash2(i, j + s * 99) - 0.5) * jit
        const uu = u + (hash2(j + 77, i + s * 55) - 0.5) * jit
        pos.set([x, heightAt(x, uu), s * (F + uu)], (j * (nx + 1) + i) * 3)
      }
    }
    const idx = []
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
        if (s > 0) idx.push(a, c, b, b, c, d)
        else idx.push(a, b, c, b, d, c)
      }
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    const nrm = geo.attributes.normal
    const col = new Float32Array(verts * 3)
    for (let v = 0; v < verts; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]
      const ny = nrm.getY(v)
      const grain = fbm(x * 0.09, z * 0.09, 3)
      const strata = 0.5 + 0.5 * Math.sin(y * 0.55 + grain * 5)
      tmp.copy(rockDk).lerp(rockLo, 0.4 + grain * 0.6).lerp(rockHi, Math.min(1, Math.max(0, (y - 20) / 110)) * 0.7 + strata * 0.15)
      const snowLine = 52 + (grain - 0.5) * 40
      const snowAmt = Math.max(smooth(0.62, 0.9, ny) * 0.95, smooth(snowLine, snowLine + 26, y) * smooth(0.25, 0.6, ny))
      tmp.lerp(snow.clone().lerp(snowShade, (1 - ny) * 0.8 + grain * 0.2), Math.min(1, snowAmt))
      // Near the field: patchy gravel, ice and snow drifts plus speckle, so the ground is never one flat tone.
      const nr = near(Math.abs(z) - F)
      if (nr > 0) {
        const patch = fbm(x * 0.35 + 1, z * 0.35 + 5, 3)
        tmp.lerp(patch > 0.58 ? iceTint : patch < 0.4 ? gravel : snowShade, nr * 0.55 * smooth(0.25, 0.5, Math.abs(patch - 0.5)))
        tmp.multiplyScalar(1 + (hash2(Math.floor(x * 3), Math.floor(z * 3)) - 0.5) * 0.18 * nr)
      }
      col.set([tmp.r, tmp.g, tmp.b], v * 3)
    }
    geo.setAttribute('color', new BufferAttribute(col, 3))
    return geo
  }
  const mat = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })
  // Triplanar rock/snow grain over everything so big faces are never flat colour.
  const detailTex = terrainDetailTexture()
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detailTex }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTP;\nvarying vec3 vTN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTP = position;\nvTN = normal;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uDetail;\nvarying vec3 vTP;\nvarying vec3 vTN;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 tw = pow(abs(normalize(vTN)), vec3(4.0));
        tw /= (tw.x + tw.y + tw.z);
        float d1 = texture2D(uDetail, vTP.zy * 0.06).r * tw.x + texture2D(uDetail, vTP.xz * 0.06).r * tw.y + texture2D(uDetail, vTP.xy * 0.06).r * tw.z;
        float d2 = texture2D(uDetail, vTP.zy * 0.27).r * tw.x + texture2D(uDetail, vTP.xz * 0.27).r * tw.y + texture2D(uDetail, vTP.xy * 0.27).r * tw.z;
        diffuseColor.rgb *= (0.62 + 0.75 * d1) * (0.8 + 0.4 * d2);`,
      )
  }
  for (const s of [-1, 1]) {
    const terrain = new Mesh(side(s), mat)
    terrain.frustumCulled = false
    terrain.receiveShadow = false
    parent.add(terrain)
  }

  // Small pines over the gentle lower slopes.
  const rnd = rng(4242)
  const spots = []
  for (let n = 0; n < 9000 && spots.length < 2400; n++) {
    const x = xA + rnd() * (xB - xA), u = 4 + rnd() * 200, s = rnd() < 0.5 ? -1 : 1
    const y = heightAt(x, u)
    if (y > 75) continue
    const e = 1.5
    const gx = heightAt(x + e, u) - heightAt(x - e, u), gu = heightAt(x, u + e) - heightAt(x, u - e)
    if (Math.hypot(gx, gu) / (2 * e) > 0.75) continue // too steep
    if (fbm(x * 0.03 + 5, u * 0.03 + 9, 3) < 0.45) continue // cluster into groves
    spots.push([x, y, s * (F + u), 0.8 + rnd() * 0.9, rnd() * 6.28])
  }
  const pines = new InstancedMesh(pineGeometry(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), spots.length)
  const m4 = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0)
  spots.forEach(([x, y, z, sc, ry], i) => {
    q.setFromAxisAngle(up, ry)
    m4.compose(new Vector3(x, y - 0.2, z), q, new Vector3(sc, sc * (0.9 + (ry % 1) * 0.5), sc))
    pines.setMatrixAt(i, m4)
  })
  pines.instanceMatrix.needsUpdate = true
  pines.frustumCulled = false
  parent.add(pines)

  // Detail at the foot of the field walls: boulders, frozen shards and small snowy pines.
  const rd = rng(777)
  const footX0 = end + 2, footX1 = -IW - 6
  const boulders = [], shards = [], footPines = []
  for (let n = 0; n < 9000; n++) {
    const x = footX0 + rd() * (footX1 - footX0)
    const side = rd() < 0.5 ? -1 : 1
    const dF = 0.3 + Math.pow(rd(), 1.4) * 30
    const z = side * (F + dF)
    const y = heightAt(x, dF)
    const kind = rd()
    if (kind < 0.62 && boulders.length < 2600) boulders.push([x, y, z, 0.3 + Math.pow(rd(), 2.2) * 2.9, rd() * 6.28, rd()]) // mostly pebbles and rocks, a few big
    else if (kind < 0.74 && shards.length < 260) shards.push([x, y, z, 0.6 + rd() * 1.2, rd() * 6.28])
    else if (footPines.length < 520 && dF > 2) footPines.push([x, y, z, 0.6 + rd() * 0.8, rd() * 6.28])
  }
  const dummy = new Matrix4(), sc = new Vector3(), pv = new Vector3(), eu = new Euler(), qq = new Quaternion()
  // Rounded, lumpy stone: a subdivided sphere pushed around by noise, smooth-shaded so it doesn't read as a polygon block.
  const rockGeo = new IcosahedronGeometry(1, 3)
  const rp = rockGeo.attributes.position
  for (let k = 0; k < rp.count; k++) {
    const x = rp.getX(k), y = rp.getY(k), z = rp.getZ(k)
    const bump = 0.78 + 0.34 * fbm(x * 1.4 + 5, z * 1.4 + y * 1.1 + 9, 3) + 0.08 * Math.sin(y * 4 + x * 3)
    rp.setXYZ(k, x * bump, y * bump * 0.68 - (y < 0 ? 0.1 : 0), z * bump)
  }
  rockGeo.computeVertexNormals()
  const rocks = new InstancedMesh(rockGeo, new MeshStandardMaterial({ roughness: 0.92 }), boulders.length)
  const rc = new Color()
  boulders.forEach(([x, y, z, s, ry, tone], i) => {
    qq.setFromEuler(eu.set((tone - 0.5) * 0.5, ry, (ry % 1) * 0.4 - 0.2))
    dummy.compose(pv.set(x, y + s * 0.25, z), qq, sc.set(s * (1 + tone * 0.4), s * (0.8 + tone * 0.4), s))
    rocks.setMatrixAt(i, dummy)
    rc.set(tone < 0.4 ? '#7a8594' : tone < 0.75 ? '#9aa6b5' : '#e6eff8').offsetHSL(0, 0, (rd() - 0.5) * 0.06)
    rocks.setColorAt(i, rc)
  })
  rocks.instanceMatrix.needsUpdate = true
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true
  rocks.frustumCulled = false
  parent.add(rocks)

  const shardGeo = new ConeGeometry(0.35, 1, 5)
  shardGeo.translate(0, 0.5, 0)
  const ice = new InstancedMesh(shardGeo, new MeshStandardMaterial({ color: '#bfe6ff', emissive: '#2a6f9a', emissiveIntensity: 0.35, roughness: 0.2, flatShading: true }), shards.length * 3)
  let si = 0
  for (const [x, y, z, s, ry] of shards) {
    for (let k = 0; k < 3; k++) {
      const h = s * (1.2 + rd() * 2.2)
      qq.setFromEuler(eu.set(k ? (rd() - 0.5) * 0.7 : 0, ry + k, k ? (rd() - 0.5) * 0.7 : 0))
      dummy.compose(pv.set(x + (rd() - 0.5) * 1.1, y - 0.1, z + (rd() - 0.5) * 1.1), qq, sc.set(s * 0.8, h, s * 0.8))
      ice.setMatrixAt(si++, dummy)
    }
  }
  ice.instanceMatrix.needsUpdate = true
  ice.frustumCulled = false
  parent.add(ice)

  const fp = new InstancedMesh(pineGeometry(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), footPines.length)
  footPines.forEach(([x, y, z, s, ry], i) => {
    qq.setFromEuler(eu.set(0, ry, 0))
    dummy.compose(pv.set(x, y - 0.2, z), qq, sc.set(s, s * 1.1, s))
    fp.setMatrixAt(i, dummy)
  })
  fp.instanceMatrix.needsUpdate = true
  fp.frustumCulled = false
  parent.add(fp)
}

export function buildHub(scene) {
  const root = new Group()
  scene.add(root)
  const W = HUB.west
  const E = HUB.east
  const Z = HUB.halfZ
  const iw = HUB.innerWall
  const ow = HUB.outerWall
  const F = HUB.fieldHalfWidth
  const IW = W + iw.depth // inner terrace outer edges
  const IE = E + iw.depth
  const IZ = Z + iw.depth
  const OE = IE + ow.depth // outer terrace outer edges
  const OZ = IZ + ow.depth

  // Plaza floor, running out through the west opening.
  const floorW = E + IW
  const fg = new PlaneGeometry(floorW, 2 * Z)
  const fuv = fg.attributes.uv
  for (let k = 0; k < fuv.count; k++) fuv.setXY(k, (fuv.getX(k) * floorW) / PLAZA_TILE_M, (fuv.getY(k) * 2 * Z) / PLAZA_TILE_M)
  const floorMat = new MeshStandardMaterial({ map: studTile('#cddbec', '#b3c4dc', 4), roughness: 0.8 })
  const floor = mesh(fg, floorMat, (E - IW) / 2, 0.02, 0, false)
  floor.rotation.x = -Math.PI / 2
  floor.userData.cave = 'floor'
  root.add(floor)

  // Promenade border and chevrons over the floor.
  const roadMat = new MeshStandardMaterial({ map: plazaLayoutTexture(), roughness: 0.9, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false })
  const road = mesh(new PlaneGeometry(PD.maxX - PD.minX, PD.maxZ - PD.minZ), roadMat, (PD.maxX + PD.minX) / 2, 0.04, 0, false)
  road.rotation.x = -Math.PI / 2
  root.add(road)
  root.add(buildFrozenFountain(16, 0))
  root.add(buildPlazaDecor(16, 0))
  // Inner terrace (three sides + the two west stubs either side of the opening).
  block(root, -IW, IE, -IZ, -Z, iw.height, { seed: 1 })
  block(root, -IW, IE, Z, IZ, iw.height, { seed: 5 })
  block(root, E, IE, -Z, Z, iw.height, { seed: 9 })
  block(root, -IW, -W, -Z, HUB.opening.minZ, iw.height, { seed: 13 })
  block(root, -IW, -W, HUB.opening.maxZ, Z, iw.height, { seed: 17 })
  // Outer terrace.
  block(root, -(IW + ow.depth), OE, -OZ, -IZ, ow.height, { seed: 21, collide: false })
  block(root, -(IW + ow.depth), OE, IZ, OZ, ow.height, { seed: 25, collide: false })
  block(root, IE, OE, -IZ, IZ, ow.height, { seed: 29, collide: false })

  // The outer terrace's outward faces are buried in the mountain range (buildMountains), so they get no cliff rocks.
  const OW = IW + ow.depth

  // Canyon walls either side of the field, the far end wall, and the vine bridge.
  const end = HUB.fieldEnd
  // The side walls are gone: the mountain range (buildMountains) rises straight from the field edges.
  // Invisible colliders keep the player and camera on the field.
  const sideX0 = end - 16
  addCollider((sideX0 - IW) / 2, -F - 3, -IW - sideX0, 6, 60)
  addCollider((sideX0 - IW) / 2, F + 3, -IW - sideX0, 6, 60)
  block(root, end - 16, end, -F, F, 26, { seed: 49 })
  cliffFace(root, { face: 'w', fixed: end - 16, from: -F, to: F, height: 26, seed: 66 })

  const bridgeX = end + 18
  const stone = studMat(C.stone, '#a9bccd')
  root.add(mesh(worldBox(6, 2.2, 2 * F + 4), stone, bridgeX, 15, 0))
  const vine = studMat(C.topA, C.topB, 1)
  for (let z = -F + 1; z < F; z += 1.4) {
    const len = 2 + Math.abs(Math.sin(z * 1.7)) * 5
    root.add(mesh(worldBox(0.5, len, 0.5), vine, bridgeX + 2.6, 14 - len / 2, z, false))
  }

  // Terrace-top dressing.
  // A village on the outer terrace top: cottages, fences and lamps facing the plaza.
  const northX0 = -(IW + ow.depth) + 4
  const village = buildVillage(ow.height + 0.1, [
    { ox: northX0, oz: -IZ - 0.4, ry: 0, len: OE - 4 - northX0 },
    { ox: OE - 4, oz: IZ + 0.4, ry: Math.PI, len: OE - 4 - northX0 },
    { ox: IE + 0.4, oz: -IZ + 14, ry: -Math.PI / 2, len: 2 * IZ - 28 },
  ], () => {})
  village.userData.village = true // swapped for igloos under the Frost Realm (frostRealm.js)
  root.add(village)
  buildMountains(root, { end, IW, F })
  tree(root, 24, iw.height, -(Z + 4.5), 0.55, 30)
  tree(root, 52, iw.height, Z + 4.5, 0.55, 32)
  tree(root, E + 4.5, iw.height, 14, 0.55, 31)
  tree(root, E + 4.5, iw.height, -30, 0.55, 34)
  stoneCluster(root, -32, iw.height, -28, 1)
  stoneCluster(root, -32, iw.height, 28, 2)

  flushTrees(root)

  // The field's leaf piles and loose leaves live in snow.js.

  // Clouds on the sky dome.
  const cloudMat = new SpriteMaterial({ map: cloudSprite(), fog: false, depthWrite: false, transparent: true })
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.sin(i * 3.1) * 0.2
    const s = new Sprite(cloudMat)
    const r = 190 + Math.sin(i * 1.7) * 30
    s.position.set(Math.cos(a) * r, 55 + Math.abs(Math.sin(i * 2.3)) * 50, Math.sin(a) * r)
    const k = 50 + Math.abs(Math.cos(i * 1.3)) * 40
    s.scale.set(k, k / 2, 1)
    s.renderOrder = -0.5
    s.userData.cloud = true // hidden under the Frost Realm's cave roof (frostRealm.js)
    root.add(s)
  }

  return root
}
