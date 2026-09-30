// rtleg.mjs -- run one t/<leg>.js in REAL time, over CDP, where run.sh cannot.
//
//   node rtleg.mjs --leg swscope [--state <fixture>] [--page /dist/index.html] [--secs 90]
//
// Writes <leg>.json beside this script, in exactly the shape run.sh + parse.js produce (the leg's
// own T.done() object), so gate.sh judges it with the same block as every other leg.
//
// ⛔ WHY THIS EXISTS (30 Sep 2026). run.sh drives Chrome with --virtual-time-budget, and two things
// do not work under that clock:
//   - A service worker's register() never settles: the page goes idle, virtual time fast-forwards
//     to the end of the budget, and the dump says STILL PENDING (FIX-PLAN 4.2, the `swscope` leg --
//     and why the audit said "the harness can't register a service worker").
//   - A long BLOCKING task costs many times its own length in wall-clock time (11 s of regex took
//     2.5 min), so a leg that proves a freeze red hits run.sh's cap (FIX-PLAN 4.3, `legacyparse`).
// Here the page runs on the real clock; the leg's own sleeps and until()s mean real milliseconds.
//
// Same plumbing as printpaper.mjs: Node 24's built-in WebSocket, no dependencies, and a non-default
// HARNESS_PORT namespaces the Chrome profile as run.sh does. #R ships holding "pending", so this
// waits for JSON. The leg may reload its own page (swscope does): #R is re-read after navigation.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const LEG = arg('leg', '');
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const STATE = arg('state', process.env.HARNESS_STATE || '');
const SECS = Number(arg('secs', 90));
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-rt-${LEG}`;
const OUT = path.join(HERE, LEG + '.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!LEG || !fs.existsSync(path.join(HERE, 't', LEG + '.js'))) { console.error('usage: rtleg.mjs --leg <name>  (no such t/<name>.js)'); process.exit(2); }

let srv = null, chrome = null, out = null;
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
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  await send('Page.enable');
  await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?test=${LEG}${STATE ? '&state=' + STATE : ''}` });
  const t0 = Date.now();
  while (!out && Date.now() - t0 < SECS * 1000) {
    await sleep(250);
    const txt = await evaluate("(document.getElementById('R')||{}).textContent||''").catch(() => '');
    if (txt.trim().startsWith('{')) out = JSON.parse(txt);
  }
  ws.close();
  if (!out) throw new Error(`the ${LEG} leg never reported within ${SECS}s of real time`);
} catch (e) {
  out = { test: LEG, EX: String(e && e.message || e) };
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`rtleg: ${LEG}: ${out.EX ? 'FAILED: ' + out.EX : 'reported'}`);
  process.exit(0);
}
