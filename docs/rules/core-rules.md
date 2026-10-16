---
title: Rogue Tactics 1e — Core Rules
version: 0.23
book: 1 of 3 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics]
---

# Rogue Tactics 1e — Core Rules

> v 0.23. Book 1 of 3. The other books are [Heroes](heroes.md) and [Bestiary](bestiary.md). Why the rules are the way they are, and what is still open, is in [Design Notes](design-notes.md). Numbers marked **TBC** are first guesses waiting for playtesting.

---

## Start Here

**Rogue Tactics** is a phone-first roguelite tactics game: Fire Emblem meets Balatro and Slay the Spire. You lead **four heroes** across **three regions**. Each region is a map of battles, events, shops and camps that ends in a boss. Beat all three bosses to win. If every hero is Down at once, the run ends.

The whole game runs on two dice rules:

> [!important] The two dice rules
> **To hurt something,** roll your **weapon die** and add your **key stat**. A **1 misses**. The **maximum is a critical hit**: it explodes and ignores armour. (3.5)
>
> **To do anything risky,** roll the **die for the attribute**. **4 or more succeeds.** Advantage and disadvantage are the only way to make it easier or harder. (1.3)
>
> Everything else is built on these, plus **laddering**: moving a die up or down **d4 → d6 → d8 → d10 → d12 → d20**.

### The Books

| Book | What is in it | When to read it |
|---|---|---|
| **Core Rules** (this book) | How to play | Chapters 1 to 3 before your first battle |
| **Heroes** | The classes, their powers, and weapon upgrades | When you pick your party, and whenever you draft or upgrade |
| **Bestiary** | Foes, bosses, encounters | When you build the game's content |
| **Design Notes** | Reasons, history, open questions | Designers only |

**New player?** Take the **default party** (rogue, fighter, wizard, cleric) from the Heroes book, read chapters 1 to 3, and play. Chapter 5 (making your own hero) can wait.

### How to Win Fights

- **Set up, then strike.** One hero staggers or exposes a foe; another cashes it in (3.8). A staggered foe takes a **sure critical hit**.
- **Spend momentum.** MP is lost when the battle ends (3.7).
- **Watch the order.** The turn order is on screen. Deal with the foe that acts next.
- **Count your actions.** Defending and other reactions spend actions you would otherwise use on your turn (3.3).
- **Mind your wounds.** Every time a hero goes Down they take a Wound, and the fourth Down kills them (2.4).

---

## 1. Dice and Checks

### 1.1 Dice

The game uses **d4, d6, d8, d10, d12 and d20**.

- **Ladder.** To ladder a die **up**, move it one step along d4 → d6 → d8 → d10 → d12 → d20. To ladder it **down**, move it one step back. Weapons, armour and hit dice improve this way. A few special weapons go one step below d4, to a **d2** (Heroes book).
- **Explode.** When a die shows its **maximum**, roll it again and add the new result. Keep going while the maximum comes up.

### 1.2 Attributes

Every creature has four **attributes**:

| Icon | Attribute | What it means | Used for |
|---|---|---|---|
| ♜ | **STR** Strength | Power, toughness | Key stat of the fighter; healing (2.5); carrying (5.3) |
| ➶ | **DEX** Dexterity | Speed, agility | Key stat of the rogue; speed (3.1) and initiative (3.2) |
| ✦ | **INT** Intelligence | Learning, reasoning | Key stat of the wizard |
| ♛ | **PRE** Presence | Awareness, will, charm | Key stat of the cleric |

An attribute is a number. The number sets its die:

| Attribute | 0 | 1 | 2 | 3 | 4 | 5 | 6 (buff only) |
|---|---|---|---|---|---|---|---|
| **Die** | d4 with disadvantage | d4 | d6 | d8 | d10 | d12 | d20, never critically fails |

- Starting heroes have attributes of **1 to 4**. A **5** is earned with **Training** rewards (4.2) or items.
- A **6** only happens when a buff raises a 5. It is always temporary.

### 1.3 Checks

When a hero tries something risky, the game names an **attribute** and the hero rolls its die.

- **4 or more succeeds.** There are no target numbers.
- **A 1 is a critical failure:** the attempt fails with a complication (a lost item, an alarm, some damage). A d20 never critically fails.
- **A maximum explodes.** It only matters when the total counts (healing, for example).
- **Difficulty** is set only by advantage and disadvantage (1.4).

| Attribute | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| **Success** | 6% | 25% | 50% | 63% | 70% | 75% | 85% |
| **Critical failure** | 44% | 25% | 17% | 13% | 10% | 8% | none |

**Which attribute?** There is no skill list.

| Attribute | Typical checks |
|---|---|
| ♜ STR | Lifting, breaking, climbing, shoving; enduring poison, cold and long marches |
| ➶ DEX | Balancing, sneaking, hiding, stealing, quick hands |
| ✦ INT | Knowing history, magic and religion; foraging; making and fixing things |
| ♛ PRE | Noticing things, reading people, persuading, lying, performing |

**Class options.** Some event choices are marked with a class, such as **Rogue: pick the lock** or **Cleric: lay the spirit to rest**. Only a party with that class can choose them. They usually succeed without a roll, or roll with advantage. This is how specialist tasks work: there is no lockpicking check for a party with no rogue. Each class lists its specialties in the Heroes book.

**Help.** When one hero makes a check, another hero may **Help**, giving the roll **+1 advantage**. Once per check.

**Group checks.** When the whole party does something together (sneaking past a patrol, wading a flooded river), **every hero rolls**. The party **succeeds if at least half succeed**. A critical failure by anyone adds a complication, even on a success.

### 1.4 Advantage and Disadvantage

Good circumstances give **advantage**. Bad ones give **disadvantage**. They **stack**:

1. Count the sources of each.
2. Subtract to find the **net**. The net is capped at **3** either way.
3. Roll **1 + net** dice. Keep the **highest** for advantage, the **lowest** for disadvantage.

Chance of success (4+) at each net:

