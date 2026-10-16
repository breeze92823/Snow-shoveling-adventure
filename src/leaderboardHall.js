// The Leaderboards hall against the hub's north wall: a three-step stone platform, a big blue
// studded "Leaderboards" banner on two pillars, four carved boards fanned toward the plaza (top 10,
// a gold YOU row, a refresh countdown) with lamp posts between them, and each board's #1 player
// dancing on a plinth beside it (topPlayerStatue.js). Solid things register colliders; the boards
// repaint whenever net.js delivers a fresh leaderboard. Tunables: LEADER_HALL in config.js.
import {
  BoxGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
} from 'three'
import { addCollider } from './colliders.js'
import { HUB_COLORS as C, LEADER_HALL as H } from './config.js'
import { drawText, panel } from './labels.js'
import { mesh, studMat, worldBox } from './hub.js'
import { net, onLeaderboard } from './net.js'
import { shortMoney, state } from './state.js'
import { plankTexture, shade, toTexture } from './textures.js'
import { createTopPlayerStatue } from './topPlayerStatue.js'

const BOARD_W = 6.2 // carved frame
const BOARD_H = 7.5
const FACE_W = 5.2 // painted face inside it (640 x 800 px)
const FACE_H = 6.5
const BASE_H = 0.5 // the stone foot the frame sits on
const ROWS = 10
const rankFill = ['#ffd84a', '#d8e2ee', '#e89a5a']

// Per board: server key (net.js / backend unchanged), title, the board's colours and your own value.
const BOARDS = [
  { key: 'power', title: 'Power', short: 'POWER', fill: ['#ffe48a', '#f6a21a'], own: () => state.power },
  { key: 'rebirths', title: 'Rebirth', short: 'REBIRTH', fill: ['#ff9a9a', '#e2222a'], own: () => state.rebirths },
  { key: 'leaves', title: 'Snow Cleared', short: 'SNOW', fill: ['#e6f6ff', '#6cc4f2'], own: () => state.leaves },
  { key: 'level', title: 'Level', short: 'LEVEL', fill: ['#a8e4ff', '#1f9bff'], own: () => state.level },
]

const std = (color, extra = {}) => new MeshStandardMaterial({ color, roughness: 0.8, ...extra })
const facing = (x, z, tx, tz) => Math.atan2(tx - x, tz - z)

// Platform and steps: stone sides, snowy top (BoxGeometry face order +x -x +y -y +z -z).
function stoneBox(parent, x0, x1, z0, z1, top, { collide = true } = {}) {
  const side = studMat(C.stone, '#a9bccd')
  const snow = studMat(C.topA, C.topB)
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  parent.add(mesh(worldBox(w, top, d), [side, side, snow, side, side, side], cx, top / 2, cz))
  if (collide) addCollider(cx, cz, w, d, top)
}

// A frosted terrace block with a snow cap, like the hub walls.
function frostBlock(parent, x0, x1, z0, z1, y0, top) {
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  parent.add(mesh(worldBox(w, top - y0, d), studMat(C.wallA, C.wallB), cx, (y0 + top) / 2, cz))
  parent.add(mesh(worldBox(w + 0.5, 0.5, d + 0.5), studMat(C.topA, C.topB), cx, top - 0.05, cz))
  addCollider(cx, cz, w, d, top, 0, y0)
}

// --- Banner -------------------------------------------------------------------------------

function paintBanner(g, w, h) {
  const cell = h / 4
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < Math.ceil(w / cell); c++) {
      const base = (r + c) % 2 ? '#2f8ff2' : '#1f78dc'
      g.fillStyle = base
      g.fillRect(c * cell, r * cell, cell, cell)
      for (let sx = 0; sx < 2; sx++) {
        for (let sy = 0; sy < 2; sy++) {
          const x = c * cell + cell * (0.27 + sx * 0.46)
          const y = r * cell + cell * (0.27 + sy * 0.46)
          g.lineWidth = 5
          g.strokeStyle = shade(base, 0.25)
          g.beginPath()
          g.arc(x, y, cell * 0.14, Math.PI * 0.75, Math.PI * 1.75)
          g.stroke()
          g.strokeStyle = shade(base, -0.2)
          g.beginPath()
          g.arc(x, y, cell * 0.14, Math.PI * 1.75, Math.PI * 2.75)
          g.stroke()
        }
      }
    }
  }
  g.strokeStyle = '#0a2f9e'
  g.lineWidth = 36
  g.strokeRect(18, 18, w - 36, h - 36)
  g.strokeStyle = '#3d7bff'
  g.lineWidth = 6
  g.strokeRect(42, 42, w - 84, h - 84)
  drawText(g, 'Leaderboards', w / 2, h / 2 + 8, { px: 215, fill: ['#ffffff', '#e6f1ff'], stroke: '#0a2166', strokeW: 14 })
}

