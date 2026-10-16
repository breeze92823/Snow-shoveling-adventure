// Look of each shovel, keyed by the VACUUMS id in config.js (the ids are the saved/wire ids, so the
// shovels keep them). Used by avatar/heldShovel.js (the model in the hand) and vacuumModels.js (HUD tiles).
//   shaft / grip = pole + D-grip colours, blade / trim = blade face + rim, ferrule and rivets,
//   shape = blade outline (spade | square | wide | flame | disc | wave | leaf | fang),
//   gem = optional glowing stone on the socket, glow = emissive trim + blade.
export const SHOVEL_LOOKS = {
  battery: { shape: 'spade', shaft: '#8a5a32', grip: '#8a5a32', blade: '#a8683a', trim: '#7a4a28' },
  suburban: { shape: 'spade', shaft: '#e0cf9e', grip: '#e0cf9e', blade: '#d9c493', trim: '#2e8f8a' },
  gas: { shape: 'spade', shaft: '#5a4a45', grip: '#5a4a45', blade: '#8a3a24', trim: '#4a3a35' },
  drum: { shape: 'spade', shaft: '#5a4640', grip: '#2f8f90', blade: '#c8892e', trim: '#2f8f90' },
  wheel: { shape: 'spade', shaft: '#2d323c', grip: '#3a5c7a', blade: '#8fb4d6', trim: '#4a5a70' },
  dual: { shape: 'spade', shaft: '#2a2d33', grip: '#3a3f48', blade: '#25282e', trim: '#555b66' },
  turbo: { shape: 'spade', shaft: '#23272e', grip: '#1fa86a', blade: '#1fa86a', trim: '#1b6a4a' },
  widemouth: { shape: 'spade', shaft: '#2a2c32', grip: '#8a6a4a', blade: '#e8b020', trim: '#a8780f' },
  packgun: { shape: 'spade', shaft: '#252a36', grip: '#2a3560', blade: '#1c3fc0', trim: '#17297a' },
  industrial: { shape: 'spade', shaft: '#252a30', grip: '#4a5058', blade: '#7fe0f5', trim: '#b8f0ff' },
  cyclone: { shape: 'spade', shaft: '#2a3340', grip: '#4a8ac0', blade: '#7fc0f0', trim: '#c8ecff' },
  jet: { shape: 'spade', shaft: '#25222e', grip: '#3a2a5a', blade: '#7a2fd0', trim: '#4a1a8a' },
  doublemotor: { shape: 'square', shaft: '#22262e', grip: '#2a2f3a', blade: '#162040', trim: '#2a3a6a' },
  cannon: { shape: 'square', shaft: '#1c1c22', grip: '#25252c', blade: '#14141a', trim: '#6a3acf', gem: '#9a4cff' },
  quadvent: { shape: 'flame', shaft: '#2a2224', grip: '#6a3a3a', blade: '#5a1410', trim: '#ff5a1a', glow: true },
  rotor: { shape: 'flame', shaft: '#2a2224', grip: '#e8453a', blade: '#e8651c', trim: '#ffb020' },
  triple: { shape: 'wide', shaft: '#2b2f3a', grip: '#4a3a8f', blade: '#2a1a5e', trim: '#c46bff', glow: true },
  heavy: { shape: 'square', shaft: '#2e2e32', grip: '#a8884a', blade: '#6b4a1e', trim: '#35c9b5', gem: '#35c9b5' },
  fourengine: { shape: 'wide', shaft: '#2b2f3a', grip: '#3fb0e0', blade: '#1fb89a', trim: '#7a5cf0', glow: true },
  megaturbo: { shape: 'disc', shaft: '#2a2224', grip: '#ff7a3a', blade: '#e0501c', trim: '#ffc83a', glow: true },
  tornado: { shape: 'wide', shaft: '#2a3040', grip: '#2a5ac0', blade: '#2a7ad8', trim: '#9fe8ff' },
  reactor: { shape: 'leaf', shaft: '#2a2e32', grip: '#c8a840', blade: '#5aa890', trim: '#e8c860', gem: '#5af0c0' },
  shoulder: { shape: 'wide', shaft: '#1a1230', grip: '#4a2a8f', blade: '#2a1a5e', trim: '#ff5ad8', gem: '#35e0ff', glow: true },
}
export const START_SHOVEL = 'battery'
