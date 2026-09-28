/* Reads a power, feat, item, paragon path or epic destiny pasted from the 4e Database (or any compendium page)
   and turns it into an entry the builder can use. The text stays on your device. */
'use strict';

D4.LABELS = ['Target', 'Targets', 'Primary Target', 'Primary Targets', 'Secondary Target', 'Secondary Targets', 'Tertiary Target', 'Attack', 'Primary Attack', 'Secondary Attack', 'Tertiary Attack',
  'Hit', 'Miss', 'Effect', 'Special', 'Requirement', 'Requirements', 'Trigger', 'Prerequisite', 'Prerequisites', 'Aftereffect', 'Level 11', 'Level 21', 'Level 16', 'Level 26',
  'Sustain Minor', 'Sustain Standard', 'Sustain Move', 'Sustain Free', 'Sustain No Action', 'First Failed Saving Throw', 'Second Failed Saving Throw', 'Failed Saving Throw',
  'Benefit', 'Benefits', 'Property', 'Properties', 'Enhancement', 'Critical', 'Power', 'Item Slot', 'Weapon', 'Implement', 'Armor', 'Price', 'Channel Divinity', 'Keywords', 'Components', 'Category', 'Time', 'Duration', 'Component Cost', 'Market Price', 'Key Skill'];
