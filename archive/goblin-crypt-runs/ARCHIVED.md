# Archived: Goblin Crypt, the roguelike run version

This folder is Goblin Crypt as a roguelike run, exactly as it stood on `main` at commit `7c8ce32` ("The run on screen:
title, act map, rewards, campsites, shops, events, chests"). The game at the repository root went back to the simpler
version before it (commit `0d8841e`), keeping only the newer camera.

What this version has that the root does not:

- **Runs:** three acts (the Marches, the Crypt, the Deep Forge), each a branching map of 12 floors and a boss, with
  fights, elites led by champions, events, campsites, shops and chests. Health carries from battle to battle.
- **Rewards and gear:** a pick of three after each fight (12 actions to learn, an upgrade for every action, more
  health), 29 relics, and shops for actions, weapons, armour, relics, draughts and training.
- **New foes:** Old Greyhide the Warg Mother and Morga the Bone Witch as bosses, the goblin brute, and champions.
- **Nine more maps**, three of them larger boss maps.
- **A difficulty curve** tuned against the Slay the Spire run data: `docs/RUN.md` explains it, and `tools/runsim.js`
  plays whole runs with the battle bot to check it.
- Heal limited to three uses a battle (with health carried over, unlimited healing made every wound free).

It runs from this folder as it is: open `index.html` in a browser (no build step). `node tools/runsim.js 100` and
`node tools/test.js` work from here too.

## Reactivating it

1. Move the root game aside and put this folder's contents back at the repository root:

   ```sh
   mkdir -p archive/goblin-crypt-simple && git mv index.html README.md js tools archive/goblin-crypt-simple/
   git rm archive/goblin-crypt-runs/ARCHIVED.md
   git mv archive/goblin-crypt-runs/* .
   ```

2. Add the run simulator back to `.github/workflows/check.yml`, after the battle simulator:

   ```yaml
         - name: Simulated runs, three acts each
           run: node tools/runsim.js 20
   ```

3. Open `index.html` in a browser to check it runs, then push to `main`; the Pages workflow publishes `index.html`
   and `js/`.

To bring back the newer camera as well, cherry-pick it on top: commit `618a436` ("A tactics-RPG camera") was made
against this version.

Alternatively, check out commit `7c8ce32` to see it in its original layout.
