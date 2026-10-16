// A leaderboard's #1 player as a dancing 3D character on a plinth beside the board. The board's top
// row from the server carries that player's Bloxity avatar JSON ({ equipped, proportions, skin }),
// dressed onto the base rig exactly like remotePlayers.js. No #1 row, no avatar (guest / offline),
// bad JSON or a failed load all fall back to the default character. Never throws.
import { CylinderGeometry, Group, MeshStandardMaterial } from 'three'
import { LEADER_HALL } from './config.js'
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

  function setAvatar(next) {
    if (avatar) stage.remove(avatar)
    disposeAnimator(animator)
    avatar = next
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
      animator?.update(dt, { grounded: true, speed: 0, verticalVelocity: 0, turn: 0, digging: false, strength: 1, celebrate: true })
    },
    dispose() {
      parent.remove(root)
      generation++
      disposeAnimator(animator)
      headLabel.dispose()
      nameLabel.dispose()
    },
  }
}
