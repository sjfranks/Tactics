/* Paragon: core rules data for D&D 4th Edition.
   All descriptions are short summaries written for this app, not the published text.
   Every entry can link out to the full text on the 4e Database (see D4.lookupUrl). */
'use strict';

const D4 = {
  races: {}, classes: {}, powers: {}, feats: {}, items: {}, paths: {}, destinies: {},
  lookupBase: 'https://iws.mx/dnd/',
};

/* A name search on the 4e Database (iws.mx), which opens the matching entry's full text. */
D4.lookupUrl = (cat, name) =>
  D4.lookupBase + '?list.name.' + cat + '=' + encodeURIComponent('"' + name + '"');
/* A full-text search, used to list every power of a class at one level. */
D4.searchUrl = (cat, text) =>
  D4.lookupBase + '?list.full.' + cat + '=' + encodeURIComponent(text);

D4.ABILS = ['str', 'con', 'dex', 'int', 'wis', 'cha'];
D4.ABIL = {
  str: { name: 'Strength', short: 'Str', desc: 'Physical power. Adds to melee attacks and damage for most martial characters, Athletics checks, and your Fortitude defense (if higher than Constitution).' },
  con: { name: 'Constitution', short: 'Con', desc: 'Health and stamina. Your Constitution score is added to your hit points at 1st level, and its modifier adds to your healing surges per day, Endurance checks, and Fortitude defense (if higher than Strength).' },
  dex: { name: 'Dexterity', short: 'Dex', desc: 'Agility and reflexes. Adds to ranged weapon attacks, initiative, Acrobatics, Stealth and Thievery checks, Reflex defense (if higher than Intelligence) and AC in light armor (if higher than Intelligence).' },
  int: { name: 'Intelligence', short: 'Int', desc: 'Reasoning and learning. Adds to wizard spells and many warlord powers, Arcana, History and Religion checks, Reflex defense (if higher than Dexterity) and AC in light armor (if higher than Dexterity).' },
  wis: { name: 'Wisdom', short: 'Wis', desc: 'Awareness and intuition. Adds to cleric and primal powers, Dungeoneering, Heal, Insight, Nature and Perception checks, and Will defense (if higher than Charisma).' },
  cha: { name: 'Charisma', short: 'Cha', desc: 'Force of personality. Adds to paladin and warlock powers, Bluff, Diplomacy, Intimidate and Streetwise checks, and Will defense (if higher than Wisdom).' },
};
D4.mod = s => Math.floor((s - 10) / 2);

/* Point buy (Player's Handbook): five scores start at 10 and one at 8, with 22 points to spend.
   Costs are counted from 10; lowering 10 to 8 is the "free" 8 and refunds 2. */
D4.POINT_BUY = { 8: -2, 9: -1, 10: 0, 11: 1, 12: 2, 13: 3, 14: 5, 15: 7, 16: 9, 17: 12, 18: 16 };
D4.POINT_BUY_BUDGET = 20; // shown to the player as 22, since the 8 starts "raised" to 10
D4.STANDARD_ARRAY = [16, 14, 13, 12, 11, 10];

