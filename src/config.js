// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'snow-shoveling-adventure' // slug registered on bloxity.io
export const GAME_TITLE = 'Snow Shoveling Adventure'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'
// Shows the Bloxbux (gem) buy buttons, e.g. in the Upgrades window (see .env.example).
export const BUY_WITH_BLOXBUX = import.meta.env.VITE_BUY_WITH_BLOXBUX === 'true'

// Colyseus game server (Snow-shoveling-adventure-backend), one URL per Bloxity Legion channel: `npm run build`
// (production) reads _MAIN, `npm run dev` and `npm run build:dev` read _DEV (`npm run dev` defaults to
// the local server). Empty = net.js asks the Bloxity SDK for the channel's endpoint; with no SDK either
// the game is offline (no saving, no other players).
const SERVER_URL_DEV = import.meta.env.VITE_SERVER_URL_DEV || (import.meta.env.DEV ? 'ws://localhost:2567' : '')
const SERVER_URL_MAIN = import.meta.env.VITE_SERVER_URL_MAIN || ''
export const SERVER_URL = import.meta.env.MODE === 'production' ? SERVER_URL_MAIN : SERVER_URL_DEV
// Local backend testing: with no Bloxity SDK (VITE_DEV_MODE) every player is a guest and the server
// never loads or saves a guest. Set VITE_DEV_USER_ID (e.g. "dev-1"; use "dev-2" in a second tab to
// test multiplayer/leaderboards) to join as a real account. Ignored outside `npm run dev`.
export const DEV_USER_ID = import.meta.env.DEV ? import.meta.env.VITE_DEV_USER_ID || '' : ''
export const NET = {
  poseHz: 15, // pose messages per second
  saveDebounce: 1.5, // s of quiet after a state change before saving
  saveMaxWait: 8, // s: a continuous change stream (training) still saves this often
  remoteLerp: 12, // 1/s: how fast remote players ease toward their last reported pose
  remoteFade: 40, // m: remote players further away than this are hidden
  maxRemotes: 24, // drawn at once (nearest first)
}

// --- World (metres: +X east, +Z south, +Y up) -------------------------------
export const GROUND_Y = 0
export const GROUND_SIZE = 1000 // square grass ground, centred on the origin (the hub floor sits on top)
export const WORLD_BOUNDS = { minX: -438, maxX: 59.5, minZ: -41.5, maxZ: 41.5 } // backstop behind the wall colliders
export const SPAWN = { x: 28.8, y: 0.3, z: 6.8 } // just in front of the red-scarf snowman (plazaDecor.js, 28 deg on the R19 ring around the fountain at x 16)
export const SPAWN_FACING = -Math.PI / 2 // yaw the character faces on spawn, toward the Snowfields opening in the west wall (-X); PI = toward -Z

// --- Hub layout (hub.js / props.js) ------------------------------------------
// Square plaza walled on three sides; the west wall opens onto the leaf field,
// a canyon running to x = FIELD_END.
export const HUB = {
  west: 28, // plaza interior spans x -west..east, z -halfZ..halfZ (the field leaves through the west wall)
  east: 60,
  halfZ: 42,
  innerWall: { depth: 8, height: 9 }, // first terrace
  outerWall: { depth: 14, height: 18 }, // second terrace behind it
  opening: { minZ: -14, maxZ: 14 }, // gap in the west wall
  fieldHalfWidth: 24, // canyon interior spans -this..this on Z
  fieldEnd: -434,
  stepUp: 0.6, // tallest ledge the player walks up without jumping
}

// Snowflakes drifting from the sky; fade in as the player nears the Snowfields (x decreasing).
export const SNOWFALL = {
  count: 5000,
  // Snow storm: wind blows from the Snowfields (west, -x) towards the hub (east, +x).
  wind: 26, // m/s at full strength (field side)
  stormHub: 0.1, // storm strength (0..1) inside the hub
  stormMouth: 0.4, // ... where the hub opens onto the field
  stormEnd: 1.3, // ... at the far end (middle of the field = 1)
  gust: 0.5, // gust swing as a fraction of the wind
  gustSpeed: 0.35, // gust frequency
  turbulence: 3.5, // m/s random sideways/vertical shake
  size: 0.06, // streak thickness (m)
  streak: 1.6, // streak length at full wind (m)
  opacity: 0.5,
  fogNear: 2, // whiteout visibility in the open field
  fogFar: 46,
  radius: 28, // half-extent of the box around the player
  height: 42, // spawn height; tall enough to start in the cliff-top tree canopies
  fallSpeed: 3.2, // m/s
  drift: 1.4, // sideways sway m/s
  startX: -8, // no leaves east of this
  fullX: -34, // full density west of this
  colors: ['#ffffff', '#f2f8ff', '#e3f0ff', '#d6e8fa', '#f8fcff', '#eaf4ff'],
}

