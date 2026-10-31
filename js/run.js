// =====================================================================================================================
// GOBLIN CRYPT · THE RUN
// A game is a run: three acts, each a branching map of rooms climbed floor by floor to a boss. This file is the run's
// rules: the acts and their packs of goblins, the map, rewards, campsites, shops, events and chests. Like rules.js it
// knows nothing of the screen and runs in Node too. A run is plain JSON; the functions below change it in place.
// To retune a run, edit ACTS, PRICES, GOLD and EVENTS. See docs/RUN.md for the curve these are tuned to.
// =====================================================================================================================
const RUN = (() => {
'use strict';
const RULES = typeof window === 'undefined' ? require('./rules.js') : GC; // the battle rules (in a page, rules.js loads first)
const { UNITS, CARDS, RELICS, LEVELS } = RULES;
const lv = id => LEVELS.findIndex(L => L.id === id);

// ---------------- the acts ----------------
// packs: goblin kinds, a '*' marks the champion that leads an elite pack. weak: an act's first two fights; strong: the
// rest; elites: elite rooms; boss: [map, pack] (an empty pack uses the map's own foes). maps: where its fights are held
const ACTS = [
  { name: 'The Marches', text: 'The open hills below the crypt, where the goblins keep their outer camps.', maps: ['gorge', 'ridge', 'birch', 'ford', 'fort'],
    weak: [['cutter', 'cutter'], ['cutter', 'archer'], ['cutter', 'cutter', 'cutter']],
    strong: [['cutter', 'cutter', 'archer'], ['cutter', 'archer', 'archer'], ['warg', 'cutter'], ['shaman', 'cutter', 'cutter'], ['brute', 'cutter']],
    elites: [['brute*', 'cutter', 'cutter', 'archer'], ['warg*', 'warg', 'cutter'], ['archer*', 'archer', 'cutter', 'cutter'], ['shaman*', 'brute', 'cutter']],
    boss: ['den', ['matriarch', 'warg', 'warg']] },
  { name: 'The Crypt', text: 'The tombs under the hill, the warg pens, and the reeve\'s house the goblins took.', maps: ['pens', 'house', 'ossuary', 'tombs'],
    weak: [['cutter', 'cutter', 'archer'], ['warg', 'warg'], ['brute', 'archer']],
    strong: [['shaman', 'cutter', 'cutter', 'archer'], ['warg', 'warg', 'cutter'], ['brute', 'brute'], ['archer', 'archer', 'cutter', 'cutter'], ['shaman', 'warg', 'cutter']],
    elites: [['brute*', 'shaman', 'cutter'], ['warg*', 'warg', 'warg'], ['shaman*', 'archer', 'archer', 'cutter'], ['cutter*', 'cutter*']],
    boss: ['barrow', ['witch', 'cutter', 'cutter', 'archer']] },
  { name: 'The Deep Forge', text: 'Down where the goblins forge their blades over molten rock, and the king keeps his hall.', maps: ['forge', 'slag', 'gate', 'chains'],
    weak: [['cutter', 'cutter', 'archer', 'archer'], ['brute', 'warg'], ['shaman', 'brute', 'cutter']],
    strong: [['brute', 'brute', 'archer'], ['warg', 'warg', 'shaman', 'cutter'], ['archer', 'archer', 'archer', 'cutter'], ['brute', 'shaman', 'cutter', 'cutter']],
    elites: [['brute*', 'brute', 'shaman'], ['warg*', 'warg', 'warg', 'archer'], ['archer*', 'archer', 'shaman', 'cutter']],
    boss: ['throne', ['king', 'shaman', 'archer', 'cutter', 'cutter', 'warg']] }
];
const FLOORS = 12;                  // floors an act, before the boss
const COLS = 7;                     // the map's width in rooms
const ROOM_WEIGHTS = { M: .45, '?': .22, E: .13, R: .12, $: .08 }; // the floors between the fixed ones
const GOLD = { M: [12, 18], E: [28, 36], B: [85, 100], T: [20, 30], start: 80, act: [1, 1.2, 1.4] };
const PRICES = { learn: [65, 85], train: 75, weapon: [105, 130], armour: [95, 120], draught: [45, 55], relic: { common: [140, 160], uncommon: [180, 210], rare: [240, 270], shop: [160, 185] } };
const HEAL = { rest: .3, downed: .15 }; // a rest heals this share of max HP; a hero down at a victory gets up with this share
const LIMITS = { armour: 3, die: 12, potions: 2, cards: 10 };

// ---------------- a seeded generator kept in the run ----------------
function rand(run) { run.rng = (Math.imul(run.rng, 1664525) + 1013904223) >>> 0; return run.rng / 4294967296; }
const between = (run, [a, b]) => a + Math.floor(rand(run) * (b - a + 1));
const pick = (run, list) => list[Math.floor(rand(run) * list.length)];
function shuffle(run, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(run) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const has = (run, id) => run.relics.includes(id);
const relicSum = (run, k) => run.relics.reduce((s, id) => s + (RELICS[id][k] || 0), 0);
const HEROES = ['fighter', 'cleric', 'mage', 'thief'];

// ---------------- a new run ----------------
function newRun(seed = (Math.random() * 4294967296) >>> 0, opts = {}) {
  const party = {};
  for (const k of HEROES) { const d = UNITS[k]; party[k] = { hp: d.hp, maxHp: d.hp, die: d.die, armour: d.armour || 0, move: d.move, initBonus: d.init || 0, cards: d.cards.slice(), mods: {}, potions: 0 }; }
  const run = { v: 1, seed: seed >>> 0, rng: seed >>> 0, diff: opts.diff || 'normal', act: 0, node: null, map: null, gold: GOLD.start, relics: [], party,
    phase: 'map', room: null, battle: null, fights: 0, seen: [], visited: [], stats: { floors: 0, fights: 0, elites: 0, bosses: 0, gold: 0, kills: 0 } };
  gainRelic(run, 'bandages');
  run.map = genMap(run);
  return run;
}

// ---------------- the map ----------------
// six paths climb from the bottom row to the top, each step to the room above or one either side, never crossing
// another; the rooms they pass are the map. Floor 1 is a fight, floor 6 a chest, floor 12 a campsite; no elites or
// campsites below floor 5, and no campsite, elite or shop straight after another
function genMap(run) {
  const nodes = {}, id = (x, y) => y + ':' + x, edges = new Set();
  const crosses = (y, a, b) => { for (const e of edges) { const [ey, ea, eb] = e.split(',').map(Number); if (ey === y && ((ea < a && eb > b) || (ea > a && eb < b))) return true; } return false; };
  for (let p = 0; p < 6; p++) {
    let x = p < 2 ? (p === 0 ? Math.floor(rand(run) * 3) : 4 + Math.floor(rand(run) * 3)) : Math.floor(rand(run) * COLS);
    for (let y = 0; y < FLOORS; y++) {
      const n = nodes[id(x, y)] || (nodes[id(x, y)] = { id: id(x, y), x, y, type: null, next: [] });
      if (y === FLOORS - 1) break;
      const opts = shuffle(run, [-1, 0, 1]).map(d => x + d).filter(nx => nx >= 0 && nx < COLS && !crosses(y, x, nx));
      const nx = opts.length ? opts[0] : x;
      edges.add(`${y},${x},${nx}`); if (!n.next.includes(id(nx, y + 1))) n.next.push(id(nx, y + 1));
      x = nx;
    }
  }
  const boss = { id: 'boss', x: 3, y: FLOORS, type: 'B', next: [] }; nodes.boss = boss;
  Object.values(nodes).forEach(n => { if (n.y === FLOORS - 1) n.next = ['boss']; });
  const parents = {}; Object.values(nodes).forEach(n => n.next.forEach(k => (parents[k] = parents[k] || []).push(n.id)));
  const byFloor = Object.values(nodes).filter(n => n !== boss).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const n of byFloor) {
    if (n.y === 0) { n.type = 'M'; continue; }
    if (n.y === 5) { n.type = 'T'; continue; }
    if (n.y === FLOORS - 1) { n.type = 'R'; continue; }
    const prev = (parents[n.id] || []).map(k => nodes[k].type);
    let t = null;
    for (let tries = 0; tries < 12 && !t; tries++) {
      let r = rand(run), c = null;
      for (const [k, w] of Object.entries(ROOM_WEIGHTS)) { if ((r -= w) <= 0) { c = k; break; } }
      c = c || 'M';
      if ((c === 'E' || c === 'R') && n.y < 4) continue;
      if (c === 'R' && n.y === FLOORS - 2) continue; // the campsite before the boss is enough
      if (['E', 'R', '$'].includes(c) && prev.includes(c)) continue;
      t = c;
    }
    n.type = t || 'M';
  }
  return { nodes, floors: FLOORS };
}
// the rooms the party can go to next
function choices(run) {
  const m = run.map.nodes;
  if (run.node == null) return Object.values(m).filter(n => n.y === 0).sort((a, b) => a.x - b.x).map(n => n.id);
  return m[run.node].next.slice();
}

// ---------------- entering a room ----------------
function enter(run, nodeId) {
  if (run.phase !== 'map' || !choices(run).includes(nodeId)) return false;
  const n = run.map.nodes[nodeId]; run.node = nodeId; run.stats.floors++; (run.visited = run.visited || []).push(nodeId);
  let type = n.type;
  if (type === '?') { // most unknown rooms hold an event; some an ambush, a peddler or a forgotten chest
    const r = rand(run);
    type = r < .12 ? 'M' : r < .18 ? '$' : r < .22 ? 'T' : '?';
  }
  run.room = { type, node: nodeId, unknown: n.type === '?' };
  if (type === 'M' || type === 'E' || type === 'B') { run.room.enc = encounter(run, type); run.phase = 'battle'; run.battle = null; }
  else if (type === 'R') run.phase = 'camp';
  else if (type === '$') { run.room.shop = stock(run); run.phase = 'shop'; }
  else if (type === 'T') { run.room.chest = chest(run); run.phase = 'treasure'; }
  else { run.room.event = drawEvent(run); run.phase = 'event'; }
  return true;
}
// a fight: its map, its pack, and how the goblins are tiered for the act
function encounter(run, type) {
  const A = ACTS[run.act];
  let map, pack;
  if (type === 'B') [map, pack] = A.boss;
  else { map = pick(run, A.maps); pack = pick(run, type === 'E' ? A.elites : run.fights < 2 ? A.weak : A.strong); }
  const foes = pack.length ? pack.map(k => ({ kind: k.replace('*', ''), champ: k.endsWith('*') })) : null;
  return { type, level: lv(map), foes, seed: (rand(run) * 4294967296) >>> 0, tier: run.act, rout: type === 'B' };
}
// what the rules need to set the battle up
function battleOpts(run) {
  const e = run.room.enc;
  return { party: run.party, relics: run.relics, tier: e.tier, foes: e.foes || undefined, rout: e.rout, diff: run.diff };
}

// ---------------- after a battle ----------------
// the party as the battle left it: health (the fallen get back up a little), draughts drunk; then the spoils
function afterBattle(run, S) {
  const won = S.result === 'win', type = run.room.type;
  for (const u of S.units) {
    if (u.side !== 'hero') continue;
    const p = run.party[u.kind];
    p.hp = u.down || !u.alive ? Math.max(1, Math.ceil(p.maxHp * HEAL.downed)) : Math.min(p.maxHp, u.hp);
    const left = (u.uses && u.uses.potion) || 0; p.potions = Math.max(0, Math.min(p.potions, left));
  }
  const kills = S.units.filter(u => u.side === 'gob' && !u.alive && !u.fled).length;
  run.stats.kills += kills; run.fights++; run.battle = null;
  if (!won) { run.phase = 'over'; run.result = 'lose'; return null; }
  run.stats.fights++; if (type === 'E') run.stats.elites++; if (type === 'B') run.stats.bosses++;
  const heal = relicSum(run, 'heal'); if (heal) for (const k of HEROES) { const p = run.party[k]; p.hp = Math.min(p.maxHp, p.hp + heal); }
  const one = relicSum(run, 'healOne'); if (one) { const p = run.party[HEROES.slice().sort((a, b) => (run.party[b].maxHp - run.party[b].hp) - (run.party[a].maxHp - run.party[a].hp))[0]]; p.hp = Math.min(p.maxHp, p.hp + one); }
  const act = GOLD.act[run.act] || 1;
  let gold = Math.round(between(run, GOLD[type]) * act) + kills * relicSum(run, 'killGold') + (run.room.enc.bonusGold || 0);
  if (type === 'E') gold = Math.round(gold * (1 + relicSum(run, 'eliteGold')));
  gold *= run.relics.reduce((k, id) => k * (RELICS[id].goldMul || 1), 1);
  const rw = { gold, relic: null, choices: [], boss: null };
  if (type === 'E') rw.relic = drawRelic(run, relicTier(run));
  if (type === 'B') rw.boss = drawRelics(run, 'boss', 3);
  else rw.choices = offer(run, RELICS.ledger && has(run, 'ledger') ? 4 : 3);
  addGold(run, gold); if (rw.relic) gainRelic(run, rw.relic);
  run.room.reward = rw; run.phase = 'reward';
  return rw;
}
const addGold = (run, n) => { run.gold = Math.max(0, run.gold + n); if (n > 0) run.stats.gold += n; };

// ---------------- rewards: pick one of three ----------------
// a new action for a hero, an upgrade of one they have, or a bonus to a hero's body
function offer(run, n = 3) {
  const out = [], tried = new Set();
  for (let k = 0; k < 40 && out.length < n; k++) {
    const r = rand(run), kind = pick(run, HEROES), p = run.party[kind];
    let o = null;
    if (r < .45) { const c = learnable(run, kind); if (c.length) o = { type: 'learn', kind, card: pick(run, c) }; }
    else if (r < .8) { const c = upgradable(run, kind); if (c.length) o = { type: 'upgrade', kind, card: pick(run, c) }; }
    else o = rand(run) < .5 ? { type: 'hp', kind, n: kind === 'fighter' ? 5 : 4 } : p.die < LIMITS.die && rand(run) < .4 ? { type: 'weapon', kind } : { type: 'hp', kind, n: 3 };
    if (!o) continue;
    const key = o.type + o.kind + (o.card || '');
    if (tried.has(key) || out.some(x => x.kind === o.kind && out.length < HEROES.length)) { tried.add(key); continue; }
    tried.add(key); out.push(o);
  }
  return out;
}
const learnable = (run, kind) => run.party[kind].cards.length >= LIMITS.cards ? [] : Object.keys(CARDS).filter(id => CARDS[id].learn === kind && !run.party[kind].cards.includes(id));
const upgradable = (run, kind) => run.party[kind].cards.filter(id => id !== 'potion' && CARDS[id].up && !(run.party[kind].mods[id] || {}).up);
// apply a reward, a purchase or an event's gift to the party
function grant(run, o) {
  const p = run.party[o.kind];
  if (o.type === 'learn') { if (!p.cards.includes(o.card)) p.cards.push(o.card); }
  else if (o.type === 'upgrade') RULES.upgradeCard(p.mods, o.card);
  else if (o.type === 'hp') { p.maxHp += o.n; p.hp += o.n; }
  else if (o.type === 'weapon') p.die = RULES.stepDie(p.die, 2);
  else if (o.type === 'armour') p.armour = Math.min(LIMITS.armour, p.armour + 1);
  else if (o.type === 'draught') p.potions = Math.min(LIMITS.potions, p.potions + 1);
}
// what a reward or ware is, in words: [title, line]
function describe(run, o) {
  const p = run.party[o.kind], who = o.kind ? UNITS[o.kind].name : 'The party';
  if (o.type === 'learn') return [CARDS[o.card].name, `${who} learns it. ${CARDS[o.card].text.replace('{die}', diceOf(p, o.card))}`];
  if (o.type === 'upgrade') return [CARDS[o.card].name + '+', `${who}'s ${CARDS[o.card].name}: ${RULES.upText(o.card)}.`];
  if (o.type === 'hp') return [`+${o.n} max HP`, `${who} grows tougher.`];
  if (o.type === 'weapon') return [`d${RULES.stepDie(p.die, 2)} weapon`, `${who}'s weapon is reforged: d${p.die} to d${RULES.stepDie(p.die, 2)}.`];
  if (o.type === 'armour') return [`Armour ${Math.min(LIMITS.armour, p.armour + 1)}`, `${who} is fitted for better armour: ${p.armour} to ${Math.min(LIMITS.armour, p.armour + 1)}.`];
  if (o.type === 'draught') return ['Healing Draught', `${who} carries one more into battle (heal 2d4). Holds ${LIMITS.potions}.`];
  if (o.type === 'relic') return [RELICS[o.id].name, RELICS[o.id].text];
  if (o.type === 'train') return ['Training', 'Upgrade one action of any hero.'];
  return ['', ''];
}
const diceOf = (p, id) => { const c = CARDS[id], m = p.mods[id] || {}, d = m.die || (c.weapon ? p.die : c.die), n = m.n || c.n || 1; return d ? (n > 1 ? n : '') + 'd' + d + (m.bonus ? '+' + m.bonus : '') : ''; };
function takeReward(run, i) {
  if (run.phase !== 'reward') return false;
  const rw = run.room.reward;
  if (rw.boss) { const id = rw.boss[i]; if (!id) return false; gainRelic(run, id); return nextAct(run); }
  if (i != null && rw.choices[i]) grant(run, rw.choices[i]);
  return leave(run);
}
const leave = run => { run.phase = 'map'; run.room = null; return true; };

// ---------------- relics ----------------
const relicTier = run => { const r = rand(run); return r < .5 ? 'common' : r < .85 ? 'uncommon' : 'rare'; };
function drawRelics(run, tier, n) {
  const pool = shuffle(run, Object.keys(RELICS).filter(id => RELICS[id].tier === tier && !has(run, id) && !run.seen.includes('r:' + id)));
  return pool.slice(0, n);
}
function drawRelic(run, tier) {
  for (const t of [tier, 'uncommon', 'common', 'rare']) { const r = drawRelics(run, t, 1)[0]; if (r) { run.seen.push('r:' + r); return r; } }
  return null;
}
// a relic joins the party; its lasting changes to the heroes happen now
function gainRelic(run, id) {
  if (!RELICS[id] || has(run, id)) return;
  run.relics.push(id);
  const g = RELICS[id].get; if (!g) return;
  for (const k of HEROES) {
    const p = run.party[k];
    if (g.hp) { p.maxHp += g.hp; p.hp += g.hp; }
    if (g.init) p.initBonus += g.init;
    if (g.ap) p.ap = (p.ap || RULES.TUNE.ap.hero) + g.ap;
    if (g.dieUp) p.die = RULES.stepDie(p.die, 2 * g.dieUp);
    if (g.armour && (g.who === 'all' || g.who === k)) p.armour = Math.min(LIMITS.armour + 1, p.armour + g.armour);
    if (g.card && g.card[k]) for (const c in g.card[k]) { const m = p.mods[c] || (p.mods[c] = {}); for (const f in g.card[k][c]) m[f] = (m[f] || (f === 'n' ? CARDS[c].n || 1 : 0)) + g.card[k][c][f]; }
  }
  if (g.armour && g.who === 'lowest') { const k = HEROES.slice().sort((a, b) => run.party[a].armour - run.party[b].armour)[0]; run.party[k].armour += g.armour; }
}

// ---------------- campsites ----------------
function rest(run) {
  if (run.phase !== 'camp' || relicSum(run, 'noRest')) return false;
  const k = HEAL.rest + relicSum(run, 'rest');
  for (const h of HEROES) { const p = run.party[h]; p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp * k)); }
  return leave(run);
}
function train(run, kind, card) {
  if (run.phase !== 'camp' || !upgradable(run, kind).includes(card)) return false;
  RULES.upgradeCard(run.party[kind].mods, card); return leave(run);
}

