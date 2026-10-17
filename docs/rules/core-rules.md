---
title: Rogue Tactics 1e — Core Rules
version: 0.26
book: 1 of 3 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics]
---

# Rogue Tactics 1e — Core Rules

> v 0.26 "Damage × Mult". Book 1 of 3. The other books are [Heroes](heroes.md) and [Bestiary](bestiary.md). Why the rules are the way they are, and what is still open, is in [Design Notes](design-notes.md). Numbers marked **TBC** are first guesses waiting for playtesting.

---

## Start Here

**Rogue Tactics** is a phone-first roguelite tactics game: Fire Emblem meets Balatro and Slay the Spire. You lead **four heroes** across **three regions**. Each region is a map of battles, events, shops and camps that ends in a boss. Beat all three bosses to win. If every hero is Down at once, the run ends.

The whole game runs on two dice rules:

> [!important] The two dice rules
> **To hurt something,** roll your dice: every hit is **DAMAGE × MULT**. **DAMAGE** is the dice plus flat bonuses, minus the foe's **armour**; attributes add nothing. **MULT** starts at **1** and gains **+1 for every die that lands on its top number** (a **crit**), plus any **Mult** set up on the foe. There are **no misses**. (3.5)
>
> **To do anything risky out of battle,** roll the **die for the attribute**. **4 or more succeeds.** Advantage and disadvantage are the only way to make it easier or harder. (1.3)
>
> Everything else is built on these, plus **laddering**: moving a die up or down **d4 → d6 → d8 → d10 → d12 → d20** (in battle, powers ladder the weapon die along **d2 → d4 → d6 → d8 → d10 → d12**).

In battle every effect is **one visible number**: the dice show blue for damage and red for crits, and each status carries its number on the foe's badge. There is no advantage, no disadvantage and no saving throw in battle.

### The Books

| Book | What is in it | When to read it |
|---|---|---|
| **Core Rules** (this book) | How to play | Chapters 1 to 3 before your first battle |
| **Heroes** | The classes, their powers, and weapon upgrades | When you pick your party, and whenever you draft or upgrade |
| **Bestiary** | Foes, bosses, encounters | When you build the game's content |
| **Design Notes** | Reasons, history, open questions | Designers only |

**New player?** Take the **default party** (rogue, fighter, wizard, cleric) from the Heroes book, read chapters 1 to 3, and play. Chapter 5 (making your own hero) can wait.

### How to Win Fights

- **Set up, then cash in.** The wizard gives foes **Mult**, the cleric gives friends **Bless**, the fighter **Stuns** foes. Another hero's hit cashes it in for a **combo** (3.8).
- **Stack the Mult.** Mult adds up: two Hexes on one foe and a crit is ×6. Give the big hit to the hero with the most damage.
- **Spend momentum.** MP is lost when the battle ends (3.7).
- **Watch the order.** The turn order is on screen. Deal with the foe that acts next, and set up foes for the hero who acts before them.
- **Count your actions.** Defending and other reactions spend actions you would otherwise use on your turn (3.3).
- **Mind your wounds.** Every time a hero goes Down they take a Wound, and the fourth Down kills them (2.4).

---

## 1. Dice and Checks

### 1.1 Dice

The game uses **d2** (a coin, for a few honed weapons), **d4, d6, d8, d10, d12 and d20**.

- **Ladder.** To ladder a die **up**, move it one step along d4 → d6 → d8 → d10 → d12 → d20. To ladder it **down**, move it one step back. Weapons, armour and hit dice improve this way. A few special weapons go one step below d4, to a **d2** (Heroes book). In battle, **powers** ladder the weapon die along **d2 · d4 · d6 · d8 · d10 · d12** (▲ up, ▼ down, stopping at the ends): bigger dice hit harder, smaller dice crit more often (3.5).
- **Explode** (checks out of battle only). When a check die shows its **maximum**, roll it again and add the new result. **No die explodes in battle**: damage, Defend, healing and initiative dice are rolled once.

### 1.2 Attributes

Every creature has four **attributes**:

| Icon | Attribute | What it means | Used for |
|---|---|---|---|
| ♜ | **STR** Strength | Power, toughness | Key stat of the fighter; Catch Breath healing (2.5); carrying (5.3) |
| ➶ | **DEX** Dexterity | Speed, agility | Key stat of the rogue; initiative (3.2) |
| ✦ | **INT** Intelligence | Learning, reasoning | Key stat of the wizard |
| ♛ | **PRE** Presence | Awareness, will, charm | Key stat of the cleric |

An attribute is a number. The number sets its die:

| Attribute | 0 | 1 | 2 | 3 | 4 | 5 | 6 (buff only) |
|---|---|---|---|---|---|---|---|
| **Die** | d4 with disadvantage | d4 | d6 | d8 | d10 | d12 | d20, never critically fails |

