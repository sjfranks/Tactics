'use strict';
// GOBLIN CRYPT · THE TABLE · aiming, the event player, the player's orders, undo, sync with the rules, the end of a battle, the log
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- aiming: reticle and framing ----------------
// a crosshair ring drawn twice: a dark under-stroke so it reads on lava, grass or stone, then the tinted line
const reticleTex = canvasTex(256, 256, g => {
  g.lineCap = 'round';
  [['rgba(0,0,0,.65)', 8], ['#fff', 0]].forEach(([col, extra]) => {
    g.strokeStyle = col;
    g.lineWidth = 9 + extra; g.beginPath(); g.arc(128, 128, 98, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 14 + extra; [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.moveTo(128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78); g.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); g.stroke(); });
  });
}, false);
const reticle = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: reticleTex, transparent: true, depthWrite: false, toneMapped: false }));
reticle.rotation.x = -Math.PI / 2; reticle.renderOrder = 4; reticle.visible = false; scene.add(reticle);
let reticleOn = null, aimZoom = null;
const AIMC = { enemy: 0xff5b47, ally: 0x5be08a, cell: 0xe3ad4f };
function showReticle(t, kind, op = 1) { reticleOn = t; reticle.material.color.setHex(AIMC[kind] || AIMC.enemy); reticle.userData.op = op; reticle.scale.setScalar(sz(t) > 1 ? 2.1 : kind === 'cell' ? 2.1 : kind === 'spot' ? .9 : 1); reticle.visible = true; }
function hideReticle() { reticle.visible = false; reticleOn = null; }
// pan to the midpoint and pull back until both pieces fit the frame, with room around them
function frameTwo(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, ca = Math.cos(camAz), sa = Math.sin(camAz);
  const w = Math.abs(dx * ca - dz * sa) + 2.4, h = Math.abs(dx * sa + dz * ca) + 3.2;
  if (aimZoom === null) aimZoom = zoomT;
  follow = null; zoomT = Math.max(aimZoom, Math.min(zoomMax() + .4, Math.max(w / VIEWC, h / VIEWR)));
  camTX = (a.x + b.x) / 2; camTZ = (a.z + b.z) / 2; clampCam();
}
async function aimAt(u, target, kind) {
  if (!target || target === u) return;
  const tp = target.root ? target.root.position : cellPos(target.c, target.r, target.l);
  showReticle(target.root ? target : { root: { position: tp }, def: {} }, kind);
  if (closeUps && !ffwd && !QUIET && !REDUCED) { pendingClose = [u.root.position.clone(), tp.clone()]; await wait(140); return; } // the dice first; the close-up waits for the blow
  const z0 = zoomT, x0 = camTX, z0c = camTZ; frameTwo(u.root.position, tp);
  const moved = Math.abs(zoomT - z0) > .05 || Math.hypot(camTX - x0, camTZ - z0c) > .6;
  await wait(moved ? 420 : 140);
}
function endAim() {
  hideReticle(); pendingClose = null; if (aimZoom !== null) { zoomT = aimZoom; aimZoom = null; }
  if (cine) return wait(380).then(endCloseUp); // hold on the blow a moment, then pull back
}
// ---------------- battle close-ups ----------------
// when an attack, a spell or a heal is locked in, its dice are thrown first; then the camera drops low and swings side-on to the two figures, close
// enough to see the blow land, then goes back to where it was. Settings turns it off; fast-forward skips it
let closeUps = true, cine = null, pendingClose = null; // cine: the camera before the close-up; pendingClose: the two it will frame
// the dice have been thrown and the result called: swing in, then play the blow (fn) as it fell
const afterRoll = fn => e => { const p = pendingClose; pendingClose = null; if (!p || !closeUp(p[0], p[1])) return fn(e); clearDice(); return wait(520).then(() => fn(e)); }; // the readout keeps the numbers
try { closeUps = localStorage.getItem('gc-closeups') !== '0'; } catch (e) { }
function closeUp(a, b) {
  if (!closeUps || ffwd || QUIET || REDUCED) return false;
  if (!cine) cine = { x: camTX, z: camTZ, az: camAzT, zoom: zoomT, pitch: camPitchT, y: camYT };
  follow = null;
  const dx = b.x - a.x, dz = b.z - a.z, span = Math.hypot(dx, dz), line = Math.atan2(dx, dz);
  // side-on to the line between them: from the side with fewer figures in the way, else the one nearer the way the
  // camera already looks
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
  const inWay = az => liveUnits().filter(u => { const p = u.root.position, vx = p.x - mx, vz = p.z - mz, along = vx * Math.sin(az) + vz * Math.cos(az), across = Math.abs(vx * Math.cos(az) - vz * Math.sin(az)); return along > .5 && along < 3.5 && across < Math.max(1.2, span / 2 + .3); }).length;
  const side = [line + Math.PI / 2, line - Math.PI / 2].sort((p, q) => (inWay(p) - inWay(q)) || (Math.abs(angDiff(camAz, p)) - Math.abs(angDiff(camAz, q))))[0];
  cine.away = new V3(dx, 0, dz).normalize(); // the dice land on the far side of the target
  camAzT = camAz - angDiff(camAz, span > .1 ? side : camAz);
  camPitchT = CLOSE_PITCH; camYT = (a.y + b.y) / 2 + .45;
  camTX = (a.x + b.x) / 2; camTZ = (a.z + b.z) / 2;
  const { W, vH } = frameGeom(), hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * W / vH);
  const want = (Math.max(span, 1) + 2.6) / 2 / Math.tan(hf / 2); // both figures and a square either side
  zoomT = Math.max(.22, want / boardDist(camAzT, camPitchT));
  return true;
}
function endCloseUp() {
  if (!cine) return; const c = cine; cine = null;
  camTX = c.x; camTZ = c.z; camAzT = c.az; zoomT = c.zoom; camPitchT = c.pitch; camYT = c.y; clampCam();
}
// ---------------- the event player ----------------
// The rules settle an order in an instant and return the story of what happened, a list of events. The table plays
// them back one after another, each as animation, dice, sound and text; a handler that returns a promise holds the
// story until it is done.
const PLAY = {
  log: e => logEvent(e.html, e.cls),
  note: e => roNote(e.text, e.cls),
  combo: e => combo(e.text, e.cls),
  float: e => { const u = vu(e.id); if (u) floatOn(u, e.text, e.cls, e.sub); },
  xp: e => { const u = vu(e.id); if (u && !QUIET) floatAt(u.root.position.clone().setY(u.root.position.y + u.h + .45), `+${e.amount} XP`, 'xp'); },
  wait: e => wait(e.ms),
  sfx: e => sfx(e.name),
  shake: e => shake(e.amt),
  fx: e => playFx(e),
  face: e => { const u = vu(e.id); return u ? turnTo(u, e.c, e.r) : null; },
  faceDir: e => { const g = vu(e.id); if (!g) return null; const a0 = g.piece.rotation.y, d = angDiff(Math.atan2(e.dir[0], e.dir[1]), a0); return tween(200, t => { g.piece.rotation.y = a0 + d * t; }, ease.out); },
  cast: e => { const u = vu(e.id); if (!u) return null; const p = liftShot(u); return e.wait ? p : null; },
  aim: e => { const u = vu(e.id); return u ? aimAt(u, typeof e.at === 'number' ? vu(e.at) : e.at, e.kind) : null; },
  endAim: () => endAim(),
  status: e => { const u = vu(e.id); if (!u) return null; if (e.armour != null) setArmour(u, e.armour); return applyStatus(u, e.key, e.on); },
  par: e => Promise.all(e.list.map((evs, i) => wait(i * (e.stagger || 0)).then(() => play(evs)))),
  roll: e => showDice(e),
  total: e => showTotal(e.value, e.suffix || ''),
  verdict: e => verdictFx(vu(e.id), e.kind),
  strike: afterRoll(e => strikeFx(e)),
  miss: e => missFx(vu(e.id)),
  damage: e => damageFx(e),
  kill: e => killFx(e),
  down: e => downFx(e),
  wake: e => { const g = vu(e.id); if (!g) return; g.asleep = false; g.tag.classList.remove('zz'); floatAt(g.root.position.clone().setY(g.root.position.y + g.h + .15), 'Awake!', 'info'); },
  fall: e => fallFx(e),
  burn: e => { (e.set || []).forEach(([k, n]) => { const q = GC.parseKey(k); setBurnFx(q.c, q.r, n, q.l); }); (e.clear || []).forEach(clearBurnFx); },
  ice: e => { (e.add || []).forEach((b, i) => wait(i * 90).then(() => makeIce(b.c, b.r))); (e.remove || []).forEach(b => removeIceFx(b.k, b.how)); },
  move: async e => {
    const u = vu(e.id); if (!u) return;
    if (e.style === 'drop') { await dropTo(u, e.path); return; }
    if (e.arrow) showArrow(e.path, e.arrow);
    await glide(u, e.path, e.speed || 1); if (e.arrow) hideArrow();
  },
  push: e => pushFx(e),
  swing: e => swingFx(e),
  shot: afterRoll(e => shotFx(e)),
  sweep: afterRoll(e => sweepFx(e)),
  heal: afterRoll(e => healFx(e)),
  smashMark: e => showSmash(e),
  smashClear: () => clearSmashFx(),
  smash: e => smashFx(e),
  flinch: e => { const u = vu(e.id); if (u) playClip(u, 'hit'); },
  banner: e => banner(e.text, e.gob),
  spawn: e => { (e.units || []).forEach((d, i) => { const u = makeUnit({ ...G.U(d.id), c: d.c, r: d.r, l: d.l || 0, hp: GC.UNITS[d.kind].hp, maxHp: GC.UNITS[d.kind].hp }); deploy(u, i * 160); }); },
  turn: e => {
    const u = vu(e.id); if (!u) return null;
    UI.active = u; UI.turn = UI.order.indexOf(e.id); UI.sel = null; UI.card = null; UI.aim = null; UI.inspect = null; hideArrow(); previewCost(null);
    if (u.side === 'gob') UI.phase = 'gob';
    setView(e.overview ? 'upper' : u.asleep ? UI.view : viewFor(u)); focusOn(u.root.position);
    renderTokens(); updateHud(); renderDock();
    return u.side === 'gob' ? wait(60) : null;
  },
  idle: e => { const u = vu(e.id); if (u) faceViewer(u); return u && u.side === 'gob' ? wait(70) : null; },
  clearDice: () => { clearDice(); hideRoll(); },
  round: e => {
    UI.round = e.round; UI.order = e.order.slice(); UI.turn = -1;
    for (const id in e.inits) { const u = vu(+id); if (u) u.init = e.inits[id]; }
    updateHud(); renderTokens(); banner(e.first ? lvl().name : `Round ${e.round}`); sfx('turn');
    return wait(e.first ? 300 : 700);
  },
  player: e => {
    const u = vu(e.id); if (!u) return;
    UI.phase = 'player'; UI.active = u; undoStack.length = 0; sfx('select'); toast(`${u.name}'s turn`);
    setSel(u, true);
  },
  end: e => gameOver(e.win),
  rout: e => routFx(e.ids)
};
async function play(evs) {
  for (const e of evs) {
    const h = PLAY[e.t];
    if (!h) { console.warn('no player for event', e.t); continue; }
    const p = h(e);
    if (p && p.then) await p;
    barkFor(e);
  }
}
// does a story contain a dice roll? Dice are final: an order that rolled can't be taken back
const rolled = evs => evs.some(e => e.t === 'roll' || (e.t === 'par' && e.list.some(rolled)));

