/* Paragon rules engine: turns a saved character into every number on the sheet,
   with a breakdown of where each number comes from. */
'use strict';

D4.uid = () => Math.random().toString(36).slice(2, 10);

D4.newCharacter = () => ({
  v: 1, id: 'c' + Date.now().toString(36) + D4.uid().slice(0, 4),
  name: '', player: '', level: 1, xp: 0,
  race: '', raceAbil: '', raceOpt: {}, raceSkill: '', dilettante: '',
  cls: '', clsOpt: {}, build: '',
  custom: { cls: { name: '', role: 'Striker', source: 'Martial', hp1: 12, hpLvl: 5, surges: 7, def: { Fort: 0, Ref: 0, Will: 0 }, choose: 4, list: [], armor: ['cloth'], shields: [], weapons: ['simple-melee', 'simple-ranged'], implements: [], features: '' },
            race: { name: '', size: 'medium', speed: 6, vision: 'Normal', abil1: '', abil2: '', skill1: '', skill2: '', traits: '' } },
  abilMethod: 'pointbuy', base: { str: 10, con: 10, dex: 10, int: 10, wis: 10, cha: 10 },
  ups: {}, skills: [], skillOneOf: '', feats: {}, powers: {}, spellbook: {}, extraPowers: [],
  path: '', pathText: '', destiny: '', destinyText: '',
  langs: [], deity: '', alignment: 'Unaligned', gender: '', age: '', height: '', weight: '', appearance: '', background: '', notes: '',
  inv: [], gp: 100, mods: [],
  play: { hp: null, temp: 0, surgesUsed: 0, ap: 1, deathFails: 0, secondWind: false, used: {}, conds: [], ongoing: '' },
  created: Date.now(), updated: Date.now(),
});

/* Upgrade characters saved by older versions and fill any missing fields. */
D4.normalize = ch => {
  const d = D4.newCharacter();
  for (const k in d) if (ch[k] === undefined) ch[k] = d[k];
  for (const k in d.custom) ch.custom[k] = Object.assign({}, d.custom[k], ch.custom[k] || {});
  ch.play = Object.assign({}, d.play, ch.play || {});
  return ch;
};

D4.fmt = n => (n >= 0 ? '+' : '−') + Math.abs(n);
D4.sum = parts => parts.reduce((a, p) => a + (p.v || 0), 0);

/* Stacking: bonuses of the same type don't stack (use the highest); untyped bonuses and penalties add up. */
D4.stack = mods => {
  const best = {}, out = [];
  for (const m of mods) {
    if (!m.type || m.type === 'untyped' || m.v < 0) { out.push(m); continue; }
    if (!best[m.type] || m.v > best[m.type].v) best[m.type] = m;
  }
  return out.concat(Object.values(best));
};

D4.getClass = ch => {
  if (ch.cls === 'custom') {
    const cc = ch.custom.cls, base = D4.classes.custom;
    return Object.assign({}, base, {
      name: cc.name || 'Custom class', role: cc.role, source: cc.source, hp1: +cc.hp1 || 0, hpLvl: +cc.hpLvl || 0, surges: +cc.surges || 0,
      def: cc.def, armor: cc.armor, shields: cc.shields, weapons: cc.weapons, implements: cc.implements,
      skills: { choose: +cc.choose || 0, list: cc.list && cc.list.length ? cc.list : Object.keys(D4.SKILLS) },
      features: cc.features ? [{ name: 'Class features', desc: cc.features }] : [],
    });
  }
  return D4.classes[ch.cls] || null;
};

D4.getRace = ch => {
  if (ch.race === 'custom') {
    const r = ch.custom.race, abil = {}, skills = {};
    if (r.abil1) abil[r.abil1] = 2;
    if (r.abil2 && r.abil2 !== r.abil1) abil[r.abil2] = 2;
    if (r.skill1) skills[r.skill1] = 2;
    if (r.skill2 && r.skill2 !== r.skill1) skills[r.skill2] = 2;
    return { name: r.name || 'Custom race', src: 'Custom', size: r.size, speed: +r.speed || 6, vision: r.vision, abil: { fixed: abil }, skills, langs: ['Common'], extraLangs: 1,
      desc: 'A race you define yourself.', traits: r.traits ? [{ name: 'Racial traits', desc: r.traits }] : [], custom: true };
  }
  return D4.races[ch.race] || null;
};

/* ---------- ability scores ---------- */
D4.pointCost = base => {
  let spent = 0, low = 0;
  for (const a of D4.ABILS) {
    const s = base[a];
    if (s < 10) low++;
    spent += D4.POINT_BUY[s] != null ? D4.POINT_BUY[s] : 99;
  }
  return { spent: spent + 2, budget: D4.POINT_BUY_BUDGET + 2, ok: low <= 1 && spent <= D4.POINT_BUY_BUDGET, tooLow: low > 1 };
};

