/* Paragon service worker: network first, falling back to the cached copy when offline.
   The Pages workflow replaces BUILD with the commit, so each deploy gets a fresh cache. */
const CACHE = 'paragon-BUILD';
const CORE = ['./', 'index.html', 'app.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png',
  'js/rules.js', 'js/races.js', 'js/classes.js', 'js/powers-cleric.js', 'js/powers-fighter.js', 'js/powers-paladin.js',
  'js/powers-ranger.js', 'js/powers-rogue.js', 'js/powers-warlock.js', 'js/powers-warlord.js', 'js/powers-wizard.js',
  'js/feats.js', 'js/items.js', 'js/paths.js', 'js/engine.js', 'js/parse.js', 'js/ui.js', 'js/app.js', 'js/main.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('paragon-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const put = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
  } else if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(put)));
  }
});
