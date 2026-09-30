// pilldrag.mjs -- batch 5 (FIX-PLAN §7, MONTH-9): a month-view pill dragged OUT and BACK in one
// gesture leaves its phase exactly as it was, Snap to Mon included.
//
//   node pilldrag.mjs [--page /dist/index.html] [--state v1.4.0-saved]
//
// Writes pilldrag.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges
// like printpaper.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG. The suspect needs ONE gesture that goes out and comes back:
// press on the pill, move a day, move back, release. The pane's drag tool goes point to point, and a
// dispatchEvent() drag skips hit-testing (HANDOFF's elementsFromPoint trap). CDP's
// Input.dispatchMouseEvent is TRUSTED input: real hit-testing, real mousedown/mousemove/mouseup.
//
// The suspect, read from installMonthPillDrag: crossing a non-Monday clears snap-<key>, and nothing
// put it back when the pill came home. And since the gesture ends where it began, drag.applied is 0,
// so endDrag() banks NO undo step -- the snap change could not even be undone.
//   D0  setup: the month view shows Writer's Rm's first pill, on Mon 1/5/26, Snap to Mon on
//   D1  ⭐ out one day and back, ONE gesture: the start is 1/5/26 again AND Snap to Mon is still on
//   D2  ...and nothing else moved: the pill is back where it was
//   D3  guard (owner ruling, 18 Sep 2026): dropped on the Tuesday, the phase starts on the Tuesday
//       and Snap to Mon comes off -- and ONE Cmd+Z puts both back
//   D4  ⭐ the patch's other branch: a snapped phase dragged THROUGH a Tuesday onto the NEXT Monday
//       (right a day, down a week, back left a day) starts on 1/12/26 and stays snapped
// Same plumbing as rtleg.mjs / printpaper.mjs: Node 24's built-in WebSocket, no dependencies, and a
// non-default HARNESS_PORT namespaces the Chrome profile.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const STATE = arg('state', 'v1.4.0-saved');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8231));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8231 ? PORT : ''}-pilldrag`;
const OUT = path.join(HERE, 'pilldrag.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'pilldrag', cases: [] };
// A hang must REPORT, not block a gate run: after 150 s the script writes what it has and exits.
setTimeout(() => {
  out.EX = 'pilldrag: hit its 150 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 150000).unref();
const kase = (id, title, pass, extra) => out.cases.push(Object.assign({ id, title, pass: pass === true }, extra || {}));
let srv = null, chrome = null;
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
    // ⚠️ The app guards unsaved work with beforeunload, and a drag leaves the calendar dirty, so the
    // re-navigation before D3 raises a "Leave site?" dialog -- and Page.navigate waits on it forever.
    // Accept it: the next case wants a fresh page.
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
  const state = () => ev(`({ start: document.getElementById('start-writersRoom').value,
    snap: document.getElementById('snap-writersRoom').checked,
    pill: (() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
                   if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) }; })() })`);

  await send('Page.enable');
  // A fresh page each time, so no case inherits another's leftovers (D1's bug would otherwise make
  // the D3 guard fail for the wrong reason on the unfixed build).
  const load = async () => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=${STATE}` });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && document.querySelectorAll('#hiatus-list .hiatus-entry').length > 0`, 'the engine');
    await sleep(800);
    // The previous case's drag left a crash backup in this profile, so a fresh page offers "Recover
    // unsaved work" -- a modal that would swallow the next drag. Declining is setup, not the test.
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(400);
    await ev(`document.getElementById('view-month-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]')`, "Writer's Rm's pill");
    await sleep(500);
  };
  await load();
  // Where to press: the middle of the pill; a day column's width is the step.
  const geo = await ev(`(() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
    const r = p.getBoundingClientRect(); const c = document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2, dayW: c.width,
             hit: (() => { const e = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
                           return e && e.closest && e.closest('.mv-pill[data-ph]') ? 'mv-pill' : String(e ? e.className : ''); })() }; })()`);
  out.geo = geo;
  const s0 = await state();
  out.s0 = s0;
  kase('D0', "setup: Writer's Rm's pill on Mon 1/5/26, Snap to Mon on, and the press point hits the pill",
       s0.start === '2026-01-05' && s0.snap === true && !!s0.pill && String(geo.hit).indexOf('mv-pill') >= 0, { s0, hit: geo.hit });

  // D1/D2 -- out one day and back, ONE gesture.
  await mouse('mouseMoved', geo.x, geo.y, 0);
  await mouse('mousePressed', geo.x, geo.y, 1);
  await sleep(150);
  await mouse('mouseMoved', geo.x + geo.dayW * 0.55, geo.y, 1);
  await sleep(150);
  await mouse('mouseMoved', geo.x + geo.dayW, geo.y, 1);
  await sleep(400);
  const mid = await state();
  await mouse('mouseMoved', geo.x + geo.dayW * 0.45, geo.y, 1);
  await sleep(150);
  await mouse('mouseMoved', geo.x, geo.y, 1);
  await sleep(400);
  await mouse('mouseReleased', geo.x, geo.y, 0);
  await sleep(700);
  const s1 = await state();
  out.mid = mid; out.s1 = s1;
  kase('D1', 'out one day and back in ONE gesture: the start is 1/5/26 again AND Snap to Mon is still on',
       mid.start === '2026-01-06' && s1.start === '2026-01-05' && s1.snap === true, { mid, s1 });
  kase('D2', '...and the pill is back exactly where it was', !!s1.pill && JSON.stringify(s1.pill) === JSON.stringify(s0.pill), { before: s0.pill, after: s1.pill });

  // D3 -- the owner's ruling still holds: dropped on the Tuesday, snap comes off; one Cmd+Z restores.
  await load();
  const g2 = await ev(`(() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
    const r = p.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }; })()`);
  await mouse('mouseMoved', g2.x, g2.y, 0);
  await mouse('mousePressed', g2.x, g2.y, 1);
  await sleep(150);
  await mouse('mouseMoved', g2.x + geo.dayW * 0.55, g2.y, 1);
  await sleep(150);
  await mouse('mouseMoved', g2.x + geo.dayW, g2.y, 1);
  await sleep(400);
  await mouse('mouseReleased', g2.x + geo.dayW, g2.y, 0);
  await sleep(700);
  const s3 = await state();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, modifiers: 2 });
  await sleep(900);
  const s4 = await state();
  out.s3 = s3; out.s4 = s4;
  kase('D3', 'guard (owner ruling 18 Sep): dropped on the Tuesday it starts on 1/6/26 with Snap off, and ONE Ctrl+Z restores 1/5/26 with Snap on',
       s3.start === '2026-01-06' && s3.snap === false && s4.start === '2026-01-05' && s4.snap === true, { dropped: s3, undone: s4 });
  // D4 -- through a Tuesday onto the next Monday, one gesture.
  await load();
  const g4 = await ev(`(() => { const p = document.querySelector('#table-wrap .mv-pill[data-ph="writersRoom"]');
    const r = p.getBoundingClientRect(); const w = p.closest('.mv-week').getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2, weekH: w.height }; })()`);
  await mouse('mouseMoved', g4.x, g4.y, 0);
  await mouse('mousePressed', g4.x, g4.y, 1);
  await sleep(150);
  await mouse('mouseMoved', g4.x + geo.dayW, g4.y, 1);                 // Tue 1/6
  await sleep(300);
  await mouse('mouseMoved', g4.x + geo.dayW, g4.y + g4.weekH, 1);      // Tue 1/13
  await sleep(300);
  await mouse('mouseMoved', g4.x, g4.y + g4.weekH, 1);                 // Mon 1/12
  await sleep(400);
  await mouse('mouseReleased', g4.x, g4.y + g4.weekH, 0);
  await sleep(700);
  const s5 = await state();
  out.s5 = s5;
  kase('D4', 'through a Tuesday onto the NEXT Monday in one gesture: starts on 1/12/26 and stays snapped',
       s5.start === '2026-01-12' && s5.snap === true, { landed: s5 });
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'pilldrag threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`pilldrag: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