| Die | −3 | −2 | −1 | Normal | +1 | +2 | +3 |
|---|---|---|---|---|---|---|---|
| d4 | 0% | 2% | 6% | 25% | 44% | 58% | 68% |
| d6 | 6% | 12% | 25% | 50% | 75% | 88% | 94% |
| d8 | 15% | 24% | 39% | 63% | 86% | 95% | 98% |
| d10 | 24% | 34% | 49% | 70% | 91% | 97% | 99% |
| d12 | 32% | 42% | 56% | 75% | 94% | 98% | 100% |
| d20 | 52% | 61% | 72% | 85% | 98% | 100% | 100% |

On an attack, the **kept die** decides the miss and the crit (3.5).

### 1.5 Saves

When something acts on you (a shove, a curse, a gas cloud), you make a **save**: a check with the attribute the effect names. Success avoids the effect, or softens it if the effect says so.

- Each **class** has one save with **advantage** (marked **+**) and one with **disadvantage** (marked **−**).
- Each **foe** lists its own **+** and **−** saves.
- A critical failure on a save has no extra effect unless the effect says so.

> **Example.** A fighter (STR 4, saves STR +, INT −) is shoved by a spell that calls for a STR save. She rolls two d10s and keeps the higher. Later a curse calls for an INT save (INT 1): she rolls two d4s and keeps the lower.

---

## 2. Health

### 2.1 Hit Points and Hit Dice

**Hit points (HP)** are how much damage you can take.

Every class has a **hit die (⚅)**, from d6 to d12. Hit dice do two jobs:

- **They set your HP.** A hero starts with HP equal to their hit die's **maximum × 4**. **Vigor** rewards (4.2) add more: one and a half times the die's maximum each.
- **They heal you.** You have a **pool of 3 hit dice**. You spend them to heal (2.5), and a Camp restores the pool (4.7).

| Hit die | Classes | Starting HP | Vigor reward |
|---|---|---|---|
| d6 | Wizard | 24 | +9 |
| d8 | Rogue, Cleric | 32 | +12 |
| d10 | Fighter | 40 | +15 |
| d12 | Barbarian | 48 | +18 |

### 2.2 Shields

A **shield** is temporary HP. Damage takes it off first. Shields do not add up: if you gain a new shield while you have one, keep the larger. A shield **fades at the start of its owner's next turn**.

*(A shield is not the same as the shield you carry, which helps your Defend roll, 3.6.)*

### 2.3 Bloodied

A creature is **bloodied** while its HP is **at or below half** its maximum. Bloodied does nothing by itself. Other rules look for it: a boss changes phase, a power deals extra damage, a foe turns savage. The screen marks it on the HP bar.

### 2.4 Down, Wounds and Death

- **Down.** A hero at **0 HP** is Down. They cannot act, and foes ignore them. They gain **1 Wound**.
- **Getting up.** An adjacent ally can spend an action to **Help up** a Down hero, who stands with HP equal to **one roll of their hit die** (not spent from the pool). Any healing also stands them up. When the party **wins** a battle, every Down hero stands up with **1 HP**.
- **Wounds.** Each Wound gives **−1** to the total of every **check**, **save** and **attack** the hero makes, to a maximum of **−3**. Apply it after any explosion. A natural 1 is still a critical failure or a miss, and a natural maximum still explodes or crits. A hit still deals at least 1 damage. Wounds do not affect DEF rolls, initiative or hit dice.
- **Death.** A hero who goes Down **with 3 Wounds already** dies for good. In other words, a hero can survive three Downs; the **fourth Down** before their Wounds heal kills them.
- **Removing Wounds.** Each **Camp** removes 1 Wound from every hero, and gold can buy one more (4.7).
- **Defeat.** If **every** hero is Down at the same time, the battle is lost and the run ends.

### 2.5 Healing

| Way to heal | When | How much |
|---|---|---|
| **Second Wind** | In battle, **once per battle**, 1 action | Spend one hit die: roll it (exploding) and add your **STR**. Your next DEF roll before your next turn has +1 advantage. |
| **Catch Breath** | Any time **outside** battle | Spend any number of hit dice. For each, roll it (exploding) and add your **STR**. |
| **Healing potion** | 1 action | Roll **2 of your hit dice** (not spent from the pool). |
| **Healing power** | As the power says | As the power says (Heroes book). |
| **Camp** | At a Camp stop | Spends your remaining hit dice, then restores the pool (4.7). |

Healing never raises HP above the maximum.

---

## 3. Combat

### 3.1 The Battlefield

Battles are fought on a grid of square tiles, **6 wide and 8 tall** (a phone held upright).

- **One creature per tile.** Large creatures fill 2×2 tiles.
- **Movement is orthogonal**: up, down, left, right. Each tile costs 1 SPD. You can move through allies, but not through foes or obstacles, and you cannot stop on an occupied tile.
- **Distance** is counted in orthogonal steps. A diagonal tile is at distance 2.
- **Speed (SPD)** is how many tiles one Move action covers: **SPD = 2 + half your DEX, rounded up** (DEX 1–2: 3 · DEX 3–4: 4 · DEX 5–6: 5).

**Obstacles.**

| Obstacle | Examples | Effect |
|---|---|---|
| **Tall** | Boulder, tree, pillar, wall | Blocks movement and sight. |
| **Cover** | Crates, low wall, gravestone | Blocks movement. Gives cover (3.5). |

**Hazards.** A creature suffers a hazard when it **enters it or ends its turn in it**. Hazard damage is **flat** and ignores DEF, and it grows by the region number (+0 in region I, +1 in II, +2 in III). A **DEX save** avoids the condition, but not the damage. Foes avoid hazards unless they are pushed. A creature **pushed** into a hazard makes the save with **disadvantage**.

| Hazard | Damage | Condition (DEX save avoids) |
|---|---|---|
| **Fire** | 3 | burning |
| **Acid pool** | 3 | weakened |
| **Lava** | 8 | burning |
| **Spikes** | 3 | slowed |
| **Snare** (hidden until entered) | 4 | rooted |
| **Web** | 0 | rooted (then the web tears) |
| **Poison gas** | 0 | poisoned (STR save instead of DEX) |

### 3.2 Starting a Battle

