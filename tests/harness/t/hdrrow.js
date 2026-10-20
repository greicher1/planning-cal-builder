// hdrrow -- the waterfall's header text and its dates: owner rulings 2, 4 and 10 (20 Oct 2026),
// HEADER-ROW-PLAN.md. A gate.sh leg (the generic self-judging block).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh hdrrow 400
//
// All three are frozen edits the owner signed off by picker, each INERT by default. The byte-compare of
// the default waterfall PDF and workbook is gate 2/3's job; this leg holds the shapes that prove each
// feature is off until chosen, then drives each one through the real controls and reads every output:
// the screen, the workbook (read back through the page's own ExcelJS) and the waterfall PDF (its content
// stream, inflated here).
//
//   I   -- inert: Date | year | Notes, m/d/yy, the title block, the 0.75in top; no new snapshot key.
//   O   -- Header: Off (ruling 10, "Reclaim it"): the menu row (waterfall only), the title block gone on
//          screen and in the print fallback's CSS, no Excel page header and a 0.25in top, no PDF header
//          text and the grid 18pt down, one undo step, Off over Manual keeps the lines, Save/Load and the
//          M-5 trap (a file with no key opens with its header on).
//   D   -- the date format (ruling 4, notes "Keep 1/6/25"): 1/6/2025 on screen, wider THROUGH the width
//          model with 0 clipped cells, auto notes untouched, Excel's numFmt and real dates, the PDF's text,
//          one undo step, Save/Load and the M-5 trap.
//   H   -- custom column headings (ruling 2, "Opt-in switch"): the year over the Date column, identical
//          neighbours merge, the editor (one field per column, no ids), Excel's merges and values, the PDF's
//          text, shrink-not-widen with 0 clipped cells, Reset and Esc, off keeps the labels, Save/Load,
//          the M-5 trap, and the PDF's unprintable-character check naming a heading.
//   N   -- New clears all three.
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hdrrow', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function byId(id) { return document.getElementById(id); }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label || 'the grid to settle', 200, 100);
  }
  function heads() {
    return Array.from(document.querySelectorAll('#table-wrap table.sheet-table thead th'))
      .map(function (t) { return (t.textContent || '').trim() + '@' + t.colSpan; });
  }
  function dates() {
    return Array.from(document.querySelectorAll('#table-wrap td.sheet-date'))
      .map(function (t) { return (t.textContent || '').trim(); }).filter(Boolean);
  }
  function barShown() {
    var b = document.querySelector('#table-wrap .cal-header-bar');
    return !!b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0;
  }
  function hdrBtn() { return ((byId('tb-hdr-mode-btn') || {}).textContent || '').replace(/[^\w: ]/g, '').trim(); }
  function sameArr(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // ---- the header mode menu, through the toolbar button the user clicks ----------------------------
  // The menu closes on a mousedown outside it (onHdrModePopOutside); a second click on its button would
  // also close it, so always start from closed.
  async function closeMenu() {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await T.sleep(100);
  }
  async function menuRows() {
    await closeMenu();
    byId('tb-hdr-mode-btn').click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the header mode menu', 50, 100);
    return Array.from(document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice .hdr-mode-name'))
      .map(function (n) { return n.textContent.trim(); });
  }
  async function chooseMode(label) {
    await menuRows();
    var row = Array.from(document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice'))
      .find(function (r) { return r.querySelector('.hdr-mode-name').textContent.trim() === label; });
    if (!row) throw new Error('no ' + label + ' row in the header mode menu');
    row.click();
    await settle('the grid after Header: ' + label);
  }
  async function undo() { byId('undo-btn').click(); await settle('the grid after undo'); }
  async function redo() { byId('redo-btn').click(); await settle('the grid after redo'); }

  // ---- the workbook and the PDF, read back --------------------------------------------------------
  async function xlsx() {
    await T.sleep(600);
    var blob = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    var ws = wb.worksheets[0];
    var row1 = [];
    for (var c = 1; c <= ws.columnCount; c++) {
      // ExcelJS reads a merged cell's other cells as the master's value: report them empty, as written.
      var cell1 = ws.getRow(1).getCell(c);
      var v = (cell1.isMerged && cell1.master && cell1.master.address !== cell1.address) ? '' : cell1.value;
      row1.push(v === null || v === undefined ? '' : (typeof v === 'number' ? v : String(v)));
    }
    var merges1 = (ws.model.merges || []).filter(function (m) { return /^[A-Z]+1:[A-Z]+1/.test(m); });
    var a2 = ws.getRow(2).getCell(1);
    return {
      row1: row1, merges1: merges1,
      oddHeader: (ws.headerFooter && ws.headerFooter.oddHeader) || '',
      margins: ws.pageSetup.margins || {},
      a2fmt: a2.numFmt, a2isDate: a2.value instanceof Date,
      e2: ws.getRow(2).getCell(ws.columnCount > 4 ? 5 : 1).value,
      shrink: row1.map(function (_, i) { var al = ws.getRow(1).getCell(i + 1).alignment; return !!(al && al.shrinkToFit); })
    };
  }
  async function pdfOf(blob) {
    var bytes = new Uint8Array(await blob.arrayBuffer());
    var latin = '';
    for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var mb = latin.match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/);
    var H = mb ? parseFloat(mb[2]) : NaN;
    var content = '', re = /stream\r?\n/g, m;
    while ((m = re.exec(latin))) {
      var s0 = m.index + m[0].length, en = latin.indexOf('endstream', s0);
      if (en < 0) continue;
      while (en > s0 && (bytes[en - 1] === 10 || bytes[en - 1] === 13 || bytes[en - 1] === 32)) en--;
      try {
        var ds = new DecompressionStream('deflate'); var w = ds.writable.getWriter();
        w.write(bytes.subarray(s0, en)); w.close();
        var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), sTxt = '';
        for (var j = 0; j < u.length; j += 8192) sTxt += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
        if (/\bTf\b/.test(sTxt) && /\bTj\b/.test(sTxt)) { content = sTxt; break; }
      } catch (e) { /* font streams */ }
    }
    var strings = [], sm, sre = /\(((?:\\.|[^\\)])*)\) Tj/g;
    while ((sm = sre.exec(content))) strings.push(sm[1].replace(/\\(.)/g, function (_, ch) { return ch; }));
    // The column header row's grey fill: the first #D9D9D9 rect. Its top edge, from the TOP of the page,
    // is where the grid starts.
    var top = null, rm, rre = /0\.8510 0\.8510 0\.8510 rg ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re f/g;
    if ((rm = rre.exec(content))) top = Math.round((H - parseFloat(rm[2]) - parseFloat(rm[4])) * 100) / 100;
    return { strings: strings, gridTop: top, H: H, len: bytes.length };
  }
  async function pdf() {
    await T.sleep(600);
    return pdfOf(await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob'));
  }

  // ---- Save and Load through the real paths (offweek's shape) -------------------------------------
  var written = [];
  function textOf(w) { return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'hdrrow.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? textOf(written[written.length - 1]) : ''], 'hdrrow.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return textOf(written[written.length - 1]);
  }
  // ⚠️ WAITS ON THE RESTORED STATE, NOT THE FILE-MENU LABEL. openRecentFile() applies the calendar and only
  // then awaits persistRecents() (IndexedDB) before renderRecents() writes the label -- and IndexedDB can
  // stall under --virtual-time-budget (README, fsprobe). Waiting on the label failed one run in three, at a
  // different load each time. So each loaded text carries a different `sidebarTab` (a key applyStateSnapshot
  // restores and refreshAfterRestore shows), cycling through all three, and the load is in when that tab is.
  var loads = 0, TABS = ['phases', 'settings', 'show'];
  function activeTab() { var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  async function load(text) {
    var stem = 'hdrrow-load-' + (++loads), name = stem + '.sptcal';
    var snap = JSON.parse(text), tab = TABS[loads % 3];
    if (tab === activeTab()) tab = TABS[(loads + 1) % 3];
    snap.sidebarTab = tab;
    var p = T.openViaFakePicker('/tests/fixtures/v1.5.0-saved.sptcal', name, { text: JSON.stringify(snap), writes: written });
    // The unsaved-work question can come up late under load: keep answering it until the file is in.
    for (var i = 0; i < 100; i++) { await T.sleep(100); if (activeTab() === tab) break; T.clickModalButton('Load'); }
    await p;
    try {
      await T.until(function () { return activeTab() === tab; }, 'the loaded calendar (its sidebar tab)', 100, 100);
    } catch (e) {
      throw new Error(e.message + ' [load ' + loads + '; tab ' + activeTab() + ' want ' + tab + '; modal ' + T.modalText().slice(0, 200) + ']');
    }
    await settle('the grid after Load');
  }

  // ---- the heading editor ---------------------------------------------------------------------------
  function headCell(text) {
    return Array.from(document.querySelectorAll('#table-wrap th.hdrrow-cell'))
      .find(function (t) { return (t.textContent || '').trim() === text; });
  }
  // Click a heading at a fraction of its width (the editor focuses the column under the pointer).
  async function openHeading(text, frac, nth) {
    var cells = Array.from(document.querySelectorAll('#table-wrap th.hdrrow-cell'))
      .filter(function (t) { return (t.textContent || '').trim() === text; });
    var th = cells[nth || 0];
    if (!th) throw new Error('no heading reading ' + text);
    th.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    var r = th.getBoundingClientRect();
    var x = Math.round(r.left + r.width * (frac === undefined ? 0.5 : frac)), y = Math.round(r.top + r.height / 2);
    th.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    await T.until(function () { return !!document.querySelector('.hdrrow-pop'); }, 'the heading editor', 30, 100);
    return document.querySelector('.hdrrow-pop');
  }
  function fieldVals(pop) { return Array.from(pop.querySelectorAll('input')).map(function (i) { return i.value; }); }
  function typeInto(input, text) {
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  async function enter(pop) {
    var inp = pop.querySelector('input:focus') || pop.querySelector('input');
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle('the grid after a heading commit');
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await settle('the calendar to settle');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    // ===== I: inert ====================================================================================
    var H0 = heads(), D0 = dates(), W0 = T.gridWidthPt(), C0 = T.colList();
    var sw = byId('wf-hdr-custom'), sel = byId('wf-date-format');
    kase('I1', 'the default header row is Date | year | Notes per block, with no editable heading cells, and dates read m/d/yy',
      sameArr(H0, ['Date@1', '2026@1', 'Notes@1', 'Date@1', '2027@2', 'Notes@1']) &&
      !document.querySelector('#table-wrap th.hdrrow-cell') &&
      D0.length > 50 && D0.every(function (d) { return /^\d{1,2}\/\d{1,2}\/\d{2}(?!\d)/.test(d) && d.length <= 8; }) && D0[0] === '1/5/26',
      { heads: H0, firstDates: D0.slice(0, 3) });
    kase('I2', 'the Waterfall Layout controls start at their defaults, inside .prefs-card (so collectFieldValues cannot sweep them); the header is on',
      !!sw && !!sel && sw.checked === false && sel.value === '' && !!sw.closest('.prefs-card') && !!sel.closest('.prefs-card') &&
      hdrBtn() === 'Header: Auto' && barShown() && !document.body.classList.contains('wf-hdr-off'),
      { sw: !!sw, sel: sel && sel.value, btn: hdrBtn() });
    var x0 = await xlsx();
    kase('I3', 'the default workbook: row 1 Date / year / Notes, the year merged over the phase columns, built-in date format 14, a page header, a 0.75in top',
      sameArr(x0.row1, ['Date', 2026, 'Notes', 'Date', 2027, '', 'Notes']) && sameArr(x0.merges1, ['E1:F1']) &&
      x0.a2fmt === 'mm-dd-yy' && x0.a2isDate && /Test Show S2/.test(x0.oddHeader) && x0.margins.top === 0.75 && x0.margins.header === 0.3,
      { row1: x0.row1, merges1: x0.merges1, a2fmt: x0.a2fmt, margins: x0.margins, oddHeaderLen: x0.oddHeader.length });
    var p0 = await pdf();
    kase('I4', 'the default waterfall PDF: the title block, Date / 2026 / Notes headings, m/d/yy dates, the grid 54pt down',
      p0.strings.indexOf('Test Show S2') !== -1 && p0.strings.indexOf('Planning Calendar') !== -1 &&
      p0.strings.indexOf('Date') !== -1 && p0.strings.indexOf('2026') !== -1 && p0.strings.indexOf('Notes') !== -1 &&
      p0.strings.indexOf('1/5/26') !== -1 && p0.gridTop === 54,
      { gridTop: p0.gridTop, n: p0.strings.length });
    var plain = JSON.parse(await save());
    var ids0 = Object.keys(plain.fields.byId).sort();
    kase('I5', 'an untouched calendar saves NONE of the new keys (byte for byte the format before), and no wf-* id in fields.byId',
      !('headerOff' in plain) && !('dateFormat' in plain) && !('headerRowCustom' in plain) && !('headerRowLabels' in plain) &&
      !ids0.some(function (k) { return /^wf-/.test(k); }),
      { ids: ids0.length });
    var fixtureText = JSON.stringify(plain);

    // ===== O: Header: Off =============================================================================
    var rows = await menuRows();
    await closeMenu();
    byId('view-month-btn').click(); await settle('the month view');
    var mrows = await menuRows();
    await closeMenu();
    byId('view-sheet-btn').click(); await settle('the waterfall');
    kase('O1', 'the waterfall header menu offers Auto / Template / Manual / Off; the month view menu has no Off',
      sameArr(rows, ['Auto', 'Template', 'Manual', 'Off']) && sameArr(mrows, ['Auto', 'Template', 'Manual']),
      { rows: rows, monthRows: mrows });
    var gridTopBefore = document.querySelector('#table-wrap .sheet-grid-wrap').getBoundingClientRect().top;
    await chooseMode('Off');
    var gridTopOff = document.querySelector('#table-wrap .sheet-grid-wrap').getBoundingClientRect().top;
    // The print fallback renders into #print-root: the hiding rule must reach a header bar there too.
    var pr = byId('print-root'), probe = document.createElement('div');
    probe.className = 'cal-header-bar'; pr.appendChild(probe);
    var printHidden = getComputedStyle(probe).display === 'none'; probe.remove();
    kase('O2', 'Off: the title block is gone and the grid moves up to the top; the button reads Header: Off; the print fallback hides it too; the headings are unchanged',
      !barShown() && document.body.classList.contains('wf-hdr-off') && hdrBtn() === 'Header: Off' &&
      gridTopOff < gridTopBefore - 30 && printHidden && sameArr(heads(), H0),
      { moved: Math.round(gridTopBefore - gridTopOff), btn: hdrBtn(), printHidden: printHidden });
    var xo = await xlsx();
    kase('O3', 'Off: the workbook has NO page header, and its top margin is reclaimed (0.25in, header 0); row 1 unchanged',
      xo.oddHeader === '' && xo.margins.top === 0.25 && xo.margins.header === 0 && xo.margins.left === 0.25 && xo.margins.bottom === 0.75 &&
      sameArr(xo.row1, x0.row1),
      { oddHeader: xo.oddHeader, margins: xo.margins });
    var po = await pdf();
    kase('O4', 'Off: the PDF draws no header text, and the grid starts 18pt down (it was 54)',
      po.strings.indexOf('Test Show S2') === -1 && po.strings.indexOf('Planning Calendar') === -1 &&
      !po.strings.some(function (s) { return /Production Span|Episodes/.test(s); }) && po.gridTop === 18 &&
      po.strings.indexOf('Date') !== -1,
      { gridTop: po.gridTop });
    await undo();
    var undone = { bar: barShown(), btn: hdrBtn() };
    await redo();
    var redone = { bar: barShown(), btn: hdrBtn() };
    kase('O5', 'Off is ONE undo step: undo brings the header back (Auto), redo turns it off again',
      undone.bar && undone.btn === 'Header: Auto' && !redone.bar && redone.btn === 'Header: Off', { undone: undone, redone: redone });
    // Off over Manual keeps the hand-written lines.
    await chooseMode('Auto');
    await chooseMode('Manual');
    var line = document.querySelector('#table-wrap .cal-header-bar .hdr-line[data-hid="c3"]');
    line.focus(); line.textContent = 'Hand Line'; line.blur();
    await settle('the grid after a manual line');
    var manualText = document.querySelector('#table-wrap .cal-header-bar').textContent.replace(/\s+/g, ' ').trim();
    await chooseMode('Off');
    var offWhileManual = { bar: barShown(), btn: hdrBtn() };
    await chooseMode('Manual');
    var backText = document.querySelector('#table-wrap .cal-header-bar').textContent.replace(/\s+/g, ' ').trim();
    kase('O6', 'Off over a Manual header hides it, and choosing Manual again brings back the same hand-written lines',
      !offWhileManual.bar && /Hand Line/.test(manualText) && backText === manualText && hdrBtn() === 'Header: Manual',
      { offWhileManual: offWhileManual, same: backText === manualText });
    await chooseMode('Off');
    var offSaved = await save(), offSnap = JSON.parse(offSaved);
    await load(fixtureText);
    var afterPlain = { bar: barShown(), btn: hdrBtn() };
    await load(offSaved);
    var afterOff = { bar: barShown(), btn: hdrBtn() };
    var noKey = JSON.parse(offSaved); delete noKey.headerOff;
    await load(JSON.stringify(noKey));
    var m5 = { bar: barShown(), btn: hdrBtn() };
    kase('O7', 'Save writes headerOff: true (and no new field id); Load brings Off back; the same file with no key opens with its header ON (the M-5 trap)',
      offSnap.headerOff === true && sameArr(Object.keys(offSnap.fields.byId).sort(), ids0) &&
      afterPlain.bar && !afterOff.bar && afterOff.btn === 'Header: Off' && m5.bar && m5.btn === 'Header: Manual',
      { afterPlain: afterPlain, afterOff: afterOff, m5: m5 });
    await chooseMode('Auto');
    await load(fixtureText);

    // ===== D: the date format ==========================================================================
    var notesBefore = Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell.has-note')).map(function (t) { return t.textContent.trim(); });
    T.set('wf-date-format', 'm/d/yyyy');
    await settle('the grid after the date format');
    var D1 = dates(), W1 = T.gridWidthPt(), C1 = T.colList(), clip1 = T.clippedCells().h;
    var dateW = function (cl) { return cl.filter(function (c) { return /:date/.test(c.k); }).map(function (c) { return c.w; }); };
    kase('D1', '1/6/2025: every date reads m/d/yyyy, and the Date columns widen THROUGH the width model with 0 clipped cells',
      D1.length === D0.length && D1.every(function (d) { return /^\d{1,2}\/\d{1,2}\/\d{4}/.test(d); }) && D1[0] === '1/5/2026' &&
      W1 > W0 && dateW(C1).every(function (w, i) { return w > dateW(C0)[i]; }) && clip1.length === 0,
      { first: D1.slice(0, 2), width: [W0, W1], dateCols: [dateW(C0), dateW(C1)], clipped: clip1.slice(0, 3) });
    var notesAfter = Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell.has-note')).map(function (t) { return t.textContent.trim(); });
    kase('D2', 'automatic notes keep 1/6/25 (owner: "Keep 1/6/25")',
      notesBefore.length > 0 && sameArr(notesAfter, notesBefore) && notesAfter.some(function (n) { return /\d+\/\d+\/26\b/.test(n); }),
      { sample: notesAfter.slice(0, 2) });
    var xd = await xlsx();
    kase('D3', 'the workbook writes the date cells as REAL dates in m/d/yyyy, and nothing else in row 1 or the header moves',
      xd.a2fmt === 'm/d/yyyy' && xd.a2isDate && sameArr(xd.row1, x0.row1) && xd.oddHeader === x0.oddHeader,
      { a2fmt: xd.a2fmt, e2: xd.e2 && xd.e2.formula ? 'formula' : typeof xd.e2 });
    var pd = await pdf();
    kase('D4', 'the PDF draws 1/5/2026, not 1/5/26, in its Date column',
      pd.strings.indexOf('1/5/2026') !== -1 && pd.strings.indexOf('1/5/26') === -1 && pd.strings.indexOf('1/4/2027') !== -1,
      { gridTop: pd.gridTop });
    await undo();
    var dUndo = dates()[0];
    await redo();
    var dRedo = dates()[0];
    var dSaved = await save(), dSnap = JSON.parse(dSaved);
    await load(fixtureText);
    var dPlain = { first: dates()[0], sel: byId('wf-date-format').value };
    await load(dSaved);
    var dBack = { first: dates()[0], sel: byId('wf-date-format').value };
    var dNoKey = JSON.parse(dSaved); delete dNoKey.dateFormat;
    await load(JSON.stringify(dNoKey));
    var dM5 = { first: dates()[0], sel: byId('wf-date-format').value };
    kase('D5', 'one undo step; Save writes dateFormat "m/d/yyyy" (no new field id); Load brings it back and the select follows; no key opens 1/5/26 (M-5)',
      dUndo === '1/5/26' && dRedo === '1/5/2026' && dSnap.dateFormat === 'm/d/yyyy' && sameArr(Object.keys(dSnap.fields.byId).sort(), ids0) &&
      dPlain.first === '1/5/26' && dPlain.sel === '' && dBack.first === '1/5/2026' && dBack.sel === 'm/d/yyyy' &&
      dM5.first === '1/5/26' && dM5.sel === '',
      { dUndo: dUndo, dRedo: dRedo, dPlain: dPlain, dBack: dBack, dM5: dM5 });
    await load(fixtureText);

    // ===== H: custom column headings ===================================================================
    byId('wf-hdr-custom').click();
    await settle('the grid after the switch');
    var H1 = heads();
    kase('H1', 'switched on: the year moves over the Date column and merges with the phase columns that read the same; Notes stays; dates and widths untouched',
      sameArr(H1, ['2026@2', 'Notes@1', '2027@3', 'Notes@1']) && document.querySelectorAll('#table-wrap th.hdrrow-cell').length === 4 &&
      sameArr(dates(), D0) && T.gridWidthPt() === W0 && byId('wf-hdr-custom').checked === true,
      { heads: H1 });
    await undo();
    var hUndo = heads();
    await redo();
    kase('H2', 'the switch is ONE undo step', sameArr(hUndo, H0) && sameArr(heads(), H1), { hUndo: hUndo });
    // Edit the 2026 cell at its right-hand end: the phase column is under the pointer.
    var pop = await openHeading('2026', 0.8);
    var popIds = pop.querySelectorAll('[id]').length;
    var labels = Array.from(pop.querySelectorAll('.hdrrow-field span')).map(function (s) { return s.textContent.trim(); });
    var focusedIdx = Array.from(pop.querySelectorAll('input')).indexOf(document.activeElement);
    kase('H3', 'the editor shows one field per column of the merged cell (Date column, Column 1), focuses the column under the pointer, and carries NO id',
      sameArr(labels, ['Date column', 'Column 1']) && sameArr(fieldVals(pop), ['2026', '2026']) && focusedIdx === 1 && popIds === 0 &&
      pop.classList.contains('note-pop'),
      { labels: labels, focusedIdx: focusedIdx, ids: popIds });
    typeInto(pop.querySelectorAll('input')[1], 'WRITERS');
    await enter(pop);
    var H4 = heads();
    // Two neighbouring 2027 columns given the SAME heading merge into one cell.
    pop = await openHeading('2027', 0.6);
    typeInto(pop.querySelectorAll('input')[1], 'POST');
    typeInto(pop.querySelectorAll('input')[2], 'POST');
    await enter(pop);
    var H5 = heads();
    kase('H4', 'a typed heading splits the merged cell, and two neighbours typed the same merge: 2026 | WRITERS | Notes | 2027 | POST(2) | Notes',
      sameArr(H4, ['2026@1', 'WRITERS@1', 'Notes@1', '2027@3', 'Notes@1']) &&
      sameArr(H5, ['2026@1', 'WRITERS@1', 'Notes@1', '2027@1', 'POST@2', 'Notes@1']) && !document.querySelector('.hdrrow-pop'),
      { H4: H4, H5: H5 });
    await undo();
    var hUndo2 = heads();
    await redo();
    kase('H5', 'a heading commit is ONE undo step', sameArr(hUndo2, H4) && sameArr(heads(), H5), { hUndo2: hUndo2 });
    var xh = await xlsx();
    kase('H6', 'the workbook writes the same headings: the year as a number, POST merged over its two columns, shrinkToFit on the heading cells',
      sameArr(xh.row1, [2026, 'WRITERS', 'Notes', 2027, 'POST', '', 'Notes']) && sameArr(xh.merges1, ['E1:F1']) &&
      xh.shrink[0] && xh.shrink[1] && xh.shrink[4] && xh.oddHeader === x0.oddHeader && xh.a2fmt === 'mm-dd-yy',
      { row1: xh.row1, merges1: xh.merges1, shrink: xh.shrink });
    var ph = await pdf();
    var hdrStrings = ph.strings.filter(function (s) { return /^(2026|2027|WRITERS|POST|Notes|Date)/.test(s); });
    kase('H7', 'the PDF draws the same headings (2026, WRITERS, 2027, POST once, Notes twice) and no Date heading; the grid top is unchanged',
      ph.strings.indexOf('WRITERS') !== -1 && ph.strings.filter(function (s) { return s === 'POST'; }).length === 1 &&
      ph.strings.indexOf('Date') === -1 && ph.strings.filter(function (s) { return s === 'Notes'; }).length === 2 &&
      ph.strings.indexOf('2026') !== -1 && ph.strings.indexOf('2027') !== -1 && ph.gridTop === 54,
      { hdrStrings: hdrStrings.slice(0, 10), gridTop: ph.gridTop });
    // A long heading SHRINKS to fit and never widens a column.
    var CW = T.colList();
    pop = await openHeading('WRITERS');
    typeInto(pop.querySelector('input'), 'Writers Room Group A');
    await enter(pop);
    var longTh = headCell('Writers Room Group A');
    var fs = longTh ? parseFloat(longTh.style.fontSize || '11') : NaN;
    var clipH = T.clippedCells().h;
    kase('H8', 'a heading too long for its column shrinks (font-size under 11px) with 0 clipped cells, and no column changes width',
      !!longTh && fs < 11 && fs >= 6.6 && clipH.length === 0 && sameArr(T.colList(), CW),
      { fontSize: fs, clipped: clipH.slice(0, 3) });
    // Esc cancels; Reset returns a cell's columns to their defaults.
    pop = await openHeading('Notes', 0.5, 0);
    typeInto(pop.querySelector('input'), 'Cancelled');
    pop.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle('the grid after Esc');
    var afterEsc = heads();
    pop = await openHeading('Writers Room Group A');
    pop.querySelector('.hdrrow-reset').click();
    await settle('the grid after Reset');
    var afterReset = heads();
    kase('H9', 'Esc discards the edit; Reset returns the column to its default (the year), and it merges back over the Date column',
      !document.querySelector('.hdrrow-pop') && afterEsc.indexOf('Cancelled@1') === -1 && afterEsc.indexOf('Notes@1') !== -1 &&
      sameArr(afterReset, ['2026@2', 'Notes@1', '2027@1', 'POST@2', 'Notes@1']),
      { afterEsc: afterEsc, afterReset: afterReset });
    // Off keeps the labels; on again brings them back.
    byId('wf-hdr-custom').click(); await settle('the grid after the switch off');
    var hOff = heads();
    var hOffSaved = JSON.parse(await save());
    byId('wf-hdr-custom').click(); await settle('the grid after the switch on');
    kase('H10', 'switched off, the row is Date | year | Notes exactly as before, the typed headings are KEPT (in the file too), and on again brings them back',
      sameArr(hOff, H0) && !('headerRowCustom' in hOffSaved) && hOffSaved.headerRowLabels && hOffSaved.headerRowLabels['y2027:s0'] === 'POST' &&
      sameArr(heads(), afterReset),
      { hOff: hOff, labels: hOffSaved.headerRowLabels });
    var hSaved = await save(), hSnap = JSON.parse(hSaved);
    await load(fixtureText);
    var hPlain = { heads: heads(), sw: byId('wf-hdr-custom').checked };
    await load(hSaved);
    var hBack = { heads: heads(), sw: byId('wf-hdr-custom').checked };
    var hNoKey = JSON.parse(hSaved); delete hNoKey.headerRowCustom; delete hNoKey.headerRowLabels;
    await load(JSON.stringify(hNoKey));
    var hM5 = { heads: heads(), sw: byId('wf-hdr-custom').checked };
    // ...and turning the switch on there shows the DEFAULTS: the previous file's typed headings must be gone,
    // not merely hidden behind a switch that happens to be off.
    byId('wf-hdr-custom').click(); await settle('the grid after the switch on (M-5 file)');
    hM5.onHeads = heads();
    byId('wf-hdr-custom').click(); await settle('the grid after the switch off (M-5 file)');
    kase('H11', 'Save writes headerRowCustom + headerRowLabels (no new field id); Load brings the headings and the switch back; no keys opens Date | year | Notes with NO typed headings left (M-5)',
      hSnap.headerRowCustom === true && hSnap.headerRowLabels && hSnap.headerRowLabels['y2027:s1'] === 'POST' &&
      sameArr(Object.keys(hSnap.fields.byId).sort(), ids0) &&
      sameArr(hPlain.heads, H0) && !hPlain.sw && sameArr(hBack.heads, afterReset) && hBack.sw && sameArr(hM5.heads, H0) && !hM5.sw &&
      sameArr(hM5.onHeads, H1),
      { hPlain: hPlain, hBack: hBack, hM5: hM5 });
    // A heading the PDF's font cannot print is named before the export, like every other text.
    await load(hSaved);
    pop = await openHeading('POST');
    typeInto(pop.querySelector('input'), 'Ω Post');
    typeInto(pop.querySelectorAll('input')[1], 'Ω Post');
    await enter(pop);
    var capW = T.captureDownload(), dialog = '';
    byId('export-wf-pdf-btn').click();
    for (var k = 0; k < 40 && !dialog; k++) { await T.sleep(100); dialog = T.modalText(); }
    var cancelled = dialog ? T.clickModalButton('Cancel') : false;
    await T.sleep(300); capW.stop();
    kase('H12', 'a heading with a character the PDF font lacks is named in the unprintable-character warning ("in the column heading")',
      /column heading/.test(dialog) && cancelled, { dialog: dialog.slice(0, 200) });

    // ===== N: New clears all three ======================================================================
    await chooseMode('Off');
    T.set('wf-date-format', 'm/d/yyyy'); await settle();
    byId('new-file-btn').click();
    for (var q = 0; q < 30; q++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
    await settle('the grid after New');
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid after New', 200, 100);
    await settle('the calendar after New');
    kase('N1', 'New starts with the header on, 1/6/25 and Date | year | Notes, the switch off',
      barShown() && hdrBtn() === 'Header: Auto' && byId('wf-date-format').value === '' && byId('wf-hdr-custom').checked === false &&
      sameArr(heads(), H0) && dates()[0] === '1/5/26',
      { heads: heads(), btn: hdrBtn() });
  } catch (e) { out.EX = String(e && e.stack || e); kase('EX', 'the leg ran to the end', false, { error: out.EX }); }
  out.health = T.appHealth ? T.appHealth() : null;
  T.done(out);
})(); });