function buildBanner(parent, cx, top) {
  const width = 26
  const height = 5.2
  const g = new Group()
  g.position.set(cx, top + 12.4, H.z0 + 1.7)
  g.rotation.x = 0.1 // leans down toward the plaza
  parent.add(g)
  g.add(mesh(new BoxGeometry(width + 0.4, height + 0.4, 0.9), std('#0b3fb0'), 0, 0, 0))
  const face = panel(2080, 416, paintBanner, { width, height })
  face.object.position.z = 0.47
  g.add(face.object)
  g.add(mesh(new BoxGeometry(width + 0.7, 0.35, 1.2), std('#f4faff'), 0, height / 2 + 0.3, 0)) // snow on top
}

// --- Lamp posts ---------------------------------------------------------------------------

const lampMats = {}
function lamp(parent, x, z, top) {
  const m = (lampMats.m ??= {
    orange: studMat('#ff8a1c', '#f27a10', 1),
    dark: std('#5b3416'),
    glow: new MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffb84a', emissiveIntensity: 1.3, roughness: 0.4 }),
    snow: std('#f4faff', { roughness: 0.9 }),
    stone: studMat(C.stone, '#a9bccd', 1),
  })
  const g = new Group()
  g.position.set(x, top, z)
  parent.add(g)
  g.add(mesh(worldBox(1.1, 0.5, 1.1, 2), m.stone, 0, 0.25, 0))
  g.add(mesh(worldBox(0.7, 3.4, 0.7, 2), m.orange, 0, 2.2, 0))
  g.add(mesh(new BoxGeometry(0.9, 0.22, 0.9), m.dark, 0, 2.0, 0))
  g.add(mesh(new BoxGeometry(1.0, 0.4, 1.0), m.orange, 0, 4.05, 0))
  g.add(mesh(new BoxGeometry(0.8, 1.1, 0.8), m.glow, 0, 4.8, 0, false))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new BoxGeometry(0.1, 1.2, 0.1), m.dark, sx * 0.42, 4.8, sz * 0.42, false))
  g.add(mesh(new BoxGeometry(1.0, 0.16, 1.0), m.dark, 0, 5.45, 0))
  g.add(mesh(new BoxGeometry(1.1, 0.22, 1.1), m.snow, 0, 5.62, 0))
  addCollider(x, z, 1.0, 1.0, top + 6)
}

// --- Boards -------------------------------------------------------------------------------

let emblemTex = null
function emblem() {
  if (!emblemTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    g.translate(64, 64)
    g.strokeStyle = '#ffd24a'
    g.lineCap = 'round'
    g.lineWidth = 9
    for (let i = 0; i < 6; i++) {
      g.save()
      g.rotate((i * Math.PI) / 3)
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, -52)
      g.moveTo(0, -30)
      g.lineTo(-15, -44)
      g.moveTo(0, -30)
      g.lineTo(15, -44)
      g.stroke()
      g.restore()
    }
    emblemTex = toTexture(c, { repeat: false })
  }
  return emblemTex
}

const boardMats = {}
function boardParts() {
  return (boardMats.p ??= {
    frame: new MeshStandardMaterial({ map: plankTexture('#d9741a'), roughness: 0.8 }),
    back: std(C.boardWood),
    stone: std('#36425a'),
    gold: new MeshStandardMaterial({ color: '#e6a817', roughness: 0.4, metalness: 0.35 }),
    snow: std('#f4faff', { roughness: 0.9 }),
    ice: new MeshStandardMaterial({ color: '#e6f7ff', emissive: '#9ad7ff', emissiveIntensity: 0.25, transparent: true, opacity: 0.92, roughness: 0.2 }),
    crest: (() => {
      const s = new Shape()
      s.moveTo(-BOARD_W / 2, 0)
      s.lineTo(BOARD_W / 2, 0)
      s.lineTo(1.6, 1.3)
      s.lineTo(-1.6, 1.3)
      s.closePath()
      return new ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false })
    })(),
    icicle: new ConeGeometry(0.11, 0.55, 6),
    emblem: new MeshBasicMaterial({ map: emblem(), transparent: true, depthWrite: false }),
  })
}

