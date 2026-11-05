'use strict';
// GOBLIN CRYPT · THE TABLE · pointer and keyboard input, and the buttons
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- input ----------------
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new V3(0, 1, 0), -TOP);
// the highest floor under the pointer: try each step height from the top down
function groundAt(x, y) {
  ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const p = new V3();
  if (SLOPE && topsGrp) { const hit = ray.intersectObjects(topsGrp.children, false)[0], c = hit && toCell(hit.point); if (c) return { cell: { ...c, l: 0 }, point: hit.point.clone() }; }
  for (let h = MAXH; h >= 0; h--) {
    plane.constant = -(TOP + h * STEP); if (!ray.ray.intersectPlane(plane, p)) continue; const c = toCell(p); if (!c) continue;
    if (UI.view !== 'lower' && hasDeck(c.c, c.r) && hAt(c.c, c.r, 1) === h) { plane.constant = -TOP; return { cell: { ...c, l: 1 }, point: p.clone() }; }
    if (hAt(c.c, c.r) === h && !(UI.view !== 'lower' && hasDeck(c.c, c.r))) { plane.constant = -TOP; return { cell: { ...c, l: 0 }, point: p.clone() }; }
  }
  plane.constant = -TOP; const ok = ray.ray.intersectPlane(plane, p), c0 = ok ? toCell(p) : null;
  return { cell: c0 ? { ...c0, l: 0 } : null, point: ok ? p.clone() : null };
}
// what the pointer is on: the figure standing on the square under it wins; otherwise a figure whose body is under the
// pointer. The hero on turn never hides the squares behind them (tapping there means walking there), unless the chosen
// ability is used on themselves. raw: the first figure the pointer touches, for picking a piece up to drag it
function pick(x, y, exclude) {
  const g = groundAt(x, y);
  const hits = ray.intersectObjects(liveUnits().filter(u => u.deployed && u !== exclude && !viewHides(u)).map(u => u.hit), false);
  const us = [...new Set(hits.map(h => h.object.userData.unit))];
  const onCell = g.cell && occ(g.cell.c, g.cell.r, g.cell.l);
  let unit = onCell && onCell !== exclude && !viewHides(onCell) ? onCell : null;
  if (!unit && us.length) {
    const me = myHero(), self = me && UI.card && CARDS[UI.card].target === 'self';
    const cand = us.filter(x => x !== me || self || !g.cell);
    const tg = me && UI.card && !UI.busy ? G.targets(ru(me), UI.card, { grab: grabbedId() }) : null;
    // choosing a square (where to haul a held figure, where to cast or swing): an open target square wins over a figure
    // standing in front of it, which the low camera often puts there
    const ck = g.cell && GC.key(g.cell.c, g.cell.r, g.cell.l), sq = tg && ck && tg.get(ck);
    const squares = UI.card && (CARDS[UI.card].target === 'cell' || (CARDS[UI.card].target === 'grab' && grabbedId() != null));
    unit = squares && sq && sq.cell ? null : (tg && cand.find(x => tg.has(x.id))) || cand[0] || null;
  }
  return { unit, raw: us[0] || null, cell: g.cell, point: g.point };
}
function toCell(p) { const c = Math.round(p.x + (COLS - 1) / 2), r = Math.round(p.z + (ROWS - 1) / 2); return inB(c, r) ? { c, r } : null; }
function floorY(x, z) { const c = toCell({ x, z }); if (!c) return TOP; const l = UI.view !== 'lower' && hasDeck(c.c, c.r) ? 1 : 0; return l ? cellPos(c.c, c.r, 1).y : TOP + baseH(c.c, c.r) * STEP + slopeY(x, z); }