/* ---------- damage formulas ---------- */
/* "2W+str+cha" -> {w: 2, dice: [], abil: ['str', 'cha'], flat: 0} */
D4.parseDmg = f => {
  const out = { w: 0, dice: [], abil: [], flat: 0, none: false };
  if (f === '0' || f === '' || f == null) { out.none = true; return out; }
  String(f).split('+').forEach(tok => {
    tok = tok.trim();
    let m;
    if ((m = tok.match(/^(\d+)W$/i))) out.w += +m[1];
    else if ((m = tok.match(/^(\d+)d(\d+)$/i))) out.dice.push([+m[1], +m[2]]);
    else if (/^-?\d+$/.test(tok)) out.flat += +tok;
    else if (tok) out.abil.push(tok);
  });
  return out;
};
D4.abilVal = (c, code) => {
  if (!code) return 0;
  if (code.includes('|')) return Math.max(...code.split('|').map(a => c.mod[a] || 0));
  return c.mod[code] || 0;
};
D4.abilName = code => code.split('|').map(a => (D4.ABIL[a] || {}).short || a).join('/');
D4.diceText = dice => {
  const byDie = {};
  dice.forEach(([n, d]) => { byDie[d] = (byDie[d] || 0) + n; });
  return Object.keys(byDie).sort((a, b) => b - a).map(d => byDie[d] + 'd' + d).join(' + ');
};

