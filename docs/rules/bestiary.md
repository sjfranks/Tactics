---
title: Rogue Tactics 1e — Bestiary
version: 0.23
book: 3 of 4 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics, monsters]
---

# Rogue Tactics 1e — Bestiary

> v 0.23. Book 3 of 3. The foes of the three regions, their roles, three bosses, and how to build an encounter. Rules are in [Core Rules](core-rules.md) and classes, powers and weapon upgrades in [Heroes](heroes.md). **Every number in this book is a first guess (TBC)** and needs playtesting.

---

## Foes at a Glance

Foes use the same rules as heroes: attributes, weapon dice, DEF dice, saves, set-ups and conditions. They differ in a few ways:

- Foes have **no hit dice and no wounds**. They have an HP total, and they fall at 0 HP.
- A foe lists only the **attributes that matter**. Anything unlisted is 1.
- A foe's **save slants** (+ and −) are listed in its stat block.
- Foes do not have momentum. Instead the foes share a pool of **Malice** (below).
- Foes learn: a hero can *Create an opening* on each foe only once per battle (Core 3.4).
- Every foe has a **role** (below) that says how it moves and whom it targets.
- A foe may list a **weakness**, **resistance** or **immunity** to a damage type (Core 3.11), and a **Terrifying** rating (Core 3.2).

### Foe Types

| Type | Rules |
|---|---|
| **Minion** | 1 HP. Dies to any hit that deals damage. **Flat damage** (no roll), never misses or crits. A group shares one initiative roll. Comes in hordes of four. |
| **Standard** | A normal foe with HP, a weapon die and a DEF die. |
| **Elite** | A standard foe with more HP, a better die, and an extra trait. A harder battle with a better reward. |
| **Boss** | Cannot be dazed or rooted. Never loses its turn to a stagger (a staggering hit gives +2 advantage instead). Often has Steadfast. Has **surges** (below). |
| **Swarm** | A crowd of tiny creatures in one tile with one shared HP pool. Flat damage equal to its **remaining HP**. **Double damage from area attacks.** |

### Foe Roles

**Type** says how tough a foe is. **Role** says how it fights. On screen the role icon tells the player what a foe will do, so the player can plan a combo around it. A foe uses its role's **movement** and **target priority**; ties go to the nearest hero, then to the lowest HP.

| Role | How it fights | Moves | Target priority |
|---|---|---|---|
| **Brute** | High HP and damage, low DEF. Charges and smashes. | Straight at the nearest hero. | Nearest hero. |
| **Soldier** | High DEF. Holds a line and protects its friends. | Stays adjacent to an ally. Moves to the hero in front. | A **marked** hero, then a hero adjacent to one of its allies. |
| **Skirmisher** | Fast and fragile. Hits and repositions. | Flanks, and moves away after its attack if it can. | The hero with the **fewest adjacent allies**. |
| **Artillery** | Ranged attacker, low HP. | Keeps **3 or more tiles** from every hero and avoids melee. | The hero with the **lowest DEF die**. |
| **Controller** | Conditions, healing and areas. | Stays at mid-range, 3 tiles from the nearest hero. | The **largest cluster** of heroes (most heroes in its area). |
| **Lurker** | Fragile ambusher. Hides, then strikes. | Hides when it can. | The **lowest-HP hero** who is not adjacent to another hero. It attacks from hiding. |
| **Leader** | Buffs and commands. A Leader is also one of the other roles. | Stays behind its allies. | Uses its Rally before it attacks. |

> [!tip] Using roles
> A good encounter mixes two or three roles: soldiers hold the front, artillery and controllers cover them from behind, and a lurker punishes a loose formation. A hero who sets up a combo on the right foe (a staggered controller, an exposed artillery) usually wins the exchange.

---

## How to Read a Foe

> **Name** · *Type* · *Role* · Cost
> **HP** · **SPD** · **DEF** (die) · **Steadfast** · **Attack** (weapon die + key stat, range)
> **Initiative** (die) · **Saves** (+/−) · **Weak / Resist / Immune** · **Terrifying**
> **Traits** and special actions

