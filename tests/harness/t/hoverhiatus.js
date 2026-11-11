// hoverhiatus -- a phase's own hiatus is part of the phase, for Expand? / Pull back? and for the double-click fill
// (owner, 10 Nov 2026: "We need the expand and pull back to work with per phase hiatuses. And arguably, an entire phase,
// including its per phase hiatus should operate as one single block where the expand box would span the length of the
// entire phase including the hiatus"; frozen edit LR8 by picker, "Yes, make the edit"; FILL-INTENT-PLAN.md §12).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hover-hiatus ./run.sh hoverhiatus 400
//
// hover-hiatus.sptcal = hover-expand.sptcal + a two-week hiatus on Test from 7/14/31: Test wk 8 (7/7), Test Hiatus
// (7/14, 7/21), Test wk 9 (7/28), each with an empty column on its LEFT once Pre-Prep has ended. Every hover is a real
// pointermove at the cell's coordinates, dispatched on whatever is on top there, with no button held (hoverexpand's way).
//   B0  the precondition: those four rows, one wide, a blank on the left of each, the two middle ones Test's bands
//   B1  resting on the blank beside a BAND: one dashed box over all four weeks, "Expand?", "these 4 weeks"; resting
//       beside Test wk 8 draws the same box. Before: nothing beside a band, and a one-week box beside wk 8.
//   B2  the click widens all four, the bands still bands; the file has one per-cell width per week, band weeks
//       included; one undo step
//   B3  resting on a widened BAND: "Pull back?" over the four weeks; the click puts all four back; no width left
//   B4  the fill wish (a double-click on Test wk 8): all four two wide, the bands still bands (LR8; before it the two
//       bands stayed one wide); the workbook merges the bands two wide as it does the weeks beside them; resting on a
//       widened band offers "Pull back?", turning the fill off; one undo step each way
//   B5  the other side: the hiatus moved to Test's first week (5/19/31), where the blank is on the band's RIGHT:
//       "Expand?" for this week only beside it, and the fill wish widens it rightward
//   E0  no engine errors
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. B1-B3 red before the hover change (1acb360); B4 red before LR8.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  var txt = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); };
  function $(id) { return document.getElementById(id); }
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
  }
  function row(date) {
    return [].find.call(document.querySelectorAll('#table-wrap table.sheet-table tbody tr'), function (tr) { return tr.cells[0] && txt(tr.cells[0]) === date; }) || null;
  }
  // Test's cell in a row: its week or its band.
  function testCell(date) { var tr = row(date); return tr ? [].find.call(tr.cells, function (td) { return td.classList.contains('sheet-phase-cell') && td.dataset.pkey === 'custom1'; }) || null : null; }
  var DATES = ['7/7/31', '7/14/31', '7/21/31', '7/28/31'];
  function spans() { return DATES.map(function (d) { var t = testCell(d); return t ? t.colSpan : 0; }).join(''); }
  function kinds() { return DATES.map(function (d) { var t = testCell(d); return !t ? '-' : t.classList.contains('sheet-hiatus-cell') ? 'B' : 'W'; }).join(''); }
  var isBlank = function (td) { return !!td && td.tagName === 'TD' && !td.hasAttribute('class') && !td.hasAttribute('style') && !txt(td); };
  function rect(el) { var r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }
  function R(el) { var r = rect(el); return [Math.round(r.l), Math.round(r.t), Math.round(r.r), Math.round(r.b)]; }
  function chip() { return document.querySelector('.grid-hover-layer .grid-hover-chip'); }
  function boxes() { return [].slice.call(document.querySelectorAll('.grid-hover-layer .grid-hover-rect')); }
  function top(x, y) { return document.elementsFromPoint(x, y)[0] || null; }
  function moveAt(x, y) {
    var el = top(x, y);
    if (el) el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y,
      button: -1, buttons: 0, pointerId: 9, pointerType: 'mouse', isPrimary: true }));
    return el;
  }
  async function away() { moveAt(2, 2); await T.sleep(80); }
  async function rest(td, fx) {
    await away();
    td.scrollIntoView({ block: 'center' }); await T.sleep(120);
    var r = rect(td);
    moveAt(r.l + (r.r - r.l) * (fx === undefined ? 0.5 : fx), (r.t + r.b) / 2);
    await T.sleep(450);
  }
  async function press(el) {
    var r = rect(el), x = (r.l + r.r) / 2, y = (r.t + r.b) / 2;
    var o = function (b) { return { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, pointerId: 9, pointerType: 'mouse', isPrimary: true }; };
    el.dispatchEvent(new PointerEvent('pointerdown', o(1)));
    el.dispatchEvent(new PointerEvent('pointerup', o(0)));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, detail: 1 }));
    await T.sleep(250); await settle();
  }
  async function undo() { $('undo-btn').click(); await T.sleep(200); await settle(); }
  async function redo() { $('redo-btn').click(); await T.sleep(200); await settle(); }
  // The box drawn spans exactly the four rows (top of 7/7 to the bottom of 7/28) over the blank column: its left is
  // where the blank begins, the left edge of Test's cell once it has taken it (no blank is left beside a widened cell),
  // and its width the blank column's (colW, measured at B0).
  var colW = 0;
  function boxIsRun(b) {
    if (!b) return false;
    var c0 = testCell(DATES[0]), c3 = testCell(DATES[3]);
    var f = rect(c0.colSpan > 1 ? c0 : c0.previousElementSibling), l = rect(c3), q = rect(b);
    return Math.abs(q.t - f.t) <= 1 && Math.abs(q.b - l.b) <= 1 && Math.abs(q.l - f.l) <= 1.5 && Math.abs((q.r - q.l) - colW) <= 1.5;
  }
  var written = [];
  var saveHandle = { name: 'hoverhiatus.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hoverhiatus.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 150, 100);
    await T.sleep(200);
    return JSON.parse(written[written.length - 1]);
  }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    // ---- B0 ----
    var blanksL = DATES.every(function (d) { var t = testCell(d); return !!t && isBlank(t.previousElementSibling); });
    if (blanksL) { var cb = rect(testCell(DATES[0]).previousElementSibling); colW = cb.r - cb.l; }
    C('B0', 'precondition: Test wk 8, Test Hiatus, Test Hiatus, Test wk 9 (7/7-7/28/31), one wide, a blank on the left of each',
      kinds() === 'WBBW' && spans() === '1111' && blanksL && txt(testCell('7/14/31')) === 'Test Hiatus',
      J({ kinds: kinds(), spans: spans(), blanksLeft: blanksL }));
    // ---- B1 ----
    await rest(testCell('7/14/31').previousElementSibling);
    var c1 = chip(), b1 = boxes();
    var fromBand = { chip: c1 && txt(c1), title: c1 && c1.title, boxes: b1.map(R) };
    var bandOk = !!c1 && txt(c1) === 'Expand?' && b1.length === 1 && boxIsRun(b1[0]) && c1.title.indexOf('these 4 weeks') !== -1;
    await rest(testCell('7/7/31').previousElementSibling);
    var c1b = chip(), b1b = boxes();
    var fromWeek = { chip: c1b && txt(c1b), title: c1b && c1b.title, boxes: b1b.map(R) };
    var weekOk = !!c1b && txt(c1b) === 'Expand?' && b1b.length === 1 && boxIsRun(b1b[0]) && c1b.title.indexOf('these 4 weeks') !== -1;
    C('B1', 'resting on the blank beside Test\'s hiatus band, or beside Test wk 8: one dashed box over all four weeks, "Expand?", "these 4 weeks"',
      bandOk && weekOk, J({ fromBand: fromBand, fromWeek: fromWeek }));
    // ---- B2 ----
    if (c1b) await press(c1b);
    var s2 = await save(), k2 = Object.keys(s2.cellSpans || {}).sort();
    var want2 = ['2031-07-07|custom1', '2031-07-14|custom1', '2031-07-21|custom1', '2031-07-28|custom1'];
    C('B2a', 'the click widens all four weeks, the two bands still bands; the file has one per-cell width per week, band weeks included, and no phaseFill',
      spans() === '2222' && kinds() === 'WBBW' && J(k2) === J(want2) && !('phaseFill' in s2) && !chip(),
      J({ spans: spans(), kinds: kinds(), cellSpans: s2.cellSpans, phaseFill: s2.phaseFill }));
    await undo();
    C('B2b', 'one undo step puts all four back', spans() === '1111', spans());
    await redo();
    // ---- B3 ----
    await rest(testCell('7/21/31'), 0.2);
    var c3 = chip(), b3 = boxes();
    C('B3a', 'resting on a widened band: "Pull back?" in amber over the column it took, all four weeks in one box',
      spans() === '2222' && !!c3 && txt(c3) === 'Pull back?' && c3.classList.contains('is-pull') && b3.length === 1 && boxIsRun(b3[0])
        && c3.title.indexOf('these 4 weeks') !== -1,
      J({ spans: spans(), chip: c3 && txt(c3), title: c3 && c3.title, boxes: b3.map(R) }));
    if (c3) await press(c3);
    var s3 = await save();
    C('B3b', 'the click pulls all four back, no per-cell width left', spans() === '1111' && !Object.keys(s3.cellSpans || {}).length,
      J({ spans: spans(), cellSpans: s3.cellSpans }));
    // ---- B4 ----
    testCell('7/7/31').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); await T.sleep(200); await settle();
    var s4 = await save();
    C('B4a', 'the fill wish (a double-click on Test wk 8): all four two wide, the bands still bands reading "Test Hiatus" (LR8)',
      spans() === '2222' && kinds() === 'WBBW' && txt(testCell('7/14/31')) === 'Test Hiatus' && J(s4.phaseFill) === J({ custom1: true }) && !Object.keys(s4.cellSpans || {}).length,
      J({ spans: spans(), kinds: kinds(), phaseFill: s4.phaseFill, cellSpans: s4.cellSpans }));
    // The workbook draws from the same layout: each of the four is one merged cell two columns wide.
    var xw = {};
    try {
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var ws = wb.worksheets[0];
      ws.eachRow(function (r) { r.eachCell(function (c) {
        if (c.isMerged && c.master && c.master.address !== c.address) return;
        var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (q) { return q.text; }).join('');
        if (typeof v !== 'string' || !/^Test (wk [89]|Hiatus)$/.test(v.trim())) return;
        var w = 1; while (ws.getCell(c.row, c.col + w).isMerged && ws.getCell(c.row, c.col + w).master.address === c.address) w++;
        xw[v.trim()] = (xw[v.trim()] || '') + w;
      }); });
    } catch (e) { xw.err = String(e && e.message || e); }
    C('B4b', 'the workbook merges both hiatus weeks two wide, as it does Test wk 8 and wk 9', xw['Test wk 8'] === '2' && xw['Test wk 9'] === '2' && xw['Test Hiatus'] === '22',
      J(xw));
    await rest(testCell('7/14/31'), 0.2);
    var c4 = chip(), b4 = boxes();
    C('B4c', 'resting on a band the wish widened: "Pull back?", turning Test\'s fill off, over the four weeks',
      !!c4 && txt(c4) === 'Pull back?' && /Turn off .*fill/.test(c4.title) && b4.some(boxIsRun),
      J({ chip: c4 && [txt(c4), c4.title], boxes: b4.map(R) }));
    if (c4) await press(c4);
    var s4d = await save();
    C('B4d', 'the click: all four one wide again, phaseFill gone from the file', spans() === '1111' && !('phaseFill' in s4d), J({ spans: spans(), phaseFill: s4d.phaseFill }));
    await undo();
    C('B4e', 'one undo step: filling again, the bands with it', spans() === '2222' && kinds() === 'WBBW', J({ spans: spans(), kinds: kinds() }));
    await undo();
    // ---- B5 ----
    T.set('phiatus-start-custom1', '2031-05-19'); await T.sleep(300); await settle();
    var bnd = testCell('5/19/31');
    var bandR = !!bnd && bnd.classList.contains('sheet-hiatus-cell') && bnd.colSpan === 1 && isBlank(bnd.nextElementSibling);
    var c5 = null;
    if (bandR) { await rest(bnd.nextElementSibling); c5 = chip(); }
    var c5t = c5 && [txt(c5), c5.title];
    await away();
    bnd = testCell('5/19/31');
    var wk3 = [].find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return txt(td) === 'Test wk 3'; });
    if (wk3) { wk3.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); await T.sleep(200); await settle(); }
    var bnd2 = testCell('5/19/31');
    C('B5', 'the hiatus in Test\'s first week (5/19/31), a blank on the band\'s RIGHT: "Expand?" for this week only beside it, and the fill wish widens it rightward',
      bandR && !!c5 && txt(c5) === 'Expand?' && /this week only/.test(c5.title) && !!bnd2 && bnd2.classList.contains('sheet-hiatus-cell') && bnd2.colSpan === 2,
      J({ bandOneWideBlankRight: bandR, chip: c5t, afterWish: bnd2 && [txt(bnd2), bnd2.colSpan] }));
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
