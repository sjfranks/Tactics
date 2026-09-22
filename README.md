# Tactics 48

A portrait-first, touch-friendly RPG prototype that joins a free-roaming Avaran exploration layer to complete **6 × 8 tactical encounters**.

## Play

[Play Tactics 48 on GitHub Pages](https://sjfranks.github.io/Tactics/)

## What is in the prototype

- A non-tile, continuously scrolling exploration map set in Valmora's Outer Quarter
- Dragon Quest–inspired analog movement: drag the centre circle to walk and tap it to interact
- Four visible party members following the leader in formation
- Buildings, trees, walls and a river with physical collision, depth sorting and Baldur's Gate–style translucent occlusion
- Interactive townspeople and objects, dialogue, map, party and journal menus
- Three arena masters who launch the test encounters, with a full battle-to-town return loop
- Four heroes with distinct positioning kits: Fighter, Rogue, Wizard and Cleric
- Five enemy roles with role-specific AI: Skirmisher, Brute, Controller, Guardian and Archer
- Alternating hero/enemy activations with one Move, one Action and one Reaction per round
- No-whiff combat: 2d6 + Power produces Tier 1, Tier 2 or Tier 3 results
- Diagonal movement, engagement, flanking, cover, high ground, difficult terrain, hazards, line of sight and collision damage
- Push, Pull, Slide, walls, destructible terrain and interactive objectives
- Six conditions: Dazed, Exposed, Rooted, Slowed, Burning and Guarded
- Shared Momentum earned through tactical play and spent on Heroic powers
- Downed/revival rules, combat forecasts, logs, undo, unit sheets, touch dragging and pinch zoom
- Three designed missions:
  - **The Broken Gate** — Destroy / Boss
  - **The Ember Shrine** — Interrupt / Hold / Survive
  - **Rescue at Ash Bridge** — Rescue / Escort / Escape

## Development

Run npm install and npm run dev. Production checks are npm run typecheck and npm run build.

Vite writes the production site to build/. GitHub Actions builds and deploys main to GitHub Pages.

## Architecture

- src/tactics48.ts — rules data, unit kits, powers, enemy roles and mission definitions
- src/main.ts — tactical game state, pathfinding, combat resolution, objectives, AI and touch interaction
- src/exploration.ts — free movement, camera, formation following, collision, occlusion, NPC interaction and encounter handoff
- src/canvasBattlefield.ts — layered Canvas renderer driven by the live SVG interaction scene
- src/phaser.css — mobile HUD, setup screen, drawers and responsive layout (legacy filename; no Phaser dependency)
- index.html — application shell and accessible controls

The browser build remains compatible with a later Capacitor wrapper.
