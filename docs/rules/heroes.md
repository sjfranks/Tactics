---
title: Rogue Tactics 1e — Heroes
version: 0.26
book: 2 of 3 (Core Rules · Heroes · Bestiary)
tags: [game-design, rulebook, roguelite, tactics, classes, powers]
---

# Rogue Tactics 1e — Heroes

> v 0.26 "Damage × Mult". Book 2 of 3. The classes, their **powers**, and how weapons and powers grow during a run. Basic rules are in [Core Rules](core-rules.md). **Powers and numbers are drafts (TBC).**
>
> **The idea of this book:** the basic rules stay simple. Every hit is **DAMAGE × MULT** (Core 3.5). Every attacking power is **your weapon die plus a few standard modifiers**, shown as one line on its card: a **ladder step** (▲ bigger dice, ▼ more crits), more **dice** or **hits**, **+N damage**, **+N Mult**, or a **Crit:** trigger. Other powers change one number: **Mult** on a foe, **Bless** on a friend, a **Stun**, or a **×**. Attributes add nothing in battle. The depth comes from how your four heroes' numbers feed each other.

---

## Part 1 · Choose Your Party

A party of four works best with one hero in each **role**. The default party is the **rogue, fighter, wizard and cleric**.

| Role | Icon | What it does | Its job in the combo game |
|---|---|---|---|
| **Striker** | ⚔︎ | Fast, hits hard, fragile. | **Cashes in** the Mult and Stuns her friends set up, for the biggest hits in the game. |
| **Tank** | ⬢ | Tough, draws attacks, fights up close. | **Stuns** foes with slams and **Taunts** them so they fight her. |
| **Controller** | ❖ | Moves and burns foes; hits groups. | **Multiplies**: every spell leaves foes with **Mult**. |
| **Support** | ✚ | Heals, shields and buffs. | **Blesses** friends (+damage) and keeps them standing. |

| Class | Role | Key stat | Hit die | Defend die | SPD | Complexity |
|---|---|---|---|---|---|---|
| **Rogue** (Vex) | ⚔︎ Striker | ➶ DEX | d8 | d4 | 4 | ♦ |
| **Fighter** (Brakka) | ⬢ Tank | ♜ STR | d10 | d8 +2 shield | 3 | ♦ |
| **Wizard** (Orin) | ❖ Controller | ✦ INT | d6 | d4 | 4 | ♦♦ |
| **Cleric** (Sela) | ✚ Support | ♛ PRE | d8 | d6 +2 shield | 3 | ♦♦ |

**Complexity** (♦) is how much a class juggles. ♦ is a good first class.

The **key stat** is the class's best attribute. Since v0.26 attributes add **nothing in battle**: they are rolled for checks out of battle (Core 1.3) and initiative (DEX), and STR adds to Catch Breath healing out of battle.

**Each class page has:** a stat table; its **specialties** (event options only it unlocks, Core 1.3); its **class features**; its **class powers**; sample **builds**; and the classes it **combos** with best.

---

## Part 2 · Powers

A **power** is anything a hero learns during a run. Every power is either:

| Kind | What it is | Example |
|---|---|---|
| **Active** | You **use** it on your turn. It costs **MP** (Core 3.7) and **actions**. | *Hex:* 1 MP, 1 action. Range 5. The foe gains +2 Mult. |
| **Passive** | It is **always on**, or **triggers by itself**. No MP, no action. | *Heavy Hitter:* each crit gives +2 Mult instead of +1. |

Powers come from two lists: **class powers** (on each class page; only that class) and **general powers** (Part 6; any class). Every hero also has **innate** powers that take no slot (Part 2.1).

### 2.1 Slots, Rewards and Drafts

- **Innate powers** (no slot, no MP): every hero's **basic attack** (Sword, Blades, Staff Bolt, Mace), **Second Wind** and **Help Up**; the fighter's **Shove**, the wizard's **Force Push**, the cleric's **Guidance**.
- **Slots.** A hero has **8** power slots. Active and passive powers share them. *(Phone screens show active powers as buttons; at most 6 actives fit, TBC.)*
- **Start.** Each hero has their innate powers and **one class power**: Brakka *Tide of Iron*, Vex *Piercing Strike*, Orin *Hex*, Sela *Healing Word*. Everything else comes from rewards, so the first battles stay simple.
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

