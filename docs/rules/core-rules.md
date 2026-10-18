---
title: Rogue Tactics 1e — Core Rules
version: 0.27
book: 1 of 3 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics]
---

# Rogue Tactics 1e — Core Rules

> v 0.27 "Sides and Dice". Book 1 of 3. The other books are [Heroes](heroes.md) and [Bestiary](bestiary.md). Why the rules are the way they are, and what is still open, is in [Design Notes](design-notes.md). Numbers marked **TBC** are first guesses waiting for playtesting.

---

## Start Here

**Rogue Tactics** is a phone-first roguelite tactics game: Fire Emblem meets Balatro and Slay the Spire. You lead **four heroes** across **three regions**. Each region is a map of battles, events, shops and camps that ends in a boss. Beat all three bosses to win. If every hero is Down at once, the run ends.

The whole game runs on two dice rules:

> [!important] The two dice rules
> **To hurt something,** roll **MULT dice** and add them up. MULT is how many dice the hit rolls: the power's own dice, **plus one die for every different status on the target** (Burning, Stunned, Rooted, Weakened, Taunted). A die that lands on its **top number** is a **crit**: **roll one more**. Add flat bonuses, take off the foe's **armour**. There are **no misses**. (3.5)
>
> **To do anything risky out of battle,** roll the **die for the attribute**. **4 or more succeeds.** Advantage and disadvantage are the only way to make it easier or harder. (1.3)
>
> Everything else is built on these, plus **laddering**: moving a die up or down **d4 → d6 → d8 → d10 → d12 → d20** (in battle, powers ladder the weapon die along **d2 → d4 → d6 → d8 → d10 → d12**).

In battle every effect is **one visible thing**: a die more or less, a status word on the foe's badge, or a number of flat damage. The dice show blue for damage and red for crits. There is no advantage, no disadvantage and no saving throw in battle.

### The Books

| Book | What is in it | When to read it |
|---|---|---|
| **Core Rules** (this book) | How to play | Chapters 1 to 3 before your first battle |
| **Heroes** | The classes, their powers, and weapon upgrades | When you pick your party, and whenever you draft or upgrade |
| **Bestiary** | Foes, bosses, encounters | When you build the game's content |
| **Design Notes** | Reasons, history, open questions | Designers only |

**New player?** Take the **default party** (rogue, fighter, wizard, cleric) from the Heroes book, read chapters 1 to 3, and play. Chapter 5 (making your own hero) can wait.

### How to Win Fights

- **Set up, then cash in.** Every round all your heroes act before any foe (3.3). The wizard leaves foes **Burning**, **Rooted** or **Weakened**, the fighter **Stuns** and **Taunts** them, the cleric **Blesses** friends. Then the big hitter goes last, with a fistful of dice.
- **Stack different statuses.** Each different status on a foe is one more die on every hit it takes. A second Weaken adds nothing: a Burn, a Root and a Taunt add three.
- **Feed the cleric's momentum.** Momentum is one pool for the whole party (3.7). The cleric's support fills it, and every combo adds to it.
- **Spend momentum.** It is lost when the battle ends.
- **Use every action now.** Actions you don't use on the heroes' turn are lost; there are no reactions (3.6).
- **Mind your wounds.** Every time a hero goes Down they take a Wound, and the fourth Down kills them (2.4). Only the cleric heals in battle.

---

## 1. Dice and Checks

### 1.1 Dice

The game uses **d2** (a coin, for a few honed weapons), **d4, d6, d8, d10, d12 and d20**.

- **Ladder.** To ladder a die **up**, move it one step along d4 → d6 → d8 → d10 → d12 → d20. To ladder it **down**, move it one step back. Weapons and hit dice improve this way. A few special weapons go one step below d4, to a **d2** (Heroes book). In battle, **powers** ladder the weapon die along **d2 · d4 · d6 · d8 · d10 · d12** (▲ up, ▼ down, stopping at the ends): bigger dice hit harder, smaller dice crit more often (3.5).
- **Explode** (checks out of battle only). When a check die shows its **maximum**, roll it again and add the new result. **No die explodes in battle**: healing and initiative dice are rolled once. (A damage die on its top number is a **crit** instead: it brings one more die, 3.5.)

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
- **Attributes add nothing in battle** (since v0.26). They are rolled for checks out of battle and for initiative (DEX), and STR adds to Catch Breath. A hero's damage comes from the weapon, the power, the statuses on the target and flat bonuses (3.5).

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

In battle there is no advantage or disadvantage: what used to give it now gives a **status** (one more die), a **Bless** or a **×** multiplier (3.5).

### 1.5 Saves

*Out of battle only.* When something acts on you outside a battle (a trap, a curse in an event), you may make a **save**: a check with the attribute the effect names. Success avoids the effect, or softens it if the effect says so. A critical failure on a save has no extra effect unless the effect says so.

**In battle there are no saves.** Effects simply happen: a slammed foe is Stunned, a Hex Weakens, a web Roots. Bosses shrug off some effects instead (3.10).

