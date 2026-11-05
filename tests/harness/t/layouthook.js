// layouthook -- the layout study's `?layout=` hook (LAYOUT-STUDY-PLAN.md §6; owner ruling R6, 4 Nov 2026).
//
// On localhost only, `?layout={"<phase>":<col>,…}` on the page URL forces every waterfall phase's column, read in
// computeSchedule where `col` is assigned, so the frozen layout takes it as data. It is honoured only when EVERY
// waterfall phase is named; a half map is ignored whole, and both placements then run exactly as before.
//
// Two runs on tests/fixtures/colreuse.sptcal (Reuse on, four pairs of phases sharing a column, one hand move):
//   HARNESS_QUERY="hook=full&layout=<every phase, each its own column>"
//     -> no two phases share a slot in any year; the hand-move note is absent (the reuse placement did not run).
//   HARNESS_QUERY="hook=half&layout=<the same map minus one phase>"
//     -> the saved layout exactly as the colreuse RESTORE run sees it: the four pairs share (Writers + Stage,
//        Writers + Production -- rule 3 of LAYOUT-RULES.md, Production goes left --, Loc + Mix, Grade + Ship),
//        Production is slot 0 in 2031, and the hand-move note is there.
// The inertness without any `?layout=` is the whole rest of the gate.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  var q = new URLSearchParams(location.search);
  out.hook = q.get('hook') || '';
  try {
    try { localStorage.clear(); } catch (e) {}
    var map = {};
    try { map = JSON.parse(q.get('layout') || '{}'); } catch (e) { out.badMap = true; }
    out.mapKeys = Object.keys(map).sort();
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 20; }, 'the restored grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
    // The phases in each slot of each year, read off data-own (the phase's own column), never the painted spans.
    function columns() {
      var by = {};
      [].forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
        var y = (td.dataset.week || '').slice(0, 4), s = td.dataset.own, k = td.dataset.pkey;
        if (!y || s === undefined || !k) return;
        var Y = by[y] = by[y] || {}, S = Y[s] = Y[s] || [];
        if (S.indexOf(k) < 0) S.push(k);
      });
      return by;
    }
    function slotOf(cols, year, key) { var Y = cols[year] || {}; for (var s in Y) if (Y[s].indexOf(key) >= 0) return +s; return null; }
    var same = function (cols, year, a, b) { var x = slotOf(cols, year, a); return x !== null && x === slotOf(cols, year, b); };
    var rc = out.cols = columns();
    out.phasesSeen = (function () { var set = {}; Object.keys(rc).forEach(function (y) { Object.keys(rc[y]).forEach(function (s) { rc[y][s].forEach(function (k) { set[k] = 1; }); }); }); return Object.keys(set).sort(); })();
    // The four pairs the colreuse fixture shares a column between under the layout rules (5 Nov 2026: Production
    // goes LEFT, into Writers' column, where the reuse placement's chain tie-break gave it Prep's), and the hand move.
    out.pairs = { c1wr: same(rc, '2030', 'custom1', 'writersRoom'), prodWr: same(rc, '2030', 'production', 'writersRoom'),
                  c5loc: same(rc, '2031', 'custom5', 'localization'), c7c6: same(rc, '2031', 'custom7', 'custom6') };
    out.prodSlot2031 = slotOf(rc, '2031', 'production');
    out.sharedAnywhere = Object.keys(rc).some(function (y) { return Object.keys(rc[y]).some(function (s) { return rc[y][s].length > 1; }); });
    var note = document.getElementById('colnote-custom5');
    out.noteText = note ? note.textContent : null;
    out.slotsPerYear = {}; Object.keys(rc).forEach(function (y) { out.slotsPerYear[y] = Object.keys(rc[y]).length; });
    out.errors = (window.__ERR || []).slice(0, 6);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  T.done(out);
})(); });
