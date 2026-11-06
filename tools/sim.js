// Headless balance simulator: plays whole battles with a greedy hero policy against the real goblin AI.
// node tools/sim.js [battles per level] [level|all] [rules file]
// Each battle is fought with the boons a party would have earned by then: one random pick of three after every earlier
// battle (BOONS=0 to fight without). DIFF=easy|hard sets the difficulty. DMG=1 splits damage to heroes by source,
// USES=1 counts the abilities the bot used.
const path = require('path');
const GC = require(path.resolve(process.argv[4] || path.join(__dirname, '../js/rules.js')));
const N = +process.argv[2] || 200, ONLY = process.argv[3] && process.argv[3] !== 'all' ? +process.argv[3] : null;
const KNOWN = new Set(['rout', 'log', 'note', 'combo', 'float', 'wait', 'sfx', 'shake', 'fx', 'face', 'faceDir', 'cast', 'aim', 'endAim', 'status', 'par', 'roll', 'total', 'verdict', 'strike', 'miss', 'damage', 'kill', 'down', 'wake', 'fall', 'burn', 'ice', 'move', 'push', 'swing', 'shot', 'sweep', 'heal', 'smashMark', 'smashClear', 'smash', 'flinch', 'banner', 'spawn', 'turn', 'idle', 'clearDice', 'round', 'player', 'end', 'xp']);

const DMG = {};
let lastLabel = '';
function tally(B, list) { list.forEach(e => { if (e.t === 'par') return e.list.forEach(l => tally(B, l)); if (e.t === 'roll' && !e.append) lastLabel = e.label; if (e.t === 'damage' && B.U(e.id).side === 'hero') { let k = e.from != null ? B.U(e.from).kind : 'other'; if (k === 'king') k = /Smash/.test(lastLabel) ? 'king-smash' : 'king-cleave'; DMG[k] = (DMG[k] || 0) + e.amount; } }); }
function check(B, evs, where) {
  const S = B.S; tally(B, evs);
  const walk = list => list.forEach(e => { if (!KNOWN.has(e.t)) throw new Error(`${where}: unknown event ${e.t}`); if (e.t === 'par') e.list.forEach(walk); });
  walk(evs);
  const seen = new Map();
  for (const u of S.units) {
    if (!u.alive) continue;
    if (u.hp < 0 || u.hp > u.maxHp) throw new Error(`${where}: ${u.name} hp ${u.hp}`);
    if (u.down && u.hp !== 0) throw new Error(`${where}: down with hp`);
    for (const [c, r] of B.cellsOf(u)) {
      if (!B.inB(c, r)) throw new Error(`${where}: ${u.name} off board ${c},${r}`);
      const k = B.key(c, r, u.l);
      if (seen.has(k)) throw new Error(`${where}: ${u.name} on top of ${seen.get(k)} at ${k}`);
      seen.set(k, u.name);
      const ob = B.obstOn(c, r, u.l); if (ob && ob !== 'ice') throw new Error(`${where}: ${u.name} inside ${ob} at ${k}`);
    }
  }
}

