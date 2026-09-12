# Tactics

A portrait-first, touch-friendly tactical battle prototype built with **Phaser + TypeScript + Vite**.

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

Vite writes the production site to `build/`. GitHub Actions builds and deploys it to GitHub Pages on changes to `main`. The old `dist/` folder is retained temporarily as a migration reference and for its existing stylesheet.

## Architecture

- `src/main.ts` — typed game state, tactical/exploration rules, Phaser scenes/input/rendering
- `src/phaser.css` — compatibility layer allowing Phaser to own the battlefield canvas
- `dist/styles.css` — legacy UI chrome retained during the first migration pass and bundled by Vite
- `index.html` — application shell
- `vite.config.ts` / `tsconfig.json` — web build and type checking

The 6×8 tactical battle remains the default mode. The 30×30 exploration prototype remains available from Settings and transitions into combat when enemies are encountered.

## iOS path

The browser build is intentionally compatible with a later Capacitor wrapper. Once gameplay stabilizes, add `@capacitor/core`, `@capacitor/cli`, and `@capacitor/ios`, point Capacitor at `build`, and generate the Xcode project.
