'use strict';
// GOBLIN DELVE · THE VIEW
// The dungeon seen through the party's eyes, the goblins standing in it, and the dice thrown onto its floor (three.js r128).
// It shows what the rules decided and decides nothing.
const VIEW = (() => {
  const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = {
    lin: t => t, inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t,
    back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  let REDUCED = false; try { REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }

  // ---------------- clock ----------------
  // tweens run on the view's own clock, so Fast speeds up every animation at once
  let vnow = 0, lastT = 0, speed = 1, tsec = 0, shakeAmt = 0;
  const tweens = [];
  const tween = (ms, fn, e = ease.inOut) => new Promise(res => tweens.push({ start: vnow, ms, fn, e, res }));
  const wait = ms => tween(ms, () => { });
  function runTweens(dt) {
    vnow += Math.min(dt, 100) * speed;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i], p = Math.min(1, (vnow - tw.start) / tw.ms);
      tw.fn(tw.e(p));
      if (p >= 1) { tweens.splice(i, 1); tw.res(); }
    }
  }

  // ---------------- sound: small synthesised clacks and thumps ----------------
  let AC = null, noiseBuf = null, muted = false;
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (AC.state === 'suspended') AC.resume();
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return AC;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
  function noise(t, type, f, q, peak, dec, to) {
    const s = AC.createBufferSource(); s.buffer = noiseBuf; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dec);
    const g = AC.createGain(); env(g, t, .004, peak, dec); s.connect(fl); fl.connect(g); g.connect(AC.destination); s.start(t, Math.random() * .5); s.stop(t + dec + .05);
  }
  function tone(t, type, f0, f1, peak, dec) {
    const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dec);
    const g = AC.createGain(); env(g, t, .006, peak, dec); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dec + .05);
  }
  function sfx(type, v = 1) {
    if (muted || !AC || AC.state !== 'running') return;
    const t = AC.currentTime;
    switch (type) {
      case 'clack': noise(t, 'bandpass', 2400 + Math.random() * 1400, 4, .45 * v, .05); tone(t, 'square', 1700 + Math.random() * 700, 0, .04 * v, .03); break;
      case 'throw': noise(t, 'bandpass', 700, 1.2, .12, .22, 2400); break;
      case 'hit': noise(t, 'bandpass', 1000, 2, .45, .08); tone(t, 'sine', 170, 70, .25, .14); break;
      case 'miss': noise(t, 'highpass', 2500, 1, .12, .15, 5000); break;
      case 'crit': [660, 880, 1320, 1760].forEach((f, i) => tone(t + i * .055, 'triangle', f, 0, .09, .32)); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => tone(t + i * .07, 'sine', f, 0, .08, .45)); break;
      case 'boom': noise(t, 'lowpass', 600, .7, .7, .8, 90); tone(t, 'sine', 95, 32, .45, .6); break;
      case 'zap': tone(t, 'sawtooth', 900, 300, .06, .18); noise(t, 'highpass', 3000, 1, .1, .12); break;
      case 'down': noise(t, 'bandpass', 800, 2, .35, .12); noise(t + .1, 'bandpass', 1300, 3, .2, .08); tone(t, 'sine', 140, 50, .2, .3); break;
      case 'select': tone(t, 'sine', 700, 940, .045, .07); break;
      case 'nope': tone(t, 'square', 180, 150, .05, .12); break;
      case 'turn': [392, 523].forEach((f, i) => tone(t + i * .1, 'triangle', f, 0, .07, .4)); break;
      case 'horn': tone(t, 'sawtooth', 98, 96, .14, .9); tone(t + .05, 'sawtooth', 147, 140, .08, .8); break;
      case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(t + i * .1, 'triangle', f, 0, .1, .6)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(t + i * .16, 'triangle', f, 0, .1, .7)); break;
    }
  }

  // ---------------- textures ----------------
  function tex(cv, opts = {}) {
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    if (opts.pixel !== false) { t.magFilter = THREE.NearestFilter; t.minFilter = opts.mips === false ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter; }
    else t.anisotropy = 4;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
    return t;
  }
  const canvasOf = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
  const glowTex = () => canvasOf(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const ringTex = () => canvasOf(128, 64, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.ellipse(64, 32, 54, 24, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = .35; g.lineWidth = 16; g.stroke(); });
  const shadowTex = () => canvasOf(64, 32, (g) => { const r = g.createRadialGradient(32, 16, 0, 32, 16, 32); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.save(); g.scale(1, .5); g.fillRect(0, 0, 64, 64); g.restore(); });
  const slashTex = () => canvasOf(128, 128, (g) => { g.strokeStyle = '#fff'; g.lineCap = 'round'; [[10, .9], [5, .5]].forEach(([w, a]) => { g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(20, 118, 100, -1.45, -.15); g.stroke(); }); });
  const flameTex = () => canvasOf(32, 64, (g) => { const r = g.createRadialGradient(16, 46, 1, 16, 40, 30); r.addColorStop(0, 'rgba(255,250,210,1)'); r.addColorStop(.3, 'rgba(255,190,70,.95)'); r.addColorStop(.7, 'rgba(230,80,20,.5)'); r.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(16, 2); g.bezierCurveTo(30, 30, 30, 62, 16, 62); g.bezierCurveTo(2, 62, 2, 30, 16, 2); g.fill(); });

  // ---------------- the scene ----------------
  let host, cv, renderer, scene, camera, W = 1, H = 1, started = false;
  // the dice have a scene of their own, drawn over the dungeon by a camera that looks down on them, so the face
  // that came up is the face you read; its floor is invisible, so they seem to land on the dungeon's
  let dscene, dcam;
  const DCAM = new V3(0, 3.6, 1.0), DLOOK = new V3(0, 0, -1.79);
  const CW = 3.6, CH = 2.7, ZN = 3.6, ZF = -6.4, DAIS = .42;
  const CAM = new V3(0, 1.38, 2.75), LOOK = new V3(0, .46, -2.4);
  const lights = {}, U = {}, fx = [], live = [];
  let T = {};

  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080b);
    scene.fog = new THREE.Fog(0x07080b, 6.5, 13.5);
    camera = new THREE.PerspectiveCamera(60, 1, .05, 40);
    T = { dshadow: tex(canvasOf(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.8)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }), { pixel: false }), glow: tex(glowTex(), { pixel: false }), ring: tex(ringTex(), { pixel: false }), shadow: tex(shadowTex(), { pixel: false }), slash: tex(slashTex(), { pixel: false }), flame: tex(flameTex(), { pixel: false }) };
    const len = ZN - ZF, zc = (ZN + ZF) / 2, tile = 1.6;
    const mat = (cvs, rep) => new THREE.MeshPhongMaterial({ map: tex(cvs, { repeat: rep }), shininess: 6, specular: 0x0a0a0a });
    const plane = (w, h, m, seg = 8) => new THREE.Mesh(new THREE.PlaneGeometry(w, h, seg, seg), m);
    const fl = plane(CW, len, mat(ART.floor().canvas(), [CW / tile, len / tile])); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, zc); scene.add(fl);
    const ce = plane(CW, len, mat(ART.ceiling().canvas(), [CW / tile, len / tile])); ce.rotation.x = Math.PI / 2; ce.position.set(0, CH, zc); scene.add(ce);
    const wl = ART.wall(64, 64, 1).canvas(), wr = ART.wall(64, 64, 2).canvas();
    const L = plane(len, CH, mat(wl, [len / tile, CH / tile])); L.rotation.y = Math.PI / 2; L.position.set(-CW / 2, CH / 2, zc); scene.add(L);
    const R = plane(len, CH, mat(wr, [len / tile, CH / tile])); R.rotation.y = -Math.PI / 2; R.position.set(CW / 2, CH / 2, zc); scene.add(R);
    const back = plane(CW, CH, new THREE.MeshPhongMaterial({ map: tex(ART.backWall().canvas()), shininess: 4 })); back.position.set(0, CH / 2, ZF); scene.add(back);
    // the shaman's dais: a low step of the same stone
    const dm = new THREE.MeshPhongMaterial({ map: tex(ART.wall(64, 64, 3).canvas(), { repeat: [1.4, .3] }), shininess: 4 });
    const dais = new THREE.Mesh(new THREE.BoxGeometry(CW, DAIS, 1.9), dm); dais.position.set(0, DAIS / 2, -4.25); scene.add(dais);
    // light: the party's lantern, two torches, the dark
    scene.add(new THREE.AmbientLight(0x56607a, .55));
    dscene = new THREE.Scene();
    dcam = new THREE.PerspectiveCamera(40, 1, .05, 30); dcam.position.copy(DCAM); dcam.lookAt(DLOOK);
    dscene.add(new THREE.AmbientLight(0x8890a8, .55));
    const key = new THREE.DirectionalLight(0xfff0d8, .75); key.position.set(-1.5, 3, 2); dscene.add(key);
    // a soft warm fill from the torches' side, high and far enough that it tints the dice without glaring off them
    const warm = new THREE.DirectionalLight(0xffb070, .3); warm.position.set(2.5, 3, -2.5); dscene.add(warm);
    const lantern = new THREE.PointLight(0xffd7a0, 1.15, 9, 1.4); lantern.position.set(.35, 1.9, 2.3); scene.add(lantern); lights.lantern = lantern;
    lights.torches = [-1, 1].map(s => {
      const g = new THREE.Group(); g.position.set(s * (CW / 2 - .06), 1.6, -2.9);
      const iron = new THREE.MeshPhongMaterial({ color: 0x2a2622, shininess: 20 });
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .3), iron); arm.rotation.y = Math.PI / 2; arm.position.set(-s * .14, -.12, 0); g.add(arm);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(.08, .045, .14, 8), iron); cup.position.set(-s * .27, -.04, 0); g.add(cup);
      const fm = new THREE.SpriteMaterial({ map: T.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const flame = new THREE.Sprite(fm); flame.scale.set(.2, .4, 1); flame.position.set(-s * .27, .17, 0); g.add(flame);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xff8a30, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .35 })); halo.scale.setScalar(1.1); halo.position.copy(flame.position); g.add(halo);
      const pl = new THREE.PointLight(0xff9440, 1.5, 6.5, 1.5); pl.position.set(-s * .4, .2, .1); g.add(pl);
      scene.add(g);
      return { flame, halo, pl, ph: Math.random() * 10 };
    });
  }

  // ---------------- the goblins ----------------
  const SPOTS = { front: [[-.97, -1.85], [0, -2.05], [.97, -1.85]], back: [[.5, -3.8], [-.5, -3.8]] };
  const PX = .024; // world units per sprite pixel
  function setUnits(S) {
    Object.keys(U).forEach(id => { scene.remove(U[id].root); delete U[id]; });
    let v = 0;
    Object.values(S.units).filter(u => u.side === 'foe').forEach(u => {
      const pix = ART.sprite(u.type, u.type === 'goblin' ? v++ : 0), w = pix.w * PX, h = pix.h * PX;
      const spot = (SPOTS[u.rank] || SPOTS.front)[u.slot] || [0, -2];
      const y0 = u.rank === 'back' ? DAIS : 0;
      const root = new THREE.Group(); root.position.set(spot[0], y0, spot[1]); scene.add(root);
      const pivot = new THREE.Group(); root.add(pivot);
      const mat = new THREE.MeshLambertMaterial({ map: tex(pix.canvas(), { mips: false }), alphaTest: .5, side: THREE.DoubleSide, emissive: 0x000000 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.position.y = h / 2; pivot.add(mesh);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * .8, w * .3), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; root.add(shadow);
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(w * .95, w * .42), new THREE.MeshBasicMaterial({ map: T.ring, color: 0xffc040, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .02; root.add(ring);
      U[u.id] = { id: u.id, root, pivot, mesh, mat, shadow, ring, w, h, home: root.position.clone(), ph: Math.random() * 6, alive: true, flash: 0, flashCol: new THREE.Color(1, 1, 1), mark: null, tint: 0 };
    });
  }
  // where a goblin is on the page: its box, its head and its chest, in CSS pixels inside the view
  function project(p) { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, z: v.z }; }
  function boxOf(id) {
    const u = U[id]; if (!u) return null;
    u.root.updateMatrixWorld();
    const c = new V3(0, u.h / 2, 0).applyMatrix4(u.pivot.matrixWorld);
    const a = project(c.clone().add(new V3(-u.w / 2, u.h / 2, 0))), b = project(c.clone().add(new V3(u.w / 2, -u.h / 2, 0)));
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: u.home.z };
  }
  const chest = id => { const u = U[id]; u.root.updateMatrixWorld(); return new V3(0, u.h * .55, .05).applyMatrix4(u.pivot.matrixWorld); };
  function mark(map) { Object.values(U).forEach(u => u.mark = map[u.id] || null); }

  // ---------------- effects ----------------
  function sprite(color, size, opts = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: opts.map || T.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: opts.opacity ?? 1 }));
    s.scale.setScalar(size); return s;
  }
  function burst(pos, colors, n = 16, sp = 1.6, size = .09, life = .6, grav = 1.2, into = scene) {
    if (REDUCED) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const s = sprite(colors[i % colors.length], size * rand(.6, 1.3)); s.position.copy(pos); into.add(s); s.userData.into = into;
      const dir = new V3(rand(-1, 1), rand(-.3, 1.2), rand(-.6, .8)).normalize().multiplyScalar(sp * rand(.4, 1));
      fx.push({ s, v: dir, life: life * rand(.6, 1.2), age: 0, grav, s0: s.scale.x });
    }
  }
  function runFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]; p.age += dt * speed;
      const k = p.age / p.life;
      if (k >= 1) { p.s.userData.into.remove(p.s); fx.splice(i, 1); continue; }
      p.v.y -= p.grav * dt * speed; p.s.position.addScaledVector(p.v, dt * speed);
      p.s.material.opacity = 1 - k; p.s.scale.setScalar(p.s0 * (1 - k * .5));
    }
  }
  function shake(a) { if (!REDUCED) shakeAmt = Math.max(shakeAmt, a); }
  function hurt(id, opts = {}) {
    const u = U[id]; if (!u) return Promise.resolve();
    u.flash = 1; u.flashCol.set(opts.color || 0xffffff);
    burst(chest(id), opts.colors || [0xff5a3a, 0xffc070, 0xffffff], opts.crit ? 26 : 12, opts.crit ? 2.2 : 1.4, .08, .5);
    if (opts.crit) shake(.12);
    const z0 = u.home.z;
    return tween(260, k => { u.root.position.z = z0 - Math.sin(k * Math.PI) * (opts.crit ? .22 : .12); }, ease.out);
  }
  function kill(id) {
    const u = U[id]; if (!u || !u.alive) return Promise.resolve();
    u.alive = false; u.mark = null; sfx('down');
    u.mat.transparent = true;
    const p = chest(id);
    return tween(560, k => { u.pivot.rotation.x = -1.5 * k; u.pivot.position.y = -.05 * k; }, ease.in).then(() => {
      burst(new V3(p.x, (u.home.y || 0) + .1, u.home.z), [0x8a8070, 0x5a5348, 0xb0a890], 18, 1.1, .12, .8, .6);
      return tween(420, k => { u.mat.opacity = 1 - k; u.shadow.material.opacity = 1 - k; });
    }).then(() => { u.root.visible = false; });
  }
  function lunge(id) {
    const u = U[id]; if (!u || !u.alive) return Promise.resolve();
    const h = u.home;
    sfx('throw');
    return tween(170, k => { u.root.position.z = h.z + .75 * k; u.root.scale.setScalar(1 + .1 * k); }, ease.in)
      .then(() => { shake(.08); return tween(260, k => { u.root.position.z = h.z + .75 * (1 - k); u.root.scale.setScalar(1 + .1 * (1 - k)); }, ease.out); });
  }
  function hop(id) {
    const u = U[id]; if (!u || !u.alive) return Promise.resolve();
    return tween(220, k => { u.pivot.position.y = Math.sin(k * Math.PI) * .12; });
  }
  function glowAt(pos, color, size, ms) {
    const s = sprite(color, .01); s.position.copy(pos); scene.add(s);
    return tween(ms, k => { s.scale.setScalar(size * Math.sin(Math.min(1, k * 1.4) * Math.PI / 2)); s.material.opacity = k < .7 ? 1 : (1 - k) / .3; }).then(() => scene.remove(s));
  }
  function cast(id, color = 0x7dff9a) {
    const u = U[id]; if (!u) return Promise.resolve();
    const hand = new V3(u.w * .4, u.h * .72, .06).applyMatrix4(u.pivot.matrixWorld);
    burst(hand, [color, 0xffffff], 10, .7, .07, .6, -.4);
    return glowAt(hand, color, .7, 420);
  }
  // a bolt from a goblin (or, with from = null, from the party) to a goblin (or, with to = null, to the party)
  function bolt(from, to, color = 0x9fc0ff, size = .32) {
    const a = from ? chest(from) : CAM.clone().add(new V3(rand(-.3, .3), -.5, -.4));
    const b = to ? chest(to) : CAM.clone().add(new V3(.8, -.45, -.6));
    const s = sprite(color, size), core = sprite(0xffffff, size * .45); s.add(core); core.scale.setScalar(.45);
    s.position.copy(a); scene.add(s);
    const mid = a.clone().lerp(b, .5); mid.y += .35;
    return tween(300, k => {
      const p1 = a.clone().lerp(mid, k), p2 = mid.clone().lerp(b, k); s.position.copy(p1.lerp(p2, k));
      if (Math.random() < .5) burst(s.position, [color], 1, .2, size * .4, .3, 0);
    }, ease.in).then(() => { scene.remove(s); burst(b, [color, 0xffffff], 14, 1.4, .09, .45); });
  }
  function slash(id, color = 0xffffff) {
    const u = U[id]; if (!u) return Promise.resolve();
    const s = sprite(color, .1, { map: T.slash }); s.position.copy(chest(id)).add(new V3(0, 0, .1)); s.material.rotation = rand(-.6, .6) + (Math.random() < .5 ? 0 : Math.PI); scene.add(s);
    sfx('hit');
    return tween(220, k => { s.scale.setScalar(.15 + 1.0 * ease.out(k)); s.material.opacity = 1 - k * k; }, ease.lin).then(() => scene.remove(s));
  }
  function sparkle(id, color = 0x7dffa0) {
    const u = U[id]; if (!u) return Promise.resolve();
    const p = chest(id); burst(p, [color, 0xffffff], 14, .6, .08, .9, -.6); return glowAt(p, color, 1.1, 500);
  }
  function fireball(ids) {
    sfx('boom');
    return Promise.all(ids.map((id, i) => wait(i * 60).then(() => bolt(null, id, 0xff7a20, .5)).then(() => { burst(chest(id), [0xff7a20, 0xffd060, 0xff3a10], 20, 1.8, .12, .6); shake(.1); })));
  }

  // ---------------- dice ----------------
  // Each unit type rolls its own size of die (d4, d6, d8 or d10) in its own colour, numbered the usual way, with the
  // surge's burst behind the top number. A d4 is read by the number at its top corner.
  const kits = {}, faceTex = {};
  function faceTexture(style, shape, labels, topN, hi) {
    const k = [style, shape, labels.join('.'), topN, hi || ''].join('|');
    return faceTex[k] || (faceTex[k] = tex(ART.dieFace(ART.DICE[style] || ART.DICE.goblin, shape, labels, topN, hi), { pixel: false }));
  }
  // the numbers are drawn in the page's number face: once it has loaded, draw the faces again
  try { document.fonts && document.fonts.ready.then(() => { Object.keys(faceTex).forEach(k => delete faceTex[k]); Object.keys(kits).forEach(k => delete kits[k]); }); } catch (e) { }
  const S6 = .38; // a d6's edge; the other shapes are sized to look about as big
  // a mesh of triangles, one material each, each mapped onto the bottom left, bottom right and top of its picture
  function triGeo(tris) {
    const pos = [], uv = [], g = new THREE.BufferGeometry();
    tris.forEach((t, i) => { pos.push(...t[0].toArray(), ...t[1].toArray(), ...t[2].toArray()); uv.push(0, 0, 1, 0, .5, .866); g.addGroup(i * 3, 3, i); });
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  // wind a triangle anticlockwise seen from outside
  function orient(a, b, c) { const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)); const cen = a.clone().add(b).add(c); return n.dot(cen) < 0 ? [a, c, b] : [a, b, c]; }
  // a shape, by its number of sides: its geometry, what each face's picture shows, and for each number the face that
  // shows it (its outward normal, and which way is up on its picture) and how high the die rests
  const shapes = {};
  function shapeOf(sides) {
    if (shapes[sides]) return shapes[sides];
    let G;
    if (sides === 4) {
      const a = .42, V = [new V3(1, 1, 1), new V3(1, -1, -1), new V3(-1, 1, -1), new V3(-1, -1, 1)].map(v => v.multiplyScalar(a / Math.sqrt(3)));
      const tris = [], labels = [];
      for (let k = 0; k < 4; k++) { // face k is the one opposite corner k
        const t = orient(...[0, 1, 2, 3].filter(i => i !== k).map(i => V[i]));
        tris.push(t); labels.push(t.map(p => V.indexOf(p) + 1));
      }
      // number k + 1 is read with corner k up, the face opposite it on the floor; the picture's "up" is turned so a face
      // looks at the party
      const faces = V.map((v, k) => {
        const n = v.clone().normalize(), f = V[(k + 1) % 4].clone().normalize().negate();
        return { v: k + 1, mat: k, n, up: f.sub(n.clone().multiplyScalar(n.dot(f))).normalize().negate(), corner: true };
      });
      G = { geo: triGeo(tris), shape: 'tri4', labels, faces, rest: a / 3 };
    } else if (sides === 8) {
      const r = .3, tris = [], nums = [];
      for (let i = 0; i < 8; i++) { // opposite faces add up to 9
        const sx = i & 1 ? -1 : 1, sy = i & 2 ? -1 : 1, sz = i & 4 ? -1 : 1;
        tris.push(orient(new V3(sx * r, 0, 0), new V3(0, sy * r, 0), new V3(0, 0, sz * r))); nums.push(i + 1);
      }
      const geo = triGeo(tris), fr = faceFrames(geo);
      G = { geo, shape: 'tri', labels: nums.map(n => [n]), faces: nums.map((v, i) => ({ v, mat: i, ...fr[i] })), rest: r / Math.sqrt(3) };
    } else if (sides === 10) { // a pentagonal trapezohedron: five kites round the top point, five round the bottom
      const R = .25, H = .29, e = H * (1 - Math.cos(Math.PI / 5)) / (1 + Math.cos(Math.PI / 5)), T = new V3(0, H, 0), B = new V3(0, -H, 0);
      const A = k => new V3(Math.cos(k * Math.PI * 2 / 5) * R, e, Math.sin(k * Math.PI * 2 / 5) * R), Bk = k => new V3(Math.cos((k + .5) * Math.PI * 2 / 5) * R, -e, Math.sin((k + .5) * Math.PI * 2 / 5) * R);
      const kites = []; for (let k = 0; k < 5; k++) { kites.push([T, A(k), Bk(k), A(k + 1)]); kites.push([B, Bk(k), A(k + 1), Bk(k + 1)]); }
      const pos = [], uv = [], geo = new THREE.BufferGeometry(), nums = [1, 2, 7, 4, 3, 10, 9, 6, 5, 8], ds = [];
      kites.forEach(([P, X, Q, Y], i) => {
        const n = new V3().subVectors(X, P).cross(new V3().subVectors(Q, P)), c = P.clone().add(X).add(Q).add(Y); if (n.dot(c) < 0) [X, Y] = [Y, X];
        [[P, [.5, .98]], [X, [.148, .203]], [Q, [.5, .02]], [P, [.5, .98]], [Q, [.5, .02]], [Y, [.852, .203]]].forEach(([v, t]) => { pos.push(v.x, v.y, v.z); uv.push(t[0], t[1]); });
        geo.addGroup(i * 6, 6, i);
        ds.push(new V3().subVectors(X, P).cross(new V3().subVectors(Q, P)).normalize().dot(P));
      });
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
      const fr = faceFrames(geo);
      G = { geo, shape: 'kite', labels: nums.map(n => [n]), faces: nums.map((v, i) => ({ v, mat: i, ...fr[i] })), rest: ds[0] };
    } else { // a cube: opposite faces add up to 7
      const geo = new THREE.BoxGeometry(S6, S6, S6), fr = faceFrames(geo), nums = [1, 6, 2, 5, 3, 4];
      G = { geo, shape: 'sq', labels: nums.map(n => [n]), faces: nums.map((v, i) => ({ v, mat: i, ...fr[i] })), rest: S6 / 2 };
    }
    return shapes[sides] = G;
  }
  // a set of dice: a shape in a unit's colour; mark: the top number carries the burst
  function dieKit(style, sides, mark = true) {
    const k = [style, sides, mark].join('|');
    if (kits[k]) return kits[k];
    const G = shapeOf(sides), topN = mark ? sides : 0;
    const mats = G.labels.map(l => new THREE.MeshPhongMaterial({ map: faceTexture(style, G.shape, l, topN), shininess: 40, specular: 0x1c1c1c, emissive: 0x000000 }));
    return kits[k] = { ...G, mats, sides, style, topN };
  }
  // for each face: its outward normal and which way is "up" on its picture (so a landed die can turn its face to be read)
  function faceFrames(geo) {
    const P = geo.attributes.position, UV = geo.attributes.uv, out = [];
    geo.groups.forEach(gr => {
      const i0 = geo.index ? geo.index.getX(gr.start) : gr.start, i1 = geo.index ? geo.index.getX(gr.start + 1) : gr.start + 1, i2 = geo.index ? geo.index.getX(gr.start + 2) : gr.start + 2;
      const p = [i0, i1, i2].map(i => new V3(P.getX(i), P.getY(i), P.getZ(i))), t = [i0, i1, i2].map(i => [UV.getX(i), UV.getY(i)]);
      const e1 = p[1].clone().sub(p[0]), e2 = p[2].clone().sub(p[0]);
      const du1 = t[1][0] - t[0][0], dv1 = t[1][1] - t[0][1], du2 = t[2][0] - t[0][0], dv2 = t[2][1] - t[0][1];
      const r = 1 / (du1 * dv2 - du2 * dv1 || 1);
      const B = e2.clone().multiplyScalar(du1).sub(e1.clone().multiplyScalar(du2)).multiplyScalar(r).normalize();
      const n = e1.clone().cross(e2).normalize();
      out[gr.materialIndex] = { n, up: B };
    });
    return out;
  }
  // where dice can land: the floor in front of the party, on a grid, the nearest free spot to where they are aimed
  const taken = [];
  function spotNear(x, z) {
    let best = null, bd = 1e9;
    for (let gx = -.84; gx <= .841; gx += .56) for (let gz = .45; gz >= -.65; gz -= .5) {
      if (taken.some(t => Math.hypot(t.x - gx, t.z - gz) < .5)) continue;
      const d = Math.hypot(gx - x, (gz - z) * 1.4); if (d < bd) { bd = d; best = { x: gx + rand(-.03, .03), z: gz + rand(-.03, .03) }; }
    }
    best = best || { x: rand(-1, 1), z: rand(-.5, .5) };
    taken.push(best); return best;
  }
  function finalQuat(face, yaw) {
    const q1 = new THREE.Quaternion().setFromUnitVectors(face.n, UP);
    const up = face.up.clone().applyQuaternion(q1); up.y = 0; up.normalize();
    const want = new V3(Math.sin(yaw), 0, -Math.cos(yaw)); // the picture's top points away from the party
    const ang = Math.atan2(up.clone().cross(want).y, up.dot(want));
    return new THREE.Quaternion().setFromAxisAngle(UP, ang).multiply(q1);
  }
  // throw one die so it lands showing the number v; from: where it flies in from
  function throwDie(kit, mats, v, from, spot, dur = 640) {
    const m = new THREE.Mesh(kit.geo, mats); m.scale.setScalar(1); dscene.add(m); live.push(m);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ map: T.dshadow, transparent: true, depthWrite: false, opacity: 0 }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(from.x, .002, from.z); dscene.add(sh); m.userData.shadow = sh;
    const face = kit.faces.find(f => f.v === v), to = new V3(spot.x, kit.rest, spot.z);
    const finalQ = finalQuat(face, rand(-.35, .35));
    const dir = new V3(to.x - from.x, 0, to.z - from.z).normalize();
    const axis = new V3().crossVectors(UP, dir).add(new V3(rand(-.3, .3), rand(-.3, .3), rand(-.3, .3))).normalize();
    const wob = new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
    const total = Math.PI * 2 * rand(1.8, 2.6), impacts = [.34, .58, .75, .87, .95], hts = [.32, .13, .05, .015];
    let lastPh = -1; const q = new THREE.Quaternion(), qw = new THREE.Quaternion();
    m.position.copy(from);
    return tween(dur, t => {
      const p = ease.out(Math.min(1, t * 1.06));
      m.position.x = from.x + (to.x - from.x) * p; m.position.z = from.z + (to.z - from.z) * p;
      let ph = impacts.findIndex(x => t < x); if (ph < 0) ph = impacts.length;
      if (ph === 0) { const s = t / impacts[0]; m.position.y = to.y + (from.y - to.y) * (1 - s * s); }
      else if (ph < impacts.length) { const a = impacts[ph - 1], b = impacts[ph], s = (t - a) / (b - a); m.position.y = to.y + hts[ph - 1] * 4 * s * (1 - s); }
      else m.position.y = to.y;
      if (ph !== lastPh && ph > 0 && ph <= impacts.length) sfx('clack', Math.max(.15, 1 - ph * .22));
      lastPh = ph;
      const remain = total * Math.pow(1 - t, 2.3);
      q.setFromAxisAngle(axis, -remain); qw.setFromAxisAngle(wob, .6 * Math.pow(1 - t, 3) * Math.sin(t * 30));
      m.quaternion.copy(q).multiply(qw).multiply(finalQ);
      sh.position.x = m.position.x; sh.position.z = m.position.z; sh.material.opacity = Math.max(0, .75 - (m.position.y - to.y) * .5);
    }, ease.lin).then(() => {
      m.quaternion.copy(finalQ); m.position.copy(to);
      // once it settles, the face that came up lights a little and the faces on the die's sides darken, so the result
      // is the one number that stands out. A d4 shows its number by the top corner of all three faces it has up: they
      // all light, and their other numbers fade.
      if (!kit.dim) kit.dim = mats.map(x => { const c = x.clone(); c.color = new THREE.Color(0x5a5a5a); return c; });
      if (!kit.lit) kit.lit = {};
      const lit = i => { const key = face.corner ? i + ':' + v : i; return kit.lit[key] || (kit.lit[key] = (() => {
        const up = mats[i].clone(); if (face.corner) up.map = faceTexture(kit.style, kit.shape, kit.labels[i], kit.topN, v);
        up.emissive = new THREE.Color(0x3a362c); up.emissiveMap = up.map; return up;
      })()); };
      m.material = kit.dim.slice();
      (face.corner ? mats.map((x, i) => i).filter(i => i !== face.mat) : [face.mat]).forEach(i => m.material[i] = lit(i));
      return m;
    });
  }
  function critFlare(m) {
    const g = sprite(0xffb020, .9); m.add(g);
    m.material = m.material.map(x => { const c = x.clone(); c.emissive = new THREE.Color(0xff8a00); c.emissiveIntensity = .5; return c; });
    burst(m.position.clone().setY(m.position.y + .12), [0xffd25a, 0xfff0b0, 0xff8a20], 24, 1.8, .07, .6, 1.5, dscene);
    shake(.1); sfx('crit'); flashScreen();
    return tween(280, k => m.scale.setScalar(1 + .35 * Math.sin(Math.PI * k)), ease.out);
  }
  function dim(m) { m.material = m.material.map(x => { const c = x.clone(); c.transparent = true; c.opacity = .4; return c; }); }
  // Compile every kind of material the dice and effects will use before the first roll: a material's shader is built the
  // first time it is drawn, and building one mid-roll stalls a frame (on a phone a hitch; on a software renderer, a
  // black frame).
  function warmUp() {
    const kit = dieKit('fighter', 6);
    const lit = kit.mats[0].clone(); lit.emissive = new THREE.Color(0x3a362c); lit.emissiveMap = lit.map;
    const flare = kit.mats[0].clone(); flare.emissive = new THREE.Color(0xff8a00); flare.emissiveIntensity = .5;
    const flareLit = lit.clone(); flareLit.emissive = new THREE.Color(0xff8a00);
    const faded = kit.mats[0].clone(); faded.transparent = true; faded.opacity = .4;
    const fadedLit = lit.clone(); fadedLit.transparent = true; fadedLit.opacity = .4;
    const temp = [];
    [kit.mats, [lit], [flare], [flareLit], [faded], [fadedLit]].forEach((mats, i) => {
      const m = new THREE.Mesh(kit.geo, mats.length > 1 ? mats : Array(6).fill(mats[0])); m.position.set(i * .5 - 1.2, -5, 0); dscene.add(m); temp.push([dscene, m]);
    });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ map: T.dshadow, transparent: true, depthWrite: false })); sh.position.y = -5; dscene.add(sh); temp.push([dscene, sh]);
    [scene, dscene].forEach(sc => { const sp = sprite(0xffffff, .1); sp.position.y = -5; sc.add(sp); temp.push([sc, sp]); });
    const sl = sprite(0xffffff, .1, { map: T.slash }); sl.position.y = -5; scene.add(sl); temp.push([scene, sl]);
    try { renderer.compile(scene, camera); renderer.compile(dscene, dcam); } catch (e) { }
    temp.forEach(([sc, m]) => sc.remove(m));
  }
  function clearDice() {
    taken.length = 0;
    const ds = live.splice(0);
    ds.forEach(d => { const s0 = d.scale.x, sh = d.userData.shadow; tween(160, t => { d.scale.setScalar(s0 * (1 - t)); if (sh) sh.material.opacity *= .8; }).then(() => { dscene.remove(d); if (sh) dscene.remove(sh); }); });
  }
  const partyHand = () => new V3(rand(-.5, .5), 1.5, 1.7);
  const foeHand = id => new V3(U[id] ? U[id].home.x * .9 + rand(-.15, .15) : rand(-.6, .6), 1.4, -2.2);
  // Throw a unit's dice: every target's first dice together, then each crit's extra die out of the die that crit.
  // spec: { style, sides, mark (the top number has the burst), from (a goblin's id, or null for the party),
  //   groups: [{ target, dice: [{ n, from, dropped }] }], flare (a kept top number flares), onLand(die, group) }
  // keep: leave the dice already down (a defence roll lands beside the attack's) · aim: where on the floor to land
  async function roll(spec) {
    if (!spec.keep) { clearDice(); await wait(170); }
    const kit = dieKit(spec.style, spec.sides, spec.mark !== false), mats = kit.mats;
    const flares = d => spec.flare && d.n === spec.sides && !d.dropped;
    const start = () => spec.from ? foeHand(spec.from) : partyHand();
    const aims = spec.groups.length > 1 ? spec.groups.map(g => U[g.target] ? { x: U[g.target].home.x * 1.05, z: U[g.target].home.z < -3 ? -.45 : .05 } : { x: 0, z: 0 }) : null;
    sfx('throw');
    const firsts = [];
    spec.groups.forEach((g, gi) => g.dice.forEach((d, di) => { if (d.from < 0) firsts.push({ g, gi, d, di }); }));
    await Promise.all(firsts.map((f, k) => {
      const aim = spec.aim || (aims ? aims[f.gi] : { x: (k - (firsts.length - 1) / 2) * .56, z: .05 });
      const spot = spotNear(aim.x, aim.z);
      return wait(k * 70).then(() => throwDie(kit, mats, f.d.n, start(), spot)).then(m => { f.d.mesh = m; spec.onLand && spec.onLand(f.d, f.g); return flares(f.d) ? critFlare(m) : null; });
    }));
    // explosions, in the order they were rolled
    for (const g of spec.groups) {
      for (let di = 0; di < g.dice.length; di++) {
        const d = g.dice[di]; if (d.from < 0) continue;
        const parent = g.dice[d.from].mesh; if (!parent) continue;
        const p = parent.position, spot = spotNear(p.x + .5, p.z - .4);
        const from = p.clone().add(new V3(0, .7, 0));
        d.mesh = await throwDie(kit, mats, d.n, from, spot, 480);
        spec.onLand && spec.onLand(d, g);
        if (flares(d)) await critFlare(d.mesh);
      }
    }
    spec.groups.forEach(g => g.dice.forEach(d => { if (d.dropped && d.mesh) dim(d.mesh); }));
  }
  // where a landed die is on the page (to pin a label to it)
  const dieAt = m => { const v = m.position.clone().add(new V3(0, .22, 0)).project(dcam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; };

  // ---------------- screen flash ----------------
  function flashScreen(color) {
    const f = host && host.querySelector('.flash'); if (!f || REDUCED) return;
    if (color) f.style.background = color; else f.style.background = '';
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  // ---------------- frame ----------------
  function resize() {
    const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    const aspect = W / H; camera.aspect = aspect;
    // fit the corridor's width at the goblins' front rank, whatever the shape of the window
    const dist = CAM.z - (-1.9), half = 1.62;
    const hfov = 2 * Math.atan(half / dist);
    camera.fov = Math.min(80, Math.max(42, 2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180 / Math.PI));
    camera.updateProjectionMatrix();
    dcam.aspect = aspect;
    const dd = DCAM.distanceTo(new V3(0, 0, 0)), dh = 1.3;
    // wide enough for the dice floor, and tall enough that the nearest row stays above the bottom edge
    dcam.fov = Math.min(84, Math.max(66, 2 * Math.atan(dh / dd / aspect) * 180 / Math.PI));
    dcam.updateProjectionMatrix();
  }
  let onFrame = null;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = lastT ? Math.min(.1, (now - lastT) / 1000) : .016; lastT = now; tsec += dt;
    runTweens(dt * 1000); runFx(dt);
    // torches flicker
    lights.torches.forEach((t, i) => {
      const f = .85 + .15 * Math.sin(tsec * 9 + t.ph) * Math.sin(tsec * 5.3 + t.ph * 2) + rand(-.05, .05);
      t.pl.intensity = 1.35 * f; t.flame.scale.set(.2 * (.9 + .1 * f), .4 * f, 1); t.halo.material.opacity = .28 * f;
    });
    lights.lantern.intensity = 1.1 + .04 * Math.sin(tsec * 2.1);
    // goblins breathe; marks pulse; flashes fade
    Object.values(U).forEach(u => {
      if (u.alive) { u.mesh.position.y = u.h / 2 + Math.sin(tsec * 2.3 + u.ph) * .012; u.mesh.scale.y = 1 + Math.sin(tsec * 2.3 + u.ph + 1) * .012; }
      const pulse = .5 + .5 * Math.sin(tsec * 6);
      const want = !u.alive ? 0 : u.mark === 'hot' ? .95 : u.mark === 'valid' ? .45 + .35 * pulse : 0;
      u.ring.material.opacity += (want - u.ring.material.opacity) * .25;
      u.ring.material.color.set(u.mark === 'heal' ? 0x7dffa0 : 0xffc040);
      u.flash = Math.max(0, u.flash - dt * 3.2 * speed);
      const glow = u.mark === 'hot' ? .18 : u.mark === 'valid' ? .07 * pulse : 0;
      u.mat.emissive.setRGB(u.flash * u.flashCol.r + glow, u.flash * u.flashCol.g + glow * .75, u.flash * u.flashCol.b + glow * .2);
    });
    // the camera: a slow sway, and a shake when something lands hard
    shakeAmt = Math.max(0, shakeAmt - dt * .6);
    const s = shakeAmt * shakeAmt * 4;
    camera.position.set(CAM.x + Math.sin(tsec * .35) * .03 + rand(-s, s), CAM.y + Math.sin(tsec * .5) * .015 + rand(-s, s), CAM.z);
    camera.lookAt(LOOK);
    renderer.clear(); renderer.render(scene, camera);
    if (dscene.children.length > 3) { renderer.clearDepth(); renderer.render(dscene, dcam); }
    if (onFrame) onFrame();
  }
  function init(el) {
    host = el; cv = el.querySelector('canvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.autoClear = false;
    build(); resize(); warmUp();
    new ResizeObserver(resize).observe(host);
    if (!started) { started = true; requestAnimationFrame(frame); }
  }

  return {
    init, setUnits, boxOf, mark, roll, clearDice, dieAt, hurt, kill, lunge, hop, cast, bolt, slash, sparkle, fireball, shake, flashScreen, sfx, audio, wait, tween, ease,
    set speed(v) { speed = v; }, get speed() { return speed; }, set muted(v) { muted = v; }, get muted() { return muted; }, set onFrame(f) { onFrame = f; },
    alive: id => U[id] && U[id].alive,
    debug: () => ({ cam: camera.position.toArray().map(v => +v.toFixed(2)), shake: shakeAmt, live: live.length, fx: fx.length, d: dscene.children.length }),
  };
})();
