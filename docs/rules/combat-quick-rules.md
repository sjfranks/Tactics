# Rogue Tactics: Combat Quick Rules

> One-page condensation of Core Rules + Heroes (v0.27, `chips-and-mult` branch). Combat only: no map, events, shops, relics, Dread. Foe stats live in the Bestiary. Numbers marked TBC are playtest guesses.

---

## 1. The Core Idea

Set up, then cash in. All four heroes act, then all foes act. Wizard/fighter/cleric stack **different statuses** on a foe; the rogue (or anyone) then hits with a fistful of dice.

**Damage = roll MULT dice, add them, add flat bonuses, subtract armour.**
- No misses. No saves, advantage, or reactions in battle.
- Attributes (STR/DEX/INT/PRE) add **nothing** in battle. They are for out-of-battle checks and initiative only.

---

## 2. Round Structure

1. **Heroes' turn:** every hero has **3 actions**, spent in any order, switching between heroes freely. Unused actions are lost.
2. **Foes' turn:** each foe acts once (a move + an action), in fixed initiative order (DEX die rolled once at battle start; ties go to higher DEX).
3. **End of round:** foes gain Malice (◆) and may unleash a threat (see Bestiary).

**Actions (1 each unless noted):** Move (up to SPD) · Attack (basic, free of MP, unlimited times) · Power (costs MP + listed actions).
**Stunned hero:** 1 fewer action, half SPD.
**No free strikes** when leaving a foe's side. No Defend, no reaction powers.

**Grid:** 6 wide × 8 tall, orthogonal movement, 1 SPD per tile (difficult terrain 2). One creature per tile. Range 1 = melee. Tall obstacles block sight.

---

## 3. Making a Hit

### Step 1: Count dice (MULT)

