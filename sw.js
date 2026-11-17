/* EM Development portal service worker.
 * Serves only the PWA pages (login, admin dashboard, customer dashboard).
 * The public home page (index.html) is never touched: it always goes to the network.
 * Bump VERSION whenever you change this file or want everyone to refresh cached pages. */
const VERSION = 'v1';
const PAGES = `em-pages-${VERSION}`;
const ASSETS = `em-assets-${VERSION}`;

const APP_PAGES = [
  '/auth/login.html',
  '/components/dashboard.html',
  '/customers/dashboard.html'
];
const PRECACHE = [
  ...APP_PAGES,
  '/offline.html',
  '/pwa.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// Third-party files that are safe to cache (static code and fonts only).
// Firebase Auth / Realtime Database API calls are NOT in this list, so they always hit the network.
const CDN_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const isFirebaseSdk = u => u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGES);
    // Add one by one so a missing page (404) does not break the whole install
    await Promise.all(PRECACHE.map(url => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [PAGES, ASSETS];
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('em-') && !keep.includes(n)).map(n => caches.delete(n)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ----- Other origins: only cache static CDN files -----
  if (url.origin !== self.location.origin) {
    if (CDN_HOSTS.includes(url.hostname) || isFirebaseSdk(url)) event.respondWith(staleWhileRevalidate(req));
    return; // everything else (Firebase APIs, analytics...) goes straight to the network
  }

  // ----- Same origin -----
  const path = url.pathname;

  // The public home page is not part of the PWA: never intercept it
  if (path === '/' || path === '/index.html' || path === '/index') return;

  // App pages: network first, fall back to cache, then the offline page
  if (req.mode === 'navigate') {
    const inApp = APP_PAGES.some(p => path === p || path === p.replace(/\.html$/, ''));
    if (!inApp) return;
    event.respondWith(networkFirst(event, req));
    return;
  }

  // App files (icons, manifest, scripts)
  if (/^\/(icons\/|manifest\.json|pwa\.js|offline\.html)/.test(path) || /^\/(auth|components|customers)\//.test(path)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(event, req) {
  const cache = await caches.open(PAGES);
  try {
    const fresh = (await event.preloadResponse) || (await fetch(req));
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = (await cache.match(req, { ignoreSearch: true })) || (await caches.match('/offline.html'));
    return cached || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(req);
  const refresh = fetch(req).then(res => {
    // Cache good responses (opaque ones too, which is what cross-origin scripts/fonts return)
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await refresh) || new Response('', { status: 504 });
}