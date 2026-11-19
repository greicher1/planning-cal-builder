// mvkeysreal.mjs -- the Excel and Outlook keys on notes, with TRUSTED input (November 2026 audit, Batch 2 item 2.8:
// AUD2-021, AUD2-040; the owner's decision D6 (a), 13 Nov 2026). t/mvkeys.js proves the handlers with dispatched events;
// this proves the chain a user's keys and mouse go through, as wfkeysreal.mjs does for the waterfall's keys.
//
//   node mvkeysreal.mjs [--page /dist/index.html] [--port 8238]
//
// Writes mvkeysreal.json ({test, cases:[{id,title,pass}]}) beside this script, which gate.sh judges like wfkeysreal.json.
//
// ⛔ WHY A NODE SCRIPT (wfkeysreal.mjs has the long form): only CDP's Input domain is trusted input. ⌘C / ⌘X / ⌘V reach
// a page only as Chrome's own Copy / Cut / Paste editing commands, sent here with the key exactly as a key binding sends
// them; and only a trusted Enter has a default action (the line break a textarea inserts), so only here does "Enter
// saves" prove the box got NO stray line break, and "Shift+Enter adds a line" prove it got exactly ONE.
//
// mvkeys.sptcal (minted by t/mvkeys.js g=mint): the reference calendar with July 2026 month notes -- 7/8 "Production Mtg
// 9am" #FFC000 bold + italic, 7/9 "Costume test", 7/15 "Crew call", 7/22 "Wardrobe 7/22/26" -- a Waterfall note on 7/29
// and a note that stays with Production's 3rd shoot day (7/1). It opens in the month view.
//
//   R1  a real click picks a month note, real Delete removes it, one real ⌘Z brings it back
//   R2  real Backspace removes a picked note
//   R3  real ⌘C on a picked note, a real click on a note of another day, real ⌘V: the copy arrives there, amber, bold
//   R4  after a reload (the page's own memory of the copy gone), real ⌘V still brings the colour: SPTCal's data
//       crossed Chrome's clipboard
//   R5  a real click on a day's number opens its day menu; real ⌘V puts the note on that day and closes the menu
//   R6  month editor: real typing, real Shift+Enter, real Alt+Enter, real Enter: one line break each, saved, closed
//   R7  month editor: real Esc on a new note with text keeps it
//   R8  waterfall editor: real Shift+Enter then real Enter saves two lines; real Esc on a new note keeps it
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_BUNDLE_CLONE, removeProfileOnExit } from './chrome-profile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const PAGE = arg('page', process.env.HARNESS_PAGE || '/dist/index.html');
const PORT = Number(arg('port', process.env.HARNESS_PORT || 8238));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = `/tmp/tc${PORT !== 8238 ? PORT : ''}-mvkeysreal`;
removeProfileOnExit(PROFILE);
const OUT = path.join(HERE, 'mvkeysreal.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = { test: 'mvkeysreal', cases: [] };
setTimeout(() => {
  out.EX = 'mvkeysreal: hit its 300 s deadline';
  try { if (chrome) chrome.kill('SIGKILL'); } catch (e) { /* gone */ }
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  try { if (srv) srv.kill('SIGKILL'); } catch (e) { /* gone */ }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
}, 300000).unref();
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
    // An edit leaves the calendar dirty, so a reload raises "Leave site?" (pilldrag's trap).
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
  const mouse = (type, x, y, buttons, clickCount = 1) => send('Input.dispatchMouseEvent',
    { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : clickCount });
  const ALT = 1, CTRL = 2, META = 4, SHIFT = 8;
  // A key press as a key binding sends it. `commands` are Chrome's editing command names (Copy, Cut, Paste), sent
  // with the keyDown exactly as macOS's ⌘C / ⌘X / ⌘V bindings send them.
  const key = async (k, code, vk, modifiers = 0, commands) => {
    await send('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers }, commands ? { commands } : {}));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await sleep(250);
  };
  // Enter as the keyboard sends it: a keyDown CARRYING its text ("\r"), which is what makes a textarea insert a line
  // break by default. A handler that does not cancel it leaves that line break in the box.
  const enter = async (modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r', modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers });
    await sleep(300);
  };
  const typeText = async t => { await send('Input.insertText', { text: t }); await sleep(150); };
  const copyKey = () => key('c', 'KeyC', 67, META, ['Copy']);
  const pasteKey = () => key('v', 'KeyV', 86, META, ['Paste']);
  const undoKey = async () => { await key('z', 'KeyZ', 90, META); await sleep(600); };

  await send('Page.enable');
  const load = async () => {
    await send('Page.navigate', { url: `http://localhost:${PORT}${PAGE}?state=mvkeys` });
    await sleep(300);
    await until(`!!document.querySelector('#table-wrap .mv-daygrid')`, 'the month view');
    await sleep(1500);
    // A previous case's edit can leave a crash backup in this profile: decline the recovery question.
    await ev(`(() => { const m = Array.from(document.querySelectorAll('.mantine-Modal-content')).find(d => /Recover unsaved work/.test(d.innerText));
      const b = m && Array.from(m.querySelectorAll('button')).find(x => (x.innerText || '').trim() === 'Cancel'); if (b) b.click(); return !!b; })()`);
    await sleep(400);
    // To July 2026, by the month view's own arrows.
    for (let i = 0; i < 40; i++) {
      const my = await ev(`(document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || ''`);
      if (/July 2026/.test(my)) break;
      await ev(`document.getElementById(${JSON.stringify('')} + (Date.parse('1 ' + ((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '').trim()) < Date.parse('1 July 2026') ? 'mv-next' : 'mv-prev')).click()`);
      await sleep(200);
    }
    await sleep(600);
  };
  // A month note's centre (scrolled into view first), and the notes a day shows.
  const notePt = (iso, re) => ev(`(() => {
    const b = Array.from(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="${iso}"]')).find(x => ${re}.test(x.textContent));
    if (!b) return null; b.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  // A day's typed notes: its own ('day'), then the lines drawn with the Waterfall's ('wf'), where a note that stays with a
  // phase is drawn. Since 19 Nov 2026 a note pasted onto a day a phase runs on stays with that phase (t/notephase.js Q1).
  const notes = iso => ev(`Array.from(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="${iso}"][data-note-kind="day"]')).concat(Array.from(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="${iso}"][data-note-kind="wf"]'))).map(b => b.innerText.trim())`);
  // A "+" opens Stays with on the day's first phase since 19 Nov 2026: R6 / R7 are about a note of the DAY, so they pick
  // "This day", as a user now does for one (t/lib.js does the same for the legs it is injected into).
  const thisDay = () => ev(`(() => { const s = document.querySelector('#mv-note-pop .note-link-select'); if (s && s.value) { s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); } return true; })()`);
  const lookOf = (iso, re) => ev(`(() => { const b = Array.from(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="${iso}"]')).find(x => ${re}.test(x.textContent));
    if (!b) return null; const cs = getComputedStyle(b); return { bg: cs.backgroundColor, weight: cs.fontWeight, italic: cs.fontStyle }; })()`);
  const click = async p => {
    await mouse('mouseMoved', p.x, p.y, 0); await sleep(60);
    await mouse('mousePressed', p.x, p.y, 1); await sleep(60);
    await mouse('mouseReleased', p.x, p.y, 0); await sleep(300);
  };
  const dbl = async p => {
    await mouse('mouseMoved', p.x, p.y, 0); await sleep(60);
    await mouse('mousePressed', p.x, p.y, 1, 1); await mouse('mouseReleased', p.x, p.y, 0, 1); await sleep(40);
    await mouse('mousePressed', p.x, p.y, 1, 2); await mouse('mouseReleased', p.x, p.y, 0, 2); await sleep(400);
  };
  const clickNote = async (iso, re) => { const p = await notePt(iso, re); if (!p) throw new Error('no note ' + re + ' on ' + iso); await click(p); };
  const picked = () => ev(`document.querySelectorAll('body > .month-sel-box').length`);
  const plusPt = iso => ev(`(() => { const p = document.querySelector('#table-wrap .mv-note-add[data-note-day="${iso}"]:not(.mv-note-add-full)');
    if (!p) return null; p.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = p.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const editorValue = () => ev(`(() => { const t = document.querySelector('#mv-note-pop textarea, .note-pop textarea'); return t ? t.value : null; })()`);
  const AMBER = 'rgb(255, 192, 0)';

  // ---- R1 + R2: real Delete, real Cmd+Z, real Backspace --------------------------------------------------------------
  await load();
  {
    await clickNote('2026-07-08', '/Production Mtg/');
    const boxes = await picked();
    await key('Delete', 'Delete', 46);
    const gone = await notes('2026-07-08');
    await undoKey();
    const back = await notes('2026-07-08'), look = await lookOf('2026-07-08', '/Production Mtg/');
    out.R1 = { boxes, gone, back, look };
    kase('R1', 'a real click picks "Production Mtg 9am", real Delete removes it, one real Cmd+Z brings it back amber',
         boxes === 1 && JSON.stringify(gone) === '[]' && JSON.stringify(back) === '["Production Mtg 9am"]' && look && look.bg === AMBER, out.R1);
    await clickNote('2026-07-09', '/Costume test/');
    await key('Backspace', 'Backspace', 8);
    const b2 = await notes('2026-07-09');
    out.R2 = { b2 };
    kase('R2', 'real Backspace removes the picked "Costume test"', JSON.stringify(b2) === '[]', out.R2);
  }

  // ---- R3: real Cmd+C, a click on another day's note, real Cmd+V -----------------------------------------------------
  await load();
  {
    await clickNote('2026-07-08', '/Production Mtg/');
    await copyKey();
    await clickNote('2026-07-15', '/Crew call/');
    await pasteKey();
    const n = await notes('2026-07-15'), look = await lookOf('2026-07-15', '/Production Mtg/');
    out.R3 = { n, look };
    kase('R3', 'real Cmd+C on a picked note, a real click on "Crew call" (7/15), real Cmd+V: the note arrives there, amber and bold',
         JSON.stringify(n) === '["Crew call","Production Mtg 9am"]' && look && look.bg === AMBER && look.weight === '700' && look.italic === 'italic', out.R3);
  }

  // ---- R4: the look came through Chrome's clipboard --------------------------------------------------------------------
  await load();
  {
    await clickNote('2026-07-22', '/Wardrobe/');
    await pasteKey();
    const n = await notes('2026-07-22'), look = await lookOf('2026-07-22', '/Production Mtg/');
    out.R4 = { n, look };
    kase('R4', 'after a reload, real Cmd+V on 7/22 still brings the colour and style: SPTCal\'s data crossed the clipboard',
         JSON.stringify(n) === '["Wardrobe 7/22/26","Production Mtg 9am"]' && look && look.bg === AMBER && look.weight === '700', out.R4);
  }

  // ---- R5: a click on a day's number (its day menu opens, with focus), then real Cmd+V -------------------------------
  {
    const p = await ev(`(() => { const c = Array.from(document.querySelectorAll('#table-wrap .mv-daycell:not(.mv-out)')).find(c => (c.querySelector('.mv-daynum') || {}).textContent.trim() === '16');
      const n = c && c.querySelector('.mv-daynum'); if (!n) return null; n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!p) throw new Error('no day number 16');
    await click(p);
    const menu = await ev(`!!document.querySelector('.day-menu') && !!document.activeElement.closest('.day-menu')`);
    await pasteKey();
    const n = await notes('2026-07-16'), after = await ev(`!!document.querySelector('.day-menu')`);
    out.R5 = { menu, n, menuAfter: after };
    kase('R5', 'a real click on Thu 16\'s number opens its day menu (focus inside); real Cmd+V puts the note on 7/16 and closes the menu',
         menu === true && JSON.stringify(n) === '["Production Mtg 9am"]' && after === false, out.R5);
  }

  // ---- R6 + R7: the month editor's keys --------------------------------------------------------------------------------
  await load();
  {
    let p = await plusPt('2026-07-17'); if (!p) throw new Error('no + on 7/17');
    await click(p); await thisDay();
    await typeText('Table read');
    await enter(SHIFT);
    await typeText('Room 4');
    await enter(ALT);
    const v = await editorValue();
    await typeText('10am');
    await enter();
    const open = await ev(`!!document.getElementById('mv-note-pop')`);
    const saved = await ev(`(() => { const b = document.querySelector('#table-wrap .mv-note-block[data-note-day="2026-07-17"][data-note-kind="day"]'); return b ? b.innerText.split('\\n').map(l => l.trim()) : null; })()`);
    out.R6 = { v, open, saved };
    kase('R6', 'month editor, real keys: Shift+Enter and Alt+Enter each put ONE line break in the box; Enter saves the three lines and closes it',
         v === 'Table read\nRoom 4\n' && open === false && JSON.stringify(saved) === '["Table read","Room 4","10am"]', out.R6);
    p = await plusPt('2026-07-20'); if (!p) throw new Error('no + on 7/20');
    await click(p); await thisDay();
    await typeText('Costume fittings');
    await key('Escape', 'Escape', 27);
    const n = await notes('2026-07-20'), open2 = await ev(`!!document.getElementById('mv-note-pop')`);
    out.R7 = { n, open2 };
    kase('R7', 'month editor: real Esc on a new note with text keeps it', JSON.stringify(n) === '["Costume fittings"]' && open2 === false, out.R7);
  }

  // ---- R8: the waterfall editor's keys ---------------------------------------------------------------------------------
  {
    await ev(`document.getElementById('view-sheet-btn').click()`);
    await until(`!!document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-08-10"]')`, 'the waterfall');
    await sleep(800);
    const cellPt = wk => ev(`(() => { const td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="${wk}"]'); td.scrollIntoView({ block: 'center' });
      const r = td.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    const cellText = wk => ev(`(() => { const td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="${wk}"]');
      return td.classList.contains('has-note') ? td.innerText.split('\\n').map(l => l.trim()).filter(Boolean) : []; })()`);
    await dbl(await cellPt('2026-08-10'));
    const opened = await ev(`!!document.querySelector('.note-pop textarea')`);
    await typeText('Wardrobe');
    await enter(SHIFT);
    const v = await editorValue();
    await typeText('Fittings');
    await enter();
    const c1 = await cellText('2026-08-10'), open1 = await ev(`!!document.querySelector('.note-pop')`);
    await dbl(await cellPt('2026-08-17'));
    await typeText('Network call');
    await key('Escape', 'Escape', 27);
    const c2 = await cellText('2026-08-17'), open2 = await ev(`!!document.querySelector('.note-pop')`);
    out.R8 = { opened, v, c1, open1, c2, open2 };
    kase('R8', 'waterfall editor, real keys: Shift+Enter puts ONE line break in the box, Enter saves both lines; real Esc on a new note keeps it',
         opened && v === 'Wardrobe\n' && JSON.stringify(c1) === '["Wardrobe","Fittings"]' && open1 === false
           && JSON.stringify(c2) === '["Network call"]' && open2 === false, out.R8);
  }
  out.errors = await ev(`(window.__ERR || []).slice(0, 5)`).catch(() => null);
  ws.close();
} catch (e) {
  out.EX = String(e && e.message || e);
  kase('EX', 'mvkeysreal threw: ' + out.EX, false);
} finally {
  if (chrome) chrome.kill('SIGKILL');
  try { execFileSync('pkill', ['-9', '-f', `user-data-dir=${PROFILE}`]); } catch (e) { /* gone */ }
  if (srv) srv.kill('SIGKILL');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error(`mvkeysreal: ${out.cases.filter(c => c.pass).length}/${out.cases.length} pass`);
  process.exit(0);
}
