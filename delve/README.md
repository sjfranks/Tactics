# Goblin Delve

A test bench for tabletop combat rules, laid out like a dungeon crawler and made for a phone held upright. The party's portraits run down the right side (Brakka the fighter, Orlen the mage, Sister Wenna the cleric, Vex the rogue). Three goblin fighters stand in the corridor in front of them, and a goblin shaman stands on a step behind. The hotbar along the bottom holds the acting hero's actions and powers. Every roll is thrown as 3D dice onto the dungeon floor, each character's own size and colour.

Open `delve/index.html` in a browser (there is no build step). Once this is on `main`, GitHub Pages serves it at `/Tactics/delve/`.

## How a fight works

- **Initiative is a roll.** At the start of every round, everyone rolls a d6 and adds their speed (Vex 4; Brakka and the goblin fighters 3; Orlen, Wenna and the shaman 2); the highest total acts first. The round strip shows each total. A hero and a goblin on the same total: the hero goes first. Heroes on the same total: you choose which goes first, by tapping a ready portrait (the strip marks them "pick"). Goblins on the same total: the one with the most HP left goes first, so wounding a goblin also slows it down; still tied, front rank before back rank, left to right.
- **A turn is two actions**, for heroes and goblins alike: typically an attack and a power. Big spells (Fireball, Prayer of Healing) take both. **End** finishes a turn early.
- **The dice:** each character rolls a die of their own, numbered the usual way: Brakka a **d8**, Vex and Wenna a **d6**, Orlen a **d4**, the goblins d6s. The top number carries the surge's burst. The die's colour says whose it is.
- **Attacks roll to hit.** Roll 2 of your dice and add them: reach the target's **armour** and it's a hit, dealing your **damage**; fall short and it misses.
  - **Doubles** (matching dice) are a **crit**: double damage, and always a hit (a house rule makes them reach armour like any roll).
  - **A top number** on either die is a **surge**: the character's surge triggers, hit or miss.
  - **Both dice on the top number:** crit and surge, and the attack goes **again**.
  - Each attack after the first in the same turn has **disadvantage**: roll 3 and keep the lowest 2, the third 4. **Advantage** (Bless) keeps the highest 2. The two cancel.
  - **Guard** (Defend, Brakka's surge, Interpose's best result) is extra armour until the guarded one's next turn.
- **Powers roll one die, flat:** never with advantage or disadvantage. A heal heals the number rolled, and Frostbite's number is how many presses it gives. Every other power reads the band the number falls in: the low numbers (1 on a d4, 1–2 on a d6 or d8) give its weakest result, the top number its strongest, everything between the normal one. **Fireball** rolls a d6, with no roll to hit, and every goblin takes it. A power can be used once a turn.
- **Press.** Orlen's **Frostbite** makes a goblin **Brittle** (❄️) for as many presses as the roll. A hero whose attack lands on a Brittle goblin presses: they gain an extra action that turn (once a turn), and the goblin loses one of its presses. Brittle ends when Orlen's next turn starts. Since a further attack has disadvantage, the extra action is usually best spent on a power.

