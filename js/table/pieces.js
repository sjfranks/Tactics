'use strict';
// GOBLIN CRYPT · THE TABLE · pieces on the table: the mirrors of the rules' units, their status marks, motion and floating text
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.
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
const ST_DESC = { warded: 'Warded: armour +2 till the caster\'s next turn', poisoned: 'Poisoned: loses 2 at the start of its turn', hidden: 'Hidden: cannot be targeted; next attack +2 dice', blessed: 'Blessed: next roll +1 die', hasted: 'Hasted: extra actions next turn', prone: 'Prone: standing up costs an action; hits against it +1 die; armour −1', frozen: 'Frozen: cannot move; no armour; hits +1 die', taunt: 'Taunting: goblins must attack; armour +1', judged: 'Judged: armour −2; every hero who hits it heals' };
// a hero's level on their sheet: experience toward the next, which raises a card a tier while any has one left
function levelLine(kind) {
  const g = growthOf(kind), X = GC.TUNE.xp, more = GC.upgradable(kind).some(id => GC.tierIn(g.ups, id) < GC.MAX_TIER), xp = Math.min(X.level, g.xp + g.gained);
  return `<div class="cs-lv"><b>Level ${g.lv}</b><span class="bar"><i style="width:${g.lv >= X.max ? 100 : xp / X.level * 100}%"></i></span><small>${g.lv >= X.max ? 'Top level' : `${g.xp}${g.gained ? ` + ${g.gained}` : ''} / ${X.level} XP${more ? ` · level ${g.lv + 1} raises a card a tier` : ''}`}</small></div>`;
}
function openSheet() {
  const u = UI.inspect || UI.sel || UI.active, L = lvl(), foesLeft = units.filter(x => x.alive && x.side === 'gob').length;
  let html;
  if (u && u.alive && G) {
    const r = ru(u), foe = u.side === 'gob', sts = statusList(u);
    const cards = foe ? '' : `<div class="cs-cards">${G.cardsOf(r).map(id => { const c = G.cardOf(r, id), blk = G.block(r, id), [hue, art] = ART[id], cd = G.cardCd(r, id); return `<div class="cs-card${c.tier > 1 ? ' up' : ''}" style="--hue:${hue}"><svg viewBox="0 0 24 24">${art}</svg><div><b>${c.name}</b><p>${G.cardText(r, id)}</p></div><em>${blk && UI.phase === 'player' ? blk : cd ? '↻ ' + cd : c.cost}</em></div>`; }).join('')}</div>`;
    const bn = foe ? [] : boonNames(u.kind), boons = bn.length ? `<div class="cs-tags cs-boons">${bn.map(n => `<span>★ ${n}</span>`).join('')}</div>` : '';
    const note = u.down ? 'Down: Heal raises them. Goblins leave the fallen be.' : foe ? u.def.note : u === UI.active && UI.phase === 'player' ? `${r.ap} action${r.ap === 1 ? '' : 's'} left this turn` : '';
    html = `<div class="cs-head ${foe ? 'gob' : ''}">${PORTRAIT[u.kind] ? `<img class="cs-fig" alt="" src="${PORTRAIT[u.kind].body}">` : `<span class="ubadge ${foe ? 'gob' : ''}"><span>${ICONS[u.kind]}</span></span>`}<div><h2>${u.name}</h2><small>${foe ? (u.def.boss ? 'Goblin King' : 'Foe') : u.def.role}</small></div></div>
      <div class="cs-body"><div class="cs-hp${foe ? ' gob' : ''}"><i>${u.hp}</i>/ ${u.maxHp}<span class="bar"><b style="width:${u.hp / u.maxHp * 100}%"></b></span></div>
      <div class="cs-stats"><div>Move<b>${G.moveOf(r)}</b></div><div>Die<b>d${G.dieOf(r)}</b></div><div>Range<b>${u.def.range}</b></div><div>Armour<b>${G.armourOf(r)}</b></div></div>
      ${foe ? '' : levelLine(u.kind)}${boons}${sts.length ? `<div class="cs-tags">${sts.map(x => `<span>${ST_DESC[x]}</span>`).join('')}</div>` : ''}${note ? `<p class="cs-note">${note}</p>` : ''}${cards}
      <p class="cs-note">${L.name} · Round ${UI.round} · ${foesLeft} foes left</p>
      <button class="go" id="csClose">Close</button></div>`;
  } else html = `<div class="cs-body"><p class="cs-note">${L.name} · Round ${UI.round} · ${foesLeft} foes left. Tap a unit to see its sheet.</p><button class="go" id="csClose">Close</button></div>`;
  $('#csBody').innerHTML = '<div class="xbar"><button class="xb" aria-label="Close" title="Close (Esc)">✕</button></div>' + html; $('#csheet').hidden = false; $('#csheet').scrollTop = 0;
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
  t_trick: [356, '<path d="M5 4v10h6l6 3h3v3H5z"/><path d="M14 8l3-3M17 11l3-2"/>'],
  potion: [138, '<path d="M9.5 3h5M10.5 3v5.2L5.6 16.4A2.6 2.6 0 0 0 7.9 20.5h8.2a2.6 2.6 0 0 0 2.3-4.1L13.5 8.2V3"/><path d="M7.4 14.5h9.2"/>'],
  t_knives: [356, '<path d="M4 20L14 10M14 10l2-6 4-1-1 4-6 2"/><path d="M9 21l7-7"/>']
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
  tag.innerHTML = `<div class="fc"></div><div class="hpr"><b class="arm" hidden></b><div class="hp"><i class="trail"></i><i class="fill"></i></div></div><div class="sts"></div>` + (side === 'hero' ? '<div class="ap"></div>' : '');
  if (def.boss) tag.classList.add('boss');
  $('#tags').appendChild(tag);
  const u = { id: r.id, kind: r.kind, def, side, name: def.name, hp: r.hp, maxHp: r.maxHp, c: r.c, r: r.r, l: r.l || 0, st: {}, alive: true, down: false, asleep: !!r.asleep, init: 0, deployed: false, root, piece, fig, stand, h, rig, ring, hit, tag, blob, size: r.size || 1, fx: {} };
  root.position.copy(posOf(u));
  if (u.size > 1) { hit.scale.set(2.5, 2, 2.5); hit.position.y = 1.1; blob.scale.setScalar(2.1); }
  if (u.asleep) tag.classList.add('zz');
  piece.visible = false; ring.visible = false; blob.visible = false;
  hit.userData.unit = u; ownMats(u); updateTag(u); resetRig(u); setArmour(u, G ? G.armourOf(r) : 0);
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
  renderSts(u);
  if (u.def.boss) updateBoss();
}
// the shield on a nameplate: what each blow loses. Red when it has been stripped (Rebuke, Prone, Frozen), gold when
// raised (Taunt); hidden for the fallen and for those with none to lose
function setArmour(u, a) {
  const base = G ? (G.U(u.id).armour || 0) : 0, el = u.tag.querySelector('.arm');
  u.armour = a; el.hidden = u.down || (!a && !base); el.textContent = a;
  el.classList.toggle('low', a < base); el.classList.toggle('up', a > base); el.title = `Armour ${a}`;
}
function updateBoss() {
  const k = units.find(u => u && u.def.boss && u.alive);
  $('#boss').hidden = !k || !k.deployed;
  if (k) $('#bossBar').style.width = (k.hp / k.maxHp * 100) + '%';
}
const STATUSES = ['judged', 'frozen', 'prone', 'poisoned', 'blessed', 'warded', 'hasted', 'hidden', 'taunt'];
// a small mark on the nameplate for each condition, so a friend can see what is set up for them: [colour, icon]
const ST_ICON = {
  judged: ['#f0c45a', ART.c_rebuke[1]], frozen: ['#9fdcff', ART.m_frost[1]], prone: ['#e0b27a', ART.t_trick[1]],
  poisoned: ['#8ae04a', '<path d="M12 3c-2.5 4-5 6.6-5 10a5 5 0 0 0 10 0c0-3.4-2.5-6-5-10z"/>'], blessed: ['#ffd56a', ART.c_bless[1]],
  warded: ['#7ab8ff', '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>'], hasted: ['#7dffb0', ART.c_haste[1]], hidden: ['#c0b0e0', ART.t_hide[1]], taunt: ['#ff6a50', ART.f_taunt[1]]
};
function renderSts(u) {
  const el = u.tag.querySelector('.sts'); if (!el) return;
  const ks = u.down || !u.alive ? [] : STATUSES.filter(k => u.st[k]), k0 = ks.map(k => k + (u.st[k] === 2 ? '2' : '')).join();
  if (el._k === k0) return; el._k = k0;
  el.innerHTML = ks.map(k => { const [c, svg] = ST_ICON[k]; return `<i class="${k}${u.st[k] === 2 && k === 'frozen' ? ' deep' : ''}" style="--c:${c}" title="${ST_DESC[k]}"><svg viewBox="0 0 24 24">${svg}</svg></i>`; }).join('');
}
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
// Judged: a gold halo over the foe; v is the id of the cleric who laid it on (plus one), and it lifts when her next turn starts
function setJudged(u, v) {
  u.st.judged = v || 0;
  if (v && !u.fx.judge) { u.fx.judge = glowSprite(0xffc440, .6); u.fx.judge.position.y = u.h + .1; u.piece.add(u.fx.judge); }
  if (!v && u.fx.judge) { u.piece.remove(u.fx.judge); u.fx.judge = null; }
  updateTag(u);
}
// Ward and Poison: a glow on the figure, blue for a ward, green for poison
function setGlow(u, k, on, hex, y) {
  u.st[k] = on || 0;
  if (on && !u.fx[k]) { u.fx[k] = glowSprite(hex, .7); u.fx[k].position.y = y * u.h; u.piece.add(u.fx[k]); }
  if (!on && u.fx[k]) { u.piece.remove(u.fx[k]); u.fx[k] = null; }
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
function shake(a) { if (!REDUCED) shakeAmt = Math.max(shakeAmt, a); } // no shaking when the player asks for less motion
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

