// The Frost Realm: the world behind the Worlds portal (unlocked at WORLD_PORTAL.unlockLevel). It is the
// same hub, stands, training mounds and diggable field, so every system works unchanged; entering
// re-themes it as an ice cavern: a cave roof with icicles over the hub and a snow tunnel over the field,
// glowing crystals on the ledges, cold dim light, dark fog and ice sparkles in place of snowfall.
// Tunables in FROST_REALM (config.js). props.js offers the portal's E prompt.
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  RepeatWrapping,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FROST_REALM as R, HUB, COLORS, LIGHT } from './config.js'
import { addCollider, moveCollider, setColliderActive } from './colliders.js'
import { mesh as hubMesh, studMat, worldBox } from './hub.js'
import { resetPlayer } from './player.js'
import { syncYawToPlayer } from './camera.js'
import { notify, toast } from './state.js'

export const realm = { active: false }

let request = null // set by createFrostRealm: (toRealm) => void
export const enterFrostRealm = () => request?.(true)
export const leaveFrostRealm = () => request?.(false)

const rand = (seed) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

// Cave roof, side walls, icicles and crystals; hidden until the realm is entered.
function buildCave() {
  const g = new Group()
  g.visible = false
  const r = R.roof
  const rock = studMat(r.color, '#232d4a', 2)
  const W = HUB.west + HUB.innerWall.depth + HUB.outerWall.depth // hub's west edge (outer terrace)
  const E = HUB.east + HUB.innerWall.depth + HUB.outerWall.depth + 14
  const Z = HUB.halfZ + HUB.innerWall.depth + HUB.outerWall.depth + 26 // clear of the canyon's outer cliffs too
  const FZ = Z
  const end = HUB.fieldEnd - 40
  const slab = (x0, x1, y0, y1, z0, z1) => {
    const m = hubMesh(worldBox(x1 - x0, y1 - y0, z1 - z0), rock, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, false)
    m.receiveShadow = false
    g.add(m)
  }
  // Hub chamber: roof + back walls.
  slab(-W, E, r.hubY, r.hubY + 3, -Z, Z)
  slab(E, E + 3, 0, r.hubY + 3, -Z, Z)
  slab(-W, E, 0, r.hubY, -Z - 3, -Z)
  slab(-W, E, 0, r.hubY, Z, Z + 3)
  // Step up from the hub roof to the tunnel roof.
  slab(-W - 3, -W, r.hubY, r.fieldY + 3, -FZ, FZ)
  // Snow tunnel over the field.
  slab(end, -W - 3, r.fieldY, r.fieldY + 3, -FZ, FZ)
  slab(end, -W - 3, 0, r.fieldY, -FZ - 3, -FZ)
  slab(end, -W - 3, 0, r.fieldY, FZ, FZ + 3)
  slab(end - 3, end, 0, r.fieldY + 3, -FZ - 3, FZ + 3)

  const glow = new Color(R.crystalColor)
  const m4 = new Matrix4()
  const q = new Quaternion()
  const e = new Euler()
  const p = new Vector3()
  const s = new Vector3()

  // Icicles: cones pointing down from the roof (base at y 0, tip at y -1, scaled per instance).
  const icicleGeo = new ConeGeometry(1, 1, 6).rotateX(Math.PI).translate(0, -0.5, 0)
  const icicleMat = new MeshStandardMaterial({ color: '#d8f2ff', emissive: glow, emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.1 })
  const icicles = new InstancedMesh(icicleGeo, icicleMat, R.icicles)
  const ri = rand(911)
  for (let i = 0; i < R.icicles; i++) {
    const overHub = ri() < 0.45
    const x = overHub ? -W + ri() * (E + W) : end + ri() * (-W - end)
    const z = (ri() * 2 - 1) * (overHub ? Z : FZ)
    const len = 2.5 + ri() * 7
    const rad = 0.4 + ri() * 0.7
    m4.compose(p.set(x, overHub ? r.hubY : r.fieldY, z), q.setFromEuler(e.set(0, ri() * 6, 0)), s.set(rad, len, rad))
    icicles.setMatrixAt(i, m4)
  }
  g.add(icicles)

  // Crystals: tilted glowing spikes in clusters on the terrace tops and the tunnel ledges.
  const crystalGeo = new ConeGeometry(1, 1, 5).translate(0, 0.5, 0)
  const crystalMat = new MeshStandardMaterial({ color: '#c8f6ff', emissive: glow, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.05 })
  const crystals = new InstancedMesh(crystalGeo, crystalMat, R.crystals)
  crystals.castShadow = true
  const iw = HUB.innerWall
  const F = HUB.fieldHalfWidth
  const ledges = [
    // [x0, x1, z0, z1, y]
    [-HUB.west - iw.depth, HUB.east, -HUB.halfZ - iw.depth + 1, -HUB.halfZ - 1, iw.height],
    [-HUB.west - iw.depth, HUB.east, HUB.halfZ + 1, HUB.halfZ + iw.depth - 1, iw.height],
    [HUB.east + 1, HUB.east + iw.depth - 1, -HUB.halfZ, HUB.halfZ, iw.height],
    [HUB.fieldEnd + 10, -W, -F - 2.5, -F - 0.5, 0.5],
    [HUB.fieldEnd + 10, -W, F + 0.5, F + 2.5, 0.5],
  ]
  const rc = rand(4242)
  for (let i = 0; i < R.crystals; ) {
    const [x0, x1, z0, z1, y] = ledges[i % ledges.length]
    const cx = x0 + rc() * (x1 - x0)
    const cz = z0 + rc() * (z1 - z0)
    const n = 3 + ((rc() * 3) | 0)
    for (let k = 0; k < n && i < R.crystals; k++, i++) {
      const h = 1.5 + rc() * 3.5
      const w = 0.35 + rc() * 0.4
      const tilt = k === 0 ? 0 : 0.25 + rc() * 0.45
      const yaw = rc() * Math.PI * 2
      m4.compose(p.set(cx + (rc() - 0.5) * 1.6, y, cz + (rc() - 0.5) * 1.6), q.setFromEuler(e.set(tilt, yaw, 0, 'YXZ')), s.set(w, h, w))
      crystals.setMatrixAt(i, m4)
    }
  }
  g.add(crystals)
  return g
}

