# Emberwatch Tactics — Rulebook

*The complete rules of the game as they are currently implemented, written as a tabletop rulebook. Use it to audit the game and to propose changes. Section numbers (§) are stable so you can refer to them.*

> **How to use this document.** Chapters 1–9 are the rules. The appendices hold the full lists of heroes, powers, weapons, relics, foes and the tuning numbers, taken directly from the game data (`js/data.js`, `js/engine.js`, `js/run.js`) when this document was written. The last chapter, **Audit notes**, lists places where the implementation makes a choice you may want to review.
>
> If you change a rule here, mark it (for example with **CHANGE:** or strike-through) and it can be carried back into the code.

---

## 1. Overview

### §1.1 The game
Four heroes (Brakka the fighter, Vex the rogue, Orin the wizard and Sela the cleric) journey through three regions: the Greenmarch, the Barrow Moors and the Ashen Waste. Each region is a branching map of battles, events, shops and camps that ends in a boss. Beat all three bosses to win. If every hero falls in a battle (or a mission is failed), the journey ends.

### §1.2 The battlefield
Battles take place on a grid **6 squares wide and 8 tall**. Distances are counted orthogonally (no diagonal steps). "Beside" or "adjacent" means orthogonally next to. Large creatures fill a 2×2 block and are beside anything touching any of their squares.

### §1.3 Attributes
Every creature has four attributes:

| Attribute | Used for | Skills |
|---|---|---|
| **Might (M)** | Force, endurance and heavy melee | Athletics |
| **Finesse (F)** | Precision, agility, stealth, ranged weapons, initiative | Acrobatics, Stealth, Thievery |
| **Wits (W)** | Reasoning, magic, reading the terrain | Magic, Lore, Survival |
| **Presence (P)** | Conviction, leadership, reading people | Insight, Influence |

Every power names the attribute it uses; that attribute is added to its damage and to the save DC it sets.

---

## 2. Combat round

### §2.1 Initiative
When a battle starts, every creature rolls **d20 + Finesse** (heroes add +3 with the Hourglass of Haste). Turns go from highest to lowest, **heroes and foes mixed together**, and the order repeats every round. Ties go to heroes, then to the higher Finesse. Creatures that arrive during a battle roll initiative and are slotted into the order.

### §2.2 Round structure
1. Creatures act in initiative order.
2. **End of round:** mission effects are checked (shrine held, ritual counter, reassembling skeletons), then the round counter goes up and the following happen in order:
   - walls of ice, zones and timed hazards count down;
   - Bloodlust ends;
   - regional twists act (§8.3);
   - the foes gain momentum (§7.1) and may unleash a threat;
   - mission reinforcements arrive (§8.2);
   - the combo counter resets to 0 (§5.4).

### §2.3 Start of a turn
At the start of its turn a creature:
- loses its shield (heroes keep a shield they started the battle with through round 1);
- regains its reaction (foes);
- takes damage from bleeding, burning and any enemy zone it stands in.

A boss may unleash a **surge** first (§7.3).

A **staggered foe** (not a boss) loses its whole turn instead (§5.1).

### §2.4 End of a turn
At the end of its turn a creature suffers any lingering hazard it stands in. Then all its timed conditions count down by 1.

---

## 3. Hero turns: three actions

### §3.1 Actions
On their turn a hero has **three actions** (PF2e, Nimble 2e). Each of these costs one action, in any order:
- **Move:** up to the hero's speed. A move can be split up around other actions: squares left over from a move can be walked later in the same turn without spending another action. On screen, brighter blue squares are the leftover movement.
- **Basic attack.**
- **A power.** Some powers are **free actions** and cost none.

Moving into a square and attacking from it in one tap spends the move action (if needed) and then the attack action.

Special cases:
- A **dazed** hero has only **one action** on its turn.
- An extra turn granted by *Inspire* has **two actions**.

### §3.2 Saving actions: reactions
Actions a hero doesn't spend are **saved** (blue pips) until the start of their next turn. There each saved action pays for **one reaction**, and each *kind* of reaction can be used only **once** between the hero's turns (Nimble 2e). Reactions trigger **automatically** when their trigger happens. A hero who is dazed or staggered can't react, and a dazed hero saves no actions.

| Reaction | Who | Trigger | Effect |
|---|---|---|---|
| **Defend** | every hero | A foe's attack hits them for 4 or more | Halve the damage (round down). |
| **Opportunity attack** | every hero | A foe beside them moves out of the square beside them | Make their basic attack against it (no momentum, no multiple-attack penalty). |
| **Intercept** | Brakka | A foe's single-target attack is aimed at an ally beside her | She takes the attack instead. It is re-rolled against her, and she can still Defend it. |
| **Opportunist** | Vex | An ally's action hits a foe beside her (not a staggered one) | She strikes it with Blades. |
| **Repelling Ward** | Orin | A foe ends its movement beside him | Push it 1 square away (it is not staggered). If it can no longer reach its target, its attack changes or fails. |
| **Warding Word** | Sela | A foe hits an ally within 3 for 4+ and that ally can't Defend | Halve the damage. |

**Order when a hero is attacked:** Intercept first, then the target's Defend, then Warding Word (only if the target couldn't Defend).

