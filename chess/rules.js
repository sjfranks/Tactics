// Tactics Chess: the rules. No screen code; runs in the browser (window.TC) and in Node (require).
// Every number lives in RULES. The state is plain JSON; each order changes it and returns an event.
(function (root) {
  'use strict';

  // Directions, clockwise from north. The board's y grows downward (south), so White starts at the bottom.
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const DIR_NAMES = ['north', 'east', 'south', 'west'];
  const SIDES = ['white', 'black'];

  const RULES = {
    width: 8,
    height: 8,
    setupRows: 2,           // each side places its pieces on its back two rows
    units: {
      // damage: by the side of the target that is struck. null = this piece cannot attack from there.
      pawn: {
        name: 'Pawn', hp: 10, move: 3,
        attack: { target: 7, damage: { front: null, flank: 5, behind: 10 } },
        grapple: { target: 8, fromFront: true },   // on a hit, the pawn moves the foe one square
      },
      king: {
        name: 'King', hp: 10, move: 3,
        attack: { target: 7, damage: { front: 5, flank: 5, behind: 10 } },
        grapple: null,
      },
    },
    army: { king: 1, pawn: 8 },  // the default army for each side
  };

  const other = (side) => (side === 'white' ? 'black' : 'white');
  const key = (x, y) => x + ',' + y;
  const chance2d6 = (target) => {
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= target) n++;
    return n / 36;
  };

  function fail(msg) { throw new Error(msg); }

  // ---------- state ----------

  function newGame(opts) {
    opts = opts || {};
    const army = Object.assign({}, RULES.army, opts.army || {});
    return {
      w: RULES.width, h: RULES.height,
      army,
      phase: 'setup',       // setup -> play <-> facing -> over
      ready: { white: false, black: false },
      turn: 'white',
      turnNo: 1,
      pieces: [],
      nextId: 1,
      pending: null,        // { type: 'grapple', by, target, options: [{x,y}] }
      winner: null,
    };
  }

  const piece = (s, id) => s.pieces.find((p) => p.id === id && p.hp > 0) || null;
  const pieceAt = (s, x, y) => s.pieces.find((p) => p.hp > 0 && p.x === x && p.y === y) || null;
  const alive = (s, side) => s.pieces.filter((p) => p.hp > 0 && (!side || p.side === side));
  const onBoard = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
  const unit = (p) => RULES.units[p.type];

  // ---------- setup ----------

  function setupRows(s, side) {
    const rows = [];
    for (let i = 0; i < RULES.setupRows; i++) rows.push(side === 'white' ? s.h - 1 - i : i);
    return rows;
  }
  const inSetupZone = (s, side, x, y) => onBoard(s, x, y) && setupRows(s, side).includes(y);
  const homeFacing = (side) => (side === 'white' ? 0 : 2);

  function remaining(s, side) {
    const left = {};
    for (const t in s.army) left[t] = s.army[t] - s.pieces.filter((p) => p.side === side && p.type === t).length;
    return left;
  }

  function place(s, side, type, x, y, facing) {
    if (s.phase !== 'setup') fail('not in setup');
    if (s.ready[side]) fail(side + ' has finished setting up');
    if (!RULES.units[type]) fail('no such piece: ' + type);
    if ((remaining(s, side)[type] || 0) <= 0) fail('no ' + type + ' left to place');
    if (!inSetupZone(s, side, x, y)) fail('pieces go on your back two rows');
    if (pieceAt(s, x, y)) fail('square taken');
    const p = {
      id: s.nextId++, side, type, x, y,
      facing: facing == null ? homeFacing(side) : facing,
      hp: RULES.units[type].hp, moved: false, acted: false, from: null,
    };
    s.pieces.push(p);
    return { type: 'place', piece: p.id };
  }

  function relocate(s, id, x, y) {
    const p = piece(s, id);
    if (s.phase !== 'setup' || !p || s.ready[p.side]) fail('cannot move that piece now');
    if (!inSetupZone(s, p.side, x, y)) fail('pieces go on your back two rows');
    const q = pieceAt(s, x, y);
    if (q && q !== p) { q.x = p.x; q.y = p.y; }     // swap with a piece already there
    p.x = x; p.y = y;
    return { type: 'relocate', piece: id };
  }

  function unplace(s, id) {
    const p = piece(s, id);
    if (s.phase !== 'setup' || !p || s.ready[p.side]) fail('cannot remove that piece now');
    s.pieces = s.pieces.filter((q) => q !== p);
    return { type: 'unplace', piece: id };
  }

  function clearSide(s, side) {
    if (s.phase !== 'setup' || s.ready[side]) fail('cannot clear now');
    s.pieces = s.pieces.filter((p) => p.side !== side);
  }

  // Fills the rest of a side's army in: the king in the middle of the back row, pawns in front of it.
  function autoPlace(s, side) {
    const [front, back] = side === 'white' ? [s.h - 2, s.h - 1] : [1, 0];
    const mid = Math.floor((s.w - 1) / 2);
    const order = [];   // squares, best first
    for (let d = 0; d < s.w; d++) {
      for (const x of [mid - d, mid + 1 + d]) if (x >= 0 && x < s.w) order.push(x);
    }
    const squares = [...order.map((x) => [x, front]), ...order.map((x) => [x, back])];
    const left = remaining(s, side);
    const want = [];
    for (let i = 0; i < (left.king || 0); i++) want.push('king');
    for (const t in left) if (t !== 'king') for (let i = 0; i < left[t]; i++) want.push(t);
    for (const t of want) {
      // the king hides in the back row if it can
      const pool = t === 'king' ? [...squares.slice(s.w), ...squares.slice(0, s.w)] : squares;
      const sq = pool.find(([x, y]) => !pieceAt(s, x, y));
      if (!sq) break;
      place(s, side, t, sq[0], sq[1]);
    }
  }

  function finishSetup(s, side) {
    if (s.phase !== 'setup') fail('not in setup');
    const left = remaining(s, side);
    for (const t in left) if (left[t] > 0) fail('place every piece first');
    s.ready[side] = true;
    if (s.ready.white && s.ready.black) {
      s.phase = 'play';
      s.turn = 'white';
      for (const p of s.pieces) { p.moved = false; p.acted = false; p.from = null; }
    }
    return { type: 'ready', side };
  }

  // ---------- movement ----------

  // Squares a piece can end its move on: up to `move` steps orthogonally, through friends but not foes.
  function reachable(s, id) {
    const p = piece(s, id);
    const out = new Map();
    if (!p) return out;
    out.set(key(p.x, p.y), { x: p.x, y: p.y, dist: 0, path: [] });
    if (p.moved) return out;
    const range = unit(p).move;
    const seen = new Map([[key(p.x, p.y), 0]]);
    let frontier = [{ x: p.x, y: p.y, path: [] }];
    for (let d = 1; d <= range; d++) {
      const next = [];
      for (const c of frontier) {
        for (const [dx, dy] of DIRS) {
          const x = c.x + dx, y = c.y + dy, k = key(x, y);
          if (!onBoard(s, x, y) || seen.has(k)) continue;
          const q = pieceAt(s, x, y);
          if (q && q.side !== p.side) continue;
          seen.set(k, d);
          const path = c.path.concat([[x, y]]);
          next.push({ x, y, path });
          if (!q) out.set(k, { x, y, dist: d, path });
        }
      }
      frontier = next;
    }
    return out;
  }

  function dirBetween(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 1 : 3;
    return dy > 0 ? 2 : 0;
  }

  function checkTurn(s, p) {
    if (s.phase !== 'play') fail('not the time for that');
    if (s.pending) fail('finish the grapple first');
    if (!p) fail('no such piece');
    if (p.side !== s.turn) fail('not your piece');
  }

  function move(s, id, x, y) {
    const p = piece(s, id);
    checkTurn(s, p);
    if (p.moved) fail('this piece has moved');
    const r = reachable(s, id).get(key(x, y));
    if (!r) fail('out of reach');
    if (r.dist === 0) fail('already there');
    p.from = { x: p.x, y: p.y, facing: p.facing };
    const [lx, ly] = r.path.length > 1 ? r.path[r.path.length - 2] : [p.x, p.y];
    p.x = x; p.y = y;
    p.facing = dirBetween(lx, ly, x, y);  // a moving piece faces the way it walked; set it at the end of the turn
    p.moved = true;
    return { type: 'move', piece: id, path: r.path };
  }

  // A move may be taken back until the piece acts (no dice have been rolled for it).
  function undoMove(s, id) {
    const p = piece(s, id);
    checkTurn(s, p);
    if (!p.moved || p.acted || !p.from) fail('nothing to undo');
    if (pieceAt(s, p.from.x, p.from.y)) fail('the square is taken');
    p.x = p.from.x; p.y = p.from.y; p.facing = p.from.facing;
    p.from = null; p.moved = false;
    return { type: 'undo', piece: id };
  }

  // ---------- attacks ----------

  // Which side of `target` an attacker standing at (ax, ay) strikes: front, flank or behind. null if not adjacent.
  function sideStruck(target, ax, ay) {
    const dx = ax - target.x, dy = ay - target.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
    const d = DIRS.findIndex(([x, y]) => x === dx && y === dy);
    if (d === target.facing) return 'front';
    if (d === (target.facing + 2) % 4) return 'behind';
    return 'flank';
  }

  // What `kind` ('attack' | 'grapple') by piece `id` on `targetId` from (ax, ay) would be. Null if it cannot happen.
  function actionInfo(s, id, targetId, kind, ax, ay) {
    const p = piece(s, id), t = piece(s, targetId);
    if (!p || !t || p.side === t.side) return null;
    if (ax == null) { ax = p.x; ay = p.y; }
    const angle = sideStruck(t, ax, ay);
    if (!angle) return null;
    const u = unit(p);
    if (kind === 'attack') {
      const dmg = u.attack.damage[angle];
      if (dmg == null) return null;
      return { kind, angle, target: u.attack.target, damage: dmg, chance: chance2d6(u.attack.target) };
    }
    if (kind === 'grapple') {
      if (!u.grapple || (angle === 'front' && !u.grapple.fromFront)) return null;
      return { kind, angle, target: u.grapple.target, damage: 0, chance: chance2d6(u.grapple.target) };
    }
    return null;
  }

  // The best square to strike `targetId` from with `kind`, among the squares the piece can still reach.
  function bestApproach(s, id, targetId, kind) {
    const p = piece(s, id);
    if (!p || p.acted) return null;
    let best = null;
    for (const r of reachable(s, id).values()) {
      const info = actionInfo(s, id, targetId, kind, r.x, r.y);
      if (!info) continue;
      const score = info.chance * (info.damage || 1) * 100 - r.dist;
      if (!best || score > best.score) best = { x: r.x, y: r.y, dist: r.dist, info, score };
    }
    return best;
  }

  function roll2d6(rng) {
    rng = rng || Math.random;
    return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
  }

  function checkAction(s, id, targetId, kind) {
    const p = piece(s, id);
    checkTurn(s, p);
    if (p.acted) fail('this piece has acted');
    const info = actionInfo(s, id, targetId, kind);
    if (!info) fail(kind === 'attack' && unit(p).attack.damage.front == null
      ? 'a ' + unit(p).name.toLowerCase() + ' cannot attack a foe that faces it'
      : 'cannot ' + kind + ' that');
    return { p, t: piece(s, targetId), info };
  }

  function attack(s, id, targetId, rng) {
    const { p, t, info } = checkAction(s, id, targetId, 'attack');
    const dice = roll2d6(rng);
    const total = dice[0] + dice[1];
    const hit = total >= info.target;
    p.acted = true; p.moved = true; p.from = null;
    const ev = { type: 'attack', piece: id, target: targetId, angle: info.angle, need: info.target, dice, total, hit, damage: 0, killed: false };
    if (hit) {
      ev.damage = info.damage;
      t.hp = Math.max(0, t.hp - info.damage);
      ev.killed = t.hp === 0;
    }
    ev.winner = checkWinner(s);
    return ev;
  }

  // Square the grappled foe may be put on: next to it, orthogonally, and empty.
  function grappleSquares(s, t) {
    return DIRS.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy }))
      .filter((c) => onBoard(s, c.x, c.y) && !pieceAt(s, c.x, c.y));
  }

  function grapple(s, id, targetId, rng) {
    const { p, t, info } = checkAction(s, id, targetId, 'grapple');
    const dice = roll2d6(rng);
    const total = dice[0] + dice[1];
    const hit = total >= info.target;
    p.acted = true; p.moved = true; p.from = null;
    const ev = { type: 'grapple', piece: id, target: targetId, angle: info.angle, need: info.target, dice, total, hit, options: [] };
    if (hit) {
      ev.options = grappleSquares(s, t);
      if (ev.options.length) s.pending = { type: 'grapple', by: id, target: targetId, options: ev.options };
    }
    return ev;
  }

  // Puts the grappled foe on (x, y), or leaves it where it is if x is null.
  function resolveGrapple(s, x, y) {
    const g = s.pending;
    if (!g || g.type !== 'grapple') fail('no grapple to finish');
    const t = piece(s, g.target);
    s.pending = null;
    if (x == null || !t) return { type: 'shove', target: g.target, moved: false };
    if (!g.options.some((c) => c.x === x && c.y === y)) { s.pending = g; fail('cannot put it there'); }
    const from = { x: t.x, y: t.y };
    t.x = x; t.y = y;
    return { type: 'shove', target: g.target, moved: true, from, to: { x, y } };
  }

  function wait(s, id) {
    const p = piece(s, id);
    checkTurn(s, p);
    p.acted = true; p.moved = true; p.from = null;
    return { type: 'wait', piece: id };
  }

  // ---------- turns and facing ----------

  function endTurn(s) {
    if (s.phase !== 'play') fail('not the time for that');
    if (s.pending) fail('finish the grapple first');
    s.phase = 'facing';
    for (const p of alive(s, s.turn)) p.from = null;
    return { type: 'facing', side: s.turn };
  }

  function setFacing(s, id, dir) {
    const p = piece(s, id);
    if (!p) fail('no such piece');
    if (!(dir >= 0 && dir < 4)) fail('bad direction');
    const ok = (s.phase === 'setup' && !s.ready[p.side]) || (s.phase === 'facing' && p.side === s.turn);
    if (!ok) fail('facing is set at the end of your turn');
    p.facing = dir;
    return { type: 'face', piece: id, facing: dir };
  }

  function confirmFacing(s) {
    if (s.phase !== 'facing') fail('not the time for that');
    s.turn = other(s.turn);
    if (s.turn === 'white') s.turnNo++;
    s.phase = 'play';
    for (const p of alive(s, s.turn)) { p.moved = false; p.acted = false; p.from = null; }
    return { type: 'turn', side: s.turn, turnNo: s.turnNo };
  }

  // A side loses when its king falls, or, with no king, when every piece has fallen.
  function lost(s, side) {
    const hadKing = s.pieces.some((p) => p.side === side && p.type === 'king');
    if (hadKing) return !alive(s, side).some((p) => p.type === 'king');
    return alive(s, side).length === 0;
  }

  function checkWinner(s) {
    for (const side of SIDES) {
      if (lost(s, side)) {
        s.winner = other(side);
        s.phase = 'over';
        s.pending = null;
        return s.winner;
      }
    }
    return null;
  }

  // ---------- the computer player ----------

  // Squares from which a foe could strike piece `p` standing at (x, y) facing `facing` next turn, roughly.
  function danger(s, p, x, y, facing) {
    const self = { x, y, facing };
    const threats = [];
    for (const e of alive(s, other(p.side))) {
      const dist = Math.abs(e.x - x) + Math.abs(e.y - y);
      if (dist > unit(e).move + 1) continue;
      const ue = unit(e);
      let worst = 0;
      for (let d = 0; d < 4; d++) {
        const ax = x + DIRS[d][0], ay = y + DIRS[d][1];
        if (!onBoard(s, ax, ay)) continue;
        const q = pieceAt(s, ax, ay);
        if (q && q !== p && q !== e) continue;
        if (Math.abs(e.x - ax) + Math.abs(e.y - ay) > ue.move) continue;
        const dmg = ue.attack.damage[sideStruck(self, ax, ay)];
        if (dmg != null) worst = Math.max(worst, chance2d6(ue.attack.target) * Math.min(dmg, p.hp));
      }
      threats.push(worst);
    }
    // a piece can only turn its face one way: the worst threat counts in full, the rest a little
    threats.sort((a, b) => b - a);
    return threats.reduce((sum, t, i) => sum + (i === 0 ? t : t * 0.35), 0);
  }

  function nearestFoe(s, p, x, y) {
    let best = null, bd = Infinity;
    for (const e of alive(s, other(p.side))) {
      const d = Math.abs(e.x - x) + Math.abs(e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function facingToward(s, p, x, y) {
    const e = nearestFoe(s, p, x, y);
    return e ? dirBetween(x, y, e.x, e.y) : p.facing;
  }

  // The best thing piece p can do this turn: { id, x, y, action, target, score }.
  function planFor(s, p) {
    const isKing = p.type === 'king';
    const foesKing = alive(s, other(p.side)).find((e) => e.type === 'king');
    let best = null;
    for (const r of reachable(s, p.id).values()) {
      const face = facingToward(s, p, r.x, r.y);
      const risk = danger(s, p, r.x, r.y, face) * (isKing ? 6 : 1);
      // pawns head for the back of the foe's king (or of the nearest foe)
      const goal = foesKing || nearestFoe(s, p, r.x, r.y);
      let approach = 0;
      if (goal && !isKing) {
        const bx = goal.x - DIRS[goal.facing][0], by = goal.y - DIRS[goal.facing][1];
        approach = -0.8 * (Math.abs(bx - r.x) + Math.abs(by - r.y)) - 0.4 * (Math.abs(goal.x - r.x) + Math.abs(goal.y - r.y));
      }
      // a little more daring every turn, so two careful sides do not wait each other out
      const daring = 1 + Math.min(2, s.turnNo / 10);
      const base = approach * daring - risk * 0.6 - r.dist * 0.01;
      const consider = (action, target, gain) => {
        const score = base + gain;
        if (!best || score > best.score) best = { id: p.id, x: r.x, y: r.y, action, target, score };
      };
      consider('wait', null, 0);
      if (p.acted) continue;
      for (const e of alive(s, other(p.side))) {
        const info = actionInfo(s, p.id, e.id, 'attack', r.x, r.y);
        if (!info) continue;
        let gain = info.chance * info.damage * 1.5;
        if (info.damage >= e.hp) gain += info.chance * (e.type === 'king' ? 1000 : 10);
        consider('attack', e.id, gain);
      }
    }
    return best;
  }

  // The computer's next order for the side whose turn it is, or null when it has nothing left to do.
  function aiNext(s) {
    if (s.phase === 'facing') {
      for (const p of alive(s, s.turn)) {
        const f = facingToward(s, p, p.x, p.y);
        if (f !== p.facing) return { type: 'face', id: p.id, dir: f };
      }
      return { type: 'confirm' };
    }
    if (s.phase !== 'play') return null;
    if (s.pending) {
      // shove the foe somewhere that turns its back to us, or simply away
      const g = s.pending, t = piece(s, g.target);
      return { type: 'shove', x: g.options[0].x, y: g.options[0].y, target: t && t.id };
    }
    let best = null;
    for (const p of alive(s, s.turn)) {
      if (p.acted) continue;
      const plan = planFor(s, p);
      if (plan && (!best || plan.score > best.score)) best = plan;
    }
    if (!best) return { type: 'end' };
    const p = piece(s, best.id);
    if ((best.x !== p.x || best.y !== p.y) && !p.moved) return { type: 'move', id: p.id, x: best.x, y: best.y };
    if (best.action === 'attack') return { type: 'attack', id: p.id, target: best.target };
    return { type: 'wait', id: p.id };
  }

  // Applies one aiNext order. Returns the event.
  function apply(s, o, rng) {
    switch (o.type) {
      case 'move': return move(s, o.id, o.x, o.y);
      case 'attack': return attack(s, o.id, o.target, rng);
      case 'grapple': return grapple(s, o.id, o.target, rng);
      case 'shove': return resolveGrapple(s, o.x, o.y);
      case 'wait': return wait(s, o.id);
      case 'end': return endTurn(s);
      case 'face': return setFacing(s, o.id, o.dir);
      case 'confirm': return confirmFacing(s);
      default: fail('unknown order ' + o.type);
    }
  }

  const TC = {
    RULES, DIRS, DIR_NAMES, SIDES, other, chance2d6,
    newGame, piece, pieceAt, alive, unit, onBoard,
    setupRows, inSetupZone, remaining, place, relocate, unplace, clearSide, autoPlace, finishSetup,
    reachable, move, undoMove, sideStruck, actionInfo, bestApproach, attack, grapple, grappleSquares, resolveGrapple, wait,
    endTurn, setFacing, confirmFacing, checkWinner, aiNext, apply,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TC;
  else root.TC = TC;
})(typeof window !== 'undefined' ? window : globalThis);
