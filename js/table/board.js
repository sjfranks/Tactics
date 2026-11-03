'use strict';
// GOBLIN CRYPT · THE TABLE · the diorama: ground, walls, props, cell highlights and the path arrow
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
// ---------------- environment: a battle map come to life ----------------
// Each battle is a diorama of one place. The painted ground runs on across the squares (the grid is a faint overlay,
// like lines on a battle mat), raised ground and walls are solid modelled pieces, and dressing fills the edges.
const ENV = []; // [material, low-poly colour] pairs, restyled when the art style changes
function envMat(m, low) { ENV.push([m, low, { map: m.map, bumpMap: m.bumpMap, color: m.color.getHex(), rough: m.roughness }]); return m; }
// draw at (x, y) and at its wrapped copies, so a texture tiles without seams
function wrap9(w, h, x, y, f) { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) f(x + dx, y + dy); }
const grassTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#2b3220'; g.fillRect(0, 0, w, h);
  const cols = ['#353b25', '#262c1b', '#3b3a26', '#20251a', '#46402c']; // dead, trampled grass
  for (let i = 0; i < 70; i++) { const x = rand(0, w), y = rand(0, h), rx = rand(20, 70), ry = rand(14, 50), a = rand(0, 3); g.fillStyle = cols[i % cols.length]; g.globalAlpha = rand(.2, .5); wrap9(w, h, x, y, (X, Y) => { g.beginPath(); g.ellipse(X, Y, rx, ry, a, 0, 7); g.fill(); }); }
  g.globalAlpha = 1;
  for (let i = 0; i < 6000; i++) { g.strokeStyle = cols[Math.random() * 4 | 0]; g.lineWidth = 1.2; const x = rand(4, w - 4), y = rand(8, h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-2, 2), y - rand(3, 6)); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = rand(0, w), y = rand(0, h), r = rand(2, 5), v = 110 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; wrap9(w, h, x, y, (X, Y) => { g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); }); }
});
// flagstones laid in running courses that ignore the grid, so the floor reads as a floor and not as a board
function flagTexture(base, rowH, minW, maxW, moss) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2e2518'; g.fillRect(0, 0, w, h);
    const bc = new THREE.Color(base);
    for (let y = 0; y < h; y += rowH) {
      const ws = []; let xs = 0;
      while (w - xs > maxW) { const sw = rand(minW, maxW); ws.push(sw); xs += sw; }
      if (w - xs < minW * .6 && ws.length) ws[ws.length - 1] += w - xs; else ws.push(w - xs);
      let x = rand(0, w);
      for (const sw of ws) {
        const c = '#' + bc.clone().offsetHSL(0, rand(-.02, .02), rand(-.05, .05)).getHexString();
        wrap9(w, 0, x, y, X => {
          g.fillStyle = c; g.fillRect(X + 2, y + 2, sw - 4, rowH - 4);
          g.fillStyle = 'rgba(255,240,215,.13)'; g.fillRect(X + 2, y + 2, sw - 4, 2);
          g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(X + 2, y + rowH - 4, sw - 4, 2);
        });
        x += sw;
      }
    }
    speckle(g, w, h, 1500, .08, 4); crack(g, w, h, 5, .35);
    if (moss) for (let i = 0; i < 14; i++) { const x = rand(0, w), y = rand(0, h), r = rand(8, 22); g.fillStyle = `rgba(80,100,50,${rand(.12, .25)})`; wrap9(w, h, x, y, (X, Y) => { g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); }); }
  });
}
// broken basalt: irregular plates with dark gaps, and an ember glow in the cracks
function basaltTexture(base, glow) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0e0b0a'; g.fillRect(0, 0, w, h);
    const bc = new THREE.Color(base);
    for (let i = 0; i < 90; i++) {
      const x = rand(0, w), y = rand(0, h), r = rand(26, 46), n = 6, pts = [];
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rand(-.2, .2), rr = r * rand(.75, 1); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      g.fillStyle = '#' + bc.clone().offsetHSL(0, 0, rand(-.04, .04)).getHexString();
      wrap9(w, h, x, y, (X, Y) => { g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(X + px, Y + py) : g.moveTo(X + px, Y + py)); g.closePath(); g.fill(); });
    }
    speckle(g, w, h, 1200, .1, 3);
    g.strokeStyle = `rgba(255,110,30,${glow})`; g.lineWidth = 2; crack(g, w, h, 0); for (let k = 0; k < 7; k++) { let x = rand(0, w), y = rand(0, h); g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += rand(-26, 26); y += rand(-26, 26); g.lineTo(x, y); } g.stroke(); }
  });
}
// cliff faces: earth and rock in level bands
const earthTex = canvasTex(256, 256, (g, w, h) => {
  let y = 0; const cols = ['#3a2c20', '#45362a', '#30241a', '#4c3e32', '#3a352f'];
  while (y < h) { const bh = rand(14, 40); g.fillStyle = cols[Math.random() * cols.length | 0]; g.fillRect(0, y, w, bh + 1); y += bh; }
  for (let i = 0; i < 60; i++) { const v = 90 + Math.random() * 50 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; const x = rand(0, w), yy = rand(0, h), r = rand(3, 9); wrap9(w, h, x, yy, (X, Y) => { g.beginPath(); g.ellipse(X, Y, r * 1.4, r, 0, 0, 7); g.fill(); }); }
  speckle(g, w, h, 600, .12, 2);
});
const lavaTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#c8400c'; g.fillRect(0, 0, w, h);
  [['#ff8a20', .7, 40], ['#ffb030', .6, 26], ['#ffd860', .5, 12], ['#4a1a0a', .45, 18]].forEach(([c, a, n]) => { for (let i = 0; i < n; i++) { const x = rand(0, w), y = rand(0, h), rx = rand(8, 34), ry = rand(5, 18), r = rand(0, 3); g.fillStyle = c; g.globalAlpha = rand(a * .5, a); wrap9(w, h, x, y, (X, Y) => { g.beginPath(); g.ellipse(X, Y, rx, ry, r, 0, 7); g.fill(); }); } });
  g.globalAlpha = 1;
});
const ventTex = canvasTex(128, 128, g => {
  g.fillStyle = '#1e1714'; g.fillRect(0, 0, 128, 128); speckle(g, 128, 128, 300, .12, 3);
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 46); gr.addColorStop(0, 'rgba(255,190,80,.95)'); gr.addColorStop(.4, 'rgba(255,90,20,.6)'); gr.addColorStop(1, 'rgba(255,60,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,120,30,.8)'; g.lineWidth = 2.5; for (let k = 0; k < 7; k++) { let x = 64, y = 64; const a = k / 7 * Math.PI * 2; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 4; i++) { x += Math.cos(a + rand(-.5, .5)) * 13; y += Math.sin(a + rand(-.5, .5)) * 13; g.lineTo(x, y); } g.stroke(); }
});
const carpetTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#6e1620'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#8a2028'; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(w / 2, y + 8); g.lineTo(w - 30, y + 32); g.lineTo(w / 2, y + 56); g.lineTo(30, y + 32); g.fill(); }
  g.fillStyle = '#c9a24a'; g.fillRect(8, 0, 7, h); g.fillRect(w - 15, 0, 7, h);
  speckle(g, w, h, 500, .06, 2);
});
const bannerTex = canvasTex(64, 128, (g, w, h) => {
  g.fillStyle = '#6e1620'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a24a'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
  g.beginPath(); g.moveTo(14, 56); g.lineTo(20, 38); g.lineTo(27, 50); g.lineTo(32, 32); g.lineTo(37, 50); g.lineTo(44, 38); g.lineTo(50, 56); g.closePath(); g.fill();
  g.fillStyle = '#6e1620'; g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, h - 18); g.lineTo(w, h); g.fill();
});
const gridTex = canvasTex(128, 128, g => { g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128); }, false);
// keep walls: coursed stone with a row of arched windows at first-storey height (textured by world position)
const keepTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#2a231b'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) { const off = (y / 32) % 2 ? 32 : 0; for (let x = -64; x < w; x += 64) { const v = 82 + Math.random() * 22 | 0; g.fillStyle = `rgb(${v + 8},${v + 2},${v - 8})`; g.fillRect(x + off + 3, y + 3, 58, 26); g.fillStyle = 'rgba(255,240,215,.12)'; g.fillRect(x + off + 3, y + 3, 58, 2); } }
  [64, 192].forEach(x => { g.fillStyle = '#c9a24a'; g.fillRect(x - 17, 132, 34, 52); g.beginPath(); g.arc(x, 132, 17, Math.PI, 0); g.fill(); g.fillStyle = '#140e0a'; g.fillRect(x - 13, 134, 26, 48); g.beginPath(); g.arc(x, 134, 13, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,170,80,.35)'; g.fillRect(x - 11, 160, 22, 20); });
  speckle(g, w, h, 500, .1, 2);
});
// floorboards: long planks in staggered rows, nail heads at the joints
const plankTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a2614'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) { const off = (y / 32 * 97) % 160; for (let x = -off; x < w; x += 160) {
    const v = 92 + Math.random() * 30 | 0; g.fillStyle = `rgb(${v + 22},${v - 4},${v - 40})`; g.fillRect(x + 2, y + 2, 156, 28);
    for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(${Math.random() > .5 ? '40,20,8' : '170,120,70'},.25)`; g.lineWidth = 1; const yy = y + 4 + Math.random() * 24; g.beginPath(); g.moveTo(x + 2, yy); g.bezierCurveTo(x + 50, yy + rand(-3, 3), x + 110, yy + rand(-3, 3), x + 158, yy); g.stroke(); }
    g.fillStyle = 'rgba(20,12,6,.8)'; [[x + 8, y + 9], [x + 8, y + 23], [x + 150, y + 9], [x + 150, y + 23]].forEach(([a, b]) => g.fillRect(a, b, 2, 2));
  } }
  speckle(g, w, h, 300, .08, 2);
});
const flagTex = flagTexture('#5c574d', 64, 56, 150, true), hallTex = flagTexture('#666056', 128, 128, 256, false), basaltTex = basaltTexture('#4a4440', .3), basaltDark = basaltTexture('#26201c', .45);
[plankTex, keepTex, grassTex, earthTex, lavaTex, carpetTex, flagTex, hallTex, basaltTex, basaltDark].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });

const groundMat = new THREE.MeshStandardMaterial({ roughness: .94, envMapIntensity: .35 });
// the ground is a frame round the board (the board's own squares cover the middle), so ravines can drop below it
let GORGE = []; // z of each gorge row that runs off the side of the board
function buildGround(parent, hx, hz) {
  const bands = [], sides = [[-40, -hx], [hx, 40]];
  sides.forEach(([x0, x1]) => { let z = -hz; for (const zc of GORGE) { bands.push([x0, x1, z, zc - .5]); z = zc + .5; } bands.push([x0, x1, z, hz]); });
  [[-40, 40, -40, -hz], [-40, 40, hz, 40], ...bands.filter(b => b[3] - b[2] > .01)].forEach(([x0, x1, z0, z1]) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + (x0 + x1) / 2) / 6, (p.getY(i) - (z0 + z1) / 2) / 6);
    const m = new THREE.Mesh(g, groundMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.receiveShadow = true; parent.add(m);
  });
}
const floorMat = new THREE.MeshStandardMaterial({ roughness: .9, envMapIntensity: .4 });
const floorMats = [.84, .95, 1.05, 1.14].map(v => { const m = floorMat.clone(); m.color.setScalar(v); return m; }); // by height step
// the side columns' hidden tops sit a hair under each square's top: pull the tops, grid and highlights toward the camera so phones don't flicker
const pullForward = (m, f, u) => Object.assign(m, { polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: u });
floorMats.forEach(m => pullForward(m, -1, -2));
const keepFloorMats = [.84, .95, 1.05, 1.14].map(v => { const m = new THREE.MeshStandardMaterial({ roughness: .88, envMapIntensity: .4 }); m.color.setScalar(v); return m; });
keepFloorMats.forEach(m => pullForward(m, -1, -2));
const cliffMat = new THREE.MeshStandardMaterial({ roughness: .92, envMapIntensity: .35 });
const trimMat = new THREE.MeshStandardMaterial({ map: stoneTex('#4f483c'), roughness: .9, envMapIntensity: .4 });
const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: .9, envMapIntensity: .35 });
const wallTopMat = new THREE.MeshStandardMaterial({ map: stoneTex('#2c2620'), roughness: .95, envMapIntensity: .25 }); // seen from above, walls are dark
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex('#6a6270'), roughness: .88, envMapIntensity: .4 });
const ironMat = new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: .38, metalness: .85 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9a640, roughness: .28, metalness: .9 });
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .78 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: .65 });
const waxMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: .6 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
const sRGB = c => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: .92 }); m.color.convertSRGBToLinear(); return m; };
const rockMat = sRGB(0x3f3b36), basaltColMat = sRGB(0x2c2724), trunkMat = sRGB(0x2e2219), leafMats = [sRGB(0x1f2a1a), sRGB(0x26301e), sRGB(0x2e3522)];
const lavaMat = new THREE.MeshStandardMaterial({ map: lavaTex, emissive: 0xffffff, emissiveMap: lavaTex, emissiveIntensity: .95, roughness: .6 });
const ventMat = new THREE.MeshStandardMaterial({ map: ventTex, emissive: 0xffffff, emissiveMap: ventTex, emissiveIntensity: .8, roughness: .8 });
const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: .95 });
const keepSideMat = new THREE.MeshStandardMaterial({ map: keepTex, roughness: .9, envMapIntensity: .35 });
// the upper floor has its own paints, so it can turn see-through when we look at the hall beneath
const deckMats = [new THREE.MeshStandardMaterial({ roughness: .88, envMapIntensity: .4 }), new THREE.MeshStandardMaterial({ map: keepTex, roughness: .9 }), new THREE.MeshBasicMaterial({ map: gridTex, color: 0x140f0a, transparent: true, opacity: .2, depthWrite: false }), new THREE.MeshStandardMaterial({ roughness: .9 })];
deckMats[0].color.setScalar(1.12); deckMats[2].opacity = .2;
let deckGrp = null, wallsTall = null, wallsCut = null, topsGrp = null;
const cutCapMat = new THREE.MeshStandardMaterial({ color: 0x15110d, roughness: 1 }); // the dark cap on a cut-down wall
const CUTH = .55; // cut-down wall height in the ground-floor view
const ravineMat = new THREE.MeshStandardMaterial({ map: basaltDark, color: 0x5a5a5a, roughness: .95 });
const ropeMat = sRGB(0x8a7048), plankMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .8 });
const mistMat = new THREE.SpriteMaterial({ map: smokeTex, color: 0xc8ccd0, opacity: .3, transparent: true, depthWrite: false });
const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: .9, side: THREE.DoubleSide });
const gridMat = pullForward(new THREE.MeshBasicMaterial({ map: gridTex, color: 0x140f0a, transparent: true, opacity: .2, depthWrite: false }), -2, -4);
function mesh(geo, mat, x, y, z, parent = scene, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }

const fires = [], candles = [];
function skull(x, y, z, parent = scene, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); g.rotation.y = rand(-.8, .8); parent.add(g);
  mesh(new THREE.SphereGeometry(.11, 14, 12), boneMat, 0, .03, 0, g); mesh(new THREE.BoxGeometry(.13, .06, .1), boneMat, 0, -.05, .03, g);
  mesh(new THREE.SphereGeometry(.028, 6, 6), eyeMat, -.04, .04, .09, g, false); mesh(new THREE.SphereGeometry(.028, 6, 6), eyeMat, .04, .04, .09, g, false);
  return g;
}
// trees in the model-railway manner: stacked cones or rounded foam canopies on a short trunk
function pine(parent, x, y, z, s = 1) {
  mesh(new THREE.CylinderGeometry(.06 * s, .09 * s, .4 * s, 7), trunkMat, x, y + .2 * s, z, parent);
  [[.44, .6, .55], [.34, .52, .9], [.22, .44, 1.2]].forEach(([r, h, yy], i) => mesh(new THREE.ConeGeometry(r * s, h * s, 9), leafMats[i], x, y + yy * s, z, parent));
}
function oak(parent, x, y, z, s = 1) {
  mesh(new THREE.CylinderGeometry(.07 * s, .1 * s, .6 * s, 7), trunkMat, x, y + .3 * s, z, parent);
  mesh(new THREE.IcosahedronGeometry(.48 * s, 1), leafMats[1], x, y + .95 * s, z, parent);
  mesh(new THREE.IcosahedronGeometry(.32 * s, 1), leafMats[2], x + .3 * s, y + .82 * s, z + .15 * s, parent);
  mesh(new THREE.IcosahedronGeometry(.3 * s, 1), leafMats[0], x - .26 * s, y + .86 * s, z - .12 * s, parent);
}
// four warm lights, handed out each battle to torches, braziers, campfires or lava
const torchLights = [0, 1, 2, 3].map(i => { const L = new THREE.PointLight(0xffa64a, 0, 7.5, 2); scene.add(L); flickers.push({ L, base: 0, seed: i * 2.3 }); return L; });
let nextLight = 0;
function takeLight(color, base) { const L = torchLights[nextLight++]; if (!L) return null; L.color.setHex(color); flickers.find(f => f.L === L).base = base; return L; }

envMat(trimMat, 0x6e5434); envMat(stoneMat, 0x8a847a); envMat(ironMat, 0x44444c); envMat(goldMat, 0xd8a830); envMat(woodMat, 0x8a5a2c); envMat(boneMat, 0xd8ccb2); envMat(brickMat, 0x6a6052); envMat(wallTopMat, 0x3a332b);
function applyEnvStyle() {
  if (!LOWENV) return; // scenery keeps its painted textures in every mini style
  for (const [m, low, orig] of ENV) { m.map = null; m.bumpMap = null; m.color.setHex(low).convertSRGBToLinear(); m.roughness = Math.max(.55, orig.rough); m.flatShading = true; m.needsUpdate = true; }
}

// ---------------- the board for each battle ----------------
// a map is rows of characters: '.' ground, '1'–'3' ground raised that many steps, '#' wall or rock, '~' lava, '^' fire vent
const THEMES = {
  outdoor: { ground: grassTex, tint: 0x8a8a82, floor: grassTex, cliff: earthTex, wall: 'rock', grid: .2, hemi: .62 },
  crypt: { ground: floorTex, tint: 0xffffff, floor: flagTex, cliff: brickTex, wall: 'brick', grid: .24, hemi: .34 },
  lava: { ground: basaltDark, tint: 0xffffff, floor: basaltTex, cliff: basaltDark, wall: 'basalt', grid: .2, hemi: .3 },
  throne: { ground: floorTex, tint: 0xffffff, floor: hallTex, cliff: brickTex, wall: 'brick', grid: .16, hemi: .36 },
  house: { ground: grassTex, tint: 0x7a7a70, floor: plankTex, cliff: brickTex, wall: 'brick', grid: .2, hemi: .42 }
};
let THEME = THEMES.crypt;
const boardGrp = new THREE.Group(); scene.add(boardGrp);
const WALLH = .78, unitBox = new THREE.BoxGeometry(1, 1, 1), quadGeo = new THREE.PlaneGeometry(1, 1);
function disposeGroup(g) { g.traverse(o => { if (o.isMesh && o.geometry !== unitBox && o.geometry !== quadGeo) o.geometry.dispose(); }); while (g.children.length) g.remove(g.children[0]); }
function block(parent, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(unitBox, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; }
function quad(parent, mat, x, y, z) { const m = new THREE.Mesh(quadGeo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); parent.add(m); return m; }
// texture merged pieces by world position, so ground and cliffs run on unbroken across squares
function worldUV(group, kTop, kSide) {
  group.children.forEach(m => {
    if (!m.isMesh) return;
    const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
      if (ay > .5) uv.setXY(i, x * kTop, -z * kTop); else if (ax > .5) uv.setXY(i, z * kSide, y * kSide); else uv.setXY(i, x * kSide, y * kSide);
    }
    uv.needsUpdate = true;
  });
}
function torch(parent, x, z, y, light) { // an iron bowl of fire on a pillar top
  mesh(new THREE.CylinderGeometry(.17, .1, .14, 10), ironMat, x, y + .07, z, parent);
  const gl = glowSprite(0xffa040, .8); gl.position.set(x, y + .26, z); parent.add(gl);
  lvEmit({ pos: new V3(x, y + .16, z), rate: 12, acc: 0, size: .24, spread: .07, rise: .9, colors: [0xffb04a, 0xff7a22, 0xffd27a] });
  if (light) { const L = takeLight(0xffa64a, 1.5); if (L) L.position.set(x * .92, y + .5, z * .92); }
}
function wallPiece(walls, x, z, style = THEME.wall, wh = WALLH, cap = true) {
  if (style === 'brick') { block(walls, brickMat, x, wh / 2, z, 1, wh, 1); if (cap) block(walls, wallTopMat, x, wh + .04, z, 1.03, .08, 1.03); return; }
  if (style === 'rock') { // a weathered outcrop, sitting on whatever slope is under it
    const walls0 = walls; walls = new THREE.Group(); walls.position.y = SLOPE ? slopeY(x, z) : 0; walls0.add(walls);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + rand(-.4, .4), d = i ? .17 : 0, k = mesh(new THREE.DodecahedronGeometry(rand(.3, .4), 0), rockMat, x + Math.cos(a) * d, rand(.32, .5), z + Math.sin(a) * d, walls); k.scale.set(rand(.9, 1.2), rand(1.3, 1.9), rand(.9, 1.2)); k.rotation.set(rand(-.3, .3), rand(0, 3), rand(-.3, .3)); }
    for (let i = 0; i < 3; i++) { const a = rand(0, 6.3), s = mesh(new THREE.DodecahedronGeometry(rand(.1, .17), 0), rockMat, x + Math.cos(a) * .36, .07, z + Math.sin(a) * .36, walls); s.scale.y = .6; }
    return;
  }
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + rand(-.2, .2), d = i ? .26 : 0, h = rand(.7, 1.15); mesh(new THREE.CylinderGeometry(.19, .21, h, 6), basaltColMat, x + Math.cos(a) * d, h / 2, z + Math.sin(a) * d, walls); }
}
// a rope bridge down one column from row r0 to r1: planks that sag a little, rope rails that sag more, posts at each end
function ropeBridge(g, c, r0, r1) {
  const a = cellPos(c, r0), x = a.x, y = a.y, zN = a.z - .5, zS = cellPos(c, r1).z + .5, sag = t => Math.sin(Math.PI * t);
  for (let z = zN + .1; z < zS - .05; z += .2) { const t = (z - zN) / (zS - zN), k = block(g, plankMat, x + rand(-.02, .02), y - .03 - .05 * sag(t), z, .86, .035, .15); k.rotation.y = rand(-.04, .04); }
  [-.46, .46].forEach(dx => {
    const pts = []; for (let i = 0; i <= 10 * (r1 - r0 + 1); i++) { const t = i / (10 * (r1 - r0 + 1)); pts.push(new V3(x + dx, y + .5 - .16 * sag(t), zN + (zS - zN) * t)); }
    for (let i = 1; i < pts.length; i++) seg(g, pts[i - 1], pts[i], .014, .014, ropeMat, 5);
    for (let i = 2; i < pts.length - 1; i += 4) seg(g, pts[i], new V3(pts[i].x, y - .03 - .05 * sag((pts[i].z - zN) / (zS - zN)), pts[i].z), .008, .008, ropeMat, 4);
    [zN, zS].forEach(z => mesh(new THREE.CylinderGeometry(.05, .06, .75, 7), woodMat, x + dx, y + .3, z, g));
  });
}
// a stair square: two treads of floorboard climbing away from the lower square beside it
function stairCell(g, c, r, p) {
  const h = baseH(c, r), d = DIRS.find(([dc, dr]) => inB(c + dc, r + dr) && hAt(c + dc, r + dr) < h && TERR[r + dr][c + dc] !== 'wall') || [0, 1];
  const y0 = TOP + (h - 1) * STEP;
  block(g, plankMat, p.x, y0 / 2, p.z, 1, y0, 1); // the lower tread, the whole square
  block(g, plankMat, p.x - d[0] * .25, (y0 + p.y) / 2, p.z - d[1] * .25, d[0] ? .5 : 1, p.y - y0, d[1] ? .5 : 1); // the upper, the far half
}
// the house's outer walls: full height with windows from outside, cut down while the ground floor is shown; a door to the south
function houseWalls(tall, cut, top) {
  const hx = COLS / 2, hz = ROWS / 2, T = .3, door = x => Math.abs(x) < 1, wh = top + .45;
  const run = (horiz, at, n, fn) => { for (let i = 0; i < n; i++) fn((horiz ? -hx : -hz) + i + .5); };
  [[true, -hz - T / 2, COLS], [true, hz + T / 2, COLS], [false, -hx - T / 2, ROWS], [false, hx + T / 2, ROWS]].forEach(([horiz, at, n], side) => run(horiz, at, n, u => {
    const x = horiz ? u : at, z = horiz ? at : u, sx = horiz ? 1 : T, sz = horiz ? T : 1, gap = side === 1 && door(u);
    if (gap) block(tall, keepSideMat, x, (1.15 + wh) / 2, z, sx, wh - 1.15, sz); else block(tall, keepSideMat, x, wh / 2, z, sx, wh, sz);
    block(tall, wallTopMat, x, wh + .03, z, sx + .04, .06, sz + .04);
    if (!gap) { block(cut, keepSideMat, x, CUTH / 2, z, sx, CUTH, sz); block(cut, cutCapMat, x, CUTH + .02, z, sx + .01, .04, sz + .01); }
  }));
  [[-hx - T / 2, -hz - T / 2], [hx + T / 2, -hz - T / 2], [-hx - T / 2, hz + T / 2], [hx + T / 2, hz + T / 2]].forEach(([x, z]) => { block(tall, keepSideMat, x, wh / 2, z, T, wh, T); block(cut, keepSideMat, x, CUTH / 2, z, T, CUTH, T); });
  [tall, cut].forEach(g => block(g, stoneMat, 0, .04, hz + .55, 2, .08, .5)); // the doorstep, in either view
}
// the view: 'upper' shows the upper floor solid; 'lower' makes it see-through so the hall below can be played
function setView(v, force) {
  if (!DECK.some(row => row.some(h => h >= 0))) v = 'upper';
  if (UI.view === v && !force) return;
  UI.view = v;
  if (deckGrp) deckGrp.visible = v !== 'lower'; // the upper floor is removed outright, not ghosted
  if (wallsTall) wallsTall.visible = v !== 'lower';
  if (wallsCut) wallsCut.visible = v === 'lower';
  propUp.visible = v !== 'lower';
  const two = DECK.some(row => row.some(h => h >= 0)); ['#floorBtn', '#menuFloor'].forEach(q => { const b = document.querySelector(q); if (b) { b.hidden = !two; b.classList.toggle('on', v === 'lower'); } });
  const lb = document.querySelector('#floorLbl'); if (lb) lb.textContent = v === 'lower' ? 'Ground floor' : 'Upper floor';
  $('#floorNum').textContent = v === 'lower' ? '1' : '2'; $('#floorUp').disabled = v !== 'lower'; $('#floorDn').disabled = v === 'lower';
  $('#floorBtn').setAttribute('aria-label', v === 'lower' ? 'Ground floor shown' : 'Upper floor shown');
  if (G && units.length) refreshHL();
}
// which floor a piece is best seen from: under a ceiling the ground floor, upstairs the upper floor; on an open square
// (the stair) the upper floor once it could step straight onto it, else whichever is shown
const viewFor = u => {
  if (!u) return 'upper'; if (u.l === 1) return 'upper'; if (covered(u.c, u.r, u.l)) return 'lower';
  if (!DECK.some(row => row.some(h => h >= 0))) return 'upper';
  return DIRS.some(([dc, dr]) => inB(u.c + dc, u.r + dr) && hasDeck(u.c + dc, u.r + dr) && Math.abs(hAt(u.c + dc, u.r + dr, 1) - hAt(u.c, u.r)) <= GC.TUNE.walkSteps) ? 'upper' : UI.view;
};
// a piece is hidden by the view when it's on the see-through upper floor, or under the solid one
const viewHides = u => (UI.view === 'lower' && u.l === 1) || (UI.view === 'upper' && covered(u.c, u.r, u.l));
function buildBoard(L) {
  disposeGroup(boardGrp); candles.length = 0; nextLight = 0;
  torchLights.forEach(Lt => { Lt.intensity = 0; flickers.find(f => f.L === Lt).base = 0; });
  THEME = THEMES[L.theme || 'crypt'];
  groundMat.map = THEME.ground; groundMat.color.setHex(THEME.tint).convertSRGBToLinear(); groundMat.needsUpdate = true;
  floorMats.forEach(m => { m.map = THEME.floor; m.vertexColors = L.theme === 'outdoor'; m.needsUpdate = true; }); cliffMat.map = THEME.cliff; cliffMat.needsUpdate = true;
  gridMat.opacity = THEME.grid; gridK = 1; hemi.intensity = THEME.hemi;
  keepFloorMats.forEach(m => { m.map = L.theme === 'outdoor' ? flagTex : L.theme === 'house' ? plankTex : hallTex; m.needsUpdate = true; });
  const tops = new THREE.Group(), sides = new THREE.Group(), walls = new THREE.Group(), lava = new THREE.Group(), vents = new THREE.Group(), grid = new THREE.Group(), deco = new THREE.Group(), lavaPts = [];
  const stone = (c, r) => (L.stone || []).some(([c0, r0, c1, r1]) => c >= c0 && c <= c1 && r >= r0 && r <= r1);
  const PIT = TERR.some(row => row.includes('chasm')) ? 1.5 : 0, bridgeCells = []; // ravines drop this far below the ground
  GORGE = []; for (let r = 0; r < ROWS; r++) if (TERR[r][0] === 'chasm' && TERR[r][COLS - 1] === 'chasm') GORGE.push(r - (ROWS - 1) / 2);
  buildGround(boardGrp, COLS / 2, ROWS / 2);
  const tallW = new THREE.Group(), cutW = new THREE.Group(); wallsTall = tallW; wallsCut = cutW; // building walls, full height and cut down
  const DECKTOP = DECK.some(row => row.some(h => h >= 0)) ? TOP + Math.max(...DECK.flat()) * STEP : 0;
  const column = (c, r, p, mat) => block(sides, mat, p.x, (p.y - .002 - PIT) / 2, p.z, 1, p.y - .002 + PIT, 1);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = cellPos(c, r), t = TERR[r][c], st = stone(c, r);
    if (t === 'wall') { if (!st && THEME.wall !== 'brick') { if (SLOPE) { tops.add(new THREE.Mesh(slopeQuadGeo(c, r), floorMats[0])); p.y = TOP; } else quad(tops, floorMats[0], p.x, p.y, p.z); column(c, r, p, cliffMat); } if (st && DECKTOP) { wallPiece(tallW, p.x, p.z, 'brick', DECKTOP - .002, !hasDeck(c, r)); wallPiece(cutW, p.x, p.z, 'brick', CUTH, false); block(cutW, cutCapMat, p.x, CUTH + .02, p.z, 1.01, .04, 1.01); }
      else wallPiece(walls, p.x, p.z, st ? 'brick' : THEME.wall); continue; }
    if (t === 'lava') { quad(lava, lavaMat, p.x, p.y - .05, p.z); lavaPts.push(p); continue; }
    if (t === 'chasm') { // a ravine: dark rock far below, mist hanging in it, and its ends closed where it meets the board edge
      quad(lava, ravineMat, p.x, -PIT + .02, p.z);
      if (Math.random() < .6) { const m = new THREE.Sprite(mistMat); m.scale.set(1.6, .9, 1); m.position.set(p.x + rand(-.3, .3), -PIT + rand(.3, .8), p.z + rand(-.3, .3)); deco.add(m); }
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dc, dr]) => {
        if (inB(c + dc, r + dr)) return;
        if (!dc || !GORGE.includes(p.z)) { block(sides, cliffMat, p.x + dc, -PIT / 2, p.z + dr, 1, PIT, 1); return; }
        // off the side of the board the gorge runs on into the distance: a floor far below and a rock wall either side
        const L = 34, mx = p.x + dc * (.5 + L / 2);
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(L, 1).rotateX(-Math.PI / 2), ravineMat); fl.position.set(mx, -PIT + .02, p.z); lava.add(fl);
        [-1, 1].forEach(sd => { const w = new THREE.Mesh(new THREE.PlaneGeometry(L, PIT + .002), cliffMat); if (sd > 0) w.rotation.y = Math.PI; w.position.set(mx, -PIT / 2, p.z + sd * .5); sides.add(w); });
        for (let k = 0; k < 3; k++) { const m = new THREE.Sprite(mistMat); m.scale.set(2.2, 1, 1); m.position.set(p.x + dc * rand(1.5, 7), -PIT + rand(.3, .9), p.z + rand(-.2, .2)); deco.add(m); }
      });
      continue;
    }
    if (t === 'bridge') { bridgeCells.push({ c, r }); quad(grid, gridMat, p.x, p.y + .012, p.z); continue; }
    if (st && baseH(c, r) > 0 && !hasDeck(c, r) && L.theme === 'house') { stairCell(sides, c, r, p); continue; }
    const topMat = t === 'vent' ? ventMat : (st ? keepFloorMats : floorMats)[Math.min(3, baseH(c, r))];
    if (SLOPE && t === 'floor') { (t === 'vent' ? vents : tops).add(new THREE.Mesh(slopeQuadGeo(c, r), topMat)); grid.add(new THREE.Mesh(slopeQuadGeo(c, r, .012), gridMat)); p.y = TOP + baseH(c, r) * STEP; }
    else { quad(t === 'vent' ? vents : tops, topMat, p.x, p.y, p.z); quad(grid, gridMat, p.x, p.y + .012, p.z); }
    column(c, r, p, st ? keepSideMat : cliffMat);
    if (st && hAt(c, r) >= 2) for (const [dc, dr] of DIRS) { // battlements along an upper floor's open edges
      const nc = c + dc, nr = r + dr, out = !inB(nc, nr), nt = out ? null : TERR[nr][nc];
      if (nt === 'wall' || nt === 'bridge' || (!out && nt !== 'chasm' && hAt(nc, nr) > hAt(c, r) - 2)) continue;
      [-.27, .27].forEach(o => block(walls, trimMat, p.x + dc * .43 + (dr ? o : 0), p.y + .1, p.z + dr * .43 + (dc ? o : 0), dc ? .12 : .22, .2, dr ? .12 : .22));
    }
    if (t === 'vent') lvEmit({ pos: new V3(p.x, p.y + .03, p.z), rate: 3, acc: 0, size: .14, spread: .25, rise: .6, colors: [0xff7a22, 0xffb04a] });
  }
  if (SLOPE) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { // where a hill runs off the board, its earth side follows the slope
    if (!['floor', 'wall'].includes(TERR[r][c])) continue;
    const y0 = TOP + baseH(c, r) * STEP, cx = (i, j) => [i - COLS / 2, j - ROWS / 2];
    [[r === 0, [c, 0], [c + 1, 0]], [r === ROWS - 1, [c + 1, ROWS], [c, ROWS]], [c === 0, [0, r + 1], [0, r]], [c === COLS - 1, [COLS, r], [COLS, r + 1]]].forEach(([edge, A, B]) => {
      if (!edge) return;
      const [ax, az] = cx(...A), [bx, bz] = cx(...B), ha = slopeY(ax, az), hb = slopeY(bx, bz); if (ha < .01 && hb < .01) return;
      const g = new THREE.BufferGeometry(), P = [ax, y0, az, bx, y0, bz, bx, y0 + hb, bz, ax, y0 + ha, az];
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]); g.computeVertexNormals(); sides.add(new THREE.Mesh(g, cliffMat));
    });
  }
  if (L.art.carpet) { // a runner up the hall, laid over the flagstones
    const [c0, r0, c1, r1] = L.art.carpet, a = cellPos(c0, r0), b = cellPos(c1, r1), len = b.z - a.z + .96;
    const geo = new THREE.PlaneGeometry(b.x - a.x + .9, len); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 2);
    carpetTex.repeat.set(1, 1); const m = mesh(geo, carpetMat, (a.x + b.x) / 2, a.y + .008, (a.z + b.z) / 2, boardGrp, false); m.rotation.x = -Math.PI / 2;
  }
  // the upper floor: flagstones on a timber-and-stone slab, battlements where it drops away
  deckGrp = new THREE.Group(); const dTop = new THREE.Group(), dSide = new THREE.Group(), dGrid = new THREE.Group(), dTrim = new THREE.Group();
  deckMats[0].map = keepFloorMats[0].map; deckMats[0].needsUpdate = true;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!hasDeck(c, r)) continue;
    const p = cellPos(c, r, 1);
    quad(dTop, deckMats[0], p.x, p.y, p.z); block(dSide, deckMats[1], p.x, p.y - .1, p.z, 1, .18, 1); // slab top sits just under the flagstones, so the two never fight quad(dGrid, deckMats[2], p.x, p.y + .012, p.z);
    for (const [dc, dr] of DIRS) {
      const nc = c + dc, nr = r + dr;
      if (inB(nc, nr) ? hasDeck(nc, nr) || TERR[nr][nc] === 'wall' || hAt(nc, nr) > hAt(c, r, 1) - 2 : L.theme === 'house') continue;
      [-.27, .27].forEach(o => block(dTrim, deckMats[3], p.x + dc * .43 + (dr ? o : 0), p.y + .1, p.z + dr * .43 + (dc ? o : 0), dc ? .12 : .22, .2, dr ? .12 : .22));
    }
  }
  deckMats[3].map = trimMat.map;
  [[dTop, .25, .5, false], [dSide, .25, .5, true], [dGrid, 0, 0, false], [dTrim, 0, 0, true]].forEach(([g, kt, ks, cast]) => { mergeFig(g); if (kt) worldUV(g, kt, ks); g.children.forEach(m => { if (m.isMesh) m.castShadow = cast; }); deckGrp.add(g); });
  dGrid.children.forEach(m => { m.receiveShadow = false; m.renderOrder = 1; });
  boardGrp.add(deckGrp);
  if (L.theme === 'house') houseWalls(tallW, cutW, DECKTOP);
  bridgeCells.forEach(b => { if (!bridgeCells.some(o => o.c === b.c && o.r === b.r - 1)) { let r1 = b.r; while (bridgeCells.some(o => o.c === b.c && o.r === r1 + 1)) r1++; ropeBridge(deco, b.c, b.r, r1); } });
  const hx = COLS / 2, hz = ROWS / 2;
  ({ outdoor: dressOutdoor, crypt: dressCrypt, lava: dressLava, throne: dressThrone, house: dressHouse })[L.theme || 'crypt'](walls, deco, hx, hz);
  if (lavaPts.length) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { // glow from each quarter's lava
    const q = lavaPts.filter(p => Math.sign(p.x || 1) === sx && Math.sign(p.z || 1) === sz); if (!q.length) return;
    const Lt = takeLight(0xff6a20, 1.8); if (Lt) Lt.position.set(q.reduce((s, p) => s + p.x, 0) / q.length, 1.1, q.reduce((s, p) => s + p.z, 0) / q.length);
  });
  topsGrp = tops;
  [[tops, .25, .5, false], [sides, .25, .5, true], [walls, .25, .5, true], [tallW, .25, .5, true], [cutW, .25, .5, true], [lava, .25, .5, false], [vents, 0, 0, false], [grid, 0, 0, false], [deco, 0, 0, true]].forEach(([g, kt, ks, cast]) => {
    mergeFig(g); if (kt) worldUV(g, kt, ks); g.children.forEach(m => { if (m.isMesh) m.castShadow = cast; }); boardGrp.add(g);
  });
  grid.children.forEach(m => { m.receiveShadow = false; m.renderOrder = 1; });
  setView('upper', true);
  const sh = Math.max(hx, hz) + 3; Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh }); sun.shadow.camera.updateProjectionMatrix();
}
const offSpot = (hx, hz, m = 1.1, south = m) => { for (;;) { const x = rand(-hx - 4.5, hx + 4.5), z = rand(-hz - 3.5, hz + 3.5); if (GORGE.some(zc => Math.abs(z - zc) < 1.1)) continue; if (Math.abs(x) > hx + m || z < -hz - m || z > hz + south) return [x, z]; } };
// a cut-away crypt: a low parapet in unit lengths (the camera turns all the way round), corner pillars with torches
function dressCrypt(solid, deco, hx, hz, lights = true) {
  const PH = .5, ox = hx + .45, oz = hz + .45;
  for (let x = -hx + .5; x < hx; x++) [-oz, oz].forEach(z => { block(solid, brickMat, x, PH / 2, z, 1, PH, .5); block(solid, wallTopMat, x, PH + .03, z, 1.02, .06, .56); });
  for (let z = -hz + .5; z < hz; z++) [-ox, ox].forEach(x => { block(solid, brickMat, x, PH / 2, z, .5, PH, 1); block(solid, wallTopMat, x, PH + .03, z, .56, .06, 1.02); });
  const pillars = [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz]];
  if (ROWS > 9) pillars.push([-ox, 0], [ox, 0]);
  pillars.forEach(([x, z]) => { block(solid, brickMat, x, .75, z, .9, 1.5, .9); block(solid, wallTopMat, x, 1.55, z, 1, .1, 1); torch(deco, x, z, 1.6, lights); });
  for (let i = 0; i < 14; i++) { const [x, z] = offSpot(hx, hz); const k = mesh(new THREE.DodecahedronGeometry(rand(.12, .32), 1), rockMat, x, .06, z, deco); k.scale.y = .55; }
  for (let i = 0; i < 8; i++) { const [x, z] = offSpot(hx, hz); skull(x, .1, z, deco, rand(.8, 1.1)); }
  for (let i = 0; i < 12; i++) { const [x, z] = offSpot(hx, hz); const b = mesh(new THREE.CylinderGeometry(.022, .022, rand(.22, .36), 6), boneMat, x, .03, z, deco); b.rotation.set(Math.PI / 2, 0, rand(0, 3)); }
  for (let i = 0; i < 5; i++) {
    const [x0, z0] = offSpot(hx, hz, 1.3);
    for (let k = 0; k < 3; k++) { const x = x0 + rand(-.2, .2), z = z0 + rand(-.2, .2), h = rand(.08, .22); mesh(new THREE.CylinderGeometry(.035, .04, h, 8), waxMat, x, h / 2, z, deco); const f = glowSprite(0xffb050, .2); f.position.set(x, h + .05, z); deco.add(f); candles.push({ s: f, seed: rand(0, 9) }); }
  }
  [[-1, 1], [1, -1]].forEach(([sx, sz]) => {
    const g = new THREE.Group(); g.position.set(sx * (hx + 2.4), 0, sz * (hz * .4)); g.rotation.y = Math.PI / 2 + rand(-.1, .1); deco.add(g);
    mesh(new THREE.BoxGeometry(1.5, .5, .7), stoneMat, 0, .25, 0, g); mesh(new THREE.BoxGeometry(1.62, .12, .8), trimMat, 0, .56, 0, g);
    mesh(new THREE.BoxGeometry(.5, .06, .12), stoneMat, 0, .65, 0, g); mesh(new THREE.BoxGeometry(.12, .06, .4), stoneMat, -.12, .65, 0, g);
  });
}
// the great hall: the crypt's parapet with banners on every pillar; braziers on the board carry the light
function dressThrone(solid, deco, hx, hz) {
  dressCrypt(solid, deco, hx, hz, false);
  const ox = hx + .45, oz = hz + .45;
  [[-ox, -oz], [ox, -oz], [-ox, oz], [ox, oz], ...(ROWS > 9 ? [[-ox, 0], [ox, 0]] : [])].forEach(([x, z]) => {
    const inward = Math.atan2(-x, -z), b = new THREE.Mesh(new THREE.PlaneGeometry(.5, .95), bannerMat); b.position.set(x - Math.sign(x) * .47 * Math.abs(Math.sin(inward)), 1.0, z - Math.sign(z) * .47 * Math.abs(Math.cos(inward))); b.rotation.y = inward; b.castShadow = true; deco.add(b);
  });
}
// open hillside: the board is a slab of turf with earth sides, ringed by trees, boulders and grass
function dressOutdoor(solid, deco, hx, hz) {
  for (let i = 0; i < 34; i++) { const [x, z] = offSpot(hx, hz, 1, 2.2), s = rand(.8, 1.35); (Math.random() < .55 ? pine : oak)(deco, x, 0, z, s); }
  for (let i = 0; i < 14; i++) { const [x, z] = offSpot(hx, hz, .8); const k = mesh(new THREE.DodecahedronGeometry(rand(.15, .45), 1), rockMat, x, .1, z, deco); k.scale.y = .65; k.rotation.y = rand(0, 3); }
  for (let i = 0; i < 50; i++) { const [x, z] = offSpot(hx, hz, .6); for (let k = 0; k < 3; k++) { const t = mesh(new THREE.ConeGeometry(.035, rand(.12, .2), 4), leafMats[k], x + rand(-.06, .06), .07, z + rand(-.06, .06), deco, false); t.rotation.set(rand(-.3, .3), 0, rand(-.3, .3)); } }
}
// the house stands in a yard: trees, a woodpile, rocks and long grass, lanterns either side of the door
function dressHouse(solid, deco, hx, hz) {
  for (let i = 0; i < 22; i++) { const [x, z] = offSpot(hx, hz, 2, 3), s = rand(.85, 1.3); (Math.random() < .5 ? pine : oak)(deco, x, 0, z, s); }
  for (let i = 0; i < 10; i++) { const [x, z] = offSpot(hx, hz, 1.2); const k = mesh(new THREE.DodecahedronGeometry(rand(.12, .32), 1), rockMat, x, .08, z, deco); k.scale.y = .6; }
  for (let i = 0; i < 40; i++) { const [x, z] = offSpot(hx, hz, .9); for (let k = 0; k < 3; k++) { const t = mesh(new THREE.ConeGeometry(.035, rand(.12, .2), 4), leafMats[k], x + rand(-.06, .06), .07, z + rand(-.06, .06), deco, false); t.rotation.set(rand(-.3, .3), 0, rand(-.3, .3)); } }
  for (let i = 0; i < 8; i++) { const l = mesh(new THREE.CylinderGeometry(.09, .09, .9, 8), woodMat, -hx - 1 + (i % 4) * .2, .1 + (i >> 2) * .17, -1, deco); l.rotation.x = Math.PI / 2; }
  [-1.25, 1.25].forEach(x => torch(deco, x, hz + .55, 1.2, true));
}
// a volcanic cavern: basalt columns and pools of lava beyond the board, sparks drifting up
function dressLava(solid, deco, hx, hz) {
  for (let i = 0; i < 5; i++) {
    const [x, z] = offSpot(hx, hz, 1.6), r = rand(.7, 1.3);
    const pool = mesh(new THREE.CircleGeometry(r, 24), lavaMat, x, .02, z, deco, false); pool.rotation.x = -Math.PI / 2;
    const uv = pool.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * r / 2, uv.getY(k) * r / 2);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const s = mesh(new THREE.DodecahedronGeometry(rand(.14, .24), 1), basaltColMat, x + Math.cos(a) * r, .08, z + Math.sin(a) * r, deco); s.scale.y = .6; }
    lvEmit({ pos: new V3(x, .1, z), rate: 4, acc: 0, size: .18, spread: r * .6, rise: .8, colors: [0xff7a22, 0xffb04a, 0xff4a12] });
  }
  for (let i = 0; i < 12; i++) { const [x, z] = offSpot(hx, hz, .9); for (let k = 0; k < 4; k++) { const h = rand(.4, 1.6); mesh(new THREE.CylinderGeometry(.19, .21, h, 6), basaltColMat, x + rand(-.35, .35), h / 2, z + rand(-.35, .35), deco); } }
  for (let i = 0; i < 6; i++) { const [x, z] = offSpot(hx, hz); skull(x, .1, z, deco, rand(.8, 1.1)); }
}

// ---------------- level props (rebuilt per battle) ----------------
const propGroup = new THREE.Group(); scene.add(propGroup);
const levelEmit = [];
function lvEmit(e) { emitters.push(e); levelEmit.push(e); }
const propUp = new THREE.Group(); scene.add(propUp); // props on the upper floor, hidden while the ground floor is shown
let PROP_L = 0; // the floor the prop being built stands on
function propRoot(c, r) { const g = new THREE.Group(); g.position.copy(cellPos(c, r, PROP_L)); (PROP_L ? propUp : propGroup).add(g); return g; }
const PROPS = {
  pillar(c, r) {
    const g = propRoot(c, r);
    mesh(new THREE.BoxGeometry(.82, .16, .82), stoneMat, 0, .08, 0, g);
    mesh(new THREE.CylinderGeometry(.28, .31, 1.15, 14), stoneMat, 0, .73, 0, g);
    const top = mesh(new THREE.CylinderGeometry(.2, .28, .22, 14), stoneMat, .04, 1.4, 0, g); top.rotation.z = .25;
    for (let i = 0; i < 4; i++) mesh(new THREE.DodecahedronGeometry(rand(.06, .11)), stoneMat, rand(-.38, .38), .05, rand(-.38, .38), g);
  },
  cauldron(c, r) {
    const g = propRoot(c, r), p = cellPos(c, r);
    for (let i = 0; i < 3; i++) { const a = i * 2.1; const l = mesh(new THREE.CylinderGeometry(.03, .03, .3, 6), ironMat, Math.cos(a) * .22, .14, Math.sin(a) * .22, g); l.rotation.z = Math.cos(a) * .3; l.rotation.x = -Math.sin(a) * .3; }
    const pot = mesh(new THREE.SphereGeometry(.34, 20, 14, 0, Math.PI * 2, Math.PI / 2.6, Math.PI - Math.PI / 2.6), ironMat, 0, .52, 0, g); pot.material = ironMat.clone(); pot.material.side = THREE.DoubleSide;
    mesh(new THREE.TorusGeometry(.31, .035, 8, 24), ironMat, 0, .67, 0, g).rotation.x = Math.PI / 2;
    const brew = new THREE.Mesh(new THREE.CircleGeometry(.3, 24), new THREE.MeshBasicMaterial({ color: 0xb8d84a })); brew.rotation.x = -Math.PI / 2; brew.position.y = .63; g.add(brew);
    for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(.03, .03, .4, 6), woodMat, rand(-.15, .15), .06, rand(-.15, .15), g).rotation.set(Math.PI / 2, rand(0, 3), 0);
    lvLight.color.setHex(0xc6e04a); lvLight.position.set(p.x, 1.1, p.z); lvLight.userData.base = 1.4;
    lvEmit({ pos: new V3(p.x, p.y + .66, p.z), rate: 7, acc: 0, size: .16, spread: .2, rise: .5, colors: [0xb8d84a, 0xd8ec6a] });
    lvEmit({ pos: new V3(p.x, p.y + .12, p.z), rate: 10, acc: 0, size: .22, spread: .1, rise: .5, colors: [0xff7a22, 0xffa43a] });
  },
  table(c, r) { // a trestle table, a stool, a jug and a loaf
    const g = propRoot(c, r); g.rotation.y = rand(-.2, .2);
    mesh(new THREE.BoxGeometry(.86, .07, .56), woodMat, 0, .52, 0, g);
    [[-.34, -.2], [.34, -.2], [-.34, .2], [.34, .2]].forEach(([x, z]) => mesh(new THREE.BoxGeometry(.07, .5, .07), woodMat, x, .25, z, g));
    mesh(new THREE.CylinderGeometry(.14, .14, .05, 10), woodMat, .3, .3, .38, g); mesh(new THREE.CylinderGeometry(.03, .03, .28, 6), woodMat, .3, .14, .38, g);
    mesh(new THREE.CylinderGeometry(.06, .08, .16, 10), stoneMat, -.2, .64, .05, g); mesh(new THREE.SphereGeometry(.09, 10, 8), sRGB(0x9a6a34), .18, .6, -.08, g).scale.set(1.4, .8, 1);
  },
  crates(c, r) { // stacked crates
    const g = propRoot(c, r);
    mesh(new THREE.BoxGeometry(.5, .5, .5), woodMat, -.13, .25, .1, g).rotation.y = .2; mesh(new THREE.BoxGeometry(.42, .42, .42), woodMat, .2, .21, -.18, g).rotation.y = -.3;
    mesh(new THREE.BoxGeometry(.36, .36, .36), woodMat, -.1, .68, .08, g).rotation.y = .7;
  },
  bed(c, r) { // a wooden bed with a straw mattress and a blanket
    const g = propRoot(c, r);
    mesh(new THREE.BoxGeometry(.6, .22, .9), woodMat, 0, .17, 0, g); mesh(new THREE.BoxGeometry(.56, .1, .86), sRGB(0xb8a070), 0, .33, 0, g);
    mesh(new THREE.BoxGeometry(.58, .06, .52), sRGB(0x7a2a24), 0, .4, .16, g); mesh(new THREE.BoxGeometry(.3, .08, .18), sRGB(0xd8ccb0), 0, .42, -.3, g);
    mesh(new THREE.BoxGeometry(.64, .5, .06), woodMat, 0, .25, -.45, g);
  },
  barrels(c, r) {
    const g = propRoot(c, r);
    [[-.18, -.12], [.2, .14]].forEach(([x, z]) => { mesh(new THREE.CylinderGeometry(.19, .19, .5, 16), woodMat, x, .25, z, g); [.08, .42].forEach(y => mesh(new THREE.TorusGeometry(.195, .015, 6, 18), ironMat, x, y, z, g).rotation.x = Math.PI / 2); });
    const crate = mesh(new THREE.BoxGeometry(.36, .36, .36), woodMat, .16, .18, -.24, g); crate.rotation.y = .4;
  },
  cage(c, r) {
    const g = propRoot(c, r);
    mesh(new THREE.BoxGeometry(.84, .06, .84), woodMat, 0, .03, 0, g);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i === 0 || i === 3 || j === 0 || j === 3) mesh(new THREE.CylinderGeometry(.018, .018, .9, 5), ironMat, -.36 + i * .24, .48, -.36 + j * .24, g);
    mesh(new THREE.BoxGeometry(.84, .05, .84), ironMat, 0, .93, 0, g);
    for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(.025, .025, .3, 6), boneMat, rand(-.2, .2), .08, rand(-.2, .2), g).rotation.set(Math.PI / 2, rand(0, 3), 0);
    skull(.1, .14, -.1, g);
  },
  idol(c, r) {
    const g = propRoot(c, r), p = cellPos(c, r);
    mesh(new THREE.CylinderGeometry(.36, .4, .2, 8), stoneMat, 0, .1, 0, g);
    mesh(new THREE.CylinderGeometry(.18, .24, .7, 8), stoneMat, 0, .55, 0, g);
    mesh(new THREE.SphereGeometry(.2, 12, 10), stoneMat, 0, 1.0, 0, g).scale.set(1, .9, 1);
    [-1, 1].forEach(s => { mesh(new THREE.ConeGeometry(.06, .3, 6), stoneMat, s * .24, 1.05, 0, g).rotation.z = -s * 1.2; });
    const em = new THREE.MeshStandardMaterial({ color: 0xd0e86a, emissive: 0xb8d84a, emissiveIntensity: 2.2 });
    [-1, 1].forEach(s => mesh(new THREE.SphereGeometry(.035, 8, 6), em, s * .07, 1.03, .17, g, false));
    for (let i = 0; i < 4; i++) skull(Math.cos(i * 1.6) * .3, .24, Math.sin(i * 1.6) * .3, g, .8);
    lvLight.color.setHex(0xc6e04a); lvLight.position.set(p.x, 1.4, p.z + .3); lvLight.userData.base = 1.6;
    lvEmit({ pos: new V3(p.x, p.y + 1.05, p.z + .1), rate: 6, acc: 0, size: .2, spread: .08, rise: .4, colors: [0xb8d84a, 0xe0f07a] });
  },
  throne(c, r) { // the king's seat, across this square and the one to its east
    const p = cellPos(c, r), g = new THREE.Group(); g.position.set(p.x + .5, p.y, p.z - .05); g.scale.setScalar(.6); propGroup.add(g);
    mesh(new THREE.BoxGeometry(2.4, .3, 1.6), stoneMat, 0, .15, 0, g); mesh(new THREE.BoxGeometry(1.8, .3, 1.2), stoneMat, 0, .45, -.1, g);
    const red = new THREE.MeshStandardMaterial({ color: 0x6a1010, roughness: .7 });
    mesh(new THREE.BoxGeometry(.9, .25, .8), red, 0, .72, -.1, g); mesh(new THREE.BoxGeometry(1.1, 1.6, .2), woodMat, 0, 1.4, -.5, g); mesh(new THREE.BoxGeometry(.8, 1.2, .05), red, 0, 1.35, -.38, g);
    for (let i = -2; i <= 2; i++) mesh(new THREE.ConeGeometry(.07, .4, 6), goldMat, i * .22, 2.35, -.5, g);
    [-1, 1].forEach(s => { mesh(new THREE.BoxGeometry(.15, .5, .8), woodMat, s * .55, .95, -.1, g); skull(s * .55, 1.28, .2, g, 1.1); });
    for (let i = 0; i < 5; i++) skull(rand(-1.1, 1.1), .35, rand(.4, .7), g, rand(.8, 1.1));
  },
  tree(c, r) { const g = propRoot(c, r); (Math.random() < .6 ? pine : oak)(g, 0, 0, 0, rand(1, 1.15)); g.rotation.y = rand(0, 6); },
  campfire(c, r) { // a ring of stones round a log fire
    const g = propRoot(c, r), p = cellPos(c, r);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const k = mesh(new THREE.DodecahedronGeometry(.08, 1), rockMat, Math.cos(a) * .27, .05, Math.sin(a) * .27, g); k.scale.y = .7; }
    for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(.04, .045, .42, 7), woodMat, 0, .07, 0, g).rotation.set(Math.PI / 2 - .25, i * 2.1, 0);
    const gl = glowSprite(0xffa040, .7); gl.position.set(0, .25, 0); g.add(gl);
    lvEmit({ pos: new V3(p.x, p.y + .12, p.z), rate: 12, acc: 0, size: .24, spread: .1, rise: .9, colors: [0xffb04a, 0xff7a22, 0xffd27a] });
    const L = takeLight(0xffa04a, 1.4); if (L) L.position.set(p.x, p.y + .8, p.z);
  },
  brazier(c, r) { // iron fire bowl on a tripod; it lights the hall
    const g = propRoot(c, r), p = cellPos(c, r);
    for (let i = 0; i < 3; i++) { const a = i * 2.1, l = mesh(new THREE.CylinderGeometry(.025, .025, .9, 6), ironMat, Math.cos(a) * .16, .45, Math.sin(a) * .16, g); l.rotation.z = Math.cos(a) * .18; l.rotation.x = -Math.sin(a) * .18; }
    mesh(new THREE.CylinderGeometry(.28, .14, .2, 14), ironMat, 0, .92, 0, g);
    const gl = glowSprite(0xffa040, .8); gl.position.set(0, 1.12, 0); g.add(gl);
    lvEmit({ pos: new V3(p.x, p.y + 1.02, p.z), rate: 14, acc: 0, size: .26, spread: .1, rise: .9, colors: [0xffb04a, 0xff7a22, 0xffd27a] });
    const L = takeLight(0xffa64a, 1.6); if (L) L.position.set(p.x, p.y + 1.5, p.z);
  }
};

// ---------------- cell highlights ----------------
const HL = [];
const hlGeo = new THREE.PlaneGeometry(.94, .94);
const HLC = { threat: [0xc0392b, .45], move: [0x9fb4c8, .4], target: [0xd0402f, .6], far: [0xd0402f, .3], ally: [0x8fbf7a, .45], range: [0xb08a4a, .2], climb: [0x9fb4c8, .4], area: [0xe8873a, .62], self: [0xe3ad4f, .5] };
// Chalk marks drawn over the fill, one shape per meaning, so colour is never the only cue
const CHALK = 0xf4f1e6;
const markTex = {};
{
  const T = draw => canvasTex(128, 128, g => { g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); }, false);
  markTex.brackets = T(g => { g.lineWidth = 11; [[12, 12, 1, 1], [116, 12, -1, 1], [12, 116, 1, -1], [116, 116, -1, -1]].forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x, y + sy * 34); g.lineTo(x, y); g.lineTo(x + sx * 34, y); g.stroke(); }); });
  markTex.pips = T(g => { g.lineWidth = 6; [[28, 28], [100, 28], [28, 100], [100, 100]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x, y - 10); g.lineTo(x, y + 10); g.stroke(); }); });
  markTex.hatch = T(g => { g.lineWidth = 4; g.globalAlpha = .7; g.save(); g.beginPath(); g.rect(10, 10, 108, 108); g.clip(); for (let k = -128; k < 128; k += 22) { g.beginPath(); g.moveTo(k, 128); g.lineTo(k + 128, 0); g.stroke(); } g.restore(); });
  markTex.dashed = T(g => { g.lineWidth = 6; g.setLineDash([14, 10]); g.strokeRect(12, 12, 104, 104); });
  markTex.climb = T(g => { // a double chevron: reaching this square means climbing a cliff
    g.lineWidth = 9; [40, 64].forEach(y => { g.beginPath(); g.moveTo(40, y + 16); g.lineTo(64, y - 6); g.lineTo(88, y + 16); g.stroke(); });
  });
  markTex.ring = T(g => { g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); });
}
const MARK = { climb: ['climb', 1], threat: ['hatch', .55], target: ['brackets', 1], far: ['brackets', .5], ally: ['pips', .95], area: ['dashed', .9], self: ['ring', .9] };
const HLM = [], HLK = new Map(); // key(c, r, l) → [fill, mark]
function buildHL() { // one fill and one chalk mark per floor of every square
  [...HL, ...HLM].forEach(m => { scene.remove(m); m.material.dispose(); if (m.geometry !== hlGeo) m.geometry.dispose(); }); HL.length = 0; HLM.length = 0; HLK.clear();
  const make = (c, r, l) => {
    const p = cellPos(c, r, l);
    const sg = SLOPE && !l && TERR[r][c] === 'floor' ? slopeQuadGeo(c, r, 0, .94, true) : null, flat = o => { if (!sg) o.rotation.x = -Math.PI / 2; };
    const m = new THREE.Mesh(sg || hlGeo, pullForward(new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, depthWrite: false, opacity: .3, toneMapped: false }), -3, -6));
    m.position.set(p.x, p.y + .028, p.z); flat(m); m.renderOrder = 1; m.visible = false; scene.add(m); HL.push(m);
    const k = new THREE.Mesh(sg || hlGeo, pullForward(new THREE.MeshBasicMaterial({ color: CHALK, transparent: true, depthWrite: false, toneMapped: false }), -3, -6));
    k.position.set(p.x, p.y + .029, p.z); flat(k); k.renderOrder = 2; k.visible = false; scene.add(k); HLM.push(k);
    HLK.set(key(c, r, l), [m, k]);
  };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { make(c, r, 0); if (hasDeck(c, r)) make(c, r, 1); }
}
const EDGE_N = 6, edgeIdx = []; for (let i = 0; i < EDGE_N; i++) { const a = i * 2; edgeIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
const edgeMat = new THREE.MeshBasicMaterial({ color: CHALK, transparent: true, opacity: .9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const rangeEdgeMat = new THREE.MeshBasicMaterial({ color: 0xe3ad4f, transparent: true, opacity: .95, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const edges = []; let edgeUsed = 0;
// draw the border of a set of squares: chalk for where a hero can walk, brass for how far a power reaches
function outline(set, mat = edgeMat, inset = .48) {
  for (const k of set) {
    const [c, r, l = 0] = k.split(',').map(Number), p = cellPos(c, r, l);
    if ((l === 1 && UI.view === 'lower') || (l === 0 && UI.view === 'upper' && hasDeck(c, r))) continue;
    for (const [dc, dr] of DIRS) {
      if (set.has(key(c + dc, r + dr, l))) continue;
      let m = edges[edgeUsed];
      if (!m) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((EDGE_N + 1) * 6), 3)); g.setIndex(edgeIdx); m = new THREE.Mesh(g, edgeMat); m.frustumCulled = false; m.renderOrder = 2; scene.add(m); edges.push(m); }
      m.material = mat; m.visible = true; edgeUsed++;
      const ex = p.x + dc * inset, ez = p.z + dr * inset, base = p.y - (l ? 0 : slopeY(p.x, p.z)), A = m.geometry.attributes.position;
      for (let i = 0; i <= EDGE_N; i++) { // a thin strip along the edge, each point lifted to the ground beneath it
        const t = i / EDGE_N - .5, x = ex + (dc ? 0 : t), z = ez + (dc ? t : 0);
        [-1, 1].forEach((sd, j) => { const xx = x + dc * .035 * sd, zz = z + dr * .035 * sd; A.setXYZ(i * 2 + j, xx, base + (l ? 0 : slopeY(xx, zz)) + .031, zz); });
      }
      A.needsUpdate = true;
    }
  }
}
let showThreat = false;
function setHL(c, r, type, l = 0) {
  const pair = HLK.get(key(c, r, l)); if (!pair || (l === 1 && UI.view === 'lower') || (l === 0 && UI.view === 'upper' && hasDeck(c, r))) return;
  const [m, mk] = pair; m.visible = true; m.material.color.setHex(HLC[type][0]); m.userData.op = HLC[type][1];
  const k = MARK[type]; mk.visible = !!k;
  if (k) { mk.material.map = markTex[k[0]]; mk.material.opacity = k[1]; mk.material.needsUpdate = true; }
}

// burning squares: a glow on the ground and a little fire, while the rules say the square burns
const burnFx = new Map();
function setBurnFx(c, r, n, l = 0) {
  const k = key(c, r, l);
  if (!burnFx.has(k)) {
    const sg = SLOPE && !l && TERR[r][c] === 'floor' ? slopeQuadGeo(c, r, 0, 1.2, true) : null;
    const m = new THREE.Mesh(sg || hlGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff5a14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const p = cellPos(c, r, l); m.position.set(p.x, p.y + .032, p.z); if (!sg) { m.rotation.x = -Math.PI / 2; m.scale.setScalar(1.25); } scene.add(m);
    const em = { pos: new V3(p.x, p.y + .05, p.z), rate: 9, acc: 0, size: .32, spread: .32, rise: 1, colors: [0xff6a1a, 0xffa43a, 0xff3a0a] };
    emitters.push(em); burnFx.set(k, { m, em, n });
  }
  burnFx.get(k).n = n;
}
// steam where ice meets fire
function steam(p) { if (QUIET) return; burst(p.clone().setY(p.y + .3), [0xe8eef2, 0xffffff, 0xcfd8de], 22, 1.1, .55, 1.3, { smoke: true, op: .7, grow: 1.6, up: .7 }); sfx('smoke'); }
function clearBurnFx(k) { const b = burnFx.get(k); if (!b) return; scene.remove(b.m); emitters.splice(emitters.indexOf(b.em), 1); burnFx.delete(k); }

// ---------------- path arrow ----------------
const arrow = new THREE.Group(); scene.add(arrow);
const arrowMats = { blue: [new THREE.MeshBasicMaterial({ color: 0xe9f4ff, transparent: true, opacity: .9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: 0x2f8cff, depthWrite: false, transparent: true, toneMapped: false, side: THREE.DoubleSide })], red: [new THREE.MeshBasicMaterial({ color: 0xffe7e0, transparent: true, opacity: .9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: 0xff3b2e, depthWrite: false, transparent: true, toneMapped: false, side: THREE.DoubleSide })] };
function showArrow(path, color = 'blue') {
  while (arrow.children.length) { const c = arrow.children[0]; c.geometry.dispose(); arrow.remove(c); }
  if (!path || path.length < 2) return;
  const P = path.map(p => { const q = cellPos(p.c, p.r); return [q.x, q.z]; });
  // a smooth line: corners are rounded by curving between the midpoints of each pair of legs
  const line = [P[0]];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const m1 = [b[0] + (a[0] - b[0]) * .5, b[1] + (a[1] - b[1]) * .5], m2 = [b[0] + (c[0] - b[0]) * .5, b[1] + (c[1] - b[1]) * .5];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) === 0) { line.push(b); continue; }
    for (let k = 0; k <= 6; k++) { const t = k / 6, u = 1 - t; line.push([u * u * m1[0] + 2 * u * t * b[0] + t * t * m2[0], u * u * m1[1] + 2 * u * t * b[1] + t * t * m2[1]]); }
  }
  line.push(P[P.length - 1]);
  const cum = [0]; for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const L = cum[cum.length - 1];
  const at = d => { d = Math.max(0, Math.min(L, d)); let i = 1; while (i < line.length - 1 && cum[i] < d) i++; const k = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); const a = line[i - 1], b = line[i]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return { x: a[0] + dx * k, z: a[1] + dz * k, tx: dx / l, tz: dz / l }; };
  const tipD = L - .08, headL = .42, baseD = Math.max(0, tipD - headL), startD = Math.min(.36, Math.max(.14, tipD - headL - .12));
  [[.30, .56, 0], [.15, .4, 1]].forEach(([w, hw, li]) => {
    const mat = arrowMats[color][li], yo = .05 + li * .004, y = TOP + yo, ro = 3 + li, grow = li ? 0 : .05;
    const fy = (x, z) => floorY(x, z) + yo;
    const pos = [], idx = [];
    const n = Math.max(2, Math.ceil((baseD - startD) / .07));
    for (let k = 0; k <= n && baseD > startD; k++) {
      const q = at(startD + (baseD - startD) * k / n), nx = -q.tz, nz = q.tx;
      { const ax = q.x + nx * w / 2, az = q.z + nz * w / 2, bx = q.x - nx * w / 2, bz = q.z - nz * w / 2; pos.push(ax, fy(ax, az), az, bx, fy(bx, bz), bz); }
      if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    if (pos.length) { const g = new THREE.BufferGeometry(); g.setIndex(idx); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const m = new THREE.Mesh(g, mat); m.renderOrder = ro; m.frustumCulled = false; arrow.add(m); }
    // round start cap
    const cap = new THREE.Mesh(new THREE.CircleGeometry(w * .62, 20), mat); const s0 = at(startD); lieFlat(cap, s0.x, s0.z); cap.position.set(s0.x, fy(s0.x, s0.z), s0.z); cap.renderOrder = ro; arrow.add(cap);
    // arrowhead
    const base = at(baseD), tip = at(tipD), tx = tip.tx, tz = tip.tz, hl = tipD - baseD + grow;
    const hg = new THREE.BufferGeometry();
    const bx = tip.x - tx * hl, bz = tip.z - tz * hl, hh = hw / 2 + grow * .6;
    const H = [[tip.x + tx * grow, tip.z + tz * grow], [bx - tz * hh, bz + tx * hh], [bx + tz * hh, bz - tx * hh]], M = [(H[0][0] + H[1][0]) / 2, (H[0][1] + H[1][1]) / 2], N2 = [(H[0][0] + H[2][0]) / 2, (H[0][1] + H[2][1]) / 2], C = [bx, bz];
    hg.setAttribute('position', new THREE.Float32BufferAttribute([H[0], M, N2, M, H[1], C, M, C, N2, N2, C, H[2]].flatMap(([x, z]) => [x, fy(x, z), z]), 3)); // split in four so a slope can bend it
    const head = new THREE.Mesh(hg, mat); head.renderOrder = ro; head.frustumCulled = false; arrow.add(head);
  });
}
const hideArrow = () => showArrow(null);

