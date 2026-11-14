// xleg.mjs -- run ONE t/<leg>.js on any OS (Windows, macOS, Linux) in headless Chrome, on the REAL clock, over CDP.
//
//   node xleg.mjs --leg <name> [--state <fixture>] [--query k=v&...] [--page /dist/index.html] [--secs 120]
//                 [--out <dir>] [--name <out-name>] [--window W,H] [--scale 1.25] [--tz Area/City]
//                 [--shot <file.png>] [--port N] [--deadline <s>]
//
// Node 22 or later, no dependencies, no shell: the cross-platform twin of run.sh + parse.js (and of rtleg.mjs, whose
// plumbing it follows). Written for the Windows test runner (WINDOWS.md); it changes nothing the gate runs.
//
// What it does: starts srv.js on --port (else HARNESS_PORT, else a free port), launches Chrome with the flags run.sh
// uses (--headless=new --disable-gpu --no-sandbox, a fresh profile under os.tmpdir(), --window-size, plus
// --force-device-scale-factor for --scale), reads DevToolsActivePort, opens <page>?test=<leg>[&state=][&query], waits
// on the REAL clock for the leg's JSON in #R, and writes:
//   <out>/<name>.json        the leg's T.done() object, base64 exports replaced by "<written to ...>" (as parse.js)
//   <out>/<name>.xlsx|.pdf|.sptcal, <out>/<name>.<k>.pdf   the exported files, split out exactly as parse.js does
//   <out>/<name>.xleg.json   how it ran: arguments, wall time, Chrome's version and user agent, and the page's
//                            environment (navigator.platform, devicePixelRatio, scrollbar width, document.fonts)
// <name> defaults to the leg's name. --out defaults to this directory, as run.sh's outputs do.
//
// ⚠️ REAL CLOCK, NOT run.sh's VIRTUAL ONE. A leg's T.sleep() and T.until() mean real milliseconds here, and --secs is
// a real budget. Legs that wait out the app's own long timers (the 10-minute autosave) cannot run this way; see
// WINDOWS.md for the list left out.
//
// TRUSTED INPUT HOOK (for the win-* legs). Before the page loads, window.__XLEG is set to {platform, runner:'xleg'}.
// A leg that needs a real key press or mouse event sets
//     window.__XREQ = {id: <number>, steps: [...]}
// and waits until window.__XACK === id (window.__XRES then holds {id, ok, err}). This runner polls for it every
// 100 ms and performs the steps with CDP Input.* (trusted events, isTrusted true), in order:
//     {key: 'z', code: 'KeyZ', keyCode: 90, mods: ['ctrl'|'meta'|'shift'|'alt']}   rawKeyDown + keyUp
//     {text: 'abc'}                                                                Input.insertText
//     {click: [x, y], mods: [...], button: 'left'|'right', count: 1}               press + release
//     {move: [x, y]}                                                               mouseMoved (a hover)
//     {wheel: [x, y], dy: 120}                                                     mouseWheel
//     {wait: ms}
// Under run.sh (no runner) window.__XLEG is undefined, so a leg can say "needs xleg" instead of hanging.
//
// A HANG MUST REPORT, NEVER BLOCK: after --deadline seconds (default --secs + 60) the Chrome tree and the server are
// killed, an {test, EX} result is written, and the script exits 0. It always exits 0; read the JSON.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const LEG = arg('leg', '');
const NAME = arg('name', LEG);
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const STATE = arg('state', process.env.HARNESS_STATE || '');
const QUERY = arg('query', process.env.HARNESS_QUERY || '');
const SECS = Number(arg('secs', 120));
const OUTDIR = path.resolve(arg('out', HERE));
const WINDOW = arg('window', process.env.HARNESS_WINDOW || '1600,1200');
const SCALE = arg('scale', '');
const TZ = arg('tz', '');
const SHOT = arg('shot', '');
const DEADLINE_S = Number(arg('deadline', SECS + 60));
const IS_WIN = process.platform === 'win32';
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!LEG || !/^[\w.-]+$/.test(LEG) || !fs.existsSync(path.join(HERE, 't', LEG + '.js'))) {
  console.error('usage: xleg.mjs --leg <name>   (no such t/<name>.js)'); process.exit(2);
}
if (!/^[\w.@+-]+$/.test(NAME)) { console.error('xleg: --name may hold only letters, digits and . _ @ + -'); process.exit(2); }
fs.mkdirSync(OUTDIR, { recursive: true });
const OUT = path.join(OUTDIR, NAME + '.json');
const SIDE = path.join(OUTDIR, NAME + '.xleg.json');

