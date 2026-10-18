---
title: Rogue Tactics 1e — Heroes
version: 0.27
book: 2 of 3 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics, classes, powers]
---

# Rogue Tactics 1e — Heroes

> v 0.27 "Sides and Dice". Book 2 of 3. The classes, their **powers**, and how weapons and powers grow during a run. Basic rules are in [Core Rules](core-rules.md). **Powers and numbers are drafts (TBC).**
>
> **The idea of this book:** the basic rules stay simple. A hit rolls **MULT dice** of the weapon die and adds them up (Core 3.5), and **every different status on the target is one more die**. Every attacking power is **your weapon die plus a few standard modifiers**, shown as one line on its card: a **ladder step** (▲ bigger dice, ▼ more crits), more **dice** or **hits**, **+N damage**, a named rule, or a **Crit:** trigger. Other powers put one **status** on a foe (Burning, Rooted, Weakened, Stunned, Taunted), **Bless** a friend, heal or shield. Attributes add nothing in battle. The depth comes from how your four heroes' statuses feed each other, and all four act before any foe does.

---

## Part 1 · Choose Your Party

A party of four works best with one hero in each **role**. The default party is the **rogue, fighter, wizard and cleric**.

| Role | Icon | What it does | Its job in the combo game |
|---|---|---|---|
| **Striker** | ⚔︎ | Fast, hits hard, fragile. | **Cashes in** the statuses her friends set up, rolling fistfuls of dice. |
| **Tank** | ⬢ | Tough, draws attacks, fights up close. | **Stuns** foes with slams, **Taunts** them so they fight her, and **Weakens** them. |
| **Controller** | ❖ | Moves and burns foes; hits groups. | **Sets up**: every spell leaves a status (Burning, Rooted, Weakened), and every status is one more die for his friends. His own staff is weak. |
| **Support** | ✚ | Heals, shields and buffs. | **The party's heart**: the only healer, she **Blesses** friends, and her support is where the party's **momentum** comes from. |

| Class | Role | Key stat | Hit die | Armour | SPD | Complexity |
|---|---|---|---|---|---|---|
| **Rogue** (Vex) | ⚔︎ Striker | ➶ DEX | d8 | 0 | 4 | ♦ |
| **Fighter** (Brakka) | ⬢ Tank | ♜ STR | d10 | 2 | 3 | ♦ |
| **Wizard** (Orin) | ❖ Controller | ✦ INT | d6 | 0 | 4 | ♦♦ |
| **Cleric** (Sela) | ✚ Support | ♛ PRE | d8 | 1 | 3 | ♦♦ |

**Complexity** (♦) is how much a class juggles. ♦ is a good first class.

The **key stat** is the class's best attribute. Since v0.26 attributes add **nothing in battle**: they are rolled for checks out of battle (Core 1.3) and initiative (DEX), and STR adds to Catch Breath healing out of battle.

**Each class page has:** a stat table; its **specialties** (event options only it unlocks, Core 1.3); its **class features**; its **class powers**; sample **builds**; and the classes it **combos** with best.

---

## Part 2 · Powers

A **power** is anything a hero learns during a run. Every power is either:

| Kind | What it is | Example |
|---|---|---|
| **Active** | You **use** it on your turn. It costs **MP** from the party's shared pool (Core 3.7) and **actions**. | *Hex:* 1 MP, 1 action. Range 5. The foe is Weakened. |
| **Passive** | It is **always on**, or **triggers by itself**. No MP, no action. | *Heavy Hitter:* each crit rolls two more dice instead of one. |

Powers come from two lists: **class powers** (on each class page; only that class) and **general powers** (Part 6; any class). Every hero also has **innate** powers that take no slot (Part 2.1).

### 2.1 Slots, Rewards and Drafts

- **Innate powers** (no slot, no MP): every hero's **basic attack** (Sword, Blades, Staff Bolt, Mace); the fighter's **Shove**, the wizard's **Force Push**, the cleric's **Guidance**. (Second Wind and Help Up were removed in v0.27: only the cleric heals.)
- **Slots.** A hero has **8** power slots. Active and passive powers share them. *(Phone screens show active powers as buttons; at most 6 actives fit, TBC.)*
- **Start.** Each hero has their innate powers and **one class power**: Brakka *Tide of Iron*, Vex *Piercing Strike*, Orin *Fire Bolt*, Sela *Healing Word*. Everything else comes from rewards, so the first battles stay simple.
- **No levels.** Heroes do not level up (Core 4.2). Powers come from **rewards** and **drafts**.
- **Rewards** (the main source). After every battle won, the party picks **1 of 3 cards**: each a power for a named hero (class or general), or a **growth** card (Vigor: +1½ hit dice of max HP; Training: +1 damage on every hit, up to +4).
- **Drafts.** A draft shows **one hero 3 powers** (at least one class power and one general power). Take one or skip.

| When | What |
|---|---|
| **Battle** won | A reward pick |
| **Elite battle** won | Two reward picks; each has at least one Uncommon or better |
| **Boss** beaten | Two reward picks; each has a Rare |
| **Treasure** stop | A reward pick, instead of a relic or weapon |
| **Boon** (start of a run) | A Master's Lesson (one hero, a Rare) or A Blood Oath (every hero) |
| **Shop** | Buy powers on offer: 30 / 60 / 120 gold for C / U / R |

