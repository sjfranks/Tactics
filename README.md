# Rogue Tactics

A pixel-art tactics roguelite. Lead four heroes down a branching road through three lands (the Greenmarch, the Barrow Moors and the Ashen Waste) and slay the Ashen Dragon.

## Play

[Play Rogue Tactics on GitHub Pages](https://sjfranks.github.io/Tactics/)

The whole game draws to a pixel canvas scaled up with crisp pixels: 320×180 on landscape screens, and at least 196 wide on portrait screens such as a phone held upright, where the 6×8 battle board uses 32×32 hand-drawn tiles. The portrait canvas matches the screen's shape, and the game switches layout when you rotate the device.

## What is in the game

- **The journey:** a Slay the Spire–style branching map for each region, with battles, elite fights, merchants and their smith, Camps, treasure, road events and events (attribute checks, dramatic tasks and negotiations), ending in a boss. Encounters give **XP** by difficulty, after PF2e's encounter builder (Easy 30, Medium 60, Hard 90, a boss 120; 80 XP a level, taken at a Camp), and **Victories**, which give heroes momentum at the start of a fight. **Hit dice** heal between battles; **Wounds** pile up until you rest, and a hero's fourth Down is their last
- **Boons:** each journey opens with two gifts and a bargain (a relic, gold, a Rare power, a tempered weapon, banked XP; or a stronger prize for a Wound on every hero). Pick one
- **The Chronicle:** what carries over between journeys: totals, best score, recent journeys, and nine relics unlocked by milestones (finish a journey, win 15 battles, beat a boss, win 5 elites, slay 250 foes …), such as the War Drum, the Scholar's Tome, the Executioner's Hood and the Crown of Thorns
- **Dread:** slaying the dragon unlocks Dread 1; win at your highest Dread to unlock the next, up to 8 (tougher foes, lean purses, harder elites, more Malice, dear markets, fewer easy roads, tyrant bosses, and Gritty: the third Down kills). Each level adds a quarter to the score
- **Heroes:** Brakka (Fighter), Vex (Rogue), Orin (Wizard) and Sela (Cleric), with Strength, Dexterity, Intelligence and Presence. Each attribute sets a die (d4 to d12): checks and saves succeed on 4+
- **Powers:** class and general powers, active and passive, drafted 1 of 3 at level-ups, elites, bosses and treasure, with Common, Uncommon and Rare rarities, level + 3 slots and party **resonance** for powers that share a tag. Martial damage always comes from the weapon
- **Weapons:** every attack rolls weapon dice plus the hero's key stat. The smith tempers, hones (down to a d2 for the rogue) and inscribes **runes** such as Keen, Vicious, Flame and Thunder
- **Initiative:** everyone rolls their Dexterity die; one mixed turn order for heroes and foes, shown in the TURNS window. The INTENT button shows whom each foe means to attack, and how hard
- **Combos:** heroes set each other up. Slammed foes are staggered (an ally's next hit is a sure critical hit), exposed foes are easier to hit, and blessed heroes attack with advantage. Cashing in another hero's set-up is a combo: +2 momentum for both. Passive powers pay off each other's set-ups, like a rogue's crit doubled on a foe the wizard rooted
- **Damage dice:** the first die decides miss, hit or critical hit (which ignores DEF and explodes); advantage and disadvantage stack to triple. A forecast shows the odds and damage of each result before you strike
- **Defence and reactions:** heroes Defend with their armour's DEF die and have a class reaction each, paid for with an action from their next turn
- **Foes:** the Bestiary's roles, DEF dice, weaknesses, resistances and immunities, Terrifying foes, hidden lurkers and bosses with surges and bloodied phases. Foes share **Malice** and spend it on threats
- **Terrain:** fire pits, acid pools, lava, snares and webs; cover, high ground and difficult terrain. Push and pull foes into hazards
- **Tappable keywords:** every rules term is highlighted and opens its definition
- **Full undo:** rewind a move or action, or go back to the previous hero's turn and undo whatever the foes did in between
- **Compendium:** class and general powers, weapons, runes, relics, monster stat blocks and the glossary
- **Skirmish:** build a test fight against any monsters, or against a rival party of heroes whose powers you choose
- **Presentation:** hand-drawn pixel art for heroes, monsters, terrain, power icons, relics and map nodes; particle effects, screen shake and a synthesized soundtrack with music for each place

## Rules

The game follows the **Rogue Tactics 1e** rule books in [`docs/rules/`](docs/rules/) (Core Rules, Heroes, Bestiary, Design Notes). [`docs/rules/ALIGNMENT.md`](docs/rules/ALIGNMENT.md) lists the few places where the code still differs from them, and the tuning choices made with the simulator. The older Emberwatch rulebook is in [`archive/rulebook-pre-1e/`](archive/rulebook-pre-1e/).

## Development

No build step. Open `index.html` in a browser (or serve the folder). GitHub Actions publishes `index.html` and `js/` from `main` to GitHub Pages.

- `js/data.js`: classes, powers, weapons and runes, monsters, relics, missions, glossary, events, tasks and negotiations
- `js/engine.js`: rules, rounds, combos, movement, hazards, AI, undo
- `js/tutorial.js`: the guided first battle
- `js/font.js`, `js/sprites.js`, `js/art.js`: bitmap font, pixel sprites, icons and terrain art
- `js/illus.js`: painted event and place illustrations
- `js/core.js`: canvas sizing (landscape or portrait), input, widgets, rich text
- `js/battle.js`: the battle screen and its effects
- `js/sheet.js`: character sheets and power cards
- `js/run.js`: the journey's rules: map, Victories, Camps, hit dice and Wounds, power drafts, the smith, events, dramatic tasks, negotiations, road events and saves
- `js/journey.js`: the journey's screens: rewards and drafts, the Camp, events, tasks, negotiations and the smith
- `js/screens.js`: title, map, compendium, skirmish and other screens
- `js/legacy.js`: the boon, Dread and Chronicle screens (the rules for them are at the end of `js/run.js`)
- `js/audio.js`: synthesized sound effects and music

## Archive

- [`archive/emberwatch-v1/`](archive/emberwatch-v1/) is the first Emberwatch prototype, a single HTML page.
- [`archive/rulebook-pre-1e/`](archive/rulebook-pre-1e/) is the rulebook of the game before the Rogue Tactics 1e books.
- [`archive/tactics48/`](archive/tactics48/) is the earlier Tactics 48 prototype (Vite + TypeScript). See its `ARCHIVED.md` to bring it back.

## Balance simulator

`node tools/sim.js [runs] [seed]` plays whole journeys headlessly with the heroes' autoplay AI and reports
the win rate, where runs end, how much health each kind of battle costs, how many combos land per round,
and, for every power, the win rate of runs that took it versus runs that were offered it and passed.
It also reports hero levels at each boss, heroes killed and Wounds carried. Override difficulty knobs with `TUNE='{"actMul":[1,1.1,.65]}' node tools/sim.js 200`; `USES=1` lists how often each power was used; `DREAD=n` plays at Dread level n. Simulated runs take a random boon and can find every relic. The autoplay plans
combos (it values set-ups that a later hero can cash in); `TUNE='{"aiCombo":0}'` makes it ignore
set-ups, to measure how much combos are worth.
