// Loot under the leaf piles. When a pile is blown away it may reveal items (loot.spawnFor),
// following the reference game's rules:
//   x1 Luck zone: a fixed spread of PLAN piles drop one item (a few Uncommon, the rest Common).
//   higher zones: the chance a pile drops, the items per pile and each item's rarity all rise
//   with the zone (LUCK_LOOT); the last zone always rolls the top tier.
// An item floats where the pile stood; E puts it in the Bag (state.backpackMax). The field
// regrowing (reset) takes away anything left lying.
import { AdditiveBlending, CanvasTexture, Group, Sprite, SpriteMaterial } from 'three'
import { ITEM_INFO, LOOT_PICKUP_RANGE, LUCK_LOOT, RARITIES, RARITY, X1_DROPS } from './data/loot.js'
import { textLabel } from './labels.js'
import { offer } from './interact.js'
import { discoverItem } from './index.js'
import { player } from './player.js'
import { state, notify, toast } from './state.js'
import { ZONE_COUNT, zoneAt } from './piles.js'
import { DIG, SNOW } from './config.js'
import { buildModel } from './r3f.js'
import { GenericItem, MODELS } from './lootModels.jsx'

const POOLS = {}
for (const [name, { rarity }] of Object.entries(ITEM_INFO)) (POOLS[rarity] ??= []).push(name)
// Rarity tiers that actually have items (Secret has none), lowest to highest.
const TIERS = RARITIES.filter((r) => POOLS[r]?.length)
const LAST_ZONE = ZONE_COUNT - 1
const ZONE_MARGIN = 8 // m past a zone border before its items are dropped
const MODEL_SCALE = 1.5 // the models are ~1 m across and rest on y = 0
// Icon pivot height: the model's centre is at its pivot, so 0 = half buried (buryDepth shifts it).
const OPEN_Y = 0.5 * MODEL_SCALE + 0.15 // dug out: model bottom just above the ground
const BURY_Y = (0.5 - SNOW.loot.buryDepth) * MODEL_SCALE
const FREE_LEFT = 0.15 // an item is freed once this fraction of the snow above it is left
const FREE_MIN = DIG.floor + 0.3 // snow thinner than this at spawn never hid it: the pile clearing frees it

function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// White starburst (soft core + thin rays), tinted per rarity through the material colour.
function starburstTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.translate(128, 128)
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 128)
  core.addColorStop(0, 'rgba(255,255,255,0.95)')
  core.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  core.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = core
  g.fillRect(-128, -128, 256, 256)
  const rays = 14
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + (i % 2) * 0.1
    const len = 128 - (i % 2 ? 22 : 4)
    const grad = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len)
    grad.addColorStop(0, 'rgba(255,255,255,0.85)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.save()
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, -3)
    g.lineTo(len, 0)
    g.lineTo(0, 3)
    g.closePath()
    g.fill()
    g.restore()
  }
  return new CanvasTexture(c)
}

const short = (n) => {
  const units = ['', 'K', 'M', 'B', 'T']
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return `${i ? +n.toFixed(n < 100 ? 1 : 0) : n}${units[i]}`
}

