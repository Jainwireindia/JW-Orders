/* Salesman Order service worker v1.2.2 — app shell offline; server calls are never cached. */
const VERSION = '1.2.2';
const CACHE = 'salesman-order-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;               // Apps Script / WhatsApp etc. go straight to the network
  const isPage = r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
  if (isPage) {
    // network first (so a new version shows up as soon as the phone is online), cache when offline or slow
    e.respondWith(
      Promise.race([fetch(u.pathname.endsWith('/') || r.mode === 'navigate' ? r.url : r, { cache: 'no-cache' }), timeout(4000)])
        .then(res => {
          if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); }
          return res;
        })
        .catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(r).then(h => h || fetch(r).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }))
  );
});