/* ---------- the calculator ---------- */
D4.calc = function (ch) {
  D4.normalize(ch);
  const lvl = Math.max(1, Math.min(30, +ch.level || 1));
  const c = { ch, lvl, half: Math.floor(lvl / 2), tier: D4.tier(lvl), issues: [], sit: {}, parts: {} };
  const race = c.race = D4.getRace(ch);
  const cls = c.cls = D4.getClass(ch);

  /* Ability scores */
  c.score = {}; c.mod = {}; c.abilParts = {};
  for (const a of D4.ABILS) {
    const parts = [{ l: 'Base', v: +ch.base[a] || 10 }];
    if (race) {
      if (race.abil.fixed && race.abil.fixed[a]) parts.push({ l: race.name, v: race.abil.fixed[a] });
      if ((race.abil.choice || race.abil.any) && ch.raceAbil === a && !(race.abil.fixed && race.abil.fixed[a])) parts.push({ l: race.name + ' (choice)', v: 2 });
    }
    for (const L of D4.ABILITY_UP_LEVELS) if (L <= lvl && (ch.ups[L] || []).includes(a)) parts.push({ l: 'Level ' + L, v: 1 });
    for (const L of D4.ABILITY_ALL_LEVELS) if (L <= lvl) parts.push({ l: 'Level ' + L + ' (all)', v: 1 });
    c.abilParts[a] = parts;
    c.score[a] = D4.sum(parts);
    c.mod[a] = D4.mod(c.score[a]);
  }

  /* Feats: slots by level, plus racial and class bonus feats */
  c.featSlots = [];
  for (const L of D4.FEAT_LEVELS) if (L <= lvl) c.featSlots.push({ slot: 'f' + L, lvl: L, label: 'Feat' });
  if (race && race.bonusFeat) c.featSlots.splice(1, 0, { slot: 'fh', lvl: 1, label: 'Human bonus feat' });
  c.bonusFeats = [];
  if (cls) {
    (cls.bonusFeats || []).forEach(id => c.bonusFeats.push({ id, src: cls.name }));
    if (ch.cls === 'ranger') {
      if (ch.clsOpt.style === 'archer') c.bonusFeats.push({ id: 'defensive-mobility', src: 'Archer Fighting Style' });
      if (ch.clsOpt.style === 'twoblade') c.bonusFeats.push({ id: 'toughness', src: 'Two-Blade Fighting Style' });
    }
  }
  c.feats = [];
  for (const s of c.featSlots) {
    const pick = ch.feats[s.slot];
    s.pick = pick && pick.id ? pick : null;
    s.feat = s.pick ? D4.feats[s.pick.id] : null;
    if (s.feat) c.feats.push({ id: s.pick.id, feat: s.feat, choice: s.pick.choice, slot: s.slot, lvl: s.lvl });
  }
  c.bonusFeats.forEach(b => { if (D4.feats[b.id]) c.feats.push({ id: b.id, feat: D4.feats[b.id], bonus: b.src }); });
  const hasFeat = id => c.feats.some(f => f.id === id);
  c.hasFeat = hasFeat;
  c.mcClasses = c.feats.filter(f => f.feat.mc).map(f => f.feat.mc);

  /* Skills */
  const skillList = cls ? cls.skills.list : [];
  const trained = new Set();
  if (cls) {
    (cls.skills.fixed || []).forEach(s => trained.add(s));
    if (cls.skills.oneOf && cls.skills.oneOf.includes(ch.skillOneOf)) trained.add(ch.skillOneOf);
  }
  const chosen = (ch.skills || []).filter(s => D4.SKILLS[s]);
  chosen.forEach(s => trained.add(s));
  if (race && race.bonusSkill && ch.raceSkill) trained.add(ch.raceSkill);
  c.feats.forEach(f => {
    if (f.feat.grant && f.feat.grant.skills) f.feat.grant.skills.forEach(s => trained.add(s));
    if (f.feat.choice && ['skill', 'classSkill'].includes(f.feat.choice.type) && f.choice && D4.SKILLS[f.choice] && f.id !== 'skill-focus') trained.add(f.choice);
  });
  c.trained = trained;
  c.skillInfo = { need: cls ? cls.skills.choose : 0, chosen: chosen.length, fixed: cls ? (cls.skills.fixed || []) : [], oneOf: cls ? cls.skills.oneOf : null, list: skillList };

  /* Proficiencies */
  const prof = c.prof = { armor: new Set(), shields: new Set(), weapons: new Set(), groups: new Set(), implements: new Set() };
  if (cls) {
    cls.armor.forEach(a => prof.armor.add(a));
    cls.shields.forEach(s => prof.shields.add(s));
    cls.weapons.forEach(w => prof.weapons.add(w));
    cls.implements.forEach(i => prof.implements.add(i));
  }
  if (race && race.profs) (race.profs.weapons || []).forEach(w => prof.weapons.add(w));
  c.profBase = { armor: new Set(prof.armor), shields: new Set(prof.shields) };
  c.feats.forEach(f => {
    const g = f.feat.grant || {};
    if (g.armor) prof.armor.add(g.armor);
    if (g.shield) prof.shields.add(g.shield);
    (g.groups || []).forEach(x => prof.groups.add(x));
    if (f.id === 'weapon-proficiency' && f.choice) prof.weapons.add(f.choice);
    if (f.feat.mc && D4.classes[f.feat.mc]) D4.classes[f.feat.mc].implements.forEach(i => prof.implements.add(i));
  });
  c.isProficient = w => {
    if (!w || w.id === 'unarmed') return false;
    if (prof.weapons.has(w.id) || prof.weapons.has(w.cat)) return true;
    if (w.cat !== 'improvised' && w.cat.indexOf('simple') !== 0 && (w.groups || []).some(g => prof.groups.has(g))) return true;
    return false;
  };

  /* Equipment */
  const eq = (ch.inv || []).filter(i => i.eq);
  const base = i => D4.items[i.id] || (i.custom ? Object.assign({ kind: i.custom.kind || 'gear' }, i.custom) : null);
  c.armor = null; c.shield = null; c.weapons = []; c.implements = []; c.magic = [];
  for (const i of eq) {
    const b = base(i);
    if (!b) continue;
    const enh = +i.enh || 0, magic = i.magic ? D4.items[i.magic] : null;
    const entry = Object.assign({}, b, { inv: i, enh, magicItem: magic, name: D4.itemName(i) });
    if (b.kind === 'armor' && !c.armor) c.armor = entry;
    else if (b.kind === 'shield' && !c.shield) c.shield = Object.assign(entry, { heavy: b.type === 'heavy' });
    else if (b.kind === 'weapon') { c.weapons.push(entry); if (b.imp) c.implements.push(entry); }
    else if (b.kind === 'implement') c.implements.push(entry);
    else if (b.kind === 'magic') c.magic.push(entry);
  }
  c.armorWeight = c.armor ? c.armor.weight : 'none';
  const shuriken = w => ch.cls === 'rogue' && w.id === 'shuriken';
  c.meleeWeapons = c.weapons.filter(w => !w.ranged);
  c.rangedWeapons = c.weapons.filter(w => w.ranged || (w.props || []).some(p => /thrown/i.test(p)));
  c.dualWield = c.meleeWeapons.length >= 2 && c.meleeWeapons.every(w => w.hands === 1);

  /* Collect modifiers */
  const mods = [];
  const add = (list, src, choice) => (list || []).forEach(m => {
    let [t, v, type, sitNote, when] = m;
    if (when && !when(c)) return;
    if (typeof t === 'function') t = t(c, choice);
    if (typeof v === 'function') v = v(c, choice);
    if (!v) return;
    mods.push({ t, v, type: type || 'untyped', src, sit: sitNote || null });
  });
  if (race) add(race.mods, race.name);
  if (cls) add(cls.mods, cls.name);
  if (ch.cls === 'wizard' && ch.clsOpt.implement === 'staff' && c.implements.some(i => i.imp === 'Staff')) mods.push({ t: 'AC', v: 1, type: 'untyped', src: 'Staff of Defense' });
  c.feats.forEach(f => add(f.feat.m, f.feat.n, f.choice));
  if (c.armor && c.armor.enh) mods.push({ t: 'AC', v: c.armor.enh, type: 'enh', src: c.armor.name });
  c.magic.forEach(mi => {
    if (mi.neck && mi.enh) ['Fort', 'Ref', 'Will'].forEach(d => mods.push({ t: d, v: mi.enh, type: 'enh', src: mi.name }));
    add(mi.m, mi.name);
  });
  (ch.mods || []).forEach(m => {
    if (m.on === false || !m.t || !+m.v) return;
    mods.push({ t: m.t, v: +m.v, type: m.type || 'untyped', src: m.note || 'Custom bonus', sit: m.sit ? (m.note || 'situational') : null });
  });
  (ch.inv || []).forEach(i => (i.eq && i.mods || []).forEach(m => {
    if (!m.t || !+m.v) return;
    mods.push({ t: m.t, v: +m.v, type: m.type || 'item', src: D4.itemName(i) });
  }));
  c.mods = mods;
  /* Sum the modifiers for one target, honoring bonus stacking. Situational ones are listed separately. */
  c.modParts = (...targets) => {
    const list = mods.filter(m => targets.includes(m.t));
    const active = list.filter(m => !m.sit), sit = list.filter(m => m.sit);
    const stacked = D4.stack(active);
    return { parts: stacked.map(m => ({ l: m.src + (m.type !== 'untyped' ? ' (' + (m.type === 'enh' ? 'enhancement' : m.type) + ')' : ''), v: m.v })), sit: sit.map(m => ({ l: m.src, v: m.v, note: m.sit })) };
  };
  const stat = (key, parts, ...targets) => {
    const mp = c.modParts(...targets);
    const all = parts.concat(mp.parts);
    c.parts[key] = all;
    c.sit[key] = mp.sit;
    return D4.sum(all);
  };

  /* Armor proficiency */
  const armorProf = !c.armor || prof.armor.has(c.armor.type);
  const shieldProf = !c.shield || prof.shields.has(c.shield.type);
  if (!armorProf) c.issues.push('You are not proficient with ' + c.armor.name + ': -2 to attack rolls and Reflex.');
  if (!shieldProf) c.issues.push('You are not proficient with your ' + c.shield.name + '.');

  /* Hit points and surges */
  c.hp = cls ? stat('hp', [{ l: cls.name + ' (1st level)', v: cls.hp1 }, { l: 'Constitution score', v: c.score.con }, { l: cls.hpLvl + ' per level after 1st', v: cls.hpLvl * (lvl - 1) }], 'hp') : 0;
  c.bloodied = Math.floor(c.hp / 2);
  c.surgeValue = stat('surgeValue', [{ l: 'One-quarter of max HP', v: Math.floor(c.hp / 4) }], 'surgeValue');
  c.surges = cls ? stat('surges', [{ l: cls.name, v: cls.surges }, { l: 'Constitution modifier', v: c.mod.con }], 'surges') : 0;

  /* Defenses */
  const half = { l: 'One-half level', v: c.half };
  const armorAbil = (() => {
    if (c.armorWeight === 'heavy') return null;
    let opts = ['dex', 'int'];
    if (ch.cls === 'druid' && ch.clsOpt.aspect === 'guardian') opts.push('con');
    if (ch.cls === 'sorcerer' && ch.clsOpt.source === 'dragon') opts.push('str');
    return opts.reduce((b, a) => c.mod[a] > c.mod[b] ? a : b, opts[0]);
  })();
  const acParts = [{ l: 'Base', v: 10 }, half];
  if (c.armor) acParts.push({ l: c.armor.name + ' (armor)', v: c.armor.ac });
  if (armorAbil) acParts.push({ l: D4.ABIL[armorAbil].name + ' (light or no armor)', v: c.mod[armorAbil] });
  if (c.shield && shieldProf) acParts.push({ l: c.shield.name + ' (shield)', v: c.shield.ac });
  c.def = {};
  c.def.AC = stat('AC', acParts, 'AC', 'def');
  const best = (a, b) => c.mod[a] >= c.mod[b] ? a : b;
  const defP = (d, a1, a2) => {
    const a = best(a1, a2), p = [{ l: 'Base', v: 10 }, half, { l: D4.ABIL[a].name + ' modifier', v: c.mod[a] }];
    if (cls && cls.def && +cls.def[d]) p.push({ l: cls.name + ' class bonus', v: +cls.def[d] });
    if (d === 'Ref' && c.shield && shieldProf) p.push({ l: c.shield.name + ' (shield)', v: c.shield.ac });
    if (d === 'Ref' && !armorProf) p.push({ l: 'Armor not proficient', v: -2 });
    return p;
  };
  c.def.Fort = stat('Fort', defP('Fort', 'str', 'con'), 'Fort', 'def');
  c.def.Ref = stat('Ref', defP('Ref', 'dex', 'int'), 'Ref', 'def');
  c.def.Will = stat('Will', defP('Will', 'wis', 'cha'), 'Will', 'def');

  /* Initiative, speed, senses */
  c.init = stat('init', [{ l: 'Dexterity modifier', v: c.mod.dex }, half], 'init');
  const speedParts = [{ l: race ? race.name : 'Base', v: race ? race.speed : 6 }];
  const armorSpeed = (c.armor ? c.armor.speed : 0) + (c.shield && c.shield.speed ? c.shield.speed : 0);
  if (armorSpeed && !(race && race.flags && race.flags.encumberedSpeed)) speedParts.push({ l: 'Armor', v: armorSpeed });
  c.speed = stat('speed', speedParts, 'speed');
  c.vision = race ? race.vision : 'Normal';
  if (c.feats.some(f => f.feat.grant && f.feat.grant.vision)) c.vision = 'Low-light';
  c.size = race ? D4.SIZES[race.size] : 'Medium';
  c.save = stat('save', [], 'save');
  c.saveNotes = (race && race.saves) || [];
  c.resist = race && race.resist ? race.resist.map(([t, v]) => ({ t, v: typeof v === 'function' ? v(c) : v })) : [];

  /* Skills */
  const acp = (c.armor ? c.armor.check : 0) + (c.shield ? c.shield.check : 0);
  c.acp = acp;
  c.skills = {};
  for (const s in D4.SKILLS) {
    const sk = D4.SKILLS[s], p = [{ l: D4.ABIL[sk.ab].name + ' modifier', v: c.mod[sk.ab] }, half];
    const tr = trained.has(s);
    if (tr) p.push({ l: 'Trained', v: 5 });
    if (race && race.skills && race.skills[s]) p.push({ l: race.name + ' (racial)', v: race.skills[s] });
    if (sk.armor && acp) p.push({ l: 'Armor check penalty', v: acp });
    const targets = ['skill:' + s, 'skills'];
    if (!tr) targets.push('untrained');
    c.skills[s] = { v: stat('skill:' + s, p, ...targets), trained: tr };
  }
  c.passive = { insight: 10 + c.skills.insight.v, perception: 10 + c.skills.perception.v };

  /* Languages */
  const langs = new Set(race ? race.langs : ['Common']);
  (ch.langs || []).forEach(l => langs.add(l));
  c.feats.forEach(f => { if (f.id === 'linguist' && Array.isArray(f.choice)) f.choice.forEach(l => langs.add(l)); });
  c.languages = [...langs];
  c.extraLangs = race ? (race.extraLangs || 0) : 0;

  /* Carrying */
  c.load = { normal: c.score.str * 10, heavy: c.score.str * 20, drag: c.score.str * 50,
    carried: (ch.inv || []).reduce((w, i) => { const b = base(i); return w + (b ? (+b.wt || 0) * (+i.qty || 1) : 0); }, 0) };

  D4.calcPowers(c);
  D4.calcIssues(c);
  return c;
};