- **Active powers** cost the MP and actions they list (1 action unless it says **2 actions**). **Free** powers cost no action. **Reaction** powers cost **1 ready action** on someone else's turn, **once per round** each, and the game always asks first.
- **Attacking powers** roll **your weapon's die** (one more with a **pair** weapon), changed by the power's **modifiers** (2.2.1), then DAMAGE × MULT as for any hit (Core 3.5). Attributes add nothing. **A better weapon makes every attacking power better** (Part 3).
- **Every effect is one number:** **+N Mult** on a foe (spent by the next hero hit on it), **Bless N** on an ally (+N damage on their next hit), **Stun**, **Root**, **Burn N**, **Taunt**, **Shield N**, or a **×** on the hit (*Assassinate* ×3, *Shatter* ×2).
- **No saves.** A power's effects happen on every target it hits. Bosses turn a Stun into +2 Mult and ignore Root.
- **Basic attacks** cost no MP and can be used as often as you have actions; the first each turn gives +1 MP.

#### 2.2.1 Power Modifiers

Every attacking power is the weapon die plus some of these **standard modifiers**, and nothing else. The card shows them as one line, worked out for the hero's own weapon: *Tide of Iron* with a Longsword reads **d8 ▲ from d6 · Crit: Stun**.

| Modifier | On the card | What it does |
|---|---|---|
| **Ladder step** | ▲ / ▼ (▲2, ▼2 for two steps) | Moves the weapon die along **d2 · d4 · d6 · d8 · d10 · d12** (it stops at the ends). ▲ hits harder but crits less often; ▼ hits softer but crits more. |
| **Dice** | 2d6, 3d4 … | How many weapon dice the power rolls (one more with a pair weapon). Every die can crit. |
| **Hits** | ×3 hits | The power hits that many times; each hit rolls its own dice and can crit. The foe's Mult and your Bless are spent by the first hit. |
| **+N damage** | +2 dmg | Flat damage, added before armour. |
| **+N Mult** | +1 Mult | Mult on this hit. |
| **Crit trigger** | Crit: … | Something extra when at least one of the hit's dice crits (below). |
| **Other** | ignores armour · foe's Mult ×2 · ×3 vs Stunned | A few powers keep one named rule of their own. |

| Crit trigger | Effect |
|---|---|
| **Stun** | The foe is Stunned (a boss gains +2 Mult instead). |
| **Root** | The foe is Rooted. |
| **Burn N** | The foe Burns N more. |
| **foe +N Mult** | The foe gains +N Mult after the hit, for the next hero's hit. |
| **push N** | Push the foe N squares (it can slam). |
| **+N Mult** | +N more Mult on this hit. |
| **+N dmg** | +N more damage on this hit. |
| **allies Bless N** | You and allies within 2 gain Bless N. |
| **+1 action** | Get one action back, once a round. |

Some passive powers change every attack instead: *Heavy Weapon* (▲1), *Precision* (▼1, +1 Mult per crit), *Brutal* (+3 damage on a crit), *Heavy Hitter* (+2 Mult per crit) (Part 6).

### 2.3 Your Set-up, Their Payoff

"A foe **you** Rooted" (or Stunned, or gave Mult) means the status came from you. **Allies** get the payoff: a hit that cashes in another hero's Mult, Stun or Bless is a **combo**, +2 MP for each hero involved (Core 3.8). You never combo off your own set-up.

### 2.4 Tags

Every class and general power has one **tag**: **Set-up**, **Burst**, **Guard**, **Reach**, **Surge** or **Mend**. Since v0.25 tags only sort powers on the cards and in the compendium. **Resonance is retired**: the party no longer gains bonuses for holding 4 or 8 powers of one tag.

---

## Part 3 · Weapons and Upgrades

### 3.1 The Weapon Is the Engine

Every hit in the game is weapon dice plus flat bonuses, times MULT (Core 3.5). Powers ladder the die, add **dice** and **hits**, and every die that lands on its **top number** is a **crit**: it turns red and adds **+1 Mult**. So your weapon's die decides what kind of hero you are: small dice crit often, big dice deal more damage.

| Die | Crit chance per die | Plays like |
|---|---|---|
| **d2** | 50% | Every 2 is a crit. A pair of d2s crits three times in four. Built for Mult. |
| **d4** | 25% | Quick and crit-happy. Daggers, twinblades, staffs. |
| **d6** | 17% (33% with Keen) | The all-rounder. |
| **d8** | 12% (25% with Keen) | Heavy and steady. |
| **d10** | 10% (20% with Keen) | Big, reliable hits; extra dice from powers are huge. |
| **d12** | 8% (17% with Keen) | Rare legendary weapons. |

