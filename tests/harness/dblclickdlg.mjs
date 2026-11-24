// dblclickdlg.mjs -- a double-clicked button that opens a window leaves it open (audit AUD2-061, item 3.10).
//
//   node dblclickdlg.mjs [--page /dist/index.html] [--port 8238]
//
// Writes dblclickdlg.json ({test, cases:[{id,title,pass}]}) beside this script, judged like wfkeysreal.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG. The defect is HIT-TESTING: the second press of a double-click lands on the
// Mantine Modal's overlay, which the first press's click has just put on screen, and the overlay's click-away
// closes the window inside the same gesture (Export PDF: no PDF, no message; Compare: a flicker). Only CDP's
// Input.dispatchMouseEvent is trusted input with real hit-testing and real click counts; an element.click() or a
// dispatched MouseEvent goes to the element named and never meets the overlay.
//
// The fix (src/chrome/modalGuard.js): every app Modal ignores a click outside it for DOUBLE_CLICK_MS after it opens;
// Escape, Cancel and a later click outside still close it.
//
//   D1  a single click on Export PDF opens its dialog (control), Escape closes it
//   D2  a double-click on Export PDF (70 ms between the clicks) leaves the dialog open
//   D2b ...and its Export then makes exactly one PDF
//   D3  a slow double-click (220 ms) leaves it open
//   D4  a click outside the dialog once it has been up a while still closes it, and nothing is exported
//   D5  New on an edited calendar, double-clicked: its "New calendar" question stays up (the shared Dialogs.jsx)
//   D6  ...and a click outside it later answers Cancel, as before: the calendar stays
//   D7  a single click on Compare (20 scenarios) opens it (control)
//   D8  a double-click on Compare (150 ms) leaves it open
//   D9  a click outside Compare once it has been up a while closes it
//   D10 a single click on ? (bottom right) opens Help (control), Escape closes it
//   D11 a double-click on ? leaves Help open (the same click-away trap: the second press lands on Help's overlay, which
//       covers the ? button)
//   D12 a click outside Help once it has been up a while closes it
//   ⭐ D10-D12 look for the NEW Help (src/help/HelpWindow.jsx, a Mantine Modal of class .help-dlg at zIndex 500, with this
//   same useOutsideCloseGuard) since 24 Nov 2026. They looked for the one-page Guide's #help-overlay, which the new Help
//   replaced (owner's picks 21 Nov 2026, live 23 Nov 2026, README "a new Help: a window…"). With #help-overlay gone, the
//   old helpOpen() threw inside the page and read as "closed", so all three went red on the live build (the 24 Nov
//   trial gate) although Help behaves as they ask. Card gate-legs-behind-main.
//   E0  no page errors
//
// Fixtures (synthetic): hover-expand (the waterfall), scenlist-20 (20 scenarios).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8238));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8238 ? PORT : ''}-dblclickdlg`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'dblclickdlg.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'dblclickdlg', cases: [] };
setTimeout(() => {
  out.EX = 'dblclickdlg: hit its 240 s deadline';
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
    // An edited calendar raises "Leave site?" on the next navigation, and Page.navigate waits on it for ever.
    if (m.method === 'Page.javascriptDialogOpening') { const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } })); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  const until = async (expr, label, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return; await sleep(100); }
    throw new Error('timed out waiting for ' + label);
  };
  const press = (type, x, y, clickCount) => send('Input.dispatchMouseEvent',
    { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount });
  const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  const click = async (x, y) => { await move(x, y); await press('mousePressed', x, y, 1); await press('mouseReleased', x, y, 1); };
  // A real double-click: two presses at one point, the second with clickCount 2, `gap` ms apart.
  const dbl = async (x, y, gap) => {
    await move(x, y);
    await press('mousePressed', x, y, 1); await press('mouseReleased', x, y, 1);
    await sleep(gap);
    await press('mousePressed', x, y, 2); await press('mouseReleased', x, y, 2);
  };
  const esc = async () => {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  };
  // An element's centre, and whether a press there would land on it.
  const pointOf = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y); return { x, y, onTop: !!top && (top === e || e.contains(top)) }; })()`);
  // A point on the overlay: the top-left corner of the window, clear of every dialog's content.
  const OUTSIDE = { x: 12, y: 300 };
  const onOverlay = () => ev(`(() => { const t = document.elementFromPoint(${OUTSIDE.x}, ${OUTSIDE.y}); return !!t && /Overlay/.test(String(t.className)); })()`);
  // Every Mantine Modal on screen, by its title.
  const modals = () => ev(`Array.from(document.querySelectorAll('.mantine-Modal-content')).filter(m => m.getBoundingClientRect().height > 0)
    .map(m => ((m.querySelector('.mantine-Modal-title') || {}).textContent || '').trim())`);
  // A trace of every opening and closing of the PDF dialog, from now on.
  const trace = sel => ev(`(() => { if (window.__mo) window.__mo.disconnect(); window.__tr = [];
    const mo = new MutationObserver(() => { const s = document.querySelector(${JSON.stringify(sel)}) ? 'open' : 'none';
      if (window.__tr[window.__tr.length - 1] !== s) window.__tr.push(s); });
    mo.observe(document.body, { childList: true, subtree: true }); window.__mo = mo; return 1; })()`);

  await send('Page.enable');
  const load = async (state) => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${state}` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`, 'the engine');
    await until(`!!document.querySelector('#table-wrap table.sheet-table td.sheet-phase-cell')`, 'the waterfall');
    await sleep(800);
    // An earlier page of this profile may have left a crash backup: decline "Recover unsaved work" (setup).
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(300);
    // Count what reaches a download: the waterfall PDF is saved through a blob (no File System Access here).
    await ev(`(() => { window.__blobs = []; window.__err = [];
      const oc = URL.createObjectURL; URL.createObjectURL = function (b) { window.__blobs.push((b && b.type) || '?'); return oc.apply(this, arguments); };
      const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (/^blob:/.test(this.href)) return; return ac.apply(this, arguments); };
      if (window.showSaveFilePicker) window.showSaveFilePicker = () => Promise.reject(new DOMException('no', 'AbortError'));
      window.addEventListener('error', e => window.__err.push(String(e.message))); return 1; })()`);
  };
  const pdfOpen = () => ev(`(() => { const d = document.querySelector('.export-pdf-dlg .mantine-Modal-content'); return !!d && d.getBoundingClientRect().height > 0; })()`);

  // ---- Export PDF ----
  await load('hover-expand');
  const pdf = await pointOf('#export-wf-pdf-btn');
  if (!pdf || !pdf.onTop) throw new Error('Export PDF is not pressable: ' + JSON.stringify(pdf));
  await click(pdf.x, pdf.y); await sleep(1000);
  const d1 = await pdfOpen();
  await esc(); await sleep(800);
  kase('D1', 'a single click on Export PDF opens its dialog, Escape closes it', d1 && !(await pdfOpen()), { opened: d1 });

  for (const [id, gap] of [['D2', 70], ['D3', 220]]) {
    await sleep(800);
    await trace('.export-pdf-dlg');
    await dbl(pdf.x, pdf.y, gap); await sleep(1200);
    const r = { gap, trace: await ev('window.__tr.slice()'), open: await pdfOpen(), modals: await modals() };
    out[id] = r;
    kase(id, `a double-click on Export PDF (${gap} ms) leaves its dialog open`, r.open && r.trace.join() === 'open', r);
    if (id === 'D2' && r.open) {
      // ...and its Export makes the one PDF the double-click was for.
      await ev('window.__blobs = []');
      const x = await pointOf('.export-pdf-dlg [data-pdfdlg="export"]');
      await click(x.x, x.y);
      await until(`window.__blobs.length > 0`, 'the PDF', 30000).catch(() => {});
      await sleep(1500);
      out.D2b = { exportOnTop: x.onTop, blobs: await ev('window.__blobs.slice()'), open: await pdfOpen() };
      kase('D2b', '...and its Export button then makes exactly one PDF', x.onTop && out.D2b.blobs.join() === 'application/pdf' && !out.D2b.open, out.D2b);
      await ev('window.__blobs = []');
    } else { await esc(); }
    await sleep(800);
  }

  await sleep(800);
  await click(pdf.x, pdf.y); await sleep(1200);
  const d4open = await pdfOpen(), d4over = await onOverlay();
  await click(OUTSIDE.x, OUTSIDE.y); await sleep(800);
  out.D4 = { openedFirst: d4open, outsideIsOverlay: d4over, openAfter: await pdfOpen(), blobs: await ev('window.__blobs.slice()') };
  kase('D4', 'once the dialog has been up a while, a click outside it still closes it, and nothing is exported',
       d4open && d4over && !out.D4.openAfter && out.D4.blobs.length === 0, out.D4);

  // ---- New on an edited calendar (the shared Dialogs.jsx) ----
  const fwd = await pointOf('#shift-fwd-btn');
  await click(fwd.x, fwd.y); await sleep(1200);           // moves the calendar a week: now there is unsaved work
  const start0 = await ev(`document.getElementById('start-production').value`);
  const nw = await pointOf('#new-file-btn');
  await sleep(800);
  await dbl(nw.x, nw.y, 120); await sleep(1200);
  const d5 = await modals();
  out.D5 = { modals: d5, startProduction: start0 };
  kase('D5', 'New on an edited calendar, double-clicked: the "New calendar" question stays up', d5.includes('New calendar'), out.D5);
  await sleep(600);
  await click(OUTSIDE.x, OUTSIDE.y); await sleep(900);
  out.D6 = { modals: await modals(), startProduction: await ev(`document.getElementById('start-production').value`) };
  kase('D6', 'a click outside the question later answers Cancel: the calendar stays as it was',
       !out.D6.modals.includes('New calendar') && out.D6.startProduction === start0 && !!start0, out.D6);

  // ---- Compare ----
  await load('scenlist-20');
  await ev(`(() => { const b = Array.from(document.querySelectorAll('.sc-strip button')).find(x => x.textContent.trim() === 'Compare');
    if (b) b.setAttribute('data-dbl', 'cmp'); return !!b; })()`);
  const cmp = await pointOf('[data-dbl="cmp"]');
  if (!cmp || !cmp.onTop) throw new Error('Compare is not pressable: ' + JSON.stringify(cmp));
  const cmpOpen = () => ev(`!!document.querySelector('.compare-dlg .sc-compare-table')`);
  await click(cmp.x, cmp.y); await sleep(1200);
  const d7 = await cmpOpen();
  await esc(); await sleep(900);
  kase('D7', 'a single click on Compare opens it (control)', d7 && !(await cmpOpen()), { opened: d7 });
  await sleep(800);
  await trace('.compare-dlg .sc-compare-table');
  await dbl(cmp.x, cmp.y, 150); await sleep(1500);
  out.D8 = { trace: await ev('window.__tr.slice()'), open: await cmpOpen() };
  kase('D8', 'a double-click on Compare (150 ms) leaves it open', out.D8.open && out.D8.trace.join() === 'open', out.D8);
  await sleep(400);
  const d9over = await onOverlay();
  await click(OUTSIDE.x, OUTSIDE.y); await sleep(900);
  out.D9 = { outsideIsOverlay: d9over, openAfter: await cmpOpen() };
  kase('D9', 'a click outside Compare once it has been up a while closes it', d9over && !out.D9.openAfter, out.D9);

  // ---- Help (the ? button bottom right): a Mantine Modal since 21 Nov 2026 (.help-dlg), with the same guard ----
  // Open = its window is on screen. Help renders nothing while closed (HelpWindow returns null), so a missing
  // .help-dlg is a real "closed", never a selector that throws (the old #help-overlay check did, and read as closed).
  const helpOpen = () => ev(`(() => { const d = document.querySelector('.help-dlg .mantine-Modal-content');
    return !!d && d.getBoundingClientRect().height > 0; })()`);
  // What a press on ? meets while Help is up: its overlay (the trap D11 is about), or the button itself.
  const topAt = p => ev(`(() => { const t = document.elementFromPoint(${p.x}, ${p.y}); return t ? (t.id || String(t.className).slice(0, 80)) : null; })()`);
  const fab = await pointOf('#help-fab');
  await click(fab.x, fab.y); await sleep(700);
  const d10 = await helpOpen();
  await esc(); await sleep(500);
  kase('D10', 'a single click on ? opens Help (control), Escape closes it', d10 && !(await helpOpen()), { opened: d10 });
  await sleep(700);
  await dbl(fab.x, fab.y, 150); await sleep(900);
  // fabCoveredBy: what sits on the ? button now Help is up, i.e. what the double-click's second press met (recorded, not
  // judged: a mutant without the guard is what proves D11 can fail, 24 Nov 2026).
  out.D11 = { open: await helpOpen(), fabCoveredBy: await topAt(fab) };
  kase('D11', 'a double-click on ? leaves Help open', out.D11.open, out.D11);
  await sleep(400);
  await click(OUTSIDE.x, OUTSIDE.y); await sleep(600);
  out.D12 = { openAfter: await helpOpen() };
  kase('D12', 'a click outside Help once it has been up a while closes it', out.D11.open && !out.D12.openAfter, out.D12);

  out.errors = await ev('window.__err');
  kase('E0', 'no page errors', out.errors.length === 0, { errors: out.errors });
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'dblclickdlg threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`dblclickdlg: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