// ---------------- orders: what the player tells the rules ----------------
const here = u => ({ c: u.c, r: u.r, l: u.l || 0 });
// walking somewhere and then using an ability asks first, on the board itself: the walk arrow, the reticle and a small
// Confirm? label. Tap the label or the target again to go; tap anything else to call it off.
function confirmCombo(u, id, target, path) {
  const c = CARDS[id], t = typeof target === 'number' ? vu(target) : null;
  showArrow(path, 'red'); if (t) showReticle(t, c.target, .9); previewCost(u, 2, true); UI.fcFocus = t ? t.id : null;
  const btn = $('#goPill'); btn.hidden = false; $('#dock').classList.add('confirming'); sfx('select');
  btn.setAttribute('aria-label', `Confirm: ${u.name} walks ${path.length - 1} square${path.length > 2 ? 's' : ''}, then uses ${c.name}${t ? ' on ' + t.name : ''}. Costs 2 actions.`);
  return new Promise(res => {
    UI.confirm = ok => { UI.confirm = null; UI.fcFocus = null; btn.hidden = true; $('#dock').classList.remove('confirming'); hideArrow(); hideReticle(); previewCost(null); if (!ok) sfx('pick'); renderDock(); res(ok); };
    UI.confirmT = t; UI.confirmEnd = path[path.length - 1];
    btn.onclick = () => { ac(); UI.confirm && UI.confirm(true); };
    renderDock();
  });
}
// One order to the rules. They settle it at once; the table then plays back what happened. Undo keeps the state from
// before each order, but dice are final: an order that rolled any dice clears it, and so does the end of a turn.
const undoStack = [];
async function order(fn, final) {
  if (UI.busy || UI.over || !G) return false;
  const before = G.snapshot(), logAt = combatLog.length;
  const evs = fn();
  if (!evs.length) return false;
  if (final || rolled(evs)) undoStack.length = 0; else undoStack.push({ state: before, log: logAt });
  UI.busy = true; UI.aim = null; UI.inspect = null; UI.intents = []; UI.fc.clear(); hideArrow(); refresh();
  try { await play(evs); }
  catch (err) { console.error(err); }
  finally { await wait(160); endAim(); clearDice(); hideRoll(); UI.busy = false; sync(); afterAction(); }
  return true;
}
// use an ability. target is what the rules take: a unit id, { ice }, a square, a wall { c, r, l, dir }, { grab, cell },
// or null for the hero itself. path: the walk to take first. dropped: the hero was dragged here and hangs in the air
async function useCard(u, id, target, path, dropped) {
  const r = ru(u), walk = !!path && path.length > 1;
  if (UI.busy || G.block(r, id) || (walk && r.ap < 2)) { if (dropped) await dropTo(u, [here(u)]); refresh(); return; }
  if (walk) {
    UI.busy = true; const ok = await confirmCombo(u, id, target, path); UI.busy = false;
    if (!ok) { if (dropped) await dropTo(u, [here(u)]); refresh(); return; }
  } else if (dropped) await dropTo(u, [here(u)]);
  UI.peek = null;
  const done = await order(() => G.act(u.id, id, target, walk ? path : null, walk && dropped ? 'drop' : undefined));
  if (!done) { if (dropped && walk) await dropTo(u, [here(u)]); refresh(); }
}
async function moveHero(u, path, dropped) {
  const done = await order(() => G.move(u.id, path, dropped ? 'drop' : undefined));
  if (!done && dropped) { await dropTo(u, [here(u)]); refresh(); }
}
function endTurn() { if (UI.busy || UI.phase !== 'player' || UI.over) return; return order(() => G.endTurn(), true); }
function faceViewer(u) { // idle pieces turn back toward the player, like Fire Emblem units
  if (!u || !u.alive || u.down) return;
  const a0 = u.piece.rotation.y, d = angDiff(camAz + (u.side === 'hero' ? .35 : -.35), a0);
  if (Math.abs(d) > .05) tween(300, t => { if (u.alive) u.piece.rotation.y = a0 + d * t; });
}
function afterAction() {
  const u = UI.active, r = u && G.U(u.id), mine = UI.phase === 'player' && !UI.over && !!r;
  if (mine) {
    faceViewer(u); setView(viewFor(u)); // the view goes with the hero, up the stair or down it
    if (r.ap <= 0 || !G.up(r)) UI.card = null;
    else if (UI.card && G.block(r, UI.card)) UI.card = G.cardsOf(r)[0];
  }
  computeIntents(); refresh(); renderTools(); saveTurn();
  // the turn passes on by itself once the hero has no actions left (or has fallen)
  if (mine && (r.ap <= 0 || !G.up(r))) setTimeout(() => { const r2 = G.U(u.id); if (UI.phase === 'player' && !UI.busy && !UI.over && UI.active === u && (r2.ap <= 0 || !G.up(r2))) endTurn(); }, 450);
}
function setSel(u, quiet) {
  UI.peek = null; UI.sel = u; UI.aim = null; UI.inspect = null;
  const r = u && G.U(u.id);
  UI.card = u && u.side === 'hero' && r && r.ap > 0 && G.up(r) ? G.cardsOf(r)[0] : null;
  if (!quiet && u) sfx('select');
  if (u) { setView(viewFor(u)); focusOn(u.root.position); }
  refresh();
}
// what each goblin means to do if it acted now, drawn as arrows while the player plans; the next to act is drawn bold
function computeIntents() {
  UI.intents = [];
  if (!G || UI.phase !== 'player' || G.S.phase !== 'player') return;
  const nx = G.S.order.slice(G.S.turn + 1).map(id => G.U(id)).find(g => g && g.side === 'gob' && G.up(g) && !g.asleep);
  for (const g of G.gobs()) {
    if (g.asleep || !vu(g.id)) continue;
    const it = G.intent(g.id); if (!it) continue;
    UI.intents.push({ g: vu(g.id), it, next: g === nx });
  }
}

