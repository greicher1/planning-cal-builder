// mvordersp.mjs -- Simultaneous Post takes a place in the month view's order (owner, 11 Nov 2026: "we should be able
// to reorder the position of phases including sim post, without sim post having to stick to production"; frozen edit
// SO1 in renderMonthView, owner-approved by picker "Approve with that gate").
//
//   node mvordersp.mjs [--page /dist/index.html] [--port 8233]
//
// Writes mvordersp.json beside this script. mvorder.mjs's plumbing (trusted CDP input), on the synthetic
// colswap-simpost-refuse.sptcal: the first week showing Sim Post beside Production and Post.
//   P0  setup: date order, Sim Post below every phase (where it always was); its bar carries data-sp on screen
//   P1  hovering Sim Post's bar shows the ONE reorder grip, body-level and topmost
//   P2  ⭐ its grip dragged to the top: a moving copy mid-drag; Sim Post above Production in that week AND every week
//       that draws it (one order for the calendar)
//   P3  ONE undo puts it back under the phases; redo brings it back up
//   P4  Save writes mvPhaseOrder with "simpost" first
//   P5  ⭐ the WRITTEN month PDF stacks it the same way: that week's "Simultaneous Post" above its "Post Week N"
//   P6  the bar menu offers Back to date order, which puts Sim Post back under every phase
//   P7  Sim Post dragged between Production and Post stays there
//   P8  another phase reordered (Post to the top) leaves Sim Post where it was: under every phase
//   P9  Escape mid-drag: Sim Post back under the phases, no copy left
//   E0  no exceptions and no console errors
// ⛔ Gates 10 and 13 prove SO1 INERT on every calendar where Sim Post was never moved; this leg proves it acts.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8233));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8233 ? PORT : ''}-mvordersp`;
const OUT = path.join(HERE, 'mvordersp.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'mvordersp', cases: [] };
setTimeout(() => {
  out.EX = 'mvordersp: hit its 300 s deadline';
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
    for (let i = 0; month && i < 40; i++) {
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
  // The first week, from the first month on, that draws Sim Post beside Production and Post.
  const findWeek = async () => {
    for (let i = 0; i < 40; i++) {
      const wk = await ev(`Array.from(document.querySelectorAll('#table-wrap .mv-week')).findIndex(w => w.querySelector('.mv-pill[data-sp]')
        && w.querySelector('.mv-pill[data-ph="production"]') && w.querySelector('.mv-pill[data-ph="post"]'))`);
      if (wk >= 0) return { wk, month: await ev(`document.querySelector('#table-wrap .mv-monthyear').textContent.trim()`) };
      await ev(`document.getElementById('mv-next').click(), true`);
      await sleep(150);
    }
    throw new Error('no week with Sim Post, Production and Post');
  };
  // A week's bars top to bottom: phases by data-ph, Sim Post as SP.
  const order = wk => ev(`(() => { const w = document.querySelectorAll('#table-wrap .mv-week')[${wk}]; if (!w) return '';
    return Array.from(w.querySelectorAll('.mv-pill[data-ph], .mv-pill[data-sp]')).map(p => ({ k: p.getAttribute('data-ph') || 'SP',
      lane: +(/grid-row:(\\d+)/.exec(p.getAttribute('style')) || [0, 0])[1] })).sort((a, b) => a.lane - b.lane)
      .map(x => x.k).filter((k, i, a) => a.indexOf(k) === i).join('>'); })()`);
  // Every week of the month that draws Sim Post: is it above (top) / below every phase sharing its row?
  const spEverywhere = () => ev(`Array.from(document.querySelectorAll('#table-wrap .mv-week')).filter(w => w.querySelector('.mv-pill[data-sp]')).map(w => {
    const lane = p => +(/grid-row:(\\d+)/.exec(p.getAttribute('style')) || [0, 0])[1];
    const sp = Math.min(...Array.from(w.querySelectorAll('.mv-pill[data-sp]')).map(lane));
    const ph = Array.from(w.querySelectorAll('.mv-pill[data-ph]')).map(lane);
    return !ph.length ? 'alone' : sp < Math.min(...ph) ? 'top' : sp > Math.max(...ph) ? 'bottom' : 'middle'; })`);
  const into = async sel => { await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (e) e.scrollIntoView({ block: 'center' }); return !!e; })()`); await sleep(250); };
  const spGrip = async wk => {
    await into(`#table-wrap .mv-week:nth-child(${wk + 1}) .mv-pill[data-sp]`);
    const b = await box(`#table-wrap .mv-week:nth-child(${wk + 1}) .mv-pill[data-sp]`);
    await mouse('mouseMoved', b.l + Math.min(80, b.w / 3), b.y, 0);
    await sleep(200);
    return { bar: b, grip: await ev(`(() => { const g = document.querySelector('.mv-order-grip'); if (!g || g.hidden) return null; const r = g.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, n: document.querySelectorAll('.mv-order-grip').length,
               body: g.parentElement === document.body, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === g }; })()`) };
  };
  const FIX = 'colswap-simpost-refuse';
  await load(FIX, '');
  const { wk: W, month: MONTH } = await findWeek();
  const o0 = await order(W);
  kase('P0', 'setup (' + MONTH + ', week row ' + W + '): Sim Post under every phase, as it always was', o0 === 'production>post>SP'
    && (await spEverywhere()).every(x => x === 'bottom' || x === 'alone'), { order: o0, weeks: await spEverywhere() });
  const g1 = await spGrip(W);
  kase('P1', 'hovering Sim Post\'s bar shows ONE grip, body-level and topmost', !!g1.grip && g1.grip.n === 1 && g1.grip.body && g1.grip.top, { grip: g1.grip });
  const mid2 = await gesture(g1.grip.x, g1.grip.y, 0, -(g1.bar.h + 2) * 2.4, async () => ({ c: await chrome0() }));
  const o2 = await order(W), e2 = await spEverywhere();
  kase('P2', 'its grip dragged to the top: a body-level copy mid-drag, then Sim Post above Production in that week and in every week that draws it',
    mid2.c.bodyGhosts === 1 && mid2.c.inWrap === 0 && o2 === 'SP>production>post' && e2.every(x => x === 'top' || x === 'alone') && e2.includes('top'),
    { mid: mid2.c, order: o2, weeks: e2 });
  await undo(); await sleep(700);
  const o3u = await order(W);
  await redo(); await sleep(700);
  const o3r = await order(W);
  kase('P3', 'ONE undo puts Sim Post back under the phases; redo brings it back up', o3u === 'production>post>SP' && o3r === 'SP>production>post', { undone: o3u, redone: o3r });
  const s4 = await saved();
  kase('P4', 'Save writes mvPhaseOrder with "simpost" first', Array.isArray(s4.mvPhaseOrder) && s4.mvPhaseOrder[0] === 'simpost', { mvPhaseOrder: s4.mvPhaseOrder });
  // P5: the written month PDF. On the page holding that week, the "Simultaneous Post" label nearest a "Post Week N" label
  // sits ABOVE it (PDF y grows upward); before the drag it sat below.
  const pdfStack = async () => {
    await ev(`window.__files = (window.__files || []).filter(f => !/\\.pdf$/i.test(f.name)), true`);
    await key('e', 'KeyE', 69, 4 | 8);
    await until(`window.__files.some(f => /\\.pdf$/i.test(f.name))`, 'the month PDF', 30000);
    const b = Buffer.from(await ev(`window.__files.find(f => /\\.pdf$/i.test(f.name)).b64`), 'base64');
    const str = b.toString('latin1'), re = /stream\r?\n/g, res = [];
    let m;
    while ((m = re.exec(str))) {
      const st = m.index + m[0].length, en = str.indexOf('endstream', st);
      let txt = '';
      try { txt = zlib.inflateSync(b.subarray(st, en)).toString('latin1'); } catch (e) { continue; }
      const all = lab => Array.from(txt.matchAll(new RegExp('([\\d.]+) ([\\d.]+) Tm \\(' + lab + '\\) Tj', 'g'))).map(k => ({ x: +k[1], y: +k[2] }));
      const sps = all('Simultaneous Post'), posts = all('Post Week \\d+');
      posts.forEach(p => {
        const near = sps.filter(s => Math.abs(s.x - p.x) < 2).sort((a, c) => Math.abs(a.y - p.y) - Math.abs(c.y - p.y))[0];
        if (near) res.push(near.y > p.y ? 'above' : 'below');
      });
    }
    return res;
  };
  let p5 = null;
  try { p5 = await pdfStack(); } catch (e) { p5 = { error: String(e.message || e) }; }
  kase('P5', 'the written month PDF: beside every "Post Week N" label, Sim Post now sits above it', Array.isArray(p5) && p5.length > 0 && p5.every(x => x === 'above'), { pdf: p5 });
  // P6: Back to date order from Production's bar menu.
  await into(`#table-wrap .mv-week:nth-child(${W + 1}) .mv-pill[data-ph="production"]`);
  const pb = await box(`#table-wrap .mv-week:nth-child(${W + 1}) .mv-pill[data-ph="production"]`);
  await mouse('mouseMoved', pb.l + 30, pb.y, 0);
  await mouse('mousePressed', pb.l + 30, pb.y, 2, { button: 'right' });
  await mouse('mouseReleased', pb.l + 30, pb.y, 0, { button: 'right' });
  await sleep(400);
  const items6 = await ev(`Array.from(document.querySelectorAll('.day-menu [role="menuitem"], .day-menu button')).map(e => e.textContent.trim())`);
  await ev(`(() => { const b = Array.from(document.querySelectorAll('.day-menu [role="menuitem"], .day-menu button')).find(e => /Back to date order/.test(e.textContent)); if (b) b.click(); return !!b; })()`);
  await sleep(600);
  const o6 = await order(W);
  kase('P6', 'the bar menu offers Back to date order, which puts Sim Post back under every phase', items6.some(t => /Back to date order/.test(t)) && o6 === 'production>post>SP', { items: items6, order: o6 });
  // P7: between Production and Post.
  await load(FIX, MONTH);
  const g7 = await spGrip(W);
  await gesture(g7.grip.x, g7.grip.y, 0, -(g7.bar.h + 2) * 1.1);
  const o7 = await order(W);
  kase('P7', 'Sim Post dragged between Production and Post stays there', o7 === 'production>SP>post', { order: o7 });
  // P8: another phase reordered leaves Sim Post under the phases.
  await load(FIX, MONTH);
  await into(`#table-wrap .mv-week:nth-child(${W + 1}) .mv-pill[data-ph="post"]`);
  const pp = await box(`#table-wrap .mv-week:nth-child(${W + 1}) .mv-pill[data-ph="post"]`);
  await mouse('mouseMoved', pp.l + Math.min(80, pp.w / 3), pp.y, 0); await sleep(200);
  const g8 = await ev(`(() => { const g = document.querySelector('.mv-order-grip'); const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await gesture(g8.x, g8.y, 0, -(pp.h + 2) * 1.4);
  const o8 = await order(W), e8 = await spEverywhere();
  kase('P8', 'Post dragged above Production: Sim Post stays under every phase', o8 === 'post>production>SP' && e8.every(x => x === 'bottom' || x === 'alone'), { order: o8, weeks: e8 });
  // P9: Escape mid-drag.
  await load(FIX, MONTH);
  const g9 = await spGrip(W);
  await mouse('mouseMoved', g9.grip.x, g9.grip.y, 0);
  await mouse('mousePressed', g9.grip.x, g9.grip.y, 1);
  for (let i = 1; i <= 16; i++) { await mouse('mouseMoved', g9.grip.x, g9.grip.y - i * 3, 1); await sleep(30); }
  const mid9 = await order(W);
  await key('Escape', 'Escape', 27);
  await sleep(300);
  await mouse('mouseReleased', g9.grip.x, g9.grip.y - 48, 0);
  await sleep(400);
  const o9 = await order(W), c9 = await chrome0();
  kase('P9', 'Escape mid-drag: Sim Post back under the phases, no copy or shield left', mid9 !== 'production>post>SP' && o9 === 'production>post>SP' && c9.ghosts === 0 && c9.shields === 0, { mid: mid9, order: o9, after: c9 });
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
