import { DoubleSide, Vector2 } from 'three'
import { h as __h, Fragment, useRef, useFrame, plastic } from './r3f.js'

// 3D models for every snow-themed loot item (procedural three.js primitives).
// Each rests on y=0 and is 0.6-1.2 m across. MODELS maps item name -> component;
// names, rarity and values live in data/loot.js.

// ---- Materials ----

// Glowing material helper for the rarer models.
const shine = (color, emissive, k = 0.7, extra = {}) =>
  plastic(color, { emissive, emissiveIntensity: k, roughness: 0.25, metalness: 0.2, ...extra })
const metal = (color, extra = {}) => plastic(color, { roughness: 0.3, metalness: 0.75, ...extra })
// See-through ice / glass.
const glass = (color, opacity = 0.45, extra = {}) =>
  plastic(color, { transparent: true, opacity, roughness: 0.08, metalness: 0.1, depthWrite: false, ...extra })

const SNOW = '#f6fbff'
const ICE = '#a9dcff'
const ICE_DEEP = '#5fb4ee'
const RED = '#d8322f'
const GREEN = '#2f8f4e'
const GOLD = '#f2c230'
const WOOD = '#8a5a33'

// ---- Tiny mesh helpers (always pass vectors: r3f.js can't skip undefined props) ----

const P0 = [0, 0, 0]
const Box = ({ p = P0, s, m, r = P0 }) => (
  <mesh position={p} rotation={r} material={m}>
    <boxGeometry args={s} />
  </mesh>
)
const Cyl = ({ p = P0, t, b = t, h, m, r = P0, seg = 20, open = false }) => (
  <mesh position={p} rotation={r} material={m}>
    <cylinderGeometry args={[t, b, h, seg, 1, open]} />
  </mesh>
)
const Sph = ({ p = P0, r, m, sc = [1, 1, 1], rot = P0, seg = 16 }) => (
  <mesh position={p} rotation={rot} scale={sc} material={m}>
    <sphereGeometry args={[r, seg, Math.max(6, seg - 4)]} />
  </mesh>
)
const Cone = ({ p = P0, r, h, m, rot = P0, seg = 16 }) => (
  <mesh position={p} rotation={rot} material={m}>
    <coneGeometry args={[r, h, seg]} />
  </mesh>
)
const Tor = ({ p = P0, r, t, m, rot = P0, arc = Math.PI * 2, seg = 24, sc = [1, 1, 1] }) => (
  <mesh position={p} rotation={rot} scale={sc} material={m}>
    <torusGeometry args={[r, t, 10, seg, arc]} />
  </mesh>
)
const Oct = ({ p = P0, r, m, rot = P0, sc = [1, 1, 1] }) => (
  <mesh position={p} rotation={rot} scale={sc} material={m}>
    <octahedronGeometry args={[r, 0]} />
  </mesh>
)
const Ico = ({ p = P0, r, m, rot = P0, sc = [1, 1, 1], d = 0 }) => (
  <mesh position={p} rotation={rot} scale={sc} material={m}>
    <icosahedronGeometry args={[r, d]} />
  </mesh>
)

// ---- Shared helpers ----

function Spin({ speed = 1, axis = 'y', children, ...props }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation[axis] += dt * speed
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

// Brilliant-cut gem: flat table on top, pointed pavilion below. With an array
// of materials each facet slice gets the next one (used for the rainbow gem).
function CutGem({ mats, r = 0.4, crown = 0.16, pavilion = 0.42, table = 0.55, seg = 8 }) {
  const list = Array.isArray(mats) ? mats : [mats]
  const n = list.length === 1 ? 1 : seg
  const step = (Math.PI * 2) / n
  const radial = n === 1 ? seg : 1
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <mesh position={[0, crown / 2, 0]} material={list[i % list.length]}>
            <cylinderGeometry args={[r * table, r, crown, radial, 1, false, i * step, step]} />
          </mesh>
          <mesh position={[0, -pavilion / 2, 0]} material={list[i % list.length]}>
            <cylinderGeometry args={[r, 0, pavilion, radial, 1, false, i * step, step]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Tiny glowing diamonds scattered at fixed spots.
function Sparkles({ spots, mat, size = 0.035 }) {
  return spots.map((p, i) => (
    <mesh key={i} position={p} rotation={[0.6, i, 0.4]} material={mat}>
      <octahedronGeometry args={[size * (1 + (i % 3) * 0.4), 0]} />
    </mesh>
  ))
}

function SpikeCrown({ band, spike, jewel, n = 8, tall = 0.4 }) {
  return (
    <group position={[0, -0.15, 0]}>
      <mesh position={[0, 0.1, 0]} material={band}>
        <cylinderGeometry args={[0.42, 0.36, 0.22, 20, 1, true]} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <group key={i} position={[Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4]}>
            <mesh position={[0, tall / 2, 0]} material={spike}>
              <coneGeometry args={[0.07, tall, 6]} />
            </mesh>
            {jewel && (
              <mesh position={[0, tall + 0.04, 0]} material={jewel}>
                <sphereGeometry args={[0.04, 8, 6]} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

// Six-armed flat snowflake in the XY plane; `len` is arm length from the centre.
function Flake({ len = 0.5, w = 0.05, depth = 0.05, m, branches = true }) {
  const lb = len * 0.32
  const th = Math.PI / 4
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation-z={(i / 3) * Math.PI}>
          <Box s={[len * 2, w, depth]} m={m} />
          {branches &&
            [-1, 1].flatMap((dir) =>
              [0.45, 0.75].flatMap((f) =>
                [-1, 1].map((sd) => {
                  const dx = dir * Math.cos(th)
                  const dy = sd * Math.sin(th)
                  const bl = lb * (1.2 - f * 0.6)
                  return (
                    <Box
                      key={`${dir}${f}${sd}`}
                      p={[dir * len * f + (dx * bl) / 2, (dy * bl) / 2, 0]}
                      r={[0, 0, Math.atan2(dy, dx)]}
                      s={[bl, w * 0.8, depth]}
                      m={m}
                    />
                  )
                }),
              ),
            )}
        </group>
      ))}
    </group>
  )
}

// ---- Common ----

function WoolMitten() {
  const wool = plastic(RED, { roughness: 0.95 })
  const white = plastic(SNOW, { roughness: 0.95 })
  return (
    <group position={[0, 0.05, 0]} rotation-y={0.3}>
      <Sph p={[0, 0.55, 0]} r={0.32} sc={[1, 1.25, 0.6]} m={wool} />
      <Sph p={[0.3, 0.42, 0]} r={0.15} sc={[0.8, 1.3, 0.7]} rot={[0, 0, -0.7]} m={wool} />
      <group scale={[1, 1, 0.62]}>
        <Cyl p={[0, 0.18, 0]} t={0.28} h={0.3} m={white} />
      </group>
      {[0.1, 0.16, 0.22].map((y) => (
        <Box key={y} p={[0, y, 0.18]} s={[0.4, 0.025, 0.04]} m={wool} />
      ))}
      {/* Nordic snowflake on the back of the hand */}
      <group position={[0, 0.62, 0.2]} scale={[0.6, 0.6, 0.6]}>
        <Flake len={0.2} w={0.04} depth={0.03} m={white} branches={false} />
      </group>
      <Oct p={[0, 0.92, 0.04]} r={0.05} m={white} />
    </group>
  )
}

function WinterBoot() {
  const leather = plastic('#7a4a2a', { roughness: 0.7 })
  const dark = plastic('#2c2a30', { roughness: 0.6 })
  const fur = plastic(SNOW, { roughness: 1 })
  const lace = plastic('#f0e8d8', { roughness: 0.6 })
  return (
    <group rotation-y={0.5}>
      <Box p={[0, 0.05, 0.1]} s={[0.46, 0.1, 0.95]} m={dark} />
      <Sph p={[0, 0.25, 0.4]} r={0.27} sc={[0.95, 0.8, 1.2]} m={leather} />
      <Box p={[0, 0.22, 0.05]} s={[0.46, 0.3, 0.6]} m={leather} />
      <Cyl p={[0, 0.55, -0.1]} t={0.24} b={0.26} h={0.7} m={leather} seg={18} />
      <Tor p={[0, 0.92, -0.1]} r={0.27} t={0.09} rot={[Math.PI / 2, 0, 0]} m={fur} />
      {[0.38, 0.52, 0.66, 0.8].map((y) => (
        <Box key={y} p={[0, y, 0.16]} s={[0.3, 0.03, 0.03]} m={lace} />
      ))}
    </group>
  )
}

function SnowyMug() {
  const blue = plastic('#8ec9ec', { roughness: 0.35 })
  const white = plastic(SNOW, { roughness: 0.9 })
  return (
    <group>
      <Cyl p={[0, 0.35, 0]} t={0.34} b={0.3} h={0.7} m={blue} />
      {[0.22, 0.32].map((y) => (
        <Tor key={y} p={[0, y, 0]} r={0.318} t={0.018} rot={[Math.PI / 2, 0, 0]} m={white} />
      ))}
      <Tor p={[0.34, 0.38, 0]} r={0.17} t={0.05} arc={Math.PI} rot={[0, 0, -Math.PI / 2]} m={blue} />
      <Sph p={[0, 0.72, 0]} r={0.31} sc={[1, 0.55, 1]} m={white} />
      <Sph p={[0.14, 0.9, 0.05]} r={0.1} sc={[1, 0.7, 1]} m={white} />
    </group>
  )
}

function CandyCane() {
  const red = plastic('#e02a35', { roughness: 0.35 })
  const white = plastic('#fbfbfb', { roughness: 0.35 })
  return (
    <group rotation={[0, 0.4, 0.08]}>
      {Array.from({ length: 6 }, (_, i) => (
        <Cyl key={i} p={[0, 0.065 + i * 0.13, 0]} t={0.07} h={0.13} m={i % 2 ? white : red} seg={14} />
      ))}
      <Tor p={[-0.2, 0.78, 0]} r={0.2} t={0.07} arc={Math.PI / 2} m={red} />
      <Tor p={[-0.2, 0.78, 0]} r={0.2} t={0.07} arc={Math.PI / 2} rot={[0, 0, Math.PI / 2]} m={white} />
      <Sph p={[-0.4, 0.78, 0]} r={0.07} m={white} seg={12} />
      <Tor p={[-0.2, 0.55, 0.08]} r={0.14} t={0.015} rot={[Math.PI / 2, 0, 0]} m={shine('#2fa84a', '#1a6a2a', 0.2)} />
    </group>
  )
}

function CoalButton() {
  const coal = plastic('#14151c', { roughness: 0.45, flatShading: true })
  const hi = plastic('#3a3d52', { roughness: 0.4, flatShading: true })
  const white = plastic(SNOW, { roughness: 0.9 })
  const spark = shine('#bfe6ff', '#7ac8ff', 0.9)
  return (
    <group>
      <Ico p={[0, 0.27, 0]} r={0.27} m={coal} />
      <Ico p={[-0.27, 0.2, 0.1]} r={0.2} m={hi} rot={[0.3, 0.5, 0]} />
      <Ico p={[0.27, 0.17, 0.14]} r={0.17} m={coal} rot={[0.6, 0.2, 0.4]} />
      <Ico p={[0.02, 0.2, -0.28]} r={0.2} m={hi} rot={[0.1, 0.9, 0]} />
      <Sph p={[0.05, 0.5, 0.05]} r={0.12} sc={[1, 0.5, 1]} m={white} />
      <Oct p={[-0.08, 0.38, 0.22]} r={0.04} m={spark} />
      <Oct p={[0.15, 0.3, 0.2]} r={0.03} m={spark} />
    </group>
  )
}

function CarrotNose() {
  const orange = plastic('#ff8a1f', { roughness: 0.55 })
  const dark = plastic('#d86a0a', { roughness: 0.6 })
  const leaf = plastic('#3aa850', { roughness: 0.6 })
  return (
    <group position={[0, 0.22, 0]} rotation-y={0.5}>
      <Cone r={0.2} h={0.9} m={orange} rot={[0, 0, -Math.PI / 2]} />
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <Tor key={x} p={[x, 0, 0]} r={(0.2 * (0.45 - x)) / 0.9 + 0.004} t={0.012} rot={[0, Math.PI / 2, 0]} m={dark} />
      ))}
      {[-0.5, 0, 0.5].map((a, i) => (
        <Cone key={i} p={[-0.55, Math.sin(a * 2) * 0.06, Math.cos(a * 2) * 0.06]} r={0.04} h={0.25} rot={[a, 0, Math.PI / 2]} m={leaf} seg={6} />
      ))}
    </group>
  )
}

function Snowball() {
  const white = plastic('#fbfdff', { roughness: 0.95 })
  const shade = plastic('#dcecf8', { roughness: 0.95 })
  const spark = shine('#e8f6ff', '#9ad8ff', 0.8)
  return (
    <group position={[0, 0.45, 0]}>
      <Sph r={0.45} m={white} seg={22} />
      <Sph p={[0.3, 0.18, 0.25]} r={0.18} m={shade} />
      <Sph p={[-0.3, 0.25, 0.2]} r={0.15} m={white} />
      <Sph p={[0.05, -0.1, 0.42]} r={0.14} m={shade} />
      <Sph p={[-0.1, 0.38, -0.2]} r={0.17} m={white} />
      <Oct p={[0.2, 0.38, 0.22]} r={0.04} m={spark} />
      <Oct p={[-0.35, -0.1, 0.28]} r={0.035} m={spark} />
    </group>
  )
}

function Icicle() {
  const ice = glass(ICE, 0.75)
  const core = glass('#e8f7ff', 0.85)
  const white = plastic(SNOW, { roughness: 0.95 })
  return (
    <group>
      <Sph p={[0, 0.04, 0]} r={0.35} sc={[1.3, 0.35, 1.3]} m={white} />
      <Cone p={[0, 0.58, 0]} r={0.17} h={1.1} m={ice} seg={7} />
      <Cone p={[0, 0.5, 0]} r={0.08} h={0.85} m={core} seg={7} />
      <Cone p={[0.26, 0.4, 0.05]} r={0.11} h={0.75} m={ice} seg={6} rot={[0, 0, -0.18]} />
      <Cone p={[-0.24, 0.32, -0.08]} r={0.09} h={0.55} m={ice} seg={6} rot={[0, 0, 0.2]} />
    </group>
  )
}

