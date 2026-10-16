// Every loot item (snow-themed): name, rarity, glyph and sell value. Which leaf piles drop what is decided in loot.js
// (x1 Luck zone: Common + Uncommon only; higher zones scale with LUCK_LOOT).

// Every collectable: [name, rarity, glyph, value in $]. Any of them can spawn, by rarity (see pickItem).
// Listed in Index order (stable-sorted by rarity below), so the first few of each tier show first.
const ITEMS = [
  // Common
  ['Wool Mitten', 'Common', '🧤', 10],
  ['Winter Boot', 'Common', '🥾', 12],
  ['Snowy Mug', 'Common', '☕', 14],
  ['Candy Cane', 'Common', '🍬', 16],
  ['Coal Button', 'Common', '⚫', 18],
  ['Carrot Nose', 'Common', '🥕', 20],
  ['Snowball', 'Common', '⚪', 10],
  ['Icicle', 'Common', '🧊', 13],
  ['Twig Arm', 'Common', '🌿', 11],
  ['Pinecone', 'Common', '🌲', 15],
  ['Snowflake Charm', 'Common', '❄️', 17],
  // Uncommon
  ['Silver Bell', 'Uncommon', '🔔', 126],
  ['Frozen Lunchbox', 'Uncommon', '🧰', 111],
  ['Toy Robot', 'Uncommon', '🤖', 158],
  ['Knit Scarf', 'Uncommon', '🧣', 79],
  ['Ice Skates', 'Uncommon', '⛸️', 142],
  ['Thermos Flask', 'Uncommon', '🫖', 95],
  ['Gingerbread Man', 'Uncommon', '🍪', 130],
  ['Sled Runner', 'Uncommon', '🛷', 150],
  // Rare
  ['Royal Christmas Chest', 'Rare', '🎁', 12000],
  ['Frost Crystal', 'Rare', '💠', 10300],
  ['Snowman Hat', 'Rare', '🎩', 8900],
  ['Ice Axe', 'Rare', '⛏️', 7670],
  ['Music Box', 'Rare', '🎶', 6600],
  ['Lantern', 'Rare', '🏮', 5690],
  ['Skis', 'Rare', '🎿', 4900],
  ['Snowshoes', 'Rare', '👣', 4220],
  ['Hot Cocoa Pot', 'Rare', '🍫', 3630],
  ['Snow Goggles', 'Rare', '🥽', 3130],
  ['Mistletoe Wreath', 'Rare', '🎄', 2700],
  ['Ornament Bauble', 'Rare', '🔴', 2320],
  ['Gift Box', 'Rare', '🎀', 2000],
  // Epic
  ['Glacier Gem', 'Epic', '💎', 150000],
  ['Frozen Mammoth Tusk', 'Epic', '🦣', 131000],
  ['Crystal Snow Globe', 'Epic', '🔮', 114000],
  ['Aurora Lantern', 'Epic', '🪔', 99200],
  ['Ice Sculpture', 'Epic', '🦢', 86400],
  ['Gingerbread House', 'Epic', '🏠', 75300],
  ['Frosted Chalice', 'Epic', '🏆', 65600],
  ['Polar Bear Plush', 'Epic', '🧸', 57200],
  ['Nutcracker', 'Epic', '💂', 49800],
  ["Santa's Hat", 'Epic', '🎅', 43400],
  ['Sleigh Bell Set', 'Epic', '🛎️', 37800],
  ['Reindeer Antlers', 'Epic', '🦌', 32900],
  ['Penguin Statue', 'Epic', '🐧', 28700],
  ['Yeti Footprint Cast', 'Epic', '🦶', 25000],
  // Legendary
  ['Frost Crown', 'Legendary', '👑', 1800000],
  ["Snow Queen's Wand", 'Legendary', '🪄', 1390000],
  ['Blizzard Orb', 'Legendary', '🌨️', 1080000],
  ['Golden Sleigh Bell', 'Legendary', '🔔', 835000],
  ['Polar Star Ornament', 'Legendary', '🌟', 647000],
  ['Icebound Gauntlet', 'Legendary', '🥊', 501000],
  ['Yeti Claw', 'Legendary', '🦴', 388000],
  ['Frozen Phoenix Feather', 'Legendary', '🪶', 300000],
  // Mythic
  ['Frozen Heart', 'Mythic', '💙', 20000000],
  ['Eternal Snowflake', 'Mythic', '❄️', 12900000],
  ['Ice Throne', 'Mythic', '🪑', 8370000],
  ['Blizzard Harp', 'Mythic', '🪕', 5410000],
  ['Winter Dreamcatcher', 'Mythic', '🕸️', 3500000],
  // Celestial
  ['Northern Lights Prism', 'Celestial', '🌈', 250000000],
  ['Glacial Pearl', 'Celestial', '🦪', 184000000],
  ['Aurora Veil', 'Celestial', '🌌', 136000000],
  ['Moonlit Icicle Blade', 'Celestial', '🗡️', 100000000],
  ['Void Snowglobe', 'Celestial', '🔮', 73700000],
  ['Ancient Ice Dragon Skull', 'Celestial', '🐉', 54300000],
  ['Frostbrand Sword', 'Celestial', '⚔️', 40000000],
  // Divine
  ['Star Tree Topper', 'Divine', '⭐', 700000000],
  ['Cosmic Snowflake', 'Divine', '✨', 624000000],
  ['Eternal Frost Clock', 'Divine', '⏳', 556000000],
  ['Seed of Winter', 'Divine', '🌱', 495000000],
  ['Everfrost Gem', 'Divine', '♾️', 441000000],
  ["Santa's Golden Sleigh", 'Divine', '🛷', 393000000],
  ['Crown of the Winter King', 'Divine', '🔱', 350000000],
]

