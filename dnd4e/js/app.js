/* Paragon: screens and actions. */
'use strict';

const S = {
  view: 'home', tab: 'build', cur: null, c: null,
  settings: { theme: 'system' },
  index: [], chars: {},
  open: {}, powerFilter: 'all', scroll: {},
  comp: { tab: 'races', q: '', open: null, cls: '' },
};
const TABS = [['build', 'Build', IC.build], ['sheet', 'Sheet', IC.sheet], ['powers', 'Powers', IC.powers], ['gear', 'Gear', IC.bag], ['play', 'Play', IC.heart]];

/* ---------- persistence ---------- */
let saveTimer = null;
function saveNow() {
  clearTimeout(saveTimer);
  if (!S.cur) return;
  S.cur.updated = Date.now();
  S.chars[S.cur.id] = S.cur;
  Store.set('char.' + S.cur.id, S.cur);
  updateIndex(S.cur);
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
function updateIndex(ch) {
  const c = ch === S.cur && S.c ? S.c : D4.calc(JSON.parse(JSON.stringify(ch)));
  const entry = { id: ch.id, name: ch.name, level: ch.level, race: c.race ? c.race.name : '', cls: c.cls ? c.cls.name : '', role: c.cls ? c.cls.role : '', hp: c.hp, ac: c.def.AC, updated: ch.updated };
  const i = S.index.findIndex(x => x.id === ch.id);
  if (i >= 0) S.index[i] = entry; else S.index.unshift(entry);
  Store.set('index', S.index);
}
function loadAll() {
  S.settings = Object.assign({ theme: 'system' }, Store.get('settings', {}));
  const idx = Store.get('index', null);
  if (idx === null) {
    const sample = sampleCharacter();
    S.chars[sample.id] = sample;
    S.index = [];
    Store.set('char.' + sample.id, sample);
    updateIndex(sample);
    return;
  }
  S.index = idx;
  idx.forEach(e => { const ch = Store.get('char.' + e.id, null); if (ch) S.chars[e.id] = D4.normalize(ch); });
  S.index = S.index.filter(e => S.chars[e.id]);
}
function commit() { if (S.cur) S.c = D4.calc(S.cur); save(); renderAll(); }

/* ---------- rendering ---------- */
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
}
const viewKey = () => S.view + (S.view === 'char' ? ':' + S.tab : S.view === 'comp' ? ':' + S.comp.tab : '');
let lastKey = null;
function render() {
  applyTheme();
  const key = viewKey();
  if (lastKey && lastKey !== key) S.scroll[lastKey] = window.scrollY;
  const html = S.view === 'char' && S.cur ? viewChar() : S.view === 'comp' ? viewCompendium() : viewHome();
  const y = lastKey === key ? window.scrollY : (S.scroll[key] || 0);
  $('#app').innerHTML = html;
  window.scrollTo(0, y);
  lastKey = key;
}
function renderAll() { render(); renderSheets(); }

function topbar(left, title, sub, right) {
  return '<header class="topbar">' + left + '<div class="title">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + (right || '') + '</header>';
}

/* ---------- home ---------- */
function viewHome() {
  const cards = S.index.map(e => '<button class="charcard" data-act="openChar" data-id="' + esc(e.id) + '">' +
    '<span class="sigil ' + esc(e.role || '') + '">' + esc((e.name || '?').trim().charAt(0).toUpperCase() || '?') + '</span>' +
    '<span class="cm"><span class="cn">' + esc(e.name || 'Unnamed hero') + '</span><span class="cs">Level ' + e.level + ' ' + esc([e.race, e.cls].filter(Boolean).join(' ') || 'character') + '</span>' +
    '<span class="cx">' + (e.cls ? 'HP ' + e.hp + ' · AC ' + e.ac : 'Not finished') + '</span></span>' + IC.chev + '</button>').join('');
  return topbar('', '<b class="wordmark">Paragon</b>', 'D&amp;D 4th Edition character builder',
    '<button class="iconbtn" data-act="settings" aria-label="Settings">' + IC.gear + '</button>') +
    '<main class="no-tabs">' +
    '<div class="row-gap" style="margin:4px 0 14px"><button class="btn primary" data-act="newChar">' + IC.plus + 'New character</button><button class="btn" data-act="importChar">Import</button></div>' +
    (S.index.length ? '<div class="charlist">' + cards + '</div>' : '<div class="card"><div class="pad"><p style="margin-top:10px">No characters yet. Tap New character to start: choose a race, a class, ability scores, skills, feats and powers, level by level.</p></div></div>') +
    (!Store.ok ? '<div class="todo-box"><b>This browser isn\'t saving.</b> Private browsing or blocked storage stops characters being kept. Use Export in each character\'s menu to keep a copy.</div>' : '') +
    '<h2 class="sec-title">Compendium</h2><div class="navgrid">' +
    [['races', 'Races', '13 races with traits and racial powers'], ['classes', 'Classes', 'Features, proficiencies and builds'], ['powers', 'Powers', Object.keys(D4.powers).length + ' powers, class features'],
      ['feats', 'Feats', Object.keys(D4.feats).length + ' feats with prerequisites'], ['items', 'Equipment', 'Weapons, armor, gear, magic items'], ['rules', 'Rules', 'Conditions, actions and terms']]
      .map(([t, n, d]) => '<button data-act="comp" data-tab="' + t + '"><b>' + n + '</b><span>' + d + '</span></button>').join('') + '</div>' +
    '<p class="small muted">Descriptions are short summaries written for this app. Tap Full text on any entry to open the official wording on the ' + extLink(D4.lookupBase + '?list', '4e Database') + '.</p>' +
    '</main>';
}

/* ---------- character screen ---------- */
function charSub(c) {
  const ch = c.ch;
  return 'Level ' + c.lvl + ' ' + esc([c.race ? c.race.name : '', c.cls ? c.cls.name : ''].filter(Boolean).join(' ') || 'character') +
    (ch.build && c.cls && c.cls.builds && c.cls.builds[ch.build] ? ' · ' + esc(c.cls.builds[ch.build].name) : '');
}
function viewChar() {
  const c = S.c, ch = S.cur;
  const cur = D4.curHP(c);
  const strip = '<div class="strip">' +
    ['AC', 'Fort', 'Ref', 'Will'].map(d => '<button data-act="breakdown" data-key="' + d + '"><b>' + c.def[d] + '</b><span>' + d + '</span></button>').join('') +
    '<button class="hpcell' + (cur <= c.bloodied ? ' bloodied' : '') + '" data-act="tab" data-tab="play"><b class="num">' + cur + '/' + c.hp + '</b><span>HP</span></button>' +
    '<button data-act="breakdown" data-key="speed"><b>' + c.speed + '</b><span>Speed</span></button></div>';
  const body = { build: viewBuild, sheet: viewSheet, powers: viewPowers, gear: viewGear, play: viewPlay }[S.tab]();
  return topbar('<button class="iconbtn" data-act="home" aria-label="All characters">' + IC.back + '</button>',
    '<b>' + esc(ch.name || 'Unnamed hero') + '</b>', charSub(c),
    '<button class="iconbtn" data-act="charMenu" aria-label="Character menu">' + IC.more + '</button>') +
    '<main>' + (c.cls ? strip : '') + body + '</main>' +
    '<nav class="tabbar" aria-label="Character sections">' + TABS.map(([t, n, ic]) => '<button data-act="tab" data-tab="' + t + '"' + (S.tab === t ? ' aria-current="page"' : '') + '>' + ic + n + '</button>').join('') + '</nav>';
}

/* A tappable row in a list */
function row(act, attrs, label, value, sub, warn, extra) {
  const a = Object.entries(attrs || {}).map(([k, v]) => ' data-' + k + '="' + esc(v) + '"').join('');
  return '<li><button class="rowbtn" data-act="' + act + '"' + a + '>' +
    '<span class="dot' + (value ? '' : ' todo') + '"></span><span class="rmain"><span class="rlabel">' + esc(label) + '</span>' +
    '<span class="rval' + (value ? '' : ' empty') + '">' + (value ? esc(value) : 'Choose') + '</span>' +
    (sub ? '<span class="rsub">' + sub + '</span>' : '') + (warn ? '<span class="rwarn">' + esc(warn) + '</span>' : '') + '</span>' + (extra || '') + IC.chev.replace('<svg', '<svg class="chev"') + '</button></li>';
}
function optChips(act, attrs, opts, current, label) {
  const a = Object.entries(attrs || {}).map(([k, v]) => ' data-' + k + '="' + esc(v) + '"').join('');
  return '<li><div class="inline-opts"><div class="label" style="padding:10px 0 6px">' + esc(label) + '</div><div class="chips wrap">' +
    Object.entries(opts).map(([k, n]) => '<button class="chip" data-act="' + act + '"' + a + ' data-val="' + esc(k) + '" aria-pressed="' + (Array.isArray(current) ? current.includes(k) : current === k) + '">' + esc(n) + '</button>').join('') + '</div></div></li>';
}

/* ---------- Build tab ---------- */
function viewBuild() {
  const c = S.c, ch = S.cur, r = c.race, cl = c.cls;
  let out = '';
  if (c.todo.length) out += '<div class="todo-box"><b>' + plural(c.todo.length, 'choice') + ' left</b><ul>' + c.todo.slice(0, 5).map(t => '<li>' + esc(t) + '</li>').join('') + (c.todo.length > 5 ? '<li>and ' + (c.todo.length - 5) + ' more below</li>' : '') + '</ul></div>';
  c.issues.forEach(i => { out += '<p class="issue">' + esc(i) + '</p>'; });
  for (let L = 1; L <= c.lvl; L++) {
    const rows = buildRows(L);
    if (!rows) continue;
    out += '<section class="card lvl" id="lvl-' + L + '"><div class="lvl-head"><span class="lvl-num">' + L + '</span><span class="label">Level ' + L + (L === 11 ? ' · paragon tier' : L === 21 ? ' · epic tier' : '') + '</span><span class="muted small num">' + D4.XP[L].toLocaleString() + ' XP</span></div><ul class="rows">' + rows + '</ul></section>';
  }
  out += '<section class="card"><h2>Level</h2><div class="pad"><div class="row-gap" style="align-items:center">' +
    '<span class="stepper"><button data-act="level" data-d="-1" aria-label="Lower level"' + (c.lvl <= 1 ? ' disabled' : '') + '>−</button><b>' + c.lvl + '</b><button data-act="level" data-d="1" aria-label="Raise level"' + (c.lvl >= 30 ? ' disabled' : '') + '>+</button></span>' +
    '<label class="field" style="margin:0;flex:1;min-width:140px"><span>Experience points</span><input class="num" inputmode="numeric" data-bind="xp" data-num="1" value="' + esc(ch.xp) + '"></label></div>' +
    (c.lvl < 30 ? '<p class="small muted" style="margin-top:8px">Level ' + (c.lvl + 1) + ' at ' + D4.XP[c.lvl + 1].toLocaleString() + ' XP. ' + (+ch.xp >= D4.XP[c.lvl + 1] ? '<b>You have enough XP to level up.</b>' : '') + '</p>' : '') +
    (c.lvl < 30 ? '<button class="btn primary block" data-act="level" data-d="1" style="margin-top:6px">Level up to ' + (c.lvl + 1) + '</button>' : '') + '</div></section>';
  out += detailsCard();
  return out;
}