1. **Initiative.** Every creature rolls its **DEX die** (exploding). Turns go from **highest to lowest** and the order **stays the same all battle**. Ties go to the higher DEX, then to heroes. Minions of one type share a roll.
2. **Surprise.** Heroes who ambush unaware foes roll initiative with **advantage** and start **hidden**. Heroes who are ambushed roll with **disadvantage**.
3. **Fear.** If a foe is **Terrifying** (Bestiary), every hero makes a **PRE save** at the start of the battle, with disadvantage equal to the foe's Terrifying rating (1 to 3). A hero who fails is **frightened** until the end of their first turn.

**Rounds and turns.** A **turn** is one creature's go. A **round** is one pass through the whole order.

**Swapping.** Once per round, **two heroes who have not yet acted** that round may **swap places** in the order. Foes never swap.

### 3.3 Your Turn

You have **3 actions** on your turn. Spend them on the actions in 3.4, in any order. You do not have to use them all.

- **Reactions spend actions too.** Between your turns you can react (3.6), such as **Defend**. Each reaction costs **1 action**, so you start your next turn with fewer.
- **Your actions come back at the end of your turn**, however many you spent.
- **Free powers** and passive powers cost no action. You may use **one free power** per turn.
- A **dazed** hero has 1 action on their turn. A **staggered** hero has 1 fewer (3.10).

### 3.4 Actions

Each action costs **1 action** unless it says otherwise.

| Action | What it does |
|---|---|
| **Move** | Move up to your **SPD** (3.1). You may split the move around other actions in the same turn. |
| **Attack** | A **basic attack** with your weapon (3.5). The first each turn gives **+1 MP** (3.7). Each later basic attack in the same turn is **rushed**: the second has 1 disadvantage, the third has 2. |
| **Power** | Use a power (chapter 7). It costs **MP**, and the number of actions the power lists. |
| **Assess** | An **INT** or **PRE** check. On a success choose one: **Create an opening** (the foe is **exposed**, 3.8) or **Anticipate danger** (attacks against you have disadvantage until your next turn). You can create an opening on each foe only once per battle. |
| **Hide** | A **DEX** check, if you are next to cover or out of every foe's sight. On a success you are **hidden** (3.5). |
| **Use an item** | Drink or give a potion (to yourself or an adjacent ally), or throw a consumable. |
| **Help up** | An adjacent Down ally stands up (2.4). |
| **Second Wind** | Once per battle: heal (2.5). |

Every foe's stats, saves and next move are always shown when you tap it.

### 3.5 Attacking

**ATK = weapon die + key stat.** Your weapon sets the die and range (chapter 6). Your class sets the key stat.

1. **Roll the weapon die** (with any advantage or disadvantage, 1.4). The kept die decides the rest.
2. **A 1 misses.** No damage, no effects.
3. **The maximum is a critical hit.** The die explodes. A crit **ignores DEF**.
4. **Add your key stat**, once.
5. **The target defends.** If it is not a crit, a foe rolls its **DEF die** automatically and subtracts it. A hero may **Defend** (3.6). A hit always deals **at least 1 damage**.
6. **Apply damage**: shield first, then HP.

> **Example.** A rogue (DEX 3) with Twinblades (d4) attacks a goblin in light armour (DEF d4). She rolls a 3: 3 + 3 = 6. The goblin rolls DEF and gets a 2, so it takes **4**. Next she rolls a 4, the maximum: a crit. The die explodes and she rolls a 2. Total 4 + 2 + 3 = **9**, and the goblin cannot roll DEF.

**Melee and range.** **Range 1 is melee**: the target must be orthogonally adjacent. Anything more is **ranged**. A ranged attack while a foe is adjacent to you has **disadvantage**. **Long shot:** take 1 more disadvantage to add +2 to your range (up to three times).

**Cover.** Draw a line from the centre of your tile to the centre of the target's. If it crosses a **cover** obstacle or another creature, the target has **cover**: ranged attacks against it have **disadvantage**.

**Hiding.** A **hidden** creature cannot be targeted at range. Its next attack has **2 advantage**, and then it is revealed.

**Advantage and disadvantage on attacks:**

| Advantage | Disadvantage |
|---|---|
| **Flanking:** an ally stands on the far side of the target, in a straight line with you | You attack at range with a foe adjacent to you |
| The target is **exposed**, **rooted** or **dazed** (each counts) | The target has **cover** |
| You are **blessed** | You are **weakened** or **frightened** |
| You attack from **hiding** (counts twice) | You are **marked** and attack someone else |
| You **dual wield** (once per round, 6.3) | **Rushed:** each basic attack after your first this turn |

> *Example.* A rogue flanks (+1) an exposed foe (+1), but shoots with a foe beside her (−1). Net +1: she rolls her weapon die twice and keeps the better.

### 3.6 Defending and Reactions

A **reaction** happens on someone else's turn. It costs **1 action**, and you cannot react with no actions left. Staggered and dazed creatures cannot react.

| Reaction | When | Effect | Limit |
|---|---|---|---|
| **Defend** | A hit that is **not a crit** lands on you | Roll your **DEF die** (exploding) and subtract it from the damage. A carried **shield** gives the roll **advantage**. | Any number, while you have actions |
| **Help** | An ally within 3 attacks or makes a check | They roll with **+1 advantage** | Once per round |
| **Class reaction** | As your class says (Heroes book) | For example, the fighter's **Intercept** | Once per round |

| Armour | DEF die |
|---|---|
| None | d4 with disadvantage |
| Light | d4 |
| Medium | d6 |
| Heavy | d8 |

**When a hero is hit,** reactions happen in this order: Intercept, then Defend, then Warding Word.

**Free strikes.** When a creature leaves a tile next to an enemy for a tile that is **not** next to it, that enemy gets a **free strike**: a basic attack against it. A free strike costs nothing and is not a reaction. Moving from one adjacent tile to another does not provoke one. Staggered and dazed creatures cannot make free strikes.

### 3.7 Momentum (MP)

**Momentum** pays for powers. Each hero has their own.

- **Start of battle:** each hero starts with **MP equal to the party's Victories, up to 3** (4.2). Powers can add more, but no hero starts a battle with more than **5 MP**.
- **+1 MP** for your first basic attack each turn, hit or miss.
- **+2 MP** for each **combo** (3.8), for the hero who cashes it in and for each hero who set it up.
- **Maximum 10 MP.** All MP is lost when the battle ends.

