# Goblin Delve

A test bench for tabletop combat rules, laid out like a dungeon crawler and made for a phone held upright. The party's portraits run down the right side (Brakka the fighter, Orlen the mage, Sister Wenna the cleric, Vex the rogue). Three goblin fighters stand in the corridor in front of them, and a goblin shaman stands on a step behind. The hotbar along the bottom holds the acting hero's actions and powers. Every roll is thrown as 3D d6s onto the dungeon floor.

Open `delve/index.html` in a browser (there is no build step). Once this is on `main`, GitHub Pages serves it at `/Tactics/delve/`.

## How a fight works

- **Initiative is speed.** Every character has a speed stat, and every round the fastest acts first: Vex (4), then Brakka and the goblin fighters (3), then Orlen, Wenna and the shaman (2). A hero and a goblin on the same speed: the hero goes first. Heroes on the same speed: you choose which goes first, by tapping a ready portrait (the round strip marks them "pick"). Goblins on the same speed: the one with the most HP left goes first, so wounding a goblin also slows it down; still tied, front rank before back rank, left to right.
- **A turn is two actions**, for heroes and goblins alike: typically an attack and a power. Big spells (Fireball, Prayer of Healing) take both. **End** finishes a turn early.
- **The dice:** every roll is a d6, and every die uses the same four symbols: **graze** (a half-filled circle: a partial success), **hit** (a sword), **surge** (a gold bolt: a hit plus something extra) and **critical** (a burst). A face shows a number in front of its symbol only when the roll gives an amount. On an attack it is the damage: a fighter's die reads 1 on the graze, 3 on the hits, 5 on the surges (Heavy Blow's 2 included) and 3 on the critical, and a goblin's surge reads 2+ for its Gang Up. On Heal, Prayer of Healing and Mending Chant it is the healing; on Defend, the Guard; on Weaken and Curse, the damage penalty. Other powers (Hide, Taunt, Slow...) show the symbols alone. Nothing misses. Each class has its own mix of faces and its own die colour.
- **Attacks add up.** An attack rolls 2 dice and deals the numbers on them. Each surge also triggers the class's surge, and each critical rolls another die, which can explode again. An attack after the first in the same turn rolls 1 die.
- **Powers take the best die.** A power rolls 2 dice and the best symbol sets the result: each power says what a graze, hit, surge and critical do. Surges add a special effect; criticals give the enhanced version. A power can be used once a turn.

