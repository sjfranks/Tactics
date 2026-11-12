// Tactics Chess: the table. Shows the rules' state (rules.js) and turns clicks into orders. Decides nothing itself.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const DIR_ARROWS = ['↑', '→', '↓', '←'];
  const FILES = 'abcdefghijklmnop';

  let S = null;     // the rules' state
  const ui = {
    sel: null,          // selected piece id
    setupType: 'pawn',  // what a click in the setup zone places
    mode: 'attack',     // what a click on a foe does: attack | grapple
    hover: null,        // {x, y}
    busy: false,        // an animation or the computer is playing
    ai: { white: false, black: false },
    hide: null,         // a side whose pieces are hidden during the other side's setup
    log: [],
  };

  // ---------- helpers ----------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const sqName = (x, y) => FILES[x] + (S.h - y);
  const pName = (p) => cap(p.side) + ' ' + TC.unit(p).name.toLowerCase();
  const setupSide = () => (S.phase !== 'setup' ? null : !S.ready.white ? 'white' : !S.ready.black ? 'black' : null);
  const activeSide = () => (S.phase === 'setup' ? setupSide() : S.turn);
  const humanTurn = () => S.phase !== 'over' && !ui.ai[activeSide()] && !ui.busy;
  const selPiece = () => (ui.sel != null ? TC.piece(S, ui.sel) : null);
  const pct = (c) => Math.round(c * 100) + '%';

  function log(html) {
    ui.log.unshift(html);
    const li = document.createElement('li');
    li.innerHTML = html;
    $('log').prepend(li);
  }

  // ---------- the board ----------

  const squares = [];
  const pieceEls = new Map();

  function buildBoard() {
    boardEl.innerHTML = '';
    squares.length = 0;
    pieceEls.clear();
    const size = 100 / S.w;
    for (let y = 0; y < S.h; y++) {
      for (let x = 0; x < S.w; x++) {
        const d = document.createElement('div');
        d.className = 'sq ' + ((x + y) % 2 ? 'd' : 'l');
        d.style.left = x * size + '%';
        d.style.top = y * size + '%';
        if (x === 0) d.insertAdjacentHTML('beforeend', `<span class="coord" style="left:3px;top:2px">${S.h - y}</span>`);
        if (y === S.h - 1) d.insertAdjacentHTML('beforeend', `<span class="coord" style="right:4px;bottom:1px">${FILES[x]}</span>`);
        boardEl.appendChild(d);
        squares.push(d);
      }
    }
  }

  const FIGS = {
    pawn: '<circle cx="50" cy="28" r="13"/><path d="M39 42h22l-3 7c6 9 9 19 10 30H32c1-11 4-21 10-30z"/><rect x="24" y="79" width="52" height="11" rx="3"/>',
    king: '<path d="M46 4h8v8h8v8h-8v9h-8v-9h-8v-8h8z"/><path d="M27 37c15-9 31-9 46 0l-7 39H34z"/><rect x="22" y="77" width="56" height="13" rx="3"/>',
  };

  function pieceEl(p) {
    let el = pieceEls.get(p.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'piece ' + p.side;
      el.innerHTML = `<div class="facing"></div><svg class="fig" viewBox="0 0 100 100">${FIGS[p.type]}</svg><div class="hp"><i></i></div>`;
      el.style.width = el.style.height = 100 / S.w + '%';
      boardEl.appendChild(el);
      pieceEls.set(p.id, el);
      placeEl(el, p.x, p.y);
    }
    return el;
  }

  function placeEl(el, x, y) {
    el.style.left = (x * 100) / S.w + '%';
    el.style.top = (y * 100) / S.h + '%';
  }

  // What each square should light up as, given the selection and the phase.
  function highlights() {
    const h = new Map();
    const mark = (x, y, c) => h.set(x + ',' + y, (h.get(x + ',' + y) || '') + ' ' + c);
    const side = activeSide();
    const p = selPiece();
    if (S.phase === 'setup' && side && !ui.ai[side]) {
      for (const y of TC.setupRows(S, side)) for (let x = 0; x < S.w; x++) mark(x, y, 'zone');
    }
    if (S.phase === 'play' && S.pending && S.pending.type === 'grapple') {
      for (const c of S.pending.options) mark(c.x, c.y, 'shove');
      const t = TC.piece(S, S.pending.target);
      if (t) mark(t.x, t.y, 'sel');
      return h;
    }
    if (p) mark(p.x, p.y, 'sel');
    if (S.phase === 'play' && p && p.side === S.turn && !ui.ai[S.turn]) {
      if (!p.moved) for (const r of TC.reachable(S, p.id).values()) if (r.dist > 0) mark(r.x, r.y, 'move');
      if (!p.acted) {
        for (const e of TC.alive(S, TC.other(p.side))) if (TC.bestApproach(S, p.id, e.id, ui.mode)) mark(e.x, e.y, 'attack');
      }
    }
    if (S.phase === 'facing' && p && p.side === S.turn) {
      TC.DIRS.forEach(([dx, dy]) => { if (TC.onBoard(S, p.x + dx, p.y + dy)) mark(p.x + dx, p.y + dy, 'face'); });
    }
    if (ui.hover) mark(ui.hover.x, ui.hover.y, 'hover');
    return h;
  }

  // On your turn a piece is always selected, so moving is one tap: the next piece that can still act, front first.
  function autoSelect() {
    if (S.phase !== 'play' || S.pending || ui.ai[S.turn]) return;
    // a piece still has something to do if it can move, or strike from where it stands
    const busy = (q) => !q.acted && (!q.moved || TC.alive(S, TC.other(q.side)).some((e) =>
      TC.actionInfo(S, q.id, e.id, 'attack') || TC.actionInfo(S, q.id, e.id, 'grapple')));
    const p = selPiece();
    if (p && p.side === S.turn && (busy(p) || (ui.picked === p.id && !p.acted))) return;
    const ready = TC.alive(S, S.turn).filter(busy);
    ready.sort((a, b) => (S.turn === 'white' ? a.y - b.y : b.y - a.y) || a.x - b.x);
    if (ready.length) ui.sel = ready[0].id;
    else if (p && p.side !== S.turn) ui.sel = null;
  }

  function render() {
    autoSelect();
    const h = highlights();
    for (let y = 0; y < S.h; y++) {
      for (let x = 0; x < S.w; x++) {
        squares[y * S.w + x].className = 'sq ' + ((x + y) % 2 ? 'd' : 'l') + (h.get(x + ',' + y) || '');
      }
    }
    const living = new Set();
    for (const p of TC.alive(S)) {
      living.add(p.id);
      const el = pieceEl(p);
      if (!ui.animating || ui.animating !== p.id) placeEl(el, p.x, p.y);
      el.querySelector('.facing').style.transform = `rotate(${p.facing * 90}deg)`;
      const bar = el.querySelector('.hp i');
      const frac = p.hp / TC.unit(p).hp;
      bar.style.width = frac * 100 + '%';
      bar.classList.toggle('low', frac <= 0.5);
      el.classList.toggle('spent', S.phase === 'play' && p.side === S.turn && p.acted);
      el.classList.toggle('hidden', S.phase === 'setup' && ui.hide === p.side);
      el.title = `${pName(p)} · ${p.hp}/${TC.unit(p).hp} HP · facing ${TC.DIR_NAMES[p.facing]}`;
    }
    for (const [id, el] of pieceEls) {
      if (!living.has(id)) { el.classList.add('dead'); setTimeout(() => el.remove(), 500); pieceEls.delete(id); }
    }
    renderStatus();
    renderControls();
  }

  function renderStatus() {
    const side = activeSide();
    const b = (s) => `<b class="${s}">${cap(s)}</b>`;
    let t;
    if (S.phase === 'setup') t = `Setup: ${b(side)} places pieces on the back two rows`;
    else if (S.phase === 'play') t = `Turn ${S.turnNo}: ${b(S.turn)} to move` + (ui.ai[S.turn] ? ' (computer)' : ' · tap a blue square to move, a red foe to strike');
    else if (S.phase === 'facing') t = `Turn ${S.turnNo}: ${b(S.turn)} sets facing · tap a piece, then a square next to it`;
    else t = `${b(S.winner)} wins!`;
    $('status').innerHTML = t;
  }

  // ---------- the side panel ----------

  function pieceSummary(p) {
    const u = TC.unit(p);
    let s = `<b>${pName(p)}</b> on ${sqName(p.x, p.y)} · ${p.hp}/${u.hp} HP · facing ${TC.DIR_NAMES[p.facing]} ${DIR_ARROWS[p.facing]}`;
    if (S.phase === 'play' && p.side === S.turn) {
      s += `<br><span class="tag">${p.moved ? 'moved' : 'can move'}</span><span class="tag">${p.acted ? 'acted' : 'can act'}</span>`;
    }
    return s;
  }

  function hoverInfo() {
    const p = selPiece();
    if (!ui.hover || !p) return '';
    const e = TC.pieceAt(S, ui.hover.x, ui.hover.y);
    if (!e || e.side === p.side || S.phase !== 'play' || p.side !== S.turn) return '';
    const best = TC.bestApproach(S, p.id, e.id, ui.mode);
    if (!best) {
      if (p.acted) return 'This piece has already acted.';
      if (ui.mode === 'attack' && TC.unit(p).attack.damage.front == null) {
        return `Out of reach, or it would face you. A ${TC.unit(p).name.toLowerCase()} strikes only from the flank or behind.`;
      }
      return 'Out of reach.';
    }
    const i = best.info;
    const where = best.dist ? `walk to ${sqName(best.x, best.y)}, ` : '';
    const what = i.kind === 'attack' ? `${i.damage} damage` : 'move it 1 square';
    return `${cap(i.kind)} ${pName(e)}: ${where}strike its <b>${i.angle}</b>. Need <b>${i.target}+</b> on 2d6 (${pct(i.chance)}) for ${what}.`;
  }

  function renderControls() {
    const c = $('controls');
    const side = activeSide();
    const p = selPiece();
    let html = '';
    if (S.phase === 'over') {
      html = `<div class="banner">${cap(S.winner)} wins!</div><div class="row"><button class="primary" data-act="new">New game</button></div>`;
    } else if (ui.ai[side]) {
      html = `<h2>${cap(side)}</h2><p class="hint">The computer is thinking…</p>`;
    } else if (S.phase === 'setup') {
      const left = TC.remaining(S, side);
      html = `<h2>${cap(side)} setup</h2><div class="row">`;
      for (const t in left) {
        if (!S.army[t]) continue;
        html += `<button data-act="type" data-type="${t}" class="${ui.setupType === t ? 'on' : ''}" ${left[t] ? '' : 'disabled'}>${TC.RULES.units[t].name} ×${left[t]}</button>`;
      }
      html += `</div>`;
      if (p && p.side === side) {
        html += `<div class="info">${pieceSummary(p)}</div>${arrowPad()}<div class="row"><button data-act="remove">Remove</button></div>`;
      } else {
        html += `<p class="hint">Click a highlighted square to place a ${ui.setupType}. Click a placed piece to turn it, then click it again to turn it once more, or click an empty square to move it there.</p>`;
      }
      const done = Object.values(left).every((n) => n === 0);
      html += `<div class="row"><button data-act="auto">Auto-place</button><button data-act="clear">Clear</button><button class="primary" data-act="done" ${done ? '' : 'disabled'}>Done</button></div>`;
    } else if (S.phase === 'play') {
      html = `<h2>${cap(S.turn)}'s turn</h2>`;
      if (S.pending) {
        html += `<p>Grapple succeeded! Click a yellow square to put the foe there.</p><div class="row"><button data-act="leave">Leave it in place</button></div>`;
      } else if (p && p.side === S.turn) {
        const u = TC.unit(p);
        html += `<div class="info">${pieceSummary(p)}</div>`;
        if (!p.acted) {
          html += `<div class="row"><button data-act="mode" data-mode="attack" class="${ui.mode === 'attack' ? 'on' : ''}">Attack ${u.attack.target}+</button>`;
          if (u.grapple) html += `<button data-act="mode" data-mode="grapple" class="${ui.mode === 'grapple' ? 'on' : ''}">Grapple ${u.grapple.target}+</button>`;
          html += `<button data-act="wait">Wait</button>`;
          if (p.moved && p.from) html += `<button data-act="undo">Undo move</button>`;
          html += `</div><p class="hint">Blue: move. Red: a foe you can ${ui.mode}. Clicking a red foe walks there and rolls.</p>`;
        }
      } else if (p) {
        html += `<div class="info">${pieceSummary(p)}</div>`;
      } else {
        html += `<p class="hint">Select one of your pieces. Each one may move once and act once.</p>`;
      }
      html += `<div class="info" id="hoverInfo">${hoverInfo()}</div>`;
      html += `<div class="row"><button class="primary" data-act="end" ${S.pending ? 'disabled' : ''}>End turn</button></div>`;
    } else if (S.phase === 'facing') {
      html = `<h2>${cap(S.turn)}: set facing</h2>`;
      if (p && p.side === S.turn) html += `<div class="info">${pieceSummary(p)}</div>${arrowPad()}`;
      else html += `<p class="hint">Click one of your pieces, then click a square next to it (or use the arrows) to face that way. Watch your backs!</p>`;
      html += `<div class="row"><button data-act="faceAll">Face nearest foes</button><button class="primary" data-act="confirm">Confirm facing</button></div>`;
    }
    c.innerHTML = html;
  }

  function arrowPad() {
    const b = (d) => `<button data-act="face" data-dir="${d}">${DIR_ARROWS[d]}</button>`;
    return `<div class="row"><div class="arrows"><span></span>${b(0)}<span></span>${b(3)}<span></span>${b(1)}<span></span>${b(2)}<span></span></div></div>`;
  }

  // ---------- dice and events ----------

  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function drawDie(el, n) {
    el.innerHTML = Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'p' : ''}"></i>`).join('');
  }

  async function rollDice(ev) {
    const dice = document.querySelectorAll('#dice .die');
    const text = $('diceText');
    text.textContent = `Rolling… need ${ev.need}+`;
    dice.forEach((d) => d.classList.add('rolling'));
    const fast = ui.ai[S.turn] ? 0.7 : 1;
    for (let i = 0; i < 9; i++) {
      dice.forEach((d) => drawDie(d, 1 + Math.floor(Math.random() * 6)));
      await sleep(55 * fast);
    }
    dice.forEach((d, i) => { d.classList.remove('rolling'); drawDie(d, ev.dice[i]); });
    text.innerHTML = `${ev.dice[0]} + ${ev.dice[1]} = <b>${ev.total}</b> vs ${ev.need}+ · ` + (ev.hit ? '<span class="ok">HIT</span>' : '<span class="no">MISS</span>');
    await sleep(350 * fast);
  }

  function popText(x, y, txt, miss) {
    const d = document.createElement('div');
    d.className = 'pop' + (miss ? ' miss' : '');
    d.textContent = txt;
    d.style.left = (x * 100) / S.w + '%';
    d.style.top = (y * 100) / S.h + '%';
    boardEl.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  // Shows an event the rules just produced. The state has already changed.
  async function play(ev, before) {
    if (ev.type === 'move') {
      const el = pieceEls.get(ev.piece);
      ui.animating = ev.piece;
      for (const [x, y] of ev.path) { placeEl(el, x, y); await sleep(120); }
      ui.animating = null;
      const p = TC.piece(S, ev.piece);
      log(`${pName(p)} moves ${sqName(before.x, before.y)} → ${sqName(p.x, p.y)}.`);
      render();
    } else if (ev.type === 'attack' || ev.type === 'grapple') {
      const p = TC.piece(S, ev.piece);
      const t = S.pieces.find((q) => q.id === ev.target);
      render();
      await rollDice(ev);
      const verb = ev.type === 'attack' ? 'attacks' : 'grapples';
      let line = `${pName(p)} ${verb} ${pName(t)} from the ${ev.angle === 'behind' ? 'back' : ev.angle}: ${ev.dice[0]}+${ev.dice[1]}=${ev.total} vs ${ev.need}+, `;
      if (!ev.hit) { popText(t.x, t.y, 'miss', true); line += 'miss.'; }
      else if (ev.type === 'attack') {
        const tel = pieceEls.get(t.id);
        if (tel) { tel.classList.remove('hit'); void tel.offsetWidth; tel.classList.add('hit'); }
        popText(t.x, t.y, '-' + ev.damage);
        line += `hit for ${ev.damage}` + (ev.killed ? `. The ${TC.unit(t).name.toLowerCase()} falls!` : ` (${t.hp} HP left).`);
      } else {
        line += ev.options.length ? 'caught!' : 'caught, but there is no room to move it.';
      }
      log(line);
      await sleep(250);
      render();
      if (ev.winner) log(`<b>${cap(ev.winner)} wins!</b>`);
    } else if (ev.type === 'shove') {
      const t = TC.piece(S, ev.target);
      if (ev.moved) log(`${pName(t)} is dragged ${sqName(ev.from.x, ev.from.y)} → ${sqName(ev.to.x, ev.to.y)}.`);
      render();
      await sleep(200);
    } else if (ev.type === 'turn') {
      log(`— Turn ${ev.turnNo}: ${cap(ev.side)} —`);
      render();
    } else {
      render();
    }
  }

  // Runs a rules order, shows it, and lets the computer play if it is its turn.
  async function order(fn) {
    if (ui.busy) return;
    ui.busy = true;
    let ev;
    try {
      const before = selPiece() ? { x: selPiece().x, y: selPiece().y } : null;
      ev = fn();
      await play(ev, before);
    } catch (e) {
      flash(e.message);
    } finally {
      ui.busy = false;
    }
    render();
    maybeAI();
    return ev;
  }

  function flash(msg) {
    const el = $('hoverInfo') || $('controls');
    const n = document.createElement('div');
    n.className = 'info';
    n.style.color = '#ff9d8f';
    n.textContent = msg;
    el.appendChild(n);
  }

  // ---------- the computer ----------

  async function maybeAI() {
    if (ui.busy || S.phase === 'over') return;
    const side = activeSide();
    if (!side || !ui.ai[side]) return;
    ui.busy = true;
    ui.sel = null;
    render();
    try {
      if (S.phase === 'setup') {
        TC.autoPlace(S, side);
        TC.finishSetup(S, side);
        log(`${cap(side)} sets up.`);
        if (S.phase === 'play') log(`— Turn 1: White —`);
        render();
      }
      while (S.phase === 'play' || S.phase === 'facing') {
        if (!ui.ai[S.turn]) break;
        await sleep(S.phase === 'facing' ? 60 : 260);
        const o = TC.aiNext(S);
        const before = o.id != null ? (({ x, y }) => ({ x, y }))(TC.piece(S, o.id)) : null;
        const ev = TC.apply(S, o);
        if (o.type === 'end') log(`${cap(S.turn)} ends the turn.`);
        await play(ev, before);
      }
    } finally {
      ui.busy = false;
    }
    render();
    maybeAI();
  }

  // ---------- input ----------

  function squareFrom(e) {
    const r = boardEl.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * S.w);
    const y = Math.floor(((e.clientY - r.top) / r.height) * S.h);
    return TC.onBoard(S, x, y) ? { x, y } : null;
  }

  async function clickSquare(x, y) {
    if (!humanTurn()) return;
    const side = activeSide();
    const q = TC.pieceAt(S, x, y);
    const p = selPiece();

    if (S.phase === 'setup') {
      if (q && q.side === side) {
        if (p && p.id === q.id) TC.setFacing(S, q.id, (q.facing + 1) % 4);
        else ui.sel = q.id;
      } else if (!q && TC.inSetupZone(S, side, x, y)) {
        if (p && p.side === side) { TC.relocate(S, p.id, x, y); ui.sel = null; }
        else if (TC.remaining(S, side)[ui.setupType] > 0) {
          TC.place(S, side, ui.setupType, x, y);
          if (TC.remaining(S, side)[ui.setupType] === 0) {
            const next = Object.entries(TC.remaining(S, side)).find(([, n]) => n > 0);
            if (next) ui.setupType = next[0];
          }
        }
      } else ui.sel = null;
      return render();
    }

    if (S.phase === 'facing') {
      if (q && q.side === S.turn) {
        if (p && p.id === q.id) TC.setFacing(S, q.id, (q.facing + 1) % 4);
        else ui.sel = q.id;
      } else if (p && p.side === S.turn && Math.abs(p.x - x) + Math.abs(p.y - y) === 1) {
        TC.setFacing(S, p.id, TC.DIRS.findIndex(([dx, dy]) => p.x + dx === x && p.y + dy === y));
      } else ui.sel = q ? q.id : null;
      return render();
    }

    if (S.phase !== 'play') return;
    if (S.pending) {
      if (S.pending.options.some((c) => c.x === x && c.y === y)) await order(() => TC.resolveGrapple(S, x, y));
      return;
    }
    ui.hover = null;
    if (q && q.side === S.turn) { ui.sel = q.id; ui.picked = q.id; return render(); }
    if (q && p && p.side === S.turn && !p.acted) {
      const best = TC.bestApproach(S, p.id, q.id, ui.mode);
      if (best) {
        if (best.x !== p.x || best.y !== p.y) await order(() => TC.move(S, p.id, best.x, best.y));
        const kind = ui.mode;
        await order(() => (kind === 'attack' ? TC.attack(S, p.id, q.id) : TC.grapple(S, p.id, q.id)));
        if (!S.pending) ui.sel = null;
        render();
        return;
      }
    }
    if (q) { ui.hover = { x, y }; return render(); }   // a foe out of reach: say why, keep the selection
    if (p && p.side === S.turn && !p.moved && TC.reachable(S, p.id).has(x + ',' + y)) {
      await order(() => TC.move(S, p.id, x, y));
      return;
    }
    render();
  }

  boardEl.addEventListener('click', (e) => {
    const c = squareFrom(e);
    if (c) clickSquare(c.x, c.y).catch((err) => { flash(err.message); });
  });
  boardEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const c = squareFrom(e);
    if ((c && ui.hover && c.x === ui.hover.x && c.y === ui.hover.y) || (!c && !ui.hover)) return;
    ui.hover = c;
    if (!ui.busy) render();
  });
  boardEl.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    ui.hover = null;
    if (!ui.busy) render();
  });

  $('controls').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !humanTurn() && b.dataset.act !== 'new') return;
    const p = selPiece();
    const side = activeSide();
    try {
      switch (b.dataset.act) {
        case 'type': ui.setupType = b.dataset.type; ui.sel = null; break;
        case 'remove': TC.unplace(S, p.id); ui.sel = null; break;
        case 'auto': TC.autoPlace(S, side); ui.sel = null; break;
        case 'clear': TC.clearSide(S, side); ui.sel = null; break;
        case 'done': finishSetup(side); return;
        case 'face': TC.setFacing(S, p.id, +b.dataset.dir); break;
        case 'faceAll': faceAll(); break;
        case 'mode': ui.mode = b.dataset.mode; break;
        case 'wait': order(() => TC.wait(S, p.id)).then(() => { ui.sel = null; render(); }); return;
        case 'undo': order(() => TC.undoMove(S, p.id)); return;
        case 'leave': order(() => TC.resolveGrapple(S, null)); return;
        case 'end': endTurn(); return;
        case 'confirm': confirmFacing(); return;
        case 'new': openNew(); return;
      }
    } catch (err) { render(); flash(err.message); return; }
    render();
  });

  // Turns each piece to face its nearest foe (the computer's choice; adjust from there).
  function faceAll() {
    for (let o = TC.aiNext(S); o && o.type === 'face'; o = TC.aiNext(S)) TC.setFacing(S, o.id, o.dir);
  }

  function endTurn() {
    ui.sel = null;
    order(() => TC.endTurn(S));
  }

  function confirmFacing() {
    ui.sel = null;
    order(() => TC.confirmFacing(S));
  }

  function finishSetup(side) {
    TC.finishSetup(S, side);
    ui.sel = null;
    log(`${cap(side)} sets up.`);
    const next = setupSide();
    if (next && !ui.ai[next]) {
      ui.hide = side;     // pass and play: the next player sets up without seeing these
      $('passText').textContent = 'Pass to ' + cap(next);
      $('passCover').classList.add('show');
    }
    if (S.phase === 'play') {
      ui.hide = null;
      log(`— Turn 1: White —`);
      if (!ui.ai.white && !ui.ai.black) {
        $('passText').textContent = 'Pass to White: the battle begins';
        $('passCover').classList.add('show');
      }
    }
    render();
    maybeAI();
  }

  $('btnPass').onclick = () => { $('passCover').classList.remove('show'); render(); };

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.cover.show')) {
      if (e.key === 'Escape') document.querySelectorAll('.cover').forEach((c) => c.classList.remove('show'));
      return;
    }
    if (!humanTurn()) return;
    const p = selPiece();
    const arrows = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
    if (e.key === 'Escape') { ui.sel = null; render(); }
    else if (e.key === 'Enter') {
      if (S.phase === 'play' && !S.pending) endTurn();
      else if (S.phase === 'facing') confirmFacing();
      else if (S.phase === 'setup' && Object.values(TC.remaining(S, activeSide())).every((n) => !n)) finishSetup(activeSide());
    } else if (e.key in arrows && p && (S.phase === 'facing' || S.phase === 'setup') && p.side === activeSide()) {
      e.preventDefault();
      TC.setFacing(S, p.id, arrows[e.key]);
      render();
    } else if (e.key === 'a' || e.key === 'g') {
      ui.mode = e.key === 'a' ? 'attack' : 'grapple';
      render();
    }
  });

  // ---------- new game ----------

  function openNew() { $('newCover').classList.add('show'); }
  $('btnNew').onclick = openNew;
  $('btnCancelNew').onclick = () => $('newCover').classList.remove('show');
  $('btnRules').onclick = () => $('rulesCover').classList.add('show');
  $('btnCloseRules').onclick = () => $('rulesCover').classList.remove('show');
  $('optKing').onchange = () => { $('optPawns').max = $('optKing').checked ? 15 : 16; };
  $('btnStart').onclick = () => {
    const king = $('optKing').checked ? 1 : 0;
    const max = 16 - king;
    const pawn = Math.max(1, Math.min(max, parseInt($('optPawns').value, 10) || 8));
    start({ king, pawn }, $('optBlack').value === 'ai');
    $('newCover').classList.remove('show');
  };

  function start(army, blackAI) {
    S = TC.newGame({ army });
    ui.sel = null; ui.hide = null; ui.busy = false; ui.mode = 'attack';
    ui.setupType = army.king ? 'king' : 'pawn';
    ui.ai = { white: false, black: !!blackAI };
    ui.log = [];
    $('log').innerHTML = '';
    document.querySelectorAll('#dice .die').forEach((d) => drawDie(d, 6));
    $('diceText').textContent = '2d6 roll when a piece strikes.';
    buildBoard();
    log(`New game: ${army.king ? 'a king and ' : ''}${army.pawn} pawn${army.pawn === 1 ? '' : 's'} a side${blackAI ? ', Black played by the computer' : ''}.`);
    render();
  }

  // for tests and the console
  window.TCgame = { get state() { return S; }, ui, start, clickSquare, render };

  start(TC.RULES.army, false);
})();
