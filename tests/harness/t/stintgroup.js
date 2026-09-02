// stintgroup -- the second half of owner decision E1: a stint swap against a column that hosts
// SEVERAL stints inside the run exchanges with ALL of them, and loses nothing.
//
// Same schedule as `stintcollide` (Writer's Rm 20 weeks in column 0; Post wks 6-9 and Localization
// wks 14-17 both in column 1), but the store names the whole group:
//
//     2026|writersRoom  -> post
//     2026|post         -> writersRoom
//     2026|localization -> writersRoom
//
// which the reconciler reads as one connected component over two columns. Expected: Writer's Rm at
// slot 1 for all 20 weeks, Post AND Localization at slot 0, every cell present, nothing wider or
// narrower than before. `stintcollide` keeps proving the other half -- the same schedule with only
// Post named is still refused, because applying it would drop four weeks of Writer's Rm.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () { var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5; }, 'settle', 100, 100);
    var per = {}, spans = {};
    Array.prototype.forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
      (per[td.dataset.pkey] = per[td.dataset.pkey] || []).push(td.dataset.own);
      (spans[td.dataset.pkey] = spans[td.dataset.pkey] || []).push(td.getAttribute('colspan') || '1');
    });
    var uniq = function (a) { return a ? [...new Set(a)] : null; };
    out.weekCounts = { writersRoom: (per.writersRoom || []).length, post: (per.post || []).length,
                       localization: (per.localization || []).length };
    out.slots = { writersRoom: uniq(per.writersRoom), post: uniq(per.post), localization: uniq(per.localization) };
    out.spans = { writersRoom: uniq(spans.writersRoom), post: uniq(spans.post), localization: uniq(spans.localization) };
    out.colKeys = Array.prototype.map.call(document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.noCellLost = out.weekCounts.writersRoom === 20 && out.weekCounts.post === 4 && out.weekCounts.localization === 4;
    // The whole group traded: the long stint went right, BOTH short ones came left.
    out.groupApplied = JSON.stringify(out.slots.writersRoom) === '["1"]' &&
                       JSON.stringify(out.slots.post) === '["0"]' &&
                       JSON.stringify(out.slots.localization) === '["0"]';
    // ...and nothing changed shape. Writer's Rm's 12 solo weeks stay ONE column wide in slot 1, with
    // slot 0 empty beside them -- the narrow band the owner asked for, falling out of the design.
    out.noReflow = ['writersRoom', 'post', 'localization'].every(function (k) {
      return JSON.stringify(out.spans[k]) === '["1"]'; });
    out.colKeysOk = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';
    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.noCellLost && out.groupApplied && out.noReflow && out.colKeysOk && out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) { out.EX = e && (e.message || String(e)); }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
