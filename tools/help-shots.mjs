// help-shots.mjs -- takes every screenshot in Help, from the app itself, on a made-up calendar.
//
// WHY (Help redesign, owner's picks 21 Nov 2026): Help shows real screenshots with numbered callouts. Pictures taken by
// hand go stale the first time a button moves, and a picture of a real calendar would publish a real schedule. So the
// pictures are made by this script, from the BUILT app (dist/index.html), on tests/fixtures/help-demo.sptcal ("Harbor
// Lights", a synthetic show: tests/fixtures/README.md), and one command takes them all again:
//
//   npm run build && node tools/help-shots.mjs            # every shot
//   node tools/help-shots.mjs shift-panel note-editor     # just these
//
// Output: src/help/shots/<name>.webp, imported by the articles (Vite inlines them into the one file; the CSP allows
// img-src data:). After retaking, look at each picture: a moved control also moves its numbered dots, which are
// percentages in the article (src/help/articles/*.jsx), not here.
//
// SHARPNESS ("Crisp", owner's pick): the page is drawn at 2x. A shot shown about as wide as it was taken (a panel, a
// card) keeps 2x; a whole-window shot is shown at under half its width, so `scale: 0.5` keeps it at 1x of the window,
// which is still twice the size it is drawn at in Help. WebP at quality 82.
//
// Plumbing as tests/harness/rtleg.mjs: Node's built-in WebSocket, headless Chrome, the harness server (srv.js) serving
// this checkout, ?state=help-demo through the app's own saved-state block.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// HELP_SHOTS_OUT=<dir> writes elsewhere: how a new picture is shown to the owner before it goes into Help.
const OUT = process.env.HELP_SHOTS_OUT || path.join(ROOT, 'src', 'help', 'shots')
const PORT = 8000 + Math.floor(Math.random() * 900) + 50
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'sptcal-helpshots-'))
const W = 1440, H = 880, DPR = 2, QUALITY = 82
const ONLY = new Set(process.argv.slice(2))
const sleep = ms => new Promise(r => setTimeout(r, ms))

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) { console.error('help-shots: build first (npm run build)'); process.exit(1) }
fs.mkdirSync(OUT, { recursive: true })

const srv = spawn('node', [path.join(ROOT, 'tests/harness/srv.js'), String(PORT), ROOT, path.join(ROOT, 'tests/harness/t')], { stdio: 'ignore' })
await sleep(1200)
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${PROFILE}`,
  `--window-size=${W},${H}`, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' })
const done = code => {
  try { chrome.kill('SIGKILL') } catch (e) { /* gone */ }
  try { srv.kill('SIGKILL') } catch (e) { /* gone */ }
  try { fs.rmSync(PROFILE, { recursive: true, force: true }) } catch (e) { /* busy */ }
  process.exit(code)
}
let devPort = 0
for (let i = 0; i < 100 && !devPort; i++) {
  await sleep(100)
  try { devPort = Number(fs.readFileSync(path.join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0]) } catch (e) { /* not yet */ }
}
if (!devPort) { console.error('help-shots: Chrome never started'); done(1) }
let target = null
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${devPort}/json/list`)).json()).find(t => t.type === 'page') } catch (e) { /* not yet */ }
  if (!target) await sleep(100)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP socket failed')) })
let seq = 0
const waiting = new Map()
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  // A "Leave site?" prompt (unsaved work, then a new page) would wait forever: answer every dialog.
  if (m.method === 'Page.javascriptDialogOpening') { send('Page.handleJavaScriptDialog', { accept: true }); return }
  if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result) }
}
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })) })
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text)
  return r.result.value
}
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false })

