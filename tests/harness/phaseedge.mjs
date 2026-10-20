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
//   F13 R5 for the grips (owner, 19 Oct 2026), on autonote-grips.sptcal: Writer's Rm's start a week right
//       (Mon 1/5 -> Mon 1/12) with its week's note EDITED ("Writer's Room Opens 1/5/26" + "Pitch day"): the
//       1/12 week reads "Writer's Room Opens 1/12/26", Pitch day stays on 1/5, no 1/5/26 left; ONE Ctrl+Z
//       restores it. Red before the fix.
//
// ⭐ THE PREP START GRIP (PREP-GRIP-PLAN.md, owner, 19 Oct 2026), on episodeprep.sptcal and its Blocks twin:
//   G0  the row of Sun 2/28/27: Prep 303's pill from Mon 3/1 (its first day) has a start grip, Prep 304's from the SAME
//       Monday (a continuation) has none, 304's first pill (2/24) has one; never an end grip
//   G1  Prep 303's start left a working day (3/1 -> Fri 2/26): its box 10 -> 11, its end still 3/12, nothing else moved;
//       ONE Ctrl+Z -> 10
//   G2  Prep 302 (blank, the default 5) onto Mon 2/15, Presidents' Day: lands Tue 2/16, box 4; Undo off -> on
//   G3  out a day and back in ONE gesture: the box BLANK again (not "5"), Undo still off
//   G4  onto Sat 2/13 and Sun 2/14: no change; onto Thu 2/11: 6
//   G5  the floor (ruling Q2(a)): past its end -> one working day, Fri 2/19
//   G6  Escape mid-drag: back to blank, the shield gone, Undo still off
//   G7  Blocks: Prep Block 3 (its own 12) left a working day: 13, the other blocks' boxes unchanged
//   G8  print: the prep grip is display:none, and never inside the grid
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

  // ---- F13: R5 for the edge grips (owner, 19 Oct 2026) ------------------------------------------
  // autonote-grips.sptcal (see pilldrag.mjs E15): Writer's Rm, Weeks from Mon 1/5/26, with its week's note
  // edited to "Writer's Room Opens 1/5/26" + "Pitch day". Its start grip goes a WEEK right, onto Mon 1/12
  // (January 2026's row 1 is Sun 1/4 - Sat 1/10, row 2 Sun 1/11 - Sat 1/17). The auto line leaves the 1/5
  // week's note, the user's line stays there, and the 1/12 week shows the plain auto-note.
  // Cross-week on purpose: it covers the auto line leaving its week (see pilldrag.mjs D5, and E18/E19 for the
  // one-digit-day placement fixed the same day).
  const notesShown = () => ev(`Array.from(document.querySelectorAll('#table-wrap .mv-note-block'))
    .map(b => b.dataset.noteDay + '|' + b.innerText.replace(/\\s+/g, ' ').trim())`);
  await load('autonote-grips', 'January 2026');
  const n13a = await notesShown();
  const h13 = by(await restOn(await pillOf('writersRoom', 0)), 'start');
  const mon13 = await cell(1, 1, 5), mid13 = await cell(1, 4, 8), mon13b = await cell(2, 1, 12);
  if (h13 && mon13 && mid13 && mon13b) await dragPath(h13, [toward(h13, mon13, mid13), toward(h13, mon13, mon13b)], 'writersRoom');
  const f13 = await fields('writersRoom'), n13b = await notesShown();
  await ctrlZ();
  const f13u = await fields('writersRoom'), n13c = await notesShown();
  out.F13 = { before: n13a, handle: h13, landed: f13, after: n13b, undoneFields: f13u, undone: n13c };
  kase('F13', 'an EDITED "Writer\'s Room Opens" follows the start grip a week right: 1/12/26 on 1/12, Pitch day kept on 1/5, '
       + 'no 1/5/26 left; ONE Ctrl+Z restores it',
       !!h13 && h13.topmost === true && n13a.indexOf("2026-01-05|Writer's Room Opens 1/5/26") >= 0
       && f13.unit === 'dates' && f13.start === '2026-01-12'
       && n13b.indexOf("2026-01-12|Writer's Room Opens 1/12/26") >= 0 && n13b.indexOf('2026-01-05|Pitch day') >= 0
       && !n13b.some(s => /Opens 1\/5\/26/.test(s))
       && f13u.unit === 'weeks' && f13u.start === '2026-01-05' && JSON.stringify(n13c) === JSON.stringify(n13a), out.F13);
  // ---- G: the prep START grip (PREP-GRIP-PLAN.md, owner, 19 Oct 2026) ----------------------------
  // Its own block, so its names cannot collide with the F cases'.
  {
  // episodeprep.sptcal (t/episodeprep.js's hand trace; all 2027, Atlanta): default 5 working days, 304 its own 8,
  // 303 its own 10. Prep 302 Fri 2/12 + 2/16-2/19 (Presidents' Day 2/15 skipped); Prep 304 2/24-3/5; Prep 303
  // 3/1-3/12 (the hiatus week of 3/15 lies before its shoot). February 2027's page starts Sun 1/31: row 1 is
  // 2/7-2/13, row 2 2/14-2/20, row 3 2/21-2/27, row 4 2/28-3/6.
  // Every prep pill on the page with its label and dates (the grid starts on the Sunday on or before the 1st).
  // `pick` scrolls the earliest ('first') or latest ('last') pill of `label` into view and returns just it.
  const prepPills = (label, pick, from) => ev(`(async () => {
    const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [mn, yr] = document.querySelector('#table-wrap .mv-monthyear').textContent.trim().split(/\\s+/);
    const first = Date.UTC(+yr, M.indexOf(mn), 1), g0 = first - new Date(first).getUTCDay() * 864e5;
    const iso = t => new Date(t).toISOString().slice(0, 10);
    const weeks = Array.from(document.querySelectorAll('#table-wrap .mv-body > .mv-week'));
    const read = p => { const row = weeks.indexOf(p.closest('.mv-week')), a = +p.style.gridColumnStart, b = +p.style.gridColumnEnd;
      const r = p.getBoundingClientRect();
      const label = (p.firstChild && p.firstChild.nodeType === 3 ? p.firstChild.textContent : p.textContent).trim();
      return { label, row, from: iso(g0 + (row * 7 + a - 1) * 864e5), to: iso(g0 + (row * 7 + b - 2) * 864e5),
               x: r.left + Math.min(r.width / 2, 30), y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const els = Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="episodePrep"]'));
    const want = ${JSON.stringify(label || null)}, pick = ${JSON.stringify(pick || null)}, on = ${JSON.stringify(from || null)};
    if (!want) return els.map(read);
    const mine = els.filter(p => read(p).label === want && (!on || read(p).from === on)).sort((a, b) => read(a).from < read(b).from ? -1 : 1);
    const el = pick === 'last' ? mine[mine.length - 1] : mine[0];
    if (!el) return null;
    el.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300));
    return read(el); })()`);
  // The pill of `label` that starts on `from`, scrolled into view (two preps can share a start day).
  const prepPillOn = (label, from) => prepPills(label, 'first', from);
  // The Prep row's per-unit boxes: {name: {v, edited}}.
  const prepBoxes = () => ev(`Object.fromEntries(Array.from(document.querySelectorAll('#prep-rows .prep-unit-row')).map(r => {
    const i = r.querySelector('.prep-unit-days');
    return [r.querySelector('.prep-unit-name').textContent.trim(), { v: i.value, edited: i.classList.contains('is-edited') }]; }))`);
  // ⚠️ "Nothing banked" is read off the Undo button, not F9's Ctrl+Z probe: episodeprep.sptcal is SAVED in the
  // month view, so load()'s click on the month button is no step, and the stack starts empty. G2 shows the
  // button enabled after a real drag, so the probe can see a banked step.
  const undoOff = () => ev(`(() => { const u = document.getElementById('undo-btn'); return !!u && (u.disabled || u.hasAttribute('data-disabled')); })()`);
  const spanOf = (ps, label) => { const m = ps.filter(p => p.label === label).sort((a, b) => a.from < b.from ? -1 : 1);
    return m.length ? { from: m[0].from, to: m[m.length - 1].to } : null; };
  const others = () => ev(`(() => { const o = {}; document.querySelectorAll('input[id^="start-"], input[id^="end-"]').forEach(i => { o[i.id] = i.value; });
    o.meta = (document.getElementById('meta-production') || {}).innerText || ''; return o; })()`);

  // G0 -- February: in the row of Sun 2/28 two prep pills start on Mon 3/1. Only Prep 303's is its first day.
  await load('episodeprep', 'February 2027');
  const p303 = await prepPillOn('Prep 303', '2027-03-01'), p304c = await prepPillOn('Prep 304', '2027-03-01');
  const p304 = await prepPillOn('Prep 304', '2027-02-24');
  // Each pill is re-found (and scrolled to) right before resting on it, so its coordinates are current.
  const r303 = p303 && await prepPillOn('Prep 303', '2027-03-01');
  const g0a = r303 ? (await restOn(r303)).filter(h => h.ph === 'episodePrep') : [];
  const r304c = p304c && await prepPillOn('Prep 304', '2027-03-01');
  const g0b = r304c ? (await restOn(r304c)).filter(h => h.ph === 'episodePrep') : [];
  const r304 = p304 && await prepPillOn('Prep 304', '2027-02-24');
  const g0c = r304 ? (await restOn(r304)).filter(h => h.ph === 'episodePrep') : [];
  out.G0 = { p303: r303, p304c: r304c, p304: r304, on303: g0a, on304cont: g0b, on304first: g0c };
  const vis = hs => hs.filter(h => !h.hidden);
  const s303 = vis(g0a)[0], s304 = vis(g0c)[0];
  kase('G0', "Feb: Prep 303's pill from Mon 3/1 has a START grip (topmost, on <body>); Prep 304's from the same Monday has none; 304's first pill (2/24) has one; never an end grip",
       !!p303 && !!p304c && p303.row === 4 && p304c.row === 4
       && vis(g0a).length === 1 && s303.edge === 'start' && s303.topmost === true && s303.parentIsBody === true
       && Math.abs(s303.l - r303.l) < 1 && /Prep 303/.test(s303.title)
       && vis(g0b).length === 0
       && vis(g0c).length === 1 && s304.edge === 'start' && Math.abs(s304.l - r304.l) < 1 && /Prep 304/.test(s304.title)
       && [...g0a, ...g0b, ...g0c].every(h => h.hidden || h.edge === 'start'), out.G0);

  // G1 (+G9) -- Prep 303's start left one working day, Mon 3/1 -> Fri 2/26: its box 10 -> 11, its end still 3/12,
  // nothing else moved; ONE Ctrl+Z -> 10.
  await load('episodeprep', 'February 2027');
  const g1o = await others(), g1b0 = await prepBoxes(), g1p0 = await prepPills();
  const q1 = await prepPillOn('Prep 303', '2027-03-01');
  const h1 = q1 ? vis((await restOn(q1)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const mon1 = await cell(4, 1, 1), fri1 = await cell(3, 5, 26);
  if (h1 && mon1 && fri1) await dragPath(h1, [[h1.x + (fri1.x - mon1.x) * 0.5, h1.y], toward(h1, mon1, fri1)], 'prodPrep');
  const g1b = await prepBoxes(), g1p = await prepPills(), g1oa = await others();
  await gotoMonth('March 2027');
  const g1m = await prepPills();
  await ctrlZ();
  const g1u = await prepBoxes(), g1um = await prepPills();
  out.G1 = { before: g1b0, after: g1b, pillsBefore: g1p0, pillsAfter: g1p, march: g1m, undone: g1u, others: [g1o, g1oa] };
  // Dates only: a new pill can add a lane to a row, which moves the other pills' pixels but not their days.
  const others0 = ps => JSON.stringify(ps.filter(p => p.label !== 'Prep 303').map(p => p.label + '|' + p.from + '|' + p.to).sort());
  kase('G1', "Prep 303's start left a working day (Mon 3/1 -> Fri 2/26): box 10 -> 11 (edited), end still 3/12, no other prep, phase or the shoot moved; ONE Ctrl+Z -> 10",
       !!h1 && g1b0['Episode 303'].v === '10' && g1b['Episode 303'].v === '11' && g1b['Episode 303'].edited === true
       && (spanOf(g1p, 'Prep 303') || {}).from === '2027-02-26' && (spanOf(g1m, 'Prep 303') || {}).to === '2027-03-12'
       && others0(g1p) === others0(g1p0) && JSON.stringify(g1oa) === JSON.stringify(g1o)
       && Object.keys(g1b).every(k => k === 'Episode 303' || JSON.stringify(g1b[k]) === JSON.stringify(g1b0[k]))
       && g1u['Episode 303'].v === '10' && (spanOf(g1um, 'Prep 303') || {}).from === '2027-03-01', out.G1);

  // G2 -- Prep 302 (blank: the default 5) right onto Mon 2/15, Presidents' Day: lands Tue 2/16, box 4, end 2/19.
  await load('episodeprep', 'February 2027');
  const q2 = await prepPills('Prep 302', 'first');
  const h2 = q2 ? vis((await restOn(q2)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const fri2 = await cell(1, 5, 12), mon2 = await cell(2, 1, 15);
  const g2off0 = await undoOff();
  if (h2 && fri2 && mon2) await dragPath(h2, [[h2.x + 8, h2.y], toward(h2, fri2, mon2)], 'prodPrep');
  const g2b = await prepBoxes(), g2p = await prepPills(), g2off = await undoOff();
  out.G2 = { pill: q2, handle: h2, boxes: g2b, pills: g2p, undoOffBefore: g2off0, undoOffAfter: g2off };
  kase('G2', 'Prep 302 (blank, default 5) right onto Mon 2/15 (Presidents\' Day): lands Tue 2/16, box 4 (edited), end 2/19; Undo off before, on after',
       !!h2 && q2.from === '2027-02-12' && g2off0 === true && g2off === false && g2b['Episode 302'].v === '4' && g2b['Episode 302'].edited === true
       && JSON.stringify(spanOf(g2p, 'Prep 302')) === JSON.stringify({ from: '2027-02-16', to: '2027-02-19' }), out.G2);

  // G3 -- Prep 302 out a day and back in ONE gesture: the box is BLANK again, not "5", and nothing is banked.
  await load('episodeprep', 'February 2027');
  const q3 = await prepPills('Prep 302', 'first');
  const h3 = q3 ? vis((await restOn(q3)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const fri3 = await cell(1, 5, 12), thu3 = await cell(1, 4, 11);
  let g3mid = null;
  if (h3 && fri3 && thu3) {
    await mouse('mouseMoved', h3.x, h3.y, 0);
    await mouse('mousePressed', h3.x, h3.y, 1);
    await sleep(150);
    await mouse('mouseMoved', ...toward(h3, fri3, thu3), 1);
    await sleep(400);
    g3mid = await prepBoxes();
    await mouse('mouseMoved', h3.x, h3.y, 1);
    await sleep(400);
    await mouse('mouseReleased', h3.x, h3.y, 0);
    await sleep(700);
  }
  const g3b = await prepBoxes(), g3off = await undoOff();
  out.G3 = { mid: g3mid, after: g3b, undoOff: g3off };
  kase('G3', 'Prep 302 out to Thu 2/11 (6) and back in ONE gesture: the box BLANK again (not "5"), not edited; nothing banked (Undo still off)',
       !!h3 && !!g3mid && g3mid['Episode 302'].v === '6' && g3b['Episode 302'].v === '' && g3b['Episode 302'].edited === false
       && g3off === true, out.G3);

  // G4 -- right onto Sat 2/13 and Sun 2/14: no change (Fri is nearer; Sun ties with Tue 2/16, the smaller change
  // wins); then left onto Thu 2/11: 6.
  await load('episodeprep', 'February 2027');
  const q4 = await prepPills('Prep 302', 'first');
  const h4 = q4 ? vis((await restOn(q4)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const fri4 = await cell(1, 5, 12), sat4 = await cell(1, 6, 13), sun4 = await cell(2, 0, 14), thu4 = await cell(1, 4, 11);
  const mids4 = [];
  if (h4 && fri4 && sat4 && sun4 && thu4) {
    await mouse('mouseMoved', h4.x, h4.y, 0);
    await mouse('mousePressed', h4.x, h4.y, 1);
    await sleep(150);
    for (const to of [sat4, sun4, thu4]) { await mouse('mouseMoved', ...toward(h4, fri4, to), 1); await sleep(400); mids4.push((await prepBoxes())['Episode 302'].v); }
    await mouse('mouseReleased', ...toward(h4, fri4, thu4), 0);
    await sleep(700);
  }
  const g4p = await prepPills();
  out.G4 = { mids: mids4, pills: g4p };
  kase('G4', 'Prep 302 onto Sat 2/13 and Sun 2/14: no change (blank); onto Thu 2/11: 6, from 2/11',
       !!h4 && JSON.stringify(mids4) === '["","","6"]' && (spanOf(g4p, 'Prep 302') || {}).from === '2027-02-11', out.G4);

  // G5 -- the floor (Q2(a)): Prep 302's start dragged past its end, onto Mon 2/22: ONE working day, Fri 2/19.
  await load('episodeprep', 'February 2027');
  const q5 = await prepPills('Prep 302', 'first');
  const h5 = q5 ? vis((await restOn(q5)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const fri5 = await cell(1, 5, 12), mon5 = await cell(3, 1, 22);
  if (h5 && fri5 && mon5) await dragPath(h5, [[h5.x + 8, h5.y], toward(h5, fri5, mon5)], 'prodPrep');
  const g5b = await prepBoxes(), g5p = await prepPills();
  out.G5 = { boxes: g5b, pills: g5p };
  kase('G5', 'floor: Prep 302 dragged past its end (onto Mon 2/22): 1 working day, Fri 2/19, box 1',
       !!h5 && g5b['Episode 302'].v === '1' && JSON.stringify(spanOf(g5p, 'Prep 302')) === JSON.stringify({ from: '2027-02-19', to: '2027-02-19' }), out.G5);

  // G6 -- Escape mid-drag: put back (blank), the shield gone, nothing banked.
  await load('episodeprep', 'February 2027');
  const q6 = await prepPills('Prep 302', 'first');
  const h6 = q6 ? vis((await restOn(q6)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const fri6 = await cell(1, 5, 12), thu6 = await cell(1, 4, 11);
  let g6mid = null, g6shield = null;
  if (h6 && fri6 && thu6) {
    await mouse('mouseMoved', h6.x, h6.y, 0);
    await mouse('mousePressed', h6.x, h6.y, 1);
    await sleep(150);
    await mouse('mouseMoved', ...toward(h6, fri6, thu6), 1);
    await sleep(400);
    g6mid = await prepBoxes();
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(400);
    g6shield = await ev(`!!document.querySelector('.phase-edge-shield')`);
    await mouse('mouseReleased', ...toward(h6, fri6, thu6), 0);
    await sleep(500);
  }
  const g6b = await prepBoxes(), g6off = await undoOff();
  out.G6 = { mid: g6mid, shield: g6shield, after: g6b, undoOff: g6off };
  kase('G6', 'Escape mid-drag (Prep 302 at 6): back to blank, the shield gone; nothing banked (Undo still off)',
       !!h6 && !!g6mid && g6mid['Episode 302'].v === '6' && g6shield === false && g6b['Episode 302'].v === '' && g6off === true, out.G6);

  // G7 -- Blocks (episodeprep-blocks): Prep Block 3 (its own 12, from Thu 3/4) left a working day: Block 3's box 13,
  // from Wed 3/3. March 2027's page starts Sun 2/28, so row 0 is 2/28-3/6.
  await load('episodeprep-blocks', 'March 2027');
  const q7 = await prepPills('Prep Block 3', 'first');
  const h7 = q7 ? vis((await restOn(q7)).filter(h => h.ph === 'episodePrep'))[0] : null;
  const thu7 = await cell(0, 4, 4), wed7 = await cell(0, 3, 3);
  const g7b0 = await prepBoxes();
  if (h7 && thu7 && wed7) await dragPath(h7, [[h7.x + (wed7.x - thu7.x) * 0.5, h7.y], toward(h7, thu7, wed7)], 'prodPrep');
  const g7b = await prepBoxes(), g7p = await prepPills();
  out.G7 = { pill: q7, handle: h7, before: g7b0, after: g7b, pills: g7p };
  kase('G7', 'Blocks: Prep Block 3 (own 12, from Thu 3/4) left a working day: Block 3\'s box 13 (edited), from Wed 3/3; the other blocks\' boxes unchanged',
       !!h7 && q7.from === '2027-03-04' && g7b0['Block 3'].v === '12' && g7b['Block 3'].v === '13' && g7b['Block 3'].edited === true
       && (spanOf(g7p, 'Prep Block 3') || {}).from === '2027-03-03'
       && Object.keys(g7b).every(k => k === 'Block 3' || JSON.stringify(g7b[k]) === JSON.stringify(g7b0[k])), out.G7);

  // G8 -- print: the prep grip is display:none under body.printing-calendar in print media, and never in the grid.
  await load('episodeprep', 'February 2027');
  const q8 = await prepPills('Prep 302', 'first');
  const h8 = q8 ? vis((await restOn(q8)).filter(h => h.ph === 'episodePrep')) : [];
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  const e8 = await ev(`(() => { document.body.classList.add('printing-calendar');
    const h = document.querySelector('.phase-edge-handle[data-ph="episodePrep"]:not([hidden])');
    const r = { shown: !!h, display: h ? getComputedStyle(h).display : null,
      inPrintRoot: document.querySelectorAll('#print-root .phase-edge-handle, #print-root .phase-edge-shield').length,
      inTableWrap: document.querySelectorAll('#table-wrap .phase-edge-handle, #table-wrap .phase-edge-shield').length };
    document.body.classList.remove('printing-calendar'); return r; })()`);
  await send('Emulation.setEmulatedMedia', { media: '' });
  out.G8 = { handles: h8, print: e8 };
  kase('G8', 'print media + body.printing-calendar: the prep grip is display:none; none in #print-root or #table-wrap',
       h8.length === 1 && e8.shown === true && e8.display === 'none' && e8.inPrintRoot === 0 && e8.inTableWrap === 0, out.G8);
  }
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
