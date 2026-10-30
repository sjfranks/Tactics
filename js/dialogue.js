// =====================================================================================================================
// GOBLIN CRYPT · THE WORDS
// Everything the characters say. Scenes play before and after each battle (tap to go on); barks are the short lines a
// figure calls out in the fight. Speakers are unit kinds: fighter (Brakka), cleric (Sister Wenna), mage (Orlen), thief
// (Vex), cutter, archer, shaman, warg, king (Grubnash). In barks, {name} is the hero the line is about.
// Edit freely: the rules never read this file.
// =====================================================================================================================
const DIALOGUE = {
  // one entry per battle, in campaign order: before the first round, after a win, after a defeat
  scenes: [
    { // The Gorge Crossing
      before: [
        ['thief', 'Two rope bridges, a long drop, and goblins on the far side. Cosy.'],
        ['fighter', "Bridges I don't mind. It's the goblins. I'll go first."],
        ['cutter', "Oi! Toll's your heads! Pay up or jump!"],
        ['mage', 'Charming. Brakka, if one of them stands too near the edge...'],
        ['fighter', "...I'll help it over. Aye."]
      ],
      win: [
        ['cleric', "Bind your cuts. The ridge camp is a day's walk, and they'll have heard us coming."],
        ['thief', 'Let them. I like an audience.']
      ],
      lose: [
        ['cutter', 'Ha! Toll paid! Come back when you got more heads!'],
        ['cleric', 'Fall back. We cross at dusk, and we cross together.']
      ]
    },
    { // Goblin Ridge
      before: [
        ['mage', "They've dug in on the ridge. Archers on the high ground, and a shaman in the middle of them."],
        ['cleric', 'While that shaman lives, their wounds close. Cut it down first.'],
        ['shaman', 'Come up, little meats. The hill is hungry.'],
        ['thief', 'There is a bluff on the east side. Give me a rope and a minute.']
      ],
      win: [
        ['fighter', "That's the ridge. Where do the tracks go?"],
        ['mage', 'Down. Into the old crypt. And something down there is howling.']
      ],
      lose: [
        ['shaman', 'The hill eats well tonight.'],
        ['fighter', "We'll take that ridge. Not today. But we'll take it."]
      ]
    },
    { // The Warg Pens
      before: [
        ['warg', '*A long howl rolls off the crypt walls, and two more answer it.*'],
        ['fighter', 'Wargs. Three of them, and they hunt as a pack.'],
        ['cleric', 'Keep together. And keep Orlen behind a wall of steel.'],
        ['mage', "I'd like that in writing."],
        ['cutter', "Loose the dogs! Dinner's walked in all by itself!"]
      ],
      win: [
        ['thief', "Grubnash's hall is through there. I can smell the throne from here."],
        ['cleric', 'Rest. Pray. Tomorrow we end this.']
      ],
      lose: [
        ['warg', '*The pack feeds.*'],
        ['cleric', 'Drag them out! Everyone out, now!']
      ]
    },
    { // Throne of Grubnash
      before: [
        ['king', 'WHO DARES? Grubnash sees you, little heroes. Grubnash is not impressed.'],
        ['fighter', 'You will be.'],
        ['king', 'Ha! Grubnash will wear your helmet for a soup bowl. COURT! KILL THEM!'],
        ['cleric', 'When he lowers his head, his path glows red. Do not be standing in it.'],
        ['thief', "Bring him down and the rest will run. Goblins don't die for kings."]
      ],
      win: [
        ['fighter', "Crown's yours if you want it, Vex."],
        ['thief', "Bit greasy. I'll sell it."],
        ['cleric', "It's over. Let's go home."]
      ],
      lose: [
        ['king', 'Run, little heroes! Run home and tell them: Grubnash is KING!'],
        ['fighter', 'This is not finished, goblin.']
      ]
    }
  ],
  // short lines called out in the fight; a hero's own lines are keyed by kind, '*' is anyone's
  barks: {
    crit: {
      fighter: ['Down you go!', 'Feel that?', 'Steel and spite!'],
      cleric: ['By the light!', 'Judged!'],
      mage: ['Textbook.', 'Did everyone see that?'],
      thief: ['Right in the gap.', 'Too easy.']
    },
    kill: {
      fighter: ['Next!', 'One less.', "Who's next?"],
      cleric: ['Rest, wretch.', 'Go to your judgement.'],
      mage: ['Gone. Like a bad smell.', 'And stay down.'],
      thief: ['Sleep tight.', 'Shh. Shh.']
    },
    miss: {
      fighter: ['Hold still!', 'Slippery runt.'],
      cleric: ['Steady...', 'Forgive me, that was poor.'],
      mage: ['That was a warning shot.', 'The wind took it.'],
      thief: ['Slippery little...', 'Lucky.']
    },
    hurt: { // a hero brought low, but still standing
      fighter: ['Just a scratch.', "I've had worse from my sister."],
      cleric: ["I'm... still standing.", 'Light, give me strength.'],
      mage: ["I'd like to stop bleeding now!", 'Help! Somebody!'],
      thief: ['Ow. Ow. Ow.', 'That one stung.']
    },
    allyDown: { // another hero sees {name} fall
      cleric: ["Hold on, {name}, I'm coming!", "{name}! Don't you dare die on me."],
      '*': ['{name} is down! Wenna!', "They've got {name}!"]
    },
    revived: {
      fighter: ['Not done yet.', 'Right. Where was I?'],
      cleric: ['Back on my feet... nearly.'],
      mage: ['I saw a light. It was you, wasn\'t it?', 'Was I dead? I feel dead.'],
      thief: ['Did I miss anything?', 'Thanks, Sister. I owe you one.']
    },
    heal: { cleric: ['Mend.', "Hold still, this'll sting.", 'There. Good as new. Almost.'] },
    taunt: { fighter: ['Over here, you maggots!', 'Come on! All of you!', 'Me! Hit ME!'] },
    hide: { thief: ['Now you see me...', "Don't mind me.", 'Watch the shadows.'] },
    foeTurn: { // a goblin starting its turn, now and then
      cutter: ['Stab \'em!', "Mine! That one's mine!", 'Cut cut cut!'],
      archer: ['Hold still, meat!', 'Ha! Pincushion!'],
      shaman: ['The bones say you die.', 'Hexes for the hexless!'],
      warg: ['*snarls*', '*growls low*'],
      king: ['Grubnash is hungry!', 'Bring me that one!', 'Who wants a squeeze?']
    },
    smash: { king: ['Stand still, little heroes...', 'Grubnash sees a path!'] },
    horn: { king: ['Wake up, you lazy maggots!', 'More! Send more!'] },
    wake: { '*': ['Huh? Wha...? Intruders!', 'Oi! Get up! They\'re here!'] },
    rout: { '*': ["The king's dead! RUN!", 'Every goblin for himself!'] }
  }
};
