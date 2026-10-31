// Goblin Cup · headless matches between two goblin managers, checking that the rules never break:
// nobody off the pitch, two players never share a square, the ball always sits with its owner, the score only goes up.
//   node soccer/sim.js [matches=40] [level=normal]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(process.argv[4] || path.join(__dirname, 'index.html'), 'utf8');
const src = html.match(/<script id="cup-rules">([\s\S]*?)<\/script>/)[1];
const ctx = { module: { exports: {} }, console, Math, JSON };
vm.runInNewContext(src, ctx);
const CUP = ctx.module.exports;

const N = +(process.argv[2] || 40), LEVEL = process.argv[3] || 'normal';
let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function check(S, where) {
  const seen = new Set();
  for (const p of S.players) {
    if (!CUP.inB(p.c, p.r)) throw new Error(`${where}: ${p.name} off the pitch at ${p.c},${p.r}`);
    const k = p.c + ',' + p.r; if (seen.has(k)) throw new Error(`${where}: two players on ${k}`); seen.add(k);
    if (p.down < 0 || p.down > 1) throw new Error(`${where}: ${p.name} down ${p.down}`);
  }
  const b = S.ball;
  if (b.owner != null) { const o = S.players[b.owner]; if (o.c !== b.c || o.r !== b.r) throw new Error(`${where}: ball not with its owner`); }
  else { if (!CUP.inB(b.c, b.r)) throw new Error(`${where}: loose ball off the pitch`); if (CUP.at(S, b.c, b.r)) throw new Error(`${where}: loose ball under a player`); }
}

const tally = { home: 0, away: 0, draw: 0, goals: 0, pens: 0, so: 0, turns: 0, notes: {}, kinds: {}, ms: 0 };
for (let m = 0; m < N; m++) {
  let S = CUP.newMatch({ first: m % 2 ? 'away' : 'home' });
  check(S, 'kick-off');
  for (let guard = 0; guard < 200 && !S.over; guard++) {
    if (S.shootout) {
      const side = S.shootout.next;
      CUP.shootoutKick(S, CUP.penPick(S, 'shoot', side, LEVEL, rng), CUP.penPick(S, 'keep', CUP.other(side), LEVEL, rng));
      tally.so += S.over ? 1 : 0; continue;
    }
    const t0 = Date.now();
    const plan = { ...CUP.think(S, 'home', LEVEL, rng), ...CUP.think(S, 'away', LEVEL, rng) };
    tally.ms += Date.now() - t0; tally.turns++;
    const before = { ...S.score };
    for (const p of S.players) if (plan[p.id] && !CUP.legal(S, p, plan[p.id])) throw new Error(`illegal order for ${p.name}: ${JSON.stringify(plan[p.id])}`);
    const { S: S2, R } = CUP.resolve(S, plan);
    S = S2;
    check(S, `turn ${R.turn}`);
    if (S.score.home < before.home || S.score.away < before.away) throw new Error('score went down');
    R.notes.forEach(n => { tally.notes[n.text] = (tally.notes[n.text] || 0) + 1; });
    R.ball.forEach(b => { const k = b.k + ':' + b.res; tally.kinds[k] = (tally.kinds[k] || 0) + 1; });
    if (S.pen) { tally.pens++; const side = S.pen.side; CUP.penalty(S, CUP.penPick(S, 'shoot', side, LEVEL, rng), CUP.penPick(S, 'keep', CUP.other(side), LEVEL, rng)); check(S, 'after penalty'); }
    CUP.clock(S);
    check(S, 'clock');
  }
  if (!S.over) throw new Error('match never ended');
  tally.goals += S.score.home + S.score.away;
  const w = S.shootout ? S.shootout.winner : S.score.home > S.score.away ? 'home' : 'away';
  tally[w]++;
}
console.log(`${N} matches at ${LEVEL}: home ${tally.home}, away ${tally.away}; ${(tally.goals / N).toFixed(2)} goals a match; ${tally.pens} penalties; ${tally.so} shoot-outs; ${(tally.ms / tally.turns / 2).toFixed(0)} ms per goblin plan`);
console.log('ball:', Object.entries(tally.kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('calls:', Object.entries(tally.notes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
