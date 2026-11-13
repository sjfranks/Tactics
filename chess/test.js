// Rule tests for Tactics Chess: node chess/test.js
'use strict';
const assert = require('assert');
const TC = require('./rules.js');

// dice that come up as given: fixed(3, 4) rolls a 3 and a 4
const fixed = (...rolls) => { const r = rolls.map((n) => (n - 0.5) / 6); let i = 0; return () => r[i++ % r.length]; };
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL: ' + name); throw e; } }

// A game in play with the given pieces: [side, type, x, y, facing]; ids count from 1 in order.
function game(list, turn = 'white') {
  const s = TC.newGame({ army: {} });
  s.phase = 'play'; s.step = 'move'; s.turn = turn;
  s.ready = { white: true, black: true };
  for (const [side, type, x, y, facing] of list) {
    s.pieces.push({ id: s.nextId++, side, type, x, y, facing, hp: TC.RULES.units[type].hp, moved: false, acted: false, from: null, movedDist: 0, pinned: false });
  }
  return s;
}
const P = (s, id) => TC.piece(s, id);

test('setup: back two rows, chess order', () => {
  const s = TC.newGame();
  assert.throws(() => TC.place(s, 'white', 'pawn', 0, 5));
  TC.autoPlace(s, 'white'); TC.autoPlace(s, 'black');
  const at = (x, y) => TC.pieceAt(s, x, y).type;
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7].map((x) => at(x, 7)), ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']);
  assert.ok([0, 1, 2, 3, 4, 5, 6, 7].every((x) => at(x, 6) === 'pawn' && at(x, 1) === 'pawn'));
  TC.finishSetup(s, 'white'); TC.finishSetup(s, 'black');
  assert.strictEqual(s.phase, 'play');
});

test('phases: move, then act from where you stand, then face', () => {
  const s = game([['white', 'pawn', 3, 6, 0], ['white', 'pawn', 5, 6, 0], ['black', 'pawn', 0, 0, 2]]);
  assert.throws(() => TC.act(s, 1, 'attack', 3), /cannot attack/);
  TC.move(s, 1, 3, 4);
  assert.strictEqual(s.step, 'action');
  assert.throws(() => TC.move(s, 1, 3, 3), /move phase is over/);
  assert.throws(() => TC.move(s, 2, 5, 5), /one piece a turn/);
  TC.undoMove(s, 1);
  assert.strictEqual(s.step, 'move');
  TC.stay(s, 2);
  assert.throws(() => TC.move(s, 2, 5, 5), /move phase is over/);
  TC.wait(s, 2);
  TC.endTurn(s);
  assert.throws(() => TC.setFacing(s, 1, 1), /only the piece/);
  TC.setFacing(s, 2, 1); TC.confirmFacing(s);
  assert.strictEqual(s.turn, 'black');
  assert.strictEqual(s.step, 'move');
});

test('pawn: no attack on a melee foe that faces it, but yes on a ranged one; double to the back', () => {
  const s = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'bishop', 0, 0, 2]]);
  assert.throws(() => TC.act(s, 1, 'attack', 2, fixed(6, 6)), /faces it/);
  const s2 = game([['white', 'pawn', 4, 5, 0], ['black', 'bishop', 4, 4, 2], ['black', 'pawn', 0, 0, 2]]);
  assert.strictEqual(TC.act(s2, 1, 'attack', 2, fixed(3, 4)).damage, 5);
  const s3 = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 0], ['black', 'pawn', 0, 0, 2]]);
  const ev = TC.act(s3, 1, 'attack', 2, fixed(3, 4));
  assert.ok(ev.hit && ev.angle === 'behind' && ev.damage === 10 && ev.killed);
});

test('rook shield, pawn cover, king inspires', () => {
  const s = game([['white', 'king', 3, 5, 0], ['white', 'pawn', 4, 5, 0], ['black', 'rook', 4, 4, 2], ['black', 'pawn', 0, 0, 2]]);
  const i = TC.strikeInfo(s, P(s, 2), P(s, 3), 'attack');
  assert.strictEqual(i, null);                         // a pawn may not hit the rook's front at all
  const s2 = game([['white', 'king', 3, 5, 0], ['white', 'knight', 4, 5, 0], ['black', 'rook', 4, 4, 2], ['black', 'pawn', 0, 0, 2]]);
  assert.strictEqual(TC.strikeInfo(s2, P(s2, 2), P(s2, 3), 'attack').need, 7 + 2 - 1);  // shield +2, inspired -1
  // a black pawn at 4,2 faces south; the black bishop right behind it at 4,1 is in cover
  const s3 = game([['white', 'bishop', 0, 1, 0], ['black', 'pawn', 4, 2, 2], ['black', 'bishop', 4, 1, 2], ['black', 'king', 0, 7, 2]]);
  assert.ok(TC.inCover(s3, P(s3, 3)));
  assert.strictEqual(TC.strikeInfo(s3, P(s3, 1), P(s3, 3), 'shoot').need, 7 + 2);   // along the rank at the bishop in cover
  P(s3, 1).x = 4; P(s3, 1).y = 5;
  assert.strictEqual(TC.strikeInfo(s3, P(s3, 1), P(s3, 3), 'shoot'), null);         // straight down the file, the pawn blocks
});

