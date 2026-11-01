'use strict';
// GOBLIN CRYPT · THE TABLE · what each kind of event looks like: blows, deaths, shoves, heals, ice, dice replay, Grubnash
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- effects: what each kind of event looks like ----------------
function flash(u, color = 0xff2a1a) {
  const c = new THREE.Color(color), tmp = new THREE.Color();
  return tween(200, k => u.piece.traverse(o => { if (o.isMesh && o.material && o.material.userData.e0 && o.material.userData.e0.isColor) { tmp.copy(c).lerp(o.material.userData.e0, k); o.material.emissive.copy(tmp); o.material.emissiveIntensity = 1 + (o.material.userData.ei0 - 1) * k; } }), ease.lin);
}
function setHasted(u, on) {
  u.st.hasted = on;
  if (on && !u.fx.haste) { u.fx.haste = glowSprite(0x7dffb0, .3); u.fx.haste.position.y = .2; u.piece.add(u.fx.haste); }
  if (!on && u.fx.haste) { u.piece.remove(u.fx.haste); u.fx.haste = null; }
  updateTag(u);
}
// a status as the rules name it, put on or taken off a piece; instant: no tween (undo, reload)
function applyStatus(u, k, on, instant) {
  if (k === 'prone') {
    if (!instant) return setProne(u, on);
    u.st.prone = on; if (on) proneNow(u); else standNow(u); updateTag(u); return null;
  }
  if (k === 'rebuked') return setRebuked(u, on ? 1 : 0);
  if (k === 'warded') return setGlow(u, k, on, 0x6ab8ff, .55);
  if (k === 'poisoned') return setGlow(u, k, on, 0x8ae04a, .3);
  const f = { hidden: setHidden, blessed: setBlessed, hasted: setHasted, frozen: setFrozen, taunt: setTaunt }[k];
  return f ? f(u, on) : null;
}
function standNow(u) { u.piece.rotation.x = 0; u.piece.rotation.z = 0; u.piece.position.set(0, 0, 0); resetRig(u); if (u.st.hidden) setBase(u, 'sneak'); }
// a fallen hero: grey, lying where they fell, waiting for a healer
function setDownLook(u, on) {
  u.down = on; u.tag.classList.toggle('down', on); updateTag(u); setArmour(u, u.armour || 0);
  if (!u.grey) return;
  const g0 = u.grey.value, g1 = on ? .85 : 0;
  if (QUIET) u.grey.value = g1; else tween(on ? 520 : 320, k => { u.grey.value = g0 + (g1 - g0) * k; });
}
// the impact of a blow: the table stops for a beat (hit-stop), slows down (a killing blow), or the camera leans in (a crit)
let hitStop = 0, slowT = 0, slowK = 1, kick = 0;
function hitstop(ms) { if (!QUIET && !ffwd) hitStop = Math.max(hitStop, ms); }
function slowmo(ms, k) { if (QUIET || ffwd) return; slowT = Math.max(slowT, ms); slowK = Math.min(slowK, k); }
// a number that jumps off the struck piece, sized by the blow
function numFloat(u, n, crit) {
  const p = u.root.position.clone().addScaledVector(camRight(), .34).setY(u.root.position.y + u.h * .75);
  floatAt(p, n > 0 ? '−' + n : '0', 'num ' + (crit ? 'crit' : u.side === 'hero' ? 'hurt' : 'dmg') + (n >= 8 ? ' s3' : n >= 4 ? ' s2' : ''), null, 1000);
}
function verdictFx(t, kind) {
  if (!t || !t.alive) return;
  const [txt, cls] = kind === 'miss' ? ['Miss!', 'vmiss'] : kind === 'crit' ? ['Crit!', 'crit'] : ['Hit!', 'vhit'];
  floatAt(t.root.position.clone().setY(t.root.position.y + t.h + .3), txt, 'verdict ' + cls, null, 1400);
}
// a brief word above the dock: whose turn it is now
function toast(text) { if (QUIET) return; const box = $('#combos'), e = document.createElement('div'); e.className = 'combo turn'; e.textContent = text; box.appendChild(e); setTimeout(() => e.remove(), 1500); }
function missFx(t) { if (!t || !t.alive) return; sfx('whoosh'); roResult(t, `<b>Miss</b>${shortName(t)}`, 'info'); }
function damageFx(e) {
  const t = vu(e.id); if (!t) return;
  const fin = e.amount; t.hp = e.hp; updateTag(t);
  t._ro = roResult(t, `<b>${fin > 0 ? '−' + fin : '0'}</b>${shortName(t)}${e.soak ? `<small>armour stops ${e.soak}</small>` : ''}`, t.side === 'hero' ? 'hurt' : (e.crit || fin >= 8 ? 'crit' : 'dmg'));
  numFloat(t, fin, e.crit);
  sfx('hit'); flash(t, 0xffffff); shake(fin >= 6 ? .14 : .07);
  if (t.side === 'hero' && fin > 0 && !QUIET) { const v = $('#hurt'); v.style.setProperty('--k', Math.min(1, .35 + fin / 10).toFixed(2)); v.classList.remove('go'); void v.offsetWidth; v.classList.add('go'); } // the edges of the table flush red when a hero bleeds
  if (e.crit || fin >= 6) hitstop(e.crit ? 120 : 70);
  if (fin > 0) burst(chest(t), t.side === 'gob' && t.kind !== 'warg' ? [0x3e4a12, 0x2a3008, 0x5a1a0c] : [0x7a0e0a, 0x5a0806, 0x3a0404], 6 + Math.min(14, fin * 2), 1.7, .07, .55, { grav: 7, up: .25, drag: .4, smoke: true, op: 1 }); // blood (goblins bleed dark ichor)
  const from = e.from != null ? vu(e.from) : e.src, dx = from ? Math.sign(t.c - from.c) : 0, dz = from ? Math.sign(t.r - from.r) : 0;
  if ((dx || dz) && !t.down) knock(t, dx, dz);
  renderDock();
  return t.hp > 0 ? wait(90) : null;
}
// fade a piece into the ground and take it off the table
async function fadeOut(u, ms) {
  u.piece.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; } });
  u.blob.visible = false;
  const y0 = u.piece.position.y;
  await tween(ms, t => { u.piece.position.y = y0 - .25 * t; u.piece.traverse(o => { if (o.isMesh) o.material.opacity = 1 - t; }); u.ring.material.opacity = 1 - t; }, ease.in);
  scene.remove(u.root); scene.remove(u.ring);
}
// struck down: turn to the blow, stagger and fall; the body fades while play goes on
async function killFx(e) {
  const u = vu(e.id); if (!u || !u.alive) return;
  u.alive = false; u.tag.remove(); sfx('topple');
  if (u._ro) { u._ro.classList.add('ko'); u._ro.insertAdjacentHTML('beforeend', '<small>defeated</small>'); }
  if (UI.sel === u) UI.sel = null; if (UI.inspect === u) UI.inspect = null;
  shake(u.def.boss ? .38 : .1);
  const last = G.S.result === 'win' && !units.some(x => x && x !== u && x.alive && x.side === 'gob' && !G.U(x.id).fled);
  if (u.def.boss || last) { slowmo(u.def.boss ? 1300 : 800, u.def.boss ? .28 : .4); kick = Math.max(kick, u.def.boss ? .1 : .06); } else hitstop(60);
  if (u.def.boss) updateBoss();
  if (e.fell) { scene.remove(u.root); scene.remove(u.ring); return; }
  const from = e.from != null ? vu(e.from) : null;
  if (!u.st.prone) {
    if (from && (from.c !== u.c || from.r !== u.r)) await turnTo(u, from.c, from.r);
    playClip(u, 'die', { hold: true });
    await wait(170);
    const p0 = { rx: u.piece.rotation.x, rz: u.piece.rotation.z, x: u.piece.position.x, z: u.piece.position.z }, p1 = proneTarget(u);
    await tween(380, t => { u.piece.rotation.x = p0.rx + (p1.rx - p0.rx) * t; u.piece.rotation.z = p0.rz + (p1.rz - p0.rz) * t; u.piece.position.set(p0.x + (p1.x - p0.x) * t, p1.y * t, p0.z + (p1.z - p0.z) * t); }, ease.in);
    dust(u.root.position); sfx('drop');
  }
  wait(380).then(() => fadeOut(u, 520));
}
// a hero at 0 is down, not dead: the body drops where it stood and greys out
async function downFx(e) {
  const u = vu(e.id); if (!u) return;
  QUIET = true; try { ['hidden', 'blessed', 'hasted', 'frozen', 'taunt', 'rebuked'].forEach(k => { if (u.st[k]) applyStatus(u, k, false, true); }); } finally { QUIET = false; }
  sfx('topple'); shake(.18); hitstop(100);
  if (u._ro) { u._ro.classList.add('ko'); u._ro.insertAdjacentHTML('beforeend', '<small>down</small>'); }
  floatAt(u.root.position.clone().setY(u.root.position.y + u.h + .3), 'Down!', 'verdict vdown', 'heal can raise them', 1700);
  setDownLook(u, true); setTimeout(() => tip('down'), 1800);
  if (!u.st.prone) await setProne(u, true); else playClip(u, 'down', { hold: true });
  if (UI.sel === u && u.side === 'hero') UI.card = null;
  renderDock();
}
// thrown over the edge of the gorge: a stumble, a long fall, gone
async function fallFx(e) {
  const t = vu(e.id); if (!t) return;
  t._ro = roResult(t, `<b>Falls</b>${shortName(t)}`, 'crit');
  const a = t.root.position.clone(), b = cellPos(e.to.c, e.to.r);
  playClip(t, 'jump', { hold: true });
  await tween(230, k => t.root.position.set(a.x + (b.x - a.x) * k, a.y + Math.sin(Math.PI * k) * .18, a.z + (b.z - a.z) * k), ease.out);
  sfx('topple'); shake(.16); const rx = t.piece.rotation.x;
  await tween(560, k => { t.root.position.y = a.y - 3 * k * k; t.piece.rotation.x = rx - 1.3 * k; }, ease.lin);
  burst(b.clone().setY(a.y - 1.4), 0x8a8078, 14, .8, .5, 1, { smoke: true, op: .5, grow: 1.3 });
  t.hp = 0; t.c = e.to.c; t.r = e.to.r; updateTag(t);
}
// moved by force: shoved back a square, hauled by the fighter, or tossed aside
async function pushFx(e) {
  const t = vu(e.id); if (!t) return;
  const a = t.root.position.clone(), to = e.to, b = posOf(t, to.c, to.r, to.l || 0), lying = t.st.prone || t.down;
  if (e.style === 'shove') {
    sfx('whoosh'); const [kx, kz] = tiltDir(t, e.dir[0], e.dir[1]);
    await tween(170, k => { t.root.position.x = a.x + (b.x - a.x) * k; t.root.position.z = a.z + (b.z - a.z) * k; t.root.position.y = a.y + (b.y - a.y) * k * k; if (!lying) { const s = Math.sin(Math.PI * k); t.piece.rotation.x = kx * .3 * s; t.piece.rotation.z = kz * .3 * s; } }, ease.out);
  } else {
    const toss = e.style === 'toss', hgt = toss ? .75 : .4;
    if (toss) { sfx('hit'); flash(t, 0xffffff); }
    if (!lying) playClip(t, 'jump', { hold: true });
    await tween(toss ? 340 : 300, k => t.root.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + Math.sin(Math.PI * k) * hgt, a.z + (b.z - a.z) * k), ease.out);
    if (!lying) { releaseClip(t); playClip(t, 'land'); }
  }
  t.c = to.c; t.r = to.r; t.l = to.l || 0; t.root.position.copy(posOf(t)); dust(b); sfx('drop');
}
// the rope hook: a line to the square, and a swing over whatever lies between
async function swingFx(e) {
  const u = vu(e.id); if (!u) return; const cell = e.to;
  if (e.style === 'blink') { // Blink: a flash where the mage stood, and another where she appears
    const a = u.root.position.clone(), b = cellPos(cell.c, cell.r, cell.l);
    sfx('frost'); burst(a.clone().setY(a.y + .5), [0xc8a0ff, 0xffffff, 0x8a6aff], 26, 1.4, .2, .6, { up: .4 });
    u.piece.visible = false; await wait(200);
    u.root.position.copy(b); u.c = cell.c; u.r = cell.r; u.l = cell.l || 0;
    u.piece.visible = !viewHides(u); burst(b.clone().setY(b.y + .5), [0xc8a0ff, 0xffffff, 0x8a6aff], 26, 1.4, .2, .6, { up: .4 });
    setView(viewFor(u)); return;
  }
  sfx('whoosh');
  const a = u.root.position.clone(), b = cellPos(cell.c, cell.r, cell.l), lift = .6 + Math.abs(b.y - a.y) * .3;
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone().setY(a.y + .6), b.clone().setY(b.y + .05)]), new THREE.LineBasicMaterial({ color: 0xd8c8a0 }));
  scene.add(line); await wait(160); sfx('clack', .6); playClip(u, 'jump', { hold: true });
  await tween(460, k => {
    const e2 = ease.inOut(k);
    u.root.position.set(a.x + (b.x - a.x) * e2, a.y + (b.y - a.y) * e2 + Math.sin(Math.PI * k) * lift, a.z + (b.z - a.z) * e2);
    line.geometry.setFromPoints([u.root.position.clone().setY(u.root.position.y + .6), b.clone().setY(b.y + .05)]);
  }, ease.lin);
  scene.remove(line); line.geometry.dispose();
  u.root.position.copy(b); u.c = cell.c; u.r = cell.r; u.l = cell.l || 0;
  dust(b); sfx('drop'); releaseClip(u); playClip(u, 'land'); setView(viewFor(u));
}
// Cleave spins the fighter round; Thunderwave bursts out from the mage
async function sweepFx(e) {
  const u = vu(e.id); if (!u) return;
  if (e.style === 'wave') { liftShot(u); sfx('boom'); shake(.2); burst(u.root.position.clone().setY(u.root.position.y + .3), [0xbfd8ff, 0xffffff, 0x8fb8ff], 34, 2.4, .25, .5, { up: 0 }); return; }
  const y0 = u.piece.rotation.y; sfx('whoosh'); playClip(u, 'slash', { spd: 1.3 }); await wait(180);
  await tween(320, t => { u.piece.rotation.y = y0 + Math.PI * 2 * ease.inOut(t); }, ease.lin); u.piece.rotation.y = y0;
}
const sparkle = (u, n, cols, up0, up1, spread = .3) => { for (let i = 0; i < n; i++) spawn({ pos: u.root.position.clone().add(new V3(rand(-spread, spread), rand(.1, .6), rand(-spread, spread))), vel: new V3(0, rand(up0, up1), 0), color: cols[i % cols.length], size: rand(.1, .2), life: rand(.7, 1.2) }); };
function healFx(e) {
  const t = vu(e.id); if (!t) return;
  t.hp = e.hp; updateTag(t);
  sfx('heal'); flash(t, 0x44ff88); sparkle(t, 26, [0x7dff9a, 0xe8ffd0], .5, 1.2);
  if (e.revive) { // raised: a column of light, the colour comes back, still lying until their turn
    setDownLook(t, false); sfx('win'); kick = Math.max(kick, .04);
    sparkle(t, 40, [0xffe08a, 0xfff8e0, 0xffd56a], 1.2, 2.6, .18);
    floatAt(t.root.position.clone().setY(t.root.position.y + t.h + .3), 'Raised!', 'verdict vraise', `${e.hp} HP`, 1600);
  }
  roResult(t, `<b>+${e.amount}</b>${shortName(t)}${e.revive ? '<small>raised</small>' : e.full ? '<small>full health</small>' : ''}`, 'heal'); renderDock();
}
// the little effects the rules ask for by name, at a piece (an id) or a square
const atPos = at => typeof at === 'number' ? (vu(at) ? vu(at).root.position.clone() : new V3()) : at ? cellPos(at.c, at.r, at.l || 0) : new V3();
function playFx(e) {
  const p = atPos(e.at), u = typeof e.at === 'number' ? vu(e.at) : null;
  if (e.kind === 'explosion') explosion(p);
  else if (e.kind === 'steam') steam(p);
  else if (e.kind === 'lava') burst(p.setY(TOP + .1), [0xffd27a, 0xff8a2a, 0xff4a12], 30, 2, .3, .7, { grav: -.4 });
  else if (e.kind === 'bless' && u) for (let i = 0; i < 22; i++) spawn({ pos: u.root.position.clone().add(new V3(rand(-.3, .3), rand(.2, 1), rand(-.3, .3))), vel: new V3(0, rand(.3, .8), 0), color: 0xffd56a, size: rand(.1, .22), life: rand(.7, 1.1) });
  else if (e.kind === 'haste' && u) for (let i = 0; i < 22; i++) spawn({ pos: u.root.position.clone().add(new V3(rand(-.35, .35), rand(.1, .5), rand(-.35, .35))), vel: new V3(rand(-.6, .6), rand(.2, .5), rand(-.6, .6)), color: Math.random() > .5 ? 0x7dffb0 : 0xe8fff0, size: rand(.08, .18), life: rand(.5, .9) });
}
// a melee blow, a shot, a trip or a grab: the move that delivers what the dice decided
async function strikeFx(e) {
  const u = vu(e.id), t = typeof e.to === 'number' ? vu(e.to) : e.to; if (!u || !t) return;
  if (e.style === 'ranged') { await wait(40); await liftShot(u); await projectile(chest(u).setY(u.root.position.y + u.h * .8), t.root ? chest(t) : cellPos(t.c, t.r, t.l || 0).setY(cellPos(t.c, t.r, t.l || 0).y + .45), e.proj || 'arrow'); return; }
  if (e.style === 'trip') { await bump(u, t, .3); knock(t, Math.sign(t.c - u.c), Math.sign(t.r - u.r)); return; }
  if (e.style === 'grab') { await bump(u, t, .3); flash(t, 0xffffff); sfx('whoosh'); return; }
  await wait(40); await bump(u, t, e.amt || .42);
}
// a spell or shot at a square or piece (Fireball, Rebuke, an arrow at the ice); the caster has already raised a hand
function shotFx(e) {
  const u = vu(e.id); if (!u) return;
  const to = typeof e.to === 'number' ? chest(vu(e.to)) : cellPos(e.to.c, e.to.r, e.to.l || 0);
  if (typeof e.to !== 'number') to.y += e.kind === 'fire' ? .25 : .45;
  return projectile(chest(u).setY(u.root.position.y + (e.kind === 'fire' ? 1.2 : u.h * .8)), to, e.kind);
}