function paintBoard(g, w, h, spec, rows, mine, ownValue) {
  g.fillStyle = '#3b1d10'
  g.fillRect(0, 0, w, h)
  g.strokeStyle = '#6a3a1d'
  g.lineWidth = 6
  g.strokeRect(10, 10, w - 20, h - 20)
  drawText(g, `${spec.title} Leaderboard`, w / 2, 56, { px: 44, fill: spec.fill, stroke: '#1a0c06', strokeW: 4 })

  g.fillStyle = 'rgba(255,255,255,0.08)'
  g.fillRect(24, 96, w - 48, 40)
  const head = { px: 24, fill: '#e0c08c', stroke: '#1a0c06', strokeW: 2.5, shadow: false }
  drawText(g, 'Rank', 40, 117, { ...head, align: 'left' })
  drawText(g, 'Player', 150, 117, { ...head, align: 'left' })
  drawText(g, 'Amount', w - 40, 117, { ...head, align: 'right' })

  for (let i = 0; i < ROWS; i++) {
    const y = 172 + i * 49
    const r = rows[i]
    if (i % 2 === 0) {
      g.fillStyle = 'rgba(255,255,255,0.05)'
      g.fillRect(24, y - 24, w - 48, 48)
    }
    if (r && r.id === mine) {
      g.fillStyle = 'rgba(122,255,74,0.25)'
      g.fillRect(24, y - 24, w - 48, 48)
      g.strokeStyle = '#7aff4a'
      g.lineWidth = 3
      g.strokeRect(24, y - 24, w - 48, 48)
    }
    const text = { px: 28, stroke: '#1a0c06', strokeW: 3, shadow: false }
    if (!r) {
      drawText(g, `#${i + 1}`, 40, y, { ...text, fill: 'rgba(255,255,255,0.28)', align: 'left' })
      drawText(g, '- - -', 150, y, { ...text, fill: 'rgba(255,255,255,0.28)', align: 'left' })
      continue
    }
    const me = r.id === mine
    const name = String(r.name ?? 'Player')
    const max = me ? 10 : 15
    drawText(g, `#${i + 1}`, 40, y, { ...text, fill: me ? '#7aff4a' : rankFill[i] ?? '#e8d8c4', align: 'left' })
    drawText(g, `${name.length > max ? `${name.slice(0, max - 1)}…` : name}${me ? ' (You)' : ''}`, 150, y, { ...text, fill: me ? '#7aff4a' : '#ffffff', align: 'left' })
    drawText(g, shortMoney(Number(r.value) || 0), w - 40, y, { ...text, fill: '#ffffff', align: 'right' })
  }

  // Your own row, always shown, even outside the top 10.
  const rank = rows.findIndex((r) => r.id === mine)
  const bar = g.createLinearGradient(0, 668, 0, 724)
  bar.addColorStop(0, '#ffd84a')
  bar.addColorStop(1, '#f0a817')
  g.fillStyle = bar
  g.fillRect(24, 666, w - 48, 58)
  g.strokeStyle = '#7a4a00'
  g.lineWidth = 3
  g.strokeRect(24, 666, w - 48, 58)
  const you = { px: 30, fill: '#3a1d10', stroke: null, shadow: false }
  drawText(g, rank >= 0 ? `#${rank + 1}` : net.connected ? `${ROWS}+` : '-', 40, 696, { ...you, align: 'left' })
  drawText(g, 'YOU', 150, 696, { ...you, align: 'left' })
  drawText(g, shortMoney(Math.max(0, Math.floor(ownValue))), w - 40, 696, { ...you, align: 'right' })
}

