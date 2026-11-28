import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-functions.js";
import { getDatabase, ref, push, set, update, remove, onValue, get, serverTimestamp, increment, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const FB = {
  apiKey: "AIzaSyAoyAOyfJsqlK_Pe6pmfA5cTexx0IOcH9g", authDomain: "moren-325fd.firebaseapp.com",
  databaseURL: "https://moren-325fd-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "moren-325fd",
  storageBucket: "moren-325fd.firebasestorage.app", messagingSenderId: "1015241645428",
  appId: "1:1015241645428:web:2d6366a8bdc38a5fb72021", measurementId: "G-1HDSV3V8P1"
};
const app = initializeApp(FB);
let app2; const acctAuth = () => getAuth(app2 || (app2 = initializeApp(FB, 'accounts')));
const auth = getAuth(app);
const db = getDatabase(app);
const LOGIN_URL = '../auth/login.html'; // path to login.html, relative to this file
// Email via EmailJS (https://www.emailjs.com), used for the replies you send from Quotations.
const EMAILJS = { serviceId: 'service_6obqxmm', templateId: 'template_9isvbcv', replyTemplateId: 'template_rzlhxdf', publicKey: 'L6uRXN8WLyoKf2KwQ' };   // templateId = new customer account email, replyTemplateId = emails you send from Quotations
const replyReady = () => !!(EMAILJS.serviceId && EMAILJS.replyTemplateId && EMAILJS.publicKey);
async function emailjsSend(templateId, params) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ service_id: EMAILJS.serviceId, template_id: templateId, user_id: EMAILJS.publicKey, template_params: params }) });
    if (r.ok) return { ok: true };
    const txt = (await r.text().catch(() => '')).trim().slice(0, 140);
    return { ok: false, err: txt || 'EmailJS error ' + r.status };
  } catch (e) { return { ok: false, err: e && e.name === 'AbortError' ? 'This is taking too long. Check your connection and try again.' : 'Could not reach EmailJS. Check your connection and try again.' }; }
  finally { clearTimeout(t); }
}

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
const fmtD = d => new Date(/^\d{4}-\d\d-\d\d$/.test(d) ? d + 'T00:00:00' : d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtT = t => new Date(t).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
const doneN = p => p.items.filter(m => m.d).length;
const pct = p => p.items.length ? Math.round(doneN(p) / p.items.length * 100) : 0;
// the checkboxes are each project's inclusions. pending = none ticked, active = some ticked (even 100% until you press Complete), completed = archived via the Complete button
const status = p => p.archived ? 'completed' : doneN(p) === 0 ? 'pending' : 'active';
const BADGE = { active: 'text-aqua bg-aqua/15', completed: 'text-emerald-300 bg-emerald-400/15', pending: 'text-pink bg-pink/15' };
const ICON = {
  overview: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  subscriptions: 'M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5',
  messages: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6',
  proposal: 'M4 4h16v12H8l-4 4zM8 9h8M8 12h5',
  contracts: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  accounting: 'M4 20V11M10 20V5M16 20v-6M22 20H2',
  customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  portal: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  settings: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  backup: 'M12 3v12M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  source: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  tracker: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6'
};
const TITLES = { overview: 'Overview', projects: 'Projects', invoices: 'Invoices', subscriptions: 'Subscriptions', accounting: 'Accounting', source: 'Source Code', customers: 'Customers', portal: 'My Website', messages: 'Quotations', contracts: 'Contracts', proposal: 'Proposal', chat: 'Chat', tracker: 'Tracker', backup: 'Backup', settings: 'Account' };
const svg = (d, c = 'w-5 h-5') => `<svg class="${c}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.className = 'fixed left-1/2 z-50 glass rounded-2xl px-5 py-2.5 text-sm font-medium text-center max-w-[calc(100vw-2rem)]'; el.style.bottom = 'calc(1.5rem + env(safe-area-inset-bottom, 0px))'; el.style.animation = 'toastIn .4s ease both'; clearTimeout(toastT); toastT = setTimeout(() => { el.style.animation = 'toastOut .35s ease forwards'; toastT = setTimeout(() => el.classList.add('hidden'), 350); }, 2600); }
function leave(url) { if (leave.on) return; leave.on = true; document.body.classList.add('is-leaving'); setTimeout(() => { location.href = url; }, 650); }

// ---------- data (stored per user in this browser) ----------
let SUB = [], sflt = 'all', subOpen = false, subEdit = null, subError = '';
let U, S, C = [], Q = [], I = [], K = [], PORTAL = null, PP = {}, kOpen = false, kBusy = false, kError = '', kOpenSet = new Set(), kDraft = {}, qError = '', iError = '', view = 'overview', flt = 'all', qflt = 'all', iflt = 'all', invOpen = false, invEdit = null;   // C = projects saved in Firebase Realtime Database
const projs = () => [...C, ...S.projects];
const key = () => 'emdev:' + U.uid;
const save = () => { try { localStorage.setItem(key(), JSON.stringify(S)); } catch (e) {} };
const seed = () => ({
  v: 2,
  projects: [],
});
function load() {
  try { S = JSON.parse(localStorage.getItem(key())); } catch (e) {}
  if (!S) S = seed();
  if (S.v !== 2) { S.projects = []; S.v = 2; save(); }   // the old sample projects are removed once
}

// ---------- views ----------
const card = 'glass rounded-2xl p-5';
const visible = () => projs().filter(p => flt === 'all' || status(p) === flt);
const findP = id => projs().find(x => String(x.id) === String(id));
const slotKey = p => p.archived ? 'a' : pct(p) === 100 ? 'c' : 'n';
function actHtml(p) {
  if (p.archived) return `<div style="animation:itemFade .5s cubic-bezier(.2,.7,.2,1) both" class="mt-4 flex items-center justify-between gap-3 text-sm"><span class="text-emerald-300 font-semibold">Archived &middot; all milestones done</span><button data-act="reopen" data-p="${esc(p.id)}" class="text-brand-400 hover:text-white font-semibold">Reopen</button></div>`;
  if (pct(p) === 100) return `<button data-act="done" data-p="${esc(p.id)}" style="animation:itemFade .5s cubic-bezier(.2,.7,.2,1) both" class="btn-shine mt-4 w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">Complete project</button>`;
  return '';
}
const badgeCls = s => `shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize ${BADGE[s]}`;
const spanCls = m => (m.d ? 'line-through opacity-60 ' : '') + 'min-w-0 break-words';
const listHtml = p => p.items.map((m, i) => `<label class="flex items-center gap-3 text-sm text-slate-300 cursor-pointer select-none py-0.5"><input type="checkbox" class="chk" data-act="inc" data-p="${esc(p.id)}" data-i="${i}" ${m.d ? 'checked' : ''} ${p.archived ? 'disabled' : ''}/><span class="${spanCls(m)}">${esc(m.t)}</span></label>`).join('');
// ---------- maintenance ----------
// Set when the project is created (weeks of free maintenance + the fee after). The free period runs from the day the project is completed.
// Customers send a subscription request, saved at maintenance/<customerUid>/<projectId>, and the admin activates or declines it here.
let MR = {};
const MT_DAY = 864e5;
function mtInfo(p) {
  if (!p.cloud || !p.hasM) return { k: 'none' };
  if (!p.archived || !p.arAt) return { k: 'pending' };
  const end = p.arAt + p.mw * 7 * MT_DAY, left = Math.ceil((end - Date.now()) / MT_DAY);
  return { k: left > 14 ? 'free' : left > 0 ? 'soon' : 'ended', end, left };
}
const mtReqs = pid => Object.keys(MR || {}).filter(u => MR[u] && MR[u][pid]).map(u => Object.assign({ u }, MR[u][pid]));
const mtWho = u => { const c = K.find(x => x.uid === u); return c ? (c.company || c.name) : 'A customer'; };
const mtWeeks = n => n ? n + (n === 1 ? ' week' : ' weeks') : 'none';
const mtSig = p => [p.hasM, p.mw, p.mf, p.arAt, p.archived, JSON.stringify(mtReqs(p.id)), K.length].join('|');
function mtHtml(p) {
  if (!p.cloud) return '';
  const m = mtInfo(p);
  const line = m.k === 'none' ? 'Maintenance is not set for this project.'
    : m.k === 'pending' ? 'Free maintenance: ' + mtWeeks(p.mw) + ' (starts when the project is completed)'
    : m.k === 'ended' ? 'Free maintenance ended ' + fmtD(m.end)
    : 'Free maintenance until ' + fmtD(m.end) + ' (' + m.left + (m.left === 1 ? ' day' : ' days') + ' left)';
  const tone = m.k === 'ended' ? 'text-red-300' : m.k === 'soon' ? 'text-pink' : '';
  const reqs = mtReqs(p.id).map(r => `<div class="mt-2 flex flex-wrap items-center justify-between gap-2"><span class="min-w-0 break-words">${esc(mtWho(r.u))} &middot; <b>${esc(r.status === 'requested' ? 'requested a subscription' : r.status)}</b></span><span class="flex gap-1.5">${r.status === 'requested' ? `<button type="button" data-act="mtok" data-u="${esc(r.u)}" data-p="${esc(p.id)}" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition">Activate</button><button type="button" data-act="mtno" data-u="${esc(r.u)}" data-p="${esc(p.id)}" class="px-3 py-1.5 rounded-lg text-xs font-semibold glass text-slate-300 hover:text-white transition">Decline</button>` : `<button type="button" data-act="mtdel" data-u="${esc(r.u)}" data-p="${esc(p.id)}" class="px-3 py-1.5 rounded-lg text-xs font-semibold glass text-slate-300 hover:text-white transition">Remove</button>`}</span></div>`).join('');
  return `<div class="font-semibold ${tone}">${esc(line)}</div>${reqs}
    <details class="mt-2"><summary class="cursor-pointer text-xs font-semibold text-brand-400 hover:text-white">Edit maintenance</summary>
      <form data-form="maint" data-p="${esc(p.id)}" class="mt-2 flex flex-wrap items-end gap-2"><label class="text-xs text-slate-400">Free weeks<input name="weeks" type="number" min="0" max="260" step="1" required value="${p.mw}" class="field !py-2 mt-1 w-28"/></label><button type="submit" class="px-4 py-2 rounded-xl glass text-sm font-semibold text-brand-400 hover:text-white transition">Save</button></form></details>`;
}
function projCard(p) {
  const s = status(p), v = pct(p);
  return `<div data-f data-pid="${esc(p.id)}" class="${card}">
        <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${esc(p.name)}</div><div class="text-xs text-slate-400 mt-0.5">${p.start ? fmtD(p.start) + ' – ' + fmtD(p.due) : 'Target ' + fmtD(p.due)}</div></div><div class="flex items-center gap-2 shrink-0"><span data-badge class="${badgeCls(s)}">${s}</span><button type="button" data-act="del" data-p="${esc(p.id)}" aria-label="Delete project ${esc(p.name)}" title="Delete project" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition">${svg(ICON.trash, 'w-4 h-4')}</button></div></div>
        <div class="mt-4 flex items-center gap-3"><div class="bar flex-1 h-2 rounded-full bg-white/10"><i style="width:${v}%"></i></div><span data-pct data-v="${v}" class="text-sm font-bold w-10 text-right">${v}%</span></div>
        <div data-list class="mt-4 space-y-2">${listHtml(p)}</div>
        <form data-form="addinc" data-p="${esc(p.id)}" data-add class="mt-4 flex items-center gap-2${p.archived ? ' hidden' : ''}"><input name="t" maxlength="60" autocomplete="off" aria-label="Add a feature to ${esc(p.name)}" placeholder="Add a new feature..." class="field !py-2 min-w-0 text-sm"/><button type="submit" class="shrink-0 px-4 py-2 rounded-xl glass text-sm font-semibold text-brand-400 hover:text-white transition">+ Add</button></form>
        <div data-mt data-sig="${esc(mtSig(p))}" class="mt-4 rounded-xl border border-white/10 px-3.5 py-3 text-sm${p.cloud ? '' : ' hidden'}">${mtHtml(p)}</div>
        <div data-slot data-k="${slotKey(p)}">${actHtml(p)}</div></div>`;
}
// ---------- list helpers (quotations + invoices) ----------
const pillCls = on => 'flex-auto sm:flex-none text-center whitespace-nowrap px-3 sm:px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ' + (on ? 'bg-brand-500 text-white' : 'glass text-slate-300 hover:text-white');
// fade a card out, then close the gap it leaves
function collapseOut(n) {
  if (n._gone) return; n._gone = true;
  n.style.height = n.offsetHeight + 'px'; n.style.overflow = 'hidden'; n.style.boxSizing = 'border-box';
  n.classList.add('q-out'); void n.offsetHeight;
  const t = '.45s cubic-bezier(.4,0,.2,1) .1s';
  n.style.transition = 'height ' + t + ', padding ' + t + ', margin ' + t + ', border-width ' + t;
  n.style.height = '0px'; n.style.paddingTop = '0px'; n.style.paddingBottom = '0px'; n.style.marginTop = '0px'; n.style.marginBottom = '0px'; n.style.borderWidth = '0px';
}
// redraw just the list (not the whole view), so open forms and the scroll position are untouched; `all` staggers every card in
function redrawList(grid, html, ids, key, all) {
  const have = new Set([...grid.querySelectorAll('[' + key + ']')].map(n => n.getAttribute(key)));
  grid.dataset.ids = ids.join(',');
  grid.innerHTML = html;
  grid.querySelectorAll('[data-f]').forEach((el, i) => { if (all || !have.has(el.getAttribute(key))) { el.classList.add('fade-item'); el.style.setProperty('--i', all ? i : 0); } });
}
function swapFilter(grid, draw) {
  grid.style.transition = 'opacity .18s ease'; grid.style.opacity = '0'; clearTimeout(grid._t);
  grid._t = setTimeout(() => { draw(); grid.style.opacity = '1'; }, 190);
}
function tweenMoney(el, to) {
  const from = el._cur != null ? el._cur : (parseFloat(el.dataset.v) || 0);
  el.dataset.v = to; cancelAnimationFrame(el._r);
  if (from === to) { el._cur = to; el.textContent = money(to); return; }
  const t0 = performance.now(), D = 700;
  const step = t => {
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el._cur = from + (to - from) * e; el.textContent = money(k < 1 ? Math.round(el._cur) : to);
    if (k < 1) el._r = requestAnimationFrame(step);
  };
  el._r = requestAnimationFrame(step);
}
const flash = n => { n.classList.remove('q-flash'); void n.offsetWidth; n.classList.add('q-flash'); };
const pop = el => { el.classList.remove('badge-pop'); void el.offsetWidth; el.classList.add('badge-pop'); };

// ---------- quotations ----------
const qWhen = t => t ? fmtD(t) + ' · ' + fmtT(t) : '';
const qBadge = q => 'shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-500 ' + (q.emailSent ? BADGE.completed : BADGE.pending);
const qSentHtml = q => 'Email sent' + (q.emailSent && q.emailAt ? ` <span style="animation:itemFade .5s ease both" class="font-normal text-slate-400">· ${esc(qWhen(q.emailAt))}</span>` : '');
const qList = () => Q.filter(q => qflt === 'all' || (qflt === 'todo' ? !q.emailSent : q.emailSent));
const qCard = q => {
  const subj = encodeURIComponent('Your free quotation | EM Development'), body = encodeURIComponent('Hi ' + q.name + ',\n\nThank you for reaching out to EM Development about ' + q.service + '.\n\n');
  return `<div data-f data-qid="${esc(q.id)}" data-sent="${q.emailSent ? 1 : 0}" class="${card} q-card flex flex-col">
    <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${esc(q.name)}</div><div class="text-xs text-slate-400 mt-0.5">${esc(qWhen(q.at))}</div></div><span data-qbadge class="${qBadge(q)}">${q.emailSent ? 'Emailed' : 'To email'}</span></div>
    <div class="mt-3 inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400">${esc(q.service || 'General inquiry')}</div>
    <p class="mt-3 text-sm text-slate-300 whitespace-pre-wrap break-words">${esc(q.details || '')}</p>
    <div class="mt-4 space-y-1 text-sm"><div class="truncate"><span class="text-slate-400">Email:</span> <a class="text-brand-400 hover:text-white font-medium" href="mailto:${esc(q.email)}?subject=${subj}&body=${body}">${esc(q.email)}</a></div>${q.phone ? `<div class="truncate"><span class="text-slate-400">Phone:</span> <a class="text-brand-400 hover:text-white font-medium" href="tel:${esc(q.phone)}">${esc(q.phone)}</a></div>` : ''}</div>
    <div class="mt-4"><button type="button" data-act="qreply" data-q="${esc(q.id)}" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition">${svg(ICON.messages, 'w-4 h-4')}Reply by email</button></div>
    <label class="mt-auto pt-4 border-t border-white/10 flex items-center gap-3 text-sm font-semibold cursor-pointer select-none"><input type="checkbox" class="chk" data-act="qmail" data-q="${esc(q.id)}" ${q.emailSent ? 'checked' : ''}/><span data-qtxt data-h="${esc(qSentHtml(q))}">${qSentHtml(q)}</span></label></div>`;
};
const qGridHtml = () => qList().map(qCard).join('') || `<p class="text-slate-400">${qError ? '' : Q.length ? 'Nothing in this list.' : 'No quotations yet.'}</p>`;
const drawQ = all => { const g = $('#qgrid'); if (g) redrawList(g, qGridHtml(), Q.map(q => q.id), 'data-qid', all); };
let qt;
// update the quotation cards in place (no re-render), so the badge, check mark and glow can animate
function updateQView() {
  const grid = $('#qgrid'); if (!grid) return paint(false);
  if (grid.dataset.ids !== Q.map(q => q.id).join(',')) drawQ(false);   // a quotation was added or removed
  const todo = Q.filter(q => !q.emailSent).length;
  const cnt = { all: 'All (' + Q.length + ')', todo: 'To email (' + todo + ')', sent: 'Emailed (' + (Q.length - todo) + ')' };
  document.querySelectorAll('[data-qpill]').forEach(b => { const t = cnt[b.dataset.qpill]; if (b.textContent !== t) b.textContent = t; });
  const nodes = [...grid.querySelectorAll('[data-qid]')];
  nodes.forEach(n => {
    const q = Q.find(x => x.id === n.dataset.qid); if (!q) return;
    const was = n.dataset.sent === '1'; n.dataset.sent = q.emailSent ? '1' : '0';
    const bd = n.querySelector('[data-qbadge]'), txt = q.emailSent ? 'Emailed' : 'To email';
    if (bd.textContent !== txt) { bd.textContent = txt; bd.className = qBadge(q); pop(bd); }
    const cb = n.querySelector('input[data-act="qmail"]'); if (cb.checked !== q.emailSent) cb.checked = q.emailSent;
    const t = n.querySelector('[data-qtxt]'), h = qSentHtml(q); if (t.dataset.h !== h) { t.dataset.h = h; t.innerHTML = h; }
    if (q.emailSent && !was) flash(n);
  });
  // cards that no longer belong in this filter fade out and close the gap; cards that now belong fade in
  const want = qList().map(q => q.id), shown = nodes.map(n => n.dataset.qid);
  const gone = nodes.filter(n => !want.includes(n.dataset.qid)), added = want.some(id => !shown.includes(id));
  clearTimeout(qt);
  if (gone.length || added) {
    gone.forEach(collapseOut);
    qt = setTimeout(() => { if (view === 'messages') drawQ(false); }, gone.length ? 650 : 0);
  }
}

// ---------- invoices ----------
const dstr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const sumAmt = arr => arr.reduce((a, i) => a + i.amt, 0);
const WTYPES = ['Landing page', 'Business website', 'E-commerce website', 'Portfolio website', 'Blog or news website', 'Booking or reservation system', 'Web application', 'Mobile application', 'Other'];
const PAYT = { down: 'Downpayment', half: 'Half payment', full: 'Full payment', p75: '75% payment' };
const istat = i => i.paid ? 'paid' : (i.due && i.due < dstr(new Date()) ? 'overdue' : 'unpaid');
const IBADGE = { paid: BADGE.completed, unpaid: BADGE.pending, overdue: 'text-red-300 bg-red-500/15' };
const ILABEL = { paid: 'Paid', unpaid: 'Unpaid', overdue: 'Overdue' };
const iBadge = i => 'shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-500 ' + IBADGE[istat(i)];
const iBtn = i => 'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors duration-500 ' + (i.paid ? 'glass text-slate-300 hover:text-white' : 'bg-brand-500 text-white hover:bg-brand-600');
const iPaidTxt = i => i.paid && i.paidAt ? ' · Paid ' + fmtD(i.paidAt) : '';
const iMeta = i => 'Billed to ' + i.to + (PAYT[i.pt] ? ' · ' + PAYT[i.pt] : '') + (i.due ? ' · Due ' + fmtD(i.due) : '') + (i.cuid ? '' : ' · Not linked to a customer');
// an invoice is mirrored to the customer's portal only while that customer still exists in the database
const invMirror = i => !!(i.cid && i.cuid && K.some(c => c.id === i.cid && c.uid === i.cuid));
const iIconBtn = 'w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 transition';
const iList = () => I.filter(i => iflt === 'all' || (iflt === 'unpaid' ? !i.paid : i.paid));
const iCard = i => `<div data-f data-iid="${esc(i.id)}" data-paid="${i.paid ? 1 : 0}" data-sent="${i.paid ? 1 : 0}" class="${card} q-card flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4${invEdit === i.id ? ' i-editing' : ''}">
      <div class="min-w-[min(100%,14rem)] flex-1">
        <div class="flex items-center gap-3 flex-wrap"><span class="font-bold">${esc(i.num)}</span><span data-ibadge class="${iBadge(i)}">${ILABEL[istat(i)]}</span></div>
        <div data-idesc class="mt-1 text-sm text-slate-300 break-words">${esc(i.desc)}</div>
        <div class="mt-1 text-xs text-slate-400 break-words"><span data-imeta>${esc(iMeta(i))}</span><span data-ipaid>${esc(iPaidTxt(i))}</span></div>
      </div>
      <div class="flex flex-wrap items-center justify-between sm:justify-end gap-x-4 gap-y-3 sm:shrink-0">
        <div data-iamt data-v="${i.amt}" class="text-lg font-extrabold">${money(i.amt)}</div>
        <div class="flex flex-wrap items-center gap-1.5">
          <button data-act="ipay" data-i="${esc(i.id)}" data-ibtn class="${iBtn(i)}">${i.paid ? 'Mark unpaid' : 'Mark paid'}</button>
          <button data-act="iedit" data-i="${esc(i.id)}" aria-label="Edit ${esc(i.num)}" title="Edit" class="${iIconBtn} hover:text-white hover:bg-white/10">${svg('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', 'w-4 h-4')}</button>
          <button data-act="idl" data-i="${esc(i.id)}" aria-label="Download ${esc(i.num)} as PDF" title="Download PDF" class="${iIconBtn} hover:text-white hover:bg-white/10">${svg('M12 4v12M7 11l5 5 5-5M5 20h14', 'w-4 h-4')}</button>
          <button data-act="idel" data-i="${esc(i.id)}" aria-label="Delete ${esc(i.num)}" title="Delete" class="${iIconBtn} hover:text-red-400 hover:bg-red-500/10">${svg(ICON.trash, 'w-4 h-4')}</button>
        </div>
      </div></div>`;
const iGridHtml = () => iList().map(iCard).join('') || `<p class="text-slate-400">${iError ? '' : I.length ? 'Nothing in this list.' : 'No invoices yet. Create your first one with the button above.'}</p>`;
const drawI = all => { const g = $('#igrid'); if (g) redrawList(g, iGridHtml(), I.map(i => i.id), 'data-iid', all); };
let it;
// update the invoice cards in place (no re-render), so the badge, button, totals and edited values can animate
function updateIView() {
  const grid = $('#igrid'); if (!grid) return paint(false);
  if (grid.dataset.ids !== I.map(i => i.id).join(',')) drawI(false);   // an invoice was added or removed
  const unpaid = I.filter(i => !i.paid).length;
  const cnt = { all: 'All (' + I.length + ')', unpaid: 'Unpaid (' + unpaid + ')', paid: 'Paid (' + (I.length - unpaid) + ')' };
  document.querySelectorAll('[data-ipill]').forEach(b => { const t = cnt[b.dataset.ipill]; if (b.textContent !== t) b.textContent = t; });
  const o = document.querySelector('[data-istat="owed"]'), pd = document.querySelector('[data-istat="paid"]');
  if (o) tweenMoney(o, sumAmt(I.filter(i => !i.paid))); if (pd) tweenMoney(pd, sumAmt(I.filter(i => i.paid)));
  const nodes = [...grid.querySelectorAll('[data-iid]')];
  nodes.forEach(n => {
    const i = I.find(x => x.id === n.dataset.iid); if (!i) return;
    const was = n.dataset.paid === '1'; n.dataset.paid = i.paid ? '1' : '0'; n.dataset.sent = i.paid ? '1' : '0';
    let changed = i.paid && !was;
    const bd = n.querySelector('[data-ibadge]'), txt = ILABEL[istat(i)];
    if (bd.textContent !== txt) { bd.textContent = txt; bd.className = iBadge(i); pop(bd); }
    const bt = n.querySelector('[data-ibtn]'), bl = i.paid ? 'Mark unpaid' : 'Mark paid'; if (bt.textContent !== bl) bt.textContent = bl; bt.className = iBtn(i);
    const pt = n.querySelector('[data-ipaid]'), ptx = iPaidTxt(i); if (pt.textContent !== ptx) pt.textContent = ptx;
    const ds = n.querySelector('[data-idesc]'); if (ds.textContent !== i.desc) { ds.textContent = i.desc; changed = true; }
    const mt = n.querySelector('[data-imeta]'), mtx = iMeta(i); if (mt.textContent !== mtx) { mt.textContent = mtx; changed = true; }
    const am = n.querySelector('[data-iamt]'); if (+am.dataset.v !== i.amt) { tweenMoney(am, i.amt); changed = true; }
    if (changed) flash(n);
  });
  const want = iList().map(i => i.id), shown = nodes.map(n => n.dataset.iid);
  const gone = nodes.filter(n => !want.includes(n.dataset.iid)), added = want.some(id => !shown.includes(id));
  clearTimeout(it);
  if (gone.length || added) {
    gone.forEach(collapseOut);
    it = setTimeout(() => { if (view === 'invoices') drawI(false); }, gone.length ? 650 : 0);
  }
}
// invoice modal (create + edit share one form)
const iModal = $('#iModal'), iForm = $('#iForm');
let invFocus = null;
function showInvPanel(inv) {
  const f = iForm;
  invEdit = inv ? inv.id : null; invOpen = true; invFocus = document.activeElement;
  f.reset(); f.dataset.edit = inv ? inv.id : '';
  const sel = f.elements.cust, nm = c => c.name + (c.company ? ' \u00b7 ' + c.company : '') + (c.email ? ' (' + c.email + ')' : '');
  sel.innerHTML = '<option value="">' + (K.length ? 'Choose a customer...' : 'No customers yet') + '</option>' + K.map(c => `<option value="${esc(c.id)}"${c.disabled || !c.uid ? ' disabled' : ''}>${esc(nm(c))}${c.disabled ? ' (disabled)' : ''}</option>`).join('')
    + (inv && inv.cid && !K.some(c => c.id === inv.cid) ? `<option value="${esc(inv.cid)}">${esc(inv.to)} (removed)</option>` : '');
  const locked = !!(inv && inv.cid); sel.value = locked ? inv.cid : ''; sel.disabled = locked;
  const old = inv && inv.desc && !WTYPES.includes(inv.desc) ? [inv.desc] : [];   // an older invoice keeps its own text as an option
  f.elements.webtype.innerHTML = '<option value="">Choose a website type...</option>' + WTYPES.concat(old).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  f.elements.paytype.innerHTML = '<option value="">Choose a payment type...</option>' + Object.keys(PAYT).map(k => `<option value="${k}">${esc(PAYT[k])}</option>`).join('');
  $('#iHint').textContent = locked ? 'This invoice belongs to ' + inv.to + ' and shows in their portal. The customer cannot be changed.'
    : inv ? 'This invoice is not linked to a customer yet. Choose one so it shows in their portal.'
    : K.length ? 'Only customers saved in your Customers list can be invoiced. The invoice also appears in their portal.'
    : 'Add a customer on the Customers page first. Invoices can only be created for customers in your database.';
  if (inv) { f.elements.webtype.value = inv.desc; f.elements.paytype.value = inv.pt || ''; f.elements.amt.value = inv.amt; }
  $('#iTitle').textContent = inv ? 'Edit ' + inv.num : 'New invoice';
  $('#iSave').textContent = inv ? 'Save changes' : 'Create invoice';
  $('#iErr').textContent = '';
  document.querySelectorAll('.i-editing').forEach(n => n.classList.remove('i-editing'));
  if (inv) { const n = document.querySelector('[data-iid="' + CSS.escape(inv.id) + '"]'); if (n) n.classList.add('i-editing'); }
  iModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => iModal.classList.add('open')));
  setTimeout(() => { if (invOpen) (locked ? f.elements.webtype : f.elements.cust).focus({ preventScroll: true }); }, 60);
}
function hideInvPanel() {
  invOpen = false; invEdit = null;
  document.querySelectorAll('.i-editing').forEach(n => n.classList.remove('i-editing'));
  iModal.classList.remove('open');
  setTimeout(() => { if (!iModal.classList.contains('open')) iModal.classList.remove('show'); }, 320);
  if (invFocus && invFocus.isConnected && invFocus.focus) invFocus.focus();
}
const closeInv = () => { if (!creatingInv) hideInvPanel(); };   // closing by the person waits while a save is running
$('#iBack').addEventListener('click', closeInv);
$('#iClose').addEventListener('click', closeInv);
$('#iCancel').addEventListener('click', closeInv);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && iModal.classList.contains('open')) closeInv(); });
iForm.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...iForm.querySelectorAll('input, select, button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
iForm.addEventListener('submit', e => { e.preventDefault(); saveInvoice(iForm); });

// ---------- subscriptions (Domain, Hosting, Maintenance, Others) ----------
// Saved at users/<uid>/subscriptions/<pushId>. Maintenance plans that customers requested and you activated also show here (read-only).
const STYPE = {
  domain: { l: 'Domain', cls: 'text-aqua bg-aqua/15', ph: 'https://example.com' },
  hosting: { l: 'Hosting', cls: 'text-brand-400 bg-brand-500/20', ph: 'https://example.com' },
  maintenance: { l: 'Maintenance', cls: 'text-emerald-300 bg-emerald-400/15', ph: 'https://example.com' },
  other: { l: 'Others', cls: 'text-pink bg-pink/15', ph: 'e.g. SSL certificate or business email' }
};
const LINKT = ['domain', 'hosting', 'maintenance'];   // these types are named by the customer's website link
function siteUrl(v) {   // returns a clean http(s) link, or '' when the text is not a website address
  v = String(v || '').trim(); if (!v || /\s/.test(v)) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/i.test(u.hostname)) return '';
    return u.pathname === '/' && !u.search && !u.hash ? u.origin : u.href;
  } catch (e) { return ''; }
}
function addCycle(cycle, from) {   // the date one billing cycle after today (or after `from`)
  const dt = from ? new Date(from + 'T00:00:00') : new Date(), day = dt.getDate();
  dt.setMonth(dt.getMonth() + SCYCLE[cycle].m); if (dt.getDate() !== day) dt.setDate(0);
  return dstr(dt);
}
const sName = s => {
  const u = !s.auto && LINKT.includes(s.type) ? siteUrl(s.name) : '';
  return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:text-white hover:underline">${esc(u.replace(/^https?:\/\//, ''))}</a>` : esc(s.name);
};
const SCYCLE = { monthly: { l: 'Monthly', m: 1, per: 'month' }, quarterly: { l: 'Every 3 months', m: 3, per: '3 months' }, yearly: { l: 'Yearly', m: 12, per: 'year' } };
const SLABEL = { active: 'Active', soon: 'Renews soon', overdue: 'Renewal due', paused: 'Paused', cancelled: 'Cancelled', requested: 'Awaiting approval', declined: 'Declined', free: 'Free period', nofree: 'No free period', freesoon: 'Free ends soon', freeended: 'Free period ended' };
const SBADGE = { active: BADGE.completed, soon: BADGE.pending, overdue: IBADGE.overdue, paused: 'text-slate-300 bg-white/10', cancelled: 'text-slate-400 bg-white/10', requested: BADGE.pending, declined: IBADGE.overdue, free: BADGE.active, nofree: 'text-slate-300 bg-white/10', freesoon: BADGE.pending, freeended: IBADGE.overdue };
const sDays = s => s.next ? Math.round((new Date(s.next + 'T00:00:00') - new Date(dstr(new Date()) + 'T00:00:00')) / 864e5) : null;
const sstat = s => {
  if (s.auto === 'free') return s.mw === 0 ? 'nofree' : s.k === 'soon' ? 'freesoon' : s.k === 'ended' ? 'freeended' : 'free';
  if (['cancelled', 'paused', 'requested', 'declined'].includes(s.status)) return s.status;
  const d = sDays(s); return d === null ? 'active' : d < 0 ? 'overdue' : d <= 30 ? 'soon' : 'active';
};
const sLive = s => ['active', 'soon', 'overdue'].includes(sstat(s));
// a subscription counts in "To collect" only in the month its renewal date falls in (Nov 25 counts in November; Jan 4 2027 waits until January)
const sBilled = s => {
  if (!/^\d{4}-\d\d/.test(s.next || '')) return true;   // no renewal date (an active maintenance plan) is billed monthly
  return s.next.slice(0, 7) === dstr(new Date()).slice(0, 7);
};
const sMo = s => sBilled(s) ? (+s.amt || 0) : 0;
// Maintenance lives here too: customer requests (approve or decline them below) and each project's free maintenance period.
const sAuto = () => { const out = [];
  C.forEach(p => {
    const reqs = mtReqs(p.id), own = K.find(x => (x.projects || []).map(String).includes(String(p.id))), who = own ? (own.company || own.name) : '';
    reqs.forEach(r => out.push({ id: 'mt-' + r.u + '-' + p.id, type: 'maintenance', name: p.name + ' maintenance', to: mtWho(r.u), cid: '', amt: +r.fee || p.mf || 0, cycle: 'monthly', next: '', status: r.status === 'active' ? 'active' : r.status === 'declined' ? 'declined' : 'requested', notes: '', at: +r.requestedAt || 0, auto: 'req', u: r.u, pid: p.id }));
    const m = mtInfo(p);
    if (m.k !== 'none' && !reqs.some(r => r.status === 'requested' || r.status === 'active')) out.push({ id: 'mf-' + p.id, type: 'maintenance', name: p.name + ' maintenance', to: who, cid: '', amt: p.mf || 0, cycle: 'monthly', next: '', status: 'active', notes: '', at: 0, auto: 'free', k: m.k, end: m.end, left: m.left, mw: p.mw, pid: p.id });
  });
  return out; };
const sAll = () => [...SUB, ...sAuto()].sort((a, b) => (b.status === 'requested') - (a.status === 'requested') || b.at - a.at);
const sList = () => sAll().filter(s => sflt === 'all' || s.type === sflt);
const sBadge = s => 'shrink-0 px-3 py-1 rounded-full text-xs font-semibold ' + SBADGE[sstat(s)];
const subErr = (err, what) => { console.error(what, err); return /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Allow the signed-in admin to read and write "subscriptions" under users/$uid in Firebase.' : 'Could not ' + what + '. Please try again.'; };
const sRenewTxt = s => {
  if (s.auto === 'req') return s.status === 'requested' ? 'Asked to subscribe' : s.status === 'declined' ? 'Request declined' : 'Requested by the customer, billed monthly';
  if (s.auto === 'free') return s.mw === 0 ? 'No free period set for this project' : s.k === 'pending' ? 'Free for ' + mtWeeks(s.mw) + ', starts when the project is completed' : s.k === 'ended' ? 'Free period ended ' + fmtD(s.end) : 'Free until ' + fmtD(s.end) + ' (' + s.left + (s.left === 1 ? ' day' : ' days') + ' left)';
  const d = sDays(s); if (d === null) return 'No renewal date';
  if (s.status !== 'active') return 'Renewal date ' + fmtD(s.next);
  return d < 0 ? 'Renewal was due ' + fmtD(s.next) + ' (' + (-d) + (d === -1 ? ' day' : ' days') + ' ago)' : d === 0 ? 'Renews today' : 'Renews ' + fmtD(s.next) + ' (in ' + d + (d === 1 ? ' day' : ' days') + ')';
};
const sCard = s => {
  const T = STYPE[s.type] || STYPE.other, st = sstat(s);
  const mb = (a, l, on) => `<button type="button" data-act="${a}" data-u="${esc(s.u)}" data-p="${esc(s.pid)}" class="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${on ? 'bg-brand-500 text-white hover:bg-brand-600' : 'glass text-slate-300 hover:text-white'}">${l}</button>`;
  const acts = s.auto === 'req'
    ? `<div class="flex flex-wrap items-center gap-1.5">${s.status === 'requested' ? mb('mtok', 'Activate', 1) + mb('mtno', 'Decline') : mb('mtdel', 'Remove')}</div>`
    : s.auto === 'free'
    ? `<div class="flex flex-wrap items-center gap-1.5"><button data-act="sfee" data-p="${esc(s.pid)}" class="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${s.amt > 0 ? 'glass text-slate-300 hover:text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}">${s.amt > 0 ? 'Edit fee' : 'Set fee'}</button><button data-act="sgoproj" class="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap glass text-slate-300 hover:text-white transition">Open project</button></div>`
    : `<div class="flex flex-wrap items-center gap-1.5">${s.status === 'active' && s.next ? `<button data-act="srenew" data-s="${esc(s.id)}" class="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${st === 'active' ? 'glass text-slate-300 hover:text-white' : 'bg-brand-500 text-white hover:bg-brand-600'} transition-colors">Mark renewed</button>` : ''}
          <button data-act="sedit" data-s="${esc(s.id)}" aria-label="Edit ${esc(s.name)}" title="Edit" class="${iIconBtn} hover:text-white hover:bg-white/10">${svg('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', 'w-4 h-4')}</button>
          <button data-act="sdel" data-s="${esc(s.id)}" aria-label="Delete ${esc(s.name)}" title="Delete" class="${iIconBtn} hover:text-red-400 hover:bg-red-500/10">${svg(ICON.trash, 'w-4 h-4')}</button></div>`;
  const amt = s.auto === 'free'
    ? (s.amt > 0 ? `<div class="text-lg font-extrabold">${money(s.amt)}</div><div class="text-xs text-slate-400 -mt-0.5">per month after the free period</div>` : `<div class="text-lg font-extrabold">No fee set</div><div class="text-xs text-slate-400 -mt-0.5">use Set fee to add one</div>`)
    : `<div class="text-lg font-extrabold">${money(s.amt)}</div><div class="text-xs text-slate-400 -mt-0.5">per ${SCYCLE[s.cycle].per}</div>`;
  const who = s.auto ? (s.to ? 'Customer: ' + s.to : 'No customer linked') : (s.to ? 'Billed to ' + s.to : 'No customer linked');
  return `<div data-f data-sid="${esc(s.id)}" class="${card} q-card flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4${subEdit === s.id ? ' i-editing' : ''}${s.status === 'requested' ? ' !border-pink/40' : ''}">
      <div class="min-w-[min(100%,14rem)] flex-1">
        <div class="flex items-center gap-2 flex-wrap"><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${T.cls}">${T.l}</span><span class="${sBadge(s)}">${SLABEL[st]}</span></div>
        <div class="mt-2 font-bold break-words">${sName(s)}</div>
        <div class="mt-1 text-xs text-slate-400 break-words">${esc(who + ' \u00b7 ' + sRenewTxt(s))}</div>
        ${s.notes ? `<div class="mt-1.5 text-sm text-slate-300 break-words">${esc(s.notes)}</div>` : ''}
      </div>
      <div class="flex flex-wrap items-center justify-between sm:justify-end gap-x-4 gap-y-3 sm:shrink-0">
        <div>${amt}</div>
        ${acts}
      </div></div>`;
};
const sGridHtml = () => sList().map(sCard).join('') || `<p class="text-slate-400">${subError ? '' : sAll().length ? 'Nothing in this list.' : 'No subscriptions yet. Add your first one with the button above.'}</p>`;
const drawS = all => { const g = $('#sgrid'); if (g) redrawList(g, sGridHtml(), sList().map(s => s.id), 'data-sid', all); };
const sCounts = () => { const a = sAll(), c = { all: 'All (' + a.length + ')' }; Object.keys(STYPE).forEach(k => { c[k] = STYPE[k].l + ' (' + a.filter(s => s.type === k).length + ')'; }); return c; };
const sStats = () => { const a = sAll(); return { active: a.filter(sLive).length, mrr: Math.round(a.filter(sLive).reduce((n, s) => n + sMo(s), 0)), paid: Math.round(SUB.reduce((n, s) => n + (s.pays || []).reduce((x, p) => x + p.amt, 0), 0) * 100) / 100, req: a.filter(s => s.status === 'requested').length }; };
// update the list, counts and totals in place, so an open form is not disturbed
function updateSView() {
  const grid = $('#sgrid'); if (!grid) return paint(false);
  const c = sCounts(), st = sStats();
  document.querySelectorAll('[data-spill]').forEach(b => { const t = c[b.dataset.spill]; if (b.textContent !== t) b.textContent = t; });
  const a = document.querySelector('[data-sstat="active"]'), m = document.querySelector('[data-sstat="mrr"]'), d = document.querySelector('[data-sstat="paid"]'), q = document.querySelector('[data-sstat="req"]');
  if (a) a.textContent = st.active; if (m) tweenMoney(m, st.mrr); if (d) tweenMoney(d, st.paid); if (q) q.textContent = st.req;
  drawS(false);
}
function subView() {
  subOpen = false; subEdit = null;
  const c = sCounts(), st = sStats(), lbl = 'block text-sm font-medium text-slate-300';
  const pill = k => `<button data-spill="${k}" data-act="sflt" data-v="${k}" class="${pillCls(sflt === k)}">${c[k]}</button>`;
  const stat = (k, l, v, g, raw) => `<div data-f class="${card} !p-4 sm:!p-5"><div class="text-xs text-slate-400">${l}</div><div data-sstat="${k}" ${raw != null ? `data-v="${raw}"` : ''} class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold ${g ? 'gradient-text' : ''}">${v}</div></div>`;
  const opts = o => Object.keys(o).map(k => `<option value="${k}">${esc(o[k].l)}</option>`).join('');
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">${stat('active', 'Active subscriptions', st.active)}${stat('mrr', 'To collect (' + new Date().toLocaleDateString('en', { month: 'long' }) + ')', money(st.mrr), true, st.mrr)}${stat('paid', 'Total collected payments', money(st.paid), true, st.paid)}${stat('req', 'Maintenance to review', st.req)}</div>
    <div data-f class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="flex flex-wrap gap-2 w-full sm:w-auto">${['all', ...Object.keys(STYPE)].map(pill).join('')}</div>
      <button id="newSubBtn" data-act="newsub" class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ New subscription</button></div>
    <div id="sPanel" class="i-panel" inert><div><form data-form="newsub" data-edit="" class="${card} space-y-4"><div id="sTitle" class="font-bold">New subscription</div>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="${lbl}">Type<select name="type" required class="field mt-1.5">${opts(STYPE)}</select></label>
        <label class="${lbl}">Customer<select name="cust" class="field mt-1.5"><option value="">No customer (internal)</option></select></label>
        <label class="${lbl}"><span data-llab>Website link</span><input name="label" required maxlength="300" autocomplete="off" autocapitalize="off" spellcheck="false" class="field mt-1.5" placeholder="${esc(STYPE.domain.ph)}"/></label>
        <label class="${lbl}">Amount (PHP)<input name="amt" type="number" inputmode="decimal" min="1" max="1000000000" step="0.01" required class="field mt-1.5" placeholder="1200"/></label>
        <label class="${lbl}">Billing cycle<select name="cycle" required class="field mt-1.5">${opts(SCYCLE)}</select></label>
        <label class="${lbl}">Next renewal date (automatic)<input name="next" type="date" readonly tabindex="-1" aria-readonly="true" class="field mt-1.5 opacity-80 cursor-not-allowed pointer-events-none"/></label>
        <label class="${lbl}">Status<select name="status" required class="field mt-1.5"><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option></select></label>
        <label class="${lbl}">Private notes (optional)<input name="notes" maxlength="200" autocomplete="off" class="field mt-1.5" placeholder="e.g. registrar, login email or server"/></label>
      </div>
      <p id="sHint" class="text-xs text-slate-400 -mt-1"></p>
      <p id="sErr" class="text-sm text-red-400 min-h-[1.25rem]" role="alert"></p>
      <div class="flex flex-wrap gap-3"><button type="submit" id="sSave" class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white">Add subscription</button><button type="button" data-act="scancel" class="px-6 py-3 rounded-xl glass font-semibold text-slate-300 hover:text-white transition">Cancel</button></div></form></div></div>
    ${subError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(subError)}</p>` : ''}
    <div id="sgrid" data-ids="${sList().map(s => s.id).join(',')}" class="space-y-3">${sGridHtml()}</div>`;
}
function showSubPanel(s) {
  const panel = $('#sPanel'); if (!panel) return;
  const f = panel.querySelector('form'), nx = new Date(); nx.setFullYear(nx.getFullYear() + 1);
  subEdit = s ? s.id : null; subOpen = true;
  f.reset(); f.dataset.edit = s ? s.id : '';
  const sel = f.elements.cust, nm = c => c.name + (c.company ? ' \u00b7 ' + c.company : '');
  sel.innerHTML = '<option value="">No customer (internal)</option>' + K.map(c => `<option value="${esc(c.id)}">${esc(nm(c))}</option>`).join('')
    + (s && s.cid && !K.some(c => c.id === s.cid) ? `<option value="${esc(s.cid)}">${esc(s.to)} (removed)</option>` : '');
  if (s) { f.elements.type.value = s.type; sel.value = s.cid || ''; f.elements.label.value = s.name; f.elements.amt.value = s.amt; f.elements.cycle.value = s.cycle; f.elements.next.value = s.next; f.elements.status.value = s.status; f.elements.notes.value = s.notes; }
  else { f.elements.type.value = 'domain'; f.elements.cycle.value = 'yearly'; }
  syncSubForm(f);
  const locked = !!(s && s.cid); sel.disabled = locked;
  $('#sHint').textContent = locked ? 'This subscription belongs to ' + s.to + ' and shows in their portal. The customer cannot be changed. Notes stay private.'
    : K.length ? 'Choose a customer to also show it in their portal, or leave it empty to keep it internal. Notes always stay private.'
    : 'Add customers on the Customers page to show subscriptions in their portal. Notes always stay private.';
  $('#sTitle').textContent = s ? 'Edit subscription' : 'New subscription';
  $('#sSave').textContent = s ? 'Save changes' : 'Add subscription';
  $('#sErr').textContent = '';
  document.querySelectorAll('.i-editing').forEach(n => n.classList.remove('i-editing'));
  if (s) { const n = document.querySelector('[data-sid="' + CSS.escape(s.id) + '"]'); if (n) n.classList.add('i-editing'); }
  panel.classList.add('open'); panel.removeAttribute('inert');
  const nb = $('#newSubBtn'); if (nb) nb.textContent = 'Close';
  $('#view').scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => { if (subOpen) f.elements.label.focus({ preventScroll: true }); }, 380);
}
function hideSubPanel() {
  const panel = $('#sPanel'); subOpen = false; subEdit = null;
  document.querySelectorAll('.i-editing').forEach(n => n.classList.remove('i-editing'));
  if (!panel) return;
  if (panel.contains(document.activeElement)) document.activeElement.blur();
  panel.classList.remove('open'); panel.setAttribute('inert', '');
  const nb = $('#newSubBtn'); if (nb) nb.textContent = '+ New subscription';
}
// the type decides the label and a sensible billing cycle; the billing cycle decides the next renewal date
function syncSubForm(f) {
  const t = f.elements.type.value; if (!STYPE[t]) return;
  const link = LINKT.includes(t), lab = f.querySelector('[data-llab]');
  if (lab) lab.textContent = link ? 'Website link' : 'Name or details';
  f.elements.label.placeholder = STYPE[t].ph; f.elements.label.inputMode = link ? 'url' : 'text';
  const cur = f.dataset.edit ? SUB.find(x => x.id === f.dataset.edit) : null, cy = f.elements.cycle.value;
  if (SCYCLE[cy]) f.elements.next.value = cur && cur.next && cur.cycle === cy ? cur.next : addCycle(cy);   // an edit keeps its date unless the cycle changes
}
$('#view').addEventListener('change', e => {
  const t = e.target; if (!t || !t.form || t.form.dataset.form !== 'newsub') return;
  const f = t.form;
  if (t.name === 'type') {
    if (!STYPE[t.value]) return;
    if (!f.dataset.edit) { if (t.value === 'domain') f.elements.cycle.value = 'yearly'; else if (t.value === 'maintenance') f.elements.cycle.value = 'monthly'; }
    syncSubForm(f);
  } else if (t.name === 'cycle') syncSubForm(f);
});
let savingSub = false, subKey = null;
async function saveSub(f) {
  if (savingSub) return;
  const d = new FormData(f), err = $('#sErr'), btn = $('#sSave'), editId = f.dataset.edit;
  const type = String(d.get('type') || ''), linkT = LINKT.includes(type);
  let label = String(d.get('label') || '').trim().replace(/\s+/g, ' ').slice(0, 300);
  const amt = Math.round(parseFloat(d.get('amt')) * 100) / 100, cycle = String(d.get('cycle') || '');
  const status = String(d.get('status') || ''), notes = String(d.get('notes') || '').trim().replace(/\s+/g, ' ').slice(0, 200), cid = String(d.get('cust') || '');
  const bad = m => { err.textContent = m; };
  const cur = editId ? SUB.find(x => x.id === editId) : null;
  if (editId && !cur) { hideSubPanel(); return; }
  if (!STYPE[type]) return bad('Choose the subscription type.');
  if (!label) return bad(linkT ? 'Enter the website link, for example https://example.com.' : 'Enter the name or details.');
  if (linkT) { const u = siteUrl(label); if (!u) return bad('That is not a valid website link. Use something like https://example.com.'); label = u; }
  if (label.length > 120) { if (linkT) return bad('That link is too long. Use a shorter link.'); label = label.slice(0, 120); }
  if (!(amt > 0) || amt > 1e9) return bad('Enter an amount greater than zero.');
  if (!SCYCLE[cycle]) return bad('Choose a billing cycle.');
  const next = cur && cur.next && cur.cycle === cycle ? cur.next : addCycle(cycle);   // automatic: one billing cycle from today, unless an edit keeps the same cycle
  if (!['active', 'paused', 'cancelled'].includes(status)) return bad('Choose a status.');
  const cidF = cur && cur.cid ? cur.cid : cid;   // a linked customer cannot be changed
  const c = cidF ? K.find(x => x.id === cidF) : null, keep = !!(cur && cur.cid);
  if (cidF && !c && !keep) return bad('That customer is not in your Customers list.');
  if (c && !c.uid) return bad('That customer has no portal login yet, so they could not see this subscription.');
  const cuid = c ? c.uid : keep ? cur.cuid : '', mirror = !!(c && cuid);   // mirrored to portal/<customerUid>/subscriptions so the customer sees it
  const to = c ? (c.company || c.name).slice(0, 80) : keep ? cur.to : '';
  err.textContent = '';
  savingSub = true; btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const base = `users/${U.uid}/subscriptions`, rec = { type, label, amount: amt, cycle, nextDue: next, status, notes: notes || null, billedTo: to || null, customerId: cidF || null, customerUid: cuid || null };
    const pub = { type, label, amount: amt, cycle, nextDue: next, status };   // what the customer sees (notes stay private)
    if (cur) {
      const up = {}; Object.keys(rec).forEach(k => { up[`${base}/${cur.id}/${k}`] = rec[k]; });
      if (mirror) { const pb = `portal/${cuid}/subscriptions/${cur.id}`; if (cur.cuid === cuid) Object.keys(pub).forEach(k => { up[`${pb}/${k}`] = pub[k]; }); else up[pb] = Object.assign({ createdAt: serverTimestamp() }, pub); }
      await withTimeout(update(ref(db), up), 12000);
      hideSubPanel(); toast('Subscription updated');
    } else {
      if (sflt !== 'all') { sflt = 'all'; document.querySelectorAll('[data-spill]').forEach(x => x.className = pillCls(x.dataset.v === 'all')); }
      if (!subKey) subKey = push(ref(db, base)).key;   // reused on retry, so a retry never creates a duplicate
      const first = status === 'active' ? { paid: { first: { date: dstr(new Date()), amount: amt, at: serverTimestamp() } } } : {};   // already paid before it was entered, so its fee counts in Accounting right away (fixed key: a retry never doubles it)
      const up = { [`${base}/${subKey}`]: Object.assign({ createdAt: serverTimestamp() }, rec, first) };
      if (mirror) up[`portal/${cuid}/subscriptions/${subKey}`] = Object.assign({ createdAt: serverTimestamp() }, pub);
      await withTimeout(update(ref(db), up), 12000);
      subKey = null; hideSubPanel(); toast(STYPE[type].l + ' subscription added' + (status === 'active' ? ' \u00b7 ' + money(amt) + ' added to Accounting' : ''));
    }
  } catch (e2) {
    const m = String((e2 && (e2.code || e2.message)) || '');
    err.textContent = m === 'timeout' ? 'This is taking too long. Check your connection and try again.' : subErr(e2, cur ? 'update the subscription' : 'save the subscription');
  } finally { savingSub = false; btn.disabled = false; btn.textContent = subEdit ? 'Save changes' : 'Add subscription'; }
}
// push the renewal date forward by one billing cycle
async function renewSub(id, btn) {
  const s = SUB.find(x => x.id === id); if (!s || !s.next) return;
  const dt = new Date(s.next + 'T00:00:00'), day = dt.getDate(); dt.setMonth(dt.getMonth() + SCYCLE[s.cycle].m); if (dt.getDate() !== day) dt.setDate(0);
  const nx = dstr(dt); btn.disabled = true;
  try {
    const pk = push(ref(db, `users/${U.uid}/subscriptions/${id}/paid`)).key;   // the fee collected is kept with the subscription so Accounting can count it
    const up = { [`users/${U.uid}/subscriptions/${id}/nextDue`]: nx, [`users/${U.uid}/subscriptions/${id}/paid/${pk}`]: { date: dstr(new Date()), due: s.next, amount: s.amt, at: serverTimestamp() } };
    if (s.cuid && K.some(c => c.id === s.cid && c.uid === s.cuid)) up[`portal/${s.cuid}/subscriptions/${id}/nextDue`] = nx;
    await withTimeout(update(ref(db), up), 12000); toast(s.name + ' renewed until ' + fmtD(nx) + ' \u00b7 ' + money(s.amt) + ' added to Accounting');
  }
  catch (e2) { toast(subErr(e2, 'renew the subscription')); }
  btn.disabled = false;
}
let offSub = () => {}, sSig = '';
function watchSubs() {
  offSub(); SUB = []; sSig = ''; subError = ''; let first = true;
  offSub = onValue(ref(db, `users/${U.uid}/subscriptions`), snap => {
    const list = [];
    snap.forEach(ch => {
      const v = ch.val() || {};
      list.push({ id: ch.key, type: STYPE[v.type] ? v.type : 'other', name: String(v.label || ''), to: String(v.billedTo || ''), cid: String(v.customerId || ''), cuid: String(v.customerUid || ''), amt: +v.amount || 0, cycle: SCYCLE[v.cycle] ? v.cycle : 'monthly', next: String(v.nextDue || ''), status: ['active', 'paused', 'cancelled'].includes(v.status) ? v.status : 'active', notes: String(v.notes || ''), at: +v.createdAt || 0, pays: Object.entries(v.paid && typeof v.paid === 'object' ? v.paid : {}).map(([k, p]) => ({ id: k, d: String((p && p.date) || ''), due: String((p && p.due) || ''), amt: +(p && p.amount) || 0 })).filter(p => /^\d{4}-\d\d-\d\d$/.test(p.d)) });
    });
    list.sort((a, b) => b.at - a.at);
    const sig = JSON.stringify(list), wasFirst = first; first = false; subError = '';
    if (sig === sSig) return;
    SUB = list; sSig = sig; drawNotif();
    if (document.body.classList.contains('ready') && view === 'subscriptions') { if (wasFirst) paint(true); else updateSView(); }
    else if (document.body.classList.contains('ready') && view === 'accounting') paint(false);
  }, err => { subError = subErr(err, 'load your subscriptions'); if (document.body.classList.contains('ready') && view === 'subscriptions') paint(false); });
}

// ---------- source code (Google Drive links the customer pays for) ----------
// The admin adds a Google Drive link and assigns it to an ACTIVE customer (has a login and is not disabled).
// The real link is saved at users/<uid>/sourcecodes/<id> and stays hidden from the customer while it is locked.
// A customer-safe copy WITHOUT the link is mirrored to portal/<customerUid>/sourcecode/<id>.
// Creating one also creates an invoice for the same amount, so the payment shows in Invoices and Accounting.
// When the admin presses Unlock, the link is written to the customer's copy and appears in their dashboard.
let SC = [], scflt = 'all', scOpen = false, scEdit = null, scError = '', scSaving = false, scKey = null, scInvKey = null, scSig = '', offSC = () => {};
const SCLABEL = { locked: 'Locked', unlocked: 'Unlocked' };
const SCBADGE = { locked: BADGE.pending, unlocked: BADGE.completed };
const SCICON = { locked: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', unlocked: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-1.5' };
const scActive = c => !!c.uid && !c.disabled;
const scInv = s => s.invId ? I.find(x => x.id === s.invId) : null;
const scPay = s => { const i = scInv(s); return i ? istat(i) : 'none'; };   // paid | unpaid | overdue | none
const scPayLabel = p => p === 'none' ? 'No invoice' : ILABEL[p];
const scPayCls = p => p === 'none' ? 'text-slate-300 bg-white/10' : IBADGE[p];
const scErr = (err, what) => { console.error(what, err); return /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Allow the admin to write \"sourcecodes\" under users/$uid and \"sourcecode\" under portal/$cuid in Firebase.' : 'Could not ' + what + '. Please try again.'; };
function driveUrl(v) {   // returns a clean https Google Drive / Docs link, or '' when it is anything else
  v = String(v || '').trim(); if (!v || /\s/.test(v) || v.length > 500) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || !/^(drive|docs)\.google\.com$/i.test(u.hostname)) return '';
    u.protocol = 'https:'; return u.href;
  } catch (e) { return ''; }
}
const scList = () => SC.filter(s => scflt === 'all' || (scflt === 'locked' ? !s.unlocked : s.unlocked));
const scCounts = () => ({ all: 'All (' + SC.length + ')', locked: 'Locked (' + SC.filter(s => !s.unlocked).length + ')', unlocked: 'Unlocked (' + SC.filter(s => s.unlocked).length + ')' });
const scStats = () => ({ total: SC.length, locked: SC.filter(s => !s.unlocked).length, unlocked: SC.filter(s => s.unlocked).length, ready: SC.filter(s => !s.unlocked && scPay(s) === 'paid').length });
const scCard = s => {
  const st = s.unlocked ? 'unlocked' : 'locked', pay = scPay(s), ready = !s.unlocked && pay === 'paid';
  return `<div data-f data-scid="${esc(s.id)}" class="${card} q-card flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4${scEdit === s.id ? ' i-editing' : ''}${ready ? ' !border-emerald-400/40' : ''}">
      <div class="min-w-[min(100%,14rem)] flex-1">
        <div class="flex items-center gap-2 flex-wrap"><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold text-brand-400 bg-brand-500/20">Source code</span><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${SCBADGE[st]}">${SCLABEL[st]}</span><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${scPayCls(pay)}">${esc(scPayLabel(pay))}</span></div>
        <div class="mt-2 font-bold break-words">${esc(s.title)}</div>
        <div class="mt-1 text-xs text-slate-400 break-words">${esc('Assigned to ' + (s.to || 'a customer') + (s.invNum ? ' \u00b7 ' + s.invNum : '') + (s.unlocked && s.unlockedAt ? ' \u00b7 Unlocked ' + fmtD(s.unlockedAt) : ''))}</div>
        ${s.desc ? `<div class="mt-1.5 text-sm text-slate-300 break-words">${esc(s.desc)}</div>` : ''}
        <div class="mt-1.5 text-xs break-all"><a href="${esc(driveUrl(s.link))}" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:text-white hover:underline">Open Google Drive link</a></div>
        ${ready ? '<div class="mt-1.5 text-xs font-semibold text-emerald-300">Payment received. Ready to unlock.</div>' : ''}
      </div>
      <div class="flex flex-wrap items-center justify-between sm:justify-end gap-x-4 gap-y-3 sm:shrink-0">
        <div><div class="text-lg font-extrabold">${money(s.amt)}</div><div class="text-xs text-slate-400 -mt-0.5">one-time payment</div></div>
        <div class="flex flex-wrap items-center gap-1.5">
          <button data-act="sctoggle" data-s="${esc(s.id)}" class="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${s.unlocked ? 'glass text-slate-300 hover:text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}">${s.unlocked ? 'Lock again' : 'Unlock'}</button>
          <button data-act="scedit" data-s="${esc(s.id)}" aria-label="Edit ${esc(s.title)}" title="Edit" class="${iIconBtn} hover:text-white hover:bg-white/10">${svg('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', 'w-4 h-4')}</button>
          <button data-act="scdel" data-s="${esc(s.id)}" aria-label="Delete ${esc(s.title)}" title="Delete" class="${iIconBtn} hover:text-red-400 hover:bg-red-500/10">${svg(ICON.trash, 'w-4 h-4')}</button>
        </div>
      </div></div>`;
};
const scGridHtml = () => scList().map(scCard).join('') || `<p class="text-slate-400">${scError ? '' : SC.length ? 'Nothing in this list.' : 'No source code yet. Add your first Google Drive link with the button above.'}</p>`;
const drawSC = all => { const g = $('#scgrid'); if (g) redrawList(g, scGridHtml(), scList().map(s => s.id), 'data-scid', all); };
function updateSCView() {   // update the list, counts and totals in place, so an open form is not disturbed
  const grid = $('#scgrid'); if (!grid) return paint(false);
  const c = scCounts(), st = scStats();
  document.querySelectorAll('[data-scpill]').forEach(b => { const t = c[b.dataset.scpill]; if (b.textContent !== t) b.textContent = t; });
  Object.keys(st).forEach(k => { const el = document.querySelector('[data-scstat="' + k + '"]'); if (el && el.textContent !== String(st[k])) el.textContent = st[k]; });
  drawSC(false);
}
function scAdminView() {
  scOpen = false; scEdit = null;
  const c = scCounts(), st = scStats(), lbl = 'block text-sm font-medium text-slate-300';
  const pill = k => `<button data-scpill="${k}" data-act="scflt" data-v="${k}" class="${pillCls(scflt === k)}">${c[k]}</button>`;
  const stat = (k, l, v, g) => `<div data-f class="${card} !p-4 sm:!p-5"><div class="text-xs text-slate-400">${l}</div><div data-scstat="${k}" class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold ${g ? 'gradient-text' : ''}">${v}</div></div>`;
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">${stat('total', 'Source codes', st.total)}${stat('locked', 'Locked', st.locked)}${stat('unlocked', 'Unlocked', st.unlocked)}${stat('ready', 'Paid, ready to unlock', st.ready, true)}</div>
    <div data-f class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="flex flex-wrap gap-2 w-full sm:w-auto">${['all', 'locked', 'unlocked'].map(pill).join('')}</div>
      <button id="newScBtn" data-act="newsc" class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ New source code</button></div>
    <div id="scPanel" class="i-panel" inert><div><form data-form="newsc" data-edit="" novalidate class="${card} space-y-4"><div id="scTitle" class="font-bold">New source code</div>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="${lbl}">Title<input name="title" required maxlength="80" autocomplete="off" class="field mt-1.5" placeholder="e.g. Cebu Bakery website source code"/></label>
        <label class="${lbl}">Assign to (active customer)<select name="cust" class="field mt-1.5"><option value="">Choose an active customer...</option></select></label>
        <label class="${lbl}">Google Drive link<input name="link" required maxlength="500" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" class="field mt-1.5" placeholder="https://drive.google.com/..."/></label>
        <label class="${lbl}">Price (PHP)<input name="amt" type="number" inputmode="decimal" min="1" max="1000000000" step="0.01" required class="field mt-1.5" placeholder="15000"/></label>
        <label class="${lbl} sm:col-span-2">Description (optional, the customer sees this)<input name="desc" maxlength="300" autocomplete="off" class="field mt-1.5" placeholder="e.g. Full project files, README and setup guide"/></label>
      </div>
      <p id="scHint" class="text-xs text-slate-400 -mt-1"></p>
      <p id="scErr" class="text-sm text-red-400 min-h-[1.25rem]" role="alert"></p>
      <div class="flex flex-wrap gap-3"><button type="submit" id="scSave" class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white">Add source code</button><button type="button" data-act="sccancel" class="px-6 py-3 rounded-xl glass font-semibold text-slate-300 hover:text-white transition">Cancel</button></div></form></div></div>
    ${scError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(scError)}</p>` : ''}
    <div id="scgrid" data-ids="${scList().map(s => s.id).join(',')}" class="space-y-3">${scGridHtml()}</div>`;
}
function showSCPanel(s) {
  const panel = $('#scPanel'); if (!panel) return;
  const f = panel.querySelector('form'), sel = f.elements.cust, act = K.filter(scActive);
  scEdit = s ? s.id : null; scOpen = true; f.reset(); f.dataset.edit = s ? s.id : '';
  sel.innerHTML = '<option value="">' + (act.length ? 'Choose an active customer...' : 'No active customers yet') + '</option>' + act.map(c => `<option value="${esc(c.id)}">${esc(c.name + (c.company ? ' \u00b7 ' + c.company : '') + (c.email ? ' (' + c.email + ')' : ''))}</option>`).join('')
    + (s && !act.some(c => c.id === s.cid) ? `<option value="${esc(s.cid)}">${esc(s.to || 'Customer')}</option>` : '');
  if (s) { sel.value = s.cid; sel.disabled = true; f.elements.title.value = s.title; f.elements.link.value = s.link; f.elements.amt.value = s.amt; f.elements.desc.value = s.desc; } else sel.disabled = false;
  $('#scHint').textContent = s ? 'This source code belongs to ' + (s.to || 'a customer') + ' and the customer cannot be changed. The link stays hidden from them until you unlock it.'
    : act.length ? 'Only active customers (with a working login) can be chosen. An invoice for the same price is created for them automatically. The link stays hidden until you press Unlock.'
    : 'Add a customer on the Customers page first. Source code can only be assigned to an active customer.';
  $('#scTitle').textContent = s ? 'Edit source code' : 'New source code';
  $('#scSave').textContent = s ? 'Save changes' : 'Add source code'; $('#scErr').textContent = '';
  document.querySelectorAll('.i-editing').forEach(n => n.classList.remove('i-editing'));
  if (s) { const n = document.querySelector('[data-scid="' + CSS.escape(s.id) + '"]'); if (n) n.classList.add('i-editing'); }
  panel.classList.add('open'); panel.removeAttribute('inert');
  const nb = $('#newScBtn'); if (nb) nb.textContent = 'Close';
  $('#view').scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => { if (scOpen) f.elements.title.focus({ preventScroll: true }); }, 380);
}
function hideSCPanel() {
  const panel = $('#scPanel'); scOpen = false; scEdit = null;
  document.querySelectorAll('.i-editing').forEach(n => n.classList.remove('i-editing'));
  if (!panel) return;
  if (panel.contains(document.activeElement)) document.activeElement.blur();
  panel.classList.remove('open'); panel.setAttribute('inert', '');
  const nb = $('#newScBtn'); if (nb) nb.textContent = '+ New source code';
}
async function saveSC(f) {
  if (scSaving) return;
  const d = new FormData(f), err = $('#scErr'), btn = $('#scSave'), editId = f.dataset.edit, bad = m => { err.textContent = m; };
  const title = String(d.get('title') || '').trim().replace(/\s+/g, ' ').slice(0, 80), desc = String(d.get('desc') || '').trim().replace(/\s+/g, ' ').slice(0, 300);
  const link = driveUrl(d.get('link')), amt = Math.round(parseFloat(d.get('amt')) * 100) / 100;
  const cur = editId ? SC.find(x => x.id === editId) : null;
  if (editId && !cur) { hideSCPanel(); return; }
  const cid = cur ? cur.cid : String(d.get('cust') || '');
  if (!cid) return bad(K.some(scActive) ? 'Choose the active customer this source code is for.' : 'There are no active customers yet. Add one on the Customers page first.');
  if (!title) return bad('Enter a title for the source code.');
  if (!link) return bad('Paste a valid Google Drive link, for example https://drive.google.com/drive/folders/...');
  if (!(amt > 0) || amt > 1e9) return bad('Enter a price greater than zero.');
  err.textContent = ''; scSaving = true; btn.disabled = true; btn.textContent = 'Saving...';
  try {
    let c;
    if (cur) c = { id: cur.cid, uid: cur.cuid, name: cur.to };
    else { const r = await invCustomer(cid); if (r.err) return bad(r.err); c = r.c; }   // checked against the database itself: it must exist, have a login and not be disabled
    const mirror = !!(c.uid && K.some(x => x.id === c.id && x.uid === c.uid)), base = `users/${U.uid}/sourcecodes`, ib = `users/${U.uid}/invoices`, invDesc = ('Source code: ' + title).slice(0, 120);
    if (cur) {
      const inv = scInv(cur);
      if (inv && inv.paid && amt !== cur.amt) return bad('The linked invoice ' + inv.num + ' is already paid, so the price cannot be changed.');
      const up = { [`${base}/${cur.id}/title`]: title, [`${base}/${cur.id}/description`]: desc || null, [`${base}/${cur.id}/link`]: link, [`${base}/${cur.id}/amount`]: amt };
      if (mirror) { const pb = `portal/${c.uid}/sourcecode/${cur.id}`; up[`${pb}/title`] = title; up[`${pb}/description`] = desc || null; up[`${pb}/amount`] = amt; if (cur.unlocked) up[`${pb}/link`] = link; }
      if (inv && (amt !== cur.amt || title !== cur.title)) {
        up[`${ib}/${inv.id}/amount`] = amt; up[`${ib}/${inv.id}/description`] = invDesc;
        if (invMirror(inv)) { up[`portal/${inv.cuid}/invoices/${inv.id}/amount`] = amt; up[`portal/${inv.cuid}/invoices/${inv.id}/description`] = invDesc; }
      }
      await withTimeout(update(ref(db), up), 12000);
      hideSCPanel(); toast('Source code updated');
      return;
    }
    if (!mirror) return bad('That customer is not loaded yet. Please try again in a moment.');
    const num = 'INV-' + (I.reduce((m, x) => Math.max(m, parseInt(String(x.num).replace(/\D/g, ''), 10) || 0), 1000) + 1), bt = (c.company || c.name).slice(0, 80);
    if (scflt !== 'all') { scflt = 'all'; document.querySelectorAll('[data-scpill]').forEach(x => x.className = pillCls(x.dataset.v === 'all')); }
    if (!scKey) scKey = push(ref(db, base)).key;   // reused on retry, so a retry never creates a duplicate
    if (!scInvKey) scInvKey = push(ref(db, ib)).key;
    await withTimeout(update(ref(db), {
      [`${base}/${scKey}`]: { title, description: desc || null, link, amount: amt, customerId: c.id, customerUid: c.uid, billedTo: bt, invoiceId: scInvKey, invoiceNum: num, unlocked: false, createdAt: serverTimestamp() },
      [`portal/${c.uid}/sourcecode/${scKey}`]: { title, description: desc || null, amount: amt, invoiceId: scInvKey, unlocked: false, createdAt: serverTimestamp() },   // no link here: the customer cannot see it yet
      [`${ib}/${scInvKey}`]: { number: num, billedTo: bt, customerId: c.id, customerUid: c.uid, description: invDesc, paymentType: 'full', amount: amt, paid: false, createdAt: serverTimestamp() },
      [`portal/${c.uid}/invoices/${scInvKey}`]: { number: num, description: invDesc, paymentType: 'full', amount: amt, paid: false, createdAt: serverTimestamp() }
    }), 12000);
    scKey = null; scInvKey = null; hideSCPanel(); toast('Source code assigned to ' + bt + ' \u00b7 ' + num + ' created');
  } catch (e2) {
    const m = String((e2 && (e2.code || e2.message)) || '');
    err.textContent = m === 'timeout' ? 'This is taking too long. Check your connection and try again.' : scErr(e2, cur ? 'update the source code' : 'save the source code');
  } finally { scSaving = false; btn.disabled = false; btn.textContent = scEdit ? 'Save changes' : 'Add source code'; }
}
// Unlock opens a confirmation modal. Confirming writes the Drive link into the customer's own copy AND marks the linked invoice as paid (one atomic write).
// Lock again uses the same modal and only removes the link; the invoice stays as it is.
async function toggleSC(id, btn) {
  const s = SC.find(x => x.id === id); if (!s) return;
  if (!K.some(c => c.id === s.cid && c.uid === s.cuid)) return toast('This customer no longer exists, so there is nobody to unlock it for.');
  if (!s.unlocked) {
    const k = K.find(c => c.id === s.cid);
    if (k && k.disabled) return toast(k.name + "'s account is disabled. Enable it on the Customers page first.");
    return openUnlock(s, btn, true);
  }
  openUnlock(s, btn, false);
}
// ---------- unlock confirmation modal ----------
const ulModal = $('#ulModal'), ulForm = $('#ulForm'), ulBtn = $('#ulBtn'), ulErr = $('#ulErr');
let ulId = null, ulOn = true, ulBusy = false, ulFocus = null;
const ulLabel = (s, on) => { const i = on && s ? scInv(s) : null; return !on ? 'Lock again' : i && !i.paid ? 'Unlock & mark paid' : 'Confirm unlock'; };
function openUnlock(s, trigger, on) {
  const inv = scInv(s), row = (k, v) => `<div class="flex items-start justify-between gap-4"><span class="text-slate-400 shrink-0">${k}</span><span class="font-semibold text-right break-words min-w-0">${esc(v)}</span></div>`;
  ulId = s.id; ulOn = on; ulFocus = trigger || document.activeElement;
  $('#ulTitle').textContent = on ? 'Unlock source code?' : 'Lock source code again?';
  $('#ulDesc').textContent = on ? 'The customer will be able to open the Google Drive link from their dashboard.' : 'The customer will no longer see the Google Drive link in their dashboard.';
  $('#ulInfo').innerHTML = row('Source code', s.title) + row('Customer', s.to || 'Customer') + row('Price', money(s.amt)) + (inv ? row('Invoice', inv.num) : '');
  const pay = $('#ulPay');
  if (!on) { pay.className = 'mt-3 text-sm text-slate-400'; pay.textContent = inv ? inv.num + ' stays as it is (' + (inv.paid ? 'paid' : 'unpaid') + '). Locking does not change the invoice.' : 'You can unlock it again at any time.'; }
  else if (inv && !inv.paid) { pay.className = 'mt-3 text-sm font-semibold text-emerald-300'; pay.textContent = inv.num + ' (' + money(inv.amt) + ') will be marked as paid and counted in Accounting.'; }
  else if (inv) { pay.className = 'mt-3 text-sm text-slate-400'; pay.textContent = inv.num + ' is already marked as paid.'; }
  else { pay.className = 'mt-3 text-sm text-pink'; pay.textContent = 'No invoice is linked to this source code, so there is nothing to mark as paid.'; }
  ulErr.textContent = ''; ulBtn.disabled = false; $('#ulBtnLabel').textContent = ulLabel(s, on);
  ulModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => ulModal.classList.add('open')));
  setTimeout(() => { if (ulId) ulBtn.focus({ preventScroll: true }); }, 60);
}
function closeUnlock() {
  if (ulBusy) return;
  ulModal.classList.remove('open');
  setTimeout(() => { if (!ulModal.classList.contains('open')) ulModal.classList.remove('show'); }, 320);
  if (ulFocus && ulFocus.isConnected && ulFocus.focus) ulFocus.focus();
  ulId = null;
}
$('#ulBack').addEventListener('click', closeUnlock);
$('#ulCancel').addEventListener('click', closeUnlock);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ulModal.classList.contains('open')) closeUnlock(); });
ulForm.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...ulForm.querySelectorAll('button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
ulForm.addEventListener('submit', async e => {
  e.preventDefault(); if (ulBusy || !ulId) return;
  const s = SC.find(x => x.id === ulId); if (!s) { closeUnlock(); return; }
  if (!K.some(c => c.id === s.cid && c.uid === s.cuid)) { ulErr.textContent = 'This customer no longer exists, so there is nobody to unlock it for.'; return; }
  const on = ulOn, inv = scInv(s), payNow = !!(on && inv && !inv.paid);   // re-checked here, in case the invoice changed while the modal was open
  ulBusy = true; ulBtn.disabled = true; $('#ulBtnLabel').textContent = on ? 'Unlocking...' : 'Locking...';
  const sp = $('#ulSpin'); if (!sp) ulBtn.insertAdjacentHTML('afterbegin', '<span class="q-spinner" id="ulSpin"></span>');
  try {
    const pb = `portal/${s.cuid}/sourcecode/${s.id}`, base = `users/${U.uid}/sourcecodes/${s.id}`;
    const up = on ? { [`${base}/unlocked`]: true, [`${base}/unlockedAt`]: serverTimestamp(), [`${pb}/unlocked`]: true, [`${pb}/link`]: s.link }
      : { [`${base}/unlocked`]: false, [`${base}/unlockedAt`]: null, [`${pb}/unlocked`]: false, [`${pb}/link`]: null };
    if (payNow) {   // same fields as the "Mark paid" button on Invoices, in the same write, so the two can never get out of step
      const ib = `users/${U.uid}/invoices/${inv.id}`;
      up[`${ib}/paid`] = true; up[`${ib}/paidAt`] = serverTimestamp();
      if (invMirror(inv)) { const ipb = `portal/${inv.cuid}/invoices/${inv.id}`; up[`${ipb}/paid`] = true; up[`${ipb}/paidAt`] = serverTimestamp(); }   // the customer sees it too
    }
    await withTimeout(update(ref(db), up), 12000);
    ulBusy = false; closeUnlock();
    toast(on ? '\u201c' + s.title + '\u201d unlocked for ' + (s.to || 'the customer') + (payNow ? ' \u00b7 ' + inv.num + ' marked as paid' : '') : '\u201c' + s.title + '\u201d locked again');
  } catch (err) {
    const m = String((err && (err.code || err.message)) || '');
    ulErr.textContent = m === 'timeout' ? 'This is taking too long. Check your connection and try again.' : scErr(err, on ? 'unlock the source code' : 'lock the source code');
  } finally {
    ulBusy = false; ulBtn.disabled = false; const sp2 = $('#ulSpin'); if (sp2) sp2.remove();
    $('#ulBtnLabel').textContent = ulLabel(SC.find(x => x.id === ulId), ulOn);
  }
});
function openXSC(id, trigger) {
  const x = SC.find(y => y.id === id); if (!x) return;
  const inv = scInv(x);
  xSetup('source'); delI = { kind: 'source', id: x.id, num: x.title, cuid: K.some(c => c.id === x.cid && c.uid === x.cuid) ? x.cuid : '' }; xFocus = trigger || document.activeElement;
  $('#xDesc').textContent = 'This will permanently delete the source code \"' + x.title + '\" (' + money(x.amt) + (x.to ? ', assigned to ' + x.to : '') + ')' + (delI.cuid ? ' and remove it from their dashboard' : '') + '.' + (inv ? ' The linked invoice ' + inv.num + ' is kept.' : '') + ' This cannot be undone.';
  xIn.value = ''; xIn.disabled = false; setXDeleting(false); syncX();
  xModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => xModal.classList.add('open')));
  setTimeout(() => xIn.focus(), 60);
}
function watchSC() {
  offSC(); SC = []; scSig = ''; scError = ''; let first = true;
  offSC = onValue(ref(db, `users/${U.uid}/sourcecodes`), snap => {
    const list = [];
    snap.forEach(ch => {
      const v = ch.val() || {};
      list.push({ id: ch.key, title: String(v.title || ''), desc: String(v.description || ''), link: String(v.link || ''), amt: +v.amount || 0, cid: String(v.customerId || ''), cuid: String(v.customerUid || ''), to: String(v.billedTo || ''), invId: String(v.invoiceId || ''), invNum: String(v.invoiceNum || ''), unlocked: v.unlocked === true, unlockedAt: +v.unlockedAt || 0, at: +v.createdAt || 0 });
    });
    list.sort((a, b) => b.at - a.at);
    const sig = JSON.stringify(list), wasFirst = first; first = false; scError = '';
    if (sig === scSig) return;
    SC = list; scSig = sig; drawNotif();
    if (document.body.classList.contains('ready') && view === 'source') { if (wasFirst) paint(true); else updateSCView(); }
  }, err => { scError = scErr(err, 'load your source code'); if (document.body.classList.contains('ready') && view === 'source') paint(false); });
}
// customer side: only what the admin mirrored to portal/<customerUid>/sourcecode (the link is there only once unlocked)
function scCustView() {
  if (!PORTAL || PORTAL.revoked || PORTAL.disabled) return `<div data-f class="${card} max-w-xl"><div class="font-bold">Access disabled</div><p class="mt-1 text-sm text-slate-400">Your portal access is no longer active. Please contact EM Development.</p></div>`;
  const invs = PORTAL.invoices || {};
  const list = Object.entries(PORTAL.sourcecode || {}).map(([id, v]) => {
    v = v || {}; const inv = invs[v.invoiceId], link = driveUrl(v.link);
    return { id, title: String(v.title || 'Source code'), desc: String(v.description || ''), amt: +v.amount || 0, link, unlocked: v.unlocked === true && !!link, paid: !!(inv && inv.paid), invNum: inv ? String(inv.number || '') : '', at: +v.createdAt || 0 };
  }).sort((a, b) => b.at - a.at);
  const cardOf = s => {
    const st = s.unlocked ? 'unlocked' : 'locked';
    const note = s.unlocked ? 'Your source code is ready. Keep the link private.'
      : s.paid ? 'Payment received. EM Development will unlock your source code shortly.'
      : 'Pay ' + (s.invNum || 'your invoice') + ' (' + money(s.amt) + ') to get access. Once EM Development confirms your payment, the Google Drive link unlocks here.';
    return `<div data-f class="${card} flex flex-col"><div class="flex items-start gap-3"><span class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${s.unlocked ? 'text-emerald-300 bg-emerald-400/15' : 'text-pink bg-pink/15'}">${svg(SCICON[st], 'w-5 h-5')}</span>
      <div class="min-w-0 flex-1"><div class="flex items-start justify-between gap-3"><div class="font-bold break-words min-w-0">${esc(s.title)}</div><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${SCBADGE[st]}">${SCLABEL[st]}</span></div>
      ${s.desc ? `<p class="mt-1 text-sm text-slate-300 break-words">${esc(s.desc)}</p>` : ''}</div></div>
      <div class="mt-4 flex flex-wrap items-center gap-2 text-sm"><span class="font-extrabold">${money(s.amt)}</span><span class="px-3 py-1 rounded-full text-xs font-semibold ${s.paid ? BADGE.completed : BADGE.pending}">${s.paid ? 'Paid' : 'Unpaid'}</span>${s.invNum ? `<span class="text-xs text-slate-400">${esc(s.invNum)}</span>` : ''}</div>
      <p class="mt-3 text-sm text-slate-400">${esc(note)}</p>
      ${s.unlocked ? `<a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer" class="btn-shine mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">Open source code</a>` : ''}</div>`;
  };
  return `<p data-f class="text-slate-400 mb-5">Source code files for your project are shared here as a Google Drive link. They unlock after payment is confirmed.</p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${list.map(cardOf).join('') || '<p class="text-slate-400">No source code has been assigned to you yet.</p>'}</div>`;
}

// PDF (jsPDF is loaded the first time it's needed)
let pdfLib = null;
const loadPdf = () => pdfLib || (pdfLib = new Promise((res, rej) => {
  if (window.jspdf) return res(window.jspdf.jsPDF);
  const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  sc.onload = () => res(window.jspdf.jsPDF); sc.onerror = () => { pdfLib = null; rej(new Error('load')); };
  document.head.appendChild(sc);
}));
const pdfMoney = n => 'PHP ' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Invoice PDF layout: blue wave header, Bill To / From, item table, sub total bar, note, payment information and "Thank You!".
// d = { num, date, dueLabel, due, status, statusLabel, toLines[], desc, amt, paid, note, bank }
function drawInvoicePdf(doc, d) {
  const W = 210, M = 16, NAVY = [14, 48, 128], MID = [38, 92, 190], TXT = [38, 42, 58], MUTED = [112, 118, 136], LINE = [186, 192, 208];
  const FROM = { name: 'EM Development', email: 'emdevelopmentph@gmail.com', phone: '(+63) 920 501 8789', addr: 'Cebu City, Cebu, Philippines' };
  const B = d.bank || { bank: 'Bank of the Philippine Islands (BPI)', name: 'Ethan Montera', number: '1019235676' };
  const fill = c => doc.setFillColor(c[0], c[1], c[2]), ink = c => doc.setTextColor(c[0], c[1], c[2]), stroke = c => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (st, sz) => { doc.setFont('helvetica', st); doc.setFontSize(sz); };
  // header: navy band with a wavy lower edge and a lighter swoosh across the top
  fill(NAVY); doc.lines([[W, 0], [0, 34], [-35, -10, -70, 18, -105, 7], [-35, -11, -70, 11, -105, 5]], 0, 0, [1, 1], 'F', true);
  try {
    doc.setGState(new doc.GState({ opacity: 0.4 })); fill(MID);
    doc.lines([[W, 0], [0, 6], [-70, 10, -140, -4, -W, 8]], 0, 0, [1, 1], 'F', true);
    doc.setGState(new doc.GState({ opacity: 1 }));
  } catch (e) {}
  font('bold', 30); ink([255, 255, 255]); doc.text('INVOICE', M, 31);
  font('bold', 11); doc.text('NO: ' + d.num, W - M, 31, { align: 'right' });
  // bill to (left) and from (right)
  let y = 70;
  font('bold', 13); ink(TXT); doc.text('Bill To:', M, y); doc.text('From:', W - M, y, { align: 'right' });
  font('normal', 10); ink(MUTED);
  (d.toLines.length ? d.toLines : ['-']).forEach((t, n) => doc.text(doc.splitTextToSize(String(t), 84), M, y + 7 + n * 5.4));
  [FROM.name, FROM.email, FROM.phone, FROM.addr].forEach((t, n) => doc.text(t, W - M, y + 7 + n * 5.4, { align: 'right' }));
  // date, due and status
  y = 112; font('normal', 10); ink(TXT);
  doc.text('Date: ' + d.date, M, y); doc.text(d.dueLabel + ': ' + d.due, 84, y);
  ink(d.status === 'paid' ? [5, 150, 105] : d.status === 'overdue' ? [220, 38, 38] : [200, 40, 110]);
  font('bold', 10); doc.text('Status: ' + d.statusLabel, W - M, y, { align: 'right' });
  // table
  const TW = W - 2 * M, cols = [92, 18, 34, 34], xs = [M]; cols.forEach((w, n) => xs.push(xs[n] + w));
  y = 122; fill(NAVY); doc.rect(M, y, TW, 8.5, 'F');
  font('bold', 9); ink([255, 255, 255]);
  ['Description', 'Qty', 'Price', 'Total'].forEach((t, n) => doc.text(t, xs[n] + cols[n] / 2, y + 5.7, { align: 'center' }));
  y += 8.5;
  const lines = doc.splitTextToSize(d.desc || 'Website development services', cols[0] - 8), h1 = Math.max(9.5, lines.length * 4.8 + 4.6), RH = 9.5, ROWS = 6, bodyH = h1 + RH * (ROWS - 1);
  stroke(LINE); doc.setLineWidth(0.25);
  doc.rect(M, y, TW, bodyH, 'S');
  for (let n = 1; n < xs.length - 1; n++) doc.line(xs[n], y, xs[n], y + bodyH);
  for (let n = 0; n < ROWS - 1; n++) { const ly = y + h1 + RH * n; doc.line(M, ly, M + TW, ly); }
  font('normal', 9.5); ink(TXT);
  doc.text(lines, xs[0] + 4, y + 6);
  doc.text('1', xs[1] + cols[1] / 2, y + 6, { align: 'center' });
  doc.text(pdfMoney(d.amt), xs[2] + cols[2] / 2, y + 6, { align: 'center' });
  doc.text(pdfMoney(d.amt), xs[3] + cols[3] / 2, y + 6, { align: 'center' });
  y += bodyH;
  // sub total bar
  y += 6; fill(NAVY); doc.rect(xs[1] - 18, y, M + TW - (xs[1] - 18), 9, 'F');
  font('normal', 9.5); ink([255, 255, 255]); doc.text(d.paid ? 'Total Paid' : 'Total Due', xs[1] - 12, y + 6);
  font('bold', 10); doc.text(pdfMoney(d.amt), M + TW - 4, y + 6, { align: 'right' });
  // note (left) and paid stamp (right)
  const ny = y + 24;
  font('bold', 9); ink(TXT); doc.text('Note:', M, ny);
  stroke(TXT); doc.setLineWidth(0.2); doc.line(M + 11, ny + 0.6, M + 62, ny + 0.6); doc.line(M, ny + 7, M + 62, ny + 7); doc.line(M, ny + 13.5, M + 62, ny + 13.5);
  if (d.note) { font('normal', 9); ink(MUTED); doc.text(String(d.note), M + 13, ny - 0.8); }
  if (d.paid) { doc.setDrawColor(5, 150, 105); doc.setLineWidth(0.8); doc.roundedRect(W - M - 36, ny - 5, 36, 13, 2, 2, 'S'); font('bold', 14); doc.setTextColor(5, 150, 105); doc.text('PAID', W - M - 18, ny + 4, { align: 'center' }); }
  // payment information and thank you
  const py = Math.max(256, ny + 24);
  font('bold', 9); ink(TXT); doc.text('Payment Information:', M, py);
  [['Bank:', B.bank], ['Account name:', B.name], ['Account no:', B.number], ['Email:', FROM.email]].forEach(([k, v], n) => {
    font('bold', 9); ink(TXT); doc.text(k, M, py + 7 + n * 5.2); font('normal', 9); ink(MUTED); doc.text(String(v), M + 28, py + 7 + n * 5.2);
  });
  font('normal', 26); ink(NAVY); doc.text('Thank You!', W - M, py + 20, { align: 'right' });
}
async function downloadPdf(i, btn) {
  btn.disabled = true; btn.classList.add('opacity-50');
  try {
    const JsPDF = await loadPdf(), doc = new JsPDF({ unit: 'mm', format: 'a4' }), st = istat(i);
    doc.setProperties({ title: i.num + ' | EM Development' });
    drawInvoicePdf(doc, { num: String(i.num), date: fmtD(i.at || Date.now()), dueLabel: i.paid ? 'Paid on' : 'Due', due: i.paid ? (i.paidAt ? fmtD(i.paidAt) : 'Paid') : (i.due ? fmtD(i.due) : '-'), status: st, statusLabel: ILABEL[st], toLines: [i.to].filter(Boolean), desc: i.desc, amt: i.amt, paid: !!i.paid, note: PAYT[i.pt] || '' });
    doc.save(i.num + '.pdf');
  } catch (err) { console.error('pdf', err); toast('Could not create the PDF. Check your connection and try again.'); }
  btn.disabled = false; btn.classList.remove('opacity-50');
}
// Accounting invoice + subscription ledger as a CSV
function accountingCsv() {
  const q = v => { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const rows = [['Invoice', 'Billed to', 'Website type', 'Payment type', 'Amount (PHP)', 'Due date', 'Status', 'Date paid']].concat(I.map(i => [i.num, i.to, i.desc, PAYT[i.pt] || '', i.amt.toFixed(2), i.due, ILABEL[istat(i)], i.paid && i.paidAt ? dstr(new Date(i.paidAt)) : ''])).concat(subBooks(dstr(new Date())).pays.map(p => ['Subscription', p.s.to, p.s.name, STYPE[p.s.type].l + ' · ' + SCYCLE[p.s.cycle].l, p.amt.toFixed(2), p.due, 'Paid', p.d]));
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
  const dl = document.createElement('a'); dl.href = url; dl.download = 'invoices-' + dstr(new Date()) + '.csv'; document.body.appendChild(dl); dl.click(); dl.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Invoice ledger exported');
}
// Accounting "Download" opens this small chooser: PDF report or CSV ledger
const dlModal = $('#dlModal'), dlPdf = $('#dlPdf'), dlCsv = $('#dlCsv'), dlCancel = $('#dlCancel');
let dlFocus = null, dlBusy = false;
function openDl(trigger) {
  dlFocus = trigger || document.activeElement; dlBusy = false; dlPdf.disabled = dlCsv.disabled = false;
  dlModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => dlModal.classList.add('open')));
  setTimeout(() => dlPdf.focus(), 60);
}
function closeDl() {
  if (dlBusy) return;
  dlModal.classList.remove('open');
  setTimeout(() => { if (!dlModal.classList.contains('open')) dlModal.classList.remove('show'); }, 320);
  if (dlFocus && dlFocus.isConnected && dlFocus.focus) dlFocus.focus();
}
dlCsv.addEventListener('click', () => { accountingCsv(); closeDl(); });
dlPdf.addEventListener('click', async () => {
  if (dlBusy) return; dlBusy = true; dlCsv.disabled = true;
  await accountingPdf(dlPdf);   // greys out the PDF option while the file is being made
  dlBusy = false; dlCsv.disabled = false; closeDl();
});
$('#dlBack').addEventListener('click', closeDl);
dlCancel.addEventListener('click', closeDl);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlModal.classList.contains('open')) closeDl(); });
dlModal.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...dlModal.querySelectorAll('button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
// Accounting report as a PDF: summary, profit & loss, last 6 months, receivables aging, every payment in and every expense paid
async function accountingPdf(btn) {
  btn.disabled = true; btn.classList.add('opacity-50');
  try {
    const JsPDF = await loadPdf(), doc = new JsPDF({ unit: 'mm', format: 'a4' }), today = dstr(new Date());
    const r2 = n => Math.round(n * 100) / 100, ex = exBooks(today), sb = subBooks(today), pm = n => (n < 0 ? '- ' : '') + pdfMoney(Math.abs(n));
    const paidL = I.filter(i => i.paid), recv = sumAmt(paidL), open = I.filter(i => !i.paid), owed = sumAmt(open), late = sumAmt(open.filter(i => i.due && i.due < today)), total = sumAmt(I);
    const income = r2(recv + sb.total), net = r2(income - ex.total), rate = total ? Math.round(recv / total * 100) : 0;
    const ym = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), n0 = new Date();
    const months = Array.from({ length: 6 }, (_, k) => { const d = new Date(n0.getFullYear(), n0.getMonth() - 5 + k, 1); return { k: ym(d), l: d.toLocaleDateString('en', { month: 'long', year: 'numeric' }), inc: 0, exp: 0 }; });
    paidL.forEach(i => { const m = i.paidAt && months.find(x => x.k === ym(new Date(i.paidAt))); if (m) m.inc += i.amt; });
    sb.pays.forEach(p => { const m = months.find(x => x.k === p.d.slice(0, 7)); if (m) m.inc += p.amt; });
    ex.pays.forEach(p => { const m = months.find(x => x.k === p.d.slice(0, 7)); if (m) m.exp += p.amt; });
    const aging = [0, 0, 0, 0], AL = ['Not yet due', '1-30 days late', '31-60 days late', 'Over 60 days late'];
    open.forEach(i => { const d = i.due && i.due < today ? Math.floor((new Date(today + 'T00:00:00') - new Date(i.due + 'T00:00:00')) / 864e5) : 0; aging[!d ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3] += i.amt; });
    const moneyIn = [...paidL.map(i => ({ t: +i.paidAt || 0, d: i.paidAt ? fmtD(i.paidAt) : '-', n: i.num + ' - ' + i.to, a: i.amt })), ...sb.pays.map(p => ({ t: new Date(p.d + 'T00:00:00').getTime(), d: fmtD(p.d), n: 'Subscription - ' + p.s.name + (p.s.to ? ' - ' + p.s.to : ''), a: p.amt }))].sort((a, b) => b.t - a.t);
    const catRows = Object.entries(ex.cat).sort((a, b) => b[1] - a[1]);
    const L = 18, R = 192, GREEN = [5, 150, 105], RED = [220, 38, 38]; let y = 0, pg = 1;
    const ink = () => doc.setTextColor(15, 21, 53);
    const foot = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 128, 160); doc.text('EM Development  |  Accounting report  |  ' + fmtD(today), L, 288); doc.text('Page ' + pg, R, 288, { align: 'right' }); };
    const need = h => { if (y + h > 278) { foot(); doc.addPage(); pg++; y = 20; } };
    const head = t => { need(24); y += 5; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(67, 81, 232); doc.text(t, L, y); y += 2.5; doc.setDrawColor(220, 224, 245); doc.line(L, y, R, y); y += 6; };
    const row = (a, b, o = {}) => {
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(9.5);
      const t = doc.splitTextToSize(String(a), o.w || 120); need(t.length * 5 + 2); ink(); doc.text(t, L, y);
      if (o.c) doc.setTextColor(...o.c); doc.text(String(b), R, y, { align: 'right' }); y += t.length * 5 + 1.5;
    };
    const cols = (c, o = {}) => {   // a table row: first column left, the rest right-aligned at fixed positions
      const xs = o.xs || [R - 100, R - 50, R]; need(8);
      if (o.head) { doc.setFillColor(240, 242, 255); doc.rect(L, y - 4.5, R - L, 7, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(67, 81, 232); }
      else { doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(9.5); ink(); }
      doc.text(String(c[0]), L + (o.head ? 3 : 0), y);
      c.slice(1).forEach((v, k) => { if (o.cc && o.cc[k]) doc.setTextColor(...o.cc[k]); doc.text(String(v), xs[k + (xs.length - c.length + 1)], y, { align: 'right' }); });
      y += o.head ? 7 : 6;
    };
    doc.setProperties({ title: 'Accounting report | EM Development' });
    doc.setFillColor(67, 81, 232); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('EM Development', L, 19);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Website & Mobile App Development', L, 26);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('ACCOUNTING REPORT', R, 19, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text('As of ' + fmtD(today), R, 26, { align: 'right' }); y = 46;

    head('Summary');
    row('Net profit', pm(net), { bold: true, c: net < 0 ? RED : GREEN });
    row('Total income (invoices + subscriptions)', pm(income));
    row('Total expenses', pm(-ex.total));
    row('Expenses this month', pm(ex.thisMonth));
    row('Monthly running cost', pm(ex.run));

    head('Invoices');
    row('Total invoiced', pm(total));
    row('Payments received (' + rate + '% collected, ' + paidL.length + ' of ' + I.length + ' invoices paid)', pm(recv), { c: GREEN });
    row('Outstanding', pm(owed));
    row('Overdue', pm(late), late ? { c: RED } : {});

    head('Subscriptions');
    row('Total collected payments', pm(sb.total), { c: GREEN });
    row('Collected this month', pm(sb.thisMonth));
    row('To collect in ' + new Date().toLocaleDateString('en', { month: 'long' }), pm(sb.due));
    row('Monthly recurring', pm(sb.run));

    head('Profit & loss');
    row('Invoice payments received', pm(recv), { c: GREEN });
    row('Subscription fees received', pm(sb.total), { c: GREEN });
    row('Total income', pm(income), { bold: true, c: GREEN });
    catRows.forEach(([k, v]) => row(EXCAT[k], pm(-v)));
    row('Total expenses', pm(-ex.total), { bold: true });
    row('Net profit', pm(net), { bold: true, c: net < 0 ? RED : GREEN });

    head('Last 6 months');
    cols(['MONTH', 'INCOME', 'EXPENSES', 'NET'], { head: 1, xs: [R - 100, R - 60, R - 25, R - 3].slice(1) });
    months.forEach(m => cols([m.l, pdfMoney(m.inc), pdfMoney(m.exp), pm(r2(m.inc - m.exp))], { xs: [R - 100, R - 60, R - 25, R - 3].slice(1), cc: [null, null, m.inc - m.exp < 0 ? RED : GREEN] }));

    if (owed) { head('Receivables aging'); AL.forEach((l, k) => row(l, pm(aging[k]), k && aging[k] ? { c: RED } : {})); }

    head('Money in - every payment (' + moneyIn.length + ')');
    if (moneyIn.length) moneyIn.forEach(m => row(m.d + '   ' + m.n, pm(m.a), { c: GREEN, w: 135 })); else row('No payments received yet.', '');

    head('Expenses paid (' + ex.pays.length + ')');
    if (ex.pays.length) ex.pays.forEach(p => row(fmtD(p.d) + '   ' + p.e.name + ' (' + EXCAT[p.e.cat] + ')', pm(-p.amt), { w: 135 })); else row('No expenses recorded yet.', '');
    foot(); doc.save('accounting-' + today + '.pdf');
  } catch (err) { console.error('pdf', err); toast('Could not create the PDF. Check your connection and try again.'); }
  btn.disabled = false; btn.classList.remove('opacity-50');
}
const views = {
  subscriptions: () => subView(),
  source: () => PORTAL ? scCustView() : scAdminView(),
  overview() {
    const P = projs(), act = P.filter(p => status(p) === 'active').length;
    const all = P.flatMap(p => p.items), done = all.filter(m => m.d).length;
    const unpaidInv = I.filter(i => !i.paid), owed = sumAmt(unpaidInv), paidInv = I.filter(i => i.paid), received = sumAmt(paidInv);
    const overall = all.length ? Math.round(done / all.length * 100) : 0;
    const next = P.filter(p => !p.archived).map(p => ({ p: p.name, m: p.items.find(m => !m.d) })).filter(x => x.m);
    const toMail = Q.filter(q => !q.emailSent).length;
    const name = U.displayName || U.email.split('@')[0];
    const hr = new Date().getHours(), hello = hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const today = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
    const ph = s => '-' + ((Date.now() / 1000) % s).toFixed(2) + 's';   // keeps the slow animations in phase when the page redraws
    const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    const sub = !P.length ? 'Your workspace is ready. Start a project and it will light up here.'
      : act ? `${plural(act, 'project')} in motion, ${overall}% of all inclusions delivered.` : 'No project is in motion right now. Tick an inclusion to start one.';
    const chip = (c, t, wide) => `<span class="ov-chip${wide ? ' w-full sm:w-auto' : ''}"><i style="background:${c}"></i>${t}</span>`;
    const dueTxt = p => {
      if (!p.due) return { t: 'No target date', late: false };
      const t = new Date(/^\d{4}-\d\d-\d\d$/.test(p.due) ? p.due + 'T00:00:00' : p.due); if (isNaN(t)) return { t: 'No target date', late: false };
      const d = Math.ceil((t - Date.now()) / 864e5);
      return d < 0 ? { t: 'Overdue by ' + plural(-d, 'day'), late: true } : d === 0 ? { t: 'Due today', late: false } : { t: plural(d, 'day') + ' left', late: false };
    };
    const tile = (l, v, s, ac, ic, g) => `<div data-f class="ov-tile" style="--ac:${ac}"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="text-xs font-semibold tracking-wide text-slate-400">${l}</div><div class="stat-v mt-1.5 text-xl min-[420px]:text-2xl sm:text-[1.7rem] font-extrabold tracking-tight ${g ? 'gradient-text' : ''}">${v}</div></div><span class="ov-ico">${svg(ic, 'w-[18px] h-[18px]')}</span></div><div class="mt-3 text-xs text-slate-400 truncate">${s}</div></div>`;
    const seg = p => { const n = Math.max(1, Math.min(12, p.items.length)), on = Math.round(pct(p) * n / 100); return `<div class="ov-seg">${Array.from({ length: n }, (_, k) => `<i class="${k < on ? 'on' : ''}"></i>`).join('')}</div>`; };
    const live = P.filter(p => !p.archived).sort((a, b) => pct(b) - pct(a)).slice(0, 5);
    const pulse = live.map(p => { const d = dueTxt(p), s = status(p); return `<div class="ov-row"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-semibold truncate">${esc(p.name)}</div><div class="text-xs mt-0.5 truncate ${d.late ? 'text-pink' : 'text-slate-400'}">${esc(d.t)}</div></div><span class="${badgeCls(s)} !px-2.5 !py-0.5">${pct(p)}%</span></div>${seg(p)}</div>`; }).join('') || `<div class="ov-empty">${svg(ICON.projects, 'w-6 h-6')}<span>No active projects yet.</span></div>`;
    const tl = next.slice(0, 6).map(x => `<li><span class="ov-node"></span><div class="text-sm font-semibold break-words">${esc(x.m.t)}</div><div class="text-xs text-slate-400 truncate">${esc(x.p)}</div></li>`).join('');
    const tot = owed + received, paidPct = tot ? Math.round(received / tot * 100) : 0;
    const invRows = I.slice(0, 3).map(i => `<div class="flex items-center gap-3 py-2.5 border-t border-white/10 first:border-0 text-sm"><span class="ov-dot ${i.paid ? 'ok' : 'due'}"></span><span class="truncate min-w-0 flex-1">${esc(i.num)} <span class="text-slate-400">&middot; ${esc(i.desc)}</span></span><span class="shrink-0 font-semibold ${i.paid ? 'text-emerald-300' : 'text-pink'}">${money(i.amt)}</span></div>`).join('') || '<div class="ov-empty">' + svg(ICON.invoices, 'w-6 h-6') + '<span>No invoices yet.</span></div>';
    const link = (v, t) => `<button type="button" data-act="go" data-v="${v}" class="ov-link">${t}<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`;
    return `<section data-f class="ov-hero" style="--ph:${ph(28)}">
      <div class="relative z-[1] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6 sm:gap-8">
        <div class="min-w-0 max-w-xl">
          <div class="ov-eyebrow"><span class="ov-live"></span>${esc(today)}</div>
          <h2 class="mt-3 text-[1.65rem] sm:text-4xl font-extrabold tracking-tight leading-[1.1]">${hello},<br><span class="gradient-text break-words">${esc(name)}</span></h2>
          <p class="mt-3 text-sm sm:text-base text-slate-400 max-w-md">${esc(sub)}</p>
          <div class="mt-5 flex flex-wrap gap-2">${chip('#22d3ee', plural(act, 'active project'))}${chip('#f472b6', unpaidInv.length + ' awaiting payment')}${chip('#7c8cff', plural(toMail, 'quote') + ' to email', 1)}</div>
        </div>
        <div class="ov-orbit shrink-0 self-center" style="--ph:${ph(24)}">
          <div class="ov-orbit-ring"><i></i></div>
          <svg viewBox="0 0 36 36" class="ov-orbit-svg"><defs><linearGradient id="ovg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#7c8cff"/><stop offset=".55" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs><circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="2.6"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#ovg)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${(overall * 97.4 / 100).toFixed(1)} 97.4"/></svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center"><div class="text-3xl sm:text-4xl font-extrabold tracking-tight">${overall}<span class="text-lg text-slate-400">%</span></div><div class="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">delivered</div></div>
        </div>
      </div>
    </section>
    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">${tile('Active projects', act, 'of ' + P.length + ' total', '#22d3ee', ICON.projects, 1)}${tile('Inclusions done', done + ' / ' + all.length, overall + '% complete', '#7c8cff', 'M5 13l4 4L19 7')}${tile('Outstanding', money(owed), plural(unpaidInv.length, 'unpaid invoice'), '#f472b6', ICON.invoices)}${tile('Quotes to email', toMail, 'of ' + Q.length + ' received', '#34d399', ICON.messages)}</div>
    <div class="mt-4 grid lg:grid-cols-[1.35fr_1fr] gap-4">
      <div data-f class="${card}"><div class="flex items-center justify-between gap-3 mb-1"><div class="font-bold">Project pulse</div>${link('projects', 'All projects')}</div><div class="ov-rows">${pulse}</div></div>
      <div data-f class="${card}"><div class="flex items-center justify-between gap-3 mb-4"><div class="font-bold">Up next</div>${tl ? `<span class="text-xs text-slate-400">${next.length} open</span>` : ''}</div>${tl ? `<ol class="ov-tl">${tl}</ol>` : `<div class="ov-empty">${svg('M5 13l4 4L19 7', 'w-6 h-6')}<span>${P.length ? 'Everything is complete. 🎉' : 'No projects yet.'}</span></div>`}</div>
    </div>
    <div data-f class="${card} mt-4"><div class="flex items-center justify-between gap-3 mb-4"><div class="font-bold">Cash flow</div>${link('invoices', 'All invoices')}</div>
      <div class="grid md:grid-cols-2 gap-6 md:gap-8">
        <div class="min-w-0">
          <div class="flex items-end justify-between gap-4"><div class="min-w-0"><div class="text-xs font-semibold tracking-wide text-slate-400">Received</div><div class="stat-v mt-1 text-xl sm:text-2xl font-extrabold text-emerald-300">${money(received)}</div></div><div class="min-w-0 text-right"><div class="text-xs font-semibold tracking-wide text-slate-400">Outstanding</div><div class="stat-v mt-1 text-xl sm:text-2xl font-extrabold text-pink">${money(owed)}</div></div></div>
          <div class="ov-split mt-4"><i style="width:${paidPct}%"></i></div>
          <div class="mt-2.5 flex items-center justify-between text-xs text-slate-400"><span>${paidInv.length} of ${plural(I.length, 'invoice')} paid</span><span>${paidPct}% collected</span></div>
        </div>
        <div class="min-w-0">${invRows}</div>
      </div>
    </div>`;
  },
  projects() {
    const list = visible();
    const pill = f => `<button data-act="flt" data-v="${f}" class="px-4 py-2 rounded-full text-sm font-semibold capitalize text-center transition ${flt === f ? 'bg-brand-500 text-white' : 'glass text-slate-300 hover:text-white'}">${f}</button>`;
    return `<div data-f class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap">${['all', 'active', 'pending', 'completed'].map(pill).join('')}</div>
      <button data-act="newp" class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ New project</button></div>
      <div id="pgrid" data-all="${projs().map(p => p.id).join(',')}" class="pgrid">${list.map(projCard).join('') || `<p class="text-slate-400">${flt === 'all' ? 'No projects yet.' : 'No ' + flt + ' projects.'}</p>`}</div>`;
  },
  invoices() {
    const owed = sumAmt(I.filter(i => !i.paid)), paid = sumAmt(I.filter(i => i.paid)), unpaid = I.filter(i => !i.paid).length;
    const pill = (f, l) => `<button data-ipill="${f}" data-act="iflt" data-v="${f}" class="${pillCls(iflt === f)}">${l}</button>`;
    const lbl = 'block text-sm font-medium text-slate-300';
    return `<div class="grid grid-cols-2 gap-4 mb-4"><div data-f class="${card}"><div class="text-xs text-slate-400">Outstanding</div><div data-istat="owed" data-v="${owed}" class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold gradient-text">${money(owed)}</div></div><div data-f class="${card}"><div class="text-xs text-slate-400">Paid to date</div><div data-istat="paid" data-v="${paid}" class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold">${money(paid)}</div></div></div>
    <div data-f class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="flex flex-wrap gap-2 w-full sm:w-auto">${pill('all', 'All (' + I.length + ')')}${pill('unpaid', 'Unpaid (' + unpaid + ')')}${pill('paid', 'Paid (' + (I.length - unpaid) + ')')}</div>
      <button id="newInvBtn" data-act="newinv" class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ New invoice</button></div>
    ${iError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(iError)}</p>` : ''}
    <div id="igrid" data-ids="${I.map(i => i.id).join(',')}" class="space-y-3">${iGridHtml()}</div>`;
  },
  customers() {
    const lk = c => c.projects.map(findP).filter(Boolean);
    const prog = ps => { const a = ps.flatMap(p => p.items); return a.length ? Math.round(a.filter(m => m.d).length / a.length * 100) : 0; };
    const links = K.reduce((n, c) => n + lk(c).length, 0), avg = K.length ? Math.round(K.reduce((n, c) => n + prog(lk(c)), 0) / K.length) : 0;
    const stat = (l, v, g, wide) => `<div data-f class="${card} !p-4 sm:!p-5${wide ? ' col-span-2 sm:col-span-1' : ''}"><div class="text-xs text-slate-400">${l}</div><div class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold ${g ? 'gradient-text' : ''}">${v}</div></div>`;
    const lbl = 'block text-sm font-medium text-slate-300';
    const kCard = c => {
      const ps = lk(c), v = prog(ps);
      return `<div data-f data-kid="${esc(c.id)}" class="${card} flex flex-col${c.disabled ? ' !border-red-400/40' : ''}">
        <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${esc(c.name)}</div><div class="text-xs text-slate-400 mt-0.5 truncate">${esc(c.company || 'No company')}${c.at ? ' &middot; Added ' + esc(fmtD(c.at)) : ''}</div></div><div class="shrink-0 flex flex-wrap justify-end gap-1.5">${c.disabled ? '<span class="px-3 py-1 rounded-full text-xs font-semibold text-red-300 bg-red-500/15">Disabled</span>' : ''}<span class="px-3 py-1 rounded-full text-xs font-semibold ${ps.length ? BADGE.active : BADGE.pending}">${ps.length ? v + '%' : 'No project'}</span></div></div>
        ${c.disabled ? '<p class="mt-3 text-xs text-red-300">Account disabled. This customer cannot log in until you enable it again.</p>' : ''}<div class="mt-3 space-y-1 text-sm"><div class="truncate"><span class="text-slate-400">Email:</span> <a class="text-brand-400 hover:text-white font-medium" href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>${c.phone ? `<div class="truncate"><span class="text-slate-400">Phone:</span> ${esc(c.phone)}</div>` : ''}</div>
        <div class="mt-4 space-y-3">${ps.map(p => `<div><div class="flex items-center justify-between gap-3 text-sm"><span class="truncate font-semibold">${esc(p.name)}</span><span class="text-slate-400">${pct(p)}%</span></div><div class="bar mt-1.5 h-2 rounded-full bg-white/10"><i style="width:${pct(p)}%"></i></div></div>`).join('') || '<p class="text-sm text-slate-400">No project shared yet. Open Manage below to share one.</p>'}</div>
        ${c.update ? `<div class="mt-4 rounded-xl bg-white/10 p-3 text-sm"><div class="text-xs text-slate-400 mb-1">Latest update${c.updatedAt ? ' &middot; ' + esc(fmtD(c.updatedAt)) : ''}</div><div class="whitespace-pre-wrap break-words">${esc(c.update)}</div></div>` : ''}
        <details data-kd="${esc(c.id)}" ${kOpenSet.has(c.id) ? 'open' : ''} class="mt-4 pt-4 border-t border-white/10"><summary class="cursor-pointer text-sm font-semibold text-brand-400 hover:text-white select-none">Manage</summary>
          <div class="mt-3 text-xs text-slate-400">Projects this customer can see</div>
          <div class="mt-2 space-y-2">${C.map(p => `<label class="flex items-center gap-3 text-sm text-slate-300 cursor-pointer select-none"><input type="checkbox" class="chk" data-act="klink" data-k="${esc(c.id)}" data-p="${esc(p.id)}" ${c.projects.includes(p.id) ? 'checked' : ''}/><span class="min-w-0 break-words">${esc(p.name)}</span></label>`).join('') || '<p class="text-sm text-slate-400">Create a project first, then share it here.</p>'}</div>
          <label class="${lbl} mt-4">Post a progress update<textarea data-kdraft="${esc(c.id)}" maxlength="300" rows="3" class="field mt-1.5" placeholder="e.g. Your homepage design is ready for review">${esc(kDraft[c.id] || '')}</textarea></label>
          <button data-act="kpost" data-k="${esc(c.id)}" class="mt-3 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition">Post update</button>
          <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2"><button data-act="kreset" data-k="${esc(c.id)}" class="text-sm font-semibold text-brand-400 hover:text-white">Send password reset</button><button data-act="ktoggle" data-k="${esc(c.id)}" class="text-sm font-semibold ${c.disabled ? 'text-emerald-300' : 'text-red-400'} hover:text-white">${c.disabled ? 'Enable account' : 'Disable account'}</button><button data-act="kdel" data-k="${esc(c.id)}" class="text-sm font-semibold text-red-400">Delete customer</button></div>
        </details></div>`;
    };
    return `${kError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(kError)}</p>` : ''}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">${stat('Customers', K.length, 1)}${stat('Projects shared', links)}${stat('Average progress', avg + '%', 0, 1)}</div>
    <div data-f class="flex flex-wrap items-center justify-between gap-3 mb-5"><p class="text-sm text-slate-400 max-w-xl">Create a login for each customer so they can follow their website's progress.</p>
      <button data-act="newk" class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ New customer</button></div>
    <div id="kPanel" class="i-panel${kOpen ? ' open' : ''}"${kOpen ? '' : ' inert'}><div><form data-form="newcust" novalidate class="${card} space-y-4"><div class="font-bold">New customer account</div>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="${lbl}">Full name<input name="name" required maxlength="60" autocomplete="off" class="field mt-1.5" placeholder="Customer name"/></label>
        <label class="${lbl}">Company or website<input name="company" maxlength="80" autocomplete="off" class="field mt-1.5" placeholder="e.g. Cebu Bakery"/></label>
        <label class="${lbl}">Email (their login)<input name="email" type="email" required maxlength="120" autocomplete="off" class="field mt-1.5" placeholder="name@company.com"/></label>
        <label class="${lbl}">Phone (optional)<input name="phone" maxlength="30" autocomplete="off" class="field mt-1.5" placeholder="+63 900 000 0000"/></label>
        <div class="sm:col-span-2 rounded-xl bg-white/10 p-3 text-sm text-slate-300">Their default password will be <span class="font-mono font-bold">123456</span>. They can change it after signing in.</div>
      </div>
      <div><div class="${lbl}">Projects to share</div><div class="mt-2 grid sm:grid-cols-2 gap-2">${C.map(p => `<label class="flex items-center gap-3 text-sm text-slate-300 cursor-pointer select-none"><input type="checkbox" class="chk" name="proj" value="${esc(p.id)}"/><span class="min-w-0 break-words">${esc(p.name)}</span></label>`).join('') || '<p class="text-sm text-slate-400">No projects yet. You can share one later.</p>'}</div></div>
      <p id="kErrMsg" class="text-sm text-red-400 min-h-[1.25rem]" role="alert"></p>
      <div class="flex flex-wrap gap-3"><button type="submit" id="kSave" class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white">Create account</button><button type="button" data-act="kcancel" class="px-6 py-3 rounded-xl glass font-semibold text-slate-300 hover:text-white transition">Cancel</button></div></form></div></div>
    <div id="kgrid" class="grid md:grid-cols-2 gap-4">${K.map(kCard).join('') || '<p class="text-slate-400">No customers yet. Create the first account with the button above.</p>'}</div>`;
  },
  portal() {
    if (!PORTAL || PORTAL.revoked || PORTAL.disabled) return `<div data-f class="${card} max-w-xl"><div class="font-bold">Access disabled</div><p class="mt-1 text-sm text-slate-400">Your portal access is no longer active. Please contact EM Development.</p></div>`;
    const ids = Object.keys(PORTAL.projects || {}), ps = ids.map(id => PP[id]).filter(Boolean);
    const all = ps.flatMap(p => p.items), done = all.filter(m => m.d).length, overall = all.length ? Math.round(done / all.length * 100) : 0;
    return `<p data-f class="text-slate-400 mb-5">Hi <span class="font-semibold text-slate-200">${esc(PORTAL.name || U.displayName || '')}</span>. Here is how your website is coming along.</p>
    ${(() => { let seen = false; try { seen = !!localStorage.getItem('pwn:' + U.uid); } catch (e) {} return seen ? '' : `<div data-f class="${card} mb-4 flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-slate-300 min-w-0 flex-1" style="min-width:min(14rem,100%)">For your security, please change the temporary password we gave you.</p><div class="flex items-center gap-4"><button data-act="rpw" class="text-sm font-semibold text-brand-400 hover:text-white">Email me a reset link</button><button data-act="pwdone" class="text-sm font-semibold text-slate-400 hover:text-white">Dismiss</button></div></div>`; })()}
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
      <div data-f class="${card} flex items-center gap-5">
        <div class="relative w-28 h-28 shrink-0"><svg viewBox="0 0 36 36" class="w-28 h-28 -rotate-90"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#5b6cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="3.2"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${(overall * 97.4 / 100).toFixed(1)} 97.4"/></svg><div class="absolute inset-0 flex items-center justify-center font-extrabold text-xl">${overall}%</div></div>
        <div><div class="font-bold">Overall progress</div><p class="text-sm text-slate-400 mt-1">${done} of ${all.length} items done.</p></div></div>
      <div data-f class="${card}"><div class="font-bold mb-3">Latest update</div>${PORTAL.update ? `<p class="text-sm whitespace-pre-wrap break-words">${esc(PORTAL.update)}</p><p class="mt-2 text-xs text-slate-400">${PORTAL.updatedAt ? esc(fmtD(PORTAL.updatedAt)) : ''}</p>` : '<p class="text-sm text-slate-400">No updates yet. We will post news here.</p>'}</div>
    </div>
    <div class="mt-4 pgrid">${ps.map(p => `<div data-f class="${card}"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${esc(p.name)}</div><div class="text-xs text-slate-400 mt-0.5">${p.start ? fmtD(p.start) + ' \u2013 ' + fmtD(p.due) : 'Target ' + fmtD(p.due)}</div></div><span class="${badgeCls(status(p))}">${status(p)}</span></div><div class="mt-4 flex items-center gap-3"><div class="bar flex-1 h-2 rounded-full bg-white/10"><i style="width:${pct(p)}%"></i></div><span class="text-sm font-bold w-10 text-right">${pct(p)}%</span></div><div class="mt-4 space-y-2">${p.items.map(m => `<label class="flex items-center gap-3 text-sm text-slate-300 py-0.5"><input type="checkbox" class="chk" disabled ${m.d ? 'checked' : ''}/><span class="${spanCls(m)}">${esc(m.t)}</span></label>`).join('')}</div></div>`).join('') || `<p class="text-slate-400">${ids.length ? 'Loading your project...' : 'Your project has not been shared yet.'}</p>`}</div>`;
  },
  accounting() {
    const today = dstr(new Date()), sb = subBooks(today), total = sumAmt(I), paidL = I.filter(i => i.paid), recv = sumAmt(paidL);
    const open = I.filter(i => !i.paid), owed = sumAmt(open), lateAmt = sumAmt(open.filter(i => i.due && i.due < today));
    const rate = total ? Math.round(recv / total * 100) : 0, short = n => '\u20B1' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    const aging = [0, 0, 0, 0], AL = ['Not yet due', '1\u201330 days late', '31\u201360 days late', 'Over 60 days late'];
    open.forEach(i => { const d = i.due && i.due < today ? Math.floor((new Date(today + 'T00:00:00') - new Date(i.due + 'T00:00:00')) / 864e5) : 0; aging[!d ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3] += i.amt; });
    const ym = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), n0 = new Date();
    const months = Array.from({ length: 6 }, (_, k) => { const d = new Date(n0.getFullYear(), n0.getMonth() - 5 + k, 1); return { k: ym(d), l: d.toLocaleDateString('en', { month: 'short' }), v: 0, s: 0 }; });
    paidL.forEach(i => { const m = i.paidAt && months.find(x => x.k === ym(new Date(i.paidAt))); if (m) m.v += i.amt; });
    sb.pays.forEach(p => { const m = months.find(x => x.k === p.d.slice(0, 7)); if (m) m.s += p.amt; });
    const mx = Math.max(1, ...months.map(m => m.v + (m.s || 0)));
    const cl = Object.create(null); I.forEach(i => { const n = i.to || 'Unknown', c = cl[n] || (cl[n] = { b: 0, p: 0 }); c.b += i.amt; if (i.paid) c.p += i.amt; });
    SUB.forEach(s => (s.pays || []).forEach(p => { const n = s.to || 'Unknown', c = cl[n] || (cl[n] = { b: 0, p: 0 }); c.b += p.amt; c.p += p.amt; }));
    const top = Object.entries(cl).sort((a, b) => b[1].b - a[1].b).slice(0, 5);
    const ledger = [...paidL.map(i => ({ t: +i.paidAt || 0, d: i.paidAt ? fmtD(i.paidAt) : '-', n: i.num + ' \u00b7 ' + i.to, a: i.amt })), ...sb.pays.map(p => ({ t: new Date(p.d + 'T00:00:00').getTime(), d: fmtD(p.d), n: 'Subscription \u00b7 ' + p.s.name + (p.s.to ? ' \u00b7 ' + p.s.to : ''), a: p.amt }))].sort((a, b) => b.t - a.t).slice(0, 8);
    // expenses: salaries, domain, hosting and the rest, counted on every payment date up to today
    const ex = exBooks(today), net = Math.round((recv + sb.total - ex.total) * 100) / 100, pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's'), shortS = n => (n < 0 ? '-' : '') + short(Math.abs(n));
    months.forEach(m => { m.x = 0; });
    ex.pays.forEach(p => { const m = months.find(x => x.k === p.d.slice(0, 7)); if (m) m.x += p.amt; });
    const mx2 = Math.max(1, ...months.map(m => Math.max(m.v + m.s, m.x)));
    const catRows = Object.entries(ex.cat).sort((a, b) => b[1] - a[1]), catSum = Math.round(catRows.reduce((a, c) => a + c[1], 0) * 100) / 100;
    const exList = EX.map(x => {
      const n = exDates(x, today).length, paid = Math.round(n * x.amt * 100) / 100, later = x.date > today;
      const when = x.rep === 'once' ? fmtD(x.date) : EXREP[x.rep].l + ' since ' + fmtD(x.date) + (x.end ? ', stops ' + fmtD(x.end) : '');
      return `<div data-xid="${esc(x.id)}" class="py-3 border-t border-white/10 first:border-0"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-semibold break-words">${esc(x.name)}</div><div class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400"><span class="px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 font-semibold">${esc(EXCAT[x.cat])}</span><span>${esc(when)}</span>${later ? '<span class="text-pink font-semibold">Starts later</span>' : ''}</div>${x.notes ? `<div class="mt-1 text-xs text-slate-500 break-words">${esc(x.notes)}</div>` : ''}</div><div class="shrink-0 text-right"><div class="font-extrabold">${money2(x.amt)}</div><div class="text-xs text-slate-400">${x.rep === 'once' ? (later ? 'Not paid yet' : 'Paid') : pl(n, 'payment') + ' &middot; ' + money2(paid)}</div></div></div><div class="mt-2 flex gap-4"><button data-act="exedit" data-x="${esc(x.id)}" class="text-sm font-semibold text-brand-400 hover:text-white">Edit</button><button data-act="exdel" data-x="${esc(x.id)}" class="text-sm font-semibold text-red-300 hover:text-red-200">Delete</button></div></div>`;
    }).join('');
    const stat = (l, v, c) => `<div data-f class="${card} !p-4 sm:!p-5"><div class="text-xs text-slate-400">${l}</div><div class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold ${c || ''}">${v}</div></div>`;
    const row = (a, b) => `<div class="flex items-center justify-between gap-3 py-2 border-t border-white/10 first:border-0 text-sm">${a}${b}</div>`;
    const none = t => `<p class="text-sm text-slate-400">${t}</p>`;
    return `${iError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(iError)}</p>` : ''}
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5"><p data-f class="text-slate-400">Money in, money out, money owed and what needs chasing, taken from your invoices, subscriptions and expenses.</p>
      <div data-f class="flex flex-wrap items-center gap-2 w-full sm:w-auto"><button data-act="adl" aria-haspopup="dialog" class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl glass text-sm font-semibold text-brand-400 hover:text-white transition">Download</button><button id="newExBtn" data-act="newex" class="btn-shine flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ Add expense</button></div></div>
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">${stat('Total invoiced', money(total))}${stat('Payments received', money(recv), 'gradient-text')}${stat('Outstanding', money(owed))}${stat('Overdue', money(lateAmt), lateAmt ? 'text-red-300' : '')}</div>
    <div data-f class="${card} mt-4"><div class="flex items-center justify-between gap-3"><div class="font-bold">Collection rate</div><div class="font-extrabold">${rate}%</div></div><div class="bar mt-3 h-2 rounded-full bg-white/10"><i style="width:${rate}%"></i></div><p class="mt-2 text-xs text-slate-400">${money(recv)} collected of ${money(total)} invoiced &middot; ${paidL.length} of ${I.length} invoices paid</p></div>
    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">${stat('Subscription income', money(sb.total), 'gradient-text')}${stat('Subscriptions collected this month', money(sb.thisMonth))}${stat('Subscriptions to collect (' + new Date().toLocaleDateString('en', { month: 'long' }) + ')', money(sb.due))}${stat('Monthly recurring', money(sb.run))}</div>
    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">${stat('Expenses to date', money(ex.total))}${stat('Net profit', money(net), net < 0 ? 'text-red-300' : 'gradient-text')}${stat('Expenses this month', money(ex.thisMonth))}${stat('Monthly running cost', money(ex.run))}</div>
    <div class="mt-4 grid xl:grid-cols-2 gap-4">
      <div data-f class="${card}"><div class="font-bold mb-3">Profit &amp; loss</div>
        ${row('<span>Invoice payments received</span>', `<span class="font-semibold text-emerald-300">${money2(recv)}</span>`)}
        ${row('<span>Subscription fees received</span>', `<span class="font-semibold text-emerald-300">${money2(sb.total)}</span>`)}
        ${row('<span class="font-semibold">Total income</span>', `<span class="shrink-0 font-semibold text-emerald-300">${money2(recv + sb.total)}</span>`)}
        ${catRows.map(([k, v]) => row(`<span class="truncate text-slate-300">${esc(EXCAT[k])}</span>`, `<span class="shrink-0 font-semibold">&minus; ${money2(v)}</span>`)).join('') || row('<span class="text-slate-400">No expenses recorded yet</span>', '<span class="text-slate-400">&minus; ' + money2(0) + '</span>')}
        ${row('<span class="font-semibold">Total expenses</span>', `<span class="shrink-0 font-semibold">&minus; ${money2(ex.total)}</span>`)}
        ${row('<span class="font-extrabold">Net profit</span>', `<span class="shrink-0 font-extrabold ${net < 0 ? 'text-red-300' : 'text-emerald-300'}">${money2(net)}</span>`)}
        <p class="mt-3 text-xs ${Math.abs(catSum - ex.total) < 0.005 ? 'text-slate-400' : 'text-red-300'}">${Math.abs(catSum - ex.total) < 0.005 ? '&#10003; Categories add up to the total.' : 'The categories do not add up to the total. Please review your expenses.'} Income counts when an invoice is marked paid or a subscription is marked renewed. Expenses count on every payment date up to today.</p></div>
      <div data-f class="${card}"><div class="flex items-center justify-between gap-3 mb-3"><div class="font-bold">Income vs expenses &middot; last 6 months</div><div class="flex items-center gap-3 text-[11px] text-slate-400"><span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-brand-500"></i>Income</span><span class="inline-flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-sm bg-pink"></i>Expenses</span></div></div>
        <div class="h-32 flex items-end gap-2">${months.map(m => `<div class="flex-1 min-w-0 h-full flex items-end justify-center gap-1"><div class="w-full max-w-[1.25rem] rounded-t-md bg-gradient-to-t from-brand-500 to-aqua" style="height:${m.v + m.s ? Math.max(4, Math.round((m.v + m.s) / mx2 * 100)) : 2}%;opacity:${m.v + m.s ? 1 : .25}"></div><div class="w-full max-w-[1.25rem] rounded-t-md bg-pink" style="height:${m.x ? Math.max(4, Math.round(m.x / mx2 * 100)) : 2}%;opacity:${m.x ? 1 : .25}"></div></div>`).join('')}</div>
        <div class="mt-2 flex gap-2">${months.map(m => `<div class="flex-1 min-w-0 text-center"><div class="text-xs text-slate-400">${m.l}</div><div class="text-[10px] truncate ${m.v + m.s - m.x < 0 ? 'text-red-300' : 'text-slate-500'}">${m.v || m.s || m.x ? shortS(m.v + m.s - m.x) : '-'}</div></div>`).join('')}</div>
        <p class="mt-2 text-[11px] text-slate-500">Figures under each month show income minus expenses.</p></div>
    </div>
    <div class="mt-4 grid xl:grid-cols-2 gap-4">
      <div data-f class="${card}"><div class="font-bold mb-3">Money in &middot; last 6 months <span class="text-xs font-normal text-slate-400">(invoices + subscriptions)</span></div>
        <div class="h-32 flex items-end gap-2">${months.map(m => `<div class="flex-1 min-w-0 h-full flex items-end justify-center"><div class="w-full max-w-[2.5rem] rounded-t-lg bg-gradient-to-t from-brand-500 to-aqua" style="height:${m.v + m.s ? Math.max(4, Math.round((m.v + m.s) / mx * 100)) : 2}%;opacity:${m.v + m.s ? 1 : .25}"></div></div>`).join('')}</div>
        <div class="mt-2 flex gap-2">${months.map(m => `<div class="flex-1 min-w-0 text-center"><div class="text-xs text-slate-400">${m.l}</div><div class="text-[10px] text-slate-500 truncate">${m.v + m.s ? short(m.v + m.s) : '-'}</div></div>`).join('')}</div></div>
      <div data-f class="${card}"><div class="font-bold mb-3">Receivables aging</div>${owed ? AL.map((l, k) => `<div class="py-1.5"><div class="flex items-center justify-between gap-3 text-sm"><span class="${k ? 'text-slate-300' : ''}">${l}</span><span class="font-semibold ${k && aging[k] ? 'text-red-300' : ''}">${money(aging[k])}</span></div><div class="bar mt-1.5 h-1.5 rounded-full bg-white/10"><i style="width:${Math.round(aging[k] / owed * 100)}%"></i></div></div>`).join('') : none('Nothing outstanding. Everything is paid.')}</div>
    </div>
    <div class="mt-4 grid xl:grid-cols-2 gap-4">
      <div data-f class="${card}"><div class="font-bold mb-3">Top clients</div>${top.map(([n, c]) => row(`<span class="truncate">${esc(n)}</span>`, `<span class="shrink-0 text-right flex flex-col min-[420px]:block"><span class="font-semibold text-emerald-300">${money(c.p)}</span> <span class="text-slate-400">of ${money(c.b)}</span></span>`)).join('') || none('No invoices yet.')}</div>
      <div data-f class="${card}"><div class="font-bold mb-3">Payment ledger</div>${ledger.map(i => row(`<span class="truncate"><span class="text-slate-400">${esc(i.d)}</span> &middot; ${esc(i.n)}</span>`, `<span class="shrink-0 font-semibold text-emerald-300">${money(i.a)}</span>`)).join('') || none('No payments received yet.')}</div>
    </div>
    ${exError ? `<p class="mt-4 text-sm text-red-400" role="alert">${esc(exError)}</p>` : ''}
    <div data-f class="${card} mt-4"><div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><div class="font-bold">Expenses</div><p class="text-xs text-slate-400 mt-0.5">Developer salaries, domains, hosting, tools and other costs of running the business.</p></div>
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto"><button data-act="excsv" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl glass text-sm font-semibold text-brand-400 hover:text-white transition">Export CSV</button></div></div>
      ${exList || none('No expenses yet. Add your developer salaries, domain, hosting and other costs so your net profit is right.')}</div>`;
  },
  messages() {
    const todo = Q.filter(q => !q.emailSent).length;
    const pill = (f, l) => `<button data-qpill="${f}" data-act="qflt" data-v="${f}" class="${pillCls(qflt === f)}">${l}</button>`;
    return `<div data-f class="flex flex-wrap items-center justify-between gap-3 mb-5"><div class="flex flex-wrap gap-2 w-full sm:w-auto">${pill('all', 'All (' + Q.length + ')')}${pill('todo', 'To email (' + todo + ')')}${pill('sent', 'Emailed (' + (Q.length - todo) + ')')}</div><button type="button" data-act="qnew" class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">+ New email</button></div>
      ${qError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(qError)}</p>` : ''}
      <div id="qgrid" data-ids="${Q.map(q => q.id).join(',')}" class="grid md:grid-cols-2 gap-4">${qGridHtml()}</div>`;
  },
  tracker() {
    return `${trError ? `<p class="mb-4 text-sm text-red-400" role="alert">${esc(trError)}</p>` : ''}
    <div id="trstats" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">${trStats()}</div>
    <div data-f class="flex flex-wrap items-center justify-between gap-3 mb-4"><div class="flex flex-wrap gap-2 w-full sm:w-auto">${['all', 'login', 'logout', 'email', 'failed'].map(k => `<button data-trpill="${k}" data-act="trflt" data-v="${k}" class="${pillCls(trflt === k)}">${trCounts()[k]}</button>`).join('')}</div>
      <button data-act="trcsv" class="w-full sm:w-auto px-5 py-2.5 rounded-xl glass text-sm font-semibold text-brand-400 hover:text-white transition">Export CSV</button></div>
    <input id="trq" type="search" autocomplete="off" aria-label="Search the tracker" value="${esc(trq)}" placeholder="Search by name, email or recipient..." class="field mb-5"/>
    <div id="trlist" class="space-y-2.5">${trListHtml()}</div>`;
  },
  chat() { return '<div id="chatHost"></div>'; },
  contracts() { return '<div id="ctHost"></div>'; },
  proposal() { return '<div id="prHost"></div>'; },
  backup() {
    const last = bkLast(), sm = bk.sum;
    const stat = (n, l) => `<div class="rounded-xl bg-white/5 px-3 py-2.5"><div class="text-lg font-extrabold">${n}</div><div class="text-xs text-slate-400">${l}</div></div>`;
    return `<div data-f class="${card} max-w-2xl"><div class="font-bold">Back up your data</div>
      <p class="mt-1.5 text-sm text-slate-400">Downloads one file with everything saved in your Realtime Database: projects, invoices, customers, their portal pages, quotations and chat history. Keep it somewhere safe.</p>
      <div class="mt-4 flex flex-wrap items-center gap-3"><button data-act="bkdl" ${bk.busy ? 'disabled' : ''} class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white disabled:opacity-60">${bk.busy === 'dl' ? 'Preparing backup...' : 'Download backup'}</button>
      <span class="text-xs text-slate-400">${last ? 'Last backup: ' + esc(new Date(last).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })) : 'No backup made on this device yet.'}</span></div>
      ${bk.err && bk.errAt === 'dl' ? `<p class="mt-3 text-sm text-red-400" role="alert">${esc(bk.err)}</p>` : ''}
      ${bk.note ? `<p class="mt-3 text-sm text-emerald-300" role="status">${esc(bk.note)}</p>` : ''}</div>
      <div data-f class="${card} max-w-2xl mt-4"><div class="font-bold">Restore from a backup</div>
      <p class="mt-1.5 text-sm text-slate-400">Choose a backup file made here. Everything in it is written back to the database. Records with the same ID are overwritten with the backed-up version. Records that are not in the file are left alone.</p>
      <div class="mt-4 flex flex-wrap items-center gap-3"><label class="inline-flex items-center px-5 py-2.5 rounded-xl glass text-sm font-semibold text-brand-400 hover:text-white cursor-pointer transition ${bk.busy ? 'opacity-60 pointer-events-none' : ''}">Choose backup file<input id="bkFile" type="file" accept=".json,application/json" class="sr-only"/></label>
      <span class="text-xs text-slate-400 truncate">${bk.file ? esc(bk.file) : 'No file chosen'}</span></div>
      ${bk.err && bk.errAt === 'rs' ? `<p class="mt-3 text-sm text-red-400" role="alert">${esc(bk.err)}</p>` : ''}
      ${sm ? `<div class="mt-4"><div class="text-sm text-slate-300">Backup from <b>${esc(new Date(sm.at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }))}</b></div>
        <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">${stat(sm.projects, 'Projects')}${stat(sm.invoices, 'Invoices')}${stat(sm.customers, 'Customers')}${stat(sm.quotes, 'Quotations')}${stat(sm.messages, 'Chat messages')}${stat(sm.portals, 'Portal pages')}</div>
        <div class="mt-4 flex flex-wrap gap-3"><button data-act="bkgo" ${bk.busy ? 'disabled' : ''} class="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white disabled:opacity-60">${bk.busy === 'rs' ? 'Restoring... ' + esc(bk.prog || '') : 'Restore this backup'}</button>
        <button data-act="bkclr" ${bk.busy ? 'disabled' : ''} class="px-5 py-3 rounded-xl glass text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-60">Cancel</button></div></div>` : ''}</div>`;
  },
  settings() {
    return `<form data-f data-form="prof" class="${card} max-w-xl space-y-4"><div class="font-bold">Profile</div>
      <label class="block text-sm font-medium text-slate-300">Display name<input name="name" maxlength="40" value="${esc(U.displayName || '')}" class="field mt-1.5" placeholder="Your name"/></label>
      <label class="block text-sm font-medium text-slate-300">Email<input value="${esc(U.email)}" disabled class="field mt-1.5 opacity-60"/></label>
      <button class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white">Save changes</button></form>
      <div data-f class="${card} max-w-xl mt-4 space-y-3"><div class="font-bold">Security &amp; data</div>
      <button data-act="rpw" class="block text-sm font-semibold text-brand-400 hover:text-white">Email me a password reset link</button>
      ${PORTAL ? '' : '<button data-act="reset" class="block text-sm font-semibold text-pink">Reset sample data</button>'}</div>`;
  }
};

function paint(anim) {
  const v = $('#view'), top = v.scrollTop;
  v.innerHTML = views[view]();
  const prh = v.querySelector('#prHost'); if (prh) prh.replaceWith(prUI());
  const cth = v.querySelector('#ctHost'); if (cth) cth.replaceWith(ctUI());   // the contract form is built once, so nothing typed is lost on a redraw
  const chh = v.querySelector('#chatHost'); if (chh) { chh.replaceWith(chUI()); chMount(); }   // the chat is built once, so a half-typed reply survives redraws
  if (anim) { v.scrollTop = 0; v.querySelectorAll('[data-f]').forEach((el, i) => { el.classList.add('fade-item'); el.style.setProperty('--i', i); }); } else v.scrollTop = top;
  $('#title').textContent = TITLES[view];
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight;
}
const failMsg = (err, what) => {
  console.error(what, err);
  const c = String((err && (err.code || err.message)) || '');
  return /PERMISSION_DENIED/i.test(c) ? 'Blocked by the database rules. Check the Firebase rules for users/$uid/projects.' : 'Could not ' + what + '. ' + c.slice(0, 80);
};
// ---------- smooth in-place updates (no re-render, so the bar and number can animate) ----------
function tween(el, to) {
  const from = el._cur != null ? el._cur : (+el.dataset.v || 0);
  el.dataset.v = to; cancelAnimationFrame(el._r);
  if (from === to) { el._cur = to; el.textContent = to + '%'; return; }
  const t0 = performance.now(), D = 800;
  const step = t => {
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el._cur = from + (to - from) * e; el.textContent = Math.round(el._cur) + '%';
    if (k < 1) el._r = requestAnimationFrame(step);
  };
  el._r = requestAnimationFrame(step);
}
function updateCard(n, p) {
  const s = status(p), v = pct(p);
  n.querySelector('.bar > i').style.width = v + '%';
  tween(n.querySelector('[data-pct]'), v);
  const bd = n.querySelector('[data-badge]'); if (bd.textContent !== s) { bd.textContent = s; bd.className = badgeCls(s); }
  const list = n.querySelector('[data-list]');
  if (list.querySelectorAll('input[data-act="inc"]').length !== p.items.length || [...list.querySelectorAll('label > span')].some((x, i) => x.textContent !== p.items[i].t)) list.innerHTML = listHtml(p);
  n.querySelector('[data-add]').classList.toggle('hidden', !!p.archived);
  list.querySelectorAll('input[data-act="inc"]').forEach(c => {
    const m = p.items[+c.dataset.i]; if (!m) return;
    c.checked = m.d; c.disabled = !!p.archived; c.nextElementSibling.className = spanCls(m);
  });
  const slot = n.querySelector('[data-slot]'), k = slotKey(p);
  if (slot.dataset.k !== k) { slot.dataset.k = k; slot.innerHTML = actHtml(p); }
  const mt = n.querySelector('[data-mt]'), sg = mtSig(p); if (mt && mt.dataset.sig !== sg) { mt.dataset.sig = sg; mt.innerHTML = mtHtml(p); }
}
let rt;
function refresh() {
  if (!document.body.classList.contains('ready')) return;
  if (view === 'overview' || view === 'customers') return paint(false);
  if (view !== 'projects') return;
  const grid = $('#pgrid'); if (!grid) return paint(false);
  clearTimeout(rt);
  if (grid.dataset.all !== projs().map(p => p.id).join(',')) return paint(false);   // a project was added or removed
  const nodes = [...grid.querySelectorAll('[data-pid]')];
  nodes.forEach(n => { const p = findP(n.dataset.pid); if (p) updateCard(n, p); });
  // a card that no longer belongs in this filter leaves after its animation has played
  if (visible().map(p => String(p.id)).join(',') !== nodes.map(n => n.dataset.pid).join(','))
    rt = setTimeout(() => { if (view === 'projects') paint(false); }, 1000);
}
let goT;
function go(v) {
  closeMenu(); closeNotif(); invOpen = false; invEdit = null; subOpen = false; subEdit = null; scOpen = false; scEdit = null; view = v; if (v !== 'backup' && !bk.busy) { bk.err = ''; bk.note = ''; }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const el = $('#view'); clearTimeout(goT);
  el.style.transition = 'opacity .16s ease'; el.style.opacity = '0';
  goT = setTimeout(() => { paint(true); el.style.opacity = '1'; }, 170);
}

// ---------- contract maker ----------
// Fill in the details on the left; the contract is written on the right and can be downloaded as a PDF.
// Nothing is stored in the database: the form lives in this page until it is reset or the dashboard is closed.
const CT_DEV = { name: 'Ethan Montera', biz: 'EM Development', addr: 'Cebu City, Philippines, 6000', email: 'emdevelopmentph@gmail.com', home: 'Clavano Street, Escario, Cebu City, Cebu, Philippines', pemail: 'emdevelopmentph@gmail.com', phone: '(+63) 920 501 8789', bank: 'Bank of the Philippine Islands (BPI)', acct: 'Ethan Montera', num: '1019235676' };
// Contract font. Put the font files in a "fonts" folder next to this file (fonts/Braveold-Regular.ttf and, if you have it, fonts/Braveold-Bold.ttf).
// If a file is missing the contract falls back to the normal font, so nothing breaks.
const CT_FONT = { family: 'Braveold', regular: 'fonts/Braveold-Regular.ttf', bold: 'fonts/Braveold-Bold.ttf' };
const ctFontUrl = f => new URL(f, import.meta.url).href;
let ctFontCss = null;
function ctFontPreview() {   // makes the on-screen preview use the same font
  if (ctFontCss) return; ctFontCss = document.createElement('style');
  ctFontCss.textContent = `@font-face{font-family:'${CT_FONT.family}';src:url('${ctFontUrl(CT_FONT.regular)}');font-weight:400;font-display:swap}@font-face{font-family:'${CT_FONT.family}';src:url('${ctFontUrl(CT_FONT.bold)}');font-weight:700;font-display:swap}`;
  document.head.appendChild(ctFontCss);
}
const ctB64 = buf => { const u = new Uint8Array(buf); let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(b); };
async function ctFontLoad(doc) {   // returns { normal, bold } = jsPDF family names to use
  const out = { normal: 'helvetica', bold: 'helvetica', ok: false };
  const add = async (file, style, vfs) => {
    try {
      const r = await fetch(ctFontUrl(file)); if (!r.ok) return false;
      doc.addFileToVFS(vfs, ctB64(await r.arrayBuffer())); doc.addFont(vfs, CT_FONT.family, style); return true;
    } catch (e) { return false; }
  };
  const reg = await add(CT_FONT.regular, 'normal', 'ct-regular.ttf');
  if (reg) { out.normal = CT_FONT.family; out.ok = true; out.bold = CT_FONT.family; if (await add(CT_FONT.bold, 'bold', 'ct-bold.ttf')) out.boldOk = true; }
  return out;
}
const ctToday = () => dstr(new Date());
const ctBlank = () => ({ cust: '', name: '', company: '', email: '', gender: '', addr: '', type: 'business website', scope: '', deliver: '', price: '', build: 'code', days: 20, revs: 3, support: 4, city: 'Cebu City', extra: '', date: ctToday() });
let CT = ctBlank(), ctEl = null;
const ctLines = t => String(t || '').split(/\r?\n/).map(x => x.replace(/^\s*[-*\u2022]\s*/, '').trim()).filter(Boolean);
// the contract as data, so the preview and the PDF always say exactly the same thing
function ctBuild(c) {
  // fixed schedule: 40% down, 30% when every inclusion is done (before revisions), 30% on final approval
  const price = Math.max(0, +c.price || 0), cents = Math.round(price * 100), p1 = Math.round(cents * 0.4), p2 = Math.round(cents * 0.3), p3 = cents - p1 - p2;
  const hard = c.build !== 'builder', amt = n => price > 0 ? ' (' + pdfMoney(n / 100) + ')' : '';
  const days = Math.max(1, Math.round(+c.days) || 1), revs = Math.max(0, Math.round(+c.revs) || 0), sup = Math.max(0, Math.round(+c.support) || 0);
  const when = d => (d ? fmtD(d) : '____________');
  const client = (c.name || '____________').trim(), co = (c.company || '').trim();
  const clientFull = client + (co ? ' of ' + co : '') + (c.addr ? ', ' + c.addr.trim() : '');
  const type = (c.type || 'website').trim();
  const S = [];
  S.push({ h: '1. Scope of Work', p: ['The Developer agrees to design and build a ' + type + ' for the Client (the "Project"), as described below.'].concat(ctLines(c.scope).length ? ctLines(c.scope) : ['The detailed scope will be agreed in writing between both parties.']) });
  const dl = ctLines(c.deliver);
  S.push({ h: '2. Deliverables', p: [dl.length ? 'The Developer will deliver the following:' : 'The deliverables are those described in the Scope of Work.'], l: dl });
  S.push({ h: '3. Timeline', p: ['This Agreement will start upon the down payment having been made. Once it has, the Project is expected to be finished within ' + days + ' business day' + (days === 1 ? '' : 's') + '. The timeline depends on the Client providing content, approvals and feedback on time. Delays on the Client\'s side move the dates by the same amount.'] });
  const pay = [];
  pay.push('Down payment: 40%' + amt(p1) + ', due before work begins.');
  pay.push('Second payment: 30%' + amt(p2) + ', due once all the inclusions listed in this Agreement are completed and before ' + (revs > 0 ? 'the revision rounds begin.' : 'the Client\'s final review.'));
  pay.push('Final payment: 30%' + amt(p3) + ', due once the Client approves the finished website, before it is launched or the final files are handed over.');
  const bankLines = ['Bank Name: ' + CT_DEV.bank, 'Account Number: ' + CT_DEV.num, 'Account Name: ' + CT_DEV.acct], payNote = ['The Developer may pause work while any payment is overdue.'];
  if (hard) payNote.push('Because this website is hard-coded (custom code), its source code stays locked and is released to the Client only after the final 30% payment has been fully settled.');
  S.push({ h: '4. Fees and Payment', p: ['The total fee for the Project is ' + (price > 0 ? pdfMoney(price) : '____________') + ', paid in three parts:'], l: pay, p2: ['Payments are made to the following bank account:'], k: bankLines, p3: payNote });
  S.push({ h: '5. Late Payment Penalty', p: ['In the event the Client fails to make any payment specified in this Agreement, a penalty of PHP 1,000 per day shall be imposed until full payment is received. Failure to settle the balance within 30 days of the due date may result in project suspension or termination at the discretion of the Developer.', 'In the event the Client fails to settle the balance within 30 days, the Developer has the right to delete all files for the Client\'s website.'] });
  S.push({ h: '6. Revisions', p: [revs > 0 ? 'The fee includes up to ' + revs + ' round' + (revs === 1 ? '' : 's') + ' of revisions within the agreed scope. Revisions start after the second payment is received. Extra revisions, or changes outside the scope, are quoted and billed separately.' : 'Revisions are not included in the fee. Any changes after approval are quoted and billed separately.'] });
  S.push({ h: '7. Client Responsibilities', p: ['7.1 The Client will provide the text, images, logos and other materials needed for the Project, give feedback and approvals within a reasonable time, and confirms that it owns or has permission to use everything it provides.',
    '7.2 Liability of the Client: The Client shall be responsible for providing accurate and complete information and materials necessary for the Developer to complete the Project. The Developer shall not be liable for any delays or failures in performance resulting from the Client\'s failure to provide such information or materials. The Client agrees to use the website in compliance with all applicable laws and regulations and shall be solely responsible for any content posted on the website.'] });
  S.push({ h: '8. Refund', p: [
    'In the event that the project\'s completion status is at or below 80%, the Client is entitled to a partial refund equivalent to 50% of the total paid amount. This refund will be issued within 7 to 14 days from the formal request made by the Client.',
    'However, if the project\'s completion status exceeds 80%, no refund will be granted to the Client. The 80% mark will be the completed integration of ' + (dl.length ? 'the following deliverables, being the first 80% of the deliverables listed in Section 2:' : 'the deliverables described in the Scope of Work.')],
    l: dl.slice(0, Math.ceil(dl.length * 4 / 5)),
    p2: ['The Client acknowledges that reaching the 80% completion milestone is indicative of substantial progress, and as such, the project is considered to have achieved a significant level of completion. The Client further understands and agrees that the absence of a refund beyond the 80% completion threshold is a reflection of the advanced stage of the project and the resources invested up to that point. If the total amount paid is below PHP 3,000, no refund will be made.',
      'Any refund request must be submitted in writing to ' + CT_DEV.email + ' and will be processed in accordance with the terms outlined herein.'] });
  S.push({ h: '9. Design Approval and Change Policy', p: [
    'If the Client already has a design, this section is not applicable.',
    '9.1 Design Approval: Upon completion of the design or mock-up user interface ("UI"), the Developer will present the design to the Client for approval. The Client shall have a period of three (3) business days to review the design and provide either approval or request changes.',
    '9.2 No Changes After Approval: Once the Client approves the design or mock-up UI, no further changes will be made without additional charges, except for any errors or issues that are the fault of the Developer.',
    '9.3 Change Policy: If the Client wishes to make changes to the approved design after the approval stage, the Developer reserves the right to charge an additional fee of PHP 1,000 per page affected by the requested changes. This fee will be added to the final payment.',
    '9.4 Notification of Changes: The Client must notify the Developer in writing of any desired changes to the approved design, specifying the exact modifications required. The Developer will then assess the scope of the changes and inform the Client of any applicable charges before proceeding with the alterations.',
    'If the changes contain inclusions that are not within this Agreement, the Developer is entitled to request an additional payment in writing, depending on the features added.'] });
  S.push({ h: '10. Revisions Policy', p: [
    '10.1 The Client is allowed up to two (2) minor revision meetings at no additional cost. Minor revisions include the following:'],
    l: ['Texts', 'Alignment', 'Color', 'Images'],
    p2: ['10.2 Beyond the third revision, additional changes will incur the following charges:'],
    l2: ['PHP 5,000 per meeting for minor revisions.', 'PHP 10,000 per meeting for major revisions.'],
    p3: ['10.3 Revisions must be communicated in writing, with clear details of the requested changes. The Developer will classify the revisions as minor or major based on their complexity and scope.'] });
  S.push({ h: '11. Ownership', p: ['After full payment, ownership of the finished website design and custom code passes to the Client.' + (hard ? ' The source code is unlocked and handed over only when the final 30% payment is settled.' : '') + ' Until then, the Developer keeps all rights to the work. Third-party tools, fonts and libraries stay under their own licences. The Developer may show the finished work in its portfolio unless the Client asks otherwise in writing.'] });
  S.push({ h: '12. Hosting, Maintenance and Support', p: [sup > 0 ? 'After launch, the Developer provides ' + sup + ' week' + (sup === 1 ? '' : 's') + ' of free maintenance and fixes for problems in the delivered work. After that, maintenance, hosting and domain renewals are billed separately at agreed rates.' : 'Hosting, domain and maintenance are not included. They are billed separately if the Client asks for them.'] });
  S.push({ h: '13. Confidentiality', p: ['Both parties will keep the other\'s private business information confidential and will not share it with anyone else without permission, unless the law requires it.'] });
  S.push({ h: '14. Term and Termination', p: [
    '14.1 This Agreement shall commence on the Effective Date, which is the date the down payment is made, and shall continue until the completion of the engagement unless terminated earlier in accordance with the provisions below.',
    '14.2 Either party may terminate this Agreement in the event of a material breach by the other party, subject to a written notice of thirty (30) days specifying the breach and providing an opportunity for remediation.',
    '14.3 All information (for example: username, email and password) will be strictly confidential and should NOT be discussed outside the conversation of the website owner.',
    '14.4 All the credentials will be owned by the Client.',
    '14.5 If this Agreement is terminated, the Client pays for all work completed up to the date of termination, and any refund is governed solely by Section 8 (Refund). If the Developer ends this Agreement without good reason, the Developer refunds the part of the down payment for work not yet done.'] });
  S.push({ h: '15. Limitation of Liability', p: ['The Developer is not liable for indirect losses, such as lost profits or lost data. The Developer\'s total liability under this Agreement is limited to the fees the Client has paid.'] });
  S.push({ h: '16. Liability of the Client', p: ['The Client shall be responsible for providing accurate and complete information and materials necessary for the Developer to complete the Project. The Developer shall not be liable for any delays or failures in performance resulting from the Client\'s failure to provide such information or materials. The Client agrees to use the website in compliance with all applicable laws and regulations and shall be solely responsible for any content posted on the website.'] });
  S.push({ h: '17. Indemnification', p: ['The Client agrees to indemnify, defend, and hold harmless the Developer, its affiliates, and their respective officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising out of or in connection with:'] });
  S.push({ h: '18. Force Majeure', p: ['Neither party shall be liable for any failure or delay in performance under this Agreement due to circumstances beyond its reasonable control, including, but not limited to, acts of God, war, terrorism, natural disasters, strikes, or interruptions in telecommunications or internet services.', 'By including these provisions, both parties acknowledge and agree to their respective liabilities and the terms of indemnification, ensuring clarity and mutual understanding in the contractual relationship.'] });
  const ex = ctLines(c.extra);
  if (ex.length) S.push({ h: '19. Additional Terms', p: ex });
  const mn = ex.length ? 20 : 19;
  S.push({ h: mn + '. Miscellaneous', p: [
    mn + '.1 Notices: All notices, requests, demands, and other communications under this Agreement shall be in writing and shall be deemed to have been duly given if delivered personally, sent by certified mail, return receipt requested, or by a recognized courier service, to the respective parties at their addresses provided in this Agreement.',
    mn + '.2 Amendments: No amendment, modification, or waiver of any provision of this Agreement shall be effective unless it is in writing and signed by both parties. Any such amendment, modification, or waiver shall be effective only in the specific instance and for the specific purpose for which it is given.',
    mn + '.3 Entire Agreement: This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter.',
    mn + '.4 Severability: If any provision of this Agreement is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall be enforced to the fullest extent under law.',
    mn + '.5 Waiver: The failure of either party to enforce any right or provision of this Agreement shall not be deemed a waiver of such right or provision.',
    mn + '.6 Assignment: Neither party may assign its rights or delegate its obligations under this Agreement without the prior written consent of the other party.',
    mn + '.7 Governing Law: This Agreement shall be governed by and construed in accordance with the laws of the Philippines, without regard to its conflict of law principles. The parties will first try to settle any dispute through good-faith discussion, and if that fails, in the proper courts of ' + ((c.city || '').trim() || 'Cebu City') + '.',
    mn + '.8 Headings: The headings in this Agreement are for convenience of reference only and shall not affect in any way the meaning or interpretation of this Agreement.',
    'By including these miscellaneous provisions, the parties ensure clarity regarding notifications, potential amendments, the comprehensive nature of the agreement, and other crucial elements, thereby fostering a clear and professional relationship.'] });
  S.push({ h: (mn + 1) + '. Signatures', p: [
    'This Agreement, once signed, including by electronic or digital signature, shall be binding upon and inure to the benefit of the parties hereto and their respective successors and assigns. Electronic signatures shall have the same legal effect and enforceability as handwritten signatures.',
    'IN WITNESS WHEREOF, the parties have duly signed this Agreement on this ________________ day of ________________, at ___________, Philippines.'] });
  const blank = '____________', cEmail = (c.email || '').trim(), nb = x => String(x).replace(/\*/g, '');   // nb: strip * so typed text can never turn bold
  const pre = [
    { t: 'KNOW ALL MEN BY THESE PRESENTS:' },
    { t: 'This CONTRACT FOR A PIECE OF WORK (the "Agreement") is executed and entered into by and between:' },
    { t: '**' + nb(client || blank) + (co ? ' of ' + nb(co) : '') + ',** of legal age, ' + (c.gender === 'Female' ? 'Filipina' : 'Filipino') + ', and a resident of ' + nb((c.addr || '').trim() || blank) + ' and with email address ' + nb(cEmail || blank) + ', hereinafter collectively referred to as the "**CLIENT**".' },
    { t: '-and-', c: 1 },
    { t: '**' + CT_DEV.name + ',** of legal age, Filipino, Single and a resident of ' + CT_DEV.home + ' and with email address ' + CT_DEV.pemail + ', hereinafter collectively referred to as the "**THE DEVELOPER**".' },
    { t: 'WITNESSETH:', c: 1 },
    { t: '**WHEREAS,** the DEVELOPER is a professional internet web design and development firm of good standing that is engaged in the business of creating internet websites;', i: 1 },
    { t: '**WHEREAS,** the CLIENT is in need of a company that is engaged in the business of website creation and is willing to enter into this contract;', i: 1 },
    { t: '**NOW THEREFORE**, by virtue of this contract of piece of work, the parties herein agreed to the following terms and conditions.', i: 1 }];
  return { title: 'Contract for a Piece of Work', date: c.date, client, co,
    pre,
    sections: S, sign: [{ role: 'Developer', name: CT_DEV.name, sub: CT_DEV.biz }, { role: 'Client', name: c.name.trim() || '', sub: co }] };
}
function ctHtml(d) {
  ctFontPreview();
  const bd = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const li = a => a && a.length ? `<ul class="list-disc pl-10 ml-3 mt-1.5 space-y-1 text-justify">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const kl = a => a && a.length ? `<div class="mt-1.5 ml-6">${a.map(x => `<div>${esc(x)}</div>`).join('')}</div>` : '';
  const ps = a => (a || []).map(x => `<p class="mt-1.5 text-justify">${esc(x)}</p>`).join('');
  return `<div class="bg-white text-slate-800 rounded-xl p-5 sm:p-8 shadow-lg text-[13px] leading-relaxed" style="font-family:'Braveold',Georgia,'Times New Roman',serif">
    <div class="text-center"><div class="font-bold text-base text-slate-800">EM Development</div><div class="text-xs text-slate-600">${esc(CT_DEV.addr)}</div><div class="text-xs text-slate-600">${esc(CT_DEV.phone)} | ${esc(CT_DEV.email)}</div><h2 class="mt-5 text-lg sm:text-xl font-bold uppercase tracking-wide text-[#0e3080]">${esc(d.title)}</h2></div>
    ${d.pre.map(x => `<p class="mt-4 ${x.c ? 'text-center' : 'text-justify'}"${x.i ? ' style="text-indent:2.5rem"' : ''}>${bd(x.t)}</p>`).join('')}
    ${d.sections.map(s => `<div class="mt-4"><h3 class="font-bold text-[#0e3080]">${esc(s.h)}</h3>${ps(s.p)}${li(s.l)}${ps(s.p2)}${kl(s.k)}${li(s.l2)}${ps(s.p3)}</div>`).join('')}
    <p class="mt-5 text-justify">By signing below, both parties agree to the terms of this Agreement.</p>
    <div class="mt-8 grid grid-cols-2 gap-6">${d.sign.map(g => `<div><div class="h-10 border-b border-slate-400"></div><div class="mt-1.5 font-bold">${esc(g.name || ' ')}</div><div class="text-xs text-slate-500">${esc(g.role)}${g.sub ? ' &middot; ' + esc(g.sub) : ''}</div><div class="mt-3 text-xs text-slate-500">Date: ______________</div></div>`).join('')}</div>
  </div>`;
}
const pdfSafe = t => String(t).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\u00A0/g, ' ').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF]/g, '?');
async function ctPdf(c) {
  const d = ctBuild(c), JsPDF = await loadPdf(), doc = new JsPDF({ unit: 'mm', format: 'a4' }), FF = await ctFontLoad(doc);
  const W = 210, H = 297, M = 20, CW = W - 2 * M, NAVY = [14, 48, 128], TXT = [38, 42, 58], MUTED = [112, 118, 136];
  const ink = k => doc.setTextColor(k[0], k[1], k[2]), font = (st, sz) => { doc.setFont(st === 'bold' ? FF.bold : FF.normal, FF.ok && !(st === 'bold' && !FF.boldOk) ? st : (FF.ok ? 'normal' : st)); doc.setFontSize(sz); };
  let y = 0;
  const need = h => { if (y + h > H - 22) { doc.addPage(); y = 24; } };
  // paragraph writer: wraps by hand so lines can be justified (last line stays left) and **bold** runs and a first-line indent are supported
  const rich = (t, o = {}) => {
    const ind = o.ind || 0, first = o.first || 0, gap = o.gap == null ? 1.5 : o.gap, words = []; let glue = false;
    String(t).split('**').forEach((seg, i) => (pdfSafe(seg).match(/\s+|\S+/g) || []).forEach(tok => {
      if (/^\s/.test(tok)) { glue = false; return; }
      const part = { w: tok, b: i % 2 === 1 };
      if (glue && words.length) words[words.length - 1].push(part); else words.push([part]);
      glue = true;
    }));
    const wid = w => w.reduce((a, p) => { font(p.b ? 'bold' : 'normal', 10); return a + doc.getTextWidth(p.w); }, 0);
    font('normal', 10); const sp = doc.getTextWidth(' ');
    const lines = []; let cur = [], cw = 0, k = 0;
    words.forEach(w => {
      const ww = wid(w), avail = CW - ind - (k === 0 ? first : 0);
      if (cur.length && cw + sp + ww > avail) { lines.push(cur); cur = []; cw = 0; k++; }
      cw += (cur.length ? sp : 0) + ww; cur.push({ w, ww });
    });
    if (cur.length) lines.push(cur);
    lines.forEach((ln, li) => {
      need(5); const off = li === 0 ? first : 0, avail = CW - ind - off, last = li === lines.length - 1;
      const tot = ln.reduce((a, x) => a + x.ww, 0), gapW = (last || ln.length < 2) ? sp : (avail - tot) / (ln.length - 1);
      if (li === 0 && o.dot) { doc.setFillColor(TXT[0], TXT[1], TXT[2]); doc.circle(M + ind - 4.5, y - 1.2, 0.6, 'F'); }
      let x = M + ind + off; ink(TXT);
      ln.forEach(wd => { wd.w.forEach(p => { font(p.b ? 'bold' : 'normal', 10); doc.text(p.w, x, y); x += doc.getTextWidth(p.w); }); x += gapW; });
      y += 5;
    });
    y += gap;
  };
  const para = (t, gap = 1.5) => rich(t, { gap });
  const bullet = t => rich(t, { ind: 12, gap: 0.8, dot: 1 });
  // header band and title
  font('bold', 14); ink(TXT); doc.text('EM Development', W / 2, 18, { align: 'center' });
  font('normal', 9.5); doc.text(pdfSafe(CT_DEV.addr), W / 2, 24, { align: 'center' }); doc.text(pdfSafe(CT_DEV.phone + ' | ' + CT_DEV.email), W / 2, 29.5, { align: 'center' });
  y = 46; font('bold', 17); ink(NAVY); doc.text(d.title.toUpperCase(), W / 2, y, { align: 'center' });
  y += 11; d.pre.forEach(x => { if (x.c) { need(9); font('normal', 10); ink(TXT); doc.text(pdfSafe(x.t), W / 2, y, { align: 'center' }); y += 9; } else rich(x.t, { first: x.i ? 10 : 0, gap: 4 }); });
  d.sections.forEach(s => {
    need(22); y += 3; font('bold', 11); ink(NAVY); doc.text(pdfSafe(s.h), M, y); y += 6;
    (s.p || []).forEach(t => para(t)); (s.l || []).forEach(bullet); (s.p2 || []).forEach(t => para(t)); (s.k || []).forEach(t => rich(t, { ind: 6, gap: 0.5 })); if ((s.k || []).length) y += 1.5; (s.l2 || []).forEach(bullet); (s.p3 || []).forEach(t => para(t));
  });
  need(70); y += 4; para('By signing below, both parties agree to the terms of this Agreement.', 6);
  const cols = [M, W / 2 + 8], cw = W / 2 - M - 8; y += 12;
  d.sign.forEach((g, i) => {
    doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2]); doc.setLineWidth(0.3); doc.line(cols[i], y, cols[i] + cw, y);
    font('bold', 10); ink(TXT); doc.text(pdfSafe(g.name || ' '), cols[i], y + 6);
    font('normal', 9); ink(MUTED); doc.text(pdfSafe(g.role + (g.sub ? ' - ' + g.sub : '')), cols[i], y + 11); doc.text('Date: ____________________', cols[i], y + 20);
  });
  // footer on every page
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setDrawColor(200, 204, 216); doc.setLineWidth(0.2); doc.line(M, H - 16, W - M, H - 16); font('normal', 8); ink(MUTED); doc.text('EM Development - ' + d.title, M, H - 11); doc.text('Page ' + i + ' of ' + n, W - M, H - 11, { align: 'right' }); }
  const slug = (d.client || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client';
  doc.save('contract-' + slug + '-' + (c.date || ctToday()) + '.pdf');
}
function ctUI() {
  if (!ctEl) {
    const lbl = 'block text-sm font-medium text-slate-300', fld = 'field mt-1.5';
    ctEl = document.createElement('div'); ctEl.className = 'grid lg:grid-cols-2 gap-4 items-start';
    ctEl.innerHTML = `
      <form id="ctForm" novalidate class="${card} space-y-5" data-f>
        <div><h2 class="text-lg font-extrabold tracking-tight">Contract details</h2><p class="mt-1 text-sm text-slate-400">Fill these in and the contract is written for you in the preview. Fields marked * are required before you can download the PDF.</p></div>
        <fieldset class="space-y-3.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Client</legend>
          <label class="${lbl}">Pick an existing customer<select name="cust" class="${fld}"></select></label>
          <div class="grid sm:grid-cols-2 gap-3.5">
            <label class="${lbl}">Client name *<input name="name" maxlength="80" autocomplete="off" class="${fld}"/></label>
            <label class="${lbl}">Company (optional)<input name="company" maxlength="80" autocomplete="off" class="${fld}"/></label>
            <label class="${lbl}">Email *<input name="email" type="email" maxlength="120" autocomplete="off" class="${fld}"/></label>
            <label class="${lbl}">Gender *<select name="gender" class="${fld}"><option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
          </div>
          <label class="${lbl}">Address *<input name="addr" maxlength="160" autocomplete="off" class="${fld}"/></label>
        </fieldset>
        <fieldset class="space-y-3.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Project</legend>
          <label class="${lbl}">What are you building? *<input name="type" maxlength="80" placeholder="e.g. business website, online store" class="${fld}"/></label>
          <label class="${lbl}">Scope of work *<textarea name="scope" rows="4" maxlength="1500" placeholder="Describe what the website will do and which pages it has." class="${fld} resize-y"></textarea></label>
          <label class="${lbl}">Deliverables (one per line) *<textarea name="deliver" rows="4" maxlength="1000" placeholder="Home, About and Contact pages&#10;Mobile-friendly design&#10;Contact form" class="${fld} resize-y"></textarea></label>
        </fieldset>
        <fieldset class="space-y-3.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Price and schedule</legend>
          <div class="grid grid-cols-2 gap-3.5">
            <label class="${lbl}">Total price (PHP) *<input name="price" type="number" inputmode="decimal" min="0" step="0.01" class="${fld}"/></label>
            <label class="${lbl}">How is it built?<select name="build" class="${fld}"><option value="code">Hard-coded (custom code)</option><option value="builder">Website builder / CMS</option></select></label>
            <p class="col-span-2 -mt-1 text-xs text-slate-400">Payments are fixed at 40% down, 30% when all inclusions are done (before revisions) and 30% on final approval. Hard-coded sites also get the source code unlock clause.</p>
            <label class="${lbl}">Business days to finish *<input name="days" type="number" inputmode="numeric" min="1" step="1" class="${fld}"/></label>
            <label class="${lbl}">Revision rounds *<input name="revs" type="number" inputmode="numeric" min="0" step="1" class="${fld}"/></label>
            <label class="${lbl} col-span-2">Free support (weeks) *<input name="support" type="number" inputmode="numeric" min="0" step="1" class="${fld}"/></label>
          </div>
        </fieldset>
        <fieldset class="space-y-3.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Other</legend>
          <div class="grid sm:grid-cols-2 gap-3.5">
            <label class="${lbl}">Contract date *<input name="date" type="date" class="${fld}"/></label>
            <label class="${lbl}">City for legal matters *<input name="city" maxlength="60" class="${fld}"/></label>
          </div>
          <label class="${lbl}">Additional terms (one per line, optional)<textarea name="extra" rows="3" maxlength="1000" class="${fld} resize-y"></textarea></label>
        </fieldset>
        <button type="button" data-ctreset class="w-full sm:w-auto px-5 py-2.5 rounded-xl glass text-sm font-semibold text-slate-300 hover:text-white transition">Clear form</button>
      </form>
      <div class="lg:sticky lg:top-0 space-y-3" data-f>
        <div class="${card} !p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"><div class="min-w-0"><div class="font-bold">Contract preview</div><p data-ctmsg class="text-sm text-slate-400" role="status" aria-live="polite">Updates as you type.</p></div>
          <button type="button" data-ctpdf class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30 inline-flex items-center justify-center gap-2">Download PDF</button></div>
        <div data-ctprev class="lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto rounded-xl"></div>
      </div>`;
    const f = ctEl.querySelector('#ctForm'), prev = ctEl.querySelector('[data-ctprev]'), msg = ctEl.querySelector('[data-ctmsg]'), btn = ctEl.querySelector('[data-ctpdf]');
    const write = () => { ['name', 'company', 'email', 'gender', 'addr', 'type', 'scope', 'deliver', 'price', 'build', 'days', 'revs', 'support', 'date', 'city', 'extra'].forEach(k => { f.elements[k].value = CT[k]; }); f.elements.cust.value = CT.cust; };
    const read = () => { ['name', 'company', 'email', 'gender', 'addr', 'type', 'scope', 'deliver', 'price', 'build', 'days', 'revs', 'support', 'date', 'city', 'extra'].forEach(k => { CT[k] = f.elements[k].value; }); CT.cust = f.elements.cust.value; };
    ctEl._draw = () => { prev.innerHTML = ctHtml(ctBuild(CT)); };
    ctEl._sync = () => {   // keep the customer list current without touching what has been typed
      const s = f.elements.cust, v = s.value;
      s.innerHTML = '<option value="">Type the details below</option>' + K.map(k => `<option value="${esc(k.id)}">${esc(k.name)}${k.company ? ' - ' + esc(k.company) : ''}</option>`).join('');
      s.value = K.some(k => k.id === v) ? v : '';
    };
    f.addEventListener('input', () => { read(); msg.textContent = 'Updates as you type.'; ctEl._draw(); });
    f.addEventListener('change', e => {
      if (e.target.name !== 'cust') return;
      const k = K.find(x => x.id === e.target.value);
      if (k) { CT.name = k.name; CT.company = k.company; CT.email = k.email; write(); }
      read(); ctEl._draw();
    });
    ctEl.querySelector('[data-ctreset]').addEventListener('click', () => { CT = ctBlank(); write(); ctEl._sync(); ctEl._draw(); msg.textContent = 'Form cleared.'; });
    btn.addEventListener('click', async () => {
      read();
      const REQ = [['name', 'the client name'], ['email', 'the client email'], ['gender', 'the client gender'], ['addr', 'the client address'], ['type', 'what you are building'], ['scope', 'the scope of work'], ['deliver', 'the deliverables'], ['price', 'the total price'], ['days', 'the business days to finish'], ['revs', 'the revision rounds'], ['support', 'the free support weeks'], ['date', 'the contract date'], ['city', 'the city for legal matters']];
      for (const [k, n] of REQ) { if (!String(CT[k] == null ? '' : CT[k]).trim()) { msg.textContent = 'Enter ' + n + ' first.'; f.elements[k].focus(); return; } }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CT.email.trim())) { msg.textContent = 'Enter a valid client email.'; f.elements.email.focus(); return; }
      if (!(+CT.price > 0)) { msg.textContent = 'Enter a total price above zero.'; f.elements.price.focus(); return; }
      if (!(+CT.days >= 1)) { msg.textContent = 'Business days to finish must be at least 1.'; f.elements.days.focus(); return; }
      btn.disabled = true; const old = btn.textContent; btn.textContent = 'Preparing...'; msg.textContent = 'Creating your PDF...';
      try { await ctPdf(CT); msg.textContent = 'Contract downloaded.'; toast('Contract downloaded'); }
      catch (err) { console.error('contract pdf', err); msg.textContent = 'Could not create the PDF. Check your connection and try again.'; }
      btn.disabled = false; btn.textContent = old;
    });
    ctEl._write = write;
  }
  ctEl._write(); ctEl._sync(); ctEl._draw();
  return ctEl;
}

// ---------- proposal maker ----------
// Same layout and wording as the "Service Proposal" template: Courier type, a company header on every page,
// numbered sections, a package/price menu, payment terms and an acceptance page. Pick what to include on the left;
// the proposal is written on the right and downloads as "Service Proposal for <Full Name>.pdf".
// Nothing is stored in the database: the form lives in this page until it is cleared or the dashboard is closed.
const prFmt = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v); };
const PR_ADD = ['pages', 'host', 'book', 'ecom', 'pwa'];   // add-ons; everything else is a website service
const PR_PK = [['one', 'One-Page Website', 3499], ['biz', 'Business Website', 5999], ['shop', 'E-Commerce Website', 24799], ['blog', 'Blog Website', 8999], ['bsite', 'Booking Website', 8999], ['pages', 'Additional Pages (price per page)', 750], ['host', 'Hosting through EM Development (per year)', 3999], ['book', 'Booking System', 4999], ['ecom', 'E-Commerce Integration', 9999], ['pwa', 'Progressive Web App (PWA)', 9999]];
const prBlank = () => { const o = { cust: '', cur: 'PHP', salute: 'Mr.', name: '', company: '', email: '', service: 'Website Development', revs: 2, extra: '', date: ctToday() }; PR_PK.forEach(p => { o['inc_' + p[0]] = true; o['p_' + p[0]] = p[2]; }); return o; };
const prLines = ctLines;
let PR = prBlank(), prEl = null;
const PR_KEYS = ['cur', 'salute', 'name', 'company', 'email', 'service', 'revs', 'extra', 'date'];
const PR_CO = { name: 'EM Development Solutions', addr: 'Cebu City, Cebu, Philippines, 6000', phone: '(+63) 920 501 8789', email: 'emdevelopmentph@gmail.com' };
// the proposal as data (blocks), so the preview and the PDF always say exactly the same thing. cur = '₱' on screen, 'PHP ' in the PDF
function prBuild(c, pdf) {
  const usd = c.cur === 'USD', cur = usd ? '$ ' : (pdf ? '\u00A4' : '₱ ');
  const on = k => PR_ADD.includes(k) || !!c['inc_' + k], pr = k => Math.max(0, +c['p_' + k] || 0), m = n => cur + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const name = (c.name || '').trim() || '____________', co = (c.company || '').trim(), org = co || name, sal = (c.salute || '').trim();
  const rep = (sal ? sal + ' ' : '') + name, email = (c.email || '').trim();
  const revs = Math.max(1, Math.round(+c.revs) || 2), revW = revs + ' Minor Revision' + (revs === 1 ? '' : 's');
  const service = (c.service || '').trim() || 'Website Development';
  const B = []; let n = 0;
  const h1 = (x, br) => { n++; B.push({ t: 'h1', x: n + '. ' + x.toUpperCase(), br }); return n; };
  const h2 = x => B.push({ t: 'h2', x }), h3 = x => B.push({ t: 'h3', x }), p = x => B.push({ t: 'p', x }), ul = a => B.push({ t: 'ul', a }), ol = a => B.push({ t: 'ol', a }), kv = (k, v) => B.push({ t: 'kv', k, v });
  const L = i => String.fromCharCode(65 + i);
  // cover
  B.push({ t: 'title', x: service.toUpperCase() + ' PROPOSAL' });
  B.push({ t: 'sub', x: 'Professional ' + service + ' Services' });
  kv('Prepared for', org); if (co) kv('Client Representative', rep); if (email) kv('Email', email);
  B.push({ t: 'gap' }); kv('Prepared by', PR_CO.name); kv('Proposal Date', c.date ? fmtD(c.date) : '____________'); B.push({ t: 'rule' });
  // 1
  h1('Project Overview', false);
  p('Dear ' + rep + ',');
  p('Thank you for considering ' + PR_CO.name + ' as your ' + service.toLowerCase() + ' partner.');
  p('We are pleased to present this proposal for the development of a professional website for ' + org + '.');
  p('Our goal is to establish a strong online presence for ' + (co ? 'your company' : 'you') + ' through a modern, responsive, and user-friendly website that effectively showcases ' + (co ? "your company's" : 'your') + ' services, projects, and business information.');
  p('We offer flexible website development packages and additional features that can be customized according to ' + (co ? "your company's" : 'your') + ' requirements and business objectives.');
  // 2
  if (on('one') || on('biz') || on('shop') || on('blog') || on('bsite') || on('pages')) {
    h1('Website Development Packages', true); let i = 0;
    if (on('one')) {
      h2(L(i++) + '. ONE-PAGE WEBSITE'); h3(m(pr('one')));
      p('A cost-effective website solution designed to present your business information in a single, professionally designed webpage.');
      h3('Inclusions:'); ul(['Custom website design', 'Company introduction and business overview', 'Services or products section', 'Project or portfolio highlights', 'Contact information', 'Mobile-responsive layout', 'Social media integration', 'Basic Search Engine Optimization (SEO)']);
      kv('Estimated Development Time', 'Less than 24 hours.'); kv('Domain', 'Not included.');
    }
    if (on('biz')) {
      h2(L(i++) + '. BUSINESS WEBSITE'); h3(m(pr('biz')));
      p("A complete multi-page website designed to establish your company's online presence and provide visitors with easy access to important business information.");
      h3('Inclusions:');
      h3('1. Home Page'); ul(['Company introduction', 'Featured services and projects', 'Important business highlights']);
      h3('2. About Page'); ul(['Company background', 'Mission and vision', 'Company information']);
      h3('3. Services / Products / Projects Page'); ul(['Showcase of company services', 'Product or service descriptions', 'Completed and ongoing project portfolio']);
      h3('4. Contact Page'); ul(['Business contact information', 'Customer inquiry form', 'Business location and other contact details']);
      h3('Additional Inclusions:'); ul(['Custom website design', 'Mobile-responsive layout', 'Social media integration', 'Basic Search Engine Optimization (SEO)', 'User-friendly website navigation', 'Free domain registration for the initial year registration period']);
      kv('Estimated Development Time', '5-7 business days.');
    }
    const pkg = (k, title, desc, groups, extra, time) => {
      h2(L(i++) + '. ' + title); h3(m(pr(k))); p(desc); h3('Inclusions:');
      groups.forEach((g, j) => { h3((j + 1) + '. ' + g[0]); ul(g[1]); });
      h3('Additional Inclusions:'); ul(extra); kv('Estimated Development Time', time);
    };
    if (on('shop')) pkg('shop', 'E-COMMERCE WEBSITE', 'A complete online shopping website designed for businesses that want to sell products directly through the internet. Customers can browse products, add items to their shopping cart, and place orders through the website.', [
      ['Home Page', ['Business introduction', 'Featured products', 'Promotional banners', 'Featured categories', 'Special offers and announcements']],
      ['Shop / Product Catalog', ['Product listings', 'Product categories', 'Product descriptions', 'Product images and galleries', 'Product pricing', 'Product search and filtering']],
      ['Product Details Page', ['Individual product information', 'Product images', 'Product variations (if applicable)', 'Stock availability', 'Add-to-cart functionality']],
      ['Shopping Cart', ['Add and remove products', 'Update product quantities', 'Automatic subtotal calculation', 'Order summary']],
      ['Checkout System', ['Customer information form', 'Billing and shipping details', 'Order summary', 'Shipping method selection', 'Payment method integration']],
      ['Customer Account', ['Customer registration and login', 'Customer profile management', 'Order history', 'Order status tracking']],
      ['Order Management Dashboard', ['View and manage customer orders', 'Update order statuses', 'Manage product inventory', 'Add, edit, and remove products', 'Manage product categories', 'View customer information']],
      ['About Page', ['Company background', 'Business information']],
      ['Contact Page', ['Contact information', 'Customer inquiry form', 'Business location']]
    ], ['Mobile-responsive design', 'Custom website design', 'Social media integration', 'Basic Search Engine Optimization (SEO)', 'Secure website configuration', 'Payment method integration, subject to provider availability and requirements'], '10-15 business days.');
    if (on('blog')) pkg('blog', 'BLOG WEBSITE', 'A content-focused website designed for individuals, businesses, and organizations that want to publish articles, share information, and provide valuable content to their audience.', [
      ['Home Page', ['Featured articles', 'Latest blog posts', 'Popular articles', 'Featured categories', 'Search functionality']],
      ['Blog / Articles Page', ['Complete article listings', 'Article categories', 'Article thumbnails', 'Publication dates', 'Author information', 'Pagination for blog posts']],
      ['Individual Blog Post Page', ['Full article content', 'Featured images', 'Author information', 'Publication date', 'Related articles', 'Social media sharing']],
      ['About Page', ['Author or company introduction', 'Website purpose', 'Background information']],
      ['Contact Page', ['Contact information', 'Customer inquiry form', 'Social media links']],
      ['Blog Management Dashboard', ['Create and publish articles', 'Edit and delete blog posts', 'Upload and manage images', 'Manage article categories', 'Save drafts before publishing', 'Manage published and unpublished articles']]
    ], ['Mobile-responsive design', 'Custom website design', 'Basic Search Engine Optimization (SEO)', 'Social media integration', 'User-friendly content management system'], '5-7 business days.');
    if (on('bsite')) pkg('bsite', 'BOOKING WEBSITE', 'A professional website designed for businesses that accept appointments, reservations, or service bookings. This website allows customers to conveniently schedule appointments online without having to contact the business manually.', [
      ['Home Page', ['Business introduction', 'Featured services', 'Booking call-to-action section']],
      ['About Page', ['Company background', 'Business information', 'Mission and vision']],
      ['Services Page', ['Service listings', 'Service descriptions', 'Service pricing (if applicable)']],
      ['Online Booking System', ['Online appointment and reservation form', 'Service selection', 'Available date and time selection', 'Customer information collection', 'Booking confirmation', 'Booking request notifications']],
      ['Booking Management Dashboard', ['View customer bookings', 'Manage appointment requests', 'Approve or reject booking requests', 'Update booking status', 'View booking schedules']],
      ['Contact Page', ['Contact information', 'Customer inquiry form', 'Business location']]
    ], ['Mobile-responsive design', 'Custom website design', 'User-friendly booking interface', 'Social media integration', 'Basic Search Engine Optimization (SEO)'], '7-10 business days.');
    if (on('pages')) {
      h2(L(i++) + '. ADDITIONAL WEBSITE PAGES'); h3(m(pr('pages')) + ' per page');
      p('Additional pages can be created beyond the pages included in the selected website package.'); p('Examples include:');
      ul(['Our Team', 'Frequently Asked Questions (FAQ)', 'Testimonials', 'Careers', 'Individual Service Pages', 'Individual Project Pages', 'Terms and Conditions', 'Privacy Policy']);
      p('The final cost will depend on the number of additional pages requested.');
    }
  }
  // 3
  if (on('biz') || on('host')) {
    h1('Domain Registration and Web Hosting', true); let i = 0;
    if (on('biz')) {
      h2(L(i++) + '. FREE DOMAIN REGISTRATION');
      p('A free domain registration is exclusively included in the Business Website Package (' + m(pr('biz')) + ').');
      h3('Terms and Conditions:'); ul(['Free domain registration applies to the initial registration period only.', 'The domain name is subject to availability.', 'Domain renewal fees after the initial registration period will be shouldered by the client.', 'Domain registration is not included in the One-Page Website Package.', 'The client may choose their preferred available domain name, subject to approval and availability.']);
      h2(L(i++) + '. DOMAIN RENEWAL POLICY');
      p('Upon expiration of the initial free domain registration period, ' + PR_CO.name + ' will notify the Client regarding the upcoming domain renewal.');
      p('The Company will provide the Client with an invoice indicating the exact renewal amount before the renewal date.');
      p('Please note that domain renewal prices vary depending on the domain extension and registration provider. Therefore, the renewal cost may differ from one domain name to another.');
      p('The Client must settle the renewal invoice to ensure the continued registration and availability of the domain name. Any failure to renew before its expiration may result in website inaccessibility or loss of the domain name.');
    }
    if (on('host')) {
      h2(L(i++) + '. WEBSITE HOSTING'); p('Clients have the flexibility to choose where their website will be hosted.');
      h3('OPTION 1: CLIENT-PROVIDED HOSTING'); p('The client may purchase their own hosting service from their preferred hosting provider.'); p('Under this option:');
      ul(['The client will be responsible for purchasing the hosting subscription.', 'The client will shoulder all hosting renewal fees.', 'The client will manage their hosting account and subscription.', PR_CO.name + " will configure the website to work with the client's hosting environment, subject to compatibility."]);
      h3('OPTION 2: HOSTING THROUGH ' + PR_CO.name.toUpperCase()); h3(m(pr('host')) + ' per year');
      p('Clients may choose to have their website hosted through ' + PR_CO.name + ' for an annual fee of ' + m(pr('host')) + '.');
      h3('Inclusions:'); ul(['Website hosting for one year', 'Server space for website files and databases', 'Website accessibility through the registered domain', 'Basic server and hosting management', 'Basic hosting maintenance']);
      h3('Hosting Terms:'); ul(['Hosting is billed annually at ' + m(pr('host')) + '.', 'Renewal payment is required every year to maintain the website hosting service.', 'Hosting is optional and separate from the website development package.'].concat(on('biz') ? ['The free domain included in the Business Website Package does not include free hosting.', 'Domain renewal and hosting renewal are separate expenses.'] : []));
    }
  }
  // 4
  if (on('book') || on('ecom') || on('pwa')) {
    h1('Additional Features and Integrations', false); let i = 0;
    p('The following features can be integrated into your website to provide additional functionality and improve the overall customer experience.');
    if (on('book')) {
      h2(L(i++) + '. BOOKING SYSTEM'); h3(m(pr('book')));
      p('An integrated booking system that allows customers to schedule appointments or request services directly through your website.');
      h3('Features may include:'); ul(['Online booking form', 'Appointment scheduling', 'Customer information collection', 'Booking request notifications', 'Booking management interface']); p('The exact functionality will depend on the agreed booking requirements.');
    }
    if (on('ecom')) {
      h2(L(i++) + '. E-COMMERCE INTEGRATION'); h3(m(pr('ecom')));
      p('An e-commerce solution that allows your company to sell products or services directly through your website.');
      h3('Features may include:'); ul(['Product listings and catalog', 'Shopping cart functionality', 'Customer checkout system', 'Order management', 'Payment method integration', 'Product and inventory management']);
      p("Payment gateway services, transaction charges, and third-party subscriptions, if applicable, are subject to their respective providers' fees.");
    }
    if (on('pwa')) {
      h2(L(i++) + '. PROGRESSIVE WEB APP (PWA)'); h3(m(pr('pwa')));
      p('A Progressive Web App (PWA) is an enhanced version of a website that provides an app-like experience without requiring customers to download an application from the Google Play Store or Apple App Store.');
      p('With PWA integration, your website can offer the following features:');
      [['1. Installable Website', 'Visitors can add your website to their mobile phone or computer home screen, similar to installing a mobile application.'], ['2. App-Like Experience', 'Provides a more application-like interface and browsing experience, making the website more convenient to access.'], ['3. Offline Access', 'Selected website content can remain accessible even without an internet connection, depending on the implemented caching functionality.'], ['4. Faster Loading', 'Uses caching technology to help improve loading performance and provide a smoother browsing experience.'], ['5. Push Notifications', 'Can support notifications for announcements, updates, and promotions, subject to browser and device permissions.']].forEach(a => { h3(a[0]); p(a[1]); });
      p('PWA integration helps make your website more accessible and convenient for customers, especially those who frequently visit your business website.');
    }
  }
  // 5
  h1('Project Development Timeline', true); p('The estimated development duration is as follows:');
  const rows = []; if (on('one')) rows.push(['One Pager Website', '24 Hours']); if (on('biz')) rows.push(['Business Page Website', '5 - 7 Business Days']);
  if (on('shop')) rows.push(['E-Commerce Website', '10 - 15 Business Days']); if (on('blog')) rows.push(['Blog Website', '5 - 7 Business Days']); if (on('bsite')) rows.push(['Booking Website', '7 - 10 Business Days']);
  if (on('pages')) rows.push(['Additional Pages', 'Depends on Complexity']); if (on('book')) rows.push(['Booking System', 'Depends on Complexity']); if (on('ecom')) rows.push(['E - Commerce Integration', 'Depends on Complexity']); if (on('pwa')) rows.push(['PWA Integration', 'Depends on Complexity']);
  if (rows.length) B.push({ t: 'tbl', head: ['Website / Service', 'Estimated Duration'], rows });
  B.push({ t: 'kv', k: 'Important', v: 'Development timelines begin once the required project information, content, materials, and initial payment have been received.', nl: true });
  p('Delays in providing required materials, approvals, or feedback may affect the estimated completion date.');
  // 6
  h1('Payment Terms and Conditions', true); p('To ensure a smooth development process, payments will be divided into three stages:');
  h2('FIRST PAYMENT - 40% DOWNPAYMENT'); p('A 40% downpayment is required before the development process begins.'); p('This confirms the project engagement and secures the development schedule.');
  h2('SECOND PAYMENT - 30% UPON COMPLETION OF ALL FEATURES'); p('The second payment of 30% is due once all agreed website features and functionalities have been completed.'); p('This payment must be settled before the revision phase begins.');
  h2('FINAL PAYMENT - 30% AFTER REVISIONS'); p('The remaining 30% balance is due after the agreed revisions have been completed.'); p('Upon full payment, the website source code will be unlocked and made accessible through the designated website dashboard, where applicable to hard-coded websites.');
  h3('Payment Process:'); ol(['40% payment before development begins.', '30% payment after all agreed features have been completed and before revisions.', '30% payment after revisions and before source code access is unlocked.']);
  // 7
  h1('Revisions and Source Code Access', true); p("To ensure that the final website meets the client's expectations, a revision period will be provided after the second payment.");
  h3('7.1 Revision Terms:'); ul([revW + ' will begin after the second payment has been settled.', 'The client may review the completed website and provide necessary revision requests.', 'Revisions must remain within the originally agreed project scope.', 'Additional features, major structural changes, or requests outside the original scope may require additional charges.']);
  h3('7.2 Source Code Access:'); p('For hard-coded websites, the source code will be made accessible through the designated website dashboard after the final payment has been fully settled.');
  p('The source code access arrangement applies to hard-coded websites only and does not include proprietary third-party software, licensed plugins, themes, or services where source code ownership or access is restricted by their respective providers.');
  h3('7.3 MINOR AND MAJOR REVISIONS'); p('To ensure a clear understanding of the revision process, revisions are categorized into two types:');
  h3('7.3.A MINOR REVISIONS (Included)'); p('Minor revisions refer to small adjustments and modifications to the existing website design and content without changing its overall layout or functionality.'); p('The following are included:');
  ul([['Text Changes', 'Editing or correcting existing text and written content.'], ['Color Adjustments', 'Changing website colors, backgrounds, and other color elements.'], ['Image Replacement', 'Replacing existing images with new images provided by the client.'], ['Word Corrections', 'Correcting spelling, grammar, wording, and other written details.'], ['Font Changes', 'Adjusting font styles, font sizes, and typography.']]);
  p('These revisions are included in the agreed revision phase, provided they remain within the original project scope.');
  h3('7.3.B MAJOR REVISIONS (Additional Charges May Apply)'); p("Major revisions refer to significant changes that affect the website's original structure, design layout, or functionality."); p('The following are considered major revisions:');
  ul([['Website Layout Changes', 'Restructuring or redesigning the arrangement of website sections, pages, and overall visual presentation.'], ['Functionality Changes', 'Modifying existing website features, adding new functions, or changing how specific website components operate.'], ['Structural Changes', 'Significant changes to the original website design or page structure.'], ['Feature Modifications', 'Changing or rebuilding previously approved features or functionalities.']]);
  p("Major revisions are not included in the standard revision phase and may require additional charges depending on the complexity, time, and resources needed."); p('Any additional charges will be discussed with and approved by the Client before implementation.');
  h3('IMPORTANT REMINDER:'); p('The revision process is intended to refine and improve the originally agreed website design and features. It is not intended to cover a complete redesign or the development of additional functionalities outside the original project scope.');
  // 8
  h1('Design Mockup and Client Approval', true);
  p('Before the actual website development begins, ' + PR_CO.name + ' will prepare and present an initial website mockup design to the Client for review and approval.');
  p("The mockup will serve as the visual reference for the website's overall appearance, including its layout, color scheme, typography, and general design direction.");
  p('Approval Process:'); ol(["Initial Mockup Preparation - The Developer will create an initial mockup based on the Client's business requirements, preferences, and provided materials.", 'Client Review - The mockup will be presented to the Client for evaluation and feedback.', 'Design Confirmation - The Client will review and confirm the proposed design. Any necessary adjustments to the initial mockup must be discussed and finalized before approval.', 'Development Commencement - Actual website development will begin only after the Client has formally approved and confirmed the mockup design.']);
  p('Important Conditions:'); ul(["The Developer will not proceed with actual website development without the Client's confirmation of the mockup design.", 'Any changes requested after the mockup has been approved, particularly major layout or structural changes, may be considered major revisions and may incur additional charges.', 'The estimated development timeline will begin once the mockup has been approved, the required materials have been received, and the initial 40% downpayment has been settled.']);
  // 9
  h1('General Terms and Conditions', true);
  const gt = [usd ? 'All prices stated in this proposal are in United States Dollars (USD / $).' : 'All prices stated in this proposal are in Philippine Peso (PHP / ' + cur + ').', 'Prices cover only the services and features explicitly stated in the selected package.', 'Additional requirements not included in the selected package will be quoted separately.', 'The client is responsible for providing accurate company information, images, logos, written content, and other necessary materials.', 'Domain registration, web hosting, premium plugins, paid themes, third-party subscriptions, and external service fees are not included unless explicitly stated in the agreed quotation.'];
  if (on('biz')) gt.push('The free domain registration applies exclusively to the Business Website Package and covers the initial year registration period only.');
  if (on('host')) gt.push('Hosting through ' + PR_CO.name + ' is optional and costs ' + m(pr('host')) + ' per year.');
  gt.push('Development timelines may vary depending on project complexity and the timely submission of required materials and feedback.', 'Work on the next project stage will proceed upon settlement of the corresponding payment.', 'Any additional functionality or major changes outside the original agreement may require a separate quotation.');
  ol(gt);
  // notes
  const ex = prLines(c.extra); if (ex.length) { h1('Additional Notes', true); ul(ex); }
  // acceptance
  h1('Proposal Acceptance', true);
  p('We appreciate the opportunity to work with ' + org + '.');
  p(PR_CO.name + ' looks forward to helping ' + (co ? 'your company' : 'you') + ' establish a professional online presence through a modern and functional website that reflects ' + (co ? 'your brand' : 'your brand') + ', showcases ' + (co ? 'your' : 'your') + ' services, and supports your business growth.');
  p('Should you wish to proceed, please confirm your preferred website package and any additional features you would like to include.');
  p('Thank you for your time and consideration.');
  B.push({ t: 'gap' }); B.push({ t: 'gap' }); B.push({ t: 'sign', a: ['Sincerely,', PR_CO.name.toUpperCase(), 'Website Development Services'] });
  return { blocks: B, name };
}
function prHtml(blocks) {
  const li = x => Array.isArray(x) ? `<b>${esc(x[0])}</b> - ${esc(x[1])}` : esc(x);
  const html = blocks.map(b => {
    switch (b.t) {
      case 'title': return `<h2 class="text-center font-bold text-xl sm:text-2xl mt-6 mb-5 break-words">${esc(b.x)}</h2>`;
      case 'sub': return `<div class="font-bold text-sm mb-3">${esc(b.x)}</div>`;
      case 'kv': return b.nl ? `<p class="mt-3 text-justify"><b>${esc(b.k)}:</b> ${esc(b.v)}</p>` : `<div class="break-words"><b>${esc(b.k)}:</b> ${esc(b.v)}</div>`;
      case 'gap': return '<div class="h-3"></div>';
      case 'rule': return '<hr class="my-4 border-slate-400"/>';
      case 'h1': return `<h3 class="${b.br ? 'mt-8 pt-6 border-t border-dashed border-slate-300 ' : 'mt-5 '}font-bold text-base sm:text-lg break-words">${esc(b.x)}</h3>`;
      case 'h2': return `<h4 class="mt-4 font-bold text-sm break-words">${esc(b.x)}</h4>`;
      case 'h3': return `<div class="mt-3 font-bold break-words">${esc(b.x)}</div>`;
      case 'p': return `<p class="mt-2 text-justify break-words">${esc(b.x)}</p>`;
      case 'ul': return `<ul class="list-disc pl-8 mt-2 space-y-0.5">${b.a.map(x => `<li class="break-words">${li(x)}</li>`).join('')}</ul>`;
      case 'ol': return `<ol class="list-decimal pl-8 mt-2 space-y-0.5">${b.a.map(x => `<li class="break-words">${li(x)}</li>`).join('')}</ol>`;
      case 'tbl': return `<div class="mt-2 border border-slate-800">${[b.head].concat(b.rows).map((r, i) => `<div class="grid grid-cols-2 ${i ? 'border-t' : ''} border-slate-800"><div class="px-2 py-1.5 min-w-0 break-words ${i ? '' : 'font-bold'}">${esc(r[0])}</div><div class="px-2 py-1.5 min-w-0 break-words border-l border-slate-800 ${i ? '' : 'font-bold'}">${esc(r[1])}</div></div>`).join('')}</div>`;
      case 'sign': return `<div class="font-bold">${esc(b.a[0])}</div><div class="font-bold">${esc(b.a[1])}</div><div>${esc(b.a[2])}</div>`;
    }
    return '';
  }).join('');
  return `<div class="bg-white text-slate-900 rounded-xl p-5 sm:p-8 shadow-lg text-[12.5px] leading-relaxed" style="font-family:'Courier New',Courier,monospace"><div class="text-center text-xs text-slate-700"><div>${esc(PR_CO.name)}</div><div>${esc(PR_CO.addr)}</div><div class="break-words">${esc(PR_CO.phone)} | <span class="text-blue-600 underline">${esc(PR_CO.email)}</span></div></div>${html}</div>`;
}
async function prPdf(c) {
  const d = prBuild(c, true), JsPDF = await loadPdf(), doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 25, CW = W - 2 * M, LH = 5, TOP = 38;
  let curSt = 'normal';
  const font = (st, sz) => { curSt = st; doc.setFont('courier', st); doc.setFontSize(sz); }, S = pdfSafe, PS = '\u00A4';
  // the PDF font has no peso sign, so it is drawn: a "P" with two strokes through it
  const put = (t, x, yy) => {
    if (t.indexOf(PS) < 0) { doc.text(t, x, yy); return; }
    const em = doc.getFontSize() * 0.3528, ch = em * 0.57; let cx = x;
    t.split(PS).forEach((seg, k, a) => {
      if (seg) { doc.text(seg, cx, yy); cx += doc.getTextWidth(seg); }
      if (k < a.length - 1) {
        doc.text('P', cx, yy); const w = doc.getTextWidth('P');
        doc.setDrawColor(20); doc.setLineWidth(curSt === 'bold' ? 0.3 : 0.2);
        doc.line(cx - 0.04 * em, yy - ch * 0.38, cx + w + 0.04 * em, yy - ch * 0.38); doc.line(cx - 0.04 * em, yy - ch * 0.66, cx + w + 0.04 * em, yy - ch * 0.66);
        cx += w;
      }
    });
  };
  let y = TOP;
  const need = h => { if (y + h > H - 22) { doc.addPage(); y = TOP; } };
  const lines = (t, w) => doc.splitTextToSize(S(t), w);
  const wrap = (t, x, w, just) => { font('normal', 10); const ls = lines(t, w); need(LH * Math.min(ls.length, 2)); ls.forEach((ln, i) => { need(LH); if (just && i < ls.length - 1 && ln.indexOf(PS) < 0) doc.text(ln, x, y, { align: 'justify', maxWidth: w }); else put(ln, x, y); y += LH; }); };
  // bold lead followed by normal text (Courier is monospace, so the lead width is exact)
  const lead = (a, b, sep, x, w) => {
    const pre = S(a) + sep; font('normal', 10); const ls = lines(pre + b, w); need(LH * Math.min(ls.length, 2));
    ls.forEach((ln, i) => { need(LH); if (i === 0) { font('bold', 10); put(pre, x, y); const pw = doc.getTextWidth(pre); font('normal', 10); put(ln.slice(pre.length), x + pw, y); } else put(ln, x, y); y += LH; });
  };
  d.blocks.forEach(b => {
    switch (b.t) {
      case 'title': y = 58; font('bold', 20); doc.text(S(b.x), W / 2, y, { align: 'center', maxWidth: CW }); y += 14; break;
      case 'sub': font('bold', 11); doc.text(S(b.x), M, y); y += 8; break;
      case 'kv': if (b.nl) { y += 2; lead(b.k, b.v, ': ', M, CW); y += 1.5; } else lead(b.k, b.v, ': ', M, CW); break;
      case 'gap': y += 4; break;
      case 'rule': doc.setDrawColor(150); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 8; break;
      case 'h1': if (b.br) { doc.addPage(); y = TOP + 14; } else { need(30); y += 6; } font('bold', 15); { const ls = lines(b.x, CW); ls.forEach(l => { doc.text(l, M, y); y += 7; }); } y += 3; break;
      case 'h2': need(24); y += 3; font('bold', 11.5); lines(b.x, CW).forEach(l => { put(l, M, y); y += 6; }); y += 1.5; break;
      case 'h3': need(20); y += 2; font('bold', 10); lines(b.x, CW).forEach(l => { put(l, M, y); y += LH; }); y += 1.5; break;
      case 'p': wrap(b.x, M, CW, true); y += 2.5; break;
      case 'ul': case 'ol': y += 0.5; b.a.forEach((x, i) => {
        need(LH * 2); font('normal', 10);
        if (b.t === 'ul') { doc.setFillColor(20); doc.circle(M + 7, y - 1.2, 0.9, 'F'); } else doc.text((i + 1) + '.', M + 4, y);
        if (Array.isArray(x)) lead(x[0], x[1], ' - ', M + 12, CW - 12); else wrap(x, M + 12, CW - 12, true);
        y += 1;
      }); y += 2; break;
      case 'tbl': {
        y += 2; const cw = CW / 2; doc.setDrawColor(0); doc.setLineWidth(0.3);
        [b.head].concat(b.rows).forEach((r, i) => { need(10); doc.rect(M, y - 6, CW, 9); doc.line(M + cw, y - 6, M + cw, y + 3); font(i ? 'normal' : 'bold', 10); doc.text(S(r[0]), M + 2, y, { maxWidth: cw - 4 }); doc.text(S(r[1]), M + cw + 2, y, { maxWidth: cw - 4 }); y += 9; });
        y += 3; break;
      }
      case 'sign': need(24); font('bold', 10); doc.text(S(b.a[0]), M, y); y += LH; doc.text(S(b.a[1]), M, y); y += LH; font('normal', 10); doc.text(S(b.a[2]), M, y); y += LH; break;
    }
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font('normal', 9.5); doc.setTextColor(40);
    doc.text(PR_CO.name, W / 2, 14, { align: 'center' }); doc.text(PR_CO.addr, W / 2, 19.5, { align: 'center' });
    const a = PR_CO.phone + ' | ', aw = doc.getTextWidth(a), ew = doc.getTextWidth(PR_CO.email), x0 = W / 2 - (aw + ew) / 2;
    doc.text(a, x0, 25); doc.setTextColor(26, 90, 200); doc.text(PR_CO.email, x0 + aw, 25); doc.setDrawColor(26, 90, 200); doc.setLineWidth(0.2); doc.line(x0 + aw, 25.7, x0 + aw + ew, 25.7);
    doc.setTextColor(20); font('bold', 8); doc.text('Page | ' + i, W - M + 3, H - 15, { align: 'right' });
  }
  const safe = d.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim() || 'Client';
  doc.save('Service Proposal for ' + safe + '.pdf');
}
function prUI() {
  if (!prEl) {
    const lbl = 'block text-sm font-medium text-slate-300', fld = 'field mt-1.5';
    prEl = document.createElement('div'); prEl.className = 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start';
    const pkRow = p => `<div class="flex items-center gap-3 rounded-xl glass px-3 py-2.5"><label class="flex items-center gap-2.5 min-w-0 flex-1 text-sm ${PR_ADD.includes(p[0]) ? '' : 'cursor-pointer'}">${PR_ADD.includes(p[0]) ? '<span class="w-4 h-4 shrink-0 inline-flex items-center justify-center text-emerald-400" aria-hidden="true">&#10003;</span>' : `<input type="checkbox" name="inc_${p[0]}" class="w-4 h-4 shrink-0 accent-sky-500"/>`}<span class="min-w-0 break-words">${esc(p[1])}</span></label><div class="relative w-36 shrink-0"><span data-sym class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none"></span><input name="p_${p[0]}" type="text" inputmode="decimal" autocomplete="off" aria-label="${esc(p[1])} price" class="field !py-1.5 w-full text-right !pl-8"/></div></div>`;
    const pkSvc = PR_PK.filter(p => !PR_ADD.includes(p[0])).map(pkRow).join(''), pkAdd = PR_PK.filter(p => PR_ADD.includes(p[0])).map(pkRow).join('');
    prEl.innerHTML = `
      <form id="prForm" novalidate class="${card} space-y-5" data-f>
        <div><h2 class="text-lg font-extrabold tracking-tight">Service proposal</h2><p class="mt-1 text-sm text-slate-400">Fill in the client, tick the services (website packages) and set the prices; the add-ons are always included. The proposal is written for you in the preview and downloads as <b>Service Proposal for [Full Name]</b>. Fields marked * are required.</p></div>
        <fieldset class="space-y-3.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Client</legend>
          <label class="${lbl}">Pick an existing customer<select name="cust" class="${fld}"></select></label>
          <div class="grid grid-cols-3 gap-3.5">
            <label class="${lbl}">Title<select name="salute" class="${fld}"><option value="Mr.">Mr.</option><option value="Ms.">Ms.</option><option value="Mrs.">Mrs.</option><option value="">None</option></select></label>
            <label class="${lbl} col-span-2">Full name *<input name="name" maxlength="80" autocomplete="off" class="${fld}"/></label>
          </div>
          <label class="${lbl}">Company (optional)<input name="company" maxlength="80" autocomplete="off" class="${fld}"/></label>
          <label class="${lbl}">Email (optional)<input name="email" type="email" maxlength="120" autocomplete="off" class="${fld}"/></label>
          <div class="grid sm:grid-cols-2 gap-3.5">
            <label class="${lbl}">Proposal date *<input name="date" type="date" class="${fld}"/></label>
            <label class="${lbl}">Service name<input name="service" maxlength="40" placeholder="Website Development" class="${fld}"/></label>
          </div>
        </fieldset>
        <fieldset class="space-y-2.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Services (tick the package the client wants, prices)</legend>${pkSvc}</fieldset>
        <fieldset class="space-y-2.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Add-ons (always included in the proposal, prices)</legend>${pkAdd}</fieldset>
        <fieldset class="space-y-3.5"><legend class="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1">Terms</legend>
          <label class="${lbl}">Currency<select name="cur" class="${fld}"><option value="PHP">Philippine Peso (&#8369;)</option><option value="USD">US Dollar ($)</option></select></label>
          <label class="${lbl}">Minor revisions included *<input name="revs" type="number" inputmode="numeric" min="1" step="1" class="${fld}"/></label>
          <label class="${lbl}">Additional notes (one per line, optional)<textarea name="extra" rows="3" maxlength="1000" class="${fld} resize-y"></textarea></label>
          <p class="text-xs text-slate-400">Payments are split 40% down, 30% when all features are done and 30% after revisions.</p>
        </fieldset>
        <button type="button" data-prreset class="w-full sm:w-auto px-5 py-2.5 rounded-xl glass text-sm font-semibold text-slate-300 hover:text-white transition">Clear form</button>
      </form>
      <div class="lg:sticky lg:top-0 space-y-3 min-w-0" data-f>
        <div class="${card} !p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"><div class="min-w-0"><div class="font-bold">Proposal preview</div><p data-prmsg class="text-sm text-slate-400" role="status" aria-live="polite">Updates as you type.</p></div>
          <button type="button" data-prpdf class="btn-shine w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30 inline-flex items-center justify-center gap-2">Download PDF</button></div>
        <div data-prprev class="lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto rounded-xl"></div>
      </div>`;
    const f = prEl.querySelector('#prForm'), prev = prEl.querySelector('[data-prprev]'), msg = prEl.querySelector('[data-prmsg]'), btn = prEl.querySelector('[data-prpdf]');
    const write = () => { PR_KEYS.forEach(k => { f.elements[k].value = PR[k]; }); PR_PK.forEach(p => { if (f.elements['inc_' + p[0]]) f.elements['inc_' + p[0]].checked = !!PR['inc_' + p[0]]; f.elements['p_' + p[0]].value = prFmt(PR['p_' + p[0]]); }); f.elements.cust.value = PR.cust; };
    const read = () => { PR_KEYS.forEach(k => { PR[k] = f.elements[k].value; }); PR_PK.forEach(p => { if (f.elements['inc_' + p[0]]) PR['inc_' + p[0]] = f.elements['inc_' + p[0]].checked; PR['p_' + p[0]] = f.elements['p_' + p[0]].value.replace(/,/g, ''); }); PR.cust = f.elements.cust.value; };
    prEl._draw = () => { prEl.querySelectorAll('[data-sym]').forEach(e => { e.textContent = PR.cur === 'USD' ? '$' : '₱'; }); prev.innerHTML = prHtml(prBuild(PR).blocks); };
    prEl._sync = () => {   // keep the customer list current without touching what has been typed
      const s = f.elements.cust, v = s.value;
      s.innerHTML = '<option value="">Type the details below</option>' + K.map(k => `<option value="${esc(k.id)}">${esc(k.name)}${k.company ? ' - ' + esc(k.company) : ''}</option>`).join('');
      s.value = K.some(k => k.id === v) ? v : '';
    };
    f.addEventListener('focusout', e => { if (e.target.name && e.target.name.startsWith('p_')) e.target.value = prFmt(e.target.value.replace(/,/g, '')); });
    f.addEventListener('focusin', e => { if (e.target.name && e.target.name.startsWith('p_')) e.target.value = e.target.value.replace(/,/g, ''); });
    f.addEventListener('input', () => { read(); msg.textContent = 'Updates as you type.'; prEl._draw(); });
    f.addEventListener('change', e => {
      if (e.target.name === 'cust') {
        const k = K.find(x => x.id === e.target.value);
        if (k) { PR.name = k.name; PR.company = k.company; PR.email = k.email; write(); }
      }
      read(); prEl._draw();
    });
    prEl.querySelector('[data-prreset]').addEventListener('click', () => { PR = prBlank(); write(); prEl._sync(); prEl._draw(); msg.textContent = 'Form cleared.'; });
    btn.addEventListener('click', async () => {
      read();
      if (!PR.name.trim()) { msg.textContent = 'Enter the client full name first.'; f.elements.name.focus(); return; }
      if (!PR.date) { msg.textContent = 'Enter the proposal date first.'; f.elements.date.focus(); return; }
      if (PR.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(PR.email.trim())) { msg.textContent = 'Enter a valid client email or leave it empty.'; f.elements.email.focus(); return; }
      if (!PR_PK.some(p => !PR_ADD.includes(p[0]) && PR['inc_' + p[0]])) { msg.textContent = 'Tick at least one service.'; return; }
      for (const p of PR_PK) { if ((PR_ADD.includes(p[0]) || PR['inc_' + p[0]]) && !(+PR['p_' + p[0]] > 0)) { msg.textContent = 'Enter a price for ' + p[1] + '.'; f.elements['p_' + p[0]].focus(); return; } }
      if (!(+PR.revs >= 1)) { msg.textContent = 'Minor revisions must be at least 1.'; f.elements.revs.focus(); return; }
      btn.disabled = true; const old = btn.textContent; btn.textContent = 'Preparing...'; msg.textContent = 'Creating your PDF...';
      try { await prPdf(PR); msg.textContent = 'Proposal downloaded.'; toast('Proposal downloaded'); }
      catch (err) { console.error('proposal pdf', err); msg.textContent = 'Could not create the PDF. Check your connection and try again.'; }
      btn.disabled = false; btn.textContent = old;
    });
    prEl._write = write;
  }
  prEl._write(); prEl._sync(); prEl._draw();
  return prEl;
}

// ---------- chat with customers (one to one) ----------
// Saved at chats/<customerUid>/messages/<pushId>. chats/<customerUid>/meta holds the last message and each side's unread count.
let chEl = null, chMeta = {}, chOffMeta = {}, chMsgs = [], chOffMsgs = () => {}, chSel = null, chErr = '', chFilter = '', chStick = false;
const chTime = t => { if (!t) return ''; const d = new Date(t); return d.toDateString() === new Date().toDateString() ? fmtT(t) : d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); };
const chDay = t => { const d = new Date(t || Date.now()); return d.toDateString() === new Date().toDateString() ? 'Today' : d.toDateString() === new Date(Date.now() - 864e5).toDateString() ? 'Yesterday' : fmtD(t); };
const chCust = () => K.filter(c => c.uid);
const chName = u => { const c = K.find(x => x.uid === u); return c ? c.name : 'Customer'; };
const chUnread = u => +((chMeta[u] || {}).adminUnread) || 0;
const chOpenNow = u => view === 'chat' && chSel === u && !document.hidden;
const chFail = err => /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Add the "chats" rules in Firebase.' : 'Could not send or load messages. Please try again.';
function chBadge() {
  drawNotif();
  const el = $('#chatBadge'); if (!el) return;
  const n = chCust().reduce((s, c) => s + (chOpenNow(c.uid) ? 0 : chUnread(c.uid)), 0);
  el.textContent = n > 99 ? '99+' : n; el.classList.toggle('hidden', !n); el.classList.toggle('inline-flex', !!n);
}
// ---------- notifications (bell in the top bar) ----------
// count = unread chat messages + quotations still to email + overdue invoices
let notifLast = 0, ND = null;
// "Mark all as read" remembers how many of each kind were already seen on this device; only newer ones show up again
const ndKey = () => 'nd:' + (U ? U.uid : '');
const ndGet = () => { if (!ND || ND.k !== ndKey()) { let v = {}; try { v = JSON.parse(localStorage.getItem(ndKey())) || {}; } catch (e) {} ND = { k: ndKey(), v }; } return ND.v; };
const ndSave = () => { try { localStorage.setItem(ndKey(), JSON.stringify(ND.v)); } catch (e) {} };
function notifItems(raw) {
  const chat = chCust().reduce((n, c) => n + (chOpenNow(c.uid) ? 0 : chUnread(c.uid)), 0);
  const list = [
    { v: 'chat', icon: ICON.chat, t: 'Unread chat messages', n: chat },
    { v: 'source', icon: ICON.source, t: 'Paid source code to unlock', n: SC.filter(s => !s.unlocked && scPay(s) === 'paid').length },
    { v: 'messages', icon: ICON.messages, t: 'Quotations to email', n: Q.filter(q => !q.emailSent).length },
    { v: 'invoices', icon: ICON.invoices, t: 'Overdue invoices', n: I.filter(i => istat(i) === 'overdue').length },
    { v: 'subscriptions', icon: ICON.subscriptions, t: 'Subscriptions to renew', n: SUB.filter(x => ['soon', 'overdue'].includes(sstat(x))).length },
    { v: 'subscriptions', icon: ICON.subscriptions, t: 'Maintenance requests to review', n: C.reduce((n, p) => n + mtReqs(p.id).filter(r => r.status === 'requested').length, 0) },
    { v: 'subscriptions', icon: ICON.subscriptions, t: 'Free maintenance ending or ended', n: C.filter(p => p.mw > 0 && p.mf > 0 && ['soon', 'ended'].includes(mtInfo(p).k) && !mtReqs(p.id).some(r => r.status === 'requested' || r.status === 'active')).length }
  ];
  if (raw || !U) return list.filter(x => x.n > 0);
  const nd = ndGet(); let ch = false;
  list.forEach(x => { const base = nd[x.t] || 0; if (x.n < base) { nd[x.t] = x.n; ch = true; x.n = 0; } else x.n -= base; });   // fewer than before: lower the mark so later ones show again
  if (ch) ndSave();
  return list.filter(x => x.n > 0);
}
function markAllRead() {
  if (!U) return;
  const nd = ndGet(); notifItems(true).forEach(x => { nd[x.t] = x.n; }); ndSave();
  chCust().forEach(c => { if (chUnread(c.uid) > 0) update(ref(db, `chats/${c.uid}/meta`), { adminUnread: 0 }).catch(() => {}); });   // chat messages are marked read for real
  drawNotif(); toast('All notifications marked as read');
}
function drawNotif() {
  const wrap = $('#notifWrap'); if (!wrap) return;
  const on = !!U && !PORTAL; wrap.classList.toggle('hidden', !on); if (!on) return;
  const items = notifItems(), total = items.reduce((n, x) => n + x.n, 0), b = $('#notifBadge');
  b.textContent = total > 99 ? '99+' : total; b.classList.toggle('hidden', !total); b.classList.toggle('inline-flex', !!total);
  if (total > notifLast) pop(b);
  notifLast = total;
  $('#notifBtn').setAttribute('aria-label', total ? 'Notifications, ' + total + ' new' : 'Notifications');
  $('#notifMenu').innerHTML = '<div class="flex items-center justify-between gap-3 px-3 pt-2 pb-1.5"><span class="text-xs font-semibold text-slate-400">Notifications</span>' + (items.length ? '<button type="button" data-nall class="text-xs font-semibold text-brand-400 hover:text-white !bg-transparent">Mark all as read</button>' : '') + '</div>' + (items.map(x => `<button type="button" data-nv="${x.v}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm hover:bg-white/10 transition">${svg(x.icon, 'w-4 h-4 shrink-0 text-brand-400')}<span class="flex-1 min-w-0 truncate">${x.t}</span><span class="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-pink text-white text-[11px] font-bold inline-flex items-center justify-center">${x.n > 99 ? '99+' : x.n}</span></button>`).join('') || '<p class="px-3 py-3 text-sm text-slate-400">You are all caught up.</p>');
}
function closeNotif() { $('#notifMenu').classList.add('hidden'); $('#notifBtn').setAttribute('aria-expanded', 'false'); }
$('#notifBtn').addEventListener('click', e => {
  e.stopPropagation();
  const m = $('#notifMenu'), open = m.classList.contains('hidden');
  m.classList.toggle('hidden', !open); $('#notifBtn').setAttribute('aria-expanded', String(open));
});
$('#notifMenu').addEventListener('click', e => { if (e.target.closest('[data-nall]')) { markAllRead(); return; } const b = e.target.closest('[data-nv]'); if (b) go(b.dataset.nv); });
document.addEventListener('click', e => { if (!$('#notifWrap').contains(e.target)) closeNotif(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNotif(); });
function chMarkRead() {
  if (!chSel || !chOpenNow(chSel) || !chUnread(chSel)) return;
  update(ref(db, `chats/${chSel}/meta`), { adminUnread: 0 }).catch(() => {});
}
// keep one listener per customer's meta, so the list shows the last message and unread count without loading every conversation
function chSync() {
  if (PORTAL) return;
  const uids = chCust().map(c => c.uid);
  Object.keys(chOffMeta).forEach(u => { if (!uids.includes(u)) { chOffMeta[u](); delete chOffMeta[u]; delete chMeta[u]; } });
  uids.forEach(u => {
    if (chOffMeta[u]) return;
    chOffMeta[u] = onValue(ref(db, `chats/${u}/meta`), s => {
      const prev = chMeta[u], v = s.val() || {}; chMeta[u] = v;
      if (prev !== undefined && v.lastFrom === 'customer' && (+v.lastAt || 0) !== (+prev.lastAt || 0) && !chOpenNow(u)) toast('New message from ' + chName(u));
      chBadge(); chDrawList(); chMarkRead();
    }, err => { chErr = chFail(err); chDrawThread(); });
  });
  if (chSel && !uids.includes(chSel)) chSelect(null);
  chBadge(); chDrawList();
}
function chStop() { Object.values(chOffMeta).forEach(f => f()); chOffMeta = {}; chOffMsgs(); chOffMsgs = () => {}; }
function chDrawList() {
  if (!chEl) return;
  const q = chFilter.trim().toLowerCase();
  const rows = chCust().filter(c => !q || (c.name + ' ' + c.email + ' ' + c.company).toLowerCase().includes(q))
    .map(c => ({ c, m: chMeta[c.uid] || {} })).sort((a, b) => (+b.m.lastAt || 0) - (+a.m.lastAt || 0) || a.c.name.localeCompare(b.c.name));
  chEl.querySelector('[data-cl]').innerHTML = rows.map(({ c, m }) => {
    const un = chOpenNow(c.uid) ? 0 : (+m.adminUnread || 0);
    return `<button type="button" data-cu="${esc(c.uid)}" ${chSel === c.uid ? 'aria-current="true"' : ''} class="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-white/10 transition hover:bg-white/10 ${chSel === c.uid ? 'bg-white/10' : ''}">
      <span class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-pink flex items-center justify-center font-bold text-white">${esc((c.name || '?')[0].toUpperCase())}</span>
      <span class="min-w-0 flex-1"><span class="flex items-center justify-between gap-2"><span class="font-semibold truncate text-sm">${esc(c.name)}</span><span class="shrink-0 text-[10px] text-slate-500">${esc(chTime(+m.lastAt))}</span></span>
      <span class="flex items-center justify-between gap-2 mt-0.5"><span class="text-xs truncate ${un ? 'text-slate-200 font-semibold' : 'text-slate-400'}">${m.lastText ? (m.lastFrom === 'admin' ? 'You: ' : '') + esc(m.lastText) : '<span class="text-slate-500">No messages yet</span>'}</span>${un ? `<span class="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-pink text-white text-[11px] font-bold inline-flex items-center justify-center">${un > 99 ? '99+' : un}</span>` : ''}</span></span></button>`;
  }).join('') || `<p class="p-5 text-sm text-slate-400">${chCust().length ? 'No customers match your search.' : 'No customers yet. Create one in Customers, then chat with them here.'}</p>`;
}
function chDrawThread() {
  if (!chEl) return;
  const sel = !!chSel;
  chEl.querySelector('[data-cs]').className = 'w-full lg:w-80 shrink-0 lg:border-r border-white/10 flex-col ' + (sel ? 'hidden lg:flex' : 'flex');
  chEl.querySelector('[data-cm]').className = 'flex-1 min-w-0 flex-col ' + (sel ? 'flex' : 'hidden lg:flex');
  chEl.querySelector('[data-cempty]').className = 'flex-1 flex-col items-center justify-center text-center px-6 ' + (sel ? 'hidden' : 'flex');
  chEl.querySelector('[data-cthread]').className = 'flex-1 min-h-0 flex-col ' + (sel ? 'flex' : 'hidden');
  if (!sel) return;
  const c = K.find(x => x.uid === chSel) || {}, list = chEl.querySelector('[data-cmsgs]');
  chEl.querySelector('[data-cname]').textContent = c.name || 'Customer'; chEl.querySelector('[data-cmail]').textContent = c.email || '';
  chEl.querySelector('[data-cav]').textContent = (c.name || '?')[0].toUpperCase(); chEl.querySelector('[data-cerr]').textContent = chErr;
  const stick = chStick || list.scrollHeight - list.scrollTop - list.clientHeight < 80; chStick = false;
  let last = '', html = '';
  chMsgs.forEach(m => {
    const day = chDay(m.at);
    if (day !== last) { html += `<div class="text-center my-3"><span class="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-slate-400">${esc(day)}</span></div>`; last = day; }
    const mine = m.from === 'admin';
    html += `<div class="flex ${mine ? 'justify-end' : 'justify-start'} mb-1.5"><div class="max-w-[82%] sm:max-w-[70%] min-w-0"><div class="px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${mine ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white' : 'rounded-2xl rounded-bl-md glass'}">${esc(m.text)}</div><div class="mt-0.5 px-1 text-[10px] text-slate-500 ${mine ? 'text-right' : ''}">${m.at ? esc(fmtT(m.at)) : 'Sending...'}</div></div></div>`;
  });
  list.innerHTML = html || `<div class="h-full flex flex-col items-center justify-center text-center px-6"><p class="font-semibold">No messages yet</p><p class="mt-1 text-sm text-slate-400">Send the first message to start the conversation with ${esc(c.name || 'this customer')}.</p></div>`;
  if (stick) list.scrollTop = list.scrollHeight;
}
function chSelect(u) {
  chOffMsgs(); chOffMsgs = () => {}; chSel = u; chMsgs = []; chErr = ''; chStick = true;
  chDrawList(); chDrawThread(); chBadge();
  if (!u) return;
  chOffMsgs = onValue(query(ref(db, `chats/${u}/messages`), limitToLast(200)), snap => {
    if (chSel !== u) return;
    const l = []; snap.forEach(x => { const v = x.val() || {}; l.push({ id: x.key, from: v.from === 'admin' ? 'admin' : 'customer', text: String(v.text || ''), at: +v.at || 0 }); });
    chMsgs = l; chErr = ''; chDrawThread(); chMarkRead();
  }, err => { chErr = chFail(err); chDrawThread(); });
  chMarkRead();
  if (innerWidth >= 1024) setTimeout(() => { const t = chEl && chEl.querySelector('textarea'); if (t && chSel === u) t.focus({ preventScroll: true }); }, 60);
}
function chMount() { chStick = true; chDrawList(); chDrawThread(); chBadge(); chMarkRead(); }
function chUI() {
  if (chEl) return chEl;
  chEl = document.createElement('section'); chEl.id = 'chat'; chEl.setAttribute('data-f', '');
  chEl.className = card + ' !p-0 flex overflow-hidden'; chEl.style.height = 'calc(100dvh - 8.5rem)'; chEl.style.minHeight = '24rem';
  chEl.innerHTML = `<div data-cs class="w-full lg:w-80 shrink-0 lg:border-r border-white/10 flex flex-col">
      <div class="p-3 border-b border-white/10"><input data-csearch type="search" autocomplete="off" aria-label="Search customers" placeholder="Search customers..." class="field !py-2 text-sm"/></div>
      <div data-cl class="flex-1 min-h-0 overflow-y-auto"></div></div>
    <div data-cm class="flex-1 min-w-0 flex-col hidden lg:flex">
      <div data-cempty class="flex-1 flex-col items-center justify-center text-center px-6 flex"><span class="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-400 flex items-center justify-center">${svg(ICON.chat)}</span><p class="mt-3 font-semibold">Select a customer</p><p class="mt-1 text-sm text-slate-400">Pick a customer on the left to read and reply to their messages.</p></div>
      <div data-cthread class="flex-1 min-h-0 flex-col hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-white/10"><button type="button" data-cback aria-label="Back to customers" class="lg:hidden w-9 h-9 shrink-0 rounded-lg glass flex items-center justify-center text-slate-300 hover:text-white">${svg('M19 12H5M11 18l-6-6 6-6', 'w-4 h-4')}</button><span data-cav class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-pink flex items-center justify-center font-bold text-white"></span><div class="min-w-0"><div data-cname class="font-bold truncate"></div><div data-cmail class="text-xs text-slate-400 truncate"></div></div></div>
        <div data-cmsgs class="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4" role="log" aria-live="polite" aria-label="Messages"></div>
        <p data-cerr class="px-5 pb-2 text-xs text-red-400 empty:hidden" role="alert"></p>
        <form novalidate class="p-3 border-t border-white/10 flex items-end gap-2"><textarea name="t" rows="1" maxlength="1000" autocomplete="off" aria-label="Message" placeholder="Type a reply..." class="field resize-none" style="max-height:8rem"></textarea><button type="submit" aria-label="Send message" class="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">${svg('M22 2L11 13M22 2l-7 20-4-9-9-4z', 'w-5 h-5')}</button></form>
      </div></div>`;
  const f = chEl.querySelector('form'), ta = f.elements.t;
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'; };
  chEl.addEventListener('click', e => {
    if (e.target.closest('[data-cback]')) { chSelect(null); return; }
    const b = e.target.closest('[data-cu]'); if (b) chSelect(b.dataset.cu);
  });
  chEl.querySelector('[data-csearch]').addEventListener('input', e => { chFilter = e.target.value; chDrawList(); });
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } });   // Enter sends, Shift+Enter adds a line
  f.addEventListener('submit', async e => {
    e.preventDefault(); e.stopPropagation();
    const u = chSel, text = ta.value.trim().slice(0, 1000); if (!u || !text) return;
    ta.value = ''; grow(); chErr = ''; chStick = true;
    try {
      const base = `chats/${u}`, k = push(ref(db, `${base}/messages`)).key;
      await update(ref(db), {
        [`${base}/messages/${k}`]: { from: 'admin', text, at: serverTimestamp() },
        [`${base}/meta/lastText`]: text.slice(0, 80), [`${base}/meta/lastFrom`]: 'admin', [`${base}/meta/lastAt`]: serverTimestamp(),
        [`${base}/meta/customerUnread`]: increment(1), [`${base}/meta/adminUnread`]: 0
      });
    } catch (err) { console.error('send message', err); if (chSel === u && !ta.value) { ta.value = text; grow(); } chErr = chFail(err); chDrawThread(); }
    ta.focus();
  });
  return chEl;
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { chMarkRead(); chBadge(); chDrawList(); } });

// ---------- backup & restore of the Realtime Database ----------
// One JSON file: { format, version, createdAt, admin, data: { "<database path>": <value> } }.
// Paths saved: users/<uid> (projects, invoices, customers), quotes, and for every customer portal/<cuid> and chats/<cuid>.
const BK_FORMAT = 'emdev-backup';
let bk = { busy: false, err: '', errAt: '', note: '', file: '', data: null, sum: null, prog: '' };
const bkLast = () => { try { return +localStorage.getItem('bk:last:' + U.uid) || 0; } catch (e) { return 0; } };
const bkCount = o => o && typeof o === 'object' ? Object.keys(o).length : 0;
const bkFail = (where, msg) => { bk.busy = false; bk.err = msg; bk.errAt = where; if (view === 'backup') paint(false); };
async function bkCollect() {
  const data = {}, failed = [];
  const take = async path => { try { const sn = await withTimeout(get(ref(db, path)), 30000); if (sn.exists()) data[path] = sn.val(); } catch (e) { failed.push(path); console.error('backup', path, e); } };
  // customers come from the database itself, so the list is complete even if the screen has not loaded them
  let uids = K.map(c => c.uid).filter(Boolean);
  try { const sn = await withTimeout(get(ref(db, `users/${U.uid}/customers`)), 30000); sn.forEach(ch => { const u = (ch.val() || {}).uid; if (u) uids.push(u); }); } catch (e) {}
  uids = [...new Set(uids)];
  await Promise.all([take(`users/${U.uid}`), take(`activity/${U.uid}`), take('quotes'), ...uids.flatMap(u => [take(`portal/${u}`), take(`chats/${u}`), take(`maintenance/${u}`)])]);
  return { data, failed };
}
async function bkDownload() {
  if (PORTAL || bk.busy) return;
  bk.busy = 'dl'; bk.err = ''; bk.note = ''; paint(false);
  try {
    const { data, failed } = await bkCollect();
    if (failed.includes(`users/${U.uid}`)) return bkFail('dl', 'Could not read your data. It may be blocked by the database rules, or the connection dropped. Nothing was downloaded.');
    const now = new Date(), file = { format: BK_FORMAT, version: 1, createdAt: now.toISOString(), admin: { uid: U.uid, email: U.email || '' }, data };
    const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
    const a = document.createElement('a'), z = n => String(n).padStart(2, '0');
    a.href = URL.createObjectURL(blob); a.download = `em-dashboard-backup-${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}-${z(now.getHours())}${z(now.getMinutes())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    try { localStorage.setItem('bk:last:' + U.uid, String(now.getTime())); } catch (e) {}
    bk.busy = false; bk.note = failed.length ? 'Backup downloaded, but these parts could not be read and are not included: ' + failed.join(', ') + '.' : 'Backup downloaded.';
    paint(false);
  } catch (err) { console.error(err); bkFail('dl', 'Could not create the backup. Please try again.'); }
}
// only these paths may be restored, and users/<uid> must be this account's own
const bkAllowed = path => path === `users/${U.uid}` || path === `activity/${U.uid}` || path === 'quotes' || /^(portal|chats|maintenance)\/[A-Za-z0-9_-]+$/.test(path);
function bkParse(text) {
  let f; try { f = JSON.parse(text); } catch (e) { throw new Error('That file is not a valid backup (it could not be read).'); }
  if (!f || f.format !== BK_FORMAT || !f.data || typeof f.data !== 'object') throw new Error('That file is not a backup made by this dashboard.');
  if (f.admin && f.admin.uid && f.admin.uid !== U.uid) throw new Error('This backup belongs to a different account (' + (f.admin.email || f.admin.uid) + ') and cannot be restored here.');
  const paths = Object.keys(f.data);
  if (!paths.length) throw new Error('This backup is empty.');
  const bad = paths.find(x => !bkAllowed(x)); if (bad) throw new Error('This backup contains a location that cannot be restored: ' + bad);
  const u = f.data[`users/${U.uid}`] || {}, chats = paths.filter(x => x.startsWith('chats/'));
  return { f, sum: { at: f.createdAt || Date.now(), projects: bkCount(u.projects), invoices: bkCount(u.invoices), customers: bkCount(u.customers), quotes: bkCount(f.data.quotes), portals: paths.filter(x => x.startsWith('portal/')).length, messages: chats.reduce((n, x) => n + bkCount((f.data[x] || {}).messages), 0) } };
}
// split each section into per-record paths, so restoring overwrites those records and leaves any newer records alone
function bkFlatten(data) {
  const out = {}, put = (base, v, depth) => {
    if (depth > 0 && v && typeof v === 'object' && !Array.isArray(v)) { Object.keys(v).forEach(k => put(base + '/' + k, v[k], depth - 1)); }
    else out[base] = v;
  };
  Object.keys(data).forEach(path => put(path, data[path], path.startsWith('users/') || path.startsWith('chats/') || path.startsWith('portal/') ? 2 : 1));
  return out;
}
async function bkPick(file) {
  bk.err = ''; bk.note = ''; bk.data = null; bk.sum = null; bk.file = file ? file.name : '';
  if (file) {
    if (file.size > 60 * 1024 * 1024) bkFail('rs', 'That file is too large to be a backup.');
    else { try { const r = bkParse(await file.text()); bk.data = r.f.data; bk.sum = r.sum; } catch (e) { bk.err = e.message; bk.errAt = 'rs'; bk.file = ''; } }
  }
  paint(false);
}
async function bkRestore() {
  if (PORTAL || bk.busy || !bk.data) return;
  if (!confirm('Restore this backup?\n\nRecords in the file will overwrite the current version of the same records in the database. This cannot be undone. Tip: download a fresh backup first.')) return;
  bk.busy = 'rs'; bk.err = ''; bk.note = ''; bk.prog = ''; paint(false);
  const flat = bkFlatten(bk.data), keys = Object.keys(flat), SIZE = 100; let done = 0, failedN = 0;
  try {
    for (let i = 0; i < keys.length; i += SIZE) {
      const part = {}; keys.slice(i, i + SIZE).forEach(k => { part[k] = flat[k]; });
      try { await withTimeout(update(ref(db), part), 30000); done += Object.keys(part).length; }
      catch (err) { failedN += Object.keys(part).length; console.error('restore', err); bk.lastErr = err; }
      bk.prog = Math.min(100, Math.round((i + SIZE) / keys.length * 100)) + '%'; if (view === 'backup') paint(false);
    }
    bk.busy = false; bk.prog = '';
    if (!failedN) { bk.note = 'Restore complete. ' + done + ' items written back to the database.'; bk.data = null; bk.sum = null; bk.file = ''; }
    else { const denied = /PERMISSION_DENIED/i.test(String((bk.lastErr && (bk.lastErr.code || bk.lastErr.message)) || '')); bk.err = (done ? done + ' items were restored, but ' : 'Nothing was restored. ') + failedN + ' could not be written' + (denied ? ': blocked by the database rules.' : '. Check your connection and try again.'); bk.errAt = 'rs'; }
    if (view === 'backup') paint(false);
  } catch (err) { console.error(err); bkFail('rs', 'The restore was interrupted. Please try again.'); }
}

// ---------- events ----------
const navKeys = () => PORTAL ? ['portal', 'source', 'settings'] : ['overview', 'projects', 'invoices', 'subscriptions', 'source', 'accounting', 'customers', 'chat', 'messages', 'contracts', 'proposal', 'tracker', 'backup', 'settings'];
const buildNav = () => { $('#nav').innerHTML = navKeys().map(k => `<button data-v="${k}" class="nav-btn w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white">${svg(ICON[k])}${TITLES[k]}${k === 'chat' ? '<span id="chatBadge" class="hidden ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-pink text-white text-[11px] font-bold items-center justify-center" aria-label="Unread chat messages"></span>' : ''}</button>`).join(''); chBadge(); };
buildNav();
$('#nav').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) go(b.dataset.v); });
const closeMenu = () => { $('#side').classList.add('-translate-x-full'); $('#scrim').classList.add('hidden'); $('#menuBtn').setAttribute('aria-expanded', 'false'); };
$('#menuBtn').addEventListener('click', () => { $('#side').classList.remove('-translate-x-full'); $('#scrim').classList.remove('hidden'); $('#menuBtn').setAttribute('aria-expanded', 'true'); });
$('#scrim').addEventListener('click', closeMenu);
window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#scrim').classList.contains('hidden')) closeMenu(); });
document.querySelectorAll('[data-leave]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); leave(a.getAttribute('href')); }));

const themeBtn = $('#themeBtn'), root = document.documentElement;
const syncTheme = () => themeBtn.setAttribute('aria-label', root.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode');
syncTheme();
themeBtn.addEventListener('click', () => {
  root.classList.add('theme-switching');
  const light = root.classList.toggle('light');
  try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) {}
  syncTheme(); clearTimeout(window.__tt); window.__tt = setTimeout(() => root.classList.remove('theme-switching'), 650);
});

// once an entrance animation ends, drop its class so later animations (glow, fade-out) can play
$('#view').addEventListener('animationend', e => { const n = e.target; if (n.classList && n.classList.contains('fade-item') && e.animationName === 'itemFade') { n.classList.remove('fade-item'); n.style.removeProperty('--i'); } });
$('#view').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'flt') { flt = b.dataset.v; paint(false); }
  else if (a === 'go') { go(b.dataset.v); }
  else if (a === 'qflt') { qflt = b.dataset.v; document.querySelectorAll('[data-qpill]').forEach(x => x.className = pillCls(x.dataset.v === qflt)); const g = $('#qgrid'); if (g) swapFilter(g, () => drawQ(true)); }
  else if (a === 'qmail') {
    const q = Q.find(x => x.id === b.dataset.q); if (!q) return;
    const val = b.checked, prev = { s: q.emailSent, t: q.emailAt };
    q.emailSent = val; q.emailAt = val ? Date.now() : 0; repaintQ();   // show it right away; the database write follows
    try { await update(ref(db, `quotes/${q.id}`), { emailSent: val, emailSentAt: val ? serverTimestamp() : null }); toast(val ? 'Marked as emailed' : 'Marked as not emailed'); }
    catch (err) { const r = Q.find(x => x.id === b.dataset.q); if (r) { r.emailSent = prev.s; r.emailAt = prev.t; } toast(quoteErr(err, 'update the quotation')); repaintQ(); }
  }
  else if (a === 'qreply') { const q = Q.find(x => x.id === b.dataset.q); if (q) openQMail(q, b); }
  else if (a === 'qnew') openQMail(null, b);
  else if (a === 'trflt') { trflt = b.dataset.v; document.querySelectorAll('[data-trpill]').forEach(x => x.className = pillCls(x.dataset.v === trflt)); drawT(); }
  else if (a === 'trcsv') {
    const q = v => { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const rows = [['Date', 'Time', 'Event', 'Who', 'Account email', 'Role', 'Email type', 'Sent to', 'Status', 'Details']].concat(trFiltered().map(e => [e.at ? dstr(new Date(e.at)) : '', e.at ? trTime(e.at) : '', TRT[trKind(e)].l, e.name, e.email, e.actor, e.kind, e.to, e.type === 'email' ? e.status : '', e.detail || e.preview]));
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
    const dl = document.createElement('a'); dl.href = url; dl.download = 'tracker-' + dstr(new Date()) + '.csv'; document.body.appendChild(dl); dl.click(); dl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Tracker exported');
  }
  else if (a === 'newp') openModal();
  else if (a === 'del') openDel(b.dataset.p, b);
  else if (a === 'inc') {
    const p = findP(b.dataset.p), i = +b.dataset.i; if (!p || p.archived || !p.items[i]) return;
    const val = b.checked, prev = p.items[i].d;
    p.items[i].d = val; refresh();   // update the bar immediately; the database write follows
    if (p.cloud) {
      try { await set(ref(db, `users/${U.uid}/projects/${p.id}/inclusions/${i}`), { t: p.items[i].t, d: val }); }
      catch (err) { const q = findP(b.dataset.p); if (q && q.items[i]) q.items[i].d = prev; toast(failMsg(err, 'update the inclusion')); refresh(); }
    } else save();
  }
  else if (a === 'done' || a === 'reopen') {
    const p = findP(b.dataset.p), arch = a === 'done'; if (!p) return;
    if (arch && (pct(p) < 100 || p.archived)) return;
    p.archived = arch; refresh();
    if (p.cloud) {
      try { await update(ref(db, `users/${U.uid}/projects/${p.id}`), arch ? { archived: true, archivedAt: serverTimestamp() } : { archived: false, archivedAt: null }); toast(arch ? 'Project completed and archived' : 'Project reopened'); }
      catch (err) { const q = findP(b.dataset.p); if (q) q.archived = !arch; toast(failMsg(err, arch ? 'complete the project' : 'reopen the project')); refresh(); }
    } else { save(); toast(arch ? 'Project completed and archived' : 'Project reopened'); }
  }
  else if (a === 'iflt') { iflt = b.dataset.v; document.querySelectorAll('[data-ipill]').forEach(x => x.className = pillCls(x.dataset.v === iflt)); const g = $('#igrid'); if (g) swapFilter(g, () => drawI(true)); }
  else if (a === 'newinv') showInvPanel(null);
  else if (a === 'sflt') { sflt = b.dataset.v; document.querySelectorAll('[data-spill]').forEach(x => x.className = pillCls(x.dataset.v === sflt)); const g = $('#sgrid'); if (g) swapFilter(g, () => drawS(true)); }
  else if (a === 'newsub') { if (subOpen) hideSubPanel(); else showSubPanel(null); }
  else if (a === 'scancel') hideSubPanel();
  else if (a === 'sedit') { const x = SUB.find(y => y.id === b.dataset.s); if (x) showSubPanel(x); }
  else if (a === 'srenew') renewSub(b.dataset.s, b);
  else if (a === 'sdel') openXSub(b.dataset.s, b);
  else if (a === 'sgoproj') go('projects');
  else if (a === 'sfee') openFee(b.dataset.p, b);
  else if (a === 'scflt') { scflt = b.dataset.v; document.querySelectorAll('[data-scpill]').forEach(x => x.className = pillCls(x.dataset.v === scflt)); const g = $('#scgrid'); if (g) swapFilter(g, () => drawSC(true)); }
  else if (a === 'newsc') { if (scOpen) hideSCPanel(); else showSCPanel(null); }
  else if (a === 'sccancel') hideSCPanel();
  else if (a === 'scedit') { const x = SC.find(y => y.id === b.dataset.s); if (x) showSCPanel(x); }
  else if (a === 'sctoggle') toggleSC(b.dataset.s, b);
  else if (a === 'scdel') openXSC(b.dataset.s, b);
  else if (a === 'iedit') { const i = I.find(x => x.id === b.dataset.i); if (i) showInvPanel(i); }
  else if (a === 'ipay') {
    const i = I.find(x => x.id === b.dataset.i); if (!i) return;
    const val = !i.paid, prev = { p: i.paid, t: i.paidAt };
    i.paid = val; i.paidAt = val ? Date.now() : 0; repaintI();   // show it right away; the database write follows
    try {
      const ib = `users/${U.uid}/invoices/${i.id}`, up = { [`${ib}/paid`]: val, [`${ib}/paidAt`]: val ? serverTimestamp() : null };
      if (invMirror(i)) { const pb = `portal/${i.cuid}/invoices/${i.id}`; up[`${pb}/paid`] = val; up[`${pb}/paidAt`] = val ? serverTimestamp() : null; }   // the customer sees it too
      await update(ref(db), up); toast(i.num + (val ? ' marked as paid' : ' marked as unpaid')); }
    catch (err) { const r = I.find(x => x.id === b.dataset.i); if (r) { r.paid = prev.p; r.paidAt = prev.t; } toast(invErr(err, 'update the invoice')); repaintI(); }
  }
  else if (a === 'idl') { const i = I.find(x => x.id === b.dataset.i); if (i) downloadPdf(i, b); }
  else if (a === 'idel') { openXDel(b.dataset.i, b); }
  else if (a === 'newex') showExPanel(null);
  else if (a === 'excancel') hideExPanel();
  else if (a === 'exedit') { const x = EX.find(y => y.id === b.dataset.x); if (x) showExPanel(x); }
  else if (a === 'exdel') openXExp(b.dataset.x, b);
  else if (a === 'excsv') {
    const q = v => { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const rows = [['Date', 'Description', 'Category', 'Repeats', 'Amount (PHP)', 'Notes']].concat(exBooks(dstr(new Date())).pays.map(p => [p.d, p.e.name, EXCAT[p.e.cat], EXREP[p.e.rep].l, p.amt.toFixed(2), p.e.notes]));
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
    const dl = document.createElement('a'); dl.href = url; dl.download = 'expenses-' + dstr(new Date()) + '.csv'; document.body.appendChild(dl); dl.click(); dl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Expenses exported');
  }
  else if (a === 'adl') openDl(b);
  else if (a === 'newk') { kOpen = !kOpen; const pn = $('#kPanel'); if (pn) { pn.classList.toggle('open', kOpen); pn.toggleAttribute('inert', !kOpen); } }
  else if (a === 'kcancel') { kOpen = false; const pn = $('#kPanel'); if (pn) { pn.classList.remove('open'); pn.setAttribute('inert', ''); } }
  else if (a === 'klink') {
    const c = K.find(x => x.id === b.dataset.k); if (!c || !c.uid) return;
    const pid = b.dataset.p, on = b.checked, prev = c.projects.slice();
    c.projects = on ? [...new Set([...c.projects, pid])] : c.projects.filter(x => x !== pid);
    const pm = {}; c.projects.forEach(id => { pm[id] = true; }); const val = c.projects.length ? pm : null;
    try { await withTimeout(update(ref(db), { [`users/${U.uid}/customers/${c.id}/projects`]: val, [`portal/${c.uid}/projects`]: val }), 12000); toast(on ? 'Project shared' : 'Project hidden'); }
    catch (err) { c.projects = prev; toast(kErr(err, 'update the shared projects')); repaintK(); }
  }
  else if (a === 'kpost') {
    const c = K.find(x => x.id === b.dataset.k); if (!c || !c.uid) return;
    const ta = b.closest('[data-kid]').querySelector('textarea'), t = ta.value.trim().slice(0, 300); if (!t) { ta.focus(); return; }
    b.disabled = true;
    try { await withTimeout(update(ref(db), { [`users/${U.uid}/customers/${c.id}/update`]: t, [`users/${U.uid}/customers/${c.id}/updatedAt`]: serverTimestamp(), [`portal/${c.uid}/update`]: t, [`portal/${c.uid}/updatedAt`]: serverTimestamp() }), 12000); delete kDraft[c.id]; toast('Update posted'); }
    catch (err) { toast(kErr(err, 'post the update')); }
    b.disabled = false;
  }
  else if (a === 'kreset') { const c = K.find(x => x.id === b.dataset.k); if (!c) return; try { await sendPasswordResetEmail(auth, c.email); toast('Reset link sent to ' + c.email); } catch (err) { toast('Could not send the email. Try again later.'); } }
  else if (a === 'ktoggle') {
    const c = K.find(x => x.id === b.dataset.k); if (!c || !c.uid) return;
    const off = !c.disabled;   // true = disable now, false = enable again
    if (off) { openXDisable(c.id, b); return; }   // disabling needs the typed confirmation
    const prev = c.disabled; c.disabled = off; b.disabled = true;
    try {
      await withTimeout(update(ref(db), {
        [`users/${U.uid}/customers/${c.id}/disabled`]: off ? true : null,
        [`portal/${c.uid}/disabled`]: off ? true : null,
        [`portal/${c.uid}/revoked`]: off ? true : null
      }), 12000);
      toast(off ? c.name + ' can no longer log in' : c.name + ' can log in again');
    } catch (err) { c.disabled = prev; toast(kErr(err, off ? 'disable the account' : 'enable the account')); }
    b.disabled = false; repaintK();
  }
  else if (a === 'kdel') openXCust(b.dataset.k, b);
  else if (a === 'pwdone') { try { localStorage.setItem('pwn:' + U.uid, '1'); } catch (e2) {} paint(false); }
  else if (a === 'rpw') { try { await sendPasswordResetEmail(auth, U.email); toast('Reset link sent to ' + U.email); } catch (err) { toast('Could not send the email. Try again later.'); } }
  else if (a === 'mtok' || a === 'mtno' || a === 'mtdel') {
    const path = `maintenance/${b.dataset.u}/${b.dataset.p}`;
    if (a === 'mtdel' && !confirm('Remove this maintenance record? The customer will be able to request again.')) return;
    b.disabled = true;
    try {
      if (a === 'mtdel') await withTimeout(remove(ref(db, path)), 12000);
      else await withTimeout(update(ref(db, path), { status: a === 'mtok' ? 'active' : 'declined', decidedAt: serverTimestamp() }), 12000);
      toast(a === 'mtok' ? 'Maintenance subscription activated' : a === 'mtno' ? 'Request declined' : 'Record removed');
    } catch (err) { b.disabled = false; toast(failMsg(err, 'update the maintenance request')); }
  }
  else if (a === 'bkdl') await bkDownload();
  else if (a === 'bkgo') await bkRestore();
  else if (a === 'bkclr') { bk.data = null; bk.sum = null; bk.file = ''; bk.err = ''; paint(false); }
  else if (a === 'reset') { if (confirm('Reset all sample data on this device?')) { S = seed(); save(); paint(false); toast('Sample data reset'); } }
});
$('#view').addEventListener('change', e => { if (e.target && e.target.id === 'bkFile') bkPick(e.target.files[0]); });
$('#view').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, k = f.dataset.form, d = new FormData(f);
  if (k === 'addinc') {
    await addFeature(f);
  } else if (k === 'newsc') {
    await saveSC(f);
  } else if (k === 'newsub') {
    await saveSub(f);
  } else if (k === 'newcust') {
    await saveCustomer(f);
  } else if (k === 'maint') {
    await saveMaint(f);
  } else if (k === 'prof') {
    try { await updateProfile(auth.currentUser, { displayName: d.get('name').trim() }); fillUser(); toast('Profile updated'); } catch (err) { toast('Could not save your profile.'); }
  }
});

async function saveMaint(f) {
  const p = findP(f.dataset.p); if (!p || !p.cloud) return;
  const d = new FormData(f), weeks = parseInt(d.get('weeks'), 10);
  if (!(weeks >= 0 && weeks <= 260)) return toast('Free maintenance must be 0 to 260 weeks.');
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try { await withTimeout(update(ref(db, `users/${U.uid}/projects/${p.id}/maintenance`), { weeks }), 12000); toast('Maintenance updated'); }
  catch (err) { toast(failMsg(err, 'save the maintenance settings')); }
  btn.disabled = false;
}

// ---------- add a feature (inclusion) to an existing project ----------
async function addFeature(f) {
  const p = findP(f.dataset.p), input = f.elements.t; if (!p || p.archived) return;
  const t = input.value.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!t) { input.focus(); return; }
  if (p.items.length >= 15) return toast('A project can have up to 15 features.');
  if (p.items.some(m => m.t.toLowerCase() === t.toLowerCase())) return toast('That feature is already in this project.');
  const idx = p.items.length, item = { t, d: false };
  p.items.push(item); input.value = ''; refresh();   // show it right away; the database write follows
  if (p.cloud) {
    try { await set(ref(db, `users/${U.uid}/projects/${p.id}/inclusions/${idx}`), item); toast('Feature added'); }
    catch (err) {
      const q = findP(f.dataset.p); if (q) { const k = q.items.indexOf(item); if (k > -1) q.items.splice(k, 1); }
      input.value = t; toast(failMsg(err, 'add the feature')); refresh();
    }
  } else { save(); toast('Feature added'); }
}

// ---------- projects in Firebase Realtime Database ----------
// Saved at users/<uid>/projects/<pushId>. The sample projects stay on this device.
const arr = x => Array.isArray(x) ? x.filter(Boolean) : Object.values(x || {});
let offProjects = () => {}, cloudSig = '[]';
function watchProjects() {
  offProjects(); C = []; cloudSig = '[]'; let first = true;
  offProjects = onValue(ref(db, `users/${U.uid}/projects`), snap => {
    const list = [];
    snap.forEach(ch => {
      const v = ch.val() || {};
      list.push({ id: ch.key, cloud: true, name: v.name || 'Untitled project', start: v.startDate, due: v.endDate, items: arr(v.inclusions).map(x => typeof x === 'string' ? { t: x, d: false } : { t: x.t, d: x.d === true }), archived: v.archived === true, at: v.createdAt || 0, arAt: +v.archivedAt || 0, hasM: !!v.maintenance, mw: v.maintenance ? Math.max(0, +v.maintenance.weeks || 0) : 0, mf: v.maintenance ? Math.max(0, +v.maintenance.fee || 0) : 0 });
    });
    list.sort((a, b) => b.at - a.at);
    const sig = JSON.stringify(list), wasFirst = first; first = false;
    if (sig === cloudSig) return;
    C = list; cloudSig = sig; drawNotif();
    if (document.body.classList.contains('ready') && view === 'subscriptions') updateSView();
    if (wasFirst) { if (document.body.classList.contains('ready') && (view === 'projects' || view === 'overview')) paint(true); } else refresh();
  }, () => toast('Could not load your saved projects.'));
}

// ---------- maintenance requests in Firebase Realtime Database ----------
let offMR = () => {};
function watchMaint() {
  offMR(); MR = {};
  offMR = onValue(ref(db, 'maintenance'), snap => {
    MR = snap.val() || {}; drawNotif();
    if (document.body.classList.contains('ready')) { if (view === 'subscriptions') updateSView(); else if (view === 'projects' || view === 'overview') paint(false); }
  }, () => {});
}

// ---------- quotations in Firebase Realtime Database ----------
// Quote requests from the website are saved at quotes/<pushId>. "Email sent" is stored on each one as emailSent / emailSentAt.
const quoteErr = (err, what) => { console.error(what, err); return /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Allow signed-in users to read and write "quotes" in Firebase.' : 'Could not ' + what + '. Please try again.'; };
const repaintQ = () => { drawNotif(); if (!document.body.classList.contains('ready')) return; if (view === 'messages') updateQView(); else if (view === 'overview') paint(false); };
let offQuotes = () => {}, qSig = '';
function watchQuotes() {
  offQuotes(); Q = []; qSig = ''; qError = '';
  offQuotes = onValue(ref(db, 'quotes'), snap => {
    const list = [];
    snap.forEach(ch => {
      const v = ch.val() || {};
      list.push({ id: ch.key, name: v.name || 'Unknown', email: v.email || '', phone: v.phone || ((v.countryCode || '') + (v.mobile || '')), service: v.service || '', details: v.details || '', at: +v.createdAt || 0, emailSent: v.emailSent === true, emailAt: +v.emailSentAt || 0 });
    });
    list.sort((a, b) => b.at - a.at);
    const sig = JSON.stringify(list); qError = '';
    if (sig === qSig) return;
    Q = list; qSig = sig; repaintQ();
  }, err => { qError = quoteErr(err, 'load the quotations'); repaintQ(); });
}

// ---------- invoices in Firebase Realtime Database ----------
// Saved at users/<uid>/invoices/<pushId>.
const invErr = (err, what) => { console.error(what, err); return /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Add the "invoices" rules under users/$uid and let the admin write portal/$cuid/invoices in Firebase.' : 'Could not ' + what + '. Please try again.'; };
const repaintI = () => { drawNotif(); if (!document.body.classList.contains('ready')) return; if (view === 'invoices') updateIView(); else if (view === 'overview' || view === 'accounting') paint(false); else if (view === 'source') updateSCView(); };
let offInv = () => {}, iSig = '', invKey = null, creatingInv = false;
function watchInvoices() {
  offInv(); I = []; iSig = ''; iError = ''; let first = true;
  offInv = onValue(ref(db, `users/${U.uid}/invoices`), snap => {
    const list = [];
    snap.forEach(ch => {
      const v = ch.val() || {};
      list.push({ id: ch.key, num: v.number || 'INV', to: v.billedTo || '', cid: v.customerId || '', cuid: v.customerUid || '', desc: v.description || '', pt: PAYT[v.paymentType] ? v.paymentType : '', amt: +v.amount || 0, due: v.dueDate || '', paid: v.paid === true, paidAt: +v.paidAt || 0, at: +v.createdAt || 0 });
    });
    list.sort((a, b) => b.at - a.at);
    const sig = JSON.stringify(list), wasFirst = first; first = false; iError = '';
    if (sig === iSig) return;
    I = list; iSig = sig; drawNotif();
    if (wasFirst) { if (document.body.classList.contains('ready') && (view === 'invoices' || view === 'overview' || view === 'accounting')) paint(true); else if (document.body.classList.contains('ready') && view === 'source') updateSCView(); } else repaintI();
  }, err => { iError = invErr(err, 'load your invoices'); if (document.body.classList.contains('ready') && (view === 'invoices' || view === 'overview' || view === 'accounting')) paint(false); });
}
// An invoice is only valid for a customer that exists in the database. It is saved under the admin and mirrored to
// portal/<customerUid>/invoices/<id> in one atomic write, so it shows in that customer's own dashboard.
async function invCustomer(cid) {
  const sn = await withTimeout(get(ref(db, `users/${U.uid}/customers/${cid}`)), 12000);
  if (!sn.exists()) return { err: 'That customer is not in your database. Choose a customer from your Customers list.' };
  const v = sn.val() || {};
  if (!v.uid) return { err: 'That customer has no portal login yet, so they could not see the invoice.' };
  if (v.disabled === true) return { err: 'That customer account is disabled. Enable it on the Customers page first.' };
  return { c: { id: cid, uid: v.uid, name: String(v.name || 'Customer'), company: String(v.company || '') } };
}
async function saveInvoice(f) {
  if (creatingInv) return;
  const d = new FormData(f), err = $('#iErr'), btn = $('#iSave'), editId = f.dataset.edit;
  const desc = String(d.get('webtype') || '').trim().slice(0, 120), pt = String(d.get('paytype') || '');
  const amt = Math.round(parseFloat(d.get('amt')) * 100) / 100;
  const bad = m => { err.textContent = m; };
  const cur = editId ? I.find(x => x.id === editId) : null;
  if (editId && !cur) { hideInvPanel(); return; }
  const cid = cur && cur.cid ? cur.cid : String(d.get('cust') || '');
  if (!cid) return bad(K.length ? 'Choose the customer this invoice is for.' : 'There are no customers yet. Add the customer on the Customers page first. Invoices can only be created for customers in your database.');
  if (!desc) return bad('Choose the website type.');
  if (!PAYT[pt]) return bad('Choose the payment type.');
  if (!(amt > 0) || amt > 1e9) return bad('Enter an amount greater than zero.');
  err.textContent = '';
  creatingInv = true; btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const r = await invCustomer(cid);   // checked against the database itself, not just the list on screen
    if (r.err) return bad(r.err);
    const c = r.c, bt = (c.company || c.name).slice(0, 80), ib = `users/${U.uid}/invoices`;
    if (cur) {
      const linking = !cur.cuid;
      if (!linking && desc === cur.desc && amt === cur.amt && pt === cur.pt) { hideInvPanel(); return; }   // nothing changed
      const up = { [`${ib}/${cur.id}/description`]: desc, [`${ib}/${cur.id}/amount`]: amt, [`${ib}/${cur.id}/paymentType`]: pt }, pb = `portal/${c.uid}/invoices/${cur.id}`;
      if (linking) {
        up[`${ib}/${cur.id}/billedTo`] = bt; up[`${ib}/${cur.id}/customerId`] = c.id; up[`${ib}/${cur.id}/customerUid`] = c.uid;
        up[pb] = Object.assign({ number: cur.num, description: desc, paymentType: pt, amount: amt, paid: cur.paid, paidAt: cur.paid ? (cur.paidAt || 0) : 0, createdAt: cur.at || 0 }, cur.due ? { dueDate: cur.due } : {});
      } else { up[`${pb}/description`] = desc; up[`${pb}/amount`] = amt; up[`${pb}/paymentType`] = pt; }
      await withTimeout(update(ref(db), up), 12000);
      hideInvPanel(); toast(cur.num + (linking ? ' linked to ' + bt : ' updated'));
      return;
    }
    const num = 'INV-' + (I.reduce((m, x) => Math.max(m, parseInt(String(x.num).replace(/\D/g, ''), 10) || 0), 1000) + 1);
    if (iflt !== 'all') { iflt = 'all'; document.querySelectorAll('[data-ipill]').forEach(x => x.className = pillCls(x.dataset.v === 'all')); }
    if (!invKey) invKey = push(ref(db, ib)).key;   // reused on retry, so a retry never creates a duplicate
    await withTimeout(update(ref(db), {
      [`${ib}/${invKey}`]: { number: num, billedTo: bt, customerId: c.id, customerUid: c.uid, description: desc, paymentType: pt, amount: amt, paid: false, createdAt: serverTimestamp() },
      [`portal/${c.uid}/invoices/${invKey}`]: { number: num, description: desc, paymentType: pt, amount: amt, paid: false, createdAt: serverTimestamp() }
    }), 12000);
    invKey = null; hideInvPanel(); toast(num + ' created for ' + bt);
  } catch (e2) {
    const c = String((e2 && (e2.code || e2.message)) || '');
    err.textContent = c === 'timeout' ? 'This is taking too long. Check your connection and try again.' : invErr(e2, cur ? 'update the invoice' : 'save the invoice');
  } finally { creatingInv = false; btn.disabled = false; btn.textContent = invEdit ? 'Save changes' : 'Create invoice'; }
}

// ---------- new project modal ----------
const modal = $('#modal'), mForm = $('#mForm'), mErr = $('#mErr'), mSave = $('#mSave'), incBox = $('#incBox'), incIn = $('#incIn');
const SUGGEST = ['Responsive design', 'Hosting & domain', 'SEO setup', 'Admin dashboard', 'Source code', 'Training'];
let inc = [], pendingKey = null, lastFocus = null, saving = false;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const showErr = (t, el) => { mErr.textContent = t; if (el) el.focus(); };

function drawInc() {
  incBox.querySelectorAll('[data-chip]').forEach(n => n.remove());
  inc.forEach((t, i) => incIn.insertAdjacentHTML('beforebegin', `<span data-chip class="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400">${esc(t)}<button type="button" data-rm="${i}" aria-label="Remove ${esc(t)}" class="w-4 h-4 rounded-full hover:bg-brand-500/30 flex items-center justify-center text-sm leading-none">&times;</button></span>`));
  $('#sugg').innerHTML = SUGGEST.filter(x => !inc.some(y => y.toLowerCase() === x.toLowerCase())).map(x => `<button type="button" data-s="${esc(x)}" class="px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-slate-400 hover:text-white transition">+ ${esc(x)}</button>`).join('');
}
function addInc(raw) {
  const t = raw.trim().replace(/\s+/g, ' ').slice(0, 60); if (!t) return false;
  if (inc.length >= 15) { showErr('You can add up to 15 inclusions.'); return false; }
  mErr.textContent = '';
  if (!inc.some(x => x.toLowerCase() === t.toLowerCase())) inc.push(t);
  drawInc(); return true;
}
function setSaving(on) {
  saving = on; mSave.disabled = on;
  $('#mSaveLabel').textContent = on ? 'Saving...' : 'Create project';
  const sp = $('#mSpin');
  if (on && !sp) mSave.insertAdjacentHTML('afterbegin', '<span class="q-spinner" id="mSpin"></span>');
  else if (!on && sp) sp.remove();
}
function openModal() {
  lastFocus = document.activeElement; inc = []; pendingKey = null;
  mForm.reset(); incIn.value = ''; mErr.textContent = '';
  const today = ymd(new Date()); $('#mStart').value = today; $('#mEnd').min = today; drawInc();
  modal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('open')));
  setTimeout(() => $('#mName').focus(), 60);
}
function closeModal() {
  if (saving) return;
  modal.classList.remove('open');
  setTimeout(() => { if (!modal.classList.contains('open')) modal.classList.remove('show'); }, 320);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

$('#mStart').addEventListener('change', e => { $('#mEnd').min = e.target.value; });
incIn.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (addInc(incIn.value)) incIn.value = ''; }
  else if (e.key === 'Backspace' && !incIn.value && inc.length) { inc.pop(); drawInc(); }
});
incBox.addEventListener('click', e => { const r = e.target.closest('[data-rm]'); if (r) { inc.splice(+r.dataset.rm, 1); drawInc(); } incIn.focus(); });
$('#sugg').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { addInc(b.dataset.s); incIn.focus(); } });
$('#mBack').addEventListener('click', closeModal);
$('#mClose').addEventListener('click', closeModal);
$('#mCancel').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
mForm.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...mForm.querySelectorAll('input, button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

mForm.addEventListener('submit', async e => {
  e.preventDefault(); if (saving) return;
  if (incIn.value.trim() && addInc(incIn.value)) incIn.value = '';
  const name = $('#mName').value.trim(), start = $('#mStart').value, end = $('#mEnd').value;
  if (!name) return showErr('Please enter a project name.', $('#mName'));
  if (!start) return showErr('Please choose a start date.', $('#mStart'));
  if (!end) return showErr('Please choose an end date.', $('#mEnd'));
  if (end < start) return showErr('The end date cannot be before the start date.', $('#mEnd'));
  if (!inc.length) return showErr('Add at least one inclusion.', incIn);
  const weeks = parseInt($('#mWeeks').value, 10);
  if (!(weeks >= 0 && weeks <= 260)) return showErr('Enter the free maintenance in weeks (0 to 260).', $('#mWeeks'));
  mErr.textContent = ''; setSaving(true); flt = 'all';
  try {
    const base = `users/${U.uid}/projects`;
    if (!pendingKey) pendingKey = push(ref(db, base)).key;   // reused on retry, so a retry never creates a duplicate
    await withTimeout(set(ref(db, `${base}/${pendingKey}`), {
      name, startDate: start, endDate: end, inclusions: inc.map(t => ({ t, d: false })), status: 'pending', maintenance: { weeks, fee: 0 },
      requestedBy: U.email || U.displayName || '', createdAt: serverTimestamp()
    }), 12000);
    setSaving(false); closeModal(); toast('Project request submitted');
  } catch (err) {
    setSaving(false);
    const code = String((err && (err.code || err.message)) || '');
    showErr(/PERMISSION_DENIED/i.test(code) ? 'Saving was blocked by the database rules. Please contact the site owner.'
      : code === 'timeout' ? 'This is taking too long. Check your connection and try again.'
      : 'Could not save the project. Please try again.');
  }
});

// ---------- maintenance fee modal (opened from Subscriptions) ----------
const fModal = $('#fModal'), fForm = $('#fForm'), fIn = $('#fIn'), fErr = $('#fErr'), fSave = $('#fSave');
let feeP = null, feeBusy = false, feeFocus = null;
function openFee(pid, trigger) {
  const p = findP(pid); if (!p || !p.cloud) return;
  feeP = p.id; feeFocus = trigger || document.activeElement;
  $('#fDesc').textContent = p.name; fIn.value = p.mf > 0 ? p.mf : ''; fErr.textContent = '';
  fModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => fModal.classList.add('open')));
  setTimeout(() => fIn.focus(), 60);
}
function closeFee() {
  if (feeBusy) return;
  fModal.classList.remove('open');
  setTimeout(() => { if (!fModal.classList.contains('open')) fModal.classList.remove('show'); }, 320);
  if (feeFocus && feeFocus.isConnected && feeFocus.focus) feeFocus.focus();
  feeP = null;
}
$('#fBack').addEventListener('click', closeFee);
$('#fClose').addEventListener('click', closeFee);
$('#fCancel').addEventListener('click', closeFee);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && fModal.classList.contains('open')) closeFee(); });
fForm.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...fForm.querySelectorAll('input, button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
fForm.addEventListener('submit', async e => {
  e.preventDefault(); if (feeBusy || !feeP) return;
  const fee = Math.round(parseFloat(fIn.value)), id = feeP;
  if (!(fee >= 0 && fee <= 1e7)) { fErr.textContent = 'Enter a fee between 0 and 10,000,000.'; fIn.focus(); return; }
  fErr.textContent = ''; feeBusy = true; fSave.disabled = true; fSave.textContent = 'Saving...';
  try { await withTimeout(update(ref(db, `users/${U.uid}/projects/${id}/maintenance`), { fee }), 12000); feeBusy = false; closeFee(); toast('Maintenance fee saved'); }
  catch (err) {
    const c = String((err && (err.code || err.message)) || '');
    fErr.textContent = c === 'timeout' ? 'This is taking too long. Check your connection and try again.' : failMsg(err, 'save the maintenance fee');
  } finally { feeBusy = false; fSave.disabled = false; fSave.textContent = 'Save fee'; }
});

// ---------- delete project modal ----------
const dModal = $('#dModal'), dForm = $('#dForm'), dIn = $('#dIn'), dBtn = $('#dBtn'), dErr = $('#dErr'), dHint = $('#dHint');
let delP = null, deleting = false, delFocus = null;
const delMatch = () => !!delP && dIn.value === delP.name;   // exact match, including case

function syncDel() {
  const ok = delMatch();
  dBtn.disabled = !ok || deleting;
  dErr.textContent = '';
  if (!dIn.value) { dHint.className = 'mt-2 text-xs min-h-[1rem]'; dHint.textContent = ''; }
  else if (ok) { dHint.className = 'mt-2 text-xs min-h-[1rem] text-emerald-300 font-semibold'; dHint.textContent = '\u2713 Name matches'; }
  else { dHint.className = 'mt-2 text-xs min-h-[1rem] text-slate-400'; dHint.textContent = 'The name must match exactly, including capitals and spaces.'; }
}
function setDeleting(on) {
  deleting = on; dIn.disabled = on;
  $('#dBtnLabel').textContent = on ? 'Deleting...' : 'Delete project';
  const sp = $('#dSpin');
  if (on && !sp) dBtn.insertAdjacentHTML('afterbegin', '<span class="q-spinner" id="dSpin"></span>');
  else if (!on && sp) sp.remove();
  dBtn.disabled = on || !delMatch();
}
function openDel(id, trigger) {
  const p = findP(id); if (!p) return;
  delP = { id: p.id, name: p.name, cloud: !!p.cloud, n: p.items.length };
  delFocus = trigger || document.activeElement;
  $('#dName').textContent = p.name;
  $('#dDesc').textContent = 'This will permanently delete this project and its ' + p.items.length + ' inclusion' + (p.items.length === 1 ? '' : 's') + '. This cannot be undone.';
  dIn.value = ''; dIn.disabled = false; setDeleting(false); syncDel();
  dModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => dModal.classList.add('open')));
  setTimeout(() => dIn.focus(), 60);
}
function closeDel() {
  if (deleting) return;
  dModal.classList.remove('open');
  setTimeout(() => { if (!dModal.classList.contains('open')) dModal.classList.remove('show'); }, 320);
  if (delFocus && delFocus.isConnected && delFocus.focus) delFocus.focus();
  delP = null;
}
dIn.addEventListener('input', syncDel);
$('#dBack').addEventListener('click', closeDel);
$('#dCancel').addEventListener('click', closeDel);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && dModal.classList.contains('open')) closeDel(); });
dForm.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...dForm.querySelectorAll('input, button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
dForm.addEventListener('submit', async e => {
  e.preventDefault(); if (deleting || !delP) return;
  // re-check on submit too, so pressing Enter can never skip the name check
  if (dIn.value !== delP.name) { dErr.textContent = 'The name you typed does not match the project name.'; dIn.focus(); return; }
  const target = delP; setDeleting(true);
  try {
    if (target.cloud) {
      // remove the project AND everything that still points at it, in one atomic write
      const up = { [`users/${U.uid}/projects/${target.id}`]: null };
      K.forEach(c => { if (c.projects.includes(target.id)) { up[`users/${U.uid}/customers/${c.id}/projects/${target.id}`] = null; if (c.uid) up[`portal/${c.uid}/projects/${target.id}`] = null; } });   // customers it was shared with
      Object.keys(MR || {}).forEach(u => { if (MR[u] && MR[u][target.id]) up[`maintenance/${u}/${target.id}`] = null; });   // maintenance requests for it
      await withTimeout(update(ref(db), up), 12000);
    }
    else { S.projects = S.projects.filter(x => String(x.id) !== String(target.id)); save(); }
    setDeleting(false); closeDel(); refresh(); toast('\u201c' + target.name + '\u201d deleted');
  } catch (err) {
    setDeleting(false);
    const code = String((err && (err.code || err.message)) || '');
    console.error('delete project', err);
    dErr.textContent = /PERMISSION_DENIED/i.test(code) ? 'Deleting was blocked by the database rules. Allow write access on users/$uid/projects in Firebase.'
      : code === 'timeout' ? 'This is taking too long. Check your connection and try again.'
      : 'Could not delete the project. Please try again.';
  }
});

// ---------- expenses (accounting) ----------
// Saved at users/<uid>/expenses/<pushId>: { label, category, amount, date, repeat, endDate, notes, createdAt }.
// A repeating expense (developer salary, hosting, domain...) is counted once for every billing date from its start date up to today,
// so the books stay right without typing the same expense every month.
const EXCAT = { salary: 'Developer salary', domain: 'Domain', hosting: 'Hosting', software: 'Software & tools', marketing: 'Marketing & ads', office: 'Office & utilities', tax: 'Taxes & fees', other: 'Other' };
const EXREP = { once: { l: 'One-time', m: 0 }, monthly: { l: 'Monthly', m: 1 }, quarterly: { l: 'Every 3 months', m: 3 }, yearly: { l: 'Yearly', m: 12 } };
const EXREP_DEF = { salary: 'monthly', hosting: 'monthly', domain: 'yearly', software: 'monthly' };   // sensible starting point per category
const money2 = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
let EX = [], exError = '', exEl = null, exOpen = false, exEdit = null, exSaving = false, exKey = null, exSig = '';
const exErr = (err, what) => { console.error(what, err); return /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Allow the signed-in admin to read and write "expenses" under users/$uid in Firebase.' : 'Could not ' + what + '. Please try again.'; };
// every date this expense has been paid on, up to and including `until` (YYYY-MM-DD)
function exDates(e, until) {
  const out = []; if (!/^\d{4}-\d\d-\d\d$/.test(e.date)) return out;
  if (e.rep === 'once' || !EXREP[e.rep] || !EXREP[e.rep].m) { if (e.date <= until) out.push(e.date); return out; }
  const step = EXREP[e.rep].m, end = e.end && e.end < until ? e.end : until, p = e.date.split('-').map(Number);
  for (let k = 0; k < 720; k++) {
    const t = new Date(p[0], p[1] - 1 + k * step, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    const ds = dstr(new Date(t.getFullYear(), t.getMonth(), Math.min(p[2], last)));   // a payment on the 31st lands on the last day of shorter months
    if (ds > end) break; out.push(ds);
  }
  return out;
}
// everything the books need, worked out in one place
function exBooks(today) {
  const pays = []; EX.forEach(e => exDates(e, today).forEach(d => pays.push({ e, d, amt: e.amt })));
  pays.sort((a, b) => b.d.localeCompare(a.d));
  const total = Math.round(pays.reduce((a, p) => a + p.amt, 0) * 100) / 100, cat = Object.create(null), mon = today.slice(0, 7);
  pays.forEach(p => { cat[p.e.cat] = Math.round(((cat[p.e.cat] || 0) + p.amt) * 100) / 100; });
  const thisMonth = Math.round(pays.filter(p => p.d.slice(0, 7) === mon).reduce((a, p) => a + p.amt, 0) * 100) / 100;
  // monthly cost of everything that is still running (a yearly domain counts as one twelfth each month)
  const run = Math.round(EX.filter(e => EXREP[e.rep] && EXREP[e.rep].m && (!e.end || e.end >= today)).reduce((a, e) => a + e.amt / EXREP[e.rep].m, 0) * 100) / 100;
  return { pays, total, cat, thisMonth, run };
}
// subscription fees collected (money in): one payment is recorded each time a subscription is marked renewed
function subBooks(today) {
  const pays = []; SUB.forEach(s => (s.pays || []).forEach(p => pays.push({ s, d: p.d, due: p.due, amt: p.amt })));
  pays.sort((a, b) => b.d.localeCompare(a.d));
  const r2 = n => Math.round(n * 100) / 100, mon = today.slice(0, 7);
  return { pays, total: r2(pays.reduce((a, p) => a + p.amt, 0)), thisMonth: r2(pays.filter(p => p.d.slice(0, 7) === mon).reduce((a, p) => a + p.amt, 0)),
    run: r2(SUB.filter(s => sLive(s)).reduce((a, s) => a + s.amt / SCYCLE[s.cycle].m, 0)), due: r2(sStats().mrr) };
}
function exDefaults(f) {
  const c = f.elements.cat.value, r = EXREP_DEF[c] || 'once';
  if (!f.dataset.edit) f.elements.rep.value = r;
  exSyncRep(f);
}
function exSyncRep(f) {
  const rep = f.elements.rep.value !== 'once';
  f.querySelector('[data-exend]').classList.toggle('hidden', !rep);
  f.querySelector('[data-exdlab]').textContent = rep ? 'First payment date' : 'Date paid';
  if (!rep) f.elements.end.value = '';
}
let exFocus = null;
function exUI() {
  if (exEl) return exEl;
  const lbl = 'block text-sm font-medium text-slate-300';
  exEl = document.createElement('div'); exEl.id = 'eModal'; exEl.className = 'fixed inset-0 z-[60] items-center justify-center p-4';
  exEl.setAttribute('role', 'dialog'); exEl.setAttribute('aria-modal', 'true'); exEl.setAttribute('aria-labelledby', 'exTitle');
  exEl.innerHTML = `<div id="eBack" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <form id="eForm" data-edit="" novalidate class="modal-card relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-6 sm:p-8">
      <div class="flex items-start justify-between gap-4 mb-5"><div class="min-w-0"><h2 id="exTitle" class="text-xl font-extrabold tracking-tight">New expense</h2><p class="mt-1 text-sm text-slate-400">Salaries, domain, hosting and other costs of running the business.</p></div>
        <button type="button" id="eClose" aria-label="Close" class="shrink-0 w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-300 hover:text-white transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="${lbl}">Category<select name="cat" required class="field mt-1.5">${Object.keys(EXCAT).map(k => `<option value="${k}">${esc(EXCAT[k])}</option>`).join('')}</select></label>
        <label class="${lbl}">Description<input name="label" required maxlength="80" autocomplete="off" class="field mt-1.5" placeholder="e.g. Juan Dela Cruz salary, Hostinger plan"/></label>
        <label class="${lbl}">Amount (PHP)<input name="amt" type="number" inputmode="decimal" min="0.01" max="1000000000" step="0.01" required class="field mt-1.5" placeholder="15000"/></label>
        <label class="${lbl}">Repeats<select name="rep" required class="field mt-1.5">${Object.keys(EXREP).map(k => `<option value="${k}">${esc(EXREP[k].l)}</option>`).join('')}</select></label>
        <label class="${lbl}"><span data-exdlab>Date paid</span><input name="date" type="date" required class="field mt-1.5"/></label>
        <label class="${lbl} hidden" data-exend>Stops after (optional)<input name="end" type="date" class="field mt-1.5"/></label>
        <label class="${lbl} sm:col-span-2">Private notes (optional)<input name="notes" maxlength="200" autocomplete="off" class="field mt-1.5" placeholder="e.g. registrar, receipt number or payment method"/></label>
      </div>
      <p class="mt-4 text-xs text-slate-400">A repeating expense is counted on every payment date from the first date up to today. Set "Stops after" when a salary, plan or subscription ends.</p>
      <p id="exErrMsg" class="mt-2 text-sm text-red-400 min-h-[1.25rem]" role="alert"></p>
      <div class="mt-2 flex flex-wrap justify-end gap-3"><button type="button" id="eCancel" class="px-6 py-3 rounded-xl glass font-semibold text-slate-300 hover:text-white transition">Cancel</button><button type="submit" id="exSave" class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white">Add expense</button></div></form>`;
  document.body.appendChild(exEl);
  const f = exEl.querySelector('form'), close = () => { if (!exSaving) hideExPanel(); };
  f.elements.cat.addEventListener('change', () => exDefaults(f));
  f.elements.rep.addEventListener('change', () => exSyncRep(f));
  f.addEventListener('submit', e => { e.preventDefault(); saveExpense(f); });
  exEl.querySelector('#eBack').addEventListener('click', close);
  exEl.querySelector('#eClose').addEventListener('click', close);
  exEl.querySelector('#eCancel').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && exOpen && !xModal.classList.contains('open')) close(); });
  return exEl;
}
function showExPanel(x) {
  const panel = exUI(), f = panel.querySelector('form'); exEdit = x ? x.id : null; exOpen = true; exFocus = document.activeElement;
  f.reset(); f.dataset.edit = x ? x.id : '';
  if (x) { f.elements.cat.value = x.cat; f.elements.label.value = x.name; f.elements.amt.value = x.amt; f.elements.rep.value = x.rep; f.elements.date.value = x.date; f.elements.end.value = x.end; f.elements.notes.value = x.notes; }
  else { f.elements.cat.value = 'salary'; f.elements.rep.value = EXREP_DEF.salary; f.elements.date.value = dstr(new Date()); }
  exSyncRep(f);
  $('#exTitle').textContent = x ? 'Edit expense' : 'New expense'; $('#exSave').textContent = x ? 'Save changes' : 'Add expense'; $('#exErrMsg').textContent = '';
  panel.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
  setTimeout(() => { if (exOpen) f.elements.label.focus({ preventScroll: true }); }, 120);
}
function hideExPanel() {
  exOpen = false; exEdit = null; if (!exEl) return;
  exEl.classList.remove('open');
  setTimeout(() => { if (!exEl.classList.contains('open')) exEl.classList.remove('show'); }, 320);
  if (exFocus && exFocus.isConnected && exFocus.focus) exFocus.focus({ preventScroll: true });
}
async function saveExpense(f) {
  if (exSaving) return;
  const d = new FormData(f), err = $('#exErrMsg'), btn = $('#exSave'), editId = f.dataset.edit, bad = m => { err.textContent = m; };
  const cat = String(d.get('cat') || ''), rep = String(d.get('rep') || ''), date = String(d.get('date') || ''), end = rep === 'once' ? '' : String(d.get('end') || '');
  const label = String(d.get('label') || '').trim().replace(/\s+/g, ' ').slice(0, 80), notes = String(d.get('notes') || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  const amt = Math.round(parseFloat(d.get('amt')) * 100) / 100, cur = editId ? EX.find(x => x.id === editId) : null;
  if (editId && !cur) { hideExPanel(); return; }
  if (!EXCAT[cat]) return bad('Choose the category.');
  if (!label) return bad('Enter a short description.');
  if (!(amt > 0) || amt > 1e9) return bad('Enter an amount greater than zero.');
  if (!EXREP[rep]) return bad('Choose how often this is paid.');
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || isNaN(new Date(date + 'T00:00:00'))) return bad('Enter the date.');
  if (end && !/^\d{4}-\d\d-\d\d$/.test(end)) return bad('The stop date is not valid.');
  if (end && end < date) return bad('The stop date cannot be before the first payment date.');
  err.textContent = ''; exSaving = true; btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const base = `users/${U.uid}/expenses`, rec = { label, category: cat, amount: amt, date, repeat: rep, endDate: end || null, notes: notes || null };
    if (cur) {
      const up = {}; Object.keys(rec).forEach(k => { up[`${base}/${cur.id}/${k}`] = rec[k]; });
      await withTimeout(update(ref(db), up), 12000); hideExPanel(); toast('Expense updated');
    } else {
      if (!exKey) exKey = push(ref(db, base)).key;   // reused on retry, so a retry never creates a duplicate
      await withTimeout(update(ref(db), { [`${base}/${exKey}`]: Object.assign({ createdAt: serverTimestamp() }, rec) }), 12000);
      exKey = null; hideExPanel(); toast('Expense added');
    }
  } catch (e2) {
    const m = String((e2 && (e2.code || e2.message)) || '');
    err.textContent = m === 'timeout' ? 'This is taking too long. Check your connection and try again.' : exErr(e2, cur ? 'update the expense' : 'save the expense');
  } finally { exSaving = false; btn.disabled = false; btn.textContent = exEdit ? 'Save changes' : 'Add expense'; }
}
let offEx = () => {};
function watchExpenses() {
  offEx(); EX = []; exSig = ''; exError = '';
  offEx = onValue(ref(db, `users/${U.uid}/expenses`), snap => {
    const list = [];
    snap.forEach(ch => {
      const v = ch.val() || {};
      list.push({ id: ch.key, name: String(v.label || ''), cat: EXCAT[v.category] ? v.category : 'other', amt: Math.round((+v.amount || 0) * 100) / 100, date: String(v.date || ''), rep: EXREP[v.repeat] ? v.repeat : 'once', end: String(v.endDate || ''), notes: String(v.notes || ''), at: +v.createdAt || 0 });
    });
    list.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
    const sig = JSON.stringify(list); exError = '';
    if (sig === exSig) return;
    EX = list; exSig = sig;
    if (document.body.classList.contains('ready') && view === 'accounting') paint(false);
  }, err => { exError = exErr(err, 'load your expenses'); if (document.body.classList.contains('ready') && view === 'accounting') paint(false); });
}
function openXExp(id, trigger) {
  const x = EX.find(y => y.id === id); if (!x) return;
  xSetup('expense'); delI = { kind: 'expense', id: x.id, num: x.name }; xFocus = trigger || document.activeElement;
  $('#xDesc').textContent = 'This will permanently delete the ' + EXCAT[x.cat].toLowerCase() + ' expense "' + x.name + '" (' + money2(x.amt) + (x.rep === 'once' ? '' : ', ' + EXREP[x.rep].l.toLowerCase()) + ') and remove every payment counted from it in your accounting. This cannot be undone.';
  xIn.value = ''; xIn.disabled = false; setXDeleting(false); syncX();
  xModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => xModal.classList.add('open')));
  setTimeout(() => xIn.focus(), 60);
}

// ---------- delete invoice modal ----------
const xModal = $('#xModal'), xForm = $('#xForm'), xIn = $('#xIn'), xBtn = $('#xBtn'), xErr = $('#xErr'), xHint = $('#xHint');
let X_PHRASE = 'Delete this Invoice', X_LABEL = 'Delete invoice', X_BUSY = 'Deleting...';
let delI = null, xDeleting = false, xFocus = null;
const xMatch = () => !!delI && xIn.value === X_PHRASE;   // exact match, including case
function syncX() {
  const ok = xMatch();
  xBtn.disabled = !ok || xDeleting; xErr.textContent = '';
  if (!xIn.value) { xHint.className = 'mt-2 text-xs min-h-[1rem]'; xHint.textContent = ''; }
  else if (ok) { xHint.className = 'mt-2 text-xs min-h-[1rem] text-emerald-300 font-semibold'; xHint.textContent = '\u2713 Phrase matches'; }
  else { xHint.className = 'mt-2 text-xs min-h-[1rem] text-slate-400'; xHint.textContent = 'The phrase must match exactly, including capitals and spaces.'; }
}
function setXDeleting(on) {
  xDeleting = on; xIn.disabled = on;
  $('#xBtnLabel').textContent = on ? X_BUSY : X_LABEL;
  const sp = $('#xSpin');
  if (on && !sp) xBtn.insertAdjacentHTML('afterbegin', '<span class="q-spinner" id="xSpin"></span>');
  else if (!on && sp) sp.remove();
  xBtn.disabled = on || !xMatch();
}
function openXDel(id, trigger) {
  const i = I.find(x => x.id === id); if (!i) return;
  xSetup('invoice'); delI = { kind: 'invoice', id: i.id, num: i.num, cuid: invMirror(i) ? i.cuid : '' }; xFocus = trigger || document.activeElement;
  $('#xDesc').textContent = 'This will permanently delete ' + i.num + ' (' + money(i.amt) + (i.to ? ', billed to ' + i.to : '') + ')' + (invMirror(i) ? ' and remove it from their dashboard' : '') + '. This cannot be undone.';
  xIn.value = ''; xIn.disabled = false; setXDeleting(false); syncX();
  xModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => xModal.classList.add('open')));
  setTimeout(() => xIn.focus(), 60);
}
function openXSub(id, trigger) {
  const x = SUB.find(y => y.id === id); if (!x) return;
  xSetup('sub'); delI = { kind: 'sub', id: x.id, num: x.name, cuid: x.cuid && K.some(c => c.id === x.cid && c.uid === x.cuid) ? x.cuid : '' }; xFocus = trigger || document.activeElement;
  $('#xDesc').textContent = 'This will permanently delete the ' + STYPE[x.type].l.toLowerCase() + ' subscription "' + x.name + '" (' + money(x.amt) + ' per ' + SCYCLE[x.cycle].per + ')' + (x.to ? ' for ' + x.to : '') + (delI.cuid ? ' and remove it from their dashboard' : '') + '. This cannot be undone.';
  xIn.value = ''; xIn.disabled = false; setXDeleting(false); syncX();
  xModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => xModal.classList.add('open')));
  setTimeout(() => xIn.focus(), 60);
}
function closeXDel() {
  if (xDeleting) return;
  xModal.classList.remove('open');
  setTimeout(() => { if (!xModal.classList.contains('open')) xModal.classList.remove('show'); }, 320);
  if (xFocus && xFocus.isConnected && xFocus.focus) xFocus.focus();
  delI = null;
}
xIn.addEventListener('input', syncX);
$('#xBack').addEventListener('click', closeXDel);
$('#xCancel').addEventListener('click', closeXDel);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && xModal.classList.contains('open')) closeXDel(); });
xForm.addEventListener('keydown', e => {   // keep Tab inside the modal
  if (e.key !== 'Tab') return;
  const f = [...xForm.querySelectorAll('input, button')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
xForm.addEventListener('submit', async e => {
  e.preventDefault(); if (xDeleting || !delI) return;
  // re-check on submit too, so pressing Enter can never skip the phrase check
  if (xIn.value !== X_PHRASE) { xErr.textContent = 'Type "' + X_PHRASE + '" exactly to confirm.'; xIn.focus(); return; }
  const t = delI; setXDeleting(true);
  try {
    if (t.kind === 'disable') await withTimeout(update(ref(db), { [`users/${U.uid}/customers/${t.id}/disabled`]: true, [`portal/${t.uid}/disabled`]: true, [`portal/${t.uid}/revoked`]: true }), 12000);
    else if (t.kind === 'cust') {
      t.authGone = await delAuthViaFunction(t.uid);   // deletes their login with the Admin SDK (works even after they changed their password)
      await withTimeout(update(ref(db), { [`users/${U.uid}/customers/${t.id}`]: null, [`portal/${t.uid}`]: { admin: U.uid, revoked: true } }), 12000);   // access is cut right away
      // then clean up everything else saved for this customer, and delete their login from Firebase Authentication
      await Promise.allSettled([`portal/${t.uid}`, `chats/${t.uid}`, `maintenance/${t.uid}`, `activity/${t.uid}`].map(path => withTimeout(remove(ref(db, path)), 12000)));
      if (!t.authGone) t.authGone = await delAuthAccount(t.email);   // fallback: only works while the password is still the default
    }
    else if (t.kind === 'sub') { const up = { [`users/${U.uid}/subscriptions/${t.id}`]: null }; if (t.cuid) up[`portal/${t.cuid}/subscriptions/${t.id}`] = null; await withTimeout(update(ref(db), up), 12000); }
    else if (t.kind === 'source') { const up = { [`users/${U.uid}/sourcecodes/${t.id}`]: null }; if (t.cuid) up[`portal/${t.cuid}/sourcecode/${t.id}`] = null; await withTimeout(update(ref(db), up), 12000); if (scEdit === t.id) hideSCPanel(); }
    else if (t.kind === 'expense') { await withTimeout(update(ref(db), { [`users/${U.uid}/expenses/${t.id}`]: null }), 12000); if (exEdit === t.id) hideExPanel(); }
    else { const up = { [`users/${U.uid}/invoices/${t.id}`]: null }; if (t.cuid) up[`portal/${t.cuid}/invoices/${t.id}`] = null; await withTimeout(update(ref(db), up), 12000); if (invEdit === t.id) hideInvPanel(); }
    setXDeleting(false); closeXDel(); toast(t.kind === 'disable' ? t.num + ' can no longer log in' : t.kind === 'cust' ? (t.authGone ? t.num + ' deleted from the dashboard and Firebase' : t.num + ' deleted. Their login could not be removed automatically (the password was changed). Delete it in Firebase Authentication.') : t.num + ' deleted');
  } catch (err) {
    setXDeleting(false); xErr.textContent = t.kind === 'disable' ? kErr(err, 'disable the account') : t.kind === 'cust' ? kErr(err, 'delete the customer') : t.kind === 'sub' ? subErr(err, 'delete the subscription') : t.kind === 'source' ? scErr(err, 'delete the source code') : t.kind === 'expense' ? exErr(err, 'delete the expense') : invErr(err, 'delete the invoice');
  }
});

// ---------- send an email from the Quotations page ----------
// Sent through EmailJS (template EMAILJS.replyTemplateId). The template receives: to_email, to_name, message, from_name. The subject line is set in the EmailJS template.
// Replying to a quotation also marks it as emailed.
let qmEl = null, qmOpen = false, qmBusy = false, qmQ = null, qmFocus = null;
function qmUI() {
  if (qmEl) return qmEl;
  const lbl = 'block text-sm font-medium text-slate-300';
  qmEl = document.createElement('div'); qmEl.id = 'qmModal'; qmEl.className = 'fixed inset-0 z-[60] items-center justify-center p-4';
  qmEl.style.cssText = 'display:none;padding:max(1rem,env(safe-area-inset-top,0px)) max(1rem,env(safe-area-inset-right,0px)) max(1rem,env(safe-area-inset-bottom,0px)) max(1rem,env(safe-area-inset-left,0px))';
  qmEl.setAttribute('role', 'dialog'); qmEl.setAttribute('aria-modal', 'true'); qmEl.setAttribute('aria-labelledby', 'qmTitle');
  qmEl.innerHTML = `<div data-qmback class="absolute inset-0 bg-black/60 backdrop-blur-sm" style="opacity:0;transition:opacity .3s ease"></div>
    <form data-qmform novalidate class="modal-card relative w-full max-w-2xl overflow-y-auto rounded-3xl p-6 sm:p-8" style="max-height:calc(100dvh - 2rem);opacity:0;transform:translateY(18px) scale(.97);transition:opacity .3s ease,transform .35s cubic-bezier(.2,.7,.2,1)">
      <div class="flex items-start justify-between gap-4 mb-5"><div class="min-w-0"><h2 id="qmTitle" class="text-xl font-extrabold tracking-tight">Send <span class="gradient-text">email</span></h2><p data-qmhint class="mt-1 text-sm text-slate-400"></p></div>
        <button type="button" data-qmclose aria-label="Close" class="shrink-0 w-10 h-10 rounded-xl glass flex items-center justify-center text-slate-300 hover:text-white transition"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="${lbl}">To (email)<input name="to" type="email" required maxlength="120" autocomplete="off" class="field mt-1.5" placeholder="name@company.com"/></label>
        <label class="${lbl}">Recipient name<input name="name" maxlength="60" autocomplete="off" class="field mt-1.5" placeholder="Customer name"/></label>

        <label class="${lbl} sm:col-span-2">Message<textarea name="message" required rows="9" maxlength="5000" class="field mt-1.5" style="resize:vertical;min-height:11rem" placeholder="Write your message..."></textarea></label>
      </div>
      <p data-qmerr class="mt-3 text-sm text-red-400 min-h-[1.25rem]" role="alert"></p>
      <div class="mt-2 flex flex-wrap justify-end gap-3"><button type="button" data-qmcancel class="px-6 py-3 rounded-xl glass font-semibold text-slate-300 hover:text-white transition">Cancel</button><button type="submit" data-qmsend class="btn-shine px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white">Send email</button></div></form>`;
  document.body.appendChild(qmEl);
  const f = qmEl.querySelector('form'), close = () => { if (!qmBusy) closeQMail(); };
  qmEl.querySelector('[data-qmback]').addEventListener('click', close);
  qmEl.querySelector('[data-qmclose]').addEventListener('click', close);
  qmEl.querySelector('[data-qmcancel]').addEventListener('click', close);
  f.addEventListener('submit', e => { e.preventDefault(); sendQMail(f); });
  f.addEventListener('keydown', e => {   // keep Tab inside the modal
    if (e.key !== 'Tab') return;
    const els = [...f.querySelectorAll('input, textarea, button')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && qmOpen && !qmBusy) closeQMail(); });
  return qmEl;
}
function openQMail(q, trigger) {
  const el = qmUI(), f = el.querySelector('form'); qmQ = q ? q.id : null; qmFocus = trigger || document.activeElement; qmOpen = true;
  f.reset();
  f.elements.to.value = q ? q.email : ''; f.elements.name.value = q ? q.name : '';
  f.elements.message.value = q ? 'Hi ' + q.name + ',\n\nThank you for reaching out to EM Development about ' + (q.service || 'your project') + '.\n\n\n\nBest regards,\nEM Development' : '';
  el.querySelector('[data-qmhint]').textContent = q ? 'Replying to ' + q.name + '. This quotation is marked as emailed once the email is sent.' : 'Write a new email to anyone. It is sent from your EM Development email address.';
  el.querySelector('[data-qmerr]').textContent = '';
  el.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => { el.querySelector('[data-qmback]').style.opacity = '1'; const fm = el.querySelector('[data-qmform]'); fm.style.opacity = '1'; fm.style.transform = 'none'; }));
  setTimeout(() => { if (qmOpen) { const m = f.elements.message; if (q) { m.focus({ preventScroll: true }); const pos = m.value.indexOf('\n\n\n\n') + 2; m.setSelectionRange(pos, pos); } else f.elements.to.focus({ preventScroll: true }); } }, 120);
}
function closeQMail() {
  qmOpen = false; if (!qmEl) return;
  qmEl.querySelector('[data-qmback]').style.opacity = '0';
  const fm = qmEl.querySelector('[data-qmform]'); fm.style.opacity = '0'; fm.style.transform = 'translateY(18px) scale(.97)';
  setTimeout(() => { if (!qmOpen) qmEl.style.display = 'none'; }, 320);
  if (qmFocus && qmFocus.isConnected && qmFocus.focus) qmFocus.focus({ preventScroll: true });
}
async function sendQMail(f) {
  if (qmBusy) return;
  const err = qmEl.querySelector('[data-qmerr]'), btn = qmEl.querySelector('[data-qmsend]'), bad = m => { err.textContent = m; };
  const to = String(f.elements.to.value || '').trim(), name = String(f.elements.name.value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const message = String(f.elements.message.value || '').trim().slice(0, 5000);
  if (!/^\S+@\S+\.\S+$/.test(to)) return bad('Enter a valid email address to send to.');
  if (!message) return bad('Write a message.');
  if (!replyReady()) return bad('Email sending is not set up. Check the EMAILJS settings at the top of the script.');
  err.textContent = ''; qmBusy = true; btn.disabled = true; btn.textContent = 'Sending...';
  const qid = qmQ, r = await emailjsSend(EMAILJS.replyTemplateId, { to_email: to, email: to, to, recipient: to, user_email: to, reply_to: 'emdevelopmentph@gmail.com', to_name: name || to, name: name || to, message, from_name: 'EM Development' });
  qmBusy = false; btn.disabled = false; btn.textContent = 'Send email';
  trkLog({ type: 'email', kind: qid ? 'Quotation reply' : 'New email', to, toName: name, status: r.ok ? 'sent' : 'failed', detail: r.ok ? '' : String(r.err || '').slice(0, 140), preview: message.slice(0, 140), ref: qid || '' });
  if (!r.ok) return bad('The email could not be sent. ' + r.err);
  closeQMail();
  const q = qid ? Q.find(x => x.id === qid) : null;
  if (q && !q.emailSent) {   // a reply marks the quotation as emailed
    q.emailSent = true; q.emailAt = Date.now(); repaintQ();
    try { await update(ref(db, `quotes/${q.id}`), { emailSent: true, emailSentAt: serverTimestamp() }); toast('Email sent to ' + to); }
    catch (e2) { q.emailSent = false; q.emailAt = 0; repaintQ(); toast('Email sent to ' + to + ', but it could not be marked as emailed.'); }
  } else toast('Email sent to ' + to);
}

// ---------- customers (admin side) ----------
// Saved at users/<adminUid>/customers/<id>. Each customer also gets portal/<customerUid>, which tells their login whose projects to show.
const TEMP_PW = '123456';   // every new customer starts with this; the email tells them to change it
const kErr = (err, what) => { console.error(what, err); return /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Add the "portal" and "customers" rules in Firebase.' : 'Could not ' + what + '. Please try again.'; };
let kHold = false, kt = null;
const repaintK = () => {
  chSync(); trkSync();
  if (!document.body.classList.contains('ready')) return;
  if (view === 'subscriptions') return updateSView();
  if (view === 'source') return updateSCView();
  if (view === 'proposal') { if (prEl && prEl._sync) prEl._sync(); return; }
  if (view === 'contracts') { if (ctEl && ctEl._sync) ctEl._sync(); return; }   // just refresh the customer list in the contract form
  if (view !== 'customers' || kHold) return;
  const grid = $('#kgrid'), gone = grid ? [...grid.querySelectorAll('[data-kid]')].filter(n => !K.some(c => c.id === n.dataset.kid)) : [];
  if (!gone.length) { if (!kt) paint(false); return; }   // an unrelated change redraws now, unless a fade-out is already running
  gone.forEach(collapseOut);   // a removed customer fades out and the gap closes before the list is redrawn
  clearTimeout(kt); kt = setTimeout(() => { kt = null; if (view === 'customers') paint(false); }, 650);
};
let offK = () => {}, kSig = '';
function watchCustomers() {
  offK(); K = []; kSig = ''; kError = '';
  offK = onValue(ref(db, `users/${U.uid}/customers`), snap => {
    const list = [];
    snap.forEach(ch => { const v = ch.val() || {}; list.push({ id: ch.key, uid: v.uid || '', name: v.name || 'Customer', email: v.email || '', company: v.company || '', phone: v.phone || '', projects: Object.keys(v.projects || {}), update: v.update || '', updatedAt: +v.updatedAt || 0, at: +v.createdAt || 0, disabled: v.disabled === true }); });
    list.sort((a, b) => b.at - a.at);
    const sig = JSON.stringify(list); kError = '';
    if (sig === kSig) return; K = list; kSig = sig; repaintK();
  }, err => { kError = kErr(err, 'load your customers'); repaintK(); });
}
async function saveCustomer(f) {
  if (kBusy) return;
  const d = new FormData(f), err = $('#kErrMsg'), btn = $('#kSave'), bad = m => { err.textContent = m; };
  const name = String(d.get('name') || '').trim().replace(/\s+/g, ' ').slice(0, 60), company = String(d.get('company') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const email = String(d.get('email') || '').trim().toLowerCase(), phone = String(d.get('phone') || '').trim().slice(0, 30), pw = TEMP_PW;
  const shared = d.getAll('proj').filter(id => C.some(p => p.id === id));
  if (!name) return bad("Enter the customer's name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Enter a valid email address.');
  err.textContent = ''; kBusy = true; kHold = true; btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const a2 = acctAuth(), cred = await withTimeout(createUserWithEmailAndPassword(a2, email, pw), 15000);
    try { await updateProfile(cred.user, { displayName: name }); } catch (e) {}
    const cuid = cred.user.uid; await signOut(a2).catch(() => {});
    const cid = push(ref(db, `users/${U.uid}/customers`)).key, pm = {}; shared.forEach(id => { pm[id] = true; });
    const projects = shared.length ? pm : null;
    await withTimeout(update(ref(db), {
      [`users/${U.uid}/customers/${cid}`]: { name, email, company, phone, uid: cuid, projects, createdAt: serverTimestamp() },
      [`portal/${cuid}`]: { admin: U.uid, cid, name, email, company, projects, update: '', updatedAt: 0 }
    }), 12000);
    kOpen = false; toast('Account created');
    const pn = $('#kPanel'); if (pn) { pn.classList.remove('open'); pn.setAttribute('inert', ''); }   // the form folds away first
    await new Promise(r => setTimeout(r, 520));
    kBusy = false; kHold = false;
    if (view === 'customers') {
      paint(false);   // then the new customer card fades in
      const nc = $('[data-kid="' + cid + '"]'); if (nc) { nc.classList.add('fade-item'); nc.style.setProperty('--i', 0); }
    }
  } catch (e) {
    kBusy = false; kHold = false; btn.disabled = false; btn.textContent = 'Create account';
    const c = String((e && (e.code || e.message)) || '');
    bad(/email-already-in-use/.test(c) ? 'That email already has an account.' : /invalid-email/.test(c) ? 'That email address is not valid.' : /weak-password/.test(c) ? 'Choose a stronger password (8+ characters).' : /PERMISSION_DENIED/i.test(c) ? 'The login was created, but the database rules blocked saving the customer. Add the "portal" and "customers" rules in Firebase.' : c === 'timeout' ? 'This is taking too long. Check your connection and try again.' : 'Could not create the account. Please try again.');
  }
}
// deletes the customer's login from Firebase Authentication. Only possible while they still use the default password,
// because a browser can only delete an account it is signed in to. Returns false when it could not be done.
async function delAuthViaFunction(cuid) {
  if (!cuid) return false;
  try {
    const r = await withTimeout(httpsCallable(getFunctions(app), 'deleteCustomerAuth')({ uid: cuid }), 15000);
    return !!(r.data && r.data.ok);
  } catch (e) { console.warn('deleteCustomerAuth is not available, falling back', e); return false; }
}
async function delAuthAccount(email) {
  const a2 = acctAuth();
  try {
    const cred = await withTimeout(signInWithEmailAndPassword(a2, email, TEMP_PW), 15000);
    await withTimeout(deleteUser(cred.user), 15000);
    return true;
  } catch (e) { console.error('delete login', e); try { await signOut(a2); } catch (e2) {} return false; }
}
function xSetup(kind) {
  // [phrase to type, button label, modal title, button label while working]
  const m = { cust: ['Delete this Customer', 'Delete customer', 'Delete customer?', 'Deleting...'],
              disable: ['Disable Account', 'Disable account', 'Disable account?', 'Disabling...'],
              invoice: ['Delete this Invoice', 'Delete invoice', 'Delete invoice?', 'Deleting...'],
              sub: ['Delete this Subscription', 'Delete subscription', 'Delete subscription?', 'Deleting...'],
              expense: ['Delete this Expense', 'Delete expense', 'Delete expense?', 'Deleting...'],
              source: ['Delete this Source Code', 'Delete source code', 'Delete source code?', 'Deleting...'] }[kind];
  X_PHRASE = m[0]; X_LABEL = m[1]; X_BUSY = m[3];
  $('#xTitle').textContent = m[2]; $('#xPhrase').textContent = X_PHRASE; xIn.placeholder = X_PHRASE;
}
function openXCust(id, trigger) {
  const c = K.find(x => x.id === id); if (!c) return;
  xSetup('cust'); delI = { kind: 'cust', id: c.id, uid: c.uid, num: c.name, email: c.email }; xFocus = trigger || document.activeElement;
  $('#xDesc').textContent = 'This permanently deletes ' + c.name + ' from your customers and from Firebase: their login, portal page, chat and maintenance records. This cannot be undone.';
  xIn.value = ''; xIn.disabled = false; setXDeleting(false); syncX();
  xModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => xModal.classList.add('open')));
  setTimeout(() => xIn.focus(), 60);
}
function openXDisable(id, trigger) {
  const c = K.find(x => x.id === id); if (!c || !c.uid) return;
  xSetup('disable'); delI = { kind: 'disable', id: c.id, uid: c.uid, num: c.name }; xFocus = trigger || document.activeElement;
  $('#xDesc').textContent = c.name + ' will not be able to log in, and anyone using the portal right now will be signed out. Their projects and data are kept, and you can enable the account again at any time.';
  xIn.value = ''; xIn.disabled = false; setXDeleting(false); syncX();
  xModal.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => xModal.classList.add('open')));
  setTimeout(() => xIn.focus(), 60);
}
// keep open "Manage" panels and half-typed updates when the list redraws
$('#view').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.kd) { if (d.open) kOpenSet.add(d.dataset.kd); else kOpenSet.delete(d.dataset.kd); } }, true);
$('#view').addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.kdraft) kDraft[t.dataset.kdraft] = t.value; });

// ---------- customer portal (customer side, read only) ----------
let offPortalNode = () => {}, PW = {};
const portalBlocked = p => !!(p && (p.revoked || p.disabled));
// A disabled (or deleted) customer is signed out straight away and the login page tells them why
const denyPortal = () => {
  try { sessionStorage.setItem('loginNotice', 'disabled'); } catch (e) {}
  signOut(auth).catch(() => leave(LOGIN_URL));   // the signed-out handler below takes them to the login page
};
const repaintP = () => { if (document.body.classList.contains('ready') && (view === 'portal' || view === 'source')) paint(false); };
function watchPortal() {
  offPortalNode();
  offPortalNode = onValue(ref(db, `portal/${U.uid}`), snap => {
    PORTAL = snap.val() || { revoked: true };
    if (portalBlocked(PORTAL)) { denyPortal(); return; }
    const want = (PORTAL.revoked || PORTAL.disabled) ? [] : Object.keys(PORTAL.projects || {});
    Object.keys(PW).forEach(id => { if (!want.includes(id)) { PW[id](); delete PW[id]; delete PP[id]; } });
    want.forEach(id => {
      if (PW[id]) return;
      PW[id] = onValue(ref(db, `users/${PORTAL.admin}/projects/${id}`), s => {
        const v = s.val();
        PP[id] = v ? { id, name: v.name || 'Untitled project', start: v.startDate, due: v.endDate, items: arr(v.inclusions).map(x => typeof x === 'string' ? { t: x, d: false } : { t: x.t, d: x.d === true }), archived: v.archived === true } : null;
        repaintP();
      }, () => { PP[id] = null; repaintP(); });
    });
    repaintP();
  }, () => { PORTAL = { revoked: true }; repaintP(); });
}
const stopAll = () => { chStop(); trkStop(); offProjects(); offMR(); offQuotes(); offInv(); offEx(); offSub(); offSC(); offK(); offPortalNode(); Object.values(PW).forEach(f => f()); PW = {}; };

// ---------- tracker: logins, logouts and emails sent ----------
// Every person writes their own entries at activity/<uid>/<pushId>; the admin reads their own and every customer's.
// { type: login | logout | email, actor, name, email, at, kind, to, toName, status, detail, preview, ref }
let TR = {}, trOff = {}, trError = '', trflt = 'all', trq = '';
const TRT = {
  login: { l: 'Signed in', c: 'text-aqua bg-aqua/15', ic: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3' },
  logout: { l: 'Signed out', c: 'text-slate-300 bg-white/10', ic: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' },
  email: { l: 'Email sent', c: 'text-emerald-300 bg-emerald-400/15', ic: ICON.messages },
  failed: { l: 'Email failed', c: 'text-red-300 bg-red-500/15', ic: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01' }
};
const trKind = e => e.type === 'email' ? (e.status === 'failed' ? 'failed' : 'email') : e.type;
const trTime = t => new Date(t).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const trErr = err => /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Blocked by the database rules. Add the "activity" rules in Firebase so the tracker can save and read entries.' : 'Could not load the tracker. Please try again.';
// save one entry for the signed-in person; returns true when it was saved
async function trkLog(rec, key, at, ms) {
  if (!U) return false;
  try {
    const base = `activity/${U.uid}`, k = key || push(ref(db, base)).key, out = { actor: PORTAL ? 'customer' : 'admin', name: String(U.displayName || (U.email || '').split('@')[0] || 'User').slice(0, 60), email: String(U.email || '').slice(0, 120), at: at || serverTimestamp() };
    Object.keys(rec).forEach(x => { if (rec[x] !== undefined && rec[x] !== null) out[x] = typeof rec[x] === 'string' ? rec[x].slice(0, 200) : rec[x]; });
    await withTimeout(set(ref(db, `${base}/${k}`), out), ms || 8000);
    return true;
  } catch (e) { console.error('tracker', e); return false; }
}
// a new sign-in is spotted by Firebase's own last sign-in time, so reloading the page never counts as a login
async function trkLogin(user) {
  const ms = Date.parse(user.metadata && user.metadata.lastSignInTime); if (!ms) return;
  const lk = 'trk:li:' + user.uid; let last = ''; try { last = localStorage.getItem(lk) || ''; } catch (e) {}
  if (last === String(ms)) return;
  if (await trkLog({ type: 'login', detail: 'Signed in' }, 'in' + ms, ms)) { try { localStorage.setItem(lk, String(ms)); } catch (e) {} }
}
const trAll = () => Object.values(TR).flat().sort((a, b) => b.at - a.at);
function trkSync() {
  if (!U || PORTAL) return;
  const uids = [U.uid, ...K.map(c => c.uid).filter(Boolean)];
  Object.keys(trOff).forEach(u => { if (!uids.includes(u)) { trOff[u](); delete trOff[u]; delete TR[u]; } });
  uids.forEach(u => {
    if (trOff[u]) return;
    trOff[u] = onValue(query(ref(db, `activity/${u}`), orderByChild('at'), limitToLast(200)), snap => {
      const l = []; snap.forEach(ch => {
        const v = ch.val() || {}; if (!['login', 'logout', 'email'].includes(v.type)) return;
        l.push({ id: ch.key, uid: u, type: v.type, actor: v.actor === 'customer' ? 'customer' : 'admin', name: String(v.name || ''), email: String(v.email || ''), at: +v.at || 0, kind: String(v.kind || ''), to: String(v.to || ''), toName: String(v.toName || ''), status: v.status === 'failed' ? 'failed' : 'sent', detail: String(v.detail || ''), preview: String(v.preview || '') });
      });
      TR[u] = l; trError = ''; if (document.body.classList.contains('ready') && view === 'tracker') drawT();
    }, err => { if (u === U.uid || !trError) trError = trErr(err); if (document.body.classList.contains('ready') && view === 'tracker') paint(false); });
  });
}
function trkStop() { Object.values(trOff).forEach(f => f()); trOff = {}; TR = {}; }
function trFiltered() {
  const q = trq.trim().toLowerCase();
  return trAll().filter(e => (trflt === 'all' || trKind(e) === trflt) && (!q || (e.name + ' ' + e.email + ' ' + e.to + ' ' + e.toName + ' ' + e.kind).toLowerCase().includes(q)));
}
function trCounts() {
  const a = trAll(), n = k => a.filter(e => trKind(e) === k).length;
  return { all: 'All (' + a.length + ')', login: 'Logins (' + n('login') + ')', logout: 'Logouts (' + n('logout') + ')', email: 'Emails sent (' + n('email') + ')', failed: 'Failed (' + n('failed') + ')' };
}
function trStats() {
  const a = trAll(), day = new Date().toDateString(), today = k => a.filter(e => trKind(e) === k && e.at && new Date(e.at).toDateString() === day).length;
  const st = (l, v, g, sub) => `<div class="${card} !p-4 sm:!p-5"><div class="text-xs text-slate-400">${l}</div><div class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold ${g ? 'gradient-text' : ''}">${v}</div><div class="mt-1 text-xs text-slate-500">${sub}</div></div>`;
  return st('Logins today', today('login'), 1, a.filter(e => e.type === 'login').length + ' in total') + st('Logouts today', today('logout'), 0, a.filter(e => e.type === 'logout').length + ' in total') + st('Emails sent', a.filter(e => trKind(e) === 'email').length, 0, today('email') + ' today') + st('Emails failed', a.filter(e => trKind(e) === 'failed').length, 0, today('failed') + ' today');
}
function trRow(e) {
  const k = trKind(e), T = TRT[k], who = e.name || e.email || 'User';
  const line = e.type === 'email'
    ? `${esc(e.kind || 'Email')} to <span class="font-semibold text-slate-200 break-all">${esc(e.toName && e.toName !== e.to ? e.toName + ' (' + e.to + ')' : e.to)}</span> &middot; by ${esc(who)}`
    : `<span class="font-semibold text-slate-200">${esc(who)}</span>${e.email ? ' <span class="break-all">(' + esc(e.email) + ')</span>' : ''}`;
  const extra = e.type === 'email' ? (k === 'failed' && e.detail ? `<div class="mt-1 text-xs text-red-300 break-words">${esc(e.detail)}</div>` : '') + (e.preview ? `<div class="mt-1 text-xs text-slate-500 break-words">&ldquo;${esc(e.preview)}${e.preview.length >= 140 ? '...' : ''}&rdquo;</div>` : '') : '';
  return `<div class="glass rounded-2xl p-4 flex items-start gap-3"><span class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${T.c}">${svg(T.ic, 'w-5 h-5')}</span>
    <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><span class="font-bold text-sm">${T.l}</span><span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${e.actor === 'customer' ? 'text-pink bg-pink/15' : 'text-brand-400 bg-brand-500/20'}">${e.actor === 'customer' ? 'Customer' : 'Admin'}</span></div>
      <div class="mt-0.5 text-sm text-slate-400 break-words">${line}</div>${extra}</div>
    <div class="shrink-0 text-right"><div class="text-sm font-semibold">${e.at ? esc(fmtD(e.at)) : '-'}</div><div class="text-xs text-slate-400">${e.at ? esc(trTime(e.at)) : ''}</div></div></div>`;
}
const trListHtml = () => trFiltered().map(trRow).join('') || `<p class="text-slate-400">${trError ? '' : trAll().length ? 'Nothing matches your search or filter.' : 'No activity yet. Sign-ins, sign-outs and emails sent from here will be listed with their date and time.'}</p>`;
function drawT() {
  const l = $('#trlist'), st = $('#trstats'); if (!l) return;
  st.innerHTML = trStats(); l.innerHTML = trListHtml();
  const c = trCounts(); document.querySelectorAll('[data-trpill]').forEach(b => { const t = c[b.dataset.trpill]; if (b.textContent !== t) b.textContent = t; });
}
$('#view').addEventListener('input', e => { if (e.target && e.target.id === 'trq') { trq = e.target.value; drawT(); } });

// ---------- auth ----------
function fillUser() { const n = U.displayName || U.email.split('@')[0]; $('#who').textContent = n; $('#avatar').textContent = n[0].toUpperCase(); }
$('#logoutBtn').addEventListener('click', async () => {
  const b = $('#logoutBtn'), l = $('#logoutLabel'); b.disabled = true; l.textContent = 'Logging out...';
  try { await trkLog({ type: 'logout', detail: 'Signed out' }, null, 0, 3000); await signOut(auth); leave(LOGIN_URL); } catch (err) { b.disabled = false; l.textContent = 'Log out'; toast('Could not log out. Please try again.'); }
});
onAuthStateChanged(auth, async user => {
  if (!user) { stopAll(); if (!leave.on) { document.body.classList.add('ready'); leave(LOGIN_URL); } return; }
  U = user; load(); fillUser();
  try { const sn = await get(ref(db, `portal/${user.uid}`)); PORTAL = sn.exists() ? (sn.val() || { revoked: true }) : null; } catch (e) { PORTAL = null; }
  if (portalBlocked(PORTAL)) { denyPortal(); return; }
  buildNav(); drawNotif(); trkLogin(user);
  if (PORTAL) { view = 'portal'; watchPortal(); }
  else { view = 'overview'; watchProjects(); watchMaint(); watchQuotes(); watchInvoices(); watchExpenses(); watchSubs(); watchSC(); watchCustomers(); trkSync(); setTimeout(() => loadPdf().catch(() => {}), 2500); }
  if (!document.body.classList.contains('ready')) { paint(true); document.body.classList.add('ready'); }
});