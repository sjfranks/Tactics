'use strict';
// GOBLIN CRYPT · THE TABLE · the camera, the frame loop and start-up (loads last)
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- camera & loop ----------------
let topH = 80, dockH = 220;
function measure() { topH = $('#top').getBoundingClientRect().bottom + 16; dockH = $('#dock').offsetHeight + 34; document.documentElement.style.setProperty('--dk', ($('#dock').offsetHeight + 4) + 'px'); }
// on a wide screen the camera looks across the board from the east, so the party (south) is on the left and the goblins (north) on the right
let baseAzLast = null;
const baseAz = () => innerWidth > innerHeight * 1.1 ? Math.PI / 2 : 0;
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  const b = baseAz(); if (baseAzLast === null) { camAz = camAzT = b; } else if (b !== baseAzLast) camAzT += angDiff(b, baseAzLast); baseAzLast = b;
  measure();
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(measure).observe($('#dock'));
const bigMap = () => COLS > VIEWC || ROWS > VIEWR;
// any square can be brought to the middle of the frame
function clampCam() { if (!bigMap()) { camTX = camTZ = 0; return; } // a 6 × 8 board always sits whole in the frame
  const mx = (COLS - 1) / 2, mz = (ROWS - 1) / 2; camTX = Math.max(-mx, Math.min(mx, camTX)); camTZ = Math.max(-mz, Math.min(mz, camTZ)); }
