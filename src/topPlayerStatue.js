// A leaderboard's #1 player as a dancing 3D character on a plinth beside the board. The board's top
// row from the server carries that player's Bloxity avatar JSON ({ equipped, proportions, skin }),
// dressed onto the base rig exactly like remotePlayers.js. No #1 row, no avatar (guest / offline),
// bad JSON or a failed load all fall back to the default character. Never throws.
import { AdditiveBlending, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { LEADER_HALL } from './config.js'
import { realm } from './frostRealm.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { loadIcon, textLabel } from './labels.js'
import { mesh } from './hub.js'

const S = LEADER_HALL.statue

// Shared by every statue.
let shared = null
function plinthParts() {
  if (!shared) {
    shared = {
      rim: new CylinderGeometry(S.plinthRadius + 0.1, S.plinthRadius + 0.2, 0.18, 32),
      body: new CylinderGeometry(S.plinthRadius - 0.1, S.plinthRadius, S.plinthHeight - 0.18, 32),
      cap: new CylinderGeometry(S.plinthRadius - 0.2, S.plinthRadius - 0.2, 0.08, 32),
      rimMat: new MeshStandardMaterial({ color: '#f0b429', roughness: 0.45, metalness: 0.3 }),
      bodyMat: new MeshStandardMaterial({ color: '#2f3a52', roughness: 0.8 }),
      capMat: new MeshStandardMaterial({ color: '#f4faff', roughness: 0.9 }),
    }
  }
  return shared
}

// Soft radial halo, shared; each statue gets its own material so opacity can differ.
let auraGeo = null
let auraTex = null
function auraGeometry() {
  return (auraGeo ??= new PlaneGeometry(5, 7))
}
function auraMaterial(color) {
  if (!auraTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.45, 'rgba(255,255,255,0.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    auraTex = new CanvasTexture(c)
    auraTex.colorSpace = SRGBColorSpace
  }
  return new MeshBasicMaterial({ map: auraTex, color, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide })
}

// A little gold trophy, painted once and shared by the board titles and the statue labels.
let trophy = null
export function trophyIcon() {
  if (!trophy) {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    const g = c.getContext('2d')
    g.fillStyle = '#ffc21a'
    g.strokeStyle = '#6a4300'
    g.lineWidth = 5
    g.lineJoin = 'round'
    g.beginPath() // cup
    g.moveTo(26, 10)
    g.lineTo(70, 10)
    g.lineTo(66, 44)
    g.quadraticCurveTo(48, 64, 30, 44)
    g.closePath()
    g.fill()
    g.stroke()
    g.beginPath() // handles
    g.arc(24, 28, 12, Math.PI * 0.5, Math.PI * 1.5)
    g.arc(72, 28, 12, Math.PI * 1.5, Math.PI * 0.5)
    g.stroke()
    g.fillRect(43, 56, 10, 14) // stem
    g.strokeRect(43, 56, 10, 14)
    g.fillRect(30, 72, 36, 12) // base
    g.strokeRect(30, 72, 36, 12)
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.fillRect(34, 16, 6, 20)
    trophy = loadIcon(c.toDataURL('image/png'))
  }
  return trophy
}

// parent: group of the hall. position: world x/y/z of the plinth centre on the platform, yaw: the
// way the board faces (the statue looks the same way).
export function createTopPlayerStatue(parent, { key, title, fill, position, yaw }) {
  const root = new Group()
  root.position.set(position.x, position.y, position.z)
  root.rotation.y = yaw
  parent.add(root)

  const p = plinthParts()
  root.add(mesh(p.rim, p.rimMat, 0, 0.09, 0))
  root.add(mesh(p.body, p.bodyMat, 0, 0.09 + (S.plinthHeight - 0.18) / 2, 0))
  root.add(mesh(p.cap, p.capMat, 0, S.plinthHeight - 0.04, 0, false))

  const stage = new Group() // the character stands here, scaled up a touch
  stage.position.y = S.plinthHeight
  stage.scale.setScalar(S.scale)
  root.add(stage)

  let avatar = null
  let animator = null
  let avatarJson = ''
  let generation = 0

  // Frost Realm glow: emissive tint on this statue's own (cloned) materials plus a soft additive aura.
  const G = S.glow
  const glowColor = new Color(G.color)
  const aura = new Mesh(auraGeometry(), auraMaterial(G.color))
  aura.position.y = S.plinthHeight + 1.6 * S.scale
  aura.visible = false
  root.add(aura)
  let glowMats = []
  let glow = 0
  let clock = 0

  function applyGlow() {
    const k = G.emissive * glow
    for (const m of glowMats) {
      m.emissive.copy(glowColor)
      m.emissiveIntensity = k
    }
  }

  function setAvatar(next) {
    if (avatar) stage.remove(avatar)
    disposeAnimator(animator)
    avatar = next
    glowMats = []
    next.traverse((o) => {
      if (!o.isMesh || !o.material) return
      const own = (m) => {
        if (!m.emissive) return m
        const c = m.clone()
        glowMats.push(c)
        return c
      }
      o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material)
    })
    applyGlow()
    stage.add(next)
    animator = makeAnimator(next)
  }
  setAvatar(buildDefaultCharacter())

  async function syncAvatar(json) {
    if (json === avatarJson) return // the board refreshes every few seconds: only rebuild on a change
    avatarJson = json
    const mine = ++generation
    if (!json) return setAvatar(buildDefaultCharacter())
    try {
      const look = JSON.parse(json)
      const group = await loadBaseCharacter()
      if (mine !== generation) return
      await attachEquippedAccessories(group, look?.equipped, { skinTextureUrl: look?.skin || undefined })
      if (mine !== generation) return
      applyProportions(group, look?.proportions)
      setAvatar(group)
    } catch {
      if (mine === generation) setAvatar(buildDefaultCharacter())
    }
  }

  // Two labels at the same metres-per-pixel: "#1 POWER" with a trophy, and the player's name under it.
  const headLabel = textLabel([{ text: `#1 ${title}`, px: 70, fill, stroke: '#3a2400', icon: trophyIcon() }], { height: 0.9 })
  const nameLabel = textLabel([{ text: 'Player', px: 60, fill: ['#ffffff', '#e8eef5'], stroke: '#1b1b1f' }], { height: 0.78 })
  const labelY = S.plinthHeight + S.labelY
  headLabel.object.position.y = labelY + 0.42
  nameLabel.object.position.y = labelY - 0.38
  nameLabel.object.visible = false
  root.add(headLabel.object, nameLabel.object)
  let shownName = null

  return {
    key,
    // row: the board's #1 row { id, name, value, avatar? }, or undefined when the board is empty.
    setTop(row) {
      const name = row?.name ? String(row.name).slice(0, 18) : ''
      if (name !== shownName) {
        shownName = name
        nameLabel.object.visible = !!name
        if (name) nameLabel.setLines(name)
      }
      void syncAvatar(row?.avatar || '')
    },
    update(dt) {
      const target = realm.active ? 1 : 0
      if (glow !== target) {
        glow = target > glow ? Math.min(target, glow + dt * G.fade) : Math.max(target, glow - dt * G.fade)
        applyGlow()
      }
      aura.visible = glow > 0
      if (aura.visible) {
        clock += dt
        const pulse = 1 + Math.sin(clock * 2.2) * G.pulse
        aura.material.opacity = G.aura * glow * pulse
        aura.scale.setScalar(S.scale * (0.95 + 0.05 * pulse))
      }
      animator?.update(dt, { grounded: true, speed: 0, verticalVelocity: 0, turn: 0, digging: false, strength: 1, celebrate: true })
    },
    dispose() {
      parent.remove(root)
      generation++
      disposeAnimator(animator)
      aura.material.dispose()
      headLabel.dispose()
      nameLabel.dispose()
    },
  }
}