### 3.8 Set-ups and Combos

A **set-up** is a condition one hero puts on a creature so that **another** hero can cash it in. Cashing in someone else's set-up is a **combo**. You never cash in your own set-up.

| Set-up | Usually made by | How | The payoff |
|---|---|---|---|
| **Staggered** foe | Tank | A **slam**, or a power that staggers (3.9) | The foe **loses its next turn**, unless an ally other than the one who staggered it **hits it first**. That hit is a **sure crit** (the die counts as its maximum and explodes), and the foe then keeps its turn. |
| **Exposed** foe | Controller | A debuffing power, or *Create an opening* (3.4) | The setter's allies attack it with **advantage**. |
| **Blessed** hero | Support | A blessing power | The hero's next attack has **advantage**. |

- On a combo, the hero who cashes in and each hero who set it up gain **+2 MP**. One combo per action at most.
- A foe that just **lost a turn** to a stagger is **steadied**: it cannot be staggered again until after its next turn.
- A **boss** never loses its turn. A staggering hit gives the next attack against it **+2 advantage** instead.

### 3.9 Forced Movement

Powers can **push** a creature straight away from the source or **pull** it straight toward the source, a number of tiles.

- **Slam.** A creature pushed or pulled into an obstacle or another creature stops and takes **slam damage: one roll of the weapon die of whoever moved it** (exploding). A creature it hits takes the same. (Effects with no weapon use a d4.) Slam damage ignores DEF. **A slam staggers** the creature that was moved.
- Forced movement **without** a slam does not stagger unless the power says so.
- **Steadfast N.** Pushes and pulls move a Steadfast N creature **N tiles fewer**.
- **Into a hazard.** The creature suffers it, with disadvantage on the save (3.1).

### 3.10 Conditions

A condition lasts **until the end of the affected creature's next turn**, unless the effect says otherwise. Applied on its owner's own turn, it lasts one turn more.

| Condition | Effect |
|---|---|
| **Staggered** | SPD is halved and it cannot react or make free strikes. A **foe** also loses its next turn (3.8). A **hero** has **1 fewer action** on their next turn instead. |
| **Exposed** | The setter's allies attack it with advantage (3.8). |
| **Blessed** | Its next attack has advantage (3.8). |
| **Dazed** | A hero has **1 action** on their turn. A foe can **move or act**, not both. No reactions. Bosses are immune. |
| **Rooted** | Cannot move. Attacks against it have advantage. Bosses are immune. |
| **Slowed** | SPD is 1. |
| **Prone** | Moving costs double; standing up costs 3 SPD. Melee attacks against it have advantage; its ranged attacks have disadvantage. |
| **Weakened** | Its attacks have disadvantage. |
| **Frightened** | Its attacks have disadvantage while the source is in sight, and it cannot move closer to the source. |
| **Blinded** | Attacks against it have advantage; its attacks have disadvantage. |
| **Poisoned** | All its rolls have disadvantage. |
| **Bleeding** | At the start of each of its turns, takes **one roll of the weapon die** of whoever made it bleed (a d4 if there was no weapon). |
| **Burning** | Takes **3 fire damage** at the start of each of its turns. Entering water ends it. |
| **Marked** | Its attacks have disadvantage unless they target whoever marked it. A **fighter's** mark also **taunts**: while it can reach the fighter, it can attack only the fighter. |
| **Hidden** | See 3.5. |

Damage from bleeding and burning ignores DEF.

### 3.11 Damage Types

Damage is **physical** unless something says otherwise. The other types are **fire**, **cold**, **force**, **radiant**, **necrotic** and **poison**.

A creature can be **weak**, **resistant** or **immune** to a type. Apply it after DEF (and to crits too):

- **Weak:** double the damage.
- **Resist:** halve the damage (rounded down, but at least 1).
- **Immune:** no damage, and no burning (fire) or poisoned (poison) from that type.

Flat damage from minions and swarms ignores resistance.

### 3.12 Foes

Foes use the same rules as heroes, with a few differences (full rules in the Bestiary):

- A foe's turn is a **move and an action** (an attack or a special ability). Its stat block may list more.
- Foes roll **DEF automatically** against every hit that is not a crit. They do not Defend and do not spend actions on reactions.
- **Minions** have 1 HP and deal flat damage; they never miss or crit. **Swarms** share one HP pool and take double damage from area attacks.
- **Bosses** cannot be dazed or rooted and never lose their turn to a stagger.
- Foes share a pool of **Malice (◆)**, which pays for their threats and special abilities.
- Each foe has a **role** (Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader) that tells you how it moves and whom it attacks.

### 3.13 Companions

A hero may have **one companion**, such as a wolf, a hawk or a mule, from a class feature, relic or shop.

- A companion has **HP**, **SPD**, **flat damage** (never misses or crits) and one **trick**. It has no DEF, no hit dice and no reactions.
- It acts **on its owner's turn at no action cost**: it moves up to its SPD and attacks or uses its trick.
- At 0 HP it is **Down** until the next Camp. It never dies.
- It counts as an ally for flanking and set-ups.

| Companion | HP | SPD | Damage | Trick |
|---|---|---|---|---|
| **Wolf** | 10 | 5 | 2 | **Trip:** a creature it hits makes a STR save or falls **prone**. |
| **Hawk** | 6 | 6 | 1 | **Spot:** once per battle, reveals a hidden foe or snare, and its owner's next attack has advantage. |
| **Mule** | 14 | 3 | 1 | **Pack animal:** +2 pack slots. Once per round, a hit on its adjacent owner can hit the mule instead. |

A companion gains **+4 HP** and **+1 damage** after each boss.

### 3.14 Winning and Losing

- A battle is **won** when its **mission** is done. Most missions are "defeat every foe" (other missions are in the Bestiary).
- It is **lost** if every hero is Down at once, or the mission fails. A lost battle ends the run.
- After a won battle, Down heroes stand up with 1 HP, and the party earns its rewards (4.1).

---

## 4. The Run

### 4.1 The Map

