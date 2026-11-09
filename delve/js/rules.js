'use strict';
// GOBLIN DELVE · THE RULES
// Everything the dice decide. No graphics code: this file runs in the page and in Node (tools/sim.js).
// A battle is plain JSON. Every order (start, act, endTurn) changes it and returns a list of events for the view to play.
// To try a rule variant, change the tables at the top: TUNE, SURGES, ACTIONS, UNITS, PARTY and ENCOUNTER.
const DV = (() => {

  // ---------------- house rules ----------------
  const TUNE = {
    actions: 2,          // actions in a turn
    dice: 2,             // dice an attack or a power rolls
    laterDice: 1,        // dice an attack rolls when you have already attacked this turn
    graze: 1,            // damage a graze deals on an attack
    explode: true,       // on an attack, a critical rolls one more die, which can explode too
    maxChain: 12,        // most extra dice one roll can explode into
    turns: 'alternate',  // 'alternate': a hero, then a goblin, then a hero... · 'party': the whole party, then every goblin
  };

  // ---------------- the dice ----------------
  // Every roll is a d10, and every die shares four symbols: graze (a glancing, partial success), hit, surge (a hit plus
  // something extra) and critical. How many faces show each symbol depends on the class. No roll ever misses.
  // An attack adds its dice up. A power reads its best die: the better the face, the stronger the effect.
  const SIDES = 10;
  const FACE_KINDS = ['graze', 'hit', 'surge', 'crit'];
  const FACE_NAME = { graze: 'Graze', hit: 'Hit', surge: 'Surge', crit: 'Critical' };
  const FACE_RANK = { graze: 0, hit: 1, surge: 2, crit: 3 };
  function dieOf(n) { // the symbols spread round the die (neighbours on a d10's two rings are 5 apart)
    const bag = FACE_KINDS.flatMap(k => Array(n[k] || 0).fill(k)), out = [], order = [0, 5, 2, 7, 4, 9, 1, 6, 3, 8];
    bag.forEach((k, i) => out[order[i]] = k);
    return out;
  }
  const counts = faces => Object.fromEntries(FACE_KINDS.map(k => [k, faces.filter(f => f === k).length]));

  // ---------------- surges: what a surge on an attack adds, by class ----------------
  const SURGES = {
    heavy: { name: 'Heavy Blow', text: '2 more damage.', bonus: 2 },
    vanish: { name: 'Vanish', text: 'You slip back into hiding (as a Hide that rolled a hit).' },
    arc: { name: 'Arc', text: '1 damage to every other goblin.' },
    mercy: { name: 'Mercy', text: 'The most wounded hero still standing heals 2.' },
    gangUp: { name: 'Gang Up', text: '1 more damage for each other goblin fighter still standing.' },
    mend: { name: 'Mend', text: 'The most wounded goblin still standing heals 2.' },
  };

  // ---------------- actions ----------------
  // kind: attack (its dice add up) | power (its best die sets the effect: tiers says what each face does)
  // cost: actions it takes · target: foe | all (every foe) | ally (a friend; heals reach the fallen) | other (a friend
  // not yourself) | self | none · reach: melee (only the front rank while anyone stands in it) | ranged | unit (the
  // unit's own) · recharge: rounds before it can be used again. A power can be used once a turn; Attack as often as
  // you have actions.
  const ACTIONS = {
    attack: { name: 'Attack', kind: 'attack', cost: 1, target: 'foe', reach: 'unit', text: 'Roll 2 dice against one foe and add them up. A second attack in the same turn rolls 1 die.' },
    knives: { name: 'Throwing Knives', icon: '🎯', kind: 'attack', cost: 1, target: 'foe', reach: 'ranged', text: 'An attack that reaches any goblin, even in the back rank. Counts as an attack.' },
    fireball: { name: 'Fireball', icon: '🔥', kind: 'attack', cost: 2, target: 'all', reach: 'ranged', recharge: 2, text: 'Both actions. Roll 2 dice once; every goblin takes the total. A surge adds 1 more.' },
    defend: {
      name: 'Defend', icon: '🛡️', kind: 'power', cost: 1, target: 'self', text: 'Guard: until your next turn, each attack on you deals that much less damage.',
      tiers: { graze: 'Guard 1.', hit: 'Guard 2.', surge: 'Guard 2, and Guard 1 for the rest of the front rank.', crit: 'Guard 3, and Guard 1 for the rest of the front rank.' },
    },
    taunt: {
      name: 'Taunt', icon: '📯', kind: 'power', cost: 1, target: 'none', text: 'Until your next turn, goblins that can reach you must attack you.',
      tiers: { graze: 'The next goblin fighter to act must attack you.', hit: 'Every goblin fighter must attack you.', surge: 'Every goblin, the shaman too, must attack you.', crit: 'Every goblin must attack you, and you gain Guard 1.' },
    },
    interpose: {
      name: 'Interpose', icon: '🔰', kind: 'power', cost: 1, target: 'other', text: 'Until your next turn, you step in front of another hero: attacks on them hit you.',
      tiers: { graze: 'The next attack on them hits you instead.', hit: 'Every attack on them hits you instead.', surge: 'Every attack on them hits you instead, and you gain Guard 1.', crit: 'Every attack on them hits you instead, and you gain Guard 2.' },
    },
    hide: {
      name: 'Hide', icon: '🌫️', kind: 'power', cost: 1, target: 'self', text: 'While hidden, goblins cannot attack you, and your next strike doubles its roll.',
      tiers: { graze: 'Hidden until your next turn starts; a strike from hiding deals half as much again.', hit: 'Hidden until you strike; that strike doubles its roll.', surge: 'Hidden until you strike; that strike doubles its roll and rolls one more die.', crit: 'Hidden for two strikes, each doubling its roll.' },
    },
    poison: {
      name: 'Poison Blade', icon: '🧪', kind: 'power', cost: 1, target: 'self', text: 'Coat your weapon. A goblin your coated attack lands on is poisoned: it loses HP at the start of each of its next 2 turns.',
      tiers: { graze: 'Your next attack poisons, 1 a turn.', hit: 'Your next 2 attacks poison, 1 a turn.', surge: 'Your next 2 attacks poison, 2 a turn.', crit: 'Your next 3 attacks poison, 2 a turn.' },
    },
    weaken: {
      name: 'Weaken', icon: '🥀', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', text: 'Sap a foe: its attacks deal less damage.',
      tiers: { graze: '−1 damage on its attacks, its next turn.', hit: '−2 damage on its attacks, its next turn.', surge: '−2 damage, and its first attack rolls 1 die fewer.', crit: '−3 damage on its attacks for its next 2 turns.' },
    },
    slow: {
      name: 'Slow', icon: '🐌', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', text: 'Bog a foe down for its next turn.',
      tiers: { graze: 'Its first attack rolls 1 die fewer.', hit: 'It loses 1 action.', surge: 'It loses 1 action, and its attack rolls 1 die fewer.', crit: 'It loses its whole turn.' },
    },
    heal: {
      name: 'Heal', icon: '💖', kind: 'power', cost: 1, target: 'ally', text: 'Mend a hero. A fallen hero gets back up.',
      tiers: { graze: 'Heals 2.', hit: 'Heals 4.', surge: 'Heals 4, and lifts curses.', crit: 'Heals 6, and lifts curses.' },
    },
    bless: {
      name: 'Bless', icon: '🙏', kind: 'power', cost: 1, target: 'ally', text: 'Strengthen a standing hero\'s next attack.',
      tiers: { graze: '+1 damage.', hit: '+1 die.', surge: '+1 die and +1 damage.', crit: '+2 dice.' },
    },
    prayer: {
      name: 'Prayer of Healing', icon: '🕯️', kind: 'power', cost: 2, target: 'none', recharge: 2, text: 'Both actions. Every hero heals, and the fallen get back up.',
      tiers: { graze: 'Every hero heals 1.', hit: 'Every hero heals 2.', surge: 'Every hero heals 3.', crit: 'Every hero heals 4.' },
    },
    chant: {
      name: 'Mending Chant', icon: '🎶', kind: 'power', cost: 1, target: 'none', text: 'Mend the most wounded goblin.',
      tiers: { graze: 'Heals 2.', hit: 'Heals 4.', surge: 'Heals 4, and the next most wounded heals 2.', crit: 'Heals 6, and the next most wounded heals 2.' },
    },
    curse: {
      name: 'Curse', icon: '🪬', kind: 'power', cost: 1, target: 'foe', reach: 'ranged', text: 'Hex a hero: their attacks deal less damage. Heal lifts it.',
      tiers: { graze: '−1 damage on their attacks, their next turn.', hit: '−2 damage, their next turn.', surge: '−2 damage, and their first attack rolls 1 die fewer.', crit: '−3 damage for their next 2 turns.' },
    },
  };
  Object.keys(ACTIONS).forEach(k => ACTIONS[k].id = k);

  // ---------------- who fights ----------------
  // rank: front or back · dice: how many of the d10's faces show each symbol (they add up to 10)
  const UNITS = {
    fighter: { name: 'Brakka', cls: 'Fighter', side: 'hero', rank: 'front', hp: 24, dmg: 3, reach: 'melee', hitIcon: '⚔️', weapon: 'Longsword', surge: 'heavy', dice: { graze: 2, hit: 4, surge: 3, crit: 1 }, actions: ['attack', 'defend', 'taunt', 'interpose'], blurb: 'Shield first, questions later. Holds the line so nobody else has to.' },
    mage: { name: 'Orlen', cls: 'Wizard', side: 'hero', rank: 'back', hp: 14, dmg: 2, reach: 'ranged', hitIcon: '✨', weapon: 'Arcane bolt', surge: 'arc', dice: { graze: 3, hit: 3, surge: 3, crit: 1 }, actions: ['attack', 'fireball', 'weaken', 'slow'], blurb: 'Old, frail and very hard to argue with from range.' },
    cleric: { name: 'Sister Wenna', cls: 'Cleric', side: 'hero', rank: 'front', hp: 20, dmg: 2, reach: 'ranged', hitIcon: '🌟', weapon: 'Holy light', surge: 'mercy', dice: { graze: 2, hit: 4, surge: 3, crit: 1 }, actions: ['attack', 'heal', 'bless', 'prayer'], blurb: 'Mends the living and smites the rest from a safe distance.' },
    rogue: { name: 'Vex', cls: 'Rogue', side: 'hero', rank: 'back', hp: 16, dmg: 2, reach: 'melee', hitIcon: '🗡️', weapon: 'Dagger', surge: 'vanish', dice: { graze: 3, hit: 3, surge: 2, crit: 2 }, actions: ['attack', 'hide', 'poison', 'knives'], blurb: 'Quick, quiet, and always looking for the soft spot.' },
    goblin: { name: 'Goblin', cls: 'Goblin fighter', side: 'foe', rank: 'front', hp: 24, dmg: 2, reach: 'melee', hitIcon: '🪓', weapon: 'Hatchet', surge: 'gangUp', dice: { graze: 3, hit: 4, surge: 2, crit: 1 }, actions: ['attack'], blurb: 'Brave in a crowd. Braver in a bigger one.' },
    shaman: { name: 'Goblin Shaman', cls: 'Goblin shaman', side: 'foe', rank: 'back', hp: 20, dmg: 2, reach: 'ranged', hitIcon: '💀', weapon: 'Hex bolt', surge: 'mend', dice: { graze: 3, hit: 4, surge: 2, crit: 1 }, actions: ['attack', 'chant', 'curse'], blurb: 'Keeps the others standing, and keeps well behind them.' },
  };
  Object.values(UNITS).forEach(T => { T.faces = dieOf(T.dice); delete T.dice; });
  const DEFAULTS = JSON.parse(JSON.stringify(UNITS)), TUNE0 = { ...TUNE };

  const PARTY = ['fighter', 'mage', 'cleric', 'rogue']; // the portraits, top to bottom
  const ENCOUNTER = [ // the goblins, in the order they act each round
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
      hp: T.hp, max: T.hp, dmg: T.dmg, reach: T.reach, hitIcon: T.hitIcon, weapon: T.weapon,
      surge: T.surge, faces: T.faces.slice(), actions: T.actions.slice(), cd: {}, down: false,
      // statuses: guard (number), taunt, ward (protected by an Interpose), hidden, coat (poisoned blade), poison, weak, slow, blessed
      guard: 0, taunt: null, ward: null, hidden: null, coat: null, poison: null, weak: null, slow: null, blessed: null,
      stats: { dealt: 0, taken: 0, healed: 0, rolls: 0, dice: 0, crits: 0, kills: 0, grazes: 0, falls: 0 },
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
  // No initiative. Each round the player chooses which hero acts next until every hero has acted; the goblins act in
  // their fixed order. A turn is two actions by one character. TUNE.turns sets how the sides take turns.
  const waiting = (S, side) => S.order[side].filter(id => !S.units[id].down && !S.acted.includes(id));
  function ready(S) {
    if (S.over || !S.side) return { side: null, ids: [] };
    if (S.turn) return { side: S.units[S.turn.id].side, ids: [S.turn.id], mid: true };
    const w = waiting(S, S.side);
    return { side: S.side, ids: S.side === 'hero' ? w : w.slice(0, 1) };
  }
  function start(S) {
    S.round = 1; S.acted = []; S.side = 'hero'; S.turn = null;
    return [{ t: 'round', n: 1 }, { t: 'side', side: 'hero', ids: waiting(S, 'hero') }];
  }
  function nextSide(S) {
    const ev = [], other = S.side === 'hero' ? 'foe' : 'hero';
    const has = side => waiting(S, side).length > 0;
    let next;
    if (TUNE.turns === 'party') next = has(S.side) ? S.side : S.side === 'hero' && has('foe') ? 'foe' : null;
    else next = has(other) ? other : has(S.side) ? S.side : null;
    if (!next) { // the round is over: recharges tick, and the party starts the next one
      S.round++; S.acted = [];
      all(S).forEach(u => { for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--; });
      ev.push({ t: 'round', n: S.round });
      next = 'hero';
    }
    S.side = next;
    ev.push({ t: 'side', side: next, ids: waiting(S, next) });
    return ev;
  }
  // what a unit's turn would give it if it started now: actions, and dice taken off its first attack
  function turnOf(S, u) {
    if (S.turn && S.turn.id === u.id) return S.turn;
    const lost = u.slow ? u.slow.actions : 0;
    return { id: u.id, left: Math.max(0, TUNE.actions - lost), attacks: 0, used: [], dieMinus: (u.slow ? u.slow.dice : 0) + (u.weak ? u.weak.dice || 0 : 0), fresh: true };
  }
  // the start of a turn: what lasted "until your next turn" ends, poison bites, a slow takes its toll
  function beginTurn(S, u) {
    const ev = [{ t: 'turn', id: u.id, round: S.round }];
    if (u.guard) { u.guard = 0; ev.push(status(u.id, 'guard', false)); }
    if (u.taunt) { u.taunt = null; ev.push(status(u.id, 'taunt', false)); }
    all(S).forEach(x => { if (x.ward && x.ward.by === u.id) { x.ward = null; ev.push(status(x.id, 'ward', false)); } });
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
    if (u.weak) { u.weak.turns--; u.weak.dice = 0; if (u.weak.turns <= 0) { u.weak = null; ev.push(status(u.id, 'weak', false)); } }
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
      Object.assign(u, { down: true, guard: 0, taunt: null, ward: null, hidden: null, coat: null, poison: null, weak: null, slow: null, blessed: null });
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
  // how many dice an attack would roll right now
  function attackDice(S, u) {
    const T = turnOf(S, u);
    let n = T.attacks ? TUNE.laterDice : TUNE.dice;
    if (u.blessed) n += u.blessed.dice || 0;
    if (u.hidden) n += u.hidden.extra || 0;
    n -= T.dieMinus || 0;
    return Math.max(1, n);
  }
  const powerDice = () => TUNE.dice;

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
    if (!S.over && (u.down || S.turn.left <= 0)) ev.push(...finishTurn(S));
    return ev;
  }

  // roll n dice; on an attack crits explode; on a power only the best die counts
  function rollPool(S, u, n, mode, track = true) {
    const dice = [];
    for (let i = 0; i < n; i++) dice.push({ ...rollFace(S, u), from: -1 });
    if (mode === 'best') {
      let b = 0; dice.forEach((d, i) => { if (FACE_RANK[d.face] > FACE_RANK[dice[b].face]) b = i; });
      dice.forEach((d, i) => { if (i !== b) d.dropped = true; });
      return dice;
    }
    let chain = 0;
    const q = dice.map((d, i) => i).filter(i => dice[i].face === 'crit');
    while (TUNE.explode && q.length && chain < TUNE.maxChain) {
      const p = q.shift(); dice.push({ ...rollFace(S, u), from: p, extra: true }); chain++;
      if (dice[dice.length - 1].face === 'crit') q.push(dice.length - 1);
    }
    if (track) S.maxChain = Math.max(S.maxChain || 0, chain);
    return dice;
  }
  // an attack's dice, added up: grazes deal TUNE.graze, every other face the unit's damage, surges add their bonus
  function tally(S, u, A, dice) {
    let dmg = 0, surges = 0, crits = 0, grazes = 0;
    const gang = u.surge === 'gangUp' ? all(S).filter(x => x.type === u.type && x !== u && !x.down).length : 0;
    dice.forEach(d => {
      if (d.face === 'graze') { dmg += TUNE.graze; grazes++; return; }
      dmg += u.dmg;
      if (d.face === 'crit') crits++;
      if (d.face === 'surge') {
        surges++;
        if (A.id === 'fireball') dmg += 1;
        else dmg += ((SURGES[u.surge] || {}).bonus || 0) + gang;
      }
    });
    if (u.blessed) dmg += u.blessed.dmg || 0;
    if (u.hidden) dmg = Math.ceil(dmg * u.hidden.mult);
    if (u.weak) dmg -= u.weak.n;
    return { dmg: Math.max(0, dmg), surges, crits, grazes };
  }
  function strike(S, u, A, ids) {
    const ev = [], T = S.turn, n = attackDice(S, u);
    const dice = rollPool(S, u, n, 'sum');
    const r = tally(S, u, A, dice);
    u.stats.rolls++; u.stats.dice += dice.length; u.stats.crits += r.crits; u.stats.grazes += r.grazes;
    ev.push({ t: 'roll', id: u.id, act: A.id, mode: 'sum', groups: [{ target: A.target === 'all' ? null : ids[0], dice }], targets: ids, n, total: r.dmg, from: u.hidden ? u.hidden.mult : 0, blessed: !!u.blessed, later: T.attacks > 0 });
    T.attacks++; T.dieMinus = 0;
    // what this attack used up
    const wasHidden = u.hidden;
    if (u.blessed) { u.blessed = null; ev.push(status(u.id, 'blessed', false)); }
    if (u.hidden) { u.hidden.strikes--; if (u.hidden.strikes <= 0) { u.hidden = null; ev.push(status(u.id, 'hidden', false)); } }
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
      const amt = Math.max(0, r.dmg - t.guard);
      ev.push(...hurt(S, u, t, amt, r.crits ? 'crit' : r.surges ? 'surge' : 'hit', { raw: r.dmg, guarded: Math.min(r.dmg, t.guard), from: wasHidden ? wasHidden.mult : 0 }));
      // a coated blade poisons what it lands on
      if (u.coat && !t.down && amt > 0) { t.poison = { ticks: 2, dmg: u.coat.dmg }; ev.push(status(t.id, 'poison', true, { n: u.coat.dmg })); }
    });
    if (u.coat) { u.coat.attacks--; if (u.coat.attacks <= 0) { u.coat = null; ev.push(status(u.id, 'coat', false)); } }
    // surges: the class's extra (Fireball's surge is already in its damage)
    if (A.id !== 'fireball') for (let k = 0; k < r.surges; k++) ev.push(...surge(S, u, S.units[ids[0]]));
    return ev;
  }
  function surge(S, u, t) {
    const K = u.surge, ev = [{ t: 'surge', id: u.id, surge: K, target: t && t.id }];
    if (K === 'heavy') ev[0].bonus = SURGES.heavy.bonus;
    else if (K === 'gangUp') { const n = all(S).filter(x => x.type === u.type && x !== u && !x.down).length; ev[0].bonus = n; if (!n) ev[0].fizzle = 'No one to gang up with'; }
    else if (K === 'arc') {
      const os = standing(S, 'foe').filter(x => x !== t);
      os.forEach(o => ev.push(...hurt(S, u, o, Math.max(0, 1 - o.guard), 'arc')));
      if (!os.length) ev[0].fizzle = 'No one else to arc to';
    } else if (K === 'mercy' || K === 'mend') {
      const w = mostWounded(S, u.side);
      if (w) ev.push(...mend(S, u, w, 2)); else ev[0].fizzle = 'No one is hurt';
    } else if (K === 'vanish') {
      if (!u.hidden) { u.hidden = { mult: 2, extra: 0, strikes: 1 }; ev.push(status(u.id, 'hidden', true, { tier: 'hit' })); } else ev[0].fizzle = 'Already hidden';
    }
    return ev;
  }

  // a power: roll its dice, the best one sets the effect
  function power(S, u, A, targetId) {
    const dice = rollPool(S, u, powerDice(), 'best'), best = dice.find(d => !d.dropped), tier = best.face;
    u.stats.rolls++; u.stats.dice += dice.length; if (tier === 'crit') u.stats.crits++; if (tier === 'graze') u.stats.grazes++;
    const ev = [{ t: 'roll', id: u.id, act: A.id, mode: 'best', groups: [{ target: targetId || null, dice }], tier }];
    ev.push({ t: 'tier', id: u.id, act: A.id, tier, text: A.tiers[tier], target: targetId || null });
    const t = targetId && S.units[targetId], R = FACE_RANK[tier];
    const guard = (x, n) => { if (!x || x.down) return; x.guard = Math.max(x.guard, n); ev.push(status(x.id, 'guard', true, { n: x.guard })); };
    switch (A.id) {
      case 'defend':
        guard(u, [1, 2, 2, 3][R]);
        if (R >= 2) standing(S, u.side).filter(x => x !== u && x.rank === 'front').forEach(x => guard(x, 1));
        break;
      case 'taunt':
        u.taunt = { scope: R >= 2 ? 'all' : 'fighters', once: R === 0 };
        ev.push(status(u.id, 'taunt', true, { scope: u.taunt.scope, once: u.taunt.once }));
        if (R === 3) guard(u, 1);
        break;
      case 'interpose':
        t.ward = { by: u.id, uses: R === 0 ? 1 : 99 };
        ev.push(status(t.id, 'ward', true, { by: u.id }));
        if (R >= 2) guard(u, R === 3 ? 2 : 1);
        break;
      case 'hide':
        u.hidden = [{ mult: 1.5, extra: 0, strikes: 1, untilTurn: true }, { mult: 2, extra: 0, strikes: 1 }, { mult: 2, extra: 1, strikes: 1 }, { mult: 2, extra: 0, strikes: 2 }][R];
        ev.push(status(u.id, 'hidden', true, { tier }));
        break;
      case 'poison':
        u.coat = [{ attacks: 1, dmg: 1 }, { attacks: 2, dmg: 1 }, { attacks: 2, dmg: 2 }, { attacks: 3, dmg: 2 }][R];
        ev.push(status(u.id, 'coat', true, { n: u.coat.attacks }));
        break;
      case 'weaken': case 'curse':
        t.weak = [{ n: 1, turns: 1, dice: 0 }, { n: 2, turns: 1, dice: 0 }, { n: 2, turns: 1, dice: 1 }, { n: 3, turns: 2, dice: 0 }][R];
        ev.push(status(t.id, 'weak', true, { n: t.weak.n }));
        break;
      case 'slow':
        t.slow = [{ actions: 0, dice: 1 }, { actions: 1, dice: 0 }, { actions: 1, dice: 1 }, { actions: 2, dice: 0 }][R];
        ev.push(status(t.id, 'slow', true, { lost: t.slow.actions }));
        break;
      case 'heal':
        ev.push(...mend(S, u, t, [2, 4, 4, 6][R]));
        if (R >= 2 && t.weak) { t.weak = null; ev.push(status(t.id, 'weak', false)); }
        break;
      case 'bless':
        t.blessed = [{ dice: 0, dmg: 1 }, { dice: 1, dmg: 0 }, { dice: 1, dmg: 1 }, { dice: 2, dmg: 0 }][R];
        ev.push(status(t.id, 'blessed', true, { tier }));
        break;
      case 'prayer':
        all(S).filter(x => x.side === u.side).forEach(x => ev.push(...mend(S, u, x, [1, 2, 3, 4][R])));
        break;
      case 'chant': {
        const w = mostWounded(S, u.side);
        ev.push(...mend(S, u, w, [2, 4, 4, 6][R]));
        if (R >= 2) { const w2 = mostWounded(S, u.side, w); if (w2) ev.push(...mend(S, u, w2, 2)); }
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
    const T = { rs: (S.rs ^ 0x5bd1e995) | 0, units: S.units }, nd = attackDice(S, u);
    let sum = 0, killN = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.max(0, tally(S, u, A, rollPool(T, u, nd, 'sum', false)).dmg - t.guard);
      sum += d; if (d >= t.hp) killN++;
    }
    return { avg: sum / n, kill: killN / n, dice: nd };
  }
  // a power: the chance its best die lands on each face
  function tierOdds(u, n = powerDice()) {
    const c = counts(u.faces), N = u.faces.length, out = {};
    let below = 0;
    FACE_KINDS.forEach(k => { const upTo = below + c[k]; out[k] = Math.pow(upTo / N, n) - Math.pow(below / N, n); below = upTo; });
    return out;
  }
  // what one attack die is worth on average, explosions included (surge effects other than damage left out)
  function perDie(u, S) {
    const c = counts(u.faces), N = u.faces.length, C = TUNE.explode ? c.crit : 0;
    if (C >= N) return Infinity;
    let sb = (SURGES[u.surge] || {}).bonus || 0;
    if (u.surge === 'gangUp' && S) sb = all(S).filter(x => x.type === u.type && x !== u && !x.down).length;
    return (TUNE.graze * c.graze + u.dmg * (c.hit + c.surge + c.crit) + sb * c.surge) / (N - C);
  }

  // ---------------- minds ----------------
  // the goblins: fighters swing twice (at the weakest, half the time); the shaman mends or curses, then bolts
  function foeMind(S, u) {
    const T = turnOf(S, u), can = a => u.actions.includes(a) && canUse(S, u.id, a).ok;
    const r = act => ({ id: u.id, ...act });
    if (T.left <= 0) return r({ end: true });
    if (can('chant')) { const w = mostWounded(S, u.side); if (w && w.max - w.hp >= 4) return r({ act: 'chant' }); }
    if (can('curse') && T.left > 1) {
      const h = targets(S, u.id, 'curse').map(i => S.units[i]).filter(x => !x.weak).sort((a, b) => b.dmg - a.dmg || b.hp - a.hp)[0];
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
    const attack = () => { const at = tg('attack'); return at.length ? r({ act: 'attack', target: (at.find(x => x.hp <= u.dmg * 2) || weakest(at)).id }) : null; };
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
      plan.push(() => { const f = strongest(tg('slow').filter(x => !x.slow && !S.acted.includes(x.id))); return f && can('slow') ? r({ act: 'slow', target: f.id }) : null; });
      plan.push(() => { const f = strongest(tg('weaken').filter(x => !x.weak)); return f && can('weaken') ? r({ act: 'weaken', target: f.id }) : null; });
    } else if (u.type === 'cleric') {
      const hurtN = heroes.filter(h => h.hp <= h.max * .6).length + all(S).filter(h => h.side === 'hero' && h.down).length;
      plan.push(() => T.left >= 2 && hurtN >= 2 && can('prayer') ? r({ act: 'prayer' }) : null);
      plan.push(() => { if (!can('heal')) return null; const t = tg('heal').filter(x => x.down || x.hp <= x.max * .55 || x.weak).sort((a, b) => (a.down ? -1 : 0) - (b.down ? -1 : 0) || a.hp / a.max - b.hp / b.max)[0]; return t ? r({ act: 'heal', target: t.id }) : null; });
      plan.push(() => { if (!can('bless')) return null; const t = tg('bless').filter(x => !x.blessed && x !== u && !S.acted.includes(x.id)).sort((a, b) => b.dmg - a.dmg)[0]; return t ? r({ act: 'bless', target: t.id }) : null; });
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
        const q = r.units[u.id] || (r.units[u.id] = { name: u.name, cls: u.cls, side: u.side, dealt: 0, taken: 0, healed: 0, downs: 0, crits: 0, dice: 0, rolls: 0, grazes: 0 });
        q.dealt += u.stats.dealt; q.taken += u.stats.taken; q.healed += u.stats.healed; q.crits += u.stats.crits; q.dice += u.stats.dice; q.rolls += u.stats.rolls; q.grazes += u.stats.grazes;
        q.downs += u.stats.falls ? 1 : 0;
      });
    }
    r.winRate = r.wins / n; r.avgRounds = r.rounds / n; r.avgHeroHp = r.heroHp / n; r.avgHeroesUp = r.heroesUp / n; r.flawlessRate = r.flawless / n;
    Object.values(r.units).forEach(q => { q.avgDealt = q.dealt / n; q.avgTaken = q.taken / n; q.avgHealed = q.healed / n; q.downRate = q.downs / n; });
    return r;
  }

  // ---------------- tuning: the sheets' edits, kept between visits ----------------
  // { units: { type: { hp, dmg, faces } }, tune: { explode, turns, ... } }
  function applyTuning(t) {
    Object.keys(UNITS).forEach(k => Object.assign(UNITS[k], JSON.parse(JSON.stringify(DEFAULTS[k]))));
    Object.assign(TUNE, TUNE0);
    if (!t) return;
    Object.entries(t.units || {}).forEach(([k, v]) => {
      if (!UNITS[k]) return;
      ['hp', 'dmg'].forEach(f => { if (Number.isFinite(v[f])) UNITS[k][f] = v[f]; });
      if (Array.isArray(v.faces) && v.faces.length === SIDES && v.faces.every(f => FACE_KINDS.includes(f))) UNITS[k].faces = v.faces.slice();
    });
    Object.entries(t.tune || {}).forEach(([k, v]) => { if (k in TUNE && typeof v === typeof TUNE0[k]) TUNE[k] = v; });
  }

  return {
    TUNE, TUNE0, SIDES, FACE_KINDS, FACE_NAME, FACE_RANK, SURGES, ACTIONS, UNITS, DEFAULTS, PARTY, ENCOUNTER,
    newBattle, start, ready, act, endTurn, obey, targets, canUse, turnOf, attackDice, powerDice, standing, reachable, odds, tierOdds, perDie, counts,
    mind, simulate, playOut, applyTuning, mostWounded,
  };
})();
if (typeof module !== 'undefined') module.exports = DV;
