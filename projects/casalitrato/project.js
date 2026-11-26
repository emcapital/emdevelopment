(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- PROJECT DATA: edit this list ----------
     type: 'photo' | 'video'   cat: 'wedding' | 'party' | 'corporate'
     size: '' | 'wide' | 'tall' | 'big'
     g: placeholder gradient (remove once you add real media)
     src:   real image path, e.g. 'media/mia-jonas.jpg'
     thumb: optional smaller image for the grid
     video: real video path (mp4) or embed URL for video items          */
  const items = [
    { type: 'photo', cat: 'wedding',   size: 'big',  title: 'Mia and Jonas, Cebu',  g: 'from-rose-300 via-amber-200 to-orange-100' },
    { type: 'video', cat: 'wedding',   size: 'tall', title: 'Beach vows, highlight film', g: 'from-amber-200 to-rose-400' },
    { type: 'photo', cat: 'party',     size: '',     title: 'Sofia turns 18',       g: 'from-fuchsia-400 to-indigo-500' },
    { type: 'video', cat: 'corporate', size: '',     title: 'Product launch reel',  g: 'from-sea to-sky-400' },
    { type: 'photo', cat: 'wedding',   size: 'wide', title: 'Garden ceremony',      g: 'from-emerald-300 to-sky-500' },
    { type: 'video', cat: 'party',     size: '',     title: 'First birthday recap', g: 'from-flash to-orange-500' },
    { type: 'photo', cat: 'corporate', size: '',     title: 'Annual summit',        g: 'from-ink to-sea' },
    { type: 'photo', cat: 'party',     size: 'tall', title: 'Christening day',      g: 'from-violet-400 to-fuchsia-300' },
    { type: 'video', cat: 'wedding',   size: '',     title: 'Intimate vows',        g: 'from-rose-300 to-amber-200' },
    { type: 'photo', cat: 'corporate', size: '',     title: 'Team portraits',       g: 'from-sky-400 to-indigo-500' },
    { type: 'photo', cat: 'party',     size: 'wide', title: 'Graduation day',       g: 'from-amber-200 to-rose-400' },
    { type: 'video', cat: 'party',     size: '',     title: 'Concert night',        g: 'from-fuchsia-400 to-rose-300' }
  ];
  const featured = { type: 'video', cat: 'wedding', title: 'Mia and Jonas, Cebu: wedding film', g: 'from-ink via-sea to-flash' };

  const spans = { big: 'col-span-2 row-span-2', wide: 'col-span-2', tall: 'row-span-2', '': '' };
  const catName = { wedding: 'Wedding', party: 'Party', corporate: 'Corporate' };
  const ph = '<svg viewBox="0 0 24 24" class="w-10 h-10 fill-none stroke-current stroke-[1.6]"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M3 17l5-5 4 4 3-3 6 6"/></svg>';
  const play = '<span class="absolute top-3 right-3 w-10 h-10 rounded-full bg-paper/90 grid place-items-center"><svg viewBox="0 0 24 24" class="w-4 h-4 ml-0.5 fill-ink"><path d="M8 5v14l11-7z"/></svg></span>';

  /* ---------- Page chrome ---------- */
  $('#yr').textContent = new Date().getFullYear();
  const loader = $('#loader'), pct = $('#pct'), ring = $('#ring'), C = 2 * Math.PI * 54, LS = performance.now();
  ring.style.strokeDasharray = C;
  (function load(now) {
    const p = Math.min((now - LS) / 2000, 1), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    ring.style.strokeDashoffset = C * (1 - e); pct.textContent = Math.round(e * 100);
    if (p < 1) return requestAnimationFrame(load);
    loader.classList.add('done'); document.body.classList.add('ready', 'loaded');
    setTimeout(() => loader.remove(), 1100);
  })(LS);
  const hero = $('#hero'), focus = $('#focus'), layers = $$('[data-speed]');
  let fx = 0, fy = 0, tx = 0, ty = 0, heroActive = false;
  if (fine && !reduce) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect(); tx = e.clientX - r.left - 40; ty = e.clientY - r.top - 40;
      if (!heroActive) { heroActive = true; fx = tx; fy = ty; focus.style.opacity = 1; }
    });
    hero.addEventListener('pointerleave', () => { heroActive = false; focus.style.opacity = 0; });
  }
  const frames = ['from-rose-300 to-amber-200','from-sky-400 to-indigo-500','from-fuchsia-400 to-rose-300','from-flash to-orange-500','from-sea to-sky-300','from-emerald-300 to-sky-500','from-violet-400 to-fuchsia-300','from-amber-200 to-rose-400'];
  const fillStrip = (el, off) => { const one = frames.map((_, i) => `<div class="w-44 md:w-60 aspect-[3/2] rounded-md bg-gradient-to-br ${frames[(i + off) % frames.length]} shrink-0"></div>`).join(''); el.innerHTML = one + one; };
  fillStrip($('#strip1'), 0); fillStrip($('#strip2'), 4);
  const tc = $('#tc'), t0 = performance.now(), pad = (n) => String(n).padStart(2, '0');
  const bar = $('#progress'), nav = $('#nav'), topBtn = $('#top-btn');
  topBtn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  (function frame(now) {
    const max = document.documentElement.scrollHeight - innerHeight, y = scrollY;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    topBtn.classList.toggle('show', y > 500);
    if (!reduce && y < innerHeight * 1.5) layers.forEach((l) => { l.style.transform = `translate3d(0, ${y * parseFloat(l.dataset.speed)}px, 0)`; });
    if (heroActive) { fx = lerp(fx, tx, .18); fy = lerp(fy, ty, .18); focus.style.transform = `translate3d(${fx}px, ${fy}px, 0)`; }
    nav.classList.toggle('solid', y > 40);
    const f = Math.floor((now - t0) / (1000 / 24)), s = Math.floor(f / 24);
    tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`;
    requestAnimationFrame(frame);
  })(t0);

  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  const watch = () => $$('.reveal:not(.in)').forEach((el) => io.observe(el));

  const burger = $('#burger'), menu = $('#menu'), bars = $$('i', burger);
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    bars[0].style.transform = open ? 'translateY(4px) rotate(45deg)' : '';
    bars[1].style.transform = open ? 'translateY(-4px) rotate(-45deg)' : '';
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('.mlink').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Gallery ---------- */
  const grid = $('#grid');
  grid.innerHTML = items.map((it, i) => `
    <button type="button" data-i="${i}" data-type="${it.type}" data-cat="${it.cat}" aria-label="Open ${it.title}, ${it.type}"
      class="tile reveal relative rounded-2xl overflow-hidden ${spans[it.size]}" style="--d:${(i % 4) * 70}ms">
      ${it.thumb || it.src
        ? `<img src="${it.thumb || it.src}" alt="${it.title}" loading="lazy" class="shine absolute inset-0 w-full h-full object-cover">`
        : `<div class="shine absolute inset-0 bg-gradient-to-br ${it.g} grid place-items-center text-paper/40">${ph}</div>`}
      ${it.type === 'video' ? play : ''}
      <span class="cap absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-ink/80 to-transparent text-paper font-semibold text-sm">${it.title}<span class="block font-normal text-paper/70">${catName[it.cat]}</span></span>
    </button>`).join('');
  const tiles = $$('.tile', grid);

  const state = { type: 'all', cat: 'all' };
  const paint = (b) => { const on = b.classList.contains('active'); b.classList.toggle('bg-ink', on); b.classList.toggle('text-paper', on); };
  $$('.f-btn').forEach(paint);
  $$('[data-group]').forEach((g) => {
    const btns = $$('.f-btn', g);
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('active')); b.classList.add('active'); btns.forEach(paint);
      state[g.dataset.group] = b.dataset.v; applyFilter();
    }));
  });
  const visible = () => tiles.filter((t) => !t.classList.contains('hide'));
  function applyFilter() {
    let n = 0;
    tiles.forEach((t) => {
      const show = (state.type === 'all' || t.dataset.type === state.type) && (state.cat === 'all' || t.dataset.cat === state.cat);
      if (show) { n++; t.style.display = ''; requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove('hide'))); }
      else { t.classList.add('hide'); setTimeout(() => { if (t.classList.contains('hide')) t.style.display = 'none'; }, 420); }
    });
    $('#count').textContent = `${n} of ${items.length} shown`;
    $('#empty').classList.toggle('hidden', n > 0);
  }
  $('#count').textContent = `${items.length} of ${items.length} shown`;

  /* ---------- Lightbox ---------- */
  const lb = $('#lb'), stage = $('#lb-stage'), cap = $('#lb-cap');
  let list = [], idx = 0, opener = null;
  function render() {
    const it = list[idx];
    let media;
    if (it.type === 'video' && it.video) media = `<video src="${it.video}" controls autoplay playsinline class="w-full max-h-[70vh] rounded-2xl bg-black"></video>`;
    else if (it.src) media = `<div class="relative w-fit mx-auto"><img src="${it.src}" alt="${it.title}" class="block max-h-[70vh] max-w-full rounded-2xl object-contain">${it.type === 'video' ? '<span class="absolute inset-0 grid place-items-center"><span class="w-20 h-20 rounded-full bg-paper/90 grid place-items-center"><svg viewBox="0 0 24 24" class="w-8 h-8 ml-1 fill-ink"><path d="M8 5v14l11-7z"/></svg></span></span>' : ''}</div>`;
    else media = `<div class="relative w-full aspect-video max-h-[70vh] rounded-2xl bg-gradient-to-br ${it.g} grid place-items-center">${it.type === 'video' ? '<span class="w-20 h-20 rounded-full bg-paper/90 grid place-items-center"><svg viewBox="0 0 24 24" class="w-8 h-8 ml-1 fill-ink"><path d="M8 5v14l11-7z"/></svg></span>' : '<span class="text-paper/40">' + ph.replace('w-10 h-10','w-24 h-24') + '</span>'}</div>`;
    stage.innerHTML = media;
    cap.textContent = `${it.title} · ${it.type === 'video' ? 'Video' : 'Photo'}${list.length > 1 ? ` · ${idx + 1} of ${list.length}` : ''}`;
    $('#lb-prev').style.display = $('#lb-next').style.display = list.length > 1 ? '' : 'none';
  }
  function openLb(l, i, from) {
    list = l; idx = i; opener = from; render();
    lb.classList.add('open'); requestAnimationFrame(() => lb.classList.add('show'));
    document.body.style.overflow = 'hidden'; $('#lb-close').focus();
  }
  function closeLb() {
    lb.classList.remove('show'); stage.innerHTML = '';
    setTimeout(() => lb.classList.remove('open'), 350);
    document.body.style.overflow = ''; if (opener) opener.focus();
  }
  const step = (d) => { idx = (idx + d + list.length) % list.length; render(); };
  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    const vis = visible(); openLb(vis.map((v) => items[+v.dataset.i]), vis.indexOf(t), t);
  });
  $('#featured').addEventListener('click', (e) => openLb([featured], 0, e.currentTarget));
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', () => step(-1));
  $('#lb-next').addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setMenu(false); if (lb.classList.contains('open')) closeLb(); }
    if (!lb.classList.contains('open') || list.length < 2) return;
    if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- Desktop polish ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transition = 'transform .1s linear';
        el.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)'; el.style.transform = ''; });
    });
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transition = 'transform .15s ease-out';
        el.style.transform = `translate3d(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)'; el.style.transform = ''; });
    });
    document.documentElement.classList.add('has-cur');
    const cur = $('#cur'), dot = $('#dot');
    let mx = -100, my = -100, cx = -100, cy = -100;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; }, { passive: true });
    document.addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a,button,.tile,[data-tilt]')));
    (function follow() { cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(follow); })();
  }
  watch();
})();