// Tactics Chess: the rules. No screen code; runs in the browser (window.TC) and in Node (require).
// Every number lives in RULES. The state is plain JSON; each order changes it and returns an event.
(function (root) {
  'use strict';

  // Directions, clockwise from north. The board's y grows downward (south), so White starts at the bottom.
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const DIAGS = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
  const ALL8 = [...DIRS, ...DIAGS];
  const DIR_NAMES = ['north', 'east', 'south', 'west'];
  const SIDES = ['white', 'black'];

  const RULES = {
    width: 8,
    height: 8,
    setupRows: 2,          // each side places its pieces on its back two rows
    behindTimes: 2,        // a blow to the back does double damage
    coverBonus: 2,         // shots at a piece in cover need this much more
    shieldBonus: 2,        // blows to a rook's front need this much more
    inspireBonus: 1,       // a piece next to its own king needs this much less
    chargeBonus: 2,        // a knight that moved chargeDist squares or more this turn hits this much harder
    chargeDist: 3,
    reactionTimes: 1,      // free attacks (opportunity, overwatch) deal base damage: no double for the back
    units: {
      // move.kind: walk (orthogonal, through friends), leap (orthogonal, over anything), line (straight, orthogonal),
      // line8 (straight, any of 8 ways). attack.front: true, false, or 'ranged' (only foes that are ranged).
      pawn: {
        name: 'Pawn', role: 'Defender', hp: 10, move: { kind: 'walk', n: 3 },
        attack: { need: 7, dmg: 5, front: 'ranged' },
        zoc: 'opportunity',   // a foe leaving the three squares in front of it gets a free attack
        cover: true,          // an ally standing right behind it has cover
        actions: ['attack', 'push', 'grapple'],
        text: 'Front-line infantry. Holds a line, shelters the piece behind it and punishes foes who slip past.',
      },
      rook: {
        name: 'Rook', role: 'Defender', hp: 14, move: { kind: 'line', n: 4 },
        attack: { need: 7, dmg: 5, front: true },
        zoc: 'opportunity', shield: true,
        actions: ['attack'],
        text: 'A walking tower behind a great shield. Moves straight, is hard to hurt from the front.',
      },
      bishop: {
        name: 'Bishop', role: 'Controller', hp: 8, move: { kind: 'walk', n: 3 }, ranged: true,
        shoot: { need: 7, dmg: 4, range: 4, diagonal: false },   // along ranks and files only
        zoc: 'overwatch',     // a foe stepping into its three lines of fire ahead gets shot
        actions: ['shoot', 'pin'],
        text: 'An archer. Shoots 4 squares along a rank or file, over friends, and holds the lane ahead of it.',
      },
      knight: {
        name: 'Knight', role: 'Striker', hp: 10, move: { kind: 'leap', n: 5 },
        attack: { need: 7, dmg: 6, front: true }, charge: true,
        actions: ['attack'],
        text: 'Mounted and fast. Leaps over anything and hits harder after a long ride.',
      },
      queen: {
        name: 'Queen', role: 'Striker', hp: 12, move: { kind: 'line8', n: 4 },
        attack: { need: 7, dmg: 6, front: true }, reach8: true,
        actions: ['attack', 'sweep'],
        text: 'A blademaster. Moves straight any way, strikes all eight squares round her.',
      },
      king: {
        name: 'King', role: 'Leader', hp: 12, move: { kind: 'walk', n: 3 },
        attack: { need: 7, dmg: 5, front: true }, inspire: true,
        actions: ['attack', 'rally'],
        text: 'Lose him and lose the battle. Allies beside him fight better.',
      },
    },
    actions: {
      attack: { name: 'Attack', text: 'Strike a foe next to you. Double damage to the back.' },
      shoot: { name: 'Shoot', text: 'Shoot the first foe along a rank or file, up to 4 squares, over friends. Not diagonally.' },
      push: { name: 'Push', need: 8, text: 'Shove the foe in front back a square and step in. Sure, and up to 2 squares, with an ally right behind you.' },
      grapple: { name: 'Grapple', need: 8, text: 'Catch a foe next to you and drag it one square any way.' },
      pin: { name: 'Pinning shot', need: 7, text: 'Shoot to root a foe: it cannot move on its next turn.' },
      sweep: { name: 'Sweep', need: 8, dmg: 4, text: 'Strike every foe in the 8 squares round you, rolling for each.' },
      rally: { name: 'Rally', heal: 2, range: 2, text: 'Allies within 2 squares heal 2 and shake off pins.' },
    },
    armies: {
      full: { pawn: 8, rook: 2, knight: 2, bishop: 2, queen: 1, king: 1 },
      skirmish: { pawn: 4, rook: 1, knight: 1, bishop: 1, king: 1 },
      pawns: { pawn: 8, king: 1 },
    },
  };
  RULES.army = RULES.armies.full;

  const other = (side) => (side === 'white' ? 'black' : 'white');
  const key = (x, y) => x + ',' + y;
  const chance2d6 = (need) => {
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= need) n++;
    return n / 36;
  };
  function fail(msg) { throw new Error(msg); }

  // ---------- state ----------

  function newGame(opts) {
    opts = opts || {};
    const army = Object.assign({}, opts.army || RULES.army);
    for (const t in army) if (!RULES.units[t] || !army[t]) delete army[t];
    return {
      w: RULES.width, h: RULES.height,
      army,
      phase: 'setup',       // setup -> play -> facing -> play ... -> over
      step: 'move',         // within play: move, then action
      ready: { white: false, black: false },
      turn: 'white',
      turnNo: 1,
      pieces: [],
      nextId: 1,
      pending: null,        // { type: 'grapple', by, target, options: [{x,y}] }
      active: null,         // the one piece this turn belongs to
      spent: [],            // pieces that have used their free attack this turn
      winner: null,
    };
  }

  const piece = (s, id) => s.pieces.find((p) => p.id === id && p.hp > 0) || null;
  const pieceAt = (s, x, y) => s.pieces.find((p) => p.hp > 0 && p.x === x && p.y === y) || null;
  const alive = (s, side) => s.pieces.filter((p) => p.hp > 0 && (!side || p.side === side));
  const onBoard = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
  const unit = (p) => RULES.units[p.type];
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const manh = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

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
      hp: RULES.units[type].hp, moved: false, acted: false, from: null, movedDist: 0, pinned: false,
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

  // Fills the rest of a side's army in, chess fashion: pawns in front, the rest behind (R N B Q K B N R).
  function autoPlace(s, side) {
    const [front, back] = side === 'white' ? [s.h - 2, s.h - 1] : [1, 0];
    const backOrder = { king: [4], queen: [3], bishop: [2, 5], knight: [1, 6], rook: [0, 7] };
    const centre = [3, 4, 2, 5, 1, 6, 0, 7];
    const left = remaining(s, side);
    const free = (x, y) => onBoard(s, x, y) && !pieceAt(s, x, y);
    for (const t of ['king', 'queen', 'bishop', 'knight', 'rook']) {
      for (let i = 0; i < (left[t] || 0); i++) {
        const want = [...(backOrder[t] || []), ...centre];
        let x = want.find((c) => free(c, back));
        if (x != null) place(s, side, t, x, back);
        else { x = centre.find((c) => free(c, front)); if (x != null) place(s, side, t, x, front); }
      }
    }
    for (let i = 0; i < (left.pawn || 0); i++) {
      let x = centre.find((c) => free(c, front));
      if (x != null) place(s, side, 'pawn', x, front);
      else { x = centre.find((c) => free(c, back)); if (x != null) place(s, side, 'pawn', x, back); }
    }
  }

  function finishSetup(s, side) {
    if (s.phase !== 'setup') fail('not in setup');
    const left = remaining(s, side);
    for (const t in left) if (left[t] > 0) fail('place every piece first');
    s.ready[side] = true;
    if (s.ready.white && s.ready.black) {
      s.phase = 'play'; s.step = 'move'; s.turn = 'white'; s.active = null; s.spent = [];
      for (const p of s.pieces) { p.moved = false; p.acted = false; p.from = null; p.movedDist = 0; }
    }
    return { type: 'ready', side };
  }

  // ---------- geometry ----------

  function dirBetween(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 1 : 3;
    return dy > 0 ? 2 : 0;
  }

  // Which side of `t` a blow from (ax, ay) lands on: the front quarter, the back quarter, or a flank (diagonals are flanks).
  function sideStruck(t, ax, ay) {
    const dx = ax - t.x, dy = ay - t.y;
    if (!dx && !dy) return null;
    const [fx, fy] = DIRS[t.facing];
    const fwd = dx * fx + dy * fy, side = Math.abs(dx * fy - dy * fx);
    if (fwd > side) return 'front';
    if (-fwd > side) return 'behind';
    return 'flank';
  }

  // The three squares in front of a piece: ahead-left, ahead, ahead-right.
  function frontSquares(p, x = p.x, y = p.y, f = p.facing) {
    const [fx, fy] = DIRS[f];
    return [[x + fx - fy, y + fy + fx], [x + fx, y + fy], [x + fx + fy, y + fy - fx]];
  }
  // The lines a shooter overwatches: straight ahead, and the two forward diagonals if it can shoot diagonally.
  function frontLines(p) {
    const [fx, fy] = DIRS[p.facing], u = unit(p);
    return u.shoot && !u.shoot.diagonal ? [[fx, fy]] : [[fx, fy], [fx - fy, fy + fx], [fx + fy, fy - fx]];
  }

  // The squares a piece's zone covers, for the table to draw and the rules to test.
  function zoneSquares(s, p) {
    const u = unit(p), out = [];
    if (u.zoc === 'opportunity') for (const [x, y] of frontSquares(p)) { if (onBoard(s, x, y)) out.push([x, y]); }
    if (u.zoc === 'overwatch') {
      for (const [dx, dy] of frontLines(p)) {
        for (let i = 1; i <= u.shoot.range; i++) {
          const x = p.x + dx * i, y = p.y + dy * i; if (!onBoard(s, x, y)) break;
          out.push([x, y]);
          const q = pieceAt(s, x, y); if (q && q.side !== p.side) break;
        }
      }
    }
    return out;
  }

  // Can a shot fly from a to (x, y) along a straight line within range, over the shooter's friends?
  // diagonal: whether the shot may go along a diagonal as well as a rank or file.
  function lineOfFire(s, a, x, y, range, ignore, diagonal) {
    const dx = x - a.x, dy = y - a.y, n = Math.max(Math.abs(dx), Math.abs(dy));
    if (!n || n > range) return false;
    if (dx && dy && (!diagonal || Math.abs(dx) !== Math.abs(dy))) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 1; i < n; i++) {
      const q = pieceAt(s, a.x + sx * i, a.y + sy * i);
      if (q && q.side !== a.side && q.id !== ignore) return false;
    }
    return true;
  }

  // ---------- movement ----------

  // Squares a piece can end its move on, each with the path there.
  function reachable(s, id) {
    const p = piece(s, id);
    const out = new Map();
    if (!p) return out;
    out.set(key(p.x, p.y), { x: p.x, y: p.y, dist: 0, path: [] });
    if (p.moved || p.pinned) return out;
    const m = unit(p).move;
    if (m.kind === 'line' || m.kind === 'line8') {
      for (const [dx, dy] of m.kind === 'line' ? DIRS : ALL8) {
        const path = [];
        for (let i = 1; i <= m.n; i++) {
          const x = p.x + dx * i, y = p.y + dy * i;
          if (!onBoard(s, x, y) || pieceAt(s, x, y)) break;
          path.push([x, y]);
          out.set(key(x, y), { x, y, dist: i, path: path.slice() });
        }
      }
      return out;
    }
    const leap = m.kind === 'leap';
    const seen = new Set([key(p.x, p.y)]);
    let frontier = [{ x: p.x, y: p.y, path: [] }];
    for (let d = 1; d <= m.n; d++) {
      const next = [];
      for (const c of frontier) {
        for (const [dx, dy] of DIRS) {
          const x = c.x + dx, y = c.y + dy, k = key(x, y);
          if (!onBoard(s, x, y) || seen.has(k)) continue;
          const q = pieceAt(s, x, y);
          if (q && q.side !== p.side && !leap) continue;
          seen.add(k);
          const path = c.path.concat([[x, y]]);
          next.push({ x, y, path });
          if (!q) out.set(k, { x, y, dist: d, path });
        }
      }
      frontier = next;
    }
    return out;
  }

  // The free attacks a move along `path` would draw, in order: [{ at, reactor, kind }].
  // at is the index of the square the mover stands on when it happens (-1: where it started).
  function reactionsFor(s, p, path) {
    const out = [], used = new Set(s.spent);
    const pos = (i) => (i < 0 ? [p.x, p.y] : path[i]);
    const foes = alive(s, other(p.side)).filter((r) => unit(r).zoc && !used.has(r.id));
    for (let i = 0; i < path.length; i++) {
      const [ax, ay] = pos(i - 1), [bx, by] = pos(i);
      for (const r of foes) {
        if (used.has(r.id)) continue;
        const u = unit(r);
        if (u.zoc === 'opportunity') {
          const z = frontSquares(r);
          const inZ = (x, y) => z.some(([zx, zy]) => zx === x && zy === y);
          if (inZ(ax, ay) && !inZ(bx, by)) { out.push({ at: i - 1, reactor: r.id, kind: 'opportunity' }); used.add(r.id); }
        } else if (u.zoc === 'overwatch') {
          const lines = frontLines(r);
          const inLine = (x, y) => {
            const dx = x - r.x, dy = y - r.y, n = Math.max(Math.abs(dx), Math.abs(dy));
            if (!n || n > u.shoot.range) return false;
            if (!lines.some(([lx, ly]) => lx * n === dx && ly * n === dy)) return false;
            return lineOfFire(s, r, x, y, u.shoot.range, p.id, u.shoot.diagonal);
          };
          if (!inLine(ax, ay) && inLine(bx, by)) { out.push({ at: i, reactor: r.id, kind: 'overwatch' }); used.add(r.id); }
        }
      }
    }
    return out;
  }

  function checkTurn(s, p) {
    if (s.phase !== 'play') fail('not the time for that');
    if (s.pending) fail('finish the grapple first');
    if (!p) fail('no such piece');
    if (p.side !== s.turn) fail('not your piece');
    if (s.active != null && s.active !== p.id) fail('one piece a turn: this turn belongs to another piece');
  }

  function move(s, id, x, y, rng) {
    const p = piece(s, id);
    checkTurn(s, p);
    if (s.step !== 'move' || p.moved) fail('the move phase is over');
    if (p.pinned) fail('this piece is pinned and cannot move');
    const r = reachable(s, id).get(key(x, y));
    if (!r) fail('out of reach');
    if (r.dist === 0) fail('already there');
    const from = { x: p.x, y: p.y, facing: p.facing };
    const reactions = reactionsFor(s, p, r.path);
    const ev = { type: 'move', piece: id, from: { x: p.x, y: p.y }, path: r.path, reactions: [], died: false, winner: null };
    const stepDir = (i) => { const [ax, ay] = i <= 0 ? [from.x, from.y] : r.path[i - 1], [bx, by] = r.path[Math.max(0, i)]; return dirBetween(ax, ay, bx, by); };
    for (const re of reactions) {
      const at = re.at, [mx, my] = at < 0 ? [from.x, from.y] : r.path[at];
      p.x = mx; p.y = my;
      p.facing = stepDir(re.kind === 'opportunity' ? at + 1 : at);
      const reactor = piece(s, re.reactor);
      if (!reactor) continue;
      s.spent.push(reactor.id);
      const strike = resolveStrike(s, reactor, p, unit(reactor).zoc === 'overwatch' ? 'shoot' : 'attack', rng, { reaction: true });
      strike.kind = re.kind;
      ev.reactions.push({ at, ev: strike });
      if (strike.killed) { ev.died = true; ev.stoppedAt = at; break; }
    }
    if (!ev.died) {
      p.x = x; p.y = y;
      const [lx, ly] = r.path.length > 1 ? r.path[r.path.length - 2] : [from.x, from.y];
      p.facing = dirBetween(lx, ly, x, y);  // a moving piece faces the way it went; its facing is set at the end of the turn
    }
    p.moved = true; p.movedDist = r.dist;
    p.from = ev.reactions.length ? null : from;   // a move that drew dice cannot be taken back
    s.active = id; s.step = 'action';
    ev.winner = checkWinner(s);
    return ev;
  }

  // Take the move phase without moving.
  function stay(s, id) {
    const p = piece(s, id);
    checkTurn(s, p);
    if (s.step !== 'move') fail('the move phase is over');
    p.moved = true; p.movedDist = 0; p.from = null;
    s.active = id; s.step = 'action';
    return { type: 'stay', piece: id };
  }

  // A move may be taken back until the piece acts; then any piece may take the turn.
  function undoMove(s, id) {
    const p = piece(s, id);
    checkTurn(s, p);
    if (s.step !== 'action' || p.acted || !p.moved) fail('nothing to undo');
    if (p.from) {
      if (pieceAt(s, p.from.x, p.from.y)) fail('the square is taken');
      p.x = p.from.x; p.y = p.from.y; p.facing = p.from.facing;
    } else if (p.movedDist) fail('a move that drew a free attack cannot be taken back');
    p.from = null; p.moved = false; p.movedDist = 0;
    s.active = null; s.step = 'move';
    return { type: 'undo', piece: id };
  }

  // ---------- strikes ----------

  const isRanged = (p) => !!unit(p).ranged;
  const kingNear = (s, p) => alive(s, p.side).some((k) => k !== p && unit(k).inspire && cheb(k, p) === 1);
  // Is `t` in cover: right behind a friendly pawn (on the square that pawn turns its back on)?
  function inCover(s, t) {
    return alive(s, t.side).some((q) => q !== t && unit(q).cover && q.x - DIRS[q.facing][0] === t.x && q.y - DIRS[q.facing][1] === t.y);
  }

  // What action `act` by `p` on `t`, from (ax, ay), would be. Null if it cannot happen.
  function strikeInfo(s, p, t, act, ax, ay, opts = {}) {
    if (!p || !t || p.side === t.side) return null;
    if (ax == null) { ax = p.x; ay = p.y; }
    const u = unit(p), A = RULES.actions[act];
    const dx = t.x - ax, dy = t.y - ay, orth = Math.abs(dx) + Math.abs(dy) === 1, ring = Math.max(Math.abs(dx), Math.abs(dy)) === 1;
    const at = { x: ax, y: ay, side: p.side };
    const angle = sideStruck(t, ax, ay);
    const notes = [];
    let need, dmg = 0;
    if (act === 'attack') {
      if (!u.attack || !(orth || ((u.reach8 || opts.reaction) && ring))) return null;   // free attacks reach the diagonals of the zone
      if (angle === 'front' && !opts.reaction) {
        if (u.attack.front === false) return null;
        if (u.attack.front === 'ranged' && !isRanged(t)) return null;
      }
      need = u.attack.need; dmg = u.attack.dmg;
      if (u.charge && p.movedDist >= RULES.chargeDist) { dmg += RULES.chargeBonus; notes.push('charge'); }
    } else if (act === 'shoot' || act === 'pin') {
      if (!u.shoot || !lineOfFire(s, at, t.x, t.y, u.shoot.range, t.id, u.shoot.diagonal)) return null;
      need = act === 'pin' ? A.need : u.shoot.need; dmg = act === 'pin' ? 0 : u.shoot.dmg;
      if (inCover(s, t)) { need += RULES.coverBonus; notes.push('cover'); }
    } else if (act === 'grapple') {
      if (!orth) return null;
      need = A.need;
    } else if (act === 'push') {
      const [fx, fy] = DIRS[opts.facing != null ? opts.facing : p.facing];
      if (dx !== fx || dy !== fy) return null;           // only the foe right in front
      if (!onBoard(s, t.x + fx, t.y + fy) || pieceAt(s, t.x + fx, t.y + fy)) return null;
      const helper = pieceAt(s, ax - fx, ay - fy);
      const auto = !!(helper && helper.side === p.side);
      need = auto ? 2 : A.need;
      if (auto) notes.push('braced');
      const chance = auto ? 1 : chance2d6(need - (kingNear(s, { ...p, x: ax, y: ay }) ? RULES.inspireBonus : 0));
      return { act, angle, need, chance, damage: 0, auto, notes };
    } else if (act === 'sweep') {
      if (!ring) return null;
      need = A.need; dmg = A.dmg;
    } else return null;
    if (unit(t).shield && angle === 'front') { need += RULES.shieldBonus; notes.push('shield'); }
    if (kingNear(s, { ...p, x: ax, y: ay })) { need -= RULES.inspireBonus; notes.push('inspired'); }
    if (dmg && angle === 'behind' && !opts.reaction) dmg *= RULES.behindTimes;
    return { act, angle, need, chance: chance2d6(need), damage: dmg, notes };
  }

  // Everything `act` can be used on from where the piece stands: [{ target, info }] (or cells for none-target acts).
  function targetsFor(s, id, act) {
    const p = piece(s, id); if (!p) return [];
    if (act === 'rally') return [{ target: null, info: { act, need: 0, chance: 1, damage: 0, notes: [] } }];
    if (act === 'sweep') {
      const foes = alive(s, other(p.side)).filter((t) => strikeInfo(s, p, t, 'sweep'));
      return foes.length ? [{ target: null, info: { act, need: RULES.actions.sweep.need, chance: chance2d6(RULES.actions.sweep.need), damage: RULES.actions.sweep.dmg, notes: [], foes: foes.map((f) => f.id) } }] : [];
    }
    const out = [];
    for (const t of alive(s, other(p.side))) { const info = strikeInfo(s, p, t, act); if (info) out.push({ target: t.id, info }); }
    return out;
  }

  function roll2d6(rng) {
    rng = rng || Math.random;
    return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
  }

  // Rolls one strike (attack, shoot or pin, or a sweep's blow) and applies it.
  function resolveStrike(s, p, t, act, rng, opts = {}) {
    const info = strikeInfo(s, p, t, act, null, null, opts);
    const ev = { type: 'strike', act, piece: p.id, target: t.id, angle: info.angle, need: info.need, notes: info.notes, dice: roll2d6(rng), hit: false, damage: 0, killed: false, pinned: false };
    ev.total = ev.dice[0] + ev.dice[1];
    ev.hit = ev.total >= info.need;
    if (ev.hit && act === 'pin') { t.pinned = true; ev.pinned = true; }
    else if (ev.hit) {
      ev.damage = info.damage;
      t.hp = Math.max(0, t.hp - info.damage);
      ev.killed = t.hp === 0;
    }
    return ev;
  }

  function beginAction(s, p) {
    checkTurn(s, p);
    if (p.acted) fail('this piece has acted');
    if (s.step === 'move') { p.moved = true; p.movedDist = 0; p.from = null; s.active = p.id; s.step = 'action'; }
    s.active = p.id;
  }

  // Uses action `act` of piece `id` (on `targetId` where it takes one).
  function act(s, id, actId, targetId, rng) {
    const p = piece(s, id);
    if (!p) fail('no such piece');
    if (!unit(p).actions.includes(actId)) fail(`a ${unit(p).name.toLowerCase()} cannot ${actId}`);
    const t = targetId != null ? piece(s, targetId) : null;
    if (actId === 'rally') {
      beginAction(s, p);
      const A = RULES.actions.rally, ev = { type: 'rally', piece: id, healed: [], unpinned: [] };
      for (const q of alive(s, p.side)) {
        if (q === p || cheb(q, p) > A.range) continue;
        const h = Math.min(A.heal, unit(q).hp - q.hp);
        if (h > 0) { q.hp += h; ev.healed.push({ id: q.id, amount: h }); }
        if (q.pinned) { q.pinned = false; ev.unpinned.push(q.id); }
      }
      p.acted = true;
      return ev;
    }
    if (actId === 'sweep') {
      const foes = alive(s, other(p.side)).filter((f) => strikeInfo(s, p, f, 'sweep'));
      if (!foes.length) fail('no foe next to her');
      beginAction(s, p);
      const ev = { type: 'sweep', piece: id, strikes: [] };
      for (const f of foes) ev.strikes.push(resolveStrike(s, p, f, 'sweep', rng));
      p.acted = true;
      ev.winner = checkWinner(s);
      return ev;
    }
    const info = strikeInfo(s, p, t, actId);
    if (!info) {
      if (actId === 'attack' && t && sideStruck(t, p.x, p.y) === 'front' && unit(p).attack.front === 'ranged') fail(`a ${unit(p).name.toLowerCase()} cannot attack a foe that faces it`);
      fail(`cannot ${actId} that`);
    }
    beginAction(s, p);
    p.acted = true;
    if (actId === 'push') return resolvePush(s, p, t, info, rng);
    if (actId === 'grapple') {
      const dice = roll2d6(rng), total = dice[0] + dice[1], hit = total >= info.need;
      const ev = { type: 'grapple', piece: id, target: t.id, angle: info.angle, need: info.need, notes: info.notes, dice, total, hit, options: [] };
      if (hit) {
        ev.options = DIRS.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })).filter((c) => onBoard(s, c.x, c.y) && !pieceAt(s, c.x, c.y));
        if (ev.options.length) s.pending = { type: 'grapple', by: id, target: t.id, options: ev.options };
      }
      return ev;
    }
    const ev = resolveStrike(s, p, t, actId, rng);
    ev.winner = checkWinner(s);
    return ev;
  }

  // A push: the foe in front goes back a square and the pawn steps in; braced by an ally behind, it is sure and goes up to 2.
  function resolvePush(s, p, t, info, rng) {
    const [fx, fy] = DIRS[p.facing];
    const ev = { type: 'push', piece: p.id, target: t.id, auto: info.auto, need: info.need, notes: info.notes, hit: true, steps: 0, from: { x: t.x, y: t.y }, pawnFrom: { x: p.x, y: p.y } };
    if (!info.auto) { ev.dice = roll2d6(rng); ev.total = ev.dice[0] + ev.dice[1]; ev.hit = ev.total >= info.need; }
    if (ev.hit) {
      const most = info.auto ? 2 : 1;
      while (ev.steps < most && onBoard(s, t.x + fx, t.y + fy) && !pieceAt(s, t.x + fx, t.y + fy)) {
        t.x += fx; t.y += fy; p.x += fx; p.y += fy; ev.steps++;
      }
    }
    ev.to = { x: t.x, y: t.y }; ev.pawnTo = { x: p.x, y: p.y };
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
    if (s.step === 'move') { p.moved = true; p.from = null; s.step = 'action'; }
    p.acted = true; s.active = id;
    return { type: 'wait', piece: id };
  }

  // ---------- turns and facing ----------

  function endTurn(s) {
    if (s.phase !== 'play') fail('not the time for that');
    if (s.pending) fail('finish the grapple first');
    s.phase = 'facing';
    for (const p of alive(s, s.turn)) p.from = null;
    if (s.active != null && !piece(s, s.active)) s.active = null;
    return { type: 'facing', side: s.turn };
  }

  function setFacing(s, id, dir) {
    const p = piece(s, id);
    if (!p) fail('no such piece');
    if (!(dir >= 0 && dir < 4)) fail('bad direction');
    const ok = (s.phase === 'setup' && !s.ready[p.side]) || (s.phase === 'facing' && p.side === s.turn);
    if (!ok) fail('facing is set at the end of your turn');
    // only the piece that took the turn turns; after a turn with no piece used, one piece may turn
    if (s.phase === 'facing') {
      if (s.active != null && s.active !== id) fail('only the piece that took the turn can turn');
      s.active = id;
    }
    p.facing = dir;
    return { type: 'face', piece: id, facing: dir };
  }

  function confirmFacing(s) {
    if (s.phase !== 'facing') fail('not the time for that');
    for (const p of alive(s, s.turn)) p.pinned = false;   // a pin lasts through the pinned side's next turn
    s.turn = other(s.turn);
    if (s.turn === 'white') s.turnNo++;
    s.phase = 'play'; s.step = 'move'; s.active = null; s.spent = [];
    for (const p of alive(s, s.turn)) { p.moved = false; p.acted = false; p.from = null; p.movedDist = 0; }
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
        s.winner = other(side); s.phase = 'over'; s.pending = null;
        return s.winner;
      }
    }
    return null;
  }

  // ---------- the computer player ----------

  const nearest = (list, x, y) => { let b = null, bd = Infinity; for (const e of list) { const d = Math.abs(e.x - x) + Math.abs(e.y - y); if (d < bd) { bd = d; b = e; } } return b; };
  function facingToward(s, p, x, y) { const e = nearest(alive(s, other(p.side)), x, y); return e ? dirBetween(x, y, e.x, e.y) : p.facing; }

  // How much harm one foe could do to p at (x, y) next turn, roughly; only one foe acts, so the worst counts most.
  function danger(s, p, x, y) {
    const threats = [];
    for (const e of alive(s, other(p.side))) {
      const u = unit(e), reach = u.move.n + (u.shoot ? u.shoot.range : u.reach8 ? 1.5 : 1);
      const d = Math.abs(e.x - x) + Math.abs(e.y - y);
      if (d > reach + (e.pinned ? -u.move.n : 0)) continue;
      const base = u.shoot ? u.shoot.dmg : u.attack.dmg;
      const need = (u.shoot ? u.shoot.need : u.attack.need) + (unit(p).shield ? 1 : 0);
      threats.push(chance2d6(need) * Math.min(p.hp, base * 1.5));
    }
    threats.sort((a, b) => b - a);
    return threats.reduce((sum, t, i) => sum + (i === 0 ? t : t * 0.25), 0);
  }

  // The best use of action time for p standing at (x, y): { act, target, value }.
  function bestAct(s, p) {
    let best = { act: 'wait', target: null, value: 0 };
    for (const a of unit(p).actions) {
      if (a === 'grapple') continue;
      for (const { target, info } of targetsFor(s, p.id, a)) {
        let v = 0;
        const t = target != null ? piece(s, target) : null;
        if (a === 'rally') {
          for (const q of alive(s, p.side)) if (q !== p && cheb(q, p) <= RULES.actions.rally.range) v += Math.min(RULES.actions.rally.heal, unit(q).hp - q.hp) * 0.8 + (q.pinned ? 1.5 : 0);
        } else if (a === 'sweep') {
          for (const fid of info.foes) { const f = piece(s, fid), i2 = strikeInfo(s, p, f, 'sweep'); v += i2.chance * Math.min(f.hp, i2.damage) * 1.5 + (i2.damage >= f.hp ? i2.chance * (f.type === 'king' ? 1000 : 10) : 0); }
        } else if (a === 'pin') {
          v = info.chance * (unit(t).role === 'Striker' ? 3 : 1.5);
        } else if (a === 'push') {
          v = info.chance * 1.2;
        } else {
          v = info.chance * Math.min(t.hp, info.damage) * 1.5 + (info.damage >= t.hp ? info.chance * (t.type === 'king' ? 1000 : 10) : 0);
        }
        if (v > best.value) best = { act: a, target, value: v };
      }
    }
    return best;
  }

  // Score p moving to r (path) and acting from there.
  function planScore(s, p, r) {
    const ox = p.x, oy = p.y, of = p.facing, om = p.movedDist;
    const u = unit(p);
    let cost = 0;
    for (const re of reactionsFor(s, p, r.path)) {
      const q = piece(s, re.reactor), uq = unit(q);
      const dmg = (uq.zoc === 'overwatch' ? uq.shoot.dmg : uq.attack.dmg), c = chance2d6(uq.zoc === 'overwatch' ? uq.shoot.need : uq.attack.need);
      cost += c * Math.min(dmg, p.hp) * 1.2 + (dmg >= p.hp ? c * (p.type === 'king' ? 1000 : 10) : 0);
    }
    p.x = r.x; p.y = r.y; p.movedDist = r.dist;
    if (r.dist) { const [lx, ly] = r.path.length > 1 ? r.path[r.path.length - 2] : [ox, oy]; p.facing = dirBetween(lx, ly, r.x, r.y); }
    const act = bestAct(s, p);
    const foes = alive(s, other(p.side));
    const goal = foes.find((e) => e.type === 'king') || nearest(foes, r.x, r.y);
    const near = nearest(foes, r.x, r.y);
    const dGoal = goal ? manh(goal, r) : 0, dNear = near ? manh(near, r) : 0;
    const daring = 1 + Math.min(3, s.turnNo / 12);
    let approach = 0;
    const alone = alive(s, p.side).length === 1;   // a king left alone has to fight
    const hunt = foes.length <= 2 && p.type !== 'king';   // a few foes left: everyone closes in on them
    if (u.role === 'Striker' || alone || hunt) approach = -0.5 * dGoal;
    else if (u.role === 'Defender') approach = -0.35 * dNear - 0.1 * dGoal;
    else if (u.role === 'Controller') approach = -0.35 * Math.abs(dNear - 4) - 0.05 * dGoal;
    else approach = -0.05 * dGoal;
    const risk = danger(s, p, r.x, r.y) * (p.type === 'king' && !alone ? 6 : 1);
    p.x = ox; p.y = oy; p.facing = of; p.movedDist = om;
    return { value: act.value + approach * daring - risk * 0.6 - cost - r.dist * 0.01, act };
  }

  function planFor(s, p) {
    let best = null, stay = null;
    for (const r of reachable(s, p.id).values()) {
      const sc = planScore(s, p, r);
      if (r.dist === 0) stay = sc.value - sc.act.value;
      if (!best || sc.value > best.score) best = { id: p.id, x: r.x, y: r.y, act: sc.act.act, target: sc.act.target, score: sc.value };
    }
    if (best) best.gain = best.score - (stay || 0);
    return best;
  }

  // The computer's next order for the side whose turn it is.
  function aiNext(s) {
    if (s.phase === 'facing') {
      const p = s.active != null ? piece(s, s.active) : null;
      if (p) { const f = facingToward(s, p, p.x, p.y); if (f !== p.facing) return { type: 'face', id: p.id, dir: f }; }
      return { type: 'confirm' };
    }
    if (s.phase !== 'play') return null;
    if (s.pending) { const g = s.pending; return { type: 'shove', x: g.options[0].x, y: g.options[0].y }; }
    if (s.step === 'action') {
      const p = piece(s, s.active);
      if (!p || p.acted) return { type: 'end' };
      const a = bestAct(s, p);
      return a.value > 0 ? { type: 'act', id: p.id, act: a.act, target: a.target } : { type: 'wait', id: p.id };
    }
    // the move phase: the piece whose best plan improves most on standing still
    let best = null;
    for (const p of alive(s, s.turn)) {
      const plan = planFor(s, p);
      if (plan && (!best || plan.gain > best.gain)) best = plan;
    }
    if (!best) return { type: 'end' };
    const p = piece(s, best.id);
    if (best.x !== p.x || best.y !== p.y) return { type: 'move', id: p.id, x: best.x, y: best.y };
    return { type: 'stay', id: p.id };
  }

  // Applies one aiNext order. Returns the event.
  function apply(s, o, rng) {
    switch (o.type) {
      case 'move': return move(s, o.id, o.x, o.y, rng);
      case 'stay': return stay(s, o.id);
      case 'act': return act(s, o.id, o.act, o.target, rng);
      case 'shove': return resolveGrapple(s, o.x, o.y);
      case 'wait': return wait(s, o.id);
      case 'end': return endTurn(s);
      case 'face': return setFacing(s, o.id, o.dir);
      case 'confirm': return confirmFacing(s);
      default: fail('unknown order ' + o.type);
    }
  }

  const TC = {
    RULES, DIRS, ALL8, DIR_NAMES, SIDES, other, chance2d6,
    newGame, piece, pieceAt, alive, unit, onBoard,
    setupRows, inSetupZone, remaining, place, relocate, unplace, clearSide, autoPlace, finishSetup,
    reachable, reactionsFor, zoneSquares, frontSquares, inCover, move, stay, undoMove,
    sideStruck, strikeInfo, targetsFor, act, resolveGrapple, wait,
    endTurn, setFacing, confirmFacing, checkWinner, aiNext, apply,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TC;
  else root.TC = TC;
})(typeof window !== 'undefined' ? window : globalThis);