D4.SKILLS = {
  acrobatics: { name: 'Acrobatics', ab: 'dex', armor: true, desc: 'Balance on narrow or unsteady surfaces, escape from a grab or restraints, tumble, and reduce falling damage (DC 15 to take less damage from a fall).' },
  arcana: { name: 'Arcana', ab: 'int', desc: 'Knowledge of magic, magical creatures (elementals, fey, shadow creatures) and the planes. Also used to detect and identify magic and to sense conjurations and zones.' },
  athletics: { name: 'Athletics', ab: 'str', armor: true, desc: 'Climb, jump, swim, and escape from a grab. A running long jump covers squares equal to your check divided by 10.' },
  bluff: { name: 'Bluff', ab: 'cha', desc: 'Lie convincingly, feint to gain combat advantage (standard action, once per encounter vs the target\'s Insight), and create a diversion to hide.' },
  diplomacy: { name: 'Diplomacy', ab: 'cha', desc: 'Influence others with tact, negotiation and social grace. A key skill in many skill challenges.' },
  dungeoneering: { name: 'Dungeoneering', ab: 'wis', desc: 'Knowledge of underground environments and creatures (aberrations), finding your way underground, and foraging below the surface.' },
  endurance: { name: 'Endurance', ab: 'con', armor: true, desc: 'Resist hunger, thirst, disease, poison, extreme weather and exhaustion, and keep going through long marches or holding your breath.' },
  heal: { name: 'Heal', ab: 'wis', desc: 'First aid: let an adjacent ally use their second wind (DC 10), grant a saving throw (DC 15), stabilize the dying (DC 15), or treat a disease.' },
  history: { name: 'History', ab: 'int', desc: 'Knowledge of the past: rulers, wars, legends, organizations, customs and important events.' },
  insight: { name: 'Insight', ab: 'wis', desc: 'Discern intent and read body language, see through bluffs and illusions, and recognize outside influence on someone. Your passive Insight is 10 + your Insight bonus.' },
  intimidate: { name: 'Intimidate', ab: 'cha', desc: 'Influence others through threats or hostile actions. In combat, a bloodied enemy can be forced to surrender (vs Will, with penalties if it is hostile).' },
  nature: { name: 'Nature', ab: 'wis', desc: 'Knowledge of the wild: plants, animals, natural beasts, weather and terrain. Use it to find food and shelter, and to calm or handle animals.' },
  perception: { name: 'Perception', ab: 'wis', desc: 'Notice clues, spot hidden creatures and objects, hear sounds, and find traps. Your passive Perception is 10 + your Perception bonus.' },
  religion: { name: 'Religion', ab: 'int', desc: 'Knowledge of gods, religious traditions, holy symbols and rites, and undead and immortal creatures.' },
  stealth: { name: 'Stealth', ab: 'dex', armor: true, desc: 'Hide and move silently. Opposed by passive Perception. Needs cover or concealment to hide; moving more than 2 squares gives a -5 penalty.' },
  streetwise: { name: 'Streetwise', ab: 'cha', desc: 'Gather information, rumors and leads in a settlement, find a black market, and learn who is important.' },
  thievery: { name: 'Thievery', ab: 'dex', armor: true, desc: 'Disable traps, open locks, pick pockets and perform sleight of hand.' },
};

D4.DEFENSES = {
  AC: { name: 'Armor Class', desc: 'How hard you are to hit with weapons and physical attacks. 10 + one-half your level + armor bonus + shield bonus + enhancement bonus + the higher of your Dexterity or Intelligence modifier (only in light armor or no armor) + other bonuses.' },
  Fort: { name: 'Fortitude', desc: 'Resists poison, disease, and attacks against your body\'s strength and toughness. 10 + one-half your level + the higher of your Strength or Constitution modifier + class, racial, enhancement and other bonuses.' },
  Ref: { name: 'Reflex', desc: 'Resists area attacks, rays and anything you can dodge. 10 + one-half your level + the higher of your Dexterity or Intelligence modifier + class, racial, shield, enhancement and other bonuses.' },
  Will: { name: 'Will', desc: 'Resists charm, fear, psychic and mind-affecting attacks. 10 + one-half your level + the higher of your Wisdom or Charisma modifier + class, racial, enhancement and other bonuses.' },
};