// ---- Chrome: the CHROME env var, else the platform default ----------------------------------------------------
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const c = [];
  if (process.platform === 'darwin') c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  else if (IS_WIN) {
    for (const v of ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA']) {
      if (process.env[v]) c.push(path.join(process.env[v], 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    c.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe');
  } else {
    for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
      for (const d of (process.env.PATH || '').split(path.delimiter)) if (d) c.push(path.join(d, n));
    }
  }
  return c.find(p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }) || c[0] || 'chrome';
}
const CHROME = findChrome();

// ---- killing a process TREE on every OS (no pkill) ---------------------------------------------------------------
function killTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (IS_WIN) {
    try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) { /* gone */ }
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { /* not a group leader, or gone */ }
  }
  try { child.kill('SIGKILL'); } catch (e) { /* gone */ }
}
// Anything still holding this profile (a helper that left the group): POSIX only, read from ps, no pkill.
function killProfileStragglers(profile) {
  if (IS_WIN || !profile) return;
  let lines = [];
  try { lines = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n'); } catch (e) { return; }
  const needle = 'user-data-dir=' + profile;
  for (const l of lines) {
    const m = l.trim().match(/^(\d+)\s+(.*)$/);
    if (m && (m[2].includes(needle + ' ') || m[2].endsWith(needle)) && Number(m[1]) !== process.pid) {
      try { process.kill(Number(m[1]), 'SIGKILL'); } catch (e) { /* gone */ }
    }
  }
}
const pauseSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function removeProfile(profile) {
  if (!profile) return;
  // macOS: Chrome puts its SingletonSocket in a directory of its own and links to it; remove it while it holds only that.
  let sock = '';
  try { sock = fs.readlinkSync(path.join(profile, 'SingletonSocket')); } catch (e) { /* none */ }
  if (sock) {
    const dir = path.dirname(sock);
    let held = [];
    try { held = fs.readdirSync(dir); } catch (e) { /* gone */ }
    if (held.length && held.every(n => n === 'SingletonSocket' || n === 'SingletonCookie')) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* best effort */ } }
  }
  // Windows holds files for a moment after taskkill: retry.
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); return; } catch (e) { pauseSync(300); }
  }
}

let srv = null, chrome = null, profile = '', finished = false;
const t0 = Date.now();
const side = { leg: LEG, name: NAME, state: STATE || null, query: QUERY || null, page: PAGE, secs: SECS, window: WINDOW,
  scale: SCALE || null, tz: TZ || null, os: { platform: process.platform, release: os.release(), arch: process.arch }, node: process.version,
  chromePath: CHROME, chrome: null, env: null, ms: null, result: null, shot: null };

