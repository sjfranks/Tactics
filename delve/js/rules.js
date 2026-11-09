'use strict';
// GOBLIN DELVE · THE RULES
// Everything the dice decide. No graphics code: this file runs in the page and in Node (tools/sim.js).
// A battle is plain JSON. Every order (start, act) changes it and returns a list of events for the view to play.
// To try a rule variant, change the tables at the top: TUNE, SURGES, ACTIONS, UNITS, PARTY and ENCOUNTER.
const DV = (() => {

  // ---------------- house rules ----------------
  const TUNE = {
    explode: true,       // a critical rolls one more die, and that die can explode too
    maxChain: 12,        // most extra dice one roll can explode into
    brace: 1,            // damage Brace takes off each hit
    bleed: 2,            // turns a bleeding foe loses 1 HP at the start of
    turns: 'alternate',  // 'alternate': a hero, then a goblin, then a hero... · 'party': the whole party, then every goblin
  };

  // ---------------- the dice ----------------
  // Every roll is a d10. All dice share four symbols: blank (a miss), hit (deal your damage),
  // surge (a hit, plus your class's surge) and crit (a hit, and roll one more die). How many faces show each
  // symbol depends on the class.
  const SIDES = 10;
  const FACE_KINDS = ['blank', 'hit', 'surge', 'crit'];
  const FACE_NAME = { blank: 'Blank', hit: 'Hit', surge: 'Surge', crit: 'Critical' };
  const FACE_RANK = { blank: 0, hit: 1, surge: 2, crit: 3 };
  // a die from face counts, the symbols spread round it
  function dieOf(n) {
    const bag = FACE_KINDS.flatMap(k => Array(n[k] || 0).fill(k)), out = [];
    const order = [0, 5, 2, 7, 4, 9, 1, 6, 3, 8]; // neighbours on a d10's two rings are 5 apart
    bag.forEach((k, i) => out[order[i]] = k);
    return out;
  }
  const counts = faces => Object.fromEntries(FACE_KINDS.map(k => [k, faces.filter(f => f === k).length]));

  // ---------------- surges: what the surge face does for each class ----------------
  // bonus: extra damage the surge adds to its hit
  const SURGES = {
    heavy: { name: 'Heavy Blow', text: 'A hit for 2 more damage.', bonus: 2 },
    bleed: { name: 'Bleed', text: 'A hit, and the target loses 1 HP at the start of each of its next 2 turns.' },
    arc: { name: 'Arc', text: 'A hit, and 1 damage to every other foe.' },
    mercy: { name: 'Mercy', text: 'A hit, and the most wounded hero still standing heals 2.' },
    gangUp: { name: 'Gang Up', text: 'A hit, and +1 damage for each other goblin fighter still standing.' },
    mend: { name: 'Mend', text: 'A hit, and the most wounded goblin still standing heals 2.' },
  };

  // ---------------- actions ----------------
  // target: foe (one foe) | all (every foe in reach) | ally (a hurt or fallen friend) | none
  // reach: melee (only the front rank while anyone stands in it) | ranged (anyone) | unit (the unit's own reach)
  // dice: dice rolled against each target · keep 'best': only the best of them counts · mult: damage multiplier
  // auto: deals damage without a roll · cd: rounds before it can be used again
  const ACTIONS = {
    attack: { name: 'Attack', target: 'foe', reach: 'unit', dice: 1, text: 'Roll your die against one foe.' },
    brace: { name: 'Brace', icon: '🛡️', target: 'none', text: 'Until your next turn, every hit on you deals 1 less damage.' },
    mightyBlow: { name: 'Mighty Blow', icon: '💪', target: 'foe', reach: 'melee', dice: 2, cd: 3, text: 'Roll 2 dice against one foe. Every hit counts.' },
    taunt: { name: 'Taunt', icon: '📯', target: 'none', cd: 3, text: 'Until your next turn, goblin fighters must attack you, and you Brace.' },
    fireball: { name: 'Fireball', icon: '🔥', target: 'all', reach: 'ranged', dice: 1, cd: 3, text: 'Roll a die against every foe.' },
    missile: { name: 'Magic Missile', icon: '☄️', target: 'foe', reach: 'ranged', auto: true, cd: 2, text: 'Deal your damage to any foe. No roll: it never misses.' },
    heal: { name: 'Heal', icon: '💖', target: 'ally', amount: 4, cd: 2, text: 'A hero heals 4, or gets back up with 4 HP.' },
    prayer: { name: 'Prayer', icon: '🙏', target: 'none', cd: 3, text: 'Every hero standing is Blessed: their next roll adds a die.' },
    backstab: { name: 'Backstab', icon: '🔪', target: 'foe', reach: 'melee', dice: 2, keep: 'best', mult: 2, cd: 3, text: 'Roll 2 dice and keep the better one. Its hits deal double damage.' },
    knives: { name: 'Throwing Knives', icon: '🎯', target: 'foe', reach: 'ranged', dice: 1, cd: 2, text: 'Roll your die against any foe, even in the back rank.' },
    chant: { name: 'Mending Chant', icon: '🎶', target: 'none', amount: 3, cd: 3, text: 'The most wounded goblin heals 3.' },
  };
  Object.keys(ACTIONS).forEach(k => ACTIONS[k].id = k);

  // ---------------- who fights ----------------
  // rank: front or back. Melee attacks reach only the front rank while anyone stands in it.
  // dice: how many of the d10's faces show each symbol (they add up to 10)
  const UNITS = {
    fighter: { name: 'Brakka', cls: 'Fighter', side: 'hero', rank: 'front', hp: 14, dmg: 3, reach: 'melee', hitIcon: '⚔️', weapon: 'Longsword', surge: 'heavy', dice: { blank: 2, hit: 4, surge: 3, crit: 1 }, actions: ['attack', 'mightyBlow', 'taunt', 'brace'], blurb: 'Shield first, questions later. Holds the front so nobody else has to.' },
    mage: { name: 'Orlen', cls: 'Mage', side: 'hero', rank: 'back', hp: 8, dmg: 2, reach: 'ranged', hitIcon: '✨', weapon: 'Arcane bolt', surge: 'arc', dice: { blank: 3, hit: 3, surge: 3, crit: 1 }, actions: ['attack', 'fireball', 'missile', 'brace'], blurb: 'Old, frail and very hard to argue with from range.' },
    cleric: { name: 'Sister Wenna', cls: 'Cleric', side: 'hero', rank: 'front', hp: 12, dmg: 2, reach: 'melee', hitIcon: '🔨', weapon: 'Warhammer', surge: 'mercy', dice: { blank: 2, hit: 4, surge: 3, crit: 1 }, actions: ['attack', 'heal', 'prayer', 'brace'], blurb: 'Mends the living and flattens the rest.' },
    rogue: { name: 'Vex', cls: 'Rogue', side: 'hero', rank: 'back', hp: 10, dmg: 2, reach: 'melee', hitIcon: '🗡️', weapon: 'Dagger', surge: 'bleed', dice: { blank: 3, hit: 3, surge: 2, crit: 2 }, actions: ['attack', 'backstab', 'knives', 'brace'], blurb: 'Quick, quiet, and always looking for the soft spot.' },
    goblin: { name: 'Goblin', cls: 'Goblin fighter', side: 'foe', rank: 'front', hp: 12, dmg: 3, reach: 'melee', hitIcon: '🪓', weapon: 'Hatchet', surge: 'gangUp', dice: { blank: 3, hit: 4, surge: 2, crit: 1 }, actions: ['attack'], blurb: 'Brave in a crowd. Braver in a bigger one.' },
    shaman: { name: 'Goblin Shaman', cls: 'Goblin shaman', side: 'foe', rank: 'back', hp: 12, dmg: 3, reach: 'ranged', hitIcon: '💀', weapon: 'Hex bolt', surge: 'mend', dice: { blank: 3, hit: 4, surge: 2, crit: 1 }, actions: ['attack', 'chant'], blurb: 'Keeps the others standing, and keeps well behind them.' },
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
      surge: T.surge, faces: T.faces.slice(), actions: T.actions.slice(),
      cd: {}, brace: false, taunt: false, blessed: false, bleed: 0, down: false,
      stats: { dealt: 0, taken: 0, healed: 0, rolls: 0, dice: 0, crits: 0, kills: 0, misses: 0, falls: 0 },
    };
  }
  function newBattle(opts = {}) {
    const S = { rs: (opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296)) | 0, seed: opts.seed, round: 0, side: null, acted: [], order: { hero: PARTY.slice(), foe: ENCOUNTER.map(e => e.id) }, units: {}, over: null, maxChain: 0 };
    PARTY.forEach((t, i) => S.units[t] = makeUnit(t, t, null, i));
    ENCOUNTER.forEach(e => S.units[e.id] = makeUnit(e.id, e.type, e.name, e.slot));
    return S;
  }
  const all = S => Object.values(S.units);
  const standing = (S, side) => all(S).filter(u => u.side === side && !u.down);
  const enemySide = u => u.side === 'hero' ? 'foe' : 'hero';

  // ---------------- turn order ----------------
  // No initiative. Each round the player chooses which hero acts next until every hero has acted; the goblins act in
  // their fixed order. TUNE.turns sets how the sides take turns: alternating, or the whole party first.
  const waiting = (S, side) => S.order[side].filter(id => !S.units[id].down && !S.acted.includes(id));
  // who may act now: any hero still waiting, or the next goblin
  function ready(S) {
    if (S.over || !S.side) return { side: null, ids: [] };
    const w = waiting(S, S.side);
    return { side: S.side, ids: S.side === 'hero' ? w : w.slice(0, 1) };
  }
  function start(S) {
    S.round = 1; S.acted = []; S.side = 'hero';
    return [{ t: 'round', n: 1 }, { t: 'side', side: 'hero', ids: waiting(S, 'hero') }];
  }
  function nextSide(S) {
    const ev = [], other = S.side === 'hero' ? 'foe' : 'hero';
    const has = side => waiting(S, side).length > 0;
    let next = null;
    if (TUNE.turns === 'party') next = has(S.side) ? S.side : S.side === 'hero' && has('foe') ? 'foe' : null;
    else next = has(other) ? other : has(S.side) ? S.side : null;
    if (!next) { // the round is over: cooldowns tick, and the party starts the next one
      S.round++; S.acted = [];
      all(S).forEach(u => { for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--; });
      ev.push({ t: 'round', n: S.round });
      next = 'hero';
    }
    S.side = next;
    ev.push({ t: 'side', side: next, ids: waiting(S, next) });
    return ev;
  }
  // the start of a unit's turn: what lasted "until your next turn" ends, and bleeding bites
  function activate(S, u) {
    const ev = [{ t: 'turn', id: u.id, round: S.round }];
    if (u.brace) { u.brace = false; ev.push({ t: 'status', id: u.id, key: 'brace', on: false }); }
    if (u.taunt) { u.taunt = false; ev.push({ t: 'status', id: u.id, key: 'taunt', on: false }); }
    if (u.bleed > 0) {
      u.bleed--;
      ev.push({ t: 'tick', id: u.id, key: 'bleed', left: u.bleed }, ...hurt(S, null, u, 1, 'bleed'));
      if (!u.bleed && !u.down) ev.push({ t: 'status', id: u.id, key: 'bleed', on: false });
    }
    return ev;
  }
  function checkOver(S, ev) {
    if (S.over) return;
    const winner = !standing(S, 'hero').length ? 'foe' : !standing(S, 'foe').length ? 'hero' : null;
    if (winner) { S.over = winner; ev.push({ t: 'over', winner, round: S.round }); }
  }

  // ---------------- harm and help ----------------
  // hits: how many hits the damage is made of (Brace takes TUNE.brace off each)
  function hurt(S, src, u, amt, kind, hits = 1) {
    if (u.down) return [];
    let a = amt;
    if (u.brace && kind !== 'bleed') a = Math.max(0, a - TUNE.brace * hits);
    const dealt = Math.min(u.hp, a);
    u.hp -= dealt;
    if (src) src.stats.dealt += dealt;
    u.stats.taken += dealt;
    const ev = [{ t: 'dmg', id: u.id, src: src && src.id, amount: a, raw: amt, hp: u.hp, kind, hits, braced: a < amt }];
    if (u.hp <= 0) {
      u.down = true; u.bleed = 0; u.brace = u.taunt = u.blessed = false; u.stats.falls++;
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
      if (reach === 'melee') { const tn = r.filter(x => x.taunt); if (tn.length) r = tn; } // a Taunt draws every melee blow
      return r.map(x => x.id);
    }
    if (A.target === 'ally') return all(S).filter(x => x.side === u.side && (x.down ? x.side === 'hero' : x.hp < x.max)).map(x => x.id);
    return [];
  }
  function canUse(S, id, actId) {
    const u = S.units[id], A = ACTIONS[actId];
    if (!u || !A || u.down) return { ok: false, why: 'Down' };
    if (u.cd[actId] > 0) return { ok: false, why: `Ready in ${u.cd[actId]} ${u.cd[actId] > 1 ? 'rounds' : 'round'}`, wait: u.cd[actId] };
    if (A.target === 'ally' && !targets(S, id, actId).length) return { ok: false, why: 'No one is hurt' };
    if ((A.target === 'foe' || A.target === 'all') && !targets(S, id, actId).length) return { ok: false, why: 'No one in reach' };
    if (actId === 'chant' && !mostWounded(S, u.side)) return { ok: false, why: 'No one is hurt' };
    return { ok: true };
  }

  // ---------------- orders ----------------
  // id acts: its turn starts, then it uses actId (on targetId)
  function act(S, id, actId, targetId) {
    const u = S.units[id], A = ACTIONS[actId];
    if (!ready(S).ids.includes(id)) throw new Error(`It is not ${id}'s turn`);
    if (!u.actions.includes(actId)) throw new Error(`${u.name} cannot ${actId}`);
    const ok = canUse(S, u.id, actId); if (!ok.ok) throw new Error(`${u.name} cannot ${actId}: ${ok.why}`);
    if ((A.target === 'foe' || A.target === 'ally') && !targets(S, u.id, actId).includes(targetId)) throw new Error(`${u.name} cannot ${actId} ${targetId}`);
    const ev = activate(S, u);
    if (!u.down) {
      ev.push({ t: 'act', id: u.id, act: actId, target: targetId || null });
      if (A.cd) u.cd[actId] = A.cd;
      const tg = targets(S, u.id, actId);
      if (A.target === 'foe' && A.auto) ev.push(...hurt(S, u, S.units[targetId], u.dmg * (A.mult || 1), 'hit'));
      else if (A.target === 'foe') ev.push(...strike(S, u, [targetId], A));
      else if (A.target === 'all') ev.push(...strike(S, u, tg, A));
      else if (A.target === 'ally') ev.push(...mend(S, u, S.units[targetId], A.amount));
      else if (actId === 'brace') { u.brace = true; ev.push({ t: 'status', id: u.id, key: 'brace', on: true }); }
      else if (actId === 'taunt') { u.taunt = u.brace = true; ev.push({ t: 'status', id: u.id, key: 'taunt', on: true }, { t: 'status', id: u.id, key: 'brace', on: true }); }
      else if (actId === 'prayer') standing(S, u.side).forEach(h => { h.blessed = true; ev.push({ t: 'status', id: h.id, key: 'blessed', on: true }); });
      else if (actId === 'chant') ev.push(...mend(S, u, mostWounded(S, u.side), A.amount));
    }
    S.acted.push(u.id);
    ev.push({ t: 'done', id: u.id });
    checkOver(S, ev);
    if (!S.over) ev.push(...nextSide(S));
    return ev;
  }

  // Roll the dice for every target first (they hit the table together, then crits throw their extra dice), then resolve.
  function rollPool(S, u, A, n, track = true) {
    const dice = [];
    for (let i = 0; i < n; i++) dice.push({ ...rollFace(S, u), from: -1 });
    if (A.keep === 'best' && dice.length > 1) {
      let b = 0; dice.forEach((d, i) => { if (FACE_RANK[d.face] > FACE_RANK[dice[b].face]) b = i; });
      dice.forEach((d, i) => { if (i !== b) d.dropped = true; });
    }
    let chain = 0;
    const q = dice.map((d, i) => i).filter(i => dice[i].face === 'crit' && !dice[i].dropped);
    while (TUNE.explode && q.length && chain < TUNE.maxChain) {
      const p = q.shift(); dice.push({ ...rollFace(S, u), from: p, extra: true }); chain++;
      if (dice[dice.length - 1].face === 'crit') q.push(dice.length - 1);
    }
    if (track) S.maxChain = Math.max(S.maxChain || 0, chain);
    return dice;
  }
  // what a set of dice does to one target: the damage of its hits, and the surges it triggers
  function tally(S, u, A, dice) {
    let hits = 0, surges = 0, crits = 0;
    dice.forEach(d => {
      if (d.dropped || d.face === 'blank') return;
      hits++;
      if (d.face === 'surge') surges++;
      if (d.face === 'crit') crits++;
    });
    const G = SURGES[u.surge] || {};
    let bonus = surges * (G.bonus || 0);
    if (u.surge === 'gangUp') bonus += surges * all(S).filter(x => x.type === u.type && x !== u && !x.down).length;
    return { hits, surges, crits, damage: (hits * u.dmg + bonus) * (A.mult || 1) };
  }
  function strike(S, u, ids, A) {
    const ev = [], extra = u.blessed ? 1 : 0;
    if (u.blessed) { u.blessed = false; ev.push({ t: 'status', id: u.id, key: 'blessed', on: false }); }
    const groups = ids.map(id => ({ target: id, dice: rollPool(S, u, A, (A.dice || 1) + extra) }));
    u.stats.rolls++;
    groups.forEach(g => g.dice.forEach(d => { u.stats.dice++; if (d.face === 'crit' && !d.dropped) u.stats.crits++; }));
    ev.push({ t: 'roll', id: u.id, act: A.id, groups, blessed: !!extra });
    groups.forEach(g => {
      const t = S.units[g.target], r = tally(S, u, A, g.dice);
      g.hits = r.hits;
      if (!r.hits) { u.stats.misses++; ev.push({ t: 'miss', id: t.id, src: u.id }); return; }
      ev.push(...hurt(S, u, t, r.damage, r.crits ? 'crit' : 'hit', r.hits));
      for (let k = 0; k < r.surges; k++) ev.push(...surge(S, u, t, A));
    });
    return ev;
  }
  function surge(S, u, t) {
    const K = u.surge, ev = [{ t: 'surge', id: u.id, surge: K, target: t.id }];
    if (K === 'heavy') ev[0].bonus = SURGES.heavy.bonus;
    else if (K === 'arc') {
      const os = standing(S, t.side).filter(x => x !== t);
      os.forEach(o => ev.push(...hurt(S, u, o, 1, 'arc')));
      if (!os.length) ev[0].fizzle = 'No one else to arc to';
    } else if (K === 'mercy' || K === 'mend') {
      const w = mostWounded(S, u.side);
      if (w) ev.push(...mend(S, u, w, 2)); else ev[0].fizzle = 'No one is hurt';
    } else if (K === 'bleed') {
      if (!t.down) { t.bleed = TUNE.bleed; ev.push({ t: 'status', id: t.id, key: 'bleed', on: true, n: t.bleed }); } else ev[0].fizzle = 'Already down';
    } else if (K === 'gangUp') {
      const n = all(S).filter(x => x.type === u.type && x !== u && !x.down).length;
      ev[0].bonus = n; if (!n) ev[0].fizzle = 'No one to gang up with';
    }
    return ev;
  }

  // ---------------- odds: what an action is likely to do to one target ----------------
  function odds(S, id, actId, targetId, n = 600) {
    const u = S.units[id], A = ACTIONS[actId], t = S.units[targetId];
    if (!u || !A || !t) return null;
    if (A.auto) { const d = t.brace ? Math.max(0, u.dmg - TUNE.brace) : u.dmg; return { avg: d, hit: d > 0 ? 1 : 0, kill: d >= t.hp ? 1 : 0, auto: true }; }
    const T = { rs: (S.rs ^ 0x5bd1e995) | 0, units: S.units };
    let sum = 0, hitN = 0, killN = 0;
    for (let i = 0; i < n; i++) {
      const dice = rollPool(T, u, A, (A.dice || 1) + (u.blessed ? 1 : 0), false), r = tally(S, u, A, dice);
      let d = r.damage; if (t.brace && r.hits) d = Math.max(0, d - TUNE.brace * r.hits);
      sum += d; if (d > 0) hitN++; if (d >= t.hp) killN++;
    }
    return { avg: sum / n, hit: hitN / n, kill: killN / n };
  }
  // what one roll of a unit's die is worth on average, explosions included (surge effects other than damage left out)
  function perDie(u, S) {
    const c = counts(u.faces), n = u.faces.length, C = TUNE.explode ? c.crit : 0;
    if (C >= n) return Infinity;
    const G = SURGES[u.surge] || {};
    let sb = G.bonus || 0;
    if (u.surge === 'gangUp' && S) sb = all(S).filter(x => x.type === u.type && x !== u && !x.down).length;
    return (u.dmg * (c.hit + c.surge + c.crit) + sb * c.surge) / (n - C);
  }

  // ---------------- minds ----------------
  // the goblins: the shaman chants when someone is badly hurt; everyone else swings at the weakest half the time
  function foeMind(S, u) {
    if (u.actions.includes('chant') && canUse(S, u.id, 'chant').ok) { const w = mostWounded(S, u.side); if (w && w.max - w.hp >= 3) return { id: u.id, act: 'chant' }; }
    const t = targets(S, u.id, 'attack').map(i => S.units[i]);
    const tg = rnd(S) < .5 ? t.slice().sort((a, b) => a.hp - b.hp)[0] : pick(S, t);
    return { id: u.id, act: 'attack', target: tg.id };
  }
  // a plain bot for the party, used by Auto and the simulator: heal the fallen, open with area spells, finish what is close
  function heroMind(S, u) {
    const can = a => u.actions.includes(a) && canUse(S, u.id, a).ok;
    const tg = a => targets(S, u.id, a).map(i => S.units[i]);
    const weakest = arr => arr.slice().sort((a, b) => a.hp - b.hp || a.slot - b.slot)[0];
    const foes = standing(S, 'foe'), heroes = standing(S, 'hero');
    const r = act => ({ id: u.id, ...act });
    if (can('heal')) {
      const down = tg('heal').filter(x => x.down)[0];
      if (down) return r({ act: 'heal', target: down.id });
      const low = tg('heal').filter(x => x.hp <= x.max * .5).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      if (low) return r({ act: 'heal', target: low.id });
    }
    if (can('prayer') && foes.length >= 3 && heroes.length >= 3 && waiting(S, 'hero').length >= 3) return r({ act: 'prayer' });
    if (can('fireball') && foes.length >= 3) return r({ act: 'fireball' });
    if (can('missile')) { const k = tg('missile').find(x => x.hp <= u.dmg) || tg('missile').find(x => x.rank === 'back'); if (k) return r({ act: 'missile', target: k.id }); }
    if (can('taunt') && u.hp >= u.max * .6 && heroes.some(h => h !== u && h.rank === 'front' && h.hp <= h.max * .5)) return r({ act: 'taunt' });
    if (can('knives')) { const b = tg('knives').find(x => x.rank === 'back'); if (b) return r({ act: 'knives', target: b.id }); }
    if (can('mightyBlow')) return r({ act: 'mightyBlow', target: weakest(tg('mightyBlow')).id });
    if (can('backstab')) return r({ act: 'backstab', target: weakest(tg('backstab')).id });
    if (can('attack')) { const at = tg('attack'); return r({ act: 'attack', target: (at.find(x => x.hp <= u.dmg) || weakest(at)).id }); }
    return r({ act: 'brace' });
  }
  // which hero the bot sends next: the cleric when someone needs her, the mage when a fireball is ready, else top to bottom
  function heroPick(S) {
    const us = ready(S).ids.map(i => S.units[i]);
    const c = us.find(u => u.actions.includes('heal'));
    if (c && canUse(S, c.id, 'heal').ok && targets(S, c.id, 'heal').some(i => S.units[i].down || S.units[i].hp <= S.units[i].max * .5)) return c;
    const m = us.find(u => u.actions.includes('fireball'));
    if (m && canUse(S, m.id, 'fireball').ok && standing(S, 'foe').length >= 3) return m;
    return us[0];
  }
  function mind(S) {
    const r = ready(S);
    if (r.side === 'foe') return foeMind(S, S.units[r.ids[0]]);
    return heroMind(S, heroPick(S));
  }

  // ---------------- the simulator ----------------
  function playOut(S) {
    start(S);
    for (let i = 0; i < 1000 && !S.over; i++) { const c = mind(S); act(S, c.id, c.act, c.target); }
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
        const q = r.units[u.id] || (r.units[u.id] = { name: u.name, cls: u.cls, side: u.side, dealt: 0, taken: 0, healed: 0, downs: 0, crits: 0, dice: 0, rolls: 0, misses: 0 });
        q.dealt += u.stats.dealt; q.taken += u.stats.taken; q.healed += u.stats.healed; q.crits += u.stats.crits; q.dice += u.stats.dice; q.rolls += u.stats.rolls; q.misses += u.stats.misses;
        q.downs += u.stats.falls ? 1 : 0;
      });
    }
    r.winRate = r.wins / n; r.avgRounds = r.rounds / n; r.avgHeroHp = r.heroHp / n; r.avgHeroesUp = r.heroesUp / n; r.flawlessRate = r.flawless / n;
    Object.values(r.units).forEach(q => { q.avgDealt = q.dealt / n; q.avgTaken = q.taken / n; q.avgHealed = q.healed / n; q.downRate = q.downs / n; q.missRate = q.rolls ? q.misses / q.rolls : 0; });
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
    newBattle, start, ready, act, targets, canUse, standing, reachable, odds, perDie, counts, mind, simulate, playOut, applyTuning, mostWounded,
  };
})();
if (typeof module !== 'undefined') module.exports = DV;
