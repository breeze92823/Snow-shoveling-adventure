import { CanvasTexture, Color, DoubleSide, InstancedMesh, MathUtils, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SNOWFALL, HUB, FOG } from './config.js'

// Snowflakes drifting down from the sky around the player, everywhere.

// A soft wind streak: bright core fading to nothing at both ends.
function snowTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 16
  const g = c.getContext('2d')
  const lg = g.createLinearGradient(0, 0, 128, 0)
  lg.addColorStop(0, 'rgba(255,255,255,0)')
  lg.addColorStop(0.7, 'rgba(255,255,255,0.9)')
  lg.addColorStop(1, 'rgba(255,255,255,1)')
  g.fillStyle = lg
  g.beginPath()
  g.ellipse(64, 8, 64, 5, 0, 0, Math.PI * 2)
  g.fill()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

import { settings } from './settings.js'

export function createSnowfall(scene, quality = 1) {
  const F = SNOWFALL
  const max = Math.max(20, Math.round(F.count * quality))
  const mat = new MeshBasicMaterial({ map: snowTexture(), transparent: true, opacity: F.opacity, depthWrite: false, side: DoubleSide, fog: true })
  // two crossed quads so a streak reads from any angle
  const quad = new PlaneGeometry(1, F.size)
  const quad2 = quad.clone().rotateX(Math.PI / 2)
  const mesh = new InstancedMesh(mergeGeometries([quad, quad2]), mat, max)
  mesh.frustumCulled = false
  mesh.count = 0
  scene.add(mesh)

  const px = new Float32Array(max), py = new Float32Array(max), pz = new Float32Array(max)
  const fall = new Float32Array(max), phase = new Float32Array(max), spin = new Float32Array(max)
  const col = new Color()
  const dummy = new Object3D()
  dummy.rotation.order = 'ZXY'
  const fog = scene.fog
  let primed = false
  let calm = false

  // storm strength by x: calm in the hub, rising through the field mouth, peaking at mid-field, fiercest at the far end
  const midX = HUB.fieldEnd / 2
  function stormAt(x) {
    if (calm) return 0
    const mouth = MathUtils.smoothstep(-x, -F.startX, -F.fullX)
    const deep = MathUtils.smoothstep(-x, -F.fullX, -midX)
    const far = MathUtils.smoothstep(-x, -midX, -HUB.fieldEnd)
    return F.stormHub + (F.stormMouth - F.stormHub) * mouth + (1 - F.stormMouth) * deep + (F.stormEnd - 1) * far
  }

  function respawn(i, cx, cz, anywhere) {
    px[i] = cx + (Math.random() * 2 - 1) * F.radius
    pz[i] = cz + (Math.random() * 2 - 1) * F.radius
    py[i] = anywhere ? Math.random() * F.height : F.height * (0.85 + Math.random() * 0.15)
    fall[i] = F.fallSpeed * (0.6 + Math.random() * 0.8)
    phase[i] = Math.random() * 6.283
    spin[i] = (Math.random() - 0.5) * 3
    col.set(F.colors[(Math.random() * F.colors.length) | 0]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08)
    mesh.setColorAt(i, col)
  }

  return {
    // Multiplied into every flake's colour (the Frost Realm's ice sparkles).
    setTint(color) {
      mat.color.set(color)
    },
    // No storm (the Frost Realm): no whiteout fog or wind, just a light fall of flakes everywhere.
    setCalm(on) {
      calm = on
    },
    update(dt, time, playerPos) {
      // whiteout: visibility collapses out in the open field, eases off in the sheltered hub
      const storm = Math.min(1, stormAt(playerPos.x))
      if (fog) {
        fog.near = MathUtils.lerp(FOG.near, F.fogNear, storm)
        fog.far = MathUtils.lerp(FOG.far, F.fogFar, storm)
      }
      const n = settings.vfx ? Math.round(max * MathUtils.lerp(0.3, 1, storm)) : 0
      mesh.visible = n > 0
      if (n <= 0) return
      if (!primed) {
        for (let i = 0; i < max; i++) respawn(i, playerPos.x, playerPos.z, true)
        primed = true
      }
      // newly revealed leaves start at a random height
      for (let i = mesh.count; i < n; i++) respawn(i, playerPos.x, playerPos.z, true)
      mesh.count = n
      const zLim = HUB.fieldHalfWidth + 14
      // gusting wind, west -> east (field -> hub); sheltered inside the hub
      const gust = 1 + Math.sin(time * F.gustSpeed * 6.283) * F.gust * 0.6 + Math.sin(time * F.gustSpeed * 2.7 + 1.3) * F.gust * 0.4
      for (let i = 0; i < n; i++) {
        const t = time * 0.9 + phase[i]
        const shelter = stormAt(px[i])
        const w = F.wind * shelter * Math.max(0.1, gust)
        py[i] -= fall[i] * dt
        px[i] += (w + Math.sin(t) * F.drift * 0.3) * dt
        pz[i] += Math.cos(t * 0.8) * (F.drift + F.turbulence * shelter) * dt
        py[i] += Math.sin(t * 2.1) * F.turbulence * 0.4 * shelter * dt
        const out = px[i] - playerPos.x > F.radius
        if (py[i] < 0 || out || playerPos.x - px[i] > F.radius || Math.abs(pz[i] - playerPos.z) > F.radius || Math.abs(pz[i]) > zLim) {
          respawn(i, playerPos.x, playerPos.z, false)
          // blown out of the downwind edge: re-enter from the upwind (field) edge
          px[i] = playerPos.x - F.radius * (0.7 + Math.random() * 0.3)
          py[i] = Math.random() * F.height * 0.7
          pz[i] = MathUtils.clamp(pz[i], -zLim, zLim)
        }
        dummy.position.set(px[i], py[i], pz[i])
        // streak points along the wind, tilted down by the fall; length grows with wind speed
        dummy.rotation.set(phase[i], 0, -Math.atan2(fall[i], Math.max(w, 0.5)))
        dummy.scale.setScalar(F.streak * (0.4 + 0.6 * Math.min(1, w / F.wind)) * (0.7 + (fall[i] / F.fallSpeed) * 0.3))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },
  }
}
