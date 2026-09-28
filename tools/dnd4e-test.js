/* Checks the Paragon (dnd4e/) rules engine and data: node tools/dnd4e-test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'dnd4e', 'js');
const files = ['rules', 'races', 'classes', 'powers-cleric', 'powers-fighter', 'powers-paladin', 'powers-ranger', 'powers-rogue',
  'powers-warlock', 'powers-warlord', 'powers-wizard', 'feats', 'items', 'paths', 'engine', 'parse'];
const ctx = { console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(ctx);
vm.runInContext(files.map(f => fs.readFileSync(path.join(dir, f + '.js'), 'utf8')).join('\n;\n') + '\n;this.D4 = D4;', ctx, { filename: 'dnd4e.js' });
const D4 = ctx.D4;
let fails = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (ok ? '' : ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)));
};

/* Data integrity */
const powerIds = new Set(Object.keys(D4.powers));
for (const r of Object.values(D4.races)) (r.powers || []).forEach(id => eq('race power exists: ' + id, powerIds.has(id), true));
for (const c of Object.values(D4.classes)) {
  (c.powers || []).forEach(id => eq('class power exists: ' + id, powerIds.has(id), true));
  (c.bonusFeats || []).forEach(id => eq('bonus feat exists: ' + id, !!D4.feats[id], true));
  if (c.optPowers) for (const k in c.optPowers) for (const v in c.optPowers[k]) c.optPowers[k][v].forEach(id => eq('option power exists: ' + id, powerIds.has(id), true));
}
for (const p of Object.values(D4.powers)) if (p.x && p.x !== 'breath') {
  const specs = Array.isArray(p.x) ? p.x : [p.x];
  specs.forEach(s => eq('calc spec parses: ' + p.id, /^(?:[mri]:)?(auto|[a-z|]+(?:[+-]\d+)?)\/(AC|Fort|Ref|Will|-)\/[\w+|]+$/.test(s), true));
}
for (const f of Object.values(D4.feats)) if (f.req && f.req.feat) f.req.feat.forEach(id => eq('feat prereq exists: ' + id, !!D4.feats[id], true));

/* A level 1 dwarf fighter: Str 18 (16 + 2), Con 16 (14 + 2), Dex 12, Wis 13, Int 10, Cha 8 */
const ch = D4.newCharacter();
Object.assign(ch, { name: 'Brakka', race: 'dwarf', raceAbil: 'str', cls: 'fighter', clsOpt: { talent: 'two' } });
ch.base = { str: 16, con: 14, dex: 12, int: 10, wis: 13, cha: 8 };
ch.skills = ['athletics', 'endurance', 'intimidate'];
ch.feats = { f1: { id: 'toughness' } };
ch.powers = { aw1: 'fighter-cleave', aw2: 'fighter-reaping-strike', enc1: 'fighter-steel-serpent-strike', day1: 'fighter-brute-strike' };
ch.inv = [{ uid: 'a', id: 'scale', qty: 1, eq: true }, { uid: 'b', id: 'greataxe', qty: 1, eq: true }, { uid: 'c', id: 'handaxe', qty: 2 }];
let c = D4.calc(ch);
eq('point buy spent (3 points left)', [D4.pointCost(ch.base).spent, D4.pointCost(ch.base).ok], [19, true]);
eq('Str score', c.score.str, 18);
eq('Con score', c.score.con, 16);
eq('HP = 15 + Con 16 + Toughness 5', c.hp, 36);
eq('bloodied', c.bloodied, 18);
eq('surge value', c.surgeValue, 9);
eq('surges = 9 + Con mod 3', c.surges, 12);
eq('AC = 10 + scale 7', c.def.AC, 17);
eq('Fort = 10 + Str 4 + class 2', c.def.Fort, 16);
eq('Ref = 10 + Dex 1', c.def.Ref, 11);
eq('Will = 10 + Wis 1', c.def.Will, 11);
eq('speed: dwarf 5 ignores armor', c.speed, 5);
eq('initiative', c.init, 1);
eq('Athletics = Str 4 + trained 5 + scale check 0', c.skills.athletics.v, 9);
eq('Endurance = Con 3 + 5 + racial 2', c.skills.endurance.v, 10);
eq('passive perception', c.passive.perception, 11);
const cleave = D4.attackLines(c, D4.powers['fighter-cleave'])[0];
eq('Cleave attack = Str 4 + prof 2 + talent 1', cleave.atk, 7);
eq('Cleave damage', cleave.dmg, '1d12 + 4');
eq('nothing left to choose', c.todo, []);

