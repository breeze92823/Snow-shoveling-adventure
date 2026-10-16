// Effects for the Worlds portal (props.js): an animated vortex shader in the doorway, spiralling
// sparkles, glow halos and floating crystals. Built for low-end devices: no real lights (glow is
// additive sprites/discs), one shared vortex quad, ONE Points draw whose motion runs in the vertex
// shader, and everything hides/stops updating when the player is far away.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three'

const SPARKLES = 36
const FAR = 90 // beyond this distance (units) the effects are hidden and not updated

let glowTex
function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  glowTex = new CanvasTexture(c)
  glowTex.colorSpace = SRGBColorSpace
  return glowTex
}

const VORTEX_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const VORTEX_FRAG = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uLock;
uniform vec3 uA;
uniform vec3 uB;
void main() {
  vec2 q = (vUv - 0.5) * 2.0;
  vec2 p = q * vec2(0.62, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float swirl = sin(a * 3.0 + r * 9.0 - uTime * 2.4 + sin(r * 5.0 - uTime * 1.3) * 1.5);
  float rings = sin(r * 14.0 - uTime * 3.0) * 0.5 + 0.5;
  float v = swirl * 0.5 + 0.5;
  vec3 col = mix(uA, uB, v);
  col += uB * rings * 0.12;
  col += vec3(1.0, 0.85, 1.0) * exp(-r * 3.2) * 0.9; // bright core
  float edge = smoothstep(1.0, 0.72, abs(q.x)) * smoothstep(1.0, 0.86, abs(q.y));
  float fade = mix(1.0, 0.35, uLock);
  col = mix(col, vec3(dot(col, vec3(0.3, 0.5, 0.2))) * vec3(1.0, 0.25, 0.25), uLock);
  gl_FragColor = vec4(col * fade, edge);
}`

const SPARK_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uPx;
varying float vA;
void main() {
  float life = fract(aSeed.y + uTime * (0.07 + aSeed.w * 0.06));
  float ang = aSeed.x * 6.2831 + uTime * (0.8 + aSeed.z);
  float rad = (1.7 + aSeed.z * 1.6) * (1.0 - life * 0.55);
  vec3 pos = vec3(cos(ang) * rad * 0.9, 0.6 + life * 7.0, sin(ang) * rad * 0.45);
  vA = sin(life * 3.1416);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uPx * (0.5 + aSeed.w) * vA / max(1.0, -mv.z) * 12.0;
  gl_Position = projectionMatrix * mv;
}`

const SPARK_FRAG = /* glsl */ `
precision mediump float;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float k = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.85, 0.55, 1.0) + k * 0.3, k * vA);
}`

// Builds the effects into group `g` (the portal's local space, +Z front, doorway centred at y=3.7).
// Returns { update(dt, t, dist, locked) }.
export function buildPortalFx(g) {
  const fx = new Group()
  g.add(fx)

  // Vortex: replaces the black doorway quad. Two faces so it reads from behind too.
  const vortexMat = new ShaderMaterial({
    vertexShader: VORTEX_VERT,
    fragmentShader: VORTEX_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uLock: { value: 0 },
      uA: { value: new Color('#2a0a5a') },
      uB: { value: new Color('#c45cf0') },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
  const vortex = new Mesh(new PlaneGeometry(3.8, 6.2), vortexMat)
  vortex.position.set(0, 3.7, 0)
  fx.add(vortex)

  // Halo glows (sprites, additive): behind the doorway and on the floor.
  const halo = new Sprite(new SpriteMaterial({ map: glowTexture(), color: '#b04cff', blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }))
  halo.scale.set(10, 11, 1)
  halo.position.set(0, 3.9, 0.2)
  fx.add(halo)
  const floorGlow = new Mesh(
    new CircleGeometry(4.2, 24),
    new MeshBasicMaterial({ map: glowTexture(), color: '#a040ff', blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }),
  )
  floorGlow.rotation.x = -Math.PI / 2
  floorGlow.position.set(0, 0.62, 1.2)
  fx.add(floorGlow)

  // Sparkles: one draw call, animated in the vertex shader.
  const seeds = new Float32Array(SPARKLES * 4)
  const pos = new Float32Array(SPARKLES * 3) // unused by the shader, required by three
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
  const sg = new BufferGeometry()
  sg.setAttribute('position', new BufferAttribute(pos, 3))
  sg.setAttribute('aSeed', new BufferAttribute(seeds, 4))
  const sparkMat = new ShaderMaterial({
    vertexShader: SPARK_VERT,
    fragmentShader: SPARK_FRAG,
    uniforms: { uTime: { value: 0 }, uPx: { value: 14 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const sparks = new Points(sg, sparkMat)
  sparks.frustumCulled = false
  sparks.position.set(0, 0, 0.5)
  fx.add(sparks)

  // Floating crystals flanking the pillars (emissive, unlit, so no lights needed).
  const crystalGeo = new OctahedronGeometry(0.42)
  const crystalMat = new MeshBasicMaterial({ color: '#e7a8ff' })
  const crystals = []
  for (const [cx, cy, cz] of [[-4.4, 2.2, 1.2], [4.4, 2.2, 1.2], [-4.0, 5.4, 0.6], [4.0, 5.4, 0.6]]) {
    const m = new Mesh(crystalGeo, crystalMat)
    m.scale.set(0.8, 1.5, 0.8)
    m.position.set(cx, cy, cz)
    m.userData.base = cy
    fx.add(m)
    crystals.push(m)
  }

  const cB = new Color('#c45cf0')
  const cLock = new Color('#ff3030')
  let lockMix = 0
  return {
    update(dt, t, dist, locked) {
      const near = dist < FAR
      fx.visible = near
      if (!near) return
      lockMix += ((locked ? 1 : 0) - lockMix) * Math.min(1, dt * 4)
      vortexMat.uniforms.uTime.value = t
      vortexMat.uniforms.uLock.value = lockMix
      sparkMat.uniforms.uTime.value = t
      sparks.visible = lockMix < 0.6
      halo.material.opacity = (0.45 + Math.sin(t * 2.2) * 0.12) * (1 - lockMix * 0.7)
      halo.material.color.copy(cB).lerp(cLock, lockMix)
      floorGlow.material.opacity = (0.5 + Math.sin(t * 2.2 + 1) * 0.12) * (1 - lockMix * 0.6)
      crystals.forEach((m, i) => {
        m.position.y = m.userData.base + Math.sin(t * 1.4 + i * 1.7) * 0.25
        m.rotation.y = t * (0.8 + i * 0.15)
      })
    },
  }
}