export const HUB_COLORS = {
  floorA: '#d6e6f5',
  floorB: '#c7dcf0',
  wallA: '#a9c9e8',
  wallB: '#97bbdf',
  topA: '#f4faff',
  topB: '#e2f0fb',
  stone: '#b9c8d8',
  trunk: '#5a4636',
  leaves: '#2f7a52',
  wood: '#8fb4d6',
  woodDark: '#6f95b8',
  boardWood: '#7a3b1c',
  boardPanel: '#4a2416',
}

// --- Physics feel (player.js) -----------------------------------------------
export const PHYSICS = {
  moveSpeed: 10, // m/s on flat ground
  accel: 75, // m/s^2 toward the target velocity (full speed in ~0.13 s)
  decel: 69, // m/s^2 when no key is held
  turnSpeed: 12, // rad/s the body turns toward its heading
  aimTurnSpeed: 20, // rad/s the body turns to face the camera while blowing
  gravity: -22, // m/s^2
  jumpSpeed: 7.5, // m/s
  killY: -30, // fell this far below the ground: respawn
}
export const PLAYER_DIMS = { radius: 0.4, height: 1.8 }

// --- Look ------------------------------------------------------------------
export const COLORS = {
  horizon: '#dcebf7',
  zenith: '#7fb2e0',
  grass: '#f1f7fc',
  grassDark: '#cfe0f0',
}
export const FOG = { near: 60, far: 220 }
export const LIGHT = {
  sunColor: '#e8f1ff',
  sunIntensity: 2.4,
  sunPosition: [30, 60, 20],
  shadowMapSize: 2048,
  shadowRange: 40, // half-width of the shadow frustum around the player
  hemiSky: '#e8f2ff',
  hemiGround: '#a9bdd6',
  hemiIntensity: 1.5,
}

// Default (signed-out / fallback) character look.
export const CHARACTER_COLORS = { skin: '#f2c79a', suit: '#2f9e8f', hair: '#5a3a22' }

// --- Camera (camera.js) -------------------------------------------------------
export const CAMERA = {
  fov: 70,
  near: 0.1,
  far: 600,
  startPitch: 0.32, // radians above the horizon
  minPitch: -0.1,
  maxPitch: 1.2,
  distance: 9, // resting boom length, m
  minDistance: 3,
  maxDistance: 15,
  followLerp: 10, // 1/s: the ONE smoothing stage, on the point the camera follows
  targetHeight: 0.6, // look-at point as a fraction of player height
  lookSensitivity: 0.0026, // rad per pixel of right-drag
  zoomStep: 0.9, // m per wheel notch
  zoomEase: 12, // 1/s the zoom glides to its target
  speedDistance: 0.8, // m the boom pulls back at full speed
  speedFov: 4, // degrees the FOV widens at full speed
  speedEase: 3, // 1/s the speed framing eases in and out
  clearEase: 4, // 1/s the boom eases back out after a wall pulled it in
}

