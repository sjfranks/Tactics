---
title: Rogue Tactics 1e — Design Notes
version: 0.24
tags: [game-design, rulebook, notes]
---

# Rogue Tactics 1e — Design Notes

> v 0.24. Not for play. This file holds the changelog, the open questions, what was borrowed from Nimble and Emberwatch Tactics, and ideas that were parked. Books: [Core Rules](core-rules.md) · [Heroes](heroes.md) · [Bestiary](bestiary.md).

---

## 1. What Changed

### v0.24 (from v0.23): a simple start that grows

The game was hard to read in its first battles: every hero had three powers and a class reaction, reactions fired on their own (often several in one foe turn), free strikes punished every step, and a dozen sources of advantage and disadvantage could stack on one roll. A roguelite should start small and grow with the run, as a Slay the Spire deck does. So:

- **Actions refill at the start of your turn** (not at the end), and **actions you don't spend stay ready** until then. Each ready action pays for one reaction. Heroes start a battle with 1 ready action. Keeping actions back is now the one defensive choice every hero always has.
- **Reactions are choices.** The game asks before each one ("Goblin hits Vex for 6. DEFEND?"); Settings can make them automatic.
- **Only Defend at the start.** The class reactions (Intercept, Opportunist, Repelling Ward, Warding Word) and Sentinel are **Uncommon reaction powers**, learned as rewards.
- **No free strikes.** Moving away from a foe is safe; Sentinel brings them back for one fighter.
- **One basic attack a turn**, instead of rushed second and third attacks.
- **Fewer modifiers.** High ground no longer gives advantage (only range), nor does dual wielding; shooting with a foe beside you no longer gives disadvantage. The first battles use flanking, exposed and cover.
- **A small starting kit.** Each hero starts with a basic attack, their innate set-up and **one** class power (Tide of Iron, Piercing Strike, Scorching Burst, Healing Word); the cleric's sling is gone.
- **Ramps by region.** Rewards in region I are 85% Common; Uncommon and Rare powers (with their chains, links and reactions) come later. Malice threats start in region II (and in region I elites and boss); Terrifying foes frighten from region II.
- **Retune.** Heroes deal less damage per turn, so every foe has 55% of its listed health (`foeHpMul`), with ordinary battles × 1.6 / 1.7 / 1.1, elites × 1.4 / 1.35 / 0.8 and boss health × 1.2 / 1.45 / 0.22 by region. Simulator: 28% and 33% of runs won on two seeds; region I is gentle (a battle costs about 13% of the party's health), region III hard.

**Open questions from v0.24:** Is 1 ready action at the start of a battle right? Should Help (advantage for an ally's attack) come back as a reaction power? Do players feel the one-attack limit is a loss, or does keeping actions for Defend fill the turn?

### v0.23 (from v0.22): rewards replace levels; boons, the Chronicle and Dread

- **No levels, no XP.** Heroes start with their level 1 and 2 class features and never level up. Growth comes from a **reward after every battle**, as in *Slay the Spire*: pick 1 of 3 cards, each a power for a named hero or a **growth** card (*Vigor*: +1½ hit dice of max HP; *Training*: +1 key stat, up to 5). Elites and bosses give two picks with better rarity. Hit dice are a flat pool of 3; power slots a flat 8. Camps heal, refill hit dice, remove a Wound and reset the Victories, but no longer level anyone up. Paths and level-5 features are parked.
- **Why.** Levels arrived in lumps at a Camp, far from the fights that earned them, and XP was a second currency beside Victories. A pick after each fight is a small, frequent decision, and it lets the party steer toward a build.
- **Encounter budgets** use the party's expected strength at each depth (*esLvl* 0.85 instead of 2), with foe health and damage rising more slowly per stop. Ordinary battles, elites and bosses have their own multipliers per region (Bestiary, Budgets).
- **Boss Reinforcements** stop at four foes on the board. Long boss fights used to snowball (Malice grows with the round number) and ended most runs that reached the dragon.
- **The dragon's Rending Claws** roll a d10 instead of a d12.
- **Boons** (Core 4.9): every run opens with two gifts and a bargain.
- **The Chronicle and Dread** (Core 4.10): totals, score and history carried between runs; nine relics unlocked by milestones; eight Dread levels.
- **Rescue captives** take their own turn once freed (Bestiary, Missions). In the app this turn used to hang the game.
- Simulator (the autoplay AI, 150 runs on each of two seeds): 25% and 32% of runs won, with losses spread across the three regions.

**Open questions from v0.23:** Should rewards ever offer weapons, runes or relics (StS offers potions and relics)? Is 30% the right growth-card rate, and should Training be rarer? Should paths come back as Rare rewards? With no levels, does the party feel stronger in region III, or only better equipped?

### v0.22 (from v0.21): powers live in the Heroes book; weapons drive damage

- **"Talents" are now "powers"**, active or passive, and the **Talents book is merged into the Heroes book**. The game has three books again: Core Rules, Heroes, Bestiary. Core keeps only a one-page summary (chapter 7).
- **Damage is always weapon dice.** No power adds flat damage. Former "+2 damage" effects now add weapon dice, widen the crit range or double a hit. **Slam damage** is one roll of the mover's weapon die, and **bleeding** rolls the bleeder's weapon die, so even forced movement and bleeds scale with weapon upgrades.
- **Double damage** is a new payoff: ×2 per source, stacking to **×3 maximum**. Each class owns one doubler that pays off *another* class's set-up: rogue *Coup de Grâce* (staggered), wizard *Shatter* (rooted), cleric *Divine Favour* (blessed).
- **Weapons and upgrades (Heroes Part 3).** A **smith** in every shop can **temper** (die up), **hone** (die down; Light weapons can reach a **d2**) and **inscribe runes** (1 socket, 2 on magic weapons). Runes: Keen (d6+ only), Vicious, Steady, Flame, Frost, Radiant, Venom, Thunder, Warding, Long, Twin. The old one-per-weapon traits are replaced by runes.
- **The d2.** 50% miss, 50% crit, and crits ignore DEF. Weak alone (4.0 per attack, key stat 3), best of all with crit multipliers (14.3 at ×3 with Sneak Attack, against DEF d6). Keen is limited to d6+ because a Keen d4 (50% crit, 25% miss) made the d2 pointless. A weapon cannot be both d2 and no misses.
- **Class powers redesigned around interplay.** Each class has 12 to 14 powers (actives and passives), sample **builds**, and a "combos best with" line. New: rogue *Open Veins*, *Needle and Thread*, *Flurry*, *Coup de Grâce*; fighter *Sentinel*, *Anvil*, *Shieldbreaker*, *Heavy Blows*, *Blood in the Water*, *Earthshaker*; wizard *Blink*, *Mage Shield*, *Kindling*, *Shatter*, *Lightning Rod*, *Wildfire*, *Gravity Well* (from the general list); cleric *Shepherd* (was *Shield Mate*), *Divine Favour*, *Smite*, *Revivify*, *Martyr's Grace* (from the general list), *Judgment Day*.
- **A combo map** (Heroes Part 4) shows which class makes each condition and which powers pay it off.
- **General powers** trimmed to 34 and converted to weapon dice (*Opening Strike*, *Finisher*, *Set Your Feet*, *Rhythm*, *Veteran's Pride*, *Glass Cannon*, *Exploit Weakness*). Resonance II bonuses also use weapon dice.

**Open questions from v0.22:** Are the three doublers (and ×3) too swingy with sure crits? Is *Anvil* (free ally attack) too strong with Opportunist? Smith prices. Should casters' powers keep using the focus die, or a separate spell die? Does the d2 need more support powers to be a real build, or is three enough?

### v0.21 (from v0.20): powers and feats become one talent system

- **Talents.** Everything a hero learns is a **talent**: a **power** (active: MP and actions) or a **passive** (always on, or triggers by itself). Both are drafted, share **slots**, and have a **rarity** and a **tag**.
- **Two lists.** **Class talents** live on the class pages (Heroes); **open talents** (the former feats) live in the **Talents** book, which replaces the Feats book. Innate powers stay outside the system (no slot, no tag).
- **One slot bar:** **level + 3** slots, maximum 8. Starting heroes have their innate power, two Common class talents and one Common open talent, with one slot free.
- **One way to grow.** Level-ups now give **+1 slot and a talent draft** (mixing class and open talents) instead of a fixed "new power". Elite battles, bosses, Treasure and shops work as before. *Train* now discards a talent and drafts one of the same rarity.
- **Class powers have rarities and tags** (most 1-MP powers Common; Shadowstep, Counterattack, Block and Web Uncommon; Come and Get It and Fireball Rare), and count toward **resonance**. Because more talents count, the thresholds rose from **3 / 5** to **4 / 8**.
- **New class passives** show that class lists can hold passives too: *Backstab* (rogue), *Bodyguard* (fighter), *Battlemage* (wizard, lets the staff crit, a fix for its weakness against armour) and *Healer's Gift* (cleric).

**Open questions from v0.21:** Is level + 3 slots right, and do powers need their own cap for the phone screen (about 6 buttons)? Should drafts guarantee a class talent? Are 4 / 8 the right resonance thresholds? Shop prices for talents (30 / 60 / 120).

### v0.20 (from v0.19): full review, reorganized and tightened

A read-through of all four books for simplicity, layout, fit with a phone game, and balance.

**Reorganized.** Core Rules now runs in play order: 1 Dice and Checks · 2 Health · 3 Combat · 4 The Run · 5 Making a Hero · 6 Equipment · 7 Powers · 8 Optional Rules, with an alphabetical glossary. Designer callouts (the "why" boxes and simulation tables) and scattered TBC notes moved here (sections 3 and 4). Healing, hazards and conditions each live in one place. Heroes, Feats and Bestiary cross-references were updated to the new numbers.

**Contradictions fixed.**
- **Hazards** had two different tables (Core and Bestiary). Now one table in Core 3.1: a creature suffers a hazard when it enters it or ends its turn in it; a DEX save avoids the condition, not the damage.
- **Attribute increases** were at levels 2, 4, 6, 8 in Core but 4 (only) in the class tables. Now levels **4 and 8** everywhere.
- **"Class moves"** were referenced for specialist tasks but never existed. Now **class options** in events (Core 1.3), with each class's **specialties** listed on its page (like FTL's blue options).
- Core said MP resets to 0 after battle, which clashed with Victories; and that hazards and large creatures were "left for later" though both existed.
- "One free action per turn" clashed with free powers, fate tokens, feats and companions. Now only **free powers** are limited (one per turn).
- The Bestiary gave a power after every battle, but powers come from levels and shops. Battle rewards now match Core 4.1.
- *Channel Divinity* doubled radiant damage against undead, on top of undead's radiant weakness (×4). Removed.
- The Lich dealt necrotic damage, which had no type. **Necrotic** added (Core 3.11); undead are immune to it.
- *Link* said "within 1 tile, including diagonals", but distance is orthogonal. Now "the 8 tiles around you". *Follow-Through* was wrongly tagged Link.
- Swarms and minions had "(not crit)" conditions though they never crit.

**Balance.**
- **Forced movement no longer staggers on its own; a slam does.** Before, every push staggered, so the STR save on *Shove* and *Force Push* did nothing, and foe pushes (Orc Brute, Ogre) would have skipped heroes' turns.
- **Staggered heroes lose 1 action**, not their whole turn. Foes still lose their turn.
- **Thunderwave** no longer staggers everything around the wizard for 1 MP; foes it slams are staggered.
- **Sneak Attack** triggers on a **flanked** foe instead of "an ally beside it", which was nearly always true.
- **Hit-dice pool = level + 1**, so the first Camps heal enough.
- **Starting MP is capped at 5.** Victories, *Eager*, Surge resonance and *Afterglow* together could reach 8.
- **Wounds no longer reduce SPD.** On a 6×8 grid, −3 SPD was crippling, and it was one more exception to remember.
- *Tend wounds* costs 25 gold (was 15), so Wounds stay a real cost.
- *Nerves of Steel* moved from the fighter's powers to the Feats book (a passive is a feat, not a power). 37 feats.
- *Overchannel* now means "upcast by 1 for free".

**Mobile fit.**
- Foe stats, saves and next move are always shown on tap; *Assess* lost "Spot a weakness".
- **Fear** is one PRE save at the start of a battle, without the critical-failure daze.
- **Dramatic tasks and negotiations** offer approaches and arguments as on-screen choices instead of "describe what you do".
- Help no longer requires explaining how; tabletop-only rules (dropping items, shouting, improvised weapons) removed.
- Role icons are Unicode text symbols (⚔︎ ⬢ ❖ ✚) instead of emoji.

**Defaults chosen (were TBC; revisit in playtest).** 4 XP per level, level cap 10, levels gained at Camp; region level bands (I: 1–3, II: 4–6, III: 7–9); a critical failure on a save has no extra effect; no bleeding out; a centre-to-centre line rule for cover; DEF applies to power hits; *Keen* crits on the maximum or one below; heavy armour costs no SPD; pack slots 2 + STR; powers are combat only.

### v0.19 (from v0.18): the Bestiary is populated

- **Roster.** About 40 foes across three regions (Greenmarch, Barrow Moors, Ashen Waste): minions, swarms, standard foes, elites, and three bosses with escorts. Converted from the Emberwatch Tactics prototype, with five new foes (Mire Lurker, Wailing Shade, Bone Warden, Ember Hound, Ash Wraith) taken from the roles in Monster Vault and Draw Steel.
- **Malice returns for foes.** The foes share a Malice pool (gains the round number each round, +1 per Down hero) that pays for threats (Bloodlust, Eruption, Reinforcements, Dark Rite) and ◆ abilities. Boss surges are free and scheduled for rounds 1, 3 and 5.
- **Traits** (Pack, Savage, Nimble, Skulk, Aura, Reassemble, Drain, and others) are defined once in a table; Savage uses the new Bloodied marker, Undead and Fireproof use the damage-type rules.
- **Encounter building.** Cost budgets by region, ten missions and their regional twists, battlefield hazards and obstacles, and rewards (Victories, feat drafts).
- **Placeholder blocks removed.** The old Goblin Skulker, Skeleton Warrior and Marsh Ogre examples were replaced by their roster entries (the Skeleton Warrior is now a Region II soldier with a d6 DEF).

**Open questions from v0.19:** Are swarms too deadly (damage equals remaining HP)? Boss HP (110 / 150 / 200) and escort budgets. Are standard foe HP values too low now that heroes have three actions? Is the Malice growth too fast or slow? Do the Lurker and Artillery target rules read clearly on a phone?

### v0.18 (from v0.17): Victories, Bloodied, foe roles, Second Wind and a feat system

From the Draw Steel and D&D 4e review.

- **Victories (3.4).** Battles, elites, bosses and successful dramatic tasks or negotiations earn Victories. Every hero starts each battle with MP equal to Victories (max 3). Camp converts Victories to XP and resets them to 0. This gives the first levels of a stretch a ramp, and makes the distance between Camps a difficulty dial.
- **Bloodied (1.6).** A marker at half HP. Used by Brand of Judgment, boss phases and the Finisher feat.
- **Foe roles (Bestiary).** Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, each with a move rule and a target priority, so foe turns are predictable and readable.
- **Second Wind (2.5).** Once per battle, spend a hit die to heal and gain advantage on the next DEF roll. Fills the gap in mid-battle healing.
- **Feats (new book).** Drafted permanent rules, 2 to 4 slots per hero. Six tags (Set-up, Burst, Guard, Reach, Surge, Mend) with party Resonance bonuses at 3 and 5 feats. The keywords Chain (the hero before you), Link (adjacent allies), Growth and Reckless give the Balatro-style interactions. 36 feats.
- **Earlier decision revised.** The earlier rejection of skill lists and Edge catalogues stands for skills; feats are now adopted because they change how the party plays a battle, not just a number.

**Not yet adopted from the review:** Camp rituals (4e), regions as tiers (4e), Push (an extra action for 5 MP), fate tokens earned by taking risks, Complications (character quirks), Malice for bosses.

**Open questions from v0.18:** Is a start of 3 MP too strong with Conductor and Surge feats? Should Victories also count for non-combat only if risk was taken? Do six roles cover enough foe variety? Is Second Wind too weak next to the Cleric? Is the Set-up Resonance too reliable? Chain and Link need to be easy to read on a phone screen.

### v0.17 (from v0.16): hazards, fear, group checks, road events, companions, downtime, damage types

All came from the Savage Pathfinder review. The one rejected item was mass battles.

- **Group checks (1.3).** Every hero rolls; the party succeeds on at least half. Faster than a dramatic task.
- **Damage types (1.10).** Physical, fire, cold, force, radiant and poison, with weakness (×2), resistance (÷2) and immunity (0) applied after DEF. Wizard powers now name their type.
- **Companions (2.11).** One per hero, flat damage, acts on its owner's turn, never dies (it is Down until Camp). Wolf, hawk, mule.
- **Hazards (3.2.3), Fear (3.2.4), Road events (3.2.5).** A hazard table with saves, a PRE save against a Terrifying foe, and a d6 road table.
- **Downtime (3.3).** Gold and favour buy Wound removal, provisions, retraining and fate tokens.
- **Bestiary.** The stat block gains Weak/Resist/Immune and Terrifying lines; the skeleton and ogre examples use them.

**Open questions from v0.17:** Is "half the party" too lenient for group checks? Should Fear stack with the boss's Terrifying rating? How many companions per party, and are they a Ranger and Druid feature or a relic? Are downtime prices fair, and does Tend wounds make Wounds too cheap? Should hazard tiles be visible by default?

### v0.16 (from v0.15): new hero powers

Drawn from the Savage Pathfinder review. Only powers that fit the existing rules were added; none adds a new subsystem.

- **Rogue:** *Feint* (a set-up that exposes on a failed INT save) and *Counterattack* (a reaction after a missed melee attack).
- **Fighter:** *Sweep* (hit all adjacent foes at 1 step of disadvantage), *Block* (a reaction that gives an ally's Defend advantage) and *Nerves of Steel* (ignore a Wound modifier point; a counter-build for Wounds).
- **Bard (hybrid):** *Inspire* is the first written power.
- Still unadopted from the review: Hard to Kill, Concentration, Channeling, Holy Warrior, Fear Aura.

**Open questions from v0.16:** Does Counterattack plus Opportunist give the Rogue too many reactions? Is Block worth an action when the ally's Defend already costs one? Should Nerves of Steel go up to 3 points at higher levels?

### v0.15 (from v0.14): wound modifier, dramatic tasks, negotiations, fate tokens

- **Wounds now carry a flat modifier** (Core 1.6). Each Wound gives −1 (maximum −3) to checks, saves, attack totals and SPD. It is subtracted from the total after the roll, so the natural 1 (miss, critical failure) and natural maximum (crit, explosion) keep their meaning. It does **not** step the die down the ladder (considered and rejected).
- **Death threshold:** a Down hero who already has **3 Wounds** dies. A hero can carry up to 3 Wounds and keep fighting at −3. This settles the old open question about how many Wounds kill a hero. Gritty wounds (optional) makes it 2.
- **Resting restores a Wound** (3.3): each Camp removes 1 Wound from every hero. Camps still restore hit dice, not HP.
- **Dramatic tasks** (3.2.1): a timed, multi-step event in which every hero makes one attempt per round and the party collects task tokens (1 per success, 2 on an exploding roll). Includes target sizing (6 / 8 / 10 tokens for four heroes over three rounds) and a worked example.
- **Negotiations** (3.2.2): up to three rounds of PRE (or INT) checks. There is **no opposed roll**: the other side's attitude and your leverage set advantage and disadvantage. Successes earn influence tokens, and gold or favours can buy one. A result table runs from refusal to a full deal.
- **Pouch of Fate Tokens** (5.5): a relic that gives the party 3 fate tokens per battle or event, spent for a reroll or to end a condition. It is this game's answer to Savage Worlds' Bennies.
- **Not adopted** from Savage Pathfinder, by decision: wounds as die-ladder steps, declared multi-actions, the Wild Die, creative combat, and any change to minions.

### v0.14 (from v0.13): three actions, Defend as a reaction, camps restore dice

- **Three actions per turn** (Core 2.3). Actions **reset at the end of your turn**, so you always have 3 available for reactions between turns. Actions spent on reactions are gone, so a hero who reacts a lot **starts their next turn with fewer**. Free action: 1 per turn. Dazed heroes have 1 action. Move can be split around other actions, as in Emberwatch.
- **Rushed attacks:** each basic attack after the first in a turn has one more source of disadvantage than the last (the multiple attack penalty from the "left for later" list is now in) (2.5).
- **Defend is a reaction** that costs 1 action and is optional (2.6). It rolls the **DEF die**, which now **explodes**. A **shield gives the roll advantage**. You cannot Defend against a crit (crits ignore DEF). Defend has no per-round limit besides your actions. **Help** and class reactions are once per round.
- **Unarmoured** creatures defend with a d4 at disadvantage, so the wizard can still Defend, badly. A new simulation table shows how much Defend saves (2.4).
- **Foes** take a move and an action and apply their DEF automatically (2.10, Bestiary).
- **Equipment:** the fighter and cleric start with a **shield** (and the paladin, as a guess). Shield is a 20 gp item that uses one hand. The old rule "a shield ladders DEF up one step" and the optional "Deflect" rule are gone (5.2).
- **Cleric** starts with a **Mace (melee) and a Sling (ranged)** instead of a magical Radiant Mace. The Mace moves to the Light weapon group, and the cleric's proficiencies are now Light and Ranged. The cleric's radiant damage now comes from level-2 Channel Divinity (Heroes).
- **Camps restore hit dice, not HP** (3.3). At a Camp each hero first **spends all remaining hit dice** to heal, then the pool is **restored in full**, and each hero removes 1 Wound.
- **Powers** have an **Actions** column (1 by default, 2 for the 3-MP powers, "free" for Vanish).
- **Optional rules:** the old "three actions" option is replaced by a **Move and Act** simple-turn variant, and "Auto-defend" is added.

### v0.13 (from v0.12): restructured into three books plus design notes

- **Structure.** The single rulebook is now **Core Rules**, **Heroes**, **Bestiary** (a stub) and this **Design Notes** file, in the style of the Nimble books. Core Rules runs Start Here → Core Rules → Combat → Journey and Resting → Character Creation → Equipment → Powers → Optional Rules → Glossary.
- **Kept:** the one damage dice rule, the one skill dice rule, the dice ladder (d4 to d12, buffed d20), four attributes (STR, DEX, INT, PRE), class hit dice, DEF dice, set-ups and combos, momentum, stacking advantage, the 6×8 grid and orthogonal movement.
- **Adopted from Nimble 2e** (in this game's own words and numbers):
  - A **Start Here** page, a **How to Play Well** list, and **a single two-rule summary** at the front.
  - **Hit dice as a recovery pool** (pool = level; Catch Breath spends them and adds STR; Camp restores them).
  - **Wounds and Down.** At 0 HP a hero is Down and gains a Wound; three Wounds kill. Heroes revive allies and stand up after a won battle.
  - **Class saves:** each class has one save at advantage and one at disadvantage. This **replaces** the v0.12 rule that compared attribute numbers.
  - **Assess** action (spot a weakness, create an opening, anticipate danger), with a "foes adapt" limit. *Create an opening* ties into the exposed set-up.
  - **Help** as a reaction, giving advantage.
  - **Surprise** (initiative with advantage or disadvantage), **cover and hiding**, and **long shot** (extra disadvantage for +2 range).
  - **Weapon properties** (Light, Two-handed, Reach, Thrown, Load, Vicious) and **dual wielding**; **proficiency** (non-proficient weapons cannot crit); **STR requirements** for armour; **pack slots**; an item **table** layout.
  - Class page layout: introduction, "As a … you can", stat line, level table, paths, **class complexity** (♦).
  - **Upcasting** (extra MP adds a die), innate/free powers (0 MP).
  - **Optional rules** chapter and a glossary.
- **Not adopted from Nimble:** a 20-skill list and skill points (the game has one skill rule on attributes); three actions per turn (kept as an optional rule); the d20 check against a difficulty class (the game keeps 4+ on the attribute die); grappling, concentration, and the long downtime list.
- **Hero numbers.** Four classes now have a draft level 1 to 5 table, class reaction, innate power and starting powers (converted from Emberwatch Tactics). Hybrids have stat lines only.
- **Bestiary.** Foe types, a stat block, three example foes, boss and encounter-building notes.

**Where things moved:**

| v0.12 section | Now |
|---|---|
| 1 Overview, 1.4 Glossary | Core Rules: Start Here, Glossary |
| 2.1 Classes | Heroes |
| 2.2 to 2.3 Attributes and checks | Core Rules 1.2 to 1.5 |
| 2.4 Weapons, armour | Core Rules 2.4, chapter 5 |
| 2.5 to 2.6 HP and SPD | Core Rules 1.6, 1.7 |
| 2.7 Powers and moves | Core Rules chapter 6; Heroes |
| 3 Combat | Core Rules chapter 2 |
| Appendix A Changelog | Design Notes 2 |
| Appendix B Open definitions | Design Notes 3 |
| Appendix C Domains | Design Notes 5 |
| Appendix D | Design Notes 4 (left for later) |

---

## 2. Changelog (v0.2 to v0.12)

> Entries below v0.12 use the old names (Might, Finesse, Intelligence, Presence, Vitality) as originally written.

**v0.12 (from v0.11):**
- **Appendix D layered into the rules** (Adopt and Adapt items): MP and momentum (3.6), set-ups and combos (3.7), the condition list (3.8), crits ignore DEF (2.4.1, 3.14), forced-movement details and Steadfast (3.10), class reactions (3.11), minions and swarms (3.13), weapon traits (2.4.1), two active relics (2.4.4), stacking advantage (1.3, 2.3.1, 3.5), attribute-check saves (3.12), powers with extra weapon dice (2.7.1), events with no-roll alternatives (2.3.5), and SPD on the small grid (2.6). Leave-for-later items remain in Appendix D.
- **Attributes renamed:** Might → **STR**, Finesse → **DEX**, Intelligence → **INT**, Presence → **PRE**.
- **Vitality removed as an attribute.** Hit points now come from a **class hit die (HD)**: wizard d6, most classes d8, fighter and paladin d10, barbarian d12 (2.5). Attribute spreads drop to 9 points over 4 attributes (2.2). Endurance checks moved to STR.
- **SPD = 2 + DEX ÷ 2** (3, 4 or 5 tiles) (2.6).
- **Help** is free outside battle (+1 advantage) because MP now exists only in battle (2.3.4).
- **Stat icons:** Unicode text symbols (not emoji) for each stat: ♜ STR, ➶ DEX, ✦ INT, ♛ PRE, ⚅ HD (1.4, 2.2, 2.5).
- 6×8 grid adopted as the default (3.1).

**v0.11 (from v0.10):**
- **Weapons moved to a character creation step.** Section 2.4.3 gives each class's default weapon and starting armour. The class list no longer shows weapons or dice (2.1.2, 2.4.1).
- **Class list rewritten:** each class now shows its key stat and a flavourful list of what it can do, inspired by Dungeon World class moves and the Emberwatch heroes (2.1.2).
- **Starting armour:** rogue light, cleric medium, fighter heavy, wizard none (2.4.3).
- **New Appendix D:** proposals from the Emberwatch Tactics rulebook, none yet adopted into the rules.

**v0.10 (from v0.9):**
- **Domains removed from the rules.** Specialized tasks will be character moves (2.3.3, 2.7). The domain system, with all class domains and descriptions, is parked in Appendix C.
- **ARM renamed DEF** (defence die) (2.4.2, glossary, combat).

**v0.9 (from v0.8):**
- **Initiative is a dice roll.** Every creature rolls its Finesse die at the start of a battle and acts in order, replacing side-based phases (3.2).
- **Armour is a die.** Light, medium and heavy armour give a d4, d6 or d8 that is rolled against each hit, instead of flat reduction (2.4.2). Added a simulation table comparing the two.
- Finesse now also drives initiative (2.2, 2.6).

**v0.8 (from v0.7):**
- **Weapons replace class attack dice.** Every class has a default weapon whose die matches the old attack die: Twinblades (d4) for the rogue, Longsword (d6) for the fighter, Arcane Staff (d4) for the wizard, Radiant Mace (d6 melee / d4 ranged) for the cleric, plus weapons for the hybrid classes. Properties like no crits and no misses now belong to weapons (2.4.1).
- **Armour is damage reduction (ARM)**, with light, medium and heavy tiers and a minimum of 1 damage per hit (2.4.2).
- **New Section 3, Combat**, adapted from Emberwatch Tactics: grid, side-based phases (which resolves Initiative), orthogonal movement, taxicab ranges, flanking, free strikes, forced movement, damage (3.1 to 3.8).
- Glossary: added ARM, removed Initiative.

**v0.7 (from v0.6):**
- **Attribute 5 is a d12 again.** The **d20 is now the die for a buffed 5 (attribute 6)**, which cannot critically fail on a 1. It replaces the "advantage when buffing a 5" rule (2.2, 2.3.1).
- Attribute 6 is the absolute maximum and is temporary (buffs only).
- HP and HD use permanent Vitality. Level-1 HP now runs from 16 to 48, and the fixed-average option for d12 is 7 (2.5).
- Speed table: 6 tiles for Finesse 5 or a buffed 6 (2.6).

**v0.6 (from v0.5):**
- **Level-1 HP is the maximum of the health die × 4** (d4 → 16, d6 → 24, d8 → 32, d10 → 40, d20 → 80), with no roll (2.5).

**v0.5 (from v0.4):**
- **Buffing a 5 grants advantage** (confirmed, no longer TBC) (2.2).
- **Domains for every class**, including the hybrids and the sword saint concept, with eight new domains described (2.3.3).

**v0.4 (from v0.3):**
- **Attribute 5 is now a d20 with no critical failures.** The attribute 6 tier is removed. Attributes cap at 5, and starting spreads top out at 4, so a 5 is earned (2.2, 2.3.1).
- **Removed the uncommon dice idea** (d14, d16, d18, d24, d30). Dice are d4–d12 plus d20.
- **ATK = attack die + key stat.** Added key stats per class and rules for crits and misses (2.4).
- **Added short descriptions and example tasks for every domain** (2.3.3).
- **Powers moved to a future section**, with notes kept (2.7).
- **Added Hit Points (2.5):** level-1 HP is Vitality × 4, and each level adds a roll of your Vitality die (HD).
- **Added Speed (2.6):** SPD = 3 + Finesse ÷ 2, rounded up.
- Every attribute now has a combat role, so the earlier "attributes in combat" TBC is resolved.
- Updated the glossary: HD and SPD are now defined.

**v0.3 (from v0.2):**
- Removed target numbers: success is always 4+, and difficulty is advantage and disadvantage only.
- Removed skills, training, trades and tiered lore. Checks roll against attributes, with class domains for specialized tasks.
- Removed the SKL variable.

**v0.2 (from v0.1):**
- Fixed duplicate section numbering. Renamed "Wits" to Intelligence. Moved Attack Dice into the numbered structure.


---

## 3. Why the Rules Work This Way

These notes used to sit in the Core Rules. They explain choices; players do not need them.

**The shape of the ladder.** Each attribute step adds less than the one before (1→2 is +25 points of success, 2→3 +13, 3→4 +7, 4→5 +5), and advantage helps low dice most. A buffed 6 jumps to a d20: bigger totals and no critical failures.

**Why stacking advantage, capped at 3.** Each extra source is worth most to a low die, which rewards set-ups and positioning. The cap keeps any roll from becoming automatic.

**Why three actions.** Three actions give a turn real choices (move and strike twice, set up and cash in, retreat and defend) without a separate move and action. Reactions that cost actions make defence a decision: every blow you soak is an action you will not spend later.

**How much Defend saves.** Average damage per attack, defending every non-crit hit (both dice explode), *without / with shield*:

| Attacker | Undefended | None | Light | Medium | Heavy |
|---|---|---|---|---|---|
| Rogue, d4 + 2 | 4.6 | 3.7 / 3.4 | 3.4 / 3.1 | 3.2 / 2.9 | 3.1 / 2.9 |
| Fighter, d6 + 4 | 7.4 | 6.1 / 5.4 | 5.4 / 4.7 | 5.0 / 4.3 | 4.6 / 3.8 |

Defending trims a hit but costs an action. Small attacks are hard to reduce below 3; crits cannot be defended, so they always matter.

**Hero attacks against foe DEF** (v0.20 simulation, average damage per attack, foes' DEF rolled automatically):

| Attack | DEF none | d4 | d6 | d8 |
|---|---|---|---|---|
| Rogue d4+3 | 5.4 | 4.0 | 3.7 | 3.5 |
| Rogue d4+3 with Sneak Attack | 7.2 | 5.7 | 5.4 | 5.0 |
| Fighter d6+3 | 6.5 | 4.7 | 4.3 | 3.9 |
| Wizard staff d4+3 (no crits, no misses) | 5.5 | 2.9 | 2.4 | 2.1 |
| 2-dice power, d6+3 | 9.4 | 7.3 | 6.9 | 6.5 |
| Rushed 2nd attack, d6+3 | 4.4 | — | 2.2 | — |

Takeaways: foe DEF matters a lot, so crits (which ignore it), *Piercing Strike* and set-ups are the real damage. A rushed second attack is weak, which pushes heroes toward powers and combos. The wizard's staff is reliable against unarmoured foes but poor against armour; her damage comes from powers. A party deals roughly 25 to 40 damage a round; boss HP (110 / 150 / 200) aims at about five rounds.

**Why a flat Wound modifier.** Wounds make a hero worse at everything without removing options. The −1s bite hardest in the middle of the ladder, and because they come off the total after an explosion, even a badly hurt hero can have a heroic moment. Chance a check succeeds:

| Die | No Wounds | 1 | 2 | 3 |
|---|---|---|---|---|
| d4 | 25% | 25% | 19% | 12% |
| d6 | 50% | 33% | 17% | 17% |
| d8 | 62% | 50% | 38% | 25% |
| d10 | 70% | 60% | 50% | 40% |
| d12 | 75% | 67% | 58% | 50% |
| d20 | 85% | 80% | 75% | 70% |

**HP is a budget.** Healing between Camps is limited by hit dice, so HP is managed across a stretch of stops. Victories pull the other way: pushing on means stronger starts. Camp spacing is therefore the main difficulty dial.

---

## 4. Open Questions (TBC)

**Balance (needs playtesting first)**
- Foe HP and damage against three-action heroes. Standard battles should last 2 to 3 rounds and cost the party about a quarter of its HP.
- Boss HP (110 / 150 / 200) and escort budgets.
- *Guidance* (0 MP bless) lets the cleric enable a combo every turn: is +2 MP a round for two heroes too much?
- *Create an opening* is a 1-action set-up for anyone; the once-per-foe limit may need to become once per round.
- *Come and Get It* and *Gravity Well* stagger groups. Are they too strong with the sure-crit rule?
- Feats to watch: *Conductor*, *Rhythm*, *Glass Cannon*, *Last Stand*, and Surge and Set-up resonance.
- Swarm damage (equal to remaining HP) and minion flat damage by region.
- Malice growth (round number + Downs) and threat costs.

**Economy and progression**
- XP per level (4), Camps per region, and how many stops a region map has.
- Gold prices, downtime prices, shop stock; whether gold carries between runs.
- The relic list; the fate-token pool size (3).
- Starting MP: Victories up to 3, total cap 5.

**Heroes**
- Levels 6 to 10 for every class; paths; hybrid powers.
- How strong class options should be (no roll, or advantage).
- Companion scaling.

**Rules**
- Group checks (half must succeed) may be too lenient.
- Whether Defend should ever protect an adjacent ally (Block does a little of this).
- Whether rushed attacks should apply to powers (currently no).

**Mobile UI**
- How to show Chain and Link triggers, Growth counters, resonance, Malice and the next threat without clutter.
- Whether the Lurker and Artillery target rules read clearly.

---

## 5. Left for Later (from the Emberwatch Tactics review)

- **Three actions per turn and saved actions as reactions** (from PF2e and Nimble). Richer, but heavier than move plus act. Revisit if you want reactions to cost something.
- **Multiple attack penalty.** Only needed with three actions.
- **Role-based XP weights** (damage dealt, blows absorbed, foes moved, combos). A neat idea for a progression chapter. Level-up after each battle is simpler.
- **Encounter budgets and depth scaling** (Draw Steel, PF2e, D&D 4e), foe stat blocks, boss surges, missions and regional twists. Ready-made material for the encounter chapter.
- **Terrain:** difficult terrain, high ground, cover, large 2×2 creatures, hazards.
- **Combo damage counter** (+1 damage per combo this round, max +3) and **exposed +3 damage**: possible extras if combos need more reward than MP.

---

## 6. Parked: Domains

> Domains were part of v0.5 to v0.9 and are **not used by the current rules**. Specialized tasks are now handled by character moves (Heroes book, class powers and moves). This appendix is kept for reference, and as a source of ideas for moves (each domain's example tasks could become a move).

### C.1 Domains (Specialized Tasks)

Everyone can attempt the common tasks above. Some tasks need specialized knowledge or training that most people lack (picking locks, brewing potions, medicine, identifying magical objects, deciphering writing, knowing the underworld).

Each class has a short list of **domains**. When a check involves a specialized task:

- If it falls within one of the character's **domains**, roll the attribute die normally.
- If not, roll with **disadvantage**. *(Very specialized tasks may be impossible. The encounter decides.)*

Domains do not make common tasks easier, and there is nothing to track or level up. The encounter decides which attribute a domain task tests (usually INT for knowledge, DEX for hands-on work).

| Class | Domains |
|---|---|
| **Rogue** 🗡️ | Criminal Underworld, Poisons, Locks & Traps |
| **Fighter** 🛡️ | Tactics & War, Arms & Armour, Smithing & Repairs |
| **Wizard** 🌀 | Arcana, History, Deciphering Writing |
| **Cleric** ✨ | Religion, History, Medicine |
| **Paladin** 🛡️✨ | Religion, Tactics & War, Law & Nobility |
| **Bard** 🗡️✨ | History, Music & Performance, Languages & Cultures |
| **Barbarian** 🗡️🛡️ | Wilderness & Tracking, Beasts & Monsters, Tactics & War |
| **Ranger** 🗡️🌀 | Wilderness & Tracking, Beasts & Monsters, Locks & Traps |
| **Druid** ✨🌀 | Nature & Herbs, Beasts & Monsters, Arcana |
| **Monk** 🛡️🌀 | Martial Arts & Duelling, Philosophy & Meditation, Medicine |
| **Sword saint** 🗡️ *(concept)* | Martial Arts & Duelling, Arms & Armour, Philosophy & Meditation |

Domains can be shared between classes (History, Tactics & War, Beasts & Monsters and others appear more than once). The first group of domains below belongs to the core four; the second group was added for the hybrid classes.

### C.2 What Each Domain Covers

| Domain | Covers | Example tasks |
|---|---|---|
| **Criminal Underworld** | Thieves' guilds, smugglers, fences, black markets, gang signs and underworld slang | Finding a fence for stolen goods; recognizing a gang's mark; knowing who runs a district |
| **Poisons** | Identifying, preparing, applying and neutralizing poisons and venoms | Telling what poisoned a victim; brewing an antidote; coating a blade |
| **Locks & Traps** | Picking and opening locks; spotting, disarming and setting traps | Picking a chest lock; noticing a tripwire; disarming a pressure plate |
| **Tactics & War** | Battlefield strategy, fortifications, sieges, and the history of famous battles | Reading an enemy army's formation; finding the weak point in a wall; recognizing a banner |
| **Arms & Armour** | Weapons and armour: their make, quality, origin and unusual types | Appraising a sword; identifying a strange weapon; judging an armour's condition |
| **Smithing & Repairs** | Forging, sharpening and mending metal items and equipment | Repairing broken armour in the field; reforging a blade; spotting a flaw in metalwork |
| **Arcana** | The study of magic: spells, enchanted items, magical creatures and effects | Identifying a magic item; recognizing a spell being cast; understanding a ward or a rune |
| **History** | Past events, ancient civilizations, ruins, heraldry and legends | Dating a ruin; knowing who built a monument; recalling a legend about a place |
| **Deciphering Writing** | Reading ancient, foreign, coded or damaged writing; spotting forgeries | Translating an old inscription; cracking a simple cipher; telling a forged letter from a real one |
| **Religion** | Gods, rites, holy symbols, cults, sacred sites and the undead | Recognizing a cult's symbol; knowing a funeral rite; identifying a holy relic |
| **Medicine** | Treating wounds, diagnosing illness, anatomy and remedies | Stabilizing a dying ally; diagnosing a disease; setting a broken bone |
| **Law & Nobility** | Laws, courts, oaths, heraldry, noble houses and courtly etiquette | Knowing what a law permits; recognizing a noble house's crest; behaving correctly at court |
| **Music & Performance** | Instruments, singing, composing, storytelling and stagecraft | Playing for a crowd; recognizing a song's origin; telling a tale that holds a room |
| **Languages & Cultures** | Spoken foreign languages, customs, trade routes and local etiquette | Understanding a foreign merchant; avoiding an insult to local custom; knowing what a region trades |
| **Wilderness & Tracking** | Travel, navigation, tracking, camping skills and reading the weather | Following a trail; finding a safe route; predicting a storm |
| **Beasts & Monsters** | The habits, anatomy, weaknesses and lairs of animals and monsters | Identifying a creature from its tracks; knowing what a monster fears; calming a wild animal |
| **Nature & Herbs** | Plants, fungi, herbs, seasons and natural cycles | Finding a healing herb; telling a poisonous mushroom from a safe one; reading signs of blight |
| **Philosophy & Meditation** | Schools of thought, spiritual disciplines, focus and mental control | Resisting a mental trick through focus; recalling a philosopher's teaching; calming a troubled mind |
| **Martial Arts & Duelling** | Fighting styles, schools and masters, unarmed technique and formal duels | Recognizing an opponent's fighting school; judging a duellist's skill; knowing the etiquette of a duel |