- **Rarity ramps by region:** region I Common 85%, Uncommon 15%; region II 55 / 35 / 10%; region III 40 / 40 / 20% (Common / Uncommon / Rare). Skipping a pick or draft pays 10 gold; one reroll costs 10 gold.
- **Full slots:** discard a power (it is gone) or skip.
- **At a Camp** you may discard powers, hand a **general** power to another hero, or **Train** (25 gold: discard one power and draft a replacement of the same rarity).

### 2.2 Using Powers

- **Active powers** cost the MP and actions they list (1 action unless it says **2 actions**). **Free** powers cost no action. There are **no reaction powers** (since v0.27): nothing is used on someone else's turn.
- **Attacking powers** roll **your weapon's die** (one more with a **pair** weapon), changed by the power's **modifiers** (2.2.1), plus **one more die for each different status on the target**, then flat bonuses and armour as for any hit (Core 3.5). Attributes add nothing. **A better weapon makes every attacking power better** (Part 3).
- **Every effect is one thing:** a **status** on a foe (**Burning N**, **Rooted**, **Weakened**, **Stunned**, **Taunted**: each is one more die on every hit it takes), **Blessed** on an ally (one more die on their next hit), **Shield N**, a heal, or a **×** on the hit (*Assassinate* ×3, *Shatter* ×2).
- **No saves.** A power's effects happen on every target it hits. Bosses keep their turn when Stunned and ignore Root.
- **Basic attacks** cost no MP and can be used as often as you have actions. They give no momentum.
- **Momentum** is shared: any hero spends the party's pool. The cleric's support powers (marked **+1 ◆**) and every combo fill it.

#### 2.2.1 Power Modifiers

Every attacking power is the weapon die plus some of these **standard modifiers**, and nothing else. The card shows them as one line, worked out for the hero's own weapon: *Tide of Iron* with a Longsword reads **d8 ▲ from d6 · Crit: Stun**. The line shows the power's own dice; when it hits, each status on the target adds one more.

| Modifier | On the card | What it does |
|---|---|---|
| **Ladder step** | ▲ / ▼ (▲2, ▼2 for two steps) | Moves the weapon die along **d2 · d4 · d6 · d8 · d10 · d12** (it stops at the ends). ▲ hits harder but crits less often; ▼ hits softer but crits more. |
| **Dice** | 2d6, 3d4 … | How many weapon dice the power rolls before statuses (one more with a pair weapon). Every die can crit. |
| **Hits** | ×3 hits | The power hits that many times; each hit rolls its own dice, counts the target's statuses again and can crit. Your Bless is spent by the first hit. |
| **+N damage** | +2 dmg | Flat damage, added before armour. |
| **Crit trigger** | Crit: … | Something extra when at least one of the hit's dice crits (below). |
| **Other** | ignores armour · 2 dice per status · ×3 vs Stunned | A few powers keep one named rule of their own. |

| Crit trigger | Effect |
|---|---|
| **Stun** | The foe is Stunned (a boss keeps its turn). |
| **Weaken** | The foe is Weakened. |
| **Bless allies** | Allies within 2 (not you) are Blessed. |
| **+1 action** | Get one action back, once a round. |

*(The engine also knows Crit: Root, Burn N, push N and +N damage; no v0.27 power uses them.)*

Some passive powers change every attack instead: *Heavy Weapon* (▲1), *Precision* (▼1, crits on the top two numbers), *Brutal* (+3 damage on a crit), *Heavy Hitter* (two more dice per crit) (Part 6).

### 2.3 Your Set-up, Their Payoff

"A foe **you** Rooted" (or Stunned, or Weakened) means the status came from you. **Allies** get the payoff: a damaging hit on a foe carrying another hero's status, or by a hero another hero Blessed, is a **combo**: **+1 party momentum** (Core 3.8). You never combo off your own set-up. Every status adds its die to everyone's hits, yours included.

### 2.4 Tags

Every class and general power has one **tag**: **Set-up**, **Burst**, **Guard**, **Reach**, **Surge** or **Mend**. Since v0.25 tags only sort powers on the cards and in the compendium. **Resonance is retired**: the party no longer gains bonuses for holding 4 or 8 powers of one tag.

---

## Part 3 · Weapons and Upgrades

### 3.1 The Weapon Is the Engine

Every hit in the game is a handful of the weapon's dice added up (Core 3.5). Powers ladder the die and add **dice** and **hits**; every status on the target adds a die; and every die that lands on its **top number** is a **crit**: it turns red and **brings one more die**. So your weapon's die decides what kind of hero you are: small dice crit often, big dice deal more per die, and **set-ups add whole dice, so they are worth most to big ones**.

| Die | Crit chance per die | Plays like |
|---|---|---|
| **d2** | 50% | Every 2 is a crit. A pair of d2s crits three times in four. |
| **d4** | 25% (staves: never) | Quick and crit-happy. Daggers, twinblades. The wizard's d4 staff never crits. |
| **d6** | 17% (33% with Keen) | The all-rounder. |
| **d8** | 12% (25% with Keen) | Heavy and steady. |
| **d10** | 10% (20% with Keen) | Big, reliable hits; extra dice from statuses are huge. |
| **d12** | 8% (17% with Keen) | Rare legendary weapons. |

Average damage of one basic attack with no flat bonuses (from the dice, with crits rolling more; attributes add nothing):

