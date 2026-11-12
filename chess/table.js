'use strict';
// TACTICS CHESS · THE TABLE. A three.js diorama in the Goblin Crypt style over the rules in rules.js (TC).
// The rules decide everything; the table shows what happens and turns taps into orders.
(() => {
  const $ = (s) => document.querySelector(s);
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const rand = (a, b) => a + Math.random() * (b - a);
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const pct = (c) => Math.round(c * 100) + '%';
  const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  let S = null; // the rules' state
  const UI = {
    sel: null,          // the selected piece's id
    picked: null,       // a piece the player tapped on purpose (kept selected even with nothing left to do)
    mode: 'attack',     // what the hotbar has chosen: attack | grapple
    setupType: 'king',  // what a tap in the setup zone places
    ai: { white: false, black: true },
    busy: false,        // something is playing out; input waits
    aim: null,          // a strike waiting for Confirm?: { target, x, y, path, kind }
    hide: null,         // a side whose pieces are hidden while the other sets up
    hover: null,        // the square under the mouse
    focus: null,        // the foe whose odds the info line shows
    log: [],
    sound: true,
    army: { king: 1, pawn: 8 },
  };

  // ---------------- renderer, scene, camera ----------------
  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0908);
  scene.fog = new THREE.Fog(0x0b0908, 20, 38);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  { // a dim hall with warm torch panels, so the minis and dice catch reflections
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.background = new THREE.Color(0x4a5a66);
    const panel = (r, g, b, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.material.color.setRGB(r, g, b); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    panel(.8, 1, 1.3, 0, 9, 0, 14, 14); panel(1.4, 1.1, .7, 6, 5, 4, 5, 4); panel(.35, .45, .6, -6, 3, -4, 6, 4); panel(.12, .1, .08, 0, -6, 0, 14, 14);
    scene.environment = pm.fromScene(es, 0.03).texture;
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
  function crack(g, w, h, n, a = 0.5) {
    g.strokeStyle = `rgba(8,6,4,${a})`; g.lineWidth = 1.6;
    for (let k = 0; k < n; k++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += rand(-22, 22); y += rand(-22, 22); g.lineTo(x, y); } g.stroke(); }
  }
  function slabTex(base) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 800, 0.12); speckle(g, w, h, 1800, 0.09, 1.5); crack(g, w, h, Math.random() * 3 | 0);
      const gr = g.createRadialGradient(w * 0.4, h * 0.35, 20, w * 0.5, h * 0.5, w * 0.75); gr.addColorStop(0, 'rgba(255,230,200,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    });
  }
  const lightTex = [0, 1, 2].map(() => slabTex('#8b7d66'));
  const darkTex = [0, 1, 2].map(() => slabTex('#3b322a'));
  const floorTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#15110d'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 34 + Math.random() * 12 | 0; g.fillStyle = `rgb(${v + 6},${v},${v - 8})`; g.fillRect(x * 128 + 5, y * 128 + 5, 118, 118); }
    speckle(g, w, h, 1800, 0.1); crack(g, w, h, 8);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 8);
  const woodTex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#3a2414'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${Math.random() > 0.5 ? '20,10,4' : '120,80,45'},.35)`; g.lineWidth = rand(1, 3); const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + rand(-5, 5), 160, y + rand(-5, 5), w, y + rand(-3, 3)); g.stroke(); }
  });
  const glowTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, false);
  const blobTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 8, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, false);
  // a square marker: a rounded slab of light with a bright rim
  const hlTex = canvasTex(128, 128, (g) => {
    const r = 14; g.beginPath(); g.moveTo(8 + r, 8); g.arcTo(120, 8, 120, 120, r); g.arcTo(120, 120, 8, 120, r); g.arcTo(8, 120, 8, 8, r); g.arcTo(8, 8, 120, 8, r); g.closePath();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke();
  }, false);
  // the piece's ground mark: a ring, heavy at the front, and an arrow out of it the way the piece faces
  const facingTex = canvasTex(256, 256, (g) => {
    const shapes = (ink, extra) => {
      g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = 13 + extra; g.beginPath(); g.arc(128, 128, 90, -Math.PI * 0.82, -Math.PI * 0.18); g.stroke();
      g.lineWidth = 5 + extra; g.beginPath(); g.arc(128, 128, 90, Math.PI * 0.22, Math.PI * 0.78); g.stroke();
      g.lineWidth = extra || 1; g.beginPath(); g.moveTo(128, 0); g.lineTo(176, 50); g.lineTo(146, 46); g.lineTo(146, 64); g.lineTo(110, 64); g.lineTo(110, 46); g.lineTo(80, 50); g.closePath(); g.fill(); if (extra) g.stroke();
    };
    shapes('rgba(0,0,0,.85)', 8); shapes('#fff', 0);
  }, false);
  // a big arrow on the ground for choosing a facing
  const arrowTex = canvasTex(128, 128, (g) => {
    const path = () => { g.beginPath(); g.moveTo(64, 10); g.lineTo(118, 66); g.lineTo(86, 66); g.lineTo(86, 118); g.lineTo(42, 118); g.lineTo(42, 66); g.lineTo(10, 66); g.closePath(); };
    g.lineJoin = 'round'; path(); g.lineWidth = 12; g.strokeStyle = 'rgba(0,0,0,.8)'; g.stroke(); g.fillStyle = '#fff'; g.fill();
  }, false);

  // ---------------- lights ----------------
  scene.add(new THREE.HemisphereLight(0x8a96b0, 0x2a2420, 0.42));
  const sun = new THREE.DirectionalLight(0xfff0d6, 1.3);
  sun.position.set(5, 11, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xa8b4c4, 0.45); rim.position.set(-6, 5, -7); scene.add(rim);
  const fxLight = new THREE.PointLight(0xff8a3a, 0, 5, 2); scene.add(fxLight);

  // ---------------- particles ----------------
  const P = [], pool = [];
  function spawn(o) {
    let s = pool.pop();
    if (!s) s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.material.color.set(o.color || 0xffffff); s.position.copy(o.pos); s.scale.setScalar(o.size || 0.3); scene.add(s);
    P.push({ s, v: o.vel ? o.vel.clone() : new V3(), life: o.life || 1, age: 0, size: o.size || 0.3, grow: o.grow || 0, g: o.grav || 0 });
  }
  function updateParticles(dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.age += dt;
      if (p.age >= p.life) { scene.remove(p.s); pool.push(p.s); P.splice(i, 1); continue; }
      p.v.y -= p.g * dt; p.v.multiplyScalar(1 - 1.5 * dt); p.s.position.addScaledVector(p.v, dt);
      const k = p.age / p.life; p.s.scale.setScalar(p.size * (1 + p.grow * k)); p.s.material.opacity = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
    }
  }
  function burst(pos, color, n, speed, size, life, grav = 0) {
    for (let i = 0; i < n; i++) {
      const d = new V3(rand(-1, 1), rand(0.2, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
      spawn({ pos: pos.clone(), vel: d, color: Array.isArray(color) ? color[i % color.length] : color, size: size * rand(0.6, 1.2), life: life * rand(0.6, 1.1), grav });
    }
  }
  const flames = [];
  function emitFlames(dt) {
    for (const e of flames) {
      if (!e.pos) { e.light.intensity = 1.1 + Math.sin(now / 90 + e.ph) * 0.15 + Math.random() * 0.12; continue; }
      e.acc += dt * 26;
      while (e.acc > 1) { e.acc--; spawn({ pos: e.pos.clone().add(new V3(rand(-0.08, 0.08), 0, rand(-0.08, 0.08))), vel: new V3(rand(-0.06, 0.06), rand(0.5, 0.9), rand(-0.06, 0.06)), color: [0xff8a2a, 0xffb040, 0xff5a1a][Math.random() * 3 | 0], size: rand(0.18, 0.3), life: rand(0.45, 0.8), grow: -0.6 }); }
      e.light.intensity = 1.1 + Math.sin(now / 90 + e.ph) * 0.15 + Math.random() * 0.12;
    }
  }

  // ---------------- tweens and the clock ----------------
  let now = performance.now();
  const tweens = [];
  const ease = { inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2), out: (k) => 1 - Math.pow(1 - k, 3), lin: (k) => k };
  const SPEED = { v: 1 };
  function tween(ms, fn, e = ease.inOut) { ms = REDUCED ? Math.min(ms, 60) : ms * SPEED.v; return new Promise((res) => tweens.push({ start: now, ms, fn, e, res })); }
  const wait = (ms) => tween(ms, () => {});
  function runTweens() {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i], k = Math.min(1, (now - t.start) / Math.max(1, t.ms));
      t.fn(t.e(k), k);
      if (k >= 1) { tweens.splice(i, 1); t.res(); }
    }
  }

  // ---------------- sound: a few synthesized knocks ----------------
  let AC = null, noiseBuf = null;
  function ac() {
    if (!UI.sound) return null;
    try {
      if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { return null; }
    return AC;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function noise(t, freq, q, peak, dec, type = 'bandpass') { const a = AC, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t, 0.004, peak, dec); s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dec + 0.05); }
  function tone(t, type, f0, f1, peak, dec) { const a = AC, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec); env(g, t, 0.005, peak, dec); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dec + 0.05); }
  function sfx(type) {
    const a = ac(); if (!a) return; const t = a.currentTime;
    if (type === 'step') noise(t, 900, 2, 0.12, 0.06);
    else if (type === 'pick') tone(t, 'triangle', 660, 880, 0.08, 0.08);
    else if (type === 'place') { noise(t, 400, 1.5, 0.25, 0.1); tone(t, 'sine', 180, 120, 0.12, 0.12); }
    else if (type === 'dice') { for (let i = 0; i < 4; i++) noise(t + i * 0.07 + Math.random() * 0.03, 2400 + Math.random() * 1500, 4, 0.18, 0.04); }
    else if (type === 'hit') { noise(t, 300, 1, 0.5, 0.18, 'lowpass'); tone(t, 'sawtooth', 160, 60, 0.18, 0.2); }
    else if (type === 'miss') noise(t, 1600, 0.8, 0.14, 0.2);
    else if (type === 'kill') { tone(t, 'sawtooth', 120, 40, 0.25, 0.6); noise(t, 200, 0.7, 0.4, 0.5, 'lowpass'); }
    else if (type === 'turn') { tone(t, 'triangle', 392, 392, 0.1, 0.25); tone(t + 0.12, 'triangle', 523, 523, 0.1, 0.35); }
    else if (type === 'win') [392, 494, 587, 784].forEach((f, i) => tone(t + i * 0.13, 'triangle', f, f, 0.12, 0.5));
    else if (type === 'no') tone(t, 'square', 140, 110, 0.06, 0.15);
  }

  // ---------------- the board ----------------
  const N = 8, TOP = 0.16, RAIL = 0.18;
  const cellPos = (x, y) => new V3(x - (N - 1) / 2, TOP, y - (N - 1) / 2);
  const tiles = [];
  {
    const geo = new THREE.BoxGeometry(0.97, 0.16, 0.97);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dark = (x + y) % 2 === 1, tex = (dark ? darkTex : lightTex)[(x * 7 + y * 3) % 3];
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, color: dark ? 0xffffff : 0xf2e6d2 }));
      const p = cellPos(x, y); m.position.set(p.x, TOP - 0.08 + rand(-0.006, 0.006), p.z); m.receiveShadow = true; scene.add(m); tiles.push(m);
    }
    // the frame: dark timber round the board, on a stone plinth
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7, color: 0xb08868 });
    const rail = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.26, d), wood); m.position.set(x, 0.05, z); m.castShadow = m.receiveShadow = true; scene.add(m); };
    rail(8.9, 0.45, 0, -4.22); rail(8.9, 0.45, 0, 4.22); rail(0.45, 8.0, -4.22, 0); rail(0.45, 8.0, 4.22, 0);
    const brass = new THREE.MeshStandardMaterial({ color: 0x9a7e48, metalness: 0.8, roughness: 0.35 });
    for (const [x, z] of [[-4.22, -4.22], [4.22, -4.22], [-4.22, 4.22], [4.22, 4.22]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.32, 10), brass); m.position.set(x, 0.08, z); m.castShadow = true; scene.add(m); }
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, 9.2), new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.95 }));
    plinth.position.y = -0.33; plinth.receiveShadow = true; scene.add(plinth);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1, color: 0x6a6058 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.58; floor.receiveShadow = true; scene.add(floor);
    // warm torchlight from the far corners, flickering
    for (const [x, z] of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]]) {
      const light = new THREE.PointLight(0xff8a3a, 1.2, 11, 2); light.position.set(x, 1.6, z); scene.add(light);
      flames.push({ pos: null, acc: 0, light, ph: Math.random() * 9 });
    }
  }

  // square markers, one per square
  const HL_COL = { move: [0x8fd0ff, 0.55], movehot: [0xd8f0ff, 0.9], target: [0xd0402f, 0.65], aim: [0xff5a3a, 0.95], path: [0xe8873a, 0.6], sel: [0xe3ad4f, 0.6], zone: [0xe8873a, 0.26], zonehot: [0xffb060, 0.6], shove: [0xf0c040, 0.7], last: [0x9fb4c8, 0.22] };
  const hls = [];
  {
    const geo = new THREE.PlaneGeometry(0.94, 0.94);
    for (let i = 0; i < N * N; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, depthWrite: false, toneMapped: false }));
      const p = cellPos(i % N, Math.floor(i / N)); m.position.set(p.x, TOP + 0.004, p.z); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; m.visible = false; scene.add(m); hls.push(m);
    }
  }
  function setHL(x, y, type) { const m = hls[y * N + x]; const [c, o] = HL_COL[type]; m.material.color.setHex(c); m.material.opacity = o; m.visible = true; }
  // four facing arrows round the selected piece
  const faceArrows = [0, 1, 2, 3].map((d) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.order = 'YXZ'; m.rotation.x = -Math.PI / 2; m.rotation.y = -d * Math.PI / 2; m.renderOrder = 3; m.visible = false; scene.add(m); return m;
  });

  // ---------------- the minis ----------------
  const LATHE = {
    pawn: [[0, 0], [0.3, 0], [0.31, 0.03], [0.3, 0.06], [0.26, 0.085], [0.21, 0.1], [0.15, 0.15], [0.12, 0.22], [0.1, 0.32], [0.095, 0.37], [0.16, 0.39], [0.165, 0.415], [0.09, 0.43], [0, 0.43]],
    king: [[0, 0], [0.33, 0], [0.34, 0.04], [0.32, 0.075], [0.27, 0.095], [0.21, 0.13], [0.16, 0.2], [0.13, 0.32], [0.11, 0.5], [0.115, 0.6], [0.2, 0.63], [0.2, 0.66], [0.12, 0.69], [0.15, 0.78], [0.18, 0.85], [0.09, 0.89], [0, 0.89]],
  };
  const HEIGHT = { pawn: 0.66, king: 1.08 };
  const latheGeo = {};
  for (const t in LATHE) latheGeo[t] = new THREE.LatheGeometry(LATHE[t].map(([r, h]) => new THREE.Vector2(r, h)), 28);
  const headGeo = new THREE.SphereGeometry(0.125, 24, 16), gemGeo = new THREE.SphereGeometry(0.04, 12, 8), bandGeo = new THREE.TorusGeometry(0.3, 0.025, 8, 32);
  const SIDE_LOOK = {
    white: { body: 0xe9dfc8, rough: 0.42, metal: 0.0, band: 0xb08c4a, gem: 0xffc860, mark: 0xf0c878 },
    black: { body: 0x231b18, rough: 0.28, metal: 0.15, band: 0x8a1a14, gem: 0xff3a24, mark: 0xff4a32 },
  };
  const views = new Map(); // piece id -> view
  const pickables = [];
  function makeView(p) {
    const L = SIDE_LOOK[p.side];
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: L.body, roughness: L.rough, metalness: L.metal, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const bandMat = new THREE.MeshStandardMaterial({ color: L.band, metalness: 0.75, roughness: 0.35 });
    const gemMat = new THREE.MeshStandardMaterial({ color: L.gem, emissive: L.gem, emissiveIntensity: 1.2 });
    const root = new THREE.Group(), spin = new THREE.Group(), fig = new THREE.Group();
    root.add(spin); spin.add(fig);
    const body = new THREE.Mesh(latheGeo[p.type], bodyMat); fig.add(body);
    const band = new THREE.Mesh(bandGeo, bandMat); band.rotation.x = Math.PI / 2; band.position.y = 0.075; band.scale.setScalar(p.type === 'king' ? 1.05 : 0.95); fig.add(band);
    let gemY;
    if (p.type === 'pawn') { const head = new THREE.Mesh(headGeo, bodyMat); head.position.y = 0.53; fig.add(head); gemY = 0.55; }
    else {
      const crossMat = bandMat;
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), crossMat); v.position.y = 0.99; fig.add(v);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), crossMat); h.position.y = 1.01; fig.add(h);
      gemY = 0.81;
    }
    // a gem on the front of the head, so the mini itself shows which way it faces
    const gem = new THREE.Mesh(gemGeo, gemMat); gem.position.set(0, gemY, p.type === 'pawn' ? -0.115 : -0.165); fig.add(gem);
    fig.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.pid = p.id; } });
    // the ground mark: ring and facing arrow, turning with the piece
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: facingTex, color: L.mark, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    mark.rotation.x = -Math.PI / 2; mark.position.y = 0.006; mark.renderOrder = 3; spin.add(mark);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; root.add(blob);
    // an invisible column to tap
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, HEIGHT[p.type] + 0.1, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = (HEIGHT[p.type] + 0.1) / 2; hit.userData.pid = p.id; root.add(hit); pickables.push(hit);
    const pos = cellPos(p.x, p.y); root.position.copy(pos);
    const ang = -p.facing * Math.PI / 2; spin.rotation.y = ang;
    scene.add(root);
    const tag = document.createElement('div');
    tag.className = 'tag ' + p.side;
    tag.innerHTML = '<div class="fc"></div><div class="pips"><i></i><i></i></div><div class="hp"><i class="trail"></i><i class="fill"></i></div>';
    $('#tags').appendChild(tag);
    const v = { id: p.id, side: p.side, type: p.type, root, spin, fig, mark, gem, body, bodyMat, hit, tag, ang, x: p.x, y: p.y, facing: p.facing, anim: false, hp: p.hp };
    views.set(p.id, v);
    return v;
  }
  function dropView(v) {
    scene.remove(v.root); v.tag.remove(); views.delete(v.id);
    const i = pickables.indexOf(v.hit); if (i >= 0) pickables.splice(i, 1);
  }
  function setAngle(v, f) { v.facing = f; v.ang = -f * Math.PI / 2; v.spin.rotation.y = v.ang; }
  function turnTo(v, f, ms = 180) {
    const from = v.spin.rotation.y; let to = -f * Math.PI / 2;
    while (to - from > Math.PI) to -= Math.PI * 2; while (to - from < -Math.PI) to += Math.PI * 2;
    v.facing = f; v.ang = to;
    if (Math.abs(to - from) < 1e-3) return Promise.resolve();
    return tween(ms, (k) => { v.spin.rotation.y = from + (to - from) * k; });
  }

  // Brings the minis into line with the rules: new ones appear, fallen ones go, everything else snaps into place.
  function sync() {
    if (!S) return;
    const living = new Set();
    for (const p of TC.alive(S)) {
      living.add(p.id);
      let v = views.get(p.id);
      if (!v) { v = makeView(p); v.fig.scale.setScalar(0.01); tween(220, (k) => v.fig.scale.setScalar(Math.max(0.01, k)), ease.out); }
      if (!v.anim) {
        if (v.x !== p.x || v.y !== p.y) { v.root.position.copy(cellPos(p.x, p.y)); v.x = p.x; v.y = p.y; }
        if (v.facing !== p.facing) turnTo(v, p.facing);
      }
      const hidden = S.phase === 'setup' && UI.hide === p.side;
      v.root.visible = !hidden;
      v.hp = p.hp;
    }
    for (const v of [...views.values()]) if (!living.has(v.id) && !v.dying) dropView(v);
  }

  // ---------------- nameplates, odds and floating numbers ----------------
  const tmp = new V3();
  function project(pos) {
    tmp.copy(pos).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: (tmp.x + 1) / 2 * r.width, y: (1 - tmp.y) / 2 * r.height, z: tmp.z };
  }
  function updateTags() {
    for (const v of views.values()) {
      const p = TC.piece(S, v.id);
      if (!v.root.visible || (!p && !v.dying)) { v.tag.classList.add('hide'); continue; }
      v.tag.classList.remove('hide');
      const top = v.root.position.clone(); top.y += HEIGHT[v.type] + 0.22 + v.fig.position.y;
      const s = project(top);
      v.tag.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
      if (!p) continue;
      const frac = Math.max(0, p.hp / TC.unit(p).hp) * 100 + '%';
      const fill = v.tag.querySelector('.fill'), trail = v.tag.querySelector('.trail');
      if (fill.style.width !== frac) { fill.style.width = frac; trail.style.width = frac; }
      const mine = S.phase === 'play' && p.side === S.turn && !UI.ai[S.turn];
      v.tag.classList.toggle('mine', mine);
      v.tag.classList.toggle('sel', UI.sel === p.id);
      if (mine) { const pips = v.tag.querySelectorAll('.pips i'); pips[0].classList.toggle('off', p.moved); pips[1].classList.toggle('off', p.acted); }
    }
  }
  function floatText(pos, text, cls) {
    const el = document.createElement('div'); el.className = 'float ' + (cls || ''); el.textContent = text; $('#floats').appendChild(el);
    const start = pos.clone(); start.y += 1.0;
    tween(1100, (k) => {
      const s = project(start.clone().add(new V3(0, k * 0.5, 0)));
      el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%) scale(${k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1})`;
      el.style.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }, ease.lin).then(() => el.remove());
  }
  function banner(text) {
    const b = $('#bannerTxt'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  // ---------------- the camera ----------------
  const cam = { az: 0, azT: 0, tx: 0, tz: 0, txT: 0, tzT: 0, zoom: 1, zoomT: 1, pitch: 0.98, shake: 0 };
  const pitchFor = () => (innerHeight > innerWidth * 1.2 ? 1.06 : 0.98);
  function viewSide() { return UI.ai.white && !UI.ai.black ? 'black' : !UI.ai.white && UI.ai.black ? 'white' : (S ? (S.phase === 'setup' ? setupSide() || 'white' : S.turn) : 'white'); }
  function faceSide(side) {
    let to = side === 'black' ? Math.PI : 0;
    while (to - cam.azT > Math.PI) to -= Math.PI * 2; while (to - cam.azT < -Math.PI) to += Math.PI * 2;
    cam.azT = to; cam.txT = 0; cam.tzT = 0; cam.zoomT = 1;
  }
  let W = 1, H = 1, topH = 46, dockH = 120;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    topH = $('#top').getBoundingClientRect().height;
    dockH = $('#dock').getBoundingClientRect().height + 8;
    // shift the picture so the board sits in the space between the top plate and the dock
    camera.setViewOffset(W, H, 0, (dockH * 0.82 - topH) / 2, W, H);
    camera.updateProjectionMatrix();
    cam.pitch = pitchFor();
  }
  function fitDistance() {
    const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const avail = Math.max(0.35, (H - topH - dockH * 0.82) / H);
    const half = H > W * 1.2 ? 4.02 : 4.35, halfDepth = half * Math.sin(cam.pitch) + 0.5 * Math.cos(cam.pitch);
    const dW = half / Math.tan(hf / 2) + half * Math.cos(cam.pitch), dH = halfDepth / (Math.tan(vf / 2) * avail) + half * Math.cos(cam.pitch);
    return Math.max(dW, dH) * 0.97;
  }
  function placeCamera(dt) {
    const k = 1 - Math.exp(-dt * 6);
    cam.az += (cam.azT - cam.az) * k; cam.tx += (cam.txT - cam.tx) * k; cam.tz += (cam.tzT - cam.tz) * k; cam.zoom += (cam.zoomT - cam.zoom) * k;
    const d = fitDistance() * cam.zoom;
    const target = new V3(cam.tx, 0.2, cam.tz);
    camera.position.set(target.x + Math.sin(cam.az) * Math.cos(cam.pitch) * d, target.y + Math.sin(cam.pitch) * d, target.z + Math.cos(cam.az) * Math.cos(cam.pitch) * d);
    if (cam.shake > 0) { camera.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(cam.shake * 0.05)); cam.shake = Math.max(0, cam.shake - dt * 4); }
    camera.lookAt(target);
  }
  const camToward = () => new V3(Math.sin(cam.az), 0, Math.cos(cam.az));
  const camRight = () => new V3(Math.cos(cam.az), 0, -Math.sin(cam.az));
  function lookAtFight(a, b) { const m = a.clone().add(b).multiplyScalar(0.5); cam.txT = m.x * 0.3; cam.tzT = m.z * 0.3; cam.zoomT = 0.88; }
  function lookBack() { cam.txT = 0; cam.tzT = 0; cam.zoomT = 1; }

  // ---------------- dice ----------------
  const NUMS = [1, 6, 2, 5, 3, 4], NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((a) => new V3(...a));
  const PIPS = { 1: [[0.5, 0.5]], 2: [[0.27, 0.27], [0.73, 0.73]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]] };
  const diceMats = {};
  function dieMats(side) {
    if (diceMats[side]) return diceMats[side];
    const st = side === 'white' ? { bg: '#d6cab0', ink: '#3a2414' } : { bg: '#5a1814', ink: '#e8d2a6' };
    return (diceMats[side] = NUMS.map((n) => new THREE.MeshPhysicalMaterial({
      roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.18,
      map: canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = st.bg; g.fillRect(0, 0, w, h);
        const gr = g.createRadialGradient(w * 0.42, h * 0.4, 6, w * 0.5, h * 0.5, w * 0.8); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = st.ink; for (const [px, py] of PIPS[n]) { g.beginPath(); g.arc(px * w, py * h, 11, 0, 7); g.fill(); }
      }),
    })));
  }
  const dieGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  let liveDice = [];
  function clearDice() {
    for (const d of liveDice) { const m = d; tween(200, (k) => m.scale.setScalar(Math.max(0.01, 1 - k))).then(() => scene.remove(m)); }
    liveDice = [];
  }
  async function throwDice(values, side, near) {
    clearDice(); sfx('dice');
    const right = camRight(), toward = camToward();
    // an empty square near the fight, nearest the viewer's side of it
    const want = near.clone().add(toward.clone().multiplyScalar(1.4));
    let spot = null, best = Infinity;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (TC.pieceAt(S, x, y)) continue;
      const c = cellPos(x, y); if (c.distanceTo(near) > 2.3) continue;
      const d = c.distanceTo(want); if (d < best) { best = d; spot = c; }
    }
    if (!spot) spot = near.clone().add(toward.clone().multiplyScalar(0.9));
    const jobs = values.map((v, i) => {
      const m = new THREE.Mesh(dieGeo, dieMats(side)); m.castShadow = true; scene.add(m); liveDice.push(m);
      const land = spot.clone().add(right.clone().multiplyScalar(i ? 0.18 : -0.18)); land.y = TOP + 0.14;
      const from = land.clone().add(toward.clone().multiplyScalar(2.2)).add(right.clone().multiplyScalar(rand(-0.4, 0.4))); from.y = 2.0;
      const face = NUMS.indexOf(v), qEnd = new THREE.Quaternion().setFromUnitVectors(NORMALS[face], UP);
      qEnd.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, rand(0, Math.PI * 2)));
      const axis = new V3(rand(-1, 1), rand(-0.3, 0.3), rand(-1, 1)).normalize(), turns = rand(3, 5) * Math.PI;
      return tween(900 + i * 90, (k, raw) => {
        const kk = raw;
        m.position.lerpVectors(from, land, ease.out(kk));
        const b = kk < 0.55 ? Math.sin(kk / 0.55 * Math.PI / 2 + Math.PI / 2) : kk < 0.8 ? Math.sin((kk - 0.55) / 0.25 * Math.PI) * 0.25 : Math.sin((kk - 0.8) / 0.2 * Math.PI) * 0.07;
        m.position.y = TOP + 0.14 + Math.max(0, kk < 0.55 ? (from.y - TOP) * b * (1 - kk / 0.55) + (1 - kk / 0.55) * 0.2 : b);
        const spinQ = new THREE.Quaternion().setFromAxisAngle(axis, turns * Math.pow(1 - kk, 2));
        m.quaternion.copy(qEnd).premultiply(spinQ);
      }, ease.lin);
    });
    await Promise.all(jobs);
  }
  function rollReadout(label, res) {
    $('#rollLbl').innerHTML = label; $('#rollRes').innerHTML = res; $('#roll').classList.remove('out');
    clearTimeout(rollReadout.t); rollReadout.t = setTimeout(() => $('#roll').classList.add('out'), 2600);
  }

  // ---------------- what happens: each rules event, shown ----------------
  const sqName = (x, y) => 'abcdefgh'[x] + (N - y);
  const pName = (p) => cap(p.side) + ' ' + TC.unit(p).name.toLowerCase();
  function log(text, cls) {
    UI.log.unshift({ text, cls });
    const li = document.createElement('li'); li.className = cls || ''; li.innerHTML = text; $('#logList').prepend(li);
  }
  async function hop(v, path) {
    v.anim = true;
    let [cx, cy] = [v.x, v.y];
    for (const [x, y] of path) {
      const from = cellPos(cx, cy), to = cellPos(x, y), d = TC.DIRS.findIndex(([dx, dy]) => dx === x - cx && dy === y - cy);
      turnTo(v, d, 90);
      await tween(150, (k) => { v.root.position.lerpVectors(from, to, k); v.fig.position.y = Math.sin(k * Math.PI) * 0.16; }, ease.lin);
      sfx('step'); cx = x; cy = y;
    }
    v.fig.position.y = 0; v.x = cx; v.y = cy; v.anim = false;
  }
  async function lunge(v, toward) {
    const base = v.root.position.clone(), dir = toward.clone().sub(base).setY(0).normalize();
    await tween(130, (k) => { v.root.position.copy(base).addScaledVector(dir, k * 0.28); v.fig.rotation.x = 0; }, ease.out);
    await tween(170, (k) => v.root.position.copy(base).addScaledVector(dir, (1 - k) * 0.28));
  }
  function flash(v, color) {
    v.bodyMat.emissive.setHex(color); return tween(320, (k) => { v.bodyMat.emissiveIntensity = (1 - k) * 1.2; });
  }
  async function shake(v) {
    const base = v.root.position.clone();
    await tween(320, (k) => v.root.position.set(base.x + Math.sin(k * 30) * 0.05 * (1 - k), base.y, base.z + Math.cos(k * 27) * 0.04 * (1 - k)), ease.lin);
    v.root.position.copy(base);
  }
  async function topple(v) {
    v.dying = true; sfx('kill');
    const away = v.root.position.clone().sub(camera.position).setY(0).normalize();
    const axis = new V3(away.z, 0, -away.x);
    burst(v.root.position.clone().add(new V3(0, 0.3, 0)), [0x8a7a6a, 0x5a4a3a], 16, 1.4, 0.35, 0.9, 1.5);
    await tween(520, (k) => { v.root.setRotationFromAxisAngle(axis, -k * Math.PI / 2); v.root.position.y = TOP - k * 0.05; }, ease.inOut);
    await tween(500, (k) => { v.root.position.y = TOP - 0.05 - k * 0.6; v.mark.material.opacity = 0.9 * (1 - k); });
    v.dying = false; dropView(v);
  }

  async function show(ev, ctx = {}) {
    const fast = ctx.ai ? 0.8 : 1;
    if (ev.type === 'move') {
      const v = views.get(ev.piece), p = TC.piece(S, ev.piece);
      const from = [v.x, v.y];
      await hop(v, ev.path);
      log(`${pName(p)} moves ${sqName(...from)} → ${sqName(p.x, p.y)}.`, p.side);
    } else if (ev.type === 'attack' || ev.type === 'grapple') {
      const a = views.get(ev.piece), t = views.get(ev.target), ap = TC.piece(S, ev.piece), tp = S.pieces.find((q) => q.id === ev.target);
      lookAtFight(a.root.position, t.root.position);
      const toward = TC.DIRS.findIndex(([dx, dy]) => dx === t.x - a.x && dy === t.y - a.y);
      if (toward >= 0) await turnTo(a, toward, 120); // turn to strike; the rules' facing comes back after
      const label = `${ev.type === 'attack' ? 'Attack' : 'Grapple'} · from the ${ev.angle === 'behind' ? 'back' : ev.angle}`;
      rollReadout(label, `<span>needs ${ev.need}+</span>`);
      await throwDice(ev.dice, ap.side, t.root.position);
      const tot = `<b>${ev.dice[0]} + ${ev.dice[1]} = ${ev.total}</b><span>vs ${ev.need}+</span>`;
      if (ev.type === 'attack') rollReadout(label, tot + (ev.hit ? `<em class="hit">HIT −${ev.damage}</em>` : '<em class="miss">MISS</em>'));
      else rollReadout(label, tot + (ev.hit ? '<em class="grab">CAUGHT</em>' : '<em class="miss">MISS</em>'));
      await wait(220 * fast);
      await lunge(a, t.root.position);
      let line = `${pName(ap)} ${ev.type === 'attack' ? 'attacks' : 'grapples'} ${pName(tp)} from the ${ev.angle === 'behind' ? 'back' : ev.angle}: ${ev.dice[0]}+${ev.dice[1]}=${ev.total} vs ${ev.need}+, `;
      if (!ev.hit) { sfx('miss'); floatText(t.root.position, 'Miss', 'miss'); line += 'miss.'; }
      else if (ev.type === 'attack') {
        sfx('hit'); cam.shake = ev.damage >= 10 ? 1 : 0.5;
        fxLight.position.copy(t.root.position).add(new V3(0, 0.6, 0)); fxLight.intensity = 3; tween(400, (k) => { fxLight.intensity = 3 * (1 - k); });
        burst(t.root.position.clone().add(new V3(0, 0.5, 0)), [0xff5a3a, 0xffb060, 0xff2a1a], 18, 2.2, 0.22, 0.5, 3);
        floatText(t.root.position, '−' + ev.damage, 'dmg');
        flash(t, 0xff2a10); await shake(t);
        line += `hit for ${ev.damage}` + (ev.killed ? `. The ${TC.unit(tp).name.toLowerCase()} falls!` : ` (${tp.hp} HP left).`);
        if (ev.killed) await topple(t);
      } else {
        sfx('place'); floatText(t.root.position, ev.options.length ? 'Caught!' : 'No room', 'info');
        line += ev.options.length ? 'caught!' : 'caught, but there is no room to move it.';
        flash(t, 0xf0c040);
      }
      log(line, ap.side);
      await wait(250 * fast);
      if (!S.pending) lookBack();
      if (ev.winner) await gameOver();
    } else if (ev.type === 'shove') {
      const t = views.get(ev.target), tp = TC.piece(S, ev.target);
      if (ev.moved) {
        t.anim = true; const from = cellPos(ev.from.x, ev.from.y), to = cellPos(ev.to.x, ev.to.y);
        await tween(320, (k) => { t.root.position.lerpVectors(from, to, k); t.fig.position.y = Math.sin(k * Math.PI) * 0.1; });
        t.fig.position.y = 0; t.x = ev.to.x; t.y = ev.to.y; t.anim = false; sfx('place');
        log(`${pName(tp)} is dragged ${sqName(ev.from.x, ev.from.y)} → ${sqName(ev.to.x, ev.to.y)}.`, TC.other(tp.side));
      }
      lookBack();
    } else if (ev.type === 'face') {
      const v = views.get(ev.piece); if (v) await turnTo(v, ev.facing, 140);
    } else if (ev.type === 'facing') {
      clearDice();
      if (!UI.ai[S.turn]) { sfx('turn'); banner('Set facing'); }
    } else if (ev.type === 'turn') {
      log(`Turn ${ev.turnNo}: ${cap(ev.side)}`, 'hdr');
      if (!UI.ai[ev.side] && !UI.ai[TC.other(ev.side)]) faceSide(ev.side);
      sfx('turn'); banner(`${cap(ev.side)}'s turn`);
    }
    sync(); refresh();
  }

  async function gameOver() {
    sfx('win');
    banner(`${cap(S.winner)} wins`);
    log(`${cap(S.winner)} wins!`, 'hdr');
    await wait(1500);
    const lost = TC.other(S.winner), hadKing = S.pieces.some((p) => p.side === lost && p.type === 'king');
    $('#endTxt').textContent = `${cap(S.winner)} wins`;
    $('#endSub').textContent = hadKing ? `The ${lost} king has fallen.` : `The ${lost} army is wiped out.`;
    $('#end').hidden = false;
  }

  // Runs one rules order and shows it. Errors from the rules come back as a word on the info line.
  async function order(fn) {
    if (UI.busy) return null;
    UI.busy = true; UI.aim = null; refresh();
    let ev = null;
    try { ev = fn(); await show(ev); }
    catch (e) { say(e.message); sfx('no'); }
    finally { UI.busy = false; }
    sync(); refresh();
    runAI();
    return ev;
  }

  // ---------------- the computer ----------------
  async function runAI() {
    if (!S || UI.busy || S.phase === 'over') return;
    const side = activeSide();
    if (!side || !UI.ai[side]) return;
    UI.busy = true; UI.sel = null; refresh();
    try {
      if (S.phase === 'setup') {
        TC.autoPlace(S, side); TC.finishSetup(S, side); sync();
        log(`${cap(side)} sets up.`, side); sfx('place');
        await wait(500);
        if (S.phase === 'play') await startBattle();
      }
      while ((S.phase === 'play' || S.phase === 'facing') && UI.ai[S.turn]) {
        const o = TC.aiNext(S);
        await wait(o.type === 'face' ? 40 : 280);
        const ev = TC.apply(S, o);
        if (o.type === 'end') log(`${cap(S.turn)} ends the turn.`, S.turn);
        await show(ev, { ai: true });
      }
    } catch (e) { console.error(e); }
    finally { UI.busy = false; }
    sync(); refresh();
    if (S.phase === 'setup' || ((S.phase === 'play' || S.phase === 'facing') && UI.ai[S.turn])) runAI();
  }

  async function startBattle() {
    UI.hide = null; sync();
    log('Turn 1: White', 'hdr');
    if (!UI.ai.white && !UI.ai.black) faceSide('white');
    banner("White's turn"); sfx('turn');
  }

  // ---------------- state helpers ----------------
  const setupSide = () => (S.phase !== 'setup' ? null : !S.ready.white ? 'white' : !S.ready.black ? 'black' : null);
  const activeSide = () => (S.phase === 'setup' ? setupSide() : S.turn);
  const humanTurn = () => S && S.phase !== 'over' && !UI.ai[activeSide()] && !UI.busy;
  const selPiece = () => (UI.sel != null ? TC.piece(S, UI.sel) : null);
  const myPiece = () => { const p = selPiece(); return p && p.side === activeSide() && humanTurn() ? p : null; };
  const canStrike = (p) => TC.alive(S, TC.other(p.side)).some((e) => TC.actionInfo(S, p.id, e.id, 'attack') || TC.actionInfo(S, p.id, e.id, 'grapple'));
  const hasWork = (p) => !p.acted && (!p.moved || canStrike(p));

  // On your turn a piece is always picked: the one you chose, or else the next that can still do something, front first.
  function autoSelect() {
    if (!S || S.phase !== 'play' || S.pending || UI.ai[S.turn]) return;
    const p = selPiece();
    if (p && p.side === S.turn && (hasWork(p) || (UI.picked === p.id && !p.acted))) return;
    const ready = TC.alive(S, S.turn).filter(hasWork).sort((a, b) => (S.turn === 'white' ? a.y - b.y : b.y - a.y) || a.x - b.x);
    UI.sel = ready.length ? ready[0].id : null; UI.picked = null;
    const q = selPiece(); if (q && !TC.unit(q).grapple && UI.mode === 'grapple') UI.mode = 'attack';
  }

  // The foes the selected piece can strike with the chosen action, and from where.
  function targets() {
    const p = myPiece(), out = new Map();
    if (!p || S.phase !== 'play' || p.acted || S.pending) return out;
    for (const e of TC.alive(S, TC.other(p.side))) {
      const b = TC.bestApproach(S, p.id, e.id, UI.mode);
      if (b) out.set(e.id, b);
    }
    return out;
  }

  // ---------------- the board marks ----------------
  function refreshHL() {
    hls.forEach((m) => { m.visible = false; });
    faceArrows.forEach((m) => { m.visible = false; });
    for (const v of views.values()) {
      const p = TC.piece(S, v.id);
      v.mark.material.opacity = p && S.phase === 'play' && p.side === S.turn && p.acted ? 0.45 : 0.95;
      v.mark.material.color.setHex(UI.sel === v.id ? 0xffffff : SIDE_LOOK[v.side].mark);
      v.mark.scale.setScalar(UI.sel === v.id ? 1.12 : 1);
    }
    for (const v of views.values()) v.tag.querySelector('.fc').classList.remove('on', 'focus');
    if (!S || S.phase === 'over') return;
    const side = activeSide();
    if (S.phase === 'setup' && side && !UI.ai[side]) {
      for (const y of TC.setupRows(S, side)) for (let x = 0; x < N; x++) if (!TC.pieceAt(S, x, y)) setHL(x, y, UI.hover && UI.hover.x === x && UI.hover.y === y ? 'zonehot' : 'zone');
    }
    if (S.phase === 'play' && S.pending) { for (const c of S.pending.options) setHL(c.x, c.y, 'shove'); return; }
    const p = selPiece();
    if (p && !(S.phase === 'setup' && UI.hide === p.side)) setHL(p.x, p.y, 'sel');
    if (UI.busy) return;
    const mine = myPiece();
    if (mine && (S.phase === 'facing' || S.phase === 'setup')) {
      TC.DIRS.forEach(([dx, dy], d) => {
        const m = faceArrows[d], c = cellPos(mine.x, mine.y);
        m.position.set(c.x + dx * 0.66, TOP + 0.01, c.z + dy * 0.66); m.visible = true;
        m.material.color.setHex(d === mine.facing ? 0xffa040 : 0xe8f0ff); m.material.opacity = d === mine.facing ? 1 : 0.85;
      });
    }
    if (S.phase !== 'play' || !mine) return;
    if (!mine.moved) for (const r of TC.reachable(S, mine.id).values()) if (r.dist > 0) setHL(r.x, r.y, UI.hover && UI.hover.x === r.x && UI.hover.y === r.y ? 'movehot' : 'move');
    if (UI.aim) for (const [x, y] of UI.aim.path) setHL(x, y, 'path');
    for (const [id, b] of targets()) {
      const e = TC.piece(S, id), v = views.get(id);
      setHL(e.x, e.y, UI.aim && UI.aim.target === id ? 'aim' : 'target');
      const fc = v.tag.querySelector('.fc'), i = b.info;
      const where = i.angle === 'behind' ? 'back' : i.angle;
      // narrow screens: just the damage and the odds; the side struck shows for the foe in focus
      const full = innerWidth >= 700 || UI.focus === id || (UI.aim && UI.aim.target === id);
      const html = (i.kind === 'attack' ? `<b>−${i.damage}</b>` : '<b>Grab</b>') + `<i>${full ? where + ' ' : ''}${pct(i.chance)}</i>` + (i.kind === 'attack' && i.damage >= e.hp ? '<i>· kill</i>' : '');
      if (fc._k !== html) { fc._k = html; fc.innerHTML = html; }
      fc.classList.add('on'); fc.classList.toggle('grab', i.kind === 'grapple');
      fc.classList.toggle('focus', UI.focus === id || (UI.aim && UI.aim.target === id));
    }
  }

  // ---------------- the dock ----------------
  const ICON = {
    attack: '<path d="M19 4l-9 9"/><path d="M19 4h-4M19 4v4"/><path d="M7.5 10.5l6 6"/><path d="M10 14l-5 5"/><path d="M4 18l2 2"/>',
    grapple: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5M14 10.5V6.5a1.5 1.5 0 0 1 3 0V12M17 11.5V10a1.5 1.5 0 0 1 3 0v3.5c0 4-3 7-7 7-3 0-5-1.5-6.5-4L4 12.5a1.5 1.5 0 0 1 2.6-1.5L8 13"/>',
    wait: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
    undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 0 1 0 10h-2"/>',
    next: '<path d="M5 12h12"/><path d="M13 7l5 5-5 5"/><circle cx="5" cy="12" r="1.5" class="f"/>',
    left: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>',
    right: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
    foes: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" class="f"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    king: '<path d="M11 2h2v2h2v2h-2v2.5h-2V6H9V4h2z" class="f"/><path d="M8 10c2.5-1.5 5.5-1.5 8 0l-1.5 8h-5z"/><path d="M6 21h12M7 18h10"/>',
    pawn: '<circle cx="12" cy="6.5" r="3"/><path d="M9.5 10.5h5l-.8 2c1.6 1.8 2.3 3.6 2.6 5.5H7.7c.3-1.9 1-3.7 2.6-5.5z"/><path d="M6 21h12"/>',
    remove: '<path d="M6 6l12 12M18 6L6 18"/>',
    auto: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  };
  const HUE = { attack: 4, grapple: 38, wait: 210, undo: 260, next: 160, left: 200, right: 200, foes: 0, king: 42, pawn: 30, remove: 0, auto: 120, clear: 20 };
  let hotActions = [];
  function hotButton(spec, i) {
    const b = document.createElement('button');
    b.className = 'hk' + (spec.sel ? ' sel' : '') + (spec.off ? ' off' : '');
    b.style.setProperty('--hue', HUE[spec.icon]);
    b.setAttribute('aria-label', `${i + 1}: ${spec.label}${spec.off ? ' (' + spec.off + ')' : ''}`);
    b.innerHTML = `<span class="ic"><svg viewBox="0 0 24 24">${ICON[spec.icon]}</svg></span><span class="key">${i + 1}</span>${spec.dv != null ? `<span class="dv">${spec.dv}</span>` : ''}<span class="lb">${spec.label}</span>`;
    b.onclick = () => pressHot(i);
    return b;
  }
  function pressHot(i) {
    const spec = hotActions[i]; if (!spec) return;
    ac();
    if (spec.off) { say(spec.off); sfx('no'); const b = $('#hotbar').children[i]; if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } return; }
    sfx('pick'); spec.run();
  }

  let sayMsg = null, sayT = 0;
  function say(msg) { sayMsg = msg; clearTimeout(sayT); sayT = setTimeout(() => { sayMsg = null; renderDock(); }, 2600); renderDock(); }

  function renderTop() {
    const p = selPiece() || (UI.focus != null ? TC.piece(S, UI.focus) : null);
    const who = $('#uwho');
    if (p && !(S.phase === 'setup' && UI.hide === p.side)) {
      const u = TC.unit(p);
      const st = S.phase === 'play' && p.side === S.turn ? (p.acted ? 'done' : p.moved ? 'can act' : 'move · act') : `faces ${TC.DIR_NAMES[p.facing]}`;
      who.className = 'uwho ' + p.side;
      who.innerHTML = `<span class="ubadge ${p.side}"><span><svg viewBox="0 0 24 24" style="stroke:#e3d6b9;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">${ICON[p.type]}</svg></span></span><span class="nm">${cap(p.side)} ${u.name}</span><span class="hpw"><span class="hpn"><i>${p.hp}</i>/${u.hp}</span><span class="hpb"><i style="width:${p.hp / u.hp * 100}%"></i></span></span><span class="st">${st}</span>`;
    } else {
      who.className = 'uwho';
      who.innerHTML = `<span class="nm">Tactics Chess</span>`;
    }
    const side = activeSide();
    const tl = $('#turnLbl');
    tl.textContent = S.phase === 'setup' ? `Setup · ${cap(side || 'white')}` : S.phase === 'over' ? `${cap(S.winner)} wins` : `T${S.turnNo} · ${cap(S.turn)}`;
    tl.className = 'rnd ' + (S.phase === 'over' ? S.winner : side || 'white');
    $('#armies').innerHTML = TC.SIDES.map((s) => `<span class="tok ${s}${s === side ? ' on' : ''}" title="${cap(s)}: pieces left"><span>${TC.alive(S, s).length}</span></span>`).join('');
  }

  function renderDock() {
    if (!S) return;
    renderTop();
    const info = $('#hbInfo'), bar = $('#hotbar'), end = $('#endBtn'), pill = $('#goPill');
    const side = activeSide(), p = myPiece();
    let title = '', meta = '', text = '';
    hotActions = [];
    pill.hidden = !UI.aim || UI.busy;
    end.classList.remove('go', 'pulse');
    $('#endLbl').textContent = 'End';
    if (S.phase === 'over') {
      title = `${cap(S.winner)} wins`; text = 'Open the menu for a new game.'; end.disabled = true;
    } else if (UI.ai[side] || UI.busy) {
      title = UI.ai[side] ? `${cap(side)} is thinking` : ''; text = UI.ai[side] ? 'The computer is playing its turn.' : '';
      end.disabled = true;
      if (UI.busy && !UI.ai[side]) { info.style.visibility = 'visible'; }
    } else if (S.phase === 'setup') {
      const left = TC.remaining(S, side);
      title = `${cap(side)} sets up`; meta = 'Back two rows';
      for (const t of ['king', 'pawn']) if (S.army[t]) hotActions.push({ icon: t, label: cap(t), dv: '×' + left[t], sel: UI.setupType === t && !p, off: left[t] ? null : `Every ${t} is placed`, run: () => { UI.setupType = t; UI.sel = null; refresh(); } });
      hotActions.push({ icon: 'remove', label: 'Remove', off: p ? null : 'Tap a placed piece first', run: () => { TC.unplace(S, p.id); UI.sel = null; sync(); refresh(); } });
      hotActions.push({ icon: 'auto', label: 'Auto', run: () => { TC.autoPlace(S, side); UI.sel = null; sfx('place'); sync(); refresh(); } });
      hotActions.push({ icon: 'clear', label: 'Clear', run: () => { TC.clearSide(S, side); UI.sel = null; sync(); refresh(); } });
      const done = Object.values(left).every((n) => n === 0);
      end.disabled = !done; $('#endLbl').textContent = 'Done'; end.classList.toggle('go', done); end.classList.toggle('pulse', done);
      if (p) text = `<i>Tap an <b>arrow</b> round it to turn it, or tap an empty ember square to move it there.</i>`;
      else if (!done) text = `<i>Tap an <b>ember square</b> to place a ${UI.setupType}. Tap a placed piece to move or turn it.</i>`;
      else text = `<i>All placed. Turn your pieces with the arrows, then tap <b>Done</b>.</i>`;
    } else if (S.phase === 'facing') {
      title = 'Set facing'; meta = cap(S.turn);
      const sp = p;
      hotActions.push({ icon: 'left', label: 'Turn left', off: sp ? null : 'Tap one of your pieces first', run: () => face(sp, (sp.facing + 3) % 4) });
      hotActions.push({ icon: 'right', label: 'Turn right', off: sp ? null : 'Tap one of your pieces first', run: () => face(sp, (sp.facing + 1) % 4) });
      hotActions.push({ icon: 'foes', label: 'Face foes', run: () => { for (let o = TC.aiNext(S); o && o.type === 'face'; o = TC.aiNext(S)) TC.setFacing(S, o.id, o.dir); sync(); refresh(); } });
      hotActions.push({ icon: 'next', label: 'Next', run: () => cycle(1) });
      end.disabled = false; $('#endLbl').textContent = 'Done'; end.classList.add('go');
      text = sp ? `<i>Tap an <b>arrow</b> round ${pName(sp).toLowerCase()} or swipe from it to turn it. Foes strike hardest from behind.</i>` : '<i>Tap one of your pieces to turn it, then tap <b>Done</b>.</i>';
    } else if (S.phase === 'play') {
      end.disabled = !!S.pending;
      if (S.pending) { title = 'Grapple'; meta = 'Caught'; text = '<i>Tap a <b>yellow</b> square to drag the foe there.</i>'; hotActions.push({ icon: 'undo', label: 'Leave it', run: () => order(() => TC.resolveGrapple(S, null)) }); }
      else if (p) {
        const u = TC.unit(p), act = u.attack, gr = u.grapple;
        const acted = p.acted ? 'This piece has acted' : null;
        hotActions.push({ icon: 'attack', label: 'Attack', dv: act.target + '+', sel: UI.mode === 'attack' && !p.acted, off: acted, run: () => { UI.mode = 'attack'; UI.aim = null; refresh(); } });
        hotActions.push({ icon: 'grapple', label: 'Grapple', dv: gr ? gr.target + '+' : null, sel: UI.mode === 'grapple' && !p.acted, off: acted || (gr ? null : `A ${u.name.toLowerCase()} cannot grapple`), run: () => { UI.mode = 'grapple'; UI.aim = null; refresh(); } });
        hotActions.push({ icon: 'wait', label: 'Wait', off: acted, run: () => { UI.picked = null; order(() => TC.wait(S, p.id)); } });
        hotActions.push({ icon: 'undo', label: 'Undo', off: p.moved && p.from && !p.acted ? null : 'Nothing to undo: a move can be taken back until the piece rolls', run: () => order(() => TC.undoMove(S, p.id)) });
        hotActions.push({ icon: 'next', label: 'Next', run: () => cycle(1) });
        if (UI.mode === 'attack') {
          const d = act.damage;
          title = 'Attack'; meta = `Action · ${act.target}+ on 2d6 · ${pct(TC.chance2d6(act.target))}`;
          text = `${d.front == null ? 'Flank 5, back 10. Not the front.' : `Front ${d.front}, flank ${d.flank}, back ${d.behind}.`}`;
        } else { title = 'Grapple'; meta = `Action · ${gr.target}+ on 2d6 · ${pct(TC.chance2d6(gr.target))}`; text = 'Catch a foe and drag it one square.'; }
        const n = targets().size;
        let hint;
        if (p.acted) hint = 'Pick another piece, or <b>End</b> the turn.';
        else if (UI.aim) hint = 'Tap <b>Confirm?</b> or the foe again to go.';
        else if (!p.moved && n) hint = 'Tap a <b>pale</b> square to move, or a <b>red</b> foe to strike.';
        else if (!p.moved) hint = 'Tap a <b>pale</b> square to move, or drag the piece.';
        else if (n) hint = 'Tap a <b>red</b> foe to strike.';
        else hint = 'No foe in reach: <b>Wait</b>, or pick another piece.';
        const fl = focusLine();
        text = fl || `${text} <i>${hint}</i>`;
      } else {
        title = `${cap(S.turn)}'s turn`; text = '<i>Every piece has done what it can. Tap <b>End</b>, then set facing.</i>';
        hotActions.push({ icon: 'next', label: 'Next', run: () => cycle(1) });
        end.classList.add('pulse');
      }
    }
    if (sayMsg) text = `<em class="bl">${sayMsg}.</em> ` + text;
    info.innerHTML = `<div class="tx"><b>${title}</b><span class="mt">${meta}</span></div><div class="tx2">${text}</div>`;
    bar.innerHTML = '';
    hotActions.forEach((s, i) => bar.appendChild(hotButton(s, i)));
    $('#bar').classList.toggle('labels', hotActions.length > 0);
  }
  function focusLine() {
    const id = UI.aim ? UI.aim.target : UI.focus; if (id == null) return '';
    const b = targets().get(id), e = TC.piece(S, id); if (!b || !e) return '';
    const i = b.info, where = i.angle === 'behind' ? 'back' : i.angle;
    return `<b>${pName(e)}</b>: ${b.dist ? `walk ${b.dist}, ` : ''}strike its <b>${where}</b> · ${i.target}+ (${pct(i.chance)})${i.kind === 'attack' ? ` for <b>${i.damage}</b>${i.damage >= e.hp ? ' · it dies on a hit' : ''}` : ' to drag it'}.`;
  }

  function refresh() { autoSelect(); refreshHL(); renderDock(); }

  function cycle(dir) {
    const side = activeSide(), list = TC.alive(S, side).filter((q) => S.phase !== 'play' || !q.acted).sort((a, b) => (side === 'white' ? a.y - b.y : b.y - a.y) || a.x - b.x);
    if (!list.length) return;
    const i = list.findIndex((q) => q.id === UI.sel);
    UI.sel = list[(i + dir + list.length) % list.length].id; UI.picked = UI.sel; UI.aim = null; refresh();
  }
  function face(p, d) {
    if (!p) return;
    try { const ev = TC.setFacing(S, p.id, d); const v = views.get(p.id); if (v) turnTo(v, ev.facing, 140); sfx('pick'); } catch (e) { say(e.message); }
    refresh();
  }

  // ---------------- input ----------------
  const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(UP, -TOP);
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: (cx - r.left) / r.width * 2 - 1, y: -((cy - r.top) / r.height) * 2 + 1 }, camera);
    const hits = ray.intersectObjects(pickables.filter((h) => h.parent && h.parent.visible), false);
    const g = new V3(); const onGround = ray.ray.intersectPlane(groundPlane, g);
    const out = { piece: hits.length ? hits[0].object.userData.pid : null, ground: onGround ? g : null, cell: null };
    if (onGround) { const x = Math.floor(g.x + N / 2), y = Math.floor(g.z + N / 2); if (x >= 0 && y >= 0 && x < N && y < N) out.cell = { x, y }; }
    if (out.piece != null) { const p = TC.piece(S, out.piece); if (p) out.cell = { x: p.x, y: p.y }; }
    return out;
  }
  // a tap near the selected piece on one of its four arrows: which way
  function arrowHit(p, g) {
    if (!p || !g) return null;
    const c = cellPos(p.x, p.y), dx = g.x - c.x, dz = g.z - c.z;
    const ax = Math.abs(dx), az = Math.abs(dz);
    const along = Math.max(ax, az), perp = Math.min(ax, az);
    if (along < 0.42 || along > 0.9 || perp > 0.26) return null;
    return ax > az ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
  }

  async function tap(h) {
    if (!humanTurn()) return;
    ac();
    const side = activeSide(), sel = myPiece();
    const q = h.piece != null ? TC.piece(S, h.piece) : h.cell ? TC.pieceAt(S, h.cell.x, h.cell.y) : null;
    // the four facing arrows (setup and facing)
    if ((S.phase === 'setup' || S.phase === 'facing') && sel && h.piece == null) {
      const d = arrowHit(sel, h.ground);
      if (d != null) { face(sel, d); return; }
    }
    if (S.phase === 'setup') {
      if (q && q.side === side) { if (UI.sel === q.id) face(q, (q.facing + 1) % 4); else { UI.sel = q.id; sfx('pick'); refresh(); } return; }
      if (h.cell && !q && TC.inSetupZone(S, side, h.cell.x, h.cell.y)) {
        try {
          if (sel) { TC.relocate(S, sel.id, h.cell.x, h.cell.y); const v = views.get(sel.id); if (v) { v.anim = true; const from = v.root.position.clone(), to = cellPos(h.cell.x, h.cell.y); tween(200, (k) => { v.root.position.lerpVectors(from, to, k); v.fig.position.y = Math.sin(k * Math.PI) * 0.2; }).then(() => { v.fig.position.y = 0; v.x = h.cell.x; v.y = h.cell.y; v.anim = false; }); } UI.sel = null; }
          else {
            TC.place(S, side, UI.setupType, h.cell.x, h.cell.y);
            if (!TC.remaining(S, side)[UI.setupType]) { const next = Object.entries(TC.remaining(S, side)).find(([, n]) => n > 0); if (next) UI.setupType = next[0]; }
          }
          sfx('place');
        } catch (e) { say(e.message); sfx('no'); }
        sync(); refresh(); return;
      }
      UI.sel = null; refresh(); return;
    }
    if (S.phase === 'facing') {
      if (q && q.side === S.turn) { if (UI.sel === q.id) face(q, (q.facing + 1) % 4); else { UI.sel = q.id; sfx('pick'); refresh(); } return; }
      if (q) { UI.focus = null; UI.sel = q.id; refresh(); return; }
      return;
    }
    if (S.phase !== 'play') return;
    if (S.pending) {
      if (h.cell && S.pending.options.some((c) => c.x === h.cell.x && c.y === h.cell.y)) await order(() => TC.resolveGrapple(S, h.cell.x, h.cell.y));
      return;
    }
    // a strike waiting on Confirm?: the same foe again goes; anything else cancels it and counts as a fresh tap
    if (UI.aim) {
      if (q && q.id === UI.aim.target) { await strike(UI.aim); return; }
      UI.aim = null;
    }
    if (q && q.side === S.turn) { UI.sel = q.id; UI.picked = q.id; UI.focus = null; sfx('pick'); refresh(); return; }
    if (q && sel) {
      const b = targets().get(q.id);
      if (b) {
        const aim = { target: q.id, x: b.x, y: b.y, kind: UI.mode, path: b.dist ? TC.reachable(S, sel.id).get(b.x + ',' + b.y).path : [] };
        if (b.dist === 0) { await strike(aim); return; }
        UI.aim = aim; UI.focus = q.id; sfx('pick'); refresh(); return;
      }
      UI.focus = q.id; UI.sel = sel.id;
      say(sel.acted ? 'This piece has acted' : UI.mode === 'attack' && TC.unit(sel).attack.damage.front == null ? `Out of reach, or it faces you: a ${TC.unit(sel).name.toLowerCase()} cannot strike a foe's front` : 'Out of reach');
      sfx('no'); refresh(); return;
    }
    if (q) { UI.focus = q.id; refresh(); return; }
    if (sel && h.cell && !sel.moved && TC.reachable(S, sel.id).has(h.cell.x + ',' + h.cell.y) && (h.cell.x !== sel.x || h.cell.y !== sel.y)) {
      UI.focus = null; await order(() => TC.move(S, sel.id, h.cell.x, h.cell.y)); return;
    }
    UI.focus = null; refresh();
  }

  async function strike(aim) {
    const p = myPiece(); if (!p) return;
    UI.aim = null;
    if (aim.x !== p.x || aim.y !== p.y) { const ev = await order(() => TC.move(S, p.id, aim.x, aim.y)); if (!ev) return; }
    UI.picked = null; UI.focus = null;
    await order(() => (aim.kind === 'attack' ? TC.attack(S, p.id, aim.target) : TC.grapple(S, p.id, aim.target)));
  }

  // pointer: a tap; a drag from your piece (move it, or turn it while setting facing); a drag elsewhere turns the view
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!S) return;
    canvas.setPointerCapture(e.pointerId);
    const h = pick(e.clientX, e.clientY);
    down = { x: e.clientX, y: e.clientY, h, drag: null, az: cam.azT };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!S) return;
    if (!down) {
      if (e.pointerType !== 'mouse') return;
      const h = pick(e.clientX, e.clientY), c = h.cell;
      const changed = (c && (!UI.hover || c.x !== UI.hover.x || c.y !== UI.hover.y)) || (!c && UI.hover);
      if (changed) {
        UI.hover = c;
        const q = c ? TC.pieceAt(S, c.x, c.y) : null;
        UI.focus = q && S.phase === 'play' && myPiece() && q.side !== S.turn ? q.id : UI.aim ? UI.aim.target : null;
        if (!UI.busy) { refreshHL(); renderDock(); }
      }
      return;
    }
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.drag && Math.hypot(dx, dy) > 12) {
      const q = down.h.piece != null ? TC.piece(S, down.h.piece) : null;
      if (q && humanTurn() && q.side === activeSide()) {
        if (S.phase === 'facing') down.drag = 'face';
        else if (S.phase === 'setup' || (S.phase === 'play' && !S.pending && (!q.moved || !q.acted))) down.drag = 'piece';
        else down.drag = 'view';
        if (down.drag !== 'view') { UI.sel = q.id; UI.picked = q.id; UI.aim = null; refresh(); }
      } else down.drag = 'view';
    }
    if (down.drag === 'view') cam.azT = down.az - dx * 0.006;
    else if (down.drag === 'face') {
      const p = selPiece(); const s = project(cellPos(p.x, p.y)), r = canvas.getBoundingClientRect();
      const g = pick(e.clientX, e.clientY).ground; if (!g) return;
      const c = cellPos(p.x, p.y), d = Math.abs(g.x - c.x) > Math.abs(g.z - c.z) ? (g.x > c.x ? 1 : 3) : (g.z > c.z ? 2 : 0);
      void s; void r;
      if (d !== p.facing) face(p, d);
    } else if (down.drag === 'piece') {
      const h = pick(e.clientX, e.clientY); const c = h.cell;
      if (c && (!UI.hover || c.x !== UI.hover.x || c.y !== UI.hover.y)) { UI.hover = c; refreshHL(); }
    }
  });
  canvas.addEventListener('pointerup', async (e) => {
    if (!down) return;
    const d = down; down = null;
    if (!d.drag) { await tap(d.h); return; }
    if (d.drag === 'piece') {
      const h = pick(e.clientX, e.clientY); UI.hover = null;
      const p = myPiece(); if (!p || !h.cell) { refresh(); return; }
      if (h.cell.x === p.x && h.cell.y === p.y) { refresh(); return; }
      if (S.phase === 'setup') { UI.sel = p.id; await tap({ piece: null, cell: h.cell, ground: null }); return; }
      const q = TC.pieceAt(S, h.cell.x, h.cell.y);
      if (q && q.side !== p.side) { const b = targets().get(q.id); if (b) { await strike({ target: q.id, x: b.x, y: b.y, kind: UI.mode }); return; } }
      await tap({ piece: null, cell: h.cell, ground: null });
    }
    refresh();
  });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !down) { UI.hover = null; if (S && !UI.busy) refreshHL(); } });
  canvas.addEventListener('wheel', (e) => { cam.zoomT = Math.min(1.4, Math.max(0.55, cam.zoomT * (e.deltaY > 0 ? 1.08 : 0.93))); e.preventDefault(); }, { passive: false });

  $('#endBtn').onclick = () => {
    ac();
    if (!humanTurn()) return;
    if (S.phase === 'setup') finishSetup();
    else if (S.phase === 'play') { UI.sel = null; UI.aim = null; order(() => TC.endTurn(S)); }
    else if (S.phase === 'facing') { UI.sel = null; order(() => TC.confirmFacing(S)); }
  };
  $('#goPill').onclick = () => { if (UI.aim && humanTurn()) strike(UI.aim); };

  function finishSetup() {
    const side = activeSide();
    try { TC.finishSetup(S, side); } catch (e) { say(e.message); return; }
    UI.sel = null; log(`${cap(side)} sets up.`, side); sfx('place');
    const next = setupSide();
    if (next && !UI.ai[next]) {
      UI.hide = side;
      $('#passTxt').textContent = 'Pass to ' + cap(next);
      $('#passSub').textContent = `${cap(next)} sets up without seeing ${cap(side)}'s pieces.`;
      $('#pass').hidden = false;
      faceSide(next); UI.setupType = S.army.king ? 'king' : 'pawn';
    }
    sync(); refresh();
    if (S.phase === 'play') {
      if (!UI.ai.white && !UI.ai.black) { $('#passTxt').textContent = 'Pass to White'; $('#passSub').textContent = 'Both armies are on the board. The battle begins.'; $('#pass').hidden = false; }
      startBattle().then(refresh);
    }
    runAI();
  }
  $('#passGo').onclick = () => { $('#pass').hidden = true; sync(); refresh(); };

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.ov:not([hidden])')) { if (e.key === 'Escape') document.querySelectorAll('.ov').forEach((o) => { if (o.id !== 'title' || S) o.hidden = true; }); return; }
    if (!S) return;
    if (e.key >= '1' && e.key <= '9') { pressHot(+e.key - 1); return; }
    if (!humanTurn()) return;
    const p = myPiece();
    const arrows = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
    if (e.key === 'Escape') { UI.aim = null; UI.focus = null; refresh(); }
    else if (e.key === 'Enter') $('#endBtn').click();
    else if (e.key in arrows && p && (S.phase === 'facing' || S.phase === 'setup')) {
      e.preventDefault();
      // the arrow keys follow the screen: up is away from the viewer
      const turns = Math.round(((cam.az % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 2)) % 4;
      face(p, (arrows[e.key] + 4 - turns) % 4);
    }
  });

  // ---------------- menu and sheets ----------------
  $('#menuBtn').onclick = () => { ac(); $('#menu').hidden = !$('#menu').hidden; };
  document.addEventListener('pointerdown', (e) => { if (!$('#menu').hidden && !e.target.closest('#menu,#menuBtn')) $('#menu').hidden = true; });
  $('#menu').onclick = (e) => {
    const b = e.target.closest('.mi'); if (!b) return;
    $('#menu').hidden = true;
    const m = b.dataset.m;
    if (m === 'new') { $('#goBack').hidden = !S; $('#title').hidden = false; }
    else if (m === 'view') faceSide(viewSide());
    else if (m === 'log') $('#logOv').hidden = false;
    else if (m === 'help') $('#help').hidden = false;
    else if (m === 'sound') { UI.sound = !UI.sound; $('#soundLbl').textContent = UI.sound ? 'On' : 'Off'; }
  };
  document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { b.closest('.ov').hidden = true; }; });
  function seg(id, key) {
    const el = $(id);
    el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); UI.army[key] = +b.dataset.v; };
  }
  seg('#optKing', 'king'); seg('#optPawn', 'pawn');
  $('#goAI').onclick = () => { ac(); newGame(true); };
  $('#goHot').onclick = () => { ac(); newGame(false); };
  $('#goHelp').onclick = () => { $('#help').hidden = false; };
  $('#goBack').onclick = () => { $('#title').hidden = true; };
  $('#endNew').onclick = () => { $('#end').hidden = true; $('#goBack').hidden = true; $('#title').hidden = false; };
  $('#endLook').onclick = () => { $('#end').hidden = true; };

  function newGame(vsAI) {
    for (const v of [...views.values()]) dropView(v);
    clearDice();
    S = TC.newGame({ army: { king: UI.army.king, pawn: UI.army.pawn } });
    Object.assign(UI, { sel: null, picked: null, mode: 'attack', aim: null, hide: null, focus: null, busy: false, log: [], setupType: UI.army.king ? 'king' : 'pawn', ai: { white: false, black: !!vsAI } });
    $('#logList').innerHTML = '';
    log(`New game: ${UI.army.king ? 'a king and ' : ''}${UI.army.pawn} pawns a side${vsAI ? ', against the computer' : ', pass and play'}.`, 'hdr');
    $('#title').hidden = true; $('#end').hidden = true;
    faceSide('white');
    sync(); resize(); refresh();
    banner('Set up your army');
  }

  // ---------------- the frame loop ----------------
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t; now = t;
    runTweens(); updateParticles(dt); emitFlames(dt); placeCamera(dt);
    // the selected piece breathes
    for (const v of views.values()) if (!v.anim && !v.dying) v.fig.position.y = UI.sel === v.id ? Math.abs(Math.sin(t / 380)) * 0.05 : 0;
    renderer.render(scene, camera);
    if (S) updateTags();
  }
  addEventListener('resize', () => { resize(); });
  new ResizeObserver(() => resize()).observe($('#dock'));
  resize();
  requestAnimationFrame(frame);

  // for tests and the console
  window.TCtable = { get state() { return S; }, UI, newGame, tap, pick, refresh: () => { sync(); refresh(); }, cellPos, camera, project, pressHot, views, SPEED };
})();
