'use strict';
// TACTICS CHESS · THE TABLE. A flat board in the chess.com manner over the rules in rules.js (TC); the art is pieces.js.
// The rules decide everything; the table shows what happens and turns taps into orders.
(() => {
  const $ = (s) => document.querySelector(s);
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const pct = (c) => Math.round(c * 100) + '%';
  const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  let S = null; // the rules' state
  const UI = {
    sel: null,          // the selected piece's id
    act: 'attack',      // the action chosen on the hotbar
    setupType: 'king',  // what a tap in the setup zone places
    ai: { white: false, black: true },
    busy: false,        // something is playing out; input waits
    aim: null,          // waiting on a confirm: { kind: 'move', x, y, path, reactions } or { kind: 'act', act, target } or { kind: 'rally' | 'sweep' }
    hide: null,         // a side whose pieces are hidden while the other sets up
    hover: null,        // the square under the mouse
    focus: null,        // the foe in focus: its odds on the info line, its zone on the board
    last: null,         // the last move, from and to, lit like chess.com does
    log: [],
    sound: true,
    armyName: 'full',
  };

  // ---------------- the clock ----------------
  const SPEED = { v: 1 };
  const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 60) : ms * SPEED.v));

  // ---------------- sound: a few synthesized knocks ----------------
  let AC = null, noiseBuf = null;
  function ac() {
    if (!UI.sound) return null;
    try {
      if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { return null; }
    return AC;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function noise(t, freq, q, peak, dec, type = 'bandpass') { const a = AC, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t, 0.004, peak, dec); s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dec + 0.05); }
  function tone(t, type, f0, f1, peak, dec) { const a = AC, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec); env(g, t, 0.005, peak, dec); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dec + 0.05); }
  function sfx(type) {
    const a = ac(); if (!a) return; const t = a.currentTime;
    if (type === 'step') noise(t, 900, 2, 0.12, 0.06);
    else if (type === 'pick') tone(t, 'triangle', 660, 880, 0.08, 0.08);
    else if (type === 'place') { noise(t, 400, 1.5, 0.25, 0.1); tone(t, 'sine', 180, 120, 0.12, 0.12); }
    else if (type === 'dice') { for (let i = 0; i < 4; i++) noise(t + i * 0.07 + Math.random() * 0.03, 2400 + Math.random() * 1500, 4, 0.18, 0.04); }
    else if (type === 'hit') { noise(t, 300, 1, 0.5, 0.18, 'lowpass'); tone(t, 'sawtooth', 160, 60, 0.18, 0.2); }
    else if (type === 'miss') noise(t, 1600, 0.8, 0.14, 0.2);
    else if (type === 'kill') { tone(t, 'sawtooth', 120, 40, 0.25, 0.6); noise(t, 200, 0.7, 0.4, 0.5, 'lowpass'); }
    else if (type === 'turn') { tone(t, 'triangle', 392, 392, 0.1, 0.25); tone(t + 0.12, 'triangle', 523, 523, 0.1, 0.35); }
    else if (type === 'win') [392, 494, 587, 784].forEach((f, i) => tone(t + i * 0.13, 'triangle', f, f, 0.12, 0.5));
    else if (type === 'no') tone(t, 'square', 140, 110, 0.06, 0.15);
  }

  // ---------------- the board ----------------
  const N = 8;
  const boardEl = $('#board'), sqsEl = $('#sqs'), hlsEl = $('#hls'), pcsEl = $('#pcs'), fxEl = $('#fx'), floatsEl = $('#floats');
  let flip = false;   // Black's view: the board turned round
  const scr = (x, y) => (flip ? [N - 1 - x, N - 1 - y] : [x, y]);
  const place = (el, x, y) => { const [c, r] = scr(x, y); el.style.left = c * 12.5 + '%'; el.style.top = r * 12.5 + '%'; };
  const centre = (x, y) => { const [c, r] = scr(x, y); return { x: c + 0.5, y: r + 0.5 }; };   // in squares, for the fx layer
  function buildSquares() {
    sqsEl.innerHTML = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const [x, y] = flip ? [N - 1 - c, N - 1 - r] : [c, r];
      const d = document.createElement('div');
      d.className = 'sq ' + ((x + y) % 2 ? 'd' : 'l');
      d.style.left = c * 12.5 + '%'; d.style.top = r * 12.5 + '%';
      if (c === 0) d.innerHTML += `<i class="rk">${N - y}</i>`;
      if (r === N - 1) d.innerHTML += `<i class="fl">${'abcdefgh'[x]}</i>`;
      sqsEl.appendChild(d);
    }
  }
  const hls = [];
  for (let i = 0; i < N * N; i++) { const d = document.createElement('div'); d.className = 'hl'; hlsEl.appendChild(d); hls.push(d); }
  function placeHLs() { for (let i = 0; i < N * N; i++) place(hls[i], i % N, Math.floor(i / N)); }
  const marks = new Array(N * N).fill('');
  function setHL(x, y, type) { const i = y * N + x; marks[i] = marks[i] ? marks[i] + ' ' + type : type; }
  function setFlip(f) { if (f === flip) return; flip = f; buildSquares(); placeHLs(); for (const v of views.values()) { place(v.el, v.x, v.y); setFace(v, v.facing); } refreshHL(); }
  function viewSide() { return UI.ai.black && !UI.ai.white ? 'white' : UI.ai.white && !UI.ai.black ? 'black' : (S ? (S.phase === 'setup' ? setupSide() || 'white' : S.turn) : 'white'); }
  function faceSide(side) { setFlip(side === 'black'); }

  // the four arrows round a piece, to turn it
  const farrows = [0, 1, 2, 3].map((d) => {
    const b = document.createElement('div'); b.className = 'farrow'; b.dataset.dir = d; b.innerHTML = '<span></span>'; b.hidden = true;
    boardEl.appendChild(b); return b;
  });

  // ---------------- the pieces ----------------
  const views = new Map(); // piece id -> view
  function makeView(p) {
    const el = document.createElement('div');
    el.className = 'pc ' + p.side;
    el.innerHTML = `<div class="face"></div>${PIECES.pieceSVG(p.type, p.side, 'fig')}<div class="hpb"></div><div class="pin" title="Pinned"><svg viewBox="0 0 24 24" width="70%" height="70%"><path d="M12 3v10M8 3h8M8.5 13h7L12 21z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg></div><div class="fc"></div>`;
    pcsEl.appendChild(el);
    const v = { id: p.id, side: p.side, type: p.type, el, x: p.x, y: p.y, facing: p.facing, anim: false };
    place(el, p.x, p.y); setFace(v, p.facing);
    views.set(p.id, v);
    return v;
  }
  function setFace(v, f) { v.facing = f; const d = flip ? (f + 2) % 4 : f; v.el.querySelector('.face').style.transform = `rotate(${d * 90}deg)`; }
  function dropView(v) { v.el.remove(); views.delete(v.id); }
  // Brings the pieces into line with the rules.
  function sync() {
    if (!S) return;
    const living = new Set();
    for (const p of TC.alive(S)) {
      living.add(p.id);
      const v = views.get(p.id) || makeView(p);
      if (!v.anim) { if (v.x !== p.x || v.y !== p.y) { v.x = p.x; v.y = p.y; place(v.el, p.x, p.y); } if (v.facing !== p.facing) setFace(v, p.facing); }
      v.el.classList.toggle('hidden', S.phase === 'setup' && UI.hide === p.side);
      const u = TC.unit(p), hb = v.el.querySelector('.hpb'), frac = p.hp / u.hp;
      if (hb.textContent !== String(p.hp)) hb.textContent = p.hp;
      hb.className = 'hpb' + (frac <= 0.34 ? ' low' : frac <= 0.67 ? ' mid' : '') + (frac < 1 ? '' : ' full');   // shown once hurt
      v.el.querySelector('.pin').classList.toggle('on', !!p.pinned);
      v.el.title = `${cap(p.side)} ${u.name} · ${p.hp}/${u.hp} HP · faces ${TC.DIR_NAMES[p.facing]}${p.pinned ? ' · pinned' : ''}`;
    }
    for (const v of [...views.values()]) if (!living.has(v.id) && !v.dying) dropView(v);
  }

  // ---------------- effects ----------------
  function pulse(v, cls) { if (!v) return; v.el.classList.remove(cls); void v.el.offsetWidth; v.el.classList.add(cls); setTimeout(() => v.el.classList.remove(cls), 800); }
  function floatText(x, y, text, cls) {
    const el = document.createElement('div'); el.className = 'float ' + (cls || ''); el.textContent = text;
    const c = centre(x, y); el.style.left = c.x * 12.5 + '%'; el.style.top = (c.y - 0.3) * 12.5 + '%';
    floatsEl.appendChild(el); setTimeout(() => el.remove(), 1150);
  }
  function banner(text) { const b = $('#bannerTxt'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  async function stepTo(v, x, y) { v.x = x; v.y = y; place(v.el, x, y); sfx('step'); await wait(140); }
  async function lunge(a, t) {
    const [ac, ar] = scr(a.x, a.y), [tc, tr] = scr(t.x, t.y);
    a.el.style.transition = 'transform .12s ease-out';
    a.el.style.transform = `translate(${(tc - ac) * 30}%,${(tr - ar) * 30}%)`;
    await wait(130); a.el.style.transform = ''; await wait(130); a.el.style.transition = '';
  }
  async function topple(v) { v.dying = true; sfx('kill'); v.el.classList.add('dying'); await wait(480); v.dying = false; dropView(v); }
  // a shot: a line that streaks from the archer to its mark
  async function loose(a, t) {
    const p = centre(a.x, a.y), q = centre(t.x, t.y);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p.x); line.setAttribute('y1', p.y); line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
    line.setAttribute('stroke', '#ffe7a6'); line.setAttribute('stroke-width', '0.07'); line.setAttribute('stroke-linecap', 'round');
    fxEl.appendChild(line); sfx('step');
    const steps = 8;
    for (let i = 1; i <= steps; i++) { line.setAttribute('x2', p.x + (q.x - p.x) * i / steps); line.setAttribute('y2', p.y + (q.y - p.y) * i / steps); if (i > 3) { line.setAttribute('x1', p.x + (q.x - p.x) * (i - 3) / steps); line.setAttribute('y1', p.y + (q.y - p.y) * (i - 3) / steps); } await wait(22); }
    line.remove();
  }
  // the dice: two little dice tumble in the readout, then show the roll
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dieHTML = (n, side, rolling) => `<span class="die ${side}${rolling ? ' rolling' : ''}">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'p' : ''}"></i>`).join('')}</span>`;
  function rollReadout(label, res, dice) {
    const r = $('#roll'); r.style.minHeight = $('#hbInfo').offsetHeight + 'px';   // it lies over the info scroll
    $('#rollLbl').innerHTML = label; $('#rollRes').innerHTML = (dice ? `<span class="dice">${dice}</span>` : '') + res; r.classList.remove('out');
    clearTimeout(rollReadout.t); rollReadout.t = setTimeout(() => $('#roll').classList.add('out'), 2600);
  }
  async function throwDice(values, side, label) {
    sfx('dice');
    for (let i = 0; i < 7; i++) {
      rollReadout(label, '', dieHTML(1 + Math.floor(Math.random() * 6), side, true) + dieHTML(1 + Math.floor(Math.random() * 6), side, true));
      await wait(70);
    }
  }
  const diceRes = (ev, side) => dieHTML(ev.dice[0], side) + dieHTML(ev.dice[1], side);
  function clearDice() { fxEl.innerHTML = ''; }

  // ---------------- what happens: each rules event, shown ----------------
  const sqName = (x, y) => 'abcdefgh'[x] + (N - y);
  const pName = (p) => cap(p.side) + ' ' + TC.unit(p).name.toLowerCase();
  const anyPiece = (id) => S.pieces.find((q) => q.id === id);
  const ACT = TC.RULES.actions;
  const actName = (a) => ACT[a].name;
  const sideWord = (angle) => (angle === 'behind' ? 'back' : angle);
  function log(text, cls) {
    UI.log.unshift({ text, cls });
    const li = document.createElement('li'); li.className = cls || ''; li.innerHTML = text; $('#logList').prepend(li);
  }

  // One blow: attack, shot, pin, a sweep's stroke, or a free attack drawn by a move.
  async function showStrike(ev, ctx = {}) {
    const a = views.get(ev.piece), t = views.get(ev.target), ap = anyPiece(ev.piece), tp = anyPiece(ev.target);
    if (!a || !t) return;
    const fast = ctx.fast || 1;
    const what = ev.kind === 'opportunity' ? 'Attack of opportunity' : ev.kind === 'overwatch' ? 'Overwatch' : actName(ev.act);
    const notes = ev.notes && ev.notes.length ? ' · ' + ev.notes.join(', ') : '';
    const label = `${what} · ${ev.act === 'pin' ? 'pinning' : 'the ' + sideWord(ev.angle)}${notes}`;
    a.el.classList.add('anim', 'lift'); t.el.classList.add('anim');
    if (ev.kind) { floatText(a.x, a.y, ev.kind === 'overwatch' ? 'Overwatch!' : 'Opportunity!', 'info'); await wait(300 * fast); }
    await throwDice(ev.dice, ap.side, label);
    rollReadout(label, `<b>${ev.total}</b><span>vs ${ev.need}+</span>` + (!ev.hit ? '<em class="miss">MISS</em>' : ev.act === 'pin' ? '<em class="grab">PINNED</em>' : `<em class="hit">HIT −${ev.damage}</em>`), diceRes(ev, ap.side));
    await wait(220 * fast);
    if (ev.act === 'shoot' || ev.act === 'pin' || ev.kind === 'overwatch') await loose(a, t); else await lunge(a, t);
    let line = `${pName(ap)}: ${what.toLowerCase()} on ${pName(tp)} (${ev.act === 'pin' ? 'pinning shot' : sideWord(ev.angle)}${notes}), ${ev.dice[0]}+${ev.dice[1]}=${ev.total} vs ${ev.need}+, `;
    a.el.classList.remove('lift');
    if (!ev.hit) { sfx('miss'); floatText(t.x, t.y, 'Miss', 'miss'); line += 'miss.'; }
    else if (ev.act === 'pin') { sfx('place'); floatText(t.x, t.y, 'Pinned!', 'info'); pulse(t, 'blue'); line += 'pinned for a turn.'; }
    else {
      sfx('hit'); floatText(t.x, t.y, '−' + ev.damage, 'dmg'); pulse(t, 'flash'); pulse(t, 'shake');
      sync(); await wait(360);
      line += `hit for ${ev.damage}` + (ev.killed ? `. The ${TC.unit(tp).name.toLowerCase()} falls!` : ` (${tp.hp} HP left).`);
      if (ev.killed) await topple(t);
    }
    a.el.classList.remove('anim'); if (t.el) t.el.classList.remove('anim');
    log(line, ap.side);
    await wait(220 * fast);
  }

  async function show(ev, ctx = {}) {
    const fast = ctx.ai ? 0.8 : 1;
    if (ev.type === 'move') {
      const v = views.get(ev.piece), p = anyPiece(ev.piece);
      const re = (at, kind) => ev.reactions.filter((r) => r.at === at && r.ev.kind === kind);
      v.anim = true; v.el.classList.add('anim', 'lift');
      let dead = false;
      for (const r of re(-1, 'opportunity')) { await showStrike(r.ev, { fast }); if (r.ev.killed) dead = true; }
      for (let i = 0; i < ev.path.length && !dead; i++) {
        await stepTo(v, ev.path[i][0], ev.path[i][1]);
        for (const r of [...re(i, 'overwatch'), ...re(i, 'opportunity')]) { await showStrike(r.ev, { fast }); if (r.ev.killed) dead = true; }
      }
      v.anim = false; v.el.classList.remove('anim', 'lift');
      UI.last = { from: ev.from, to: { x: p.x, y: p.y } };
      log(`${pName(p)} moves ${sqName(ev.from.x, ev.from.y)} → ${sqName(p.x, p.y)}${ev.died ? ', and falls on the way' : ''}.`, p.side);
      if (ev.winner) await gameOver();
    } else if (ev.type === 'stay') {
      const p = anyPiece(ev.piece); log(`${pName(p)} holds its ground.`, p.side);
    } else if (ev.type === 'strike') {
      await showStrike(ev, { fast });
      if (ev.winner) await gameOver();
    } else if (ev.type === 'sweep') {
      pulse(views.get(ev.piece), 'spin'); await wait(400);
      for (const s of ev.strikes) await showStrike(s, { fast: 0.7 });
      if (ev.winner) await gameOver();
    } else if (ev.type === 'rally') {
      const a = views.get(ev.piece), p = anyPiece(ev.piece);
      sfx('turn'); floatText(a.x, a.y, 'Rally!', 'info'); pulse(a, 'glow');
      for (const h of ev.healed) { const v = views.get(h.id); if (v) { floatText(v.x, v.y, '+' + h.amount, 'heal'); pulse(v, 'glow'); } }
      for (const id of ev.unpinned) { const v = views.get(id); if (v) floatText(v.x, v.y, 'Free!', 'info'); }
      log(`${pName(p)} rallies: ${ev.healed.length ? ev.healed.length + ' healed' : 'no one hurt'}${ev.unpinned.length ? ', ' + ev.unpinned.length + ' freed' : ''}.`, p.side);
      sync(); await wait(800);
    } else if (ev.type === 'push') {
      const a = views.get(ev.piece), t = views.get(ev.target), ap = anyPiece(ev.piece), tp = anyPiece(ev.target);
      if (!ev.auto) {
        await throwDice(ev.dice, ap.side, 'Push');
        rollReadout('Push', `<b>${ev.total}</b><span>vs ${ev.need}+</span>` + (ev.hit ? '<em class="grab">SHOVED</em>' : '<em class="miss">HELD</em>'), diceRes(ev, ap.side));
        await wait(250);
      } else rollReadout('Push · braced', '<em class="grab">SURE</em>');
      if (ev.steps) {
        sfx('hit'); a.anim = t.anim = true;
        const [fx, fy] = [Math.sign(ev.to.x - ev.from.x), Math.sign(ev.to.y - ev.from.y)];
        for (let i = 1; i <= ev.steps; i++) { t.x = ev.from.x + fx * i; t.y = ev.from.y + fy * i; place(t.el, t.x, t.y); a.x = ev.pawnFrom.x + fx * i; a.y = ev.pawnFrom.y + fy * i; place(a.el, a.x, a.y); await wait(180); }
        a.anim = t.anim = false;
        floatText(t.x, t.y, ev.steps > 1 ? 'Pushed 2!' : 'Pushed!', 'info'); pulse(t, 'shake');
      } else { await lunge(a, t); floatText(t.x, t.y, 'Held', 'miss'); sfx('miss'); }
      log(`${pName(ap)} pushes ${pName(tp)}${ev.auto ? ', braced by an ally' : `: ${ev.dice[0]}+${ev.dice[1]}=${ev.total} vs ${ev.need}+`}, ${ev.steps ? `${ev.steps} square${ev.steps > 1 ? 's' : ''} back.` : 'but it holds.'}`, ap.side);
    } else if (ev.type === 'grapple') {
      const a = views.get(ev.piece), t = views.get(ev.target), ap = anyPiece(ev.piece), tp = anyPiece(ev.target);
      await throwDice(ev.dice, ap.side, 'Grapple');
      rollReadout('Grapple', `<b>${ev.total}</b><span>vs ${ev.need}+</span>` + (ev.hit ? '<em class="grab">CAUGHT</em>' : '<em class="miss">MISS</em>'), diceRes(ev, ap.side));
      await lunge(a, t);
      if (ev.hit) { sfx('place'); floatText(t.x, t.y, ev.options.length ? 'Caught!' : 'No room', 'info'); pulse(t, 'blue'); }
      else { sfx('miss'); floatText(t.x, t.y, 'Miss', 'miss'); }
      log(`${pName(ap)} grapples ${pName(tp)}: ${ev.dice[0]}+${ev.dice[1]}=${ev.total} vs ${ev.need}+, ${ev.hit ? (ev.options.length ? 'caught!' : 'caught, but there is no room.') : 'miss.'}`, ap.side);
    } else if (ev.type === 'shove') {
      const tp = TC.piece(S, ev.target);
      if (ev.moved) { sfx('place'); log(`${pName(tp)} is dragged ${sqName(ev.from.x, ev.from.y)} → ${sqName(ev.to.x, ev.to.y)}.`, TC.other(tp.side)); }
      sync(); await wait(200);
    } else if (ev.type === 'wait') {
      const p = anyPiece(ev.piece); log(`${pName(p)} waits.`, p.side);
    } else if (ev.type === 'facing') {
      if (!UI.ai[S.turn]) sfx('turn');
    } else if (ev.type === 'turn') {
      log(`Turn ${ev.turnNo}: ${cap(ev.side)}`, 'hdr');
      sfx('turn');
      if (!UI.ai[ev.side] && !UI.ai[TC.other(ev.side)]) { faceSide(ev.side); banner(`${cap(ev.side)}'s turn`); }   // pass and play: the board turns for the player
    }
    sync(); refresh();
  }

  async function gameOver() {
    sfx('win');
    banner(`${cap(S.winner)} wins`);
    log(`${cap(S.winner)} wins!`, 'hdr');
    await wait(1500);
    const lost = TC.other(S.winner), hadKing = S.pieces.some((p) => p.side === lost && p.type === 'king');
    $('#endTxt').textContent = `${cap(S.winner)} wins`;
    $('#endSub').textContent = hadKing ? `The ${lost} king has fallen.` : `The ${lost} army is wiped out.`;
    $('#end').hidden = false;
  }

  // Runs one rules order and shows it. Errors from the rules come back as a word on the info line.
  // Once the piece has acted, the turn goes straight on to its facing.
  async function order(fn) {
    if (UI.busy) return null;
    UI.busy = true; UI.aim = null; refresh();
    let ev = null;
    try {
      ev = fn(); await show(ev);
      const a = S.active != null ? TC.piece(S, S.active) : null;
      if (S.phase === 'play' && !S.pending && !UI.ai[S.turn]) {
        if (S.active != null && !a) { await wait(400); TC.endTurn(S); await show(TC.confirmFacing(S)); }   // it fell on its way
        else if (a && a.acted) { await wait(250); await show(TC.endTurn(S)); }
      }
    } catch (e) { say(e.message); sfx('no'); }
    finally { UI.busy = false; }
    sync(); refresh();
    runAI();
    return ev;
  }

  // ---------------- the computer ----------------
  async function runAI() {
    if (!S || UI.busy || S.phase === 'over') return;
    const side = activeSide();
    if (!side || !UI.ai[side]) return;
    UI.busy = true; UI.sel = null; refresh();
    try {
      if (S.phase === 'setup') {
        TC.autoPlace(S, side); TC.finishSetup(S, side); sync();
        log(`${cap(side)} sets up.`, side); sfx('place');
        await wait(500);
        if (S.phase === 'play') await startBattle();
      }
      while ((S.phase === 'play' || S.phase === 'facing') && UI.ai[S.turn]) {
        const o = TC.aiNext(S);
        if (o.id != null && o.type !== 'face') { UI.sel = o.id; refreshHL(); }
        await wait(o.type === 'face' ? 40 : o.type === 'move' || o.type === 'stay' ? 380 : 240);
        const ev = TC.apply(S, o);
        if (o.type === 'end') log(`${cap(S.turn)} ends the turn.`, S.turn);
        await show(ev, { ai: true });
      }
    } catch (e) { console.error(e); }
    finally { UI.busy = false; }
    sync(); refresh();
    if (S.phase === 'setup' || ((S.phase === 'play' || S.phase === 'facing') && UI.ai[S.turn])) runAI();
  }

  async function startBattle() {
    UI.hide = null; sync();
    log('Turn 1: White', 'hdr');
    if (!UI.ai.white && !UI.ai.black) faceSide('white');
    banner("White's turn"); sfx('turn');
  }

  // ---------------- state helpers ----------------
  const setupSide = () => (S.phase !== 'setup' ? null : !S.ready.white ? 'white' : !S.ready.black ? 'black' : null);
  const activeSide = () => (S.phase === 'setup' ? setupSide() : S.turn);
  const humanTurn = () => S && S.phase !== 'over' && !UI.ai[activeSide()] && !UI.busy;
  const selPiece = () => (UI.sel != null ? TC.piece(S, UI.sel) : null);
  const myPiece = () => { const p = selPiece(); return p && p.side === activeSide() && humanTurn() ? p : null; };
  const step = () => (S.phase === 'facing' ? 'facing' : S.phase === 'play' ? S.step : S.phase);

  // A piece is always picked on your turn: in the move phase the one you chose (front first to begin with); after that,
  // the piece that took the turn.
  function autoSelect() {
    if (!S || (S.phase !== 'play' && S.phase !== 'facing') || S.pending || UI.ai[S.turn]) return;
    if (S.active != null && TC.piece(S, S.active)) { UI.sel = S.active; }
    else if (S.phase === 'play') {
      const p = selPiece();
      if (!p || p.side !== S.turn) {
        const list = TC.alive(S, S.turn).sort((a, b) => (S.turn === 'white' ? a.y - b.y : b.y - a.y) || Math.abs(a.x - 3.5) - Math.abs(b.x - 3.5));
        UI.sel = list.length ? list[0].id : null;
      }
    }
    const q = selPiece();
    if (q && q.side === S.turn && !TC.unit(q).actions.includes(UI.act)) UI.act = TC.unit(q).actions[0];
  }

  // What the chosen action can reach from where the piece stands.
  function targets() {
    const p = myPiece(), out = new Map();
    if (!p || S.phase !== 'play' || S.step !== 'action' || p.acted || S.pending) return out;
    for (const t of TC.targetsFor(S, p.id, UI.act)) out.set(t.target, t.info);
    return out;
  }
  // The move phase: each square the piece could go to, with its path and the free attacks it would draw.
  function moves() {
    const p = myPiece(), out = new Map();
    if (!p || S.phase !== 'play' || S.step !== 'move' || S.pending) return out;
    for (const r of TC.reachable(S, p.id).values()) if (r.dist) out.set(r.x + ',' + r.y, { ...r, reactions: TC.reactionsFor(S, p, r.path) });
    return out;
  }

  // ---------------- the board marks ----------------
  function refreshHL() {
    marks.fill('');
    farrows.forEach((b) => { b.hidden = true; });
    for (const v of views.values()) v.el.querySelector('.fc').classList.remove('on', 'focus');
    const paint = () => { for (let i = 0; i < N * N; i++) { const c = 'hl ' + marks[i]; if (hls[i].className !== c) hls[i].className = c; } };
    if (!S || S.phase === 'over') return paint();
    const side = activeSide();
    if (UI.last && S.phase !== 'setup') { setHL(UI.last.from.x, UI.last.from.y, 'last'); setHL(UI.last.to.x, UI.last.to.y, 'last'); }
    if (S.phase === 'setup' && side && !UI.ai[side]) {
      for (const y of TC.setupRows(S, side)) for (let x = 0; x < N; x++) if (!TC.pieceAt(S, x, y)) setHL(x, y, UI.hover && UI.hover.x === x && UI.hover.y === y ? 'zonehot' : 'zone');
    }
    if (S.phase === 'play' && S.pending) { for (const c of S.pending.options) setHL(c.x, c.y, 'shove'); return paint(); }
    // the zone of the piece in focus: where it strikes at anything leaving (pawn, rook) or entering (bishop)
    const f = UI.focus != null ? TC.piece(S, UI.focus) : null;
    if (f && S.phase === 'play' && !UI.busy) for (const [x, y] of TC.zoneSquares(S, f)) setHL(x, y, 'zoneE');
    const p = selPiece();
    if (p && !(S.phase === 'setup' && UI.hide === p.side)) setHL(p.x, p.y, 'sel');
    if (UI.busy) return paint();
    const mine = myPiece();
    if (mine && (S.phase === 'facing' || S.phase === 'setup')) {
      TC.DIRS.forEach(([dx, dy], d) => {
        const x = mine.x + dx, y = mine.y + dy, b = farrows[d];
        if (!TC.onBoard(S, x, y)) return;
        place(b, x, y); b.hidden = false; b.classList.toggle('on', d === mine.facing);
        b.firstChild.style.transform = `rotate(${(flip ? (d + 2) % 4 : d) * 90}deg)`;
      });
    }
    if (S.phase !== 'play' || !mine) return paint();
    if (S.step === 'move') {
      for (const r of moves().values()) {
        const hot = UI.hover && UI.hover.x === r.x && UI.hover.y === r.y;
        setHL(r.x, r.y, r.reactions.length ? (hot ? 'riskhot' : 'risk') : hot ? 'movehot' : 'move');
      }
      if (UI.aim && UI.aim.kind === 'move') {
        for (const [x, y] of UI.aim.path.slice(0, -1)) setHL(x, y, 'path');
        setHL(UI.aim.x, UI.aim.y, 'dest');
        for (const re of UI.aim.reactions) { const q = TC.piece(S, re.reactor); if (q) setHL(q.x, q.y, 'aim'); }
      }
      return paint();
    }
    // the action phase
    const T = targets();
    if (UI.act === 'rally') {
      for (const q of TC.alive(S, mine.side)) if (q !== mine && Math.max(Math.abs(q.x - mine.x), Math.abs(q.y - mine.y)) <= ACT.rally.range) setHL(q.x, q.y, 'ally');
      return paint();
    }
    if (UI.act === 'sweep') {
      const t = T.get(null); if (t) for (const id of t.foes) { const e = TC.piece(S, id); setHL(e.x, e.y, 'aim'); }
      return paint();
    }
    for (const [id, i] of T) {
      const e = TC.piece(S, id), v = views.get(id);
      setHL(e.x, e.y, UI.aim && UI.aim.target === id ? 'aim' : 'target');
      const fc = v.el.querySelector('.fc');
      const full = innerWidth >= 700 || UI.focus === id || (UI.aim && UI.aim.target === id);
      const head = i.damage ? `<b>−${i.damage}</b>` : `<b>${UI.act === 'pin' ? 'Pin' : UI.act === 'push' ? 'Push' : 'Grab'}</b>`;
      const html = head + `<i>${full && i.angle ? sideWord(i.angle) + ' ' : ''}${pct(i.chance)}</i>` + (i.damage && i.damage >= e.hp ? '<i>· kill</i>' : '');
      if (fc._k !== html) { fc._k = html; fc.innerHTML = html; }
      fc.classList.add('on'); fc.classList.toggle('grab', !i.damage);
      fc.classList.toggle('focus', UI.focus === id || (UI.aim && UI.aim.target === id));
    }
    paint();
  }

  // ---------------- the dock ----------------
  const ICON = {
    attack: '<path d="M19 4l-9 9"/><path d="M19 4h-4M19 4v4"/><path d="M7.5 10.5l6 6"/><path d="M10 14l-5 5"/><path d="M4 18l2 2"/>',
    shoot: '<path d="M5 19L19 5"/><path d="M13 5h6v6"/><path d="M5 19l1.5-4M5 19l4-1.5"/><path d="M4 9c2-4 7-6 11-5M9 20c5 1 9-4 11-11"/>',
    push: '<path d="M3 12h11"/><path d="M10 7l5 5-5 5"/><path d="M19 4v16"/>',
    grapple: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5M14 10.5V6.5a1.5 1.5 0 0 1 3 0V12M17 11.5V10a1.5 1.5 0 0 1 3 0v3.5c0 4-3 7-7 7-3 0-5-1.5-6.5-4L4 12.5a1.5 1.5 0 0 1 2.6-1.5L8 13"/>',
    pin: '<path d="M12 3v11"/><path d="M8 3h8"/><path d="M9 14h6l-3 7z"/><path d="M5 21h14"/>',
    sweep: '<path d="M4 15a8 8 0 0 1 15-4"/><path d="M15 11h4V7"/><circle cx="12" cy="16" r="2" class="f"/>',
    rally: '<path d="M6 21V4"/><path d="M6 4h12l-3 4 3 4H6"/>',
    stay: '<circle cx="12" cy="12" r="3" class="f"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
    wait: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
    undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 0 1 0 10h-2"/>',
    next: '<path d="M5 12h12"/><path d="M13 7l5 5-5 5"/><circle cx="5" cy="12" r="1.5" class="f"/>',
    left: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>',
    right: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
    foes: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" class="f"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    king: '<path d="M11 2h2v2h2v2h-2v2.5h-2V6H9V4h2z" class="f"/><path d="M8 10c2.5-1.5 5.5-1.5 8 0l-1.5 8h-5z"/><path d="M6 21h12M7 18h10"/>',
    queen: '<path d="M5 8l2 9h10l2-9-4 4-3-6-3 6z"/><path d="M6 21h12"/><circle cx="12" cy="4.5" r="1.3" class="f"/>',
    rook: '<path d="M6 4h2.5v2h2V4h3v2h2V4H18v4l-2 2v7h2v4H6v-4h2v-7L6 8z"/>',
    bishop: '<path d="M12 3c3 3 4 6 2 9h-4c-2-3-1-6 2-9z"/><path d="M9 12h6l1 6H8z"/><path d="M6 21h12"/>',
    knight: '<path d="M7 21h10l-1.5-6c2-1.5 2.5-4 1-7L13 4l-1.5 2L8 9l-1.5 4 2 1 3-2.5L7 21z"/>',
    pawn: '<circle cx="12" cy="6.5" r="3"/><path d="M9.5 10.5h5l-.8 2c1.6 1.8 2.3 3.6 2.6 5.5H7.7c.3-1.9 1-3.7 2.6-5.5z"/><path d="M6 21h12"/>',
    remove: '<path d="M6 6l12 12M18 6L6 18"/>',
    auto: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  };
  const HUE = { attack: 4, shoot: 100, push: 25, grapple: 38, pin: 215, sweep: 330, rally: 48, stay: 180, wait: 210, undo: 260, next: 160, left: 200, right: 200, foes: 0, king: 42, queen: 300, rook: 20, bishop: 120, knight: 260, pawn: 30, remove: 0, auto: 120, clear: 20 };
  const PIECES_ORDER = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
  let hotActions = [];
  function hotButton(spec, i) {
    const b = document.createElement('button');
    b.className = 'hk' + (spec.sel ? ' sel' : '') + (spec.off ? ' off' : '');
    b.style.setProperty('--hue', HUE[spec.icon]);
    b.setAttribute('aria-label', `${i + 1}: ${spec.label}${spec.off ? ' (' + spec.off + ')' : ''}`);
    b.innerHTML = `<span class="ic"><svg viewBox="0 0 24 24">${ICON[spec.icon]}</svg></span><span class="key">${i + 1}</span>${spec.dv != null ? `<span class="dv">${spec.dv}</span>` : ''}<span class="lb">${spec.label}</span>`;
    b.onclick = () => pressHot(i);
    return b;
  }
  function pressHot(i) {
    const spec = hotActions[i]; if (!spec) return;
    ac();
    if (spec.off) { say(spec.off); sfx('no'); const b = $('#hotbar').children[i]; if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } return; }
    sfx('pick'); spec.run();
  }

  let sayMsg = null, sayT = 0;
  function say(msg) { sayMsg = msg; clearTimeout(sayT); sayT = setTimeout(() => { sayMsg = null; renderDock(); }, 2800); renderDock(); }

  const pieceIcon = (p) => `<span class="ubadge ${p.side}"><span><svg viewBox="0 0 24 24" style="stroke:#e3d6b9;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">${ICON[p.type]}</svg></span></span>`;
  function renderTop() {
    const p = (UI.focus != null ? TC.piece(S, UI.focus) : null) || selPiece();
    const who = $('#uwho');
    if (p && !(S.phase === 'setup' && UI.hide === p.side)) {
      const u = TC.unit(p);
      const st = p.pinned ? 'pinned' : u.role;
      who.className = 'uwho ' + p.side;
      who.innerHTML = `${pieceIcon(p)}<span class="nm">${cap(p.side)} ${u.name}</span><span class="hpw"><span class="hpn"><i>${p.hp}</i>/${u.hp}</span><span class="hpb"><i style="width:${p.hp / u.hp * 100}%"></i></span></span><span class="st">${st}</span>`;
    } else { who.className = 'uwho'; who.innerHTML = `<span class="nm">Tactics Chess</span>`; }
    const side = activeSide();
    const tl = $('#turnLbl');
    tl.textContent = S.phase === 'setup' ? `Setup · ${cap(side || 'white')}` : S.phase === 'over' ? `${cap(S.winner)} wins` : `T${S.turnNo} · ${cap(S.turn)}`;
    tl.className = 'rnd ' + (S.phase === 'over' ? S.winner : side || 'white');
    $('#armies').innerHTML = TC.SIDES.map((s) => `<span class="tok ${s}${s === side ? ' on' : ''}" title="${cap(s)}: pieces left"><span>${TC.alive(S, s).length}</span></span>`).join('');
  }

  // The three phases of a turn, with the current one lit.
  function phases(now) {
    return `<span class="phs">${['move', 'action', 'facing'].map((s, i) => `<i class="${s === now ? 'on' : ['move', 'action', 'facing'].indexOf(now) > i ? 'done' : ''}">${cap(s)}</i>`).join('<b>›</b>')}</span>`;
  }

  function renderDock() {
    if (!S) return;
    renderTop();
    const info = $('#hbInfo'), bar = $('#hotbar'), end = $('#endBtn'), pill = $('#goPill');
    const side = activeSide(), p = myPiece();
    let title = '', meta = '', text = '', ph = '';
    hotActions = [];
    pill.hidden = !UI.aim || UI.busy;
    pill.textContent = UI.aim && UI.aim.kind === 'move' ? 'Move here?' : 'Confirm?';
    end.classList.remove('go', 'pulse');
    $('#endLbl').textContent = 'End';
    $('#bar').classList.remove('wrap');
    if (S.phase === 'over') {
      title = `${cap(S.winner)} wins`; text = 'Open the menu for a new game.'; end.disabled = true;
    } else if (UI.ai[side] || UI.busy) {
      title = UI.ai[side] ? `${cap(side)} is thinking` : ''; text = UI.ai[side] ? 'The computer is playing its turn.' : '';
      end.disabled = true;
    } else if (S.phase === 'setup') {
      const left = TC.remaining(S, side);
      title = `${cap(side)} sets up`; meta = 'Back two rows';
      for (const t of PIECES_ORDER) if (S.army[t]) hotActions.push({ icon: t, label: TC.RULES.units[t].name, dv: '×' + left[t], sel: UI.setupType === t && !p, off: left[t] ? null : `Every ${t} is placed`, run: () => { UI.setupType = t; UI.sel = null; refresh(); } });
      hotActions.push({ icon: 'remove', label: 'Remove', off: p ? null : 'Tap a placed piece first', run: () => { TC.unplace(S, p.id); UI.sel = null; sync(); refresh(); } });
      hotActions.push({ icon: 'auto', label: 'Auto', run: () => { TC.autoPlace(S, side); UI.sel = null; sfx('place'); sync(); refresh(); } });
      hotActions.push({ icon: 'clear', label: 'Clear', run: () => { TC.clearSide(S, side); UI.sel = null; sync(); refresh(); } });
      $('#bar').classList.add('wrap');
      const done = Object.values(left).every((n) => n === 0);
      end.disabled = !done; $('#endLbl').textContent = 'Done'; end.classList.toggle('go', done); end.classList.toggle('pulse', done);
      if (p) text = `<b>${TC.unit(p).name}</b>: ${TC.unit(p).text} <i>Tap an <b>arrow</b> round it to turn it, or an empty ember square to move it.</i>`;
      else if (!done) text = `<b>${TC.RULES.units[UI.setupType].name}</b>: ${TC.RULES.units[UI.setupType].text} <i>Tap an <b>ember square</b> to place one.</i>`;
      else text = `<i>All placed. Turn your pieces with the arrows, then tap <b>Done</b>.</i>`;
    } else if (S.phase === 'facing') {
      ph = phases('facing');
      const sp = p;
      title = sp ? TC.unit(sp).name : 'Facing';
      hotActions.push({ icon: 'left', label: 'Turn left', off: sp ? null : 'Tap one of your pieces first', run: () => face(sp, (sp.facing + 3) % 4) });
      hotActions.push({ icon: 'right', label: 'Turn right', off: sp ? null : 'Tap one of your pieces first', run: () => face(sp, (sp.facing + 1) % 4) });
      hotActions.push({ icon: 'foes', label: 'Face foe', off: sp ? null : 'Tap one of your pieces first', run: () => { const e = nearestFoe(sp); if (e) face(sp, dirTo(sp, e)); } });
      end.disabled = false; $('#endLbl').textContent = 'Done'; end.classList.add('go');
      const zone = sp && TC.unit(sp).zoc === 'opportunity' ? ' Its <b>zone</b> is the three squares ahead.' : sp && TC.unit(sp).zoc === 'overwatch' ? ' It <b>overwatches</b> the lane straight ahead.' : '';
      text = sp ? `<i>Tap an <b>arrow</b> round it or swipe from it to turn it, then <b>Done</b>. Foes strike hardest from behind.${zone}</i>` : '<i>No piece took the turn. You may tap one piece to turn it, then tap <b>Done</b>.</i>';
    } else if (S.phase === 'play' && S.pending) {
      ph = phases('action'); title = 'Grapple'; meta = 'Caught'; text = '<i>Tap a <b>yellow</b> square to drag the foe there.</i>';
      hotActions.push({ icon: 'undo', label: 'Leave it', run: () => order(() => TC.resolveGrapple(S, null)) });
      end.disabled = true;
    } else if (S.phase === 'play' && p && S.step === 'move') {
      ph = phases('move');
      const u = TC.unit(p);
      title = u.name; meta = u.role;
      hotActions.push({ icon: 'stay', label: 'Stay', off: S.active != null && S.active !== p.id ? 'Another piece took the turn' : null, run: () => { UI.aim = null; order(() => TC.stay(S, p.id)); } });
      hotActions.push({ icon: 'next', label: 'Next', run: () => cycle(1) });
      end.disabled = false;
      const m = moves(), risky = [...m.values()].some((r) => r.reactions.length);
      let hint;
      if (p.pinned) hint = 'It is <b>pinned</b>: it cannot move this turn. Tap <b>Stay</b> to act from here, or pick another piece.';
      else if (UI.aim && UI.aim.kind === 'move') hint = UI.aim.reactions.length ? `<b>Careful:</b> ${UI.aim.reactions.map((r) => `${pName(TC.piece(S, r.reactor))} gets a free ${r.kind === 'overwatch' ? 'shot' : 'attack'}`).join('; ')}. Tap <b>Move here?</b> to go anyway.` : 'Tap <b>Move here?</b> (or the square again) to go, anywhere else to choose again.';
      else hint = `Tap a <b>blue</b> square, then confirm.${risky ? ' <b>Amber</b> squares draw a free attack.' : ''} Or <b>Stay</b> to act from here. Tap another piece to use it instead.`;
      text = `${u.text} <i>${hint}</i>`;
    } else if (S.phase === 'play' && p && S.step === 'action') {
      ph = phases('action');
      const u = TC.unit(p);
      for (const a of u.actions) {
        const any = a === 'rally' || TC.targetsFor(S, p.id, a).length > 0;
        const need = a === 'attack' ? u.attack.need : a === 'shoot' ? u.shoot.need : ACT[a].need;
        hotActions.push({ icon: a, label: actName(a), dv: need ? need + '+' : null, sel: UI.act === a, run: () => { UI.act = a; UI.aim = null; refresh(); if (!any) say(`Nothing to ${actName(a).toLowerCase()} from here`); } });
      }
      hotActions.push({ icon: 'wait', label: 'Skip', run: () => { UI.aim = null; order(() => TC.wait(S, p.id)); } });
      const canUndo = !p.acted && (p.from || !p.movedDist);
      hotActions.push({ icon: 'undo', label: 'Undo', off: canUndo ? null : 'A move that drew a free attack cannot be taken back', run: () => { UI.aim = null; order(() => TC.undoMove(S, p.id)); } });
      title = actName(UI.act);
      const need = UI.act === 'attack' ? u.attack.need : UI.act === 'shoot' ? u.shoot.need : ACT[UI.act].need;
      meta = need ? `${need}+ on 2d6 · ${pct(TC.chance2d6(need))}${UI.act === 'push' ? ' · sure when braced' : ''}` : 'Sure';
      const T = targets();
      let hint;
      if (UI.act === 'rally' || UI.act === 'sweep') hint = UI.aim ? 'Tap <b>Confirm?</b> to go.' : UI.act === 'sweep' && !T.size ? 'No foe round her.' : `Tap <b>${actName(UI.act)}</b> again, or Confirm, to go.`;
      else if (UI.aim) hint = 'Tap <b>Confirm?</b> or the foe again to go.';
      else if (T.size) hint = `Tap a <b>red</b> foe. Or <b>Skip</b>, and set its facing.`;
      else hint = `Nothing in reach for ${actName(UI.act).toLowerCase()}. Try another action, or <b>Skip</b>.`;
      let desc = ACT[UI.act].text;
      if (UI.act === 'attack') desc = `${u.attack.dmg} damage, ${u.attack.dmg * 2} to the back.${u.attack.front === 'ranged' ? ' Not the front of a melee foe.' : ''}${u.charge ? ` +${TC.RULES.chargeBonus} after riding ${TC.RULES.chargeDist}+ squares.` : ''}${u.reach8 ? ' Diagonals too.' : ''}`;
      if (UI.act === 'shoot') desc = `${u.shoot.dmg} damage (${u.shoot.dmg * 2} to the back), first foe along a rank or file up to ${u.shoot.range}, over friends; not diagonally. Cover +${TC.RULES.coverBonus}.`;
      const fl = focusLine();
      text = fl || `${desc} <i>${hint}</i>`;
      if (UI.act === 'rally' || UI.act === 'sweep') { const b = hotActions.find((h) => h.icon === UI.act); if (b) { const run = b.run; b.run = () => { if (UI.act === b.icon && !UI.aim) { UI.aim = { kind: UI.act }; refresh(); } else if (UI.aim && UI.aim.kind === b.icon) doAct(UI.aim); else run(); }; } }
      end.disabled = false;
    } else if (S.phase === 'play') {
      title = `${cap(S.turn)}'s turn`; text = '<i>Tap one of your pieces, or <b>End</b> to pass.</i>';
      hotActions.push({ icon: 'next', label: 'Next', run: () => cycle(1) });
    }
    if (sayMsg) text = `<em class="bl">${sayMsg}.</em> ` + text;
    info.innerHTML = `<div class="tx"><b>${title}</b><span class="mt">${meta}</span>${ph}</div><div class="tx2">${text}</div>`;
    bar.innerHTML = '';
    hotActions.forEach((s, i) => bar.appendChild(hotButton(s, i)));
    $('#bar').classList.toggle('labels', hotActions.length > 0);
  }
  function focusLine() {
    const id = UI.aim && UI.aim.target != null ? UI.aim.target : UI.focus; if (id == null) return '';
    const i = targets().get(id), e = TC.piece(S, id); if (!i || !e) return '';
    const notes = i.notes && i.notes.length ? ` (${i.notes.join(', ')})` : '';
    const what = UI.act === 'pin' ? 'to pin it for a turn' : UI.act === 'push' ? (i.auto ? 'sure, braced by your ally: shove it up to 2 back' : 'to shove it back a square') : UI.act === 'grapple' ? 'to drag it a square' : `for <b>${i.damage}</b>${i.damage >= e.hp ? ' · it dies on a hit' : ''}`;
    return `<b>${pName(e)}</b>${i.angle ? `: its <b>${sideWord(i.angle)}</b>` : ''} · ${i.auto ? '' : `${i.need}+ (${pct(i.chance)}) `}${what}${notes}.`;
  }

  function refresh() { autoSelect(); refreshHL(); renderDock(); }

  function cycle(dir) {
    if (S.active != null) { say('Another piece took the turn'); return; }
    const side = activeSide(), list = TC.alive(S, side).sort((a, b) => (side === 'white' ? a.y - b.y : b.y - a.y) || a.x - b.x);
    if (!list.length) return;
    const i = list.findIndex((q) => q.id === UI.sel);
    UI.sel = list[(i + dir + list.length) % list.length].id; UI.aim = null; UI.focus = null; refresh();
  }
  function nearestFoe(p) {
    let best = null, bd = Infinity;
    for (const e of TC.alive(S, TC.other(p.side))) { const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  const dirTo = (p, e) => (Math.abs(e.x - p.x) >= Math.abs(e.y - p.y) ? (e.x > p.x ? 1 : 3) : (e.y > p.y ? 2 : 0));
  function face(p, d) {
    if (!p) return;
    try { const ev = TC.setFacing(S, p.id, d); const v = views.get(p.id); if (v) turnTo(v, ev.facing, 140); sfx('pick'); } catch (e) { say(e.message); }
    refresh();
  }
  function doAct(aim) {
    const p = myPiece(); if (!p) return;
    UI.aim = null; UI.focus = null;
    order(() => TC.act(S, p.id, aim.kind === 'act' ? aim.act : aim.kind, aim.target != null ? aim.target : null));
  }

  function turnTo(v, f) { setFace(v, f); }

  // ---------------- input ----------------
  // The square under a point, and where in it (0..1 across, in board terms).
  function pick(cx, cy) {
    const r = boardEl.getBoundingClientRect();
    const fx = (cx - r.left) / r.width * N, fy = (cy - r.top) / r.height * N;
    let c = Math.floor(fx), w = Math.floor(fy);
    if (c < 0 || w < 0 || c >= N || w >= N) return { cell: null, piece: null };
    const [x, y] = flip ? [N - 1 - c, N - 1 - w] : [c, w];
    const q = S ? TC.pieceAt(S, x, y) : null;
    return { cell: { x, y }, piece: q && !(S.phase === 'setup' && UI.hide === q.side) ? q.id : null };
  }

  async function tap(h, arrow) {
    if (!humanTurn()) return;
    ac();
    const side = activeSide(), sel = myPiece();
    if (arrow != null && sel && (S.phase === 'setup' || S.phase === 'facing')) { face(sel, arrow); return; }
    const q = h.piece != null ? TC.piece(S, h.piece) : null;
    if (S.phase === 'setup') {
      if (q && q.side === side) { if (UI.sel === q.id) face(q, (q.facing + 1) % 4); else { UI.sel = q.id; sfx('pick'); refresh(); } return; }
      if (h.cell && !q && TC.inSetupZone(S, side, h.cell.x, h.cell.y)) {
        try {
          if (sel) { TC.relocate(S, sel.id, h.cell.x, h.cell.y); UI.sel = null; }
          else {
            TC.place(S, side, UI.setupType, h.cell.x, h.cell.y);
            if (!TC.remaining(S, side)[UI.setupType]) { const next = PIECES_ORDER.find((t) => TC.remaining(S, side)[t] > 0); if (next) UI.setupType = next; }
          }
          sfx('place');
        } catch (e) { say(e.message); sfx('no'); }
        sync(); refresh(); return;
      }
      UI.sel = null; refresh(); return;
    }
    if (S.phase === 'facing') {
      if (q && q.side === S.turn) {
        if (S.active != null && S.active !== q.id) { say('Only the piece that took the turn can turn'); sfx('no'); refresh(); return; }
        if (UI.sel === q.id) face(q, (q.facing + 1) % 4); else { UI.sel = q.id; sfx('pick'); refresh(); }
      }
      return;
    }
    if (S.phase !== 'play') return;
    if (S.pending) {
      if (h.cell && S.pending.options.some((c) => c.x === h.cell.x && c.y === h.cell.y)) await order(() => TC.resolveGrapple(S, h.cell.x, h.cell.y));
      return;
    }
    // something waiting on a confirm: the same square or foe again goes; anything else cancels it and counts afresh
    if (UI.aim) {
      const a = UI.aim;
      if (a.kind === 'move' && h.cell && h.cell.x === a.x && h.cell.y === a.y && !q) { await go(a); return; }
      if (a.kind === 'act' && q && q.id === a.target) { doAct(a); return; }
      UI.aim = null;
    }
    if (q && q.side === S.turn) {
      if (S.active != null && S.active !== q.id) { say('One piece a turn: undo the move to pick another'); sfx('no'); refresh(); return; }
      UI.sel = q.id; UI.focus = null; sfx('pick'); refresh(); return;
    }
    if (q) {
      // a foe: in the action phase, a target; otherwise, a look at it and its zone
      if (sel && S.step === 'action') {
        const i = targets().get(q.id);
        if (i) { UI.aim = { kind: 'act', act: UI.act, target: q.id }; UI.focus = q.id; sfx('pick'); refresh(); return; }
        UI.focus = q.id;
        say(sel.acted ? 'This piece has acted' : explainNo(sel, q)); sfx('no'); refresh(); return;
      }
      UI.focus = UI.focus === q.id ? null : q.id; refresh(); return;
    }
    UI.focus = null;
    if (sel && S.step === 'move' && h.cell) {
      const m = moves().get(h.cell.x + ',' + h.cell.y);
      if (m) { UI.aim = { kind: 'move', x: m.x, y: m.y, path: m.path, reactions: m.reactions }; sfx('pick'); refresh(); return; }
    }
    refresh();
  }
  function explainNo(p, t) {
    const u = TC.unit(p);
    if (UI.act === 'attack' && u.attack && u.attack.front === 'ranged' && TC.sideStruck(t, p.x, p.y) === 'front' && Math.abs(t.x - p.x) + Math.abs(t.y - p.y) === 1 && !TC.unit(t).ranged) return `A ${u.name.toLowerCase()} cannot attack the front of a melee foe`;
    if (UI.act === 'push') return 'A push needs the foe right in front, with an empty square behind it';
    if (UI.act === 'shoot' || UI.act === 'pin') return 'Not in a clear line within 4 squares';
    return 'Out of reach from here';
  }
  async function go(aim) {
    const p = myPiece(); if (!p) return;
    UI.aim = null;
    await order(() => TC.move(S, p.id, aim.x, aim.y));
  }

  // pointer: a tap; a drag from your piece (move it, or turn it while setting facing)
  let down = null;
  boardEl.addEventListener('pointerdown', (e) => {
    if (!S) return;
    const fa = e.target.closest('.farrow');
    if (fa) { e.preventDefault(); tap({ cell: null, piece: null }, +fa.dataset.dir); return; }
    boardEl.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, h: pick(e.clientX, e.clientY), drag: null };
  });
  boardEl.addEventListener('pointermove', (e) => {
    if (!S) return;
    if (!down) {
      if (e.pointerType !== 'mouse') return;
      const c = pick(e.clientX, e.clientY).cell;
      if ((c && (!UI.hover || c.x !== UI.hover.x || c.y !== UI.hover.y)) || (!c && UI.hover)) { UI.hover = c; if (!UI.busy) refreshHL(); }
      return;
    }
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.drag && Math.hypot(dx, dy) > 10) {
      const q = down.h.piece != null ? TC.piece(S, down.h.piece) : null;
      if (q && humanTurn() && q.side === activeSide()) {
        if (S.phase === 'facing' && (S.active == null || S.active === q.id)) down.drag = 'face';
        else if (S.phase === 'setup' || (S.phase === 'play' && S.step === 'move' && !S.pending && (S.active == null || S.active === q.id))) down.drag = 'piece';
        else down.drag = 'none';
        if (down.drag !== 'none') { UI.sel = q.id; UI.aim = null; refresh(); }
        if (down.drag === 'piece') { const v = views.get(q.id); v.el.classList.add('anim', 'lift'); v.el.style.transition = 'none'; down.v = v; down.rect = boardEl.getBoundingClientRect(); }
      } else down.drag = 'none';
    }
    if (down.drag === 'face') {
      const p = selPiece(); if (!p) return;
      const r = boardEl.getBoundingClientRect(), c = centre(p.x, p.y);
      const sx = e.clientX - (r.left + c.x / N * r.width), sy = e.clientY - (r.top + c.y / N * r.height);
      if (Math.hypot(sx, sy) < r.width / N * 0.3) return;
      let d = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 1 : 3) : (sy > 0 ? 2 : 0);
      if (flip) d = (d + 2) % 4;
      if (d !== p.facing) face(p, d);
    } else if (down.drag === 'piece') {
      // the piece follows the finger
      const [c0, r0] = scr(down.v.x, down.v.y);
      down.v.el.style.left = ((e.clientX - down.rect.left) / down.rect.width * 100 - 6.25) + '%';
      down.v.el.style.top = ((e.clientY - down.rect.top) / down.rect.height * 100 - 6.25) + '%';
      void c0; void r0;
      const c = pick(e.clientX, e.clientY).cell;
      if (c && (!UI.hover || c.x !== UI.hover.x || c.y !== UI.hover.y)) { UI.hover = c; refreshHL(); }
    }
  });
  boardEl.addEventListener('pointerup', async (e) => {
    if (!down) return;
    const d = down; down = null;
    if (!d.drag) { await tap(d.h); return; }
    if (d.drag === 'piece') {
      const h = pick(e.clientX, e.clientY); UI.hover = null;
      d.v.el.style.transition = ''; d.v.el.classList.remove('anim', 'lift'); place(d.v.el, d.v.x, d.v.y);
      const p = myPiece(); if (!p || !h.cell || (h.cell.x === p.x && h.cell.y === p.y)) { refresh(); return; }
      if (S.phase === 'setup') { UI.sel = p.id; await tap({ piece: null, cell: h.cell }); return; }
      // a drag is deliberate: it moves at once (free attacks and all)
      const m = moves().get(h.cell.x + ',' + h.cell.y);
      if (m) { await go(m); return; }
    }
    refresh();
  });
  boardEl.addEventListener('pointercancel', () => { if (down && down.v) { down.v.el.style.transition = ''; place(down.v.el, down.v.x, down.v.y); } down = null; });
  boardEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !down) { UI.hover = null; if (S && !UI.busy) refreshHL(); } });

  $('#endBtn').onclick = () => {
    ac();
    if (!humanTurn()) return;
    UI.aim = null; UI.focus = null;
    if (S.phase === 'setup') finishSetup();
    else if (S.phase === 'play') order(() => TC.endTurn(S));
    else if (S.phase === 'facing') { UI.sel = null; order(() => TC.confirmFacing(S)); }
  };
  $('#goPill').onclick = () => {
    if (!UI.aim || !humanTurn()) return;
    if (UI.aim.kind === 'move') go(UI.aim); else doAct(UI.aim);
  };

  function finishSetup() {
    const side = activeSide();
    try { TC.finishSetup(S, side); } catch (e) { say(e.message); return; }
    UI.sel = null; log(`${cap(side)} sets up.`, side); sfx('place');
    const next = setupSide();
    if (next && !UI.ai[next]) {
      UI.hide = side;
      $('#passTxt').textContent = 'Pass to ' + cap(next);
      $('#passSub').textContent = `${cap(next)} sets up without seeing ${cap(side)}'s pieces.`;
      $('#pass').hidden = false;
      faceSide(next); UI.setupType = PIECES_ORDER.find((t) => S.army[t]);
    }
    sync(); refresh();
    if (S.phase === 'play') {
      if (!UI.ai.white && !UI.ai.black) { $('#passTxt').textContent = 'Pass to White'; $('#passSub').textContent = 'Both armies are on the board. The battle begins.'; $('#pass').hidden = false; }
      startBattle().then(refresh);
    }
    runAI();
  }
  $('#passGo').onclick = () => { $('#pass').hidden = true; sync(); refresh(); };

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.ov:not([hidden])')) { if (e.key === 'Escape') document.querySelectorAll('.ov').forEach((o) => { if (o.id !== 'title' || S) o.hidden = true; }); return; }
    if (!S) return;
    if (e.key >= '1' && e.key <= '9') { pressHot(+e.key - 1); return; }
    if (!humanTurn()) return;
    const p = myPiece();
    const arrows = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
    if (e.key === 'Escape') { UI.aim = null; UI.focus = null; refresh(); }
    else if (e.key === 'Enter') { if (UI.aim) $('#goPill').click(); else $('#endBtn').click(); }
    else if (e.key in arrows && p && (S.phase === 'facing' || S.phase === 'setup')) {
      e.preventDefault();
      face(p, flip ? (arrows[e.key] + 2) % 4 : arrows[e.key]);   // the arrow keys follow the screen
    }
  });

  // ---------------- menu and sheets ----------------
  $('#menuBtn').onclick = () => { ac(); $('#menu').hidden = !$('#menu').hidden; };
  document.addEventListener('pointerdown', (e) => { if (!$('#menu').hidden && !e.target.closest('#menu,#menuBtn')) $('#menu').hidden = true; });
  $('#menu').onclick = (e) => {
    const b = e.target.closest('.mi'); if (!b) return;
    $('#menu').hidden = true;
    const m = b.dataset.m;
    if (m === 'new') { $('#goBack').hidden = !S; $('#title').hidden = false; }
    else if (m === 'view') setFlip(!flip);
    else if (m === 'log') $('#logOv').hidden = false;
    else if (m === 'help') $('#help').hidden = false;
    else if (m === 'sound') { UI.sound = !UI.sound; $('#soundLbl').textContent = UI.sound ? 'On' : 'Off'; }
  };
  document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { b.closest('.ov').hidden = true; }; });
  {
    const el = $('#optArmy');
    el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); UI.armyName = b.dataset.v; };
  }
  $('#goAI').onclick = () => { ac(); newGame(true); };
  $('#goHot').onclick = () => { ac(); newGame(false); };
  $('#goHelp').onclick = () => { $('#help').hidden = false; };
  $('#goBack').onclick = () => { $('#title').hidden = true; };
  $('#endNew').onclick = () => { $('#end').hidden = true; $('#goBack').hidden = true; $('#title').hidden = false; };
  $('#endLook').onclick = () => { $('#end').hidden = true; };

  function newGame(vsAI) {
    for (const v of [...views.values()]) dropView(v);
    clearDice();
    const army = TC.RULES.armies[UI.armyName || 'full'];
    S = TC.newGame({ army });
    Object.assign(UI, { sel: null, act: 'attack', aim: null, hide: null, focus: null, busy: false, log: [], setupType: PIECES_ORDER.find((t) => army[t]), ai: { white: false, black: !!vsAI } });
    $('#logList').innerHTML = '';
    const n = Object.values(army).reduce((a, b) => a + b, 0);
    log(`New game: ${n} pieces a side${vsAI ? ', against the computer' : ', pass and play'}.`, 'hdr');
    $('#title').hidden = true; $('#end').hidden = true;
    faceSide('white');
    sync(); resize(); refresh();
    banner('Set up your army');
  }

  // ---------------- layout ----------------
  function resize() {
    const top = $('#top').getBoundingClientRect().height, dock = $('#dock').getBoundingClientRect().height;
    const W = innerWidth, H = innerHeight, pad = 10;
    const avail = H - top - dock - pad * 2;
    const size = Math.floor(Math.max(220, Math.min(W - 16, avail, 760)));
    boardEl.style.width = boardEl.style.height = size + 'px';
    boardEl.style.left = Math.round((W - size) / 2) + 'px';
    boardEl.style.top = Math.round(top + pad + Math.max(0, (avail - size) / 2)) + 'px';
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe($('#dock'));
  buildSquares(); placeHLs(); resize();

  // for tests and the console: the screen point at the middle of a square
  function screenOf(x, y) { const r = boardEl.getBoundingClientRect(), c = centre(x, y); return { x: r.left + c.x / N * r.width, y: r.top + c.y / N * r.height }; }
  window.TCtable = { get state() { return S; }, UI, newGame, tap, pick, refresh: () => { sync(); refresh(); }, screenOf, pressHot, views, SPEED };
})();
