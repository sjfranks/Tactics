/* Equipment: armor, shields, weapons, implements, adventuring gear and magic items.
   Weapon: prof = proficiency bonus, dmg = damage die, rng = normal/long range, groups, props (properties).
   Armor: ac = armor bonus, check = armor check penalty (applies to Strength, Dexterity and Constitution skills), speed = speed penalty.
   Magic items with "levels" come in enhancement bonuses +1..+6; each + uses the listed item level. */
'use strict';

D4.addItems = function (kind, list, defaults) {
  list.forEach(it => {
    const o = Object.assign({ kind }, defaults, it);
    o.id = o.id || o.n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    D4.items[o.id] = o;
  });
};

D4.WEAPON_PROPS = {
  'Heavy thrown': 'You can throw this weapon as a ranged attack using Strength (it uses your melee attack ability).',
  'Light thrown': 'You can throw this weapon as a ranged attack using Dexterity.',
  'High crit': 'On a critical hit, deal an extra 1[W] damage (2[W] at 11th level, 3[W] at 21st level).',
  'Load free': 'Reloading is a free action. Uses ammunition.',
  'Load minor': 'Reloading is a minor action. Uses ammunition.',
  'Off-hand': 'Light enough to hold in your off hand while you wield a weapon in your main hand. You still attack with one weapon per power unless the power says otherwise.',
  Reach: 'You can attack enemies 2 squares away with melee attacks (but not opportunity attacks at that range).',
  Small: 'A small creature can use this two-handed weapon.',
  Versatile: 'Use it one-handed or two-handed. Two-handed, a Medium creature gets +1 damage. Small creatures must use it two-handed and don\'t get the bonus.',
  'Brutal 1': 'Reroll damage dice that show 1 until they show 2 or higher.',
  'Brutal 2': 'Reroll damage dice that show 1 or 2 until they show 3 or higher.',
  Defensive: 'While you wield it and another melee weapon, you gain a +1 bonus to AC.',
};

D4.WEAPON_CATS = {
  'simple-melee': 'Simple melee', 'military-melee': 'Military melee', 'superior-melee': 'Superior melee',
  'simple-ranged': 'Simple ranged', 'military-ranged': 'Military ranged', 'superior-ranged': 'Superior ranged',
};