D4.itemName = i => {
  if (i.name) return i.name;
  const b = D4.items[i.id];
  if (!b) return (i.custom && i.custom.n) || 'Item';
  const m = i.magic ? D4.items[i.magic] : null;
  const enh = +i.enh || 0;
  if (b.kind === 'magic') return b.n + (b.levels ? ' +' + Math.max(1, enh) : '');
  if (!m && !enh) return b.n;
  let n = b.n;
  if (m && m.id !== 'magic-weapon' && m.id !== 'magic-armor' && m.id !== 'magic-implement') n = m.n.split(' ')[0] + ' ' + n.charAt(0).toLowerCase() + n.slice(1);
  else if (m || enh) n = 'Magic ' + n.charAt(0).toLowerCase() + n.slice(1);
  return n + (enh ? ' +' + enh : '');
};

/* ---------- powers ---------- */
D4.calcPowers = function (c) {
  const ch = c.ch, cls = c.cls, race = c.race, lvl = c.lvl;
  const known = [];
  const push = (id, from, extra) => { const p = D4.powers[id]; if (p) known.push(Object.assign({ id, p, from }, extra || {})); };

  /* Granted powers */
  if (race) (race.powers || []).forEach(id => push(id, race.name));
  if (race && race.dilettante && ch.dilettante) push(ch.dilettante, 'Dilettante (once per encounter)', { useOverride: 'enc' });
  if (cls) {
    (cls.powers || []).forEach(id => push(id, cls.name + ' feature'));
    if (cls.optPowers) for (const k in cls.optPowers) ((cls.optPowers[k] || {})[ch.clsOpt[k]] || []).forEach(id => push(id, cls.name + ' feature'));
  }

  /* Chosen power slots */
  const atWillCount = (cls && cls.atWillSlots != null ? cls.atWillSlots : 2) + (race && race.bonusAtWill ? 1 : 0);
  const slots = [];
  for (let i = 1; i <= atWillCount; i++) slots.push({ id: 'aw' + i, lvl: 1, use: 'aw', label: race && race.bonusAtWill && i === atWillCount ? 'At-will attack (human bonus)' : 'At-will attack' });
  D4.POWER_SLOTS.forEach(s => { if (s.use !== 'aw' && s.lvl <= lvl) slots.push(Object.assign({}, s)); });
  const spellbook = !!(cls && cls.spellbook);
  const active = {};
  for (const s of slots) {
    const pick = ch.powers[s.id];
    const pid = pick && typeof pick === 'object' ? pick.id : pick;
    s.pick = pid || null;
    s.power = pid ? D4.powers[pid] : null;
    s.replaces = pick && typeof pick === 'object' ? pick.replaces : null;
    s.issues = [];
    if (spellbook && (s.use === 'day' || s.use === 'util') && !s.path && !s.destiny) {
      s.book = ch.spellbook[s.id] || null;
      s.bookPower = s.book ? D4.powers[s.book] : null;
    }
    if (s.power) {
      if (s.power.l && s.power.l > s.lvl) s.issues.push('This power is level ' + s.power.l + '; this slot allows level ' + s.lvl + ' or lower.');
      const kindOk = s.use === 'util' ? s.power.ty === 'util' : (s.power.u === s.use && s.power.ty !== 'util');
      if (!kindOk && !s.power.user) s.issues.push('This slot needs ' + (s.use === 'util' ? 'a utility power' : 'a' + (s.use === 'enc' ? 'n encounter' : s.use === 'day' ? ' daily' : 'n at-will') + ' attack power') + '.');
      if (!s.path && !s.destiny && s.power.cls && ch.cls !== 'custom' && s.power.cls !== ch.cls && !c.mcClasses.includes(s.power.cls))
        s.issues.push('This power belongs to another class.');
    }
    if (s.replace) {
      if (!s.replaces) { if (s.pick) s.issues.push('Choose which power this one replaces.'); }
      else if (!(s.replaces in active)) s.issues.push('The power it replaces isn\'t in your current list.');
      else delete active[s.replaces];
    }
    if (s.pick) active[s.id] = s;
  }
  c.powerSlots = slots;

  /* Duplicate check */
  const seen = {};
  Object.values(active).forEach(s => { if (seen[s.pick]) s.issues.push('You already have this power.'); seen[s.pick] = true; });

  Object.values(active).forEach(s => {
    push(s.pick, s.path ? 'Paragon path' : s.destiny ? 'Epic destiny' : 'Level ' + s.lvl + ' ' + (s.use === 'util' ? 'utility' : 'attack'), { slot: s.id });
    if (s.book) push(s.book, 'Spellbook (level ' + s.lvl + ')', { slot: s.id, book: true });
  });
  (ch.extraPowers || []).forEach(x => push(x.id, x.note || 'Added by you', { extra: true }));
  c.powers = known;
  c.activeSlots = active;
};