// Painted rock for the cave walls and floor: dark blue-grey blotches, frost flecks, hairline cracks.
function rockTexture(base, light, seed, px = 256) {
  const r = rand(seed)
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')
  g.fillStyle = base
  g.fillRect(0, 0, px, px)
  for (let i = 0; i < 70; i++) {
    const x = r() * px
    const y = r() * px
    const rad = 14 + r() * 40
    for (const ox of [-px, 0, px]) {
      for (const oy of [-px, 0, px]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad)
        gr.addColorStop(0, r() < 0.5 ? 'rgba(0,0,10,0.28)' : `${light}55`)
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gr
        g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2)
      }
    }
  }
  g.strokeStyle = 'rgba(5,8,25,0.55)'
  g.lineWidth = 1.2
  for (let i = 0; i < 14; i++) {
    let x = r() * px
    let y = r() * px
    g.beginPath()
    g.moveTo(x, y)
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.5) * 50
      y += (r() - 0.3) * 40
      g.lineTo(x, y)
    }
    g.stroke()
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(190,235,255,0.55)' : 'rgba(120,200,255,0.4)'
    g.fillRect(r() * px, r() * px, 1 + r() * 2, 1 + r() * 2)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

// Realm-only dressing that replaces the hub's trees and cottages and fills the cave: glowing
// ice-crystal trees (planted where the trees stand), igloos (where the cottages stand), an aurora
// curtain under the roof, hanging lanterns and drifting wisps. The stalls and mounds are untouched.
function buildDecor(hubRoot) {
  const g = new Group()
  g.visible = false
  const glow = new Color(R.crystalColor)
  const m4 = new Matrix4()
  const q = new Quaternion()
  const e = new Euler()
  const p = new Vector3()
  const s = new Vector3()

  // Ice trees: one merged crystal cluster (tall spike + two leaning ones), instanced at the tree spots.
  const spots = []
  const seen = new Set()
  hubRoot.traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.tree) return
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m4)
      p.setFromMatrixPosition(m4)
      const key = `${p.x.toFixed(1)},${p.z.toFixed(1)}`
      if (seen.has(key)) continue
      seen.add(key)
      spots.push({ x: p.x, y: p.y, z: p.z, k: new Vector3().setFromMatrixScale(m4).x })
    }
  })
  const spike = (r, h, x, z, tx, tz) => new ConeGeometry(r, h, 5).translate(0, h / 2, 0).rotateX(tz).rotateZ(tx).translate(x, 0, z)
  const treeGeo = mergeGeometries([spike(1.1, 13, 0, 0, 0, 0), spike(0.8, 8, 1.2, 0.4, -0.35, 0.1), spike(0.7, 6.5, -1, -0.6, 0.4, -0.2)])
  const treeMat = new MeshStandardMaterial({ color: '#bdeeff', emissive: glow, emissiveIntensity: 0.7, roughness: 0.18, metalness: 0.05, flatShading: true })
  const trees = new InstancedMesh(treeGeo, treeMat, Math.max(1, spots.length))
  trees.castShadow = true
  spots.forEach((t, i) => {
    m4.compose(p.set(t.x, t.y, t.z), q.setFromEuler(e.set(0, i * 1.9, 0)), s.setScalar(Math.max(0.5, t.k * 0.85)))
    trees.setMatrixAt(i, m4)
  })
  trees.count = spots.length
  g.add(trees)

  // Crystal monolith where the fountain stood: a tall glowing cluster on a rock base (solid while the realm is on).
  const spikeAt = (r, h, x, z, tx, tz) => new ConeGeometry(r, h, 6).translate(0, h / 2, 0).rotateX(tz).rotateZ(tx).translate(x, 0.5, z)
  const monoGeo = mergeGeometries([
    spikeAt(1.5, 15, 0, 0, 0, 0),
    spikeAt(1.1, 10, 2, 0.8, -0.4, 0.15),
    spikeAt(1.0, 9, -1.8, -1.2, 0.45, -0.25),
    spikeAt(0.8, 7, 0.6, -2.2, 0.2, -0.5),
    spikeAt(0.8, 6, -0.8, 2.3, -0.15, 0.5),
    spikeAt(0.6, 5, 2.6, -1.4, -0.5, -0.3),
  ])
  const mono = new Mesh(monoGeo, new MeshStandardMaterial({ color: '#bdeeff', emissive: glow, emissiveIntensity: 0.9, roughness: 0.15, flatShading: true }))
  mono.castShadow = true
  mono.position.set(R.center.x, 0, R.center.z)
  const base = new Mesh(new CylinderGeometry(3.6, 4.2, 0.6, 9), new MeshStandardMaterial({ color: '#3a466a', roughness: 0.9, flatShading: true }))
  base.position.set(R.center.x, 0.3, R.center.z)
  base.receiveShadow = true
  g.add(base, mono)
  const monoBox = addCollider(R.center.x, R.center.z, 5, 5, 4)
  setColliderActive(monoBox, false)

  // Igloos along the three terrace strips the village uses.
  const ow = HUB.outerWall
  const IW = HUB.west + HUB.innerWall.depth
  const IE = HUB.east + HUB.innerWall.depth
  const IZ = HUB.halfZ + HUB.innerWall.depth
  const OE = IE + ow.depth
  const northX0 = -(IW + ow.depth) + 4
  const strips = [
    { ox: northX0, oz: -IZ - 0.4, ry: 0, len: OE - 4 - northX0 },
    { ox: OE - 4, oz: IZ + 0.4, ry: Math.PI, len: OE - 4 - northX0 },
    { ox: IE + 0.4, oz: -IZ + 14, ry: -Math.PI / 2, len: 2 * IZ - 28 },
  ]
  const domeGeo = new SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  const iceMat = new MeshStandardMaterial({ color: '#d6efff', roughness: 0.35, emissive: '#2a6ab0', emissiveIntensity: 0.35, flatShading: true })
  const doorMat = new MeshBasicMaterial({ color: '#7fe8ff' })
  const doorGeo = new CircleGeometry(1.3, 12)
  for (const st of strips) {
    const cos = Math.cos(st.ry)
    const sin = Math.sin(st.ry)
    for (let lx = 6, i = 0; lx < st.len - 4; lx += 12, i++) {
      const lz = -6.2
      const ig = new Group()
      ig.position.set(st.ox + lx * cos + lz * sin, ow.height + 0.1, st.oz - lx * sin + lz * cos)
      ig.rotation.y = st.ry
      ig.scale.setScalar(0.85 + (i % 3) * 0.15)
      const dome = new Mesh(domeGeo, iceMat)
      dome.castShadow = true
      const door = new Mesh(doorGeo, doorMat)
      door.position.set(0, 1.3, 4.0)
      ig.add(dome)
      ig.add(door)
      g.add(ig)
    }
  }

  // Rock bulges jutting from the plaza walls above head height, so the hub's boxy terraces read as a cave.
  const rockMat = new MeshStandardMaterial({ map: rockTexture('#2a3552', '#7fa0d8', 5, 128), roughness: 0.95, flatShading: true })
  const ROCKS = 170
  const rocks = new InstancedMesh(new IcosahedronGeometry(1, 0), rockMat, ROCKS)
  rocks.castShadow = true
  const rr = rand(31337)
  const nz = HUB.halfZ
  const faces = [
    // [fixed axis, fixed coord, normal toward plaza, range start, range end]
    ['z', -nz, 1, -36, 66],
    ['z', nz, -1, -36, 66],
    ['x', HUB.east, -1, -nz, nz],
    ['x', -HUB.west, 1, -nz, -14],
    ['x', -HUB.west, 1, 14, nz],
  ]
  for (let i = 0; i < ROCKS; i++) {
    const [axis, fixed, n, a0, a1] = faces[i % faces.length]
    const along = a0 + rr() * (a1 - a0)
    const out = fixed + n * (0.2 + rr() * 0.9)
    const y = 4.2 + rr() * 4.2
    p.set(axis === 'z' ? along : out, y, axis === 'z' ? out : along)
    q.setFromEuler(e.set(rr() * 3, rr() * 3, rr() * 3))
    m4.compose(p, q, s.set(0.9 + rr() * 1.8, 0.7 + rr() * 1.3, 0.9 + rr() * 1.6))
    rocks.setMatrixAt(i, m4)
  }
  g.add(rocks)

  // Lanterns on chains from the hub roof.
  const lanternGeo = new SphereGeometry(0.55, 8, 6)
  const lanternMat = new MeshBasicMaterial({ color: '#9ef2ff' })
  const chainGeo = new CylinderGeometry(0.05, 0.05, 1, 4).translate(0, -0.5, 0)
  const chainMat = new MeshBasicMaterial({ color: '#40527a' })
  const N = 46
  const lanterns = new InstancedMesh(lanternGeo, lanternMat, N)
  const chains = new InstancedMesh(chainGeo, chainMat, N)
  const rl = rand(77)
  for (let i = 0; i < N; i++) {
    const x = -30 + rl() * 100
    const z = (rl() * 2 - 1) * 60
    const drop = 8 + rl() * 12
    chains.setMatrixAt(i, m4.compose(p.set(x, R.roof.hubY, z), q.identity(), s.set(1, drop, 1)))
    lanterns.setMatrixAt(i, m4.compose(p.set(x, R.roof.hubY - drop - 0.4, z), q.identity(), s.set(1, 1, 1)))
  }
  g.add(lanterns, chains)

  // Aurora curtains: soft vertical ribbons under the hub roof, pulsing in colour and drift.
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const cg = c.getContext('2d')
  const grad = cg.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, 'rgba(120,255,200,0)')
  grad.addColorStop(0.35, 'rgba(120,255,210,0.55)')
  grad.addColorStop(0.7, 'rgba(150,120,255,0.35)')
  grad.addColorStop(1, 'rgba(150,120,255,0)')
  cg.fillStyle = grad
  cg.fillRect(0, 0, 4, 128)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const auroraMat = new MeshBasicMaterial({ map: tex, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, fog: false })
  const curtains = []
  for (let i = 0; i < 5; i++) {
    const m = new Mesh(new PlaneGeometry(130, 18, 1, 1), auroraMat)
    m.position.set(20 + (i - 2) * 6, 33, (i - 2) * 22)
    m.rotation.y = 0.25 + i * 0.35
    g.add(m)
    curtains.push(m)
  }

  // Wisps: small glowing orbs drifting around the plaza.
  const WN = 36
  const wisps = new InstancedMesh(new SphereGeometry(0.22, 6, 5), new MeshBasicMaterial({ color: '#b8fbff' }), WN)
  g.add(wisps)

  const update = (t) => {
    curtains.forEach((m, i) => {
      m.position.x = 20 + (i - 2) * 6 + Math.sin(t * 0.15 + i) * 8
      m.scale.x = 1 + Math.sin(t * 0.2 + i * 2) * 0.12
    })
    auroraMat.opacity = 0.65 + Math.sin(t * 0.7) * 0.25
    for (let i = 0; i < WN; i++) {
      const a = i * 2.399 + t * (0.05 + (i % 5) * 0.012)
      const r = 10 + (i % 7) * 7
      wisps.setMatrixAt(i, m4.compose(p.set(16 + Math.cos(a) * r * 1.4, 3 + (i % 6) + Math.sin(t * 0.8 + i) * 1.2, Math.sin(a * 1.3) * r * 0.8), q.identity(), s.set(1, 1, 1)))
    }
    wisps.instanceMatrix.needsUpdate = true
  }
  return { group: g, update, monoBox }
}

