// mvorder.mjs -- MONTH-ORDER-PLAN.md: drag bars and notes up and down in the month view, and the moving copy.
//
//   node mvorder.mjs [--page /dist/index.html] [--port 8231]
//
// Writes mvorder.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges like pilldrag.json.
//
// ⛔ A NODE SCRIPT (CDP), NOT A t/ LEG, for pilldrag's reason: every gesture here is one press, a run of moves and a
// release, and only TRUSTED input (Input.dispatchMouseEvent) hit-tests -- a grip a user cannot reach would pass a
// dispatchEvent() test. Same plumbing as pilldrag.mjs: Node's WebSocket, no dependencies.
//
// Fixtures (synthetic): mvorder.sptcal -- March 2026 has Writer's Rm, Pre Prep (from 3/2) and Prod Prep (from 3/16)
// overlapping, Wed 3/4 carries a waterfall line ("Casting begins 3/4/26") and two own notes ("Table read", "Network
// call"); June 2026 has Production's auto-note "Start Principal Photography 6/29/26".
//
// The phase order (rulings R1, R3; frozen edit E1):
//   O0  setup: March 2026, the week of 3/22 in date order: Writer's Rm, Pre Prep, Prod Prep
//   O1  hovering Prod Prep's bar shows ONE grip: a child of <body>, never in #table-wrap, topmost where it sits, inside
//       the bar's right end (left of the end grip's 10 px)
//   O2  ⭐ its grip dragged to the top: mid-drag a moving copy (body-level, none in #table-wrap) and the order already
//       redrawn; after release Prod Prep, Writer's Rm, Pre Prep, in that week AND the week of 3/16 (one order for the
//       whole calendar, D1); no copy or shield left
//   O3  ONE Ctrl+Z puts date order back; Shift+Ctrl+Z the new order
//   O4  Save writes mvPhaseOrder, top to bottom, every phase named
//   O5  ⭐ the month PDF (the direct writer) stacks them the same way: on the March page, "Prod Prep Week 2" above
//       "Writer's Rm Week 12" above "Pre Prep Week 4"
//   O6  the bar's right-click menu offers "Back to date order"; choosing it restores date order, and a fresh load
//       (no order) does not offer it
//   O7  out and back in ONE gesture: date order, and Save writes no mvPhaseOrder key at all
//   O8  Escape mid-drag: date order, no copy left
// The note places (ruling R2; frozen edit E2):
//   N1  ⭐ "Network call" dragged above the bars: it is the top lane of Wed 3/4, and the week's bars each drop a line;
//       Save writes `top: true` on that entry and nothing else about it
//   N2  "Table read" dragged down past "Network call": the day reads Casting begins, Network call, Table read
//   N3  the waterfall line dragged to the top: Save writes mvWfNotePlace {"Casting begins": {top: true}}
//   N4  ⭐ a place follows its note (D3): June's "Start Principal Photography" dragged on top, then Production's bar
//       dragged a day later: the note reads 6/30/26, sits on Tue 6/30, and is still the top lane there
//   N5  a press on a note that does not move opens its editor, as it always did
//   N6  editing a note that is on top keeps it on top
//   N7  Escape mid note-drag: the day as it was
// The moving copy on the timing drags (owner's second message; R3):
//   G1  a phase's body drag: a copy follows the pointer mid-drag and the start moves a day as it always did; a plain
//       press makes no copy; none after
// A hostile file:
//   H1  a non-array mvPhaseOrder, a "__proto__" key in mvWfNotePlace, `top: "yes"` and a string `top` on a note: the
//       file loads, each is ignored, and Object.prototype is untouched
//   S1  the shareable copy's strip list names the grip, the copy and the shield
//   E0  no exceptions and no console errors
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-mvorder`;
const OUT = path.join(HERE, 'mvorder.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'mvorder', cases: [] };
setTimeout(() => {
  out.EX = 'mvorder: hit its 300 s deadline';
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
    for (let i = 0; i < 40; i++) {
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
  const PH3 = ['writersRoom', 'prePrep', 'prodPrep'];
  // .mv-body's weeks are its children; the week rows of March 2026 are 0 (3/1) .. 4 (3/29).
  const WK = 3;

  // ---- The phase order ----
  await load('mvorder', 'March 2026');
  const r0 = await row(WK);
  kase('O0', 'setup: the week of 3/22 in date order (Writer\'s Rm, Pre Prep, Prod Prep)', JSON.stringify(lanesOf(r0, PH3)) === '[0,1,2]', { lanes: lanesOf(r0, PH3) });
  const g1 = await gripOf(WK, 'prodPrep');
  kase('O1', 'hovering Prod Prep\'s bar shows ONE grip, body-level, topmost, inside the bar\'s right end',
    !!g1.grip && g1.grip.n === 1 && g1.grip.body && g1.grip.top && g1.grip.r <= g1.bar.r - 10 + 0.5 && g1.grip.l > g1.bar.l + g1.bar.w / 2
      && (await chrome0()).inWrap === 0, { grip: g1.grip, bar: g1.bar });
  const mid2 = await gesture(g1.grip.x, g1.grip.y, 0, -(g1.bar.h + 2) * 2.2, async () => ({ c: await chrome0(), r: await row(WK) }));
  const r2 = await row(WK), r2b = await row(WK - 1), c2 = await chrome0();
  kase('O2', 'the grip dragged to the top: a body-level copy mid-drag, the order redrawn live, then Prod Prep, Writer\'s Rm, Pre Prep in the weeks of 3/22 AND 3/16; nothing left behind',
    mid2.c.bodyGhosts === 1 && mid2.c.inWrap === 0 && JSON.stringify(lanesOf(mid2.r, PH3)) === '[1,2,0]'
      && JSON.stringify(lanesOf(r2, PH3)) === '[1,2,0]' && JSON.stringify(lanesOf(r2b, PH3)) === '[1,2,0]' && c2.ghosts === 0 && c2.shields === 0,
    { mid: mid2.c, midLanes: lanesOf(mid2.r, PH3), lanes: lanesOf(r2, PH3), lanes316: lanesOf(r2b, PH3), after: c2 });
  await undo(); await sleep(700);
  const r3u = lanesOf(await row(WK), PH3);
  await redo(); await sleep(700);
  const r3r = lanesOf(await row(WK), PH3);
  kase('O3', 'ONE Ctrl+Z puts date order back; Shift+Ctrl+Z the new order', JSON.stringify(r3u) === '[0,1,2]' && JSON.stringify(r3r) === '[1,2,0]', { undone: r3u, redone: r3r });
  const s4 = await saved();
  kase('O4', 'Save writes mvPhaseOrder, top to bottom, naming every phase on the calendar (the fixture\'s five; Localization has no dates)',
    Array.isArray(s4.mvPhaseOrder) && s4.mvPhaseOrder.slice(0, 3).join() === 'prodPrep,writersRoom,prePrep'
      && s4.mvPhaseOrder.length === 5 && ['production', 'post'].every(k => s4.mvPhaseOrder.includes(k)), { mvPhaseOrder: s4.mvPhaseOrder });
  // O5: the month PDF, through the real Export (Shift+Cmd+E) and the stub's Save.
  await key('e', 'KeyE', 69, 4 | 8);
  let pdfY = null;
  try {
    await until(`window.__files.some(f => /\\.pdf$/i.test(f.name))`, 'the month PDF', 30000);
    const b = Buffer.from(await ev(`window.__files.find(f => /\\.pdf$/i.test(f.name)).b64`), 'base64');
    const str = b.toString('latin1'), re = /stream\r?\n/g;
    let m;
    while ((m = re.exec(str))) {
      const st = m.index + m[0].length, en = str.indexOf('endstream', st);
      let txt = '';
      try { txt = zlib.inflateSync(b.subarray(st, en)).toString('latin1'); } catch (e) { continue; }
      if (!/\(Prod Prep Week 2\) Tj/.test(txt)) continue;
      const y = label => { const k = new RegExp('([\\d.]+) Tm \\(' + label + '\\) Tj').exec(txt); return k ? +k[1] : null; };
      pdfY = { prod: y('Prod Prep Week 2'), writers: y("Writer.s Rm Week 12"), pre: y('Pre Prep Week 4') };
    }
  } catch (e) { pdfY = { error: String(e.message || e) }; }
  kase('O5', 'the month PDF stacks them the same way: Prod Prep Week 2 above Writer\'s Rm Week 12 above Pre Prep Week 4 (PDF y grows upward)',
    !!pdfY && pdfY.prod > pdfY.writers && pdfY.writers > pdfY.pre, { pdfY });
  // O6: Back to date order, from the bar's right-click menu.
  const menuItems = async (wk, ph) => {
    const b = await box(`#table-wrap .mv-week:nth-child(${wk + 1}) .mv-pill[data-ph="${ph}"]`);
    await mouse('mouseMoved', b.l + 30, b.y, 0);
    await mouse('mousePressed', b.l + 30, b.y, 2, { button: 'right' });
    await mouse('mouseReleased', b.l + 30, b.y, 0, { button: 'right' });
    await sleep(400);
    return ev(`Array.from(document.querySelectorAll('.day-menu [role="menuitem"], .day-menu button')).map(e => e.textContent.trim())`);
  };
  const items6 = await menuItems(WK, 'writersRoom');
  await ev(`(() => { const b = Array.from(document.querySelectorAll('.day-menu [role="menuitem"], .day-menu button')).find(e => /Back to date order/.test(e.textContent)); if (b) b.click(); return !!b; })()`);
  await sleep(600);
  const r6 = lanesOf(await row(WK), PH3);
  await load('mvorder', 'March 2026');
  const items6b = await menuItems(WK, 'writersRoom');
  await key('Escape', 'Escape', 27);
  kase('O6', 'the bar\'s menu offers Back to date order, which restores date order; with no order set it is not offered',
    items6.some(t => /Back to date order/.test(t)) && JSON.stringify(r6) === '[0,1,2]' && !items6b.some(t => /Back to date order/.test(t)), { items: items6, lanes: r6, freshItems: items6b });
  // O7: out and back in one gesture.
  await load('mvorder', 'March 2026');
  const g7 = await gripOf(WK, 'prodPrep');
  await mouse('mouseMoved', g7.grip.x, g7.grip.y, 0);
  await mouse('mousePressed', g7.grip.x, g7.grip.y, 1);
  for (let i = 1; i <= 14; i++) { await mouse('mouseMoved', g7.grip.x, g7.grip.y - i * 3, 1); await sleep(30); }
  const mid7 = lanesOf(await row(WK), PH3);
  for (let i = 13; i >= 0; i--) { await mouse('mouseMoved', g7.grip.x, g7.grip.y - i * 3, 1); await sleep(30); }
  await mouse('mouseReleased', g7.grip.x, g7.grip.y, 0);
  await sleep(500);
  const r7 = lanesOf(await row(WK), PH3), s7 = await saved();
  kase('O7', 'out and back in ONE gesture: date order again, and Save writes no mvPhaseOrder key', JSON.stringify(mid7) !== '[0,1,2]' && JSON.stringify(r7) === '[0,1,2]' && !('mvPhaseOrder' in s7),
    { mid: mid7, lanes: r7, keys: Object.keys(s7).filter(k => /^mv/.test(k)) });
  // O8: Escape mid-drag.
  await load('mvorder', 'March 2026');
  const g8 = await gripOf(WK, 'prodPrep');
  await mouse('mouseMoved', g8.grip.x, g8.grip.y, 0);
  await mouse('mousePressed', g8.grip.x, g8.grip.y, 1);
  for (let i = 1; i <= 14; i++) { await mouse('mouseMoved', g8.grip.x, g8.grip.y - i * 3, 1); await sleep(30); }
  const mid8 = lanesOf(await row(WK), PH3);
  await key('Escape', 'Escape', 27);
  await sleep(300);
  await mouse('mouseReleased', g8.grip.x, g8.grip.y - 42, 0);
  await sleep(400);
  const r8 = lanesOf(await row(WK), PH3), c8 = await chrome0();
  kase('O8', 'Escape mid-drag: date order, no copy or shield left', JSON.stringify(mid8) !== '[0,1,2]' && JSON.stringify(r8) === '[0,1,2]' && c8.ghosts === 0 && c8.shields === 0, { mid: mid8, lanes: r8, after: c8 });

  // ---- The note places (week row 0 holds Wed 3/4) ----
  const NOTE = (iso, kind, idx) => `#table-wrap .mv-note-block[data-note-day="${iso}"][data-note-kind="${kind}"]` + (idx == null ? '' : `[data-note-index="${idx}"]`);
  const dayOrder = async (wk, col) => (await row(wk)).filter(b => b.col === col || !b.k.startsWith('note:')).sort((a, b) => a.lane - b.lane);
  await load('mvorder', 'March 2026');
  let n = await box(NOTE('2026-03-04', 'day', 1));
  const mid1 = await gesture(n.x, n.y, 0, -(n.h + 2) * 4.6, async () => ({ c: await chrome0() }));
  const d1 = await dayOrder(0, 3), s1 = await saved();
  const nc = s1.dayNotes['2026-03-04'].find(e => e.text === 'Network call');
  kase('N1', '"Network call" dragged above the bars: the top lane of Wed 3/4, each bar one line lower; Save writes top: true on it',
    mid1.c.bodyGhosts === 1 && mid1.c.inWrap === 0 && d1[0].k === 'note:Network call' && d1[0].lane === 0
      && JSON.stringify(lanesOf(d1, ['writersRoom', 'prePrep'])) === '[1,2]' && !!nc && nc.top === true
      && s1.dayNotes['2026-03-04'].filter(e => e.top).length === 1, { day: d1.map(b => b.k + '@' + b.lane), entry: nc, mid: mid1.c });
  await load('mvorder', 'March 2026');
  n = await box(NOTE('2026-03-04', 'day', 0));
  await gesture(n.x, n.y, 0, (n.h + 2) * 1.7);
  const d2 = (await dayOrder(0, 3)).filter(b => b.k.startsWith('note:')).map(b => b.k.slice(5));
  kase('N2', '"Table read" dragged down past "Network call": Casting begins, Network call, Table read', JSON.stringify(d2) === JSON.stringify(['Casting begins 3/4/26', 'Network call', 'Table read']), { day: d2 });
  await load('mvorder', 'March 2026');
  n = await box(NOTE('2026-03-04', 'wf'));
  await gesture(n.x, n.y, 0, -(n.h + 2) * 2.6);
  const d3 = await dayOrder(0, 3), s3 = await saved();
  kase('N3', 'the waterfall line dragged to the top: Save writes mvWfNotePlace {"Casting begins": {top: true}}',
    d3[0].k === 'note:Casting begins 3/4/26' && d3[0].lane === 0 && JSON.stringify(s3.mvWfNotePlace) === JSON.stringify({ 'Casting begins': { top: true } }),
    { day: d3.map(b => b.k + '@' + b.lane), mvWfNotePlace: s3.mvWfNotePlace });
  // N4: the place follows the note when Production moves.
  await load('mvorder', 'June 2026');
  const JW = 4;
  n = await box(`#table-wrap .mv-week:nth-child(${JW + 1}) .mv-note-block[data-note-kind="wf"][data-note-day="2026-06-29"]`);
  await gesture(n.x, n.y, 0, -(n.h + 2) * 1.6);
  const d4a = (await row(JW)).filter(b => b.col === 1).sort((a, b) => a.lane - b.lane).map(b => b.k + '@' + b.lane);
  const pb = await box(`#table-wrap .mv-week:nth-child(${JW + 1}) .mv-pill[data-ph="production"]`);
  const dayW = await ev(`document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect().width`);
  await gesture(pb.l + Math.min(pb.w / 2, 40), pb.y, dayW, 0);
  const start4 = await ev(`document.getElementById('start-production').value`);
  const d4b = (await row(JW)).filter(b => b.col === 2).sort((a, b) => a.lane - b.lane).map(b => b.k + '@' + b.lane);
  kase('N4', 'a place follows its note: "Start Principal Photography" on top, then Production dragged a day: it reads 6/30/26 on Tue 6/30 and is still the top lane',
    d4a[0] === 'note:Start Principal Photography 6/29/26@0' && start4 === '2026-06-30' && d4b[0] === 'note:Start Principal Photography 6/30/26@0',
    { before: d4a, start: start4, after: d4b });
  // N5: a press that does not move.
  await load('mvorder', 'March 2026');
  n = await box(NOTE('2026-03-18', 'day', 0));
  await mouse('mouseMoved', n.x, n.y, 0);
  await mouse('mousePressed', n.x, n.y, 1); await sleep(60);
  await mouse('mouseReleased', n.x, n.y, 0); await sleep(500);
  const open5 = await ev(`Array.from(document.querySelectorAll('.mv-note-pop')).some(p => p.offsetParent !== null && !!p.querySelector('textarea'))`);
  kase('N5', 'a press on a note that does not move opens its editor', open5 === true);
  await key('Escape', 'Escape', 27); await sleep(300);
  // N6: edit a note that is on top.
  await load('mvorder-notes', 'March 2026');
  n = await box(NOTE('2026-03-04', 'day', 0));
  // ⚠️ Without E2 the note on top is not drawn at all (the 21 Oct mutant): a missing note is a red case, not a crash.
  if (!n) kase('N6', 'editing a note that is on top keeps it on top', false, { missing: 'the note on top is not drawn' });
  else {
    await mouse('mouseMoved', n.x, n.y, 0);
    await mouse('mousePressed', n.x, n.y, 1); await sleep(60);
    await mouse('mouseReleased', n.x, n.y, 0); await sleep(500);
    await ev(`(() => { const t = Array.from(document.querySelectorAll('.mv-note-pop textarea')).find(x => x.offsetParent !== null); t.focus(); t.select(); return true; })()`);
    await send('Input.insertText', { text: 'Table read moved' });
    await key('Tab', 'Tab', 9); await sleep(600);
    const d6 = await dayOrder(0, 3);
    kase('N6', 'editing a note that is on top keeps it on top', d6[0].k === 'note:Table read moved' && d6[0].lane === 0, { day: d6.map(b => b.k + '@' + b.lane) });
  }
  // N7: Escape mid note-drag.
  await load('mvorder', 'March 2026');
  n = await box(NOTE('2026-03-04', 'day', 1));
  await mouse('mouseMoved', n.x, n.y, 0);
  await mouse('mousePressed', n.x, n.y, 1);
  for (let i = 1; i <= 30; i++) { await mouse('mouseMoved', n.x, n.y - i * 3, 1); await sleep(25); }
  const mid7n = (await dayOrder(0, 3))[0].k;
  await key('Escape', 'Escape', 27); await sleep(300);
  await mouse('mouseReleased', n.x, n.y - 90, 0); await sleep(400);
  const d7 = (await dayOrder(0, 3)).map(b => b.k);
  kase('N7', 'Escape mid note-drag: the day as it was', mid7n === 'note:Network call'
    && JSON.stringify(d7) === JSON.stringify(['writersRoom', 'prePrep', 'note:Casting begins 3/4/26', 'note:Table read', 'note:Network call']) && (await chrome0()).ghosts === 0, { mid: mid7n, day: d7 });

  // ---- A hostile file ----
  await load('mvorder-hostile', 'March 2026');
  const h1 = await dayOrder(0, 3), h1o = lanesOf(await row(WK), PH3);
  const proto = await ev(`({}).top === undefined && ({}).at === undefined`);
  kase('H1', 'a file with a non-array order, a "__proto__" place, a "yes" top and a string top on a note: it loads, every one is ignored (date order, notes where they always sat), and no prototype is touched',
    JSON.stringify(h1o) === '[0,1,2]' && proto === true
      && JSON.stringify(h1.map(b => b.k)) === JSON.stringify(['writersRoom', 'prePrep', 'note:Casting begins 3/4/26', 'note:Table read', 'note:Network call']),
    { lanes: h1o, day: h1.map(b => b.k + '@' + b.lane), proto });

  // ---- The moving copy on a timing drag ----
  await load('mvorder', 'March 2026');
  const pp = await box(`#table-wrap .mv-week:nth-child(${WK + 1}) .mv-pill[data-ph="prePrep"]`);
  await mouse('mousePressed', pp.l + 200, pp.y, 1); await sleep(80);
  const press1 = await chrome0();
  await mouse('mouseReleased', pp.l + 200, pp.y, 0); await sleep(300);
  const midG = await gesture(pp.l + 200, pp.y, dayW, 0, async () => ({ c: await chrome0(),
    t: await ev(`(document.querySelector('.mv-drag-ghost') || {}).style ? document.querySelector('.mv-drag-ghost').style.transform : ''`) }));
  const startG = await ev(`document.getElementById('start-prePrep').value`), cG = await chrome0();
  kase('G1', 'a phase\'s body drag: a body-level copy follows the pointer and the start moves a day (3/2 -> 3/3); a plain press makes none; none after',
    press1.ghosts === 0 && midG.c.bodyGhosts === 1 && midG.c.inWrap === 0 && /translate\(/.test(midG.t) && startG === '2026-03-03' && cG.ghosts === 0,
    { press: press1, mid: midG, start: startG, after: cG });
  const src = fs.readFileSync(path.join(ROOT, PAGE.replace(/^\//, '')), 'utf8');
  // Read in the page itself, which the build minifies (the list becomes a template literal), so only the list is matched.
  kase('S1', 'the shareable copy strips the grip, the copy and the shield', /\.hiatus-drag-shield, \.mv-order-grip, \.mv-drag-ghost, \.mv-drag-shield/.test(src));
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
