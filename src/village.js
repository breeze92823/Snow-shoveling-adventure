// A snowy village on the top of the outer terrace: timber-framed cottages with
// glowing windows and snow-laden roofs, chimneys with smoke, picket fences,
// lamp posts, wells and paths. Everything is merged per material (a handful of
// draw calls for the whole village) and purely decorative (no colliders).
import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const mat = (color, roughness = 0.9, extra = {}) => new MeshStandardMaterial({ color, roughness, ...extra })
const M = {
  snow: mat('#ffffff', 0.95),
  stone: mat('#8d9aab'),
  stoneLight: mat('#b6c2d0'),
  beam: mat('#5b3a22'),
  wood: mat('#9b6338'),
  woodLight: mat('#c18a52'),
  iron: mat('#2f3744', 0.5, { metalness: 0.5 }),
  glass: mat('#ffd98a', 0.4, { emissive: '#ffb84a', emissiveIntensity: 0.9 }),
  lamp: mat('#fff1b8', 0.4, { emissive: '#ffd266', emissiveIntensity: 1.2 }),
  path: mat('#9fb0c4'),
  smoke: mat('#e9eef4', 1, { transparent: true, opacity: 0.55 }),
  water: mat('#8fd2ff', 0.1, { transparent: true, opacity: 0.85 }),
}
const WALLS = ['#f2e4c8', '#e8c9a0', '#cfe0ee', '#e9b8b0', '#d7e6c4', '#f0d58c']
const ROOFS = ['#b5473a', '#3f6aa8', '#6b4a8a', '#2f7a5a', '#a8683a']

let seed = 5
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)

// Gathers geometry per material (transforms baked in), merged by build().
function collector() {
  const groups = new Map()
  const q = new Quaternion()
  const e = new Euler()
  let base = new Matrix4()
  return {
    setBase(x, y, z, ry) {
      base = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(0, ry, 0)), new Vector3(1, 1, 1))
    },
    // geo in strip-local space at (x, y, z) with yaw ry, then moved by the strip base.
    put(m, geo, x, y, z, ry = 0) {
      const local = new Matrix4().compose(new Vector3(x, y, z), q.setFromEuler(e.set(0, ry, 0)), new Vector3(1, 1, 1))
      const g = geo.index ? geo.toNonIndexed() : geo
      g.applyMatrix4(local.premultiply(base))
      if (!groups.has(m)) groups.set(m, [])
      groups.get(m).push(g)
    },
    box(m, w, h, d, x, y, z, ry = 0) {
      this.put(m, new BoxGeometry(w, h, d), x, y, z, ry)
    },
    build() {
      const out = new Group()
      for (const [m, gs] of groups) {
        const mesh = new Mesh(mergeGeometries(gs), m)
        mesh.castShadow = true
        mesh.receiveShadow = true
        out.add(mesh)
      }
      return out
    },
  }
}

// Triangular roof prism running along x: base width d (z), height rh, length L.
function prism(d, rh, L) {
  const s = new Shape()
  s.moveTo(-d / 2, 0)
  s.lineTo(d / 2, 0)
  s.lineTo(0, rh)
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: L, bevelEnabled: false })
  g.translate(0, 0, -L / 2)
  g.rotateY(Math.PI / 2)
  return g
}

// Framed glowing window on a wall facing yaw ry (0 = +z, PI/2 = +x).
function window_(c, x, y, z, ry, w = 1.3, h = 1.3) {
  const nx = Math.sin(ry), nz = Math.cos(ry)
  c.box(M.beam, w + 0.3, h + 0.3, 0.12, x, y, z, ry)
  c.box(M.glass, w, h, 0.12, x + nx * 0.04, y, z + nz * 0.04, ry)
  c.box(M.beam, w, 0.08, 0.14, x + nx * 0.06, y, z + nz * 0.06, ry)
  c.box(M.beam, 0.08, h, 0.14, x + nx * 0.06, y, z + nz * 0.06, ry)
  c.box(M.snow, w + 0.5, 0.14, 0.4, x + nx * 0.12, y - h / 2 - 0.15, z + nz * 0.12, ry)
}

