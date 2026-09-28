/* Paragon paths and epic destinies from the Player's Handbook.
   Only a short concept is given here; add the features and powers from the full text
   (the builder lets you paste them in, and adds slots for the path's powers). */
'use strict';

[
  ['Angelic Avenger', 'cleric', 'A warrior-priest who fights with the fury of an angel.'],
  ['Divine Oracle', 'cleric', 'A seer who glimpses the future and warns allies of danger.'],
  ['Radiant Servant', 'cleric', 'A healer who channels the gods\' healing light.'],
  ['Warpriest', 'cleric', 'A battle priest who leads from the front line.'],
  ['Iron Vanguard', 'fighter', 'A fighter who drives enemies back and knocks them down.'],
  ['Kensei', 'fighter', 'A master of one chosen weapon.'],
  ['Pit Fighter', 'fighter', 'A brutal arena fighter who fights dirty.'],
  ['Swordmaster', 'fighter', 'A master of the blade who shifts between fighting styles.'],
  ['Astral Weapon', 'paladin', 'A paladin who punishes enemies that ignore the challenge.'],
  ['Champion of Order', 'paladin', 'A defender of law who holds the line.'],
  ['Hospitaler', 'paladin', 'A paladin devoted to healing and protecting allies.'],
  ['Justiciar', 'paladin', 'A crusader who brings the wicked to justice.'],
  ['Battlefield Archer', 'ranger', 'An archer who picks out targets across the battlefield.'],
  ['Beast Stalker', 'ranger', 'A hunter of monsters.'],
  ['Pathfinder', 'ranger', 'A skirmisher at home in the wild.'],
  ['Stormwarden', 'ranger', 'A two-blade fighter who strikes like a storm.'],
  ['Cat Burglar', 'rogue', 'An agile thief who climbs and leaps where others can\'t.'],
  ['Daggermaster', 'rogue', 'A master of the dagger with deadlier critical hits.'],
  ['Master Infiltrator', 'rogue', 'A spy who slips past any defense.'],
  ['Shadow Assassin', 'rogue', 'A killer who strikes from the shadows.'],
  ['Doomsayer', 'warlock', 'A prophet of doom who spreads fear.'],
  ['Feytouched', 'warlock', 'A warlock steeped in fey trickery.'],
  ['Life-Stealer', 'warlock', 'A warlock who drains the life of enemies.'],
  ['Battle Captain', 'warlord', 'A commander who leads the charge.'],
  ['Combat Veteran', 'warlord', 'A hardened soldier who keeps fighting through anything.'],
  ['Knight Commander', 'warlord', 'A leader who inspires allies to stand firm.'],
  ['Sword Marshal', 'warlord', 'A tactical duelist who directs allies\' blades.'],
  ['Battle Mage', 'wizard', 'A wizard who mixes spells and melee.'],
  ['Blood Mage', 'wizard', 'A wizard who spends life for power.'],
  ['Spellstorm Mage', 'wizard', 'A master of elemental storms.'],
  ['Wizard of the Spiral Tower', 'wizard', 'A wizard who fights with a longsword and arcane grace.'],
].forEach(([n, cls, s]) => { D4.paths[n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-')] = { n, cls, s }; });

[
  ['Archmage', 'The greatest of wizards, master of arcane secrets.'],
  ['Deadly Trickster', 'A legendary trickster whose luck shapes fate.'],
  ['Demigod', 'You ascend toward godhood.'],
  ['Eternal Seeker', 'A seeker who draws on the powers of many paths.'],
].forEach(([n, s]) => { D4.destinies[n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-')] = { n, s }; });