function TwigArm() {
  const bark = plastic('#6a4526', { roughness: 0.95 })
  const dark = plastic('#4a2f18', { roughness: 0.95 })
  const white = plastic(SNOW, { roughness: 0.95 })
  return (
    <group rotation-y={0.4} position={[0, 0, 0]}>
      <Cyl p={[0, 0.1, 0]} t={0.045} b={0.065} h={1.15} m={bark} r={[0, 0, Math.PI / 2]} seg={8} />
      <Cyl p={[0.24, 0.3, 0]} t={0.018} b={0.035} h={0.45} m={bark} r={[0, 0, -Math.PI / 4]} seg={6} />
      <Cyl p={[-0.2, 0.3, 0.02]} t={0.018} b={0.03} h={0.4} m={bark} r={[0, 0, Math.PI / 4]} seg={6} />
      <Cyl p={[0.5, 0.15, 0]} t={0.015} b={0.03} h={0.3} m={dark} r={[0, 0, -Math.PI / 3]} seg={6} />
      <Sph p={[-0.05, 0.19, 0]} r={0.1} sc={[1.5, 0.35, 1]} m={white} />
      <Sph p={[0.3, 0.4, 0.02]} r={0.05} sc={[1.2, 0.4, 1]} m={white} />
      <Sph p={[-0.58, 0.1, 0]} r={0.065} m={dark} />
    </group>
  )
}

function SnowflakeCharm() {
  const ice = shine('#d8f0ff', '#7ac8ff', 0.7)
  const silver = metal('#e8eef8')
  return (
    <group position={[0, 0.55, 0]}>
      <Spin speed={0.8}>
        <Flake len={0.42} m={ice} />
        <Oct r={0.07} m={shine('#ffffff', '#bfe6ff', 1)} />
      </Spin>
      <Tor p={[0, 0.5, 0]} r={0.06} t={0.018} m={silver} />
    </group>
  )
}

// ---- Uncommon ----

const BELL_PROFILE = [
  [0, 0.78], [0.1, 0.77], [0.18, 0.7], [0.24, 0.56], [0.29, 0.4], [0.34, 0.26], [0.42, 0.14], [0.52, 0.02],
].map(([r, y]) => new Vector2(r, y))

function Bell({ body, trim, ribbon = true, holly = true }) {
  const red = plastic(RED, { roughness: 0.5 })
  const leaf = plastic(GREEN, { roughness: 0.6, side: DoubleSide })
  return (
    <group position={[0, 0.05, 0]}>
      <mesh material={body}>
        <latheGeometry args={[BELL_PROFILE, 28]} />
      </mesh>
      <Tor p={[0, 0.03, 0]} r={0.51} t={0.04} rot={[Math.PI / 2, 0, 0]} m={trim} />
      <Tor p={[0, 0.5, 0]} r={0.26} t={0.025} rot={[Math.PI / 2, 0, 0]} m={trim} />
      <Tor p={[0, 0.9, 0]} r={0.09} t={0.03} m={trim} />
      <Sph p={[0, 0, 0]} r={0.11} m={trim} seg={12} />
      {ribbon && (
        <group position={[0, 0.82, 0.1]}>
          <Sph p={[-0.09, 0, 0]} r={0.09} sc={[1.3, 0.8, 0.5]} rot={[0, 0, 0.3]} m={red} />
          <Sph p={[0.09, 0, 0]} r={0.09} sc={[1.3, 0.8, 0.5]} rot={[0, 0, -0.3]} m={red} />
          <Sph r={0.045} m={red} />
        </group>
      )}
      {holly &&
        [-1, 1].map((s) => (
          <Sph key={s} p={[s * 0.1, 0.76, 0.17]} r={0.08} sc={[1.6, 0.5, 0.25]} rot={[0, 0, s * 0.5]} m={leaf} />
        ))}
    </group>
  )
}

function SilverBell() {
  return <Bell body={metal('#dfe6f2', { roughness: 0.22, side: DoubleSide })} trim={metal('#9aa8c0', { roughness: 0.3 })} />
}

function FrozenLunchbox() {
  const blue = plastic('#3f78b8', { roughness: 0.45 })
  const lid = plastic('#5a90cc', { roughness: 0.4 })
  const silver = metal('#d8e0ec')
  const frost = plastic(SNOW, { roughness: 0.95 })
  const ice = glass(ICE, 0.8)
  return (
    <group rotation-y={0.4}>
      <Box p={[0, 0.3, 0]} s={[0.95, 0.5, 0.45]} m={blue} />
      <Box p={[0, 0.63, 0]} s={[0.97, 0.16, 0.47]} m={lid} />
      <Box p={[0, 0.55, 0]} s={[0.98, 0.02, 0.48]} m={silver} />
      <Tor p={[0, 0.7, 0]} r={0.16} t={0.03} arc={Math.PI} m={silver} />
      {[-0.28, 0.28].map((x) => (
        <Box key={x} p={[x, 0.55, 0.245]} s={[0.1, 0.12, 0.03]} m={silver} />
      ))}
      <Sph p={[0.25, 0.73, 0.05]} r={0.16} sc={[1.5, 0.3, 1]} m={frost} />
      <Sph p={[-0.3, 0.72, -0.05]} r={0.1} sc={[1.4, 0.3, 1]} m={frost} />
      {[-0.35, -0.05, 0.3].map((x, i) => (
        <Cone key={x} p={[x, 0.46 - i * 0.02, 0.25]} r={0.03} h={0.16 + i * 0.04} rot={[Math.PI, 0, 0]} m={ice} seg={6} />
      ))}
    </group>
  )
}

function ToyRobot() {
  const red = plastic('#d8322f', { roughness: 0.4, metalness: 0.2 })
  const gray = metal('#b8c0cc', { roughness: 0.35 })
  const blue = plastic('#3a78d8', { roughness: 0.4 })
  const yellow = shine('#ffd83a', '#a07a00', 0.5)
  const dark = plastic('#22242c', { roughness: 0.5 })
  return (
    <group rotation-y={0.3}>
      {[-0.14, 0.14].map((x) => (
        <group key={x}>
          <Box p={[x, 0.15, 0]} s={[0.14, 0.24, 0.14]} m={gray} />
          <Box p={[x, 0.03, 0.03]} s={[0.2, 0.06, 0.24]} m={blue} />
        </group>
      ))}
      <Box p={[0, 0.5, 0]} s={[0.5, 0.5, 0.35]} m={red} />
      <Box p={[0, 0.55, 0.18]} s={[0.32, 0.22, 0.02]} m={blue} />
      {[-0.08, 0, 0.08].map((x, i) => (
        <Sph key={x} p={[x, 0.55, 0.2]} r={0.03} m={i === 1 ? yellow : plastic('#5af070', { emissive: '#2a9a40', emissiveIntensity: 0.6 })} seg={8} />
      ))}
      <Box p={[0, 0.93, 0]} s={[0.42, 0.28, 0.32]} m={gray} />
      {[-0.1, 0.1].map((x) => (
        <Sph key={x} p={[x, 0.97, 0.16]} r={0.055} m={yellow} seg={10} />
      ))}
      <Box p={[0, 0.85, 0.165]} s={[0.2, 0.04, 0.02]} m={dark} />
      <Cyl p={[0, 1.15, 0]} t={0.015} h={0.2} m={gray} seg={6} />
      <Sph p={[0, 1.27, 0]} r={0.045} m={red} seg={10} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl p={[s * 0.34, 0.5, 0]} t={0.05} h={0.36} m={gray} r={[0, 0, s * 0.25]} seg={10} />
          <Sph p={[s * 0.4, 0.32, 0]} r={0.075} m={yellow} seg={10} />
        </group>
      ))}
      <Tor p={[0, 0.5, -0.22]} r={0.07} t={0.02} m={metal(GOLD)} />
      <Box p={[0, 0.4, -0.22]} s={[0.03, 0.12, 0.02]} m={metal(GOLD)} />
    </group>
  )
}

function KnitScarf() {
  const red = plastic('#c42a35', { roughness: 0.95 })
  const white = plastic('#f4f0e8', { roughness: 0.95 })
  return (
    <group rotation-y={0.5}>
      {Array.from({ length: 5 }, (_, i) => (
        <Tor key={i} p={[0, 0.13 + i * 0.17, 0]} r={0.36 - (i % 2) * 0.01} t={0.12} rot={[Math.PI / 2, 0, 0]} m={i % 2 ? white : red} seg={22} />
      ))}
      <Box p={[0.12, 0.38, 0.5]} s={[0.26, 0.7, 0.07]} m={red} />
      {[0.55, 0.3].map((y) => (
        <Box key={y} p={[0.12, y, 0.54]} s={[0.27, 0.07, 0.01]} m={white} />
      ))}
      {[-0.09, -0.03, 0.03, 0.09, 0.15, 0.21, 0.27].map((dx) => (
        <Cyl key={dx} p={[0.12 + dx - 0.12, 0.0, 0.5]} t={0.012} h={0.1} m={red} seg={5} />
      ))}
    </group>
  )
}

function IceSkates() {
  const leather = plastic('#f4efe6', { roughness: 0.55 })
  const silver = metal('#dde6f2', { roughness: 0.2 })
  const red = plastic('#d8322f', { roughness: 0.5 })
  const fur = plastic(SNOW, { roughness: 1 })
  return (
    <group rotation-y={0.6}>
      <Box p={[0, 0.1, 0.02]} s={[0.04, 0.2, 0.95]} m={silver} />
      <Box p={[0, 0.2, 0.02]} s={[0.34, 0.06, 0.82]} m={plastic('#2c2a30')} />
      <Box p={[0, 0.4, -0.2]} s={[0.34, 0.34, 0.4]} m={leather} />
      <Sph p={[0, 0.38, 0.26]} r={0.22} sc={[0.95, 0.8, 1.25]} m={leather} />
      <Cyl p={[0, 0.65, -0.17]} t={0.17} b={0.2} h={0.6} m={leather} seg={16} />
      <Tor p={[0, 0.95, -0.17]} r={0.18} t={0.06} rot={[Math.PI / 2, 0, 0]} m={fur} />
      {[0.5, 0.62, 0.74, 0.86].map((y) => (
        <Box key={y} p={[0, y, 0.03]} s={[0.22, 0.025, 0.02]} m={red} />
      ))}
      <Box p={[0, 0.17, 0.5]} s={[0.04, 0.12, 0.15]} m={silver} r={[-0.5, 0, 0]} />
    </group>
  )
}

function ThermosFlask() {
  const red = plastic('#d83a35', { roughness: 0.3, metalness: 0.3 })
  const silver = metal('#dde4ee')
  const white = plastic('#fbfbfb', { roughness: 0.35 })
  return (
    <group>
      <Cyl p={[0, 0.06, 0]} t={0.23} h={0.1} m={plastic('#2c2a30')} />
      <Cyl p={[0, 0.5, 0]} t={0.22} h={0.85} m={red} />
      <Cyl p={[0, 0.35, 0]} t={0.225} h={0.07} m={white} />
      <Cyl p={[0, 0.55, 0]} t={0.225} h={0.07} m={white} />
      <Cyl p={[0, 1.0, 0]} t={0.24} h={0.22} m={silver} />
      <Tor p={[0, 0.9, 0]} r={0.235} t={0.02} rot={[Math.PI / 2, 0, 0]} m={silver} />
      <Cyl p={[0, 1.14, 0]} t={0.1} h={0.08} m={red} seg={12} />
      <Tor p={[0.22, 0.65, 0]} r={0.16} t={0.025} arc={Math.PI} rot={[0, 0, -Math.PI / 2]} m={plastic('#2c2a30')} />
      <Sph p={[0.05, 1.15, 0.05]} r={0.1} sc={[1.2, 0.4, 1]} m={plastic(SNOW, { roughness: 1 })} />
    </group>
  )
}

function GingerbreadMan() {
  const brown = plastic('#b3702f', { roughness: 0.8 })
  const icing = plastic('#fffaf0', { roughness: 0.6 })
  const black = plastic('#2a1a10')
  const gum = [plastic(RED, { roughness: 0.4 }), plastic('#2fa84a', { roughness: 0.4 })]
  return (
    <group rotation-y={0.35}>
      <Sph p={[0, 0.66, 0]} r={0.3} sc={[1, 1.15, 0.35]} m={brown} />
      <Sph p={[0, 1.0, 0]} r={0.2} sc={[1, 1, 0.5]} m={brown} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[s * 0.4, 0.78, 0]} s={[0.38, 0.15, 0.13]} r={[0, 0, s * 0.45]} m={brown} />
          <Sph p={[s * 0.56, 0.9, 0]} r={0.09} sc={[1, 1, 0.7]} m={brown} />
          <Box p={[s * 0.52, 0.87, 0]} s={[0.07, 0.16, 0.14]} r={[0, 0, s * 0.45]} m={icing} />
          <Box p={[s * 0.15, 0.22, 0]} s={[0.17, 0.42, 0.13]} r={[0, 0, s * 0.18]} m={brown} />
          <Sph p={[s * 0.19, 0.04, 0]} r={0.1} sc={[1.2, 0.8, 0.7]} m={brown} />
          <Box p={[s * 0.18, 0.07, 0]} s={[0.19, 0.06, 0.14]} m={icing} />
        </group>
      ))}
      {[-0.07, 0.07].map((x) => (
        <Sph key={x} p={[x, 1.04, 0.1]} r={0.025} m={black} seg={8} />
      ))}
      <Tor p={[0, 0.98, 0.1]} r={0.07} t={0.012} arc={Math.PI} rot={[0, 0, Math.PI]} m={icing} />
      {[0.78, 0.66, 0.54].map((y, i) => (
        <Sph key={y} p={[0, y, 0.11]} r={0.035} m={gum[i % 2]} seg={10} />
      ))}
      <Tor p={[0, 0.88, 0.1]} r={0.1} t={0.012} arc={Math.PI} rot={[0, 0, Math.PI]} m={icing} />
    </group>
  )
}