- Starting heroes have attributes of **1 to 4**. A **5** comes from items. (Training rewards add damage, not attributes, since v0.26.)
- A **6** only happens when a buff raises a 5. It is always temporary.
- **Attributes add nothing in battle** (since v0.26). They are rolled for checks out of battle and for initiative (DEX), and STR adds to Catch Breath. A hero's damage comes from the weapon, the power and flat bonuses (3.5).

### 1.3 Checks

When a hero tries something risky **out of battle**, the game names an **attribute** and the hero rolls its die.

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

*Out of battle only* (checks, dramatic tasks, negotiations). Good circumstances give **advantage**. Bad ones give **disadvantage**. They **stack**:

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

In battle there is no advantage or disadvantage: what used to give it now gives **Mult**, **Bless** or a **×** multiplier (3.5).

### 1.5 Saves

*Out of battle only.* When something acts on you outside a battle (a trap, a curse in an event), you may make a **save**: a check with the attribute the effect names. Success avoids the effect, or softens it if the effect says so. A critical failure on a save has no extra effect unless the effect says so.

**In battle there are no saves.** Effects simply happen: a slammed foe is Stunned, a Hex gives Mult, a web Roots. Bosses shrug off some effects instead (3.10).

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

A **shield** is temporary HP. Damage takes it off first. **Shields add up**: a new shield is added to the one you have. A shield **fades at the start of its owner's next turn** (a hero's shield from before the battle, such as the Bulwark Sigil's, lasts through their first turn).

*(A shield is not the same as the shield you carry, which adds +2 to your Defend roll, 3.6.)*

### 2.3 Bloodied

A creature is **bloodied** while its HP is **at or below half** its maximum. Bloodied does nothing by itself. Other rules look for it: a boss changes phase, *Finisher* and the Executioner's Hood give +1 Mult, a foe turns savage. The screen marks it on the HP bar.

### 2.4 Down, Wounds and Death

- **Down.** A hero at **0 HP** is Down. They cannot act, and foes ignore them. They gain **1 Wound**.
- **Getting up.** An adjacent ally can spend an action to **Help up** a Down hero, who stands with HP equal to **one roll of their hit die** (not spent from the pool). Any healing also stands them up. When the party **wins** a battle, every Down hero stands up with **1 HP**.
- **Wounds.** Each Wound gives **−1 damage** on every hit the hero makes (3.5) and **−1** to the total of every **check** out of battle, to a maximum of **−3**. A hit still deals at least 1 damage. Wounds do not affect Defend rolls, initiative or hit dice.
- **Death.** A hero who goes Down **with 3 Wounds already** dies for good. In other words, a hero can survive three Downs; the **fourth Down** before their Wounds heal kills them.
- **Removing Wounds.** Each **Camp** removes 1 Wound from every hero, and gold can buy one more (4.7).
- **Defeat.** If **every** hero is Down at the same time, the battle is lost and the run ends.

### 2.5 Healing

| Way to heal | When | How much |
|---|---|---|
| **Second Wind** | In battle, **once per battle**, 1 action | Spend one hit die: roll it and add **3**. |
| **Catch Breath** | Any time **outside** battle | Spend any number of hit dice. For each, roll it and add your **STR** (out of battle, attributes still count). |
| **Healing potion** | 1 action | Roll **2 of your hit dice** (not spent from the pool). |
| **Healing power** | As the power says | As the power says (Heroes book). |
| **Camp** | At a Camp stop | Spends your remaining hit dice, then restores the pool (4.7). |

Healing dice are **green** on screen. Healing never raises HP above the maximum.

---

## 3. Combat

### 3.1 The Battlefield

Battles are fought on a grid of square tiles, **6 wide and 8 tall** (a phone held upright).

- **One creature per tile.** Large creatures fill 2×2 tiles.
- **Movement is orthogonal**: up, down, left, right. Each tile costs 1 SPD. You can move through allies, but not through foes or obstacles, and you cannot stop on an occupied tile.
- **Distance** is counted in orthogonal steps. A diagonal tile is at distance 2. "**Beside**" means orthogonally adjacent.
- **Speed (SPD)** is how many tiles one Move action covers. Each class has its own (Heroes book).

**Obstacles and terrain.**

| Obstacle | Examples | Effect |
|---|---|---|
| **Tall** | Boulder, tree, pillar, wall | Blocks movement and sight. |
| **Low** | Crates, low wall, gravestone | Blocks movement. |
| **High ground** | Raised ground | Ranged attacks and powers from it reach 1 tile further. |
| **Difficult terrain** | Water, brambles, rubble, ash | Costs 2 SPD to enter. Water puts out Burn. |