function onTap(hit) {
  if (UI.over) return;
  const t = hit.unit || (hit.cell && occ(hit.cell.c, hit.cell.r, hit.cell.l));
  if (UI.confirm) { const e = UI.confirmEnd, h = hit.cell; UI.confirm((!!t && t === UI.confirmT) || (!!h && !!e && h.c === e.c && h.r === e.r && (h.l || 0) === (e.l || 0))); return; }
  if (UI.busy || UI.phase !== 'player') { if (t && t.deployed) { UI.inspect = t; renderDock(); } return; }
  const u = myHero();
  if (u && UI.card) {
    const card = CARDS[UI.card], tg = G.targets(ru(u), UI.card, { grab: grabbedId() });
    if (card.target === 'self') { if (t === u && !G.block(ru(u), UI.card)) { useCard(u, UI.card, null); return; } }
    else if (card.target === 'cell') {
      if (hit.cell) {
        const k = key(hit.cell.c, hit.cell.r, hit.cell.l);
        if (tg.has(k)) { if (UI.aim === k) useCard(u, UI.card, card.wall ? { ...hit.cell, dir: UI.wallDir } : hit.cell); else { UI.aim = k; sfx('select'); refresh(); } return; }
      }
    } else if (card.target === 'grab') { // the first tap takes hold of a figure, the next moves it
      const e = !t && hit.cell && tg.get(key(hit.cell.c, hit.cell.r, hit.cell.l));
      if (t && tg.has(t.id)) { UI.aim = UI.aim === 'g' + t.id ? null : 'g' + t.id; sfx('select'); refresh(); return; }
      if (e && e.cell && grabbedId() != null) { useCard(u, UI.card, { grab: grabbedId(), cell: e.cell }); return; }
    } else if (t) {
      const e = tg.get(t.id);
      if (e) { useCard(u, UI.card, t.id, e.path); return; }
    } else if (hit.cell) {
      const e = tg.get('ice:' + key(hit.cell.c, hit.cell.r));
      if (e) { useCard(u, UI.card, { ice: e.ice }); return; }
    }
  }
  if (t) { if (t !== u) { UI.inspect = t; renderDock(); if (t.side === 'gob') floatAt(t.root.position.clone().setY(t.root.position.y + t.h + .15), `${t.hp}/${t.maxHp} HP`, 'info'); } return; }
  if (u && hit.cell && ru(u).ap > 0) {
    const reach = G.reach(ru(u)), k = key(hit.cell.c, hit.cell.r, hit.cell.l), n = reach.get(k);
    if (n && n.end && n.cost > 0) { moveHero(u, G.pathTo(reach, k)); return; }
  }
  if (UI.aim) { UI.aim = null; refresh(); }
}

const ptrs = new Map(); let gest = null, down = null, drag = null;
const canDrag = u => u && u === myHero() && ru(u).ap > 0 && !UI.busy;
canvas.addEventListener('pointerdown', e => {
  if (UI.busy && !ffwd && !UI.confirm) { ffwd = true; if (UI.phase === 'gob') renderDock(); }
  setMenu(false); ac();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) {
    cancelDrag(); down = null;
    const [a, b] = [...ptrs.values()]; gest = { ang: Math.atan2(b.y - a.y, b.x - a.x), d: Math.hypot(b.x - a.x, b.y - a.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return;
  }
  if (ptrs.size > 2) return;
  const hit = pick(e.clientX, e.clientY);
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, hit, moved: false, orbit: false, orbitOK: e.pointerType === 'mouse' && (e.shiftKey || e.button === 2), touch: e.pointerType !== 'mouse' };
});
canvas.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gest && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()]; const ang = Math.atan2(b.y - a.y, b.x - a.x), d = Math.hypot(b.x - a.x, b.y - a.y);
    let da = ang - gest.ang; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
    camAzT += da; camAz += da; zoom = zoomT = Math.max(.4, Math.min(zoomMax(), zoom * gest.d / Math.max(20, d)));
    // two fingers moving together slide the map
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, p0 = floorAt(gest.mx, gest.my), p1 = floorAt(mx, my);
    if (p0 && p1) { camTX += p0.x - p1.x; camTZ += p0.z - p1.z; clampCam(); camX = camTX; camZ = camTZ; }
    gest.ang = ang; gest.d = d; gest.mx = mx; gest.my = my; return;
  }
  if (down) {
    if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 9) {
      down.moved = true;
      const du = canDrag(down.hit.raw) ? down.hit.raw : down.hit.unit;
      if (canDrag(du)) startDrag(du, down.touch); else if (down.orbitOK) down.orbit = true; else down.pan = true;
    }
    if (drag) updateDrag(e.clientX, e.clientY);
    else if (down.orbit) { const dx = e.clientX - down.lx; camAzT -= dx * .009; camAz -= dx * .009; down.lx = e.clientX; }
    else if (down.pan) { const a = floorAt(down.lx, down.ly ?? down.y), b = floorAt(e.clientX, e.clientY); if (a && b) { camTX += a.x - b.x; camTZ += a.z - b.z; clampCam(); camX = camTX; camZ = camTZ; } down.lx = e.clientX; down.ly = e.clientY; }
    return;
  }
  if (e.pointerType === 'mouse') hover(e.clientX, e.clientY);
});
function floorAt(x, y) { ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera); plane.constant = -TOP; const p = new V3(); return ray.ray.intersectPlane(plane, p) ? p : null; }
const zoomMax = () => bigMap() ? 2 : 1.3; // pinch out as far as the whole board (and a bit)
function endPtr(e) {
  ptrs.delete(e.pointerId);
  if (gest) { if (ptrs.size < 2) gest = null; down = null; return; }
  if (drag) { endDrag(); down = null; return; }
  if (down && !down.moved) onTap(down.hit);
  down = null;
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); cancelDrag(); down = null; if (ptrs.size < 2) gest = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = zoomT = Math.max(.4, Math.min(zoomMax(), zoom * (1 + e.deltaY * .001))); }, { passive: false });