function SledRunner() {
  const wood = plastic(WOOD, { roughness: 0.75 })
  const light = plastic('#b07a45', { roughness: 0.75 })
  const steel = metal('#c8d0dc', { roughness: 0.25 })
  const red = plastic(RED, { roughness: 0.6 })
  const snow = plastic(SNOW, { roughness: 1 })
  return (
    <group rotation-y={0.5}>
      {[-0.36, -0.12, 0.12, 0.36].map((z, i) => (
        <Box key={z} p={[0, 0.3, z]} s={[0.72, 0.05, 0.19]} m={i % 2 ? wood : light} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[s * 0.3, 0.06, -0.05]} s={[0.05, 0.05, 1.1]} m={steel} />
          <Box p={[s * 0.3, 0.16, 0.62]} s={[0.05, 0.05, 0.28]} r={[-0.8, 0, 0]} m={steel} />
          {[-0.3, 0.3].map((z) => (
            <Box key={z} p={[s * 0.3, 0.18, z]} s={[0.05, 0.24, 0.05]} m={steel} />
          ))}
        </group>
      ))}
      <Tor p={[0, 0.32, 0.72]} r={0.12} t={0.02} rot={[Math.PI / 2, 0, 0]} m={red} />
      <Sph p={[0.1, 0.35, -0.1]} r={0.14} sc={[1.6, 0.3, 1.2]} m={snow} />
    </group>
  )
}

function Pinecone() {
  const scale = plastic('#7a4f2a', { roughness: 0.9 })
  const tip = plastic('#a8784a', { roughness: 0.9 })
  const core = plastic('#5a3a1e', { roughness: 0.9 })
  const layers = 8
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.45, 0]} material={core}>
        <cylinderGeometry args={[0.06, 0.1, 0.9, 8]} />
      </mesh>
      {/* Rings of overlapping scales, widest just below the middle */}
      {Array.from({ length: layers }, (_, l) => {
        const t = (l + 0.5) / layers
        const r = 0.08 + Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.24
        const n = 7
        return Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + (l % 2) * (Math.PI / n)
          return (
            <group key={`${l}-${i}`} position={[0, 0.06 + t * 0.85, 0]} rotation-y={-a}>
              <mesh position={[r * 0.6, 0, 0]} rotation-z={-(Math.PI / 2 + 0.45)} scale={[1, 1, 0.45]} material={l % 2 ? tip : scale}>
                <coneGeometry args={[0.08, r + 0.08, 5]} />
              </mesh>
            </group>
          )
        })
      })}
      {/* Little woody stalk */}
      <mesh position={[0, 0.98, 0]} material={core}>
        <cylinderGeometry args={[0.02, 0.03, 0.12, 6]} />
      </mesh>
    </group>
  )
}

const AURORA = ['#3affa0', '#3ae8d0', '#3ab8ff', '#7a6aff', '#c06aff', '#ff6ad0']

function AuroraVeil() {
  const silver = metal('#e8eef8', { roughness: 0.2 })
  const gem = shine('#7affd8', '#3affb0', 1.2)
  const panels = AURORA.map((c) => shine(c, c, 0.9, { transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false }))
  const w = 0.17
  return (
    <group position={[0, -0.1, 0]}>
      {/* Folded curtain of light hanging from a tiara */}
      {AURORA.map((_, i) => {
        const x = (i - (AURORA.length - 1) / 2) * w * 0.9
        return (
          <mesh
            key={i}
            position={[x, -0.05 - (i % 2) * 0.05, 0]}
            rotation-y={i % 2 ? 0.55 : -0.55}
            material={panels[i]}
          >
            <planeGeometry args={[w, 0.9 - Math.abs(i - 2.5) * 0.08]} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.42, 0]} rotation-z={Math.PI} material={silver}>
        <torusGeometry args={[0.5, 0.03, 8, 32, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={silver}>
        <boxGeometry args={[0.9, 0.04, 0.04]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={gem}>
        <octahedronGeometry args={[0.08, 0]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 0.47, 0]} material={gem}>
          <octahedronGeometry args={[0.04, 0]} />
        </mesh>
      ))}
    </group>
  )
}

// ---- Rare ----

function GiftBox() {
  const paper = plastic('#d8322f', { roughness: 0.45 })
  const ribbon = plastic('#ffe27a', { roughness: 0.3, metalness: 0.4 })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group rotation-y={0.4}>
      <Box p={[0, 0.35, 0]} s={[0.7, 0.7, 0.7]} m={paper} />
      <Box p={[0, 0.35, 0]} s={[0.12, 0.72, 0.72]} m={ribbon} />
      <Box p={[0, 0.35, 0]} s={[0.72, 0.72, 0.12]} m={ribbon} />
      {[-1, 1].map((s) => (
        <Tor key={s} p={[s * 0.12, 0.8, 0]} r={0.12} t={0.035} rot={[0, s * 0.6, s * 0.5]} m={ribbon} />
      ))}
      <Sph p={[0, 0.74, 0]} r={0.06} m={ribbon} />
      <Sph p={[0.18, 0.72, 0.12]} r={0.15} sc={[1.5, 0.3, 1.1]} m={white} />
    </group>
  )
}

function OrnamentBauble() {
  const red = metal('#d8322f', { roughness: 0.12, metalness: 0.5 })
  const gold = metal(GOLD)
  const white = plastic('#fbfbfb', { roughness: 0.3 })
  return (
    <group position={[0, 0.5, 0]}>
      <Sph r={0.4} m={red} seg={24} />
      <Tor p={[0, 0.04, 0]} r={0.4} t={0.03} rot={[Math.PI / 2, 0, 0]} m={white} />
      <Tor p={[0, 0.22, 0]} r={0.34} t={0.025} rot={[Math.PI / 2, 0, 0]} m={gold} />
      <Tor p={[0, -0.18, 0]} r={0.37} t={0.025} rot={[Math.PI / 2, 0, 0]} m={gold} />
      <Cyl p={[0, 0.42, 0]} t={0.1} h={0.1} m={gold} seg={14} />
      <Tor p={[0, 0.55, 0]} r={0.06} t={0.015} m={gold} />
      <Sph p={[-0.17, 0.18, 0.32]} r={0.07} sc={[1, 1.5, 0.5]} m={plastic('#ffffff', { transparent: true, opacity: 0.55 })} />
    </group>
  )
}

function MistletoeWreath() {
  const leaf = plastic('#2f8f4e', { roughness: 0.6 })
  const leaf2 = plastic('#3fae5f', { roughness: 0.6 })
  const berry = plastic('#fbf8f0', { roughness: 0.3 })
  const red = plastic(RED, { roughness: 0.4 })
  return (
    <group position={[0, 0.66, 0]} rotation-x={0.15}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <Sph key={i} p={[Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0]} r={0.12} sc={[1.5, 0.7, 0.5]} rot={[0, 0, a + Math.PI / 2 + (i % 2 ? 0.4 : -0.4)]} m={i % 2 ? leaf : leaf2} />
        )
      })}
      {[0.4, 1.7, 3.2, 4.4, 5.4].map((a) => (
        <Sph key={a} p={[Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0.08]} r={0.05} m={berry} seg={10} />
      ))}
      <group position={[0, -0.38, 0.06]}>
        {[-1, 1].map((s) => (
          <Sph key={s} p={[s * 0.1, -0.02, 0]} r={0.1} sc={[1.3, 0.8, 0.5]} rot={[0, 0, -s * 0.3]} m={red} />
        ))}
        <Sph r={0.05} m={red} />
        {[-1, 1].map((s) => (
          <Box key={s} p={[s * 0.07, -0.16, 0]} s={[0.06, 0.2, 0.02]} r={[0, 0, s * 0.2]} m={red} />
        ))}
      </group>
    </group>
  )
}

function SnowGoggles() {
  const frame = plastic('#2a3a5a', { roughness: 0.5 })
  const lens = shine('#ff9a3a', '#c05a00', 0.25, { transparent: true, opacity: 0.8 })
  const strap = plastic('#c42a35', { roughness: 0.9 })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group position={[0, 0.4, 0]} rotation-y={0.1}>
      <Tor r={0.5} t={0.07} arc={Math.PI * 2} rot={[0, Math.PI / 2, 0]} m={strap} seg={28} sc={[1, 0.6, 1]} />
      <Box s={[0.9, 0.38, 0.12]} m={frame} p={[0, 0, 0.35]} />
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <Cyl p={[x, 0, 0.42]} t={0.18} h={0.06} m={lens} r={[Math.PI / 2, 0, 0]} seg={20} />
          <Tor p={[x, 0, 0.42]} r={0.18} t={0.025} m={frame} />
        </group>
      ))}
      <Box p={[0, -0.2, 0.4]} s={[0.35, 0.04, 0.08]} m={white} />
    </group>
  )
}

function HotCocoaPot() {
  const pot = plastic('#b8322f', { roughness: 0.35 })
  const steel = metal('#d8dee8')
  const dark = plastic('#2c2a30')
  const mallow = plastic('#fff6ee', { roughness: 0.9 })
  const steam = plastic('#ffffff', { transparent: true, opacity: 0.35, depthWrite: false })
  return (
    <group scale={[0.85, 0.85, 0.85]}>
      <Cyl p={[0, 0.38, 0]} t={0.36} b={0.32} h={0.7} m={pot} />
      <Cyl p={[0, 0.76, 0]} t={0.37} h={0.1} m={steel} />
      <Sph p={[0, 0.8, 0]} r={0.33} sc={[1, 0.4, 1]} m={pot} />
      <Sph p={[0, 0.96, 0]} r={0.06} m={dark} seg={10} />
      <Tor p={[0.38, 0.4, 0]} r={0.2} t={0.05} arc={Math.PI} rot={[0, 0, -Math.PI / 2]} m={dark} />
      <Cone p={[-0.4, 0.55, 0]} r={0.07} h={0.2} m={pot} rot={[0, 0, Math.PI / 2 + 0.3]} seg={10} />
      {[0, 1, 2].map((i) => (
        <Sph key={i} p={[Math.sin(i * 2.1) * 0.12, 1.1 + i * 0.18, Math.cos(i * 2.1) * 0.1]} r={0.07 + i * 0.03} sc={[1, 0.8, 1]} m={steam} />
      ))}
      <Sph p={[0.18, 0.88, 0.1]} r={0.06} m={mallow} seg={8} />
      <Sph p={[0.1, 0.86, -0.15]} r={0.05} m={mallow} seg={8} />
    </group>
  )
}

function Snowshoes() {
  const wood = plastic('#a8743d', { roughness: 0.7 })
  const net = plastic('#e8d8b0', { roughness: 0.9 })
  const strap = plastic('#c42a35', { roughness: 0.8 })
  const shoe = (x, z, ry) => (
    <group position={[x, 0.08, z]} rotation-y={ry}>
      <Tor r={0.5} t={0.035} rot={[Math.PI / 2, 0, 0]} sc={[0.55, 1, 1]} m={wood} seg={28} />
      {[-0.3, -0.15, 0, 0.15, 0.3].map((zz) => (
        <Box key={zz} p={[0, 0, zz]} s={[0.5 * (1 - Math.abs(zz) * 1.1), 0.012, 0.012]} m={net} />
      ))}
      {[-0.15, 0, 0.15].map((xx) => (
        <Box key={xx} p={[xx, 0, 0]} s={[0.012, 0.012, 0.8 * (1 - Math.abs(xx) * 1.2)]} m={net} />
      ))}
      <Box p={[0, 0.03, 0.05]} s={[0.3, 0.025, 0.07]} m={strap} />
      <Box p={[0, 0.04, -0.08]} s={[0.3, 0.025, 0.07]} m={strap} />
    </group>
  )
  return (
    <group>
      {shoe(-0.3, 0, 0.1)}
      {shoe(0.3, 0.05, -0.1)}
    </group>
  )
}

function Skis() {
  const blue = plastic('#2f78d8', { roughness: 0.3 })
  const white = plastic('#fbfbfb', { roughness: 0.4 })
  const dark = plastic('#22242c', { roughness: 0.5 })
  const ski = (rot, y) => (
    <group rotation={rot} position={[0, y, 0]}>
      <Box s={[0.14, 0.04, 1.5]} m={blue} />
      <Box p={[0, 0.025, 0]} s={[0.05, 0.01, 1.5]} m={white} />
      <Box p={[0, 0.03, 0.82]} s={[0.14, 0.04, 0.3]} r={[-0.5, 0, 0]} m={blue} />
      <Box p={[0, 0.07, 0.1]} s={[0.12, 0.08, 0.3]} m={dark} />
    </group>
  )
  return (
    <group position={[0, 0.02, 0]}>
      {ski([0, 0.35, 0], 0.03)}
      {ski([0, -0.35, 0], 0.1)}
    </group>
  )
}