| Class | Graze | Hit | Surge | Crit | Damage | Speed | Surge on an attack | Powers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brakka, fighter | 1 | 2 | 2 | 1 | 3 | 3 | **Heavy Blow:** 2 more damage | **Defend** (Guard: each attack on you deals less), **Taunt** (goblins must attack you), **Interpose** (attacks on another hero hit you) |
| Vex, rogue | 2 | 1 | 1 | 2 | 2 | 4 | **Vanish:** back into hiding | **Hide** (goblins cannot attack you; your next strike doubles its roll), **Poison Blade** (your next attacks poison), **Throwing Knives** (an attack that reaches the back rank) |
| Orlen, wizard | 2 | 1 | 2 | 1 | 2 | 2 | **Arc:** 1 damage to every other goblin | **Fireball** (both actions: every goblin takes one roll), **Weaken** (its attacks deal less), **Slow** (it loses actions) |
| Sister Wenna, cleric | 1 | 2 | 2 | 1 | 2 | 2 | **Mercy:** the most wounded hero heals 2 | Attacks at range. **Heal** (raises the fallen), **Bless** (a hero's next attack gets more dice), **Prayer of Healing** (both actions: every hero heals) |
| Goblin fighter | 2 | 2 | 1 | 1 | 2 | 3 | **Gang Up:** +1 per other goblin fighter | Two attacks a turn. |
| Goblin shaman | 2 | 2 | 1 | 1 | 2 | 2 | **Mend:** the most wounded goblin heals 2 | **Mending Chant**, **Curse** (a hero's attacks deal less; Heal lifts it), then a hex bolt. |

- **Ranks:** melee reaches only the front rank while anyone stands in it; ranged attacks and spells reach anyone. Brakka and Wenna are the party's front rank.
- **Down and out:** a hero at 0 HP is down until healed. The fight ends when one side has no one standing.

Choosing an action opens a card over the dungeon that says what it does: for an attack, the dice it will roll and what each face deals (each goblin in reach shows the average damage and the chance to finish it); for a power, each of the four results with the chance of rolling it. Tap any goblin, or any hero you aren't picking between, for its **sheet**: stats (speed among them), the six faces of its die with their attack numbers, what each face does, every action with its four results and their odds, its statuses, and what it has done this fight. Press and hold opens any sheet.

## Testing rule changes

- **Tune** (on any sheet) changes max HP, damage, speed and the die's faces (tap a face to cycle graze → hit → surge → critical). Changes apply to every unit of that type, now and in later fights, and are kept in the browser. The menu resets them.
- **House rules** in the menu: whether criticals explode.
- **Auto-play the party** lets the heroes play themselves, so you can watch a rule set run.
- **Simulate 1,000 fights** plays whole fights with a simple party bot against the goblins, using the numbers as they stand, and reports win rate, length, how often each hero falls, and damage dealt, taken and healed per character.

For changes beyond those, every number and rule lives in tables at the top of `js/rules.js`:

| Table | What it holds |
| --- | --- |
| `TUNE` | House rules: actions a turn, dice an attack or power rolls, dice for a second attack, graze damage, crits explode. |
| `SURGES` | What each class's surge adds to an attack. |
| `ACTIONS` | Every hotbar action: attack or power, action cost, target, reach, recharge, for powers what each face does, and for powers that give an amount the amount per face (`nums`, also printed on the dice). The effects themselves are in `power()`. |
| `UNITS` | Each character's stats (speed among them), rank, reach, face mix (`dice`) and actions. |
| `PARTY`, `ENCOUNTER` | Who fights. Initiative is `nextUp()`: speed, then heroes before goblins, then your pick among heroes and HP among goblins. |

## Code

The rules decide everything and know nothing of the screen; the view shows what happened and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`DV`). A battle is plain JSON; `start`, `act` and `endTurn` change it and return events; `queue` lays out the round in initiative order. Also the goblins' minds, the party bot, the odds and the simulator. Runs in Node too. |
| `js/art.js` | All the pictures, painted in code: pixel portraits, the goblins, the dungeon's stone, and the dice's four symbols with their damage numbers (as canvas drawings for the dice and as SVG for the page). |
| `js/scene.js` | The dungeon in three.js: the corridor and torches, the goblin figures, effects, and the d6s (drawn in a second pass from above, the face that came up lit and the others darkened, so it is the one you read). |
| `js/ui.js` | The portraits, turn order, readout, hotbar, sheets and menus, and the player that turns the rules' events into animation. |
| `js/vendor/three.min.js` | three.js r128. |

| Command | What it does |
| --- | --- |
| `node delve/tools/sim.js 2000` | Plays 2,000 fights in Node and prints the same report as the in-page simulator. `EXPLODE=0` turns exploding criticals off for the run. |
| `node delve/tools/test.js 3` | Browser test (Playwright with Chromium): plays 3 fights through real taps (picking between tied heroes by their portraits, both actions of each turn, powers and early ends), checking after every action that the bars show the HP the rules hold; then checks that the fastest acts first, that End passes a turn, that tied heroes are marked and picked by a tap, that tuning survives a reload and resets, and that the simulator runs. `--shots` keeps screenshots. |

With the default numbers (goblin fighters at 30 HP), the bot party wins about 95% of fights, in about 5 rounds, and someone falls in about half of them (most often Brakka, who draws the blows). Vex, with two criticals on his die, deals the most damage.
