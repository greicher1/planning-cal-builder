// excelretry.mjs -- audit item 3.11 (AUD2-064; the owner's decision D7 (a), 13 Nov 2026): Export to Excel when its
// Excel library (ExcelJS, the one script the app loads from another server) has not arrived.
//
//   node excelretry.mjs [--page /dist/index.html] [--port 8231]
//
// Writes excelretry.json ({test, cases:[{id,title,pass}]}) beside this script; gate.sh judges it.
//
// ⛔ WHY A NODE SCRIPT, as cspproof.mjs. The library is loaded by a <script> tag that the page parses before any t/ leg
// is injected, so only the network can make it fail; and a retry has to load under the build's real
// Content-Security-Policy, which srv.js strips on ?test= pages. So the page is served WITHOUT ?test= (policy in force),
// every request for the library is paused by CDP's Fetch domain and failed, held or let through, and everything the
// test does goes through Runtime.evaluate. The HTTP cache is off, so each attempt really reaches the network.
//
// Before the fix (audit leg audit-a5-wake X1, driver audit-g1-cdn X1): one static tag and no loader. A click while the
// library was missing showed "failed to load from the CDN ... ask IT to allow that domain" at once -- also when the
// library was only LATE -- and every later click showed it again until the app was relaunched, even with the network
// back. Compare's workbook said "Check the internet connection" while the computer was online.
//
//   F1  the CDN refuses the library: the click LOADS IT AGAIN (a new request, the same URL), says it could not download
//       it, names the address, says to try again, and does not say "locked-down" or "failed to load from the CDN"
//   F2  the network back: the NEXT click writes the workbook, with no dialog, and leaves no extra script tag behind
//   L1  the library is merely LATE: the click waits for it (the button busy, no dialog) and writes the workbook itself
//   L2  it never arrives: after the wait the click says it is STILL DOWNLOADING (no blame); once it arrives, a click works
//   S1  a shareable copy exported while that retry is still on its way carries the launch's tag only (buildSavedHtml)
//   O1  the computer is offline: the click says so, and asks to connect; back online, a click writes the workbook
//   C1  Compare's Export to Excel, the library refused: it loads it again and says what happened (not "Check the
//       internet connection" while online); C2 the network back: Compare writes its workbook
//   V0  ZERO CSP violations through all of it (a retry is the same URL, no new origin); P0 the positive control
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-excelretry`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'excelretry.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'excelretry', cases: [], violations: [] };
const kase = (id, title, pass, extra) => out.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));
let srv = null, chrome = null;
setTimeout(() => {
  out.EX = 'excelretry: hit its 300 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) {}
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) {}
  try { if (srv) srv.kill('SIGKILL'); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 300000).unref();

const RECORDER = `(function(){
  if (window.__CSPV) return;
  window.__CSPV = [];
  document.addEventListener('securitypolicyviolation', function (e) {
    window.__CSPV.push({ dir: e.effectiveDirective || e.violatedDirective, blocked: String(e.blockedURI || '').slice(0, 80),
                         sample: String(e.sample || '').slice(0, 60), doc: String(location.href).slice(0, 90) });
  }, true);
})();`;
const LIB = /cdn\.jsdelivr\.net\/npm\/exceljs@/;

try {
  fs.rmSync(OUT, { force: true });
  try { execFileSync('pkill', ['-f', `srv.js ${PORT} `]); } catch (e) {}
  await sleep(400);
  srv = spawn('node', [path.join(HERE, 'srv.js'), String(PORT), ROOT, path.join(HERE, 't')], { stdio: 'ignore' });
  await sleep(1500);
  fs.rmSync(PROFILE, { recursive: true, force: true });
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', NO_BUNDLE_CLONE, `--user-data-dir=${PROFILE}`,
    '--window-size=1600,1200', '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
  let devPort = 0;
  for (let i = 0; i < 100 && !devPort; i++) { await sleep(100); try { devPort = Number(fs.readFileSync(path.join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (e) {} }
  if (!devPort) throw new Error('Chrome never wrote DevToolsActivePort');
  let target = null;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${devPort}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} if (!target) await sleep(100); }
  if (!target) throw new Error('no page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket failed')); });
  let seq = 0; const waiting = new Map(); const logViolations = [];
  // The network for the library: 'fail' refuses every request, 'hold' keeps it waiting, 'pass' lets it through.
  const net = { mode: 'fail', seen: [], held: [] };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    if (m.method === 'Page.javascriptDialogOpening') { const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } })); }
    if (m.method === 'Log.entryAdded' && /Content Security Policy/i.test(m.params.entry.text || '')) logViolations.push(String(m.params.entry.text).slice(0, 200));
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      if (!LIB.test(request.url)) { send('Fetch.continueRequest', { requestId }).catch(() => {}); return; }
      net.seen.push(request.url);
      if (net.mode === 'pass') send('Fetch.continueRequest', { requestId }).catch(() => {});
      else if (net.mode === 'hold') net.held.push(requestId);
      else send('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' }).catch(() => {});
    }
  };
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result.value; };
  const until = async (expr, label, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(100); } throw new Error('timed out waiting for ' + label); };
  const collect = async where => { const v = await ev('window.__CSPV || []').catch(() => []); v.forEach(x => out.violations.push(Object.assign({ where }, x))); };
  const release = async () => { const h = net.held.splice(0); for (const id of h) await send('Fetch.continueRequest', { requestId: id }).catch(() => {}); return h.length; };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*cdn.jsdelivr.net*', requestStage: 'Request' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });

  const MODAL = `Array.from(document.querySelectorAll('.mantine-Modal-content')).map(m => m.innerText.replace(/\\s+/g, ' ').trim()).join(' | ')`;
  const modal = () => ev(MODAL).catch(() => '');
  const okModal = () => ev(`(() => { const b = Array.from(document.querySelectorAll('.mantine-Modal-content button')).find(x => x.innerText.trim() === 'OK'); if (b) b.click(); return !!b; })()`);
  const waitModal = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await modal(); if (t) return t; await sleep(100); } return ''; };
  const load = async (q, mode) => {
    await release(); net.mode = mode; net.seen.length = 0;
    await collect('before ' + q);
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?${q}` }); await sleep(300);
    await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`, 'the engine');
    await until(`!!document.querySelector('#table-wrap table.sheet-table td.sheet-phase-cell')`, 'the waterfall');
    await sleep(900);
    // A page of this profile may have left a crash backup: decline "Recover unsaved work" (setup, not the test).
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => x.innerText.trim() === 'Cancel'); if (b) b.click(); return 1; })()`);
    await sleep(300);
    // Capture what the app hands to a download, instead of downloading it.
    await ev(`(() => { window.__dl = []; const real = URL.createObjectURL;
      URL.createObjectURL = b => { window.__dl.push({ type: b.type, size: b.size, blob: b }); return real.call(URL, b); };
      HTMLAnchorElement.prototype.click = function () {}; return 1; })()`);
  };
  // The Export button's click goes through reClickGuard(600): a second press within 600 ms of the first is dropped on
  // purpose (no double export). A refused load answers in ~100 ms, so a test pressing OK and Export again at machine
  // speed lands inside that window; a person cannot. Every press here is spaced past it.
  let lastPress = 0;
  const pressExport = async () => { const gap = Date.now() - lastPress; if (gap < 900) await sleep(900 - gap);
    lastPress = Date.now(); await ev(`document.getElementById('export-btn').click(), 1`); };
  const workbooks = () => ev(`(async () => { const r = []; for (const d of window.__dl) if (/spreadsheetml/.test(d.type)) r.push({ size: d.size, head: await d.blob.slice(0, 2).text() }); return r; })()`);
  const tags = () => ev(`document.querySelectorAll('script[src*="exceljs"]').length`);
  const lib = () => ev(`typeof window.ExcelJS`);
  const blames = t => /locked-down|failed to load from the CDN|ask IT/i.test(t);

  // ---- F: the CDN refuses the library, then lets it through ----
  await load('state=v1.4.0-saved', 'fail');
  const f0 = { lib: await lib(), requests: net.seen.length, tags: await tags() };
  const n0 = net.seen.length;
  await pressExport();
  const f1msg = await waitModal(25000);
  const f1 = { msg: f1msg, retried: net.seen.length - n0, sameUrl: net.seen.every(u => u === net.seen[0]), tags: await tags(), workbooks: (await workbooks()).length };
  await okModal(); await sleep(400);
  f1.btnUsable = await ev(`!document.getElementById('export-btn').disabled`);
  kase('F1', 'the library refused: the click loads it again (same URL), says it could not download it and to try again, and blames no one',
       f0.lib === 'undefined' && f0.requests >= 1 && f1.retried >= 1 && f1.sameUrl && /couldn.t download/i.test(f1msg) && /cdn\.jsdelivr\.net/.test(f1msg)
       && /try the export again/i.test(f1msg) && !blames(f1msg) && f1.workbooks === 0 && f1.tags === 1 && f1.btnUsable === true, { f0, f1 });
  net.mode = 'pass';
  const n1 = net.seen.length;
  await pressExport();
  await until(`window.__dl.some(d => /spreadsheetml/.test(d.type))`, 'the workbook', 25000).catch(() => {});
  const f2 = { wb: await workbooks(), msg: await modal(), requests: net.seen.length - n1, lib: await lib(), tags: await tags() };
  kase('F2', 'the network back: the NEXT click writes the workbook, with no dialog, and leaves no extra script tag',
       f2.wb.length === 1 && f2.wb[0].head === 'PK' && f2.wb[0].size > 5000 && !f2.msg && f2.lib === 'object' && f2.tags === 1, { f2 });
  if (f2.msg) await okModal();

  // ---- L: the library is only late ----
  await load('state=v1.4.0-saved', 'hold');
  const l0 = { lib: await lib(), held: net.held.length };
  await pressExport();
  await sleep(2000);
  const l1a = { msg: await modal(), busy: await ev(`document.getElementById('export-btn').disabled`), held: net.held.length };
  const releasedL = await release(); net.mode = 'pass';
  await until(`window.__dl.some(d => /spreadsheetml/.test(d.type))`, 'the workbook', 25000).catch(() => {});
  const l1 = { wb: await workbooks(), msg: await modal(), lib: await lib(), tags: await tags(), released: releasedL };
  kase('L1', 'the library late: the click waits for it (busy, no dialog) and writes the workbook itself, with no second click',
       l0.lib === 'undefined' && !l1a.msg && l1a.busy === true && l1.wb.length === 1 && l1.wb[0].head === 'PK' && !l1.msg && l1.tags === 1, { l0, l1a, l1 });
  if (l1.msg) await okModal();

  await load('state=v1.4.0-saved', 'hold');
  await pressExport();
  await sleep(2000);
  const l2a = { msg: await modal() };
  const l2msg = await waitModal(30000);
  const l2b = { msg: l2msg, wb: (await workbooks()).length, held: net.held.length };
  await okModal(); await sleep(300);
  l2b.btnUsable = await ev(`!document.getElementById('export-btn').disabled`);
  // S1 -- a shareable copy exported while that retry is still on its way carries only the launch's own tag.
  const s1live = await tags();
  await ev(`(() => { const s = document.querySelector('.side-tab-btn[data-tab="settings"]'); if (s) s.click(); return 1; })()`);
  await until(`!!document.getElementById('share-copy-btn')`, 'the share button', 10000).catch(() => {});
  await sleep(900);
  await ev(`document.getElementById('share-copy-btn').click(), 1`);
  await until(`window.__dl.some(d => /text\\/html/.test(d.type))`, 'the shareable copy', 20000).catch(() => {});
  const s1 = await ev(`(async () => { const d = window.__dl.filter(x => /text\\/html/.test(x.type)).pop(); if (!d) return null; const t = await d.blob.text();
    return { tags: (t.match(/<script[^>]*exceljs@/g) || []).length, retry: t.indexOf('data-sptcal-retry=') }; })()`);
  kase('S1', 'a shareable copy exported while a retry is still on its way carries ONE Excel library tag, not the retry',
       s1live === 2 && !!s1 && s1.tags === 1 && s1.retry === -1, { liveTags: s1live, copy: s1 });
  await ev(`(() => { const s = document.querySelector('.side-tab-btn[data-tab="show"]'); if (s) s.click(); return 1; })()`);
  await release(); net.mode = 'pass';
  await until(`typeof window.ExcelJS === 'object'`, 'the library', 25000).catch(() => {});
  await sleep(500);
  await pressExport();
  await until(`window.__dl.some(d => /spreadsheetml/.test(d.type))`, 'the workbook', 25000).catch(() => {});
  const l2c = { wb: await workbooks(), msg: await modal(), tags: await tags() };
  kase('L2', 'never arrives: after the wait the click says it is STILL DOWNLOADING (no blame); once it arrives, a click writes it',
       !l2a.msg && /still downloading/i.test(l2msg) && !blames(l2msg) && l2b.wb === 0 && l2b.btnUsable === true
       && l2c.wb.length === 1 && !l2c.msg && l2c.tags === 1, { l2a, l2b, l2c });
  if (l2c.msg) await okModal();

  // ---- O: the computer is offline ----
  await load('state=v1.4.0-saved', 'fail');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await sleep(300);
  await pressExport();
  const o1msg = await waitModal(25000);
  const o1 = { msg: o1msg, onLine: await ev('navigator.onLine'), wb: (await workbooks()).length };
  await okModal(); await sleep(300);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  net.mode = 'pass'; await sleep(300);
  await pressExport();
  await until(`window.__dl.some(d => /spreadsheetml/.test(d.type))`, 'the workbook', 25000).catch(() => {});
  const o2 = { wb: await workbooks(), msg: await modal() };
  kase('O1', 'offline: the click says the computer is offline and to connect; back online, a click writes the workbook',
       o1.onLine === false && /offline/i.test(o1msg) && /connect/i.test(o1msg) && !blames(o1msg) && o1.wb === 0
       && o2.wb.length === 1 && !o2.msg, { o1, o2 });
  if (o2.msg) await okModal();

  // ---- C: Compare's workbook ----
  await load('state=compare-hiatus', 'fail');
  await ev(`(() => { const b = Array.from(document.querySelectorAll('.sc-strip button')).find(x => x.textContent.trim() === 'Compare'); if (b) b.click(); return !!b; })()`);
  await until(`!!document.querySelector('.compare-dlg .sc-compare-table')`, 'the Compare window', 15000);
  await sleep(500);
  const compareXlsx = `(() => { const b = Array.from(document.querySelectorAll('.compare-dlg button')).find(x => x.textContent.trim() === 'Export to Excel'); if (b) b.click(); return !!b; })()`;
  const c0 = net.seen.length;
  const c1press = await ev(compareXlsx);
  const c1msg = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 25000) { const t = await ev(`Array.from(document.querySelectorAll('.mantine-Modal-content')).filter(m => !m.closest('.compare-dlg')).map(m => m.innerText.replace(/\\s+/g, ' ').trim()).join(' | ')`).catch(() => ''); if (t) return t; await sleep(100); } return ''; })();
  const c1 = { pressed: c1press, msg: c1msg, retried: net.seen.length - c0, wb: (await workbooks()).length, onLine: await ev('navigator.onLine') };
  kase('C1', 'Compare, the library refused: it loads it again and says it could not download it (not "Check the internet connection" while online)',
       c1.pressed && c1.retried >= 1 && /couldn.t download/i.test(c1msg) && !/check the internet connection/i.test(c1msg) && !blames(c1msg) && c1.wb === 0, { c1 });
  await ev(`(() => { const b = Array.from(document.querySelectorAll('.mantine-Modal-content button')).filter(x => !x.closest('.compare-dlg')).find(x => x.innerText.trim() === 'OK'); if (b) b.click(); return !!b; })()`);
  await sleep(500);
  net.mode = 'pass';
  await ev(compareXlsx);
  await until(`window.__dl.some(d => /spreadsheetml/.test(d.type))`, 'the comparison workbook', 25000).catch(() => {});
  const c2 = { wb: await workbooks(), tags: await tags() };
  kase('C2', 'Compare, the network back: the next press writes the comparison workbook', c2.wb.length === 1 && c2.wb[0].head === 'PK' && c2.tags === 1, { c2 });
  await collect('compare');

  // V0 -- the verdict, before the positive control adds its deliberate one.
  const logged = logViolations.slice();
  kase('V0', 'ZERO CSP violations: every retry loads the same URL the policy already allows', out.violations.length === 0 && logged.length === 0,
       { recorded: out.violations.slice(0, 8), console: logged.slice(0, 8) });
  // P0 -- positive control: the policy is enforced on these pages, and the recorder hears it.
  const p0 = await ev(`(async () => { window.__inlineRan = 0; const s = document.createElement('script'); s.textContent = 'window.__inlineRan = 1';
    document.body.appendChild(s); await new Promise(r => setTimeout(r, 300)); return { ran: window.__inlineRan, heard: (window.__CSPV || []).map(v => v.dir) }; })()`);
  kase('P0', 'positive control: an unhashed inline script is REFUSED and the recorder HEARS it', p0.ran === 0 && p0.heard.some(d => /script-src/.test(d)), { p0 });
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'excelretry threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) {}
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`excelretry: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass, ${out.violations.length} violations`);
  process.exit(0);
}
