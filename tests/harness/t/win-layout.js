// win-layout -- the app shell at a laptop window size (xleg --window W,H --scale S): no horizontal page scroll and the
// waterfall ending exactly at the bottom of .preview-panel, in the waterfall and in the month view; the month's seven
// day columns equal. Judges those (they hold on macOS at every size measured). Reports the scrollbar widths, the
// month's day width, truncated month bars and where Build Around's Build button lands.
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var measured = {}, out = {cases: cases, measured: measured};
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
  }
  async function settled() { var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(100); var s = JSON.stringify(T.gridSignature()); same = (s === last) ? same + 1 : 0; last = s; } }
  function box(e) { if (!e) return null; var r = e.getBoundingClientRect(); return {l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height)}; }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!document.querySelector('#table-wrap .sheet-scroll td.sheet-date'); }, 'grid', 150, 100);
    await settled();
    await T.sleep(400);   // the shell's grid fit is re-measured on resize and render (ResizeObserver)
    var d = document.documentElement, sc = document.querySelector('#table-wrap .sheet-scroll'), pp = document.querySelector('.preview-panel');
    var sheet = {inner: [innerWidth, innerHeight], dpr: devicePixelRatio, docSW: d.scrollWidth, docCW: d.clientWidth,
      hPageScroll: d.scrollWidth > d.clientWidth, vPageScroll: d.scrollHeight > d.clientHeight,
      scroller: sc && {box: box(sc), sbW: sc.offsetWidth - sc.clientWidth, sbH: sc.offsetHeight - sc.clientHeight},
      panel: box(pp), gapGridToPanel: (sc && pp) ? Math.round((pp.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom) * 100) / 100 : null};
    var clippedText = [];
    document.querySelectorAll('.preview-toolbar *, header *').forEach(function (e) {
      if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') clippedText.push(e.textContent.trim().slice(0, 30));
    });
    sheet.toolbarTextClipped = clippedText.slice(0, 20);
    measured.sheet = sheet;
    add('L1', 'waterfall: no horizontal page scroll', !sheet.hPageScroll, {docSW: sheet.docSW, docCW: sheet.docCW}, 'scrollWidth == clientWidth');
    add('L2', 'waterfall: the grid ends at the bottom of the preview panel (0-1 px)', sheet.gapGridToPanel !== null && sheet.gapGridToPanel >= -0.5 && sheet.gapGridToPanel <= 1,
        {gap: sheet.gapGridToPanel, panel: sheet.panel, scroller: sheet.scroller && sheet.scroller.box}, '0-1 px');

    // Build Around with four custom phases: where the Build button lands (reported only).
    for (var i = 0; i < 4; i++) { document.getElementById('add-phase-btn').click(); await T.sleep(150); }
    await settled();
    var sb = document.getElementById('pop-solve-btn');
    if (sb) {
      sb.click();
      try {
        await T.until(function () { var g = document.getElementById('tool-solve-go'); return g && g.offsetWidth > 0; }, 'Build Around', 40, 100);
        var g = document.getElementById('tool-solve-go'), gr = g.getBoundingClientRect();
        var hit = document.elementFromPoint(gr.left + gr.width / 2, Math.min(gr.top + gr.height / 2, innerHeight - 1));
        measured.buildAround = {button: box(g), panelBottom: Math.round(pp.getBoundingClientRect().bottom), innerHeight: innerHeight,
          onTop: !!hit && (hit === g || g.contains(hit)), panelScroll: [pp.scrollHeight, pp.clientHeight]};
      } catch (e) { measured.buildAround = 'did not open: ' + e.message; }
      T.closePops();
    }
    add('L3', 'Build Around\'s Build button position measured', true, measured.buildAround || null, 'reported, not judged');

    // The month view.
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-pill'); }, 'month view', 100, 100);
    await T.sleep(700);
    var mv = document.querySelector('#table-wrap .month-view');
    var days = Array.prototype.slice.call(document.querySelectorAll('#table-wrap .mv-daycell')).slice(0, 7).map(function (c) { return Math.round(c.getBoundingClientRect().width * 100) / 100; });
    var pills = Array.prototype.slice.call(document.querySelectorAll('#table-wrap .mv-pill')).filter(function (p) { var t = p.querySelector('.mv-pill-label') || p; return t.scrollWidth > t.clientWidth + 1; }).length;
    var wrapS = (function () { var e = document.getElementById('table-wrap'); var s = e.querySelector('.sheet-scroll') || e; return s.offsetWidth - s.clientWidth; })();
    measured.month = {hPageScroll: d.scrollWidth > d.clientWidth, docSW: d.scrollWidth, docCW: d.clientWidth, mv: box(mv), dayW: days, pillsTruncated: pills, wrapScrollbar: wrapS};
    add('L4', 'month view: no horizontal page scroll', !measured.month.hPageScroll, {docSW: measured.month.docSW, docCW: measured.month.docCW}, 'scrollWidth == clientWidth');
    var eq = days.length === 7 && days.every(function (w) { return Math.abs(w - days[0]) < 0.05; });
    add('L5', 'month view: the seven day columns are equal', eq, days, '7 equal widths');
    add('L6', 'month view: bars measured', true, {pillsTruncated: pills, dayW: days[0]}, 'reported; compare with the macOS run');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  T.done(out);
})(); });
