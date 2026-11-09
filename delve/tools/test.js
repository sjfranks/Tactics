'use strict';
// Browser test (Playwright with Chromium): real taps on the page, phone sized.
//   node delve/tools/test.js [fights]      add --shots to keep screenshots in delve/tools/shots/
// Each fight is played through the portraits (which hero acts next), the hotbar and the targets, with the party bot
// choosing; after every action it checks that the bars on screen show the HP the rules hold. Then: a sheet's tuning survives a reload and resets, and the
// simulator runs. Fails on any page error.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const fights = +process.argv.find(a => /^\d+$/.test(a)) || 2, shots = process.argv.includes('--shots');
const shotDir = path.join(__dirname, 'shots');
let failures = 0;
const fail = m => { failures++; console.log('FAIL', m); };

(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('**fonts.g**', r => r.fulfill({ body: '', contentType: 'text/css' })); // offline: system fonts stand in
  const url = 'file://' + path.join(__dirname, '..', 'index.html');
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForSelector('#hotbar .abtn');
  await p.evaluate(() => { VIEW.speed = 4; });
  if (shots) fs.mkdirSync(shotDir, { recursive: true });
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shotDir, n + '.png') }); };

  // the bars and numbers on screen against the rules
  const checkBars = () => p.evaluate(() => {
    const S = DELVE.S, bad = [];
    Object.values(S.units).forEach(u => {
      if (u.side === 'hero') {
        const t = document.querySelector(`.pc[data-id="${u.id}"] .pc-hp`).textContent;
        if (t !== `${Math.max(0, u.hp)}/${u.max}`) bad.push(`${u.id} shows ${t}, rules say ${u.hp}/${u.max}`);
      } else {
        const w = parseFloat(document.querySelector(`.tag[data-id="${u.id}"] .bar i`).style.width);
        if (Math.abs(w - Math.max(0, u.hp) / u.max * 100) > .5) bad.push(`${u.id} bar ${w}%, rules say ${u.hp}/${u.max}`);
      }
    });
    return bad;
  });

  for (let f = 0; f < fights; f++) {
    if (f) { await p.click('#rAgain'); await p.waitForSelector('#hotbar .abtn'); }
    await shot(`fight${f}-0-start`);
    let acts = 0, picks = 0;
    for (let i = 0; i < 2000; i++) {
      const st = await p.evaluate(() => ({ phase: DELVE.ui.phase, busy: DELVE.ui.busy, modal: !document.querySelector('#modal').hidden }));
      if (st.phase === 'over') break;
      if (st.busy || st.modal) { await p.waitForTimeout(100); continue; }
      const bad = await checkBars(); if (bad.length) fail(bad.join('; '));
      const c = await p.evaluate(() => { const S = DELVE.S, m = DV.mind(S); return { ...m, cur: DELVE.ui.hero, i: S.units[m.id].actions.indexOf(m.act), foe: m.target ? S.units[m.target].side === 'foe' : false }; });
      // the player picks who acts: tap that hero's portrait
      if (c.id !== c.cur) {
        await p.click(`.pc[data-id="${c.id}"]`); picks++;
        const now = await p.evaluate(() => DELVE.ui.hero);
        if (now !== c.id) fail(`tapping ${c.id}'s portrait picked ${now}`);
      }
      const btn = `#hotbar .abtn:nth-child(${c.i + 1})`;
      await p.click(btn);
      if (!c.target) await p.click(btn);
      else if (c.foe) { const box = await p.locator(`.tag[data-id="${c.target}"]`).boundingBox(); await p.mouse.click(box.x + box.width / 2, box.y + box.height * .6); }
      else await p.click(`.pc[data-id="${c.target}"]`);
      acts++;
      if (acts === 2) { await p.waitForTimeout(500); await shot(`fight${f}-1-roll`); }
    }
    await p.waitForSelector('#rAgain', { timeout: 20000 });
    const r = await p.evaluate(() => ({ over: DELVE.S.over, round: DELVE.S.round }));
    const bad = await checkBars(); if (bad.length) fail('at the end: ' + bad.join('; '));
    console.log(`fight ${f + 1}: ${r.over === 'hero' ? 'the party wins' : 'the goblins win'} in round ${r.round}, ${acts} hero actions through the hotbar, ${picks} heroes picked out of turn`);
    await shot(`fight${f}-2-result`);
  }

  // a sheet: tune Brakka, reload, reset
  await p.click('#rAgain'); await p.waitForSelector('#hotbar .abtn');
  await p.click('.pc[data-id="fighter"]'); await p.click('#tuneBtn');
  await p.click('.step button[data-f="hp"][data-d="1"]'); await p.click('.faces button[data-i="0"]');
  await p.reload(); await p.waitForSelector('#hotbar .abtn');
  let u = await p.evaluate(() => DELVE.S.units.fighter);
  if (u.max !== 15 || u.faces[0] !== 'hit') fail(`tuning did not survive a reload: ${u.max} HP, first face ${u.faces[0]}`);
  await p.click('#menuBtn'); await p.click('#mReset');
  u = await p.evaluate(() => DELVE.S.units.fighter);
  if (u.max !== 14 || u.faces[0] !== 'blank') fail(`reset did not restore the defaults: ${u.max} HP, first face ${u.faces[0]}`);
  // the simulator
  await p.click('#mSim'); await p.waitForSelector('#sAgain', { timeout: 20000 });
  const win = await p.textContent('.kpis .stat b');
  console.log(`simulator: the party wins ${win} of 1,000 fights`);
  await shot('sim');

  if (errs.length) fail('page errors:\n' + errs.join('\n'));
  console.log(failures ? `${failures} failure(s)` : 'ok');
  await b.close(); process.exit(failures ? 1 : 0);
})();