**Hazards.** A creature suffers a hazard when it **enters it** (even when pushed or pulled in) or **ends its turn in it**. Hazard damage is **flat**, ignores armour and Defend, and grows by the region (+0 in region I, +1 in II, +2 in III). There is no save. Foes avoid hazards unless they are pushed.

| Hazard | Damage | Status |
|---|---|---|
| **Fire** | 3 | Burn 1 |
| **Acid pool** | 3 | Weak |
| **Lava** | 8 | Burn 2 |
| **Snare** (hidden; only the trapper's enemies trigger it, once) | 4 | Root |
| **Web** (once, then it tears) | 0 | Root |

### 3.2 Starting a Battle

1. **Initiative.** Every creature rolls its **DEX die** once. Turns go from **highest to lowest** and the order **stays the same all battle**. Ties go to the higher DEX, then to heroes. Minions and swarms of one type share a roll. (The Hourglass of Haste lets heroes roll twice and keep the higher.)
2. **Hidden foes.** Some foes (lurkers) start **hidden** (3.5).

**Rounds and turns.** A **turn** is one creature's go. A **round** is one pass through the whole order.

### 3.3 Your Turn

At the **start of your turn** you get **3 actions**. Spend them on the actions in 3.4, in any order. You do not have to use them all.

- **Keep actions ready.** Actions you don't spend stay **ready** until your next turn starts. Each ready action can pay for one **reaction** (3.6) on someone else's turn, such as **Defend**.
- **Your actions refill at the start of your next turn**: back to 3, however many you spent or kept. Ready actions you didn't use are not added on.
- **At the start of a battle**, before their first turn, every hero has **1 ready action**.
- **Free powers** and passive powers cost no action.
- A **Stunned** hero has **1 fewer action** on their turn, half SPD, and cannot react (3.10).
- **Attack as often as you like.** A basic attack costs 1 action and no MP, and you may make it as many times as you have actions.

> **Why?** Keeping an action back is the one defensive choice every hero has. Spend all three to press the attack, or keep one or two to Defend when the foes strike back.

### 3.4 Actions

Each action costs **1 action** unless it says otherwise.

| Action | What it does |
|---|---|
| **Move** | Move up to your **SPD** (3.1). You may split the move around other actions in the same turn. |
| **Attack** | A **basic attack** with your weapon (3.5). Any number of times. The **first** each turn gives **+1 MP** (3.7). |
| **Power** | Use a power (chapter 7). It costs **MP**, and the number of actions the power lists. |
| **Use an item** | Drink or give a potion (to yourself or an adjacent ally), or throw a consumable. |
| **Help up** | An adjacent Down ally stands up (2.4). |
| **Second Wind** | Once per battle: heal (2.5). |

Every foe's stats, statuses and next move (**INTENT**) are always shown when you tap it.

### 3.5 Attacking: DAMAGE × MULT

Every hit, by hero or foe, is **DAMAGE × MULT** (the total), then any **×** multipliers, rounded, **at least 1** (0 if the target is immune). There are **no misses**: every attack hits its target.

**DAMAGE** (blue) for a hero:

1. **Roll the dice.** A basic attack rolls **one weapon die**. A power rolls the weapon die with its **modifiers**: a ladder step (▲ up, ▼ down along d2 · d4 · d6 · d8 · d10 · d12), how many dice, how many hits (Heroes book, 2.2.1). A **pair** weapon (twinblades, needles) rolls **one more**. Add them up.
2. **+ flat bonuses:** the power's **+N damage**, **Bless N** (+N, then it is spent), **Training** (+1 per reward, up to +4), *Opening Strike* (+3 on your first attack each battle), *Brutal* (+3 on a crit), weapon bonuses, the Dwarven Whetstone (+1).
3. **− Wounds** (−1 each, up to −3).
4. **− the foe's armour**, a flat number (Bestiary). *Piercing Strike* ignores it. Armour never takes the damage below **1**.

**Attributes add nothing in battle.** Your STR, DEX, INT and PRE are for checks out of battle and initiative only (1.2).

**MULT** (red) for a hero starts at **1**, then:

| Source | Mult |
|---|---|
| Each die on its **top number** (a **crit**; *Keen* widens it to one below) | **+1** each (**+1 more** each with *Heavy Hitter*, *Precision* or a *Vicious* weapon) |
| The power's **+N Mult** (*Shadowstep* +1), or its **Crit: +N Mult** if a die crits (*Quick Stab* +2) | +N |
| *Opening Strike*, on your first attack each battle | +1 |
| *Loaded Bones* relic, if at least one die crits | +1 |
| The target's **Mult** status (3.10), spent by this hit | +N (*Backstab*: +2N) |
| **Sneak Attack** (rogue): an ally of hers is beside the target | +1 |
| *Finisher* or the *Executioner's Hood*, against a **bloodied** foe | +1 each |
| Attacking while **hidden** | +1 |
| *Glass Cannon* | +1 |

**× multipliers** apply last:

| Multiplier | When |
|---|---|
| **×2** | The target is **weak** to the damage type (3.11), or *Shatter*: an ally's hit on a foe the wizard Rooted |
| **×3** | *Assassinate* against a **Stunned** foe |
| **×½** | The target **resists** the damage type, or the attacker is **Weak** |
| **×0** | The target is **immune** to the damage type |

**Foes** work the same way (Bestiary): their DAMAGE is their dice plus their bonus (and its growth with depth), plus +2 for *Savage* against a bloodied hero and +2 near an *Aura* foe. MULT is 1 + crits + *Pack* (+1) + *Bloodlust* or *Rally the Horde* (+1 this round) + hidden (+1). Their ×½s are **Weak**, **Taunted** (hitting anyone but the taunter) and the **Warding Charm** (the first hit from each foe on each hero each battle). A foe's hit on a hero can then be **Defended** (3.6).

> **Example.** Vex with Twinblades (a pair of d4s) Backstabs a goblin (no armour) with **Mult 2** from Orin's Hex, while Brakka stands beside it. She rolls 4 and 2: DAMAGE = 4 + 2 = **6** (her DEX adds nothing). MULT = 1 + 1 (the 4 is a crit) + 4 (Mult 2, doubled by Backstab) + 1 (Sneak Attack) = **7**. The hit deals **42**, and it is a combo: Vex and Orin gain 2 MP each.

**The dice on screen.** Every die is the same size, and its colour says what it does: **blue** dice add damage; a die on its top number turns **red** and glows (+1 Mult); **steel** dice Defend or shield; **green** dice heal. The caption reads the sum out: "6 +2 Hook Chain −1 armour = 7 DAMAGE × 2 MULT = 14".

**Melee and range.** **Range 1 is melee**: the target must be orthogonally beside you. Anything more is **ranged**, and needs a line of sight past tall obstacles.

**Hiding.** A **hidden** creature cannot be targeted at range (only from beside it). Its next hit gets **+1 Mult**, and then it is revealed. Some foes start hidden.

### 3.6 Defending and Reactions

A **reaction** happens on someone else's turn. It costs **1 ready action** (3.3), and you cannot react with none. **Reactions are always a choice**: when one is possible, the game pauses and asks. Stunned heroes cannot react.

| Reaction | When | Effect | Limit |
|---|---|---|---|
| **Defend** (every hero) | A foe's hit that is **not a crit** lands on you (the game asks for hits of 2 or more) | Roll your **armour die** and subtract it, plus bonuses, from the damage (at least **1** damage is left). | Any number, while you have ready actions |
| **Reaction powers** | As the power says (Heroes book) | **Intercept**, **Sentinel** (fighter), **Opportunist**, **Counterattack** (rogue), **Repelling Ward** (wizard), **Warding Word** (cleric) | Once per round each |

**The Defend roll** (steel dice):

| Hero | Armour die |
|---|---|
| Fighter (heavy armour) | d8 |
| Cleric (medium armour) | d6 |
| Rogue (light armour), Wizard (none) | d4 |

| Bonus | When |
|---|---|
| **+2 shield** | The fighter and the cleric carry a shield (not with a two-handed weapon). |
| **+2 Block** | An ally with *Block* stands beside you. |
| **+2 Brace** | You have *Brace* (once a round). |

A hero with *Glass Cannon* cannot Defend. New heroes know only **Defend**; reaction powers are Uncommon and turn up as rewards.

**When a hero is hit,** reactions happen in this order: Intercept, then Defend, then Warding Word (halves a hit of 4 or more).

**No free strikes.** Moving away from an enemy is safe: neither heroes nor foes get a free attack when someone leaves their side. (A fighter with the **Sentinel** reaction power may spend a ready action to strike a foe leaving her side.) Enemies still block movement.

### 3.7 Momentum (MP)

**Momentum** pays for powers. Each hero has their own.

- **Start of battle:** each hero starts with **MP equal to the party's Victories, up to 3** (4.2). *Eager* adds 1; together they are capped at **5 MP**. The Battle Hymn (+2) and Crown of Thorns (+3) relics add on top.
- **+1 MP** for your **first** basic attack each turn (the Tactician's Map adds 1 more).
- **+2 MP** for each **combo** (3.8), for the hero who cashes it in and for each hero who set it up.
- **Maximum 10 MP.** All MP is lost when the battle ends.

### 3.8 Set-ups and Combos

A **set-up** is a status one hero puts on a creature so that **another** hero can cash it in. Cashing in someone else's set-up is a **combo**. You never cash in your own set-up.

| Set-up | Usually made by | How | The payoff |
|---|---|---|---|
| **Mult N** on a foe | Wizard (*Staff Bolt*, *Hex*, *Chain Hex*, *Ray of Frost* crits), cleric (*Brand*) | A power or a basic attack that gives Mult | The **next hero hit** on it adds **N** to its MULT. Then it is spent. |
| **Stunned** foe | Fighter (slams, *Earthshaker*, *Tide of Iron* and *Crushing Blow* crits), wizard (*Force Push* slams) | A **slam** (3.9) or a power that Stuns | It **skips its next turn**. Hitting it does not end the Stun. *Assassinate* deals ×3 to it. |
| **Bless N** on a hero | Cleric (*Guidance*, *Bless*, *Smite* crits) | A blessing power | **+N damage** on that hero's **next hit**. Then it is spent. |

- **A combo** is a hit that uses another hero's Mult on the target, hits a foe another hero Stunned, or spends another hero's Bless. The hero who cashes in and each hero who set it up gain **+2 MP**. One combo per action at most.
- A foe that just **lost a turn** to a Stun is **steady**: it cannot be Stunned again until after its next turn.
- A **boss** cannot be Stunned. A Stun gives it **+2 Mult** instead.

### 3.9 Forced Movement

Powers can **push** a creature straight away from the source or **pull** it straight toward the source, a number of tiles.

- **Slam.** A creature **pushed** into an obstacle, the edge or another creature stops and takes **slam damage: one roll of the weapon die of whoever moved it** (a foe uses its attack die; effects with no weapon use a d4). A creature it hits takes the same. Slam damage ignores armour. **A slam Stuns** the creature that was moved. A pull never slams.
- Forced movement **without** a slam does not Stun unless the power says so.
- **Steadfast N.** Pushes and pulls move a Steadfast N creature **N tiles fewer**.
- **Into a hazard.** The creature suffers it (3.1).

### 3.10 Statuses

Each status is one number or one word, shown on the creature's badge.

| Status | Effect | How long |
|---|---|---|
| **Mult N** | The next **hero** hit on it adds **N** to that hit's MULT. Stacks (Hex twice is Mult 4). | Until a hero hits it |
| **Bless N** | **+N damage** on the hero's next hit. Stacks. | Until the hero hits |
| **Burn N** | Takes **N damage** at the start of each of its turns (ignores armour), then N drops by 1. Stacks. Water puts it out. Fireproof creatures are immune. | Until N reaches 0 |
| **Stunned** | A **foe** skips its next turn. A **hero** has 1 fewer action on their next turn. Either way: half SPD and no reactions. A boss gains **+2 Mult** instead. | Until the end of its next turn |
| **Rooted** | Cannot move. It can still attack. Bosses are immune. | Until the end of its next turn |
| **Weak** | Deals **half damage**. | Until the end of its next turn |
| **Taunted** | Must attack whoever taunted it if it can reach them, and deals **half damage** to anyone else. | Until the end of its next turn |
| **Shield** | Temporary HP (2.2). | Until the start of its next turn |
| **Hidden** | See 3.5. | Until it attacks or is hit |

Timed statuses applied on the creature's own turn last one turn more. Older names still met in places map onto these: **dazed → Stunned**, **slowed → Rooted**, **exposed → Mult**, **bleeding → Burn**, **frightened → Weak**.

### 3.11 Damage Types

Damage is **physical** unless something says otherwise. The other types are **fire**, **cold**, **force**, **radiant**, **necrotic** and **poison**.

A creature can be **weak**, **resistant** or **immune** to a type. It is a **×** multiplier on the hit (3.5):

- **Weak:** ×2.
- **Resist:** ×½ (the hit still deals at least 1).
- **Immune:** no damage, and no Burn (fire).

Undead are weak to radiant and immune to poison and necrotic; incorporeal foes resist physical damage. Flat damage from minions and swarms ignores resistance.

### 3.12 Foes

Foes use the same rules as heroes, with a few differences (full rules in the Bestiary):

- A foe's turn is a **move and an action** (an attack or a special ability). Its stat block may list more.
- Foes have **flat armour**, taken off the damage of every hero hit. They do not Defend and do not spend actions on reactions.
- **Minions** have 1 HP and deal flat damage; they never roll. **Swarms** share one HP pool and take double damage from area attacks.
- **Bosses** cannot be Stunned (they take +2 Mult) or Rooted.
- Foes share a pool of **Malice (◆)**, which pays for their threats and special abilities.
- Each foe has a **role** (Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader) that tells you how it moves and whom it attacks.

### 3.13 Companions

> [!note] Companions are parked (since v0.25). The rules below (a wolf, a hawk, a mule) are not in the game, and their tricks were written with saves and advantage; they will be rewritten in Damage × Mult terms if companions return.

A hero may have **one companion** from a class feature, relic or shop. A companion has **HP**, **SPD**, **flat damage** (it never rolls) and one **trick**; no Defend, no hit dice and no reactions. It acts **on its owner's turn at no action cost**. At 0 HP it is **Down** until the next Camp; it never dies. It counts as an ally for Sneak Attack and set-ups.

| Companion | HP | SPD | Damage |
|---|---|---|---|
| **Wolf** | 10 | 5 | 2 |
| **Hawk** | 6 | 6 | 1 |
| **Mule** | 14 | 3 | 1 |

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

- Each card is either a **power for one hero** (the card names the hero; the three cards go to different heroes where possible), or a **growth card** (each card has a 30% chance, at most one per pick, so about two picks in three hold one; never in elite or boss picks). A growth card is Training about a third of the time, while the hero's Training is below +4:

| Growth | Effect |
|---|---|
| **Vigor** | The hero gains max HP equal to **1½ × their hit die's maximum** (d10: +15), and heals that much now. |
| **Training** | **+1 damage on every hit** the hero makes, up to **+4**. (Before v0.26 it was +1 key stat.) |

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
| 1 | **Ambush** | A short battle: a horde of minions and one foe. |
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

1. **Choose a class** (Heroes book). It sets your key stat, hit die, armour die, weapon, innate powers and class powers.
2. **Set your attributes** from one spread (5.2). Put the highest in your key stat.
3. **Take your class's starting gear.** The fighter and the cleric start with a shield.
4. **Work out your stats** (5.3).
5. **Take your class's starting power** (Heroes book).
6. **Name your hero.**

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
| **SPD** | Your class's speed (Heroes book) |
| **Initiative** | Your DEX die |
| **Hit** | DAMAGE: weapon dice + flat bonuses (Training); MULT: 1 + crits (3.5) |
| **Defend** | Your armour die; +2 with a carried shield (3.6) |
| **Pack slots** | 2 + STR |

### 5.4 Growing Stronger

Heroes do not level up (4.2). A hero starts with their class features (Heroes book) and grows only through **rewards**: new powers, **Vigor** (max HP) and **Training** (+1 damage on every hit, up to +4), and through weapons, relics and the smith.

### 5.5 Powers

Everything a hero learns during a run is a **power**, active or passive (chapter 7). A new hero has a basic attack, their innate powers and one class power.

---

## 6. Equipment

### 6.1 Proficiency and Hands

- Each class is proficient with some **weapon groups**: **Light**, **Martial**, **Ranged** and **Focus**. Anyone can use any weapon, but a weapon you are **not proficient** with **cannot crit** (its dice never add Mult).
- **Armour** needs **STR**, not proficiency: **medium needs STR 2**, **heavy needs STR 3**.
- A **two-handed** weapon cannot be used with a shield.
- Once per round you may swap one weapon or shield at no cost.

### 6.2 Armour and Shields

| Armour | Defend die | Needs | Cost |
|---|---|---|---|
| None | d4 | — | — |
| Leather (light) | d4 | — | 30 gold |
| Chain (medium) | d6 | STR 2 | 100 gold |
| Plate (heavy) | d8 | STR 3 | 300 gold |
| **Shield** | **+2** to your Defend rolls | one hand | 20 gold |

Magic armour can ladder the die up to **d10** or **d12**.

### 6.3 Weapons

The weapons in the game, by class and tier, are listed in the Heroes book (Part 3). This is the wider tabletop list.

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
| Arcane Staff | Focus | d4 | 4 | | 30 |
| Thorn Staff | Focus | d6 | 4 | No crits | 30 |
| Unarmed | — | d4 | 1 | | — |

Costs are in gold (**TBC**). A better weapon is usually one ladder step up.

| Property | Meaning |
|---|---|
| **Light** | Can be held in the off hand. Light weapons can be honed down to a **d2** (Heroes book). |
| **Pair** | Two weapons sold as one: every attack rolls **one more die**. |
| **Two-handed** | Needs both hands. No shield (no +2 on Defend). |
| **Reach N** | Melee attack at range N, in a straight line. |
| **Thrown N** | Can be thrown at range N; picked up again after the battle. |
| **Load** | Needs 1 action to reload after each shot. |
| **STR N** | Needs STR N. |
| **No crits** | A top number is just a number: it adds no Mult. |

**Upgrades.** A smith can ladder a weapon's die up (*temper*) or down (*hone*), and inscribe **runes** such as Keen, Vicious, Flame or Thunder. Magic weapons come with runes. See the Heroes book, Part 3.

### 6.4 Consumables

Each consumable takes **1 pack slot** (5.3). *(Not in the v0.26 game: the shop sells Bandages and Rations instead.)*

| Item | Effect (1 action) | Cost |
|---|---|---|
| **Healing potion** | Heal 2 of your hit dice (not spent) | 50 |
| **Greater healing potion** | Heal 4 of your hit dice (not spent) | 150 |
| **Antidote** | End Burn | 30 |
| **Fire flask** | Range 3: d6 fire damage | 40 |

### 6.5 Relics

**Relics** change the rules for the whole party. The party can carry any number, but only **two are active**. Swap them at a Camp or before a battle. Relics do not take pack slots.

> **Pouch of Fate Tokens** · relic
> At the start of each battle and each event, the party gets **3 fate tokens**. Unused tokens are lost. Any hero may spend one at any time, at no action cost, to:
> - **Reroll** a die they just rolled (a hit, a check or a Defend), keeping the new result; or
> - **Shake it off:** end one status on themselves.

**Other relics.** Boots of Striding (+1 SPD for every hero), Dwarven Whetstone (**+1 damage** on every hero hit), Heart of the Oak (+8 max HP), Battle Hymn (+2 starting MP), Tactician's Map (the first basic attack each turn gives +1 more MP), Phoenix Feather (the first hero Down each battle rises at half HP), Vampire Fang (heal 4 on a kill), Bulwark Sigil (start each battle with 8 shield), Loaded Bones (**+1 Mult** on a hero hit with at least one crit), Sentinel Lens (+3 damage on hero reaction hits), Warding Charm (each foe's first hit on each hero each battle deals **half damage**), Salamander Scale (heroes ignore fire and lava damage and cannot Burn), Gauntlet of Force (+1 to hero pushes and pulls), Fenwalker Boots (ignore difficult terrain), Hourglass of Haste (better initiative), Lucky Coin (+50% gold), Healer's Satchel (heal 15% after each battle).

**Unlocked relics** (4.10): War Drum (+1 MP to the hero who cashes in a combo), Scholar's Tome (picks and drafts show 4 cards), Camp Kettle (+1 hit die; Camps remove 2 Wounds), Merchant's Seal (merchants and the smith charge 25% less), Executioner's Hood (**+1 Mult** on hero hits against bloodied foes), Ember Censer (every foe but a boss starts each battle with **Burn 3**), Mender's Thread (Second Wind twice a battle), Crown of Thorns (+3 starting MP; foes gain 2 more Malice each round), Blood Chalice (when a hero goes Down, every other hero gains 2 MP).

---

## 7. Powers

A **power** is anything a hero learns during a run. The full rules, every class's powers, the general powers, and weapon upgrades are in the **Heroes** book.

- **Two kinds.** An **active** power is used on your turn and costs **MP** and **actions**. A **passive** power is always on, or triggers by itself, and costs nothing.
- **Two lists.** **Class powers** are on each class page; **general powers** can be taken by any class. Every hero also has **innate** powers that take no slot: their **basic attack**, **Second Wind** and **Help Up**, plus the fighter's **Shove**, the wizard's **Force Push** and the cleric's **Guidance**.
- **Slots, rewards and drafts.** A hero has **8** power slots. Most powers come from **rewards** after each fight (4.2). A **draft** is a pick of 3 powers for one hero, from boons, Treasure, Training at a Camp and some events. Shops sell powers.
- **Every effect is one number.** An attacking power is the **weapon die** with standard **modifiers** shown as one line on its card: a ladder step ▲/▼, how many dice and hits, **+N damage**, **+N Mult**, and **Crit:** triggers (Stun, Root, Burn, Mult, Bless, an action back…). Other powers give a foe **Mult**, give an ally **Bless**, **Stun**, **Root** or **Burn**, or add a **×** to a hit. Upgrading your weapon makes every attacking power stronger.
- **Tags.** Every class and general power has one of six tags (Set-up, Burst, Guard, Reach, Surge, Mend). Since v0.25 tags only group powers; the old Resonance bonuses are retired.

### 7.1 Using Active Powers

- **Cost.** An active power costs the **MP** and **actions** it lists (1 action unless it says 2). **Innate** powers cost 0 MP.
- **Free** powers cost no action. **Reaction** powers cost 1 ready action on someone else's turn, once per round each.
- **Attacking powers** roll their **weapon dice** (a pair weapon adds one), laddered and changed by their modifiers, then DAMAGE × MULT exactly like a basic attack (3.5). Attributes add nothing. Armour applies unless the power says otherwise.
- **No saves.** A power's effects simply happen on every target it hits.
- **Combat only.** Powers are used in battle. Outside battle, heroes use class options (1.3).

**Reading a power:**

| Power | R | Tag | MP | Actions | Range | Modifiers | Effect |
|---|---|---|---|---|---|---|---|
| **Tide of Iron** | C | Set-up | 1 | 1 | 1 | d8 ▲ from d6 · Crit: Stun | Push the foe 1 and step after it. It is Taunted. A slam Stuns it. |
| **Anvil** | U | Set-up | — | passive | — | — | When you Stun a foe, it also gains +2 Mult. Once a round, a foe you push next to an ally takes a free hit from them. |

The **Modifiers** line is worked out for the hero's weapon (here Brakka's d6 Longsword, laddered up one step). "Crit:" effects happen when at least one die of the hit crits.

