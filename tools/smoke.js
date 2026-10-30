// Browser smoke test: load the game, set up the first battle and wait for a hero's turn, failing on any page error.
// node tools/smoke.js   (needs Playwright with Chromium)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 844 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('**fonts.g**', r => r.fulfill({ body: '', contentType: 'text/css' })); // play offline: the system fonts stand in
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.click('#introGo', { timeout: 30000 });
  // tap through the opening scene, then wait for a hero's turn
  for (let t = Date.now(); Date.now() - t < 240000 && !(await p.$('#hotbar .hk'));) { if (await p.isVisible('#talk')) await p.click('#talk .tk'); await p.waitForTimeout(300); }
  if (!(await p.$('#hotbar .hk'))) { console.log('STUCK', await p.evaluate(() => JSON.stringify({ phase: UI.phase, busy: UI.busy, round: G && G.S.round, errors: window.__ERRS }))); console.log(errs.join('\n')); process.exit(1); }
  require('fs').mkdirSync(path.join(__dirname, 'shots'), { recursive: true }); await p.screenshot({ path: path.join(__dirname, 'shots', 'smoke.png') });
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'ok: a hero is on turn, no errors');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
