// printpaper.mjs -- audit L-3 (FIX-PLAN 3.5): the month PDF's PAPER is pinned to Letter.
//
//   node printpaper.mjs [--page /dist/index.html] [--port 8241] [--state monthscale]
//
// Writes printpaper.json as {test, cases:[{id,title,pass,...}]}, judged by gate.sh the same way as
// the audit-fix legs. The port defaults to HARNESS_PORT, then 8231, exactly like run.sh, and a
// non-default port namespaces the Chrome profile the same way (/tmp/tc<port>-printpaper).
//
// ⛔ WHY A NODE SCRIPT AND NOT A t/<leg>.js. The finding is a print-dialog CHOICE. Chrome's
// "Save as PDF" defaults to A4 outside the US and Canada (the app has UK, DE, AU and LT regions),
// and the month fit is computed in JavaScript for Letter: exportMonthPdf's
// PAGE_H = (8.5in - 16mm) x 96. The print CSS used to say only @page{size:landscape}, which leaves
// the paper to the dialog. On A4 (6 mm shorter) each .print-page is 100vh of the SMALLER box with
// overflow:hidden, so the Letter-fitted rows lose their bottom edge -- the audit measured the
// shrink-to-fit month's last row clipped (AUDIT-REPORT §8). run.sh's --print-to-pdf cannot pick a
// paper. The DevTools protocol's Page.printToPDF can, so this drives Chrome over CDP: it loads the
// page with the monthprint leg, which leaves the finished month document in print state exactly
// as window.print() sees it, then prints that document twice -- at CDP's default Letter, and at A4
// with the page's own CSS size preferred (preferCSSPageSize), which is what the dialog does for a
// PDF destination.
//
// ✅ PASS = the A4 request comes out as the SAME Letter pages: the same sheet count, the same
// /MediaBox [0 0 792 612], and every content stream byte-identical to the Letter print. So the
// paper choice cannot reach the month PDF at all.
//
// ⚠️ NOT COVERED, by design: a custom Scale in the dialog. No CSS can stop it (AUDIT-REPORT §8);
// only a direct month-PDF writer can. Nor is a physical A4 printer, which shrinks a pinned Letter
// page to fit (Chrome's own behaviour). The owner checks the dialog itself by hand (FIX-PLAN §5).
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const STATE = arg('state', 'monthscale');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-printpaper`;
const OUT = path.join(HERE, 'printpaper.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const result = { test: 'printpaper', page: PAGE, state: STATE, cases: [] };
const kase = (id, title, pass, extra) => result.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));

// Sheets and page boxes, counted the way monthcmp.py counts them: page OBJECTS, never /Count
// (Chrome writes intermediate /Pages nodes).
const sheets = b => (b.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
const boxes = b => [...new Set(b.toString('latin1').match(/\/MediaBox\s*\[[^\]]*\]/g) || [])].sort();
// Every Flate stream, decompressed, in file order: page content AND fonts. Chrome's /Info dates
// are outside streams, so two prints of one layout compare equal and two layouts do not.
function streams(b) {
  const out = [], s = b.toString('latin1'), re = /stream\r?\n/g; let m;
  while ((m = re.exec(s))) {
    const st = m.index + m[0].length, en = s.indexOf('endstream', st);
    if (en < 0) continue;
    try { out.push(zlib.inflateSync(b.subarray(st, en)).toString('latin1')); } catch (e) { /* not Flate */ }
  }
  return out;
}

let srv = null, chrome = null;
try {
  fs.rmSync(OUT, { force: true });
  // A stale server on this port silently serves an OLD page (run.sh's own warning). Clear it.
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
  let seq = 0; const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

  await send('Page.enable');
  const url = `http://localhost:${PORT}${PAGE}?test=monthprint${STATE ? '&state=' + STATE : ''}`;
  await send('Page.navigate', { url });
  // The monthprint leg reports through #R when the document is back in print state. srv.js ships
  // #R holding the word "pending", so wait for JSON rather than for any text.
  let leg = null;
  for (let i = 0; i < 240 && !leg; i++) {
    await sleep(250);
    const txt = await evaluate("(document.getElementById('R')||{}).textContent||''").catch(() => '');
    if (txt.trim().startsWith('{')) leg = JSON.parse(txt);
  }
  if (!leg) throw new Error('the monthprint leg never reported');
  if (leg.EX) throw new Error('the monthprint leg threw: ' + leg.EX);
  result.months = leg.pages;
  kase('P0', 'the monthprint leg left the month document in print state', leg.leftInPrintState === true && leg.pages > 0,
       { months: leg.pages });

  const pdf = async params => Buffer.from((await send('Page.printToPDF', params)).data, 'base64');
  const letter = await pdf({ preferCSSPageSize: true });                                  // CDP's default paper: 8.5 x 11 in
  const a4 = await pdf({ paperWidth: 8.27, paperHeight: 11.69, preferCSSPageSize: true }); // Save as PDF, A4 selected
  fs.writeFileSync(path.join(HERE, 'printpaper-letter.pdf'), letter);
  fs.writeFileSync(path.join(HERE, 'printpaper-a4.pdf'), a4);
  const LETTER_BOX = '/MediaBox [0 0 792 612]';
  const L = { sheets: sheets(letter), boxes: boxes(letter) }, A = { sheets: sheets(a4), boxes: boxes(a4) };
  kase('P1', 'the default Letter print: one landscape Letter sheet per month',
       L.sheets === leg.pages && L.boxes.length === 1 && L.boxes[0] === LETTER_BOX, { letter: L });
  kase('P2', 'asking for A4 still prints landscape LETTER -- the paper is pinned by the print CSS',
       A.boxes.length === 1 && A.boxes[0] === LETTER_BOX, { a4: A });
  const sl = streams(letter), sa = streams(a4);
  const same = sl.length > 0 && sl.length === sa.length && sl.every((s, i) => s === sa[i]);
  kase('P3', 'the A4 request prints the SAME pages as Letter: same sheets, every content stream identical',
       A.sheets === L.sheets && same, { streamsLetter: sl.length, streamsA4: sa.length, identical: same });
  ws.close();
} catch (e) {
  result.EX = String(e && e.message || e);
  kase('EX', 'printpaper threw: ' + result.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  result.pass = result.cases.length > 0 && result.cases.every(c => c.pass === true);
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  for (const c of result.cases) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + 'printpaper ' + c.id + ': ' + c.title);
  process.exit(0);
}
