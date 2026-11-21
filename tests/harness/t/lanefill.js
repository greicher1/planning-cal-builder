// lanefill -- the Sim Post lane follows the Fill Gaps switch (owner, 11 Nov 2026: picked "Prep fills the lane", then
// "prep should fill the lane only when fill gaps is turned oon"). Frozen edit LR9 + layoutEvenPlan's lane check.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=layout-r9 ./run.sh lanefill 240
//
//   L1  Fill Gaps on: Prod Prep, sharing every row with Writer's Rm, is TWO wide for its whole 2032 run, into the empty
//       Sim Post column (one wide before 11 Nov 2026, LR4 (a))
//   L2  Fill Gaps off: Prod Prep is ONE wide, and the Sim Post column holds no cell on its rows (two wide before:
//       layoutEvenPlan never asked about the lane)
//   L3  on again: two wide again
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. Red on the build before it at L1 and L2.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
  }
  var prep = function () { return [].filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey === 'prodPrep'; }); };
  var spans = function () { var o = {}; prep().forEach(function (td) { o[td.colSpan || 1] = (o[td.colSpan || 1] || 0) + 1; }); return o; };
  // On Prod Prep's rows: the cell right after it is an empty filler (the lane kept), not the next phase.
  var laneEmpty = function () { return prep().every(function (td) { var n = td.nextElementSibling; return n && !n.classList.contains('sheet-phase-cell') && !n.textContent.trim(); }); };
  function btn() { return document.getElementById('tb-fill-space-btn'); }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    await T.until(function () { return btn() && getComputedStyle(btn()).display !== 'none'; }, 'the Fill Gaps switch', 60, 100);
    var n = prep().length, s1 = spans();
    C('L1', 'Fill Gaps on: Prod Prep beside Writer’s Rm is two wide for its whole run, into the Sim Post lane',
      btn().getAttribute('aria-pressed') === 'true' && n === 14 && J(s1) === J({ 2: 14 }), J({ pressed: btn().getAttribute('aria-pressed'), cells: n, spans: s1 }));
    btn().click(); await settle();
    var s2 = spans(), e2 = laneEmpty();
    C('L2', 'Fill Gaps off: Prod Prep is one wide and the Sim Post lane stays empty on its rows',
      btn().getAttribute('aria-pressed') === 'false' && J(s2) === J({ 1: 14 }) && e2, J({ pressed: btn().getAttribute('aria-pressed'), spans: s2, laneEmpty: e2 }));
    btn().click(); await settle();
    var s3 = spans();
    C('L3', 'on again: two wide again', btn().getAttribute('aria-pressed') === 'true' && J(s3) === J({ 2: 14 }), J({ spans: s3 }));
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
