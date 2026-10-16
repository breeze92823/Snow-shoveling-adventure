// A crackling bonfire for the plaza: stone ring, stacked logs, glowing embers, GPU-animated
// flame / spark / smoke particles, a ground glow and (on non-Low graphics) one flickering
// point light. Built to be cheap: the particles are simulated entirely in the vertex shader
// (no per-frame CPU work or buffer uploads), everything static is merged, and the whole
// thing is 5 draw calls. Per frame it only sets a few uniforms and the light intensity.
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addCollider } from './colliders.js'

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uKind; // 0 = flame + sparks (kind attribute), 1 = smoke
  attribute vec4 aSeed;
  attribute float aKind; // 0 flame, 1 spark
  varying float vLife;
  varying float vKind;
  void main() {
    float life;
    vec3 p;
    float size;
    float a = aSeed.z * 6.2831853;
    if (uKind > 0.5) { // smoke: slow, wide, drifting with the wind
      life = fract(uTime * 0.09 + aSeed.y);
      p = vec3(cos(a) * 0.4 * life + life * life * 3.0 + sin(uTime * 0.7 + aSeed.x * 9.0) * 0.4 * life,
               2.2 + life * 7.0,
               sin(a) * 0.4 * life + sin(uTime * 0.5 + aSeed.w * 9.0) * 0.3 * life);
      size = (1.6 + life * 4.5) * (0.7 + aSeed.x * 0.6);
      vKind = 2.0;
    } else if (aKind > 0.5) { // spark: fast, small, flung outward
      life = fract(uTime * (0.35 + aSeed.x * 0.3) + aSeed.y);
      float r = life * (0.5 + aSeed.w * 1.6);
      p = vec3(cos(a) * r + life * 0.8, 0.6 + life * (3.0 + aSeed.x * 3.5) - life * life * 1.2, sin(a) * r);
      size = 0.16 * (1.0 - life) * (0.6 + aSeed.w);
      vKind = 1.0;
    } else { // flame: licks upward from the log pile, tapering and swaying
      float speed = 0.7 + aSeed.x * 0.5;
      life = fract(uTime * speed + aSeed.y);
      float rad = aSeed.w * 0.85 * (1.0 - life * 0.85);
      float sway = sin(uTime * 3.1 + aSeed.x * 20.0) * 0.18 * life + sin(uTime * 7.3 + aSeed.w * 30.0) * 0.07 * life;
      p = vec3(cos(a) * rad + sway + life * 0.15, 0.35 + life * (2.4 + aSeed.x * 1.1), sin(a) * rad + sway * 0.6);
      size = (1.0 + aSeed.x * 0.7) * (1.0 - life * 0.75) * smoothstep(0.0, 0.08, life) * 2.1;
      vKind = 0.0;
    }
    vLife = life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  varying float vLife;
  varying float vKind;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float soft = 1.0 - d;
    if (vKind > 1.5) { // smoke
      float al = soft * soft * 0.3 * smoothstep(0.0, 0.2, vLife) * (1.0 - vLife);
      gl_FragColor = vec4(vec3(0.62, 0.64, 0.7), al);
    } else if (vKind > 0.5) { // spark
      gl_FragColor = vec4(vec3(1.0, 0.75, 0.3), soft * (1.0 - vLife));
    } else { // flame: white-yellow core -> orange -> deep red tips
      vec3 hot = vec3(1.0, 0.93, 0.55);
      vec3 mid = vec3(1.0, 0.45, 0.06);
      vec3 cold = vec3(0.55, 0.08, 0.0);
      vec3 col = mix(hot, mid, smoothstep(0.0, 0.45, vLife));
      col = mix(col, cold, smoothstep(0.45, 1.0, vLife));
      gl_FragColor = vec4(col, soft * soft * (1.0 - vLife * 0.8) * 1.1);
    }
  }
