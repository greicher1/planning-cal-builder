// probe-file-handling.mjs -- MEASURES what double-click-to-open depends on and no harness leg can see.
//
//   node tools/probe-file-handling.mjs        (about 30 s; prints one line per step, exits 1 on a miss)
//
// The `launchopen` leg proves everything AFTER Chrome hands the app a file. It cannot see the
// handover itself: headless Chrome never produces an installed app window (PWA-ONLY-PLAN M10), and
// the leg replaces window.launchQueue. This probe asks the BROWSER, over CDP:
//   P1  an app installed from the manifest WITHOUT file_handlers has none (the baseline);
//   P2  serving the manifest WITH them, then loading the page, registers .sptcal -- a silent update,
//       no reinstall -- with the relative action resolved against the page (Chrome 146+, data: manifest);
//   P3  the installed identity did not move (Page.getAppId), which is the thing every install rides on;
//   P4  an ordinary launch calls the consumer with NO files;
//   P5  a file launched while the app is open reaches THAT window (launch_handler focus-existing),
//       with no reload;
//   P6  two files arrive as ONE call (launch_type single-client).
// Measured 1 Oct 2026, Chrome 154.0.8037.92: all six held, and the launched handle reported read AND
// readwrite 'granted' (Chromium's launch_params.h says read-only by default -- so the app asks rather
// than assumes; see openRecentFile's needsWrite).
//
// ⛔ SAFETY. A throwaway headless profile in the OS temp directory, deleted at the end; the app is
// named ProbeCal, NEVER SPTCal -- a headful install writes an app shim into ~/Applications/Chrome Apps,
// where the owner's real SPTCal.app lives (PWA-ONLY-PLAN §3). Headless writes no shim. The page is a
// stand-in served from localhost carrying the build's REAL manifest (renamed); the app is not loaded.
// ⚠️ PWA.install is refused over --remote-debugging-port and works over --remote-debugging-pipe.
// The app window is not attachable over CDP in headless, so the page reports to this server instead.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PROBE_PORT || 8521);
const APP = `http://localhost:${PORT}/probe/`;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probecal-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let misses = 0;
const verdict = (id, ok, what, seen) => { if (!ok) misses++; console.log(`${ok ? 'PASS' : 'MISS'}  ${id}  ${what}  ${JSON.stringify(seen)}`); };