function focusOn(p) { if (!bigMap() || (Math.abs(p.x - camTX) < 1.6 && Math.abs(p.z - camTZ) < 2.4)) return; camTX = p.x; camTZ = p.z; clampCam(); }
function updateCamera() {
  const W = innerWidth, H = innerHeight;
  const avail = Math.max(140, H - topH - dockH);
  const yc = topH + avail / 2, s = H / 2 - yc, vH = H + 2 * Math.abs(s), y0 = vH / 2 - yc;
  camera.aspect = W / vH; camera.setViewOffset(W, vH, 0, y0, W, H);
  const ppt = vH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const ca = Math.abs(Math.cos(camAz)), sa = Math.abs(Math.sin(camAz)), VC = Math.min(COLS, VIEWC), VR = Math.min(ROWS, VIEWR);
  const ex = VC * ca + VR * sa + .08, ez = VC * sa + VR * ca + .08, cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const dW = (ex / 2) * ppt / (W / 2) + (ez / 2) * cp;
  const dH = ((ez / 2) * sp + .25) * ppt / (avail / 2) + (ez / 2) * cp * .45;
  const d = Math.max(dW, dH) * zoom * (1 - kick); // a crit or a king's fall leans the camera in
  camera.position.set(camX + Math.sin(camAz) * cp * d, sp * d, camZ + Math.cos(camAz) * cp * d);
  if (shakeAmt > .002) { camera.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shakeAmt)); shakeAmt *= .84; }
  camera.near = Math.max(.5, d * .3); camera.far = d + 40; // a near plane close to the board keeps depth precise on phones
  camera.lookAt(camX, .1, camZ); camera.updateProjectionMatrix();
  scene.fog.near = d + 3; scene.fog.far = d + 16;
}
const tmpV = new V3();
function project(p) { tmpV.copy(p).project(camera); return [(tmpV.x + 1) / 2 * innerWidth, (1 - tmpV.y) / 2 * innerHeight, tmpV.z]; }
let last = performance.now(), perfFrames = 0, perfTime = 0, perfStage = 0;
function adaptPerf(dt) { // slow device: drop resolution, then soften shadows
  if (perfStage > 1 || document.hidden) return;
  perfFrames++; perfTime += dt;
  if (perfFrames < 90) return;
  const avg = perfTime / perfFrames; perfFrames = 0; perfTime = 0;
  if (avg < 1 / 40) return;
  if (perfStage === 0 && pixelRatio > 1.25) { pixelRatio = 1.25; renderer.setPixelRatio(pixelRatio); resize(); perfStage = 1; }
  else { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; perfStage = 2; }
}
function frame(t) {
  requestAnimationFrame(frame);
  const raw = t - last, dt = Math.min(.05, raw / 1000); last = t; now = t;
  if (t > 3000) adaptPerf(dt);
  const v0 = vnow; runTweens(raw); const dv = (vnow - v0) / 1000;
  camAz += (camAzT - camAz) * Math.min(1, dt * 7);
  if (follow && bigMap()) { camTX = follow.root.position.x; camTZ = follow.root.position.z; clampCam(); } // keep a moving piece in the middle
  if (!bigMap()) { camTX = camTZ = 0; zoomT = Math.max(1, zoomT); } // small boards: no panning, and never zoomed in past the whole board
  camX += (camTX - camX) * Math.min(1, dt * 6); camZ += (camTZ - camZ) * Math.min(1, dt * 6);
  zoom += (zoomT - zoom) * Math.min(1, dt * 6); kick += (0 - kick) * Math.min(1, dt * 4);
  updateCamera();
  emitFlames(dt); updateParticles(dt);
  if (Math.random() < dt * 7) spawn({ pos: new V3(rand(-COLS / 2 - 1, COLS / 2 + 1), rand(2.2, 3.2), rand(-ROWS / 2 - 1, ROWS / 2 + 1)), vel: new V3(rand(.05, .2), rand(-.25, -.12), rand(-.05, .05)), color: Math.random() < .12 ? 0xe8873a : 0x5a5650, size: rand(.03, .06), life: rand(6, 9), smoke: Math.random() > .12, op: .7 }); // drifting ash from distant fires, the odd live ember
  for (const f of flickers) f.L.intensity = f.base * (.82 + .12 * Math.sin(t * .011 + f.seed) + .08 * Math.sin(t * .027 + f.seed * 3));
  lvLight.intensity = (lvLight.userData.base || 0) * (.85 + .15 * Math.sin(t * .007));
  for (const c of candles) c.s.scale.setScalar(.2 + .03 * Math.sin(t * .02 + c.seed));
  lavaTex.offset.x = (lavaTex.offset.x + dt * .015) % 1; lavaTex.offset.y = (lavaTex.offset.y + dt * .006) % 1;
  const pulse = .75 + .25 * Math.sin(t * .006);
  HL.forEach(h => { if (h.visible) h.material.opacity = h.userData.op * (.8 + .2 * Math.sin(t * .005)); });
  leanAxis.set(Math.cos(camAz), 0, -Math.sin(camAz));
  let mover = null;
  for (const u of units) {
    if (!u) continue;
    if (u.alive) { const lp = u.lastPos || (u.lastPos = u.root.position.clone()); if (lp.distanceToSquared(u.root.position) > 1e-6 && !(drag && drag.u === u)) mover = u; lp.copy(u.root.position); }
    if (!u.alive && !u.root.parent) continue;
    rigTick(u, dv);
    { // standee lean in world space: stand = yaw⁻¹ · lean · yaw
      const amt = u.alive && !u.st.prone ? LEAN : 0;
      const cur = (u.stand.userData.lean ?? 0); const nl = cur + (amt - cur) * Math.min(1, dt * 8); u.stand.userData.lean = nl;
      yawQ.setFromAxisAngle(UP, u.piece.rotation.y); leanQ.setFromAxisAngle(leanAxis, -nl);
      u.stand.quaternion.copy(yawQ).invert().multiply(leanQ).multiply(yawQ);
    }
    groundFit(u, dv);
    u.ring.position.set(u.root.position.x, u.root.position.y + .035, u.root.position.z); lieFlat(u.ring, u.root.position.x, u.root.position.z, camAz);
    if (u.alive) {
      // turns alternate, so a hero who has acted keeps its full colour on the board; the turn strip shows who has gone
      const sel = u === UI.sel || u === UI.active;
      if (u.side === 'hero') { const pp = UI.phase === 'player' && u === UI.active && !u.down; u.tag.classList.toggle('pp', pp); if (pp) renderPips(u); }
      u.ring.material.opacity = u.down ? .22 : sel ? pulse : .95; u.tag.classList.toggle('sel', sel); u.ring.scale.setScalar((sz(u) > 1 ? 2.05 : 1) * (sel ? 1 + .06 * Math.sin(t * .008) : 1));
      if (u.fx.bless) u.fx.bless.position.set(Math.cos(t * .004) * .35, u.h * .8, Math.sin(t * .004) * .35);
      if (u.fx.taunt) u.fx.taunt.material.opacity = .25 + .15 * Math.sin(t * .01);
      const ln = u.stand.userData.lean || 0, hh = u.h * .88 + .1;
      const [x, y, z] = project(tmpV.copy(u.root.position).addScaledVector(camToward(), -Math.sin(ln) * hh).setY(u.root.position.y + u.piece.position.y + Math.cos(ln) * hh));
      const vh = viewHides(u);
      u.tag.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; u.tag.style.display = z < 1 && u.deployed ? '' : 'none';
      if (vh !== !!u.viewFaded) { u.viewFaded = vh; u.piece.visible = u.deployed && !vh; u.ring.visible = u.deployed && !vh; u.blob.visible = u.deployed && !vh; u.tag.classList.toggle('of', vh); u.tag.dataset.floor = u.l === 1 ? '▲' : '▼'; }
    }
  }
  if (mover) follow = mover; else if (follow) follow = null;
  if (reticle.visible && reticleOn) { const q = reticleOn.root.position; reticle.position.set(q.x, q.y + .07, q.z); lieFlat(reticle, q.x, q.z, t * .0012); reticle.material.opacity = (reticle.userData.op ?? 1) * (.8 + .2 * Math.sin(t * .009)); }
  if (smashMarks) smashMat.opacity = .5 + .35 * Math.sin(t * .009);
  if (G && G.B.vents.length) { const soon = UI.phase !== 'intro' && (G.S.round + 1) % GC.TUNE.vents.every === 0; ventMat.emissiveIntensity = soon ? 1.1 + .9 * (.5 + .5 * Math.sin(t * .01)) : .8; } // vents throb the round before they blow
  if (rollAt && !$('#roll').hidden) placeRoll();
  updateBubbles(t);
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i], k = (t - f.t0) / f.dur;
    if (k >= 1) { f.el.remove(); floats.splice(i, 1); continue; }
    const [x, y] = project(tmpV.copy(f.pos).setY(f.pos.y + k * .5));
    const sc = k < .15 ? .6 + k / .15 * .5 : 1.1 - Math.min(.1, (k - .15));
    f.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%) scale(${sc})`; f.el.style.opacity = k > .7 ? (1 - k) / .3 : 1;
  }
  drawIntents();
  renderer.render(scene, camera);
}

// ---------------- start-up (the campaign and its save are in campaign.js) ----------------
try { window.claude?.hot?.snapshot?.(snapshot); } catch (e) { }
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