Each **region** is a map of **7 floors**. Each floor offers a few stops, linked by paths. You pick one stop per floor. The first floor is always a battle, and the last is a **Camp**, followed by the region's **boss**.

| Stop | What happens | Reward |
|---|---|---|
| **Battle** | A fight on the grid: usually Medium, sometimes Easy (below). | Gold, 1 Victory, a **reward** |
| **Elite battle** | A Hard fight. | Gold, 2 Victories, **two rewards** (Uncommon or better), a weapon or relic |
| **Event** | A choice, often with a check (4.3). | As the event says |
| **Road event** | A quick surprise on the way (4.6). | As rolled |
| **Shop** | Buy weapons, armour, potions, powers and relics; upgrade weapons at the smith (4.8). | — |
| **Camp** | Heal, refill hit dice, remove Wounds, downtime (4.7). | — |
| **Treasure** | Pick a relic, a weapon, or a reward. | — |
| **Boss** | The Extreme fight that ends the region. | Gold, 3 Victories, **two rewards** (Rare or better), a relic |

Every encounter has a **difficulty** (Bestiary, Encounter Building):

| Difficulty | Typical stop |
|---|---|
| **Easy** | The first battle of a region, a quarter of other battles, fights from events and road ambushes |
| **Medium** | Most battles |
| **Hard** | Elite battles |
| **Extreme** | Bosses |

### 4.2 Rewards and Victories

Heroes **do not level up**. They grow the way a deck grows in *Slay the Spire*: by what the party picks after each fight.

**Rewards.** After every battle won, the party picks **1 of 3 reward cards**:

- Each card is either a **power for one hero** (the card names the hero; the three cards go to different heroes where possible), or a **growth card** (each card has a 30% chance, at most one per pick, so about two picks in three hold one; never in elite or boss picks). A growth card is Training about a third of the time, while the hero's key stat is below 5:

| Growth | Effect |
|---|---|
| **Vigor** | The hero gains max HP equal to **1½ × their hit die's maximum** (d10: +15), and heals that much now. |
| **Training** | **+1 to the hero's key stat**, up to 5. |

- **Elite battles** give **two** picks, each with at least one **Uncommon** power or better. **Bosses** give **two** picks with at least one **Rare**.
- Powers roll their rarity as in a draft (7): Common 60%, Uncommon 30%, Rare 10%.
- **Skip** a pick for **10 gold**, or pay **10 gold** once to **reroll** its cards.
- A hero with every slot full who takes a power discards one.
- **Treasure**, some **events** and the *Scholar's Tome* relic (4 cards) also offer picks.

> **Why no levels?** Levels came in big steps at a Camp, far from the fights that earned them. A pick after every fight gives a decision every few minutes, lets the party steer toward a build, and makes skipping a choice too.


**Victories** are the party's wins since its last Camp.

| Challenge | Victories |
|---|---|
| A battle won | +1 |
| An elite battle won | +2 |
| A boss beaten | +3 |
| A dramatic task or negotiation succeeded | +1 |

- **Victories make the party sharper:** every hero starts each battle with **MP equal to the Victories, up to 3** (3.7).
- **A Camp resets the Victories to 0.** Pushing on without camping means stronger starts, but more Wounds and fewer hit dice.

### 4.3 Events

An **event** is a short scene with a choice: a shrine, a toll, a collapsed bridge.

- Each option shows what it costs and which attribute it tests, if any.
- **There is always a safe option** with no roll: pay gold, spend an item, or walk on.
- **Class options** (1.3) appear if the party has that class.
- A failed check has a cost. A critical failure has a worse one.

| Event | Risky option | Class option | Safe option |
|---|---|---|---|
| **Collapsed Bridge** | DEX to cross | Fighter: brace the beam (advantage) | Go the long way: each hero loses 1 hit die |
| **Shrine** | INT to read the inscription | Cleric: pray (no roll) | Pay 30 gold for a blessing |
| **Toll** | PRE to talk past the guards | Rogue: slip past (advantage) | Pay the toll |
| **Reliquary** | DEX to lift the relic without springing the trap | Rogue: disarm the trap (no roll) | Leave it |

Two kinds of event take more than one roll: **dramatic tasks** (4.4) and **negotiations** (4.5).

### 4.4 Dramatic Tasks

A **dramatic task** is a tense, timed job: crossing a collapsing bridge, pulling villagers from a fire, finishing a ritual before moonrise.

- The event sets the number of **rounds** (3 to 5) and the **tokens** the party needs.
- **Each round, every hero makes one attempt.** The screen offers a few approaches, each with an attribute; the hero picks one and rolls.
- **Success: 1 token.** An **exploding** roll: **2 tokens**. A **critical failure**: a complication, and the party **loses 1 token**.
- A hero may skip their attempt to **Help** another hero's attempt (+1 advantage).
- When the rounds run out (or the party has enough tokens):

| Tokens | Result |
|---|---|
| At or above the target | **Success** |
| 1 or 2 short | **Success with a cost** (an item lost, a hero hurt) |
| More than 2 short | **Failure**, with the cost the event names |

**Target sizes** for four heroes over three rounds: **easy 6**, **standard 8**, **hard 10**. An attempt earns about 0.7 tokens on average.

> **Example: Collapsed Bridge.** Three rounds, 8 tokens. The rogue runs the ropes (DEX), the fighter braces a beam (STR), the wizard spots the weak planks (INT), the cleric calms the mule (PRE). The party ends on 7: everyone crosses, but a pack falls into the gorge.

### 4.5 Negotiations

A **negotiation** wins something from someone who has something at stake: a guard captain, a rival, a guild master.

- The event shows the **request** and the other side's **mood**: hostile, wary, or friendly.
- **Up to three rounds.** Each round, one hero picks an **argument** from those on offer (an appeal, a threat, evidence, a bribe) and rolls **PRE**, or **INT** for evidence and law. Another hero may Help.
- The mood and the argument set the dice: **hostile** gives disadvantage, **friendly** gives advantage; a gift or evidence adds **+1 advantage**; an argument that offends them adds **+1 disadvantage**.
- **Success: 1 influence token.** Exploding roll: 2. Critical failure: lose 1.
- **Pay instead of rolling:** gold or a favour buys 1 token. The party may stop after any round.