// ---------------- keeping the table true to the rules ----------------
const showNow = u => { u.deployed = true; u.piece.visible = u.ring.visible = u.blob.visible = true; u.viewFaded = undefined; if (u.def.boss) updateBoss(); };
// after an order has played out, make sure every piece, wound, mark and block of ice matches the rules exactly: a
// safety net for the playback, and how undo and a reload put the table back
function sync() {
  const GS = G.S;
  for (const r of GS.units) {
    let u = units[r.id];
    if (u && !u.alive && r.alive) { if (u.root.parent) { scene.remove(u.root); scene.remove(u.ring); } u.tag.remove(); u = null; } // back from the dead: an undo
    if (!u) { if (!r.alive) continue; u = makeUnit(r); showNow(u); }
    if (!r.alive) { if (u.alive) dropUnit(u); continue; }
    if (u.c !== r.c || u.r !== r.r || (u.l || 0) !== (r.l || 0)) { u.c = r.c; u.r = r.r; u.l = r.l || 0; u.root.position.copy(posOf(u)); u.viewFaded = undefined; }
    if (u.hp !== r.hp) { u.hp = r.hp; updateTag(u); }
    if (u.down !== r.down) setDownLook(u, r.down);
    for (const k of STATUSES) if (!!u.st[k] !== !!r.st[k]) applyStatus(u, k, !!r.st[k], true);
    if (u.asleep !== r.asleep) { u.asleep = r.asleep; u.tag.classList.toggle('zz', r.asleep); }
    if (u.armour !== G.armourOf(r)) setArmour(u, G.armourOf(r));
    if (!u.deployed && UI.phase !== 'intro') showNow(u);
  }
  for (const k of [...ICE.keys()]) if (!GS.ice[k]) removeIceFx(k);
  for (const k in GS.ice) if (!ICE.has(k)) makeIce(GS.ice[k].c, GS.ice[k].r, true);
  for (const k of [...burnFx.keys()]) if (!GS.burn[k]) clearBurnFx(k);
  for (const k in GS.burn) { const q = GC.parseKey(k); setBurnFx(q.c, q.r, GS.burn[k], q.l); }
  if (GS.smash && !smashMarks) showSmash(GS.smash); else if (!GS.smash && smashMarks) clearSmashFx();
  UI.round = GS.round; fcCache.clear(); updateBoss(); updateHud();
}
// undo: back to the state before the last order, as long as no dice have been rolled since
function undoMove() {
  if (UI.busy || UI.phase !== 'player' || UI.over) return;
  const s0 = undoStack.pop(); if (!s0) { renderTools(); return; }
  G = GC.battle(JSON.parse(s0.state));
  QUIET = true;
  try { sync(); units.forEach(u => { if (u && u.alive) { u.root.position.copy(posOf(u)); if (!u.st.prone) standNow(u); else proneNow(u); } }); }
  finally { QUIET = false; }
  combatLog.length = s0.log; logEvent(`${logName(UI.active)} takes it back`, 'hero');
  clearDice(); hideRoll(); sfx('lift');
  setSel(UI.active, true); computeIntents(); renderTools(); renderDock(); saveTurn();
}