/* Level up to 4 and check scaling and slots */
ch.level = 4; ch.ups = { 4: ['str', 'con'] }; ch.feats.f2 = { id: 'weapon-focus', choice: 'Axe' }; ch.feats.f4 = { id: 'improved-defenses' };
ch.powers.util2 = 'fighter-unstoppable'; ch.powers.enc3 = 'fighter-crushing-blow';
c = D4.calc(ch);
eq('Str 19 at level 4', c.score.str, 19);
eq('HP at 4 = 36 + 18 + 1 (Con 17)', c.hp, 55);
eq('Fort at 4 = 10 + 2 + 4 + 2 + 1', c.def.Fort, 19);
const cb = D4.attackLines(c, D4.powers['fighter-crushing-blow'])[0];
eq('Crushing Blow attack', cb.atk, 9);
eq('Crushing Blow damage (Weapon Focus +1)', cb.dmg, '2d12 + 5');
eq('slots at level 4', c.powerSlots.map(s => s.id), ['aw1', 'aw2', 'enc1', 'day1', 'util2', 'enc3']);

/* Replacement rules at 13 */
ch.level = 13; ch.powers.enc7 = 'fighter-reckless-strike'; ch.powers.enc13 = { id: 'fighter-precise-strike', replaces: 'enc1' };
c = D4.calc(ch);
eq('encounter powers after the level 13 swap', Object.values(c.activeSlots).filter(s => s.use === 'enc' && !s.path).map(s => s.pick).sort(),
  ['fighter-crushing-blow', 'fighter-precise-strike', 'fighter-reckless-strike']);
eq('human bonus slots absent for dwarf', c.powerSlots.filter(s => s.use === 'aw').length, 2);

/* A human wizard: implement attacks and the spellbook */
const w = D4.newCharacter();
Object.assign(w, { race: 'human', raceAbil: 'int', cls: 'wizard', clsOpt: { implement: 'staff' } });
w.base = { str: 8, con: 12, dex: 14, int: 16, wis: 13, cha: 10 };
w.inv = [{ uid: 'a', id: 'cloth', eq: true }, { uid: 'b', id: 'staff', eq: true, magic: 'magic-implement', enh: 1 }];
c = D4.calc(w);
eq('wizard AC = 10 + Int 4 + staff of defense 1', c.def.AC, 15);
eq('human Will = 10 + Wis 1 + class 2 + human 1', c.def.Will, 14);
eq('human has 3 at-will slots', c.powerSlots.filter(s => s.use === 'aw').length, 3);
const mm = D4.attackLines(c, D4.powers['wizard-magic-missile'])[0];
eq('magic missile damage = 2 + Int 4 + enh 1', mm.dmg, '7');
const sb = D4.attackLines(c, D4.powers['wizard-scorching-burst'])[0];
eq('scorching burst attack = Int 4 + enh 1', sb.atk, 5);
eq('ritual caster bonus feat', c.feats.some(f => f.id === 'ritual-caster' && f.bonus), true);

/* Feat prerequisites */
const wz = D4.calc(w);
eq('wizard can take Armor Proficiency (Leather)', D4.featUnmet(D4.feats['armor-proficiency-leather'], wz), []);
w.feats.f1 = { id: 'armor-proficiency-leather' };
eq('a chosen proficiency feat is not flagged as already known', D4.calc(w).featSlots[0].issues, []);
eq('fighters already have chainmail', D4.featUnmet(D4.feats['armor-proficiency-chainmail'], D4.calc(ch)).includes('You already have this proficiency'), true);
eq('Two-Weapon Defense needs Two-Weapon Fighting', D4.featUnmet(D4.feats['two-weapon-defense'], wz).some(x => /Two-Weapon Fighting/.test(x)), true);

/* Parser */
const parsed = D4.parseEntry(`Cleave\nFighter Attack 1\nYou hit one enemy, then cleave into another.\nAt-Will ✦ Martial, Weapon\nStandard Action      Melee weapon\nTarget: One creature\nAttack: Strength vs. AC\nHit: 1[W] + Strength modifier damage, and an enemy adjacent to you other than the target takes damage equal to your Strength modifier.\nLevel 21: 2[W] + Strength modifier damage.\nPublished in Player's Handbook, page(s) 77.`);
eq('parse name', parsed.n, 'Cleave');
eq('parse class and level', [parsed.cls, parsed.l, parsed.u, parsed.a, parsed.r], ['fighter', 1, 'aw', 'std', 'Melee weapon']);
eq('parse calc', [parsed.x, parsed.x21], ['str/AC/1W+str', '2W+str']);
const p2 = D4.parseEntry(`Eldritch Blast Warlock Attack 1\nAt-Will ✦ Arcane, Implement\nStandard Action Ranged 10\nTarget: One creature\nAttack: Charisma vs. Reflex or Constitution vs. Reflex\nHit: 1d10 + Charisma modifier damage or 1d10 + Constitution modifier damage.`);
eq('parse one-line header', [p2.n, p2.cls], ['Eldritch Blast', 'warlock']);
eq('parse either-ability attack', p2.x.split('/').slice(0, 2).join('/'), 'cha|con/Ref');
const f = D4.parseEntry(`Toughness [General]\nHeroic Tier\nBenefit: You gain additional hit points equal to 5 per tier.`);
eq('parse feat', [f.kind, f.n, f.tier], ['feat', 'Toughness', 'H']);

console.log(fails ? '\n' + fails + ' check(s) failed' : '\nAll checks passed');
process.exit(fails ? 1 : 0);
