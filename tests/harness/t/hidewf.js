// hidewf -- "Hide in waterfall" on a phase card (owner, 23 Oct 2026; PHASES-TAB-PLAN.md §2, rulings R1-R4, D1-D4):
// a phase that belongs on the month view only (*"if you add a very specific phase to the month view (such as color
// grading week) you wouldn't want that to show on the waterfall calendar"*). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hidewf ./run.sh hidewf 400
//
// tests/fixtures/hidewf.sptcal is T.buildFixture()'s calendar plus a custom "Colour Grading" phase, Dates, Mon 1/11/27 to
// Fri 1/22/27, under Post, its Hide in waterfall ticked. Cut from the running app's own Save (byte for byte).
//
//   W1  the waterfall with the phase hidden IS the waterfall with the phase not scheduled at all: the same rows, cells
//       and columns (so no empty column and no year block), and the phase's name nowhere in #table-wrap
//   W2  the workbook: the same cells, fills, merges and widths as with the phase not scheduled, and no "Colour Grading"
//   W3  the waterfall PDF: the same page content as with the phase not scheduled, and no "Colour Grading"
//   W4  a positive control: where it overlaps two phases, shown it opens a column; hidden it does not (so W1-W3 could see it)
//   M1  the month view is the SAME, hidden or not (January 2027's markup, byte for byte), and draws "Colour Grading"
//   M2  the written month PDF draws "Colour Grading"
//   Y1  hidden and alone in a later year (2028), it adds no 2028 block to the waterfall; the month view draws it there
//   N1  Writer's Room hidden: its "Writer's Room Opens" note leaves the waterfall, the workbook and the waterfall PDF,
//       and stays in the month view
//   C1  the cards: one tick on every phase card but Production's (Production none, Episodic Prep none), no id on any;
//       the fixture's tick on; "Month view only" on Colour Grading and Episodic Prep only, inside the head
//   C2  the tag stays on screen while the card is folded
//   U1  one undo step each way: untick, undo (ticked, hidden again), redo
//   F1  Save writes phaseHidden {custom1: {sheet: true}} and no new field id; Load brings it back
//   F2  the same file with no key opens with nothing hidden (the M-5 trap), and the phase back in the waterfall
//   F3  nothing hidden saves byte for byte the file it was before the key existed
//   F4  a hostile key: Production, an unknown phase and a non-true value are dropped (and counted), a good entry kept
//   R1  removing the phase prunes its entry (the next Save has no phaseHidden); undo brings phase and tick back
//   S1  Shift All still moves a hidden phase (its start, a week later)
//   E0  no console errors, apart from the one warning F4's hostile values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hidewf', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function byId(id) { return document.getElementById(id); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) {
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!document.querySelector('#table-wrap .mv-daygrid') : !!document.querySelector('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await settle();
  }
  async function toMonth(label) {
    if (!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 60; i++) {
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  async function phasesTab() {
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
    await T.sleep(150);
  }
  function rowOf(key) { var sw = byId('swatch-' + key); return sw ? sw.closest('.phase-row') : null; }
  function tickOf(key) { var r = rowOf(key); return r ? r.querySelector('.phase-hidewf-cb') : null; }
  function tagOf(key) { var r = rowOf(key); return r ? r.querySelector('.phase-mvonly-tag') : null; }
  function tagShown(key) { var t = tagOf(key); return !!t && !t.hidden && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().height > 0; }
  // ⛔ HIT-TESTED: the element on top at the switch's centre must be the switch, and THAT element gets the click.
  async function clickTick(key) {
    await phasesTab();
    var b = tickOf(key);
    if (!b) throw new Error('no Hide in waterfall tick on ' + key + '\'s card');
    b.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== b) throw new Error('the tick is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await settle();
  }
  function wfText() { return txt(byId('table-wrap')); }
  // The waterfall as a writer sees it: every row's cells and spans, and the column keys and widths.
  function wfGrid() { return { rows: T.gridSignature(), cols: T.colList() }; }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- the exports ------------------------------------------------------------------------------------------------
  async function exportAgain(id, label) { await T.sleep(700); return T.captureExport(id, label); }   // reClickGuard(600)
  async function workbook(label) {
    var b = await exportAgain('export-btn', label);
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
    var ws = wb.worksheets[0], cells = [], widths = [];
    ws.eachRow({ includeEmpty: true }, function (row, r) {
      row.eachCell({ includeEmpty: true }, function (c, k) {
        var v = c.value; if (v && typeof v === 'object') v = JSON.stringify(v);
        var fill = c.fill && c.fill.fgColor ? c.fill.fgColor.argb : '';
        if (v !== null && v !== undefined && v !== '' || fill) cells.push(r + ',' + k + '=' + v + '|' + fill);
      });
    });
    for (var i = 1; i <= ws.columnCount; i++) widths.push(ws.getColumn(i).width);
    // The header and footer carry today's date, so they are left out; the grid is what W2 is about.
    return { cells: cells, widths: widths, merges: ws.model.merges.slice().sort(), rows: ws.rowCount };
  }
  function xlsxHas(wb, s) { return wb.cells.some(function (c) { return c.indexOf(s) !== -1; }); }
  async function inflate(u8) {
    var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    var r = ds.readable.getReader(), parts = [], n = 0;
    for (;;) { var x = await r.read(); if (x.done) break; parts.push(x.value); n += x.value.length; }
    var o = new Uint8Array(n), k = 0; parts.forEach(function (p) { o.set(p, k); k += p.length; });
    return new TextDecoder('latin1').decode(o);
  }
  // The waterfall PDF's page content (object 4, the writer's one content stream), its date stamp masked.
  async function wfPdf(label) {
    var blob = await exportAgain('export-wf-pdf-btn', label);
    var u8 = new Uint8Array(await blob.arrayBuffer()), s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var L = +((s.match(/4 0 obj\s*<< \/Length (\d+)/) || [])[1] || 0);
    var a = s.indexOf('stream'), st = a + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
    var c = await inflate(u8.subarray(st, st + L));
    return c.replace(/\(\d{1,2}\.\d{1,2}\.\d{2}\) Tj/g, '(STAMP) Tj');
  }
  // The written month PDF's text runs (every Flate stream's "(text) Tj").
  async function monthPdfRuns() {
    T.monthPrintPath(false);
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var u8 = rec.files.filter(function (f) { return f.closed; })[0].bytes, s = '', runs = [];
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var t = await new Response(ds).text(), tj = /\(((?:\\.|[^\\)])*)\) Tj/g, x;
        while ((x = tj.exec(t))) runs.push(x[1].replace(/\\(.)/g, function (m0, ch) { return ch; }));
      } catch (e) { /* not a Flate stream */ }
    }
    return runs;
  }

  // ---- Save and Load through the real controls ----------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'hidewf.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hidewf.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    // After a Load the linked file is the fake picker's, which records {file, text}.
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'hidewf-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  // A file as the app writes it, with the keys a Load changes for its own reasons (the tab, the view) taken out.
  function comparable(text) { var o = JSON.parse(text); delete o.sidebarTab; delete o.viewMode; return JSON.stringify(o, null, 1); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!byId('name-custom1') && byId('name-custom1').value === 'Colour Grading'; }, 'the fixture', 200, 100);
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var fixtureText = await (await fetch('/tests/fixtures/hidewf.sptcal')).text();

    // ===== C1: the cards ===========================================================================================
    await step('C1', async function () {
      await phasesTab();
      var rows = Array.from(document.querySelectorAll('#phase-rows > .phase-row, #custom-phase-rows > .phase-row'));
      var per = rows.map(function (r) {
        var sw = r.querySelector(':scope > .swatch'), key = sw ? sw.id.slice(7) : '?';
        var ticks = r.querySelectorAll('.phase-hidewf-cb'), tag = r.querySelector('.phase-mvonly-tag');
        return { key: key, ticks: ticks.length, tickIds: Array.from(ticks).filter(function (b) { return b.id; }).length,
                 tagInHead: !!(tag && tag.closest('.custom-phase-header')), tagHidden: tag ? tag.hidden : null };
      });
      var get = function (k) { return per.filter(function (p) { return p.key === k; })[0] || {}; };
      var ok = per.length === 8 && get('production').ticks === 0 && get('episodePrep').ticks === 0 &&
        ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization', 'custom1'].every(function (k) { return get(k).ticks === 1 && get(k).tickIds === 0; }) &&
        tickOf('custom1').checked === true && ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization'].every(function (k) { return tickOf(k).checked === false && get(k).tagHidden === true; }) &&
        get('custom1').tagInHead && get('custom1').tagHidden === false && tagShown('custom1') &&
        get('episodePrep').tagInHead && get('episodePrep').tagHidden === false && !get('production').tagInHead;
      kase('C1', 'one Hide in waterfall tick (no id) on every phase card but Production\'s and Episodic Prep\'s; the fixture\'s on Colour Grading is on; "Month view only" in the head of Colour Grading and Episodic Prep only',
           ok, { per: per });
    });

    // ===== A: hidden (the fixture as loaded) ========================================================================
    await view('sheet');
    var gridA = wfGrid(), textA = wfText();
    var xlA = await workbook('the workbook, hidden');
    var pdfA = await wfPdf('the waterfall PDF, hidden');
    await toMonth('January 2027');
    var mvA = byId('table-wrap').innerHTML, mvTextA = wfText();
    var mpdfA = await monthPdfRuns();

    // ===== C: the tick off (W4, M1, U1) ============================================================================
    await view('sheet');
    await clickTick('custom1');
    var gridC = wfGrid(), textC = wfText(), tagOffC = !tagShown('custom1');
    await toMonth('January 2027');
    var mvC = byId('table-wrap').innerHTML;
    await view('sheet');

    await step('M1', async function () {
      kase('M1', 'the month view is the same whether Colour Grading is hidden or not (January 2027, byte for byte), and draws it',
           mvA === mvC && /Colour Grading/.test(mvTextA), { same: mvA === mvC, lenA: mvA.length, lenC: mvC.length });
    });
    await step('M2', async function () {
      kase('M2', 'the written month PDF draws Colour Grading while it is hidden in the waterfall',
           mpdfA.some(function (r) { return /Colour Grading/.test(r); }), { runs: mpdfA.filter(function (r) { return /Colour/.test(r); }).slice(0, 4) });
    });

    // ===== U1: one undo step each way ==============================================================================
    await step('U1', async function () {
      var offNow = tickOf('custom1').checked === false;
      await undo();
      var back = tickOf('custom1').checked === true && tagShown('custom1') && !/Colour Grading/.test(wfText());
      await redo();
      var again = tickOf('custom1').checked === false && /Colour Grading/.test(wfText());
      await undo();
      var hiddenAgain = tickOf('custom1').checked === true && !/Colour Grading/.test(wfText()) && same(wfGrid(), gridA);
      kase('U1', 'the tick is ONE undo step: undo hides the phase again (tick and tag back), redo shows it, undo hides it (the waterfall exactly as before)',
           offNow && back && again && hiddenAgain, { offNow: offNow, back: back, again: again, hiddenAgain: hiddenAgain });
    });

    // ===== B: the phase not scheduled at all (W1-W3) ================================================================
    await step('W1', async function () {
      T.set('end-custom1', ''); T.set('start-custom1', '');
      await settle();
      var gridB = wfGrid(), xlB = await workbook('the workbook, unscheduled'), pdfB = await wfPdf('the waterfall PDF, unscheduled');
      T.set('start-custom1', '2027-01-11'); T.set('end-custom1', '2027-01-22');
      await settle();
      kase('W1', 'the waterfall with Colour Grading hidden IS the waterfall with it not scheduled: the same rows, cells, spans and column keys (no empty column, no year block), and its name nowhere in it',
           same(gridA, gridB) && !/Colour Grading/.test(textA), { rows: gridA.rows.length, cols: gridA.cols.length, sameRows: same(gridA.rows, gridB.rows), sameCols: same(gridA.cols, gridB.cols) });
      kase('W2', 'the workbook: the same cells, fills, merges and column widths as with the phase not scheduled, and no "Colour Grading"',
           same(xlA, xlB) && !xlsxHas(xlA, 'Colour Grading'), { cells: xlA.cells.length, sameCells: same(xlA.cells, xlB.cells), sameWidths: same(xlA.widths, xlB.widths), sameMerges: same(xlA.merges, xlB.merges) });
      kase('W3', 'the waterfall PDF: the same page content as with the phase not scheduled, and no "Colour Grading"',
           pdfA === pdfB && pdfA.indexOf('Colour Grading') === -1 && pdfA.length > 1000, { lenA: pdfA.length, lenB: pdfB.length });
      kase('W1b', 'putting the dates back restores the hidden calendar exactly', same(wfGrid(), gridA), {});
    });

    // ===== W4: the positive control, where showing the phase needs a column of its own ==============================
    // Mon 3/1/27 to Fri 3/5/27 is the week Post (column 0) and Localization (column 1) share, so shown, Colour Grading
    // opens a third 2027 column; hidden, it must not, and the waterfall must be A's.
    await step('W4', async function () {
      T.set('start-custom1', '2027-03-01'); T.set('end-custom1', '2027-03-05');
      await settle();
      var hiddenGrid = wfGrid();
      await clickTick('custom1');
      var shownGrid = wfGrid(), shownText = wfText();
      await clickTick('custom1');
      var hiddenAgain = wfGrid();
      T.set('start-custom1', '2027-01-11'); T.set('end-custom1', '2027-01-22');
      await settle();
      var n27 = function (g) { return g.cols.filter(function (c) { return /^y2027:s\d+(?!.)/.test(c.k); }).length; };
      kase('W4', 'positive control: in the week Post and Localization share, Colour Grading shown opens a third 2027 column; hidden, the 2027 block keeps two and the waterfall is the hidden fixture\'s (so W1-W3 can see a column appear); and on the fixture\'s dates, shown, it is in the waterfall and its tag goes',
           n27(shownGrid) === n27(hiddenGrid) + 1 && /Colour Grading/.test(shownText) && same(hiddenGrid, gridA) && same(hiddenAgain, gridA) &&
           /Colour Grading/.test(textC) && !same(gridC.rows, gridA.rows) && tagOffC,
           { hidden2027: n27(hiddenGrid), shown2027: n27(shownGrid), hiddenIsA: same(hiddenGrid, gridA), tagOff: tagOffC });
    });

    // ===== Y1: hidden, alone in a later year =======================================================================
    await step('Y1', async function () {
      T.set('start-custom1', '2028-03-06'); T.set('end-custom1', '2028-03-10');
      await settle();
      var gridY = wfGrid(), y2028 = gridY.cols.filter(function (c) { return /^y2028:/.test(c.k); }).length;
      var sameAsNone = same(gridY.rows, gridA.rows) && same(gridY.cols, gridA.cols);
      await toMonth('March 2028');
      var inMonth = /Colour Grading/.test(wfText());
      await view('sheet');
      T.set('start-custom1', '2027-01-11'); T.set('end-custom1', '2027-01-22');
      await settle();
      kase('Y1', 'hidden and alone in 2028, Colour Grading adds no 2028 block to the waterfall (it is the waterfall without it), and the month view draws it in March 2028',
           y2028 === 0 && sameAsNone && inMonth, { y2028cols: y2028, sameAsNone: sameAsNone, inMonth: inMonth });
    });

    // ===== N1: Writer's Room hidden takes its auto-note with it ====================================================
    await step('N1', async function () {
      // The NOTE, "Writer's Room Opens 1/5/26": the header's "Writer's Room Opens: 1.5.26" is the title block, not a
      // note, and stays (it describes the calendar in both views).
      var noteRe = /Writer's Room Opens 1\/5\/26/;
      var before = noteRe.test(wfText());
      await clickTick('writersRoom');
      var wfGone = !noteRe.test(wfText()) && !/Writer's Rm wk/.test(wfText());
      var xl = await workbook('the workbook, Writer\'s Room hidden');
      var pdf = await wfPdf('the waterfall PDF, Writer\'s Room hidden');
      // The workbook's and the PDF's header may still say when the room opens (it is the title block, not a note);
      // the NOTE is the dated "Writer's Room Opens 1/5/26" line.
      var xlGone = !xlsxHas(xl, 'Writer\'s Room Opens 1/5/26'), pdfGone = pdf.indexOf('Writer\'s Room Opens 1/5/26') === -1;
      await toMonth('January 2026');
      var inMonth = noteRe.test(wfText());
      await view('sheet');
      await clickTick('writersRoom');
      var restored = noteRe.test(wfText());
      kase('N1', 'Writer\'s Room hidden: its "Writer\'s Room Opens 1/5/26" note leaves the waterfall, the workbook and the waterfall PDF (with its cells), and stays in the month view; ticked off, it is back',
           before && wfGone && xlGone && pdfGone && inMonth && restored, { before: before, wfGone: wfGone, xlGone: xlGone, pdfGone: pdfGone, inMonth: inMonth, restored: restored });
    });

    // ===== C2: the tag while folded =================================================================================
    await step('C2', async function () {
      await phasesTab();
      var caret = rowOf('custom1').querySelector(':scope > .custom-phase-header > .phase-collapse-btn');
      caret.scrollIntoView({ block: 'center' }); await T.sleep(100);
      caret.click(); await T.sleep(200);
      var folded = rowOf('custom1').classList.contains('is-collapsed'), shown = tagShown('custom1'), tickHidden = getComputedStyle(tickOf('custom1').closest('.phase-switches')).display === 'none';
      caret.click(); await T.sleep(200);
      kase('C2', 'folded, Colour Grading\'s card still shows "Month view only" (its switch rows fold away)',
           folded && shown && tickHidden && !rowOf('custom1').classList.contains('is-collapsed'), { folded: folded, shown: shown, tickHidden: tickHidden });
    });

    // ===== F: the file ==============================================================================================
    var saved = null;
    await step('F1', async function () {
      saved = await save();
      var s = JSON.parse(saved), fx = JSON.parse(fixtureText);
      var ids = Object.keys(s.fields.byId), fxIds = Object.keys(fx.fields.byId);
      var ok = same(s.phaseHidden, { custom1: { sheet: true } }) && same(ids, fxIds) && ids.every(function (k) { return !/hidewf|hide/i.test(k); });
      // Load the file with the tick off first, so the Load has something to put back.
      var off = JSON.parse(saved); delete off.phaseHidden;
      await load(JSON.stringify(off, null, 1));
      var offLoaded = tickOf('custom1').checked === false && /Colour Grading/.test(wfText()) && !tagShown('custom1');
      await load(saved);
      var back = tickOf('custom1').checked === true && !/Colour Grading/.test(wfText()) && tagShown('custom1') && same(wfGrid(), gridA);
      kase('F1', 'Save writes phaseHidden {custom1: {sheet: true}} and the same field ids, in the same order, as the fixture (no id for the tick); Load brings the tick, the tag and the waterfall back',
           ok && back, { phaseHidden: s.phaseHidden, sameIds: same(ids, fxIds), back: back });
      kase('F2', 'the same file with NO phaseHidden key opens with nothing hidden, never the previous calendar\'s tick (the M-5 trap): Colour Grading is back in the waterfall',
           offLoaded, { offLoaded: offLoaded });
    });

    await step('F3', async function () {
      await clickTick('custom1');                         // nothing hidden now
      var plain = await save();
      var fx = JSON.parse(fixtureText); delete fx.phaseHidden;
      // The fixture was saved when un-renamed episodes were named "Shoot Ep. 201"; since 28 Oct 2026 they open (and so
      // save) as "Episode 201", the default again. A typed name would be kept, and this fixture has none.
      (fx.episodeDefs || []).forEach(function (e) { if (!e.nameEdited) e.name = String(e.name).replace(/^Shoot Ep\. /, 'Episode '); });
      var noKey = !('phaseHidden' in JSON.parse(plain));
      kase('F3', 'with nothing hidden the file carries no phaseHidden key, and is byte for byte the fixture without one (tab and view aside)',
           noKey && comparable(plain) === comparable(JSON.stringify(fx, null, 1)), { noKey: noKey, len: plain.length });
      await clickTick('custom1');                         // hidden again
    });

    await step('F4', async function () {
      var s = JSON.parse(saved);
      s.phaseHidden = { production: { sheet: true }, custom9: { sheet: true }, prePrep: { sheet: 'yes' }, post: { sheet: true }, localization: 'x' };
      await load(JSON.stringify(s, null, 1));
      var ticks = ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization', 'custom1'].map(function (k) { return k + ':' + tickOf(k).checked; });
      var after = JSON.parse(await save());
      var postGone = !/Post wk 1\b/.test(wfText());
      kase('F4', 'a hostile phaseHidden keeps only what the app writes: Post hidden; Production, an unknown phase, a non-true value and a non-object dropped (Colour Grading, not in the key, shown)',
           same(after.phaseHidden, { post: { sheet: true } }) && tickOf('post').checked === true && tickOf('custom1').checked === false && tickOf('prePrep').checked === false && postGone,
           { ticks: ticks, saved: after.phaseHidden, postGone: postGone });
      await load(saved);
    });

    // ===== R1: removing the phase prunes its entry ==================================================================
    await step('R1', async function () {
      await phasesTab();
      var x = rowOf('custom1').querySelector('.remove-custom-phase');
      x.click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Remove')) break; }
      await settle();
      var gone = !byId('swatch-custom1');
      var s = JSON.parse(await save());
      var pruned = !('phaseHidden' in s);
      await undo();
      var back = !!byId('swatch-custom1') && tickOf('custom1').checked === true && !/Colour Grading/.test(wfText());
      kase('R1', 'removing Colour Grading prunes its entry (the next Save has no phaseHidden); undo brings the phase back, still hidden',
           gone && pruned && back, { gone: gone, pruned: pruned, back: back });
    });

    // ===== S1: the shift tools still move a hidden phase ============================================================
    await step('S1', async function () {
      var s0 = byId('start-custom1').value;
      var btn = Array.from(document.querySelectorAll('button')).filter(function (b) { return /1 wk\s*→/.test(txt(b)); })[0];
      if (!btn) throw new Error('no "1 wk →" button');
      btn.click(); await settle();
      var s1 = byId('start-custom1').value;
      await undo();
      kase('S1', 'Shift All +1 wk moves a hidden phase with the rest (its start a week later), and it stays out of the waterfall',
           s0 === '2027-01-11' && s1 === '2027-01-18' && byId('start-custom1').value === s0, { s0: s0, s1: s1 });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/value\(s\) in this calendar were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (the one F4 warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hidewf threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
