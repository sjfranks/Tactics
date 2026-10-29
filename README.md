# Goblin Crypt

A tabletop tactics game on a 3D board. Four heroes (Brakka the fighter, Sister Wenna the cleric, Orlen the mage and Vex the thief) fight through four battles to the Goblin King: the Gorge Crossing, Goblin Ridge, the Warg Pens and the Throne of Grubnash.

## Play

[Play Goblin Crypt on GitHub Pages](https://sjfranks.github.io/Tactics/), or open `index.html` in a browser. There is no build step.

## How it plays

- **Turns:** every piece rolls initiative each round, and heroes and goblins alternate. Heroes have 3 actions, goblins 2; moving is an action and so is each ability.
- **Dice:** real dice, thrown on the table. A 1 misses, a top face is a crit that explodes and ignores toughness, and the target's toughness die soaks the rest. Each attack after the first in a turn rolls with disadvantage.
- **Planning:** foe intent arrows show whom each goblin means to strike or where it would walk; the odds over each target show the damage to expect and the chance to finish it.
- **Down, not dead:** a hero at 0 HP lies where they fell until Heal raises them. The battle is lost only when every hero is down.
- **Undo** takes back moves and abilities that rolled no dice. Dice are final.

The in-game *How to play* sheet (☰ menu) has the full rules.

## Code

| File | What it is |
| --- | --- |
| `js/rules.js` | The rules (`GC`): stat blocks, abilities, maps, dice, movement, sight and the goblins' minds. No graphics code. A battle is plain JSON; every order (`move`, `act`, `endTurn`) changes it and returns a list of events. |
| `js/view.js` | The table: the three.js diorama, miniatures, dice, sound and HUD. It decides nothing: it asks the rules what a hero may do, sends orders, and plays back the events. |
| `index.html` | Styles and markup. |
| `js/vendor/three.min.js` | three.js r128. |
| `tools/sim.js` | Balance simulator: plays whole battles with a greedy hero bot against the real goblin AI. |
| `tools/smoke.js` | Browser smoke test (Playwright): loads the game and plays to the first hero turn. |

### Retuning

Every number lives in four tables at the top of `js/rules.js`: `TUNE`, `UNITS`, `CARDS` and `LEVELS`. Change them, then check the difficulty curve:

```sh
node tools/sim.js 500 all     # battles per level, all levels (or a level index)
```

With 500 battles per level the bot wins 100%, 98%, 93% and 67% of the four battles, with 0.45, 1.6, 2.4 and 2.75 heroes downed per battle.

## Archive

Earlier projects in this repository are kept in `archive/`: Rogue Tactics (`archive/rogue-tactics/`, the previous game at the root), Emberwatch v1, the pre-1e rulebook and the Tactics 48 prototype. Each has an `ARCHIVED.md` explaining how to bring it back.