function buildRows(L) {
  const c = S.c, ch = S.cur, r = c.race, cl = c.cls;
  let h = '';
  if (L === 1) {
    h += row('pickRace', {}, 'Race', r ? r.name : '', r ? esc(D4.SIZES[r.size] + ', speed ' + r.speed + ', ' + r.vision.toLowerCase() + ' vision') : 'Your people: ability bonuses, skills and racial powers');
    if (ch.race === 'custom') h += row('editCustomRace', {}, 'Custom race details', ch.custom.race.name || '', 'Name, ability bonuses, skills, speed and traits');
    if (r && (r.abil.choice || r.abil.any)) {
      const opts = {};
      (r.abil.any ? D4.ABILS : r.abil.choice).forEach(a => { opts[a] = '+2 ' + D4.ABIL[a].name; });
      h += optChips('setRaceAbil', {}, opts, ch.raceAbil, r.abil.any ? 'Racial bonus: +2 to one ability' : 'Racial bonus: choose your second +2');
    }
    if (r && r.choices) r.choices.forEach(o => { h += optChips('setRaceOpt', { key: o.id }, o.opts, ch.raceOpt[o.id], o.label); });
    if (r && r.bonusSkill) h += row('pickRaceSkill', {}, r.bonusSkill === 'class' ? 'Human bonus skill (from your class list)' : r.name + ' bonus skill (any skill)', ch.raceSkill ? D4.SKILLS[ch.raceSkill].name : '', 'Trained in one more skill');
    if (r && r.dilettante) h += row('pickPower', { slot: 'dilettante' }, 'Dilettante power', ch.dilettante && D4.powers[ch.dilettante] ? D4.powers[ch.dilettante].n : '', 'An at-will attack from another class, usable once per encounter');
    h += row('pickClass', {}, 'Class', cl ? cl.name : '', cl ? esc(cl.role + ' · ' + cl.source) : 'Your role in the party and your powers');
    if (ch.cls === 'custom') h += row('editCustomClass', {}, 'Custom class details', ch.custom.cls.name || '', 'Hit points, defenses, skills, proficiencies and features');
    if (cl && cl.options) cl.options.forEach(o => {
      h += optChips('setClsOpt', { key: o.id }, Object.fromEntries(Object.entries(o.opts).map(([k, v]) => [k, v.name])), ch.clsOpt[o.id], o.label);
      const sel = o.opts[ch.clsOpt[o.id]];
      if (sel) h += '<li><p class="small" style="padding:0 14px 10px;margin:0;color:var(--ink-2)">' + linkify(sel.desc) + '</p></li>';
    });
    if (cl && cl.builds) h += optChips('setBuild', {}, Object.fromEntries(Object.entries(cl.builds).map(([k, v]) => [k, v.name])), ch.build, 'Suggested build (optional)') +
      (ch.build && cl.builds[ch.build] ? '<li><p class="small" style="padding:0 14px 10px;margin:0;color:var(--ink-2)">Put your best scores in ' + esc(cl.builds[ch.build].abil) + '. ' + esc(cl.builds[ch.build].desc) + '</p></li>' : '');
    const pc = D4.pointCost(ch.base);
    h += row('editAbilities', {}, 'Ability scores', D4.ABILS.map(a => D4.ABIL[a].short + ' ' + c.score[a]).join(' · '),
      esc(ch.abilMethod === 'pointbuy' ? 'Point buy: ' + pc.spent + ' of ' + pc.budget + ' points' : ch.abilMethod === 'array' ? 'Standard array' : 'Rolled or entered by hand'),
      c.issues.find(i => i.startsWith('Point buy')) || '');
    if (cl) {
      const tr = [...c.trained].map(s => D4.SKILLS[s].name).sort();
      const need = c.skillInfo.need - c.skillInfo.chosen;
      h += row('editSkills', {}, 'Trained skills', tr.join(', '), '', need > 0 ? 'Choose ' + need + ' more' : (c.skillInfo.oneOf && !c.skillInfo.oneOf.includes(ch.skillOneOf) ? 'Choose ' + c.skillInfo.oneOf.map(s => D4.SKILLS[s].name).join(' or ') : ''));
    }
    if (r) h += row('editLangs', {}, 'Languages', c.languages.join(', '), c.extraLangs ? 'Choose ' + plural(c.extraLangs, 'extra language') : '');
  }
  if (D4.ABILITY_UP_LEVELS.includes(L)) {
    const opts = {};
    D4.ABILS.forEach(a => { opts[a] = D4.ABIL[a].short + ' ' + c.score[a]; });
    h += optChips('setUp', { lvl: L }, opts, S.cur.ups[L] || [], 'Ability increase: +1 to two different scores');
  }
  if (D4.ABILITY_ALL_LEVELS.includes(L)) h += '<li><div class="rowbtn" style="cursor:default"><span class="dot"></span><span class="rmain"><span class="rlabel">Ability increase</span><span class="rval">+1 to every ability score</span></span></div></li>';
  if (L === 11) h += row('pickPath', {}, 'Paragon path', pathName(), ch.path ? 'Features at 11th and 16th level; powers at 11th, 12th and 20th' : 'A specialty that grants features and powers from 11th to 20th level');
  if (L === 21) h += row('pickDestiny', {}, 'Epic destiny', destinyName(), ch.destiny ? 'Features at 21st, 24th and 30th level; a utility power at 26th' : 'Your legendary fate, from 21st to 30th level');
  c.featSlots.filter(s => s.lvl === L).forEach(s => {
    h += row('pickFeat', { slot: s.slot }, s.slot === 'fh' ? 'Human bonus feat' : 'Feat',
      s.feat ? s.feat.n + (s.pick.choice ? ' (' + (Array.isArray(s.pick.choice) ? s.pick.choice.join(', ') : choiceName(s.feat, s.pick.choice)) + ')' : '') : '',
      s.feat ? esc(s.feat.s || '') : '', (s.issues || []).join(' '));
  });
  if (L === 1) c.bonusFeats.forEach(b => { const f = D4.feats[b.id]; if (f) h += '<li><button class="rowbtn" data-act="showFeat" data-id="' + esc(b.id) + '"><span class="dot"></span><span class="rmain"><span class="rlabel">Bonus feat (' + esc(b.src) + ')</span><span class="rval">' + esc(f.n) + '</span><span class="rsub">' + esc(f.s) + '</span></span>' + IC.chev.replace('<svg', '<svg class="chev"') + '</button></li>'; });
  c.powerSlots.filter(s => s.lvl === L).forEach(s => {
    const extra = s.replace && s.pick ? '' : '';
    h += row('pickPower', { slot: s.id }, s.label, s.power ? s.power.n : '', s.power ? esc(s.power.s || '') : '', s.issues.join(' '), extra);
    if (s.replace && s.pick) {
      const gone = new Set(c.powerSlots.filter(o => o.replace && o.lvl < s.lvl && o.replaces).map(o => o.replaces));
      const cands = c.powerSlots.filter(o => o.use === s.use && o.lvl < s.lvl && o.pick && !o.path && !o.destiny && !gone.has(o.id));
      h += '<li><div class="inline-opts"><div class="label" style="padding:10px 0 6px">It replaces</div><div class="chips wrap">' +
        cands.map(o => '<button class="chip" data-act="setReplace" data-slot="' + s.id + '" data-val="' + o.id + '" aria-pressed="' + (s.replaces === o.id) + '">' + esc(o.power ? o.power.n : o.pick) + ' <small>(' + o.lvl + ')</small></button>').join('') + '</div></div></li>';
    }
    if (s.book !== undefined) h += row('pickPower', { slot: s.id, book: 1 }, 'Spellbook: second ' + (s.use === 'day' ? 'daily' : 'utility') + ' spell', s.bookPower ? s.bookPower.n : '', 'Your spellbook holds two; you prepare one each day');
  });
  if (D4.PATH_FEATURE_LEVELS.includes(L) && ch.path) h += row('pickPath', {}, 'Paragon path feature', pathName(), 'See your path\'s features');
  if (D4.DESTINY_FEATURE_LEVELS.includes(L) && ch.destiny) h += row('pickDestiny', {}, 'Epic destiny feature', destinyName(), 'See your destiny\'s features');
  return h;
}
function pathName() { const ch = S.cur; return ch.path === 'custom' ? (ch.pathName || 'Custom path') : ch.path && D4.paths[ch.path] ? D4.paths[ch.path].n : ''; }
function destinyName() { const ch = S.cur; return ch.destiny === 'custom' ? (ch.destinyName || 'Custom destiny') : ch.destiny && D4.destinies[ch.destiny] ? D4.destinies[ch.destiny].n : ''; }
function choiceName(f, v) {
  if (!f.choice) return v;
  if (['skill', 'classSkill', 'trainedSkill'].includes(f.choice.type)) return (D4.SKILLS[v] || {}).name || v;
  if (f.choice.type === 'weapon') return (D4.items[v] || {}).n || v;
  return v;
}