/* Attack and damage numbers for a power, for each weapon or implement it can use. */
D4.attackLines = function (c, p) {
  if (!p || !p.x || p.x === 'breath') return p && p.x === 'breath' ? D4.breathLine(c) : [];
  const specs = Array.isArray(p.x) ? p.x : [p.x];
  const kw = (p.k || '').toLowerCase(), range = (p.r || '').toLowerCase();
  const lines = [];
  const lvlDmg = spec => {
    let dmg = spec.dmg;
    if (c.lvl >= 21 && p.x21) dmg = p.x21;
    else if (c.lvl >= 11 && p.x11) dmg = p.x11;
    return dmg;
  };
  for (let raw of specs) {
    let mode = null;
    const pm = raw.match(/^(m|r|i):(.*)$/);
    if (pm) { mode = pm[1]; raw = pm[2]; }
    const [abRaw, def, dmgRaw] = raw.split('/');
    const spec = { dmg: dmgRaw };
    const abm = abRaw.match(/^([a-z|]+)([+-]\d+)?$/);
    const ab = abm ? abm[1] : abRaw, powerBonus = abm && abm[2] ? +abm[2] : 0;
    const dmgF = D4.parseDmg(lvlDmg(spec));
    if (!mode) {
      if (kw.includes('weapon')) mode = /ranged weapon/.test(range) && !/melee/.test(range) ? 'r' : 'm';
      else if (kw.includes('implement')) mode = 'i';
      else mode = 'n';
    }
    const common = (atkT, dmgT, extraAtk, extraDmg, label, dieFn, enh, weapon) => {
      const atkParts = [];
      if (ab !== 'auto') {
        atkParts.push({ l: D4.abilName(ab) + ' modifier', v: D4.abilVal(c, ab) }, { l: 'One-half level', v: c.half });
        if (powerBonus) atkParts.push({ l: 'Power bonus', v: powerBonus });
        extraAtk.forEach(x => atkParts.push(x));
        if (enh) atkParts.push({ l: 'Enhancement', v: enh });
        const mp = c.modParts(...atkT);
        mp.parts.forEach(x => atkParts.push(x));
        if (c.armor && !c.prof.armor.has(c.armor.type)) atkParts.push({ l: 'Armor not proficient', v: -2 });
      }
      let dice = [];
      if (dmgF.w && dieFn) dieFn(dmgF.w).forEach(d => dice.push(d));
      dmgF.dice.forEach(d => dice.push(d));
      const dmgParts = [];
      dmgF.abil.forEach(a => dmgParts.push({ l: D4.abilName(a) + ' modifier', v: D4.abilVal(c, a) }));
      if (dmgF.flat) dmgParts.push({ l: 'Base', v: dmgF.flat });
      let sit = [];
      if (!dmgF.none) {
        if (enh) dmgParts.push({ l: 'Enhancement', v: enh });
        extraDmg.forEach(x => dmgParts.push(x));
        const mp = c.modParts(...dmgT);
        mp.parts.forEach(x => dmgParts.push(x));
        sit = mp.sit;
      }
      const atkSit = ab !== 'auto' ? c.modParts(...atkT).sit : [];
      const dmgMod = D4.sum(dmgParts);
      lines.push({
        label, def: def === '-' ? null : def, auto: ab === 'auto',
        atk: D4.sum(atkParts), atkParts, dmgParts,
        dmg: dmgF.none ? null : (D4.diceText(dice) + (dmgMod ? (dice.length ? ' ' : '') + (dmgMod > 0 && dice.length ? '+ ' : dmgMod < 0 ? '− ' : '') + Math.abs(dmgMod) : (dice.length ? '' : '0'))).trim(),
        sit: atkSit.map(s => ({ l: s.l, v: s.v, note: s.note, kind: 'attack' })).concat(sit.map(s => ({ l: s.l, v: s.v, note: s.note, kind: 'damage' }))),
        crit: weapon ? D4.critText(c, weapon, dice, dmgMod) : null,
      });
    };
    if (mode === 'm' || mode === 'r') {
      const list = mode === 'm' ? c.meleeWeapons : c.rangedWeapons;
      const ws = list.length ? list.slice(0, mode === 'm' && c.dualWield ? 2 : 1) : [D4.items.unarmed];
      if (mode === 'r' && !c.rangedWeapons.length) { lines.push({ label: 'No ranged weapon equipped', none: true }); continue; }
      ws.forEach((w, idx) => {
        const extraAtk = [], extraDmg = [];
        if (c.isProficient(w)) extraAtk.push({ l: 'Proficiency (' + w.n.toLowerCase() + ')', v: w.prof });
        if (c.ch.cls === 'fighter' && c.ch.clsOpt.talent && mode === 'm' && ((c.ch.clsOpt.talent === 'one' && w.hands === 1) || (c.ch.clsOpt.talent === 'two' && w.hands === 2)))
          extraAtk.push({ l: 'Fighter Weapon Talent', v: 1 });
        if (c.ch.cls === 'rogue' && w.id === 'dagger') extraAtk.push({ l: 'Rogue Weapon Talent', v: 1 });
        const groupsT = (w.groups || []);
        const atkT = ['atk', 'atk.weapon', mode === 'm' ? 'atk.melee' : 'atk.ranged'].concat(groupsT.map(g => 'atk.group:' + g), ['atk.weapon:' + w.id]);
        const dmgT = ['dmg', 'dmg.weapon', mode === 'm' ? 'dmg.melee' : 'dmg.ranged'].concat(groupsT.map(g => 'dmg.group:' + g), ['dmg.weapon:' + w.id]);
        const die = D4.parseDmg(D4.weaponDie(c, w)).dice;
        const dieFn = n => die.map(([k, d]) => [k * n, d]);
        common(atkT, dmgT, extraAtk, extraDmg, (idx === 1 ? 'Off hand: ' : '') + (w.name || w.n), dieFn, w.enh || 0, w);
      });
    } else if (mode === 'i') {
      const imps = c.implements.length ? c.implements : [null];
      const usable = imps.filter(i => !i || c.prof.implements.has(i.imp));
      const list = usable.length ? usable : [null];
      list.slice(0, 1).forEach(i => {
        const atkT = ['atk', 'atk.implement'].concat(i ? ['atk.imp:' + i.imp] : []);
        const dmgT = ['dmg', 'dmg.implement'];
        common(atkT, dmgT, [], [], i ? (i.name || i.n) : 'No implement', null, i ? i.enh || 0 : 0, null);
      });
    } else {
      common(['atk'], ['dmg'], [], [], null, null, 0, null);
    }
  }
  return lines;
};

