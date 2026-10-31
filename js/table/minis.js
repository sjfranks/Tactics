'use strict';
// GOBLIN CRYPT · THE TABLE · the miniatures: sculpts, rigs, animation clips, standing on slopes, portraits
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- miniatures ----------------
// Painted-miniature surfaces: one grayscale detail texture per surface type, tinted by each material's colour.
function detailTex(kind) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
    const blot = (n, a, rmax) => { for (let i = 0; i < n; i++) { const v = Math.random() > .5 ? 255 : 110; g.fillStyle = `rgba(${v},${v},${v},${rand(.03, a)})`; g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(4, rmax), rand(4, rmax), rand(0, 3), 0, 7); g.fill(); } };
    if (kind === 'cloth') {
      blot(140, .14, 30); g.globalAlpha = .2;
      for (let y = 0; y < h; y += 3) { g.fillStyle = y % 6 ? '#fff' : '#7a7a7a'; g.fillRect(0, y, w, 1); }
      for (let x = 0; x < w; x += 3) { g.fillStyle = x % 6 ? '#fff' : '#8a8a8a'; g.fillRect(x, 0, 1, h); }
      g.globalAlpha = 1;
    } else if (kind === 'leather') {
      blot(170, .22, 26);
      g.strokeStyle = 'rgba(50,35,25,.35)'; for (let i = 0; i < 40; i++) { g.lineWidth = rand(.5, 1.6); const x = rand(0, w), y = rand(0, h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-20, 20), y + rand(-6, 6)); g.stroke(); }
      g.setLineDash([5, 4]); g.strokeStyle = 'rgba(255,240,220,.5)'; g.lineWidth = 1.6; [14, 128, h - 14].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }); g.setLineDash([]);
    } else if (kind === 'metal') {
      for (let i = 0; i < 600; i++) { const v = 150 + Math.random() * 105 | 0; g.fillStyle = `rgba(${v},${v},${v},.35)`; g.fillRect(rand(0, w), rand(0, h), rand(10, 70), 1); }
      blot(50, .16, 18); for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(rand(0, w), rand(0, h), 2, 1); }
    } else if (kind === 'skin') blot(70, .07, 40);
    else if (kind === 'hair') {
      for (let i = 0; i < 1000; i++) { const v = Math.random() > .5 ? 255 : 80; g.strokeStyle = `rgba(${v},${v},${v},${rand(.1, .4)})`; g.lineWidth = rand(.6, 1.8); const x = rand(0, w); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rand(-8, 8), h * .3, x + rand(-8, 8), h * .6, x + rand(-10, 10), h); g.stroke(); }
    } else if (kind === 'fur') {
      for (let i = 0; i < 2800; i++) { const v = Math.random() > .5 ? 255 : 70; g.strokeStyle = `rgba(${v},${v},${v},${rand(.1, .45)})`; g.lineWidth = 1; const x = rand(0, w), y = rand(0, h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-2, 2), y + rand(4, 10)); g.stroke(); }
    } else if (kind === 'wood') {
      for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${Math.random() > .5 ? '70,50,35' : '255,240,220'},.3)`; g.lineWidth = rand(1, 3); const x = rand(0, w); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rand(-6, 6), h * .3, x + rand(-6, 6), h * .7, x + rand(-6, 6), h); g.stroke(); }
    } else blot(50, .08, 30);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const DETAIL = {}; ['cloth', 'leather', 'metal', 'skin', 'hair', 'fur', 'wood', 'plain'].forEach(k => DETAIL[k] = detailTex(k));
const SURF = { cloth: [.86, 0, .006], leather: [.52, 0, .006], metal: [.26, .9, .004], skin: [.5, 0, .002], hair: [.42, 0, .008], fur: [.9, 0, .012], wood: [.7, 0, .006], plain: [.55, 0, .003] };
let PMC = null; // per-figure paint pot, set while a miniature is being built
function PM(color, kind = 'plain', emi = 0, ei = 1, double = false, fresh = false) {
  const pk = PMC && !fresh ? [new THREE.Color(color).getHex(), kind, emi && new THREE.Color(emi).getHex(), ei, double].join() : null;
  if (pk && PMC.has(pk)) return PMC.get(pk);
  const [r, m, b] = SURF[kind];
  const mat = LP ? new THREE.MeshStandardMaterial({ color, roughness: kind === 'metal' ? .42 : .82, metalness: kind === 'metal' ? .45 : 0, flatShading: true, side: double ? THREE.DoubleSide : THREE.FrontSide })
    : new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, map: DETAIL[kind], bumpMap: DETAIL[kind], bumpScale: b, side: double ? THREE.DoubleSide : THREE.FrontSide });
  { const hsl = {}; mat.color.getHSL(hsl); mat.color.setHSL(hsl.h, hsl.s * .68, hsl.l * .86 + .02); } // grimdark grade: worn dyes, dull metal
  mat.userData.hex = mat.color.getHex(); mat.color.convertSRGBToLinear(); // author in sRGB like a paint swatch
  if (emi) { mat.emissive.set(emi).convertSRGBToLinear(); mat.emissiveIntensity = ei; }
  mat.userData.e0 = mat.emissive.clone(); mat.userData.ei0 = mat.emissiveIntensity;
  if (pk) PMC.set(pk, mat); return mat;
}
const M = (color, rough = .58, metal = 0, emi = 0, ei = 1) => { const m = PM(color, metal > .5 ? 'metal' : 'plain', emi, ei, false, true); m.roughness = rough; m.metalness = metal; m.map = null; m.bumpMap = null; return m; };
function glowSprite(color, size) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(size); return s; }
const torG = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 8, 28, arc);
function add(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}

// --- sculpting helpers (figures face +z; the figure's right hand is -x) ---
const V = (x, y, z) => new V3(x, y, z);
function mk(g, geo, mat, p) { const m = new THREE.Mesh(geo, mat); if (p) m.position.copy(p); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
function seg(g, a, b, r1, r2, mat, s = 12) { // tapered cylinder from a (radius r1) to b (radius r2)
  if (LP) s = Math.min(s, 6);
  const d = new V3().subVectors(b, a), len = d.length();
  const m = mk(g, new THREE.CylinderGeometry(r2, r1, len, s), mat, a.clone().addScaledVector(d, .5));
  m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
}
function ball(g, p, r, mat, sx = 1, sy = 1, sz = 1, ws = 16) { const m = mk(g, LP ? new THREE.IcosahedronGeometry(r, r > .03 ? 1 : 0) : new THREE.SphereGeometry(r, ws, Math.max(8, ws * .75 | 0)), mat, p); m.scale.set(sx, sy, sz); return m; }
function limb(g, pts, rad, mat) { for (let i = 0; i < pts.length - 1; i++) seg(g, pts[i], pts[i + 1], rad[i], rad[i + 1], mat); for (let i = 1; i < pts.length - 1; i++) ball(g, pts[i], rad[i] * 1.03, mat, 1, 1, 1, 12); }
function lathe(g, prof, mat, y = 0, sx = 1, sz = 1, segs = 28) { if (LP) segs = 8; const m = mk(g, new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r, yy)), segs), mat, V(0, y, 0)); m.scale.set(sx, 1, sz); return m; }
function ring(g, r, t, mat, y, sx = 1, sz = 1, z = 0) { const m = mk(g, torG(r, t), mat, V(0, y, z)); m.rotation.x = Math.PI / 2; m.scale.set(sx, sz, 1); return m; }
function drape(g, o) { // folded cloth: a sheet wrapped around the body between angles a0..a1 (0 = front), folds ripple toward the hem
  const nu = LP ? Math.min(o.nu || 24, 12) : o.nu || 24, nv = LP ? 3 : o.nv || 8, pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, r = o.r1 + (o.r0 - o.r1) * v, sw = Math.pow(1 - v, 2);
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, a = o.a0 + (o.a1 - o.a0) * u, rr = r + (o.depth || .018) * Math.sin(u * (o.folds || 6) * Math.PI * 2) * (1 - .7 * v);
      pos.push(Math.sin(a) * rr * (o.sx || 1) + (o.sway ? o.sway[0] * sw : 0), o.y + v * o.h + (o.lift ? o.lift * sw * Math.sin(u * Math.PI) : 0), Math.cos(a) * rr * (o.sz || 1) + (o.sway ? o.sway[1] * sw : 0));
      uv.push(u * (o.ur || 2), v);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  return mk(g, geo, o.mat);
}
function bladeGeo(len, w, curve = 0) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0);
  s.quadraticCurveTo(w / 2 + curve, len * .6, curve * 1.5, len); s.quadraticCurveTo(-w / 2 + curve * .7, len * .55, -w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .004, bevelEnabled: true, bevelThickness: .003, bevelSize: .004, bevelSegments: 1, curveSegments: 8 }); g.translate(0, 0, -.002); return g;
}
let lastHead = null;
// Sculpted head: one sphere pushed and pulled into a brow ridge, eye sockets, cheekbones, nose, lips and chin,
// then painted with vertex colour (shaded sockets, warm cheeks and nose, darker lips, painted brows).
function g3(n, cx, cy, cz, sx, sy, sz = sx) { const dx = (n.x - cx) / sx, dy = (n.y - cy) / sy, dz = (n.z - cz) / sz; return Math.exp(-.5 * (dx * dx + dy * dy + dz * dz)); }
const HR = .068;
function headGeo(o) {
  const cu = o.cute ? 1 : 0;
  const geo = LP ? new THREE.SphereGeometry(HR, 22, 15) : new THREE.SphereGeometry(HR, 48, 36), p = geo.attributes.position, n = new V3(), a = { x: 0, y: 0, z: 0 }, col = [];
  const gob = o.gob ? 1 : 0;
  const skin = new THREE.Color(o.skinCol), shade = skin.clone().multiplyScalar(.58), lip = skin.clone().lerp(new THREE.Color(gob ? 0x2a2014 : 0x9a3434), .45),
    blush = skin.clone().lerp(new THREE.Color(0xe0606a), gob ? .08 : o.cute ? .4 : .22), hi = skin.clone().lerp(new THREE.Color(0xffffff), .15), brow = new THREE.Color(o.browCol ?? 0x2a1a10), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize(); a.x = Math.abs(n.x); a.y = n.y; a.z = n.z;
    const sock = g3(a, .33, .12, .93, .12, .1, .14);
    const browR = g3(a, .3, .33, .9, .17, .07, .16) + .6 * g3(n, 0, .3, .95, .1, .06);
    const nose = gob ? 0 : g3(n, 0, -.02, 1, .065, .2, .2) * .9 + g3(n, 0, -.15, .99, .08, .07, .2);
    const nostril = gob ? 0 : g3(a, .1, -.19, .97, .045, .04, .1);
    const cheek = g3(a, .55, -.05, .82, .16, .13, .2);
    const ulip = g3(n, 0, -.33, .95, .14 + gob * .1, .04, .2), llip = g3(n, 0, -.43, .92, .11 + gob * .1, .045, .2), mline = g3(n, 0, -.38, .93, .14 + gob * .12, .014, .2);
    const chin = g3(n, 0, -.66, .76, .13 + gob * .08, .1, .2), temple = g3(a, .82, .22, .5, .14, .14, .2);
    let d = (.075 + gob * .09) * browR * (1 - .6 * cu) - (.1 + gob * .03) * sock * (1 - .75 * cu) + .12 * nose * (1 - .6 * cu) + .04 * nostril * (1 - cu) + (.05 + gob * .03 + cu * .03) * cheek + .03 * ulip * (1 - .6 * cu) + (.035 + gob * .03) * llip * (1 - .6 * cu) - .03 * mline * (1 + gob) + (.06 + gob * .05) * chin * (1 - .5 * cu) - .025 * temple;
    if (n.y > .1 && n.z < 0) d += .05 * n.y * -n.z;
    let sx = .86 + gob * .14, sy = 1.08 - gob * .12, sz = .97;
    if (n.y < -.1) sx *= 1 - (.24 - gob * .2) * Math.min(1, (-n.y - .1) / .8);
    p.setXYZ(i, n.x * HR * sx * (1 + d), n.y * HR * sy * (1 + d), n.z * HR * sz * (1 + d));
    c.copy(skin).lerp(hi, Math.min(1, browR * .5 + nose * .4) * .7).lerp(blush, Math.min(1, cheek * .7 + nose * .3)).lerp(shade, Math.min(1, sock * .55 + mline * .8 + temple * .25)).lerp(lip, Math.min(1, ulip + llip) * .6);
    if (o.paintBrows) c.lerp(brow, Math.min(1, g3(a, .3, .37, .9, .14, .03, .2) * 1.7));
    if (o.grey) { const v = 1 - Math.min(.35, sock * .18 + mline * .1 + temple * .15) + Math.min(.08, browR * .05 + nose * .05); c.setRGB(v, v, v); }
    c.convertSRGBToLinear(); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo;
}
// painted face for the heroic style: drawn on the head's own UVs (u = .25 faces forward; canvas y follows latitude)
function faceTexture(o) {
  return canvasTex(512, 256, (g, W, H) => {
    const sk = new THREE.Color(o.skinCol);
    g.fillStyle = '#' + sk.getHexString(); g.fillRect(0, 0, W, H);
    const cx = W * .25, Y = th => th / Math.PI * H, dx = W * .054, gob = o.gob;
    g.fillStyle = 'rgba(200,70,60,.16)'; [-1, 1].forEach(sd => { g.beginPath(); g.ellipse(cx + sd * dx * 1.35, Y(1.62), 16, 10, 0, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(cx - 5, Y(1.6)); g.lineTo(cx + 5, Y(1.6)); g.lineTo(cx, Y(1.45)); g.fill();
    [-1, 1].forEach(sd => {
      const ex = cx + sd * dx, ey = Y(1.45), ew = gob ? 15 : 13, eh = gob ? 9 : 6.5;
      g.fillStyle = gob ? '#ffd23a' : '#f4f0e6'; g.beginPath(); g.ellipse(ex, ey, ew, eh, sd * (o.angry ? -.12 : .05), 0, 7); g.fill();
      if (gob) { g.fillStyle = '#2a0800'; g.fillRect(ex - 1.6, ey - eh + 1, 3.2, eh * 2 - 2); }
      else { g.fillStyle = '#' + new THREE.Color(o.eyeCol || 0x4a3020).getHexString(); g.beginPath(); g.arc(ex - sd * 1.5, ey + .5, 5.5, 0, 7); g.fill(); g.fillStyle = '#100a08'; g.beginPath(); g.arc(ex - sd * 1.5, ey + .5, 2.6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(ex - sd * 1.5 + 1, ey - 2.5, 2, 2); }
      g.strokeStyle = '#1a0e0a'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(ex, ey, ew, eh, sd * (o.angry ? -.12 : .05), Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      if (!gob) { // heavy angled brows
        g.fillStyle = '#' + new THREE.Color(o.browCol).getHexString();
        const by = Y(1.25), tilt = o.angry ? 7 : -2;
        g.beginPath(); g.moveTo(cx + sd * 4, by + tilt); g.lineTo(cx + sd * (dx + 17), by - 3); g.lineTo(cx + sd * (dx + 16), by + 3); g.lineTo(cx + sd * 5, by + tilt + 6); g.fill();
      } else { g.fillStyle = 'rgba(30,40,10,.6)'; g.fillRect(cx + sd * (dx - 14) - (sd < 0 ? 28 : 0), Y(1.3), 28, 5); }
    });
    g.strokeStyle = gob ? '#1a0a04' : '#5a2420'; g.lineWidth = gob ? 3.5 : 2.4; g.lineCap = 'round';
    g.beginPath(); const my = Y(1.97), mw = gob ? 24 : 11; g.moveTo(cx - mw, my + (o.angry ? 2 : -1)); g.quadraticCurveTo(cx, my - (o.angry ? 2 : -3), cx + mw, my + (o.angry ? 2 : -1)); g.stroke();
  });
}
function lock(g, pts, r, mat) { const k = pts.length - 1; limb(g, pts, pts.map((_, i) => r * (1 - .82 * i / k)), mat); }
// --- heroic heads: a tall, angular head shaped from planes rather than a ball ---
// flat face plane, boxy skull, brow ridge, cheekbones, a squared jaw tapering to a strong chin
function heroShape(n, gob) {
  const y = n.y, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = Math.atan2(n.x, n.z), c = Math.cos(phi), s = Math.sin(phi);
  const boxy = 1 / Math.pow(Math.pow(Math.abs(c), 3) + Math.pow(Math.abs(s), 3), 1 / 3);
  const sq = 1 + (boxy - 1) * (y > .45 ? Math.max(0, 1 - (y - .45) / .4) : 1);
  let W = .8 + gob * .2, D = c > 0 ? .9 : 1.05;
  if (y < -.28) { const t = Math.min(1, (-y - .28) / .72); W *= 1 - (gob ? .22 : .44) * t; D *= c > 0 ? 1 - .1 * t : 1 - .38 * t; }
  if (c < 0 && y < -.1) D *= .86;
  let x = s * r * sq * W, z = c * r * sq * D;
  const hy = 1.2 - gob * .2; let Y = y * hy; if (y > .7) Y = .7 * hy + (y - .7) * .5;
  if (c > 0 && y > -.38 && y < .6) z = Math.min(z, .84 + gob * .06);
  const front = Math.max(0, c);
  z += (.08 + gob * .07) * Math.exp(-Math.pow((y - .3) / .08, 2)) * Math.pow(front, 3);
  x *= 1 + .08 * Math.exp(-Math.pow((y + .02) / .13, 2)) * Math.abs(s) * front;
  z += (.07 + gob * .04) * Math.exp(-Math.pow((y + .82) / .13, 2)) * Math.pow(front, 4);
  return new V3(x * HR, Y * HR, z * HR);
}
function heroHeadGeo(o, scale = 1, mask = null, segW = 16, segH = 13) {
  const src = new THREE.SphereGeometry(1, segW, segH).toNonIndexed(), p = src.attributes.position, uv = src.attributes.uv, P = [], U = [], C = [], n = new V3(), gob = o.gob ? 1 : 0;
  for (let f = 0; f < p.count; f += 3) {
    const dirs = [0, 1, 2].map(k => new V3().fromBufferAttribute(p, f + k).normalize());
    if (mask && !mask(dirs[0].clone().add(dirs[1]).add(dirs[2]).normalize())) continue;
    dirs.forEach((d, k) => {
      const q = heroShape(d, gob).multiplyScalar(scale); P.push(q.x, q.y, q.z); U.push(uv.getX(f + k), uv.getY(f + k));
      const fr = Math.max(0, d.z / Math.sqrt(d.x * d.x + d.z * d.z || 1));
      const v = Math.max(.5, .76 + .24 * fr - (d.y < -.55 ? .1 : 0) - .14 * Math.exp(-Math.pow((d.y - .17) / .06, 2)) * fr);
      n.set(v, v, v); C.push(n.x, n.y, n.z);
    });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); return g;
}
function noseGeo() { // a wedge nose: bridge, tip, wings and underside
  const k = HR, P = { top: [0, .27, .86], tip: [0, -.13, 1.07], L: [-.14, -.2, .86], R: [.14, -.2, .86], U: [0, -.23, .95] };
  const tris = [['top', 'tip', 'R'], ['top', 'L', 'tip'], ['L', 'U', 'tip'], ['tip', 'U', 'R']], pos = [];
  tris.forEach(t => t.forEach(q => pos.push(P[q][0] * k, P[q][1] * k, P[q][2] * k)));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(.5), 2)); g.computeVertexNormals(); return g;
}
function heroHair(h, H, st) { // a solid angular hair shell swept back, with chunky planar locks
  const hairline = d => { const c = d.z / Math.sqrt(d.x * d.x + d.z * d.z || 1); return d.y > .44 + .12 * Math.max(0, c) || (c < .1 && d.y > .12) || (c < -.3 && d.y > -.45); };
  const shell = mk(h, heroHeadGeo({}, 1.1, hairline, 14, 11), H); shell.position.set(0, .004, -.003); shell.scale.y = 1.06;
  const n = st === 'messy' ? 11 : 7;
  for (let i = 0; i < n; i++) {
    const az = st === 'messy' ? i / n * Math.PI * 2 : (i / (n - 1) - .5) * 1.8, base = heroShape(V(Math.sin(az) * .55, .82, Math.cos(az) * .55).normalize(), 0).multiplyScalar(1.1);
    const l = mk(h, new THREE.ConeGeometry(st === 'messy' ? .026 : .034, st === 'messy' ? .085 : .13, 4), H, base);
    if (st === 'messy') l.rotation.set(Math.cos(az) * 1.3 + .4, 0, -Math.sin(az) * 1.3); else l.rotation.set(-1.25 - Math.abs(az) * .2, 0, -Math.sin(az) * .5);
    l.scale.set(1.5, 1, .55);
  }
  if (st === 'messy') for (let i = 0; i < 4; i++) { const l = mk(h, new THREE.ConeGeometry(.018, .06, 4), H, V((i - 1.5) * .02, .05, .066)); l.rotation.set(2.6, 0, (i - 1.5) * .3); l.scale.set(1.4, 1, .5); }
}
function scalp(h, mat) { const m = mk(h, new THREE.SphereGeometry(.0745, 32, 18, 0, Math.PI * 2, 0, Math.PI * .5), mat, V(0, .006, -.008)); m.rotation.x = -.6; m.scale.set(.93, 1.05, 1); return m; }
const onScalp = (az, pol, r = .072) => V(Math.sin(az) * Math.sin(pol) * r * .93, Math.cos(pol) * r * 1.05 + .006, Math.cos(az) * Math.sin(pol) * r - .008);
function head(g, o) {
  if (ST && o.ears !== 'gob') { o.s = (o.s || 1) * 1.6; o.p = o.p.clone().add(V(0, .05, 0)); }
  const h = new THREE.Group(); h.position.copy(o.p); h.rotation.set(o.tilt || 0, o.turn || 0, 0); h.scale.setScalar(o.s || 1); if (ST) h.scale.y /= .9; g.add(h); lastHead = h; h.userData.bone = 'head'; h.userData.s = o.s || 1; h.userData.turn = o.turn || 0;
  const skinCol = o.skin.userData.hex, gob = o.ears === 'gob';
  const hm = PM(0xffffff, 'skin', 0, 1, false, true); hm.vertexColors = true;
  const browCol = (o.brow || o.hairMat || o.skin).userData.hex;
  if (LP) {
    hm.map = faceTexture({ skinCol, gob, angry: o.angry, eyeCol: o.eye, browCol }); hm.color.setHex(0xffffff);
    mk(h, heroHeadGeo({ gob }), hm);
    if (!gob) mk(h, noseGeo(), o.skin);
  } else mk(h, headGeo({ skinCol, gob, cute: ST, grey: LP, paintBrows: !gob && !ST, browCol }), hm);
  seg(h, V(0, -.04, -.012), V(0, -.11, -.02), .034, .04, o.skin, 14);
  if (o.nose === 'gob') { const nz = mk(h, new THREE.ConeGeometry(.02, .085, 12), o.skin, V(0, -.012, .092)); nz.rotation.x = Math.PI / 2 + .3; ball(h, V(0, -.03, .125), .012, o.skin, 1, 1, 1, 10); }
  // eyes: whites, iris, pupil and an upper lid that sets the expression
  const eR = gob ? .015 : .0118, white = PM(gob ? 0xfff0a0 : 0xf6f2ea, 'plain', o.eyeGlow ? 0xffb020 : 0, .7), iris = PM(o.eye || 0x4a3020, 'plain', o.eyeGlow || 0, o.eyeGlow ? 1.6 : 1), pup = PM(0x0a0806), lid = PM(skinCol, 'skin');
  [-1, 1].forEach(sd => {
    const ec = V(sd * .0178, .0082, .048 - gob * .002);
    if (ST) { // stylized faces: big glossy dark eyes with a glint, slim brows
      const em = o.eyeGlow ? iris : PM(new THREE.Color(o.eye || 0x3a2a1a).multiplyScalar(.45).getHex(), 'plain', 0, 1, false, true); em.roughness = .15;
      ball(h, ec.clone().add(V(0, -.002, .009)), eR * (gob ? 1.05 : 1.2), em, .82, 1.18, .42, 14);
      ball(h, ec.clone().add(V(.003, .006, .0135)), eR * .34, PM(0xffffff, 'plain', 0xffffff, .4), 1, 1, .5, 8);
      if (!gob) mk(h, new THREE.BoxGeometry(.022, .0055, .008), o.brow || o.hairMat, V(sd * .019, .032, .062)).rotation.z = sd * (o.angry ? .32 : -.14);
    } else if (LP) { // heroic: eyes and brows are painted into the face texture
    } else {
    ball(h, ec, eR, white, 1, 1, 1, 14);
    ball(h, ec.clone().add(V(0, 0, eR * .92)), eR * .58, iris, 1, 1, .35, 12);
    ball(h, ec.clone().add(V(0, 0, eR * 1.02)), eR * .28, pup, 1, 1, .3, 8);
    const l = mk(h, new THREE.SphereGeometry(eR * 1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5), lid, ec);
    l.rotation.set(.35 + (o.angry ? .18 : 0), 0, o.angry ? sd * .3 : sd * -.1);
    const ll = mk(h, new THREE.SphereGeometry(eR * 1.08, 14, 6, 0, Math.PI * 2, Math.PI * .72, Math.PI * .28), lid, ec); ll.rotation.x = -.2;
    }
    if (o.ears === 'elf') { const e = mk(h, new THREE.ConeGeometry(.016, .075, 10), o.skin, V(sd * .066, .012, -.01)); e.rotation.set(-.35, 0, -sd * 1.15); e.scale.z = .45; }
    else if (gob) {
      const e = mk(h, new THREE.ConeGeometry(.036, .19, 12), o.skin, V(sd * .11, .03, -.012)); e.rotation.set(-.12, 0, -sd * 1.28); e.scale.z = .42;
      const ie = mk(h, new THREE.ConeGeometry(.024, .13, 10), PM(0xb86a5a, 'skin'), V(sd * .108, .032, -.004)); ie.rotation.set(-.12, 0, -sd * 1.28); ie.scale.z = .3;
      for (let k = 0; k < 2; k++) ball(h, V(sd * rand(.03, .05), rand(-.03, .05), .055), .006, o.skin, 1, 1, 1, 6);
    } else if (LP) { const e = mk(h, new THREE.ConeGeometry(.02, .045, 4), o.skin, V(sd * .058, -.004, -.008)); e.rotation.set(0, sd * .3, 0); e.scale.set(.45, 1, 1.1); }
    else { ball(h, V(sd * .061, -.003, -.006), .018, o.skin, .38, 1, .72, 12); ball(h, V(sd * .065, -.003, -.004), .009, PM(new THREE.Color(skinCol).multiplyScalar(.55).getHex(), 'skin'), .3, .8, .6, 8); }
  });
  if (gob) {
    [-1, 1].forEach(sd => { const t = mk(h, new THREE.ConeGeometry(.0075, .026, 6), PM(0xf2ead0), V(sd * .02, -.022, .066)); t.rotation.z = sd * .15; });
    ball(h, V(0, -.032, .062), .02, PM(0x2a1410), 1.8, .35, .4, 10);
  }
  // hair: a scalp shell plus clay-like tapered locks
  const H = o.hairMat, st = o.hair;
  if (LP && (st === 'short' || st === 'messy')) heroHair(h, H, st);
  else if (st === 'short') {
    scalp(h, H);
    for (let i = 0; i < 14; i++) {
      const az = (i / 14 - .5) * 3.6, pol = .35 + Math.abs(az) * .12, s = onScalp(az, pol);
      const out = V(Math.sin(az), .3, Math.cos(az) * .5 - .5).normalize();
      lock(h, [s, s.clone().addScaledVector(out, .02).add(V(0, .012, -.012)), s.clone().addScaledVector(out, .035).add(V(0, .004, -.034))], .02, H);
    }
  } else if (st === 'messy') {
    scalp(h, H);
    for (let i = 0; i < 24; i++) {
      const az = i / 24 * Math.PI * 2 + rand(-.12, .12), front = Math.cos(az) > .45, pol = front ? .5 : rand(.25, .7), s = onScalp(az, pol);
      const out = V(Math.sin(az), 0, Math.cos(az));
      const len = front ? .045 : rand(.06, .09), drop = front ? .03 : rand(.05, .1);
      lock(h, [s, s.clone().addScaledVector(out, .025).add(V(0, .008, 0)), s.clone().addScaledVector(out, len * .8).add(V(rand(-.01, .01), -drop * .5, 0)), s.clone().addScaledVector(out, len).add(V(rand(-.015, .015), -drop, rand(-.01, .01)))], .019, H);
    }
  } else if (st === 'curly') {
    if (LP) mk(h, heroHeadGeo({}, 1.08, d => d.y > .35 || (d.z < .2 && d.y > -.1), 14, 11), H); else scalp(h, H);
    for (let i = 0; i < 18; i++) { const az = rand(-Math.PI, Math.PI), pol = rand(.1, .75); if (Math.cos(az) > .6 && pol > .45) continue; ball(h, onScalp(az, pol, .077), .02, H, 1, 1, 1, 10); }
    for (let i = 0; i < 12; i++) {
      const az = Math.PI * (.45 + i / 11 * 1.1) * (i % 2 ? 1 : -1), base = onScalp(az, 1.25, .074);
      const pts = []; for (let k = 0; k < 7; k++) { const t = k * 1.5; pts.push(base.clone().add(V(Math.cos(t) * .011 + Math.sin(az) * k * .004, -k * .019, Math.sin(t) * .011 - .004 * k))); }
      pts.forEach((q, k) => ball(h, q, .018 - k * .0012, H, 1, 1, 1, 10));
    }
  } else if (st === 'long') {
    for (let i = 0; i < 11; i++) { const az = Math.PI + (i - 5) * .27, s = onScalp(az, 1.05, .07); lock(h, [s, s.clone().add(V(Math.sin(az) * .02, -.06, Math.cos(az) * .015)), s.clone().add(V(Math.sin(az) * .03, -.13, Math.cos(az) * .02 - .01))], .018, H); }
  }
  const beardMask = d => { const c = d.z / Math.sqrt(d.x * d.x + d.z * d.z || 1); return c > -.4 && ((d.y < .02 && c < .45) || (d.y < -.22 && c < .82) || d.y < -.5) && !(c < .2 && d.y < -.75); };
  if (LP && o.beard) {
    const B = o.beardMat || H;
    mk(h, heroHeadGeo({}, 1.1, beardMask, 16, 13), B).position.z = .003;
    [-1, 1].forEach(sd => { const m = mk(h, new THREE.ConeGeometry(.014, .05, 4), B, V(sd * .02, -.03, .074)); m.rotation.set(0, 0, sd * 1.9); m.scale.set(1, 1, .5); });
    if (o.beard === 'long') for (let i = 0; i < 6; i++) { const x = (i - 2.5) * .016, l = mk(h, new THREE.ConeGeometry(.02, .14, 4), B, V(x, -.15, .05 - Math.abs(x) * .5)); l.rotation.set(Math.PI + .2, 0, x * 4); l.scale.set(1.3, 1, .6); }
  } else if (o.beard === 'short') {
    const b = mk(h, new THREE.SphereGeometry(.071, 24, 14, Math.PI / 2 - 1.25, 2.5, Math.PI * .56, Math.PI * .34), H, V(0, -.004, .002)); b.scale.set(.9, 1.05, 1.02);
    for (let i = 0; i < 5; i++) { const x = (i - 2) * .014; lock(h, [V(x, -.05, .055), V(x * 1.1, -.07, .05), V(x * .8, -.085, .04)], .012, H); }
    [-1, 1].forEach(sd => lock(h, [V(0, -.022, .07), V(sd * .02, -.026, .068), V(sd * .034, -.036, .058)], .009, H));
  }
  if (!LP && o.beard === 'long') {
    const B = o.beardMat || H;
    const b = mk(h, new THREE.SphereGeometry(.071, 24, 14, Math.PI / 2 - 1.3, 2.6, Math.PI * .55, Math.PI * .35), B, V(0, -.004, .002)); b.scale.set(.92, 1.05, 1.03);
    for (let i = 0; i < 8; i++) { const x = (i - 3.5) * .013; lock(h, [V(x, -.05, .055), V(x * 1.05, -.1, .06), V(x * .7, -.16, .05), V(x * .3, -.22, .035)], .015, B); }
    [-1, 1].forEach(sd => lock(h, [V(0, -.022, .07), V(sd * .025, -.026, .068), V(sd * .045, -.045, .055)], .01, B));
  }
  return h;
}
function boot(g, ankle, mat, fwd = 0, s = 1) { ball(g, V(ankle.x, .03, ankle.z + .025), .045 * s, mat, .9, .7, 1.5); seg(g, V(ankle.x, .02, ankle.z), V(ankle.x, ankle.y + .06, ankle.z), .045 * s, .042 * s, mat); }

function buildFighter(g) {
  const skin = PM(0xe2a882, 'skin'), hair = PM(0x7a3a1a, 'hair'), steel = PM(0xd0d6de, 'metal'), dsteel = PM(0x6a717c, 'metal'), mail = PM(0x8a9098, 'metal'),
    tab = PM(0x9a1f28, 'cloth'), tabD = PM(0x9a1f28, 'cloth', 0, 1, true), gold = PM(0xe8b84a, 'metal'), lea = PM(0x5a3a22, 'leather');
  const hipL = V(.07, .46, 0), kneeL = V(.13, .26, .07), ankL = V(.15, .07, .06), hipR = V(-.07, .46, 0), kneeR = V(-.1, .26, -.05), ankR = V(-.13, .07, -.1);
  limb(g, [hipL, kneeL, ankL], [.055, .045, .04], steel); limb(g, [hipR, kneeR, ankR], [.055, .045, .04], steel);
  ball(g, kneeL, .05, gold, 1, 1, 1, 12); ball(g, kneeR, .05, gold, 1, 1, 1, 12);
  boot(g, ankL, dsteel); boot(g, ankR, dsteel);
  drape(g, { r0: .125, r1: .17, h: .16, y: .33, a0: 0, a1: Math.PI * 2, folds: 10, depth: .01, mat: PM(0x8a9098, 'metal', 0, 1, true) });
  drape(g, { r0: .13, r1: .155, h: .3, y: .25, a0: -.55, a1: .55, folds: 2, depth: .008, mat: tabD });
  drape(g, { r0: .13, r1: .16, h: .3, y: .25, a0: Math.PI - .6, a1: Math.PI + .6, folds: 2, depth: .008, mat: tabD });
  lathe(g, [[0, 0], [.12, 0], [.138, .08], [.152, .18], [.135, .27], [.075, .32], [0, .32]], steel, .46, 1, .8);
  ring(g, .13, .018, lea, .48, 1, .82); mk(g, new THREE.BoxGeometry(.05, .04, .02), gold, V(0, .48, .11));
  mk(g, new THREE.BoxGeometry(.06, .07, .035), lea, V(-.11, .44, .07)).rotation.y = -.6; ball(g, V(-.11, .465, .09), .008, gold, 1, 1, 1, 6);
  seg(g, V(.1, .47, -.05), V(.16, .12, -.14), .022, .018, PM(0x3a2414, 'leather'), 10); ball(g, V(.16, .11, -.14), .022, gold, 1, 1, 1, 8);
  [-1, 1].forEach(sd => { for (let k = 0; k < 3; k++) ball(g, V(sd * (.13 + k * .03), .78 - k * .012, .045), .007, gold, 1, 1, 1, 6); });
  mk(g, new THREE.BoxGeometry(.022, .14, .012), gold, V(0, .62, .118)).rotation.x = -.18; mk(g, new THREE.BoxGeometry(.09, .022, .012), gold, V(0, .65, .115)).rotation.x = -.18;
  lathe(g, [[.06, 0], [.085, .03], [.07, .07]], dsteel, .76);
  [-1, 1].forEach(sd => { const p = ball(g, V(sd * .165, .74, 0), .078, steel, 1.15, .75, 1.1); p.rotation.z = sd * .45; const r = mk(g, torG(.075, .01), gold, V(sd * .17, .72, 0)); r.rotation.set(Math.PI / 2, 0, sd * .45); r.scale.set(1.12, 1.05, 1); });
  const strapM = PM(0x4a2e22, 'leather'), buckM = PM(0xc8ccd2, 'metal');
  const st = mk(g, new THREE.BoxGeometry(.03, .36, .014), strapM, V(0, .6, .118)); st.rotation.set(-.2, 0, -.62);
  [[-.06, .66], [.05, .55]].forEach(([x, y]) => { const b = mk(g, new THREE.BoxGeometry(.028, .028, .008), buckM, V(x, y, .128)); b.rotation.z = -.62; mk(g, new THREE.BoxGeometry(.014, .014, .01), strapM, V(x, y, .13)).rotation.z = -.62; });
  [-1, 1].forEach(sd => { for (let k = 0; k < 2; k++) { const y = .69 - k * .035; mk(g, new THREE.BoxGeometry(.13, .03, .07), k ? steel : PM(0xb8bec8, 'metal'), V(sd * .2, y, 0)).rotation.z = sd * -.55; } });
  limb(g, [V(-.16, .72, 0), V(-.25, .64, .1), V(-.22, .77, .2)], [.045, .04, .036], steel); ball(g, V(-.22, .78, .21), .036, dsteel);
  limb(g, [V(.16, .72, 0), V(.25, .6, .07), V(.22, .55, .18)], [.045, .04, .036], steel); ball(g, V(.22, .55, .19), .036, dsteel);
  head(g, { p: V(0, .865, .015), skin, hairMat: hair, hair: 'short', beard: 'short', angry: true, eye: 0x3a5a7a });
  drape(g, { r0: .14, r1: .31, h: .6, y: .14, a0: Math.PI - 1.35, a1: Math.PI + 1.35, folds: 5, depth: .03, sway: [.07, -.14], lift: .06, mat: PM(0x8e1a22, 'cloth', 0, 1, true) });
  // kite shield with a painted crest
  const sh = new THREE.Group(); sh.position.set(.29, .55, .2); sh.rotation.set(0, .85, 0); sh.userData.bone = 'hdL'; g.add(sh);
  const kite = new THREE.Shape(); kite.moveTo(0, .2); kite.quadraticCurveTo(.13, .2, .135, .1); kite.quadraticCurveTo(.12, -.06, 0, -.2); kite.quadraticCurveTo(-.12, -.06, -.135, .1); kite.quadraticCurveTo(-.13, .2, 0, .2);
  const back = mk(sh, new THREE.ExtrudeGeometry(kite, { depth: .02, bevelEnabled: true, bevelThickness: .008, bevelSize: .01, bevelSegments: 2 }), gold); back.position.z = -.022;
  const crest = canvasTex(128, 192, (c, w, h) => {
    c.fillStyle = '#a81c26'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f0ea'; c.beginPath(); c.moveTo(0, h * .58); c.lineTo(w / 2, h * .34); c.lineTo(w, h * .58); c.lineTo(w, h * .7); c.lineTo(w / 2, h * .46); c.lineTo(0, h * .7); c.fill();
    c.fillStyle = '#e8b84a'; c.beginPath(); c.arc(w / 2, h * .2, 16, 0, 7); c.fill(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillRect(w / 2 + Math.cos(a) * 20 - 2, h * .2 + Math.sin(a) * 20 - 2, 4, 4); }
    c.globalAlpha = .18; for (let i = 0; i < 200; i++) { c.fillStyle = Math.random() > .5 ? '#fff' : '#000'; c.fillRect(rand(0, w), rand(0, h), 2, 2); }
  });
  crest.repeat.set(1 / .27, 1 / .4); crest.offset.set(.5, .5);
  const face = mk(sh, new THREE.ShapeGeometry(kite, 12), new THREE.MeshStandardMaterial({ map: crest, roughness: .45, metalness: .1 })); face.position.z = .007; face.material.userData.e0 = face.material.emissive.clone(); face.material.userData.ei0 = 1;
  ball(sh, V(0, .04, .012), .022, gold, 1, 1, .6);
  // longsword raised in the right hand
  const sw = new THREE.Group(); sw.position.set(-.22, .78, .21); sw.rotation.set(.35, 0, .25); sw.userData.bone = 'hdR'; g.add(sw);
  seg(sw, V(0, -.06, 0), V(0, .05, 0), .016, .016, lea, 8); ball(sw, V(0, -.075, 0), .022, gold, 1, 1, 1, 10);
  mk(sw, new THREE.BoxGeometry(.16, .022, .03), gold, V(0, .06, 0)); [-1, 1].forEach(sd => ball(sw, V(sd * .08, .06, 0), .016, gold, 1, 1, 1, 8));
  mk(sw, bladeGeo(.5, .045), PM(0xeef2f6, 'metal'), V(0, .07, 0));
  return 1.0;
}
function buildCleric(g) {
  const skin = PM(0x8a5636, 'skin'), hair = PM(0x8a64d6, 'hair'), robe = PM(0xeef0ec, 'cloth'), robeD = PM(0xe8ebe6, 'cloth', 0, 1, true), mantle = PM(0xc8923e, 'leather'), mantleD = PM(0xb8803a, 'leather', 0, 1, true),
    belt = PM(0x7a4e2a, 'leather'), silver = PM(0xd8dde4, 'metal'), steel = PM(0xb8c0ca, 'metal'), bootM = PM(0xb87a3a, 'leather'), gem = PM(0xa070ff, 'plain', 0x6a30ff, .6, false, true);
  gem.roughness = .1;
  limb(g, [V(.07, .44, .02), V(.09, .25, .09), V(.09, .07, .07)], [.05, .045, .04], steel); ball(g, V(.09, .25, .1), .048, steel, 1, 1, 1, 12); boot(g, V(.09, .07, .07), bootM);
  limb(g, [V(-.06, .44, 0), V(-.07, .25, -.02), V(-.08, .07, -.03)], [.05, .045, .04], steel); boot(g, V(-.08, .07, -.03), bootM);
  drape(g, { r0: .125, r1: .23, h: .48, y: .04, a0: .6, a1: Math.PI * 2 - .05, folds: 9, depth: .02, mat: robeD });
  lathe(g, [[0, 0], [.11, 0], [.128, .1], [.124, .2], [.075, .29], [0, .29]], robe, .46, 1, .8);
  ring(g, .118, .022, belt, .51, 1, .82); [-.07, -.035, .035, .07].forEach(x => ball(g, V(x, .51, .1), .013, silver, 1, 1, .6, 10));
  mk(g, new THREE.CylinderGeometry(.03, .03, .01, 18), PM(0xd8a050, 'metal'), V(0, .51, .107)).rotation.x = Math.PI / 2; ball(g, V(0, .51, .113), .012, gem, 1, 1, .5, 10);
  [.62, .6].forEach((y, k) => { ring(g, .046, .006, PM(0xd8a050, 'metal'), 0).position.set(k ? .25 : -.21, y, k ? .06 : .05); });
  ball(g, V(.13, .44, .05), .04, PM(0x7a9a7a, 'plain'), 1, 1.1, 1); seg(g, V(.13, .48, .05), V(.13, .52, .05), .014, .018, PM(0x7a9a7a, 'plain'));
  ball(g, V(-.12, .45, .06), .028, PM(0x9a6ad8, 'plain', 0x5a20c0, .4), 1, 1.3, 1);
  lathe(g, [[.07, .1], [.15, .055], [.19, 0], [.17, -.02]], mantleD, .68, 1, .9);
  drape(g, { r0: .15, r1: .22, h: .42, y: .26, a0: Math.PI - 1.15, a1: Math.PI + 1.15, folds: 4, depth: .02, sway: [-.04, -.06], mat: mantleD });
  mk(g, new THREE.CylinderGeometry(.034, .034, .012, 20), silver, V(0, .71, .1)).rotation.x = Math.PI / 2 - .2;
  mk(g, new THREE.OctahedronGeometry(.024), gem, V(0, .71, .11)).scale.set(1, 1, .5);
  limb(g, [V(-.15, .72, 0), V(-.21, .58, .05), V(-.2, .47, .14)], [.045, .043, .04], robe); ball(g, V(-.2, .46, .15), .03, skin);
  limb(g, [V(.15, .72, 0), V(.25, .62, .04), V(.28, .67, .15)], [.045, .043, .04], robe); ball(g, V(.28, .68, .16), .03, skin);
  // holy flame on the raised palm
  const flg = new THREE.Group(); flg.userData.bone = 'hdL'; g.add(flg);
  const fl = mk(flg, new THREE.ConeGeometry(.026, .08, 12), PM(0xffe2a0, 'plain', 0xffa020, 2.2), V(.285, .74, .16));
  ball(flg, V(.285, .71, .16), .026, PM(0xfff0c0, 'plain', 0xffb030, 2.2));
  const gl = glowSprite(0xffb040, .42); gl.position.set(.285, .72, .16); flg.add(gl);
  // flanged mace hanging from the right hand
  const mace = new THREE.Group(); mace.position.set(-.2, .46, .15); mace.rotation.x = .7; mace.userData.bone = 'hdR'; g.add(mace);
  seg(mace, V(0, .06, 0), V(0, -.3, 0), .013, .013, PM(0x6a4a2a, 'wood'), 8);
  ball(mace, V(0, -.32, 0), .04, steel); for (let i = 0; i < 6; i++) { const f = mk(mace, new THREE.BoxGeometry(.012, .07, .04), steel, V(Math.cos(i) * .04, -.32, Math.sin(i) * .04)); f.rotation.y = -i; }
  head(g, { p: V(0, .855, .02), skin, hairMat: hair, hair: 'curly', ears: 'elf', eye: 0xc8a020, brow: hair, turn: .25 });
  return .98;
}
function buildMage(g) {
  const skin = PM(0xe8b898, 'skin'), robe = PM(0x2a3a92, 'cloth'), robeD = PM(0x26358a, 'cloth', 0, 1, true), trim = PM(0xe8bc4a, 'metal'), sash = PM(0xa8282a, 'cloth', 0, 1, true),
    hat = PM(0x3a2a90, 'cloth'), beard = PM(0xf2f0ea, 'hair'), wood = PM(0x6a4a2e, 'wood'), lea = PM(0x5a3a22, 'leather');
  boot(g, V(.07, .05, .1), lea); boot(g, V(-.07, .05, .04), lea);
  drape(g, { r0: .12, r1: .24, h: .52, y: .03, a0: 0, a1: Math.PI * 2, folds: 9, depth: .02, mat: robeD });
  drape(g, { r0: .118, r1: .238, h: .04, y: .03, a0: 0, a1: Math.PI * 2, folds: 9, depth: .02, mat: PM(0xe8bc4a, 'metal', 0, 1, true) });
  lathe(g, [[0, 0], [.115, 0], [.13, .1], [.122, .2], [.07, .28], [0, .28]], robe, .5, 1, .8);
  ring(g, .122, .022, sash, .53, 1, .82); drape(g, { r0: .04, r1: .05, h: .16, y: .38, a0: -.5, a1: .5, folds: 1, mat: sash, sz: 3.2 });
  mk(g, new THREE.BoxGeometry(.08, .1, .035), PM(0x7a2020, 'leather'), V(.13, .46, .06)).rotation.y = .7; mk(g, new THREE.BoxGeometry(.084, .104, .02), trim, V(.13, .46, .06)).rotation.y = .7;
  // bell sleeves
  limb(g, [V(-.15, .72, 0), V(-.23, .64, .05)], [.045, .05], robe); seg(g, V(-.23, .64, .05), V(-.24, .76, .12), .05, .075, robeD); ball(g, V(-.24, .78, .13), .03, skin);
  limb(g, [V(.15, .72, 0), V(.24, .6, .06)], [.045, .05], robe); seg(g, V(.24, .6, .06), V(.25, .55, .17), .05, .075, robeD); ball(g, V(.25, .54, .19), .03, skin);
  const orb = ball(g, V(.27, .58, .22), .03, PM(0xd0a0ff, 'plain', 0x9a50ff, 2)); const og = glowSprite(0xb070ff, .3); og.position.copy(orb.position); g.add(og);
  head(g, { p: V(0, .84, .02), skin, hairMat: beard, hair: 'long', beard: 'long', beardMat: beard, brow: beard, eye: 0x2a4a8a });
  // tall bent hat
  const hg = new THREE.Group(); hg.position.set(0, ST ? 1.0 : .9, .01); if (ST) hg.scale.set(1.45, 1.3, 1.45); hg.userData.bone = 'head'; g.add(hg);
  mk(hg, new THREE.CylinderGeometry(.2, .19, .016, 32), hat); ring(hg, .085, .016, trim, .02);
  limb(hg, [V(0, .01, 0), V(0, .14, -.01), V(.01, .25, -.05), V(.06, .32, -.13)], [.09, .06, .035, .01], hat);
  ball(hg, V(.04, .08, .08), .016, PM(0xffe27a, 'plain', 0xffc030, 1.5));
  // staff with a caged crystal
  const stf = new THREE.Group(); stf.userData.bone = 'hdR'; g.add(stf);
  seg(stf, V(-.24, .05, .12), V(-.25, 1.2, .11), .014, .018, wood, 8); [.7, .74].forEach(y => ring(stf, .022, .006, trim, y, 1, 1, .115).position.x = -.245);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; const c = mk(stf, new THREE.ConeGeometry(.012, .12, 6), wood, V(-.25 + Math.cos(a) * .03, 1.25, .11 + Math.sin(a) * .03)); c.rotation.set(Math.sin(a) * .4, 0, -Math.cos(a) * .4); }
  mk(stf, new THREE.OctahedronGeometry(.05), PM(0xb0f0ff, 'plain', 0x40c0ff, 2.2), V(-.25, 1.27, .11)).scale.set(.8, 1.5, .8);
  const o = glowSprite(0x66ccff, .55); o.position.set(-.25, 1.27, .11); stf.add(o);
  return 1.28;
}
function buildThief(g) {
  const skin = PM(0xc98a62, 'skin'), hair = PM(0x1e1a1a, 'hair'), coat = PM(0x6a4a34, 'leather'), coatD = PM(0x6a4a34, 'leather', 0, 1, true), trim = PM(0xb49a84, 'leather'), pants = PM(0x2c2422, 'leather'),
    bootM = PM(0x6a4630, 'leather'), cloak = PM(0x7a52b8, 'cloth', 0, 1, true), steel = PM(0xd0d8e0, 'metal'), wrap = PM(0xb8aa96, 'cloth'), glove = PM(0x2a2220, 'leather'), studs = PM(0xc0c8d0, 'metal');
  const hipL = V(.07, .38, 0), kneeL = V(.17, .22, .07), ankL = V(.2, .06, .03), hipR = V(-.07, .38, 0), kneeR = V(-.15, .22, -.02), ankR = V(-.2, .06, -.06);
  limb(g, [hipL, kneeL, ankL], [.055, .046, .04], pants); limb(g, [hipR, kneeR, ankR], [.055, .046, .04], pants);
  [ankL, ankR].forEach(a => { seg(g, V(a.x, .04, a.z), V(a.x * .97, .16, a.z), .048, .05, trim); boot(g, a, bootM); });
  drape(g, { r0: .11, r1: .16, h: .17, y: .25, a0: .35, a1: Math.PI * 2 - .35, folds: 6, depth: .012, mat: coatD });
  const tor = new THREE.Group(); tor.position.set(0, .4, 0); tor.rotation.set(.18, -.2, 0); g.add(tor);
  lathe(tor, [[0, 0], [.1, 0], [.122, .1], [.13, .19], [.08, .27], [0, .27]], coat, 0, 1, .78);
  ring(tor, .11, .02, PM(0x3a2a1e, 'leather'), .06, 1, .82); mk(tor, new THREE.BoxGeometry(.03, .03, .012), studs, V(0, .06, .1));
  mk(tor, new THREE.BoxGeometry(.06, .08, .035), coat, V(.1, .02, .06)).rotation.y = .6; mk(tor, new THREE.BoxGeometry(.05, .06, .03), trim, V(-.09, .04, .07)).rotation.y = -.6;
  const bando = mk(tor, new THREE.BoxGeometry(.025, .3, .012), PM(0x3a2a1e, 'leather'), V(0, .15, .1)); bando.rotation.set(-.15, 0, .55);
  [[-.035, .19], [.03, .1]].forEach(([x, y]) => { const b = mk(tor, new THREE.BoxGeometry(.026, .026, .008), studs, V(x, y, .113)); b.rotation.z = .55; });
  ball(tor, V(.03, .15, .108), .025, PM(0x8a5a30, 'leather'), 1, 1.2, .6);
  // red scarf, pauldron and bedroll
  ring(tor, .065, .03, PM(0x6a4498, 'cloth'), .26, 1, .9); drape(tor, { r0: .06, r1: .1, h: .14, y: .13, a0: -.6, a1: .7, folds: 3, mat: cloak });
  for (let k = 0; k < 7; k++) { const a = (k - 3) * .32, t = mk(tor, new THREE.ConeGeometry(.008, .028, 6), PM(0xf0e6cc), V(Math.sin(a) * .07, .225, Math.cos(a) * .07 + .005)); t.rotation.x = Math.PI; }
  for (let k = 0; k < 5; k++) { const l = mk(tor, torG(.012, .003), studs, V(-.05 + k * .016, .03 - Math.sin(k / 4 * Math.PI) * .02, .1)); l.rotation.y = k % 2 ? Math.PI / 2 : 0; }
  ring(tor, .012, .003, PM(0xe8b84a, 'metal'), 0).position.set(.03, .15, .118);
  drape(tor, { r0: .162, r1: .162, h: .02, y: -.15, a0: .35, a1: Math.PI * 2 - .35, folds: 6, depth: .012, mat: PM(0xb49a84, 'leather', 0, 1, true) });
  ball(tor, V(.13, .25, 0), .07, PM(0x3a3a3e, 'leather'), 1.1, .7, 1.1).rotation.z = .4; ring(tor, .07, .01, studs, 0).position.set(.135, .24, 0);
  const roll = mk(tor, new THREE.CylinderGeometry(.05, .05, .24, 16), PM(0xd8d4cc, 'cloth'), V(0, .3, -.13)); roll.rotation.z = Math.PI / 2;
  [-1, 1].forEach(sd => [.034, .02].forEach(r => { const sp = mk(tor, torG(r, .006), PM(0xa8a49c, 'cloth'), V(sd * .121, .3, -.13)); sp.rotation.y = Math.PI / 2; }));
  [-1, 1].forEach(sd => ring(tor, .052, .008, PM(0x3a2a1e, 'leather'), 0).position.set(sd * .07, .3, -.13));
  drape(tor, { r0: .13, r1: .3, h: .5, y: -.22, a0: Math.PI - 1.2, a1: Math.PI + 1.25, folds: 5, depth: .028, sway: [-.16, -.14], lift: .05, mat: cloak });
  // reaching left arm, dagger in the right
  limb(g, [V(.14, .63, .02), V(.27, .62, .13), V(.37, .63, .23)], [.042, .038, .034], coat);
  for (let i = 0; i < 4; i++) { const r = mk(g, torG(.037, .008), wrap, V(.3 + i * .018, .625, .16 + i * .018)); r.lookAt(r.position.clone().add(V(.7, .02, .7))); }
  ball(g, V(.38, .635, .24), .032, glove); for (let i = 0; i < 4; i++) ball(g, V(.39 + i * .008, .65, .235 + i * .01), .008, skin, 1, 1, 2.2, 8);
  limb(g, [V(-.14, .63, .02), V(-.21, .5, .05), V(-.18, .42, .14)], [.042, .038, .034], coat);
  ball(g, V(-.18, .41, .15), .033, glove); [0, 1, 2].forEach(i => ball(g, V(-.2 + i * .015, .42, .175), .007, studs, 1, 1, 1, 6));
  const dg = new THREE.Group(); dg.position.set(-.18, .41, .15); dg.rotation.set(1.25, .1, .2); dg.userData.bone = 'hdR'; g.add(dg);
  seg(dg, V(0, -.035, 0), V(0, .03, 0), .012, .012, glove, 6); mk(dg, new THREE.BoxGeometry(.07, .014, .02), steel, V(0, .035, 0)); mk(dg, bladeGeo(.2, .032, .025), steel, V(0, .04, 0));
  head(g, { p: V(.02, .745, .07), skin, hairMat: hair, hair: 'messy', angry: true, turn: .45, tilt: .1, eye: 0x6a7a3a });
  return .9;
}
function buildGoblin(g, kind) {
  const skin = PM(new THREE.Color().setHSL(rand(.23, .28), .55, rand(.36, .42)), 'skin', 0, 1, false, true), cloth = PM(0x6a4a2a, 'cloth', 0, 1, true), lea = PM(0x4a3020, 'leather'), steel = PM(0x9aa0a8, 'metal'), rust = PM(0x8a5a3a, 'metal'), wood = PM(0x6a4422, 'wood'), bone = PM(0xe2d6b8, 'plain');
  const king = kind === 'king';
  if (king) { skin.color.setHSL(.2, .45, .3); skin.userData.hex = skin.color.getHex(); skin.color.convertSRGBToLinear(); }
  limb(g, [V(.055, .25, 0), V(.1, .14, .05), V(.09, .04, .0)], [.04, .034, .03], skin); limb(g, [V(-.055, .25, 0), V(-.1, .14, .04), V(-.09, .04, -.02)], [.04, .034, .03], skin);
  [[.09, .0], [-.09, -.02]].forEach(([x, z]) => { const f = ball(g, V(x, .025, z + .04), .035, skin, .9, .55, 1.6); [-1, 0, 1].forEach(k => ball(g, V(x + k * .02, .02, z + .095), .01, PM(0x2a2018), 1, 1, 1, 6)); });
  drape(g, { r0: .1, r1: .14, h: .14, y: .17, a0: 0, a1: Math.PI * 2, folds: 7, depth: .015, mat: kind === 'shaman' ? PM(0x3a4a2a, 'cloth', 0, 1, true) : cloth, nu: 18 });
  const tor = new THREE.Group(); tor.position.set(0, .27, 0); tor.rotation.x = .3; g.add(tor);
  lathe(tor, king ? [[0, 0], [.1, 0], [.15, .08], [.14, .16], [.07, .22], [0, .22]] : [[0, 0], [.08, 0], [.105, .07], [.095, .14], [.05, .2], [0, .2]], skin, 0, 1, .9);
  ring(tor, king ? .12 : .09, .018, lea, .02, 1, .9);
  const HS = ST ? 1.25 : 1, hp = king ? V(0, .31 + (HS - 1) * .1, .1) : V(0, .27 + (HS - 1) * .1, .09);
  // long wiry arms
  const armR = [V(-.09, .18, .02), V(-.15, .06, .06), V(-.15, -.04, .14)], armL = [V(.09, .18, .02), V(.15, .06, .06), V(.14, -.03, .14)];
  tor.updateMatrix(); const TJ = v => v.clone().applyMatrix4(tor.matrix).toArray();
  FIGJ = { w: .3, n: TJ(hp.clone().add(V(0, -.07, -.02))), top: TJ(hp.clone().add(V(0, .1 * HS, 0))), hL: [.055, .25, 0], kL: [.1, .14, .05], aL: [.09, .04, 0], hR: [-.055, .25, 0], kR: [-.1, .14, .04], aR: [-.09, .04, -.02], sL: TJ(armL[0]), eL: TJ(armL[1]), wL: TJ(armL[2]), sR: TJ(armR[0]), eR: TJ(armR[1]), wR: TJ(armR[2]) };
  limb(tor, armR, [.032, .028, .025], skin); limb(tor, armL, [.032, .028, .025], skin);
  ball(tor, armR[2], .03, skin); ball(tor, armL[2], .03, skin);
  head(tor, { p: hp, s: (king ? 1.3 : 1.35) * HS, skin, ears: 'gob', nose: 'gob', eyeGlow: kind === 'shaman' ? 0xb8d84a : 0xffb020, eye: 0x301000, brow: PM(0x2a3a1a), angry: true });
  if (kind === 'cutter') {
    const helm = new THREE.Group(); helm.position.copy(hp); helm.scale.setScalar(1.35 * HS); helm.userData.bone = 'head'; tor.add(helm);
    ball(helm, V(0, .03, -.005), .074, rust, 1, .78, 1.02); mk(helm, new THREE.ConeGeometry(.018, .07, 8), steel, V(0, .1, 0)); ring(helm, .074, .008, lea, .02);
    lathe(tor, [[.07, 0], [.105, .06], [.1, .15], [.06, .19]], lea, .005, 1, .92);
    const cv = new THREE.Group(); cv.position.copy(armR[2]); cv.rotation.set(-.4, 0, .3); cv.userData.bone = 'hdR'; tor.add(cv);
    seg(cv, V(0, -.04, 0), V(0, .06, 0), .012, .012, wood, 6); const bl = mk(cv, bladeGeo(.15, .1, -.03), steel, V(.03, .05, 0));
    const shd = new THREE.Group(); shd.position.copy(armL[2]).add(V(.04, .02, .02)); shd.rotation.set(0, .9, 0); shd.userData.bone = 'hdL'; tor.add(shd);
    mk(shd, new THREE.CylinderGeometry(.12, .12, .025, 20), wood).rotation.x = Math.PI / 2; mk(shd, torG(.12, .012), steel); ball(shd, V(0, 0, .02), .03, steel, 1, 1, .6);
    [-1, 1].forEach(sd => mk(shd, new THREE.BoxGeometry(.012, .2, .012), PM(0x3a2414, 'wood'), V(sd * .05, 0, .014)));
    return .72;
  }
  if (kind === 'archer') {
    drape(tor, { r0: .06, r1: .13, h: .2, y: .16, a0: Math.PI - 1.4, a1: Math.PI + 1.4, folds: 3, mat: PM(0x3a5a2a, 'cloth', 0, 1, true) });
    const hood = ball(tor, hp.clone().add(V(0, .03 * HS, -.02 * HS)), .1 * HS, PM(0x3a5a2a, 'cloth'), 1.05, .95, 1.1); const tip = mk(tor, new THREE.ConeGeometry(.05 * HS, .14 * HS, 10), PM(0x3a5a2a, 'cloth'), hp.clone().add(V(0, .06 * HS, -.13 * HS))); tip.rotation.x = -1.9;
    lathe(tor, [[.07, 0], [.1, .06], [.095, .15], [.06, .19]], lea, .005, 1, .92);
    const bow = new THREE.Group(); bow.position.copy(armL[2]); bow.rotation.set(0, .2, 0); bow.userData.bone = 'hdL'; tor.add(bow);
    mk(bow, torG(.24, .012, Math.PI * .9), wood).rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.PI * .05); seg(bow, V(0, .23, -.03), V(0, -.23, -.03), .003, .003, PM(0xeeeedd), 4);
    seg(tor, V(.05, .05, -.12), V(.08, .28, -.15), .04, .035, lea, 10); [0, .02, -.02].forEach(x => mk(tor, new THREE.ConeGeometry(.016, .05, 4), PM(0xcc3322), V(.08 + x, .32, -.15)));
    return .74;
  }
  if (kind === 'shaman') {
    drape(tor, { r0: .1, r1: .17, h: .3, y: -.12, a0: 0, a1: Math.PI * 2, folds: 7, depth: .02, mat: PM(0x4a5a30, 'cloth', 0, 1, true) });
    const mask = new THREE.Group(); mask.position.copy(hp); mask.scale.setScalar(1.35 * HS); mask.userData.bone = 'head'; tor.add(mask);
    ball(mask, V(0, .01, .05), .06, bone, 1, 1.1, .5); [-1, 1].forEach(sd => ball(mask, V(sd * .022, .015, .075), .012, PM(0x0a0a0a), 1.2, 1, .5, 8));
    [[-.08, 0xd03a2a], [-.04, 0x3a7ad0], [0, 0xe0c040], [.04, 0x3a7ad0], [.08, 0xd03a2a]].forEach(([x, c]) => { const f = mk(mask, new THREE.ConeGeometry(.015, .2, 5), PM(c, 'cloth'), V(x, .12, -.03)); f.rotation.set(-.35, 0, -x * 3); });
    ring(tor, .07, .01, bone, .2); for (let i = 0; i < 5; i++) ball(tor, V(Math.sin(i - 2) * .065, .17, Math.cos(i - 2) * .06), .014, bone, 1, 1.4, 1, 8);
    const stf = new THREE.Group(); stf.userData.bone = 'hdR'; tor.add(stf);
    seg(stf, armR[2].clone().add(V(0, -.25, 0)), armR[2].clone().add(V(0, .45, 0)), .013, .015, wood, 6);
    const sk = ball(stf, armR[2].clone().add(V(0, .5, 0)), .05, bone, 1, 1.05, 1); [-1, 1].forEach(sd => ball(stf, armR[2].clone().add(V(sd * .018, .51, .04)), .012, PM(0x0a0a0a), 1, 1, 1, 6));
    const o = glowSprite(0xb8d84a, .4); o.position.copy(sk.position); stf.add(o);
    return .86;
  }
  // the Goblin King: fur mantle, crown, purple cape and a great cleaver
  const fur = PM(0x9a8a76, 'fur'), gold = PM(0xf0c040, 'metal'), purple = PM(0x5a1a6a, 'cloth', 0, 1, true);
  drape(tor, { r0: .14, r1: .3, h: .45, y: -.22, a0: Math.PI - 1.4, a1: Math.PI + 1.4, folds: 6, depth: .03, sway: [0, -.08], mat: purple });
  ring(tor, .12, .055, fur, .2, 1, .9);
  lathe(tor, [[.0, 0], [.11, 0], [.13, .06], [.12, .1]], PM(0x7a7e88, 'metal'), .02, 1, .9);
  const cr = new THREE.Group(); cr.position.copy(hp).add(V(0, .085 * HS, -.005)); cr.scale.setScalar(HS); cr.userData.bone = 'head'; tor.add(cr);
  mk(cr, new THREE.CylinderGeometry(.08, .072, .05, 20, 1, true), PM(0xf0c040, 'metal', 0, 1, true));
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mk(cr, new THREE.ConeGeometry(.018, .06, 6), gold, V(Math.sin(a) * .076, .05, Math.cos(a) * .076)); }
  [[0, 0xff2040], [1.8, 0x40ff80], [-1.8, 0x4080ff]].forEach(([a, c]) => ball(cr, V(Math.sin(a) * .08, .0, Math.cos(a) * .08), .012, PM(c, 'plain', c, .8), 1, 1, 1, 8));
  const cv = new THREE.Group(); cv.position.copy(armR[2]); cv.rotation.set(-.5, 0, .2); cv.userData.bone = 'hdR'; tor.add(cv);
  seg(cv, V(0, -.08, 0), V(0, .1, 0), .016, .016, wood, 8); ball(cv, V(0, -.09, 0), .02, gold);
  mk(cv, bladeGeo(.3, .17, -.05), steel, V(.05, .09, 0)); mk(cv, new THREE.BoxGeometry(.18, .03, .022), gold, V(.04, .1, 0));
  return .9;
}
function buildWarg(g) {
  const fur = PM(0x5a4a40, 'fur'), dfur = PM(0x2e2620, 'fur'), belly = PM(0x8a7a6a, 'fur'), eye = PM(0xffd23a, 'plain', 0xffa020, 2), tooth = PM(0xf0e8d0), nose = PM(0x111111, 'leather'), lea = PM(0x4a3020, 'leather');
  ball(g, V(0, .34, -.04), .17, fur, .85, .8, 1.55); ball(g, V(0, .38, .14), .16, fur); ball(g, V(0, .3, .02), .12, belly, .8, .6, 1.3);
  for (let i = 0; i < 7; i++) { const s = mk(g, new THREE.ConeGeometry(.03, .1, 6), dfur, V(0, .5 - i * .01, .16 - i * .07)); s.rotation.x = -1.1; }
  seg(g, V(0, .42, .22), V(0, .48, .3), .1, .09, fur);
  ball(g, V(0, .5, .33), .11, fur, 1, .9, 1.1);
  const hd = new THREE.Object3D(); hd.position.set(0, .5, .38); g.add(hd); lastHead = hd; hd.userData.s = 1.4;
  const snout = seg(g, V(0, .48, .38), V(0, .45, .52), .055, .04, fur, 10); seg(g, V(0, .43, .38), V(0, .42, .5), .045, .035, dfur, 10);
  ball(g, V(0, .47, .53), .025, nose, 1, .8, 1, 8);
  [-1, 1].forEach(sd => {
    const e = mk(g, new THREE.ConeGeometry(.035, .1, 6), fur, V(sd * .06, .62, .3)); e.rotation.set(-.2, 0, sd * -.3);
    ball(g, V(sd * .045, .53, .41), .017, eye, 1, 1, 1, 8);
    const t = mk(g, new THREE.ConeGeometry(.01, .035, 5), tooth, V(sd * .025, .435, .49)); t.rotation.x = Math.PI;
    limb(g, [V(sd * .09, .3, .17), V(sd * .1, .16, .19), V(sd * .09, .04, .21)], [.05, .035, .03], fur); ball(g, V(sd * .09, .025, .23), .035, dfur, 1, .6, 1.3);
    limb(g, [V(sd * .09, .32, -.22), V(sd * .11, .18, -.28), V(sd * .09, .04, -.22)], [.055, .035, .03], fur); ball(g, V(sd * .09, .025, -.2), .035, dfur, 1, .6, 1.3);
  });
  ring(g, .1, .016, lea, .43, 1, 1, .27);
  const tail = seg(g, V(0, .38, -.3), V(0, .44, -.48), .05, .02, fur, 8);
  return .72;
}
function cobbleTex(dark) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = dark ? '#1e1c1a' : '#2c2622'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = rand(0, w), y = rand(0, h), r = rand(14, 24), v = (dark ? 70 : 92) + Math.random() * 50 | 0, warm = Math.random() > .55;
      g.fillStyle = `rgb(${v + (warm ? 18 : 0)},${v + (warm ? 6 : 2)},${v + (warm ? -4 : 8)})`;
      g.beginPath(); const n = 6 + (Math.random() * 3 | 0);
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rand(-.25, .25), rr = r * rand(.72, 1); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * .8; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,250,240,.22)'; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
    }
    if (dark) for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(90,130,50,${rand(.2, .45)})`; g.beginPath(); g.arc(rand(0, w), rand(0, h), rand(4, 12), 0, 7); g.fill(); }
  });
}
function baseGeo(R) { return new THREE.LatheGeometry([[0, 0], [R, 0], [R + .007, .022], [R + .004, .05], [R - .008, .062], [0, .062]].map(([x, y]) => new THREE.Vector2(x, y)), LP ? 10 : 40); }
const baseMat = new THREE.MeshStandardMaterial({ color: 0x141316, roughness: .25, metalness: .1 });
const RIM = { fighter: 0x3db8ff, cleric: 0x3db8ff, mage: 0x3db8ff, thief: 0x3db8ff, cutter: 0xff5b47, archer: 0xff5b47, warg: 0xff5b47, shaman: 0xff5b47, king: 0xff5b47 };
const LEAN = .16, leanQ = new THREE.Quaternion(), yawQ = new THREE.Quaternion(), leanAxis = new V3();
// collapse a figure's many parts into one mesh per material, so detailed minis stay cheap to draw
function mergeFig(fig) {
  fig.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(fig.matrixWorld).invert(), groups = new Map(), sprites = [];
  fig.traverse(o => {
    if (o === fig) return;
    const m4 = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (o.isSprite) { sprites.push([o, m4]); return; }
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(m4);
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(geo);
  });
  while (fig.children.length) fig.remove(fig.children[0]);
  for (const [mat, geos] of groups) {
    let n = 0; geos.forEach(gm => n += gm.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), hasCol = geos.some(gm => gm.attributes.color), col = hasCol ? new Float32Array(n * 3).fill(1) : null; let o3 = 0, o2 = 0;
    geos.forEach(gm => { const c = gm.attributes.position.count; pos.set(gm.attributes.position.array, o3); if (gm.attributes.normal) nor.set(gm.attributes.normal.array, o3); if (gm.attributes.uv) uv.set(gm.attributes.uv.array, o2); if (col && gm.attributes.color) col.set(gm.attributes.color.array, o3); o3 += c * 3; o2 += c * 2; gm.dispose(); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; fig.add(m);
  }
  sprites.forEach(([s, m4]) => { m4.decompose(s.position, s.quaternion, s.scale); fig.add(s); });
}
function shadeFig(fig, list = fig.children) {
  let y0 = Infinity, y1 = -Infinity;
  list.forEach(m => { if (!m.isMesh) return; const a = m.geometry.attributes.position.array; for (let i = 1; i < a.length; i += 3) { if (a[i] < y0) y0 = a[i]; if (a[i] > y1) y1 = a[i]; } });
  list.forEach(m => {
    if (!m.isMesh) return;
    const gm = m.geometry, pos = gm.attributes.position, n = pos.count;
    const old = gm.attributes.color, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) {
      const r = Math.sin((i / 3 + m.id * 31) * 12.9898) * 43758.5453, jit = 1 + ((r - Math.floor(r)) - .5) * .09;
      for (let k = i; k < Math.min(i + 3, n); k++) {
        const t = (pos.getY(k) - y0) / (y1 - y0 || 1), v = (.6 + .4 * Math.pow(t, .65)) * jit;
        col[k * 3] = (old ? old.getX(k) : 1) * v; col[k * 3 + 1] = (old ? old.getY(k) : 1) * v; col[k * 3 + 2] = (old ? old.getZ(k) : 1) * v;
      }
    }
    gm.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.material.vertexColors = true; m.material.needsUpdate = true;
  });
}
// ---------------- rigs: each sculpt is cut into jointed parts ----------------
// joints in figure space (figures face +z, right hand is -x): w waist height, n neck, top crown,
// h/k/a hip, knee, ankle; s/e/w shoulder, elbow, wrist; L and R
let FIGJ = null; // a goblin builder sets its own joints here
const JOINTS = {
  fighter: { w: .5, n: [0, .8, 0], top: [0, .95, .02], hL: [.07, .46, 0], kL: [.13, .26, .07], aL: [.15, .07, .06], hR: [-.07, .46, 0], kR: [-.1, .26, -.05], aR: [-.13, .07, -.1], sL: [.16, .72, 0], eL: [.25, .6, .07], wL: [.22, .55, .18], sR: [-.16, .72, 0], eR: [-.25, .64, .1], wR: [-.22, .77, .2] },
  cleric: { w: .52, n: [0, .79, .01], top: [0, .95, .02], hL: [.07, .44, .02], kL: [.09, .25, .09], aL: [.09, .07, .07], hR: [-.06, .44, 0], kR: [-.07, .25, -.02], aR: [-.08, .07, -.03], sL: [.15, .72, 0], eL: [.25, .62, .04], wL: [.28, .68, .16], sR: [-.15, .72, 0], eR: [-.21, .58, .05], wR: [-.2, .46, .15] },
  mage: { w: .52, n: [0, .78, .01], top: [0, .95, .02], hL: [.07, .42, .02], kL: [.07, .24, .06], aL: [.07, .06, .1], hR: [-.07, .42, 0], kR: [-.07, .24, .03], aR: [-.07, .06, .04], sL: [.15, .72, 0], eL: [.24, .6, .06], wL: [.25, .54, .19], sR: [-.15, .72, 0], eR: [-.23, .64, .05], wR: [-.24, .78, .13] },
  thief: { w: .42, n: [.01, .68, .04], top: [.02, .83, .07], hL: [.07, .38, 0], kL: [.17, .22, .07], aL: [.2, .06, .03], hR: [-.07, .38, 0], kR: [-.15, .22, -.02], aR: [-.2, .06, -.06], sL: [.14, .63, .02], eL: [.27, .62, .13], wL: [.38, .635, .24], sR: [-.14, .63, .02], eR: [-.21, .5, .05], wR: [-.18, .41, .15] }
};
// [name, parent, pivot, segment used to sort parts onto it, body?]
function humBones(J) {
  const out = [['pel', null, [0, J.hL[1], 0], [[0, 0, 0], [0, J.w, 0]], 1], ['tor', 'pel', [0, J.w, 0], [[0, J.w, 0], J.n], 1], ['head', 'tor', J.n, [J.n, J.top]]];
  ['L', 'R'].forEach(sd => {
    const a = J['a' + sd];
    out.push(['ua' + sd, 'tor', J['s' + sd], [J['s' + sd], J['e' + sd]]], ['fa' + sd, 'ua' + sd, J['e' + sd], [J['e' + sd], J['w' + sd]]], ['hd' + sd, 'fa' + sd, J['w' + sd], null],
      ['th' + sd, 'pel', J['h' + sd], [J['h' + sd], J['k' + sd]]], ['sh' + sd, 'th' + sd, J['k' + sd], [J['k' + sd], [a[0], 0, a[2] + .03]]]);
  });
  return out;
}
const WARG_BONES = [['body', null, [0, .34, 0], [[0, .36, -.3], [0, .42, .2]], 1], ['head', 'body', [0, .44, .24], [[0, .47, .3], [0, .46, .55]]], ['tail', 'body', [0, .38, -.3], [[0, .39, -.32], [0, .44, -.48]]]];
[['L', 1], ['R', -1]].forEach(([n, sd]) => WARG_BONES.push(
  ['fu' + n, 'body', [sd * .09, .3, .17], [[sd * .09, .3, .17], [sd * .1, .16, .19]]], ['fl' + n, 'fu' + n, [sd * .1, .16, .19], [[sd * .1, .16, .19], [sd * .09, 0, .22]]],
  ['hu' + n, 'body', [sd * .09, .32, -.22], [[sd * .09, .32, -.22], [sd * .11, .18, -.28]]], ['hl' + n, 'hu' + n, [sd * .11, .18, -.28], [[sd * .11, .18, -.28], [sd * .09, 0, -.21]]]));
function segDist(p, a, b) { const ab = tmpS1.subVectors(b, a), t = Math.max(0, Math.min(1, tmpS2.subVectors(p, a).dot(ab) / (ab.lengthSq() || 1))); return tmpS2.copy(a).addScaledVector(ab, t).distanceTo(p); }
const tmpS1 = new V3(), tmpS2 = new V3();
// sort every part of a built figure onto the nearest bone (or the bone its group is tagged with), merge each bone's parts,
// and hang the bones from each other at their pivots
function rigFig(fig, defs) {
  fig.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(fig.matrixWorld).invert();
  const B = defs.map(([name, parent, pv, seg, body]) => ({ name, parent, pv: new V3(...pv), a: seg && new V3(...seg[0]), b: seg && new V3(...seg[1]), body, grp: new THREE.Group() }));
  const by = Object.fromEntries(B.map(b => [b.name, b]));
  const leaves = []; fig.traverse(o => { if (o !== fig && (o.isMesh || o.isSprite)) leaves.push(o); });
  const box = new THREE.Box3(), c = new V3();
  const plan = leaves.map(o => {
    let tag = null; for (let p = o.parent; p && p !== fig; p = p.parent) if (p.userData.bone) { tag = p.userData.bone; break; }
    const m4 = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    let bone = tag && by[tag];
    if (!bone) {
      if (o.isSprite) c.setFromMatrixPosition(m4); else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox).applyMatrix4(m4); box.getCenter(c); }
      let best = 1e9; for (const b of B) { if (!b.a) continue; const d = segDist(c, b.a, b.b) - (b.body ? .03 : 0); if (d < best) { best = d; bone = b; } }
    }
    return [o, m4, bone];
  });
  plan.forEach(([o, m4, bone]) => { o.parent.remove(o); m4.decompose(o.position, o.quaternion, o.scale); bone.grp.add(o); });
  while (fig.children.length) fig.remove(fig.children[0]);
  B.forEach(b => { b.grp.updateMatrixWorld(true); mergeFig(b.grp); });
  if (LP) shadeFig(null, B.flatMap(b => b.grp.children.filter(m => m.isMesh)));
  const bones = {};
  B.forEach(b => {
    b.grp.children.forEach(m => { if (m.isMesh) m.geometry.translate(-b.pv.x, -b.pv.y, -b.pv.z); else m.position.sub(b.pv); });
    const par = b.parent && by[b.parent];
    b.grp.position.copy(b.pv).sub(par ? par.pv : new V3()); (par ? par.grp : fig).add(b.grp); bones[b.name] = b.grp;
  });
  return bones;
}
// kinds dressed as another kind's miniature, at their own size
const LOOK = { brute: 'cutter', witch: 'shaman', matriarch: 'warg' };
const SCALE = { king: 2.3, warg: 1.12, matriarch: 2.15, brute: 1.5, witch: 1.45 };
function buildPiece(kind) {
  const look = LOOK[kind] || kind;
  const piece = new THREE.Group(); piece.rotation.order = 'YXZ';
  // no base: the figure stands on the board itself, on a pivot that leans it a touch toward the viewer
  const stand = new THREE.Group(); piece.add(stand);
  const fig = new THREE.Group(); stand.add(fig);
  const build = { fighter: buildFighter, cleric: buildCleric, mage: buildMage, thief: buildThief, warg: buildWarg }[look];
  const sc = SCALE[kind] || 1.18;
  PMC = new Map(); FIGJ = null;
  let h; try { h = (build ? build(fig) : buildGoblin(fig, look)) * sc; } finally { PMC = null; }
  fig.updateMatrixWorld(true);
  fig.userData.head = fig.worldToLocal(lastHead.getWorldPosition(new V3())); fig.userData.hs = lastHead.userData.s || 1; fig.userData.turn = lastHead.userData.turn || 0;
  const quad = look === 'warg';
  const bones = rigFig(fig, quad ? WARG_BONES : humBones(JOINTS[look] || FIGJ));
  if (ST) fig.scale.set(sc * 1.1, sc * .9, sc * 1.1); else fig.scale.setScalar(sc);
  if (kind !== look) tintFig(fig, { brute: 0x8a8070, witch: 0xb090d8, matriarch: 0x9a9aa0 }[kind]);
  const rig = { bones, fig, type: quad ? 'quad' : 'hum', gob: isFoe(kind) && !quad, base: { c: 'idle', t: rand(0, 3), spd: 1 }, prev: null, act: null, ikDy: 0, ikL: 0, ikR: 0, ikP: 0 };
  if (!quad) { // each ankle as seen from its shin bone, and the leg's length, for planting feet on slopes
    const J = JOINTS[look] || FIGJ, v = a => new V3(...a);
    rig.foot = { L: v(J.aL).sub(v(J.kL)), R: v(J.aR).sub(v(J.kR)) };
    rig.sole = { L: J.aL[1] * .85, R: J.aR[1] * .85 }; // ankle height above the sole
    // the lowest edge of a robe or cape, [radius, height, from angle, to angle] (0 = front): it must clear the ground too
    const H = { fighter: [.3, .15, Math.PI - 1.2, Math.PI + 1.2], cleric: [.22, .05, .6, Math.PI * 2], mage: [.23, .04, 0, Math.PI * 2], thief: [.3, .19, Math.PI - 1.1, Math.PI + 1.1], shaman: [.16, .16, 0, Math.PI * 2], king: [.28, .09, Math.PI - 1.3, Math.PI + 1.3] }[look];
    rig.tilt = ['mage', 'cleric', 'shaman'].includes(look) ? .45 : .15; // robes lean further into a slope, so the hem lies closer to it
    if (H) { rig.hem = []; for (let i = 0; i <= 8; i++) { const a = H[2] + (H[3] - H[2]) * i / 8; rig.hem.push(new V3(Math.sin(a) * H[0], H[1], Math.cos(a) * H[0])); } }
    rig.leg = { L: (v(J.hL).distanceTo(v(J.kL)) + v(J.kL).distanceTo(v(J.aL))) / 2, R: (v(J.hR).distanceTo(v(J.kR)) + v(J.kR).distanceTo(v(J.aR))) / 2 };
  }
  return { piece, fig, stand, h: ST ? h * .95 + .06 : h, rig };
}
// a new kind in an old kind's paint: every material shaded toward one colour
function tintFig(fig, hex) {
  if (!hex) return; const k = new THREE.Color(hex), seen = new Set();
  fig.traverse(o => { if (o.isMesh && o.material && o.material.color && !seen.has(o.material)) { seen.add(o.material); o.material.color.multiply(k); } });
}
// ---------------- animation clips ----------------
// Keyframed clips: each key is [time in s, pose]; a pose gives bones a turn [x, y, z] in radians from the sculpted rest pose,
// and rt moves the whole figure [rise, forward, tip]. Keys ease in and out, so every pose settles before the next.
// (+x bends a leg or arm back and tips the body forward; -x swings a limb forward; +z lifts the left arm out, -z the right.)
const RUN0 = { thL: [-.7], shL: [.15], thR: [.5], shR: [.65], uaL: [.5], uaR: [-.55], faL: [-.3], faR: [-.4], tor: [.18, .12], pel: [0, -.1], rt: [.01] },
  RUN1 = { thL: [-.1], shL: [.25], thR: [-.15], shR: [1.25], uaL: [.1], uaR: [-.1], faL: [-.3], faR: [-.3], tor: [.18], rt: [-.035] };