### §3.3 Momentum (hero resource)
Momentum is shown as ◆ gems (up to 10), and powers cost momentum.
- Heroes **start every battle with 0** (+2 with the Battle Hymn).
- **+1** for the **first basic attack** each turn (+2 with the Tactician's Map).
- **+2** for every **combo**, to both the hero who lands it and each hero who set it up (§5.4).
- A few items and powers grant more: Death Mark regains 2; the Duelist's Rapier gives +1 on a basic-attack critical hit; plundering a chest gives +1.

### §3.4 Basic attacks and innate powers
- Every hero has a **basic attack** that costs no momentum; its dice come from the weapon in hand: Brakka's **Sword**, Vex's **Blades**, Orin's **Bolt** (range 5) and Sela's **Mace**.
- Vex's Blades **feint**: on a hit, the foe makes a **Wits save** or is **exposed** for Vex's allies.
- Three heroes have a free **set-up** power that costs 0 momentum but still costs an action:
  - Brakka's **Shove:** push 1, then a Might save or staggered.
  - Orin's **Force Push:** range 4, push 1 away, then a Might save or staggered.
  - Sela's **Guidance:** bless an ally within 3.

### §3.5 Powers
All other powers are learned: each hero starts with three and gains more as rewards (§9.3). Each power lists its level, momentum cost, attribute, target and range, damage dice and effects (Appendix B).

### §3.6 Rival heroes
In skirmish mode, foes can include **rival heroes**, who use the same hero rules (three actions, momentum, reactions) and the hero AI.

---

## 4. Attacks and damage

### §4.1 Damage dice (after Nimble 2e)
Every attack rolls damage dice:
- Basic attacks roll their weapon's dice.
- Hero powers roll the **class die**: d8 for Brakka, d4 for Vex, d6 for Orin and Sela. The number of dice is set by the power.
- Foes roll the die given in their stat block.

The **first die is the primary die**. Only it decides the result:

| Primary die | Result |
|---|---|
| **1** | **Miss:** no damage and no effects. |
| **2 … top−1** | **Hit.** |
| **top number** | **Critical hit:** roll one more die and add it, and one more again every time the top number comes up (up to 12 extra dice). Critical hits ignore armour and add "on a crit" effects. |

The other dice only add damage. Small dice crit (and miss) more often. With the Loaded Bones relic, hero critical hits roll one extra die.

Attacks that use **flat damage** instead of dice (minions, swarms) never miss or crit.

### §4.2 Damage total
The dice total, then additions in this order:
1. **+ attribute** (hero powers) or **+ strength**, the foe's depth bonus (§8.4);
2. **+ weapon bonus** (basic attacks);
3. **+1** Dwarven Whetstone;
4. **+ sneak attack** (Vex, §5.5);
5. **+3 exposed**;
6. **+ combo bonus** (§5.4);
7. **×2 radiant** against undead;
8. **×2 execute** (Assassinate against a foe at half health or less);
9. **− armour** (not on a critical hit; the result is never below 1);
10. **+3** Sentinel Lens (hero reaction strikes only).

The damage then goes through reactions (Defend, Warding Word), then shields, then health.

Foe damage: dice + strength (minimum 1), +2 savage (against a hero at half health or less), +3 exposed.

### §4.3 Advantage and disadvantage (stacking, after Nimble 2e)
- **Advantage:** roll the primary die again and keep the best.
- **Disadvantage:** roll it again and keep the worst.
- Every **different source** counts once, and sources **stack**: net advantage = sources of advantage − sources of disadvantage, capped at **triple** (roll 4, keep 1).
- *Hidden* counts double, and so does the third attack in a turn.

Sources of **advantage:**
- the attacker is **blessed** or **hidden** (hidden counts double);
- a power with the *edge* property (Shadowstep);
- **dual wield:** Vex's first Blades each round;
- the target is **rooted** or **dazed** (one or the other), or **exposed** by someone else;
- **flanking:** a melee attack with an ally directly on the far side of the target (for large creatures, an ally on the opposite side);
- Vex only: an **ally stands beside the target** (instead of flanking);
- **high ground:** attacking from raised ground at a target that isn't on it;
- foes only: **pack** (another foe beside the target), **aura** (within 2 of a foe with an aura) and **Bloodlust**.

Sources of **disadvantage:**
- the attacker is **weakened**, or **marked** by someone other than the target;
- ranged only: a **foe beside the attacker**, and **cover** (single-target ranged attacks through cover at range 2+);
- the Warding Charm: a foe's first attack against each hero each battle;
- the **multiple attack penalty** (§4.4).

### §4.4 Multiple attack penalty (after PF2e)
On their own turn, a hero's **second attack** has disadvantage and the **third** has double disadvantage.
- An *attack* is any power that rolls damage against foes, or that foes save against.
- An **area attack is one attack**, however many foes it hits.
- A multi-hit power (Twin Fangs, Thousand Cuts) is one attack.
- **Reactions are exempt.**
- Against **powers a foe saves against**, the penalty lets the foe roll its save again and keep the best (twice more on a third attack).

### §4.5 Saving throws
Powers that let a foe resist call for a save: Shove, Force Push, and the Blades feint.
- The foe rolls **d20 + its attribute + depth bonus (⌊depth/4⌋)**.
- If the total reaches **12 + the hero's attribute for that power + ⌊level/3⌋**, the foe resists.
- The preview shows the chance.

### §4.6 Area attacks
Area powers affect every creature of the affected side in the area. Each target gets its own roll: it can miss one foe and crit another.
- Swarms take **double damage** from area attacks.
- Area attacks ignore cover.

### §4.7 Opportunity attacks (parting blows)
When a creature **voluntarily** moves out of a square beside an enemy, that enemy may strike it:
- **Foes:** once a round for free (their reaction). They deal flat damage: 3 + the higher of Might and Finesse + strength. Minions and swarms deal 2; tiny swarms deal 1 per critter.
- **Heroes:** only by spending a saved action; they make their basic attack (§3.2).

Also:
- If Brakka's opportunity attack lands, the foe is **stopped** where it is and **marked**.
- **Nimble** creatures never provoke, and nor does teleporting.
- Staggered and dazed creatures can't make opportunity attacks.
- The move preview turns red when a path will provoke.

---

## 5. Set-ups and combos

### §5.1 Staggered
A creature is staggered when it is **pushed or pulled at least one square**, **slammed**, or hit by a power that staggers.
- A staggered **foe loses its next turn**, unless it is a boss.
- The next attack against it by **anyone other than whoever staggered it** is a **sure critical hit** and snaps it out of it; it then keeps its turn.
- Against a **boss**, that attack gets +2 advantage (stacking) instead.
- Its own staggerer's attacks don't use it up, so it still loses the turn.

A staggered creature's speed is halved and it can't react. After losing a turn a foe is **steadied** and can't be staggered again until after its following turn.

### §5.2 Exposed
- Attacks against an exposed creature have **advantage** and deal **+3 damage**.
- Only the allies of whoever exposed it get this.
- It lasts until the end of its next turn.

### §5.3 Blessed
- A blessed creature has **advantage** on its next attack.
- The blessing is used up by that attack, or ends at the end of the blessed hero's next turn.

### §5.4 Combos
When a hero **cashes in a set-up another hero made**, it's a **combo**:
- attacking a foe an ally staggered or exposed, or
- attacking while blessed by an ally.

On a combo:
- The hero and each hero who set it up gain **+2 momentum**.
- The **combo counter** goes up by 1. For the rest of the round every hero hit deals **+1 damage per combo so far (max +3)**.
- One combo per action at most.
- **Nobody cashes in their own set-up.**

### §5.5 Sneak attack (Vex)
Vex deals **+3 damage (+1 per 3 levels)** against a foe that is set up, or when attacking from hiding. A foe is set up when it is:
- staggered or exposed by someone else;
- rooted or dazed;
- or has one of Vex's allies beside it.

### §5.6 Marked and taunted (Brakka)
- A marked creature has disadvantage on attacks that don't target whoever marked it.
- A foe **Brakka** marks is also **taunted**: while it can reach her, it can only attack her.
- A mark lasts until the end of the marked creature's next turn.

---

## 6. Conditions, terrain and hazards

### §6.1 Conditions
Durations count down at the end of the affected creature's turn. A condition applied during a creature's own turn lasts one turn longer.

| Condition | Effect |
|---|---|
| **Staggered** | See §5.1. Speed halved; no reactions. |
| **Dazed** | Hero: one action this turn. Foe: can move or act, not both. No reactions. Bosses are immune. |
| **Rooted** | Can't move; attacks against it have advantage. Bosses are immune. |
| **Slowed** | Speed 1. |
| **Weakened** | Disadvantage on its attacks. |
| **Bleeding** | Takes damage at the start of each turn: 3 if a hero applied it, 2 + region index (0/1/2) if a foe did. |
| **Burning** | Takes 3 fire damage at the start of each turn. Stepping into water puts it out. |
| **Exposed** | See §5.2. |
| **Marked** | See §5.6. |
| **Blessed** | See §5.3. |
| **Hidden** | The next attack has double advantage, then the creature is revealed. |
| **Shield** | Absorbs damage before health; fades at the start of the owner's next turn. |

### §6.2 Terrain
- **Difficult terrain** (water, brambles, rubble, ash) costs 2 movement to enter.
- **High ground** gives advantage against targets below, and +1 range to ranged attacks.
- **Tall obstacles** block movement and line of sight.
- **Cover** blocks movement and gives disadvantage to single-target ranged attacks at range 2+.

Obstacles are listed in Appendix H.

### §6.3 Forced movement
- **Push:** move the target directly away. If it can't move further, it **slams**: 2 damage + 1 per square of push left, and it is staggered. A creature it slams into takes 2 and is staggered too.
- **Pull:** move it directly toward the source.
- Any forced movement of 1+ square staggers the target (except Shove, Force Push and Repelling Ward).
- **Steadfast N** reduces pushes and pulls by N.
- Orin's pushes and pulls move 1 extra square, as do all heroes' with the Gauntlet of Force.
- A creature pushed into a hazard suffers it.

### §6.4 Hazards
A creature suffers a hazard when it enters it (even when pushed) or ends its turn in it. Damage is the listed amount + the region index (0 in region I, 1 in II, 2 in III). The full list is in Appendix H.

### §6.5 Zones
Lingering areas created by powers last 2 rounds. They affect enemies that start their turn inside.

---

## 7. Foes

### §7.1 Foe momentum and threats
- The foes share a momentum pool that starts at 0 and gains **+1 each round**, with no limit.
- When it reaches the cost of their next **threat**, they spend it and unleash the threat (Appendix G).
- The threats cycle through a list that grows with the battle's depth (depth = floor depth + 2 for elites + 3 for bosses):
  - Bloodlust always;
  - Eruption at depth 2+;
  - Reinforcements at depth 4+;
  - Dark Rite at depth 8+.
- Some foes also spend momentum on special attacks.

### §7.2 Foe turns
A foe:
1. moves up to its speed;
2. makes one attack or uses one ability;
3. makes additional attacks if its stat block says so;
4. keeps its reaction for one opportunity attack a round.

Further rules:
- A dazed foe can move or act, not both.
- **Summoners** call allies every other round.
- **Skulkers** slip 1 square away after acting.
- Foes pursue the mission: many go for the captive, the shrine, the wagon, the chests or the exits.

### §7.3 Bosses
- Bosses can't be dazed or rooted, and don't lose turns to staggers.
- They unleash a **surge** at the start of their turn on **rounds 1, 3 and 5** (Appendix E).

### §7.4 Minions and swarms
- **Minions** have 1 health: any hit slays them. They deal flat damage and come in hordes of four.
- **Swarms** are up to four critters sharing a square and a health pool. They deal 1 damage per critter still standing, and take double damage from area attacks.

---

## 8. Battles and encounters

### §8.1 Missions
Each battle has a mission (Appendix F). Normal battles draw from the region's list; elites are Rout or Assassinate.

### §8.2 Reinforcements
In story battles:
- **Hold:** foes arrive every other round until round 6 (1 + region each time).
- **Survive:** 1–3 foes arrive every round for 5 rounds.
- **Defend:** 1–2 foes arrive every round for 5 rounds.
- **Breakout:** 1 foe arrives from the bottom every round.

### §8.3 Regional twists
Missions in regions II and III carry a twist (Appendix F).

### §8.4 Depth and foe scaling
Every battle has a **depth**: region × 4 + min(3, ⌊map floor / 2⌋), plus 1 for elites. Bosses are at region × 4 + 3. From depth:

| Stat | Scaling |
|---|---|
| Foe health | × (1 + 0.03 × depth) |
| Boss health | × 0.55 × (1 + 0.03 × depth) |
| Object health | × (1 + 0.08 × depth) |
| Elites | +30% health × [0.7, 0.4, 0.5] by region |
| Chiefs | +30% health |
| Foe strength (damage bonus) | +⌊depth × 0.15⌋ |
| Foe save bonus | +⌊depth / 4⌋ |

### §8.5 Encounter budgets (after Draw Steel, PF2e, D&D 4e and Nimble)
Each battle buys foes from a **budget**:

> **budget = party strength × 0.4 × threat × region multiplier × mission share** (× elite multiplier)

- **Party strength (Draw Steel):** 4 heroes × (4 + 2 × expected level), where the expected level = 1 + 0.75 × depth (three levels a region).
- **Threat (PF2e):** moderate 1 for battles, severe 1.35 for elites (PF2e uses 1.5), extreme 2 for bosses.
- **Region multiplier:** [1, 0.9, 0.65].
- **Mission share:** see Appendix F.
- **Elite budget multiplier:** [0.9, 1, 1] by region.
- **Bosses:** the boss is bought first and takes 1.25 × a moderate budget; the rest buys its escort.
- **Elites:** the elite foe costs 1.3 × its cost.
- **Foe costs (D&D 4e):** each foe's cost is its value in standard foes; a horde of 4 minions costs 2.

Foes are picked at random from the region's pool (Appendix D) until the budget is spent, to a maximum of 12 creatures. A boss's escort excludes foes costing 5 or more.

### §8.6 Winning and losing
- A battle is **won** when its mission is complete (for Rout, every foe is slain).
- It is **lost** when every hero has fallen, or the mission fails (the captive or the wagon falls, the chief escapes, and so on).
- A fallen hero is out for the battle and returns afterwards at 25% health.

---

## 9. The journey

### §9.1 The map
Each region is a map of **7 floors × 4 lanes** of connected nodes, ending at the boss.
- Floor 1 is always a battle, and the last floor is a campfire.
- Other nodes are rolled by weight: battle 45, event 22, elite 13 and shop 10 (elites and shops from floor 3), and rest 9 (floors 3–5).
- Floor 4 may be a treasure.
- There are at most 2 shops per region.

| Node | What happens |
|---|---|
| **Battle** | A fight. |
| **Elite** | A champion and guards. Adds treasure. |
| **Event** | A choice, often with a skill check. |
| **Shop** | Buy relics, powers, weapons and healing. |
| **Campfire** | Heal 40%, or train a new power. |
| **Treasure** | Choose a relic. |
| **Boss** | The region's boss. |

### §9.2 After a battle
- **Gold:** 10–17 (+3 per region) for a battle, 26–37 for an elite, 45–59 for a boss. +30 for grabbing all 3 chests in Plunder, and ×1.5 with the Lucky Coin.
- **Healing:** survivors heal 5% of max health (+15% with the Healer's Satchel). The fallen return at 25%. Beating a boss heals everyone 60% more.
- **Experience:** each hero earns the weighted value of their deeds in battle (Appendix A) + 30 for the win (+15 elite, +50 boss).
- **Levels:** heroes level up at: **L2 55, L3 125, L4 210, L5 315, L6 440, L7 580, L8 740, L9 910, L10 1100, L11 1320, L12 1560** total XP (max level 12). Each level adds the class's health growth, and attributes rise as listed in Appendix A.
- **Rewards:** choose one new power from 3 offered, from powers of a level the hero has reached. An elite adds a choice of 2 relics or 1 weapon. A boss adds a choice of 3 relics.

### §9.3 Equipment
- **Weapons** set the basic attack's dice and may add damage or a trait (Appendix C). A new weapon goes straight to a hero still using their starting weapon; otherwise into the pack.
- **Relics** (Appendix C): up to **2 are active** at once; the rest wait in the pack. Swap them from the Equipment screen.

### §9.4 Shops
- Shops offer 3 relics (list price ±10), 2 powers (55 + 5 × power level), 2 weapons (tier 2: 70, tier 3: 120, tier 4: 180, ±8) and healing (40% for everyone, 35 gold).
- Weapon offers are tiers [2, 2, 3] in region I, [2, 3, 3, 4] in region II and [3, 4, 4] in region III.

### §9.5 Events and skill checks
- Events offer choices; some need a **skill check**.
- The party's best hero rolls **3d6 + attribute (+2 if trained in the skill)** against a DC.
- Outcomes can give or take gold, heal or hurt the party, grant a relic, weapon or power, or start a fight.

## 10. Audit notes (open questions)

These are places where the implementation makes a specific choice, simplifies something or differs from its inspirations. Each is worth a decision.

1. **Reactions are automatic.** The player chooses how many actions to save, not which reaction they pay for. Defend fires on the first hit of 4 or more, even if a bigger hit follows, and Opportunist and opportunity attacks fire whenever triggered. *Option: let the player pick a reaction to "ready" when ending the turn.*
2. **Defend and Warding Word halve damage.** Nimble's Defend subtracts the hero's Armour instead. Heroes have no Armour stat.
3. **Foes' opportunity attacks don't roll** (flat 3 + attribute + strength), while heroes' opportunity attacks roll their basic attack.
4. **Foes don't have three actions.** They move, act (plus extra attacks if listed) and keep one reaction. Bosses with two attacks take no multiple-attack penalty.
5. **Three dice systems.** Attacks use damage dice (Nimble), saving throws use a d20, and event skill checks use 3d6. *Consider unifying.*
6. **Save DCs** are 12 + attribute + ⌊level/3⌋ against d20 + attribute + ⌊depth/4⌋. At high level a hero's saves become very hard to resist; nothing caps them.
7. **Area attacks roll separately for every target** (Nimble rolls area damage once for all targets).
8. **Some extra damage doesn't roll:** Cleave's second target takes Might damage, slams take 2 + remaining push, and hazards are fixed.
9. **Power dice are derived:** a hero power's number of class dice comes from its listed hit damage ÷ the class die's average (at least 1), unless the power sets its own dice. The three-number damage lists in the data are legacy values used only for that.
10. **Staggering your own target:** you can't cash in your own stagger, but the foe still loses its turn. Brakka can Shove a foe (about 60% at level 1) and keep it from acting, limited only by the "steadied" immunity after it loses a turn.
11. **Encounter budgets use the expected level for the depth,** not the party's actual level, so fighting more battles still pays off. Region multipliers compensate for regions' foes being stronger per cost.
12. **Boss staggers** give +2 advantage instead of a sure crit and never cost the boss its turn.
13. **Critical hit dice** explode at most 12 times.
14. **Momentum:** only the first basic attack each turn earns it (to stop three attacks earning 3). Combos earn 2 for each hero involved.
15. **The tutorial** uses fixed dice (heroes never miss, foes never crit). This isn't part of the rules.

---

## Appendix A — Heroes

### Brakka — Fighter (Defender)

- **Health:** 34 (+5 per level) · **Speed:** 3 · **Class die (powers):** d8 · **Steadfast** 1
- **Attributes at level 1:** Might 3, Finesse 1, Wits 0, Presence 1. Prime: Might (+1 at levels 3, 6, 9, 12); second: Presence (+1 at levels 5, 8, 11).
- **Trained skills:** Athletics, Survival
- **Style:** Holds the line: shoves and drags foes off balance for her friends, and makes them fight her instead.
- **Trait:** Sentinel: a foe she marks can only attack her while it can reach her, and has disadvantage attacking anyone else. Her opportunity attacks stop a foe in its tracks and mark it. Reaction, Intercept: she takes a blow meant for an ally beside her.
- **Starting weapon:** Iron Longsword; **basic attack:** Sword; **free set-up:** Shove; **starting powers:** Tide of Iron, Hook Chain, Leg Sweep.
- **Experience weights:** damage dealt ×0.5, blows absorbed ×0.8, foes moved and hindered ×3, foes marked ×1.5, healing ×0.2, allies empowered ×1, foes slain ×4, combos set up for allies ×8, combos landed ×3.

### Vex — Rogue (Striker)

- **Health:** 20 (+3 per level) · **Speed:** 4 · **Class die (powers):** d4 · **Nimble**
- **Attributes at level 1:** Might 0, Finesse 3, Wits 1, Presence 1. Prime: Finesse (+1 at levels 3, 6, 9, 12); second: Wits (+1 at levels 5, 8, 11).
- **Trained skills:** Acrobatics, Stealth, Thievery
- **Style:** Fragile but deadly: finishes the foes her friends set up, then slips away.
- **Trait:** Nimble: never provokes parting blows. Sneak Attack: +3 damage (more at higher levels) against a foe that is set up: staggered, exposed, rooted or dazed, or with one of her allies beside it. She gains advantage when an ally stands beside her target. Her Blades feint: a foe she hits may be left exposed for her allies. Reaction, Opportunist: when an ally hits a foe beside her, she strikes it too.
- **Starting weapon:** Twin Daggers; **basic attack:** Blades; **starting powers:** Knife Toss, Hit and Run, Deep Cut.
- **Experience weights:** damage dealt ×1.3, blows absorbed ×0.2, foes moved and hindered ×1, healing ×0.2, allies empowered ×1, foes slain ×7, combos set up for allies ×3, combos landed ×8.

### Orin — Wizard (Controller)

- **Health:** 20 (+3 per level) · **Speed:** 3 · **Class die (powers):** d6
- **Attributes at level 1:** Might 0, Finesse 1, Wits 3, Presence 0. Prime: Wits (+1 at levels 3, 6, 9, 12); second: Finesse (+1 at levels 5, 8, 11).
- **Trained skills:** Magic, Lore
- **Style:** Throws whole groups of foes off balance, then blasts them from afar.
- **Trait:** Force Adept: his pushes and pulls move foes 1 extra square. Reaction, Repelling Ward: when a foe steps up beside him, he pushes it 1 square away.
- **Starting weapon:** Apprentice Wand; **basic attack:** Bolt; **free set-up:** Force Push; **starting powers:** Thunderwave, Scorching Burst, Ray of Frost.
- **Experience weights:** damage dealt ×0.6, blows absorbed ×0.2, foes moved and hindered ×2.5, healing ×0.2, allies empowered ×1, foes slain ×4, combos set up for allies ×6, combos landed ×5.

### Sela — Cleric (Leader)

- **Health:** 26 (+4 per level) · **Speed:** 3 · **Class die (powers):** d6
- **Attributes at level 1:** Might 1, Finesse 0, Wits 1, Presence 3. Prime: Presence (+1 at levels 3, 6, 9, 12); second: Might (+1 at levels 5, 8, 11).
- **Trained skills:** Insight, Influence, Lore
- **Style:** Fights up close to bless her friends, expose foes for them and mend their wounds.
- **Trait:** Channel Divinity: her heals are stronger by her Presence. Radiant damage is doubled against undead. Reaction, Warding Word: when a foe hits an ally within 3 who can't defend, she halves the blow.
- **Starting weapon:** Iron Mace; **basic attack:** Mace; **free set-up:** Guidance; **starting powers:** Rallying Strike, Brand of Judgment, Healing Word.
- **Experience weights:** damage dealt ×0.4, blows absorbed ×0.2, foes moved and hindered ×1, healing ×1.3, allies empowered ×1.5, foes slain ×3, combos set up for allies ×8, combos landed ×3.

**Levels.** Total XP needed: L2 55 · L3 125 · L4 210 · L5 315 · L6 440 · L7 580 · L8 740 · L9 910 · L10 1100 · L11 1320 · L12 1560.

**Experience** is earned per deed, weighted by role (shown with each hero above): damage dealt (per point), blows absorbed (per point), foes moved and hindered, foes marked, healing (per point), allies empowered, foes slain, combos set up and combos landed.

---

## Appendix B — Powers

Columns: level required, momentum cost (◆), attribute, target and range, damage dice as the hero rolls them, effects on a hit (a miss has none), other properties, and in-game text. Every power costs 1 action unless it is a free action.

### Brakka (Fighter)

| Power | Lv | ◆ | Attr | Target | Dice | Effects on a hit | Other | Text |
|---|---|---|---|---|---|---|---|---|
| **Sword** | 1 | 0 | Mig | melee | 1d8 | — | basic | A plain weapon attack. Its damage comes from your weapon. |
| **Shove** | 1 | 0 | Mig | melee | — | — | innate; no damage; Might save or staggered | Push the foe 1 square. It makes a Might save or is staggered. |
| **Tide of Iron** | 1 | 1 | Mig | melee | 1d8 | push 1 (2 on a crit) | mark; follow the push | Shove the foe back and step into the gap. It is staggered (it loses its next turn unless an ally hits it first) and marked. |
| **Grinding Strike** | 1 | 1 | Mig | melee | 2d8 | push 1 (crit only) | mark | A two-handed blow that rolls two dice. Mark the foe. On a crit: push 1. |
| **Hook Chain** | 1 | 1 | Mig | range 3 | 1d8 | pull 2 (3 on a crit), slowed | mark | Range 3. Drag the foe to you: it is staggered and marked. On a hit: slowed. |
| **Cleave** | 1 | 1 | Mig | melee | 1d8 | — | mark; cleave | Mark the foe. Another foe beside you takes damage equal to your Might. |
| **Shield Wall** | 1 | 1 | Mig | self, 3×3 around you | — | — | 6 shield; marks foes within 1 | You and allies around you gain 6 shield. Mark adjacent foes. |
| **Sweeping Blow** | 1 | 2 | Mig | self, 3×3 around you | 1d8 | staggered (crit only) | mark | Strike every foe around you, diagonals too, and mark them all. On a crit: staggered. |
| **Come and Get It** | 1 | 3 | Pre | self, 5×5 around you | — | — | no damage; pull foes 2 toward you | Drag every foe within 2 up to 2 squares toward you. They are staggered and marked: they must fight you. |
| **Leg Sweep** | 3 | 1 | Mig | melee | 1d8 | staggered | mark | Knock the foe down: it is staggered and marked. |
| **Hurl** | 3 | 1 | Mig | melee | 1d8 | push 3 (4 on a crit) | — | Heave the foe up to 4 squares away: it is staggered. Throw it into fire, or into another foe. |
| **Crushing Blow** | 3 | 2 | Mig | melee | 2d8 | staggered, dazed (crit only) | mark | A bone-rattling blow. Mark the foe. On a hit: staggered. On a crit: also dazed. |
| **Interpose** | 5 | 1 | Mig | ally, range 3 | — | — | 6 shield; marks foes within 1; swap places | Swap places with an ally within 3. Both gain 6 shield; mark foes beside you. |
| **Unbreakable** | 5 | 2 | Mig | self | — | — | marks foes within 2; heal self 8 | Heal 8 and mark every foe within 2. |
| **Whirlwind** | 7 | 4 | Mig | self, 3×3 around you | 2d8 | push 1 (2 on a crit) | mark | Strike, shove and mark every foe around you. They are all staggered. |
| **Earthbreaker** | 7 | 4 | Mig | self, 3×3 around you | 1d8 | staggered, slowed | mark | Knock down every foe around you: staggered, slowed and marked. |
| **Last Bastion** | 9 | 4 | Pre | self, 7×7 around you | — | — | heal 5; 8 shield; marks foes within 2 | Allies within 3 heal 5 and gain 8 shield. Mark foes within 2. |
| **Titan's Blow** | 9 | 5 | Mig | melee | 3d8 | push 3 (4 on a crit) | mark | A colossal blow that hurls the foe away, staggered. |

### Vex (Rogue)

| Power | Lv | ◆ | Attr | Target | Dice | Effects on a hit | Other | Text |
|---|---|---|---|---|---|---|---|---|
| **Blades** | 1 | 0 | Fin | melee | 1d4 | — | basic; feint: Wits save or exposed | Quick knife work that doubles as a feint. On a hit, the foe makes a Wits save or is exposed for your allies (attacks against it have advantage and deal +3). Dual wielding: advantage on your first Blades attack each round. |
| **Piercing Strike** | 1 | 1 | Fin | melee | 3d4 | — | ignores armour | A precise thrust between the plates: ignores armor. |
| **Knife Toss** | 1 | 1 | Fin | range 4 | 2d4 | — | — | Range 4. A thrown knife: sneak attacks work from a distance too. |
| **Hit and Run** | 1 | 1 | Fin | melee | 2d4 | — | then move 2 | Strike, then move up to 2 more squares. |
| **Deep Cut** | 1 | 1 | Fin | melee | 2d4 | bleeding 3 turns | — | A vicious slash: the foe is bleeding. |
| **Shadowstep** | 1 | 1 | Fin | range 5 | 3d4 | — | teleport beside target; advantage | Teleport beside a foe within 5 and strike with advantage. |
| **Sly Flourish** | 1 | 1 | Pre | melee | 2d4 | dazed | — | On a hit: dazed. |
| **Positioning Strike** | 3 | 1 | Fin | melee | 2d4 | push 2 (3 on a crit) | — | Shove the foe where you want it: it is staggered, set up for a friend. |
| **Vanish** | 3 | 1 | Fin | self | — | — | free action; +2 movement; hidden | Free action. Become hidden and gain 2 more movement. |
| **Blinding Barrage** | 3 | 2 | Fin | self, 3×3 around you | 2d4 | dazed | — | Strike every foe around you. On a hit: dazed. |
| **Twin Fangs** | 5 | 3 | Fin | melee | 2d4 | — | 2 hits | Strike twice: each blow rolls its own dice. |
| **Assassinate** | 5 | 4 | Fin | melee | 4d4 | — | ×2 vs half health | Double damage against a foe at half health or less. |
| **Crippling Shot** | 7 | 2 | Fin | range 5 | 2d4 | slowed (not on a crit), rooted (crit only), exposed | — | Range 5. The foe is exposed and slowed. On a crit: rooted instead of slowed. |
| **Dance of Blades** | 7 | 4 | Fin | self, 3×3 around you | 3d4 | — | then move 3 | Strike every foe around you, then move 3. |
| **Death Mark** | 9 | 3 | Fin | range 6 | 2d4 | exposed 2 turns, bleeding 3 turns | regain 2 momentum | Range 6. Exposed and bleeding. Regain 2 momentum. |
| **Thousand Cuts** | 9 | 5 | Fin | melee | 3d4 | — | 3 hits | Strike three times: each blow rolls its own dice. |

### Orin (Wizard)

| Power | Lv | ◆ | Attr | Target | Dice | Effects on a hit | Other | Text |
|---|---|---|---|---|---|---|---|---|
| **Bolt** | 1 | 0 | Wit | range 5 | 1d6 | — | basic | Range 5. A dart of force. Its damage comes from your focus. |
| **Force Push** | 1 | 0 | Wit | range 4 | — | — | innate; no damage; Might save or staggered | Range 4. Push the foe 1 square away. It makes a Might save or is staggered. |
| **Thunderwave** | 1 | 1 | Wit | self, 3×3 around you | 1d6 | push 2 (3 on a crit) | — | Blast every foe around you away: they are all staggered. |
| **Scorching Burst** | 1 | 1 | Wit | square, range 5, 3×3 | 1d6 | — | fire at centre | Range 5. Small 3x3 burst. The centre catches fire. |
| **Ray of Frost** | 1 | 1 | Wit | range 4 | 1d6 | slowed, rooted (crit only) | — | Range 4. The foe is slowed. On a crit: also rooted. |
| **Web** | 1 | 2 | Wit | square, range 4, 3×3 | 1d6 | rooted | webs area | Range 4, 3x3 area. Foes are slowed, or rooted on a hit. Empty squares fill with web. |
| **Fireball** | 1 | 3 | Wit | square, range 4, 3×3 | 2d6 | — | fire at centre | Range 4. Blast a 3x3 area. The centre bursts into fire. |
| **Repulsion** | 3 | 1 | Wit | range 3 | 1d6 | push 3 (4 on a crit) | — | Range 3. Hurl the foe away: it is staggered. |
| **Blink** | 3 | 1 | Wit | square, range 4 | — | — | free action; teleport | Free action. Teleport up to 4 squares. |
| **Cloud of Daggers** | 3 | 1 | Wit | square, range 4, 1×1 | 1d6 | — | zone 3 dmg 2 rounds | Range 4. Whirling blades fill one square for 2 rounds. |
| **Wall of Ice** | 3 | 2 | Wit | square, range 4 | — | — | 3-square ice wall, 2 rounds | Raise a 3-square wall of ice for 2 rounds. Blocks movement and sight. |
| **Hypnotic Pattern** | 5 | 3 | Wit | square, range 4, 3×3 | — | dazed, exposed | no damage | Range 4, 3x3 area. Foes are slowed, or dazed and exposed on a hit. |
| **Stinking Cloud** | 5 | 3 | Wit | square, range 4, 3×3 | 1d6 | weakened | zone 4 dmg 2 rounds | 3x3 zone for 2 rounds: foes starting a turn inside take 4 damage and are weakened. |
| **Gravity Well** | 5 | 4 | Wit | square, range 4, 5×5 | — | — | no damage; pull foes 2 to centre | Range 4, 5x5. Drag every foe 2 squares toward the centre: they are staggered, bunched up for your friends. |
| **Chain Lightning** | 7 | 4 | Wit | range 4 | 2d6 | — | chains to 2 | Range 4. Arcs to 2 more foes within 3. |
| **Disintegrate** | 9 | 4 | Wit | range 4 | 3d6 | — | — | Range 4. An annihilating ray that rolls three dice. |
| **Meteor Swarm** | 9 | 5 | Wit | square, range 6, 5×5 | 2d6 | staggered | fire at centre | Range 6, 5x5 blast. On a hit: knocked down and staggered. |

### Sela (Cleric)

| Power | Lv | ◆ | Attr | Target | Dice | Effects on a hit | Other | Text |
|---|---|---|---|---|---|---|---|---|
| **Mace** | 1 | 0 | Mig | melee | 1d6 | — | basic | A solid blow. Its damage comes from your weapon. |
| **Guidance** | 1 | 0 | Pre | ally, range 3 | — | — | innate; bless | Range 3. Bless an ally: advantage on their next attack, and a combo for you both. |
| **Rallying Strike** | 1 | 1 | Mig | melee | 1d6 | — | bless nearest ally within 3 | Strike, and bless the nearest ally within 3 of you: advantage on their next attack. |
| **Brand of Judgment** | 1 | 1 | Mig | melee | 1d6 | exposed | — | The foe is exposed: attacks against it have advantage and deal +3 damage until the end of its next turn. |
| **Healing Word** | 1 | 1 | Pre | ally, range 4 | — | — | heal 5+Presence; ends conditions | Range 4. Heal 5 and end conditions. |
| **Divine Shift** | 1 | 1 | Pre | ally, range 4 | — | — | 4 shield; swap places | Swap places with an ally within 4. You both gain 4 shield. |
| **Bless** | 1 | 1 | Pre | self, 5×5 around you | — | — | bless | You and allies within 2 are blessed: advantage on your next attack. |
| **Sanctuary** | 1 | 1 | Pre | ally, range 4 | — | — | 10 shield | Range 4. The ally gains 10 shield. |
| **Sacred Flame** | 3 | 1 | Pre | range 4 | 1d6 | — | radiant; heals the most hurt ally within 3 by 2 | Range 4, radiant. Your most wounded ally within 3 heals 2. |
| **Healing Strike** | 3 | 1 | Mig | melee | 1d6 | — | radiant; mark; heals the most hurt ally within 3 by 5 | Radiant strike that marks the foe. Your most wounded ally within 3 heals 5. |
| **Turn Undead** | 3 | 2 | Pre | self, 5×5 around you | 1d6 | push 2, dazed (crit only) | radiant | Undead within 2 take radiant damage and are driven back, staggered. |
| **Inspire** | 3 | 3 | Pre | ally, range 3 | — | — | ally takes an extra turn (2 actions) | An ally within 3 takes an extra turn right after yours. |
| **Guiding Bolt** | 5 | 2 | Pre | range 5 | 2d6 | exposed 2 turns | radiant | Range 5, radiant. The foe is exposed. |
| **Radiant Burst** | 5 | 3 | Pre | self, 3×3 around you | 1d6 | — | radiant; allies heal 3 | Radiant blast around you. Nearby allies heal 3. |
| **Beacon of Hope** | 5 | 3 | Pre | self, 7×7 around you | — | weakened | no damage; allies heal 4 | Foes within 3 are weakened. Allies within 3 heal 4. |
| **Spirit Guardians** | 7 | 3 | Pre | self, 3×3 around you | 1d6 | — | radiant; zone 4 dmg 2 rounds | 3x3 zone for 2 rounds: foes starting a turn inside take 4 radiant and are slowed. |
| **Mass Cure** | 7 | 4 | Pre | all allies | — | — | heal 8+Presence; ends conditions | Every ally heals 8 and ends conditions. |
| **Revivify** | 9 | 4 | Pre | self | — | — | revives a fallen hero at 40% | A fallen hero rises beside you with 40% health. |
| **Holy Word** | 9 | 5 | Pre | self, 7×7 around you | 2d6 | dazed | radiant; allies heal 5 | Foes within 3 take radiant damage; on a hit they are dazed. Allies within 3 heal 5. |

---

## Appendix C — Equipment

### Weapons

| Weapon | Hero | Tier | Basic attack dice | Bonus | Trait |
|---|---|---|---|---|---|
| Iron Longsword | Brakka | 1 | 1d8 | +0 | A plain, trusty blade. |
| Steel Warhammer | Brakka | 2 | 1d10 | +1 | Your basic attack pushes 1 square further. (push) |
| Knight's Halberd | Brakka | 2 | 1d8 | +1 | Your basic attack reaches 2 squares. (reach) |
| Flameforged Blade | Brakka | 3 | 1d10 | +2 | Your basic attack sets foes burning on a critical hit. (burn) |
| Titan's Maul | Brakka | 4 | 2d8 | +3 | Your basic attack pushes 1 square further. (push) |
| Twin Daggers | Vex | 1 | 1d4 | +0 | Quick and quiet. (dual wield) |
| Serrated Knives | Vex | 2 | 1d4 | +1 | Your basic attack leaves foes bleeding on a hit. (dual wield, bleed) |
| Duelist's Rapier | Vex | 2 | 1d6 | +2 | +1 momentum whenever your basic attack lands a critical hit. (keen) |
| Shadowfang | Vex | 3 | 1d6 | +3 | Keen: +1 more damage. (dual wield) |
| Kingslayer | Vex | 4 | 1d6 | +3 | Your basic attack leaves foes bleeding on a hit. (dual wield, bleed) |
| Apprentice Wand | Orin | 1 | 1d6 | +0 | Chipped, but it works. |
| Wand of Reach | Orin | 2 | 1d6 | +1 | Your basic attack reaches 1 square further. (range) |
| Emberstaff | Orin | 2 | 1d8 | +1 | Your basic attack sets foes burning on a critical hit. (burn) |
| Frost Orb | Orin | 3 | 2d6 | +2 | Your basic attack slows foes on a hit. (slow) |
| Staff of the Magi | Orin | 4 | 2d6 | +4 | +1 more damage, and 1 more square of range. (range) |
| Iron Mace | Sela | 1 | 1d6 | +0 | Blunt and honest. |
| Blessed Mace | Sela | 2 | 1d8 | +1 | Your basic attack deals radiant damage (double against undead). (radiant) |
| Warding Censer | Sela | 2 | 1d6 | +1 | When your basic attack hits, you and allies beside you gain 2 shield. (ward 2) |
| Sunforged Flail | Sela | 3 | 2d6 | +2 | Your basic attack deals radiant damage (double against undead). (radiant) |
| Relic of Dawn | Sela | 4 | 2d6 | +3 | Radiant; hits give you and adjacent allies 2 shield. (radiant, ward 2) |

### Relics (2 active at a time)

| Relic | Price | Effect |
|---|---|---|
| Boots of Striding | 120 | +1 speed for every hero. |
| Dwarven Whetstone | 130 | +1 damage on every hero attack. |
| Heart of the Oak | 110 | +8 max health for every hero. |
| Battle Hymn | 100 | Heroes start each battle with +2 momentum. |
| Tactician's Map | 140 | The first basic attack each turn gives +1 more momentum. |
| Phoenix Feather | 130 | The first hero to fall each battle rises at half health. |
| Vampire Fang | 110 | A hero heals 4 whenever they slay a foe. |
| Bulwark Sigil | 100 | Heroes start each battle with 8 shield. |
| Loaded Bones | 150 | Hero critical hits roll one extra die. |
| Sentinel Lens | 90 | Hero reaction strikes (opportunity attacks, Opportunist) deal +3 damage. |
| Warding Charm | 110 | Each foe has disadvantage on its first attack against each hero each battle. |
| Salamander Scale | 100 | Heroes ignore fire and lava damage and cannot be set burning. |
| Gauntlet of Force | 120 | Hero pushes and pulls move 1 extra square. |
| Fenwalker Boots | 90 | Heroes ignore difficult terrain. |
| Hourglass of Haste | 80 | Heroes add 3 to their initiative rolls. |
| Lucky Coin | 70 | Earn 50% more gold. |
| Healer's Satchel | 90 | Heroes heal an extra 15% after every battle. |

---

## Appendix D — Foes

Health, damage and saves scale with depth (§8.4). Cost is the foe's encounter value. Dice are before the strength bonus.

- **Region I:** foes Goblin Rabble, Goblin Cutthroat, Rat Swarm, Goblin Sniper, Goblin Trapper, Dire Wolf, Hobgoblin Guard, Orc Brute, Goblin Hexer; elites Bandit Captain, Orc Brute, Hobgoblin Guard; chief Bandit Captain; boss Orc Warlord; minion horde Goblin Rabble.
- **Region II:** foes Risen Bones, Bat Swarm, Spiderling Swarm, Skeleton, Skeleton Archer, Barrow Zombie, Ghoul, Barrow Spider, Grave Ooze, Grave Cultist, Necromancer, Barrow Wight; elites Barrow Wight, Brood Mother, Necromancer; chief Barrow Wight; boss The Lich; minion horde Risen Bones.
- **Region III:** foes Ember Imp, Gnoll Marauder, Cinder Priest, Fire Drake, Ogre Smasher, Magma Hulk, Rock Golem, Grave Cultist, Orc Brute; elites Ogre Smasher, Rock Golem, Magma Hulk; chief Cinder Priest; boss Ashen Dragon; minion horde Ember Imp.

#### Region I Greenmarch

| Foe | Role | HP | Spd | Armour | Steadfast | M/F/W/P | Cost | Attacks | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Goblin Rabble** | Minion | 1 | 4 | 0 | 0 | 0/2/0/0 | 0.5 | **Stab** (melee): 3 flat | minion |
| **Rat Swarm** | Swarm | 4 | 4 | 0 | 0 | 0/2/0/0 | 2 | **Gnaw** (melee): 1 flat per critter; bleeding (not on a crit) 2 turns | swarm of 4. 1 damage per rat still standing. Gnawing leaves the prey bleeding. |
| **Goblin Cutthroat** | Skirmisher | 10 | 4 | 0 | 0 | 1/2/0/0 | 1.2 | **Jagged Blade** (melee): 1d6+1; bleeding (crit only) 2 turns | pack. Pack: advantage when another foe stands beside its prey. |
| **Goblin Sniper** | Artillery | 10 | 3 | 0 | 0 | 0/2/1/0 | 2 | **Arrow** (range 5): 1d6+1 | skulk. Slips 1 square away after shooting. |
| **Goblin Trapper** | Ambusher | 12 | 3 | 0 | 0 | 1/2/1/0 | 2 | **Hatchet** (melee): 1d6+1<br>**Set Snare**: trap at range 3, every 2 rounds | Hides snares on the battlefield. |
| **Dire Wolf** | Harrier | 14 | 5 | 0 | 0 | 1/2/0/0 | 2 | **Bite** (melee): 1d6+1; staggered (crit only) | nimble, pack. Pack: advantage when another foe stands beside its prey. Nimble. |
| **Hobgoblin Guard** | Defender | 22 | 3 | 2 | 1 | 2/1/0/1 | 3 | **Spear Wall** (melee): 1d6+2; marked | On a hit: marks the hero. |
| **Orc Brute** | Brute | 28 | 3 | 1 | 0 | 3/0/0/0 | 3 | **Greataxe** (melee): 1d8+2; push 1 (2 on a crit) | savage. Savage: +2 damage to heroes at half health or less. |
| **Goblin Hexer** | Support | 14 | 3 | 0 | 0 | 0/1/2/1 | 3 | **Hex Bolt** (range 4): 1d4+1; slowed, weakened (crit only)<br>**Mend**: heal ally 7, range 4 | Heals allies. |
| **Bandit Captain** | Leader | 32 | 4 | 0 | 0 | 2/3/1/2 | 5 | **Sabre** (melee): 1d8+2<br>**Rally**: allies beside heroes strike (2◆) | aura. Aura: allies within 2 gain advantage. Rally: allies beside heroes strike. |
| **Orc Warlord** | Boss | 65 | 4 | 2 | 2 | 3/1/1/3 | — | **Cleaving Axe** (melee): 1d8+1; push 1 (2 on a crit)<br>**Hurled Axe** (range 4): 1d6+1; costs 2◆ | boss, 2 attacks. Attacks twice. Boss surges on rounds 1, 3 and 5.. Surges: Rally the Horde, Warcry, Last Stand |

#### Region II Barrow Moors

| Foe | Role | HP | Spd | Armour | Steadfast | M/F/W/P | Cost | Attacks | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Bat Swarm** | Swarm | 4 | 5 | 0 | 0 | 0/2/0/0 | 2 | **Bite** (melee): 1 flat per critter | nimble, swarm of 4. 1 damage per bat still flying. Nimble. |
| **Risen Bones** | Minion | 1 | 3 | 0 | 0 | 1/1/0/0 | 0.5 | **Bone Claw** (melee): 3 flat | minion, undead |
| **Spiderling Swarm** | Swarm | 3 | 4 | 0 | 0 | 0/2/0/0 | 2 | **Skittering Bites** (melee): 1 flat per critter; slowed (not on a crit) | swarm of 4. 1 damage per spider still standing. Their bites slow. |
| **Necromancer** | Summoner | 20 | 3 | 0 | 0 | 0/1/3/1 | 4 | **Grave Bolt** (range 4): 1d6+2; weakened | summons bones. Every other round, raises up to 3 Risen Bones around itself. |
| **Brood Mother** | Champion | 46 | 3 | 2 | 2 | 3/2/0/0 | 6 | **Venom Fangs** (melee): 1d10+2; bleeding 3 turns<br>**Web Spray** (range 4): 1d4; rooted; leaves web; costs 2◆ | large, summons spiderlings. Large. Every other round, hatches a swarm of spiderlings. |
| **Skeleton** | Defender | 16 | 3 | 2 | 0 | 2/1/0/0 | 2 | **Rusty Blade** (melee): 1d6+2; marked (crit only) | undead, reassemble. Reassembles once unless slain by radiant damage. |
| **Skeleton Archer** | Artillery | 12 | 3 | 0 | 0 | 0/2/0/0 | 2 | **Bone Arrow** (range 5): 1d6+1 | undead |
| **Barrow Zombie** | Brute | 32 | 2 | 1 | 0 | 2/0/0/0 | 3 | **Grave Grasp** (melee): 1d8+2; rooted | undead. On a hit: rooted. |
| **Ghoul** | Harrier | 18 | 4 | 0 | 0 | 1/2/0/0 | 3 | **Paralyzing Claw** (melee): 1d6+1; dazed (crit only), slowed (not on a crit) | nimble, undead. Nimble. On a crit: dazed. |
| **Barrow Spider** | Ambusher | 15 | 4 | 0 | 0 | 1/2/0/0 | 2 | **Venom Bite** (melee): 1d6+1; bleeding 2 turns<br>**Web Spit** (range 4): 1d4; rooted; leaves web; costs 2◆ | Spits web that roots its prey. |
| **Grave Ooze** | Brute | 26 | 2 | 0 | 0 | 2/0/0/0 | 3 | **Acid Slam** (melee): 1d6+2; weakened<br>**Acid Spit** (range 3): 1d4; leaves acid; costs 2◆ | acidDeath. Spits pools of acid. Leaves acid where it dies. |
| **Grave Cultist** | Hexer | 14 | 3 | 0 | 0 | 0/1/2/1 | 3 | **Withering Curse** (range 4): 1d6+1; weakened, bleeding (crit only) 2 turns<br>**Dark Offering**: take 3 dmg, foes gain 2◆ | Can bleed itself to feed the foes' momentum. |
| **Barrow Wight** | Champion | 44 | 3 | 2 | 1 | 3/1/1/2 | 6 | **Draining Touch** (melee): 1d10+2; weakened | aura, drain, undead. Heals half the damage it deals. Aura: allies within 2 gain advantage. |
| **The Lich** | Boss | 160 | 3 | 0 | 2 | 0/1/4/3 | — | **Necrotic Bolt** (range 5): 1d10+2; weakened (crit only)<br>**Grave Chill** (range 4, area 3×3): 1d6+2; slowed; costs 3◆ | boss, undead, summons bones. Raises three dead every other round. Boss surges on rounds 1, 3 and 5.. Surges: Raise the Dead, Soul Siphon, Death Nova |

#### Region III Ashen Waste

| Foe | Role | HP | Spd | Armour | Steadfast | M/F/W/P | Cost | Attacks | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Ember Imp** | Minion | 1 | 5 | 0 | 0 | 0/2/1/0 | 0.5 | **Firebolt** (range 3): 3 flat | minion, nimble, fireproof, fireDeath. Bursts into fire when slain. |
| **Gnoll Marauder** | Harrier | 24 | 4 | 1 | 0 | 3/1/0/0 | 3 | **Flail** (melee): 1d8+2; bleeding (crit only) 2 turns | savage. Savage: +2 damage to heroes at half health or less. |
| **Cinder Priest** | Leader | 22 | 3 | 0 | 0 | 0/1/2/3 | 4 | **Scorch** (range 4): 1d6+2; burning 2 turns<br>**Kindle**: fire at range 4, every 2 rounds<br>**Mend**: heal ally 8, range 4 | aura, fireproof. Sets the ground on fire. Aura: allies within 2 gain advantage. |
| **Fire Drake** | Artillery | 28 | 4 | 1 | 0 | 2/2/0/0 | 4 | **Firespit** (range 4): 1d8+1; burning<br>**Flame Breath** (range 3, area 3×3): 1d6+2; leaves fire; costs 3◆ | fireproof. Flame Breath leaves fire behind. |
| **Ogre Smasher** | Champion | 54 | 3 | 2 | 2 | 4/0/0/0 | 6 | **Greatclub** (melee): 1d12+2; push 2 (3 on a crit) | Its blows hurl heroes away, staggered. |
| **Rock Golem** | Champion | 66 | 2 | 3 | 3 | 4/0/0/0 | 6 | **Crushing Fists** (melee): 1d12+2; push 1 (2 on a crit)<br>**Hurl Boulder** (range 4): 1d8+2; staggered; costs 2◆ | large. Large. Slow, but nothing moves it far. |
| **Magma Hulk** | Controller | 38 | 3 | 2 | 1 | 3/0/0/0 | 5 | **Molten Fist** (melee): 1d8+2; slowed, burning | fireproof, trail. Leaves a trail of fire where it walks. |
| **Ashen Dragon** | Boss | 100 | 4 | 3 | 3 | 4/2/2/3 | — | **Rending Claws** (melee): 1d12+2<br>**Tail Lash** (range 2): 1d8+2; push 2<br>**Fire Breath** (range 3, area 3×3): 1d10+3; leaves fire; costs 3◆ | boss, fireproof, large, 2 attacks. Attacks twice. Boss surges on rounds 1, 3 and 5.. Surges: Terrifying Presence, Wing Buffet, Inferno |

#### Special (mission-only)

| Foe | Role | HP | Spd | Armour | Steadfast | M/F/W/P | Cost | Attacks | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Bound Horror** | Champion | 50 | 3 | 2 | 2 | 3/1/2/0 | — | **Rending Tendrils** (range 2): 1d10+3; pull 1 (2 on a crit) |  |
| **Ritual Pillar** | Object | 18 | 0 | 0 | 0 | 0/0/0/0 | — |  |  |

---

## Appendix E — Boss surges

On rounds 1, 3 and 5 at the start of the boss's turn.

| Surge | Effect |
|---|---|
| Rally the Horde | Goblins pour in and every foe gains advantage this round. |
| Warcry | Heroes within 3 are weakened and marked. |
| Last Stand | The Warlord heals and his momentum surges. |
| Raise the Dead | Bones knit together across the moor. |
| Soul Siphon | Every hero within 4 bleeds life into the Lich. |
| Death Nova | A wave of necrotic power washes over the heroes. |
| Terrifying Presence | Every hero is weakened. The foes gain momentum. |
| Wing Buffet | Heroes within 2 are hurled away, staggered. |
| Inferno | The dragon floods a row with fire. |

---

## Appendix F — Missions and twists

| Mission | Goal | Budget share |
|---|---|---|
| Rout | Defeat every foe. | ×1 |
| Ambush | You are surrounded. Defeat every foe. | ×1.1 |
| Hold the Shrine | End 3 rounds with a hero on the shrine and no foe on it. More foes arrive. | ×0.7 |
| Rescue | Reach the caged captive to free them, then lead them to the bottom edge. If they fall, you fail. | ×0.8 |
| Plunder | Grab all 3 chests (or defeat every foe). All 3 earns bonus gold. | ×0.9 |
| Survive | Hold out for 5 rounds against endless reinforcements. | ×0.6 |
| Assassinate | Slay the chief. Its allies fight harder near it. | ×0.8 |
| Stop the Ritual | Topple both ritual pillars within 5 rounds, or a Bound Horror breaks free. | ×0.75 |
| Defend the Wagon | Keep the supply wagon standing for 5 rounds. | ×0.65 |
| Breakout | Every surviving hero must escape through the top edge. | ×0.85 |
| Boss | Defeat the boss. | extreme |

### Regional twists

| Region | Mission | Twist | Rule |
|---|---|---|---|
| II | Rescue | Broken Leg | Carry a wounded captive to the bottom edge. If they fall, you fail. The captive cannot walk. A hero standing beside them carries them: they are dragged along behind whichever hero moves away from their side. |
| II | Hold the Shrine | Restless Barrow | The dead claw up beside the shrine every round. |
| II | Plunder | Cursed Hoard | Each chest you open raises Risen Bones beside you. |
| II | Survive | The Long Night | Thick fog: no one, friend or foe, can attack or cast beyond 3 squares. |
| II | Assassinate | The Chief Flees | Slay the chief before the end of round 6, or it escapes and the battle is lost. |
| III | Ambush | Ring of Fire | Fires burn around the edges of the field, and flare up again on round 3. |
| III | Survive | Rising Lava | From round 3, lava floods one more row from the top each round (up to the third row). |
| III | Assassinate | Bodyguards | The chief takes half damage while one of its guards stands beside it. |
| III | Stop the Ritual | Blood Pillars | Each pillar heals 6 every round while a foe stands beside it. |
| III | Plunder | Molten Vault | Chests still unopened melt away at the end of round 4. |
| III | Breakout | Collapsing Cavern | From round 2, lava rises from the bottom edge, one row each round. |

---

## Appendix G — Foe threats

| Threat | Cost ◆ | Effect |
|---|---|---|
| Bloodlust | 3 | Every foe has advantage on its attacks this round. |
| Eruption (Wildfire / Acid Seep / Eruption) | 5 | The ground erupts beneath heroes. Move off it or suffer! |
| Reinforcements | 7 | A horde of minions pours in from the edges. |
| Dark Rite | 6 | Every foe is wrapped in shield. |

---

## Appendix H — Hazards and obstacles

| Hazard | Damage | Condition | Notes |
|---|---|---|---|
| Fire | 3 + region | burning 1 | Deals 3 damage and sets burning when a creature enters it or ends its turn in it. |
| Acid Pool | 3 + region | weakened 1 | Deals 3 damage and weakens a creature that enters it or ends its turn in it. |
| Lava | 8 + region | burning 2 | Deals 8 damage and sets burning when a creature enters it or ends its turn in it. |
| Snare | 4 + region | rooted 1 | A hidden snare. Deals 4 damage and roots the first enemy of the trapper to enter it. |
| Web | 0 | rooted 1 | Sticky web. Roots the next creature to enter it, then tears. |

| Obstacle | Kind |
|---|---|
| Boulder | tall (blocks movement and sight) |
| Tree | tall (blocks movement and sight) |
| Dead Tree | tall (blocks movement and sight) |
| Basalt Spire | tall (blocks movement and sight) |
| Column | tall (blocks movement and sight) |
| Crates | cover (blocks movement; ranged attacks through it have disadvantage) |
| Low Wall | cover (blocks movement; ranged attacks through it have disadvantage) |
| Gravestone | cover (blocks movement; ranged attacks through it have disadvantage) |
| Sarcophagus | cover (blocks movement; ranged attacks through it have disadvantage) |
| Wall of Ice | tall (blocks movement and sight) |

---

## Appendix I — Events

| Event | Choices |
|---|---|
| **The Collapsed Bridge** | Haul up the strongbox (Athletics vs 13)<br>Dance across the beams (Acrobatics vs 14)<br>Take the long way round |
| **The Wandering Pilgrim** | Read her intentions (Insight vs 12)<br>Pay her 30 gold (30 gold)<br>Walk on |
| **A Forgotten Shrine** | Decipher the runes (Lore vs 13)<br>Draw on its power (Magic vs 15)<br>Pry out the offerings |
| **The Goblin Toll** | Talk them down (Influence vs 13)<br>Pay 25 gold (25 gold)<br>Clear the road |
| **The Locked Reliquary** | Pick the lock (Thievery vs 14)<br>Force it open (Athletics vs 15)<br>Leave it be |
| **The Wounded Hunter** | Tend his wound (Survival vs 12)<br>Search his pack<br>Leave him |
| **Shapes in the Mist** | Slip past unseen (Stealth vs 14)<br>Attack first |
| **The Wandering Smith** | Help at the forge (Athletics vs 13)<br>Pay 60 gold (60 gold)<br>Move on |
| **The Old Battlefield** | Search the fallen (Survival vs 13)<br>Honour the dead (Lore vs 12)<br>Pass by |
| **The Whispering Well** | Listen closely (Insight vs 14)<br>Toss in 20 gold (20 gold)<br>Seal it with stones |

---

## Appendix J — Tuning constants

From `TUNE` in `js/data.js`. The encounter threat tiers are in `THREAT` in `js/engine.js` (low 0.75, moderate 1, severe 1.35, extreme 2). Mission shares are in `MISSION_SHARE`.

| Constant | Value | Meaning |
|---|---|---|
| `es0` | 4 | Party strength: base per hero (Draw Steel 4) |
| `esLvl` | 2 | Party strength: per level per hero (Draw Steel 2) |
| `esUnit` | 0.4 | Party strength → foe cost conversion |
| `solo` | 1.25 | Boss's share of a moderate budget |
| `eliteCost` | 1.3 | Elite foe's cost multiplier |
| `hpSlope` | 0.03 | Foe health growth per depth |
| `dmgSlope` | 0.15 | Foe damage (strength) per depth |
| `rollStep` | 4 | Depth per +1 foe save bonus |
| `bossHp` | 0.55 | Boss health multiplier |
| `foeMomRound` | 1 | Foe momentum per round |
| `foeMomRamp` | 0 | Extra foe momentum ramp (0 = off) |
| `eliteMul` | [0.7, 0.4, 0.5] | Elite health bonus (×30%) by region |
| `eliteBudget` | [0.9, 1, 1] | Elite battle budget by region |
| `summonAt` | 8 | (unused legacy) |
| `actMul` | [1, 0.9, 0.65] | Encounter budget by region |
| `healAfter` | 0.05 | Healing after a won battle |
| `pbBonus` | 3 | Foe opportunity attack base damage |
| `fallenHp` | 0.25 | Health a fallen hero returns with |
| `momTurn` | 0 | Hero momentum per turn (0 = off) |
| `momStart` | 0 | Hero momentum at battle start |
| `momVal` | 0.9 | AI: value of 1 momentum |
| `actHeal` | 0.6 | Healing after beating a boss |
| `maxLvl` | 12 | Level cap |
| `winXp` | 30 | XP for a won battle |
| `bossXp` | 50 | Extra XP for a boss |
| `sneak` | 3 | Sneak attack base damage |
| `aiCombo` | 1 | AI: weight on combos |
| `saveBase` | 12 | Save DC base |
| `actions` | 3 | Hero actions per turn |
| `extraActs` | 2 | Actions on an Inspired extra turn |
| `guardMin` | 4 | Minimum damage worth Defending / Warding |
| `aiMoveCost` | 1.5 | AI: cost of spending a move action |
| `aiHold` | 1 | AI: value of saving actions |