D4.weaponDie = (c, w) => {
  if (c.ch.cls === 'rogue' && w.id === 'shuriken') return '1d6';
  return w.dmg;
};
D4.critText = (c, w, dice, mod) => {
  const max = dice.reduce((a, [n, d]) => a + n * d, 0) + mod;
  const extra = [];
  if (w.magicItem && w.magicItem.crit && w.enh) extra.push(w.magicItem.crit.replace(/\+1d(\d+)(.*) per plus/, (m, d, rest) => '+' + w.enh + 'd' + d + rest));
  if ((w.props || []).includes('High crit')) extra.push('+' + c.tier + '[W] (high crit)');
  return max + (extra.length ? ' ' + extra.join(' ') : '');
};
D4.breathLine = c => {
  const ab = c.ch.raceOpt.breathAbil || 'con';
  const bonus = c.tier === 1 ? 2 : c.tier === 2 ? 4 : 6;
  const atkParts = [{ l: D4.ABIL[ab].name + ' modifier', v: c.mod[ab] }, { l: 'One-half level', v: c.half }, { l: 'Dragon breath bonus', v: bonus }];
  const mp = c.modParts('atk');
  mp.parts.forEach(x => atkParts.push(x));
  return [{ label: (c.ch.raceOpt.breathType || 'Chosen') + ' breath', def: 'Ref', atk: D4.sum(atkParts), atkParts,
    dmg: c.tier + 'd6 ' + D4.fmt(c.mod.con).replace('+', '+ ').replace('−', '− '), dmgParts: [{ l: 'Constitution modifier', v: c.mod.con }], sit: mp.sit }];
};

