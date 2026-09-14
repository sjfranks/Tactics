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

The 12×16 tactical battle is the default mode. Its map is assembled from reusable 16×16 terrain tiles in `src/tacticalMap.ts`. The generated early-PC-style terrain atlas leaves generous black negative space, while 24×24 character sprites overhang their one-tile tactical footprints. All art is rendered with nearest-neighbour scaling. SVG owns interaction geometry, routes and camera transforms. The 30×30 exploration prototype remains available from Settings and transitions into tactical combat when enemies are encountered.

The bundled Web437 IBM CGA webfont is from [The Ultimate Oldschool PC Font Pack](https://int10h.org/oldschool-pc-fonts/) by VileR and is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## iOS path

The browser build remains compatible with a later Capacitor wrapper. Once gameplay stabilizes, add `@capacitor/core`, `@capacitor/cli`, and `@capacitor/ios`, point Capacitor at `build`, and generate the Xcode project.
