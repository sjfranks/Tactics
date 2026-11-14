'use strict';
// GOBLIN DELVE · THE RULES
// Everything the dice decide. No graphics code: this file runs in the page and in Node (tools/sim.js).
// A battle is plain JSON. Every order (start, act, endTurn) changes it and returns a list of events for the view to play.
// To try a rule variant, change the tables at the top: TUNE, DMG_TYPES, ACTIONS, UNITS, PARTY and ENCOUNTER.
const DV = (() => {

  // ---------------- house rules ----------------
  const TUNE = {
    actions: 2,          // actions in a turn
    maxDice: 3,          // most dice advantage or disadvantage can roll (keep the best, or the worst)
    presses: 1,          // extra actions a hero can win in one turn by hitting a Brittle foe
    unarmed: 2,          // what a melee attack does with no weapon in hand
    initDie: 6,          // initiative: everyone rolls this die and adds their speed, every round
    maxChain: 12,        // most times one attack can crit in a row
  };

  // ---------------- the dice ----------------
  // Each character rolls one of the standard dice to hit, its size set by class: Vex a d4, Brakka a d8, Orlen and Wenna
  // d6s, the goblins d6s.
  // An attack rolls it: the bottom number (1) misses; anything else hits for the weapon's flat damage. The top number is
  // a critical: it hits, then roll again and add that roll's result (a miss adds nothing, a hit the weapon's damage
  // again, another critical keeps going). Orlen's spells do not crit: his top number is a plain hit. On average every die
  // deals the weapon's damage; a bigger die is steadier, a smaller one crits and misses more.
  // Each attack after the first in a turn has disadvantage: roll 2, keep the lowest (the third, 3). Advantage (Bless)
  // rolls extra dice and keeps the highest; the two cancel, and no roll uses more than TUNE.maxDice dice.
  // A power rolls 1 die, never with advantage or disadvantage. It reads the number as its amount (a heal), or reads the
  // band the number falls in: low, middle or the top number.
  // Guard takes that much off each hit until the guarded one's next turn.
  // Press: a hero whose attack hits a Brittle goblin (Orlen's Frostbite) gains an extra action that turn.
  const SIZES = [4, 6, 8, 10]; // the dice the tray can throw
  const TIERS = ['low', 'mid', 'top'];
  const TIER_NAME = { low: 'Low', mid: 'Middle', top: 'Top' };
  const lowTop = sides => Math.max(1, Math.floor(sides / 3)); // the low band: 1 on a d4, 1–2 on a d6 or d8, 1–3 on a d10
  const tierRange = sides => ({ low: [1, lowTop(sides)], mid: [lowTop(sides) + 1, sides - 1], top: [sides, sides] });
  const tierOf = (n, sides) => n >= sides ? 'top' : n <= lowTop(sides) ? 'low' : 'mid';
  const tierOdds = sides => { const r = tierRange(sides); return Object.fromEntries(TIERS.map(k => [k, (r[k][1] - r[k][0] + 1) / sides])); };

  // ---------------- damage types ----------------
  // Every weapon deals one. They do nothing yet: they are there for resistances and weaknesses to come.
  const DMG_TYPES = { pierce: { name: 'Pierce', icon: '📍' }, slash: { name: 'Slash', icon: '🪓' }, blunt: { name: 'Blunt', icon: '🔨' }, magic: { name: 'Magic', icon: '✨' } };

  // ---------------- actions ----------------
  // kind: attack (a die to hit; a hit deals the weapon's damage) | power (1 die, read as its card says) | utility (no roll)
  // weapon: which of the character's weapons an attack uses (`weapons` on the unit)
  // read: tier (the band the number falls in, low, middle or top, picks the result in `rows`) | amount (the number is
  // the amount) · die: a die of its own rather than the character's · flat: no advantage or disadvantage, and not one of
  // the turn's attacks (Fireball)
  // cost: actions it takes · target: foe | all (every foe) | ally (a friend; heals reach the fallen) | other (a friend
  // not yourself) | self | none · reach: melee (only the front rank while anyone stands in it) | ranged | unit (the
  // unit's own) · recharge: rounds before it can be used again. A power can be used once a turn; Attack as often as
  // you have actions.
  const ACTIONS = {
    attack: { name: 'Attack', kind: 'attack', weapon: 'main', cost: 1, target: 'foe', reach: 'unit', text: 'Roll to hit one foe with your weapon: a 1 misses, the top number crits. Each attack after your first this turn has disadvantage.' },
    throw: { name: 'Throw Dagger', icon: '🎯', kind: 'attack', weapon: 'thrown', cost: 1, target: 'foe', reach: 'ranged', text: 'Throw your dagger at any goblin, even in the back rank. It stays where it lands: until you pick it up, you fight with your fists. Counts as an attack.' },
    retrieve: { name: 'Pick Up Dagger', icon: '🫳', kind: 'utility', cost: 1, target: 'self', text: 'Get your thrown dagger back.' },
    fireball: { name: 'Fireball', icon: '🔥', kind: 'attack', cost: 2, target: 'all', reach: 'ranged', recharge: 2, die: 6, flat: true, text: 'Both actions. Roll a d6: every goblin takes that much. A spell, so no advantage or disadvantage.' },
    defend: {
      name: 'Defend', icon: '🛡️', kind: 'power', cost: 1, target: 'self', read: 'tier', text: 'Guard: until your next turn, each hit on you deals that much less.',
      rows: { low: 'Guard 1.', mid: 'Guard 2.', top: 'Guard 3.' }, guard: { low: 1, mid: 2, top: 3 },
    },
    taunt: {
      name: 'Taunt', icon: '📯', kind: 'power', cost: 1, target: 'none', read: 'tier', text: 'Until your next turn, goblins that can reach you must attack you.',
      rows: { low: 'The next goblin fighter to act must attack you.', mid: 'Every goblin fighter must attack you.', top: 'Every goblin, the shaman too, must attack you.' },
    },
    interpose: {
      name: 'Interpose', icon: '🔰', kind: 'power', cost: 1, target: 'other', read: 'tier', text: 'Until your next turn, you step in front of another hero: attacks on them hit you.',
      rows: { low: 'The next attack on them hits you instead.', mid: 'Every attack on them hits you instead.', top: 'Every attack on them hits you instead, and you gain Guard 1.' },
    },
    hide: {
      name: 'Hide', icon: '🌫️', kind: 'power', cost: 1, target: 'self', read: 'tier', text: 'While hidden, goblins cannot attack you, and your next hit from hiding deals double damage.',
      rows: { low: 'Hidden until your next turn starts; a hit from hiding deals half as much again.', mid: 'Hidden until you strike; that hit deals double.', top: 'Hidden for two strikes, each dealing double.' },
    },
    poison: {
      name: 'Poison Blade', icon: '🧪', kind: 'power', cost: 1, target: 'self', read: 'tier', text: 'Coat your weapon. A goblin your coated attack lands on is poisoned: it loses HP at the start of each of its next 2 turns.',
      rows: { low: 'Your next attack poisons, 1 a turn.', mid: 'Your next 2 attacks poison, 1 a turn.', top: 'Your next 2 attacks poison, 2 a turn.' },
    },
    frostbite: { name: 'Frostbite', icon: '❄️', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', read: 'amount', text: 'Make a goblin Brittle until your next turn: a hero whose attack hits it presses, gaining an extra action that turn (once a turn). The roll is how many presses it gives.' },
    slow: {
      name: 'Slow', icon: '🐌', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', read: 'tier', text: 'Bog a foe down for its next turn.',
      rows: { low: 'Its first attack has disadvantage.', mid: 'It loses 1 action.', top: 'It loses its whole turn.' },
    },
    heal: { name: 'Heal', icon: '💖', kind: 'power', cost: 1, target: 'ally', read: 'amount', text: 'A hero heals the roll, and curses lift. A fallen hero gets back up.' },
    bless: {
      name: 'Bless', icon: '🙏', kind: 'power', cost: 1, target: 'ally', read: 'tier', text: 'Strengthen a standing hero\'s next attack.',
      rows: { low: '+1 damage on their next attack.', mid: 'Advantage on their next attack.', top: 'Double advantage on their next attack.' },
    },
    prayer: { name: 'Prayer of Healing', icon: '🕯️', kind: 'power', cost: 2, target: 'none', recharge: 3, read: 'amount', text: 'Both actions. Every hero heals the roll, and the fallen get back up.' },
    chant: { name: 'Mending Chant', icon: '🎶', kind: 'power', cost: 1, target: 'none', read: 'amount', text: 'The most wounded goblin heals the roll.' },
    curse: {
      name: 'Curse', icon: '🪬', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', read: 'tier', text: 'Hex a hero: on their next turn, their attacks deal less. Heal lifts it.',
      rows: { low: '−1 damage on their attacks.', mid: '−2 damage on their attacks.', top: '−3 damage on their attacks.' },
    },
  };
  Object.keys(ACTIONS).forEach(k => ACTIONS[k].id = k);

  // ---------------- who fights ----------------
  // rank: front or back · speed: added to the initiative roll · die: the die they roll to hit, and for powers · noCrit:
  // their top number is a plain hit · weapons: main (Attack), thrown (Vex's Throw Dagger), ranged (used by Attack on a
  // foe out of melee reach: Wenna's sling); each { name, dmg, type }
  const UNITS = {
    fighter: { name: 'Brakka', cls: 'Fighter', side: 'hero', rank: 'front', hp: 30, speed: 3, die: 8, reach: 'melee', hitIcon: '⚔️', weapons: { main: { name: 'Sword', dmg: 8, type: 'slash' } }, actions: ['attack', 'defend', 'taunt', 'interpose'], blurb: 'Shield first, questions later. Holds the line so nobody else has to.' },
    mage: { name: 'Orlen', cls: 'Wizard', side: 'hero', rank: 'back', hp: 16, speed: 2, die: 6, noCrit: true, reach: 'ranged', hitIcon: '✨', weapons: { main: { name: 'Bolt', dmg: 3, type: 'magic' } }, actions: ['attack', 'fireball', 'frostbite', 'slow'], blurb: 'Old, frail and very hard to argue with from range.' },
    cleric: { name: 'Sister Wenna', cls: 'Cleric', side: 'hero', rank: 'front', hp: 24, speed: 2, die: 6, reach: 'ranged', hitIcon: '🔨', weapons: { main: { name: 'Mace', dmg: 4, type: 'blunt' }, ranged: { name: 'Sling', dmg: 4, type: 'blunt' } }, actions: ['attack', 'heal', 'bless', 'prayer'], blurb: 'Mends the living and cracks the rest, close up or from a safe distance.' },
    rogue: { name: 'Vex', cls: 'Rogue', side: 'hero', rank: 'back', hp: 20, speed: 4, die: 4, reach: 'melee', hitIcon: '🗡️', weapons: { main: { name: 'Dagger', dmg: 6, type: 'pierce' }, thrown: { name: 'Thrown dagger', dmg: 6, type: 'pierce' } }, actions: ['attack', 'hide', 'poison', 'throw'], blurb: 'Quick, quiet, and always looking for the soft spot.' },
    goblin: { name: 'Goblin', cls: 'Goblin fighter', side: 'foe', rank: 'front', hp: 22, speed: 3, die: 6, reach: 'melee', hitIcon: '🪓', weapons: { main: { name: 'Hatchet', dmg: 4, type: 'slash' } }, actions: ['attack'], blurb: 'Brave in a crowd. Braver in a bigger one.' },
    shaman: { name: 'Goblin Shaman', cls: 'Goblin shaman', side: 'foe', rank: 'back', hp: 18, speed: 2, die: 6, reach: 'ranged', hitIcon: '💀', weapons: { main: { name: 'Hex bolt', dmg: 3, type: 'magic' } }, actions: ['attack', 'chant', 'curse'], blurb: 'Keeps the others standing, and keeps well behind them.' },
  };
  const DEFAULTS = JSON.parse(JSON.stringify(UNITS)), TUNE0 = { ...TUNE };

  const PARTY = ['fighter', 'mage', 'cleric', 'rogue']; // the portraits, top to bottom
  const ENCOUNTER = [
    { id: 'gob1', type: 'goblin', name: 'Snikk', slot: 0 },
    { id: 'gob2', type: 'goblin', name: 'Grub', slot: 1 },
    { id: 'gob3', type: 'goblin', name: 'Muckle', slot: 2 },
    { id: 'shaman', type: 'shaman', name: 'Old Gnarl', slot: 0 },
  ];

  // ---------------- dice ----------------
  // mulberry32, its state kept in the battle so a battle replays from its seed
  function rnd(S) { let t = (S.rs = (S.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const die = (S, n) => 1 + Math.floor(rnd(S) * n);
  const pick = (S, a) => a[Math.floor(rnd(S) * a.length)];

  // ---------------- a battle ----------------
  function makeUnit(id, type, name, slot) {
    const T = UNITS[type];
    return {
      id, type, name: name || T.name, cls: T.cls, side: T.side, rank: T.rank, slot,
      hp: T.hp, max: T.hp, speed: T.speed, die: T.die, noCrit: !!T.noCrit, reach: T.reach, hitIcon: T.hitIcon,
      weapons: JSON.parse(JSON.stringify(T.weapons)), actions: T.actions.slice(), cd: {}, down: false, disarmed: false,
      // statuses: guard (number), taunt, ward (protected by an Interpose), hidden, coat (poisoned blade), poison, weak,
      // slow, blessed, brittle (Frostbite: hits on it press)
      guard: 0, taunt: null, ward: null, hidden: null, coat: null, poison: null, weak: null, slow: null, blessed: null, brittle: null,
      stats: { dealt: 0, taken: 0, healed: 0, rolls: 0, dice: 0, kills: 0, falls: 0, presses: 0, hits: 0, misses: 0, crits: 0 },
    };
  }
  function newBattle(opts = {}) {
    const S = { rs: (opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296)) | 0, seed: opts.seed, round: 0, side: null, acted: [], turn: null, order: { hero: PARTY.slice(), foe: ENCOUNTER.map(e => e.id) }, units: {}, over: null, maxChain: 0 };
    PARTY.forEach((t, i) => S.units[t] = makeUnit(t, t, null, i));
    ENCOUNTER.forEach(e => S.units[e.id] = makeUnit(e.id, e.type, e.name, e.slot));
    return S;
  }
  const all = S => Object.values(S.units);
  const standing = (S, side) => all(S).filter(u => u.side === side && !u.down);
  const enemySide = u => u.side === 'hero' ? 'foe' : 'hero';
  const status = (id, key, on, extra) => ({ t: 'status', id, key, on, ...extra });

  // ---------------- turn order ----------------
  // Initiative: at the start of every round, everyone rolls a d6 (TUNE.initDie) and adds their speed; the highest acts
  // first. A hero and a goblin on the same total: the hero goes first. Heroes on the same total: the player chooses which
  // of them goes first. Goblins on the same total: the one with the most HP left goes first (a wounded goblin hangs
  // back), then front rank before back rank, left to right. A turn is two actions by one character.
  const foeOrder = (S, a, b) => b.hp - a.hp || (a.rank === b.rank ? 0 : a.rank === 'front' ? -1 : 1) || a.slot - b.slot;
  // a unit's initiative this round
  const initOf = (S, u) => S.init && S.init[u.id] ? S.init[u.id].total : u.speed;
  // everyone rolls initiative for the round: { id: { roll, speed, total } }
  function rollInit(S) {
    S.init = {};
    all(S).forEach(u => { const roll = die(S, TUNE.initDie); S.init[u.id] = { roll, speed: u.speed, total: roll + u.speed }; });
    return { t: 'init', round: S.round, rolls: JSON.parse(JSON.stringify(S.init)), sides: TUNE.initDie };
  }
  // who may act next, given who has already acted this round: { side, ids } (ids are the tied heroes, or one goblin)
  function nextUp(S, acted = S.acted) {
    const w = all(S).filter(u => !u.down && !acted.includes(u.id));
    if (!w.length) return null;
    const top = Math.max(...w.map(u => initOf(S, u))), at = w.filter(u => initOf(S, u) === top);
    const heroes = at.filter(u => u.side === 'hero').sort((a, b) => a.slot - b.slot);
    if (heroes.length) return { side: 'hero', ids: heroes.map(u => u.id), init: top };
    return { side: 'foe', ids: [at.sort((a, b) => foeOrder(S, a, b))[0].id], init: top };
  }
  function ready(S) {
    if (S.over || !S.round) return { side: null, ids: [] };
    if (S.turn) return { side: S.units[S.turn.id].side, ids: [S.turn.id], mid: true };
    return nextUp(S) || { side: null, ids: [] };
  }
  // the whole round as it stands: who has acted, who is acting, then who comes next (tied heroes marked as a pick)
  function queue(S) {
    const out = S.acted.map(id => ({ id, done: true })), seen = S.acted.slice();
    if (S.turn) { out.push({ id: S.turn.id, now: true }); seen.push(S.turn.id); }
    for (let n = nextUp(S, seen); n; n = nextUp(S, seen)) {
      const pick = n.side === 'hero' && n.ids.length > 1;
      (n.side === 'hero' ? n.ids : n.ids.slice(0, 1)).forEach(id => { out.push({ id, pick }); seen.push(id); });
    }
    all(S).filter(u => !seen.includes(u.id)).forEach(u => out.push({ id: u.id, out: true }));
    return out;
  }
  function start(S) {
    S.round = 1; S.acted = []; S.turn = null;
    const roll = rollInit(S), n = nextUp(S); S.side = n.side;
    return [{ t: 'round', n: 1 }, roll, { t: 'side', side: n.side, ids: n.ids }];
  }
  function nextSide(S) {
    const ev = [];
    let n = nextUp(S);
    if (!n) { // the round is over: recharges tick, and everyone rolls initiative again
      S.round++; S.acted = [];
      all(S).forEach(u => { for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--; });
      ev.push({ t: 'round', n: S.round }, rollInit(S));
      n = nextUp(S);
    }
    S.side = n.side;
    ev.push({ t: 'side', side: n.side, ids: n.ids });
    return ev;
  }
  // what a unit's turn would give it if it started now: actions, and dice taken off its first attack
  function turnOf(S, u) {
    if (S.turn && S.turn.id === u.id) return S.turn;
    const lost = u.slow ? u.slow.actions : 0;
    return { id: u.id, left: Math.max(0, TUNE.actions - lost), attacks: 0, used: [], presses: 0, dieMinus: u.slow ? u.slow.dice : 0, fresh: true };
  }
  // the start of a turn: what lasted "until your next turn" ends, poison bites, a slow takes its toll
  function beginTurn(S, u) {
    const ev = [{ t: 'turn', id: u.id, round: S.round }];
    if (u.guard) { u.guard = 0; ev.push(status(u.id, 'guard', false)); }
    if (u.taunt) { u.taunt = null; ev.push(status(u.id, 'taunt', false)); }
    all(S).forEach(x => { if (x.ward && x.ward.by === u.id) { x.ward = null; ev.push(status(x.id, 'ward', false)); } });
    all(S).forEach(x => { if (x.brittle && x.brittle.by === u.id) { x.brittle = null; ev.push(status(x.id, 'brittle', false)); } });
    if (u.hidden && u.hidden.untilTurn) { u.hidden = null; ev.push(status(u.id, 'hidden', false)); }
    const T = turnOf(S, u); delete T.fresh;
    S.turn = T;
    if (u.slow) { if (u.slow.actions) ev.push({ t: 'slowed', id: u.id, lost: u.slow.actions }); u.slow = null; ev.push(status(u.id, 'slow', false)); }
    if (u.poison) {
      const p = u.poison; p.ticks--;
      ev.push({ t: 'tick', id: u.id, key: 'poison', left: p.ticks }, ...hurt(S, null, u, p.dmg, 'poison'));
      if (p.ticks <= 0 && !u.down) { u.poison = null; ev.push(status(u.id, 'poison', false)); }
    }
    return ev;
  }
  function finishTurn(S) {
    const ev = [], u = S.units[S.turn.id];
    if (u.weak) { u.weak = null; ev.push(status(u.id, 'weak', false)); } // a weakening lasts one turn
    // a taunt that held for one goblin only ends once that goblin has acted
    if (u.side === 'foe') all(S).forEach(x => { if (x.taunt && x.taunt.once && (x.taunt.scope === 'all' || u.type === 'goblin')) { x.taunt = null; ev.push(status(x.id, 'taunt', false)); } });
    S.acted.push(u.id); S.turn = null;
    ev.push({ t: 'done', id: u.id });
    checkOver(S, ev);
    if (!S.over) ev.push(...nextSide(S));
    return ev;
  }
  function endTurn(S) { return S.turn ? finishTurn(S) : []; }
  function checkOver(S, ev) {
    if (S.over) return;
    const winner = !standing(S, 'hero').length ? 'foe' : !standing(S, 'foe').length ? 'hero' : null;
    if (winner) { S.over = winner; S.turn = null; ev.push({ t: 'over', winner, round: S.round }); }
  }

  // ---------------- harm and help ----------------
  function hurt(S, src, u, amt, kind, extra = {}) {
    if (u.down) return [];
    const dealt = Math.min(u.hp, Math.max(0, amt));
    u.hp -= dealt;
    if (src) src.stats.dealt += dealt;
    u.stats.taken += dealt;
    const ev = [{ t: 'dmg', id: u.id, src: src && src.id, amount: Math.max(0, amt), hp: u.hp, kind, ...extra }];
    if (u.hp <= 0) {
      Object.assign(u, { down: true, guard: 0, taunt: null, ward: null, hidden: null, coat: null, poison: null, weak: null, slow: null, blessed: null, brittle: null });
      u.stats.falls++;
      if (src) src.stats.kills++;
      ev.push({ t: 'down', id: u.id, src: src && src.id, side: u.side });
    }
    return ev;
  }
  function mend(S, src, u, amt) {
    if (!u || (u.down && u.side === 'foe')) return []; // dead goblins stay dead
    const raised = u.down, h = Math.min(amt, u.max - u.hp);
    if (h <= 0) return [];
    u.hp += h; u.down = false;
    if (src) src.stats.healed += h;
    return [{ t: 'heal', id: u.id, src: src && src.id, amount: h, hp: u.hp, raised }];
  }
  const mostWounded = (S, side, except) => standing(S, side).filter(u => u.hp < u.max && u !== except).sort((a, b) => (b.max - b.hp) - (a.max - a.hp) || a.hp - b.hp || a.slot - b.slot)[0] || null;

  // ---------------- reach and targets ----------------
  function reachable(S, side, reach) {
    const st = standing(S, side);
    if (reach !== 'melee') return st;
    const front = st.filter(u => u.rank === 'front');
    return front.length ? front : st;
  }
  const reachOf = (u, A) => A.reach === 'unit' ? u.reach : A.reach;
  function targets(S, id, actId) {
    const u = S.units[id], A = ACTIONS[actId];
    if (!u || !A) return [];
    if (A.target === 'foe' || A.target === 'all') {
      const reach = A.target === 'all' ? 'ranged' : reachOf(u, A);
      let r = reachable(S, enemySide(u), reach);
      // goblins cannot attack a hidden hero, unless every hero they could reach is hidden
      const seen = r.filter(x => !x.hidden); if (seen.length) r = seen;
      // a taunt draws every attack it covers
      if (u.side === 'foe' && A.kind === 'attack') { const tn = r.filter(x => x.taunt && (x.taunt.scope === 'all' || u.type === 'goblin')); if (tn.length) r = tn; }
      return r.map(x => x.id);
    }
    if (A.target === 'ally') {
      if (actId === 'heal') return all(S).filter(x => x.side === u.side && (x.down || x.hp < x.max || x.weak)).map(x => x.id);
      return standing(S, u.side).map(x => x.id);
    }
    if (A.target === 'other') return standing(S, u.side).filter(x => x !== u).map(x => x.id);
    return [];
  }
  function canUse(S, id, actId) {
    const u = S.units[id], A = ACTIONS[actId];
    if (!u || !A || u.down) return { ok: false, why: 'Down' };
    const T = turnOf(S, u);
    if (A.cost > T.left) return { ok: false, why: T.left ? `Needs ${A.cost} actions` : 'No actions left', cost: true };
    if (A.kind !== 'attack' && T.used.includes(actId)) return { ok: false, why: 'Used this turn', used: true };
    if (actId === 'throw' && u.disarmed) return { ok: false, why: 'Your dagger is on the floor' };
    if (actId === 'retrieve' && !u.disarmed) return { ok: false, why: 'Your dagger is in your hand' };
    if (u.cd[actId] > 0) return { ok: false, why: `Ready in ${u.cd[actId]} ${u.cd[actId] > 1 ? 'rounds' : 'round'}`, wait: u.cd[actId] };
    if (['foe', 'all', 'ally', 'other'].includes(A.target) && !targets(S, id, actId).length) return { ok: false, why: A.target === 'ally' && actId === 'heal' ? 'No one is hurt' : 'No one in reach' };
    if (actId === 'chant' && !mostWounded(S, u.side)) return { ok: false, why: 'No one is hurt' };
    return { ok: true };
  }
  // an attack's edge right now: + is advantage, − disadvantage. Every attack after the first this turn is −1 more; a
  // blessing adds, a Slow's weakest result takes one off the first attack. Capped by TUNE.maxDice. A spell (Fireball)
  // has none.
  function attackEdge(S, u, A) {
    if (A && A.flat) return 0;
    const T = turnOf(S, u);
    let e = -T.attacks;
    if (u.blessed) e += u.blessed.edge || 0;
    e -= T.dieMinus || 0;
    const cap = TUNE.maxDice - 1;
    return Math.max(-cap, Math.min(cap, e));
  }
  // would a hit on t press for u now? Not if u has pressed this turn, nor on a Brittle that ends when u's turn starts
  const pressable = (S, u, t) => !!t.brittle && turnOf(S, u).presses < TUNE.presses && !(t.brittle.by === u.id && !(S.turn && S.turn.id === u.id));
  // the die an action rolls: its own (Fireball's d6), or the character's
  const dieOf = (u, A) => (A && A.die) || u.die;
  // the dice an attack would roll right now: how many, of what size, and whether the best or the worst one counts
  function attackDice(S, u, A) {
    const e = attackEdge(S, u, A);
    return { n: 1 + Math.abs(e), keep: e > 0 ? 'high' : e < 0 ? 'low' : null, edge: e, sides: dieOf(u, A) };
  }
  // the weapon an attack uses on t: Wenna's sling for a foe out of melee reach, fists for Vex without his dagger
  function weaponOf(S, u, A, t) {
    if (!A || A.kind !== 'attack' || A.flat) return null;
    if (A.weapon === 'thrown') return u.weapons.thrown;
    if (u.disarmed) return { name: 'Fists', dmg: TUNE.unarmed, type: 'blunt', unarmed: true };
    if (u.weapons.ranged && t && !reachable(S, t.side, 'melee').includes(t)) return u.weapons.ranged;
    return u.weapons.main;
  }

  // ---------------- orders ----------------
  // id uses actId (on targetId). If its turn has not started, it starts now.
  function act(S, id, actId, targetId) {
    const u = S.units[id], A = ACTIONS[actId];
    if (!ready(S).ids.includes(id)) throw new Error(`It is not ${id}'s turn`);
    if (!u.actions.includes(actId)) throw new Error(`${u.name} cannot ${actId}`);
    const ok = canUse(S, id, actId); if (!ok.ok) throw new Error(`${u.name} cannot ${actId}: ${ok.why}`);
    if (['foe', 'ally', 'other'].includes(A.target) && !targets(S, id, actId).includes(targetId)) throw new Error(`${u.name} cannot ${actId} ${targetId}`);
    const ev = [];
    if (!S.turn) {
      ev.push(...beginTurn(S, u));
      checkOver(S, ev);
      if (S.over) return ev;
      if (u.down || S.turn.left <= 0) { ev.push(...finishTurn(S)); return ev; }
    }
    ev.push({ t: 'act', id, act: actId, target: targetId || null, left: S.turn.left - A.cost });
    S.turn.left -= A.cost;
    if (A.recharge) u.cd[actId] = A.recharge;
    if (A.kind === 'attack') ev.push(...strike(S, u, A, A.target === 'all' ? targets(S, id, actId) : [targetId]));
    else if (A.kind === 'utility') { S.turn.used.push(actId); ev.push(...utility(S, u, A)); }
    else { S.turn.used.push(actId); ev.push(...power(S, u, A, targetId)); }
    checkOver(S, ev);
    if (!S.over && S.turn && (u.down || S.turn.left <= 0)) ev.push(...finishTurn(S));
    return ev;
  }

  // roll n dice of a size; with advantage keep the highest, with disadvantage the lowest (the rest are dropped)
  function rollPool(S, sides, n, keep) {
    const dice = [];
    for (let i = 0; i < n; i++) dice.push({ n: die(S, sides), from: -1 });
    if (keep && n > 1) {
      let k = 0;
      dice.forEach((d, i) => { if (keep === 'high' ? d.n > dice[k].n : d.n < dice[k].n) k = i; });
      dice.forEach((d, i) => { if (i !== k) d.dropped = true; });
    }
    return dice;
  }
  // roll to hit: the kept die; a 1 misses, the top number crits (unless the roller never crits) and rolls again, each
  // further die read the same way. Returns the dice and how many hits they add up to.
  function rollToHit(S, u, D) {
    const dice = rollPool(S, D.sides, D.n, D.keep);
    let p = dice.findIndex(d => !d.dropped), hits = 0, crits = 0;
    for (let k = 0; ; k++) {
      const v = dice[p].n;
      if (v === 1) { dice[p].miss = true; break; }
      hits++;
      if (v < D.sides || u.noCrit || k >= TUNE.maxChain) break;
      dice[p].crit = true; crits++;
      dice.push({ n: die(S, D.sides), from: p, extra: true }); p = dice.length - 1;
    }
    return { dice, hits, crits };
  }
  // what the hits deal, with what the attacker carries: a blessing, hiding, a curse
  function damageOf(u, W, hits) {
    if (!hits) return 0;
    let dmg = W.dmg * hits + (u.blessed ? u.blessed.dmg || 0 : 0);
    if (u.hidden) dmg = Math.ceil(dmg * u.hidden.mult);
    if (u.weak) dmg -= u.weak.n;
    return Math.max(0, dmg);
  }
  // a hit lands on t: harm (less its Guard), a coated blade's poison, a press
  function land(S, u, t, raw, kind, extra, ev) {
    const T = S.turn, amt = Math.max(0, raw - (t.guard || 0));
    ev.push(...hurt(S, u, t, amt, kind, { raw, guarded: Math.min(raw, t.guard || 0), ...extra }));
    if (u.coat && !t.down && amt > 0) { t.poison = { ticks: 2, dmg: u.coat.dmg }; ev.push(status(t.id, 'poison', true, { n: u.coat.dmg })); }
    // press: a blow that lands on a Brittle foe wins the attacker an extra action (once a turn)
    if (t.brittle && amt > 0 && T && !T.pressedNow && T.presses < TUNE.presses) {
      T.pressedNow = true; T.presses++; T.left++; u.stats.presses++;
      ev.push({ t: 'press', id: u.id, target: t.id, left: T.left });
      t.brittle.n--; if (t.brittle.n <= 0 || t.down) { t.brittle = null; ev.push(status(t.id, 'brittle', false)); }
    }
  }
  // a spell (Fireball): one die of damage on every target, no roll to hit
  function spell(S, u, A, ids) {
    const ev = [], sides = dieOf(u, A), dice = rollPool(S, sides, 1, null), v = dice[0].n;
    u.stats.rolls++; u.stats.dice++;
    ev.push({ t: 'roll', id: u.id, act: A.id, mode: 'sum', sides, mark: false, groups: [{ target: null, dice }], targets: ids, n: 1, keep: null, edge: 0, total: v, dmgType: 'magic' });
    S.turn.pressedNow = false;
    ids.forEach(tid => { const t = S.units[tid]; if (!t.down) land(S, u, t, Math.max(0, v - (u.weak ? u.weak.n : 0)), 'hit', {}, ev); });
    return ev;
  }
  function strike(S, u, A, ids) {
    if (A.flat) return spell(S, u, A, ids);
    const ev = [], T = S.turn, D = attackDice(S, u, A);
    let t = S.units[ids[0]];
    // an Interpose: the blow falls on the protector instead
    if (t.ward && !S.units[t.ward.by].down) {
      const by = S.units[t.ward.by];
      ev.push({ t: 'interpose', id: by.id, from: t.id, src: u.id });
      t.ward.uses--; if (t.ward.uses <= 0) { t.ward = null; ev.push(status(t.id, 'ward', false)); }
      t = by;
    }
    T.pressedNow = false;
    const W = weaponOf(S, u, A, t), r = rollToHit(S, u, D), dmg = damageOf(u, W, r.hits), mult = u.hidden ? u.hidden.mult : 0;
    S.maxChain = Math.max(S.maxChain || 0, r.crits);
    u.stats.rolls++; u.stats.dice += r.dice.length; u.stats.crits += r.crits; u.stats[r.hits ? 'hits' : 'misses']++;
    ev.push({ t: 'roll', id: u.id, act: A.id, mode: 'hit', sides: D.sides, mark: !u.noCrit, groups: [{ target: t.id, dice: r.dice }], targets: [t.id], n: D.n, keep: D.keep, edge: D.edge,
      hits: r.hits, crits: r.crits, total: dmg, weapon: W, from: mult, blessed: !!u.blessed, later: T.attacks > 0 });
    if (r.hits) land(S, u, t, dmg, r.crits ? 'surge' : 'hit', { from: mult, crit: r.crits > 0, dmgType: W.type }, ev);
    else ev.push({ t: 'miss', id: t.id, src: u.id });
    // a thrown dagger stays where it fell
    if (A.weapon === 'thrown') { u.disarmed = true; u.actions = u.actions.map(a => a === 'throw' ? 'retrieve' : a); ev.push(status(u.id, 'disarmed', true)); }
    // what this attack used up
    T.attacks++; T.dieMinus = 0;
    if (u.blessed) { u.blessed = null; ev.push(status(u.id, 'blessed', false)); }
    if (u.hidden) { u.hidden.strikes--; if (u.hidden.strikes <= 0) { u.hidden = null; ev.push(status(u.id, 'hidden', false)); } }
    if (u.coat && r.hits) { u.coat.attacks--; if (u.coat.attacks <= 0) { u.coat = null; ev.push(status(u.id, 'coat', false)); } }
    return ev;
  }
  // an action with no roll: picking up a thrown dagger
  function utility(S, u, A) {
    const ev = [];
    if (A.id === 'retrieve') { u.disarmed = false; u.actions = u.actions.map(a => a === 'retrieve' ? 'throw' : a); ev.push({ t: 'tier', id: u.id, act: A.id, text: 'Dagger back in hand.' }, status(u.id, 'disarmed', false)); }
    return ev;
  }

  // a power: roll 1 die, flat, and read it as its card says
  function power(S, u, A, targetId) {
    const sides = dieOf(u, A), d = rollPool(S, sides, 1, null)[0], v = d.n, tier = tierOf(v, sides), R = TIERS.indexOf(tier);
    u.stats.rolls++; u.stats.dice++;
    const ev = [{ t: 'roll', id: u.id, act: A.id, mode: A.read, sides, mark: true, groups: [{ target: targetId || null, dice: [d] }], total: v, tier }];
    const t = targetId && S.units[targetId];
    const say = text => ev.push({ t: 'tier', id: u.id, act: A.id, tier, n: v, text, target: targetId || null });
    const guard = (x, n) => { if (!x || x.down) return; x.guard += n; ev.push(status(x.id, 'guard', true, { n: x.guard })); };
    if (A.read === 'tier') say(A.rows[tier]);
    switch (A.id) {
      case 'defend': guard(u, A.guard[tier]); break;
      case 'taunt':
        u.taunt = { scope: R === 2 ? 'all' : 'fighters', once: R === 0 };
        ev.push(status(u.id, 'taunt', true, { scope: u.taunt.scope, once: u.taunt.once }));
        break;
      case 'interpose':
        t.ward = { by: u.id, uses: R === 0 ? 1 : 99 };
        ev.push(status(t.id, 'ward', true, { by: u.id }));
        if (R === 2) guard(u, 1);
        break;
      case 'hide':
        u.hidden = [{ mult: 1.5, strikes: 1, untilTurn: true }, { mult: 2, strikes: 1 }, { mult: 2, strikes: 2 }][R];
        ev.push(status(u.id, 'hidden', true, { tier }));
        break;
      case 'poison':
        u.coat = [{ attacks: 1, dmg: 1 }, { attacks: 2, dmg: 1 }, { attacks: 2, dmg: 2 }][R];
        ev.push(status(u.id, 'coat', true, { n: u.coat.attacks }));
        break;
      case 'frostbite':
        say(`Brittle for ${v} ${v > 1 ? 'presses' : 'press'}.`);
        t.brittle = { n: v, by: u.id };
        ev.push(status(t.id, 'brittle', true, { n: v }));
        break;
      case 'curse':
        t.weak = { n: R + 1 };
        ev.push(status(t.id, 'weak', true, { n: t.weak.n }));
        break;
      case 'slow':
        t.slow = [{ actions: 0, dice: 1 }, { actions: 1, dice: 0 }, { actions: 2, dice: 0 }][R];
        ev.push(status(t.id, 'slow', true, { lost: t.slow.actions }));
        break;
      case 'bless':
        t.blessed = [{ edge: 0, dmg: 1 }, { edge: 1, dmg: 0 }, { edge: 2, dmg: 0 }][R];
        ev.push(status(t.id, 'blessed', true, { tier }));
        break;
      case 'heal':
        say(`Heals ${v}.`);
        ev.push(...mend(S, u, t, v));
        if (t.weak) { t.weak = null; ev.push(status(t.id, 'weak', false)); }
        break;
      case 'prayer':
        say(`Every hero heals ${v}.`);
        all(S).filter(x => x.side === u.side).forEach(x => ev.push(...mend(S, u, x, v)));
        break;
      case 'chant':
        say(`Heals ${v}.`);
        ev.push(...mend(S, u, mostWounded(S, u.side), v));
        break;
    }
    return ev;
  }

  // ---------------- odds ----------------
  // an attack against one target: the chance to hit, average damage (crits included) and the chance to finish it
  function odds(S, id, actId, targetId, n = 600) {
    const u = S.units[id], A = ACTIONS[actId], t = S.units[targetId];
    if (!u || !A || !t || A.kind !== 'attack') return null;
    const T = { rs: (S.rs ^ 0x5bd1e995) | 0, units: S.units }, D = attackDice(S, u, A), W = weaponOf(S, u, A, t);
    let sum = 0, killN = 0, hitN = 0;
    for (let i = 0; i < n; i++) {
      let d;
      if (A.flat) { d = die(T, D.sides); hitN++; }
      else { const r = rollToHit(T, u, D); if (r.hits) hitN++; d = damageOf(u, W, r.hits); }
      d = Math.max(0, d - (t.guard || 0));
      sum += d; if (d >= t.hp) killN++;
    }
    return { avg: sum / n, kill: killN / n, hit: hitN / n, weapon: W, dice: D.n, keep: D.keep, sides: D.sides, press: pressable(S, u, t) };
  }

  // ---------------- minds ----------------
  // the goblins: fighters swing twice (at the weakest, half the time); the shaman mends or curses, then bolts
  function foeMind(S, u) {
    const T = turnOf(S, u), can = a => u.actions.includes(a) && canUse(S, u.id, a).ok;
    const r = act => ({ id: u.id, ...act });
    if (T.left <= 0) return r({ end: true });
    if (can('chant')) { const w = mostWounded(S, u.side); if (w && w.max - w.hp >= 4) return r({ act: 'chant' }); }
    if (can('curse') && T.left > 1) {
      const h = targets(S, u.id, 'curse').map(i => S.units[i]).filter(x => !x.weak && !S.acted.includes(x.id)).sort((a, b) => b.hp - a.hp)[0];
      if (h && rnd(S) < .6) return r({ act: 'curse', target: h.id });
    }
    if (can('attack')) {
      const t = targets(S, u.id, 'attack').map(i => S.units[i]);
      const tg = rnd(S) < .5 ? t.slice().sort((a, b) => a.hp - b.hp)[0] : pick(S, t);
      return r({ act: 'attack', target: tg.id });
    }
    return r({ end: true });
  }
  // a plain bot for the party, used by Auto and the simulator
  function heroMind(S, u) {
    const T = turnOf(S, u), can = a => u.actions.includes(a) && canUse(S, u.id, a).ok;
    const tg = a => targets(S, u.id, a).map(i => S.units[i]);
    const weakest = arr => arr.slice().sort((a, b) => a.hp - b.hp || a.slot - b.slot)[0];
    const strongest = arr => arr.slice().sort((a, b) => b.hp - a.hp || a.slot - b.slot)[0];
    const r = act => ({ id: u.id, ...act });
    const foes = standing(S, 'foe'), heroes = standing(S, 'hero');
    const attack = () => { const at = tg('attack'); return at.length ? r({ act: 'attack', target: (at.find(x => pressable(S, u, x)) || at.find(x => x.hp <= 2) || weakest(at)).id }) : null; };
    if (T.left <= 0) return r({ end: true });
    const plan = [];
    if (u.type === 'fighter') {
      const fighters = foes.filter(f => f.type === 'goblin').length;
      const soft = heroes.filter(h => h !== u && h.hp <= h.max * .5 && !h.hidden).sort((a, b) => a.hp - b.hp)[0];
      plan.push(() => T.attacks ? null : attack());
      plan.push(() => soft && can('interpose') ? r({ act: 'interpose', target: soft.id }) : null);
      plan.push(() => fighters >= 2 && u.hp >= u.max * .5 && can('taunt') ? r({ act: 'taunt' }) : null);
      plan.push(() => can('defend') ? r({ act: 'defend' }) : null);
    } else if (u.type === 'rogue') {
      const back = u.disarmed ? null : tg('throw').find(x => x.rank === 'back');
      plan.push(() => u.disarmed && can('retrieve') ? r({ act: 'retrieve' }) : null);
      plan.push(() => !u.hidden && !T.attacks && can('hide') ? r({ act: 'hide' }) : null);
      plan.push(() => T.attacks ? null : back && !foes.some(f => f.rank === 'front') ? null : attack());
      plan.push(() => !u.hidden && can('hide') ? r({ act: 'hide' }) : null);
      plan.push(() => !u.coat && can('poison') ? r({ act: 'poison' }) : null);
      plan.push(() => back && can('throw') ? r({ act: 'throw', target: back.id }) : null);
    } else if (u.type === 'mage') {
      plan.push(() => T.left >= 2 && foes.length >= 3 && can('fireball') ? r({ act: 'fireball' }) : null);
      plan.push(() => { const f = strongest(tg('frostbite').filter(x => !x.brittle)); return f && can('frostbite') && !T.attacks ? r({ act: 'frostbite', target: f.id }) : null; });
      plan.push(() => T.attacks ? null : attack());
      plan.push(() => { const f = strongest(tg('slow').filter(x => !x.slow && !S.acted.includes(x.id))); return f && can('slow') ? r({ act: 'slow', target: f.id }) : null; });
    } else if (u.type === 'cleric') {
      const hurtN = heroes.filter(h => h.hp <= h.max * .6).length + all(S).filter(h => h.side === 'hero' && h.down).length;
      plan.push(() => T.left >= 2 && hurtN >= 2 && can('prayer') ? r({ act: 'prayer' }) : null);
      plan.push(() => { if (!can('heal')) return null; const t = tg('heal').filter(x => x.down || x.hp <= x.max * .55 || x.weak).sort((a, b) => (a.down ? -1 : 0) - (b.down ? -1 : 0) || a.hp / a.max - b.hp / b.max)[0]; return t ? r({ act: 'heal', target: t.id }) : null; });
      plan.push(() => { if (!can('bless')) return null; const t = tg('bless').filter(x => !x.blessed && x !== u && !S.acted.includes(x.id))[0]; return t ? r({ act: 'bless', target: t.id }) : null; });
    }
    plan.push(attack);
    for (const p of plan) { const c = p(); if (c && (c.end || canUse(S, u.id, c.act).ok)) return c; }
    return r({ end: true });
  }
  // which hero the bot sends next: the cleric when someone needs her, else top to bottom
  function heroPick(S) {
    const us = ready(S).ids.map(i => S.units[i]);
    const c = us.find(u => u.actions.includes('heal'));
    if (c && canUse(S, c.id, 'heal').ok && targets(S, c.id, 'heal').some(i => S.units[i].down || S.units[i].hp <= S.units[i].max * .5)) return c;
    return us[0];
  }
  // the next order for whoever may act: { id, act, target } or { id, end: true }
  function mind(S) {
    const r = ready(S);
    const u = r.side === 'foe' ? S.units[r.ids[0]] : r.mid ? S.units[r.ids[0]] : heroPick(S);
    return u.side === 'foe' ? foeMind(S, u) : heroMind(S, u);
  }
  // carry out an order from mind()
  function obey(S, c) {
    if (!c.end) return act(S, c.id, c.act, c.target);
    if (!S.turn) { const u = S.units[c.id]; const ev = beginTurn(S, u); checkOver(S, ev); return S.over ? ev : ev.concat(finishTurn(S)); }
    return endTurn(S);
  }

  // ---------------- the simulator ----------------
  function playOut(S) {
    start(S);
    for (let i = 0; i < 3000 && !S.over; i++) obey(S, mind(S));
    return S;
  }
  function simulate(n = 1000, seed = 1) {
    const r = { n, wins: 0, rounds: 0, heroHp: 0, heroesUp: 0, flawless: 0, maxChain: 0, units: {} };
    for (let i = 0; i < n; i++) {
      const S = playOut(newBattle({ seed: seed + i * 7919 }));
      if (S.over === 'hero') r.wins++;
      r.rounds += S.round; r.maxChain = Math.max(r.maxChain, S.maxChain || 0);
      const hs = all(S).filter(u => u.side === 'hero');
      r.heroHp += hs.reduce((s, u) => s + u.hp, 0); r.heroesUp += hs.filter(u => !u.down).length;
      if (S.over === 'hero' && hs.every(u => !u.stats.falls)) r.flawless++;
      all(S).forEach(u => {
        const q = r.units[u.id] || (r.units[u.id] = { name: u.name, cls: u.cls, side: u.side, dealt: 0, taken: 0, healed: 0, downs: 0, crits: 0, misses: 0, dice: 0, rolls: 0, presses: 0 });
        q.presses += u.stats.presses; q.dealt += u.stats.dealt; q.taken += u.stats.taken; q.healed += u.stats.healed; q.crits += u.stats.crits; q.misses += u.stats.misses; q.dice += u.stats.dice; q.rolls += u.stats.rolls;
        q.downs += u.stats.falls ? 1 : 0;
      });
    }
    r.winRate = r.wins / n; r.avgRounds = r.rounds / n; r.avgHeroHp = r.heroHp / n; r.avgHeroesUp = r.heroesUp / n; r.flawlessRate = r.flawless / n;
    Object.values(r.units).forEach(q => { q.avgDealt = q.dealt / n; q.avgTaken = q.taken / n; q.avgHealed = q.healed / n; q.downRate = q.downs / n; });
    return r;
  }

  // ---------------- tuning: the sheets' edits, kept between visits ----------------
  // { units: { type: { hp, speed, die, weapons: { slot: dmg } } }, tune: { ... } }
  function applyTuning(t) {
    Object.keys(UNITS).forEach(k => Object.assign(UNITS[k], JSON.parse(JSON.stringify(DEFAULTS[k]))));
    Object.assign(TUNE, TUNE0);
    if (!t) return;
    Object.entries(t.units || {}).forEach(([k, v]) => {
      if (!UNITS[k]) return;
      ['hp', 'speed'].forEach(f => { if (Number.isFinite(v[f])) UNITS[k][f] = v[f]; });
      if (SIZES.includes(v.die)) UNITS[k].die = v.die;
      Object.entries(v.weapons || {}).forEach(([w, d]) => { if (UNITS[k].weapons[w] && Number.isFinite(d)) UNITS[k].weapons[w].dmg = d; });
    });
    Object.entries(t.tune || {}).forEach(([k, v]) => { if (k in TUNE && typeof v === typeof TUNE0[k]) TUNE[k] = v; });
  }

  return {
    TUNE, TUNE0, SIZES, TIERS, TIER_NAME, DMG_TYPES, ACTIONS, UNITS, DEFAULTS, PARTY, ENCOUNTER,
    newBattle, start, ready, queue, initOf, act, endTurn, obey, targets, canUse, turnOf, attackDice, attackEdge, dieOf, weaponOf, pressable, tierOf, tierRange, tierOdds, standing, reachable, odds,
    mind, simulate, playOut, applyTuning, mostWounded,
  };
})();
if (typeof module !== 'undefined') module.exports = DV;
