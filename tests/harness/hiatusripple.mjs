// hiatusripple.mjs -- a hiatus change moves the phases after it (HIATUS-RIPPLE-PLAN.md; owner, 4 Nov 2026: "editing a
// hiatus (either all phase or per phase) can automatically ripple the whole calendar to adjust all the phases. It should be
// very clear how to turn it on or off"). Rulings by picker the same day: R1 one on/off switch, no question, ON by
// default; R2 also on the hiatus cards (WITHDRAWN 10 Nov 2026: the owner's "Settings only"); R3 kept on this computer;
// R4 a phase's own hiatus moves every phase starting on or after it; R5 a moved hiatus is followed.
//
//   node hiatusripple.mjs [--page /dist/index.html] [--port 8234]
//   node hiatusripple.mjs --record        writes tests/fixtures/hiatusripple.sptcal (run once, on a build with the feature)
//
// Writes hiatusripple.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges like hiatusdrag.json.
//
// ⛔ WHY A NODE SCRIPT, NOT A t/ LEG: the ripple runs when an edit SETTLES (focus leaves the hiatus's Starts / Weeks, Enter,
// or a pick in the date popover), never per keystroke. Only CDP's Input.dispatch* is trusted input that moves focus the way
// a user's Tab and click do, and the year typed digit by digit is the hazard being proved. So every edit here is real keys
// and real clicks; code writes appear only where a case proves that code writes do NOT ripple.
//
// hiatusripple.sptcal (synthetic: made-up dates, no region, so no holidays). Week N = the Monday 1/5/26 + (N-1) weeks.
//   Pre Prep     Mon 1/5/26 (wk 1) x 8 weeks
//   Break        all-phase, Mon 2/16/26 (wk 7) x 2, UNLOCKED (so it can be dragged), paused Pre Prep to wk 10
//   Production   Mon 3/16/26 (wk 11), 12 episodes x 5 days, wraps Fri 6/5/26   (example A of the plan, already pushed)
//   Post         Mon 4/27/26 (wk 17) x 10 weeks
//   Summer Break all-phase, Mon 8/17/26 x 1, UNLOCKED (moves with every push)
//   New's four winter breaks, 12/21/26 and on, LOCKED (held by every push)
//   notes: "Undated note" on the week of 5/18/26 (moves); "Wrap party 6/10/26" on the week of 6/8/26 with its Day set to
//   Wed 6/10 (a note carrying a date: stays)
//
//   R0  the switch: ON with no preference stored; ONE switch, Settings > Preferences > Hiatus, checked and named Ripple
//       Hiatus Periods, in a .prefs-card; no copy anywhere else (owner, 10 Nov 2026: "Settings only" -- until then the
//       All-phase card and every phase's Hiatus block carried one); a Save holds no ripple key and the same fields.byId ids
//       as the fixture
//   R1  Break's Weeks 2 -> 3 by ArrowUp pushes AT ONCE, focus still in the box (owner, 5 Nov 2026: "it should do it
//       immediately"): Production, Post, Summer Break and the undated note 1 wk; Pre Prep, the dated note and the locked
//       breaks stay; the line under the Break reads "Pushed 1 wk: Production, Post · Wrap 6/12/26". Tab onto Lock in
//       place then moves nothing more and KEEPS the line
//   R2  undo/redo: ONE undo takes back the push and keeps Weeks 3; a second takes back Weeks 3; redo twice comes back; none
//       of it ripples again
//   R3  ArrowUp twice: two pushes of 1 week, each at once (Production 3/23, then 3/30; "Pushed 1 wk: Production, Post ·
//       Wrap 6/19/26"); ONE undo takes back the second push alone (Weeks 4 kept, Production 3/23)
//   R4  R5's move by typing: Break's Starts typed 0 4 1 3 2 0 2 6, digit by digit (the year passes through 0002 / 0020 /
//       0202): nothing moves while typing, nor on Tab to its own Weeks; Tab on to Lock in place pulls Production back to
//       3/2 and leaves Post on 4/27 (out at wk 7, in at wk 15); "Pulled 2 wks: Production · Wrap 6/5/26"
//   R5  a typed number pushes at once too: 5 over the 2 pushes 3 wks; Backspace to an empty box moves nothing (a number is
//       still coming); 3 pulls 2 wks back; Enter then moves nothing and keeps the line; ONE undo takes back that pull alone
//       (Weeks 3 kept, Production 4/6), though it came inside the 500 ms undo debounce
//   R6  the row's ×, answered Remove: Production 3/2, Post 4/13, Summer Break 8/3, the undated note 5/4; the line goes
//       at the top of the All-phase card (.hiatus-ripple-card), "Pulled 2 wks: Production, Post · Wrap 5/22/26"
//   R7  a phase starting INSIDE the hiatus (Post typed 2/23, in the Break) lands the break's 2 weeks before where it really
//       started: 2/16, not 2/9
//   R8  Pre Prep's own hiatus (R4): its switch on (nothing yet, no date), a date PICKED in the popover (Mon 2/2/26):
//       Production 3/30, Post 5/11, the unlocked Break 3/2, Pre Prep held on 1/5; the line in Pre Prep's block. Its Weeks
//       2 -> 3 by ArrowUp pushes 1 wk at once (the owner's case, 5 Nov 2026). Its switch off: everything back, "Pulled 3 wks"
//   R9  the switch off in Settings: the preference false, Weeks 2 -> 3 moves nothing and writes no line, ONE undo takes
//       back Weeks 3 (the flip banked no step); on again: the preference gone; it survives a reload both ways
//   R10 code writes never ripple: Weeks set by script (no focus), and the fixture's own load
//   R11 the month view's drag, START grip up a row, Keep: the question says "Ripple Hiatus Periods is on (Settings): Pushed 1 wk:
//       Production, Post"; Production 3/23; ONE undo -> the drag without its push (Break 2/9 x 3, Production 3/16), a
//       second -> Break 2/16 x 2
//   R12 the same drag, Undo: every date back as at the press, the undo button as it was
//   R13 the waterfall's right-click Hiatus > All phases on the week of 5/4/26: no phase starts after it, so the line says so;
//       Summer Break 8/31, the undated note 6/1, Production and Post (running) only paused
//   S1-S4 the ripple steps over locked breaks (HIATUS-RIPPLE-PLAN.md §12, owner 6 Nov 2026), on ripplestep.sptcal: S1 Writer's
//       Rm's own hiatus 9/7 x2 pushes Pre Prep and Post 2 wks and Prod Prep 4 (its start crosses the locked 12/21 break);
//       S2 one undo takes the push back; S3 redo, then the switch off pulls Prod Prep back over the break to 12/14; S4 the
//       trap: the all-phase Break 2 -> 3 moves the phase that starts the week after it 1 wk, not 2
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const RECORD = argv.includes('--record');
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8234));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8234 ? PORT : ''}-hiatusripple`;
removeProfileOnExit(PROFILE);
const OUT = arg('out', path.join(HERE, 'hiatusripple.json'));   // --out: a mutant run's result goes elsewhere
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'hiatusripple.sptcal');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'hiatusripple', cases: [] };
setTimeout(() => {
  out.EX = 'hiatusripple: hit its 480 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 480000).unref();
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
    if (m.method === 'Page.javascriptDialogOpening') {
      const id = ++seq; ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const until = async (expr, label, ms = 20000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr).catch(() => false)) return; await sleep(100); }
    throw new Error('timed out waiting for ' + label);
  };
  const mouse = (type, x, y, buttons, button) => send('Input.dispatchMouseEvent',
    { type, x, y, button: button || (type === 'mouseMoved' && !buttons ? 'none' : 'left'), buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
  const clickAt = async (x, y) => {
    await mouse('mouseMoved', x, y, 0); await mouse('mousePressed', x, y, 1); await mouse('mouseReleased', x, y, 0);
    await sleep(300);
  };
  // An element's box, scrolled to the middle of its scroll box first. `sel` is a selector or an expression.
  const box = sel => ev(`(() => { const e = ${sel.startsWith('(') ? sel : `document.querySelector(${JSON.stringify(sel)})`};
    if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, w: r.width, h: r.height }; })()`);
  // A real click on an element; it must be the element on top at that point (or inside it).
  const click = async (sel, dx) => {
    const b = await box(sel);
    if (!b) throw new Error('nothing to click: ' + sel);
    await sleep(150);
    const x = dx != null ? b.l + dx : b.x;
    await clickAt(x, b.y);
    return b;
  };
  const KEYS = { Tab: ['Tab', 9], Enter: ['Enter', 13, '\r'], ArrowUp: ['ArrowUp', 38], ArrowLeft: ['ArrowLeft', 37], Escape: ['Escape', 27], Backspace: ['Backspace', 8] };
  const press = async k => {
    const [code, vk, text] = KEYS[k];
    await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
    await sleep(150);
  };
  const typeDigits = async s => {
    for (const d of s) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: d, code: 'Digit' + d, text: d, windowsVirtualKeyCode: 48 + Number(d) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: d, code: 'Digit' + d, windowsVirtualKeyCode: 48 + Number(d) });
      await sleep(120);
    }
  };

  await send('Page.enable');
  // Every uncaught page error, for E0.
  const pageErrors = [];
  await send('Runtime.enable');
  const prevOnMessage = ws.onmessage;
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') pageErrors.push(String(m.params.exceptionDetails && (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text)).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') pageErrors.push(m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300));
    prevOnMessage(e); };
  // Each load starts from the users' default (no preference stored), unless the case asked to keep it across ONE reload.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try {
    if (sessionStorage.getItem('ripple.keep') !== '1') { const o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
      delete o.hiatusRipple; localStorage.setItem('sptcal.prefs', JSON.stringify(o)); }
    sessionStorage.removeItem('ripple.keep'); } catch (e) {}` });

  // The page's own helpers: code writes (the native setter + input and change, never focus), and the fake save handle.
  const HELPERS = `window.__rp = {
    set(el, v){ const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      ['input', 'change'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); },
    // ONE handle per page: after the first Save the file is linked, and every later Save writes back to it.
    written: [],
    async save(){
      const written = this.written, n = written.length;
      if (!this.h) {
        const h = this.h = { name: 'hiatusripple.sptcal', kind: 'file', queryPermission: async () => 'granted', requestPermission: async () => 'granted',
          isSameEntry: async o => o === h, getFile: async () => new File([written[written.length - 1] || ''], 'hiatusripple.sptcal', { lastModified: 1 }),
          createWritable: async () => { const parts = []; return { write: async c => { parts.push(typeof c === 'string' ? c : await c.text()); },
            close: async () => { written.push(parts.join('')); } }; } };
        window.showSaveFilePicker = async () => h;
      }
      document.getElementById('save-file-btn').click();
      for (let i = 0; i < 100 && written.length === n; i++) await new Promise(r => setTimeout(r, 100));
      return written.length > n ? written[written.length - 1] : null;
    } };`;

  const fresh = async (url) => {
    await send('Page.navigate', { url });
    await sleep(300);
    await until(`!!document.getElementById('start-production') && !!document.querySelector('#hiatus-list .hiatus-entry')`, 'the engine');
    await sleep(800);
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(300);
    await ev(HELPERS);
  };
  const toPhases = async () => {
    await ev(`(() => { const b = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (b && !b.classList.contains('active')) b.click(); return true; })()`);
    await sleep(300);
    // Every hiatus card unfolded, so its boxes can be clicked.
    await ev(`(() => { document.querySelectorAll('#hiatus-list .hiatus-entry.is-collapsed .hiatus-collapse-btn').forEach(b => b.click()); return true; })()`);
    await sleep(200);
  };
  const load = async () => { await fresh(`http://localhost:${PORT}${PAGE}?state=hiatusripple`); await toPhases(); };

  // ---------------------------------------------------------------- the fixture (--record) ----------------------------------
  if (RECORD) {
    await fresh(`http://localhost:${PORT}${PAGE}`);
    await ev(`(async () => {
      const $ = id => document.getElementById(id), S = (id, v) => __rp.set($(id), v), W = ms => new Promise(r => setTimeout(r, ms));
      S('show-title', 'Hiatus Ripple Test'); S('season-num', '1'); S('num-episodes', '12'); S('shoot-days-per-ep', '5');
      S('start-prePrep', '2026-01-05'); S('weeks-prePrep', '8');
      S('start-production', '2026-03-16'); S('start-post', '2026-04-27'); S('weeks-post', '10');
      const add = async (start, weeks, name) => {
        $('add-hiatus').click(); await W(200);
        const row = Array.from(document.querySelectorAll('#hiatus-list .hiatus-entry')).pop();
        __rp.set(row.querySelector('.hiatus-start'), start); __rp.set(row.querySelector('.hiatus-weeks'), String(weeks));
        __rp.set(row.querySelector('.hiatus-name'), name);
        const lk = row.querySelector('.hiatus-locked'); if (lk.checked) lk.click();
        await W(200);
      };
      await add('2026-02-16', 2, 'Break');
      await add('2026-08-17', 1, 'Summer Break');
      await W(800);
      return true; })()`);
    const text = await ev(`__rp.save()`);
    if (!text) throw new Error('the Save wrote nothing');
    const snap = JSON.parse(text);
    snap.userNotes = Object.assign({}, snap.userNotes || {}, { '2026-05-18': { text: 'Undated note' }, '2026-06-08': { text: 'Wrap party 6/10/26', date: '2026-06-10' } });
    fs.writeFileSync(FIXTURE, JSON.stringify(snap));
    kase('REC', 'wrote ' + path.relative(ROOT, FIXTURE), true, { hiatuses: snap.fields && snap.fields.hiatuses });
    throw { recorded: true };
  }

  // ---------------------------------------------------------------- reading the calendar ------------------------------------
  const st = () => ev(`(() => {
    const $ = id => document.getElementById(id), v = id => ($(id) || {}).value;
    const rows = Array.from(document.querySelectorAll('#hiatus-list .hiatus-entry')).map(r => ({
      name: r.querySelector('.hiatus-name').value, start: r.querySelector('.hiatus-start').value, weeks: r.querySelector('.hiatus-weeks').value,
      locked: r.querySelector('.hiatus-locked').checked, note: ((r.querySelector('.ripple-note:not([hidden])') || {}).textContent || '') }));
    const by = Object.fromEntries(rows.map(r => [r.name || '(blank)', r.start + '/' + r.weeks]));
    const pref = (() => { try { return JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); } catch (e) { return {}; } })();
    const u = $('undo-btn'), rd = $('redo-btn'), off = b => !!b && (b.disabled || b.hasAttribute('data-disabled'));
    return { pre: v('start-prePrep'), prod: v('start-production'), post: v('start-post'), rows, by,
      ppHi: { on: ($('phiatus-en-prePrep') || {}).checked, start: v('phiatus-start-prePrep'), weeks: v('phiatus-weeks-prePrep') },
      cardNote: ((document.querySelector('.hiatus-ripple-card .ripple-note:not([hidden])') || {}).textContent || ''),
      ppNote: ((($('phiatus-fields-prePrep') || {}).parentElement || document).querySelector(':scope > .ripple-note:not([hidden])') || {}).textContent || '',
      notes: Array.from(document.querySelectorAll('.ripple-note:not([hidden])')).map(n => n.textContent),
      pref: Object.prototype.hasOwnProperty.call(pref, 'hiatusRipple') ? pref.hiatusRipple : 'absent',
      // The one switch, and how many copies of it are drawn anywhere else (none since 10 Nov 2026, "Settings only").
      sw: { settings: ($('pref-hiatus-ripple') || {}).checked, copies: document.querySelectorAll('.hiatus-ripple-cb, .hiatus-ripple-sw').length },
      active: (document.activeElement && (document.activeElement.className || document.activeElement.tagName)) || '',
      undoOff: off(u), redoOff: off(rd),
      question: Array.from(document.querySelectorAll('.mantine-Modal-content')).map(d => d.innerText.replace(/\\s+/g, ' ').trim()).join(' || ') }; })()`);
  const saved = async () => JSON.parse(await ev(`__rp.save()`));
  const rowSel = name => `(Array.from(document.querySelectorAll('#hiatus-list .hiatus-entry')).find(r => r.querySelector('.hiatus-name').value === ${JSON.stringify(name)}))`;
  const inRow = (name, cls) => `(${rowSel(name)}.querySelector(${JSON.stringify(cls)}))`;
  const undoBtn = async () => { await click('#undo-btn'); await sleep(700); };
  const redoBtn = async () => { await click('#redo-btn'); await sleep(700); };
  const notesOf = s => Object.keys(s.userNotes || {}).sort().map(k => k + ':' + (s.userNotes[k].text || ''));
  const winter = s => s.rows.filter(r => !r.name).map(r => r.start + '/' + r.weeks + (r.locked ? 'L' : '')).join(',');
  const WINTER = '2026-12-21/2L,2027-12-20/2L,2028-12-18/2L,2029-12-17/2L';

  // ---- R0: the one switch, no copies, and the file ----------------------------------------------------------------------
  await load();
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  {
    const s = await st();
    const ids = await ev(`({ settings: !!document.getElementById('pref-hiatus-ripple'), inPrefsCard: !!(document.getElementById('pref-hiatus-ripple') || { closest: () => null }).closest('.prefs-card'),
      name: ((document.querySelector('label[for="pref-hiatus-ripple"]') || {}).textContent || '').trim(),
      // The All-phase card's spot is only the home of a removed hiatus's line now: empty, no height.
      card: (() => { const c = document.querySelector('.hiatus-ripple-card'); return c ? { kids: c.children.length, h: c.getBoundingClientRect().height } : null; })(),
      // Pre Prep's Hiatus block's own switches: Number weeks alone.
      ppSwitches: Array.from((document.getElementById('phiatus-fields-prePrep') || document.createElement('div')).querySelectorAll('.sw-label')).map(e => e.textContent.trim()) })`);
    const sv = await saved();
    const keys = Object.keys(sv.fields.byId), fkeys = Object.keys(fixture.fields.byId);
    out.R0 = { s, ids, keys: keys.length, fkeys: fkeys.length, json: JSON.stringify(sv).match(/hiatusRipple|ripple-note|hiatus-ripple/g) };
    kase('R0', 'ON with no preference stored: ONE switch, Settings > Preferences > Hiatus, checked, named Ripple Hiatus Periods, in a .prefs-card; no copy on the All-phase card (its spot empty, 0 px) or in Pre Prep\'s Hiatus block (Number weeks alone) -- "Settings only", 10 Nov 2026; a Save holds no ripple key and exactly the fixture\'s fields.byId ids',
         s.pref === 'absent' && s.sw.settings === true && s.sw.copies === 0
         && ids.settings && ids.inPrefsCard && ids.name === 'Ripple Hiatus Periods'
         && ids.card && ids.card.kids === 0 && ids.card.h === 0 && JSON.stringify(ids.ppSwitches) === '["Number weeks"]'
         && !out.R0.json && JSON.stringify(keys) === JSON.stringify(fkeys)
         && s.prod === '2026-03-16' && s.by.Break === '2026-02-16/2', out.R0);
  }

  // ---- R1 + R2: Weeks 2 -> 3, Tab; undo / redo ------------------------------------------------------------------------
  {
    await click(inRow('Break', '.hiatus-weeks'));
    await press('ArrowUp');
    await sleep(700);
    const mid = await st();                          // focus still in Weeks: already pushed
    const sv = await saved();
    await press('Tab');
    await sleep(600);
    const after = await st();
    const LINE = 'Pushed 1 wk: Production, Post · Wrap 6/12/26';
    out.R1 = { mid, after: { prod: after.prod, post: after.post, by: after.by, active: after.active, rows: after.rows }, notes: notesOf(sv) };
    kase('R1', 'Break Weeks 2 -> 3 by ArrowUp pushes AT ONCE, focus still in the box: Production 3/23, Post 5/4, Summer Break 8/24, the undated note 5/25; Pre Prep, the dated note and the locked winter breaks stay; the line "Pushed 1 wk: Production, Post · Wrap 6/12/26"; Tab onto Lock in place moves nothing more and keeps the line',
         /hiatus-weeks/.test(mid.active) && mid.by.Break === '2026-02-16/3'
         && mid.prod === '2026-03-23' && mid.post === '2026-05-04' && mid.pre === '2026-01-05'
         && mid.by['Summer Break'] === '2026-08-24/1' && winter(mid) === WINTER
         && (mid.rows.find(r => r.name === 'Break') || {}).note === LINE
         && out.R1.notes.join('|') === '2026-05-25:Undated note|2026-06-08:Wrap party 6/10/26'
         && /hiatus-locked/.test(after.active) && after.prod === '2026-03-23' && after.post === '2026-05-04' && after.by.Break === '2026-02-16/3'
         && (after.rows.find(r => r.name === 'Break') || {}).note === LINE, out.R1);

    await undoBtn(); const u1 = await st();
    await undoBtn(); const u2 = await st();
    await redoBtn(); const r1 = await st();
    await redoBtn(); const r2 = await st();
    out.R2 = { u1: [u1.prod, u1.by.Break], u2: [u2.prod, u2.by.Break], r1: [r1.prod, r1.by.Break], r2: [r2.prod, r2.by.Break], notes: [u1.notes, r2.notes] };
    kase('R2', 'ONE undo takes back the push and keeps Weeks 3 (Production 3/16); a second takes back Weeks 3; redo, redo comes back to 3/23; nothing ripples on the way',
         u1.prod === '2026-03-16' && u1.by.Break === '2026-02-16/3' && u2.prod === '2026-03-16' && u2.by.Break === '2026-02-16/2'
         && r1.prod === '2026-03-16' && r1.by.Break === '2026-02-16/3' && r2.prod === '2026-03-23' && r2.by.Break === '2026-02-16/3'
         && u1.post === '2026-04-27' && r2.post === '2026-05-04', out.R2);
  }

  // ---- R3: two ArrowUps, two pushes ---------------------------------------------------------------------------------------
  await load();
  {
    await click(inRow('Break', '.hiatus-weeks'));
    await press('ArrowUp'); await sleep(500);
    const one = await st();
    await press('ArrowUp'); await sleep(700);
    const two = await st();
    await undoBtn();
    const back = await st();
    out.R3 = { one: [one.prod, one.by.Break], two: [two.prod, two.post, two.by.Break, two.active], line: (two.rows.find(r => r.name === 'Break') || {}).note, back: [back.prod, back.by.Break] };
    kase('R3', 'ArrowUp twice (2 -> 3 -> 4): a push of 1 week at each, Production 3/23 then 3/30, Post 5/11, focus still in Weeks; "Pushed 1 wk: Production, Post · Wrap 6/19/26"; ONE undo takes back the second push alone (Weeks 4, Production 3/23)',
         one.prod === '2026-03-23' && one.by.Break === '2026-02-16/3'
         && two.prod === '2026-03-30' && two.post === '2026-05-11' && two.by.Break === '2026-02-16/4' && /hiatus-weeks/.test(two.active)
         && out.R3.line === 'Pushed 1 wk: Production, Post · Wrap 6/19/26'
         && back.prod === '2026-03-23' && back.by.Break === '2026-02-16/4', out.R3);
  }

  // ---- R4: the move, typed digit by digit -------------------------------------------------------------------------------
  await load();
  {
    const b = await click(inRow('Break', '.hiatus-start'), 14);   // the month segment
    const seen = [];
    for (const d of '04132026') {
      await typeDigits(d);
      const s = await st();
      seen.push(s.by.Break + ' ' + s.prod);
    }
    await press('Escape');                                         // closes the date popover only
    await press('Tab'); await sleep(400);
    const atWeeks = await st();
    await press('Tab'); await sleep(700);
    const after = await st();
    const sv = await saved();
    out.R4 = { box: b, seen, atWeeks: [atWeeks.prod, atWeeks.by.Break, atWeeks.active], after, notes: notesOf(sv) };
    kase('R4', 'Break\'s Starts typed 04/13/2026 digit by digit: Production never moves while typing (the year passes 0002, 0020, 0202) nor on Tab to its own Weeks; Tab on to Lock in place pulls Production back to 3/2 and leaves Post on 4/27 and the undated note on 5/18; "Pulled 2 wks: Production · Wrap 6/5/26"',
         seen.every(x => / 2026-03-16$/.test(x)) && atWeeks.prod === '2026-03-16' && /hiatus-weeks/.test(atWeeks.active)
         && after.by.Break === '2026-04-13/2' && after.prod === '2026-03-02' && after.post === '2026-04-27' && after.pre === '2026-01-05'
         && after.by['Summer Break'] === '2026-08-17/1' && winter(after) === WINTER
         && (after.rows.find(r => r.name === 'Break') || {}).note === 'Pulled 2 wks: Production · Wrap 6/5/26'
         && out.R4.notes.join('|') === '2026-05-18:Undated note|2026-06-08:Wrap party 6/10/26', out.R4);
  }

  // ---- R5: a typed number pushes at once; an emptied box waits; Enter after it changes nothing -------------------------------
  await load();
  {
    await click(inRow('Break', '.hiatus-weeks'));
    await ev(`${inRow('Break', '.hiatus-weeks')}.select(), true`);   // selects the 2 (moves nothing), as a double-click would
    await typeDigits('5'); await sleep(600);
    const five = await st();
    await sleep(900);                                  // everything so far banked
    await press('Backspace'); await sleep(600);
    const empty = await st();
    await typeDigits('3'); await press('Enter'); await sleep(600);   // ~150 ms apart: inside the undo debounce
    const three = await st();
    // The 3 came within the 500 ms undo debounce of the emptied box, so only the ripple's own banking makes it a step of its
    // own: one undo must take back the pull and keep Weeks 3.
    await undoBtn();
    const back = await st();
    const line = s => (s.rows.find(r => r.name === 'Break') || {}).note;
    out.R5 = { five: [five.prod, five.by.Break, five.active], empty: [empty.prod, empty.by.Break], three: [three.prod, three.post, three.by.Break, three.active, line(three)], back: [back.prod, back.by.Break] };
    kase('R5', 'a typed 5 over the 2 pushes 3 wks at once (Production 4/6); Backspace to an empty box moves nothing; a typed 3 pulls 2 wks (Production 3/23, Post 5/4) and Enter after it moves nothing and keeps "Pulled 2 wks: Production, Post · Wrap 6/12/26"; ONE undo takes back the pull alone (Weeks 3, Production 4/6)',
         five.prod === '2026-04-06' && five.by.Break === '2026-02-16/5' && /hiatus-weeks/.test(five.active)
         && empty.prod === '2026-04-06' && empty.by.Break === '2026-02-16/'
         && three.prod === '2026-03-23' && three.post === '2026-05-04' && three.by.Break === '2026-02-16/3' && /hiatus-weeks/.test(three.active)
         && line(three) === 'Pulled 2 wks: Production, Post · Wrap 6/12/26'
         && back.prod === '2026-04-06' && back.by.Break === '2026-02-16/3', out.R5);
  }

  // ---- R6: the row's × ------------------------------------------------------------------------------------------------------
  await load();
  {
    await click(inRow('Break', '.remove-hiatus'));
    await until(`Array.from(document.querySelectorAll('.mantine-Modal-content')).some(d => /Remove this hiatus/.test(d.innerText))`, 'the Remove question', 5000);
    await click(`(Array.from(document.querySelectorAll('.mantine-Modal-content button')).find(b => (b.innerText || '').trim() === 'Remove'))`);
    await sleep(800);
    const after = await st();
    const sv = await saved();
    out.R6 = { after, notes: notesOf(sv) };
    kase('R6', 'the row\'s × answered Remove: Production 3/2, Post 4/13, Summer Break 8/3, the undated note 5/4; the line at the top of the All-phase card, "Pulled 2 wks: Production, Post · Wrap 5/22/26"',
         !after.by.Break && after.prod === '2026-03-02' && after.post === '2026-04-13' && after.by['Summer Break'] === '2026-08-03/1'
         && winter(after) === WINTER && after.cardNote === 'Pulled 2 wks: Production, Post · Wrap 5/22/26'
         && out.R6.notes.join('|') === '2026-05-04:Undated note|2026-06-08:Wrap party 6/10/26', out.R6);
  }

  // ---- R7: a phase that starts inside the hiatus ---------------------------------------------------------------------------
  await load();
  {
    await ev(`__rp.set(document.getElementById('start-post'), '2026-02-23'), true`);   // a code write: no ripple
    await sleep(600);
    const mid = await st();
    await click(inRow('Break', '.remove-hiatus'));
    await until(`Array.from(document.querySelectorAll('.mantine-Modal-content')).some(d => /Remove this hiatus/.test(d.innerText))`, 'the Remove question', 5000);
    await click(`(Array.from(document.querySelectorAll('.mantine-Modal-content button')).find(b => (b.innerText || '').trim() === 'Remove'))`);
    await sleep(800);
    const after = await st();
    out.R7 = { mid: [mid.prod, mid.post], after: [after.prod, after.post] };
    kase('R7', 'Post typed to start 2/23, inside the Break (it really starts 3/2); removing the Break lands it on 2/16, the break\'s 2 weeks before where it really started (not 2/9); Production 3/2',
         mid.prod === '2026-03-16' && mid.post === '2026-02-23' && after.post === '2026-02-16' && after.prod === '2026-03-02', out.R7);
  }

  // ---- R8: Pre Prep's own hiatus, a date picked in the popover, then its switch off -------------------------------------------
  await load();
  {
    await click(`(document.getElementById('phiatus-en-prePrep').closest('label'))`);
    await sleep(500);
    const on = await st();
    await click('#phiatus-start-prePrep');
    await until(`!!document.querySelector('.date-pop')`, 'the date popover', 5000);
    for (let i = 0; i < 24; i++) {
      const t = await ev(`(document.querySelector('.date-pop .dp-title') || {}).textContent`);
      if (t === 'February 2026') break;
      const prev = /2026|2027/.test(t) && Date.parse('1 ' + t) > Date.parse('1 February 2026');
      await click(`(document.querySelector('.date-pop [aria-label="${prev ? 'Previous' : 'Next'} month"]'))`);
    }
    await click(`(Array.from(document.querySelectorAll('.date-pop .dp-day:not(.dp-out)')).find(b => b.textContent.trim() === '2'))`);
    await sleep(800);
    const picked = await st();
    // The owner's case (5 Nov 2026): a phase's own hiatus lengthened 2 -> 3 in its Weeks box pushes AT ONCE, focus kept.
    await click('#phiatus-weeks-prePrep');
    await press('ArrowUp'); await sleep(700);
    const wk = await st();
    await click(`(document.getElementById('phiatus-en-prePrep').closest('label'))`);
    await sleep(800);
    const off = await st();
    out.R8 = { on: [on.prod, on.ppHi], picked, wk: [wk.ppHi, wk.prod, wk.post, wk.pre, wk.by.Break, wk.active, wk.ppNote], off: [off.prod, off.post, off.by.Break, off.ppNote] };
    kase('R8', 'Pre Prep\'s own hiatus: switched on with no date, nothing moves; Mon 2/2/26 picked in the popover pushes Production 3/30, Post 5/11, the unlocked Break 3/2 and holds Pre Prep on 1/5 ("Pushed 2 wks: Production, Post · Wrap 6/19/26" in its block); its Weeks 2 -> 3 by ArrowUp pushes 1 wk AT ONCE, focus kept (Production 4/6, Post 5/18, Break 3/9); switched off, everything comes back ("Pulled 3 wks")',
         on.prod === '2026-03-16' && on.ppHi.on === true
         && picked.ppHi.start === '2026-02-02' && picked.prod === '2026-03-30' && picked.post === '2026-05-11' && picked.pre === '2026-01-05'
         && picked.by.Break === '2026-03-02/2' && winter(picked) === WINTER && picked.ppNote === 'Pushed 2 wks: Production, Post · Wrap 6/19/26'
         && wk.ppHi.weeks === '3' && wk.prod === '2026-04-06' && wk.post === '2026-05-18' && wk.pre === '2026-01-05' && wk.by.Break === '2026-03-09/2'
         && /phiatus-weeks/.test(wk.active) && /^Pushed 1 wk: Production, Post/.test(wk.ppNote)
         && off.prod === '2026-03-16' && off.post === '2026-04-27' && off.by.Break === '2026-02-16/2' && /^Pulled 3 wks: Production, Post/.test(off.ppNote), out.R8);
  }

  // ---- R9: the switch, in Settings (its only place since 10 Nov 2026) --------------------------------------------------------
  // ⚠️ Each flip WAITS for the switch to be on screen and then for the click to land. A fixed sleep after opening Settings
  // was enough while the switch had a copy on the All-phase card to click instead; on a loaded machine (load average 170,
  // 10 Nov 2026) every Settings click landed before the window was drawn, missed, and the case ran on with ripple ON.
  const SW_TRACK = `(document.getElementById('pref-hiatus-ripple').closest('.mantine-Switch-root').querySelector('.mantine-Switch-track'))`;
  // ⛔ MEASURED WHERE IT RESTS, NEVER RIGHT AFTER A scrollIntoView (found 11 Nov 2026 by logging the press): the app's fixed
  // window puts back a scroll that scrollIntoView makes, so the shared click() measured the switch at y=560 and pressed
  // there after it had gone back to y=763 -- into Settings' Automatic notes card. At this window size the switch is on
  // screen as it opens; it is scrolled to only when it is not, and then read again after the window has settled.
  const restAt = async sel => {
    const m = () => ev(`(() => { const e = ${sel}; if (!e) return null; const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, vh: innerHeight }; })()`);
    let b = await m();
    if (b && (b.y < 0 || b.y > b.vh)) { await ev(`(${sel}).scrollIntoView({ block: 'center' }), true`); await sleep(600); b = await m(); }
    return b;
  };
  // Shown = on screen and the TOP element at its own centre: Settings stays mounted while closed, so the track keeps its
  // size then, and a size test alone passed with the window shut.
  const swShown = `(() => { const t = ${SW_TRACK}; if (!t) return false; const r = t.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0) || r.top < 0 || r.bottom > innerHeight) return false;
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!at && t.closest('.mantine-Switch-root').contains(at); })()`;
  const openSettings = async () => {
    if (!(await ev(swShown))) await click('.side-settings-btn');
    await until(swShown, 'the Settings switch on screen', 20000); await sleep(500);
  };
  const closeSettings = async () => {
    if (await ev(swShown)) await click('.side-settings-btn');
    await until(`!${swShown}`, 'Settings closed', 20000); await sleep(300);
  };
  // Clicked once it has held one place for two reads (Settings' cards finish drawing after the window opens).
  const flipRipple = async want => {
    let prev = null, b = null;
    for (let i = 0; i < 50; i++) {
      b = await restAt(SW_TRACK);
      if (prev && b && Math.abs(b.x - prev.x) < 0.5 && Math.abs(b.y - prev.y) < 0.5) break;
      prev = b; await sleep(250);
    }
    if (!b) throw new Error('no Settings switch to click');
    await clickAt(b.x, b.y);
    await until(`(document.getElementById('pref-hiatus-ripple') || {}).checked === ${want}`, 'the switch ' + (want ? 'on' : 'off'), 10000);
    await sleep(300);
  };
  await load();
  {
    await openSettings(); await flipRipple(false);
    const off = await st();
    await closeSettings();
    await toPhases();
    await click(inRow('Break', '.hiatus-weeks'));
    await press('ArrowUp'); await press('Tab'); await sleep(700);
    const edited = await st();
    await undoBtn();
    const undone = await st();
    // On again, from Settings.
    await openSettings(); await flipRipple(true);
    const onAgain = await st();
    // Off, kept across a reload; then on, kept across a reload. Settings is still open for the first flip.
    await flipRipple(false);
    await ev(`sessionStorage.setItem('ripple.keep', '1'), true`);
    await load();
    const reloadedOff = await st();
    await openSettings(); await flipRipple(true);
    await ev(`sessionStorage.setItem('ripple.keep', '1'), true`);
    await load();
    const reloadedOn = await st();
    out.R9 = { off: [off.pref, off.sw], edited: [edited.prod, edited.by.Break, edited.notes], undone: [undone.prod, undone.by.Break],
               onAgain: [onAgain.pref, onAgain.sw], reloadedOff: [reloadedOff.pref, reloadedOff.sw], reloadedOn: [reloadedOn.pref, reloadedOn.sw] };
    const all = (sw, v) => sw.settings === v && sw.copies === 0;
    kase('R9', 'off in Settings: the preference false; Weeks 2 -> 3 then moves nothing and writes no line; ONE undo takes back Weeks 3 (the flip banked no step); on again: the preference gone; off and on each survive a reload; no copy of the switch drawn anywhere',
         off.pref === false && all(off.sw, false)
         && edited.prod === '2026-03-16' && edited.by.Break === '2026-02-16/3' && edited.notes.length === 0
         && undone.by.Break === '2026-02-16/2' && undone.prod === '2026-03-16'
         && onAgain.pref === 'absent' && all(onAgain.sw, true)
         && reloadedOff.pref === false && all(reloadedOff.sw, false) && reloadedOn.pref === 'absent' && all(reloadedOn.sw, true), out.R9);
  }

  // ---- R10: code writes never ripple --------------------------------------------------------------------------------------------
  await load();
  {
    const loaded = await st();
    await ev(`__rp.set(${inRow('Break', '.hiatus-weeks')}, '4'), true`);
    await sleep(700);
    const after = await st();
    out.R10 = { loaded: [loaded.prod, loaded.by.Break], after: [after.prod, after.by.Break, after.notes] };
    kase('R10', 'the fixture loads as saved (Production 3/16), and Weeks written by script (no focus) moves nothing and writes no line',
         loaded.prod === '2026-03-16' && after.by.Break === '2026-02-16/4' && after.prod === '2026-03-16' && after.notes.length === 0, out.R10);
  }

  // ---- R11 + R12: the month view's drag ---------------------------------------------------------------------------------------
  const toMonth = async label => {
    await ev(`document.getElementById('view-month-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap .mv-monthyear')`, 'the month view');
    await sleep(300);
    await ev(`(async () => {
      const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const idx = t => { const [m, y] = String(t).trim().split(/\\s+/); return +y * 12 + M.indexOf(m); };
      const lbl = () => ((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '').trim();
      const want = idx(${JSON.stringify(label)});
      for (let i = 0; i < 40 && idx(lbl()) !== want; i++) {
        document.getElementById(idx(lbl()) < want ? 'mv-next' : 'mv-prev').click();
        await new Promise(r => setTimeout(r, 200));
      }
      document.querySelector('#table-wrap .mv-body').scrollIntoView({ block: 'start' });
      await new Promise(r => setTimeout(r, 300));
      return lbl(); })()`);
    await sleep(300);
  };
  const band = row => ev(`(() => {
    const w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[${row}]; if (!w) return null;
    const wr = w.getBoundingClientRect(), b = w.querySelector('.mv-hiatus-bar');
    if (!b) return { none: true, rowY: (wr.top + wr.bottom) / 2 };
    const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, rowY: (wr.top + wr.bottom) / 2 }; })()`);
  const grips = () => ev(`(() => { const g = Array.from(document.querySelectorAll('.hiatus-grip')).find(x => x.dataset.hiatusEdge === 'start');
    if (!g || g.hidden) return null; const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const startGripUp = async () => {
    await toMonth('February 2026');
    const b2 = await band(2), b1 = await band(1);
    await mouse('mouseMoved', 5, 5, 0); await sleep(150);
    await mouse('mouseMoved', b2.x, b2.y, 0); await sleep(300);
    const g = await grips();
    if (!g) throw new Error('no start grip on the Break\'s first week');
    await mouse('mouseMoved', g.x, g.y, 0);
    await mouse('mousePressed', g.x, g.y, 1); await sleep(150);
    await mouse('mouseMoved', g.x, b1.rowY, 1); await sleep(400);
    await mouse('mouseReleased', g.x, b1.rowY, 0); await sleep(900);
  };
  const answer = async label => {
    await until(`Array.from(document.querySelectorAll('.mantine-Modal-content')).some(d => /Move hiatus/.test(d.innerText))`, 'the Move hiatus question', 5000);
    await click(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Move hiatus/.test(d.innerText));
      return m && Array.from(m.querySelectorAll('button')).find(e => (e.innerText || '').trim() === ${JSON.stringify(label)}); })()`);
    await sleep(900);
  };
  await load();
  {
    const pre = await st();
    await startGripUp();
    const asked = await st();
    await answer('Keep');
    const kept = await st();
    await undoBtn(); const u1 = await st();
    await undoBtn(); const u2 = await st();
    out.R11 = { question: asked.question, asked: [asked.prod, asked.by.Break], kept: [kept.prod, kept.post, kept.by.Break, kept.by['Summer Break']],
                u1: [u1.prod, u1.by.Break], u2: [u2.prod, u2.by.Break], preUndoOff: pre.undoOff };
    kase('R11', 'month view, the Break\'s START grip up a row: the question says "Ripple Hiatus Periods is on (Settings): Pushed 1 wk: Production, Post"; Keep: Break 2/9 x 3, Production 3/23, Post 5/4, Summer Break 8/24; ONE undo -> Break 2/9 x 3 with Production 3/16; a second -> 2/16 x 2',
         /Ripple Hiatus Periods is on \(Settings\): Pushed 1 wk: Production, Post/.test(asked.question) && asked.prod === '2026-03-23'
         && kept.prod === '2026-03-23' && kept.post === '2026-05-04' && kept.by.Break === '2026-02-09/3' && kept.by['Summer Break'] === '2026-08-24/1'
         && u1.prod === '2026-03-16' && u1.by.Break === '2026-02-09/3' && u2.prod === '2026-03-16' && u2.by.Break === '2026-02-16/2', out.R11);
  }
  await load();
  {
    const pre = await st();
    await startGripUp();
    await answer('Undo');
    const after = await st();
    // "Nothing banked": the press banks whatever came before it (here the switch to the Phases tab, which is saved state,
    // with or without the ripple), so the next undo goes back to the calendar as LOADED. A banked drag, or a banked push,
    // would bring Break 2/9 x 3 or Production 3/23 back instead.
    await undoBtn();
    const next = await st();
    out.R12 = { pre: [pre.prod, pre.post, pre.by], after: [after.prod, after.post, after.by, after.notes], next: [next.prod, next.post, next.by, next.undoOff] };
    const same = x => x.prod === pre.prod && x.post === pre.post && JSON.stringify(x.by) === JSON.stringify(pre.by);
    kase('R12', 'the same drag answered Undo: every date as at the press (Production, Post, every hiatus), no line; nothing banked (the next undo changes no date and leaves the stack empty)',
         same(after) && after.notes.length === 0 && !after.question && same(next) && next.undoOff === true, out.R12);
  }

  // ---- R13: the waterfall's right-click, Hiatus > All phases -----------------------------------------------------------------
  await load();
  {
    await ev(`document.getElementById('view-sheet-btn').click(), true`);
    await until(`!!document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="production"][data-week="2026-05-04"]')`, 'the waterfall');
    await sleep(300);
    const opened = await ev(`(async () => {
      const td = document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="production"][data-week="2026-05-04"]:not(.sheet-hiatus-cell)');
      td.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 300));
      const r = td.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      (document.elementFromPoint(x, y) || td).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 2, buttons: 2 }));
      await new Promise(r => setTimeout(r, 200));
      const m = document.querySelector('.day-menu'); if (!m) return 'no menu';
      m.querySelector('[data-item="hiatus"]').click(); await new Promise(r => setTimeout(r, 200));
      const sub = document.querySelector('.day-menu-sub'); if (!sub) return 'no submenu';
      sub.querySelector('[data-item="hiatus-all"]').click(); await new Promise(r => setTimeout(r, 800));
      return 'ok'; })()`);
    const after = await st();
    await toPhases();
    const shown = await st();
    const sv = await saved();
    const added = after.rows.find(r => r.start === '2026-05-04');
    out.R13 = { opened, after: [after.prod, after.post, after.by['Summer Break']], added, notes: notesOf(sv), shown: shown.notes };
    kase('R13', 'right-click Hiatus > All phases on the week of 5/4/26: a 2-week hiatus there; no phase starts after it ("No phase starts after it to push"), Production and Post are only paused; Summer Break 8/31 and the undated note 6/1 move',
         opened === 'ok' && !!added && added.weeks === '2' && after.prod === '2026-03-16' && after.post === '2026-04-27'
         && after.by['Summer Break'] === '2026-08-31/1' && added.note === 'No phase starts after it to push'
         && out.R13.notes.join('|') === '2026-06-01:Undated note|2026-06-08:Wrap party 6/10/26', out.R13);
  }

  // ---- S1-S4: the ripple steps over locked breaks (HIATUS-RIPPLE-PLAN.md §12, owner 6 Nov 2026, "Build it") -------------
  // ripplestep.sptcal (synthetic): Writer's Rm 8/3/26 x12, Pre Prep 11/2 x6 (A), Prod Prep 12/14 x4 (B, the locked 12/21 x2
  // break inside it), Post 1/25/27 x10 (C); an unlocked all-phase Break 9/28/26 x2; the locked December breaks.
  const loadStep = async () => { await fresh(`http://localhost:${PORT}${PAGE}?state=ripplestep`); await toPhases(); };
  const stepState = () => ev(`(() => {
    const $ = id => document.getElementById(id), v = id => ($(id) || {}).value;
    const rows = Array.from(document.querySelectorAll('#hiatus-list .hiatus-entry'));
    const br = rows.find(r => r.querySelector('.hiatus-name').value === 'Break');
    const wrBlock = (($('phiatus-fields-writersRoom') || {}).parentElement) || null;
    return { wr: v('start-writersRoom'), a: v('start-prePrep'), b: v('start-prodPrep'), c: v('start-post'),
      wrHi: v('phiatus-start-writersRoom') + '/' + v('phiatus-weeks-writersRoom') + '/' + !!($('phiatus-en-writersRoom') || {}).checked,
      brk: br ? br.querySelector('.hiatus-start').value + '/' + br.querySelector('.hiatus-weeks').value : '',
      locked: rows.filter(r => r.querySelector('.hiatus-locked').checked).map(r => r.querySelector('.hiatus-start').value).join(','),
      wrLine: wrBlock ? ((wrBlock.querySelector(':scope > .ripple-note:not([hidden])') || {}).textContent || '') : '',
      brLine: br ? ((br.querySelector('.ripple-note:not([hidden])') || {}).textContent || '') : '',
      active: (document.activeElement && (document.activeElement.className || document.activeElement.tagName)) || '' }; })()`);
  const LOCKED = '2026-12-21,2027-12-20,2028-12-18,2029-12-17';
  await loadStep();
  {
    const s0 = await stepState();
    await click(`(document.getElementById('phiatus-en-writersRoom').closest('label'))`);
    await sleep(500);
    await click('#phiatus-start-writersRoom');
    await until(`!!document.querySelector('.date-pop')`, 'the date popover', 5000);
    for (let i = 0; i < 30; i++) {
      const t = await ev(`(document.querySelector('.date-pop .dp-title') || {}).textContent`);
      if (t === 'September 2026') break;
      const later = Date.parse('1 ' + t) > Date.parse('1 September 2026');
      await click(`(document.querySelector('.date-pop [aria-label="${later ? 'Previous' : 'Next'} month"]'))`);
    }
    await click(`(Array.from(document.querySelectorAll('.date-pop .dp-day:not(.dp-out)')).find(b => b.textContent.trim() === '7'))`);
    await sleep(900);
    const s1 = await stepState();
    out.S1 = { s0, s1 };
    kase('S1', 'Writer\'s Rm\'s own hiatus, Mon 9/7/26 x2 picked: Pre Prep 11/2 -> 11/16 and Post 1/25 -> 2/8 (2 wks), Prod Prep 12/14 -> 1/11/27 (4 wks: its start crosses the locked 12/21 break, so it steps over it); the unlocked Break 9/28 -> 10/12; Writer\'s Rm and every locked break stay; the line "Pushed 4 wks: Prod Prep · Pushed 2 wks: Pre Prep, Post"',
         s0.a === '2026-11-02' && s0.b === '2026-12-14' && s0.c === '2027-01-25'
         && s1.wrHi === '2026-09-07/2/true' && s1.wr === '2026-08-03'
         && s1.a === '2026-11-16' && s1.b === '2027-01-11' && s1.c === '2027-02-08'
         && s1.brk === '2026-10-12/2' && s1.locked === LOCKED
         && /^Pushed 4 wks: Prod.?Prep · Pushed 2 wks: Pre.?Prep, Post$/.test(s1.wrLine), out.S1);

    await undoBtn();
    const s2 = await stepState();
    out.S2 = s2;
    kase('S2', 'ONE undo takes back the push and keeps the hiatus (9/7 x2): Pre Prep 11/2, Prod Prep 12/14, Post 1/25, Break 9/28',
         s2.wrHi === '2026-09-07/2/true' && s2.a === '2026-11-02' && s2.b === '2026-12-14' && s2.c === '2027-01-25' && s2.brk === '2026-09-28/2', out.S2);

    await redoBtn();
    const r = await stepState();
    await click(`(document.getElementById('phiatus-en-writersRoom').closest('label'))`);
    await sleep(900);
    const s3 = await stepState();
    out.S3 = { redo: r, off: s3 };
    kase('S3', 'redo brings the stepped push back (Prod Prep 1/11/27); the hiatus switched off pulls everything back, Prod Prep stepping back over the break to 12/14 (not 12/28), Pre Prep 11/2, Post 1/25, Break 9/28; "Pulled 2 wks: Pre Prep, Post · Pulled 4 wks: Prod Prep" (the line lists pushes largest first, pulls smallest first, as it always has)',
         r.b === '2027-01-11' && r.a === '2026-11-16'
         && s3.a === '2026-11-02' && s3.b === '2026-12-14' && s3.c === '2027-01-25' && s3.brk === '2026-09-28/2' && s3.locked === LOCKED
         && /^Pulled 2 wks: Pre.?Prep, Post · Pulled 4 wks: Prod.?Prep$/.test(s3.wrLine), out.S3);
  }
  // S4: the trap (§12.2). Pre Prep set (by code: no ripple) to start 10/12, the week after the Break (9/28 x2). Break 2 -> 3
  // by ArrowUp: the Break's own new third week (10/12) is NOT an obstacle, so Pre Prep goes 1 week (10/19), not 2 (10/26);
  // Prod Prep 12/14 crosses the locked break (1/4/27, 3 calendar weeks); Post 1/25 -> 2/1.
  await loadStep();
  {
    await ev(`__rp.set(document.getElementById('start-prePrep'), '2026-10-12'), true`);
    await sleep(600);
    const s0 = await stepState();
    await click(inRow('Break', '.hiatus-weeks'));
    await press('ArrowUp'); await sleep(900);
    const s4 = await stepState();
    out.S4 = { s0, s4 };
    kase('S4', 'the all-phase Break 2 -> 3 with Pre Prep starting the week after it (10/12): Pre Prep 10/19 (1 wk, not 2: the edited hiatus is not stepped over), Prod Prep 12/14 -> 1/4/27 (over the locked break), Post 2/1; the Break stays on 9/28; "Pushed 3 wks: Prod Prep · Pushed 1 wk: Pre Prep, Post"',
         s0.a === '2026-10-12' && s0.b === '2026-12-14'
         && s4.brk === '2026-09-28/3' && s4.a === '2026-10-19' && s4.b === '2027-01-04' && s4.c === '2027-02-01' && s4.locked === LOCKED
         && /^Pushed 3 wks: Prod.?Prep · Pushed 1 wk: Pre.?Prep, Post$/.test(s4.brLine) && /hiatus-weeks/.test(s4.active), out.S4);
  }

  kase('E0', 'no page errors', pageErrors.length === 0, { errors: pageErrors.slice(0, 5) });
  ws.close();
} catch (e) {
  if (!(e && e.recorded)) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hiatusripple threw: ' + String(e && e.message || e), false);
  }
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`hiatusripple: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
