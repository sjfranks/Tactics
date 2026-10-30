// =====================================================================================================================
// GOBLIN CRYPT · THE TABLE
// Everything you see and hear: the diorama, the miniatures, the dice, the sound and the HUD. The view decides nothing.
// The rules (GC, in the script above) own the battle: the view asks them what a hero may do, sends the player's orders
// to them, and plays back the events each order returns. G is the battle on the table.
// =====================================================================================================================
(() => {
'use strict';
const $ = s => document.querySelector(s);
const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
const rand = (a, b) => a + Math.random() * (b - a);
let G = null;
const ru = u => G.U(u.id); // the rules' unit behind a piece
// the board, copied from the rules when a battle loads: COLS×ROWS squares, MAP[r][c] = floor height in steps or -1 for a
// wall, DECK[r][c] = the height of an upper floor over that square or -1, BASE = raised ground without the hills on it
let COLS = 6, ROWS = 8, MAP = [], MAXH = 0, DECK = [], BASE = [], TERR = [], SLOPE = null;
const TOP = 0.12, STEP = GC.TUNE.stepH;
const key = GC.key;
const inB = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
const hasDeck = (c, r) => !!(DECK[r] && DECK[r][c] >= 0);
const hAt = (c, r, l) => l ? (hasDeck(c, r) ? DECK[r][c] : 0) : (MAP[r] && MAP[r][c] > 0 ? MAP[r][c] : 0);
const covered = (c, r, l) => !l && hasDeck(c, r); // on the ground floor under a roof
const isWall = (c, r) => inB(c, r) && MAP[r] && MAP[r][c] < 0;
const baseH = (c, r) => (BASE[r] && BASE[r][c] > 0 ? BASE[r][c] : 0);
// outdoor ground rolls in hills: the rules give a height at every square corner. The view adds a faint unevenness where
// the ground is free to roll, so the turf never looks machined; the rules' heights stay as they are
function boardFromRules(B) {
  COLS = B.cols; ROWS = B.rows; MAP = B.map; DECK = B.deck; BASE = B.base; TERR = B.terr; MAXH = B.maxh; SLOPE = null;
  if (!B.slope) return;
  const { h: H, ok, W } = B.slope, h = new Float32Array(H.length), a = rand(0, 6), b = rand(0, 6), d = rand(0, 6);
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) { const k = j * W + i; h[k] = H[k] + (ok[k] ? .06 * (.5 + .5 * Math.sin(i * .95 + a) * Math.cos(j * .8 + b)) * (.65 + .35 * Math.sin((i + j) * .55 + d)) : 0); }
  SLOPE = { h, W };
}
// the slope's rise at a point, between the corners around it
function slopeY(x, z) {
  if (!SLOPE) return 0;
  const fx = x + COLS / 2, fz = z + ROWS / 2, i = Math.max(0, Math.min(COLS - 1, Math.floor(fx))), j = Math.max(0, Math.min(ROWS - 1, Math.floor(fz))), u = fx - i, v = fz - j, H = SLOPE.h, W = SLOPE.W;
  return (H[j * W + i] * (1 - u) + H[j * W + i + 1] * u) * (1 - v) + (H[(j + 1) * W + i] * (1 - u) + H[(j + 1) * W + i + 1] * u) * v;
}
const cellPos = (c, r, l) => new V3(c - (COLS - 1) / 2, TOP + (l ? hAt(c, r, 1) : baseH(c, r)) * STEP + (l ? 0 : slopeY(c - (COLS - 1) / 2, r - (ROWS - 1) / 2)), r - (ROWS - 1) / 2);
// a square's surface as four corners; lift raises it (the grid sits just above the ground); local puts it around the square's centre
function slopeQuadGeo(c, r, lift = 0, size = 1, local = false) {
  const x = c - (COLS - 1) / 2, z = r - (ROWS - 1) / 2, y0 = local ? -slopeY(x, z) : TOP + baseH(c, r) * STEP, hs = size / 2, ox = local ? 0 : x, oz = local ? 0 : z, N = 4;
  const pos = [], uv = [], idx = [];
  for (let jz = 0; jz <= N; jz++) for (let ix = 0; ix <= N; ix++) {
    const dx = -hs + size * ix / N, dz = -hs + size * jz / N;
    pos.push(ox + dx, y0 + lift + slopeY(x + dx, z + dz), oz + dz); uv.push(ix / N, 1 - jz / N);
    if (ix < N && jz < N) { const k = jz * (N + 1) + ix; idx.push(k, k + N + 1, k + 1, k + 1, k + N + 1, k + N + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // shade the ground by its slope so hills read from above: steep faces darker, hilltops a touch brighter
  const nr = g.attributes.normal, col = [];
  for (let i = 0; i < nr.count; i++) { const k = Math.max(.5, 1 - 2.6 * (1 - nr.getY(i))) * (1 + .14 * Math.min(1.5, pos[i * 3 + 1] - y0 - lift)) * (1 + .12 * nr.getX(i)); col.push(k, k, k); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
// large creatures stand on a 2×2 block of squares: c, r is its north-west square. The view measures with these to place
// things; the rules measure for themselves
const sz = q => (q && q.size) || 1;
const gap = (a0, an, b0, bn) => Math.max(0, b0 - (a0 + an - 1), a0 - (b0 + bn - 1));
const covers = (u, c, r) => c >= u.c && c < u.c + sz(u) && r >= u.r && r < u.r + sz(u);
const cellsOf = (q, c = q.c, r = q.r) => { const n = sz(q), o = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) o.push([c + i, r + j]); return o; };
const dist = (a, b) => gap(a.c, sz(a), b.c, sz(b)) + gap(a.r, sz(a), b.r, sz(b)) + ((a.l || 0) !== (b.l || 0) ? Math.max(0, Math.abs(hAt(a.c, a.r, a.l) - hAt(b.c, b.r, b.l)) - 1) : 0);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const angDiff = (a, b) => ((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
// mini style: 'painted' (the art bible's reference: realistic proportions), 'heroic' (faceted low-poly with painted faces),
// 'stylized' (chunky, big heads). All keep the same silhouettes and palette
const STYLES = ['painted', 'heroic', 'stylized'], STYLE_NAME = { heroic: 'Heroic', stylized: 'Stylized', painted: 'Painted' };
let STYLE = 'painted';
try { const v = localStorage.getItem('gc-style-2'); if (STYLES.includes(v)) STYLE = v; } catch (e) { }
let LP = STYLE === 'heroic', ST = STYLE === 'stylized';
const LOWENV = false; // scenery stays painted in every style
const ease = {
  lin: t => t,
  inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
};
// what the player is doing at the table: who is selected, the chosen ability, the camera floor. The battle itself is in G.S
const UI = { hbPage: {}, peek: null, wallDir: 'h', view: 'upper', phase: 'intro', busy: true, sel: null, card: null, aim: null, round: 1, over: false, inspect: null, active: null, order: [], turn: -1, confirm: null, intents: [], fc: new Map() };

// ---------------- tweening ----------------
let now = performance.now();
const tweens = [];
let vnow = 0, ffwd = false; // tweens run on their own clock: tapping while pieces move plays it at speed
function tween(ms, fn, e = ease.inOut) { return new Promise(res => tweens.push({ start: vnow, ms, fn, e, res })); }
const wait = ms => tween(ms, () => {});
function runTweens(ms) {
  if (!UI.busy) ffwd = false;
  // a blow can stop the clock for a beat (hit-stop) or slow it (a killing blow); fast-forward skips both
  let step = Math.min(250, ms);
  if (ffwd) { hitStop = 0; slowT = 0; slowK = 1; }
  if (hitStop > 0) { const s = Math.min(hitStop, step); hitStop -= s; step -= s; }
  if (slowT > 0) { slowT -= ms; step *= slowK; if (slowT <= 0) slowK = 1; }
  vnow += step * (ffwd ? 2.6 : 1);
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; const p = Math.min(1, (vnow - tw.start) / tw.ms);
    tw.fn(tw.e(p));
    if (p >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}

// ---------------- audio ----------------
let AC = null, muted = false, noiseBuf = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return AC;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function noiseHit(t, type, freq, q, peak, dec, sweepTo) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dec);
  const g = AC.createGain(); env(g, t, 0.004, peak, dec); s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t, Math.random() * .5); s.stop(t + dec + .05);
}
function tone(t, type, f0, f1, peak, dec) {
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dec);
  const g = AC.createGain(); env(g, t, 0.006, peak, dec); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dec + .05);
}
let QUIET = false; // set while an undo puts things back, so nothing bursts or clacks
function sfx(type, v = 1) {
  if (muted || QUIET || !AC || AC.state !== 'running') return;
  const t = AC.currentTime;
  switch (type) {
    case 'clack': noiseHit(t, 'bandpass', 2600 + Math.random() * 1200, 4, .5 * v, .05); tone(t, 'square', 1800 + Math.random() * 600, 0, .05 * v, .03); break;
    case 'lift': tone(t, 'sine', 420, 640, .04, .08); break;
    case 'drop': noiseHit(t, 'bandpass', 1500, 3, .35, .06); tone(t, 'sine', 240, 120, .14, .08); break;
    case 'pick': tone(t, 'triangle', 500, 760, .06, .09); break;
    case 'hit': noiseHit(t, 'bandpass', 1100, 2, .5, .08); tone(t, 'sine', 160, 70, .25, .14); break;
    case 'whoosh': noiseHit(t, 'bandpass', 400, 1.5, .25, .28, 2200); break;
    case 'arrow': noiseHit(t, 'highpass', 3000, 1, .15, .18, 6000); break;
    case 'boom': noiseHit(t, 'lowpass', 500, .7, .8, .9, 80); tone(t, 'sine', 90, 30, .5, .7); break;
    case 'frost': [1500, 2100, 2700].forEach((f, i) => tone(t + i * .04, 'sine', f, f * 1.4, .06, .3)); break;
    case 'crit': [660, 880, 1320, 1760].forEach((f, i) => tone(t + i * .06, 'triangle', f, 0, .1, .35)); break;
    case 'heal': [523, 659, 784, 1046].forEach((f, i) => tone(t + i * .08, 'sine', f, 0, .1, .5)); break;
    case 'topple': noiseHit(t, 'bandpass', 900, 2, .4, .1); noiseHit(t + .09, 'bandpass', 1300, 3, .25, .06); noiseHit(t + .16, 'bandpass', 1600, 3, .12, .05); break;
    case 'select': tone(t, 'sine', 700, 940, .05, .07); break;
    case 'taunt': tone(t, 'sawtooth', 110, 90, .12, .35); noiseHit(t, 'bandpass', 300, 2, .2, .3); break;
    case 'horn': tone(t, 'sawtooth', 98, 96, .18, 1.1); tone(t + .05, 'sawtooth', 147, 140, .1, 1); break;
    case 'smoke': noiseHit(t, 'lowpass', 1200, 1, .2, .4, 200); break;
    case 'turn': [392, 523].forEach((f, i) => tone(t + i * .12, 'triangle', f, 0, .09, .5)); break;
    case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(t + i * .1, 'triangle', f, 0, .12, .6)); break;
  }
}

// ---------------- renderer / scene ----------------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .98;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15121a);
scene.fog = new THREE.Fog(0x15121a, 20, 40);
const camera = new THREE.PerspectiveCamera(26, 1, .1, 160);
let camAz = 0, camAzT = 0, zoom = 1, zoomT = 1, follow = null, shakeAmt = 0, camX = 0, camZ = 0, camTX = 0, camTZ = 0;
const VIEWC = 6, VIEWR = 8; // the camera frames this many squares; bigger maps pan
const PITCH = 1.04;

// environment map: a dim crypt with warm torch panels, so metal, gems and dice catch reflections
{
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene(); es.background = new THREE.Color(0x5a7a8a);
  const panel = (r, g, b, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.material.color.setRGB(r, g, b); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  panel(.8, 1, 1.3, 0, 9, 0, 14, 14); panel(1.3, 1.1, .8, 6, 5, 4, 5, 4); panel(.35, .45, .6, -6, 3, -4, 6, 4); panel(.12, .2, .08, 0, -6, 0, 14, 14); panel(.4, .45, .35, 2, 2, -7, 6, 3);
  scene.environment = pm.fromScene(es, .03).texture;
}

// ---------------- textures ----------------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
function speckle(g, w, h, n, amp, maxR = 7) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() * 2 - 1; g.fillStyle = v > 0 ? `rgba(255,240,220,${v * amp})` : `rgba(0,0,0,${-v * amp})`;
    g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * maxR + 1, 0, 7); g.fill();
  }
}
function crack(g, w, h, n, a = .6) {
  g.strokeStyle = `rgba(8,6,12,${a})`; g.lineWidth = 1.6;
  for (let k = 0; k < n; k++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += rand(-24, 24); y += rand(-24, 24); g.lineTo(x, y); } g.stroke(); }
}
function stoneTex(base, moss) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 900, .13); speckle(g, w, h, 2000, .1, 1.5);
    if (moss) { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${60 + Math.random() * 30 | 0},${90 + Math.random() * 40 | 0},40,${rand(.08, .22)})`; g.beginPath(); g.arc(rand(0, w), rand(0, h) * (Math.random() > .5 ? 1 : .3), rand(6, 26), 0, 7); g.fill(); } }
    crack(g, w, h, Math.random() * 3 | 0);
    const gr = g.createRadialGradient(w * .4, h * .35, 20, w * .5, h * .5, w * .75); gr.addColorStop(0, 'rgba(255,230,200,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.offset.set(.5, .5); return t;
}
// the crypt floor beyond the board: big worn slabs a value step darker than the board
const floorTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#15110d'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 36 + Math.random() * 12 | 0; g.fillStyle = `rgb(${v + 6},${v},${v - 8})`;
    const r = 10, X = x * 128 + 5 + rand(-2, 2), Y = y * 128 + 5 + rand(-2, 2), W = 118, H = 118;
    g.beginPath(); g.moveTo(X + r, Y); g.arcTo(X + W, Y, X + W, Y + H, r); g.arcTo(X + W, Y + H, X, Y + H, r); g.arcTo(X, Y + H, X, Y, r); g.arcTo(X, Y, X + W, Y, r); g.fill();
  }
  speckle(g, w, h, 1800, .1); crack(g, w, h, 8);
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
// crypt walls: coursed stone blocks in the World greys
const brickTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#2a231b'; g.fillRect(0, 0, w, h);
  const bh = 32;
  for (let y = 0; y < h; y += bh) { const off = (y / bh) % 2 ? 32 : 0; for (let x = -64; x < w; x += 64) { const v = 70 + Math.random() * 24 | 0; g.fillStyle = `rgb(${v + 8},${v},${v - 10})`; g.fillRect(x + off + 3, y + 3, 58, bh - 6); g.fillStyle = 'rgba(255,240,215,.12)'; g.fillRect(x + off + 3, y + 3, 58, 2); } }
  speckle(g, w, h, 700, .12);
});
brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
const woodTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#5a3a20'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${Math.random() > .5 ? '30,15,5' : '140,95,55'},.35)`; g.lineWidth = rand(1, 3); const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(40, y + rand(-6, 6), 80, y + rand(-6, 6), w, y + rand(-4, 4)); g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
});
function groundTex(dark) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = dark ? '#2a2a20' : '#4a3a2a'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 500, .25, 3);
    for (let i = 0; i < 26; i++) { const v = 60 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v - 4},${v + 4})`; g.beginPath(); g.arc(rand(0, w), rand(0, h), rand(3, 9), 0, 7); g.fill(); }
    for (let i = 0; i < 140; i++) { g.fillStyle = dark ? 'rgba(80,110,50,.7)' : 'rgba(110,130,60,.6)'; g.fillRect(rand(0, w), rand(0, h), 1.5, rand(2, 5)); }
  });
}
const glowTex = canvasTex(64, 64, (g, w) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
}, false);
const smokeTex = canvasTex(64, 64, (g, w) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
}, false);
const blobTex = canvasTex(64, 64, (g, w) => {
  const gr = g.createRadialGradient(32, 32, 8, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
}, false);
const ringTex = canvasTex(256, 256, g => { // two arcs, front heavy, like Fortune's Weave unit markers
  g.shadowColor = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round';
  g.shadowBlur = 14; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 100, Math.PI * .12, Math.PI * .88); g.stroke();
  g.shadowBlur = 8; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 100, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 104); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.22)');
  g.shadowBlur = 0; g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.fill();
}, false);
const hlTex = canvasTex(128, 128, g => {
  const r = 14; g.beginPath(); g.moveTo(6 + r, 6); g.arcTo(122, 6, 122, 122, r); g.arcTo(122, 122, 6, 122, r); g.arcTo(6, 122, 6, 6, r); g.arcTo(6, 6, 122, 6, r); g.closePath();
  g.fillStyle = 'rgba(255,255,255,.6)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
}, false);

// ---------------- lights ----------------
const hemi = new THREE.HemisphereLight(0x8a96b0, 0x2a2420, 0.34); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 1.35); // the moon, on the night maps
sun.position.set(5, 10, 4); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xa8b4c4, 0.45); rim.position.set(-6, 5, -7); scene.add(rim);
const fxLight = new THREE.PointLight(0xff8a3a, 0, 6, 2); scene.add(fxLight);
const lvLight = new THREE.PointLight(0x66ff44, 0, 4, 2); scene.add(lvLight);
const flickers = [];

// ---------------- particles ----------------
const P = [], pools = { add: [], norm: [] };
function spawn(o) {
  const kind = o.smoke ? 'norm' : 'add';
  let s = pools[kind].pop();
  if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.smoke ? smokeTex : glowTex, transparent: true, depthWrite: false, blending: o.smoke ? THREE.NormalBlending : THREE.AdditiveBlending, fog: true })); s.userData.kind = kind; }
  s.material.color.set(o.color || 0xffffff); s.position.copy(o.pos); s.scale.setScalar(o.size || .3); scene.add(s);
  P.push({ s, v: o.vel ? o.vel.clone() : new V3(), life: o.life || 1, age: 0, size: o.size || .3, grow: o.grow ?? 0, g: o.grav ?? 0, op: o.op ?? 1, drag: o.drag ?? 0 });
}
function updateParticles(dt) {
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.age += dt;
    if (p.age >= p.life) { scene.remove(p.s); pools[p.s.userData.kind].push(p.s); P.splice(i, 1); continue; }
    p.v.y -= p.g * dt; if (p.drag) p.v.multiplyScalar(1 - p.drag * dt);
    p.s.position.addScaledVector(p.v, dt);
    const k = p.age / p.life;
    p.s.scale.setScalar(p.size * (1 + p.grow * k));
    p.s.material.opacity = p.op * (k < .12 ? k / .12 : 1 - (k - .12) / .88);
  }
}
function burst(pos, color, n, speed, size, life, opts = {}) {
  if (QUIET) return;
  for (let i = 0; i < n; i++) {
    const d = new V3(rand(-1, 1), rand(opts.up ?? .2, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(.4, 1));
    spawn({ pos: pos.clone().add(new V3(rand(-.08, .08), rand(-.05, .05), rand(-.08, .08))), vel: d, color: Array.isArray(color) ? color[i % color.length] : color, size: size * rand(.6, 1.2), life: life * rand(.6, 1.1), grav: opts.grav ?? 0, grow: opts.grow ?? 0, smoke: opts.smoke, op: opts.op ?? 1, drag: opts.drag ?? 1.5 });
  }
}
const emitters = [];
function emitFlames(dt) {
  for (const e of emitters) {
    e.acc += dt * e.rate;
    while (e.acc > 1) {
      e.acc--;
      spawn({ pos: e.pos.clone().add(new V3(rand(-e.spread, e.spread), 0, rand(-e.spread, e.spread))), vel: new V3(rand(-.08, .08), rand(.5, .9) * e.rise, rand(-.08, .08)), color: e.colors[Math.random() * e.colors.length | 0], size: e.size * rand(.7, 1.2), life: rand(.45, .8), grow: -.6 });
    }
  }
}

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
const flagTex = flagTexture('#5c574d', 64, 56, 150, true), hallTex = flagTexture('#666056', 128, 128, 256, false), basaltTex = basaltTexture('#4a4440', .3), basaltDark = basaltTexture('#26201c', .45);
[keepTex, grassTex, earthTex, lavaTex, carpetTex, flagTex, hallTex, basaltTex, basaltDark].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });

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
  throne: { ground: floorTex, tint: 0xffffff, floor: hallTex, cliff: brickTex, wall: 'brick', grid: .16, hemi: .36 }
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
// the view: 'upper' shows the upper floor solid; 'lower' makes it see-through so the hall below can be played
function setView(v, force) {
  if (!DECK.some(row => row.some(h => h >= 0))) v = 'upper';
  if (UI.view === v && !force) return;
  UI.view = v;
  if (deckGrp) deckGrp.visible = v !== 'lower'; // the upper floor is removed outright, not ghosted
  if (wallsTall) wallsTall.visible = v !== 'lower';
  if (wallsCut) wallsCut.visible = v === 'lower';
  const two = DECK.some(row => row.some(h => h >= 0)); ['#floorBtn', '#menuFloor'].forEach(q => { const b = document.querySelector(q); if (b) { b.hidden = !two; b.classList.toggle('on', v === 'lower'); } });
  const lb = document.querySelector('#floorLbl'); if (lb) lb.textContent = v === 'lower' ? 'Ground floor' : 'Upper floor';
  if (G && units.length) refreshHL();
}
// which floor a piece is best seen from
const viewFor = u => (u && covered(u.c, u.r, u.l) ? 'lower' : 'upper');
// a piece is hidden by the view when it's on the see-through upper floor, or under the solid one
const viewHides = u => (UI.view === 'lower' && u.l === 1) || (UI.view === 'upper' && covered(u.c, u.r, u.l));
function buildBoard(L) {
  disposeGroup(boardGrp); candles.length = 0; nextLight = 0;
  torchLights.forEach(Lt => { Lt.intensity = 0; flickers.find(f => f.L === Lt).base = 0; });
  THEME = THEMES[L.theme || 'crypt'];
  groundMat.map = THEME.ground; groundMat.color.setHex(THEME.tint).convertSRGBToLinear(); groundMat.needsUpdate = true;
  floorMats.forEach(m => { m.map = THEME.floor; m.vertexColors = L.theme === 'outdoor'; m.needsUpdate = true; }); cliffMat.map = THEME.cliff; cliffMat.needsUpdate = true;
  gridMat.opacity = THEME.grid; hemi.intensity = THEME.hemi;
  keepFloorMats.forEach(m => { m.map = L.theme === 'outdoor' ? flagTex : hallTex; m.needsUpdate = true; });
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
      if (inB(nc, nr) && (hasDeck(nc, nr) || TERR[nr][nc] === 'wall' || hAt(nc, nr) > hAt(c, r, 1) - 2)) continue;
      [-.27, .27].forEach(o => block(dTrim, deckMats[3], p.x + dc * .43 + (dr ? o : 0), p.y + .1, p.z + dr * .43 + (dc ? o : 0), dc ? .12 : .22, .2, dr ? .12 : .22));
    }
  }
  deckMats[3].map = trimMat.map;
  [[dTop, .25, .5, false], [dSide, .25, .5, true], [dGrid, 0, 0, false], [dTrim, 0, 0, true]].forEach(([g, kt, ks, cast]) => { mergeFig(g); if (kt) worldUV(g, kt, ks); g.children.forEach(m => { if (m.isMesh) m.castShadow = cast; }); deckGrp.add(g); });
  dGrid.children.forEach(m => { m.receiveShadow = false; m.renderOrder = 1; });
  boardGrp.add(deckGrp);
  bridgeCells.forEach(b => { if (!bridgeCells.some(o => o.c === b.c && o.r === b.r - 1)) { let r1 = b.r; while (bridgeCells.some(o => o.c === b.c && o.r === r1 + 1)) r1++; ropeBridge(deco, b.c, b.r, r1); } });
  const hx = COLS / 2, hz = ROWS / 2;
  ({ outdoor: dressOutdoor, crypt: dressCrypt, lava: dressLava, throne: dressThrone })[L.theme || 'crypt'](walls, deco, hx, hz);
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
function propRoot(c, r) { const g = new THREE.Group(); g.position.copy(cellPos(c, r)); propGroup.add(g); return g; }
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
    if (shape === 'sq') g.strokeRect(0, 0, w, h); else if (shape === 'kite') { g.beginPath(); g.moveTo(128, 5); g.lineTo(20, 97); g.lineTo(128, 251); g.lineTo(236, 97); g.closePath(); g.stroke(); } else { g.beginPath(); g.moveTo(0, 256); g.lineTo(256, 256); g.lineTo(128, 34); g.closePath(); g.stroke(); }
    g.fillStyle = style.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    if (shape === 'sq') { g.font = 'bold 140px "Bricolage Grotesque",sans-serif'; g.fillText(labels[0], 128, 138); }
    else if (shape === 'kite') { g.font = `bold ${String(labels[0]).length > 1 ? 74 : 92}px "Bricolage Grotesque",sans-serif`; g.fillText(labels[0], 128, 112); if (labels[0] === 6 || labels[0] === 9) g.fillRect(104, 158, 48, 8); }
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
      [[P, [.5, .98]], [X, [.08, .62]], [Q, [.5, .02]], [P, [.5, .98]], [Q, [.5, .02]], [Y, [.92, .62]]].forEach(([v, t]) => { pos.push(v.x, v.y, v.z); uv.push(t[0], t[1]); });
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
function buildPiece(kind) {
  const piece = new THREE.Group(); piece.rotation.order = 'YXZ';
  // no base: the figure stands on the board itself, on a pivot that leans it a touch toward the viewer
  const stand = new THREE.Group(); piece.add(stand);
  const fig = new THREE.Group(); stand.add(fig);
  const build = { fighter: buildFighter, cleric: buildCleric, mage: buildMage, thief: buildThief, warg: buildWarg }[kind];
  const sc = kind === 'king' ? 2.3 : kind === 'warg' ? 1.12 : 1.18;
  PMC = new Map(); FIGJ = null;
  let h; try { h = (build ? build(fig) : buildGoblin(fig, kind)) * sc; } finally { PMC = null; }
  fig.updateMatrixWorld(true);
  fig.userData.head = fig.worldToLocal(lastHead.getWorldPosition(new V3())); fig.userData.hs = lastHead.userData.s || 1; fig.userData.turn = lastHead.userData.turn || 0;
  const quad = kind === 'warg';
  const bones = rigFig(fig, quad ? WARG_BONES : humBones(JOINTS[kind] || FIGJ));
  if (ST) fig.scale.set(sc * 1.1, sc * .9, sc * 1.1); else fig.scale.setScalar(sc);
  const rig = { bones, fig, type: quad ? 'quad' : 'hum', gob: isFoe(kind) && !quad, base: { c: 'idle', t: rand(0, 3), spd: 1 }, prev: null, act: null, ikDy: 0, ikL: 0, ikR: 0, ikP: 0 };
  if (!quad) { // each ankle as seen from its shin bone, and the leg's length, for planting feet on slopes
    const J = JOINTS[kind] || FIGJ, v = a => new V3(...a);
    rig.foot = { L: v(J.aL).sub(v(J.kL)), R: v(J.aR).sub(v(J.kR)) };
    rig.sole = { L: J.aL[1] * .85, R: J.aR[1] * .85 }; // ankle height above the sole
    // the lowest edge of a robe or cape, [radius, height, from angle, to angle] (0 = front): it must clear the ground too
    const H = { fighter: [.3, .15, Math.PI - 1.2, Math.PI + 1.2], cleric: [.22, .05, .6, Math.PI * 2], mage: [.23, .04, 0, Math.PI * 2], thief: [.3, .19, Math.PI - 1.1, Math.PI + 1.1], shaman: [.16, .16, 0, Math.PI * 2], king: [.28, .09, Math.PI - 1.3, Math.PI + 1.3] }[kind];
    rig.tilt = ['mage', 'cleric', 'shaman'].includes(kind) ? .45 : .15; // robes lean further into a slope, so the hem lies closer to it
    if (H) { rig.hem = []; for (let i = 0; i <= 8; i++) { const a = H[2] + (H[3] - H[2]) * i / 8; rig.hem.push(new V3(Math.sin(a) * H[0], H[1], Math.cos(a) * H[0])); } }
    rig.leg = { L: (v(J.hL).distanceTo(v(J.kL)) + v(J.kL).distanceTo(v(J.aL))) / 2, R: (v(J.hR).distanceTo(v(J.kR)) + v(J.kR).distanceTo(v(J.aR))) / 2 };
  }
  return { piece, fig, stand, h: ST ? h * .95 + .06 : h, rig };
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

// ---------------- the pieces on the table ----------------
// Each miniature mirrors a unit in the rules, with the same id. A piece keeps what the table has shown so far (where it
// stands, its HP bar, the marks on it), which runs behind the rules while an order's events play back.
const CARDS = GC.CARDS, LEVELS = GC.LEVELS;
const HINTS = { grab: 'Tap a figure <b>beside you</b> to take hold', grabTo: 'Tap a <b>dashed</b> square to move them there', spot: 'Tap a <b>green</b> square, <b>tap again</b> to swing', enemy: 'Tap a <b>red</b> foe, or drag onto one', ally: 'Tap a <b>green</b> hero', cell: 'Tap a square to aim, <b>tap again</b> to cast', self: '<b>Tap it again</b> to use it' };
const ICONS = {
  fighter: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 8v8M9 11h6"/></svg>',
  cleric: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  mage: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  thief: '<svg viewBox="0 0 24 24"><path d="M12 2l2 4v9h-4V6z"/><path d="M7.5 15h9M12 15v6"/></svg>',
  cutter: '<svg viewBox="0 0 24 24"><path d="M5 20L15 10"/><path d="M12 4l8 8-4 2-6-6z"/></svg>',
  archer: '<svg viewBox="0 0 24 24"><path d="M6 3c8 1 14 7 15 15"/><path d="M6 3l15 15M3 21l9-9M3 21v-4M3 21h4"/></svg>',
  warg: '<svg viewBox="0 0 24 24"><ellipse class="f" cx="12" cy="15.5" rx="4" ry="3.5"/><circle class="f" cx="6" cy="10" r="2"/><circle class="f" cx="10" cy="6.2" r="2"/><circle class="f" cx="14" cy="6.2" r="2"/><circle class="f" cx="18" cy="10" r="2"/></svg>',
  shaman: '<svg viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7c0 3 2 4.5 2 7h10c0-2.5 2-4 2-7a7 7 0 0 0-7-7z"/><path d="M10 20v1.5M14 20v1.5"/><circle class="f" cx="9.3" cy="10.5" r="1.6"/><circle class="f" cx="14.7" cy="10.5" r="1.6"/></svg>',
  king: '<svg viewBox="0 0 24 24"><path d="M4 18h16"/><path d="M4.5 18L3 7.5l5 4 4-7 4 7 5-4-1.5 10.5z"/></svg>'
};
const MORE = '<svg class="more" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const lvl = () => LEVELS[Math.min(level, LEVELS.length - 1)];
function renderUnitPanel(u) {
  const el = $('#uwho');
  if (!u || !u.alive) { el.className = 'uwho'; el.innerHTML = `<span class="dim">${UI.phase === 'player' ? 'Tap a hero' : UI.phase === 'intro' || UI.phase === 'over' ? lvl().name : "Goblins' turn"}</span>`; return; }
  const foe = u.side === 'gob';
  el.className = 'uwho' + (foe ? ' gob' : '') + (u.down ? ' down' : '');
  el.innerHTML = `<span class="ubadge ${foe ? 'gob' : ''}"><span>${face(u.kind)}</span></span><span class="nm">${u.name}</span><span class="hpw"><span class="hpn">${u.down ? '<i>Down</i>' : `<i>${u.hp}</i>/${u.maxHp}`}</span><span class="hpb"><i style="width:${u.hp / u.maxHp * 100}%"></i></span></span>${MORE}`;
}
// the turn strip: who acts now and who comes after, with their initiative rolls
function renderTokens() {
  const box = $('#tokens'); box.innerHTML = '';
  const q = UI.order.length ? UI.order.slice(Math.max(0, UI.turn)).map(vu).filter(u => u && u.alive && !u.down && !u.asleep).slice(0, 5) : units.filter(u => u.side === 'hero');
  q.forEach(u => {
    const b = document.createElement('button'), now = u === UI.active;
    b.className = 'tok ' + (u.side === 'gob' ? 'gob' : '') + (now ? ' sel' : '');
    b.setAttribute('aria-label', `${u.name}${u.init ? ', initiative ' + u.init : ''}${now ? ', acting now' : ''}`);
    b.innerHTML = `<span>${face(u.kind)}</span>${u.init ? `<b class="ini">${u.init}</b>` : ''}`;
    b.onclick = () => { ac(); if (UI.over) return; UI.inspect = u; renderDock(); };
    box.appendChild(b);
  });
}
const ST_DESC = { hidden: 'Hidden: cannot be targeted; next attack +2 dice', blessed: 'Blessed: next roll +1 die', hasted: 'Hasted: +1 action next turn', prone: 'Prone: standing up costs an action; hits against it +1 die; toughness −1 step', frozen: 'Frozen: cannot move; no toughness; next hit +1 die', taunt: 'Taunting: goblins must attack; toughness +1 step', rebuked: 'Rebuked: toughness −2 steps' };
function openSheet() {
  const u = UI.inspect || UI.sel || UI.active, L = lvl(), foesLeft = units.filter(x => x.alive && x.side === 'gob').length;
  let html;
  if (u && u.alive && G) {
    const r = ru(u), foe = u.side === 'gob', sts = statusList(u);
    const cards = foe ? '' : `<div class="cs-cards">${u.def.cards.map(id => { const c = CARDS[id], blk = G.block(r, id), [hue, art] = ART[id]; return `<div class="cs-card" style="--hue:${hue}"><svg viewBox="0 0 24 24">${art}</svg><div><b>${c.name}</b><p>${c.text}</p></div><em>${blk && UI.phase === 'player' ? blk : c.cd ? '↻ ' + c.cd : c.cost}</em></div>`; }).join('')}</div>`;
    const note = u.down ? 'Down: Heal raises them. Goblins leave the fallen be.' : foe ? u.def.note : u === UI.active && UI.phase === 'player' ? `${r.ap} action${r.ap === 1 ? '' : 's'} left this turn` : '';
    html = `<div class="cs-head ${foe ? 'gob' : ''}">${PORTRAIT[u.kind] ? `<img class="cs-fig" alt="" src="${PORTRAIT[u.kind].body}">` : `<span class="ubadge ${foe ? 'gob' : ''}"><span>${ICONS[u.kind]}</span></span>`}<div><h2>${u.name}</h2><small>${foe ? (u.def.boss ? 'Goblin King' : 'Foe') : u.def.role}</small></div></div>
      <div class="cs-body"><div class="cs-hp"><i>${u.hp}</i>/ ${u.maxHp}<span class="bar"><b style="width:${u.hp / u.maxHp * 100}%"></b></span></div>
      <div class="cs-stats"><div>Move<b>${G.moveOf(r)}</b></div><div>Die<b>d${u.def.die}</b></div><div>Range<b>${u.def.range}</b></div><div>Tough<b>${G.dieName(G.toughDie(r))}</b></div></div>
      ${sts.length ? `<div class="cs-tags">${sts.map(x => `<span>${ST_DESC[x]}</span>`).join('')}</div>` : ''}${note ? `<p class="cs-note">${note}</p>` : ''}${cards}
      <p class="cs-note">${L.name} · Round ${UI.round} · ${foesLeft} foes left</p>
      <button class="go" id="csClose">Close</button></div>`;
  } else html = `<div class="cs-body"><p class="cs-note">${L.name} · Round ${UI.round} · ${foesLeft} foes left. Tap a unit to see its sheet.</p><button class="go" id="csClose">Close</button></div>`;
  $('#csBody').innerHTML = html; $('#csheet').hidden = false;
  $('#csClose').onclick = () => { $('#csheet').hidden = true; };
}
const ART = {
  f_grab: [28, '<path d="M8.5 12V5.5a1.5 1.5 0 0 1 3 0V11M11.5 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14.5 10.5V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.6 7-6.2 7-2.4 0-4-1.2-5.4-3.2L3.6 14a1.6 1.6 0 0 1 2.5-2L8.5 14"/>'],
  m_icewall: [205, '<path d="M3 20h18"/><path d="M4 20v-9h5v9M9.5 20V7h5v13M15 20v-10h5v10"/><path d="M6 14l1-1M11.5 11l1-1M17 13.5l1-1"/>'],
  f_attack: [356, '<path d="M20 4l-9.5 9.5M20 4h-4M20 4v4M7 13l4 4M5.5 18.5L9 15M3.5 20.5l2-2"/>'],
  f_charge: [356, '<path d="M2 12h13M11 6.5l5.5 5.5-5.5 5.5M18.5 5v14M22 8v8"/>'],
  f_taunt: [138, '<path d="M4 10v4h3l7 5V5L7 10z"/><path d="M17 9l3-2M17 12h4M17 15l3 2"/>'],
  m_attack: [356, '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>'],
  m_fire: [356, '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z"/><path d="M12 22c-2 0-3-1.5-3-3.5 0-2 1.5-3 3-5 1.5 2 3 3 3 5S14 22 12 22z"/>'],
  m_frost: [356, '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/>'],
  c_attack: [356, '<path d="M4 20l9-9"/><circle cx="16" cy="8" r="4"/><path d="M16 1.5v2.5M22.5 8H20M20.6 3.4l-1.8 1.8"/>'],
  c_rebuke: [300, '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M12 6l-1.5 4 3 2-2 3.5 1 3.5"/>'],
  c_heal: [138, '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M12 9.5v6M9 12.5h6"/>'],
  c_bless: [138, '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
  t_attack: [356, '<path d="M12 2l2 4v9h-4V6z"/><path d="M7.5 15h9M12 15v6"/>'],
  t_hide: [138, '<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 21 12a14 14 0 0 1-3 3.6M6.6 6.6A14 14 0 0 0 3 12s3.5 6 9 6a9 9 0 0 0 4-.9"/>'],
  f_cleave: [356, '<path d="M4 20C9 15 12 9 13 3c3 3 5 7 5 11"/><path d="M3 11c3 1 6 1 9 0M15 18c2-1 4-3 5-5"/>'],
  m_wave: [356, '<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15"/>'],
  c_haste: [138, '<path d="M13 3L6 13h5l-1 8 8-11h-5z"/><path d="M2 9h3M1 13h4M3 17h3"/>'],
  t_hook: [205, '<path d="M14 3v8a4 4 0 0 1-8 0V9"/><path d="M4 11l2-2 2 2"/><path d="M14 3c2 0 4 1 5 3M14 3l6 0"/><path d="M14 15v6"/>'],
  t_trick: [356, '<path d="M5 4v10h6l6 3h3v3H5z"/><path d="M14 8l3-3M17 11l3-2"/>']
};

let units = [], level = 0; // units[id] is the piece for the rules' unit with that id
const vu = id => units[id] || null;
const occ = (c, r, l = 0) => units.find(u => u && u.alive && (u.l || 0) === (l || 0) && covers(u, c, r)) || null;
const liveUnits = () => units.filter(u => u && u.alive);
const isFoe = k => GC.UNITS[k].side === 'gob';
const heroes = () => liveUnits().filter(u => u.side === 'hero' && !u.down);
// where a creature stands: its square, or the middle of its block (on the block's highest square)
function posOf(u, c = u.c, r = u.r, l = u.l || 0) {
  if (sz(u) === 1) return cellPos(c, r, l);
  const ps = cellsOf(u, c, r).filter(([x, z]) => inB(x, z)).map(([x, z]) => cellPos(x, z, l)), p = ps.reduce((a, b) => a.add(b), new V3()).multiplyScalar(1 / ps.length);
  p.y = Math.max(...ps.map(q => q.y)); return p;
}

const ringGeo = new THREE.PlaneGeometry(1.08, 1.08), blobGeo = new THREE.PlaneGeometry(1, 1);
const hitGeo = new THREE.CylinderGeometry(.33, .33, 1.1, 8);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
// a piece for the rules' unit r: built off the board (hidden) until it is deployed
function makeUnit(r) {
  const def = GC.UNITS[r.kind], side = def.side;
  const root = new THREE.Group(); scene.add(root);
  const { piece, fig, stand, h, rig } = buildPiece(r.kind); root.add(piece);
  piece.rotation.y = side === 'hero' ? .35 : -.35;
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .03; blob.renderOrder = 1; root.add(blob);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, color: side === 'hero' ? 0xbfcad6 : 0xd0302a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; scene.add(ring);
  const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.y = .55; root.add(hit);
  const tag = document.createElement('div'); tag.className = 'tag ' + side;
  tag.innerHTML = `<div class="fc"></div><div class="hp"><i class="trail"></i><i class="fill"></i></div>` + (side === 'hero' ? '<div class="ap"></div>' : '');
  if (def.boss) tag.classList.add('boss');
  $('#tags').appendChild(tag);
  const u = { id: r.id, kind: r.kind, def, side, name: def.name, hp: r.hp, maxHp: r.maxHp, c: r.c, r: r.r, l: r.l || 0, st: {}, alive: true, down: false, asleep: !!r.asleep, init: 0, deployed: false, root, piece, fig, stand, h, rig, ring, hit, tag, blob, size: r.size || 1, fx: {} };
  root.position.copy(posOf(u));
  if (u.size > 1) { hit.scale.set(2.5, 2, 2.5); hit.position.y = 1.1; blob.scale.setScalar(2.1); }
  if (u.asleep) tag.classList.add('zz');
  piece.visible = false; ring.visible = false; blob.visible = false;
  hit.userData.unit = u; ownMats(u); updateTag(u); resetRig(u);
  units[r.id] = u; return u;
}
// take a piece off the table at once
function dropUnit(u) { u.alive = false; scene.remove(u.root); scene.remove(u.ring); u.tag.remove(); if (UI.sel === u) UI.sel = null; if (UI.inspect === u) UI.inspect = null; }
// each hero owns its paint, with a grey-out uniform, so a fallen hero reads as out of the fight
function greyPatch(u) {
  return sh => {
    sh.uniforms.uGrey = u.grey;
    sh.fragmentShader = 'uniform float uGrey;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  float gry = dot(gl_FragColor.rgb, vec3(.299, .587, .114));\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(gry * .8 + .04), uGrey);');
  };
}
function ownMats(u) {
  if (u.side !== 'hero') return;
  u.grey = u.grey || { value: 0 };
  const seen = new Map();
  const own = m => {
    if (!m.userData || !m.userData.e0) return m;
    if (!seen.has(m)) { const c = m.clone(); c.userData = { ...m.userData, e0: m.userData.e0 }; c.onBeforeCompile = greyPatch(u); seen.set(m, c); }
    return seen.get(m);
  };
  u.piece.traverse(o => { if (o.isMesh && o.material) o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material); });
}
function updateTag(u) {
  const w = Math.max(0, u.hp / u.maxHp * 100) + '%';
  u.tag.querySelector('.fill').style.width = w; u.tag.querySelector('.trail').style.width = w;
  if (u.def.boss) updateBoss();
}
function updateBoss() {
  const k = units.find(u => u && u.def.boss && u.alive);
  $('#boss').hidden = !k || !k.deployed;
  if (k) $('#bossBar').style.width = (k.hp / k.maxHp * 100) + '%';
}
const STATUSES = ['hidden', 'blessed', 'hasted', 'prone', 'frozen', 'taunt', 'rebuked'];
const statusList = u => STATUSES.filter(s => u.st[s]);

// ---------------- status visuals ----------------
function setHidden(u, on) {
  u.st.hidden = on; setBase(u, on ? 'sneak' : restBase(u));
  u.piece.traverse(o => { if (o.isMesh && o.material && o.material.userData.e0) { o.material.transparent = on; o.material.opacity = on ? .32 : 1; o.material.needsUpdate = true; } });
  burst(u.root.position.clone().setY(u.root.position.y + .38), 0x8a8098, 16, .7, .5, 1, { smoke: true, op: .6, grow: 1.2 }); sfx('smoke');
  updateTag(u);
}
function setBlessed(u, on) {
  u.st.blessed = on;
  if (on && !u.fx.bless) { u.fx.bless = glowSprite(0xffd56a, .22); u.piece.add(u.fx.bless); }
  if (!on && u.fx.bless) { u.piece.remove(u.fx.bless); u.fx.bless = null; }
  updateTag(u);
}
// Rebuked: a pale halo over the foe; v is the id of the cleric who laid it on (plus one), and it lifts when her next turn starts
function setRebuked(u, v) {
  u.st.rebuked = v || 0;
  if (v && !u.fx.rebuke) { u.fx.rebuke = glowSprite(0xd8b0ff, .55); u.fx.rebuke.position.y = u.h + .1; u.piece.add(u.fx.rebuke); }
  if (!v && u.fx.rebuke) { u.piece.remove(u.fx.rebuke); u.fx.rebuke = null; }
  updateTag(u);
}
function setTaunt(u, on) {
  u.st.taunt = on;
  if (on && !u.fx.taunt) { u.fx.taunt = glowSprite(0xff3a2a, 1.3); u.fx.taunt.position.y = .55; u.piece.add(u.fx.taunt); }
  if (!on && u.fx.taunt) { u.piece.remove(u.fx.taunt); u.fx.taunt = null; }
  updateTag(u);
}
function setFrozen(u, on) {
  u.st.frozen = on;
  if (on && !u.fx.ice) {
    const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(.36, 1), new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, transparent: true, opacity: .45, roughness: .05, metalness: 0, clearcoat: 1, emissive: 0x1a4a7a, emissiveIntensity: .7, flatShading: true }));
    ice.position.y = .45; ice.scale.set(1, 1.45 * u.h, 1); u.piece.add(ice); u.fx.ice = ice;
    burst(u.root.position.clone().setY(u.root.position.y + .38), [0xbfe8ff, 0x7fc8ff], 20, 1.2, .2, .7);
  }
  if (!on && u.fx.ice) { u.piece.remove(u.fx.ice); u.fx.ice = null; burst(u.root.position.clone().setY(u.root.position.y + .38), [0xdff4ff, 0x9fdcff], 26, 2, .14, .6, { grav: 3 }); }
  updateTag(u);
}
const PRONE_RX = -1.45, PRONE_Y = .07;
// lying down: a figure falls on its back (a warg rolls on its side), shifted so the body lies on its own square
function proneTarget(u) { const q = u.rig && u.rig.type === 'quad', y = u.piece.rotation.y, k = q ? 0 : u.h * .42; return { rx: q ? 0 : PRONE_RX, rz: q ? 1.35 : 0, y: q ? .1 : PRONE_Y, x: Math.sin(y) * k, z: Math.cos(y) * k }; }
function proneNow(u) { const p = proneTarget(u); u.piece.rotation.x = p.rx; u.piece.rotation.z = p.rz; u.piece.position.set(p.x, p.y, p.z); if (u.rig) u.rig.act = { c: 'down', t: 9, spd: 1, hold: true, w: 1, out: false }; }
function setProne(u, on) {
  u.st.prone = on; updateTag(u);
  const p0 = { rx: u.piece.rotation.x, rz: u.piece.rotation.z, x: u.piece.position.x, y: u.piece.position.y, z: u.piece.position.z }, p1 = on ? proneTarget(u) : { rx: 0, rz: 0, x: 0, y: 0, z: 0 };
  if (on) { sfx('topple'); playClip(u, 'down', { hold: true }); burst(u.root.position.clone().setY(u.root.position.y + .03), 0x9a8a78, 10, .6, .35, .7, { smoke: true, op: .5, grow: 1 }); }
  else { sfx('lift'); releaseClip(u); playClip(u, 'land'); }
  return tween(on ? 320 : 280, t => {
    u.piece.rotation.x = p0.rx + (p1.rx - p0.rx) * t; u.piece.rotation.z = p0.rz + (p1.rz - p0.rz) * t;
    u.piece.position.set(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t + (on ? 0 : Math.sin(Math.PI * t) * .12), p0.z + (p1.z - p0.z) * t);
  }, on ? ease.in : ease.out).then(() => { if (on) dust(u.root.position); else sfx('drop'); });
}

// ---------------- chess-piece motion ----------------
function angTo(u, c, r) { const o = (sz(u) - 1) / 2; return Math.atan2(c - u.c - o, r - u.r - o); }
function turnTo(u, c, r) {
  if (c === u.c && r === u.r) return Promise.resolve();
  const a0 = u.piece.rotation.y, d = angDiff(angTo(u, c, r), a0);
  if (Math.abs(d) < .01) return Promise.resolve();
  return tween(90, t => { u.piece.rotation.y = a0 + d * t; }, ease.out);
}
function dust(p) { burst(p.clone().setY(p.y + .04), 0x8a7e72, 6, .55, .22, .5, { smoke: true, op: .4, grow: 1.2, up: 0 }); }
// characters don't rock on a base: a set-down or a blow plays a clip instead
function wobble() { return Promise.resolve(); }
function tiltDir(u, dx, dz) { const y = u.piece.rotation.y; return [dx * Math.sin(y) + dz * Math.cos(y), -(dx * Math.cos(y) - dz * Math.sin(y))]; }
// struck: a flinch, and the body is driven back a little and recovers
function knock(t, dx, dz) {
  if (!t.alive) return;
  if (!t.st.prone) playClip(t, 'hit');
  const x0 = t.piece.position.x, z0 = t.piece.position.z;
  return tween(320, k => { const s = Math.sin(Math.PI * Math.min(1, k * 1.7)) * (k < .3 ? 1 : 1 - (k - .3) / .7 * .4); t.piece.position.x = x0 + dx * .12 * s; t.piece.position.z = z0 + dz * .12 * s; }, ease.out)
    .then(() => { if (!t.alive) return; t.piece.position.x = x0; t.piece.position.z = z0; });
}
async function setDown(u, from) {
  await tween(120, t => u.piece.position.y = from * (1 - t * t), ease.lin);
  u.piece.position.y = 0; sfx('drop'); dust(u.root.position); releaseClip(u); playClip(u, 'land');
}
// run the path: one smooth run, speeding up from a standstill and slowing to a stop, hopping up and down ledges
const levelOf = q => q.l ? hAt(q.c, q.r, 1) : baseH(q.c, q.r), hopAt = (a, b) => (a.l || 0) !== (b.l || 0) || levelOf(a) !== levelOf(b);
async function glide(u, path, speed = 1) {
  if (path.length < 2) return true;
  const pts = path.map(p => posOf(u, p.c, p.r, p.l)), n = pts.length - 1, quad = u.rig && u.rig.type === 'quad';
  const hops = path.slice(1).filter((q, i) => hopAt(path[i], q)).length;
  const wts = path.slice(1).map((q, i) => hopAt(path[i], q) ? 1.3 + Math.abs(pts[i + 1].y - pts[i].y) * 1.6 : 1), cum = [0]; wts.forEach(x => cum.push(cum[cum.length - 1] + x)); const WT = cum[n];
  const per = 250 / speed, dur = WT * per + 160 / speed, r = Math.min(.3, .55 / (WT + .5));
  const prof = t => t < r ? t * t / (2 * r * (1 - r)) : t < 1 - r ? (t - r / 2) / (1 - r) : 1 - (1 - t) * (1 - t) / (2 * r * (1 - r));
  setBase(u, 'run', (quad ? 1.3 : u.rig && u.rig.gob ? 1.9 : 1.6) * speed);
  let seg = -1, inHop = false, lastStep = 0;
  await tween(dur, t => {
    const sW = Math.min(WT - 1e-6, prof(t) * WT); let i = 0; while (i < n - 1 && cum[i + 1] <= sW) i++; const f = (sW - cum[i]) / wts[i], a = pts[i], b = pts[i + 1], pa = path[i], pb = path[i + 1];
    if (i !== seg) {
      seg = i; const hop = hopAt(pa, pb);
      if (hop && !inHop) { inHop = true; sfx('lift'); playClip(u, 'jump', { hold: true }); }
      else if (!hop && inHop) { inHop = false; releaseClip(u); playClip(u, 'land'); sfx('clack', .5); dust(a); }
    }
    const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f;
    let y;
    if (hopAt(pa, pb)) { const e = f * f * (3 - 2 * f); y = a.y + (b.y - a.y) * e + Math.sin(Math.PI * f) * (.16 + Math.abs(b.y - a.y) * .35); }
    else { y = a.y + (b.y - a.y) * f; if (!pa.l && !pb.l) y += slopeY(x, z) - (slopeY(a.x, a.z) * (1 - f) + slopeY(b.x, b.z) * f); }
    u.root.position.set(x, y, z);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z); u.piece.rotation.y += angDiff(yaw, u.piece.rotation.y) * .3;
    if (t - lastStep > .5 / (n + 1)) { lastStep = t; if (!inHop) sfx('clack', .18); }
  }, ease.lin);
  if (inHop) { releaseClip(u); playClip(u, 'land'); }
  const end = path[path.length - 1]; u.c = end.c; u.r = end.r; u.l = end.l || 0;
  u.root.position.copy(pts[n]); setBase(u, u.st.hidden ? 'sneak' : restBase(u)); dust(u.root.position);
  return true;
}
async function dropTo(u, path) {
  const end = path[path.length - 1], b = cellPos(end.c, end.r, end.l), a = u.root.position.clone(), py = u.piece.position.y;
  await tween(110, t => { u.root.position.x = a.x + (b.x - a.x) * t; u.root.position.z = a.z + (b.z - a.z) * t; u.root.position.y = a.y + (b.y - a.y) * t; u.piece.position.y = py + (.3 - py) * t; }, ease.out);
  u.c = end.c; u.r = end.r; u.l = end.l || 0;
  if (path.length > 1) { const p = path[path.length - 2]; const a0 = u.piece.rotation.y; u.piece.rotation.y = a0 + angDiff(Math.atan2(end.c - p.c, end.r - p.r), a0); }
  await setDown(u, .3);
  return true;
}
// each fighter swings their own way
const MELEE = { fighter: 'slash', cutter: 'slash', thief: 'stab', cleric: 'smash', king: 'smash', warg: 'bite' };
// strike: wind up, step in with the blow (resolves as it lands), then step back
async function bump(u, t, amt = .42) {
  await turnTo(u, t.c, t.r);
  const dx = Math.sign(t.c - u.c), dz = Math.sign(t.r - u.r), name = MELEE[u.kind] || 'slash', cl = u.rig ? clipOf(u.rig, name) : { d: .3, hit: .5 }, T = cl.d * 1000, hitT = T * (cl.hit || .5), k0 = .45 * amt;
  const landed = playClip(u, name);
  tween(hitT, k => { const e = Math.max(0, (k - .45) / .55); u.piece.position.x = dx * k0 * e * e; u.piece.position.z = dz * k0 * e * e; }, ease.lin);
  wait(hitT * .62).then(() => sfx('whoosh'));
  await landed;
  tween(T - hitT + 120, k => { u.piece.position.x = dx * k0 * (1 - k); u.piece.position.z = dz * k0 * (1 - k); }, ease.inOut);
}
// shooters draw and loose, casters gather and thrust, everyone else bellows; resolves on the release
function liftShot(u) { return playClip(u, u.kind === 'archer' ? 'shoot' : ['mage', 'cleric', 'shaman'].includes(u.kind) ? 'cast' : 'roar'); }
async function deploy(u, delay = 0) { // each one leaps down onto the field
  await wait(delay);
  u.piece.visible = true; u.piece.position.y = 1.6; u.deployed = true; playClip(u, 'jump', { hold: true });
  await tween(300, t => u.piece.position.y = 1.6 * (1 - t * t), ease.lin);
  u.piece.position.y = 0; u.ring.visible = true; u.blob.visible = true; u.viewFaded = undefined; sfx('drop'); dust(u.root.position); releaseClip(u); playClip(u, 'land');
  if (u.def.boss) { updateBoss(); shake(.2); }
}
function shake(a) { shakeAmt = Math.max(shakeAmt, a); }
function chest(u) { return u.root.position.clone().setY(u.root.position.y + .5); }
async function projectile(from, to, kind) {
  const d = from.distanceTo(to), dur = 150 + d * 45, arc = kind === 'arrow' ? .25 + d * .05 : kind === 'fire' ? .9 + d * .1 : .15;
  let obj;
  if (kind === 'arrow') {
    obj = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .42, 5), M(0x7a5a3a)); shaft.rotation.x = Math.PI / 2; obj.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.03, .08, 5), M(0x999999, .3, .8)); tip.rotation.x = Math.PI / 2; tip.position.z = .24; obj.add(tip); sfx('arrow');
  } else {
    const col = { arcane: 0xb48cff, frost: 0xbfefff, fire: 0xff8a3a, hex: 0xb8d84a, holy: 0xffe08a }[kind];
    obj = glowSprite(col, kind === 'fire' ? .8 : .45); sfx(kind === 'frost' ? 'frost' : 'whoosh');
    fxLight.color.setHex(col);
  }
  scene.add(obj); const prev = from.clone();
  const cols = { arcane: [0xb48cff, 0x7a5aff], frost: [0xbfe8ff, 0x6fc0ff], fire: [0xff7a22, 0xffc04a, 0xff3a0a], hex: [0xb8d84a, 0xe0f07a], holy: [0xffe08a, 0xfff8e0, 0xd8b0ff] }[kind];
  await tween(dur, t => {
    const p = from.clone().lerp(to, t); p.y += Math.sin(Math.PI * t) * arc; obj.position.copy(p);
    if (kind === 'arrow') obj.lookAt(p.clone().add(p.clone().sub(prev))); else {
      fxLight.position.copy(p); fxLight.intensity = kind === 'fire' ? 3 : 1.6;
      for (let i = 0; i < (kind === 'fire' ? 3 : 1); i++) spawn({ pos: p, vel: new V3(rand(-.2, .2), rand(0, .3), rand(-.2, .2)), color: cols[Math.random() * cols.length | 0], size: kind === 'fire' ? .5 : .25, life: .4, grow: -.5 });
    }
    prev.copy(p);
  }, ease.lin);
  scene.remove(obj); fxLight.intensity = 0;
  if (cols && kind !== 'fire') burst(to, cols, 16, 1.6, .2, .5);
}
function explosion(p) {
  burst(p.clone().setY(p.y + .3), [0xffd27a, 0xff8a2a, 0xff4a12], 60, 4, .6, .8, { grav: -.5, drag: 3 });
  burst(p.clone().setY(p.y + .4), 0x2a2224, 18, 1.6, 1.1, 1.6, { smoke: true, op: .7, grow: 1.4, drag: 2 });
  fxLight.color.setHex(0xff7a22); fxLight.position.copy(p).setY(p.y + 1.1);
  tween(600, t => fxLight.intensity = 6 * (1 - t)).then(() => fxLight.intensity = 0);
}

// ---------------- floating text & callouts ----------------
const floats = [];
function floatAt(pos, text, cls, sub, dur = 1100) {
  const el = document.createElement('div'); el.className = 'float ' + cls; el.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  $('#floats').appendChild(el); floats.push({ el, pos: pos.clone(), t0: performance.now(), dur });
}
function floatOn(u, text, cls, sub) { return roResult(u, `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`, cls); }
const shortName = u => u.name.replace(/^Goblin /, '');
function combo(text, cls = '') { roNote(text.replace(/!$/, ''), cls); }
function banner(text, gob) { const b = $('#bannerTxt'); b.textContent = text; b.className = ''; void b.offsetWidth; b.className = 'show' + (gob ? ' gob' : ''); }

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
  const f = { hidden: setHidden, blessed: setBlessed, hasted: setHasted, frozen: setFrozen, taunt: setTaunt }[k];
  return f ? f(u, on) : null;
}
function standNow(u) { u.piece.rotation.x = 0; u.piece.rotation.z = 0; u.piece.position.set(0, 0, 0); resetRig(u); if (u.st.hidden) setBase(u, 'sneak'); }
// a fallen hero: grey, lying where they fell, waiting for a healer
function setDownLook(u, on) {
  u.down = on; u.tag.classList.toggle('down', on); updateTag(u);
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
function missFx(t) { if (!t || !t.alive) return; sfx('whoosh'); roResult(t, `<b>Miss</b>${shortName(t)}`, 'info'); }
function damageFx(e) {
  const t = vu(e.id); if (!t) return;
  const fin = e.amount; t.hp = e.hp; updateTag(t);
  t._ro = roResult(t, `<b>${fin > 0 ? '−' + fin : '0'}</b>${shortName(t)}${e.soak ? `<small>${e.soak} soaked</small>` : ''}`, t.side === 'hero' ? 'hurt' : (e.crit || fin >= 8 ? 'crit' : 'dmg'));
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
  setDownLook(u, true);
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
  if (e.append) addChip(e.append, 'bonus'); // a toughness roll is set beside the attack it answers
  else showRoll(e.label, sides, center.clone().addScaledVector(camToward(), .62).addScaledVector(camRight(), .55));
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
  if (!bigMap()) return; // the whole board is already in view
  const dx = b.x - a.x, dz = b.z - a.z, ca = Math.cos(camAz), sa = Math.sin(camAz);
  const w = Math.abs(dx * ca - dz * sa) + 2.4, h = Math.abs(dx * sa + dz * ca) + 3.2;
  if (aimZoom === null) aimZoom = zoomT;
  follow = null; zoomT = Math.max(aimZoom, Math.min(zoomMax() + .4, Math.max(w / VIEWC, h / VIEWR)));
  camTX = (a.x + b.x) / 2; camTZ = (a.z + b.z) / 2; clampCam();
}
async function aimAt(u, target, kind) {
  if (!target || target === u) return;
  const tp = target.root ? target.root.position : cellPos(target.c, target.r);
  showReticle(target.root ? target : { root: { position: tp }, def: {} }, kind);
  const z0 = zoomT, x0 = camTX, z0c = camTZ; frameTwo(u.root.position, tp);
  const moved = Math.abs(zoomT - z0) > .05 || Math.hypot(camTX - x0, camTZ - z0c) > .6;
  await wait(moved ? 420 : 140);
}
function endAim() { hideReticle(); if (aimZoom !== null) { zoomT = aimZoom; aimZoom = null; } }
// ---------------- the event player ----------------
// The rules settle an order in an instant and return the story of what happened, a list of events. The table plays
// them back one after another, each as animation, dice, sound and text; a handler that returns a promise holds the
// story until it is done.
const PLAY = {
  log: e => logEvent(e.html, e.cls),
  note: e => roNote(e.text, e.cls),
  combo: e => combo(e.text, e.cls),
  float: e => { const u = vu(e.id); if (u) floatOn(u, e.text, e.cls, e.sub); },
  wait: e => wait(e.ms),
  sfx: e => sfx(e.name),
  shake: e => shake(e.amt),
  fx: e => playFx(e),
  face: e => { const u = vu(e.id); return u ? turnTo(u, e.c, e.r) : null; },
  faceDir: e => { const g = vu(e.id); if (!g) return null; const a0 = g.piece.rotation.y, d = angDiff(Math.atan2(e.dir[0], e.dir[1]), a0); return tween(200, t => { g.piece.rotation.y = a0 + d * t; }, ease.out); },
  cast: e => { const u = vu(e.id); if (!u) return null; const p = liftShot(u); return e.wait ? p : null; },
  aim: e => { const u = vu(e.id); return u ? aimAt(u, typeof e.at === 'number' ? vu(e.at) : e.at, e.kind) : null; },
  endAim: () => endAim(),
  status: e => { const u = vu(e.id); return u ? applyStatus(u, e.key, e.on) : null; },
  par: e => Promise.all(e.list.map((evs, i) => wait(i * (e.stagger || 0)).then(() => play(evs)))),
  roll: e => showDice(e),
  total: e => showTotal(e.value, e.suffix || ''),
  verdict: e => verdictFx(vu(e.id), e.kind),
  strike: e => strikeFx(e),
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
  shot: e => shotFx(e),
  sweep: e => sweepFx(e),
  heal: e => healFx(e),
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
    faceViewer(u);
    if (r.ap <= 0 || !G.up(r)) UI.card = null;
    else if (UI.card && G.block(r, UI.card)) UI.card = u.def.cards[0];
  }
  computeIntents(); refresh(); renderTools();
  // the turn passes on by itself once the hero has no actions left (or has fallen)
  if (mine && (r.ap <= 0 || !G.up(r))) setTimeout(() => { const r2 = G.U(u.id); if (UI.phase === 'player' && !UI.busy && !UI.over && UI.active === u && (r2.ap <= 0 || !G.up(r2))) endTurn(); }, 450);
}
function setSel(u, quiet) {
  UI.peek = null; UI.sel = u; UI.aim = null; UI.inspect = null;
  const r = u && G.U(u.id);
  UI.card = u && u.side === 'hero' && r && r.ap > 0 && G.up(r) ? u.def.cards[0] : null;
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
  setSel(UI.active, true); computeIntents(); renderTools(); renderDock();
}

// ---------------- the end of a battle ----------------
let endAction = null;
function steps(el) { $(el).innerHTML = LEVELS.map((_, i) => `<i class="${i < level ? 'done' : i === level ? 'now' : ''}"></i>`).join(''); }
const listOf = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
// the tally of the battle: what each hero dealt, finished, healed and took; the best of them is named
function report() {
  const st = G.S.stats, hs = units.filter(u => u && u.side === 'hero' && st[u.id]);
  const score = h => { const s = st[h.id]; return s.dealt + s.healed * 1.2 + s.kills * 3 - s.downs * 4; };
  const mvp = hs.reduce((a, b) => score(b) > score(a) ? b : a, hs[0]);
  return `<table class="rep"><tr><th></th><th>Dealt</th><th>Kills</th><th>Healed</th><th>Taken</th><th>Down</th></tr>${hs.map(h => { const s = st[h.id]; return `<tr${h === mvp ? ' class="mvp"' : ''}><td><div class="rnm"><span class="rf">${face(h.kind)}</span><span class="rn">${h.name.replace('Sister ', '')}</span>${h === mvp ? '<em title="Best in battle">★</em>' : ''}</div></td><td>${s.dealt}</td><td>${s.kills}</td><td>${s.healed}</td><td>${s.taken}</td><td>${s.downs}</td></tr>`; }).join('')}</table><p class="repn">★ Best in battle: most harm dealt and healed</p>`;
}
function gameOver(win) {
  UI.over = true; UI.phase = 'over'; UI.sel = null; UI.card = null; UI.active = null; UI.inspect = null; UI.intents = []; refresh();
  if (win) heroes().forEach((h, i) => wait(300 + i * 140).then(() => { faceViewer(h); playClip(h, 'cheer'); }));
  const last = level === LEVELS.length - 1, rounds = G.S.round, L = LEVELS[level], rep = report();
  setTimeout(async () => {
    const sc = DLG.scenes[level]; await talk(sc && (win ? sc.win : sc.lose));
    const t = $('#endTitle'), btn = $('#againBtn');
    const up = heroes().map(h => h.name), down = units.filter(h => h && h.side === 'hero' && h.alive && h.down).map(h => h.name);
    if (win) level++;
    steps('#endSteps');
    if (win && last) {
      t.textContent = 'The Goblin King Falls'; t.className = 'win';
      $('#endText').textContent = `Grubnash's crown rolls across the flagstones and the crypt is yours. ${listOf(up)} walk${up.length === 1 ? 's' : ''} out into the daylight${down.length ? `, carrying ${listOf(down)}` : ''}.`;
      btn.textContent = 'New campaign'; endAction = () => loadLevel(0); sfx('win');
    } else if (win) {
      t.textContent = 'Victory'; t.className = 'win';
      $('#endText').textContent = `${L.name} is cleared in ${rounds} round${rounds > 1 ? 's' : ''}. ${down.length ? `${listOf(down)} ${down.length > 1 ? 'are' : 'is'} carried from the field and back on their feet by nightfall. ` : ''}The party rests, binds its wounds and heads deeper. ${LEVELS[level].name} lies ahead.`;
      btn.textContent = 'Next battle'; endAction = () => loadLevel(level); sfx('crit');
    } else {
      const n = units.filter(u => u && u.alive && u.side === 'gob').length;
      t.textContent = 'The Party Has Fallen'; t.className = 'lose';
      $('#endText').textContent = `The goblins hold ${L.name}. ${n} foe${n === 1 ? '' : 's'} still stand${n === 1 ? 's' : ''}. Regroup and try this battle again.`;
      btn.textContent = 'Retry battle'; endAction = () => loadLevel(level); sfx('taunt');
    }
    $('#endReport').innerHTML = rep;
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
  return `<b>${shortName(t)}</b>: hit <b>${pct(1 - f.miss)}</b> · ~${f.avg.toFixed(1)} damage${f.kill >= .01 ? ` · KO <b>${pct(f.kill)}</b>` : ''}${f.tough ? ` · toughness d${f.tough}` : ''}`;
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
  const pg = hbPageOf(h), ids = h.def.cards;
  $('#pgNum').textContent = pg + 1; $('#hbPager').setAttribute('aria-label', `Hotbar ${pg + 1} of ${HB_PAGES}`);
  for (let i = 0; i < HB_SLOTS; i++) {
    const id = ids[pg * HB_SLOTS + i];
    if (!id) { const e = document.createElement('div'); e.className = 'hk empty'; e.setAttribute('aria-hidden', 'true'); e.innerHTML = `<span class="key">${i + 1}</span>`; bar.appendChild(e); continue; }
    const c = CARDS[id], block = G.block(hr, id), [hue, art] = ART[id], cd = hr.cd[id] > 0 ? hr.cd[id] : 0;
    const b = document.createElement('button'); b.className = 'hk' + (UI.card === id ? ' sel' : '') + (block ? ' off' : ''); b.style.setProperty('--hue', hue); b.dataset.id = id;
    b.setAttribute('aria-label', `${i + 1}: ${c.name}. ${c.text}${block ? ' (' + block + ')' : ''}`); b.setAttribute('aria-pressed', UI.card === id ? 'true' : 'false');
    b.innerHTML = `<span class="ic"><svg viewBox="0 0 24 24">${art}</svg></span><span class="key">${i + 1}</span>${c.die ? `<span class="dv">d${c.die}</span>` : ''}${cd ? `<span class="cd">${cd}</span>` : ''}`;
    b.onclick = () => { if (!hbSwiped) hotTap(h, id); };
    bar.appendChild(b);
  }
  const show = UI.peek && ids.includes(UI.peek) ? UI.peek : UI.card, focus = UI.fcFocus != null && UI.fc.has(UI.fcFocus) ? fcLine(UI.fcFocus) : '';
  if (show) {
    const c = CARDS[show], blk = G.block(hr, show);
    const meta = [c.cost, c.target === 'self' ? 'Self' : c.range > 1 || c.reach ? `Range ${G.reachOf(hr, c)}` : 'Melee', c.cd ? `Cooldown ${c.cd}` : ''].filter(Boolean).join(' · ');
    box.innerHTML = `<span class="tx"><b>${c.name}</b><span class="mt">${meta}</span></span><span class="tx2">${focus ? `<span class="odds">${focus}</span>` : `${blk ? `<em class="bl">${blk}.</em> ` : ''}${c.text}${!blk && hint ? ` <i>${hint}</i>` : ''}`}</span>`;
  } else box.innerHTML = `<span class="tx2">${hint || ''}</span>`;
  measure();
}
// a tap on a hotbar button: choose it; a second tap uses a self ability; a blocked one shakes and says why
// 30 slots: five hotbars of six, paged with the arrows beside the bar, a sideways swipe on it, or [ and ]
const HB_SLOTS = 6, HB_PAGES = 5;
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
  UI.card = id; UI.aim = null; UI.fcFocus = null; sfx('pick'); refresh();
}
window.addEventListener('keydown', e => { // 1–6 pick abilities, Escape puts the chosen one down
  const h = myHero(); if (e.ctrlKey || e.metaKey || e.altKey || !h) return;
  const k = +e.key, id = k >= 1 && k <= HB_SLOTS ? h.def.cards[hbPageOf(h) * HB_SLOTS + k - 1] : null; if (id) { e.preventDefault(); hotTap(h, id); }
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
    unit = (tg && cand.find(x => tg.has(x.id))) || cand[0] || null;
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
    camAzT += da; camAz += da; zoom = zoomT = Math.max(.6, Math.min(zoomMax(), zoom * gest.d / Math.max(20, d)));
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
const zoomMax = () => bigMap() ? 2 : 1.4;
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
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = zoomT = Math.max(.6, Math.min(zoomMax(), zoom * (1 + e.deltaY * .001))); }, { passive: false });

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
$('#barkBtn').onclick = () => { ac(); showBarks = !showBarks; $('#barkBtn').classList.toggle('on', showBarks); try { localStorage.setItem('gc-barks', showBarks ? '1' : '0'); } catch (e) { } sfx('select'); };
$('#muteBtn').onclick = () => { ac(); muted = !muted; $('#muteBtn').classList.toggle('on', !muted); };
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
$('#restartBtn').onclick = () => { setMenu(false); $('#settings').hidden = true; $('#end').hidden = true; loadLevel(level); };
$('#uwho').onclick = () => { ac(); openSheet(); };
$('#csheet').onclick = e => { if (e.target.id === 'csheet') $('#csheet').hidden = true; };
$('#endBtn').onclick = () => {
  ac(); if (UI.busy || UI.phase !== 'player' || UI.over) return;
  const h = UI.active, ap = h ? ru(h).ap : 0; if (!h || ap <= 0) { endTurn(); return; }
  $('#cfText').innerHTML = `<b>${h.name}</b> still has ${ap} action${ap > 1 ? 's' : ''}.`;
  $('#confirm').hidden = false; sfx('select');
};
$('#rotBtn').onclick = () => { ac(); UI.wallDir = UI.wallDir === 'v' ? 'h' : 'v'; sfx('pick'); refresh(); }; // turn the ice wall across or down
$('#cfEnd').onclick = () => { $('#confirm').hidden = true; endTurn(); };
$('#cfBack').onclick = () => { $('#confirm').hidden = true; sfx('pick'); };
$('#confirm').onclick = e => { if (e.target.id === 'confirm') $('#confirm').hidden = true; };
$('#helpBtn').onclick = () => { setMenu(false); $('#help').hidden = false; };
$('#settingsBtn').onclick = () => { ac(); setMenu(false); $('#settings').hidden = false; sfx('select'); };
$('#settingsClose').onclick = () => { $('#settings').hidden = true; };
$('#settings').onclick = e => { if (e.target.id === 'settings') $('#settings').hidden = true; };
$('#menuUndo').onclick = () => { setMenu(false); ac(); undoMove(); };
$('#menuFloor').onclick = () => { setMenu(false); ac(); sfx('select'); setView(UI.view === 'lower' ? 'upper' : 'lower'); };
$('#menuView').onclick = () => {
  setMenu(false); ac(); sfx('select'); follow = null;
  camAzT = camAz - angDiff(camAz, baseAz()); zoomT = 1;
  const u = bigMap() ? (UI.sel || UI.active || heroes()[0]) : null; camTX = u ? u.root.position.x : 0; camTZ = u ? u.root.position.z : 0; zoom = Math.max(zoom, .999); clampCam();
};
$('#menuLog').onclick = () => { setMenu(false); ac(); renderLog(); $('#logv').hidden = false; $('#logList').scrollTop = 1e6; };
$('#logClose').onclick = () => { $('#logv').hidden = true; };
$('#logv').onclick = e => { if (e.target.id === 'logv') $('#logv').hidden = true; };
$('#helpClose').onclick = () => { ac(); $('#help').hidden = true; };
$('#againBtn').onclick = () => { ac(); $('#end').hidden = true; if (endAction) endAction(); };
$('#introGo').onclick = async () => {
  ac(); $('#intro').hidden = true;
  const order0 = liveUnits().sort((a, b) => (a.side === b.side ? 0 : a.side === 'hero' ? -1 : 1));
  await Promise.all(order0.map((u, i) => deploy(u, i * 110)));
  await wait(450);
  defaultView(); await wait(650); // ease in from the set-up shot
  await talk(DLG.scenes[level] && DLG.scenes[level].before);
  UI.busy = false; order(() => G.begin(), true);
};

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

