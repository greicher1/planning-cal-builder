// cspproof.mjs -- 4.1 (audit L-4, FIX-PLAN §6): the app runs under its Content-Security-Policy with
// ZERO violations, through every path that loads, fetches, writes or prints something.
//
//   node cspproof.mjs [--page /dist/index.html] [--state v1.4.0-saved]
//
// Writes cspproof.json ({test, cases:[{id,title,pass}]}) beside this script; gate.sh judges it.
//
// ⛔ WHY A NODE SCRIPT. A t/ leg is injected INLINE by srv.js, and an unhashed inline script is exactly
// what the policy refuses -- so srv.js strips the CSP meta on ?test= pages, and no leg can see it. Here
// the page is served WITHOUT ?test= (policy in force), and everything the test does goes through CDP:
// Runtime.evaluate and Page.addScriptToEvaluateOnNewDocument are not subject to the page's CSP, while
// everything the APP does in response is. A securitypolicyviolation recorder is installed in every
// frame before any page script runs.
//
//   B0  the built page carries the policy, and the app boots under it (the engine built the
//       sidebar; Carlito is registered; ExcelJS loaded from its allowed URL)
//   X1  Export to Excel writes a workbook              W1  Export PDF writes the waterfall PDF
//   M1  the month view renders                         M2  the month PDF is written by the direct writer (step 5)
//   M3  the month PDF's print path (the rollback, via its localhost-only switch) still prepares and prints
//   S1  Save writes a .sptcal through the picker       L1  Load reads one back through the picker
//   U1  the update check fetches version.json (connect-src 'self')
//   C1  Export shareable copy builds the copy; C2 the copy boots framed (srcdoc); C3 the copy boots
//       as its OWN top-level file:// document, the way a recipient double-clicks it
//   G1  the install gate's screens under the policy: ?gate=install and ?gate=live&brand=chrome
//   V0  ⭐ ZERO violations across every step above, in every document
//   P0  positive control, LAST: an unhashed inline script IS refused, and the recorder DOES hear it --
//       so V0's zero means "nothing was blocked", not "nothing was listening"
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const STATE = arg('state', 'v1.4.0-saved');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-cspproof`;
const OUT = path.join(HERE, 'cspproof.json');
const COPY = path.join(os.tmpdir(), `cspproof-copy-${PORT}.html`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'cspproof', cases: [], violations: [] };
const kase = (id, title, pass, extra) => out.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));
let srv = null, chrome = null;
setTimeout(() => {
  out.EX = 'cspproof: hit its 240 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) {}
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) {}
  try { if (srv) srv.kill('SIGKILL'); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 240000).unref();

const RECORDER = `(function(){
  if (window.__CSPV) return;
  window.__CSPV = [];
  document.addEventListener('securitypolicyviolation', function (e) {
    window.__CSPV.push({ dir: e.effectiveDirective || e.violatedDirective, blocked: String(e.blockedURI || '').slice(0, 80),
                         src: String(e.sourceFile || '').slice(-60), line: e.lineNumber, sample: String(e.sample || '').slice(0, 60),
                         doc: String(location.href).slice(0, 90) });
  }, true);
})();`;

try {
  fs.rmSync(OUT, { force: true });
  try { execFileSync('pkill', ['-f', `srv.js ${PORT} `]); } catch (e) {}
  await sleep(400);
  srv = spawn('node', [path.join(HERE, 'srv.js'), String(PORT), ROOT, path.join(HERE, 't')], { stdio: 'ignore' });
  await sleep(1500);
  fs.rmSync(PROFILE, { recursive: true, force: true });
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${PROFILE}`,
    '--allow-file-access-from-files', '--window-size=1600,1200', '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
  let devPort = 0;
  for (let i = 0; i < 100 && !devPort; i++) { await sleep(100); try { devPort = Number(fs.readFileSync(path.join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (e) {} }
  if (!devPort) throw new Error('Chrome never wrote DevToolsActivePort');
  let target = null;
  for (let i = 0; i < 50 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${devPort}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} if (!target) await sleep(100); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket failed')); });
  let seq = 0; const waiting = new Map(); const logViolations = []; const requests = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    if (m.method === 'Page.javascriptDialogOpening') { const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } })); }
    if (m.method === 'Log.entryAdded' && /Content Security Policy/i.test(m.params.entry.text || '')) logViolations.push(String(m.params.entry.text).slice(0, 200));
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text)); return r.result.value; };
  const until = async (expr, label, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return true; await sleep(100); } throw new Error('timed out waiting for ' + label); };
  const collect = async where => { const v = await ev('window.__CSPV || []').catch(() => []); v.forEach(x => out.violations.push(Object.assign({ where }, x))); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });

  const load = async url => {
    await send('Page.navigate', { url }); await sleep(300);
    await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`, 'the engine');
    await sleep(900);
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => x.innerText.trim() === 'Cancel'); if (b) b.click(); return 1; })()`);
    await sleep(300);
  };
  // Capture what the app hands to a download, instead of downloading it.
  const armDownload = () => ev(`(() => { window.__dl = []; if (!window.__realURL) window.__realURL = URL.createObjectURL;
    URL.createObjectURL = b => { window.__dl.push(b); return window.__realURL.call(URL, b); };
    HTMLAnchorElement.prototype.click = function () {}; return 1; })()`);
  const lastDownload = async (asText) => ev(`(async () => { const b = window.__dl[window.__dl.length - 1]; if (!b) return null;
    return { type: b.type, size: b.size, head: (await b.slice(0, 5).text()), text: ${asText ? 'await b.text()' : 'null'} }; })()`);

  // B0 -- boot under the policy.
  await load(`http://localhost:${PORT}${PAGE}?state=${STATE}`);
  await until(`typeof window.ExcelJS === 'object'`, 'ExcelJS', 20000).catch(() => {});
  const b0 = await ev(`({ csp: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '',
    carlito: document.fonts.check('11pt Carlito'), excel: typeof window.ExcelJS, rows: document.querySelectorAll('#table-wrap tr').length })`);
  kase('B0', 'the page carries the policy and the app boots under it (engine, Carlito, ExcelJS from its allowed URL)',
       /default-src 'none'/.test(b0.csp) && /'sha256-/.test(b0.csp) && b0.carlito === true && b0.excel === 'object', { csp: b0.csp.slice(0, 60), carlito: b0.carlito, excel: b0.excel });

  // X1 / W1 -- the two waterfall exports.
  await ev(`document.getElementById('view-sheet-btn').click(), 1`); await sleep(700);
  await armDownload(); await sleep(700);
  await ev(`document.getElementById('export-btn').click(), 1`);
  await until(`window.__dl.length >= 1`, 'the workbook', 20000).catch(() => {});
  const x1 = await lastDownload(false);
  kase('X1', 'Export to Excel writes a workbook', !!x1 && /spreadsheetml/.test(x1.type) && x1.head.slice(0, 2) === 'PK' && x1.size > 5000, { x1 });
  await sleep(800);
  await ev(`document.getElementById('export-wf-pdf-btn').click(), 1`);
  await until(`window.__dl.length >= 2`, 'the waterfall PDF', 20000).catch(() => {});
  const w1 = await lastDownload(false);
  kase('W1', 'Export PDF writes the waterfall PDF', !!w1 && w1.head === '%PDF-', { w1 });

  // M1 / M2 -- the month view and its PDF.
  await ev(`document.getElementById('view-month-btn').click(), 1`);
  const m1 = await until(`!!document.querySelector('#table-wrap .mv-week')`, 'the month view').catch(() => false);
  kase('M1', 'the month view renders', m1 === true);
  // M2: since MONTH-PDF-WRITER-PLAN.md step 5 the month view's Export PDF is the DIRECT WRITER. The four Inter programs
  // are decoded (atob + DecompressionStream), the PDF is built and written through the Save dialog, stood in for here:
  // nothing loads from anywhere, so the policy must see nothing at all. window.print must not be called.
  await sleep(800);
  await ev(`(() => { window.__mpdf = null; window.__mprints = 0; window.print = () => { window.__mprints++; };
      const latin1 = b => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return s; };
      window.showSaveFilePicker = async o => ({ name: o && o.suggestedName, kind: 'file', createWritable: async () => { const parts = [];
        return { write: async c => { parts.push(c); }, abort: async () => {}, close: async () => {
          const b = new Uint8Array(await new Blob(parts).arrayBuffer()), t = latin1(b);
          window.__mpdf = { name: o && o.suggestedName, size: b.length, head: t.slice(0, 8), pages: (t.match(/\\/Type \\/Page \\/Parent/g) || []).length }; } }; } });
      document.getElementById('export-btn').click(); return 1; })()`);
  await until(`!!window.__mpdf`, 'the month PDF written', 20000).catch(() => {});
  const m2 = await ev(`({ pdf: window.__mpdf, prints: window.__mprints })`);
  kase('M2', 'the month PDF is written by the direct writer, through the Save dialog, with no print',
       !!m2 && !!m2.pdf && m2.pdf.head === '%PDF-1.4' && m2.pdf.pages > 0 && /Month Calendar\.pdf$/.test(m2.pdf.name || '') && m2.prints === 0, { m2 });

  // M3: the print path, the rollback (MV_PDF_MODE), reached here by its localhost-only switch, must still run under the
  // policy too: the month document is prepared and printed.
  await sleep(800);
  await ev(`(() => { localStorage.setItem('sptcal.mvPdfTest', 'print'); window.__printed = null; window.print = () => { window.__printed = { cls: document.body.className, pages: document.querySelectorAll('#print-root .print-page').length }; }; document.getElementById('export-btn').click(); return 1; })()`);
  await until(`!!window.__printed`, 'the month print', 20000).catch(() => {});
  const m3 = await ev(`window.__printed`);
  await ev(`(window.dispatchEvent(new Event('afterprint')), localStorage.removeItem('sptcal.mvPdfTest'), 1)`);
  kase('M3', 'the print path (the rollback) still prepares and prints the month document', !!m3 && m3.cls.indexOf('printing-calendar') >= 0 && m3.pages > 0, { m3 });

  // S1 / L1 -- Save and Load through the (stood-in) pickers.
  const showA = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'show-a.sptcal'), 'utf8');
  await ev(`(() => { window.__writes = []; const h = { name: 'proof.sptcal', kind: 'file',
      queryPermission: async () => 'granted', requestPermission: async () => 'granted', isSameEntry: async o => o === h,
      getFile: async () => new File([window.__writes.length ? window.__writes[window.__writes.length - 1] : ''], 'proof.sptcal', { lastModified: 1 }),
      createWritable: async () => { const parts = []; return { write: async c => { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async () => { window.__writes.push(parts.join('')); } }; } };
    window.showSaveFilePicker = async () => h; document.getElementById('save-file-btn').click(); return 1; })()`);
  await until(`window.__writes.length >= 1`, 'the save', 20000).catch(() => {});
  const s1 = await ev(`(window.__writes[0] || '').slice(0, 40)`);
  kase('S1', 'Save writes a .sptcal through the picker', s1.trim().charAt(0) === '{', { head: s1 });
  await sleep(1000);
  await ev(`(() => { const h = { name: 'show-a.sptcal', kind: 'file', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      isSameEntry: async () => false, getFile: async () => new File([${JSON.stringify(showA)}], 'show-a.sptcal', { lastModified: 2 }) };
    window.showOpenFilePicker = async () => [h];
    document.querySelector('.file-menu-btn').click(); return 1; })()`);
  await until(`!!document.querySelector('#file-menu .file-menu-item[data-action="open"]')`, 'the Load item', 10000).catch(() => {});
  await ev(`document.querySelector('#file-menu .file-menu-item[data-action="open"]').click(), 1`);
  await sleep(600);
  await ev(`(() => { const b = Array.from(document.querySelectorAll('.mantine-Modal-content button')).find(x => x.innerText.trim() === 'Load'); if (b) b.click(); return 1; })()`);
  const l1 = await until(`document.getElementById('show-title').value === 'SHOW A'`, 'SHOW A to load', 15000).catch(() => false);
  kase('L1', 'Load reads a .sptcal back through the picker', l1 === true);

  // U1 -- the update check. It first runs 8 s after boot (setTimeout(check, 8000)), then every 30 min.
  for (let i = 0; i < 120 && !requests.some(u => /\/version\.json/.test(u)); i++) await sleep(100);
  const u1 = requests.some(u => /\/version\.json/.test(u));
  kase('U1', "the update check fetches version.json under connect-src 'self'", u1, { requested: requests.filter(u => /version\.json/.test(u)).slice(0, 2) });
  await collect('app');

  // C1 / C2 / C3 -- a shareable copy: built, then opened framed and as its own file:// document.
  await armDownload();
  await sleep(700);
  await ev(`(() => { const s = document.querySelector('.side-tab-btn[data-tab="settings"]'); if (s) s.click(); return 1; })()`);
  await until(`!!document.getElementById('share-copy-btn')`, 'the share button', 10000).catch(() => {});
  await sleep(900);
  await ev(`document.getElementById('share-copy-btn').click(), 1`);
  await until(`window.__dl.length >= 1`, 'the shareable copy', 20000).catch(() => {});
  const c1 = await lastDownload(true);
  kase('C1', 'Export shareable copy builds the copy, and it carries the same policy',
       !!c1 && /text\/html/.test(c1.type) && c1.text.indexOf('http-equiv="Content-Security-Policy"') > 0, { size: c1 && c1.size });
  if (c1) {
    await ev(`(() => { const f = document.createElement('iframe'); f.id = 'copyframe'; f.style.width = '1400px'; f.style.height = '900px';
      f.srcdoc = ${JSON.stringify(c1.text)}; document.body.appendChild(f); return 1; })()`);
    const c2 = await until(`(() => { const d = document.getElementById('copyframe').contentDocument; return !!d && !!d.getElementById('start-production') && d.querySelectorAll('#hiatus-list .hiatus-entry').length > 0; })()`, 'the framed copy', 20000).catch(() => false);
    await sleep(1500);
    const framed = await ev(`(() => { const w = document.getElementById('copyframe').contentWindow; return { v: w.__CSPV || null, title: w.document.getElementById('show-title').value }; })()`).catch(() => ({ v: null }));
    (framed.v || []).forEach(x => out.violations.push(Object.assign({ where: 'copy (framed)' }, x)));
    kase('C2', 'the copy boots framed (srcdoc), under its own policy, with the calendar in it', c2 === true && framed.v !== null && framed.title === 'SHOW A', { copyTitle: framed.title, recorder: framed.v !== null });
    fs.writeFileSync(COPY, c1.text);
    await send('Page.navigate', { url: 'file://' + COPY }); await sleep(300);
    const c3 = await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0 && document.getElementById('show-title').value === 'SHOW A'`, 'the file:// copy', 20000).catch(() => false);
    await sleep(1500);
    kase('C3', 'the copy boots as its own top-level file:// document, the way a recipient opens it', c3 === true);
    await collect('copy (file://)');
  }

  // G1 -- the install gate's screens under the policy.
  const gates = [];
  for (const q of ['gate=install', 'gate=live&brand=chrome']) {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?${q}` }); await sleep(1500);
    const g = await ev(`({ gate: document.documentElement.getAttribute('data-app-gate'), shown: getComputedStyle(document.getElementById('app-gate')).display !== 'none' })`).catch(() => ({}));
    gates.push(Object.assign({ q }, g));
    await collect('gate ' + q);
  }
  kase('G1', 'the install gate draws its screens under the policy (?gate=install, ?gate=live&brand=chrome)',
       gates.length === 2 && gates.every(g => !!g.gate && g.shown === true), { gates });

  // V0 -- the verdict, before the positive control adds its deliberate one.
  const logged = logViolations.slice();
  kase('V0', 'ZERO CSP violations across every step, in every document', out.violations.length === 0 && logged.length === 0,
       { recorded: out.violations.slice(0, 8), console: logged.slice(0, 8) });

  // P0 -- positive control: the policy is enforced, and the recorder hears it.
  await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${STATE}` });
  await sleep(1500);
  const p0 = await ev(`(async () => { window.__inlineRan = 0; const s = document.createElement('script'); s.textContent = 'window.__inlineRan = 1';
    document.body.appendChild(s); await new Promise(r => setTimeout(r, 300)); return { ran: window.__inlineRan, heard: (window.__CSPV || []).map(v => v.dir) }; })()`);
  kase('P0', 'positive control: an unhashed inline script is REFUSED and the recorder HEARS it',
       p0.ran === 0 && p0.heard.some(d => /script-src/.test(d)), { p0 });
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'cspproof threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) {}
  if (srv) srv.kill('SIGKILL');
  try { fs.rmSync(COPY, { force: true }); } catch (e) {}
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`cspproof: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass, ${out.violations.length} violations`);
  process.exit(0);
}
