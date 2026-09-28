/* Paragon UI helpers: storage, icons, bottom sheets, glossary links and entry cards. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

/* ---------- storage (every access guarded: private windows and blocked storage throw) ---------- */
const Store = {
  ok: true,
  get(k, d) { try { const v = localStorage.getItem('paragon4e.' + k); return v == null ? d : JSON.parse(v); } catch (e) { this.ok = false; return d; } },
  set(k, v) { try { localStorage.setItem('paragon4e.' + k, JSON.stringify(v)); return true; } catch (e) { this.ok = false; return false; } },
  del(k) { try { localStorage.removeItem('paragon4e.' + k); } catch (e) { /* ignore */ } },
};

/* ---------- icons ---------- */
const svg = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const IC = {
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  chev: svg('<path d="M9 18l6-6-6-6"/>'),
  more: svg('<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>'),
  close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  ext: svg('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  check: svg('<path d="M5 12l5 5L20 7"/>'),
  book: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  build: svg('<circle cx="6" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="6" cy="19" r="2"/><path d="M11 5h9M11 12h9M11 19h6"/>'),
  sheet: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  powers: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  bag: svg('<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  heart: svg('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>'),
  paste: svg('<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
};

/* ---------- back gesture: one guard history entry; "back" closes the top sheet, then returns home ---------- */
const UI = { sheets: [] };
const Nav = {
  armed: false,
  arm() { if (this.armed) return; try { history.pushState({ p4e: 1 }, ''); this.armed = true; } catch (e) { /* ignore */ } },
};
UI.open = opts => {
  opts.id = opts.id || D4.uid();
  opts.enter = true;
  UI.sheets.push(opts);
  Nav.arm();
  renderSheets();
  setTimeout(() => { const f = document.querySelector('.layer:last-child [autofocus]'); if (f && !('ontouchstart' in window)) f.focus(); }, 60);
  return opts;
};
UI.close = (n = 1) => {
  n = Math.min(n, UI.sheets.length);
  if (!n) return;
  UI.sheets.splice(-n, n);
  renderSheets();
};
UI.closeAll = () => UI.close(UI.sheets.length);
UI.refresh = () => renderSheets();

function renderSheets() {
  const root = $('#sheets');
  root.querySelectorAll('.layer').forEach(l => {
    const s = UI.sheets.find(x => x.id === l.dataset.id);
    if (s) s.scroll = l.querySelector('.sheet-body').scrollTop;
  });
  root.innerHTML = UI.sheets.map(s => '<div class="layer' + (s.enter ? ' enter' : '') + '" data-id="' + s.id + '">' +
    '<div class="scrim" data-act="closeSheet"></div>' +
    '<section class="sheet' + (s.full ? ' full' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(s.title) + '">' +
    '<header class="sheet-head"><h2>' + esc(s.title) + '</h2><button class="iconbtn" data-act="closeSheet" aria-label="Close">' + IC.close + '</button></header>' +
    '<div class="sheet-body">' + s.body(s) + '</div>' + (s.foot ? '<footer class="sheet-foot">' + s.foot(s) + '</footer>' : '') +
    '</section></div>').join('');
  root.querySelectorAll('.layer').forEach(l => {
    const s = UI.sheets.find(x => x.id === l.dataset.id);
    if (s && s.scroll) l.querySelector('.sheet-body').scrollTop = s.scroll;
  });
  UI.sheets.forEach(s => { s.enter = false; });
  document.body.style.overflow = UI.sheets.length ? 'hidden' : '';
  document.body.classList.toggle('has-sheet', UI.sheets.length > 0);
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, action) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button class="linkbtn" data-act="toastAction">' + esc(action.label) + '</button>' : '');
  el.hidden = false;
  UI.toastAction = action ? action.fn : null;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 6000 : 2600);
}

/* Confirmation inside the page (no browser dialogs). */
function confirmSheet(title, text, okLabel, onOk, danger) {
  UI.open({
    title,
    body: () => '<p>' + esc(text) + '</p>',
    foot: () => '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="confirmOk">' + esc(okLabel) + '</button>',
    onOk,
  });
}

/* ---------- glossary links ---------- */
const GLOSS = (() => {
  const skip = new Set(['At-Will', 'Encounter', 'Daily', 'Healing', 'Implement', 'Weapon', 'Charm', 'Fear', 'Illusion', 'Sleep', 'Poison', 'Martial', 'Arcane', 'Divine', 'Primal']);
  const terms = [];
  for (const [k, g] of Object.entries(D4.GLOSSARY)) {
    if (g.cat === 'Damage type' || skip.has(k)) continue;
    terms.push([k, k]);
    (g.alias || []).forEach(a => { if (a !== 'save') terms.push([a, k]); });
  }
  terms.sort((a, b) => b[0].length - a[0].length);
  const map = {};
  terms.forEach(([t, k]) => { map[t.toLowerCase()] = k; });
  const re = new RegExp('(^|[^A-Za-z\\[])(' + terms.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z])', 'gi');
  return { re, map };
})();
function linkify(text) {
  return esc(text).replace(GLOSS.re, (m, pre, term) => pre + '<button type="button" class="kw" data-act="term" data-term="' + esc(GLOSS.map[term.toLowerCase()]) + '">' + term + '</button>');
}
function kwChips(k) {
  if (!k) return '';
  return k.split(',').map(s => s.trim()).filter(Boolean).map(s => D4.GLOSSARY[s] ? '<button type="button" class="kwchip" data-act="term" data-term="' + esc(s) + '">' + esc(s) + '</button>' : '<span class="kwchip">' + esc(s) + '</span>').join(' ');
}
function extLink(url, label) {
  return '<a class="linkbtn" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || 'Full text') + IC.ext + '</a>';
}

/* ---------- power cards ---------- */
D4.powerLines = p => {
  if (p.lines && p.lines.length) return p.lines.filter(([k, v]) => v && !/^(Keywords|Published)/i.test(k));
  const L = [];
  if (p.req) L.push(['Requirement', p.req]);
  if (p.trig) L.push(['Trigger', p.trig]);
  if (p.t) L.push(['Target', p.t]);
  if (p.atk) L.push(['Attack', p.atk]);
  if (p.hit) L.push(['Hit', p.hit]);
  if (p.miss) L.push(['Miss', p.miss]);
  if (p.eff) L.push(['Effect', p.eff]);
  (p.more || []).forEach(x => L.push(x));
  if (p.sus) { const m = p.sus.match(/^(Sustain \w+):\s*(.*)$/); L.push(m ? [m[1], m[2]] : ['Sustain', p.sus]); }
  if (p.aft) L.push(['Aftereffect', p.aft]);
  if (p.spec) L.push(['Special', p.spec]);
  if (p.l21) L.push(['Level 21', p.l21]);
  return L;
};
const USE_CLASS = p => p.ty === 'feature' ? 'u-feat' : ({ aw: 'u-aw', enc: 'u-enc', day: 'u-day' }[p.u] || 'u-feat');
function powerType(p) {
  if (p.basic) return 'Basic Attack';
  if (p.src === 'race') {
    const r = Object.values(D4.races).find(x => (x.powers || []).includes(p.id));
    return (r ? r.name.replace(/ \(.*\)/, '') + ' ' : '') + 'Racial Power';
  }
  const who = p.cls ? (D4.classes[p.cls] || {}).name : (p.who || 'Custom');
  const kind = p.ty === 'util' ? 'Utility' : p.ty === 'feature' ? 'Feature' : 'Attack';
  return who + ' ' + kind + (p.l ? ' ' + p.l : '');
}
function calcBlock(c, p, key) {
  if (!c) return '';
  const lines = D4.attackLines(c, p);
  if (!lines.length) return '';
  return '<div class="calc">' + lines.map((ln, i) => {
    if (ln.none) return '<button type="button" disabled><span class="cw">' + esc(ln.label) + '</span></button>';
    const atk = ln.auto ? '<span class="ca">Auto-hit</span>' : '<span class="ca num">' + D4.fmt(ln.atk) + ' <small>vs ' + esc(ln.def || '') + '</small></span>';
    const dmg = ln.dmg != null ? '<span class="cd num">' + esc(ln.dmg) + ' <small>damage</small></span>' : '';
    const sit = ln.sit && ln.sit.length ? '<span class="cs">+ situational: ' + esc(ln.sit.map(s => D4.fmt(s.v) + ' ' + s.kind + ' ' + s.note).join('; ')) + '</span>' : '';
    return '<button type="button" data-act="calcInfo" data-pid="' + esc(p.id) + '" data-line="' + i + '">' + (ln.label ? '<span class="cw">' + esc(ln.label) + '</span>' : '') + atk + dmg + sit + '</button>';
  }).join('') + '</div>';
}
/* o: { c, from, key, open, play, noFoot, pick } */
function powerCard(p, o = {}) {
  const lines = D4.powerLines(p);
  const cls = USE_CLASS(p);
  const c = o.c;
  const usage = (D4.USAGE[o.useOverride || p.u] || {}).name || '';
  let uses = '';
  const useKey = o.key || p.id;
  if (c && o.play !== false && ((o.useOverride || p.u) !== 'aw' || p.usesPer) && !o.noFoot) {
    const n = D4.usesOf(c, p), used = (c.ch.play.used[useKey] || 0);
    uses = '<span class="used-toggle" role="group" aria-label="Uses">' + Array.from({ length: n }, (_, i) =>
      '<button type="button" data-act="toggleUse" data-key="' + esc(useKey) + '" data-n="' + n + '" data-i="' + i + '" aria-pressed="' + (i < used) + '" aria-label="' + (i < used ? 'Used' : 'Unused') + '">' + (i < used ? IC.check : '') + '</button>').join('') + '</span>';
  }
  const allUsed = c && uses && (c.ch.play.used[useKey] || 0) >= D4.usesOf(c, p);
  const body = '<div class="pc-body">' +
    '<div class="pc-meta"><span><b>' + esc(usage) + '</b>' + (p.k ? ' ✦ ' : '') + '</span>' + (p.k ? '<span>' + kwChips(p.k) + '</span>' : '') + '</div>' +
    ((p.a || p.r) ? '<div class="pc-meta"><span><b>' + esc(D4.ACTIONS[p.a] || '') + '</b></span><span>' + esc(p.r || '') + '</span></div>' : '') +
    (c ? calcBlock(c, p, useKey) : '') +
    (p.s && (!o.open || !lines.length) ? '<p class="pc-sum">' + linkify(p.s) + '</p>' : '') +
    (o.open && lines.length ? '<div class="pc-lines">' + lines.map(([k, v]) => '<p>' + (k ? '<b>' + esc(k) + ':</b> ' : '') + linkify(v) + '</p>').join('') + '</div>' : '') +
    (o.open && !lines.length ? '<div class="stub">Only a short summary is built in for this power. Open the full text on the 4e Database, or paste it here to keep it with your character.</div>' : '') +
    (o.open && p.pasted ? '<p class="pc-from">Text pasted by you.</p>' : '') +
    '</div>';
  const foot = o.noFoot ? '' : '<div class="pc-foot">' + (o.from ? '<span class="pc-from">' + esc(o.from) + '</span>' : '') + '<span class="spacer"></span>' +
    (!p.basic && !p.user ? extLink(D4.lookupUrl('power', p.n)) : '') +
    (o.open && !p.basic ? '<button class="linkbtn" data-act="pastePower" data-pid="' + esc(p.id) + '">' + IC.paste + (lines.length ? 'Replace text' : 'Paste text') + '</button>' : '') +
    uses + '</div>';
  return '<article class="pcard ' + cls + (allUsed ? ' is-used' : '') + '">' +
    (o.toggle ? '<button type="button" class="pc-head" data-act="togglePower" data-key="' + esc(o.key || p.id) + '" aria-expanded="' + !!o.open + '">' : '<div class="pc-head">') +
    '<span class="pc-name">' + esc(p.n) + '</span><span class="pc-type">' + esc(powerType(p)) + '</span>' + (o.toggle ? '</button>' : '</div>') +
    body + foot + '</article>';
}

/* ---------- detail blocks for other entry types ---------- */
function traitList(list) {
  return (list || []).map(t => '<p><b>' + esc(t.name) + '.</b> ' + linkify(t.desc) + '</p>').join('');
}
function raceDetail(r, id) {
  const abil = r.abil.any ? '+2 to one ability score of your choice' :
    Object.keys(r.abil.fixed || {}).map(a => '+2 ' + D4.ABIL[a].name).join(', ') + (r.abil.choice ? ', +2 ' + r.abil.choice.map(a => D4.ABIL[a].name).join(' or ') : '');
  const skills = Object.keys(r.skills || {}).map(s => '+' + r.skills[s] + ' ' + D4.SKILLS[s].name).join(', ');
  return '<p>' + esc(r.desc) + '</p>' +
    '<dl class="kv card" style="margin:10px 0">' +
    '<dt>Ability scores</dt><dd>' + esc(abil) + '</dd>' +
    '<dt>Size</dt><dd>' + esc(D4.SIZES[r.size]) + '</dd><dt>Speed</dt><dd>' + r.speed + ' squares</dd>' +
    '<dt>Vision</dt><dd>' + esc(r.vision) + '</dd>' + (skills ? '<dt>Skill bonuses</dt><dd>' + esc(skills) + '</dd>' : '') +
    '<dt>Languages</dt><dd>' + esc(r.langs.join(', ') + (r.extraLangs ? ' + ' + r.extraLangs + ' choice' : '')) + '</dd>' +
    (r.height ? '<dt>Height / weight</dt><dd>' + esc(r.height + ', ' + r.weight) + '</dd>' : '') + '</dl>' +
    traitList(r.traits) +
    (r.powers || []).map(pid => powerCard(D4.powers[pid], { open: true, noFoot: true })).join('') +
    (r.custom ? '' : '<p>' + extLink(D4.lookupUrl('race', r.name.replace(/ \(.*\)/, '')), 'Full text on the 4e Database') + '</p>');
}
function classDetail(cl) {
  const skillN = cl.skills.list.map(s => D4.SKILLS[s].name).join(', ');
  const def = Object.keys(cl.def || {}).filter(d => cl.def[d]).map(d => '+' + cl.def[d] + ' ' + D4.DEFENSES[d].name).join(', ');
  const weapons = cl.weapons.map(w => D4.WEAPON_CATS[w] || (D4.items[w] || {}).n || w).join(', ');
  const nPowers = Object.values(D4.powers).filter(p => p.cls === cl.id && p.l).length;
  return '<p>' + esc(cl.desc) + '</p>' +
    '<dl class="kv card" style="margin:10px 0">' +
    '<dt>Role</dt><dd>' + esc(cl.role) + '</dd><dt>Power source</dt><dd>' + esc(cl.source) + '</dd>' +
    '<dt>Key abilities</dt><dd>' + esc(cl.key.map(a => D4.ABIL[a].short).join(', ')) + '</dd>' +
    '<dt>Hit points</dt><dd>' + cl.hp1 + ' + Con score, +' + cl.hpLvl + '/level</dd>' +
    '<dt>Healing surges</dt><dd>' + cl.surges + ' + Con modifier</dd>' +
    (def ? '<dt>Defenses</dt><dd>' + esc(def) + '</dd>' : '') +
    '<dt>Armor</dt><dd>' + esc(cl.armor.join(', ') + (cl.shields.length ? '; ' + cl.shields.join(' and ') + ' shields' : '')) + '</dd>' +
    '<dt>Weapons</dt><dd>' + esc(weapons) + '</dd>' +
    (cl.implements.length ? '<dt>Implements</dt><dd>' + esc(cl.implements.join(', ')) + '</dd>' : '') +
    '<dt>Trained skills</dt><dd>' + esc((cl.skills.fixed ? cl.skills.fixed.map(s => D4.SKILLS[s].name).join(', ') + ' + ' : '') + (cl.skills.oneOf ? cl.skills.oneOf.map(s => D4.SKILLS[s].name).join(' or ') + ' + ' : '') + cl.skills.choose + ' more') + '</dd>' +
    '<dt>Built-in powers</dt><dd>' + (nPowers ? nPowers + ' (heroic tier)' : 'Add from the 4e Database') + '</dd>' +
    '</dl><p class="small muted">Class skills: ' + esc(skillN) + '</p>' +
    traitList(cl.features) +
    (cl.options || []).map(o => '<h3 class="sec-title">' + esc(o.label) + '</h3>' + Object.values(o.opts).map(x => '<p><b>' + esc(x.name) + '.</b> ' + linkify(x.desc) + '</p>').join('')).join('') +
    (cl.builds ? '<h3 class="sec-title">Suggested builds</h3>' + Object.values(cl.builds).map(b => '<p><b>' + esc(b.name) + '</b> <span class="muted">(' + esc(b.abil) + ')</span>. ' + esc(b.desc) + '</p>').join('') : '') +
    (cl.powers || []).map(pid => D4.powers[pid] ? powerCard(D4.powers[pid], { open: true, noFoot: true }) : '').join('') +
    (cl.custom ? '' : '<p>' + extLink(D4.lookupUrl('class', cl.name), 'Full text on the 4e Database') + '</p>');
}
function featDetail(f, c) {
  const unmet = c ? D4.featUnmet(f, c) : [];
  return '<p class="small"><span class="badge">' + esc(D4.TIER_NAMES[{ H: 1, P: 2, E: 3 }[f.tier]]) + '</span> ' + (f.cat ? '<span class="badge">' + esc(f.cat) + '</span> ' : '') + (f.src ? '<span class="badge">' + esc(f.src) + '</span>' : '') + '</p>' +
    (f.pre ? '<p><b>Prerequisite:</b> ' + esc(f.pre) + '</p>' : '') +
    (unmet.length ? '<p class="issue">Not met: ' + esc(unmet.join(', ')) + '</p>' : '') +
    '<p><b>Benefit:</b> ' + linkify(f.b || f.s || '') + '</p>' +
    (f.user ? '' : '<p>' + extLink(D4.lookupUrl('feat', f.n), 'Full text on the 4e Database') + '</p>');
}
function itemCat(it) { return it.kind === 'magic' ? 'item' : it.kind === 'shield' ? 'armor' : it.kind === 'gear' ? 'item' : it.kind; }
function itemDetail(it) {
  const rows = [];
  if (it.kind === 'weapon') {
    rows.push(['Category', (D4.WEAPON_CATS[it.cat] || 'Improvised') + ', ' + (it.hands === 2 ? 'two-handed' : 'one-handed')]);
    rows.push(['Proficiency bonus', '+' + it.prof], ['Damage', it.dmg]);
    if (it.rng) rows.push(['Range', it.rng + ' squares']);
    rows.push(['Group', (it.groups || []).join(', ')]);
    if (it.props && it.props.length) rows.push(['Properties', it.props.join(', ')]);
  }
  if (it.kind === 'armor') {
    rows.push(['Type', it.weight + ' armor (' + it.type + ')'], ['Armor bonus', '+' + it.ac], ['Check penalty', it.check || '0'], ['Speed', it.speed || '0']);
    if (it.min) rows.push(['Masterwork', 'only as magic armor +' + it.min + ' or better']);
  }
  if (it.kind === 'shield') rows.push(['Shield bonus', '+' + it.ac + ' AC and Reflex'], ['Check penalty', it.check || '0']);
  if (it.kind === 'implement') rows.push(['Implement', it.imp]);
  if (it.kind === 'magic') {
    if (it.levels) rows.push(['Levels', it.levels.map((l, i) => '+' + (i + 1) + ': ' + l).join(', ')]);
    else if (it.lvl) rows.push(['Level', it.lvl]);
    if (it.slot) rows.push(['Slot', it.slot]); else if (it.applies) rows.push(['Applies to', it.applies]);
    if (it.crit) rows.push(['Critical', it.crit]);
  }
  if (it.price != null && it.kind !== 'magic') rows.push(['Price', D4.gp(it.price)]);
  if (it.kind === 'magic' && it.levels) rows.push(['Price', D4.gp(D4.magicPrice(it, 1)) + ' (+1)']);
  else if (it.kind === 'magic' && (it.price || it.lvl)) rows.push(['Price', D4.gp(D4.magicPrice(it, 0))]);
  if (it.wt != null) rows.push(['Weight', it.wt + ' lb']);
  return (rows.length ? '<dl class="kv card" style="margin:0 0 10px">' + rows.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl>' : '') +
    (it.desc ? '<p>' + linkify(it.desc) + '</p>' : '') + (it.note ? '<p class="muted small">' + esc(it.note) + '</p>' : '') +
    (it.props || []).map(pr => D4.WEAPON_PROPS[pr] ? '<p class="small"><b>' + esc(pr) + ':</b> ' + linkify(D4.WEAPON_PROPS[pr]) + '</p>' : '').join('') +
    (it.text ? '<p class="small" style="white-space:pre-wrap">' + linkify(it.text) + '</p>' : '') +
    (it.user || it.id === 'unarmed' ? '' : '<p>' + extLink(D4.lookupUrl(itemCat(it), it.n.replace(/ \(.*\)$/, '')), 'Full text on the 4e Database') + '</p>');
}
D4.gp = n => {
  n = +n || 0;
  if (n >= 1 || n === 0) return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' gp';
  if (n >= 0.1) return Math.round(n * 10) + ' sp';
  return Math.round(n * 100) + ' cp';
};
function termDetail(t) {
  const g = D4.GLOSSARY[t];
  if (!g) return '<p>No definition.</p>';
  return '<p class="small"><span class="badge">' + esc(g.cat) + '</span></p><p>' + linkify(g.desc) + '</p><p>' + extLink(D4.lookupUrl('glossary', t), 'Full rules text') + '</p>';
}
