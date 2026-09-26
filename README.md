# Emberwatch Tactics

A pixel-art tactics roguelite. Lead four heroes down a branching road through three lands (the Greenmarch, the Barrow Moors and the Ashen Waste) and slay the Ashen Dragon.

## Play

[Play Emberwatch on GitHub Pages](https://sjfranks.github.io/Tactics/)

The whole game draws to a pixel canvas scaled up with crisp pixels: 320×180 on landscape screens, and at least 196 wide on portrait screens such as a phone held upright, where the 6×8 battle board uses 32×32 hand-drawn tiles. The portrait canvas matches the screen's shape, and the game switches layout when you rotate the device.

## What is in the game

- **The journey:** a Slay the Spire–style branching map for each act, with battles, elite fights, merchants, campfires, treasure and skill-check events, ending in a boss
- **Heroes:** Brakka (Fighter), Vex (Rogue), Orin (Wizard) and Sela (Cleric), each with Might, Finesse, Wits and Presence, and skills such as Athletics, Stealth, Lore and Influence
- **Rounds:** your heroes act first, in any order (tap a hero to pick them), then the foes act by initiative (d20 + Finesse). Red lines show each foe's intent: whom it will attack, and how hard
- **Combos:** heroes set each other up. Shoved, dragged or knocked-down foes are staggered (the next attack is a sure critical hit), exposed foes take extra damage from every hit, and blessed heroes attack with advantage. Cashing in another hero's set-up is a combo: momentum for both, and a damage bonus that grows with each combo in the turn. The fighter's marks taunt foes into attacking her; armored foes shrug off everything but critical hits
- **Movement:** split your speed across several moves; taking an action ends movement
- **Attack rolls:** 3d6 + attribute for a graze, a hit or a critical hit, with advantage and disadvantage from flanking, high ground, cover, conditions and more. A forecast shows the odds and damage of each result, and any combo, before you strike
- **Terrain:** fire pits, acid pools, lava, snares and webs; cover, high ground and difficult terrain. Push and pull foes into hazards. Some monsters set snares, spit acid or start fires
- **Momentum:** shown as gems. Heroes build it each turn and through their class, and spend it on stronger powers; foes share a pool of their own
- **Tappable keywords:** every rules term is highlighted and opens its definition
- **Full undo:** rewind any move or action back to the start of your turn
- **Detailed log:** every roll, result, damage, push and condition
- **Compendium:** all class powers, relics, monster stat blocks and the glossary
- **Skirmish:** build a test fight against any monsters, or against a rival party of heroes whose powers you choose
- **Character sheets:** attributes, skills, how each hero builds momentum, trait and every power as a card
- **Skill challenges:** animated illustrations, the odds of each choice, and a 3d6 roll you watch land
- **Presentation:** hand-drawn pixel art for heroes, monsters, terrain, power icons, relics and map nodes; particle effects, screen shake and a synthesized soundtrack with music for each place

## Development

No build step. Open `index.html` in a browser (or serve the folder). GitHub Actions publishes `index.html` and `js/` from `main` to GitHub Pages.

- `js/data.js`: classes, powers, monsters, relics, missions, glossary, events
- `js/engine.js`: rules, rounds, combos, movement, hazards, AI, undo
- `js/tutorial.js`: the guided first battle
- `js/font.js`, `js/sprites.js`, `js/art.js`: bitmap font, pixel sprites, icons and terrain art
- `js/illus.js`: painted event and place illustrations
- `js/core.js`: canvas sizing (landscape or portrait), input, widgets, rich text
- `js/battle.js`: the battle screen and its effects
- `js/sheet.js`: character sheets and power cards
- `js/run.js`: the journey, rewards, shops, events and saves
- `js/screens.js`: title, map, compendium, skirmish and other screens
- `js/audio.js`: synthesized sound effects and music

## Archive

- [`archive/emberwatch-v1/`](archive/emberwatch-v1/) is the first Emberwatch prototype, a single HTML page.
- [`archive/tactics48/`](archive/tactics48/) is the earlier Tactics 48 prototype (Vite + TypeScript). See its `ARCHIVED.md` to bring it back.

## Balance simulator

`node tools/sim.js [runs] [seed]` plays whole journeys headlessly with the heroes' autoplay AI and reports
the win rate, where runs end, how much health each kind of battle costs, how many combos land per round,
and, for every power, the win rate of runs that took it versus runs that were offered it and passed.
Override difficulty knobs with `TUNE='{"actMul":[1,1.1,.65]}' node tools/sim.js 200`. The autoplay plans
combos (it makes set-ups before the heroes who cash them in); `TUNE='{"aiCombo":0}'` makes it ignore
set-ups, to measure how much combos are worth.
