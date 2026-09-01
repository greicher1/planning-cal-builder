// colswap -- prove the grid COLUMN-ORDER reconciler wires up end to end, through a real app path.
//
// Driven by  ?state=colswap-2col , which substitutes tests/fixtures/colswap-2col.sptcal into the
// page's own <script id="saved-state"> block (see srv.js). That is the shareable-copy restore path,
// so this test needs NO debug hook in the app and -- deliberately -- no IndexedDB: the `restore`
// leg's file-handle path is the one that stalls under headless Chrome's --virtual-time-budget, and
// avoiding it is why this leg is trustworthy where that one is not.
//
// The fixture is a GENUINE capture (the app's own crash-backup snapshot, taken from a live session)
// with one whole-run swap pair added. Its schedule is deliberately the owner's screenshot shape:
//
//     11/2   Prod Prep wk 1                     <- outside the overlap
//     11/9   Prod Prep wk 2                     <- outside the overlap
//     11/16  Prod Prep wk 3 | Post wk 1         <- overlap, and Post's WHOLE run
//     11/23  Prod Prep wk 4 | Post wk 2
//     11/30  Prod Prep wk 5 | Post wk 3
//     12/7   Prod Prep wk 6 | Post wk 4
//
// With the swap applied, the four overlap weeks must read `Post | Prod Prep` while 11/2 and 11/9 --
// which the swap does not name -- must not move at all. That "the weeks above stay put" property is
// the owner's own acceptance criterion, and it falls out of frozen phaseRunBounds bounding a run by
// occupant KEY: once slot 0's occupant changes at 11/16, Prod Prep's slot-0 run ENDS at 11/9.
//
// ⛔ What this test is NOT. It does not prove the invariance theorem -- that
// blockSlotMaps / phaseSlots / mc cannot move under a within-week permutation. That claim is proved
// separately and far more strongly by tests/harness/prove-col-permutation.mjs, which fuzzes the REAL
// computeBlockLayout source over thousands of generated schedules. This leg proves the plumbing:
// that the store survives restore, that swapPairsForWeek validates mutual pairs, and that the
// observable geometry a user (and both export writers) sees is a pure permutation.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    // ⛔ NOT T.appReady(). That waits on renderRecents() revealing the file menu, which is
    // IndexedDB-backed -- and indexedDB.open() never settles under headless Chrome's
    // --virtual-time-budget (identically on the untouched deployed page, so it is environmental,
    // not a regression). This test needs only the GRID, which does not touch IndexedDB, so it waits
    // on the grid the way fence.js does: render, then settle. Waiting on `rows > 1` alone measures
    // mid-build and reports two different layouts for the same page.
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var lastRows = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === lastRows) ? stable + 1 : 0;
      lastRows = n;
      return stable >= 5;      // ~500ms unchanged
    }, 'the row count to settle', 100, 100);
    out.rows = lastRows;

    // Geometry, addressed the only unambiguous way: by data-week + data-pkey. NEVER by row/column
    // index -- one <tr> holds every year block side by side, so an index range can straddle two
    // unrelated blocks and two unrelated week ranges.
    function layout() {
      var rows = {};
      Array.prototype.forEach.call(document.querySelectorAll('td.sheet-phase-cell'), function (td) {
        var wk = td.dataset.week;
        (rows[wk] = rows[wk] || []).push(td.dataset.pkey + '@' + td.dataset.own + '/cs' + (td.getAttribute('colspan') || 1));
      });
      Object.keys(rows).forEach(function (k) { rows[k].sort(); });
      return rows;
    }
    function colgroup() {
      return Array.prototype.map.call(
        document.querySelectorAll('table.sheet-table colgroup col'),
        function (c) { return (c.dataset.ckey || '?') + ':' + c.style.width; }).join(',');
    }

    var rows = layout();
    out.rows = rows;
    out.colgroup = colgroup();
    out.tableWidth = (document.querySelector('table.sheet-table') || {}).style
      ? document.querySelector('table.sheet-table').style.width : null;

    // 1. The store survived restore and actually applied. If gridColSwaps had been dropped by
    //    applyStateSnapshot, or the pair rejected, every assertion below would read as "unswapped"
    //    -- which looks identical to the feature not existing. Assert the SWAPPED state positively.
    var OVERLAP = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    out.swappedWeeks = 0;
    out.swapFailures = [];
    OVERLAP.forEach(function (wk) {
      var got = (rows[wk] || []).join(' ');
      // post must hold slot 0 (the LEFT column) and prodPrep slot 1.
      if (got === 'post@0/cs1 prodPrep@1/cs1') out.swappedWeeks++;
      else out.swapFailures.push(wk + ' => ' + got);
    });

    // 2. The weeks the swap does not name keep their PHASE and their SLOT -- the owner's
    //    "the weeks above stay put" criterion. Their COLSPAN may legitimately change, and here it
    //    does, which is worth understanding rather than asserting away:
    //
    //    Applying the swap ends prodPrep's slot-0 run at 11/09, because frozen phaseRunBounds
    //    bounds a run by occupant KEY and slot 0's occupant becomes `post` at 11/16. freeForRun(0,1)
    //    then asks only "is slot 1 empty across 11/02-11/09?" -- it is -- so those two weeks newly
    //    auto-span to full width (cs1 -> cs2). That is COLLATERAL: a layout change in weeks the user
    //    did not select, measured at ~25% of swaps, and it is capped at magnitude 1 by owner ruling
    //    D2 (a change of >= 2 columns must refuse the swap; gate check G5 enforces it).
    //    Note this is also what makes the result match the owner's screenshot, where Prod Prep
    //    wks 1-2 ARE full width.
    //
    //    So: assert position is unchanged, and assert the collateral is WITHIN the D2 cap. Asserting
    //    cs1 here would have been asserting the feature is broken.
    var UNSWAPPED = ['2026-11-02', '2026-11-09'];
    out.unswapped = {};
    out.unswappedPositionsOk = true;
    out.collateralWithinCap = true;
    out.collateral = [];
    UNSWAPPED.forEach(function (wk) {
      var cells = rows[wk] || [];
      out.unswapped[wk] = cells;
      if (cells.length !== 1 || cells[0].indexOf('prodPrep@0/') !== 0) out.unswappedPositionsOk = false;
      var cs = +(cells[0] || '').split('/cs')[1] || 0;
      if (cs !== 1) out.collateral.push(wk + ' colspan 1 -> ' + cs);
      if (Math.abs(cs - 1) > 1) out.collateralWithinCap = false;   // the D2 magnitude-1 cap
    });

    // 3. Every cell is still present exactly once: 6 prodPrep + 4 post, nothing swallowed or
    //    duplicated. A permutation that loses a cell is the failure mode that would be least
    //    visible in a screenshot and most destructive in an export.
    var counts = {};
    Object.keys(rows).forEach(function (wk) {
      rows[wk].forEach(function (s) { var k = s.split('@')[0]; counts[k] = (counts[k] || 0) + 1; });
    });
    out.cellCounts = counts;
    out.cellCountsOk = counts.prodPrep === 6 && counts.post === 4;

    // 4. Slot identity: exactly the four expected colgroup keys, in order, and the two phase
    //    columns equal in width. The keys are what hand-dragged colWidths are stored against, so a
    //    changed key set is silent corruption of saved user work.
    var keys = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; });
    out.colKeys = keys.join(',');
    out.colKeysOk = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';
    var w = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.style.width; });
    out.phaseColsEqualWidth = w[1] === w[2];

    // 5. Nothing threw during init, and no cell is clipped -- a swap must not change text fitting.
    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';

    out.PASS = out.swappedWeeks === 4 && out.swapFailures.length === 0 &&
               out.unswappedPositionsOk && out.collateralWithinCap &&
               out.cellCountsOk && out.colKeysOk && out.phaseColsEqualWidth &&
               out.errors.length === 0;
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