- **Cost** is the foe's value in an encounter budget (below). A horde of four minions costs 2.
- **DEF** is **None** for no armour, **d4** for light, **d6** for medium and **d8** for heavy. A foe rolls its DEF automatically against each hit that is not a critical hit.
- **Attack** is a weapon die plus the foe's key stat. For minions it is a **flat** number.
- **Initiative** is listed as a die. Minions of one type share one roll.
- **Special actions** marked **◆** cost **Malice** (below).
- In the tables, `(crit)` after a condition means "only on a critical hit", and `(not crit)` means "only if the hit is not critical". Minions and swarms never crit, so their conditions always apply.

### Traits

| Trait | Effect |
|---|---|
| **Pack** | Its attack has advantage if another foe is adjacent to the target. |
| **Savage** | Its attacks deal **+2 damage** to **bloodied** heroes. |
| **Nimble** | Its moves do not provoke free strikes. |
| **Skulk** | After it attacks, it may move 1 tile for free (no free strikes). |
| **Aura** | Allied foes within 2 tiles have **+1 advantage** on their attacks. |
| **Fireproof** | **Immune** to fire. |
| **Undead** | **Weak** to radiant. **Immune** to poison and necrotic. Cannot bleed. |
| **Incorporeal** | **Resists** physical damage. Can move through low cover. |
| **Reassemble** | The first time it is slain, it stands up again at the start of its next turn with half its HP, unless the killing blow was radiant. |
| **Drain** | It heals half the damage it deals. |
| **Mend N** | In place of its attack, it heals an ally within 4 tiles for N HP. |
| **Large** | Occupies a 2×2 area. It can attack anything adjacent to its edge. |
| **Trail** | Leaves a fire hazard in each tile it leaves. |
| **Fire death / Acid death** | When slain, it leaves a fire hazard or acid pool in its tile. |
| **Summon** | Calls allies on a schedule (stated in its entry). Summoned foes do not give XP. |
| **Hidden snares** | Snares it sets are hidden until a creature enters them. |

---

## Malice and Threats

The foes share one pool of **Malice (◆)**.

- **Earning Malice.** At the start of each round the foes gain **Malice equal to the round number** (1, 2, 3...), plus **1 for each hero who is Down**. Unspent Malice carries over until the battle ends.
- **Spending Malice.** At the start of any foe's turn the foes may spend Malice on **one** of the following: a **threat** (below), or a foe's **◆ ability** (the cost is in its entry). Boss surges are free (below).
- **Threats.** The player sees the next threat and its cost on the screen. Harder threats unlock in harder battles (the table shows where).

| Threat | Cost | Unlocked | Effect |
|---|---|---|---|
| **Bloodlust** | 3 | always | Every foe has **+1 advantage** on its attacks this round. |
| **Eruption** | 5 | elite and boss battles; every battle from region II | The foes mark **3 tiles** under heroes. At the end of the round, each creature on a marked tile makes a **DEX save** or suffers the region's hazard (fire, acid or lava damage, ignoring DEF). |
| **Reinforcements** | 7 | region II and III | A horde of minions (three plus the region number) pours in from the edges. In a **boss** battle they stop coming once **four foes** are on the board, so a long boss fight does not snowball. |
| **Dark Rite** | 6 | region III | Every foe gains a **shield of 5**. |

> *TBC:* the Malice gain (round number plus Downs) is a rough match for Draw Steel's Malice. It reaches 3 by round 2 and 6 by round 3, so the first threat comes in round 2.

---

## Foe Templates

| Template | Changes |
|---|---|
| **Elite** | **+30% HP**, **+1 attack bonus**, and one extra trait. Cost ×1.3. |
| **Chief** | +30% HP. Allied foes within 2 tiles have **+1 advantage**. The mission **Assassinate** (below) uses a chief. |

---

## Region I: Greenmarch

Bandits, goblins and beasts of the marsh and forest. Hazards: snares, webs. Hazard damage is 3 + region.

