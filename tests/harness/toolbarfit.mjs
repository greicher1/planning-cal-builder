// toolbarfit.mjs -- the preview toolbar and the app shell at every window size (owner, 16 Nov 2026: "Ok we really need
// to work on UI scaling at differnt screen sizes"; pickers "On the right", "Icons, then a More menu", "Stop shrinking,
// scroll sideways", then the More menu's cascading menus and "Arrow follows the side"). Takes over audit 3.12 (AUD2-065).
//
//   node toolbarfit.mjs [--page /dist/index.html] [--port 8236]
//
// Writes toolbarfit.json ({test, cases:[{id,title,pass}]}) beside this script, judged by gate.sh like hiatusdrag.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG: a t/ leg runs in ONE window (run.sh's --window-size) and its clicks are dispatched
// events. This one needs the window itself at many widths (Emulation.setDeviceMetricsOverride: the fold level, the 960 px
// minimum and the sideways scroll are properties of the WINDOW) and trusted input: the More menu's rows open their menus
// on HOVER, and only a CDP mouseMoved is a real hover. stylebarplace (a t/ leg) holds the fold ladder by the row's width.
//
// tests/fixtures/sideboxes.sptcal (boxes on both sides: the narrowest preview). Each case loads a fresh page with the
// origin's storage cleared, so no crash backup from the last one raises "Recover unsaved work" over the toolbar.
//
//   F0  each window width folds the toolbar to its level, never back as the window narrows: 0 at 2560 and 1728, 5 at
//       960; ONE line at every width (every control on show level with the view toggle, none past the row's edge);
//       the header never overflows; in the waterfall and the month view alike
//   F1  wide: nothing folded, the gaps at most 14 px (--tb-gap-max), the line packed LEFT, the spare room after Redo
//   F2  the app never stacks: at 960 and at 820 px the sidebar is beside the preview, the grid box ends inside the
//       window; at 820 the page is 960 px wide and scrolls sideways; at 960 and wider nothing scrolls sideways
//   F3  the More menu (1280 and 1470): resting on Side Boxes opens its menu BESIDE the panel, first row level with the
//       row, no row covered, the panel still open; on Header, Side Boxes' closes and Header's opens; on Fill Gaps both
//       close; gliding into the menu keeps it; choosing adds the box and closes everything; a second click on an open
//       row keeps it open; Escape closes everything
//   F4  each cascading row's arrow points the side its menu opens (› right, ‹ left), at 1470, 1366, 1100, 960 and in
//       the month view
//   F5  the Text menu (step 4, 1100): a picked cell stays picked when Aa opens the text style buttons under it; Bold
//       applies; a press outside closes it
//   F6  step 3 (1280): Build Around shows its hammer, not its label, with "Build Around" as its hover hint, and opens its
//       panel; step 5 (960): Waterfall and Month show icons only, each named by its hover hint; unfolded, neither has one
//   F7  the month stepper in the More panel steps the month (1366, month view)
//   F8  unfolded (1728): Side Boxes' menu still drops under its own button, and a second click closes it
//   Z   no page error or console error in any case
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8236));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8236 ? PORT : ''}-toolbarfit`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'toolbarfit.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = { test: 'toolbarfit', cases: [], errors: [] };
setTimeout(() => {
  out.EX = 'toolbarfit: hit its 600 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 600000).unref();
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
    // ⛔ NOT --hide-scrollbars: a classic scrollbar (Windows draws them; so does this Chrome) coming and going on the
    // preview panel took 15 px from the toolbar row and wrapped the folded line for a moment. F0 must see that.
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
    // An added box leaves the calendar dirty, so the next navigation raises "Leave site?" (pilldrag's trap).
    if (m.method === 'Page.javascriptDialogOpening') {
      const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
    }
    if (m.method === 'Runtime.exceptionThrown') out.errors.push(String((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') out.errors.push(m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  const until = async (expr, label, ms = 30000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return; await sleep(100); }
    throw new Error('timed out waiting for ' + label);
  };
  const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  const glide = async (x0, y0, x1, y1, n = 6) => { for (let k = 1; k <= n; k++) { await move(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n); await sleep(20); } };
  const click = async (x, y) => {
    await move(x, y); await sleep(30);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  };
  const center = sel => ev(`(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); if(!e||!e.getClientRects().length) return null; const b=e.getBoundingClientRect(); return [b.left+b.width/2, b.top+b.height/2]; })()`);
  const clickSel = async sel => { const c = await center(sel); if (!c) throw new Error('not on show: ' + sel); await click(...c); await sleep(250); };
  const esc = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(250); };
  const level = () => ev("[1,2,3,4,5].filter(k=>document.querySelector('.preview-panel').classList.contains('tbf'+k)).length");

  await send('Page.enable');
  await send('Runtime.enable');
  // A fresh page at a window size, storage cleared first (no recovery modal from the last case's added box).
  const load = async (w, h, view) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'about:blank' }); await sleep(150);
    await send('Storage.clearDataForOrigin', { origin: `http://localhost:${PORT}`, storageTypes: 'all' });
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=sideboxes` });
    await until("!!document.querySelector('.view-toggle-row .style-bar') && document.fonts.status === 'loaded' && !!document.querySelector('#table-wrap .sheet-scroll')", 'the app');
    if (view === 'month') {
      await ev("document.getElementById('view-month-btn').click(), true");
      await until("!!document.querySelector('#table-wrap .month-view')", 'the month view');
    }
    await sleep(700);
  };
  // The first line: its level, the controls on show, one line, inside the row; the header; the page's width.
  const LINE = `(()=>{ const row=document.querySelector('.view-toggle-row'), pn=document.querySelector('.preview-panel');
    const lvl=[1,2,3,4,5].filter(k=>pn.classList.contains('tbf'+k)).length;
    const sel=['.view-toggle','#shift-group','#pop-solve-btn','.tb-text-btn','.style-bar','#tb-fill-space-btn','#tb-side-boxes-btn','#tb-hdr-mode-btn','.tb-more-btn','.undo-redo-group'];
    const shown=sel.map(s=>row.querySelector(s)).filter(e=>e&&e.getClientRects().length&&e.getBoundingClientRect().width>0);
    const tg=row.querySelector('.view-toggle').getBoundingClientRect(), mid=r=>r.top+r.height/2, rr=row.getBoundingClientRect();
    const items=shown.map(e=>e.getBoundingClientRect());
    const hdr=document.querySelector('header.app-header');
    return { level: lvl, oneLine: items.every(r=>Math.abs(mid(r)-mid(tg))<1), inside: items.every(r=>r.right<=rr.right+0.5),
      gap: parseFloat(getComputedStyle(row).getPropertyValue('--tb-gap')), spare: Math.round(rr.right-Math.max(...items.map(r=>r.right))),
      toggleAtLeft: Math.abs(tg.left-rr.left)<1, hdrOver: hdr.scrollWidth-hdr.clientWidth, docW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth }; })()`;

  // ---- F0 + F1: the widths ----
  for (const view of [undefined, 'month']) {
    const seen = [];
    for (const [w, h] of [[2560, 1300], [1728, 1000], [1600, 1000], [1470, 900], [1366, 800], [1280, 800], [1100, 800], [960, 760]]) {
      await load(w, h, view);
      seen.push({ w, ...(await ev(LINE)) });
    }
    const lv = seen.map(s => s.level);
    const mono = lv.every((l, i) => i === 0 || l >= lv[i - 1]);
    kase('F0' + (view ? 'm' : ''), `${view || 'waterfall'}: each width folds to its level, never back as the window narrows (0 at 2560 and 1728, 5 at 960); one line, inside the row, the header never overflowing, at every width`,
      mono && lv[0] === 0 && lv[1] === 0 && lv[lv.length - 1] === 5 && seen.every(s => s.oneLine && s.inside && s.hdrOver <= 0),
      { ladder: seen.map(s => `${s.w}:${s.level}`).join(' '), bad: seen.filter(s => !s.oneLine || !s.inside || s.hdrOver > 0) });
    if (!view) {
      const wide = seen[0];
      kase('F1', 'wide (2560): nothing folded, the gaps 14 px (--tb-gap-max), packed left, the spare room after Redo',
        wide.level === 0 && Math.abs(wide.gap - 14) < 0.01 && wide.toggleAtLeft && wide.spare > 500, wide);
    }
  }

  // ---- F2: never stacked; the 960 px minimum ----
  const SHELL = `(()=>{ const side=document.querySelector('.form-panel').getBoundingClientRect(), prev=document.querySelector('.preview-panel').getBoundingClientRect();
    const g=document.querySelector('#table-wrap .sheet-scroll').getBoundingClientRect();
    return { beside: side.right <= prev.left + 0.5 && Math.abs(side.top - prev.top) < 1, gridBottom: Math.round(g.bottom), vh: innerHeight,
      docW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, bodyW: Math.round(document.body.getBoundingClientRect().width) }; })()`;
  await load(960, 760);
  const s960 = await ev(SHELL);
  await load(820, 700);
  const s820 = await ev(SHELL);
  await ev('document.documentElement.scrollLeft = 500');
  const sl = await ev('document.documentElement.scrollLeft');
  kase('F2', 'never stacked: at 960 and 820 px the sidebar is beside the preview and the grid ends inside the window; 820 scrolls sideways to 960, 960 does not scroll',
    s960.beside && s820.beside && s960.gridBottom <= s960.vh && s820.gridBottom <= s820.vh && s960.docW === 960 && s820.docW === 960 && s820.bodyW === 960 && sl === 140,
    { s960, s820, scrollLeft: sl });

  // ---- F3: the More menu, by hover ----
  const MENUS = `(()=>{ const P=document.querySelector('.tb-more .tb-page'); const pr=P.getBoundingClientRect();
    const one=(sel,rowSel)=>{ const m=document.querySelector(sel); if(!m) return null; const r=m.getBoundingClientRect(), row=document.querySelector(rowSel).getBoundingClientRect(), first=m.querySelector('button').getBoundingClientRect();
      const covered=[...m.querySelectorAll(':scope > button')].filter(it=>{ const b=it.getBoundingClientRect(); const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return !(e&&it.contains(e)); }).length;
      return { side: r.left >= pr.right - 1 ? 'right' : r.right <= pr.left + 1 ? 'left' : 'overlap', rowDy: Math.round(first.top - row.top), covered }; };
    return { more: document.querySelector('.tb-more').classList.contains('is-open'), side: one('.sb-menu','#tb-side-boxes-btn'), hdr: one('.hdr-mode-pop','#tb-hdr-mode-btn') }; })()`;
  for (const [w, h] of [[1280, 800], [1470, 900]]) {
    await load(w, h);
    await clickSel('.tb-more-btn');
    const sb = await center('#tb-side-boxes-btn'), hd = await center('#tb-hdr-mode-btn'), fg = await center('#tb-fill-space-btn');
    await glide(sb[0] - 40, sb[1] - 30, sb[0], sb[1]); await sleep(400);
    const a = await ev(MENUS);
    await glide(sb[0], sb[1], hd[0], hd[1], 4); await sleep(400);
    const b = await ev(MENUS);
    await glide(hd[0], hd[1], fg[0], fg[1], 4); await sleep(400);
    const c = await ev(MENUS);
    await glide(fg[0], fg[1], sb[0], sb[1], 4); await sleep(400);
    const item = await ev("(()=>{ const it=document.querySelector('.sb-menu-item[data-kind=\"key\"][data-side=\"right\"]'); const b=it.getBoundingClientRect(); return [b.left+b.width/2, b.top+b.height/2]; })()");
    const n0 = await ev("document.querySelectorAll('.sb-box').length");
    await glide(sb[0], sb[1], item[0], sb[1], 10); await sleep(60);
    const d = await ev(MENUS);
    await glide(item[0], sb[1], item[0], item[1], 4);
    await click(item[0], item[1]); await sleep(400);
    const e = await ev(MENUS), added = (await ev("document.querySelectorAll('.sb-box').length")) === n0 + 1;
    await clickSel('.tb-more-btn');
    await clickSel('#tb-hdr-mode-btn'); await sleep(250);
    await clickSel('#tb-hdr-mode-btn'); await sleep(250);
    const f = await ev(MENUS);
    await esc();
    const g = await ev(MENUS);
    const beside = m => m && m.side !== 'overlap' && Math.abs(m.rowDy) <= 3 && m.covered === 0;
    kase('F3 ' + w, `the More menu at ${w}: hover opens Side Boxes' menu beside the panel, Header's replaces it, Fill Gaps closes both; a glide into the menu keeps it; a choice adds the box and closes everything; a second click keeps a menu open; Escape closes everything`,
      a.more && beside(a.side) && !a.hdr && b.more && !b.side && beside(b.hdr) && c.more && !c.side && !c.hdr && d.more && !!d.side &&
        added && !e.more && !e.side && f.more && !!f.hdr && !g.more && !g.hdr && !g.side,
      { a, b, c, d, e, added, f, g });
  }

  // ---- F4: the arrow points the side its menu opens ----
  const arrowRes = [];
  for (const [w, h, view] of [[1470, 900], [1366, 800], [1100, 800], [960, 760], [1366, 800, 'month'], [1100, 800, 'month']]) {
    await load(w, h, view);
    await clickSel('.tb-more-btn');
    const rows = view ? [['#tb-hdr-mode-btn', '.hdr-mode-pop']] : [['#tb-side-boxes-btn', '.sb-menu'], ['#tb-hdr-mode-btn', '.hdr-mode-pop']];
    let prev = null;
    for (const [rsel, msel] of rows) {
      const c = await center(rsel);
      await glide(prev ? prev[0] : c[0] - 30, prev ? prev[1] : c[1] - 20, c[0], c[1], 4); await sleep(400); prev = c;
      const arrow = await ev(`getComputedStyle(document.querySelector('${rsel} .caret'), '::after').content`);
      const opened = await ev(`(()=>{ const m=document.querySelector('${msel}'), p=document.querySelector('.tb-more .tb-page').getBoundingClientRect(); if(!m) return 'none'; const r=m.getBoundingClientRect(); return r.left >= p.right - 1 ? 'right' : r.right <= p.left + 1 ? 'left' : 'overlap'; })()`);
      arrowRes.push({ w, view: view || 'waterfall', row: rsel, arrow: arrow.includes('‹') ? 'left' : arrow.includes('›') ? 'right' : arrow, opened });
    }
    await esc();
  }
  kase('F4', "each cascading row's arrow points the side its menu opens (› right, ‹ left), at 1470, 1366, 1100, 960 and in the month view",
    arrowRes.length === 10 && arrowRes.every(r => r.arrow === r.opened), { arrowRes });

  // ---- F5: the Text menu ----
  await load(1100, 800);
  const lv5 = await level();
  const cell = await ev("(()=>{ const td=[...document.querySelectorAll('#table-wrap td.sheet-phase-cell')].find(t=>/Writer's Rm wk 3/.test(t.textContent)); if(!td) return null; const b=td.getBoundingClientRect(); for(let x=b.left+6;x<b.right-6;x+=4){ const e=document.elementFromPoint(x,b.top+b.height/2); if(e&&td.contains(e)) return [x,b.top+b.height/2]; } return null; })()");
  await click(...cell); await sleep(300);
  const picked = await ev("document.querySelector('.style-bar').classList.contains('has-target')");
  await clickSel('.tb-text-btn');
  const opened5 = await ev("(()=>{ const h=document.querySelector('.view-toggle-row > .style-bar-host'), b=document.querySelector('.tb-text-btn').getBoundingClientRect(), r=h.getBoundingClientRect(); return h.classList.contains('is-dropped') && r.width > 100 && Math.abs(r.top - (b.bottom + 6)) <= 1; })()");
  const still = await ev("document.querySelector('.style-bar').classList.contains('has-target')");
  await clickSel('.style-bar .hf-b'); await sleep(300);
  const bold = await ev("(()=>{ const td=[...document.querySelectorAll('#table-wrap td.sheet-phase-cell')].find(t=>/Writer's Rm wk 3/.test(t.textContent)); return !!td && [td, ...td.querySelectorAll('*')].some(e=>+getComputedStyle(e).fontWeight>=600); })()");
  await click(1050, 760); await sleep(250);
  const closed5 = await ev("!document.querySelector('.view-toggle-row > .style-bar-host').classList.contains('is-dropped')");
  kase('F5', 'the Text menu (step 4, 1100): a picked cell stays picked when Aa opens the text style buttons under it; Bold applies; a press outside closes it',
    lv5 >= 4 && picked && opened5 && still && bold && closed5, { level: lv5, picked, opened5, still, bold, closed5 });

  // ---- F6: the hammer, the icon-only view toggle ----
  await load(1280, 800);
  const ham = await ev(`(()=>{ const b=document.getElementById('pop-solve-btn'); const sec=b.querySelector('.mantine-Button-section[data-position="left"]'), lab=b.querySelector('.mantine-Button-label');
    return { level: [1,2,3,4,5].filter(k=>document.querySelector('.preview-panel').classList.contains('tbf'+k)).length, icon: !!sec && sec.getClientRects().length > 0 && !!sec.querySelector('svg'),
      label: !!lab && lab.getClientRects().length > 0, title: b.title }; })()`);
  await clickSel('#pop-solve-btn');
  const baOpen = await ev("document.getElementById('pop-solve').classList.contains('open')");
  await load(960, 760);
  const vt960 = await ev("[...document.querySelectorAll('.view-toggle-btn')].map(b=>[b.title, b.querySelector('span').getClientRects().length > 0])");
  await load(1728, 1000);
  const vt1728 = await ev("[...document.querySelectorAll('.view-toggle-btn')].map(b=>[b.title, b.querySelector('span').getClientRects().length > 0])");
  kase('F6', 'step 3: Build Around shows the hammer, not its label, hinted "Build Around…", and opens its panel; step 5: Waterfall and Month are icons named by hover hints; unfolded, no hints',
    ham.level === 3 && ham.icon && !ham.label && /^Build Around/.test(ham.title) && baOpen &&
      JSON.stringify(vt960) === JSON.stringify([['Waterfall', false], ['Month', false]]) && JSON.stringify(vt1728) === JSON.stringify([['', true], ['', true]]),
    { ham, baOpen, vt960, vt1728 });

  // ---- F7: the stepper in the More panel ----
  await load(1366, 800, 'month');
  await clickSel('.tb-more-btn');
  const m0 = await ev("document.querySelector('.tb-more .month-step .ms-label').textContent");
  await clickSel('.tb-more .month-step [data-mvstep="1"]');
  const m1 = await ev("document.querySelector('.tb-more .month-step .ms-label').textContent");
  kase('F7', 'the month stepper in the More panel steps the month (1366, month view)', !!m0 && !!m1 && m0 !== m1, { m0, m1 });

  // ---- F8: unfolded, the toolbar's own buttons ----
  await load(1728, 1000);
  await clickSel('#tb-side-boxes-btn'); await sleep(200);
  const under = await ev("(()=>{ const m=document.querySelector('.sb-menu'); if(!m) return false; const r=m.getBoundingClientRect(), b=document.getElementById('tb-side-boxes-btn').getBoundingClientRect(); return Math.abs(r.top-b.bottom-5)<=1 && Math.abs(r.left-b.left)<=1; })()");
  await clickSel('#tb-side-boxes-btn'); await sleep(200);
  const gone = await ev("!document.querySelector('.sb-menu')");
  kase('F8', "unfolded (1728): Side Boxes' menu drops under its own button, and a second click closes it", under && gone, { under, gone });

  kase('Z', 'no page error or console error in any case', !out.errors.length, { errors: out.errors.slice(0, 5) });
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'toolbarfit threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`toolbarfit: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
