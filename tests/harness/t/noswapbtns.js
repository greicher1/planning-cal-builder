// noswapbtns -- the Expand / Pull back and Swap buttons are GONE from the preview toolbar, and the two
// jobs they did still work from the grid (owner ruling 2, relayed 30 Sep 2026; built after v1.4.1).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colswap-gesture ./run.sh noswapbtns 60
//
// Double-click on a selected cell expands it (or pulls it back), and Alt+Left / Alt+Right swaps its
// column; both existed before, and the buttons only duplicated them. What was missing is saying so
// ON THE GRID: only the Help mentioned the keys. So the selection's count chip now ends with
// "Alt+←/→ to swap" whenever the selection is a phase cell -- exactly when the Swap buttons used to
// show -- and a refused swap still explains itself in the grid's own chip (flashSwapMsg).
//
// The fixture is colswap-gesture (see colswapmove.js): Post's whole 4-week run 11/16-12/7 sits beside
// Prod Prep, and Prod Prep runs alone, one column wide, at 11/2 and 11/9. Selection uses the real
// meta-click path at real coordinates (hitCell walks elementsFromPoint), as colswapmove does.
//
//   S0  no #batch-expand-btn, #colswap-left-btn or #colswap-right-btn anywhere in the page
//   S1  a selected Post cell: the grid chip ends with "Alt+←/→ to swap"
//   S2  Alt+Left moves the whole 4-week run (the path the ◀ Swap button duplicated)
//   S3  Alt+Right moves it back to the natural order
//   S4  a selected lone Prod Prep cell: double-click expands it across the empty column
//   E0  0 console errors
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function cell(wk, pkey) {
    return Array.prototype.find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
      function (td) { return td.dataset.week === wk && td.dataset.pkey === pkey; }) || null;
  }
  function rowOf(wk) {
    return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
      function (td) { return td.dataset.week === wk; })
      .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own + '/cs' + (td.getAttribute('colspan') || 1); })
      .sort().join(' ');
  }
  function centre(td){ td.scrollIntoView({block: 'center'}); var r = td.getBoundingClientRect(); return {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)}; }
  async function metaSelect(td){
    var c = centre(td);
    await T.sleep(120);
    c = centre(td);
    ['pointerdown', 'pointerup'].forEach(function (type) {
      td.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, composed: true, clientX: c.x, clientY: c.y,
        button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 7, pointerType: 'mouse', isPrimary: true, metaKey: true}));
    });
    await T.sleep(80);
    return c;
  }
  function altArrow(dir){
    document.dispatchEvent(new KeyboardEvent('keydown', {key: dir < 0 ? 'ArrowLeft' : 'ArrowRight', altKey: true, bubbles: true, cancelable: true}));
  }
  function chipText(){ return ((document.querySelector('.grid-sel-layer .grid-sel-chip') || {}).textContent || '').trim(); }
  // The whole chip is inside its layer. The layer clips (overflow:hidden), so a chip wider than a
  // narrow grid used to lose its end: "Alt+←/→ to sw" on this very fixture, before the chip could wrap.
  function chipInside(){
    var c = document.querySelector('.grid-sel-layer .grid-sel-chip'), l = document.querySelector('.grid-sel-layer');
    if(!c || !l) return false;
    var cr = c.getBoundingClientRect(), lr = l.getBoundingClientRect();
    return cr.left >= lr.left - 0.5 && cr.right <= lr.right + 0.5 && c.scrollWidth <= c.clientWidth + 1;
  }
  try {
    await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 1; }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 100, 100);

    var gone = {expand: !!document.getElementById('batch-expand-btn'), left: !!document.getElementById('colswap-left-btn'),
                right: !!document.getElementById('colswap-right-btn')};
    add('S0', 'the toolbar has no Expand / Pull back and no Swap buttons', !gone.expand && !gone.left && !gone.right, gone, 'none of the three ids');

    var OVERLAP = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    var before = {}; OVERLAP.forEach(function (w) { before[w] = rowOf(w); });
    var natural = OVERLAP.every(function (w) { return before[w] === 'post@1/cs1 prodPrep@0/cs1'; });
    var post = cell('2026-11-16', 'post');
    if(!post) throw new Error('no Post cell at 2026-11-16');
    await metaSelect(post);
    await T.until(function () { return !!document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="-1"]'); }, 'the leftward swap knob', 120, 100);
    await T.sleep(200);
    var chip1 = chipText(), inside1 = chipInside();
    add('S1', 'a selected Post cell: the grid chip ends with "Alt+←/→ to swap", and the whole chip shows (inside its layer)',
      natural && /Alt\+←\/→ to swap/.test(chip1) && inside1, {chip: chip1, natural: natural, inside: inside1}, '... · Alt+←/→ to swap, unclipped');

    altArrow(-1);
    await T.until(function () { return rowOf('2026-11-16') === 'post@0/cs1 prodPrep@1/cs1'; }, 'the Alt+Left swap to land', 120, 100);
    await T.sleep(250);
    var moved = OVERLAP.filter(function (w) { return rowOf(w) === 'post@0/cs1 prodPrep@1/cs1'; }).length;
    add('S2', 'Alt+Left moves the whole 4-week run', moved === 4, {moved: moved}, '4 of 4');

    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="1"]'); }, 'the rightward knob', 120, 100);
    altArrow(1);
    await T.until(function () { return rowOf('2026-11-16') === before['2026-11-16']; }, 'the Alt+Right swap back', 120, 100);
    await T.sleep(250);
    var back = OVERLAP.every(function (w) { return rowOf(w) === before[w]; });
    add('S3', 'Alt+Right moves it back to the natural order', back, {after: OVERLAP.map(rowOf)}, 'the natural order');

    // Clear the selection, then select the lone Prod Prep cell at 11/2 and double-click it.
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(200);
    var pp = cell('2026-11-02', 'prodPrep');
    if(!pp) throw new Error('no Prod Prep cell at 2026-11-02');
    var ppBefore = rowOf('2026-11-02');
    var c = await metaSelect(pp);
    // The swap-back above confirmed itself in the grid's chip (it re-flowed two weeks), and the count
    // chip is held back while that message is up (about 4 s): wait for it rather than for a duration.
    await T.until(function () { return !!chipText(); }, 'the count chip', 100, 100);
    var chip4 = chipText(), inside4 = chipInside();
    pp = cell('2026-11-02', 'prodPrep');
    pp.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, composed: true, clientX: c.x, clientY: c.y, button: 0, detail: 2}));
    await T.until(function () { return rowOf('2026-11-02') !== ppBefore; }, 'the double-click expand to land', 80, 100);
    await T.sleep(250);
    add('S4', 'a selected lone Prod Prep cell: double-click expands it across the empty column',
      ppBefore === 'prodPrep@0/cs1' && rowOf('2026-11-02') === 'prodPrep@0/cs2' && /double-click to expand/.test(chip4) && inside4,
      {before: ppBefore, after: rowOf('2026-11-02'), chip: chip4, inside: inside4}, 'cs1 -> cs2; the chip unclipped');

    var errs = T.appHealth().errors;
    add('E0', '0 console errors', errs.length === 0, {errors: errs.slice(0, 5)}, 'none');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'noswapbtns', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
