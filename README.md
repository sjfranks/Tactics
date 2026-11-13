# Goblin Crypt

A tabletop tactics game on a 3D board. Four heroes (Brakka the fighter, Sister Wenna the cleric, Orlen the mage and Vex the thief) fight through five battles to the Goblin King: the Gorge Crossing, Goblin Ridge, the Warg Pens, the Forge Pits and the Throne of Grubnash. The level select also has the Reeve's House, a two-storey house fought on both floors.

## Play

[Play Goblin Crypt on GitHub Pages](https://sjfranks.github.io/Tactics/), or open `index.html` in a browser. There is no build step.

## How it plays

- **The title screen** begins or continues the campaign, or opens the **level select**: any battle on its own, with the boons a party would have earned by then, without touching the campaign's save. Settings has a way back to it (Main menu).
- **The Reeve's House:** two 6×8 floors, one directly above the other, joined by a stair. A switch on the left edge of the screen (or F, Page Up, Page Down) shows the upper or the ground floor, XCOM style; the view also follows the piece whose turn it is.
- **Turns:** every piece rolls initiative once at the start of the battle, and heroes and goblins alternate. Heroes have 3 actions, goblins 2; moving is an action and so is each ability.
- **Dice:** real dice, thrown on the table. A 1 misses, a top face is a crit that explodes and cuts through armour, and the target's armour (the shield on its nameplate) takes a fixed amount off the rest. Each attack after the first in a turn rolls with disadvantage.
- **Planning:** foe intent arrows show whom each goblin means to strike or where it would walk; the odds over each target show the damage to expect and the chance to finish it.
- **Down, not dead:** a hero at 0 HP lies where they fell until Heal raises them. The battle is lost only when every hero is down.
- **Undo** takes back moves and abilities that rolled no dice. Dice are final.
- **Experience:** in the campaign, heroes earn a little XP for every action (a hit, a kill, a heal, a helping spell) and for standing at a victory. Each 100 XP is a level (+2 max HP), and levels 2, 3 and 4 each teach a hero a new power: twelve in all, three each, such as Shield Bash, Smite, Chain Lightning and Throwing Knives. A hero's sheet shows how close the next level is.
- **The camera** looks up the board from the party's side, close in, and pans; when an attack, spell or heal is locked in, the dice are thrown first, then the grid fades and it closes in low behind the attacker (attacker left, target right) to watch the blow, and pulls back (Settings turns close-ups off).
- **The campaign:** after each victory the party makes camp and picks one of three **boons** (a reforged blade, a shield, Healing Draughts for everyone, faster prayers...). Boons last the rest of the campaign. The campaign saves itself in the browser after every move, so you can close the page and come back to the same turn.
- **Settings:** difficulty (goblins have 75%, 100% or 125% of their health), game speed, music, banter, model style, a new campaign.
- **Dialogue:** the party and the goblins trade words before and after each battle, and figures call out in the fight.
- **Keys:** 1–5 pick an ability, E or Enter ends the turn, Z undoes, Esc puts the ability down, F switches floors.

The in-game *How to play* sheet (☰ menu) has the full rules.

## Code

The rules decide everything and know nothing of the screen; the table (the view) shows what happens and decides nothing.

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`GC`): stat blocks, abilities, boons, maps, dice, movement, sight and the goblins' minds. No graphics code. A battle is plain JSON; every order (`move`, `act`, `endTurn`) changes it and returns a list of events. Runs in Node too. |
| `js/dialogue.js` | Everything the characters say: a scene before and after each battle, and the barks called out in the fight. Plain data; edit freely. |
| `js/table/` | The table, in scripts that share one scope and load in order: `core` (geometry, UI state, the clock, sound and music, renderer, textures, particles), `board` (the diorama), `dice`, `minis` (the miniatures), `pieces` (the pieces on the board), `effects` (what each event looks like), `talk` (speech bubbles and scenes), `play` (the event player, orders, undo, the end of a battle), `hud` (hotbar, odds, foe intents), `input` (pointer, keys, buttons, the floor switch), `campaign` (boons, the save, laying out a battle, the title screen and level select) and `main` (camera, frame loop, start-up). |
| `index.html` | Styles, markup and the help sheet. |
| `js/vendor/three.min.js` | three.js r128. |

### Tools

| Command | What it does |
| --- | --- |
| `node tools/sim.js 500 all` | Balance simulator: plays whole battles with a greedy hero bot against the real goblin AI, each with the boons a party would have earned by then. Add `DIFF=easy` or `DIFF=hard`, `BOONS=0` to fight without boons, `DMG=1` to split damage to heroes by source. Stops on any broken rule. |
| `node tools/test.js` | Browser tests (Playwright with Chromium): real taps and drags on the page, from moving and undoing to picking a boon, the save surviving a reload and the campaign's end. `--autoplay=0,4` also plays those battles through the real view with the bot, checking after every order that the table shows what the rules say. `--shots` keeps screenshots. |
| `node tools/smoke.js` | A quick browser check: the game loads and reaches a hero's turn without errors. |

