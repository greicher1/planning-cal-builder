// xlsxlimits -- batch 3, step 3.3 (FIX-PLAN §5; audit L-2): the workbook never carries a column wider
// than Excel's 255 characters or a row taller than its 409 points. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh xlsxlimits 150
//
// Three ways a size past Excel's limits reached the file, each read back from the REAL export through
// the page's own ExcelJS:
//   A  a hand drag: the notes column dragged ~2,600 px right, a row dragged ~800 px down. The drag's
//      release (installGridResizers' onUp) stored whatever it was dropped at.
//   B  Single Column Mode on a long calendar: sheetColumnWidths' post-pass grows every auto column by
//      f = (availW*gridH)/(availH*gridW) to fill the page, and gridH grows with the row count -- about
//      4.5 years of weeks sends the 55-character notes column far past 255. The fix caps f, so the
//      columns keep their proportions and simply stop at the limit.
//   C  an OLD file: tests/fixtures/xlsx-overlimit.sptcal was saved by the pre-fix build straight after
//      A's drags (a real Save), so it carries a 500+ character width and an 800+ px row. The export's
//      own clamp is what covers it: a stored value is not rewritten, it is limited at the write.
// A's save is returned as out.mintText, which is how that fixture was made.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'xlsxlimits', cases: [] };
  var MAX_W = 255, MAX_H = 409;
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
  async function drag(sel, dx, dy) {
    var h = document.querySelector(sel);
    if (!h) throw new Error('no handle ' + sel);
    var rc = h.getBoundingClientRect(), x = rc.left + rc.width / 2, y = rc.top + rc.height / 2;
    h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9, button: 0, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x + dx, clientY: y + dy, pointerId: 9, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x + dx, clientY: y + dy, pointerId: 9, isPrimary: true }));
    await settle('the grid after the drag');
  }
  // The widest column and the tallest row the workbook actually carries.
  async function exported(label, keepAs) {
    var blob = await T.captureExport('export-btn', label);
    var buf = await blob.arrayBuffer();
    if (keepAs) out[keepAs] = T.b64(buf);   // the workbook itself, for the owner's Excel.app check
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    var ws = wb.worksheets[0], maxW = 0, maxH = 0, n = 0;
    (ws.columns || []).forEach(function (c) { if (c && c.width) maxW = Math.max(maxW, c.width); });
    ws.eachRow({ includeEmpty: false }, function (row) { n++; if (row.height) maxH = Math.max(maxH, row.height); });
    return { maxWidth: +maxW.toFixed(2), maxHeight: +maxH.toFixed(2), rows: n };
  }
  async function loadFixture(name) {
    var finished = false, err = null;
    var p = T.openViaFakePicker('/tests/fixtures/' + name, name)
      .then(function () { finished = true; }, function (e) { err = e; finished = true; });
    for (var i = 0; i < 100 && !finished; i++) { T.clickModalButton('Load'); await T.sleep(100); }
    await p;
    if (err) throw err;
    await settle('the loaded calendar to settle');
  }
  try {
    await T.appReady();
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await settle('the calendar to settle');

    // ---- A: hand drags far past both limits -------------------------------------------------------
    await drag('#table-wrap .grid-resize.is-col[data-ckey="y2026:notes"]', 2600, 0);
    await drag('#table-wrap .grid-resize.is-row[data-row="36"]', 0, 800);
    var a = await exported('the .xlsx after the drags');
    kase('A1', 'a column dragged ~2,600 px wide is written at most 255 characters', a.maxWidth > 0 && a.maxWidth <= MAX_W, a);
    kase('A2', 'a row dragged ~800 px tall is written at most 409 points', a.maxHeight > 0 && a.maxHeight <= MAX_H, a);
    // Mint A's calendar through the real Save (on the pre-fix build this IS an over-limit old file).
    var written = [];
    var h = { name: 'xlsx-overlimit.sptcal', kind: 'file',
      queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
      isSameEntry: async function (o) { return o === h; },
      getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'xlsx-overlimit.sptcal', { lastModified: 1 }); },
      createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
    window.showSaveFilePicker = async function () { return h; };
    document.getElementById('save-file-btn').click();
    await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
    out.mintText = written[0];
    var saved = JSON.parse(written[0]);
    out.savedSizes = { colWidths: saved.colWidths, rowHeightsByWeek: saved.rowHeightsByWeek };

    // ---- B: Single Column Mode on a ~4.5-year calendar with a long note --------------------------
    T.set('start-localization', '2030-06-03');
    T.set('weeks-localization', '8');
    await settle('the long calendar');
    await T.typeUserNote('2026-10-05', 'A long single-column note that needs most of the notes column width.');
    await settle('the note');
    var sw = document.getElementById('one-col-btn');
    if (!sw) throw new Error('no #one-col-btn');
    if (!sw.checked) sw.click();
    await T.until(function () { return document.getElementById('one-col-btn').checked; }, 'Single Column Mode on', 50, 100);
    await settle('the single-column grid');
    var b = await exported('the single-column .xlsx', 'xlsxB64Single');
    kase('B1', 'Single Column Mode on a ~4.5-year calendar: every column is written at most 255 characters', b.maxWidth > 0 && b.maxWidth <= MAX_W, b);

    // ---- C: an old file that already carries over-limit sizes --------------------------------------
    var have = await fetch('/tests/fixtures/xlsx-overlimit.sptcal', { method: 'HEAD' }).then(function (r) { return r.ok; }, function () { return false; });
    if (!have) {
      kase('C1', 'an old file with over-limit sizes: fixture tests/fixtures/xlsx-overlimit.sptcal is MISSING (mint it from out.mintText)', false);
    } else {
      await loadFixture('xlsx-overlimit.sptcal');
      var c = await exported('the old file .xlsx', 'xlsxB64OldFile');
      kase('C1', 'an old file carrying a 500+ character width and an 800+ px row still writes a valid workbook (<= 255, <= 409)',
           c.maxWidth > 0 && c.maxWidth <= MAX_W && c.maxHeight > 0 && c.maxHeight <= MAX_H, c);
    }
    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'xlsxlimits threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
