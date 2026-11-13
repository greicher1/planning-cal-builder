// win-cols -- the gate's zero-clipped-cells measure and every column width, on the reference calendar (no ?state=)
// or on the fixture given by ?state=, at whatever device scale the runner chose (xleg --scale). Judges what must
// hold on every OS: no horizontally clipped cell, and on the reference calendar the column keys macOS has. Widths
// and the per-cell slack (the room left between a cell's text and its box) are reported for comparison with macOS.
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var measured = {}, out = {cases: cases, measured: measured};
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
  }
  async function settled() { var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(100); var s = JSON.stringify(T.gridSignature()); same = (s === last) ? same + 1 : 0; last = s; } }
  try {
    await T.appReady();
    var fixture = new URLSearchParams(location.search).get('state');
    if (!fixture) T.buildFixture();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table td.sheet-date'); }, 'grid', 150, 100);
    await settled();
    await document.fonts.ready;
    var cl = T.clippedCells(), cols = T.colList();
    // Slack: each filled cell's content-box width minus the width its text is drawn at (a Range over the text box).
    var rows = [];
    document.querySelectorAll('#table-wrap table.sheet-table td, #table-wrap table.sheet-table th').forEach(function (td) {
      var probe = td.querySelector('.cell-body') || td.querySelector('.phase-cell-label') || td, txt = (td.textContent || '').trim();
      if (!txt || txt === '+') return;
      var cs = getComputedStyle(probe), inner = probe.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var r = document.createRange(); r.selectNodeContents(probe); var tw = r.getBoundingClientRect().width;
      rows.push({t: txt.slice(0, 40), slack: Math.round((inner - tw) * 100) / 100, inner: Math.round(inner * 100) / 100, tw: Math.round(tw * 100) / 100});
    });
    rows.sort(function (a, b) { return a.slack - b.slack; });
    // Three strings whose width macOS knows: the ratio of their drawn width here to macOS's, read off the grid.
    function drawn(text) { var x = rows.filter(function (r) { return r.t.indexOf(text) === 0; })[0]; return x ? x.tw : null; }
    measured.fixture = fixture || 'reference';
    measured.dpr = devicePixelRatio;
    measured.inner = [innerWidth, innerHeight];
    measured.clippedH = cl.h.length;
    measured.clippedV = cl.v.length;
    measured.cols = cols;
    measured.cells = rows.length;
    measured.slackUnder1 = rows.filter(function (r) { return r.slack < 1; }).length;
    measured.slackUnder2 = rows.filter(function (r) { return r.slack < 2; }).length;
    measured.tightest = rows.slice(0, 8);
    measured.textWidths = {wrap: drawn('Principal Photography Wraps'), loc: drawn('Localization wk'), simpost: drawn('Simultaneous Post')};
    measured.gridWidthPt = T.gridWidthPt();
    add('C1', 'no grid cell is horizontally clipped (the gate\'s own measure)', cl.h.length === 0, {h: cl.h.slice(0, 10), v: cl.v.length}, '0');
    if (!fixture) {
      var want = 'y2026:date,y2026:s0,y2026:notes,y2027:date,y2027:s0,y2027:s1,y2027:notes';
      var got = cols.map(function (c) { return c.k; }).join(',');
      add('C2', 'the reference calendar has the columns macOS has', got === want, got, want);
    }
    add('C3', 'column widths and the tightest cells measured', true, {cols: cols, tightest: rows.slice(0, 3)}, 'reported; compare with the macOS run');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  T.done(out);
})(); });