---

## 2. Health

### 2.1 Hit Points and Hit Dice

**Hit points (HP)** are how much damage you can take.

Every class has a **hit die (⚅)**, from d6 to d12. Hit dice do two jobs:

- **They set your HP.** A hero starts with HP equal to their hit die's **maximum × 4**. **Vigor** rewards (4.2) add more: one and a half times the die's maximum each.
- **They heal you, out of battle.** You have a **pool of 3 hit dice**. You spend them to heal between battles (2.5), and a Camp restores the pool (4.7). Hit dice are never spent in battle.

| Hit die | Classes | Starting HP | Vigor reward |
|---|---|---|---|
| d6 | Wizard | 24 | +9 |
| d8 | Rogue, Cleric | 32 | +12 |
| d10 | Fighter | 40 | +15 |
| d12 | Barbarian | 48 | +18 |

### 2.2 Shields

A **shield** is temporary HP. Damage takes it off first. **Shields add up**: a new shield is added to the one you have. A shield **fades at the start of its owner's next turn**: a hero's at the start of the heroes' next turn, so a shield given on the heroes' turn lasts through the foes' turn (a hero's shield from before the battle, such as the Bulwark Sigil's, lasts through the first round).

*(A shield is not the same as the shield you carry, which is part of a hero's armour, 3.6.)*

### 2.3 Bloodied

A creature is **bloodied** while its HP is **at or below half** its maximum. Bloodied does nothing by itself. Other rules look for it: a boss changes phase, *Finisher* and the Executioner's Hood roll one more die, a foe turns savage. The screen marks it on the HP bar.

### 2.4 Down, Wounds and Death

- **Down.** A hero at **0 HP** is Down. They cannot act, and foes ignore them. They gain **1 Wound**.
- **Getting up.** In battle, only the cleric's **Revivify** (Heroes book) stands a Down hero up. There is no Help Up, and healing cannot reach a Down hero. When the party **wins** a battle, every Down hero stands up with **1 HP**.
- **Wounds.** Each Wound gives **−1 damage** on every hit the hero makes (3.5) and **−1** to the total of every **check** out of battle, to a maximum of **−3**. A hit still deals at least 1 damage. Wounds do not affect initiative or hit dice.
- **Death.** A hero who goes Down **with 3 Wounds already** dies for good. In other words, a hero can survive three Downs; the **fourth Down** before their Wounds heal kills them.
- **Removing Wounds.** Each **Camp** removes 1 Wound from every hero, and gold can buy one more (4.7).
- **Defeat.** If **every** hero is Down at the same time, the battle is lost and the run ends.

### 2.5 Healing

**In battle, only the cleric heals.** There is no Second Wind.

| Way to heal | When | How much |
|---|---|---|
| **Cleric's healing powers** | In battle, as the power says | *Healing Word*: an ally heals **d8 + 3**. *Prayer of Healing*: she and allies within 2 heal **4 + 3**. The +3 is her Channel Divinity; *Mender's Thread* adds 3 more. Each gives the party **+1 momentum** (3.7). |
| **Revivify** (cleric) | In battle, 2 MP | A Down ally stands up beside her with **2 rolls of their hit die**. |
| **Catch Breath** | Any time **outside** battle | Spend any number of hit dice. For each, roll it and add your **STR** (out of battle, attributes still count). |
| **Healing potion** | 1 action | Roll **2 of your hit dice** (not spent from the pool). *(Not in the v0.27 game.)* |
| **Camp** | At a Camp stop | Spends your remaining hit dice, then restores the pool (4.7). |

Healing dice are **green** on screen. Healing never raises HP above the maximum. The *Healer's Satchel* relic heals 15% more after every battle, and the *Phoenix Feather* lifts the first hero to fall each battle back up at half HP.

---

## 3. Combat

### 3.1 The Battlefield

Battles are fought on a grid of square tiles, **6 wide and 8 tall** (a phone held upright).

- **One creature per tile.** Large creatures fill 2×2 tiles.
- **Movement is orthogonal**: up, down, left, right. Each tile costs 1 SPD. You can move through allies, but not through foes or obstacles, and you cannot stop on an occupied tile.
- **Distance** is counted in orthogonal steps. A diagonal tile is at distance 2. "**Beside**" means orthogonally adjacent. Areas ("within 2", 3×3) count diagonals.
- **Speed (SPD)** is how many tiles one Move action covers. Each class has its own (Heroes book).

**Obstacles and terrain.**

| Obstacle | Examples | Effect |
|---|---|---|
| **Tall** | Boulder, tree, pillar, wall | Blocks movement and sight. |
| **Low** | Crates, low wall, gravestone | Blocks movement. |
| **High ground** | Raised ground | Ranged attacks and powers from it reach 1 tile further. |
| **Difficult terrain** | Water, brambles, rubble, ash | Costs 2 SPD to enter. Water puts out Burning. |

**Hazards.** A creature suffers a hazard when it **enters it** (even when pushed or pulled in) or **ends its turn in it**. Hazard damage is **flat**, ignores armour, and grows by the region (+0 in region I, +1 in II, +2 in III). There is no save. Foes avoid hazards unless they are pushed. A status from a hazard counts as a die like any other, but it belongs to no hero, so it never makes a combo (3.8).

| Hazard | Damage | Status |
|---|---|---|
| **Fire** | 3 | Burning 1 |
| **Acid pool** | 3 | Weakened |
| **Lava** | 8 | Burning 2 |
| **Snare** (hidden; only the trapper's enemies trigger it, once) | 4 | Rooted |
| **Web** (once, then it tears) | 0 | Rooted |

### 3.2 Starting a Battle

1. **Initiative.** Every creature rolls its **DEX die** once. Since v0.27 it only orders the **foes**: they act from **highest to lowest**, and the order **stays the same all battle**. Ties go to the higher DEX. Minions and swarms of one type share a roll. The heroes always act first, in any order (3.3).
2. **Hidden foes.** Some foes (lurkers) start **hidden** (3.5).
3. **Momentum.** The party's shared momentum starts at **1 + its Victories** (up to 3), plus relics (3.7).

### 3.3 Rounds: the Heroes, then the Foes

**Sides take turns.** Each round has two halves:

1. **The heroes' turn.** **Every** hero acts. Each has **3 actions** (3.4) to spend in any order. The player **switches between heroes at any time**, by tapping a hero or the turn plate, and can come back to one later: Orin can Root a foe, Brakka can shove it into a wall, and Orin can then use his last action. Tap **END TURN** when done: every hero's turn ends together, and **actions left over are lost**.
2. **The foes' turn.** Every foe acts once, in initiative order (3.2): a move and an action (3.12).
3. **End of the round.** Missions count their rounds, reinforcements arrive, the foes gain **Malice** and may unleash a threat (Bestiary). Then the next round begins with the heroes.

- **Start and end of turn.** For heroes, "the start of your turn" is the start of the heroes' turn, and "the end of your turn" is END TURN: shields fade and Burning burns for every hero at the start; hazards bite and statuses count down for every hero at the end.
- **Free powers** and passive powers cost no action.
- A **Stunned** hero has **1 fewer action** (2 instead of 3) and half SPD (3.10).
- **Attack as often as you like.** A basic attack costs 1 action and no MP, and you may make it as many times as you have actions.

> **Why?** When each side moves all its characters at once, set-ups and cash-ins line up in one go: no foe acts between the wizard's Root and the rogue's strike. The cost is that the foes also get to answer together.

### 3.4 Actions

Each action costs **1 action** unless it says otherwise.

| Action | What it does |
|---|---|
| **Move** | Move up to your **SPD** (3.1). You may split the move around other actions in the same turn. |
| **Attack** | A **basic attack** with your weapon (3.5). Any number of times. It gives no momentum. |
| **Power** | Use a power (chapter 7). It costs the party's **MP**, and the number of actions the power lists. |
| **Use an item** | Drink or give a potion, or throw a consumable. *(Not in the v0.27 game.)* |

Every foe's stats, statuses and next move (**INTENT**) are always shown when you tap it.

### 3.5 Attacking: Dice × Statuses

Every hit, by hero or foe, works the same way. There are **no misses**: every attack hits its target.

**1. Count the dice (MULT).** MULT is how many dice the hit rolls:

| Source | Dice |
|---|---|
| The **power's own dice** (a basic attack: 1; a power: as its card says) | +1 each |
| A **pair** weapon (twinblades, needles) | +1 |
| **Each different status** on the target: Burning, Stunned, Rooted, Weakened, Taunted (3.10) | **+1 each** (*Backstab*: +2 each) |
| The attacker is **Blessed** (spent by this hit) | +1 |
| **Sneak Attack** (rogue): an ally of hers is beside the target | +1 |
| *Finisher*, and the *Executioner's Hood*, against a **bloodied** foe | +1 each |
| *Opening Strike*, on your first attack each battle | +1 |
| *Glass Cannon*: the attacker's, and the target's (a foe hitting a Glass Cannon hero) | +1 each |
| Attacking while **hidden** | +1 |
| Foes: *Pack*, and *Bloodlust* or *Rally the Horde* this round (Bestiary) | +1 each |
| The attacker is **Weakened** | **−1** (never below 1 die) |

A status counts **once**, however many heroes gave it: stack **different** statuses, not the same one twice.

**2. Roll and add.** Roll that many of the **weapon die** (laddered ▲/▼ by the power, Heroes book 2.2.1) and add them up. A die on its **top number** is a **crit**: it turns red and you **roll one more die**, which can crit again (*Heavy Hitter*: two more per crit), up to 8 extra dice a hit. *Keen* (on a d6 or larger) and *Precision* each widen the crit range by one number (top two; both: top three). **Staves never crit**: all the wizard's weapons are staves.

**3. + flat bonuses:** the power's **+N damage**, **Training** (+1 per reward, up to +4), the Dwarven Whetstone (+1), *Opening Strike* (+3 on your first attack each battle), *Radiance* (+2 when a Radiance cleric Blessed you), and on a hit with a crit *Brutal* (+3) and *Loaded Bones* (+3).

**4. − Wounds** (−1 each, up to −3).

**5. − the target's armour**, a flat number (foes: Bestiary; heroes: 3.6). *Piercing Strike* ignores it. Armour never takes the damage below **1**.

**6. × multipliers**, rounded, at least 1 (0 if the target is immune):

| Multiplier | When |
|---|---|
| **×2** | The target is **weak** to the damage type (3.11); *Shatter*: a hero's hit on a foe another hero (with Shatter) Rooted |
| **×3** | *Assassinate* against a **Stunned** foe |
| **×½** | The target **resists** the damage type; the attacker is **Taunted** and hits anyone but the one who taunted it; the *Warding Charm* (each foe's first hit on each hero each battle) |
| **×0** | The target is **immune** to the damage type |

**Attributes add nothing in battle.** Your STR, DEX, INT and PRE are for checks out of battle and initiative only (1.2).

**Foes** work the same way (Bestiary): their dice are their stat block's (usually one), plus a die for each status on the hero, *Pack*, *Bloodlust* and hiding; their flat bonus is the stat block's, plus their **strength** (it grows with depth), +2 for *Savage* against a bloodied hero and +2 near an *Aura* foe; then the hero's armour. **Flat** attacks (minions, swarms) never roll and ignore armour.

> **Example.** A Goblin Cutthroat (no armour) is **Burning** (Orin's *Fire Bolt*) and **Taunted** (Brakka's *Hook Chain*), and Brakka stands beside it. Vex (Twinblades, a pair of d4s) uses *Backstab*: 1 die for the power + 1 for the pair + 2 × 2 statuses + 1 Sneak Attack = **7d4**. She rolls 4 1 3 2 4 2 3: the two 4s crit, so two more dice, 1 and 4; that 4 crits again, one more: 2. The ten dice add up to **26**. No flat bonuses, no armour: **26 damage**. It hits statuses Orin and Brakka gave, so it is a **combo**: +1 party momentum.

**The dice on screen.** Every die is the same size, and its colour says what it does: **blue** dice add damage; a die on its top number turns **red** and glows, and another die follows it; **green** dice heal. The caption names the extra dice ("DICE: +4 Burning, Taunted, +1 Sneak Attack") and reads the sum out: "3 dice: 9 +2 Hook Chain −1 armour = 10 DAMAGE".

**Melee and range.** **Range 1 is melee**: the target must be orthogonally beside you. Anything more is **ranged**, and needs a line of sight past tall obstacles.

**Hiding.** A **hidden** creature cannot be targeted at range (only from beside it). Its next hit rolls **one more die**, and then it is revealed. Some foes start hidden.

### 3.6 No Reactions; Hero Armour

**Nobody acts on someone else's turn** (since v0.27). There is no Defend, and no reaction powers: no Intercept, Sentinel, Opportunist, Counterattack, Repelling Ward, Warding Word, Block or Brace. Unused actions are simply lost when the heroes' turn ends.

**No free strikes.** Moving away from an enemy is safe: neither heroes nor foes get a free attack when someone leaves their side. Enemies still block movement. (A Bandit Captain's *Rally* makes its allies strike on its own turn, Bestiary.)

**Hero armour.** Instead of Defending, heroes have **armour**, a flat number taken off every foe hit (at least 1 is left), exactly like a foe's:

| Hero | Armour |
|---|---|
| Fighter (heavy armour and a shield) | **2** |
| Cleric (medium armour and a shield) | **1** |
| Rogue (light armour), Wizard (none) | 0 |

Armour does not stop **flat** damage: minions, swarms, Burning, slams, hazards, a Rally blow and boss surges.

### 3.7 Momentum (MP)

**Momentum** pays for powers. Since v0.27 it is **one pool shared by the whole party**: any hero spends it. (The foes have their own pool, **Malice**, Bestiary.)

- **Start of battle:** **1 + the party's Victories, up to 3** (4.2), **+1 for each hero with *Eager***, +2 with the Battle Hymn and +3 with the Crown of Thorns. An omen won on the road adds 1 in the next boss battle.
- **The cleric's support** gives **+1** every time: *Guidance*, *Healing Word*, *Bless*, *Sanctuary* and *Divine Shift* cost 0 MP and give +1; *Prayer of Healing* costs 1 and gives 1 back.
- **Each combo** (3.8) gives **+1** (+1 more with the War Drum, +1 more if the hero who lands it has *Conductor*).
- **Relics and powers:** the Tactician's Map +1 at the start of each round after the first; the Vampire Fang +1 for the first foe slain each round; the Blood Chalice +2 when a hero goes Down; *Adrenaline* +1 the first time that hero is hit each battle; grabbing a chest in a Plunder battle +1.
- **Basic attacks give no momentum** (since v0.27).
- **Maximum 10 MP.** All MP is lost when the battle ends.

### 3.8 Set-ups and Combos

A **set-up** is a status one hero puts on a creature so that **another** hero can cash it in. Cashing in someone else's set-up is a **combo**. You never cash in your own set-up.

| Set-up | Usually made by | The payoff |
|---|---|---|
| **Burning** | Wizard (*Fire Bolt*, *Scorching Burst*, *Fireball*), cleric (*Brand*), Flame and Venom runes | One more die on every hit, and damage at the start of its turn. |
| **Rooted** | Wizard (*Ray of Frost*), Frost rune | One more die; it cannot move. *Shatter* doubles allies' hits on it. |
| **Weakened** | Wizard (*Hex*, *Chain Hex*), fighter (*Sunder*), rogue (*Quick Stab* crits) | One more die; its own hits roll one fewer. |
| **Stunned** | Fighter (slams, *Earthshaker*, *Tide of Iron* and *Crushing Blow* crits), wizard (*Force Push* slams), Thunder rune | One more die; a foe skips its next turn. *Assassinate* deals ×3 to it. |
| **Taunted** | Fighter (*Tide of Iron*, *Hook Chain*, *Shield Wall*) | One more die; it must come for her, and its hits on anyone else are halved. |
| **Blessed** (on a hero) | Cleric (*Guidance*, *Bless*, *Smite* crits) | That hero's next hit rolls one more die (*Radiance*: +2 damage too). |

- **A combo** is a damaging hit (a power or a basic attack) on a foe that carries a status **another hero gave it**, or a hit by a hero **another hero Blessed**. It gives **+1 party momentum**, at most one combo per action (an area attack over several set-ups is still one).
- A status is credited to the hero who gave it last. Statuses from hazards, foes and the Ember Censer belong to no hero: they add dice but never make a combo.
- Powers that deal no damage (*Shove*, *Hex*) never cash in a combo; they only set up.
- A foe that just **lost a turn** to a Stun cannot be Stunned again until after its next turn.
- A **boss** does not lose its turn to a Stun, but the Stun still slows it and still adds its die.

### 3.9 Forced Movement

Powers can **push** a creature straight away from the source or **pull** it straight toward the source, a number of tiles.

- **Slam.** A creature **pushed** into an obstacle, the edge or another creature stops and takes **slam damage: one roll of the weapon die of whoever moved it** (a hero's weapon die before any ladder step; a foe uses its attack die; effects with no source use a d4). A creature it hits takes the same. Slam damage ignores armour. **A slam Stuns** the creature that was moved. A pull never slams.
- Forced movement **without** a slam does not Stun unless the power says so.
- **Steadfast N.** Pushes and pulls move a Steadfast N creature **N tiles fewer**.
- **Into a hazard.** The creature suffers it (3.1).

### 3.10 Statuses

Each status is one word on the creature's badge (Burning also shows its number). **The first five each add one die to every hit on the creature**, from either side. A status does not stack with itself: giving it again only refreshes it (Burning adds to its number, but still counts as one die).

| Status | Effect | How long |
|---|---|---|
| **Burning N** | Takes **N damage** at the start of each of its turns (ignores armour), then N drops by 1. More Burning adds to N. Water puts it out. Fireproof creatures are immune. | Until N reaches 0 |
| **Stunned** | A **foe** skips its next turn (a **boss** keeps its turn). A **hero** has 1 fewer action. Either way: half SPD. | Until it skips its turn, or the end of its next turn |
| **Rooted** | Cannot move. It can still attack. Bosses are immune. | Until the end of its next turn |
| **Weakened** | Its own hits roll **one fewer die** (never below 1). | Until the end of its next turn |
| **Taunted** | A foe the fighter Taunted must attack her if it can reach her. A Taunted creature's hits on anyone but its taunter deal **×½**. | Until the end of its next turn |
| **Blessed** | A hero's next hit rolls **one more die**. Not a set-up on a foe, and it adds no die to hits on the hero. | Until the hero hits, or the heroes' turn ends |
| **Shield** | Temporary HP (2.2). | Until the start of its next turn |
| **Hidden** | See 3.5. | Until it attacks or is hit |

Timed statuses applied on the creature's own turn last one turn more; *Lingering Magic* (Heroes book) makes the wizard's last one turn more. Older names still met in places map onto these: **dazed → Stunned**, **slowed → Rooted**, **exposed → Weakened**, **bleeding → Burning**, **frightened → Weakened**. There is no Mult status any more (since v0.27).

### 3.11 Damage Types

Damage is **physical** unless something says otherwise. The other types are **fire**, **cold**, **force**, **radiant**, **necrotic** and **poison**.

A creature can be **weak**, **resistant** or **immune** to a type. It is a **×** multiplier on the hit (3.5):

- **Weak:** ×2.
- **Resist:** ×½ (the hit still deals at least 1).
- **Immune:** no damage, and no Burning (fire).

Undead are weak to radiant and immune to poison and necrotic; incorporeal foes resist physical damage. Flat damage from minions and swarms ignores resistance.

### 3.12 Foes

Foes use the same rules as heroes, with a few differences (full rules in the Bestiary):

- A foe's turn is a **move and an action** (an attack or a special ability). Its stat block may list more.
- Foes have **flat armour**, taken off the damage of every hero hit.
- **Minions** have 1 HP and deal flat damage; they never roll. **Swarms** share one HP pool and take double damage from area attacks.
- **Bosses** keep their turn when Stunned and cannot be Rooted.
- Foes share a pool of **Malice (◆)**, which pays for their threats and special abilities.
- Each foe has a **role** (Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader) that tells you how it moves and whom it attacks.

### 3.13 Companions

> [!note] Companions are parked (since v0.25). The rules below (a wolf, a hawk, a mule) are not in the game, and their tricks were written with saves and advantage; they will be rewritten in the v0.27 dice terms if companions return.

A hero may have **one companion** from a class feature, relic or shop. A companion has **HP**, **SPD**, **flat damage** (it never rolls) and one **trick**; no hit dice and no reactions. It acts **on its owner's turn at no action cost**. At 0 HP it is **Down** until the next Camp; it never dies. It counts as an ally for Sneak Attack and set-ups.

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
| **Shop** | Buy weapons, powers, supplies and relics; upgrade weapons at the smith (4.8). | — |
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

- **Victories make the party sharper:** the party's shared momentum starts each battle at **1 + the Victories, up to 3** (3.7).
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
| 5 | **Omen** | A PRE check. Success: a hint about the boss, and the party starts the boss battle with **1 more momentum**. |
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

1. **Choose a class** (Heroes book). It sets your key stat, hit die, armour, weapon, innate powers and class powers.
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
| **Hit dice** | A pool of 3, of your class's die (out of battle only) |
| **SPD** | Your class's speed (Heroes book) |
| **Initiative** | Your DEX die (since v0.27 it orders only the foes, 3.2) |
| **Hit** | The power's dice + a die per status on the target, of your weapon's die; + flat bonuses (Training) (3.5) |
| **Armour** | Fighter 2, cleric 1, rogue and wizard 0 (3.6) |
| **Pack slots** | 2 + STR |

### 5.4 Growing Stronger

Heroes do not level up (4.2). A hero starts with their class features (Heroes book) and grows only through **rewards**: new powers, **Vigor** (max HP) and **Training** (+1 damage on every hit, up to +4), and through weapons, relics and the smith.

### 5.5 Powers

Everything a hero learns during a run is a **power**, active or passive (chapter 7). A new hero has a basic attack, their innate powers and one class power.

---

## 6. Equipment

### 6.1 Proficiency and Hands

- Each class is proficient with some **weapon groups**: **Light**, **Martial**, **Ranged** and **Focus**. Anyone can use any weapon, but a weapon you are **not proficient** with **cannot crit** (its top numbers bring no extra dice).
- **Armour** needs **STR**, not proficiency: **medium needs STR 2**, **heavy needs STR 3**.
- A **two-handed** weapon cannot be used with a shield.
- Once per round you may swap one weapon or shield at no cost.

### 6.2 Armour and Shields

| Armour | Armour (with a shield) | Needs | Cost |
|---|---|---|---|
| None | 0 | — | — |
| Leather (light) | 0 | — | 30 gold |
| Chain (medium) | 1 | STR 2 | 100 gold |
| Plate (heavy) | 2 | STR 3 | 300 gold |
| **Shield** | part of the numbers above | one hand | 20 gold |

In the game the classes' armour is fixed (fighter 2, cleric 1, 3.6). *TBC: whether armour and shields return as items, and what a shield adds on its own.*

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
| Arcane Staff | Focus | d4 | 4 | No crits | 30 |
| Thorn Staff | Focus | d6 | 4 | No crits | 30 |
| Unarmed | — | d4 | 1 | | — |

Costs are in gold (**TBC**). A better weapon is usually one ladder step up.

| Property | Meaning |
|---|---|
| **Light** | Can be held in the off hand. Light weapons can be honed down to a **d2** (Heroes book). |
| **Pair** | Two weapons sold as one: every attack rolls **one more die**. |
| **Two-handed** | Needs both hands. No shield. |
| **Reach N** | Melee attack at range N, in a straight line. |
| **Thrown N** | Can be thrown at range N; picked up again after the battle. |
| **Load** | Needs 1 action to reload after each shot. |
| **STR N** | Needs STR N. |
| **No crits** | A top number is just a number: it brings no extra die. Every staff has it (since v0.27). |

**Upgrades.** A smith can ladder a weapon's die up (*temper*) or down (*hone*), and inscribe **runes** such as Keen, Flame or Thunder. Magic weapons come with runes. See the Heroes book, Part 3.

### 6.4 Consumables

Each consumable takes **1 pack slot** (5.3). *(Not in the v0.27 game: the shop sells Bandages and Rations instead.)*

| Item | Effect (1 action) | Cost |
|---|---|---|
| **Healing potion** | Heal 2 of your hit dice (not spent) | 50 |
| **Greater healing potion** | Heal 4 of your hit dice (not spent) | 150 |
| **Antidote** | End Burning | 30 |
| **Fire flask** | Range 3: d6 fire damage | 40 |

### 6.5 Relics

**Relics** change the rules for the whole party. The party can carry any number, but only **two are active**. Swap them at a Camp or before a battle. Relics do not take pack slots.

> **Pouch of Fate Tokens** · relic *(not in the game)*
> At the start of each battle and each event, the party gets **3 fate tokens**. Unused tokens are lost. Any hero may spend one at any time, at no action cost, to:
> - **Reroll** a die they just rolled (a hit or a check), keeping the new result; or
> - **Shake it off:** end one status on themselves.

**Other relics.** Boots of Striding (+1 SPD for every hero), Dwarven Whetstone (**+1 damage** on every hero hit), Heart of the Oak (+8 max HP), Battle Hymn (+2 starting momentum), Tactician's Map (**+1 party momentum** at the start of each round after the first), Phoenix Feather (the first hero to fall each battle rises at half HP), Vampire Fang (the first foe the heroes slay each round gives **+1 party momentum**), Bulwark Sigil (start each battle with 8 shield), Loaded Bones (**+3 damage** on a hero hit with at least one crit), Sentinel Lens (+3 damage on a hero's free hit; since v0.27 the only one is *Anvil*'s, Heroes book), Warding Charm (each foe's first hit on each hero each battle deals **half damage**), Salamander Scale (heroes ignore fire and lava damage and cannot Burn), Gauntlet of Force (+1 to hero pushes and pulls), Fenwalker Boots (ignore difficult terrain), Hourglass of Haste (heroes roll initiative twice; since v0.27 heroes always act first, so it does nothing), Lucky Coin (+50% gold), Healer's Satchel (heal 15% after each battle).

**Unlocked relics** (4.10): War Drum (each combo gives **+1 more party momentum**), Scholar's Tome (picks and drafts show 4 cards), Camp Kettle (+1 hit die; Camps remove 2 Wounds), Merchant's Seal (merchants and the smith charge 25% less), Executioner's Hood (hero hits on bloodied foes roll **one more die**), Ember Censer (every foe but a boss starts each battle **Burning 3**), Mender's Thread (the cleric's heals heal **3 more**), Crown of Thorns (+3 starting momentum; foes gain 2 more Malice each round), Blood Chalice (when a hero goes Down, the party gains **2 momentum**).

---

## 7. Powers

A **power** is anything a hero learns during a run. The full rules, every class's powers, the general powers, and weapon upgrades are in the **Heroes** book.

- **Two kinds.** An **active** power is used on your turn and costs **MP** and **actions**. A **passive** power is always on, or triggers by itself, and costs nothing.
- **Two lists.** **Class powers** are on each class page; **general powers** can be taken by any class. Every hero also has **innate** powers that take no slot: their **basic attack**, plus the fighter's **Shove**, the wizard's **Force Push** and the cleric's **Guidance**. (Second Wind and Help Up were removed in v0.27.)
- **Slots, rewards and drafts.** A hero has **8** power slots. Most powers come from **rewards** after each fight (4.2). A **draft** is a pick of 3 powers for one hero, from boons, Treasure, Training at a Camp and some events. Shops sell powers.
- **Every effect is one thing.** An attacking power is the **weapon die** with standard **modifiers** shown as one line on its card: a ladder step ▲/▼, how many dice and hits, **+N damage**, a named rule (ignores armour, 2 dice per status, ×3 vs Stunned) and **Crit:** triggers (Stun, Weaken, Bless allies, an action back). Other powers give a foe a **status** (Burning, Rooted, Weakened, Stunned, Taunted), **Bless** an ally, heal, shield, or add a **×** to a hit. Upgrading your weapon makes every attacking power stronger.
- **Tags.** Every class and general power has one of six tags (Set-up, Burst, Guard, Reach, Surge, Mend). Since v0.25 tags only group powers; the old Resonance bonuses are retired.

### 7.1 Using Active Powers

- **Cost.** An active power costs the **MP** and **actions** it lists (1 action unless it says 2). MP comes from the party's shared pool. **Innate** powers cost 0 MP.
- **Free** powers cost no action. There are no reaction powers (since v0.27).
- **Attacking powers** roll their **weapon dice** (a pair weapon adds one), laddered and changed by their modifiers, plus a die for each status on the target, exactly like a basic attack (3.5). Attributes add nothing. Armour applies unless the power says otherwise.
- **No saves.** A power's effects simply happen on every target it hits.
- **Combat only.** Powers are used in battle. Outside battle, heroes use class options (1.3).

**Reading a power:**

| Power | R | Tag | MP | Actions | Range | Modifiers | Effect |
|---|---|---|---|---|---|---|---|
| **Tide of Iron** | C | Set-up | 1 | 1 | 1 | d8 ▲ from d6 · Crit: Stun | Push the foe 1 and step after it. It is Taunted. A slam Stuns it. |
| **Shatter** | R | Set-up | — | passive | — | — | Allies' hits against a foe you Rooted deal ×2. |

The **Modifiers** line is worked out for the hero's weapon (here Brakka's d6 Longsword, laddered up one step). It shows the power's own dice; each status on the target adds one more when it hits. "Crit:" effects happen when at least one die of the hit crits.

---

## 8. Optional Rules

- **Gritty.** A hero dies on the **third** Down instead of the fourth.
- **Shifting order.** Roll the foes' initiative again every round.
- **Interleaved turns.** Heroes and foes act one by one in initiative order, as before v0.27. Set-ups are harder to line up, and foes can act between them.
- **Defend.** A hero who keeps an action at the end of their turn may spend it when a foe hits them to roll their armour die (fighter d8, cleric d6, others d4) and take that much less (the rule before v0.27).
- **Free strikes.** Leaving a tile next to an enemy for one that is not lets it make a basic attack against you (the rule before v0.24).
- **Lean rewards.** Rewards come only from elites and bosses, as in the old level-up game; normal battles give gold and Victories only.

---

## Glossary

| Term | Meaning |
|---|---|
| **Action** | One of each hero's 3 on the heroes' turn; unused ones are lost (3.3) |
| **Advantage / disadvantage** | Out of battle only: roll extra dice, keep the best or worst; net capped at 3 (1.4) |
| **Armour** | A flat number taken off the damage of every hit, to a minimum of 1; foes 0 to 3, the fighter 2, the cleric 1 (3.5, 3.6) |
| **Blessed** | A hero's next hit rolls one more die (3.10) |
| **Bloodied** | At or below half HP (2.3) |
| **Boon** | A gift or bargain chosen at the start of a run (4.9) |
| **Burning N** | N damage at the start of its turn, then N drops by 1; a status (3.10) |
| **Chronicle** | What carries over between runs: totals, score, unlocked relics (4.10) |
| **Class option** | An event choice only a party with that class can pick (1.3) |
| **Combo** | A hit that cashes in another hero's set-up: +1 party momentum (3.8) |
| **Companion** | An animal ally (parked since v0.25) (3.13) |
| **Crit** | A die on its top number: it turns red and brings one more die; some powers add a "Crit:" effect (3.5) |
| **Damage** | The dice added up + flat bonuses − Wounds − armour, at least 1; then any × (3.5) |
| **Down** | At 0 HP; gain a Wound; only Revivify stands you up in battle (2.4) |
| **Dread** | The difficulty ladder unlocked by winning (4.10) |
| **Group check** | Every hero rolls; half must succeed (1.3) |
| **Growth** | A reward card: Vigor (+1½ hit dice of max HP) or Training (+1 damage on every hit, up to +4) (4.2) |
| **HD (⚅)** | Hit die: sets HP and heals out of battle; a pool of 3 (2.1) |
| **Heroes' turn** | The first half of every round: every hero acts, in any order (3.3) |
| **Key stat** | Your class's best attribute; it adds nothing in battle since v0.26 (1.2) |
| **Ladder** | Move a die one step up or down d4 → d20; powers ladder the weapon die d2 → d12 (▲/▼) (1.1) |
| **Malice (◆)** | The foes' shared resource (Bestiary) |
| **MP** | Momentum: one pool for the whole party, pays for active powers (3.7) |
| **Mult** | How many dice a hit rolls: the power's dice + one per status on the target + other sources (3.5) |
| **Passive power** | A power that is always on or triggers by itself (7) |
| **Power** | Anything a hero learns: active (MP and actions) or passive; picked as a reward or drafted, into slots (7) |
| **Reward** | After each battle won: pick 1 of 3 cards, a power for one hero or growth (4.2) |
| **Role** | How a foe fights: Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader (Bestiary) |
| **Rooted** | Can't move on its next turn; a status (3.10) |
| **Rune** | A weapon upgrade from the smith (Heroes) |
| **Save** | Out of battle only: a check to resist an effect (1.5) |
| **Set-up** | A status for another hero to cash in, or Bless on a hero (3.8) |
| **Shield** | Temporary HP (2.2) |
| **SPD** | Tiles per Move (3.1) |
| **Status** | Burning, Stunned, Rooted, Weakened or Taunted: each different one adds a die to every hit on the creature (3.10) |
| **Stunned** | A foe skips its next turn; a hero loses 1 action; a status (3.10) |
| **Taunted** | Must attack the fighter who taunted it; half damage to anyone else; a status (3.10) |
| **Victory** | A win since the last Camp: starting momentum (4.2) |
| **Weakened** | Its own hits roll one fewer die; a status (3.10) |
| **Wound** | −1 damage on every hit and −1 to checks (max −3); the fourth Down kills (2.4) |