| Weapon | At least one crit | Armour 0 | Armour 2 | Armour 3 | Armour 2, foe with 2 statuses |
|---|---|---|---|---|---|
| **Pair of d2s** | 75% | 6.0 | 4.2 | 3.5 | 9.7 |
| **Pair of d4s** (Twinblades) | 44% | 6.7 | 4.7 | 3.9 | 11.3 |
| **d4 staff** (no crits) | — | 2.5 | 1.3 | 1.0 | 5.5 |
| **d6** | 17% | 4.2 | 2.7 | 2.2 | 10.6 |
| **d8** | 12% | 5.1 | 3.5 | 2.9 | 13.4 |
| **d10** | 10% | 6.1 | 4.4 | 3.7 | 16.3 |
| **Pair of d6s** (Kingslayer) | 31% | 8.4 | 6.4 | 5.5 | 14.8 |

Armour comes off the total once, so it hurts small dice most, and more dice shrug it off. Every status adds a whole die, so a d10 gains 5.5 a status where a d4 gains 3.3. Flat bonuses (+N damage, Training, the Whetstone) are worth most on small dice against armour.

### 3.2 The Weapons

Each hero starts with a tier 1 weapon. Better ones come from shops (70 / 120 / 180 gold for tiers 2 / 3 / 4), treasure, elites and events.

| Weapon | Class | Tier | Die | Runes and notes |
|---|---|---|---|---|
| **Longsword** | Fighter | 1 | d6 | A plain, trusty blade. |
| **Battleaxe** | Fighter | 2 | d8 | — |
| **Thunder Hammer** | Fighter | 2 | d6 | Thunder |
| **Flameforged Blade** | Fighter | 3 | d8 | Flame, Keen |
| **Titan's Maul** | Fighter | 4 | d10 | Thunder, Keen. Two-handed (no shield; this changes nothing since v0.27). |
| **Twinblades** | Rogue | 1 | d4, pair | 2 dice on every attack. |
| **Serrated Twinblades** | Rogue | 2 | d4, pair | Venom |
| **Duelist's Rapier** | Rogue | 2 | d6 | Keen |
| **Shadow Needles** | Rogue | 3 | d2, pair | Venom |
| **Kingslayer** | Rogue | 4 | d6, pair | Vicious, Venom |
| **Arcane Staff** | Wizard | 1 | d4 | A plain staff. Never crits. |
| **Staff of Reach** | Wizard | 2 | d4 | Long. Never crits. |
| **Emberstaff** | Wizard | 2 | d6 | Flame. Never crits. |
| **Frost Orb** | Wizard | 3 | d6 | Frost, Long. Never crits. |
| **Staff of the Magi** | Wizard | 4 | d6 | Long. Never crits. |
| **Iron Mace** | Cleric | 1 | d6 | Blunt and honest. |
| **Blessed Mace** | Cleric | 2 | d8 | Radiant |
| **Warding Censer** | Cleric | 2 | d6 | Warding |
| **Sunforged Flail** | Cleric | 3 | d8 | Radiant, Keen |
| **Relic of Dawn** | Cleric | 4 | d10 | Radiant, Warding |

**Staves never crit** (since v0.27; from v0.25 to v0.26 they did). The wizard's power is in the statuses his spells leave, not in his own dice. A staff's Flame or Frost rune still sets the damage type, but its crit effect never fires.

### 3.3 The Smith

Shops have a **smith**. Weapons found as loot can come with upgrades already.

