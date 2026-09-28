/* Ranger powers (Player's Handbook), heroic tier. Summaries written for this app.
   Ranger attacks use Strength with melee weapons and Dexterity with ranged weapons. */
'use strict';

const TWO_MELEE = 'You must be wielding two melee weapons.';
const TWO_OR_RANGED = 'You must be wielding two melee weapons or a ranged weapon.';

D4.addPowers([
  /* At-will 1 */
  { n: 'Careful Attack', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature',
    atk: 'Strength + 2 vs. AC (melee) or Dexterity + 2 vs. AC (ranged)', hit: '1[W] damage.', l21: '2[W] damage.',
    s: 'An accurate attack (+2) with no ability modifier to damage.', x: ['m:str+2/AC/1W', 'r:dex+2/AC/1W'], x21: '2W' },
  { n: 'Hit and Run', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage. If you move after this attack, the first square you leave doesn\'t provoke an opportunity attack from the target.',
    l21: '2[W] + Strength modifier damage.', s: 'Hit and step away safely.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Nimble Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Ranged weapon', t: 'One creature',
    eff: 'You can shift 1 square before or after the attack.', atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier damage.',
    l21: '2[W] + Dexterity modifier damage.', s: 'Shift and shoot, without provoking.', x: 'dex/AC/1W+dex', x21: '2W+dex' },
  { n: 'Twin Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One or two creatures', req: TWO_OR_RANGED,
    atk: 'Strength vs. AC (melee; main weapon and off-hand weapon) or Dexterity vs. AC (ranged), two attacks', hit: '1[W] damage per attack.',
    l21: '2[W] damage per attack.', s: 'Two attacks each turn, the ranger\'s signature power. Great with Hunter\'s Quarry.', x: ['m:str/AC/1W', 'r:dex/AC/1W'], x21: '2W' },

  /* Encounter 1 */
  { n: 'Dire Wolverine Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Close burst 1', t: 'Each enemy adjacent to you', req: TWO_MELEE,
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage.', s: 'Attack every adjacent enemy.', x: 'str/AC/1W+str' },
  { n: 'Evasive Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature',
    eff: 'You can shift a number of squares equal to 1 + your Wisdom modifier, either before or after the attack.',
    atk: 'Strength vs. AC (melee) or Dexterity vs. AC (ranged)', hit: '2[W] + Strength modifier damage (melee) or 2[W] + Dexterity modifier damage (ranged).',
    s: 'Shift several squares and hit hard.', x: ['m:str/AC/2W+str', 'r:dex/AC/2W+dex'] },
  { n: 'Fox\'s Cunning', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'rea', r: 'Melee or Ranged weapon', trig: 'An enemy makes a melee attack against you.', t: 'The triggering enemy',
    eff: 'You shift 1 square, then make a basic attack against the target.', s: 'When attacked, step aside and strike back.' },
  { n: 'Two-Fanged Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', req: TWO_OR_RANGED,
    atk: 'Strength vs. AC (melee; main weapon and off-hand weapon) or Dexterity vs. AC (ranged), two attacks',
    hit: '1[W] + Strength modifier damage (melee) or 1[W] + Dexterity modifier damage (ranged) per attack. If both attacks hit, you deal extra damage equal to your Wisdom modifier.',
    s: 'Two attacks on one enemy, with a bonus if both hit.', x: ['m:str/AC/1W+str', 'r:dex/AC/1W+dex'] },

  /* Daily 1 */
  { n: 'Hunter\'s Bear Trap', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature',
    atk: 'Strength vs. AC (melee) or Dexterity vs. AC (ranged)', hit: '2[W] + Strength or Dexterity modifier damage, and the target is slowed and takes ongoing 5 damage (save ends both).',
    miss: 'Half damage, and the target is slowed (save ends).', s: 'Cripple an enemy: slowed and bleeding until it saves.', x: ['m:str/AC/2W+str', 'r:dex/AC/2W+dex'] },
  { n: 'Jaws of the Wolf', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: TWO_MELEE,
    atk: 'Strength vs. AC, two attacks (main weapon and off-hand weapon)', hit: '2[W] + Strength modifier damage per attack.', miss: 'Half damage per attack.',
    s: 'Two big attacks with both weapons.', x: 'str/AC/2W+str' },
  { n: 'Split the Tree', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Ranged weapon', t: 'Two creatures within 3 squares of each other',
    atk: 'Dexterity vs. AC. Make two attack rolls, take the higher result, and apply it to both targets.', hit: '2[W] + Dexterity modifier damage.',
    s: 'One arrow that splits to hit two enemies, rolling twice.', x: 'dex/AC/2W+dex' },
  { n: 'Sudden Strike', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: TWO_MELEE,
    s: 'A quick strike with each weapon; the first slows the enemy for the second.' },

  /* Utility 2 */
  { n: 'Crucial Advice', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'rea', r: 'Close burst 5', trig: 'An ally within 5 squares of you makes a check with a skill you are trained in.',
    eff: 'The ally rerolls the check with a bonus equal to your Wisdom modifier.', s: 'Help an ally reroll a skill check you know well.' },
  { n: 'Unbalancing Parry', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'rea', r: 'Melee 1', trig: 'An enemy misses you with a melee attack.',
    s: 'When an enemy misses you, pull it off balance: slide it next to you and gain combat advantage against it.' },
  { n: 'Yield Ground', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'rea', r: 'Personal', trig: 'An enemy damages you with a melee attack.',
    eff: 'You shift a number of squares equal to your Wisdom modifier. You gain a +2 power bonus to all defenses until the end of your next turn.',
    s: 'When hit, step back and gain +2 to defenses.' },

  /* Encounter 3 */
  { n: 'Cut and Run', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One or two creatures', req: TWO_OR_RANGED,
    s: 'Two attacks, then shift away several squares.' },
  { n: 'Disruptive Strike', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'int', r: 'Melee or Ranged weapon', trig: 'An enemy attacks you or an ally.', t: 'The attacking enemy',
    s: 'Interrupt an enemy\'s attack: hit it and give it a penalty to that attack roll.' },
  { n: 'Shadow Wasp Strike', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'Your quarry',
    atk: 'Strength vs. Reflex (melee) or Dexterity vs. Reflex (ranged)', hit: '2[W] + Strength or Dexterity modifier damage.',
    s: 'An accurate strike against your quarry that targets Reflex.', x: ['m:str/Ref/2W+str', 'r:dex/Ref/2W+dex'] },
  { n: 'Thundertusk Boar Strike', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One or two creatures', req: TWO_OR_RANGED,
    s: 'Two attacks that push the targets back.' },

  /* Daily 5 */
  { n: 'Excruciating Shot', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Ranged weapon', t: 'One creature', s: 'A painful shot that weakens the target.' },
  { n: 'Frenzied Skirmish', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One or two creatures', req: TWO_MELEE, s: 'Dart between enemies, attacking with both weapons.' },
  { n: 'Splintering Shot', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Ranged weapon', t: 'One creature', s: 'A shot that hinders the target\'s attacks.' },
  { n: 'Two-Wolf Pounce', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: TWO_MELEE, s: 'Two heavy attacks on one enemy.' },

  /* Utility 6 */
  { n: 'Evade Ambush', l: 6, u: 'day', ty: 'util', k: 'Martial', s: 'Keep your allies from being caught off guard. See the full text.' },
  { n: 'Skilled Companion', l: 6, u: 'day', ty: 'util', k: 'Martial', s: 'Lend your skill to an ally\'s check. See the full text.' },
  { n: 'Weave through the Fray', l: 6, u: 'enc', ty: 'util', k: 'Martial', s: 'Move through the battle at the start of a round. See the full text.' },

  /* Encounter 7 */
  { n: 'Claws of the Griffon', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One or two creatures', req: TWO_MELEE, s: 'Two strikes that add your Wisdom to the damage.' },
  { n: 'Hawk\'s Talon', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One creature', s: 'A very accurate attack that ignores cover and concealment.' },
  { n: 'Spikes of the Manticore', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Ranged weapon', t: 'One or two creatures', s: 'Two quick shots, the second at another target.' },
  { n: 'Sweeping Whirlwind', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Close burst 1', t: 'Each enemy in the burst you can see', req: TWO_MELEE, s: 'Spin and attack every adjacent enemy, pushing them away.' },

  /* Daily 9 */
  { n: 'Attacks on the Run', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee or Ranged weapon', t: 'One or two creatures', s: 'Move and attack two enemies.' },
  { n: 'Close Quarters Shot', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Ranged weapon', t: 'One creature', s: 'Shoot an adjacent enemy without provoking.' },
  { n: 'Spray of Arrows', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Close blast 3', t: 'Each enemy in the blast you can see', s: 'Fire a volley at every enemy in front of you.' },
  { n: 'Swirling Leaves of Steel', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Close burst 1', t: 'Each enemy in the burst you can see', req: TWO_MELEE, s: 'Attack every adjacent enemy with both weapons.' },

  /* Utility 10 */
  { n: 'Expeditious Stride', l: 10, u: 'enc', ty: 'util', k: 'Martial', s: 'Move quickly. See the full text.' },
  { n: 'Open the Range', l: 10, u: 'enc', ty: 'util', k: 'Martial', s: 'Get out of melee to use your bow. See the full text.' },
  { n: 'Undaunted Stride', l: 10, u: 'day', ty: 'util', k: 'Martial', s: 'Ignore difficult terrain. See the full text.' },
], { cls: 'ranger', src: 'class', ty: 'atk' });
