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

The 6×8 tactical battle is the default mode. SVG owns the battlefield, keeping grid geometry resolution-independent and allowing future PNG/WebP pixel art or painterly character artwork to be embedded without changing the renderer. The 30×30 exploration prototype remains available from Settings and transitions into tactical combat when enemies are encountered.

## iOS path

The browser build remains compatible with a later Capacitor wrapper. Once gameplay stabilizes, add `@capacitor/core`, `@capacitor/cli`, and `@capacitor/ios`, point Capacitor at `build`, and generate the Xcode project.