| Foe | Type · Role | Cost | HP | SPD | DEF | Attack | Init · Saves | Traits and notes |
|---|---|---|---|---|---|---|---|---|
| **Goblin Rabble** | Minion · Skirmisher | 0.5 | 1 | 4 | None | **Stab** flat 2, range 1 | d6 · none | Dies to anything. Four to a horde. |
| **Rat Swarm** | Swarm · Skirmisher | 2 | 4 | 4 | None | **Gnaw** flat = remaining HP; bleeding | d6 · DEX + | Swarm. Gnawing leaves the prey bleeding. |
| **Goblin Cutthroat** | Standard · Skirmisher | 1.2 | 10 | 4 | None | **Jagged Blade** d6+1, range 1; bleeding (crit) | d6 · DEX +, STR − | Pack. |
| **Goblin Sniper** | Standard · Artillery | 2 | 10 | 3 | None | **Arrow** d6+1, range 5 | d6 · DEX +, PRE − | Skulk. |
| **Goblin Trapper** | Standard · Lurker | 2 | 12 | 3 | None | **Hatchet** d6+1, range 1. **Set Snare:** every 2 rounds, hides a snare in a tile within 3 | d6 · DEX +, INT − | Hidden snares. A snare deals 4 damage, and roots the first hero who enters (DEX save to avoid the root). |
| **Dire Wolf** | Standard · Skirmisher | 2 | 14 | 5 | None | **Bite** d6+1, range 1; staggered (crit) | d6 · DEX +, INT − | Pack. Nimble. |
| **Hobgoblin Guard** | Standard · Soldier | 3 | 22 | 3 | d6 | **Spear Wall** d6+2, range 1; hit **marks** the hero | d6 · STR +, DEX − | Steadfast 1. |
| **Orc Brute** | Standard · Brute | 3 | 28 | 3 | d4 | **Greataxe** d8+2, range 1; push 1 (2 on a crit) | d4 · STR +, INT − | Savage. |
| **Goblin Hexer** | Standard · Controller | 3 | 14 | 3 | None | **Hex Bolt** d4+1, range 4; slowed; weakened (crit) | d6 · INT +, STR − | Mend 7. |
| **Mire Lurker** | Standard · Lurker | 2.5 | 16 | 4 | None | **Tongue Lash** d6+2, range 3; **pulls** the hero 2 tiles | d8 · DEX +, STR − | Starts hidden in water or reeds. Hides again after an attack if it ends in cover. |

### Region I Elites

> **Bandit Captain** · *Elite* · *Leader, Skirmisher* · Cost 5
> **HP** 32 · **SPD** 4 · **DEF** None · **Attack** *Sabre* d8+2, range 1
> **Initiative** d8 · **Saves** DEX +, STR −
> **Traits** *Aura.* **Rally ◆2:** each ally adjacent to a hero makes a free basic attack.

> **Marsh Ogre** · *Elite* · *Brute* · Cost 6
> **HP** 34 · **SPD** 3 · **DEF** d6 · **Steadfast** 1 · **Attack** *Club* d8+3, range 1
> **Initiative** d4 · **Saves** STR +, DEX − · **Terrifying** 1
> **Traits** *Large.* **Smash ◆2** (in place of its attack): attacks with **2 weapon dice** against every creature within 1. Targets are pushed 1 tile.

*The Elite template applies to the Hobgoblin Guard and the Orc Brute as well.*

### Region I Boss: The Orc Warlord

