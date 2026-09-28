/* Rogue powers (Player's Handbook), heroic tier. Summaries written for this app.
   Most rogue attack powers need a light blade (melee), or a crossbow or sling (ranged). */
'use strict';

const ROGUE_WEAPON = 'You must be wielding a light blade, a crossbow or a sling.';
const ROGUE_BLADE = 'You must be wielding a light blade.';

D4.addPowers([
  /* At-will 1 */
  { n: 'Deft Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', req: ROGUE_WEAPON,
    eff: 'Before the attack, you can move 2 squares.', atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier damage.',
    l21: '2[W] + Dexterity modifier damage.', s: 'Move 2 squares and attack, great for getting flanking.', x: ['m:dex/AC/1W+dex', 'r:dex/AC/1W+dex'], x21: '2W+dex' },
  { n: 'Piercing Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. Reflex', hit: '1[W] + Dexterity modifier damage.', l21: '2[W] + Dexterity modifier damage.',
    s: 'Attack Reflex instead of AC.', x: 'dex/Ref/1W+dex', x21: '2W+dex' },
  { n: 'Riposte Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier damage. If the target attacks you before the start of your next turn, you make a riposte against it as an immediate interrupt: Strength vs. AC; 1[W] + Strength modifier damage.',
    l21: '2[W] + Dexterity modifier damage, and the riposte deals 2[W] + Strength modifier damage.', s: 'Hit, and strike back if the enemy attacks you.', x: 'dex/AC/1W+dex', x21: '2W+dex' },
  { n: 'Sly Flourish', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', req: ROGUE_WEAPON,
    atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier + Charisma modifier damage.', l21: '2[W] + Dexterity modifier + Charisma modifier damage.',
    s: 'Adds your Charisma modifier to damage.', x: ['m:dex/AC/1W+dex+cha', 'r:dex/AC/1W+dex+cha'], x21: '2W+dex+cha' },

  /* Encounter 1 */
  { n: 'Dazing Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier damage, and the target is dazed until the end of your next turn.',
    s: 'Daze an enemy (it grants combat advantage).', x: 'dex/AC/1W+dex' },
  { n: 'King\'s Castle', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', req: ROGUE_WEAPON,
    s: 'Attack and swap places with an adjacent ally.' },
  { n: 'Positioning Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. Will', hit: '1[W] + Dexterity modifier damage, and you slide the target 1 square. Artful Dodger: you slide the target a number of squares equal to 1 + your Charisma modifier.',
    s: 'Hit and move the enemy where you want it.', x: 'dex/Will/1W+dex' },
  { n: 'Torturous Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. AC', hit: '2[W] + Dexterity modifier damage. Brutal Scoundrel: add your Strength modifier to the damage.',
    s: 'A big damaging stab.', x: 'dex/AC/2W+dex' },

  /* Daily 1 */
  { n: 'Blinding Barrage', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Close blast 3', t: 'Each enemy in the blast you can see', req: 'You must be wielding a light thrown weapon, such as daggers or shuriken.',
    atk: 'Dexterity vs. AC', hit: '2[W] + Dexterity modifier damage, and the target is blinded until the end of your next turn.', miss: 'Half damage.',
    s: 'Throw a spray of blades that blinds nearby enemies.', x: 'dex/AC/2W+dex' },
  { n: 'Easy Target', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', req: ROGUE_WEAPON,
    atk: 'Dexterity vs. AC', hit: '2[W] + Dexterity modifier damage, and the target is slowed and grants combat advantage to you (save ends both).',
    miss: 'Half damage, and the target grants combat advantage to you until the end of your next turn.',
    s: 'Slow an enemy and keep combat advantage against it until it saves.', x: ['m:dex/AC/2W+dex', 'r:dex/AC/2W+dex'] },
  { n: 'Trick Strike', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', req: ROGUE_WEAPON,
    atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier damage, and you slide the target 1 square.',
    eff: 'Until the end of the encounter, each time you hit the target you can slide it 1 square.', s: 'Push an enemy around for the whole fight.', x: ['m:dex/AC/1W+dex', 'r:dex/AC/1W+dex'] },

  /* Utility 2 */
  { n: 'Fleeting Ghost', l: 2, u: 'aw', ty: 'util', k: 'Martial', a: 'move', r: 'Personal',
    eff: 'You can move your speed and make a Stealth check. You don\'t take the -5 penalty to Stealth for moving more than 2 squares.', s: 'Sneak at full speed.' },
  { n: 'Great Leap', l: 2, u: 'aw', ty: 'util', k: 'Martial', a: 'move', r: 'Personal', s: 'Make a long or high jump as if you had a running start.' },
  { n: 'Master of Deceit', l: 2, u: 'day', ty: 'util', k: 'Martial', s: 'Improve a Bluff check that went badly. See the full text.' },
  { n: 'Quick Fingers', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'minor', r: 'Personal', eff: 'Make a Thievery check to pick a pocket or perform sleight of hand.', s: 'Pick a pocket as a minor action.' },
  { n: 'Tumble', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'move', r: 'Personal', eff: 'You shift a number of squares equal to one-half your speed.', s: 'Shift several squares.' },

  /* Encounter 3 */
  { n: 'Bait and Switch', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    s: 'Attack, trade places with the enemy and slip away.' },
  { n: 'Setup Strike', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. AC', hit: '2[W] + Dexterity modifier damage, and the target grants combat advantage to you until the end of your next turn.',
    s: 'Hit hard and set up your next Sneak Attack.', x: 'dex/AC/2W+dex' },
  { n: 'Topple Over', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Knock an enemy prone.' },
  { n: 'Trickster\'s Blade', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE,
    atk: 'Dexterity vs. AC', hit: '2[W] + Dexterity modifier damage, and you gain a bonus to AC equal to your Charisma modifier until the start of your next turn.',
    s: 'Hit hard and become harder to hit.', x: 'dex/AC/2W+dex' },

  /* Daily 5 */
  { n: 'Clever Riposte', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Attack, then punish enemies that attack you.' },
  { n: 'Deep Cut', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'A wound that keeps bleeding (ongoing damage).' },
  { n: 'Walking Wounded', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Cripple an enemy\'s movement.' },

  /* Utility 6 */
  { n: 'Chameleon', l: 6, u: 'aw', ty: 'util', k: 'Martial', s: 'Hide in plain sight. See the full text.' },
  { n: 'Ignoble Escape', l: 6, u: 'enc', ty: 'util', k: 'Martial', s: 'Slip away from enemies. See the full text.' },
  { n: 'Mob Mentality', l: 6, u: 'enc', ty: 'util', k: 'Martial', s: 'Help allies intimidate or persuade. See the full text.' },
  { n: 'Nimble Climb', l: 6, u: 'aw', ty: 'util', k: 'Martial', s: 'Climb at your full speed. See the full text.' },
  { n: 'Slippery Mind', l: 6, u: 'enc', ty: 'util', k: 'Martial', s: 'Resist mind-affecting attacks. See the full text.' },

  /* Encounter 7 */
  { n: 'Cloud of Steel', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Close blast 5', t: 'Each enemy in the blast you can see', s: 'Throw a storm of light blades at every enemy in front of you.' },
  { n: 'Imperiling Strike', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Hit and lower the target\'s defenses.' },
  { n: 'Rogue\'s Luck', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Attack, with a second chance if you miss.' },
  { n: 'Sand in the Eyes', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Blind an enemy.' },

  /* Daily 9 */
  { n: 'Crimson Edge', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'A vicious wound with lasting damage.' },
  { n: 'Deadly Positioning', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Maneuver an enemy into a bad spot.' },
  { n: 'Knockout', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: ROGUE_BLADE, s: 'Knock an enemy unconscious.' },

  /* Utility 10 */
  { n: 'Certain Freedom', l: 10, u: 'day', ty: 'util', k: 'Martial', s: 'Escape from being held. See the full text.' },
  { n: 'Close Quarters', l: 10, u: 'enc', ty: 'util', k: 'Martial', s: 'Fight up close with a bigger enemy. See the full text.' },
  { n: 'Dangerous Theft', l: 10, u: 'enc', ty: 'util', k: 'Martial', s: 'Steal an item in the middle of a fight. See the full text.' },
  { n: 'Shadow Stride', l: 10, u: 'aw', ty: 'util', k: 'Martial', s: 'Move while staying hidden. See the full text.' },
], { cls: 'rogue', src: 'class', ty: 'atk' });
