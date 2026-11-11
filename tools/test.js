// Browser tests (Playwright + Chromium): real taps and drags on the real page.
//   node tools/test.js                 the interaction tests
//   node tools/test.js --autoplay=0,4  also play those battles through with the simulator's bot, checking after every
//                                      order that the table shows exactly what the rules say
// Options: --width=390 --height=844 (the phone it pretends to be), --shots (keep screenshots in tools/shots/),
//          --stall=90 (seconds with no check reported before the run is called stuck and stopped)
// A run never hangs: each click or wait gives up after 10 seconds, and a watchdog stops the run when nothing has been
// reported for --stall seconds, printing the section and check it was on and what the game was doing
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), GC = require('../js/rules.js');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k)); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const W = +arg('width', 390), H = +arg('height', 844), SHOTS = arg('shots', false), AUTO = arg('autoplay', '');
const PAGE = 'file://' + path.join(__dirname, '..', 'index.html'), SHOT = path.join(__dirname, 'shots');
if (SHOTS) fs.mkdirSync(SHOT, { recursive: true });
let fails = 0, stage = 'starting', lastCheck = '', lastAt = Date.now(), page = null, browser = null;
const T0 = Date.now(), STALL = +arg('stall', 90) * 1000, secs = () => ((Date.now() - T0) / 1000).toFixed(0) + 's';
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) fails++; lastCheck = msg; lastAt = Date.now(); };
// a section heading: printed with the time so far, and remembered for the watchdog
const _log = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && !a[0].startsWith(' ') && a.length === 1 && !/^(all passed|\d+ FAILED|no page errors|PAGE ERRORS)/.test(a[0])) { stage = a[0]; lastAt = Date.now(); _log(`${a[0]}  (${secs()})`); return; } _log(...a); };
// what the game was doing, for a stuck or crashed run
async function stateNow() {
  if (!page) return '(no page)';
  const st = page.evaluate(() => { try { return JSON.stringify({ phase: UI.phase, busy: UI.busy, over: UI.over, active: UI.active && UI.active.kind, facing: !!UI.facePick, confirm: !!UI.confirm, rules: G && G.S.phase, sheets: [...document.querySelectorAll('.ov')].filter(o => !o.hidden).map(o => o.id), talk: !document.querySelector('#talk').hidden }); } catch (e) { return String(e); } });
  return Promise.race([st, new Promise(r => setTimeout(() => r('(the page did not answer)'), 3000))]).catch(e => String(e));
}
let bailing = false;
async function bail(why, code) {
  if (bailing) return; bailing = true;
  _log(`\n${why}\n  section: ${stage}\n  last check: ${lastCheck || '(none yet)'}\n  game: ${await stateNow()}\n  after ${secs()}`);
  try { await Promise.race([browser && browser.close(), new Promise(r => setTimeout(r, 3000))]); } catch (e) { }
  process.exit(code);
}
setInterval(() => { if (Date.now() - lastAt > STALL) bail(`STUCK: nothing reported for ${STALL / 1000}s`, 2); }, 2000).unref();
process.on('unhandledRejection', e => bail(`CRASHED: ${String(e && e.message || e).split('\n')[0]}`, 1));