Average damage of one basic attack with no flat bonuses (exact, from the dice; attributes add nothing since v0.26):

| Weapon | At least one crit | Armour 0 | Armour 2 | Armour 3 | Armour 2, foe with Mult 2 |
|---|---|---|---|---|---|
| **Pair of d2s** | 75% | 6.5 | 2.8 | 2.0 | 5.3 |
| **Pair of d4s** (Twinblades) | 44% | 8.3 | 5.3 | 4.0 | 11.4 |
| **d6** | 17% | 4.5 | 2.7 | 2.0 | 6.7 |
| **d8** | 12% | 5.5 | 3.6 | 2.9 | 9.4 |
| **d10** | 10% | 6.5 | 4.6 | 3.8 | 12.2 |
| **Pair of d6s** (Kingslayer) | 31% | 10.2 | 7.5 | 6.3 | 17.6 |

Armour comes off the damage, so it hurts small dice most; Mult multiplies the damage, so it rewards big ones. Every flat bonus (+N damage, Bless, Training, the Whetstone) is worth most on small dice against armour. Neither is always best, which is the point.

### 3.2 The Weapons

Each hero starts with a tier 1 weapon. Better ones come from shops (70 / 120 / 180 gold for tiers 2 / 3 / 4), treasure, elites and events.

| Weapon | Class | Tier | Die | Runes and notes |
|---|---|---|---|---|
| **Longsword** | Fighter | 1 | d6 | A plain, trusty blade. |
| **Battleaxe** | Fighter | 2 | d8 | — |
| **Thunder Hammer** | Fighter | 2 | d6 | Thunder |
| **Flameforged Blade** | Fighter | 3 | d8 | Flame, Keen |
| **Titan's Maul** | Fighter | 4 | d10 | Thunder, Keen. Two-handed (no shield on Defend). |
| **Twinblades** | Rogue | 1 | d4, pair | 2 dice on every attack. |
| **Serrated Twinblades** | Rogue | 2 | d4, pair | Venom |
| **Duelist's Rapier** | Rogue | 2 | d6 | Keen |
| **Shadow Needles** | Rogue | 3 | d2, pair | Venom |
| **Kingslayer** | Rogue | 4 | d6, pair | Vicious, Venom |
| **Arcane Staff** | Wizard | 1 | d4 | A plain staff. |
| **Staff of Reach** | Wizard | 2 | d4 | Long |
| **Emberstaff** | Wizard | 2 | d6 | Flame |
| **Frost Orb** | Wizard | 3 | d6 | Frost, Long |
| **Staff of the Magi** | Wizard | 4 | d8 | Keen, Long |
| **Iron Mace** | Cleric | 1 | d6 | Blunt and honest. |
| **Blessed Mace** | Cleric | 2 | d8 | Radiant |
| **Warding Censer** | Cleric | 2 | d6 | Warding |
| **Sunforged Flail** | Cleric | 3 | d8 | Radiant, Keen |
| **Relic of Dawn** | Cleric | 4 | d10 | Radiant, Warding |

Staffs crit like any other weapon (since v0.25; they used to never miss and never crit).

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
| **Vicious** | Each crit gives **+1 more Mult**. |
| **Steady** | Once a turn, reroll a weapon die that came up 1. |
| **Flame** | **Fire** damage. A crit makes the foe **Burn 2**. |
| **Frost** | **Cold** damage. A crit **Roots** the foe. |
| **Radiant** | **Radiant** damage: ×2 against the undead. |
| **Venom** | A crit makes the foe **Burn 2**. |
| **Thunder** | A crit **pushes** the foe 1 square (it can slam and be Stunned). |
| **Warding** | A hit shields you and allies beside you for **2**. |
| **Long** | 1 more square of reach or range (on basic attacks). |
| **Twin** | A light weapon becomes a **pair**: one more die on every attack. |

### 3.5 How Builds Come Together

A build is a weapon, a rune or two over a run, and the powers that make them sing. The best ones lean on **another class's set-ups**:

- A **needle rogue** (a pair of d2s) crits three times in four, so every swing already has Mult 2 or 3. Give her a foe with the wizard's **Hex** and *Backstab* doubles it.
- A **thunder fighter** pushes foes on every crit. Each push can slam, and every slam **Stuns**, which sets up the rogue's *Assassinate* (×3).
- A **frost wizard** Roots foes, and with *Shatter* every ally's hit on them is ×2.
- A **blessing cleric** with *Radiance* gives Bless 5 at a time: on a twin-blade rogue with three crits, those 5 damage are worth 20.