// ---------------- the end of a battle ----------------
let endAction = null;
function steps(el) { $(el).innerHTML = MODE === 'free' ? '' : LEVELS.slice(0, GC.CAMPAIGN).map((_, i) => `<i class="${i < level ? 'done' : i === level ? 'now' : ''}"></i>`).join(''); }
const listOf = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
// a tally: what each hero dealt, finished, healed and took; the best of them is starred
function tallyTable(rows, note) {
  const score = s => s.dealt + s.healed * 1.2 + s.kills * 3 - s.downs * 4;
  const best = rows.reduce((a, b) => score(b.s) > score(a.s) ? b : a, rows[0]);
  return `<table class="rep"><tr><th></th><th>Dealt</th><th>Kills</th><th>Healed</th><th>Taken</th><th>Down</th></tr>${rows.map(r => { const s = r.s; return `<tr${r === best ? ' class="mvp"' : ''}><td><div class="rnm"><span class="rf">${face(r.kind)}</span><span class="rn">${r.name.replace('Sister ', '')}</span>${r === best ? '<em title="Best">★</em>' : ''}</div></td><td>${s.dealt}</td><td>${s.kills}</td><td>${s.healed}</td><td>${s.taken}</td><td>${s.downs}</td></tr>`; }).join('')}</table><p class="repn">${note}</p>`;
}
function report() {
  const st = G.S.stats, rows = units.filter(u => u && u.side === 'hero' && st[u.id]).map(u => ({ kind: u.kind, name: u.name, s: st[u.id] }));
  return tallyTable(rows, '★ Best in battle: most harm dealt and healed');
}
function campaignReport() {
  const rows = ['fighter', 'cleric', 'mage', 'thief'].filter(k => CAMP.tally[k]).map(k => ({ kind: k, name: GC.UNITS[k].name, s: CAMP.tally[k] }));
  return rows.length ? `<h3>The whole campaign · ${CAMP.battles} battle${CAMP.battles === 1 ? '' : 's'} fought</h3>` + tallyTable(rows, '★ Hero of the campaign') : '';
}
// a won battle's experience joins each hero's growth: [{ kind, name, gained, lv, xp, ups: [{ lv, power }] }]
function applyXp() {
  return G.S.units.filter(u => u.side === 'hero' && G.S.stats[u.id]).map(u => {
    const g = CAMP.growth[u.kind] || (CAMP.growth[u.kind] = { lv: 1, xp: 0 }), gained = G.S.stats[u.id].xp, ups = GC.gainXp(g, u.kind, gained);
    return { kind: u.kind, name: u.name, gained, lv: g.lv, xp: g.xp, ups };
  });
}
// the experience each hero earned: a bar toward the next level, and any level gained with the power it brings
function xpReport(rows) {
  if (!rows.length) return '';
  const X = GC.TUNE.xp, any = rows.some(r => r.ups.length);
  if (any) setTimeout(() => sfx('win'), 900);
  return `<h3>Experience</h3><div class="xpl">${rows.map(r => `<div class="xpr${r.ups.length ? ' up' : ''}"><span class="rf">${face(r.kind)}</span><div class="xpb"><div class="xpt"><b>${r.name.replace('Sister ', '')}</b><span>Lv ${r.lv}</span><em>+${r.gained} XP</em></div><span class="bar"><i style="width:${r.lv >= X.max ? 100 : r.xp / X.level * 100}%"></i></span>${r.ups.map(u => `<p class="lvup">Level ${u.lv}! +${X.hp} max HP${u.power ? ` · learns <b>${CARDS[u.power].name}</b>: ${CARDS[u.power].text.replace('{die}', diceText(u.power))}` : ''}</p>`).join('')}</div></div>`).join('')}</div>`;
}
const diceText = id => { const c = CARDS[id], n = c.n || 1; return c.weapon ? 'its weapon die' : c.die ? (n > 1 ? n : '') + 'd' + c.die : ''; };
function gameOver(win) {
  UI.over = true; UI.phase = 'over'; UI.sel = null; UI.card = null; UI.active = null; UI.inspect = null; UI.intents = []; refresh();
  if (win) heroes().forEach((h, i) => wait(300 + i * 140).then(() => { faceViewer(h); playClip(h, 'cheer'); }));
  const last = level === GC.CAMPAIGN - 1, rounds = G.S.round, L = LEVELS[level], rep = report();
  const free = MODE === 'free' || !!L.extra; // a battle past the campaign is always the level select's
  $('#endMenu').hidden = !free;
  if (free) return freeOver(win, rounds, L, rep);
  // the campaign moves on at once (closing the page during the closing scene keeps the result)
  addTally(); CAMP.state = null;
  const xpRep = win ? xpReport(applyXp()) : '';
  const campRep = win && last ? campaignReport() : '';
  if (win && !last) { CAMP.level = level + 1; CAMP.offer = GC.offerBoons(CAMP.boons); }
  if (win && last) CAMP = freshCamp(CAMP.diff); // the campaign is won: the next visit starts a new one
  saveCamp();
  setTimeout(async () => {
    const sc = DLG.scenes[level]; await talk(sc && (win ? sc.win : sc.lose));
    const t = $('#endTitle'), btn = $('#againBtn');
    const up = heroes().map(h => h.name), down = units.filter(h => h && h.side === 'hero' && h.alive && h.down).map(h => h.name);
    $('#endBoons').hidden = true; btn.disabled = false;
    if (win) level++;
    steps('#endSteps');
    if (win && last) {
      t.textContent = 'The Goblin King Falls'; t.className = 'win';
      $('#endText').textContent = `Grubnash's crown rolls across the flagstones and the crypt is yours. ${listOf(up)} walk${up.length === 1 ? 's' : ''} out into the daylight${down.length ? `, carrying ${listOf(down)}` : ''}.`;
      $('#endReport').innerHTML = xpRep + rep + campRep;
      btn.textContent = 'New campaign'; endAction = newCampaign; sfx('win');
    } else if (win) {
      t.textContent = 'Victory'; t.className = 'win';
      $('#endText').textContent = `${L.name} is cleared in ${rounds} round${rounds > 1 ? 's' : ''}. ${down.length ? `${listOf(down)} ${down.length > 1 ? 'are' : 'is'} carried from the field and back on their feet by nightfall. ` : ''}The party makes camp before ${LEVELS[level].name}.`;
      $('#endReport').innerHTML = xpRep + rep;
      offerBoons(() => loadLevel(level), 'March on'); sfx('crit');
    } else {
      const n = units.filter(u => u && u.alive && u.side === 'gob').length;
      t.textContent = 'The Party Has Fallen'; t.className = 'lose';
      $('#endText').textContent = `The goblins hold ${L.name}. ${n} foe${n === 1 ? '' : 's'} still stand${n === 1 ? 's' : ''}. Regroup and try this battle again.`;
      $('#endReport').innerHTML = rep;
      btn.textContent = 'Retry battle'; endAction = () => loadLevel(level); sfx('taunt');
    }
    $('#end').hidden = false;
  }, win ? 1500 : 1100);
}

