# Goblin Delve

A test bench for tabletop combat rules, laid out like a dungeon crawler and made for a phone held upright. The party's portraits run down the right side (Brakka the fighter, Orlen the mage, Sister Wenna the cleric, Vex the rogue). Three goblin fighters stand in the corridor in front of them, and a goblin shaman stands on a step behind. The hotbar along the bottom holds the acting hero's actions and powers. Every roll is thrown as 3D d6s onto the dungeon floor.

Open `delve/index.html` in a browser (there is no build step). Once this is on `main`, GitHub Pages serves it at `/Tactics/delve/`.

## How a fight works

- **Initiative is speed.** Every character has a speed stat, and every round the fastest acts first: Vex (4), then Brakka and the goblin fighters (3), then Orlen, Wenna and the shaman (2). A hero and a goblin on the same speed: the hero goes first. Heroes on the same speed: you choose which goes first, by tapping a ready portrait (the round strip marks them "pick"). Goblins on the same speed: the one with the most HP left goes first, so wounding a goblin also slows it down; still tied, front rank before back rank, left to right.
- **A turn is two actions**, for heroes and goblins alike: typically an attack and a power. Big spells (Fireball, Prayer of Healing) take both. **End** finishes a turn early.
- **The dice:** everyone rolls the same d6: 1, 1, 2, 2, 3, 3. The 3s carry the **surge** mark (the critical's burst), the 1s a **setback** mark (a cracked red disc), the 2s nothing. A face shows its number only when the roll gives an amount; the die's colour says whose it is.
- **Attacks add up.** An attack rolls 2 dice and the numbers are its damage; an attack after the first in the same turn rolls 1 die. On an attack, every 3 triggers the character's surge and every 1 their setback, and each character's are different. Surges don't explode, except Vex's (a house rule makes everyone's explode).
- **Powers roll too.** Heals roll 2 dice and heal the total. Every other power rolls 1 die: a 1 gives its weakest result, a 2 the normal one, a 3 the strongest. On Defend, Weaken and Curse the number is the amount (Guard, a damage penalty); on the rest the dice show only their marks. A power can be used once a turn.

| Character | Speed | HP | Surge (a 3 on an attack) | Setback (a 1 on an attack) | Powers |
| --- | --- | --- | --- | --- | --- |
| Vex, rogue | 4 | 16 | **Explode:** roll one more die and add it; it can explode too | **Miss:** that die deals nothing | **Hide** (goblins cannot attack you; your next strike doubles its roll), **Poison Blade** (your next attacks poison), **Throwing Knives** (an attack that reaches the back rank) |
| Brakka, fighter | 3 | 24 | **Shield Up:** +1 Guard until his next turn | **Off Balance:** the next attack on him deals 1 more | **Defend** (Guard equal to the roll), **Taunt** (goblins must attack him), **Interpose** (attacks on another hero hit him) |
| Orlen, wizard | 2 | 14 | **Arc:** 1 damage to every other goblin | **Backlash:** he takes 1 damage | **Fireball** (both actions: every goblin takes one roll), **Weaken** (its attacks deal the roll less), **Slow** (it loses actions) |
| Sister Wenna, cleric | 2 | 20 | **Mercy:** the most wounded hero heals 2 | **Spent:** her next heal is 1 less | Attacks at range. **Heal** (2 dice; raises the fallen), **Bless** (a hero's next attack gets more), **Prayer of Healing** (both actions: every hero heals 2 dice) |
| Goblin fighter | 3 | 20 | **Gang Up:** +1 per other goblin fighter standing (its 3s read "3+") | **Fumble:** it loses its next action | Two attacks a turn. |
| Goblin shaman | 2 | 16 | **Mend:** the most wounded goblin heals 2 | **Backfire:** it takes 1 damage | **Mending Chant**, **Curse** (a hero's attacks deal the roll less; Heal lifts it), then a hex bolt. |

- **Ranks:** melee reaches only the front rank while anyone stands in it; ranged attacks and spells reach anyone. Brakka and Wenna are the party's front rank.
- **Down and out:** a hero at 0 HP is down until healed. The fight ends when one side has no one standing.

Choosing an action opens a card over the dungeon that says what it does: for an attack, the dice it will roll and what a 1, 2 and 3 do (each goblin in reach shows the average damage and the chance to finish it); for a power, its results with the chance of each. **The action a hero used last stays chosen for them**, on their next turn too, so repeating it takes one tap. Tap any goblin, or any hero you aren't picking between, for its **sheet**: stats (speed among them), the six faces of its die, its surge and setback, every action with its results and their odds, its statuses, and what it has done this fight. Press and hold opens any sheet.

## Testing rule changes

- **Tune** (on any sheet) changes max HP, speed and the die's faces (tap a face to cycle 1 → 2 → 3). Changes apply to every unit of that type, now and in later fights, and are kept in the browser. The menu resets them.
- **House rules** in the menu: whether every surge explodes (Vex's always do).
- **Auto-play the party** lets the heroes play themselves, so you can watch a rule set run.
- **Simulate 1,000 fights** plays whole fights with a simple party bot against the goblins, using the numbers as they stand, and reports win rate, length, how often each hero falls, and damage dealt, taken and healed per character.

For changes beyond those, every number and rule lives in tables at the top of `js/rules.js`:

| Table | What it holds |
| --- | --- |
| `TUNE` | House rules: actions a turn, dice an attack rolls, dice for a second attack, whether every surge explodes. |
| `SURGES`, `SETBACKS` | What a 3 and a 1 do on each character's attack. The effects are in `surge()` and `setback()`. |
| `ACTIONS` | Every hotbar action: attack or power, action cost, target, reach, recharge; for powers how many dice, how they are read (`total` or one `die`), what a 1, 2 and 3 do (`rows`), and whether the number is the amount (`amount`). The effects themselves are in `power()`. |
| `UNITS` | Each character's HP, speed, rank, reach, surge, setback and actions. `DIE` is everyone's starting die. |
| `PARTY`, `ENCOUNTER` | Who fights. Initiative is `nextUp()`: speed, then heroes before goblins, then your pick among heroes and HP among goblins. |

## Code

The rules decide everything and know nothing of the screen; the view shows what happened and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`DV`). A battle is plain JSON; `start`, `act` and `endTurn` change it and return events; `queue` lays out the round in initiative order. Also the goblins' minds, the party bot, the odds and the simulator. Runs in Node too. |
| `js/art.js` | All the pictures, painted in code: pixel portraits, the goblins, the dungeon's stone, and the dice's faces and marks (as canvas drawings for the dice and as SVG for the page). |
| `js/scene.js` | The dungeon in three.js: the corridor and torches, the goblin figures, effects, and the d6s (drawn in a second pass from above, the face that came up lit and the others darkened, so it is the one you read). |
| `js/ui.js` | The portraits, turn order, readout, hotbar, sheets and menus, and the player that turns the rules' events into animation. |
| `js/vendor/three.min.js` | three.js r128. |

| Command | What it does |
| --- | --- |
| `node delve/tools/sim.js 2000` | Plays 2,000 fights in Node and prints the same report as the in-page simulator. `EXPLODE=1` makes every surge explode for the run. |
| `node delve/tools/test.js 3` | Browser test (Playwright with Chromium): plays 3 fights through real taps (picking between tied heroes by their portraits, both actions of each turn, powers, the last action kept chosen, early ends), checking after every action that the bars show the HP the rules hold; then checks that the fastest acts first, that End passes a turn, that tied heroes are marked and picked by a tap, that tuning survives a reload and resets, and that the simulator runs. `--shots` keeps screenshots. |

With the default numbers, the bot party wins about 93% of fights, in about 5 rounds, and someone falls in about 43% of them (most often Brakka, who draws the blows). Vex, whose 3s explode, deals the most damage. With every surge exploding (the house rule) the goblins gain more than the party: about 82%.