// --- Snow field + digging (dig.js) ------------------------------------------------
export const SNOW = {
  minX: -38, // field strip (hub side)
  maxX: -432,
  halfZ: 23.2,
  // The field is a carpet of leaves split into 13 zones (zone i, hub side first, spans
  // edges[i]..edges[i+1] and uses palettes[i]). It is solid snow; dig it out to pass.
  zones: {
    edges: [-44, -74, -104, -134, -164, -194, -224, -254, -284, -314, -344, -374, -404, -434], // x boundaries
    edgeTaper: 5, // m of open (undiggable) ground between the hub and the first snow wall
    luck: [1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 60], // Luck multiplier of each zone: sets how hard it is to dig and what it drops
    palettes: [
      ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
      ['#ecfcf8', '#e1faf4', '#d3f7ef', '#f1fcfa', '#c8f5eb', '#e6faf6', '#dbf8f2', '#f7fefc'],
      ['#f4eefd', '#eee4fc', '#e7d7fb', '#f8f2fe', '#e1cdfa', '#f2e8fd', '#ecdefc', '#faf8fe'],
      ['#e8f3ff', '#dbecff', '#cbe3ff', '#eff6ff', '#bedcff', '#e2efff', '#d5e8ff', '#f5faff'],
      ['#ffeff4', '#ffe6ee', '#ffdbe7', '#fff4f8', '#ffd2e1', '#ffebf2', '#ffe2ec', '#fff8fa'],
      ['#fffce8', '#fffadb', '#fff7cb', '#fffcef', '#fff5be', '#fffae2', '#fff8d5', '#fffef5'],
      ['#fff3e5', '#ffecd6', '#ffe3c3', '#fff6ec', '#ffdcb4', '#ffefdd', '#ffe8ce', '#fffaf4'],
      ['#f1ffec', '#e9ffe1', '#dfffd3', '#f5fff1', '#d7ffc8', '#edffe6', '#e5ffdb', '#f9fff7'],
      ['#e8fdff', '#dbfcff', '#cbfbff', '#effeff', '#befaff', '#e2fdff', '#d5fcff', '#f5feff'],
      ['#ececff', '#e1e1ff', '#d3d3ff', '#f1f1ff', '#c8c8ff', '#e6e6ff', '#dbdbff', '#f7f7ff'],
      ['#ffecfc', '#ffe1fa', '#ffd3f7', '#fff1fc', '#ffc8f5', '#ffe6fa', '#ffdbf8', '#fff7fe'],
      ['#f4f4fc', '#eeeefa', '#e7e7f7', '#f8f8fc', '#e1e1f5', '#f2f2fa', '#ececf8', '#fafafe'],
      ['#fffaec', '#fff7e1', '#fff3d3', '#fffbf1', '#fff0c8', '#fff8e6', '#fff5db', '#fffdf7'],
    ],
  },
  // Snow piles: the field is tiled into piles (per zone). A pile has hardness ("hp"): digging
  // wears it at shovelPower / hp, so time to clear ~ hp / power (split over its 2.5 m blocks).
  // hp = baseHp * luck^exponent. With power = baseHp (the start), clearing one pile takes about
  // 3 s in x1, 20 s in x2, 1 min in x3, 4-5 min in x5 and 10+ min in x7. There is no health bar.
  // Loot sits half-buried in the snow and is visible before digging (loot.js).
  loot: {
    buryDepth: 0.5, // fraction of each item below the snow surface
    viewDistance: 70, // m: items further than this aren't built (performance only)
    glowDistance: 16, // m: the glow halo and the name/value/rarity banner only show within this
  },
  piles: {
    size: 6, // m, target width/depth of a pile
    clearAt: 0.12, // a pile is cleared (rewards + frees any loot still buried) once all but this fraction of its blocks are dug
    baseHp: 1, // hp of an x1 pile; also the starting shovel power (1 = Wooden Shovel)
    exponent: 2.8, // hp grows as luck^exponent
    hardness: 2, // multiplier on every zone's hp (2 = twice as hard / twice as slow to dig)
    leavesPerPile: 100, // Snow counter (HUD, state.leaves) gained per pile dug out
    regrowDelay: 2, // s back in the hub before the whole field regrows (loot left lying is lost)
  },
}

// Digging (dig.js): the snow field is a heightfield. A coarse block x block cell of it (2.5 m) stays
// a solid wall until dug out. Dig speed per second = power x blocks-per-pile / pile hp x speedScale.
export const DIG = {
  cell: 0.5, // heightfield resolution, m
  block: 5, // blocking cell = block x block height cells (2.5 m)
  reach: 1.5, // the cell this far in front of the player is the one dug, m
  topHeight: 1.6, // undug snow height, m (taller than a jump)
  floor: 0.03, // height of a fully dug spot (just above the ground plane)
  passDug: 1, // a block lets the player through once this fraction is dug (0..1)
  speedScale: 1, // global dig speed multiplier
  particles: 2200,
  dustRate: 70, // powder puffs per second while digging
  dustAlpha: 0.45,
  dustLife: 1.3, // s
  sprayRate: 300, // snow chunks per second while digging
  puffCount: 36, // chunks per shovel hit / throw
  doneBurst: 160, // chunks when a block is dug through
  floorColor: '#b4c6d8', // packed snow / ice under a fully dug spot
  pitShade: 0.2, // extra darkening while a spot is mid-dig
  lumpAmp: 0.6, // m, peak-to-peak height of the rolling mounds on undug snow
  lumpScale: 6, // m, wavelength of the big mounds (small ridges are derived from it)
  dipColor: '#b9c6ec', // cool lavender-blue the snow shades toward in the dips
  dipTint: 0.45, // 0..1 how strongly the deepest dips take dipColor
  strataBand: 26, // cut-wall layer frequency (bands per radian of height)
  strataTint: 0.5, // 0..1 how strongly the cut walls show their blue-grey layers
  sparkle: 0.012, // fraction of top-snow cells that glint
}

