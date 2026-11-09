# Goblin Delve

A test bench for tabletop combat rules, laid out like a dungeon crawler and made for a phone held upright. The party's portraits run down the right side (Brakka the fighter, Orlen the mage, Sister Wenna the cleric, Vex the rogue). Three goblin fighters stand in the corridor in front of them, and a goblin shaman stands on a step behind. The hotbar along the bottom holds the acting hero's actions and powers. Every roll is thrown as 3D dice onto the dungeon floor.

Open `delve/index.html` in a browser (there is no build step). Once this is on `main`, GitHub Pages serves it at `/Tactics/delve/`.

## How a fight works

- **Initiative:** everyone rolls a d20 and adds their initiative bonus, once, at the start. That order holds every round. Ties go to the higher bonus, then to the heroes.
- **A turn:** on a hero's turn, pick an action in the hotbar, then a target (a goblin, or a portrait for heals). Untargeted actions (Brace, Taunt, Prayer, Fireball) take a second tap. Goblins act on their own.
- **The attack die:** every character rolls their own d6. Two faces are blank (a miss). Two show the character's weapon (⚔️ Brakka, ✨ Orlen, 🔨 Wenna, 🗡️ Vex, 🪓 goblins, 💀 the shaman) and deal their **damage**. One face is their **power**, which hits and triggers that character's power. One face is the **critical**, a burst with an exclamation mark: it hits, and you roll one more die, which can explode again.
- **Powers on the power face:** 🌀 Cleave (Brakka also hits another foe in the same rank), ⚡ Arc (Orlen deals 1 to every other foe), ☀️ Mercy (Wenna heals the most wounded hero 2), 🩸 Bleed (the target loses 1 HP at the start of its next 2 turns), 👊 Gang Up (+1 damage per other goblin fighter standing), 🌿 Mend (the shaman heals the most wounded goblin 2).
- **Ranks:** melee reaches only the front rank while anyone stands in it; ranged attacks and spells reach anyone. Brakka and Wenna are the party's front rank, so the goblin fighters go for them first.
- **Actions:** each hero has Attack, two powers and Brace. Mighty Blow rolls 2 dice. Backstab rolls 2 and keeps the better one at double damage. Fireball rolls one die against every goblin. Magic Missile never misses. Heal restores 4 HP or gets a fallen hero up. Prayer gives every hero one extra die on their next roll. Taunt makes the goblin fighters attack Brakka. Brace takes 1 off each hit until your next turn. Powers have a wait, shown as a number on the button.
- **Down and out:** a hero at 0 HP is down until healed. The fight ends when one side has no one standing.

Tap any goblin or portrait for its **sheet**: stats, the six faces of its die, its power, its actions, what it has done this fight. Press and hold does the same while an action is chosen. When you pick an attack, each goblin in reach shows the odds: average damage, the chance to land anything, and the chance to finish it.

## Testing rule changes

- **Tune** (on any sheet) changes max HP, damage, initiative bonus and the die's faces (tap a face to cycle blank → hit → power → critical). Changes apply to every unit of that type, now and in later fights, and are kept in the browser. The menu resets them.
- **House rules** in the menu: whether the power face also hits, and whether criticals explode.
- **Auto-play the party** lets the heroes play themselves, so you can watch a rule set run.
- **Simulate 1,000 fights** plays whole fights with a simple party bot against the goblins, using the numbers as they stand, and reports win rate, length, how often each hero falls, and damage dealt and taken per character.

For changes beyond those, every number and rule lives in tables at the top of `js/rules.js`:

| Table | What it holds |
| --- | --- |
| `TUNE` | House rules: power face hits, crits explode, the explosion cap, Brace's reduction, the initiative die, bleed length. |
| `KNACKS` | What each power face does. |
| `ACTIONS` | Every hotbar action: target, reach, dice rolled, keep-best, damage multiplier, wait. |
| `UNITS` | Each character's stats, rank, reach, icons, die faces and actions. |
| `PARTY`, `ENCOUNTER` | Who fights. |

## Code

The rules decide everything and know nothing of the screen; the view shows what happened and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`DV`). A battle is plain JSON; `rollInitiative` and `act` change it and return events. Also the goblins' minds, the party bot, the odds and the simulator. Runs in Node too. |
| `js/art.js` | All the pictures, painted in code: pixel portraits, the goblins, the dungeon's stone, die faces. |
| `js/scene.js` | The dungeon in three.js: the corridor and torches, the goblin figures, effects, and the dice (drawn in a second pass from above, so the face that came up is the face you read). |
| `js/ui.js` | The portraits, turn order, readout, hotbar, sheets and menus, and the player that turns the rules' events into animation. |
| `js/vendor/three.min.js` | three.js r128. |

| Command | What it does |
| --- | --- |
| `node delve/tools/sim.js 2000` | Plays 2,000 fights in Node and prints the same report as the in-page simulator. `KNACK=0` or `EXPLODE=0` switch those house rules off for the run. |
| `node delve/tools/test.js 3` | Browser test (Playwright with Chromium): plays 3 fights through real taps, checking after every action that the bars show the HP the rules hold; then checks that tuning survives a reload and resets, and that the simulator runs. `--shots` keeps screenshots. |

With the default numbers, the bot party wins about 95% of fights, in about 4.7 rounds, and someone falls in about 40% of them.
