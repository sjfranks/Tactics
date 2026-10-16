# Aligning the Code with the Rule Books

The game in this repo (Rogue Tactics, formerly Emberwatch Tactics) already shares a lot with the rule books: a 6×8 board, three actions, weapon-style damage dice with exploding crits, advantage that stacks to 3, set-ups and combos, momentum, forced movement, hazards, missions, foe roles and a shared foe resource. The differences are in the dice details, defence, saves, health, the run layer and the content.

This file lists every difference and the order in which they will be ported. Each phase is one pull request, and the balance simulator (`node tools/sim.js`) is run before and after each one.

## Phases

| Phase | Scope | Main files |
|---|---|---|
| **0** | The rule books in `docs/rules/` and this plan | `docs/` |
| **1** | **Combat core:** dice, attacks, DEF and Defend, saves, stagger and slams, conditions, initiative, Malice, Down and Wounds | `js/engine.js`, small changes in `js/battle.js` and `js/data.js` |
| **2** | **Content:** STR/DEX/INT/PRE heroes, the four classes and their powers, general powers, weapons and runes, foes and bosses | `js/data.js`, `js/engine.js`, `js/sheet.js` |
| **3** | **Run layer:** Victories and XP, levels at Camp, hit-dice healing and Camps, power drafts, the smith, events with attribute checks, dramatic tasks, negotiations, road events | `js/run.js`, `js/screens.js`, `js/data.js` |
| **4** | **Words and teaching:** glossary and tappable keywords, compendium, tutorial, character sheets, simulator report, README; archive `docs/RULEBOOK.md` | `js/data.js`, `js/tutorial.js`, `js/screens.js`, `tools/sim.js` |

## Status

- **Phase 1 (combat core): done.**
- **Phase 2 (content): done.** Heroes use STR/DEX/INT/PRE, the four classes have the Heroes book's numbers, start kits and powers, the 34 general powers are in the draft pool, weapons carry runes (Keen, Vicious, Steady, Flame, Frost, Radiant, Venom, Thunder, Warding, Long), the rogue can find a d2 weapon, and foes and bosses use the Bestiary's stat blocks, damage types, Terrifying, hidden starts and bloodied phases. Passive powers, Chain/Link/Growth keywords and party resonance all work in battle.
  - Not yet in the game: Overchannel, the Vanishing Act/Beacon style upcasts, Nerves of Steel (needs Wounds, Phase 3), the elite +1 attack, power slots and drafts (Phase 3). Earthshaker's "knocked down" is shown as slowed; Web roots on a hit roll rather than automatically. New foes borrow existing art.
  - Tuning: with the Heroes book's higher hero health, regions 1 and 2 were easy and the dragon a wall, so foe budgets per region are `actMul [1.1, 1.05, .65]` and boss health per region `bossAct [1.2, 1.25, .8]`. Simulator (150 runs, seed 7): 31% of journeys won, against 20% after Phase 1.

- **Phase 3 (run layer): done.** Victories (battle 1, elite 2, boss 3, task or negotiation 1) set each hero's starting momentum (up to 3) and become XP at a Camp. Camps spend and refill hit dice, remove a Wound and level heroes up, with Tend Wounds, Train and Hand Over in downtime. Hit dice heal out of battle (Catch Breath) and pay for Second Wind. Going Down gives a Wound; a hero Downed with 3 Wounds dies. Power slots (level + 3, up to 8) and drafts (level-ups, elites with an Uncommon, bosses with a Rare, treasure, events, shop by rarity), with skip and reroll. The smith tempers, hones (light weapons to a d2) and inscribes runes. Events use attribute checks with Help, class options and a safe option; there are dramatic tasks, negotiations and d6 road events. Malice now comes in at the book's rate.
  - Deviations: After a boss, the new region opens with a Camp. Help is automatic on single checks. Level-ups take the average hit-die roll. Not yet: healing potions and Provisions (the shop sells Bandages and Rations, +2 hit dice, instead), Haggle, Prayer and favours, selling items to the shop, the fate-token omen (an Omen gives +1 momentum in the boss fight instead).
  - Simulator (150 runs, seed 7): 27% of journeys won; 0.2 heroes die per run.