// ---------------- the hero policy: greedy on expected value, one action at a time ----------------
const T = 300;
function options(B, u) {
  const opts = [], S = B.S, foes = B.gobs();
  const allyLater = S.order.slice(S.turn + 1).map(B.U).filter(x => x.side === 'hero' && B.up(x));
  for (const id of B.cardsOf(u)) {
    if (B.block(u, id)) continue;
    const card = B.cardOf(u, id), tg = B.targets(u, id), proneV = t => t.st.prone || B.def(t).boss ? 0 : 1.5 + allyLater.length * .8;
    const judgeV = x => x.st.judged ? 0 : allyLater.filter(h => B.dist(h, x) <= 4).length * (B.cardOf(B.heroes().find(h => h.kind === 'cleric') || u, 'c_rebuke').mercy || 1) * .7; // the heals a mark would bring
    if (card.atk || (card.target === 'enemy' && id === 't_trick') || id === 'c_rebuke') {
      for (const [k, e] of tg) {
        if (e.unit == null) continue;
        const t = B.U(e.unit), from = e.path ? e.path[e.path.length - 1] : u;
        let v = 0;
        if (card.atk) {
          const f = B.forecast(u, id, t, from, T), hit = 1 - f.miss, live = 1 - f.kill; v = f.avg + f.kill * (t.hp + 5);
          if (id === 'm_frost') v += (2.5 + (card.spread ? foes.filter(x => x !== t && B.dist(x, t) === 1).length * 2 : 0)) * hit * (card.deep ? 1.4 : 1);
          if (id === 'f_charge') v += (1.5 + (card.drive > 1 ? 1 : 0) + (card.anvil ? B.heroes().filter(h => h !== u && B.dist(h, t) <= 2).length * 2.2 : 0)) * hit;
          if (card.leap) v += Math.min(card.leap, foes.filter(x => x !== t && B.heroes().some(h => B.dist(h, x) === 1)).length) * 1.8 * hit;
          if (card.follow && foes.some(x => x !== t && B.dist(x, from) === 1)) v += f.kill * 3.5;
          if (card.judge) v += judgeV(t) * hit * live;
          if (card.fan && foes.some(x => x !== t && B.dist(x, from) <= 4 && B.los(from, x))) v += 3.5;
          if (card.poison && !t.st.poisoned) v += 3 * hit * live;
        }
        else if (id === 't_trick') v = proneV(t) + (card.all ? foes.filter(x => x !== t && B.dist(x, from) === 1).reduce((n, x) => n + proneV(x), 0) : 0) + (card.free ? 1.5 : 0);
        else if (id === 'c_rebuke') { const strip = x => { const a = B.armourOf(x); return (a >= 2 ? 1 + allyLater.filter(h => B.dist(h, x) <= 3).length * a / 1.5 : 0) + judgeV(x); }; v = strip(t) + (card.spread ? foes.filter(x => x !== t && B.dist(x, t) === 1).reduce((n, x) => n + strip(x) * .8, 0) : 0); }
        if (e.path) v -= 1.6; // the walk costs an action
        if (S.smash && S.smash.cells.includes(B.key(from.c, from.r))) v -= 5;
        opts.push({ v, id, target: e.unit, path: e.path });
      }
    } else if (card.sweep) {
      const fs = (card.sweep === 'around' ? foes.filter(t => B.cheb(t, u) === 1) : foes.filter(t => B.dist(t, u) === 1));
      let v = 0; for (const t of fs) { const f = B.forecast(u, id, t, u, T); v += f.avg + f.kill * (t.hp + 5) + (card.shove ? 1 : 0) + (card.trip ? proneV(t) * (1 - f.miss) * (1 - f.kill) : 0) + (card.anvil ? .8 : 0); }
      if (card.ward && !u.st.warded) v += 1 + fs.length * .5;
      opts.push({ v, id, target: u.id });
    } else if (card.area) {
      for (const [k, e] of tg) {
        const hit = B.blastHits(u, e.cell); let v = 0;
        for (const x of hit) { const f = B.forecast(u, id, x, e.cell, T); v += x.side === 'gob' ? f.avg + f.kill * (x.hp + 5) + 1.5 : -(f.avg * 2 + 4); }
        if (v > 0) opts.push({ v, id, target: e.cell });
      }
    } else if (card.heal) { // Heal, or a draught (kept for someone badly hurt); an upgraded Heal spills to the heroes beside
      for (const [k, e] of tg) {
        const t = B.U(e.unit); if (e.path) continue; const need = t.down ? 99 : t.maxHp - t.hp, avg = B.cardN(u, id) * (B.cardDie(u, id) + 1) / 2;
        const spill = card.spill ? B.heroes().filter(h => h !== t && B.dist(h, t) === 1).reduce((n, h) => n + Math.min(avg / 2, h.maxHp - h.hp), 0) * 1.1 : 0;
        const bless = card.bless && !t.st.blessed && allyLater.includes(t) ? 1.2 : 0;
        if (t.down) opts.push({ v: 20 + spill, id, target: t.id }); else if (need >= (id === 'potion' ? Math.max(5, t.maxHp * .5) : 4) || spill >= 3) opts.push({ v: Math.min(need, avg) * 1.1 + spill + bless, id, target: t.id });
      }
    } else if (id === 'c_bless') {
      for (const [k, e] of tg) {
        const t = B.U(e.unit); if (e.path || t.st.blessed) continue;
        const one = h => { const later = h === u ? 0 : allyLater.includes(h) ? 1 : 0, near = foes.filter(g => B.dist(g, h) <= 2).length; return (later && ['fighter', 'thief'].includes(h.kind) ? 1.8 : later ? .8 : 0) + (card.ward && !h.st.warded && near ? 1 + near * .7 : 0); };
        const v = one(t) + (card.group ? B.heroes().filter(h => h !== t && B.dist(h, t) === 1 && !h.st.blessed).reduce((n, h) => n + one(h), 0) : 0); if (v > 0) opts.push({ v, id, target: t.id });
      }
    } else if (id === 'c_haste') {
      for (const [k, e] of tg) { const t = B.U(e.unit); if (e.path || t === u || t.st.hasted) continue; if (['fighter', 'thief'].includes(t.kind)) opts.push({ v: card.extra > 1 ? 3.6 : 2.2, id, target: t.id }); }
    } else if (id === 'f_taunt') {
      const near = foes.filter(g => B.dist(g, u) <= 4).length, soft = B.heroes().filter(h => h !== u && h.hp < h.maxHp * .5).length;
      const rally = card.rally ? allyLater.filter(h => B.dist(h, u) <= card.rally && !h.st.blessed).length * .7 + (card.ward ? B.heroes().filter(h => B.dist(h, u) <= card.rally && !h.st.warded && foes.some(g => B.dist(g, h) <= 2)).length * .8 : 0) : 0;
      if ((near >= 2 && soft) || rally >= 1.4) opts.push({ v: (near >= 2 && soft ? 1.5 + soft : 0) + rally, id, target: u.id });
    } else if (id === 't_hide') {
      const smoke = card.smoke ? B.heroes().filter(h => h !== u && B.dist(h, u) <= card.smoke && !h.st.hidden && foes.some(g => B.dist(g, h) <= 2)).length : 0;
      if ((!u.st.hidden && u.ap >= 2) || smoke) opts.push({ v: (!u.st.hidden && u.ap >= 2 ? 1.2 : 0) + smoke * 1.2, id, target: u.id });
    } else if (id === 'f_grab') {
      for (const g of B.grabbable(u)) {
        if (g.side !== 'gob') { // III: throw a friend into the fight, beside a foe to strike
          if (!card.fling) continue;
          for (const [k, e] of B.grabCells(u, g)) { const n = foes.filter(x => B.dist(x, e.cell) === 1).length; if (n && !B.obstAt(e.cell.c, e.cell.r)) { opts.push({ v: 3.2 + (g.kind === 'thief' ? .8 : 0), id, target: { grab: g.id, cell: e.cell } }); break; } }
          continue;
        }
        for (const [k, e] of B.grabCells(u, g)) { const ob = B.obstAt(e.cell.c, e.cell.r); if (ob === 'chasm') opts.push({ v: g.hp + 8, id, target: { grab: g.id, cell: e.cell } }); else if (ob === 'lava') opts.push({ v: g.hp <= B.TUNE.lava ? g.hp + 8 : 6, id, target: { grab: g.id, cell: e.cell } }); }
      }
    }
  }
  return opts;
}
function positionMove(B, u) { // no good action: walk toward a useful square
  const rch = B.reach(u), foes = B.gobs().filter(g => !g.asleep); if (!foes.length) return null;
  let best = null;
  for (const n of rch.values()) {
    if (!n.end || n.cost === 0) continue;
    const d = Math.min(...foes.map(g => B.dist(n, g)));
    let sc;
    if (B.isRanged(u)) { const sees = foes.some(g => B.dist(n, g) <= 4 && B.los(n, g)); sc = (sees ? 0 : 10) + (d <= 1 ? 8 : 0) - Math.min(d, 4) * .5; }
    else if (u.kind === 'cleric') { const hurt = B.heroes().filter(h => h !== u && h.hp < h.maxHp); const dh = hurt.length ? Math.min(...hurt.map(h => B.dist(n, h))) : 0; sc = d * .6 + Math.max(0, dh - 3) * 2; }
    else sc = d;
    sc += B.burning(n.c, n.r, n.l) ? 20 : 0;
    if (B.S.smash && B.S.smash.cells.includes(B.key(n.c, n.r))) sc += 30;
    if (!best || sc < best.sc) best = { sc, path: B.pathTo(rch, B.key(n.c, n.r, n.l)) };
  }
  const here = Math.min(...foes.map(g => B.dist(u, g)));
  if (best && (B.isRanged(u) ? true : Math.min(...foes.map(g => B.dist(best.path[best.path.length - 1], g))) < here)) return best.path;
  return null;
}
function heroTurn(B, stats) {
  const S = B.S, u = B.U(S.active);
  for (let k = 0; k < 8 && S.phase === 'player' && S.active === u.id && u.ap > 0; k++) {
    if (S.smash && S.smash.cells.includes(B.key(u.c, u.r))) { // first get out of the King's way
      const rch = B.reach(u); let out = null;
      for (const n of rch.values()) if (n.end && !S.smash.cells.includes(B.key(n.c, n.r)) && (!out || n.cost < out.cost)) out = n;
      if (out) { const evs = B.move(u.id, B.pathTo(rch, B.key(out.c, out.r, out.l))); check(B, evs, 'dodge'); continue; }
    }
    const opts = options(B, u).sort((a, b) => b.v - a.v), best = opts[0];
    let evs;
    if (best && best.v > .9) { evs = B.act(u.id, best.id, best.target, best.path); stats.uses[best.id] = (stats.uses[best.id] || 0) + 1; }
    else { const p = positionMove(B, u); if (!p) break; evs = B.move(u.id, p); }
    if (!evs.length) break;
    check(B, evs, `${S.level} r${S.round} ${u.name}`);
    if (GC.LEVELS[S.level].rout && !S.kingDied && !S.units.find(x => x.kind === 'king').alive) S.kingDied = S.round;
  }
  if (S.phase === 'player') { const evs = B.endTurn(); check(B, evs, `${S.level} r${S.round} end`); }
}