/* Basic attacks everyone has */
D4.basicAttacks = c => {
  const mba = { id: 'basic-melee', n: 'Melee Basic Attack', u: 'aw', ty: 'atk', k: 'Weapon', a: 'std', r: 'Melee weapon', t: 'One creature',
    atk: 'Strength vs. AC', hit: '1[W] + Strength modifier damage.', l21: '2[W] + Strength modifier damage.', s: 'Used for opportunity attacks, charges and when an ally grants you an attack.', x: 'str/AC/1W+str', x21: '2W+str', basic: true };
  const rba = { id: 'basic-ranged', n: 'Ranged Basic Attack', u: 'aw', ty: 'atk', k: 'Weapon', a: 'std', r: 'Ranged weapon', t: 'One creature',
    atk: 'Dexterity vs. AC', hit: '1[W] + Dexterity modifier damage.', l21: '2[W] + Dexterity modifier damage.', s: 'Heavy thrown weapons use Strength instead of Dexterity.', x: 'dex/AC/1W+dex', x21: '2W+dex', basic: true };
  return [mba, rba];
};

/* ---------- prerequisites ---------- */
D4.featUnmet = (f, c) => {
  const out = [];
  const tierLvl = { P: 11, E: 21 }[f.tier];
  if (tierLvl && c.lvl < tierLvl) out.push((f.tier === 'P' ? 'Paragon' : 'Epic') + ' tier (level ' + tierLvl + ')');
  const check = (r) => {
    const miss = [];
    if (!r) return miss;
    if (r.abil) for (const a in r.abil) if (c.score[a] < r.abil[a]) miss.push(D4.ABIL[a].short + ' ' + r.abil[a]);
    if (r.race) {
      const races = new Set([c.ch.race]);
      if (c.ch.race === 'half-elf') { races.add('human'); races.add('elf'); }
      if (!r.race.some(x => races.has(x))) miss.push(r.race.map(x => (D4.races[x] || {}).name || x).join(' or '));
    }
    if (r.cls && !r.cls.some(x => x === c.ch.cls)) miss.push(r.cls.map(x => D4.classes[x].name).join(' or ') + ' class');
    if (r.anyCls && !r.anyCls.some(x => x === c.ch.cls || c.mcClasses.includes(x))) miss.push('Channel Divinity class feature');
    if (r.train) r.train.forEach(s => { if (!c.trained.has(s)) miss.push('Trained in ' + D4.SKILLS[s].name); });
    if (r.feat) r.feat.forEach(id => { if (!c.hasFeat(id)) miss.push((D4.feats[id] || {}).n || id); });
    if (r.opt) for (const k in r.opt) if (c.ch.clsOpt[k] !== r.opt[k]) miss.push('Class option: ' + r.opt[k]);
    if (r.prof) {
      const ok = r.prof === 'light-shield' ? c.prof.shields.has('light') : c.prof.armor.has(r.prof);
      if (!ok) miss.push('Training with ' + r.prof.replace('-', ' '));
    }
    if (r.lvl && c.lvl < r.lvl) miss.push('Level ' + r.lvl);
    if (r.mcFeat && !c.mcClasses.length) miss.push('A class-specific multiclass feat');
    if (r.any) { const subs = r.any.map(check); if (!subs.some(s => !s.length)) miss.push(subs.map(s => s.join(', ')).join(' or ')); }
    return miss;
  };
  const g = f.grant || {};
  if (g.armor && c.profBase.armor.has(g.armor)) out.push('You already have this proficiency');
  if (g.shield && c.profBase.shields.has(g.shield)) out.push('You already have this proficiency');
  return out.concat(check(f.req));
};

