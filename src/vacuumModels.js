// 3D shovel previews for the Shovels window / gift / daily tiles, one look per id in VACUUMS
// (config.js; looks in data/shovels.js). The model points down +X (blade end), centred and scaled
// to MODEL_SIZE. build(id) -> { group, spin: [], glow: [materials that pulse], front }.
// (The file keeps its old name: the ids and the window are still `vacuum*` in saves and the DOM.)
import { Box3, Group, Vector3 } from 'three'
import { buildHeldShovel, skinShovel } from './avatar/heldShovel.js'
import { SHOVEL_LOOKS, START_SHOVEL } from './data/shovels.js'

const MODEL_SIZE = 2.6 // longest side after scaling

export function buildVacuum(id) {
  const shovel = buildHeldShovel()
  skinShovel(shovel, id)
  const look = SHOVEL_LOOKS[id] ?? SHOVEL_LOOKS[START_SHOVEL]
  const turned = new Group()
  turned.rotation.z = Math.PI / 2 // shaft along X, blade toward +X
  turned.add(shovel)
  const holder = new Group()
  holder.add(turned)
  const box = new Box3().setFromObject(holder)
  const size = box.getSize(new Vector3())
  const centre = box.getCenter(new Vector3())
  const k = MODEL_SIZE / Math.max(size.x, size.y * 1.25, size.z * 1.25)
  turned.position.set(-centre.x, -centre.y, -centre.z)
  const group = new Group()
  group.add(holder)
  group.scale.setScalar(k)
  group.traverse((o) => { if (o.isMesh) o.castShadow = false })
  const { trim, blade } = shovel.userData.mats
  return { group, spin: [], glow: look.glow ? [trim, blade] : [], front: (box.max.x - centre.x) * k }
}
