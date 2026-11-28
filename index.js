// Preloader
    const loadbar = document.getElementById('loadbar');
    const logoFill = document.getElementById('logoFill');
    requestAnimationFrame(() => {
      loadbar.style.width = '100%';
      if (logoFill) logoFill.style.clipPath = 'inset(0 0 0 0)';
    });
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('preloader').classList.add('preloader-out');
        document.querySelectorAll('#home [data-reveal]').forEach(el => el.classList.add('revealed'));
      }, 1300);
    });

    // Scroll reveal
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });
    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (!el.closest('#home')) io.observe(el);
    });

    // Fade in when entering the viewport, fade out when leaving
    const fio = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting));
    }, {
      threshold: 0.2
    });
    document.querySelectorAll('[data-fade]').forEach(el => fio.observe(el));

    // Counters
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target,
          target = +el.dataset.count,
          dur = 1800,
          start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          el.textContent = Math.floor((1 - Math.pow(1 - p, 4)) * target);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        cio.unobserve(el);
      });
    }, {
      threshold: 0.6
    });
    document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

    // Typing effect (frame-synced, no layout shift, pauses when off-screen)
    (function () {
      const words = ['websites', 'mobile apps', 'web systems', 'online stores', 'dashboards'];
      const typed = document.getElementById('typed'),
        slot = document.getElementById('typedSlot'),
        ghost = document.getElementById('typedGhost');
      ghost.textContent = words.reduce((a, b) => b.length > a.length ? b : a);
      const node = document.createTextNode('');
      typed.appendChild(node);
      const TYPE = 90, DEL = 45, HOLD = 1500, GAP = 250;
      let w = 0, shown = -1, phase = 'type', t0 = performance.now(), raf = 0, pausedE = 0;

      function setText(n) {
        if (n !== shown) { shown = n; node.nodeValue = words[w].slice(0, n); }
      }
      function setState(v) {
        if (slot.dataset.s !== v) slot.dataset.s = v;
      }
      function frame(now) {
        raf = requestAnimationFrame(frame);
        const len = words[w].length,
          e = now - t0;
        if (phase === 'type') {
          const n = Math.min(len, Math.floor(e / TYPE));
          setState('run');
          setText(n);
          if (n >= len) { phase = 'hold'; t0 = now; }
        } else if (phase === 'hold') {
          setState('hold');
          if (e >= HOLD) { phase = 'del'; t0 = now; }
        } else if (phase === 'del') {
          const n = Math.max(0, len - Math.floor(e / DEL));
          setState('run');
          setText(n);
          if (n <= 0) { phase = 'gap'; t0 = now; }
        } else {
          setState('hold');
          if (e >= GAP) { w = (w + 1) % words.length; phase = 'type'; t0 = now; shown = -1; }
        }
      }

      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setState('run');
        node.nodeValue = words[0];
        setInterval(() => { w = (w + 1) % words.length; node.nodeValue = words[w]; }, 2500);
        return;
      }
      new IntersectionObserver(es => {
        if (es[0].isIntersecting) {
          if (!raf) { t0 = performance.now() - pausedE; raf = requestAnimationFrame(frame); }
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
          pausedE = performance.now() - t0;
        }
      }).observe(slot);
    })();

    // Duplicate marquee for seamless loop
    const row = document.getElementById('marqueeRow');
    row.parentElement.appendChild(row.cloneNode(true));

    // Nav + progress
    const nav = document.getElementById('nav'),
      progress = document.getElementById('progress');

    function onScroll() {
      const y = window.scrollY,
        h = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (y / h * 100) + '%';
      nav.classList.toggle('bg-ink/80', y > 40);
      nav.classList.toggle('backdrop-blur-xl', y > 40);
      nav.classList.toggle('border-b', y > 40);
      nav.classList.toggle('border-white/5', y > 40);
    }
    let scrollTick = false;
    addEventListener('scroll', () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => { scrollTick = false; onScroll(); });
    }, {
      passive: true
    });
    onScroll();

    // Mobile menu
    const menuBtn = document.getElementById('menuBtn'),
      mobileMenu = document.getElementById('mobileMenu');
    let open = false;

    function setMenu(v) {
      open = v;
      mobileMenu.style.maxHeight = v ? mobileMenu.scrollHeight + 'px' : '0px';
      const bars = menuBtn.querySelectorAll('span');
      bars[0].style.transform = v ? 'translateY(8px) rotate(45deg)' : '';
      bars[1].style.opacity = v ? '0' : '1';
      bars[2].style.transform = v ? 'translateY(-8px) rotate(-45deg)' : '';
    }
    menuBtn.addEventListener('click', () => setMenu(!open));
    document.querySelectorAll('.mlink').forEach(a => a.addEventListener('click', () => setMenu(false)));

    // Spotlight + 3D tilt on cards
    document.querySelectorAll('.spot').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect(),
          x = e.clientX - r.left,
          y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        if (card.classList.contains('tilt')) {
          const rx = ((y / r.height) - .5) * -8,
            ry = ((x / r.width) - .5) * 8;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        if (card.classList.contains('tilt')) card.style.transform = '';
      });
    });

    // Cursor glow + hero parallax
    const glow = document.getElementById('cursorGlow');
    const hero = document.getElementById('heroVisual');
    const parEls = [...hero.querySelectorAll('.parallax')];
    let mmX = 0, mmY = 0, mmTick = false;
    addEventListener('mousemove', e => {
      mmX = e.clientX; mmY = e.clientY;
      if (mmTick) return;
      mmTick = true;
      requestAnimationFrame(() => {
        mmTick = false;
        glow.style.transform = `translate(${mmX - 250}px, ${mmY - 250}px)`;
        const cx = (mmX / innerWidth - .5),
          cy = (mmY / innerHeight - .5);
        parEls.forEach(el => {
          const d = +el.dataset.depth;
          el.style.translate = `${cx * d}px ${cy * d}px`;
        });
      });
    }, { passive: true });

    // Light / dark theme toggle
    const themeBtn = document.getElementById('themeBtn'),
      rootEl = document.documentElement;

    function syncThemeLabel() {
      themeBtn.setAttribute('aria-label', rootEl.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode');
    }
    syncThemeLabel();
    function applyTheme() {
      const isLight = rootEl.classList.toggle('light');
      try {
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
      } catch (e) {}
      syncThemeLabel();
    }
    let themeBusy = false;

    function themeFallback() {
      requestAnimationFrame(() => {
        applyTheme();
        requestAnimationFrame(() => {
          const f = document.body.animate([{
            opacity: .55
          }, {
            opacity: 1
          }], {
            duration: 320,
            easing: 'ease-out'
          });
          f.onfinish = f.oncancel = () => {
            rootEl.classList.remove('theme-instant');
            themeBusy = false;
          };
        });
      });
    }
    themeBtn.addEventListener('click', () => {
      if (themeBusy) return;
      themeBusy = true;
      // Pause heavy effects first so the browser only has two still frames to blend
      rootEl.classList.add('theme-instant');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduce) return themeFallback();
      const r = themeBtn.getBoundingClientRect(),
        x = r.left + r.width / 2,
        y = r.top + r.height / 2,
        rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      requestAnimationFrame(() => {
        const vt = document.startViewTransition(applyTheme);
        vt.ready.then(() => {
          document.documentElement.animate({
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`]
          }, {
            duration: 750,
            easing: 'cubic-bezier(.4,0,.2,1)',
            pseudoElement: '::view-transition-new(root)'
          });
        }).catch(() => {});
        vt.finished.finally(() => {
          rootEl.classList.remove('theme-instant');
          themeBusy = false;
        });
      });
    });

    // Free quote modal
    const qModal = document.getElementById('quoteModal'),
      qForm = document.getElementById('quoteForm');
    const qFormView = document.getElementById('quoteFormView'),
      qSuccess = document.getElementById('quoteSuccess');
    const qSubmit = document.getElementById('quoteSubmit'),
      qLabel = document.getElementById('quoteSubmitLabel');
    let lastFocus = null,
      qTimer = null;
    const focusables = () => [...qModal.querySelectorAll('button, input, select, textarea, a[href]')].filter(el => el.offsetParent !== null);

    function openQuote() {
      lastFocus = document.activeElement;
      clearTimeout(qTimer);
      qFormView.classList.remove('is-hidden');
      qSuccess.classList.add('is-hidden');
      qSuccess.classList.remove('play');
      const sbw = innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
      qModal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => qModal.classList.add('is-open'));
      setTimeout(() => {
        const f = qForm.querySelector('input');
        if (f) f.focus({
          preventScroll: true
        });
      }, 350);
    }

    function closeQuote() {
      qModal.classList.remove('is-open');
      qModal.setAttribute('aria-hidden', 'true');
      qTimer = setTimeout(() => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        qForm.reset();
        qFormView.classList.remove('is-hidden');
        qSuccess.classList.add('is-hidden');
        qSuccess.classList.remove('play');
      }, 480);
      if (lastFocus && lastFocus.focus) lastFocus.focus({
        preventScroll: true
      });
    }
    document.querySelectorAll('[data-open-quote]').forEach(b => b.addEventListener('click', openQuote));
    qModal.querySelectorAll('[data-close-quote]').forEach(b => b.addEventListener('click', closeQuote));
    addEventListener('keydown', e => {
      if (!qModal.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        closeQuote();
        return;
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    qForm.addEventListener('submit', async e => {
      e.preventDefault();
      const qErr = document.getElementById('quoteError');
      qErr.classList.add('hidden');
      qSubmit.disabled = true;
      qSubmit.classList.add('opacity-80');
      qLabel.textContent = 'Sending...';
      qSubmit.insertAdjacentHTML('afterbegin', '<span class="q-spinner" id="qSpin"></span>');

      const fd = new FormData(qForm);
      const email = (fd.get('email') || '').trim().toLowerCase();
      const countryCode = fd.get('countryCode') || '';
      const mobile = String(fd.get('mobile') || '').replace(/[\s\-]/g, '').replace(/^0+/, '');
      const opt = document.getElementById('quoteCountry').selectedOptions[0];
      const min = +opt.dataset.min,
        max = +opt.dataset.max;
      const fail = msg => {
        const sp0 = document.getElementById('qSpin');
        if (sp0) sp0.remove();
        qSubmit.disabled = false;
        qSubmit.classList.remove('opacity-80');
        qLabel.textContent = 'Request My Free Quote';
        qErr.textContent = msg;
        qErr.classList.remove('hidden');
      };
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(email)) return fail('Please enter a valid email address.');
      if (!/^[0-9]+$/.test(mobile)) return fail('Mobile number must contain digits only.');
      if (mobile.length < min || mobile.length > max) return fail('Please enter a valid mobile number for ' + countryCode + ' (' + (min === max ? min : min + '-' + max) + ' digits, no leading 0).');
      const payload = {
        name: (fd.get('name') || '').trim(),
        email,
        countryCode,
        mobile,
        phone: countryCode + mobile,
        service: fd.get('service') || '',
        details: (fd.get('details') || '').trim()
      };

      let ok = false;
      try {
        if (!window.saveQuote) throw new Error('Firebase not loaded');
        await window.saveQuote(payload);
        ok = true;
      } catch (err) {
        console.error('Quote submit failed:', err);
      }

      const sp = document.getElementById('qSpin');
      if (sp) sp.remove();
      qSubmit.disabled = false;
      qSubmit.classList.remove('opacity-80');
      qLabel.textContent = 'Request My Free Quote';

      if (ok) {
        qFormView.classList.add('is-hidden');
        qSuccess.classList.remove('is-hidden');
        requestAnimationFrame(() => qSuccess.classList.add('play'));
      } else {
        qErr.textContent = 'Sorry, something went wrong sending your request. Please try again.';
        qErr.classList.remove('hidden');
      }
    });

    // Login: 3s loading animation, then fade out and navigate
    const ptEl = document.getElementById('pageTransition');
    let ptBusy = false;
    document.querySelectorAll('[data-login]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        if (ptBusy) return;
        ptBusy = true;
        const href = link.getAttribute('href');
        setMenu(false);
        ptEl.classList.remove('is-leaving');
        ptEl.setAttribute('aria-hidden', 'false');
        ptEl.classList.add('is-active');
        setTimeout(() => ptEl.classList.add('is-leaving'), 3000); // fade out the loader
        setTimeout(() => {
          window.location.href = href;
        }, 3700); // then go to the login page
      });
    });
    // Reset if the user comes back with the browser's back button
    addEventListener('pageshow', e => {
      if (e.persisted) {
        ptBusy = false;
        ptEl.classList.remove('is-active', 'is-leaving');
        ptEl.setAttribute('aria-hidden', 'true');
      }
    });

    document.getElementById('year').textContent = new Date().getFullYear();
  
;
    (function() {
      const chips = a => a.map(t => '<span class="pm-chip">' + t + '</span>').join('');
      const P = {
        moren: {
          hero: 'images/moren.webp',
          cat: 'E-Commerce Website',
          accent: 'text-amber-300',
          title: 'Moren Timepiece',
          tag: 'Timeless Precision. Modern Elegance.',
          url: 'https://morentimepiece.com/',
          intro: 'Moren Timepiece is a Cebu-based online store for carefully selected, authentic watches. We built a fast, elegant storefront that lets collectors browse by brand, spot new arrivals and sale pieces, and check out securely.',
          stats: [
            ['Live', 'Status'],
            ['3', 'Featured brands'],
            ['PHP', 'Local pricing'],
            ['Cebu', 'Philippines']
          ],
          shots: ['https://morentimepiece.com/wp-content/uploads/2026/10/13714-300x300.jpg', 'https://morentimepiece.com/wp-content/uploads/2026/07/3076-300x300.jpg', 'https://morentimepiece.com/wp-content/uploads/2026/07/5845-300x300.jpg'],
          shotNote: 'Products shown straight from the live store.',
          features: [
            ['Curated watch collection', 'Browse by brand (Seiko, Citizen, Omega) and category, with clear stock status on every piece.'],
            ['New Arrivals & Popular', 'Homepage sections that automatically surface the latest and best-selling watches.'],
            ['Sale & Final Sale pages', 'A dedicated sale collection with markdown pricing and clear final-sale terms.'],
            ['Cart, checkout & accounts', 'Shopping cart, login and customer account area, plus a storewide promo-code banner.'],
            ['Trust built in', 'Authenticity messaging, return & refund policy page and an About page.'],
            ['Easy to reach', 'Facebook, Instagram, TikTok, Viber, phone and email links in the header and footer.']
          ],
          stack: ['WordPress', 'WooCommerce', 'Elementor', 'Responsive design', 'SEO-ready']
        },
        inventory: {
          cat: 'Web System',
          accent: 'text-aqua',
          title: 'Inventory Management Platform',
          tag: 'Real-time stock control for growing teams.',
          intro: 'A real-time stock tracking progressive web app with role-based access and live reports, so teams always know what is on the shelf.',
          stats: [
            ['PWA', 'Installable'],
            ['Live', 'Stock updates'],
            ['Roles', 'Access control'],
            ['Reports', 'Real-time']
          ],
          features: [
            ['Real-time stock tracking', 'Quantities update instantly across every device.'],
            ['Role-based access', 'Admins, managers and staff each see only what they need.'],
            ['Live reports', 'Instant insight into movement, low stock and trends.']
          ],
          stack: ['Progressive Web App', 'Role-based auth', 'Live reports']
        },
        food: {
          cat: 'Mobile App',
          accent: 'text-pink',
          title: 'Food Delivery & Ordering App',
          tag: 'From craving to doorstep.',
          intro: 'An iOS and Android app with live order tracking and secure in-app payments.',
          stats: [
            ['iOS', 'Platform'],
            ['Android', 'Platform'],
            ['Live', 'Order tracking'],
            ['Secure', 'Payments']
          ],
          features: [
            ['Live order tracking', 'Customers follow their order from kitchen to door.'],
            ['Secure in-app payments', 'Fast, safe checkout inside the app.'],
            ['Cross-platform', 'One experience on both iOS and Android.']
          ],
          stack: ['iOS', 'Android', 'Payments', 'Live tracking']
        },
        analytics: {
          cat: 'Dashboard',
          accent: 'text-emerald-300',
          title: 'Business Analytics Dashboard',
          tag: 'Every branch, one clear view.',
          intro: 'Interactive sales and operations insights for a multi-branch retailer.',
          stats: [
            ['Multi', 'Branch'],
            ['Live', 'Insights'],
            ['Interactive', 'Charts'],
            ['Ops', 'Sales + operations']
          ],
          features: [
            ['Branch comparison', 'See how every location performs side by side.'],
            ['Interactive charts', 'Filter and drill into sales and operations data.'],
            ['Decision-ready', 'The numbers owners need, without the spreadsheets.']
          ],
          stack: ['Data visualization', 'Interactive charts', 'Multi-branch']
        },
        oriel: {
          host: 'Oriel Architects',
          cat: 'Architecture Website',
          accent: 'text-yellow-300',
          title: 'Oriel Architects',
          tag: 'Designing homes, galleries and civic spaces.',
          url: './projects/architecture/home.html',
          intro: 'A website for a twelve-person architecture studio that designs homes, galleries and civic spaces. It pairs a blueprint-inspired hero with bold typography and a theme that switches between dark and light.',
          stats: [['Multi-page', 'Website'], ['Dark & light', 'Theme'], ['12', 'Person studio'], ['Blueprint', 'Design style']],
          features: [
            ['Blueprint-inspired hero', 'An opening section that borrows the look of an architect\'s drawing.'],
            ['Bold typography', 'Large, confident headlines that give the studio a strong voice.'],
            ['Dark & light theme', 'Visitors can switch the whole site between dark and light mode.'],
            ['Multi-page website', 'A complete website with its own pages, not just a single landing page.'],
            ['Made for a studio', 'Written around a twelve-person team and the way they work.'],
            ['Homes, galleries & civic spaces', 'The kinds of projects the studio designs, presented front and centre.']
          ],
          stack: ['Multi-page', 'Dark & light mode', 'Blueprint design', 'Bold typography']
        },
        stockshelf: {
          host: 'StockShelf · Stock overview',
          cat: 'Web System',
          accent: 'text-amber-300',
          title: 'StockShelf',
          tag: 'Inventory management, always up to date.',
          url: './projects/inventory/auth.html',
          intro: 'An inventory management platform with a live stock overview, low-stock alerts, recent orders and supplier tracking. A built-in guided tour helps new users find their way, all in a bold dark and light interface.',
          stats: [['Live', 'Stock overview'], ['Alerts', 'Low stock'], ['Orders', 'Recent activity'], ['Tour', 'Guided']],
          features: [
            ['Live stock overview', 'Products tracked, units in stock and low-stock items at a glance.'],
            ['Low-stock alerts', 'Spot items that are running out before they cause a problem.'],
            ['Recent orders', 'See the latest orders as they come in.'],
            ['Supplier tracking', 'Keep track of suppliers alongside the stock they provide.'],
            ['Guided tour', 'A built-in walkthrough that shows new users around the dashboard.'],
            ['Dark & light interface', 'A bold look that works in both dark and light mode.']
          ],
          stack: ['Dashboard', 'Orders & suppliers', 'Dark & light mode', 'Guided tour']
        },
        sakayna: {
          host: 'SakayNa Cebu · Landing page',
          cat: 'Commute App Website',
          accent: 'text-sky-300',
          title: 'SakayNa Cebu',
          tag: 'Know when your jeepney or bus arrives.',
          url: './projects/commute/home.html',
          intro: 'A landing page and live demo for a jeepney and bus tracking app for Cebu City commuters. It features an animated map, arrival countdowns, a nearest-stop finder and a waitlist signup.',
          stats: [['Live', 'Map demo'], ['Countdown', 'Arrival times'], ['Nearest', 'Stop finder'], ['Waitlist', 'Signup']],
          features: [
            ['Live map demo', 'An animated map showing jeepneys and buses moving around the city.'],
            ['Arrival countdowns', 'Clear countdowns so commuters know how long they have to wait.'],
            ['Nearest-stop finder', 'Helps riders find the closest stop to where they are.'],
            ['Waitlist signup', 'A signup modal that collects early interest in the app.'],
            ['Animated experience', 'Motion that shows how the app works before it is even launched.'],
            ['Made for Cebu City', 'Built around the jeepney and bus routes commuters use every day.']
          ],
          stack: ['Live map demo', 'Arrival countdowns', 'Waitlist modal', 'Animated']
        },
        kpiharbor: {
          host: 'KPIHarbor · Business overview',
          cat: 'Analytics Dashboard',
          accent: 'text-sky-300',
          title: 'KPIHarbor',
          tag: 'Turn your own numbers into live charts.',
          url: './projects/KpiHarbor/dashboard.html',
          intro: 'A business analytics dashboard that turns your own numbers into live charts. Add records by hand or upload JSON, Excel and CSV files, with animated metrics, a guided tour and a light and dark mode that spreads across the whole page.',
          stats: [['Live', 'Charts'], ['3', 'Import formats'], ['Guided', 'Tour'], ['Dark & light', 'Theme']],
          features: [
            ['Live charts', 'Revenue, expenses, profit and more, drawn from your own data.'],
            ['Add records by hand', 'Enter figures directly in the dashboard whenever you need to.'],
            ['JSON, Excel & CSV import', 'Upload your existing files and see them as charts straight away.'],
            ['Animated metrics', 'Key numbers such as revenue, orders and profit margin come to life on screen.'],
            ['Guided tour', 'A built-in walkthrough that introduces each part of the dashboard.'],
            ['Dark & light mode', 'A theme switch that spreads smoothly across the whole page.']
          ],
          stack: ['Live charts', 'JSON, Excel & CSV import', 'Dark & light mode', 'Guided tour']
        },
        dinkline: {
          host: 'Dinkline · Customer home',
          cat: 'Court Booking App',
          accent: 'text-lime-300',
          title: 'Dinkline',
          tag: 'Book a pickleball court in a few taps.',
          url: './projects/dinkline/auth.html',
          intro: 'A pickleball court booking app where players pick a day up to a week ahead, reserve a court, and keep track of their games, monthly hours and membership from one clean dashboard, in dark and light mode.',
          stats: [['7 days', 'Booking window'], ['Courts', 'Reserve online'], ['Hours', 'Tracked monthly'], ['Dark & light', 'Theme']],
          features: [
            ['Court booking', 'Pick a day up to a week ahead and reserve a court.'],
            ['My bookings', 'Keep track of upcoming games and past bookings in one place.'],
            ['Monthly hours', 'See how many hours you have played this month.'],
            ['Membership', 'Check membership details right from the dashboard.'],
            ['One clean dashboard', 'Next game, games played and upcoming bookings all on the home screen.'],
            ['Dark & light mode', 'Switch between a dark and a light look to suit the player.']
          ],
          stack: ['Court booking', 'My bookings', 'Membership', 'Dark & light mode']
        }
      };
      // Use each card's own screenshot as the detail page preview (no duplicate image data)
      Object.keys(P).forEach(k => {
        if (P[k].hero) return;
        const c = document.querySelector('[data-project="' + k + '"]'),
          im = c && c.querySelector('.shot img');
        if (im) P[k].hero = im.currentSrc || im.src;
      });
      const modal = document.getElementById('projModal'),
        body = document.getElementById('pmBody');
      let last = null;

      function render(k) {
        const d = P[k];
        const hero = d.hero ? '<div class="pm-in mt-12 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"><div class="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border-b border-white/10"><span class="w-2.5 h-2.5 rounded-full bg-red-400/80"></span><span class="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></span><span class="w-2.5 h-2.5 rounded-full bg-green-400/80"></span><span class="ml-3 text-xs font-mono text-slate-400">' + (d.host || 'morentimepiece.com') + '</span></div><img src="' + d.hero + '" alt="' + d.title + ' preview" class="block w-full h-auto"></div>' : '';
        const shots = d.shots ? '<section class="pm-in mt-14"><h2 class="text-xl font-bold">Featured pieces</h2><div class="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">' +
          d.shots.map(u => '<div class="pm-shot"><img src="' + u + '" alt="" loading="lazy" onerror="this.parentNode.style.display=\'none\'"></div>').join('') +
          '</div><p class="mt-3 text-xs text-slate-500">' + d.shotNote + '</p></section>' : '';
        const visit = d.url ? '<a href="' + d.url + '" target="_blank" rel="noopener" class="btn-solid btn-shine mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-aqua px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 hover:scale-105 transition-transform">Visit live website <span aria-hidden="true">↗</span></a>' : '';
        body.innerHTML =
          '<header class="pm-in pt-6 sm:pt-12 max-w-3xl"><span class="text-xs font-mono ' + d.accent + '">' + d.cat.toUpperCase() + '</span>' +
          '<h2 id="pmTitle" class="mt-3 text-4xl sm:text-6xl font-extrabold tracking-tight"><span class="gradient-text">' + d.title + '</span></h2>' +
          '<p class="mt-4 text-lg text-slate-300">' + d.tag + '</p><p class="mt-5 text-slate-400 leading-relaxed">' + d.intro + '</p>' + visit + '</header>' + hero +
          '<section class="pm-in mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">' +
          d.stats.map(x => '<div class="glass rounded-2xl p-5"><div class="text-2xl font-extrabold">' + x[0] + '</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">' + x[1] + '</div></div>').join('') + '</section>' +
          shots +
          '<section class="pm-in mt-14"><h2 class="text-xl font-bold">What we built</h2><div class="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
          d.features.map(f => '<div class="glass rounded-2xl p-6"><h3 class="font-bold">' + f[0] + '</h3><p class="mt-2 text-sm text-slate-400 leading-relaxed">' + f[1] + '</p></div>').join('') + '</div></section>' +
          '<section class="pm-in mt-14"><h2 class="text-xl font-bold">Built with</h2><div class="mt-5 flex flex-wrap gap-2">' + chips(d.stack) + '</div></section>' +
          '<section class="pm-in mt-16 glass rounded-3xl p-8 sm:p-10 text-center"><h2 class="text-2xl sm:text-3xl font-extrabold">Want something like this?</h2><p class="mt-3 text-slate-400">Tell us about your project and we will send you a free quote.</p>' +
          '<button type="button" data-pm-quote class="btn-solid btn-shine mt-6 rounded-full bg-gradient-to-r from-brand-500 to-aqua px-7 py-3.5 text-sm font-bold text-white hover:scale-105 transition-transform">Start your project</button></section>';
      }

      function open(k, trigger) {
        if (!P[k]) return;
        last = trigger;
        render(k);
        modal.scrollTop = 0;
        document.body.style.overflow = 'hidden';
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('is-open');
        document.getElementById('pmClose').focus({
          preventScroll: true
        });
        try {
          history.replaceState(null, '', '#project-' + k);
        } catch (e) {}
      }

      function close() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        try {
          history.replaceState(null, '', '#work');
        } catch (e) {}
        if (last && last.focus) last.focus({
          preventScroll: true
        });
      }
      document.querySelectorAll('[data-project]').forEach(c => {
        c.addEventListener('click', () => open(c.dataset.project, c));
        c.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(c.dataset.project, c);
          }
        });
      });
      document.getElementById('pmClose').addEventListener('click', close);
      document.getElementById('pmBack').addEventListener('click', close);
      addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
      });
      // "Start your project" -> close and open the existing quote form
      body.addEventListener('click', e => {
        if (!e.target.closest('[data-pm-quote]')) return;
        close();
        setTimeout(() => {
          const b = document.querySelector('[data-open-quote]');
          if (b) b.click();
        }, 500);
      });
      const m = location.hash.match(/^#project-(\w+)$/);
      if (m && P[m[1]]) open(m[1], null);
    })();
  
;
    (function () {
      const w = document.getElementById('work');
      if (!w) return;
      const cards = [...w.querySelectorAll('.proj-card')].filter(c => c.children.length >= 2);
      if (cards.length < 2) return;
      const imgs = [],
        txts = [];
      cards.forEach((c, i) => {
        const im = c.children[0],
          tx = c.children[1];
        im.classList.add('ps-img');
        tx.classList.add('ps-txt');
        tx.dataset.n = i + 1;
        tx.dataset.t = cards.length;
        im.dataset.i = tx.dataset.i = i;
        imgs.push(im);
        txts.push(tx);
      });
      w.style.setProperty('--n', cards.length);
      w.classList.add('ps');

      const mq = matchMedia('(max-width: 1023px)');
      const colors = ['#fbbf24', '#facc15', 'rgb(var(--aqua))', '#34d399', 'rgb(var(--b400))', 'rgb(var(--pink))'];
      const rail = document.createElement('div');
      rail.className = 'ps-rail';
      const btns = cards.map((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to project ' + (i + 1));
        b.addEventListener('click', () => {
          if (mq.matches) {
            const box = w.querySelector('.relative.max-w-7xl'),
              slide = cards[i].closest('[data-fade]') || cards[i];
            box.scrollTo({
              left: slide.offsetLeft - 20,
              behavior: 'smooth'
            });
          } else txts[i].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        });
        rail.appendChild(b);
        return b;
      });
      const count = document.createElement('span');
      rail.appendChild(count);
      w.querySelector('.relative.max-w-7xl').appendChild(rail);

      function set(i) {
        imgs.forEach((el, j) => el.classList.toggle('is-active', j === i));
        txts.forEach((el, j) => el.classList.toggle('is-active', j === i));
        btns.forEach((el, j) => el.classList.toggle('is-active', j === i));
        cards.forEach((el, j) => el.classList.toggle('is-current', j === i));
        cards.forEach((c, j) => c.classList.toggle('is-on', j === i));
        w.style.setProperty('--pc', colors[i % colors.length]);
        count.textContent = '0' + (i + 1) + ' / 0' + cards.length;
      }
      // 3D tilt + glossy highlight on the pinned image (desktop, mouse only)
      imgs.forEach(im => {
        im.addEventListener('mousemove', e => {
          const r = im.getBoundingClientRect(),
            px = (e.clientX - r.left) / r.width,
            py = (e.clientY - r.top) / r.height;
          im.style.setProperty('--ry', ((px - .5) * 7).toFixed(2) + 'deg');
          im.style.setProperty('--rx', ((.5 - py) * 5).toFixed(2) + 'deg');
          im.style.setProperty('--gx', (px * 100) + '%');
          im.style.setProperty('--gy', (py * 100) + '%');
        });
        im.addEventListener('mouseleave', () => {
          im.style.setProperty('--rx', '0deg');
          im.style.setProperty('--ry', '0deg');
        });
      });
      const box = w.querySelector('.relative.max-w-7xl');
      let raf = 0;
      box.addEventListener('scroll', () => {
        if (!mq.matches) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const mid = box.scrollLeft + box.clientWidth * .4;
          let best = 0,
            d = 1e9;
          cards.forEach((c, i) => {
            const sl = c.closest('[data-fade]') || c,
              cx = sl.offsetLeft + sl.offsetWidth / 2,
              dd = Math.abs(cx - mid);
            if (dd < d) {
              d = dd;
              best = i;
            }
          });
          set(best);
        });
      }, {
        passive: true
      });
      set(0);
      const io = new IntersectionObserver(es => {
        if (mq.matches) return;
        es.forEach(e => {
          if (e.isIntersecting) set(+e.target.dataset.i);
        });
      }, {
        rootMargin: '-42% 0px -42% 0px'
      });

      cards.forEach((c, i) => c.style.setProperty('--pc', colors[i % colors.length]));
      cards.forEach((c, i) => (c.closest('[data-fade]') || c).style.setProperty('--k', i));
      const io2 = new IntersectionObserver(es => {
        if (!mq.matches) return;
        es.forEach(e => {
          if (e.isIntersecting) set(cards.indexOf(e.target));
        });
      }, {
        rootMargin: '-38% 0px -38% 0px'
      });
      // (phones use a plain list now: no scroll-driven highlighting needed)
      txts.forEach(t => io.observe(t));
    })();
  
;
    // Recent projects (phones/tablets): reveal each card once as it scrolls into view
    (function () {
      const w = document.getElementById('work');
      if (!w || !('IntersectionObserver' in window)) return;
      const slots = [...w.querySelectorAll('.relative.max-w-7xl > article.proj-card, .relative.max-w-7xl > div[data-fade]')];
      if (!slots.length) return;
      const io = new IntersectionObserver(es => {
        es.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('wm-in');
          io.unobserve(e.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      w.classList.add('wm-ready');
      slots.forEach(el => io.observe(el));
      // safety net: never leave a card hidden
      setTimeout(() => slots.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('wm-in'); }), 2500);
    })();
  
;
    (function () {
      const map = document.getElementById('tmap');
      if (!map) return;
      const nodes = [...map.querySelectorAll('.tm-node')],
        lines = [...map.querySelectorAll('.tm-line:not(.ring)')];
      let cur = -1,
        hold = false,
        visible = false;

      function on(i) {
        cur = i;
        nodes.forEach((n, j) => n.classList.toggle('on', j === i));
        lines.forEach(l => l.classList.toggle('on', +l.dataset.i === i));
      }
      nodes.forEach((n, i) => {
        n.addEventListener('mouseenter', () => {
          hold = true;
          on(i);
        });
        n.addEventListener('mouseleave', () => {
          hold = false;
        });
        n.addEventListener('focus', () => on(i));
      });
      new IntersectionObserver(e => {
        visible = e[0].isIntersecting;
      }).observe(map);
      setInterval(() => {
        if (visible && !hold && matchMedia('(min-width:768px)').matches) on((cur + 1) % nodes.length);
      }, 2800);
    })();
  
;
    // Contact section interactions
    (function () {
      const sec = document.getElementById('contact');
      if (!sec) return;
      const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

      sec.querySelectorAll('.ct-spot').forEach(c => c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }));

      const clock = document.getElementById('ctClock');
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const tick = () => { clock.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 1000);

      const toast = document.getElementById('ctToast');
      let tt;
      function say(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(tt);
        tt = setTimeout(() => toast.classList.remove('show'), 2200);
      }
      function burst(x, y) {
        if (calm) return;
        const cols = ['rgb(var(--b400))', 'rgb(var(--aqua))', 'rgb(var(--pink))', '#34d399', '#fbbf24'];
        for (let i = 0; i < 16; i++) {
          const s = document.createElement('span');
          s.className = 'ct-spark';
          s.style.left = x + 'px';
          s.style.top = y + 'px';
          s.style.background = cols[i % cols.length];
          document.body.appendChild(s);
          const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
          s.animate([
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
            { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + (Math.sin(a) * d + 24) + 'px)) scale(0)', opacity: 0 }
          ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
        }
      }

      sec.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
        const v = b.dataset.copy;
        try { await navigator.clipboard.writeText(v); }
        catch (_) {
          const t = document.createElement('textarea');
          t.value = v; t.style.position = 'fixed'; t.style.opacity = '0';
          document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); } catch (__) {}
          t.remove();
        }
        b.classList.add('done');
        setTimeout(() => b.classList.remove('done'), 1400);
        const r = b.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        say('Copied: ' + v);
      }));

      if (fine && !calm) {
        const hub = document.getElementById('ctHub');
        const wrap = hub.parentElement;
        wrap.style.perspective = '1200px';
        wrap.addEventListener('pointermove', e => {
          const r = hub.getBoundingClientRect();
          hub.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 10).toFixed(2) + 'deg');
          hub.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - .5) * 8).toFixed(2) + 'deg');
        });
        wrap.addEventListener('pointerleave', () => {
          hub.style.setProperty('--rx', '0deg');
          hub.style.setProperty('--ry', '0deg');
        });
        sec.querySelectorAll('.ct-mag').forEach(m => {
          m.addEventListener('pointermove', e => {
            const r = m.getBoundingClientRect();
            m.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .18) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)';
          });
          m.addEventListener('pointerleave', () => { m.style.transform = ''; });
        });
      }
    })();
  
;
    // Footer interactions
    (function () {
      const f = document.querySelector('footer.ft');
      if (!f) return;

      // Live Cebu clock
      const clock = document.getElementById('ftClock');
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const tick = () => { clock.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 1000);

      // CTA spotlight follows the mouse
      const cta = f.querySelector('.ft-cta');
      cta.addEventListener('pointermove', e => {
        const r = cta.getBoundingClientRect();
        cta.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        cta.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });

      // Back-to-top button with scroll progress ring
      const top = document.getElementById('ftTop');
      const arc = document.getElementById('ftTopArc');
      const C = 131.95;
      let ticking = false;
      function update() {
        const h = document.documentElement.scrollHeight - innerHeight;
        const p = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
        arc.style.strokeDashoffset = (C * (1 - p)).toFixed(2);
        const on = scrollY > 600;
        top.classList.toggle('show', on);
        top.tabIndex = on ? 0 : -1;
        ticking = false;
      }
      addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
      top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
    })();
  
;
// Seasonal theme engine v2: realistic effects, theme follows today's date automatically
(function(){
  var root=document.documentElement,season=window.__season,cur=season(),
  calm=matchMedia('(prefers-reduced-motion: reduce)').matches,
  cv=document.getElementById('fxCanvas'),x=cv.getContext('2d'),w,h,P=[],R=[],raf,next=0,batT,
  rnd=function(a,b){return a+Math.random()*(b-a)},
  sc=document.createElement('div');
  sc.id='fxScene';sc.setAttribute('aria-hidden','true');document.body.appendChild(sc);
  var HAT="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 34'><path d='M6 27C7 12 17 4 31 5c-5 4-5 11-2 17l6 5z' fill='rgb(214,32,45)'/><path d='M6 27C9 20 12 14 20 10' stroke='rgb(150,15,30)' stroke-width='2' fill='none' opacity='.5'/><rect x='3' y='24' width='34' height='9' rx='4.5' fill='white'/><circle cx='31' cy='6' r='4.5' fill='white'/></svg>";
  var BAT='<svg viewBox="0 0 60 24"><path fill="#0b0712" d="M30 8L27 2L25 9C19 4 9 3 1 7C6 9 8 13 8 17C12 13 16 13 19 17C22 14 26 14 30 20C34 14 38 14 41 17C44 13 48 13 52 17C52 13 54 9 59 7C51 3 41 4 35 9L33 2Z"/></svg>';
  var COL=['#b45309','#c2410c','#92400e','#d97706','#7c2d12','#a16207'];
  function size(){var d=1;w=innerWidth;h=innerHeight;cv.width=w*d;cv.height=h*d;x.setTransform(d,0,0,d,0,0)}
  function light(){return root.classList.contains('light')}

  // ---- particles ----
  function mk(fresh){
    var p={x:rnd(0,w),y:fresh?-20:rnd(0,h),a:rnd(0,6.28)};
    if(cur==='christmas'){p.z=Math.random();p.r=.7+p.z*p.z*3;p.v=.3+p.z*1.2;p.s=rnd(.008,.025)}
    else if(cur==='halloween'){p.r=rnd(6,11);p.v=rnd(.5,1.2);p.s=rnd(.012,.03);p.rot=rnd(0,6.28);p.vr=rnd(-.03,.03);p.f=rnd(0,6.28);p.vf=rnd(.03,.07);p.col=COL[Math.floor(rnd(0,COL.length))]}
    else{p.r=rnd(5,26);p.v=-rnd(.08,.3);p.s=rnd(.003,.012);p.al=rnd(.05,.16);p.y=fresh?h+30:rnd(0,h)}
    return p}
  function launch(){var ty=rnd(h*.1,h*.45);R.push({x:rnd(w*.15,w*.85),y:h+8,vx:rnd(-.5,.5),vy:-Math.sqrt(.24*(h-ty)),hue:[45,48,335,200,280,20][Math.floor(rnd(0,6))]})}
  function burst(r){var n=Math.round(rnd(60,95)),ring=Math.random()<.4,sp=rnd(2.2,3.6),a,v;
    for(var i=0;i<n;i++){a=rnd(0,6.283);v=ring?sp:sp*Math.sqrt(Math.random());
      P.push({x:r.x,y:r.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,d:rnd(.009,.017),hue:r.hue+rnd(-12,12)})}}
  function seed(){
    P=[];R=[];x.clearRect(0,0,w,h);if(calm)return;
    var base=Math.min(110,innerWidth/12),n=0,i;
    if(cur==='christmas')n=Math.min(50,innerWidth/24);else if(cur==='halloween')n=base*.22;else if(cur==='summer')n=base*.35;
    for(i=0;i<n;i++)P.push(mk(0));
    if(cur==='newyear'){launch();setTimeout(launch,500)}}

  function loop(t){
    raf=requestAnimationFrame(loop);
    var wind=Math.sin(t/4200)*.45+Math.sin(t/1500)*.15,lt=light();
    if(cur==='newyear'){
      x.globalCompositeOperation='destination-out';x.fillStyle='rgba(0,0,0,.2)';x.fillRect(0,0,w,h);
      x.globalCompositeOperation='lighter';
      if(t>next&&!document.hidden){launch();next=t+rnd(900,2000)}
      R=R.filter(function(r){r.x+=r.vx;r.y+=r.vy;r.vy+=.12;
        x.fillStyle='hsl('+r.hue+',100%,80%)';x.beginPath();x.arc(r.x,r.y,1.8,0,6.283);x.fill();
        if(r.vy>-.6){burst(r);return false}return true});
      P=P.filter(function(p){p.vx*=.985;p.vy=p.vy*.985+.04;p.x+=p.vx;p.y+=p.vy;p.l-=p.d;if(p.l<=0)return false;
        x.fillStyle='hsla('+p.hue+',100%,'+(55+p.l*20)+'%,'+p.l+')';x.beginPath();x.arc(p.x,p.y,.6+1.6*p.l,0,6.283);x.fill();return true});
      x.globalCompositeOperation='source-over';return}
    x.clearRect(0,0,w,h);
    if(cur==='christmas'){
      var c=lt?'105,135,180':'255,255,255',B=[[],[],[]];
      P.forEach(function(p){p.y+=p.v;p.a+=p.s;p.x+=Math.sin(p.a)*.35*(.4+p.z)+wind*(.3+p.z);
        if(p.y>h+10){p.y=-10;p.x=rnd(0,w)}if(p.x>w+10)p.x=-10;else if(p.x<-10)p.x=w+10;
        B[p.z<.34?0:p.z<.67?1:2].push(p)});
      B.forEach(function(a,k){x.fillStyle='rgba('+c+','+((lt?.55:.4)+k*.22)+')';x.beginPath();
        a.forEach(function(p){x.moveTo(p.x+p.r,p.y);x.arc(p.x,p.y,p.r,0,6.283)});x.fill()})}
    else if(cur==='halloween'){
      P.forEach(function(p){p.y+=p.v;p.a+=p.s;p.x+=Math.sin(p.a)*1.1+wind*1.4;p.rot+=p.vr;p.f+=p.vf;
        if(p.y>h+20||p.x>w+30||p.x<-30)Object.assign(p,mk(1));
        x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.scale(1,Math.cos(p.f));x.globalAlpha=.85;x.fillStyle=p.col;
        x.beginPath();x.moveTo(0,-p.r);x.bezierCurveTo(p.r*.9,-p.r*.4,p.r*.7,p.r*.6,0,p.r);x.bezierCurveTo(-p.r*.7,p.r*.6,-p.r*.9,-p.r*.4,0,-p.r);x.fill();
        x.strokeStyle='rgba(0,0,0,.3)';x.beginPath();x.moveTo(0,-p.r);x.lineTo(0,p.r);x.stroke();x.restore()})}
    else if(cur==='summer'){
      var mc=lt?'255,160,50':'255,214,140',k=lt?1.6:1;
      x.globalCompositeOperation='lighter';
      P.forEach(function(p){p.y+=p.v;p.a+=p.s*10;p.x+=Math.sin(p.a)*.25+wind*.3;
        if(p.y<-40)Object.assign(p,mk(1));
        var g=x.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,'rgba('+mc+','+p.al*k+')');g.addColorStop(1,'rgba('+mc+',0)');
        x.fillStyle=g;x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill()});
      x.globalCompositeOperation='source-over'}}

  // ---- Christmas: string lights hanging in swags ----
  function lights(){
    var L=document.getElementById('fxLights');L.innerHTML='';if(cur!=='christmas')return;
    var cols=['#ff3b4a','#ffd24a','#3ddc84','#4aa8ff'],seg=Math.max(120,Math.min(190,innerWidth/6)),n=Math.ceil(innerWidth/seg),sag=15,d='M0 2',b='',k=0,i,j,t,px,py,ang;
    for(i=0;i<n;i++){
      d+='Q'+(i*seg+seg/2)+' '+(2+sag*2)+' '+(i+1)*seg+' 2';
      for(j=1;j<=4;j++){t=j/5;px=i*seg+t*seg;py=2+4*sag*t*(1-t);ang=Math.atan(4*sag*(1-2*t)/seg)*57.3;
        b+='<i style="left:'+px.toFixed(1)+'px;top:'+py.toFixed(1)+'px;--c:'+cols[k%4]+';transform:rotate('+ang.toFixed(1)+'deg);animation-delay:-'+((k%5)*.5)+'s"></i>';k++}}
    L.innerHTML='<svg width="'+n*seg+'" height="'+(sag*2+4)+'"><path d="'+d+'" fill="none" stroke="#35523f" stroke-width="1.6"/></svg>'+b}

  // ---- Halloween: cobwebs + bats; Summer: sun ----
  function web(){
    var s='<svg viewBox="0 0 120 120" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".8">',
    a=[0,22.5,45,67.5,90].map(function(g){return g/57.3});
    a.forEach(function(g){s+='<path d="M0 0L'+(120*Math.cos(g)).toFixed(1)+' '+(120*Math.sin(g)).toFixed(1)+'"/>'});
    [26,50,74,98].forEach(function(r){var d='',i,X,Y,m;
      for(i=0;i<a.length;i++){X=r*Math.cos(a[i]);Y=r*Math.sin(a[i]);
        if(i){m=(a[i]+a[i-1])/2;d+='Q'+(r*.82*Math.cos(m)).toFixed(1)+' '+(r*.82*Math.sin(m)).toFixed(1)+' '+X.toFixed(1)+' '+Y.toFixed(1)}
        else d+='M'+X.toFixed(1)+' '+Y.toFixed(1)}
      s+='<path d="'+d+'"/>'});
    return s+'</svg>'}
  function bat(){
    var b=document.createElement('div'),dir=Math.random()<.5?1:-1,s=rnd(.6,1.3),ph=rnd(0,6),amp=rnd(20,60),K=[],n=6,i,px;
    b.className='fx-bat';b.innerHTML=BAT;b.style.top=rnd(.08,.5)*h+'px';b.style.width=46*s+'px';
    for(i=0;i<=n;i++){px=dir>0?-80+(w+160)*i/n:w+80-(w+160)*i/n;
      K.push({transform:'translate('+px.toFixed(0)+'px,'+(Math.sin(i*1.7+ph)*amp).toFixed(0)+'px) scaleX('+dir+')'})}
    sc.appendChild(b);b.animate(K,{duration:rnd(6500,10000),easing:'linear'}).onfinish=function(){b.remove()}}
  function bats(){clearTimeout(batT);if(cur!=='halloween'||calm)return;
    batT=setTimeout(function(){if(!document.hidden)bat();bats()},rnd(5000,12000))}
  function scene(){
    sc.innerHTML='';clearTimeout(batT);
    if(cur==='halloween'){sc.innerHTML='<div class="fx-fog"></div><div class="fx-fog b"></div><div class="fx-glow l"></div><div class="fx-glow r"></div><div class="fx-web">'+web()+'</div><div class="fx-web r">'+web()+'</div>';bats()}
    else if(cur==='summer')sc.innerHTML='<div class="fx-sun"></div>';
    else if(cur==='christmas')sc.innerHTML='<div class="fx-drift"></div>'}

  var logo=document.querySelector('#nav a[href="#home"] > span'),hat=document.createElement('span');hat.className='fx-hat';
  if(logo){logo.style.position='relative';logo.appendChild(hat)}
  function apply(){
    cur=season();
    if(cur==='default')root.removeAttribute('data-theme');else root.setAttribute('data-theme',cur);
    hat.style.display=cur==='christmas'?'block':'none';
    hat.style.backgroundImage=cur==='christmas'?'url("data:image/svg+xml,'+encodeURIComponent(HAT)+'")':'none';
    scene();lights();seed();cancelAnimationFrame(raf);next=0;
    if(!calm&&cur!=='default')raf=requestAnimationFrame(loop)}
  size();addEventListener('resize',function(){size();seed();lights()});
  apply();
  // flip automatically if the page stays open across a season change
  setInterval(function(){if(season()!==cur)apply()},60000);
})();
;
(function(){
  // Pause CSS animations of anything scrolled out of view
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('perf-off',!e.isIntersecting)})},{rootMargin:'150px 0px'});
    document.querySelectorAll('section,footer,#fxLights').forEach(function(el){io.observe(el)});
  }
  // Stop the snow/particle canvas while the tab is hidden or the page is being scrolled fast
  var cv=document.getElementById('fxCanvas');
  if(cv){
    var t;addEventListener('scroll',function(){cv.style.visibility='hidden';clearTimeout(t);t=setTimeout(function(){cv.style.visibility=''},140)},{passive:true});
  }
})();