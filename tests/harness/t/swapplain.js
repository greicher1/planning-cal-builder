// swapplain -- a plain click is enough for Alt+←/→ (audit AUD2-042). A plain click highlights a cell with the same
// purple outline a ⌘-click gives, but before the fix only a ⌘-click or a drag made a selection the swap could use, so
// Alt+← after a plain click did nothing and said nothing.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colswap-gesture ./run.sh swapplain 200
//
// colswap-gesture: Prod Prep 11/2/26 x6, Post 11/16/26 x4, nothing stored. They share 11/16-12/7, Prod Prep on the left.
//   P1  plain click Post 11/23/26, Alt+←: Post and Prod Prep trade places in the weeks they share     (red before)
//   P2  ...and the circle shows beside the cell, as after a ⌘-click                                    (red before)
//   P3  one undo puts them back
//   P4  plain click a Notes cell, Alt+→: nothing moves, and a one-line reason says what to do          (red before)
//   P5  nothing highlighted (Esc), Alt+→: nothing moves, no message, and the key is left to the page
//   P6  a column HEADING highlighted (not a phase, Notes or date cell), Alt+←: no message, the key is left to the
//       page (review slip on 2.12: the keys were claimed whenever ANY cell was highlighted)                (red before)
//   P7  a DATE cell highlighted, Alt+←: the key is claimed and the one-line reason shows
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
    await T.until(function () { var s = leftOne(); st = (s === last) ? st + 1 : 0; last = s; return st >= 3; }, 'settled', 200, 100);
  }
  function leftOne() {
    var o = {};
    qa('#table-wrap td.sheet-phase-cell').forEach(function (td) {
      var k = td.dataset.pkey; if (k !== 'post' && k !== 'prodPrep') return;
      (o[td.dataset.week] = o[td.dataset.week] || {})[k] = td.getBoundingClientRect().left;
    });
    var sh = Object.keys(o).filter(function (w) { return 'post' in o[w] && 'prodPrep' in o[w]; }).sort();
    if (!sh.length) return 'none';
    var who = sh.map(function (w) { return o[w].prodPrep < o[w].post ? 'prodPrep' : 'post'; });
    return who.every(function (x) { return x === who[0]; }) ? who[0] + ' x' + sh.length : 'mixed ' + who.join(',');
  }
  function cell(wk, key) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + wk + '"]'); }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 20)), y: Math.round(r.top + r.height / 2) }; }
  function ptr(type, el, at) {
    el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y,
      button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 7, pointerType: 'mouse', isPrimary: true}));
  }
  async function plainClick(el) {
    el.scrollIntoView({block: 'center'}); await T.sleep(100);
    var c = centre(el); ptr('pointerdown', el, c); ptr('pointerup', el, c);
    el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: c.x, clientY: c.y}));
    await T.sleep(350);   // past the double-click window, so the click stays a click
  }
  function chips() { return qa('.grid-swap-layer .grid-swap-chip').map(txt).filter(Boolean); }
  function alt(dir) {
    var ev = new KeyboardEvent('keydown', {key: dir < 0 ? 'ArrowLeft' : 'ArrowRight', altKey: true, bubbles: true, cancelable: true});
    document.dispatchEvent(ev); return ev.defaultPrevented;
  }
  try {
    await T.appReady(); await settle();
    var l0 = leftOne();
    out.start = l0;
    await plainClick(cell('2026-11-23', 'post'));
    out.selAfterClick = {grid: qa('.grid-sel-layer .grid-sel-cell').length, knobs: qa('.grid-swap-knob').length};
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    alt(-1);
    await T.sleep(300); await settle();
    var l1 = leftOne();
    C('P1', 'plain click Post 11/23/26, Alt+←: Post and Prod Prep trade places in the weeks they share', l0 === 'prodPrep x4' && l1 === 'post x4', {before: l0, after: l1, chips: chips()}, 'prodPrep x4 -> post x4');
    await T.sleep(400);
    var kn = qa('.grid-swap-knob').map(function (k) { return k.dataset.dir + ':' + (k.getAttribute('aria-label') || ''); });
    C('P2', 'the swap\'s circle now shows beside the cell, as after a ⌘-click', kn.length > 0, kn, 'a circle');
    $('undo-btn').click(); await T.sleep(300); await settle();
    C('P3', 'one undo puts them back', leftOne() === 'prodPrep x4', leftOne(), 'prodPrep x4');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await T.sleep(150);
    var note = document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-11-23"]');
    await plainClick(note);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var hl = qa('.text-sel-box, .grid-text-sel, [class*="text-sel"]').length;
    alt(1); await T.sleep(300);
    var said = chips();
    await settle();
    C('P4', 'plain click a Notes cell, Alt+→: nothing moves, and one line says what to do',
      leftOne() === 'prodPrep x4' && said.length === 1 && /phase cell/i.test(said[0]), {said: said, left: leftOne(), highlightBoxes: hl}, 'prodPrep x4, "Select a phase cell first, ..."');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await T.sleep(150);
    // Nothing highlighted: Escape cleared the note's highlight? Click the page outside the grid to be sure.
    document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: 2, clientY: 2, button: 0, pointerType: 'mouse'}));
    await T.sleep(4500);   // let the P4 chip time out
    var prevented = alt(1); await T.sleep(300);
    C('P5', 'nothing highlighted, Alt+→: nothing moves, no message, the key stays the page\'s',
      leftOne() === 'prodPrep x4' && !chips().length && !prevented, {chips: chips(), prevented: prevented}, 'no chip, not prevented');
    // P6: a heading. Plain click a <th> of the grid's heading row.
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await T.sleep(150);
    var th = document.querySelector('#table-wrap table.sheet-table thead th[colspan], #table-wrap table.sheet-table thead th');
    var ths = qa('#table-wrap table.sheet-table thead th').filter(function (h) { return /\S/.test(txt(h)) && !/^Date$/i.test(txt(h)); });
    th = ths[0] || th;
    await plainClick(th);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var hlHeading = qa('.text-sel-box, .grid-text-sel, [class*="text-sel"]').length;
    var prev6 = alt(-1); await T.sleep(300);
    var said6 = chips();
    await settle();
    C('P6', 'a column heading highlighted, Alt+←: nothing moves, no message, the key stays the page\'s',
      hlHeading > 0 && leftOne() === 'prodPrep x4' && !said6.length && !prev6, {heading: txt(th), highlightBoxes: hlHeading, said: said6, prevented: prev6}, 'highlighted; no chip, not prevented');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await T.sleep(150);
    await T.sleep(4500);
    // P7: a date cell (the first column of the 11/23/26 row).
    var dateTd = qa('#table-wrap td.sheet-date').filter(function (d) { return /11\/23\/26/.test(txt(d)); })[0];
    await plainClick(dateTd);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var prev7 = alt(-1); await T.sleep(300);
    var said7 = chips();
    await settle();
    C('P7', 'a date cell highlighted, Alt+←: the key is claimed, nothing moves, and one line says what to do',
      !!dateTd && prev7 && leftOne() === 'prodPrep x4' && said7.length === 1 && /phase cell/i.test(said7[0]), {date: txt(dateTd), said: said7, prevented: prev7}, 'prevented, "Select a phase cell first, ..."');
    C('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
