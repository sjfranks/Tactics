'use strict';
// GOBLIN CRYPT · THE TABLE · dice models, the throw, and the readout box
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- dice ----------------
const diceCache = {};
const DICE_STYLE = { // bone, iron, old blood and tarnished brass
  fighter: { bg: '#5a1814', ink: '#d9b56e' }, cleric: { bg: '#d6cab0', ink: '#5a3a14' }, mage: { bg: '#1e2840', ink: '#d6dce8' },
  thief: { bg: '#141216', ink: '#b09ccc' }, crit: { bg: '#e2a63a', ink: '#5a0a00' }, bad: { bg: '#6e0e10', ink: '#ead2c2' }, gob: { bg: '#4a5628', ink: '#141008' }, king: { bg: '#140a08', ink: '#cfa046' }
};
function faceTex(style, shape, labels) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = style.bg; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w * .42, h * .4, 10, w * .5, h * .5, w * .8); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.lineWidth = 16; g.strokeStyle = 'rgba(0,0,0,.4)';
    if (shape === 'sq') g.strokeRect(0, 0, w, h); else if (shape === 'kite') { g.beginPath(); g.moveTo(128, 5); g.lineTo(38, 204); g.lineTo(128, 251); g.lineTo(218, 204); g.closePath(); g.stroke(); } // a d10's face: its wide corners lie 81% of the way down else { g.beginPath(); g.moveTo(0, 256); g.lineTo(256, 256); g.lineTo(128, 34); g.closePath(); g.stroke(); }
    g.fillStyle = style.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    if (shape === 'sq') { g.font = 'bold 140px "Bricolage Grotesque",sans-serif'; g.fillText(labels[0], 128, 138); }
    else if (shape === 'kite') { g.font = `bold ${String(labels[0]).length > 1 ? 70 : 88}px "Bricolage Grotesque",sans-serif`; g.fillText(labels[0], 128, 146); if (labels[0] === 6 || labels[0] === 9) g.fillRect(108, 186, 40, 7); }
    else if (shape === 'tri') { g.font = 'bold 84px "Bricolage Grotesque",sans-serif'; g.fillText(labels[0], 128, 186); }
    else {
      const V = [[0, 256], [256, 256], [128, 34]], G = [128, 182]; g.font = 'bold 50px "Bricolage Grotesque",sans-serif';
      V.forEach((v, i) => { const dx = v[0] - G[0], dy = v[1] - G[1]; g.save(); g.translate(G[0] + dx * .55, G[1] + dy * .55); g.rotate(Math.atan2(dx, -dy)); g.fillText(labels[i], 0, 4); g.restore(); });
    }
  });
}
function dieMat(tex, sname) { const m = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .3, metalness: .02, clearcoat: 1, clearcoatRoughness: .18, emissive: sname === 'mage' ? 0x0a1a44 : sname === 'crit' ? 0xff7a00 : sname === 'bad' ? 0x6a0008 : 0x000000 }); if (sname === 'crit') { m.emissiveMap = tex; m.emissiveIntensity = .55; } return m; }
function triGeo(tris) {
  const pos = [], uv = [], g = new THREE.BufferGeometry();
  tris.forEach((t, i) => { pos.push(...t[0].toArray(), ...t[1].toArray(), ...t[2].toArray()); uv.push(0, 0, 1, 0, .5, .866); g.addGroup(i * 3, 3, i); });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function orient(a, b, c) { const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)); const cen = a.clone().add(b).add(c); return n.dot(cen) < 0 ? [a, c, b] : [a, b, c]; }
