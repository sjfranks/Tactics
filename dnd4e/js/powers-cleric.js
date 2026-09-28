/* Cleric prayers (Player's Handbook), heroic tier. Summaries written for this app.
   Weapon prayers use Strength; implement prayers use Wisdom. */
'use strict';

D4.addPowers([
  /* At-will 1 */
  { n: 'Lance of Faith', l: 1, u: 'aw', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 5', t: 'One creature',
    atk: 'Wisdom vs. Reflex', hit: '1d8 + Wisdom modifier radiant damage, and one ally you can see gains a +2 power bonus to his or her next attack roll against the target.',
    l21: '2d8 + Wisdom modifier radiant damage.', s: 'Ranged radiant bolt that sets up an ally\'s next attack (+2).', x: 'wis/Ref/1d8+wis', x21: '2d8+wis' },
  { n: 'Priest\'s Shield', l: 1, u: 'aw', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage, and you and one adjacent ally gain a +1 power bonus to AC until the end of your next turn.',
    l21: '2[W] + Strength modifier damage.', s: 'Hit and give yourself and an adjacent ally +1 AC.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Righteous Brand', l: 1, u: 'aw', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage, and one ally within 5 squares of you gains a power bonus to melee attack rolls against the target equal to your Strength modifier until the end of your next turn.',
    l21: '2[W] + Strength modifier damage.', s: 'Hit and give an ally a big bonus to melee attacks against the target.', x: 'str/AC/1W+str', x21: '2W+str' },
  { n: 'Sacred Flame', l: 1, u: 'aw', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 5', t: 'One creature',
    atk: 'Wisdom vs. Reflex', hit: '1d6 + Wisdom modifier radiant damage, and one ally you can see chooses either to gain temporary hit points equal to your Charisma modifier + one-half your level or to make a saving throw.',
    l21: '2d6 + Wisdom modifier radiant damage.', s: 'Radiant flame that gives an ally temporary hit points or a saving throw.', x: 'wis/Ref/1d6+wis', x21: '2d6+wis' },

  /* Encounter 1 */
  { n: 'Cause Fear', l: 1, u: 'enc', k: 'Divine, Fear, Implement', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Wisdom vs. Will', hit: 'The target moves its speed + your Charisma modifier away from you. It avoids unsafe squares and difficult terrain if it can. This movement provokes opportunity attacks.',
    s: 'Send an enemy running (and provoking opportunity attacks).', x: 'wis/Will/0' },
  { n: 'Divine Glow', l: 1, u: 'enc', k: 'Divine, Implement, Radiant', a: 'std', r: 'Close blast 3', t: 'Each enemy in the blast',
    atk: 'Wisdom vs. Reflex', hit: '1d8 + Wisdom modifier radiant damage.', eff: 'Allies in the blast gain a +2 power bonus to attack rolls until the end of your next turn.',
    s: 'Burn enemies in front of you and give allies there +2 to attacks.', x: 'wis/Ref/1d8+wis' },
  { n: 'Healing Strike', l: 1, u: 'enc', k: 'Divine, Healing, Radiant, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier radiant damage, and the target is marked until the end of your next turn. In addition, you or one ally within 5 squares of you can spend a healing surge.',
    s: 'Hit, mark the enemy, and let someone spend a healing surge.', x: 'str/AC/2W+str' },
  { n: 'Wrathful Thunder', l: 1, u: 'enc', k: 'Divine, Thunder, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier thunder damage, and the target is dazed until the end of your next turn.',
    s: 'Daze an enemy with a thunderous blow.', x: 'str/AC/1W+str' },

  /* Daily 1 */
  { n: 'Avenging Flame', l: 1, u: 'day', k: 'Divine, Fire, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '2[W] + Strength modifier damage, and ongoing 5 fire damage (save ends). If the target attacks on its turn, it can\'t make a saving throw against the ongoing damage at the end of that turn.',
    miss: 'Half damage, and no ongoing damage.', s: 'Holy fire that keeps burning an enemy that keeps fighting.', x: 'str/AC/2W+str' },
  { n: 'Beacon of Hope', l: 1, u: 'day', k: 'Divine, Healing, Implement', a: 'std', r: 'Close burst 3', t: 'Each enemy in the burst',
    atk: 'Wisdom vs. Will', hit: 'The target is weakened until the end of its next turn.',
    eff: 'You and each ally in the burst regain 5 hit points, and your healing powers restore +5 hit points until the end of the encounter.',
    s: 'Weaken nearby enemies, heal nearby allies, and boost your healing for the fight.', x: 'wis/Will/0' },
  { n: 'Cascade of Light', l: 1, u: 'day', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Wisdom vs. Will', hit: '3d8 + Wisdom modifier radiant damage, and the target gains vulnerable 5 to all your attacks (save ends).',
    miss: 'Half damage, and no vulnerability.', s: 'Big radiant damage, and the target takes +5 damage from your attacks.', x: 'wis/Will/3d8+wis' },
  { n: 'Guardian of Faith', l: 1, u: 'day', k: 'Conjuration, Divine, Implement, Radiant', a: 'std', r: 'Ranged 5',
    eff: 'You conjure a guardian in an unoccupied square within range. It lasts until the end of the encounter. Any enemy that starts its turn adjacent to the guardian is attacked: Wisdom vs. Fortitude; on a hit, 1d8 + Wisdom modifier radiant damage. As a move action you can move the guardian up to 3 squares.',
    s: 'A holy guardian that attacks every enemy that stays next to it.', x: 'wis/Fort/1d8+wis' },

  /* Utility 2 */
  { n: 'Bless', l: 2, u: 'day', ty: 'util', k: 'Divine', a: 'std', r: 'Close burst 5', t: 'You and each ally in the burst',
    eff: 'Each target gains a +1 power bonus to attack rolls until the end of the encounter.', s: '+1 to attack rolls for you and your allies for the whole fight.' },
  { n: 'Cure Light Wounds', l: 2, u: 'day', ty: 'util', k: 'Divine, Healing', a: 'std', r: 'Melee touch', t: 'You or one creature',
    eff: 'The target regains hit points as if it had spent a healing surge (it doesn\'t spend one). Healer\'s Lore adds your Wisdom modifier.', s: 'Heal someone without using their healing surge.' },
  { n: 'Divine Aid', l: 2, u: 'enc', ty: 'util', k: 'Divine', s: 'Help an ally throw off an effect. See the full text.' },
  { n: 'Sanctuary', l: 2, u: 'enc', ty: 'util', k: 'Divine', s: 'Protect an ally from attacks. See the full text.' },
  { n: 'Shield of Faith', l: 2, u: 'day', ty: 'util', k: 'Divine', a: 'std', r: 'Close burst 5', t: 'You and each ally in the burst',
    eff: 'Each target gains a +2 power bonus to AC until the end of the encounter.', s: '+2 AC for you and your allies for the whole fight.' },

  /* Encounter 3 */
  { n: 'Blazing Beacon', l: 3, u: 'enc', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 10', t: 'One creature', s: 'Radiant light that makes the target easier for your allies to hit.' },
  { n: 'Command', l: 3, u: 'enc', k: 'Charm, Divine, Implement', a: 'std', r: 'Ranged 10', t: 'One creature', s: 'A divine command that moves the target or makes it fall prone.' },
  { n: 'Daunting Light', l: 3, u: 'enc', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 10', t: 'One creature', s: 'Radiant damage that gives an ally combat advantage against the target.' },
  { n: 'Split the Sky', l: 3, u: 'enc', k: 'Divine, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'A thunderous weapon strike that knocks the enemy off balance.' },

  /* Daily 5 */
  { n: 'Consecrated Ground', l: 5, u: 'day', k: 'Divine, Healing, Implement, Radiant, Zone', a: 'std', r: 'Close burst 1',
    s: 'A holy zone around you: enemies starting their turn in it take radiant damage and bloodied allies in it regain hit points. Sustain it each turn.' },
  { n: 'Rune of Peace', l: 5, u: 'day', k: 'Divine, Implement', a: 'std', s: 'A rune that stops enemies from attacking.' },
  { n: 'Spiritual Weapon', l: 5, u: 'day', k: 'Conjuration, Divine, Implement', a: 'std', s: 'Conjure a floating weapon that attacks each turn while you sustain it.' },
  { n: 'Weapon of the Gods', l: 5, u: 'day', k: 'Divine, Radiant', a: 'minor', s: 'Bless a weapon so it deals extra radiant damage for the encounter.' },

  /* Utility 6 */
  { n: 'Bastion of Health', l: 6, u: 'day', ty: 'util', k: 'Divine, Healing', s: 'Heal several allies at once. See the full text.' },
  { n: 'Cure Serious Wounds', l: 6, u: 'day', ty: 'util', k: 'Divine, Healing', a: 'std', r: 'Melee touch', t: 'You or one creature',
    eff: 'The target regains hit points as if it had spent two healing surges (it doesn\'t spend any).', s: 'A big heal that costs no healing surges.' },
  { n: 'Divine Vigor', l: 6, u: 'day', ty: 'util', k: 'Divine, Healing', s: 'Heal and invigorate allies. See the full text.' },
  { n: 'Holy Lantern', l: 6, u: 'day', ty: 'util', k: 'Divine', s: 'Conjure a holy light that reveals the hidden. See the full text.' },

  /* Encounter 7 */
  { n: 'Awe Strike', l: 7, u: 'enc', k: 'Divine, Fear, Weapon', a: 'std', r: 'Melee weapon', t: 'One creature', s: 'Hit and immobilize the enemy with awe.' },
  { n: 'Break the Spirit', l: 7, u: 'enc', k: 'Divine, Implement, Psychic', a: 'std', s: 'Psychic damage that crushes enemies\' will to fight.' },
  { n: 'Searing Light', l: 7, u: 'enc', k: 'Divine, Implement, Radiant', a: 'std', r: 'Ranged 10', t: 'One creature', s: 'A searing ray that blinds the target.' },
  { n: 'Strengthen the Faithful', l: 7, u: 'enc', k: 'Divine, Healing, Implement', a: 'std', s: 'Let allies spend healing surges while you attack.' },

  /* Daily 9 */
  { n: 'Astral Defenders', l: 9, u: 'day', k: 'Conjuration, Divine, Implement', s: 'Conjure astral warriors that protect your allies. See the full text.' },
  { n: 'Blade Barrier', l: 9, u: 'day', k: 'Conjuration, Divine, Implement', s: 'A wall of whirling blades. See the full text.' },
  { n: 'Divine Power', l: 9, u: 'day', k: 'Divine, Weapon', s: 'Fill yourself with divine might for the encounter. See the full text.' },
  { n: 'Flame Strike', l: 9, u: 'day', k: 'Divine, Fire, Implement', a: 'std', s: 'A column of holy fire that burns enemies in an area.' },

  /* Utility 10 */
  { n: 'Astral Refuge', l: 10, u: 'day', ty: 'util', k: 'Divine', s: 'Pull an ally out of danger into the Astral Sea. See the full text.' },
  { n: 'Knight of Glory', l: 10, u: 'day', ty: 'util', k: 'Divine', s: 'Conjure an astral knight to fight beside you. See the full text.' },
  { n: 'Mass Cure Light Wounds', l: 10, u: 'day', ty: 'util', k: 'Divine, Healing', s: 'Heal every ally near you. See the full text.' },
  { n: 'Shielding Word', l: 10, u: 'enc', ty: 'util', k: 'Divine', s: 'A quick word that protects an ally from an attack. See the full text.' },
], { cls: 'cleric', src: 'class', ty: 'atk' });