`

function particleGeometry(n, kindOf, seed) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const pos = new Float32Array(n * 3) // unused by the shader but required for drawing
  const seeds = new Float32Array(n * 4)
  const kinds = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    seeds.set([rnd(), (i + rnd() * 0.5) / n, rnd(), rnd()], i * 4)
    kinds[i] = kindOf(i)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new BufferAttribute(seeds, 4))
  g.setAttribute('aKind', new BufferAttribute(kinds, 1))
  g.boundingSphere = new Sphere(new Vector3(0, 4, 0), 9) // positions are shader-made, so cull by hand
  return g
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,170,70,0.9)')
  grad.addColorStop(0.35, 'rgba(255,110,30,0.35)')
  grad.addColorStop(1, 'rgba(255,80,10,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

// opts: { fx: 0..1 particle amount, light: add the flickering point light }
export function createBonfire(scene, x, z, { fx = 1, light = true } = {}) {
  const root = new Group()
  root.position.set(x, 0, z)
  scene.add(root)

  // --- static pile: one merged mesh per material ---------------------------------
  const q = new Quaternion()
  const e = new Euler()
  const place = (geo, px, py, pz, rx = 0, ry = 0, rz = 0) => {
    const g = geo.index ? geo.toNonIndexed() : geo
    g.applyMatrix4(new Matrix4().compose(new Vector3(px, py, pz), q.setFromEuler(e.set(rx, ry, rz)), new Vector3(1, 1, 1)))
    return g
  }
  const stones = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const s = 0.34 + (i % 3) * 0.07
    const rock = new DodecahedronGeometry(s, 0)
    rock.scale(1.2, 0.8, 1)
    stones.push(place(rock, Math.cos(a) * 1.55, 0.22, Math.sin(a) * 1.55, 0, a, 0))
  }
  const logs = []
  for (let i = 0; i < 7; i++) { // teepee of logs leaning in toward the middle
    const a = (i / 7) * Math.PI * 2 + 0.3
    const log = new CylinderGeometry(0.13, 0.16, 2.0, 7)
    logs.push(place(log, Math.cos(a) * 0.55, 0.85, Math.sin(a) * 0.55, Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55))
  }
  for (const a of [0.2, 1.7, 3.0]) { // flat logs underneath
    logs.push(place(new CylinderGeometry(0.17, 0.17, 2.3, 7), 0, 0.2, 0, Math.PI / 2, a, 0))
  }
  const addMesh = (geos, mat) => {
    const m = new Mesh(mergeGeometries(geos), mat)
    m.castShadow = false
    m.receiveShadow = true
    root.add(m)
    return m
  }
  addMesh(stones, new MeshStandardMaterial({ color: '#7d8796', roughness: 0.95 }))
  addMesh(logs, new MeshStandardMaterial({ color: '#4a2e1b', roughness: 1, emissive: '#3a0d00', emissiveIntensity: 0.6 }))

  // melted patch + glowing ember bed (unlit, so they glow in the dark)
  const patch = new Mesh(new PlaneGeometry(4.6, 4.6), new MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 }))
  patch.rotation.x = -Math.PI / 2
  patch.position.y = 0.07
  patch.scale.setScalar(2.6)
  root.add(patch)
  const embers = new Mesh(new CylinderGeometry(1.1, 1.25, 0.12, 14), new MeshBasicMaterial({ color: '#ff5a14' }))
  embers.position.y = 0.12
  root.add(embers)

  // --- particles (all animation in the shader) -------------------------------------
  const nFlame = Math.round(70 * fx)
  const nSpark = Math.round(24 * fx)
  const nSmoke = Math.max(5, Math.round(14 * fx))
  const uniforms = { uTime: { value: 0 }, uScale: { value: 500 }, uKind: { value: 0 } }
  const fire = new Points(
    particleGeometry(nFlame + nSpark, (i) => (i < nFlame ? 0 : 1), 3),
    new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  )
  const smokeUniforms = { uTime: uniforms.uTime, uScale: uniforms.uScale, uKind: { value: 1 } }
  const smoke = new Points(
    particleGeometry(nSmoke, () => 0, 8),
    new ShaderMaterial({ uniforms: smokeUniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false }),
  )
  for (const p of [fire, smoke]) p.renderOrder = 5
  root.add(smoke, fire)

  let lamp = null
  if (light) {
    lamp = new PointLight(0xff8a2a, 60, 26, 2)
    lamp.position.set(0, 2.2, 0)
    root.add(lamp)
  }

  addCollider(x, z, 3.4, 3.4, 1.4)

  const NEAR2 = 160 * 160
  return {
    root,
    // viewH = drawing-buffer height in px, so points keep a consistent world size.
    update(t, playerPos, viewH, fov = 60) {
      const dx = playerPos.x - x, dz = playerPos.z - z
      const near = dx * dx + dz * dz < NEAR2
      fire.visible = smoke.visible = near
      if (!near) return
      uniforms.uTime.value = t
      uniforms.uScale.value = viewH / (2 * Math.tan((fov * Math.PI) / 360))
      const f = 0.88 + 0.12 * Math.sin(t * 11) + 0.07 * Math.sin(t * 23.7 + 1.3) + 0.05 * Math.sin(t * 41.1)
      patch.material.opacity = 0.75 + 0.25 * f
      patch.scale.setScalar(2.4 + 0.25 * f)
      if (lamp) lamp.intensity = 60 * f
    },
  }
}
