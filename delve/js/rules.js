'use strict';
// GOBLIN DELVE · THE RULES
// Everything the dice decide. No graphics code: this file runs in the page and in Node (tools/sim.js).
// A battle is plain JSON. Every order (start, act, endTurn) changes it and returns a list of events for the view to play.
// To try a rule variant, change the tables at the top: TUNE, SURGES, SETBACKS, ACTIONS, UNITS, PARTY and ENCOUNTER.
const DV = (() => {

  // ---------------- house rules ----------------
  const TUNE = {
    actions: 2,          // actions in a turn
    dice: 1,             // dice an attack rolls, before advantage and disadvantage
    maxDice: 3,          // most dice advantage or disadvantage can roll (keep the best, or the worst)
    presses: 1,          // extra actions a hero can win in one turn by hitting a Brittle foe
    explode: false,      // every surge on an attack rolls one more die (the rogue's always do)
    maxChain: 12,        // most extra dice one roll can explode into
  };

  // ---------------- the dice ----------------
  // Everyone rolls the same d6: 1, 1, 2, 2, 3, 3. The 3s carry the surge mark, the 1s the setback mark, the 2s are plain.
  // An attack rolls 1 die: its number is the damage, a 3 triggers the character's surge and a 1 their setback. Each attack
  // after the first in a turn has disadvantage (roll 2, keep the lowest; the third, 3). Advantage rolls extra dice and
  // keeps the highest; the two cancel, and no roll uses more than TUNE.maxDice dice. Powers read their dice as their
  // card says.
  // Press: a hero whose attack hits a Brittle goblin (Orlen's Frostbite) gains an extra action that turn.
  const SIDES = 6;
  const FACE_KINDS = ['neg', 'plain', 'surge'];
  const FACE_NAME = { neg: 'Setback', plain: 'Plain', surge: 'Surge' };
  const FACE_RANK = { neg: 0, plain: 1, surge: 2 };
  const FACE_VALUE = { neg: 1, plain: 2, surge: 3 };
  const DIE = { neg: 2, plain: 2, surge: 2 };
  function dieOf(n) { // the faces spread round the die, so twins are not on opposite sides
    const bag = FACE_KINDS.flatMap(k => Array(n[k] || 0).fill(k)), out = [], order = [0, 2, 4, 1, 3, 5];
    bag.forEach((k, i) => out[order[i]] = k);
    return out;
  }
  const counts = faces => Object.fromEntries(FACE_KINDS.map(k => [k, faces.filter(f => f === k).length]));

  // ---------------- surges and setbacks: what a 3 and a 1 do on an attack, by character ----------------
  const SURGES = {
    shieldUp: { name: 'Shield Up', text: '+1 Guard until your next turn.' },
    explode: { name: 'Explode', text: 'Roll one more die and add it. It can explode too.' },
    arc: { name: 'Arc', text: '1 damage to every other goblin.' },
    mercy: { name: 'Mercy', text: 'The most wounded hero still standing heals 2.' },
    gangUp: { name: 'Gang Up', text: '1 more damage for each other goblin fighter still standing.' },
    mend: { name: 'Mend', text: 'The most wounded goblin still standing heals 2.' },
  };
  const SETBACKS = {
    offBalance: { name: 'Off Balance', text: 'The next attack on you deals 1 more.' },
    miss: { name: 'Miss', text: 'That die deals nothing.' },
    backlash: { name: 'Backlash', text: 'You take 1 damage.' },
    spent: { name: 'Spent', text: 'Your next heal is 1 less.' },
    fumble: { name: 'Fumble', text: 'It loses its next action this turn.' },
    backfire: { name: 'Backfire', text: 'It takes 1 damage.' },
  };

  // ---------------- actions ----------------
  // kind: attack (rolls TUNE.dice and adds them up; a 3 triggers the surge, a 1 the setback) | power
  // A power rolls `dice` dice. read 'total': the dice add up to the amount (healing). read 'die': one die, and its face
  // picks the result in `rows` (setback, plain, surge). amount: the number on that die is the amount (Guard, a penalty),
  // so it is printed on the dice; other powers show their faces' marks alone.
  // cost: actions it takes · target: foe | all (every foe) | ally (a friend; heals reach the fallen) | other (a friend
  // not yourself) | self | none · reach: melee (only the front rank while anyone stands in it) | ranged | unit (the
  // unit's own) · recharge: rounds before it can be used again. A power can be used once a turn; Attack as often as
  // you have actions.
  const ACTIONS = {
    attack: { name: 'Attack', kind: 'attack', cost: 1, target: 'foe', reach: 'unit', text: 'Roll a die against one foe: the number is the damage. Each attack after your first this turn has disadvantage.' },
    knives: { name: 'Throwing Knives', icon: '🎯', kind: 'attack', cost: 1, target: 'foe', reach: 'ranged', text: 'An attack that reaches any goblin, even in the back rank. Counts as an attack.' },
    fireball: { name: 'Fireball', icon: '🔥', kind: 'attack', cost: 2, target: 'all', reach: 'ranged', recharge: 2, edge: 1, text: 'Both actions. Roll with advantage; every goblin takes the result.' },
    defend: {
      name: 'Defend', icon: '🛡️', kind: 'power', cost: 1, target: 'self', dice: 1, read: 'die', amount: true, text: 'Guard: until your next turn, each attack on you deals that much less damage.',
      rows: { neg: 'Guard 1.', plain: 'Guard 2.', surge: 'Guard 3.' },
    },
    taunt: {
      name: 'Taunt', icon: '📯', kind: 'power', cost: 1, target: 'none', dice: 1, read: 'die', text: 'Until your next turn, goblins that can reach you must attack you.',
      rows: { neg: 'The next goblin fighter to act must attack you.', plain: 'Every goblin fighter must attack you.', surge: 'Every goblin, the shaman too, must attack you.' },
    },
    interpose: {
      name: 'Interpose', icon: '🔰', kind: 'power', cost: 1, target: 'other', dice: 1, read: 'die', text: 'Until your next turn, you step in front of another hero: attacks on them hit you.',
      rows: { neg: 'The next attack on them hits you instead.', plain: 'Every attack on them hits you instead.', surge: 'Every attack on them hits you instead, and you gain Guard 1.' },
    },
    hide: {
      name: 'Hide', icon: '🌫️', kind: 'power', cost: 1, target: 'self', dice: 1, read: 'die', text: 'While hidden, goblins cannot attack you, and your next strike doubles its roll.',
      rows: { neg: 'Hidden until your next turn starts; a strike from hiding deals half as much again.', plain: 'Hidden until you strike; that strike doubles its roll.', surge: 'Hidden for two strikes, each doubling its roll.' },
    },
    poison: {
      name: 'Poison Blade', icon: '🧪', kind: 'power', cost: 1, target: 'self', dice: 1, read: 'die', text: 'Coat your weapon. A goblin your coated attack lands on is poisoned: it loses HP at the start of each of its next 2 turns.',
      rows: { neg: 'Your next attack poisons, 1 a turn.', plain: 'Your next 2 attacks poison, 1 a turn.', surge: 'Your next 2 attacks poison, 2 a turn.' },
    },
    frostbite: {
      name: 'Frostbite', icon: '❄️', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', dice: 1, read: 'die', amount: true, text: 'Make a goblin Brittle until your next turn: a hero whose attack hits it presses, gaining an extra action that turn (once a turn). The roll is how many presses it gives.',
      rows: { neg: 'Brittle for 1 press.', plain: 'Brittle for 2 presses.', surge: 'Brittle for 3 presses.' },
    },
    slow: {
      name: 'Slow', icon: '🐌', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', dice: 1, read: 'die', text: 'Bog a foe down for its next turn.',
      rows: { neg: 'Its first attack has disadvantage.', plain: 'It loses 1 action.', surge: 'It loses its whole turn.' },
    },
    heal: { name: 'Heal', icon: '💖', kind: 'power', cost: 1, target: 'ally', dice: 2, read: 'total', text: 'A hero heals the total of the dice, and lifts curses. A fallen hero gets back up.' },
    bless: {
      name: 'Bless', icon: '🙏', kind: 'power', cost: 1, target: 'ally', dice: 1, read: 'die', text: 'Strengthen a standing hero\'s next attack.',
      rows: { neg: '+1 damage on their next attack.', plain: 'Advantage on their next attack.', surge: 'Double advantage on their next attack.' },
    },
    prayer: { name: 'Prayer of Healing', icon: '🕯️', kind: 'power', cost: 2, target: 'none', recharge: 3, dice: 2, read: 'total', text: 'Both actions. Every hero heals the total of the dice, and the fallen get back up.' },
    chant: { name: 'Mending Chant', icon: '🎶', kind: 'power', cost: 1, target: 'none', dice: 2, read: 'total', text: 'The most wounded goblin heals the total of the dice.' },
    curse: {
      name: 'Curse', icon: '🪬', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', dice: 1, read: 'die', amount: true, text: 'Hex a hero: on their next turn, their attacks deal the roll less. Heal lifts it.',
      rows: { neg: '−1 damage on their attacks.', plain: '−2 damage on their attacks.', surge: '−3 damage on their attacks.' },
    },
  };
  Object.keys(ACTIONS).forEach(k => ACTIONS[k].id = k);

  // ---------------- who fights ----------------
  // rank: front or back · speed: initiative, the fastest first · surge and setback: what their 3s and 1s do on an attack
  // faces: their die (everyone's starts as 1, 1, 2, 2, 3, 3; the sheets can change it)
  const UNITS = {
    fighter: { name: 'Brakka', cls: 'Fighter', side: 'hero', rank: 'front', hp: 16, speed: 3, reach: 'melee', hitIcon: '⚔️', weapon: 'Longsword', surge: 'shieldUp', setback: 'offBalance', actions: ['attack', 'defend', 'taunt', 'interpose'], blurb: 'Shield first, questions later. Holds the line so nobody else has to.' },
    mage: { name: 'Orlen', cls: 'Wizard', side: 'hero', rank: 'back', hp: 10, speed: 2, reach: 'ranged', hitIcon: '✨', weapon: 'Arcane bolt', surge: 'arc', setback: 'backlash', actions: ['attack', 'fireball', 'frostbite', 'slow'], blurb: 'Old, frail and very hard to argue with from range.' },
    cleric: { name: 'Sister Wenna', cls: 'Cleric', side: 'hero', rank: 'front', hp: 14, speed: 2, reach: 'ranged', hitIcon: '🌟', weapon: 'Holy light', surge: 'mercy', setback: 'spent', actions: ['attack', 'heal', 'bless', 'prayer'], blurb: 'Mends the living and smites the rest from a safe distance.' },
    rogue: { name: 'Vex', cls: 'Rogue', side: 'hero', rank: 'back', hp: 11, speed: 4, reach: 'melee', hitIcon: '🗡️', weapon: 'Dagger', surge: 'explode', setback: 'miss', actions: ['attack', 'hide', 'poison', 'knives'], blurb: 'Quick, quiet, and always looking for the soft spot.' },
    goblin: { name: 'Goblin', cls: 'Goblin fighter', side: 'foe', rank: 'front', hp: 13, speed: 3, reach: 'melee', hitIcon: '🪓', weapon: 'Hatchet', surge: 'gangUp', setback: 'fumble', actions: ['attack'], blurb: 'Brave in a crowd. Braver in a bigger one.' },
    shaman: { name: 'Goblin Shaman', cls: 'Goblin shaman', side: 'foe', rank: 'back', hp: 11, speed: 2, reach: 'ranged', hitIcon: '💀', weapon: 'Hex bolt', surge: 'mend', setback: 'backfire', actions: ['attack', 'chant', 'curse'], blurb: 'Keeps the others standing, and keeps well behind them.' },
  };
  Object.values(UNITS).forEach(T => { T.faces = dieOf(DIE); });
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
  const rollFace = (S, u) => { const side = die(S, u.faces.length) - 1; return { face: u.faces[side], side }; };

  // ---------------- a battle ----------------
  function makeUnit(id, type, name, slot) {
    const T = UNITS[type];
    return {
      id, type, name: name || T.name, cls: T.cls, side: T.side, rank: T.rank, slot,
      hp: T.hp, max: T.hp, speed: T.speed, reach: T.reach, hitIcon: T.hitIcon, weapon: T.weapon,
      surge: T.surge, setback: T.setback, faces: T.faces.slice(), actions: T.actions.slice(), cd: {}, down: false,
      // statuses: guard (number), taunt, ward (protected by an Interpose), hidden, coat (poisoned blade), poison, weak,
      // slow, blessed, exposed (Off Balance: extra damage on the next attack taken), spent (less on the next heal),
      // brittle (Frostbite: hits on it press)
      guard: 0, taunt: null, ward: null, hidden: null, coat: null, poison: null, weak: null, slow: null, blessed: null, exposed: 0, spent: 0, brittle: null,
      stats: { dealt: 0, taken: 0, healed: 0, rolls: 0, dice: 0, surges: 0, setbacks: 0, kills: 0, falls: 0, presses: 0 },
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
  const explodes = u => u.surge === 'explode' || TUNE.explode;

  // ---------------- turn order ----------------
  // Initiative is the speed stat, the same every round: the fastest acts first. A hero and a goblin on the same speed:
  // the hero goes first. Heroes on the same speed: the player chooses which of them goes first. Goblins on the same
  // speed: the one with the most HP left goes first (a wounded goblin hangs back), then front rank before back rank,
  // left to right. A turn is two actions by one character.
  const foeOrder = (S, a, b) => b.hp - a.hp || (a.rank === b.rank ? 0 : a.rank === 'front' ? -1 : 1) || a.slot - b.slot;
  // who may act next, given who has already acted this round: { side, ids } (ids are the tied heroes, or one goblin)
  function nextUp(S, acted = S.acted) {
    const w = all(S).filter(u => !u.down && !acted.includes(u.id));
    if (!w.length) return null;
    const top = Math.max(...w.map(u => u.speed)), at = w.filter(u => u.speed === top);
    const heroes = at.filter(u => u.side === 'hero').sort((a, b) => a.slot - b.slot);
    if (heroes.length) return { side: 'hero', ids: heroes.map(u => u.id), speed: top };
    return { side: 'foe', ids: [at.sort((a, b) => foeOrder(S, a, b))[0].id], speed: top };
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
    const n = nextUp(S); S.side = n.side;
    return [{ t: 'round', n: 1 }, { t: 'side', side: n.side, ids: n.ids }];
  }
  function nextSide(S) {
    const ev = [];
    let n = nextUp(S);
    if (!n) { // the round is over: recharges tick, and the order starts again from the fastest
      S.round++; S.acted = [];
      all(S).forEach(u => { for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--; });
      ev.push({ t: 'round', n: S.round });
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
    if (u.exposed) { u.exposed = 0; ev.push(status(u.id, 'exposed', false)); }
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
      Object.assign(u, { down: true, guard: 0, taunt: null, ward: null, hidden: null, coat: null, poison: null, weak: null, slow: null, blessed: null, exposed: 0, spent: 0, brittle: null });
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
    if (A.kind === 'power' && T.used.includes(actId)) return { ok: false, why: 'Used this turn', used: true };
    if (u.cd[actId] > 0) return { ok: false, why: `Ready in ${u.cd[actId]} ${u.cd[actId] > 1 ? 'rounds' : 'round'}`, wait: u.cd[actId] };
    if (['foe', 'all', 'ally', 'other'].includes(A.target) && !targets(S, id, actId).length) return { ok: false, why: A.target === 'ally' && actId === 'heal' ? 'No one is hurt' : 'No one in reach' };
    if (actId === 'chant' && !mostWounded(S, u.side)) return { ok: false, why: 'No one is hurt' };
    return { ok: true };
  }
  // an attack's edge right now: + is advantage, − disadvantage. Every attack after the first this turn is −1 more; a
  // blessing adds, Fireball adds, a Slow's weakest result takes one off the first attack. Capped by TUNE.maxDice.
  function attackEdge(S, u, A) {
    const T = turnOf(S, u);
    let e = -T.attacks;
    if (u.blessed) e += u.blessed.edge || 0;
    if (A && A.edge) e += A.edge;
    e -= T.dieMinus || 0;
    const cap = TUNE.maxDice - TUNE.dice;
    return Math.max(-cap, Math.min(cap, e));
  }
  // the dice an attack would roll right now: how many, and whether the best or the worst one counts
  function attackDice(S, u, A) {
    const e = attackEdge(S, u, A);
    return { n: TUNE.dice + Math.abs(e), keep: e > 0 ? 'high' : e < 0 ? 'low' : null, edge: e };
  }
  const powerDice = A => A.dice || 1;

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
    else { S.turn.used.push(actId); ev.push(...power(S, u, A, targetId)); }
    checkOver(S, ev);
    if (!S.over && S.turn && (u.down || S.turn.left <= 0)) ev.push(...finishTurn(S));
    return ev;
  }

  // roll n dice; with advantage keep the highest, with disadvantage the lowest; then, for someone whose surges explode,
  // every kept 3 rolls one more die (which can explode too)
  function rollPool(S, u, n, keep, boom, track = true) {
    const dice = [];
    for (let i = 0; i < n; i++) dice.push({ ...rollFace(S, u), from: -1 });
    if (keep && n > 1) {
      let k = 0;
      dice.forEach((d, i) => { const a = FACE_VALUE[d.face], b = FACE_VALUE[dice[k].face]; if (keep === 'high' ? a > b : a < b) k = i; });
      dice.forEach((d, i) => { if (i !== k) d.dropped = true; });
    }
    if (!boom) return dice;
    let chain = 0;
    const q = dice.map((d, i) => i).filter(i => dice[i].face === 'surge' && !dice[i].dropped);
    while (q.length && chain < TUNE.maxChain) {
      const p = q.shift(); dice.push({ ...rollFace(S, u), from: p, extra: true }); chain++;
      if (dice[dice.length - 1].face === 'surge') q.push(dice.length - 1);
    }
    if (track) S.maxChain = Math.max(S.maxChain || 0, chain);
    return dice;
  }
  // the damage one face deals on an attack: its number; a rogue's setback deals nothing; Gang Up adds to a surge
  function faceValue(S, u, kind) {
    if (kind === 'neg' && u.setback === 'miss') return { n: 0, miss: true };
    if (kind === 'surge' && u.surge === 'gangUp') return { n: FACE_VALUE.surge + (S ? all(S).filter(x => x.type === u.type && x !== u && !x.down).length : 0), plus: true };
    return { n: FACE_VALUE[kind] };
  }
  // an attack's dice, added up, with what the attacker carries: a blessing, hiding, a weakening
  function tally(S, u, A, dice) {
    let dmg = 0, surges = 0, setbacks = 0;
    dice.forEach(d => {
      if (d.dropped) return;
      dmg += faceValue(S, u, d.face).n;
      if (d.face === 'surge') surges++;
      if (d.face === 'neg') setbacks++;
    });
    if (u.blessed) dmg += u.blessed.dmg || 0;
    if (u.hidden) dmg = Math.ceil(dmg * u.hidden.mult);
    if (u.weak) dmg -= u.weak.n;
    return { dmg: Math.max(0, dmg), surges, setbacks };
  }
  function strike(S, u, A, ids) {
    const ev = [], T = S.turn, D = attackDice(S, u, A);
    const dice = rollPool(S, u, D.n, D.keep, explodes(u));
    const r = tally(S, u, A, dice);
    u.stats.rolls++; u.stats.dice += dice.length; u.stats.surges += r.surges; u.stats.setbacks += r.setbacks;
    ev.push({ t: 'roll', id: u.id, act: A.id, mode: 'sum', groups: [{ target: A.target === 'all' ? null : ids[0], dice }], targets: ids, n: D.n, keep: D.keep, edge: D.edge, total: r.dmg, from: u.hidden ? u.hidden.mult : 0, blessed: !!u.blessed, later: T.attacks > 0 });
    T.attacks++; T.dieMinus = 0;
    // what this attack used up
    const wasHidden = u.hidden;
    if (u.blessed) { u.blessed = null; ev.push(status(u.id, 'blessed', false)); }
    if (u.hidden) { u.hidden.strikes--; if (u.hidden.strikes <= 0) { u.hidden = null; ev.push(status(u.id, 'hidden', false)); } }
    let pressed = false;
    ids.forEach(tid => {
      let t = S.units[tid];
      if (t.down) return;
      // an Interpose: the blow lands on the protector instead
      if (t.ward && !S.units[t.ward.by].down) {
        const by = S.units[t.ward.by];
        ev.push({ t: 'interpose', id: by.id, from: t.id, src: u.id });
        t.ward.uses--; if (t.ward.uses <= 0) { t.ward = null; ev.push(status(t.id, 'ward', false)); }
        t = by;
      }
      const open = t.exposed || 0;
      if (open) { t.exposed = 0; ev.push(status(t.id, 'exposed', false)); }
      const amt = Math.max(0, r.dmg + open - t.guard);
      ev.push(...hurt(S, u, t, amt, r.surges ? 'surge' : 'hit', { raw: r.dmg, guarded: Math.min(r.dmg + open, t.guard), exposed: open, from: wasHidden ? wasHidden.mult : 0 }));
      // a coated blade poisons what it lands on
      if (u.coat && !t.down && amt > 0) { t.poison = { ticks: 2, dmg: u.coat.dmg }; ev.push(status(t.id, 'poison', true, { n: u.coat.dmg })); }
      // press: a blow that lands on a Brittle foe wins the attacker an extra action (once a turn)
      if (t.brittle && r.dmg > 0 && !pressed && T.presses < TUNE.presses) {
        pressed = true; T.presses++; T.left++; u.stats.presses++;
        ev.push({ t: 'press', id: u.id, target: t.id, left: T.left });
        t.brittle.n--; if (t.brittle.n <= 0 || t.down) { t.brittle = null; ev.push(status(t.id, 'brittle', false)); }
      }
    });
    if (u.coat) { u.coat.attacks--; if (u.coat.attacks <= 0) { u.coat = null; ev.push(status(u.id, 'coat', false)); } }
    // the 3s and 1s: the attacker's surge and setback
    const first = S.units[ids[0]];
    for (let k = 0; k < r.surges; k++) ev.push(...surge(S, u, first, A));
    for (let k = 0; k < r.setbacks; k++) ev.push(...setback(S, u, k));
    return ev;
  }
  function surge(S, u, t, A) {
    const K = u.surge, ev = [{ t: 'surge', id: u.id, surge: K, target: t && t.id }];
    if (K === 'shieldUp') { if (!u.down) { u.guard += 1; ev.push(status(u.id, 'guard', true, { n: u.guard })); } }
    else if (K === 'gangUp') { const n = all(S).filter(x => x.type === u.type && x !== u && !x.down).length; ev[0].bonus = n; if (!n) ev[0].fizzle = 'No one to gang up with'; }
    else if (K === 'explode') ev[0].note = 'one more die';
    else if (K === 'arc') {
      const os = A.target === 'all' ? [] : standing(S, 'foe').filter(x => x !== t);
      os.forEach(o => ev.push(...hurt(S, u, o, Math.max(0, 1 - o.guard), 'arc')));
      if (!os.length) ev[0].fizzle = A.target === 'all' ? 'Everyone is already hit' : 'No one else to arc to';
    } else if (K === 'mercy' || K === 'mend') {
      const w = mostWounded(S, u.side);
      if (w) ev.push(...mend(S, u, w, 2)); else ev[0].fizzle = 'No one is hurt';
    }
    return ev;
  }
  function setback(S, u, k) {
    const K = u.setback, ev = [{ t: 'setback', id: u.id, setback: K }];
    if (u.down) return ev;
    if (K === 'offBalance') { u.exposed = (u.exposed || 0) + 1; ev.push(status(u.id, 'exposed', true, { n: u.exposed })); }
    else if (K === 'backlash' || K === 'backfire') ev.push(...hurt(S, null, u, 1, 'backlash'));
    else if (K === 'spent') { u.spent = (u.spent || 0) + 1; ev.push(status(u.id, 'spent', true, { n: u.spent })); }
    else if (K === 'fumble') { if (k === 0 && S.turn && S.turn.left > 0) { S.turn.left--; ev[0].lost = 1; } else ev[0].fizzle = 'No action left to lose'; }
    return ev;
  }

  // a power: roll its dice and read them as its card says
  function power(S, u, A, targetId) {
    const dice = rollPool(S, u, powerDice(A), null, false);
    const total = dice.reduce((s, d) => s + FACE_VALUE[d.face], 0), face = dice[0].face, R = FACE_RANK[face], v = FACE_VALUE[face];
    u.stats.rolls++; u.stats.dice += dice.length;
    const ev = [{ t: 'roll', id: u.id, act: A.id, mode: A.read, groups: [{ target: targetId || null, dice }], total, face }];
    const t = targetId && S.units[targetId];
    const guard = (x, n) => { if (!x || x.down) return; x.guard += n; ev.push(status(x.id, 'guard', true, { n: x.guard })); };
    const healed = (x, amt) => {
      let a = amt;
      if (u.spent) { a = Math.max(0, a - u.spent); ev.push({ t: 'spent', id: u.id, n: u.spent }); u.spent = 0; ev.push(status(u.id, 'spent', false)); }
      return a;
    };
    if (A.read === 'die') ev.push({ t: 'tier', id: u.id, act: A.id, face, text: A.rows[face], target: targetId || null });
    switch (A.id) {
      case 'defend': guard(u, v); break;
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
        ev.push(status(u.id, 'hidden', true, { face }));
        break;
      case 'poison':
        u.coat = [{ attacks: 1, dmg: 1 }, { attacks: 2, dmg: 1 }, { attacks: 2, dmg: 2 }][R];
        ev.push(status(u.id, 'coat', true, { n: u.coat.attacks }));
        break;
      case 'frostbite':
        t.brittle = { n: v, by: u.id };
        ev.push(status(t.id, 'brittle', true, { n: v }));
        break;
      case 'curse':
        t.weak = { n: v };
        ev.push(status(t.id, 'weak', true, { n: v }));
        break;
      case 'slow':
        t.slow = [{ actions: 0, dice: 1 }, { actions: 1, dice: 0 }, { actions: 2, dice: 0 }][R];
        ev.push(status(t.id, 'slow', true, { lost: t.slow.actions }));
        break;
      case 'bless':
        t.blessed = [{ edge: 0, dmg: 1 }, { edge: 1, dmg: 0 }, { edge: 2, dmg: 0 }][R];
        ev.push(status(t.id, 'blessed', true, { face }));
        break;
      case 'heal': {
        ev.push({ t: 'tier', id: u.id, act: A.id, total, text: `Heals ${total}.`, target: targetId });
        ev.push(...mend(S, u, t, healed(t, total)));
        if (t.weak) { t.weak = null; ev.push(status(t.id, 'weak', false)); }
        break;
      }
      case 'prayer': {
        ev.push({ t: 'tier', id: u.id, act: A.id, total, text: `Every hero heals ${total}.` });
        const amt = healed(null, total);
        all(S).filter(x => x.side === u.side).forEach(x => ev.push(...mend(S, u, x, amt)));
        break;
      }
      case 'chant': {
        ev.push({ t: 'tier', id: u.id, act: A.id, total, text: `Heals ${total}.` });
        ev.push(...mend(S, u, mostWounded(S, u.side), total));
        break;
      }
    }
    return ev;
  }

  // ---------------- odds ----------------
  // an attack against one target: average damage and the chance to finish it
  function odds(S, id, actId, targetId, n = 600) {
    const u = S.units[id], A = ACTIONS[actId], t = S.units[targetId];
    if (!u || !A || !t || A.kind !== 'attack') return null;
    const T = { rs: (S.rs ^ 0x5bd1e995) | 0, units: S.units }, D = attackDice(S, u, A);
    let sum = 0, killN = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.max(0, tally(S, u, A, rollPool(T, u, D.n, D.keep, explodes(u), false)).dmg + (t.exposed || 0) - t.guard);
      sum += d; if (d >= t.hp) killN++;
    }
    return { avg: sum / n, kill: killN / n, dice: D.n, keep: D.keep, press: !!t.brittle && turnOf(S, u).presses < TUNE.presses };
  }
  // a one-die power: the chance of each face
  function tierOdds(u) {
    const c = counts(u.faces), N = u.faces.length;
    return Object.fromEntries(FACE_KINDS.map(k => [k, c[k] / N]));
  }
  // what one attack die is worth on average (explosions included; surges' and setbacks' other effects left out)
  function perDie(u, S) {
    const c = counts(u.faces), N = u.faces.length, sum = FACE_KINDS.reduce((s, k) => s + c[k] * faceValue(S, u, k).n, 0);
    if (!explodes(u)) return sum / N;
    return c.surge >= N ? Infinity : sum / (N - c.surge);
  }
  const avgFace = u => u.faces.reduce((s, f) => s + FACE_VALUE[f], 0) / u.faces.length;

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
    const attack = () => { const at = tg('attack'); return at.length ? r({ act: 'attack', target: (at.find(x => x.brittle && T.presses < TUNE.presses) || at.find(x => x.hp <= 2) || weakest(at)).id }) : null; };
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
      const back = tg('knives').find(x => x.rank === 'back');
      plan.push(() => !u.hidden && !T.attacks && can('hide') ? r({ act: 'hide' }) : null);
      plan.push(() => T.attacks ? null : back && !foes.some(f => f.rank === 'front') ? null : attack());
      plan.push(() => !u.hidden && can('hide') ? r({ act: 'hide' }) : null);
      plan.push(() => !u.coat && can('poison') ? r({ act: 'poison' }) : null);
      plan.push(() => back && can('knives') ? r({ act: 'knives', target: back.id }) : null);
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
        const q = r.units[u.id] || (r.units[u.id] = { name: u.name, cls: u.cls, side: u.side, dealt: 0, taken: 0, healed: 0, downs: 0, surges: 0, setbacks: 0, dice: 0, rolls: 0, presses: 0 });
        q.presses += u.stats.presses; q.dealt += u.stats.dealt; q.taken += u.stats.taken; q.healed += u.stats.healed; q.surges += u.stats.surges; q.setbacks += u.stats.setbacks; q.dice += u.stats.dice; q.rolls += u.stats.rolls;
        q.downs += u.stats.falls ? 1 : 0;
      });
    }
    r.winRate = r.wins / n; r.avgRounds = r.rounds / n; r.avgHeroHp = r.heroHp / n; r.avgHeroesUp = r.heroesUp / n; r.flawlessRate = r.flawless / n;
    Object.values(r.units).forEach(q => { q.avgDealt = q.dealt / n; q.avgTaken = q.taken / n; q.avgHealed = q.healed / n; q.downRate = q.downs / n; });
    return r;
  }

  // ---------------- tuning: the sheets' edits, kept between visits ----------------
  // { units: { type: { hp, speed, faces } }, tune: { explode, ... } }
  function applyTuning(t) {
    Object.keys(UNITS).forEach(k => Object.assign(UNITS[k], JSON.parse(JSON.stringify(DEFAULTS[k]))));
    Object.assign(TUNE, TUNE0);
    if (!t) return;
    Object.entries(t.units || {}).forEach(([k, v]) => {
      if (!UNITS[k]) return;
      ['hp', 'speed'].forEach(f => { if (Number.isFinite(v[f])) UNITS[k][f] = v[f]; });
      if (Array.isArray(v.faces) && v.faces.length === SIDES && v.faces.every(f => FACE_KINDS.includes(f))) UNITS[k].faces = v.faces.slice();
    });
    Object.entries(t.tune || {}).forEach(([k, v]) => { if (k in TUNE && typeof v === typeof TUNE0[k]) TUNE[k] = v; });
  }

  return {
    TUNE, TUNE0, SIDES, FACE_KINDS, FACE_NAME, FACE_RANK, FACE_VALUE, SURGES, SETBACKS, ACTIONS, UNITS, DEFAULTS, PARTY, ENCOUNTER,
    newBattle, start, ready, queue, act, endTurn, obey, targets, canUse, turnOf, attackDice, attackEdge, powerDice, standing, reachable, odds, tierOdds, perDie, faceValue, avgFace, counts, explodes,
    mind, simulate, playOut, applyTuning, mostWounded,
  };
})();
if (typeof module !== 'undefined') module.exports = DV;