function Lantern({ glowColor = '#ffb84a', glowEmissive = '#ff8a1a', aurora = false }) {
  const iron = metal('#3a4458', { roughness: 0.45 })
  const glassM = glass('#d8f0ff', 0.28)
  const flame = shine(glowColor, glowEmissive, 1.6)
  const frost = plastic(SNOW, { roughness: 1 })
  const panels = ['#3affa0', '#3ab8ff', '#c06aff']
  return (
    <group scale={[0.72, 0.72, 0.72]}>
      <Cyl p={[0, 0.06, 0]} t={0.3} b={0.34} h={0.12} m={iron} seg={6} />
      <Cyl p={[0, 0.52, 0]} t={0.3} b={0.27} h={0.8} m={glassM} seg={6} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return <Cyl key={i} p={[Math.cos(a) * 0.285, 0.52, Math.sin(a) * 0.285]} t={0.022} h={0.8} m={iron} seg={6} />
      })}
      <Cone p={[0, 1.04, 0]} r={0.36} h={0.24} m={iron} seg={6} />
      <Tor p={[0, 1.24, 0]} r={0.1} t={0.025} m={iron} />
      <Tor p={[0, 1.34, 0]} r={0.3} t={0.025} arc={Math.PI} m={iron} />
      <Cyl p={[0, 0.3, 0]} t={0.045} h={0.35} m={plastic('#f4f0e0')} seg={10} />
      <Sph p={[0, 0.56, 0]} r={0.1} sc={[0.8, 1.5, 0.8]} m={flame} />
      {aurora &&
        panels.map((c, i) => (
          <Spin key={c} speed={0.5 + i * 0.2} position={[0, 0.55, 0]}>
            <Sph p={[0.18, 0.05 * i, 0]} r={0.06} m={shine(c, c, 1.4)} seg={10} />
          </Spin>
        ))}
      <Sph p={[0, 1.15, 0.05]} r={0.2} sc={[1.2, 0.3, 1]} m={frost} />
    </group>
  )
}

function MusicBox() {
  const wood = plastic('#7a4a2a', { roughness: 0.55 })
  const gold = metal(GOLD)
  const velvet = plastic('#a02a3a', { roughness: 0.95 })
  const white = plastic(SNOW, { roughness: 0.6 })
  const ice = shine('#d8f0ff', '#7ac8ff', 0.7)
  return (
    <group rotation-y={0.4}>
      <Box p={[0, 0.25, 0]} s={[0.9, 0.5, 0.6]} m={wood} />
      <Box p={[0, 0.51, 0]} s={[0.84, 0.03, 0.54]} m={velvet} />
      {[-1, 1].map((s) => (
        <Box key={s} p={[s * 0.45, 0.25, 0]} s={[0.02, 0.5, 0.62]} m={gold} />
      ))}
      <Box p={[0, 0.78, -0.4]} s={[0.92, 0.55, 0.05]} r={[-0.35, 0, 0]} m={wood} />
      <Box p={[0, 0.78, -0.37]} s={[0.78, 0.4, 0.02]} r={[-0.35, 0, 0]} m={gold} />
      <Cyl p={[0.52, 0.22, 0]} t={0.03} h={0.1} m={gold} r={[0, 0, Math.PI / 2]} seg={8} />
      <Box p={[0.58, 0.22, 0]} s={[0.02, 0.14, 0.04]} m={gold} />
      <Spin speed={1}>
        <Cyl p={[0, 0.62, 0]} t={0.045} b={0.07} h={0.2} m={white} seg={10} />
        <Sph p={[0, 0.76, 0]} r={0.045} m={plastic('#f4cfa8')} seg={10} />
        <Flake len={0.12} w={0.02} depth={0.02} m={ice} branches={false} />
      </Spin>
    </group>
  )
}

function IceAxe() {
  return (
    <group rotation-y={1.1}>
      <IceAxeBody />
    </group>
  )
}

function IceAxeBody() {
  const shaft = metal('#4a9ad8', { roughness: 0.35 })
  const steel = metal('#e4ecf6', { roughness: 0.2 })
  const grip = plastic('#d8322f', { roughness: 0.8 })
  const rope = plastic('#f4c542', { roughness: 0.9 })
  return (
    <group position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0.4, 0.15]}>
      <Cyl t={0.04} h={1.4} m={shaft} seg={10} />
      <Cyl p={[0, -0.25, 0]} t={0.052} h={0.5} m={grip} seg={10} />
      <Cone p={[0, -0.74, 0]} r={0.04} h={0.12} m={steel} rot={[Math.PI, 0, 0]} seg={8} />
      <Box p={[0, 0.7, 0]} s={[0.18, 0.1, 0.07]} m={steel} />
      <Cone p={[-0.3, 0.72, 0]} r={0.05} h={0.5} m={steel} rot={[0, 0, Math.PI / 2 + 0.25]} seg={6} />
      <Box p={[0.15, 0.72, 0]} s={[0.22, 0.1, 0.05]} m={steel} r={[0, 0, -0.25]} />
      <Tor p={[0, 0.5, 0]} r={0.09} t={0.018} rot={[0, Math.PI / 2, 0]} m={rope} />
    </group>
  )
}

function SnowmanHat() {
  const black = plastic('#1a1b22', { roughness: 0.55 })
  const band = plastic(RED, { roughness: 0.6 })
  const leaf = plastic(GREEN, { roughness: 0.6 })
  const berry = plastic(RED, { roughness: 0.3 })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group>
      <Cyl p={[0, 0.04, 0]} t={0.52} h={0.08} m={black} seg={28} />
      <Cyl p={[0, 0.45, 0]} t={0.3} b={0.32} h={0.8} m={black} seg={24} />
      <Cyl p={[0, 0.88, 0]} t={0.3} h={0.04} m={black} seg={24} />
      <Cyl p={[0, 0.2, 0]} t={0.325} b={0.335} h={0.16} m={band} seg={24} />
      {[-1, 1].map((s) => (
        <Sph key={s} p={[s * 0.1, 0.22, 0.33]} r={0.09} sc={[1.5, 0.6, 0.3]} rot={[0, 0, s * 0.4]} m={leaf} />
      ))}
      {[-0.03, 0.05, 0.01].map((x, i) => (
        <Sph key={i} p={[x, 0.18 + (i % 2) * 0.07, 0.36]} r={0.035} m={berry} seg={8} />
      ))}
      <Sph p={[0.1, 0.91, 0.05]} r={0.2} sc={[1.5, 0.3, 1.2]} m={white} />
      <Sph p={[-0.3, 0.07, 0.35]} r={0.12} sc={[1.5, 0.3, 1]} m={white} />
    </group>
  )
}

// Cluster of hexagonal ice crystals; `m` / `core` are the outer and inner materials.
function CrystalCluster({ m, core, scale = 1 }) {
  const spec = [
    [0, 0, 0, 0.16, 1.05, 0],
    [0.22, 0, 0.05, 0.12, 0.75, -0.35],
    [-0.22, 0, -0.04, 0.11, 0.65, 0.4],
    [0.05, 0, 0.22, 0.1, 0.6, 0.25],
    [-0.08, 0, -0.22, 0.09, 0.5, -0.3],
  ]
  return (
    <group scale={[scale, scale, scale]}>
      {spec.map(([x, , z, r, hgt, tilt], i) => (
        <group key={i} position={[x, 0, z]} rotation={[tilt * 0.6, 0, tilt]}>
          <Cyl p={[0, hgt / 2, 0]} t={r} h={hgt} m={m} seg={6} />
          <Cone p={[0, hgt + r * 0.9, 0]} r={r} h={r * 1.8} m={m} seg={6} />
          <Cyl p={[0, hgt / 2, 0]} t={r * 0.45} h={hgt} m={core} seg={6} />
        </group>
      ))}
    </group>
  )
}

function FrostCrystal() {
  return <CrystalCluster m={glass(ICE_DEEP, 0.7)} core={shine('#e8f8ff', '#7ac8ff', 0.8)} />
}

function RoyalChristmasChest() {
  const red = plastic('#c42a35', { roughness: 0.4 })
  const gold = metal(GOLD, { emissive: '#7a5000', emissiveIntensity: 0.25 })
  const green = plastic('#2f8f4e', { roughness: 0.5 })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group rotation-y={0.4}>
      <Box p={[0, 0.25, 0]} s={[1, 0.5, 0.62]} m={red} />
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.62, 1, 1]} material={red}>
        <cylinderGeometry args={[0.5, 0.5, 1, 20, 1, false, 0, Math.PI]} />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <group key={x}>
          <Box p={[x, 0.25, 0]} s={[0.1, 0.52, 0.64]} m={gold} />
          <mesh position={[x, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.64, 1, 1]} material={gold}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 20, 1, false, 0, Math.PI]} />
          </mesh>
        </group>
      ))}
      <Box p={[0, 0.5, 0]} s={[1.02, 0.04, 0.64]} m={gold} />
      <Box p={[0, 0.45, 0.33]} s={[0.14, 0.18, 0.04]} m={gold} />
      <Sph p={[0, 0.45, 0.36]} r={0.03} m={plastic('#3a2a1a')} seg={8} />
      {[-1, 1].map((s) => (
        <Tor key={s} p={[s * 0.1, 1.06, 0]} r={0.1} t={0.035} rot={[0, s * 0.6, s * 0.4]} m={green} />
      ))}
      <Sph p={[0, 1.02, 0]} r={0.06} m={green} />
      <Sph p={[-0.25, 1.0, 0.12]} r={0.17} sc={[1.5, 0.3, 1]} m={white} />
    </group>
  )
}

// ---- Epic ----

function YetiFootprintCast() {
  const slab = glass('#cfeaff', 0.85)
  const deep = plastic('#6aa8d8', { roughness: 0.4 })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group rotation-y={0.3}>
      <Box p={[0, 0.15, 0]} s={[0.95, 0.3, 1.2]} m={slab} />
      <Sph p={[0, 0.31, -0.18]} r={0.27} sc={[0.85, 0.15, 1.5]} m={deep} />
      {[-0.27, -0.14, 0, 0.14, 0.27].map((x, i) => (
        <Sph key={x} p={[x, 0.31, 0.3 + Math.cos(i * 0.8 - 1.6) * 0.1]} r={0.075} sc={[1, 0.2, 1.2]} m={deep} seg={10} />
      ))}
      {[-0.3, 0.1].map((x, i) => (
        <Cone key={x} p={[x, 0.36, -0.5 + i * 0.1]} r={0.03} h={0.2} m={white} seg={6} />
      ))}
      <Sph p={[0.38, 0.32, -0.45]} r={0.12} sc={[1.5, 0.3, 1]} m={white} />
    </group>
  )
}

function PenguinStatue() {
  const black = plastic('#1d2330', { roughness: 0.4 })
  const white = plastic('#fbfbfb', { roughness: 0.5 })
  const orange = plastic('#ff9a2a', { roughness: 0.5 })
  const ice = glass(ICE, 0.7)
  return (
    <group>
      <Cyl p={[0, 0.08, 0]} t={0.42} b={0.46} h={0.16} m={ice} seg={10} />
      <Sph p={[0, 0.52, 0]} r={0.34} sc={[1, 1.3, 0.85]} m={black} />
      <Sph p={[0, 0.5, 0.1]} r={0.28} sc={[0.9, 1.25, 0.7]} m={white} />
      <Sph p={[0, 1.0, 0]} r={0.2} m={black} />
      <Cone p={[0, 0.98, 0.22]} r={0.05} h={0.16} m={orange} rot={[Math.PI / 2, 0, 0]} seg={8} />
      {[-0.08, 0.08].map((x) => (
        <Sph key={x} p={[x, 1.04, 0.17]} r={0.03} m={white} seg={8} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Sph p={[s * 0.34, 0.55, 0]} r={0.12} sc={[0.4, 1.5, 0.8]} rot={[0, 0, s * 0.3]} m={black} />
          <Sph p={[s * 0.13, 0.19, 0.2]} r={0.09} sc={[1.3, 0.4, 1.6]} m={orange} seg={10} />
        </group>
      ))}
      <Tor p={[0, 0.77, 0.04]} r={0.22} t={0.05} rot={[Math.PI / 2, 0, 0]} m={plastic(RED, { roughness: 0.9 })} />
      <Box p={[0.12, 0.62, 0.22]} s={[0.1, 0.28, 0.04]} m={plastic(RED, { roughness: 0.9 })} r={[0, 0, 0.1]} />
    </group>
  )
}

function ReindeerAntlers() {
  const horn = plastic('#8a6a46', { roughness: 0.8 })
  const wood = plastic('#5a3a22', { roughness: 0.7 })
  const gold = metal(GOLD)
  const white = plastic(SNOW, { roughness: 1 })
  const antler = (s) => (
    <group position={[s * 0.18, 0.28, 0]} rotation={[0, 0, -s * 0.5]}>
      <Cyl p={[0, 0.35, 0]} t={0.035} b={0.05} h={0.7} m={horn} seg={8} />
      {[0.2, 0.42, 0.62].map((y, i) => (
        <Cyl key={y} p={[s * 0.1, y + 0.1, 0.04 * (i % 2 ? -1 : 1)]} t={0.02} b={0.032} h={0.3 - i * 0.04} m={horn} r={[0, 0, -s * 0.9]} seg={6} />
      ))}
      <Cyl p={[s * 0.04, 0.78, 0]} t={0.015} b={0.03} h={0.2} m={horn} r={[0, 0, -s * 0.3]} seg={6} />
    </group>
  )
  return (
    <group>
      <Box p={[0, 0.12, -0.1]} s={[0.8, 0.24, 0.1]} m={wood} />
      <Sph p={[0, 0.2, -0.04]} r={0.14} sc={[1.2, 0.8, 0.6]} m={horn} />
      <Box p={[0, 0.12, -0.04]} s={[0.5, 0.05, 0.03]} m={gold} />
      {antler(-1)}
      {antler(1)}
      <Sph p={[0.35, 0.55, 0]} r={0.08} sc={[1.5, 0.4, 1]} m={white} />
    </group>
  )
}