// ---------------- shops ----------------
const price = (run, range) => Math.round(between(run, range) * (1 - relicSum(run, 'shop')));
function stock(run) {
  const wares = [];
  for (const kind of shuffle(run, HEROES.slice()).slice(0, 3)) { const c = learnable(run, kind); if (c.length) wares.push({ type: 'learn', kind, card: pick(run, c), price: price(run, PRICES.learn) }); }
  for (const kind of shuffle(run, HEROES.filter(k => run.party[k].die < LIMITS.die)).slice(0, 2)) wares.push({ type: 'weapon', kind, price: price(run, PRICES.weapon) });
  const ak = shuffle(run, HEROES.filter(k => run.party[k].armour < LIMITS.armour))[0]; if (ak) wares.push({ type: 'armour', kind: ak, price: price(run, PRICES.armour) });
  for (const t of [relicTier(run), relicTier(run), 'shop']) { const id = drawRelic(run, t); if (id) wares.push({ type: 'relic', id, price: price(run, PRICES.relic[RELICS[id].tier] || PRICES.relic.common) }); }
  for (const kind of shuffle(run, HEROES.slice()).slice(0, 2)) wares.push({ type: 'draught', kind, price: price(run, PRICES.draught) });
  wares.push({ type: 'train', price: Math.round(PRICES.train * (1 - relicSum(run, 'shop'))) });
  return { wares };
}
// buy a ware; training needs the hero and the action to upgrade
function buy(run, i, kind, card) {
  if (run.phase !== 'shop') return false;
  const w = run.room.shop.wares[i]; if (!w || w.sold || run.gold < w.price) return false;
  if (w.type === 'train') { if (!kind || !upgradable(run, kind).includes(card)) return false; RULES.upgradeCard(run.party[kind].mods, card); }
  else if (w.type === 'relic') gainRelic(run, w.id);
  else { if (w.type === 'draught' && run.party[w.kind].potions >= LIMITS.potions) return false; grant(run, w); }
  run.gold -= w.price; w.sold = true; return true;
}

