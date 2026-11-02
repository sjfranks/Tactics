// =====================================================================================================================
// GOBLIN CRYPT · THE RULES
// Everything that decides what happens lives here: stat blocks, cards, maps, dice, movement, sight and the goblins'
// minds. It knows nothing of the screen. A battle is a plain JSON state; acting on it changes the state and returns
// the story of what happened as a list of events, which the view plays back as animation, sound and text.
// To retune the game, edit TUNE, UNITS, CARDS, BOONS and LEVELS. To change how a rule works, edit the functions in battle().
// =====================================================================================================================
const GC = (() => {
'use strict';

// ---------------- tuning: every number the rules use ----------------
const TUNE = {
  ap: { hero: 3, gob: 2 },        // actions a turn (a stat block may set its own)
  stepH: .36,                     // one height step, measured in squares
  walkSteps: 2,                   // a rise of up to this many steps is walked like flat ground
  maxClimb: 2.3,                  // a taller rise is a cliff: one extra square of movement per square of height, up to this high
  sneak: 2,                       // extra dice for striking from hiding
  pack: 1,                        // extra dice for a warg biting a hero another warg stands beside
  haste: 1,                       // extra actions a hasted hero gets on its next turn
  burn: { damage: 2, rounds: 2 }, // standing in or walking through fire
  lava: 5, slam: 2, ledge: 2,     // shoved into lava, into something solid, off a ledge two steps or more
  ice: { rounds: 3 },             // an ice block melts after this many rounds
  vents: { every: 2 },            // fire vents erupt every so many rounds
  horn: { every: 3, cutters: 2, range: 4, max: 2 }, // Grubnash's war horn: how often, how many, how near, how many times
  smash: { length: 8, die: 10, cooldown: 2 },       // Grubnash Smash: lane length, damage die, rounds between smashes
  init: 10,                       // initiative die
  difficulty: { easy: { label: 'Easy', hp: .75 }, normal: { label: 'Normal', hp: 1 }, hard: { label: 'Hard', hp: 1.25 } }, // goblin health
  armourMax: 4,                   // armour: what each blow loses (Taunt +1, Prone −1, Rebuke −2, Frozen none), at most this
  ward: 2,                        // Ward and Mana Shield: armour added till the caster's next turn
  poison: { damage: 2, rounds: 2 }, // Poisoned Blade: damage at the start of each of the foe's next turns
  // experience: per action that hits, slays (each foe), heals or helps; to every hero standing at a victory; a level's
  // worth, and the max HP each level adds. Levels 2, 3 and 4 each teach a new power (GROWTH)
  xp: { hit: 6, kill: 14, heal: 6, help: 4, win: 20, level: 100, hp: 2, max: 6 },
  forecastTrials: 1500
};

// ---------------- stat blocks ----------------
// die: attack die · armour: what each blow loses (0 = none) · init: initiative bonus · lure: how much goblins want to hit it
const UNITS = {
  fighter: { side: 'hero', name: 'Brakka', role: 'Fighter', hp: 18, move: 2, die: 8, range: 1, armour: 2, init: 0, cards: ['f_attack', 'f_charge', 'f_taunt', 'f_cleave', 'f_grab'] },
  cleric: { side: 'hero', name: 'Sister Wenna', role: 'Cleric', hp: 13, move: 2, die: 6, range: 1, armour: 1, init: 0, lure: 4, cards: ['c_attack', 'c_heal', 'c_bless', 'c_haste', 'c_rebuke'] },
  mage: { side: 'hero', name: 'Orlen', role: 'Mage', hp: 9, move: 2, die: 6, range: 4, armour: 0, init: 1, lure: 8, cards: ['m_attack', 'm_fire', 'm_frost', 'm_icewall', 'm_wave'] },
  thief: { side: 'hero', name: 'Vex', role: 'Thief', hp: 11, move: 3, die: 4, range: 1, armour: 1, init: 3, cards: ['t_attack', 't_hide', 't_trick', 't_hook'] },
  cutter: { side: 'gob', name: 'Goblin Cutter', hp: 8, move: 2, die: 4, range: 1, init: 1, brain: 'brute', attack: 'Cleaver', note: 'Rushes the weakest hero in reach.' },
  archer: { side: 'gob', name: 'Goblin Archer', hp: 6, move: 2, die: 4, range: 4, init: 1, brain: 'shooter', attack: 'Shortbow', proj: 'arrow', note: 'Keeps its distance and shoots from up to 4 squares.' },
  warg: { side: 'gob', name: 'Warg', hp: 12, move: 3, die: 6, range: 1, armour: 2, init: 3, brain: 'brute', attack: 'Bite', speed: 1.4, pack: true, note: 'Runs 3 squares. Hunts in packs: +1 die on a hero another warg stands beside. Thick hide: armour 2.' },
  shaman: { side: 'gob', name: 'Goblin Shaman', hp: 8, move: 2, die: 6, range: 3, armour: 1, init: 0, brain: 'healer', attack: 'Hex', proj: 'hex', note: 'Heals hurt goblins; otherwise hexes from range 3.' },
  king: { side: 'gob', name: 'Grubnash', title: 'the Goblin King', ap: 2, hp: 40, move: 2, die: 8, range: 1, armour: 3, init: -1, boss: true, size: 2, brain: 'king', attack: 'Cleave', trample: true, note: "Fills a 2×2 block and kicks the fallen out of his way. Cleaves every hero beside him, can't be shoved, and blows his war horn every third round. Grubnash Smash: marks a path, then charges down it at the start of his next turn." }
};

// ---------------- cards: each hero's abilities ----------------
// target: enemy | ally | self | cell | grab · atk: a single attack (ranged, proj, die, bonus) · sweep: one roll against
// every foe 'around' (8 squares) or 'beside' (4) · area: a 3×3 blast · close: usable with a foe beside a caster ·
// weapon: rolls the hero's own weapon die (which a boon can raise) · n: dice thrown · uses: times a battle ·
// {die} in the text is filled in with the hero's actual dice
const CARDS = {
  f_attack: { name: 'Longsword', die: 8, weapon: true, target: 'enemy', range: 1, atk: {}, cost: 'Action', text: 'Deal {die}.', how: 'Tap a foe beside you.' },
  f_charge: { name: 'Charge', die: 8, weapon: true, target: 'enemy', range: 1, move: 4, cd: 2, atk: { bonus: 2 }, cost: 'Move+Act', text: 'Rush up to 4, {die}+2, push 1 and follow.', how: 'Tap a foe within 4.' },
  f_taunt: { name: 'Taunt', target: 'self', cd: 3, cost: 'Action', text: 'Foes must attack you. Armour +1.', how: 'Tap your hero.' },
  f_cleave: { name: 'Cleave', die: 8, weapon: true, target: 'self', cd: 2, need: 'around', sweep: 'around', cost: 'Action', text: '{die} to every foe around you.', how: 'Tap your hero.' },
  f_grab: { name: 'Grapple', target: 'grab', range: 1, cd: 2, need: 'adj', cost: 'Action', text: 'Move a foe or friend beside you 1 square, any way.', how: 'Tap a figure beside you, then a square.' },
  c_attack: { name: 'Mace', die: 6, weapon: true, target: 'enemy', range: 1, atk: {}, cost: 'Action', text: 'Deal {die}.', how: 'Tap a foe beside you.' },
  c_heal: { name: 'Heal', die: 6, target: 'ally', range: 3, heal: true, revive: true, cost: 'Action', text: 'Heal {die}; dice explode. Raises a fallen hero.', how: 'Select a hero within 3.' },
  c_bless: { name: 'Bless', target: 'ally', range: 3, cd: 2, cost: 'Action', text: 'Their next roll gets +1 die.', how: 'Select a hero within 3.' },
  c_haste: { name: 'Haste', target: 'ally', range: 3, cd: 3, cost: 'Action', text: '+1 action on their next turn.', how: 'Select a hero within 3.' },
  c_rebuke: { name: 'Rebuke', target: 'enemy', range: 3, cd: 2, cost: 'Action', text: 'Lay a foe bare: armour −2 till your next turn.', how: 'Tap a foe within 3.' },
  m_attack: { name: 'Arcane Bolt', die: 6, weapon: true, target: 'enemy', range: 4, atk: { ranged: true, proj: 'arcane' }, cost: 'Action', text: 'Deal {die} at range.', how: 'Tap a foe within 4.' },
  m_fire: { name: 'Fireball', die: 6, target: 'cell', range: 4, cd: 3, area: 1, cost: 'Action', text: '{die} to a 3×3; it burns 2 rounds. Hits allies.', how: 'Tap a square twice.' },
  m_frost: { name: 'Frost Ray', die: 4, target: 'enemy', range: 4, cd: 2, atk: { ranged: true, proj: 'frost', die: 4 }, cost: 'Action', text: 'Deal {die} and Freeze: no armour. Not in fire.', how: 'Tap a foe within 4.' },
  m_icewall: { name: 'Ice Wall', target: 'cell', range: 4, cd: 3, wall: true, cost: 'Action', text: 'Raise 3 ice blocks. Puts out fire.', how: 'Tap a square twice.' },
  m_wave: { name: 'Thunderwave', die: 4, target: 'self', cd: 3, need: 'foe', sweep: 'beside', shove: true, close: true, cost: 'Action', text: '{die} to foes beside you and shove them back.', how: 'Tap your hero.' },
  t_attack: { name: 'Dagger', die: 4, weapon: true, target: 'enemy', range: 1, atk: {}, cost: 'Action', text: 'Deal {die}. Flanked: +1 die.', how: 'Tap a foe beside you.' },
  t_hide: { name: 'Hide', target: 'self', cd: 3, cost: 'Action', text: 'Unseen till the end of your next turn. Next attack +2 dice.', how: 'Tap your hero.' },
  t_trick: { name: 'Dirty Trick', target: 'enemy', range: 1, cd: 2, cost: 'Action', text: 'Knock Prone: armour −1. Stays hidden.', how: 'Tap a foe beside you.' },
  t_hook: { name: 'Rope Hook', target: 'cell', range: 3, reach: 'move', cd: 2, spot: true, cost: 'Action', text: 'Swing as far as you move, over walls and up cliffs.', how: 'Tap a square twice.' },
  // powers a hero learns by levelling up (GROWTH says which, in what order)
  f_bash: { name: 'Shield Bash', die: 6, target: 'enemy', range: 1, cd: 2, atk: { die: 6 }, cost: 'Action', text: 'Deal {die} and knock the foe Prone.', how: 'Tap a foe beside you.' },
  f_cry: { name: 'War Cry', target: 'self', cd: 3, cost: 'Action', text: 'Every hero within 3 is Blessed: +1 die on their next roll.', how: 'Tap your hero.' },
  f_execute: { name: 'Execute', die: 8, weapon: true, target: 'enemy', range: 1, cd: 2, atk: { execute: 4 }, cost: 'Action', text: 'Deal {die}, and +4 to a foe at half health or less.', how: 'Tap a foe beside you.' },
  c_smite: { name: 'Smite', die: 6, target: 'enemy', range: 3, cd: 1, atk: { ranged: true, proj: 'holy', die: 6 }, cost: 'Action', text: 'Deal {die} at range 3.', how: 'Tap a foe within 3.' },
  c_prayer: { name: 'Prayer of Mending', die: 4, target: 'self', cd: 3, cost: 'Action', text: 'One roll of {die} heals every hero on their feet within 2.', how: 'Tap your hero.' },
  c_ward: { name: 'Ward', target: 'ally', range: 3, cd: 2, cost: 'Action', text: 'Armour +2 till your next turn.', how: 'Select a hero within 3.' },
  m_chain: { name: 'Chain Lightning', die: 6, target: 'enemy', range: 4, cd: 3, atk: { ranged: true, proj: 'arcane', die: 6 }, cost: 'Action', text: 'Deal {die}, then d4 to up to two more foes within 2 of it.', how: 'Tap a foe within 4.' },
  m_blink: { name: 'Blink', target: 'cell', range: 3, reach: 'blink', spot: true, cd: 2, cost: 'Action', text: 'Vanish and appear on an open square within 3, walls or no walls.', how: 'Tap a square twice.' },
  m_shield: { name: 'Mana Shield', target: 'self', cd: 3, close: true, cost: 'Action', text: 'Armour +2 till your next turn.', how: 'Tap your hero.' },
  t_knives: { name: 'Throwing Knives', die: 4, n: 2, target: 'enemy', range: 4, cd: 1, atk: { ranged: true, proj: 'arrow', die: 4, extra: 1 }, cost: 'Action', text: 'Throw {die} at range 4.', how: 'Tap a foe within 4.' },
  t_poison: { name: 'Poisoned Blade', die: 4, weapon: true, target: 'enemy', range: 1, cd: 2, atk: {}, cost: 'Action', text: 'Deal {die} and Poison: 2 at the start of its next 2 turns.', how: 'Tap a foe beside you.' },
  t_smoke: { name: 'Smoke Bomb', target: 'self', cd: 4, cost: 'Action', text: 'Vex and every hero beside her are Hidden.', how: 'Tap your hero.' },
  potion: { name: 'Healing Draught', die: 4, n: 2, target: 'ally', range: 1, heal: true, uses: 1, cost: 'Action', text: 'Heal {die}; dice explode. One a battle.', how: 'Tap yourself or a hero beside you.' }
};

// ---------------- growth: the powers each hero learns at levels 2, 3 and 4 ----------------
const GROWTH = {
  fighter: ['f_bash', 'f_execute', 'f_cry'],
  cleric: ['c_smite', 'c_ward', 'c_prayer'],
  mage: ['m_chain', 'm_shield', 'm_blink'],
  thief: ['t_knives', 't_poison', 't_smoke']
};
const powersAt = (kind, lv) => (GROWTH[kind] || []).slice(0, Math.max(0, lv - 1));
// experience joins a hero's growth ({ lv, xp }); what each level gained brings, in order: [{ lv, power }]
function gainXp(g, kind, n) {
  const ups = []; g.xp += n;
  while (g.xp >= TUNE.xp.level && g.lv < TUNE.xp.max) { g.xp -= TUNE.xp.level; g.lv++; ups.push({ lv: g.lv, power: GROWTH[kind][g.lv - 2] || null }); }
  if (g.lv >= TUNE.xp.max) g.xp = 0;
  return ups;
}
// the level a party would have reached by a battle (for the level select): about 55 to 95 XP a battle, more for the later ones
const partyGrowth = level => { const lv = [1, 1, 2, 2, 3][Math.min(4, LEVELS[level].boons ?? level)], o = {}; for (const k of Object.keys(GROWTH)) o[k] = { lv, xp: 0 }; return o; };

// ---------------- boons: what the party earns between battles ----------------
// After each victory the party picks one of three. who: a hero's kind, or 'party' for all four. mod: die (the weapon
// die), armour (added), hp, move, init · cards: changes to one hero's cards (die, n dice, cd added to the cooldown) ·
// add: a card every hero gains · start: a status every hero starts each battle with
const BOONS = {
  tempered: { who: 'fighter', name: 'Tempered Blade', text: "Brakka's sword is reforged: his blows roll d10.", mod: { die: 10 } },
  shieldwall: { who: 'fighter', name: 'Shield Wall', text: "A dwarf-made shield: Brakka's armour rises to 3.", mod: { armour: 1 } },
  bulwark: { who: 'fighter', name: 'Bulwark', text: 'Brakka trains through the night: +5 HP.', mod: { hp: 5 } },
  hands: { who: 'cleric', name: 'Blessed Hands', text: "Sister Wenna's Heal rolls 2d6.", cards: { c_heal: { n: 2 } } },
  litany: { who: 'cleric', name: 'Litany of Haste', text: 'Bless and Haste come back a round sooner.', cards: { c_bless: { cd: -1 }, c_haste: { cd: -1 } } },
  zeal: { who: 'cleric', name: 'Holy Zeal', text: "Sister Wenna's mace rolls d8, and she gains +3 HP.", mod: { die: 8, hp: 3 } },
  wildfire: { who: 'mage', name: 'Wildfire', text: "Orlen's Fireball rolls d8.", cards: { m_fire: { die: 8 } } },
  deepfrost: { who: 'mage', name: 'Deep Frost', text: 'Frost Ray rolls d6 and comes back a round sooner.', cards: { m_frost: { die: 6, cd: -1 } } },
  wards: { who: 'mage', name: 'Warding Robes', text: 'Orlen gains armour 1 and +3 HP.', mod: { armour: 1, hp: 3 } },
  serrated: { who: 'thief', name: 'Serrated Dagger', text: "Vex's dagger rolls d6.", mod: { die: 6 } },
  fleet: { who: 'thief', name: 'Fleet Foot', text: 'Vex moves 4 squares, and the Rope Hook swings as far.', mod: { move: 1 } },
  shadow: { who: 'thief', name: 'Shadow Cloak', text: 'Hide comes back a round sooner, and Vex gains +3 HP.', cards: { t_hide: { cd: -1 } }, mod: { hp: 3 } },
  draughts: { who: 'party', name: 'Healing Draughts', text: 'Every hero carries a draught into each battle: drink it, or pour it for a friend beside you, to heal 2d4.', add: 'potion' },
  hardened: { who: 'party', name: 'Battle-Hardened', text: 'Every hero gains +3 HP.', mod: { hp: 3 } },
  banner: { who: 'party', name: 'War Banner', text: 'Every hero starts each battle Blessed.', start: 'blessed' },
  scouts: { who: 'party', name: 'Scouting', text: 'Every hero rolls initiative with +2.', mod: { init: 2 } }
};
// three boons the party has not taken, for three different heroes (or the party) where it can
function offerBoons(taken = [], rnd = Math.random, n = 3) {
  const pool = Object.keys(BOONS).filter(id => !taken.includes(id)), out = [];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const id of pool) if (out.length < n && !out.some(o => BOONS[o].who === BOONS[id].who)) out.push(id);
  for (const id of pool) if (out.length < n && !out.includes(id)) out.push(id);
  return out;
}
// the boons a party would carry into a battle without playing the campaign up to it: one pick of three offered after
// each earlier battle (or as many as the battle asks for)
function partyBoons(level, rnd = Math.random) {
  const got = [], n = LEVELS[level].boons ?? Math.min(level, CAMPAIGN);
  for (let i = 0; i < n; i++) { const o = offerBoons(got, rnd); got.push(o[Math.floor(rnd() * o.length)]); }
  return got;
}

// ---------------- the battles ----------------
// map rows: '.' ground, '1'–'4' ground raised that many steps, '#' wall or rock, '~' lava, '^' fire vent, ' ' gorge,
// '=' bridge. hills: [ax, az, bx, bz, flat radius, foot radius, height in squares], a ridge along a→b in square corners.
// props stand on squares and block them. art: what only the view needs (light, the carpet).
const HERO_START = [['fighter', 2, 6], ['cleric', 1, 7], ['mage', 3, 7], ['thief', 4, 6]];
const LEVELS = [
  { name: 'The Gorge Crossing', theme: 'outdoor', text: "Goblins hold the far side of a gorge, and two rope bridges are the only way across. Their archers loose from a rise at the back; the grassy hill behind you gives your own shots the high ground, +1 die. Rocks and trees give cover from arrows. Shove, charge or haul a goblin into the gorge and it falls to its death.",
    map: ['22...#', '22....', '..#...', '......', ' =  = ', '......', '......', '......'],
    hills: [[0, 8, 1.5, 7, .4, 2.6, 1], [3, 1.5, 4, 1.5, .2, 1.6, .55]],
    props: [['campfire', 4, 1], ['tree', 5, 7]],
    foes: [['archer', 0, 0], ['archer', 3, 0], ['cutter', 2, 1], ['cutter', 1, 3], ['cutter', 4, 3]],
    art: { sky: [0xc4c6c4, 0x3a3026, 0xeee6d6, 1.4, 0x34322d] } },
  { name: 'Goblin Ridge', theme: 'outdoor', text: "The goblins have camped on a steep ridge two squares above the road, and a shaman tends them from the top: while it lives, their wounds close. Shooting down the slope adds +1 die, and the hillock by your start gives you the same. An archer holds a sheer bluff to the east: its cliff costs an extra square to climb, or Vex can swing straight up with the Rope Hook.",
    map: ['......', '......', '..#...', '....44', '....44', '......', '......', '......'],
    hills: [[0, 0, 3, 0, .6, 4.4, 2], [1, 5.2, 1.6, 5.2, .3, 1.8, .8]],
    props: [['campfire', 1, 1], ['tree', 5, 7]],
    foes: [['archer', 0, 0], ['archer', 4, 0], ['shaman', 2, 0], ['cutter', 2, 1], ['cutter', 4, 1], ['cutter', 1, 3], ['archer', 5, 3]],
    art: { sky: [0xc4c6c4, 0x3a3026, 0xeee6d6, 1.4, 0x34322d] } },
  { name: 'The Warg Pens', theme: 'crypt', text: "Wargs prowl a raised pen behind the crypt wall, and they hunt as a pack: a warg biting a hero another warg stands beside rolls +1 die. They run three squares a move and their hide is thick, armour 2; Rebuke, Frost Ray and a knock-down all cut through it. Walls block arrows and spells. Keep the mage behind a wall of steel.",
    map: ['22#...', '22....', '22....', '##..##', '......', '......', '......', '......'],
    props: [['cage', 5, 0], ['barrels', 0, 4], ['pillar', 4, 5]],
    foes: [['warg', 0, 0], ['warg', 1, 1], ['warg', 0, 2], ['shaman', 1, 0], ['cutter', 3, 1], ['archer', 5, 2], ['cutter', 2, 4], ['archer', 4, 0]],
    art: { sky: [0x8e887e, 0x1e1812, 0xe2d6c4, 1.05, 0x16130f] } },
  { name: 'The Forge Pits', theme: 'lava', text: "Under the hall the goblins work their forges over channels of molten rock. Three archers and a shaman hold the forge platforms beyond a lava channel; wargs and cutters wait on this side of it, and the one way up crosses a vent. Fire vents spit flame every second round, and anyone standing on one burns. Shove, charge or haul a goblin into the lava for +5.",
    map: ['22..22', '22^.22', '~~..~~', '......', '.^..^.', '~....~', '......', '......'],
    props: [['barrels', 0, 7], ['brazier', 5, 7]],
    foes: [['archer', 0, 0], ['archer', 1, 1], ['archer', 5, 0], ['shaman', 3, 0], ['cutter', 2, 2], ['cutter', 0, 3], ['cutter', 5, 3], ['warg', 2, 3], ['warg', 3, 3], ['warg', 4, 3]],
    art: { sky: [0x8a5a48, 0x2a0c06, 0xffb27a, 1.0, 0x140806] } },
  { name: 'Throne of Grubnash', theme: 'throne', text: "The Goblin King's hall. Grubnash waits on his throne with his court, all wide awake. He fills a 2×2 block, cleaves every hero beside him, can't be shoved and kicks the fallen out of his way, and twice he will blow his war horn for more cutters. His hide is armour 3: Rebuke and frost lay him bare. When he lines up a Grubnash Smash, its path glows red: get out of it before his next turn. Bring him down and his court will flee.",
    map: ['#..#2222#..#', '#..#2222#..#', '#...2222...#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '####....####', '............', '............'],
    heroes: [['fighter', 4, 12], ['cleric', 5, 13], ['mage', 6, 13], ['thief', 7, 12]],
    props: [['throne', 5, 0], ['brazier', 3, 2], ['brazier', 8, 2], ['pillar', 2, 4], ['pillar', 9, 4], ['pillar', 2, 8], ['pillar', 9, 8], ['barrels', 0, 12], ['barrels', 11, 13]],
    rout: true, // the court flees when its king falls
    foes: [['king', 5, 1], ['shaman', 7, 0], ['archer', 1, 0], ['archer', 10, 0], ['cutter', 4, 6], ['cutter', 7, 6], ['cutter', 2, 7], ['archer', 10, 4], ['warg', 5, 9], ['warg', 6, 9]],
    art: { sky: [0x9a8476, 0x1e140e, 0xeccdae, 1.05, 0x150e0b], carpet: [5, 3, 6, 12] } },
  // battles past the campaign are played from the level select only
  { name: 'The Reeve\'s House', extra: true, theme: 'house', text: "Goblins have taken the reeve's house: two floors, one above the other, and a single stair between them. You come in by the front door. Cutters, wargs and a shaman hold the rooms downstairs; archers and a second shaman wait on the upper floor and can shoot down the stairwell. Walls block sight downstairs, and no one sees through a floor. Use the floor button on the left to look at the ground floor or the upper floor.",
    // ground floor: '2' and '4' are the stair, climbing north to the landing at the upper floor's height (5)
    map: ['...#..', '...#..', '#..#.#', '.....4', '..#.#2', '..#...', '......', '......'],
    deck: ['555555', '555555', '555555', '55555.', '55555.', '555555', '555555', '555555'],
    stone: [[0, 0, 5, 7]],
    props: [['table', 0, 4], ['barrels', 5, 0], ['crates', 0, 7], ['bed', 5, 6, 1], ['crates', 2, 2, 1], ['table', 3, 4, 1], ['barrels', 0, 0, 1]],
    boons: 2, // a party fighting it from the level select carries this many boons
    foes: [['cutter', 1, 0], ['cutter', 4, 1], ['warg', 3, 3], ['warg', 1, 3], ['shaman', 4, 0], ['shaman', 4, 0, 1], ['archer', 4, 3, 1], ['archer', 1, 5, 1], ['archer', 3, 0, 1], ['cutter', 2, 1, 1], ['cutter', 4, 7, 1]],
    art: { sky: [0x9a8a7a, 0x1e160f, 0xf0d2a8, 1.1, 0x17110c] } }
];
const CAMPAIGN = LEVELS.filter(L => !L.extra).length; // the campaign is the battles before the extras

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (c, r, l) => l ? c + ',' + r + ',' + l : c + ',' + r;
const parseKey = k => { const [c, r, l = 0] = k.split(',').map(Number); return { c, r, l }; };
const COVER = new Set(['ice', 'wall', 'pillar', 'barrels', 'cage', 'tree', 'idol', 'throne', 'brazier', 'cauldron', 'crates', 'table', 'bed']);

// ---------------- dice ----------------
// count dice (plus dis more on the first throw, the highest dis set aside); every top face on a kept die is a crit that
// explodes into another die, up to six throws. noCrit: nothing explodes (ranged attacks).
function rollWith(rnd, sides, count, dis = 0, noCrit = false) {
  const rows = [], kept = [], dropped = []; let pending = count + dis, crits = 0;
  for (let row = 0; pending > 0 && row < 6; row++) {
    const vals = Array.from({ length: pending }, () => 1 + Math.floor(rnd() * sides));
    const drops = dis && row === 0 ? [...vals.keys()].sort((a, b) => vals[b] - vals[a]).slice(0, dis) : [];
    let next = 0;
    vals.forEach((v, i) => { if (drops.includes(i)) { dropped.push(v); return; } kept.push(v); if (v === sides && !noCrit) { next++; crits++; } });
    rows.push({ vals, drops }); pending = next;
  }
  return { sides, count, dis, noCrit, rows, kept, dropped, crits, total: kept.reduce((a, b) => a + b, 0) };
}
const allOnes = r => r.kept.length > 0 && r.kept.every(v => v === 1);

// ---------------- the board: everything about a map that never changes in battle ----------------
function buildBoard(L) {
  const rows = L.map, R = rows.length, C = rows[0].length;
  const lift = rows.some(s => s.includes('~')) ? 2 : 0; // lava lies in pits two steps below the floor
  const map = rows.map(s => [...s].map(ch => ch === '#' ? -1 : ch === '~' || ch === ' ' ? 0 : (+ch || 0) + lift));
  const terr = rows.map(s => [...s].map(ch => ch === '#' ? 'wall' : ch === '~' ? 'lava' : ch === '^' ? 'vent' : ch === ' ' ? 'chasm' : ch === '=' ? 'bridge' : 'floor'));
  // a bridge hangs level with the floor at its north end (or, for one running east–west, its west end)
  terr.forEach((row, r) => row.forEach((t, c) => {
    if (t !== 'bridge') return;
    let rr = r; while (rr > 0 && terr[rr - 1][c] === 'bridge') rr--;
    let cc = c; while (cc > 0 && terr[r][cc - 1] === 'bridge') cc--;
    map[r][c] = rr > 0 && terr[rr - 1][c] === 'floor' ? map[rr - 1][c] : cc > 0 && terr[r][cc - 1] === 'floor' ? map[r][cc - 1] : 0;
  }));
  const vents = []; terr.forEach((row, r) => row.forEach((t, c) => { if (t === 'vent') vents.push([c, r]); }));
  const deck = (L.deck || []).map(s => [...s].map(ch => ch === '.' ? -1 : +ch + lift));
  const base = map.map(row => row.slice());
  const B = { cols: C, rows: R, map, base, deck, terr, vents, obst: {}, obst1: {}, slope: null, outdoor: L.theme === 'outdoor' };
  const inB = (c, r) => c >= 0 && c < C && r >= 0 && r < R, baseH = (c, r) => (base[r][c] > 0 ? base[r][c] : 0);
  if (B.outdoor) {
    // outdoor ground rolls in hills: a height at every square corner, level wherever ground meets a ledge, wall, gorge or the edge
    const W = C + 1, h = new Array(W * (R + 1)).fill(0), ok = new Array(W * (R + 1)).fill(0);
    const sd = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
    for (let j = 0; j <= R; j++) for (let i = 0; i <= C; i++) {
      const cs = [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]].filter(([c, r]) => inB(c, r));
      if (cs.some(([c, r]) => !['floor', 'wall'].includes(terr[r][c]))) continue;
      const fl = cs.filter(([c, r]) => terr[r][c] === 'floor'); if (!fl.length || new Set(fl.map(([c, r]) => baseH(c, r))).size > 1) continue;
      let y = 0;
      for (const [ax, az, bx, bz, r0, r1, hh] of L.hills || []) { const q = sd(i, j, ax, az, bx, bz), k = q <= r0 ? 1 : q >= r1 ? 0 : 1 - (t => t * t * (3 - 2 * t))((q - r0) / (r1 - r0)); y = Math.max(y, hh * k); }
      h[j * W + i] = y; ok[j * W + i] = 1;
    }
    B.slope = { h, ok, W };
    // the rules see a hilltop as high ground: each square's height includes the rise of the hill under its middle
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (terr[r][c] === 'floor') map[r][c] = baseH(c, r) + Math.round(slopeAt(B, c + .5, r + .5) / TUNE.stepH);
  }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (['wall', 'lava', 'chasm'].includes(terr[r][c])) B.obst[key(c, r)] = terr[r][c];
  (L.props || []).forEach(([type, c, r, l]) => { const o = l ? B.obst1 : B.obst; o[key(c, r)] = type; if (type === 'throne') o[key(c + 1, r)] = type; }); // a fourth number puts it on the upper floor
  B.maxh = Math.max(0, ...map.flat(), ...deck.flat());
  return B;
}
// a hill's rise at a point measured in square corners (0..cols, 0..rows), between the corners around it
function slopeAt(B, fx, fz) {
  const S = B.slope; if (!S) return 0;
  const i = Math.max(0, Math.min(B.cols - 1, Math.floor(fx))), j = Math.max(0, Math.min(B.rows - 1, Math.floor(fz))), u = fx - i, v = fz - j, H = S.h, W = S.W;
  return (H[j * W + i] * (1 - u) + H[j * W + i + 1] * u) * (1 - v) + (H[(j + 1) * W + i] * (1 - u) + H[(j + 1) * W + i + 1] * u) * v;
}

// ---------------- a fresh battle ----------------
// each unit carries its own die, armour, move, initiative bonus and cards, so boons and difficulty can change them
function makeUnit(S, kind, c, r, l = 0) {
  const d = UNITS[kind], ap = d.ap || TUNE.ap[d.side], k = d.side === 'gob' ? (TUNE.difficulty[S.diff] || TUNE.difficulty.normal).hp : 1, hp = Math.max(1, Math.round(d.hp * k));
  const u = { id: S.units.length, kind, side: d.side, name: d.name, hp, maxHp: hp, c, r, l, size: d.size || 1, ap, apMax: ap, atks: 0, cd: {}, st: {}, alive: true, down: false, asleep: false, init: 0,
    die: d.die, armour: d.armour || 0, move: d.move, initBonus: d.init || 0, cards: (d.cards || []).slice(), mods: {}, uses: {} };
  S.units.push(u); return u;
}
// a fresh battle. opts.boons: the boons the party has earned; opts.diff: easy | normal | hard
function newState(level, seed = (Math.random() * 4294967296) >>> 0, opts = {}) {
  const L = LEVELS[level];
  const S = { v: 3, level, rng: seed >>> 0, round: 1, turn: -1, order: [], active: null, phase: 'intro', result: null, units: [], ice: {}, burn: {}, smash: null, horns: 0, stats: {},
    diff: TUNE.difficulty[opts.diff] ? opts.diff : 'normal', boons: (opts.boons || []).filter(id => BOONS[id]) };
  for (const [kind, c, r, l] of [...(L.heroes || HERO_START), ...L.foes]) makeUnit(S, kind, c, r, l || 0);
  // growth: each hero's level brings its powers and its health; xp: whether this battle counts experience
  S.xp = !!opts.xp;
  if (opts.growth) for (const u of S.units) { const g = u.side === 'hero' && opts.growth[u.kind]; if (!g) continue; u.lv = g.lv; for (const id of powersAt(u.kind, g.lv)) if (!u.cards.includes(id)) u.cards.push(id); const add = (g.lv - 1) * TUNE.xp.hp; u.maxHp += add; u.hp += add; }
  S.units.forEach(u => { if (u.side === 'hero') S.stats[u.id] = { dealt: 0, kills: 0, crits: 0, healed: 0, taken: 0, downs: 0, xp: 0 }; else if (L.wake) u.asleep = true; });
  S.boons.forEach(id => applyBoon(S, BOONS[id]));
  return S;
}
function applyBoon(S, b) {
  for (const u of S.units) {
    if (u.side !== 'hero' || (b.who !== 'party' && b.who !== u.kind)) continue;
    const m = b.mod || {};
    if (m.die) u.die = m.die;
    if (m.armour) u.armour = Math.min(TUNE.armourMax, u.armour + m.armour);
    if (m.hp) { u.maxHp += m.hp; u.hp += m.hp; }
    if (m.move) u.move += m.move;
    if (m.init) u.initBonus += m.init;
    for (const id in b.cards || {}) { const o = u.mods[id] || (u.mods[id] = {}), add = b.cards[id]; for (const k in add) o[k] = k === 'cd' ? (o.cd || 0) + add.cd : add[k]; }
    if (b.add && !u.cards.includes(b.add)) { u.cards.push(b.add); if (CARDS[b.add].uses) u.uses[b.add] = CARDS[b.add].uses; }
    if (b.start) u.st[b.start] = true;
  }
}

// =====================================================================================================================
// battle(state): the rules bound to one battle. Queries read the state; actions change it and return events.
// =====================================================================================================================
function battle(S) {
  const L = LEVELS[S.level], B = buildBoard(L);
  let out = [];
  const ev = e => (out.push(e), e);
  const run = fn => { out = []; fn(); const evs = out; out = []; return evs; };
  // a seeded generator kept in the state, so a battle replays the same from the same state
  const rnd = () => { let t = (S.rng = (S.rng + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ---------------- the board ----------------
  const inB = (c, r) => c >= 0 && c < B.cols && r >= 0 && r < B.rows;
  const hasDeck = (c, r) => !!(B.deck[r] && B.deck[r][c] >= 0);
  const hAt = (c, r, l) => l ? (hasDeck(c, r) ? B.deck[r][c] : 0) : (B.map[r] && B.map[r][c] > 0 ? B.map[r][c] : 0);
  const baseH = (c, r) => (B.base[r] && B.base[r][c] > 0 ? B.base[r][c] : 0);
  const covered = (c, r, l) => !l && hasDeck(c, r); // on the ground floor under a roof
  const isWall = (c, r) => inB(c, r) && B.map[r][c] < 0;
  const obstAt = (c, r) => S.ice[key(c, r)] ? 'ice' : B.obst[key(c, r)];
  const obstOn = (c, r, l) => l ? B.obst1[key(c, r)] : obstAt(c, r); // what stands on a square of either floor
  const levelOf = q => q.l ? hAt(q.c, q.r, 1) : baseH(q.c, q.r); // raised ground only: ledges, not hills
  const burning = (c, r, l) => !!S.burn[key(c, r, l)];
  const floorsAt = (c, r) => [...(obstAt(c, r) ? [] : [0]), ...(hasDeck(c, r) && !B.obst1[key(c, r)] ? [1] : [])];
  // from one floor to the other only where nothing is overhead: off the open stair, never through a ceiling
  const between = (fc, fr, fl, c, r, l) => (fl || 0) === (l || 0) || !hasDeck(l ? fc : c, l ? fr : r);
  const climbCost = dh => dh <= TUNE.walkSteps ? 0 : dh * TUNE.stepH <= TUNE.maxClimb ? Math.max(1, Math.round(dh * TUNE.stepH)) : Infinity;

  // ---------------- pieces ----------------
  const U = id => S.units[id];
  const def = u => UNITS[u.kind];
  const sz = q => (q && q.size) || 1;
  const gap = (a0, an, b0, bn) => Math.max(0, b0 - (a0 + an - 1), a0 - (b0 + bn - 1));
  const covers = (u, c, r) => c >= u.c && c < u.c + sz(u) && r >= u.r && r < u.r + sz(u);
  const cellsOf = (q, c = q.c, r = q.r) => { const n = sz(q), o = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) o.push([c + i, r + j]); return o; };
  const cheb = (a, b) => Math.max(gap(a.c, sz(a), b.c, sz(b)), gap(a.r, sz(a), b.r, sz(b)));
  // squares apart; between floors a big height gap adds to it, so nobody strikes through a ceiling
  const dist = (a, b) => gap(a.c, sz(a), b.c, sz(b)) + gap(a.r, sz(a), b.r, sz(b)) + ((a.l || 0) !== (b.l || 0) ? Math.max(0, Math.abs(hAt(a.c, a.r, a.l) - hAt(b.c, b.r, b.l)) - 1) : 0);
  const occ = (c, r, l = 0) => S.units.find(u => u.alive && (u.l || 0) === (l || 0) && covers(u, c, r)) || null;
  const up = u => !!u && u.alive && !u.down; // on its feet and in the fight
  const heroes = () => S.units.filter(u => u.side === 'hero' && up(u));
  const gobs = () => S.units.filter(u => u.side === 'gob' && u.alive);
  const short = u => u.name.replace(/^Goblin /, '');
  const nm = u => `<b>${u.name}</b>`;
  const at = u => ({ c: u.c, r: u.r, l: u.l || 0 });
  const moveOf = u => u.move ?? def(u).move;
  // a unit's own dice and cards (boons change them): the weapon die, a card's die, how many it throws, its cooldown
  const dieOf = u => u.die || def(u).die;
  const cardsOf = u => u.cards || def(u).cards;
  const cardMod = (u, id) => (u.mods && u.mods[id]) || {};
  const cardDie = (u, id) => cardMod(u, id).die || (CARDS[id].weapon ? dieOf(u) : CARDS[id].die);
  const cardN = (u, id) => cardMod(u, id).n || CARDS[id].n || 1;
  const cardCd = (u, id) => Math.max(0, (CARDS[id].cd || 0) + (cardMod(u, id).cd || 0));
  const diceName = (u, id) => { const d = cardDie(u, id), n = cardN(u, id); return d ? (n > 1 ? n : '') + 'd' + d : ''; };
  const cardText = (u, id) => CARDS[id].text.replace('{die}', diceName(u, id));
  const atkOf = (u, id) => ({ ...CARDS[id].atk, ...(CARDS[id].weapon ? {} : { die: cardDie(u, id) }) }); // a card's single attack, with the hero's dice
  const isRanged = u => def(u).range > 1;
  const dieName = d => d ? 'd' + d : 'none';
  const hOf = (u, c, r, l) => sz(u) > 1 ? Math.max(...cellsOf(u, c, r).map(([x, z]) => hAt(x, z))) : hAt(c, r, l);
  // a large creature fits where every square of its block is open ground, free of others, and no more than two steps uneven;
  // pass: just walking through, when the fallen can be stepped over
  function fits(u, c, r, pass = false) {
    const cs = cellsOf(u, c, r);
    if (cs.some(([x, z]) => { if (!inB(x, z) || obstAt(x, z)) return true; const o = occ(x, z); return o && o !== u && !(pass && o.down); })) return false;
    const hs = cs.map(([x, z]) => hAt(x, z)); return Math.max(...hs) - Math.min(...hs) <= 2;
  }

  // ---------------- movement and sight ----------------
  // every square u can walk to with mv squares of movement: friends and the fallen can be passed but not stood on, foes block
  function reach(u, mv = moveOf(u)) {
    const res = new Map(), k0 = key(u.c, u.r, u.l), q = [k0];
    res.set(k0, { c: u.c, r: u.r, l: u.l || 0, cost: 0, prev: null });
    while (q.length) {
      let bi = 0; for (let i = 1; i < q.length; i++) if (res.get(q[i]).cost < res.get(q[bi]).cost) bi = i;
      const k = q.splice(bi, 1)[0], n = res.get(k); if (n.cost >= mv) continue;
      for (const [dc, dr] of DIRS) {
        const c = n.c + dc, r = n.r + dr; if (!inB(c, r)) continue;
        for (const l of sz(u) > 1 ? (fits(u, c, r, true) ? [0] : []) : floorsAt(c, r)) {
          const kk = key(c, r, l), cl = climbCost(Math.abs(hOf(u, c, r, l) - hOf(u, n.c, n.r, n.l))); if (cl === Infinity || !between(n.c, n.r, n.l, c, r, l)) continue;
          const o = sz(u) > 1 ? null : occ(c, r, l); if (o && o.side !== u.side && !o.down) continue;
          const nn = { c, r, l, cost: n.cost + 1 + cl, cl: (n.cl || 0) + (cl ? 1 : 0), prev: k }, old = res.get(kk);
          if (nn.cost > mv || (old && old.cost <= nn.cost)) continue;
          res.set(kk, nn); q.push(kk);
        }
      }
    }
    for (const n of res.values()) { if (sz(u) > 1) n.end = fits(u, n.c, n.r, !!def(u).trample); else { const o = occ(n.c, n.r, n.l); n.end = !o || o === u; } n.size = sz(u); }
    return res;
  }
  const pathTo = (res, k) => { const p = []; let n = res.get(k); while (n) { p.unshift({ c: n.c, r: n.r, l: n.l || 0 }); n = n.prev ? res.get(n.prev) : null; } return p; };
  // walls and ice block sight; pillars, crates and figures do not; from an upper floor you look over the walls below
  function los(a, b) {
    const al = a.l || 0, bl = b.l || 0, n = Math.ceil(Math.max(Math.abs(b.c - a.c), Math.abs(b.r - a.r)) * 3);
    if (!al && !bl) for (let i = 1; i < n; i++) { const t = i / n, c = Math.round(a.c + (b.c - a.c) * t), r = Math.round(a.r + (b.r - a.r) * t); if ((c !== b.c || r !== b.r) && (c !== a.c || r !== a.r) && S.ice[key(c, r)]) return false; }
    if ((covered(a.c, a.r, al) && bl === 1) || (covered(b.c, b.r, bl) && al === 1)) return false;
    if (al === 1 || bl === 1) return true;
    for (let i = 1; i < n; i++) { const t = i / n; if (isWall(Math.round(a.c + (b.c - a.c) * t), Math.round(a.r + (b.r - a.r) * t))) return false; }
    return true;
  }
  // walking distance from the given pieces to every square, ignoring other pieces (how far a goblin really is)
  function walkField(srcs) {
    const f = new Map(), q = [];
    for (const s of srcs) { f.set(key(s.c, s.r, s.l), 0); q.push({ c: s.c, r: s.r, l: s.l || 0 }); }
    while (q.length) {
      const n = q.shift(), d = f.get(key(n.c, n.r, n.l));
      for (const [dc, dr] of DIRS) {
        const c = n.c + dc, r = n.r + dr; if (!inB(c, r)) continue;
        for (const l of [0, 1]) {
          const k = key(c, r, l), ob = B.obst[key(c, r)];
          if (f.has(k) || (l ? !hasDeck(c, r) || B.obst1[key(c, r)] : ob === 'wall' || ob === 'lava' || ob === 'chasm') || climbCost(Math.abs(hAt(c, r, l) - hAt(n.c, n.r, n.l))) === Infinity || !between(n.c, n.r, n.l, c, r, l)) continue;
          f.set(k, d + 1); q.push({ c, r, l });
        }
      }
    }
    return f;
  }
  // how many squares of walking separate each spot g could stand on from a spot it could strike one of the heroes from:
  // built over g's own body (a 2×2 king needs room), around walls, ice and living foes, over friends and the fallen
  function approachField(g, list) {
    const R = def(g).range, f = new Map(), q = [], big = sz(g) > 1;
    const spots = (c, r) => big ? (fits(g, c, r, true) ? [0] : []) : floorsAt(c, r);
    const blocked = (c, r, l) => { if (big) return false; const o = occ(c, r, l); return o && o !== g && o.side !== g.side && !o.down; };
    for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) for (const l of spots(c, r)) {
      const p = { c, r, l, size: sz(g) }; if (blocked(c, r, l)) continue;
      if (list.some(h => dist(p, h) <= R && (R < 2 || los(p, h)))) { f.set(key(c, r, l), 0); q.push(p); }
    }
    while (q.length) {
      let bi = 0; for (let i = 1; i < q.length; i++) if (f.get(key(q[i].c, q[i].r, q[i].l)) < f.get(key(q[bi].c, q[bi].r, q[bi].l))) bi = i;
      const n = q.splice(bi, 1)[0], d = f.get(key(n.c, n.r, n.l));
      for (const [dc, dr] of DIRS) {
        const c = n.c + dc, r = n.r + dr; if (!inB(c, r)) continue;
        for (const l of spots(c, r)) {
          if (blocked(c, r, l)) continue;
          const cl = climbCost(Math.abs(hOf(g, c, r, l) - hOf(g, n.c, n.r, n.l))); if (cl === Infinity || !between(n.c, n.r, n.l, c, r, l)) continue;
          const k = key(c, r, l), nd = d + 1 + cl; if (f.has(k) && f.get(k) <= nd) continue;
          f.set(k, nd); q.push({ c, r, l });
        }
      }
    }
    return f;
  }
  // in cover: a wall, rock, tree, pillar or crate right beside the target, between it and the shooter
  function inCover(t, from) {
    if (!from || dist(from, t) < 2) return false;
    const dc = Math.sign(from.c - t.c), dr = Math.sign(from.r - t.r);
    return [[dc, 0], [0, dr]].some(([x, z]) => (x || z) && inB(t.c + x, t.r + z) && COVER.has(obstOn(t.c + x, t.r + z, t.l || 0)));
  }
  // a foe right beside a shooter or caster engages them, unless they stand at least a step above it
  const engagers = (u, pos = u) => S.units.filter(f => up(f) && !f.asleep && f.side !== u.side && dist(pos, f) === 1 && hAt(pos.c, pos.r, pos.l) - hAt(f.c, f.r, f.l) < 1);
  const besideFoes = u => S.units.filter(x => up(x) && x.side !== u.side && !x.st.hidden && dist(u, x) === 1);
  // a ring of eight around the fighter, for Cleave
  const aroundFoes = u => S.units.filter(x => up(x) && x.side !== u.side && !x.st.hidden && (x.l || 0) === (u.l || 0) && cheb(x, u) === 1 && Math.abs(hAt(x.c, x.r, x.l) - hAt(u.c, u.r, u.l)) <= 2);
  const flanked = (t, att) => heroes().some(h => h !== att && dist(h, t) === 1);
  // armour: what each blow loses. Taunt adds one, Prone takes one off, Rebuke two, and the frozen have none
  function armourOf(t) {
    if (t.st.frozen) return 0;
    const a = (t.armour ?? def(t).armour ?? 0) + (t.st.taunt ? 1 : 0) + (t.st.warded ? TUNE.ward : 0) - (t.st.prone ? 1 : 0) - (t.st.rebuked ? 2 : 0);
    return Math.max(0, Math.min(TUNE.armourMax, a));
  }
  // Grapple: anyone beside the fighter but the Goblin King (too big to haul), and the squares around them they could go to
  const grabbable = u => S.units.filter(x => x.alive && x !== u && !def(x).boss && !(x.side !== u.side && x.st.hidden) && dist(u, x) === 1);
  function grabCells(u, t) {
    const res = new Map(), l = t.l || 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const c = t.c + dc, r = t.r + dr; if ((!dc && !dr) || !inB(c, r)) continue;
      const ll = l && hasDeck(c, r) ? 1 : 0, ob = obstOn(c, r, ll);
      if (ob === 'chasm' || ob === 'lava') { if (t.side !== u.side) res.set(key(c, r), { cell: { c, r, l: 0 } }); continue; } // a foe can be thrown into the gorge or the lava, a friend never
      if (ob || occ(c, r, ll) || Math.abs(hAt(c, r, ll) - hAt(t.c, t.r, l)) > 2) continue;
      res.set(key(c, r, ll), { cell: { c, r, l: ll } });
    }
    return res;
  }
  const canIce = (c, r) => inB(c, r) && ['floor', 'vent'].includes(B.terr[r][c]) && !obstAt(c, r) && !occ(c, r, 0);
  const wallCells = (c, r, dir) => (dir === 'v' ? [[c, r - 1], [c, r], [c, r + 1]] : [[c - 1, r], [c, r], [c + 1, r]]).filter(([x, z]) => canIce(x, z));
  const reachOf = (u, card) => card.reach === 'move' ? moveOf(u) : card.range; // the rope hook swings as far as the thief can walk
  // every square a ranged power can reach from where the hero stands: in range, in sight, not inside a wall
  function rangeCells(u, R, free) {
    const res = new Set();
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) { const c = u.c + dc, r = u.r + dr; if (!inB(c, r)) continue; for (const l of hasDeck(c, r) ? [0, 1] : [0]) { const q = { c, r, l }; if (dist(u, q) <= R && (l || !isWall(c, r)) && (free || los(u, q))) res.add(key(c, r, l)); } }
    return res;
  }
  // every square some goblin could strike this coming turn
  function threat() {
    const res = new Set();
    for (const g of gobs()) {
      if (g.asleep) continue;
      const mv = g.st.prone || g.st.frozen ? 0 : moveOf(g), R = def(g).range;
      for (const n of reach(g, mv).values()) {
        if (!n.end) continue;
        for (let dr = -R; dr <= R + sz(g) - 1; dr++) for (let dc = -R; dc <= R + sz(g) - 1; dc++) { const c = n.c + dc, r = n.r + dr; if (!inB(c, r)) continue; for (const l of hasDeck(c, r) ? [0, 1] : [0]) { const q = { c, r, l }; if (dist(n, q) <= R && (l || !B.obst[key(c, r)]) && (R < 2 || los(n, q))) res.add(key(c, r, l)); } }
      }
    }
    return res;
  }

  // ---------------- what a hero may do ----------------
  function block(u, id) {
    const card = CARDS[id];
    if (!up(u)) return 'Fallen';
    if (u.ap <= 0) return 'No actions';
    if (u.cd[id] > 0) return `Ready in ${u.cd[id]}`;
    if (card.uses != null && !(u.uses && u.uses[id] > 0)) return 'Used up';
    if (card.need === 'foe' && !besideFoes(u).length) return 'No foe beside';
    if (card.need === 'around' && !aroundFoes(u).length) return 'No foe near';
    if (card.need === 'adj' && !grabbable(u).length) return 'No one beside';
    if (isRanged(u) && !card.close && engagers(u).length) return 'Engaged: step away';
    return '';
  }
  // what a card can be used on: units (by id, with the path to walk first, if any), ice blocks, or squares
  function targets(u, id, opt = {}) {
    const res = new Map(), card = CARDS[id];
    if (!card || block(u, id)) return res;
    if (card.target === 'enemy' || card.target === 'ally') {
      const pool = S.units.filter(t => t.alive && (card.target === 'enemy' ? t.side !== u.side && !t.down : t.side === u.side && (!t.down || card.revive)));
      const rch = u.ap >= 2 ? reach(u, card.move || moveOf(u)) : null; // moving first costs an action too
      for (const t of pool) {
        const sees = n => card.range < 2 || los(n, t);
        if (dist(u, t) <= card.range && sees(u)) { res.set(t.id, { unit: t.id, path: null }); continue; }
        if (!rch) continue;
        let best = null;
        for (const n of rch.values()) if (n.end && dist(n, t) <= card.range && sees(n) && !(isRanged(u) && card.target === 'enemy' && engagers(u, n).length) && (!best || n.cost < best.cost)) best = n;
        if (best) res.set(t.id, { unit: t.id, path: pathTo(rch, key(best.c, best.r, best.l)) });
      }
      if (card.target === 'enemy' && id === cardsOf(u)[0]) for (const k in S.ice) { const v = S.ice[k], q = { c: v.c, r: v.r, l: 0 }; if (dist(u, q) <= card.range && (card.range < 2 || los(u, q))) res.set('ice:' + k, { ice: q, path: null }); }
    } else if (card.target === 'grab') { // the figures beside the fighter; once one is held, the squares it can go to
      for (const t of grabbable(u)) res.set(t.id, { unit: t.id, path: null });
      const g = opt.grab != null ? U(opt.grab) : null;
      if (g && res.has(g.id)) for (const [k, e] of grabCells(u, g)) res.set(k, e);
    } else if (card.target === 'cell' && card.wall) {
      for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) { const q = { c, r, l: 0 }; if (canIce(c, r) && dist(u, q) <= card.range && los(u, q)) res.set(key(c, r), { cell: q }); }
    } else if (card.target === 'cell') {
      const R = reachOf(u, card);
      for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) for (const l of floorsAt(c, r)) { const q = { c, r, l }; if (dist(u, q) <= R && (card.reach || los(u, q)) && !(card.spot && (occ(c, r, l) || dist(u, q) === 0))) res.set(key(c, r, l), { cell: q }); }
    }
    return res;
  }
  // the foes Cleave (around) or Thunderwave (beside) would catch, by id
  const sweepTargets = (u, id) => (CARDS[id].sweep === 'around' ? aroundFoes(u) : besideFoes(u)).map(x => x.id);
  // the units a blast centred on a square would catch
  const blastAt = cell => S.units.filter(x => up(x) && cellsOf(x).some(([c, r]) => Math.abs(c - cell.c) <= 1 && Math.abs(r - cell.r) <= 1) && (x.l || 0) === (cell.l || 0));

  // the dice an attack throws, before they are thrown: from is where the attacker will stand
  function attackSpec(u, t, o = {}, from = u) {
    const ranged = !!o.ranged, notes = []; let n = 1 + (o.extra || 0), dis = u.atks || 0;
    if (ranged && inCover(t, from)) { dis++; notes.push('Target in cover'); }
    if (u.st.hidden) { n += TUNE.sneak; notes.push(`Sneak Attack +${TUNE.sneak} dice`); }
    if (u.st.blessed) { n += 1; notes.push('Blessed +1 die'); }
    if (t.st.prone) { n += 1; notes.push('Prone +1 die'); }
    if (t.st.frozen) { n += 1; notes.push('Shatter +1 die'); }
    if (ranged && hAt(from.c, from.r, from.l) - hAt(t.c, t.r, t.l) >= 1) { n += 1; notes.push('High ground +1 die'); } // shooting down: melee gets no height bonus
    if (u.kind === 'thief' && flanked(t, u)) { n += 1; notes.push('Flanking +1 die'); }
    if (def(u).pack && S.units.some(x => x !== u && x.alive && x.kind === u.kind && dist(x, t) === 1)) { n += TUNE.pack; notes.push(`Pack +${TUNE.pack} die`); }
    let bonus = o.bonus || 0;
    if (o.execute && t.hp * 2 <= t.maxHp) { bonus += o.execute; notes.push(`Execute +${o.execute}`); }
    if (ranged) notes.push('Ranged · no crits');
    return { sides: o.die || dieOf(u), n, dis, noCrit: ranged, bonus, notes, armour: armourOf(t) };
  }
  // one roll against many: blessing and hiding count, the targets' states do not
  function sweepSpec(u, sides, noCrit = false) {
    const notes = []; let n = 1;
    if (u.st.blessed) { n++; notes.push('Blessed +1 die'); }
    if (u.st.hidden) { n += TUNE.sneak; notes.push(`Sneak Attack +${TUNE.sneak} dice`); }
    if (noCrit) notes.push('Ranged · no crits');
    return { sides, n, dis: u.atks || 0, noCrit, bonus: 0, notes };
  }
  // the odds of using a card on a target, for the forecast: chance of a miss, damage to expect, chance to finish it
  function forecast(u, id, t, from = u, trials = TUNE.forecastTrials) {
    const card = CARDS[id]; if (!card || !t) return null;
    if (card.heal) {
      const n = cardN(u, id) + (u.st.blessed ? 1 : 0), d = cardDie(u, id); let sum = 0;
      for (let i = 0; i < trials; i++) sum += rollWith(Math.random, d, n).total;
      return { heal: sum / trials, need: t.down ? t.maxHp : t.maxHp - t.hp, revive: !!t.down };
    }
    let spec;
    if (card.atk) spec = attackSpec(u, t, atkOf(u, id), from);
    else if (card.sweep) spec = { ...sweepSpec(u, cardDie(u, id)), armour: armourOf(t) };
    else if (card.area) spec = { ...sweepSpec(u, cardDie(u, id), true), armour: armourOf(t) };
    else return null;
    let miss = 0, sum = 0, kill = 0;
    for (let i = 0; i < trials; i++) {
      const r = rollWith(Math.random, spec.sides, spec.n, spec.dis, spec.noCrit);
      if (allOnes(r)) { miss++; continue; }
      let dmg = r.total + spec.bonus;
      if (!r.crits) dmg -= Math.min(dmg, spec.armour);
      sum += dmg; if (dmg >= t.hp) kill++;
    }
    return { miss: miss / trials, avg: sum / trials, kill: kill / trials, sides: spec.sides, n: spec.n, dis: spec.dis, armour: spec.armour, crit: !spec.noCrit };
  }

  // ---------------- the story: events for the view ----------------
  const log = (html, cls = '') => ev({ t: 'log', html, cls });
  const note = (text, cls = '') => ev({ t: 'note', text, cls });
  const combo = (text, cls = '') => ev({ t: 'combo', text, cls });
  const float = (u, text, sub, cls = 'info') => ev({ t: 'float', id: u.id, text, sub: sub || '', cls });
  const wait = ms => ev({ t: 'wait', ms });
  const sfx = name => ev({ t: 'sfx', name });
  const shake = amt => ev({ t: 'shake', amt });
  const fx = (kind, where) => ev({ t: 'fx', kind, at: where });
  const face = (u, q) => ev({ t: 'face', id: u.id, c: q.c, r: q.r });
  const cast = (u, hold = false) => ev({ t: 'cast', id: u.id, wait: hold });
  const aim = (u, q, kind) => ev({ t: 'aim', id: u.id, at: q.id != null ? q.id : { c: q.c, r: q.r, l: q.l || 0 }, kind });
  const endAim = () => ev({ t: 'endAim' });
  const place = q => q.id != null ? q.id : { c: q.c, r: q.r, l: q.l || 0 };
  function status(u, k, on, value) { if (on) u.st[k] = value ?? true; else delete u.st[k]; ev({ t: 'status', id: u.id, key: k, on: !!on, armour: armourOf(u) }); }
  // run several strands of story at once (a blast hitting everyone in it), each strand in order
  function par(fns, stagger = 0) {
    const outer = out, list = [];
    for (const f of fns) { out = []; f(); list.push(out); }
    out = outer; if (list.some(l => l.length)) ev({ t: 'par', list, stagger });
  }
  const stat = (u, k, n = 1) => { if (u && S.stats[u.id]) S.stats[u.id][k] += n; };
  // throw dice for u and show them; at: where they land (a unit id or a square)
  function roll(u, sides, n, o = {}) {
    const res = rollWith(rnd, sides, n, o.dis || 0, !!o.noCrit);
    if (u.side === 'hero' && res.crits && !o.noCrit) stat(u, 'crits', res.crits);
    ev({ t: 'roll', id: u.id, at: o.at, label: o.label, roll: res, notes: o.notes || [], bonus: o.bonus || [] });
    log(`${o.label} · d${sides}: <b>${res.kept.join(' + ')}</b>${res.dropped.length ? ` <s>${res.dropped.join(' ')}</s>` : ''}${o.dis ? ` (disadvantage ×${o.dis})` : ''}`, 'dice');
    return res;
  }
  function missed(r) { const m = allOnes(r); if (m) note('Rolled a 1 · miss', 'red'); return m; }
  const verdict = (t, miss, r) => ev({ t: 'verdict', id: t.id, kind: miss ? 'miss' : r.crits ? 'crit' : 'hit' });
  // what gets through: a crit cuts straight through; otherwise the blow loses the target's armour (no roll)
  function soakFor(t, atk, r, ctx) {
    if (r.crits) { if (!ctx.told) { ctx.told = true; note('Crit · ignores armour', 'red'); } return { dmg: atk, soak: 0 }; }
    const a = armourOf(t);
    if (!a) { if (t.st.frozen && (t.armour ?? def(t).armour)) note(`${short(t)} frozen · no armour`, 'blue'); return { dmg: atk, soak: 0 }; }
    const soak = Math.min(atk, a);
    return { dmg: atk - soak, soak };
  }

  // ---------------- harm, death and falling ----------------
  function hurt(t, amt, from, soak = 0, o = {}) {
    if (!t.alive || t.down) return 0;
    if (t.asleep) wake(t);
    const fin = Math.max(0, amt), real = Math.min(fin, t.hp); // the tally counts what the blow took, not the overkill
    t.hp = Math.max(0, t.hp - fin);
    const src = from && from.id == null ? { c: from.c, r: from.r } : null;
    ev({ t: 'damage', id: t.id, amount: fin, soak, hp: t.hp, from: from && from.id != null ? from.id : null, src, crit: !!o.crit });
    log(`${nm(t)} takes <b>${fin}</b>${soak ? ` (armour stops ${soak})` : ''}${t.hp <= 0 ? (t.side === 'hero' ? ' and falls' : ' and dies') : ''}`, t.side === 'hero' ? 'hero' : 'foe');
    if (from && from.id != null && from.side === 'hero') stat(from, 'dealt', real);
    if (t.side === 'hero') stat(t, 'taken', real);
    if (t.hp <= 0) { if (t.side === 'hero') fallDown(t); else kill(t, from); }
    return fin;
  }
  function kill(t, from, fell) {
    t.alive = false; t.hp = 0;
    if (S.smash && S.smash.g === t.id) clearSmash();
    if (from && from.id != null && from.side === 'hero') stat(from, 'kills');
    ev({ t: 'kill', id: t.id, from: from && from.id != null ? from.id : null, fell: !!fell });
  }
  // a hero at 0 is down, not dead: foes leave the body be, and Heal raises them
  function fallDown(t) {
    t.down = true; t.hp = 0; t.st = { prone: true }; stat(t, 'downs');
    S.units.forEach(x => { if (x.st.rebuked === t.id + 1) status(x, 'rebuked', false); }); // a fallen cleric's rebukes lift
    ev({ t: 'down', id: t.id });
    log(`${nm(t)} is down. Heal can raise them`, 'hero');
  }
  function wake(g) { if (!g.asleep) return; g.asleep = false; ev({ t: 'wake', id: g.id }); log(`${nm(g)} wakes`, 'foe'); }
  function wakeCheck() {
    const sleepers = gobs().filter(g => g.asleep); if (!sleepers.length) return;
    const f = walkField(heroes()), W = L.wake || 0;
    sleepers.forEach(g => { if ((f.get(key(g.c, g.r, g.l)) ?? 99) <= W) wake(g); });
  }
  // shoved over the edge of the gorge: gone
  function fallIn(t, c, r, src) {
    combo('Into the gorge!', 'red'); sfx('whoosh');
    log(`${nm(t)} is thrown into the gorge and falls to its death`, t.side === 'hero' ? 'hero' : 'foe');
    ev({ t: 'fall', id: t.id, to: { c, r } });
    t.c = c; t.r = r; kill(t, src, true);
  }
  function setBurn(c, r, n, l = 0) {
    const k = key(c, r, l); S.burn[k] = n; ev({ t: 'burn', set: [[k, n]] });
    const o = occ(c, r, l); if (o && o.st.frozen) { status(o, 'frozen', false); combo('Thawed', ''); } // fire thaws whoever stands in it
  }
  function clearBurn(k) { if (!S.burn[k]) return; delete S.burn[k]; ev({ t: 'burn', clear: [k] }); }
  function addIce(list) { // list of [c, r]: a block on each
    list.forEach(([c, r]) => { S.ice[key(c, r)] = { c, r, born: S.round }; });
    if (list.length) ev({ t: 'ice', add: list.map(([c, r]) => ({ k: key(c, r), c, r })) });
  }
  function removeIce(k, how) { if (!S.ice[k]) return; delete S.ice[k]; ev({ t: 'ice', remove: [{ k, how }] }); }

  // ---------------- moving ----------------
  // a walk along a path; fire on the way burns
  function walk(u, path, o = {}) {
    if (path.length < 2) return up(u);
    const end = path[path.length - 1];
    ev({ t: 'move', id: u.id, path, speed: o.speed || 1, style: o.style || 'walk', arrow: o.arrow || null });
    u.c = end.c; u.r = end.r; u.l = end.l || 0;
    if (def(u).trample) kickAside(u);
    const n = path.slice(1).filter(p => burning(p.c, p.r, p.l)).length;
    if (n) { combo('Burned!', 'red'); hurt(u, TUNE.burn.damage * n); }
    return up(u);
  }
  // the King ends his walk over the fallen: he kicks them to the nearest free square, unhurt
  function kickAside(u) {
    for (const [x, z] of cellsOf(u)) {
      const o = S.units.find(b => b !== u && b.alive && b.down && (b.l || 0) === (u.l || 0) && covers(b, x, z)); if (!o) continue;
      let sp = null;
      for (let k = 1; k < 9 && !sp; k++) for (let y = o.r - k; y <= o.r + k && !sp; y++) for (let c = o.c - k; c <= o.c + k && !sp; c++) if (Math.max(Math.abs(c - o.c), Math.abs(y - o.r)) === k && inB(c, y) && !obstAt(c, y) && !occ(c, y) && !hasDeck(c, y)) sp = { c, r: y, l: 0 };
      if (!sp) continue;
      ev({ t: 'push', id: o.id, to: sp, style: 'toss' }); o.c = sp.c; o.r = sp.r; o.l = 0;
      log(`${nm(u)} kicks ${nm(o)} out of his way`, 'foe');
    }
  }
  // stepping away from an engaging foe gives it a free basic attack
  function opportunity(f, u) {
    if (!up(f) || !up(u)) return;
    combo('Attack of opportunity!', 'red'); log(`${nm(f)} strikes as ${nm(u)} disengages`, f.side === 'hero' ? 'hero' : 'foe');
    aim(f, u, 'enemy');
    if (f.side === 'hero') EFFECTS[cardsOf(f)[0]](f, u); else strike(f, u, foeAttack(f));
    wait(140); endAim(); ev({ t: 'clearDice' });
  }
  function disengage(u) { if (!isRanged(u)) return; for (const f of engagers(u)) { if (!up(u)) return; opportunity(f, u); } }
  // shoved a square straight away from src: into lava, the gorge, something solid, off a ledge, or just back; it falls Prone
  function knockback(src, t) {
    const dc = Math.sign(t.c - src.c), dr = Math.sign(t.r - src.r), nc = t.c + dc, nr = t.r + dr;
    const nl = t.l === 1 && inB(nc, nr) && hasDeck(nc, nr) ? 1 : 0; // shoved along the floor it stands on, or off its edge
    const blocker = inB(nc, nr) ? occ(nc, nr, nl) : null, boss = def(t).boss;
    const dh = inB(nc, nr) ? hAt(nc, nr, nl) - hAt(t.c, t.r, t.l) : 0;
    const brink = inB(nc, nr) && !nl ? obstAt(nc, nr) : null;
    if (!boss && brink === 'chasm') { fallIn(t, nc, nr, src); return; }
    if (!boss && brink === 'lava') { combo(`Into the lava! +${TUNE.lava}`, 'red'); shake(.22); sfx('boom'); fx('lava', { c: nc, r: nr, l: 0 }); hurt(t, TUNE.lava, src); }
    else if (boss || !inB(nc, nr) || obstOn(nc, nr, nl) || blocker || dh > 1) {
      combo(boss ? `Immovable! +${TUNE.slam}` : `Slam! +${TUNE.slam}`, 'red'); shake(.18);
      hurt(t, TUNE.slam, src);
      if (!boss && blocker && blocker.alive) { combo('Bowled over!', 'red'); hurt(blocker, TUNE.slam, t); }
    } else {
      const was = at(t), to = { c: nc, r: nr, l: nl };
      ev({ t: 'push', id: t.id, to, style: 'shove', dir: [dc, dr] });
      t.c = nc; t.r = nr; t.l = nl;
      if (levelOf(to) - levelOf(was) <= -2) { combo(`Off the ledge! +${TUNE.ledge}`, 'red'); shake(.14); hurt(t, TUNE.ledge, src); }
      if (t.alive && burning(nc, nr, nl)) { combo('Into the flames! +2', 'red'); hurt(t, TUNE.burn.damage, src); }
    }
    if (up(t) && !boss && !t.st.prone) { combo('Prone', ''); status(t, 'prone', true); }
  }

  // ---------------- attacks ----------------
  const foeAttack = g => ({ label: def(g).attack || def(g).name, ranged: isRanged(g), proj: def(g).proj || 'arrow', die: dieOf(g) });
  // one attack: the attacker's dice, the target's armour, then the blow; returns true when it lands
  function strike(u, t, o = {}) {
    const spec = attackSpec(u, t, o);
    u.atks = (u.atks || 0) + 1;
    if (u.st.blessed) status(u, 'blessed', false);
    if (u.side === 'gob') log(`${nm(u)} attacks ${nm(t)}`, 'foe');
    face(u, t);
    const r = roll(u, spec.sides, spec.n, { dis: spec.dis, noCrit: spec.noCrit, at: t.id, label: o.label ? `${short(u)}: ${o.label}` : `${u.name} attacks`, notes: spec.notes, bonus: spec.bonus ? ['+' + spec.bonus] : [] });
    const atk = r.total + spec.bonus;
    ev({ t: 'total', value: atk });
    const miss = missed(r), got = miss ? null : soakFor(t, atk, r, {});
    verdict(t, miss, r);
    ev({ t: 'strike', id: u.id, to: t.id, style: o.ranged ? 'ranged' : 'melee', proj: o.proj || null });
    if (u.st.hidden) status(u, 'hidden', false);
    if (!got) { ev({ t: 'miss', id: t.id }); log(`The blow misses ${nm(t)}`, t.side === 'hero' ? 'hero' : 'foe'); return false; }
    if (t.st.frozen) status(t, 'frozen', false);
    hurt(t, got.dmg, u, got.soak, { crit: r.crits > 0 });
    return true;
  }
  // Cleave and Thunderwave: one roll against every foe around (or beside) the hero, each with its own armour
  function sweep(u, sides, label, shove, around) {
    const foes = around ? aroundFoes(u) : besideFoes(u); if (!foes.length) return;
    const spec = sweepSpec(u, sides); u.atks = spec.dis + 1;
    if (u.st.blessed) status(u, 'blessed', false);
    const r = roll(u, sides, spec.n, { dis: spec.dis, at: u.id, label, notes: spec.notes });
    ev({ t: 'total', value: r.total });
    const ctx = {}, miss = missed(r), hits = miss ? [] : foes.map(t => soakFor(t, r.total, r, ctx));
    foes.forEach(t => verdict(t, miss, r));
    wait(60);
    if (u.st.hidden) status(u, 'hidden', false);
    ev({ t: 'sweep', id: u.id, style: shove ? 'wave' : 'spin' });
    foes.forEach((t, i) => {
      if (!up(t)) return;
      if (miss) { ev({ t: 'miss', id: t.id }); return; }
      if (t.st.frozen) status(t, 'frozen', false);
      hurt(t, hits[i].dmg, u, hits[i].soak, { crit: r.crits > 0 });
      if (shove && up(t)) knockback(u, t);
    });
  }
  // a 3×3 blast: one roll against everyone in it (heroes too), each with its own armour; ice melts, the ground burns
  function fireball(u, cell) {
    face(u, cell);
    const sides = cardDie(u, 'm_fire'), spec = sweepSpec(u, sides, true); u.atks = spec.dis + 1;
    if (u.st.blessed) status(u, 'blessed', false);
    const r = roll(u, sides, spec.n, { dis: spec.dis, noCrit: true, at: place(cell), label: 'Fireball', notes: spec.notes });
    ev({ t: 'total', value: r.total });
    const hit = blastAt(cell), ctx = {}, miss = missed(r), lands = miss ? [] : hit.map(x => soakFor(x, r.total, r, ctx));
    hit.forEach(x => verdict(x, miss, r));
    wait(80); cast(u, true);
    ev({ t: 'shot', id: u.id, to: place(cell), kind: 'fire' }); fx('explosion', place(cell)); shake(.3); sfx('boom');
    if (u.st.hidden) status(u, 'hidden', false);
    const cl = cell.l || 0, melted = [];
    if (!cl) for (const k of Object.keys(S.ice)) { const v = S.ice[k]; if (Math.abs(v.c - cell.c) <= 1 && Math.abs(v.r - cell.r) <= 1) { removeIce(k, 'steam'); melted.push(k); } }
    if (melted.length) { combo('Ice melts', 'blue'); log(`The fireball melts ${melted.length} block${melted.length > 1 ? 's' : ''} of ice`, 'hero'); }
    for (let rr = cell.r - 1; rr <= cell.r + 1; rr++) for (let c = cell.c - 1; c <= cell.c + 1; c++) if (inB(c, rr) && !melted.includes(key(c, rr)) && (cl ? hasDeck(c, rr) : !obstAt(c, rr))) setBurn(c, rr, TUNE.burn.rounds, cl);
    if (!miss && hit.some(h => h.side === 'hero')) combo('Friendly fire!', 'red');
    par(hit.map((x, i) => () => { if (miss) { ev({ t: 'miss', id: x.id }); return; } if (x.st.frozen) status(x, 'frozen', false); hurt(x, lands[i].dmg, cell, lands[i].soak); }), 70);
  }
  // the King's cleave: every hero beside him
  function cleave(g, primary) {
    const targets = heroes().filter(h => !h.st.hidden && dist(g, h) === 1);
    face(g, primary);
    const n = primary.st.prone ? 2 : 1, dis = g.atks || 0; g.atks = dis + 1;
    log(`${nm(g)} cleaves`, 'foe');
    const r = roll(g, dieOf(g), n, { dis, at: primary.id, label: 'Cleave', notes: primary.st.prone ? [`${short(primary)} prone +1 die`] : [] });
    ev({ t: 'total', value: r.total });
    if (targets.length > 1) combo(`Cleave! ×${targets.length}`, 'red');
    const ctx = {}, miss = missed(r), hits = miss ? [] : targets.map(t => soakFor(t, r.total, r, ctx));
    targets.forEach(t => verdict(t, miss, r));
    wait(60); ev({ t: 'strike', id: g.id, to: primary.id, style: 'melee', amt: .36 }); shake(.15);
    par(targets.map((t, i) => () => { if (miss) ev({ t: 'miss', id: t.id }); else hurt(t, hits[i].dmg, g, hits[i].soak, { crit: r.crits > 0 }); }), 90);
  }
  // one hit breaks a block of ice: heroes with their basic attack, goblins that find one in their way
  function smashIce(u, q) {
    const k = key(q.c, q.r); if (!S.ice[k]) return;
    face(u, q);
    if (dist(u, q) > 1) { cast(u, true); ev({ t: 'shot', id: u.id, to: { c: q.c, r: q.r, l: 0 }, kind: u.kind === 'mage' ? 'arcane' : 'arrow' }); }
    else ev({ t: 'strike', id: u.id, to: { c: q.c, r: q.r, l: 0 }, style: 'melee' });
    removeIce(k, 'shatter'); log(`${nm(u)} smashes a block of ice`, u.side === 'hero' ? 'hero' : 'foe');
  }

  // ---------------- powers ----------------
  // o: label, sides and n (the dice), from the card or the shaman's own
  function heal(u, t, o = {}) {
    face(u, t);
    let n = o.n || 1; const notes = [], label = o.label || 'Heal'; if (u.st.blessed) { n++; notes.push('Blessed +1 die'); status(u, 'blessed', false); }
    cast(u);
    const r = roll(u, o.sides || 6, n, { at: t.id, label, notes });
    ev({ t: 'total', value: r.total, suffix: ' HP' });
    const revive = !!t.down, gain = revive ? Math.min(r.total, t.maxHp) : Math.min(r.total, t.maxHp - t.hp);
    if (revive) { t.down = false; t.hp = gain; t.st = { prone: true }; log(`${nm(u)} raises ${nm(t)}`, 'hero'); }
    else t.hp += gain;
    if (u.side === 'hero') stat(u, 'healed', gain);
    ev({ t: 'heal', id: t.id, amount: gain, hp: t.hp, full: gain < r.total, revive });
    log(`${nm(u)} heals ${nm(t)} for <b>${gain}</b>`, u.side === 'hero' ? 'hero' : 'foe');
    wait(240);
  }
  function knockProne(u, t) { // Dirty Trick: no roll, the foe just goes down
    ev({ t: 'strike', id: u.id, to: t.id, style: 'trip', amt: .3 });
    if (t.st.frozen) status(t, 'frozen', false);
    combo('Tripped!', ''); wait(100);
    if (!t.st.prone) status(t, 'prone', true);
    wait(140);
  }
  // the fighter takes hold and heaves a figure a square: into the gorge, off a ledge, or out of harm's way
  function haul(u, t, cell) {
    ev({ t: 'strike', id: u.id, to: t.id, style: 'grab', amt: .3 });
    const foe = t.side !== u.side;
    if (!cell.l && obstAt(cell.c, cell.r) === 'chasm') { fallIn(t, cell.c, cell.r, u); return; }
    if (!cell.l && obstAt(cell.c, cell.r) === 'lava') { // flung into the lava: it burns, scrambles back out where it stood, and goes down
      combo(`Into the lava! +${TUNE.lava}`, 'red'); shake(.22); sfx('boom'); fx('lava', { c: cell.c, r: cell.r, l: 0 });
      log(`${nm(u)} hurls ${nm(t)} into the lava`, 'hero'); hurt(t, TUNE.lava, u);
      if (up(t) && !t.st.prone) status(t, 'prone', true);
      wait(120); return;
    }
    const was = at(t);
    ev({ t: 'push', id: t.id, to: { c: cell.c, r: cell.r, l: cell.l || 0 }, style: 'haul' });
    t.c = cell.c; t.r = cell.r; t.l = cell.l || 0;
    combo(foe ? 'Hauled' : 'Pulled clear', foe ? 'red' : 'blue');
    log(`${nm(u)} grapples ${nm(t)} and ${foe ? 'hauls it' : 'pulls them'} a square`, 'hero');
    if (foe && levelOf(t) - levelOf(was) <= -2) { combo(`Off the ledge! +${TUNE.ledge}`, 'red'); shake(.14); hurt(t, TUNE.ledge, u); }
    if (t.alive && burning(t.c, t.r, t.l)) { combo('Into the flames! +2', 'red'); hurt(t, TUNE.burn.damage, u); }
    wait(120);
  }
  // the rope hook: an arc over whatever lies between
  function swing(u, cell, style) {
    face(u, cell); cast(u);
    ev({ t: 'swing', id: u.id, to: { c: cell.c, r: cell.r, l: cell.l || 0 }, style });
    u.c = cell.c; u.r = cell.r; u.l = cell.l || 0;
    log(style === 'blink' ? `${nm(u)} blinks across` : `${nm(u)} swings across`, 'hero');
    if (burning(u.c, u.r, u.l)) { combo('Burned!', 'red'); hurt(u, TUNE.burn.damage); }
  }
  function iceWall(u, cell, dir) {
    face(u, cell); cast(u); sfx('frost');
    const cs = wallCells(cell.c, cell.r, dir), hot = cs.filter(([c, r]) => burning(c, r, 0));
    // a block raised on a burning square turns straight to steam and puts the fire out
    hot.forEach(([c, r]) => { clearBurn(key(c, r)); fx('steam', { c, r, l: 0 }); });
    addIce(cs.filter(([c, r]) => !hot.some(([x, z]) => x === c && z === r)));
    log(`${nm(u)} raises a wall of ice` + (hot.length ? `; ${hot.length} block${hot.length > 1 ? 's' : ''} hiss into steam and put out the fire` : ''), 'hero');
    if (hot.length) combo('Steam! Fire out', 'blue');
    wait(420);
  }
  const EFFECTS = {
    f_attack: (u, t) => strike(u, t, { label: 'Longsword' }),
    f_charge: (u, t) => { // strike, push the foe back a square, and take the square it gave up
      const was = at(t);
      if (!strike(u, t, { label: 'Charge', ...CARDS.f_charge.atk }) || !t.alive || !up(u)) return;
      knockback(u, t);
      if (up(u) && (!t.alive || t.c !== was.c || t.r !== was.r) && !occ(was.c, was.r, was.l)) walk(u, [at(u), was], { speed: 1.4, style: 'follow' });
    },
    f_taunt: u => { status(u, 'taunt', true); sfx('taunt'); float(u, 'Taunt', 'draws attacks · armour +1'); cast(u, true); wait(150); },
    f_cleave: u => sweep(u, cardDie(u, 'f_cleave'), 'Cleave', false, true),
    f_grab: (u, t, o) => haul(u, t, o.cell),
    c_attack: (u, t) => strike(u, t, { label: 'Mace' }),
    c_heal: (u, t) => heal(u, t, { sides: cardDie(u, 'c_heal'), n: cardN(u, 'c_heal') }),
    potion: (u, t) => heal(u, t, { label: 'Healing Draught', sides: cardDie(u, 'potion'), n: cardN(u, 'potion') }),
    c_bless: (u, t) => { face(u, t); cast(u); sfx('heal'); fx('bless', t.id); status(t, 'blessed', true); float(t, 'Blessed', '+1 die next roll'); wait(260); },
    c_haste: (u, t) => { face(u, t); cast(u); sfx('heal'); fx('haste', t.id); status(t, 'hasted', true); float(t, 'Hasted', `+${TUNE.haste} action next turn`); wait(260); },
    c_rebuke: (u, t) => {
      face(u, t); cast(u, true); ev({ t: 'shot', id: u.id, to: t.id, kind: 'holy' });
      status(t, 'rebuked', true, u.id + 1); sfx('taunt'); float(t, 'Rebuked', `armour ${armourOf(t)}`);
      log(`${nm(u)} rebukes ${nm(t)}: its armour drops to ${armourOf(t)}`, 'hero'); wait(220);
    },
    m_attack: (u, t) => strike(u, t, { label: 'Arcane Bolt', ...CARDS.m_attack.atk }),
    m_fire: (u, cell) => fireball(u, cell),
    m_frost: (u, t) => {
      if (!strike(u, t, { label: 'Frost Ray', ...atkOf(u, 'm_frost') }) || !up(t)) return;
      if (burning(t.c, t.r, t.l)) { fx('steam', t.id); combo('Steam: no freeze', ''); log(`${nm(t)} stands in fire: the frost boils away`, 'hero'); wait(160); return; }
      status(t, 'frozen', true); combo('Frozen', 'blue'); sfx('frost'); wait(160);
    },
    m_icewall: (u, cell, o) => iceWall(u, cell, o.dir),
    m_wave: u => sweep(u, cardDie(u, 'm_wave'), 'Thunderwave', true, false),
    t_attack: (u, t) => strike(u, t, { label: 'Dagger' }),
    t_hide: u => { status(u, 'hidden', true); float(u, 'Hidden', `next attack +${TUNE.sneak} dice`); wait(280); },
    t_trick: (u, t) => knockProne(u, t),
    t_hook: (u, cell) => swing(u, cell),
    // powers learned by levelling up
    f_bash: (u, t) => { if (strike(u, t, { label: 'Shield Bash', ...atkOf(u, 'f_bash') }) && up(t) && !t.st.prone && !def(t).boss) { combo('Prone', ''); status(t, 'prone', true); } },
    f_cry: u => { cast(u, true); sfx('taunt'); combo('War Cry!', 'gold'); heroes().filter(h => dist(h, u) <= 3 && !h.st.blessed).forEach(h => { fx('bless', h.id); status(h, 'blessed', true); }); float(u, 'War Cry', 'heroes within 3 Blessed'); wait(260); },
    f_execute: (u, t) => strike(u, t, { label: 'Execute', ...atkOf(u, 'f_execute') }),
    c_smite: (u, t) => strike(u, t, { label: 'Smite', ...atkOf(u, 'c_smite') }),
    c_prayer: u => {
      let n = cardN(u, 'c_prayer'); const notes = []; if (u.st.blessed) { n++; notes.push('Blessed +1 die'); status(u, 'blessed', false); }
      cast(u, true);
      const r = roll(u, cardDie(u, 'c_prayer'), n, { at: u.id, label: 'Prayer of Mending', notes }); ev({ t: 'total', value: r.total, suffix: ' HP' });
      heroes().filter(h => dist(h, u) <= 2).forEach(h => { const g = Math.min(r.total, h.maxHp - h.hp); h.hp += g; stat(u, 'healed', g); ev({ t: 'heal', id: h.id, amount: g, hp: h.hp, full: g < r.total }); });
      log(`${nm(u)} prays: every hero near her heals up to <b>${r.total}</b>`, 'hero'); wait(240);
    },
    c_ward: (u, t) => { face(u, t); cast(u); sfx('heal'); fx('bless', t.id); status(t, 'warded', true, u.id + 1); float(t, 'Warded', `armour ${armourOf(t)}`); wait(240); },
    m_chain: (u, t) => { // the bolt leaps on to the nearest foes beside its mark
      const was = at(t), a0 = u.atks || 0;
      strike(u, t, { label: 'Chain Lightning', ...atkOf(u, 'm_chain') });
      const more = gobs().filter(x => x !== t && up(x) && dist(x, was) <= 2).sort((a, b) => dist(a, was) - dist(b, was)).slice(0, 2);
      for (const x of more) { if (!up(u)) break; u.atks = a0; strike(u, x, { label: 'Chain', ranged: true, proj: 'arcane', die: 4 }); }
      u.atks = a0 + 1;
    },
    m_blink: (u, cell) => swing(u, cell, 'blink'),
    m_shield: u => { cast(u); sfx('frost'); status(u, 'warded', true, u.id + 1); float(u, 'Mana Shield', `armour ${armourOf(u)}`); wait(240); },
    t_knives: (u, t) => strike(u, t, { label: 'Throwing Knives', ...atkOf(u, 't_knives') }),
    t_poison: (u, t) => { if (strike(u, t, { label: 'Poisoned Blade', ...atkOf(u, 't_poison') }) && up(t)) { status(t, 'poisoned', true, TUNE.poison.rounds); combo('Poisoned', ''); } },
    t_smoke: u => { cast(u, true); sfx('smoke'); fx('steam', u.id); heroes().filter(h => h === u || dist(h, u) === 1).forEach(h => status(h, 'hidden', true)); float(u, 'Smoke Bomb', 'hidden'); wait(280); }
  };

  // ---------------- Grubnash ----------------
  // the lane ahead of the king's block in one direction, up to the smash length or the first wall
  function smashLane(g, dc, dr) {
    const cells = [], hit = []; let c = g.c, r = g.r, steps = 0, wall = false;
    for (let k = 0; k < TUNE.smash.length; k++) {
      const nc = c + dc, nr = r + dr, now = cellsOf(g, c, r), lead = cellsOf(g, nc, nr).filter(([x, z]) => !now.some(([a, b]) => a === x && b === z));
      const hs = cellsOf(g, nc, nr).filter(([x, z]) => inB(x, z)).map(([x, z]) => hAt(x, z));
      if (lead.some(([x, z]) => !inB(x, z) || (obstAt(x, z) && obstAt(x, z) !== 'ice')) || Math.max(...hs) - Math.min(...hs) > 2 || Math.abs(Math.max(...hs) - hOf(g, c, r)) > 2) { wall = true; break; }
      lead.forEach(([x, z]) => { cells.push(key(x, z)); const o = occ(x, z); if (o && o !== g && !hit.includes(o)) hit.push(o); });
      c = nc; r = nr; steps++;
    }
    return { dir: [dc, dr], cells, steps, wall, hit };
  }
  function smashPlan(g) {
    let best = null;
    for (const [dc, dr] of DIRS) {
      const ln = smashLane(g, dc, dr); if (!ln.steps) continue;
      ln.heroes = ln.hit.filter(x => x.side === 'hero' && up(x) && !x.st.hidden).length;
      const sc = ln.heroes * 10 - ln.hit.filter(x => x.side === 'gob').length * 3;
      if (ln.heroes && (!best || sc > best.sc)) best = { ...ln, sc };
    }
    return best;
  }
  const wantsSmash = g => {
    if (!def(g).boss || S.smash || g.st.frozen || g.ap <= 0 || (g.smashReady || 0) > S.round) return null;
    const plan = smashPlan(g), near = heroes().some(h => !h.st.hidden && dist(g, h) === 1);
    return plan && (plan.heroes >= 2 || (plan.heroes >= 1 && !near)) ? plan : null;
  };
  function telegraph(g, plan) {
    g.ap = 0;
    ev({ t: 'faceDir', id: g.id, dir: plan.dir });
    S.smash = { g: g.id, dir: plan.dir, cells: plan.cells };
    ev({ t: 'smashMark', id: g.id, dir: plan.dir, cells: plan.cells });
    cast(g); sfx('horn'); shake(.15); combo('Grubnash Smash!', 'red'); note('Clear the marked path before his next turn', 'red');
    log(`${nm(g)} lowers his head: a <b>Grubnash Smash</b> will charge the marked path at the start of his next turn`, 'foe');
    wait(900);
  }
  function clearSmash() { if (!S.smash) return; S.smash = null; ev({ t: 'smashClear' }); }
  // thrown clear of the lane, to the side of the block that struck them
  function tossSpot(o, g, dc, dr, lane) {
    const free = (c, r) => inB(c, r) && !obstAt(c, r) && !lane.has(key(c, r)) && !occ(c, r) && !hasDeck(c, r);
    const side = dc === 0 ? (o.c <= g.c ? -1 : 1) : (o.r <= g.r ? -1 : 1);
    for (const sd of [side, -side]) for (let k = 0; k < 3; k++) { const c = dc === 0 ? (sd < 0 ? g.c - 1 - k : g.c + 2 + k) : o.c, r = dc === 0 ? o.r : (sd < 0 ? g.r - 1 - k : g.r + 2 + k); if (free(c, r)) return { c, r }; }
    for (let k = 1; k < 5; k++) for (let y = o.r - k; y <= o.r + k; y++) for (let x = o.c - k; x <= o.c + k; x++) if (free(x, y)) return { c: x, r: y };
    return null;
  }
  function resolveSmash() {
    const sm = S.smash; clearSmash(); if (!sm) return;
    const g = U(sm.g); if (!g.alive) return;
    S.active = g.id; ev({ t: 'turn', id: g.id, overview: true });
    if (g.st.frozen) { combo('Frozen: the Smash fizzles', 'blue'); log(`${nm(g)} is frozen solid and cannot charge`, 'foe'); wait(500); S.active = null; return; }
    if (g.st.prone) { float(g, 'Stands up'); status(g, 'prone', false); }
    ev({ t: 'banner', text: 'Grubnash Smash!', gob: true }); sfx('horn'); shake(.2); wait(650);
    const [dc, dr] = sm.dir, lane = new Set(sm.cells), tossed = [], steps = [], tosses = [], breaks = []; let slam = false;
    for (let k = 0; k < TUNE.smash.length; k++) {
      const ln = smashLane(g, dc, dr); if (!ln.steps) { slam = ln.wall; break; }
      const nc = g.c + dc, nr = g.r + dr;
      cellsOf(g, nc, nr).forEach(([x, z]) => { const kk = key(x, z); if (S.ice[kk]) { delete S.ice[kk]; breaks.push({ k: kk, at: k }); } });
      for (const [x, z] of cellsOf(g, nc, nr)) { const o = occ(x, z); if (o && o !== g && !tossed.includes(o)) { tossed.push(o); const sp = tossSpot(o, g, dc, dr, lane); if (sp) { tosses.push({ id: o.id, to: sp, at: k }); o.c = sp.c; o.r = sp.r; o.l = 0; } } }
      g.c = nc; g.r = nr; steps.push({ c: nc, r: nr });
    }
    ev({ t: 'smash', id: g.id, dir: sm.dir, steps, tosses, breaks });
    tosses.forEach(ts => { const o = U(ts.id); if (o.alive && !o.st.prone) status(o, 'prone', true); });
    if (slam) { sfx('boom'); shake(.32); combo('Slams into the wall!', 'red'); log(`${nm(g)} slams into the wall and goes down`, 'foe'); ev({ t: 'flinch', id: g.id }); wait(160); status(g, 'prone', true); }
    log(`${nm(g)} charges ${tossed.length ? 'and bowls over ' + tossed.map(nm).join(', ') : 'but hits nobody'}`, 'foe');
    const live = tossed.filter(up);
    if (live.length) { // everyone he bowled over takes the same roll, and armour can't stop it
      wait(250);
      const r = roll(g, TUNE.smash.die, 1, { noCrit: true, at: live[0].id, label: 'Grubnash Smash', notes: ['Everyone tossed takes it'] });
      ev({ t: 'total', value: r.total }); wait(120);
      par(live.map(t => () => hurt(t, r.total, g)), 90);
      wait(350); ev({ t: 'clearDice' });
    }
    g.smashReady = S.round + TUNE.smash.cooldown; S.active = null;
  }
  function warHorn(king) {
    S.horns++;
    combo('War horn!', 'red'); sfx('horn'); shake(.15); cast(king, true);
    const free = [];
    for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) if (!obstAt(c, r) && !occ(c, r) && dist({ c, r }, king) <= TUNE.horn.range) free.push({ c, r });
    free.sort((a, b) => dist(a, king) - dist(b, king));
    const ids = free.slice(0, TUNE.horn.cutters).map(f => makeUnit(S, 'cutter', f.c, f.r).id);
    // the event says where each one lands: by the time it plays, the state may have moved them on
    if (ids.length) { ev({ t: 'spawn', ids, units: ids.map(id => ({ id, kind: U(id).kind, c: U(id).c, r: U(id).r, l: 0 })) }); log(`${nm(king)} blows his war horn: ${ids.length} cutters answer`, 'foe'); }
    wait(480);
  }

  // ---------------- the goblins' minds ----------------
  const nearest = (g, list = heroes()) => list.reduce((m, h) => Math.min(m, dist(g, h)), 99);
  // the next thing a goblin would do if it acted now: heal a friend, attack a hero (walking first if need be),
  // break the ice in its way, or close in. The same choice drives its turn and the intent shown to the player.
  function decide(g, healed) {
    const R = def(g).range, ranged = R > 1, canMove = !g.st.frozen;
    const rch = canMove ? reach(g, moveOf(g)) : new Map([[key(g.c, g.r, g.l), { c: g.c, r: g.r, l: g.l || 0, cost: 0, prev: null, end: true, size: sz(g) }]]);
    const all = [...rch.values()].filter(n => n.end), ends = all.filter(n => n.cost === 0 || g.ap >= 2); // moving first leaves one action to act with
    const vis = heroes().filter(h => !h.st.hidden);
    if (def(g).brain === 'healer' && !healed) {
      const hurtFriends = gobs().filter(x => x !== g && x.maxHp - x.hp >= 3).sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp));
      for (const w of hurtFriends) { let best = null; for (const e of ends) if (dist(e, w) <= R && los(e, w) && !engagers(g, e).length && (!best || e.cost < best.cost)) best = e; if (best) return { kind: 'heal', e: best, w: w.id, rch }; }
    }
    let best = null;
    for (const e of ends) for (const h of vis) {
      const d = dist(e, h); if (d > R || (R > 1 && !los(e, h)) || (ranged && engagers(g, e).length)) continue;
      let sc = 100 - h.hp * 2 - armourOf(h) * 3 - e.cost + (h.st.taunt ? 80 : 0) + (def(h).lure || 0) - (burning(e.c, e.r, e.l) ? 30 : 0);
      if (ranged) sc += Math.min(3, nearest(e, heroes())) * 6 - (inCover(h, e) ? 14 : 0);
      if (def(g).brain === 'king') sc += vis.filter(x => dist(e, x) === 1).length * 40;
      if (!best || sc > best.sc) best = { e, h, sc };
    }
    if (best) return { kind: 'attack', e: best.e, h: best.h.id, rch };
    if (!canMove) return null;
    const pool = vis.length ? vis : heroes(), af = approachField(g, pool);
    // close in along the real route. When no spot it can stop on is nearer (the fallen lie across its path), it still
    // steps forward to one as near, so it works its way round instead of waiting
    const dHere = af.get(key(g.c, g.r, g.l));
    let best2 = null;
    for (const e of all) { const d = af.get(key(e.c, e.r, e.l)); if (d == null) continue; const sc = d * 10 - e.cost * .5 + (burning(e.c, e.r, e.l) ? 25 : 0); if (!best2 || sc < best2.sc) best2 = { e, sc, d }; }
    if (best2 && best2.e.cost > 0 && (dHere == null || best2.d < dHere)) return { kind: 'approach', e: best2.e, rch };
    if (best2) { // penned in behind the fallen: spend both actions on one long dash, if that gets it closer
      if (g.ap >= 2 && dHere > 0) {
        const far2 = reach(g, moveOf(g) * 2); let b3 = null;
        for (const e of far2.values()) { if (!e.end) continue; const d = af.get(key(e.c, e.r, e.l)); if (d == null) continue; const sc = d * 10 - e.cost * .5 + (burning(e.c, e.r, e.l) ? 25 : 0); if (!b3 || sc < b3.sc) b3 = { e, sc, d }; }
        if (b3 && b3.d < dHere) return { kind: 'approach', e: b3.e, rch: far2, dash: true };
      }
      if (best2.e.cost > 0 && best2.d === dHere && dHere > 0) return { kind: 'approach', e: best2.e, rch }; // or a step round, no nearer
      return null;
    }
    // no route at all: walk the rough way (as if through ice), breaking any block that stands in it
    const field = walkField(pool);
    // how far a spot is from the heroes: for a big creature, from the nearest square of its block
    const far = n => sz(g) > 1 ? Math.min(...cellsOf(g, n.c, n.r).map(([x, z]) => field.get(key(x, z)) ?? 99)) : (field.get(key(n.c, n.r, n.l)) ?? 99);
    let pick = null;
    for (const e of all) { const sc = far(e) * 10 + e.cost * .5 + (burning(e.c, e.r, e.l) ? 25 : 0); if (!pick || sc < pick.sc) pick = { e, sc }; }
    const here = far(g), ice = Object.values(S.ice).find(v => dist(g, v) === 1 && (field.get(key(v.c, v.r)) ?? 99) < here);
    if (ice && (!pick || pick.e.cost === 0 || far(pick.e) >= here)) return { kind: 'ice', ice: { c: ice.c, r: ice.r, l: 0 } };
    if (pick && pick.e.cost > 0) return { kind: 'approach', e: pick.e, rch };
    return null;
  }
  // a goblin's intent, for the view: who it means to hit (or heal) if it acted now
  function intent(id) {
    const g = U(id); if (!g || !g.alive || g.asleep) return null;
    const ap0 = g.ap; g.ap = g.apMax - (g.st.prone ? 1 : 0);
    try {
      if (g.ap <= 0) return null;
      const sm = wantsSmash(g); if (sm) return { kind: 'smash', dir: sm.dir };
      const d = decide(g, false); if (!d) return null;
      return { kind: d.kind, to: d.kind === 'attack' ? d.h : d.kind === 'heal' ? d.w : null, e: d.e ? { c: d.e.c, r: d.e.r, l: d.e.l || 0 } : null, ranged: isRanged(g) };
    } finally { g.ap = ap0; }
  }
  function walkTo(g, e, rch, dash) {
    const path = pathTo(rch, key(e.c, e.r, e.l)); if (path.length < 2) return up(g);
    if (isRanged(g)) { disengage(g); if (!g.alive) return false; }
    g.ap -= dash ? 2 : 1; log(`${nm(g)} ${dash ? 'dashes' : 'moves'}`, 'foe');
    return walk(g, path, { speed: def(g).speed || 1, arrow: 'red' });
  }
  function foeTurn(g) {
    // a Smash lined up last turn charges first: every hero has had a turn to get out of the way
    if (S.smash && S.smash.g === g.id) { resolveSmash(); if (checkEnd() || !g.alive) return; }
    S.active = g.id; ev({ t: 'turn', id: g.id });
    g.ap = g.apMax; g.atks = 0;
    if (g.st.prone) { float(g, 'Stands up'); status(g, 'prone', false); g.ap--; }
    if (g.st.frozen) float(g, 'Frozen');
    const sm = wantsSmash(g);
    if (sm) { telegraph(g, sm); return finishFoe(g); }
    let healed = false;
    for (let guard = 0; g.ap > 0 && g.alive && !S.result && guard < 12; guard++) {
      const d = decide(g, healed); if (!d) break;
      if (d.kind === 'ice') { g.ap--; smashIce(g, d.ice); continue; }
      if (!walkTo(g, d.e, d.rch, d.dash)) break;
      if (d.kind === 'heal') { const w = U(d.w); if (w.alive) { aim(g, w, 'ally'); heal(g, w, { label: 'Dark Mending', sides: dieOf(g) }); endAim(); g.ap--; healed = true; } continue; }
      if (d.kind === 'attack') {
        const h = U(d.h); if (!up(h)) continue;
        g.ap--; aim(g, h, 'enemy');
        if (def(g).brain === 'king') cleave(g, h); else strike(g, h, foeAttack(g));
        wait(120); endAim(); checkEnd();
      }
    }
    finishFoe(g);
  }
  function finishFoe(g) {
    ev({ t: 'idle', id: g.id });
    if (g.alive && g.st.frozen) status(g, 'frozen', false); // the frost holds through its own turn, then lets go
    ev({ t: 'clearDice' });
    S.active = null;
  }

  // ---------------- rounds and turns ----------------
  // initiative is rolled once, when a piece first joins the fight (the first round, or the round after it wakes or is
  // called in), and kept for the whole battle; the higher roll goes first, then the sides alternate, one piece at a time
  function buildOrder() {
    const hs = heroes(), gs = gobs().filter(u => !u.asleep), fresh = [...hs, ...gs].filter(u => !u.rolled);
    fresh.forEach(u => { u.init = 1 + Math.floor(rnd() * TUNE.init) + (u.initBonus ?? def(u).init ?? 0); u.rolled = true; });
    const by = (a, b) => b.init - a.init; hs.sort(by); gs.sort(by);
    const order = []; let side = (hs[0] ? hs[0].init : -99) >= (gs[0] ? gs[0].init : -99) ? 'hero' : 'gob';
    while (hs.length || gs.length) { const q = side === 'hero' ? (hs.length ? hs : gs) : (gs.length ? gs : hs); order.push(q.shift().id); side = side === 'hero' ? 'gob' : 'hero'; }
    return { order, fresh };
  }
  function startRound(first) {
    if (!first) S.round++;
    for (const k of Object.keys(S.burn)) { S.burn[k]--; if (S.burn[k] <= 0) clearBurn(k); }
    for (const k of Object.keys(S.ice)) if (S.round - S.ice[k].born >= TUNE.ice.rounds) { removeIce(k, 'melt'); log('A block of ice melts', 'hdr'); }
    if (B.vents.length && S.round % TUNE.vents.every === 0) { B.vents.forEach(([c, r]) => setBurn(c, r, 1)); log('The vents erupt', 'hdr'); sfx('boom'); shake(.12); }
    wakeCheck();
    const { order, fresh } = buildOrder(); S.order = order; S.turn = -1;
    log(first ? L.name : `Round ${S.round}`, 'hdr');
    if (first) log('Initiative for the battle: ' + S.order.map(id => `${nm(U(id))} ${U(id).init}`).join(' · '), 'dice');
    else if (fresh.length) log('Initiative: ' + fresh.map(u => `${nm(u)} ${u.init}`).join(' · '), 'dice');
    ev({ t: 'round', round: S.round, first: !!first, order: S.order.slice(), inits: Object.fromEntries(S.order.map(id => [id, U(id).init])) });
    nextTurn();
  }
  // hand the turn to the next piece in the order; a new round starts when everyone has gone. Runs the goblins' turns
  // until a hero's turn begins (or the battle ends): that is where the player gives orders.
  function nextTurn() {
    for (let guard = 0; guard < 400; guard++) {
      if (S.result) return;
      let u = null;
      while (++S.turn < S.order.length) { const x = U(S.order[S.turn]); if (up(x) && !x.asleep) { u = x; break; } }
      if (!u) {
        if (S.round >= 99) { S.result = 'lose'; S.phase = 'over'; ev({ t: 'end', win: false }); return; }
        return startRound(false);
      }
      S.active = u.id; u.ap = u.apMax; u.atks = 0;
      if (u.st.hasted) { status(u, 'hasted', false); u.ap += TUNE.haste; float(u, 'Hasted', `${u.ap} actions this turn`); }
      if (u.side === 'hero') {
        for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--;
        if (u.st.taunt) status(u, 'taunt', false);
        if (u.st.hidden) u.st.hidden = 2; // hiding lasts through this turn, then fades unless the thief strikes
        S.units.forEach(x => { if (x.st.rebuked === u.id + 1) status(x, 'rebuked', false); if (x.st.warded === u.id + 1) status(x, 'warded', false); }); // rebukes and wards last until the caster's next turn
      }
      ev({ t: 'turn', id: u.id });
      if (burning(u.c, u.r, u.l)) { combo('Burning!', 'red'); hurt(u, TUNE.burn.damage); if (checkEnd()) return; if (!up(u)) continue; }
      if (u.st.poisoned) {
        const left = u.st.poisoned - 1; combo('Poison!', ''); hurt(u, TUNE.poison.damage);
        if (up(u)) { if (left > 0) u.st.poisoned = left; else status(u, 'poisoned', false); }
        if (checkEnd()) return; if (!up(u)) continue;
      }
      if (u.side === 'hero' && u.st.prone) { float(u, 'Stands up', 'costs 1 action'); status(u, 'prone', false); u.ap--; }
      if (u.side === 'hero') { S.phase = 'player'; log(`${nm(u)}'s turn`, 'hero'); ev({ t: 'player', id: u.id }); return; }
      S.phase = 'gob';
      if (def(u).boss && S.round % TUNE.horn.every === 0 && S.horns < TUNE.horn.max) warHorn(u);
      foeTurn(u);
      if (checkEnd()) return;
      wakeCheck(); wait(160);
    }
  }
  function giveXp(u, n) { if (!S.xp || !n || !S.stats[u.id]) return; S.stats[u.id].xp += n; ev({ t: 'xp', id: u.id, amount: n }); }
  function checkEnd() {
    if (S.result) return true;
    // when the boss falls the rest lose heart and run
    if (L.rout && !S.units.some(u => u.alive && def(u).boss) && gobs().length) {
      const ids = gobs().map(g => g.id); ids.forEach(id => { U(id).alive = false; U(id).fled = true; });
      ev({ t: 'rout', ids }); combo('The goblins flee!', 'blue'); log('With their king dead, the goblins break and run', 'hdr');
    }
    const win = !gobs().length, lose = !heroes().length;
    if (!win && !lose) return false;
    S.result = win ? 'win' : 'lose'; S.phase = 'over'; S.active = null;
    if (win) heroes().forEach(h => giveXp(h, TUNE.xp.win)); // every hero still standing
    ev({ t: 'end', win });
    return true;
  }

  // ---------------- the player's orders ----------------
  const myTurn = u => S.phase === 'player' && u && S.active === u.id && up(u);
  // a path the player drew is used if it is a real walk within reach; otherwise the shortest walk to its end
  function checkPath(u, path, mv) {
    if (!path || path.length < 2) return null;
    const rch = reach(u, mv), end = path[path.length - 1], node = rch.get(key(end.c, end.r, end.l));
    if (!node || !node.end) return null;
    let ok = path[0].c === u.c && path[0].r === u.r && (path[0].l || 0) === (u.l || 0), cost = 0;
    for (let i = 1; ok && i < path.length; i++) {
      const a = path[i - 1], b = path[i], n = rch.get(key(b.c, b.r, b.l));
      if (!n || Math.abs(a.c - b.c) + Math.abs(a.r - b.r) !== 1) { ok = false; break; }
      const o = occ(b.c, b.r, b.l); if (o && o.side !== u.side && !o.down) { ok = false; break; }
      cost += 1 + climbCost(Math.abs(hAt(b.c, b.r, b.l) - hAt(a.c, a.r, a.l)));
    }
    return ok && cost <= mv ? path.map(p => ({ c: p.c, r: p.r, l: p.l || 0 })) : pathTo(rch, key(end.c, end.r, end.l));
  }
  function move(id, path, style) {
    return run(() => {
      const u = U(id); if (!myTurn(u) || u.ap < 1) return;
      const p = checkPath(u, path, moveOf(u)); if (!p) return;
      u.ap -= 1; log(`${nm(u)} ${p.some((q, i) => i && climbCost(Math.abs(hAt(q.c, q.r, q.l) - hAt(p[i - 1].c, p[i - 1].r, p[i - 1].l)))) ? 'climbs' : 'moves'}`, 'hero');
      disengage(u); if (up(u)) walk(u, p, { style: style || 'walk', arrow: style === 'drop' ? null : 'blue' });
      checkEnd();
    });
  }
  // use a card. target: a unit id, an ice block { ice: {c, r} }, a square { c, r, l }, a wall { c, r, dir }, or a
  // grapple { grab: id, cell: {c, r, l} }. path: the walk to take first, if the target needs one
  function act(id, cardId, target, path, style) {
    return run(() => {
      const u = U(id), card = CARDS[cardId];
      if (!myTurn(u) || !card || !cardsOf(u).includes(cardId) || block(u, cardId)) return;
      const tg = targets(u, cardId, { grab: target && target.grab });
      let entry = null, t = null, cell = null;
      if (card.target === 'self') { entry = { unit: u.id, path: null }; t = u; }
      else if (typeof target === 'number') { entry = tg.get(target); t = U(target); }
      else if (target && target.ice) entry = tg.get('ice:' + key(target.ice.c, target.ice.r));
      else if (target && target.grab != null && target.cell) { entry = tg.get(key(target.cell.c, target.cell.r, target.cell.l)); t = U(target.grab); cell = target.cell; }
      else if (target && target.c != null) { entry = tg.get(key(target.c, target.r, target.l)); cell = { c: target.c, r: target.r, l: target.l || 0 }; }
      if (!entry || !entry.cell && card.target === 'grab') return;
      const walkFirst = entry.path && entry.path.length > 1;
      if (walkFirst && u.ap < 2) return;
      if (entry.ice) { u.ap--; smashIce(u, entry.ice); ev({ t: 'clearDice' }); checkEnd(); return; }
      log(`${nm(u)} uses <b>${card.name}</b>${t && t !== u ? ' on ' + nm(t) : ''}`, 'hero');
      if (walkFirst) { // walk there first: an action of its own
        let p = entry.path;
        if (path && path.length > 1) { const q = checkPath(u, path, card.move || moveOf(u)), e = q && q[q.length - 1]; if (q && t && dist(e, t) <= card.range && (card.range < 2 || los(e, t)) && !(isRanged(u) && engagers(u, e).length)) p = q; }
        u.ap -= 1; log(`${nm(u)} moves`, 'hero');
        if (!walk(u, p, { speed: cardId === 'f_charge' ? 1.7 : 1, style: style || (cardId === 'f_charge' ? 'charge' : 'walk'), arrow: null })) { checkEnd(); return; }
      }
      u.ap -= 1; const cd = cardCd(u, cardId); if (cd) u.cd[cardId] = cd;
      if (card.uses != null) u.uses[cardId] = (u.uses[cardId] || 0) - 1;
      if (t && !t.alive) { checkEnd(); return; }
      const g = target && target.grab != null ? t : null, aimAt = g || t || cell;
      if (aimAt && aimAt !== u) aim(u, aimAt, g ? (g.side === u.side ? 'ally' : 'enemy') : card.spot ? 'spot' : card.target);
      const s0 = { ...S.stats[u.id] };
      EFFECTS[cardId](u, cell && !g ? cell : t, { cell: target && target.cell, dir: target && target.dir });
      endAim(); ev({ t: 'clearDice' });
      if (S.xp) { // experience: what the action did
        const s1 = S.stats[u.id], X = TUNE.xp, kills = s1.kills - s0.kills;
        const n = kills ? X.hit + kills * X.kill : s1.dealt > s0.dealt ? X.hit : s1.healed > s0.healed ? X.heal : X.help;
        giveXp(u, n);
      }
      checkEnd();
    });
  }
  function endTurn() {
    return run(() => {
      if (S.phase !== 'player') return;
      const u = U(S.active);
      if (u && u.st.hidden === 2) { status(u, 'hidden', false); float(u, 'Revealed', 'hiding fades'); }
      ev({ t: 'idle', id: S.active }); S.phase = 'gob'; nextTurn();
    });
  }
  const begin = () => run(() => { if (S.phase === 'intro') startRound(true); });

  return {
    S, B, L, TUNE, UNITS, CARDS, key, parseKey,
    // the board
    inB, hasDeck, hAt, baseH, covered, isWall, obstAt, obstOn, levelOf, burning, floorsAt, slopeAt: (fx, fz) => slopeAt(B, fx, fz),
    // pieces
    U, def, up, heroes, gobs, occ, dist, cheb, sz, cellsOf, covers, hOf, moveOf, isRanged, short, armourOf, dieName,
    dieOf, cardsOf, cardDie, cardN, cardCd, diceName, cardText,
    // what can happen
    reach, pathTo, los, targets, block, reachOf, rangeCells, threat, engagers, grabbable, grabCells, wallCells, canIce, blastAt, sweepTargets, inCover, flanked,
    attackSpec, forecast, intent,
    // orders: each returns the events of what happened
    begin, move, act, endTurn,
    snapshot: () => JSON.stringify(S)
  };
}

return { TUNE, UNITS, CARDS, BOONS, GROWTH, LEVELS, CAMPAIGN, HERO_START, powersAt, gainXp, partyGrowth, key, parseKey, rollWith, buildBoard, slopeAt, newState, offerBoons, partyBoons, battle };
})();
if (typeof module !== 'undefined') module.exports = GC;