| Source | Dice |
|---|---|
| The power's own dice (basic attack = 1) | as listed |
| Pair weapon (twinblades) | +1 |
| **Each different status on target** (Burning, Stunned, Rooted, Weakened, Taunted) | **+1 each** (Backstab: +2 each) |
| Attacker is **Blessed** (spent on the hit) | +1 |
| Rogue **Sneak Attack**: an ally is beside the target | +1 |
| Target is **bloodied** (≤ ½ HP) with *Finisher* | +1 |
| *Opening Strike*: first attack each battle | +1 (and +3 dmg) |
| *Glass Cannon* (attacker's hits and hits on them) | +1 |
| Attacking while **Hidden** | +1 |
| Attacker is **Weakened** | −1 (min 1 die) |

A status counts **once** no matter how many heroes applied it. Stack different ones.

### Step 2: Roll and crit
Roll that many of the **weapon die** (changed by ▲/▼ from the power) and add up.
**Crit:** a die on its top number turns red → **roll one more die** (can chain, max 8 extra).
*Keen* and *Precision* widen crit range by 1 each. **Staves never crit** (all wizard weapons).

### Step 3: Flat bonuses
Power's +N dmg · Training (+1 each, max +4) · *Brutal* (+3 on a crit) · *Opening Strike* (+3) · *Radiance* (+2 to a hero the cleric Blessed).

### Step 4: Subtract
**Wounds** (−1 each, max −3), then target's **armour** (flat). Minimum 1 damage after armour.

### Step 5: Multipliers
×2 weak to damage type, or *Shatter* · ×3 *Assassinate* vs Stunned · ×½ resist, or a Taunted attacker hitting anyone but its taunter · ×0 immune.

**Flat damage ignores armour:** minions, swarms, Burning, slams, hazards.

> **Example:** Vex (Twinblades, d4 pair) uses *Backstab* on a foe that's Burning + Taunted, with Brakka beside it. Dice: 1 (power) + 1 (pair) + 2×2 (statuses, doubled) + 1 (Sneak Attack) = **7d4**. Crits add more dice. Armour comes off the total once.

---

## 4. Dice Quick Reference

| Die | Crit chance/die | Feel |
|---|---|---|
| d2 | 50% | Crits constantly (rogue needles) |
| d4 | 25% (staves 0%) | Quick, crit-happy |
| d6 | 17% (33% Keen) | All-rounder |
| d8 | 12% (25% Keen) | Heavy, steady |
| d10 | 10% (20% Keen) | Big; extra dice from statuses are huge |
| d12 | 8% (17% Keen) | Legendary |

Power modifiers on a card: **▲/▼** ladder step (d2·d4·d6·d8·d10·d12) · **dice** (2d6) · **hits** (×3 hits, each re-counts statuses) · **+N dmg** · **Crit: X** · named rule (ignores armour, etc.).

**Crit triggers:** Stun · Weaken · Bless allies · +1 action (once/round).

---

## 5. Statuses

The first five each add **+1 die** to every hit on the creature, from anyone. They don't stack with themselves (re-applying just refreshes).

| Status | Effect | Lasts |
|---|---|---|
| **Burning N** | N damage at start of its turn (ignores armour), then N−1. More Burning raises N. Water extinguishes. | Until N = 0 |
| **Stunned** | Foe skips next turn (**bosses keep their turn**). Hero has −1 action. Half SPD. | Until turn skipped / end of next turn |
| **Rooted** | Can't move, can still attack. **Bosses immune.** | End of its next turn |
| **Weakened** | Its own hits roll 1 fewer die (min 1). | End of its next turn |
| **Taunted** | Must attack the taunter if it can reach; hits on anyone else ×½. | End of its next turn |
| **Blessed** (heroes only) | Next hit rolls +1 die. Not a die against the hero. | Until they hit / heroes' turn ends |
| **Shield N** | Temp HP; stacks; fades at start of owner's next turn. | — |
| **Hidden** | Can't be targeted at range; next hit +1 die, then revealed. | Until it attacks |

A foe that just lost a turn to Stun can't be Stunned again until after its next turn.

---

## 6. Momentum (MP) and Combos

**One MP pool for the whole party.** Max 10. Lost when the battle ends. Pays for active powers.

- **Start of battle:** 1 + Victories (max 3).
- **Cleric support** (Guidance, Healing Word, Bless, Sanctuary, Divine Shift) costs 0 and gives **+1 MP**. *Prayer of Healing* costs 1, gives 1 back.
- **Combo = +1 MP:** a damaging hit on a foe carrying a status **another** hero applied, or by a hero **another** hero Blessed. Max one per action. You never combo off your own set-up. Hazard/foe statuses never combo. Non-damaging powers (Shove, Hex) never combo.
- **Basic attacks give no MP.**

---

## 7. Forced Movement

- **Push** = straight away from source; **pull** = straight toward.
- **Slam:** a pushed creature that hits an obstacle, edge, or another creature stops, takes **one roll of the pusher's weapon die** (ignores armour; the thing it hits takes the same), and is **Stunned**. Pulls never slam.
- **Steadfast N:** pushes/pulls move you N fewer tiles.

---

## 8. Health, Down, Death

- **HP:** hit die max × 4 (d6 = 24, d8 = 32, d10 = 40, d12 = 48). **Vigor** reward: +1½ × die max.
- **Bloodied:** ≤ ½ max HP. Triggers boss phases, *Finisher*, Executioner's Hood.
- **Down:** 0 HP, can't act, gains 1 **Wound**. Only cleric's **Revivify** stands them up in battle. After a won battle Down heroes stand at 1 HP.
- **Wounds:** each = −1 damage on all hits (max −3). Removed 1 per Camp.
- **Death:** going Down with 3 Wounds already = dead (4th Down). *Gritty option: 3rd Down.*
- **Defeat:** every hero Down at once ends the run.
- **Healing in battle:** cleric only. Out of battle: hit dice (pool of 3 per hero), Camps.

---

## 9. Damage Types and Hazards

**Types:** physical (default), fire, cold, force, radiant, necrotic, poison. Weak ×2, resist ×½ (min 1), immune ×0. Undead: weak radiant, immune poison/necrotic.

**Hazards** (suffered on entering or ending turn there; flat, ignore armour; +1 in region II, +2 in III):

| Hazard | Dmg | Status |
|---|---|---|
| Fire | 3 | Burning 1 |
| Acid pool | 3 | Weakened |
| Lava | 8 | Burning 2 |
| Snare (once) | 4 | Rooted |
| Web (once) | 0 | Rooted |

High ground: ranged reach +1. Tall obstacles block movement and sight; low ones block movement only.

---

## 10. Foes (very brief)

- Turn = a move + an action. Flat **armour**. Share a **Malice (◆)** pool for threats.
- **Minions:** 1 HP, flat damage. **Swarms:** shared HP, double damage from area attacks. **Bosses:** keep turn when Stunned, immune to Root.
- Roles: Brute, Soldier, Skirmisher, Artillery, Controller, Lurker, Leader.
- Foes hit with the same dice rules: their die count + 1 per status on the hero, plus their flat strength; minus hero armour.

---

## 11. Heroes at a Glance

| Class | Role | HP | Armour | SPD | Start weapon | Starting power |
|---|---|---|---|---|---|---|
| **Rogue** (Vex) | ⚔︎ Striker | 32 | 0 | 4 | Twinblades (d4 pair) | Piercing Strike |
| **Fighter** (Brakka) | ⬢ Tank | 40 | 2 | 3 | Longsword (d6) | Tide of Iron |
| **Wizard** (Orin) | ❖ Controller | 24 | 0 | 4 | Arcane Staff (d4, no crits) | Fire Bolt |
| **Cleric** (Sela) | ✚ Support | 32 | 1 | 3 | Iron Mace (d6) | Healing Word |

Default attributes (out of battle only): Rogue 2/3/3/1 · Fighter 3/2/1/3 · Wizard 1/3/3/2 · Cleric 3/1/2/3 (STR/DEX/INT/PRE).
Each hero: **8 power slots**, innate powers take no slot. Powers come from post-battle rewards (pick 1 of 3), not levels.
Rarity: **C** common, **U** uncommon, **R** rare. Format: MP / actions / range / modifiers.

### Rogue ⚔︎: the finisher
Class features: **Sneak Attack** (+1 die if an ally is beside the foe). Weapons: Light, Ranged.

| Power | R | MP/Act | Range | Modifiers (Twinblades) | Effect |
|---|---|---|---|---|---|
| Blades (basic) | — | 0/1 | 1 | 2d4 | Attack |
| Piercing Strike | C | 1/1 | 1 | 3d4, ignores armour | |
| Quick Stab | C | 1/1 | 1 | 3d2 ▼, Crit: Weaken | |
| Backstab | C | 1/1 | 1 | 2d4, **2 dice per status** | |
| Hit and Run | C | 1/1 | 1 | 2d4 +2 | Then move 2 |
| Flurry | U | 2/1 | 1 | 2d2 ▼ ×3 hits, Crit: +1 action | |
| Shadowstep | U | 2/1 | 5 | 2d4 +2 | Teleport beside foe, attack |
| Assassinate | R | 3/1 | 1 | 3d6 ▲, **×3 vs Stunned** | |

### Fighter ⬢: the wall
Class features: Armour 2 · **Steadfast 1** · **Taunt**. Weapons: Light, Martial.

| Power | R | MP/Act | Range | Modifiers (Longsword) | Effect |
|---|---|---|---|---|---|
| Sword (basic) | — | 0/1 | 1 | d6 | Attack |
| Shove (innate) | — | 0/1 | 1 | — | Push 1; slam = Stun |
| Tide of Iron | C | 1/1 | 1 | d8 ▲, Crit: Stun | Push 1, step after; **Taunted**; slam Stuns |
| Hook Chain | C | 1/1 | 3 | d6 +2 | Pull 2; **Taunted** |
| Shield Wall | C | 1/1 | self | — | You + adjacent allies +6 Shield; adjacent foes **Taunted** (all 8 squares) |
| Cleave | C | 1/1 | self | d4 ▼ | Hit every foe orthogonally beside you |
| Crushing Blow | U | 2/1 | 1 | d10 ▲2 +3, Crit: Stun | |
| Sunder | U | 1/1 | 1 | d6 | Foe **Weakened** |
| Anvil | U | passive | — | — | Slams +3 dmg, foe also Weakened (engine differs, see ALIGNMENT) |
| Earthshaker | R | 3/**2** | self | — | **Stun** every adjacent foe |

### Wizard ❖: the setter
Class features: staves **never crit** · **Force Adept** (pushes/pulls +1 square) · no armour. Weapons: Focus.

| Power | R | MP/Act | Range | Modifiers (Staff) | Effect |
|---|---|---|---|---|---|
| Staff Bolt (basic) | — | 0/1 | 4 | d4 | Attack |
| Force Push (innate) | — | 0/1 | 4 | — | Push 1; slam = Stun |
| Fire Bolt | C | 1/1 | 5 | d4 | **Burning 2** (fire) |
| Hex | C | 1/1 | 5 | — | **Weakened** |
| Ray of Frost | C | 1/1 | 4 | d4 | **Rooted** (cold) |
| Scorching Burst | C | 2/1 | 5, 3×3 | d4 | Area: **Burning 2** |
| Magic Missile | C | 1/1 | 6 | d4 ×3 hits | Each hit re-counts statuses |
| Blink | C | 1/**free** | 3 | — | Teleport 3 |
| Chain Hex | U | 2/1 | 5, 3×3 | — | Area: **Weakened** |
| Lingering Magic | U | passive | — | — | Your statuses last 1 turn longer |
| Shatter | R | passive | — | — | Allies' hits on a foe you Rooted deal **×2** |
| Fireball | R | 3/**2** | 4, 3×3 | 2d6 ▲ | Area: **Burning 3** |

### Cleric ✚: the heart
Class features: Armour 1 · **only healer** · **Channel Divinity** (heals +3, attacks radiant, ×2 vs undead). Weapons: Light, Ranged. **+1 ◆** = gives party 1 MP.

| Power | R | MP/Act | Range | Modifiers (Mace) | Effect |
|---|---|---|---|---|---|
| Mace (basic) | — | 0/1 | 1 | d6 | Attack |
| Guidance (innate) | — | 0/1 | 3 | — | Ally **Blessed**. **+1 ◆** |
| Healing Word | C | 0/1 | 4 | — | Ally heals d8+3. **+1 ◆** |
| Brand | C | 1/1 | 1 | d6 | **Burning 2** |
| Smite | C | 1/1 | 1 | d8 ▲ +1, Crit: Bless allies | |
| Bless | C | 0/1 | self, 2 | — | You + allies within 2 **Blessed**. **+1 ◆** |
| Sanctuary | C | 0/1 | 4 | — | Ally +8 Shield. **+1 ◆** |
| Divine Shift | C | 0/1 | 4 | — | Swap with ally; both +4 Shield. **+1 ◆** |
| Radiance | U | passive | — | — | Allies you Bless deal +2 dmg on that hit |
| Prayer of Healing | U | 1/1 | self, 2 | — | You + allies within 2 heal 4+3. **+1 ◆** |
| Revivify | U | 2/1 | self | — | Down ally stands with 2 hit dice of HP |
| Judgment | R | 3/**2** | self, 4 | 2d8 ▲ | Attack every foe within 4 that has a status |

---

## 12. General Powers (any class)

| Power | R | Effect |
|---|---|---|
| Opening Strike | C | First attack each battle: +1 die, +3 dmg |
| Finisher | C | Hits on a bloodied foe: +1 die |
| Heavy Weapon | C | Weapon die ▲1 on every attack |
| Brutal | C | +3 dmg when your hit crits |
| Precision | U | Weapon die ▼1, crits on top two numbers |
| Heavy Hitter | U | Each crit rolls **two** more dice |
| Overkill | U | Excess damage on a kill hits an adjacent foe |
| Glass Cannon | R | Your hits +1 die; foes' hits on you +1 die |
| Hardy | C | +6 max HP |
| Last Stand | R | Once a battle, when you'd go Down: stay at 1 HP with 6 Shield |
| Quick Feet | C | +1 SPD |
| Hard Shove | C | Your pushes/pulls +1 square |
| Eager | C | Party starts each battle +1 MP |
| Adrenaline | C | First time you're hit each battle: party +1 MP |
| Conductor | R | Your combos give +1 extra MP |

---

## 13. Weapons and Runes

**Weapons (tier: die):**

| Class | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Fighter | Longsword d6 | Battleaxe d8 · Thunder Hammer d6 (Thunder) | Flameforged Blade d8 (Flame, Keen) | Titan's Maul d10 (Thunder, Keen) |
| Rogue | Twinblades d4 pair | Serrated Twinblades d4 pair (Venom) · Rapier d6 (Keen) | Shadow Needles d2 pair (Venom) | Kingslayer d6 pair (Vicious, Venom) |
| Wizard | Arcane Staff d4 | Staff of Reach d4 · Emberstaff d6 (Flame) | Frost Orb d6 (Frost, Long) | Staff of the Magi d6 (Long) |
| Cleric | Iron Mace d6 | Blessed Mace d8 (Radiant) · Warding Censer d6 (Warding) | Sunforged Flail d8 (Radiant, Keen) | Relic of Dawn d10 (Radiant, Warding) |

Wizard weapons never crit. Using a weapon you're not proficient with: it can't crit.

**Smith:** Temper (die ▲1; 40/80/160g) · Hone (die ▼1; 40g; rogue light weapons go to d2) · Inscribe rune (60g; 1 socket, 2 on tier 3+) · Remove rune (20g).

| Rune | Effect |
|---|---|
| Keen | Crit on top number or one below (d6+) |
| Steady | Once a turn, reroll a weapon die showing 1 |
| Flame | Fire damage; crit → Burning 2 |
| Frost | Cold damage; crit → Rooted |
| Radiant | Radiant damage (×2 vs undead) |
| Venom | Crit → Burning 2 |
| Thunder | Crit → push 1 (can slam/Stun) |
| Warding | A hit shields you and adjacent allies for 2 |
| Long | +1 range/reach on basic attacks |
| Twin | Light weapon becomes a pair (+1 die) |
| Vicious | No effect in engine since v0.27 |

---

## 14. Who Sets Up What

| Status | Made by | Cashed in by |
|---|---|---|
| Burning | Wizard (Fire Bolt, Scorching Burst, Fireball), Cleric (Brand), Flame/Venom runes | Everyone (+1 die) |
| Rooted | Wizard (Ray of Frost), Frost rune | Everyone; wizard's **Shatter** ×2 |
| Weakened | Wizard (Hex, Chain Hex), Fighter (Sunder), Rogue (Quick Stab crit) | Everyone; foe hits softer |
| Stunned | Fighter (slams, Earthshaker, Tide/Crushing crits), Wizard (Force Push slam), Thunder rune | Everyone; Rogue **Assassinate** ×3 |
| Taunted | Fighter (Tide of Iron, Hook Chain, Shield Wall) | Everyone; foe halved vs others |
| Blessed | Cleric (Guidance, Bless, Smite crit) | The Blessed hero (+1 die, Radiance +2) |
| Any status | All | Rogue **Backstab** (2 dice/status), Cleric **Judgment** |

---

## 15. Optional Rules

Gritty (3rd Down kills) · Shifting order (re-roll foe initiative each round) · Interleaved turns (pre-v0.27 initiative order) · Defend (spend a leftover action to roll armour die: fighter d8, cleric d6, others d4) · Free strikes · Lean rewards (rewards only from elites/bosses).
