// Rule tests for Tactics Chess: node chess/test.js
'use strict';
const assert = require('assert');
const TC = require('./rules.js');

const fixed = (...rolls) => { const r = rolls.map((n) => (n - 0.5) / 6); let i = 0; return () => r[i++]; };
let passed = 0;
function test(name, fn) { fn(); passed++; }

// A game in play with the given pieces: [side, type, x, y, facing]
function game(list, army) {
  const s = TC.newGame({ army: army || { king: 0, pawn: 0 } });
  s.phase = 'play';
  s.ready = { white: true, black: true };
  for (const [side, type, x, y, facing] of list) {
    s.pieces.push({ id: s.nextId++, side, type, x, y, facing, hp: TC.RULES.units[type].hp, moved: false, acted: false, from: null });
  }
  return s;
}

test('setup: back two rows only, every piece placed before Done', () => {
  const s = TC.newGame();
  assert.throws(() => TC.place(s, 'white', 'pawn', 0, 5));
  TC.place(s, 'white', 'pawn', 0, 6);
  assert.throws(() => TC.place(s, 'white', 'pawn', 0, 6));
  assert.throws(() => TC.finishSetup(s, 'white'));
  TC.autoPlace(s, 'white');
  assert.deepStrictEqual(TC.remaining(s, 'white'), { king: 0, pawn: 0 });
  assert.strictEqual(TC.alive(s, 'white').find((p) => p.type === 'king').y, 7);
  TC.finishSetup(s, 'white');
  assert.strictEqual(s.phase, 'setup');
  TC.autoPlace(s, 'black');
  for (const p of TC.alive(s, 'black')) assert.ok(p.y <= 1 && p.facing === 2);
  TC.finishSetup(s, 'black');
  assert.strictEqual(s.phase, 'play');
});

test('movement: 3 squares orthogonally, through friends, not through foes', () => {
  const s = game([['white', 'pawn', 3, 5, 0], ['white', 'pawn', 3, 4, 0], ['black', 'pawn', 4, 5, 2]]);
  const r = TC.reachable(s, 1);
  assert.ok(r.has('3,2'));            // through the friend at 3,4
  assert.ok(!r.has('3,4'));           // but not onto it
  assert.ok(!r.has('4,5'));           // not onto a foe
  assert.ok(!r.has('5,5'));           // the foe blocks the straight way, the way round is 4 steps
  assert.ok(!r.has('4,3') === false); // 3,4 -> 4,4 -> 4,3 is fine
  assert.ok(!r.has('2,3') === false);
  assert.ok(!r.has('3,1'));           // 4 squares away
  TC.move(s, 1, 2, 4);
  assert.throws(() => TC.move(s, 1, 2, 3));
  TC.undoMove(s, 1);
  assert.deepStrictEqual([TC.piece(s, 1).x, TC.piece(s, 1).y, TC.piece(s, 1).facing], [3, 5, 0]);
});

test('sides struck', () => {
  const t = { x: 4, y: 4, facing: 0 }; // facing north
  assert.strictEqual(TC.sideStruck(t, 4, 3), 'front');
  assert.strictEqual(TC.sideStruck(t, 4, 5), 'behind');
  assert.strictEqual(TC.sideStruck(t, 3, 4), 'flank');
  assert.strictEqual(TC.sideStruck(t, 5, 4), 'flank');
  assert.strictEqual(TC.sideStruck(t, 5, 5), null);
});

test('pawn: no attack on a foe that faces it; 5 from the flank, 10 from behind, on 7+', () => {
  // black pawn at 4,4 facing south (toward 4,5)
  const s = game([['white', 'pawn', 4, 5, 0], ['white', 'pawn', 3, 4, 1], ['white', 'pawn', 4, 3, 2], ['black', 'pawn', 4, 4, 2]]);
  assert.throws(() => TC.attack(s, 1, 4, fixed(6, 6)), /faces it/);
  let ev = TC.attack(s, 2, 4, fixed(3, 3));      // 6: miss
  assert.ok(!ev.hit && ev.angle === 'flank' && TC.piece(s, 4).hp === 10);
  assert.throws(() => TC.attack(s, 2, 4, fixed(6, 6)), /acted/);
  ev = TC.attack(s, 3, 4, fixed(3, 4));          // 7 from behind: hit for 10, dead
  assert.ok(ev.hit && ev.angle === 'behind' && ev.damage === 10 && ev.killed);
  assert.strictEqual(ev.winner, 'white');        // black had no king: wiping it out wins
  assert.strictEqual(s.phase, 'over');
});