| Character | Speed | HP | Armour | Damage | Die | Surge (a top number on an attack) | Powers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vex, rogue | 4 | 14 | 6 | 4 | d6 | **Critical Hit:** a 6 crits too (double damage) | **Hide** (goblins cannot attack you; your next hit from hiding deals double), **Poison Blade** (your next attacks poison), **Throwing Knives** (an attack that reaches the back rank) |
| Brakka, fighter | 3 | 20 | 8 | 5 | d8 | **Shield Up:** Guard 2 (+2 armour) until his next turn | **Defend** (Guard 1, 2 or 3), **Taunt** (goblins must attack him), **Interpose** (attacks on another hero hit him) |
| Orlen, wizard | 2 | 12 | 5 | 3 | d4 | **Arc:** 1 damage to every other goblin | **Fireball** (both actions: a d6 to every goblin), **Frostbite** (Brittle: hits on it press), **Slow** (it loses actions) |
| Sister Wenna, cleric | 2 | 17 | 7 | 3 | d6 | **Mercy:** the most wounded hero heals 3 | Attacks at range. **Heal** (heals the roll; raises the fallen), **Bless** (advantage on a hero's next attack), **Prayer of Healing** (both actions: every hero heals the roll) |
| Goblin fighter | 3 | 15 | 7 | 3 | d6 | **Gang Up:** +1 damage per other goblin fighter standing | Two attacks a turn. |
| Goblin shaman | 2 | 14 | 6 | 2 | d6 | **Mend:** the most wounded goblin heals 3 | **Mending Chant**, **Curse** (a hero's hits deal 1 to 3 less; Heal lifts it), then a hex bolt. |

- **Ranks:** melee reaches only the front rank while anyone stands in it; ranged attacks and spells reach anyone. Brakka and Wenna are the party's front rank.
- **Down and out:** a hero at 0 HP is down until healed. The fight ends when one side has no one standing.

Choosing an action opens a card over the dungeon that says what it does: for an attack, the dice it will roll and the surge on its top number (each goblin in reach shows the chance to hit 🎯, the average damage, the chance to finish it, and ❄+1 if hitting it would press); for a power, each band of numbers with its result and its chance. **The action a hero used last stays chosen for them**, on their next turn too, so repeating it takes one tap. Tap any goblin, or any hero you aren't picking between, for its **sheet**: stats (speed among them), its die, its surge, every action with its results and their odds, its statuses, and what it has done this fight. Press and hold opens any sheet.

## Testing rule changes

- **Tune** (on any sheet) changes max HP, speed, armour, damage and the size of the die (d4, d6, d8 or d10). Changes apply to every unit of that type, now and in later fights, and are kept in the browser. The menu resets them.
- **House rules** in the menu: whether doubles always hit.
- **Auto-play the party** lets the heroes play themselves, so you can watch a rule set run.
- **Simulate 1,000 fights** plays whole fights with a simple party bot against the goblins, using the numbers as they stand, and reports win rate, length, how often each hero falls, and damage dealt, taken and healed per character.

For changes beyond those, every number and rule lives in tables at the top of `js/rules.js`:

| Table | What it holds |
| --- | --- |
| `TUNE` | House rules: whether doubles always hit, actions a turn, the most dice advantage or disadvantage can roll, presses a turn, how many times one attack can go again. |
| `SIZES`, `tierRange` | The dice the tray can throw, and how a power's die splits into low, middle and top. |
| `SURGES` | What a top number does on each character's attack. The roll to hit is read in `readHit()`, the surges' effects are in `surge()`. |
| `ACTIONS` | Every hotbar action: attack or power, action cost, target, reach, recharge, a die of its own (`die`) and whether it ignores advantage (`flat`); for powers how the die is read (`tier`: low, middle or top picks a line of `rows`; or `amount`: the number). The effects themselves are in `power()`. |
| `UNITS` | Each character's HP, speed, die, armour, damage, rank, reach, surge and actions. |
| `PARTY`, `ENCOUNTER` | Who fights. Initiative is `rollInit()` (a d6 plus speed, `TUNE.initDie`) and `nextUp()`: the highest total, then heroes before goblins, then your pick among heroes and HP among goblins. |

## Code

The rules decide everything and know nothing of the screen; the view shows what happened and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`DV`). A battle is plain JSON; `start`, `act` and `endTurn` change it and return events; `queue` lays out the round in initiative order. Also the goblins' minds, the party bot, the odds and the simulator. Runs in Node too. |
| `js/art.js` | All the pictures, painted in code: pixel portraits, the goblins, the dungeon's stone, and the dice's faces (numbers, with the surge's burst behind the top one) and marks, as canvas drawings for the dice and as SVG for the page. |
| `js/scene.js` | The dungeon in three.js: the corridor and torches, the goblin figures, effects, and the dice: d4, d6, d8 and d10, drawn in a second pass from above, the face that came up lit and the others darkened, so it is the one you read (a d4 lights its three upper faces and fades their other numbers, leaving the one at the top corner). |
| `js/ui.js` | The portraits, turn order, readout, hotbar, sheets and menus, and the player that turns the rules' events into animation. |
| `js/vendor/three.min.js` | three.js r128. |

| Command | What it does |
| --- | --- |
| `node delve/tools/sim.js 2000` | Plays 2,000 fights in Node and prints the same report as the in-page simulator. `CRITHITS=0` makes doubles reach armour like any roll. |
| `node delve/tools/test.js 3` | Browser test (Playwright with Chromium): plays 3 fights through real taps (picking heroes by their portraits, both actions of each turn, powers, the last action kept chosen, presses, early ends), checking after every action that the bars show the HP the rules hold; then checks that the highest initiative acts first, that End passes a turn, that heroes tied on initiative are marked and picked by a tap, that tuning survives a reload and resets, and that the simulator runs. `--shots` keeps screenshots. |

With the default numbers, the bot party wins about 93% of fights, in about 4.5 rounds, and someone falls in about 38% of them (most often Brakka, who draws the blows).