function cleanup() {
  killTree(chrome); killProfileStragglers(profile); killTree(srv);
  removeProfile(profile);
}
function finish(out, why) {
  if (finished) return; finished = true;
  try { cleanup(); } catch (e) { /* best effort */ }
  side.ms = Date.now() - t0;
  side.result = out.EX ? 'EX' : 'reported';
  writeResult(out);
  fs.writeFileSync(SIDE, JSON.stringify(side, null, 1));
  console.error(`xleg: ${NAME}: ${out.EX ? 'FAILED: ' + out.EX : 'reported'} (${(side.ms / 1000).toFixed(1)} s${why ? ', ' + why : ''})`);
  process.exit(0);
}
// parse.js's split, repeated (parse.js reads a --dump-dom capture; here the JSON comes straight from #R).
function writeResult(o) {
  for (const f of fs.readdirSync(OUTDIR)) {        // a run that writes nothing must not inherit the last one's files
    if (f.startsWith(NAME + '.') && /\.(xlsx|pdf|sptcal)$/.test(f) && f.slice(NAME.length + 1).split('.').length <= 2) fs.rmSync(path.join(OUTDIR, f), { force: true });
  }
  for (const k of Object.keys(o)) {
    if (/^(xlsx|pdf|sptcal)$/.test(k) && typeof o[k] === 'string') {
      fs.writeFileSync(path.join(OUTDIR, NAME + '.' + k), Buffer.from(o[k], 'base64'));
      o[k] = '<written to ' + NAME + '.' + k + '>';
    }
    if (k === 'pdfs' && o[k] && typeof o[k] === 'object') {
      for (const n of Object.keys(o[k])) {
        if (!/^[\w-]+$/.test(n) || typeof o[k][n] !== 'string') continue;
        fs.writeFileSync(path.join(OUTDIR, NAME + '.' + n + '.pdf'), Buffer.from(o[k][n], 'base64'));
        o[k][n] = '<written to ' + NAME + '.' + n + '.pdf>';
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(o, null, 1));
}

setTimeout(() => finish({ test: LEG, EX: `xleg: ${LEG}: hit its ${DEADLINE_S} s deadline` }, 'deadline'), DEADLINE_S * 1000).unref();
for (const [sig, n] of [['SIGINT', 2], ['SIGTERM', 15]]) process.on(sig, () => { try { cleanup(); } catch (e) { /* */ } process.exit(128 + n); });

function freePort() {
  return new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}

const MODS = { alt: 1, ctrl: 2, meta: 4, shift: 8 };
const modBits = m => (m || []).reduce((a, k) => a | (MODS[k] || 0), 0);

let out = null;
try {
  fs.rmSync(OUT, { force: true }); fs.rmSync(SIDE, { force: true });
  const PORT = Number(arg('port', process.env.HARNESS_PORT || 0)) || await freePort();
  srv = spawn(process.execPath, [path.join(HERE, 'srv.js'), String(PORT), ROOT, path.join(HERE, 't')], { stdio: ['ignore', 'pipe', 'ignore'], detached: !IS_WIN, windowsHide: true });
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('srv.js did not start on ' + PORT)), 10000);
    srv.stdout.on('data', d => { if (String(d).includes('listening')) { clearTimeout(to); res(); } });
    srv.on('exit', c => { clearTimeout(to); rej(new Error('srv.js exited ' + c + ' (port ' + PORT + ' in use?)')); });
  });
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'xleg-'));
  const flags = ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-features=MacAppCodeSignClone',
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--window-size=${WINDOW}`, '--remote-debugging-port=0'];
  if (SCALE) flags.push(`--force-device-scale-factor=${SCALE}`);
  flags.push('about:blank');
  chrome = spawn(CHROME, flags, { stdio: 'ignore', detached: !IS_WIN, windowsHide: true });
  chrome.on('error', e => finish({ test: LEG, EX: 'Chrome did not start: ' + e.message + ' (' + CHROME + '; set CHROME=)' }));
  let devPort = 0;
  for (let i = 0; i < 300 && !devPort; i++) {
    await sleep(100);
    try { devPort = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (e) { /* not yet */ }
  }
  if (!devPort) throw new Error('Chrome never wrote DevToolsActivePort (' + CHROME + ')');
  try { side.chrome = await (await fetch(`http://127.0.0.1:${devPort}/json/version`)).json(); } catch (e) { /* reported below */ }
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
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
  ws.onclose = () => { for (const p of waiting.values()) p.rej(new Error('CDP socket closed')); waiting.clear(); };
  // Every call carries its own timeout, so a Chrome that stops answering cannot hold this script.
  const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
    const id = ++seq; const to = setTimeout(() => { waiting.delete(id); rej(new Error(method + ' timed out')); }, ms);
    waiting.set(id, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expr, ms) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ms);
    if (r.exceptionDetails) throw new Error('evaluate: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  };
  await send('Page.enable');
  // A headless page does not always count as focused (it did not on a hosted Windows runner), and the app reads
  // document.hasFocus(): a date box is left as typed while "the window lost focus". Emulate a focused page, as a
  // user's window is, unless XLEG_FOCUS=off (which shows what the unfocused page does).
  if (process.env.XLEG_FOCUS !== 'off') await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  if (TZ) await send('Emulation.setTimezoneOverride', { timezoneId: TZ });
  // Nothing a leg exports may land in the runner's Downloads folder (legs capture exports in the page).
  await send('Page.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__XLEG = ${JSON.stringify({ platform: process.platform, runner: 'xleg' })};` });
  const url = `http://localhost:${PORT}${PAGE}?test=${LEG}${STATE ? '&state=' + STATE : ''}${QUERY ? '&' + QUERY : ''}`;
  await send('Page.navigate', { url });

  async function perform(steps) {
    for (const s of steps || []) {
      if (s.wait) { await sleep(Number(s.wait)); continue; }
      if (s.key) {
        const base = { modifiers: modBits(s.mods), key: s.key, code: s.code || '', windowsVirtualKeyCode: s.keyCode || 0, nativeVirtualKeyCode: s.keyCode || 0 };
        await send('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, base));
        await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
        continue;
      }
      if (s.text != null) { await send('Input.insertText', { text: String(s.text) }); continue; }
      if (s.move) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: s.move[0], y: s.move[1], modifiers: modBits(s.mods) }); continue; }
      if (s.wheel) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: s.wheel[0], y: s.wheel[1], deltaX: 0, deltaY: s.dy || 120, modifiers: modBits(s.mods) }); continue; }
      if (s.click) {
        const p = { x: s.click[0], y: s.click[1], modifiers: modBits(s.mods), button: s.button || 'left', clickCount: s.count || 1 };
        await send('Input.dispatchMouseEvent', Object.assign({ type: 'mouseMoved' }, p, { button: 'none', clickCount: 0 }));
        await send('Input.dispatchMouseEvent', Object.assign({ type: 'mousePressed' }, p));
        await send('Input.dispatchMouseEvent', Object.assign({ type: 'mouseReleased' }, p));
        continue;
      }
      throw new Error('unknown step ' + JSON.stringify(s));
    }
  }

  const t1 = Date.now();
  let lastAck = null;
  while (!out && Date.now() - t1 < SECS * 1000) {
    await sleep(100);
    let head = '';
    try {
      head = await evaluate("(function(){var r=document.getElementById('R'),t=(r&&r.textContent)||'';" +
        "var q=window.__XREQ;if(q&&q.id!==window.__XACK)return 'X'+JSON.stringify(q);return t.trim().charAt(0);})()", 15000);
    } catch (e) { continue; }   // mid-navigation: the leg may reload its own page
    if (head && head[0] === 'X') {
      const req = JSON.parse(head.slice(1));
      if (req.id === lastAck) continue;
      let res = { id: req.id, ok: true, err: null };
      try { await perform(req.steps); } catch (e) { res = { id: req.id, ok: false, err: String(e.message || e) }; }
      lastAck = req.id;
      await evaluate(`window.__XRES=${JSON.stringify(res)};window.__XACK=${JSON.stringify(req.id)};true`).catch(() => {});
      continue;
    }
    if (head === '{') out = JSON.parse(await evaluate("document.getElementById('R').textContent", 60000));
  }
  if (!out) throw new Error(`the ${LEG} leg never reported within ${SECS}s of real time`);
  // The page's environment, read once the leg is done (it cannot disturb the leg).
  side.env = await evaluate(`(function(){
    var d=document.createElement('div'); d.style.cssText='position:absolute;top:-999px;left:-999px;width:100px;height:100px;overflow:scroll';
    document.body.appendChild(d); var sbw=d.offsetWidth-d.clientWidth, sbh=d.offsetHeight-d.clientHeight; d.remove();
    var faces=[]; try{ document.fonts.forEach(function(f){ faces.push(f.family.replace(/["']/g,'')+' '+f.weight+' '+f.status); }); }catch(e){}
    return {platform:navigator.platform, uaPlatform:(navigator.userAgentData&&navigator.userAgentData.platform)||null, userAgent:navigator.userAgent,
      dpr:devicePixelRatio, inner:[innerWidth,innerHeight], outer:[outerWidth,outerHeight], screen:[screen.width,screen.height],
      scrollbar:[sbw,sbh], fontsStatus:document.fonts.status, fontFaces:faces, tz:Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale:navigator.language, href:location.pathname+location.search};
  })()`).catch(e => ({ error: String(e.message || e) }));
  if (SHOT) {
    try {
      const lm = await send('Page.getLayoutMetrics');
      const cs = lm.cssContentSize || lm.contentSize;
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 } }, 60000);
      const sp = path.resolve(SHOT); fs.mkdirSync(path.dirname(sp), { recursive: true });
      fs.writeFileSync(sp, Buffer.from(shot.data, 'base64')); side.shot = sp;
    } catch (e) { side.shot = 'failed: ' + (e.message || e); }
  }
  try { ws.close(); } catch (e) { /* */ }
} catch (e) {
  out = { test: LEG, EX: String(e && e.message || e) };
}
finish(out);
