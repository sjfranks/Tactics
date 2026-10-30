'use strict';
// GOBLIN CRYPT · THE TABLE · the campaign: where the party is, what it has earned, the save, and laying out a battle
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.

// ---------------- the campaign and its save ----------------
// CAMP is the campaign: the battle reached, the boons taken, the difficulty, the running tally, a boon offer still to
// choose, and (on the player's turn) the battle itself. It is saved in this browser after every change, so closing the
// page loses nothing; the viewer's hot reload carries it too.
const SAVE_KEY = 'goblin-crypt-campaign-1';
const freshCamp = (diff = 'normal') => ({ v: 1, level: 0, boons: [], diff, tally: {}, battles: 0, offer: null, state: null });
let CAMP = freshCamp();
function saveCamp() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(CAMP)); } catch (e) { } }
function readCamp(c) {
  if (!c || c.v !== 1 || !Number.isInteger(c.level) || !LEVELS[c.level]) return null;
  const offer = Array.isArray(c.offer) ? c.offer.filter(id => GC.BOONS[id] && !(c.boons || []).includes(id)) : [];
  return { ...freshCamp(), ...c, boons: (c.boons || []).filter(id => GC.BOONS[id]), offer: offer.length ? offer : null, diff: GC.TUNE.difficulty[c.diff] ? c.diff : 'normal', tally: c.tally && typeof c.tally === 'object' ? c.tally : {} };
}
function loadCamp() { try { return readCamp(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return null; } }
// the battle in progress, kept whenever it is the player's move
function saveTurn() { if (G && UI.phase === 'player' && !UI.busy && !UI.over && G.S.phase === 'player') { CAMP.state = G.snapshot(); saveCamp(); } }
// a finished battle goes into the campaign's running tally
function addTally() {
  const st = G.S.stats;
  for (const u of G.S.units) {
    const s = st[u.id]; if (!s) continue;
    const t = CAMP.tally[u.kind] || (CAMP.tally[u.kind] = { dealt: 0, kills: 0, healed: 0, taken: 0, downs: 0 });
    for (const k in t) t[k] += s[k] || 0;
  }
  CAMP.battles++;
}
function newCampaign() { CAMP = freshCamp(CAMP.diff); saveCamp(); $('#end').hidden = true; loadLevel(0); }
const boonWho = b => b.who === 'party' ? 'The party' : GC.UNITS[b.who].name;
const boonFace = b => b.who === 'party' ? '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg>' : face(b.who);
// the boons on offer, as cards to choose from; done(id) when one is picked
function renderBoons(box, ids, done) {
  box.innerHTML = ids.map(id => { const b = GC.BOONS[id]; return `<button class="boon" data-id="${id}" aria-pressed="false"><span class="bf">${boonFace(b)}</span><span class="bt"><b>${b.name}</b><small>${boonWho(b)}</small><span>${b.text}</span></span></button>`; }).join('');
  box.querySelectorAll('.boon').forEach(el => el.onclick = () => {
    ac(); sfx('pick');
    box.querySelectorAll('.boon').forEach(x => { x.classList.toggle('sel', x === el); x.setAttribute('aria-pressed', x === el ? 'true' : 'false'); });
    done(el.dataset.id);
  });
}
// pick a boon: it joins the party for every battle from here on
function takeBoon(id) {
  if (!CAMP.offer || !CAMP.offer.includes(id)) return;
  CAMP.boons.push(id); CAMP.offer = null; saveCamp();
}
// between battles, when the page was closed before a boon was chosen: the camp, then the next battle's briefing
function showCamp() {
  steps('#endSteps');
  $('#endTitle').textContent = 'Camp'; $('#endTitle').className = 'win';
  $('#endText').textContent = `Before ${LEVELS[level].name}, the party makes camp, mends its gear and trains. Choose one boon for the road.`;
  $('#endReport').innerHTML = '';
  offerBoons(() => { $('#end').hidden = true; showIntro(); }, 'To the briefing');
  $('#end').hidden = false;
}
// the boon choice under the victory text; the button waits for a pick
function offerBoons(go, label) {
  const btn = $('#againBtn'), box = $('#boonList');
  $('#endBoons').hidden = false; btn.textContent = label; btn.disabled = true;
  let pick = null;
  renderBoons(box, CAMP.offer, id => { pick = id; btn.disabled = false; });
  endAction = () => { takeBoon(pick); go(); };
}
const boonNames = (who) => CAMP.boons.map(id => GC.BOONS[id]).filter(b => !who || b.who === who || b.who === 'party').map(b => b.name);

// ---------------- laying out a battle ----------------
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
// lay out a battle: the rules make a fresh state with the party's boons (or take a saved one), the table builds the
// diorama and the pieces. Then the briefing, the camp (a boon still to choose), or straight back into a saved turn
function loadLevel(i, saved) {
  level = i; const L = LEVELS[i];
  clearBoard();
  G = GC.battle(saved || GC.newState(i, undefined, { boons: CAMP.boons, diff: CAMP.diff }));
  if (CAMP.level !== i || !saved) { CAMP.level = i; CAMP.state = null; saveCamp(); }
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
  setMusic(L.theme);
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
  if (CAMP.offer) showCamp(); else showIntro();
}
function showIntro() {
  const L = LEVELS[level], diff = GC.TUNE.difficulty[CAMP.diff];
  steps('#introSteps');
  $('#introKick').textContent = `Battle ${level + 1} of ${LEVELS.length}${level === LEVELS.length - 1 ? ' · Boss' : ''}${CAMP.diff !== 'normal' ? ' · ' + diff.label : ''}`;
  $('#introTitle').textContent = L.name; $('#introText').textContent = L.text;
  const counts = {}; L.foes.forEach(([k]) => counts[k] = (counts[k] || 0) + 1);
  $('#introFoes').innerHTML = Object.entries(counts).map(([k, n]) => { const d = GC.UNITS[k]; return `<span class="${d.boss ? 'boss' : ''}">${n > 1 ? n + '× ' : ''}${d.name}${d.title ? ' ' + d.title : ''}</span>`; }).join('');
  const bn = boonNames();
  $('#introBoons').innerHTML = bn.length ? `<b>Boons</b>${bn.map(n => `<span>${n}</span>`).join('')}` : '';
  $('#introBoons').hidden = !bn.length;
  $('#introGo').textContent = level === 0 && !CAMP.battles ? 'Set up the board' : 'To battle';
  $('#intro').hidden = false;
}
// a hot reload keeps the whole campaign, and the battle too if it is the player's move
function snapshot() {
  saveTurn();
  return { v: 3, camp: { ...CAMP, state: G && UI.phase === 'player' && !UI.busy && !UI.over ? G.snapshot() : null } };
}
function start(data) {
  resize();
  applyEnvStyle(); $('#styleLbl').textContent = STYLE_NAME[STYLE]; $('#intentBtn').classList.toggle('on', showIntents); $('#barkBtn').classList.toggle('on', showBarks);
  makePortraits();
  CAMP = (data && data.v === 3 && readCamp(data.camp)) || loadCamp() || freshCamp(); renderSettings();
  let saved = null;
  if (CAMP.state) { try { saved = JSON.parse(CAMP.state); if (saved.v !== 3 || saved.level !== CAMP.level || saved.phase !== 'player') saved = null; } catch (e) { saved = null; } }
  loadLevel(CAMP.level, saved);
  requestAnimationFrame(frame);
}
