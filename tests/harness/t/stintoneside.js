// stintoneside -- COLUMN-ORDER-PLAN.md section 6 item 6: a hand-edited ONE-SIDED stint entry yields
// no reorder rather than a wrong one.
//
// The `stintswap-shared` schedule (Writer's Rm and Pre Prep overlapping Feb-Mar 2026, Localization
// and Post sharing the same two columns months later) with the store cut down to a single entry:
//
//     2026|writersRoom -> prePrep          (and NOTHING pointing back)
//
// A `with` names a stint that has no entry of its own, so the reconciler must treat the block as
// having no order at all: natural start order, every cell present, nothing wider. This is the same
// rule swapPairsForWeek applies to a one-sided per-week entry, and it is what makes a drifted or
// hand-edited .sptcal safe to open.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () { var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5; }, 'settle', 100, 100);
    var per = {};
    Array.prototype.forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
      (per[td.dataset.pkey] = per[td.dataset.pkey] || []).push(td.dataset.own);
    });
    var uniq = function (a) { return a ? [...new Set(a)] : null; };
    out.slots = { writersRoom: uniq(per.writersRoom), prePrep: uniq(per.prePrep),
                  localization: uniq(per.localization), post: uniq(per.post) };
    out.weeks = { writersRoom: (per.writersRoom || []).length, prePrep: (per.prePrep || []).length,
                  localization: (per.localization || []).length, post: (per.post || []).length };
    // Natural order stands: Writer's Rm starts first and holds slot 0; Pre Prep slot 1.
    out.naturalOrder = JSON.stringify(out.slots.writersRoom) === '["0"]' &&
                       JSON.stringify(out.slots.prePrep) === '["1"]' &&
                       JSON.stringify(out.slots.localization) === '["0"]' &&
                       JSON.stringify(out.slots.post) === '["1"]';
    out.noCellLost = out.weeks.writersRoom === 10 && out.weeks.prePrep === 8 &&
                     out.weeks.localization === 8 && out.weeks.post === 8;
    out.colKeys = Array.prototype.map.call(document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.colKeysOk = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';
    out.errors = (window.__ERR || []).slice(0, 6);
    out.PASS = out.naturalOrder && out.noCellLost && out.colKeysOk && out.errors.length === 0;
  } catch (e) { out.EX = e && (e.message || String(e)); }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