// ---------------- chests ----------------
function chest(run) {
  const k = run.relics.reduce((m, id) => m * (RELICS[id].goldMul || 1), 1) * (1 + relicSum(run, 'eliteGold'));
  return { relic: drawRelic(run, relicTier(run)), gold: Math.round(between(run, GOLD.T) * k), open: false };
}
function openChest(run) {
  if (run.phase !== 'treasure' || run.room.chest.open) return false;
  const c = run.room.chest; c.open = true; if (c.relic) gainRelic(run, c.relic); addGold(run, c.gold); return true;
}

// ---------------- events ----------------
// each choice has its effects: gold, heal (share of max HP, every hero), hurt (HP from every hero, never below 1),
// maxHp (every hero), relic (a tier), upgrade / learn (a random one), weapon (a random hero), fight (a pack: the room
// becomes a battle), chance: [p, effects if lucky, effects if not]; need: gold it costs (the choice is shut without it)
const EVENTS = {
  shrine: { acts: [0, 1, 2], title: 'The Wayside Shrine', text: 'A mossy shrine to a forgotten saint. Coins glint in its offering bowl, and the air around it is warm and calm.',
    choices: [{ label: 'Pray', text: 'Every hero heals 25% of max HP.', heal: .25 }, { label: 'Take the coins', text: '+60 gold. Every hero loses 3 HP.', gold: 60, hurt: 3 }, { label: 'Walk on', text: 'Nothing happens.' }] },
  peddler: { acts: [0, 1], title: 'A Goblin Peddler', text: 'A goblin with a cart of junk waves you over. "Bargains! Trinkets! No questions!" His guards look bored.',
    choices: [{ label: 'Buy a trinket', text: 'Pay 50 gold for a common relic.', need: 50, gold: -50, relic: 'common' }, { label: 'Rob him', text: 'Fight his guards; keep his cart.', fight: ['cutter*', 'cutter'], gold: 40 }, { label: 'Wave him off', text: 'Nothing happens.' }] },
  yard: { acts: [0, 1, 2], title: 'The Training Yard', text: 'A ruined barracks with its straw dummies still standing. There is time for a hard morning of drill.',
    choices: [{ label: 'Drill', text: 'Upgrade a random action. Every hero loses 4 HP.', upgrade: 1, hurt: 4 }, { label: 'Rest instead', text: 'Every hero heals 10% of max HP.', heal: .1 }] },
  camp: { acts: [0, 1], title: 'An Abandoned Camp', text: 'A goblin camp, left in a hurry. The fire is still warm and someone has dropped a purse.',
    choices: [{ label: 'Search it', text: '+35 gold.', gold: 35 }, { label: 'Eat their stew', text: 'Every hero heals 15% of max HP.', heal: .15 }] },
  well: { acts: [0, 1, 2], title: 'The Wishing Well', text: 'An old well, its bottom glittering with coins. They say the well gives back to those who give.',
    choices: [{ label: 'Throw in 25 gold', text: 'Half the time, a relic.', need: 25, gold: -25, chance: [.5, { relic: 'uncommon' }, {}] }, { label: 'Climb down for the coins', text: '+50 gold, but a slip costs every hero 5 HP half the time.', gold: 50, chance: [.5, {}, { hurt: 5 }] }, { label: 'Leave it', text: 'Nothing happens.' }] },
  idol: { acts: [1, 2], title: 'The Cursed Idol', text: 'A jewelled idol grins from a niche. Its eyes follow you. It would fetch a fortune, if it does not take one first.',
    choices: [{ label: 'Take it', text: 'A rare relic. Every hero loses 3 max HP.', relic: 'rare', maxHp: -3 }, { label: 'Leave it be', text: 'Nothing happens.' }] },
  ranger: { acts: [0, 1], title: 'The Wounded Ranger', text: 'A ranger lies by the path with a goblin arrow in her leg. She could teach you a thing or two, if she lives.',
    choices: [{ label: 'Tend her wounds', text: 'Every hero loses 3 HP; one hero learns a new action.', hurt: 3, learn: 1 }, { label: 'Give her a draught', text: 'Pay 30 gold; she gives you her horn.', need: 30, gold: -30, relic: 'common' }, { label: 'Leave her', text: 'Nothing happens.' }] },
  forge: { acts: [2], title: 'The Forgotten Anvil', text: 'An anvil still glowing over a vent of fire. A smith could reforge a blade here, if they can stand the heat.',
    choices: [{ label: 'Reforge a weapon', text: "A random hero's weapon die grows a size. Every hero loses 6 HP.", weapon: 1, hurt: 6 }, { label: 'Warm your hands', text: 'Every hero heals 10% of max HP.', heal: .1 }] },
  gamblers: { acts: [0, 1, 2], title: 'Dice in the Dark', text: 'Three goblins squat round a lantern, throwing knucklebones. "Play a round, tall ones? Thirty gold a throw."',
    choices: [{ label: 'Play', text: 'Pay 30: half the time win 75.', need: 30, gold: -30, chance: [.5, { gold: 75 }, {}] }, { label: 'Kick over the lantern', text: 'Fight them.', fight: ['cutter', 'cutter', 'archer'], gold: 30 }, { label: 'Walk past', text: 'Nothing happens.' }] },
  spring: { acts: [1, 2], title: 'The Healing Spring', text: 'Clear water bubbles up between the stones, cold and sweet. The wounded feel it the moment they drink.',
    choices: [{ label: 'Drink deep', text: 'Every hero heals 30% of max HP.', heal: .3 }, { label: 'Fill your flasks', text: 'Two heroes each carry another draught.', draughts: 2 }] }
};
function drawEvent(run) {
  let pool = Object.keys(EVENTS).filter(id => EVENTS[id].acts.includes(run.act) && !run.seen.includes('e:' + id));
  if (!pool.length) pool = Object.keys(EVENTS).filter(id => EVENTS[id].acts.includes(run.act));
  const id = pick(run, pool); run.seen.push('e:' + id);
  return { id, done: null };
}
// a choice the party can't afford is shut
const canChoose = (run, c) => !c.need || run.gold >= c.need;
function choose(run, i) {
  if (run.phase !== 'event') return false;
  const ev = run.room.event, c = EVENTS[ev.id].choices[i]; if (!c || ev.done != null || !canChoose(run, c)) return false;
  ev.done = i; ev.result = [];
  if (c.fight) { // the room becomes a fight; its gold comes with the win
    run.room.enc = { type: 'M', level: lv(pick(run, ACTS[run.act].maps)), foes: c.fight.map(k => ({ kind: k.replace('*', ''), champ: k.endsWith('*') })), seed: (rand(run) * 4294967296) >>> 0, tier: run.act, rout: false, bonusGold: c.gold || 0 };
    run.room.type = 'M'; run.phase = 'battle'; return true;
  }
  apply(run, c, ev.result);
  if (c.chance) apply(run, rand(run) < c.chance[0] ? c.chance[1] : c.chance[2], ev.result);
  return true;
}
function apply(run, e, out) {
  if (e.gold) { addGold(run, e.gold); out.push(e.gold > 0 ? `+${e.gold} gold` : `${e.gold} gold`); }
  if (e.heal) { for (const k of HEROES) { const p = run.party[k]; p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp * e.heal)); } out.push(`every hero heals ${Math.round(e.heal * 100)}%`); }
  if (e.hurt) { for (const k of HEROES) { const p = run.party[k]; p.hp = Math.max(1, p.hp - e.hurt); } out.push(`every hero loses ${e.hurt} HP`); }
  if (e.maxHp) { for (const k of HEROES) { const p = run.party[k]; p.maxHp = Math.max(4, p.maxHp + e.maxHp); p.hp = Math.min(p.maxHp, Math.max(1, p.hp + e.maxHp)); } out.push(`every hero ${e.maxHp > 0 ? 'gains' : 'loses'} ${Math.abs(e.maxHp)} max HP`); }
  if (e.relic) { const id = drawRelic(run, e.relic); if (id) { gainRelic(run, id); out.push(`found: ${RELICS[id].name}`); } }
  if (e.upgrade) { const ks = shuffle(run, HEROES.filter(k => upgradable(run, k).length)); if (ks[0]) { const c = pick(run, upgradable(run, ks[0])); RULES.upgradeCard(run.party[ks[0]].mods, c); out.push(`${UNITS[ks[0]].name}'s ${CARDS[c].name} is upgraded`); } }
  if (e.learn) { const ks = shuffle(run, HEROES.filter(k => learnable(run, k).length)); if (ks[0]) { const c = pick(run, learnable(run, ks[0])); run.party[ks[0]].cards.push(c); out.push(`${UNITS[ks[0]].name} learns ${CARDS[c].name}`); } }
  if (e.weapon) { const ks = shuffle(run, HEROES.filter(k => run.party[k].die < LIMITS.die)); if (ks[0]) { grant(run, { type: 'weapon', kind: ks[0] }); out.push(`${UNITS[ks[0]].name}'s weapon now rolls d${run.party[ks[0]].die}`); } }
  if (e.draughts) { for (const k of shuffle(run, HEROES.filter(h => run.party[h].potions < LIMITS.potions)).slice(0, e.draughts)) { run.party[k].potions++; out.push(`${UNITS[k].name} carries a draught`); } }
}