D4.SIZES = { small: 'Small', medium: 'Medium', large: 'Large' };
D4.LANGUAGES = ['Common', 'Deep Speech', 'Draconic', 'Dwarven', 'Elven', 'Giant', 'Goblin', 'Primordial', 'Supernal', 'Abyssal'];
D4.LANGUAGE_INFO = {
  Common: 'Spoken by humans, halflings, tieflings and most civilized peoples. Script: Common.',
  'Deep Speech': 'Language of mind flayers, beholders and other aberrations of the Far Realm. Script: Rellanic.',
  Draconic: 'Language of dragons, dragonborn and kobolds. Script: Iokharic.',
  Dwarven: 'Language of dwarves, azer and some giants. Script: Davek.',
  Elven: 'Language of elves, eladrin and other fey. Script: Rellanic.',
  Giant: 'Language of giants, orcs, ogres and trolls. Script: Davek.',
  Goblin: 'Language of goblins, hobgoblins and bugbears. Script: Common.',
  Primordial: 'Language of elementals and the creatures of the Elemental Chaos. Script: Barazhad.',
  Supernal: 'Language of angels, gods and other immortals of the Astral Sea. Anyone who hears it understands it, but it has no script of its own for mortals.',
  Abyssal: 'Language of demons, spoken in the Abyss. Script: Barazhad.',
};
D4.ALIGNMENTS = {
  'Lawful Good': 'Protects the weak, upholds order and fights evil. Most paladins and clerics of Bahamut and Moradin.',
  Good: 'Protects others from harm and opposes evil, without needing laws to do it.',
  Unaligned: 'Has no strong commitment to good or evil. Most people are unaligned.',
  Evil: 'Uses others and cares only for its own gain. Not suitable for most player characters.',
  'Chaotic Evil': 'Destroys and kills for its own sake. Not suitable for player characters.',
};
D4.DEITIES = {
  Avandra: 'Good. God of change, luck, trade and travel. Worshipped by halflings, merchants and adventurers.',
  Bahamut: 'Lawful good. God of justice, protection, nobility and honor. Revered by paladins and dragonborn.',
  Corellon: 'Unaligned. God of spring, beauty, the arts and arcane magic. Patron of eladrin and elves.',
  Erathis: 'Unaligned. God of civilization, invention and laws. Worshipped in cities and by rulers and inventors.',
  Ioun: 'Unaligned. God of knowledge, skill and prophecy. Revered by sages, scholars and wizards.',
  Kord: 'Unaligned. God of storms, battle and strength. Favored by fighters and athletes.',
  Melora: 'Unaligned. God of the wilderness and the sea. Revered by rangers, hunters and sailors.',
  Moradin: 'Lawful good. God of family, community and creation (smithing and stonework). Patron of dwarves.',
  Pelor: 'Good. God of the sun, summer, agriculture and time. The most widely worshipped god.',
  'The Raven Queen': 'Unaligned. God of death, fate and winter. Opposes undead. Revered by those who deal with death.',
  Sehanine: 'Unaligned. God of the moon, autumn, love, trickery and shadows. Patron of elves, halflings and illusionists.',
  Asmodeus: 'Evil. God of tyranny and domination, lord of the Nine Hells. Not for player characters.',
  Bane: 'Evil. God of war and conquest. Not for player characters.',
  Gruumsh: 'Chaotic evil. God of slaughter and destruction, worshipped by orcs.',
  Lolth: 'Chaotic evil. God of shadow, lies and spiders, worshipped by drow.',
  Tharizdun: 'Chaotic evil. The chained god, bent on destroying the world.',
  Tiamat: 'Evil. God of wealth, greed and envy, the five-headed dragon.',
  Torog: 'Evil. The King that Crawls, god of the Underdark, imprisonment and torture.',
  Vecna: 'Evil. God of undead, necromancy and secrets.',
  Zehir: 'Evil. God of darkness, poison and assassins, worshipped by yuan-ti.',
};

/* Level table: XP needed, and what each level grants. */
D4.XP = [0, 0, 1000, 2250, 3750, 5500, 7500, 10000, 13000, 16500, 20500, 26000, 32000, 39000, 47000, 57000,
  69000, 83000, 99000, 119000, 143000, 175000, 210000, 255000, 310000, 375000, 450000, 550000, 675000, 825000, 1000000];
D4.FEAT_LEVELS = [1, 2, 4, 6, 8, 10, 11, 12, 14, 16, 18, 20, 21, 22, 24, 26, 28, 30];
D4.ABILITY_UP_LEVELS = [4, 8, 14, 18, 24, 28]; // +1 to two different scores
D4.ABILITY_ALL_LEVELS = [11, 21];               // +1 to every score
D4.tier = lvl => lvl >= 21 ? 3 : lvl >= 11 ? 2 : 1;
D4.TIER_NAMES = { 1: 'Heroic', 2: 'Paragon', 3: 'Epic' };

/* Power slots in the order the Player's Handbook grants them.
   "replace" slots swap out one earlier power of the same kind. */
