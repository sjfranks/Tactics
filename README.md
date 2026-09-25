# Emberwatch Tactics

A pixel-art tactics roguelite. Lead four heroes down a branching road through three lands (the Greenmarch, the Barrow Moors and the Ashen Waste) and slay the Ashen Dragon.

## Play

[Play Emberwatch on GitHub Pages](https://sjfranks.github.io/Tactics/)

The whole game draws to a pixel canvas scaled up with crisp pixels: 320×180 on landscape screens, and at least 196 wide on portrait screens such as a phone held upright, where the 6×8 battle board uses 32×32 hand-drawn tiles. The portrait canvas matches the screen's shape, and the game switches layout when you rotate the device.

## What is in the game

- **The journey:** a Slay the Spire–style branching map for each act, with battles, elite fights, merchants, campfires, treasure and skill-check events, ending in a boss
- **Heroes:** Brakka (Fighter), Vex (Rogue), Orin (Wizard) and Sela (Cleric), each with Might, Finesse, Wits and Presence, and skills such as Athletics, Stealth, Lore and Influence
- **Initiative:** d20 + Finesse decides a single mixed turn order for heroes and foes, repeated each round and shown in the TURNS window
- **Movement:** split your speed across several moves; taking an action ends movement
- **Attack rolls:** 3d6 + attribute for a graze, a hit or a critical hit, with boons and hindrances from flanking, high ground, cover, conditions and more. A forecast shows the odds and damage of each result before you strike
- **Terrain:** fire pits, acid pools, lava, snares and webs; cover, high ground and difficult terrain. Push and pull foes into hazards. Some monsters set snares, spit acid or start fires
- **Momentum:** shown as gems. Heroes build it each turn and through their class, and spend it on stronger powers; foes share a pool of their own
- **Tappable keywords:** every rules term is highlighted and opens its definition
- **Full undo:** rewind a move or action, or go back to the previous hero's turn and undo whatever the foes did in between
- **Detailed log:** every roll, result, damage, push and condition
- **Compendium:** all class powers, relics, monster stat blocks and the glossary
- **Skirmish:** build a test fight against any monsters, or against a rival party of heroes whose powers you choose
- **Character sheets:** attributes, skills, how each hero builds momentum, trait and every power as a card
- **Skill challenges:** animated illustrations, the odds of each choice, and a 3d6 roll you watch land
- **Presentation:** hand-drawn pixel art for heroes, monsters, terrain, power icons, relics and map nodes; particle effects, screen shake and a synthesized soundtrack with music for each place

## Development

No build step. Open `index.html` in a browser (or serve the folder). GitHub Actions publishes `index.html` and `js/` from `main` to GitHub Pages.

- `js/data.js`: classes, powers, monsters, relics, missions, glossary, events
- `js/engine.js`: rules, initiative, movement, hazards, AI, undo
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