// a mouse over the board previews: the walk to a square, or the path, reticle and odds for a target
let hoverKey = null;
function hover(x, y) {
  const u = myHero();
  if (UI.busy || !u) { if (hoverKey) { hoverKey = null; hideArrow(); } return; }
  const hit = pick(x, y), t = hit.unit || (hit.cell && occ(hit.cell.c, hit.cell.r, hit.cell.l));
  const k = t ? 'u' + t.id : hit.cell ? key(hit.cell.c, hit.cell.r, hit.cell.l) : null;
  if (k === hoverKey) return; hoverKey = k;
  canvas.style.cursor = t ? 'pointer' : 'default';
  const r = ru(u), fc0 = UI.fcFocus; UI.fcFocus = t && UI.fc.has(t.id) ? t.id : null;
  if (UI.card && CARDS[UI.card].target === 'cell') {
    const tg = G.targets(r, UI.card), ck = hit.cell && key(hit.cell.c, hit.cell.r, hit.cell.l);
    UI.aim = ck && tg.has(ck) ? ck : null; refresh(); return;
  }
  if (fc0 !== UI.fcFocus) renderDock();
  hideReticle();
  if (t && UI.card) { const e = G.targets(r, UI.card, { grab: grabbedId() }).get(t.id); if (e) showReticle(t, CARDS[UI.card].target, .6); if (e && e.path) { previewCost(u, 2); showArrow(e.path, 'red'); return; } }
  if (hit.cell && r.ap > 0 && !t) { const reach = G.reach(r), n = reach.get(k); if (n && n.end && n.cost > 0) { previewCost(u, 1); showArrow(G.pathTo(reach, k)); return; } }
  previewCost(null); hideArrow();
}

