# Goblin Delve

A test bench for tabletop combat rules, laid out like a dungeon crawler and made for a phone held upright. The party's portraits run down the right side (Brakka the fighter, Orlen the mage, Sister Wenna the cleric, Vex the rogue). Three goblin fighters stand in the corridor in front of them, and a goblin shaman stands on a step behind. The hotbar along the bottom holds the acting hero's actions and powers. Every roll is thrown as 3D d10s onto the dungeon floor.

Open `delve/index.html` in a browser (there is no build step). Once this is on `main`, GitHub Pages serves it at `/Tactics/delve/`.

## How a fight works

- **Turn order:** there is no initiative. Each round you choose which hero acts next by tapping a ready portrait, until all four have acted. The goblins act in a fixed order (Snikk, Grub, Muckle, then Old Gnarl). By default the sides alternate, a hero then a goblin, and the party starts every round; a house rule switches to the whole party first, then every goblin.
- **A turn:** pick an action in the hotbar, then a target (a goblin, or a portrait for heals). Untargeted actions (Brace, Taunt, Prayer, Fireball) take a second tap. Until a hero acts, tapping another ready portrait sends that hero instead. Goblins act on their own.
- **The dice:** every roll is a d10, and every die uses the same four symbols: **blank** (a miss), **hit** (a sword: deal your damage), **surge** (a gold bolt: a hit, plus your class's surge) and **critical** (a burst with an exclamation mark: a hit, and roll one more die, which can explode again). Each class has its own mix of faces, and its own die colour:

  | Class | Blank | Hit | Surge | Critical | Damage | Surge does |
  | --- | --- | --- | --- | --- | --- | --- |
  | Brakka, fighter | 2 | 4 | 3 | 1 | 3 | **Heavy Blow:** 2 more damage. |
  | Vex, rogue | 3 | 3 | 2 | 2 | 2 | **Bleed:** the target loses 1 HP at the start of its next 2 turns. |
  | Orlen, mage | 3 | 3 | 3 | 1 | 2 | **Arc:** 1 damage to every other goblin. |
  | Sister Wenna, cleric | 2 | 4 | 3 | 1 | 2 | **Mercy:** the most wounded hero heals 2. |
  | Goblin fighter | 3 | 4 | 2 | 1 | 3 | **Gang Up:** +1 damage for each other goblin fighter standing. |
  | Goblin shaman | 3 | 4 | 2 | 1 | 3 | **Mend:** the most wounded goblin heals 2. |

- **Ranks:** melee reaches only the front rank while anyone stands in it; ranged attacks and spells reach anyone. Brakka and Wenna are the party's front rank, so the goblin fighters go for them first.
- **Actions:** each hero has Attack, two powers and Brace. Mighty Blow rolls 2 dice. Backstab rolls 2 and keeps the better one at double damage. Fireball rolls one die against every goblin. Magic Missile never misses. Heal restores 4 HP or gets a fallen hero up. Prayer gives every hero one extra die on their next roll. Taunt makes the goblin fighters attack Brakka. Brace takes 1 off each hit until your next turn. Powers recharge over a number of rounds, shown on the button.
- **Down and out:** a hero at 0 HP is down until healed. The fight ends when one side has no one standing.

Tap any goblin, or any hero who has acted, for its **sheet**: stats, the ten faces of its die and their mix, what each face does, its actions, what it has done this fight. Press and hold opens any sheet, even the acting hero's while an action is chosen. When you pick an attack, each goblin in reach shows the odds: average damage, the chance to land anything, and the chance to finish it.

## Testing rule changes

- **Tune** (on any sheet) changes max HP, damage and the die's faces (tap a face to cycle blank → hit → surge → critical). Changes apply to every unit of that type, now and in later fights, and are kept in the browser. The menu resets them.
- **House rules** in the menu: the turn order (alternate, or party first), and whether criticals explode.
- **Auto-play the party** lets the heroes play themselves, so you can watch a rule set run.
- **Simulate 1,000 fights** plays whole fights with a simple party bot against the goblins, using the numbers as they stand, and reports win rate, length, how often each hero falls, and damage dealt and taken per character.

For changes beyond those, every number and rule lives in tables at the top of `js/rules.js`:

| Table | What it holds |
| --- | --- |
| `TUNE` | House rules: crits explode, the explosion cap, Brace's reduction, bleed length, turn order. |
| `SURGES` | What each class's surge does. |
| `ACTIONS` | Every hotbar action: target, reach, dice rolled, keep-best, damage multiplier, recharge. |
| `UNITS` | Each character's stats, rank, reach, face mix (`dice`) and actions. |
| `PARTY`, `ENCOUNTER` | Who fights; the encounter's order is the goblins' turn order. |

## Code

The rules decide everything and know nothing of the screen; the view shows what happened and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`DV`). A battle is plain JSON; `start` and `act` change it and return events. Also the goblins' minds, the party bot, the odds and the simulator. Runs in Node too. |
| `js/art.js` | All the pictures, painted in code: pixel portraits, the goblins, the dungeon's stone, and the dice's four symbols (as canvas drawings for the dice and as SVG for the page). |
| `js/scene.js` | The dungeon in three.js: the corridor and torches, the goblin figures, effects, and the d10s (drawn in a second pass from above, the face that came up lit and the others darkened, so it is the one you read). |
| `js/ui.js` | The portraits, turn order, readout, hotbar, sheets and menus, and the player that turns the rules' events into animation. |
| `js/vendor/three.min.js` | three.js r128. |

| Command | What it does |
| --- | --- |
| `node delve/tools/sim.js 2000` | Plays 2,000 fights in Node and prints the same report as the in-page simulator. `EXPLODE=0` turns exploding criticals off for the run; `TURNS=party` sends the whole party first. |
| `node delve/tools/test.js 3` | Browser test (Playwright with Chromium): plays 3 fights through real taps (picking heroes out of turn by their portraits), checking after every action that the bars show the HP the rules hold; then checks that tuning survives a reload and resets, and that the simulator runs. `--shots` keeps screenshots. |

With the default numbers, the bot party wins about 94% of fights, in about 5.7 rounds, and someone falls in about half of them.