| Service | Cost (TBC) | Effect |
|---|---|---|
| **Temper** | 40 / 80 / 160 gold (to d6 / d8 / d10+) | Ladder the weapon's die **up one step**. |
| **Hone** | 40 gold | Ladder the die **down one step** (not below d4, except the rogue's light weapons, which go down to a **d2**). |
| **Inscribe** | 60 gold | Put a **rune** into an empty socket. Plain weapons have **1 socket**; magic weapons (tier 3+) have **2**. Keen needs a d6 or larger; only one of Flame, Frost and Radiant; Twin only on a light weapon that is not already a pair. |
| **Remove** | 20 gold | Remove a rune (it is lost). |

### 3.4 Runes

Runes work on every attack and attacking power the weapon makes. A power's ladder step changes the die the runes roll on: Keen still needs a d6 or larger after the step.

| Rune | Effect |
|---|---|
| **Keen** | Crits on the top number **or one below it** (d6 or larger). |
| **Vicious** | The card says each crit gives **+1 more Mult**; since v0.27 it does nothing in the engine (Design Notes, known gaps). |
| **Steady** | Once a turn, reroll a weapon die that came up 1. |
| **Flame** | **Fire** damage. A crit makes the foe **Burning 2**. |
| **Frost** | **Cold** damage. A crit **Roots** the foe. |
| **Radiant** | **Radiant** damage: ×2 against the undead. |
| **Venom** | A crit makes the foe **Burning 2**. |
| **Thunder** | A crit **pushes** the foe 1 square (it can slam and be Stunned). |
| **Warding** | A hit shields you and allies beside you for **2**. |
| **Long** | 1 more square of reach or range (on basic attacks). |
| **Twin** | A light weapon becomes a **pair**: one more die on every attack. |

### 3.5 How Builds Come Together

A build is a weapon, a rune or two over a run, and the powers that make them sing. The best ones lean on **another class's set-ups**:

- A **needle rogue** (a pair of d2s) crits three times in four, and every crit brings another die. Venom adds Burning on a crit, one more status; *Backstab* then counts every status twice.
- A **thunder fighter** pushes foes on every crit. Each push can slam, and every slam **Stuns**, which sets up the rogue's *Assassinate* (×3).
- A **frost wizard** Roots foes, and with *Shatter* every ally's hit on them is ×2.
- A **blessing cleric** with *Radiance* gives a Blessed hero one more die and +2 damage, and every Bless she casts is +1 party momentum.

---

## Part 4 · Combos Between Classes

Who makes each set-up, and who cashes it in. Every status is **one more die** on every hit the foe takes, from anyone. *Bold* entries are the powers that pay it off (Parts 5 and 6).

| Set-up | Made by | Paid off by |
|---|---|---|
| **Burning** | Wizard (*Fire Bolt* 2, *Scorching Burst* 2 to an area, *Fireball* 3); Cleric (*Brand* 2); Flame and Venom runes; Ember Censer | Everyone: one more die, and damage at the start of its turn (ignores armour). |
| **Rooted** | Wizard (*Ray of Frost*); Frost rune | Everyone: one more die. Wizard **Shatter** (allies' hits ×2). |
| **Weakened** | Wizard (*Hex*, *Chain Hex* to an area); Fighter (*Sunder*); Rogue (*Quick Stab* crits) | Everyone: one more die; its own hits roll one fewer. |
| **Stunned** | Fighter (*Shove*, *Tide of Iron* slams and crits, *Crushing Blow* crits, *Earthshaker*); Wizard (*Force Push* slams); Thunder rune | Everyone: one more die, and it skips its turn. Rogue **Assassinate** (×3). |
| **Taunted** | Fighter (*Tide of Iron*, *Hook Chain*, *Shield Wall*) | Everyone: one more die, and the foe deals half damage to anyone but the fighter. |
| **Any status** | All of the above | Rogue **Backstab** (2 dice per status). Cleric **Judgment** (hits every foe with a status). |
| **Blessed** | Cleric (*Guidance*, *Bless*, *Smite* crits; **Radiance** +2 damage) | The Blessed hero: one more die on the next hit. |
| **Bloodied** | Damage | General **Finisher**; the Executioner's Hood (one more die each). |
| **Ally beside the foe** | Positioning | Rogue **Sneak Attack** (one more die). |

---

## Part 5 · The Classes

The four core classes. Each page ends with sample builds and the classes it combos with best. Attributes are the defaults of the ready-made hero. The **Modifiers** column is the power's card line with the hero's starting weapon; it shows the power's own dice, before the statuses on the target add theirs.

---

# ROGUE ⚔︎

*Cloak and dagger… and dagger.* The rogue is a streetwise survivor who strikes when no one is looking. She is the party's **finisher**: she cashes in the statuses her friends set up, rolling fistfuls of dice.

| | |
|---|---|
| **Role** | ⚔︎ Striker · ♦ |
| **Key stat** | ➶ DEX |
| **Attributes** | STR 2 · DEX 3 · INT 3 · PRE 1 |
| **Hit die / HP** | d8 / 32 |
| **SPD** | 4 |
| **Armour** | 0 (light armour) |
| **Weapons** | Light, Ranged |
| **Starting gear** | Twinblades (d4, pair) |

**Specialties:** locks, traps, pockets, sneaking past guards, spotting an ambush.

**Class features.**
- **Sneak Attack:** **one more die** against a foe that has one of her allies beside it.
- **Light armour:** Armour 0.

**Class powers.** *Blades* is her basic attack. Start with *Piercing Strike*; the rest come as rewards.

| Power | R | Tag | MP | Actions | Range | Modifiers (Twinblades) | Effect |
|---|---|---|---|---|---|---|---|
| **Blades** (basic) | — | — | 0 | 1 | 1 | 2d4 | Attack with your weapon die. |
| **Piercing Strike** | C | Burst | 1 | 1 | 1 | 3d4 · ignores armour | Ignores armour. |
| **Quick Stab** | C | Burst | 1 | 1 | 1 | 3d2 ▼ from d4 · Crit: Weaken | Small dice that crit often. |
| **Backstab** | C | Burst | 1 | 1 | 1 | 2d4 · 2 dice per status | Each status on the foe adds 2 dice instead of 1. |
| **Hit and Run** | C | Reach | 1 | 1 | 1 | 2d4 · +2 dmg | Then move up to 2 squares. |
| **Flurry** | U | Burst | 2 | 1 | 1 | 2d2 ▼ from d4 · ×3 hits · Crit: +1 action | Three hits. |
| **Shadowstep** | U | Reach | 2 | 1 | 5 | 2d4 · +2 dmg | Teleport beside a foe within 5 and attack it. |
| **Assassinate** | R | Burst | 3 | 1 | 1 | 3d6 ▲ from d4 · ×3 vs Stunned | Against a Stunned foe, ×3. |

*Engine notes:* each of *Flurry*'s three hits counts the foe's statuses again; her Bless is spent by the first, and the **+1 action** comes back once a round however many hits crit. Twinblades are already d4s, so *Quick Stab*'s ▼ steps the d4 down to d2; with a d6 Rapier (no pair) it rolls 2d4. *Opportunist* and *Counterattack* were removed in v0.27 with the other reactions.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Needle** | Twinblades honed to a pair of **d2s** + Venom | *Backstab*, *Flurry*, *Heavy Hitter* | Every 2 is a crit, and with Heavy Hitter each crit brings two more dice. Venom Burns on a crit: one more status for Backstab to double. |
| **The Assassin** | Duelist's Rapier (d6) + Keen | *Assassinate*, *Shadowstep*, *Finisher* | Wait for the fighter's Stun, teleport in, and hit for ×3. |
| **The Cashier** | Kingslayer (pair of d6s) | *Backstab*, *Piercing Strike*, *Opening Strike* | Let the party stack four statuses on the boss, then Backstab: ten more dice. |

**Combos best with:** the **wizard** (Burning, Rooted and Weakened for Backstab), the **fighter** (Stuns for Assassinate, Taunts; standing beside the foe for Sneak Attack), the **cleric** (Bless: one more die).

**Paths** (to be written): *Shadow* (stealth and ambush), *Duelist* (single foes and crits).

---

# FIGHTER ⬢

*A wall and a weapon.* The fighter holds the line and hurls foes into each other. She is the party's **wall**: she slams foes into things to Stun them, and Taunts them so they fight her instead of her friends.

| | |
|---|---|
| **Role** | ⬢ Tank · ♦ |
| **Key stat** | ♜ STR |
| **Attributes** | STR 3 · DEX 2 · INT 1 · PRE 3 |
| **Hit die / HP** | d10 / 40 |
| **SPD** | 3 |
| **Armour** | 2 (heavy armour and a shield) |
| **Weapons** | Light, Martial |
| **Starting gear** | Longsword (d6), shield, plate armour |

**Specialties:** forcing doors and bars, lifting and bracing, intimidating, soldiers and war.

**Class features.**
- **Heavy armour and a shield:** Armour 2 (every hit on her deals 2 less, at least 1).
- **Steadfast 1:** pushes move her 1 square less.
- **Taunt:** a foe she Taunts must attack her if it can reach her, and deals half damage to anyone else.

**Class powers.** *Sword* is her basic attack and *Shove* is innate. Start with *Tide of Iron*; the rest come as rewards.

| Power | R | Tag | MP | Actions | Range | Modifiers (Longsword) | Effect |
|---|---|---|---|---|---|---|---|
| **Sword** (basic) | — | — | 0 | 1 | 1 | d6 | Attack with your weapon die. |
| **Shove** (innate) | — | — | 0 | 1 | 1 | — | Push a foe 1 square. If it slams into something, it is Stunned. |
| **Tide of Iron** | C | Set-up | 1 | 1 | 1 | d8 ▲ from d6 · Crit: Stun | Push the foe 1 and step after it. It is Taunted. A slam Stuns it. |
| **Hook Chain** | C | Reach | 1 | 1 | 3 | d6 · +2 dmg | Range 3. Pull the foe 2 squares toward you. It is Taunted. |
| **Shield Wall** | C | Guard | 1 | 1 | self | — | You and allies beside you gain 6 Shield. Foes beside you are Taunted. |
| **Cleave** | C | Burst | 1 | 1 | self | d4 ▼ from d6 | Attack every foe beside you. |
| **Crushing Blow** | U | Burst | 2 | 1 | 1 | d10 ▲2 from d6 · +3 dmg · Crit: Stun | A huge swing. |
| **Sunder** | U | Set-up | 1 | 1 | 1 | d6 | The foe is Weakened: its attacks roll one fewer die. |
| **Anvil** | U | Set-up | — | passive | — | — | Your slams deal 3 more damage, and the foe is also Weakened. *(Engine: see the note.)* |
| **Earthshaker** | R | Set-up | 3 | 2 | self | — | 2 actions. Stun every foe beside you. |

*Engine notes:* Shield Wall reaches all 8 squares around her, both for the Shield and the Taunt; Cleave and Earthshaker hit only the 4 squares orthogonally beside her. **Anvil** does not yet do what its card says: in the v0.27 engine, once a round, when a foe she pushes or pulls ends beside another hero, that hero makes a free basic attack on it (the old v0.25 Anvil; the Sentinel Lens adds +3 to it). *Block*, *Intercept* and *Sentinel* were removed in v0.27 with the other reactions.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Bastion** | Longsword and shield + Warding | *Shield Wall*, *Hook Chain*, *Hardy* | Drag the threats to her and Taunt them: they hit everyone else for half, and every hit she lands shields her friends. |
| **The Breaker** | Titan's Maul (d10, Thunder, Keen) | *Tide of Iron*, *Crushing Blow*, *Earthshaker* | Crits Stun and push, pushes slam, slams Stun: a Stunned, Taunted foe is two dice for everyone. |
| **The Butcher** | Battleaxe tempered to d10 + Keen | *Cleave*, *Heavy Weapon*, *Heavy Hitter*, *Finisher* | Heavy Weapon cancels Cleave's ▼: big dice, big crits, against everything around her. |

**Combos best with:** the **rogue** (Stuns for *Assassinate*; standing beside her targets for Sneak Attack), the **wizard** (Force Push into her slams; his Burning and her Taunt on the same foe), the **cleric** (*Shield Wall* and Taunts keep the cleric standing).

**Paths** (to be written): *Bastion* (defence and shields), *Breaker* (forced movement and slams).

---

# WIZARD ❖

*A student of the arcane.* The wizard burns and freezes groups of foes, and moves the battlefield itself. He is the party's **setter**: his staff is weak, but every spell leaves a status, and every status is one more die for his friends.

| | |
|---|---|
| **Role** | ❖ Controller · ♦♦ |
| **Key stat** | ✦ INT |
| **Attributes** | STR 1 · DEX 3 · INT 3 · PRE 2 |
| **Hit die / HP** | d6 / 24 |
| **SPD** | 4 |
| **Armour** | 0 (no armour) |
| **Weapons** | Focus |
| **Starting gear** | Arcane Staff (d4) |

**Specialties:** magic items and runes, ancient writing, wards and rituals, strange beasts.

**Class features.**
- **Staves are weak:** a d4 that **never crits**. His power is the statuses his spells leave.
- **Force Adept:** his pushes and pulls move foes 1 extra square.
- **No armour:** Armour 0, so he likes to stay back.

**Class powers.** *Staff Bolt* is his basic attack and *Force Push* is innate. Start with *Fire Bolt*; the rest come as rewards. His damage powers roll his **staff's** die, which never crits.

| Power | R | Tag | MP | Actions | Range | Modifiers (Arcane Staff) | Effect |
|---|---|---|---|---|---|---|---|
| **Staff Bolt** (basic) | — | — | 0 | 1 | 4 | d4 | Range 4. A weak bolt: a d4 that never crits. |
| **Force Push** (innate) | — | — | 0 | 1 | 4 | — | Range 4. Push a foe 1 square. If it slams into something, it is Stunned. |
| **Fire Bolt** | C | Set-up | 1 | 1 | 5 | d4 | Range 5. The foe is Burning 2. Fire. |
| **Hex** | C | Set-up | 1 | 1 | 5 | — | Range 5. The foe is Weakened: its attacks roll one fewer die. |
| **Ray of Frost** | C | Set-up | 1 | 1 | 4 | d4 | Range 4. The foe is Rooted: it can't move on its next turn. Cold. |
| **Scorching Burst** | C | Burst | 2 | 1 | 5, 3×3 | d4 | Range 5, 3×3. Every foe in the area is Burning 2. Fire. |
| **Magic Missile** | C | Burst | 1 | 1 | 6 | d4 · ×3 hits | Range 6. Three hits: each one rolls the extra dice for the foe's statuses. |
| **Blink** | C | Reach | 1 | free | 3 | — | Free action. Teleport up to 3 squares. |
| **Chain Hex** | U | Set-up | 2 | 1 | 5, 3×3 | — | Range 5, 3×3. Every foe in the area is Weakened. |
| **Lingering Magic** | U | Set-up | — | passive | — | — | The statuses you inflict last one more turn. |
| **Shatter** | R | Set-up | — | passive | — | — | Allies' hits against a foe you Rooted deal ×2. |
| **Fireball** | R | Burst | 3 | 2 | 4, 3×3 | 2d6 ▲ from d4 | 2 actions. Range 4, 3×3. Every foe in the area Burns 3. Fire. |

*Engine notes:* the wizard's own spells already count the statuses he has set (the second spell on a Burning foe rolls 2 dice), but that is never a combo. *Fire Bolt*'s card says "2 damage for 2 turns": Burning 2 deals 2, then 1. *Lingering Magic* lengthens the Rooted and Weakened his spells give; Burning already counts down by its number, and a Force Push Stun is not lengthened. With Force Adept, Force Push moves a foe 2 squares. *Amplify* became *Lingering Magic*, and *Repelling Ward* was removed with the other reactions, in v0.27.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Hexer** | Arcane Staff + Long | *Hex*, *Chain Hex*, *Lingering Magic* | Weaken a whole pack for two turns: they hit softer, and every hit on them rolls one more die. |
| **The Frost Lock** | Frost Orb (Frost, Long) | *Ray of Frost*, *Shatter* | Root the biggest threat; every ally's hit on it is doubled. |
| **The Pyromancer** | Emberstaff (Flame) | *Fire Bolt*, *Scorching Burst*, *Fireball* | Burn a crowd: Burning adds up and ignores armour, and it is one more die on each of them. |

**Combos best with:** the **rogue** (statuses for *Backstab*; Shatter doubles her), the **fighter** (Force Push into her slams; her Taunt on his Burning foe), the **cleric** (*Judgment* hits every foe he gave a status).

**Paths** (to be written): *Elementalist* (fire, ice, lightning), *Warper* (space, pushing and pulling).

---

# CLERIC ✚

*A servant of the divine.* The cleric heals, shields, and blesses allies so their next blow lands harder. She is the **heart of the party**: the only healer, and her blessings, heals and shields are where the party's momentum comes from.

| | |
|---|---|
| **Role** | ✚ Support · ♦♦ |
| **Key stat** | ♛ PRE |
| **Attributes** | STR 3 · DEX 1 · INT 2 · PRE 3 |
| **Hit die / HP** | d8 / 32 |
| **SPD** | 3 |
| **Armour** | 1 (medium armour and a shield) |
| **Weapons** | Light, Ranged |
| **Starting gear** | Iron Mace (d6), shield, chain armour |

**Specialties:** healing the sick, spirits and the undead, shrines and holy relics, telling truth from lies.

**Class features.**
- **Medium armour and a shield:** Armour 1.
- **The party's only healer.** No other hero heals in battle.
- **Channel Divinity:** her heals heal **+3**, and her attacks deal **radiant** damage (×2 against the undead).

**Class powers.** *Mace* is her basic attack and *Guidance* is innate. Start with *Healing Word*; the rest come as rewards. Powers marked **+1 ◆** give the party 1 momentum each time.

| Power | R | Tag | MP | Actions | Range | Modifiers (Iron Mace) | Effect |
|---|---|---|---|---|---|---|---|
| **Mace** (basic) | — | — | 0 | 1 | 1 | d6 | Attack with your weapon die. |
| **Guidance** (innate) | — | — | 0 | 1 | 3 | — | Range 3. An ally is Blessed: their next hit rolls one more die. **+1 ◆** |
| **Healing Word** | C | Mend | 0 | 1 | 4 | — | Range 4. An ally heals d8 + 3. **+1 ◆** |
| **Brand** | C | Set-up | 1 | 1 | 1 | d6 | Holy fire: the foe is Burning 2. |
| **Smite** | C | Burst | 1 | 1 | 1 | d8 ▲ from d6 · +1 dmg · Crit: Bless allies | A holy blow. |
| **Bless** | C | Set-up | 0 | 1 | self, 2 | — | You and allies within 2 are Blessed: your next hits roll one more die. **+1 ◆** |
| **Sanctuary** | C | Guard | 0 | 1 | 4 | — | Range 4. An ally gains 8 Shield. **+1 ◆** |
| **Divine Shift** | C | Guard | 0 | 1 | 4 | — | Swap places with an ally within 4. You both gain 4 Shield. **+1 ◆** |
| **Radiance** | U | Set-up | — | passive | — | — | Allies you Bless also deal +2 damage on that hit. |
| **Prayer of Healing** | U | Mend | 1 | 1 | self, 2 | — | You and allies within 2 heal 4 + 3. **+1 ◆** |
| **Revivify** | U | Mend | 2 | 1 | self | — | A Down ally stands up beside you with 2 rolls of their hit die. |
| **Judgment** | R | Burst | 3 | 2 | self, 4 | 2d8 ▲ from d6 | 2 actions. Attack every foe within 4 that has a status. |

*Engine notes:* the Bless she gives herself is not a combo (only another hero's Bless is), and a Bless left unused fades when the heroes' turn ends. *Radiance*'s +2 also applies when she Blesses herself. *Smite*'s crit Blesses every ally within 2 but not her. Healing Word's and Prayer's +3 is Channel Divinity; *Mender's Thread* adds 3 more to each. Revivify cannot pick its target: the engine stands up the last Down hero in the party's order. *Warding Word* was removed with the other reactions in v0.27.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Kingmaker** | Iron Mace + Warding | *Guidance*, *Bless*, *Radiance* | Bless the rogue and the fighter every turn: one more die and +2 damage each, +1 momentum for every Bless, and a combo when they hit. |
| **The Judge** | Sunforged Flail (Radiant, Keen) | *Brand*, *Judgment*, *Finisher* | Let the wizard spread his statuses, then strike every foe that carries one at once. |
| **The Mender** | Relic of Dawn (Radiant, Warding) | *Healing Word*, *Prayer of Healing*, *Sanctuary*, *Revivify* | Keep everyone up and the momentum flowing; every hit shields the front line. |

**Combos best with:** the **rogue** (Bless on a many-dice hit), the **wizard** (*Judgment* cashes in his Chain Hex and Scorching Burst), the **fighter** (Shields keep the wall up while she Taunts).

**Paths** (to be written): *Mender* (healing and shields), *Zealot* (radiant and judgment).

---

## Part 6 · General Powers

Any class can take these.

### Burst

| Power | R | Effect |
|---|---|---|
| **Opening Strike** | C | Your first attack in each battle rolls one more die and deals +3 damage. |
| **Finisher** | C | Your hits on a bloodied foe (half health or less) roll one more die. |
| **Heavy Weapon** | C | Your weapon die is one step bigger on every attack (d6 to d8). |
| **Brutal** | C | When your hit crits, +3 damage. |
| **Precision** | U | Your weapon die is one step smaller (d6 to d4), but crits on its top two numbers. |
| **Heavy Hitter** | U | Each crit rolls two more dice instead of one. |
| **Overkill** | U | When your hit drops a foe, the extra damage hits another foe beside it. |
| **Glass Cannon** | R | Your hits roll one more die, and so do foes' hits on you. |

### Guard

| Power | R | Effect |
|---|---|---|
| **Hardy** | C | +6 maximum health. |
| **Last Stand** | R | Once a battle, when you would go Down, stay at 1 health with 6 Shield. |

### Reach

| Power | R | Effect |
|---|---|---|
| **Quick Feet** | C | +1 speed. |
| **Hard Shove** | C | Your pushes and pulls move 1 square further. |

### Surge

| Power | R | Effect |
|---|---|---|
| **Eager** | C | The party starts each battle with +1 momentum. |
| **Adrenaline** | C | The first time you are hit each battle, the party gains 1 momentum. |
| **Conductor** | R | Your combos give the party 1 more momentum. |

*Engine notes:* *Opening Strike* counts for every hit of your first attacking power (all three of Magic Missile's, every foe a Cleave hits). *Precision* on a d4 steps it to a d2, which already crits on its top two numbers. *Brace* (Guard), *Field Medic* and *Quick Revive* (Mend) were removed in v0.27; there are no general Mend powers now.

---

## Part 7 · A Round That Clicks

The party, early in region II, against a **Barrow Zombie** (armour 1, no Steadfast, about 20 health at this depth) standing in front of a gravestone. It is the heroes' turn: all four act before the zombie does, in any order the player likes. The party has **2 momentum**.

- **Wizard:** Arcane Staff; *Fire Bolt*, *Ray of Frost*.
- **Fighter:** Longsword; *Shove* (innate).
- **Rogue:** Twinblades (pair of d4s); *Backstab*.
- **Cleric:** *Bless*, *Healing Word*.

1. **Cleric first:** *Bless* (0 MP): she and Vex, within 2, are **Blessed**: **+1 ◆** (3). Then *Healing Word* on Brakka, hurt last round: d8 rolls 5, + 3 = 8 health: **+1 ◆** (4).
2. **Wizard:** *Fire Bolt* (1 MP, 3 left): his staff rolls a 3 (staves never crit) − 1 armour = **2 damage**, and the zombie is **Burning 2**. Then *Ray of Frost* (1 MP, 2 left): one status on it already, so 2d4: 2 + 4 = 6 − 1 = **5 damage**, and it is **Rooted**. His own statuses add dice to his spells, but they are not combos.
3. **Fighter:** she steps beside the zombie and *Shoves* it (0 MP) into the gravestone: it **slams** for one roll of her d6 (3, ignoring armour) and is **Stunned**. Shove deals no damage of its own, so it cashes in nothing; it sets up. Her last action has nothing better to do and is lost.
4. **Rogue last:** *Backstab* (1 MP, 1 left), Blessed, with Brakka beside the zombie. Three statuses (Burning, Rooted, Stunned): 2 dice (the power and the pair) + 2 × 3 + 1 Blessed + 1 Sneak Attack = **10d4**. She rolls 4 2 1 3 4 3 2 2 4 1 = 26; three 4s crit, so three more dice: 2, 4, 1; that 4 crits again: 3. 26 + 10 = 36 − 1 armour = **35 damage**, and a **combo** (+1 ◆, 2): Orin's, Brakka's and Sela's set-ups, one combo for the action.

One round: four set-ups from three heroes, each one word on the zombie's badge, turned a pair of d4s into fourteen dice, and the cleric's support paid for the wizard's spells. The zombie had taken 10 damage before Vex struck; nothing acted in between.

---

# Hybrid Classes (Coming Later)

Hybrids mix two roles. Everything here is a first guess (**TBC**); their powers are not written yet. Martial hybrids follow the same rule: **damage comes from the weapon** and the power's modifiers.

| Class | Roles | Key stat | Hit die | Armour | Weapons | Starting weapon |
|---|---|---|---|---|---|---|
| **Paladin** | ⬢ ✚ | ♜ STR | d10 | Heavy + shield | Light, Martial | Warhammer (d6) |
| **Bard** | ⚔︎ ✚ | ♛ PRE | d8 | Light | Light, Ranged | Hand crossbow (d6, range 3) |
| **Barbarian** | ⚔︎ ⬢ | ♜ STR | d12 | Light | Martial | Greataxe (d8, two-handed) |
| **Ranger** | ⚔︎ ❖ | ➶ DEX | d8 | Light | Light, Ranged | Longbow (d6, range 5) |
| **Druid** | ✚ ❖ | ✦ INT | d8 | None | Focus | Thorn Staff (d6, range 4, no crits) |
| **Monk** | ⬢ ❖ | ➶ DEX | d8 | None | Light, unarmed | Iron Wraps (d6) |

- **Paladin.** A holy knight. Lays on hands, smites evil, takes blows meant for the faithful. *Specialties:* oaths, the undead, nobles and courts.
- **Bard.** A performer and keeper of lore. *First power:* **Inspire** (C, Set-up, 1 MP, free, range 5): an ally is Blessed, or ends one status. *Specialties:* lore, music, persuasion, bluffing.
- **Barbarian.** A wild fighter who rages through pain and grows fiercer when **bloodied**. *Specialties:* smashing, climbing, the wild.
- **Ranger.** A hunter and scout. Starts with a **wolf or hawk** companion (Core 3.13, parked). *Specialties:* tracking, scouting, beasts.
- **Druid.** A keeper of the wild. Starts with a **wolf or mule** companion. *Specialties:* herbs, beasts and spirits, weather.
- **Monk.** A martial artist who strikes pressure points to Stun. *Specialties:* balance, meditation, endurance.
- **Sword saint** (concept) · ⚔︎ · ➶ DEX · d8. A duelist who reads a foe and ends it with one perfect cut.

---

## The Level Rhythm (parked)

> [!note] Levels are parked (v0.23). Heroes no longer level up: each starts with their class features and grows through rewards (Core 4.2). Paths, attribute steps and later features are not in play (the **Training** reward now gives +1 damage instead of +1 attribute, v0.26). The table is kept for when paths return, perhaps as rare rewards.

| Level | What a class gains |
|---|---|
| **1** | Class features, innate powers, one class power (there are no reaction powers since v0.27) |
| **2** | A class feature |
| **3** | A path |
| **4** | +1 attribute |
| **5** | A class feature and a path feature |
| **6 to 10** | A path feature at 7, +1 attribute at 8, a class feature at 9, a capstone at 10 |
| **Every level** | +1 power slot (to 8) and a power draft |