function paintTabs(g, w, h) {
  ;[['Daily', false], ['Weekly', false], ['All Time', true]].forEach(([label, on], i) => {
    const y = 14 + i * 94
    g.fillStyle = on ? '#f0b429' : '#a85a1e'
    g.fillRect(8, y, w - 8, 80)
    g.strokeStyle = '#3b1d10'
    g.lineWidth = 6
    g.strokeRect(8, y, w - 8, 80)
    drawText(g, label, w / 2 + 4, y + 42, { px: 38, fill: on ? '#3a1d10' : '#ffe6c2', stroke: on ? null : '#3b1d10', strokeW: 3, shadow: false })
  })
}

// Builds one board at (x, z) turned `yaw`; returns { setRows, repaint, setFooter }.
function buildBoard(parent, spec, x, z, yaw, top) {
  const P = boardParts()
  const g = new Group()
  g.position.set(x, top, z)
  g.rotation.y = yaw
  parent.add(g)

  const cy = BASE_H + BOARD_H / 2
  g.add(mesh(new BoxGeometry(BOARD_W + 0.3, BASE_H, 1.0), P.stone, 0, BASE_H / 2, 0))
  g.add(mesh(new BoxGeometry(3.2, 0.12, 0.5), P.gold, 0, BASE_H + 0.06, 0.65)) // gold plaque on the foot
  g.add(mesh(new BoxGeometry(BOARD_W + 0.3, BOARD_H + 0.3, 0.3), P.back, 0, cy, -0.2))
  g.add(mesh(worldBox(BOARD_W, BOARD_H, 0.5, 3), P.frame, 0, cy, 0))
  // peaked crest with a gold snowflake, snow on its slopes, icicles under the top rail
  const crest = new Mesh(P.crest, P.frame)
  crest.position.set(0, BASE_H + BOARD_H, -0.25)
  crest.castShadow = true
  g.add(crest)
  const crestY = BASE_H + BOARD_H
  const emblemMesh = new Mesh(new PlaneGeometry(1.0, 1.0), P.emblem)
  emblemMesh.position.set(0, crestY + 0.65, 0.27)
  g.add(emblemMesh)
  g.add(mesh(new BoxGeometry(3.4, 0.22, 0.7), P.snow, 0, crestY + 1.35, 0))
  for (const s of [-1, 1]) {
    const slope = mesh(new BoxGeometry(2.1, 0.2, 0.7), P.snow, s * 2.33, crestY + 0.7, 0)
    slope.rotation.z = -s * 0.68
    g.add(slope)
  }
  g.add(mesh(new BoxGeometry(BOARD_W + 0.2, 0.2, 0.7), P.snow, 0, crestY + 0.02, 0))
  for (const ix of [-2.7, -1.9, -0.8, 0.9, 2.0, 2.8]) {
    const ice = mesh(P.icicle, P.ice, ix, crestY - 0.25 + (Math.abs(ix) % 0.3) * 0.5, 0.27, false)
    ice.rotation.x = Math.PI
    g.add(ice)
  }

  // the painted face
  let rows = []
  let ownValue = 0
  const face = panel(640, 800, (c, w, h) => paintBoard(c, w, h, spec, rows, net.sessionId, ownValue), { width: FACE_W, height: FACE_H })
  face.object.position.set(0, cy, 0.27)
  g.add(face.object)

  // Daily / Weekly / All Time tabs on the left edge (visual only: the backend has one period)
  const tabs = panel(256, 300, paintTabs, { width: 1.5, height: 1.76 })
  tabs.object.position.set(-BOARD_W / 2 - 0.55, 2.7, 0.15)
  tabs.object.rotation.y = 0.5
  g.add(tabs.object)

  // "Refreshes in m:ss" under the YOU row
  let footer = ''
  const foot = panel(360, 48, (c, w, h) => drawText(c, footer, w / 2, h / 2, { px: 30, fill: '#e0c08c', stroke: '#1a0c06', strokeW: 3, shadow: false }), { height: 0.3, width: 2.25 })
  foot.object.position.set(0, cy - FACE_H / 2 + 0.34, 0.28)
  g.add(foot.object)

  addCollider(x, z, BOARD_W + 0.3, 1.0, top + BASE_H + BOARD_H + 1.4, yaw)
  return {
    setRows(next, own) {
      rows = next
      ownValue = own
      face.repaint()
    },
    setOwn(own) {
      ownValue = own
      face.repaint()
    },
    setFooter(text) {
      footer = text
      foot.repaint()
    },
  }
}