test('bishop: shoots 4 along ranks and files (never diagonally), over friends, blocked by foes; pin roots for a turn', () => {
  const s = game([['white', 'bishop', 0, 7, 0], ['white', 'pawn', 0, 6, 0], ['black', 'pawn', 3, 4, 2], ['black', 'pawn', 0, 2, 2], ['black', 'pawn', 0, 4, 2], ['black', 'king', 7, 0, 2], ['black', 'pawn', 3, 7, 3]]);
  const ids = TC.targetsFor(s, 1, 'shoot').map((t) => t.target).sort();
  assert.deepStrictEqual(ids, [5, 7]);          // up the file over the friend, and along the rank; not 3,4 on the diagonal; 0,2 is behind 0,4
  assert.strictEqual(TC.strikeInfo(s, P(s, 1), P(s, 3), 'shoot'), null);
  const ev = TC.act(s, 1, 'pin', 5, fixed(4, 4));
  assert.ok(ev.pinned && P(s, 5).pinned);
  TC.endTurn(s); TC.confirmFacing(s);
  assert.throws(() => TC.move(s, 5, 1, 4), /pinned/);
  TC.stay(s, 5); TC.wait(s, 5); TC.endTurn(s); TC.confirmFacing(s);
  assert.ok(!P(s, 5).pinned);
});

test('push: 8+ alone; sure and up to 2 with an ally behind; the pawn steps in', () => {
  const s = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'king', 0, 0, 2]]);
  let ev = TC.act(s, 1, 'push', 2, fixed(3, 4));
  assert.ok(!ev.hit && P(s, 2).y === 4);
  const s2 = game([['white', 'pawn', 4, 5, 0], ['white', 'pawn', 4, 6, 0], ['black', 'pawn', 4, 4, 2], ['black', 'king', 0, 0, 2]]);
  ev = TC.act(s2, 1, 'push', 3);
  assert.ok(ev.auto && ev.steps === 2);
  assert.deepStrictEqual([P(s2, 3).y, P(s2, 1).y], [2, 3]);
  const s3 = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'pawn', 4, 3, 2], ['black', 'king', 0, 0, 2]]);
  assert.strictEqual(TC.strikeInfo(s3, P(s3, 1), P(s3, 2), 'push'), null);   // nowhere to go
});

test('attack of opportunity: leaving the three squares in front of a pawn', () => {
  // black pawn at 4,3 faces south: its zone is 3,4 4,4 5,4. A white knight at 5,4 rides away.
  const s = game([['white', 'knight', 5, 4, 0], ['black', 'pawn', 4, 3, 2], ['black', 'king', 0, 0, 2]]);
  const r = TC.reachable(s, 1).get('7,4');
  assert.deepStrictEqual(TC.reactionsFor(s, P(s, 1), r.path).map((x) => [x.at, x.reactor, x.kind]), [[-1, 2, 'opportunity']]);
  const ev = TC.move(s, 1, 7, 4, fixed(4, 4));
  assert.strictEqual(ev.reactions.length, 1);
  assert.strictEqual(ev.reactions[0].ev.damage, 5);      // base damage, no double
  assert.strictEqual(P(s, 1).hp, 5);
  assert.throws(() => TC.undoMove(s, 1), /cannot be taken back/);
  // moving within the zone, or into it, draws nothing
  const s2 = game([['white', 'knight', 5, 6, 0], ['black', 'pawn', 4, 3, 2], ['black', 'king', 0, 0, 2]]);
  assert.strictEqual(TC.reactionsFor(s2, P(s2, 1), TC.reachable(s2, 1).get('5,4').path).length, 0);
});

