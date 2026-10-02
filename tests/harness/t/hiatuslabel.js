// hiatuslabel -- batch 3, step 3.6 (FIX-PLAN §5; audit N-1): a deliberately BLANK all-phase hiatus
// label stays blank in both views and both PDFs (FIX-PLAN §0 default). A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh hiatuslabel 150
//
// The editor has always allowed it -- commitActiveNoteEditor stores '' on purpose ("'' allowed =
// blank band") -- and the waterfall, Excel and the waterfall PDF all read hiatusTextFor(), which
// keeps ''. renderMonthView's all-phase band alone read `hiatusTexts[wk] || 'Hiatus'`, so the
// month view and the month PDF printed "Hiatus" on a band the user had emptied. (Its PER-PHASE
// band already used an `in` test and kept a blank blank.)
//
// The calendar is the harness's reference calendar, T.buildFixture(), plus a 2-week all-phase
// hiatus from 8/24/26 whose two week labels are emptied through the real note editor. It is then
// saved through the real Save (a recording handle stands in for the OS picker only), and the text
// is returned as out.mintText -- that is how tests/fixtures/hiatus-blanklabel.sptcal was minted,
// the calendar the month-PDF A/B for N-1 runs on.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hiatuslabel', cases: [] };
  var WEEKS = ['2026-08-24', '2026-08-31'];
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
  function sheetLabels() {
    return WEEKS.map(function (w) {
      var td = document.querySelector('#table-wrap td.sheet-hiatus-cell[data-week="' + w + '"]');
      return td ? (td.textContent || '').trim() : null;
    });
  }
  // Every all-phase hiatus band in a month-view document (the screen, or #print-root's copy).
  // The reference calendar has no per-phase hiatus, so every .mv-hiatus-bar is all-phase.
  function bandTexts(root) {
    return Array.from(root.querySelectorAll('.mv-hiatus-bar')).map(function (b) { return (b.textContent || '').trim(); });
  }
  // The waterfall PDF's text runs that read exactly "Hiatus", from its inflated content streams.
  async function pdfHiatusRuns() {
    var blob = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    var bytes = new Uint8Array(await blob.arrayBuffer()), s = '', n = 0;
    for (var i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      // ⚠️ Drop the EOL before `endstream`. Python's zlib ignores bytes after the compressed data;
      // Chrome's DecompressionStream REJECTS them, and a swallowed rejection read as "no Hiatus".
      while (en > st && (bytes[en - 1] === 10 || bytes[en - 1] === 13)) en--;
      try {
        var ds = new Blob([bytes.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var txt = await new Response(ds).text();
        n += (txt.match(/\(Hiatus\)/g) || []).length;
      } catch (e) { /* not a Flate stream */ }
    }
    return n;
  }
  async function blankLabel(week) {
    var td = document.querySelector('#table-wrap td.sheet-hiatus-cell[data-week="' + week + '"]');
    if (!td) throw new Error('no hiatus cell for ' + week);
    td.click();
    await T.until(function () { return !!document.querySelector('.note-editor textarea'); }, 'the hiatus editor for ' + week, 50, 100);
    var ta = document.querySelector('.note-editor textarea');
    ta.value = '';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // Ctrl+Enter is the explicit commit, as T.typeUserNote uses for notes.
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await T.until(function () { return !document.querySelector('.note-editor textarea'); }, 'the editor to close', 50, 100);
    await settle('the grid after the commit');
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    T.addHiatus('2026-08-24', 2);
    await T.until(function () { return sheetLabels().every(function (x) { return x !== null; }); }, 'the two hiatus rows', 200, 100);
    await settle('the calendar to settle');

    // Control: before any edit the default label shows everywhere, so the checks below can see it.
    var pre = { sheet: sheetLabels(), pdf: await pdfHiatusRuns() };
    // ⚠️ The reference calendar ALSO carries the default hiatus from 12/21/26 (DEFAULT_HIATUSES), whose
    // labels legitimately stay "Hiatus" -- so the PDF counts are RELATIVE: emptying two weeks must
    // remove exactly two runs, and every month-PDF check reads only the August and September pages.
    kase('N1-0', 'control: before the edit, both hiatus weeks read "Hiatus" in the waterfall and its PDF',
         pre.sheet.join('|') === 'Hiatus|Hiatus' && pre.pdf >= WEEKS.length, pre);

    for (var i = 0; i < WEEKS.length; i++) await blankLabel(WEEKS[i]);
    var sheet = sheetLabels(), pdf = await pdfHiatusRuns();
    kase('N1-1', 'the waterfall shows both emptied labels blank', sheet.join('|') === '|', { sheet: sheet });
    kase('N1-2', 'the waterfall PDF stops drawing "Hiatus" on exactly the two emptied weeks',
         pdf === pre.pdf - WEEKS.length, { before: pre.pdf, after: pdf });

    // The month view: 8/24-8/28 and 8/31 are in August's grid, 9/1-9/4 in September's.
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    await settle('the month grid to settle');
    var screen = [];
    for (var g = 0; g < 30; g++) {
      var mb = document.querySelector('#table-wrap .mv-monthbar');
      var label = mb ? (mb.textContent || '').match(/([A-Z][a-z]+) (\d{4})/) : null;
      label = label ? label[1] + ' ' + label[2] : '';
      if (label === 'August 2026' || label === 'September 2026') screen = screen.concat(bandTexts(document.getElementById('table-wrap')));
      if (label === 'September 2026') break;
      var nx = document.getElementById('mv-next');
      if (!nx || nx.disabled) break;
      nx.click();
      await T.until(function () { var b = document.querySelector('#table-wrap .mv-monthbar'); return b && b.textContent.indexOf(label) < 0; }, 'the next month', 100, 50);
    }
    kase('N1-3', 'the month view draws the emptied bands BLANK (it printed "Hiatus")',
         screen.length > 0 && screen.every(function (t) { return t === ''; }), { bands: screen });

    // The month PDF is #print-root at the moment exportMonthPdf calls window.print().
    var printed = null, realPrint = window.print;
    window.print = function () { var h = document.getElementById('print-root'); printed = h ? h.innerHTML : ''; };
    T.monthPrintPath();   // the PRINT path: this leg reads the print document (MONTH-PDF-WRITER-PLAN.md step 5)
    document.getElementById('export-btn').click();
    await T.until(function () { return printed !== null; }, 'the month print call', 200, 100);
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint;
    var doc = document.createElement('div'); doc.innerHTML = printed || '';
    var printedBands = [];
    Array.from(doc.querySelectorAll('.print-page')).forEach(function (pg) {
      var mb = pg.querySelector('.mv-monthbar'), t = mb ? (mb.textContent || '') : '';
      if (t.indexOf('August 2026') >= 0 || t.indexOf('September 2026') >= 0) printedBands = printedBands.concat(bandTexts(pg));
    });
    kase('N1-4', 'the month PDF prints the emptied bands BLANK (it printed "Hiatus")',
         printedBands.length > 0 && printedBands.every(function (t) { return t === ''; }), { bands: printedBands });

    // Mint through the real Save.
    var written = [];
    var h = { name: 'hiatus-blanklabel.sptcal', kind: 'file',
      queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
      isSameEntry: async function (o) { return o === h; },
      getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hiatus-blanklabel.sptcal', { lastModified: 1 }); },
      createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
    window.showSaveFilePicker = async function () { return h; };
    document.getElementById('save-file-btn').click();
    await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
    var snap = JSON.parse(written[0]);
    out.mintText = written[0];
    kase('N1-5', 'the saved calendar keeps both labels as "" (blank, not deleted back to the default)',
         snap.hiatusTexts && snap.hiatusTexts['2026-08-24'] === '' && snap.hiatusTexts['2026-08-31'] === '',
         { hiatusTexts: snap.hiatusTexts });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hiatuslabel threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
