# Goblin Crypt

A tabletop tactics game on a 3D board, played as a roguelike run. Four heroes (Brakka the fighter, Sister Wenna the cleric, Orlen the mage and Vex the thief) climb three acts down to the Goblin King: the Marches, the Crypt and the Deep Forge, each a branching map of fights, elites, events, campsites, shops and chests, with a boss at the bottom on a larger map. Health carries from battle to battle; relics, new actions, upgrades and better gear carry the party through.

## Play

[Play Goblin Crypt on GitHub Pages](https://sjfranks.github.io/Tactics/), or open `index.html` in a browser. There is no build step.

## How it plays

- **A run:** three acts of 12 floors and a boss each. Pick a room on the map, one floor at a time: **fights**, **elites** (a pack led by a champion, guarding a relic), **?** events (sometimes an ambush), **campsites** (rest 30%, or train to upgrade an action), **shops** and **chests**. The bosses are Old Greyhide the Warg Mother, Morga the Bone Witch and Grubnash the Goblin King. [docs/RUN.md](docs/RUN.md) has the structure and the difficulty curve.
- **Between battles:** health carries over (a hero down at a victory gets up with 15%; the party heals fully between acts). After a fight, take the gold and pick one of three rewards: a new action (12 to learn), an upgrade (every action has one, marked +), or more health. **Relics** (29 of them) give the party lasting powers. **Shops** sell actions, weapons, armour, relics, draughts and training.
- **The title screen** begins or continues a run, or opens the **level select**: the six set battles on their own, with the boons a party would have earned by then. Settings has a way back to it (Main menu).
- **The Reeve's House:** two 6×8 floors, one directly above the other, joined by a stair. A switch on the left edge of the screen (or F, Page Up, Page Down) shows the upper or the ground floor, XCOM style; the view also follows the piece whose turn it is.
- **Turns:** every piece rolls initiative once at the start of the battle, and heroes and goblins alternate. Heroes have 3 actions, goblins 2; moving is an action and so is each ability.
- **Dice:** real dice, thrown on the table. A 1 misses, a top face is a crit that explodes and cuts through armour, and the target's armour (the shield on its nameplate) takes a fixed amount off the rest. Each attack after the first in a turn rolls with disadvantage.
- **Planning:** foe intent arrows show whom each goblin means to strike or where it would walk; the odds over each target show the damage to expect and the chance to finish it.
- **Down, not dead:** a hero at 0 HP lies where they fell until Heal raises them (Heal works three times a battle). The battle, and the run, is lost only when every hero is down.
- **Undo** takes back moves and abilities that rolled no dice. Dice are final.
- **The save:** the run saves itself in the browser after every move, so you can close the page and come back to the same turn or room.
- **Settings:** difficulty (goblins have 75%, 100% or 125% of their health), game speed, music, banter, model style, giving up the run.
- **Dialogue:** the party sets out with a word, the bosses have their scenes, and figures call out in the fight.
- **Keys:** 1–5 pick an ability, E or Enter ends the turn, Z undoes, Esc puts the ability down, F switches floors.

The in-game *How to play* sheet (☰ menu) has the full rules, and the first battle explains itself with tips as things come up.

## Code

The rules decide everything and know nothing of the screen; the table (the view) shows what happens and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`GC`): stat blocks, abilities, boons, maps, dice, movement, sight and the goblins' minds. No graphics code. A battle is plain JSON; every order (`move`, `act`, `endTurn`) changes it and returns a list of events. Runs in Node too. |
| `js/run.js` | The run (`RUN`): the acts and their packs, the map, rooms, rewards, campsites, shops, events, chests, gold and relics. Plain JSON, no graphics; runs in Node too. |
| `js/dialogue.js` | Everything the characters say: a scene before and after each battle, and the barks called out in the fight. Plain data; edit freely. |
| `js/table/` | The table, in scripts that share one scope and load in order: `core` (geometry, UI state, the clock, sound and music, renderer, textures, particles), `board` (the diorama), `dice`, `minis` (the miniatures), `pieces` (the pieces on the board), `effects` (what each event looks like), `talk` (speech bubbles and scenes), `play` (the event player, orders, undo, the end of a battle), `hud` (hotbar, odds, foe intents, tips), `input` (pointer, keys, buttons, the floor switch), `run` (the save, laying out a battle, the title, the act map and the rooms between battles) and `main` (camera, frame loop, start-up). |
| `index.html` | Styles, markup and the help sheet. |
| `js/vendor/three.min.js` | three.js r128. |

### Tools

| Command | What it does |
| --- | --- |
| `node tools/sim.js 500 all` | Balance simulator: plays whole battles with a greedy hero bot against the real goblin AI, each with the boons a party would have earned by then. Add `DIFF=easy` or `DIFF=hard`, `BOONS=0` to fight without boons, `DMG=1` to split damage to heroes by source. Stops on any broken rule. |
| `node tools/runsim.js 120` | Run simulator: the bot plays whole runs (its own picks of rooms, rewards, campsites, shops and events) and reports each fight's cost and how many runs get past each boss, against the Slay the Spire data in docs/RUN.md. |
| `node tools/test.js` | Browser tests (Playwright with Chromium): real taps and drags on the page, from moving and undoing to picking a boon, the save surviving a reload and the campaign's end. `--autoplay=0,4` also plays those battles through the real view with the bot, checking after every order that the table shows what the rules say. `--shots` keeps screenshots. |
| `node tools/smoke.js` | A quick browser check: the game loads and reaches a hero's turn without errors. |

GitHub Actions runs a check on every push and pull request (every script parses; the simulator plays 60 battles of each set level and 20 whole runs) and deploys `index.html` and `js/` from `main` to GitHub Pages.

### Retuning

Every battle number lives in the tables at the top of `js/rules.js` (`TUNE`, `UNITS`, `CARDS`, `RELICS`, `BOONS` and `LEVELS`); the run's are at the top of `js/run.js` (`ACTS`, `GOLD`, `PRICES`, `HEAL`, `EVENTS`). A level marked `extra` is played from the level select only; `deck` lays a second floor over the map, and a prop or foe with a fourth number stands on it. Change them, then check the difficulty curve:

```sh
node tools/runsim.js 120      # whole runs: each fight's cost, act by act, and survival past each boss
node tools/sim.js 500 all     # the set battles: battles per level, all levels (or a level index)
```

On Normal, 85% of the bot's runs get past the first boss, 65% past the second and 63% win, against 85%, 68% and 61% in the Slay the Spire data; each kind of fight costs about the same share of the party's health as there (docs/RUN.md has the table). The bot ignores foe intents and plays one action at a time, so people do better.

## Archive

Earlier projects in this repository are kept in `archive/`: Rogue Tactics (`archive/rogue-tactics/`, the game that was at the root before), Emberwatch v1, the pre-1e rulebook and the Tactics 48 prototype. Each has an `ARCHIVED.md` explaining how to bring it back.
