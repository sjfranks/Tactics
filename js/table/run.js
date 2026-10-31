'use strict';
// GOBLIN CRYPT · THE TABLE · the run on screen: the save, laying out a battle, the title, the act map and its rooms
// (rewards, campsites, shops, events, chests) and the end of a run. The run's rules are in js/run.js (RUN).
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.

// ---------------- the run and its save ----------------
// RS is the run in progress (or null): RUN's plain JSON, saved in this browser after every change, the battle too
// whenever it is the player's move. MODE 'run' plays it; 'free' a battle from the level select, which never touches it.
const SAVE_KEY = 'goblin-crypt-run-1';
let RS = null, MODE = 'run', FREE = { boons: [] };
let PREF_DIFF = (() => { try { const d = localStorage.getItem('gc-diff'); return GC.TUNE.difficulty[d] ? d : 'normal'; } catch (e) { return 'normal'; } })();
const curDiff = () => (MODE === 'run' && RS ? RS.diff : PREF_DIFF);
function saveRun() { try { if (RS) localStorage.setItem(SAVE_KEY, JSON.stringify(RS)); else localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function loadRun() { try { return RUN.check(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return null; } }
// the battle in progress, kept whenever it is the player's move
function saveTurn() { if (MODE === 'run' && RS && RS.phase === 'battle' && G && UI.phase === 'player' && !UI.busy && !UI.over && G.S.phase === 'player') { RS.battle = G.snapshot(); saveRun(); } }
const partyBoonIds = () => (MODE === 'free' ? FREE.boons : []);
// what a hero's sheet lists: boons in a level-select battle, the party's relics in a run
const boonNames = who => MODE === 'run' && RS ? RS.relics.map(id => GC.RELICS[id].name) : partyBoonIds().map(id => GC.BOONS[id]).filter(b => !who || b.who === who || b.who === 'party').map(b => b.name);
// the words before or after a battle: in a run, only its bosses have a scene; the level select keeps each map's own
function sceneFor(when) {
  const L = LEVELS[level];
  if (MODE === 'run') { const b = RS && RS.room && RS.room.type === 'B' && DLG.run && DLG.run.bosses[L.id]; return b ? b[when] : null; }
  const sc = DLG.scenes[level]; return sc ? sc[when] : null;
}

// ---------------- laying out a battle ----------------
function clearBoard() {
  units.forEach(u => { if (!u) return; scene.remove(u.root); scene.remove(u.ring); u.tag.remove(); });
  units = [];
  [...burnFx.keys()].forEach(clearBurnFx);
  floats.splice(0).forEach(f => f.el.remove()); bubbles.splice(0).forEach(b => b.el.remove());
  liveDice.splice(0).forEach(d => scene.remove(d));
  [propGroup, propUp].forEach(g => { while (g.children.length) g.remove(g.children[0]); });
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
// play view: close in, framed on the party and a third of the way toward the foes
function defaultView(now) {
  const hs0 = units.filter(u => u && u.side === 'hero' && u.alive), gs0 = units.filter(u => u && u.side === 'gob' && u.alive); if (!hs0.length) return;
  follow = null; zoomT = PLAY_ZOOM; camAzT = camAz - angDiff(camAz, baseAz());
  const mid = list => list.reduce((a, u) => a.add(u.root.position), new V3()).multiplyScalar(1 / list.length), h = mid(hs0), g = gs0.length ? mid(gs0) : h.clone().setZ(h.z - 4);
  camTX = h.x + (g.x - h.x) * .35; camTZ = h.z + (g.z - h.z) * .35; clampCam();
  if (now) { camAz = camAzT; camX = camTX; camZ = camTZ; zoom = zoomT; }
}
// lay out a battle: the rules make a fresh state (in a run, from the room's encounter and the party as it stands), or
// take a saved one; the table builds the diorama and the pieces, then the briefing, or straight back into a saved turn.
// backdrop: only lay the board out, behind the title or the map
function loadLevel(i, saved, backdrop) {
  level = i; const L = LEVELS[i];
  clearBoard();
  const enc = MODE === 'run' && RS && RS.room && RS.room.enc;
  G = GC.battle(saved || (enc && !backdrop ? GC.newState(i, enc.seed, RUN.battleOpts(RS)) : GC.newState(i, undefined, { boons: partyBoonIds(), diff: curDiff() })));
  boardFromRules(G.B); buildBoard(L); buildHL();
  (L.props || []).forEach(([type, c, r, l]) => { PROP_L = l || 0; try { PROPS[type](c, r); } finally { PROP_L = 0; } });
  const [hs, hg, sc, si, bg] = L.art.sky;
  hemi.color.setHex(hs); hemi.groundColor.setHex(hg); sun.color.setHex(sc); sun.intensity = si; scene.fog.color.setHex(bg); scene.background.setHex(bg);
  if (!backdrop) G.S.units.forEach(r => { if (r.alive) makeUnit(r); });
  overview(true);
  combatLog.length = 0; undoStack.length = 0;
  Object.assign(UI, { phase: 'intro', busy: true, sel: null, card: null, aim: null, round: 1, over: false, inspect: null, active: null, order: [], turn: -1, confirm: null, intents: [], fcFocus: null });
  UI.fc.clear();
  $('#boss').hidden = true;
  setMusic(L.theme);
  if (backdrop) return;
  QUIET = true; try { sync(); } finally { QUIET = false; } // marks a battle starts with (War Banner's blessing) show from the first moment
  updateHud(); measure(); renderDock();
  if (saved && G.S.phase === 'player') { // back from a reload: straight to the hero whose turn it was
    try {
      liveUnits().forEach(showNow);
      QUIET = true; try { sync(); } finally { QUIET = false; }
      UI.round = G.S.round; UI.order = G.S.order.slice(); UI.turn = G.S.turn;
      G.S.units.forEach(r => { const u = vu(r.id); if (u) u.init = r.init; });
      UI.active = vu(G.S.active); UI.phase = 'player'; UI.busy = false;
      defaultView(true); updateBoss(); updateHud(); renderTokens(); setSel(UI.active, true); computeIntents(); refresh();
      logEvent(`${L.name} · round ${G.S.round}: the battle goes on`, 'hdr');
      return;
    } catch (e) { console.error(e); return loadLevel(i); }
  }
  showIntro();
}
const ROOM_NAME = { M: 'Fight', E: 'Elite', B: 'Boss', '?': 'Unknown', R: 'Campsite', $: 'Shop', T: 'Treasure' };
function showIntro() {
  const L = LEVELS[level], diff = GC.TUNE.difficulty[curDiff()], run = MODE === 'run' && RS && RS.room && RS.room.enc;
  const boss = G.S.units.some(u => u.side === 'gob' && GC.UNITS[u.kind].boss) ? ' · Boss' : '';
  $('#introSteps').innerHTML = '';
  $('#introKick').textContent = (run ? `Act ${RS.act + 1} · Floor ${RS.map.nodes[RS.node].y + 1} · ${RS.room.unknown ? 'Ambush' : ROOM_NAME[RS.room.type]}` : `Level select · ${L.extra ? 'Extra battle' : 'Battle ' + (level + 1)}${boss}`) + (curDiff() !== 'normal' ? ' · ' + diff.label : '');
  $('#introTitle').textContent = L.name;
  $('#introText').textContent = (run && RS.room.type === 'E' ? 'An elite pack, led by a champion: twice the health, a bigger die and thicker hide. It guards a relic. ' : '') + L.text;
  const counts = {}; G.S.units.filter(u => u.side === 'gob').forEach(u => { const k = (u.champ ? '*' : '') + u.kind; counts[k] = (counts[k] || 0) + 1; });
  $('#introFoes').innerHTML = Object.entries(counts).map(([k, n]) => { const champ = k[0] === '*', d = GC.UNITS[k.replace('*', '')]; return `<span class="${d.boss ? 'boss' : champ ? 'champ' : ''}">${n > 1 ? n + '× ' : ''}${champ ? d.name.replace(/^Goblin /, '') + ' Champion' : d.name}${d.title ? ' ' + d.title : ''}</span>`; }).join('');
  if (run) { $('#introBoons').innerHTML = `<b>Party</b>${RUN.HEROES.map(k => `<span>${GC.UNITS[k].name.replace('Sister ', '')} ${RS.party[k].hp}/${RS.party[k].maxHp}</span>`).join('')}`; $('#introBoons').hidden = false; }
  else { const bn = boonNames(); $('#introBoons').innerHTML = bn.length ? `<b>Boons</b>${bn.map(n => `<span>${n}</span>`).join('')}` : ''; $('#introBoons').hidden = !bn.length; }
  $('#introGo').textContent = 'To battle';
  $('#intro').hidden = false;
}

// ---------------- icons ----------------
const ROOM_ICON = { // the map's rooms
  M: '<path d="M5 19L15 9M15 9l1-4 4-1-1 4zM19 19L9 9M9 9L8 5 4 4l1 4z"/>',
  E: '<path d="M12 3c-5 0-8 3-8 7 0 3 2 4 3 5v3h10v-3c1-1 3-2 3-5 0-4-3-7-8-7z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 18v2M14 18v2M4 6L2 3M20 6l2-3"/>',
  B: '<path d="M3 18h18L19 7l-4 4-3-6-3 6-4-4z"/><path d="M3 21h18"/>',
  '?': '<path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4v1"/><circle cx="12" cy="18.5" r=".8"/>',
  R: '<path d="M12 3c2 3 4 4 4 7a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 2 1 2 0-2 0-3 1-5z"/><path d="M4 21l16-4M4 17l16 4"/>',
  $: '<path d="M8 7h8l2 4c1 2 1 4 0 6-1 3-4 4-6 4s-5-1-6-4c-1-2-1-4 0-6z"/><path d="M9 4h6l-1 3h-4z"/><path d="M12 11v6M10.5 12.5c0-1 3-1 3 .5s-3 1-3 2.5 3 1 3 0"/>',
  T: '<path d="M3 10h18v10H3z"/><path d="M3 10c0-3 2-5 9-5s9 2 9 5"/><path d="M11 13h2v3h-2z"/>'
};
const GLYPH = { // relics
  drop: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
  blade: '<path d="M19 3l-9 9M19 3h-4M19 3v4M8 12l4 4M6 18l3-3M4 20l2-2"/>',
  bone: '<path d="M7 17l10-10M5.5 15.5a2 2 0 1 0 3 3 2 2 0 1 0-3-3zM15.5 5.5a2 2 0 1 0 3 3 2 2 0 1 0-3-3z"/>',
  horn: '<path d="M4 15c4 0 9-3 12-9l4 2c-2 7-8 11-14 11z"/><path d="M4 15v4"/>',
  flame: '<path d="M12 21c4 0 6-3 6-6 0-4-4-6-4-11-3 2-4 5-4 7-1-1-2-2-2-3-2 2-2 4-2 7 0 3 2 6 6 6z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M10 10c0-1.5 4-1.5 4 0s-4 1.5-4 3 4 1.5 4 0"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
  eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  flag: '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  thorn: '<path d="M4 20L20 4M8 16l-3-1M12 12l-1-4M16 8l3 1M10 14l4 1"/>',
  feather: '<path d="M20 4C11 4 6 10 5 19l2-2c2-6 6-9 9-10-3 3-6 6-7 10 6-1 11-6 11-13z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.5A3.8 3.8 0 0 0 7 18z"/>',
  rune: '<path d="M6 3l12 4-12 4 12 4-12 4"/><path d="M12 2v20"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/><path d="M11 10l2 2M13 10l-2 2"/>',
  flask: '<path d="M9.5 3h5M10.5 3v5.2L5.6 16.4A2.6 2.6 0 0 0 7.9 20.5h8.2a2.6 2.6 0 0 0 2.3-4.1L13.5 8.2V3"/>',
  gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/>',
  drum: '<ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M5 8v8c0 1.7 3 3 7 3s7-1.3 7-3V8"/><path d="M9 3l2 5M15 3l-2 5"/>',
  candle: '<path d="M9 9h6v12H9z"/><path d="M12 9V7M12 3c1 1.3 1.5 2 1.5 2.6a1.5 1.5 0 0 1-3 0c0-.6.5-1.3 1.5-2.6z"/>',
  crown: '<path d="M3 18h18L19 7l-4 4-3-6-3 6-4-4z"/>'
};
const TIER_HUE = { starter: 30, common: 30, uncommon: 200, rare: 280, shop: 140, boss: 0 };
const relicIcon = id => { const R = GC.RELICS[id]; return `<span class="rlc" style="--hue:${TIER_HUE[R.tier]}" title="${R.name}: ${R.text}"><svg viewBox="0 0 24 24">${GLYPH[R.glyph] || GLYPH.gem}</svg></span>`; };
// a relic's icon says what it is when tapped (a phone has no hover)
document.addEventListener('click', e => { const r = e.target.closest && e.target.closest('.rlc'); if (r && !r.closest('.pk')) { toast(r.title); e.stopPropagation(); } }, true);
const cardIcon = id => { const [hue, art] = ART[id] || [30, '']; return `<span class="ric" style="--hue:${hue}"><svg viewBox="0 0 24 24">${art}</svg></span>`; };

// ---------------- the screens between battles ----------------
// one sheet (#room) shows whichever room the party is in; the map (#runmap) shows the act
const screenOn = on => { $('#app').classList.toggle('titled', on); };
function route() {
  if (!RS) return showTitle();
  saveRun(); hideRoom(); $('#runmap').hidden = true;
  const p = RS.phase;
  if (p === 'map') showMap();
  else if (p === 'battle') startBattle();
  else if (p === 'reward') showReward();
  else if (p === 'camp') showCampsite();
  else if (p === 'shop') showShop();
  else if (p === 'event') showEvent();
  else if (p === 'treasure') showChest();
  else showRunEnd();
}
function showRoom(html) { const r = $('#room'); $('#roomBody').innerHTML = html; r.hidden = false; r.scrollTop = 0; screenOn(true); UI.busy = true; }
function hideRoom() { $('#room').hidden = true; }
const goldTag = () => `<span class="gold"><svg viewBox="0 0 24 24">${GLYPH.coin}</svg>${RS.gold}</span>`;
function partyRow() {
  return `<div class="party">${RUN.HEROES.map(k => { const p = RS.party[k], f = p.hp / p.maxHp; return `<div class="pm"><span class="rf">${face(k)}</span><span class="pb"><i style="width:${f * 100}%" class="${f < .34 ? 'low' : ''}"></i></span><b>${p.hp}/${p.maxHp}</b>${p.potions ? `<em title="Healing Draughts">${'⚱'.repeat(p.potions)}</em>` : ''}</div>`; }).join('')}</div>`;
}
const relicRow = () => `<div class="relics">${RS.relics.map(relicIcon).join('')}</div>`;
// the act's map: floors climb from the bottom; the rooms the party can enter next glow
function showMap() {
  UI.busy = true; screenOn(true); setMusic(['outdoor', 'crypt', 'lava'][RS.act]);
  const A = RUN.ACTS[RS.act], nodes = Object.values(RS.map.nodes), can = new Set(RUN.choices(RS)), W = 330, DY = 62, H = (RUN.FLOORS + 1) * DY + 40;
  const jit = n => { let h = 0; for (const ch of n.id) h = (h * 31 + ch.charCodeAt(0)) | 0; return [((h & 15) - 7.5) * 1.6, (((h >> 4) & 15) - 7.5) * 1.2]; };
  const pos = n => { if (n.id === 'boss') return [W / 2, 34]; const [jx, jy] = jit(n); return [24 + n.x * (W - 48) / (RUN.COLS - 1) + jx, H - 36 - n.y * DY + jy]; };
  const visited = new Set(RS.visited || []);
  let lines = '', marks = '';
  for (const n of nodes) for (const k of n.next) { const m = RS.map.nodes[k], [x1, y1] = pos(n), [x2, y2] = pos(m); lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${visited.has(n.id) && (visited.has(k) || can.has(k)) ? 'trod' : ''}"/>`; }
  for (const n of nodes) {
    const [x, y] = pos(n), big = n.type === 'B', cls = ['nd', 't' + (n.type === '$' ? 'S' : n.type === '?' ? 'Q' : n.type), can.has(n.id) ? 'can' : '', visited.has(n.id) ? 'been' : '', RS.node === n.id ? 'here' : ''].join(' ');
    marks += `<g class="${cls}" data-id="${n.id}" transform="translate(${x} ${y})"><circle r="${big ? 26 : 15}"/><svg x="${big ? -16 : -10}" y="${big ? -16 : -10}" width="${big ? 32 : 20}" height="${big ? 32 : 20}" viewBox="0 0 24 24">${ROOM_ICON[n.type]}</svg></g>`;
  }
  const fl = RS.node ? RS.map.nodes[RS.node].y + 1 : 0;
  $('#rmHead').innerHTML = `<div class="rmt"><p class="kick">Act ${RS.act + 1} of 3 · ${fl ? 'Floor ' + fl : 'The way in'}</p><h2>${A.name}</h2></div>${goldTag()}`;
  $('#rmParty').innerHTML = partyRow() + relicRow();
  $('#rmMap').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${lines}${marks}</svg>`;
  $('#rmNote').textContent = fl ? 'Pick the next room: the glowing ones are open to you.' : `${A.text} Pick a room on the first floor.`;
  $('#runmap').hidden = false;
  $('#rmMap').querySelectorAll('.nd.can').forEach(g => g.onclick = () => { ac(); sfx('pick'); goRoom(g.dataset.id); });
  // keep the party's floor in view
  const sc = $('#rmScroll'), here = RS.node ? pos(RS.map.nodes[RS.node])[1] : H; sc.scrollTop = Math.max(0, here - sc.clientHeight * .7);
}
function goRoom(id) {
  if (!RUN.enter(RS, id)) return;
  $('#runmap').hidden = true; route();
}
// a fight, an elite or the boss: the board is laid out and the briefing shown
function startBattle() {
  hideRoom(); screenOn(false); $('#runmap').hidden = true;
  let saved = null;
  if (RS.battle) { try { saved = JSON.parse(RS.battle); if (saved.v !== 3 || saved.level !== RS.room.enc.level || saved.phase !== 'player') saved = null; } catch (e) { saved = null; } }
  loadLevel(RS.room.enc.level, saved);
}
// after a won battle: the gold, an elite's relic, and one pick of three (or a boss relic)
function showReward() {
  const rw = RS.room.reward, boss = !!rw.boss;
  const head = `<p class="kick">Act ${RS.act + 1} · ${ROOM_NAME[RS.room.type]}</p><h2 class="win">${boss ? 'The boss falls' : 'Victory'}</h2>`;
  const loot = `<div class="loot"><div class="li"><svg viewBox="0 0 24 24">${GLYPH.coin}</svg><span><b>+${rw.gold} gold</b><small>${RS.gold} in the purse</small></span></div>${rw.relic ? `<div class="li">${relicIcon(rw.relic)}<span><b>${GC.RELICS[rw.relic].name}</b><small>${GC.RELICS[rw.relic].text}</small></span></div>` : ''}</div>`;
  let pick;
  if (boss) pick = `<h3>Take one of the boss's treasures</h3><div class="picks">${rw.boss.map((id, i) => `<button class="pk" data-i="${i}">${relicIcon(id)}<span><b>${GC.RELICS[id].name}</b><small>${GC.RELICS[id].text}</small></span></button>`).join('')}</div><button class="tb2" id="pkSkip">Take nothing</button>`;
  else pick = `<h3>Choose one</h3><div class="picks">${rw.choices.map((o, i) => { const [t, line] = RUN.describe(RS, o); return `<button class="pk" data-i="${i}">${o.card ? cardIcon(o.card) : `<span class="rf">${face(o.kind)}</span>`}<span><b>${t}</b><small>${line}</small></span></button>`; }).join('')}</div><button class="tb2" id="pkSkip">Skip</button>`;
  showRoom(head + partyRow() + loot + pick + (G && G.S.result ? `<details class="rpt"><summary>The battle</summary>${report()}</details>` : ''));
  $('#roomBody').querySelectorAll('.pk').forEach(b => b.onclick = () => { ac(); sfx('crit'); RUN.takeReward(RS, +b.dataset.i); route(); });
  $('#pkSkip').onclick = () => { ac(); sfx('pick'); if (boss) { RUN.nextAct(RS); } else RUN.takeReward(RS, null); route(); };
}
// a campsite: rest, or train one action
function showCampsite() {
  const noRest = RS.relics.some(id => GC.RELICS[id].noRest), k = RUN.HEAL.rest + RS.relics.reduce((s, id) => s + (GC.RELICS[id].rest || 0), 0);
  const heals = RUN.HEROES.map(h => { const p = RS.party[h]; return Math.min(p.maxHp - p.hp, Math.ceil(p.maxHp * k)); });
  showRoom(`<p class="kick">Act ${RS.act + 1} · Campsite</p><h2>A Campsite</h2><p>A sheltered hollow and a small fire. There is time to rest, or to train.</p>${partyRow()}
    <div class="picks"><button class="pk" id="cRest" ${noRest ? 'disabled' : ''}><span class="ric" style="--hue:30"><svg viewBox="0 0 24 24">${ROOM_ICON.R}</svg></span><span><b>Rest</b><small>${noRest ? 'The Black Candle keeps the party from resting.' : `Every hero heals ${Math.round(k * 100)}% of max HP: ${RUN.HEROES.map((h, i) => `${GC.UNITS[h].name.replace('Sister ', '')} +${heals[i]}`).join(', ')}.`}</small></span></button>
    <button class="pk" id="cTrain"><span class="ric" style="--hue:200"><svg viewBox="0 0 24 24">${GLYPH.rune}</svg></span><span><b>Train</b><small>Upgrade one action of any hero.</small></span></button></div>`);
  $('#cRest').onclick = () => { ac(); sfx('heal'); RUN.rest(RS); route(); };
  $('#cTrain').onclick = () => { ac(); sfx('select'); chooseUpgrade(sel => { RUN.train(RS, sel.kind, sel.card); route(); }, showCampsite); };
}
// the actions that can be upgraded, every hero's; done({ kind, card }) on a pick, back() to go back
function chooseUpgrade(done, back) {
  const rows = RUN.HEROES.flatMap(k => RUN.upgradable(RS, k).map(card => ({ kind: k, card })));
  showRoom(`<p class="kick">Train</p><h2>Upgrade an action</h2><div class="picks">${rows.map((o, i) => `<button class="pk" data-i="${i}">${cardIcon(o.card)}<span><b>${GC.UNITS[o.kind].name.replace('Sister ', '')}: ${GC.CARDS[o.card].name}+</b><small>${GC.upText(o.card)[0].toUpperCase() + GC.upText(o.card).slice(1)}. Now: ${GC.CARDS[o.card].text.replace('{die}', RUN.diceOf(RS.party[o.kind], o.card))}</small></span></button>`).join('') || '<p>Every action is upgraded already.</p>'}</div><button class="tb2" id="upBack">Back</button>`);
  $('#roomBody').querySelectorAll('.pk').forEach(b => b.onclick = () => { ac(); sfx('crit'); done(rows[+b.dataset.i]); });
  $('#upBack').onclick = () => { ac(); back(); };
}
// a shop: wares with prices; what can't be afforded is greyed
function showShop() {
  const W = RS.room.shop.wares;
  const ware = (w, i) => {
    const [t, line] = RUN.describe(RS, w), icon = w.type === 'relic' ? relicIcon(w.id) : w.card ? cardIcon(w.card) : w.kind ? `<span class="rf">${face(w.kind)}</span>` : `<span class="ric" style="--hue:200"><svg viewBox="0 0 24 24">${GLYPH.rune}</svg></span>`;
    const full = w.type === 'draught' && RS.party[w.kind].potions >= RUN.LIMITS.potions;
    return `<button class="pk ware ${w.sold ? 'sold' : ''}" data-i="${i}" ${w.sold || RS.gold < w.price || full ? 'disabled' : ''}>${icon}<span><b>${t}</b><small>${w.sold ? 'Sold' : full ? 'Carries all they can' : line}</small></span><em class="pr">${w.sold ? '' : w.price}</em></button>`;
  };
  showRoom(`<div class="rhd"><div><p class="kick">Act ${RS.act + 1} · Shop</p><h2>The Pedlar's Wagon</h2></div>${goldTag()}</div><p>A goblin turncoat with a cart of stolen goods. "Gold, tall ones, and it's yours."</p>${partyRow()}<div class="picks shop">${W.map(ware).join('')}</div><button class="go" id="shopOut">Leave</button>`);
  $('#roomBody').querySelectorAll('.ware').forEach(b => b.onclick = () => {
    ac(); const i = +b.dataset.i, w = W[i];
    if (w.type === 'train') return chooseUpgrade(sel => { RUN.buy(RS, i, sel.kind, sel.card); sfx('crit'); saveRun(); showShop(); }, showShop);
    if (RUN.buy(RS, i)) { sfx('crit'); saveRun(); showShop(); }
  });
  $('#shopOut').onclick = () => { ac(); sfx('pick'); RUN.leave(RS); route(); };
}
// an unknown room's event: its story and choices, then what came of it
function showEvent() {
  const ev = RS.room.event, E = RUN.EVENTS[ev.id];
  if (ev.done != null) {
    showRoom(`<p class="kick">Act ${RS.act + 1} · Unknown</p><h2>${E.title}</h2><p>${E.choices[ev.done].label}.</p><ul class="res">${(ev.result.length ? ev.result : ['nothing happens']).map(r => `<li>${r[0].toUpperCase() + r.slice(1)}</li>`).join('')}</ul>${partyRow()}<button class="go" id="evOn">Onward</button>`);
    $('#evOn').onclick = () => { ac(); RUN.leave(RS); route(); }; return;
  }
  showRoom(`<p class="kick">Act ${RS.act + 1} · Unknown</p><h2>${E.title}</h2><p>${E.text}</p>${partyRow()}<div class="picks">${E.choices.map((c, i) => `<button class="pk ev" data-i="${i}" ${RUN.canChoose(RS, c) ? '' : 'disabled'}><span><b>${c.label}</b><small>${c.text}${RUN.canChoose(RS, c) ? '' : ' (not enough gold)'}</small></span></button>`).join('')}</div>`);
  $('#roomBody').querySelectorAll('.pk').forEach(b => b.onclick = () => { ac(); sfx('select'); RUN.choose(RS, +b.dataset.i); route(); });
}
// a chest: open it for a relic and some gold
function showChest() {
  const c = RS.room.chest;
  showRoom(`<p class="kick">Act ${RS.act + 1} · Treasure</p><h2>A Chest</h2><p>${c.open ? 'Inside, under a mouldy blanket:' : 'An iron-bound chest, its lock long rusted through.'}</p>${c.open ? `<div class="loot"><div class="li"><svg viewBox="0 0 24 24">${GLYPH.coin}</svg><span><b>+${c.gold} gold</b><small>${RS.gold} in the purse</small></span></div>${c.relic ? `<div class="li">${relicIcon(c.relic)}<span><b>${GC.RELICS[c.relic].name}</b><small>${GC.RELICS[c.relic].text}</small></span></div>` : ''}</div>` : ''}<button class="go" id="chGo">${c.open ? 'Onward' : 'Open it'}</button>`);
  $('#chGo').onclick = () => { ac(); if (!c.open) { sfx('crit'); RUN.openChest(RS); saveRun(); showChest(); } else { RUN.leave(RS); route(); } };
}
// the end of a run, won or lost: what the party did
function showRunEnd() {
  const won = RS.result === 'win', st = RS.stats, done = RS;
  RS = null; saveRun(); // the run is over: the next visit starts a new one
  showRoom(`<p class="kick">${won ? 'The run is won' : `Act ${done.act + 1} · the run is over`}</p><h2 class="${won ? 'win' : 'lose'}">${won ? 'The Goblin King Falls' : 'The Party Has Fallen'}</h2>
    <p>${won ? "Grubnash's crown rolls across the flagstones and the crypt is yours. The party climbs out into the daylight." : `The goblins hold ${RUN.ACTS[done.act].name}. Every hero is down.`}</p>
    <div class="stats"><span><b>${st.floors}</b>rooms</span><span><b>${st.fights}</b>battles won</span><span><b>${st.elites}</b>elites</span><span><b>${st.bosses}</b>bosses</span><span><b>${st.kills}</b>goblins</span><span><b>${st.gold}</b>gold earned</span></div>
    <h3>Relics</h3>${`<div class="relics big">${done.relics.map(relicIcon).join('')}</div>`}
    <button class="go" id="endNew">New run</button><button class="tb2" id="endTitle2">Main menu</button>`);
  sfx(won ? 'win' : 'taunt');
  $('#endNew').onclick = () => { ac(); startRun(); };
  $('#endTitle2').onclick = () => { ac(); toTitle(); };
}

// ---------------- the title screen: a run, or any battle from the level select ----------------
function showTitle() {
  ['#intro', '#end', '#settings', '#help', '#logv', '#csheet', '#room', '#runmap'].forEach(q => { $(q).hidden = true; });
  setMenu(false);
  const go = !!RS;
  $('#tCont').hidden = !go;
  if (go) $('#tContSub').textContent = `Act ${RS.act + 1} · ${RS.node ? 'floor ' + (RS.map.nodes[RS.node].y + 1) : 'the way in'} · ${RS.gold} gold · ${RS.relics.length} relic${RS.relics.length > 1 ? 's' : ''}`;
  $('#tNew').firstChild.textContent = go ? 'New run' : 'Begin a run';
  $('#tNewSub').textContent = `Three acts, ${RUN.FLOORS} floors each and a boss, down to the Goblin King`;
  $('#titleMain').hidden = false; $('#titleLevels').hidden = true;
  $('#title').hidden = false; screenOn(true); UI.busy = true;
}
function hideTitle() { $('#title').hidden = true; screenOn(false); }
const PRACTICE = () => LEVELS.map((L, i) => i).filter(i => !LEVELS[i].run);
function showLevels() {
  $('#levelList').innerHTML = PRACTICE().map(i => {
    const L = LEVELS[i], n = L.foes.length, boss = L.foes.some(([k]) => GC.UNITS[k].boss), two = !!(L.deck && L.deck.length), nb = L.boons ?? Math.min(i, GC.CAMPAIGN);
    const tag = L.extra ? 'Extra' : `Battle ${i + 1}`, notes = [`${n} foes`, boss ? 'Boss' : '', two ? 'Two floors' : '', `${nb} boon${nb === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
    return `<button class="lvl${L.extra ? ' extra' : ''}" data-i="${i}"><span class="ln">${tag}</span><b>${L.name}</b><small>${notes}</small></button>`;
  }).join('');
  $('#levelList').querySelectorAll('.lvl').forEach(b => b.onclick = () => { ac(); sfx('pick'); freeBattle(+b.dataset.i); });
  $('#titleMain').hidden = true; $('#titleLevels').hidden = false; sfx('select');
}
// a battle from the level select, fought with the boons a party would have earned by then
function freeBattle(i) { MODE = 'free'; FREE = { boons: GC.partyBoons(i) }; hideTitle(); loadLevel(i); }
// a new run: the party sets out, with a word first
async function startRun() {
  RS = RUN.newRun(undefined, { diff: PREF_DIFF }); MODE = 'run'; saveRun();
  hideTitle(); hideRoom(); screenOn(true);
  await talk(DLG.run && DLG.run.start);
  route();
}
function continueRun() { MODE = 'run'; hideTitle(); route(); }
$('#tCont').onclick = () => { ac(); sfx('pick'); continueRun(); };
$('#tNew').onclick = async () => {
  ac();
  if (RS && !(await ask('Start a new run?', 'The run in progress is given up.', 'New run', 'Keep it'))) return;
  startRun();
};
$('#tLevels').onclick = () => { ac(); showLevels(); };
$('#tBack').onclick = () => { ac(); sfx('pick'); $('#titleMain').hidden = false; $('#titleLevels').hidden = true; };
$('#tHelp').onclick = () => { ac(); $('#help').hidden = false; };
$('#tSettings').onclick = () => { ac(); renderSettings(); $('#settings').hidden = false; sfx('select'); };
// to the title from a battle or a room: a run's turn is already saved; a level-select battle is let go
$('#menuMain').onclick = () => { ac(); $('#settings').hidden = true; toTitle(); };
$('#endMenu').onclick = () => { ac(); toTitle(); };
$('#introMenu').onclick = () => { ac(); sfx('pick'); toTitle(); };
$('#rmMenu').onclick = () => { ac(); toTitle(); };
$('#rmSettings').onclick = () => { ac(); renderSettings(); $('#settings').hidden = false; sfx('select'); };
function toTitle() { saveTurn(); hideRoom(); $('#runmap').hidden = true; MODE = 'run'; loadLevel(RS ? LEVELS.findIndex(L => L.id === RUN.ACTS[RS.act].maps[0]) : 0, null, true); showTitle(); }

// a hot reload keeps the run, and the battle too if it is the player's move
function snapshot() { saveTurn(); return { v: 4, run: RS }; }
function start(data) {
  resize();
  applyEnvStyle(); $('#styleLbl').textContent = STYLE_NAME[STYLE]; $('#intentBtn').classList.toggle('on', showIntents); $('#barkBtn').classList.toggle('on', showBarks);
  makePortraits();
  RS = (data && data.v === 4 && RUN.check(data.run)) || loadRun(); renderSettings();
  if (data && data.v === 4 && RS) continueRun(); // the viewer's hot reload goes straight back to where it was
  else { loadLevel(0, null, true); showTitle(); } // a fresh visit opens on the title, the board laid out behind it
  requestAnimationFrame(frame);
}