function SleighBellSet() {
  const leather = plastic('#7a2a22', { roughness: 0.7 })
  const gold = metal(GOLD, { emissive: '#7a5000', emissiveIntensity: 0.2 })
  const dark = plastic('#3a2a10')
  const holly = plastic(GREEN, { roughness: 0.6 })
  return (
    <group position={[0, 0.02, 0]}>
      <Tor p={[0, 0.5, 0]} r={0.4} t={0.04} arc={Math.PI} m={leather} />
      <Box p={[-0.4, 0.25, 0]} s={[0.08, 0.5, 0.03]} m={leather} />
      <Box p={[0.4, 0.25, 0]} s={[0.08, 0.5, 0.03]} m={leather} />
      {[-0.3, -0.1, 0.1, 0.3].map((x, i) => {
        const y = 0.5 + Math.sqrt(0.16 - x * x) * 0.9 - 0.42
        return (
          <group key={x} position={[x, y + 0.1 - (i % 2) * 0.12, 0.04]}>
            <Sph r={0.13} m={gold} />
            <Box p={[0, -0.02, 0.12]} s={[0.1, 0.012, 0.02]} m={dark} />
            <Sph p={[0, -0.04, 0.115]} r={0.02} m={dark} seg={6} />
          </group>
        )
      })}
      {[-1, 1].map((s) => (
        <Sph key={s} p={[s * 0.08, 0.92, 0.04]} r={0.07} sc={[1.6, 0.5, 0.3]} rot={[0, 0, s * 0.5]} m={holly} />
      ))}
    </group>
  )
}

function SantasHat() {
  const red = plastic('#d8322f', { roughness: 0.9 })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group rotation-z={-0.1}>
      <Tor p={[0, 0.17, 0]} r={0.44} t={0.14} rot={[Math.PI / 2, 0, 0]} m={white} seg={26} />
      <Cone p={[0, 0.58, 0]} r={0.42} h={0.9} m={red} seg={26} />
      <group position={[0.2, 0.95, 0]} rotation-z={-1.0}>
        <Cone p={[0, 0.1, 0]} r={0.2} h={0.5} m={red} seg={16} />
        <Sph p={[0, 0.4, 0]} r={0.14} m={white} />
      </group>
    </group>
  )
}

function Nutcracker() {
  const coat = plastic('#c42a35', { roughness: 0.45 })
  const gold = metal(GOLD)
  const black = plastic('#1a1b22', { roughness: 0.4 })
  const skin = plastic('#f0c8a0', { roughness: 0.5 })
  const white = plastic(SNOW, { roughness: 0.9 })
  const blue = plastic('#2a4a8a', { roughness: 0.5 })
  return (
    <group>
      <Cyl p={[0, 0.04, 0]} t={0.28} h={0.08} m={plastic(WOOD)} seg={14} />
      <Box p={[-0.1, 0.22, 0]} s={[0.14, 0.3, 0.16]} m={blue} />
      <Box p={[0.1, 0.22, 0]} s={[0.14, 0.3, 0.16]} m={blue} />
      <Box p={[0, 0.55, 0]} s={[0.4, 0.45, 0.24]} m={coat} />
      <Box p={[0, 0.5, 0.125]} s={[0.4, 0.05, 0.01]} m={gold} />
      {[0.7, 0.58, 0.46].map((y) => (
        <Sph key={y} p={[0, y, 0.13]} r={0.025} m={gold} seg={8} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Cyl p={[s * 0.26, 0.55, 0]} t={0.055} h={0.38} m={coat} seg={10} />
          <Sph p={[s * 0.26, 0.35, 0]} r={0.06} m={white} seg={10} />
          <Box p={[s * 0.18, 0.78, 0]} s={[0.1, 0.04, 0.2]} m={gold} />
        </group>
      ))}
      <Box p={[0, 0.9, 0]} s={[0.3, 0.2, 0.26]} m={skin} />
      <Box p={[0, 0.78, 0.04]} s={[0.28, 0.1, 0.22]} m={skin} />
      <Box p={[0, 0.77, 0.15]} s={[0.22, 0.03, 0.01]} m={black} />
      {[-0.07, 0.07].map((x) => (
        <Sph key={x} p={[x, 0.93, 0.13]} r={0.03} m={black} seg={8} />
      ))}
      <Sph p={[0, 0.82, 0.13]} r={0.12} sc={[1, 0.6, 0.5]} m={white} />
      <Cyl p={[0, 1.18, 0]} t={0.15} b={0.17} h={0.38} m={black} seg={18} />
      <Cyl p={[0, 1.0, 0]} t={0.18} h={0.05} m={gold} seg={18} />
      <Sph p={[0, 1.4, 0]} r={0.05} m={gold} seg={8} />
      <Box p={[0, 1.2, 0.17]} s={[0.1, 0.22, 0.01]} m={gold} />
    </group>
  )
}

function PolarBearPlush() {
  const fur = plastic('#fbfbfb', { roughness: 1 })
  const shade = plastic('#e8eef4', { roughness: 1 })
  const black = plastic('#1d2330', { roughness: 0.4 })
  const scarf = plastic(RED, { roughness: 0.95 })
  return (
    <group rotation-y={0.2}>
      <Sph p={[0, 0.38, 0]} r={0.36} sc={[1, 1.05, 0.9]} m={fur} seg={20} />
      <Sph p={[0, 0.9, 0.02]} r={0.26} m={fur} seg={20} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Sph p={[s * 0.2, 1.1, 0]} r={0.09} m={shade} seg={10} />
          <Sph p={[s * 0.38, 0.45, 0.08]} r={0.13} sc={[0.8, 1.3, 0.8]} rot={[0, 0, s * 0.4]} m={fur} />
          <Sph p={[s * 0.2, 0.08, 0.15]} r={0.14} sc={[1, 0.8, 1.3]} m={shade} />
          <Sph p={[s * 0.09, 0.93, 0.24]} r={0.03} m={black} seg={8} />
        </group>
      ))}
      <Sph p={[0, 0.84, 0.25]} r={0.1} sc={[1.2, 0.85, 1]} m={shade} />
      <Sph p={[0, 0.87, 0.34]} r={0.035} m={black} seg={8} />
      <Tor p={[0, 0.66, 0]} r={0.24} t={0.065} rot={[Math.PI / 2, 0, 0]} m={scarf} />
      <Box p={[0.12, 0.5, 0.22]} s={[0.12, 0.3, 0.04]} m={scarf} r={[0, 0, 0.1]} />
    </group>
  )
}

function FrostedChalice() {
  const silver = metal('#dde6f2', { roughness: 0.2 })
  const frost = glass('#d8f0ff', 0.7)
  const gem = shine('#5ab8ff', '#2a8aff', 0.9, { flatShading: true })
  const white = plastic(SNOW, { roughness: 1 })
  return (
    <group>
      <Cyl p={[0, 0.05, 0]} t={0.3} b={0.34} h={0.1} m={silver} seg={22} />
      <Cyl p={[0, 0.35, 0]} t={0.05} b={0.07} h={0.5} m={silver} seg={12} />
      <Sph p={[0, 0.38, 0]} r={0.12} m={silver} seg={12} />
      <Cyl p={[0, 0.8, 0]} t={0.38} b={0.12} h={0.5} m={silver} seg={22} />
      <Cyl p={[0, 1.03, 0]} t={0.385} h={0.04} m={white} seg={22} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return <Cone key={i} p={[Math.cos(a) * 0.3, 1.1, Math.sin(a) * 0.3]} r={0.05} h={0.2 + (i % 2) * 0.08} m={frost} seg={5} />
      })}
      <Oct p={[0, 0.82, 0.3]} r={0.07} m={gem} />
      <Oct p={[0.22, 0.75, 0.22]} r={0.045} m={gem} />
      <Oct p={[-0.22, 0.75, 0.22]} r={0.045} m={gem} />
    </group>
  )
}

function GingerbreadHouse() {
  const brown = plastic('#a8622a', { roughness: 0.85 })
  const dark = plastic('#7a4220', { roughness: 0.85 })
  const icing = plastic('#fffaf0', { roughness: 0.6 })
  const cand = [plastic(RED, { roughness: 0.4 }), plastic('#2fa84a', { roughness: 0.4 }), plastic('#ffd83a', { roughness: 0.4 })]
  const roofAng = 0.7
  return (
    <group rotation-y={0.35}>
      <Box p={[0, 0.3, 0]} s={[0.9, 0.6, 0.7]} m={brown} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[s * 0.26, 0.76, 0]} s={[0.56, 0.06, 0.8]} r={[0, 0, -s * roofAng]} m={dark} />
          <Box p={[s * 0.2, 0.84, 0.4]} s={[0.55, 0.03, 0.04]} r={[0, 0, -s * roofAng]} m={icing} />
          <Sph p={[s * 0.25, 0.96, 0.05]} r={0.12} sc={[1.5, 0.25, 1.2]} m={icing} />
        </group>
      ))}
      <Box p={[0, 0.2, 0.36]} s={[0.22, 0.38, 0.02]} m={dark} />
      <Sph p={[0.07, 0.2, 0.38]} r={0.025} m={cand[2]} seg={8} />
      {[-0.28, 0.28].map((x) => (
        <group key={x}>
          <Box p={[x, 0.36, 0.36]} s={[0.17, 0.17, 0.02]} m={icing} />
          <Box p={[x, 0.36, 0.37]} s={[0.12, 0.12, 0.02]} m={shine('#ffd88a', '#ffb030', 0.8)} />
        </group>
      ))}
      {[-0.35, -0.12, 0.12, 0.35].map((x, i) => (
        <Sph key={x} p={[x, 0.6, 0.36]} r={0.035} m={cand[i % 3]} seg={8} />
      ))}
      <Cyl p={[0.27, 1.0, -0.15]} t={0.07} h={0.2} m={dark} seg={8} />
      <Sph p={[0.27, 1.13, -0.15]} r={0.1} sc={[1, 0.5, 1]} m={icing} />
      <Cyl p={[-0.6, 0.15, 0.3]} t={0.03} b={0.0} h={0.3} m={plastic(GREEN)} seg={8} />
      <Cone p={[-0.6, 0.2, 0.3]} r={0.14} h={0.4} m={plastic(GREEN, { roughness: 0.7 })} seg={10} />
    </group>
  )
}

function IceSculpture() {
  const ice = glass('#bfe6ff', 0.6)
  const bright = glass('#e8f7ff', 0.8)
  const orange = plastic('#ff9a2a', { roughness: 0.4 })
  return (
    <group>
      <Box p={[0, 0.14, 0]} s={[0.9, 0.28, 0.6]} m={ice} />
      <Box p={[0, 0.3, 0]} s={[0.8, 0.04, 0.5]} m={bright} />
      <Sph p={[0, 0.5, 0]} r={0.28} sc={[1.2, 0.8, 0.85]} m={ice} seg={18} />
      <Tor p={[0.2, 0.78, 0]} r={0.26} t={0.07} arc={Math.PI * 1.1} rot={[0, 0, Math.PI * 0.05]} m={bright} />
      <Sph p={[0.07, 1.0, 0]} r={0.1} m={bright} seg={12} />
      <Cone p={[-0.06, 1.0, 0]} r={0.025} h={0.14} m={orange} rot={[0, 0, Math.PI / 2]} seg={6} />
      {[-1, 1].map((s) => (
        <Sph key={s} p={[0.1, 0.62, s * 0.3]} r={0.22} sc={[1.5, 0.15, 0.7]} rot={[s * 0.4, 0, 0.3]} m={bright} />
      ))}
      <Sph p={[0.35, 0.5, 0]} r={0.12} sc={[1, 0.6, 0.5]} m={ice} />
    </group>
  )
}

function CrystalSnowGlobe({ glassM, flakeM, base, snowman = true, glow }) {
  return (
    <group>
      <Cyl p={[0, 0.12, 0]} t={0.36} b={0.44} h={0.24} m={base} seg={22} />
      <Tor p={[0, 0.25, 0]} r={0.37} t={0.025} rot={[Math.PI / 2, 0, 0]} m={metal(GOLD)} />
      <Sph p={[0, 0.65, 0]} r={0.48} m={glassM} seg={28} />
      <Sph p={[0, 0.3, 0]} r={0.33} sc={[1, 0.3, 1]} m={plastic(SNOW, { roughness: 1 })} />
      {snowman ? (
        <group position={[0, 0.34, 0]}>
          <Sph p={[0, 0.1, 0]} r={0.12} m={plastic(SNOW, { roughness: 1 })} />
          <Sph p={[0, 0.27, 0]} r={0.085} m={plastic(SNOW, { roughness: 1 })} />
          <Cone p={[0.07, 0.27, 0]} r={0.015} h={0.07} m={plastic('#ff8a1f')} rot={[0, 0, -Math.PI / 2]} seg={6} />
          <Cyl p={[0, 0.35, 0]} t={0.05} h={0.07} m={plastic('#1a1b22')} seg={10} />
        </group>
      ) : (
        <Sph p={[0, 0.65, 0]} r={0.12} m={glow} seg={14} />
      )}
      <Spin speed={0.6} position={[0, 0.65, 0]}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          const r = 0.18 + (i % 3) * 0.08
          return <Sph key={i} p={[Math.cos(a) * r, Math.sin(i * 1.7) * 0.28, Math.sin(a) * r]} r={0.018} m={flakeM} seg={6} />
        })}
      </Spin>
    </group>
  )
}

function CrystalSnowGlobeItem() {
  return <CrystalSnowGlobe glassM={glass('#d8f0ff', 0.25)} flakeM={shine('#ffffff', '#ffffff', 1)} base={plastic('#2a4a8a', { roughness: 0.4 })} />
}

function AuroraLantern() {
  return <Lantern glowColor="#7affd0" glowEmissive="#3affb0" aurora />
}