// ---------------- ice: blocks of the mage's wall ----------------
const ICE = new Map(); // the blocks on the table: key → { c, r, mesh }
const iceMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: .82, roughness: .08, metalness: 0, emissive: 0x2a6aa0, emissiveIntensity: .45, envMapIntensity: 1.2 });
function makeIce(c, r, quiet) {
  const k = key(c, r); if (ICE.has(k)) return;
  const p = cellPos(c, r), g = new THREE.Group(); g.position.copy(p);
  const b = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.22, .9), iceMat); b.position.y = .21; b.castShadow = true; g.add(b);
  for (let i = 0; i < 3; i++) { const sh = new THREE.Mesh(new THREE.ConeGeometry(rand(.08, .14), rand(.3, .5), 5), iceMat); sh.position.set(rand(-.3, .3), .85, rand(-.3, .3)); sh.rotation.z = rand(-.3, .3); g.add(sh); }
  scene.add(g); ICE.set(k, { c, r, mesh: g });
  if (!quiet && !QUIET) { g.scale.y = .01; tween(260, t => { g.scale.y = .01 + t; }, ease.out); burst(p.clone().setY(p.y + .4), [0xbfe8ff, 0xffffff], 14, 1.1, .2, .6); }
}
function removeIceFx(k, how) {
  const v = ICE.get(k); if (!v) return; ICE.delete(k);
  const p = v.mesh.position.clone();
  if (QUIET) scene.remove(v.mesh);
  else if (how === 'shatter') { scene.remove(v.mesh); burst(p.setY(p.y + .4), [0xbfe8ff, 0xffffff, 0x7fc8ff], 26, 1.8, .2, .7); sfx('frost'); }
  else if (how === 'steam') { steam(p); tween(260, t => { v.mesh.scale.y = 1 - t; v.mesh.scale.x = v.mesh.scale.z = 1 - t * .3; }).then(() => scene.remove(v.mesh)); }
  else if (how === 'melt') tween(500, t => { v.mesh.scale.y = 1 - t; v.mesh.scale.x = v.mesh.scale.z = 1 - t * .3; }).then(() => scene.remove(v.mesh));
  else scene.remove(v.mesh);
}

