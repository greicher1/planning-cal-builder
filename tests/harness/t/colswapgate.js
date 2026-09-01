// colswapgate -- prove the column-order gate REFUSES a swap it must refuse, visibly.
//
// The companion `colswap` leg proves a LEGAL swap applies. This one proves the other half, which is
// the half that actually protects the calendar: a stored override that would disturb the grid beyond
// what the owner sanctioned has to be declined, and the user has to be TOLD -- an override that
// silently stops applying (and silently comes back after an unrelated edit, while sitting in every
// saved file meanwhile) is an invisible permanent tax.
//
// Driven by ?state=colswap-simpost-refuse, a genuine capture whose schedule is:
//   Production 2026-11-02 (30 shoot days), Post 2026-11-30 x6, Simultaneous Post ON at offset 1.
// The 2026 block therefore needs THREE columns: Production, Post, and SimPost's own fixed lane.
// The fixture stores a Production<->Post swap for the two weeks where they overlap.
//
// WHY THAT MUST BE REFUSED. blockSimSlot is derived from `slotMap.get(<Production's col>)` at
// Production's FIRST appearance, +1. Moving Production therefore moves the Simultaneous Post lane,
// and the conflict scan can then widen the whole block -- so the swap changes how many columns the
// year needs. That is check G2 (geometry). It is also exactly why the gate cannot be gesture-time
// only: a Production<->Post swap accepted while SimPost is OFF becomes a column-count change the
// moment SimPost is switched ON, with no gesture involved at all.
// prove-col-permutation.mjs measures this same exception independently (119 cases in 10k), so the
// two tests corroborate each other from opposite directions: one fuzzes the theorem, this one drives
// the real app.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    // Not T.appReady() -- that waits on the IndexedDB-backed file menu, which never settles under
    // --virtual-time-budget. Wait on the grid, then let the row count settle.
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n;
      return stable >= 5;
    }, 'the row count to settle', 100, 100);

    function rowOf(wk) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk; })
        .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own; }).sort().join(' ');
    }

    // 1. The swap must NOT have been applied. Natural order is Production left of Post, because
    //    Production starts first and segCol assigns in start order.
    out.overlapWeeks = { '2026-11-30': rowOf('2026-11-30'), '2026-12-07': rowOf('2026-12-07') };
    out.refused = out.overlapWeeks['2026-11-30'] === 'post@1 production@0' &&
                  out.overlapWeeks['2026-12-07'] === 'post@1 production@0';

    // 2. The refusal must be VISIBLE, and it must say WHY. A silent revert was the specific failure
    //    an earlier draft of this design shipped, so assert the strip is shown and names a reason.
    var strip = document.getElementById('colswap-notice');
    out.noticeExists = !!strip;
    out.noticeShown = !!(strip && !strip.hidden);
    out.noticeText = strip ? (strip.querySelector('.ln-text') || {}).textContent || '' : '';
    out.noticeNamesReason = /column|Simultaneous|paused/i.test(out.noticeText);

    // 3. The store must be INTACT. Rejection suppresses for the pass; it must never delete the
    //    user's intent, or a temporary schedule change would destroy their column order for good.
    //    Read it back off the saved-state block the harness injected -- the app's own restore input.
    var raw = (document.getElementById('saved-state') || {}).textContent || '{}';
    var snap = {};
    try { snap = JSON.parse(raw); } catch (e) { snap = {}; }
    out.storeKeyCount = Object.keys((snap && snap.gridColSwaps) || {}).length;
    out.storeIntact = out.storeKeyCount === 4;

    // 4. Refusing must leave a WORKING grid -- no thrown error, nothing clipped, three columns still.
    out.errors = (window.__ERR || []).slice(0, 6);
    out.colKeys = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';

    out.PASS = out.refused && out.noticeShown && out.noticeNamesReason && out.storeIntact &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
