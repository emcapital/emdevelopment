(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  const loader = $('#loader'), pct = $('#pct'), ring = $('#ring');
  const C = 2 * Math.PI * 54, LS = performance.now(), DUR = 2000;
  ring.style.strokeDasharray = C;
  (function load(now) {
    const p = Math.min((now - LS) / DUR, 1);
    const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    ring.style.strokeDashoffset = C * (1 - e);
    pct.textContent = Math.round(e * 100);
    if (p < 1) return requestAnimationFrame(load);
    loader.classList.add('done');
    document.body.classList.add('ready', 'loaded');
    setTimeout(() => loader.remove(), 1100);
  })(LS);
  $('#yr').textContent = new Date().getFullYear();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  const counters = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, dur = 1600, t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      reduce ? (el.textContent = end) : requestAnimationFrame(tick);
      counters.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => counters.observe(el));

  const tc = $('#tc');
  const t0 = performance.now();
  const pad = (n) => String(n).padStart(2, '0');
  let lastFrame = -1;
  function timecode(now) {
    const f = Math.floor((now - t0) / (1000 / 24));
    if (f !== lastFrame) {
      lastFrame = f;
      const s = Math.floor(f / 24);
      tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`;
    }
  }

  const hero = $('#hero'), focus = $('#focus');
  let fx = 0, fy = 0, tx = 0, ty = 0, heroActive = false;
  if (fine && !reduce) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = e.clientX - r.left - 40; ty = e.clientY - r.top - 40;
      if (!heroActive) { heroActive = true; fx = tx; fy = ty; focus.style.opacity = 1; }
    });
    hero.addEventListener('pointerleave', () => { heroActive = false; focus.style.opacity = 0; });
  }

  const bar = $('#progress'), nav = $('#nav'), layers = $$('[data-speed]');
  const topBtn = $('#top-btn'), topRing = $('#top-ring'), TC = 2 * Math.PI * 25;
  topRing.style.strokeDasharray = TC;
  topBtn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  let sy = 0;
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });

  function frame(now) {
    const max = document.documentElement.scrollHeight - innerHeight;
    const prog = max > 0 ? sy / max : 0;
    bar.style.transform = `scaleX(${prog})`;
    topRing.style.strokeDashoffset = TC * (1 - prog);
    topBtn.classList.toggle('show', sy > 500);
    nav.classList.toggle('solid', sy > 40);
    if (!reduce && sy < innerHeight * 1.5) {
      layers.forEach((l) => { l.style.transform = `translate3d(0, ${sy * parseFloat(l.dataset.speed)}px, 0)`; });
    }
    if (heroActive) {
      fx = lerp(fx, tx, 0.18); fy = lerp(fy, ty, 0.18);
      focus.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
    }
    timecode(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const burger = $('#burger'), menu = $('#menu'), bars = $$('i', burger);
  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    bars[0].style.transform = open ? 'translateY(4px) rotate(45deg)' : '';
    bars[1].style.transform = open ? 'translateY(-4px) rotate(-45deg)' : '';
    burger.style.color = open ? '#F2F5F8' : '';
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('.mlink').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const cards = $$('.card');
  const btns = $$('.f-btn');
  const paint = (b) => {
    const on = b.classList.contains('active');
    b.classList.toggle('bg-ink', on); b.classList.toggle('text-paper', on);
  };
  btns.forEach(paint);
  btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); btns.forEach(paint);
    const f = b.dataset.filter;
    cards.forEach((c) => {
      const show = f === 'all' || c.dataset.cat === f;
      if (show) {
        c.style.display = '';
        requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('hide')));
      } else {
        c.classList.add('hide');
        setTimeout(() => { if (c.classList.contains('hide')) c.style.display = 'none'; }, 420);
      }
    });
  }));

  if (fine && !reduce) {
    $$('[data-tilt]').forEach((el) => {
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transition = 'transform .1s linear';
          el.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(0)`;
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)';
        el.style.transform = '';
      });
    });

    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transition = 'transform .15s ease-out';
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)';
        el.style.transform = '';
      });
    });
  }

  const frames = ['from-rose-300 to-amber-200','from-sky-400 to-indigo-500','from-fuchsia-400 to-rose-300','from-flash to-orange-500','from-sea to-sky-300','from-emerald-300 to-sky-500','from-violet-400 to-fuchsia-300','from-amber-200 to-rose-400'];
  const fill = (el, off) => {
    const one = frames.map((_, i) => `<div class="w-44 md:w-60 aspect-[3/2] rounded-md bg-gradient-to-br ${frames[(i + off) % frames.length]} shrink-0"></div>`).join('');
    el.innerHTML = one + one;
  };
  fill($('#strip1'), 0); fill($('#strip2'), 4);

  const line = $('.draw');
  if (line) { const lo = new IntersectionObserver((en) => { if (en[0].isIntersecting) { line.classList.add('in'); lo.disconnect(); } }, { threshold: 0.5 }); lo.observe(line); }

  if (fine && !reduce) {
    document.documentElement.classList.add('has-cur');
    const cur = $('#cur'), dot = $('#dot');
    let mx = -100, my = -100, cx = -100, cy = -100;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; }, { passive: true });
    document.addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a,button,input,select,textarea,label,.card,[data-tilt]')));
    (function follow() { cx = lerp(cx, mx, 0.2); cy = lerp(cy, my, 0.2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(follow); })();
  }

  const form = $('#form'), status = $('#status'), sendLabel = $('#send-label');
  const submitBtn = $('button[type="submit"]', form);
  const dateIn = $('#f-date');
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dateIn.min = today.toISOString().slice(0, 10);

  const rules = {
    'f-name': (v) => v.trim().length < 2 ? 'Please tell us your name.' : '',
    'f-email': (v) => !v.trim() ? 'Please add your email.' : (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'That email does not look right.' : '')
  };
  const setErr = (input, msg) => {
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $(`[data-err="${input.id}"]`).textContent = msg;
  };
  Object.keys(rules).forEach((id) => {
    const input = $('#' + id);
    input.addEventListener('blur', () => setErr(input, rules[id](input.value)));
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') setErr(input, rules[id](input.value)); });
  });
  dateIn.addEventListener('change', () => dateIn.setAttribute('aria-invalid', 'false'));

  let statusTimer = 0;
  const say = (msg) => {
    status.textContent = msg; status.style.opacity = 1;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.style.opacity = 0; }, 5000);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let firstBad = null;
    Object.keys(rules).forEach((id) => {
      const input = $('#' + id), msg = rules[id](input.value);
      setErr(input, msg);
      if (msg && !firstBad) firstBad = input;
    });
    if (firstBad) { firstBad.focus(); say('Please fix the highlighted fields.'); return; }

    submitBtn.disabled = true; sendLabel.textContent = 'Sending...';
    // Replace this timeout with your real request (fetch/Firebase) when ready.
    setTimeout(() => {
      form.reset();
      sendLabel.textContent = 'Send request';
      submitBtn.disabled = false;
      say('Request sent. We will reply within one day.');
    }, 900);
  });
})();