// a battle from the level select is over: the tally, then play it again or go back to the title
function freeOver(win, rounds, L, rep) {
  setTimeout(async () => {
    const sc = DLG.scenes[level]; await talk(sc && (win ? sc.win : sc.lose));
    const t = $('#endTitle'), btn = $('#againBtn'), n = units.filter(u => u && u.alive && u.side === 'gob').length;
    $('#endBoons').hidden = true; btn.disabled = false; steps('#endSteps');
    t.textContent = win ? 'Victory' : 'The Party Has Fallen'; t.className = win ? 'win' : 'lose';
    $('#endText').textContent = win ? `${L.name} is cleared in ${rounds} round${rounds > 1 ? 's' : ''}.` : `The goblins hold ${L.name}. ${n} foe${n === 1 ? '' : 's'} still stand${n === 1 ? 's' : ''}.`;
    $('#endReport').innerHTML = rep;
    btn.textContent = win ? 'Play it again' : 'Try again'; endAction = () => loadLevel(level); sfx(win ? 'crit' : 'taunt');
    $('#end').hidden = false;
  }, win ? 1500 : 1100);
}

// ---------------- combat log ----------------
const combatLog = [];
function logEvent(html, cls = '') {
  combatLog.push({ html, cls }); if (combatLog.length > 400) combatLog.shift();
  if (!$('#logv').hidden) renderLog();
}
const logName = u => `<b>${u.name}</b>`;
function renderLog() {
  const box = $('#logList');
  box.innerHTML = combatLog.length ? combatLog.map(e => `<div class="le ${e.cls}">${e.html}</div>`).join('') : '<div class="le empty">Nothing has happened yet.</div>';
  box.scrollTop = box.scrollHeight;
}
function renderTools() { $('#menuUndo').disabled = !(undoStack.length && !UI.busy && UI.phase === 'player' && !UI.over); }