| Tokens | They… |
|---|---|
| 0 | Refuse. |
| 1 | Give the least they can. |
| 2 | Agree, for a price. |
| 3+ | Agree fully, and may add a bonus (a discount, a secret, an ally). |

A successful negotiation also earns the party a **favour** (used in downtime, 4.7).

### 4.6 Road Events

At a **Road event** stop, the game rolls a d6. Later regions make each result harder.

| d6 | Event | What happens |
|---|---|---|
| 1 | **Ambush** | A short battle: a horde of minions and one foe. The foes have surprise. |
| 2 | **Hazard** | A group check (1.3) to get past fire, ice or a gas-filled hollow. Heroes who fail take the hazard's damage (3.1). |
| 3 | **Stranger** | A negotiation with a trader or a guide. |
| 4 | **Find** | A potion or some gold. A DEX or INT check finds something better. |
| 5 | **Omen** | A PRE check. Success: a hint about the boss, or 1 extra fate token for the next battle if the party has the Pouch of Fate Tokens. |
| 6 | **Calm road** | Each hero may spend one hit die to heal (Catch Breath) and gets it back. |

### 4.7 Camp

At a **Camp**, in order:

1. **Heal.** Each hero spends **all of their remaining hit dice** to heal (as Catch Breath).
2. **Restore.** Each hero's hit-dice pool fills up again (**3** dice).
3. **Rest.** Each hero **removes 1 Wound**. The Victories reset to 0.
4. **Downtime.** Spend gold or favours (below). Heroes may also swap their active relics, and discard or hand over powers (Heroes book).

| Downtime | Cost | Effect |
|---|---|---|
| **Tend wounds** | 25 gold | Remove 1 more Wound from one hero (once per hero per Camp). |
| **Provisions** | 10 gold | Gain 1 healing potion. |
| **Train** | 25 gold | One hero discards a power and drafts a replacement of the same rarity. |
| **Prayer** | 1 favour | With the Pouch of Fate Tokens active, the party starts the next battle with 4 fate tokens instead of 3. |
| **Haggle** | 10 gold | Swap a weapon or armour for another of the same price. |

*Prices TBC.*

### 4.8 Shops and Gold

**Gold** is the only currency. Shops sell weapons, armour, potions and powers, and sometimes a relic. Each shop has a **smith** who tempers, hones and inscribes weapons (Heroes book, Part 3). A shop buys items at half price. *TBC: whether gold carries over between runs.*

### 4.9 Boons

Each run begins with a **boon**: fortune offers **two gifts and a bargain**, and the party takes one (or none).

| Gift | Effect |
|---|---|
| **An Old Cache** | Choose 1 of 2 relics. |
| **A Patron's Purse** | +100 gold. |
| **A Master's Lesson** | One named hero drafts a power, with at least one Rare. |
| **The Armory** | Choose 1 of 2 weapons. |
| **Veterans** | Every hero gains a Vigor (2.1). |
| **The Smith's Favour** | One named hero's weapon is tempered one step. |

| Bargain | Effect |
|---|---|
| **A Dark Pact** | Choose 1 of 3 relics; every hero starts with a Wound. |
| **A Cursed Hoard** | +250 gold; every hero starts with a Wound. |
| **A Blood Oath** | Every hero drafts a power (at least one Uncommon); start with no gold. |

### 4.10 Between Runs: the Chronicle and Dread

**The Chronicle** keeps what carries over from run to run: totals (runs, wins, battles, elites, foes slain), the best **score**, the last twelve runs, and **unlocked relics**. Unlocked relics join the pool that treasure, rewards, shops and boons draw from.

| Relic | Unlocked by |
|---|---|
| **War Drum** | Finishing a run, won or lost |
| **Scholar's Tome** | Winning 15 battles |
| **Camp Kettle** | Defeating a boss |
| **Merchant's Seal** | Finishing 8 events |
| **Executioner's Hood** | Winning 5 elite battles |
| **Mender's Thread** | Reaching the Ashen Waste |
| **Ember Censer** | Slaying 250 foes |
| **Blood Chalice** | Finishing 5 runs |
| **Crown of Thorns** | Slaying the Ashen Dragon |

**Score** = 10 per battle won + 20 per elite + 100 per boss + 1 per foe slain + 300 for a win, then **+25% per Dread level**.

**Dread** is the difficulty ladder. Slaying the dragon unlocks **Dread 1**; winning at your highest Dread unlocks the next. Choose the Dread when you set out. Each level keeps every level below it:

| Dread | Name | Hardship |
|---|---|---|
| 1 | Bolder Foes | Foes have 15% more HP. |
| 2 | Lean Purses | Start with no gold; battles pay 20% less. |
| 3 | Hardened Elites | Elite battles field 25% more foes. |
| 4 | Gathering Dark | Foes gain 1 more Malice every other round. |
| 5 | Dear Markets | Merchants and the smith charge 25% more. |
| 6 | No Easy Roads | Only the first battle of each region is Easy. |
| 7 | Tyrants | Bosses have 20% more HP. |
| 8 | Gritty | The **third** Down kills a hero, not the fourth. |

---

## 5. Making a Hero

The Heroes book has a ready-made hero for each class. To make your own:

### 5.1 Steps

1. **Choose a class** (Heroes book). It sets your key stat, hit die, saves, armour, weapons, innate power and class powers.
2. **Set your attributes** from one spread (5.2). Put the highest in your key stat.
3. **Take your class's starting gear.** The fighter and the cleric start with a shield.
4. **Work out your stats** (5.3).
5. **Choose two Common class powers** (Heroes book).
6. **Draft one Common general power** from three (Heroes book).
7. **Name your hero.**

### 5.2 Attribute Spreads

| Spread | Numbers |
|---|---|
| **Standard** | 3, 3, 2, 1 |
| **Balanced** | 3, 2, 2, 2 |
| **Min-Max** | 4, 3, 1, 1 |

*Example.* Branoc, a Min-Max fighter: STR 4, DEX 3, INT 1, PRE 1.

### 5.3 Hero Stats