function dieKit(sides, sname) {
  const k = sides + sname; if (diceCache[k]) return diceCache[k];
  const style = DICE_STYLE[sname]; let kit;
  if (sides === 6) {
    const s = .3, nums = [1, 6, 2, 5, 3, 4], ns = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    kit = { geo: new THREE.BoxGeometry(s, s, s), mats: nums.map(n => dieMat(faceTex(style, 'sq', [n]), sname)), faces: nums.map((v, i) => ({ v, n: new V3(...ns[i]) })), rest: s / 2 };
  } else if (sides === 2) { // a coin: 1 on one face, 2 on the other
    const geo = new THREE.CylinderGeometry(.2, .2, .06, 28);
    kit = { geo, mats: [dieMat(faceTex(style, 'sq', ['']), sname), dieMat(faceTex(style, 'sq', [1]), sname), dieMat(faceTex(style, 'sq', [2]), sname)], faces: [{ v: 1, n: new V3(0, 1, 0) }, { v: 2, n: new V3(0, -1, 0) }], rest: .03 };
  } else if (sides === 10) { // pentagonal trapezohedron: ten kites, five round the top apex and five round the bottom
    const R = .21, H = .24, e = H * (1 - Math.cos(Math.PI / 5)) / (1 + Math.cos(Math.PI / 5)), T = new V3(0, H, 0), B = new V3(0, -H, 0);
    const A = k => new V3(Math.cos(k * Math.PI * 2 / 5) * R, e, Math.sin(k * Math.PI * 2 / 5) * R), Bk = k => new V3(Math.cos((k + .5) * Math.PI * 2 / 5) * R, -e, Math.sin((k + .5) * Math.PI * 2 / 5) * R);
    const kites = []; for (let k = 0; k < 5; k++) { kites.push([T, A(k), Bk(k), A(k + 1)]); kites.push([B, Bk(k), A(k + 1), Bk(k + 1)]); }
    const pos = [], uv = [], geo = new THREE.BufferGeometry(), faces = [], nums = [1, 2, 7, 4, 3, 10, 9, 6, 5, 8];
    kites.forEach(([P, X, Q, Y], i) => {
      const n = new V3().subVectors(X, P).cross(new V3().subVectors(Q, P)), c = P.clone().add(X).add(Q).add(Y); if (n.dot(c) < 0) [X, Y] = [Y, X]; // wind each face anticlockwise seen from outside
      const N = new V3().subVectors(X, P).cross(new V3().subVectors(Q, P)).normalize();
      [[P, [.5, .98]], [X, [.148, .203]], [Q, [.5, .02]], [P, [.5, .98]], [Q, [.5, .02]], [Y, [.852, .203]]].forEach(([v, t]) => { pos.push(v.x, v.y, v.z); uv.push(t[0], t[1]); });
      geo.addGroup(i * 6, 6, i); faces.push({ v: nums[i], n: N, d: N.dot(P) });
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    kit = { geo, mats: faces.map(f => dieMat(faceTex(style, 'kite', [f.v]), sname)), faces, rest: faces[0].d };
  } else if (sides === 8) {
    const r = .27, tris = [], faces = [];
    for (let i = 0; i < 8; i++) {
      const sx = i & 1 ? -1 : 1, sy = i & 2 ? -1 : 1, sz = i & 4 ? -1 : 1;
      tris.push(orient(new V3(sx * r, 0, 0), new V3(0, sy * r, 0), new V3(0, 0, sz * r)));
      faces.push({ v: i + 1, n: new V3(sx, sy, sz).normalize() });
    }
    kit = { geo: triGeo(tris), mats: faces.map(f => dieMat(faceTex(style, 'tri', [f.v]), sname)), faces, rest: r / Math.sqrt(3) };
  } else {
    const a = .3, s = a / Math.sqrt(3), V = [new V3(1, 1, 1), new V3(1, -1, -1), new V3(-1, 1, -1), new V3(-1, -1, 1)].map(v => v.multiplyScalar(s));
    const tris = [], mats = [];
    for (let k2 = 0; k2 < 4; k2++) {
      const others = [0, 1, 2, 3].filter(i => i !== k2);
      const t = orient(V[others[0]], V[others[1]], V[others[2]]);
      tris.push(t); mats.push(dieMat(faceTex(style, 'tri4', t.map(p => V.indexOf(p) + 1)), sname));
    }
    kit = { geo: triGeo(tris), mats, faces: V.map((v, i) => ({ v: i + 1, n: v.clone().normalize() })), rest: a / 3 };
  }
  return diceCache[k] = kit;
}
const liveDice = [];
const camToward = () => new V3(Math.sin(camAz), 0, Math.cos(camAz));
const camRight = () => new V3(Math.cos(camAz), 0, -Math.sin(camAz));
const DS = 2.1;
function critFx(m, to, sides) { // the die flares gold, the camera jolts, the screen flashes
  m.material = dieKit(sides, 'crit').mats; m.add(glowSprite(0xffb020, .9));
  tween(260, k => m.scale.setScalar(DS * (1 + .35 * Math.sin(Math.PI * k))), ease.out);
  burst(to.clone().setY(to.y + .15), [0xffd25a, 0xfff0b0, 0xff8a20], 30, 2.4, .2, .7, { up: .4, grav: 2 });
  shake(.32); hitstop(90); kick = Math.max(kick, .05); const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
// Dice only land on clear ground: away from minis, scenery and each other.
function diceSpots(n, focus, taken = []) {
  const blockers = [];
  liveUnits().forEach(u => { if (u.deployed) blockers.push([u.root.position.x, u.root.position.z, sz(u) > 1 ? 1.4 : .76]); });
  [...Object.keys(G.B.obst), ...ICE.keys()].forEach(k => { const { c, r } = GC.parseKey(k), q = cellPos(c, r); blockers.push([q.x, q.z, .74]); });
  liveDice.forEach(d => { if (d.userData.to) blockers.push([d.userData.to.x, d.userData.to.z, .82]); });
  taken.forEach(t => blockers.push([t.x, t.z, .82]));
  const cands = [];
  const bx = (COLS - 1) / 2 + .4, bz = (ROWS - 1) / 2 + .4;
  for (let x = Math.max(-bx, focus.x - 3); x <= Math.min(bx, focus.x + 3) + .01; x += .2) for (let z = Math.max(-bz, focus.z - 3); z <= Math.min(bz, focus.z + 3) + .01; z += .2) cands.push([x, z]);
  const out = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (let relax = 1; relax > .3 && !best; relax -= .12) {
      let bs = 1e9;
      for (const [x, z] of cands) {
        let ok = true;
        for (const b of blockers) { const dx = x - b[0], dz = z - b[1], rr = b[2] * relax; if (dx * dx + dz * dz < rr * rr) { ok = false; break; } }
        if (!ok) continue;
        const sc = Math.hypot(x - focus.x, z - focus.z);
        if (sc < bs) { bs = sc; best = [x, z]; }
      }
    }
    if (!best) best = [focus.x, focus.z];
    const v = new V3(best[0], floorY(best[0], best[1]), best[1]); out.push(v); blockers.push([v.x, v.z, .82]);
  }
  return out;
}
// value: the face it must land on (the rules have already thrown it)
function throwDie(sides, sname, land, out, quiet, value) {
  const dur = sname === 'gob' || sname === 'king' ? 440 : 540;
  const kit = dieKit(sides, sname);
  const m = new THREE.Mesh(kit.geo, kit.mats); m.castShadow = true; m.scale.setScalar(DS); scene.add(m); liveDice.push(m);
  const v = value || 1 + Math.floor(Math.random() * sides);
  const face = kit.faces.find(f => f.v === v);
  const finalQ = new THREE.Quaternion().setFromUnitVectors(face.n, UP).premultiply(new THREE.Quaternion().setFromAxisAngle(UP, rand(0, Math.PI * 2)));
  const to = land.clone(); to.y = land.y + kit.rest * DS;
  m.userData.to = to;
  const from = to.clone().addScaledVector(camToward(), 2.4).addScaledVector(camRight(), rand(-.6, .6)); from.y = to.y + 2.7; // they fly in from the side
  const dir = new V3(to.x - from.x, 0, to.z - from.z).normalize();
  const axis = new V3().crossVectors(UP, dir).add(new V3(rand(-.25, .25), rand(-.25, .25), rand(-.25, .25))).normalize();
  const wob = new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
  const total = Math.PI * 2 * rand(2, 2.8), impacts = [.3, .55, .73, .86, .94], hts = [.5, .22, .08, .025];
  let lastPhase = -1; const q = new THREE.Quaternion(), qw = new THREE.Quaternion();
  m.position.copy(from);
  return tween(dur, t => {
    const p = ease.out(Math.min(1, t * 1.05));
    m.position.x = from.x + (to.x - from.x) * p; m.position.z = from.z + (to.z - from.z) * p;
    let ph = impacts.findIndex(x => t < x); if (ph < 0) ph = impacts.length;
    if (ph === 0) { const s = t / impacts[0]; m.position.y = to.y + (from.y - to.y) * (1 - s * s); }
    else if (ph < impacts.length) { const a = impacts[ph - 1], b = impacts[ph], s = (t - a) / (b - a); m.position.y = to.y + hts[ph - 1] * 4 * s * (1 - s); }
    else m.position.y = to.y;
    if (ph !== lastPhase && ph > 0 && ph <= impacts.length) sfx('clack', Math.max(.15, 1 - ph * .22));
    lastPhase = ph;
    const remain = total * Math.pow(1 - t, 2.3);
    q.setFromAxisAngle(axis, -remain); qw.setFromAxisAngle(wob, .6 * Math.pow(1 - t, 3) * Math.sin(t * 30));
    m.quaternion.copy(q).multiply(qw).multiply(finalQ);
  }, ease.lin).then(() => {
    m.quaternion.copy(finalQ); m.position.copy(to);
    if (out) { out.mesh = m; out.to = to; }
    if (v === sides && !quiet) critFx(m, to, sides);
    return v;
  });
}
function clearDice() {
  const ds = liveDice.splice(0);
  ds.forEach(d => { const s0 = d.scale.x; tween(150, t => d.scale.setScalar(s0 * (1 - t))).then(() => scene.remove(d)); });
}
// The readout: one spot, just under the dice (or the acting piece), for everything an action does.
let rollAt = null, roLive = false, roTimer = 0;
// the readout is the dialogue box: it covers the box above the hotbar exactly, and grows upward if a roll needs more room
function placeRoll() {
  const r = $('#roll'), b = $('#hbInfo').getBoundingClientRect();
  r.style.width = b.width + 'px'; r.style.minHeight = b.height + 'px';
  r.style.transform = `translate(${b.left}px,${b.bottom - r.offsetHeight}px)`;
}
function roOpen(at, title) {
  clearTimeout(roTimer); rollAt = at.clone(); roLive = true;
  const r = $('#roll'); r.hidden = false; r.classList.remove('out'); $('#dock').classList.add('rolling');
  $('#rollLbl').textContent = title || ''; ['#rollNotes', '#rollChips', '#rollRes'].forEach(q => $(q).innerHTML = '');
  placeRoll();
}
function roHold(ms) { // fade the readout once nothing new has been added for a while
  clearTimeout(roTimer);
  roTimer = setTimeout(() => { $('#roll').classList.add('out'); $('#dock').classList.remove('rolling'); roTimer = setTimeout(() => { $('#roll').hidden = true; roLive = false; }, 260); }, ms);
}
function roAnchor(u) { if (!roLive) { const a = u || UI.active || UI.sel; roOpen(a ? a.root.position : new V3(), ''); } }
function roNote(text, cls = '') { roAnchor(); const e = document.createElement('span'); e.className = cls; e.textContent = text; $('#rollNotes').appendChild(e); roHold(2200); placeRoll(); }
function roResult(u, html, cls = '') { roAnchor(u); const e = document.createElement('span'); e.className = cls; e.innerHTML = html; $('#rollRes').appendChild(e); roHold(2200); placeRoll(); return e; }
function showRoll(label, sides, at) { roOpen(at, `${label} · d${sides}`); }
function addChip(v, cls) { const s = document.createElement('span'); s.className = 'chip ' + cls; s.textContent = v; $('#rollChips').appendChild(s); clearTimeout(roTimer); placeRoll(); return s; }
function showTotal(t, suffix = '') { addChip('= ' + t + suffix, 'tot'); }
function hideRoll() { if (roLive) roHold(1100); }