// drag a hero to walk: the path follows the finger square by square; let go over a foe to walk there and strike
function startDrag(u, touch) {
  if (UI.sel !== u) setSel(u, true);
  sfx('lift');
  const r = ru(u);
  drag = { u, touch, path: [here(u)], reach: G.reach(r), mv: G.moveOf(r), tg: UI.card && CARDS[UI.card].target === 'enemy' ? G.targets(r, UI.card) : new Map(), target: null, cellKey: key(u.c, u.r, u.l) };
  const y0 = u.piece.position.y; playClip(u, 'jump', { hold: true }); tween(120, t => u.piece.position.y = y0 + (.35 - y0) * t, ease.out);
}
function updateDrag(x, y) {
  const d = drag, u = d.u;
  const hit = pick(x, d.touch ? y - 38 : y, u);
  if (hit.point) { const mx = COLS / 2, mz = ROWS / 2; u.root.position.x += (Math.max(-mx, Math.min(mx, hit.point.x)) - u.root.position.x) * .6; u.root.position.z += (Math.max(-mz, Math.min(mz, hit.point.z)) - u.root.position.z) * .6; }
  if (hit.cell && !isWall(hit.cell.c, hit.cell.r)) u.root.position.y += (cellPos(hit.cell.c, hit.cell.r, hit.cell.l).y - u.root.position.y) * .5;
  const t = hit.unit && hit.unit.side === 'gob' ? hit.unit : (hit.cell && occ(hit.cell.c, hit.cell.r, hit.cell.l));
  const ck = t ? 'u' + t.id : hit.cell ? key(hit.cell.c, hit.cell.r, hit.cell.l) : null;
  if (ck === d.cellKey) return; d.cellKey = ck;
  d.target = null; UI.fcFocus = null;
  if (t && t.side === 'gob' && d.tg.has(t.id)) {
    const R = CARDS[UI.card].range, last = d.path[d.path.length - 1], lastN = d.reach.get(key(last.c, last.r, last.l));
    if (!(lastN && lastN.end && dist(last, t) <= R)) { const e = d.tg.get(t.id); d.path = e.path ? e.path.slice() : [here(u)]; }
    d.target = t; UI.fcFocus = UI.fc.has(t.id) ? t.id : null; showArrow(d.path.length > 1 ? d.path : null, 'red'); previewCost(u, d.path.length > 1 ? 2 : 1); sfx('select'); renderDock(); return;
  }
  if (!hit.cell) return;
  const k = key(hit.cell.c, hit.cell.r, hit.cell.l), n = d.reach.get(k);
  if (!n) return;
  const idx = d.path.findIndex(p => p.c === hit.cell.c && p.r === hit.cell.r && (p.l || 0) === (hit.cell.l || 0));
  const last = d.path[d.path.length - 1];
  if (idx >= 0) d.path = d.path.slice(0, idx + 1);
  else if (Math.abs(last.c - hit.cell.c) + Math.abs(last.r - hit.cell.r) === 1 && d.path.length - 1 < d.mv && Math.abs(hAt(hit.cell.c, hit.cell.r, hit.cell.l) - hAt(last.c, last.r, last.l)) <= 2) d.path.push({ c: hit.cell.c, r: hit.cell.r, l: hit.cell.l || 0 });
  else d.path = G.pathTo(d.reach, k);
  showArrow(d.path); renderDock(); previewCost(u, d.path.length > 1 ? 1 : 0);
}
function endDrag() {
  const d = drag; drag = null; if (!d) return;
  const u = d.u, last = d.path[d.path.length - 1], n = d.reach.get(key(last.c, last.r, last.l));
  hideArrow(); previewCost(null); UI.fcFocus = null;
  if (d.target && d.target.alive) {
    const ok = n && n.end;
    const path = ok ? d.path : (d.tg.get(d.target.id)?.path || [here(u)]);
    useCard(u, UI.card, d.target.id, path, true); return;
  }
  if (d.path.length > 1 && n && n.end) { moveHero(u, d.path, true); return; }
  dropTo(u, [here(u)]).then(refresh);
}
function cancelDrag() { if (drag) { const u = drag.u; drag = null; hideArrow(); previewCost(null); dropTo(u, [here(u)]); } }

