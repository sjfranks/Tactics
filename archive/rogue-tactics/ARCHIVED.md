# Archived: Rogue Tactics

This folder is Rogue Tactics, the pixel-art tactics roguelite, exactly as it stood at commit `7ad7416` ("A simple start that grows: chosen reactions, ready actions, one-power kits (#46)"), before Goblin Crypt replaced it at the repository root. Its rule books are in `docs/rules/` here.

## Reactivating it

1. Move Goblin Crypt aside and put this folder's contents back at the repository root:

   ```sh
   mkdir -p archive/goblin-crypt && git mv index.html README.md js tools archive/goblin-crypt/
   git rm archive/rogue-tactics/ARCHIVED.md
   git mv archive/rogue-tactics/.github/workflows/pages.yml .github/workflows/pages.yml
   git mv archive/rogue-tactics/* .
   ```

2. Open `index.html` in a browser to check it runs (no build step).
3. Push to `main`; the workflow publishes `index.html` and `js/` to GitHub Pages.

Alternatively, check out commit `7ad7416` to see the project in its original layout.
