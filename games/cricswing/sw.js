/* Cricket Dash — Service Worker
   v2: HTML responses are NEVER cached, so a refresh always reflects the latest
   server bundle (fixes "updated but TV still shows the old version" after a
   deploy). Only static assets (.js/.css/.png/.svg/.json/.ttf/.webp) are cached.
   Bumping CACHE evicts the stale v1 caches that included HTML routes.

   !! DEPLOY CHECKLIST !!
   If you change ANY of these shared files, bump CACHE to the next version:
     - shared/shot-visuals.js
     - shared/relay-enrich.js
     - Any .js file loaded by both bat.html and screen.html
   Failure to bump = phone runs new JS, TV runs old cached JS = silent mismatch.
   Pattern: 'cricket-v2' → 'cricket-v3' → 'cricket-v4' (never reuse a name). */
const CACHE = 'cricket-v4';
const PRECACHE = ['/manifest.json', '/sw.js', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Skip WebSocket and external URLs
  if (url.pathname.startsWith('/ws/') || url.origin !== self.location.origin) return;

  /* HTML (anything ending in .html OR a route like '/', '/bat', '/play',
     '/screen') is ALWAYS network-fresh — bypass the cache entirely so the
     user can never see a stale page after a rebuild. Only static assets get
     the cache-on-success strategy below. */
  const isHtmlRoute = url.pathname === '/' ||
                      url.pathname === '/bat' ||
                      url.pathname === '/play' ||
                      url.pathname === '/screen' ||
                      url.pathname.endsWith('.html');
  if (isHtmlRoute) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() =>
      new Response('Offline', { status: 503 })));
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => cached || new Response('Offline', { status: 503 }))
    )
  );
});
