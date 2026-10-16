// The diggable snow field: a heightfield (ported from Dig-sand-adventure's dig lane). Every vertex
// carries a "dug" fraction (0 = full snow, 1 = dug out). Holding the dig button carves the 2.5 m
// block in front of the player; the snow there drops to a packed-snow floor. A block is a solid
// wall until it is dug through, harder zones (higher Luck) dig slower. Blocks are grouped into the
// same 6 m piles as before (piles.js): when a pile's blocks are dug the loot underneath is
// revealed (onPileCleared). Heights live in one CPU array; only the vertices around the dig spot
// are rewritten, so the cost is flat however long the field is.
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshStandardMaterial, Points, ShaderMaterial } from 'three'
import { DIG, SNOW } from './config.js'
import { addPusher } from './colliders.js'
import { blowerPower, clearSpeedMultiplier, reachMultiplier } from './state.js'
import { buildPiles, zoneAt, zoneHp, ZONE_COUNT } from './piles.js'

const Z = SNOW.zones
const P = SNOW.piles
const S = DIG.cell
const B = DIG.block
const BS = B * S
const TOP = DIG.topHeight
const X0 = Z.edges[Z.edges.length - 1] // far end (west)
const X1 = Z.edges[0] // hub end (east)
const Z0 = -SNOW.halfZ - 1
const NX = Math.round((X1 - X0) / S)
const NZ = Math.round((2 * (SNOW.halfZ + 1)) / S)
const STRIDE = NX + 1
const NBX = Math.ceil(NX / B)
const NBZ = Math.ceil(NZ / B)
const OPEN_BX = NBX - Math.round(SNOW.zones.edgeTaper / BS) // block columns from here on (hub side) are open ground
const IOPEN = OPEN_BX * B // first vertex column of the open strip

const smooth = (t) => t * t * (3 - 2 * t)
const frac = (x) => x - Math.floor(x)
const hash = (i, j) => frac(Math.sin(i * 127.1 + j * 311.7) * 43758.5453)
function vnoise(x, z) {
  const i = Math.floor(x)
  const j = Math.floor(z)
  const fx = smooth(x - i)
  const fz = smooth(z - j)
  const a = hash(i, j) + (hash(i + 1, j) - hash(i, j)) * fx
  const b = hash(i, j + 1) + (hash(i + 1, j + 1) - hash(i, j + 1)) * fx
  return a + (b - a) * fz
}

