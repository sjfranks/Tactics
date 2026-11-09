'use strict';
// GOBLIN DELVE · THE ART
// Every picture is painted in code, pixel by pixel: the party's portraits, the goblins, the dungeon's stone, the die faces.
// Shapes are filled at pixel centres (no smoothing), shaded with a fixed light from the upper left, then outlined.
const ART = (() => {
  const L = (() => { const v = [-.5, -.62, .6], m = Math.hypot(...v); return v.map(x => x / m); })();
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const dith = (x, y, t) => t > BAYER[(y & 3) * 4 + (x & 3)];

  class Pix {
    constructor(w, h) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); }
    get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x]; }
    set(x, y, col) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || col == null) return; this.c[y * this.w + x] = col; }
    paint(x, y, col) { this.set(x, y, typeof col === 'function' ? col(x, y) : col); }
    rect(x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.paint(i, j, col); }
    ell(cx, cy, rx, ry, col) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.paint(x, y, col);
      }
    }
    // a lit ellipsoid: pal is [highlight, light, base, shade, dark]
    ball(cx, cy, rx, ry, pal, bias = 0) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        const nz = Math.sqrt(1 - d), l = nx * L[0] + ny * L[1] + nz * L[2] + bias;
        this.set(x, y, shadeOf(pal, l, x, y));
      }
    }
    poly(pts, col) {
      const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      for (let y = y0; y <= y1; y++) {
        const yc = y + .5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - .5); x < xs[k + 1] - .5; x++) this.paint(x, y, col);
      }
    }
    line(x0, y0, x1, y1, col, w = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
        if (w === 1) this.paint(x, y, col); else this.rect(x - (w >> 1), y - (w >> 1), w, w, col);
      }
    }
    // dark rim around every painted shape (only where it borders empty space)
    outline(col) {
      const add = [];
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) != null) continue;
        if (this.get(x + 1, y) != null || this.get(x - 1, y) != null || this.get(x, y + 1) != null || this.get(x, y - 1) != null) add.push([x, y]);
      }
      add.forEach(([x, y]) => this.set(x, y, col));
      return this;
    }
    canvas(scale = 1) {
      const cv = document.createElement('canvas'); cv.width = this.w * scale; cv.height = this.h * scale;
      const g = cv.getContext('2d'), im = g.createImageData(this.w, this.h);
      this.c.forEach((col, i) => { if (col == null) return; const n = parseInt(col.slice(1), 16); im.data.set([n >> 16 & 255, n >> 8 & 255, n & 255, 255], i * 4); });
      if (scale === 1) g.putImageData(im, 0, 0);
      else { const t = document.createElement('canvas'); t.width = this.w; t.height = this.h; t.getContext('2d').putImageData(im, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, cv.width, cv.height); }
      return cv;
    }
  }
  function shadeOf(pal, l, x, y) {
    // thresholds between the five tones, with a dithered seam between light and base, and base and shade
    if (l > .93) return pal[0];
    if (l > .82) return pal[1];
    if (l > .72) return dith(x, y, (l - .72) / .1) ? pal[1] : pal[2];
    if (l > .45) return pal[2];
    if (l > .33) return dith(x, y, (l - .33) / .12) ? pal[2] : pal[3];
    if (l > .12) return pal[3];
    return pal[4] || pal[3];
  }
  // a colour that shades left to right across a band (for polygons: limbs, cloth, blades)
  const band = (x0, x1, pal) => (x, y) => { const t = (x - x0) / Math.max(1, x1 - x0); return t < .22 ? pal[1] : t < .7 ? pal[2] : dith(x, y, (t - .7) / .3) ? pal[3] : pal[2]; };
  const vband = (y0, y1, pal) => (x, y) => { const t = (y - y0) / Math.max(1, y1 - y0); return t < .25 ? pal[1] : t < .7 ? pal[2] : pal[3]; };

  // ---------------- palettes ----------------
  const P = {
    gob: ['#c8e08a', '#9cc35a', '#76a03c', '#4f7426', '#2f4a16'],
    gob2: ['#d4e39a', '#a9c46a', '#86a548', '#5e7a2e', '#36481a'],
    gob3: ['#bcd88e', '#8fb862', '#6d9644', '#4b6c2c', '#2b4218'],
    leather: ['#c08a56', '#9a6a3c', '#7a4f2a', '#57361c', '#33200f'],
    wood: ['#c99a5a', '#a5773e', '#82592b', '#5c3d1c', '#3a250f'],
    iron: ['#e4ebee', '#b8c3c8', '#8c979c', '#5f686d', '#3a4044'],
    rust: ['#e0a27a', '#b9734a', '#8f5232', '#623520', '#3c1f12'],
    red: ['#f08a6a', '#c9473a', '#9a2e26', '#6a1c18', '#3e0e0c'],
    robe: ['#b48ac0', '#7e5a8e', '#5c3e6c', '#3e284a', '#24162c'],
    bone: ['#fffbea', '#ece2c4', '#cbbd98', '#9a8d6c', '#655a42'],
    gold: ['#fff2b0', '#f1cf62', '#cf9f32', '#946a1c', '#5a3e0e'],
    steel: ['#f2f6fa', '#c6d0da', '#98a4b2', '#687482', '#3e4652'],
    skinA: ['#ffe2c8', '#f0b890', '#d9966c', '#b0704c', '#7a4a30'],
    skinB: ['#fde8d4', '#ecc8aa', '#d2a684', '#a8805e', '#74563c'],
    skinC: ['#f7cfa6', '#d9a070', '#bb7e52', '#8f5a36', '#5e3820'],
    skinD: ['#f0c8a2', '#cf9a70', '#ad7650', '#835434', '#563620'],
    beard: ['#f0a060', '#c8682e', '#9c4a1e', '#6e3012', '#421a08'],
    white: ['#ffffff', '#f2eee6', '#d9d3c6', '#aaa294', '#77705f'],
    blue: ['#8cb0ff', '#4e72d0', '#34509e', '#22366e', '#141f44'],
    char: ['#7c7488', '#56506a', '#3c374c', '#282434', '#17141e'],
    scarf: ['#e0707a', '#a83a48', '#7c2634', '#521824', '#2e0c14'],
  };
  const INK = '#120d0a';

  // ---------------- goblin fighter (56×64): hatchet up, round shield ----------------
  function goblin(v = 0) {
    const g = new Pix(56, 64), skin = [P.gob, P.gob2, P.gob3][v % 3];
    // legs and feet
    g.poly([[18, 46], [24, 46], [23, 58], [17, 58]], band(17, 24, skin));
    g.poly([[32, 46], [38, 46], [39, 58], [33, 58]], band(32, 39, skin));
    g.ball(19, 60, 5.5, 3, P.leather); g.ball(37, 60, 5.5, 3, P.leather);
    // loincloth and jerkin
    g.poly([[15, 42], [41, 42], [43, 51], [35, 49], [28, 53], [21, 49], [13, 51]], band(13, 43, v === 1 ? P.red : P.leather));
    g.ball(28, 36, 13, 10, P.leather);
    g.rect(16, 42, 25, 2, '#3a2412'); g.rect(26, 41, 4, 4, P.gold[2]); g.set(27, 42, P.gold[0]);
    // studs on the jerkin
    [[22, 32], [28, 30], [34, 32], [21, 38], [35, 38]].forEach(([x, y]) => { g.set(x, y, P.iron[1]); g.set(x + 1, y + 1, P.iron[3]); });
    // weapon arm (the viewer's left), raised
    g.poly([[16, 30], [21, 33], [13, 40], [8, 37]], band(8, 21, skin));
    g.ball(10, 38, 3.5, 3.5, skin);
    // the hatchet (or a cleaver): haft, then head
    g.line(10, 44, 7, 14, P.wood[2], 2); g.line(11, 44, 8, 14, P.wood[3]);
    if (v === 1) { g.poly([[2, 8], [12, 8], [12, 20], [3, 22]], band(2, 12, P.iron)); g.line(2, 9, 2, 21, P.iron[0]); g.set(9, 11, P.iron[4]); }
    else { g.poly([[8, 12], [1, 8], [-1, 18], [8, 19]], band(-1, 8, v === 2 ? P.rust : P.iron)); g.line(0, 9, -1, 17, P.iron[0]); g.rect(7, 12, 3, 7, P.iron[3]); }
    // shield arm and shield (the viewer's right)
    g.ball(41, 41, 10.5, 10.5, P.wood, .05);
    for (let y = 31; y <= 51; y++) { g.set(37, y, g.get(37, y) && P.wood[4]); g.set(44, y, g.get(44, y) && P.wood[4]); }
    g.ell(41, 41, 10.5, 10.5, (x, y) => { const d = Math.hypot(x + .5 - 41, y + .5 - 41); return d > 9 ? (x + y < 82 ? P.iron[1] : P.iron[3]) : g.get(x, y); });
    g.ball(41, 41, 3, 3, P.iron);
    if (v !== 1) { g.line(35, 37, 39, 39, P.red[2]); g.line(47, 37, 43, 39, P.red[2]); } // a crude painted mark
    // head: ears, face, then the features
    g.poly([[18, 15], [1, 7], [5, 13], [17, 23]], band(1, 18, skin));
    g.poly([[38, 15], [55, 7], [51, 13], [39, 23]], band(38, 55, skin));
    g.poly([[16, 15], [6, 10], [16, 20]], skin[3]); g.poly([[40, 15], [50, 10], [40, 20]], skin[3]);
    g.ball(28, 19, 11.5, 10.5, skin);
    // brow ridge, eyes, nose, grin
    g.line(19, 15, 25, 18, skin[4]); g.line(37, 15, 31, 18, skin[4]);
    g.rect(21, 18, 4, 3, '#fff3a0'); g.rect(31, 18, 4, 3, '#fff3a0');
    g.rect(23, 19, 2, 2, '#c01810'); g.rect(31, 19, 2, 2, '#c01810'); g.set(23, 19, INK); g.set(32, 19, INK);
    g.ball(28, 23, 2.5, 3.2, skin, .1); g.set(27, 25, skin[4]); g.set(29, 25, skin[4]);
    g.line(21, 27, 35, 27, INK); g.line(22, 28, 34, 28, '#5a1410');
    g.set(23, 26, '#fff8e0'); g.set(33, 26, '#fff8e0'); g.set(25, 28, '#fff8e0'); g.set(31, 28, '#fff8e0');
    // headgear by variant: an iron cap, a topknot, a horned leather cap
    if (v === 0) { g.ball(28, 12, 11, 6, P.iron); g.rect(17, 13, 23, 2, P.iron[3]); [19, 28, 37].forEach(x => g.set(x, 13, P.iron[0])); }
    else if (v === 1) { g.ball(28, 7, 3, 3, '#1c1410'); g.line(28, 4, 31, 1, '#1c1410', 2); }
    else { g.ball(28, 12, 10.5, 5.5, P.leather); g.poly([[19, 10], [15, 1], [22, 9]], P.bone[2]); g.poly([[37, 10], [41, 1], [34, 9]], P.bone[2]); g.set(16, 2, P.bone[0]); g.set(40, 2, P.bone[0]); }
    return g.outline(INK);
  }

  // ---------------- goblin shaman (56×72): bone mask, ragged robe, skull staff ----------------
  function shaman() {
    const g = new Pix(56, 72), skin = P.gob3;
    // the staff behind everything
    g.line(9, 70, 9, 10, P.wood[2], 2); g.line(10, 70, 10, 10, P.wood[3]);
    g.ball(9, 9, 5, 4.5, P.bone); g.rect(6, 8, 2, 2, INK); g.rect(10, 8, 2, 2, INK); g.set(9, 11, INK); g.line(7, 13, 11, 13, P.bone[3]);
    g.line(4, 12, 2, 22, P.red[2]); g.line(5, 13, 4, 21, '#3aa0a0'); g.line(14, 12, 16, 21, P.red[1]);
    // robe: wide, ragged hem
    const hem = [[48, 66], [45, 70], [41, 66], [37, 70], [33, 66], [29, 70], [25, 66], [21, 70], [17, 66], [13, 70], [10, 66]];
    g.poly([[18, 30], [38, 30], [48, 66], ...hem], band(10, 48, P.robe));
    g.line(28, 34, 28, 64, P.robe[3]); g.line(22, 40, 18, 64, P.robe[3]); g.line(34, 40, 38, 64, P.robe[3]);
    // sash, beads and a pouch
    g.poly([[17, 44], [39, 44], [40, 47], [16, 47]], P.red[2]); g.rect(16, 44, 24, 1, P.red[1]);
    for (let i = 0; i < 7; i++) g.set(20 + i * 2.6, 36 + Math.sin(i / 6 * Math.PI) * 3, i % 2 ? P.bone[1] : '#3aa0a0');
    g.ball(37, 51, 3.5, 3, P.leather);
    // arms: one on the staff, one raised with the spell
    g.poly([[19, 33], [23, 36], [14, 44], [10, 41]], band(10, 23, P.robe)); g.ball(11, 43, 3, 3, skin);
    g.poly([[37, 33], [41, 30], [48, 22], [51, 25], [42, 37]], band(37, 51, P.robe)); g.ball(50, 22, 3, 3, skin);
    g.set(49, 18, skin[2]); g.set(51, 18, skin[2]); g.set(53, 20, skin[2]);
    // hood, ears through it, the bone mask
    g.ball(28, 22, 12, 11, P.robe, -.05);
    g.poly([[18, 20], [3, 13], [7, 19], [18, 27]], band(3, 18, skin)); g.poly([[38, 20], [53, 13], [49, 19], [38, 27]], band(38, 53, skin));
    g.ball(28, 25, 8.5, 8, P.bone);
    g.rect(22, 22, 4, 3, INK); g.rect(30, 22, 4, 3, INK); g.set(23, 23, '#7dffa0'); g.set(32, 23, '#7dffa0');
    g.poly([[27, 26], [29, 26], [28, 29]], P.bone[4]);
    g.line(23, 30, 33, 30, P.bone[4]); [24, 26, 28, 30, 32].forEach(x => g.set(x, 31, P.bone[3]));
    g.line(22, 18, 26, 20, P.red[2]); g.line(34, 18, 30, 20, P.red[2]); // war paint on the mask
    g.poly([[17, 16], [28, 9], [39, 16], [38, 13], [28, 6], [18, 13]], P.robe[3]);
    // feathers in the hood
    g.line(36, 9, 42, 1, P.red[1], 2); g.line(38, 10, 46, 4, '#3aa0a0', 2);
    return g.outline(INK);
  }

  // ---------------- portraits (40×44) ----------------
  function bg(g, a, b, stars) {
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const t = Math.hypot((x - 14) / g.w, (y - 12) / g.h) * 1.5;
      g.set(x, y, dith(x, y, t) ? b : a);
    }
    if (stars) [[4, 5], [33, 7], [36, 20], [6, 26], [30, 3]].forEach(([x, y]) => g.set(x, y, stars));
  }
  function face(g, cx, cy, skin, eye, opts = {}) {
    g.ball(cx, cy, opts.rx || 8.5, opts.ry || 10, skin);
    const ey = cy - 1 + (opts.eyeDy || 0);
    g.rect(cx - 6, ey - 1, 4, 1, opts.brow || skin[4]); g.rect(cx + 2, ey - 1, 4, 1, opts.brow || skin[4]);
    g.rect(cx - 5, ey, 3, 2, '#fffaf0'); g.rect(cx + 2, ey, 3, 2, '#fffaf0');
    g.rect(cx - 4, ey, 2, 2, eye); g.rect(cx + 2, ey, 2, 2, eye); g.set(cx - 4, ey, INK); g.set(cx + 3, ey, INK);
    g.line(cx, ey + 1, cx - 1, ey + 5, skin[3]); g.set(cx, ey + 6, skin[3]); g.set(cx - 1, ey + 6, skin[4]);
  }
  function fighter() {
    const g = new Pix(40, 44); bg(g, '#5a1c18', '#2c0c0a');
    // shoulders: mail between two big pauldrons
    g.poly([[4, 44], [8, 34], [32, 34], [36, 44]], (x, y) => (x + y) % 2 ? P.steel[3] : P.steel[2]);
    g.ball(7, 39, 7, 6, P.steel); g.ball(33, 39, 7, 6, P.steel);
    g.line(2, 40, 12, 36, P.gold[2]); g.line(38, 40, 28, 36, P.gold[2]);
    face(g, 20, 21, P.skinA, '#3a6aa0', { brow: P.beard[4] });
    g.line(24, 16, 27, 25, P.skinA[4]); // a scar across the eye
    // beard and moustache
    g.poly([[11, 22], [14, 30], [20, 41], [26, 30], [29, 22], [27, 28], [20, 30], [13, 28]], band(11, 29, P.beard));
    g.line(15, 28, 25, 28, P.beard[3]); g.line(16, 27, 19, 26, P.beard[1]); g.line(21, 26, 24, 27, P.beard[1]);
    g.line(17, 32, 18, 39, P.beard[3]); g.line(23, 32, 22, 39, P.beard[3]);
    // the helm: dome, rim, nasal guard, cheek plates
    g.ball(20, 13, 11, 8, P.steel); g.rect(9, 16, 22, 2, P.steel[3]); g.rect(9, 15, 22, 1, P.steel[1]);
    g.rect(19, 15, 2, 9, P.steel[2]); g.set(19, 15, P.steel[0]);
    g.poly([[9, 17], [12, 17], [12, 25], [10, 23]], band(9, 12, P.steel)); g.poly([[28, 17], [31, 17], [30, 23], [28, 25]], band(28, 31, P.steel));
    g.line(20, 5, 20, 9, P.gold[1]);
    return g.outline(INK);
  }
  function mage() {
    const g = new Pix(40, 44); bg(g, '#1c2450', '#0a0e24', '#c8d4ff');
    g.poly([[2, 44], [8, 31], [32, 31], [38, 44]], band(2, 38, P.blue));
    g.line(14, 33, 10, 44, P.gold[2]); g.line(26, 33, 30, 44, P.gold[2]);
    // hood behind the head
    g.ball(20, 19, 13, 14, P.blue, -.1);
    face(g, 20, 21, P.skinB, '#5ab8ff', { brow: '#ffffff', eyeDy: 0 });
    g.rect(13, 19, 5, 2, P.white[1]); g.rect(22, 19, 5, 2, P.white[1]); // great white brows
    // a long white beard
    g.poly([[12, 24], [15, 30], [17, 43], [20, 44], [23, 43], [25, 30], [28, 24], [25, 29], [20, 31], [15, 29]], band(12, 28, P.white));
    g.line(16, 28, 24, 28, P.white[3]); g.line(20, 32, 20, 42, P.white[3]);
    // hood front, framing the face, and a gem on the brow
    g.poly([[7, 30], [9, 14], [20, 4], [31, 14], [33, 30], [29, 20], [20, 11], [11, 20]], band(7, 33, P.blue));
    g.ball(20, 13, 2, 2, ['#e6f2ff', '#8fd0ff', '#3a8ae0', '#1a4a90', '#0a2050']);
    return g.outline(INK);
  }
  function cleric() {
    const g = new Pix(40, 44); bg(g, '#7a5418', '#3a2408');
    g.poly([[2, 44], [8, 32], [32, 32], [38, 44]], band(2, 38, P.white));
    // a gold sun on the chest
    g.ball(20, 40, 3.5, 3.5, P.gold); [[20, 34], [14, 40], [26, 40], [16, 36], [24, 36]].forEach(([x, y]) => g.set(x, y, P.gold[1]));
    // wimple around the face
    g.ball(20, 21, 12, 14, P.white, -.05);
    face(g, 20, 22, P.skinC, '#6a3a1a', { rx: 7.5, ry: 9 });
    g.set(15, 25, '#e08070'); g.set(25, 25, '#e08070'); // rosy cheeks
    g.line(18, 28, 22, 28, '#8a3a30'); g.set(17, 27, '#8a3a30'); g.set(23, 27, '#8a3a30');
    // the band across the brow
    g.rect(12, 13, 16, 2, P.gold[2]); g.rect(12, 13, 16, 1, P.gold[1]); g.set(20, 13, '#ff6050');
    return g.outline(INK);
  }
  function rogue() {
    const g = new Pix(40, 44); bg(g, '#3a2a48', '#140e1c');
    // a dagger hilt over the shoulder
    g.line(30, 30, 37, 20, P.leather[2], 2); g.line(27, 28, 33, 32, P.gold[2], 2); g.ball(37, 19, 1.5, 1.5, P.gold);
    g.poly([[2, 44], [8, 31], [32, 31], [38, 44]], band(2, 38, P.char));
    g.line(10, 36, 30, 44, P.leather[3], 2); // baldric
    g.ball(20, 19, 12.5, 14, P.char, -.1);
    face(g, 20, 21, P.skinD, '#5ad070', { eyeDy: 0 });
    g.line(13, 18, 17, 20, INK); g.line(27, 18, 23, 20, INK); // narrowed eyes
    // the mask over nose and mouth
    g.poly([[11, 23], [29, 23], [28, 30], [20, 34], [12, 30]], band(11, 29, P.scarf));
    g.line(12, 24, 28, 24, P.scarf[1]);
    // hood front, deep and shadowed
    g.poly([[6, 31], [8, 13], [20, 3], [32, 13], [34, 31], [30, 19], [20, 10], [10, 19]], band(6, 34, P.char));
    g.line(14, 13, 18, 16, '#2a1a10'); // a strand of hair
    return g.outline(INK);
  }
  // goblins' sheet portraits: the figure itself, cropped to head and shoulders
  function crop(src, x0, y0, back) {
    const g = new Pix(40, 44); bg(g, back[0], back[1]);
    for (let y = 0; y < 44; y++) for (let x = 0; x < 40; x++) { const c = src.get(x + x0, y + y0); if (c) g.set(x, y, c); }
    return g;
  }

  // ---------------- the dungeon ----------------
  function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // big dressed blocks, staggered, each its own shade of blue-grey; a highlight on the top edge, shadow under
  function wall(w = 64, h = 64, seed = 1) {
    const g = new Pix(w, h), bh = 16;
    const tones = ['#5d6678', '#565f70', '#636c7d', '#525a6a', '#5a6272'];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const row = Math.floor(y / bh), off = row % 2 ? 16 : 0, bw = 32, col = Math.floor((x + off) / bw);
      const lx = (x + off) % bw, ly = y % bh;
      const tone = tones[Math.floor(hash(col, row, seed) * tones.length)];
      let c = tone;
      if (ly === 0 || lx === 0) c = '#2a2f3a';
      else if (ly === 1 || lx === 1) c = '#7d879a';
      else if (ly === bh - 1 || lx === bw - 1) c = '#3e4554';
      else { const n = hash(x, y, seed + 7); if (n > .93) c = '#6c7588'; else if (n < .06) c = '#454c5b'; }
      g.set(x, y, c);
    }
    // a few cracks and moss
    for (let k = 0; k < 4; k++) { let x = Math.floor(hash(k, 3, seed) * w), y = Math.floor(hash(k, 9, seed) * h); for (let i = 0; i < 6; i++) { g.set(x, y, '#30363f'); x += hash(i, k, seed) > .5 ? 1 : 0; y++; } }
    for (let k = 0; k < 16; k++) { const x = Math.floor(hash(k, 5, seed + 2) * w), y = h - 1 - Math.floor(hash(k, 6, seed) * 10); g.set(x, y, hash(k, 1) > .5 ? '#4f6a3a' : '#3d5530'); }
    return g;
  }
  function floor(w = 64, h = 64) {
    const g = new Pix(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bx = Math.floor(x / 32), by = Math.floor(y / 32), lx = x % 32, ly = y % 32;
      const t = ['#3d424c', '#424854', '#393e47', '#454b56'][Math.floor(hash(bx, by, 4) * 4)];
      let c = t;
      if (lx === 0 || ly === 0) c = '#1d2027'; else if (lx === 1 || ly === 1) c = '#505763';
      else { const n = hash(x, y, 11); if (n > .94) c = '#4c525e'; else if (n < .05) c = '#30343c'; }
      g.set(x, y, c);
    }
    for (let k = 0; k < 3; k++) { let x = Math.floor(hash(k, 2, 4) * w), y = Math.floor(hash(k, 8, 4) * h); for (let i = 0; i < 9; i++) { g.set(x, y, '#25282f'); x += hash(i, k, 6) > .4 ? 1 : -1; y += hash(i, k, 7) > .5 ? 1 : 0; } }
    return g;
  }
  function ceiling(w = 64, h = 64) {
    const g = new Pix(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ly = y % 32; let c = hash(Math.floor(x / 16), Math.floor(y / 32), 9) > .5 ? '#2c313b' : '#282c35';
      if (ly < 6) c = ly === 0 ? '#1a1d23' : ly === 1 ? '#5a4330' : '#46331f'; // a timber beam
      else if (x % 16 === 0) c = '#1d2026';
      g.set(x, y, c);
    }
    return g;
  }
  // the far wall: stone round an iron-banded door, a goblin banner beside it
  function backWall(w = 96, h = 72) {
    const g = new Pix(w, h), st = wall(w, h, 5);
    st.c.forEach((c, i) => g.c[i] = c);
    g.poly([[30, 72], [30, 26], [48, 12], [66, 26], [66, 72]], '#1a1d24');
    g.poly([[33, 72], [33, 28], [48, 16], [63, 28], [63, 72]], (x, y) => x === 48 ? '#2a1c10' : hash(x, 0, 3) > .85 ? '#3a2814' : '#4c3520');
    [34, 50].forEach(y => g.rect(33, y, 30, 3, '#2c2f36'));
    g.ball(44, 46, 1.5, 1.5, P.iron); g.ball(52, 46, 1.5, 1.5, P.iron);
    // banner
    g.poly([[8, 10], [22, 10], [22, 42], [15, 36], [8, 42]], band(8, 22, P.red));
    g.ball(15, 22, 4, 4, P.bone); g.rect(13, 21, 2, 2, INK); g.rect(16, 21, 2, 2, INK); g.line(13, 26, 17, 26, P.bone[3]);
    g.line(6, 9, 24, 9, P.wood[3]);
    return g;
  }

  // ---------------- die faces ----------------
  // drawn smooth (dice are things on the floor, not pixel art); 128×128 per face
  const DICE = {
    fighter: { bg: '#6a1c16', edge: '#3a0c08', ink: '#e9c47a' }, mage: { bg: '#23305a', edge: '#0e1530', ink: '#dfe6ff' },
    cleric: { bg: '#e2d6b8', edge: '#a8946a', ink: '#6a4416' }, rogue: { bg: '#2e2838', edge: '#120e18', ink: '#c9b2ea' },
    goblin: { bg: '#4e5c2a', edge: '#262e12', ink: '#e8e0b0' }, shaman: { bg: '#3a2846', edge: '#1a0e22', ink: '#b8ffb0' },
    init: { bg: '#d8cfb8', edge: '#8a7e62', ink: '#2a1e10' },
  };
  function burstPath(g, cx, cy, r0, r1, n, rot = 0) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r0 : r1 * (i % 4 === 0 ? 1 : .86); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.closePath();
  }
  // the critical icon: a burst with an exclamation mark in it
  function drawCrit(g, cx, cy, s) {
    burstPath(g, cx, cy, s * .3, s * .5, 9, -.2); g.fillStyle = '#ffb11a'; g.fill(); g.lineWidth = s * .04; g.strokeStyle = '#7a2a00'; g.stroke();
    burstPath(g, cx, cy, s * .2, s * .36, 9, .15); g.fillStyle = '#ff5a1a'; g.fill();
    g.fillStyle = '#fff6d8'; g.strokeStyle = '#5a1000'; g.lineWidth = s * .05; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - s * .075, cy - s * .27); g.lineTo(cx + s * .075, cy - s * .27); g.lineTo(cx + s * .045, cy + s * .07); g.lineTo(cx - s * .045, cy + s * .07); g.closePath(); g.stroke(); g.fill();
    g.beginPath(); g.arc(cx, cy + s * .18, s * .065, 0, Math.PI * 2); g.stroke(); g.fill();
  }
  function emoji(g, ch, cx, cy, size) {
    // colour emoji take the fill's transparency, so draw them with a solid fill at full opacity
    g.save(); g.globalAlpha = 1; g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = size * .08; g.shadowOffsetY = size * .04; g.fillText(ch, cx, cy + size * .05); g.restore();
  }
  function dieFace(style, kind, icon, label) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), s = 128;
    g.fillStyle = style.bg; g.fillRect(0, 0, s, s);
    const gr = g.createRadialGradient(s * .38, s * .34, 8, s * .5, s * .5, s * .78); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(0,0,0,.32)'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.lineWidth = 10; g.strokeStyle = style.edge; g.globalAlpha = .7; g.strokeRect(0, 0, s, s); g.globalAlpha = 1;
    if (kind === 'hit') emoji(g, icon, s / 2, s / 2, 74);
    else if (kind === 'knack') {
      // the power face: a dark disc in a gold ring, so its icon reads on light dice and dark ones alike
      g.beginPath(); g.arc(s / 2, s / 2, s * .41, 0, Math.PI * 2);
      const disc = g.createRadialGradient(s * .44, s * .4, 4, s / 2, s / 2, s * .41); disc.addColorStop(0, '#3a2a12'); disc.addColorStop(1, '#140c04');
      g.fillStyle = disc; g.fill(); g.lineWidth = 7; g.strokeStyle = '#f1cf62'; g.stroke();
      g.beginPath(); g.arc(s / 2, s / 2, s * .41 - 5, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
      emoji(g, icon, s / 2, s / 2, 64);
    } else if (kind === 'crit') drawCrit(g, s / 2, s / 2, s * .92);
    else if (kind === 'num') { g.fillStyle = style.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${String(label).length > 1 ? 58 : 70}px "Pixelify Sans",ui-monospace,monospace`; g.fillText(label, s / 2, s / 2 + 4); if (label === 6 || label === 9) g.fillRect(s / 2 - 16, s * .78, 32, 6); }
    return cv;
  }
  // a d20 face is a triangle: number in the middle
  function d20Face(style, n) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = style.bg; g.fillRect(0, 0, 128, 128);
    g.beginPath(); g.moveTo(4, 124); g.lineTo(124, 124); g.lineTo(64, 14); g.closePath(); g.lineWidth = 8; g.strokeStyle = style.edge; g.stroke();
    g.fillStyle = n === 20 ? '#b0300a' : style.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${n > 9 ? 44 : 52}px "Pixelify Sans",ui-monospace,monospace`; g.fillText(n, 64, 86);
    if (n === 6 || n === 9) g.fillRect(52, 108, 24, 4);
    return cv;
  }
  // the critical icon for the page itself
  const CRIT_SVG = (() => {
    const pts = (r0, r1, n, rot) => { const o = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r0 : r1 * (i % 4 === 0 ? 1 : .86); o.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (50 + Math.sin(a) * r).toFixed(1)); } return o.join(' '); };
    return `<svg class="crit-ico" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${pts(30, 50, 9, -.2)}" fill="#ffb11a" stroke="#7a2a00" stroke-width="4"/><polygon points="${pts(20, 36, 9, .15)}" fill="#ff5a1a"/><path d="M42.5 23h15l-3 34h-9z" fill="#fff6d8" stroke="#5a1000" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="68" r="6.5" fill="#fff6d8" stroke="#5a1000" stroke-width="4"/></svg>`;
  })();

  // ---------------- cache ----------------
  const cache = {};
  const once = (k, f) => cache[k] || (cache[k] = f());
  const sprite = (type, v = 0) => once('s' + type + v, () => type === 'shaman' ? shaman() : goblin(v));
  function portrait(type, v = 0) {
    return once('p' + type + v, () => {
      if (type === 'fighter') return fighter(); if (type === 'mage') return mage(); if (type === 'cleric') return cleric(); if (type === 'rogue') return rogue();
      if (type === 'shaman') return crop(shaman(), 8, 2, ['#2a3a20', '#0e1608']);
      return crop(goblin(v), 8, 1, ['#3a3a1c', '#14140a']);
    });
  }
  // a portrait as an <canvas> at its own size (the page scales it up, pixelated)
  const portraitCanvas = (type, v) => portrait(type, v).canvas(1);

  return { Pix, sprite, portrait, portraitCanvas, wall, floor, ceiling, backWall, dieFace, d20Face, DICE, CRIT_SVG, drawCrit, P };
})();