// ---------------- buttons ----------------
function setMenu(open) { $('#dock').classList.toggle('mopen', open); $('#menu').hidden = !open; $('#menuBtn').setAttribute('aria-expanded', open); }
$('#menuBtn').onclick = () => { ac(); setMenu($('#menu').hidden); sfx('select'); };
$('#threatBtn').onclick = () => { ac(); showThreat = !showThreat; $('#threatBtn').classList.toggle('on', showThreat); sfx('select'); refreshHL(); };
$('#intentBtn').onclick = () => { ac(); showIntents = !showIntents; $('#intentBtn').classList.toggle('on', showIntents); try { localStorage.setItem('gc-intents', showIntents ? '1' : '0'); } catch (e) { } sfx('select'); };
$('#cineBtn').onclick = () => { ac(); closeUps = !closeUps; $('#cineBtn').classList.toggle('on', closeUps); try { localStorage.setItem('gc-closeups', closeUps ? '1' : '0'); } catch (e) { } sfx('select'); };
$('#barkBtn').onclick = () => { ac(); showBarks = !showBarks; $('#barkBtn').classList.toggle('on', showBarks); try { localStorage.setItem('gc-barks', showBarks ? '1' : '0'); } catch (e) { } sfx('select'); };
$('#muteBtn').onclick = () => { ac(); muted = !muted; $('#muteBtn').classList.toggle('on', !muted); try { localStorage.setItem('gc-mute', muted ? '1' : '0'); } catch (e) { } };
$('#musicBtn').onclick = () => { ac(); musicOn = !musicOn; try { localStorage.setItem('gc-music', musicOn ? '1' : '0'); } catch (e) { } renderSettings(); sfx('select'); };
$('#speedBtn').onclick = () => { ac(); FAST = !FAST; try { localStorage.setItem('gc-fast', FAST ? '1' : '0'); } catch (e) { } renderSettings(); sfx('select'); };
// difficulty: how tough the goblins are, from the next battle on
$('#diffBtn').onclick = () => { ac(); const ks = Object.keys(GC.TUNE.difficulty); CAMP.diff = ks[(ks.indexOf(CAMP.diff) + 1) % ks.length]; saveCamp(); renderSettings(); sfx('select'); };
$('#newBtn').onclick = async () => {
  ac(); $('#settings').hidden = true;
  if (await ask('Start a new campaign?', `The party goes back to the Gorge Crossing and gives up its ${CAMP.boons.length} boon${CAMP.boons.length === 1 ? '' : 's'}.`, 'New campaign', 'Keep this one')) { $('#intro').hidden = true; newCampaign(); }
};
// the settings that show a value
function renderSettings() {
  $('#muteBtn').classList.toggle('on', !muted); $('#musicBtn').classList.toggle('on', musicOn); $('#cineBtn').classList.toggle('on', closeUps);
  $('#speedLbl').textContent = FAST ? 'Fast' : 'Normal'; $('#diffLbl').textContent = GC.TUNE.difficulty[CAMP.diff].label;
  $('#diffNote').textContent = `${GC.TUNE.difficulty[CAMP.diff].label}: goblins have ${Math.round(GC.TUNE.difficulty[CAMP.diff].hp * 100)}% of their health. A change counts from the next battle.`;
}
function swapPiece(u) { // rebuild a unit's miniature in the current style, keeping its pose and effects
  const old = u.piece, np = buildPiece(u.kind);
  np.piece.rotation.copy(old.rotation); np.piece.position.copy(old.position); np.piece.visible = old.visible;
  np.stand.userData.lean = u.stand.userData.lean;
  ['bless', 'taunt', 'ice', 'haste', 'rebuke'].forEach(k => { if (u.fx[k]) np.piece.add(u.fx[k]); });
  u.root.remove(old); u.root.add(np.piece); Object.assign(u, np); ownMats(u); resetRig(u); if (u.st.hidden) setBase(u, 'sneak'); if (u.st.prone) proneNow(u);
  if (u.st.hidden) u.piece.traverse(o => { if (o.isMesh && o.material && o.material.userData.e0) { o.material.transparent = true; o.material.opacity = .32; } });
}
function setStyle(st) {
  STYLE = st; LP = st === 'heroic'; ST = st === 'stylized';
  try { localStorage.setItem('gc-style-2', st); } catch (e) { }
  $('#styleLbl').textContent = STYLE_NAME[st];
  applyEnvStyle(); makePortraits();
  units.forEach(u => { if (u && u.alive) swapPiece(u); });
  renderDock();
}
$('#styleBtn').onclick = () => { ac(); setStyle(STYLES[(STYLES.indexOf(STYLE) + 1) % STYLES.length]); };
$('#restartBtn').onclick = async () => {
  setMenu(false); $('#settings').hidden = true;
  if (UI.phase === 'intro' || UI.over || await ask('Restart this battle?', 'The battle starts again from the briefing. The boons stay.', 'Restart', 'Keep playing')) { $('#end').hidden = true; $('#intro').hidden = true; loadLevel(level); }
};
$('#uwho').onclick = () => { ac(); openSheet(); };
// a question in the page itself (the viewer allows no browser dialogs): resolves true for the first button
function ask(title, html, yes, no) {
  $('#cfTitle').textContent = title; $('#cfText').innerHTML = html; $('#cfEnd').textContent = yes; $('#cfBack').textContent = no;
  $('#confirm').hidden = false; sfx('select');
  return new Promise(res => {
    const done = v => { $('#confirm').hidden = true; $('#cfEnd').onclick = $('#cfBack').onclick = $('#confirm').onclick = null; if (!v) sfx('pick'); res(v); };
    $('#cfEnd').onclick = () => done(true); $('#cfBack').onclick = () => done(false);
    $('#confirm').onclick = e => { if (e.target.id === 'confirm') done(false); };
  });
}
async function askEndTurn() {
  if (UI.busy || UI.phase !== 'player' || UI.over || !$('#confirm').hidden) return;
  const h = UI.active, ap = h ? ru(h).ap : 0;
  if (!h || ap <= 0 || await ask('End this turn?', `<b>${h.name}</b> still has ${ap} action${ap > 1 ? 's' : ''}.`, 'End turn', 'Keep playing')) endTurn();
}
$('#endBtn').onclick = () => { ac(); askEndTurn(); };
// keys: E or Enter ends the turn, Z (or Ctrl+Z) undoes; Enter answers the open question or sheet, Escape backs out
window.addEventListener('keydown', e => {
  if (!$('#talk').hidden || e.altKey) return; // a scene takes its own keys
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (!$('#confirm').hidden) { if (k === 'enter') { e.preventDefault(); $('#cfEnd').click(); } else if (k === 'escape') { e.preventDefault(); $('#cfBack').click(); } return; }
  if (k === 'enter' && !$('#intro').hidden) { e.preventDefault(); $('#introGo').click(); return; }
  if (k === 'enter' && !$('#end').hidden) { e.preventDefault(); $('#againBtn').click(); return; }
  if (k === 'escape' && !$('#menu').hidden) { e.preventDefault(); setMenu(false); return; }
  if (k === 'escape' && closeSheet()) { e.preventDefault(); return; }
  if (ovOpen()) return;
  if (k === 'z' && (mod || !e.shiftKey)) { e.preventDefault(); undoMove(); }
  else if ((k === 'e' || k === 'enter') && !mod && myHero()) { e.preventDefault(); askEndTurn(); }
  else if (k === 'f' && !mod) showFloor(UI.view === 'lower' ? 'upper' : 'lower');
  else if (k === 'pageup' || k === 'pagedown') { e.preventDefault(); showFloor(k === 'pageup' ? 'upper' : 'lower'); }
});
$('#rotBtn').onclick = () => { ac(); UI.wallDir = UI.wallDir === 'v' ? 'h' : 'v'; sfx('pick'); refresh(); }; // turn the ice wall across or down
$('#helpBtn').onclick = () => { setMenu(false); $('#helpClose').textContent = 'To battle'; $('#help').scrollTop = 0; $('#help').hidden = false; };
$('#settingsBtn').onclick = () => { ac(); setMenu(false); renderSettings(); $('#settings').hidden = false; sfx('select'); };
$('#settingsClose').onclick = () => { $('#settings').hidden = true; };
$('#menuUndo').onclick = () => { setMenu(false); ac(); undoMove(); };
$('#menuFloor').onclick = () => { setMenu(false); ac(); sfx('select'); setView(UI.view === 'lower' ? 'upper' : 'lower'); };
// the floor switch on the left: up to the upper floor, down to the ground floor
function showFloor(v) { if (UI.view === v || $('#floorBtn').hidden) return; ac(); sfx('select'); setView(v); }
$('#floorUp').onclick = () => showFloor('upper');
$('#floorDn').onclick = () => showFloor('lower');
$('#menuView').onclick = () => {
  setMenu(false); ac(); sfx('select'); follow = null;
  camAzT = camAz - angDiff(camAz, baseAz()); zoomT = playZoom();
  const u = UI.sel || UI.active || heroes()[0]; camTX = u ? u.root.position.x : 0; camTZ = u ? u.root.position.z : 0; clampCam();
};
$('#menuLog').onclick = () => { setMenu(false); ac(); renderLog(); $('#logv').hidden = false; $('#logList').scrollTop = 1e6; };
$('#logClose').onclick = () => { $('#logv').hidden = true; };
$('#helpClose').onclick = () => { ac(); $('#help').hidden = true; };
// the sheets that can be put away: by the ✕ in their corner, a tap on the dim backdrop around them, or Escape
const CLOSABLE = ['#csheet', '#logv', '#settings', '#help'];
function closeSheet() { const q = CLOSABLE.find(q => !$(q).hidden); if (q) $(q).hidden = true; return !!q; }
CLOSABLE.forEach(q => $(q).addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.xb')) { ac(); $(q).hidden = true; } }));
$('#againBtn').onclick = () => { ac(); if ($('#againBtn').disabled) return; $('#end').hidden = true; if (endAction) endAction(); };
$('#introGo').onclick = async () => {
  ac(); $('#intro').hidden = true;
  const order0 = liveUnits().sort((a, b) => (a.side === b.side ? 0 : a.side === 'hero' ? -1 : 1));
  await Promise.all(order0.map((u, i) => deploy(u, i * 110)));
  await wait(450);
  defaultView(); await wait(650); // ease in from the set-up shot
  await talk(DLG.scenes[level] && DLG.scenes[level].before);
  UI.busy = false; order(() => G.begin(), true);
};