export function createDigField(scene, quality = 1) {
  const group = new Group()
  group.name = 'digField'
  scene.add(group)

  const dug = new Float32Array(STRIDE * (NZ + 1))
  const base = new Float32Array(dug.length) // undug height of every vertex
  const height = new Float32Array(dug.length)
  const n = dug.length
  const pos = new Float32Array(n * 3)
  const nrm = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)

  // Zone snow colour of every column (the palette's most tinted entry) and the dug-floor colour.
  const snowCol = []
  const floorCol = []
  const floorBase = new Color(DIG.floorColor)
  for (let zi = 0; zi < ZONE_COUNT; zi++) {
    const pal = Z.palettes[Math.min(zi, Z.palettes.length - 1)]
    snowCol.push(new Color(pal[4 % pal.length]))
    floorCol.push(floorBase.clone().lerp(new Color(pal[4 % pal.length]), 0.25))
  }
  const colX = new Uint8Array(STRIDE) // zone of each vertex column
  for (let i = 0; i <= NX; i++) colX[i] = zoneAt(X0 + i * S)

  // Rolling mounds on the undug snow: three octaves of value noise, -0.5..0.5 (0 on open ground).
  const lump = new Float32Array(dug.length)
  const dipCol = new Color(DIG.dipColor)
  const LS = DIG.lumpScale
  for (let j = 0; j <= NZ; j++) {
    for (let i = 0; i <= NX; i++) {
      const k = j * STRIDE + i
      if (i < IOPEN) {
        const x = (X0 + i * S) / LS
        const z = (Z0 + j * S) / LS
        lump[k] = vnoise(x, z) * 0.62 + vnoise(x * 2.7, z * 2.7) * 0.26 + vnoise(x * 6.5, z * 6.5) * 0.12 - 0.5
      }
      base[k] = i >= IOPEN ? 0 : TOP + lump[k] * DIG.lumpAmp
      height[k] = base[k]
      pos.set([X0 + i * S, base[k], Z0 + j * S], k * 3)
      nrm.set([0, 1, 0], k * 3)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('normal', new BufferAttribute(nrm, 3))
  geo.setAttribute('color', new BufferAttribute(col, 3))
  const idx = new Uint32Array(NX * NZ * 6)
  let ii = 0
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * STRIDE + i
      const c = a + STRIDE
      idx.set([a, c, a + 1, a + 1, c, c + 1], ii)
      ii += 6
    }
  }
  geo.setIndex(new BufferAttribute(idx, 1))
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  // Procedural surface detail from the surface itself: blue-grey strata on steep cut walls, a faint stud
  // pattern on the exposed floor, and a few static glints on the undug snow.
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPos = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPos;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 fn = normalize(cross(dFdx(vPos), dFdy(vPos)));
        float wall = smoothstep(0.25, 0.7, 1.0 - abs(fn.y));
        float band = sin(vPos.y * ${DIG.strataBand.toFixed(2)} + sin(vPos.x * 3.1 + vPos.z * 2.3) * 0.8);
        float layer = smoothstep(0.5, 0.95, band);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.76, 0.95), wall * ${DIG.strataTint.toFixed(2)} * (0.4 + 0.6 * layer));
        float flr = (1.0 - smoothstep(0.12, 0.3, vPos.y)) * (1.0 - wall);
        float sd = length(fract(vPos.xz / 0.5) - 0.5);
        diffuseColor.rgb *= 1.0 - flr * 0.12 * smoothstep(0.18, 0.24, sd) * smoothstep(0.34, 0.28, sd);
        diffuseColor.rgb *= 1.0 + flr * 0.05 * smoothstep(0.24, 0.16, sd);
        float gl = fract(sin(dot(floor(vPos.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
        diffuseColor.rgb += step(1.0 - ${DIG.sparkle.toFixed(4)}, gl) * (1.0 - flr) * (1.0 - wall) * 0.22;`,
      )
  }
  const mesh = new Mesh(geo, mat)
  // The open strip and dug pits sit at y ~ 0, coplanar with the world ground plane: bias the field toward the camera so they don't z-fight.
  mesh.receiveShadow = quality > 0.5
  mesh.frustumCulled = false
  group.add(mesh)

  const h = (i, j) => height[Math.min(NZ, Math.max(0, j)) * STRIDE + Math.min(NX, Math.max(0, i))]
  const tmp = new Color()
  function writeVertex(i, j) {
    const k = j * STRIDE + i
    const nx = (h(i - 1, j) - h(i + 1, j)) / (2 * S)
    const nz = (h(i, j - 1) - h(i, j + 1)) / (2 * S)
    const len = Math.hypot(nx, 1, nz)
    const d = dug[k]
    const t = smooth(d)
    const dark = 1 - DIG.pitShade * Math.sin(Math.PI * Math.min(1, d)) // deeper, shadowed mid-dig
    const zi = colX[i]
    const jit = 0.95 + 0.05 * hash(i, j)
    // Dips shade toward cool lavender-blue, mound tops brighten; both fade as the spot is dug out.
    const lp = lump[k]
    tmp.copy(snowCol[zi]).lerp(dipCol, Math.max(0, -lp * 2) * DIG.dipTint * (1 - t)).lerp(floorCol[zi], t)
    tmp.multiplyScalar(dark * (i >= IOPEN ? 1 : jit * (1 + 0.06 * Math.max(0, lp * 2) * (1 - t))))
    const v = k * 3
    pos[v + 1] = height[k]
    nrm[v] = nx / len
    nrm[v + 1] = 1 / len
    nrm[v + 2] = nz / len
    col[v] = tmp.r
    col[v + 1] = tmp.g
    col[v + 2] = tmp.b
  }
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) writeVertex(i, j)

  function flag(j0, j1) {
    for (const name of ['position', 'normal', 'color']) {
      const a = geo.attributes[name]
      a.clearUpdateRanges?.()
      a.addUpdateRange?.(j0 * STRIDE * 3, (j1 - j0 + 1) * STRIDE * 3)
      a.needsUpdate = true
    }
  }
  flag(0, NZ)

  // --- Piles: the unit that drops loot. A pile is cleared once all but `clearAt` of its blocks are dug.
  const cells = new Float32Array(NX * NZ)
  for (let jj = 0; jj < NZ; jj++) {
    for (let i = 0; i < NX; i++) {
      const x = X0 + (i + 0.5) * S
      const edge = Math.min(1, Math.max(0, (X1 - x) / 6))
      cells[jj * NX + i] = 0.7 * smooth(edge)
    }
  }
  const { list: pileList, pileOf } = buildPiles(X0, Z0, NX, NZ, S, cells)
  const blockPile = new Int16Array(NBX * NBZ).fill(-1)
  const pileBlocks = new Uint16Array(pileList.length)
  for (let bj = 0; bj < NBZ; bj++) {
    for (let bi = 0; bi < OPEN_BX; bi++) {
      const ci = Math.min(NX - 1, bi * B + (B >> 1))
      const cj = Math.min(NZ - 1, bj * B + (B >> 1))
      const p = pileOf[cj * NX + ci]
      blockPile[bj * NBX + bi] = p
      pileBlocks[p]++
    }
  }
  for (const p of pileList) if (!pileBlocks[p.id]) p.fullness = 0 // nothing to dig: never drops loot
  const pileNeed = Uint16Array.from(pileBlocks, (c) => (c ? Math.max(1, Math.floor(c * (1 - P.clearAt))) : 0))
  const pileDug = new Uint16Array(pileList.length)
  const pileDone = new Uint8Array(pileList.length)
  const blockDone = new Uint8Array(NBX * NBZ)
  const clearedListeners = new Set()
  let dirty = false

  // --- Undug snow is a wall: a block stops the player until it has been dug through.
  const blocked = (bi, bj) => {
    if (bi >= OPEN_BX) return false
    let sum = 0
    let cnt = 0
    for (let j = Math.max(1, bj * B); j <= Math.min(NZ - 1, (bj + 1) * B); j++) {
      for (let i = Math.max(1, bi * B); i <= Math.min(NX - 1, (bi + 1) * B); i++) {
        sum += dug[j * STRIDE + i]
        cnt++
      }
    }
    return cnt > 0 && sum / cnt < DIG.passDug
  }
  addPusher((p, r) => {
    if (p.x < X0 - r || p.x > X1 + r || p.z < Z0 - r || p.z > Z0 + NZ * S + r) return
    const i0 = Math.max(0, Math.floor((p.x - r - X0) / BS))
    const i1 = Math.min(NBX - 1, Math.floor((p.x + r - X0) / BS))
    const j0 = Math.max(0, Math.floor((p.z - r - Z0) / BS))
    const j1 = Math.min(NBZ - 1, Math.floor((p.z + r - Z0) / BS))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (!blocked(i, j)) continue
        const minX = X0 + i * BS
        const maxX = Math.min(X1, minX + BS)
        const minZ = Z0 + j * BS
        const maxZ = Math.min(Z0 + NZ * S, minZ + BS)
        const cx = Math.max(minX, Math.min(p.x, maxX))
        const cz = Math.max(minZ, Math.min(p.z, maxZ))
        const dx = p.x - cx
        const dz = p.z - cz
        const d2 = dx * dx + dz * dz
        if (d2 >= r * r) continue
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2)
          p.x = cx + (dx / d) * r
          p.z = cz + (dz / d) * r
        } else {
          // Centre inside the block (a frame hitch or a jump tunnelled in): leave by the nearest
          // face, not always the hub side, or the player is flung back through the whole field.
          const toW = p.x - minX
          const toE = maxX - p.x
          const toN = p.z - minZ
          const toS = maxZ - p.z
          const m = Math.min(toW, toE, toN, toS)
          if (m === toW) p.x = minX - r
          else if (m === toE) p.x = maxX + r
          else if (m === toN) p.z = minZ - r
          else p.z = maxZ + r
        }
      }
    }
  })

  // Surface height under (x, z), 0 off the field. Bilinear, like the rendered mesh.
  function heightAt(x, z) {
    const fx = (x - X0) / S
    const fz = (z - Z0) / S
    if (fx < 0 || fx > NX || fz < 0 || fz > NZ) return 0
    const i = Math.min(NX - 1, Math.floor(fx))
    const j = Math.min(NZ - 1, Math.floor(fz))
    const tx = fx - i
    const tz = fz - j
    const a = height[j * STRIDE + i] * (1 - tx) + height[j * STRIDE + i + 1] * tx
    const b = height[(j + 1) * STRIDE + i] * (1 - tx) + height[(j + 1) * STRIDE + i + 1] * tx
    return a * (1 - tz) + b * tz
  }

  // --- Snow spray: pooled points with per-particle colour / size / alpha.
  const N = Math.max(200, Math.round(DIG.particles * Math.min(1, quality + 0.25)))
  const ppos = new Float32Array(N * 3).fill(-1000)
  const pvel = new Float32Array(N * 3)
  const pcol = new Float32Array(N * 3)
  const psize = new Float32Array(N)
  const palpha = new Float32Array(N)
  const plife = new Float32Array(N)
  const pgrav = new Float32Array(N).fill(14)
  const pa0 = new Float32Array(N).fill(1)
  const pmax = new Float32Array(N).fill(1)
  const pgeo = new BufferGeometry()
  pgeo.setAttribute('position', new BufferAttribute(ppos, 3))
  pgeo.setAttribute('pcolor', new BufferAttribute(pcol, 3))
  pgeo.setAttribute('psize', new BufferAttribute(psize, 1))
  pgeo.setAttribute('palpha', new BufferAttribute(palpha, 1))
  const spray = new Points(
    pgeo,
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute vec3 pcolor; attribute float psize; attribute float palpha;
        varying vec3 vC; varying float vA; varying float vS;
        void main() {
          vC = pcolor; vA = palpha; vS = step(0.5, psize);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * 520.0 / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA; varying float vS;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          if (r > 1.0) discard;
          float soft = mix(1.0 - r * r * 0.4, (1.0 - r) * (1.0 - r), vS);
          gl_FragColor = vec4(vC * (1.0 - 0.15 * r), vA * soft);
          #include <colorspace_fragment>
        }`,
    }),
  )
  spray.frustumCulled = false
  group.add(spray)
  let nextP = 0
  let live = 0
  const gc = new Color()
  // Snow colour at (x, z): the zone's snow, shaded toward its floor by how dug the spot is.
  function grainColor(x, z) {
    const i = Math.min(NX, Math.max(0, Math.round((x - X0) / S)))
    const j = Math.min(NZ, Math.max(0, Math.round((z - Z0) / S)))
    const zi = colX[i]
    return gc.copy(snowCol[zi]).lerp(floorCol[zi], Math.min(1, dug[j * STRIDE + i] * 0.5 + Math.random() * 0.2))
  }
  function emit(x, y, z, power, color, big = 1) {
    const k = nextP++ % N
    const a = Math.random() * Math.PI * 2
    const sp = (0.8 + Math.random() * 1.6) * power
    ppos.set([x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6], k * 3)
    pvel.set([Math.cos(a) * sp, 2.2 + Math.random() * 2.4 * power, Math.sin(a) * sp], k * 3)
    const shade = 0.92 + Math.random() * 0.12
    pcol.set([color.r * shade, color.g * shade, color.b * shade], k * 3)
    psize[k] = (0.07 + Math.random() * 0.12) * big
    pgrav[k] = 14
    pa0[k] = 1
    palpha[k] = 1
    pmax[k] = plife[k] = 0.5 + Math.random() * 0.5
    live = N
  }
  // A big soft powder cloud: slow, drifting, billowing outward over the whole block.
  function emitDust(cx, cz, y, color, spread, lift = 1) {
    const k = nextP++ % N
    const px = cx + (Math.random() - 0.5) * 2 * spread
    const pz = cz + (Math.random() - 0.5) * 2 * spread
    const dx = px - cx
    const dz = pz - cz
    const out = 0.5 + Math.random() * 0.9
    ppos.set([px, y + 0.1 + Math.random() * 0.3, pz], k * 3)
    pvel.set([dx * out + (Math.random() - 0.5) * 0.4, (0.7 + Math.random() * 1.1) * lift, dz * out + (Math.random() - 0.5) * 0.4], k * 3)
    const lt = 0.95 + Math.random() * 0.1
    pcol.set([Math.min(1, color.r * lt + 0.05), Math.min(1, color.g * lt + 0.05), Math.min(1, color.b * lt + 0.05)], k * 3)
    psize[k] = 0.9 + Math.random() * 1.1
    pgrav[k] = -0.2
    pa0[k] = DIG.dustAlpha
    palpha[k] = DIG.dustAlpha
    pmax[k] = plife[k] = DIG.dustLife * (0.7 + Math.random() * 0.5)
    live = N
  }
  function burst(x, z, count, power, big) {
    const y = heightAt(x, z)
    const c = grainColor(x, z)
    for (let q = 0; q < count; q++) emit(x, y + 0.15, z, power, c, big)
    for (let q = 0; q < Math.ceil(count / 3); q++) emitDust(x, z, y, c, BS * 0.5, 1.2)
  }

  let sprayAcc = 0
  let dustAcc = 0
  const spot = { x: 0, z: 0, active: false }
  let removing = false // this frame the shovel is actually taking snow (field block or training mound)

  // Digs the whole block at (tx, tz): every vertex of it sinks together, opening one square pit.
  function dig(dt, tx, tz) {
    const bi = Math.floor((tx - X0) / BS)
    const bj = Math.floor((tz - Z0) / BS)
    if (bi < 0 || bj < 0 || bi >= OPEN_BX || bj >= NBZ) return
    const bk = bj * NBX + bi
    const pile = blockPile[bk]
    if (pile < 0) return
    const zi = pileList[pile].zone
    // Pile clear time ~ hp / power, split over the pile's blocks.
    const speed = (blowerPower() * clearSpeedMultiplier() * pileBlocks[pile] * DIG.speedScale) / zoneHp(zi)
    const i0 = bi * B
    const i1 = Math.min(NX, (bi + 1) * B)
    const j0 = bj * B
    const j1 = Math.min(NZ, (bj + 1) * B)
    const cellX = X0 + (bi + 0.5) * BS
    const cellZ = Z0 + (bj + 0.5) * BS
    let changed = false
    for (let j = Math.max(1, j0); j <= Math.min(NZ - 1, j1); j++) {
      for (let i = Math.max(1, i0); i <= Math.min(NX - 1, i1); i++) {
        const k = j * STRIDE + i
        if (dug[k] >= 1) continue
        dug[k] = Math.min(1, dug[k] + speed * dt)
        height[k] = base[k] - (base[k] - DIG.floor) * smooth(dug[k])
        changed = true
      }
    }
    if (!changed) return
    removing = true
    dirty = true
    spot.x = cellX
    spot.z = cellZ
    spot.active = true
    // Normals depend on the neighbours, so rewrite one ring more than was dug.
    for (let j = Math.max(0, j0 - 1); j <= Math.min(NZ, j1 + 1); j++) {
      for (let i = Math.max(0, i0 - 1); i <= Math.min(NX, i1 + 1); i++) writeVertex(i, j)
    }
    flag(Math.max(0, j0 - 1), Math.min(NZ, j1 + 1))
    sprayAcc += dt * DIG.sprayRate
    const y = heightAt(cellX, cellZ)
    const c = grainColor(cellX, cellZ)
    while (sprayAcc >= 1) {
      sprayAcc -= 1
      emit(cellX + (Math.random() - 0.5) * BS, y + 0.1, cellZ + (Math.random() - 0.5) * BS, 1.6, c)
    }
    dustAcc += dt * DIG.dustRate
    while (dustAcc >= 1) {
      dustAcc -= 1
      emitDust(cellX, cellZ, y, c, BS * 0.5)
    }
    // Block finished: one big burst, and the pile may be done.
    if (!blockDone[bk] && !blocked(bi, bj)) {
      blockDone[bk] = 1
      burst(cellX, cellZ, DIG.doneBurst, 2.2, 1.6)
      pileDug[pile]++
      if (!pileDone[pile] && pileDug[pile] >= pileNeed[pile]) {
        pileDone[pile] = 1
        for (const fn of clearedListeners) fn(pileList[pile])
      }
    }
  }

  const targets = []
  const reachTarget = { x: 0, z: 0 }
  return {
    group,
    piles: pileList,
    get dirty() {
      return dirty
    },
    heightAt,

    // A free-standing diggable pile (the training mounds): { x, y, z, radius, locked?(), blow(w, wx, wz, dt, bp) }.
    addTarget(t) {
      targets.push(t)
    },

    // fn(pile) the moment a pile has been dug out.
    onPileCleared(fn) {
      clearedListeners.add(fn)
      return () => clearedListeners.delete(fn)
    },

    // Where the shovel last bit (for the hit puff), or null.
    get spot() {
      return spot.active ? spot : null
    },

    // A small snow puff where the blade hit / threw.
    puff(x, z) {
      burst(x, z, DIG.puffCount, 1.6, 1)
    },

    // The whole field regrows: every block is back at full height.
    reset() {
      dug.fill(0)
      height.set(base)
      blockDone.fill(0)
      pileDug.fill(0)
      pileDone.fill(0)
      dirty = false
      spot.active = false
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) writeVertex(i, j)
      flag(0, NZ)
    },

    // True while the shovel is actually removing snow (a block being dug or a mound being hit).
    get removing() {
      return removing
    },

    update(dt, digging, player) {
      removing = false
      if (digging) {
        const reach = DIG.reach * reachMultiplier()
        reachTarget.x = player.position.x + Math.sin(player.facing) * reach
        reachTarget.z = player.position.z + Math.cos(player.facing) * reach
        dig(dt, reachTarget.x, reachTarget.z)
        // A training mound within reach flutters under the shovel.
        const bp = blowerPower()
        for (const tg of targets) {
          if (tg.locked?.()) continue
          const dx = tg.x - reachTarget.x
          const dz = tg.z - reachTarget.z
          if (dx * dx + dz * dz < (tg.radius + 0.6) ** 2) {
            tg.blow(1, dx, dz, dt, bp)
            removing = true
          }
        }
      }
      if (live === 0) return
      let any = false
      for (let k = 0; k < N; k++) {
        if (plife[k] <= 0) continue
        plife[k] -= dt
        palpha[k] = pa0[k] * Math.min(1, plife[k] / (pmax[k] * 0.5))
        any = true
        pvel[k * 3 + 1] -= pgrav[k] * dt
        if (pgrav[k] < 0) {
          const dr = Math.max(0, 1 - 1.6 * dt)
          pvel[k * 3] *= dr
          pvel[k * 3 + 1] *= dr
          pvel[k * 3 + 2] *= dr
        }
        ppos[k * 3] += pvel[k * 3] * dt
        ppos[k * 3 + 1] += pvel[k * 3 + 1] * dt
        ppos[k * 3 + 2] += pvel[k * 3 + 2] * dt
        if (plife[k] <= 0) ppos[k * 3 + 1] = -1000
      }
      pgeo.attributes.position.needsUpdate = true
      pgeo.attributes.palpha.needsUpdate = true
      pgeo.attributes.pcolor.needsUpdate = true
      pgeo.attributes.psize.needsUpdate = true
      if (!any) live = 0
    },
  }
}
