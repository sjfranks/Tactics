# Paragon: D&D 4e character builder

A phone-first character builder and play tracker for Dungeons & Dragons 4th Edition, in the spirit of Pathbuilder.
No build step and no server: open `index.html`, or visit the GitHub Pages copy at
[sjfranks.github.io/Tactics/dnd4e/](https://sjfranks.github.io/Tactics/dnd4e/) once this folder is on `main`.

## What it does

- **Build, level by level (1 to 30):** race, class and class options, ability scores (point buy, standard array or rolled),
  trained skills, languages, feats, at-will, encounter, daily and utility powers, ability increases, paragon path and epic destiny.
  The build tab lists what each level grants and flags anything left to choose or any prerequisite you don't meet.
  Powers gained at 13th, 15th, 17th level and later replace an earlier one, as in the Player's Handbook; wizards get their spellbook's second spell.
- **Sheet:** defenses, hit points, bloodied value, healing surges, initiative, speed, senses, ability scores and all 17 skills.
  Tap any number to see where it comes from. Bonus stacking follows the rules (same-type bonuses don't stack).
- **Powers:** 4e-style power cards (green at-will, red encounter, charcoal daily) with your attack bonus and damage worked out
  for the weapon or implement you have equipped, including proficiency, enhancement, feats and class features.
- **Gear:** every Player's Handbook weapon and armor, shields, implements, adventuring gear and magic items with enhancement bonuses.
  Equipped items feed straight into your numbers. Add your own bonuses for anything else.
- **Play:** hit points with damage, healing and temporary hit points, healing surges, second wind, action points,
  death saving throws, conditions, power use tracking, and short rest, extended rest and milestone buttons.
- **Compendium and glossary:** browse everything built in. Rules terms in descriptions (conditions, push, shift, combat advantage and so on)
  are tappable and open their definition.
- **Works offline** after the first visit, and can be added to the home screen. Characters are kept in the browser;
  export and import them as files or text.

## Content

Built in, with descriptions written for this app (short summaries, not the published text):

- Races: the 8 Player's Handbook races and the 5 Player's Handbook 2 races, with racial traits and powers, plus a custom race.
- Classes: the 8 Player's Handbook classes with full class features and heroic-tier powers (levels 1 to 10),
  the 8 Player's Handbook 2 classes with class features, and a custom class for anything else.
- Around 100 feats, including multiclass feats and the Essentials defense and expertise feats.
- Weapons, armor, implements, gear, and common magic items. Paragon path and epic destiny names from the Player's Handbook.

Some higher-level powers have only a one-line summary. Every entry has a **Full text** link that searches the
[4e Database](https://iws.mx/dnd/) for its official wording. To add anything that isn't built in (paragon and epic powers,
other books, hybrids), copy the entry from the 4e Database and paste it into Paragon: it reads the name, level, usage,
action, range, attack and damage, and keeps the entry on your device.

## Files

- `js/rules.js`: abilities, skills, defenses, level table, power slots, glossary and actions
- `js/races.js`, `js/classes.js`: races and classes, with their feature powers
- `js/powers-*.js`: class powers; `js/feats.js`, `js/items.js`, `js/paths.js`
- `js/engine.js`: the rules engine (every derived number and its breakdown, power slots, attack and damage)
- `js/parse.js`: reads text pasted from the 4e Database, and your personal compendium of pasted entries
- `js/ui.js`, `js/app.js`, `js/main.js`: the interface
- `sw.js`, `manifest.webmanifest`: offline support and home-screen install

Check the rules engine and data with `node tools/dnd4e-test.js`.

Dungeons & Dragons is a trademark of Wizards of the Coast. Paragon is an unofficial fan tool.