/* ---------- things left to do ---------- */
D4.calcIssues = function (c) {
  const ch = c.ch, todo = [];
  if (!c.race) todo.push('Choose a race');
  if (!c.cls) todo.push('Choose a class');
  if (c.race && (c.race.abil.choice || c.race.abil.any) && !ch.raceAbil) todo.push('Choose your racial ability bonus');
  if (ch.abilMethod === 'pointbuy') { const pc = D4.pointCost(ch.base); if (!pc.ok) c.issues.push('Point buy: ' + (pc.tooLow ? 'only one score can be below 10.' : 'you have spent ' + pc.spent + ' of ' + pc.budget + ' points.')); }
  if (c.cls && c.skillInfo.chosen < c.skillInfo.need) todo.push('Choose ' + (c.skillInfo.need - c.skillInfo.chosen) + ' more trained skill' + (c.skillInfo.need - c.skillInfo.chosen > 1 ? 's' : ''));
  if (c.cls && c.skillInfo.oneOf && !c.skillInfo.oneOf.includes(ch.skillOneOf)) todo.push('Choose ' + c.skillInfo.oneOf.map(s => D4.SKILLS[s].name).join(' or '));
  for (const L of D4.ABILITY_UP_LEVELS) if (L <= c.lvl && (ch.ups[L] || []).length < 2) todo.push('Level ' + L + ': increase two ability scores');
  c.featSlots.forEach(s => {
    s.issues = [];
    if (!s.pick) { todo.push((s.slot === 'fh' ? 'Human bonus feat' : 'Level ' + s.lvl + ' feat')); return; }
    if (!s.feat) { s.issues.push('This feat is not in your compendium.'); return; }
    const unmet = D4.featUnmet(s.feat, c);
    if (unmet.length) s.issues.push('Prerequisites not met: ' + unmet.join(', '));
    if (s.feat.tier === 'P' && s.lvl < 11) s.issues.push('Paragon feats need a feat slot of level 11 or higher.');
    if (s.feat.tier === 'E' && s.lvl < 21) s.issues.push('Epic feats need a feat slot of level 21 or higher.');
    if (s.feat.choice && (s.pick.choice == null || s.pick.choice === '' || (Array.isArray(s.pick.choice) && !s.pick.choice.length))) s.issues.push('Choose: ' + s.feat.choice.label);
    if (!s.feat.repeat && c.featSlots.some(o => o !== s && o.pick && o.pick.id === s.pick.id)) s.issues.push('You already have this feat.');
  });
  c.powerSlots.forEach(s => {
    if (!s.pick) todo.push(s.label + ' (level ' + s.lvl + ')');
    else if (s.book === null && c.cls && c.cls.spellbook && (s.use === 'day' || s.use === 'util') && !s.path && !s.destiny) todo.push('Spellbook: second ' + (s.use === 'day' ? 'daily' : 'utility') + ' spell (level ' + s.lvl + ')');
  });
  if (c.race && c.race.dilettante && !ch.dilettante) todo.push('Dilettante power');
  if (c.race && c.race.bonusSkill && !ch.raceSkill) todo.push(c.race.name + ' bonus skill');
  if (c.cls && c.cls.options) c.cls.options.forEach(o => { if (!ch.clsOpt[o.id]) todo.push(o.label); });
  if (c.lvl >= 11 && !ch.path) todo.push('Paragon path');
  if (c.lvl >= 21 && !ch.destiny) todo.push('Epic destiny');
  if (c.extraLangs && (ch.langs || []).length < c.extraLangs) todo.push('Choose ' + c.extraLangs + ' extra language' + (c.extraLangs > 1 ? 's' : ''));
  c.todo = todo;
};

/* ---------- play tracking helpers ---------- */
D4.curHP = (c) => c.ch.play.hp == null ? c.hp : c.ch.play.hp;
D4.usesOf = (c, p) => (typeof p.uses === 'function' ? p.uses(c) : p.uses) || 1;