function house(c, x, z) {
  const w = 6 + rand() * 2.2
  const d = 5 + rand() * 1.2
  const wh = 3.5 + rand() * 1.0
  const rh = 2.6 + rand() * 0.8
  const wall = mat(WALLS[(rand() * WALLS.length) | 0])
  const roof = mat(ROOFS[(rand() * ROOFS.length) | 0])
  c.box(M.stone, w + 0.4, 0.5, d + 0.4, x, 0.25, z)
  c.box(wall, w, wh, d, x, 0.5 + wh / 2, z)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.box(M.beam, 0.35, wh, 0.35, x + (sx * w) / 2, 0.5 + wh / 2, z + (sz * d) / 2)
  c.box(M.beam, w + 0.1, 0.25, d + 0.1, x, 0.5 + wh * 0.55, z) // mid band
  // coloured roof prism under a thicker snow prism
  const ov = 0.7
  c.put(roof, prism(d + ov * 2, rh, w + 1.2), x, 0.5 + wh - 0.05, z)
  c.put(M.snow, prism(d + ov * 2 + 0.3, rh + 0.45, w + 1.0), x, 0.5 + wh + 0.1, z)
  // front (+z): door, lantern, two windows; one window on each side
  const fz = z + d / 2 + 0.06
  c.box(M.wood, 1.3, 2.3, 0.18, x, 0.5 + 1.15, fz)
  c.box(M.beam, 1.6, 0.2, 0.22, x, 0.5 + 2.4, fz)
  c.box(M.iron, 0.12, 0.12, 0.1, x + 0.4, 1.5, fz + 0.12)
  c.box(M.snow, 1.9, 0.18, 0.9, x, 0.57, z + d / 2 + 0.5) // step
  c.box(M.lamp, 0.25, 0.35, 0.25, x + 1.2, 3.0, fz + 0.15)
  window_(c, x - w * 0.3, 0.5 + wh * 0.58, fz, 0)
  window_(c, x + w * 0.3, 0.5 + wh * 0.58, fz, 0)
  window_(c, x + w / 2 + 0.06, 0.5 + wh * 0.58, z, Math.PI / 2)
  window_(c, x - w / 2 - 0.06, 0.5 + wh * 0.58, z, -Math.PI / 2)
  // chimney + smoke
  const cx = x + w * 0.22, cz = z - d * 0.15, cy = 0.5 + wh + rh * 0.55
  c.box(M.stoneLight, 1.0, 2.6, 1.0, cx, cy + 1.0, cz)
  c.box(M.snow, 1.3, 0.25, 1.3, cx, cy + 2.4, cz)
  for (let i = 0; i < 3; i++) c.put(M.smoke, new SphereGeometry(0.4 + i * 0.22, 8, 6), cx + i * 0.35, cy + 3.2 + i * 0.9, cz)
  // path from the door to the fence
  c.box(M.path, 1.7, 0.08, 4.2, x, 0.04, z + d / 2 + 2.3)
}

function well(c, x, z) {
  c.put(M.stone, new CylinderGeometry(1.3, 1.4, 1.1, 16), x, 0.55, z)
  c.put(M.water, new CylinderGeometry(1.0, 1.0, 0.05, 16), x, 1.0, z)
  c.put(M.snow, new CylinderGeometry(1.35, 1.35, 0.12, 16), x, 1.15, z)
  for (const sx of [-1, 1]) c.box(M.beam, 0.2, 2.6, 0.2, x + sx * 1.15, 1.9, z)
  c.box(M.beam, 2.8, 0.15, 0.15, x, 2.9, z)
  c.put(M.wood, prism(2.0, 0.9, 3.0), x, 3.0, z)
  c.put(M.snow, prism(2.1, 1.1, 2.8), x, 3.12, z)
  c.put(M.iron, new CylinderGeometry(0.28, 0.28, 0.4, 10), x, 2.2, z)
}

function lamp(c, x, z) {
  c.put(M.iron, new CylinderGeometry(0.1, 0.14, 3.6, 8), x, 1.8, z)
  c.box(M.iron, 0.6, 0.12, 0.6, x, 3.65, z)
  c.box(M.lamp, 0.45, 0.6, 0.45, x, 3.98, z)
  c.box(M.snow, 0.75, 0.2, 0.75, x, 4.4, z)
}

function fence(c, x0, x1, z, gaps) {
  for (let x = x0; x <= x1; x += 0.9) {
    if (gaps.some((g) => Math.abs(x - g) < 1.5)) continue
    c.box(M.woodLight, 0.18, 1.1, 0.12, x, 0.55, z)
    c.box(M.snow, 0.22, 0.1, 0.16, x, 1.15, z)
  }
  c.box(M.woodLight, x1 - x0, 0.1, 0.08, (x0 + x1) / 2, 0.4, z - 0.02)
  c.box(M.woodLight, x1 - x0, 0.1, 0.08, (x0 + x1) / 2, 0.8, z - 0.02)
}

// strips: [{ ox, oz, ry, len }]: origin on the terrace's inner edge, local +x along it,
// local +z toward the plaza. tree(x, z, scale, seed) plants a tree at a world position.
export function buildVillage(y, strips, tree) {
  const c = collector()
  let ti = 0
  for (const s of strips) {
    c.setBase(s.ox, y, s.oz, s.ry)
    const cos = Math.cos(s.ry), sin = Math.sin(s.ry)
    const world = (lx, lz) => [s.ox + lx * cos + lz * sin, s.oz - lx * sin + lz * cos]
    const doors = []
    for (let lx = 6, i = 0; lx < s.len - 4; lx += 12, i++) {
      if (i % 5 === 3) {
        well(c, lx, -6)
        lamp(c, lx - 3, -2)
        lamp(c, lx + 3, -2)
      } else {
        house(c, lx, -6.2)
        doors.push(lx)
        if (i % 2 === 0) lamp(c, lx + 6, -1.6)
      }
    }
    fence(c, 0, s.len, -0.9, doors)
    // snowy trees at the back of the terrace
    for (let lx = 3; lx < s.len; lx += 13) {
      const [wx, wz] = world(lx + rand() * 4, -11.5 - rand() * 1.5)
      tree(wx, wz, 0.7 + rand() * 0.3, 60 + ti++)
    }
  }
  return c.build()
}
