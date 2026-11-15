// backuptwowin -- TWO REAL WINDOWS of one Chrome profile: a second SPTCal window is never offered the first one's
// live work, and gets it the moment the first window is gone (audit AUD2-074, item 3.7, 14 Nov 2026).
//
//   node tests/harness/backuptwowin.mjs [--page /dist/index.html] [--port 8233]
//
// The t/ leg backuplive plays "another open window" inside one page (it holds that window's lock itself). This is the
// real thing, cut from the audit's own driver (evidence/c2-twowin-driver.mjs): real Chrome, real IndexedDB (no
// --virtual-time-budget here, so it settles) and real Web Locks, across two page targets of one profile.
//
//   W1  window B, opened while A holds unsaved work, is NOT offered A's work
//   W2  ...and B's file menu does not list it either
//   W3  A closes with its work unsaved: B's file menu, next opened with Enter (a real key over CDP), lists A's backup
//   W4  a window C opened after A closed IS offered A's work (the backup survived its window, and is no longer live)
//   W5  A's backup is still there after all of it (nothing retired it; C was answered Cancel)
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
const STATE = arg('state', 'v1.4.2-saved');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8233 ? PORT : ''}-backuptwowin`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'backuptwowin.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'backuptwowin', cases: [] };
const kase = (id, title, pass, extra) => out.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));
let srv = null, chrome = null;
setTimeout(() => {
  out.EX = 'backuptwowin: hit its 240 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 240000).unref();

// One CDP connection per page target.
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket failed')); });
  let seq = 0; const waiting = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
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
  await send('Page.enable');
  return { ws, send, ev, until };
}
const BOOTED = `!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`;
const MODAL = `(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText)); return m ? m.innerText.replace(/\\s+/g, ' ').slice(0, 240) : null; })()`;
const CANCEL = `(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
  const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`;
const LISTED = `Array.from(document.querySelectorAll('#file-menu [data-backup]')).map(e => e.getAttribute('data-backup'))`;
async function modalWithin(page, ms) {
  for (let t0 = Date.now(); Date.now() - t0 < ms;) { const m = await page.ev(MODAL).catch(() => null); if (m) return m; await sleep(150); }
  return null;
}

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
  const newWindow = async url => (await (await fetch(`http://127.0.0.1:${devPort}/json/new?` + encodeURIComponent(url), { method: 'PUT' })).json());

  // Window A: a calendar, one edit, past the 3 s backup debounce.
  const A = await connect(target.webSocketDebuggerUrl);
  await A.send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${STATE}` });
  await sleep(300);
  await A.until(BOOTED, 'window A');
  await sleep(800);
  await A.ev(`(() => { const e = document.getElementById('weeks-post'); e.value = '23'; e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); return 1; })()`);
  await sleep(4500);
  out.A = await A.ev(`(async () => ({ status: document.getElementById('save-status').textContent, post: document.getElementById('weeks-post').value,
    locks: navigator.locks ? (await navigator.locks.query()).held.map(l => l.name) : null }))()`);

  // Window B: a plain launch of the app while A is open.
  const tB = await newWindow(`http://localhost:${PORT}${PAGE}`);
  const B = await connect(tB.webSocketDebuggerUrl);
  await B.until(BOOTED, 'window B');
  const offeredB = await modalWithin(B, 5000);
  kase('W1', 'window B, opened while A holds unsaved work, is not offered A\'s work', !offeredB, { offered: offeredB, A: out.A });
  if (offeredB) await B.ev(CANCEL);
  await sleep(500);
  const listedB = await B.ev(LISTED);
  kase('W2', '...and B\'s file menu does not list it', Array.isArray(listedB) && listedB.length === 0, { listed: listedB });

  // A closes with its work unsaved (closing a target runs no beforeunload prompt).
  await fetch(`http://127.0.0.1:${devPort}/json/close/${target.id}`);
  try { A.ws.close(); } catch (e) { /* gone */ }
  await sleep(1500);
  // Opened FROM THE KEYBOARD (the 14 Nov 2026 review of item 3.7): focus the button and press a real Enter over CDP. The
  // list used to be redrawn only on a pointerdown on the button, so a menu opened this way listed what was kept at
  // launch; the engine now redraws on every opening (Header.jsx's 'sptcal-file-menu-open').
  await B.send('Page.bringToFront');
  await B.ev(`(() => { const b = document.querySelector('.file-menu-btn'); if (b) b.focus(); return document.activeElement === b; })()`);
  await B.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await B.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(1500);
  const openedB = await B.ev(`document.querySelector('.file-menu-btn').getAttribute('aria-expanded')`);
  const listedB2 = await B.ev(LISTED);
  kase('W3', 'A closed unsaved: B\'s file menu, next opened with Enter, lists A\'s backup', openedB === 'true' && Array.isArray(listedB2) && listedB2.length === 1, { opened: openedB, listed: listedB2 });

  // Window C, after A has gone: offered A's work.
  const tC = await newWindow(`http://localhost:${PORT}${PAGE}`);
  const C = await connect(tC.webSocketDebuggerUrl);
  await C.until(BOOTED, 'window C');
  const offeredC = await modalWithin(C, 8000);
  kase('W4', 'a window opened after A closed IS offered A\'s work', !!offeredC && /unsaved calendar|\.sptcal/.test(offeredC), { offered: offeredC });
  if (offeredC) await C.ev(CANCEL);
  await sleep(1000);
  const keys = await C.ev(`new Promise(res => { const r = indexedDB.open('spt-planning-cal'); r.onsuccess = () => { const st = r.result.transaction('handles', 'readonly').objectStore('handles'); const k = st.getAllKeys(); k.onsuccess = () => res(k.result.map(String).filter(s => s.indexOf('unsavedBackup') === 0)); }; r.onerror = () => res('err'); })`);
  kase('W5', 'A\'s backup is still kept after all of it', Array.isArray(keys) && Array.isArray(listedB2) && keys.indexOf(listedB2[0]) !== -1, { keys });
  try { B.ws.close(); C.ws.close(); } catch (e) { /* gone */ }
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'backuptwowin threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`backuptwowin: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass -> ${OUT}`);
  process.exit(0);
}