(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  browser = b; page = p; p.setDefaultTimeout(10000); // a click or a wait gives up after 10s instead of 30
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.route('**fonts.g**', r => r.fulfill({ body: '', contentType: 'text/css' })); // offline: system fonts stand in
  await p.goto(PAGE);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('gc-tips', JSON.stringify({ move: 1, odds: 1, intents: 1, down: 1, vents: 1, undo: 1 })); });
  await p.reload(); await p.waitForFunction(() => typeof G !== 'undefined' && G);
  // a quicker table: half resolution (the tests read the game, not its pixels) and no close-ups, but in their own test
  await p.evaluate(() => { TIME_SCALE = 6; closeUps = false; pixelRatio = .5; renderer.setPixelRatio(.5); resize(); });
  const shot = name => SHOTS ? p.screenshot({ path: path.join(SHOT, `${name}-${W}.png`) }) : null;
  const idle = () => p.waitForFunction(() => (UI.phase === 'player' && !UI.busy) || UI.over, null, { timeout: 60000 });
  // a square's middle on screen; d moves the point that far toward its far corner (the camera sees down into a pit
  // only at its far side)
  const scr = (c, r, l = 0, d = 0) => p.evaluate(([c, r, l, d]) => project(cellPos(c, r, l).addScaledVector(camToward(), -d)).slice(0, 2), [c, r, l, d]);
  const tapCell = async (c, r, l = 0, d = 0) => { const [x, y] = await scr(c, r, l, d); await p.touchscreen.tap(x, y); await p.waitForTimeout(150); };
  const hero = kind => p.evaluate(k => { const r = G.S.units.find(u => u.kind === k); return { id: r.id, c: r.c, r: r.r, ap: r.ap, hp: r.hp, maxHp: r.maxHp, down: r.down }; }, kind);
  // tap through any scene until a hero is on turn, or a briefing or the end of the battle shows
  const tapThrough = async () => { for (let t = Date.now(); Date.now() - t < 60000;) { if (await p.isVisible('#talk')) { await p.click('#talk .tk'); await p.waitForTimeout(200); continue; } if (await p.isVisible('#end') || await p.isVisible('#intro') || await p.evaluate(() => UI.phase === 'player' && !UI.busy)) return; await p.waitForTimeout(250); } throw new Error('tapThrough: after 60s still no hero on turn, briefing or end screen'); };
  // a battle laid out for a test: round 1, the chosen hero on turn, nobody having acted; tweak edits the state first
  async function setup(level, first, tweak, opts = {}) {
    await p.evaluate(([lv, first, tweak, opts]) => {
      document.querySelectorAll('.ov').forEach(o => o.hidden = true); hideTitle(); MODE = opts.free ? 'free' : 'camp';
      const keep = opts.camp ? CAMP.growth : null; // a test of growth keeps the campaign's
      CAMP = { ...freshCamp(opts.diff || 'normal'), level: opts.free ? 0 : lv, boons: opts.free ? [] : opts.boons || [] }; FREE = { boons: opts.free ? opts.boons || [] : [] };
      if (keep) CAMP.growth = keep;
      const S = GC.newState(lv, opts.seed || 4242, { boons: CAMP.boons, diff: CAMP.diff, growth: CAMP.growth, xp: MODE === 'camp' });
      if (tweak) new Function('S', tweak)(S);
      const h = S.units.find(u => u.kind === first);
      S.order = [h.id, ...S.units.filter(u => u !== h && u.alive).map(u => u.id)]; S.turn = 0; S.active = h.id; S.phase = 'player'; S.units.forEach(u => { u.init = 5; });
      loadLevel(lv, JSON.parse(JSON.stringify(S)));
    }, [level, first, tweak || '', opts]);
    await idle();
  }
  // a seed where one Longsword blow from Brakka at (sc, sr) finishes the foe at (tc, tr) with hp left
  const finisher = (level, tweak) => p.evaluate(([lv, tweak]) => {
    for (let sd = 1; sd < 300; sd++) {
      const S = GC.newState(lv, sd); new Function('S', tweak)(S);
      const f = S.units.find(u => u.kind === 'fighter'); S.order = [f.id, ...S.units.filter(u => u !== f).map(u => u.id)]; S.turn = 0; S.active = f.id; S.phase = 'player';
      const B = GC.battle(S), t = S.units.find(u => u.side === 'gob' && u.alive && B.dist(u, f) === 1);
      B.act(f.id, 'f_attack', t.id); if (S.result === 'win') return sd;
    }
    return null;
  }, [level, tweak]);

  console.log('the title: the campaign, or the level select');
  {
    const t = await p.evaluate(() => ({ open: !$('#title').hidden, cont: $('#tCont').textContent, nw: $('#tNew').hidden, hud: getComputedStyle($('#top')).visibility }));
    ok(t.open && /Begin the campaign/.test(t.cont) && t.nw, 'a first visit opens on the title, offering to begin the campaign');
    ok(t.hud === 'hidden', 'the battle HUD stays hidden behind it');
    await p.click('#tLevels'); await p.waitForTimeout(150);
    const lv = await p.evaluate(() => [...document.querySelectorAll('#levelList .lvl')].map(b => b.querySelector('b').textContent));
    ok(lv.length === GC.LEVELS.length && lv[lv.length - 1] === "The Reeve's House", `the level select lists all ${lv.length} battles, the house last`);
    await p.click('.lvl[data-i="5"]'); await p.waitForTimeout(200);
    const fr = await p.evaluate(() => ({ mode: MODE, level, kick: $('#introKick').textContent, chips: $('#introBoons').querySelectorAll('span:not(.up)').length, ups: $('#introBoons').querySelectorAll('span.up').length, save: localStorage.getItem(SAVE_KEY) }));
    ok(fr.mode === 'free' && fr.level === 5 && /Level select · Extra battle/.test(fr.kick), `the house's briefing: ${fr.kick}`);
    ok(fr.chips === 2 && fr.ups === 4, 'it comes with two boons and an upgrade for each hero, shown on the briefing');
    ok(fr.save === null, 'and the campaign has no save yet: the level select left it alone');
    await p.click('#introMenu'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !$('#title').hidden && MODE === 'camp' && localStorage.getItem(SAVE_KEY) === null), 'Main menu on the briefing goes back to the title');
    await p.click('#tCont'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !$('#intro').hidden && level === 0 && /Battle 1 of 5/.test($('#introKick').textContent)), 'Begin the campaign: the Gorge Crossing briefing');
  }

  console.log('tap to move, then undo');
  await setup(0, 'fighter');
  let f = await hero('fighter');
  await tapCell(f.c, f.r - 1); await idle();
  let f2 = await hero('fighter');
  ok(f2.r === f.r - 1 && f2.ap === f.ap - 1, `Brakka walked a square north (${f.c},${f.r} → ${f2.c},${f2.r}), ap ${f.ap} → ${f2.ap}`);
  ok(await p.evaluate(() => !document.querySelector('#menuUndo').disabled), 'Undo is offered after a move');
  await p.keyboard.press('z'); await p.waitForTimeout(300);
  f2 = await hero('fighter');
  ok(f2.r === f.r && f2.ap === f.ap, `Z took it back (${f2.c},${f2.r}, ap ${f2.ap})`);
  ok(await p.evaluate(id => { const u = vu(id); return [u.c, u.r].join(); }, f.id) === [f.c, f.r].join(), 'the miniature is back on its square too');

  console.log('drag onto a foe: walk, Confirm?, strike; dice are final');
  await setup(0, 'fighter', "const g = S.units.find(u => u.kind === 'cutter'); g.c = 0; g.r = 6;");
  f = await hero('fighter');
  {
    const cut = await p.evaluate(() => G.S.units.find(u => u.kind === 'cutter').id);
    const at = id => p.evaluate(id => project(vu(id).root.position.clone().setY(vu(id).root.position.y + .4)).slice(0, 2), id);
    const [x0, y0] = await at(f.id), [x1, y1] = await at(cut);
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x0, y0 - 20, { steps: 4 });
    await p.mouse.move(x1, y1 + 30, { steps: 10 }); await p.mouse.move(x1, y1, { steps: 4 }); await p.mouse.up();
    await p.waitForTimeout(400);
    const conf = await p.evaluate(() => !!UI.confirm && !document.querySelector('#goPill').hidden);
    ok(conf, 'walking first asks Confirm?');
    await shot('confirm');
    if (conf) await p.click('#goPill');
    await idle();
    ok((await hero('fighter')).ap === f.ap - 2, 'walk and strike cost 2 actions');
    ok(await p.evaluate(() => undoStack.length === 0 && document.querySelector('#menuUndo').disabled), 'after a roll there is nothing to undo');
  }

  console.log('grapple: tap a figure, then a square; and into the lava');
  await setup(0, 'fighter', "const g = S.units.find(u => u.kind === 'cutter'); g.c = 1; g.r = 6;");
  await p.click('.hk[data-id="f_grab"]'); await p.waitForTimeout(150);
  await tapCell(1, 6);
  ok(/^g\d+$/.test(await p.evaluate(() => UI.aim) || ''), 'the first tap takes hold');
  await tapCell(0, 6); await idle();
  ok((await p.evaluate(() => { const g = G.S.units.find(u => u.kind === 'cutter'); return [g.c, g.r].join(); })) === '0,6', 'the cutter was hauled a square west');
  await setup(3, 'fighter', "const f = S.units.find(u => u.kind === 'fighter'), g = S.units.find(u => u.kind === 'cutter' && u.c === 0); f.c = 1; f.r = 4; g.c = 1; g.r = 5; S.units.filter(u => u.kind === 'warg').forEach(w => { w.c += 0; });");
  {
    const g0 = await p.evaluate(() => { const g = G.S.units.find(u => u.kind === 'cutter' && u.r === 5); return { id: g.id, hp: g.hp }; });
    await p.click('.hk[data-id="f_grab"]'); await p.waitForTimeout(150);
    await tapCell(1, 5); await tapCell(0, 5, 0, .45); await idle(); // (0,5) is a lava pit in the Forge Pits: tap the part of it in view
    const g1 = await p.evaluate(id => { const g = G.U(id); return { hp: g.hp, prone: !!g.st.prone, alive: g.alive, at: [g.c, g.r].join(), lava: GC.TUNE.lava }; }, g0.id);
    ok(!g1.alive || (g1.hp === g0.hp - g1.lava && g1.prone && g1.at === '1,5'), `hurled into the lava: hp ${g0.hp} → ${g1.hp}, prone ${g1.prone}, back at ${g1.at}`);
  }

  console.log('fireball: tap to aim, again to cast; odds over everyone in the blast');
  await setup(0, 'mage', "S.units.filter(u => u.kind === 'cutter').forEach((g, i) => { g.c = 2 + i; g.r = 5; });");
  await p.click('.hk[data-id="m_fire"]'); await p.waitForTimeout(150);
  await tapCell(3, 5);
  const aimed = await p.evaluate(() => ({ aim: UI.aim, fc: UI.fc.size, ff: [...UI.fc.keys()].filter(id => vu(id).side === 'hero').length }));
  ok(aimed.aim === '3,5' && aimed.fc === 5 && aimed.ff === 2, `aimed at 3,5 with odds over ${aimed.fc} figures, ${aimed.ff} of them friends`);
  await shot('fireball');
  await tapCell(3, 5); await idle();
  ok(await p.evaluate(() => Object.keys(G.S.burn).length > 0 && Object.keys(G.S.burn).length === burnFx.size), 'the ground burns, on the table as in the rules');

  console.log('ice wall: aim, turn it, raise it; undo melts it');
  await setup(0, 'mage');
  await p.click('.hk[data-id="m_icewall"]'); await p.waitForTimeout(150);
  const m = await hero('mage');
  await tapCell(m.c, m.r - 2); await p.click('#rotBtn'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => UI.wallDir === 'v'), 'the wall turns down the board');
  await tapCell(m.c, m.r - 2); await idle();
  ok(await p.evaluate(() => Object.keys(G.S.ice).length > 0 && Object.keys(G.S.ice).sort().join() === [...ICE.keys()].sort().join()), 'ice on the table matches the rules');
  await p.click('#menuBtn'); await p.click('#menuUndo'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => Object.keys(G.S.ice).length === 0 && ICE.size === 0), 'undo takes the wall back');

  console.log('a fallen hero, raised by Heal');
  await setup(0, 'cleric', "const v = S.units.find(u => u.kind === 'thief'); v.hp = 0; v.down = true; v.st = { prone: true }; v.c = 2; v.r = 7; S.units.find(u => u.kind === 'cleric').c = 1; S.units.find(u => u.kind === 'cleric').r = 7;");
  ok(await p.evaluate(() => { const v = units.find(x => x && x.kind === 'thief'); return v.down && v.tag.classList.contains('down') && v.grey.value > .5; }), 'Vex lies grey, marked Down');
  await p.click('.hk[data-id="c_heal"]'); await p.waitForTimeout(200);
  ok(/Raise/.test(await p.evaluate(() => units.find(x => x && x.kind === 'thief').tag.querySelector('.fc').textContent)), 'the odds over Vex say Raise');
  await tapCell(2, 7); await idle();
  const vex = await hero('thief');
  ok(!vex.down && vex.hp > 0, `Heal raised Vex with ${vex.hp} HP`);
  ok(await p.evaluate(() => G.block(G.U(UI.active.id), 'c_heal') === 'Ready in 1' && document.querySelector('.hk[data-id="c_heal"]').classList.contains('off')), 'Heal is spent until her next turn');

  console.log('boons: a better blade, and a healing draught');
  await setup(0, 'fighter', "const w = S.units.find(u => u.kind === 'cleric'); w.hp = 3; w.c = 2; w.r = 7;", { boons: ['tempered', 'draughts'] });
  {
    const inView = id => { const w = document.querySelector('#hbWrap').getBoundingClientRect(), b = document.querySelector(`.hk[data-id="${id}"]`).getBoundingClientRect(); return b.left >= w.left - 1 && b.right <= w.right + 1; };
    const bar = await p.evaluate(inView => { inView = new Function('return ' + inView)(); const w = document.querySelector('#hbWrap'); return { dv: document.querySelector('.hk[data-id="f_attack"] .dv').textContent, n: document.querySelectorAll('#hotbar .hk').length, pot: inView('potion'), fr: w.classList.contains('fr'), fl: w.classList.contains('fl'), next: !document.querySelector('#hbNext').hidden }; }, inView.toString());
    ok(bar.dv === 'd10', 'Tempered Blade: the Longsword button reads d10');
    ok(bar.n === 6 && !bar.pot && bar.fr && !bar.fl && bar.next, 'one bar of six abilities, five in view: the right edge fades, and › is there');
    await p.click('.hk[data-id="f_attack"]'); await p.waitForTimeout(100);
    ok(/Deal d10/.test(await p.textContent('#hbInfo')), 'the card says Deal d10');
    await p.click('#hbNext'); await p.waitForTimeout(600);
    ok(await p.evaluate(inView => { inView = new Function('return ' + inView)(); const w = document.querySelector('#hbWrap'); return inView('potion') && w.classList.contains('fl') && !w.classList.contains('fr') && document.querySelector('.hk[data-id="potion"] .us')?.textContent === '×1'; }, inView.toString()), '› brings the draught into view, one use; now the left edge fades');
    const w0 = (await hero('cleric')).hp;
    await p.click('.hk[data-id="potion"]'); await p.waitForTimeout(150); await tapCell(2, 7); await idle();
    const w1 = (await hero('cleric')).hp;
    ok(w1 > w0, `Brakka pours the draught for Wenna: ${w0} → ${w1} HP`);
    ok(await p.evaluate(() => G.block(G.U(UI.active.id), 'potion') === 'Used up' && document.querySelector('.hk[data-id="potion"]').classList.contains('off')), 'the draught is used up');
    await p.click('#uwho'); await p.waitForTimeout(150);
    ok(/Tempered Blade/.test(await p.textContent('#csBody')), "Brakka's sheet lists Tempered Blade");
    await p.click('#csClose');
  }

  console.log('armour: a number on the nameplate, stripped by Rebuke');
  await setup(2, 'cleric', "const w = S.units.find(u => u.kind === 'warg'); w.c = 1; w.r = 5;");
  {
    const badge = kind => p.evaluate(k => { const u = units.find(x => x && x.alive && x.kind === k && (k !== 'warg' || x.r === 5)); const el = u.tag.querySelector('.arm'); return { text: el.textContent, hidden: el.hidden, low: el.classList.contains('low') }; }, kind);
    const b0 = await badge('warg'), bk = await badge('fighter'), bm = await badge('mage');
    ok(b0.text === '2' && !b0.hidden && !b0.low && bk.text === '2' && bm.hidden, `shields: warg ${b0.text}, Brakka ${bk.text}, Orlen none`);
    await p.click('.hk[data-id="c_rebuke"]'); await p.waitForTimeout(150); await tapCell(1, 5); await idle();
    const b1 = await badge('warg');
    ok(b1.text === '0' && b1.low, `Judgement strips the warg's armour: ${b0.text} → ${b1.text}, shown in red`);
    ok(await p.evaluate(() => { const u = units.find(x => x && x.alive && x.kind === 'warg' && x.r === 5); return !!u.tag.querySelector('.sts i.judged') && !!u.fx.judge; }), 'the warg wears the gold mark of the Judged, on its nameplate and over its head');
    ok(await p.evaluate(() => condSeen.judged === 1 && $('#coT').textContent === 'Judged' && /every hero who hits it heals/.test($('#coX').textContent)), 'the first Judgement brings a word on what Judged does');
    ok(await p.evaluate(() => { const r = G.U(UI.active.id), w = G.S.units.find(u => u.kind === 'warg' && u.r === 5); return G.forecast(r, 'c_attack', w).tags.includes('Judged: heal 1'); }), 'and the odds on the Judged warg say a hit heals 1');
    ok(await p.evaluate(() => !combatLog.some(e => /toughness/i.test(e.html))), 'nothing rolls for defence any more');
  }

  console.log('difficulty');
  await setup(1, 'fighter', '', { diff: 'hard' });
  ok(await p.evaluate(() => G.S.units.filter(u => u.side === 'gob').every(u => u.maxHp === Math.round(GC.UNITS[u.kind].hp * 1.25))), 'Hard: every goblin has 125% health');
  await p.evaluate(() => { document.querySelector('#settingsBtn').click(); });
  await p.click('#diffBtn'); // hard → easy
  ok(await p.evaluate(() => CAMP.diff === 'easy' && /Easy/.test(document.querySelector('#diffLbl').textContent)), 'Settings turns it to Easy');
  await p.click('#settingsClose');

  console.log('a victory, a boon, and the march on');
  {
    const tweak = "S.units.filter(u => u.side === 'gob').forEach((g, i) => { if (i) g.alive = false; else { g.c = 2; g.r = 5; g.hp = 2; } });";
    const seed = await finisher(0, tweak);
    ok(seed != null, 'found a seed where the last blow lands');
    await setup(0, 'fighter', tweak, { seed });
    await tapCell(2, 5);
    await tapThrough();
    await p.waitForSelector('#end', { state: 'visible', timeout: 60000 });
    const end = await p.evaluate(() => ({ title: document.querySelector('#endTitle').textContent, boons: document.querySelectorAll('#boonList .boon').length, disabled: document.querySelector('#againBtn').disabled, saved: JSON.parse(localStorage.getItem(SAVE_KEY)) }));
    ok(end.title === 'Victory' && !end.disabled && /Make camp/.test(await p.textContent('#againBtn')) && await p.evaluate(() => $('#endBoons').hidden && $('#endUps').hidden), 'Victory first: the experience and the report, then Make camp');
    ok(end.saved && end.saved.level === 1 && end.saved.offer && end.saved.offer.length === 3, 'the save has moved on to the next battle, with the offer');
    const xp = await p.evaluate(() => ({ rows: document.querySelectorAll('#endReport .xpr').length, f: CAMP.growth.fighter, saved: JSON.parse(localStorage.getItem(SAVE_KEY)).growth.fighter }));
    ok(xp.rows === 4 && xp.f.xp === GC.TUNE.xp.hit + GC.TUNE.xp.kill + GC.TUNE.xp.win && xp.saved.xp === xp.f.xp, `experience: Brakka's blow and the win earn him ${xp.f.xp} XP, saved with the campaign`);
    await shot('victory');
    ok(await p.evaluate(() => !!$('#endReport .mvpl') && !$('#endReport details.repd').open), 'the best hero in one line, the full report folded away');
    await p.click('#againBtn'); await p.waitForTimeout(200);
    const camp = await p.evaluate(() => ({ title: $('#endTitle').textContent, boons: document.querySelectorAll('#boonList .boon').length, disabled: $('#againBtn').disabled }));
    ok(camp.title === 'Camp' && camp.boons === 3 && camp.disabled, 'then the camp: three boons, and the march waits for a pick');
    const pick = await p.evaluate(() => document.querySelector('#boonList .boon').dataset.id);
    await p.click('#boonList .boon'); await p.click('#againBtn');
    await p.waitForSelector('#intro', { state: 'visible' });
    const intro = await p.evaluate(() => ({ title: document.querySelector('#introTitle').textContent, chips: document.querySelector('#introBoons').textContent, boons: CAMP.boons }));
    ok(intro.title === GC.LEVELS[1].name && intro.boons.includes(pick) && intro.chips.includes(GC.BOONS[pick].name), `on to ${intro.title}, carrying ${GC.BOONS[pick].name}`);
  }

  console.log('the campaign saves itself: close the page mid-turn and come back');
  await p.click('#introGo'); await tapThrough(); await idle();
  {
    const before = await p.evaluate(() => ({ level, round: G.S.round, active: UI.active && UI.active.kind, at: G.S.units.map(u => [u.c, u.r, u.hp].join()).join(' ') }));
    await p.reload(); await p.waitForSelector('#title', { state: 'visible', timeout: 60000 });
    ok(/Continue the campaign/.test(await p.textContent('#tCont')) && /Battle 2 of 5: Goblin Ridge/.test(await p.textContent('#tContSub')), 'the title offers to continue: ' + await p.textContent('#tContSub'));
    await p.click('#tCont'); await p.waitForFunction(() => typeof G !== 'undefined' && G && UI.phase === 'player' && !UI.busy, null, { timeout: 60000 });
    await p.evaluate(() => { TIME_SCALE = 6; });
    const after = await p.evaluate(() => ({ level, round: G.S.round, active: UI.active && UI.active.kind, at: G.S.units.map(u => [u.c, u.r, u.hp].join()).join(' ') }));
    ok(JSON.stringify(after) === JSON.stringify(before), `back on the same turn: ${GC.LEVELS[after.level].name}, round ${after.round}, ${after.active} to move`);
  }

  console.log('a level gained raises a card a tier, picked at camp');
  {
    const tweak = "S.units.filter(u => u.side === 'gob').forEach((g, i) => { if (i) g.alive = false; else { g.c = 2; g.r = 5; g.hp = 2; } });";
    const seed = await finisher(0, tweak);
    await p.evaluate(() => { CAMP = freshCamp(); CAMP.growth.fighter.xp = 90; saveCamp(); });
    await setup(0, 'fighter', tweak, { seed, camp: true });
    await tapCell(2, 5); await tapThrough();
    await p.waitForSelector('#end', { state: 'visible', timeout: 60000 });
    const up = await p.evaluate(() => ({ lv: CAMP.growth.fighter.lv, text: document.querySelector('#endReport .lvup') && document.querySelector('#endReport .lvup').textContent, badge: !!document.querySelector('#endReport .xpr.up .lvb') }));
    ok(up.lv === 2 && up.badge && /raises a card a tier/.test(up.text || ''), 'Brakka reaches level 2: the victory says so');
    await p.click('#againBtn'); await p.waitForTimeout(200);
    const up2 = await p.evaluate(() => ({ open: !$('#endUps').hidden, rows: [...document.querySelectorAll('#upList .upk')].map(e => e.dataset.kind), cards: document.querySelectorAll('#upList .upk[data-kind="fighter"] .upb').length }));
    ok(up2.open && up2.rows.join() === 'fighter' && up2.cards === 5, 'at camp, one of his five cards to raise a tier');
    await p.click('#boonList .boon');
    ok(await p.evaluate(() => $('#againBtn').disabled), 'with a boon picked, the march still waits for the upgrade');
    await p.click('#upList .upb[data-id="f_charge"]');
    const t = await p.evaluate(() => ({ text: $('#upList .upt').textContent, sel: $('#upList .upb[data-id="f_charge"]').classList.contains('sel'), disabled: $('#againBtn').disabled }));
    ok(/^Charge → Charge II/.test(t.text) && /drive the foe back 2/.test(t.text) && t.sel && !t.disabled, `Charge shows its next tier ("${t.text}"), and the march is ready`);
    await p.click('#againBtn'); await p.waitForSelector('#intro', { state: 'visible' });
    const next = await p.evaluate(() => { const f = G.S.units.find(u => u.kind === 'fighter'); return { ups: f.ups, saved: JSON.parse(localStorage.getItem(SAVE_KEY)).growth.fighter.ups, hp: f.maxHp, chips: $('#introBoons').textContent, boonHp: CAMP.boons.reduce((n, id) => { const b = GC.BOONS[id]; return n + ((b.who === 'fighter' || b.who === 'party') && b.mod && b.mod.hp || 0); }, 0) }; });
    ok(next.ups.join() === 'f_charge' && next.saved.join() === 'f_charge' && next.hp === GC.UNITS.fighter.hp + GC.TUNE.xp.hp + next.boonHp, `he carries Charge II into the next battle, with ${next.hp} HP, and the save keeps it`);
    ok(/Upgrades\s*Charge II/.test(next.chips), 'the briefing lists the party\'s raised cards');
    // the hotbar and the sheet show the upgraded card
    await setup(1, 'fighter', '', { camp: true });
    await p.click('.hk[data-id="f_charge"]'); await p.waitForTimeout(150);
    const bar = await p.evaluate(() => ({ up: $('.hk[data-id="f_charge"]').classList.contains('up') && $('.hk[data-id="f_charge"] .pl').textContent, plain: !$('.hk[data-id="f_cleave"]').classList.contains('up'), info: $('#hbInfo').textContent }));
    ok(bar.up === 'II' && bar.plain && /Charge II/.test(bar.info) && /drive the foe back 2/.test(bar.info), 'the hotbar marks Charge II in gold, and its line reads the tier');
    await p.click('#uwho'); await p.waitForTimeout(200);
    const sheet = await p.evaluate(() => ({ up: [...document.querySelectorAll('#csBody .cs-card.up b')].map(b => b.textContent), lv: $('#csBody .cs-lv small').textContent }));
    ok(sheet.up.join() === 'Charge II' && /level 3 raises a card a tier/.test(sheet.lv), `his sheet shows ${sheet.up.join()} and "${sheet.lv}"`);
    await p.keyboard.press('Escape');
    // closed before choosing: the camp comes back with the pick still to make
    await p.evaluate(() => { CAMP = freshCamp(); CAMP.level = 1; CAMP.battles = 1; CAMP.growth.mage = { lv: 2, xp: 10, ups: [] }; saveCamp(); });
    await p.reload(); await p.waitForSelector('#title', { state: 'visible', timeout: 60000 });
    await p.click('#tCont'); await p.waitForSelector('#end', { state: 'visible', timeout: 60000 });
    const camp = await p.evaluate(() => ({ title: $('#endTitle').textContent, rows: [...document.querySelectorAll('#upList .upk')].map(e => e.dataset.kind), boons: !$('#endBoons').hidden, disabled: $('#againBtn').disabled }));
    ok(camp.title === 'Camp' && camp.rows.join() === 'mage' && !camp.boons && camp.disabled, 'a pick left unmade brings the camp back, Orlen\'s upgrade waiting');
    await p.click('#upList .upb[data-id="m_fire"]'); await p.click('#againBtn'); await p.waitForSelector('#intro', { state: 'visible' });
    ok(await p.evaluate(() => CAMP.growth.mage.ups.join() === 'm_fire' && G.S.units.find(u => u.kind === 'mage').ups.join() === 'm_fire'), 'Fireball II is his, and on to the briefing');
    // a second raise takes a card to tier III
    await p.evaluate(() => { CAMP = freshCamp(); CAMP.level = 2; CAMP.battles = 2; CAMP.growth.mage = { lv: 3, xp: 0, ups: ['m_fire'] }; saveCamp(); });
    await p.reload(); await p.waitForSelector('#title', { state: 'visible', timeout: 60000 });
    await p.click('#tCont'); await p.waitForSelector('#end', { state: 'visible', timeout: 60000 });
    const t2 = await p.evaluate(() => ({ pips: $('#upList .upb[data-id="m_fire"] .tp').querySelectorAll('b.on').length, mark: $('#upList .upb[data-id="m_fire"] .ui i').textContent }));
    await p.click('#upList .upb[data-id="m_fire"]');
    const t3 = await p.evaluate(() => $('#upList .upt').textContent);
    ok(t2.pips === 2 && t2.mark === 'II' && /^Fireball II → Fireball III/.test(t3) && /for every foe it catches/.test(t3), `Fireball shows tier II, and its next: "${t3}"`);
    await p.click('#againBtn'); await p.waitForSelector('#intro', { state: 'visible' });
    ok(await p.evaluate(() => G.S.units.find(u => u.kind === 'mage').ups.join() === 'm_fire,m_fire' && G.cardOf(G.S.units.find(u => u.kind === 'mage'), 'm_fire').name === 'Fireball III'), 'Fireball III, carried into the battle');
    await p.evaluate(() => { CAMP = freshCamp(); saveCamp(); });
  }

  console.log('facing: the last thing on a turn is the way the hero faces; a blow from behind takes +1 die');
  {
    await setup(0, 'thief');
    const r0 = await hero('thief');
    await tapCell(r0.c, r0.r - 1); await idle();
    ok(await p.evaluate(() => !UI.facePick && !faceArrows.visible), 'a move asks nothing: no arrows');
    await p.evaluate(() => { askEndTurn(); }); await p.waitForTimeout(250);
    if (await p.isVisible('#confirm')) { await p.click('#cfEnd'); await p.waitForTimeout(250); }
    const f1 = await p.evaluate(() => ({ open: !!UI.facePick && faceArrows.visible, phase: G.S.phase, active: UI.active.kind, hint: $('#hbInfo').textContent }));
    ok(f1.open && f1.phase === 'player' && f1.active === 'thief' && /Tap where to face/.test(f1.hint), 'ending the turn first lays faint arrows round Vex, and waits');
    const v = await hero('thief');
    await tapCell(v.c + 1, v.r); await idle();
    const f2 = await p.evaluate(id => ({ fc: G.fcOf(G.U(id)).join(), open: !!UI.facePick, gone: G.S.active !== id }), v.id);
    ok(f2.fc === '1,0' && !f2.open && f2.gone, 'a tap to her right turns her that way, and the turn passes');
    const rear = await p.evaluate(id => { const r = G.U(id), g = G.S.units.find(u => u.kind === 'cutter' && u.alive), c0 = g.c, r0 = g.r, f0 = g.fc; g.c = r.c + 1; g.r = r.r; g.fc = [1, 0]; const a = G.forecast(r, 't_attack', g).tags; g.fc = [-1, 0]; const b = G.forecast(r, 't_attack', g).tags; g.c = c0; g.r = r0; g.fc = f0; return [a.includes('Rear +1d'), b.includes('Rear +1d')]; }, v.id);
    ok(rear[0] && !rear[1], 'a cutter with its back to her: the odds say Rear +1d; facing her, not');
  }

  console.log('a close-up when the blow is locked in');
  {
    await p.evaluate(() => { closeUps = true; });
    await setup(0, 'fighter', "const g = S.units.find(u => u.kind === 'cutter'); g.c = 2; g.r = 5; g.hp = 30; g.maxHp = 30;");
    const pitch0 = await p.evaluate(() => camPitchT);
    await tapCell(2, 5);
    await p.waitForFunction(() => cine !== null, null, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(700);
    const mid = await p.evaluate(() => { const f = G.S.units.find(u => u.kind === 'fighter'), g = G.S.units.find(u => u.kind === 'cutter' && u.c === 2 && u.r === 5); return { cine: !!cine, pitch: camPitchT, zoom: zoomT, grid: gridK, left: project(vu(f.id).root.position)[0] < project(vu(g.id).root.position)[0] }; });
    ok(mid.cine && mid.pitch < pitch0 && mid.zoom < 1 && mid.grid < .5, `the grid fades and the camera closes in low behind Brakka (pitch ${mid.pitch.toFixed(2)}, zoom ${mid.zoom.toFixed(2)})`);
    ok(mid.left, 'Brakka on the left of the shot, the cutter on the right');
    await idle();
    ok(await p.evaluate(p0 => !cine && camPitchT === p0, pitch0), 'and goes back to the play view after');
  }

  await p.evaluate(() => { closeUps = false; });
  console.log('keys');
  await setup(0, 'fighter');
  await p.keyboard.press('e'); await p.waitForTimeout(150);
  ok(await p.isVisible('#confirm'), 'E with actions left asks first');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(!(await p.isVisible('#confirm')), 'Escape keeps playing');

  console.log("the reeve's house: two floors and a stair, and a floor switch on the left");
  await setup(5, 'fighter', "const f = S.units.find(u => u.kind === 'fighter'); f.c = 5; f.r = 5; S.units.filter(u => u.side === 'gob' && u.l === 1).forEach(u => { u.alive = false; });", { free: true });
  {
    const fb = await p.evaluate(() => { const r = $('#floorBtn').getBoundingClientRect(); return { shown: !$('#floorBtn').hidden, left: r.left, mid: r.top + r.height / 2, view: UI.view, num: $('#floorNum').textContent }; });
    ok(fb.shown && fb.left < 20 && fb.mid > H * .25 && fb.mid < H * .6, `the floor switch sits on the left edge (x ${fb.left.toFixed(0)}, y ${fb.mid.toFixed(0)})`);
    ok(fb.view === 'lower' && fb.num === '1', 'Brakka is on the ground floor, and the ground floor is shown');
    await p.click('#floorUp'); await p.waitForTimeout(150);
    const up = await p.evaluate(() => ({ view: UI.view, num: $('#floorNum').textContent, deck: deckGrp.visible, hid: viewHides(UI.active), upOff: $('#floorUp').disabled }));
    ok(up.view === 'upper' && up.num === '2' && up.deck && up.upOff, 'up: the upper floor is laid over the ground floor');
    ok(up.hid, 'and Brakka, under it, is hidden');
    await p.keyboard.press('f'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => UI.view === 'lower' && !deckGrp.visible), 'F goes back down');
    await tapCell(5, 3); await idle();
    let fr = await hero('fighter');
    ok(fr.c === 5 && fr.r === 3, `two squares up the stair to its top (${fr.c},${fr.r})`);
    await tapCell(5, 2, 1); await idle();
    const top = await p.evaluate(() => { const r = G.U(UI.active.id); return { l: r.l, c: r.c, r: r.r, view: UI.view, piece: vu(r.id).piece.visible }; });
    ok(top.l === 1 && top.c === 5 && top.r === 2, 'one more onto the landing of the upper floor');
    ok(top.view === 'upper' && top.piece, 'the view follows him upstairs');
    ok(await p.evaluate(() => { const B = G; const w = G.S.units.find(u => u.kind === 'cutter' && u.alive && !u.l); return !B.los(G.U(UI.active.id), w); }), 'from the upper floor he cannot see the goblins below');
    await shot('house');
    await p.evaluate(() => { document.querySelector('#settingsBtn').click(); }); await p.click('#menuMain'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !$('#title').hidden && MODE === 'camp' && $('#floorBtn').hidden), 'Settings › Main menu leaves the house for the title');
  }

  console.log('the king falls and his court flees: the campaign is won');
  {
    const tweak = "const k = S.units.find(u => u.kind === 'king'), f = S.units.find(u => u.kind === 'fighter'); k.hp = 2; f.c = 5; f.r = 3;";
    const seed = await finisher(4, tweak);
    await setup(4, 'fighter', tweak, { seed });
    await tapCell(5, 2);
    await tapThrough();
    await p.waitForSelector('#end', { state: 'visible', timeout: 60000 });
    const end = await p.evaluate(() => ({ title: document.querySelector('#endTitle').textContent, camp: /The whole campaign/.test(document.querySelector('#endReport').textContent), gobs: units.filter(u => u && u.alive && u.side === 'gob').length }));
    ok(end.title === 'The Goblin King Falls' && end.gobs === 0, 'the campaign ends with the court fled');
    ok(end.camp, 'the tally covers the whole campaign');
    await shot('king');
  }

  // ---------------- autoplay: whole battles with the simulator's bot, through the real view ----------------
  if (AUTO) {
    const bot = fs.readFileSync(path.join(__dirname, 'sim.js'), 'utf8').match(/const T = 300;[\s\S]*?\nfunction heroTurn/)[0].replace(/\nfunction heroTurn$/, '');
    await p.addScriptTag({ content: `window.__BOT = (() => { ${bot}; return { options, positionMove }; })();` });
    await p.evaluate(() => { // compare the table with the rules before every safety-net sync
      window.__DIFFS = []; const sync0 = sync;
      window.sync = function () {
        const out = [];
        for (const r of G.S.units) {
          const u = units[r.id]; if (!u) { if (r.alive) out.push('no piece for ' + r.name); continue; }
          if (!!u.alive !== !!r.alive) { out.push(r.name + ' alive ' + u.alive); continue; } if (!r.alive) continue;
          if (u.c !== r.c || u.r !== r.r || (u.l || 0) !== (r.l || 0)) out.push(r.name + ' at ' + u.c + ',' + u.r + ' not ' + r.c + ',' + r.r);
          if (u.hp !== r.hp) out.push(r.name + ' hp ' + u.hp + ' not ' + r.hp);
          if (!!u.down !== !!r.down) out.push(r.name + ' down');
          for (const k of STATUSES) if (!!u.st[k] !== !!r.st[k]) out.push(r.name + ' ' + k);
        }
        if (Object.keys(G.S.ice).sort().join() !== [...ICE.keys()].sort().join()) out.push('ice');
        if (Object.keys(G.S.burn).sort().join() !== [...burnFx.keys()].sort().join()) out.push('burn');
        if (out.length) __DIFFS.push('R' + G.S.round + ': ' + out.join('; '));
        return sync0.apply(this, arguments);
      };
    });
    for (const lv of String(AUTO).split(',').map(Number)) {
      await p.evaluate(lv => { document.querySelectorAll('.ov').forEach(o => o.hidden = true); hideTitle(); const ex = GC.LEVELS[lv].extra; MODE = ex ? 'free' : 'camp'; FREE = { boons: ex ? GC.partyBoons(lv) : [] }; CAMP = { ...freshCamp(), level: ex ? 0 : lv, boons: ex ? [] : GC.offerBoons([]).slice(0, lv) }; loadLevel(lv); }, lv);
      await p.click('#introGo'); const t0 = Date.now();
      for (;;) {
        lastAt = Date.now(); // each turn played counts as progress for the watchdog
        await tapThrough();
        await p.waitForFunction(() => (UI.phase === 'player' && !UI.busy) || UI.over, null, { timeout: 120000 });
        if (await p.evaluate(() => UI.over)) break;
        await p.evaluate(async () => {
          const idle2 = () => new Promise(res => { const f = () => (!UI.busy || UI.confirm) ? res() : setTimeout(f, 30); f(); });
          const id = G.S.active;
          for (let k = 0; k < 8 && G.S.phase === 'player' && G.S.active === id && G.U(id).ap > 0 && !UI.over; k++) {
            const r = G.U(id), piece = vu(id), S = G.S;
            if (S.smash && S.smash.cells.includes(G.key(r.c, r.r))) { const rch = G.reach(r); let out = null; for (const n of rch.values()) if (n.end && !S.smash.cells.includes(G.key(n.c, n.r)) && (!out || n.cost < out.cost)) out = n; if (out) { await moveHero(piece, G.pathTo(rch, G.key(out.c, out.r, out.l))); continue; } }
            const best = __BOT.options(G, r).sort((a, b) => b.v - a.v)[0];
            if (best && best.v > .9) { const pr = useCard(piece, best.id, best.target, best.path); await idle2(); if (UI.confirm) UI.confirm(true); await pr; }
            else { const pth = __BOT.positionMove(G, r); if (!pth) break; await moveHero(piece, pth); }
            await idle2();
          }
          if (UI.phase === 'player' && !UI.over && G.S.active === id) await endTurn();
        });
      }
      await tapThrough();
      const res = await p.evaluate(() => ({ result: G.S.result, round: G.S.round, diffs: __DIFFS.splice(0) }));
      ok(res.diffs.length === 0, `autoplay ${GC.LEVELS[lv].name}: ${res.result} in ${res.round} rounds, ${((Date.now() - t0) / 1000).toFixed(0)}s, ${res.diffs.length} table/rules mismatches${res.diffs.length ? ': ' + res.diffs.slice(0, 3).join(' | ') : ''}`);
      await shot('autoplay-L' + (lv + 1));
    }
  }

  console.log(fails ? `${fails} FAILED` : 'all passed'); console.log(errs.length ? 'PAGE ERRORS\n' + errs.join('\n') : 'no page errors');
  await b.close(); process.exit(fails || errs.length ? 1 : 0);
})();