// the boons a party would carry into a battle: one random pick of three offered after each earlier one; and the
// levels it would have reached, each with an upgrade picked at random
const seeded = (seed, salt) => { let x = (seed * 2654435761 + salt) >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
function boonsFor(level, seed) {
  if (process.env.BOONS === '0') return [];
  return GC.partyBoons(level, seeded(seed, 0));
}
const growthFor = (level, seed) => process.env.LV0 ? null : GC.partyGrowth(level, seeded(seed, 7919));
function play(level, seed, stats) {
  const S = GC.newState(level, seed, { boons: boonsFor(level, seed), diff: process.env.DIFF, growth: growthFor(level, seed), xp: true }), B = GC.battle(S);
  check(B, B.begin(), 'begin');
  for (let k = 0; k < 2000 && !S.result; k++) heroTurn(B, stats);
  const hs = S.units.filter(u => u.side === 'hero');
  if (GC.LEVELS[S.level].rout && S.result === 'win') { stats.kingRound = (stats.kingRound || []); stats.kingRound.push(S.kingDied || S.round); }
  stats.xp = (stats.xp || []); for (const u of S.units) if (u.side === 'hero') stats.xp.push(S.stats[u.id].xp);
  return { win: S.result === 'win', rounds: S.round, downs: hs.filter(h => h.down).length, hpLeft: hs.reduce((a, h) => a + (h.down ? 0 : h.hp), 0) / hs.reduce((a, h) => a + h.maxHp, 0), horns: S.horns, totalDowns: Object.values(S.stats).reduce((a, s) => a + s.downs, 0) };
}
// run N battles of one level and sum them up (also used by other tools: require('./sim.js').batch)
function batch(lv, n = N) {
  const stats = { uses: {} }, res = [];
  for (let i = 0; i < n; i++) res.push(play(lv, 1000 + i * 7919, stats));
  const avg = f => (res.reduce((a, r) => a + f(r), 0) / res.length);
  return { res, stats, win: avg(r => r.win), rounds: avg(r => r.rounds), hpLeft: avg(r => r.hpLeft), downs: avg(r => r.totalDowns) };
}
module.exports = { GC, play, batch, boonsFor };
if (require.main !== module) return;
const levels = ONLY != null ? [ONLY] : GC.LEVELS.map((_, i) => i);
for (const lv of levels) {
  const stats = { uses: {} }, res = [];
  const t0 = Date.now();
  for (let i = 0; i < N; i++) res.push(play(lv, 1000 + i * 7919, stats));
  const avg = f => (res.reduce((a, r) => a + f(r), 0) / res.length);
  const wr = res.filter(r => r.win).map(r => r.rounds), lr = res.filter(r => !r.win).map(r => r.rounds), med = a => a.length ? a.sort((x, y) => x - y)[a.length >> 1] : '-';
  console.log(`    rounds: wins median ${med(wr)}, losses median ${med(lr)}, capped ${res.filter(r => r.rounds >= 99).length}`);
  console.log(`L${lv + 1} ${GC.LEVELS[lv].name.padEnd(20)} win ${(avg(r => r.win) * 100).toFixed(0).padStart(3)}%  rounds ${avg(r => r.rounds).toFixed(1)}  hp left ${(avg(r => r.hpLeft) * 100).toFixed(0)}%  downs ${avg(r => r.totalDowns).toFixed(2)}  ${((Date.now() - t0) / N).toFixed(0)}ms/battle`);
  if (process.env.DMG) { console.log('    damage to heroes per battle:', Object.entries(DMG).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / N).toFixed(1)}`).join(' · ')); for (const k in DMG) delete DMG[k]; }
  if (stats.xp) { const x = stats.xp; console.log('    xp per hero per battle: mean', (x.reduce((a, b) => a + b, 0) / x.length).toFixed(0), ' (a level is', GC.TUNE.xp.level + ')'); }
  if (stats.kingRound) { const k = stats.kingRound.sort((a, b) => a - b); console.log('    king falls in round: median', k[k.length >> 1], ' p25', k[k.length >> 2], ' p75', k[(k.length * 3) >> 2]); }
  if (process.env.USES) console.log('   ', Object.entries(stats.uses).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / N).toFixed(1)}`).join(' · '));
}
