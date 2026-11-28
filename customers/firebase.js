import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDatabase, ref, onValue, get, push, set, update, serverTimestamp, increment, query, limitToLast } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const FB = {
  apiKey: "AIzaSyAoyAOyfJsqlK_Pe6pmfA5cTexx0IOcH9g", authDomain: "moren-325fd.firebaseapp.com",
  databaseURL: "https://moren-325fd-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "moren-325fd",
  storageBucket: "moren-325fd.firebasestorage.app", messagingSenderId: "1015241645428",
  appId: "1:1015241645428:web:2d6366a8bdc38a5fb72021", measurementId: "G-1HDSV3V8P1"
};
const app = initializeApp(FB), auth = getAuth(app), db = getDatabase(app);
const LOGIN_URL = '../auth/login.html';        // path to login.html, relative to this file
const ADMIN_URL = '../components/dashboard.html';   // where the EM Development team (non-customers) are sent
const CONTACT_EMAIL = 'emdevelopmentph@gmail.com';
const PAY = { bank: 'Bank of the Philippine Islands (BPI)', name: 'Ethan Montera', number: '1019235676' };   // shown on the Source Code page
const MESSENGER_URL = 'https://m.me/1239749455895441';   // <-- put your Facebook page's Messenger link here, e.g. https://m.me/emdevelopment
const messengerReady = () => !/YOUR_FACEBOOK_PAGE/.test(MESSENGER_URL);

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtD = d => { if (!d) return ''; const x = new Date(/^\d{4}-\d\d-\d\d$/.test(d) ? d + 'T00:00:00' : d); return isNaN(x) ? '' : x.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }); };
const arr = x => Array.isArray(x) ? x.filter(Boolean) : Object.values(x || {});
const doneN = p => p.items.filter(m => m.d).length;
const pct = p => p.items.length ? Math.round(doneN(p) / p.items.length * 100) : 0;
const status = p => p.archived ? 'completed' : doneN(p) === 0 ? 'pending' : 'active';
const LABEL = { pending: 'Not started', active: 'In progress', completed: 'Completed' };
const BADGE = { active: 'text-aqua bg-aqua/15', completed: 'text-emerald-300 bg-emerald-400/15', pending: 'text-pink bg-pink/15' };
const card = 'glass rounded-2xl p-5';
const money = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// invoices are created by EM Development and mirrored to portal/<your uid>/invoices, so they arrive with the portal record
const invList = () => Object.entries((PORTAL && PORTAL.invoices && typeof PORTAL.invoices === 'object') ? PORTAL.invoices : {}).map(([id, v]) => { v = v || {}; return { id, num: v.number || 'Invoice', desc: v.description || '', amt: +v.amount || 0, due: v.dueDate || '', paid: v.paid === true, paidAt: +v.paidAt || 0, at: +v.createdAt || 0 }; }).sort((a, b) => b.at - a.at || String(b.num).localeCompare(String(a.num)));
const iStat = i => i.paid ? 'paid' : (i.due && i.due < ymd(new Date()) ? 'overdue' : 'unpaid');
const ILABEL = { paid: 'Paid', unpaid: 'Unpaid', overdue: 'Overdue' }, IBADGE = { paid: 'text-emerald-300 bg-emerald-400/15', unpaid: 'text-pink bg-pink/15', overdue: 'text-red-300 bg-red-500/15' };
const invCard = i => { const s = iStat(i); return `<article data-f class="${card}"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="font-bold truncate">${esc(i.num)}</h3><p class="mt-0.5 text-sm text-slate-300 break-words">${esc(i.desc)}</p></div><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${IBADGE[s]}">${ILABEL[s]}</span></div><div class="mt-4 flex items-end justify-between gap-3"><div class="text-xs ${s === 'overdue' ? 'text-red-300 font-semibold' : 'text-slate-400'}">${i.paid ? (i.paidAt ? 'Paid ' + esc(fmtD(i.paidAt)) : 'Paid') : 'Due ' + esc(fmtD(i.due))}</div><div class="text-xl font-extrabold">${money(i.amt)}</div></div>${i.paid ? `<button type="button" data-act="invpdf" data-id="${esc(i.id)}" class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-semibold text-slate-300 hover:text-white transition">${svgI('M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2', 'w-4 h-4')}Download PDF</button>` : ''}</article>`; };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayDiff = s => Math.round((new Date(s + 'T00:00:00') - today0()) / 864e5);

// ---------- source code (Google Drive links you buy from EM Development) ----------
// Mirrored by EM Development to portal/<your uid>/sourcecode. The Drive link only exists there once your payment is confirmed and it is unlocked.
const driveOk = v => { try { const u = new URL(String(v || '').trim()); return u.protocol === 'https:' && /^(drive|docs)\.google\.com$/i.test(u.hostname) ? u.href : ''; } catch (e) { return ''; } };
const scList = () => {
  const src = (PORTAL && PORTAL.sourcecode && typeof PORTAL.sourcecode === 'object') ? PORTAL.sourcecode : {}, invs = (PORTAL && PORTAL.invoices && typeof PORTAL.invoices === 'object') ? PORTAL.invoices : {};
  return Object.entries(src).map(([id, v]) => {
    v = v || {}; const inv = invs[v.invoiceId], link = driveOk(v.link);
    return { id, title: String(v.title || 'Source code'), desc: String(v.description || ''), amt: +v.amount || 0, link, unlocked: v.unlocked === true && !!link, paid: !!(inv && inv.paid), invNum: inv ? String(inv.number || '') : '', at: +v.createdAt || 0 };
  }).sort((a, b) => b.at - a.at);
};
const SC_ICON = { locked: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', unlocked: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-1.5', copy: 'M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10', chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' };
const SC_BADGE = { locked: 'text-pink bg-pink/15', unlocked: 'text-emerald-300 bg-emerald-400/15' };
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
  try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
}
const BTN_PRIMARY = 'btn-shine inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30';
const scCard = s => {
  const st = s.unlocked ? 'unlocked' : 'locked';
  const note = s.unlocked ? 'Your source code is ready. Keep the link private.'
    : s.paid ? 'Payment received. EM Development will unlock your source code shortly.'
    : 'Pay ' + (s.invNum ? s.invNum + ' ' : 'your invoice ') + '(' + money(s.amt) + ') by bank transfer. Tap Pay now to see the bank details.';
  return `<article data-f class="${card} flex flex-col"><div class="flex items-start gap-3"><span class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${s.unlocked ? 'text-emerald-300 bg-emerald-400/15' : 'text-pink bg-pink/15'}">${svgI(SC_ICON[st])}</span>
    <div class="min-w-0 flex-1"><div class="flex items-start justify-between gap-3"><h3 class="font-bold break-words min-w-0">${esc(s.title)}</h3><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${SC_BADGE[st]}">${s.unlocked ? 'Unlocked' : 'Locked'}</span></div>
    ${s.desc ? `<p class="mt-1 text-sm text-slate-300 break-words">${esc(s.desc)}</p>` : ''}</div></div>
    <div class="mt-4 flex flex-wrap items-center gap-2"><span class="font-extrabold">${money(s.amt)}</span><span class="px-3 py-1 rounded-full text-xs font-semibold ${s.paid ? 'text-emerald-300 bg-emerald-400/15' : 'text-pink bg-pink/15'}">${s.paid ? 'Paid' : 'Unpaid'}</span>${s.invNum ? `<span class="text-xs text-slate-400">${esc(s.invNum)}</span>` : ''}</div>
    <p class="mt-3 text-sm text-slate-400">${esc(note)}</p>
    ${s.unlocked ? `<a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer" class="${BTN_PRIMARY} mt-4 self-start">Open source code</a>` : !s.paid ? `<button type="button" data-act="paynow" data-id="${esc(s.id)}" class="${BTN_PRIMARY} mt-4 self-start">Pay now</button>` : ''}</article>`;
};

// ---------- subscriptions (Domain, Hosting, Maintenance, Others) ----------
// Added by EM Development and mirrored to portal/<your uid>/subscriptions. Your own active maintenance plan also shows here.
const SUB_T = { domain: { l: 'Domain', cls: 'text-aqua bg-aqua/15' }, hosting: { l: 'Hosting', cls: 'text-brand-400 bg-brand-500/20' }, maintenance: { l: 'Maintenance', cls: 'text-emerald-300 bg-emerald-400/15' }, other: { l: 'Others', cls: 'text-pink bg-pink/15' } };
const SUB_C = { monthly: { m: 1, per: 'month' }, quarterly: { m: 3, per: '3 months' }, yearly: { m: 12, per: 'year' } };
const SUB_L = { active: 'Active', soon: 'Renews soon', overdue: 'Renewal due', paused: 'Paused', cancelled: 'Cancelled' };
const SUB_B = { active: 'text-emerald-300 bg-emerald-400/15', soon: 'text-pink bg-pink/15', overdue: 'text-red-300 bg-red-500/15', paused: 'text-slate-300 bg-white/10', cancelled: 'text-slate-400 bg-white/10' };
let subFlt = 'all';
const subList = () => {
  const own = Object.entries((PORTAL && PORTAL.subscriptions && typeof PORTAL.subscriptions === 'object') ? PORTAL.subscriptions : {}).map(([id, v]) => { v = v || {}; return { id, type: SUB_T[v.type] ? v.type : 'other', name: String(v.label || ''), amt: +v.amount || 0, cycle: SUB_C[v.cycle] ? v.cycle : 'monthly', next: String(v.nextDue || ''), status: ['active', 'paused', 'cancelled'].includes(v.status) ? v.status : 'active', at: +v.createdAt || 0 }; });
  const mt = Object.entries(MT || {}).filter(([, r]) => r && r.status === 'active').map(([pid, r]) => ({ id: 'mt-' + pid, type: 'maintenance', name: (PP[pid] ? PP[pid].name : String(r.name || 'Your website')) + ' maintenance', amt: +r.fee || 0, cycle: 'monthly', next: '', status: 'active', at: +r.requestedAt || 0, auto: true }));
  return [...own, ...mt].sort((a, b) => b.at - a.at);
};
const subSt = s => { if (s.status !== 'active') return s.status; if (!s.next) return 'active'; const d = dayDiff(s.next); return d < 0 ? 'overdue' : d <= 30 ? 'soon' : 'active'; };
const subLive = s => ['active', 'soon', 'overdue'].includes(subSt(s));
// What is billed this month: monthly plans always count; quarterly and yearly plans only count in the month they fall due
const subBilledNow = s => SUB_C[s.cycle].m === 1 || (!!s.next && s.next.slice(0, 7) === ymd(new Date()).slice(0, 7));
const subWhen = s => {
  if (s.auto) return 'Billed monthly'; if (!s.next) return '';
  const d = dayDiff(s.next); if (s.status !== 'active') return 'Renewal date ' + fmtD(s.next);
  return d < 0 ? 'Renewal was due ' + fmtD(s.next) : d === 0 ? 'Renews today' : 'Renews ' + fmtD(s.next) + ' (in ' + d + (d === 1 ? ' day' : ' days') + ')';
};
const subPill = on => 'flex-1 sm:flex-none text-center whitespace-nowrap px-3 sm:px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ' + (on ? 'bg-brand-500 text-white' : 'glass text-slate-300 hover:text-white');
const subCard = s => { const T = SUB_T[s.type], st = subSt(s); return `<article data-f class="${card}"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold ${T.cls}">${T.l}</span><h3 class="mt-2 font-bold break-words">${esc(s.name)}</h3></div><span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${SUB_B[st]}">${SUB_L[st]}</span></div><div class="mt-4 flex items-end justify-between gap-3"><div class="text-xs ${st === 'overdue' ? 'text-red-300 font-semibold' : 'text-slate-400'}">${esc(subWhen(s))}</div><div class="text-right shrink-0"><div class="text-lg font-extrabold">${money(s.amt)}</div><div class="text-xs text-slate-400 -mt-0.5">per ${SUB_C[s.cycle].per}</div></div></div></article>`; };
const subGrid = () => { const all = subList(), l = all.filter(x => subFlt === 'all' || x.type === subFlt); return l.map(subCard).join('') || `<p class="text-slate-400">${all.length ? 'Nothing in this list.' : 'No subscriptions yet. Your domain, hosting and maintenance plans will appear here once we set them up.'}</p>`; };
function subDraw() {
  const g = $('#sgrid'); if (!g) return;
  g.innerHTML = subGrid(); g.querySelectorAll('[data-f]').forEach((el, i) => { el.classList.add('fade-item'); el.style.setProperty('--i', i); });
  document.querySelectorAll('[data-spill]').forEach(b => { b.className = subPill(b.dataset.v === subFlt); });
}
const timeLine = p => {
  if (p.archived) return '<span class="text-emerald-300 font-semibold">Delivered</span>';
  if (!p.due) return '';
  const n = dayDiff(p.due);
  if (n > 1) return n + ' days to target date';
  if (n === 1) return '1 day to target date';
  if (n === 0) return 'Target date is today';
  return '<span class="text-pink font-semibold">' + (-n) + (n === -1 ? ' day' : ' days') + ' past target date</span>';
};
const svgI = (d, c = 'w-5 h-5') => `<svg class="${c}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.remove('hidden'); el.style.bottom = 'calc(1.5rem + env(safe-area-inset-bottom, 0px))'; el.style.animation = 'toastIn .4s ease both'; clearTimeout(toastT); toastT = setTimeout(() => { el.style.animation = 'toastOut .35s ease forwards'; toastT = setTimeout(() => el.classList.add('hidden'), 350); }, 2600); }
function leave(url) { if (leave.on) return; leave.on = true; document.body.classList.add('is-leaving'); setTimeout(() => { location.href = url; }, 650); }

// ---------- invoice PDF (branded with the EM logo) ----------
// jsPDF is loaded on demand the first time a PDF is requested. The EM logo is drawn as vector shapes, so it stays sharp at any zoom.
const LOGO_W = 1368, LOGO_H = 474;   // logo bounding box (x 160-1528, y 189-663 in the source artwork)
const LOGO_SHAPES = [
  [[390, 189], [937, 189], [850, 306], [327, 306]],
  [[303, 376], [766, 376], [683, 470], [395, 470], [368, 540], [697, 540], [948, 263], [1140, 470], [1408, 189], [1528, 189], [1528, 663], [1393, 663], [1393, 400], [1140, 653], [885, 400], [885, 663], [160, 663]]
];
function drawLogo(doc, x, y, w, rgb) {
  const k = w / LOGO_W;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  LOGO_SHAPES.forEach(pts => {
    const P = pts.map(([px, py]) => [x + (px - 160) * k, y + (py - 189) * k]);
    const rel = P.slice(1).map((p, n) => [p[0] - P[n][0], p[1] - P[n][1]]);
    doc.lines(rel, P[0][0], P[0][1], [1, 1], 'F', true);
  });
}
let jsPdfP = null;
function loadJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPdfP) jsPdfP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? res(window.jspdf.jsPDF) : rej(new Error('jsPDF missing'));
    s.onerror = () => { jsPdfP = null; rej(new Error('jsPDF failed to load')); };
    document.head.appendChild(s);
  });
  return jsPdfP;
}
const pdfMoney = n => 'PHP ' + new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);   // the built-in PDF font has no peso sign
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
async function invoicePdf(i) {
  const JsPDF = await loadJsPdf(), doc = new JsPDF({ unit: 'mm', format: 'a4' }), s = iStat(i);
  doc.setProperties({ title: i.num + ' | EM Development' });
  const nm = (PORTAL && PORTAL.name) || (U && U.displayName) || '', co = (PORTAL && PORTAL.company) || '', em = (U && U.email) || '';
  drawInvoicePdf(doc, { num: String(i.num), date: fmtD(i.at || Date.now()), dueLabel: i.paid ? 'Paid on' : 'Due', due: i.paid ? (i.paidAt ? fmtD(i.paidAt) : 'Paid') : (i.due ? fmtD(i.due) : '-'), status: s, statusLabel: ILABEL[s], toLines: [nm, co, em].filter(Boolean), desc: i.desc, amt: i.amt, paid: !!i.paid, bank: PAY });
  doc.save(String(i.num).replace(/[^\w.-]+/g, '_') + '.pdf');
}

// ---------- state ----------
let U, PORTAL = undefined, PP = {}, PW = {}, offPortal = () => {}, lastSnap = {};
let MT = {}, mtLoaded = false, mtUid = null, offMT = () => {};   // maintenance subscription requests: maintenance/<your uid>/<projectId>

// ---------- maintenance ----------
// The admin sets the free weeks and the monthly fee on each project. The free period runs from the day the project is delivered.
// When it is about to end (14 days) or has ended, you are notified and can subscribe; the request is saved for the team to confirm.
const DAY = 864e5;
function mtInfo(p) {
  if (!p.hasM) return { k: 'none' };
  if (!p.archived || !p.arAt) return { k: 'pending' };
  const end = p.arAt + p.mw * 7 * DAY, left = Math.ceil((end - Date.now()) / DAY);
  return { k: left > 14 ? 'free' : left > 0 ? 'soon' : 'ended', end, left };
}
const mtCanOffer = p => mtLoaded && p.mf > 0 && ['soon', 'ended'].includes(mtInfo(p).k) && !MT[p.id];
function mtBlock(p) {
  const m = mtInfo(p); if (m.k === 'none') return '';
  const req = MT[p.id] || null, offer = p.mf > 0, days = n => n + (n === 1 ? ' day' : ' days');
  let head, sub, warn = false;
  if (m.k === 'pending') { head = 'Free maintenance'; sub = p.mw ? plur(p.mw, 'week') + ' of free maintenance start the day your website is delivered.' : 'No free maintenance period is included.'; }
  else if (m.k === 'free') { head = 'Free maintenance active'; sub = 'Included until ' + fmtD(m.end) + ' (' + days(m.left) + ' left).'; }
  else if (m.k === 'soon') { head = 'Free maintenance ends soon'; sub = 'Your free maintenance ends on ' + fmtD(m.end) + ' (' + days(m.left) + ' left).'; warn = true; }
  else { head = 'Free maintenance has ended'; sub = 'It ended on ' + fmtD(m.end) + '.'; warn = true; }
  let act = '';
  if (req && req.status === 'active') { head = 'Maintenance subscription active'; sub = 'Thank you. Your website stays maintained at ' + money(+req.fee || p.mf) + ' per month.'; warn = false; }
  else if (req && req.status === 'requested') { head = 'Subscription requested'; sub = 'We received your request and will confirm it with you shortly.'; warn = false; }
  else if (req && req.status === 'declined') { head = 'Subscription not available'; sub = 'We could not accept this request. Please contact us to talk about maintenance.'; }
  else if (offer && (m.k === 'soon' || m.k === 'ended') && mtLoaded) act = `<button type="button" data-act="msub" data-p="${esc(p.id)}" class="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">Subscribe &middot; ${esc(money(p.mf))} / month</button>`;
  else if (offer && (m.k === 'pending' || m.k === 'free')) sub += ' After that, you can subscribe for ' + money(p.mf) + ' per month.';
  return `<div class="mt-4 rounded-xl border border-white/10 px-3.5 py-3 text-sm"><div class="font-semibold ${warn ? 'text-pink' : ''}">${esc(head)}</div><p class="mt-0.5 text-slate-400">${esc(sub)}</p>${act}</div>`;
}
// Subscribe confirmation modal. send() must return true on success, false on failure (it shows its own error toast).
function subModal(p, send) {
  if ($('#mdl')) return;
  const prev = document.activeElement, fee = money(p.mf);
  const ico = (d, c) => `<svg class="${c}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  const el = document.createElement('div'); el.id = 'mdl';
  el.innerHTML = `<div class="mdl-scrim" data-x></div>
    <div class="mdl-card" role="dialog" aria-modal="true" aria-labelledby="mdlT" aria-describedby="mdlD" tabindex="-1">
      <div id="mdlBody">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-aqua flex items-center justify-center text-white shadow-lg shadow-brand-500/30">${ico('M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.5-.5-2.2z', 'w-7 h-7')}</div>
        <h2 id="mdlT" class="mt-4 text-xl font-extrabold tracking-tight">Subscribe to maintenance</h2>
        <p id="mdlD" class="mt-1.5 text-sm text-slate-400">Keep your website updated, secure and running smoothly. Our team will confirm your request with you shortly.</p>
        <div class="mdl-sum mt-5 px-4 py-3.5">
          <div class="flex items-start justify-between gap-4 text-sm"><span class="text-slate-400 shrink-0">Website</span><span class="font-semibold text-right min-w-0 break-words">${esc(p.name)}</span></div>
          <div class="mdl-div border-t my-3"></div>
          <div class="flex items-center justify-between gap-4"><span class="text-sm text-slate-400">Monthly fee</span><span class="text-lg font-extrabold gradient-text">${esc(fee)}<span class="text-xs font-semibold"> / month</span></span></div>
        </div>
        <div class="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
          <button type="button" data-no class="mdl-ghost sm:flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300">Not now</button>
          <button type="button" data-ok class="sm:flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30 inline-flex items-center justify-center gap-2">Confirm subscription</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  const cardEl = el.querySelector('.mdl-card'), body = el.querySelector('#mdlBody');
  let busy = false;
  const close = () => {
    if (!el.isConnected || el.classList.contains('closing')) return;
    el.classList.add('closing'); document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { el.remove(); try { prev && prev.isConnected && prev.focus({ preventScroll: true }); } catch (x) {} }, 230);
  };
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); if (!busy) close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...cardEl.querySelectorAll('button:not([disabled])')];
    if (!f.length) { e.preventDefault(); cardEl.focus(); return; }
    const a = document.activeElement, first = f[0], last = f[f.length - 1];
    if (!cardEl.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-x]') || e.target.closest('[data-no]') || e.target.closest('[data-done]')) { if (!busy) close(); return; }
    const ok = e.target.closest('[data-ok]'); if (!ok || busy) return;
    busy = true;
    const no = el.querySelector('[data-no]'), label = ok.innerHTML;
    ok.disabled = true; if (no) no.disabled = true;
    ok.innerHTML = '<span class="q-spinner" aria-hidden="true"></span><span>Sending request&hellip;</span>';
    let done = false; try { done = await send(); } catch (x) { done = false; }
    busy = false;
    if (!el.isConnected) return;
    if (!done) { ok.disabled = false; ok.innerHTML = label; if (no) no.disabled = false; ok.focus(); return; }
    body.innerHTML = `<div class="text-center py-2">
        <div class="mdl-pop mx-auto w-16 h-16 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center">${ico('M5 12.5l4.5 4.5L19 7.5', 'w-8 h-8')}</div>
        <h2 id="mdlT" class="mt-4 text-xl font-extrabold tracking-tight">Request sent</h2>
        <p id="mdlD" class="mt-1.5 text-sm text-slate-400">Thank you! We received your subscription request for <span class="font-semibold text-slate-300">${esc(p.name)}</span> and will confirm it with you shortly.</p>
        <button type="button" data-done class="mt-6 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">Done</button>
      </div>`;
    const d = body.querySelector('[data-done]'); if (d) d.focus();
  });
  const okBtn = el.querySelector('[data-ok]'); if (okBtn) okBtn.focus({ preventScroll: true });
}
// "Pay now" popup: bank details first, then "Payment sent" opens your Facebook page's Messenger chat so the customer can send the receipt screenshot.
function payModal(s) {
  if ($('#mdl')) return;
  const prev = document.activeElement;
  const ico = (d, c) => `<svg class="${c}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  const row = (k, v) => `<div class="flex items-start justify-between gap-4 text-sm"><span class="text-slate-400 shrink-0">${k}</span><span class="font-semibold text-right min-w-0 break-words">${esc(v)}</span></div>`;
  const el = document.createElement('div'); el.id = 'mdl'; el.className = 'mdl-fade';
  el.innerHTML = `<div class="mdl-scrim" data-x></div>
    <div class="mdl-card" role="dialog" aria-modal="true" aria-labelledby="mdlT" aria-describedby="mdlD" tabindex="-1">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-aqua flex items-center justify-center text-white shadow-lg shadow-brand-500/30">${ico('M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18', 'w-7 h-7')}</div>
      <h2 id="mdlT" class="mt-4 text-xl font-extrabold tracking-tight">Pay by bank transfer</h2>
      <p id="mdlD" class="mt-1.5 text-sm text-slate-400">Transfer the amount below to our bank account, then tap <span class="font-semibold text-slate-300">Payment sent</span>.</p>
      <div class="mdl-sum mt-5 px-4 py-3.5">
        ${row('For', s.title)}${s.invNum ? '<div class="mt-2"></div>' + row('Invoice', s.invNum) : ''}
        <div class="mdl-div border-t my-3"></div>
        <div class="flex items-center justify-between gap-4"><span class="text-sm text-slate-400">Amount to pay</span><span class="text-lg font-extrabold gradient-text">${esc(money(s.amt))}</span></div>
      </div>
      <div class="mdl-sum mt-3 px-4 py-3.5">
        ${row('Bank name', PAY.bank)}<div class="mt-2"></div>${row('Account name', PAY.name)}
        <div class="mdl-div border-t my-3"></div>
        <div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="text-sm text-slate-400">Account number</div><div class="mt-0.5 text-lg font-extrabold tracking-wider font-mono break-all select-all">${esc(PAY.number)}</div></div>
          <button type="button" data-copy class="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl mdl-ghost text-sm font-semibold text-brand-400">${ico('M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10', 'w-4 h-4')}<span data-copylbl>Copy</span></button></div>
      </div>
      <div class="mt-3 flex items-start gap-3 rounded-xl border border-pink/30 bg-pink/10 px-3.5 py-3 text-sm">
        <span class="text-pink shrink-0 mt-0.5">${ico('M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'w-5 h-5')}</span>
        <p class="text-slate-300"><span class="font-semibold text-pink">Important:</span> after paying, take a <span class="font-semibold">screenshot of your receipt</span> and send it to our Facebook page on Messenger${s.invNum ? ', with your invoice number (' + esc(s.invNum) + ')' : ''}. We unlock your source code once your payment is confirmed.</p>
      </div>
      <div class="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
        <button type="button" data-no class="mdl-ghost sm:flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300">Cancel</button>
        <button type="button" data-ok class="sm:flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30 inline-flex items-center justify-center gap-2">Payment sent</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const cardEl = el.querySelector('.mdl-card');
  let busy = false;
  const close = () => {
    if (!el.isConnected || el.classList.contains('closing')) return;
    el.classList.add('closing'); document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { el.remove(); try { prev && prev.isConnected && prev.focus({ preventScroll: true }); } catch (x) {} }, 320);
  };
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); if (!busy) close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...cardEl.querySelectorAll('button:not([disabled])')];
    if (!f.length) { e.preventDefault(); cardEl.focus(); return; }
    const a = document.activeElement, first = f[0], last = f[f.length - 1];
    if (!cardEl.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('click', async e => {
    if (e.target.closest('[data-x]') || e.target.closest('[data-no]')) { if (!busy) close(); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp && !busy) {
      const ok = await copyText(PAY.number), l = cp.querySelector('[data-copylbl]');
      toast(ok ? 'Account number copied' : 'Could not copy. Please select the number and copy it.');
      if (ok && l) { l.textContent = 'Copied'; clearTimeout(cp._t); cp._t = setTimeout(() => { if (l.isConnected) l.textContent = 'Copy'; }, 1800); }
      return;
    }
    const ok = e.target.closest('[data-ok]'); if (!ok || busy) return;
    if (!messengerReady()) { toast('The Messenger link is not set up yet. Please contact EM Development.'); return; }
    // Show a 2 second loading state, then open Messenger (the app on a phone, a new tab on a computer).
    // If the browser blocks the new tab, go there in this tab instead.
    busy = true;
    const no = el.querySelector('[data-no]'); ok.disabled = true; if (no) no.disabled = true;
    ok.innerHTML = '<span class="q-spinner" aria-hidden="true"></span><span>Opening Messenger&hellip;</span>';
    await new Promise(r => setTimeout(r, 2000));
    busy = false;
    if (!el.isConnected) return;
    const w = window.open(MESSENGER_URL, '_blank', 'noopener,noreferrer');
    if (!w) { location.href = MESSENGER_URL; return; }
    close(); toast('Send a screenshot of your receipt to our Facebook page');
  });
  const okBtn = el.querySelector('[data-ok]'); if (okBtn) okBtn.focus({ preventScroll: true });
}
function maintSub(b) {
  const p = PP[b.dataset.p]; if (!p || !mtCanOffer(p) || !PORTAL || PORTAL.revoked) return;
  subModal(p, async () => {
    if (!mtCanOffer(p) || !PORTAL || PORTAL.revoked) { toast('This subscription is no longer available.'); return false; }
    try { await set(ref(db, `maintenance/${U.uid}/${p.id}`), { status: 'requested', fee: p.mf, name: String(p.name).slice(0, 200), requestedAt: serverTimestamp() }); return true; }
    catch (err) { console.error('maintenance request', err); toast(/PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Could not send the request (blocked by the database rules). Please contact us.' : 'Could not send the request. Please try again.'); return false; }
  });
}
function watchMaint() {
  if (!PORTAL || PORTAL.revoked) { offMT(); mtUid = null; MT = {}; return; }
  if (mtUid === U.uid) return; mtUid = U.uid; mtLoaded = false;
  offMT = onValue(ref(db, `maintenance/${U.uid}`), snap => {
    MT = snap.val() || {}; mtLoaded = true; nfMaint();
    if (document.body.classList.contains('ready')) repaint();
  }, () => { MT = {}; mtLoaded = true; nfMaint(); });
}

// ---------- view ----------
function ring(v) {
  return `<div class="relative w-28 h-28 shrink-0"><svg viewBox="0 0 36 36" class="w-28 h-28 -rotate-90"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#d4343f"/><stop offset="1" stop-color="#3ddc97"/></linearGradient></defs><circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="3.2"/><circle class="ring" cx="18" cy="18" r="15.5" fill="none" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${(v * 97.4 / 100).toFixed(1)} 97.4"/></svg><div class="absolute inset-0 flex items-center justify-center font-extrabold text-xl">${v}%</div></div>`;
}
function projectCard(p) {
  const s = status(p), v = pct(p), nextIdx = p.items.findIndex(m => !m.d);
  return `<article data-f data-pid="${esc(p.id)}" class="${card}">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0"><h3 class="font-bold truncate">${esc(p.name)}</h3><div class="text-xs text-slate-400 mt-0.5">${p.start ? esc(fmtD(p.start)) + ' &ndash; ' + esc(fmtD(p.due)) : 'Target ' + esc(fmtD(p.due))}</div></div>
      <span class="shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${BADGE[s]}">${LABEL[s]}</span>
    </div>
    <div class="mt-4 flex items-center gap-3"><div class="bar flex-1 h-2 rounded-full bg-white/10" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(p.name)} progress"><i style="width:${v}%"></i></div><span class="text-sm font-bold w-10 text-right">${v}%</span></div>
    <p class="mt-2 text-xs text-slate-400">${doneN(p)} of ${p.items.length} items done${timeLine(p) ? ' &middot; ' + timeLine(p) : ''}</p>
    <ol class="mt-4 space-y-3">${p.items.map((m, i) => `<li class="step ${m.d ? 'done' : ''} flex items-start gap-3 text-sm ${m.d ? 'text-slate-300' : ''}"><input type="checkbox" class="chk mt-px" disabled aria-label="${esc(m.t)}" ${m.d ? 'checked' : ''}/><span class="min-w-0 break-words ${m.d ? 'line-through opacity-60' : ''}">${esc(m.t)}${i === nextIdx && !p.archived ? ' <span class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-aqua/15 text-aqua align-middle">Up next</span>' : ''}</span></li>`).join('')}</ol>
    ${mtBlock(p)}
  </article>`;
}
function render() {
  const v = $('#view');
  $('#title').textContent = TITLES[view]; setBadge();
  document.querySelectorAll('.nav-btn').forEach(b => { const on = b.dataset.v === view; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (PORTAL === undefined) { v.innerHTML = `<p class="text-slate-400 py-10 text-center">Loading your project...</p>`; return; }
  if (!PORTAL || PORTAL.revoked) {
    v.innerHTML = `<div data-f class="${card} max-w-xl mt-4"><div class="font-bold">Access disabled</div><p class="mt-1 text-sm text-slate-400">Your portal access is no longer active. Please contact <a class="text-brand-400 hover:text-white font-medium" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p></div>`;
    animateIn(); return;
  }
  const ids = Object.keys(PORTAL.projects || {}), ps = ids.map(id => PP[id]).filter(Boolean);
  const all = ps.flatMap(p => p.items), done = all.filter(m => m.d).length, overall = all.length ? Math.round(done / all.length * 100) : 0;
  const finished = ps.filter(p => p.archived).length, nextTasks = ps.filter(p => !p.archived).map(p => ({ p: p.name, m: p.items.find(m => !m.d) })).filter(x => x.m);
  let seenPw = false; try { seenPw = !!localStorage.getItem('pwn:' + U.uid); } catch (e) {}
  const stat = (l, val, g, wide) => `<div data-f class="${card} !p-4 sm:!p-5${wide ? ' col-span-2 sm:col-span-1' : ''}"><div class="text-xs text-slate-400">${l}</div><div class="stat-v mt-1 text-lg min-[420px]:text-xl sm:text-2xl font-extrabold ${g ? 'gradient-text' : ''}">${val}</div></div>`;
  const invAll = invList(), invOwed = invAll.filter(i => !i.paid), owedAmt = invOwed.reduce((a, i) => a + i.amt, 0), paidAmt = invAll.filter(i => i.paid).reduce((a, i) => a + i.amt, 0), overdueN = invOwed.filter(i => iStat(i) === 'overdue').length;
  const subSoon = subList().filter(x => ['soon', 'overdue'].includes(subSt(x)));
  const mailSubj = encodeURIComponent('Question about my website | ' + (PORTAL.company || PORTAL.name || ''));
  const overviewV = () => {
    const name = PORTAL.name || U.displayName || U.email.split('@')[0];
    const hr = new Date().getHours(), md = new Date().getMonth() * 100 + new Date().getDate(), hello = md >= 1224 && md <= 1226 ? 'Merry Christmas' : md === 1231 || md === 100 ? 'Happy New Year' : hr < 5 ? 'Still up' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const todayTxt = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
    const ph = s => '-' + ((Date.now() / 1000) % s).toFixed(2) + 's';   // keeps the slow animations in phase when the page redraws
    const inProg = ps.filter(p => status(p) === 'active').length;
    const target = ps.filter(p => !p.archived && p.due && fmtD(p.due)).map(p => p.due).sort()[0];
    const sub = !ps.length ? (ids.length ? 'Loading your project...' : 'Your project has not been shared yet. We will let you know as soon as it is ready.')
      : finished === ps.length ? 'Your website has been delivered. Thank you for trusting us.'
      : all.length ? done + ' of ' + all.length + ' items are complete across ' + plur(ps.length, 'project') + '.' : 'Items will appear here once your project starts.';
    const chip = (c, t) => `<span class="ov-chip"><i style="background:${c}"></i>${t}</span>`;
    const chips = [PORTAL.company ? chip('#ff8f8f', esc(PORTAL.company)) : '', target ? chip('#3ddc97', 'Target ' + esc(fmtD(target))) : '', finished ? chip('#34d399', finished + ' delivered') : ''].join('');
    const tile = (l, v, s, ac, ic, g) => `<div data-f class="ov-tile" style="--ac:${ac}"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="text-xs font-semibold tracking-wide text-slate-400">${l}</div><div class="stat-v mt-1.5 text-xl min-[420px]:text-2xl sm:text-[1.7rem] font-extrabold tracking-tight ${g ? 'gradient-text' : ''}">${v}</div></div><span class="ov-ico">${svgI(ic, 'w-[18px] h-[18px]')}</span></div><div class="mt-3 text-xs text-slate-400 truncate">${s}</div></div>`;
    const seg = p => { const n = Math.max(1, Math.min(12, p.items.length)), on = Math.round(pct(p) * n / 100); return `<div class="ov-seg" role="progressbar" aria-valuenow="${pct(p)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(p.name)} progress">${Array.from({ length: n }, (_, k) => `<i class="${k < on ? 'on' : ''}"></i>`).join('')}</div>`; };
    const link = (a, t) => `<button type="button" data-act="${a}" class="ov-link">${t}<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`;
    const CHECK = 'M5 13l4 4L19 7', KEY = 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4', WRENCH = 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.5-.5-2.2z';

    // things that need the customer's attention, kept together in one tidy card
    const att = (ac, ic, title, subTxt, actions) => `<div class="ov-att"><span class="ov-ico" style="--ac:${ac}">${svgI(ic, 'w-[18px] h-[18px]')}</span><div class="min-w-0 flex-1" style="min-width:12rem"><div class="font-semibold">${title}</div><p class="text-sm text-slate-400 mt-0.5">${subTxt}</p></div><div class="flex items-center gap-4 shrink-0">${actions}</div></div>`;
    const todo = [];
    if (!seenPw) todo.push(att('#f59e0b', KEY, 'Secure your account', 'Please change the temporary password we gave you.', `<button data-act="pwdone" class="ov-link !text-slate-400">Dismiss</button><button data-act="gosec" class="ov-btn">Change password</button>`));
    if (invOwed.length) todo.push(att(overdueN ? '#f87171' : '#f6c453', NAV_ICON.invoices, plur(invOwed.length, 'unpaid invoice'), `<span class="${overdueN ? 'text-red-300' : ''}">${money(owedAmt)} outstanding${overdueN ? ' &middot; ' + overdueN + ' overdue' : ''}</span>`, `<button data-act="goinv" class="ov-btn">View invoices</button>`));
    if (subSoon.length) todo.push(att('#ff8f8f', NAV_ICON.subscriptions, plur(subSoon.length, 'subscription') + ' renewing soon', esc(subSoon.slice(0, 2).map(x => x.name).join(', ')) + (subSoon.length > 2 ? ' and more' : ''), `<button data-act="gosubs" class="ov-btn">View subscriptions</button>`));
    ps.filter(mtCanOffer).slice(0, 3).forEach(p => { const m = mtInfo(p); todo.push(att('#3ddc97', WRENCH, m.k === 'soon' ? 'Free maintenance ends in ' + plur(m.left, 'day') : 'Free maintenance has ended', esc(p.name) + ': keep your website maintained for ' + esc(money(p.mf)) + ' per month.', `<button data-act="msub" data-p="${esc(p.id)}" class="ov-btn">Subscribe</button>`)); });
    const attn = todo.length ? `<div data-f class="${card} mt-4"><div class="flex items-center gap-2.5 mb-1"><div class="font-bold">Needs your attention</div><span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink/15 text-pink">${todo.length}</span></div><div class="ov-att-list">${todo.join('')}</div></div>` : '';

    const shown = ps.slice().sort((a, b) => (a.archived ? 1 : 0) - (b.archived ? 1 : 0) || pct(b) - pct(a)).slice(0, 5);
    const rows = shown.map(p => { const s = status(p), tl = timeLine(p), range = p.start ? esc(fmtD(p.start)) + ' &ndash; ' + esc(fmtD(p.due)) : (p.due ? 'Target ' + esc(fmtD(p.due)) : '');
      return `<div class="ov-row"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-semibold truncate">${esc(p.name)}</div>${range ? `<div class="text-xs text-slate-400 mt-0.5 truncate">${range}</div>` : ''}</div><span class="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE[s]}">${LABEL[s]}</span></div>${seg(p)}<div class="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400"><span class="min-w-0">${doneN(p)} of ${p.items.length} items done${tl ? ' &middot; ' + tl : ''}</span><span class="shrink-0 font-bold text-slate-200">${pct(p)}%</span></div></div>`; }).join('')
      || `<div class="ov-empty">${svgI(NAV_ICON.projects, 'w-6 h-6')}<span>${ids.length ? 'Loading your project...' : 'Your project has not been shared yet.'}</span></div>`;

    const upd = `<div data-f class="${card}"><div class="flex items-center justify-between gap-3 mb-3"><div class="font-bold">Latest update</div>${PORTAL.updatedAt && PORTAL.update ? `<span class="text-xs text-slate-400">${esc(fmtD(+PORTAL.updatedAt))}</span>` : ''}</div>${PORTAL.update ? `<div class="ov-quote"><p class="text-sm whitespace-pre-wrap break-words">${esc(PORTAL.update)}</p><p class="mt-2 text-xs text-slate-400">From EM Development</p></div>` : `<div class="ov-empty">${svgI(NAV_ICON.messages, 'w-6 h-6')}<span>No updates yet. We will post news here.</span></div>`}</div>`;
    const nx = nextTasks.slice(0, 5).map(x => `<li><span class="ov-node"></span><div class="text-sm font-semibold break-words">${esc(x.m.t)}</div><div class="text-xs text-slate-400 truncate">${esc(x.p)}</div></li>`).join('');
    const nxt = nextTasks.length ? `<div data-f class="${card} lg:col-span-2"><div class="flex items-center justify-between gap-3 mb-4"><div class="font-bold">What we are working on next</div><span class="text-xs text-slate-400">${nextTasks.length} open</span></div><ol class="ov-tl">${nx}</ol></div>` : '';

    return `<section data-f class="ov-hero" style="--ph:${ph(28)}">
      <div class="relative z-[1] flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6 sm:gap-8">
        <div class="min-w-0 max-w-xl">
          <div class="ov-eyebrow"><span class="ov-live"></span>${esc(todayTxt)}</div>
          <h2 class="mt-3 text-[1.65rem] sm:text-4xl font-extrabold tracking-tight leading-[1.1]">${hello},<br><span class="gradient-text break-words">${esc(name)}</span></h2>
          <p class="mt-3 text-sm sm:text-base text-slate-400 max-w-md">${esc(sub)}</p>
          ${chips ? `<div class="mt-5 flex flex-wrap gap-2">${chips}</div>` : ''}
        </div>
        <div class="ov-orbit shrink-0 self-center" style="--ph:${ph(24)}">
          <div class="ov-orbit-ring"><i></i></div>
          <svg viewBox="0 0 36 36" class="ov-orbit-svg" role="img" aria-label="Overall progress ${overall}%"><defs><linearGradient id="ovg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff8f8f"/><stop offset=".55" stop-color="#3ddc97"/><stop offset="1" stop-color="#f6c453"/></linearGradient></defs><circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width="2.6"/><circle class="ring" cx="18" cy="18" r="15.5" fill="none" stroke="url(#ovg)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${(overall * 97.4 / 100).toFixed(1)} 97.4"/></svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center"><div class="text-3xl sm:text-4xl font-extrabold tracking-tight">${overall}<span class="text-lg text-slate-400">%</span></div><div class="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">complete</div></div>
        </div>
      </div>
    </section>
    ${attn}
    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">${tile('Items done', done + ' / ' + all.length, overall + '% complete', '#ff8f8f', CHECK, 1)}${tile('Projects', ps.length, inProg + ' in progress', '#3ddc97', NAV_ICON.projects)}${tile('Delivered', finished, 'of ' + ps.length + (ps.length === 1 ? ' project' : ' projects'), '#34d399', 'M5 12.5l4.5 4.5L19 7.5')}${tile('Balance due', money(owedAmt), invOwed.length ? plur(invOwed.length, 'unpaid invoice') : invAll.length ? 'All paid up' : 'No invoices yet', '#f6c453', NAV_ICON.invoices)}</div>
    <div class="mt-4 grid lg:grid-cols-[1.35fr_1fr] gap-4">
      <div data-f class="${card}"><div class="flex items-center justify-between gap-3 mb-1"><div class="font-bold">Project progress</div>${ps.length ? link('goproj', 'View details') : ''}</div><div class="ov-rows">${rows}</div></div>
      ${upd}
      ${nxt}
    </div>
    <div data-f class="ov-help mt-4"><div class="min-w-0" style="min-width:14rem"><div class="font-bold">Questions about your website?</div><p class="text-sm text-slate-400 mt-0.5">Reach out any time and our team will get back to you.</p></div><a href="mailto:${CONTACT_EMAIL}?subject=${mailSubj}" class="ov-btn inline-flex items-center gap-2">${svgI(NAV_ICON.messages, 'w-4 h-4')}Email us</a></div>`;
  };
  const projectsV = () => `
    <p data-f class="text-slate-400 mb-5">Everything included in your website, and how far along each part is.</p>
    <div class="pgrid">${ps.map(projectCard).join('') || `<p class="text-slate-400">${ids.length ? 'Loading your project...' : 'Your project has not been shared yet. We will let you know as soon as it is ready.'}</p>`}</div>
`;
  const accountV = () => `
    <div id="acctHost"></div>
    <div id="secHost"></div>
    <div data-f class="${card} max-w-2xl mt-4 flex flex-wrap items-center justify-between gap-3"><div class="min-w-0"><div class="font-bold">Questions or changes?</div><p class="text-sm text-slate-400 mt-0.5">Reach out any time and our team will get back to you.</p></div>
      <a href="mailto:${CONTACT_EMAIL}?subject=${mailSubj}" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30">${svgI('M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6', 'w-4 h-4')}Email EM Development</a></div>
    <div data-f class="mt-4 max-w-2xl"><button data-act="rpw" class="text-xs font-semibold text-slate-400 hover:text-white">Email me a password reset link</button></div>`;
  const invoicesV = () => `
    <p data-f class="text-slate-400 mb-5">Invoices from EM Development for your website. Our team records your payments here.</p>
    <div class="grid grid-cols-2 gap-4 mb-4">${stat('Outstanding', money(owedAmt), 1)}${stat('Paid to date', money(paidAmt))}</div>
    <div class="grid md:grid-cols-2 gap-4">${invAll.map(invCard).join('') || '<p class="text-slate-400">No invoices yet. They will appear here as soon as we send one.</p>'}</div>`;
  const subsV = () => {
    const all = subList(), live = all.filter(subLive), mo = Math.round(live.filter(subBilledNow).reduce((a, x) => a + x.amt, 0) * 100) / 100, soonN = all.filter(x => ['soon', 'overdue'].includes(subSt(x))).length;
    const pill = (k, l) => `<button type="button" data-spill="${k}" data-act="sflt" data-v="${k}" class="${subPill(subFlt === k)}">${l} (${k === 'all' ? all.length : all.filter(x => x.type === k).length})</button>`;
    return `
    <p data-f class="text-slate-400 mb-5">Your domain, hosting, maintenance and other services with EM Development, and when each one renews.</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">${stat('Active subscriptions', live.length)}${stat('Monthly total', money(mo), 1)}${stat('Renewing soon', soonN, 0, 1)}</div>
    <p data-f class="-mt-2 mb-5 text-xs text-slate-400">Monthly total counts your monthly plans, plus any quarterly or yearly plan that is due this month.</p>
    <div data-f class="flex flex-wrap gap-2 mb-5">${pill('all', 'All')}${Object.keys(SUB_T).map(k => pill(k, SUB_T[k].l)).join('')}</div>
    <div id="sgrid" class="grid md:grid-cols-2 gap-4">${subGrid()}</div>`;
  };
  const sourceV = () => {
    const list = scList(), open = list.filter(s => !s.paid), owe = open.reduce((a, s) => a + s.amt, 0);
    return `<p data-f class="text-slate-400 mb-5">Source code for your project, shared as a private Google Drive link. It unlocks once your payment is confirmed.</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">${stat('Source codes', list.length)}${stat('To pay', money(owe), 1)}${stat('Unlocked', list.filter(s => s.unlocked).length, 0, 1)}</div>
    <div class="grid md:grid-cols-2 gap-4">${list.map(scCard).join('') || '<p class="text-slate-400">No source code has been assigned to you yet. It will appear here when we add it.</p>'}</div>`;
  };
  const messagesV = () => '<div id="chatHost"></div>';
  v.innerHTML = ({ overview: overviewV, projects: projectsV, invoices: invoicesV, subscriptions: subsV, source: sourceV, messages: messagesV, account: accountV })[view]();
  const ah = v.querySelector('#acctHost'); if (ah) ah.replaceWith(getAcct());   // the account card is built once too, so a half-typed name survives live updates
  const host = v.querySelector('#secHost'); if (host) host.replaceWith(getSec());   // the security form is built once, so typing survives live updates
  const chost = v.querySelector('#chatHost');   // the chat is built once too, so a half-typed message survives live updates
  if (chost) { chost.replaceWith(getChat()); const l = chatEl.querySelector('[data-clist]'); l.scrollTop = chatStick ? l.scrollHeight : (l._st || 0); chatStick = false; markRead(); }
  animateIn();
}
function animateIn() { $('#view').querySelectorAll('[data-f]').forEach((el, i) => { el.classList.add('fade-item'); el.style.setProperty('--i', i); }); }
$('#view').addEventListener('animationend', e => { const n = e.target; if (n.classList && n.classList.contains('fade-item') && e.animationName === 'itemFade') { n.classList.remove('fade-item'); n.style.removeProperty('--i'); } });

// repaint on live changes without replaying the entrance animation; flash cards whose progress changed
// fade the page in only once the portal record and every shared project have loaded (or after a timeout, so it never hangs)
function checkReady(force) {
  if (document.body.classList.contains('ready')) return true;
  const want = PORTAL === undefined ? null : (!PORTAL || PORTAL.revoked ? [] : Object.keys(PORTAL.projects || {}));
  if (!force && (!want || !want.every(id => id in PP))) return false;
  clearTimeout(checkReady.t);
  nfReady(); render(); document.body.classList.add('ready');
  return true;
}
function repaint() {
  if (!document.body.classList.contains('ready')) { checkReady(); return; }
  const v = $('#view'), top = v.scrollTop;
  const before = { ...lastSnap };
  render(); v.querySelectorAll('.fade-item').forEach(n => { n.classList.remove('fade-item'); n.style.removeProperty('--i'); n.style.animation = 'none'; });
  v.scrollTop = top;
  Object.values(PP).filter(Boolean).forEach(p => {
    const sig = pct(p) + ':' + status(p) + ':' + p.items.length;
    if (before[p.id] && before[p.id] !== sig) { const n = v.querySelector(`[data-pid="${CSS.escape(p.id)}"]`); if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); } }
    lastSnap[p.id] = sig;
  });
}
$('#view').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'goinv') go('invoices');
  else if (b.dataset.act === 'invpdf') {
    const inv = invList().find(x => x.id === b.dataset.id); if (!inv || !inv.paid || b.disabled) return;
    const html = b.innerHTML; b.disabled = true; b.innerHTML = '<span class="q-spinner" aria-hidden="true"></span><span>Preparing PDF&hellip;</span>';
    try { await invoicePdf(inv); toast('Invoice PDF downloaded'); } catch (err) { console.error('invoice pdf', err); toast('Could not create the PDF. Please try again.'); }
    if (b.isConnected) { b.disabled = false; b.innerHTML = html; }
  }
  else if (b.dataset.act === 'goproj') go('projects');
  else if (b.dataset.act === 'paynow') { const s = scList().find(x => x.id === b.dataset.id); if (s && !s.paid) payModal(s); }
  else if (b.dataset.act === 'sflt') { subFlt = b.dataset.v; subDraw(); }
  else if (b.dataset.act === 'gosubs') go('subscriptions');
  else if (b.dataset.act === 'msub') await maintSub(b);
  else if (b.dataset.act === 'gosec') { go('account'); setTimeout(() => { const i = $('#security input'); if (i) i.focus({ preventScroll: true }); }, 450); }
  else if (b.dataset.act === 'pwdone') { try { localStorage.setItem('pwn:' + U.uid, '1'); } catch (x) {} repaint(); }
  else if (b.dataset.act === 'rpw') { try { await sendPasswordResetEmail(auth, U.email); toast('Reset link sent to ' + U.email); } catch (x) { toast('Could not send the email. Try again later.'); } }
});

