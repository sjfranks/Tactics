# Archived: Tactics 48

This folder is the Tactics 48 prototype exactly as it stood at commit `55da699` ("Auto-select active hero on initiative turn"), before Emberwatch replaced it at the repository root.

## Reactivating it

1. Move the contents of this folder back to the repository root, replacing Emberwatch's `index.html`, `README.md` and `.github/workflows/pages.yml`:

   ```sh
   git rm archive/tactics48/ARCHIVED.md
   git rm index.html README.md .github/workflows/pages.yml   # or git mv them into archive/emberwatch/ to keep Emberwatch
   git mv archive/tactics48/.github/workflows/pages.yml .github/workflows/pages.yml
   git mv archive/tactics48/.gitignore archive/tactics48/.openai .
   git mv archive/tactics48/* .
   ```

2. Run `npm install` and `npm run build` to check it still builds.
3. Push to `main`; the restored workflow builds with Vite and deploys `build/` to GitHub Pages.

Alternatively, check out commit `55da699` directly to see the project in its original layout.
