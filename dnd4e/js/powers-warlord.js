/* Warlord exploits (Player's Handbook), heroic tier. Summaries written for this app. */
'use strict';

D4.addPowers([
  /* At-will 1 */
  { n: 'Commander\'s Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'One ally of your choice makes a melee basic attack against the target.', hit: 'The ally\'s basic attack damage + your Intelligence modifier.',
    s: 'Give your turn\'s attack to an ally (great with strikers), adding your Intelligence to the damage.' },
  { n: 'Furious Smash', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. Fortitude', hit: 'Damage equal to your Strength modifier. Choose one ally adjacent to you or the target: that ally adds your Charisma modifier as a power bonus to attack and damage on its next attack against the target before the end of your next turn.',
    s: 'A light blow that sets up an ally\'s big hit.', x: 'str/Fort/str' },
  { n: 'Viper\'s Strike', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage. If the target shifts before the start of your next turn, it provokes an opportunity attack from an ally of your choice.',
    l21: '2[W] + Strength modifier damage.', s: 'Punish the enemy if it tries to shift away.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Wolf Pack Tactics', l: 1, u: 'aw', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    eff: 'Before you attack, one ally adjacent to you or to the target can shift 1 square.', atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage.',
    l21: '2[W] + Strength modifier damage.', s: 'Let an ally shift into position, then attack.', x: 'str/AC/1W+str', x21: '2W+str' },

  /* Encounter 1 */
  { n: 'Guarding Attack', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage. Until the end of your next turn, one ally adjacent to you or the target gains a power bonus to AC against the target\'s attacks (2 + your Charisma modifier).',
    s: 'Hit hard and protect an ally from that enemy.', x: 'str/AC/2W+str' },
  { n: 'Leaf on the Wind', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit and reposition the enemy and your ally.' },
  { n: 'Powerful Warning', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit and warn allies, boosting their defenses.' },
  { n: 'Warlord\'s Favor', l: 1, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and one ally within 5 squares of you gains a power bonus to attack rolls against the target equal to 1 + your Intelligence modifier until the end of your next turn.',
    s: 'Hit hard and help an ally hit the same enemy.', x: 'str/AC/2W+str' },

  /* Daily 1 */
  { n: 'Bastion of Defense', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '3[W] + Strength modifier damage.', eff: 'Allies within 5 squares of you gain a +1 power bonus to all defenses until the end of the encounter.',
    s: 'A heavy blow, and +1 to all defenses for nearby allies for the fight.', x: 'str/AC/3W+str' },
  { n: 'Lead the Attack', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '3[W] + Strength modifier damage. Until the end of the encounter, you and each ally gain a power bonus to attack rolls against the target equal to 1 + your Intelligence modifier.',
    miss: 'Until the end of the encounter, you and each ally gain a +1 power bonus to attack rolls against the target.',
    s: 'Mark an enemy for the whole party: bonus to hit it all fight.', x: 'str/AC/3W+str' },
  { n: 'Pin the Foe', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit and stop the enemy from escaping while your allies surround it.' },
  { n: 'White Raven Onslaught', l: 1, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'A heavy blow that lets you move allies around the battlefield.' },

  /* Utility 2 */
  { n: 'Aid the Injured', l: 2, u: 'enc', ty: 'util', k: 'Healing, Martial', a: 'std', r: 'Melee touch', t: 'You or one adjacent ally',
    eff: 'The target can spend a healing surge.', s: 'Let an adjacent ally spend a healing surge.' },
  { n: 'Knight\'s Move', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'move', r: 'Ranged 10', t: 'One ally',
    eff: 'The target can move its speed as a free action.', s: 'Spend your move action to move an ally.' },
  { n: 'Shake It Off', l: 2, u: 'enc', ty: 'util', k: 'Martial', a: 'minor', r: 'Ranged 10', t: 'You or one ally',
    eff: 'The target makes a saving throw with a power bonus equal to your Charisma modifier.', s: 'Grant a saving throw with a bonus.' },

  /* Encounter 3 */
  { n: 'Hammer and Anvil', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit, and an ally next to the target makes a free melee basic attack.' },
  { n: 'Inspired Belligerence', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit, and your allies gain temporary hit points when they attack the target.' },
  { n: 'Lion\'s Roar', l: 3, u: 'enc', k: 'Healing, Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit, and an ally can spend a healing surge.' },
  { n: 'Surprise Attack', l: 3, u: 'enc', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit, and an ally makes a free attack with combat advantage.' },

  /* Daily 5 */
  { n: 'Stand the Fallen', l: 5, u: 'day', k: 'Healing, Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'A heavy blow that rallies allies to spend healing surges.' },
  { n: 'Turning Point', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'A strike that helps allies shake off effects.' },
  { n: 'Villain\'s Nightmare', l: 5, u: 'day', k: 'Martial, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit, and punish the enemy if it moves away.' },

  /* Utility 6 */
  { n: 'Guide the Charge', l: 6, u: 'enc', ty: 'util', k: 'Martial', s: 'Help an ally charge. See the full text.' },
  { n: 'Inspiring Reaction', l: 6, u: 'enc', ty: 'util', k: 'Healing, Martial', s: 'Heal an ally who was just hit. See the full text.' },
  { n: 'Quick Step', l: 6, u: 'enc', ty: 'util', k: 'Martial', s: 'Let allies move quickly. See the full text.' },
  { n: 'Stand Tough', l: 6, u: 'enc', ty: 'util', k: 'Healing, Martial', s: 'You and nearby allies regain hit points. See the full text.' },

  /* Daily 9 */
  { n: 'Iron Dragon Charge', l: 9, u: 'day', k: 'Martial, Weapon', s: 'A charge that sweeps enemies aside. See the full text.' },
  { n: 'Knock Them Down', l: 9, u: 'day', k: 'Martial, Weapon', s: 'Knock enemies prone and let allies follow up. See the full text.' },
  { n: 'White Raven Strike', l: 9, u: 'day', k: 'Martial, Weapon', s: 'A heavy blow that moves your allies into position. See the full text.' },

  /* Utility 10 */
  { n: 'Defensive Rally', l: 10, u: 'day', ty: 'util', k: 'Healing, Martial', s: 'Allies regain hit points and gain defenses. See the full text.' },
  { n: 'Ease Suffering', l: 10, u: 'day', ty: 'util', k: 'Martial', s: 'Help an ally end an effect. See the full text.' },
  { n: 'Tactical Shift', l: 10, u: 'enc', ty: 'util', k: 'Martial', s: 'Shift allies into better positions. See the full text.' },
], { cls: 'warlord', src: 'class', ty: 'atk' });