// ---------------- dice: the rules' throw, thrown again on the table ----------------
const diceFor = u => !u ? 'gob' : u.side === 'hero' ? u.kind : u.kind === 'king' ? 'king' : 'gob';
// every die lands on the face the rules rolled; crits explode into the next row, and with disadvantage the highest dice
// of the first row are set aside
async function showDice(e) {
  const R = e.roll, u = vu(e.id), sides = R.sides, dis = R.dis, noCrit = R.noCrit, center = atPos(e.at), sname = dis ? 'bad' : diceFor(u);
  showRoll(e.label, sides, center.clone().addScaledVector(camToward(), .62).addScaledVector(camRight(), .55));
  if (dis) roNote(dis > 1 ? `Disadvantage ×${dis} · roll +${dis}, keep lowest` : 'Disadvantage · roll +1, keep lowest', 'red');
  (e.notes || []).forEach(n => roNote(n, n.startsWith('Shatter') ? 'blue' : ''));
  (e.bonus || []).forEach(b => addChip(b, 'bonus'));
  for (let row = 0; row < R.rows.length; row++) {
    const { vals, drops } = R.rows[row], hold = dis && row === 0, outs = vals.map(() => ({})), chips = [];
    const spots = diceSpots(vals.length, center.clone().addScaledVector(camToward(), .9));
    if (row === 0) rollAt = spots.reduce((a, v) => a.add(v), new V3()).multiplyScalar(1 / spots.length);
    await Promise.all(vals.map((v, i) => wait(i * 50).then(() => throwDie(sides, sname, spots[i], outs[i], hold || noCrit, v)).then(() => { chips[i] = addChip(v, (!hold && !noCrit && v === sides ? 'crit' : '') + (dis ? ' bad' : '')); })));
    if (hold) await wait(120);
    let next = 0;
    vals.forEach((v, i) => {
      if (drops.includes(i)) { chips[i].classList.add('drop'); const m = outs[i].mesh, s0 = m.scale.x; tween(220, k => m.scale.setScalar(s0 * (1 - .45 * k)), ease.out); return; }
      if (v === sides && !noCrit) { next++; if (hold) { chips[i].classList.add('crit'); critFx(outs[i].mesh, outs[i].to, sides); } }
    });
    if (next) { roNote(next > 1 ? `${next} crits · exploding` : 'Crit · exploding', 'red'); sfx('crit'); await wait(160); }
  }
}

