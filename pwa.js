/* EM Development portal: PWA bootstrap.
 * Include on the login page and BOTH dashboards (admin + customer) with:
 *   <script src="/pwa.js" defer></script>
 * Do NOT include it on index.html: the home page is not part of the app. */
(function () {
    'use strict';
    var head = document.head;

    // ---- Make sure the PWA tags exist (no-ops if the page already has them) ----
    function ensure(selector, create) {
        if (!document.querySelector(selector)) head.appendChild(create());
    }
    function el(tag, attrs) {
        var n = document.createElement(tag);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        return n;
    }
    ensure('link[rel="manifest"]', function () { return el('link', { rel: 'manifest', href: '/manifest.json' }); });
    ensure('meta[name="theme-color"]', function () { return el('meta', { name: 'theme-color', content: '#070a16' }); });
    ensure('link[rel="apple-touch-icon"]', function () { return el('link', { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' }); });
    ensure('meta[name="mobile-web-app-capable"]', function () { return el('meta', { name: 'mobile-web-app-capable', content: 'yes' }); });
    ensure('meta[name="apple-mobile-web-app-capable"]', function () { return el('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }); });
    ensure('meta[name="apple-mobile-web-app-title"]', function () { return el('meta', { name: 'apple-mobile-web-app-title', content: 'EM Portal' }); });
    ensure('meta[name="apple-mobile-web-app-status-bar-style"]', function () { return el('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }); });

    // ---- Keep the browser/status-bar colour in step with the light/dark theme ----
    function syncThemeColor() {
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', document.documentElement.classList.contains('light') ? '#f5f6ff' : '#070a16');
    }
    syncThemeColor();
    new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // ---- Service worker ----
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (e) {
                console.warn('Service worker registration failed:', e);
            });
        });
    }

    // ================= Install modal (login page only) =================
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var onLogin = /\/auth\/login(\.html)?$/.test(location.pathname);
    if (!onLogin || isStandalone) return;

    var DISMISS_KEY = 'pwaInstallDismissedAt';
    var DISMISS_DAYS = 7;            // after "Not now", ask again after a week
    var deferred = null;             // the browser's install prompt (Chrome / Edge / Android)
    var shown = false;

    var ua = navigator.userAgent || '';
    var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    function recentlyDismissed() {
        try {
            var t = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
            return t && (Date.now() - t) < DISMISS_DAYS * 864e5;
        } catch (e) { return false; }
    }
    function rememberDismiss() { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) { } }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();            // hold the prompt so the modal can trigger it when they say yes
        deferred = e;
        queueModal();
    });
    window.addEventListener('appinstalled', function () {
        deferred = null;
        closeModal(true);
    });
    // iOS never fires beforeinstallprompt, so show how to add it manually
    if (isIOSSafari) window.addEventListener('load', queueModal);

    function queueModal() {
        if (shown || recentlyDismissed()) return;
        // wait for the page's entrance animation, and never interrupt a login redirect
        setTimeout(function () {
            var loader = document.getElementById('pageLoader');
            if (shown || (loader && loader.classList.contains('show'))) return;
            openModal();
        }, 1800);
    }

    // ---- Modal ----
    var overlay, lastFocus;

    function injectStyles() {
        if (document.getElementById('pwaModalCss')) return;
        var s = document.createElement('style');
        s.id = 'pwaModalCss';
        s.textContent = [
            '#pwaModal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,6,16,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .35s ease;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif}',
            '#pwaModal.in{opacity:1}',
            '#pwaModal .pm-card{position:relative;width:100%;max-width:380px;text-align:center;padding:32px 26px 24px;border-radius:28px;background:#0d1226;border:1px solid rgba(255,255,255,.12);color:#e5e9ff;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(124,140,255,.12);transform:translateY(24px) scale(.96);transition:transform .45s cubic-bezier(.2,.7,.2,1)}',
            '#pwaModal.in .pm-card{transform:none}',
            '#pwaModal .pm-icon{width:68px;height:68px;margin:0 auto 16px;border-radius:18px;display:block;box-shadow:0 10px 28px rgba(91,108,255,.4)}',
            '#pwaModal h2{margin:0 0 8px;font-size:21px;font-weight:800;letter-spacing:-.01em}',
            '#pwaModal p{margin:0 0 22px;font-size:14.5px;line-height:1.55;color:#a9b2e6}',
            '#pwaModal ol{margin:0 0 22px;padding:0;list-style:none;text-align:left;font-size:14px;line-height:1.5;color:#c9d0f5;counter-reset:s}',
            '#pwaModal ol li{counter-increment:s;display:flex;gap:10px;align-items:flex-start;margin-top:10px}',
            '#pwaModal ol li::before{content:counter(s);flex:none;width:22px;height:22px;border-radius:9999px;background:linear-gradient(135deg,#5b6cff,#22d3ee);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}',
            '#pwaModal .pm-actions{display:flex;flex-direction:column;gap:10px}',
            '#pwaModal button{width:100%;padding:14px;border:0;border-radius:14px;cursor:pointer;font:700 15px/1 inherit;transition:transform .2s ease,box-shadow .2s ease,background-color .2s ease}',
            '#pwaModal .pm-yes{color:#fff;background:linear-gradient(90deg,#5b6cff,#4351e8);box-shadow:0 10px 24px rgba(91,108,255,.38)}',
            '#pwaModal .pm-yes:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(91,108,255,.55)}',
            '#pwaModal .pm-no{color:#a9b2e6;background:rgba(255,255,255,.06)}',
            '#pwaModal .pm-no:hover{background:rgba(255,255,255,.1)}',
            '#pwaModal button:focus-visible{outline:3px solid rgba(124,140,255,.6);outline-offset:2px}',
            '#pwaModal .pm-x{position:absolute;top:12px;right:12px;width:34px;height:34px;padding:0;border-radius:9999px;background:transparent;color:#8b95c9;font-size:22px;line-height:1}',
            '#pwaModal .pm-x:hover{background:rgba(255,255,255,.08)}',
            'html.light #pwaModal{background:rgba(15,21,53,.35)}',
            'html.light #pwaModal .pm-card{background:#fff;color:#0f1535;border-color:rgba(15,21,53,.1);box-shadow:0 30px 80px rgba(67,81,232,.22)}',
            'html.light #pwaModal p{color:#55608a}',
            'html.light #pwaModal ol{color:#374068}',
            'html.light #pwaModal .pm-no{color:#374068;background:rgba(15,21,53,.06)}',
            'html.light #pwaModal .pm-no:hover{background:rgba(15,21,53,.1)}',
            'html.light #pwaModal .pm-x{color:#6b7599}',
            '@media (prefers-reduced-motion:reduce){#pwaModal,#pwaModal .pm-card{transition-duration:.01ms!important}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function openModal() {
        if (shown) return;
        shown = true;
        injectStyles();
        lastFocus = document.activeElement;

        var manual = !deferred;        // iOS Safari: no one-tap install, so show the steps instead
        overlay = document.createElement('div');
        overlay.id = 'pwaModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'pmTitle');

        overlay.innerHTML =
            '<div class="pm-card">' +
            '<button type="button" class="pm-x" aria-label="Close">×</button>' +
            '<img class="pm-icon" src="/icons/icon-192.png" alt="" width="68" height="68">' +
            '<h2 id="pmTitle">Install EM Portal?</h2>' +
            (manual
                ? '<p>Add the portal to your home screen for one-tap access, just like an app.</p>' +
                '<ol><li><span>Tap the <b>Share</b> button in Safari.</span></li>' +
                '<li><span>Choose <b>Add to Home Screen</b>.</span></li>' +
                '<li><span>Tap <b>Add</b>.</span></li></ol>' +
                '<div class="pm-actions"><button type="button" class="pm-no pm-close">Got it</button></div>'
                : '<p>Get quick access to your projects, files and invoices right from your device. It installs in seconds and opens like a regular app.</p>' +
                '<div class="pm-actions">' +
                '<button type="button" class="pm-yes">Yes, install</button>' +
                '<button type="button" class="pm-no">Not now</button>' +
                '</div>') +
            '</div>';

        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add('in'); });

        var yes = overlay.querySelector('.pm-yes');
        var no = overlay.querySelector('.pm-no');
        (yes || no).focus();

        if (yes) yes.addEventListener('click', install);
        overlay.querySelector('.pm-x').addEventListener('click', function () { closeModal(false); });
        no.addEventListener('click', function () { closeModal(false); });
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(false); });
        document.addEventListener('keydown', onKey);
    }

    // Clicking "Yes, install" counts as the user gesture the browser needs, so the install starts automatically
    function install() {
        if (!deferred) { closeModal(false); return; }
        var p = deferred;
        deferred = null;
        closeModal(true);              // close our modal, then the browser's own install dialog takes over
        p.prompt();
        p.userChoice.then(function (c) {
            if (c && c.outcome !== 'accepted') rememberDismiss();
        }).catch(function () { });
    }

    function closeModal(installing) {
        if (!overlay) return;
        if (!installing) rememberDismiss();
        document.removeEventListener('keydown', onKey);
        var o = overlay; overlay = null;
        o.classList.remove('in');
        setTimeout(function () { o.remove(); }, 400);
        try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) { }
    }

    function onKey(e) {
        if (e.key === 'Escape') { closeModal(false); return; }
        if (e.key !== 'Tab' || !overlay) return;          // keep keyboard focus inside the modal
        var f = overlay.querySelectorAll('button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
})();