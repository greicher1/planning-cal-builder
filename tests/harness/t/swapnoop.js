// swapnoop -- Swap Column is not offered where pressing it would change nothing on screen (audit AUD2-027; owner, 10 Nov
// 2026: "it shouldn't show up anywhere it doesnt make sense"). Started from the audit's repro leg audit-s1-diag.js.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=swapnoop-three ./run.sh swapnoop 200
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=swapnoop-alone ./run.sh swapnoop 200
//
// swapnoop-three: four phase columns in late 2026; in 2027 Production (2/22/27, 6 x 5 days) runs beside VFX Prep and then
// Post, drawn two columns wide over a free column. swapnoop-alone: Production (5/3/27, 4 x 5 days) runs ALONE and three
// columns wide, in a year whose earlier phases use three columns.
// Before the fix, hovering Production showed Swap Column, its circle offered "Move Production into the free column, after
// Pre-Prep", and the press redrew nothing (every cell's left and width identical) while the file gained a hand move
// (colFollow) that later laid out Post and Localization differently.
//   N1  hovering Production shows no Swap Column button                                          (red before)
//   N2  its whole 2027 block selected by hand: no circle offers to move it                       (red before)
//   N3  Alt+→ and Alt+← on that selection: nothing moves, and a one-line reason in plain words   (red before)
//   N4  the saved file holds no hand move for Production (no colFollow)                           (red before)
//   N5  Swap Column still shows where a swap can happen: Pre-Prep in 2026 (swapnoop-three only)
//
// ⚠️ Run against the BUILD (HARNESS_PAGE=/dist/index.html).
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function C(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(i) { return document.getElementById(i); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  async function settle() {
    await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 5; }, 'grid', 200, 100);
    var last = '', st = 0;
    await T.until(function () { var s = drawn(); st = (s === last) ? st + 1 : 0; last = s; return st >= 3; }, 'settled', 200, 100);
  }
  // Every phase cell as drawn: phase, week, left and width.
  function drawn() {
    var t = document.querySelector('#table-wrap table.sheet-table'); if (!t) return '';
    var x0 = t.getBoundingClientRect().left;
    return qa('#table-wrap td.sheet-phase-cell[data-pkey]').map(function (td) {
      var r = td.getBoundingClientRect(); return td.dataset.pkey + '@' + td.dataset.week + ':' + Math.round(r.left - x0) + '+' + Math.round(r.width);
    }).join(' ');
  }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 20)), y: Math.round(r.top + r.height / 2) }; }
  function ptr(type, el, at, mods) {
    mods = mods || {};
    el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y,
      button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 7, pointerType: 'mouse', isPrimary: true, metaKey: !!mods.meta, shiftKey: !!mods.shift}));
  }
  async function press(el, mods) {
    var c = centre(el); ptr('pointerdown', el, c, mods); ptr('pointerup', el, c, mods);
    el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: c.x, clientY: c.y, metaKey: !!(mods && mods.meta), shiftKey: !!(mods && mods.shift)}));
    await T.sleep(120);
  }
  var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
  function knobs() { return qa('.grid-swap-knob').map(function (k) { return (+k.dataset.dir) + ':' + (k.getAttribute('aria-label') || ''); }); }
  function chips() { return qa('.grid-swap-layer .grid-swap-chip').map(txt).filter(Boolean); }
  async function hoverBtn(key, year) {
    var tds = qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]').filter(function (t) { return t.dataset.week.slice(0, 4) === year && !t.classList.contains('sheet-hiatus-cell'); });
    var td = tds[Math.min(2, tds.length - 1)];
    td.scrollIntoView({block: 'center'}); await T.sleep(150);
    var away = document.querySelector('#table-wrap td.sheet-date'); ptr('pointermove', away, centre(away)); await T.sleep(60);
    ptr('pointermove', td, centre(td)); await T.sleep(350);
    return btn() && btn().dataset.pkey === key ? btn().dataset.pkey : (btn() ? 'on ' + btn().dataset.pkey : null);
  }
  var written = [];
  var H = { name: 'swapnoop.sptcal', kind: 'file', queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (x) { return x === H; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'swapnoop.sptcal', {lastModified: 1}); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length; window.showSaveFilePicker = async function () { return H; };
    await T.sleep(500);
    await T.until(function () { return !$('save-file-btn').disabled; }, 'save btn', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'save write', 100, 100);
    return JSON.parse(written[written.length - 1]);
  }
  try {
    await T.appReady(); await settle();
    var three = $('show-title').value === 'Swap No-op Three Fixture';
    out.fixture = $('show-title').value;
    var b1 = await hoverBtn('production', '2027');
    C('N1', 'hovering Production in 2027 shows no Swap Column button', b1 !== 'production', b1, 'no button on Production');
    // N2: its whole 2027 block selected by hand (⌘-click the first week, Shift-click the last).
    var prod = qa('#table-wrap td.sheet-phase-cell[data-pkey="production"]').filter(function (t) { return t.dataset.week.slice(0, 4) === '2027' && !t.classList.contains('sheet-hiatus-cell'); });
    prod[0].scrollIntoView({block: 'center'}); await T.sleep(100);
    await press(prod[0], {meta: true});
    prod[prod.length - 1].scrollIntoView({block: 'center'}); await T.sleep(100);
    await press(prod[prod.length - 1], {shift: true});
    await T.sleep(500);
    out.selected = qa('.grid-sel-layer .grid-sel-cell').length;
    var k2 = knobs();
    C('N2', 'its whole 2027 block selected: no circle offers to move it',
      out.selected > 0 && !k2.some(function (k) { return /Move Production/.test(k); }), k2, 'no "Move Production" circle');
    var before = drawn(), said = [];
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    T.altSwap(1); await T.sleep(400); said.push(chips().join(' / '));
    T.altSwap(-1); await T.sleep(400); said.push(chips().join(' / '));
    await settle();
    var engine = /\b(slot|lane|stint|col|re-?flow)\b/i;
    C('N3', 'Alt+→ and Alt+←: nothing moves, and each says why in plain words',
      drawn() === before && said.every(function (s) { return s && !engine.test(s); }), said, 'grid unchanged, two plain reasons');
    var s = await save();
    out.colFollow = s.colFollow || null;
    C('N4', 'the saved file holds no hand move for Production', !(s.colFollow && s.colFollow.production), out.colFollow, 'no colFollow.production');
    if (three) {
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await T.sleep(100);
      var b5 = await hoverBtn('prePrep', '2026');
      C('N5', 'Swap Column still shows where a swap can happen: Pre-Prep in 2026', b5 === 'prePrep', b5, 'prePrep');
    }
    C('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
