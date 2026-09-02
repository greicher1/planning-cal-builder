// stintexport -- COLUMN-ORDER-PLAN.md section 6 item 7: a block swap appears in the Excel workbook
// and in the waterfall PDF exactly as it does on screen, with no width change.
//
// Fixture: ?state=stintswap-shared (Writer's Rm <-> Pre Prep swapped for 2026). In the four overlap
// weeks the screen reads `Pre Prep | Writer's Rm`; both writers take their column order from the same
// computePhaseRowLayout / blockSlotMaps the screen does, so they must read the same -- and this leg
// checks it by READING THE FILES BACK rather than trusting the shared code path:
//   * the workbook is loaded with ExcelJS (already on the page) and the labelled cells of the 2/16
//     row are read in column order;
//   * the PDF's content stream is inflated with DecompressionStream and every text operator paired
//     with the Tm that positioned it, so the 2/16 row's labels can be ordered by x.
// Widths: the two phase columns are equal on screen and in the workbook (the width model gives both
// the same label budget in this fixture), and every screen column width appears among the PDF's drawn
// rects at the page's single fit scale -- so a swap that moved a column width would show up.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 100, 100);

    // 1. The screen: the 2/16 row, phase labels left to right.
    var WEEK = '2026-02-16';
    var tds = Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
      function (td) { return td.dataset.week === WEEK; })
      .sort(function (a, b) { return (+a.dataset.own) - (+b.dataset.own); });
    out.screen = tds.map(function (td) { return td.dataset.pkey + '@' + td.dataset.own + ':' + (td.textContent || '').trim(); });
    out.screenSwapped = tds.length === 2 && tds[0].dataset.pkey === 'prePrep' && tds[1].dataset.pkey === 'writersRoom';
    var cols = T.colList();
    out.cols = cols;
    out.gridWidthPt = T.gridWidthPt();
    var phaseCols = cols.filter(function (c) { return /:s\d$/.test(c.k); });
    out.phaseColsEqual = phaseCols.length === 2 && phaseCols[0].w === phaseCols[1].w;
    var labelOf = function (td) { return (td.textContent || '').replace(/\s+/g, ' ').trim(); };
    var L0 = labelOf(tds[0]), L1 = labelOf(tds[1]);

    // 2. The workbook, read back.
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    out.xlsxLen = xb.size;
    var wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var ws = wb.worksheets[0];
    var xrow = null;
    ws.eachRow(function (row) {
      if (xrow) return;
      var texts = [];
      row.eachCell({ includeEmpty: false }, function (c) { texts.push(String(c.text || c.value || '')); });
      if (texts.indexOf(L0) >= 0 && texts.indexOf(L1) >= 0) xrow = texts;
    });
    out.xlsxRow = xrow;
    out.xlsxSwapped = !!xrow && xrow.indexOf(L0) < xrow.indexOf(L1);
    // The two phase columns are equal in the workbook as on screen -- Excel char units, so compare
    // the pair against each other, not against pixels.
    var xw = [];
    ws.columns.forEach(function (c, i) { xw.push(c.width); });
    out.xlsxWidths = xw.slice(0, 4);
    out.xlsxPhaseColsEqual = xw.length >= 3 && Math.abs(xw[1] - xw[2]) < 1e-6;

    // 3. The PDF, read back: inflate the content stream, pair every Tj with its Tm.
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    out.pdfLen = pb.size;
    var bytes = new Uint8Array(await pb.arrayBuffer());
    var latin = ''; for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    async function inflate(sub) {
      var ds = new DecompressionStream('deflate');
      var w = ds.writable.getWriter(); w.write(sub); w.close();
      var ab = await new Response(ds.readable).arrayBuffer();
      var u = new Uint8Array(ab), s = ''; for (var j = 0; j < u.length; j += 8192) s += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
      return s;
    }
    var content = null, re = /stream\r?\n/g, m;
    while ((m = re.exec(latin))) {
      var start = m.index + m[0].length, end = latin.indexOf('endstream', start);
      if (end < 0) continue;
      // DecompressionStream, unlike zlib.inflateSync, refuses trailing bytes after the deflate end --
      // and every stream here ends with a newline before `endstream`. Trim it.
      while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13 || bytes[end - 1] === 32)) end--;
      try { var s = await inflate(bytes.subarray(start, end)); if (/\bTf\b/.test(s) && /\bTj\b/.test(s)) { content = s; break; } } catch (e) { out.inflateErr = String(e && e.message || e); }
    }
    out.pdfHasContent = !!content;
    var ops = [], x = 0, y = 0, tok = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm|\(((?:\\.|[^\\)])*)\)\s*Tj/g, t;
    while ((t = tok.exec(content || ''))) {
      if (t[1] !== undefined) { x = +t[1]; y = +t[2]; }
      else ops.push({ x: x, y: y, text: t[3].replace(/\\([()\\])/g, '$1') });
    }
    // Find the row: the y at which BOTH labels are drawn.
    var byY = {};
    ops.forEach(function (o) { (byY[o.y] = byY[o.y] || []).push(o); });
    var prow = null;
    Object.keys(byY).forEach(function (k) {
      var texts = byY[k].map(function (o) { return o.text; });
      if (!prow && texts.indexOf(L0) >= 0 && texts.indexOf(L1) >= 0) prow = byY[k].slice().sort(function (a, b) { return a.x - b.x; });
    });
    out.pdfRow = prow ? prow.map(function (o) { return Math.round(o.x) + ':' + o.text; }) : null;
    out.pdfSwapped = !!prow && prow.findIndex(function (o) { return o.text === L0; }) < prow.findIndex(function (o) { return o.text === L1; });
    // Widths. The writer fits the grid to the page (a single scale -- "Excel's fit-to-page is a page
    // CTM", HANDOFF §3), so the PDF's grid width is the screen's width in points TIMES that scale, and
    // every column's width is the screen column times the same scale. Recover the scale from the
    // grid's drawn extent, then require each screen column width to appear among the drawn rects at
    // that scale. A swap that changed a column width would break this for that column.
    var rects = [...(content || '').matchAll(/([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re/g)].map(function (r) { return r.slice(1).map(Number); });
    var maxRight = 0, minLeft = Infinity;
    rects.slice(1).forEach(function (r) { minLeft = Math.min(minLeft, r[0]); maxRight = Math.max(maxRight, r[0] + r[2]); });
    out.pdfGridWidthPt = Math.round((maxRight - minLeft) * 100) / 100;
    var scale = out.pdfGridWidthPt / out.gridWidthPt;
    out.pdfScale = Math.round(scale * 10000) / 10000;
    var widths = rects.slice(1).map(function (r) { return r[2]; });
    var drawn = function (w) { return widths.some(function (d) { return Math.abs(d - w * scale) < 0.3; }); };
    out.pdfColumnsAtScale = cols.map(function (c) { return c.k + ':' + (drawn(c.w) ? 'ok' : 'MISSING'); });
    out.pdfWidthMatchesScreen = scale > 0.4 && scale <= 1.0001 && cols.every(function (c) { return drawn(c.w); });

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.screenSwapped && out.phaseColsEqual && out.xlsxSwapped && out.xlsxPhaseColsEqual &&
               out.pdfHasContent && out.pdfSwapped && out.pdfWidthMatchesScreen &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
