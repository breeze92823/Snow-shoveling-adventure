// Plaza centrepiece: a three-tier stone fountain frozen mid-spray. Frosted
// basins filled with ice, frozen water arcs between tiers, icicle fringes,
// snow caps and ice crystals. Procedural; solid via one collider.
import {
  CylinderGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  OctahedronGeometry,
  LatheGeometry,
  Vector2,
} from 'three'
import { addCollider } from './colliders.js'

const stone = new MeshStandardMaterial({ color: '#b9c6d6', roughness: 0.85 })
const stoneDark = new MeshStandardMaterial({ color: '#8c9cb2', roughness: 0.9 })
const snow = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 })
const ice = new MeshStandardMaterial({ color: '#bfe9ff', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82, emissive: '#2a6a9a', emissiveIntensity: 0.18 })
const iceDeep = new MeshStandardMaterial({ color: '#7cc8f0', roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.9, emissive: '#1f5f94', emissiveIntensity: 0.25 })
const gold = new MeshStandardMaterial({ color: '#ffd23a', roughness: 0.35, metalness: 0.5 })

let seed = 11
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)

function add(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  g.add(m)
  return m
}

// Bowl profile: thick rim at the top curving down to a base, as a lathe.
function bowl(rTop, rBase, h, wall) {
  const pts = [
    new Vector2(0.001, 0),
    new Vector2(rBase, 0),
    new Vector2(rBase + (rTop - rBase) * 0.55, h * 0.45),
    new Vector2(rTop, h),
    new Vector2(rTop - wall, h),
    new Vector2(rTop - wall - 0.05, h * 0.35),
    new Vector2(0.001, h * 0.3),
  ]
  return new LatheGeometry(pts, 40)
}

// Basin = stone bowl + ice sheet + snow on the rim + icicle fringe.
function basin(g, y, rTop, rBase, h, { icicles = 24, wall = 0.45 } = {}) {
  add(g, bowl(rTop, rBase, h, wall), stone, 0, y, 0)
  add(g, new TorusGeometry(rTop - wall / 2, wall * 0.45, 8, 48), snow, 0, y + h + 0.02, 0).rotation.x = Math.PI / 2
  add(g, new CylinderGeometry(rTop - wall - 0.08, rTop - wall - 0.08, 0.1, 40), ice, 0, y + h * 0.82, 0)
  // frozen ripple rings on the ice
  for (let r = 0.4; r < rTop - wall - 0.3; r += 0.55) {
    add(g, new TorusGeometry(r, 0.025, 6, 40), iceDeep, 0, y + h * 0.82 + 0.06, 0).rotation.x = Math.PI / 2
  }
  // icicles hanging off the outside of the rim
  for (let i = 0; i < icicles; i++) {
    const a = (i / icicles) * Math.PI * 2 + rand() * 0.1
    const len = 0.35 + rand() * 0.9
    const rad = 0.06 + rand() * 0.07
    const rr = rTop + 0.02
    const c = add(g, new ConeGeometry(rad, len, 6), ice, Math.cos(a) * rr, y + h - len / 2, Math.sin(a) * rr)
    c.rotation.x = Math.PI
  }
  // snow clumps on the rim
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2
    const s = 0.2 + rand() * 0.25
    const m = add(g, new SphereGeometry(s, 10, 8), snow, Math.cos(a) * (rTop - wall / 2), y + h + 0.05, Math.sin(a) * (rTop - wall / 2))
    m.scale.y = 0.55
  }
}

// A frozen water arc: half-torus spanning from the pillar out to a lower bowl.
function arc(g, y, r, tube, angle) {
  const m = add(g, new TorusGeometry(r, tube, 8, 24, Math.PI * 0.85), ice, 0, y, 0)
  m.rotation.y = angle
  // the torus lies in XY; rotating about Y fans it around the pillar
  return m
}

