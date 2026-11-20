/* EM Development service worker.
 * - PWA pages (login, admin dashboard, customer dashboard): network first, saved copy when offline.
 * - Every other page (home, projects, 404...): always the network. They are never cached,
 *   but if the device has no connection, the visitor sees /offline.html instead of the browser's error page.
 * Bump VERSION whenever you change this file or want everyone to refresh cached pages. */
const VERSION = 'v4';
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
    // offline.html is required: if it cannot be saved, the install fails and the browser retries later,
    // so a worker that is active ALWAYS has the offline page ready.
    const off = await fetch(new Request('/offline.html', { cache: 'reload' }));
    if (!off.ok) throw new Error('offline.html not available');
    await cache.put('/offline.html', await clean(off));
    await Promise.all(PRECACHE.filter(u => u !== '/offline.html').map(async url => {
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

// Fetch that gives up after `ms` (a Wi-Fi with no internet can hang for a long time instead of failing)
function timed(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
const NET_TIMEOUT = 8000;
function load(event, req) {
  if (!self.navigator.onLine) return Promise.reject(new Error('offline'));
  return timed(Promise.resolve(event.preloadResponse).then(r => r || fetch(req)), NET_TIMEOUT);
}

// The offline page. Never lets the browser's own "You're offline" screen appear.
async function offlinePage() {
  const hit = await caches.match('/offline.html');
  if (hit) return clean(hit);
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | EM Development</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#070a16;color:#e8ebff;font-family:system-ui,sans-serif;text-align:center;padding:24px">' +
    '<div><h1 style="font-size:34px;margin:0 0 10px">You\u2019re offline</h1><p style="color:#a9b2e6">Check your connection and try again.</p>' +
    '<button onclick="location.reload()" style="margin-top:18px;padding:14px 26px;border:0;border-radius:14px;background:#5b6cff;color:#fff;font:700 15px system-ui">Try again</button></div>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Public pages (home, projects, 404...): never cached. Only a failed / hanging request falls back to the offline page.
// A 404 from the server is a normal response here, so it still shows 404.html.
async function networkOrOffline(event, req) {
  try { return await load(event, req); }
  catch (err) { return offlinePage(); }
}

async function networkFirst(event, req) {
  const cache = await caches.open(PAGES), path = new URL(req.url).pathname;
  try {
    const fresh = await load(event, req);
    if (fresh && fresh.ok) clean(fresh.clone()).then(r => cache.put(path, r)).catch(() => { });
    return fresh;
  } catch (err) {
    return (await findPage(cache, path)) || offlinePage();
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