D4.POWER_SLOTS = [
  { id: 'aw1', lvl: 1, use: 'aw', label: 'At-will attack' },
  { id: 'aw2', lvl: 1, use: 'aw', label: 'At-will attack' },
  { id: 'enc1', lvl: 1, use: 'enc', label: 'Encounter attack' },
  { id: 'day1', lvl: 1, use: 'day', label: 'Daily attack' },
  { id: 'util2', lvl: 2, use: 'util', label: 'Utility power' },
  { id: 'enc3', lvl: 3, use: 'enc', label: 'Encounter attack' },
  { id: 'day5', lvl: 5, use: 'day', label: 'Daily attack' },
  { id: 'util6', lvl: 6, use: 'util', label: 'Utility power' },
  { id: 'enc7', lvl: 7, use: 'enc', label: 'Encounter attack' },
  { id: 'day9', lvl: 9, use: 'day', label: 'Daily attack' },
  { id: 'util10', lvl: 10, use: 'util', label: 'Utility power' },
  { id: 'pp11', lvl: 11, use: 'enc', path: true, label: 'Paragon path encounter attack' },
  { id: 'pp12', lvl: 12, use: 'util', path: true, label: 'Paragon path utility power' },
  { id: 'enc13', lvl: 13, use: 'enc', replace: true, label: 'Encounter attack (replaces one)' },
  { id: 'day15', lvl: 15, use: 'day', replace: true, label: 'Daily attack (replaces one)' },
  { id: 'util16', lvl: 16, use: 'util', label: 'Utility power' },
  { id: 'enc17', lvl: 17, use: 'enc', replace: true, label: 'Encounter attack (replaces one)' },
  { id: 'day19', lvl: 19, use: 'day', replace: true, label: 'Daily attack (replaces one)' },
  { id: 'pp20', lvl: 20, use: 'day', path: true, label: 'Paragon path daily attack' },
  { id: 'util22', lvl: 22, use: 'util', label: 'Utility power' },
  { id: 'enc23', lvl: 23, use: 'enc', replace: true, label: 'Encounter attack (replaces one)' },
  { id: 'day25', lvl: 25, use: 'day', replace: true, label: 'Daily attack (replaces one)' },
  { id: 'ed26', lvl: 26, use: 'util', destiny: true, label: 'Epic destiny utility power' },
  { id: 'enc27', lvl: 27, use: 'enc', replace: true, label: 'Encounter attack (replaces one)' },
  { id: 'day29', lvl: 29, use: 'day', replace: true, label: 'Daily attack (replaces one)' },
];
D4.PATH_FEATURE_LEVELS = [11, 16];
D4.DESTINY_FEATURE_LEVELS = [21, 24, 30];

D4.USAGE = {
  aw: { name: 'At-Will', desc: 'You can use this power as often as you like.' },
  enc: { name: 'Encounter', desc: 'You can use this power once per encounter. It recharges when you take a short rest (5 minutes).' },
  day: { name: 'Daily', desc: 'You can use this power once per day. It recharges when you take an extended rest (6 hours).' },
};
D4.ACTIONS = {
  std: 'Standard Action', move: 'Move Action', minor: 'Minor Action', free: 'Free Action',
  int: 'Immediate Interrupt', rea: 'Immediate Reaction', opp: 'Opportunity Action', no: 'No Action',
};

D4.WEAPON_GROUPS = ['Axe', 'Bow', 'Crossbow', 'Flail', 'Hammer', 'Heavy blade', 'Light blade', 'Mace', 'Pick', 'Polearm', 'Sling', 'Spear', 'Staff', 'Unarmed'];
D4.IMPLEMENTS = ['Holy symbol', 'Orb', 'Rod', 'Staff', 'Wand', 'Totem', 'Dagger'];
D4.ARMOR_TYPES = ['Cloth', 'Leather', 'Hide', 'Chainmail', 'Scale', 'Plate'];

/* Enhancement bonus by magic item level, and the market price of an item of each level. */
D4.ITEM_PRICE = [0, 360, 520, 680, 840, 1000, 1800, 2600, 3400, 4200, 5000, 9000, 13000, 17000, 21000, 25000,
  45000, 65000, 85000, 105000, 125000, 225000, 325000, 425000, 525000, 625000, 1125000, 1625000, 2125000, 2625000, 3125000];