export function buildFrozenFountain(cx, cz) {
  const g = new Group()
  g.position.set(cx, 0, cz)

  // stepped plinth
  add(g, new CylinderGeometry(6.4, 6.6, 0.3, 48), stoneDark, 0, 0.15, 0)
  add(g, new CylinderGeometry(6.0, 6.2, 0.3, 48), stone, 0, 0.45, 0)
  add(g, new TorusGeometry(6.1, 0.12, 6, 48), snow, 0, 0.62, 0).rotation.x = Math.PI / 2

  // tier 1: wide basin
  basin(g, 0.6, 5.4, 4.8, 0.95, { icicles: 40, wall: 0.55 })
  // stone relief posts around the rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    add(g, new CylinderGeometry(0.22, 0.28, 1.5, 8), stoneDark, Math.cos(a) * 5.15, 1.0, Math.sin(a) * 5.15)
    add(g, new SphereGeometry(0.34, 10, 8), snow, Math.cos(a) * 5.15, 1.85, Math.sin(a) * 5.15).scale.y = 0.6
  }

  // pillar 1 + tier 2 bowl
  add(g, new CylinderGeometry(0.9, 1.3, 1.6, 16), stone, 0, 1.4, 0)
  add(g, new TorusGeometry(1.15, 0.1, 6, 24), gold, 0, 1.3, 0).rotation.x = Math.PI / 2
  basin(g, 2.2, 3.0, 1.3, 0.8, { icicles: 26, wall: 0.4 })

  // pillar 2 + tier 3 bowl
  add(g, new CylinderGeometry(0.5, 0.75, 1.5, 14), stone, 0, 3.7, 0)
  basin(g, 4.35, 1.6, 0.8, 0.55, { icicles: 16, wall: 0.3 })

  // spire topped with a frozen jet: a crystal column fanning into a splash
  add(g, new CylinderGeometry(0.22, 0.34, 2.4, 12), ice, 0, 5.8, 0)
  add(g, new SphereGeometry(0.5, 14, 10), iceDeep, 0, 7.0, 0)
  add(g, new SphereGeometry(0.14, 10, 8), gold, 0, 7.6, 0)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const len = 1.1 + (i % 2) * 0.5
    const c = add(g, new ConeGeometry(0.12, len, 6), ice, Math.cos(a) * 0.55, 6.7 + len * 0.3, Math.sin(a) * 0.55)
    c.rotation.set(Math.sin(a) * 0.65, 0, -Math.cos(a) * 0.65)
  }

  // frozen water arcs spilling from the top bowl to the middle tier, and from
  // the middle tier to the wide basin
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const m1 = add(g, new TorusGeometry(0.8, 0.09, 6, 16, Math.PI), iceDeep, Math.cos(a) * 1.9, 4.2, Math.sin(a) * 1.9)
    m1.rotation.set(0, -a, 0)
    const m2 = add(g, new TorusGeometry(1.1, 0.12, 6, 16, Math.PI), ice, Math.cos(a + 0.2) * 3.5, 1.9, Math.sin(a + 0.2) * 3.5)
    m2.rotation.set(0, -a - 0.2, 0)
  }

  // ice crystals growing from the big basin's frozen surface
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2
    const r = 1.8 + rand() * 2.6
    const s = 0.2 + rand() * 0.35
    const c = add(g, new OctahedronGeometry(s), iceDeep, Math.cos(a) * r, 1.65 + s, Math.sin(a) * r)
    c.scale.y = 2 + rand() * 1.5
    c.rotation.y = rand() * Math.PI
  }

  // drifts of snow banked against the plinth
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2
    const s = 0.5 + rand() * 0.5
    add(g, new SphereGeometry(s, 12, 8), snow, Math.cos(a) * 6.5, 0.1, Math.sin(a) * 6.5).scale.y = 0.45
  }

  g.userData.fountain = true // removed under the Frost Realm (frostRealm.js)
  g.userData.colliders = [addCollider(cx, cz, 11.6, 11.6, 3)]
  return g
}