// ---------------- the next act ----------------
function nextAct(run) {
  if (run.act >= ACTS.length - 1) { run.phase = 'won'; run.result = 'win'; run.room = null; return true; }
  run.act++; run.node = null; run.fights = 0; run.visited = []; run.map = genMap(run);
  for (const k of HEROES) run.party[k].hp = run.party[k].maxHp; // a full heal between acts
  run.phase = 'map'; run.room = null; return true;
}

// a saved run that still makes sense to this version of the rules, or null
function check(r) {
  if (!r || r.v !== 1 || !ACTS[r.act] || !r.map || !r.party || !HEROES.every(k => r.party[k])) return null;
  r.relics = (r.relics || []).filter(id => RELICS[id]);
  for (const k of HEROES) r.party[k].cards = r.party[k].cards.filter(id => CARDS[id]);
  return r;
}

return { ACTS, FLOORS, COLS, GOLD, PRICES, HEAL, LIMITS, EVENTS, HEROES, diceOf, newRun, genMap, choices, enter, battleOpts, afterBattle, offer, grant, describe, takeReward, leave, gainRelic, drawRelics,
  rest, train, upgradable, learnable, stock, buy, openChest, choose, canChoose, nextAct, check, rand };
})();
if (typeof module !== 'undefined') module.exports = RUN;