/* Glossary: every term here becomes a tappable link inside descriptions. */
D4.GLOSSARY = {
  /* Conditions */
  Blinded: { cat: 'Condition', desc: 'You can\'t see, so every target has total concealment against you (-5 to hit). You take a -10 penalty to Perception checks, grant combat advantage and can\'t flank.' },
  Dazed: { cat: 'Condition', desc: 'On your turn you can take only one action: a standard, a move or a minor action (plus free actions). You can\'t take immediate or opportunity actions, you grant combat advantage and you can\'t flank.' },
  Deafened: { cat: 'Condition', desc: 'You can\'t hear, and you take a -10 penalty to Perception checks.' },
  Dominated: { cat: 'Condition', desc: 'You can\'t take actions of your own. The creature that dominates you chooses one action for you each turn (a standard, move, minor or free action) and can make you use only at-will powers. You grant combat advantage and can\'t flank.' },
  Dying: { cat: 'Condition', desc: 'You are unconscious at 0 hit points or fewer. At the end of each of your turns you make a death saving throw.' },
  Grabbed: { cat: 'Condition', desc: 'You are immobilized. The grab ends if the grabber moves away, is unable to act, or you escape (Acrobatics vs Reflex or Athletics vs Fortitude, as a move action) or are pulled, pushed or slid away.' },
  Helpless: { cat: 'Condition', desc: 'You grant combat advantage, and an adjacent enemy can use a coup de grace on you (an automatic critical hit; if the damage reaches your bloodied value, you die).' },
  Immobilized: { cat: 'Condition', desc: 'You can\'t move from your space, though you can still teleport and can still be pulled, pushed or slid.' },
  Marked: { cat: 'Condition', desc: 'You take a -2 penalty to attack rolls for any attack that doesn\'t include the creature that marked you as a target. A creature can be marked by only one creature at a time; a new mark replaces the old one.' },
  Petrified: { cat: 'Condition', desc: 'You have been turned to stone. You are unconscious, gain resist 20 to all damage, are unaware of your surroundings and don\'t age.' },
  Prone: { cat: 'Condition', desc: 'You are lying down. You can only crawl (a move action, half speed), take -2 to attack rolls, and grant combat advantage to melee attacks. You gain +2 to all defenses against ranged attacks from enemies that aren\'t adjacent. Standing up is a move action.' },
  'Removed from play': { cat: 'Condition', desc: 'You are temporarily out of the encounter. You can\'t take actions and have no line of sight or effect to anything.' },
  Restrained: { cat: 'Condition', desc: 'You can\'t move (not even by teleport or forced movement), take -2 to attack rolls and grant combat advantage.' },
  Slowed: { cat: 'Condition', desc: 'Your speed becomes 2 (if it was higher) and you can\'t benefit from bonuses to speed. This doesn\'t affect teleport or forced movement.' },
  Stunned: { cat: 'Condition', desc: 'You can\'t take actions, you grant combat advantage and you can\'t flank. If you were flying, you fall.' },
  Surprised: { cat: 'Condition', desc: 'During a surprise round you can\'t take actions (except free actions), you grant combat advantage and you can\'t flank.' },
  Unconscious: { cat: 'Condition', desc: 'You are helpless, take a -5 penalty to all defenses, can\'t take actions, fall prone if possible and can\'t flank.' },
  Weakened: { cat: 'Condition', desc: 'Your attacks deal half damage. Ongoing damage you deal is not affected.' },

  /* Combat terms */
  Bloodied: { cat: 'Combat', desc: 'You are bloodied when your current hit points are at or below one-half your maximum. Many powers get stronger against bloodied targets or when you are bloodied.' },
  'combat advantage': { cat: 'Combat', desc: 'You gain a +2 bonus to attack rolls against a creature that grants you combat advantage (it is flanked, prone, dazed, stunned, blinded, surprised, or can\'t see you). Rogues deal Sneak Attack damage with it.' },
  flank: { cat: 'Combat', alias: ['flanking', 'flanked'], desc: 'You flank an enemy when you and an ally are adjacent to it on opposite sides or corners. You gain combat advantage against a creature you flank.' },
  cover: { cat: 'Combat', alias: ['superior cover'], desc: 'An obstacle between you and your target. Cover gives a -2 penalty to attack rolls against the target; superior cover gives -5.' },
  concealment: { cat: 'Combat', alias: ['total concealment'], desc: 'Fog, darkness or foliage that obscures a target. Concealment gives a -2 penalty to attack rolls against the target; total concealment (you can\'t see it at all) gives -5.' },
  'healing surge': { cat: 'Combat', alias: ['healing surges'], desc: 'You have a limited number of healing surges per day. When you spend one you regain hit points equal to your healing surge value (one-quarter of your maximum hit points). You regain all surges after an extended rest.' },
  'healing surge value': { cat: 'Combat', alias: ['surge value'], desc: 'One-quarter of your maximum hit points, rounded down. This is how much a healing surge restores, plus any bonuses.' },
  'second wind': { cat: 'Combat', desc: 'Once per encounter, as a standard action, you can spend a healing surge to regain hit points and gain a +2 bonus to all defenses until the start of your next turn.' },
  'action point': { cat: 'Combat', alias: ['action points'], desc: 'Once per encounter, as a free action on your turn, spend an action point to take an extra action (standard, move or minor). You start each day with 1 and gain 1 at each milestone.' },
  milestone: { cat: 'Combat', desc: 'You reach a milestone after every two encounters without taking an extended rest. You gain an action point.' },
  'short rest': { cat: 'Combat', desc: 'A 5-minute pause. Your encounter powers recharge, your second wind resets, and you can spend healing surges to regain hit points.' },
  'extended rest': { cat: 'Combat', desc: 'At least 6 hours of rest, once per day. You regain all hit points, healing surges and daily powers, and your action points reset to 1.' },
  'saving throw': { cat: 'Combat', alias: ['saving throws', 'save ends', 'save'], desc: 'At the end of your turn, roll a d20 for each effect that a save can end: 10 or higher ends the effect. "Save ends" in a power means the effect lasts until the target succeeds.' },
  'death saving throw': { cat: 'Combat', desc: 'When you are dying, roll a d20 at the end of your turn. Under 10: one failure (three failures and you die). 10-19: no change. 20: you regain hit points as if you had spent a healing surge.' },
  'ongoing damage': { cat: 'Combat', desc: 'Damage you take at the start of each of your turns until you make a saving throw against it (usually "save ends").' },
  'temporary hit points': { cat: 'Combat', desc: 'A buffer of hit points lost before your real ones. They don\'t stack: if you gain more, keep the higher amount. They go away after an extended rest or at the end of an encounter unless the power says otherwise.' },
  regeneration: { cat: 'Combat', desc: 'You regain the listed number of hit points at the start of each of your turns, as long as you have at least 1 hit point.' },
  resist: { cat: 'Combat', alias: ['resistance'], desc: 'Resist 5 fire means you take 5 less damage from any fire attack. Resistances of the same type don\'t stack; use the highest.' },
  vulnerable: { cat: 'Combat', alias: ['vulnerability'], desc: 'Vulnerable 5 fire means you take 5 extra damage whenever you take fire damage.' },
  'critical hit': { cat: 'Combat', alias: ['critical hits', 'crit', 'crits'], desc: 'A natural 20 on an attack roll that hits. You deal maximum damage, plus any extra critical damage dice from magic weapons or implements.' },
  'natural 20': { cat: 'Combat', desc: 'The d20 actually shows 20. An attack with a natural 20 always hits, and is a critical hit if it would hit anyway.' },
  'one-half your level': { cat: 'Combat', alias: ['half your level', 'half level'], desc: 'Almost every attack roll, defense, skill check and ability check adds one-half your level, rounded down.' },

  /* Movement */
  shift: { cat: 'Movement', alias: ['shifts', 'shifting'], desc: 'Move 1 square (as a move action) without provoking opportunity attacks. Some powers let you shift farther.' },
  push: { cat: 'Movement', alias: ['pushes', 'pushed'], desc: 'Forced movement: move the target the listed number of squares, each square farther away from you.' },
  pull: { cat: 'Movement', alias: ['pulls', 'pulled'], desc: 'Forced movement: move the target the listed number of squares, each square closer to you.' },
  slide: { cat: 'Movement', alias: ['slides', 'slid'], desc: 'Forced movement: move the target the listed number of squares in any direction.' },
  teleport: { cat: 'Movement', alias: ['teleports', 'teleported', 'Teleportation'], desc: 'Move instantly to a square you can see within range, without moving through the squares between. Teleporting doesn\'t provoke opportunity attacks.' },
  'difficult terrain': { cat: 'Movement', desc: 'Rubble, undergrowth or other hampering terrain. Each square of difficult terrain costs 1 extra square of movement. You can\'t shift into it unless a power lets you.' },
  charge: { cat: 'Action', alias: ['charging', 'charges'], desc: 'Standard action: move up to your speed (ending at least 2 squares closer to the target) and make a melee basic attack or bull rush with a +1 bonus to the attack roll. After a charge you can\'t take any more actions that turn, except free actions.' },
  'opportunity attack': { cat: 'Action', alias: ['opportunity attacks'], desc: 'When an enemy adjacent to you leaves a square next to you, or makes a ranged or area attack, you can make a melee basic attack against it as an opportunity action (once per enemy turn).' },
  'basic attack': { cat: 'Action', alias: ['melee basic attack', 'ranged basic attack', 'basic attacks'], desc: 'A simple at-will attack everyone has. Melee basic attack: Strength vs AC, 1[W] + Strength modifier damage. Ranged basic attack: Dexterity vs AC, 1[W] + Dexterity modifier damage. Damage becomes 2[W] at 21st level.' },
  'total defense': { cat: 'Action', desc: 'Standard action: gain a +2 bonus to all defenses until the start of your next turn.' },
  'aid another': { cat: 'Action', desc: 'Standard action: make a DC 10 check or attack to give an adjacent ally +2 to their next check, attack roll or defense.' },
  'bull rush': { cat: 'Action', desc: 'Standard action: Strength vs Fortitude against an adjacent creature. On a hit you push it 1 square and can shift into the square it left.' },
  grab: { cat: 'Action', desc: 'Standard action: Strength vs Reflex against an adjacent creature no more than one size larger. On a hit, the target is grabbed until it escapes or you end the grab.' },
  'coup de grace': { cat: 'Action', desc: 'Standard action against an adjacent helpless enemy: any attack you can make against it automatically scores a critical hit. If the damage equals or exceeds its bloodied value, it dies.' },

  /* Power terms */
  'At-Will': { cat: 'Power', desc: 'An at-will power can be used as often as you like.' },
  Encounter: { cat: 'Power', desc: 'An encounter power can be used once per encounter and recharges after a short rest.' },
  Daily: { cat: 'Power', desc: 'A daily power can be used once per day and recharges after an extended rest.' },
  '[W]': { cat: 'Power', desc: 'Weapon damage dice. 2[W] with a longsword (1d8) means 2d8. With a greataxe (1d12), 2[W] is 2d12.' },
  Reliable: { cat: 'Keyword', desc: 'If you miss every target with a reliable power, you don\'t expend it: you can use it again later.' },
  Stance: { cat: 'Keyword', desc: 'A stance lasts until the end of the encounter or until you enter another stance. You can be in only one stance at a time.' },
  Sustain: { cat: 'Power', alias: ['sustain minor', 'sustain standard', 'sustain move'], desc: 'You can keep the power\'s effect going by taking the listed action (usually a minor action) each turn. If you don\'t, the effect ends at the end of your turn.' },
  Aftereffect: { cat: 'Power', desc: 'An effect that happens after a save-ends effect ends.' },
  Zone: { cat: 'Keyword', alias: ['zone'], desc: 'A power that creates a lasting area on the battlefield with its own effect. Zones don\'t block movement unless they say so.' },
  Conjuration: { cat: 'Keyword', alias: ['conjuration'], desc: 'A power that creates an object or creature of magical energy. It can\'t be attacked or damaged and doesn\'t occupy a square unless the power says so.' },
  Healing: { cat: 'Keyword', desc: 'A power that restores hit points.' },
  Implement: { cat: 'Keyword', desc: 'You can use an implement (holy symbol, orb, rod, staff, wand, totem) with this power, adding its enhancement bonus to the attack and damage rolls.' },
  Weapon: { cat: 'Keyword', desc: 'You use a weapon with this power. Add the weapon\'s proficiency bonus and enhancement bonus to the attack roll, and its enhancement bonus to damage. [W] is the weapon\'s damage dice.' },
  Charm: { cat: 'Keyword', desc: 'A power that controls a creature\'s actions or mind.' },
  Fear: { cat: 'Keyword', desc: 'A power that inspires fright.' },
  Illusion: { cat: 'Keyword', desc: 'A power that deceives the mind or senses.' },
  Sleep: { cat: 'Keyword', desc: 'A power that puts creatures into a magical slumber.' },
  Poison: { cat: 'Keyword', desc: 'A power that deals poison damage or delivers a poison.' },
  Martial: { cat: 'Power source', desc: 'Power drawn from training and skill: fighters, rangers, rogues, warlords.' },
  Arcane: { cat: 'Power source', desc: 'Power drawn from magic: wizards, warlocks, sorcerers, bards.' },
  Divine: { cat: 'Power source', desc: 'Power granted by the gods: clerics, paladins, avengers, invokers.' },
  Primal: { cat: 'Power source', desc: 'Power drawn from the spirits of the natural world: barbarians, druids, shamans, wardens.' },

  /* Areas */
  burst: { cat: 'Area', alias: ['close burst', 'area burst'], desc: 'Close burst 1 affects every square within 1 square of you. Area burst 2 within 10 is centered on a square up to 10 squares away and covers 2 squares out from it (a 5x5 area).' },
  blast: { cat: 'Area', alias: ['close blast'], desc: 'Close blast 3 fills a 3x3 square area adjacent to you, on the side you choose.' },
  wall: { cat: 'Area', desc: 'A wall of connected squares starting within range. Each square must share a side or corner with the one before it.' },
  reach: { cat: 'Weapon', desc: 'A reach weapon lets you attack enemies 2 squares away with melee attacks. You can\'t make opportunity attacks at that range.' },

  /* Damage types */
  Acid: { cat: 'Damage type', desc: 'Corrosive damage.' },
  Cold: { cat: 'Damage type', desc: 'Freezing damage.' },
  Fire: { cat: 'Damage type', desc: 'Burning damage.' },
  Force: { cat: 'Damage type', desc: 'Pure magical energy. Few creatures resist it.' },
  Lightning: { cat: 'Damage type', desc: 'Electrical damage.' },
  Necrotic: { cat: 'Damage type', desc: 'Life-draining damage. Many undead resist it.' },
  Psychic: { cat: 'Damage type', desc: 'Damage to the mind.' },
  Radiant: { cat: 'Damage type', desc: 'Searing holy light. Undead are often vulnerable to it.' },
  Thunder: { cat: 'Damage type', desc: 'Damage from concussive sound.' },

  /* Vision */
  'low-light vision': { cat: 'Senses', desc: 'You can see in dim light without penalty.' },
  darkvision: { cat: 'Senses', desc: 'You can see in darkness without penalty.' },
};

