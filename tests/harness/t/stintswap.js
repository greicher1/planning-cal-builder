// stintswap -- the load-bearing claim of COLUMN-ORDER-PLAN.md section 2.1, measured.
//
// A stint = a phase's weeks in ONE year block; the UI calls it a block. The claim: swapping two
// stints moves EXACTLY those two, even when both columns are shared with other phases at other
// times of the same year -- and nothing reflows, because a stint swap never splits a run.
//
// This is the case an earlier draft of the plan called unfixable and "recommended" disclosing as an
// unavoidable surprise. The owner rejected that (*"theres gotta be a way to just move the phase you
// selected and not the entire column"*) and was right; re-reading segCol is what shows why. segCol
// reuses a freed column ONLY to the right of every earlier phase still running, so two phases share
// a column only across a clean break in the whole schedule -- which means the column beside your
// stint, DURING your stint's life, holds exactly one other stint.
//
// The fixture is built so BOTH columns are shared:
//
//     slot 0:  Writer's Rm  1/5 .. 3/9      +  Localization  6/1 .. 7/20
//     slot 1:  Pre Prep     2/16 .. 4/6     +  Post          7/6 .. 8/24
//
// and stores one swap: Writer's Rm <-> Pre Prep, 2026.
//
// ⛔ WHAT MUST NOT HAPPEN is as important as what must. If the implementation had exchanged whole
// COLUMNS instead of two stints, Localization and Post would move too -- they are adjacent to each
// other, months later, and have no business moving. Asserting they are UNMOVED is the point of the
// leg; the two swapped stints changing places is the easy half.
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

    function cells() {
      var o = {};
      Array.prototype.forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) {
          (o[td.dataset.pkey] = o[td.dataset.pkey] || []).push({
            week: td.dataset.week, own: +td.dataset.own,
            cs: +(td.getAttribute('colspan') || 1)
          });
        });
      return o;
    }
    var c = cells();
    function slotsOf(k) { return c[k] ? [...new Set(c[k].map(function (x) { return x.own; }))] : null; }
    function spansOf(k) { return c[k] ? [...new Set(c[k].map(function (x) { return x.cs; }))] : null; }
    function weeksOf(k) { return c[k] ? c[k].length : 0; }

    out.slots = { writersRoom: slotsOf('writersRoom'), prePrep: slotsOf('prePrep'),
                  localization: slotsOf('localization'), post: slotsOf('post') };
    out.spans = { writersRoom: spansOf('writersRoom'), prePrep: spansOf('prePrep'),
                  localization: spansOf('localization'), post: spansOf('post') };
    out.weeks = { writersRoom: weeksOf('writersRoom'), prePrep: weeksOf('prePrep'),
                  localization: weeksOf('localization'), post: weeksOf('post') };

    // 1. The two named stints traded places. Natural order is Writer's Rm at slot 0 (it starts
    //    first, and segCol assigns in start order), Pre Prep at slot 1.
    out.swappedPair = JSON.stringify(out.slots.writersRoom) === '[1]' &&
                      JSON.stringify(out.slots.prePrep) === '[0]';
    // 2. ⭐ THE CLAIM: the two stints sharing those same columns did NOT move.
    out.bystandersUnmoved = JSON.stringify(out.slots.localization) === '[0]' &&
                            JSON.stringify(out.slots.post) === '[1]';
    // 3. Nothing reflowed -- every phase is still one column wide, as it was before the swap.
    out.noReflow = ['writersRoom', 'prePrep', 'localization', 'post']
      .every(function (k) { return JSON.stringify(out.spans[k]) === '[1]'; });
    // 4. The year still needs exactly two phase columns: the swap is a permutation, not a widening.
    out.colKeys = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (x) { return x.dataset.ckey || '?'; }).join(',');
    out.mcUnchanged = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';
    // 5. No cell lost: each phase still has all of its weeks.
    out.weekCountsOk = out.weeks.writersRoom === 10 && out.weeks.prePrep === 8 &&
                       out.weeks.localization === 8 && out.weeks.post === 8;

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.swappedPair && out.bystandersUnmoved && out.noReflow &&
               out.mcUnchanged && out.weekCountsOk && out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
