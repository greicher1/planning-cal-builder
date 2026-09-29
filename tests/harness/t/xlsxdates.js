// xlsxdates -- batch 3, step 3.4 (FIX-PLAN §5; audit L-7): the workbook's Date column carries CACHED
// values, so previewers that do not calculate (Quick Look, phone viewers) show the dates. A gate.sh
// audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh xlsxdates 150
//
// exportExcel writes the first date as a value and every other one as a formula chain -- the row
// above + 7, and a later year block's first row = the previous block's last + 7 -- with no cached
// result, so an app that shows the stored value instead of recalculating shows a blank column (the
// audit: 103 of 103 uncached). The fix writes {formula, result}. The formulas are kept: they are what
// makes the column re-date itself when someone edits the first cell in Excel.
//
// On the reference calendar (two year blocks, so the cross-block formula is exercised), read back
// through the page's own ExcelJS:
//   D1  every formula cell in the Date column carries a cached result
//   D2  every cached result equals what its formula chain computes from the first date (a stale or
//       wrong cache would be worse than none: previewers would show a wrong date)
//   D3  the formulas themselves are unchanged in shape (row above + 7; a block's first row points at
//       the previous block's last)
//   D4  the dates the workbook shows are exactly the screen's week dates
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'xlsxdates', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  var DAY = 86400000;
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }
  try {
    await T.appReady();
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await settle('the calendar to settle');
    // The screen's own week dates: every Date cell's text (fmtShort, M/D/YY). ⚠️ Not the note cells --
    // a hiatus row has none, and the rows interleave the year blocks -- so this is compared as a SET;
    // D2 and D3 already prove the workbook's order.
    var screenDates = Array.from(document.querySelectorAll('#table-wrap td.sheet-date'))
      .map(function (td) { return (td.textContent || '').trim(); }).filter(Boolean);
    function short(ms) { var d = new Date(ms); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + String(d.getUTCFullYear()).slice(2); }

    var blob = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    var ws = wb.worksheets[0];
    // The Date columns: every column whose header row cell reads "Date".
    var dateCols = [];
    ws.getRow(1).eachCell(function (cell, col) { if (String(cell.value || '').trim() === 'Date') dateCols.push(col); });
    var cells = [];   // in block order, top to bottom
    dateCols.forEach(function (col) {
      for (var r = 2; r <= ws.rowCount; r++) {
        var v = ws.getRow(r).getCell(col).value;
        if (v === null || v === undefined || v === '') continue;
        cells.push({ col: col, row: r, addr: ws.getRow(r).getCell(col).address, v: v });
      }
    });
    out.dateCols = dateCols; out.dateCells = cells.length;
    var formulas = cells.filter(function (c) { return c.v && typeof c.v === 'object' && c.v.formula; });
    var uncached = formulas.filter(function (c) { return c.v.result === undefined || c.v.result === null; });
    kase('D1', 'every formula cell in the Date column carries a cached result',
         formulas.length > 50 && uncached.length === 0, { formulas: formulas.length, uncached: uncached.length, sample: uncached.slice(0, 2).map(function (c) { return c.addr; }) });

    // Evaluate the chain: the first cell is a real date; every formula is <ref>+7.
    var byAddr = {}; cells.forEach(function (c) { byAddr[c.addr] = c; });
    var first = cells[0], firstMs = first && first.v instanceof Date ? first.v.getTime() : NaN;
    var evaluated = {}, shapeBad = [], wrong = [];
    if (!isNaN(firstMs)) evaluated[first.addr] = firstMs;
    cells.forEach(function (c, i) {
      if (i === 0) return;
      var m = c.v && c.v.formula ? String(c.v.formula).match(/^([A-Z]+)(\d+)\+7/) : null;
      if (!m) { shapeBad.push(c.addr); return; }
      var ref = m[1] + m[2];
      var expectedRef = (c.row === 2) ? cells[i - 1].addr : ws.getRow(c.row - 1).getCell(c.col).address;
      if (ref !== expectedRef) shapeBad.push(c.addr + '=' + c.v.formula);
      if (evaluated[ref] !== undefined) evaluated[c.addr] = evaluated[ref] + 7 * DAY;
      var res = c.v.result;
      if (res !== undefined && res !== null) {
        var resMs = res instanceof Date ? res.getTime() : NaN;
        if (resMs !== evaluated[c.addr]) wrong.push(c.addr + ': cached ' + (res instanceof Date ? iso(res) : String(res)) + ' vs chain ' + (evaluated[c.addr] ? iso(evaluated[c.addr]) : '?'));
      }
    });
    kase('D2', 'every cached result equals what its formula chain computes from the first date',
         uncached.length === 0 && wrong.length === 0 && Object.keys(evaluated).length === cells.length, { wrong: wrong.slice(0, 3) });
    kase('D3', "the formulas keep their shape: the row above + 7, and a block's first row points at the previous block's last",
         shapeBad.length === 0, { shapeBad: shapeBad.slice(0, 3) });
    var shown = cells.map(function (c) { return evaluated[c.addr] !== undefined ? short(evaluated[c.addr]) : null; });
    var key = function (t) { var p = String(t).split('/'); return (2000 + +p[2]) * 10000 + (+p[0]) * 100 + (+p[1]); };
    var a1 = shown.filter(Boolean).sort(function (x, y) { return key(x) - key(y); });
    var a2 = screenDates.slice().sort(function (x, y) { return key(x) - key(y); });
    kase('D4', "the workbook's dates are exactly the screen's week dates (every one, no extra)",
         a1.length === shown.length && JSON.stringify(a1) === JSON.stringify(a2),
         { workbook: shown.length, screen: screenDates.length, onlyWorkbook: a1.filter(function (x) { return a2.indexOf(x) < 0; }).slice(0, 3), onlyScreen: a2.filter(function (x) { return a1.indexOf(x) < 0; }).slice(0, 3) });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'xlsxdates threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