// ---- helpers ------------------------------------------------------------------------------------------------------
async function load(state = 'help-demo') {
  // Every load starts clean: no crash backup to offer back, no remembered Help or preferences.
  await send('Storage.clearDataForOrigin', { origin: `http://localhost:${PORT}`, storageTypes: 'indexeddb,local_storage' }).catch(() => {})
  await send('Page.navigate', { url: `http://localhost:${PORT}/dist/index.html?state=${state}` })
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev("!!document.querySelector('#table-wrap table, #table-wrap .month-view')").catch(() => false)) break }
  await sleep(1200)
  await esc(3)
}
// A rectangle in page coordinates. `sel` is a CSS selector, or a JS expression (starting with '=') that yields an element.
async function rect(sel) {
  const pick = sel.startsWith('=') ? sel.slice(1) : `document.querySelector(${JSON.stringify(sel)})`
  return ev(`(()=>{const e=(${pick}); if(!e) return null; const r=e.getBoundingClientRect(); if(!r.width) return null; return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};})()`)
}
async function need(sel) { const r = await rect(sel); if (!r) throw new Error('not on screen: ' + sel); return r }
async function mouse(x, y, { button = 'left', count = 1 } = {}) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  for (let c = 1; c <= count; c++) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: c })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: c })
  }
  await sleep(450)
}
async function click(sel, opts) { const r = await need(sel); await mouse(r.x + r.w / 2, r.y + r.h / 2, opts) }
async function esc(n = 1) {
  for (let i = 0; i < n; i++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await sleep(150)
  }
}
const pad = (r, p = 16) => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p })
const union = (...rs) => { rs = rs.filter(Boolean); const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y)); return { x, y, w: Math.max(...rs.map(r => r.x + r.w)) - x, h: Math.max(...rs.map(r => r.y + r.h)) - y } }
async function shot(name, clip, scale = 1) {
  const c = clip ? { x: Math.max(0, clip.x), y: Math.max(0, clip.y) } : { x: 0, y: 0 }
  c.width = clip ? Math.min(W - c.x, clip.w - (c.x - clip.x)) : W
  c.height = clip ? Math.min(H - c.y, clip.h - (c.y - clip.y)) : H
  const r = await send('Page.captureScreenshot', { format: 'webp', quality: QUALITY, clip: { ...c, scale } })
  const file = path.join(OUT, name + '.webp')
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'))
  console.log(`  ${name}.webp  ${Math.round(c.width * scale * DPR)}x${Math.round(c.height * scale * DPR)}  ${Math.round(fs.statSync(file).size / 1024)} KB`)
}
const sidebarTab = t => click(`.side-tab-btn[data-tab="${t}"]`)
const settingsTab = async name => {
  if (!(await ev("!!document.querySelector('.side-settings-btn.active')"))) { await click('.side-settings-btn'); await sleep(600) }
  await ev(`(()=>{const b=[...document.querySelectorAll('.sw-tab')].find(e=>e.textContent.trim()===${JSON.stringify(name)}); if(b) b.click(); return 1})()`); await sleep(600)
}
const cap = (r, max) => ({ ...r, h: Math.min(r.h, max) })
async function typeInto(sel, text) {   // a box the app reads on input/change
  await ev(`(()=>{const i=document.querySelector(${JSON.stringify(sel)}); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,${JSON.stringify(text)}); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); return 1})()`)
  await sleep(500)
}
async function key(k, code) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code })
  await sleep(250)
}
// THE EXTRAS (owner, 21 Nov 2026: each shown to them first). All are made on top of help-demo by the app's own controls.
// A second scenario, "Shoot +2 wks": + Scenario, take the offered v2, rename the tab, then Shift › After Production › 2 wks Later.
async function secondScenario() {
  await click(`=[...document.querySelectorAll('button')].find(b=>b.textContent.replace('+','').trim()==='Scenario')`); await sleep(900)
  await ev(`(()=>{const b=document.querySelector('.sc-ver-bump'); if(b) b.click(); return 1})()`); await sleep(500)
  await click('.sc-tab.is-current', { count: 2 }); await sleep(400)
  await key('a', 65)   // nothing: the box opens with its name selected
  await ev(`(()=>{const i=document.querySelector('.sc-strip input'); if(i){ i.select(); } return !!i})()`)
  await send('Input.insertText', { text: 'Shoot +2 wks' }); await key('Enter', 13); await sleep(500)
  await click('#pop-shift-btn'); await sleep(500)
  const row = await need(`=[...document.querySelectorAll('#pop-shift *')].find(e=>{const r=e.getBoundingClientRect(); return r.height>20&&r.height<44&&/^Production/.test(e.textContent.trim())&&e.children.length>1})`)
  await mouse(row.x + row.w * 0.62, row.y + row.h / 2)
  await click(`=[...document.querySelectorAll('#pop-shift button')].find(b=>/^After Production/.test(b.textContent.trim()))`)
  await typeInto('#tool-shift-weeks', '2')
  await click('#tool-shift-later'); await sleep(900)
  await click('#pop-shift-btn'); await sleep(400)
}
// A color key on the right of the waterfall.
async function colorKey() {
  await click('#tb-side-boxes-btn'); await sleep(400); await click('.sb-menu-item[data-kind="key"][data-side="right"]'); await sleep(900); await esc(1)
  // Wider than its default (owner, 21 Nov 2026: "make the color key wider"): drag the side's edge 70 px to the left.
  const h = await need('.side-col.side-right .sb-width'); const x = h.x + h.w / 2, y = h.y + Math.min(h.h / 2, 200)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= 7; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - i * 10, y, button: 'left', buttons: 1 }); await sleep(30) }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x - 70, y, button: 'left', buttons: 0, clickCount: 1 }); await sleep(700)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: W / 2, y: H - 6 }); await sleep(300)   // off the edge, so its hover line is gone
}
// One tandem day per episode (12 + 1), from Show info's Tandem Days box.
async function tandem() { await sidebarTab('show'); await typeInto('.si-tandem-in', '1'); await sleep(800) }
const card = id => `=document.getElementById(${JSON.stringify(id)}).closest('.phase-row, section.card, section')`
const textEl = (txt, scope = '#table-wrap') => `=[...document.querySelectorAll(${JSON.stringify(scope + ' *')})].reverse().find(e=>e.children.length===0&&e.textContent.trim().startsWith(${JSON.stringify(txt)}))`
async function monthTo(key) {
  if (!(await ev("!!document.querySelector('#table-wrap .month-view')"))) { await click('#view-month-btn'); await sleep(1200) }
  await ev(`(()=>{const b=document.querySelector('[data-mvgo^="${key}"]'); if(b) b.click(); return !!b})()`)
  await sleep(1200)
}
async function sheet() {
  if (!(await ev("!!document.querySelector('#table-wrap table')"))) { await click('#view-sheet-btn'); await sleep(1200) }
}
// The card that holds a heading's text, in the side panel.
const cardWithHeading = txt => `=[...document.querySelectorAll('aside.form-panel section, aside.form-panel .card')].find(e=>{const h=e.querySelector('h2,h3,h4,.card-title,.card-head,legend'); return h&&h.textContent.trim().toLowerCase().startsWith(${JSON.stringify(txt.toLowerCase())})})`