function FrozenMammothTusk() {
  const ivory = plastic('#efe4cc', { roughness: 0.45 })
  const dark = plastic('#b8a888', { roughness: 0.6 })
  const ice = glass(ICE, 0.6)
  const white = plastic(SNOW, { roughness: 1 })
  const segs = 10
  const R = 0.55
  return (
    <group>
      <Box p={[0.1, 0.1, 0]} s={[1.0, 0.2, 0.55]} m={ice} />
      <group position={[-0.25, 0.1, 0]}>
        {Array.from({ length: segs }, (_, i) => {
          const a = (i / segs) * Math.PI * 0.85
          const next = ((i + 1) / segs) * Math.PI * 0.85
          const rr = 0.13 * (1 - i / (segs + 1.5))
          const rn = 0.13 * (1 - (i + 1) / (segs + 1.5))
          const mid = (a + next) / 2
          return (
            <group key={i} position={[R - Math.cos(mid) * R, Math.sin(mid) * R, 0]} rotation={[0, 0, -mid]}>
              <Cyl t={rn} b={rr} h={0.55 * (Math.PI * 0.85) / segs} m={i % 3 === 2 ? dark : ivory} seg={12} />
            </group>
          )
        })}
      </group>
      <Sph p={[-0.25, 0.14, 0]} r={0.15} m={dark} seg={12} />
      <Sph p={[0.35, 0.22, 0.1]} r={0.14} sc={[1.5, 0.3, 1]} m={white} />
      <Cone p={[0.4, 0.3, -0.1]} r={0.04} h={0.2} m={ice} seg={6} />
    </group>
  )
}

function GlacierGem() {
  const gem = glass(ICE_DEEP, 0.78, { flatShading: true })
  const bright = shine('#e8f8ff', '#7ac8ff', 0.6, { flatShading: true })
  return (
    <group position={[0, 0.5, 0]}>
      <CutGem mats={[gem, bright]} r={0.42} crown={0.2} pavilion={0.48} seg={8} />
      <group position={[0.5, -0.5, 0.2]}>
        <CrystalCluster m={gem} core={bright} scale={0.4} />
      </group>
      <Sparkles mat={bright} spots={[[0.5, 0.3, 0.1], [-0.5, 0.1, -0.2], [0.2, 0.6, 0.3]]} />
    </group>
  )
}

// ---- Legendary ----

function FrostCrown() {
  const silver = metal('#e4ecf8', { roughness: 0.2, emissive: '#5a7aa0', emissiveIntensity: 0.2 })
  const ice = glass(ICE, 0.8)
  const gem = shine('#7ad0ff', '#2a8aff', 1, { flatShading: true })
  return (
    <group position={[0, 0.2, 0]}>
      <SpikeCrown band={silver} spike={ice} jewel={gem} n={9} tall={0.5} />
      <Cone p={[0, 0.55, 0]} r={0.08} h={0.55} m={ice} seg={6} />
      <Oct p={[0, 0.2, 0.42]} r={0.07} m={gem} />
      <Spin speed={0.7} position={[0, 0.3, 0]}>
        <Sparkles mat={shine('#ffffff', '#bfe6ff', 1.2)} spots={[[0.55, 0.3, 0], [-0.55, 0.45, 0], [0, 0.4, 0.55], [0, 0.25, -0.55]]} size={0.04} />
      </Spin>
    </group>
  )
}

function FrozenPhoenixFeather() {
  const ice = shine('#9ae0ff', '#2a9aff', 0.9)
  const white = shine('#f4fcff', '#bfe6ff', 0.8)
  return (
    <group rotation-z={0.5} position={[0, 0.65, 0]}>
      <Cyl p={[0, -0.05, 0]} t={0.02} b={0.03} h={1.3} m={white} seg={6} />
      {[-1, 1].map((s) => (
        <Sph key={s} p={[s * 0.17, 0.05, 0]} r={0.3} sc={[0.5, 1.2, 0.12]} rot={[0, 0, s * 0.18]} m={s > 0 ? ice : white} />
      ))}
      <Sph p={[0, 0.6, 0]} r={0.13} sc={[0.5, 1.2, 0.12]} m={ice} />
      <Spin speed={1}>
        <Sparkles mat={white} spots={[[0.4, 0.1, 0.2], [-0.4, 0.3, -0.2], [0.3, 0.6, -0.2]]} size={0.04} />
      </Spin>
    </group>
  )
}

function YetiClaw() {
  const fur = plastic('#f4f8fc', { roughness: 1 })
  const shade = plastic('#d0dcea', { roughness: 1 })
  const claw = plastic('#efe4cc', { roughness: 0.4 })
  return (
    <group rotation-y={0.3}>
      <Sph p={[0, 0.3, 0]} r={0.36} sc={[1.25, 0.85, 1]} m={fur} seg={18} />
      <Sph p={[-0.3, 0.24, 0.2]} r={0.2} m={shade} />
      <Sph p={[0.32, 0.26, 0.18]} r={0.18} m={shade} />
      {[-0.22, 0, 0.22].map((x, i) => (
        <group key={x} rotation={[0, 0, -x * 0.9]}>
          <Cone p={[x, 0.62, 0.08]} r={0.075 - (i === 1 ? 0 : 0.01)} h={0.5} m={claw} rot={[0.35, 0, 0]} seg={10} />
          <Cone p={[x, 0.98, 0.26]} r={0.035} h={0.34} m={claw} rot={[0.95, 0, 0]} seg={8} />
        </group>
      ))}
    </group>
  )
}

function IceboundGauntlet() {
  const steel = metal('#9ab4d4', { roughness: 0.3 })
  const dark = metal('#5a7aa0', { roughness: 0.4 })
  const ice = glass(ICE, 0.8)
  const gem = shine('#7ad0ff', '#2a8aff', 1, { flatShading: true })
  return (
    <group rotation-y={0.3}>
      <Cyl p={[0, 0.15, 0]} t={0.28} b={0.24} h={0.32} m={dark} seg={14} />
      <Tor p={[0, 0.31, 0]} r={0.28} t={0.03} rot={[Math.PI / 2, 0, 0]} m={steel} />
      <Box p={[0, 0.54, 0]} s={[0.52, 0.34, 0.26]} m={steel} />
      {[-0.19, -0.065, 0.065, 0.19].map((x, i) => (
        <group key={x}>
          <Box p={[x, 0.84, 0]} s={[0.115, 0.3, 0.14]} m={steel} />
          <Box p={[x, 1.04 - (i === 1 || i === 2 ? 0 : 0.05), 0]} s={[0.1, 0.18 + (i === 1 || i === 2 ? 0.04 : 0), 0.12]} m={dark} />
          <Cone p={[x, 0.7, -0.14]} r={0.04} h={0.2} m={ice} rot={[-0.6, 0, 0]} seg={5} />
        </group>
      ))}
      <Box p={[0.34, 0.6, 0]} s={[0.12, 0.3, 0.14]} r={[0, 0, -0.7]} m={steel} />
      <Oct p={[0, 0.55, 0.15]} r={0.07} m={gem} />
      {[-0.2, 0.2].map((x) => (
        <Cone key={x} p={[x, 0.45, -0.15]} r={0.05} h={0.35} m={ice} rot={[-0.5, 0, 0]} seg={5} />
      ))}
    </group>
  )
}

function PolarStarOrnament() {
  const gold = metal(GOLD, { emissive: '#7a5000', emissiveIntensity: 0.35, roughness: 0.2 })
  const silver = metal('#e8eef8')
  const gem = shine('#7ad0ff', '#2a8aff', 1.1, { flatShading: true })
  return (
    <group position={[0, 0.6, 0]}>
      <Spin speed={0.5} axis="y">
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation-z={(i / 8) * Math.PI * 2}>
            <group scale={[1, 1, 0.4]}>
              <Cone p={[0, (i % 2 ? 0.35 : 0.55) / 2, 0]} r={0.1} h={i % 2 ? 0.35 : 0.55} m={i % 2 ? silver : gold} seg={4} />
            </group>
          </group>
        ))}
        <Oct r={0.16} m={gem} sc={[1, 1, 0.8]} />
        <Tor r={0.22} t={0.015} m={silver} />
      </Spin>
      <Tor p={[0, 0.66, 0]} r={0.06} t={0.018} m={silver} />
    </group>
  )
}

function GoldenSleighBell() {
  return (
    <group>
      <Bell body={metal('#ffd24a', { roughness: 0.15, emissive: '#8a5a00', emissiveIntensity: 0.35, side: DoubleSide })} trim={metal('#c8901a')} />
      <Spin speed={0.9} position={[0, 0.5, 0]}>
        <Sparkles mat={shine('#fff6c0', '#ffd860', 1.4)} spots={[[0.7, 0.2, 0], [-0.7, 0.4, 0], [0, 0.3, 0.7], [0, 0.1, -0.7]]} size={0.045} />
      </Spin>
    </group>
  )
}

function BlizzardOrb() {
  const silver = metal('#cfd8e8')
  const orb = glass('#cfeaff', 0.3)
  const core = shine('#ffffff', '#bfe6ff', 1.4)
  return (
    <group>
      <Cyl p={[0, 0.06, 0]} t={0.3} b={0.36} h={0.12} m={silver} seg={20} />
      {[0, 1, 2, 3].map((i) => (
        <Cone key={i} p={[Math.cos(i * 1.57) * 0.28, 0.25, Math.sin(i * 1.57) * 0.28]} r={0.05} h={0.3} m={silver} rot={[Math.sin(i * 1.57) * 0.5, 0, -Math.cos(i * 1.57) * 0.5]} seg={6} />
      ))}
      <Sph p={[0, 0.7, 0]} r={0.46} m={orb} seg={28} />
      <Sph p={[0, 0.7, 0]} r={0.1} m={core} />
      {[0, 1, 2].map((k) => (
        <Spin key={k} speed={1.2 + k * 0.5} axis="y" position={[0, 0.7, 0]} rotation-x={k * 0.5}>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2
            const r = 0.18 + k * 0.08
            return <Sph key={i} p={[Math.cos(a) * r, Math.sin(a * 2) * 0.1, Math.sin(a) * r]} r={0.025} m={core} seg={6} />
          })}
        </Spin>
      ))}
    </group>
  )
}

function SnowQueensWand() {
  const silver = metal('#e8eef8', { roughness: 0.2 })
  const ice = shine('#d8f0ff', '#7ac8ff', 0.8)
  const gem = shine('#7ad0ff', '#2a8aff', 1.2, { flatShading: true })
  return (
    <group rotation-z={0.3} position={[0.1, 0.05, 0]} scale={[0.8, 0.8, 0.8]}>
      <Cyl p={[0, 0.5, 0]} t={0.03} b={0.04} h={1.0} m={silver} seg={10} />
      {[0.15, 0.55].map((y) => (
        <Tor key={y} p={[0, y, 0]} r={0.045} t={0.015} rot={[Math.PI / 2, 0, 0]} m={silver} />
      ))}
      <Cone p={[0, 0.0, 0]} r={0.045} h={0.12} m={silver} rot={[Math.PI, 0, 0]} seg={8} />
      <group position={[0, 1.2, 0]}>
        <Spin speed={0.7} axis="y">
          <Flake len={0.3} w={0.04} depth={0.04} m={ice} />
        </Spin>
        <Oct r={0.09} m={gem} />
      </group>
      <Sparkles mat={ice} spots={[[0.3, 1.0, 0.1], [-0.3, 1.35, 0], [0.1, 1.5, -0.1]]} size={0.03} />
    </group>
  )
}

// ---- Mythic ----

function WinterDreamcatcher() {
  const hoop = plastic('#b8d8f4', { roughness: 0.4, metalness: 0.3 })
  const web = shine('#ffffff', '#bfe6ff', 0.7)
  const feather = plastic('#f4f8ff', { roughness: 0.9 })
  const feather2 = plastic('#8ec8f0', { roughness: 0.9 })
  const bead = shine('#7ad0ff', '#2a8aff', 0.9)
  return (
    <group position={[0, 0.27, 0]} scale={[0.75, 0.75, 0.75]}>
    <group position={[0, 0.7, 0]} rotation-y={0.4}>
      <Tor r={0.4} t={0.035} m={hoop} seg={32} />
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} rotation-z={(i / 8) * Math.PI}>
          <Box s={[0.8, 0.012, 0.012]} m={web} />
        </group>
      ))}
      <Tor r={0.2} t={0.01} m={web} seg={24} />
      <Tor r={0.08} t={0.01} m={web} seg={16} />
      <Sph r={0.04} m={bead} seg={10} />
      {[-0.25, 0, 0.25].map((x, i) => (
        <group key={x} position={[x, -0.4 - (i === 1 ? 0.1 : 0), 0]}>
          <Cyl p={[0, -0.1, 0]} t={0.006} h={0.2} m={web} seg={4} />
          <Sph p={[0, -0.2, 0]} r={0.035} m={bead} seg={8} />
          <Sph p={[0, -0.4, 0]} r={0.09} sc={[0.45, 1.6, 0.12]} m={i === 1 ? feather2 : feather} />
        </group>
      ))}
      {[0.9, 2.5, 4.0].map((a) => (
        <Sph key={a} p={[Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0]} r={0.035} m={bead} seg={8} />
      ))}
    </group>
    </group>
  )
}

function BlizzardHarp() {
  const silver = metal('#e4ecf8', { roughness: 0.22 })
  const frame = plastic('#6aa8d8', { roughness: 0.3, metalness: 0.4 })
  const string = shine('#ffffff', '#9ad8ff', 0.9)
  const ice = glass(ICE, 0.8)
  const strings = Array.from({ length: 8 }, (_, i) => {
    const t = i / 7
    const x = -0.22 + t * 0.52
    const top = 0.82 + t * 0.14
    return { x, top }
  })
  return (
    <group rotation-y={0.3}>
      <Box p={[0, 0.05, 0]} s={[0.9, 0.1, 0.16]} m={frame} />
      <Cyl p={[0.38, 0.55, 0]} t={0.045} h={1.0} m={silver} seg={10} />
      <Box p={[0.02, 0.92, 0]} s={[0.85, 0.07, 0.09]} r={[0, 0, 0.17]} m={silver} />
      <Box p={[-0.33, 0.45, 0]} s={[0.15, 0.8, 0.16]} r={[0, 0, 0.04]} m={frame} />
      {strings.map(({ x, top }) => (
        <Cyl key={x} p={[x, (top + 0.1) / 2, 0]} t={0.008} h={top - 0.1} m={string} seg={4} />
      ))}
      {[0.3, 0.45, 0.6].map((y) => (
        <Oct key={y} p={[-0.33, y, 0.09]} r={0.03} m={string} />
      ))}
      <Cone p={[0.38, 1.12, 0]} r={0.05} h={0.2} m={ice} seg={6} />
      <Sparkles mat={string} spots={[[0.15, 1.1, 0.1], [-0.4, 1.0, 0.1], [0.55, 0.7, 0.05]]} size={0.035} />
    </group>
  )
}

