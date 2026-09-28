/* Warlock spells (Player's Handbook), heroic tier. Summaries written for this app.
   Eldritch blast is defined with the class features (classes.js). Pact at-wills are granted by the Eldritch Pact choice. */
'use strict';

D4.addPowers([
  /* Pact at-wills (level 1) */
  { n: 'Dire Radiance', l: 1, u: 'aw', k: 'Arcane, Fear, Implement, Radiant', a: 'std', r: 'Ranged 10', t: 'One creature', pact: 'star',
    atk: 'Constitution vs. Fortitude', hit: '1d6 + Constitution modifier radiant damage. If the target moves nearer to you on its next turn, it takes an extra 1d6 + Constitution modifier radiant damage.',
    l21: '2d6 + Constitution modifier radiant damage, and the extra damage becomes 2d6 + Constitution modifier.',
    s: 'Star pact: radiant damage, and more if the target comes closer.', x: 'con/Fort/1d6+con', x21: '2d6+con' },
  { n: 'Eyebite', l: 1, u: 'aw', k: 'Arcane, Charm, Implement, Psychic', a: 'std', r: 'Ranged 10', t: 'One creature', pact: 'fey',
    atk: 'Charisma vs. Will', hit: '1d6 + Charisma modifier psychic damage, and you are invisible to the target until the start of your next turn.',
    l21: '2d6 + Charisma modifier psychic damage.', s: 'Fey pact: psychic damage, and the target can\'t see you (great for Shadow Walk and combat advantage).', x: 'cha/Will/1d6+cha', x21: '2d6+cha' },
  { n: 'Hellish Rebuke', l: 1, u: 'aw', k: 'Arcane, Fire, Implement', a: 'std', r: 'Ranged 10', t: 'One creature', pact: 'infernal',
    atk: 'Constitution vs. Reflex', hit: '1d6 + Constitution modifier fire damage. If you take damage before the end of your next turn, the target takes an extra 1d6 + Constitution modifier fire damage.',
    l21: '2d6 + Constitution modifier fire damage, and the extra damage becomes 2d6 + Constitution modifier.',
    s: 'Infernal pact: fire damage, and more if you get hurt before your next turn.', x: 'con/Ref/1d6+con', x21: '2d6+con' },

  /* Encounter 1 */
  { n: 'Diabolic Grasp', l: 1, u: 'enc', k: 'Arcane, Implement', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Constitution vs. Fortitude', hit: '2d8 + Constitution modifier damage, and you slide the target 2 squares. Infernal pact: you slide the target additional squares based on your Intelligence modifier.',
    s: 'Damage an enemy and drag it where you want it.', x: 'con/Fort/2d8+con' },
  { n: 'Dreadful Word', l: 1, u: 'enc', k: 'Arcane, Fear, Implement, Psychic', a: 'std', r: 'Ranged 5', t: 'One creature',
    atk: 'Charisma vs. Will', hit: '2d8 + Charisma modifier psychic damage, and the target takes a penalty to Will until the end of your next turn.',
    s: 'Psychic damage that leaves the target\'s mind open.', x: 'cha/Will/2d8+cha' },
  { n: 'Vampiric Embrace', l: 1, u: 'enc', k: 'Arcane, Implement, Necrotic', a: 'std', r: 'Ranged 5', t: 'One creature',
    atk: 'Constitution vs. Will', hit: '2d8 + Constitution modifier necrotic damage, and you gain temporary hit points (more with a good Intelligence and the infernal pact).',
    s: 'Drain life to gain temporary hit points.', x: 'con/Will/2d8+con' },
  { n: 'Witchfire', l: 1, u: 'enc', k: 'Arcane, Fire, Implement', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Charisma vs. Reflex', hit: '2d6 + Charisma modifier fire damage, and the target takes a -2 penalty to attack rolls until the end of your next turn (a bigger penalty for fey and star pact warlocks with a good Intelligence).',
    s: 'Fire damage that throws off the target\'s aim.', x: 'cha/Ref/2d6+cha' },

  /* Daily 1 */
  { n: 'Armor of Agathys', l: 1, u: 'day', k: 'Arcane, Cold', a: 'std', r: 'Personal',
    eff: 'You gain temporary hit points. Until the end of the encounter, any enemy that starts its turn adjacent to you takes 1d6 + your Charisma modifier cold damage.',
    s: 'Armor of ice: temporary hit points, and enemies next to you take cold damage.' },
  { n: 'Curse of the Dark Dream', l: 1, u: 'day', k: 'Arcane, Charm, Implement, Psychic', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Charisma vs. Will', hit: '3d8 + Charisma modifier psychic damage, and you slide the target 3 squares.',
    eff: 'Until the end of the encounter, you can slide the target 1 square as a minor action (while you sustain the curse).', s: 'Trap an enemy in a waking nightmare and walk it around.', x: 'cha/Will/3d8+cha' },
  { n: 'Dread Star', l: 1, u: 'day', k: 'Arcane, Fear, Implement, Radiant', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Charisma vs. Will', hit: '3d6 + Charisma modifier radiant damage, and the target is immobilized until the end of your next turn.',
    s: 'A terrifying star that roots the enemy in place.', x: 'cha/Will/3d6+cha' },
  { n: 'Flames of Phlegethos', l: 1, u: 'day', k: 'Arcane, Fire, Implement', a: 'std', r: 'Ranged 10', t: 'One creature',
    atk: 'Constitution vs. Reflex', hit: '3d10 + Constitution modifier fire damage, and ongoing 5 fire damage (save ends).',
    s: 'Hellfire that keeps burning.', x: 'con/Ref/3d10+con' },

  /* Utility 2 */
  { n: 'Beguiling Tongue', l: 2, u: 'enc', ty: 'util', k: 'Arcane', a: 'minor', r: 'Personal', s: 'A big bonus to your next Bluff, Diplomacy or Intimidate check.' },
  { n: 'Ethereal Stride', l: 2, u: 'enc', ty: 'util', k: 'Arcane, Teleportation', a: 'move', r: 'Personal', s: 'Teleport a short distance and gain a bonus to defenses.' },
  { n: 'Fiendish Resilience', l: 2, u: 'day', ty: 'util', k: 'Arcane', a: 'minor', r: 'Personal', s: 'Gain temporary hit points.' },
  { n: 'Shadow Veil', l: 2, u: 'enc', ty: 'util', k: 'Arcane, Illusion', a: 'minor', r: 'Personal', s: 'Become invisible for a moment.' },

  /* Encounter 3 */
  { n: 'Eldritch Rain', l: 3, u: 'enc', k: 'Arcane, Implement', a: 'std', r: 'Ranged 10', t: 'One or two creatures', s: 'Eldritch bolts at two enemies.' },
  { n: 'Fiery Bolt', l: 3, u: 'enc', k: 'Arcane, Fire, Implement', a: 'std', r: 'Ranged 10', t: 'One creature', s: 'A bolt of fire that splashes the enemies around the target.' },
  { n: 'Frigid Darkness', l: 3, u: 'enc', k: 'Arcane, Cold, Implement', a: 'std', r: 'Ranged 10', t: 'One creature', s: 'Cold darkness that makes the target grant combat advantage.' },
  { n: 'Otherwind Stride', l: 3, u: 'enc', k: 'Arcane, Implement, Teleportation', a: 'std', r: 'Close burst 1', s: 'Blast adjacent enemies and teleport away.' },

  /* Daily 5 */
  { n: 'Avernian Eruption', l: 5, u: 'day', k: 'Arcane, Fire, Implement', a: 'std', s: 'A burst of hellfire over an area.' },
  { n: 'Crown of Madness', l: 5, u: 'day', k: 'Arcane, Charm, Implement, Psychic', a: 'std', s: 'Drive an enemy mad so it attacks its allies.' },
  { n: 'Curse of the Bloody Fangs', l: 5, u: 'day', k: 'Arcane, Implement', a: 'std', s: 'A curse that tears at the target when your allies hit it.' },
  { n: 'Hunger of Hadar', l: 5, u: 'day', k: 'Arcane, Implement, Necrotic, Zone', a: 'std', s: 'A zone of devouring darkness that hurts enemies inside it.' },

  /* Utility 6 */
  { n: 'Dark One\'s Own Luck', l: 6, u: 'day', ty: 'util', k: 'Arcane', s: 'Reroll a bad roll. See the full text.' },
  { n: 'Fey Switch', l: 6, u: 'enc', ty: 'util', k: 'Arcane, Teleportation', s: 'Swap places with an ally by teleportation. See the full text.' },
  { n: 'Shroud of Black Steel', l: 6, u: 'day', ty: 'util', k: 'Arcane', s: 'Your skin turns to dark metal, giving resistance. See the full text.' },
  { n: 'Spider Climb', l: 6, u: 'enc', ty: 'util', k: 'Arcane', s: 'Climb walls and ceilings at your speed. See the full text.' },

  /* Encounter 7 */
  { n: 'Howl of Doom', l: 7, u: 'enc', k: 'Arcane, Fear, Implement, Thunder', a: 'std', s: 'A terrifying howl that damages and pushes enemies in front of you.' },
  { n: 'Infernal Moon Curse', l: 7, u: 'enc', k: 'Arcane, Implement, Poison', a: 'std', s: 'A poisonous curse that holds the target in place.' },
  { n: 'Mire the Mind', l: 7, u: 'enc', k: 'Arcane, Illusion, Implement, Psychic', a: 'std', s: 'Cloud enemies\' minds while you slip out of sight.' },
  { n: 'Sign of Ill Omen', l: 7, u: 'enc', k: 'Arcane, Implement', a: 'std', s: 'A curse that makes the target\'s luck go bad.' },

  /* Daily 9 */
  { n: 'Curse of the Black Frost', l: 9, u: 'day', k: 'Arcane, Cold, Implement', s: 'A freezing curse that hurts the target when it acts. See the full text.' },
  { n: 'Iron Spike of Dis', l: 9, u: 'day', k: 'Arcane, Implement', s: 'An infernal spike that pins the target in place. See the full text.' },
  { n: 'Summons of Khirad', l: 9, u: 'day', k: 'Arcane, Implement, Teleportation', s: 'Teleport the target next to you. See the full text.' },
  { n: 'Thirsting Tendrils', l: 9, u: 'day', k: 'Arcane, Implement, Necrotic', s: 'Life-draining tendrils that heal you. See the full text.' },

  /* Utility 10 */
  { n: 'Ambassador Imp', l: 10, u: 'day', ty: 'util', k: 'Arcane, Conjuration', s: 'Summon an imp to carry a message. See the full text.' },
  { n: 'Shadow Form', l: 10, u: 'day', ty: 'util', k: 'Arcane', s: 'Become an insubstantial shadow. See the full text.' },
  { n: 'Shielding Shades', l: 10, u: 'day', ty: 'util', k: 'Arcane', s: 'Shadows absorb an attack against you. See the full text.' },
], { cls: 'warlock', src: 'class', ty: 'atk' });