test('flank hit does 5', () => {
  const s = game([['white', 'pawn', 3, 4, 1], ['black', 'pawn', 4, 4, 2], ['black', 'pawn', 0, 0, 2]]);
  const ev = TC.attack(s, 1, 2, fixed(6, 1));
  assert.ok(ev.hit && ev.damage === 5);
  assert.strictEqual(TC.piece(s, 2).hp, 5);
  assert.strictEqual(s.winner, null);
});

test('king strikes a foe that faces it', () => {
  const s = game([['white', 'king', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'pawn', 0, 0, 2]]);
  const ev = TC.attack(s, 1, 2, fixed(4, 4));
  assert.ok(ev.hit && ev.angle === 'front' && ev.damage === 5);
  assert.ok(!TC.RULES.units.king.grapple);
});

test('killing the king wins even with pawns left', () => {
  const s = game([['white', 'pawn', 4, 5, 0], ['black', 'king', 4, 4, 0], ['black', 'pawn', 0, 0, 2]]);
  const ev = TC.attack(s, 1, 2, fixed(5, 5));
  assert.ok(ev.killed && ev.winner === 'white');
});

test('grapple: 8+, then the foe moves one empty square orthogonally', () => {
  const s = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'pawn', 5, 4, 2]]);
  let ev = TC.grapple(s, 1, 2, fixed(3, 4)); // 7: fails
  assert.ok(!ev.hit && !s.pending);
  const s2 = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 4, 4, 2], ['black', 'pawn', 5, 4, 2]]);
  ev = TC.grapple(s2, 1, 2, fixed(4, 4));
  assert.ok(ev.hit);
  assert.deepStrictEqual(ev.options.map((c) => c.x + ',' + c.y).sort(), ['3,4', '4,3']);
  assert.throws(() => TC.endTurn(s2));
  assert.throws(() => TC.resolveGrapple(s2, 5, 4));
  TC.resolveGrapple(s2, 3, 4);
  assert.deepStrictEqual([TC.piece(s2, 2).x, TC.piece(s2, 2).y], [3, 4]);
  assert.strictEqual(TC.piece(s2, 2).hp, 10);
});

test('facing is set at the end of the turn, then the other side plays', () => {
  const s = game([['white', 'pawn', 4, 5, 0], ['black', 'pawn', 0, 0, 2]]);
  assert.throws(() => TC.setFacing(s, 1, 1));
  TC.move(s, 1, 4, 2);
  TC.endTurn(s);
  assert.throws(() => TC.move(s, 1, 4, 3));
  assert.throws(() => TC.setFacing(s, 2, 1));
  TC.setFacing(s, 1, 3);
  TC.confirmFacing(s);
  assert.strictEqual(s.turn, 'black');
  assert.strictEqual(TC.piece(s, 1).facing, 3);
  assert.ok(!TC.piece(s, 2).moved);
});

test('bestApproach picks the back', () => {
  const s = game([['white', 'pawn', 4, 7, 0], ['black', 'pawn', 4, 5, 0], ['black', 'pawn', 0, 0, 2]]);
  const b = TC.bestApproach(s, 1, 2, 'attack');
  assert.deepStrictEqual([b.x, b.y, b.info.angle], [4, 6, 'behind']);
});

// Computer against computer: no broken rules, and every game ends.
const seedRng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const wins = { white: 0, black: 0, unfinished: 0 };
for (let g = 0; g < 60; g++) {
  const rng = seedRng(g + 1);
  const army = g % 3 === 2 ? { king: 0, pawn: 6 } : { king: 1, pawn: 8 };
  const s = TC.newGame({ army });
  TC.autoPlace(s, 'white'); TC.finishSetup(s, 'white');
  TC.autoPlace(s, 'black'); TC.finishSetup(s, 'black');
  let steps = 0;
  while (s.phase !== 'over' && s.turnNo < 80 && steps++ < 20000) {
    const o = TC.aiNext(s);
    TC.apply(s, o, rng);
    const seen = new Set();
    for (const p of TC.alive(s)) {
      const k = p.x + ',' + p.y;
      assert.ok(TC.onBoard(s, p.x, p.y), 'off board');
      assert.ok(!seen.has(k), 'stacked pieces');
      assert.ok(p.hp > 0 && p.hp <= 10);
      seen.add(k);
    }
  }
  if (s.phase === 'over') wins[s.winner]++; else wins.unfinished++;
}
passed++;
console.log(passed + ' tests passed. Computer v computer, 60 games:', wins);
