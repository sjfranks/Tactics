'use strict';
// GOBLIN CRYPT · THE TABLE · the campaign: where the party is, what it has earned, the save, and laying out a battle
// One of the view's scripts (see js/table/core.js); they share one scope and load in the order index.html lists them.

// ---------------- the campaign and its save ----------------
// CAMP is the campaign: the battle reached, the boons taken, the difficulty, the running tally, a boon offer still to
// choose, and (on the player's turn) the battle itself. It is saved in this browser after every change, so closing the
// page loses nothing; the viewer's hot reload carries it too.
const SAVE_KEY = 'goblin-crypt-campaign-1';
// growth: each hero's level, the experience toward the next, and the cards upgraded (one for each level from 2)
const freshGrowth = () => ({ fighter: { lv: 1, xp: 0, ups: [] }, cleric: { lv: 1, xp: 0, ups: [] }, mage: { lv: 1, xp: 0, ups: [] }, thief: { lv: 1, xp: 0, ups: [] } });
const freshCamp = (diff = 'normal') => ({ v: 1, level: 0, boons: [], diff, tally: {}, battles: 0, offer: null, state: null, growth: freshGrowth() });
let CAMP = freshCamp();
// MODE 'camp' plays the campaign; 'free' a battle chosen from the level select, which never touches the campaign's save.
// FREE holds the free battle's boons, so a restart keeps them
let MODE = 'camp', FREE = { boons: [] };
function saveCamp() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(CAMP)); } catch (e) { } }
function readCamp(c) {
  if (!c || c.v !== 1 || !Number.isInteger(c.level) || c.level < 0 || c.level >= GC.CAMPAIGN) return null;
  const offer = Array.isArray(c.offer) ? c.offer.filter(id => GC.BOONS[id] && !(c.boons || []).includes(id)) : [];
  return { ...freshCamp(), ...c, boons: (c.boons || []).filter(id => GC.BOONS[id]), offer: offer.length ? offer : null, diff: GC.TUNE.difficulty[c.diff] ? c.diff : 'normal', tally: c.tally && typeof c.tally === 'object' ? c.tally : {},
    growth: Object.fromEntries(Object.entries(freshGrowth()).map(([k, g]) => { const o = c.growth && c.growth[k]; if (!o || !Number.isInteger(o.lv) || o.lv < 1) return [k, g]; const lv = Math.min(GC.TUNE.xp.max, o.lv), ups = [...new Set(Array.isArray(o.ups) ? o.ups : [])].filter(id => GC.upgradable(k).includes(id)).slice(0, lv - 1); return [k, { lv, xp: Math.max(0, +o.xp || 0), ups }]; })) };
}
function loadCamp() { try { return readCamp(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return null; } }
// the battle in progress, kept whenever it is the player's move
function saveTurn() { if (MODE === 'camp' && G && UI.phase === 'player' && !UI.busy && !UI.over && G.S.phase === 'player') { CAMP.state = G.snapshot(); saveCamp(); } }
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
function newCampaign() { MODE = 'camp'; CAMP = freshCamp(CAMP.diff); saveCamp(); $('#end').hidden = true; hideTitle(); loadLevel(0); }
// back into the campaign where it was left: the saved turn, the camp with a boon to choose, or the next briefing
function enterCampaign() {
  MODE = 'camp'; hideTitle();
  let saved = null;
  if (CAMP.state) { try { saved = JSON.parse(CAMP.state); if (saved.v !== 4 || saved.level !== CAMP.level || saved.phase !== 'player') saved = null; } catch (e) { saved = null; } }
  loadLevel(CAMP.level, saved);
}
// a battle from the level select, fought with the boons a party would have earned by then
function freeBattle(i) { MODE = 'free'; FREE = { boons: GC.partyBoons(i), growth: GC.partyGrowth(i) }; hideTitle(); loadLevel(i); }
// a hero's level and experience, with what this battle has earned so far
function growthOf(kind) {
  const g = (MODE === 'free' ? FREE.growth : CAMP.growth) || {}, h = g[kind] || { lv: 1, xp: 0, ups: [] }, u = G && G.S.units.find(x => x.kind === kind && x.side === 'hero');
  return { lv: h.lv, xp: h.xp, ups: h.ups || [], gained: u && G.S.stats[u.id] ? G.S.stats[u.id].xp : 0 };
}
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
// between battles, when the page was closed before every choice was made: the camp, then the next battle's briefing
function showCamp() {
  steps('#endSteps');
  $('#endTitle').textContent = 'Camp'; $('#endTitle').className = 'win';
  $('#endText').textContent = `Before ${LEVELS[level].name}, the party makes camp, mends its gear and trains.${upsDue().length ? ' Upgrade a card for each hero who gained a level.' : ''}${CAMP.offer ? ' Choose one boon for the road.' : ''}`;
  $('#endReport').innerHTML = '';
  offerCamp(() => { $('#end').hidden = true; loadLevel(level); }, 'To the briefing'); // laid out again, so the battle carries what was picked
  $('#end').hidden = false;
}
const campDue = () => MODE === 'camp' && (!!CAMP.offer || upsDue().length > 0); // a choice is waiting at camp
// the heroes with an upgrade to choose (one for each level gained), and how many each
const upsDue = () => GC.HERO_KINDS.map(k => ({ kind: k, n: GC.upgradesDue(k, CAMP.growth[k]) })).filter(d => d.n > 0);
// a card's upgrade, as the hero would hold it (with their own dice)
function upText(kind, id) {
  const r = G && G.S.units.find(u => u.kind === kind && u.side === 'hero'), c = GC.UPPED[id], dice = r ? G.diceName(r, id) : diceText(id);
  return `<b>${c.name}</b> ${c.text.replace('{die}', dice)}`;
}
// each hero who gained a level picks a card to upgrade: their cards in a row (the upgraded ones marked), and what the
// one tapped would become; done(kind, ids) with that hero's picks so far
function renderUpgrades(box, due, done) {
  box.innerHTML = due.map(d => {
    const g = CAMP.growth[d.kind], nm = GC.UNITS[d.kind].name;
    return `<div class="upk" data-kind="${d.kind}"><div class="uph"><span class="rf">${face(d.kind)}</span><b>${nm}</b><small>Level ${g.lv} · ${d.n > 1 ? `pick ${d.n}` : 'pick one'}</small></div>
      <div class="upc" role="group" aria-label="${nm}: a card to upgrade">${GC.upgradable(d.kind).map(id => { const [hue, art] = ART[id], had = (g.ups || []).includes(id); return `<button class="upb${had ? ' had' : ''}" data-id="${id}" style="--hue:${hue}"${had ? ' disabled' : ''} aria-pressed="false" aria-label="${had ? GC.UPPED[id].name + ', upgraded' : 'Upgrade ' + CARDS[id].name}"><span class="ui"><svg viewBox="0 0 24 24">${art}</svg>${had ? '<i>+</i>' : ''}</span><span class="un">${had ? GC.UPPED[id].name : CARDS[id].name}</span></button>`; }).join('')}</div>
      <p class="upt">Tap a card to see what it becomes.</p></div>`;
  }).join('');
  box.querySelectorAll('.upk').forEach(el => {
    const kind = el.dataset.kind, n = due.find(d => d.kind === kind).n, sel = [];
    el.querySelectorAll('.upb:not(.had)').forEach(b => b.onclick = () => {
      ac(); sfx('pick');
      const id = b.dataset.id, i = sel.indexOf(id);
      if (i >= 0) sel.splice(i, 1); else { sel.push(id); if (sel.length > n) sel.shift(); }
      el.querySelectorAll('.upb').forEach(x => { const on = sel.includes(x.dataset.id); x.classList.toggle('sel', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      el.querySelector('.upt').innerHTML = i >= 0 && !sel.length ? 'Tap a card to see what it becomes.' : upText(kind, i >= 0 ? sel[sel.length - 1] : id);
      done(kind, sel.slice());
    });
  });
}
// the choices under the victory text: an upgrade for each hero who gained a level, and a boon for the road. The
// button waits until every one is made
function offerCamp(go, label) {
  const btn = $('#againBtn'), due = upsDue(), picks = {};
  let boon = null;
  const ready = () => { btn.disabled = (!!CAMP.offer && !boon) || due.some(d => (picks[d.kind] || []).length < d.n); };
  $('#endUps').hidden = !due.length;
  if (due.length) renderUpgrades($('#upList'), due, (kind, ids) => { picks[kind] = ids; ready(); });
  $('#endBoons').hidden = !CAMP.offer;
  if (CAMP.offer) renderBoons($('#boonList'), CAMP.offer, id => { boon = id; ready(); });
  btn.textContent = label; ready();
  endAction = () => {
    for (const d of due) (picks[d.kind] || []).forEach(id => GC.takeUpgrade(CAMP.growth[d.kind], d.kind, id));
    if (boon) takeBoon(boon); else saveCamp();
    go();
  };
}
const partyBoonIds = () => MODE === 'free' ? FREE.boons : CAMP.boons;
// the party's upgraded cards, by name, hero by hero
const upNames = () => { const g = (MODE === 'free' ? FREE.growth : CAMP.growth) || {}; return GC.HERO_KINDS.flatMap(k => ((g[k] && g[k].ups) || []).map(id => GC.UPPED[id].name)); };
const boonNames = (who) => partyBoonIds().map(id => GC.BOONS[id]).filter(b => !who || b.who === who || b.who === 'party').map(b => b.name);

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
  follow = null; zoomT = playZoom(); camAzT = camAz - angDiff(camAz, baseAz());
  const mid = list => list.reduce((a, u) => a.add(u.root.position), new V3()).multiplyScalar(1 / list.length), h = mid(hs0), g = gs0.length ? mid(gs0) : h.clone().setZ(h.z - 4);
  camTX = h.x + (g.x - h.x) * .35; camTZ = h.z + (g.z - h.z) * .35; clampCam();
  if (zoomT >= 1 && !bigMap()) camTX = camTZ = 0; // the whole board fits: keep it in the middle
  if (now) { camAz = camAzT; camX = camTX; camZ = camTZ; zoom = zoomT; }
}
// lay out a battle: the rules make a fresh state with the party's boons (or take a saved one), the table builds the
// diorama and the pieces. Then the briefing, the camp (a boon still to choose), or straight back into a saved turn.
// backdrop: only lay the board out, behind the title screen, leaving the campaign and its save alone
function loadLevel(i, saved, backdrop) {
  level = i; const L = LEVELS[i];
  clearBoard();
  G = GC.battle(saved || GC.newState(i, undefined, { boons: partyBoonIds(), diff: CAMP.diff, growth: MODE === 'free' ? FREE.growth : CAMP.growth, xp: MODE !== 'free' }));
  if (MODE === 'camp' && !backdrop && (CAMP.level !== i || !saved)) { CAMP.level = i; CAMP.state = null; saveCamp(); }
  boardFromRules(G.B); buildBoard(L); buildHL();
  (L.props || []).forEach(([type, c, r, l]) => { PROP_L = l || 0; try { PROPS[type](c, r); } finally { PROP_L = 0; } });
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
  if (backdrop) return;
  if (saved && G.S.phase === 'player') { // back from a reload: straight to the hero whose turn it was
    try {
      liveUnits().forEach(showNow);
      QUIET = true; try { sync(); } finally { QUIET = false; }
      UI.round = G.S.round; UI.order = G.S.order.slice(); UI.turn = G.S.turn;
      G.S.units.forEach(r => { const u = vu(r.id); if (u) u.init = r.init; });
      UI.active = vu(G.S.active); UI.phase = 'player'; UI.busy = false;
      defaultView(true); if (zoomT < 1 || bigMap()) { const a = UI.active.root.position; camX = camTX = a.x; camZ = camTZ = a.z; clampCam(); camX = camTX; camZ = camTZ; } // on the hero whose turn it is
      updateBoss(); updateHud(); renderTokens(); setSel(UI.active, true); computeIntents(); refresh();
      logEvent(`${L.name} · round ${G.S.round}: the battle goes on`, 'hdr');
      return;
    } catch (e) { console.error(e); return loadLevel(i); }
  }
  if (campDue()) showCamp(); else showIntro();
}
function showIntro() {
  const L = LEVELS[level], diff = GC.TUNE.difficulty[CAMP.diff];
  steps('#introSteps');
  const boss = LEVELS[level].foes.some(([k]) => GC.UNITS[k].boss) ? ' · Boss' : '';
  $('#introKick').textContent = (MODE === 'free' ? `Level select · ${L.extra ? 'Extra battle' : 'Battle ' + (level + 1)}` : `Battle ${level + 1} of ${GC.CAMPAIGN}`) + boss + (CAMP.diff !== 'normal' ? ' · ' + diff.label : '');
  $('#introTitle').textContent = L.name; $('#introText').textContent = L.text;
  const counts = {}; L.foes.forEach(([k]) => counts[k] = (counts[k] || 0) + 1);
  $('#introFoes').innerHTML = Object.entries(counts).map(([k, n]) => { const d = GC.UNITS[k]; return `<span class="${d.boss ? 'boss' : ''}">${n > 1 ? n + '× ' : ''}${d.name}${d.title ? ' ' + d.title : ''}</span>`; }).join('');
  const bn = boonNames(), un = upNames();
  $('#introBoons').innerHTML = (bn.length ? `<div class="bcg"><b>Boons</b>${bn.map(n => `<span>${n}</span>`).join('')}</div>` : '') + (un.length ? `<div class="bcg"><b>Upgrades</b>${un.map(n => `<span class="up">${n}</span>`).join('')}</div>` : '');
  $('#introBoons').hidden = !bn.length && !un.length;
  $('#introGo').textContent = MODE === 'camp' && level === 0 && !CAMP.battles ? 'Set up the board' : 'To battle';
  $('#intro').hidden = false;
}
// a hot reload keeps the whole campaign, and the battle too if it is the player's move
function snapshot() {
  saveTurn();
  return { v: 3, camp: { ...CAMP, state: MODE === 'camp' && G && UI.phase === 'player' && !UI.busy && !UI.over ? G.snapshot() : CAMP.state } };
}

// ---------------- the title screen: the campaign, or any battle from the level select ----------------
const campStarted = () => CAMP.level > 0 || CAMP.battles > 0 || !!CAMP.state || !!CAMP.offer;
function showTitle() {
  ['#intro', '#end', '#settings', '#help', '#logv', '#csheet'].forEach(q => { $(q).hidden = true; });
  setMenu(false);
  const go = campStarted();
  $('#tCont').firstChild.textContent = go ? 'Continue the campaign' : 'Begin the campaign';
  $('#tContSub').textContent = go ? `Battle ${CAMP.level + 1} of ${GC.CAMPAIGN}: ${LEVELS[CAMP.level].name}${CAMP.boons.length ? ` · ${CAMP.boons.length} boon${CAMP.boons.length > 1 ? 's' : ''}` : ''}` : `${GC.CAMPAIGN} battles to the Goblin King`;
  $('#tNew').hidden = !go;
  $('#titleMain').hidden = false; $('#titleLevels').hidden = true;
  $('#title').hidden = false; $('#app').classList.add('titled'); UI.busy = true;
}
function hideTitle() { $('#title').hidden = true; $('#app').classList.remove('titled'); }
function showLevels() {
  $('#levelList').innerHTML = LEVELS.map((L, i) => {
    const n = L.foes.length, boss = L.foes.some(([k]) => GC.UNITS[k].boss), two = !!(L.deck && L.deck.length);
    const tag = L.extra ? 'Extra' : `Battle ${i + 1}`, notes = [`${n} foes`, boss ? 'Boss' : '', two ? 'Two floors' : '', `${L.boons ?? i} boon${(L.boons ?? i) === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
    return `<button class="lvl${L.extra ? ' extra' : ''}" data-i="${i}"><span class="ln">${tag}</span><b>${L.name}</b><small>${notes}</small></button>`;
  }).join('');
  $('#levelList').querySelectorAll('.lvl').forEach(b => b.onclick = () => { ac(); sfx('pick'); freeBattle(+b.dataset.i); });
  $('#titleMain').hidden = true; $('#titleLevels').hidden = false; sfx('select');
}
$('#tCont').onclick = () => { ac(); sfx('pick'); enterCampaign(); };
$('#tNew').onclick = async () => {
  ac();
  if (await ask('Start a new campaign?', `The party goes back to the Gorge Crossing and gives up its ${CAMP.boons.length} boon${CAMP.boons.length === 1 ? '' : 's'}.`, 'New campaign', 'Keep this one')) newCampaign();
};
$('#tLevels').onclick = () => { ac(); showLevels(); };
$('#tBack').onclick = () => { ac(); sfx('pick'); $('#titleMain').hidden = false; $('#titleLevels').hidden = true; };
$('#tHelp').onclick = () => { ac(); $('#helpClose').textContent = 'Back'; $('#help').scrollTop = 0; $('#help').hidden = false; };
$('#tSettings').onclick = () => { ac(); renderSettings(); $('#settings').hidden = false; sfx('select'); };
// to the title from a battle: a campaign turn is already saved; a free battle is let go
$('#menuMain').onclick = () => { ac(); $('#settings').hidden = true; toTitle(); };
$('#endMenu').onclick = () => { ac(); toTitle(); };
$('#introMenu').onclick = () => { ac(); sfx('pick'); toTitle(); };
function toTitle() { saveTurn(); MODE = 'camp'; loadLevel(CAMP.level, null, true); showTitle(); }
function start(data) {
  resize();
  applyEnvStyle(); $('#styleLbl').textContent = STYLE_NAME[STYLE]; $('#intentBtn').classList.toggle('on', showIntents); $('#barkBtn').classList.toggle('on', showBarks);
  makePortraits();
  CAMP = (data && data.v === 3 && readCamp(data.camp)) || loadCamp() || freshCamp(); renderSettings();
  if (data && data.v === 3) enterCampaign(); // the viewer's hot reload goes straight back to the table
  else { loadLevel(CAMP.level, null, true); showTitle(); } // a fresh visit opens on the title, the board laid out behind it
  requestAnimationFrame(frame);
}