- **XP retune (after Phase 4):** XP now follows PF2e's encounter builder at three quarters: encounters are Easy 30, Medium 60, Hard 90 or Extreme 120 XP (also their foe budgets for four heroes, a quarter less per missing hero), deeds give 10 to 30, and 80 XP is a level at a Camp. Heroes reach the bosses at about level 3, 7 and 9.4. Simulator (150 runs, seed 7): 21% of journeys won.
- **Roguelite pass:** a Legacy profile (the Chronicle), nine unlockable relics, start-of-journey boons, eight Dread levels and three new events (A Game of Bones, The Crossroads Witch, The Deserter). The Healer's Satchel now heals 15% after a battle.
  - Retune: ordinary battles were too easy in regions I and II (the party lost about 12% of its health a fight) while the Ashen Dragon ended two thirds of the runs that reached it. The dragon fights ran long, Malice grew with the round number, and Reinforcements kept the heroes busy with imps. Now `bossCap 4` stops Reinforcements once a boss fight has four foes, `battleMul [1.6, 1.9, 1.1]` scales ordinary battles only (a fight costs about 22% of the party's health in every region, as the Design Notes ask), `eliteBudget [1.05, 1.15, .85]` and `bossAct [1.2, 1.45, .55]`. Simulator (150 runs, seed 7): 26% of journeys won, with losses spread through the journey rather than at the last boss. Dread 4 about 18%, Dread 8 about 4%.
- **Rules v0.23: rewards replace levels.** Code and books agree: no XP or levels; a reward pick after every battle (powers or growth), two for elites and bosses; flat 3 hit dice and 8 slots; level 1 and 2 class features from the start. Rescue captives no longer hang the game on their turn. Retune: `esLvl .85`, `hpSlope .015`, `dmgSlope .08`, `battleMul [2, 2.2, 1.25]`, `eliteBudget [1.4, 1.35, .95]`, `bossAct [1.2, 1.45, .3]`, `growChance .3`, `vigor 1.5`; the dragon's claws roll d10. Simulator: 25% (seed 7) and 32% (seed 99) of 150 runs won.
- **Rules v0.24: a simple start that grows.** Code and books agree: actions refill at the start of a turn and unspent ones stay ready for reactions; reactions are asked, not automatic; only Defend at first (class reactions are reward powers); no free strikes; one basic attack a turn; fewer advantage sources; a one-power starting kit; rarity, Malice and fear ramp by region. Retune: `foeHpMul .55`, `battleMul [1.6, 1.7, 1.1]`, `eliteBudget [1.4, 1.35, .8]`, `bossAct [1.2, 1.45, .22]`.
- **Phase 4 (words and teaching): done.** The glossary covers the 1e rules (86 entries: Victories, Camps, hit dice, Wounds, drafts, slots, rarity, resonance, runes, the smith, checks, tasks, negotiations, damage types, Terrifying, Malice), How to Play is rewritten, the tutorial teaches Malice and the new journey, the compendium lists general powers, weapons and runes, and the old rulebook is archived.

## Differences, system by system

### Dice and checks

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Attributes | Might, Finesse, Wits, Presence (0–4ish), plus skills | **STR, DEX, INT, PRE**; the number sets a die (0 = d4 with disadvantage … 5 = d12, 6 = d20); no skills | 2 |
| Checks and events | 3d6 + attribute + skill against results | Attribute die, **4+ succeeds**, 1 is a critical failure, advantage/disadvantage only | 3 |
| Saves | d20 + attribute against DC 12 + attribute + level/3 | **Attribute die, 4+**, with each class's or foe's **+ / −** save slants | 1 |
| Advantage and disadvantage | Stacks to net 3; hidden counts double | Same | — |

### Attacks and damage

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Damage dice | Basic attacks use the weapon; powers use a **class die** (`CLASS_DIE`) scaled from their old damage | **Every** attack and attacking power rolls the **weapon die**; powers list how many weapon dice | 1 (engine), 2 (data) |
| Bonus added | The power's attribute | The class **key stat**, once | 1 |
| A 1 on the kept die | Miss | Miss | — |
| Critical hit | Maximum explodes; staggered = sure crit | Same, and a crit **ignores DEF** | 1 |
| Exposed | Advantage **and +3 damage** | Advantage only | 1 |
| Combo bonus | Every hero hit for the rest of the round gets **+1 damage per combo** (up to +3) | **No flat damage.** A combo gives +2 MP to the cashing hero and the setters | 1 |
| Sneak Attack | Flat bonus (`TUNE.sneak` + level/3); triggers on "ally beside" | **One extra weapon die**; triggers on staggered, exposed, rooted, dazed or **flanked** | 1 |
| Other flat damage | Whetstone, Lens, Cleave (Might), Savage (+2), skirmish bonus | Heroes: weapon dice only. Foes may keep flat bonuses (Savage) | 1–2 |
| Double damage | Radiant ×2 vs undead, Execute ×2 | Weakness ×2, resistance ÷2, immunity; power doublers ×2 each, **×3 max** | 1–2 |
| Damage types | Fire immunity only (`fireproof`) | Physical, fire, cold, force, radiant, necrotic, poison; weak / resist / immune | 1 |

### Defence

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Foe armour | Flat `armor` subtracted from non-crit hits | **DEF die** (None / d4 / d6 / d8) rolled automatically, exploding | 1 |
| Hero Defend | A saved action **halves** the hit (only hits of 4+) | Spend 1 action: roll the **DEF die** (exploding), **advantage with a shield**, subtract; any non-crit hit | 1 |
| Warding Word, Intercept | Present | Same (order: Intercept, Defend, Warding Word) | — |

### Actions and reactions

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Actions | 3 per turn; unspent actions are **saved** for reactions; each kind of reaction once between turns | 3 per turn; a reaction **costs 1 action** from your next turn; Defend has no per-round limit; Help and class reactions once per round | 1 |
| Rushed attacks | 2nd attack −1, 3rd −2 (multiple attack penalty) | Same | — |
| Free strikes | Heroes spend a saved reaction; foes have one per round | **Cost nothing**; each enemy gets at most one per move | 1 |
| Initiative | d20 + Finesse | **DEX die**, exploding; fixed order; heroes may swap once per round | 1 |

### Set-ups, forced movement and conditions

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Stagger | Any push or pull of 1+ tiles staggers | **A slam staggers**; a push alone staggers only if the power says so | 1 |
| Slam damage | 2 + 1 per tile left; 2 to the creature hit | **One roll of the mover's weapon die** (exploding) to both | 1 |
| Staggered hero | No effect beyond half speed | Halved SPD, no reactions, **1 fewer action** next turn | 1 |
| Bleeding | 3 (hero source) or 2 + act (foe) | **One roll of the bleeder's weapon die** | 1 |
| Burning | Present | 3 fire a turn; water ends it | — |
| Bloodied | Used by Execute and Savage (half HP) | A named marker shown on the HP bar | 1 |

### Health and the end of a battle

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| HP | Class HP table | Hit die max × 4 at level 1; + hit die per level | 2 |
| Falling | A fallen hero is out; returns at 25% after the battle | **Down** at 0 HP, gains a **Wound**; an ally can **Help up**; Down heroes stand at 1 HP after a win; the **4th Down** kills | 1 (Down, Help up), 3 (Wounds over a run) |
| Wounds | — | −1 to checks, saves and attacks each (max −3); a Camp removes 1 | 3 |
| Healing | Campfire heals 40% | Hit-dice pool (level + 1), Second Wind once per battle, Catch Breath, Camps restore the pool | 1 (Second Wind), 3 |

### Foes

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Foe resource | Momentum pool, +1 a round; threats at set costs | **Malice**: + round number each round, + 1 per Down hero; same threats | 1 |
| Threat unlocks | By depth | By battle type and region | 1 |
| Roles | Emberwatch roles (ambusher, harrier, defender, support …) | Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader | 2 |
| Stat blocks | M/F/W/P, flat armour, `dmg` arrays | DEF die, attack die + key stat, save slants, weak/resist/immune, Terrifying | 2 |
| Bosses | Surges on rounds 1, 3, 5 | Same, plus a bloodied phase; HP 110 / 150 / 200 | 2 |

### Powers and progression

| Rule | Code today | Rule books | Phase |
|---|---|---|---|
| Powers | Per class, chosen at level-ups | **Active and passive powers**, class and general lists, **level + 3 slots**, **drafts** (level-up, elite, boss, Treasure, shop) | 2–3 |
| Tags and resonance | — | Six tags; party resonance at 4 and 8 | 2 |
| Weapons | Tiered weapons with bonuses (`dmg`, `acc`, `keen`, `burn` …) | Weapon die + group; **smith**: temper, hone (to d2), runes in 1–2 sockets | 2–3 |
| Momentum at the start | 0 | **Victories** since the last Camp, up to 3 (cap 5 with powers) | 3 |
| XP | Earned per deed by role (`ROLE_XP`) | **XP by encounter difficulty** (Easy 30, Medium 60, Hard 90, Extreme 120) and deeds, taken at a Camp; 80 XP a level; cap 10 | 3 |

## Features the code has that the books do not

These stay unless decided otherwise. Each needs a line in the books or a decision to remove it:

- **High ground** (+1 range, advantage) and **difficult terrain** (rough ground and water cost 2).
- **Undo**, the **INTENT** view and the **forecast** (UI only; no rules change).
- **Skirmish mode** with rival hero parties.
- The full **relic** list (the books have only the Pouch of Fate Tokens so far).
- **Walls of ice**, **zones** and some power-specific mechanics (chain lightning, teleports).

## Open decisions for the designer

1. Keep high ground and difficult terrain? (Proposed: keep, and add them to Core 3.1.)
2. ~~The game's name.~~ Decided: **Rogue Tactics**.
3. Foe numbers: Phase 1 keeps today's foe HP and damage so the simulator can measure the rules change by itself; Phase 2 moves foes to the Bestiary's numbers.
