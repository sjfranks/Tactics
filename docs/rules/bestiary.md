---
title: Rogue Tactics 1e — Bestiary
version: 0.27
book: 3 of 3 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics, monsters]
---

# Rogue Tactics 1e — Bestiary

> v 0.27 "Sides and Dice". Book 3 of 3. The foes of the three regions, their roles, three bosses, and how to build an encounter. Rules are in [Core Rules](core-rules.md) and classes, powers and weapon upgrades in [Heroes](heroes.md). **Every number in this book is a first guess (TBC)** and needs playtesting.

---

## Foes at a Glance

Foes use the same rules as heroes: attributes, dice (**MULT dice**, one more for each status on the hero), statuses. They differ in a few ways:

- Foes have **no hit dice and no wounds**. They have an HP total, and they fall at 0 HP.
- A foe lists only the **attributes that matter**. Anything unlisted is 1.
- Foes have **flat armour**, like heroes: it comes off the damage of every hero hit (below).
- Foes do not have momentum. Instead the foes share a pool of **Malice** (below).
- Foes act on **their side's turn**, after all the heroes, one by one in initiative order (Core 3.3).
- Every foe has a **role** (below) that says how it moves and whom it targets.
- A foe may list a **weakness**, **resistance** or **immunity** to a damage type (Core 3.11), and a **Terrifying** rating, which is flavour only: it changes nothing in battle.

### Foe Types

| Type | Rules |
|---|---|
| **Minion** | 1 HP. Any hit slays it. **Flat damage** (no roll, so no crits and no extra dice; hero armour does not stop it). A group shares one initiative roll. Comes in hordes of four. |
| **Standard** | A normal foe with HP, attack dice and armour. |
| **Elite** | A standard foe with more HP. A harder battle with a better reward. |
| **Boss** | A Stun does not cost it its turn (it is still slowed, and the Stun still adds its die to hits on it). Cannot be Rooted. Often has Steadfast. Has **surges** (below). |
| **Swarm** | Up to four tiny critters in one tile sharing one HP pool (4 × the listed HP). Flat damage **per critter still standing**. **Double damage from area attacks.** |

### Foe Roles

**Type** says how tough a foe is. **Role** says how it fights. On screen the role icon tells the player what a foe will do, and **INTENT** shows whom each foe means to attack and roughly how hard, so the player can plan a combo around it.

| Role | How it fights | Moves | Target priority |
|---|---|---|---|
| **Brute** | High HP and damage, little armour. Charges and smashes. | Straight at the nearest hero. | Nearest hero. |
| **Soldier** | High armour. Holds a line and protects its friends. | Stays beside an ally. Moves to the hero in front. | A hero it Taunted, then a hero beside one of its allies. |
| **Skirmisher** | Fast and fragile. Hits and repositions. | Moves round the side, and away after its attack if it can. | The hero with the **fewest allies beside them**. |
| **Artillery** | Ranged attacker, low HP. | Keeps away from melee. | The hero with the **least armour**. |
| **Controller** | Statuses, healing and areas. | Stays at mid-range. | The **largest cluster** of heroes. |
| **Lurker** | Fragile ambusher. Hides, then strikes. | Starts hidden when it can. | The **lowest-HP hero** who is not beside another hero. |
| **Leader** | Buffs and commands. A Leader is also one of the other roles. | Stays behind its allies. | Uses its Rally before it attacks. |

> [!tip] Using roles
> A good encounter mixes two or three roles: soldiers hold the front, artillery and controllers cover them from behind, and a lurker punishes a loose formation. A party that sets up a combo on the right foe (a Stunned controller, a Weakened, Burning artillery) usually wins the exchange.
>
> *Engine note:* in the game every foe picks its move and target by the damage it expects to deal (a kill counts most, the wizard and cleric a little more), and a foe Taunted by the fighter must go for her if it can; the target priorities above are the design aim.

---

## How to Read a Foe

