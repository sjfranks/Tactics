# Tactics

A portrait-first, touch-friendly tactical battle prototype built with **TypeScript + SVG + HTML/CSS + Vite**.

## Play

[Play Tactics on GitHub Pages](https://sjfranks.github.io/Tactics/)

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Vite writes the production site to `build/`. GitHub Actions builds and deploys it to GitHub Pages on changes to `main`.

## Architecture

- `src/main.ts` — typed game state, tactical/exploration rules, pathfinding, AI, SVG rendering and touch interaction
- `src/phaser.css` — battlefield and HUD styling (legacy filename; no Phaser dependency remains)
- `index.html` — application shell and HTML HUD
- `vite.config.ts` / `tsconfig.json` — web build and type checking

The 6×8 tactical battle is the default mode. It uses one continuous illustrated battlefield behind a live 6×8 grid; `src/tacticalMap.ts` defines the matching full-cell collision mask, with each square representing roughly 10 feet. The presentation uses original painterly terrain and contained character sprites with a portrait-led blue-and-gold mobile tactical-RPG interface. A turn consists of one move and one relevant action: weapon attacks may be completed by dragging onto a target, while moving alone opens the contextual Attack, Heal, or Defend menu. SVG owns interaction geometry, routes and camera transforms; a canvas layer renders the artwork. The 30×30 exploration prototype remains available from Settings and transitions into tactical combat when enemies are encountered.


## iOS path

The browser build remains compatible with a later Capacitor wrapper. Once gameplay stabilizes, add `@capacitor/core`, `@capacitor/cli`, and `@capacitor/ios`, point Capacitor at `build`, and generate the Xcode project.