D4.ACTION_WORDS = { standard: 'std', move: 'move', minor: 'minor', free: 'free', no: 'no', opportunity: 'opp' };
const ABIL_WORDS = { strength: 'str', constitution: 'con', dexterity: 'dex', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
const DEF_WORDS = { ac: 'AC', 'armor class': 'AC', fortitude: 'Fort', reflex: 'Ref', will: 'Will' };

D4.parseEntry = function (text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .filter(l => !/^published in\b/i.test(l) && !/^(update|errata)/i.test(l));
  if (!lines.length) return null;
  const out = { n: '', lines: [], kind: 'power' };
  const classNames = Object.values(D4.classes).map(c => c.name).concat(['Hybrid', 'Swordmage', 'Artificer', 'Assassin', 'Monk', 'Psion', 'Ardent', 'Battlemind', 'Runepriest', 'Seeker', 'Vampire', 'Blackguard', 'Binder', 'Hexblade', 'Elementalist', 'Knight', 'Slayer', 'Scout', 'Thief', 'Mage', 'Warpriest', 'Sentinel', 'Cavalier', 'Hunter', 'Skald', 'Protector', 'Berserker', 'Executioner', 'Mariner', 'Witch']);
  let i = 0;

  /* Header: "Name  Class Attack 1", or the name on its own line followed by "Class Attack 1" */
  const typeRe = /^(.*?)\s*\b([A-Z][\w'\- ]*?)\s+(Attack|Utility|Feature|Racial Power|Racial Utility|Racial Attack|Attack Technique|Utility Technique)\s+(\d+)$/;
  for (let j = 0; j < Math.min(3, lines.length); j++) {
    const m = lines[j].match(typeRe);
    if (!m) continue;
    let name = m[1], who = m[2];
    const words = (m[1] + ' ' + m[2]).trim().split(' ');
    for (let k = 1; k <= Math.min(3, words.length); k++) {
      const tail = words.slice(-k).join(' ');
      if (classNames.includes(tail) || /^(Paragon Path|Epic Destiny|Theme|Item|Dragonborn|Dwarf|Eladrin|Elf|Half-Elf|Halfling|Human|Tiefling|Deva|Gnome|Goliath|Half-Orc|Shifter)$/.test(tail)) { who = tail; name = words.slice(0, -k).join(' '); break; }
    }
    if (!name && j > 0) name = lines[j - 1];
    out.n = name.trim();
    out.who = who;
    out.ty = /Utility/.test(m[3]) ? 'util' : /Feature/.test(m[3]) ? 'feature' : 'atk';
    out.l = +m[4];
    const cls = Object.keys(D4.classes).find(k => D4.classes[k].name === who);
    if (cls) out.cls = cls;
    i = j + 1;
    break;
  }
  if (!out.n) {
    /* Not a power: feat, item, path or destiny */
    out.n = lines[0].replace(/\s*\[[^\]]*\]\s*$/, '').replace(/\s+(Heroic|Paragon|Epic) Tier$/i, '').replace(/\s+Level \d+\+?$/i, '').trim();
    const all = lines.join('\n');
    if (/^Benefits?:/m.test(all)) out.kind = 'feat';
    else if (/Item Slot:|Enhancement:|Critical:|\bgp\b/.test(all)) out.kind = 'item';
    else if (/Epic Destiny/i.test(all)) out.kind = 'destiny';
    else if (/Paragon Path/i.test(all) || /Path Features?/i.test(all)) out.kind = 'path';
    else out.kind = 'other';
    const tier = all.match(/\b(Heroic|Paragon|Epic) Tier\b/i);
    if (tier) out.tier = tier[1][0].toUpperCase();
    const lv = lines[0].match(/Level (\d+)/i);
    if (lv) out.lvl = +lv[1];
    i = 1;
  }

  /* Body */
  let last = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    let m;
    if (out.kind === 'power' && (m = l.match(/^(At-Will|Encounter|Daily)\b\s*(?:(?:✦|♦|•|\*|·|◆|\|)\s*(.*))?$/i))) {
      out.u = { 'at-will': 'aw', encounter: 'enc', daily: 'day' }[m[1].toLowerCase()];
      out.k = (m[2] || '').trim();
      last = null; continue;
    }
    if (out.kind === 'power' && (m = l.match(/^(Standard|Move|Minor|Free|No|Opportunity) Action\b\s*(.*)$/i))) {
      out.a = D4.ACTION_WORDS[m[1].toLowerCase()]; out.r = m[2].trim(); last = null; continue;
    }
    if (out.kind === 'power' && (m = l.match(/^Immediate (Interrupt|Reaction)\b\s*(.*)$/i))) {
      out.a = m[1].toLowerCase() === 'interrupt' ? 'int' : 'rea'; out.r = m[2].trim(); last = null; continue;
    }
    if ((m = l.match(/^([A-Z][A-Za-z0-9 ()'\-]{1,40}?):\s*(.*)$/)) && (D4.LABELS.includes(m[1]) || /^(Level \d+|Sustain \w+|Hit|Miss|Effect|Special)\b/.test(m[1]) || m[1].split(' ').length <= 4)) {
      last = [m[1], m[2]]; out.lines.push(last); continue;
    }
    if (last) last[1] += (last[1] ? ' ' : '') + l;
    else if (!out.flavor && out.kind === 'power' && !out.u) out.flavor = l;
    else out.lines.push(['', l]);
  }
  out.text = lines.join('\n');

  /* Numbers for the calculator */
  if (out.kind === 'power') {
    const get = lbl => { const x = out.lines.find(([k]) => k === lbl || k === 'Primary ' + lbl); return x ? x[1] : ''; };
    const atk = get('Attack'), hit = get('Hit');
    if (atk) {
      const defM = atk.match(/vs\.?\s*(AC|Armor Class|Fortitude|Reflex|Will)/i);
      const abils = [...atk.toLowerCase().matchAll(/(strength|constitution|dexterity|intelligence|wisdom|charisma)/g)].map(x => ABIL_WORDS[x[1]]);
      const bonus = atk.match(/(?:strength|constitution|dexterity|intelligence|wisdom|charisma)\s*([+-])\s*(\d+)\s*vs/i);
      if (defM && abils.length) {
        const ab = [...new Set(abils)].join('|') + (bonus ? bonus[1] + bonus[2] : '');
        const def = DEF_WORDS[defM[1].toLowerCase()];
        out.x = ab + '/' + def + '/' + (D4.dmgFromText(hit) || '0');
        const l21 = get('Level 21');
        const d21 = D4.dmgFromText(l21);
        if (d21) out.x21 = d21;
      }
    } else {
      /* Auto-damage effects like magic missile */
      const eff = get('Effect');
      if (/takes? .*damage/i.test(eff) && !/attack/i.test(eff)) { const d = D4.dmgFromText(eff); if (d) out.x = 'auto/-/' + d; }
    }
    for (const [k, v] of out.lines) {
      const map = { Target: 't', Targets: 't', Attack: 'atk', Hit: 'hit', Miss: 'miss', Effect: 'eff', Special: 'spec', Requirement: 'req', Trigger: 'trig', Aftereffect: 'aft', 'Level 21': 'l21' };
      if (map[k] && out[map[k]] == null) out[map[k]] = v;
    }
    if (!out.ty) out.ty = 'atk';
    if (out.ty === 'atk' && !out.atk && out.u && /utility/i.test(out.text)) out.ty = 'util';
  }
  if (out.kind === 'feat') {
    const b = out.lines.find(([k]) => /^Benefits?$/.test(k));
    const p = out.lines.find(([k]) => /^Prerequisites?$/.test(k));
    out.b = b ? b[1] : out.text;
    out.pre = p ? p[1] : '';
  }
  return out;
};

/* "2[W] + Strength modifier damage" -> "2W+str"; "3d8 + Charisma modifier" -> "3d8+cha" */
D4.dmgFromText = t => {
  if (!t) return '';
  const s = t.split(/\bdamage\b/i)[0];
  const parts = [];
  let m;
  if ((m = s.match(/(\d+)\s*\[W\]/i))) parts.push(m[1] + 'W');
  const dice = s.match(/(\d+)d(\d+)/i);
  if (dice && !/\[W\]/i.test(s.slice(0, s.indexOf(dice[0])))) parts.push(dice[1] + 'd' + dice[2]);
  else if (dice && !parts.length) parts.push(dice[1] + 'd' + dice[2]);
  const abilPart = s.match(/((?:strength|constitution|dexterity|intelligence|wisdom|charisma)(?:\s+(?:or|and|\+)\s+(?:strength|constitution|dexterity|intelligence|wisdom|charisma))*)\s+modifier/gi) || [];
  abilPart.forEach(seg => {
    const words = [...seg.toLowerCase().matchAll(/(strength|constitution|dexterity|intelligence|wisdom|charisma)/g)].map(x => ABIL_WORDS[x[1]]);
    if (/\bor\b/i.test(seg)) parts.push([...new Set(words)].join('|'));
    else words.forEach(w => parts.push(w));
  });
  const flat = s.match(/^\s*(\d+)\s*\+/);
  if (flat && !parts.some(p => /W|d/.test(p))) parts.unshift(flat[1]);
  return parts.join('+');
};

/* Store what you paste: your personal compendium, kept in this browser. */
D4.userdb = { powers: {}, feats: {}, items: {}, paths: {}, destinies: {}, text: {} };
D4.loadUserDB = function () {
  try { const s = localStorage.getItem('paragon4e.userdb'); if (s) Object.assign(D4.userdb, JSON.parse(s)); } catch (e) { /* storage unavailable */ }
  D4.applyUserDB();
};
D4.saveUserDB = function () {
  try { localStorage.setItem('paragon4e.userdb', JSON.stringify(D4.userdb)); } catch (e) { /* storage unavailable */ }
  D4.applyUserDB();
};
D4.applyUserDB = function () {
  const db = D4.userdb;
  for (const id in db.powers) {
    const u = db.powers[id];
    if (u.override && D4.powers[id] && !D4.powers[id].user) {
      const orig = D4.powers[id]._orig || D4.powers[id];
      D4.powers[id] = Object.assign({}, orig, u, { id, user: false, pasted: true, _orig: orig });
    } else D4.powers[id] = Object.assign({}, u, { id, user: true });
  }
  for (const id in db.feats) D4.feats[id] = Object.assign({}, db.feats[id], { id, user: true });
  for (const id in db.items) D4.items[id] = Object.assign({ kind: 'gear' }, db.items[id], { id, user: true });
  for (const id in db.paths) D4.paths[id] = Object.assign({}, db.paths[id], { user: true });
  for (const id in db.destinies) D4.destinies[id] = Object.assign({}, db.destinies[id], { user: true });
};
