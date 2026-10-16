import { CanvasTexture, Color, DoubleSide, InstancedMesh, MathUtils, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace } from 'three'
import { SNOWFALL, HUB } from './config.js'

// Snowflakes drifting down from the sky around the player, everywhere.

function snowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.translate(32, 32)
  g.strokeStyle = '#fff'
  g.lineCap = 'round'
  g.lineWidth = 4
  for (let k = 0; k < 6; k++) {
    g.rotate(Math.PI / 3)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -26)
    g.moveTo(0, -15)
    g.lineTo(7, -22)
    g.moveTo(0, -15)
    g.lineTo(-7, -22)
    g.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

import { settings } from './settings.js'

export function createSnowfall(scene, quality = 1) {
  const F = SNOWFALL
  const max = Math.max(20, Math.round(F.count * quality))
  const mat = new MeshBasicMaterial({ map: snowTexture(), alphaTest: 0.5, side: DoubleSide, fog: true })
  const mesh = new InstancedMesh(new PlaneGeometry(F.size, F.size), mat, max)
  mesh.frustumCulled = false
  mesh.count = 0
  scene.add(mesh)

  const px = new Float32Array(max), py = new Float32Array(max), pz = new Float32Array(max)
  const fall = new Float32Array(max), phase = new Float32Array(max), spin = new Float32Array(max)
  const col = new Color()
  const dummy = new Object3D()
  let primed = false

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
    update(dt, time, playerPos) {
      const k = 1
      const n = settings.vfx ? Math.round(max * k) : 0
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
      for (let i = 0; i < n; i++) {
        const t = time * 0.9 + phase[i]
        py[i] -= fall[i] * dt
        px[i] += Math.sin(t) * F.drift * dt
        pz[i] += Math.cos(t * 0.8) * F.drift * dt
        if (py[i] < 0 || Math.abs(px[i] - playerPos.x) > F.radius || Math.abs(pz[i] - playerPos.z) > F.radius || Math.abs(pz[i]) > zLim) {
          respawn(i, playerPos.x, playerPos.z, false)
          pz[i] = MathUtils.clamp(pz[i], -zLim, zLim)
        }
        dummy.position.set(px[i], py[i], pz[i])
        dummy.rotation.set(Math.sin(t * 1.3) * 1.2, t * spin[i], Math.cos(t) * 1.2)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },
  }
}