const mirror = P => { const o = {}; for (const k in P) { const v = P[k], m = k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k; o[m] = m === k ? [v[0], -(v[1] || 0), -(v[2] || 0)] : [v[0], -(v[1] || 0), -(v[2] || 0)]; if (k === 'rt') o.rt = v; } return o; };
const CROUCH = { thL: [-.85], shL: [1.45], thR: [-.85], shR: [1.45], tor: [.45], head: [-.25], uaL: [-.5, 0, .35], uaR: [-.5, 0, -.35], faL: [-.5], faR: [-.5], rt: [-.13] };
const FLOOR_POSE = { tor: [.05], head: [.35, .3], uaL: [-2.5, 0, .5], uaR: [-2.3, 0, -.7], faL: [-.3], faR: [-.4], thL: [-.45], shL: [.8], thR: [-.1], shR: [.25] };
const CLIPS = {
  hum: {
    idle: { d: 2.6, loop: 1, keys: [[0, { tor: [0, .03], head: [0, .06], uaL: [0, 0, .05], uaR: [0, 0, -.05] }], [1.3, { tor: [.05, -.03], head: [.05, -.06], uaL: [-.06, 0, .1], uaR: [-.06, 0, -.1], faL: [-.08], faR: [-.08], thL: [-.03], shL: [.06], rt: [-.008] }], [2.6, { tor: [0, .03], head: [0, .06], uaL: [0, 0, .05], uaR: [0, 0, -.05] }]] },
    gidle: { d: 1.9, loop: 1, keys: [[0, { tor: [.18], head: [-.1, .4], thL: [-.25], shL: [.45], thR: [-.25], shR: [.45], uaL: [-.15, 0, .15], uaR: [-.15, 0, -.15], rt: [-.04] }], [.55, { tor: [.24], head: [0, .35], thL: [-.32], shL: [.58], thR: [-.32], shR: [.58], uaL: [-.25, 0, .2], uaR: [-.25, 0, -.2], rt: [-.055] }], [1.1, { tor: [.18, .1], head: [-.1, -.45], thL: [-.25], shL: [.45], thR: [-.25], shR: [.45], uaL: [-.15, 0, .15], uaR: [-.15, 0, -.15], rt: [-.04] }], [1.5, { tor: [.22, .1], head: [-.05, -.4], thL: [-.3], shL: [.55], thR: [-.3], shR: [.55], uaL: [-.2, 0, .2], uaR: [-.2, 0, -.2], rt: [-.05] }], [1.9, { tor: [.18], head: [-.1, .4], thL: [-.25], shL: [.45], thR: [-.25], shR: [.45], uaL: [-.15, 0, .15], uaR: [-.15, 0, -.15], rt: [-.04] }]] },
    run: { d: .5, loop: 1, keys: [[0, RUN0], [.125, RUN1], [.25, mirror(RUN0)], [.375, mirror(RUN1)], [.5, RUN0]] },
    sneak: { d: 1.6, loop: 1, keys: [[0, { ...CROUCH, tor: [.5, .1], head: [-.35, .2], rt: [-.12] }], [.8, { ...CROUCH, tor: [.55, -.1], head: [-.35, -.2], rt: [-.13] }], [1.6, { ...CROUCH, tor: [.5, .1], head: [-.35, .2], rt: [-.12] }]] },
    // swings: a wind-up, the blow (hit is when it lands, as a share of the clip), and a settle back
    slash: { d: .62, hit: .58, keys: [[0, {}], [.26, { tor: [-.12, -.6], head: [-.1, .3], uaR: [-1.7, 0, -.35], faR: [-.6], hdR: [-.6], uaL: [-.5, 0, .35], faL: [-.4], thL: [-.35], shL: [.35], thR: [.25], shR: [.2], rt: [0, -.07] }], [.36, { tor: [.32, .5], head: [.1, -.2], uaR: [-.45, 0, .15], faR: [-.05], hdR: [1], uaL: [.35, 0, .2], thL: [-.65], shL: [.35], thR: [.4], shR: [.45], rt: [-.05, .16] }], [.62, {}]] },
    stab: { d: .5, hit: .55, keys: [[0, {}], [.17, { tor: [-.1, -.45], uaR: [.55, 0, -.25], faR: [-.9], thL: [-.35], shL: [.45], rt: [-.02, -.06] }], [.27, { tor: [.35, .35], uaR: [-1.45, 0, .1], faR: [.25], hdR: [-.2], uaL: [.4, 0, .3], thL: [-.8], shL: [.35], thR: [.45], shR: [.35], rt: [-.06, .22] }], [.5, {}]] },
    smash: { d: .72, hit: .66, keys: [[0, {}], [.32, { tor: [-.3, -.2], head: [-.2], uaR: [-2.5, 0, -.15], faR: [-.7], hdR: [-.5], uaL: [-1.3, 0, .3], faL: [-.5], thL: [-.2], shL: [.2], rt: [.03, -.05] }], [.47, { tor: [.5, .15], head: [.15], uaR: [-.45], faR: [-.1], hdR: [.7], uaL: [-.3], thL: [-.55], shL: [.45], thR: [.3], shR: [.3], rt: [-.08, .14] }], [.72, {}]] },
    cast: { d: .72, hit: .62, keys: [[0, {}], [.28, { tor: [-.15, -.1], head: [-.2], uaR: [-1, 0, -.25], faR: [-.7], uaL: [-1.2, 0, .45], faL: [-.9], rt: [.03] }], [.44, { tor: [.22, .05], head: [.05], uaR: [-1.55, 0, .05], faR: [.1], uaL: [-1.55, 0, .1], faL: [-.1], thL: [-.35], shL: [.2], rt: [0, .07] }], [.72, {}]] },
    shoot: { d: .8, hit: .7, keys: [[0, {}], [.22, { tor: [0, .35], head: [-.05, -.3], uaL: [-1.45], faL: [0], uaR: [-1.25, 0, .35], faR: [-1.7] }], [.5, { tor: [-.05, .45], head: [-.05, -.4], uaL: [-1.5], faL: [0], uaR: [-1, 0, .6], faR: [-2] }], [.56, { tor: [0, .4], head: [-.05, -.35], uaL: [-1.45], uaR: [-.5, 0, -.45], faR: [-.3], rt: [0, -.04] }], [.8, {}]] },
    roar: { d: .95, hit: .35, keys: [[0, {}], [.28, { tor: [-.35], head: [-.45], uaL: [-.4, 0, 1.1], uaR: [-.4, 0, -1.1], faL: [-.7], faR: [-.7], thL: [-.2], thR: [.15], rt: [.02] }], [.7, { tor: [-.3], head: [-.4], uaL: [-.5, 0, 1.15], uaR: [-.5, 0, -1.15], faL: [-.8], faR: [-.8], thL: [-.2], thR: [.15], rt: [.02] }], [.95, {}]] },
    hit: { d: .42, keys: [[0, {}], [.07, { tor: [-.4, .15], head: [-.4, -.1], uaL: [.35, 0, .5], uaR: [.35, 0, -.5], faL: [-.4], faR: [-.4], thL: [.2], shL: [.35], thR: [-.1], rt: [-.02, -.09, -.12] }], [.42, {}]] },
    die: { d: .9, keys: [[0, {}], [.18, { tor: [-.4], head: [-.45], uaL: [-.5, 0, .9], uaR: [-.5, 0, -.9], thL: [-.4], shL: [.7], rt: [0, -.05] }], [.9, FLOOR_POSE]] },
    down: { d: .35, keys: [[0, {}], [.35, FLOOR_POSE]] },
    jump: { d: .22, keys: [[0, {}], [.22, { thL: [-1], shL: [1.4], thR: [-.4], shR: [1], uaL: [-.9, 0, .6], uaR: [-.9, 0, -.6], faL: [-.4], faR: [-.4], tor: [.25] }]] },
    land: { d: .4, keys: [[0, CROUCH], [.4, {}]] },
    cheer: { d: 1, keys: [[0, {}], [.3, { tor: [-.15], head: [-.3], uaR: [-2.8, 0, -.2], faR: [-.2], uaL: [-.2, 0, .5], rt: [.06] }], [.6, { tor: [-.1], head: [-.25], uaR: [-2.7, 0, -.25], uaL: [-.2, 0, .5], rt: [0] }], [1, {}]] }
  },
  quad: {
    idle: { d: 2, loop: 1, keys: [[0, { head: [.05, -.12], tail: [0, .45], rt: [0] }], [.5, { head: [0, -.05], tail: [0, -.45], body: [-.03], rt: [.01] }], [1, { head: [-.05, .12], tail: [0, .45], rt: [0] }], [1.5, { head: [0, .05], tail: [0, -.45], body: [-.03], rt: [.01] }], [2, { head: [.05, -.12], tail: [0, .45], rt: [0] }]] },
    run: { d: .42, loop: 1, keys: [[0, { fuL: [-.75], fuR: [-.5], flL: [-.1], flR: [-.2], huL: [.55], huR: [.7], hlL: [-.35], hlR: [-.3], body: [-.12], head: [.15], tail: [-.3], rt: [.04] }], [.21, { fuL: [.55], fuR: [.65], flL: [-.75], flR: [-.7], huL: [-.55], huR: [-.45], hlL: [.45], hlR: [.4], body: [.12], head: [-.12], tail: [.2], rt: [-.02] }], [.42, { fuL: [-.75], fuR: [-.5], flL: [-.1], flR: [-.2], huL: [.55], huR: [.7], hlL: [-.35], hlR: [-.3], body: [-.12], head: [.15], tail: [-.3], rt: [.04] }]] },
    bite: { d: .55, hit: .62, keys: [[0, {}], [.22, { body: [-.18], head: [-.55], fuL: [-.3], fuR: [-.3], huL: [.25], huR: [.25], rt: [-.02, -.1] }], [.34, { body: [.2], head: [.5], fuL: [-.7], fuR: [-.6], huL: [-.3], huR: [-.3], rt: [-.02, .3] }], [.55, {}]] },
    howl: { d: 1, hit: .3, keys: [[0, {}], [.3, { head: [-.95], body: [-.28], tail: [-.5], fuL: [-.3], fuR: [-.3] }], [.8, { head: [-1], body: [-.3], tail: [-.55], fuL: [-.3], fuR: [-.3] }], [1, {}]] },
    hit: { d: .42, keys: [[0, {}], [.07, { body: [-.2, .2], head: [-.45, -.2], tail: [.4], rt: [0, -.09] }], [.42, {}]] },
    die: { d: .9, keys: [[0, {}], [.2, { body: [-.25], head: [-.6] }], [.9, { head: [.4, .3], tail: [.3], fuL: [-.5, 0, .3], fuR: [-.3], huL: [.5, 0, .3], huR: [.3] }]] },
    jump: { d: .22, keys: [[0, {}], [.22, { fuL: [-.9], fuR: [-.9], flL: [-.5], flR: [-.5], huL: [.9], huR: [.9], body: [-.2], tail: [.3] }]] },
    land: { d: .4, keys: [[0, { fuL: [.3], fuR: [.3], flL: [-.6], flR: [-.6], huL: [-.3], huR: [-.3], hlL: [.4], hlR: [.4], rt: [-.06] }], [.4, {}]] }
  }
};
const QUAD_MAP = { slash: 'bite', stab: 'bite', smash: 'bite', shoot: 'bite', cast: 'howl', roar: 'howl', sneak: 'idle', down: 'die', cheer: 'howl', gidle: 'idle' };
function clipOf(R, name) { const set = CLIPS[R.type]; return set[name] || set[QUAD_MAP[name]] || set.idle; }
// sample a clip into a pose: the two keys around t, eased between
function sampleClip(cl, t, out) {
  const K = cl.keys; if (cl.loop) t = ((t % cl.d) + cl.d) % cl.d; else t = Math.min(t, cl.d);
  let i = 1; while (i < K.length - 1 && K[i][0] < t) i++;
  const [t0, a] = K[i - 1], [t1, b] = K[i], s0 = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1))), s = s0 * s0 * (3 - 2 * s0);
  for (const k in out) out[k][0] = out[k][1] = out[k][2] = 0;
  const put = (P, w) => { for (const k in P) { const v = P[k], o = out[k] || (out[k] = [0, 0, 0]); o[0] += (v[0] || 0) * w; o[1] += (v[1] || 0) * w; o[2] += (v[2] || 0) * w; } };
  put(a, 1 - s); put(b, s); return out;
}
function mixPose(A, B, w) { for (const k in B) { const a = A[k] || (A[k] = [0, 0, 0]), b = B[k]; a[0] += (b[0] - a[0]) * w; a[1] += (b[1] - a[1]) * w; a[2] += (b[2] - a[2]) * w; } for (const k in A) if (!B[k]) { const a = A[k]; a[0] *= 1 - w; a[1] *= 1 - w; a[2] *= 1 - w; } return A; }
// the looping layer under everything: idle, run, sneak
function setBase(u, name, spd = 1) {
  const R = u.rig; if (!R) return;
  if (R.base.c === name) { R.base.spd = spd; return; }
  R.prev = { c: R.base.c, t: R.base.t, spd: R.base.spd, w: 1 }; R.base = { c: name, t: 0, spd };
}
const restBase = u => u.rig && (u.rig.gob && u.rig.type === 'hum' ? 'gidle' : 'idle');
// play a one-shot clip over the base; resolves when its blow lands (or when it ends). hold keeps the last pose until released
function playClip(u, name, o = {}) {
  const R = u.rig; if (!R) return Promise.resolve();
  const cl = clipOf(R, name), spd = o.spd || 1;
  R.act = { c: name, t: 0, spd, hold: !!o.hold, w: R.act && !R.act.out ? R.act.w : 0, out: false };
  return wait(cl.d * (o.atEnd ? 1 : cl.hit || 1) * 1000 / spd);
}
function releaseClip(u) { if (u.rig && u.rig.act) u.rig.act.out = true; }
function resetRig(u) { if (!u.rig) return; u.rig.act = null; u.rig.prev = null; u.rig.base = { c: restBase(u), t: rand(0, 2), spd: 1 }; }
const qTmp = new THREE.Quaternion(), eTmp = new THREE.Euler();
// ---------------- standing on slopes ----------------
const fitQ = new THREE.Quaternion(), fitQ2 = new THREE.Quaternion(), fitN = new V3(), fitV = new V3(), FLAT = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -Math.PI / 2), X_AXIS = new V3(1, 0, 0);
function slopeNormal(x, z, out) { if (!SLOPE) return out.copy(UP); const e = .12; return out.set(slopeY(x - e, z) - slopeY(x + e, z), 2 * e, slopeY(x, z - e) - slopeY(x, z + e)).normalize(); }
// ground-flat marks (ring, shadow, reticle) tilt to the slope under them; spin turns them about their own axis
function lieFlat(o, x, z, spin = 0) { slopeNormal(x, z, fitN); fitQ.setFromUnitVectors(UP, fitN); o.quaternion.copy(fitQ).multiply(FLAT).multiply(fitQ2.setFromAxisAngle(UP.clone().set(0, 0, 1), spin)); }
// Plant the figure on the ground under its feet, not just under its middle: the body drops to the downhill foot and the
// uphill knee bends; a warg tips its body along the slope; a body lying down lies along it
function groundFit(u, dt) {
  const R = u.rig, rp = u.root.position, onSlope = !!SLOPE && !u.l, lying = onSlope && (u.st.prone || !u.alive), k = Math.min(1, dt * 14);
  if (lying) fitQ.setFromUnitVectors(UP, slopeNormal(rp.x, rp.z, fitN));
  else if (onSlope && u.alive && R && R.tilt) fitQ.setFromUnitVectors(UP, slopeNormal(rp.x, rp.z, fitN)).slerp(qTmp.identity(), 1 - R.tilt);
  else fitQ.identity();
  u.root.quaternion.slerp(fitQ, Math.min(1, dt * 10));
  // the shadow lies on the ground whatever the root does
  slopeNormal(rp.x, rp.z, fitN); fitQ2.setFromUnitVectors(UP, fitN); u.blob.quaternion.copy(u.root.quaternion).invert().multiply(fitQ2).multiply(FLAT);
  if (!R) return;
  let dy = 0, tL = 0, tR = 0, tP = 0;
  const g0 = onSlope ? floorY(rp.x, rp.z) : 0;
  if (onSlope && !lying && u.alive && Math.abs(rp.y - g0) < .08 && u.piece.position.y < .02) {
    u.root.updateMatrixWorld(true);
    if (R.type === 'hum') {
      const off = ['L', 'R'].map(sd => { fitV.copy(R.foot[sd]); R.bones['sh' + sd].localToWorld(fitV); return floorY(fitV.x, fitV.z) - g0; });
      dy = Math.min(off[0], off[1]); tL = off[0] - dy; tR = off[1] - dy;
    } else {
      const f = R.fig.localToWorld(fitV.set(0, 0, .21)), gf = floorY(f.x, f.z) - g0, b = R.fig.localToWorld(fitV.set(0, 0, -.22)), gb = floorY(b.x, b.z) - g0;
      dy = Math.min(gf, gb) * .6 + Math.max(gf, gb) * .4; tP = Math.atan2(gb - gf, .43 * R.fig.scale.z);
    }
  }
  R.ikDy += (dy - R.ikDy) * k; R.ikL += (tL - R.ikL) * k; R.ikR += (tR - R.ikR) * k; R.ikP += (tP - R.ikP) * k;
  R.fig.position.y += R.ikDy; R.fig.rotation.x += R.ikP;
  if (R.type === 'hum') ['L', 'R'].forEach(sd => {
    const d = sd === 'L' ? R.ikL : R.ikR; if (d < .004) return;
    const l = R.leg[sd] * R.fig.scale.y, a = Math.min(1.1, Math.acos(Math.max(-1, 1 - d / (2 * l))));
    R.bones['th' + sd].quaternion.multiply(qTmp.setFromAxisAngle(X_AXIS, -a)); R.bones['sh' + sd].quaternion.multiply(qTmp.setFromAxisAngle(X_AXIS, 2 * a));
  });
  // whatever the bend could not take up (a wide stance across a steep slope), lift the body by, so no sole sinks into the ground
  if (R.type === 'hum' && onSlope && !lying && u.alive && Math.abs(rp.y - g0) < .08) {
    u.root.updateMatrixWorld(true); let lift = 0;
    for (const sd of ['L', 'R']) { fitV.copy(R.foot[sd]); R.bones['sh' + sd].localToWorld(fitV); lift = Math.max(lift, floorY(fitV.x, fitV.z) - (fitV.y - R.sole[sd] * R.fig.scale.y)); }
    if (R.hem) for (const h of R.hem) { fitV.copy(h); R.bones.pel.parent.localToWorld(fitV); lift = Math.max(lift, floorY(fitV.x, fitV.z) + .01 - fitV.y); }
    R.fig.position.y += lift;
  }
}
function rigTick(u, dt) {
  const R = u.rig; if (!R) return;
  const run = u.st.frozen ? 0 : dt;
  R.base.t += run * R.base.spd;
  const P = sampleClip(clipOf(R, R.base.c), R.base.t, R.P || (R.P = {}));
  if (R.prev) { R.prev.t += run * R.prev.spd; R.prev.w -= run / .18; if (R.prev.w <= 0) R.prev = null; else mixPose(P, sampleClip(clipOf(R, R.prev.c), R.prev.t, R.Q || (R.Q = {})), R.prev.w); }
  const A = R.act;
  if (A) {
    const cl = clipOf(R, A.c); A.t += run * A.spd;
    if (!A.hold && A.t >= cl.d) A.out = true;
    if (A.out) { A.w -= run / .16; if (A.w <= 0) R.act = null; } else A.w = Math.min(1, A.w + run / .06);
    if (R.act) mixPose(P, sampleClip(cl, A.t, R.Z || (R.Z = {})), Math.max(0, A.w));
  }
  for (const k in R.bones) { const v = P[k]; const b = R.bones[k]; if (v) { eTmp.set(v[0], v[1], v[2]); b.quaternion.setFromEuler(eTmp); } else b.quaternion.identity(); }
  const rt = P.rt || [0, 0, 0]; R.fig.position.y = rt[0]; R.fig.position.z = rt[1]; R.fig.rotation.x = rt[2];
}
// portraits: render each miniature once into small images for badges, tokens and the character sheet
const PORTRAIT = {};
function makePortraits() {
  try {
    const ps = new THREE.Scene(); ps.environment = scene.environment;
    ps.add(new THREE.HemisphereLight(0xffffff, 0x404050, .45));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.05); key.position.set(1.5, 2.2, 3); ps.add(key);
    const back = new THREE.DirectionalLight(0x8ab0ff, .8); back.position.set(-2, 1.5, -2.5); ps.add(back);
    const cam = new THREE.PerspectiveCamera(28, 1, .05, 20);
    const prevC = renderer.getClearColor(new THREE.Color()).getHex(), prevA = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    const shot = (w, h, pos, look) => {
      const rt = new THREE.WebGLRenderTarget(w * 2, h * 2); rt.texture.encoding = THREE.sRGBEncoding;
      cam.aspect = w / h; cam.position.copy(pos); cam.lookAt(look); cam.updateProjectionMatrix();
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(ps, cam);
      const W = w * 2, H = h * 2, buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      cx.putImageData(img, 0, 0); rt.dispose(); return cv.toDataURL();
    };
    for (const kind of Object.keys(GC.UNITS)) {
      const { piece, fig, h } = buildPiece(kind); ps.add(piece); piece.rotation.y = .3; piece.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(fig), c = box.getCenter(new V3()), size = box.getSize(new V3());
      const ft = .3 + fig.userData.turn * .8, hw = fig.localToWorld(fig.userData.head.clone()), dir = V(Math.sin(ft), .12, Math.cos(ft)).normalize();
      const fd = .36 * fig.scale.x * fig.userData.hs;
      PORTRAIT[kind] = {
        face: shot(64, 64, hw.clone().addScaledVector(dir, fd), hw.clone().add(V(0, -.012 * fig.scale.x, 0))),
        body: shot(110, 140, V(.25, c.y + .1, Math.max(size.y, size.x) * 2.3 + .3), V(0, c.y, 0))
      };
      ps.remove(piece);
    }
    renderer.setRenderTarget(null); renderer.setClearColor(prevC, prevA);
  } catch (e) { renderer.setRenderTarget(null); }
}
const face = k => PORTRAIT[k] ? `<img alt="" src="${PORTRAIT[k].face}">` : ICONS[k];

