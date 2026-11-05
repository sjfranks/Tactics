// =====================================================================================================================
// GOBLIN CRYPT · THE TABLE
// Everything you see and hear: the diorama, the miniatures, the dice, the sound and the HUD. The view decides nothing.
// The rules (GC, in the script above) own the battle: the view asks them what a hero may do, sends the player's orders
// to them, and plays back the events each order returns. G is the battle on the table.
// =====================================================================================================================
'use strict';
const $ = s => document.querySelector(s);
const ovOpen = () => [...document.querySelectorAll('.ov')].some(o => !o.hidden); // a screen or sheet covers the table
const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })(); // the player asks for less motion
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
const UI = { hbScroll: {}, peek: null, wallDir: 'h', view: 'upper', phase: 'intro', busy: true, sel: null, card: null, aim: null, round: 1, over: false, inspect: null, active: null, order: [], turn: -1, confirm: null, intents: [], fc: new Map() };

// ---------------- tweening ----------------
let now = performance.now();
const tweens = [];
// tweens run on their own clock: tapping while pieces move plays it at speed (ffwd); FAST is the Game speed setting
let vnow = 0, ffwd = false, FAST = false, TIME_SCALE = 1; // TIME_SCALE: tools/test.js plays the table faster with it
try { FAST = localStorage.getItem('gc-fast') === '1'; } catch (e) { }
function tween(ms, fn, e = ease.inOut) { return new Promise(res => tweens.push({ start: vnow, ms, fn, e, res })); }
const wait = ms => tween(ms, () => {});
function runTweens(ms) {
  if (!UI.busy) ffwd = false;
  // a blow can stop the clock for a beat (hit-stop) or slow it (a killing blow); fast-forward skips both
  let step = Math.min(250, ms);
  if (ffwd) { hitStop = 0; slowT = 0; slowK = 1; }
  if (hitStop > 0) { const s = Math.min(hitStop, step); hitStop -= s; step -= s; }
  if (slowT > 0) { slowT -= ms; step *= slowK; if (slowT <= 0) slowK = 1; }
  vnow += step * (ffwd ? 2.6 : 1) * (FAST ? 1.7 : 1) * TIME_SCALE;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; const p = Math.min(1, (vnow - tw.start) / tw.ms);
    tw.fn(tw.e(p));
    if (p >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}

// ---------------- audio ----------------
let AC = null, muted = false, noiseBuf = null;
try { muted = localStorage.getItem('gc-mute') === '1'; } catch (e) { }
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

// ---------------- music: a slow, quiet score for each place, made on the fly ----------------
// A drone and a soft pad change chord every two bars, and now and then a plucked note rings out in the place's mode;
// the throne room adds a war drum once the battle is on. It is all oscillators: nothing to download.
let musicOn = true;
try { musicOn = localStorage.getItem('gc-music') !== '0'; } catch (e) { }
const SCORE = { // root: MIDI note · mode: the scale · chords: the scale degree each two bars sits on
  outdoor: { root: 45, mode: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 3, 4], bpm: 66, pad: 'triangle', pluck: 'triangle' },
  crypt: { root: 41, mode: [0, 1, 3, 5, 7, 8, 10], chords: [0, 1, 5, 0], bpm: 56, pad: 'sawtooth', pluck: 'sine' },
  lava: { root: 40, mode: [0, 1, 4, 5, 7, 8, 10], chords: [0, 1, 0, 6], bpm: 60, pad: 'sawtooth', pluck: 'square' },
  throne: { root: 38, mode: [0, 2, 3, 5, 7, 8, 11], chords: [0, 5, 6, 4], bpm: 72, pad: 'sawtooth', pluck: 'triangle', drum: true }
};
let musicTheme = null, musicBus = null, musicNext = 0, musicStep = 0;
const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
function setMusic(theme) { if (theme === 'house') theme = 'outdoor'; musicTheme = SCORE[theme] ? theme : 'crypt'; musicStep = 0; }
function musicVoice(t, type, f, peak, att, dur, cut) {
  const o = AC.createOscillator(), g = AC.createGain(), fl = AC.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(f, t); fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = .5;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + .05);
}
function warDrum(t, peak) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(46, t + .25);
  g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .35); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + .4);
}
function musicTick() {
  if (!AC || AC.state !== 'running' || !musicTheme) return;
  if (!musicBus) { musicBus = AC.createGain(); musicBus.gain.value = 0; musicBus.connect(AC.destination); }
  const on = musicOn && !muted && !document.hidden; musicBus.gain.setTargetAtTime(on ? 1 : 0, AC.currentTime, .6);
  if (!on) { musicNext = 0; return; }
  const sc = SCORE[musicTheme], beat = 60 / sc.bpm / 2; // eighth notes
  if (musicNext < AC.currentTime) musicNext = AC.currentTime + .05;
  const note = (d, oct = 0) => sc.root + sc.mode[((d % 7) + 7) % 7] + 12 * (oct + Math.floor(d / 7));
  while (musicNext < AC.currentTime + .4) {
    const t = musicNext, st = musicStep++, deg = sc.chords[Math.floor(st / 16) % sc.chords.length];
    if (st % 16 === 0) { // a new chord: a root drone under a soft three-note pad
      musicVoice(t, 'sine', midiHz(note(deg, -1)), .05, 1.2, beat * 16 + 1.5, 400);
      [0, 2, 4].forEach((k, i) => musicVoice(t + i * .06, sc.pad, midiHz(note(deg + k, 1)), .012, 1.8, beat * 16 + 1, 900));
    }
    if (st % 2 === 0 && Math.random() < .22) musicVoice(t, sc.pluck, midiHz(note(deg + [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)], 2)), .018, .01, 1.4, 2400);
    if (sc.drum && (st % 8 === 0 || st % 8 === 5) && UI.phase !== 'intro' && !UI.over) warDrum(t, st % 8 === 0 ? .09 : .05);
    musicNext += beat;
  }
}
setInterval(musicTick, 150);

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
const camera = new THREE.PerspectiveCamera(34, 1, .1, 160);
let camAz = 0, camAzT = 0, zoom = 1, zoomT = 1, follow = null, shakeAmt = 0, camX = 0, camZ = 0, camTX = 0, camTZ = 0;
const VIEWC = 6, VIEWR = 8; // the camera frames this many squares; bigger maps pan
// the play view: straight up the board from the party's side, 57° above it, close in on the fight. A close-up drops
// lower and swings side-on (camPitch, camY: the height the camera looks at)
const PITCH = 1, CLOSE_PITCH = .5;
let camPitch = PITCH, camPitchT = PITCH, camY = .1, camYT = .1;
// the play view's distance, as a share of the one that fits a whole 6 × 8 board
const playZoom = () => 1; // the whole 6 × 8 board stays in view, on any screen (a bigger map pans)

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

