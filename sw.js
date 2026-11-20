/* EM Development service worker.
 * - PWA pages (login, admin dashboard, customer dashboard): network first, saved copy when offline.
 * - Every other page (home, projects, 404...): always the network. They are never cached,
 *   but if the device has no connection, the visitor sees /offline.html instead of the browser's error page.
 * Bump VERSION whenever you change this file or want everyone to refresh cached pages. */
const VERSION = 'v3';
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
    // Fetch one by one so a missing page (404) does not break the whole install, and keep a clean copy of each.
    // A response that followed a redirect (for example /offline.html -> /offline when Vercel "cleanUrls" is on) cannot be used
    // to answer a page load, so the browser shows "site can't be reached" when offline. clean() removes that problem.
    await Promise.all(PRECACHE.map(async url => {
      try { const res = await fetch(new Request(url, { cache: 'reload' })); if (res.ok) await cache.put(url, await clean(res)); } catch (e) { }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [PAGES, ASSETS];
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('em-') && !keep.includes(n)).map(n => caches.delete(n)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => { });
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

  // Page loads
  if (req.mode === 'navigate') {
    const inApp = APP_PAGES.some(p => path === p || path === p.replace(/\.html$/, ''));
    // App pages: network first, fall back to the saved copy, then the offline page
    // Everything else: network only, but show the offline page when there is no connection
    event.respondWith(inApp ? networkFirst(event, req) : networkOrOffline(event, req));
    return;
  }

  // App files (icons, manifest, scripts)
  if (/^\/(icons\/|manifest\.json|pwa\.js|offline\.html)/.test(path) || /^\/(auth|components|customers)\//.test(path)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// A copy of a response that followed a redirect, rebuilt so it is allowed to answer a page load
async function clean(res) {
  if (!res || !res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}
// Look a page up by its path with or without ".html", so /auth/login and /auth/login.html both find the saved copy
async function findPage(cache, pathname) {
  const names = [pathname, pathname.replace(/\.html$/, ''), pathname.endsWith('.html') ? pathname : pathname + '.html'];
  for (const n of names) { const hit = await cache.match(n); if (hit) return clean(hit); }
  return null;
}

// Public pages (home, projects, 404...): never cached. Only a failed network request falls back to offline.html.
// A 404 from the server is a normal response here, so it still shows 404.html.
async function networkOrOffline(event, req) {
  try {
    return (await event.preloadResponse) || (await fetch(req));
  } catch (err) {
    const cache = await caches.open(PAGES);
    return (await findPage(cache, '/offline.html')) || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirst(event, req) {
  const cache = await caches.open(PAGES), path = new URL(req.url).pathname;
  try {
    const fresh = (await event.preloadResponse) || (await fetch(req));
    if (fresh && fresh.ok) clean(fresh.clone()).then(r => cache.put(path, r)).catch(() => { });
    return fresh;
  } catch (err) {
    const page = (await findPage(cache, path)) || (await findPage(cache, './offline.html'));
    return page || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
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