---

## 8. Optional Rules

- **Gritty.** A hero dies on the **third** Down instead of the fourth.
- **Shifting order.** Roll initiative again every round.
- **Simple turns.** Each creature gets one move and one action. Defend is free, once per round.
- **Free strikes.** Leaving a tile next to an enemy for one that is not lets it make a basic attack against you (the rule before v0.24).
- **Auto-defend.** Heroes roll their Defend die automatically against every non-crit hit, at no cost.
- **Lean rewards.** Rewards come only from elites and bosses, as in the old level-up game; normal battles give gold and Victories only.

---

## Glossary

| Term | Meaning |
|---|---|
| **Action** | One of your 3 per turn; reactions spend them too (3.3) |
| **Advantage / disadvantage** | Out of battle only: roll extra dice, keep the best or worst; net capped at 3 (1.4) |
| **Armour** | A foe's flat number taken off the damage of every hero hit, to a minimum of 1 (3.5) |
| **Bless N** | +N damage on a hero's next hit (3.10) |
| **Bloodied** | At or below half HP (2.3) |
| **Burn N** | N damage at the start of its turn, then N drops by 1 (3.10) |
| **Class option** | An event choice only a party with that class can pick (1.3) |
| **Combo** | Cashing in another hero's set-up: +2 MP each (3.8) |
| **Companion** | An animal ally (parked since v0.25) (3.13) |
| **Crit** | A die on its top number: it turns red and adds +1 Mult; some powers add a "Crit:" effect (3.5) |
| **Damage** | The blue half of a hit: dice + flat bonuses − Wounds − armour, at least 1; then × MULT (3.5) |
| **Defend** | A reaction: roll your armour die and subtract it from a non-crit hit (3.6) |
| **Down** | At 0 HP; gain a Wound (2.4) |
| **Ready action** | An action kept from your turn; pays for one reaction before your next turn (3.3) |
| **Group check** | Every hero rolls; half must succeed (1.3) |
| **HD (⚅)** | Hit die: sets HP and heals; a pool of 3 (2.1) |
| **Key stat** | Your class's best attribute; it adds nothing in battle since v0.26 (1.2) |
| **Ladder** | Move a die one step up or down d4 → d20; powers ladder the weapon die d2 → d12 (▲/▼) (1.1) |
| **Malice (◆)** | The foes' shared resource (Bestiary) |
| **Mult** | The red half of a hit: 1 + crits + Mult status + other sources (3.5); also a status on a foe (3.10) |
| **MP** | Momentum: pays for active powers (3.7) |
| **Passive power** | A power that is always on or triggers by itself (7) |
| **Power** | Anything a hero learns: active (MP and actions) or passive; picked as a reward or drafted, into slots (7) |
| **Reaction** | An action taken on someone else's turn; costs 1 action (3.6) |
| **Rooted** | Can't move on its next turn (3.10) |
| **Rune** | A weapon upgrade from the smith (Heroes) |
| **Role** | How a foe fights: Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader (Bestiary) |
| **Save** | Out of battle only: a check to resist an effect (1.5) |
| **Set-up** | A status for another hero to cash in: Mult, Stun or Bless (3.8) |
| **Shield** | Temporary HP (2.2); a carried shield gives +2 to Defend (6.2) |
| **SPD** | Tiles per Move (3.1) |
| **Stunned** | A foe skips its next turn; a hero loses 1 action (3.10) |
| **Taunted** | Must attack the taunter; half damage to anyone else (3.10) |
| **Victory** | A win since the last Camp: starting MP (4.2) |
| **Boon** | A gift or bargain chosen at the start of a run (4.9) |
| **Chronicle** | What carries over between runs: totals, score, unlocked relics (4.10) |
| **Dread** | The difficulty ladder unlocked by winning (4.10) |
| **Reward** | After each battle won: pick 1 of 3 cards, a power for one hero or growth (4.2) |
| **Growth** | A reward card: Vigor (+1½ hit dice of max HP) or Training (+1 damage on every hit, up to +4) (4.2) |
| **Weak** | Deals half damage (3.10) |
| **Wound** | −1 damage on every hit and −1 to checks (max −3); the fourth Down kills (2.4) |
