/* Paladin powers (Player's Handbook), heroic tier. Summaries written for this app. */
'use strict';

D4.addPowers([
  /* At-will 1 */
  { n: 'Bolstering Strike', l: 1, u: 'aw', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Charisma vs. AC', hit: '1[W] + Charisma modifier damage, and you gain temporary hit points equal to your Wisdom modifier.',
    l21: '2[W] + Charisma modifier damage.', s: 'Hit and gain temporary hit points.', x: 'cha/AC/1W+cha', x21: '2W+cha' },
  { n: 'Enfeebling Strike', l: 1, u: 'aw', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Charisma vs. AC', hit: '1[W] + Charisma modifier damage. If you marked the target, it takes a -2 penalty to attack rolls until the end of your next turn.',
    l21: '2[W] + Charisma modifier damage.', s: 'Hit and weaken the attacks of an enemy you marked.', x: 'cha/AC/1W+cha', x21: '2W+cha' },
  { n: 'Holy Strike', l: 1, u: 'aw', k: 'Divine, Radiant, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier radiant damage. If you marked the target, you gain a bonus to the damage roll equal to your Wisdom modifier.',
    l21: '2[W] + Strength modifier radiant damage.', s: 'Radiant strike with extra damage against your marked enemy.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Valiant Strike', l: 1, u: 'aw', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC. You gain a +1 bonus to the attack roll for each enemy adjacent to you.', hit: '1[W] + Strength modifier damage.',
    l21: '2[W] + Strength modifier damage.', s: 'More accurate the more enemies surround you.', x: 'str/AC/1W+str', x21: '2W+str' },

  /* Encounter 1 */
  { n: 'Fearsome Smite', l: 1, u: 'enc', k: 'Divine, Fear, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Charisma vs. AC', hit: '2[W] + Charisma modifier damage, and the target takes a penalty to attack rolls equal to your Wisdom modifier until the end of your next turn.',
    s: 'Hit hard and shake the enemy\'s aim.', x: 'cha/AC/2W+cha' },
  { n: 'Piercing Smite', l: 1, u: 'enc', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. Reflex', hit: '2[W] + Strength modifier damage, and the target and a number of enemies within 3 squares of you equal to your Wisdom modifier are marked until the end of your next turn.',
    s: 'Hit hard and mark several enemies at once.', x: 'str/Ref/2W+str' },
  { n: 'Radiant Smite', l: 1, u: 'enc', k: 'Divine, Radiant, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier + Wisdom modifier radiant damage.', s: 'A heavy radiant blow.', x: 'str/AC/2W+str+wis' },
  { n: 'Shielding Smite', l: 1, u: 'enc', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Charisma vs. AC', hit: '2[W] + Charisma modifier damage.',
    eff: 'Until the end of your next turn, one ally within 5 squares of you gains a power bonus to AC equal to your Wisdom modifier.',
    s: 'Hit hard and protect an ally.', x: 'cha/AC/2W+cha' },

  /* Daily 1 */
  { n: 'On Pain of Death', l: 1, u: 'day', k: 'Divine, Implement', a: 'std', r: 'Ranged 5', t: 'One creature',
    s: 'Lay a curse on an enemy that hurts it every time it attacks, for the rest of the encounter.' },
  { n: 'Paladin\'s Judgment', l: 1, u: 'day', k: 'Divine, Healing, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '3[W] + Strength modifier damage, and one ally within 5 squares of you can spend a healing surge.',
    miss: 'One ally within 5 squares of you can spend a healing surge.', s: 'A huge blow that also heals an ally, hit or miss.', x: 'str/AC/3W+str' },
  { n: 'Radiant Delirium', l: 1, u: 'day', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 5', t: 'One creature',
    atk: 'Charisma vs. Reflex', hit: '3d8 + Charisma modifier radiant damage, and the target is dazed (save ends).',
    miss: 'Half damage, and the target is dazed until the end of your next turn.', s: 'Blinding holy light that dazes a distant enemy.', x: 'cha/Ref/3d8+cha' },

  /* Utility 2 */
  { n: 'Astral Speech', l: 2, u: 'day', ty: 'util', k: 'Divine', a: 'minor', r: 'Personal', s: 'Speak with divine authority: a big bonus to Diplomacy for the encounter.' },
  { n: 'Martyr\'s Blessing', l: 2, u: 'enc', ty: 'util', k: 'Divine', a: 'int', r: 'Close burst 1', trig: 'An adjacent ally is hit by a melee or ranged attack.',
    eff: 'You are hit by the attack instead of the ally.', s: 'Take a hit meant for an adjacent ally.' },
  { n: 'Sacred Circle', l: 2, u: 'day', ty: 'util', k: 'Divine, Implement, Zone', a: 'std', r: 'Close burst 3', s: 'Create a holy zone that protects allies inside it.' },

  /* Encounter 3 */
  { n: 'Arcing Smite', l: 3, u: 'enc', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One or two creatures', s: 'A sweeping strike that can hit two enemies and mark them.' },
  { n: 'Invigorating Smite', l: 3, u: 'enc', k: 'Divine, Healing, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit and heal yourself if the target is bloodied.' },
  { n: 'Righteous Smite', l: 3, u: 'enc', k: 'Divine, Healing, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Charisma vs. AC', hit: '2[W] + Charisma modifier damage.',
    eff: 'You and each ally within 5 squares of you gain temporary hit points equal to your Wisdom modifier.', s: 'Hit hard and give everyone nearby temporary hit points.', x: 'cha/AC/2W+cha' },
  { n: 'Staggering Smite', l: 3, u: 'enc', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and you push the target a number of squares equal to your Wisdom modifier.',
    s: 'Hit hard and push the enemy back.', x: 'str/AC/2W+str' },

  /* Daily 5 */
  { n: 'Hallowed Circle', l: 5, u: 'day', k: 'Divine, Implement, Zone', a: 'std', r: 'Close burst 3', s: 'A holy zone that damages enemies and shields allies.' },
  { n: 'Martyr\'s Retribution', l: 5, u: 'day', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'A strike that grows stronger the more you are hurt.' },
  { n: 'Sign of Vulnerability', l: 5, u: 'day', k: 'Divine, Radiant, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit and leave the enemy vulnerable to radiant damage.' },

  /* Utility 6 */
  { n: 'Divine Bodyguard', l: 6, u: 'day', ty: 'util', k: 'Divine', s: 'Guard an ally, taking attacks aimed at them. See the full text.' },
  { n: 'One Heart, One Mind', l: 6, u: 'day', ty: 'util', k: 'Divine', s: 'Share your resolve with allies against mind-affecting attacks. See the full text.' },
  { n: 'Wrath of the Gods', l: 6, u: 'day', ty: 'util', k: 'Divine', a: 'minor', r: 'Close burst 1', s: 'You and nearby allies deal extra damage for the encounter.' },

  /* Encounter 7 */
  { n: 'Beckon Foe', l: 7, u: 'enc', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', s: 'Pull an enemy to you and mark it.' },
  { n: 'Benign Transposition', l: 7, u: 'enc', k: 'Divine, Teleportation, Weapon', a: 'std', r: 'Melee weapon', s: 'Attack and swap places with an ally.' },
  { n: 'Divine Reverence', l: 7, u: 'enc', k: 'Divine, Implement, Radiant', a: 'std', r: 'Close burst 1', s: 'Radiant power that awes every adjacent enemy.' },
  { n: 'Thunder Smite', l: 7, u: 'enc', k: 'Divine, Thunder, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'A thunderous blow that knocks the enemy prone.' },

  /* Daily 9 */
  { n: 'Crown of Glory', l: 9, u: 'day', k: 'Divine, Implement, Radiant', s: 'A radiant aura that burns enemies. See the full text.' },
  { n: 'One Stands Alone', l: 9, u: 'day', k: 'Divine, Weapon', s: 'Challenge an enemy to single combat. See the full text.' },
  { n: 'Radiant Pulse', l: 9, u: 'day', k: 'Divine, Implement, Radiant', s: 'Mark an enemy with pulsing radiance. See the full text.' },

  /* Utility 10 */
  { n: 'Cleansing Spirit', l: 10, u: 'day', ty: 'util', k: 'Divine', s: 'Free yourself or an ally from harmful effects. See the full text.' },
  { n: 'Noble Shield', l: 10, u: 'day', ty: 'util', k: 'Divine', s: 'Take an area attack for your allies. See the full text.' },
  { n: 'Turn the Tide', l: 10, u: 'day', ty: 'util', k: 'Divine', s: 'Let allies make saving throws. See the full text.' },
], { cls: 'paladin', src: 'class', ty: 'atk' });
