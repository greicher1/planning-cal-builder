// hiatusdrag.mjs -- the month view's hiatus drag: grab a band to move its hiatus a week at a time, or use
// the START grip on its first week and the END grip on its last. HIATUS-DRAG-PLAN.md; owner rulings of
// 19 Oct 2026: a LOCKED hiatus can't be dragged (1), Production's day marks stay on their dates (2), an
// all-phase drag asks Keep or Undo and a phase's own never asks (3), and the band's look comes with it (4).
//
//   node hiatusdrag.mjs [--page /dist/index.html]
//
// Writes hiatusdrag.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges like
// phaseedge.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG: phaseedge's reason. Only CDP's Input.dispatchMouseEvent is TRUSTED
// input, and a hiatus band is CLICK-THROUGH (.mv-bars{pointer-events:none}), so the whole gesture rests on
// the body-level layer being TOPMOST where the user presses. H0 asserts that with elementsFromPoint, and
// every press is made there. A dispatchEvent() drag would prove only the handler.
//
// ⚠️ NOT PROVED HERE: that the crash backup and autosave are held while the question is open. IndexedDB
// never settles in headless Chrome (CLAUDE.md), so nothing is ever backed up here at all. That was proved
// in the app pane instead (HIATUS-DRAG-PLAN.md §9). The Cmd+Z half of the hold IS proved (H1).
//
// hiatusdrag.sptcal (synthetic, no region, so no holidays). Production: 3 x 10-day episodes from Mon
// 3/1/27, wrapping Mon 5/3/27, with a HALF day on Wed 4/14/27. Post: 3 weeks from 5/3/27, with its own
// hiatus "Post Pause" the week of 5/17/27. Localization: 12 weeks from 6/7/27 (it carries the calendar
// into August). All-phase hiatuses, one week each unless said:
//   Spring Break   3/22/27  unlocked; its band restyled ON THE BAND: label "Spring Break (typed)", #7030A0
//   Easter Week    4/5/27   unlocked
//   Studio Shutdown 4/19/27 LOCKED
//   Summer Hiatus  6/14/27  unlocked, 3 weeks
//   Overlap One    8/2/27   unlocked, 2 weeks  } they share the week of 8/9: that band is ambiguous
//   Overlap Two    8/9/27   unlocked           }
// Month rows, Sun = column 0. March 2027: 0 = 2/28, 1 = 3/7, 2 = 3/14, 3 = 3/21 (Spring Break), 4 = 3/28.
// April: 0 = 3/28, 1 = 4/4 (Easter), 2 = 4/11 (the half day), 3 = 4/18 (Shutdown), 4 = 4/25.
// May: 3 = 5/16 (Post Pause). June: 2-4 = Summer Hiatus. August: 0 = 8/1, 1 = 8/8 (shared).
//
//   H0  where the affordances are: Spring Break's band has the layer (grab) and both grips (ns-resize),
//       all children of <body> and TOPMOST; Shutdown (locked) has a not-allowed layer naming Lock in place
//       and no grips; Overlap One's own week has the layer and a START grip only; the shared week has
//       nothing; Post Pause has the layer and both grips
//   H1  move up a row, Keep: the question names the old and new weeks; Ctrl+Z under it does nothing; Keep
//       -> 3/15, the typed label and colour on the 3/15 band, no band on 3/22; ONE Ctrl+Z -> 3/22
//   H2  move down a row, Undo: back to 3/22 exactly, the look there; nothing banked (Undo is off and the
//       next Ctrl+Z changes nothing: since 22 Oct 2026 a view switch is no undo step, so after load() the
//       stack is empty. Until then the probe was that this Ctrl+Z undid the switch to the month view)
//   H3  sideways within the row: nothing written, no question
//   H4  dropped on the SUNDAY of the next row: that row's week (3/29), not mondayOf(Sun) = 3/22
//   H5  no overlap: Easter Week dragged onto the locked Shutdown's row stops one week short, at 4/12
//   H6  END grip down a row: 2 weeks, the start held; the added week's band carries the look; the
//       question gives Production's new wrap; the half day stays on Wed 4/14 (ruling 2), not 4/21
//   H7  START grip up a row: 3/15, 2 weeks, the last week held; ONE Ctrl+Z -> 3/22, 1 week
//   H8  floor: Summer Hiatus's END grip dragged up past its start -> 1 week, start held
//   H9  a phase's own hiatus (Post Pause) up a row: 5/10, NO question; ONE Ctrl+Z -> 5/17
//   H10 a phase's own hiatus down a row, past Post's last working week: refused (it would stop pausing
//       Post and vanish), nothing banked
//   H11 Escape mid-drag: put back, the shield gone, no question, nothing banked
//   H12 print: the layer is display:none under body.printing-calendar in print media, and none of the
//       chrome is ever inside #print-root or #table-wrap
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8233));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8233 ? PORT : ''}-hiatusdrag`;
removeProfileOnExit(PROFILE);   // the profile, its socket dir: gone on every exit (chrome-profile.mjs)
const OUT = path.join(HERE, 'hiatusdrag.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'hiatusdrag', cases: [] };
// A hang must REPORT, not block a gate run: after 480 s the script writes what it has and exits.
setTimeout(() => {
  out.EX = 'hiatusdrag: hit its 480 s deadline';
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
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', NO_BUNDLE_CLONE, `--user-data-dir=${PROFILE}`,
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

  await send('Page.enable');
  // A fresh page per case, so no case inherits another's leftovers.
  const load = async month => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=hiatusdrag` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && !!document.querySelector('#hiatus-list .hiatus-entry')`, 'the engine');
    await sleep(800);
    // The previous case's drag left a crash backup in this profile; decline the recovery modal (setup).
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(400);
    await ev(`document.getElementById('view-month-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap .mv-monthyear')`, 'the month view');
    await sleep(300);
    await ev(`(async () => {
      const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const idx = t => { const [m, y] = String(t).trim().split(/\\s+/); return +y * 12 + M.indexOf(m); };
      const lbl = () => ((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '').trim();
      const want = idx(${JSON.stringify(month)});
      for (let i = 0; i < 40 && idx(lbl()) !== want; i++) {
        document.getElementById(idx(lbl()) < want ? 'mv-next' : 'mv-prev').click();
        await new Promise(r => setTimeout(r, 200));
      }
      document.querySelector('#table-wrap .mv-body').scrollIntoView({ block: 'start' });
      await new Promise(r => setTimeout(r, 300));
      return lbl(); })()`);
    await sleep(300);
  };
  // The sidebar's hiatuses, Post's own, the open question and Undo's state.
  const state = () => ev(`(() => {
    const $ = id => document.getElementById(id);
    const rows = Array.from(document.querySelectorAll('#hiatus-list .hiatus-entry')).map(r => ({
      name: r.querySelector('.hiatus-name').value, start: r.querySelector('.hiatus-start').value,
      weeks: r.querySelector('.hiatus-weeks').value, locked: r.querySelector('.hiatus-locked').checked }));
    const q = Array.from(document.querySelectorAll('.mantine-Modal-content')).map(d => d.innerText.replace(/\\s+/g, ' ').trim()).join(' || ');
    return { rows, by: Object.fromEntries(rows.map(r => [r.name, r.start + '/' + r.weeks])),
      post: $('phiatus-start-post').value + '/' + $('phiatus-weeks-post').value,
      question: q, month: !!document.querySelector('#table-wrap .mv-monthyear'),
      undoOff: (u => !!u && (u.disabled || u.hasAttribute('data-disabled')))($('undo-btn')),
      shield: !!document.querySelector('.hiatus-drag-shield'), prod: ($('meta-production') || {}).textContent || '' }; })()`);
  // "Nothing banked": after load() the stack is empty (a view switch is no undo step, 22 Oct 2026), so the
  // Ctrl+Z after the case must change nothing. A banked step -- even an intermediate one -- would be undone.
  const banked0 = (after, next) => next.month === true && next.undoOff === true && !next.question
    && JSON.stringify(next.by) === JSON.stringify(after.by) && next.post === after.post;
  // A week row's hiatus band (the first), with its centre, box and look; and the row's own box.
  const band = row => ev(`(() => {
    const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}]; if (!w) return null;
    const wr = w.getBoundingClientRect();
    const b = w.querySelector('.mv-hiatus-bar');
    const halves = Array.from(w.querySelectorAll('.mv-daycell.mv-day-half')).map(c => parseInt(c.querySelector('.mv-daynum').textContent, 10));
    if (!b) return { none: true, rowY: (wr.top + wr.bottom) / 2, halves };
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom,
             text: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor, wt: getComputedStyle(b).fontWeight, rowY: (wr.top + wr.bottom) / 2, halves }; })()`);
  // A day cell's centre, checked against its rendered day number.
  const cell = (row, col, num) => ev(`(() => {
    const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}];
    const c = w && w.querySelectorAll(':scope > .mv-daygrid > .mv-daycell')[${col}]; if (!c) return null;
    const r = c.getBoundingClientRect(), n = parseInt(c.querySelector('.mv-daynum').textContent, 10);
    return n === ${num} ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  // The layer and both grips as hit-testing sees them.
  const aff = () => ev(`(() => {
    const info = e => { if (!e) return null; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      return { hidden: e.hidden, l: r.left, r: r.right, t: r.top, b: r.bottom, x, y,
               topmost: !e.hidden && document.elementsFromPoint(x, y)[0] === e, body: e.parentElement === document.body,
               title: e.title, locked: e.classList.contains('is-locked'), cursor: getComputedStyle(e).cursor }; };
    const g = Array.from(document.querySelectorAll('.hiatus-grip'));
    return { layer: info(document.querySelector('.hiatus-drag-layer')),
             start: info(g.find(x => x.dataset.hiatusEdge === 'start')), end: info(g.find(x => x.dataset.hiatusEdge === 'end')),
             layers: document.querySelectorAll('.hiatus-drag-layer').length, grips: g.length }; })()`);
  // Rest on a band: from somewhere off the grid first, so a fresh mousemove arrives over it.
  const restOn = async b => { await mouse('mouseMoved', 5, 5, 0); await sleep(150); await mouse('mouseMoved', b.x, b.y, 0); await sleep(250); return aff(); };
  // One press at `from`, a path of points, and a release at the last one.
  const dragPath = async (from, pts) => {
    await mouse('mouseMoved', from.x, from.y, 0);
    await mouse('mousePressed', from.x, from.y, 1);
    await sleep(150);
    for (const [x, y] of pts) { await mouse('mouseMoved', x, y, 1); await sleep(350); }
    const [lx, ly] = pts[pts.length - 1];
    await mouse('mouseReleased', lx, ly, 0);
    await sleep(700);
  };
  const asked = () => until(`Array.from(document.querySelectorAll('.mantine-Modal-content')).some(d => /Move hiatus/.test(d.innerText))`, 'the Move hiatus question', 5000).then(() => true, () => false);
  // Answer the question with a real click on its button.
  const answer = async label => {
    const b = await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Move hiatus/.test(d.innerText));
      const x = m && Array.from(m.querySelectorAll('button')).find(e => (e.innerText || '').trim() === ${JSON.stringify(label)});
      if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!b) return false;
    await mouse('mouseMoved', b.x, b.y, 0); await mouse('mousePressed', b.x, b.y, 1); await mouse('mouseReleased', b.x, b.y, 0);
    await sleep(900);
    return true;
  };
  const PURPLE = 'rgb(112, 48, 160)';

  // ---- H0: where the affordances are ------------------------------------------------------------
  await load('March 2027');
  const h0 = {};
  h0.sb = await band(3); h0.sbAff = h0.sb && await restOn(h0.sb);
  await load('April 2027');
  h0.sd = await band(3); h0.sdAff = h0.sd && await restOn(h0.sd);
  await load('August 2027');
  h0.o1 = await band(0); h0.o1Aff = h0.o1 && await restOn(h0.o1);
  h0.o2 = await band(1); h0.o2Aff = h0.o2 && await restOn(h0.o2);
  await load('May 2027');
  h0.pp = await band(3); h0.ppAff = h0.pp && await restOn(h0.pp);
  out.H0 = h0;
  const shownOk = (e, b) => !!e && !e.hidden && e.topmost === true && e.body === true && e.t >= b.t - 1 && e.b <= b.b + 1;
  const sbA = h0.sbAff || {};
  kase('H0', "affordances: Spring Break = layer (grab) + START and END grips (ns-resize), on <body>, topmost, at the band's ends; Shutdown (locked) = a not-allowed layer naming Lock in place, no grips; Overlap One's own week = layer + START only; the shared week = nothing; Post Pause = layer + both grips",
       !!h0.sb && h0.sb.text === 'Spring Break (typed)' && h0.sb.bg === PURPLE
       && shownOk(sbA.layer, h0.sb) && sbA.layer.cursor === 'grab' && sbA.layer.locked === false && /move/.test(sbA.layer.title)
       && Math.abs(sbA.layer.l - h0.sb.l) < 1 && Math.abs(sbA.layer.r - h0.sb.r) < 1
       && shownOk(sbA.start, h0.sb) && Math.abs(sbA.start.l - h0.sb.l) < 1 && sbA.start.cursor === 'ns-resize'
       && shownOk(sbA.end, h0.sb) && Math.abs(sbA.end.r - h0.sb.r) < 1 && sbA.end.cursor === 'ns-resize'
       && sbA.layers === 1 && sbA.grips === 2
       && !!h0.sdAff && shownOk(h0.sdAff.layer, h0.sd) && h0.sdAff.layer.locked === true && h0.sdAff.layer.cursor === 'not-allowed'
       && /Lock in place/.test(h0.sdAff.layer.title) && h0.sdAff.start.hidden && h0.sdAff.end.hidden
       && !!h0.o1Aff && shownOk(h0.o1Aff.layer, h0.o1) && !h0.o1Aff.start.hidden && h0.o1Aff.end.hidden
       && !!h0.o2Aff && h0.o2Aff.layer.hidden && h0.o2Aff.start.hidden && h0.o2Aff.end.hidden
       && !!h0.ppAff && h0.pp.text === 'Post Pause' && shownOk(h0.ppAff.layer, h0.pp) && !h0.ppAff.start.hidden && !h0.ppAff.end.hidden, out.H0);

  // ---- H1: move up a row, Ctrl+Z under the question, Keep, one Ctrl+Z -------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), b2 = await band(2), a = await restOn(b3);
    await dragPath(a.layer, [[a.layer.x, b2.rowY]]);
    const q = await asked();
    const mid = await state();
    await ctrlZ();                                  // ⛔ held: must do nothing under the open question
    const underZ = await state();
    const kept = await answer('Keep');
    const after = await state(), r2 = await band(2), r3 = await band(3);
    await ctrlZ();
    const undone = await state(), u3 = await band(3), u2 = await band(2);
    out.H1 = { q, mid, underZ, kept, after, r2, r3, undone, u3, u2 };
    kase('H1', 'move up a row: the question names Mon 3/15 - Fri 3/19 and the old Mon 3/22; Ctrl+Z under it does nothing; Keep -> 3/15 with the typed label + colour on 3/15 and no band on 3/22; ONE Ctrl+Z -> 3/22, the look back',
         q && /now runs Mon 3\/15\/27 – Fri 3\/19\/27 \(1 week\)/.test(mid.question) && /It was Mon 3\/22\/27/.test(mid.question)
         && /Spring Break \(typed\)/.test(mid.question)
         && mid.by['Spring Break'] === '2027-03-15/1' && underZ.by['Spring Break'] === '2027-03-15/1' && !!underZ.question
         && kept && !after.question && after.by['Spring Break'] === '2027-03-15/1'
         && r2.text === 'Spring Break (typed)' && r2.bg === PURPLE && r3.none === true
         && undone.by['Spring Break'] === '2027-03-22/1' && u3.text === 'Spring Break (typed)' && u3.bg === PURPLE && u2.none === true, out.H1);
  }

  // ---- H2: move down a row, Undo -----------------------------------------------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), b4 = await band(4), a = await restOn(b3);
    await dragPath(a.layer, [[a.layer.x, b4.rowY]]);
    const q = await asked(), mid = await state();
    const undid = await answer('Undo');
    const after = await state(), r3 = await band(3), r4 = await band(4);
    await ctrlZ();
    const next = await state();
    out.H2 = { q, mid, undid, after, r3, r4, next };
    kase('H2', 'move down a row, Undo: back to 3/22 exactly with its look, no band on 3/29; nothing banked (Undo off, the next Ctrl+Z changes nothing)',
         q && mid.by['Spring Break'] === '2027-03-29/1' && undid && !after.question
         && after.by['Spring Break'] === '2027-03-22/1' && r3.text === 'Spring Break (typed)' && r3.bg === PURPLE && r4.none === true
         && banked0(after, next), out.H2);
  }

  // ---- H3: sideways within the row -------------------------------------------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), a = await restOn(b3);
    await dragPath(a.layer, [[a.layer.x - 150, a.layer.y], [a.layer.x + 150, a.layer.y]]);
    const q = await asked(), after = await state();
    await ctrlZ();
    const next = await state();
    out.H3 = { q, after, next };
    kase('H3', 'sideways within the row: nothing written, no question, nothing banked',
         !q && after.by['Spring Break'] === '2027-03-22/1' && !after.question && banked0(after, next), out.H3);
  }

  // ---- H4: dropped on the Sunday of the next row ----------------------------------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), a = await restOn(b3), sun = await cell(4, 0, 28);
    if (sun) await dragPath(a.layer, [[sun.x, sun.y]]);
    const q = await asked(), mid = await state();
    const kept = await answer('Keep');
    const after = await state();
    out.H4 = { sun, q, mid, kept, after };
    kase('H4', "dropped on SUN 3/28 (row 4): that ROW's week, 3/29 -- not mondayOf(Sun 3/28) = 3/22",
         !!sun && q && kept && after.by['Spring Break'] === '2027-03-29/1', out.H4);
  }

  // ---- H5: no overlap ------------------------------------------------------------------------------------
  await load('April 2027');
  {
    const b1 = await band(1), b3 = await band(3), a = await restOn(b1);
    await dragPath(a.layer, [[a.layer.x, b3.rowY]]);
    const q = await asked(), mid = await state();
    const kept = await answer('Keep');
    const after = await state();
    out.H5 = { q, mid, kept, after };
    kase('H5', "no overlap: Easter Week dragged onto the locked Shutdown's row (4/19) stops a week short, at 4/12; Shutdown untouched",
         q && mid.by['Easter Week'] === '2027-04-12/1' && kept && after.by['Easter Week'] === '2027-04-12/1'
         && after.by['Studio Shutdown'] === '2027-04-19/1', out.H5);
  }

  // ---- H6: END grip down a row -----------------------------------------------------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), b4 = await band(4), a = await restOn(b3);
    await dragPath(a.end, [[a.end.x, b4.rowY]]);
    const q = await asked(), mid = await state();
    const kept = await answer('Keep');
    const after = await state(), r3 = await band(3), r4 = await band(4);
    await load('April 2027');
    const ap = await state(), w2 = await band(2), w3 = await band(3), w4 = await band(4);
    out.H6 = { q, mid, kept, after, r3, r4, w2, w3, w4, ap };
    kase('H6', 'END grip down a row: 2 weeks, start 3/22 held; the added week 3/29 carries the typed label + colour; the question gives Production\'s new wrap; the half day stays on Wed 4/14 (ruling 2), none on 4/21',
         q && /\(2 weeks\)/.test(mid.question) && /Production now wraps/.test(mid.question)
         && kept && after.by['Spring Break'] === '2027-03-22/2'
         && r3.text === 'Spring Break (typed)' && r3.bg === PURPLE && r4.text === 'Spring Break (typed)' && r4.bg === PURPLE
         && JSON.stringify(w2.halves) === '[14]' && (w3.halves || []).length === 0 && (w4.halves || []).length === 0, out.H6);
  }

  // ---- H7: START grip up a row ---------------------------------------------------------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), b2 = await band(2), a = await restOn(b3);
    await dragPath(a.start, [[a.start.x, b2.rowY]]);
    const q = await asked();
    const kept = await answer('Keep');
    const after = await state(), r2 = await band(2), r3 = await band(3);
    await ctrlZ();
    const undone = await state();
    out.H7 = { q, kept, after, r2, r3, undone };
    kase('H7', 'START grip up a row: 3/15 for 2 weeks, the last week (3/22) held, both bands carry the look; ONE Ctrl+Z -> 3/22, 1 week',
         q && kept && after.by['Spring Break'] === '2027-03-15/2' && r2.bg === PURPLE && r3.bg === PURPLE
         && r2.text === 'Spring Break (typed)' && undone.by['Spring Break'] === '2027-03-22/1', out.H7);
  }

  // ---- H8: floor ---------------------------------------------------------------------------------------------------
  await load('June 2027');
  {
    const b4 = await band(4), b0 = await band(0), a = await restOn(b4);
    await dragPath(a.end, [[a.end.x, (await band(3)).rowY], [a.end.x, b0.rowY]]);
    const q = await asked();
    const kept = await answer('Keep');
    const after = await state();
    out.H8 = { q, kept, after };
    kase('H8', "floor: Summer Hiatus's END grip dragged up past its start -> 1 week, the start 6/14 held",
         q && kept && after.by['Summer Hiatus'] === '2027-06-14/1', out.H8);
  }

  // ---- H9: a phase's own hiatus, up a row: no question ------------------------------------------------------------
  await load('May 2027');
  {
    const b3 = await band(3), b2 = await band(2), a = await restOn(b3);
    await dragPath(a.layer, [[a.layer.x, b2.rowY]]);
    const q = await asked(), after = await state(), r2 = await band(2);
    await ctrlZ();
    const undone = await state();
    out.H9 = { q, after, r2, undone };
    kase('H9', "Post Pause (a phase's own) up a row: 5/10, NO question (ruling 3), its band on 5/10; ONE Ctrl+Z -> 5/17",
         !q && after.post === '2027-05-10/1' && r2.text === 'Post Pause' && undone.post === '2027-05-17/1', out.H9);
  }

  // ---- H10: a phase's own hiatus past its phase's last working week ---------------------------------------------------
  await load('May 2027');
  {
    const b3 = await band(3), b4 = await band(4), a = await restOn(b3);
    await dragPath(a.layer, [[a.layer.x, b4.rowY]]);
    const q = await asked(), after = await state(), r3 = await band(3);
    await ctrlZ();
    const next = await state();
    out.H10 = { q, after, r3, next };
    kase('H10', "Post Pause down a row (5/24, after Post's last working week): refused, still 5/17 with its band, no question, nothing banked",
         !q && after.post === '2027-05-17/1' && r3.text === 'Post Pause' && banked0(after, next), out.H10);
  }

  // ---- H11: Escape mid-drag -------------------------------------------------------------------------------------------
  await load('March 2027');
  {
    const b3 = await band(3), b2 = await band(2), a = await restOn(b3);
    await mouse('mouseMoved', a.layer.x, a.layer.y, 0);
    await mouse('mousePressed', a.layer.x, a.layer.y, 1);
    await sleep(150);
    await mouse('mouseMoved', a.layer.x, b2.rowY, 1);
    await sleep(400);
    const mid = await state();
    await key('Escape', 'Escape', 27, 0);
    await sleep(400);
    await mouse('mouseReleased', a.layer.x, b2.rowY, 0);
    await sleep(600);
    const q = await asked(), after = await state();
    await ctrlZ();
    const next = await state();
    out.H11 = { mid, q, after, next };
    kase('H11', 'Escape mid-drag (at 3/15): back to 3/22, the shield gone, no question; nothing banked',
         mid.by['Spring Break'] === '2027-03-15/1' && mid.shield === true && !q
         && after.by['Spring Break'] === '2027-03-22/1' && after.shield === false && banked0(after, next), out.H11);
  }

  // ---- H12: print -----------------------------------------------------------------------------------------------------------
  await load('March 2027');
  {
    const a = await restOn(await band(3));
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    const p = await ev(`(() => { document.body.classList.add('printing-calendar');
      const L = document.querySelector('.hiatus-drag-layer:not([hidden])'), g = document.querySelector('.hiatus-grip:not([hidden])');
      const r = { shown: !!L, display: L ? getComputedStyle(L).display : null, grip: g ? getComputedStyle(g).display : null,
        inPrintRoot: document.querySelectorAll('#print-root .hiatus-drag-layer, #print-root .hiatus-grip, #print-root .hiatus-drag-shield').length,
        inTableWrap: document.querySelectorAll('#table-wrap .hiatus-drag-layer, #table-wrap .hiatus-grip, #table-wrap .hiatus-drag-shield').length };
      document.body.classList.remove('printing-calendar'); return r; })()`);
    await send('Emulation.setEmulatedMedia', { media: '' });
    out.H12 = { aff: a, print: p };
    kase('H12', 'print media + body.printing-calendar: the shown layer and grip are display:none; none in #print-root or #table-wrap',
         !a.layer.hidden && p.shown === true && p.display === 'none' && p.grip === 'none' && p.inPrintRoot === 0 && p.inTableWrap === 0, out.H12);
  }

  // ---- H13: a band's WATERFALL text style comes with it (MONTH-TEXT-STYLE-PLAN.md §7, step 0) ---------------------------
  // The fixture styles Spring Break's band (2027-03-22) and Post Pause's (2027-05-17|post) italic from the text style bar,
  // which only the waterfall draws. Each is dragged up a row in the month view, then the waterfall is read: the style must
  // be on the band's new week and gone from its old one. Until 27 Oct 2026 rekey() carried hiatusTexts, the name sync,
  // hiatusColors and hiatusFontSize but not textStyle.hiatus, so the band arrived unstyled.
  {
    // Every waterfall band: its week (plus phase), its text, and whether it is italic.
    const wfBands = async () => {
      await ev(`document.getElementById('view-sheet-btn').click(), true`);
      await until(`!!document.querySelector('#table-wrap td.sheet-hiatus-cell')`, 'the waterfall');
      await sleep(300);
      return ev(`Array.from(document.querySelectorAll('#table-wrap td.sheet-hiatus-cell')).map(td => ({
        week: td.dataset.week + (td.dataset.pkey ? '|' + td.dataset.pkey : ''), text: td.textContent.trim(),
        italic: getComputedStyle(td.querySelector('.cell-body') || td).fontStyle === 'italic' }))`);
    };
    const at = (list, wk) => list.filter(b => b.week === wk);
    await load('March 2027');
    const pre = await wfBands();                     // the style shows before any drag (the fixture is read)
    await load('March 2027');
    const b3 = await band(3), b2 = await band(2), a = await restOn(b3);
    await dragPath(a.layer, [[a.layer.x, b2.rowY]]);
    const q = await asked(), kept = await answer('Keep');
    const mvNew = await band(2), mvOld = await band(3);          // the month view's own band style (MONTH-TEXT-STYLE-PLAN.md §4)
    const allWf = await wfBands();
    await load('May 2027');
    const p3 = await band(3), p2 = await band(2), pa = await restOn(p3);
    await dragPath(pa.layer, [[pa.layer.x, p2.rowY]]);
    const after = await state(), pmNew = await band(2);
    const phWf = await wfBands();
    out.H13 = { pre: pre.filter(b => /Spring Break|Post Pause/.test(b.text)), q, kept, mvNew, mvOld, pmNew, allWf: allWf.filter(b => /Spring Break/.test(b.text)), post: after.post, phWf: phWf.filter(b => /Post Pause/.test(b.text)) };
    const sbNew = at(allWf, '2027-03-15'), sbOld = at(allWf, '2027-03-22');
    const ppNew = at(phWf, '2027-05-10|post'), ppOld = at(phWf, '2027-05-17|post');
    kase('H13', "the hiatus drag carries BOTH views' band styles: the waterfall's (italic) and the month's (regular weight, 400), for Spring Break (all-phase) up a row -> its 3/15 band italic in the waterfall, no band on 3/22; Post Pause (a phase's own) up a row -> its 5/10 band italic, none on 5/17",
         at(pre, '2027-03-22')[0]?.italic === true && at(pre, '2027-05-17|post')[0]?.italic === true
         && mvNew.text === 'Spring Break (typed)' && mvNew.wt === '400' && mvOld.none === true && pmNew.text === 'Post Pause' && pmNew.wt === '400'
         && q && kept && sbNew.length === 1 && sbNew[0].italic === true && /Spring Break \(typed\)/.test(sbNew[0].text) && sbOld.length === 0
         && after.post === '2027-05-10/1' && ppNew.length === 1 && ppNew[0].italic === true && ppOld.length === 0, out.H13);
  }
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'hiatusdrag threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`hiatusdrag: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