> **Name** · *Type* · *Role* · Cost
> **HP** · **SPD** · **Armour** · **Steadfast** · **Attack** (dice, range; statuses)
> **Initiative** (die) · **Weak / Resist / Immune** · **Terrifying**
> **Traits** and special actions

- **Cost** is the foe's value in an encounter budget (below). A horde of four minions costs 2.
- **HP** is as listed before tuning. In the game every foe (not minions or objects) has **50%** of it (`foeHpMul`, v0.27: hits roll a die per status), rising 3% per stop of depth; bosses have their own health per region (Encounter Building).
- **Armour** is a flat number (**None**, **1**, **2** or **3**) **taken off the damage of every hero hit**, to a minimum of 1. *Piercing Strike* ignores it; Burning, slams and hazards ignore it too. A tuning knob (`foeDef`, 0 now) shifts every foe's armour up or down.
- **Attack** is the foe's dice and bonus, such as **d6+1**. It rolls its dice (usually one) **plus one die for each different status on the hero** (Burning, Stunned, Rooted, Weakened, Taunted), **+1** for *Pack*, **+1** during *Bloodlust* or *Rally the Horde*, **+1** if it attacks from hiding and **+1** against a *Glass Cannon* hero; **−1** if the foe is **Weakened** (never below 1 die). A die on its top number crits and **brings one more die**. Then + the bonus + its **strength** (+1 for about every 8 stops of depth) + **2** if *Savage* against a bloodied hero + **2** within 2 of an *Aura* ally, − the hero's **armour** (fighter 2, cleric 1; at least 1). Then **×½** if it is **Taunted** and hits anyone but the taunter, and **×½** for the Warding Charm. Heroes cannot Defend (Core 3.6).
- **Flat** attacks (minions and swarms) never roll: their damage is the number (per critter for swarms), + half the strength bonus. Hero armour does not reduce it.
- **Initiative** is listed as a die (the foe's DEX die). Minions and swarms of one type share one roll.
- **Special actions** marked **◆** cost **Malice** (below).
- In the tables, `(crit)` after a status means "only if at least one die crits", and `(not crit)` means "only if none does". Minions and swarms never crit, so their statuses always apply. In the tables **Burn N** is Burning N, **Root** Rooted, **Weak** Weakened, **Stun** Stunned and **Taunt** Taunted (Core 3.10); a hero already carrying the status only has it refreshed (Burning adds to its number).

### Traits

| Trait | Effect |
|---|---|
| **Pack** | **One more die** if another foe is beside the target. |
| **Savage** | **+2 damage** against **bloodied** heroes. |
| **Nimble** | Did nothing since v0.27: there are no Sentinels (kept as a tag for later). |
| **Skulk** | After its turn, it slips 1 tile away from the heroes if it can. |
| **Aura** | Allied foes within 2 tiles get **+2 damage** on their hits. |
| **Fireproof** | **Immune** to fire and to Burning. |
| **Undead** | **Weak** to radiant (×2). **Immune** to poison and necrotic. |
| **Incorporeal** | **Resists** physical damage (×½). |
| **Reassemble** | The first time it is slain, it stands up again at the end of the next round with 40% of its HP, unless the killing blow was radiant. |
| **Drain** | It heals half the damage it deals. |
| **Mend N** | In place of its attack, it heals an ally within 4 tiles for N HP (+ the strength bonus). |
| **Large** | Occupies a 2×2 area. It is beside anything touching any of its tiles. |
| **Trail** | Leaves fire (2 rounds) in each tile it walks out of. |
| **Fire death / Acid death** | When slain, it leaves fire (3 rounds) or an acid pool (4 rounds) in its tile. |
| **Summon** | Calls allies on a schedule (stated in its entry), up to a cap. |
| **Hidden snares** | Snares it sets are hidden until one of its enemies enters them. |

---

## Malice and Threats

The foes share one pool of **Malice (◆)**. **Threats start in region II**: the first region's ordinary battles have none (its elites and boss do), so new players learn the basics first.

- **Earning Malice.** At the start of the battle and of each round the foes gain **Malice equal to the round number** (1, 2, 3...), plus **1 for each hero who is Down**. Unspent Malice carries over until the battle ends. (Dread 4 adds 1 every other round; the Crown of Thorns adds 2 every round.)
- **Spending Malice.** A foe's **◆ ability** costs the Malice in its entry when the foe uses it. At the start of each round, if the pool holds enough for the **next threat**, the threat fires and its cost is paid. Threats come in a fixed rotation (the order of the table); the player always sees the next one and its cost. Boss surges are free (below).

| Threat | Cost | Unlocked | Effect |
|---|---|---|---|
| **Bloodlust** | 3 | region I elites and boss; every battle from region II | Every foe's hits roll **one more die** next round (it fires at the end of a round). |
| **Eruption** (Wildfire, Acid Seep, Eruption) | 5 | region I elites and boss; every battle from region II | The ground erupts under **1, 2 or 3** heroes (by region): fire in regions I and III, acid in region II, for 3 rounds. Move off it or suffer it (Core 3.1). |
| **Reinforcements** | 7 | regions II and III | A horde of minions (two plus the region number: 4 or 5) pours in from the edges, up to 12 foes. In a **boss** battle they stop coming once **four foes** are on the board, so a long boss fight does not snowball. |
| **Dark Rite** | 6 | region III | Every foe gains **8 Shield**. |

> *TBC:* the Malice gain (round number plus Downs) is a rough match for Draw Steel's Malice. It reaches 3 by round 2 and 6 by round 3, so the first threat comes in round 2.

---

## Foe Templates

| Template | Changes |
|---|---|
| **Elite** | More HP: **+21%** in region I, **+12%** in II, **+15%** in III (30% × `eliteMul`). Cost ×1.3 in the budget. |
| **Chief** | **+30% HP** and the name *Chief*. The mission **Assassinate** (below) uses a chief. |

---

## Region I: Greenmarch

Bandits, goblins and beasts of the marsh and forest. Hazards: snares, webs. Hazard damage is the listed value + 0 here (+1 in region II, +2 in III).

| Foe | Type · Role | Cost | HP | SPD | Armour | Attack | Init | Traits and notes |
|---|---|---|---|---|---|---|---|---|
| **Goblin Rabble** | Minion · Skirmisher | 0.5 | 1 | 4 | None | **Stab** flat 2, range 1 | d6 | Dies to anything. Four to a horde. |
| **Rat Swarm** | Swarm · Skirmisher | 2 | 4 ×4 | 4 | None | **Gnaw** flat 1 per rat, range 1; **Burn 2** | d6 | Swarm. Gnawing leaves the prey burning. |
| **Goblin Cutthroat** | Standard · Skirmisher | 1.2 | 10 | 4 | None | **Jagged Blade** d6+1, range 1; Burn 2 (crit) | d6 | Pack. |
| **Goblin Sniper** | Standard · Artillery | 2 | 10 | 3 | None | **Arrow** d6+1, range 5 | d6 | Skulk. |
| **Goblin Trapper** | Standard · Lurker | 2 | 12 | 3 | None | **Hatchet** d6+1, range 1. **Set Snare:** every 2 rounds, hides a snare in a tile within 3 | d6 | Hidden snares. A snare deals 4 damage and **Roots** the first hero who enters. |
| **Dire Wolf** | Standard · Skirmisher | 2 | 14 | 5 | None | **Bite** d6+1, range 1; **Stun** (crit) | d6 | Pack. Nimble. |
| **Hobgoblin Guard** | Standard · Soldier | 3 | 22 | 3 | 2 | **Spear Wall** d6+2, range 1; **Taunts** the hero | d6 | Steadfast 1. |
| **Orc Brute** | Standard · Brute | 3 | 28 | 3 | 1 | **Greataxe** d8+2, range 1; push 1 (2 on a crit) | d4 | Savage. |
| **Goblin Hexer** | Standard · Controller | 3 | 14 | 3 | None | **Hex Bolt** d4+1, range 4; **Root**; Weak (crit) | d6 | Mend 7. |
| **Mire Lurker** | Standard · Lurker | 2.5 | 16 | 4 | None | **Tongue Lash** d6+2, range 3; **pulls** the hero 2 tiles | d8 | Starts hidden in the reeds. |

### Region I Elites

> **Bandit Captain** · *Elite* · *Leader, Skirmisher* · Cost 5
> **HP** 32 · **SPD** 4 · **Armour** None · **Attack** *Sabre* d8+2, range 1
> **Initiative** d8
> **Traits** *Aura* (allies within 2: +2 damage). **Rally ◆2:** each ally within 3 that stands beside a hero strikes that hero (a flat blow of 3 + its STR or DEX + the strength bonus; 2 for minions and swarms; hero armour does not reduce it).

> **Marsh Ogre** · *Elite* · *Brute* · Cost 6
> **HP** 34 · **SPD** 3 · **Armour** 2 · **Steadfast** 1 · **Attack** *Club* d8+3, range 1
> **Initiative** d4 · **Terrifying** 1
> **Traits** *Large.* **Smash ◆2** (in place of its attack): **2d8+3** against a hero and every hero around it. Targets are pushed 1 tile.

*The Elite template applies to the Hobgoblin Guard and the Orc Brute as well.*

### Region I Boss: The Orc Warlord

> **Orc Warlord** · *Boss* · *Brute*
> **HP** 110 · **SPD** 4 · **Armour** 2 · **Steadfast** 2 · **Terrifying** 1
> **Initiative** d8
> **Attacks twice** per turn: *Cleaving Axe* d8+3, range 1, push 1 (2 on a crit); *Hurled Axe* d6+1, range 4 (**◆2**).
> **Phase 2 (bloodied):** gains **Savage**.
>
> **Surges** (free, once each, at the start of the boss's turn in rounds 1, 3 and 5 in this order):
> 1. **Rally the Horde.** A horde of four Goblin Rabble pours in from the top, and every foe's hits roll **one more die** until the end of the round.
> 2. **Warcry.** Heroes within 3 are **Weakened** (their hits roll one fewer die) and **Taunted** by the Warlord (their hits on anyone else are halved). Both are statuses: every foe's hits on them roll two more dice.
> 3. **Last Stand.** The Warlord **heals 15** and the foes gain **5 Malice**.
>
> **Escort.** Goblin Cutthroats and Hobgoblin Guards, up to a budget of about 6 (no foe of cost 5 or more).

---

## Region II: Barrow Moors

A land of barrows, bones and spiders. Hazards: webs, acid pools. Undead are weak to radiant.

| Foe | Type · Role | Cost | HP | SPD | Armour | Attack | Init | Traits and notes |
|---|---|---|---|---|---|---|---|---|
| **Risen Bones** | Minion · Soldier | 0.5 | 1 | 3 | None | **Bone Claw** flat 3, range 1 | d4 | Undead. Four to a horde. |
| **Bat Swarm** | Swarm · Skirmisher | 2 | 4 ×4 | 5 | None | **Bite** flat 1 per bat, range 1 | d6 | Swarm. Nimble. |
| **Spiderling Swarm** | Swarm · Skirmisher | 2 | 3 ×4 | 4 | None | **Skittering Bites** flat 1 per spider, range 1; **Root** | d6 | Swarm. |
| **Skeleton Warrior** | Standard · Soldier | 2 | 16 | 3 | 2 | **Rusty Blade** d6+2, range 1; **Taunt** (crit) | d4 | Undead. Reassemble. |
| **Skeleton Archer** | Standard · Artillery | 2 | 12 | 3 | None | **Bone Arrow** d6+1, range 5 | d6 | Undead. |
| **Barrow Zombie** | Standard · Brute | 3 | 32 | 2 | 1 | **Grave Grasp** d8+2, range 1; **Root** | d4 | Undead. |
| **Ghoul** | Standard · Skirmisher | 3 | 18 | 4 | None | **Paralyzing Claw** d6+1, range 1; Root (not crit); **Stun** (crit) | d6 | Undead. Nimble. |
| **Barrow Spider** | Standard · Lurker | 2 | 15 | 4 | None | **Venom Bite** d6+1, range 1; **Burn 2**. **Web Spit ◆2** d4, range 4; **Root**; leaves a web | d6 | |
| **Grave Ooze** | Standard · Brute | 3 | 26 | 2 | None | **Acid Slam** d6+2, range 1; **Weak**. **Acid Spit ◆2** d4, range 3; leaves an acid pool | d4 | Acid death. |
| **Grave Cultist** | Standard · Controller | 3 | 14 | 3 | None | **Withering Curse** d6+1, range 4; **Weak**; Burn 2 (crit). **Dark Offering:** the cultist takes 3 damage and the foes gain 2 Malice | d6 | |
| **Necromancer** | Standard · Controller | 4 | 20 | 3 | None | **Grave Bolt** d6+2, range 4; **Weak** | d6 | Summon: every other round, raises up to 3 Risen Bones beside itself (up to 6). |
| **Wailing Shade** | Standard · Lurker | 3 | 16 | 4 | None | **Chill Touch** d6+2, range 1; **Weak** | d8 | Undead. Incorporeal. Skulk. Starts hidden. |

### Region II Elites

> **Barrow Wight** · *Elite* · *Soldier* · Cost 6
> **HP** 44 · **SPD** 3 · **Armour** 2 · **Steadfast** 1 · **Attack** *Draining Touch* d10+2, range 1; **Weak**
> **Initiative** d4 · **Terrifying** 1
> **Traits** Undead. Drain. Aura.

> **Brood Mother** · *Elite* · *Brute* · Cost 6
> **HP** 46 · **SPD** 3 · **Armour** 2 · **Steadfast** 2 · **Attack** *Venom Fangs* d10+2, range 1; **Burn 3**
> **Initiative** d6
> **Traits** *Large.* **Web Spray ◆2:** d4, range 4; **Root**; leaves a web. **Summon:** every other round hatches a Spiderling Swarm (up to 2).

> **Bone Warden** · *Elite* · *Soldier* · Cost 6
> **HP** 48 · **SPD** 3 · **Armour** 3 · **Steadfast** 2 · **Attack** *Bone Cleaver* d8+3, range 1; **Taunts** the hero
> **Initiative** d4
> **Traits** Undead. **Bone Wall:** undead allies beside it have +1 armour.

### Region II Boss: The Lich

> **The Lich** · *Boss* · *Controller*
> **HP** 150 · **SPD** 3 · **Armour** None · **Steadfast** 2 · **Terrifying** 2
> **Initiative** d8 · **Weak** radiant · **Immune** poison, necrotic (undead)
> **Attack** *Necrotic Bolt* d10+4, range 5; Weak (crit). *Grave Chill* d6+2, range 4, area 3×3; **Root** (**◆3**).
> **Summon:** every other round, raises up to 3 Risen Bones beside itself (up to 6). **Phase 2 (bloodied):** it raises them every round.
>
> **Surges** (free, once each, at the start of the boss's turn in rounds 1, 3 and 5 in this order):
> 1. **Raise the Dead.** Four Risen Bones knit together across the moor.
> 2. **Soul Siphon.** Every hero within 4 loses **4 health** to the Lich, who heals that much.
> 3. **Death Nova.** Every hero takes **4 necrotic damage**.
>
> Surge damage is flat: armour does not reduce it.
>
> **Escort.** Skeletons and Skeleton Archers, up to a budget of about 8.

---

## Region III: Ashen Waste

A land of fire, ash and stone. Hazards: fire, lava. Fireproof foes are immune to fire and Burning.

| Foe | Type · Role | Cost | HP | SPD | Armour | Attack | Init | Traits and notes |
|---|---|---|---|---|---|---|---|---|
| **Ember Imp** | Minion · Artillery | 0.5 | 1 | 5 | None | **Firebolt** flat 3, range 3 | d6 | Nimble. Fireproof. Fire death. Four to a horde. |
| **Ember Hound** | Standard · Skirmisher | 3 | 20 | 5 | None | **Burning Bite** d6+2, range 1; Burn 2 (crit) | d6 | Pack. Nimble. Fireproof. |
| **Gnoll Marauder** | Standard · Skirmisher | 3 | 24 | 4 | 1 | **Flail** d8+2, range 1; Burn 2 (crit) | d6 | Savage. |
| **Cinder Priest** | Standard · Leader | 4 | 22 | 3 | None | **Scorch** d6+2, range 4; **Burn 1** (2 on a crit). **Kindle:** every 2 rounds, sets a tile within 4 on fire | d6 | Aura. Fireproof. Mend 8. The chief of its band. |
| **Fire Drake** | Standard · Artillery | 4 | 28 | 4 | 1 | **Firespit** d8+1, range 4; **Burn 1**. **Flame Breath ◆3** d6+2, range 3, area 3×3; leaves fire | d8 | Fireproof. |
| **Ash Wraith** | Standard · Lurker | 3 | 22 | 4 | None | **Ash Touch** d8+2, range 1; **Weak** | d8 | Undead. Incorporeal. Fireproof. Starts hidden. |
| **Grave Cultist** | Standard · Controller | 3 | 14 | 3 | None | *(see Region II)* | | Also found here. |
| **Orc Brute** | Standard · Brute | 3 | 28 | 3 | 1 | *(see Region I)* | | Also found here. |

### Region III Elites

> **Ogre Smasher** · *Elite* · *Brute* · Cost 6
> **HP** 54 · **SPD** 3 · **Armour** 2 · **Steadfast** 2 · **Attack** *Greatclub* d12+2, range 1; push 2 (3 on a crit); **Stun**
> **Initiative** d4 · **Terrifying** 1

> **Rock Golem** · *Elite* · *Soldier* · Cost 6
> **HP** 66 · **SPD** 2 · **Armour** 3 · **Steadfast** 3 · **Attack** *Crushing Fists* d12+2, range 1; push 1 (2 on a crit). *Hurl Boulder* **◆2** d8+2, range 4; **Stun**
> **Initiative** d4
> **Traits** *Large.* Immune poison. **Resist** physical.

> **Magma Hulk** · *Elite* · *Controller* · Cost 5
> **HP** 38 · **SPD** 3 · **Armour** 2 · **Steadfast** 1 · **Attack** *Molten Fist* d8+2, range 1; **Root**; **Burn 1**
> **Initiative** d4
> **Traits** Fireproof. Trail.

### Region III Boss: The Ashen Dragon

> **Ashen Dragon** · *Boss* · *Artillery*
> **HP** 200 · **SPD** 4 · **Armour** 3 · **Steadfast** 3 · **Terrifying** 3
> **Initiative** d8 · **Immune** fire · **Weak** cold
> **Attacks twice** per turn: *Rending Claws* d10+3, range 1; *Tail Lash* d8+3, range 2, push 2; *Fire Breath* d10+3, range 3, area 3×3; leaves fire (**◆3**).
> **Traits** *Large. Fireproof.*
> **Phase 2 (bloodied):** *Fire Breath* costs **◆2**.
>
> **Surges** (free, once each, at the start of the boss's turn in rounds 1, 3 and 5 in this order):
> 1. **Wing Buffet.** Heroes within 2 (diagonals count) are hurled **2 squares** away (they can slam and be Stunned) and **Rooted**.
> 2. **Terrifying Presence.** Every hero is **Weakened** (their hits roll one fewer die, and foes' hits on them one more), and the foes gain **3 Malice**.
> 3. **Inferno.** The dragon floods the **row with the most heroes** with fire: **6 damage** to each hero in it (armour does not reduce it), and the row burns for 2 rounds.
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

- **Foe value.** A foe as strong as one hero is worth **30**, so a Medium fight is two of them, or a crowd of weaker ones. Heroes do not level up (Core 4.2), so the party's expected strength at each stop stands in for its level: *party strength* = 4 × (4 + 0.85 × (1 + 0.75 × the stop's depth)). A Medium budget buys foes costing *party strength* × 0.4.
- **Tuning by region** (`tools/sim.js`): every foe budget × 1.1, 1.05 and 0.65 in regions I, II and III; on top of that, ordinary battles × 1.5, 2 and 1.4 (`battleMul`), elites × 1.5, 1.6 and 1 (`eliteBudget`); boss health is the listed HP × 0.55 × 1, 1.45 or 0.26 by region (`bossAct`), rising 3% per stop. Every foe, bosses included, then has 50% of that (`foeHpMul`). Foe health rises 3% and their strength bonus 0.12 per stop of depth. With these numbers the simulator wins about 31–45% of runs (v0.27; the result is noisy).
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
| **Rescue** | Reach the caged captive (a hero beside the cage frees them), then lead them to the bottom edge. The freed captive moves on the heroes' turn: up to SPD 3, like a hero with only a Move. If they fall, you fail. | ×0.8 |
| **Plunder** | Grab all 3 chests (or defeat every foe). Each chest gives +1 party momentum; all 3 earns bonus gold. | ×0.9 |
| **Survive** | Hold out for 5 rounds against reinforcements. | ×0.6 |
| **Assassinate** | Slay the chief. | ×0.8 |
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

> **Bound Horror** *(mission only)* · Elite · Cost n/a · **HP** 50 · **SPD** 3 · **Armour** 2 · **Steadfast** 2 · *Rending Tendrils* d10+3, range 2; **pulls** 1 (2 on a crit). **Ritual Pillar** *(object)*: HP 18, no armour, no attacks.

### Hazards on the Map

Hazard rules and damage are in Core 3.1. Place **one to three hazard tiles** on each map, where forced movement can use them.

| Region | Typical hazards | Typical obstacles |
|---|---|---|
| **I · Greenmarch** | snares, webs | trees, boulders, crates, low walls |
| **II · Barrow Moors** | webs, acid pools | dead trees, gravestones, sarcophagi, columns |
| **III · Ashen Waste** | fire, lava | basalt spires, boulders |

### Rewards

Rewards follow Core 4.1 and 4.2: **battles** give gold, 1 Victory and a reward pick; **elite battles** give gold, 2 Victories, two reward picks (Uncommon or better) and a weapon or relic; **bosses** give gold, 3 Victories, two reward picks with a Rare, and a relic.

---

## Design Notes for the Bestiary

- **Source.** The foe pools, costs, mission list, twists and surges come from the Emberwatch Tactics prototype and are converted to these rules. Roles follow D&D 4e's Monster Vault and Draw Steel (the Leader role and Malice come from Draw Steel; Lurker, Soldier and Artillery from 4e). The extra foes (Mire Lurker, Wailing Shade, Bone Warden, Ember Hound, Ash Wraith) are new.
- **Conversion (v0.25).** Emberwatch armour 0 / 1 / 2 / 3 is back as **flat armour** 0 / 1 / 2 / 3, taken off the **damage** of each hit (since v0.27 off the total of all the dice, so more dice shrug it off). (From v0.19 to v0.24 it was a DEF die of None / d4 / d6 / d8.) Attack dice and bonuses were kept. Old status names on foe attacks map onto the current ones: bleeding → Burning (the old number of turns becomes the Burning number), slowed → Rooted, dazed and staggered → Stunned, marked → Taunted, exposed → Weakened.
- **Malice** replaces the old rule that a boss may unleash a surge every round; surges are free and scheduled (rounds 1, 3 and 5), and Malice pays for threats and ◆ abilities.
- **To test.** Whether swarms are too deadly. Whether three bosses with escorts of cost 6 to 8 are the right size. Whether armour 3 (Bone Warden, Rock Golem, the dragon) makes d4 heroes feel useless without set-ups. Whether Weakened means enough on foes that roll a single die (it cannot take them below one, Design Notes). Whether foes, which also gain a die for each status on a hero, punish Taunted and Weakened heroes too hard.