export function createLoot(scene, piles, heightAt) {
  const root = new Group()
  scene.add(root)
  const burst = starburstTexture()
  let nextId = 1

  // --- Which piles drop what -------------------------------------------------
  const dropChance = (zone) => {
    const share = X1_DROPS.piles / piles.filter((p) => p.zone === 0).length
    return Math.min(1, share + (1 - share) * (zone / LUCK_LOOT.fullAt)) * LUCK_LOOT.density
  }
  const dropCount = (zone) => 1 + Math.floor(((LUCK_LOOT.maxItems - 1) * zone) / LAST_ZONE)
  function rollTier(zone) {
    const pos = (zone / LAST_ZONE) * (TIERS.length - 1)
    let k = Math.floor(pos)
    if (Math.random() < pos - k) k++
    if (Math.random() < LUCK_LOOT.bonus) k++
    return TIERS[Math.min(k, TIERS.length - 1)]
  }
  // pile id -> 'Common' | 'Uncommon' for the x1 zone's loot piles: one pile from each of
  // `count` equal slices of the zone, so they spread over the whole zone instead of clumping.
  const plan = (() => {
    const zone0 = piles.filter((p) => p.zone === 0 && p.fullness > 0.3) // not the flattened hub edge
    const count = Math.min(X1_DROPS.piles, zone0.length)
    const rand = seededRandom(5)
    const picked = Array.from({ length: count }, (_, k) => {
      const lo = Math.floor((k * zone0.length) / count)
      const hi = Math.floor(((k + 1) * zone0.length) / count)
      return zone0[lo + Math.floor(rand() * (hi - lo))]
    })
    const uncommonAt = new Set(Array.from({ length: X1_DROPS.uncommon }, (_, u) => Math.floor(((u + 0.5) * count) / X1_DROPS.uncommon)))
    return new Map(picked.map((p, k) => [p.id, uncommonAt.has(k) ? 'Uncommon' : 'Common']))
  })()

  // Planned x1 loot piles already blown away (the tutorial points at the ones still to do).
  // Uncommon piles come first (worth ~10x a Common), nearest first, so a new player needs fewer sell trips.
  const spent = new Set()
  function hintPile(x, z) {
    let best = null
    let bestScore = Infinity
    for (const [id, rarity] of plan) {
      if (spent.has(id)) continue
      const p = piles[id]
      const score = (p.x - x) ** 2 + (p.z - z) ** 2 + (rarity === 'Uncommon' ? 0 : 1e9)
      if (score < bestScore) {
        bestScore = score
        best = p
      }
    }
    return best
  }

  // --- Drops -----------------------------------------------------------------
  // Every item is rolled up front and sits half-buried in the snow where its pile stands, so it
  // can be seen before the snow is dug. Digging the pile out lowers the snow round it and makes
  // it collectable (open). The 3D model is only built while the player is within VIEW m.
  const items = []
  const VIEW = SNOW.loot.viewDistance
  const GLOW = SNOW.loot.glowDistance

  function addDrop(rarity, x, z, pile) {
    const pool = POOLS[rarity]
    const name = pool[Math.floor(Math.random() * pool.length)]
    items.push({ id: nextId++, name, rarity, value: ITEM_INFO[name].value, x, z, pile, open: false, group: null })
  }

  function build(d) {
    const { fill, glow } = RARITY[d.rarity]
    const group = new Group()
    group.position.set(d.x, heightAt(d.x, d.z), d.z)

    const halo = new Sprite(new SpriteMaterial({ map: burst, color: glow, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, toneMapped: false }))
    halo.scale.set(3.4, 3.4, 1)
    halo.position.y = 0.6
    halo.renderOrder = 2

    // The item's own 3D model, slowly spinning, half-buried.
    const model = buildModel(MODELS[d.name] ?? GenericItem)
    const icon = new Group()
    model.object.scale.setScalar(MODEL_SCALE)
    model.object.position.y = -0.5 * MODEL_SCALE
    icon.add(model.object)
    icon.position.y = BURY_Y

    const label = textLabel(
      [
        { text: `$${short(d.value)}`, px: 56, fill: '#7dff8a' },
        { text: d.name, px: 64, fill: '#ffffff' },
        { text: d.rarity, px: 46, fill },
      ],
      { height: 1.3 },
    )
    label.object.position.y = 2.2
    label.object.renderOrder = 3
    label.object.visible = false // update() shows halo + banner only when the player is near
    halo.visible = false

    group.add(halo, icon, label.object)
    root.add(group)
    Object.assign(d, { group, icon, model, halo, label })
  }

  function unbuild(d) {
    root.remove(d.group)
    d.icon.traverse((o) => {
      o.geometry?.dispose()
      if (o.material?.userData.own) o.material.dispose() // shared plastic() materials stay
    })
    d.halo.material.dispose()
    d.label.dispose()
    d.group = null
  }

  function rollAll() {
    for (const pile of piles) {
      if (pile.fullness <= 0) continue
      if (pile.zone === 0) {
        const rarity = plan.get(pile.id)
        if (rarity) addDrop(rarity, pile.x, pile.z, pile.id)
      } else if (Math.random() < dropChance(pile.zone)) {
        // Several items fan out in a small ring round the middle (all within pickup range).
        const n = dropCount(pile.zone)
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + Math.PI / 4
          const r = n > 1 ? 1.6 : 0
          addDrop(rollTier(pile.zone), pile.x + Math.cos(a) * r, pile.z + Math.sin(a) * r, pile.id)
        }
      }
    }
  }
  rollAll()

  // The pile was dug out: its items can now be collected.
  function spawnFor(pile) {
    spent.add(pile.id)
    for (const d of items) {
      if (d.pile !== pile.id) continue
      d.open = true
    }
  }

  function collect(d) {
    if (state.bag.length >= state.backpackMax) {
      toast('Bag full! Sell your loot')
      return
    }
    state.bag.push({ name: d.name, rarity: d.rarity, value: d.value })
    if (d.group) unbuild(d)
    items.splice(items.indexOf(d), 1)
    if (!discoverItem(d.name)) toast(`Collected ${d.name}`)
    notify()
  }

  return {
    spawnFor,
    hintPile, // nearest x1 pile that still hides loot: { x, z } or null
    get count() { return items.filter((d) => d.open).length },
    get drops() { return items.filter((d) => d.open) }, // collectable items

    // The field regrew: the old loot is gone and the new snow hides a fresh roll.
    reset() {
      spent.clear()
      for (const d of items) if (d.group) unbuild(d)
      items.length = 0
      rollAll()
    },

    update(dt, t) {
      const px = player.position.x
      const pz = player.position.z
      for (const d of [...items]) {
        const dist = Math.hypot(px - d.x, pz - d.z)
        // Only the zone the player stands in shows its items; a margin keeps them from
        // flickering on and off while walking along a zone border.
        const zone = piles[d.pile].zone
        if (!d.group) {
          if (dist < VIEW && zoneAt(px) === zone) build(d)
          else continue
        } else if (dist > VIEW + 10 || (zoneAt(px) !== zone && zoneAt(px - ZONE_MARGIN) !== zone && zoneAt(px + ZONE_MARGIN) !== zone)) {
          unbuild(d)
          continue
        }
        const surface = heightAt(d.x, d.z)
        d.group.position.y = surface // rides the snow surface down as it is dug
        // Freed once the snow right above it is (almost) gone, whatever the rest of the pile does.
        if (!d.open) {
          d.h0 ??= surface
          d.open = d.h0 > FREE_MIN && surface < DIG.floor + (d.h0 - DIG.floor) * FREE_LEFT
        }
        // Buried while the snow is there; once it is dug out the item rises to sit fully on the ground.
        const rest = d.open ? OPEN_Y + Math.sin(t * 1.8 + d.id) * 0.1 : BURY_Y
        d.icon.position.y += (rest - d.icon.position.y) * Math.min(1, dt * 6)
        d.icon.rotation.y = t * 0.9 + d.id * 1.3
        d.model.tick(dt)
        // Glow + banner only up close: many additive full-size sprites are costly on weak GPUs.
        const near = dist < GLOW
        d.halo.visible = near
        d.label.object.visible = near // buried items show it too, so players know what is under the snow
        if (near) d.halo.material.opacity = (d.rarity === 'Common' ? 0.5 : 0.75) + Math.sin(t * 2.4 + d.id) * 0.12
        if (d.open && dist < LOOT_PICKUP_RANGE && Math.abs(player.position.y - 0.1) < 3) offer(`Collect ${d.name}`, () => collect(d), dist)
      }
    },
  }
}
