/* Paragon: actions, input handling and startup. */
'use strict';

const cur = () => S.cur;
const findItem = uid => S.cur.inv.find(x => x.uid === uid);

function openChar(id) {
  const ch = S.chars[id];
  if (!ch) return;
  S.cur = D4.normalize(ch);
  S.c = D4.calc(S.cur);
  S.view = 'char';
  S.tab = S.c.todo.length ? 'build' : 'sheet';
  S.open = {};
  Nav.arm();
  renderAll();
}
function goHome() {
  saveNow();
  UI.sheets.length = 0;
  S.view = 'home'; S.cur = null; S.c = null; renderAll();
}

const ACT = {
  /* sheets */
  closeSheet: () => UI.close(),
  closeAllCommit: () => { UI.closeAll(); commit(); },
  confirmOk: () => { const sh = topSheet(); const fn = sh && sh.onOk; UI.close(); if (fn) setTimeout(fn, 30); },
  toastAction: () => { const fn = UI.toastAction; $('#toast').hidden = true; if (fn) fn(); },
  term: el => openTerm(el.dataset.term),

  /* navigation */
  home: () => goHome(),
  openChar: el => openChar(el.dataset.id),
  newChar: () => {
    const ch = D4.newCharacter();
    S.chars[ch.id] = ch;
    Store.set('char.' + ch.id, ch);
    updateIndex(ch);
    S.tab = 'build';
    openChar(ch.id);
  },
  importChar: () => importSheet(),
  settings: () => settingsSheet(),
  comp: el => { S.view = 'comp'; S.comp.tab = el.dataset.tab; S.comp.q = ''; S.comp.open = null; Nav.arm(); renderAll(); },
  compTab: el => { S.comp.tab = el.dataset.tab; S.comp.open = null; render(); },
  compCls: el => { S.comp.cls = el.dataset.val; S.comp.open = null; render(); },
  compToggle: el => { S.comp.open = S.comp.open === el.dataset.id ? null : el.dataset.id; $('#comp-list').innerHTML = compList(); },
  tab: el => { if (S.tab !== el.dataset.tab) { S.tab = el.dataset.tab; render(); } },
  charMenu: () => charMenu(),
  breakdown: el => showBreakdown(el.dataset.key),
  calcInfo: el => showCalc(el.dataset.pid, +el.dataset.line),
  level: el => {
    const ch = cur(), to = Math.max(1, Math.min(30, (+ch.level || 1) + +el.dataset.d));
    if (to === ch.level) return;
    ch.level = to;
    if (+ch.xp < D4.XP[to]) ch.xp = D4.XP[to];
    if (+el.dataset.d > 0) {
      S.c = D4.calc(ch);
      const gains = [];
      if (D4.FEAT_LEVELS.includes(to)) gains.push('a feat');
      if (D4.ABILITY_UP_LEVELS.includes(to)) gains.push('+1 to two abilities');
      if (D4.ABILITY_ALL_LEVELS.includes(to)) gains.push('+1 to all abilities');
      S.c.powerSlots.filter(s => s.lvl === to).forEach(s => gains.push(s.label.toLowerCase()));
      if (to === 11) gains.push('a paragon path');
      if (to === 21) gains.push('an epic destiny');
      toast('Level ' + to + (gains.length ? ': ' + gains.join(', ') : ''));
      commit();
      setTimeout(() => { const el2 = document.getElementById('lvl-' + to); if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      return;
    }
    commit();
  },

  /* build */
  pickRace: () => pickRace(),
  pickClass: () => pickClass(),
  setRaceAbil: el => { cur().raceAbil = el.dataset.val; commit(); },
  setRaceOpt: el => { cur().raceOpt[el.dataset.key] = el.dataset.val; commit(); },
  pickRaceSkill: () => pickRaceSkill(),
  setRaceSkill: el => { cur().raceSkill = el.dataset.val; UI.close(); commit(); },
  setClsOpt: el => { cur().clsOpt[el.dataset.key] = el.dataset.val; commit(); },
  setBuild: el => { cur().build = cur().build === el.dataset.val ? '' : el.dataset.val; commit(); },
  editAbilities: () => editAbilities(),
  abilMethod: el => {
    const ch = cur(), m = el.dataset.val;
    if (m === ch.abilMethod) return;
    ch.abilMethod = m;
    if (m === 'array') {
      const order = (S.c.cls ? S.c.cls.key : []).concat(D4.ABILS.filter(a => !(S.c.cls ? S.c.cls.key : []).includes(a)));
      order.forEach((a, i) => { ch.base[a] = D4.STANDARD_ARRAY[i]; });
    }
    if (m === 'pointbuy') { const pc = D4.pointCost(ch.base); if (!pc.ok) D4.ABILS.forEach(a => { ch.base[a] = 10; }); }
    commit();
  },
  abilStep: el => { const ch = cur(); ch.base[el.dataset.ab] = Math.max(8, Math.min(18, +ch.base[el.dataset.ab] + +el.dataset.d)); commit(); },
  editSkills: () => editSkills(),
  skillOneOf: el => { cur().skillOneOf = el.dataset.val; commit(); },
  editLangs: () => editLangs(),
  toggleLang: el => { const ch = cur(), l = el.dataset.val; ch.langs = ch.langs.includes(l) ? ch.langs.filter(x => x !== l) : ch.langs.concat([l]); commit(); },
  setUp: el => {
    const ch = cur(), L = el.dataset.lvl, a = el.dataset.val;
    let list = (ch.ups[L] || []).slice();
    if (list.includes(a)) list = list.filter(x => x !== a); else { list.push(a); if (list.length > 2) list.shift(); }
    ch.ups[L] = list;
    commit();
  },
  pickFeat: el => pickFeat(el.dataset.slot),
  showFeat: el => { const f = D4.feats[el.dataset.id]; if (f) UI.open({ title: f.n, body: () => featDetail(f, S.c) }); },
  featChoice: el => {
    const sh = topSheet(), pick = cur().feats[el.dataset.slot], v = el.dataset.val;
    if (sh.multi) {
      const list = Array.isArray(pick.choice) ? pick.choice.slice() : [];
      if (list.includes(v)) list.splice(list.indexOf(v), 1); else { list.push(v); if (list.length > sh.count) list.shift(); }
      pick.choice = list;
      S.c = D4.calc(cur());
      UI.refresh();
      return;
    }
    pick.choice = v;
    UI.closeAll(); commit();
  },
  pickPower: el => pickPower(el.dataset.slot, !!el.dataset.book),
  setReplace: el => { const ch = cur(), p = ch.powers[el.dataset.slot]; if (p && typeof p === 'object') p.replaces = el.dataset.val; commit(); },
  pickPath: () => pickPath(),
  pickDestiny: () => pickDestiny(),
  customPath: el => openPaste({ kind: el.dataset.kind, url: D4.lookupBase + '?list.full.' + (el.dataset.kind === 'path' ? 'paragonpath' : 'epicdestiny') }),
  editCustomClass: () => editCustomClass(),
  editCustomRace: () => editCustomRace(),
  ccToggle: el => {
    const obj = el.dataset.obj === 'race' ? cur().custom.race : cur().custom.cls, f = el.dataset.field, v = el.dataset.val;
    if (Array.isArray(obj[f])) obj[f] = obj[f].includes(v) ? obj[f].filter(x => x !== v) : obj[f].concat([v]);
    else obj[f] = obj[f] === v ? '' : v;
    commit();
  },

  /* pickers */
  pkToggle: el => { const sh = topSheet(); sh.open = sh.open === el.dataset.id ? null : el.dataset.id; refreshPicker(sh); },
  pkChoose: el => { const sh = topSheet(); sh.choose(el.dataset.id); },
  pkShowAll: () => { const sh = topSheet(); sh.showAll = !sh.showAll; sh.open = null; UI.refresh(); },
  pkOnlyOk: () => { const sh = topSheet(); sh.onlyOk = !sh.onlyOk; UI.refresh(); },
  pkCat: el => { const sh = topSheet(); sh.cat = el.dataset.val; sh.open = null; UI.refresh(); },
  pkClear: () => {
    const sh = topSheet(), ch = cur();
    if (sh.clear === 'path') ch.path = '';
    else if (sh.clear === 'destiny') ch.destiny = '';
    else if (sh.clear === 'feat') delete ch.feats[sh.featSlot];
    else if (sh.clear === 'power') {
      if (sh.slotKey === 'dilettante') ch.dilettante = '';
      else if (sh.book) delete ch.spellbook[sh.slotKey];
      else delete ch.powers[sh.slotKey];
    }
    UI.closeAll(); commit();
  },

  /* powers */
  powerFilter: el => { S.powerFilter = el.dataset.val; render(); },
  togglePower: el => { const k = el.dataset.key; S.open[k] = !S.open[k]; if (UI.sheets.length) UI.refresh(); render(); },
  toggleUse: el => {
    const pl = cur().play, k = el.dataset.key, i = +el.dataset.i, used = pl.used[k] || 0;
    pl.used[k] = i < used ? i : i + 1;
    if (!pl.used[k]) delete pl.used[k];
    commit();
  },
  cycleUse: el => {
    const pl = cur().play, k = el.dataset.key, n = +el.dataset.n, used = pl.used[k] || 0;
    pl.used[k] = used >= n ? 0 : used + 1;
    if (!pl.used[k]) delete pl.used[k];
    commit();
  },
  pastePower: el => {
    if (el.dataset.pid) {
      const p = D4.powers[el.dataset.pid];
      openPaste({ kind: 'power', override: p && !p.user ? p.id : null, url: D4.lookupUrl('power', p ? p.n : '') });
    } else openPaste({ kind: 'power', slot: el.dataset.slot, book: !!el.dataset.book, url: D4.lookupBase + '?list.full.power' });
  },
  pasteFeat: el => openPaste({ kind: 'feat', slot: el.dataset.slot, url: D4.lookupBase + '?list.full.feat' }),
  pasteItem: () => openPaste({ kind: 'item', url: D4.lookupBase + '?list.full.item' }),
  clipPaste: () => {
    const sh = topSheet();
    if (!navigator.clipboard || !navigator.clipboard.readText) { toast('Long-press the box and choose Paste.'); return; }
    navigator.clipboard.readText().then(t => { sh.text = t; sh.parsed = D4.parseEntry(t); UI.refresh(); }, () => toast('Long-press the box and choose Paste.'));
  },
  readPaste: () => {
    const sh = topSheet(), box = document.querySelector('.layer:last-child [data-pastebox]');
    if (box) sh.text = box.value;
    const p = D4.parseEntry(sh.text);
    if (!p) { toast('Paste the entry text first.'); return; }
    if (sh.target.kind === 'power' && p.kind !== 'power') toast('That doesn\'t look like a power, but you can still save it.');
    if (sh.target.kind === 'power' && sh.target.slot && !p.u) { const s = S.c.powerSlots.find(x => x.id === sh.target.slot); if (s && s.use !== 'util') p.u = s.use; if (s && s.use === 'util') p.ty = 'util'; }
    if (sh.target.override) { const o = D4.powers[sh.target.override]; p.cls = p.cls || o.cls; p.l = p.l || o.l; p.u = p.u || o.u; p.ty = p.ty || o.ty; }
    sh.parsed = p;
    UI.refresh();
  },
  savePaste: () => savePaste(),
  delUser: el => {
    const kind = el.dataset.kind, id = el.dataset.id;
    confirmSheet('Delete this pasted entry?', 'Characters that use it will show it as missing until you paste it again.', 'Delete', () => {
      delete D4.userdb[kind][id];
      const table = { powers: D4.powers, feats: D4.feats, items: D4.items }[kind];
      if (table && table[id]) { if (table[id]._orig) table[id] = table[id]._orig; else delete table[id]; }
      D4.saveUserDB();
      S.comp.open = null;
      renderAll();
    }, true);
  },

  /* sheet tab */
  abilInfo: el => {
    const a = el.dataset.ab, c = S.c;
    UI.open({ title: D4.ABIL[a].name + ' ' + c.score[a] + ' (' + D4.fmt(c.mod[a]) + ')', body: () => '<p>' + linkify(D4.ABIL[a].desc) + '</p><div class="card"><dl class="kv">' + c.abilParts[a].map(p => '<dt>' + esc(p.l) + '</dt><dd>' + (p.l === 'Base' ? p.v : D4.fmt(p.v)) + '</dd>').join('') + '<dt><b>Score</b></dt><dd>' + c.score[a] + '</dd><dt>Modifier</dt><dd>' + D4.fmt(c.mod[a]) + '</dd><dt>Ability check (mod + ½ level)</dt><dd>' + D4.fmt(c.mod[a] + c.half) + '</dd></dl></div>' });
  },
  skillInfo: el => {
    const s = el.dataset.skill, c = S.c, sk = D4.SKILLS[s];
    UI.open({ title: sk.name + ' ' + D4.fmt(c.skills[s].v), body: () => '<p>' + linkify(sk.desc) + '</p>' + (sk.armor ? '<p class="small muted">Armor check penalties apply to this skill.</p>' : '') + '<div class="card"><dl class="kv">' + (c.parts['skill:' + s] || []).map(p => '<dt>' + esc(p.l) + '</dt><dd>' + D4.fmt(p.v) + '</dd>').join('') + '<dt><b>Total</b></dt><dd>' + D4.fmt(c.skills[s].v) + '</dd></dl></div>' + ((c.sit['skill:' + s] || []).length ? '<p class="small">Sometimes: ' + esc(c.sit['skill:' + s].map(x => D4.fmt(x.v) + ' ' + x.note).join('; ')) + '</p>' : '') + '<p>' + extLink(D4.lookupUrl('glossary', sk.name), 'Full rules text') + '</p>' });
  },
  addMod: el => addModSheet(el.dataset.uid),
  saveMod: () => {
    const sh = topSheet(), d = sh.draft;
    if (!+d.v) { toast('Enter an amount.'); return; }
    const m = { t: d.t, v: +d.v, type: d.type, note: d.note, on: true };
    if (sh.uid) { const i = findItem(sh.uid); i.mods = (i.mods || []).concat([m]); } else cur().mods = (cur().mods || []).concat([m]);
    UI.close(); commit();
  },
  toggleMod: el => { const m = cur().mods[+el.dataset.i]; m.on = m.on === false; commit(); },
  delMod: el => { cur().mods.splice(+el.dataset.i, 1); commit(); },

  /* gear */
  addItem: () => addItem(),
  customItem: () => customItem(),
  saveCustomItem: () => {
    const d = topSheet().draft;
    if (!d.n.trim()) { toast('Give the item a name.'); return; }
    cur().inv.push({ uid: D4.uid(), id: 'custom', custom: { n: d.n.trim(), kind: 'gear', wt: +d.wt || 0, price: +d.price || 0, desc: d.desc }, name: d.n.trim(), qty: 1, eq: false });
    UI.closeAll(); commit();
  },
  editItem: el => editItem(el.dataset.uid),
  itemQty: el => { const i = findItem(el.dataset.uid); i.qty = Math.max(1, (+i.qty || 1) + +el.dataset.d); commit(); },
  itemEnh: el => {
    const i = findItem(el.dataset.uid), b = D4.items[i.id] || {};
    const min = b.min || (b.kind === 'magic' && b.levels ? 1 : 0);
    i.enh = Math.max(min, Math.min(6, (+i.enh || 0) + +el.dataset.d));
    if (i.enh && !i.magic && ['weapon', 'armor', 'implement'].includes(b.kind)) i.magic = 'magic-' + b.kind;
    if (!i.enh && i.magic && D4.items[i.magic] && D4.items[i.magic].id.startsWith('magic-')) i.magic = '';
    commit();
  },
  delItemMod: el => { const i = findItem(el.dataset.uid); i.mods.splice(+el.dataset.i, 1); commit(); },
  delItem: el => { const uid = el.dataset.uid; const it = findItem(uid); confirmSheet('Remove item?', 'Remove ' + D4.itemName(it) + ' from your inventory?', 'Remove', () => { cur().inv = cur().inv.filter(x => x.uid !== uid); UI.closeAll(); commit(); }, true); },

  /* play */
  hpInput: el => hpInput(el.dataset.mode),
  hpQuick: el => { const sh = topSheet(); sh.val = String((+sh.val || 0) + +el.dataset.n); const inp = document.querySelector('.layer:last-child [data-hpval]'); if (inp) inp.value = sh.val; },
  hpApply: () => { const sh = topSheet(); const inp = document.querySelector('.layer:last-child [data-hpval]'); const v = inp ? inp.value : sh.val; UI.close(); applyHP(sh.mode, v); },
  deathFail: el => { const pl = cur().play, i = +el.dataset.i; pl.deathFails = i < pl.deathFails ? i : i + 1; commit(); },
  surgeAdj: el => { const pl = cur().play; pl.surgesUsed = Math.max(0, Math.min(S.c.surges, pl.surgesUsed + +el.dataset.d)); commit(); },
  apAdj: el => { const pl = cur().play; pl.ap = Math.max(0, pl.ap + +el.dataset.d); commit(); },
  spendSurge: () => { const pl = cur().play; if (pl.surgesUsed >= S.c.surges) return; pl.surgesUsed++; applyHP('heal', S.c.surgeValue); },
  secondWind: () => {
    const pl = cur().play;
    if (pl.secondWind || pl.surgesUsed >= S.c.surges) return;
    pl.secondWind = true; pl.surgesUsed++;
    const extra = S.c.hasFeat('improved-second-wind') ? 5 : 0;
    applyHP('heal', S.c.surgeValue + extra);
    toast('Second wind: regained ' + (S.c.surgeValue + extra) + ' HP and +2 to all defenses until the start of your next turn.');
  },
  addCond: () => {
    UI.open({
      title: 'Add a condition',
      body: () => '<ul class="plist">' + Object.entries(D4.GLOSSARY).filter(([k, g]) => g.cat === 'Condition').concat([['Bloodied', D4.GLOSSARY.Bloodied], ['combat advantage', { desc: 'You grant combat advantage (for example while flanked).' }]])
        .map(([k, g]) => '<li class="pitem"><button class="pi-head" data-act="addCondName" data-val="' + esc(k) + '"><span class="pi-main"><span class="pi-name">' + esc(k.charAt(0).toUpperCase() + k.slice(1)) + '</span><span class="pi-sum">' + esc(g.desc) + '</span></span></button></li>').join('') + '</ul>' +
        '<label class="field"><span>Something else</span><input data-dbind="other" placeholder="e.g. Hunter\'s quarry, -2 to attacks"></label><button class="btn" data-act="addCondName" data-val="">Add</button>',
      draft: { other: '' },
    });
  },
  addCondName: el => {
    const sh = topSheet(), name = el.dataset.val || (sh.draft && sh.draft.other || '').trim();
    if (!name) { toast('Type the condition first.'); return; }
    cur().play.conds.push({ name, note: '' });
    UI.close(); commit();
  },
  delCond: el => { cur().play.conds.splice(+el.dataset.i, 1); commit(); },
  rest: el => {
    const pl = cur().play, k = el.dataset.kind, c = S.c;
    if (k === 'milestone') { pl.ap++; commit(); toast('Milestone: +1 action point.'); return; }
    const isDaily = key => { const x = c.powers.find(p => p.id === key); const p = x ? x.p : D4.powers[key]; return (x && x.useOverride) ? x.useOverride === 'day' : p ? (p.u === 'day' || p.usesPer === 'day') : false; };
    if (k === 'short') {
      Object.keys(pl.used).forEach(key => { if (!isDaily(key)) delete pl.used[key]; });
      pl.secondWind = false; pl.temp = 0; pl.deathFails = 0;
      pl.conds = pl.conds.filter(cd => !['Marked', 'Dazed', 'Slowed', 'Immobilized', 'Stunned', 'Weakened', 'Blinded', 'Deafened', 'Prone', 'Grabbed', 'Restrained', 'Surprised'].includes(cd.name));
      commit(); toast('Short rest: encounter powers and second wind recharged. Spend healing surges on the Play tab if you need them.');
    } else {
      confirmSheet('Take an extended rest?', 'You regain all hit points, healing surges and daily powers, and your action points reset to 1.', 'Rest', () => {
        Object.assign(pl, { hp: null, temp: 0, surgesUsed: 0, ap: 1, deathFails: 0, secondWind: false, used: {}, conds: [], ongoing: '' });
        commit(); toast('Extended rest: fully recovered.');
      });
    }
  },

  /* character menu and data */
  exportChar: () => { const ch = cur(); saveNow(); download((ch.name || 'character').replace(/[^\w-]+/g, '_') + '.paragon.json', JSON.stringify(ch, null, 1)); },
  copyChar: () => { saveNow(); copyText(JSON.stringify(cur()), 'Character copied. Paste it into Import on another device.'); },
  dupChar: () => {
    saveNow();
    const ch = JSON.parse(JSON.stringify(cur()));
    ch.id = D4.newCharacter().id; ch.name = (ch.name || 'Unnamed hero') + ' (copy)'; ch.created = ch.updated = Date.now();
    S.chars[ch.id] = ch; Store.set('char.' + ch.id, ch); updateIndex(ch);
    UI.closeAll(); openChar(ch.id); toast('Duplicated.');
  },
  delChar: () => {
    const ch = cur();
    confirmSheet('Delete ' + (ch.name || 'this character') + '?', 'This removes the character from this device. Export it first if you want to keep a copy.', 'Delete', () => {
      Store.del('char.' + ch.id);
      delete S.chars[ch.id];
      S.index = S.index.filter(e => e.id !== ch.id);
      Store.set('index', S.index);
      UI.sheets.length = 0;
      S.cur = null; S.c = null; S.view = 'home';
      renderAll();
      toast('Deleted.');
    }, true);
  },
  theme: el => { S.settings.theme = el.dataset.val; Store.set('settings', S.settings); renderAll(); },
  exportAll: () => download('paragon-backup.json', JSON.stringify({ app: 'paragon4e', characters: S.index.map(e => S.chars[e.id]).filter(Boolean), userdb: D4.userdb }, null, 1)),
  loadSample: () => { const s = sampleCharacter(); S.chars[s.id] = s; Store.set('char.' + s.id, s); updateIndex(s); UI.closeAll(); renderAll(); toast('Sample character added.'); },
  wipe: () => confirmSheet('Delete everything?', 'All characters and pasted entries on this device will be deleted. This can\'t be undone.', 'Delete everything', () => {
    S.index.forEach(e => Store.del('char.' + e.id));
    S.index = []; S.chars = {}; Store.set('index', []); Store.del('userdb');
    D4.userdb = { powers: {}, feats: {}, items: {}, paths: {}, destinies: {}, text: {} };
    UI.sheets.length = 0; S.view = 'home'; S.cur = null; renderAll();
  }, true),
  importText: () => {
    const box = document.querySelector('.layer:last-child [data-pastebox]');
    if (box && importData(box.value)) { UI.closeAll(); renderAll(); }
  },
};

function refreshPicker(sh) {
  const el = document.querySelector('.layer:last-child .pk-list');
  if (el && sh.list) el.innerHTML = sh.list(); else UI.refresh();
}

/* Custom class and race editors */
function editCustomClass() {
  UI.open({
    title: 'Custom class', full: true,
    body: () => {
      const cc = cur().custom.cls;
      const tog = (field, vals, names) => '<div class="chips wrap">' + vals.map((v, i) => '<button class="chip" data-act="ccToggle" data-obj="cls" data-field="' + field + '" data-val="' + esc(v) + '" aria-pressed="' + (cc[field] || []).includes(v) + '">' + esc(names ? names[i] : v) + '</button>').join('') + '</div>';
      const inp = (k, label, num) => '<label class="field"><span>' + label + '</span><input ' + (num ? 'inputmode="numeric" data-num="1" ' : '') + 'data-bind="custom.cls.' + k + '" value="' + esc(cc[k]) + '"></label>';
      return '<div class="note-box">For Essentials, Player\'s Handbook 3, hybrids or homebrew. Look the class up on the ' + extLink(D4.lookupBase + '?list.full.class', '4e Database') + ' and copy its numbers here.</div>' +
        inp('name', 'Class name') + '<div class="grid2">' + inp('role', 'Role') + inp('source', 'Power source') + '</div>' +
        '<div class="grid3">' + inp('hp1', 'HP at 1st', 1) + inp('hpLvl', 'HP per level', 1) + inp('surges', 'Surges/day', 1) + '</div>' +
        '<div class="grid3">' + ['Fort', 'Ref', 'Will'].map(d => '<label class="field"><span>+' + d + '</span><input inputmode="numeric" data-num="1" data-bind="custom.cls.def.' + d + '" value="' + esc(cc.def[d]) + '"></label>').join('') + '</div>' +
        inp('choose', 'Trained skills to choose', 1) +
        '<div class="label">Class skills</div>' + tog('list', Object.keys(D4.SKILLS), Object.values(D4.SKILLS).map(s => s.name)) +
        '<div class="label" style="margin-top:8px">Armor</div>' + tog('armor', ['cloth', 'leather', 'hide', 'chainmail', 'scale', 'plate']) +
        '<div class="label" style="margin-top:8px">Shields</div>' + tog('shields', ['light', 'heavy']) +
        '<div class="label" style="margin-top:8px">Weapons</div>' + tog('weapons', Object.keys(D4.WEAPON_CATS), Object.values(D4.WEAPON_CATS)) +
        '<div class="label" style="margin-top:8px">Implements</div>' + tog('implements', D4.IMPLEMENTS) +
        '<label class="field" style="margin-top:12px"><span>Class features (paste or write)</span><textarea data-bind="custom.cls.features">' + esc(cc.features) + '</textarea></label>';
    },
    foot: () => '<button class="btn primary" data-act="closeAllCommit">Done</button>',
  });
}
function editCustomRace() {
  UI.open({
    title: 'Custom race', full: true,
    body: () => {
      const r = cur().custom.race;
      const one = (field, vals, names) => '<div class="chips wrap">' + vals.map((v, i) => '<button class="chip" data-act="ccToggle" data-obj="race" data-field="' + field + '" data-val="' + esc(v) + '" aria-pressed="' + (r[field] === v) + '">' + esc(names ? names[i] : v) + '</button>').join('') + '</div>';
      return '<div class="note-box">Look the race up on the ' + extLink(D4.lookupBase + '?list.full.race', '4e Database') + ' and copy its numbers here.</div>' +
        '<label class="field"><span>Race name</span><input data-bind="custom.race.name" value="' + esc(r.name) + '"></label>' +
        '<div class="grid2"><label class="field"><span>Speed</span><input inputmode="numeric" data-num="1" data-bind="custom.race.speed" value="' + esc(r.speed) + '"></label><label class="field"><span>Vision</span><select data-bind="custom.race.vision">' + ['Normal', 'Low-light', 'Darkvision'].map(v => '<option' + (r.vision === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label></div>' +
        '<div class="label">Size</div>' + one('size', ['small', 'medium', 'large'], ['Small', 'Medium', 'Large']) +
        '<div class="label" style="margin-top:8px">First +2 ability</div>' + one('abil1', D4.ABILS, D4.ABILS.map(a => D4.ABIL[a].name)) +
        '<div class="label" style="margin-top:8px">Second +2 ability</div>' + one('abil2', D4.ABILS, D4.ABILS.map(a => D4.ABIL[a].name)) +
        '<div class="label" style="margin-top:8px">First +2 skill</div>' + one('skill1', Object.keys(D4.SKILLS), Object.values(D4.SKILLS).map(s => s.name)) +
        '<div class="label" style="margin-top:8px">Second +2 skill</div>' + one('skill2', Object.keys(D4.SKILLS), Object.values(D4.SKILLS).map(s => s.name)) +
        '<label class="field" style="margin-top:12px"><span>Racial traits (paste or write)</span><textarea data-bind="custom.race.traits">' + esc(r.traits) + '</textarea></label>';
    },
    foot: () => '<button class="btn primary" data-act="closeAllCommit">Done</button>',
  });
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  try { fn(el, e); } catch (err) { console.error(err); toast('Something went wrong: ' + err.message); }
});

function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) o[keys[i]] = {}; o = o[keys[i]]; }
  o[keys[keys.length - 1]] = val;
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.bind && S.cur) {
    const v = el.dataset.num ? (el.value === '' ? '' : +el.value) : el.value;
    if (el.dataset.num && el.value !== '' && isNaN(v)) return;
    setPath(S.cur, el.dataset.bind, v);
    S.c = D4.calc(S.cur);
    save();
    if (el.dataset.bind === 'name') { const t = document.querySelector('.topbar .title b'); if (t) t.textContent = el.value || 'Unnamed hero'; }
    return;
  }
  if (el.dataset.search === 'comp') { S.comp.q = el.value; S.comp.open = null; $('#comp-list').innerHTML = compList(); return; }
  if (el.dataset.search === 'picker') { const sh = topSheet(); sh.q = el.value; sh.open = null; refreshPicker(sh); return; }
  if (el.dataset.pbind) { const sh = topSheet(); if (sh.parsed) sh.parsed[el.dataset.pbind] = el.value; return; }
  if (el.dataset.dbind) { const sh = topSheet(); if (sh.draft) sh.draft[el.dataset.dbind] = el.value; return; }
  if (el.dataset.pastebox) { const sh = topSheet(); if (sh) sh.text = el.value; return; }
  if (el.dataset.hpval) { const sh = topSheet(); if (sh) sh.val = el.value; }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.bind && S.cur) { if (el.tagName === 'SELECT') { render(); if (UI.sheets.length) UI.refresh(); } return; }
  if (el.dataset.pbind || el.dataset.dbind) { if (el.tagName === 'SELECT') { const sh = topSheet(); (el.dataset.pbind ? sh.parsed : sh.draft)[el.dataset.pbind || el.dataset.dbind] = el.value; if (el.dataset.pbind) UI.refresh(); } return; }
  const k = el.dataset.change;
  if (!k) return;
  const ch = S.cur;
  if (k === 'abilArray') {
    const a = el.dataset.ab, v = +el.value, other = D4.ABILS.find(x => x !== a && +ch.base[x] === v);
    if (other) ch.base[other] = ch.base[a];
    ch.base[a] = v;
    commit();
  } else if (k === 'abilManual') { ch.base[el.dataset.ab] = Math.max(3, Math.min(20, +el.value || 10)); commit(); }
  else if (k === 'toggleSkill') {
    const s = el.dataset.skill;
    ch.skills = el.checked ? ch.skills.concat([s]) : ch.skills.filter(x => x !== s);
    const need = S.c.cls ? S.c.cls.skills.choose : 0;
    if (ch.skills.length > need) { ch.skills.shift(); toast('You can choose ' + need + '; the first one was unticked.'); }
    commit();
  } else if (k === 'itemEq') {
    const i = findItem(el.dataset.uid), b = D4.items[i.id];
    i.eq = el.checked;
    if (i.eq && b && ['armor', 'shield'].includes(b.kind)) ch.inv.forEach(x => { if (x !== i && x.eq && D4.items[x.id] && D4.items[x.id].kind === b.kind) x.eq = false; });
    commit();
  } else if (k === 'itemMagic') { const i = findItem(el.dataset.uid); i.magic = el.value; if (el.value && !+i.enh) i.enh = 1; commit(); }
  else if (k === 'itemName') { findItem(el.dataset.uid).name = el.value.trim(); S.c = D4.calc(ch); save(); render(); }
  else if (k === 'itemNotes') { findItem(el.dataset.uid).notes = el.value; save(); }
  else if (k === 'importFile') {
    const f = el.files && el.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { if (importData(String(rd.result))) { UI.closeAll(); renderAll(); } };
    rd.readAsText(f);
  }
});

window.addEventListener('popstate', () => {
  Nav.armed = false;
  if (UI.sheets.length) { UI.sheets.pop(); renderSheets(); }
  else if (S.view !== 'home') goHome();
  if (UI.sheets.length || S.view !== 'home') Nav.arm();
});
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
if (window.matchMedia) { const mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyTheme); }

/* ---------- start ---------- */
(function start() {
  D4.loadUserDB();
  loadAll();
  renderAll();
  window.__STARTED = true;
})();
