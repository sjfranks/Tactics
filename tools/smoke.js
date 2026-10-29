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
  await p.waitForSelector('#hotbar .hk', { timeout: 120000 });
  await p.screenshot({ path: path.join(__dirname, 'smoke.png') });
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'ok: a hero is on turn, no errors');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
