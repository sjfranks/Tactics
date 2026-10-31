'use strict';
// GOBLIN CRYPT · THE TABLE · the HUD: dock, hotbar, odds over targets, foe intents
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- HUD / dock ----------------
function updateHud() {
  const r = $('#roundLbl'); r.textContent = `R${UI.round}`; r.className = 'rnd' + (UI.phase === 'gob' ? ' gob' : '');
}
function refresh() { refreshHL(); renderDock(); }
const grabbedId = () => UI.aim && UI.aim[0] === 'g' ? +UI.aim.slice(1) : null;
const myHero = () => { const u = UI.sel; return u && u === UI.active && u.side === 'hero' && u.alive && !u.down && UI.phase === 'player' && !UI.over && G ? u : null; };
// the board marks for the hero on turn: where they can walk, how far the chosen ability reaches, what it can be used on
function refreshHL() {
  HL.forEach(h => h.visible = false); HLM.forEach(h => h.visible = false);
  edges.forEach(m => m.visible = false); edgeUsed = 0;
  computeForecast(); renderFc();
  if (UI.phase !== 'player' || UI.over || UI.busy || !G) return;
  if (showThreat) for (const k of G.threat()) { const q = GC.parseKey(k); setHL(q.c, q.r, 'threat', q.l); }
  const u = myHero(); if (!u) return;
  const r = ru(u), card = UI.card && CARDS[UI.card], blk = card ? G.block(r, UI.card) : '';
  const zone = card && card.range > 1 && !blk ? G.rangeCells(r, G.reachOf(r, card), !!card.reach) : null;
  if (zone) { for (const k of zone) { const q = GC.parseKey(k); setHL(q.c, q.r, 'range', q.l); } outline(zone, rangeEdgeMat, .44); }
  UI.climbShown = false;
  if (r.ap > 0) {
    const area = new Set([key(u.c, u.r, u.l)]);
    for (const n of G.reach(r).values()) if (n.end && n.cost > 0) { area.add(key(n.c, n.r, n.l)); setHL(n.c, n.r, n.cl ? 'climb' : 'move', n.l); if (n.cl) UI.climbShown = true; }
    outline(area);
  }
  if (!card || blk) return;
  const tg = G.targets(r, UI.card, { grab: grabbedId() });
  if (card.target === 'cell') {
    if (card.wall) { if (UI.aim) { const q = GC.parseKey(UI.aim); G.wallCells(q.c, q.r, UI.wallDir).forEach(([c, rr]) => setHL(c, rr, 'area')); } }
    else if (card.spot) { for (const e of tg.values()) setHL(e.cell.c, e.cell.r, UI.aim === key(e.cell.c, e.cell.r, e.cell.l) ? 'area' : 'ally', e.cell.l); }
    else if (UI.aim) { const q = GC.parseKey(UI.aim); for (let rr = q.r - 1; rr <= q.r + 1; rr++) for (let c = q.c - 1; c <= q.c + 1; c++) if (inB(c, rr) && (q.l ? hasDeck(c, rr) : !G.obstAt(c, rr))) setHL(c, rr, 'area', q.l); }
  } else if (card.target === 'self') setHL(u.c, u.r, 'self', u.l);
  else if (card.target === 'grab') { for (const e of tg.values()) { if (e.unit != null) { const t = vu(e.unit); if (t) cellsOf(t).forEach(([c, rr]) => setHL(c, rr, UI.aim === 'g' + t.id ? 'self' : t.side === u.side ? 'ally' : 'target', t.l || 0)); } else setHL(e.cell.c, e.cell.r, 'area', e.cell.l); } }
  else for (const e of tg.values()) { const q = e.unit != null ? vu(e.unit) : e.ice; if (q) cellsOf(q).forEach(([c, rr]) => setHL(c, rr, card.target === 'ally' ? 'ally' : e.path ? 'far' : 'target', q.l || 0)); }
}
// ---------------- the odds: what the chosen ability is likely to do to each target ----------------
// the rules run the attack many times over (without touching the battle); the table shows the average damage and the
// chance to finish the target over its head, and the full odds for the one under the pointer
const fcCache = new Map(); // the odds hold still until the board changes: cleared after every order
function computeForecast() {
  UI.fc.clear();
  const u = myHero(), id = UI.card, card = id && CARDS[id]; if (!u || !card || UI.busy) return;
  const r = ru(u); if (G.block(r, id)) return;
  const put = (t, from) => { const k = `${id}|${t.id}|${key(from.c, from.r, from.l)}`; let f = fcCache.get(k); if (f === undefined) { f = G.forecast(r, id, t, from, 900); fcCache.set(k, f); } if (f) UI.fc.set(t.id, f); };
  if (card.atk || card.heal) { for (const e of G.targets(r, id).values()) if (e.unit != null) put(G.U(e.unit), e.path ? e.path[e.path.length - 1] : r); }
  else if (card.sweep) G.sweepTargets(r, id).forEach(tid => put(G.U(tid), r));
  else if (card.area && UI.aim) G.blastAt(GC.parseKey(UI.aim)).forEach(t => put(t, r));
}
const pct = x => x >= .995 ? '100%' : x < .01 ? '<1%' : Math.round(x * 100) + '%';
function renderFc() {
  for (const u of units) {
    if (!u || !u.alive) continue;
    const el = u.tag.querySelector('.fc'), f = UI.fc.get(u.id);
    const html = !f ? '' : f.heal != null ? `<b class="hl">${f.revive ? 'Raise' : '+' + f.heal.toFixed(1)}</b>` : `<b>${f.avg < .95 ? '−<1' : '−' + Math.round(f.avg)}</b>${f.kill >= .01 ? `<i>KO ${pct(f.kill)}</i>` : ''}`;
    if (el._k !== html) { el._k = html; el.innerHTML = html; el.classList.toggle('on', !!html); el.classList.toggle('heal', !!f && f.heal != null); el.classList.toggle('ff', !!f && f.heal == null && u.side === 'hero'); }
  }
}
function fcLine(id) {
  const f = UI.fc.get(id), t = vu(id); if (!f || !t) return '';
  if (f.heal != null) return `<b>${shortName(t)}</b>: ~${f.heal.toFixed(1)} HP${f.revive ? ', and they rise' : f.need < f.heal ? ` (${f.need} missing)` : ''}`;
  return `<b>${shortName(t)}</b>: hit <b>${pct(1 - f.miss)}</b> · ~${f.avg.toFixed(1)} damage${f.kill >= .01 ? ` · KO <b>${pct(f.kill)}</b>` : ''}${f.armour ? ` · armour ${f.armour}` : ''}`;
}
function renderDock() {
  renderTools();
  { const wc = UI.card && CARDS[UI.card] && CARDS[UI.card].wall && UI.phase === 'player' && !UI.busy, rb = $('#rotBtn'); rb.hidden = !wc; rb.querySelector('span').textContent = UI.wallDir === 'v' ? 'Down' : 'Across'; }
  const end = $('#endBtn'), act = UI.active && G ? G.U(UI.active.id) : null;
  end.disabled = UI.phase !== 'player' || UI.busy || UI.over;
  end.classList.toggle('pulse', !end.disabled && !!act && act.ap <= 0);
  const u = UI.inspect || UI.sel || UI.active;
  renderUnitPanel(u); renderTokens();
  const h = myHero(), hr = h && ru(h);
  let hint;
  if (UI.phase === 'intro' || UI.over) hint = '';
  else if (UI.phase !== 'player') hint = (UI.active ? shortName(UI.active) + "'s turn" : "Goblins' turn") + (ffwd ? ' · <b>fast-forward</b>' : ' · <b>tap</b> to speed up');
  else if (UI.confirm) hint = 'Tap <b>Confirm?</b> or the target again to go';
  else if (UI.busy) hint = '';
  else if (h && UI.card) { const cd = CARDS[UI.card]; hint = (cd.target === 'grab' && grabbedId() != null ? HINTS.grabTo : HINTS[cd.spot ? 'spot' : cd.target]) + (cd.die && cd.target !== 'ally' && (hr.atks || 0) > 0 ? ` · <b class="dis">disadvantage${hr.atks > 1 ? ' ×' + hr.atks : ''}</b>` : ''); }
  else if (h) hint = hr.ap > 0 ? 'Tap a <b>blue</b> square or drag to move · 1 action' + (UI.climbShown ? ' · <b>chevrons</b> mark a climb' : '') : '';
  else if (UI.sel && UI.sel.down) hint = `${UI.sel.name} is down`;
  else hint = 'Tap a hero to use their abilities';
  // the hotbar: one button per ability, numbered; the line above it explains the chosen (or last tapped) one
  const bar = $('#hotbar'), box = $('#hbInfo');
  bar.innerHTML = '';
  if (!h) { box.innerHTML = `<span class="tx2">${hint || (UI.phase === 'player' ? 'Tap a hero' : '')}</span>`; measure(); return; }
  const pg = hbPageOf(h), ids = G.cardsOf(hr);
  $('#pgNum').textContent = pg + 1; $('#hbPager').setAttribute('aria-label', `Hotbar ${pg + 1} of ${HB_PAGES}`);
  for (let i = 0; i < HB_SLOTS; i++) {
    const id = ids[pg * HB_SLOTS + i];
    if (!id) { const e = document.createElement('div'); e.className = 'hk empty'; e.setAttribute('aria-hidden', 'true'); e.innerHTML = `<span class="key">${i + 1}</span>`; bar.appendChild(e); continue; }
    const c = CARDS[id], block = G.block(hr, id), [hue, art] = ART[id], cd = hr.cd[id] > 0 ? hr.cd[id] : 0, dn = G.diceName(hr, id);
    const b = document.createElement('button'); b.className = 'hk' + (UI.card === id ? ' sel' : '') + (block ? ' off' : ''); b.style.setProperty('--hue', hue); b.dataset.id = id;
    b.setAttribute('aria-label', `${i + 1}: ${G.cardName(hr, id)}. ${G.cardText(hr, id)}${block ? ' (' + block + ')' : ''}`); b.setAttribute('aria-pressed', UI.card === id ? 'true' : 'false');
    b.innerHTML = `<span class="ic"><svg viewBox="0 0 24 24">${art}</svg></span><span class="key">${i + 1}</span>${dn ? `<span class="dv">${dn}</span>` : ''}${c.uses != null ? `<span class="us">×${hr.uses[id] || 0}</span>` : ''}${cd ? `<span class="cd">${cd}</span>` : ''}`;
    b.onclick = () => { if (!hbSwiped) hotTap(h, id); };
    bar.appendChild(b);
  }
  const show = UI.peek && ids.includes(UI.peek) ? UI.peek : UI.card, focus = UI.fcFocus != null && UI.fc.has(UI.fcFocus) ? fcLine(UI.fcFocus) : '';
  if (show) {
    const c = CARDS[show], blk = G.block(hr, show);
    const cdn = G.cardCd(hr, show), meta = [c.cost, c.target === 'self' ? 'Self' : c.range > 1 || c.reach ? `Range ${G.reachOf(hr, c)}` : 'Melee', cdn ? `Cooldown ${cdn}` : '', c.uses != null ? `${hr.uses[show] || 0} left` : ''].filter(Boolean).join(' · ');
    box.innerHTML = `<span class="tx"><b>${G.cardName(hr, show)}</b><span class="mt">${meta}</span></span><span class="tx2">${focus ? `<span class="odds">${focus}</span>` : `${blk ? `<em class="bl">${blk}.</em> ` : ''}${G.cardText(hr, show)}${!blk && hint ? ` <i>${hint}</i>` : ''}`}</span>`;
  } else box.innerHTML = `<span class="tx2">${hint || ''}</span>`;
  measure();
}
// a tap on a hotbar button: choose it; a second tap uses a self ability; a blocked one shakes and says why
// 25 slots: five hotbars of five, paged with the arrows beside the bar, a sideways swipe on it, or [ and ]
const HB_SLOTS = 5, HB_PAGES = 5;
let hbSwiped = false;
const hbPageOf = h => Math.min(HB_PAGES - 1, UI.hbPage[h.kind] || 0);
function hbPage(d) {
  const h = UI.sel; if (!h || h.side !== 'hero') return;
  UI.hbPage[h.kind] = (hbPageOf(h) + d + HB_PAGES) % HB_PAGES; UI.peek = null; sfx('pick'); renderDock();
  const bar = $('#hotbar'); bar.classList.remove('in-l', 'in-r'); void bar.offsetWidth; bar.classList.add(d > 0 ? 'in-r' : 'in-l');
}
$('#pgUp').onclick = () => { ac(); hbPage(-1); };
$('#pgDn').onclick = () => { ac(); hbPage(1); };
(() => { // drag sideways on the bar to page through it; the bar follows the finger a little, then snaps to the next page
  const row = $('#hbRow'), bar = $('#hotbar'); let g = null;
  row.addEventListener('pointerdown', e => { if (e.target.closest('#hbPager')) return; g = { x: e.clientX, done: false }; hbSwiped = false; bar.style.transition = 'none'; });
  window.addEventListener('pointermove', e => {
    if (!g || g.done) return; const dx = e.clientX - g.x;
    if (Math.abs(dx) > 8) hbSwiped = true;
    bar.style.transform = `translateX(${Math.max(-40, Math.min(40, dx * .5))}px)`;
    if (Math.abs(dx) > 44) { g.done = true; bar.style.transition = ''; bar.style.transform = ''; hbPage(dx < 0 ? 1 : -1); }
  });
  const up = () => { if (!g) return; g = null; bar.style.transition = ''; bar.style.transform = ''; setTimeout(() => { hbSwiped = false; }, 0); };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
})();
function hotTap(h, id) {
  ac();
  if (UI.confirm) { UI.confirm(false); return; }
  if (UI.busy || UI.phase !== 'player' || UI.over) return;
  const block = G.block(ru(h), id);
  if (block) { UI.peek = id; sfx('select'); renderDock(); const el = document.querySelector(`.hk[data-id="${id}"]`); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } return; }
  UI.peek = null;
  if (UI.card === id && CARDS[id].target === 'self') { useCard(h, id, null); return; } // tap a chosen self ability again to use it
  UI.card = id; UI.aim = null; UI.fcFocus = null; sfx('pick'); refresh(); tipsNow();
}
window.addEventListener('keydown', e => { // 1–5 pick abilities, Escape puts the chosen one down
  const h = myHero(); if (e.ctrlKey || e.metaKey || e.altKey || !h) return;
  const k = +e.key, id = k >= 1 && k <= HB_SLOTS ? G.cardsOf(ru(h))[hbPageOf(h) * HB_SLOTS + k - 1] : null; if (id) { e.preventDefault(); hotTap(h, id); }
  else if (e.key === ']' || e.key === '[') { e.preventDefault(); hbPage(e.key === ']' ? 1 : -1); }
  else if (e.key === 'Escape' && UI.card) { UI.card = null; UI.aim = null; UI.peek = null; refresh(); }
});
// one pip per action this turn: lit while unspent, and the ones a move would spend flash
function renderPips(u) {
  const r = G.U(u.id), max = Math.max(r.apMax || 2, r.ap), cost = +(u.tag.dataset.cost || 0), k = r.ap + '/' + max + '/' + cost;
  if (u._pk === k) return; u._pk = k;
  u.tag.querySelector('.ap').innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i >= r.ap ? 'off' : i >= r.ap - cost ? 'spend' : ''}"></i>`).join('');
}
function previewCost(u, cost) {
  units.forEach(x => { if (x && x.tag) delete x.tag.dataset.cost; });
  if (u && cost) u.tag.dataset.cost = Math.min(cost, ru(u).ap);
}
// ---------------- tips: a word of advice the first time something comes up ----------------
const TIPS = {
  move: 'Each hero has 3 actions a turn: the orange pips over their head. Tap a blue square to walk there for 1 action, or pick an ability on the bar below.',
  odds: 'The numbers over a foe are your odds with the chosen ability: the damage to expect, and the chance to finish it (KO).',
  intents: 'The red arrows show what each goblin means to do next; the bold one acts next. Step out of reach, hide or Taunt, and watch them change.',
  down: "A hero at 0 HP is down, not dead. Sister Wenna's Heal raises them, and the goblins leave the fallen alone.",
  vents: 'Fire vents erupt every second round, and they pulse the round before. Step off them, or leave a goblin standing on one.',
  undo: 'Changed your mind? Undo, in the ☰ menu (or Z), takes back a move or an ability that threw no dice.'
};
let tipsSeen = {};
try { tipsSeen = JSON.parse(localStorage.getItem('gc-tips') || '{}') || {}; } catch (e) { }
function tip(id) {
  if (tipsSeen[id] || !TIPS[id] || QUIET || !$('#coach').hidden || UI.phase !== 'player') return;
  tipsSeen[id] = 1; try { localStorage.setItem('gc-tips', JSON.stringify(tipsSeen)); } catch (e) { }
  $('#coachText').textContent = TIPS[id]; $('#coach').hidden = false;
  clearTimeout(tip.t); tip.t = setTimeout(() => { $('#coach').hidden = true; }, 14000);
}
$('#coachOk').onclick = () => { $('#coach').hidden = true; clearTimeout(tip.t); sfx('pick'); };
// the tips that fit the moment, once the table is still
function tipsNow() {
  if (UI.phase !== 'player' || UI.busy || UI.over) return;
  if (!tipsSeen.move) return tip('move');
  if (UI.fc.size && [...UI.fc.values()].some(f => f.heal == null)) return tip('odds');
  if (UI.intents.some(i => i.it.kind === 'attack')) tip('intents');
  if (tipsSeen.intents && G.B.vents.length) tip('vents');
  if (tipsSeen.intents && undoStack.length) tip('undo');
}