---

## Part 4 · Combos Between Classes

Who makes each set-up, and who cashes it in. *Bold* entries are the powers that pay it off (Parts 5 and 6).

| Set-up | Made by | Paid off by |
|---|---|---|
| **Mult** | Wizard (*Staff Bolt* +1, *Hex* +2, *Chain Hex* +1 to an area, *Ray of Frost* +2 on a crit, **Amplify** +1 to each); Cleric (*Brand* +1); Fighter (**Anvil**: +2 when she Stuns) | Everyone: +N MULT on the next hit. Rogue **Backstab** (counts double). Cleric **Judgment** (hits every foe with Mult). |
| **Stunned** | Fighter (*Shove*, *Tide of Iron* slams and crits, *Crushing Blow* crits, *Earthshaker*); Wizard (*Force Push* slams); Thunder rune | Everyone: it skips its turn, and hitting it is a combo. Rogue **Assassinate** (×3). |
| **Bless** | Cleric (*Guidance* 3, *Bless* 3, *Smite* 2 on a crit; **Radiance** +2) | Everyone: +N damage. |
| **Rooted** | Wizard (*Ray of Frost*); Frost rune | Wizard **Shatter** (allies' hits ×2). |
| **Burn** | Wizard (*Scorching Burst* 2, 4 on a crit; *Fireball* 3); Flame and Venom runes; Ember Censer | Damage every turn, ignoring armour. |
| **Taunted** | Fighter (*Tide of Iron*, *Hook Chain*, *Shield Wall*, *Sentinel*) | Everyone: the foe deals half damage to anyone but the fighter. |
| **Bloodied** | Damage | General **Finisher**; the Executioner's Hood (+1 Mult each). |
| **Ally beside the foe** | Positioning | Rogue **Sneak Attack** (+1 Mult), **Opportunist**. |

---

## Part 5 · The Classes

The four core classes. Each page ends with sample builds and the classes it combos with best. Attributes are the defaults of the ready-made hero.

---

# ROGUE ⚔︎

*Cloak and dagger… and dagger.* The rogue is a streetwise survivor who strikes when no one is looking. She is the party's **finisher**: she cashes in the Mult and Stuns her friends set up, for the biggest hits in the game.

| | |
|---|---|
| **Role** | ⚔︎ Striker · ♦ |
| **Key stat** | ➶ DEX |
| **Attributes** | STR 2 · DEX 3 · INT 3 · PRE 1 |
| **Hit die / HP** | d8 / 32 |
| **SPD** | 4 |
| **Defend** | d4 (light armour). No shield. |
| **Weapons** | Light, Ranged |
| **Starting gear** | Twinblades (d4, pair) |

**Specialties:** locks, traps, pockets, sneaking past guards, spotting an ambush.

**Class features.**
- **Sneak Attack:** **+1 Mult** against a foe that has one of her allies beside it.
- **Light armour:** Defend rolls a d4.

**Class powers.** *Blades* is her basic attack. Start with *Piercing Strike*; the rest come as rewards.

| Power | R | Tag | MP | Actions | Range | Modifiers (Twinblades) | Effect |
|---|---|---|---|---|---|---|---|
| **Blades** (basic) | — | — | 0 | 1 | 1 | 2d4 | Attack with your weapon die. |
| **Piercing Strike** | C | Burst | 1 | 1 | 1 | 3d4 · ignores armour | Ignores armour. |
| **Quick Stab** | C | Burst | 1 | 1 | 1 | 3d2 ▼ from d4 · Crit: +2 Mult | Tiny dice that crit often. |
| **Backstab** | C | Burst | 1 | 1 | 1 | 2d4 · foe's Mult ×2 | The foe's Mult counts double. |
| **Hit and Run** | C | Reach | 1 | 1 | 1 | 2d4 · +2 dmg | Then move up to 2 squares. |
| **Flurry** | U | Burst | 2 | 1 | 1 | 2d2 ▼ from d4 · ×3 hits · Crit: +1 action | Three hits. |
| **Shadowstep** | U | Reach | 2 | 1 | 5 | 2d4 · +1 Mult | Teleport beside a foe within 5 and attack it. |
| **Opportunist** | U | Burst | — | reaction | 1 | — | Reaction (1 ready action, once a round): an ally hits a foe beside you. Attack it too. |
| **Counterattack** | U | Guard | — | reaction | 1 | — | Reaction (1 ready action, once a round): a foe hits you in melee. Attack it back. |
| **Assassinate** | R | Burst | 3 | 1 | 1 | 3d6 ▲ from d4 · ×3 vs Stunned | Against a Stunned foe, ×3. |

*Engine notes:* Opportunist does not strike a Stunned foe; Counterattack does not answer area attacks. With *Flurry*, the foe's Mult and your Bless are spent by the first of the three hits, and its **+1 action** comes back once a round however many hits crit. Twinblades are already d4s, so *Quick Stab*'s ▼ steps the d4 down to d2; with a d6 Rapier it rolls 2d4.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Needle** | Twinblades honed to a pair of **d2s** + Venom | *Backstab*, *Flurry*, *Heavy Hitter* | Three crits in four swings, each worth +2 Mult with Heavy Hitter. Every crit also Burns. |
| **The Assassin** | Duelist's Rapier (d6) + Keen | *Assassinate*, *Shadowstep*, *Finisher* | Wait for the fighter's Stun, teleport in, and hit for ×3. |
| **The Cashier** | Kingslayer (pair of d6s, Vicious) | *Backstab*, *Piercing Strike*, *Opening Strike* | Let the wizard stack Mult on the boss, then Backstab: the stack counts twice. |

**Combos best with:** the **wizard** (Hex for Backstab), the **fighter** (Stuns for Assassinate; standing beside the foe for Sneak Attack), the **cleric** (Bless on a many-crit hit).

**Paths** (to be written): *Shadow* (stealth and ambush), *Duelist* (single foes and crits).

---

# FIGHTER ⬢

*A wall and a weapon.* The fighter holds the line, hurls foes into each other and takes the blow meant for a friend. She is the party's **wall**: she slams foes into things to Stun them, and Taunts them so they fight her instead of her friends.

| | |
|---|---|
| **Role** | ⬢ Tank · ♦ |
| **Key stat** | ♜ STR |
| **Attributes** | STR 3 · DEX 2 · INT 1 · PRE 3 |
| **Hit die / HP** | d10 / 40 |
| **SPD** | 3 |
| **Defend** | d8 (heavy armour) **+2** (shield) |
| **Weapons** | Light, Martial |
| **Starting gear** | Longsword (d6), shield, plate armour |

**Specialties:** forcing doors and bars, lifting and bracing, intimidating, soldiers and war.

**Class features.**
- **Heavy armour and a shield:** Defend rolls a d8 +2 (no +2 with a two-handed weapon).
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
| **Anvil** | U | Set-up | — | passive | — | — | When you Stun a foe, it also gains +2 Mult. Once a round, a foe you push next to an ally takes a free hit from them. |
| **Block** | U | Guard | — | passive | — | — | Allies beside you add +2 when they Defend. |
| **Intercept** | U | Guard | — | reaction | 1 | — | Reaction (1 ready action, once a round): a foe attacks an ally beside you. You take the attack instead. |
| **Sentinel** | U | Guard | — | reaction | 1 | basic attack | Reaction (1 ready action, once a round): a foe moves away from beside you. Attack it; it stops and is Taunted. |
| **Earthshaker** | R | Set-up | 3 | 2 | self | — | 2 actions. Stun every foe beside you. |

*Engine notes:* Shield Wall reaches all 8 squares around her. Intercept does not cover area attacks. *Anvil*'s free hit is the ally's basic attack, once a round, when a foe she pushes or pulls ends beside that ally.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Bastion** | Longsword and shield + Warding | *Shield Wall*, *Block*, *Sentinel*, *Intercept* | Nothing gets past. Every hit shields your friends; Taunted foes hit everyone else for half. |
| **The Breaker** | Titan's Maul (d10, Thunder, Keen) | *Tide of Iron*, *Crushing Blow*, *Anvil*, *Earthshaker* | Crits Stun and push, pushes slam, slams Stun, and every Stun brings +2 Mult with it. |
| **The Butcher** | Battleaxe tempered to d10 + Vicious | *Cleave*, *Heavy Weapon*, *Heavy Hitter*, *Finisher* | Heavy Weapon cancels Cleave's ▼: big dice, big crits, against everything around her. |

**Combos best with:** the **rogue** (Stuns for *Assassinate*; standing beside her targets for Sneak Attack), the **wizard** (Anvil Mult on top of Hex; Force Push into her slams), the **cleric** (*Block* and *Shield Wall* keep the cleric standing).

**Paths** (to be written): *Bastion* (defence and shields), *Breaker* (forced movement and slams).

---

# WIZARD ❖

*A student of the arcane.* The wizard burns and blasts groups of foes, and moves the battlefield itself. He is the party's **multiplier**: every spell leaves foes with Mult, so his friends' next hits on them count many times over.

| | |
|---|---|
| **Role** | ❖ Controller · ♦♦ |
| **Key stat** | ✦ INT |
| **Attributes** | STR 1 · DEX 3 · INT 3 · PRE 2 |
| **Hit die / HP** | d6 / 24 |
| **SPD** | 4 |
| **Defend** | d4 (no armour). No shield. |
| **Weapons** | Focus |
| **Starting gear** | Arcane Staff (d4) |

**Specialties:** magic items and runes, ancient writing, wards and rituals, strange beasts.

**Class features.**
- **Staff Bolt** gives **+1 Mult** (to the foe, after the hit).
- **Force Adept:** his pushes and pulls move foes 1 extra square.
- **No armour:** Defend rolls a d4, so he likes to stay back.

**Class powers.** *Staff Bolt* is his basic attack and *Force Push* is innate. Start with *Hex*; the rest come as rewards. His damage powers roll his **staff's** die.

| Power | R | Tag | MP | Actions | Range | Modifiers (Arcane Staff) | Effect |
|---|---|---|---|---|---|---|---|
| **Staff Bolt** (basic) | — | — | 0 | 1 | 4 | d4 | Range 4. The foe gains +1 Mult. |
| **Force Push** (innate) | — | — | 0 | 1 | 4 | — | Range 4. Push a foe 1 square. If it slams into something, it is Stunned. |
| **Hex** | C | Set-up | 1 | 1 | 5 | — | Range 5. The foe gains +2 Mult. |
| **Magic Missile** | C | Burst | 1 | 1 | 6 | d2 ▼ from d4 · ×3 hits | Range 6. Three tiny hits: each one can crit. |
| **Scorching Burst** | C | Burst | 1 | 1 | 5, 3×3 | d2 ▼ from d4 · Crit: Burn 2 | Range 5, 3×3. Every foe in the area Burns 2. Fire. |
| **Ray of Frost** | C | Set-up | 1 | 1 | 4 | d4 · Crit: foe +2 Mult | Range 4. The foe is Rooted: it can't move on its next turn. Cold. |
| **Blink** | C | Reach | 1 | free | 3 | — | Free action. Teleport up to 3 squares. |
| **Chain Hex** | U | Set-up | 2 | 1 | 5, 3×3 | — | Range 5, 3×3. Every foe in the area gains +1 Mult. |
| **Amplify** | U | Set-up | — | passive | — | — | Every Mult you give is 1 higher. |
| **Repelling Ward** | U | Guard | — | reaction | 1 | — | Reaction (1 ready action, once a round): a foe ends its move beside you. Push it 1 square away. |
| **Shatter** | R | Set-up | — | passive | — | — | Allies' hits against a foe you Rooted deal ×2. |
| **Fireball** | R | Burst | 3 | 2 | 4, 3×3 | 2d6 ▲ from d4 | 2 actions. Range 4, 3×3. Every foe in the area Burns 3. Fire. |

*Engine notes:* Staff Bolt's Mult, and Ray of Frost's crit Mult, land after their own hit, so they pay off on the next hero's hit. The Arcane Staff is a d4, so *Magic Missile*'s ▼ steps the d4 staff down to d2 (a d6 staff rolls d4s). With Force Adept, Force Push moves a foe 2 squares.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Hexer** | Arcane Staff + Long | *Hex*, *Chain Hex*, *Amplify* | Hex is +3 Mult with Amplify. Hex the boss twice and hand it to the rogue. |
| **The Frost Lock** | Frost Orb (Frost, Long) | *Ray of Frost*, *Shatter* | Root the biggest threat; every ally's hit on it is doubled. |
| **The Pyromancer** | Emberstaff (Flame) | *Scorching Burst*, *Fireball* | Burn a crowd: Burn stacks and ignores armour. |

**Combos best with:** the **rogue** (Hex for *Backstab*; Shatter doubles her), the **fighter** (Force Push into her slams; Anvil adds Mult), the **cleric** (*Judgment* hits every foe the wizard gave Mult).

**Paths** (to be written): *Elementalist* (fire, ice, lightning), *Warper* (space, pushing and pulling).

---

# CLERIC ✚

*A servant of the divine.* The cleric heals, shields, and blesses allies so their next blow lands harder. She is the party's **blessing**: Bless adds damage to her friends' next hits, and her heals and shields keep them standing.

| | |
|---|---|
| **Role** | ✚ Support · ♦♦ |
| **Key stat** | ♛ PRE |
| **Attributes** | STR 3 · DEX 1 · INT 2 · PRE 3 |
| **Hit die / HP** | d8 / 32 |
| **SPD** | 3 |
| **Defend** | d6 (medium armour) **+2** (shield) |
| **Weapons** | Light, Ranged |
| **Starting gear** | Iron Mace (d6), shield, chain armour |

**Specialties:** healing the sick, spirits and the undead, shrines and holy relics, telling truth from lies.

**Class features.**
- **Medium armour and a shield:** Defend rolls a d6 +2.
- **Channel Divinity:** her heals heal **+3**, and her attacks deal **radiant** damage (×2 against the undead).

**Class powers.** *Mace* is her basic attack and *Guidance* is innate. Start with *Healing Word*; the rest come as rewards.

| Power | R | Tag | MP | Actions | Range | Modifiers (Iron Mace) | Effect |
|---|---|---|---|---|---|---|---|
| **Mace** (basic) | — | — | 0 | 1 | 1 | d6 | Attack with your weapon die. |
| **Guidance** (innate) | — | — | 0 | 1 | 3 | — | Range 3. An ally gains Bless 3: +3 damage on their next hit. |
| **Healing Word** | C | Mend | 1 | 1 | 4 | — | Range 4. An ally heals d8 + 3. |
| **Brand** | C | Set-up | 1 | 1 | 1 | d6 | The foe gains +1 Mult. |
| **Smite** | C | Burst | 1 | 1 | 1 | d8 ▲ from d6 · +1 dmg · Crit: allies Bless 2 | A holy blow. |
| **Bless** | C | Set-up | 1 | 1 | self, 2 | — | You and allies within 2 gain Bless 3: +3 damage on your next hit. |
| **Sanctuary** | C | Guard | 1 | 1 | 4 | — | Range 4. An ally gains 8 Shield. |
| **Divine Shift** | C | Guard | 1 | 1 | 4 | — | Swap places with an ally within 4. You both gain 4 Shield. |
| **Radiance** | U | Set-up | — | passive | — | — | Every Bless you give is 2 higher. |
| **Warding Word** | U | Guard | — | reaction | 3 | — | Reaction (1 ready action, once a round): an ally within 3 is about to take 4 or more damage. Halve it. |
| **Revivify** | U | Mend | 2 | 1 | self | — | A Down ally stands up beside you with 2 rolls of their hit die. |
| **Judgment** | R | Burst | 3 | 2 | self, 4 | 2d8 ▲ from d6 | 2 actions. Attack every foe within 4 that has Mult. |

*Engine notes:* the Bless she gives herself is not a combo (only another hero's Bless is). Brand's Mult lands after its own hit. *Smite*'s crit Bless (with *Radiance*, Bless 4) goes to her and every ally within 2, for their next hits. Healing Word's +3 is Channel Divinity.

**Builds.**

| Build | Weapon and runes | Key powers | Plan |
|---|---|---|---|
| **The Kingmaker** | Iron Mace + Warding | *Guidance*, *Bless*, *Radiance* | Bless 5 on the rogue every turn, and a combo for both of you. |
| **The Judge** | Sunforged Flail (Radiant, Keen) | *Brand*, *Judgment*, *Finisher* | Let the wizard spread Mult, then strike every marked foe at once. |
| **The Mender** | Relic of Dawn (Radiant, Warding) | *Healing Word*, *Sanctuary*, *Revivify*, *Field Medic* | Keep everyone up; every hit shields the front line. |

**Combos best with:** the **rogue** (Bless on a many-crit hit), the **wizard** (*Judgment* cashes in his Chain Hex), the **fighter** (Shields keep the wall up while she Taunts).

**Paths** (to be written): *Mender* (healing and shields), *Zealot* (radiant and judgment).

---

## Every Hero's Innate Powers

| Power | MP | Actions | Range | Effect |
|---|---|---|---|---|
| **Second Wind** | 0 | 1 | self | Once per battle: spend a hit die to heal one roll of it + 3. (Mender's Thread: twice.) |
| **Help Up** | 0 | 1 | 1 | An ally beside you who is Down stands up with health equal to one roll of their hit die. (*Quick Revive*: no action.) |

---

## Part 6 · General Powers

Any class can take these.

### Burst

| Power | R | Effect |
|---|---|---|
| **Opening Strike** | C | Your first attack in each battle gets +3 damage and +1 Mult. |
| **Finisher** | C | Your hits against a bloodied foe (half health or less) get +1 Mult. |
| **Heavy Weapon** | C | Your weapon die is one step bigger on every attack (d6 to d8). |
| **Brutal** | C | When your hit crits, +3 damage. |
| **Precision** | U | Your weapon die is one step smaller on every attack (d6 to d4), and each crit gives +1 more Mult. |
| **Heavy Hitter** | U | Each crit gives +2 Mult instead of +1. |
| **Overkill** | U | When your hit drops a foe, the extra damage hits another foe beside it. |
| **Glass Cannon** | R | All your hits get +1 Mult. You can't Defend. |

### Guard

| Power | R | Effect |
|---|---|---|
| **Hardy** | C | +6 maximum health. |
| **Brace** | C | Once a round, +2 to a Defend roll. |
| **Last Stand** | R | Once a battle, when you would go Down, stay at 1 health with 6 Shield. |

### Reach

| Power | R | Effect |
|---|---|---|
| **Quick Feet** | C | +1 speed. |
| **Hard Shove** | C | Your pushes and pulls move 1 square further. |

### Surge

| Power | R | Effect |
|---|---|---|
| **Eager** | C | Start each battle with +1 momentum. |
| **Adrenaline** | C | The first time you are hit each battle, gain 1 momentum. |
| **Conductor** | R | When you land a combo, every other hero gains 1 momentum. |

### Mend

| Power | R | Effect |
|---|---|---|
| **Field Medic** | C | Your heals on allies heal 2 more. |
| **Quick Revive** | C | Help Up costs no action. |

---

## Part 7 · A Round That Clicks

The party, mid-region I. Order this round: **Wizard → Fighter → Rogue → Cleric**.

- **Wizard:** Arcane Staff; *Hex*, *Amplify*.
- **Fighter:** Longsword; *Shove*, *Anvil*.
- **Rogue:** Twinblades (pair of d4s); *Backstab*. No flat bonuses: attributes add nothing in battle.
- **Cleric:** *Guidance*; she blessed the rogue last round (Bless 3).

1. **Wizard:** a *Staff Bolt* at an Orc Brute (armour 1, no Steadfast) first: he rolls a 3 on his d4, − 1 armour = 2 damage × 1 = 2, and the orc gains +1 Mult (+1 for Amplify). Then *Hex*: +2, +1 for Amplify. The orc has **Mult 5**. He keeps his last action to Defend. (Hexing first would have let his own bolt spend the Mult.)
2. **Fighter:** *Shove* (no damage, so it does not spend the Mult) pushes the orc into a tree: it **slams** for one roll of her d6 and is **Stunned**. *Anvil* adds **+2 Mult**: **Mult 7**. She keeps her other two actions ready to Defend.
3. **Rogue:** *Backstab* on the Stunned orc, with Brakka beside it. She rolls 4 and 3: 7 + 3 Bless − 1 armour = **9 damage**. MULT = 1 + 1 (the 4 crits) + 14 (Mult 7, doubled) + 1 (Sneak Attack) = **17**. **153 damage**. One combo pays Vex, Brakka (her Stun, and the Mult, which is credited to whoever added to it last) and Sela (her Bless) +2 MP each.
4. **Cleric:** *Guidance* on the rogue for next round, and the plan resets.

One round: four set-ups from three classes, each one number on the orc's badge, turned a pair of d4s into 153 damage.

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
- **Bard.** A performer and keeper of lore. *First power:* **Inspire** (C, Set-up, 1 MP, free, range 5): an ally gains Bless (amount TBC), or ends one status. *Specialties:* lore, music, persuasion, bluffing.
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
| **1** | Class features, innate powers, one class power (reaction powers are rewards since v0.24) |
| **2** | A class feature |
| **3** | A path |
| **4** | +1 attribute |
| **5** | A class feature and a path feature |
| **6 to 10** | A path feature at 7, +1 attribute at 8, a class feature at 9, a capstone at 10 |
| **Every level** | +1 power slot (to 8) and a power draft |
