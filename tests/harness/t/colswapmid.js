// colswapmid -- prove a swap works where NEITHER phase's whole run is inside the overlap.
//
// This is the case Phase 1 (owner ruling D7) refused outright, and it is the ORDINARY shape of two
// phases that merely overlap: each sticks out beyond the other, so there is no "whole run" to select
// and the app said so -- no knob, and a chip reading "select a phase's whole run". The owner's
// original screenshot passed only because one phase's entire life happened to sit inside its overlap.
// The restriction was lifted 1 Sep 2026 (SWAP_WHOLE_RUN_ONLY).
//
// Driven by  ?state=colswap-midoverlap :
//
//     1/5  .. 2/9    Writer's Rm alone          <- 6-week tail BEFORE the overlap
//     2/16 .. 3/23   Writer's Rm | Pre Prep     <- the 6 shared weeks
//     3/30 .. 5/4    Pre Prep alone             <- 6-week tail AFTER the overlap
//
// ⛔ WHAT PROTECTS THIS IS STILL THE GATE, not the lifted flag. Lifting the flag only lets the
// candidate reach the gate; G2 (column count), G3 (any column width) and G5 (collateral) are
// unchanged and were never whole-run assumptions.
//
// ⚠️ THE COLLATERAL HERE IS TWELVE WEEKS AGAINST SIX MOVED, AND THAT IS THE POINT OF THE TEST.
// Measured, and it follows from frozen phaseRunBounds: before the swap Writer's Rm holds slot 0 for
// all twelve of its weeks, so its run spans the overlap, slot 1 is occupied inside it, and it stays
// ONE column wide even in the six weeks where it runs ALONE. After the swap its slot-0 run splits at
// the overlap, so those six weeks find slot 1 free and fill the row -- and the same happens to Pre
// Prep's six-week tail on the other side. Every one of the twelve moves by exactly ONE column, which
// is what owner ruling D2 sanctioned, and the chip reports the count.
//
// ⛔ This fixture is deliberately the case a COUNT-based rule refuses. The gate used to carry one
// (refuse when the disturbed weeks outnumber the moved ones) and it was removed 1 Sep 2026 on the
// owner's instruction: it was never D2's ruling, a count is not a measure of harm when every change
// is magnitude 1, and it scaled backwards -- the longer the phases, the more likely it fired. If this
// leg ever starts failing with 'it would re-flow', someone has reinstated it.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n;
      return stable >= 5;
    }, 'the row count to settle', 100, 100);

    var OVERLAP = ['2026-02-16', '2026-02-23', '2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'];
    var WR_TAIL = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26', '2026-02-02', '2026-02-09'];
    var PP_TAIL = ['2026-03-30', '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27', '2026-05-04'];

    function cell(wk, pkey) {
      return Array.prototype.find.call(
        document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk && td.dataset.pkey === pkey; }) || null;
    }
    function rowOf(wk) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk; })
        .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own + '/cs' + (td.getAttribute('colspan') || 1); })
        .sort().join(' ');
    }
    function shot(ws) { var o = {}; ws.forEach(function (w) { o[w] = rowOf(w); }); return o; }

    // 1. The pre-state: neither phase's run is confined to the overlap, and BOTH tails are held to
    //    one column even though the phase is alone there. That second fact is what makes the
    //    collateral below inevitable, so assert it rather than discovering it.
    out.before = shot(WR_TAIL.concat(OVERLAP, PP_TAIL));
    out.naturalOrder = OVERLAP.every(function (w) { return out.before[w] === 'prePrep@1/cs1 writersRoom@0/cs1'; });
    out.tailsNarrowBefore = WR_TAIL.every(function (w) { return out.before[w] === 'writersRoom@0/cs1'; })
                         && PP_TAIL.every(function (w) { return out.before[w] === 'prePrep@1/cs1'; });
    // Neither side is a whole run: each phase appears in 12 weeks, only 6 of them shared.
    out.wrWeeks = WR_TAIL.length + OVERLAP.length;
    out.ppWeeks = PP_TAIL.length + OVERLAP.length;
    out.neitherSideWhole = out.wrWeeks > OVERLAP.length && out.ppWeeks > OVERLAP.length;

    // 2. Select ONE Pre Prep cell in the overlap. Under Phase 1 this produced no knob at all.
    var seed = cell('2026-02-16', 'prePrep');
    out.seedFound = !!seed;
    if (!seed) throw new Error('no Pre Prep cell at 2026-02-16');
    seed.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = seed.getBoundingClientRect();
    var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    ['pointerdown', 'pointerup'].forEach(function (t) {
      seed.dispatchEvent(new PointerEvent(t, {
        bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy,
        button: 0, buttons: t === 'pointerup' ? 0 : 1, pointerId: 7,
        pointerType: 'mouse', isPrimary: true, metaKey: true
      }));
    });

    // 3. A knob must now exist. THIS is the assertion the change is about -- under Phase 1 it did not.
    await T.until(function () {
      return !!document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="-1"]');
    }, 'the leftward swap knob on a mid-overlap run', 120, 100);
    out.knobLabel = (document.querySelector('.grid-swap-knob[data-dir="-1"]') || {}).getAttribute
      ? document.querySelector('.grid-swap-knob[data-dir="-1"]').getAttribute('aria-label') : '';
    // The run is the whole SHARED stretch, not the whole phase and not the one clicked cell.
    out.labelNamesOverlap = /2\/16/.test(out.knobLabel) && /3\/23/.test(out.knobLabel);

    // 4. One press moves all six shared weeks.
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return rowOf('2026-02-16') === 'prePrep@0/cs1 writersRoom@1/cs1'; },
      'the mid-overlap swap to land', 120, 100);
    await T.sleep(250);
    out.after = shot(WR_TAIL.concat(OVERLAP, PP_TAIL));
    out.movedWeeks = OVERLAP.filter(function (w) { return out.after[w] === 'prePrep@0/cs1 writersRoom@1/cs1'; }).length;
    out.wholeOverlapMoved = out.movedWeeks === 6;

    // 5. The collateral, asserted positively at its measured value. Both tails widen by exactly one
    //    column and keep their own slot -- they do not swap, they just stop being held narrow.
    out.wrTailWidened = WR_TAIL.every(function (w) { return out.after[w] === 'writersRoom@0/cs2'; });
    out.ppTailWidened = PP_TAIL.every(function (w) { return out.after[w] === 'prePrep@1/cs2'; });
    out.chipText = (document.querySelector('.grid-swap-chip') || {}).textContent || '';
    out.chipReportsTwelve = /12 other weeks changed width/.test(out.chipText);

    // 6. Still a working grid: two phase columns, nothing clipped, no errors.
    out.errors = (window.__ERR || []).slice(0, 6);
    out.colKeys = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';

    out.PASS = out.naturalOrder && out.tailsNarrowBefore && out.neitherSideWhole &&
               out.labelNamesOverlap && out.wholeOverlapMoved &&
               out.wrTailWidened && out.ppTailWidened && out.chipReportsTwelve &&
               out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