// The x1 Luck zone drop plan (loot.js). Bag capacity is state.backpackMax (config HUD_START).
export const X1_DROPS = { piles: 11, uncommon: 2 } // of the zone's piles; the rest of the 11 are Common
// Higher Luck zones (x2 and up): the further out, the more piles drop loot, the more items
// each drops, and the higher their rarity.
//   fullAt   zone index (0 = x1) from which every pile drops loot
//   maxItems items per pile in the last zone (1 in x2, rising evenly)
//   bonus    chance of a lucky one-tier upgrade on each item (the last zone is already the top tier)
//   density  multiplier on the chance that a pile drops loot (0.5 = half as many loot piles)
export const LUCK_LOOT = { fullAt: 4, maxItems: 2, bonus: 0.1, density: 0.5 }
// Best rarity tier a zone tends to drop (zone 0 = x1): tiers spread evenly over the zones, so
// the rarest items only turn up in the last ones. Matches rollTier() in loot.js.
export function zoneTier(zone, zoneCount) {
  const tiers = RARITIES.filter((r) => Object.values(ITEM_INFO).some((i) => i.rarity === r))
  return tiers[Math.round((zone / (zoneCount - 1)) * (tiers.length - 1))]
}
export const LOOT_PICKUP_RANGE = 2.4 // metres, player to the item

// Rarity tiers in order, lowest to highest.
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Secret', 'Celestial', 'Divine']

// Every collectable shown in the Index window: [name, rarity, glyph].
export const ITEM_CATALOG = ITEMS.map(([name, rarity, glyph]) => [name, rarity, glyph]).sort(
  (a, b) => RARITIES.indexOf(a[1]) - RARITIES.indexOf(b[1]),
) // stable: keeps insertion order within a tier

// Per-item reference: name -> { rarity, value in $ }.
export const ITEM_INFO = Object.fromEntries(ITEMS.map(([name, rarity, , value]) => [name, { rarity, value }]))

// Sell Treasure row background per rarity tier (common = lavender, uncommon = green, ...).
export const RARITY_ROW_BG = {
  Common: '#a2a9e0',
  Uncommon: '#6ccb55',
  Rare: '#4aa6ff',
  Epic: '#c95cff',
  Legendary: '#ffb020',
  Mythic: '#ff5a7a',
  Secret: '#9fe8ff',
  Celestial: '#8a5cf0',
  Divine: '#ffe98a',
}

// Name / halo colours per rarity tier.
export const RARITY = {
  Common: { fill: '#c9c9c9', glow: '#ffffff' },
  Uncommon: { fill: '#4dff3a', glow: '#7dffd0' },
  Rare: { fill: '#2fa8ff', glow: '#7fd0ff' },
  Epic: { fill: '#e43bff', glow: '#d84aff' },
  Legendary: { fill: '#ffb020', glow: '#ffd36a' },
  Mythic: { fill: '#ff4a6a', glow: '#ff8aa0' },
  Secret: { fill: '#9fe8ff', glow: '#d0f4ff' },
  Celestial: { fill: '#7a3df0', glow: '#b48aff' },
  Divine: { fill: '#fff2a0', glow: '#fff8d0' },
}