test('overwatch: stepping into the lane ahead of a bishop draws a shot, once a turn', () => {
  // black bishop at 4,0 faces south: it watches the file below it
  const s = game([['white', 'pawn', 6, 4, 0], ['black', 'bishop', 4, 0, 2], ['black', 'king', 0, 0, 2]]);
  const r = TC.reachable(s, 1).get('4,4');
  const re = TC.reactionsFor(s, P(s, 1), r.path);
  assert.strictEqual(re.length, 1); assert.strictEqual(re[0].kind, 'overwatch');
  const ev = TC.move(s, 1, 4, 4, fixed(6, 6));
  assert.ok(ev.reactions[0].ev.hit && P(s, 1).hp === 6);
  assert.deepStrictEqual(s.spent, [2]);
  // the diagonals ahead are not watched
  const s2 = game([['white', 'pawn', 7, 4, 0], ['black', 'bishop', 4, 0, 2], ['black', 'king', 0, 0, 2]]);
  assert.strictEqual(TC.reactionsFor(s2, P(s2, 1), TC.reachable(s2, 1).get('7,3').path).length, 0);   // 7,3 lies on its diagonal
});

test('a free attack that kills stops the move where it fell', () => {
  const s = game([['white', 'king', 5, 4, 0], ['black', 'pawn', 4, 3, 2], ['black', 'king', 0, 0, 2]]);
  P(s, 1).hp = 3;
  const ev = TC.move(s, 1, 7, 4, fixed(5, 5));
  assert.ok(ev.died && ev.winner === 'black');
});

test('knight leaps and charges; queen strikes diagonally and sweeps; king rallies', () => {
  const s = game([['white', 'knight', 0, 7, 0], ['white', 'pawn', 0, 6, 0], ['black', 'pawn', 0, 5, 2], ['black', 'pawn', 1, 2, 2], ['black', 'king', 7, 0, 2]]);
  assert.ok(TC.reachable(s, 1).has('0,4'));           // over a friend and a foe
  TC.move(s, 1, 0, 2, fixed(1, 1));                   // 5 squares, past two pawns whose free attacks miss
  const i = TC.strikeInfo(s, P(s, 1), P(s, 4), 'attack');
  assert.strictEqual(i.damage, 6 + 2);                // flank, with the charge
  const q = game([['white', 'queen', 4, 4, 0], ['black', 'pawn', 5, 3, 2], ['black', 'pawn', 3, 5, 0], ['black', 'king', 0, 0, 2]]);
  assert.ok(TC.strikeInfo(q, P(q, 1), P(q, 2), 'attack'));
  const ev = TC.act(q, 1, 'sweep', null, fixed(4, 4));
  assert.strictEqual(ev.strikes.length, 2);
  const k = game([['white', 'king', 4, 6, 0], ['white', 'pawn', 5, 5, 0], ['white', 'rook', 4, 4, 0], ['black', 'king', 0, 0, 2]]);
  P(k, 2).hp = 5; P(k, 3).pinned = true;
  const r = TC.act(k, 1, 'rally');
  assert.strictEqual(P(k, 2).hp, 7); assert.ok(!P(k, 3).pinned && r.unpinned.length === 1);
});

test('grapple: 8+, then the foe moves one empty square', () => {
  const s = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'pawn', 5, 4, 2], ['black', 'king', 0, 0, 2]]);
  const ev = TC.act(s, 1, 'grapple', 2, fixed(4, 4));
  assert.ok(ev.hit);
  assert.throws(() => TC.endTurn(s));
  TC.resolveGrapple(s, 3, 4);
  assert.deepStrictEqual([P(s, 2).x, P(s, 2).y], [3, 4]);
});

// Computer against computer: no broken rules, and every game ends.
const seedRng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const wins = { white: 0, black: 0, unfinished: 0 };
let turns = 0;
for (let g = 0; g < 40; g++) {
  const rng = seedRng(g + 1);
  const army = g % 4 === 3 ? TC.RULES.armies.skirmish : TC.RULES.armies.full;
  const s = TC.newGame({ army });
  TC.autoPlace(s, 'white'); TC.finishSetup(s, 'white');
  TC.autoPlace(s, 'black'); TC.finishSetup(s, 'black');
  let steps = 0;
  while (s.phase !== 'over' && s.turnNo < 300 && steps++ < 50000) {
    TC.apply(s, TC.aiNext(s), rng);
    const seen = new Set();
    for (const p of TC.alive(s)) {
      const k = p.x + ',' + p.y;
      assert.ok(TC.onBoard(s, p.x, p.y), 'off board');
      assert.ok(!seen.has(k), 'stacked pieces');
      assert.ok(p.hp > 0 && p.hp <= TC.unit(p).hp);
      seen.add(k);
    }
  }
  turns += s.turnNo;
  if (s.phase === 'over') wins[s.winner]++; else wins.unfinished++;
}
passed++;
console.log(passed + ' tests passed. Computer v computer, 40 games:', wins, 'average turns', Math.round(turns / 40));
