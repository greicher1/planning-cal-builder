// pilldrag.mjs -- batch 5 (FIX-PLAN §7, MONTH-9): a month-view pill dragged OUT and BACK in one
// gesture leaves its phase exactly as it was, Snap to Mon included.
//
//   node pilldrag.mjs [--page /dist/index.html] [--state v1.4.0-saved]
//
// Writes pilldrag.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges
// like printpaper.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG. The suspect needs ONE gesture that goes out and comes back:
// press on the pill, move a day, move back, release. The pane's drag tool goes point to point, and a
// dispatchEvent() drag skips hit-testing (HANDOFF's elementsFromPoint trap). CDP's
// Input.dispatchMouseEvent is TRUSTED input: real hit-testing, real mousedown/mousemove/mouseup.
//
// The suspect, read from installMonthPillDrag: crossing a non-Monday clears snap-<key>, and nothing
// put it back when the pill came home. And since the gesture ends where it began, drag.applied is 0,
// so endDrag() banks NO undo step -- the snap change could not even be undone.
//   D0  setup: the month view shows Writer's Rm's first pill, on Mon 1/5/26, Snap to Mon on
//   D1  ⭐ out one day and back, ONE gesture: the start is 1/5/26 again AND Snap to Mon is still on
//   D2  ...and nothing else moved: the pill is back where it was
//   D3  guard (owner ruling, 18 Sep 2026): dropped on the Tuesday, the phase starts on the Tuesday
//       and Snap to Mon comes off -- and ONE Cmd+Z puts both back
//   D4  ⭐ the patch's other branch: a snapped phase dragged THROUGH a Tuesday onto the NEXT Monday
//       (right a day, down a week, back left a day) starts on 1/12/26 and stays snapped
//
// ⭐ PRODUCTION'S HANDLES (MONTH-VIEW-PLAN.md §6.7, rulings 3a and 9a-9c, 15 Oct 2026). Body-level handles
// over the first shoot day, the wrap, every episode's (block's) end and every week pill's own edges. A
// row handle changes that episode's day count; a week edge writes day marks. ⛔ Since 19 Oct 2026 an
// episode's END REMOVES DAYS and never pushes (owner: "Removing days one by one is how it should work in
// all cases"): dragged earlier, the days it leaves are marked off; dragged later, it takes back those days,
// then the next episode's first days. Nothing else moves, so the wrap holds. E9, E10, E13 and E14 were
// the push's cases and are rewritten to that; E15 is new. The same day the owner asked for a grip on each
// episode's START where another ends right before it (`head`, the mirror): E8 and E14 now count it, and
// E16-E18 drive it.
// Same trusted input, same reason: §8 step 5's rule is that only hit-testing proves a user can reach
// an affordance, so every E case presses where elementsFromPoint says the handle is TOPMOST.
//   E0  June 2026: Production's first pill (Mon-Thu, the 7/3 holiday after it) carries the START handle
//       on its left edge and its week's right edge, both children of <body>, both topmost
//   E1  start handle right one day: starts Tue 6/30, Snap to Mon off, Episode 201 7 days, total 79,
//       the wrap still 10/20/26 -- and ONE Ctrl+Z puts all of it back, "Manually changed" included
//   E2  ...through the 7/3 holiday: the start steps over it (Fri -> Thu 7/2, Sat -> Thu 7/2), never onto it
//   E3  out and back in one gesture: exactly as it was, Snap to Mon and the episode's flag included
//   E4  October: the END handle, across a weekend in ONE gesture: Sat -> Fri 10/23, Sun -> Mon 10/26
//       (Episode 210 to 11, then 12), the start held -- and ONE Ctrl+Z restores 8 days and 10/20
//   E5  Blocks mode (blocks.sptcal): the end handle changes the LAST BLOCK (18 -> 17), and marks it edited
//   E6  a middle pill with no episode end in it (July week 3, Episode 202's) carries its two week edges and nothing else
//       ⚠️ Since 15 Oct 2026 ("Stacked bars, always", half days) Production is ONE BAR PER EPISODE, so July week 2
//       is two bars -- 201 Mon-Thu, 202 Fri -- and week 3's bar is the fourth Production bar on the page.
//   E7  print: the handle is display:none under body.printing-calendar in print media, and never in
//       #print-root or #table-wrap
//   E8  July week 2: Episode 201's bar (Mon-Thu) has week-left and its end on its right edge, the Thu|Fri line;
//       Episode 202's one-day Friday bar has its START on its left edge (since 19 Oct 2026) and the week-right edge
//   E9  that boundary right a day, onto 202's Friday: Episode 201 9 days, 202 7 (it gives up Fri 7/10 and
//       keeps its end), total 80 and wrap 10/20 held, week 3 untouched; ONE Ctrl+Z back
//   E10 ...left two days in one gesture: Episode 201 6 days (ends Tue 7/7), Wed 7/8 and Thu 7/9 marked off,
//       202 still 8 and still on Fri 7/10, total 78, wrap 10/20 held
//   E11 week 2's LEFT edge right a day: Mon 7/6 marked off, every episode still 8, wrap 10/21; ONE Ctrl+Z
//   E12 week 2's RIGHT edge onto Sat 7/11 and back, one gesture: Sat worked and wrap 10/19 mid-gesture,
//       then nothing marked and 10/20
//   E13 Blocks mode: Block 1's end (Thu 7/23) right a day: Block 1 19, Block 2 17, total and wrap held
//   E14 ⭐ half days (halfdays.sptcal: 4.5-day episodes, 201 at 5): Mon 7/13 is a switch day with TWO bars,
//       which since 16 Oct 2026 (HALF-SQUARE-BARS-PLAN.md) share ONE lane and meet half way through the square.
//       202's one-day half bar (left) has week-left and 202's end, on its own right edge in the MIDDLE of the
//       day; 203's bar (right) has 203's start and 203's end. 202's end right a day: 202 5.5, 203
//       3.5 (a half switch day cannot leave a day off, so the two trade), the switch moves to Tue 7/14 (202 |
//       203 there, one lane), total 45.5 and wrap 9/1 held; ONE Ctrl+Z puts back 4.5, 4.5
//   E15 ⭐ taking days back: 201's end left two days (Wed 7/8, Thu 7/9 off), released; then from Tue right three
//       days in ONE gesture: Wed back (7), Thu back (8), Fri taken from 202 (9, 202 7). No day marked, total
//       80, wrap 10/20; ONE Ctrl+Z returns to 6 with Wed and Thu off
//   E16 ⭐ 202's START (Fri 7/10) dragged later onto Mon 7/13: Fri marked off, 202 7, 201 still 8 ending Thu,
//       week 3 untouched, total 79, wrap 10/20 held; ONE Ctrl+Z back
//   E17 202's start dragged earlier a day, onto 201's Thu 7/9: 201 7 (ends Wed), 202 9 (starts Thu), nothing
//       marked, total 80, wrap 10/20
//   E18 labelled by Week (one bar per week): the Thu|Fri line inside week 2's bar carries 201's end just left
//       of it and 202's start just right of it, both topmost; 202's start left a day -> 201 7, 202 9, wrap held
//
// ⭐ R5 FOR THE MONTH DRAGS (owner, 19 Oct 2026: "when i use the grab handle to change the start of the very
// first day of production, it doesnt move the comment with it"). An EDITED auto-note is stored as literal
// text, so the drags left "Start Principal Photography 6/29/26" on 6/29 once the shoot started 6/30.
// autoNoteBaseline() / reapplyAutoNoteBaseline() rewrite it, as the shift tools' rewriteMovedAutoNotes does.
// On autonote-grips.sptcal; E19-E21 and D5 were red on the build before the fix.
//   E19 the start grip right a day: "Start Principal Photography 6/30/26" on 6/30, the user's "Table Read"
//       still on 6/29, no 6/29/26 anywhere; ONE Ctrl+Z restores the note and the date
//   E20 out a day and back in ONE gesture: 6/30/26 mid-gesture, then the notes exactly as they were
//   E21 the wrap grip right a day: a note that IS the auto text ("Principal Photography Wraps 10/20/26", the
//       owner's own file's shape) reads 10/21/26 on 10/21; ONE Ctrl+Z restores it
//   D5  body-drag Production down a week (6/29 -> 7/6): "Start Principal Photography 7/6/26" on 7/6, the
//       user's "Table Read" stays on 6/29 (a body-drag moves no note between weeks), and the wrap note
//       moves with the wrap
//   E22 the start grip onto Wed 7/1: the rewritten "Start Principal Photography 7/1/26" sits ON 7/1, not on Monday
//       6/29 (notesForWaterfallDate's trailing-date pattern takes a one-digit day: frozen edit, owner-approved)
//   E23 no drag: in the 8/3 week's edited note, "Cast read 8/4/26" is drawn on 8/4, and "Delivery 8/12/26" (dated
//       in another week) on Monday 8/3 instead of on no day at all (the second owner-approved frozen line)
// Same plumbing as rtleg.mjs / printpaper.mjs: Node 24's built-in WebSocket, no dependencies, and a
// non-default HARNESS_PORT namespaces the Chrome profile.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const STATE = arg('state', 'v1.4.0-saved');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-pilldrag`;
const OUT = path.join(HERE, 'pilldrag.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'pilldrag', cases: [] };
// A hang must REPORT, not block a gate run: after 480 s the script writes what it has and exits.
// (150 s until the E cases, 15 Oct 2026, which roughly quadruple the page loads.)
setTimeout(() => {
  out.EX = 'pilldrag: hit its 480 s deadline';
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
    // ⚠️ The app guards unsaved work with beforeunload, and a drag leaves the calendar dirty, so the
    // re-navigation before D3 raises a "Leave site?" dialog -- and Page.navigate waits on it forever.
    // Accept it: the next case wants a fresh page.
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
  const state = () => ev(`({ start: document.getElementById('start-writersRoom').value,
    snap: document.getElementById('snap-writersRoom').checked,
    pill: (() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
                   if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) }; })() })`);

  await send('Page.enable');
  // A fresh page each time, so no case inherits another's leftovers (D1's bug would otherwise make
  // the D3 guard fail for the wrong reason on the unfixed build).
  const load = async (stateName = STATE) => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${stateName}` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`, 'the engine');
    await sleep(800);
    // The previous case's drag left a crash backup in this profile, so a fresh page offers "Recover
    // unsaved work" -- a modal that would swallow the next drag. Declining is setup, not the test.
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(400);
    await ev(`document.getElementById('view-month-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]')`, "Writer's Rm's pill");
    await sleep(500);
  };
  await load();
  // Where to press: the middle of the pill; a day column's width is the step.
  const geo = await ev(`(() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
    const r = p.getBoundingClientRect(); const c = document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2, dayW: c.width,
             hit: (() => { const e = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
                           return e && e.closest && e.closest('.mv-pill[data-ph]') ? 'mv-pill' : String(e ? e.className : ''); })() }; })()`);
  out.geo = geo;
  const s0 = await state();
  out.s0 = s0;
  kase('D0', "setup: Writer's Rm's pill on Mon 1/5/26, Snap to Mon on, and the press point hits the pill",
       s0.start === '2026-01-05' && s0.snap === true && !!s0.pill && String(geo.hit).indexOf('mv-pill') >= 0, { s0, hit: geo.hit });

  // D1/D2 -- out one day and back, ONE gesture.
  await mouse('mouseMoved', geo.x, geo.y, 0);
  await mouse('mousePressed', geo.x, geo.y, 1);
  await sleep(150);
  await mouse('mouseMoved', geo.x + geo.dayW * 0.55, geo.y, 1);
  await sleep(150);
  await mouse('mouseMoved', geo.x + geo.dayW, geo.y, 1);
  await sleep(400);
  const mid = await state();
  await mouse('mouseMoved', geo.x + geo.dayW * 0.45, geo.y, 1);
  await sleep(150);
  await mouse('mouseMoved', geo.x, geo.y, 1);
  await sleep(400);
  await mouse('mouseReleased', geo.x, geo.y, 0);
  await sleep(700);
  const s1 = await state();
  out.mid = mid; out.s1 = s1;
  kase('D1', 'out one day and back in ONE gesture: the start is 1/5/26 again AND Snap to Mon is still on',
       mid.start === '2026-01-06' && s1.start === '2026-01-05' && s1.snap === true, { mid, s1 });
  kase('D2', '...and the pill is back exactly where it was', !!s1.pill && JSON.stringify(s1.pill) === JSON.stringify(s0.pill), { before: s0.pill, after: s1.pill });

  // D3 -- the owner's ruling still holds: dropped on the Tuesday, snap comes off; one Cmd+Z restores.
  await load();
  const g2 = await ev(`(() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
    const r = p.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }; })()`);
  await mouse('mouseMoved', g2.x, g2.y, 0);
  await mouse('mousePressed', g2.x, g2.y, 1);
  await sleep(150);
  await mouse('mouseMoved', g2.x + geo.dayW * 0.55, g2.y, 1);
  await sleep(150);
  await mouse('mouseMoved', g2.x + geo.dayW, g2.y, 1);
  await sleep(400);
  await mouse('mouseReleased', g2.x + geo.dayW, g2.y, 0);
  await sleep(700);
  const s3 = await state();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
  await sleep(900);
  const s4 = await state();
  out.s3 = s3; out.s4 = s4;
  kase('D3', 'guard (owner ruling 18 Sep): dropped on the Tuesday it starts on 1/6/26 with Snap off, and ONE Ctrl+Z restores 1/5/26 with Snap on',
       s3.start === '2026-01-06' && s3.snap === false && s4.start === '2026-01-05' && s4.snap === true, { dropped: s3, undone: s4 });
  // D4 -- through a Tuesday onto the next Monday, one gesture.
  await load();
  const g4 = await ev(`(() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
    const r = p.getBoundingClientRect(); const w = p.closest('.mv-week').getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2, weekH: w.height }; })()`);
  await mouse('mouseMoved', g4.x, g4.y, 0);
  await mouse('mousePressed', g4.x, g4.y, 1);
  await sleep(150);
  await mouse('mouseMoved', g4.x + geo.dayW, g4.y, 1);                 // Tue 1/6
  await sleep(300);
  await mouse('mouseMoved', g4.x + geo.dayW, g4.y + g4.weekH, 1);      // Tue 1/13
  await sleep(300);
  await mouse('mouseMoved', g4.x, g4.y + g4.weekH, 1);                 // Mon 1/12
  await sleep(400);
  await mouse('mouseReleased', g4.x, g4.y + g4.weekH, 0);
  await sleep(700);
  const s5 = await state();
  out.s5 = s5;
  kase('D4', 'through a Tuesday onto the NEXT Monday in one gesture: starts on 1/12/26 and stays snapped',
       s5.start === '2026-01-12' && s5.snap === true, { landed: s5 });

  // ---- E: Production's edge handles -------------------------------------------------------------
  const ctrlZ = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
    await sleep(900);
  };
  // Production as the sidebar shows it. from/wrap come off the frozen meta line, which render() writes.
  const prod = () => ev(`(() => {
    const eps = Array.from(document.querySelectorAll('#episode-rows .episode-row .ep-days')).map(i => i.value);
    const blks = Array.from(document.querySelectorAll('.block-row .blk-days'));
    const meta = (document.getElementById('meta-production') || {}).innerText || '';
    const m = /(\\d+\\/\\d+\\/\\d+) \\u2192 (\\d+\\/\\d+\\/\\d+)/.exec(meta);
    return { start: document.getElementById('start-production').value, snap: document.getElementById('snap-production').checked,
      total: document.getElementById('weeks-production').value, from: m && m[1], wrap: m && m[2],
      ep1: eps[0], epN: eps[eps.length - 1],
      blkN: blks.length ? blks[blks.length - 1].value : null,
      blkNEdited: blks.length ? blks[blks.length - 1].classList.contains('is-edited') : null,
      edited: /Manually changed/.test((document.getElementById('show-info-note') || {}).innerText || ''),
      shield: !!document.querySelector('.phase-edge-shield') }; })()`);
  // Page the month view to e.g. 'June 2026' with its own arrows.
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
  // The Nth Production pill on the page (negative counts from the end), scrolled into view.
  const prodPill = async n => ev(`(async () => {
    const ps = Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="production"]'));
    const p = ps[${n} < 0 ? ps.length + ${n} : ${n}]; if (!p) return null;
    p.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300));
    const r = p.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom,
             gc: p.style.gridColumnStart + '/' + p.style.gridColumnEnd }; })()`);
  // Every handle as hit-testing sees it.
  const handles = () => ev(`Array.from(document.querySelectorAll('.phase-edge-handle')).map(h => {
    const r = h.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const stack = h.hidden ? [] : document.elementsFromPoint(x, y);
    return { edge: h.dataset.edge, hidden: h.hidden, x, y, l: r.left, r: r.right, t: r.top, b: r.bottom,
             topmost: stack[0] === h, parentIsBody: h.parentElement === document.body }; })`);
  const visible = hs => hs.filter(h => !h.hidden);
  // A day cell's centre, checked against its rendered day number.
  const cell = (row, col, num) => ev(`(() => {
    const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    const c = w && w.querySelectorAll(':scope > .mv-daygrid > .mv-daycell')[${col}]; if (!c) return null;
    const r = c.getBoundingClientRect(), n = parseInt(c.querySelector('.mv-daynum').textContent, 10);
    return n === ${num} ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  // Rest on a pill, then read the handles.
  const restOn = async pill => { await mouse('mouseMoved', pill.x, pill.y, 0); await sleep(250); return handles(); };
  // One press on a handle, a path of [x, y] points, and (unless keepDown) a release at the last one.
  const dragPath = async (h, pts, mids) => {
    await mouse('mouseMoved', h.x, h.y, 0);
    await mouse('mousePressed', h.x, h.y, 1);
    await sleep(150);
    for (const [x, y, readMid] of pts) {
      await mouse('mouseMoved', x, y, 1);
      await sleep(350);
      if (readMid && mids) mids.push(await prod());
    }
    const [lx, ly] = pts[pts.length - 1];
    await mouse('mouseReleased', lx, ly, 0);
    await sleep(700);
  };

  // E0 -- June 2026: the start handle, and only it, where a user can reach it.
  await load();
  await gotoMonth('June 2026');
  const jp = await prodPill(0);
  const h0 = await restOn(jp);
  const e0s = visible(h0);
  const sh = e0s.find(h => h.edge === 'start');
  const p0 = await prod();
  out.E0 = { pill: jp, handles: h0, prod: p0 };
  const kinds = hs => visible(hs).map(h => h.edge).sort().join(',');
  kase('E0', "June: Production's first pill carries the start handle on its left edge and its week's right edge, children of <body>, topmost",
       !!jp && jp.gc === '2/6' && kinds(h0) === 'start,wkR' && e0s.every(h => h.topmost === true && h.parentIsBody === true)
       && !!sh && Math.abs(e0s.find(h => h.edge === 'wkR').r - jp.r) < 1
       && Math.abs(sh.l - jp.l) < 1 && sh.t >= jp.t - 1 && sh.b <= jp.b + 1
       && p0.start === '2026-06-29' && p0.snap === true && p0.ep1 === '8' && p0.wrap === '10/20/26', out.E0);

  // E1 -- one day right, then ONE Ctrl+Z.
  const mon = await cell(4, 1, 29), tue = await cell(4, 2, 30);
  await dragPath(sh, [[sh.x + (tue.x - mon.x) * 0.55, sh.y], [sh.x + (tue.x - mon.x), sh.y]]);
  const e1 = await prod();
  await ctrlZ();
  const e1u = await prod();
  out.E1 = { dragged: e1, undone: e1u };
  kase('E1', 'start handle right a day: Tue 6/30, Snap off, Ep 201 7 days, total 79, wrap still 10/20/26; ONE Ctrl+Z restores all of it',
       e1.start === '2026-06-30' && e1.snap === false && e1.ep1 === '7' && e1.total === '79' && e1.wrap === '10/20/26'
       && e1.edited === true && e1.shield === false
       && e1u.start === '2026-06-29' && e1u.snap === true && e1u.ep1 === '8' && e1u.total === '80' && e1u.wrap === '10/20/26'
       && e1u.edited === false, out.E1);

  // E2 -- across the 7/3 holiday (Independence Day observed): Fri and Sat both land on Thu 7/2.
  await load();
  await gotoMonth('June 2026');
  const h2 = visible(await restOn(await prodPill(0))).find(h => h.edge === 'start');
  const mon2 = await cell(4, 1, 29), fri = await cell(4, 5, 3), sat = await cell(4, 6, 4);
  const mids2 = [];
  await dragPath(h2, [[h2.x + (fri.x - mon2.x), h2.y, true], [h2.x + (sat.x - mon2.x), h2.y, true]], mids2);
  const e2 = await prod();
  out.E2 = { mids: mids2, landed: e2 };
  kase('E2', 'start handle across the 7/3 holiday: Fri and Sat both land on Thu 7/2 (Ep 201 5 days), never on 7/3, wrap held',
       mids2.length === 2 && mids2.every(m => m.start === '2026-07-02' && m.ep1 === '5' && m.wrap === '10/20/26')
       && e2.start === '2026-07-02' && e2.ep1 === '5' && e2.wrap === '10/20/26', out.E2);

  // E3 -- out and back in one gesture.
  await load();
  await gotoMonth('June 2026');
  const h3 = visible(await restOn(await prodPill(0))).find(h => h.edge === 'start');
  const mon3 = await cell(4, 1, 29), tue3 = await cell(4, 2, 30);
  const mids3 = [];
  await dragPath(h3, [[h3.x + (tue3.x - mon3.x), h3.y, true], [h3.x, h3.y]], mids3);
  const e3 = await prod();
  out.E3 = { mid: mids3[0], back: e3 };
  kase('E3', 'out a day and back in ONE gesture: 6/29, Snap on, Ep 201 8 days, nothing marked edited',
       !!mids3[0] && mids3[0].start === '2026-06-30'
       && e3.start === '2026-06-29' && e3.snap === true && e3.ep1 === '8' && e3.total === '80' && e3.edited === false, out.E3);

  // E4 -- October: the end handle across a weekend, ONE gesture, then ONE Ctrl+Z.
  await load();
  await gotoMonth('October 2026');
  const op = await prodPill(-1);
  const h4all = await restOn(op);
  const h4 = visible(h4all).find(h => h.edge === 'end');
  const tue4 = await cell(3, 2, 20), sat4 = await cell(3, 6, 24), sun4 = await cell(4, 0, 25);
  const mids4 = [];
  if (h4 && tue4 && sat4 && sun4) {
    await dragPath(h4, [[h4.x + (sat4.x - tue4.x), h4.y, true], [h4.x + (sun4.x - tue4.x), sun4.y, true]], mids4);
  }
  const e4 = await prod();
  await ctrlZ();
  const e4u = await prod();
  out.E4 = { pill: op, handles: h4all, mids: mids4, landed: e4, undone: e4u };
  kase('E4', 'Oct: the END handle, topmost; Sat -> Fri 10/23 (Ep 210 11), Sun -> Mon 10/26 (12), start held; ONE Ctrl+Z -> 8 days, 10/20',
       !!h4 && h4.topmost === true && kinds(h4all) === 'end,wkL' && Math.abs(h4.r - op.r) < 1
       && mids4.length === 2 && mids4[0].wrap === '10/23/26' && mids4[0].epN === '11' && mids4[1].wrap === '10/26/26' && mids4[1].epN === '12'
       && e4.wrap === '10/26/26' && e4.epN === '12' && e4.start === '2026-06-29' && e4.snap === true
       && e4u.wrap === '10/20/26' && e4u.epN === '8' && e4u.edited === false, out.E4);

  // E5 -- Blocks mode: the last BLOCK takes the change.
  await load('blocks');
  const b0 = await prod();
  const wrapDate = b0.wrap ? new Date(Date.UTC(2000 + +b0.wrap.split('/')[2], +b0.wrap.split('/')[0] - 1, +b0.wrap.split('/')[1])) : null;
  const wrapLabel = wrapDate ? wrapDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  await gotoMonth(wrapLabel);
  const bp = await prodPill(-1);
  const h5 = bp && visible(await restOn(bp)).find(h => h.edge === 'end');
  // One day LEFT: the wrap pill is several days long, so the day before the wrap is a shoot day.
  const dayW = await ev(`document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect().width`);
  if (h5) await dragPath(h5, [[h5.x - dayW * 0.55, h5.y], [h5.x - dayW, h5.y]]);
  const b1 = await prod();
  out.E5 = { before: b0, wrapLabel, handle: h5, after: b1 };
  kase('E5', 'Blocks mode: the end handle changes the LAST BLOCK (18 -> 17 days, marked edited), total 85 -> 84, start held',
       !!h5 && h5.topmost === true && b0.blkN === '18' && b0.total === '85'
       && b1.blkN === '17' && b1.blkNEdited === true && b1.total === '84' && b1.start === b0.start && b1.wrap !== b0.wrap, out.E5);

  // E6 -- a middle pill with no episode end inside it: its week's two edges, nothing else.
  await load();
  await gotoMonth('July 2026');
  const mp = await prodPill(3);                 // 201 wk1, 201 wk2, 202 Fri, then 202's week-3 bar
  const h6 = await restOn(mp);
  out.E6 = { pill: mp, handles: h6 };
  kase('E6', 'July week 3 (no episode ends in it): its two week edges and nothing else, both topmost',
       !!mp && kinds(h6) === 'wkL,wkR' && visible(h6).every(h => h.topmost), out.E6);

  // E7 -- print: hidden by the print path's own rule, and never inside the frozen surface.
  await gotoMonth('June 2026');
  const h7 = visible(await restOn(await prodPill(0)));
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  const e7 = await ev(`(() => { document.body.classList.add('printing-calendar');
    // :not([hidden]) since 16 Oct 2026: the phase handles (installPhaseEdgeHandles) share the class and
    // the data-edge values, so a hidden one earlier in <body> could otherwise be the one read here.
    const h = document.querySelector('.phase-edge-handle[data-edge="start"]:not([hidden])');
    const r = { shown: !!h && !h.hidden, display: h ? getComputedStyle(h).display : null,
      inPrintRoot: document.querySelectorAll('#print-root .phase-edge-handle, #print-root .phase-edge-shield').length,
      inTableWrap: document.querySelectorAll('#table-wrap .phase-edge-handle, #table-wrap .phase-edge-shield').length };
    document.body.classList.remove('printing-calendar'); return r; })()`);
  await send('Emulation.setEmulatedMedia', { media: '' });
  out.E7 = { handles: h7, print: e7 };
  kase('E7', 'print media + body.printing-calendar: the shown handle is display:none; none in #print-root or #table-wrap',
       h7.length === 2 && e7.shown === true && e7.display === 'none' && e7.inPrintRoot === 0 && e7.inTableWrap === 0, out.E7);

  // ---- Ruling 9: episode boundaries and week edges ----------------------------------------------
  const cellCls = (row, col) => ev(`(() => { const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    const c = w && w.querySelectorAll(':scope > .mv-daygrid > .mv-daycell')[${col}]; return c ? c.className : null; })()`);
  const epDays = () => ev(`Array.from(document.querySelectorAll('#episode-rows .episode-row .ep-days')).map(i => i.value)`);
  const blkDays = () => ev(`Array.from(document.querySelectorAll('.block-row .blk-days')).map(i => i.value)`);
  // A week row's Production bars, left to right, as "label start/end" (the label is the bar's own text).
  const barsOf = row => ev(`(() => { const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    return Array.from(w ? w.querySelectorAll('.mv-pill[data-ph="production"]') : [])
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .map(p => ((p.firstChild && p.firstChild.nodeType === 3 ? p.firstChild.textContent : p.textContent).trim())
                + ' ' + p.style.gridColumnStart + '/' + p.style.gridColumnEnd); })()`);
  // Which of a week row's seven days carry the 'off' mark, as a string of 0/1 (Sun first).
  const offsOf = row => ev(`(() => { const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    return Array.from(w ? w.querySelectorAll(':scope > .mv-daygrid > .mv-daycell') : [])
      .map(c => c.classList.contains('mv-day-off') ? '1' : '0').join(''); })()`);
  const wk2 = async () => { await load(); await gotoMonth('July 2026'); const p = await prodPill(1); return { p, hs: await restOn(p) }; };
  // Week 2's RIGHT edge is on Episode 202's one-day Friday bar since bars split per episode (15 Oct 2026).
  const wk2fri = async () => { await load(); await gotoMonth('July 2026'); const p = await prodPill(2); return { p, hs: await restOn(p) }; };
  const by = (hs, k) => visible(hs).find(h => h.edge === k);

  // E8 -- July week 2: two bars. 201's carries week-left and its end on its own right edge (the Thu|Fri
  // line); 202's one-day Friday bar carries the week's right edge and nothing on its left (201's end).
  const w8 = await wk2();
  const b8 = by(w8.hs, 'bound');
  const w8f = await wk2fri();
  out.E8 = { pill: w8.p, handles: w8.hs, friPill: w8f.p, friHandles: w8f.hs };
  kase('E8', "July week 2: 201's bar has week-left and its end on its right edge (Thu|Fri); 202's Friday bar has week-right; all topmost",
       !!w8.p && w8.p.gc === '2/6' && kinds(w8.hs) === 'bound,wkL' && visible(w8.hs).every(h => h.topmost)
       && !!b8 && Math.abs(b8.r - w8.p.r) < 1
       && !!w8f.p && w8f.p.gc === '6/7' && kinds(w8f.hs) === 'head,wkR' && visible(w8f.hs).every(h => h.topmost)
       && !!by(w8f.hs, 'head') && Math.abs(by(w8f.hs, 'head').l - w8f.p.l) < 1, out.E8);

  // E9 -- that boundary right a day, onto 202's Friday: 201 takes it from 202 (owner, 19 Oct 2026: removing
  // days, never pushing), then ONE Ctrl+Z. Week 3 (row 2) must not change at all.
  const dW = await ev(`document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect().width`);
  const w3before = await barsOf(2);
  if (b8) await dragPath(b8, [[b8.x + dW * 0.55, b8.y], [b8.x + dW, b8.y]]);
  const e9 = await prod(), e9eps = await epDays(), e9w2 = await barsOf(1), e9w3 = await barsOf(2), e9off = await offsOf(1);
  await ctrlZ();
  const e9u = await prod(), e9ueps = await epDays(), e9uw2 = await barsOf(1);
  out.E9 = { dragged: e9, eps: e9eps, week2: e9w2, week3: e9w3, week3before: w3before, offs: e9off,
             undone: e9u, undoneEps: e9ueps, undoneWeek2: e9uw2 };
  kase('E9', "boundary right a day onto 202's Friday: Ep 201 9, Ep 202 7, total 80 and wrap 10/20 held, week 3 untouched; ONE Ctrl+Z -> 8, 8",
       e9eps[0] === '9' && e9eps[1] === '7' && e9eps[2] === '8' && e9.wrap === '10/20/26' && e9.start === '2026-06-29' && e9.total === '80'
       && JSON.stringify(e9w2) === '["Ep. 201 2/7"]' && JSON.stringify(e9w3) === JSON.stringify(w3before) && e9off === '0000000'
       && e9ueps[0] === '8' && e9ueps[1] === '8' && e9u.wrap === '10/20/26' && e9u.edited === false
       && JSON.stringify(e9uw2) === '["Ep. 201 2/6","Ep. 202 6/7"]', out.E9);

  // E10 -- left two days in one gesture: the two days are REMOVED (marked off), and 202 stays on Friday.
  const w10 = await wk2();
  const b10 = by(w10.hs, 'bound');
  if (b10) await dragPath(b10, [[b10.x - dW, b10.y], [b10.x - dW * 2, b10.y]]);
  const e10 = await prod(), e10eps = await epDays(), e10w2 = await barsOf(1), e10off = await offsOf(1);
  out.E10 = { handle: b10, landed: e10, eps: e10eps, week2: e10w2, offs: e10off };
  kase('E10', 'boundary left two days: Ep 201 6 (ends Tue 7/7), Wed 7/8 + Thu 7/9 off, Ep 202 still 8 on Fri 7/10, total 78, wrap 10/20',
       !!b10 && e10eps[0] === '6' && e10eps[1] === '8' && e10.wrap === '10/20/26' && e10.start === '2026-06-29' && e10.total === '78'
       && JSON.stringify(e10w2) === '["Ep. 201 2/4","Ep. 202 6/7"]' && e10off === '0001100', out.E10);

  // E11 -- the week's LEFT edge right a day: Monday marked off; then ONE Ctrl+Z.
  const w11 = await wk2();
  const l11 = by(w11.hs, 'wkL');
  if (l11) await dragPath(l11, [[l11.x + dW * 0.55, l11.y], [l11.x + dW, l11.y]]);
  const e11 = await prod(), e11eps = await epDays(), e11mon = await cellCls(1, 1);
  await ctrlZ();
  const e11u = await prod(), e11umon = await cellCls(1, 1);
  out.E11 = { dragged: e11, eps: e11eps, monClass: e11mon, undone: e11u, undoneMonClass: e11umon };
  kase('E11', 'week-left right a day: Mon 7/6 marked off, every episode still 8, wrap 10/21; ONE Ctrl+Z clears it, 10/20',
       !!l11 && /mv-day-off/.test(e11mon || '') && e11eps.every(x => x === '8') && e11.wrap === '10/21/26' && e11.total === '80'
       && !/mv-day-off/.test(e11umon || '') && e11u.wrap === '10/20/26', out.E11);

  // E12 -- the week's RIGHT edge onto Saturday and back, one gesture.
  const w12 = await wk2fri();
  const r12 = by(w12.hs, 'wkR');
  let e12mid = null, e12midSat = null;
  if (r12) {
    await mouse('mouseMoved', r12.x, r12.y, 0);
    await mouse('mousePressed', r12.x, r12.y, 1);
    await sleep(150);
    await mouse('mouseMoved', r12.x + dW, r12.y, 1);
    await sleep(400);
    e12mid = await prod(); e12midSat = await cellCls(1, 6);
    await mouse('mouseMoved', r12.x, r12.y, 1);
    await sleep(400);
    await mouse('mouseReleased', r12.x, r12.y, 0);
    await sleep(700);
  }
  const e12 = await prod(), e12sat = await cellCls(1, 6);
  out.E12 = { mid: e12mid, midSat: e12midSat, back: e12, backSat: e12sat };
  kase('E12', 'week-right onto Sat 7/11 and back: Sat worked and wrap 10/19 mid-gesture, then nothing marked and 10/20',
       !!r12 && !!e12mid && /mv-day-on/.test(e12midSat || '') && e12mid.wrap === '10/19/26'
       && !/mv-day-on/.test(e12sat || '') && e12.wrap === '10/20/26', out.E12);

  // E13 -- Blocks mode: Block 1 ends Thu 7/23 (18 shoot days from 6/29, the 7/3 holiday skipped).
  await load('blocks');
  await gotoMonth('July 2026');
  const p13 = await prodPill(3);
  const h13 = p13 ? await restOn(p13) : [];
  const b13 = by(h13, 'bound');
  const before13 = await blkDays(), q13 = await prod();
  if (b13) await dragPath(b13, [[b13.x + dW * 0.55, b13.y], [b13.x + dW, b13.y]]);
  const after13 = await blkDays(), e13 = await prod();
  out.E13 = { pill: p13, handles: h13, before: before13, beforeProd: q13, after: after13, prod: e13 };
  kase('E13', "Blocks mode: Block 1's end (Thu 7/23) right a day: Block 1 19, Block 2 17 (it gives up the day), total and wrap held",
       !!b13 && b13.topmost === true && before13[0] === '18' && before13[1] === '18' && after13[0] === '19' && after13[1] === '17'
       && e13.total === q13.total && !!q13.wrap && e13.wrap === q13.wrap && e13.start === q13.start, out.E13);

  // E14 -- half days (owner, 15 Oct 2026): a half switch day carries two bars, each with its own grips.
  // July 2026's row 2 is Sun 7/12 - Sat 7/18; Monday is grid column 2. ⚠️ REVISED 16 Oct 2026
  // (HALF-SQUARE-BARS-PLAN.md): the two bars share one lane now, the earlier on the left half of the square,
  // so they are read left to right, not top to bottom, and 202's end grip sits in the middle of Monday.
  await load('halfdays');
  await gotoMonth('July 2026');
  const barsOn = (row, col) => ev(`(async () => {
    const wk = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    const ps = Array.from(wk ? wk.querySelectorAll('.mv-pill[data-ph="production"]') : [])
      .filter(p => +p.style.gridColumnStart <= ${col} && +p.style.gridColumnEnd > ${col})
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    if (ps[0]) { ps[0].scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300)); }
    return ps.map(p => { const r = p.getBoundingClientRect();
      const label = (p.firstChild && p.firstChild.nodeType === 3 ? p.firstChild.textContent : p.textContent).trim();
      return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom,
               gc: p.style.gridColumnStart + '/' + p.style.gridColumnEnd, lane: +p.style.gridRowStart, label }; }); })()`);
  const mon14 = await barsOn(2, 2);
  const top14 = mon14[0], low14 = mon14[1];
  const monCell = await cell(2, 1, 13);
  const hLow = low14 ? await restOn(low14) : [];
  const hTop = top14 ? await restOn(top14) : [];
  const b14 = by(hTop, 'bound');
  const eps14a = await epDays(), q14a = await prod();
  if (b14) await dragPath(b14, [[b14.x + dW * 0.55, b14.y], [b14.x + dW, b14.y]]);
  const eps14b = await epDays(), q14b = await prod();
  const tue14 = (await barsOn(2, 3)).map(x => x.label), mon14b = (await barsOn(2, 2)).map(x => x.label);
  await ctrlZ();
  const eps14c = await epDays(), q14c = await prod();
  out.E14 = { mon: mon14, monCell, top: hTop, low: hLow, before: { eps: eps14a, prod: q14a }, after: { eps: eps14b, prod: q14b, tue: tue14, mon: mon14b },
              undone: { eps: eps14c, prod: q14c } };
  // ⚠️ REVISED 19 Oct 2026 (an episode's end removes days, never pushes): at a HALF switch day there is no
  // whole day to leave off, so 202 and 203 trade -- 202 5.5, 203 3.5 -- and the total and the wrap hold.
  kase('E14', 'half days: Mon 7/13 has two bars in ONE lane meeting mid-square, 202 (week-left + its end, mid-Monday) and 203 '
       + '(its end only); 202\'s end right a day -> 5.5 and 203 3.5, the switch moves to Tue 7/14, wrap 9/1 held; ONE Ctrl+Z -> 4.5, 4.5',
       mon14.length === 2 && top14.label === 'Ep. 202' && low14.label === 'Ep. 203' && top14.gc === '2/3' && low14.gc === '2/7'
       && top14.lane === low14.lane && Math.abs((low14.l - top14.r) - 2) < 0.6 && !!monCell && Math.abs((top14.r + low14.l) / 2 - monCell.x) < 4
       && kinds(hTop) === 'bound,wkL' && kinds(hLow) === 'bound,head' && !!b14 && b14.topmost === true && Math.abs(b14.r - top14.r) < 1
       && eps14a[1] === '4.5' && q14a.total === '45.5' && q14a.wrap === '9/1/26'
       && eps14a[2] === '4.5' && eps14b[1] === '5.5' && eps14b[2] === '3.5' && q14b.total === '45.5' && q14b.wrap === '9/1/26'
       && q14b.start === q14a.start
       && JSON.stringify(tue14) === '["Ep. 202","Ep. 203"]' && JSON.stringify(mon14b) === '["Ep. 202"]'
       && eps14c[1] === '4.5' && eps14c[2] === '4.5' && q14c.wrap === '9/1/26' && q14c.total === '45.5', out.E14);

  // E15 -- taking removed days back (19 Oct 2026). 201's end left two days and released: Wed and Thu are off.
  // Then ONE gesture from Tue right three days: Wed and Thu come back one at a time, and Friday is taken from
  // 202. Nothing is left marked, and the total and the wrap are where they began. ONE Ctrl+Z returns to 6.
  const w15 = await wk2();
  const b15 = by(w15.hs, 'bound');
  if (b15) await dragPath(b15, [[b15.x - dW, b15.y], [b15.x - dW * 2, b15.y]]);
  const e15a = await epDays(), o15a = await offsOf(1);
  const p15 = await prodPill(1);
  const h15 = p15 ? await restOn(p15) : [];
  const c15 = by(h15, 'bound');
  const mids15 = [];
  if (c15) {
    await mouse('mouseMoved', c15.x, c15.y, 0);
    await mouse('mousePressed', c15.x, c15.y, 1);
    await sleep(150);
    for (let k = 1; k <= 3; k++) {
      await mouse('mouseMoved', c15.x + dW * k, c15.y, 1);
      await sleep(350);
      mids15.push({ eps: await epDays(), offs: await offsOf(1) });
    }
    await mouse('mouseReleased', c15.x + dW * 3, c15.y, 0);
    await sleep(700);
  }
  const e15 = await prod(), e15eps = await epDays(), o15 = await offsOf(1), w15b = await barsOf(1);
  await ctrlZ();
  const e15u = await epDays(), o15u = await offsOf(1);
  out.E15 = { removed: { eps: e15a, offs: o15a }, handle: c15, mids: mids15, after: { prod: e15, eps: e15eps, offs: o15, week2: w15b },
              undone: { eps: e15u, offs: o15u } };
  const m15 = i => mids15[i] || { eps: [], offs: '' };
  kase('E15', "taking days back: 201 at 6 (Wed, Thu off) dragged right three days in one gesture -> 7, 8, then 9 with 202's Friday; "
       + 'nothing marked, total 80, wrap 10/20; ONE Ctrl+Z -> 6, Wed and Thu off',
       e15a[0] === '6' && o15a === '0001100' && !!c15 && c15.topmost === true
       && m15(0).eps[0] === '7' && m15(0).offs === '0000100' && m15(1).eps[0] === '8' && m15(1).offs === '0000000'
       && m15(2).eps[0] === '9' && m15(2).eps[1] === '7'
       && e15eps[0] === '9' && e15eps[1] === '7' && o15 === '0000000' && e15.total === '80' && e15.wrap === '10/20/26'
       && JSON.stringify(w15b) === '["Ep. 201 2/7"]'
       && e15u[0] === '6' && e15u[1] === '8' && o15u === '0001100', out.E15);

  // E16 -- 202's START (Fri 7/10, right against 201's Thu) dragged later onto Mon 7/13, one gesture through Sat.
  const w16 = await wk2fri();
  const h16 = by(w16.hs, 'head');
  const fri16 = await cell(1, 5, 10), mon16 = await cell(2, 1, 13);
  const w3b16 = await barsOf(2);
  if (h16 && fri16 && mon16) await dragPath(h16, [[h16.x + dW * 0.6, h16.y], [mon16.x + (h16.x - fri16.x), mon16.y]]);
  const e16 = await prod(), e16eps = await epDays(), e16w2 = await barsOf(1), e16w3 = await barsOf(2), e16off = await offsOf(1);
  await ctrlZ();
  const e16u = await prod(), e16ueps = await epDays(), e16uw2 = await barsOf(1), e16uoff = await offsOf(1);
  out.E16 = { handle: h16, dragged: e16, eps: e16eps, week2: e16w2, week3: e16w3, week3before: w3b16, offs: e16off,
              undone: e16u, undoneEps: e16ueps, undoneWeek2: e16uw2, undoneOffs: e16uoff };
  kase('E16', "202's START later onto Mon 7/13: Fri off, 202 7, 201 still 8, week 3 untouched, total 79, wrap 10/20; ONE Ctrl+Z back",
       !!h16 && h16.topmost === true && e16eps[0] === '8' && e16eps[1] === '7' && e16eps[2] === '8'
       && e16off === '0000010' && JSON.stringify(e16w2) === '["Ep. 201 2/6"]' && JSON.stringify(e16w3) === JSON.stringify(w3b16)
       && e16.total === '79' && e16.wrap === '10/20/26' && e16.start === '2026-06-29'
       && e16ueps[0] === '8' && e16ueps[1] === '8' && e16uoff === '0000000' && e16u.wrap === '10/20/26' && e16u.edited === false
       && JSON.stringify(e16uw2) === '["Ep. 201 2/6","Ep. 202 6/7"]', out.E16);

  // E17 -- 202's start dragged earlier a day, into 201's Thursday: the two trade it, nothing else moves.
  const w17 = await wk2fri();
  const h17 = by(w17.hs, 'head');
  if (h17) await dragPath(h17, [[h17.x - dW * 0.55, h17.y], [h17.x - dW, h17.y]]);
  const e17 = await prod(), e17eps = await epDays(), e17w2 = await barsOf(1), e17off = await offsOf(1);
  out.E17 = { handle: h17, dragged: e17, eps: e17eps, week2: e17w2, offs: e17off };
  kase('E17', "202's start earlier a day onto 201's Thu 7/9: 201 7 (ends Wed), 202 9 (starts Thu), nothing marked, total 80, wrap 10/20",
       !!h17 && e17eps[0] === '7' && e17eps[1] === '9' && e17eps[2] === '8' && e17off === '0000000'
       && JSON.stringify(e17w2) === '["Ep. 201 2/5","Ep. 202 5/7"]' && e17.total === '80' && e17.wrap === '10/20/26', out.E17);

  // E18 -- labelled by Week, so ONE bar per week: the episode line inside it carries both grips, side by side.
  await load();
  await gotoMonth('July 2026');
  await ev(`(() => { const r = document.querySelector('input[name="mv-prod-label"][value="week"]'); if (r) r.click(); return !!r; })()`);
  await sleep(600);
  const p18 = await prodPill(1);
  const h18 = p18 ? await restOn(p18) : [];
  const thu18 = await cell(1, 4, 9), fri18 = await cell(1, 5, 10);
  const line18 = thu18 && fri18 ? (thu18.x + fri18.x) / 2 : null;
  const b18 = by(h18, 'bound'), hd18 = by(h18, 'head');
  if (hd18) await dragPath(hd18, [[hd18.x - dW * 0.55, hd18.y], [hd18.x - dW, hd18.y]]);
  const e18 = await prod(), e18eps = await epDays();
  out.E18 = { pill: p18, handles: h18, line: line18, dragged: e18, eps: e18eps };
  kase('E18', "labelled by Week: the Thu|Fri line in week 2's one bar has 201's end left of it and 202's start right of it, both topmost; "
       + '202\'s start left a day -> 201 7, 202 9, wrap 10/20',
       !!p18 && p18.gc === '2/7' && kinds(h18) === 'bound,head,wkL,wkR' && visible(h18).every(h => h.topmost)
       && !!b18 && !!hd18 && line18 !== null && Math.abs(b18.r - line18) < 4 && Math.abs(hd18.l - line18) < 4 && b18.r <= hd18.l + 0.5
       && e18eps[0] === '7' && e18eps[1] === '9' && e18.total === '80' && e18.wrap === '10/20/26', out.E18);

  // ---- R5 for the month drags (owner, 19 Oct 2026): an EDITED auto-note follows its date ----------
  // autonote-grips.sptcal: monthnotes.sptcal (an undated "Start Principal Photography 6/29/26" + "Table
  // Read") plus "Principal Photography Wraps 10/20/26" stored as literal text, the owner's own shape, and
  // "Writer's Room Opens 1/5/26" + "Pitch day". Read off the month view's note blocks, 'day|text'.
  const notesShown = () => ev(`Array.from(document.querySelectorAll('#table-wrap .mv-note-block'))
    .map(b => b.dataset.noteDay + '|' + b.innerText.replace(/\\s+/g, ' ').trim())`);
  const has = (ns, s) => ns.indexOf(s) >= 0;
  const says = (ns, re) => ns.some(s => re.test(s));

  // E19 -- the start grip right a day: the Start line moves to 6/30 and says so; Table Read stays on the
  // week's Monday; ONE Ctrl+Z puts the note back with the date.
  await load('autonote-grips');
  await gotoMonth('June 2026');
  const n19a = await notesShown();
  const h19 = visible(await restOn(await prodPill(0))).find(h => h.edge === 'start');
  const mon19 = await cell(4, 1, 29), tue19 = await cell(4, 2, 30);
  if (h19 && mon19 && tue19) await dragPath(h19, [[h19.x + (tue19.x - mon19.x) * 0.55, h19.y], [h19.x + (tue19.x - mon19.x), h19.y]]);
  const p19 = await prod(), n19b = await notesShown();
  await ctrlZ();
  const p19u = await prod(), n19c = await notesShown();
  out.E19 = { before: n19a, handle: h19, prod: p19, after: n19b, undoneProd: p19u, undone: n19c };
  kase('E19', 'an EDITED Start note follows the start grip: "Start Principal Photography 6/30/26" on 6/30, Table Read kept on 6/29, '
       + 'no 6/29/26 left; ONE Ctrl+Z restores the note and 6/29',
       !!h19 && has(n19a, '2026-06-29|Start Principal Photography 6/29/26') && has(n19a, '2026-06-29|Table Read')
       && p19.start === '2026-06-30' && has(n19b, '2026-06-30|Start Principal Photography 6/30/26') && has(n19b, '2026-06-29|Table Read')
       && !says(n19b, /6\/29\/26/)
       && p19u.start === '2026-06-29' && JSON.stringify(n19c) === JSON.stringify(n19a), out.E19);

  // E20 -- out a day and back in ONE gesture: the note is exactly as it was (recomputed from the press,
  // never chained step to step).
  await load('autonote-grips');
  await gotoMonth('June 2026');
  const n20a = await notesShown();
  const h20 = visible(await restOn(await prodPill(0))).find(h => h.edge === 'start');
  const mon20 = await cell(4, 1, 29), tue20 = await cell(4, 2, 30);
  let n20mid = [];
  if (h20 && mon20 && tue20) {
    await mouse('mouseMoved', h20.x, h20.y, 0);
    await mouse('mousePressed', h20.x, h20.y, 1);
    await sleep(150);
    await mouse('mouseMoved', h20.x + (tue20.x - mon20.x), h20.y, 1);
    await sleep(400);
    n20mid = await notesShown();
    await mouse('mouseMoved', h20.x, h20.y, 1);
    await sleep(400);
    await mouse('mouseReleased', h20.x, h20.y, 0);
    await sleep(700);
  }
  const p20 = await prod(), n20b = await notesShown();
  out.E20 = { before: n20a, mid: n20mid, after: n20b, prod: p20 };
  kase('E20', 'out a day and back in ONE gesture: 6/30/26 mid-gesture, then the notes exactly as they were and the start 6/29',
       !!h20 && has(n20mid, '2026-06-30|Start Principal Photography 6/30/26')
       && p20.start === '2026-06-29' && JSON.stringify(n20b) === JSON.stringify(n20a), out.E20);

  // E21 -- the wrap grip right a day (Tue 10/20 -> Wed 10/21): a note stored as exactly the auto text goes
  // with it; ONE Ctrl+Z puts it back.
  await load('autonote-grips');
  await gotoMonth('October 2026');
  const n21a = await notesShown();
  const h21 = visible(await restOn(await prodPill(-1))).find(h => h.edge === 'end');
  const tue21 = await cell(3, 2, 20), wed21 = await cell(3, 3, 21);
  if (h21 && tue21 && wed21) await dragPath(h21, [[h21.x + (wed21.x - tue21.x) * 0.55, h21.y], [h21.x + (wed21.x - tue21.x), h21.y]]);
  const p21 = await prod(), n21b = await notesShown();
  await ctrlZ();
  const p21u = await prod(), n21c = await notesShown();
  out.E21 = { before: n21a, handle: h21, prod: p21, after: n21b, undoneProd: p21u, undone: n21c };
  kase('E21', 'the owner\'s shape (a note that IS the auto text) follows the wrap grip: "Principal Photography Wraps 10/21/26" on 10/21, '
       + 'no 10/20/26 left; ONE Ctrl+Z restores it',
       !!h21 && has(n21a, '2026-10-20|Principal Photography Wraps 10/20/26')
       && p21.wrap === '10/21/26' && has(n21b, '2026-10-21|Principal Photography Wraps 10/21/26') && !says(n21b, /10\/20\/26/)
       && p21u.wrap === '10/20/26' && JSON.stringify(n21c) === JSON.stringify(n21a), out.E21);

  // D5 -- body-drag Production DOWN A WEEK (Mon 6/29 -> Mon 7/6). It carries no note between weeks, so the
  // edited Start note's own line stays on 6/29 while its auto line leaves the week: the 7/6 week shows the
  // plain auto-note, and the wrap note (exactly the auto text) leaves 10/20 and goes back to plain auto.
  // Cross-week on purpose: it was written while a line rewritten to a day 1-9 inside an override still sat on its
  // week's Monday (notesForWaterfallDate's two-digit-day pattern, since fixed: E22, E23), and it keeps covering
  // the path where the auto line leaves its week.
  await load('autonote-grips');
  await gotoMonth('June 2026');
  const n5a = await notesShown();
  const g5 = await prodPill(0);
  const wk5 = await ev(`document.querySelector('#table-wrap .mv-week').getBoundingClientRect().height`);
  if (g5) {
    await mouse('mouseMoved', g5.x, g5.y, 0);
    await mouse('mousePressed', g5.x, g5.y, 1);
    await sleep(150);
    await mouse('mouseMoved', g5.x, g5.y + wk5 * 0.55, 1);
    await sleep(150);
    await mouse('mouseMoved', g5.x, g5.y + wk5, 1);
    await sleep(400);
    await mouse('mouseReleased', g5.x, g5.y + wk5, 0);
    await sleep(700);
  }
  // July's grid starts Sun 6/28, so it shows both 6/29 and 7/6 (June's ends on Sat 7/4).
  const p5 = await prod();
  await gotoMonth('July 2026');
  const n5b = await notesShown();
  await gotoMonth('October 2026');
  const n5c = await notesShown();
  // The new wrap is read off the meta line, not assumed: the move also takes the 7/3 holiday out of the shoot.
  const isoOfShort = w => { const [m, d, y] = String(w).split('/'); return '20' + y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'); };
  out.D5 = { before: n5a, pill: g5, landed: p5, after: n5b, october: n5c };
  kase('D5', 'body-drag Production down a week: starts 7/6, "Start Principal Photography 7/6/26" on 7/6, Table Read kept on 6/29, '
       + 'no 6/29/26; the wrap note moves with the wrap, no 10/20/26',
       !!g5 && has(n5a, '2026-06-29|Start Principal Photography 6/29/26') && p5.start === '2026-07-06' && !!p5.wrap && p5.wrap !== '10/20/26'
       && has(n5b, '2026-07-06|Start Principal Photography 7/6/26') && has(n5b, '2026-06-29|Table Read') && !says(n5b, /6\/29\/26/)
       && has(n5c, isoOfShort(p5.wrap) + '|Principal Photography Wraps ' + p5.wrap) && !says(n5c, /10\/20\/26/), out.D5);

  // E22 -- the start grip onto a day 1-9 (Mon 6/29 -> Wed 7/1), the edited note still holding "Table Read". The
  // rewritten line "Start Principal Photography 7/1/26" sits on 7/1 itself, not on its week's Monday. Red until
  // notesForWaterfallDate's trailing-date pattern took a one-digit day (frozen edit, owner-approved 19 Oct 2026),
  // since fmtShort writes "7/1/26".
  await load('autonote-grips');
  await gotoMonth('June 2026');
  const h22 = visible(await restOn(await prodPill(0))).find(h => h.edge === 'start');
  const mon22 = await cell(4, 1, 29), wed22 = await cell(4, 3, 1);
  if (h22 && mon22 && wed22) await dragPath(h22, [[h22.x + (wed22.x - mon22.x) * 0.5, h22.y], [h22.x + (wed22.x - mon22.x), h22.y]]);
  const p22 = await prod(), n22 = await notesShown();
  out.E22 = { handle: h22, prod: p22, after: n22 };
  kase('E22', 'start grip onto Wed 7/1: "Start Principal Photography 7/1/26" sits ON 7/1 (not Monday 6/29), Table Read on 6/29',
       !!h22 && p22.start === '2026-07-01'
       && has(n22, '2026-07-01|Start Principal Photography 7/1/26') && has(n22, '2026-06-29|Table Read')
       && !has(n22, '2026-06-29|Start Principal Photography 7/1/26'), out.E22);

  // E23 -- where a dated line inside an edited week note is drawn, no drag (both rules frozen edits in
  // notesForWaterfallDate, owner-approved 19 Oct 2026). The 8/3 week's note holds "Cast read 8/4/26" (its own week,
  // day 1-9: on 8/4, it was on Monday 8/3) and "Delivery 8/12/26" (dated in ANOTHER week: placed like an undated
  // line, on Monday 8/3; it used to be drawn on no day at all). August's grid starts Sun 7/26.
  await load('autonote-grips');
  await gotoMonth('August 2026');
  const n23 = await notesShown();
  out.E23 = { august: n23 };
  kase('E23', 'an edited week note: "Cast read 8/4/26" on 8/4 (not Monday), "Delivery 8/12/26" (another week) on Monday 8/3, not lost',
       has(n23, '2026-08-04|Cast read 8/4/26') && has(n23, '2026-08-03|Delivery 8/12/26')
       && !has(n23, '2026-08-03|Cast read 8/4/26') && !has(n23, '2026-08-12|Delivery 8/12/26'), out.E23);
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'pilldrag threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`pilldrag: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
