// stintchain -- a block swap in a year that ALREADY carries one must not be refused as a collision.
//
// ⭐ THIS IS THE OWNER'S OWN CALENDAR (2 Sep 2026), schedule intact, show titles genericised. It is
// the first defect the block swap produced in real use, and it was a FALSE REFUSAL: the chip said
// "two phases would need the same column in the same week" for a swap that is plainly legal on screen.
//
// The 2027 block, with the stored Post <-> Pre Prep swap already applied:
//
//     slot 0:  Writer's Rm   1/4 .. 6/7    (rows 0-22)
//     slot 1:  Production    1/4 .. 3/1    (rows 0-8)    +  Pre Prep  6/14 .. 8/16  (rows 23-32)
//     slot 2:  Post          3/15 .. 6/14  (rows 10-23)
//
// Post's NATURAL column is Production's -- it sits at slot 2 only BECAUSE of the stored swap. The
// validator used to map each stored group over the natural, un-exchanged position of every phase
// outside it, so Writer's Rm <-> Production looked like a collision with a Post that had already
// moved out of the way. Applied together, all four exchanges are collision-free.
//
// So this leg asserts the thing that was broken: with one swap already stored, a second one in the
// same year is OFFERED, LANDS, loses nothing and changes nothing's shape -- and reverses exactly.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 200, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 6;
    }, 'the row count to settle', 150, 100);

    function tds() {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return Number.isFinite(+td.dataset.own); });
    }
    // Every 2027 block as {slot, span, weeks} -- the three things a swap must keep honest.
    function y27() {
      var m = {};
      tds().forEach(function (td) {
        if (String(td.dataset.week).slice(0, 4) !== '2027') return;
        var k = td.dataset.pkey;
        if (!m[k]) m[k] = { slots: {}, spans: {}, n: 0 };
        m[k].slots[td.dataset.own] = 1;
        m[k].spans[td.getAttribute('colspan') || '1'] = 1;
        m[k].n++;
      });
      var o = {};
      Object.keys(m).sort().forEach(function (k) {
        o[k] = Object.keys(m[k].slots).sort().join('/') + ' x' + Object.keys(m[k].spans).sort().join('/') + ' n' + m[k].n;
      });
      return o;
    }
    function cellOf(key) {
      var l = tds().filter(function (td) { return td.dataset.pkey === key && String(td.dataset.week).slice(0, 4) === '2027'; });
      return l.length ? l[Math.floor(l.length / 2)] : null;   // a MIDDLE week: the first is under the button
    }
    async function hover(el) {
      el.scrollIntoView({ block: 'center' }); await T.sleep(150);
      var r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, composed: true,
        clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2),
        button: 0, buttons: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true }));
      await T.sleep(150);
    }
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };

    // 1. The stored Post <-> Pre Prep swap restored and applied: Post at slot 2, Pre Prep at slot 1.
    //    (Naturally Post takes slot 1 -- Production's column, freed when it ends -- and Pre Prep 2.)
    out.before = y27();
    out.storedSwapApplied = /^2 x1 n14$/.test(out.before.post || '') && /^1 x1 n10$/.test(out.before.prePrep || '');
    out.naturalRest = /^0 x1 n23$/.test(out.before.writersRoom || '') && /^1 x1 n9$/.test(out.before.production || '');

    // 2. ⭐ The swap that used to be refused is OFFERED, and the chip says it re-flows nothing.
    await hover(cellOf('writersRoom'));
    await T.until(function () { return btn() && btn().dataset.pkey === 'writersRoom'; }, 'Swap Block on Writer\'s Rm', 60, 100);
    btn().click();
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="1"]'); }, 'the rightward knob', 150, 100);
    out.knob = document.querySelector('.grid-swap-knob[data-dir="1"]').getAttribute('aria-label') || '';
    var info = document.querySelector('.grid-swap-layer .grid-swap-chip.is-info');
    out.mode = info ? info.textContent : '';
    out.offered = /block of Writer.s Rm with Production/.test(out.knob) &&
                  /All 23 weeks of Writer/.test(out.mode) && /nothing re-flows/.test(out.mode);
    // The old defect, asserted directly so it cannot come back silently.
    out.noCollideMessage = !/same column in the same week/.test(out.mode);

    // 3. It lands. Writer's Rm takes Production's column and Production takes Writer's Rm's; the pair
    //    already swapped in this same year does NOT move; every week of all four survives.
    document.getElementById('colswap-right-btn').click();
    await T.until(function () { return (y27().writersRoom || '').indexOf('1 ') === 0; }, 'the second swap to land', 150, 100);
    await T.sleep(300);
    out.after = y27();
    out.landed = /^1 x1 n23$/.test(out.after.writersRoom || '') && /^0 x1 n9$/.test(out.after.production || '');
    out.bystandersUnmoved = out.after.post === out.before.post && out.after.prePrep === out.before.prePrep;
    // n<count> is inside each string, so an unchanged string is also proof no cell was lost or gained.
    out.nothingLost = ['writersRoom', 'production', 'post', 'prePrep'].every(function (k) {
      return (out.after[k] || '').match(/n(\d+)$/)[1] === (out.before[k] || '').match(/n(\d+)$/)[1];
    });
    out.nothingReshaped = ['writersRoom', 'production', 'post', 'prePrep'].every(function (k) {
      return (out.after[k] || '').indexOf(' x1 ') > 0;
    });

    // 4. Reversing restores the year exactly -- including the OTHER swap, which must be untouched.
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="-1"]'); }, 'the leftward knob', 150, 100);
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return (y27().writersRoom || '').indexOf('0 ') === 0; }, 'the reverse to land', 150, 100);
    await T.sleep(300);
    out.afterReverse = y27();
    out.reversedExactly = same(out.afterReverse, out.before);

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.storedSwapApplied && out.naturalRest && out.offered && out.noCollideMessage &&
               out.landed && out.bystandersUnmoved && out.nothingLost && out.nothingReshaped &&
               out.reversedExactly && out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
