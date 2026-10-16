// Plaza dressing around the fountain: snowmen and park benches. Procedural.
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three'
import { addCollider } from './colliders.js'

const M = (color, roughness = 0.9, extra = {}) => new MeshStandardMaterial({ color, roughness, ...extra })
const snow = M('#ffffff', 0.95)
const coal = M('#23262e')
const carrot = M('#ff8a1f')
const wood = M('#a8693a')
const woodDark = M('#7a4623')
const iron = M('#3b4452', 0.5, { metalness: 0.5 })

function add(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  g.add(m)
  return m
}

function snowman(scarfColor, hatColor) {
  const g = new Group()
  add(g, new SphereGeometry(0.95, 20, 16), snow, 0, 0.85, 0)
  add(g, new SphereGeometry(0.7, 20, 16), snow, 0, 2.1, 0)
  add(g, new SphereGeometry(0.5, 20, 16), snow, 0, 3.05, 0)
  for (const y of [1.9, 2.3]) add(g, new SphereGeometry(0.07, 8, 8), coal, 0, y, 0.68)
  for (const x of [-0.18, 0.18]) add(g, new SphereGeometry(0.06, 8, 8), coal, x, 3.15, 0.46)
  const nose = add(g, new ConeGeometry(0.08, 0.5, 8), carrot, 0, 3.02, 0.68)
  nose.rotation.x = Math.PI / 2
  for (let i = -2; i <= 2; i++) add(g, new SphereGeometry(0.035, 6, 6), coal, i * 0.1, 2.85 - Math.abs(i) * 0.03 + 0.0, 0.47)
  const scarf = add(g, new TorusGeometry(0.52, 0.12, 8, 24), M(scarfColor), 0, 2.6, 0)
  scarf.rotation.x = Math.PI / 2
  add(g, new BoxGeometry(0.16, 0.7, 0.1), M(scarfColor), 0.3, 2.3, 0.5)
  add(g, new CylinderGeometry(0.62, 0.62, 0.07, 20), M(hatColor), 0, 3.5, 0)
  add(g, new CylinderGeometry(0.38, 0.4, 0.5, 20), M(hatColor), 0, 3.78, 0)
  for (const sx of [-1, 1]) {
    const arm = add(g, new CylinderGeometry(0.04, 0.06, 1.4, 6), woodDark, sx * 1.0, 2.35, 0)
    arm.rotation.z = -sx * 1.0
    const twig = add(g, new CylinderGeometry(0.025, 0.035, 0.45, 5), woodDark, sx * 1.55, 2.85, 0)
    twig.rotation.z = sx * 0.5
  }
  return g
}

function bench() {
  const g = new Group()
  for (let i = 0; i < 5; i++) add(g, new BoxGeometry(2.2, 0.08, 0.14), wood, 0, 0.55, -0.3 + i * 0.15)
  for (let i = 0; i < 3; i++) add(g, new BoxGeometry(2.2, 0.14, 0.06), wood, 0, 0.85 + i * 0.2, -0.42).rotation.x = -0.12
  for (const x of [-0.95, 0.95]) {
    add(g, new BoxGeometry(0.08, 0.55, 0.7), iron, x, 0.28, -0.05)
    add(g, new BoxGeometry(0.08, 0.5, 0.08), iron, x, 0.8, -0.42)
    add(g, new BoxGeometry(0.1, 0.08, 0.7), iron, x, 0.62, -0.1)
  }
  // snow dusting on seat and backrest
  add(g, new BoxGeometry(2.0, 0.07, 0.5), snow, 0.05, 0.62, -0.05).scale.set(1, 1, 0.8)
  add(g, new BoxGeometry(2.1, 0.08, 0.1), snow, 0, 1.28, -0.45)
  return g
}

export function buildPlazaDecor(cx, cz) {
  const g = new Group()
  const face = (x, z) => Math.atan2(cx - x, cz - z) // yaw that looks at the fountain
  const boxes = []
  g.userData.fountain = true // the ring around the fountain goes with it under the Frost Realm (frostRealm.js)
  g.userData.colliders = boxes
  const scarves = ['#e03a3a', '#2f9cff', '#2fbf5a', '#ff4fc8']
  const hats = ['#2a2d38', '#5a3fd0', '#2a2d38', '#c0392b']
  // Snowmen stand at the four corners inside the promenade border; benches line its north and south edges.
  ;[[1, -14], [31, -14], [1, 14], [31, 14]].forEach(([x, z], i) => {
    const s = snowman(scarves[i], hats[i])
    s.position.set(x, 0, z)
    s.rotation.y = face(x, z)
    s.scale.setScalar(1.15)
    g.add(s)
    boxes.push(addCollider(x, z, 2.2, 2.2, 4))
  })
  ;[[9, -15.2], [23, -15.2], [9, 15.2], [23, 15.2]].forEach(([x, z]) => {
    const b = bench()
    b.position.set(x, 0, z)
    b.rotation.y = face(x, z)
    g.add(b)
    boxes.push(addCollider(x, z, 2.0, 2.0, 1.2))
  })
  return g
}