D4.addItems('weapon', [
  /* Simple melee, one-handed */
  { n: 'Club', cat: 'simple-melee', hands: 1, prof: 2, dmg: '1d6', price: 1, wt: 3, groups: ['Mace'] },
  { n: 'Dagger', cat: 'simple-melee', hands: 1, prof: 3, dmg: '1d4', rng: '5/10', price: 1, wt: 1, groups: ['Light blade'], props: ['Off-hand', 'Light thrown'], imp: 'Dagger' },
  { n: 'Javelin', cat: 'simple-melee', hands: 1, prof: 2, dmg: '1d6', rng: '10/20', price: 5, wt: 2, groups: ['Spear'], props: ['Heavy thrown'] },
  { n: 'Mace', cat: 'simple-melee', hands: 1, prof: 2, dmg: '1d8', price: 5, wt: 6, groups: ['Mace'], props: ['Versatile'] },
  { n: 'Sickle', cat: 'simple-melee', hands: 1, prof: 2, dmg: '1d6', price: 2, wt: 2, groups: ['Light blade'], props: ['Off-hand'] },
  { n: 'Spear', cat: 'simple-melee', hands: 1, prof: 2, dmg: '1d8', price: 5, wt: 6, groups: ['Spear'], props: ['Versatile'] },
  /* Simple melee, two-handed */
  { n: 'Greatclub', cat: 'simple-melee', hands: 2, prof: 2, dmg: '2d4', price: 1, wt: 10, groups: ['Mace'] },
  { n: 'Morningstar', cat: 'simple-melee', hands: 2, prof: 2, dmg: '1d10', price: 10, wt: 8, groups: ['Mace'] },
  { n: 'Quarterstaff', cat: 'simple-melee', hands: 2, prof: 2, dmg: '1d8', price: 5, wt: 4, groups: ['Staff'], imp: 'Staff' },
  { n: 'Scythe', cat: 'simple-melee', hands: 2, prof: 2, dmg: '2d4', price: 5, wt: 10, groups: ['Heavy blade'] },
  /* Military melee, one-handed */
  { n: 'Battleaxe', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d10', price: 15, wt: 6, groups: ['Axe'], props: ['Versatile'] },
  { n: 'Flail', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d10', price: 10, wt: 5, groups: ['Flail'], props: ['Versatile'] },
  { n: 'Handaxe', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d6', rng: '5/10', price: 5, wt: 3, groups: ['Axe'], props: ['Off-hand', 'Heavy thrown'] },
  { n: 'Longsword', cat: 'military-melee', hands: 1, prof: 3, dmg: '1d8', price: 15, wt: 4, groups: ['Heavy blade'], props: ['Versatile'] },
  { n: 'Scimitar', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d8', price: 10, wt: 4, groups: ['Heavy blade'], props: ['High crit'] },
  { n: 'Short sword', cat: 'military-melee', hands: 1, prof: 3, dmg: '1d6', price: 10, wt: 2, groups: ['Light blade'], props: ['Off-hand'] },
  { n: 'Throwing hammer', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d6', rng: '5/10', price: 5, wt: 2, groups: ['Hammer'], props: ['Off-hand', 'Heavy thrown'] },
  { n: 'Warhammer', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d10', price: 15, wt: 5, groups: ['Hammer'], props: ['Versatile'] },
  { n: 'War pick', cat: 'military-melee', hands: 1, prof: 2, dmg: '1d8', price: 15, wt: 6, groups: ['Pick'], props: ['High crit', 'Versatile'] },
  /* Military melee, two-handed */
  { n: 'Falchion', cat: 'military-melee', hands: 2, prof: 3, dmg: '2d4', price: 25, wt: 7, groups: ['Heavy blade'], props: ['High crit'] },
  { n: 'Glaive', cat: 'military-melee', hands: 2, prof: 2, dmg: '2d4', price: 25, wt: 10, groups: ['Heavy blade', 'Polearm'], props: ['Reach'] },
  { n: 'Greataxe', cat: 'military-melee', hands: 2, prof: 2, dmg: '1d12', price: 30, wt: 12, groups: ['Axe'], props: ['High crit'] },
  { n: 'Greatsword', cat: 'military-melee', hands: 2, prof: 3, dmg: '1d10', price: 30, wt: 8, groups: ['Heavy blade'] },
  { n: 'Halberd', cat: 'military-melee', hands: 2, prof: 2, dmg: '1d10', price: 25, wt: 12, groups: ['Axe', 'Polearm'], props: ['Reach'] },
  { n: 'Heavy flail', cat: 'military-melee', hands: 2, prof: 2, dmg: '2d6', price: 25, wt: 10, groups: ['Flail'] },
  { n: 'Longspear', cat: 'military-melee', hands: 2, prof: 2, dmg: '1d10', price: 10, wt: 9, groups: ['Polearm', 'Spear'], props: ['Reach'] },
  { n: 'Maul', cat: 'military-melee', hands: 2, prof: 2, dmg: '2d6', price: 30, wt: 12, groups: ['Hammer'] },
  /* Superior melee */
  { n: 'Bastard sword', cat: 'superior-melee', hands: 1, prof: 3, dmg: '1d10', price: 30, wt: 6, groups: ['Heavy blade'], props: ['Versatile'] },
  { n: 'Katar', cat: 'superior-melee', hands: 1, prof: 3, dmg: '1d6', price: 3, wt: 1, groups: ['Light blade'], props: ['Off-hand', 'High crit'] },
  { n: 'Rapier', cat: 'superior-melee', hands: 1, prof: 3, dmg: '1d8', price: 25, wt: 2, groups: ['Light blade'] },
  { n: 'Spiked chain', cat: 'superior-melee', hands: 2, prof: 3, dmg: '2d4', price: 30, wt: 10, groups: ['Flail'], props: ['Reach'] },
  { n: 'Craghammer', src: 'AV', cat: 'superior-melee', hands: 1, prof: 2, dmg: '1d10', price: 20, wt: 6, groups: ['Hammer'], props: ['Brutal 2', 'Versatile'] },
  { n: 'Kukri', src: 'AV', cat: 'superior-melee', hands: 1, prof: 2, dmg: '1d6', price: 10, wt: 2, groups: ['Light blade'], props: ['Brutal 1', 'Off-hand'] },
  { n: 'Parrying dagger', src: 'AV', cat: 'superior-melee', hands: 1, prof: 2, dmg: '1d4', price: 5, wt: 1, groups: ['Light blade'], props: ['Defensive', 'Off-hand'] },
  { n: 'Triple-headed flail', src: 'AV', cat: 'superior-melee', hands: 1, prof: 3, dmg: '1d10', price: 15, wt: 6, groups: ['Flail'], props: ['Versatile'] },
  { n: 'Waraxe', src: 'AV', cat: 'superior-melee', hands: 1, prof: 2, dmg: '1d12', price: 30, wt: 10, groups: ['Axe'], props: ['Versatile'] },
  { n: 'Execution axe', src: 'AV', cat: 'superior-melee', hands: 2, prof: 2, dmg: '1d12', price: 30, wt: 14, groups: ['Axe'], props: ['Brutal 2', 'High crit'] },
  { n: 'Fullblade', src: 'AV', cat: 'superior-melee', hands: 2, prof: 3, dmg: '1d12', price: 30, wt: 10, groups: ['Heavy blade'], props: ['High crit'] },
  { n: 'Gouge', src: 'AV', cat: 'superior-melee', hands: 2, prof: 2, dmg: '2d6', price: 30, wt: 12, groups: ['Polearm', 'Spear'], props: ['High crit', 'Reach'] },
  /* Ranged */
  { n: 'Hand crossbow', cat: 'simple-ranged', hands: 1, prof: 2, dmg: '1d6', rng: '10/20', price: 25, wt: 2, groups: ['Crossbow'], props: ['Load free'], ranged: true },
  { n: 'Sling', cat: 'simple-ranged', hands: 1, prof: 2, dmg: '1d6', rng: '10/20', price: 1, wt: 0, groups: ['Sling'], props: ['Load free'], ranged: true },
  { n: 'Crossbow', cat: 'simple-ranged', hands: 2, prof: 2, dmg: '1d8', rng: '15/30', price: 25, wt: 4, groups: ['Crossbow'], props: ['Load minor'], ranged: true },
  { n: 'Longbow', cat: 'military-ranged', hands: 2, prof: 2, dmg: '1d10', rng: '20/40', price: 30, wt: 3, groups: ['Bow'], props: ['Load free'], ranged: true },
  { n: 'Shortbow', cat: 'military-ranged', hands: 2, prof: 2, dmg: '1d8', rng: '15/30', price: 25, wt: 2, groups: ['Bow'], props: ['Load free', 'Small'], ranged: true },
  { n: 'Shuriken', cat: 'superior-ranged', hands: 1, prof: 3, dmg: '1d4', rng: '6/12', price: 1, wt: 0.5, groups: ['Light blade'], props: ['Light thrown'], ranged: true, note: 'Sold in groups of 5.' },
  { n: 'Greatbow', src: 'AV', cat: 'superior-ranged', hands: 2, prof: 2, dmg: '1d12', rng: '25/50', price: 30, wt: 5, groups: ['Bow'], props: ['Load free'], ranged: true },
  { n: 'Superior crossbow', src: 'AV', cat: 'superior-ranged', hands: 2, prof: 3, dmg: '1d10', rng: '20/40', price: 30, wt: 6, groups: ['Crossbow'], props: ['Load minor'], ranged: true },
  { n: 'Unarmed attack', id: 'unarmed', cat: 'improvised', hands: 1, prof: 0, dmg: '1d4', price: 0, wt: 0, groups: ['Unarmed'], note: 'Punches and kicks. Everyone is treated as not proficient.' },
]);

D4.addItems('armor', [
  { n: 'Cloth armor (basic clothing)', id: 'cloth', type: 'cloth', weight: 'light', ac: 0, check: 0, speed: 0, price: 1, wt: 4 },
  { n: 'Leather armor', id: 'leather', type: 'leather', weight: 'light', ac: 2, check: 0, speed: 0, price: 25, wt: 15 },
  { n: 'Hide armor', id: 'hide', type: 'hide', weight: 'light', ac: 3, check: -1, speed: 0, price: 30, wt: 25 },
  { n: 'Chainmail', id: 'chainmail', type: 'chainmail', weight: 'heavy', ac: 6, check: -1, speed: -1, price: 40, wt: 40 },
  { n: 'Scale armor', id: 'scale', type: 'scale', weight: 'heavy', ac: 7, check: 0, speed: -1, price: 45, wt: 45 },
  { n: 'Plate armor', id: 'plate', type: 'plate', weight: 'heavy', ac: 8, check: -2, speed: -1, price: 50, wt: 50 },
  /* Masterwork armor: only available as magic armor with at least the listed enhancement bonus */
  { n: 'Feyweave armor', type: 'cloth', weight: 'light', ac: 1, check: 0, speed: 0, min: 3, wt: 3, mw: true },
  { n: 'Starweave armor', type: 'cloth', weight: 'light', ac: 2, check: 0, speed: 0, min: 5, wt: 3, mw: true },
  { n: 'Feyleather armor', type: 'leather', weight: 'light', ac: 3, check: 0, speed: 0, min: 3, wt: 15, mw: true },
  { n: 'Starleather armor', type: 'leather', weight: 'light', ac: 4, check: 0, speed: 0, min: 5, wt: 15, mw: true },
  { n: 'Darkhide armor', type: 'hide', weight: 'light', ac: 4, check: -1, speed: 0, min: 3, wt: 25, mw: true },
  { n: 'Elderhide armor', type: 'hide', weight: 'light', ac: 5, check: -1, speed: 0, min: 5, wt: 25, mw: true },
  { n: 'Finemail', type: 'chainmail', weight: 'heavy', ac: 7, check: -1, speed: -1, min: 3, wt: 40, mw: true },
  { n: 'Braidmail', type: 'chainmail', weight: 'heavy', ac: 8, check: -1, speed: -1, min: 5, wt: 40, mw: true },
  { n: 'Wyrmscale armor', type: 'scale', weight: 'heavy', ac: 8, check: 0, speed: -1, min: 3, wt: 45, mw: true },
  { n: 'Elderscale armor', type: 'scale', weight: 'heavy', ac: 9, check: 0, speed: -1, min: 5, wt: 45, mw: true },
  { n: 'Warplate armor', type: 'plate', weight: 'heavy', ac: 9, check: -2, speed: -1, min: 3, wt: 50, mw: true },
  { n: 'Godplate armor', type: 'plate', weight: 'heavy', ac: 10, check: -2, speed: -1, min: 5, wt: 50, mw: true },
]);

D4.addItems('shield', [
  { n: 'Light shield', id: 'light-shield', type: 'light', ac: 1, check: 0, price: 5, wt: 6, desc: '+1 shield bonus to AC and Reflex. You can use the shield hand to hold items but not to wield a weapon.' },
  { n: 'Heavy shield', id: 'heavy-shield', type: 'heavy', ac: 2, check: -2, price: 10, wt: 15, desc: '+2 shield bonus to AC and Reflex. Your shield hand can\'t do anything else.' },
]);

D4.addItems('implement', [
  { n: 'Holy symbol', imp: 'Holy symbol', price: 10, wt: 1, desc: 'Implement for clerics, paladins, avengers and other divine characters. Worn or held.' },
  { n: 'Orb', imp: 'Orb', price: 15, wt: 2, desc: 'Implement for wizards (Orb of Imposition).' },
  { n: 'Rod', imp: 'Rod', price: 12, wt: 2, desc: 'Implement for warlocks and invokers.' },
  { n: 'Staff', imp: 'Staff', price: 5, wt: 4, desc: 'Implement for wizards, druids, sorcerers and invokers. Can also be used as a quarterstaff.' },
  { n: 'Wand', imp: 'Wand', price: 7, wt: 0.5, desc: 'Implement for wizards, warlocks and bards (Wand of Accuracy).' },
  { n: 'Totem', imp: 'Totem', price: 5, wt: 2, desc: 'Implement for druids and shamans.' },
]);

D4.addItems('gear', [
  { n: 'Standard adventurer\'s kit', id: 'adventurers-kit', price: 15, wt: 33, desc: 'Backpack, bedroll, flint and steel, belt pouch, two sunrods, ten days of trail rations, 50 feet of hempen rope and a waterskin.' },
  { n: 'Arrows (30)', price: 1, wt: 3, desc: 'Ammunition for bows.' },
  { n: 'Crossbow bolts (20)', price: 1, wt: 2, desc: 'Ammunition for crossbows.' },
  { n: 'Sling bullets (20)', price: 1, wt: 5, desc: 'Ammunition for slings.' },
  { n: 'Backpack', price: 2, wt: 2, desc: 'Holds up to 40 pounds of gear.' },
  { n: 'Bedroll', price: 0.1, wt: 5 },
  { n: 'Belt pouch', price: 1, wt: 0.5, desc: 'Holds up to 10 pounds of small items.' },
  { n: 'Candle', price: 0.01, wt: 0, desc: 'Dim light in the candle\'s square for 1 hour.' },
  { n: 'Chain (10 ft)', price: 30, wt: 2 },
  { n: 'Chalk', price: 0.01, wt: 0 },
  { n: 'Climber\'s kit', price: 2, wt: 11, desc: 'Grappling hook, pitons, hammer and harness. +2 item bonus to Athletics checks to climb.' },
  { n: 'Everburning torch', price: 50, wt: 1, desc: 'A torch that burns forever with bright light out to 5 squares.' },
  { n: 'Flask', price: 0.03, wt: 1 },
  { n: 'Flint and steel', price: 1, wt: 0 },
  { n: 'Fine clothing', price: 30, wt: 6 },
  { n: 'Grappling hook', price: 1, wt: 4 },
  { n: 'Hammer', price: 0.5, wt: 2 },
  { n: 'Lantern', price: 7, wt: 2, desc: 'Bright light out to 10 squares for 8 hours per pint of oil.' },
  { n: 'Oil (1 pint)', price: 0.1, wt: 1 },
  { n: 'Ritual book', price: 50, wt: 3, desc: 'Holds up to 128 pages of rituals.' },
  { n: 'Ritual components', price: 1, wt: 0, desc: 'Alchemical reagents, mystic salves, rare herbs or residuum. Track their gold piece value; rituals consume them.' },
  { n: 'Rope, hempen (50 ft)', price: 1, wt: 10 },
  { n: 'Rope, silk (50 ft)', price: 10, wt: 5 },
  { n: 'Spellbook', price: 50, wt: 3, desc: 'A wizard\'s book of daily and utility spells and rituals.' },
  { n: 'Sunrod', price: 2, wt: 1, desc: 'Bright light out to 20 squares for 4 hours.' },
  { n: 'Tent', price: 10, wt: 20, desc: 'Sleeps two.' },
  { n: 'Thieves\' tools', price: 20, wt: 1, desc: 'Lock picks and tools. +2 item bonus to Thievery checks to open locks and disable traps.' },
  { n: 'Torch', price: 0.01, wt: 1, desc: 'Bright light out to 5 squares for 1 hour.' },
  { n: 'Trail rations (1 day)', price: 0.5, wt: 1 },
  { n: 'Waterskin', price: 1, wt: 4 },
]);

/* Magic items. "applies" says what base item the enhancement goes on. */
const PLUS_1 = [1, 6, 11, 16, 21, 26], PLUS_2 = [2, 7, 12, 17, 22, 27], PLUS_3 = [3, 8, 13, 18, 23, 28], PLUS_5 = [5, 10, 15, 20, 25, 30];
D4.addItems('magic', [
  { n: 'Magic weapon', id: 'magic-weapon', applies: 'weapon', levels: PLUS_1, crit: '+1d6 damage per plus',
    desc: 'Adds its enhancement bonus to attack rolls and damage rolls with the weapon.' },
  { n: 'Flaming weapon', id: 'flaming-weapon', applies: 'weapon', levels: PLUS_5, crit: '+1d6 fire damage per plus',
    desc: 'Adds its enhancement bonus to attack and damage rolls. Power (at-will, free action): the weapon deals fire damage until you end the effect. Power (daily, free action, when you hit): the target also takes ongoing fire damage (save ends): 5 for a +1 or +2 weapon, 10 for +3 or +4, 15 for +5 or +6.' },
  { n: 'Frost weapon', id: 'frost-weapon', applies: 'weapon', levels: PLUS_3, crit: '+1d8 cold damage per plus',
    desc: 'Adds its enhancement bonus to attack and damage rolls. Power (at-will, free action): the weapon deals cold damage until you end the effect. Power (daily, free action, when you hit): the target takes extra cold damage and is slowed until the end of your next turn.' },
  { n: 'Vicious weapon', id: 'vicious-weapon', applies: 'weapon', levels: PLUS_2, crit: '+1d12 damage per plus',
    desc: 'Adds its enhancement bonus to attack and damage rolls, and deals much more damage on a critical hit.' },
  { n: 'Magic armor', id: 'magic-armor', applies: 'armor', levels: PLUS_1, desc: 'Adds its enhancement bonus to AC.' },
  { n: 'Magic implement', id: 'magic-implement', applies: 'implement', levels: PLUS_1, crit: '+1d6 damage per plus',
    desc: 'A magic holy symbol, orb, rod, staff, wand or totem. Adds its enhancement bonus to attack rolls and damage rolls with implement powers.' },
  { n: 'Amulet of Protection', id: 'amulet-of-protection', slot: 'Neck', levels: PLUS_1, neck: true,
    desc: 'Adds its enhancement bonus to Fortitude, Reflex and Will.' },
  { n: 'Cloak of Resistance', id: 'cloak-of-resistance', slot: 'Neck', levels: PLUS_2, neck: true,
    desc: 'Adds its enhancement bonus to Fortitude, Reflex and Will. It also has a daily power that gives you resistance to all damage for a short time (see the full text).' },
  { n: 'Bracers of Mighty Striking', slot: 'Arms', lvl: 2, desc: 'Property: +2 item bonus to damage rolls with melee basic attacks.',
    m: [['dmg', 2, 'item', 'melee basic attacks only']] },
  { n: 'Iron Armbands of Power', slot: 'Arms', lvl: 6, desc: 'Property: +2 item bonus to damage rolls with melee attacks.', m: [['dmg.melee', 2, 'item']] },
  { n: 'Bag of Holding', slot: 'Wondrous', lvl: 5, wt: 1, desc: 'Holds up to 200 pounds of gear but always weighs 1 pound. Retrieving an item from it is a minor action.' },
  { n: 'Potion of Healing', slot: 'Consumable', lvl: 5, price: 50, consumable: true,
    desc: 'Drink as a minor action: you spend a healing surge but regain 10 hit points instead of your healing surge value.' },
  { n: 'Potion of Vitality', slot: 'Consumable', lvl: 15, price: 1000, consumable: true,
    desc: 'Drink as a minor action: you spend a healing surge but regain 25 hit points instead of your healing surge value. See the full text for more.' },
  { n: 'Potion of Recovery', slot: 'Consumable', lvl: 25, price: 25000, consumable: true,
    desc: 'Drink as a minor action: you spend a healing surge but regain 50 hit points instead of your healing surge value. See the full text for more.' },
]);

D4.SLOTS = ['Armor', 'Main hand', 'Off hand', 'Neck', 'Arms', 'Feet', 'Hands', 'Head', 'Waist', 'Ring', 'Wondrous', 'Consumable'];

/* Market price of a magic item from its enhancement bonus. */
D4.magicLevel = (it, plus) => it.levels ? it.levels[Math.max(1, Math.min(6, plus)) - 1] : it.lvl;
D4.magicPrice = (it, plus) => it.price != null && !it.levels ? it.price : D4.ITEM_PRICE[D4.magicLevel(it, plus)] || 0;
