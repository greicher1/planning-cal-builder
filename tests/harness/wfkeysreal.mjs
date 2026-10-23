// wfkeysreal.mjs -- Excel's editing keys in the waterfall, with TRUSTED input (WATERFALL-KEYS-PLAN.md; owner
// rulings Q1-Q4, 22 Oct 2026). t/wfkeys.js proves the handlers with dispatched events; this proves the chain a
// user's keys and mouse actually go through.
//
//   node wfkeysreal.mjs [--page /dist/index.html]
//
// Writes wfkeysreal.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges like
// hiatusdrag.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG: only CDP's Input domain is TRUSTED input, and the clipboard half cannot be
// proved any other way. ⌘C / ⌘X / ⌘V reach a page only as Chrome's own Copy / Cut / Paste editing commands, with
// nothing selected and nothing editable on the page; a dispatched ClipboardEvent proves the handler and nothing
// about whether the command ever fires it. Here the key event carries the editing command (`commands`), exactly as
// a key binding does, and the result is read off the grid: a copy that never reached the page pastes nothing. It
// writes and reads headless Chrome's own clipboard, which is how R3 shows SPTCal's own data type surviving it.
// ⚠️ Measured 22 Oct 2026: all six pass with the app's beforecopy / beforecut / beforepaste listeners REMOVED
// (Chrome runs these commands even while disabled, so the events always fire). Those listeners are insurance for
// the native Edit menu, which no headless leg can reach.
//
// wfkeys.sptcal (see t/wfkeys.js): 2026-08-03 "Table read" #FFC000; 2026-08-10 two lines; 2026-09-14 "Blocker".
//
//   R1  a real click highlights a note, real ArrowDown / ArrowDown / Shift+ArrowUp move and extend it
//   R2  real ⌘C on a highlighted note, a real click on an empty week, real ⌘V: the note and its colour arrive
//   R3  the colour comes back through the CLIPBOARD: after a reload (the page's memory of the copy is gone), ⌘V
//       still brings it (SPTCal's own data type survived Chrome's clipboard)
//   R4  real ⌘X empties the note; real ⌘V elsewhere puts it there; one real Ctrl+Z takes back only the paste
//   R5  real Delete empties a highlighted note
//   R6  a real mouse drag moves a highlighted note to another week (pointer events from real mouse input,
//       through the shield), and a drop on a week with a note asks first
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8237));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8237 ? PORT : ''}-wfkeysreal`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'wfkeysreal.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'wfkeysreal', cases: [] };
setTimeout(() => {
  out.EX = 'wfkeysreal: hit its 300 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 300000).unref();
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
    // An edit leaves the calendar dirty, so a reload raises "Leave site?" (pilldrag's trap).
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
  // A key press as a key binding sends it. `commands` are Chrome's editing command names (Copy, Cut, Paste), sent
  // with the keyDown exactly as macOS's ⌘C / ⌘X / ⌘V bindings send them.
  const key = async (k, code, vk, modifiers = 0, commands) => {
    await send('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers }, commands ? { commands } : {}));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await sleep(250);
  };
  const META = 4, SHIFT = 8, CTRL = 2;
  const copyKey = () => key('c', 'KeyC', 67, META, ['Copy']);
  const cutKey = () => key('x', 'KeyX', 88, META, ['Cut']);
  const pasteKey = () => key('v', 'KeyV', 86, META, ['Paste']);

  await send('Page.enable');
  const load = async () => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=wfkeys` });
    await sleep(300);
    await until(`!!document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-08-03"]')`, 'the waterfall');
    await sleep(1500);
    // A previous case's edit can leave a crash backup in this profile: decline the recovery question.
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(400);
  };
  // A Notes cell's centre, scrolled to the middle of the grid's pane first; and what it shows.
  const note = wk => ev(`(() => {
    const td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="${wk}"]'); if (!td) return null;
    td.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = td.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2,
             text: td.classList.contains('has-note') ? (td.querySelector('.cell-body') || td).textContent : '',
             bg: getComputedStyle(td).backgroundColor }; })()`);
  const text = async wk => (await note(wk)).text;
  // Which Notes cells the overlay highlights ('*' before the active one).
  const hi = () => ev(`(() => {
    const cells = Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell'));
    return Array.from(document.querySelectorAll('#table-wrap .text-sel-cell')).map(b => {
      const r = b.getBoundingClientRect();
      const c = cells.find(c => { const x = c.getBoundingClientRect(); return Math.abs(x.left - r.left) < 1.5 && Math.abs(x.top - r.top) < 1.5; });
      return (b.classList.contains('is-active') ? '*' : '') + (c ? c.dataset.week : '?'); }).sort(); })()`);
  const click = async p => {
    await mouse('mouseMoved', p.x, p.y, 0); await sleep(60);
    await mouse('mousePressed', p.x, p.y, 1); await sleep(60);
    await mouse('mouseReleased', p.x, p.y, 0); await sleep(300);
  };
  const clickNote = async wk => click(await note(wk));
  const modal = () => ev(`Array.from(document.querySelectorAll('.mantine-Modal-content')).map(d => d.innerText.replace(/\\s+/g, ' ').trim()).join(' || ')`);
  const AMBER = 'rgb(255, 192, 0)';

  // ---- R1: real clicks and arrow keys ---------------------------------------------------------------------------------
  await load();
  {
    await clickNote('2026-08-03');
    const a = await hi();
    await key('ArrowDown', 'ArrowDown', 40);
    const b = await hi();
    await key('ArrowDown', 'ArrowDown', 40);
    await key('ArrowUp', 'ArrowUp', 38, SHIFT);
    const c = await hi();
    out.R1 = { a, b, c };
    kase('R1', 'real click, ArrowDown, ArrowDown, Shift+ArrowUp: 8/3 -> 8/10 -> 8/17, then 8/10..8/17 with 8/17 active',
         JSON.stringify(a) === '["*2026-08-03"]' && JSON.stringify(b) === '["*2026-08-10"]' && JSON.stringify(c) === '["*2026-08-17","2026-08-10"]', out.R1);
  }

  // ---- R2: real Cmd+C / Cmd+V -----------------------------------------------------------------------------------------
  {
    await clickNote('2026-08-03');
    await copyKey();
    await clickNote('2026-10-26');
    await pasteKey();
    const n = await note('2026-10-26');
    out.R2 = n;
    kase('R2', 'real Cmd+C on a highlighted note, a click on an empty week, real Cmd+V: "Table read" arrives, amber', n.text === 'Table read' && n.bg === AMBER, out.R2);
  }

  // ---- R3: the look came through Chrome's clipboard -------------------------------------------------------------------
  await load();
  {
    await clickNote('2026-11-02');
    await pasteKey();
    const n = await note('2026-11-02');
    out.R3 = n;
    kase('R3', 'after a reload (the page\'s own memory of the copy gone), real Cmd+V still brings the colour: SPTCal\'s data crossed the clipboard', n.text === 'Table read' && n.bg === AMBER, out.R3);
  }

  // ---- R4: real Cmd+X, Cmd+V, Ctrl+Z ----------------------------------------------------------------------------------
  await load();
  {
    await clickNote('2026-08-10');
    await cutKey();
    const cut = await text('2026-08-10');
    await clickNote('2026-10-05');
    await pasteKey();
    const pasted = await text('2026-10-05');
    await key('z', 'KeyZ', 90, CTRL); await sleep(700);
    const after = { at105: await text('2026-10-05'), at810: await text('2026-08-10') };
    out.R4 = { cut, pasted, after };
    kase('R4', 'real Cmd+X empties the two-line note, real Cmd+V puts both lines in one week, one Ctrl+Z takes back only the paste',
         cut === '' && pasted === 'Cast fittings\nNetwork call' && after.at105 === '' && after.at810 === '', out.R4);
  }

  // ---- R5: real Delete ------------------------------------------------------------------------------------------------
  await load();
  {
    await clickNote('2026-09-14');
    await key('Delete', 'Delete', 46);
    const t = await text('2026-09-14');
    out.R5 = { t };
    kase('R5', 'real Delete empties the highlighted note', t === '', out.R5);
  }

  // ---- R6: a real mouse drag ------------------------------------------------------------------------------------------
  await load();
  {
    await clickNote('2026-08-03');
    const from = await note('2026-08-03'), to = await ev(`(() => { const td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-08-24"]');
      const r = td.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await mouse('mouseMoved', from.x, from.y, 0); await sleep(60);
    await mouse('mousePressed', from.x, from.y, 1); await sleep(60);
    for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', from.x + (to.x - from.x) * i / 12, from.y + (to.y - from.y) * i / 12, 1); await sleep(30); }
    const mid = await ev(`({ ghost: !!document.querySelector('.mv-drag-ghost'), drops: document.querySelectorAll('#table-wrap .text-sel-drop').length })`);
    await mouse('mouseReleased', to.x, to.y, 0); await sleep(500);
    const moved = { at824: await note('2026-08-24'), at803: await text('2026-08-03') };
    // And onto a week with a note: the question.
    await clickNote('2026-08-24');
    const f2 = await note('2026-08-24'), t2 = await ev(`(() => { const td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-09-14"]');
      const r = td.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await mouse('mouseMoved', f2.x, f2.y, 0); await sleep(60);
    await mouse('mousePressed', f2.x, f2.y, 1); await sleep(60);
    for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', f2.x + (t2.x - f2.x) * i / 12, f2.y + (t2.y - f2.y) * i / 12, 1); await sleep(30); }
    await mouse('mouseReleased', t2.x, t2.y, 0); await sleep(600);
    const q = await modal();
    out.R6 = { mid, moved, q };
    kase('R6', 'a real mouse drag: the ghost and one drop outline mid-drag; 8/3 moves to 8/24, amber; a drop on "Blocker" asks first',
         mid.ghost && mid.drops === 1 && moved.at824.text === 'Table read' && moved.at824.bg === AMBER && moved.at803 === '' &&
         /That week already has a note\. Replace it\?/.test(q), out.R6);
  }
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'wfkeysreal threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`wfkeysreal: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