// ---------- sidebar + sections ----------
const TITLES = { overview: 'Overview', projects: 'Projects', invoices: 'Invoices', subscriptions: 'Subscriptions', source: 'Source Code', messages: 'Messages', account: 'Account' };
const NAV_ICON = { source: 'M16 18l6-6-6-6M8 6l-6 6 6 6', overview: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', subscriptions: 'M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5', messages: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', account: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' };
let view = 'overview', goT;
$('#nav').innerHTML = Object.keys(TITLES).map(k => `<button type="button" data-v="${k}" class="nav-btn w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white">${svgI(NAV_ICON[k])}${TITLES[k]}${k === 'messages' ? '<span id="msgBadge" class="hidden ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-pink text-white text-[11px] font-bold items-center justify-center" aria-label="Unread messages"></span>' : ''}</button>`).join('');
const closeMenu = () => { $('#side').classList.add('-translate-x-full'); $('#scrim').classList.add('hidden'); $('#menuBtn').setAttribute('aria-expanded', 'false'); };
function go(k) {
  closeMenu(); if (k === view) return; view = k; if (k === 'messages') chatStick = true;
  const el = $('#view'); clearTimeout(goT);
  el.style.transition = 'opacity .16s ease'; el.style.opacity = '0';
  goT = setTimeout(() => { render(); el.scrollTop = 0; el.style.opacity = '1'; }, 170);
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) go(b.dataset.v); });
$('#menuBtn').addEventListener('click', () => { $('#side').classList.remove('-translate-x-full'); $('#scrim').classList.remove('hidden'); $('#menuBtn').setAttribute('aria-expanded', 'true'); });
$('#scrim').addEventListener('click', closeMenu);
addEventListener('resize', () => { if (innerWidth >= 1024) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#scrim').classList.contains('hidden')) closeMenu(); });

// ---------- notifications (top bar) ----------
// Progress on your projects and new updates from the team are remembered on this device, so you also see what happened while you were away.
// Unread chat messages are shown live from the chat. Read state and the last 30 notifications are kept per login.
const NF_MAX = 30;
let NF = { init: false, list: [], sig: {} }, nfPrev = 0;
const NF_ICON = { progress: 'M4 20V11M10 20V5M16 20v-6M22 20H2', done: 'M20 6L9 17l-5-5', project: NAV_ICON.projects, update: 'M3 11l18-8-8 18-2-8z', invoice: NAV_ICON.invoices, maintenance: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z', message: NAV_ICON.messages, subscription: NAV_ICON.subscriptions };
const plur = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const nfKey = () => 'nf:' + U.uid;
function nfLoad() {
  NF = { init: false, list: [], sig: {} };
  try { const v = JSON.parse(localStorage.getItem(nfKey())); if (v && Array.isArray(v.list)) NF = { init: v.init === true, list: v.list.slice(0, NF_MAX), sig: v.sig && typeof v.sig === 'object' ? v.sig : {} }; } catch (e) {}
}
const nfSave = () => { try { localStorage.setItem(nfKey(), JSON.stringify(NF)); } catch (e) {} };
function nfAdd(type, text, v) {
  NF.list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, text, v, at: Date.now(), read: false });
  if (NF.list.length > NF_MAX) NF.list.length = NF_MAX;
  if (document.body.classList.contains('ready')) toast(text.length > 90 ? text.slice(0, 89) + '\u2026' : text);   // live change while the page is open
}
// the very first visit only records where things stand, so nothing old is announced as new
function nfReady() { if (!NF.init) { NF.init = true; nfSave(); } }
function nfProject(p) {
  const prev = NF.sig[p.id], now = { d: doneN(p), n: p.items.length, a: p.archived ? 1 : 0 };
  NF.sig[p.id] = now;
  if (NF.init) {
    if (!prev) nfAdd('project', 'A new project was shared with you: ' + p.name, 'projects');
    else {
      if (!prev.a && now.a) nfAdd('done', p.name + ' has been delivered', 'projects');
      else if (prev.a && !now.a) nfAdd('project', p.name + ' was reopened', 'projects');
      else if (now.d > prev.d) nfAdd('progress', p.name + ': ' + plur(now.d - prev.d, 'item') + ' completed (' + pct(p) + '% done)', 'projects');
      if (now.n > prev.n) nfAdd('project', plur(now.n - prev.n, 'new item') + ' added to ' + p.name, 'projects');
    }
  }
  nfSave();
}
// tells you when the free maintenance is about to end (14 days) or has ended, and a subscription is possible
function nfMaint() {
  if (!PORTAL || PORTAL.revoked || !mtLoaded) return;
  Object.values(PP).filter(Boolean).forEach(p => {
    if (!(p.mf > 0)) return;   // no paid plan has been set for this project
    const m = mtInfo(p), k = 'm:' + p.id, was = NF.sig[k]; NF.sig[k] = m.k;
    if (!NF.init || was === m.k || MT[p.id]) return;
    if (m.k === 'soon') nfAdd('maintenance', 'Free maintenance for ' + p.name + ' ends in ' + plur(m.left, 'day') + '. Subscribe for ' + money(p.mf) + ' per month.', 'projects');
    else if (m.k === 'ended') nfAdd('maintenance', 'Free maintenance for ' + p.name + ' has ended. Subscribe for ' + money(p.mf) + ' per month to keep it covered.', 'projects');
  });
  nfSave();
}
setInterval(() => { if (U) { nfMaint(); nfSubs(); } }, 600000);   // the free period can run out while the page stays open
// tells you about a new subscription, and when one is about to renew (30 days) or is due
function nfSubs() {
  if (!PORTAL || PORTAL.revoked) return;
  subList().filter(x => !x.auto).forEach(x => {
    const st = subSt(x), k = 's:' + x.id, was = NF.sig[k]; NF.sig[k] = st;
    if (!NF.init) return;
    if (was === undefined) nfAdd('subscription', 'New ' + SUB_T[x.type].l.toLowerCase() + ' subscription: ' + x.name, 'subscriptions');
    else if (was !== st && st === 'soon') nfAdd('subscription', x.name + ' renews on ' + fmtD(x.next) + '.', 'subscriptions');
    else if (was !== st && st === 'overdue') nfAdd('subscription', x.name + ' was due for renewal on ' + fmtD(x.next) + '.', 'subscriptions');
  });
  nfSave();
}
function nfPortal() {
  if (!PORTAL || PORTAL.revoked) return;
  const t = +PORTAL.updatedAt || 0, prev = NF.sig.__u;
  NF.sig.__u = t;
  if (NF.init && t && t > (prev || 0) && PORTAL.update) nfAdd('update', 'New update: ' + String(PORTAL.update).replace(/\s+/g, ' ').slice(0, 80), 'overview');
  const inv = PORTAL.invoices && typeof PORTAL.invoices === 'object' ? PORTAL.invoices : {};
  Object.keys(inv).forEach(id => {
    const v = inv[id] || {}, k = 'i:' + id, was = NF.sig[k], now = { p: v.paid === true ? 1 : 0 }, label = v.number || 'Invoice';
    NF.sig[k] = now;
    if (!NF.init) return;
    if (!was) nfAdd('invoice', 'New invoice ' + label + ': ' + money(+v.amount || 0) + (v.dueDate ? ', due ' + fmtD(v.dueDate) : ''), 'invoices');
    else if (!was.p && now.p) nfAdd('done', 'Payment received for ' + label + '. Thank you!', 'invoices');
  });
  const src = PORTAL.sourcecode && typeof PORTAL.sourcecode === 'object' ? PORTAL.sourcecode : {};
  Object.keys(src).forEach(id => {
    const v = src[id] || {}, k = 'c:' + id, was = NF.sig[k], now = { u: v.unlocked === true && !!v.link ? 1 : 0 }, label = v.title || 'Source code';
    NF.sig[k] = now;
    if (!NF.init) return;
    if (!was) nfAdd('invoice', 'New source code available: ' + label + ' (' + money(+v.amount || 0) + ')', 'source');
    else if (!was.u && now.u) nfAdd('done', label + ' is unlocked. You can open it now.', 'source');
  });
  nfSubs();
  nfSave();
}
const nfAgo = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'Just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : fmtD(t); };
function nfDraw() {
  const wrap = $('#notifWrap'); if (!wrap || !U) return;
  const on = !!PORTAL && !PORTAL.revoked; wrap.classList.toggle('hidden', !on); if (!on) return;
  const msgs = view === 'messages' ? 0 : unreadC(), unread = NF.list.filter(x => !x.read).length, total = unread + msgs, b = $('#notifBadge');
  b.textContent = total > 99 ? '99+' : total; b.classList.toggle('hidden', !total); b.classList.toggle('inline-flex', !!total);
  if (total > nfPrev) { b.classList.remove('badge-pop'); void b.offsetWidth; b.classList.add('badge-pop'); }
  nfPrev = total;
  $('#notifBtn').setAttribute('aria-label', total ? 'Notifications, ' + total + ' new' : 'Notifications');
  const row = (attrs, icon, text, sub, isNew) => `<button type="button" ${attrs} class="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left text-sm hover:bg-white/10 transition ${isNew ? 'bg-brand-500/10' : ''}"><span class="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center">${svgI(icon, 'w-4 h-4')}</span><span class="flex-1 min-w-0"><span class="block break-words ${isNew ? 'font-semibold' : 'text-slate-300'}">${esc(text)}</span><span class="block mt-0.5 text-xs text-slate-400">${esc(sub)}</span></span>${isNew ? '<span class="mt-2 shrink-0 w-2 h-2 rounded-full bg-pink" aria-hidden="true"></span>' : ''}</button>`;
  const rows = (msgs ? row('data-nv="messages"', NF_ICON.message, plur(msgs, 'unread message') + ' from EM Development', 'Tap to open the chat', true) : '')
    + NF.list.map(x => row(`data-nid="${esc(x.id)}" data-nv="${esc(x.v || '')}"`, NF_ICON[x.type] || NF_ICON.project, x.text, nfAgo(x.at), !x.read)).join('');
  const m = $('#notifMenu'), old = m.querySelector('[data-nlist]'), st = old ? old.scrollTop : 0;
  m.innerHTML = `<div class="flex items-center justify-between gap-3 px-3 pt-2 pb-1.5"><span class="text-xs font-semibold text-slate-400">Notifications</span>${unread ? '<button type="button" data-nall class="text-xs font-semibold text-brand-400 hover:text-white !bg-transparent">Mark all as read</button>' : ''}</div><div data-nlist class="max-h-[min(24rem,60dvh)] overflow-y-auto">${rows || '<p class="px-3 py-8 text-sm text-slate-400 text-center">You are all caught up.</p>'}</div>`;
  const nl = m.querySelector('[data-nlist]'); if (nl) nl.scrollTop = st;
}
const nfClose = () => { $('#notifMenu').classList.add('hidden'); $('#notifBtn').setAttribute('aria-expanded', 'false'); };
$('#notifBtn').addEventListener('click', () => {
  const m = $('#notifMenu'), open = m.classList.contains('hidden');
  m.classList.toggle('hidden', !open); $('#notifBtn').setAttribute('aria-expanded', String(open));
  if (open) { closeMenu(); nfDraw(); }
});
$('#notifMenu').addEventListener('click', e => {
  if (e.target.closest('[data-nall]')) { NF.list.forEach(x => { x.read = true; }); nfSave(); nfDraw(); return; }
  const b = e.target.closest('[data-nv]'); if (!b) return;
  const it = NF.list.find(x => x.id === b.dataset.nid); if (it && !it.read) { it.read = true; nfSave(); }
  nfClose(); nfDraw(); if (b.dataset.nv) go(b.dataset.nv);
});
document.addEventListener('click', e => { if (!$('#notifWrap').contains(e.target)) nfClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') nfClose(); });
setInterval(() => { if (!$('#notifMenu').classList.contains('hidden')) nfDraw(); }, 30000);   // keeps "5 min ago" fresh while it is open

// ---------- messages: one-to-one chat with the EM Development team ----------
// Saved at chats/<customerUid>/messages/<pushId>. chats/<customerUid>/meta holds the last message and each side's unread count.
let chatEl = null, chatMsgs = [], chatMeta = {}, chatUid = null, chatErr = '', chatStick = false, chatLoaded = false, chatLast = '', offChatM = () => {}, offChatT = () => {};
const fmtTm = t => new Date(t).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
const dayKey = t => { const d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayLabel = t => { const k = dayKey(t), n = today0().getTime(); return k === n ? 'Today' : k === n - 864e5 ? 'Yesterday' : fmtD(t); };
const unreadC = () => +chatMeta.customerUnread || 0;
const chatFail = err => /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Messaging is blocked by the database rules. Please contact EM Development.' : 'Could not send or load messages. Please try again.';
function setBadge() {
  nfDraw();
  const el = $('#msgBadge'); if (!el) return;
  const n = view === 'messages' ? 0 : unreadC();
  el.textContent = n > 99 ? '99+' : n; el.classList.toggle('hidden', !n); el.classList.toggle('inline-flex', !!n);
}
function markRead() {
  if (view !== 'messages' || document.hidden || !chatUid || !unreadC()) return;
  update(ref(db, `chats/${chatUid}/meta`), { customerUnread: 0 }).catch(() => {});
}
function drawChat() {
  if (!chatEl) return;
  const list = chatEl.querySelector('[data-clist]'), er = chatEl.querySelector('[data-cerr]'); er.textContent = chatErr;
  const stick = chatEl._force || list.scrollHeight - list.scrollTop - list.clientHeight < 80; chatEl._force = false;
  let last = '', html = '';
  chatMsgs.forEach(m => {
    const day = dayLabel(m.at);
    if (day !== last) { html += `<div class="text-center my-3"><span class="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-slate-400">${esc(day)}</span></div>`; last = day; }
    const mine = m.from === 'customer';
    html += `<div class="flex ${mine ? 'justify-end' : 'justify-start'} mb-1.5"><div class="max-w-[82%] sm:max-w-[70%] min-w-0"><div class="px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${mine ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white' : 'rounded-2xl rounded-bl-md glass'}">${esc(m.text)}</div><div class="mt-0.5 px-1 text-[10px] text-slate-500 ${mine ? 'text-right' : ''}">${m.at ? esc(fmtTm(m.at)) : 'Sending...'}</div></div></div>`;
  });
  list.innerHTML = html || `<div class="h-full flex flex-col items-center justify-center text-center px-6"><span class="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-400 flex items-center justify-center">${svgI(NAV_ICON.messages)}</span><p class="mt-3 font-semibold">No messages yet</p><p class="mt-1 text-sm text-slate-400">Say hello. Ask a question or share feedback and our team will reply here.</p></div>`;
  if (stick) list.scrollTop = list.scrollHeight;
}
function getChat() {
  if (chatEl) return chatEl;
  chatEl = document.createElement('section'); chatEl.id = 'chat'; chatEl.setAttribute('data-f', '');
  chatEl.className = card + ' !p-0 max-w-3xl flex flex-col overflow-hidden min-h-[22rem] h-[calc(100dvh-5rem)] -mb-6 sm:mb-0 sm:h-[calc(100dvh-8.5rem)]';   // phones: the chat fills the whole screen under the header
  chatEl.innerHTML = `<div class="flex items-center gap-3 px-5 py-4 border-b border-white/10"><span class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-aqua flex items-center justify-center font-extrabold text-white">E</span><div class="min-w-0"><h2 class="font-bold truncate">EM Development team</h2><p class="text-xs text-slate-400">Private conversation between you and our team</p></div></div>
    <div data-clist class="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4" role="log" aria-live="polite" aria-label="Messages"></div>
    <p data-cerr class="px-5 pb-2 text-xs text-red-400 empty:hidden" role="alert"></p>
    <form novalidate class="p-3 border-t border-white/10 flex items-end gap-2"><textarea name="t" rows="1" maxlength="1000" autocomplete="off" aria-label="Message" placeholder="Type a message..." class="field resize-none" style="max-height:8rem"></textarea><button type="submit" aria-label="Send message" class="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">${svgI('M22 2L11 13M22 2l-7 20-4-9-9-4z', 'w-5 h-5')}</button></form>`;
  const list = chatEl.querySelector('[data-clist]'), f = chatEl.querySelector('form'), ta = f.elements.t;
  list.addEventListener('scroll', () => { if (list.isConnected) list._st = list.scrollTop; });
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'; };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } });   // Enter sends, Shift+Enter adds a line
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const text = ta.value.trim().slice(0, 1000); if (!text || !PORTAL || PORTAL.revoked) return;
    ta.value = ''; grow(); chatErr = ''; chatEl._force = true;
    try {
      const k = push(ref(db, `chats/${U.uid}/messages`)).key, base = `chats/${U.uid}`;
      await update(ref(db), {
        [`${base}/messages/${k}`]: { from: 'customer', text, at: serverTimestamp() },
        [`${base}/meta/name`]: PORTAL.name || U.displayName || '', [`${base}/meta/email`]: U.email || '',
        [`${base}/meta/lastText`]: text.slice(0, 80), [`${base}/meta/lastFrom`]: 'customer', [`${base}/meta/lastAt`]: serverTimestamp(),
        [`${base}/meta/adminUnread`]: increment(1), [`${base}/meta/customerUnread`]: 0
      });
    } catch (err) { console.error('send message', err); ta.value = text; grow(); chatErr = chatFail(err); drawChat(); }
    ta.focus();
  });
  drawChat();
  return chatEl;
}
function watchChat() {
  if (!PORTAL || PORTAL.revoked) { offChatM(); offChatT(); chatUid = null; chatMsgs = []; chatMeta = {}; setBadge(); return; }
  if (chatUid === U.uid) return;
  chatUid = U.uid; chatLoaded = false; chatLast = '';
  offChatM = onValue(query(ref(db, `chats/${U.uid}/messages`), limitToLast(200)), snap => {
    const l = [];
    snap.forEach(ch => { const v = ch.val() || {}; l.push({ id: ch.key, from: v.from === 'admin' ? 'admin' : 'customer', text: String(v.text || ''), at: +v.at || 0 }); });
    chatMsgs = l; chatErr = '';
    const m = l[l.length - 1], sig = m ? m.id : '';
    if (chatLoaded && m && m.from === 'admin' && sig !== chatLast && !(view === 'messages' && !document.hidden)) toast('New message from EM Development');
    chatLast = sig; chatLoaded = true; drawChat();
  }, err => { chatErr = chatFail(err); drawChat(); });
  offChatT = onValue(ref(db, `chats/${U.uid}/meta`), snap => { chatMeta = snap.val() || {}; setBadge(); markRead(); }, () => {});
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) markRead(); });

