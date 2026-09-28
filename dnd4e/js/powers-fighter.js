/* Fighter powers (Player's Handbook), heroic tier. Summaries written for this app.
   Field guide (shared by every power file):
   n name, l level, u usage (aw at-will, enc encounter, day daily), ty (atk attack, util utility),
   k keywords, a action, r range, req requirement, trig trigger, t target, atk attack roll,
   hit / miss / eff text, more extra [label, text] lines, sus sustain, spec special, l21 level 21 upgrade,
   s one-line summary, x numbers for the calculator ("ability/defense/damage"; m: melee weapon, r: ranged weapon).
   An entry with only a summary (no attack or effect lines) links to the full text for the exact wording. */
'use strict';

D4.addPowers([
  /* At-will 1 */
  { n: 'Cleave', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage, and an enemy adjacent to you other than the target takes damage equal to your Strength modifier.',
    l21: '2[W] + Strength modifier damage.', s: 'Hit one enemy and deal your Strength modifier in damage to another adjacent enemy.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Reaping Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage.',
    miss: 'Half your Strength modifier in damage. If you are wielding a two-handed weapon, you deal damage equal to your Strength modifier.',
    l21: '2[W] + Strength modifier damage.', s: 'Deals some damage even when it misses.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Sure Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength + 2 vs. AC', hit: '1[W] damage.', l21: '2[W] damage.', s: 'An accurate attack (+2) that deals less damage.', x: 'str+2/AC/1W', x21: '2W' },
  { n: 'Tide of Iron', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', req: 'You must be using a shield.',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage, and you can push the target 1 square if it is your size, smaller than you, or one size larger. You can shift into the space the target left.',
    l21: '2[W] + Strength modifier damage.', s: 'Shield bash that pushes the enemy back and lets you follow.', x: 'str/AC/1W+str', x21: '2W+str' },

  /* Encounter 1 */
  { n: 'Covering Attack', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and an ally adjacent to the target can shift 2 squares.',
    s: 'Hit hard and let an ally slip away.', x: 'str/AC/2W+str' },
  { n: 'Passing Attack', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature (primary target)',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage.',
    eff: 'You can shift 1 square and make a secondary attack against a different creature: Strength + 2 vs. AC; on a hit, 1[W] + Strength modifier damage.',
    s: 'Strike one enemy, shift and strike another at +2.', x: 'str/AC/1W+str' },
  { n: 'Spinning Sweep', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage, and you knock the target prone.',
    s: 'Knock an enemy prone.', x: 'str/AC/1W+str' },
  { n: 'Steel Serpent Strike', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and the target is slowed and can\'t shift until the end of your next turn.',
    s: 'Hit hard and pin the enemy in place.', x: 'str/AC/2W+str' },

  /* Daily 1 */
  { n: 'Brute Strike', l: 1, u: 'day', k: 'Martial, Reliable, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '3[W] + Strength modifier damage.', s: 'A huge blow. Reliable: not used up if it misses.', x: 'str/AC/3W+str' },
  { n: 'Comeback Strike', l: 1, u: 'day', k: 'Healing, Martial, Reliable, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and you can spend a healing surge.',
    s: 'Hit and heal yourself. Reliable: not used up if it misses.', x: 'str/AC/2W+str' },
  { n: 'Villain\'s Menace', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and you gain a +2 power bonus to attack rolls and a +4 power bonus to damage rolls against the target until the end of the encounter.',
    miss: 'You gain a +1 power bonus to attack rolls and a +2 power bonus to damage rolls against the target until the end of the encounter.',
    s: 'Declare a nemesis: bonuses to hit and damage it for the whole fight.', x: 'str/AC/2W+str' },

  /* Utility 2 */
  { n: 'Boundless Endurance', l: 2, u: 'day', ty: 'util', k: 'Healing, Martial, Stance', a: 'minor', r: 'Personal',
    eff: 'Until the stance ends, you gain regeneration 2 + your Constitution modifier while you are bloodied.', s: 'Stance: regenerate while bloodied.' },
  { n: 'Get Over Here', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'move', r: 'Melee 1', t: 'One willing adjacent ally',
    eff: 'You slide the target 2 squares to a square adjacent to you.', s: 'Pull an ally out of trouble to your other side.' },
  { n: 'No Opening', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'int', r: 'Personal', trig: 'An enemy makes an attack roll against you while it has combat advantage.',
    eff: 'Cancel the combat advantage for that attack.', s: 'Deny an attacker its combat advantage.' },
  { n: 'Unstoppable', l: 2, u: 'day', ty: 'util', k: 'Healing, Martial', a: 'minor', r: 'Personal',
    eff: 'You gain temporary hit points equal to 2d6 + your Constitution modifier.', s: 'Gain temporary hit points.' },

  /* Encounter 3 */
  { n: 'Armor-Piercing Thrust', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. Reflex', hit: '1[W] + Strength modifier damage. Weapon: if you are wielding a light blade or a spear, add your Dexterity modifier to the damage.',
    s: 'Attack Reflex instead of AC; extra damage with light blades and spears.', x: 'str/Ref/1W+str' },
  { n: 'Crushing Blow', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage. Weapon: if you are wielding an axe, hammer or mace, add your Constitution modifier to the damage.',
    s: 'Heavy blow; extra damage with axes, hammers and maces.', x: 'str/AC/2W+str' },
  { n: 'Dance of Steel', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage. Weapon: if you are wielding a polearm or a heavy blade, the target is also slowed until the end of your next turn.',
    s: 'Heavy blow; slows with polearms and heavy blades.', x: 'str/AC/2W+str' },
  { n: 'Precise Strike', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength + 4 vs. AC', hit: '1[W] + Strength modifier damage.', s: 'A very accurate attack (+4).', x: 'str+4/AC/1W+str' },
  { n: 'Rain of Blows', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One or two creatures',
    atk: 'Strength vs. AC, two attacks', hit: '1[W] + Strength modifier damage per attack.',
    spec: 'If you are wielding a light blade, spear or flail and have Dexterity 15 or higher, you can make a third attack.',
    s: 'Two quick attacks, three with a light blade, spear or flail and good Dexterity.', x: 'str/AC/1W+str' },
  { n: 'Sweeping Blow', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Close burst 1', t: 'Each enemy in the burst you can see',
    atk: 'Strength vs. AC. Weapon: if you are wielding an axe, flail, heavy blade or pick, you gain a bonus to the attack rolls equal to one-half your Strength modifier.',
    hit: '1[W] + Strength modifier damage.', s: 'Attack every adjacent enemy.', x: 'str/AC/1W+str' },

  /* Daily 5 */
  { n: 'Crack the Shell', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    s: 'A heavy blow that leaves the enemy bleeding (ongoing damage) and easier to hit (AC penalty) until it saves.' },
  { n: 'Dizzying Blow', l: 5, u: 'day', k: 'Martial, Reliable, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '3[W] + Strength modifier damage, and the target is immobilized (save ends).',
    s: 'A huge blow that roots the enemy in place. Reliable.', x: 'str/AC/3W+str' },
  { n: 'Rain of Steel', l: 5, u: 'day', k: 'Martial, Stance, Weapon', a: 'minor', r: 'Personal',
    eff: 'Until the stance ends, any enemy that starts its turn adjacent to you takes 1[W] damage, as long as you are able to make opportunity attacks.',
    s: 'Stance: every enemy that starts its turn next to you takes weapon damage.' },

  /* Utility 6 */
  { n: 'Battle Awareness', l: 6, u: 'day', ty: 'util', k: 'Martial', s: 'Helps you react to enemies at the start of a fight. See the full text.' },
  { n: 'Defensive Training', l: 6, u: 'day', ty: 'util', k: 'Martial, Stance', a: 'minor', r: 'Personal',
    eff: 'Until the stance ends, you gain a +2 power bonus to Fortitude, Reflex and Will.', s: 'Stance: +2 to Fortitude, Reflex and Will.' },
  { n: 'Unbreakable', l: 6, u: 'enc', ty: 'util', k: 'Martial', a: 'rea', r: 'Personal', trig: 'You are hit by an attack.',
    eff: 'Reduce the damage from the attack by 5 + your Constitution modifier.', s: 'Shrug off part of a hit.' },

  /* Encounter 7 */
  { n: 'Come and Get It', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Close burst 3', t: 'Each enemy in the burst you can see',
    s: 'Draw nearby enemies in around you, then attack each enemy that ends up adjacent.' },
  { n: 'Iron Bulwark', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Attack and raise your defenses.' },
  { n: 'Reckless Strike', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength - 2 vs. AC', hit: '3[W] + Strength modifier damage.', s: 'Trade accuracy (-2) for a huge hit.', x: 'str-2/AC/3W+str' },
  { n: 'Sudden Surge', l: 7, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Surge forward to attack.' },

  /* Daily 9 */
  { n: 'Shift the Battlefield', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Close burst 1', t: 'Each enemy in the burst you can see',
    s: 'Attack every adjacent enemy and reposition the ones you hit.' },
  { n: 'Thicket of Blades', l: 9, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Close burst 1', t: 'Each enemy in the burst you can see',
    s: 'Attack every adjacent enemy and slow the ones you hit.' },
  { n: 'Victorious Surge', l: 9, u: 'day', k: 'Healing, Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '3[W] + Strength modifier damage, and you regain hit points as if you had spent a healing surge.',
    s: 'A huge blow that also heals you.', x: 'str/AC/3W+str' },

  /* Utility 10 */
  { n: 'Into the Fray', l: 10, u: 'enc', ty: 'util', k: 'Martial', s: 'Move quickly to engage enemies. See the full text.' },
  { n: 'Last Ditch Evasion', l: 10, u: 'day', ty: 'util', k: 'Martial', s: 'Get out of the way of an attack at the last moment. See the full text.' },
  { n: 'Stalwart Guard', l: 10, u: 'day', ty: 'util', k: 'Martial', s: 'Protect adjacent allies with a defense bonus. See the full text.' },
], { cls: 'fighter', src: 'class', ty: 'atk' });