function IceThrone() {
  const ice = glass('#8ccaf4', 0.75)
  const pale = glass('#d8f0ff', 0.85)
  const cushion = plastic('#2a4a8a', { roughness: 0.9 })
  const gold = metal(GOLD)
  return (
    <group scale={[0.65, 0.65, 0.65]}>
      <Box p={[0, 0.18, 0]} s={[0.9, 0.36, 0.76]} m={ice} />
      <Box p={[0, 0.4, 0.03]} s={[0.7, 0.08, 0.62]} m={cushion} />
      <Box p={[0, 0.85, -0.32]} s={[0.84, 1.0, 0.14]} m={pale} />
      {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
        <Cone key={x} p={[x, 1.45 + (i === 1 || i === 2 ? 0.1 : 0), -0.32]} r={0.1} h={0.4 + (i === 1 || i === 2 ? 0.2 : 0)} m={pale} seg={6} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[s * 0.46, 0.5, 0.02]} s={[0.12, 0.28, 0.62]} m={ice} />
          <Cone p={[s * 0.55, 0.78, -0.2]} r={0.07} h={0.35} m={pale} rot={[0, 0, -s * 0.3]} seg={6} />
        </group>
      ))}
      <Oct p={[0, 1.0, -0.23]} r={0.09} m={shine('#ffd24a', '#ff9a00', 1)} />
      <Box p={[0, 0.2, 0.39]} s={[0.4, 0.04, 0.02]} m={gold} />
    </group>
  )
}

function EternalSnowflake() {
  const ice = shine('#e0f4ff', '#6ac4ff', 0.9)
  const gold = shine('#fff2a0', '#ffd23a', 1.1)
  return (
    <group position={[0, 0.7, 0]}>
      <Spin speed={0.45} axis="z">
        <Flake len={0.6} w={0.06} depth={0.06} m={ice} />
        <Oct r={0.12} m={gold} />
      </Spin>
      <Spin speed={1.1} rotation-x={1.2}>
        <Tor r={0.7} t={0.012} m={gold} seg={40} />
        <Sparkles mat={gold} spots={[[0.7, 0, 0], [-0.7, 0, 0]]} size={0.04} />
      </Spin>
    </group>
  )
}

function FrozenHeart() {
  const ice = glass('#9ad8ff', 0.6)
  const core = shine('#ff4a6a', '#ff1a4a', 1.4)
  return (
    <group position={[0, 0.62, 0]}>
      <group>
        {[-1, 1].map((s) => (
          <Sph key={s} p={[s * 0.2, 0.18, 0]} r={0.3} sc={[1, 1, 0.8]} m={ice} seg={20} />
        ))}
        <Cone p={[0, -0.18, 0]} r={0.43} h={0.78} m={ice} rot={[0, 0, Math.PI]} seg={20} />
      </group>
      <group scale={[0.55, 0.55, 0.55]} position={[0, 0.02, 0]}>
        {[-1, 1].map((s) => (
          <Sph key={s} p={[s * 0.2, 0.18, 0]} r={0.3} sc={[1, 1, 0.8]} m={core} seg={16} />
        ))}
        <Cone p={[0, -0.18, 0]} r={0.43} h={0.78} m={core} rot={[0, 0, Math.PI]} seg={16} />
      </group>
      {[-0.35, 0, 0.35].map((x, i) => (
        <Cone key={x} p={[x, 0.55 - (i === 1 ? 0.1 : 0), 0.1]} r={0.05} h={0.28} m={glass('#e8f8ff', 0.85)} rot={[0.3, 0, -x * 0.6]} seg={5} />
      ))}
    </group>
  )
}

// ---- Celestial ----

function FrostbrandSword() {
  const blade = glass('#bfe6ff', 0.85)
  const fuller = shine('#e8f8ff', '#7ac8ff', 0.9)
  const gold = metal(GOLD, { emissive: '#7a5000', emissiveIntensity: 0.3 })
  const leather = plastic('#2a4a8a', { roughness: 0.7 })
  const gem = shine('#7ad0ff', '#2a8aff', 1.2, { flatShading: true })
  return (
    <group scale={[0.75, 0.75, 0.75]} rotation-z={0.15}>
      <Sph p={[0, 0.1, 0]} r={0.09} m={gem} seg={10} />
      <Cyl p={[0, 0.3, 0]} t={0.05} h={0.35} m={leather} seg={10} />
      <Box p={[0, 0.5, 0]} s={[0.6, 0.07, 0.1]} m={gold} />
      {[-1, 1].map((s) => (
        <Cone key={s} p={[s * 0.34, 0.56, 0]} r={0.045} h={0.2} m={gold} rot={[0, 0, -s * 0.5]} seg={6} />
      ))}
      <Box p={[0, 1.05, 0]} s={[0.18, 1.0, 0.035]} m={blade} />
      <Cone p={[0, 1.66, 0]} r={0.13} h={0.22} m={blade} rot={[0, Math.PI / 4, 0]} seg={4} />
      <Box p={[0, 1.05, 0]} s={[0.04, 0.95, 0.045]} m={fuller} />
      <Sparkles mat={fuller} spots={[[0.2, 1.3, 0.05], [-0.2, 0.9, 0.05], [0.18, 1.55, -0.05]]} size={0.04} />
    </group>
  )
}

function AncientIceDragonSkull() {
  const bone = plastic('#d8e8f4', { roughness: 0.55 })
  const shade = plastic('#aac4da', { roughness: 0.6 })
  const dark = plastic('#1a2230')
  const glow = shine('#7ad8ff', '#2aa8ff', 1.4)
  const ice = glass(ICE, 0.8)
  return (
    <group rotation-y={0.5}>
      <Sph p={[0, 0.55, -0.1]} r={0.4} sc={[1, 0.85, 1.1]} m={bone} seg={20} />
      <Box p={[0, 0.42, 0.42]} s={[0.36, 0.26, 0.62]} m={bone} />
      <Box p={[0, 0.5, 0.45]} s={[0.2, 0.1, 0.56]} m={shade} />
      <Box p={[0, 0.2, 0.34]} s={[0.3, 0.09, 0.6]} m={shade} />
      {[0.2, 0.34, 0.48, 0.62].map((z) =>
        [-1, 1].map((s) => (
          <group key={`${z}${s}`}>
            <Cone p={[s * 0.15, 0.27, z]} r={0.018} h={0.09} m={bone} rot={[Math.PI, 0, 0]} seg={5} />
            <Cone p={[s * 0.12, 0.25, z]} r={0.018} h={0.08} m={bone} seg={5} />
          </group>
        )),
      )}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Sph p={[s * 0.2, 0.62, 0.2]} r={0.1} m={dark} seg={12} />
          <Sph p={[s * 0.2, 0.62, 0.25]} r={0.05} m={glow} seg={10} />
          <Cone p={[s * 0.3, 0.85, -0.3]} r={0.08} h={0.55} m={bone} rot={[-0.7, 0, -s * 0.5]} seg={8} />
          <Cone p={[s * 0.38, 0.58, -0.35]} r={0.05} h={0.3} m={shade} rot={[-0.3, 0, -s * 1.2]} seg={6} />
          <Sph p={[s * 0.06, 0.55, 0.72]} r={0.03} m={dark} seg={6} />
        </group>
      ))}
      {[-0.12, 0, 0.12].map((x, i) => (
        <Cone key={x} p={[x, 0.98 + (i === 1 ? 0.06 : 0), -0.05 - (i === 1 ? 0 : 0.05)]} r={0.05} h={0.3 + (i === 1 ? 0.1 : 0)} m={ice} seg={5} />
      ))}
    </group>
  )
}

function VoidSnowglobe() {
  return (
    <CrystalSnowGlobe
      snowman={false}
      glassM={glass('#6a3ac8', 0.45)}
      flakeM={shine('#e8d8ff', '#c08aff', 1.2)}
      base={plastic('#1a1230', { roughness: 0.35, metalness: 0.5 })}
      glow={shine('#2a0a5a', '#8a3aff', 1.2)}
    />
  )
}

function MoonlitIcicleBlade() {
  const blade = glass('#cfeaff', 0.85)
  const edge = shine('#ffffff', '#bfe6ff', 0.8)
  const silver = metal('#e4ecf8', { roughness: 0.2 })
  const leather = plastic('#2a2a4a', { roughness: 0.7 })
  const moon = shine('#fff6d0', '#ffe890', 1.2)
  return (
    <group rotation-z={0.2} scale={[0.85, 0.85, 0.85]}>
      <Sph p={[0, 0.1, 0]} r={0.09} m={moon} seg={10} />
      <Cyl p={[0, 0.3, 0]} t={0.045} h={0.35} m={leather} seg={10} />
      <Tor p={[0, 0.5, 0]} r={0.26} t={0.04} arc={Math.PI} rot={[0, 0, Math.PI]} m={silver} />
      <Sph p={[0, 0.5, 0]} r={0.06} m={moon} seg={10} />
      <group scale={[1, 1, 0.3]}>
        <Cone p={[0, 1.15, 0]} r={0.14} h={1.3} m={blade} seg={6} />
      </group>
      <Cone p={[0, 1.1, 0]} r={0.03} h={1.2} m={edge} seg={4} />
      <Sparkles mat={edge} spots={[[0.2, 1.0, 0.05], [-0.15, 1.3, 0.05]]} size={0.035} />
    </group>
  )
}

function GlacialPearl() {
  const pearl = shine('#f4faff', '#9ad0ff', 0.55, { roughness: 0.08, metalness: 0.3 })
  const shell = plastic('#cfe6f6', { roughness: 0.3, side: DoubleSide })
  const ice = glass(ICE, 0.7)
  const star = shine('#ffffff', '#bfe6ff', 1.4)
  return (
    <group>
      <mesh position={[0, 0.3, 0]} scale={[1, 0.6, 0.9]} material={shell}>
        <sphereGeometry args={[0.55, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <group position={[0, 0.3, -0.4]} rotation-x={-0.9}>
        <mesh position={[0, 0, 0.4]} scale={[1, 0.6, 0.9]} material={shell}>
          <sphereGeometry args={[0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      <Sph p={[0, 0.45, 0]} r={0.3} m={pearl} seg={24} />
      {[-0.4, 0.4].map((x) => (
        <Cone key={x} p={[x, 0.25, 0.4]} r={0.05} h={0.25} m={ice} seg={5} />
      ))}
      <Spin speed={0.9} rotation-x={1.2} position={[0, 0.5, 0]}>
        <Tor r={0.55} t={0.01} m={star} seg={36} />
        <Sparkles mat={star} spots={[[0.55, 0, 0], [-0.55, 0, 0]]} size={0.04} />
      </Spin>
    </group>
  )
}

function NorthernLightsPrism() {
  const prism = glass('#d8f0ff', 0.5)
  const beams = AURORA.map((c) => shine(c, c, 1.1, { transparent: true, opacity: 0.8 }))
  const white = shine('#ffffff', '#ffffff', 1.4)
  return (
    <group scale={[0.85, 0.85, 0.85]}>
      <Cyl p={[0, 0.05, 0]} t={0.28} b={0.34} h={0.1} m={metal('#cfd8e8')} seg={20} />
      <Cyl p={[0, 0.55, 0]} t={0.3} h={0.9} m={prism} seg={3} r={[0, 0.5, 0]} />
      <Box p={[-0.5, 0.58, 0.1]} s={[0.6, 0.035, 0.03]} m={white} r={[0, 0, -0.1]} />
      {beams.map((m, i) => {
        const ang = -0.45 + i * 0.18
        const len = 0.6
        return <Box key={i} p={[0.25 + Math.cos(ang) * len * 0.5 + 0.1, 0.55 + Math.sin(ang) * len * 0.5, 0.1]} s={[len, 0.04, 0.03]} r={[0, 0, ang]} m={m} />
      })}
    </group>
  )
}

// ---- Divine ----

function CrownOfTheWinterKing() {
  const silver = metal('#f0f4fc', { roughness: 0.15, emissive: '#6a8ab0', emissiveIntensity: 0.3 })
  const ice = glass('#bfe6ff', 0.85)
  const fur = plastic(SNOW, { roughness: 1 })
  const velvet = plastic('#1a3a8a', { roughness: 0.9 })
  const white = shine('#ffffff', '#e8f4ff', 1.2, { flatShading: true })
  const gem = shine('#5ab8ff', '#2a8aff', 1, { flatShading: true })
  const halo = shine('#e8f8ff', '#9ad8ff', 1.5)
  return (
    <group position={[0, 0.2, 0]}>
      <Cyl p={[0, 0.12, 0]} t={0.42} b={0.38} h={0.26} m={silver} seg={28} open />
      <Tor p={[0, 0.02, 0]} r={0.4} t={0.07} rot={[Math.PI / 2, 0, 0]} m={fur} seg={28} />
      <Sph p={[0, 0.12, 0]} r={0.38} sc={[1, 0.85, 1]} m={velvet} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <group key={i} position={[Math.sin(a) * 0.4, 0.22, Math.cos(a) * 0.4]} rotation-y={a}>
            <Cone p={[0, 0.3, 0]} r={0.06} h={0.6} m={ice} seg={6} />
            <Oct p={[0, 0.66, 0]} r={0.04} m={white} />
            <Oct p={[0, 0.0, 0.03]} r={0.04} m={gem} />
          </group>
        )
      })}
      {[0, Math.PI / 2].map((r) => (
        <Tor key={r} p={[0, 0.26, 0]} rot={[0, r, 0]} r={0.38} t={0.025} arc={Math.PI} m={silver} />
      ))}
      <Sph p={[0, 0.66, 0]} r={0.07} m={silver} />
      <Flake len={0.1} w={0.025} depth={0.025} m={white} branches={false} />
      <group position={[0, 0.84, 0]}>
        <Flake len={0.12} w={0.025} depth={0.025} m={white} branches={false} />
      </group>
      <Spin speed={0.8} position={[0, 1.05, 0]}>
        <Tor rot={[Math.PI / 2, 0, 0]} r={0.32} t={0.02} m={halo} seg={40} />
      </Spin>
    </group>
  )
}

