# Emberwatch Tactics

A portrait-first, touch-friendly tactics roguelite. Four heroes, twelve battles over three acts, one dragon.

## Play

[Play Emberwatch on GitHub Pages](https://sjfranks.github.io/Tactics/)

## What is in the game

- Four heroes on a 6 × 8 grid: Brakka (Fighter), Vex (Rogue), Orin (Wizard) and Sela (Cleric), each with a class trait and resource
- 2d10 + Might power rolls with three result tiers, edges and banes, flanking, free strikes and forced movement
- Three acts (the Greenmarch, the Barrow Deeps, the Ashen Peaks), each ending in a boss with villain actions
- Eleven mission types: Rout, Ambush, Hold, Rescue, Plunder, Survive, Assassinate, Ritual, Defend, Breakout and Boss
- Enemy Malice for brutal strikes, specials and reinforcements
- Level-ups, power training and relics between battles (two relics active at once)
- Combat forecasts, danger overlay, undo, battle log, drag-to-move, synthesized music and sound, light/dark themes
- Runs save automatically in the browser

## Development

The whole game is `index.html`: no build step and no dependencies beyond Google Fonts. Open it in a browser to play locally.

GitHub Actions publishes `index.html` from `main` to GitHub Pages.

## Archive

The previous prototype, **Tactics 48** (Vite + TypeScript, with the Avaran exploration layer), is preserved in [`archive/tactics48/`](archive/tactics48/). See its README for how to bring it back.
