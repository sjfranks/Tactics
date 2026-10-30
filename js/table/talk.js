'use strict';
// GOBLIN CRYPT · THE TABLE · dialogue: speech bubbles, barks and scenes (the words are in js/dialogue.js)
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- dialogue: scenes between battles, barks in the fight (the words are in js/dialogue.js) ----------------
const DLG = (typeof DIALOGUE !== 'undefined' && DIALOGUE) || { scenes: [], barks: {} };
let showBarks = true;
try { showBarks = localStorage.getItem('gc-barks') !== '0'; } catch (e) { }
const speakerName = k => (GC.UNITS[k] || {}).name || k;
const lastLine = new Map();
// a line from a list, never the same one twice running; {name} is filled in
function line(list, vars = {}) {
  if (!list || !list.length) return null;
  let i = Math.floor(Math.random() * list.length); if (list.length > 1 && lastLine.get(list) === i) i = (i + 1) % list.length; lastLine.set(list, i);
  return list[i].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
const linesFor = (trigger, kind) => { const b = DLG.barks[trigger]; return b && (b[kind] || b['*']); };
// a speech bubble over a figure's head, which follows it about; the line goes into the combat log too
const bubbles = [];
function say(u, text, dur = 2600) {
  if (!u || !text || QUIET) return;
  bubbles.filter(b => b.u === u).forEach(b => { b.el.remove(); bubbles.splice(bubbles.indexOf(b), 1); });
  const el = document.createElement('div'); el.className = 'bubble' + (u.side === 'gob' ? ' gob' : ''); el.textContent = text;
  $('#floats').appendChild(el); bubbles.push({ u, el, t0: performance.now(), dur: dur + text.length * 25 });
  logEvent(`<b>${u.name}:</b> “${text}”`, 'say');
}
function updateBubbles(t) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i], k = (t - b.t0) / b.dur, u = b.u;
    if (k >= 1 || !u.root.parent) { b.el.remove(); bubbles.splice(i, 1); continue; }
    const [x, y, z] = project(tmpV.copy(u.root.position).setY(u.root.position.y + u.piece.position.y + u.h * .9 + .45));
    b.el.style.display = z < 1 && !u.viewFaded ? '' : 'none';
    b.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; b.el.style.opacity = k < .06 ? k / .06 : k > .85 ? (1 - k) / .15 : 1;
  }
}
// a bark now and then: never two on top of each other, and the big moments always speak
let barkAt = 0, lastStrike = null;
function bark(u, trigger, vars, chance = 1, always = false) {
  if (!showBarks || !u || !u.alive || QUIET || ffwd) return;
  const now = performance.now(); if (!always && (now - barkAt < 2800 || Math.random() > chance)) return;
  const t = line(linesFor(trigger, u.kind), vars); if (!t) return;
  barkAt = now; say(u, t);
}
function barkFor(e) {
  const by = id => (id != null ? vu(id) : null);
  if (e.t === 'strike') lastStrike = e;
  else if (e.t === 'damage') {
    const t = vu(e.id), a = by(e.from);
    if (a && a.side === 'hero' && e.crit && e.hp > 0) bark(a, 'crit', {}, .7);
    else if (t && t.side === 'hero' && e.hp > 0 && e.hp <= t.maxHp * .3) bark(t, 'hurt', {}, .8);
  } else if (e.t === 'kill') { const a = by(e.from), t = vu(e.id); if (a && a.side === 'hero' && t && !t.def.boss) bark(a, 'kill', {}, .45); }
  else if (e.t === 'miss') { const a = lastStrike && lastStrike.to === e.id ? by(lastStrike.id) : null; if (a && a.side === 'hero') bark(a, 'miss', {}, .35); }
  else if (e.t === 'down') { const t = vu(e.id), w = heroes().find(h => h.kind === 'cleric') || heroes()[0]; if (t && w) bark(w, 'allyDown', { name: t.name.replace('Sister ', '') }, 1, true); }
  else if (e.t === 'heal') { const t = vu(e.id); if (e.revive) bark(t, 'revived', {}, 1, true); else if (UI.active && UI.active.kind === 'cleric') bark(UI.active, 'heal', {}, .3); }
  else if (e.t === 'status' && e.on && e.key === 'taunt') bark(vu(e.id), 'taunt', {}, 1, true);
  else if (e.t === 'status' && e.on && e.key === 'hidden') bark(vu(e.id), 'hide', {}, .8);
  else if (e.t === 'turn') { const u = vu(e.id); if (u && u.side === 'gob') bark(u, 'foeTurn', {}, .14); }
  else if (e.t === 'smashMark') bark(vu(e.id), 'smash', {}, 1, true);
  else if (e.t === 'spawn') bark(units.find(x => x && x.alive && x.def.boss), 'horn', {}, 1, true);
  else if (e.t === 'wake') bark(vu(e.id), 'wake', {}, .7);
  else if (e.t === 'rout') bark(vu(e.ids[0]), 'rout', {}, 1, true);
}
// a talk: the speakers take turns in the box at the foot of the screen; tap for the next line, Skip to end it
function talk(lines) {
  if (!lines || !lines.length) return Promise.resolve();
  const box = $('#talk'), tx = $('#talkText'); let i = -1, typing = null, done;
  const show = () => {
    if (++i >= lines.length) return end();
    const [who, text] = lines[i], u = units.find(x => x && x.kind === who && x.root.parent), d = GC.UNITS[who] || {};
    if (u) { focusOn(u.root.position); if (u.side === 'gob') playClip(u, 'roar'); }
    $('#talkFace').innerHTML = `<span>${face(who)}</span>`; $('#talkFace').className = 'ubadge' + (d.side === 'gob' ? ' gob' : '');
    $('#talkName').textContent = speakerName(who); tx.textContent = ''; tx.dataset.full = text;
    if (!/^\*/.test(text)) logEvent(`<b>${speakerName(who)}:</b> “${text}”`, 'say');
    let n = 0; clearInterval(typing); sfx('pick');
    typing = setInterval(() => { n += 2; tx.textContent = text.slice(0, n); if (n >= text.length) { clearInterval(typing); typing = null; } }, 22);
  };
  const next = () => { ac(); if (typing) { clearInterval(typing); typing = null; tx.textContent = tx.dataset.full; return; } show(); };
  const end = () => { clearInterval(typing); box.hidden = true; box.onclick = null; window.removeEventListener('keydown', key, true); done(); };
  const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') end(); else next(); } };
  return new Promise(res => {
    done = res; box.hidden = false;
    box.onclick = e => { if (e.target.closest('#talkSkip')) { ac(); end(); } else next(); };
    window.addEventListener('keydown', key, true);
    show();
  });
}