function SantasGoldenSleigh() {
  const gold = metal('#ffd24a', { roughness: 0.18, emissive: '#8a5a00', emissiveIntensity: 0.35 })
  const dark = metal('#c8901a')
  const red = plastic('#c42a35', { roughness: 0.8 })
  const gifts = [plastic('#2f8f4e', { roughness: 0.5 }), plastic('#3a78d8', { roughness: 0.5 }), plastic('#f0f4fc', { roughness: 0.5 })]
  const spark = shine('#fff6c0', '#ffd860', 1.4)
  return (
    <group rotation-y={0.5} scale={[0.95, 0.95, 0.95]}>
      <Box p={[0, 0.34, 0]} s={[0.95, 0.12, 0.5]} m={gold} />
      <Box p={[0, 0.4, 0]} s={[0.85, 0.04, 0.42]} m={red} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box p={[0, 0.5, s * 0.25]} s={[0.95, 0.26, 0.05]} m={gold} />
          <Box p={[0, 0.1, s * 0.22]} s={[1.1, 0.05, 0.05]} m={dark} />
          <Tor p={[0.55, 0.3, s * 0.22]} r={0.2} t={0.025} arc={Math.PI / 2} rot={[0, 0, -Math.PI / 2]} m={dark} />
          {[-0.3, 0.3].map((x) => (
            <Box key={x} p={[x, 0.22, s * 0.22]} s={[0.04, 0.26, 0.04]} m={dark} />
          ))}
        </group>
      ))}
      <Box p={[-0.5, 0.62, 0]} s={[0.06, 0.55, 0.52]} r={[0, 0, 0.18]} m={gold} />
      <Tor p={[0.42, 0.55, 0]} r={0.2} t={0.05} arc={Math.PI / 2} rot={[0, 0, 0]} m={gold} />
      <Box p={[0.55, 0.5, 0]} s={[0.04, 0.3, 0.5]} m={gold} />
      {gifts.map((m, i) => (
        <Box key={i} p={[-0.2 + i * 0.22, 0.52 + (i % 2) * 0.05, 0]} s={[0.2, 0.18 + (i % 2) * 0.1, 0.2]} m={m} r={[0, i * 0.4, 0]} />
      ))}
      <Spin speed={0.7} position={[0, 0.6, 0]}>
        <Sparkles mat={spark} spots={[[0.75, 0.2, 0.2], [-0.75, 0.3, -0.2], [0.2, 0.5, 0.6], [-0.2, 0.2, -0.6]]} size={0.045} />
      </Spin>
    </group>
  )
}

function EverfrostGem() {
  const gem = glass('#9ad8ff', 0.8, { flatShading: true })
  const bright = shine('#f0fbff', '#7ac8ff', 0.8, { flatShading: true })
  const ring = shine('#e8f8ff', '#9ad8ff', 1.3)
  return (
    <group position={[0, 0.5, 0]}>
      <CutGem mats={[gem, bright, gem, gem, bright, gem, bright, gem]} r={0.42} crown={0.22} pavilion={0.55} seg={8} />
      <Spin speed={1} rotation-x={1.1}>
        <Tor r={0.68} t={0.012} m={ring} seg={44} />
      </Spin>
      <Spin speed={-0.8} rotation-x={0.5} rotation-z={0.8}>
        <Tor r={0.58} t={0.01} m={ring} seg={44} />
        <Sparkles mat={bright} spots={[[0.58, 0, 0], [-0.58, 0, 0]]} size={0.04} />
      </Spin>
    </group>
  )
}

function SeedOfWinter() {
  const seed = shine('#dff0fb', '#8ac8f4', 0.45, { roughness: 0.3, metalness: 0.3 })
  const vein = shine('#9ae8ff', '#4ac8ff', 1.3)
  const leaf = shine('#d8f4ff', '#6ac0f0', 0.6)
  const root = glass(ICE, 0.8)
  const light = shine('#ffffff', '#bfe6ff', 1.5)
  return (
    <group position={[0, 0.4, 0]}>
      <Sph r={0.32} sc={[0.75, 1, 0.75]} m={seed} seg={24} />
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
        <Tor key={r} r={0.32} t={0.01} rot={[0, r, 0]} sc={[0.76, 1.01, 0.76]} m={vein} seg={36} />
      ))}
      <Cyl p={[0.02, 0.45, 0]} t={0.02} b={0.03} h={0.3} m={leaf} r={[0, 0, -0.1]} seg={8} />
      {[-1, 1].map((s) => (
        <Sph key={s} p={[s * 0.13, 0.6, 0]} r={0.15} sc={[0.4, 1, 0.12]} rot={[0, 0, -s * 0.9]} m={leaf} />
      ))}
      <group position={[0.02, 0.7, 0]}>
        <Flake len={0.1} w={0.018} depth={0.018} m={light} branches={false} />
      </group>
      {[-0.6, 0, 0.6].map((r, i) => (
        <Cone key={i} p={[r * 0.2, -0.38, 0]} r={0.03} h={0.22} m={root} rot={[Math.PI, 0, r]} seg={5} />
      ))}
      <Spin speed={1.3}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return <Sph key={i} p={[Math.cos(a) * 0.5, Math.sin(a * 3) * 0.12, Math.sin(a) * 0.5]} r={0.03} m={light} seg={8} />
        })}
      </Spin>
    </group>
  )
}

function EternalFrostClock() {
  const silver = metal('#e8eef8', { roughness: 0.2 })
  const face = glass('#d8f0ff', 0.55)
  const tick = shine('#ffffff', '#9ad8ff', 1.2)
  const hand = shine('#7ad0ff', '#2a8aff', 1.2)
  const ice = glass(ICE, 0.8)
  return (
    <group position={[0, 0.56, 0]} scale={[0.8, 0.8, 0.8]}>
      <Cyl p={[0, -0.64, 0]} t={0.2} b={0.38} h={0.12} m={silver} seg={16} />
      <Tor r={0.5} t={0.04} m={silver} seg={40} />
      <Cyl t={0.48} h={0.05} m={face} r={[Math.PI / 2, 0, 0]} seg={40} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const major = i % 3 === 0
        return <Box key={i} p={[Math.sin(a) * 0.4, Math.cos(a) * 0.4, 0.03]} r={[0, 0, -a]} s={[major ? 0.05 : 0.03, major ? 0.12 : 0.07, 0.02]} m={tick} />
      })}
      <Spin speed={-0.15} axis="z" position={[0, 0, 0.05]}>
        <Box p={[0, 0.14, 0]} s={[0.035, 0.3, 0.015]} m={hand} />
      </Spin>
      <Spin speed={-1.2} axis="z" position={[0, 0, 0.06]}>
        <Box p={[0, 0.2, 0]} s={[0.02, 0.42, 0.015]} m={tick} />
      </Spin>
      <Sph p={[0, 0, 0.06]} r={0.03} m={silver} seg={10} />
      {[-0.3, 0, 0.3].map((x, i) => (
        <Cone key={x} p={[x, 0.55 + (i === 1 ? 0.1 : 0), 0]} r={0.06} h={0.28 + (i === 1 ? 0.12 : 0)} m={ice} seg={5} />
      ))}
    </group>
  )
}

function CosmicSnowflake() {
  const white = shine('#ffffff', '#cfe8ff', 1, { flatShading: true })
  const gold = shine('#ffe890', '#ffc040', 1.2)
  return (
    <group position={[0, 0.7, 0]}>
      <Spin speed={0.5} axis="y">
        <Flake len={0.5} m={white} />
        <group rotation-x={Math.PI / 2}>
          <Flake len={0.5} m={white} />
        </group>
        <group rotation-y={Math.PI / 2}>
          <Flake len={0.5} m={white} />
        </group>
        <Oct r={0.14} m={gold} />
      </Spin>
      <Spin speed={1.1} rotation-x={1.0}>
        <Tor r={0.72} t={0.012} m={gold} seg={44} />
        <Sparkles mat={gold} spots={[[0.72, 0, 0], [-0.72, 0, 0]]} size={0.04} />
      </Spin>
      <Spin speed={-0.7} rotation-x={0.3} rotation-z={1.2}>
        <Tor r={0.62} t={0.01} m={white} seg={44} />
      </Spin>
    </group>
  )
}

function StarTreeTopper() {
  const gold = metal('#ffd24a', { roughness: 0.15, emissive: '#a07000', emissiveIntensity: 0.5 })
  const core = shine('#fff6c0', '#ffe070', 1.6)
  const halo = shine('#fff8d0', '#ffe890', 1.6)
  const green = plastic('#2f8f4e', { roughness: 0.7 })
  return (
    <group>
      <Cone p={[0, 0.2, 0]} r={0.14} h={0.4} m={green} seg={10} />
      <Cyl p={[0, 0.42, 0]} t={0.06} h={0.12} m={gold} seg={10} />
      <group position={[0, 0.85, 0]}>
        <Spin speed={0.8} axis="y">
          {Array.from({ length: 5 }, (_, i) => (
            <group key={i} rotation-z={(i / 5) * Math.PI * 2}>
              <group scale={[1, 1, 0.45]}>
                <Cone p={[0, 0.22, 0]} r={0.13} h={0.45} m={gold} seg={4} />
              </group>
            </group>
          ))}
          <Sph r={0.17} sc={[1, 1, 0.6]} m={core} />
        </Spin>
        <Spin speed={-0.6} rotation-x={1.3}>
          <Tor r={0.52} t={0.012} m={halo} seg={40} />
          <Sparkles mat={core} spots={[[0.52, 0, 0], [-0.52, 0, 0]]} size={0.04} />
        </Spin>
      </group>
    </group>
  )
}

// Stand-in for items that don't have a dedicated 3D model yet.
export function GenericItem() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <octahedronGeometry args={[0.4]} />
      <meshStandardMaterial color="#c9c9c9" roughness={0.35} metalness={0.4} />
    </mesh>
  )
}

export const MODELS = {
  // Common
  'Wool Mitten': WoolMitten, 'Winter Boot': WinterBoot, 'Snowy Mug': SnowyMug, 'Candy Cane': CandyCane,
  'Coal Button': CoalButton, 'Carrot Nose': CarrotNose, Snowball, Icicle, 'Twig Arm': TwigArm,
  Pinecone, 'Snowflake Charm': SnowflakeCharm,
  // Uncommon
  'Silver Bell': SilverBell, 'Frozen Lunchbox': FrozenLunchbox, 'Toy Robot': ToyRobot, 'Knit Scarf': KnitScarf,
  'Ice Skates': IceSkates, 'Thermos Flask': ThermosFlask, 'Gingerbread Man': GingerbreadMan, 'Sled Runner': SledRunner,
  // Rare
  'Gift Box': GiftBox, 'Ornament Bauble': OrnamentBauble, 'Mistletoe Wreath': MistletoeWreath,
  'Snow Goggles': SnowGoggles, 'Hot Cocoa Pot': HotCocoaPot, Snowshoes, Skis, Lantern, 'Music Box': MusicBox,
  'Ice Axe': IceAxe, 'Snowman Hat': SnowmanHat, 'Frost Crystal': FrostCrystal, 'Royal Christmas Chest': RoyalChristmasChest,
  // Epic
  'Yeti Footprint Cast': YetiFootprintCast, 'Penguin Statue': PenguinStatue, 'Reindeer Antlers': ReindeerAntlers,
  'Sleigh Bell Set': SleighBellSet, "Santa's Hat": SantasHat, Nutcracker, 'Polar Bear Plush': PolarBearPlush,
  'Frosted Chalice': FrostedChalice, 'Gingerbread House': GingerbreadHouse, 'Ice Sculpture': IceSculpture,
  'Aurora Lantern': AuroraLantern, 'Crystal Snow Globe': CrystalSnowGlobeItem, 'Frozen Mammoth Tusk': FrozenMammothTusk,
  'Glacier Gem': GlacierGem,
  // Legendary
  'Frozen Phoenix Feather': FrozenPhoenixFeather, 'Yeti Claw': YetiClaw, 'Icebound Gauntlet': IceboundGauntlet,
  'Polar Star Ornament': PolarStarOrnament, 'Golden Sleigh Bell': GoldenSleighBell, 'Blizzard Orb': BlizzardOrb,
  "Snow Queen's Wand": SnowQueensWand, 'Frost Crown': FrostCrown,
  // Mythic
  'Winter Dreamcatcher': WinterDreamcatcher, 'Blizzard Harp': BlizzardHarp, 'Ice Throne': IceThrone,
  'Eternal Snowflake': EternalSnowflake, 'Frozen Heart': FrozenHeart,
  // Celestial
  'Frostbrand Sword': FrostbrandSword, 'Ancient Ice Dragon Skull': AncientIceDragonSkull,
  'Void Snowglobe': VoidSnowglobe, 'Moonlit Icicle Blade': MoonlitIcicleBlade, 'Aurora Veil': AuroraVeil,
  'Glacial Pearl': GlacialPearl, 'Northern Lights Prism': NorthernLightsPrism,
  // Divine
  'Crown of the Winter King': CrownOfTheWinterKing, "Santa's Golden Sleigh": SantasGoldenSleigh,
  'Everfrost Gem': EverfrostGem, 'Seed of Winter': SeedOfWinter, 'Eternal Frost Clock': EternalFrostClock,
  'Cosmic Snowflake': CosmicSnowflake, 'Star Tree Topper': StarTreeTopper,
}