> **Orc Warlord** · *Boss* · *Brute* · Level 3
> **HP** 110 · **SPD** 4 · **DEF** d6 · **Steadfast** 2 · **Terrifying** 1
> **Initiative** d8 · **Saves** STR +, INT −
> **Attacks twice** per turn: *Cleaving Axe* d8+3, range 1, push 1 (2 on a crit); *Hurled Axe* d6+1, range 4 (**◆2**).
> **Phase 2 (bloodied):** gains **Savage** and its Cleaving Axe pushes 2.
>
> **Surges** (free, once each, at the start of the boss's turn in rounds 1, 3 and 5 in this order):
> 1. **Rally the Horde.** A horde of four Goblin Rabble pours in, and every foe has +1 advantage this round.
> 2. **Warcry.** Heroes within 3 are **weakened** and **marked** (by the Warlord) until the end of their next turn.
> 3. **Last Stand.** The Warlord **heals 15** and the foes gain **5 Malice**.
>
> **Escort.** Goblin Cutthroats and Hobgoblin Guards, up to a budget of about 6 (no foe of cost 5 or more).

---

## Region II: Barrow Moors

A land of barrows, bones and spiders. Hazards: webs, acid pools. Undead are weak to radiant.

| Foe | Type · Role | Cost | HP | SPD | DEF | Attack | Init · Saves | Traits and notes |
|---|---|---|---|---|---|---|---|---|
| **Risen Bones** | Minion · Soldier | 0.5 | 1 | 3 | None | **Bone Claw** flat 3, range 1 | d4 · none | Undead. Four to a horde. |
| **Bat Swarm** | Swarm · Skirmisher | 2 | 4 | 5 | None | **Bite** flat = remaining HP | d6 · DEX + | Nimble. |
| **Spiderling Swarm** | Swarm · Skirmisher | 2 | 3 | 4 | None | **Skittering Bites** flat = remaining HP; slowed | d6 · DEX + | Swarm. |
| **Skeleton Warrior** | Standard · Soldier | 2 | 16 | 3 | d6 | **Rusty Blade** d6+2, range 1; **marked** (crit) | d4 · STR +, PRE − | Undead. Reassemble. |
| **Skeleton Archer** | Standard · Artillery | 2 | 12 | 3 | None | **Bone Arrow** d6+1, range 5 | d6 · DEX +, PRE − | Undead. |
| **Barrow Zombie** | Standard · Brute | 3 | 32 | 2 | d4 | **Grave Grasp** d8+2, range 1; **rooted** | d4 · STR +, DEX − | Undead. |
| **Ghoul** | Standard · Skirmisher | 3 | 18 | 4 | None | **Paralyzing Claw** d6+1, range 1; slowed (not crit); **dazed** (crit) | d6 · DEX +, INT − | Undead. Nimble. |
| **Barrow Spider** | Standard · Lurker | 2 | 15 | 4 | None | **Venom Bite** d6+1, range 1; bleeding 2 turns. **Web Spit ◆2** d4, range 4; **rooted**; leaves a web | d6 · DEX +, STR − | |
| **Grave Ooze** | Standard · Brute | 3 | 26 | 2 | None | **Acid Slam** d6+2, range 1; weakened. **Acid Spit ◆2** d4, range 3; leaves an acid pool | d4 · STR +, INT − | Acid death. |
| **Grave Cultist** | Standard · Controller | 3 | 14 | 3 | None | **Withering Curse** d6+1, range 4; weakened; bleeding 2 turns (crit). **Dark Offering:** the cultist takes 3 damage and the foes gain 2 Malice | d6 · INT +, STR − | |
| **Necromancer** | Standard · Controller | 4 | 20 | 3 | None | **Grave Bolt** d6+2, range 4; weakened | d6 · INT +, STR − | Summon: every other round, raises up to 3 Risen Bones adjacent to itself. |
| **Wailing Shade** | Standard · Lurker | 3 | 16 | 4 | None | **Chill Touch** d6+2 cold, range 1; weakened | d8 · PRE +, STR − | Undead. Incorporeal. Skulk. Starts hidden. |

### Region II Elites

> **Barrow Wight** · *Elite* · *Soldier* · Cost 6
> **HP** 44 · **SPD** 3 · **DEF** d6 · **Steadfast** 1 · **Attack** *Draining Touch* d10+2, range 1; weakened
> **Initiative** d6 · **Saves** STR +, INT − · **Terrifying** 1
> **Traits** Undead. Drain. Aura.

> **Brood Mother** · *Elite* · *Brute* · Cost 6
> **HP** 46 · **SPD** 3 · **DEF** d6 · **Steadfast** 2 · **Attack** *Venom Fangs* d10+2, range 1; bleeding 3 turns
> **Initiative** d6 · **Saves** STR +, DEX +
> **Traits** *Large.* **Web Spray ◆2:** d4, range 4; rooted; leaves a web. **Summon:** every other round hatches a Spiderling Swarm.

> **Bone Warden** · *Elite* · *Soldier* · Cost 6
> **HP** 48 · **SPD** 3 · **DEF** d8 · **Steadfast** 2 · **Attack** *Bone Cleaver* d8+3, range 1; **marked**
> **Initiative** d4 · **Saves** STR +, INT −
> **Traits** Undead. **Bone Wall:** undead allies adjacent to it roll their DEF with **advantage**.

### Region II Boss: The Lich

> **The Lich** · *Boss* · *Controller* · Level 6
> **HP** 150 · **SPD** 3 · **DEF** None · **Steadfast** 2 · **Terrifying** 2
> **Initiative** d8 · **Saves** INT +, STR − · **Weak** radiant · **Immune** poison
> **Attack** *Necrotic Bolt* d10+4 necrotic, range 5; weakened (crit). *Grave Chill* d6+2, range 4, area 3×3; slowed (**◆3**).
> **Phase 2 (bloodied):** *Raise the Dead* triggers every other round, in addition to its surges.
>
> **Surges** (free, once each, at the start of the boss's turn in rounds 1, 3 and 5 in this order):
> 1. **Raise the Dead.** Four Risen Bones knit together across the moor.
> 2. **Soul Siphon.** Every hero within 4 makes a **PRE save** or loses 4 HP, which the Lich heals.
> 3. **Death Nova.** A wave of necrotic power: every hero takes **6 necrotic damage** (ignores DEF), or half on a PRE save.
>
> **Escort.** Skeletons and Skeleton Archers, up to a budget of about 8.

---

## Region III: Ashen Waste

A land of fire, ash and stone. Hazards: fire, lava. Fireproof foes are immune to fire.

| Foe | Type · Role | Cost | HP | SPD | DEF | Attack | Init · Saves | Traits and notes |
|---|---|---|---|---|---|---|---|---|
| **Ember Imp** | Minion · Artillery | 0.5 | 1 | 5 | None | **Firebolt** flat 3 fire, range 3 | d6 · none | Nimble. Fireproof. Fire death. Four to a horde. |
| **Ember Hound** | Standard · Skirmisher | 3 | 20 | 5 | None | **Burning Bite** d6+2, range 1; burning (crit) | d6 · DEX +, INT − | Pack. Nimble. Fireproof. |
| **Gnoll Marauder** | Standard · Skirmisher | 3 | 24 | 4 | d4 | **Flail** d8+2, range 1; bleeding 2 turns (crit) | d6 · STR +, INT − | Savage. |
| **Cinder Priest** | Standard · Leader | 4 | 22 | 3 | None | **Scorch** d6+2, range 4; burning 2 turns. **Kindle:** every 2 rounds, sets a tile within 4 on fire | d6 · PRE +, STR − | Aura. Fireproof. Mend 8. The chief of its band. |
| **Fire Drake** | Standard · Artillery | 4 | 28 | 4 | d4 | **Firespit** d8+1, range 4; burning. **Flame Breath ◆3** d6+2, range 3, area 3×3; leaves fire | d8 · DEX +, STR − | Fireproof. |
| **Ash Wraith** | Standard · Lurker | 3 | 22 | 4 | None | **Ash Touch** d8+2, range 1; weakened | d8 · PRE +, STR − | Undead. Incorporeal. Fireproof. Starts hidden. |
| **Grave Cultist** | Standard · Controller | 3 | 14 | 3 | None | *(see Region II)* | | Also found here. |
| **Orc Brute** | Standard · Brute | 3 | 28 | 3 | d4 | *(see Region I)* | | Also found here. |

### Region III Elites

> **Ogre Smasher** · *Elite* · *Brute* · Cost 6
> **HP** 54 · **SPD** 3 · **DEF** d6 · **Steadfast** 2 · **Attack** *Greatclub* d12+2, range 1; push 2 (3 on a crit); **staggered**
> **Initiative** d4 · **Saves** STR +, DEX − · **Terrifying** 1

> **Rock Golem** · *Elite* · *Soldier* · Cost 6
> **HP** 66 · **SPD** 2 · **DEF** d8 · **Steadfast** 3 · **Attack** *Crushing Fists* d12+2, range 1; push 1 (2 on a crit). *Hurl Boulder* **◆2** d8+2, range 4; staggered
> **Initiative** d4 · **Saves** STR +, INT −
> **Traits** *Large.* Immune poison. **Resist** physical.

> **Magma Hulk** · *Elite* · *Controller* · Cost 5
> **HP** 38 · **SPD** 3 · **DEF** d6 · **Steadfast** 1 · **Attack** *Molten Fist* d8+2, range 1; slowed; burning
> **Initiative** d4 · **Saves** STR +, DEX −
> **Traits** Fireproof. Trail.

### Region III Boss: The Ashen Dragon

> **Ashen Dragon** · *Boss* · *Artillery* · Level 9
> **HP** 200 · **SPD** 4 · **DEF** d8 · **Steadfast** 3 · **Terrifying** 3
> **Initiative** d10 · **Saves** STR +, DEX +, INT − · **Immune** fire · **Weak** cold
> **Attacks twice** per turn: *Rending Claws* d10+3, range 1; *Tail Lash* d8+3, range 2, push 2; *Fire Breath* d10+3 fire, range 3, area 3×3; leaves fire (**◆3**).
> **Traits** *Large. Fireproof.*
> **Phase 2 (bloodied):** *Fire Breath* costs **◆2**, and the dragon leaves a fire trail when it flies.
>
> **Surges** (free, once each, at the start of the boss's turn in rounds 1, 3 and 5 in this order):
> 1. **Wing Buffet.** Heroes within 2 are **pushed 2 and staggered**.
> 2. **Terrifying Presence.** Every hero is **weakened**, and the foes gain **3 Malice**.
> 3. **Inferno.** The dragon floods a **row** with fire. Creatures in the row make a **DEX save** or take the lava damage.
>
> **Escort.** Ember Imps and Fire Drakes, up to a budget of about 8.

---

## Encounter Building

### Budgets

Encounters are built like PF2e's. An encounter's **difficulty** is a **budget** for four heroes:

| Difficulty | Budget | Used for |
|---|---|---|
| **Easy** | 30 | The first battle of a region, a quarter of other battles, event fights and road ambushes |
| **Medium** | 60 | Most battles |
| **Hard** | 90 | Elite battles (the elite foe is bought from the budget) |
| **Extreme** | 120 | Bosses (the boss takes most of it; the rest buys its escort, no foe costing 5 or more) |

- **Foe value.** A foe as strong as one hero is worth **30**, so a Medium fight is two of them, or a crowd of weaker ones. Heroes no longer level up (Core 4.2), so the party's expected strength at each stop stands in for its level: *party strength* = 4 × (4 + 0.85 × (1 + 0.75 × the stop's depth)). A Medium budget buys foes costing *party strength* × 0.4.
- **Tuning by region** (from the simulator): ordinary battles × 2, 2.2 and 1.25 in regions I, II and III; elites × 1.4, 1.35 and 0.95; boss health × 1.2, 1.45 and 0.3. Foe health rises 1.5% and damage 0.08 per stop of depth.
- **Party size.** Each hero more or fewer than four adds or removes a quarter of the budget (PF2e's character adjustment).
- **Up to 12 creatures** per battle, drawn at random from the region's pool.

*TBC: tune with playtesting. Missions with reinforcements or other goals spend a smaller share of the budget on the foes present at the start (below).*

### Missions

A battle can have a **mission** other than "defeat every foe". Normal battles draw from the list; Elite battles are Rout or Assassinate.

| Mission | Goal | Budget |
|---|---|---|
| **Rout** | Defeat every foe. | ×1 |
| **Ambush** | The heroes are surrounded. Defeat every foe. | ×1.1 |
| **Hold the Shrine** | End 3 rounds with a hero on the shrine and no foe on it. More foes arrive. | ×0.7 |
| **Rescue** | Reach the caged captive (a hero beside the cage frees them), then lead them to the bottom edge. The freed captive takes its own turn in the order: move it up to SPD 3, like a hero with only a Move. If they fall, you fail. | ×0.8 |
| **Plunder** | Grab all 3 chests (or defeat every foe). All 3 earns bonus gold. | ×0.9 |
| **Survive** | Hold out for 5 rounds against reinforcements. | ×0.6 |
| **Assassinate** | Slay the chief. Its allies fight harder near it. | ×0.8 |
| **Stop the Ritual** | Topple both ritual pillars within 5 rounds, or a Bound Horror breaks free. | ×0.75 |
| **Defend the Wagon** | Keep the supply wagon standing for 5 rounds. | ×0.65 |
| **Breakout** | Every surviving hero must escape through the top edge. | ×0.85 |
| **Boss** | Defeat the boss. | see above |

**Reinforcements** (story battles): *Hold* gets foes every other round until round 6 (1 plus the region number each time); *Survive* gets 1 to 3 foes every round for 5 rounds; *Defend* gets 1 to 2 foes every round for 5 rounds; *Breakout* gets 1 foe from the bottom every round.

### Regional Twists

| Region | Mission | Twist |
|---|---|---|
| II | Rescue | **Broken Leg.** The captive cannot walk. A hero beside them carries them, and drags them along behind whichever hero moves away. |
| II | Hold the Shrine | **Restless Barrow.** The dead claw up beside the shrine every round. |
| II | Plunder | **Cursed Hoard.** Each chest opened raises Risen Bones beside the hero. |
| II | Survive | **The Long Night.** Fog: no one can attack or cast beyond 3 tiles. |
| II | Assassinate | **The Chief Flees.** Slay the chief before the end of round 6, or the battle is lost. |
| III | Ambush | **Ring of Fire.** Fires burn around the edges, and flare up again on round 3. |
| III | Survive | **Rising Lava.** From round 3, lava floods one more row from the top each round (up to the third row). |
| III | Assassinate | **Bodyguards.** The chief takes half damage while one of its guards stands beside it. |
| III | Stop the Ritual | **Blood Pillars.** Each pillar heals 6 every round while a foe stands beside it. |
| III | Plunder | **Molten Vault.** Chests still unopened melt away at the end of round 4. |
| III | Breakout | **Collapsing Cavern.** From round 2, lava rises from the bottom edge, one row each round. |

> **Bound Horror** *(mission only)* · Elite · Cost n/a · **HP** 50 · **SPD** 3 · **DEF** d6 · **Steadfast** 2 · *Rending Tendrils* d10+3, range 2; **pulls** 1 (2 on a crit). **Ritual Pillar** *(object)*: HP 18, no attacks.

### Hazards on the Map

Hazard rules and damage are in Core 3.1. Place **one to three hazard tiles** on each map, where forced movement can use them.

| Region | Typical hazards | Typical obstacles |
|---|---|---|
| **I · Greenmarch** | snares, webs, spikes | trees, boulders, crates, low walls |
| **II · Barrow Moors** | webs, acid pools, poison gas | dead trees, gravestones, sarcophagi, columns |
| **III · Ashen Waste** | fire, lava | basalt spires, boulders, walls of ice (from frost powers) |

### Rewards

Rewards follow Core 4.1 and 4.2: **battles** give gold, 1 Victory and a reward pick; **elite battles** give gold, 2 Victories, two reward picks (Uncommon or better) and a weapon or relic; **bosses** give gold, 3 Victories, two reward picks with a Rare, and a relic.

---

## Design Notes for the Bestiary

- **Source.** The foe pools, costs, mission list, twists and surges come from the Emberwatch Tactics prototype and are converted to these rules. Roles follow D&D 4e's Monster Vault and Draw Steel (the Leader role and Malice come from Draw Steel; Lurker, Soldier and Artillery from 4e). The extra foes (Mire Lurker, Wailing Shade, Bone Warden, Ember Hound, Ash Wraith) are new.
- **Conversion.** Emberwatch armour 0 / 1 / 2 / 3 becomes DEF None / d4 / d6 / d8. Its attack dice and damage bonuses were kept; the bonus becomes the foe's key stat. HP is as printed for the regular foes. Boss HP is raised to 110 / 150 / 200, so a boss lasts about five rounds against the party.
- **Malice** replaces the old rule that a boss may unleash a surge every round; surges are now free and scheduled (rounds 1, 3 and 5), and Malice pays for threats and ◆ abilities.
- **To test.** Whether swarms (damage equal to remaining HP) are too deadly. Whether three bosses with escorts of cost 6 to 8 are the right size. Whether the Lurker target rule (lowest-HP hero not adjacent to another hero) is predictable enough for the player.