| Stat | How to work it out |
|---|---|
| **HP** | Hit die maximum × 4, plus Vigor rewards (2.1) |
| **Hit dice** | A pool of 3, of your class's die |
| **SPD** | 2 + half your DEX, rounded up |
| **Initiative** | Your DEX die |
| **ATK** | Weapon die + key stat |
| **DEF** | Your armour's die; a carried shield gives advantage |
| **Saves** | One + and one − from your class |
| **Pack slots** | 2 + STR |

### 5.4 Growing Stronger

Heroes do not level up (4.2). A hero starts with their class's **level 1 and level 2 features** (Heroes book) and grows only through **rewards**: new powers, **Vigor** (max HP) and **Training** (+1 key stat, up to 5), and through weapons, relics and the smith.

### 5.5 Powers

Everything a hero learns during a run is a **power**, active or passive (chapter 7). A new hero has an innate power, two class powers and one general power.

---

## 6. Equipment

### 6.1 Proficiency and Hands

- Each class is proficient with some **weapon groups**: **Light**, **Martial**, **Ranged** and **Focus**. Anyone can use any weapon, but a weapon you are **not proficient** with **cannot crit**.
- **Armour** needs **STR**, not proficiency: **medium needs STR 2**, **heavy needs STR 3**.
- A **two-handed** weapon cannot be used with a shield.
- Once per round you may swap one weapon or shield at no cost.

### 6.2 Armour and Shields

| Armour | DEF | Needs | Cost |
|---|---|---|---|
| None | d4 with disadvantage | — | — |
| Leather (light) | d4 | — | 30 gold |
| Chain (medium) | d6 | STR 2 | 100 gold |
| Plate (heavy) | d8 | STR 3 | 300 gold |
| **Shield** | Your DEF rolls have **advantage** | one hand | 20 gold |

Magic armour can ladder the die up to **d10** or **d12**.

### 6.3 Weapons

| Weapon | Group | Die | Range | Properties | Cost |
|---|---|---|---|---|---|
| Dagger | Light | d4 | 1 | Light, thrown 3 | 3 |
| Twinblades | Light | d4 | 1 | Pair | 12 |
| Shortsword | Light | d6 | 1 | Light | 10 |
| Mace | Light | d6 | 1 | | 10 |
| Longsword | Martial | d6 | 1 | | 30 |
| Warhammer | Martial | d6 | 1 | | 30 |
| Battleaxe | Martial | d8 | 1 | | 45 |
| Glaive | Martial | d8 | 1 | Two-handed, reach 2 | 60 |
| Greataxe | Martial | d8 | 1 | Two-handed | 60 |
| Greatmaul | Martial | d10 | 1 | Two-handed, STR 2 | 80 |
| Sling | Ranged | d4 | 3 | | 4 |
| Javelin | Ranged | d6 | 3 | Thrown | 5 |
| Hand crossbow | Ranged | d6 | 3 | Light | 40 |
| Shortbow | Ranged | d6 | 4 | Two-handed | 25 |
| Longbow | Ranged | d6 | 5 | Two-handed | 50 |
| Crossbow | Ranged | d8 | 4 | Two-handed, load | 60 |
| Arcane Staff | Focus | d4 | 4 | No crits, no misses | 30 |
| Thorn Staff | Focus | d6 | 4 | No crits | 30 |
| Unarmed | — | d4 | 1 | | — |

Costs are in gold (**TBC**). A better weapon is usually one ladder step up.

| Property | Meaning |
|---|---|
| **Light** | Can be held in the off hand. Two Light weapons let you **dual wield**: once per round, one attack has advantage. |
| **Pair** | Two weapons sold as one; always counts as dual wielding. |
| **Two-handed** | Needs both hands. No shield. |
| **Reach N** | Melee attack at range N, in a straight line. |
| **Thrown N** | Can be thrown at range N; picked up again after the battle. |
| **Load** | Needs 1 action to reload after each shot. |
| **STR N** | Needs STR N. |
| **No crits** | A maximum roll does not explode or ignore DEF. |
| **No misses** | A 1 is just a low roll, not a miss. |

**Upgrades.** A smith can ladder a weapon's die up (*temper*) or down (*hone*), and inscribe **runes** such as Keen, Vicious, Flame or Thunder. Magic weapons come with runes. See the Heroes book, Part 3.

### 6.4 Consumables

Each consumable takes **1 pack slot** (5.3).

| Item | Effect (1 action) | Cost |
|---|---|---|
| **Healing potion** | Heal 2 of your hit dice (not spent) | 50 |
| **Greater healing potion** | Heal 4 of your hit dice (not spent) | 150 |
| **Antidote** | End poisoned, bleeding and burning | 30 |
| **Smoke bomb** | Range 3: every creature in a 3×3 area is blinded | 40 |
| **Fire flask** | Range 3: d6 fire damage and burning | 40 |

### 6.5 Relics

**Relics** change the rules for the whole party. The party can carry any number, but only **two are active**. Swap them at a Camp or before a battle. Relics do not take pack slots.

> **Pouch of Fate Tokens** · relic
> At the start of each battle and each event, the party gets **3 fate tokens**. Unused tokens are lost. Any hero may spend one at any time, at no action cost, to:
> - **Reroll** a die they just rolled (attack, check, save or DEF), keeping the new result; or
> - **Shake it off:** end one condition on themselves.

**Other relics.** Boots of Striding (+1 SPD), Dwarven Whetstone (+1 damage), Heart of the Oak (+8 max HP), Battle Hymn (+2 starting MP), Tactician's Map (+1 MP on the first basic attack), Phoenix Feather (the first hero Down each battle rises at half HP), Vampire Fang (heal 4 on a kill), Bulwark Sigil (start with a shield of 8), Loaded Bones (crits roll one more die), Sentinel Lens (+3 on free strikes and other reaction strikes), Warding Charm (each foe's first attack on each hero has disadvantage), Salamander Scale (immune to fire and lava), Gauntlet of Force (+1 to pushes and pulls), Fenwalker Boots (ignore difficult terrain), Hourglass of Haste (initiative with advantage), Lucky Coin (+50% gold), Healer's Satchel (heal 15% of max HP after each battle).