function detailsCard() {
  const ch = S.cur;
  const f = (k, label, type) => '<label class="field"><span>' + label + '</span>' + (type === 'area' ? '<textarea data-bind="' + k + '">' + esc(ch[k]) + '</textarea>' : '<input data-bind="' + k + '" value="' + esc(ch[k]) + '">') + '</label>';
  return '<section class="card"><h2>Details</h2><div class="pad">' + f('name', 'Character name') + f('player', 'Player') +
    '<div class="grid2">' + f('gender', 'Gender') + f('age', 'Age') + f('height', 'Height') + f('weight', 'Weight') + '</div>' +
    '<label class="field"><span>Alignment</span><select data-bind="alignment">' + Object.keys(D4.ALIGNMENTS).map(a => '<option' + (ch.alignment === a ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></label>' +
    '<label class="field"><span>Deity</span><select data-bind="deity"><option value="">None</option>' + Object.keys(D4.DEITIES).map(d => '<option' + (ch.deity === d ? ' selected' : '') + '>' + esc(d) + '</option>').join('') + '</select></label>' +
    (ch.deity ? '<p class="small muted">' + esc(D4.DEITIES[ch.deity] || '') + '</p>' : '') +
    f('appearance', 'Appearance', 'area') + f('background', 'Background and personality', 'area') + '</div></section>';
}

/* ---------- Sheet tab ---------- */
function viewSheet() {
  const c = S.c, ch = S.cur;
  if (!c.cls) return '<div class="card"><div class="pad"><p style="margin-top:10px">Choose a race and class on the Build tab to see your character sheet.</p><button class="btn primary" data-act="tab" data-tab="build">Go to Build</button></div></div>';
  const tile = (key, label, val, sub) => '<button class="tile" data-act="breakdown" data-key="' + key + '"><b class="num">' + val + '</b><span>' + label + '</span>' + (sub != null ? '<i>' + sub + '</i>' : '') + '</button>';
  let h = '<section class="card"><h2>Defenses</h2><div class="tiles">' + ['AC', 'Fort', 'Ref', 'Will'].map(d => tile(d, d === 'AC' ? 'Armor Class' : D4.DEFENSES[d].name, c.def[d])).join('') + '</div></section>';
  h += '<section class="card"><h2>Hit points</h2><dl class="kv">' +
    [['hp', 'Maximum hit points', c.hp], [null, 'Bloodied', c.bloodied], ['surgeValue', 'Healing surge value', c.surgeValue], ['surges', 'Healing surges per day', c.surges],
      ['save', 'Saving throw bonus', D4.fmt(c.save) + (c.saveNotes.length ? ' (' + c.saveNotes.join('; ') + ')' : '')]]
      .map(([k, l, v]) => '<dt>' + (k ? '<button class="linkbtn" style="color:inherit;font-weight:400" data-act="breakdown" data-key="' + k + '">' + esc(l) + '</button>' : esc(l)) + '</dt><dd>' + esc(v) + '</dd>').join('') +
    (c.resist.length ? '<dt>Resistances</dt><dd>' + esc(c.resist.map(r => r.t + ' ' + r.v).join(', ')) + '</dd>' : '') + '</dl></section>';
  h += '<section class="card"><h2>Movement and senses</h2><dl class="kv">' +
    '<dt><button class="linkbtn" style="color:inherit;font-weight:400" data-act="breakdown" data-key="init">Initiative</button></dt><dd>' + D4.fmt(c.init) + '</dd>' +
    '<dt><button class="linkbtn" style="color:inherit;font-weight:400" data-act="breakdown" data-key="speed">Speed</button></dt><dd>' + c.speed + ' squares</dd>' +
    '<dt>Size</dt><dd>' + esc(c.size) + '</dd><dt>Vision</dt><dd>' + esc(c.vision) + '</dd>' +
    '<dt>Passive Insight</dt><dd>' + c.passive.insight + '</dd><dt>Passive Perception</dt><dd>' + c.passive.perception + '</dd></dl></section>';
  h += '<section class="card"><h2>Ability scores</h2><div class="tiles six">' + D4.ABILS.map(a => '<button class="tile" data-act="abilInfo" data-ab="' + a + '"><b class="num">' + c.score[a] + '</b><span>' + D4.ABIL[a].name + '</span><i>' + D4.fmt(c.mod[a]) + ' (' + D4.fmt(c.mod[a] + c.half) + ')</i></button>').join('') + '</div>' +
    '<p class="small muted" style="padding:0 14px 12px;margin:0">Modifier, and in brackets modifier + one-half level (for ability checks).</p></section>';
  h += '<section class="card"><h2>Skills</h2><ul class="rows">' + Object.keys(D4.SKILLS).map(s => {
    const sk = c.skills[s];
    return '<li><button class="rowbtn" data-act="skillInfo" data-skill="' + s + '" style="min-height:44px;padding:8px 14px"><span class="rmain"><span class="rval" style="font-weight:' + (sk.trained ? 700 : 500) + '">' + esc(D4.SKILLS[s].name) + (sk.trained ? '<span class="skill-t">TRAINED</span>' : '') + '</span><span class="rsub">' + esc(D4.ABIL[D4.SKILLS[s].ab].short) + (D4.SKILLS[s].armor && c.acp ? ', armor penalty' : '') + '</span></span><span class="rnum">' + D4.fmt(sk.v) + '</span></button></li>';
  }).join('') + '</ul></section>';
  const basics = D4.basicAttacks(c);
  h += '<section class="card"><h2>Basic attacks</h2><div class="pad">' + basics.map(p => '<div style="margin-top:6px"><b>' + esc(p.n) + '</b>' + calcBlock(c, p) + '</div>').join('') + '</div></section>';
  if (c.race) h += '<section class="card"><h2>Racial traits: ' + esc(c.race.name) + '</h2><div class="pad">' + traitList(c.race.traits) + '</div></section>';
  h += '<section class="card"><h2>Class features: ' + esc(c.cls.name) + '</h2><div class="pad">' + traitList(c.cls.features) +
    (c.cls.options || []).map(o => { const v = o.opts[ch.clsOpt[o.id]]; return v ? '<p><b>' + esc(v.name) + '.</b> ' + linkify(v.desc) + '</p>' : ''; }).join('') + '</div></section>';
  if (ch.path) h += '<section class="card"><h2>Paragon path: ' + esc(pathName()) + '</h2><div class="pad">' + (ch.path !== 'custom' && D4.paths[ch.path] ? '<p>' + esc(D4.paths[ch.path].s) + '</p>' : '') + (ch.pathText ? '<p style="white-space:pre-wrap">' + linkify(ch.pathText) + '</p>' : '<p class="small muted">Paste your path\'s features from the 4e Database to keep them here.</p>') + '<button class="linkbtn" data-act="pickPath">Change or paste features</button></div></section>';
  if (ch.destiny) h += '<section class="card"><h2>Epic destiny: ' + esc(destinyName()) + '</h2><div class="pad">' + (ch.destiny !== 'custom' && D4.destinies[ch.destiny] ? '<p>' + esc(D4.destinies[ch.destiny].s) + '</p>' : '') + (ch.destinyText ? '<p style="white-space:pre-wrap">' + linkify(ch.destinyText) + '</p>' : '') + '<button class="linkbtn" data-act="pickDestiny">Change or paste features</button></div></section>';
  h += '<section class="card"><h2>Feats</h2><ul class="rows">' + c.feats.map(f => '<li><button class="rowbtn" data-act="showFeat" data-id="' + esc(f.id) + '"><span class="rmain"><span class="rval">' + esc(f.feat.n) + (f.choice ? ' (' + esc(Array.isArray(f.choice) ? f.choice.join(', ') : choiceName(f.feat, f.choice)) + ')' : '') + '</span><span class="rsub">' + esc(f.feat.s || '') + (f.bonus ? ' <span class="badge">' + esc(f.bonus) + '</span>' : '') + '</span></span>' + IC.chev.replace('<svg', '<svg class="chev"') + '</button></li>').join('') + (c.feats.length ? '' : '<li><p class="pad muted">No feats chosen yet.</p></li>') + '</ul></section>';
  const weps = [...c.prof.weapons].map(w => D4.WEAPON_CATS[w] || (D4.items[w] || {}).n || w).concat([...c.prof.groups].map(g => g + ' (military and superior)'));
  h += '<section class="card"><h2>Proficiencies and languages</h2><dl class="kv">' +
    '<dt>Armor</dt><dd>' + esc([...c.prof.armor].join(', ') || 'none') + '</dd>' +
    '<dt>Shields</dt><dd>' + esc([...c.prof.shields].join(', ') || 'none') + '</dd>' +
    '<dt>Weapons</dt><dd>' + esc(weps.join(', ') || 'none') + '</dd>' +
    '<dt>Implements</dt><dd>' + esc([...c.prof.implements].join(', ') || 'none') + '</dd>' +
    '<dt>Languages</dt><dd>' + esc(c.languages.join(', ')) + '</dd></dl></section>';
  h += customModsCard();
  return h;
}
function customModsCard() {
  const ch = S.cur;
  return '<section class="card"><h2>Your own bonuses</h2><div class="pad"><p class="small muted">Add bonuses from items, powers or rules not built in (for example +1 item bonus to Will). They are added to the sheet automatically.</p>' +
    (ch.mods || []).map((m, i) => '<div class="row-gap" style="align-items:center;margin-bottom:6px"><button class="chip" data-act="toggleMod" data-i="' + i + '" aria-pressed="' + (m.on !== false) + '">' + esc(D4.fmt(+m.v) + ' ' + modTargetName(m.t) + (m.type && m.type !== 'untyped' ? ' (' + m.type + ')' : '')) + '</button><span class="small muted" style="flex:1">' + esc(m.note || '') + '</span><button class="iconbtn" data-act="delMod" data-i="' + i + '" aria-label="Remove">' + IC.trash + '</button></div>').join('') +
    '<button class="btn small" data-act="addMod">' + IC.plus + 'Add a bonus</button></div></section>';
}
const MOD_TARGETS = { AC: 'AC', Fort: 'Fortitude', Ref: 'Reflex', Will: 'Will', def: 'all defenses', hp: 'maximum hit points', surges: 'healing surges per day', surgeValue: 'healing surge value', init: 'initiative', speed: 'speed', save: 'saving throws', atk: 'attack rolls', dmg: 'damage rolls', 'dmg.melee': 'melee damage', 'dmg.ranged': 'ranged damage', skills: 'all skill checks' };
Object.keys(D4.SKILLS).forEach(s => { MOD_TARGETS['skill:' + s] = D4.SKILLS[s].name; });
const modTargetName = t => MOD_TARGETS[t] || t;

/* ---------- Powers tab ---------- */
function viewPowers() {
  const c = S.c;
  if (!c.cls) return '<div class="card"><div class="pad"><p style="margin-top:10px">Choose a class on the Build tab first.</p></div></div>';
  const f = S.powerFilter;
  const filters = [['all', 'All'], ['aw', 'At-will'], ['enc', 'Encounter'], ['day', 'Daily'], ['util', 'Utility'], ['feat', 'Features']];
  const list = c.powers.map(x => Object.assign({}, x, { eu: x.useOverride || x.p.u }));
  const groups = [
    ['aw', 'At-will attacks', x => x.p.ty === 'atk' && x.eu === 'aw'],
    ['enc', 'Encounter attacks', x => x.p.ty === 'atk' && x.eu === 'enc'],
    ['day', 'Daily attacks', x => x.p.ty === 'atk' && x.eu === 'day'],
    ['util', 'Utility powers', x => x.p.ty === 'util'],
    ['feat', 'Class and racial features', x => x.p.ty === 'feature'],
  ];
  let h = '<div class="chips">' + filters.map(([k, n]) => '<button class="chip" data-act="powerFilter" data-val="' + k + '" aria-pressed="' + (f === k) + '">' + n + '</button>').join('') + '</div>';
  groups.forEach(([k, title, test]) => {
    if (f !== 'all' && f !== k) return;
    const items = list.filter(test);
    if (k === 'aw' && (f === 'all' || f === 'aw')) D4.basicAttacks(c).forEach(p => items.push({ id: p.id, p, from: 'Everyone', eu: 'aw' }));
    if (!items.length) return;
    h += '<h2 class="sec-title">' + title + '</h2>' + items.map(x => powerCard(x.p, { c, from: x.from, key: x.id, open: !!S.open[x.id], useOverride: x.useOverride, toggle: true })).join('');
  });
  if (f === 'all' || f === 'util') h += '<button class="btn block" data-act="pickPower" data-slot="extra" style="margin:4px 0 12px">' + IC.plus + 'Add another power</button>';
  if (f === 'all') h += '<h2 class="sec-title">Actions everyone can take</h2><div class="card"><ul class="rows">' + D4.BASIC_ACTIONS.map(a => '<li><div class="rowbtn" style="cursor:default;align-items:flex-start"><span class="rmain"><span class="rlabel">' + esc(a.act) + ' action</span><span class="rval">' + esc(a.name) + '</span><span class="rsub">' + linkify(a.desc) + '</span></span></div></li>').join('') + '</ul></div>';
  return h;
}

/* ---------- Gear tab ---------- */
function viewGear() {
  const c = S.c, ch = S.cur;
  const load = c.load;
  let h = '<section class="card"><h2>Wealth and load</h2><div class="pad"><div class="grid2">' +
    '<label class="field"><span>Gold pieces</span><input class="num" inputmode="decimal" data-bind="gp" data-num="1" value="' + esc(ch.gp) + '"></label>' +
    '<div class="field"><span>Carried</span><b class="num" style="font-size:22px">' + (Math.round(load.carried * 10) / 10) + ' lb</b></div></div>' +
    '<p class="small muted" style="margin:0">Normal load ' + load.normal + ' lb · heavy load ' + load.heavy + ' lb (slowed) · maximum drag ' + load.drag + ' lb.' + (load.carried > load.heavy ? ' <b class="issue">Over your heavy load.</b>' : load.carried > load.normal ? ' <b style="color:var(--warn)">Heavy load: you are slowed.</b>' : '') + '</p></div></section>';
  const inv = ch.inv || [];
  const groups = [['Worn and wielded', i => i.eq], ['Carried', i => !i.eq]];
  groups.forEach(([title, test]) => {
    const items = inv.filter(test);
    h += '<section class="card"><h2>' + title + '</h2><ul class="rows">' + (items.length ? items.map(i => {
      const b = D4.items[i.id] || (i.custom ? Object.assign({ kind: 'gear' }, i.custom) : { kind: 'gear' });
      const sub = itemSub(b, i);
      return '<li><button class="rowbtn" data-act="editItem" data-uid="' + esc(i.uid) + '"><span class="rmain"><span class="rval">' + esc(D4.itemName(i)) + ((+i.qty || 1) > 1 ? ' ×' + i.qty : '') + '</span><span class="rsub">' + esc(sub) + '</span></span>' + IC.chev.replace('<svg', '<svg class="chev"') + '</button></li>';
    }).join('') : '<li><p class="pad muted" style="margin:0;padding-top:10px">' + (title === 'Carried' ? 'Nothing carried.' : 'Nothing equipped. Open an item and turn on Equipped to use it in your numbers.') + '</p></li>') + '</ul></section>';
  });
  h += '<div class="row-gap"><button class="btn primary" data-act="addItem">' + IC.plus + 'Add equipment</button><button class="btn" data-act="pasteItem">' + IC.paste + 'Paste a magic item</button></div>';
  return h;
}
function itemSub(b, i) {
  if (b.kind === 'weapon') return (D4.WEAPON_CATS[b.cat] || '') + ', ' + b.dmg + (b.rng ? ', range ' + b.rng : '') + (S.c.isProficient(b) ? ', proficient +' + b.prof : ', not proficient');
  if (b.kind === 'armor') return '+' + (b.ac + (+i.enh || 0)) + ' AC' + (b.check ? ', check ' + b.check : '') + (b.speed ? ', speed ' + b.speed : '');
  if (b.kind === 'shield') return '+' + b.ac + ' AC and Reflex';
  if (b.kind === 'implement') return 'Implement' + (i.enh ? ', +' + i.enh + ' to attack and damage' : '');
  if (b.kind === 'magic') return (b.slot || 'Magic item') + (b.levels ? ', level ' + D4.magicLevel(b, +i.enh || 1) : b.lvl ? ', level ' + b.lvl : '');
  const t = b.desc || i.notes || '';
  return t.length > 70 ? t.slice(0, 70).replace(/\s+\S*$/, '') + '\u2026' : t;
}

/* ---------- Play tab ---------- */
function viewPlay() {
  const c = S.c, ch = S.cur, pl = ch.play;
  if (!c.cls) return '<div class="card"><div class="pad"><p style="margin-top:10px">Choose a class on the Build tab first.</p></div></div>';
  const cur = D4.curHP(c), temp = +pl.temp || 0;
  const pct = Math.max(0, Math.min(100, cur / c.hp * 100)), tpct = Math.min(100 - pct, temp / c.hp * 100);
  const surgesLeft = c.surges - pl.surgesUsed;
  const dying = cur <= 0, dead = cur <= -c.bloodied || pl.deathFails >= 3;
  let h = '<section class="card hpcard"><div class="hpbig"><b class="num">' + cur + '</b><span class="num">/ ' + c.hp + '</span>' + (temp ? '<em class="num">+' + temp + ' temp</em>' : '') +
    (dead ? ' <span class="status-pill">dead</span>' : dying ? ' <span class="status-pill">dying</span>' : cur <= c.bloodied ? ' <span class="status-pill">bloodied</span>' : '') + '</div>' +
    '<div class="bar' + (cur <= c.bloodied ? ' bloodied' : '') + '"><i style="width:' + pct + '%"></i><i class="temp" style="width:' + tpct + '%"></i></div>' +
    '<div class="row-gap"><button class="btn danger" data-act="hpInput" data-mode="damage">Damage</button><button class="btn" data-act="hpInput" data-mode="heal">Heal</button><button class="btn" data-act="hpInput" data-mode="temp">Temp HP</button></div>' +
    '<p class="small muted" style="margin:10px 0 0">Bloodied at ' + c.bloodied + '. Surge value ' + c.surgeValue + '.</p></section>';
  if (dying) h += '<section class="card"><h2>Death saving throws</h2><div class="pad"><p class="small">At the end of each turn roll a d20: under 10 is a failure, 20 lets you spend a healing surge. Three failures and you die. You also die at −' + c.bloodied + ' hit points.</p><div class="pips">' +
    [0, 1, 2].map(i => '<button class="pip" data-act="deathFail" data-i="' + i + '" aria-pressed="' + (i < pl.deathFails) + '" aria-label="Failure ' + (i + 1) + '"></button>').join('') + '</div></div></section>';
  h += '<section class="card"><h2>Healing and resources</h2><dl class="kv">' +
    '<dt>Healing surges</dt><dd><span class="stepper"><button data-act="surgeAdj" data-d="1" aria-label="Use a surge without healing"' + (surgesLeft <= 0 ? ' disabled' : '') + '>−</button><b>' + surgesLeft + '/' + c.surges + '</b><button data-act="surgeAdj" data-d="-1" aria-label="Regain a surge"' + (pl.surgesUsed <= 0 ? ' disabled' : '') + '>+</button></span></dd>' +
    '<dt>Action points</dt><dd><span class="stepper"><button data-act="apAdj" data-d="-1" aria-label="Spend an action point"' + (pl.ap <= 0 ? ' disabled' : '') + '>−</button><b>' + pl.ap + '</b><button data-act="apAdj" data-d="1" aria-label="Gain an action point">+</button></span></dd></dl>' +
    '<div class="pad" style="padding-top:10px"><div class="row-gap"><button class="btn" data-act="spendSurge"' + (surgesLeft <= 0 ? ' disabled' : '') + '>Spend a surge (+' + c.surgeValue + ')</button>' +
    '<button class="btn" data-act="secondWind"' + (pl.secondWind || surgesLeft <= 0 ? ' disabled' : '') + '>' + (pl.secondWind ? 'Second wind used' : 'Second wind') + '</button></div>' +
    '<p class="small muted" style="margin:8px 0 0">Second wind: ' + (c.race && c.race.flags && c.race.flags.secondWindMinor ? 'minor action (dwarf)' : 'standard action') + ', once per encounter. Spend a surge, and +2 to all defenses until the start of your next turn.</p></div></section>';
  h += '<section class="card"><h2>Conditions</h2><div class="pad"><div class="row-gap" style="margin-bottom:8px">' +
    (pl.conds.length ? pl.conds.map((cd, i) => '<span class="cond"><button class="kw" style="text-decoration:none" data-act="term" data-term="' + esc(cd.name) + '">' + esc(cd.name) + (cd.note ? ' (' + esc(cd.note) + ')' : '') + '</button><button class="x" data-act="delCond" data-i="' + i + '" aria-label="Remove ' + esc(cd.name) + '">' + IC.close + '</button></span>').join('') : '<span class="muted small">None</span>') + '</div>' +
    '<button class="btn small" data-act="addCond">' + IC.plus + 'Add condition</button>' +
    '<label class="field" style="margin:12px 0 0"><span>Ongoing damage and effects</span><input data-bind="play.ongoing" placeholder="e.g. 5 fire (save ends)" value="' + esc(pl.ongoing) + '"></label></div></section>';
  const usable = c.powers.filter(x => x.p.u && ((x.useOverride || x.p.u) !== 'aw' || x.p.usesPer));
  h += '<section class="card"><h2>Power uses</h2><div class="pad"><div class="uses">' + (usable.length ? usable.map(x => {
    const n = D4.usesOf(c, x.p), used = pl.used[x.id] || 0;
    return '<button class="use ' + USE_CLASS(Object.assign({}, x.p, { u: x.useOverride || x.p.u })) + '" data-act="cycleUse" data-key="' + esc(x.id) + '" data-n="' + n + '" aria-pressed="' + (used >= n) + '">' + esc(x.p.n) + (n > 1 ? ' ' + (n - used) + '/' + n : '') + '</button>';
  }).join('') : '<span class="muted small">No encounter or daily powers yet.</span>') + '</div><p class="small muted" style="margin:8px 0 0">Tap to mark a power as used. Details are on the Powers tab.</p></div></section>';
  h += '<section class="card"><h2>Rest</h2><div class="pad"><div class="row-gap"><button class="btn" data-act="rest" data-kind="short">Short rest</button><button class="btn" data-act="rest" data-kind="extended">Extended rest</button><button class="btn" data-act="rest" data-kind="milestone">Milestone</button></div>' +
    '<p class="small muted" style="margin:8px 0 0">Short rest (5 minutes): encounter powers and second wind recharge. Extended rest (6 hours): full hit points, surges and daily powers; action points reset to 1. Milestone (every two encounters): +1 action point.</p></div></section>';
  return h;
}

/* ---------- Compendium ---------- */
const COMP_TABS = [['races', 'Races'], ['classes', 'Classes'], ['powers', 'Powers'], ['feats', 'Feats'], ['items', 'Equipment'], ['paths', 'Paths'], ['rules', 'Rules'], ['mine', 'My pasted']];
function viewCompendium() {
  const t = S.comp.tab;
  let h = topbar('<button class="iconbtn" data-act="home" aria-label="Back">' + IC.back + '</button>', '<b>Compendium</b>', 'Tap an entry for its description', '') +
    '<main class="no-tabs"><div class="chips">' + COMP_TABS.map(([k, n]) => '<button class="chip" data-act="compTab" data-tab="' + k + '" aria-pressed="' + (t === k) + '">' + n + '</button>').join('') + '</div>' +
    '<div class="search">' + IC.search + '<input type="search" id="comp-q" data-search="comp" placeholder="Search" value="' + esc(S.comp.q) + '" aria-label="Search the compendium"></div>';
  if (t === 'powers') h += '<div class="chips">' + [['', 'All'], ...Object.keys(D4.classes).filter(k => Object.values(D4.powers).some(p => p.cls === k && !p.user)).map(k => [k, D4.classes[k].name]), ['race', 'Racial']].map(([k, n]) => '<button class="chip" data-act="compCls" data-val="' + k + '" aria-pressed="' + (S.comp.cls === k) + '">' + n + '</button>').join('') + '</div>';
  h += '<div id="comp-list">' + compList() + '</div></main>';
  return h;
}
function compItems() {
  const t = S.comp.tab;
  if (t === 'races') return Object.values(D4.races).map(r => ({ id: 'r:' + r.id, name: r.name, meta: (r.src || '') + ' · ' + (r.abil.any ? '+2 any' : Object.keys(r.abil.fixed || {}).concat(r.abil.choice ? [r.abil.choice.join('/')] : []).map(a => a.split('/').map(x => D4.ABIL[x].short).join('/')).join(', ')), sum: r.desc, detail: () => raceDetail(r) }));
  if (t === 'classes') return Object.values(D4.classes).map(cl => ({ id: 'c:' + cl.id, name: cl.name, meta: cl.src + ' · ' + cl.source + ' ' + cl.role, sum: cl.desc, detail: () => classDetail(cl) }));
  if (t === 'powers') return Object.values(D4.powers).filter(p => !S.comp.cls || (S.comp.cls === 'race' ? p.src === 'race' : p.cls === S.comp.cls))
    .sort((a, b) => (a.cls || '').localeCompare(b.cls || '') || (a.l || 0) - (b.l || 0) || a.n.localeCompare(b.n))
    .map(p => ({ id: 'p:' + p.id, name: p.n, meta: powerType(p) + ' · ' + ((D4.USAGE[p.u] || {}).name || ''), sum: p.s, band: USE_CLASS(p), detail: () => powerCard(p, { open: true, noFoot: false, play: false }) }));
  if (t === 'feats') return Object.values(D4.feats).sort((a, b) => a.n.localeCompare(b.n)).map(f => ({ id: 'f:' + f.id, name: f.n, meta: D4.TIER_NAMES[{ H: 1, P: 2, E: 3 }[f.tier]] + (f.cat ? ' · ' + f.cat : '') + (f.pre ? ' · ' + f.pre : ''), sum: f.s, detail: () => featDetail(f) }));
  if (t === 'items') return Object.values(D4.items).filter(i => i.id !== 'unarmed').map(i => ({ id: 'i:' + i.id, name: i.n, meta: ({ weapon: D4.WEAPON_CATS[i.cat], armor: 'Armor', shield: 'Shield', implement: 'Implement', gear: 'Adventuring gear', magic: 'Magic item' })[i.kind] || i.kind, sum: i.kind === 'weapon' ? i.dmg + ', +' + i.prof + ' proficiency' + (i.props ? ', ' + i.props.join(', ') : '') : i.desc, band: i.kind === 'magic' ? 'u-item' : '', detail: () => itemDetail(i) }));
  if (t === 'paths') return Object.entries(D4.paths).map(([k, p]) => ({ id: 'pp:' + k, name: p.n, meta: 'Paragon path · ' + ((D4.classes[p.cls] || {}).name || 'any class'), sum: p.s, detail: () => '<p>' + esc(p.s) + '</p>' + (p.text ? '<p style="white-space:pre-wrap">' + linkify(p.text) + '</p>' : '') + '<p>' + extLink(D4.lookupUrl('paragonpath', p.n), 'Full text on the 4e Database') + '</p>' }))
    .concat(Object.entries(D4.destinies).map(([k, p]) => ({ id: 'ed:' + k, name: p.n, meta: 'Epic destiny', sum: p.s, detail: () => '<p>' + esc(p.s) + '</p><p>' + extLink(D4.lookupUrl('epicdestiny', p.n), 'Full text on the 4e Database') + '</p>' })));
  if (t === 'rules') return Object.entries(D4.GLOSSARY).sort((a, b) => a[1].cat.localeCompare(b[1].cat) || a[0].localeCompare(b[0])).map(([k, g]) => ({ id: 'g:' + k, name: k.charAt(0).toUpperCase() + k.slice(1), meta: g.cat, sum: g.desc, detail: () => termDetail(k) }))
    .concat(Object.entries(D4.SKILLS).map(([k, s]) => ({ id: 's:' + k, name: s.name, meta: 'Skill · ' + D4.ABIL[s.ab].name, sum: s.desc })))
    .concat(D4.BASIC_ACTIONS.map(a => ({ id: 'a:' + a.name, name: a.name, meta: a.act + ' action', sum: a.desc })))
    .concat(Object.entries(D4.DEITIES).map(([k, d]) => ({ id: 'd:' + k, name: k, meta: 'Deity', sum: d })))
    .concat(Object.entries(D4.LANGUAGE_INFO).map(([k, d]) => ({ id: 'l:' + k, name: k, meta: 'Language', sum: d })));
  if (t === 'mine') {
    const db = D4.userdb, out = [];
    Object.entries(db.powers).forEach(([k, p]) => out.push({ id: 'up:' + k, name: p.n || k, meta: 'Pasted power' + (p.override ? ' (replaces built-in text)' : ''), sum: p.s || '', band: USE_CLASS(D4.powers[k] || p), detail: () => (D4.powers[k] ? powerCard(D4.powers[k], { open: true, noFoot: true }) : '') + '<button class="btn danger small" data-act="delUser" data-kind="powers" data-id="' + esc(k) + '">Delete</button>' }));
    Object.entries(db.feats).forEach(([k, f]) => out.push({ id: 'uf:' + k, name: f.n, meta: 'Pasted feat', sum: f.s || '', detail: () => featDetail(D4.feats[k] || f) + '<button class="btn danger small" data-act="delUser" data-kind="feats" data-id="' + esc(k) + '">Delete</button>' }));
    Object.entries(db.items).forEach(([k, it]) => out.push({ id: 'ui:' + k, name: it.n, meta: 'Pasted item', sum: '', detail: () => itemDetail(D4.items[k] || it) + '<button class="btn danger small" data-act="delUser" data-kind="items" data-id="' + esc(k) + '">Delete</button>' }));
    return out;
  }
  return [];
}
function compList() {
  const q = S.comp.q.trim().toLowerCase();
  const items = compItems().filter(it => !q || (it.name + ' ' + (it.meta || '') + ' ' + (it.sum || '')).toLowerCase().includes(q));
  if (!items.length) return '<p class="muted">' + (S.comp.tab === 'mine' ? 'Nothing pasted yet. When you paste a power, feat or item from the 4e Database, it is kept here on this device.' : 'No matches.') + '</p>';
  return '<p class="small muted">' + plural(items.length, 'entry').replace('entrys', 'entries') + '</p><ul class="plist">' + items.slice(0, 400).map(it => listItem(it, S.comp.open === it.id, null)).join('') + '</ul>';
}
function listItem(it, open, chooseAct) {
  return '<li class="pitem' + (it.current ? ' current' : '') + (it.dim ? ' dim' : '') + '"><button class="pi-head" data-act="' + (chooseAct ? 'pkToggle' : 'compToggle') + '" data-id="' + esc(it.id) + '" aria-expanded="' + open + '">' +
    '<span class="band ' + esc(it.band || '') + '"></span><span class="pi-main"><span class="pi-name">' + esc(it.name) + (it.current ? ' <span class="badge">current</span>' : '') + '</span>' +
    (it.meta ? '<span class="pi-meta">' + esc(it.meta) + '</span>' : '') + (it.sum && !open ? '<span class="pi-sum">' + esc(it.sum) + '</span>' : '') + (it.warn ? '<span class="pi-warn">' + esc(it.warn) + '</span>' : '') + '</span></button>' +
    (open ? '<div class="pi-detail">' + (it.detail ? it.detail() : '<p>' + linkify(it.sum || '') + '</p>') +
      (chooseAct ? '<div class="pi-actions"><button class="btn primary" data-act="' + chooseAct + '" data-id="' + esc(it.value != null ? it.value : it.id) + '">' + (it.current ? 'Keep this' : 'Choose') + '</button></div>' : '') + '</div>' : '') + '</li>';
}

/* ---------- pickers (search + list inside a sheet) ---------- */
function openPicker(opts) {
  const sh = Object.assign({ q: '', open: null, full: true, filters: {} }, opts);
  sh.list = () => {
    const q = sh.q.trim().toLowerCase();
    const items = sh.items(sh).filter(it => !q || (it.name + ' ' + (it.meta || '') + ' ' + (it.sum || '')).toLowerCase().includes(q));
    return (items.length ? '<ul class="plist">' + items.map(it => listItem(it, sh.open === it.id, 'pkChoose')).join('') + '</ul>' : '<p class="muted">Nothing matches.</p>') + (sh.after ? sh.after(sh) : '');
  };
  sh.body = () => (sh.intro ? sh.intro(sh) : '') + '<div class="search">' + IC.search + '<input type="search" data-search="picker" placeholder="Search" value="' + esc(sh.q) + '" aria-label="Search"></div>' +
    (sh.chips ? sh.chips(sh) : '') + '<div class="pk-list">' + sh.list() + '</div>';
  return UI.open(sh);
}
const topSheet = () => UI.sheets[UI.sheets.length - 1];

function pickRace() {
  const ch = S.cur;
  openPicker({
    title: 'Choose a race',
    items: () => Object.values(D4.races).map(r => ({ id: r.id, name: r.name, meta: r.src + ' · ' + (r.abil.any ? '+2 to any one' : Object.keys(r.abil.fixed || {}).map(a => '+2 ' + D4.ABIL[a].short).concat(r.abil.choice ? ['+2 ' + r.abil.choice.map(a => D4.ABIL[a].short).join(' or ')] : []).join(', ')) + ' · speed ' + r.speed, sum: r.desc, current: ch.race === r.id, detail: () => raceDetail(r) })),
    choose: id => {
      if (ch.race !== id) { ch.race = id; ch.raceAbil = ''; ch.raceOpt = {}; ch.raceSkill = ''; ch.dilettante = ''; ch.langs = []; }
      const r = D4.races[id];
      if (r.choices) r.choices.forEach(o => { if (!ch.raceOpt[o.id]) ch.raceOpt[o.id] = Object.keys(o.opts)[0]; });
      UI.close(); commit();
    },
  });
}
function pickClass() {
  const ch = S.cur;
  openPicker({
    title: 'Choose a class',
    items: () => Object.values(D4.classes).map(cl => ({ id: cl.id, name: cl.name, meta: cl.src + ' · ' + cl.source + ' ' + cl.role + (cl.key.length ? ' · ' + cl.key.map(a => D4.ABIL[a].short).join(', ') : ''), sum: cl.desc, current: ch.cls === cl.id, detail: () => classDetail(cl) })),
    choose: id => {
      if (ch.cls !== id) {
        const had = Object.keys(ch.powers).length;
        ch.cls = id; ch.clsOpt = {}; ch.build = ''; ch.powers = {}; ch.spellbook = {}; ch.skillOneOf = '';
        const cl = D4.getClass(ch);
        ch.skills = (ch.skills || []).filter(s => cl.skills.list.includes(s) && !(cl.skills.fixed || []).includes(s)).slice(0, cl.skills.choose);
        if (had) toast('Class changed: your powers were cleared.');
      }
      UI.close(); commit();
    },
  });
}
function powerSlotFilter(slot) {
  const ch = S.cur, c = S.c;
  if (slot === 'dilettante') return { title: 'Dilettante power', test: p => p.cls && p.cls !== ch.cls && p.u === 'aw' && p.ty === 'atk' && p.l === 1, lvl: 1 };
  if (slot === 'extra') return { title: 'Add a power', test: () => true, lvl: 30, all: true };
  const s = c.powerSlots.find(x => x.id === slot);
  if (!s) return null;
  const test = s.use === 'util' ? p => p.ty === 'util' : p => p.ty === 'atk' && p.u === s.use;
  return { title: s.label + ' (level ' + s.lvl + ' or lower)', test, lvl: s.lvl, s };
}
function pickPower(slot, book) {
  const ch = S.cur, c = S.c;
  const f = powerSlotFilter(slot);
  if (!f) return;
  const granted = new Set(c.powers.filter(x => !x.slot && !x.extra).map(x => x.id));
  openPicker({
    title: (book ? 'Spellbook: ' : '') + f.title, slotKey: slot, book, clear: 'power',
    showAll: !!f.all || !!(f.s && (f.s.path || f.s.destiny)),
    items: sh => {
      const cur = slot === 'dilettante' ? ch.dilettante : slot === 'extra' ? null : book ? ch.spellbook[slot] : (typeof ch.powers[slot] === 'object' && ch.powers[slot] ? ch.powers[slot].id : ch.powers[slot]);
      return Object.values(D4.powers).filter(p => {
        if (p.cantrip || (granted.has(p.id) && p.id !== cur)) return false;
        if (!sh.showAll && !f.test(p)) return false;
        if (!sh.showAll && slot !== 'dilettante' && p.cls && ch.cls !== 'custom' && p.cls !== ch.cls && !c.mcClasses.includes(p.cls)) return false;
        if (!sh.showAll && p.src === 'race') return false;
        if (!sh.showAll && p.l && p.l > f.lvl) return false;
        return true;
      }).sort((a, b) => (b.user ? 1 : 0) - (a.user ? 1 : 0) || (b.l || 0) - (a.l || 0) || a.n.localeCompare(b.n))
        .map(p => ({ id: p.id, name: p.n, meta: powerType(p) + ' · ' + ((D4.USAGE[p.u] || {}).name || '') + (p.user ? ' · pasted' : ''), sum: p.s, band: USE_CLASS(p), current: p.id === cur,
          warn: !D4.powerLines(p).length ? 'Summary only' : '', detail: () => powerCard(p, { c, open: true, play: false }) }));
    },
    chips: sh => '<div class="chips"><button class="chip" data-act="pkShowAll" aria-pressed="' + !!sh.showAll + '">Show every power</button>' + (slot !== 'extra' ? '<button class="chip" data-act="pkClear">Clear this slot</button>' : '') + '</div>',
    intro: () => {
      const cl = c.cls;
      const lvl = f.s ? f.s.lvl : 1;
      if (f.s && (f.s.path || f.s.destiny)) {
        const nm = f.s.path ? pathName() : destinyName();
        return '<div class="note-box">' + (nm ? 'Look up ' + esc(nm) + ' on the ' + extLink(D4.lookupUrl(f.s.path ? 'paragonpath' : 'epicdestiny', nm), '4e Database') : 'Choose your ' + (f.s.path ? 'paragon path' : 'epic destiny') + ' first, then find its powers on the 4e Database') +
          ', copy its level ' + lvl + ' power, then <button class="linkbtn" data-act="pastePower" data-slot="' + esc(slot) + '">' + IC.paste + 'paste it here</button>.</div>';
      }
      const label = cl && !cl.custom ? cl.name + ' ' + (f.s && f.s.use === 'util' ? 'Utility' : 'Attack') + ' ' + lvl : '';
      const builtIn = cl && Object.values(D4.powers).some(p => p.cls === ch.cls && p.l === lvl && !p.user);
      return '<div class="note-box">' + (slot === 'extra' ? 'Add a power from an item, feat, multiclass option or anywhere else. ' : '') +
        (label && !builtIn ? 'No built-in ' + esc(label) + ' powers yet. ' : '') +
        (label ? extLink(D4.searchUrl('power', '"' + label + '"'), 'Browse every ' + label + ' power') + ' on the 4e Database, then ' : 'Find a power on the 4e Database, then ') +
        '<button class="linkbtn" data-act="pastePower" data-slot="' + esc(slot) + '"' + (book ? ' data-book="1"' : '') + '>' + IC.paste + 'paste its text here</button>.</div>';
    },
    choose: id => assignPower(slot, book, id),
  });
}
function assignPower(slot, book, id) {
  const ch = S.cur;
  if (slot === 'dilettante') ch.dilettante = id;
  else if (slot === 'extra') { ch.extraPowers = (ch.extraPowers || []).concat([{ id }]); toast('Added ' + D4.powers[id].n + ' to your powers.'); }
  else if (book) ch.spellbook[slot] = id;
  else {
    const s = S.c.powerSlots.find(x => x.id === slot);
    if (s && s.replace) {
      const prev = ch.powers[slot];
      ch.powers[slot] = { id, replaces: prev && typeof prev === 'object' ? prev.replaces : null };
    } else ch.powers[slot] = id;
  }
  UI.closeAll(); commit();
}

function pickFeat(slot) {
  const ch = S.cur, c = S.c;
  const fs = c.featSlots.find(s => s.slot === slot);
  const maxTier = fs.lvl >= 21 ? 3 : fs.lvl >= 11 ? 2 : 1;
  openPicker({
    title: (slot === 'fh' ? 'Human bonus feat' : 'Level ' + fs.lvl + ' feat'), onlyOk: true, cat: '', featSlot: slot, clear: 'feat',
    items: sh => Object.values(D4.feats).filter(f => ({ H: 1, P: 2, E: 3 }[f.tier] || 1) <= maxTier && (!sh.cat || (sh.cat === 'mine' ? f.user : (f.cat || 'General') === sh.cat)))
      .filter(f => f.repeat || (fs.pick && fs.pick.id === f.id) || !c.featSlots.some(o => o !== fs && o.pick && o.pick.id === f.id))
      .map(f => ({ f, unmet: D4.featUnmet(f, c).filter(u => !/tier/.test(u)) }))
      .filter(x => !sh.onlyOk || !x.unmet.length || (fs.pick && fs.pick.id === x.f.id))
      .sort((a, b) => a.f.n.localeCompare(b.f.n))
      .map(({ f, unmet }) => ({ id: f.id, name: f.n, meta: D4.TIER_NAMES[{ H: 1, P: 2, E: 3 }[f.tier]] + (f.cat ? ' · ' + f.cat : '') + (f.pre ? ' · ' + f.pre : ''), sum: f.s, current: fs.pick && fs.pick.id === f.id, dim: unmet.length > 0,
        warn: unmet.length ? 'Needs: ' + unmet.join(', ') : '', detail: () => featDetail(f, c) })),
    chips: sh => '<div class="chips"><button class="chip" data-act="pkOnlyOk" aria-pressed="' + sh.onlyOk + '">Only feats I qualify for</button>' +
      ['', 'General', 'Racial', 'Class', 'Multiclass', 'Divinity', 'mine'].map(k => '<button class="chip" data-act="pkCat" data-val="' + k + '" aria-pressed="' + (sh.cat === k) + '">' + (k === '' ? 'All' : k === 'mine' ? 'Pasted' : k) + '</button>').join('') +
      '<button class="chip" data-act="pkClear">Clear this slot</button></div>',
    intro: () => '<div class="note-box">Built in: ' + Object.keys(D4.feats).length + ' feats, mostly from the Player\'s Handbook. ' + extLink(D4.lookupBase + '?list.full.feat', 'Browse all feats') + ' on the 4e Database, then <button class="linkbtn" data-act="pasteFeat" data-slot="' + esc(slot) + '">' + IC.paste + 'paste one here</button>.</div>',
    choose: id => {
      const f = D4.feats[id];
      ch.feats[slot] = { id, choice: ch.feats[slot] && ch.feats[slot].id === id ? ch.feats[slot].choice : null };
      if (f.choice) { S.c = D4.calc(ch); openFeatChoice(slot); } else { UI.closeAll(); commit(); }
    },
  });
}
function openFeatChoice(slot) {
  const ch = S.cur, c = S.c, pick = ch.feats[slot], f = D4.feats[pick.id], ct = f.choice;
  let opts = [];
  if (ct.type === 'skill') opts = Object.keys(D4.SKILLS).filter(s => !c.trained.has(s) || pick.choice === s).map(s => [s, D4.SKILLS[s].name]);
  if (ct.type === 'trainedSkill') opts = [...c.trained].map(s => [s, D4.SKILLS[s].name]);
  if (ct.type === 'classSkill') opts = D4.classes[ct.cls].skills.list.map(s => [s, D4.SKILLS[s].name]);
  if (ct.type === 'weaponGroup') opts = D4.WEAPON_GROUPS.map(g => [g, g]);
  if (ct.type === 'weapon') opts = Object.values(D4.items).filter(i => i.kind === 'weapon' && i.id !== 'unarmed').map(i => [i.id, i.n + ' (' + (D4.WEAPON_CATS[i.cat] || '') + ')']);
  if (ct.type === 'implement') opts = D4.IMPLEMENTS.map(i => [i, i]);
  if (ct.type === 'languages') opts = D4.LANGUAGES.filter(l => !c.languages.includes(l) || (pick.choice || []).includes(l)).map(l => [l, l]);
  const multi = ct.type === 'languages';
  UI.open({
    title: f.n + ': ' + ct.label,
    body: () => '<div class="chips wrap">' + opts.map(([k, n]) => '<button class="chip" data-act="featChoice" data-slot="' + esc(slot) + '" data-val="' + esc(k) + '" aria-pressed="' + (multi ? (pick.choice || []).includes(k) : pick.choice === k) + '">' + esc(n) + '</button>').join('') + '</div>' +
      (multi ? '<p class="small muted">Choose ' + ct.count + '.</p>' : ''),
    foot: () => '<button class="btn primary" data-act="closeAllCommit">Done</button>',
    multi, count: ct.count,
  });
}

function editAbilities() {
  UI.open({
    title: 'Ability scores', full: true,
    body: () => {
      const ch = S.cur, c = S.c = D4.calc(S.cur), m = ch.abilMethod;
      const pc = D4.pointCost(ch.base);
      const key = c.cls ? c.cls.key : [];
      let h = '<div class="chips">' + [['pointbuy', 'Point buy'], ['array', 'Standard array'], ['manual', 'Rolled / manual']].map(([k, n]) => '<button class="chip" data-act="abilMethod" data-val="' + k + '" aria-pressed="' + (m === k) + '">' + n + '</button>').join('') + '</div>';
      if (m === 'pointbuy') h += '<div class="note-box">Five scores start at 10 and one at 8. Spend 22 points; raising a score costs more the higher it goes (13 costs 3, 16 costs 9, 18 costs 16). <b class="num">Points spent: ' + pc.spent + ' / ' + pc.budget + '</b>' + (pc.tooLow ? '<br><span class="issue">Only one score can be below 10.</span>' : pc.spent > pc.budget ? '<br><span class="issue">Too many points spent.</span>' : '') + '</div>';
      if (m === 'array') h += '<div class="note-box">Assign 16, 14, 13, 12, 11 and 10 to your six abilities. Choosing a number that is already used swaps them.</div>';
      if (m === 'manual') h += '<div class="note-box">Enter scores you rolled (4d6, drop the lowest, six times) or were given. Before racial bonuses.</div>';
      if (c.cls) h += '<p class="small">Key abilities for ' + esc(c.cls.name) + ': <b>' + esc(key.map(a => D4.ABIL[a].name).join(', ')) + '</b>' + (c.cls.builds && ch.build ? ' (' + esc(c.cls.builds[ch.build].name) + ': ' + esc(c.cls.builds[ch.build].abil) + ')' : '') + '</p>';
      h += '<div class="card">' + D4.ABILS.map(a => {
        const b = +ch.base[a];
        let ctl;
        if (m === 'pointbuy') {
          const canDown = b > 8 && !(b === 10 && D4.ABILS.some(x => x !== a && ch.base[x] < 10));
          ctl = '<span class="stepper"><button data-act="abilStep" data-ab="' + a + '" data-d="-1"' + (canDown ? '' : ' disabled') + ' aria-label="Lower ' + D4.ABIL[a].name + '">−</button><b>' + b + '</b><button data-act="abilStep" data-ab="' + a + '" data-d="1"' + (b >= 18 ? ' disabled' : '') + ' aria-label="Raise ' + D4.ABIL[a].name + '">+</button></span>';
        } else if (m === 'array') {
          ctl = '<select data-change="abilArray" data-ab="' + a + '" aria-label="' + D4.ABIL[a].name + '">' + D4.STANDARD_ARRAY.map(v => '<option' + (b === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>';
        } else ctl = '<input type="number" inputmode="numeric" min="3" max="20" data-change="abilManual" data-ab="' + a + '" value="' + b + '" aria-label="' + D4.ABIL[a].name + '">';
        const extras = c.abilParts[a].slice(1).map(p => p.l + ' ' + D4.fmt(p.v)).join(', ');
        return '<div class="abil-row"><div><div class="an">' + D4.ABIL[a].name + (key.includes(a) ? ' <span class="key">KEY</span>' : '') + '</div><div class="ad">' + esc(extras || 'No bonuses') + (m === 'pointbuy' ? ' · cost ' + (D4.POINT_BUY[b] + (b < 10 ? 2 : 0)) : '') + '</div></div>' + ctl +
          '<div class="at"><b>' + c.score[a] + '</b><small>' + D4.fmt(c.mod[a]) + '</small></div></div>';
      }).join('') + '</div>' +
        '<p class="small muted">Total = base + racial bonus + level increases. The modifier is (score − 10) ÷ 2, rounded down.</p>';
      return h;
    },
    foot: () => '<button class="btn primary" data-act="closeSheet">Done</button>',
  });
}

function editSkills() {
  UI.open({
    title: 'Trained skills', full: true,
    body: () => {
      const ch = S.cur, c = S.c = D4.calc(S.cur), cl = c.cls;
      if (!cl) return '<p>Choose a class first.</p>';
      const fixed = cl.skills.fixed || [];
      let h = '<div class="note-box">Trained skills get +5. ' + esc(cl.name) + ': ' + (fixed.length ? esc(fixed.map(s => D4.SKILLS[s].name).join(' and ')) + ' plus ' : '') + (cl.skills.oneOf ? esc(cl.skills.oneOf.map(s => D4.SKILLS[s].name).join(' or ')) + ' plus ' : '') + cl.skills.choose + ' from the class list. <b>' + c.skillInfo.chosen + ' of ' + cl.skills.choose + ' chosen.</b></div>';
      if (cl.skills.oneOf) h += '<div class="label" style="margin:6px 0">Choose one</div><div class="chips wrap">' + cl.skills.oneOf.map(s => '<button class="chip" data-act="skillOneOf" data-val="' + s + '" aria-pressed="' + (ch.skillOneOf === s) + '">' + D4.SKILLS[s].name + '</button>').join('') + '</div>';
      h += '<div class="card"><ul class="rows">' + cl.skills.list.map(s => {
        const locked = fixed.includes(s) || (cl.skills.oneOf && ch.skillOneOf === s);
        const on = locked || ch.skills.includes(s);
        const other = !locked && !ch.skills.includes(s) && c.trained.has(s);
        return '<li><label class="check" style="padding:8px 14px"><input type="checkbox" data-change="toggleSkill" data-skill="' + s + '"' + (on || other ? ' checked' : '') + (locked || other ? ' disabled' : '') + '><span style="flex:1"><b>' + D4.SKILLS[s].name + '</b> <span class="muted small">' + D4.ABIL[D4.SKILLS[s].ab].short + (locked ? ', class skill' : other ? ', trained from race or feat' : '') + '</span><br><span class="small" style="color:var(--ink-2)">' + esc(D4.SKILLS[s].desc) + '</span></span></label></li>';
      }).join('') + '</ul></div><p class="small muted">Other skills can be trained with a racial bonus skill or the Skill Training feat.</p>';
      return h;
    },
    foot: () => '<button class="btn primary" data-act="closeSheet">Done</button>',
  });
}
function editLangs() {
  UI.open({
    title: 'Languages',
    body: () => {
      const ch = S.cur, c = S.c = D4.calc(S.cur), base = c.race ? c.race.langs : ['Common'];
      return '<p class="small">From your race: <b>' + esc(base.join(', ')) + '</b>. ' + (c.extraLangs ? 'Choose ' + plural(c.extraLangs, 'more') + '.' : 'Tap more if your game allows them.') + '</p><div class="chips wrap">' +
        D4.LANGUAGES.filter(l => !base.includes(l)).map(l => '<button class="chip" data-act="toggleLang" data-val="' + esc(l) + '" aria-pressed="' + ch.langs.includes(l) + '">' + esc(l) + '</button>').join('') + '</div>' +
        '<div class="card" style="margin-top:12px"><dl class="kv">' + D4.LANGUAGES.map(l => '<dt>' + esc(l) + '</dt><dd style="font-weight:400;font-size:14px;text-align:left">' + esc(D4.LANGUAGE_INFO[l]) + '</dd>').join('') + '</dl></div>';
    },
    foot: () => '<button class="btn primary" data-act="closeSheet">Done</button>',
  });
}
function pickRaceSkill() {
  const ch = S.cur, c = S.c, r = c.race;
  const list = r.bonusSkill === 'class' && c.cls ? c.cls.skills.list : Object.keys(D4.SKILLS);
  UI.open({
    title: r.name + ' bonus skill',
    body: () => '<div class="chips wrap">' + list.map(s => '<button class="chip" data-act="setRaceSkill" data-val="' + s + '" aria-pressed="' + (ch.raceSkill === s) + '"' + (S.c.trained.has(s) && ch.raceSkill !== s ? ' disabled' : '') + '>' + D4.SKILLS[s].name + '</button>').join('') + '</div>',
  });
}
function pickPath() {
  const ch = S.cur, c = S.c;
  openPicker({
    title: 'Paragon path', showAll: false, clear: 'path',
    items: sh => Object.entries(D4.paths).filter(([k, p]) => sh.showAll || !p.cls || p.cls === ch.cls || c.mcClasses.includes(p.cls))
      .map(([k, p]) => ({ id: k, name: p.n, meta: ((D4.classes[p.cls] || {}).name || 'Any class') + ' paragon path', sum: p.s, current: ch.path === k,
        detail: () => '<p>' + esc(p.s) + '</p><p>' + extLink(D4.lookupUrl('paragonpath', p.n), 'Features and powers on the 4e Database') + '</p>' })),
    chips: sh => '<div class="chips"><button class="chip" data-act="pkShowAll" aria-pressed="' + !!sh.showAll + '">All classes</button><button class="chip" data-act="pkClear">Clear</button></div>',
    intro: () => '<div class="note-box">Paths add features at 11th and 16th level and powers at 11th, 12th and 20th. Only names and concepts are built in: open the full text, then paste the features below and add the path\'s powers in their slots.' +
      (ch.path ? '<label class="field" style="margin:10px 0 0"><span>Your path\'s features (pasted text)</span><textarea data-bind="pathText" placeholder="Paste the path features here">' + esc(ch.pathText) + '</textarea></label>' : '') +
      '<button class="linkbtn" data-act="customPath" data-kind="path">' + IC.plus + 'A path from another book</button> ' + extLink(D4.lookupBase + '?list.full.paragonpath', 'Browse all paths') + '</div>',
    choose: id => { ch.path = id; UI.close(); commit(); },
  });
}
function pickDestiny() {
  const ch = S.cur;
  openPicker({
    title: 'Epic destiny', clear: 'destiny',
    items: () => Object.entries(D4.destinies).map(([k, p]) => ({ id: k, name: p.n, meta: 'Epic destiny', sum: p.s, current: ch.destiny === k, detail: () => '<p>' + esc(p.s) + '</p><p>' + extLink(D4.lookupUrl('epicdestiny', p.n), 'Features and powers on the 4e Database') + '</p>' })),
    chips: () => '<div class="chips"><button class="chip" data-act="pkClear">Clear</button></div>',
    intro: () => '<div class="note-box">Destinies add features at 21st, 24th and 30th level and a utility power at 26th. Open the full text, then paste the features here.' +
      (ch.destiny ? '<label class="field" style="margin:10px 0 0"><span>Your destiny\'s features (pasted text)</span><textarea data-bind="destinyText" placeholder="Paste the destiny features here">' + esc(ch.destinyText) + '</textarea></label>' : '') +
      '<button class="linkbtn" data-act="customPath" data-kind="destiny">' + IC.plus + 'A destiny from another book</button></div>',
    choose: id => { ch.destiny = id; UI.close(); commit(); },
  });
}

/* ---------- paste from the 4e Database ---------- */
function openPaste(target) {
  UI.open({
    title: { power: 'Paste a power', feat: 'Paste a feat', item: 'Paste a magic item', path: 'Paragon path', destiny: 'Epic destiny' }[target.kind] || 'Paste text',
    full: true, target, parsed: null, text: '',
    body: sh => {
      let h = '<div class="note-box">1. Open the entry on the ' + extLink(target.url || D4.lookupBase + '?list', '4e Database') + '.<br>2. Select all of its text and copy it.<br>3. Paste it below and tap Read. The text is saved only on this device.</div>' +
        '<label class="field"><span>Entry text</span><textarea id="paste-text" data-pastebox="1" placeholder="Paste here">' + esc(sh.text) + '</textarea></label>' +
        '<div class="row-gap"><button class="btn" data-act="clipPaste">' + IC.paste + 'Paste from clipboard</button><button class="btn primary" data-act="readPaste">Read text</button></div>';
      const p = sh.parsed;
      if (p) {
        const f = (k, label, val) => '<label class="field"><span>' + label + '</span><input data-pbind="' + k + '" value="' + esc(val == null ? '' : val) + '"></label>';
        h += '<h3 class="sec-title">Check what was read</h3>' + f('n', 'Name', p.n);
        if (target.kind === 'power') {
          h += '<div class="grid2">' + f('l', 'Level', p.l) + '<label class="field"><span>Class</span><select data-pbind="cls"><option value="">Other</option>' + Object.values(D4.classes).map(cl => '<option value="' + cl.id + '"' + (p.cls === cl.id ? ' selected' : '') + '>' + esc(cl.name) + '</option>').join('') + '</select></label>' +
            '<label class="field"><span>Usage</span><select data-pbind="u">' + [['aw', 'At-will'], ['enc', 'Encounter'], ['day', 'Daily']].map(([k, n]) => '<option value="' + k + '"' + (p.u === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
            '<label class="field"><span>Type</span><select data-pbind="ty">' + [['atk', 'Attack'], ['util', 'Utility'], ['feature', 'Feature']].map(([k, n]) => '<option value="' + k + '"' + (p.ty === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>' +
            f('k', 'Keywords', p.k) + f('r', 'Range', p.r) + f('x', 'Numbers for the calculator (ability/defense/damage)', p.x) +
            '<p class="small muted">Example: str/AC/2W+str means Strength vs. AC, 2[W] + Strength modifier damage. Leave it empty for powers without an attack.</p>' +
            '<h3 class="sec-title">Preview</h3>' + powerCard(Object.assign({ id: 'preview' }, p, { l: +p.l || p.l }), { c: S.c, open: true, noFoot: true });
        } else if (target.kind === 'feat') {
          h += '<div class="grid2"><label class="field"><span>Tier</span><select data-pbind="tier">' + [['H', 'Heroic'], ['P', 'Paragon'], ['E', 'Epic']].map(([k, n]) => '<option value="' + k + '"' + (p.tier === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>' +
            f('pre', 'Prerequisite', p.pre) + '<p><b>Benefit:</b> ' + linkify(p.b || '') + '</p><p class="small muted">If the feat changes a number (defense, skill, hit points), add it under Your own bonuses on the Sheet tab.</p>';
        } else {
          h += '<p style="white-space:pre-wrap" class="small">' + linkify(p.text) + '</p>';
        }
      }
      return h;
    },
    foot: sh => sh.parsed ? '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="savePaste">Save' + (target.slot || target.kind === 'path' || target.kind === 'destiny' ? ' and use' : '') + '</button>' : '<button class="btn" data-act="closeSheet">Cancel</button>',
  });
}
function savePaste() {
  const sh = topSheet(), t = sh.target, p = sh.parsed, ch = S.cur;
  if (!p || !p.n) { toast('Give it a name first.'); return; }
  const slug = p.n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (t.kind === 'power') {
    const lines = D4.powerLines(p);
    const firstHit = (lines.find(([k]) => k === 'Hit' || k === 'Effect') || [])[1] || '';
    const entry = { n: p.n, cls: p.cls || undefined, who: p.who, l: +p.l || undefined, u: p.u || 'enc', ty: p.ty || 'atk', k: p.k, a: p.a, r: p.r, lines: p.lines, x: p.x || undefined, x21: p.x21, s: p.flavor || firstHit.split('. ')[0].slice(0, 140), src: 'user' };
    Object.keys(entry).forEach(k => { if (entry[k] === undefined || entry[k] === '') delete entry[k]; });
    let id = t.override;
    if (id) D4.userdb.powers[id] = Object.assign(entry, { override: true });
    else { id = 'user-' + (p.cls || 'x') + '-' + slug; D4.userdb.powers[id] = entry; }
    D4.saveUserDB();
    if (t.slot) { assignPower(t.slot, t.book, id); return; }
    toast('Saved ' + p.n + '.');
  } else if (t.kind === 'feat') {
    const id = 'user-' + slug;
    D4.userdb.feats[id] = { n: p.n, tier: p.tier || 'H', cat: 'Pasted', pre: p.pre, b: p.b, s: (p.b || '').split('. ')[0].slice(0, 140) };
    D4.saveUserDB();
    if (t.slot) { ch.feats[t.slot] = { id }; UI.closeAll(); commit(); return; }
    toast('Saved ' + p.n + '.');
  } else if (t.kind === 'item') {
    const id = 'user-' + slug;
    D4.userdb.items[id] = { n: p.n, kind: 'magic', slot: 'Magic item', lvl: p.lvl, text: p.text };
    D4.saveUserDB();
    ch.inv.push({ uid: D4.uid(), id, qty: 1, eq: false });
    toast('Added ' + p.n + '. Open it to equip it or add its bonuses.');
  } else if (t.kind === 'path' || t.kind === 'destiny') {
    ch[t.kind] = 'custom'; ch[t.kind + 'Name'] = p.n; ch[t.kind + 'Text'] = p.text;
  }
  UI.closeAll(); commit();
}

/* ---------- gear ---------- */
function addItem() {
  openPicker({
    title: 'Add equipment', cat: 'weapon',
    items: sh => Object.values(D4.items).filter(i => i.id !== 'unarmed' && (sh.cat === 'all' || (sh.cat === 'armor' ? ['armor', 'shield'].includes(i.kind) : i.kind === sh.cat)))
      .map(i => ({ id: i.id, name: i.n, meta: itemMeta(i), sum: i.kind === 'weapon' ? i.dmg + (i.rng ? ', range ' + i.rng : '') + ', ' + (S.c.isProficient(i) ? 'proficient' : 'not proficient') : (i.desc || '').slice(0, 100), band: i.kind === 'magic' ? 'u-item' : '', detail: () => itemDetail(i) })),
    chips: sh => '<div class="chips">' + [['weapon', 'Weapons'], ['armor', 'Armor and shields'], ['implement', 'Implements'], ['gear', 'Gear'], ['magic', 'Magic items'], ['all', 'All']].map(([k, n]) => '<button class="chip" data-act="pkCat" data-val="' + k + '" aria-pressed="' + (sh.cat === k) + '">' + n + '</button>').join('') + '</div>',
    after: () => '<button class="btn block" data-act="customItem" style="margin-top:8px">' + IC.plus + 'Custom item</button>',
    choose: id => {
      const it = D4.items[id];
      const entry = { uid: D4.uid(), id, qty: 1, eq: false, enh: it.kind === 'magic' && it.levels ? 1 : 0 };
      if (['armor', 'shield', 'weapon', 'implement'].includes(it.kind) && !S.cur.inv.some(i => i.eq && D4.items[i.id] && D4.items[i.id].kind === it.kind)) entry.eq = true;
      if (it.min) { entry.enh = it.min; entry.magic = 'magic-armor'; }
      S.cur.inv.push(entry);
      const price = it.kind === 'magic' ? D4.magicPrice(it, entry.enh || 1) : it.price || 0;
      UI.close(); commit();
      toast('Added ' + it.n + (entry.eq ? ' (equipped)' : '') + '.', price ? { label: 'Pay ' + D4.gp(price), fn: () => { S.cur.gp = Math.round((+S.cur.gp - price) * 100) / 100; commit(); toast('Paid ' + D4.gp(price) + '.'); } } : null);
    },
  });
}
function itemMeta(i) {
  if (i.kind === 'weapon') return (D4.WEAPON_CATS[i.cat] || 'Improvised') + ' · ' + (i.groups || []).join(', ') + ' · ' + D4.gp(i.price);
  if (i.kind === 'armor') return i.weight + ' armor · +' + i.ac + ' AC' + (i.mw ? ' · masterwork (+' + i.min + ' or better)' : ' · ' + D4.gp(i.price));
  if (i.kind === 'magic') return (i.slot || ('Magic ' + i.applies)) + (i.levels ? ' · levels ' + i.levels.join(', ') : i.lvl ? ' · level ' + i.lvl : '');
  return ({ shield: 'Shield', implement: 'Implement', gear: 'Adventuring gear' }[i.kind] || '') + (i.price != null ? ' · ' + D4.gp(i.price) : '');
}
function editItem(uid) {
  UI.open({
    title: 'Item', uid, full: true,
    body: () => {
      const ch = S.cur, i = ch.inv.find(x => x.uid === uid);
      if (!i) return '<p>This item was removed.</p>';
      const b = D4.items[i.id] || Object.assign({ kind: 'gear', n: 'Custom item' }, i.custom || {});
      const canEnh = ['weapon', 'armor', 'implement'].includes(b.kind) || (b.kind === 'magic' && b.levels);
      const magics = Object.values(D4.items).filter(m => m.kind === 'magic' && m.applies === b.kind);
      let h = '<h3 style="font-size:20px;margin:0 0 8px">' + esc(D4.itemName(i)) + '</h3>' +
        '<label class="check"><input type="checkbox" data-change="itemEq" data-uid="' + uid + '"' + (i.eq ? ' checked' : '') + '><span><b>Equipped</b> <span class="muted small">(worn or in hand: counts toward your numbers)</span></span></label>' +
        '<div class="row-gap" style="align-items:center;margin:6px 0 12px"><span class="label">Quantity</span><span class="stepper"><button data-act="itemQty" data-uid="' + uid + '" data-d="-1" aria-label="Fewer">−</button><b>' + (+i.qty || 1) + '</b><button data-act="itemQty" data-uid="' + uid + '" data-d="1" aria-label="More">+</button></span></div>';
      if (canEnh) {
        h += '<div class="row-gap" style="align-items:center;margin:0 0 12px"><span class="label">Enhancement bonus</span><span class="stepper"><button data-act="itemEnh" data-uid="' + uid + '" data-d="-1" aria-label="Lower">−</button><b>+' + (+i.enh || 0) + '</b><button data-act="itemEnh" data-uid="' + uid + '" data-d="1" aria-label="Higher">+</button></span></div>';
        if (magics.length) h += '<label class="field"><span>Magic item</span><select data-change="itemMagic" data-uid="' + uid + '"><option value="">None (mundane)</option>' + magics.map(m => '<option value="' + m.id + '"' + (i.magic === m.id ? ' selected' : '') + '>' + esc(m.n) + '</option>').join('') + '</select></label>';
        const m = i.magic ? D4.items[i.magic] : (b.kind === 'magic' ? b : null);
        if (m && m.levels) h += '<p class="small muted">Item level ' + D4.magicLevel(m, +i.enh || 1) + ', market price ' + D4.gp(D4.magicPrice(m, +i.enh || 1)) + '.</p>';
        if (m && m !== b) h += '<p class="small">' + linkify(m.desc) + (m.crit ? ' Critical: ' + esc(m.crit) + '.' : '') + '</p>';
      }
      h += '<label class="field"><span>Name (optional)</span><input data-change="itemName" data-uid="' + uid + '" value="' + esc(i.name || '') + '" placeholder="' + esc(D4.itemName(Object.assign({}, i, { name: '' }))) + '"></label>' +
        '<label class="field"><span>Notes</span><textarea data-change="itemNotes" data-uid="' + uid + '" style="min-height:70px">' + esc(i.notes || '') + '</textarea></label>' +
        '<h3 class="sec-title">Bonuses while equipped</h3>' + (i.mods || []).map((m, k) => '<div class="row-gap" style="align-items:center;margin-bottom:6px"><span class="chip">' + esc(D4.fmt(+m.v) + ' ' + modTargetName(m.t) + ' (' + (m.type || 'item') + ')') + '</span><button class="iconbtn" data-act="delItemMod" data-uid="' + uid + '" data-i="' + k + '" aria-label="Remove bonus">' + IC.trash + '</button></div>').join('') +
        '<button class="btn small" data-act="addMod" data-uid="' + uid + '">' + IC.plus + 'Add a bonus</button>' +
        '<h3 class="sec-title">About</h3>' + itemDetail(b) +
        '<button class="btn danger block" data-act="delItem" data-uid="' + uid + '" style="margin-top:12px">' + IC.trash + 'Remove from inventory</button>';
      return h;
    },
  });
}
function customItem() {
  UI.open({
    title: 'Custom item', draft: { n: '', kind: 'gear', wt: 0, price: 0, desc: '' },
    body: sh => '<label class="field"><span>Name</span><input data-dbind="n" value="' + esc(sh.draft.n) + '" autofocus></label>' +
      '<div class="grid2"><label class="field"><span>Weight (lb)</span><input inputmode="decimal" data-dbind="wt" value="' + esc(sh.draft.wt) + '"></label><label class="field"><span>Price (gp)</span><input inputmode="decimal" data-dbind="price" value="' + esc(sh.draft.price) + '"></label></div>' +
      '<label class="field"><span>Description</span><textarea data-dbind="desc">' + esc(sh.draft.desc) + '</textarea></label><p class="small muted">After adding, open the item to add bonuses (for example +1 item bonus to Will).</p>',
    foot: () => '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="saveCustomItem">Add</button>',
  });
}

/* ---------- other sheets ---------- */
function showBreakdown(key) {
  const c = S.c;
  const names = { AC: 'Armor Class', Fort: 'Fortitude', Ref: 'Reflex', Will: 'Will', hp: 'Maximum hit points', surges: 'Healing surges per day', surgeValue: 'Healing surge value', init: 'Initiative', speed: 'Speed', save: 'Saving throws' };
  const desc = D4.DEFENSES[key] ? D4.DEFENSES[key].desc : { hp: 'Class hit points at 1st level + your Constitution score, plus the class amount for each level after 1st.', surges: 'Class healing surges + Constitution modifier.', surgeValue: 'One-quarter of your maximum hit points, rounded down.', init: 'Dexterity modifier + one-half your level + bonuses. Roll d20 + this at the start of combat.', speed: 'Squares you can move with a move action. Heavy armor slows most races.', save: 'Roll a d20 + this at the end of your turn for each effect a save can end: 10 or higher ends it.' }[key] || '';
  const parts = c.parts[key] || [], sit = c.sit[key] || [];
  const total = key === 'save' ? D4.fmt(c.save) : key === 'init' ? D4.fmt(c.init) : D4.sum(parts);
  UI.open({
    title: (names[key] || key) + ': ' + total,
    body: () => '<p>' + linkify(desc) + '</p><div class="card"><dl class="kv">' + parts.map(p => '<dt>' + esc(p.l) + '</dt><dd>' + D4.fmt(p.v) + '</dd>').join('') + '<dt><b>Total</b></dt><dd>' + total + '</dd></dl></div>' +
      (sit.length ? '<h3 class="sec-title">Only in some situations</h3><ul>' + sit.map(s => '<li>' + D4.fmt(s.v) + ' ' + esc(s.note) + ' <span class="muted">(' + esc(s.l) + ')</span></li>').join('') + '</ul>' : ''),
  });
}
function showCalc(pid, line) {
  const c = S.c;
  const p = D4.powers[pid] || D4.basicAttacks(c).find(x => x.id === pid);
  if (!p) return;
  const ln = D4.attackLines(c, p)[line];
  if (!ln) return;
  UI.open({
    title: p.n + (ln.label ? ': ' + ln.label : ''),
    body: () => (ln.auto ? '<p>No attack roll: it hits automatically.</p>' : '<h3 class="sec-title">Attack roll: d20 ' + D4.fmt(ln.atk) + ' vs ' + esc(ln.def) + '</h3><div class="card"><dl class="kv">' + ln.atkParts.map(x => '<dt>' + esc(x.l) + '</dt><dd>' + D4.fmt(x.v) + '</dd>').join('') + '</dl></div>') +
      (ln.dmg != null ? '<h3 class="sec-title">Damage: ' + esc(ln.dmg) + '</h3><div class="card"><dl class="kv">' + (ln.dmgParts.length ? ln.dmgParts.map(x => '<dt>' + esc(x.l) + '</dt><dd>' + D4.fmt(x.v) + '</dd>').join('') : '<dt>Dice only</dt><dd></dd>') + '</dl></div>' +
        (ln.crit ? '<p class="small">Critical hit (natural 20): <b>' + esc(ln.crit) + '</b> damage.</p>' : '') : '') +
      (ln.sit.length ? '<h3 class="sec-title">Only in some situations</h3><ul>' + ln.sit.map(s => '<li>' + D4.fmt(s.v) + ' to ' + s.kind + ' ' + esc(s.note) + ' <span class="muted">(' + esc(s.l) + ')</span></li>').join('') + '</ul>' : '') +
      '<p class="small muted">Not included: combat advantage (+2), flanking, cover, charge (+1) and other bonuses that depend on the moment.</p>',
  });
}
function charMenu() {
  UI.open({
    title: S.cur.name || 'Character',
    body: () => '<div class="stack">' +
      '<button class="btn block" data-act="exportChar">Export character file</button>' +
      '<button class="btn block" data-act="copyChar">Copy character as text</button>' +
      '<button class="btn block" data-act="dupChar">Duplicate</button>' +
      '<button class="btn danger block" data-act="delChar">' + IC.trash + 'Delete character</button></div>',
  });
}
function settingsSheet() {
  UI.open({
    title: 'Settings and about',
    body: () => '<h3 class="sec-title" style="padding-top:0">Theme</h3><div class="chips">' + [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([k, n]) => '<button class="chip" data-act="theme" data-val="' + k + '" aria-pressed="' + (S.settings.theme === k) + '">' + n + '</button>').join('') + '</div>' +
      '<h3 class="sec-title">About Paragon</h3><p>A character builder and play tracker for Dungeons &amp; Dragons 4th Edition, made for phones. It works offline once loaded, and keeps your characters in this browser.</p>' +
      '<p>Built in: the races and classes of Player\'s Handbook 1 and 2, the heroic-tier powers of the eight Player\'s Handbook 1 classes, common feats, all Player\'s Handbook weapons and armor, and key magic items. All descriptions are short summaries written for this app, not the published text. Some powers have only a one-line summary.</p>' +
      '<p>For everything else (paragon and epic powers, other books, hybrid classes), open the entry on the ' + extLink(D4.lookupBase + '?list', '4e Database') + ', copy it and paste it in. Pasted entries stay on this device.</p>' +
      '<p class="small muted">Dungeons &amp; Dragons is a trademark of Wizards of the Coast. This is an unofficial fan tool.</p>' +
      '<h3 class="sec-title">Your data</h3><div class="stack"><button class="btn block" data-act="exportAll">Export all characters</button><button class="btn block" data-act="importChar">Import a character or backup</button>' +
      '<button class="btn block" data-act="loadSample">Add the sample character</button><button class="btn danger block" data-act="wipe">Delete everything</button></div>',
  });
}
function importSheet() {
  UI.open({
    title: 'Import', text: '',
    body: sh => '<p>Choose a file exported from Paragon, or paste its text.</p><input type="file" accept=".json,application/json,text/plain" data-change="importFile" aria-label="Character file" style="margin:0 0 12px">' +
      '<label class="field"><span>Or paste the character text</span><textarea data-pastebox="import" placeholder="{ ... }">' + esc(sh.text) + '</textarea></label>',
    foot: () => '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="importText">Import</button>',
  });
}
function importData(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { toast('That isn\'t a Paragon character file.'); return false; }
  const list = Array.isArray(data) ? data : data && data.characters ? data.characters : [data];
  let n = 0;
  list.forEach(ch => {
    if (!ch || typeof ch !== 'object' || !ch.base) return;
    D4.normalize(ch);
    if (S.chars[ch.id]) ch.id = D4.newCharacter().id;
    S.chars[ch.id] = ch;
    Store.set('char.' + ch.id, ch);
    updateIndex(ch);
    n++;
  });
  if (data && data.userdb) { ['powers', 'feats', 'items'].forEach(k => Object.assign(D4.userdb[k], data.userdb[k] || {})); D4.saveUserDB(); }
  toast(n ? 'Imported ' + plural(n, 'character') + '.' : 'No characters found in that file.');
  return n > 0;
}
function download(name, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch (e) { toast('Your browser blocked the download. Use Copy instead.'); }
}
function copyText(text, done) {
  const fallback = () => {
    UI.open({ title: 'Copy this text', body: () => '<p class="small">Select all and copy.</p><textarea class="inp" style="min-height:240px;font-size:13px" readonly>' + esc(text) + '</textarea>' });
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(done), fallback);
  else fallback();
}
function openTerm(t) { UI.open({ title: t.charAt(0).toUpperCase() + t.slice(1), body: () => termDetail(t) }); }
function addModSheet(uid) {
  UI.open({
    title: 'Add a bonus', draft: { t: 'AC', v: 1, type: uid ? 'item' : 'untyped', note: '', sit: false }, uid,
    body: sh => '<label class="field"><span>Applies to</span><select data-dbind="t">' + Object.entries(MOD_TARGETS).map(([k, n]) => '<option value="' + k + '"' + (sh.draft.t === k ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' +
      '<div class="grid2"><label class="field"><span>Amount</span><input inputmode="numeric" data-dbind="v" value="' + esc(sh.draft.v) + '"></label>' +
      '<label class="field"><span>Bonus type</span><select data-dbind="type">' + ['untyped', 'item', 'feat', 'power', 'enh', 'racial', 'shield'].map(k => '<option value="' + k + '"' + (sh.draft.type === k ? ' selected' : '') + '>' + (k === 'enh' ? 'enhancement' : k) + '</option>').join('') + '</select></label></div>' +
      (uid ? '' : '<label class="field"><span>Source (what gives it)</span><input data-dbind="note" value="' + esc(sh.draft.note) + '" placeholder="e.g. Cloak of Distortion"></label>') +
      '<p class="small muted">Bonuses of the same type don\'t stack: only the highest counts. Untyped bonuses add up.</p>',
    foot: () => '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="saveMod">Add</button>',
  });
}
function hpInput(mode) {
  UI.open({
    title: { damage: 'Take damage', heal: 'Regain hit points', temp: 'Temporary hit points' }[mode], mode, val: '',
    body: sh => '<input class="bignum" inputmode="numeric" data-hpval="1" value="' + esc(sh.val) + '" aria-label="Amount" autofocus>' +
      '<div class="keypad">' + [1, 2, 3, 5, 10, 15, 20, S.c.surgeValue].map(n => '<button data-act="hpQuick" data-n="' + n + '">' + (n === S.c.surgeValue ? 'Surge ' + n : '+' + n) + '</button>').join('') + '</div>' +
      (mode === 'damage' ? '<p class="small muted">Temporary hit points are lost first.</p>' : mode === 'heal' ? '<p class="small muted">If you are below 0, healing starts from 0.</p>' : '<p class="small muted">Temporary hit points don\'t stack: you keep the higher amount.</p>'),
    foot: () => '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn ' + (mode === 'damage' ? 'danger' : 'primary') + '" data-act="hpApply">' + { damage: 'Take damage', heal: 'Heal', temp: 'Set temporary HP' }[mode] + '</button>',
  });
}
function applyHP(mode, n) {
  const c = S.c, pl = S.cur.play;
  n = Math.max(0, Math.floor(+n || 0));
  if (!n) return;
  let cur = D4.curHP(c);
  if (mode === 'damage') {
    const t = Math.min(+pl.temp || 0, n);
    pl.temp = (+pl.temp || 0) - t;
    cur -= (n - t);
    toast('Took ' + n + ' damage' + (t ? ' (' + t + ' from temporary hit points)' : '') + '.');
  } else if (mode === 'heal') {
    cur = Math.min(c.hp, Math.max(0, cur) + n);
    if (cur > 0) pl.deathFails = 0;
    toast('Regained ' + n + ' hit points.');
  } else if (mode === 'temp') pl.temp = Math.max(+pl.temp || 0, n);
  pl.hp = cur >= c.hp ? null : cur;
  commit();
}

/* ---------- sample character ---------- */
function sampleCharacter() {
  const ch = D4.newCharacter();
  Object.assign(ch, {
    name: 'Brakka Ironfist', level: 3, xp: 2400, race: 'dwarf', raceAbil: 'str', cls: 'fighter', clsOpt: { talent: 'two' }, build: 'great',
    base: { str: 16, con: 14, dex: 13, int: 10, wis: 14, cha: 8 }, abilMethod: 'pointbuy',
    skills: ['athletics', 'endurance', 'intimidate'], langs: [], deity: 'Moradin', alignment: 'Lawful Good',
    feats: { f1: { id: 'toughness' }, f2: { id: 'weapon-focus', choice: 'Axe' } },
    powers: { aw1: 'fighter-cleave', aw2: 'fighter-reaping-strike', enc1: 'fighter-steel-serpent-strike', day1: 'fighter-brute-strike', util2: 'fighter-unstoppable', enc3: 'fighter-crushing-blow' },
    gp: 38, appearance: 'Broad as a door, braided red beard, a greataxe older than she is.', background: 'Sample character. Delete her any time from the character menu.',
    inv: [
      { uid: D4.uid(), id: 'scale', qty: 1, eq: true, enh: 1, magic: 'magic-armor' },
      { uid: D4.uid(), id: 'greataxe', qty: 1, eq: true },
      { uid: D4.uid(), id: 'handaxe', qty: 2 },
      { uid: D4.uid(), id: 'adventurers-kit', qty: 1 },
      { uid: D4.uid(), id: 'potion-of-healing', qty: 1 },
    ],
  });
  return ch;
}