// --- Bloxity (bloxity.js, avatar/) -------------------------------------------------
// SDK setting keys this game listens for; registering a listener makes the control
// appear in the portal's settings menu.
export const SETTINGS = {
  graphics_quality: { def: 'High', type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  fullscreen: { def: 'false', type: 'bool' },
}

// The base rig, measured from player.glb: origin at the feet, 6.4 units tall at bind pose.
export const RIG_HEIGHT = 6.4
// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = { armOffsetX: 2, legOffsetX: 0.6, neckOffsetY: 0.6 }
// getProportions() ranges, straight from the SDK spec; clamped before they reach the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// Procedural animation (avatar/animator.js), ported from +1 Cut Grass Adventure.
// Rotations are radians in CHARACTER space: +X swings a limb backward, +Y yaws, +Z rolls.
const deg = (d) => (d * Math.PI) / 180
export const ANIM = {
  airborneDelay: 0.07, // s off the ground before the air pose (ignores a step down a ledge)
  // Walk -> run is one cycle at two depths; phase advances with distance travelled.
  locomotion: {
    minFrequency: 0.7,
    maxFrequency: 3.6,
    strideDistance: 3.8, // m per cycle
    idleSpeed: 0.6,
    walkSpeed: 2.5,
    runSpeed: 8,
    sprintSpeed: 13,
    hipSwing: { walk: deg(22), run: deg(42), sprint: deg(56) },
    kneeBend: { walk: deg(30), run: deg(58), sprint: deg(72) },
    armSwing: { walk: deg(18), run: deg(36), sprint: deg(52) },
    elbowBend: { walk: deg(14), run: deg(44), sprint: deg(70) },
    torsoTwist: { walk: deg(4), run: deg(7), sprint: deg(9) },
    torsoLean: { walk: deg(3), run: deg(10), sprint: deg(18) },
    headCounterTwist: { walk: deg(2), run: deg(4), sprint: deg(5) },
    torsoRoll: { walk: deg(2), run: deg(3), sprint: deg(3) },
    bob: { walk: 0.03, run: 0.07, sprint: 0.09 }, // m, on the avatar root
    bankAngle: deg(9),
    bankRate: 8,
  },
  idle: {
    breathFrequency: 0.35,
    breathAmount: deg(1.8),
    breathBob: 0.007,
    basePose: {
      ArmL1: { x: deg(-8), z: deg(14) },
      ArmL2: { x: deg(38) },
      ArmR1: { x: deg(4), z: deg(-6) },
      ArmR2: { x: deg(12) },
      LegL1: { x: deg(-4) },
      LegR1: { x: deg(4) },
    },
  },
  airborne: {
    rise: {
      LegL1: { x: deg(-38) }, LegR1: { x: deg(8) }, LegL2: { x: deg(62) }, LegR2: { x: deg(40) },
      ArmL1: { x: deg(-40), z: deg(34) }, ArmR1: { x: deg(-30), z: deg(-34) },
      ArmL2: { x: deg(30) }, ArmR2: { x: deg(30) }, Spine1: { x: deg(6) },
    },
    fall: {
      LegL1: { x: deg(-14) }, LegR1: { x: deg(10) }, LegL2: { x: deg(22) }, LegR2: { x: deg(18) },
      ArmL1: { x: deg(-70), z: deg(40) }, ArmR1: { x: deg(-60), z: deg(-40) },
      ArmL2: { x: deg(20) }, ArmR2: { x: deg(20) }, Spine1: { x: deg(-4) },
    },
    velocityReference: 8, // m/s vertical speed that reads as fully rising / falling
  },
  landing: {
    duration: 0.16,
    pose: {
      LegL1: { x: deg(-34) }, LegR1: { x: deg(-34) }, LegL2: { x: deg(58) }, LegR2: { x: deg(58) },
      ArmL1: { x: deg(-18), z: deg(20) }, ArmR1: { x: deg(-18), z: deg(-20) }, Spine1: { x: deg(14) },
    },
    bobY: -0.2,
  },
  // Two-handed digging stroke (avatar/digStroke.js). One loop: raise -> thrust -> hit -> scoop ->
  // throw. Per key: lean = spine pitch (+ forward), crouch = knee bend 0..1, dy / dz = right hand
  // below / in front of the mid-shoulder point (rig units), tilt = shovel pitch (negative: blade
  // forward), yaw = sideways sweep of the shovel. The hands are placed by IK (avatar/heldShovel.js).
  dig: {
    cycle: 0.85, // s per stroke at power 1
    strengthLog: 0.08, // stroke speeds up by this x log10(power)
    maxScale: 1.8, // fastest stroke = cycle / maxScale
    blendRate: 12, // 1/s blend into / out of the dig pose
    maxSpeed: 1.2, // m/s; moving faster than this plays the normal run instead
    impactU: 0.4, // cycle point where the blade hits the snow (snow burst)
    throwU: 0.84, // cycle point where the snow is flung
    gap: 0.9, // between the hands on the shaft (shovel units)
    keys: [
      { t: 0.0, lean: deg(-9), crouch: 0.0, dy: -0.1, dz: 0.4, tilt: -1.45, yaw: 0 }, // raise
      { t: 0.28, lean: deg(24), crouch: 0.55, dy: -0.9, dz: 0.9, tilt: -0.6, yaw: 0 }, // thrust
      { t: 0.4, lean: deg(30), crouch: 0.75, dy: -1.0, dz: 0.95, tilt: -0.5, yaw: 0 }, // hit
      { t: 0.66, lean: deg(9), crouch: 0.3, dy: -0.5, dz: 0.5, tilt: -1.05, yaw: 0 }, // scoop
      { t: 0.84, lean: deg(-4), crouch: 0.1, dy: -0.2, dz: 0.5, tilt: -1.6, yaw: 0.9 }, // throw
    ],
  },
  // Looping cheer used only by the #1-player statues on the leaderboard hall (topPlayerStatue.js).
  dance: {
    frequency: 1.6, // beats per second
    armRaise: deg(150), // upper arms overhead (negative X swings forward / up)
    armSpread: deg(24), // out to the sides, a V
    armPump: deg(22), // alternating up / down pump per beat
    elbowBend: deg(26),
    sway: deg(7), // torso roll
    twist: deg(6),
    kneeBend: deg(26),
    bounce: 0.1, // m, body hop per beat
  },
  transitions: { toLocomotion: 0.14, toAirborne: 0.12, toLanding: 0.06 }, // s to blend a pose change
}

// --- Leaderboard hall (leaderboardHall.js, topPlayerStatue.js) ---------------------------------
export const LEADER_HALL = {
  x0: 5.5, // platform spans x0..x1, z0 (the north wall) .. z1
  x1: 54.5,
  z0: -42,
  z1: -30,
  height: 1.2, // platform top; reached by three steps of height / 3
  stepDepth: 1.2,
  boardSpacing: 11.5,
  boardZ: -38.8, // centre board row z; outer boards curve forward by boardCurve * dx^2
  boardCurve: 0.006,
  boardFan: 0.5, // fraction of the way each board turns toward the plaza centre
  refreshSeconds: 15, // matches the backend's LEADERBOARD_REFRESH_MS
  statue: {
    dx: 4.0, // beside the board (board-local), toward the gap on its right
    dz: 3.1, // out in front of the board
    scale: 1.5,
    plinthRadius: 1.2,
    plinthHeight: 0.5,
    labelY: 5.3, // label centre above the plinth top
    glow: { color: '#7fe3ff', emissive: 0.55, aura: 0.55, pulse: 0.15, fade: 3 }, // Frost Realm only: body glow, halo opacity, pulse depth, fade speed
  },
}

// --- HUD (hud.js) ------------------------------------------------------------
// Starting values shown on the HUD (live state is in state.js). `power` is the dig power; `backpackMax` is the Bag capacity.
// Holding the dig button (hub or field) trains: every `interval` s adds `perTick` power and xp.
export const POWER_GAIN = { perTick: 1, interval: 1 }
// Level bar: reaching level N+1 needs xpPerLevel * N xp (25, 50, 75, ...), as in the Chop Trees reference.
export const LEVEL = { xpPerLevel: 25 }
// Worlds portal: shows "Unlock at Level N" when the player is within `near` units while below `unlockLevel`.
export const WORLD_PORTAL = { unlockLevel: 200, near: 9 }

// The Frost Realm (frostRealm.js), the world behind the Worlds portal: the same hub, stands, mounds
// and diggable field, re-themed as an ice cavern (cave roof, icicles, glowing crystals, dim cold
// light). Not saved: a reload starts in the main world.
export const FROST_REALM = {
  name: 'Frost Realm',
  arrive: { x: -14, y: 0.3, z: -26 }, // in front of the Worlds portal, both ways
  arriveFacing: 0, // toward +Z, away from the portal
  fade: 0.35, // s of screen fade either side of the switch
  tint: '#b4c6ff', // multiplied into every world material's colour
  fog: { color: '#16223f', far: 150 }, // far = cap on the fog distance
  sky: { zenith: '#070c1a', horizon: '#16223f' },
  light: { sunColor: '#9cc4ff', sunIntensity: 1.1, hemiSky: '#8fb4ff', hemiGround: '#24345c', hemiIntensity: 1.2 },
  sparkle: '#8ff4ff', // the falling snow becomes drifting ice sparkles
  // Cave roof (m): over the hub and its terraces, and higher over the snow tunnel (the field).
  roof: { color: '#2b3656', hubY: 44, fieldY: 52 },
  // The four shop stands in a ring around the centre (the fountain is gone): same stalls, new spots, each
  // facing the centre. Keys match the stands registered in props.js.
  center: { x: 16, z: 0 }, // the crystal monolith that replaces the fountain
  stands: {
    sell: { x: -8, z: -13, rot: 1.077 },
    vacuum: { x: -8, z: 13, rot: 2.065 },
    upgrade: { x: 42, z: 15, rot: -2.095 },
    aura: { x: 42, z: -15, rot: -1.047 },
  },
  icicles: 140, // hanging from the roof
  crystals: 90, // glowing clusters on the terrace and tunnel ledges
  crystalColor: '#5fe3ff',
}
// Rebirth (rebirth.js, the HUD's Rebirth tile): once level >= level * levelGrowth^rebirths the player
// may reset level and trained power for permanent boosts: trained-power gain x(1 + n * powerPer)
// and sell payouts x(1 + n * cashPer). Cash, vacuums, auras and upgrades are kept.
export const REBIRTH = { level: 25, levelGrowth: 2, powerPer: 0.5, cashPer: 0.5 }
// Treasure Index (index.js, the HUD's Index tile): every `step` distinct loot items discovered
// adds `boost` (0.25 = +25%) to the trained-power gain.
export const INDEX = { step: 10, boost: 0.25 }
// "LEVEL UP!" banner (hud.js): ms for the pop-in, hold and float-away fade.
export const LEVEL_UP_POPUP = { inMs: 420, holdMs: 900, outMs: 560 }
export const HUD_START = {
  level: 1,
  xp: 0,
  xpNext: LEVEL.xpPerLevel,
  rebirths: 0,
  power: 1, // trained power (the starting Battery Fan adds +0, so the HUD shows 1)
  leaves: 0,
  backpack: 0,
  backpackMax: 3,
  pets: 0,
  cash: Number(import.meta.env.VITE_START_CASH) || 0, // VITE_START_CASH overrides the starting money
  invitePct: 0,
}
// Upgrades window (upgrades.js), in row order. Cash price = cost * growth^level; the gem
// price is shown but gem purchases are not wired yet. `step` is the bonus per level.
export const UPGRADES = [
  { id: 'range', name: 'Range', desc: (s) => `+${s * 100}% Vaccum Area`, step: 0.05, cost: 5500, gems: 15, max: 20, icon: 'upRange' },
  { id: 'agility', name: 'Agility', desc: (s) => `+${s * 100}% Vaccum Speed`, step: 0.1, cost: 13500, gems: 15, max: 20, icon: 'upAgility' },
  { id: 'capacity', name: 'Capacity', desc: (s) => `+${s} Bag Space`, step: 1, cost: 115000, gems: 15, max: 10, icon: 'upCapacity' },
  { id: 'walk', name: 'Mobility', desc: (s) => `+${s} Walk Speed`, step: 1, cost: 9000, gems: 15, max: 10, icon: 'upWalk' }, // step = m/s
]
export const UPGRADE_GROWTH = 1.6
export const UPGRADE_STAND = { x: 30, z: 23, rot: -2.59 } // matches the 'Upgrades' stand in props.js (south-east of the promenade, facing the fountain)

// Shovels window (vacuums.js; the ids stay `vacuum*` in saves): worst to best. `power` adds to the dig power
// while equipped; the first is owned and equipped from the start. `gems` is the Bloxbux price.
// Each one's look is in data/shovels.js by id (3D preview: vacuumModels.js).
export const VACUUMS = [
  { id: 'battery', name: 'Wooden Shovel', rarity: 'Common', power: 0, cost: 0, gems: 0 },
  { id: 'suburban', name: 'Driftwood Shovel', rarity: 'Common', power: 3, cost: 200, gems: 2 },
  { id: 'gas', name: 'Rusty Shovel', rarity: 'Common', power: 9, cost: 600, gems: 3 },
  { id: 'drum', name: 'Bronze Shovel', rarity: 'Uncommon', power: 15, cost: 2400, gems: 6 },
  { id: 'wheel', name: 'Steel Shovel', rarity: 'Uncommon', power: 30, cost: 5000, gems: 9 },
  { id: 'dual', name: 'Iron Shovel', rarity: 'Uncommon', power: 45, cost: 12000, gems: 15 },
  { id: 'turbo', name: 'Jade Shovel', rarity: 'Uncommon', power: 80, cost: 28000, gems: 25 },
  { id: 'widemouth', name: 'Gold Shovel', rarity: 'Rare', power: 170, cost: 65000, gems: 35 },
  { id: 'packgun', name: 'Sapphire Shovel', rarity: 'Rare', power: 350, cost: 135000, gems: 55 },
  { id: 'industrial', name: 'Diamond Shovel', rarity: 'Rare', power: 720, cost: 300000, gems: 80 },
  { id: 'cyclone', name: 'Frost Shovel', rarity: 'Rare', power: 1500, cost: 700000, gems: 110 },
  { id: 'jet', name: 'Amethyst Shovel', rarity: 'Epic', power: 3500, cost: 1500000, gems: 160 },
  { id: 'doublemotor', name: 'Storm Shovel', rarity: 'Epic', power: 7000, cost: 4000000, gems: 210 },
  { id: 'cannon', name: 'Obsidian Shovel', rarity: 'Epic', power: 14000, cost: 10000000, gems: 290 },
  { id: 'quadvent', name: 'Inferno Shovel', rarity: 'Epic', power: 28000, cost: 25000000, gems: 380 },
  { id: 'rotor', name: 'Phoenix Shovel', rarity: 'Legendary', power: 65000, cost: 40000000, gems: 480 },
  { id: 'triple', name: 'Nebula Shovel', rarity: 'Legendary', power: 130000, cost: 125000000, gems: 600 },
  { id: 'heavy', name: 'Relic Shovel', rarity: 'Legendary', power: 280000, cost: 250000000, gems: 750 },
  { id: 'fourengine', name: 'Aurora Shovel', rarity: 'Legendary', power: 600000, cost: 800000000, gems: 900 },
  { id: 'megaturbo', name: 'Solar Shovel', rarity: 'Legendary', power: 1000000, cost: 2000000000, gems: 1050 },
  { id: 'tornado', name: 'Comet Shovel', rarity: 'Mythic', power: 2500000, cost: 6000000000, gems: 1200 },
  { id: 'reactor', name: 'Genesis Shovel', rarity: 'Mythic', power: 5500000, cost: 13000000000, gems: 1375 },
  { id: 'shoulder', name: 'Galaxy Shovel', rarity: 'Mythic', power: 11000000, cost: 25000000000, gems: 1499 },
]
// Rarity look in the Shovels window: label colour (Mythic is a gradient), the preview tile's
// centre/edge colours, the light/sparkle colour and how many sparkles circle the model.
export const VACUUM_RARITY = {
  Common: { text: '#d6dde4', tile: ['#ffffff', '#c4ccd6'], glow: '#bfe6ff', sparkles: 6 },
  Uncommon: { text: '#2bdc2b', tile: ['#ffffff', '#a8eca0'], glow: '#7dff6a', sparkles: 10 },
  Rare: { text: '#3ac8ff', tile: ['#ffffff', '#9ad8ff'], glow: '#4ac8ff', sparkles: 14 },
  Epic: { text: '#d42aff', tile: ['#fff6ff', '#e0a6ff'], glow: '#e44aff', sparkles: 20 },
  Legendary: { text: '#ffc21a', tile: ['#fffbe8', '#ffd98a'], glow: '#ffc21a', sparkles: 26 },
  Mythic: { text: ['#c02aff', '#3a5aff', '#1ad8ff'], tile: ['#f4f0ff', '#a8b0ff'], glow: '#6a7aff', sparkles: 34 },
}
export const VACUUM_STAND = { x: 2, z: 23, rot: 2.59 } // matches the 'Shovels' stand in props.js (south-west of the promenade, facing the fountain)

// Auras window (auras.js): one aura is equipped at a time and multiplies the total dig
// power by `boost`. `cost` 0 = free to claim. `gems` is the Bloxbux price. `look` paints the icon.
export const AURAS = [
  { id: 'interstellar', name: 'Interstellar', boost: 1.5, cost: 0, gems: 0, look: 'gift' },
  { id: 'static', name: 'Static', boost: 1.2, cost: 100000, gems: 59, look: ['#6ad8ff', '#2f8cff', '#1fae7a'] },
  { id: 'cinderveil', name: 'Cinderveil', boost: 1.4, cost: 1500000, gems: 115, look: ['#ff5a3a', '#2a2a32', '#2fae3a'] },
  { id: 'shardfall', name: 'Shardfall', boost: 1.6, cost: 25000000, gems: 225, look: ['#6aff4a', '#2fae3a', '#2f5ae8'] },
  { id: 'slipstream', name: 'Slipstream', boost: 1.9, cost: 400000000, gems: 395, look: ['#4ac8ff', '#3fae5a', '#2f5ae8'] },
  { id: 'frostfire', name: 'Frostfire', boost: 2.2, cost: 7000000000, gems: 619, look: ['#3a8aff', '#3fae5a', '#2f5ae8'] },
]
export const SELL_STAND = { x: 8, z: -23.5, rot: 0.328 } // the 'Sell Loot' stand in props.js (north of the promenade, facing the fountain)
export const AURA_STAND = { x: 42.5, z: -8, rot: -1.28 } // the 'Auras' stand in props.js (east of the promenade, facing the fountain)

// Looping countdowns, seconds: period and the value shown on load.
export const TIMERS = {
  luckEvent: { period: 4 * 60, startAt: 3 * 60 + 54 },
}

// The top-left gift tile: this vacuum is free once the player has spent `playSeconds` in game (saved).
export const FREE_GIFT = { vacuum: 'packgun', playSeconds: 50 * 60 }
// Daily Login window (daily.js, the HUD's Daily tile): one claim per UTC day, days 1-7 in a row, then the
// streak starts over. Missing a day restarts it at day 1 when `resetOnMiss`. Rewards: `power` = trained
// power, `cash`, `boosts` = [{ kind: 'power' | 'cash', minutes }] (x2 while active, extend if stacked) and
// `vacuum` (owned for free, no level needed; equipped if it beats the current one). `look` paints the tile.
export const DAILY = {
  resetOnMiss: true,
  boostMult: 2,
  rewards: [
    { rarity: 'Common', boosts: [{ kind: 'power', minutes: 15 }], look: ['#ffffff', '#b4b8c0'] },
    { rarity: 'Uncommon', cash: 58600, look: ['#2a7bff', '#18c0a0', '#7a2aff'] },
    { rarity: 'Rare', boosts: [{ kind: 'cash', minutes: 20 }], look: ['#2aa8ff', '#68d4ff'] },
    { rarity: 'Rare', power: 38, look: ['#2aa8ff', '#7ae0ff'] },
    { rarity: 'Epic', boosts: [{ kind: 'power', minutes: 30 }], cash: 117000, look: ['#c02aff', '#7a1ae0'] },
    { rarity: 'Legendary', power: 76, boosts: [{ kind: 'cash', minutes: 30 }], look: ['#ffc21a', '#ff9a14'] },
    { rarity: 'Mythic', vacuum: 'triple', look: ['#ff6a2a', '#e8283a'] },
  ],
}
// New-player tutorial (tutorial.js; the step is saved with the account by net.js, and the backend's
// constants.ts TUTORIAL_DONE_STEP must equal `steps`). 0 hold click until `clickPower`, 1 stand on the x1.5
// training pile (`pad`) until `power`, 2 dig snow in Zone 1 until loot appears, 3 collect loot until the
// Bag is worth enough for `vacuum`, 4 go to the Sell Loot stall, 5 press Sell All, 6 close the window,
// 7 go to the Shovels stall, 8 buy `vacuum`, 9 done.
export const DISABLE_TUTORIALS = true // hides both the controls guide (hud.js) and the new-player tutorial (tutorial.js)
export const TUTORIAL = { steps: 9, clickPower: 5, power: 30, pad: 1.5, vacuum: 'suburban', completeMs: 3500 }
export const FONT_FAMILY = 'Fredoka'

export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
  GROUND: { roughness: 0.95, metalness: 0 },
}

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true'
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}