**Unlocked relics** (4.10): War Drum (+1 MP to the hero who cashes in a combo), Scholar's Tome (picks and drafts show 4 cards), Camp Kettle (+1 hit die; Camps remove 2 Wounds), Merchant's Seal (merchants and the smith charge 25% less), Executioner's Hood (advantage against bloodied foes), Ember Censer (every foe but a boss starts each battle burning), Mender's Thread (Second Wind twice a battle), Crown of Thorns (+3 starting MP; foes gain 2 more Malice each round), Blood Chalice (when a hero goes Down, every other hero gains 2 MP).

---

## 7. Powers

A **power** is anything a hero learns during a run. The full rules, every class's powers, the general powers, and weapon upgrades are in the **Heroes** book.

- **Two kinds.** An **active** power is used on your turn and costs **MP** and **actions**. A **passive** power is always on, or triggers by itself, and costs nothing.
- **Two lists.** **Class powers** are on each class page; **general powers** can be taken by any class. Each class also has an **innate** power that takes no slot.
- **Slots, rewards and drafts.** A hero has **8** power slots. Most powers come from **rewards** after each fight (4.2). A **draft** is a pick of 3 powers for one hero, from boons, Treasure, Training at a Camp and some events. Shops sell powers.
- **Damage is weapon dice.** No power adds flat damage. Powers add **weapon dice**, widen the **crit range**, or **double** a hit (×3 at most). Upgrading your weapon makes every power stronger.
- **Tags.** Every power has one of six tags (Set-up, Burst, Guard, Reach, Surge, Mend). If the party holds **4** or **8** powers of one tag, it gains a **Resonance** bonus.

### 7.1 Using Active Powers

- **Cost.** An active power costs the **MP** and **actions** it lists. **Innate** powers cost 0 MP.
- **Free** powers cost no action (one per turn). **Reaction** powers cost 1 action on someone else's turn, once per round.
- **Attacking powers** roll **weapon dice**. The **first die** decides miss and crit like a basic attack; the others add to the damage. Add your key stat once. DEF applies as usual unless the power says otherwise.
- **Saves.** A power that forces an effect names a save. If it names none, it just works.
- **Upcast.** Spend up to **2 extra MP**: +1 weapon die per MP on an attacking power, or +1 per MP to a push, pull or shield.
- **Combat only.** Powers are used in battle. Outside battle, heroes use class options (1.3).

**Passive powers** trigger at most **once per round** unless they say "each time". If two trigger together, you choose the order.

**Reading a power:**

| Power | R | Tag | MP | Actions | Range | Effect |
|---|---|---|---|---|---|---|
| **Tide of Iron** | C | Set-up | 1 | 1 | 1 | Attack. On a hit, push the foe 1 tile (2 on a crit) and step into its tile. It is **staggered** and **marked**. |
| **Coup de Grâce** | R | Burst | — | passive | — | Your crits against a **staggered** foe deal **double damage**. |

---

## 8. Optional Rules

- **Gritty.** A hero dies on the **third** Down instead of the fourth.
- **Shifting order.** Roll initiative again every round.
- **Simple turns.** Each creature gets one move and one action. Defend is free, once per round. No rushed attacks.
- **Auto-defend.** Heroes roll DEF automatically against every hit, at no cost.
- **Lean rewards.** Rewards come only from elites and bosses, as in the old level-up game; normal battles give gold and Victories only.

---

## Glossary

| Term | Meaning |
|---|---|
| **Action** | One of your 3 per turn; reactions spend them too (3.3) |
| **Advantage / disadvantage** | Roll extra dice, keep the best or worst; net capped at 3 (1.4) |
| **ATK** | Weapon die + key stat (3.5) |
| **Bloodied** | At or below half HP (2.3) |
| **Chain / Link** | Power keywords: the hero before you in the order / allies around you (Heroes) |
| **Class option** | An event choice only a party with that class can pick (1.3) |
| **Combo** | Cashing in another hero's set-up: +2 MP each (3.8) |
| **Companion** | An animal ally that acts on its owner's turn (3.13) |
| **Critical hit** | The weapon die shows its maximum: explodes and ignores DEF (3.5) |
| **DEF** | Armour's defence die, rolled when you Defend (3.6) |
| **Down** | At 0 HP; gain a Wound (2.4) |
| **Free strike** | A basic attack against a foe that leaves your side (3.6) |
| **Group check** | Every hero rolls; half must succeed (1.3) |
| **HD (⚅)** | Hit die: sets HP and heals; a pool of 3 (2.1) |
| **Key stat** | The attribute your class adds to attacks (3.5) |
| **Ladder** | Move a die one step up or down d4 → d20 (1.1) |
| **Malice (◆)** | The foes' shared resource (Bestiary) |
| **MP** | Momentum: pays for active powers (3.7) |
| **Passive power** | A power that is always on or triggers by itself (7) |
| **Power** | Anything a hero learns: active (MP and actions) or passive; picked as a reward or drafted, into slots (7) |
| **Reaction** | An action taken on someone else's turn; costs 1 action (3.6) |
| **Resonance** | A party bonus for holding 4 or 8 powers of one tag (7) |
| **Rune** | A weapon upgrade from the smith (Heroes) |
| **Role** | How a foe fights: Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader (Bestiary) |
| **Save** | A check to resist an effect (1.5) |
| **Set-up** | A condition for another hero to cash in (3.8) |
| **Shield** | Temporary HP (2.2); a carried shield gives Defend advantage (6.2) |
| **SPD** | Tiles per Move (3.1) |
| **Victory** | A win since the last Camp: starting MP (4.2) |
| **Boon** | A gift or bargain chosen at the start of a run (4.9) |
| **Chronicle** | What carries over between runs: totals, score, unlocked relics (4.10) |
| **Dread** | The difficulty ladder unlocked by winning (4.10) |
| **Reward** | After each battle won: pick 1 of 3 cards, a power for one hero or growth (4.2) |
| **Growth** | A reward card: Vigor (+1½ hit dice of max HP) or Training (+1 key stat) (4.2) |
| **Wound** | −1 to checks, saves and attacks (max −3); the fourth Down kills (2.4) |