// roots: the world's groups/meshes to tint (hub, props, field, bonfire, ground); hubRoot holds the clouds.
export function createFrostRealm({ scene, roots, hubRoot, stands, sky, lights, snowfall, onSwitch }) {
  const cave = buildCave()
  scene.add(cave)
  const decor = buildDecor(hubRoot)
  scene.add(decor.group)
  const swapped = [] // hub dressing hidden while the realm's replacements show
  hubRoot.traverse((o) => (o.userData.tree || o.userData.village) && swapped.push(o))

  // The hub's walls, terrace caps and plaza floor get painted rock; the dripping overhangs are hidden.
  const rock = {
    wall: new MeshStandardMaterial({ map: rockTexture('#323d5e', '#8fb0e8', 11), roughness: 0.95 }),
    cap: new MeshStandardMaterial({ map: rockTexture('#3d4a70', '#b4d2ff', 12), roughness: 0.9 }),
    floor: new MeshStandardMaterial({ map: rockTexture('#27304d', '#6f94d0', 13, 512), roughness: 0.55 }),
  }
  // The fountain and its snowmen/benches vanish and the four stands move to the realm's own ring.
  const fountainBits = []
  hubRoot.traverse((o) => o.userData.fountain && fountainBits.push(o))
  const rearrange = (on) => {
    for (const f of fountainBits) {
      f.visible = !on
      for (const b of f.userData.colliders) setColliderActive(b, !on)
    }
    setColliderActive(decor.monoBox, on)
    for (const st of stands) {
      const at = on ? R.stands[st.name] : st.home
      st.group.position.set(at.x, 0, at.z)
      st.group.rotation.y = at.rot
      moveCollider(st.box, at.x, at.z, at.rot)
      Object.assign(st.cfg, { x: at.x, z: at.z, rot: at.rot }) // the stand's prompt, window and tutorial arrow follow
    }
  }

  const caveMeshes = []
  hubRoot.traverse((o) => o.userData.cave && caveMeshes.push({ o, orig: o.material }))
  const swapRock = (on) => {
    for (const { o, orig } of caveMeshes) {
      if (o.userData.cave === 'drip') o.visible = !on
      else o.material = on ? rock[o.userData.cave] : orig
    }
  }

  const tint = new Color(R.tint)
  const saved = new Map() // material -> original colour (collected on first entry, so late-built props count)
  const collect = () => {
    for (const root of roots) {
      root.traverse((o) => {
        if (!o.isMesh) return
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m && !saved.has(m) && m.color && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) saved.set(m, m.color.clone())
        }
      })
    }
  }
  const clouds = []
  hubRoot.traverse((o) => o.isSprite && o.userData.cloud && clouds.push(o))

  const u = sky.material.uniforms
  const base = {
    zenith: u.top.value.clone(),
    horizon: u.bottom.value.clone(),
    fog: scene.fog.color.clone(),
  }

  function apply(on) {
    realm.active = on
    cave.visible = on
    decor.group.visible = on
    for (const o of swapped) o.visible = !on
    if (on) collect() // before the rock swap, so only the original materials are tinted
    swapRock(on)
    rearrange(on)
    for (const [m, c] of saved) m.color.copy(c).multiply(on ? tint : WHITE)
    for (const c of clouds) c.visible = !on
    u.top.value.set(on ? R.sky.zenith : COLORS.zenith)
    u.bottom.value.set(on ? R.sky.horizon : COLORS.horizon)
    scene.fog.color.set(on ? R.fog.color : base.fog)
    const L = on ? R.light : LIGHT
    lights.sun.color.set(L.sunColor)
    lights.sun.intensity = L.sunIntensity
    lights.hemi.color.set(L.hemiSky)
    lights.hemi.groundColor.set(L.hemiGround)
    lights.hemi.intensity = L.hemiIntensity
    snowfall.setTint(on ? R.sparkle : '#ffffff')
    snowfall.setCalm(on) // no storm in the cave
  }

  // Full-screen fade hides the swap and the teleport.
  const veil = document.createElement('div')
  Object.assign(veil.style, {
    position: 'fixed',
    inset: '0',
    background: 'radial-gradient(circle, #e8f8ff 0%, #6fb6ff 45%, #0d1630 100%)',
    opacity: '0',
    pointerEvents: 'none',
    transition: `opacity ${R.fade}s ease`,
    zIndex: '40',
  })
  document.body.appendChild(veil)

  let busy = false
  request = (toRealm) => {
    if (busy || toRealm === realm.active) return
    busy = true
    veil.style.opacity = '1'
    setTimeout(() => {
      apply(toRealm)
      resetPlayer(R.arrive, R.arriveFacing)
      syncYawToPlayer()
      onSwitch?.(toRealm)
      toast(toRealm ? `Welcome to the ${R.name}!` : 'Back in the Snow Hub')
      notify()
      veil.style.opacity = '0'
      setTimeout(() => (busy = false), R.fade * 1000)
    }, R.fade * 1000)
  }

  return {
    // After snowfall.update (which sets the fog distance): the cave keeps it close.
    update(t = 0) {
      if (!realm.active) return
      decor.update(t)
      scene.fog.far = Math.min(scene.fog.far, R.fog.far)
      scene.fog.near = Math.min(scene.fog.near, scene.fog.far * 0.4)
    },
  }
}

const WHITE = new Color('#ffffff')