GitHub Actions runs a check on every push and pull request (every script parses; the simulator plays 60 battles of each level) and deploys `index.html` and `js/` from `main` to GitHub Pages.

### Retuning

Every number lives in the tables at the top of `js/rules.js`: `TUNE`, `UNITS`, `CARDS`, `BOONS` and `LEVELS`. A level marked `extra` is played from the level select only; `deck` lays a second floor over the map, and a prop or foe with a fourth number stands on it. Change them, then check the difficulty curve:

```sh
node tools/sim.js 500 all     # battles per level, all levels (or a level index)
```

On Normal, with 400 battles per level and the levels a party would have reached by then, the bot wins about 100%, 98%, 98%, 89% and 80% of the five campaign battles, and 90% of the Reeve's House (runs vary by a few points). `LV0=1` fights without the levels. The bot ignores foe intents and plays one action at a time, so people do better.

## Tactics Chess

A second game in `chess/`: [play it](https://sjfranks.github.io/Tactics/chess/), or open `chess/index.html`. Chess pieces with tactics-game rules, on a 3D table in Goblin Crypt's style. Each side places its army on its back two rows (or Auto for the chess layout). White and Black alternate turns, and each turn one piece goes through three phases: **Move** (or stay), **Action** from where it stands, then **Facing**, which only that piece changes. Strikes roll 2d6 against a number; a blow to the back does double damage. Kill the enemy king, or, with no kings, the whole enemy army. Armies: full (16), skirmish (8) or pawns and a king (9). Play the computer or pass and play.

| Piece | Role | HP | Move | Actions and gifts |
| --- | --- | --- | --- | --- |
| Pawn | Defender | 10 | 3 | Attack 7+ for 5, never the front of a melee foe (ranged foes are fair game). Push 8+: the foe in front goes back a square and the pawn steps in; sure, and up to 2, with an ally right behind. Grapple 8+: drag a foe a square. An ally right behind a pawn is in cover. A foe leaving the 3 squares ahead of it draws an attack of opportunity. |
| Rook | Defender | 14 | 4 in a straight line | Attack 7+ for 5. Its shield makes blows to its front need 2 more. Attacks of opportunity like a pawn. |
| Bishop | Controller | 8 | 3 | Shoot 7+ for 4: the first foe along any of 8 lines within 4 squares, over friends. Pinning shot 7+: the foe cannot move on its next turn. Overwatch: a foe stepping into its 3 lines ahead gets shot. |
| Knight | Striker | 10 | 5, leaping | Attack 7+ for 6, +2 after riding 3 or more squares. Leaps over anything. |
| Queen | Striker | 12 | 4 straight, 8 ways | Attack 7+ for 6, diagonals too. Sweep 8+ for 4 against every foe round her. |
| King | Leader | 12 | 3 | Attack 7+ for 5. Rally: allies within 2 heal 2 and lose pins. Allies beside him need 1 less to hit. |

Free attacks (opportunity and overwatch) deal base damage, once per piece each turn. Shots at a piece in cover need 2 more. Every number is in `RULES` at the top of `chess/rules.js`.

**Playing:** in the move phase tap a blue square and confirm (amber squares draw a free attack, and the warning names who), or drag the piece, or Stay. Tap a foe to see its zone. In the action phase pick an action on the hotbar; foes it reaches from where the piece stands turn red with the odds over them; tap one and confirm. Then turn the piece and tap Done.

| File | What it is |
| --- | --- |
| `chess/rules.js` | The rules (`TC`) and every number (`RULES`), with the computer player. No screen code; runs in Node. |
| `chess/table.js` | The table: the three.js board, minis, facing marks, dice, hotbar, input and camera. |
| `chess/index.html` | Styles, markup and the How to play sheet. |
| `chess/vendor/three.min.js` | three.js r128, the same build Goblin Crypt uses. |

`node chess/test.js` runs the rule tests and 60 computer-against-computer games.

## Archive

Earlier projects in this repository are kept in `archive/`: Goblin Crypt as a roguelike run (`archive/goblin-crypt-runs/`: three acts of rooms, relics, shops and new actions, tuned against Slay the Spire run data), Rogue Tactics (`archive/rogue-tactics/`, the game that was at the root before), Emberwatch v1, the pre-1e rulebook and the Tactics 48 prototype. Each has an `ARCHIVED.md` explaining how to bring it back.
