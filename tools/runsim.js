// Run simulator: the battle bot (tools/sim.js) plays whole runs, choosing rooms, rewards, campsites, shops and events
// with simple rules, and the run is measured the way docs/RUN.md measures the Slay the Spire data: the share of the
// party's max HP each fight costs, by act and room, and how many runs get past each boss.
//   node tools/runsim.js 200          runs to play (default 100)
// DIFF=easy|hard sets the difficulty. VERBOSE=1 prints each run's path.
const path = require('path');
const { GC, fight } = require('./sim.js');
const RUN = require(path.join(__dirname, '../js/run.js'));
const N = +process.argv[2] || 100;
const HEROES = RUN.HEROES;
const partyHp = run => HEROES.reduce((a, k) => a + run.party[k].hp, 0), partyMax = run => HEROES.reduce((a, k) => a + run.party[k].maxHp, 0);

// ---------------- the bot's choices outside battle ----------------
const ROOM_PREF = { M: 3, '?': 3, $: 2, T: 4, E: 3.5, R: 1, B: 9 };
function chooseRoom(run) {
  const ch = RUN.choices(run), frac = partyHp(run) / partyMax(run);
  const score = id => {
    const t = run.map.nodes[id].type; let v = ROOM_PREF[t] + RUN.rand(run) * 1.5;
    if (t === 'R') v += frac < .55 ? 5 : 0;
    if (t === 'E') v += frac > .65 ? 2 : frac < .45 ? -4 : 0;
    if (t === '$') v += run.gold >= 150 ? 2 : -2;
    return v;
  };
  return ch.sort((a, b) => score(b) - score(a))[0];
}
const REWARD_PREF = { upgrade: 3, learn: 2.5, weapon: 3.5, hp: 2 };
function chooseReward(run) {
  const rw = run.room.reward;
  if (rw.boss) return 0;
  let best = null, bv = -1; rw.choices.forEach((o, i) => { const v = REWARD_PREF[o.type] + RUN.rand(run); if (v > bv) { bv = v; best = i; } });
  return best;
}
function atCamp(run) {
  const frac = partyHp(run) / partyMax(run);
  if (frac < .45 && !run.relics.some(id => GC.RELICS[id].noRest)) return RUN.rest(run); // like the data's players: mostly train, rest when low
  for (const k of HEROES) { const c = RUN.upgradable(run, k); if (c.length) return RUN.train(run, k, c[0]); }
  return RUN.rest(run) || RUN.leave(run);
}
function atShop(run) {
  const order = { relic: 5, weapon: 4, armour: 3, learn: 2, draught: 1, train: 0 };
  const wares = run.room.shop.wares.map((w, i) => ({ w, i })).sort((a, b) => order[b.w.type] - order[a.w.type]);
  for (const { w, i } of wares) {
    if (w.sold || run.gold < w.price) continue;
    if (w.type === 'train') { const k = HEROES.find(h => RUN.upgradable(run, h).length); if (k) RUN.buy(run, i, k, RUN.upgradable(run, k)[0]); }
    else RUN.buy(run, i);
  }
  RUN.leave(run);
}
function atEvent(run) {
  const E = RUN.EVENTS[run.room.event.id], frac = partyHp(run) / partyMax(run);
  let pick = 0;
  E.choices.forEach((c, i) => { if (c.heal && frac < .6) pick = i; });
  if (!RUN.canChoose(run, E.choices[pick]) || (E.choices[pick].hurt && frac < .5)) pick = E.choices.length - 1;
  if (E.choices[pick].fight && frac < .6) pick = E.choices.length - 1;
  RUN.choose(run, pick);
  if (run.phase === 'event') RUN.leave(run);
}

// ---------------- one run ----------------
function playRun(seed, rec) {
  const run = RUN.newRun(seed, { diff: process.env.DIFF }), path = [];
  for (let guard = 0; guard < 500 && run.phase !== 'over' && run.phase !== 'won'; guard++) {
    if (run.phase === 'map') { const id = chooseRoom(run); RUN.enter(run, id); path.push(run.room.type); }
    else if (run.phase === 'battle') {
      const e = run.room.enc, before = HEROES.map(k => run.party[k].hp), max = partyMax(run);
      if (e.type === 'B') rec.bossHp[run.act].push(partyHp(run) / max);
      const S = GC.newState(e.level, e.seed, RUN.battleOpts(run));
      fight(S);
      const after = HEROES.map(k => { const u = S.units.find(x => x.side === 'hero' && x.kind === k); return u.down ? 0 : u.hp; });
      const lost = before.reduce((a, h, i) => a + Math.max(0, h - after[i]), 0) / max;
      (rec.dmg[`${run.act + 1}${e.type}`] = rec.dmg[`${run.act + 1}${e.type}`] || []).push(lost);
      if (e.type === 'B') rec.goldAtBoss[run.act].push(run.gold);
      RUN.afterBattle(run, S);
      if (run.phase === 'over') { rec.diedAt.push({ act: run.act, type: e.type, map: GC.LEVELS[e.level].id }); break; }
    }
    else if (run.phase === 'reward') RUN.takeReward(run, chooseReward(run));
    else if (run.phase === 'camp') atCamp(run);
    else if (run.phase === 'shop') atShop(run);
    else if (run.phase === 'treasure') { RUN.openChest(run); RUN.leave(run); }
    else if (run.phase === 'event') atEvent(run);
  }
  if (process.env.VERBOSE) console.log(seed, run.result || run.phase, 'act', run.act + 1, path.join(''), 'relics', run.relics.length, 'gold', run.gold);
  return run;
}

const rec = { dmg: {}, diedAt: [], bossHp: [[], [], []], goldAtBoss: [[], [], []] };
const t0 = Date.now(); let won = 0; const pastBoss = [0, 0, 0], fightsPerAct = [[], [], []], relics = [];
for (let i = 0; i < N; i++) {
  const run = playRun(5000 + i * 7919, rec);
  if (run.result === 'win') won++;
  for (let a = 0; a < 3; a++) if (run.act > a || run.result === 'win') pastBoss[a]++;
  relics.push(run.relics.length);
}
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN, pct = x => (x * 100).toFixed(0) + '%';
console.log(`${N} runs, ${((Date.now() - t0) / N / 1000).toFixed(1)}s a run · win ${pct(won / N)} · past each boss ${pastBoss.map(n => pct(n / N)).join(' / ')}  (data: 85% / 68% / 61%)`);
const DATA = { '1M': .06, '1E': .21, '1B': .25, '2M': .11, '2E': .20, '2B': .29, '3M': .08, '3E': .13, '3B': .25 };
console.log('share of max HP lost per fight (bot · data)');
for (const a of [1, 2, 3]) console.log(`  act ${a}: ` + ['M', 'E', 'B'].map(t => { const v = rec.dmg[a + t] || []; return `${t} ${v.length ? pct(mean(v)) : '-'} · ${pct(DATA[a + t])} (${v.length})`; }).join('   '));
console.log('party HP entering each boss', rec.bossHp.map(v => v.length ? pct(mean(v)) : '-').join(' / '), ' (data: 50% / 66% / 84%)');
console.log('gold on hand at each boss', rec.goldAtBoss.map(v => v.length ? Math.round(mean(v)) : '-').join(' / '), ' · relics at the end', mean(relics).toFixed(1));
const died = {}; rec.diedAt.forEach(d => { const k = `act ${d.act + 1} ${d.type}`; died[k] = (died[k] || 0) + 1; });
console.log('where runs end', Object.entries(died).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
