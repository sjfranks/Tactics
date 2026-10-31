# The run: how a game of Goblin Crypt is structured

A game is one **run**: the party climbs three acts, picking its way up a branching map of rooms. HP carries from fight
to fight, so every wound matters until the party rests. The run ends when the third act's boss falls, or when every hero
is down in a battle.

## Acts

| Act | Name | Theme | Boss (larger map) |
| --- | --- | --- | --- |
| 1 | The Marches | open hills, gorges, the goblins' outer camps | Old Greyhide, the Warg Mother (2×2, calls her pack) |
| 2 | The Crypt | tombs, the warg pens, the reeve's house | Morga the Bone Witch (hexes, heals, raises the dead goblins as cutters) |
| 3 | The Deep Forge | lava, fire vents, the hall of the king | Grubnash the Goblin King |

Each act's map has 12 floors and the boss. Floor 1 is always a fight, floor 6 a treasure chest, floor 12 a campsite.
A path through an act passes 12 rooms and the boss: about 5 fights, 2 elites, 2 unknown rooms, 1 or 2 campsites, a
shop and a chest, so **8 to 10 encounters an act**.

## Rooms

- **Fight**: a pack drawn from the act's weak pool (the first two fights of an act) or its strong pool. Reward: gold,
  then pick one of three **rewards** (a new action, an upgrade of one the hero has, or a bonus), or skip.
- **Elite**: a stronger pack led by a champion (more HP, a bigger die, +1 armour, a gold crest). Reward: more gold, a
  relic, and a pick of three.
- **Unknown (?)**: an event with choices. Sometimes it is an ambush (a fight) or a wandering peddler (a shop).
- **Campsite**: rest (every hero heals 30% of max HP) or train (upgrade one action).
- **Shop**: actions, weapons, armour, relics and draughts for gold.
- **Treasure**: a relic.
- **Boss**: on a larger map. Reward: lots of gold and a pick of three boss relics. The party heals fully before the next act.

A hero who is down when a battle is won gets back up with 15% of their max HP.

## The difficulty curve

Calibrated against the [Slay the Spire run data](https://github.com/MaT1g3R/Slay-the-Spire-data) (749 runs). Every run in
that data set is Ascension 20, played by strong players; there is no Ascension 0 data in it. What it gives is the shape
of a well-made curve: how much of a party's max HP each kind of fight costs, act by act, and where runs end.

Share of max HP lost per fight (mean):

| | Normal | Elite | Boss |
| --- | --- | --- | --- |
| Act 1 | 6% | 21% | 25% |
| Act 2 | 11% | 20% | 29% |
| Act 3 | 8% | 13% | 25% |

Runs still alive after each act's boss: 85% (act 1), 68% (act 2), 61% (act 3). A path averages 5.5 normal fights,
2.4 elites, 1.9 unknown rooms, 2.9 campsites, 0.9 shops and 1 chest an act. Gold on hand before act 1's boss: about 240.

How it is used: the simulator's bot (`node tools/runsim.js`) plays whole runs, and the tables in `js/run.js` are tuned so
the bot matches this shape: normal fights cost little, elites and bosses cost a lot, act 2 is the hardest step up, and
about 85% / 68% / 60% of the bot's runs get past each boss. The bot plays a good deal worse than people (it ignores foe
intents and plans one action at a time), so the same tables play gentler for people. Ascension 0 is that gentler curve:
the data's players took on Ascension 20's extra elites, harder foes and smaller heals after bosses, which this run leaves out.

### Where it stands

`node tools/runsim.js 120` on Normal (share of max HP lost per fight, bot · data):

| | Normal | Elite | Boss |
| --- | --- | --- | --- |
| Act 1 | 7% · 6% | 20% · 21% | 27% · 25% |
| Act 2 | 9% · 11% | 16% · 20% | 28% · 29% |
| Act 3 | 9% · 8% | 10% · 13% | 23% · 25% |

Runs past each boss: 85% / 65% / 63% (data: 85% / 68% / 61%). Runs vary by a few points.

Two changes were needed to get there, and both follow from the data. Heal is limited to three a battle, ready every other
turn: with HP carried from fight to fight, unlimited healing made every wound free. And the party's starting relic heals
only the most wounded hero after a victory: in the data only one character in four starts with a healing relic.