// --- Assembly -----------------------------------------------------------------------------

export function buildLeaderboardHall(parent) {
  const root = new Group()
  parent.add(root)
  const { x0, x1, z0, z1, height: top } = H
  const cx = (x0 + x1) / 2

  // platform and three wide steps down to the plaza
  const rise = top / 3
  stoneBox(root, x0 - 1.2, x1 + 1.2, z0, z1 + 2 * H.stepDepth, rise)
  stoneBox(root, x0 - 0.6, x1 + 0.6, z0, z1 + H.stepDepth, rise * 2)
  stoneBox(root, x0, x1, z0, z1, top)

  // frosted terraced backdrop: low ledge along the wall plus a tower at each end
  frostBlock(root, x0 + 3, x1 - 3, z0, z0 + 1.2, top, top + 4.2)
  frostBlock(root, x0, x0 + 3, z0, z0 + 4, top, top + 7)
  frostBlock(root, x1 - 3, x1, z0, z0 + 4, top, top + 7)

  // boards on a gentle arc, each turned partway toward the plaza centre
  const entries = BOARDS.map((spec, i) => {
    const bx = cx + (i - (BOARDS.length - 1) / 2) * H.boardSpacing
    const bz = H.boardZ + H.boardCurve * (bx - cx) ** 2
    const yaw = facing(bx, bz, cx, -8) * H.boardFan
    const board = buildBoard(root, spec, bx, bz, yaw, top)
    const S = H.statue
    const sx = bx + S.dx * Math.cos(yaw) + S.dz * Math.sin(yaw)
    const sz = bz - S.dx * Math.sin(yaw) + S.dz * Math.cos(yaw)
    const statue = createTopPlayerStatue(root, { key: spec.key, title: spec.short, fill: spec.fill, position: { x: sx, y: top, z: sz }, yaw })
    addCollider(sx, sz, S.plinthRadius * 2 + 0.2, S.plinthRadius * 2 + 0.2, top + 6)
    return { spec, board, statue, x: bx, z: bz }
  })
  entries.forEach(({ x, z }, i) => {
    if (i === entries.length - 1) return
    const next = entries[i + 1]
    lamp(root, x + 6.6, (z + next.z) / 2 + 1.2, top)
  })

  // banner on two pillars standing in the first and third gaps
  const pillar = studMat(C.stone, '#a9bccd', 1)
  const snow = studMat(C.topA, C.topB)
  for (const px of [cx - H.boardSpacing * 1.5 + H.boardSpacing / 2, cx + H.boardSpacing / 2 + H.boardSpacing]) {
    root.add(mesh(worldBox(1.4, 12, 1.4, 2), pillar, px, top + 6, z0 + 1.7))
    root.add(mesh(new BoxGeometry(1.8, 0.3, 1.8), snow, px, top + 12.1, z0 + 1.7))
    addCollider(px, z0 + 1.7, 1.4, 1.4, top + 12)
  }
  buildBanner(root, cx, top)

  // live data
  let lastArrival = performance.now()
  const own = (spec) => Math.max(0, Math.floor(Number(spec.own()) || 0))
  const apply = (boards) => {
    for (const e of entries) {
      const rows = (boards[e.spec.key] ?? []).slice(0, ROWS)
      e.board.setRows(rows, own(e.spec))
      e.statue.setTop(rows[0])
    }
  }
  onLeaderboard((boards) => {
    lastArrival = performance.now()
    apply(boards)
  })

  let sinceCheck = 0
  let ownSig = ''
  let footerText = ''
  return {
    update(dt) {
      for (const e of entries) e.statue.update(dt)
      sinceCheck += dt
      if (sinceCheck < 0.5) return
      sinceCheck = 0
      // your own row follows your live stats, between server refreshes
      const sig = entries.map((e) => own(e.spec)).join('|')
      if (sig !== ownSig) {
        ownSig = sig
        entries.forEach((e) => e.board.setOwn(own(e.spec)))
      }
      const left = Math.max(0, Math.ceil(H.refreshSeconds - (performance.now() - lastArrival) / 1000))
      const text = net.connected ? `Refreshes in 0:${String(left).padStart(2, '0')}` : 'Offline'
      if (text !== footerText) {
        footerText = text
        entries.forEach((e) => e.board.setFooter(text))
      }
    },
  }
}