// ---------------- Grubnash ----------------
const chevTex = canvasTex(128, 128, g => { g.strokeStyle = '#fff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; [30, 70].forEach(y => { g.beginPath(); g.moveTo(26, y + 30); g.lineTo(64, y - 4); g.lineTo(102, y + 30); g.stroke(); }); g.globalAlpha = .28; g.fillStyle = '#fff'; g.fillRect(6, 6, 116, 116); }, false);
const smashMat = pullForward(new THREE.MeshBasicMaterial({ map: chevTex, color: 0xff3a1a, transparent: true, depthWrite: false, toneMapped: false }), -3, -6);
let smashMarks = null; // the lane painted on the ground, chevrons pointing the way he will charge
function showSmash(sm) {
  clearSmashFx();
  const [dc, dr] = sm.dir, yaw = Math.atan2(-dc, -dr);
  smashMarks = sm.cells.map(k => {
    const { c, r } = GC.parseKey(k), p = cellPos(c, r, 0), sl = SLOPE && TERR[r][c] === 'floor', geo = sl ? slopeQuadGeo(c, r, 0, .92, true) : new THREE.PlaneGeometry(.92, .92).rotateX(-Math.PI / 2);
    if (sl) { const uv = geo.attributes.uv, cs = Math.cos(yaw), sn = Math.sin(yaw); for (let i = 0; i < uv.count; i++) { const u0 = uv.getX(i) - .5, v0 = uv.getY(i) - .5; uv.setXY(i, .5 + u0 * cs + v0 * sn, .5 - u0 * sn + v0 * cs); } }
    const m = new THREE.Mesh(geo, smashMat); m.position.set(p.x, p.y + .036, p.z); if (!sl) m.rotation.y = yaw; m.renderOrder = 3; scene.add(m); return m;
  });
}
function clearSmashFx() { if (smashMarks) smashMarks.forEach(m => { scene.remove(m); m.geometry.dispose(); }); smashMarks = null; }
// the charge: he thunders down the lane a square at a time, ice bursting and bodies flying as he reaches them
async function smashFx(e) {
  const g = vu(e.id); if (!g) return;
  const [dc, dr] = e.dir, flights = [];
  g.piece.rotation.y = Math.atan2(dc, dr); setBase(g, 'run', 2.4);
  for (let k = 0; k < e.steps.length; k++) {
    e.breaks.filter(b => b.at === k).forEach(b => removeIceFx(b.k, 'shatter'));
    e.tosses.filter(ts => ts.at === k).forEach(ts => flights.push(pushFx({ id: ts.id, to: { ...ts.to, l: 0 }, style: 'toss' })));
    const st = e.steps[k], a = g.root.position.clone(), b = posOf(g, st.c, st.r, 0); g.c = st.c; g.r = st.r;
    await tween(165, t => g.root.position.lerpVectors(a, b, t), ease.lin);
    dust(g.root.position); shake(.07); sfx('clack', .6);
  }
  setBase(g, restBase(g));
  await Promise.all(flights);
}
// the court breaks and runs: each goblin turns tail toward the far side of the hall and fades as it goes
async function routFx(ids) {
  const hs = heroes(), cx = hs.reduce((a, h) => a + h.root.position.x, 0) / (hs.length || 1), cz = hs.reduce((a, h) => a + h.root.position.z, 0) / (hs.length || 1);
  await Promise.all(ids.map((id, i) => wait(i * 110).then(async () => {
    const u = vu(id); if (!u || !u.alive) return;
    u.alive = false; u.tag.remove(); if (UI.inspect === u) UI.inspect = null;
    const a = u.root.position.clone(), dir = new V3(a.x - cx, 0, a.z - cz); if (dir.lengthSq() < .01) dir.set(0, 0, -1); dir.normalize();
    if (u.st.prone || u.st.frozen) { await fadeOut(u, 600); return; }
    u.piece.rotation.y = Math.atan2(dir.x, dir.z); setBase(u, 'run', 1.9); sfx('whoosh');
    const run = tween(900, t => { u.root.position.set(a.x + dir.x * 2.4 * t, a.y, a.z + dir.z * 2.4 * t); }, ease.in);
    await wait(250); await fadeOut(u, 650); await run;
  })));
}