// ---------- account: edit your name (opens a popup) ----------
// Saved to portal/<uid>/name (what the dashboard shows), users/<adminUid>/customers/<id>/name (the admin's customer list) and chats/<uid>/meta/name
// (the Messages list), all in one write, then to your sign-in profile.
let acctEl = null;
const curName = () => (PORTAL && PORTAL.name) || (U && U.displayName) || '';
function drawAcct() {
  if (!acctEl || !U) return;
  const rows = [['Email', U.email], ['Company', (PORTAL && PORTAL.company) || '']].filter(r => r[1]).map(([l, val]) => `<div class="flex items-center justify-between gap-4 py-2 border-t border-white/10 text-sm"><span class="text-slate-400">${l}</span><span class="font-semibold truncate">${esc(val)}</span></div>`).join('');
  acctEl.innerHTML = `<div class="font-bold mb-3">Your account</div><div class="flex items-center justify-between gap-4 py-2 text-sm"><span class="text-slate-400">Name</span><span class="flex items-center gap-3 min-w-0"><span class="font-semibold truncate">${esc(curName())}</span><button type="button" data-nact="edit" class="shrink-0 px-3 py-1 rounded-full glass text-xs font-semibold text-brand-400 hover:text-white transition">Edit</button></span></div>${rows}`;
}
function getAcct() {
  if (!acctEl) {
    acctEl = document.createElement('section'); acctEl.setAttribute('data-f', ''); acctEl.className = card + ' max-w-2xl mb-4';
    acctEl.addEventListener('click', e => { if (e.target.closest('[data-nact="edit"]')) nameModal(); });
  }
  drawAcct();
  return acctEl;
}
function nameModal() {
  if ($('#mdl')) return;
  const prev = document.activeElement;
  const el = document.createElement('div'); el.id = 'mdl'; el.className = 'mdl-fade';
  el.innerHTML = `<div class="mdl-scrim" data-x></div>
    <div class="mdl-card" role="dialog" aria-modal="true" aria-labelledby="mdlT" aria-describedby="mdlD" tabindex="-1">
      <span class="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-400 flex items-center justify-center">${svgI('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'w-6 h-6')}</span>
      <h2 id="mdlT" class="mt-4 text-xl font-extrabold tracking-tight">Edit your name</h2>
      <p id="mdlD" class="mt-1.5 text-sm text-slate-400">This is the name you and the EM Development team will see across your portal.</p>
      <form novalidate class="mt-5">
        <label for="mdlName" class="block text-sm font-medium text-slate-300">Name</label>
        <input id="mdlName" name="n" maxlength="80" autocomplete="name" class="field mt-1.5" value="${esc(curName())}"/>
        <p data-nmsg class="mt-2 text-sm min-h-[1.25rem] text-red-400" role="alert" aria-live="polite"></p>
        <div class="mt-4 flex flex-col-reverse sm:flex-row gap-2.5">
          <button type="button" data-no class="mdl-ghost sm:flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300">Cancel</button>
          <button type="submit" data-ok class="sm:flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30 inline-flex items-center justify-center gap-2">Save name</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(el);
  const cardEl = el.querySelector('.mdl-card'), f = el.querySelector('form'), msg = el.querySelector('[data-nmsg]'), ok = el.querySelector('[data-ok]'), no = el.querySelector('[data-no]');
  let busy = false;
  const close = () => {
    if (!el.isConnected || el.classList.contains('closing')) return;
    el.classList.add('closing'); document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { el.remove(); try { prev && prev.isConnected && prev.focus({ preventScroll: true }); } catch (x) {} }, 320);
  };
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); if (!busy) close(); return; }
    if (e.key !== 'Tab') return;
    const t = [...cardEl.querySelectorAll('input, button:not([disabled])')];
    if (!t.length) { e.preventDefault(); cardEl.focus(); return; }
    const a = document.activeElement, first = t[0], last = t[t.length - 1];
    if (!cardEl.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('click', e => { if ((e.target.closest('[data-x]') || e.target.closest('[data-no]')) && !busy) close(); });
  f.addEventListener('input', () => { if (!busy) msg.textContent = ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (busy) return;
    const n = f.elements.n.value.replace(/\s+/g, ' ').trim();
    if (!n) { msg.textContent = 'Enter your name.'; f.elements.n.focus(); return; }
    if (n === curName()) { close(); return; }
    busy = true; ok.disabled = true; no.disabled = true; ok.textContent = 'Saving...'; msg.textContent = '';
    try {
      const up = { [`portal/${U.uid}/name`]: n };
      if (PORTAL && PORTAL.admin && PORTAL.cid) up[`users/${PORTAL.admin}/customers/${PORTAL.cid}/name`] = n;
      try { const m = await get(ref(db, `chats/${U.uid}/meta`)); if (m.exists()) up[`chats/${U.uid}/meta/name`] = n; } catch (x) {}   // only touch the chat list entry if a conversation already exists
      await update(ref(db), up);
      try { await updateProfile(U, { displayName: n }); } catch (x) {}
      $('#who').textContent = n; $('#avatar').textContent = n[0].toUpperCase();
      busy = false; close(); drawAcct(); toast('Name updated');
    } catch (err) {
      console.error('update name', err); busy = false; ok.disabled = false; no.disabled = false; ok.textContent = 'Save name';
      msg.textContent = /PERMISSION_DENIED/i.test(String((err && (err.code || err.message)) || '')) ? 'Could not save your name (blocked by the database rules). Please contact EM Development.' : 'Could not save your name. Check your connection and try again.';
    }
  });
  setTimeout(() => { const i = f.elements.n; i.focus(); i.select(); }, 60);
}

// ---------- security: change password ----------
let secEl = null, secBusy = false;
const hasPw = () => U.providerData.some(p => p.providerId === 'password');
const EYE = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z';
const EYE_OFF = 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.7A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2';
const pwField = (name, label, auto) => `<label class="block text-sm font-medium text-slate-300">${label}<div class="relative mt-1.5"><input name="${name}" type="password" autocomplete="${auto}" maxlength="128" class="field" style="padding-right:48px"/><button type="button" data-eye aria-label="Show password" class="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition">${svgI(EYE, 'w-5 h-5')}</button></div></label>`;
const strength = p => { if (!p) return 0; let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.max(1, s); };
const SLABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'], SCOL = ['', 'bg-pink', 'bg-amber-400', 'bg-aqua', 'bg-emerald-400'];
function getSec() {
  if (secEl) return secEl;
  secEl = document.createElement('section'); secEl.id = 'security'; secEl.setAttribute('data-f', ''); secEl.className = card + ' max-w-2xl';
  const head = `<div class="flex items-start gap-3"><span class="w-10 h-10 shrink-0 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center">${svgI('M4 11h16v10H4zM8 11V8a4 4 0 0 1 8 0v3')}</span><div class="min-w-0"><h2 class="font-bold">Security</h2><p class="text-sm text-slate-400 mt-0.5">Change the password you use to sign in.</p></div></div>`;
  if (!hasPw()) {
    secEl.innerHTML = head + `<p class="mt-4 text-sm text-slate-300">You sign in with a Google or GitHub account, so your password is managed there.</p>`;
    return secEl;
  }
  secEl.innerHTML = head + `<form novalidate class="mt-5 space-y-4 max-w-md">
    ${pwField('cur', 'Current password', 'current-password')}
    <div>${pwField('nw', 'New password', 'new-password')}
      <div class="mt-2 flex items-center gap-2"><div class="flex-1 grid grid-cols-4 gap-1.5" data-meter>${[0, 1, 2, 3].map(() => '<i class="h-1.5 rounded-full bg-white/10 transition-colors duration-300"></i>').join('')}</div><span data-slabel class="text-xs text-slate-400 w-12 text-right"></span></div>
      <p class="mt-1.5 text-xs text-slate-500">At least 8 characters. Mixing letters, numbers and symbols makes it stronger.</p></div>
    ${pwField('cf', 'Confirm new password', 'new-password')}
    <p data-pwmsg class="text-sm min-h-[1.25rem]" role="alert" aria-live="polite"></p>
    <button type="submit" data-pwbtn class="btn-pw px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white shadow-lg shadow-brand-500/30 flex items-center gap-2.5 disabled:opacity-70"><span data-pwlabel>Update password</span></button></form>`;
  const f = secEl.querySelector('form'), msg = secEl.querySelector('[data-pwmsg]'), btn = secEl.querySelector('[data-pwbtn]'), lab = secEl.querySelector('[data-pwlabel]');
  const say = (t, ok) => { msg.textContent = t; msg.className = 'text-sm min-h-[1.25rem] ' + (ok ? 'text-emerald-300' : 'text-red-400'); };
  secEl.addEventListener('click', e => {
    const b = e.target.closest('[data-eye]'); if (!b) return;
    const i = b.parentElement.querySelector('input'), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.querySelector('path').setAttribute('d', show ? EYE_OFF : EYE);
  });
  f.elements.nw.addEventListener('input', () => {
    const s = strength(f.elements.nw.value);
    secEl.querySelectorAll('[data-meter] i').forEach((el, k) => { el.className = 'h-1.5 rounded-full transition-colors duration-300 ' + (k < s ? SCOL[s] : 'bg-white/10'); });
    secEl.querySelector('[data-slabel]').textContent = SLABEL[s]; say('');
  });
  f.addEventListener('input', () => { if (!secBusy) say(''); });
  f.addEventListener('submit', async e => {
    e.preventDefault(); e.stopPropagation(); if (secBusy) return;
    const cur = f.elements.cur.value, nw = f.elements.nw.value, cf = f.elements.cf.value;
    if (!cur) { say('Enter your current password.'); f.elements.cur.focus(); return; }
    if (nw.length < 8) { say('Your new password must be at least 8 characters.'); f.elements.nw.focus(); return; }
    if (nw === cur) { say('Your new password must be different from the current one.'); f.elements.nw.focus(); return; }
    if (nw !== cf) { say('The new passwords do not match.'); f.elements.cf.focus(); return; }
    secBusy = true; btn.disabled = true; lab.textContent = 'Updating...'; say('');
    btn.insertAdjacentHTML('afterbegin', '<span class="q-spinner" data-pwspin></span>');
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, cur));   // confirms it is really them
      await updatePassword(u, nw);
      f.reset(); f.elements.nw.dispatchEvent(new Event('input'));
      say('\u2713 Password updated. Use it the next time you sign in.', true); toast('Password updated');
      try { localStorage.setItem('pwn:' + U.uid, '1'); localStorage.setItem('pwdef:' + U.uid, 'no'); } catch (x) {}
      repaint();   // hides the "change your temporary password" banner
    } catch (err) {
      const c = String((err && err.code) || '');
      say(/wrong-password|invalid-credential|invalid-login/.test(c) ? 'Your current password is incorrect.'
        : /weak-password/.test(c) ? 'Choose a stronger password.'
        : /too-many-requests/.test(c) ? 'Too many attempts. Please try again later.'
        : /network/.test(c) ? 'Network error. Check your connection and try again.'
        : /requires-recent-login/.test(c) ? 'For your security, please log out and sign in again, then retry.'
        : 'Could not update the password. Please try again.');
      if (/wrong-password|invalid-credential|invalid-login/.test(c)) f.elements.cur.focus();
    }
    const sp = btn.querySelector('[data-pwspin]'); if (sp) sp.remove();
    secBusy = false; btn.disabled = false; lab.textContent = 'Update password';
  });
  return secEl;
}

// ---------- data: portal/<uid> tells us whose projects to show ----------
function watchPortal() {
  offPortal();
  offPortal = onValue(ref(db, `portal/${U.uid}`), snap => {
    PORTAL = snap.val() || { revoked: true };
    nfPortal();
    watchChat(); watchMaint();
    const want = PORTAL.revoked ? [] : Object.keys(PORTAL.projects || {});
    Object.keys(PW).forEach(id => { if (!want.includes(id)) { PW[id](); delete PW[id]; delete PP[id]; delete lastSnap[id]; } });
    want.forEach(id => {
      if (PW[id]) return;
      PW[id] = onValue(ref(db, `users/${PORTAL.admin}/projects/${id}`), s => {
        const v = s.val();
        PP[id] = v ? { id, name: v.name || 'Untitled project', start: v.startDate, due: v.endDate, items: arr(v.inclusions).map(x => typeof x === 'string' ? { t: x, d: false } : { t: x.t, d: x.d === true }), archived: v.archived === true, arAt: +v.archivedAt || 0, hasM: !!v.maintenance, mw: v.maintenance ? Math.max(0, +v.maintenance.weeks || 0) : 0, mf: v.maintenance ? Math.max(0, +v.maintenance.fee || 0) : 0 } : null;
        if (PP[id]) { nfProject(PP[id]); nfMaint(); }
        repaint();
      }, () => { PP[id] = null; repaint(); });
    });
    repaint();
  }, () => { PORTAL = { revoked: true }; repaint(); });
}
const stopAll = () => { offMT(); offChatM(); offChatT(); offPortal(); Object.values(PW).forEach(f => f()); PW = {}; };

// ---------- theme, nav, auth ----------
const root = document.documentElement, themeBtn = $('#themeBtn');
const syncTheme = () => themeBtn.setAttribute('aria-label', root.classList.contains('light') ? 'Switch to dark mode' : 'Switch to light mode');
syncTheme();
themeBtn.addEventListener('click', () => {
  const flip = () => { const light = root.classList.toggle('light'); try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) {} syncTheme(); };
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching'); flip(); clearTimeout(window.__tt); window.__tt = setTimeout(() => root.classList.remove('theme-switching'), 650); return;
  }
  // theme change spreads across the whole page from the toggle button
  const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('vt');
  const t = document.startViewTransition(flip);
  t.finished.finally(() => root.classList.remove('vt'));
  t.ready.then(() => root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
});
document.querySelectorAll('[data-leave]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); leave(a.getAttribute('href')); }));
$('#logoutBtn').addEventListener('click', async () => {
  const b = $('#logoutBtn'), l = $('#logoutLabel'); b.disabled = true; l.textContent = 'Logging out...';
  try { await signOut(auth); leave(LOGIN_URL); } catch (err) { b.disabled = false; l.textContent = 'Log out'; toast('Could not log out. Please try again.'); }
});
// ---------- default password popup ----------
// New customers start with the default password below. When this login still uses it, a popup asks them to pick their own right away.
// The check signs in once with the default password (reauthenticate); a result of "not the default" is remembered on this device so it is not repeated.
const TEMP_PW = '123456';
let pwPrompted = false;
const pwBad = c => /wrong-password|invalid-credential|invalid-login/.test(String(c || ''));
async function defaultPwCheck() {
  const u = U; if (!u || !u.email || !hasPw() || pwPrompted) return;
  try { if (localStorage.getItem('pwdef:' + u.uid) === 'no') return; } catch (x) {}
  try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, TEMP_PW)); }
  catch (err) { if (pwBad(err && err.code)) { try { localStorage.setItem('pwdef:' + u.uid, 'no'); } catch (x) {} } return; }   // anything else (network, too many tries): just skip, no popup
  for (let i = 0; i < 40 && U === u && (!document.body.classList.contains('ready') || $('#mdl')); i++) await new Promise(r => setTimeout(r, 250));
  if (U !== u || $('#mdl') || pwPrompted) return;
  pwPrompted = true; pwModal();
}
function pwModal() {
  const prev = document.activeElement;
  const el = document.createElement('div'); el.id = 'mdl'; el.className = 'mdl-fade';
  el.innerHTML = `<div class="mdl-scrim" data-x></div>
    <div class="mdl-card" role="dialog" aria-modal="true" aria-labelledby="mdlT" aria-describedby="mdlD" tabindex="-1">
      <span class="w-12 h-12 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center">${svgI('M4 11h16v10H4zM8 11V8a4 4 0 0 1 8 0v3', 'w-6 h-6')}</span>
      <h2 id="mdlT" class="mt-4 text-xl font-extrabold tracking-tight">Change your password</h2>
      <p id="mdlD" class="mt-1.5 text-sm text-slate-400">You are still using the temporary password we gave you. Please choose your own password now to keep your account secure.</p>
      <form novalidate class="mt-5 space-y-4">
        <div>${pwField('nw', 'New password', 'new-password')}
          <div class="mt-2 flex items-center gap-2"><div class="flex-1 grid grid-cols-4 gap-1.5" data-meter>${[0, 1, 2, 3].map(() => '<i class="h-1.5 rounded-full bg-white/10 transition-colors duration-300"></i>').join('')}</div><span data-slabel class="text-xs text-slate-400 w-12 text-right"></span></div>
          <p class="mt-1.5 text-xs text-slate-500">At least 8 characters. Mixing letters, numbers and symbols makes it stronger.</p></div>
        ${pwField('cf', 'Confirm new password', 'new-password')}
        <p data-pwmsg class="text-sm min-h-[1.25rem] text-red-400" role="alert" aria-live="polite"></p>
        <div class="flex flex-col-reverse sm:flex-row gap-2.5">
          <button type="button" data-no class="mdl-ghost sm:flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300">Remind me later</button>
          <button type="submit" data-ok class="sm:flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 font-bold text-white text-sm shadow-lg shadow-brand-500/30 inline-flex items-center justify-center gap-2">Change password</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(el);
  const cardEl = el.querySelector('.mdl-card'), f = el.querySelector('form'), msg = el.querySelector('[data-pwmsg]'), ok = el.querySelector('[data-ok]'), no = el.querySelector('[data-no]');
  let busy = false;
  const say = (t, good) => { msg.textContent = t; msg.className = 'text-sm min-h-[1.25rem] ' + (good ? 'text-emerald-300' : 'text-red-400'); };
  const close = () => {
    if (!el.isConnected || el.classList.contains('closing')) return;
    el.classList.add('closing'); document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { el.remove(); try { prev && prev.isConnected && prev.focus({ preventScroll: true }); } catch (x) {} }, 320);
  };
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); if (!busy) close(); return; }
    if (e.key !== 'Tab') return;
    const t = [...cardEl.querySelectorAll('input, button:not([disabled])')];
    if (!t.length) { e.preventDefault(); cardEl.focus(); return; }
    const a = document.activeElement, first = t[0], last = t[t.length - 1];
    if (!cardEl.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('click', e => {
    if ((e.target.closest('[data-x]') || e.target.closest('[data-no]')) && !busy) { close(); return; }
    const b = e.target.closest('[data-eye]'); if (!b) return;
    const i = b.parentElement.querySelector('input'), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.querySelector('path').setAttribute('d', show ? EYE_OFF : EYE);
  });
  f.elements.nw.addEventListener('input', () => {
    const n = strength(f.elements.nw.value);
    el.querySelectorAll('[data-meter] i').forEach((x, k) => { x.className = 'h-1.5 rounded-full transition-colors duration-300 ' + (k < n ? SCOL[n] : 'bg-white/10'); });
    el.querySelector('[data-slabel]').textContent = SLABEL[n]; say('');
  });
  f.addEventListener('input', () => { if (!busy) say(''); });
  f.addEventListener('submit', async e => {
    e.preventDefault(); if (busy) return;
    const nw = f.elements.nw.value, cf = f.elements.cf.value;
    if (nw.length < 8) { say('Your new password must be at least 8 characters.'); f.elements.nw.focus(); return; }
    if (nw === TEMP_PW) { say('Your new password must be different from the temporary one.'); f.elements.nw.focus(); return; }
    if (nw !== cf) { say('The new passwords do not match.'); f.elements.cf.focus(); return; }
    busy = true; ok.disabled = true; no.disabled = true; ok.textContent = 'Updating...'; say('');
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, TEMP_PW));
      await updatePassword(u, nw);
      try { localStorage.setItem('pwdef:' + u.uid, 'no'); localStorage.setItem('pwn:' + u.uid, '1'); } catch (x) {}
      busy = false; close(); toast('Password updated'); repaint();   // repaint hides the "change your temporary password" banner
    } catch (err) {
      const c = String((err && err.code) || '');
      busy = false; ok.disabled = false; no.disabled = false; ok.textContent = 'Change password';
      if (pwBad(c)) { try { localStorage.setItem('pwdef:' + U.uid, 'no'); } catch (x) {} say('Your password was already changed. Please sign out and sign in again.'); }
      else say(/weak-password/.test(c) ? 'Choose a stronger password.'
        : /too-many-requests/.test(c) ? 'Too many attempts. Please try again later.'
        : /network/.test(c) ? 'Network error. Check your connection and try again.'
        : /requires-recent-login/.test(c) ? 'For your security, please log out and sign in again, then retry.'
        : 'Could not update your password. Please try again.');
    }
  });
  setTimeout(() => f.elements.nw.focus(), 60);
}

onAuthStateChanged(auth, async user => {
  if (!user) { stopAll(); if (!leave.on) { document.body.classList.add('ready'); leave(LOGIN_URL); } return; }
  U = user; nfLoad();
  const n = U.displayName || U.email.split('@')[0]; $('#who').textContent = n; $('#avatar').textContent = n[0].toUpperCase();
  // team members (no portal record) belong on the admin dashboard
  let isCustomer = true;
  try { const sn = await get(ref(db, `portal/${user.uid}`)); isCustomer = sn.exists(); } catch (e) {}
  if (!isCustomer) { document.body.classList.add('ready'); leave(ADMIN_URL); return; }
  watchPortal(); defaultPwCheck();
  clearTimeout(checkReady.t); checkReady.t = setTimeout(() => checkReady(true), 8000);
});