// ---------------- foe intents ----------------
// a curved arrow from each goblin to the hero it means to strike (red) or the goblin it means to mend (green), and a
// dotted line to where it would walk; the next goblin to act draws bold
let showIntents = true;
try { showIntents = localStorage.getItem('gc-intents') !== '0'; } catch (e) { }
const INT = { pool: [], used: 0 };
function intentPath(cls) {
  let p = INT.pool[INT.used];
  if (!p) { p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); $('#intents').appendChild(p); INT.pool.push(p); }
  INT.used++; if (p._c !== cls) { p._c = cls; p.setAttribute('class', cls); } p.style.display = ''; return p;
}
function drawIntents() {
  INT.used = 0;
  if (showIntents && UI.phase === 'player' && !UI.busy && !UI.over && !UI.confirm && !drag) for (const { g, it, next } of UI.intents) {
    if (!g.alive || g.viewFaded) continue;
    const a = project(tmpV.copy(g.root.position).setY(g.root.position.y + g.h * .95));
    let b;
    if (it.to != null) { const t = vu(it.to); if (!t || !t.alive) continue; b = project(tmpV.copy(t.root.position).setY(t.root.position.y + t.h * .55)); }
    else if (it.kind === 'approach' && it.e) { const q = posOf(g, it.e.c, it.e.r, it.e.l); b = project(q.setY(q.y + .04)); }
    else continue;
    if (a[2] > 1 || b[2] > 1) continue;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 14) continue;
    const bend = Math.min(70, len * .28), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - bend;
    intentPath('it ' + it.kind + (next ? ' next' : '') + (UI.inspect === g ? ' focus' : '')).setAttribute('d', `M${a[0].toFixed(1)},${a[1].toFixed(1)}Q${mx.toFixed(1)},${my.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`);
  }
  for (let i = INT.used; i < INT.pool.length; i++) if (INT.pool[i].style.display !== 'none') INT.pool[i].style.display = 'none';
}