// ---------------- campaign / hot reload ----------------
function clearBoard() {
  units.forEach(u => { if (!u) return; scene.remove(u.root); scene.remove(u.ring); u.tag.remove(); });
  units = [];
  [...burnFx.keys()].forEach(clearBurnFx);
  floats.splice(0).forEach(f => f.el.remove()); bubbles.splice(0).forEach(b => b.el.remove());
  liveDice.splice(0).forEach(d => scene.remove(d));
  while (propGroup.children.length) propGroup.remove(propGroup.children[0]);
  levelEmit.splice(0).forEach(e => { const i = emitters.indexOf(e); if (i >= 0) emitters.splice(i, 1); });
  lvLight.userData.base = 0; lvLight.intensity = 0;
  [...ICE.keys()].forEach(k => removeIceFx(k)); hideArrow(); hideRoll(); tweens.length = 0; clearSmashFx();
  hitStop = 0; slowT = 0; slowK = 1; kick = 0;
}
// set-up shot: pulled back over the middle so the whole map is in frame while the pieces land
function overview(now) {
  follow = null; camAzT = camAz - angDiff(camAz, baseAz()); camTX = 0; camTZ = 0;
  zoomT = Math.max(1, Math.min(COLS / VIEWC, 3) * 1.04, (ROWS / VIEWR) * 1.04);
  if (now) { camAz = camAzT; camX = camTX; camZ = camTZ; zoom = zoomT; }
}
// play view: default distance, framed on the party with a little room toward the foes
function defaultView(now) {
  const hs0 = units.filter(u => u && u.side === 'hero' && u.alive); if (!hs0.length) return;
  follow = null; zoomT = 1;
  camTX = hs0.reduce((a, u) => a + u.root.position.x, 0) / hs0.length; camTZ = hs0.reduce((a, u) => a + u.root.position.z, 0) / hs0.length - 1.5; clampCam();
  if (!bigMap()) { camTX = 0; camTZ = 0; }
  if (now) { camX = camTX; camZ = camTZ; zoom = zoomT; }
}
// lay out a battle: the rules make a fresh state (or take a saved one), the table builds the diorama and the pieces
function loadLevel(i, saved) {
  level = i; const L = LEVELS[i];
  clearBoard();
  G = GC.battle(saved || GC.newState(i));
  boardFromRules(G.B); buildBoard(L); buildHL();
  (L.props || []).forEach(([type, c, r]) => PROPS[type](c, r));
  const [hs, hg, sc, si, bg] = L.art.sky;
  hemi.color.setHex(hs); hemi.groundColor.setHex(hg); sun.color.setHex(sc); sun.intensity = si; scene.fog.color.setHex(bg); scene.background.setHex(bg);
  G.S.units.forEach(r => { if (r.alive) makeUnit(r); });
  overview(true);
  combatLog.length = 0; undoStack.length = 0;
  Object.assign(UI, { phase: 'intro', busy: true, sel: null, card: null, aim: null, round: 1, over: false, inspect: null, active: null, order: [], turn: -1, confirm: null, intents: [], fcFocus: null });
  UI.fc.clear();
  $('#boss').hidden = true;
  updateHud(); measure(); renderDock();
  if (saved && G.S.phase === 'player') { // back from a reload: straight to the hero whose turn it was
    try {
      liveUnits().forEach(showNow);
      QUIET = true; try { sync(); } finally { QUIET = false; }
      UI.round = G.S.round; UI.order = G.S.order.slice(); UI.turn = G.S.turn;
      G.S.units.forEach(r => { const u = vu(r.id); if (u) u.init = r.init; });
      UI.active = vu(G.S.active); UI.phase = 'player'; UI.busy = false;
      defaultView(true); updateBoss(); updateHud(); renderTokens(); setSel(UI.active, true); computeIntents(); refresh();
      return;
    } catch (e) { console.error(e); return loadLevel(i); }
  }
  showIntro();
}
function showIntro() {
  const L = LEVELS[level];
  steps('#introSteps');
  $('#introKick').textContent = level === LEVELS.length - 1 ? `Battle ${level + 1} of ${LEVELS.length} · Boss` : `Battle ${level + 1} of ${LEVELS.length}`;
  $('#introTitle').textContent = L.name; $('#introText').textContent = L.text;
  const counts = {}; L.foes.forEach(([k]) => counts[k] = (counts[k] || 0) + 1);
  $('#introFoes').innerHTML = Object.entries(counts).map(([k, n]) => { const d = GC.UNITS[k]; return `<span class="${d.boss ? 'boss' : ''}">${n > 1 ? n + '× ' : ''}${d.name}${d.title ? ' ' + d.title : ''}</span>`; }).join('');
  $('#introGo').textContent = level === 0 ? 'Set up the board' : 'To battle';
  $('#intro').hidden = false;
}
// a reload keeps the battle if it is the player's move; otherwise it starts the battle again
function snapshot() {
  if (!G || UI.phase !== 'player' || UI.busy || UI.over) return { level: Math.min(level, LEVELS.length - 1) };
  return { v: 2, level, state: G.snapshot() };
}
function start(data) {
  resize();
  applyEnvStyle(); $('#styleLbl').textContent = STYLE_NAME[STYLE]; $('#intentBtn').classList.toggle('on', showIntents); $('#barkBtn').classList.toggle('on', showBarks);
  makePortraits();
  const lv = data && Number.isInteger(data.level) && LEVELS[data.level] ? data.level : 0;
  let saved = null;
  if (data && data.v === 2 && typeof data.state === 'string') { try { saved = JSON.parse(data.state); if (saved.v !== 2 || saved.level !== lv) saved = null; } catch (e) { saved = null; } }
  loadLevel(lv, saved);
  requestAnimationFrame(frame);
}
try { window.claude?.hot?.snapshot?.(snapshot); } catch (e) { }
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
