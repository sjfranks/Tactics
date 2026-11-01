// =====================================================================================================================
// GOBLIN CRYPT · THE WORDS
// Everything the characters say. Scenes play before and after each battle (tap to go on); barks are the short lines a
// figure calls out in the fight. Speakers are unit kinds: fighter (Brakka), cleric (Sister Wenna), mage (Orlen), thief
// (Vex), cutter, archer, shaman, warg, king (Grubnash). In barks, {name} is the hero the line is about.
// Edit freely: the rules never read this file.
// =====================================================================================================================
const DIALOGUE = {
  // one entry per battle, in the order of the levels: before the first round, after a win, after a defeat
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
        ['thief', "There's a stair behind the pens. Heat's coming up it, and the sound of hammers."],
        ['cleric', 'Rest first. Whatever is down there, we meet it on our feet.']
      ],
      lose: [
        ['warg', '*The pack feeds.*'],
        ['cleric', 'Drag them out! Everyone out, now!']
      ]
    },
    { // The Forge Pits
      before: [
        ['mage', "Smell that? Brimstone. They're forging blades for the king down here."],
        ['thief', 'Lava on every side and a lot of goblins with hammers. Lovely.'],
        ['shaman', 'Feed them to the fire! The fire is always hungry!'],
        ['fighter', "Then we'll feed it goblins."],
        ['cleric', 'Mind the vents. When they start to throb, step off them.']
      ],
      win: [
        ['fighter', 'Hot work.'],
        ['cleric', 'The great stair climbs from here to his hall. He knows we are coming now.'],
        ['thief', 'Good. Let him sweat.']
      ],
      lose: [
        ['shaman', 'The forge is fed!'],
        ['mage', 'Out! Back up the stair, before we cook!']
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
    },
    { // The Reeve's House (level select only)
      before: [
        ['thief', "The reeve's house. Goblins in the parlour, goblins in the bedrooms. Someone has been at the pantry."],
        ['cutter', "Nobody's home! Wipe your feet or we wipe 'em for you!"],
        ['mage', 'One stair, and they hold the top of it. Archers up there will shoot down the well.'],
        ['fighter', 'Then we clear the ground floor first, and go up together.']
      ],
      win: [
        ['cleric', 'The house is clear. The reeve can have it back.'],
        ['thief', "Minus a few spoons. Goblins, you know."]
      ],
      lose: [
        ['shaman', 'Ours now! Ours, and the pantry too!'],
        ['fighter', 'Out the door! We come back with more of us.']
      ]
    }
  ],
  // a run: words as it begins, and before and after each boss (by map id)
  run: {
    start: [
      ['cleric', 'Three days down into the dark, and Grubnash at the bottom of it.'],
      ['thief', 'Three days of goblins. I hope you all brought snacks.'],
      ['fighter', 'Keep together. Pick your fights. We go home when the king is dead.']
    ],
    bosses: {
      den: {
        before: [
          ['warg', '*Something huge stirs in the dark of the den, and the bones on the floor shift.*'],
          ['thief', "That's not a warg. That's a warg's mother."],
          ['fighter', 'Then she knows what happens to her pups. Shields up.']
        ],
        win: [['mage', 'The pack is broken. The way down to the crypt is open.'], ['cleric', 'Rest while you can. It only gets darker from here.']],
        lose: [['warg', '*The den fills with howling.*']]
      },
      barrow: {
        before: [
          ['shaman', 'Visitors! How lovely. The dead have been so lonely, little meats.'],
          ['mage', "A bone witch. Whatever you put down, she'll stand back up."],
          ['cleric', 'Then we put her down first.']
        ],
        win: [['cleric', 'Let them sleep now, all of them.'], ['fighter', 'Down again. There is fire below us; I can feel it through my boots.']],
        lose: [['shaman', 'More bones for the barrow. Rise, rise!']]
      },
      throne: {
        before: [
          ['king', 'WHO DARES? Grubnash sees you, little heroes. Grubnash is not impressed.'],
          ['fighter', 'You will be.'],
          ['king', 'COURT! KILL THEM!']
        ],
        win: [['fighter', "Crown's yours if you want it, Vex."], ['thief', "Bit greasy. I'll sell it."], ['cleric', "It's over. Let's go home."]],
        lose: [['king', 'Run, little heroes! Grubnash is KING!']]
      }
    }
  },
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
      brute: ['SMASH!', 'Brute hungry.', 'Small ones crunch.'],
      matriarch: ['*a howl that shakes the den*', '*bares her yellow fangs*'],
      witch: ['Up, my darlings, up!', 'Such pretty bones you have.'],
      king: ['Grubnash is hungry!', 'Bring me that one!', 'Who wants a squeeze?']
    },
    smash: { king: ['Stand still, little heroes...', 'Grubnash sees a path!'] },
    horn: { king: ['Wake up, you lazy maggots!', 'More! Send more!'], matriarch: ['*the howl is answered from the hills*'], witch: ['Rise! Rise and serve!', 'The barrow gives back!'] },
    wake: { '*': ['Huh? Wha...? Intruders!', 'Oi! Get up! They\'re here!'] },
    rout: { '*': ["The king's dead! RUN!", 'Every goblin for himself!'] }
  }
};
