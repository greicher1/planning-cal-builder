// hoverchipreal.mjs -- the "Expand?" / "Pull back?" chip takes a REAL click across its whole face (audit AUD2-062,
// item 3.10).
//
//   node hoverchipreal.mjs [--page /dist/index.html] [--port 8239]
//
// Writes hoverchipreal.json ({test, cases:[{id,title,pass}]}) beside this script, judged like wfkeysreal.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG. The defect is HIT-TESTING. The chip sits in the very centre of the outlined box
// (owner, 10 Nov 2026), and over a blank two columns wide that centre is a column boundary, where frozen
// installGridResizers' column handle (.grid-resize.is-col, 7 px wide, full height, z-index 5) sits. The chip was on
// .grid-hover-layer (z-index 1, a stacking context), so the handle won the hit-test at the chip's centre: a real click
// on the word did nothing. t/hoverexpand.js presses the chip with chip.click(), which skips hit-testing, so it could
// not see this. Here every hover and click is CDP's trusted Input.dispatchMouseEvent.
//
// The fix (legacy.css, app.js "The hover prompt"): the chip has its own layer above the handles,
// .grid-hover-chip-layer (z-index 8, as .grid-swap-layer), and the dashed outlines stay at z-index 1, under the
// frozen sticky header. No frozen rule or function changed.
//
//   C1  layout-r13: resting (real pointer) on the blank two columns wide right of Writer's Rm's first weeks shows
//       "Expand?", and a column handle crosses the chip (the precondition the bug needs)
//   C2  ...the chip is the top element at its own centre
//   C3  ...a real click at its centre widens Writer's Rm there, and Undo comes on
//   C4  ...the column handle under the chip still works where the chip is not: with the prompt gone, it is the top
//       element on that boundary further down, and a real drag on it widens the column
//   C5  hover-expand: the same blank the audit used; a real click at the chip's centre widens the phase
//   C6  ...resting on the widened cell offers "Pull back?", on top at its centre, and a real click there pulls it back
//   C7  scrolled under the sticky heading row, the chip still goes under it (its layer is clipped there)
//   E0  no page errors
//
// Fixtures (synthetic, stamped; tools/layout-study/fixtures.mjs): layout-r13, hover-expand.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8239));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8239 ? PORT : ''}-hoverchipreal`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'hoverchipreal.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'hoverchipreal', cases: [] };
setTimeout(() => {
  out.EX = 'hoverchipreal: hit its 240 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 240000).unref();
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
    if (m.method === 'Page.javascriptDialogOpening') { const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } })); }
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
  const clickAt = async (x, y) => { await mouse('mouseMoved', x, y, 0); await mouse('mousePressed', x, y, 1); await mouse('mouseReleased', x, y, 0); };
  // Rest the pointer on a point: arrive a few px short, then on it, then wait past the 200 ms delay.
  const rest = async (x, y) => { await mouse('mouseMoved', 5, 5, 0); await sleep(250); await mouse('mouseMoved', x - 3, y, 0); await sleep(40); await mouse('mouseMoved', x, y, 0); await sleep(500); };
  // The chip on screen: its text, its centre, what is on top there, and which column handles cross it.
  const chip = () => ev(`(() => { const c = document.querySelector('.grid-hover-chip'); if (!c) return null; const r = c.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
    const handles = Array.from(document.querySelectorAll('.grid-resize.is-col')).map(h => h.getBoundingClientRect())
      .filter(h => h.left < r.right && h.right > r.left && h.top < r.bottom && h.bottom > r.top).map(h => Math.round(h.left) + '+' + Math.round(h.width));
    return { text: c.textContent, x, y, box: Math.round(r.left) + '+' + Math.round(r.width), onTop: !!top && (top === c || c.contains(top)),
             topIs: top ? top.tagName + '.' + String(top.className).slice(0, 40) : null, handles }; })()`);
  const wideCells = pk => ev(`Array.from(document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="${pk}"]')).filter(td => (td.colSpan || 1) > 1).length`);
  const undoOn = () => ev(`!document.getElementById('undo-btn').disabled`);

  await send('Page.enable');
  const load = async (state) => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${state}` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`, 'the engine');
    await until(`!!document.querySelector('#table-wrap table.sheet-table td.sheet-phase-cell')`, 'the waterfall');
    await sleep(900);
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(300);
    await ev(`(() => { window.__err = []; window.addEventListener('error', e => window.__err.push(String(e.message))); return 1; })()`);
  };
  // A blank (a bare td) next to the given phase cell, scrolled to the middle of the pane: a point 30% into it.
  const blankBeside = (pk, wk) => ev(`(() => {
    const td = document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="${pk}"][data-week="${wk}"]'); if (!td) return null;
    const bl = td.nextElementSibling; if (!bl || bl.hasAttribute('class') || bl.hasAttribute('style') || bl.textContent.trim()) return { notBlank: true, next: bl ? bl.outerHTML.slice(0, 160) : null };
    bl.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = bl.getBoundingClientRect();
    return { x: r.left + Math.min(r.width * 0.3, 40), y: r.top + r.height / 2, w: r.width, span: bl.colSpan || 1 }; })()`);

  // ---- layout-r13: a blank two columns wide right of Writer's Rm ----
  await load('layout-r13');
  const pk = 'writersRoom', wk = '2031-01-13';   // wk 2 of 1-4, the four weeks with an empty <td colspan=2> beside them
  const b = await blankBeside(pk, wk);
  if (!b || b.notBlank) throw new Error('layout-r13: no blank right of Writer’s Rm on ' + wk + ': ' + JSON.stringify(b));
  const w0 = await wideCells(pk), u0 = await undoOn();
  await rest(b.x, b.y);
  const c1 = await chip();
  out.C1 = { blank: b, chip: c1 };
  kase('C1', 'layout-r13: resting on the two-column blank shows "Expand?", with a column handle crossing the chip',
       !!c1 && /Expand/.test(c1.text) && c1.handles.length > 0, out.C1);
  kase('C2', 'the chip is the top element at its own centre', !!c1 && c1.onTop, { topIs: c1 && c1.topIs, handles: c1 && c1.handles });
  if (c1) { await mouse('mouseMoved', c1.x, c1.y, 0); await sleep(250); const c1b = await chip(); if (c1b) await clickAt(c1b.x, c1b.y); await sleep(800); }
  const w1 = await wideCells(pk), u1 = await undoOn();
  out.C3 = { wideBefore: w0, wideAfter: w1, undoBefore: u0, undoAfter: u1, chipAfter: await chip() };
  kase('C3', 'a real click at the chip’s centre widens Writer’s Rm and turns Undo on', w1 > w0 && u1 && !u0, out.C3);

  // C4: the handle on that boundary still resizes the column away from the chip.
  await mouse('mouseMoved', 5, 5, 0); await sleep(400);
  const hx = c1 && c1.handles.length ? Number(c1.handles[0].split('+')[0]) + Number(c1.handles[0].split('+')[1]) / 2 : null;
  const h4 = hx == null ? null : await ev(`(() => {
    const hs = Array.from(document.querySelectorAll('.grid-resize.is-col')).filter(h => { const r = h.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - ${hx}) < 1.5; });
    if (!hs.length) return null; const h = hs[0], r = h.getBoundingClientRect();
    const pane = document.querySelector('.sheet-scroll').getBoundingClientRect();
    const y = Math.min(r.bottom, pane.bottom) - 60, x = r.left + r.width / 2, top = document.elementFromPoint(x, y);
    const cols = Array.from(document.querySelectorAll('#table-wrap table.sheet-table col')).map(c => c.style.width).join(',');
    return { x, y, onTop: top === h, topIs: top ? top.tagName + '.' + String(top.className).slice(0, 40) : null, cols }; })()`);
  if (h4 && h4.onTop) {
    await mouse('mouseMoved', h4.x, h4.y, 0); await sleep(60);
    await mouse('mousePressed', h4.x, h4.y, 1); await sleep(60);
    for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', h4.x + 5 * i, h4.y, 1); await sleep(30); }
    await mouse('mouseReleased', h4.x + 30, h4.y, 0); await sleep(800);
  }
  const cols4 = await ev(`Array.from(document.querySelectorAll('#table-wrap table.sheet-table col')).map(c => c.style.width).join(',')`);
  out.C4 = { handle: h4, colsAfter: cols4 };
  kase('C4', 'the column handle under the chip still resizes its column where the chip is not',
       !!h4 && h4.onTop && cols4 !== h4.cols, out.C4);

  // ---- hover-expand: the audit's own blank ----
  await load('hover-expand');
  const findBlank = () => ev(`(() => {
    const tds = Array.from(document.querySelectorAll('#table-wrap table.sheet-table tbody td')).filter(td => !td.hasAttribute('class') && !td.hasAttribute('style') && !td.textContent.trim() &&
      ((td.previousElementSibling && td.previousElementSibling.classList.contains('sheet-phase-cell')) || (td.nextElementSibling && td.nextElementSibling.classList.contains('sheet-phase-cell'))));
    const td = tds[0]; if (!td) return null;
    td.scrollIntoView({ block: 'center' }); const r = td.getBoundingClientRect();
    const o = (td.previousElementSibling && td.previousElementSibling.classList.contains('sheet-phase-cell')) ? td.previousElementSibling : td.nextElementSibling;
    return { x: r.left + Math.min(r.width * 0.3, 40), y: r.top + r.height / 2, pk: o.dataset.pkey, wk: o.dataset.week }; })()`);
  const f = await findBlank();
  if (!f) throw new Error('hover-expand: no blank beside a phase');
  const v0 = await wideCells(f.pk);
  await rest(f.x, f.y);
  const c5 = await chip();
  if (c5) { await mouse('mouseMoved', c5.x, c5.y, 0); await sleep(250); const c5b = await chip(); if (c5b) await clickAt(c5b.x, c5b.y); await sleep(800); }
  const v1 = await wideCells(f.pk);
  out.C5 = { blank: f, chip: c5, wideBefore: v0, wideAfter: v1 };
  kase('C5', 'hover-expand: a real click at the centre of "Expand?" widens the phase', !!c5 && /Expand/.test(c5.text) && c5.onTop && v1 > v0, out.C5);

  // C6: rest on the widened cell (75% across it), "Pull back?" on top at its centre, a real click pulls it back.
  const wc = await ev(`(() => { const td = Array.from(document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="${f.pk}"]')).find(t => (t.colSpan || 1) > 1 && t.dataset.week === '${f.wk}')
      || Array.from(document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="${f.pk}"]')).find(t => (t.colSpan || 1) > 1);
    if (!td) return null; td.scrollIntoView({ block: 'center' }); const r = td.getBoundingClientRect(); return { x: r.left + r.width * 0.75, y: r.top + r.height / 2 }; })()`);
  let c6 = null;
  if (wc) {
    await rest(wc.x, wc.y);
    c6 = await chip();
    if (c6) { await mouse('mouseMoved', c6.x, c6.y, 0); await sleep(250); const c6b = await chip(); if (c6b) { c6 = c6b; await clickAt(c6b.x, c6b.y); } await sleep(800); }
  }
  const v2 = await wideCells(f.pk);
  out.C6 = { cell: wc, chip: c6, wideAfter: v2 };
  kase('C6', 'resting on the widened cell offers "Pull back?", on top at its centre; a real click there pulls it back',
       !!c6 && /Pull back/.test(c6.text) && c6.onTop && v2 === v0, out.C6);

  // C7: above the handles now, the chip must still go UNDER the sticky heading row when the pane scrolls it there. A
  // short window, so the pane has the room to scroll the chip that far.
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 640, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
  const f7 = await findBlank();
  await rest(f7.x, f7.y);
  const c7 = await chip();
  let c7after = null;
  if (c7) {
    // Step by step: the title block above the table scrolls away before the heading row sticks.
    await ev(`(async () => { const sc = document.querySelector('.sheet-scroll'), th = sc.querySelector('table.sheet-table thead th');
      for (let i = 0; i < 80; i++) { const c = document.querySelector('.grid-hover-chip'); if (!c) break; const r = c.getBoundingClientRect();
        if (r.top + r.height / 2 < th.getBoundingClientRect().bottom - 4) break;
        sc.scrollTop += 10; await new Promise(res => setTimeout(res, 20)); }
      return sc.scrollTop; })()`);
    await mouse('mouseMoved', f7.x, f7.y - 1, 0);   // the hand still on the grid, no button: what a wheel scroll leaves
    await sleep(400);
    c7after = await ev(`(() => { const c = document.querySelector('.grid-hover-chip'); if (!c) return null; const r = c.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
      const th = document.querySelector('.sheet-scroll table.sheet-table thead th').getBoundingClientRect();
      const sc = document.querySelector('.sheet-scroll');
      return { y, headBottom: th.bottom, pane: [sc.scrollTop, sc.clientHeight, sc.scrollHeight, innerHeight], topIs: top ? top.tagName + '.' + String(top.className).slice(0, 40) : null, chipOnTop: top === c,
               // Off the column handle (which crosses the heading row too): the heading cell is what is there.
               besideIs: (e => e ? e.tagName : null)(document.elementFromPoint(r.left + 6, y)),
               clip: c.parentNode.style.clipPath }; })()`);
  }
  out.C7 = { before: c7, after: c7after };
  kase('C7', 'scrolled under the sticky heading row, the chip goes under it (clipped there, not pressable)',
       !!c7 && !!c7after && c7after.y < c7after.headBottom && !c7after.chipOnTop && c7after.besideIs === 'TH' && /inset/.test(c7after.clip), out.C7);

  out.errors = await ev('window.__err');
  kase('E0', 'no page errors', out.errors.length === 0, { errors: out.errors });
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'hoverchipreal threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`hoverchipreal: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
