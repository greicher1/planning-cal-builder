// phaseedge.mjs -- the month view's EDGE handles on every phase with a Length select: each custom phase
// (Weeks, Days or Dates) and the five built-ins (Weeks or Dates). MONTH-VIEW-PLAN.md §6.7, owner rulings
// 7 and 8 (15 Oct 2026); CUSTOM-PHASE-UNITS-PLAN.md step 6. Production's own handles are pilldrag.mjs's.
//
//   node phaseedge.mjs [--page /dist/index.html]
//
// Writes phaseedge.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges
// like pilldrag.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG: pilldrag.mjs's reason. Only CDP's Input.dispatchMouseEvent is
// TRUSTED input (real hit-testing, real mousedown/mousemove/mouseup), and every press here is made
// where elementsFromPoint has the handle TOPMOST (§8 step 5's rule). A dispatchEvent() drag proves only
// the handler.
//
// THE RULES UNDER TEST (installPhaseEdgeHandles): an edge drag changes the LENGTH and holds the other
// end; it is not a mover. Dates writes start-/end- directly (never through setPhaseStart, which would
// carry the end along); Days writes days- (and the start, recounting so the last day stays); a Weeks
// phase switches to Dates first, visibly, and ONE undo restores all of it. Edges land on days the phase
// is drawn on, by the day, floored at one day. Out and back, or Escape, puts back exactly what was there
// and banks nothing.
//
// customunits.sptcal (Atlanta = US-GEN: MLK Mon 1/18/27, Presidents' Day Mon 2/15/27; all-phase hiatus
// the week of Mon 2/15/27):
//   custom1 Scout        WEEKS, Snap off, Wed 1/13/27 x 2 wk -> Tue 1/26
//   custom2 Read-through DAYS 6 from Thu 1/14/27 -> Fri 1/22 (MLK skipped)
//   custom3 Stage Build  DATES Wed 2/10/27 -> Tue 2/23/27 (the hiatus week blank)
//   prePrep              WEEKS (built-in), Snap on, Mon 1/4/27 x 4 wk -> Fri 1/29
// builtindates.sptcal: post DATES (built-in) Thu 4/1/27 -> Wed 5/12/27.
//
//   F0  January: the handles sit where they should -- custom2's first pill START only, its last END only;
//       custom1's middle pill none; prePrep's first START, last END -- children of <body>, all topmost
//   F1  DAYS end across a weekend, one gesture: Sat keeps Fri 1/22 (6), Sun -> Mon 1/25 (7), start held;
//       ONE Ctrl+Z -> 6
//   F2  DAYS start right across a weekend and MLK: Sat -> Fri 1/15 (5), Mon 1/18 -> Tue 1/19 (4), the
//       last day Fri 1/22 held; ONE Ctrl+Z -> Thu 1/14, 6
//   F3  DATES end right a day: end 2/24, start held; ONE Ctrl+Z -> 2/23
//   F4  DATES end into the hiatus week: Wed 2/17 -> Mon 2/22 (the tie goes to the smaller change), then
//       Thu 2/11; never a hiatus day stored
//   F5  DATES start left a day: start 2/9 and the END STILL 2/23 (not setPhaseStart); ONE Ctrl+Z
//   F6  floors: DAYS end dragged before its start -> 1 working day; DATES end before its start -> one day
//   F7  ⭐ WEEKS end right a day (custom1): the Length select shows Dates, start 1/13, end 1/27, the
//       old-build fallback weeks- 3; ONE Ctrl+Z -> Weeks, 2, the end box as it was; Redo -> Dates and 3
//       (the fallback is INSIDE the banked step)
//   F8  BUILT-IN WEEKS start right a day (prePrep, Snap on): Dates, start Tue 1/5, end held Fri 1/29,
//       Snap to Mon untouched; ONE Ctrl+Z -> Weeks, Mon 1/4
//   F9  WEEKS end out and back in ONE gesture: Dates mid-gesture, then Weeks exactly as it was, and no
//       undo step banked: the next Ctrl+Z undoes the switch to the month view (viewMode is in the
//       snapshot), which it could not reach past a banked step
//   F10 Escape mid-drag (DATES end): put back, the shield gone, no undo step banked (F9's probe)
//   F11 BUILT-IN DATES start left a day (post): start Wed 3/31, end still 5/12; ONE Ctrl+Z
//   F12 print: the handle is display:none under body.printing-calendar in print media, and never in
//       #print-root or #table-wrap
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8232));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8232 ? PORT : ''}-phaseedge`;
const OUT = path.join(HERE, 'phaseedge.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'phaseedge', cases: [] };
// A hang must REPORT, not block a gate run: after 480 s the script writes what it has and exits.
setTimeout(() => {
  out.EX = 'phaseedge: hit its 480 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 480000).unref();
const kase = (id, title, pass, extra) => out.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));
let srv = null, chrome = null;
try {
  fs.rmSync(OUT, { force: true });
  try { execFileSync('pkill', ['-f', `srv.js ${PORT} `]); } catch (e) { /* none running */ }
  await sleep(500);
  srv = spawn('node', [path.join(HERE, 'srv.js'), String(PORT), ROOT, path.join(HERE, 't')], { stdio: 'ignore' });
  await sleep(1500);
  fs.rmSync(PROFILE, { recursive: true, force: true });
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${PROFILE}`,
    '--window-size=1600,1200', '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
  let devPort = 0;
  for (let i = 0; i < 100 && !devPort; i++) {
    await sleep(100);
    try { devPort = Number(fs.readFileSync(path.join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (e) { /* not yet */ }
  }
  if (!devPort) throw new Error('Chrome never wrote DevToolsActivePort');
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${devPort}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) { /* not yet */ }
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('no page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket failed')); });
  let seq = 0; const waiting = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    // A drag leaves the calendar dirty, so the next navigation raises "Leave site?" (pilldrag's trap).
    if (m.method === 'Page.javascriptDialogOpening') {
      const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  const until = async (expr, label, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return; await sleep(100); }
    throw new Error('timed out waiting for ' + label);
  };
  const mouse = (type, x, y, buttons) => send('Input.dispatchMouseEvent',
    { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
  const key = async (k, code, vk, modifiers) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
  };
  const ctrlZ = async () => { await key('z', 'KeyZ', 90, 2); await sleep(900); };
  const ctrlShiftZ = async () => { await key('Z', 'KeyZ', 90, 2 | 8); await sleep(900); };

  await send('Page.enable');
  // A fresh page per case, so no case inherits another's leftovers.
  const load = async (stateName, month) => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${stateName}` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && !!document.getElementById('unit-prePrep')`, 'the engine');
    await sleep(800);
    // The previous case's drag left a crash backup in this profile; decline the recovery modal (setup).
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(400);
    await ev(`document.getElementById('view-month-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap .mv-monthyear')`, 'the month view');
    await sleep(300);
    if (month) await gotoMonth(month);
    await sleep(300);
  };
  // Page the month view to e.g. 'January 2027' with its own arrows.
  const gotoMonth = label => ev(`(async () => {
    const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const idx = t => { const [m, y] = String(t).trim().split(/\\s+/); return +y * 12 + M.indexOf(m); };
    const lbl = () => ((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '').trim();
    const want = idx(${JSON.stringify(label)});
    for (let i = 0; i < 40 && idx(lbl()) !== want; i++) {
      document.getElementById(idx(lbl()) < want ? 'mv-next' : 'mv-prev').click();
      await new Promise(r => setTimeout(r, 200));
    }
    return lbl(); })()`);
  // A phase's row as the sidebar shows it, plus whether Undo has anything to undo.
  const fields = k => ev(`(() => {
    const $ = id => document.getElementById(id);
    const v = id => { const e = $(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : null; };
    const shown = id => { const e = $(id), l = e && e.closest('label'); return !!l && getComputedStyle(l).display !== 'none'; };
    const metas = ['meta-${k}', 'unitmeta-${k}'].map($).filter(e => e && getComputedStyle(e).display !== 'none');
    const u = $('undo-btn');
    return { unit: v('unit-${k}'), start: v('start-${k}'), end: v('end-${k}'), days: v('days-${k}'), weeks: v('weeks-${k}'),
      snap: v('snap-${k}'), endShown: shown('end-${k}'), weeksShown: shown('weeks-${k}'),
      meta: metas.map(e => (e.textContent || '').replace(/\\s+/g, ' ').trim()).join(' || '),
      undoOff: !!u && (u.disabled || u.hasAttribute('data-disabled')),
      month: !!document.querySelector('#table-wrap .mv-monthyear'),
      shield: !!document.querySelector('.phase-edge-shield') }; })()`);
  // The Nth pill of a phase on the page (negative counts from the end), scrolled into view.
  const pillOf = (k, n) => ev(`(async () => {
    const ps = Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="${k}"]'));
    const p = ps[${n} < 0 ? ps.length + ${n} : ${n}]; if (!p) return null;
    p.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300));
    const r = p.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom,
             gc: p.style.gridColumnStart + '/' + p.style.gridColumnEnd,
             row: Array.prototype.indexOf.call(p.closest('.mv-body').children, p.closest('.mv-week')) }; })()`);
  // Every handle as hit-testing sees it.
  const handles = () => ev(`Array.from(document.querySelectorAll('.phase-edge-handle')).map(h => {
    const r = h.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const stack = h.hidden ? [] : document.elementsFromPoint(x, y);
    return { edge: h.dataset.edge, ph: h.dataset.ph || null, hidden: h.hidden, x, y, l: r.left, r: r.right, t: r.top, b: r.bottom,
             topmost: stack[0] === h, parentIsBody: h.parentElement === document.body, title: h.title }; })`);
  const visible = hs => hs.filter(h => !h.hidden);
  const kinds = hs => visible(hs).map(h => h.edge).sort().join(',');
  const by = (hs, k) => visible(hs).find(h => h.edge === k);
  // A day cell's centre, checked against its rendered day number.
  const cell = (row, col, num) => ev(`(() => {
    const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    const c = w && w.querySelectorAll(':scope > .mv-daygrid > .mv-daycell')[${col}]; if (!c) return null;
    const r = c.getBoundingClientRect(), n = parseInt(c.querySelector('.mv-daynum').textContent, 10);
    return n === ${num} ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  // Rest on a pill (away from its edges), then read the handles.
  const restOn = async pill => { await mouse('mouseMoved', pill.x, pill.y, 0); await sleep(250); return handles(); };
  // The pointer that puts the edge on day cell `to`, for a handle whose edge is on day cell `from`:
  // the handle's own x shifted by the cells' distance, and the target cell's row.
  const toward = (h, from, to) => [h.x + (to.x - from.x), to.y];
  // One press on a handle, a path of points (each [x, y, readMid]), and a release at the last one.
  const dragPath = async (h, pts, k, mids) => {
    await mouse('mouseMoved', h.x, h.y, 0);
    await mouse('mousePressed', h.x, h.y, 1);
    await sleep(150);
    for (const [x, y, readMid] of pts) {
      await mouse('mouseMoved', x, y, 1);
      await sleep(350);
      if (readMid && mids) mids.push(await fields(k));
    }
    const [lx, ly] = pts[pts.length - 1];
    await mouse('mouseReleased', lx, ly, 0);
    await sleep(700);
  };

  // ---- F0: where the handles are, January 2027 ------------------------------------------------
  // January 2027's rows: 0 = 12/27-1/2, 1 = 1/3-9, 2 = 1/10-16, 3 = 1/17-23, 4 = 1/24-30. Sun = column 0.
  await load('customunits', 'January 2027');
  const f0 = {};
  for (const [name, k, n] of [['rt1', 'custom2', 0], ['rtN', 'custom2', -1], ['scMid', 'custom1', 1], ['ppFirst', 'prePrep', 0], ['ppLast', 'prePrep', -1]]) {
    const p = await pillOf(k, n);
    f0[name] = { pill: p, hs: p ? await restOn(p) : [] };
  }
  out.F0 = f0;
  const edgeOk = (o, kind, side) => { const h = by(o.hs, kind); return !!h && !!o.pill && h.topmost === true && h.parentIsBody === true
    && (side === 'left' ? Math.abs(h.l - o.pill.l) < 1 : Math.abs(h.r - o.pill.r) < 1) && h.t >= o.pill.t - 1 && h.b <= o.pill.b + 1; };
  kase('F0', "January: Read-through's first pill START only, last END only; Scout's middle pill none; Pre Prep's first START, last END; on <body>, topmost",
       kinds(f0.rt1.hs) === 'start' && edgeOk(f0.rt1, 'start', 'left') && f0.rt1.pill.gc === '5/7'
       && kinds(f0.rtN.hs) === 'end' && edgeOk(f0.rtN, 'end', 'right') && f0.rtN.pill.gc === '3/7'
       && kinds(f0.scMid.hs) === ''
       && kinds(f0.ppFirst.hs) === 'start' && edgeOk(f0.ppFirst, 'start', 'left')
       && kinds(f0.ppLast.hs) === 'end' && edgeOk(f0.ppLast, 'end', 'right')
       && visible(f0.rt1.hs).every(h => h.ph === 'custom2'), out.F0);

  // ---- F1: DAYS end across a weekend ----------------------------------------------------------
  await load('customunits', 'January 2027');
  const f1a = await fields('custom2');
  const h1 = by(await restOn(await pillOf('custom2', -1)), 'end');
  const fri1 = await cell(3, 5, 22), sat1 = await cell(3, 6, 23), sun1 = await cell(4, 0, 24);
  const mids1 = [];
  if (h1 && fri1 && sat1 && sun1) await dragPath(h1, [[...toward(h1, fri1, sat1), true], [...toward(h1, fri1, sun1), true]], 'custom2', mids1);
  const f1b = await fields('custom2');
  await ctrlZ();
  const f1c = await fields('custom2');
  out.F1 = { before: f1a, handle: h1, mids: mids1, landed: f1b, undone: f1c };
  kase('F1', 'DAYS end across a weekend: Sat keeps Fri 1/22 (6), Sun -> Mon 1/25 (7), start held; ONE Ctrl+Z -> 6',
       !!h1 && f1a.days === '6' && f1a.unit === 'days' && mids1.length === 2 && mids1[0].days === '6' && mids1[1].days === '7'
       && f1b.days === '7' && f1b.start === '2027-01-14' && / Mon 1\/25\/27/.test(f1b.meta) && f1b.shield === false
       && f1c.days === '6' && f1c.start === '2027-01-14' && / Fri 1\/22\/27/.test(f1c.meta), out.F1);

  // ---- F2: DAYS start across a weekend and MLK ------------------------------------------------
  await load('customunits', 'January 2027');
  const h2 = by(await restOn(await pillOf('custom2', 0)), 'start');
  const thu2 = await cell(2, 4, 14), sat2 = await cell(2, 6, 16), mon2 = await cell(3, 1, 18);
  const mids2 = [];
  if (h2 && thu2 && sat2 && mon2) await dragPath(h2, [[...toward(h2, thu2, sat2), true], [...toward(h2, thu2, mon2), true]], 'custom2', mids2);
  const f2b = await fields('custom2');
  await ctrlZ();
  const f2c = await fields('custom2');
  out.F2 = { handle: h2, mids: mids2, landed: f2b, undone: f2c };
  kase('F2', 'DAYS start right: Sat -> Fri 1/15 (5), Mon 1/18 (MLK) -> Tue 1/19 (4), last day Fri 1/22 held; ONE Ctrl+Z -> Thu 1/14, 6',
       !!h2 && mids2.length === 2 && mids2[0].start === '2027-01-15' && mids2[0].days === '5'
       && mids2[1].start === '2027-01-19' && mids2[1].days === '4'
       && f2b.start === '2027-01-19' && f2b.days === '4' && / Tue 1\/19\/27 → Fri 1\/22\/27/.test(f2b.meta)
       && f2c.start === '2027-01-14' && f2c.days === '6', out.F2);

  // ---- F3: DATES end right a day ----------------------------------------------------------------
  // February 2027's rows: 0 = 1/31-2/6, 1 = 2/7-13, 2 = 2/14-20 (the hiatus), 3 = 2/21-27.
  await load('customunits', 'February 2027');
  const h3 = by(await restOn(await pillOf('custom3', -1)), 'end');
  const tue3 = await cell(3, 2, 23), wed3 = await cell(3, 3, 24);
  if (h3 && tue3 && wed3) await dragPath(h3, [[h3.x + (wed3.x - tue3.x) * 0.55, h3.y], toward(h3, tue3, wed3)], 'custom3');
  const f3b = await fields('custom3');
  await ctrlZ();
  const f3c = await fields('custom3');
  out.F3 = { handle: h3, landed: f3b, undone: f3c };
  kase('F3', 'DATES end right a day: end 2/24, start held at 2/10; ONE Ctrl+Z -> 2/23',
       !!h3 && h3.topmost === true && f3b.unit === 'dates' && f3b.end === '2027-02-24' && f3b.start === '2027-02-10'
       && f3c.end === '2027-02-23' && f3c.start === '2027-02-10', out.F3);

  // ---- F4: DATES end into the hiatus week, and across it -----------------------------------------
  await load('customunits', 'February 2027');
  const h4 = by(await restOn(await pillOf('custom3', -1)), 'end');
  const tue4 = await cell(3, 2, 23), wed4 = await cell(2, 3, 17), thu4 = await cell(1, 4, 11);
  const mids4 = [];
  if (h4 && tue4 && wed4 && thu4) await dragPath(h4, [[...toward(h4, tue4, wed4), true], [...toward(h4, tue4, thu4), true]], 'custom3', mids4);
  const f4b = await fields('custom3');
  out.F4 = { handle: h4, mids: mids4, landed: f4b };
  kase('F4', 'DATES end onto Wed 2/17 (hiatus) lands Mon 2/22 (tie -> smaller change), then Thu 2/11; no hiatus day stored',
       !!h4 && mids4.length === 2 && mids4[0].end === '2027-02-22' && mids4[1].end === '2027-02-11'
       && f4b.end === '2027-02-11' && f4b.start === '2027-02-10' && /Wed 2\/10\/27 → Thu 2\/11\/27/.test(f4b.meta), out.F4);

  // ---- F5: DATES start left a day: the end does NOT move ----------------------------------------
  await load('customunits', 'February 2027');
  const h5 = by(await restOn(await pillOf('custom3', 0)), 'start');
  const wed5 = await cell(1, 3, 10), tue5 = await cell(1, 2, 9);
  if (h5 && wed5 && tue5) await dragPath(h5, [[h5.x - (wed5.x - tue5.x) * 0.55, h5.y], toward(h5, wed5, tue5)], 'custom3');
  const f5b = await fields('custom3');
  await ctrlZ();
  const f5c = await fields('custom3');
  out.F5 = { handle: h5, landed: f5b, undone: f5c };
  kase('F5', 'DATES start left a day: start 2/9 and the END STILL 2/23 (written directly, not setPhaseStart); ONE Ctrl+Z -> 2/10',
       !!h5 && h5.topmost === true && f5b.start === '2027-02-09' && f5b.end === '2027-02-23' && f5b.unit === 'dates'
       && f5c.start === '2027-02-10' && f5c.end === '2027-02-23', out.F5);

  // ---- F6: the floors ---------------------------------------------------------------------------
  await load('customunits', 'January 2027');
  const h6a = by(await restOn(await pillOf('custom2', -1)), 'end');
  const fri6 = await cell(3, 5, 22), mon6 = await cell(2, 1, 11);
  if (h6a && fri6 && mon6) await dragPath(h6a, [toward(h6a, fri6, mon6)], 'custom2');
  const f6a = await fields('custom2');
  await gotoMonth('February 2027');
  await sleep(300);
  const h6b = by(await restOn(await pillOf('custom3', -1)), 'end');
  const tue6 = await cell(3, 2, 23), mon6b = await cell(1, 1, 8);
  if (h6b && tue6 && mon6b) await dragPath(h6b, [toward(h6b, tue6, mon6b)], 'custom3');
  const f6b = await fields('custom3');
  out.F6 = { days: { handle: h6a, landed: f6a }, dates: { handle: h6b, landed: f6b } };
  kase('F6', 'floors: DAYS end dragged before its start -> 1 working day (Thu 1/14); DATES end before its start -> 2/10, one day',
       !!h6a && f6a.days === '1' && f6a.start === '2027-01-14' && !!h6b && f6b.end === '2027-02-10' && f6b.start === '2027-02-10', out.F6);

  // ---- F7: WEEKS end -> Dates (custom) ----------------------------------------------------------
  await load('customunits', 'January 2027');
  const f7a = await fields('custom1');
  const h7hs = await restOn(await pillOf('custom1', -1));
  const h7 = by(h7hs, 'end');
  const tue7 = await cell(4, 2, 26), wed7 = await cell(4, 3, 27);
  if (h7 && tue7 && wed7) await dragPath(h7, [[h7.x + (wed7.x - tue7.x) * 0.55, h7.y], toward(h7, tue7, wed7)], 'custom1');
  const f7b = await fields('custom1');
  await ctrlZ();
  const f7c = await fields('custom1');
  await ctrlShiftZ();
  const f7d = await fields('custom1');
  out.F7 = { before: f7a, handle: h7, landed: f7b, undone: f7c, redone: f7d };
  kase('F7', "WEEKS end right a day: Length shows Dates, 1/13 -> 1/27, fallback weeks 3; ONE Ctrl+Z -> Weeks, 2, end box as it was; Redo -> Dates, 3",
       !!h7 && /switches to Dates/.test(h7.title) && f7a.unit === 'weeks' && f7a.weeks === '2' && f7a.start === '2027-01-13'
       && f7b.unit === 'dates' && f7b.endShown === true && f7b.weeksShown === false
       && f7b.start === '2027-01-13' && f7b.end === '2027-01-27' && f7b.weeks === '3'
       && f7c.unit === 'weeks' && f7c.weeksShown === true && f7c.weeks === '2' && f7c.start === '2027-01-13' && f7c.end === f7a.end
       && f7d.unit === 'dates' && f7d.end === '2027-01-27' && f7d.weeks === '3', out.F7);

  // ---- F8: BUILT-IN WEEKS start -> Dates, Snap to Mon on ------------------------------------------
  await load('customunits', 'January 2027');
  const f8a = await fields('prePrep');
  const h8 = by(await restOn(await pillOf('prePrep', 0)), 'start');
  const mon8 = await cell(1, 1, 4), tue8 = await cell(1, 2, 5);
  if (h8 && mon8 && tue8) await dragPath(h8, [[h8.x + (tue8.x - mon8.x) * 0.55, h8.y], toward(h8, mon8, tue8)], 'prePrep');
  const f8b = await fields('prePrep');
  await ctrlZ();
  const f8c = await fields('prePrep');
  out.F8 = { before: f8a, handle: h8, landed: f8b, undone: f8c };
  kase('F8', 'BUILT-IN WEEKS start right a day (Snap on): Dates, Tue 1/5 -> Fri 1/29 (end held), Snap untouched; ONE Ctrl+Z -> Weeks, Mon 1/4',
       !!h8 && h8.topmost === true && f8a.unit === 'weeks' && f8a.start === '2027-01-04' && f8a.snap === true
       && f8b.unit === 'dates' && f8b.start === '2027-01-05' && f8b.end === '2027-01-29' && f8b.snap === true && f8b.endShown === true
       && f8c.unit === 'weeks' && f8c.start === '2027-01-04' && f8c.end === f8a.end && f8c.weeks === f8a.weeks && f8c.snap === true, out.F8);

  // ---- F9: WEEKS end out and back in ONE gesture ------------------------------------------------
  await load('customunits', 'January 2027');
  const f9a = await fields('custom1');
  const h9 = by(await restOn(await pillOf('custom1', -1)), 'end');
  const tue9 = await cell(4, 2, 26), wed9 = await cell(4, 3, 27);
  const mids9 = [];
  if (h9 && tue9 && wed9) await dragPath(h9, [[...toward(h9, tue9, wed9), true], [h9.x, h9.y]], 'custom1', mids9);
  const f9b = await fields('custom1');
  // ⭐ "Banked nothing", observed: switching to the month view is itself an undo step (viewMode is in
  // the snapshot), so the ONE Ctrl+Z after the gesture must take the calendar back to the waterfall.
  // Had the gesture banked a step, that Ctrl+Z would land on it and stay in the month view.
  await ctrlZ();
  const f9u = await fields('custom1');
  out.F9 = { before: f9a, mid: mids9[0], back: f9b, undone: f9u };
  const same = (a, b) => JSON.stringify(Object.assign({}, a, { shield: 0 })) === JSON.stringify(Object.assign({}, b, { shield: 0 }));
  kase('F9', 'WEEKS end out a day and back, ONE gesture: Dates mid-gesture, then Weeks exactly as it was; the next Ctrl+Z undoes the VIEW switch (nothing banked)',
       !!h9 && f9a.month === true && !!mids9[0] && mids9[0].unit === 'dates' && mids9[0].end === '2027-01-27'
       && same(f9b, f9a) && f9u.month === false && f9u.unit === 'weeks' && f9u.end === f9a.end && f9u.weeks === f9a.weeks, out.F9);

  // ---- F10: Escape mid-drag -------------------------------------------------------------------------
  await load('customunits', 'February 2027');
  const f10a = await fields('custom3');
  const h10 = by(await restOn(await pillOf('custom3', -1)), 'end');
  const tue10 = await cell(3, 2, 23), thu10 = await cell(3, 4, 25);
  let f10mid = null;
  if (h10 && tue10 && thu10) {
    await mouse('mouseMoved', h10.x, h10.y, 0);
    await mouse('mousePressed', h10.x, h10.y, 1);
    await sleep(150);
    const [x, y] = toward(h10, tue10, thu10);
    await mouse('mouseMoved', x, y, 1);
    await sleep(400);
    f10mid = await fields('custom3');
    await key('Escape', 'Escape', 27, 0);
    await sleep(400);
    await mouse('mouseReleased', x, y, 0);
    await sleep(700);
  }
  const f10b = await fields('custom3');
  await ctrlZ();                                   // F9's probe: this must undo the view switch
  const f10u = await fields('custom3');
  out.F10 = { before: f10a, mid: f10mid, after: f10b, undone: f10u };
  kase('F10', 'Escape mid-drag (DATES end at 2/25): back to 2/23, the shield gone; the next Ctrl+Z undoes the VIEW switch (nothing banked)',
       !!h10 && !!f10mid && f10mid.end === '2027-02-25' && f10mid.shield === true
       && f10b.end === '2027-02-23' && f10b.start === '2027-02-10' && f10b.shield === false && f10b.month === true
       && f10u.month === false && f10u.end === '2027-02-23', out.F10);

  // ---- F11: BUILT-IN DATES start left a day (post) ---------------------------------------------------
  // April 2027's row 0 is Sun 3/28 - Sat 4/3; Thu 4/1 is column 4.
  await load('builtindates', 'April 2027');
  const f11a = await fields('post');
  const h11 = by(await restOn(await pillOf('post', 0)), 'start');
  const thu11 = await cell(0, 4, 1), wed11 = await cell(0, 3, 31);
  if (h11 && thu11 && wed11) await dragPath(h11, [[h11.x - (thu11.x - wed11.x) * 0.55, h11.y], toward(h11, thu11, wed11)], 'post');
  const f11b = await fields('post');
  await ctrlZ();
  const f11c = await fields('post');
  out.F11 = { before: f11a, handle: h11, landed: f11b, undone: f11c };
  kase('F11', 'BUILT-IN DATES start left a day (Post): start Wed 3/31, end still 5/12; ONE Ctrl+Z -> 4/1',
       !!h11 && h11.topmost === true && f11a.unit === 'dates' && f11a.start === '2027-04-01' && f11a.end === '2027-05-12'
       && f11b.start === '2027-03-31' && f11b.end === '2027-05-12' && f11c.start === '2027-04-01' && f11c.end === '2027-05-12', out.F11);

  // ---- F12: print ---------------------------------------------------------------------------------
  await load('customunits', 'February 2027');
  const h12 = visible(await restOn(await pillOf('custom3', 0)));
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  const e12 = await ev(`(() => { document.body.classList.add('printing-calendar');
    const h = document.querySelector('.phase-edge-handle[data-edge="start"]:not([hidden])');
    const r = { shown: !!h, display: h ? getComputedStyle(h).display : null,
      inPrintRoot: document.querySelectorAll('#print-root .phase-edge-handle, #print-root .phase-edge-shield').length,
      inTableWrap: document.querySelectorAll('#table-wrap .phase-edge-handle, #table-wrap .phase-edge-shield').length };
    document.body.classList.remove('printing-calendar'); return r; })()`);
  await send('Emulation.setEmulatedMedia', { media: '' });
  out.F12 = { handles: h12, print: e12 };
  kase('F12', 'print media + body.printing-calendar: the shown handle is display:none; none in #print-root or #table-wrap',
       h12.length === 1 && e12.shown === true && e12.display === 'none' && e12.inPrintRoot === 0 && e12.inTableWrap === 0, out.F12);
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'phaseedge threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`phaseedge: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
