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
//   H   -- column headings, editable ALL THE TIME (HEADINGS-EDITABLE-PLAN.md, owner 22 Oct 2026: "remove the
//          custom column headings toggle in settings and just make it editable all the time"; H1-H3 signed
//          off). It was ruling 2's opt-in switch until then. No switch anywhere; an untouched calendar keeps
//          the original path's markup; a double-click on Date, the year or Notes opens the editor (one field,
//          ← Merge / Split / Merge →, a ring, no ids); one typed heading changes only that heading on screen,
//          in Excel and in the PDF; one undo step back to the original path; shrink-not-widen with 0 clipped
//          cells; Esc; a heading typed back to its default; Reset puts the original path's BYTES back (row 1
//          of the workbook and the PDF's content stream, against an untouched export); Save/Load and the M-5
//          trap; a file saved with the switch on keeps the year over Date; headings typed while the switch
//          was off come back (Q1); year over Date by ← Merge; the PDF's unprintable-character check naming a
//          heading.
//   S   -- the editor's Split/Merge redesign (owner's picker, 20 Oct 2026): Split keeps same-text headings
//          apart (headerRowSplits), typing never merges or splits, Merge ← / → join, each button one undo
//          step, the workbook and the PDF follow, Save/Load, a v1.6.0 file (no key) still merges, and
//          sanitizeSnapshot drops junk. Reset of the last typed heading puts the original path back.
//   N   -- New clears all three, and a switched-on file's headerRowCustom with them.
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
      shrink: row1.map(function (_, i) { var al = ws.getRow(1).getCell(i + 1).alignment; return !!(al && al.shrinkToFit); }),
      // Row 1 whole: every cell's value and style (font, fill, border, alignment, number format), for the
      // byte-for-byte comparison of a Reset against an untouched export.
      row1Full: JSON.stringify(row1.map(function (_, i) { var c = ws.getRow(1).getCell(i + 1); return [c.value, c.style]; }))
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
      // ⛔ By the stream's own /Length, never by trimming whitespace before `endstream`: a zlib stream ends in its
      // Adler-32 checksum, whose last byte is a newline, CR or space about 1 time in 85 (main's 58e6b6a, from
      // header-zoom's 6547512; hdrversion went red on the date 10.22.26 alone). The writer frames every stream as
      // `/Length N` ... `stream\n` + N bytes.
      var dictLen = /\/Length (\d+)/.exec(latin.slice(latin.lastIndexOf('<<', m.index), m.index));
      if (dictLen) en = s0 + (+dictLen[1]);
      else while (en > s0 && (bytes[en - 1] === 10 || bytes[en - 1] === 13 || bytes[en - 1] === 32)) en--;
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
    return { strings: strings, gridTop: top, H: H, len: bytes.length, content: content };
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
  // restores and refreshAfterRestore shows), alternating between the two, and the load is in when that tab is.
  // (It cycled 'settings' too until the Settings window retired that tab, 20 Oct 2026: a file saved on it now
  // opens on Show, settingswin W12, so waiting for 'settings' never ends.)
  var loads = 0, TABS = ['phases', 'show'];
  function activeTab() { var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  async function load(text) {
    var stem = 'hdrrow-load-' + (++loads), name = stem + '.sptcal';
    var snap = JSON.parse(text), tab = TABS[loads % 2];
    if (tab === activeTab()) tab = TABS[(loads + 1) % 2];
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
  // EVERY heading, on either path: an untouched calendar's Date | year | Notes are plain <th>s (no class of
  // their own), a typed calendar's are th.hdrrow-cell. `typedPath()` tells the two apart.
  function thAll() { return Array.from(document.querySelectorAll('#table-wrap table.sheet-table thead th')); }
  function typedPath() { return !!document.querySelector('#table-wrap th.hdrrow-cell'); }
  function headCell(text, nth) {
    return thAll().filter(function (t) { return (t.textContent || '').trim() === text; })[nth || 0];
  }
  // Click a heading at a fraction of its width (the editor focuses the column under the pointer).
  async function openHeading(text, frac, nth) {
    var cells = thAll().filter(function (t) { return (t.textContent || '').trim() === text; });
    var th = cells[nth || 0];
    if (!th) throw new Error('no heading reading ' + text);
    th.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    var r = th.getBoundingClientRect();
    var x = Math.round(r.left + r.width * (frac === undefined ? 0.5 : frac)), y = Math.round(r.top + r.height / 2);
    // A DOUBLE-click since 21 Oct 2026 (TEXT-STYLE-BAR-PLAN.md D5): a click highlights the heading.
    th.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, clientX: x, clientY: y }));
    await T.until(function () { return !!document.querySelector('.hdrrow-pop'); }, 'the heading editor', 30, 100);
    return document.querySelector('.hdrrow-pop');
  }
  function fieldVals(pop) { return Array.from(pop.querySelectorAll('input')).map(function (i) { return i.value; }); }
  function btn(pop, act) { return pop.querySelector('.hdrrow-btn[data-act="' + act + '"]'); }
  // Press ← Merge / Split / Merge →: the editor closes, the grid re-renders, and it opens again on the
  // heading the button made.
  async function press(pop, act) {
    btn(pop, act).click();
    await settle('the grid after ' + act);
    await T.until(function () { var p = document.querySelector('.hdrrow-pop'); return !!p && p !== pop; }, 'the editor again after ' + act, 30, 100);
    return document.querySelector('.hdrrow-pop');
  }
  function btnState(pop) {
    return ['left', 'split', 'right'].map(function (a) { return btn(pop, a).disabled ? '-' : a; }).join(',');
  }
  // Is the ring over this heading cell (within a pixel)?
  function ringOver(th) {
    var ring = document.querySelector('.hdrrow-ring');
    if (!ring || ring.hidden || !th) return false;
    var a = ring.getBoundingClientRect(), b = th.getBoundingClientRect();
    return Math.abs(a.left - b.left) <= 1 && Math.abs(a.right - b.right) <= 1 && Math.abs(a.top - b.top) <= 1;
  }
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
  function esc(p) { p.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return T.sleep(100); }
  function count(arr, v) { return arr.filter(function (x) { return x === v; }).length; }
  // Type a whole heading and commit it with Enter.
  async function typeHeading(text, nth, to) {
    var p = await openHeading(text, 0.5, nth);
    typeInto(p.querySelector('input'), to);
    await enter(p);
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
    var sel = byId('wf-date-format');
    kase('I1', 'the default header row is Date | year | Notes per block, drawn by the ORIGINAL path (no hdrrow-cell, no data-hcol), and dates read m/d/yy',
      sameArr(H0, ['Date@1', '2026@1', 'Notes@1', 'Date@1', '2027@2', 'Notes@1']) &&
      !document.querySelector('#table-wrap th.hdrrow-cell, #table-wrap th[data-hcol]') &&
      D0.length > 50 && D0.every(function (d) { return /^\d{1,2}\/\d{1,2}\/\d{2}(?!\d)/.test(d) && d.length <= 8; }) && D0[0] === '1/5/26',
      { heads: H0, firstDates: D0.slice(0, 3) });
    kase('I2', 'the Dates select starts at its default, inside .prefs-card (so collectFieldValues cannot sweep it); the Custom Column Headings switch is GONE (22 Oct 2026); the header is on',
      !byId('wf-hdr-custom') && !!sel && sel.value === '' && !!sel.closest('.prefs-card') &&
      hdrBtn() === 'Header: Auto' && barShown() && !document.body.classList.contains('wf-hdr-off'),
      { sw: !!byId('wf-hdr-custom'), sel: sel && sel.value, btn: hdrBtn() });
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

    // ===== H: column headings, editable all the time (HEADINGS-EDITABLE-PLAN.md, 22 Oct 2026) ============
    // The untouched references for H9's byte comparison, taken here, on the same loaded fixture.
    var xU = await xlsx(), pU = await pdf();
    var cursors = thAll().map(function (t) { return getComputedStyle(t).cursor; });
    kase('H1', 'no switch anywhere; the untouched heading row is the original path\'s markup (no hdrrow-cell, no data-hcol, no title), and every heading shows the edit cursor (the hover rule reaches the original path)',
      !byId('wf-hdr-custom') && !document.querySelector('#table-wrap th.hdrrow-cell, #table-wrap th[data-hcol]') &&
      thAll().every(function (t) { return !t.title; }) && sameArr(heads(), H0) &&
      cursors.length === 6 && cursors.every(function (c) { return c === 'text'; }) &&
      sameArr(xU.row1, x0.row1) && !xU.shrink.some(Boolean),
      { cursors: cursors, heads: heads() });
    // A double-click on Date, the year and Notes each opens the editor; Esc leaves the original path alone.
    var opened = [], PROBES = [['Date', 0], ['2026', 0], ['Notes', 0], ['2027', 0]];
    for (var pi = 0; pi < PROBES.length; pi++) {
      var pop = await openHeading(PROBES[pi][0], 0.5, PROBES[pi][1]);
      opened.push({ head: PROBES[pi][0], vals: fieldVals(pop).join(), btns: btnState(pop),
        covers: (pop.textContent.match(/Covers \d+ columns?/) || [''])[0],
        title: ((pop.querySelector('.note-pop-title') || {}).textContent || '').trim(),
        ring: ringOver(headCell(PROBES[pi][0], PROBES[pi][1])), hide: !!pop.querySelector('.wf-notes-hide'),
        ids: pop.querySelectorAll('[id]').length, focused: document.activeElement === pop.querySelector('input') });
      await esc(pop);
    }
    // Enter with nothing changed is no edit: still the original path.
    pop = await openHeading('Date');
    await enter(pop);
    var afterNoop = { heads: heads(), typed: typedPath(), pop: !!document.querySelector('.hdrrow-pop') };
    var noopSnap = JSON.parse(await save());
    var want2 = [
      { head: 'Date', vals: 'Date', btns: '-,-,right', covers: 'Covers 1 column', title: 'Heading · 2026', ring: true, hide: false, ids: 0, focused: true },
      { head: '2026', vals: '2026', btns: 'left,-,right', covers: 'Covers 1 column', title: 'Heading · 2026', ring: true, hide: false, ids: 0, focused: true },
      { head: 'Notes', vals: 'Notes', btns: 'left,-,-', covers: 'Covers 1 column', title: 'Heading · 2026', ring: true, hide: true, ids: 0, focused: true },
      { head: '2027', vals: '2027', btns: 'left,split,right', covers: 'Covers 2 columns', title: 'Heading · 2027', ring: true, hide: false, ids: 0, focused: true }];
    kase('H2', 'a double-click on Date, the year and Notes each opens the heading editor on that heading (its text, the buttons it can use, a ring, focus, NO id; Hide column over Notes); Esc, or Enter with nothing changed, leaves the original path and the file untouched',
      sameArr(opened, want2) && sameArr(afterNoop.heads, H0) && !afterNoop.typed && !afterNoop.pop &&
      !('headerRowLabels' in noopSnap) && !('headerRowSplits' in noopSnap) && !('headerRowCustom' in noopSnap),
      { opened: opened, afterNoop: afterNoop });
    // One typed heading changes only that heading, and puts the calendar on the typed path.
    await typeHeading('2027', 0, 'POST');
    var HP = heads();
    var HPOST = ['Date@1', '2026@1', 'Notes@1', 'Date@1', 'POST@2', 'Notes@1'];
    kase('H3', 'typing one heading changes ONLY that heading: Date | 2026 | Notes | Date | POST(2) | Notes, now drawn by the typed path; dates and widths untouched',
      sameArr(HP, HPOST) && document.querySelectorAll('#table-wrap th.hdrrow-cell').length === 6 &&
      sameArr(dates(), D0) && T.gridWidthPt() === W0,
      { heads: HP });
    await undo();
    var hU = { heads: heads(), typed: typedPath() };
    await redo();
    kase('H4', 'the edit is ONE undo step: undo puts the original path back (no editable cell), redo the typed heading',
      sameArr(hU.heads, H0) && !hU.typed && sameArr(heads(), HPOST) && typedPath(), { hU: hU, redo: heads() });
    var xh = await xlsx();
    kase('H5', 'the workbook writes the same headings: Date, the year as a number, POST merged over its two columns, Notes; shrinkToFit on the typed path\'s heading cells',
      sameArr(xh.row1, ['Date', 2026, 'Notes', 'Date', 'POST', '', 'Notes']) && sameArr(xh.merges1, ['E1:F1']) &&
      xh.shrink[0] && xh.shrink[1] && xh.shrink[4] && xh.oddHeader === x0.oddHeader && xh.a2fmt === 'mm-dd-yy',
      { row1: xh.row1, merges1: xh.merges1, shrink: xh.shrink });
    var ph = await pdf();
    kase('H6', 'the PDF draws the same headings: POST once in place of 2027; Date, Notes and 2026 as often as an untouched export; the grid top is unchanged',
      count(ph.strings, 'POST') === 1 && count(ph.strings, 'Date') === count(pU.strings, 'Date') && count(ph.strings, 'Notes') === count(pU.strings, 'Notes') &&
      count(pU.strings, 'Date') >= 2 && count(pU.strings, 'Notes') >= 2 &&
      count(ph.strings, '2026') === count(pU.strings, '2026') && count(pU.strings, '2027') - count(ph.strings, '2027') === 1 &&
      ph.gridTop === 54,
      { post: count(ph.strings, 'POST'), date: count(ph.strings, 'Date'), y2027: [count(pU.strings, '2027'), count(ph.strings, '2027')], gridTop: ph.gridTop });
    // A long heading SHRINKS to fit and never widens a column.
    var CW = T.colList();
    await typeHeading('2026', 0, 'Writers Room Group A');
    var longTh = headCell('Writers Room Group A');
    var fs = longTh ? parseFloat(longTh.style.fontSize || '11') : NaN;
    var clipH = T.clippedCells().h;
    kase('H7', 'a heading too long for its column shrinks (font-size under 11px) with 0 clipped cells, and no column changes width',
      !!longTh && fs < 11 && fs >= 6.6 && clipH.length === 0 && sameArr(T.colList(), CW),
      { fontSize: fs, clipped: clipH.slice(0, 3) });
    // Esc cancels; a heading typed back to its default is no longer typed (it follows the year again).
    pop = await openHeading('Notes', 0.5, 0);
    typeInto(pop.querySelector('input'), 'Cancelled');
    await esc(pop);
    await settle('the grid after Esc');
    var afterEsc = heads();
    await typeHeading('Writers Room Group A', 0, '2026');
    var backSnap = JSON.parse(await save());
    kase('H8', 'Esc discards the edit; a heading typed back to its default stores nothing (only POST stays typed)',
      !document.querySelector('.hdrrow-pop') && afterEsc.indexOf('Cancelled@1') === -1 && afterEsc.indexOf('Notes@1') !== -1 &&
      sameArr(heads(), HPOST) && sameArr(Object.keys(backSnap.headerRowLabels || {}).sort(), ['y2027:s0', 'y2027:s1']),
      { afterEsc: afterEsc, labels: backSnap.headerRowLabels });
    // Reset the last typed heading: the ORIGINAL path again, byte for byte.
    pop = await openHeading('POST');
    pop.querySelector('.hdrrow-reset').click();
    await settle('the grid after Reset');
    var resetHeads = heads(), resetTyped = typedPath(), resetTitles = thAll().filter(function (t) { return t.title; }).length;
    var xr = await xlsx(), pr0 = await pdf();
    var resetSnap = JSON.parse(await save());
    kase('H9', 'Reset of the last typed heading puts the ORIGINAL path back: its markup on screen, row 1 of the workbook identical to an untouched export (values, merges, every style, no shrinkToFit), the PDF\'s content stream identical, nothing typed in the file',
      sameArr(resetHeads, H0) && !resetTyped && resetTitles === 0 && !document.querySelector('#table-wrap th[data-hcol]') &&
      xr.row1Full === xU.row1Full && sameArr(xr.merges1, xU.merges1) && pr0.content.length > 1000 && pr0.content === pU.content &&
      !('headerRowLabels' in resetSnap) && !('headerRowSplits' in resetSnap) && !('headerRowCustom' in resetSnap),
      { resetHeads: resetHeads, typed: resetTyped, row1Same: xr.row1Full === xU.row1Full, pdfSame: pr0.content === pU.content,
        pdfLens: [pU.content.length, pr0.content.length] });
    // Save / Load: the typed heading travels as headerRowLabels only.
    await typeHeading('2027', 0, 'POST');
    var hSaved = await save(), hSnap = JSON.parse(hSaved);
    await load(fixtureText);
    var hPlain = { heads: heads(), typed: typedPath() };
    await load(hSaved);
    var hBack = { heads: heads(), typed: typedPath() };
    var hNoKey = JSON.parse(hSaved); delete hNoKey.headerRowCustom; delete hNoKey.headerRowLabels; delete hNoKey.headerRowSplits;
    await load(JSON.stringify(hNoKey));
    var hM5 = { heads: heads(), typed: typedPath() };
    kase('H10', 'Save writes headerRowLabels and NO headerRowCustom (nothing writes it now), no new field id; Load brings the heading back; the same file with no keys opens on the original path with none of the previous file\'s headings (M-5)',
      hSnap.headerRowLabels && hSnap.headerRowLabels['y2027:s0'] === 'POST' && hSnap.headerRowLabels['y2027:s1'] === 'POST' &&
      !('headerRowCustom' in hSnap) && sameArr(Object.keys(hSnap.fields.byId).sort(), ids0) &&
      sameArr(hPlain.heads, H0) && !hPlain.typed && sameArr(hBack.heads, HPOST) && hBack.typed && sameArr(hM5.heads, H0) && !hM5.typed,
      { hPlain: hPlain, hBack: hBack, hM5: hM5 });
    // A file saved with the old switch ON keeps the year over Date (the owner's ruling).
    var swOn = JSON.parse(fixtureText); swOn.headerRowCustom = true;
    var swOnText = JSON.stringify(swOn);
    await load(swOnText);
    var swHeads = heads();
    var xsw = await xlsx();
    pop = await openHeading('2026');
    var swPop = { vals: fieldVals(pop).join(), covers: /Covers 2 columns/.test(pop.textContent) };
    pop.querySelector('.hdrrow-reset').click();
    await settle('the grid after Reset (switched-on file)');
    var swReset = heads(), swSnap = JSON.parse(await save());
    kase('H11', 'a file saved with the switch on (headerRowCustom: true) opens with the year over Date, as it did, in the workbook too (2026 merged over A1:B1); its Date column\'s default is the year, so Reset leaves it; Save keeps the key',
      sameArr(swHeads, ['2026@2', 'Notes@1', '2027@3', 'Notes@1']) && typedPath() &&
      sameArr(xsw.row1, [2026, '', 'Notes', 2027, '', '', 'Notes']) && sameArr(xsw.merges1, ['A1:B1', 'D1:F1']) &&
      swPop.vals === '2026' && swPop.covers && sameArr(swReset, swHeads) && swSnap.headerRowCustom === true && !('headerRowLabels' in swSnap),
      { swHeads: swHeads, row1: xsw.row1, merges1: xsw.merges1, swPop: swPop, swReset: swReset });
    // Q1 (owner's picker, "Bring them back"): headings typed while the switch was OFF show again.
    var q1 = JSON.parse(fixtureText); q1.headerRowLabels = { 'y2026:notes': 'Remarks' };
    await load(JSON.stringify(q1));
    var q1Heads = heads();
    kase('H12', 'a file holding a heading typed while the switch was off (labels, no headerRowCustom) opens with that heading, and Date over the Date column (Q1)',
      sameArr(q1Heads, ['Date@1', '2026@1', 'Remarks@1', 'Date@1', '2027@2', 'Notes@1']) && typedPath(),
      { heads: q1Heads });
    // The year over Date is one ← Merge away (the old switched-on look, per block); Merge → on Date takes Date's text.
    await load(fixtureText);
    pop = await openHeading('2026');
    pop = await press(pop, 'left');
    var ym = { heads: heads(), vals: fieldVals(pop).join(), covers: /Covers 2 columns/.test(pop.textContent), ring: ringOver(headCell('2026')) };
    await esc(pop);
    pop = await openHeading('Date', 0.5, 0);
    pop = await press(pop, 'right');
    var dm = { heads: heads(), vals: fieldVals(pop).join() };
    await esc(pop);
    var xym = await xlsx();
    kase('H13', '← Merge on an untouched year heading joins it with Date and keeps the year: 2026 over Date and the phases (the old switched-on look, in that block only); Merge → on Date joins the year heading and keeps "Date"; the workbook merges both',
      sameArr(ym.heads, ['2026@2', 'Notes@1', 'Date@1', '2027@2', 'Notes@1']) && ym.vals === '2026' && ym.covers && ym.ring &&
      sameArr(dm.heads, ['2026@2', 'Notes@1', 'Date@3', 'Notes@1']) && dm.vals === 'Date' &&
      sameArr(xym.row1, [2026, '', 'Notes', 'Date', '', '', 'Notes']) && sameArr(xym.merges1, ['A1:B1', 'D1:F1']),
      { ym: ym, dm: dm, row1: xym.row1, merges1: xym.merges1 });
    // A heading the PDF's font cannot print is named before the export, like every other text.
    await load(hSaved);
    await typeHeading('POST', 0, 'Ω Post');
    var capW = T.captureDownload(), dialog = '';
    byId('export-wf-pdf-btn').click();
    for (var k = 0; k < 40 && !dialog; k++) { await T.sleep(100); dialog = T.modalText(); }
    var cancelled = dialog ? T.clickModalButton('Cancel') : false;
    await T.sleep(300); capW.stop();
    kase('H14', 'a heading with a character the PDF font lacks is named in the unprintable-character warning ("in the column heading")',
      /column heading/.test(dialog) && cancelled, { dialog: dialog.slice(0, 200) });

    // ===== S: Split and Merge (the editor redesign, owner's picker 20 Oct 2026) =========================
    var BASE = HPOST;
    await load(hSaved);
    var sBase = heads();
    pop = await openHeading('POST');
    pop = await press(pop, 'split');
    await esc(pop);
    var S1 = heads();
    await undo();
    var S1u = heads();
    await redo();
    var s1Snap = JSON.parse(await save());
    var xs = await xlsx();
    var ps = await pdf();
    kase('S1', 'Split keeps two same-text headings apart on screen, in the workbook (no merge over them) and in the PDF (POST twice); one undo step; Save writes headerRowSplits',
      sameArr(sBase, BASE) && sameArr(S1, ['Date@1', '2026@1', 'Notes@1', 'Date@1', 'POST@1', 'POST@1', 'Notes@1']) && sameArr(S1u, BASE) && sameArr(heads(), S1) &&
      sameArr(s1Snap.headerRowSplits, ['y2027:s1']) && s1Snap.headerRowLabels['y2027:s0'] === 'POST' && s1Snap.headerRowLabels['y2027:s1'] === 'POST' &&
      sameArr(Object.keys(s1Snap.fields.byId).sort(), ids0) &&
      sameArr(xs.row1, ['Date', 2026, 'Notes', 'Date', 'POST', 'POST', 'Notes']) && sameArr(xs.merges1, []) &&
      count(ps.strings, 'POST') === 2,
      { sBase: sBase, S1: S1, S1u: S1u, splits: s1Snap.headerRowSplits, row1: xs.row1, merges1: xs.merges1, posts: count(ps.strings, 'POST') });
    // Typing 2027's Date heading to read POST: it stays a heading of its own -- typing never merges.
    await typeHeading('Date', 1, 'POST');
    var S2 = heads();
    var s2Snap = JSON.parse(await save());
    kase('S2', 'typing a heading to read the same as its neighbour never merges them: POST | POST | POST stay three headings, kept apart in the file',
      sameArr(S2, ['Date@1', '2026@1', 'Notes@1', 'POST@1', 'POST@1', 'POST@1', 'Notes@1']) && sameArr(s2Snap.headerRowSplits, ['y2027:s0', 'y2027:s1']),
      { S2: S2, splits: s2Snap.headerRowSplits });
    // ← Merge from the middle one; then a word typed and Merge → in ONE step.
    pop = await openHeading('POST', 0.5, 1);
    pop = await press(pop, 'left');
    var S3a = heads(), s3Btns = btnState(pop), s3Ring = ringOver(headCell('POST'));
    typeInto(pop.querySelector('input'), 'DELIVERY');
    pop = await press(pop, 'right');
    var S3b = heads(), s3bBtns = btnState(pop);
    await esc(pop);
    await undo();
    var S3u = heads();
    await redo();
    kase('S3', '← Merge joins the heading on its left and opens on the joined one (← Merge now off: a merge never crosses a year block); a word typed before Merge → is saved with it, in ONE undo step: DELIVERY over all three',
      sameArr(S3a, ['Date@1', '2026@1', 'Notes@1', 'POST@2', 'POST@1', 'Notes@1']) && s3Btns === '-,split,right' && s3Ring &&
      sameArr(S3b, ['Date@1', '2026@1', 'Notes@1', 'DELIVERY@3', 'Notes@1']) && s3bBtns === '-,split,right' &&
      sameArr(S3u, S3a) && sameArr(heads(), S3b),
      { S3a: S3a, s3Btns: s3Btns, S3b: S3b, s3bBtns: s3bBtns, S3u: S3u });
    // Reset puts the three columns back to Date and the year, and leaves nothing typed: the original path.
    pop = await openHeading('DELIVERY');
    pop.querySelector('.hdrrow-reset').click();
    await settle('the grid after Reset');
    var S4 = heads(), s4Snap = JSON.parse(await save());
    kase('S4', 'Reset returns a heading\'s columns to Date and the year (the year joined over the phases again); with nothing typed left the calendar is back on the original path and the file has no typed heading and no split',
      sameArr(S4, H0) && !typedPath() && !('headerRowSplits' in s4Snap) && !('headerRowLabels' in s4Snap) &&
      !document.querySelector('.hdrrow-pop') && !document.querySelector('.hdrrow-ring'),
      { S4: S4, labels: s4Snap.headerRowLabels, splits: s4Snap.headerRowSplits });
    // Load: with the key, apart; with NO key (a v1.6.0 file), merged as ever -- and never the previous
    // file's splits (M-5); junk dropped by sanitizeSnapshot.
    var f = JSON.parse(hSaved); delete f.headerRowSplits;
    f.headerRowSplits = ['y2027:s1']; await load(JSON.stringify(f)); var S5b = heads();
    delete f.headerRowSplits; await load(JSON.stringify(f)); var S5a = heads();
    f.headerRowSplits = 'y2027:s1'; await load(JSON.stringify(f)); var S5d = heads();
    f.headerRowSplits = [5, 'y2027:bogus', '__proto__', 'y2027:s1']; await load(JSON.stringify(f)); var S5c = heads();
    var s5cSnap = JSON.parse(await save());
    kase('S5', 'Load: headerRowSplits keeps POST | POST apart; a file with no key (v1.6.0) merges them as it always did, never keeping the previous file\'s split (M-5); a non-array is dropped; junk entries are dropped and the valid one kept',
      sameArr(S5b, ['Date@1', '2026@1', 'Notes@1', 'Date@1', 'POST@1', 'POST@1', 'Notes@1']) && sameArr(S5a, BASE) && sameArr(S5d, BASE) &&
      sameArr(S5c, S5b) && sameArr(s5cSnap.headerRowSplits, ['y2027:s1']),
      { S5b: S5b, S5a: S5a, S5d: S5d, S5c: S5c, splits: s5cSnap.headerRowSplits });

    // ===== N: New clears all three, and a switched-on file's headerRowCustom ===========================
    var nFile = JSON.parse(swOnText); nFile.headerRowLabels = { 'y2027:notes': 'Remarks' }; nFile.headerRowSplits = ['y2027:s1'];
    await load(JSON.stringify(nFile));
    var nBefore = heads();
    await chooseMode('Off');
    T.set('wf-date-format', 'm/d/yyyy'); await settle();
    byId('new-file-btn').click();
    for (var q = 0; q < 30; q++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
    await settle('the grid after New');
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid after New', 200, 100);
    await settle('the calendar after New');
    var nHeads = heads();
    var nSnap = JSON.parse(await save());
    kase('N1', 'New starts with the header on, 1/6/25 and Date | year | Notes on the ORIGINAL path: no typed heading, no split and no headerRowCustom left from a switched-on file',
      nBefore.indexOf('Remarks@1') !== -1 && nBefore[0] === '2026@2' &&
      barShown() && hdrBtn() === 'Header: Auto' && byId('wf-date-format').value === '' &&
      sameArr(nHeads, H0) && !typedPath() && dates()[0] === '1/5/26' &&
      !('headerRowCustom' in nSnap) && !('headerRowLabels' in nSnap) && !('headerRowSplits' in nSnap),
      { nBefore: nBefore, heads: nHeads, btn: hdrBtn() });
  } catch (e) { out.EX = String(e && e.stack || e); kase('EX', 'the leg ran to the end', false, { error: out.EX }); }
  out.health = T.appHealth ? T.appHealth() : null;
  T.done(out);
})(); });
