// stintnoreflow -- the feature's entire reason for existing, measured against its predecessor.
//
// Same fixture as the `colswapmove` leg: Prod Prep 11/2 x6, Post 11/16 x4, overlapping for four
// weeks. Under the shipped PER-WEEK swap that leg measures 11/2 and 11/9 widening from one column to
// two -- 2 weeks reflowed to move 4, and on the owner's real calendar 16 weeks to move 4. The owner's
// verdict: "a genuine swap, where the two blocks swap positions but look the same", and doing the
// widening for them is "confusing and assumptive" when Expand already does it in one click.
//
// A STINT swap must reflow NOTHING, and the reason is structural rather than lucky: a per-week swap
// splits the phase's run in the column it leaves, and each half then finds the neighbour free for its
// whole (now shorter) run, so frozen freeForRun grants the widen. A stint swap moves the phase's
// ENTIRE run in that block, so the run is never split and the neighbour still sits inside it.
//
// ⛔ 11/2 and 11/9 STAYING ONE COLUMN WIDE is the assertion. If they read cs2 here, the stint swap is
// behaving like the per-week one and the feature is pointless.
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

    var OVERLAP = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    var SOLO    = ['2026-11-02', '2026-11-09'];
    function rowOf(wk) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk; })
        .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own + '/cs' + (td.getAttribute('colspan') || 1); })
        .sort().join(' ');
    }
    out.overlap = {}; OVERLAP.forEach(function (w) { out.overlap[w] = rowOf(w); });
    out.solo    = {}; SOLO.forEach(function (w) { out.solo[w] = rowOf(w); });

    // 1. The overlap weeks traded places: Post is now left of Prod Prep.
    out.swapped = OVERLAP.every(function (w) { return out.overlap[w] === 'post@0/cs1 prodPrep@1/cs1'; });
    // 2. ⭐ THE POINT, and note WHERE the solo weeks end up. They move to slot 1 WITH the rest of
    //    the stint -- the whole block travels as one rigid thing, which is what "genuine swap" means
    //    -- and they stay ONE column wide, with slot 0 left empty beside them.
    //    ⛔ An earlier draft of this leg asserted own === 0 here, i.e. that the solo weeks stay put.
    //    That was wrong and the code was right: a stint swap moves the phase's whole run in the
    //    block, solo weeks included. The per-week swap is the one that leaves them behind -- and
    //    widens them to cs2 in the process, which is the behaviour being replaced.
    //    This is also the layout an earlier session told the owner was unreachable ("a phase alone in
    //    a row fills the row by design"). It is reachable: the left-absorb branch refuses because
    //    Post occupies slot 0 inside Prod Prep's slot-1 run.
    out.soloMovedAndNarrow = SOLO.every(function (w) { return out.solo[w] === 'prodPrep@1/cs1'; });
    // 3. And nothing anywhere else changed shape either.
    out.everyPhaseCellOneWide = Array.prototype.every.call(
      document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
      function (td) { return +(td.getAttribute('colspan') || 1) === 1; });
    out.colKeys = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.mcUnchanged = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.swapped && out.soloMovedAndNarrow && out.everyPhaseCellOneWide && out.mcUnchanged &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