/* Things every character can do in combat, shown under Powers. */
D4.BASIC_ACTIONS = [
  { name: 'Second Wind', act: 'Standard', desc: 'Once per encounter: spend a healing surge to regain hit points, and gain +2 to all defenses until the start of your next turn.' },
  { name: 'Charge', act: 'Standard', desc: 'Move up to your speed and make a melee basic attack or bull rush at +1. You must end at least 2 squares closer, and can take no more actions that turn except free actions.' },
  { name: 'Total Defense', act: 'Standard', desc: '+2 to all defenses until the start of your next turn.' },
  { name: 'Aid Another', act: 'Standard', desc: 'Make a DC 10 check or attack to give an adjacent ally +2 on their next roll or defense.' },
  { name: 'Bull Rush', act: 'Standard', desc: 'Strength vs Fortitude: push an adjacent enemy 1 square and shift into the space it left.' },
  { name: 'Grab', act: 'Standard', desc: 'Strength vs Reflex: the adjacent target is grabbed (immobilized) until it escapes.' },
  { name: 'Coup de Grace', act: 'Standard', desc: 'Attack an adjacent helpless enemy for an automatic critical hit.' },
  { name: 'Ready an Action', act: 'Standard', desc: 'Choose an action and a trigger. When the trigger happens, take the action as an immediate reaction.' },
  { name: 'Walk', act: 'Move', desc: 'Move up to your speed. Leaving a square next to an enemy provokes an opportunity attack.' },
  { name: 'Shift', act: 'Move', desc: 'Move 1 square without provoking opportunity attacks.' },
  { name: 'Run', act: 'Move', desc: 'Move your speed + 2. You grant combat advantage and take -5 to attack rolls until the start of your next turn.' },
  { name: 'Stand Up', act: 'Move', desc: 'Stand up from prone.' },
  { name: 'Escape', act: 'Move', desc: 'Acrobatics vs Reflex or Athletics vs Fortitude to escape a grab. On a success you can shift 1 square.' },
  { name: 'Squeeze', act: 'Move', desc: 'Move at half speed through a space one size smaller. You take -5 to attack rolls and grant combat advantage.' },
  { name: 'Crawl', act: 'Move', desc: 'While prone, move at half your speed.' },
  { name: 'Draw or Sheathe', act: 'Minor', desc: 'Draw or put away a weapon or implement.' },
  { name: 'Pick Up / Open', act: 'Minor', desc: 'Pick up an item, open or close a door or container, retrieve an item.' },
  { name: 'Drop Prone', act: 'Minor', desc: 'Drop to the ground.' },
  { name: 'Delay', act: 'Free', desc: 'Put off your turn until later in the round. Your initiative changes to when you act.' },
  { name: 'Spend an Action Point', act: 'Free', desc: 'Once per encounter, take an extra standard, move or minor action this turn.' },
  { name: 'Talk', act: 'Free', desc: 'Speak a few sentences.' },
  { name: 'Opportunity Attack', act: 'Opportunity', desc: 'Make a melee basic attack against an adjacent enemy that moves out of a square next to you or makes a ranged or area attack.' },
];
