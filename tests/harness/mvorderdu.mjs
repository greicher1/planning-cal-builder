// mvorderdu.mjs -- every bar kind takes the month view's reorder grip (owner, 21 Nov 2026: "Ensure all phases of any
// type (including sim post, episodic/block prep, and tandem, can be arranged up and down in any order in the month
// view"). Sim Post has its own leg (mvordersp); this one holds Episodic Prep and Tandem. No frozen edit: the grip
// (installMonthOrderDrag) took Tandem pills in, and the order frozen E1 reads already held prep and the loose
// double-up segment.
//
//   node mvorderdu.mjs [--page /dist/index.html] [--port 8233]
//
// Writes mvorderdu.json beside this script. mvordersp.mjs's plumbing (trusted CDP input), on the synthetic
// doubleups.sptcal, April 2027: row 1 holds Prep 305, Shoot 306 with its JOINED Tandem 306, Shoot 305 and the LOOSE
// (moved) Tandem 303; row 2 Shoot 305 and the last unit's loose Tandem 305.
//   D0  setup: date order; Tandem 305 under Shoot 305 (some loose Tandem under Production), Prep under Production
//   D1  hovering a loose Tandem bar shows the ONE reorder grip, body-level and topmost
//   D2  ⭐ its grip dragged up: Tandem 305 above Shoot 305, and every loose Tandem above every Production bar it shares
//       a day with, in every week (one order for the calendar)
//   D3  ONE undo puts it back; redo brings it back up
//   D4  Save writes mvPhaseOrder with "doubleUp" before "production"
//   D5  the WRITTEN month PDF stacks it the same way: "Tandem 305" above the "Shoot 305" of its week row
//   D6  ⭐ a JOINED Tandem's grip moves the line it rides (Production): dragged below Prep, Production goes under Prep in
//       every week, and Tandem 306 stays on Shoot 306's line (R6)
//   D7  ⭐ Prep's grip dragged above Production: every Prep bar above every Production bar it shares a day with
//   D8  Escape mid-drag on a Tandem: the order back, no copy or shield left
//   E0  no exceptions and no console errors
// Red on the build before (no grip on a Tandem bar).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8233));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8233 ? PORT : ''}-mvorderdu`;
const OUT = path.join(HERE, 'mvorderdu.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'mvorderdu', cases: [] };
setTimeout(() => {
  out.EX = 'mvorderdu: hit its 300 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 300000).unref();
const kase = (id, title, pass, extra) => out.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));
let srv = null, chrome = null;
const errors = [];
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
    // beforeunload guards unsaved work, and every case dirties the calendar: accept, the next case wants a fresh page.
    if (m.method === 'Page.javascriptDialogOpening') {
      const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  const until = async (expr, label, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return; await sleep(100); }
    throw new Error('timed out waiting for ' + label);
  };
  const mouse = (type, x, y, buttons, extra) => send('Input.dispatchMouseEvent', Object.assign(
    { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 }, extra || {}));
  const key = async (k, code, vk, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
  };
  // ⭐ Since audit item 2.11 (AUD2-026, 13 Nov 2026) the month view's Export PDF first asks which months to print
  // (MonthPdfDialog.jsx: All / This month / Range) whenever the calendar has two or more. The release gate went red here
  // waiting for a PDF the open dialog held back. Answer it at its default, All, as cspproof.mjs and t/lib.js do, so the
  // file is the all-months one this leg has always read. (A calendar with one month to print writes with no dialog.)
  const exportMonthPdf = async () => {
    await key('e', 'KeyE', 69, 4 | 8);
    await until(`!!document.querySelector('.month-pdf-dlg [data-pdfdlg="export"]') || (window.__files || []).some(f => /\\.pdf$/i.test(f.name))`,
      'the month Export PDF dialog', 10000).catch(() => {});
    await ev(`(() => { const b = document.querySelector('.month-pdf-dlg [data-pdfdlg="export"]'); if (b) b.click(); return 1; })()`);
  };
  const undo = () => key('z', 'KeyZ', 90, 4);
  const redo = () => key('z', 'KeyZ', 90, 4 | 8);
  await send('Page.enable');
  await send('Runtime.enable');

  // A fresh page on a fixture, in the month view, on `month`.
  const load = async (state, month) => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${state}` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && !!document.getElementById('view-month-btn')`, 'the engine');
    await sleep(800);
    // A previous case's drag left a crash backup in this profile: decline "Recover unsaved work" (setup, not the test).
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(300);
    await ev(`document.getElementById('view-month-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap .mv-monthyear')`, 'the month view');
    for (let i = 0; month && i < 40; i++) {
      if ((await ev(`document.querySelector('#table-wrap .mv-monthyear').textContent.trim()`)) === month) break;
      await ev(`document.getElementById('mv-next').click(), true`);
      await sleep(120);
    }
    await sleep(400);
  };
  // One week row's bars, top to bottom and left to right, as "key@lane": a phase by data-ph, a note by its text.
  const row = async wk => (await ev(`(() => { const w = document.querySelectorAll('#table-wrap .mv-week')[${wk}]; if (!w) return [];
    return Array.from(w.querySelectorAll('.mv-bar:not(.mv-note-add)')).map(b => { const s = b.getAttribute('style') || '';
      const gr = /grid-row:(\\d+)/.exec(s), gc = /grid-column:(\\d+)/.exec(s);
      return { k: b.getAttribute('data-ph') || (b.classList.contains('mv-note-block') ? 'note:' + b.textContent.trim() : 'band'),
               lane: gr ? +gr[1] - 1 : -1, col: gc ? +gc[1] - 1 : -1 }; }); })()`));
  const lanesOf = (r, keys) => keys.map(k => { const b = r.filter(x => x.k === k).sort((a, b) => a.lane - b.lane)[0]; return b ? b.lane : -1; });
  const box = sel => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height, w: r.width }; })()`);
  // A press, a run of moves to (dx, dy) in small steps, a release; `mid` runs before the release.
  const gesture = async (x, y, dx, dy, mid) => {
    await mouse('mouseMoved', x, y, 0);
    await mouse('mousePressed', x, y, 1);
    await sleep(80);
    const n = Math.max(4, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 3));
    for (let i = 1; i <= n; i++) { await mouse('mouseMoved', x + dx * i / n, y + dy * i / n, 1); await sleep(30); }
    await sleep(250);
    const m = mid ? await mid() : null;
    await mouse('mouseReleased', x + dx, y + dy, 0);
    await sleep(450);
    return m;
  };
  const chrome0 = () => ev(`({ ghosts: document.querySelectorAll('.mv-drag-ghost').length, inWrap: document.querySelectorAll('#table-wrap .mv-drag-ghost, #table-wrap .mv-order-grip').length,
    bodyGhosts: Array.from(document.body.children).filter(e => e.classList.contains('mv-drag-ghost')).length, shields: document.querySelectorAll('.mv-drag-shield').length })`);
  // The Save dialog's stand-in (t/lib.js fakeSavePicker's shape): each file written, as base64.
  const STUB = `(() => { window.__files = []; window.showSaveFilePicker = async function (o) {
    const file = { name: o && o.suggestedName, parts: [] };
    return { name: file.name, kind: 'file', createWritable: async () => ({ write: async d => { file.parts.push(d); },
      close: async () => { const b = new Uint8Array(await new Blob(file.parts).arrayBuffer()); let t = '';
        for (let i = 0; i < b.length; i += 0x8000) t += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        window.__files.push({ name: file.name, b64: btoa(t) }); }, abort: async () => {} }) }; }; return true; })()`;
  const saved = async () => {
    await ev(STUB);
    await key('s', 'KeyS', 83, 4);
    await until(`window.__files.some(f => /\\.sptcal$/.test(f.name))`, 'the save', 8000);
    return JSON.parse(Buffer.from(await ev(`window.__files.find(f => /\\.sptcal$/.test(f.name)).b64`), 'base64').toString('utf8'));
  };
  const gripOf = async (wk, ph) => {
    const b = await box(`#table-wrap .mv-week:nth-child(${wk + 1}) .mv-pill[data-ph="${ph}"]`);
    await mouse('mouseMoved', b.l + Math.min(80, b.w / 3), b.y, 0);
    await sleep(200);
    return { bar: b, grip: await ev(`(() => { const g = document.querySelector('.mv-order-grip'); if (!g || g.hidden) return null; const r = g.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, n: document.querySelectorAll('.mv-order-grip').length,
               body: g.parentElement === document.body, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === g }; })()`) };
  };
  // A week's bars top to bottom, each kind once at its topmost lane: phases by data-ph, a Tandem as T<unit id>.
  const order = wk => ev(`(() => { const w = document.querySelectorAll('#table-wrap .mv-week')[${wk}]; if (!w) return '';
    const seen = new Map(); Array.from(w.querySelectorAll('.mv-pill[data-ph]')).forEach(p => {
      const k = p.hasAttribute('data-du') ? 'T' + p.getAttribute('data-du') : p.getAttribute('data-ph');
      const lane = +(/grid-row:(\\d+)/.exec(p.getAttribute('style')) || [0, 0])[1];
      if (!seen.has(k) || lane < seen.get(k)) seen.set(k, lane); });
    return Array.from(seen.entries()).sort((a, b) => a[1] - b[1]).map(e => e[0]).join('>'); })()`);
  // Every week of the month: does each bar of kind A sit above (a lower lane than) each bar of kind B that shares a
  // column with it? kinds: 'loose' (a Tandem not on its episode's line), or a data-ph. Returns [above, below] counts.
  const stack = (A, B) => ev(`(() => { const lane = p => +(/grid-row:(\\d+)/.exec(p.getAttribute('style')) || [0, 0])[1];
    const cols = p => { const m = /grid-column:(\\d+) \\/ (\\d+)/.exec(p.getAttribute('style')) || [0, 0, 0]; const o = []; for (let c = +m[1]; c < +m[2]; c++) o.push(c); return o; };
    const of = (w, k) => Array.from(w.querySelectorAll('.mv-pill[data-ph]')).filter(p => k === 'loose' ? p.hasAttribute('data-du') && !p.hasAttribute('data-du-line')
      : p.getAttribute('data-ph') === k && !p.hasAttribute('data-du'));
    let up = 0, down = 0;
    document.querySelectorAll('#table-wrap .mv-week').forEach(w => of(w, ${JSON.stringify(A)}).forEach(a => of(w, ${JSON.stringify(B)}).forEach(b => {
      if (!cols(a).some(c => cols(b).includes(c))) return; if (lane(a) < lane(b)) up++; else down++; })));
    return [up, down]; })()`);
  const into = async sel => { await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (e) e.scrollIntoView({ block: 'center' }); return !!e; })()`); await sleep(250); };
  const gripOn = async sel => {
    await into(sel);
    const b = await box(sel);
    await mouse('mouseMoved', b.l + Math.min(80, b.w / 2), b.y, 0);
    await sleep(200);
    return { bar: b, grip: await ev(`(() => { const g = document.querySelector('.mv-order-grip'); if (!g || g.hidden) return null; const r = g.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, n: document.querySelectorAll('.mv-order-grip').length, pill: g._pill && g._pill.textContent,
               body: g.parentElement === document.body, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === g }; })()`) };
  };
  const FIX = 'doubleups', MONTH = 'April 2027';
  await load(FIX, MONTH);
  const id305 = await ev(`(() => { const p = Array.from(document.querySelectorAll('#table-wrap .mv-week:nth-child(3) .mv-pill[data-du]')).find(x => /Tandem 305/.test(x.textContent)); return p ? p.getAttribute('data-du') : null; })()`);
  const T5 = `#table-wrap .mv-week:nth-child(3) .mv-pill[data-du="${id305}"]`;
  // (A loose Tandem can start on top where first-fit finds its line free, as Tandem 303 does on its Friday.)
  const o0 = await order(2), s0 = await stack('loose', 'production'), p0 = await stack('episodePrep', 'production');
  kase('D0', 'setup (' + MONTH + '): Tandem 305 under Shoot 305, Prep under Production, date order', !!id305 && o0 === 'production>T' + id305 && s0[1] > 0 && p0[0] === 0 && p0[1] > 0,
    { order: o0, loose: s0, prep: p0, id305 });
  const g1 = await gripOn(T5);
  kase('D1', 'hovering a loose Tandem bar shows ONE grip, body-level and topmost', !!g1.grip && g1.grip.n === 1 && g1.grip.body && g1.grip.top && /Tandem 305/.test(g1.grip.pill), { grip: g1.grip });
  const mid2 = await gesture(g1.grip.x, g1.grip.y, 0, -(g1.bar.h + 2) * 1.4, async () => ({ c: await chrome0() }));
  const o2 = await order(2), s2 = await stack('loose', 'production');
  kase('D2', 'its grip dragged up: a body-level copy mid-drag, then Tandem 305 above Shoot 305 and every loose Tandem above every Production bar beside it',
    mid2.c.bodyGhosts === 1 && mid2.c.inWrap === 0 && o2 === 'T' + id305 + '>production' && s2[1] === 0 && s2[0] > 0, { mid: mid2.c, order: o2, loose: s2 });
  await undo(); await sleep(700);
  const o3u = await order(2);
  await redo(); await sleep(700);
  const o3r = await order(2);
  kase('D3', 'ONE undo puts it back under Shoot 305; redo brings it back up', o3u === o0 && o3r === o2, { undone: o3u, redone: o3r });
  const s4 = await saved();
  const mo = s4.mvPhaseOrder || [];
  kase('D4', 'Save writes mvPhaseOrder with "doubleUp" before "production"', mo.indexOf('doubleUp') >= 0 && mo.indexOf('doubleUp') < mo.indexOf('production'), { mvPhaseOrder: mo });
  // D5: the written month PDF. Every "Tandem 305" label with a "Shoot 305" label of the same week row (within 30 pt)
  // sits ABOVE it (PDF y grows upward).
  const pdfStack = async () => {
    await ev(`window.__files = (window.__files || []).filter(f => !/\\.pdf$/i.test(f.name)), true`);
    await exportMonthPdf();
    await until(`window.__files.some(f => /\\.pdf$/i.test(f.name))`, 'the month PDF', 30000);
    const b = Buffer.from(await ev(`window.__files.find(f => /\\.pdf$/i.test(f.name)).b64`), 'base64');
    const str = b.toString('latin1'), re = /stream\r?\n/g, res = [];
    let m;
    while ((m = re.exec(str))) {
      const st = m.index + m[0].length, en = str.indexOf('endstream', st);
      let txt = '';
      try { txt = zlib.inflateSync(b.subarray(st, en)).toString('latin1'); } catch (e) { continue; }
      const all = lab => Array.from(txt.matchAll(new RegExp('([\\d.]+) ([\\d.]+) Tm \\(' + lab + '\\) Tj', 'g'))).map(k => ({ x: +k[1], y: +k[2] }));
      const ts = all('Tandem 305'), ss = all('Shoot 305');
      ts.forEach(t => ss.filter(s => Math.abs(s.y - t.y) < 30).forEach(s => res.push(t.y > s.y ? 'above' : 'below')));
    }
    return res;
  };
  let p5 = null;
  try { p5 = await pdfStack(); } catch (e) { p5 = { error: String(e.message || e) }; }
  kase('D5', 'the written month PDF: "Tandem 305" above the "Shoot 305" of its week row', Array.isArray(p5) && p5.length > 0 && p5.every(x => x === 'above'), { pdf: p5 });
  // D6: a joined Tandem's grip carries its episode's line.
  await load(FIX, MONTH);
  const id306 = await ev(`(() => { const p = Array.from(document.querySelectorAll('#table-wrap .mv-week:nth-child(2) .mv-pill[data-du]')).find(x => /Tandem 306/.test(x.textContent)); return p ? p.getAttribute('data-du') : null; })()`);
  const T6 = `#table-wrap .mv-week:nth-child(2) .mv-pill[data-du="${id306}"]`;
  const g6 = await gripOn(T6);
  const pr6 = await box(`#table-wrap .mv-week:nth-child(2) .mv-pill[data-ph="episodePrep"]`);
  if (g6.grip) await gesture(g6.grip.x, g6.grip.y, 0, (pr6.b - g6.bar.t) + 4);
  const p6 = await stack('production', 'episodePrep');
  const line6 = await ev(`(() => { const lane = p => +(/grid-row:(\\d+)/.exec(p.getAttribute('style')) || [0, 0])[1]; const w = document.querySelectorAll('#table-wrap .mv-week')[1];
    const t = w.querySelector('.mv-pill[data-du="${id306}"]'), s = Array.from(w.querySelectorAll('.mv-pill[data-ph="production"]')).find(x => /Shoot 306/.test(x.textContent));
    return t && s ? [lane(t), lane(s)] : null; })()`);
  kase('D6', 'a JOINED Tandem\'s grip moves Production: dragged below Prep, every Production bar under every Prep bar beside it, and Tandem 306 still on Shoot 306\'s line',
    !!g6.grip && /Tandem 306/.test(g6.grip.pill) && p6[0] === 0 && p6[1] > 0 && !!line6 && line6[0] === line6[1], { grip: g6.grip, prodVsPrep: p6, line: line6 });
  // D7: Prep's own grip.
  await load(FIX, MONTH);
  const g7 = await gripOn(`#table-wrap .mv-week:nth-child(1) .mv-pill[data-ph="episodePrep"]`);
  const pd7 = await box(`#table-wrap .mv-week:nth-child(1) .mv-pill[data-ph="production"]`);
  if (g7.grip) await gesture(g7.grip.x, g7.grip.y, 0, -(g7.bar.t - pd7.t) - 4);
  const p7 = await stack('episodePrep', 'production');
  kase('D7', 'Prep\'s grip dragged above Production: every Prep bar above every Production bar beside it, in every week', !!g7.grip && p7[1] === 0 && p7[0] > 0, { grip: g7.grip, prep: p7 });
  // D8: Escape mid-drag.
  await load(FIX, MONTH);
  const g8 = await gripOn(T5);
  await mouse('mouseMoved', g8.grip.x, g8.grip.y, 0);
  await mouse('mousePressed', g8.grip.x, g8.grip.y, 1);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', g8.grip.x, g8.grip.y - i * 3, 1); await sleep(30); }
  const mid8 = await order(2);
  await key('Escape', 'Escape', 27);
  await sleep(300);
  await mouse('mouseReleased', g8.grip.x, g8.grip.y - 36, 0);
  await sleep(400);
  const o8 = await order(2), c8 = await chrome0();
  kase('D8', 'Escape mid-drag: Tandem 305 back under Shoot 305, no copy or shield left', mid8 !== o0 && o8 === o0 && c8.ghosts === 0 && c8.shields === 0, { mid: mid8, order: o8, after: c8 });
  kase('E0', 'no exceptions and no console errors', errors.length === 0, { errors });
} catch (e) {
  out.EX = String(e && e.stack || e);
} finally {
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  process.exit(0);
}