// The build's own manifest, renamed. P1 serves it without file_handlers (an install from before).
const src = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
const real = JSON.parse(decodeURIComponent(src.match(/<link rel="manifest" href="data:application\/manifest\+json,([^"]+)"/)[1]));
if (!real.file_handlers) { console.error('src/index.html has no file_handlers -- nothing to probe'); process.exit(2); }
const after = { ...real, name: 'ProbeCal', short_name: 'ProbeCal', related_applications: [{ platform: 'webapp', id: APP }] };
const before = { ...after }; delete before.file_handlers;
let served = before;

const page = man => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; manifest-src data:; img-src data:">
<title>ProbeCal</title><link rel="manifest" href="data:application/manifest+json,${encodeURIComponent(JSON.stringify(man))}">
</head><body><script>
const pid = Math.random().toString(36).slice(2, 7);
const rep = o => fetch('/report', { method: 'POST', body: JSON.stringify(Object.assign({ pid }, o)) });
rep({ ev: 'load' });
if ('launchQueue' in window) launchQueue.setConsumer(async p => {
  const files = [];
  for (const f of p.files) files.push({ name: f.name, read: await f.queryPermission({ mode: 'read' }),
    readwrite: await f.queryPermission({ mode: 'readwrite' }), bytes: (await (await f.getFile()).text()).length });
  rep({ ev: 'launch', n: p.files.length, files });
});
</script></body></html>`;
const reports = [];
const server = http.createServer((req, res) => {
  if (req.url === '/report') { let b = ''; req.on('data', d => b += d); req.on('end', () => { reports.push(JSON.parse(b)); res.end('ok'); }); return; }
  if (req.url.startsWith('/probe/')) { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page(served)); return; }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(PORT, r));

const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${path.join(TMP, 'profile')}`,
  '--no-first-run', '--no-default-browser-check', '--disable-sync', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let nextId = 1, buf = '';
const pending = new Map();
chrome.stdio[4].on('data', d => {
  buf += d.toString(); let i;
  while ((i = buf.indexOf('\0')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } }
});
const send = (method, params = {}, sessionId) => new Promise(resolve => {
  const id = nextId++, t = setTimeout(() => { pending.delete(id); resolve({ error: { message: 'TIMEOUT ' + method } }); }, 30000);
  pending.set(id, m => { clearTimeout(t); resolve(m); });
  chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
});
const handlers = async manifestId => ((await send('PWA.getOsAppState', { manifestId })).result || {}).fileHandlers;
const since = n => reports.slice(n);

try {
  console.log('chrome', ((await send('Browser.getVersion')).result || {}).product);
  const tab = (await send('Target.getTargets')).result.targetInfos.find(t => t.type === 'page');
  const sid = (await send('Target.attachToTarget', { targetId: tab.targetId, flatten: true })).result.sessionId;
  await send('Page.navigate', { url: APP }, sid); await sleep(2000);
  const id0 = ((await send('Page.getAppId', {}, sid)).result || {}).appId;
  const inst = await send('PWA.install', { manifestId: id0 }, sid);
  if (inst.error) throw new Error('PWA.install: ' + inst.error.message);
  await sleep(1500);
  const h1 = await handlers(id0);
  verdict('P1', Array.isArray(h1) && h1.length === 0, 'installed from the manifest without file_handlers: none registered', h1);

  served = after;
  await send('Page.navigate', { url: APP }, sid); await sleep(4000);
  const h2 = await handlers(id0);
  const ok2 = Array.isArray(h2) && h2.length === 1 && h2[0].action === APP &&
    JSON.stringify(h2[0].accepts) === JSON.stringify([{ mediaType: 'application/x-sptcal', fileExtensions: ['.sptcal'] }]);
  verdict('P2', ok2, 'the next page load registered .sptcal, action resolved against the page (no reinstall)', h2);
  const id1 = ((await send('Page.getAppId', {}, sid)).result || {}).appId;
  verdict('P3', id1 === id0, 'installed identity unchanged by the update', { before: id0, after: id1 });

  let n = reports.length;
  const win = await send('PWA.launch', { manifestId: id0 }); await sleep(2500);
  const plain = since(n).filter(r => r.ev === 'launch');
  verdict('P4', !win.error && plain.length === 1 && plain[0].n === 0, 'an ordinary launch calls the consumer with no files', plain);
  const appPid = plain.length ? plain[0].pid : null;

  const fa = path.join(TMP, 'Probe Calendar.sptcal'), fb = path.join(TMP, 'Second Calendar.sptcal');
  const fx = fs.readFileSync(path.join(ROOT, 'tests/fixtures/v1.4.2-saved.sptcal'));
  fs.writeFileSync(fa, fx); fs.writeFileSync(fb, fx);
  n = reports.length;
  await send('PWA.launchFilesInApp', { manifestId: id0, files: [fa] }); await sleep(3000);
  const one = since(n);
  verdict('P5', one.length === 1 && one[0].ev === 'launch' && one[0].pid === appPid && one[0].n === 1 && one[0].files[0].bytes === fx.length,
    'a file launched while the app is open reaches THAT window, with no reload', one);
  n = reports.length;
  await send('PWA.launchFilesInApp', { manifestId: id0, files: [fa, fb] }); await sleep(3000);
  const two = since(n);
  verdict('P6', two.length === 1 && two[0].n === 2 && two[0].pid === appPid, 'two files arrive as ONE call', two.map(r => ({ pid: r.pid, n: r.n })));
  await send('PWA.uninstall', { manifestId: id0 });
} catch (e) { misses++; console.log('MISS  EX', String(e && e.message || e)); }
chrome.kill('SIGKILL'); server.close();
await sleep(500);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(misses ? `=== ${misses} MISS ===` : '=== ALL HELD ===');
process.exit(misses ? 1 : 0);