// ---- the shots ----------------------------------------------------------------------------------------------------
// Each: [name, async () => clip | null (whole window), scale]. They run in order on one page, each starting from the
// state the one before left; `load()` between groups resets it.
const SHOTS = [
  ['app-waterfall', async () => { await load(); return null }, 0.5],
  ['show-info', async () => { await sidebarTab('show'); return pad(await need(card('show-title')), 4) }],
  ['phase-card', async () => { await sidebarTab('phases'); return pad(await need(card('start-prePrep')), 4) }],
  ['production-card', async () => {
    await sidebarTab('phases')
    await ev(`document.getElementById('start-production').scrollIntoView({block:'start'}); 1`); await sleep(300)
    const r = await need(card('start-production')); return pad({ ...r, h: Math.min(r.h, H - r.y - 8) }, 4)
  }],
  ['shift-panel', async () => { await click('#pop-shift-btn'); await sleep(400); return pad(union(await need('#pop-shift'), await need('#shift-group')), 20) }],
  ['build-around', async () => { await click('#pop-solve-btn'); await sleep(400); const r = pad(union(await need('#pop-solve'), await need('#pop-solve-btn')), 20); return r }, 1],
  ['note-editor', async () => {
    await load(); await sheet()
    const cell = 'td.sheet-note-cell[data-week="2026-08-10"]'
    await ev(`document.querySelector('${cell}').scrollIntoView({block:'center'}); 1`); await sleep(300)
    await click(cell, { count: 2 }); await sleep(500)
    return pad(union(await need(cell), await need('.note-pop')), 24)
  }],
  ['auto-notes', async () => { await esc(2); await click('.side-settings-btn'); await sleep(700); return pad(await need(cardWithHeading('Automatic notes')), 4) }],
  ['holiday-list', async () => {
    await ev(`(()=>{const b=[...document.querySelectorAll('.sw-tab')].find(e=>/Region/.test(e.textContent)); if(b) b.click(); return 1})()`); await sleep(700)
    const r = await need(cardWithHeading('Holidays')); return pad({ ...r, h: Math.min(r.h, 520) }, 4)
  }],
  ['export-dialog', async () => { await sidebarTab('show'); await click('#export-wf-pdf-btn'); await sleep(900); const r = pad(await need('.export-pdf-dlg .mantine-Modal-content'), 10); return r }],
  ['app-month', async () => { await load(); await monthTo('2026-07'); return null }, 0.5],
  ['mv-note-editor', async () => {
    const n = await need(textEl('Location scout')); await mouse(n.x + n.w / 2, n.y + n.h / 2, { count: 2 }); await sleep(600)
    return pad(union(n, await need('.note-pop, .mv-note-pop')), 22)
  }],
  ['mv-holiday-editor', async () => {
    await esc(2); await sleep(300)
    const n = await need(textEl('Independence Day 7/4')); await mouse(n.x + n.w / 2, n.y + n.h / 2, { count: 2 }); await sleep(600)
    const p = await need('.note-pop, .mv-note-pop'); return pad(union(n, p), 22)
  }],
  ['month-day-menu', async () => {
    await esc(2); await sleep(300)
    const d = await need(textEl('15', '#table-wrap .mv-week')); await mouse(d.x + 60, d.y + 4, { button: 'right' })
    const m = await need('.day-menu'); return pad(union({ ...d, w: 140 }, m), 20)
  }],
  // ---- added for the rest of the articles (21 Nov 2026) ----
  ['prep-card', async () => { await load(); await monthTo('2026-07'); await sidebarTab('phases'); await ev(`document.querySelector('.phase-row.prep-row').scrollIntoView({block:'start'}); 1`); await sleep(300); return pad(cap(await need('.phase-row.prep-row'), 400), 4) }],
  ['hiatus-card', async () => {
    await ev(`document.getElementById('hiatus-list').scrollIntoView({block:'start'}); 1`); await sleep(300)
    await ev(`(()=>{const b=document.querySelector('#hiatus-list .hiatus-collapse-btn'); if(b) b.click(); return 1})()`); await sleep(400)
    await ev(`document.getElementById('hiatus-list').closest('section, .card').scrollIntoView({block:'start'}); 1`); await sleep(300)
    return pad(cap(await need("=document.getElementById('hiatus-list').closest('section, .card')"), 420), 4)
  }],
  ['region-card', async () => { await settingsTab('Region'); return pad(cap(await need(cardWithHeading('Production Region')), 420), 4) }],
  ['wf-prefs', async () => { await load(); await settingsTab('Preferences'); return pad(cap(await need(cardWithHeading('Waterfall')), 420), 4) }],
  ['hiatus-prefs', async () => { await ev(`(${cardWithHeading('Hiatus').slice(1)}).scrollIntoView({block:'start'}); 1`); await sleep(300); return pad(cap(await need(cardWithHeading('Hiatus')), 300), 4) }],
  ['presets', async () => { await settingsTab('Presets'); return pad(cap(await need(cardWithHeading('Headers')), 420), 4) }],
  ['hdr-menu', async () => { await sidebarTab('show'); await click('#tb-hdr-mode-btn'); await sleep(500); return pad(union(await need('#tb-hdr-mode-btn'), await need('.hdr-mode-pop')), 16) }],
  ['wf-context', async () => {
    await esc(2); const cell = 'td.sheet-note-cell[data-week="2026-07-13"]'
    await ev(`document.querySelector('${cell}').scrollIntoView({block:'center'}); 1`); await sleep(300)
    const r = await need(cell); await mouse(r.x + r.w / 2, r.y + r.h / 2, { button: 'right' })
    return pad(union(r, await need('.day-menu')), 20)
  }],
  ['heading-editor', async () => {
    await esc(2); await ev(`document.querySelector('#table-wrap .sheet-scroll') && (document.querySelector('#table-wrap .sheet-scroll').scrollTop=0); 1`); await sleep(300)
    const th = await need(`=[...document.querySelectorAll('#table-wrap th')].find(t=>t.textContent.trim()==='Notes')`)
    await mouse(th.x + th.w / 2, th.y + th.h / 2, { count: 2 }); await sleep(500)
    return pad(union(th, await need('.hdrrow-pop')), 18)
  }],
  ['text-bar', async () => { await esc(2); return pad(await need('.style-bar-host'), 6) }],
  ['file-menu', async () => { await click('.file-menu-btn'); await sleep(500); return pad(union(await need('.file-menu-btn'), await need('#file-menu')), 14) }],
  ['changes-dialog', async () => {
    await esc(2)
    await ev(`(()=>{const i=document.getElementById('show-title'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'Harbor Lights (draft)'); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); return 1})()`); await sleep(600)
    await click('.file-menu-btn'); await sleep(500)
    await ev(`(()=>{const b=document.querySelector('#file-menu [data-action="changes"]'); if(b) b.click(); return !!b})()`); await sleep(900)
    return pad(cap(await need('.changes-dlg .mantine-Modal-content'), 700), 10)
  }],
  ['side-boxes', async () => { await load(); await colorKey(); return null }, 0.5],
  ['tandem-month', async () => { await load(); await tandem(); await monthTo('2027-07'); return null }, 0.5],
  ['tandem-card', async () => {
    await sidebarTab('phases')
    await ev(`document.querySelector('.phase-row.du-row').scrollIntoView({block:'start'}); 1`); await sleep(300)
    return pad(cap(await need('.phase-row.du-row'), 520), 4)
  }],
  ['mv-prefs', async () => { await load(); await monthTo('2026-07'); await settingsTab('Preferences'); await ev(`(${cardWithHeading('Month view').slice(1)}).scrollIntoView({block:'start'}); 1`); await sleep(300); return pad(cap(await need(cardWithHeading('Month view')), 700), 4) }],
  ['month-pdf-dialog', async () => { await sidebarTab('show'); await click('#export-btn'); await sleep(900); return pad(await need('.month-pdf-dlg .mantine-Modal-content'), 10) }],
  ['scenario-waterfall', async () => { await load(); await secondScenario(); return null }, 0.5],
  ['scenario-tabs', async () => pad(union(await need('.sc-strip'), await need('.sc-band')), 12)],
  ['compare', async () => {
    // Opened from the ORIGINAL tab (owner's picker), so the new one reads "Pushed 2 wks".
    await click(`=[...document.querySelectorAll('.sc-tab')].find(t=>!t.classList.contains('is-current'))`); await sleep(900)
    await click(`=[...document.querySelectorAll('.sc-strip ~ * button, button')].find(b=>b.textContent.trim()==='Compare')`); await sleep(900)
    return pad(cap(await need('.compare-dlg .mantine-Modal-content'), 760), 10)
  }],
]

let failed = 0
for (const [name, fn, scale = 1] of SHOTS) {
  // Every step runs (each leaves the page as the next expects); only the named shots are written.
  try { const clip = await fn(); if (!ONLY.size || ONLY.has(name)) await shot(name, clip, scale) }
  catch (e) { failed++; console.log(`  ${name}: FAILED: ${String(e.message).slice(0, 200)}`) }
}
ws.close()
console.log(failed ? `help-shots: ${failed} failed` : 'help-shots: done')
done(failed ? 1 : 0)
