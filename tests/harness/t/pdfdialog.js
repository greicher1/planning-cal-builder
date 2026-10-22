// pdfdialog -- the Export PDF dialog (owner, 21 Oct 2026; PAPER-SIZE-PLAN.md §5a, rulings D1-D3). A gate.sh leg
// (the generic self-judging block).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh pdfdialog 400
//
// Every other leg has the dialog answered at its defaults by t/lib.js (T.pdfDialog 'auto'); this one takes it over
// ('manual') and drives it the way a user does: clicks on its segments, Export, Cancel, Escape, Enter. Every
// answer is read back from the PDF it writes (the page box, the size the grid is drawn at, the grid-line
// strokes), from the workbook Export to Excel writes afterwards, from the saved file and the preference store.
//
//   D1  -- it opens: Export PDF and ⌘P in the waterfall; never in the month view, whose export goes straight on.
//   D2  -- what it opens on: the calendar's paper, the recommended orientation, the grid-lines preference.
//   D3  -- the recommendation: for each paper, the orientation marked Recommended is the one the PDF comes out
//          in, and the size it shows is within 5 points of the size the PDF draws the grid at.
//   D4  -- Cancel and Escape change nothing: no file, no dirty flag, no undo step, the preference untouched.
//   D5  -- Export with changes (Tabloid, the other orientation, Solid): the PDF, then the workbook, follow; the
//          file saves the paper and the orientation; the preference is Solid; ONE undo step takes back the paper
//          and the orientation together, and leaves the preference (it is not calendar data).
//   D6  -- a saved orientation is what the dialog opens on, and exporting with the recommended one clears it.
//   D7  -- Enter exports.
//   D8  -- the sweep: the dialog's controls carry ids, and a Save while it is open puts none of them in
//          fields.byId.
//   D9  -- the probe: opening the dialog asks about all three papers, and in Single Column (whose widths follow
//          the paper) the screen does not move while it is open or after.
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'pdfdialog', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function byId(id) { return document.getElementById(id); }
  function sameArr(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label || 'the grid to settle', 200, 100);
  }
  function press(key, mods) {
    mods = mods || {};
    var e = new KeyboardEvent('keydown', { key: key, code: 'Key' + key.toUpperCase(), bubbles: true, cancelable: true,
      metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt });
    (mods.target || document).dispatchEvent(e);
    return e.defaultPrevented;
  }

  // ---- the dialog ---------------------------------------------------------------------------------------
  function dlg() { return document.querySelector('.export-pdf-dlg .mantine-Modal-content'); }
  async function open(how) {
    await T.sleep(800);   // the button's 600 ms re-click guard
    if (how === 'key') press('p', { meta: true }); else byId('export-wf-pdf-btn').click();
    await T.until(function () { return !!document.querySelector('.export-pdf-dlg [data-pdfdlg="export"]'); }, 'the Export PDF dialog', 60, 100);
    await T.sleep(150);
    return dlg();
  }
  function radios(d) { return Array.from((d || dlg()).querySelectorAll('input[type="radio"]')); }
  function checked(d) { return radios(d).filter(function (i) { return i.checked; }).map(function (i) { return i.value; }); }
  function recommended(d) {
    var lab = Array.from((d || dlg()).querySelectorAll('label')).find(function (l) { return /Recommended/.test(l.textContent || ''); });
    var inp = lab && lab.htmlFor && byId(lab.htmlFor);
    return inp ? inp.value : null;
  }
  function sizes(d) {
    var t = (((d || dlg()).querySelector('.pdfdlg-sizes') || {}).textContent || '');
    var m = t.match(/about (\d+)% of full size, landscape at about (\d+)%/);
    return m ? { portrait: +m[1], landscape: +m[2] } : null;
  }
  async function pick(value) {
    var inp = radios().find(function (i) { return i.value === value; });
    if (!inp) throw new Error('no ' + value + ' segment in the dialog');
    var lab = document.querySelector('label[for="' + inp.id + '"]');
    (lab || inp).click();
    await T.sleep(250);
  }
  async function closed() { await T.until(function () { return !dlg(); }, 'the dialog to close', 50, 100); await T.sleep(200); }
  // Export from the dialog and capture the file (null when none comes within the wait).
  async function exportIt(trigger) {
    var cap = T.captureDownload();
    try {
      if (trigger) trigger(); else document.querySelector('.export-pdf-dlg [data-pdfdlg="export"]').click();
      try { await T.until(cap.peek, 'the waterfall PDF', 100, 100); } catch (e) {}
    } finally { cap.stop(); }
    await closed();
    return cap.peek();
  }

  // ---- the PDF and the workbook, read back (papersize's readers) ------------------------------------------
  async function pdfOf(blob) {
    var bytes = new Uint8Array(await blob.arrayBuffer());
    var latin = '';
    for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var mb = latin.match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/);
    var W = mb ? parseFloat(mb[1]) : NaN, H = mb ? parseFloat(mb[2]) : NaN;
    var content = '', re = /stream\r?\n/g, m;
    while ((m = re.exec(latin))) {
      var s0 = m.index + m[0].length, en = latin.indexOf('endstream', s0);
      if (en < 0) continue;
      // ⚠️ By the stream's own /Length, NEVER by trimming whitespace off its end: compressed bytes can end in
      // 0x0A / 0x0D / 0x20, and trimming them truncated a stream whenever the day's header date made them do so
      // (found 22 Oct 2026, the first run after midnight: Tabloid's content stream read as "truncated").
      var dictAt = latin.lastIndexOf('<<', m.index), lm = latin.slice(dictAt, m.index).match(/\/Length (\d+)/);
      if (lm) en = s0 + parseInt(lm[1], 10);
      else while (en > s0 && (bytes[en - 1] === 10 || bytes[en - 1] === 13 || bytes[en - 1] === 32)) en--;
      try {
        var ds = new DecompressionStream('deflate'); var w = ds.writable.getWriter();
        w.write(bytes.subarray(s0, en)).catch(function () {}); w.close().catch(function () {});
        var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), sTxt = '';
        for (var j = 0; j < u.length; j += 8192) sTxt += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
        if (/\bTf\b/.test(sTxt) && /\bTj\b/.test(sTxt)) { content = sTxt; break; }
      } catch (e) { /* font streams */ }
    }
    var rects = [], rm, rre = /0\.8510 0\.8510 0\.8510 rg ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re f/g;
    while ((rm = rre.exec(content))) rects.push({ x: +rm[1], y: +rm[2], w: +rm[3] });
    var x0 = null, x1 = null;
    if (rects.length) rects.filter(function (r) { return Math.abs(r.y - rects[0].y) < 0.01; }).forEach(function (r) {
      x0 = x0 === null ? r.x : Math.min(x0, r.x); x1 = x1 === null ? r.x + r.w : Math.max(x1, r.x + r.w);
    });
    var gw = T.gridWidthPt();
    return { w: W, h: H, orient: W > H ? 'landscape' : 'portrait',
             pct: (x1 === null || !gw) ? null : Math.round((x1 - x0) / gw * 100),
             solid: (content.match(/0\.8314 0\.8314 0\.8314 RG/g) || []).length };
  }
  async function xlsx() {
    await T.sleep(800);
    var blob = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    var ws = wb.worksheets[0];
    return { paper: ws.pageSetup.paperSize, orient: ws.pageSetup.orientation };
  }
  var written = [];
  function textOf(w) { return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'pdfdialog.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? textOf(written[written.length - 1]) : ''], 'pdfdialog.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return JSON.parse(textOf(written[written.length - 1]));
  }
  function status() { return ((document.querySelector('.save-status') || {}).textContent || '').trim(); }
  function undoOff() { var b = byId('undo-btn'); return !b || b.disabled || b.hasAttribute('data-disabled'); }
  function store() { try { return localStorage.getItem('sptcal.prefs'); } catch (e) { return 'THREW'; } }
  function colWidths() { return T.colList().map(function (c) { return c.w; }); }

  try {
    T.pdfDialog('manual');
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid to render', 200, 100);
    await settle('the first render');
    var s0 = await save();
    var ids0 = Object.keys(s0.fields.byId).sort();

    // ===== D1 / D2: it opens, and what it opens on ==========================================================
    var d = await open('click');
    var title = ((document.querySelector('.export-pdf-dlg .mantine-Modal-title') || {}).textContent || '').trim();
    var c0 = checked(d), rec0 = recommended(d), sz0 = sizes(d);
    var segs = radios(d).map(function (i) { return i.value; });
    var cancelled = false;
    var noFile = await exportIt(function () { cancelled = true; document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    var dk = await open('key');
    var byKey = !!dk;
    await exportIt(function () { document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    kase('D1', 'Export PDF opens the dialog ("Export PDF": Letter / Legal / Tabloid, Portrait / Landscape, None / Solid / Dashed, Cancel, Export), and so does ⌘P in the waterfall',
      title === 'Export PDF' && sameArr(segs, ['letter', 'legal', 'tabloid', 'portrait', 'landscape', 'none', 'solid', 'dashed']) && byKey && cancelled && !noFile,
      { title: title, segs: segs, byKey: byKey });
    kase('D2', 'it opens on the calendar\'s paper (Letter), the recommended orientation and the grid-lines preference (None), with both sizes shown',
      sameArr(c0, ['letter', rec0, 'none']) && (rec0 === 'portrait' || rec0 === 'landscape') && !!sz0 && sz0.portrait > 0 && sz0.landscape > 0,
      { checked: c0, recommended: rec0, sizes: sz0 });

    // ===== D4: Cancel and Escape change nothing (from a clean, saved calendar) ===============================
    await save();
    var st0 = /Unsaved/.test(status()), store0 = store(), undo0 = undoOff();
    d = await open('click');
    await pick('tabloid'); await pick(rec0 === 'portrait' ? 'landscape' : 'portrait'); await pick('solid');
    var f1 = await exportIt(function () { document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    var afterCancel = { status: /Unsaved/.test(status()), store: store(), undo: undoOff(), paper: byId('wf-paper').value };
    d = await open('click');
    var reopened = checked(d);
    await pick('legal');
    var f2 = await exportIt(function () { press('Escape', { target: document.querySelector('.export-pdf-dlg .mantine-Modal-content') || document }); });
    var afterEsc = { status: /Unsaved/.test(status()), store: store(), undo: undoOff(), paper: byId('wf-paper').value };
    var s4 = await save();
    kase('D4', 'Cancel and Escape change nothing: no file, the calendar still saved, no undo step, the preference store untouched, Letter still chosen and nothing new in the file; the next opening is back on the defaults',
      !f1 && !f2 && st0 === false && afterCancel.status === false && afterEsc.status === false && afterCancel.store === store0 && afterEsc.store === store0 &&
      afterCancel.undo === undo0 && afterEsc.undo === undo0 && afterCancel.paper === '' && afterEsc.paper === '' &&
      sameArr(reopened, ['letter', rec0, 'none']) && !('paperSize' in s4) && !('pageOrientation' in s4),
      { st0: st0, afterCancel: afterCancel, afterEsc: afterEsc, reopened: reopened });

    // ===== D3: the recommendation is the PDF's orientation, and the sizes are the PDF's ======================
    var d3 = {};
    // Tabloid first and Letter last, so D5 below starts from Letter and its one undo step has a paper to take back.
    var papers = ['tabloid', 'legal', 'letter'];
    for (var pi = 0; pi < papers.length; pi++) {
      d = await open('click');
      await pick(papers[pi]);
      var r = recommended(), sz = sizes(), ch = checked();
      var blob = await exportIt();
      var p = blob ? await pdfOf(blob) : null;
      var snap = await save();
      d3[papers[pi]] = { rec: r, checked: ch, sizes: sz, pdf: p, paperSize: snap.paperSize || '', pageOrientation: snap.pageOrientation || '' };
    }
    out.d3 = d3;
    var boxes = { letter: [612, 792], legal: [612, 1008], tabloid: [792, 1224] };
    var d3ok = papers.every(function (k) {
      var e = d3[k], b = boxes[k];
      if (!e.pdf || !e.sizes) return false;
      var box = e.rec === 'landscape' ? [b[1], b[0]] : b;
      var shown = e.sizes[e.rec];
      return e.checked[1] === e.rec && e.pdf.orient === e.rec && e.pdf.w === box[0] && e.pdf.h === box[1] &&
             e.pdf.pct !== null && Math.abs(e.pdf.pct - shown) <= 5 &&
             e.paperSize === (k === 'letter' ? '' : k) && e.pageOrientation === '';
    });
    kase('D3', 'for each paper: the selection follows the paper to its Recommended orientation, the PDF comes out on that paper in that orientation, the size shown is within 5 points of the size the PDF draws the grid at, and the file keeps the paper with no orientation key',
      d3ok, { d3: d3 });

    // ===== D5: Export with changes ===========================================================================
    d = await open('click');
    await pick('tabloid');
    var recT = recommended(), other = recT === 'portrait' ? 'landscape' : 'portrait';
    await pick(other); await pick('solid');
    var b5 = await exportIt();
    var p5 = b5 ? await pdfOf(b5) : null;
    var x5 = await xlsx();
    var s5 = await save();
    var store5 = store();
    kase('D5', 'Export with Tabloid, the NON-recommended orientation and Solid: the PDF is a Tabloid page that way round with solid grid lines; the workbook says paper 3 and that orientation; the file saves paperSize "tabloid" and pageOrientation; the preference store says solid',
      !!p5 && p5.orient === other && (p5.w === 792 || p5.w === 1224) && (p5.h === 792 || p5.h === 1224) && p5.solid > 0 &&
      x5.paper === 3 && x5.orient === other && s5.paperSize === 'tabloid' && s5.pageOrientation === other && /solid/.test(store5 || ''),
      { recommended: recT, chose: other, pdf: p5, xlsx: x5, paperSize: s5.paperSize, pageOrientation: s5.pageOrientation, store: store5 });

    // ===== D6: it opens on the saved orientation, and the recommended one clears it ==========================
    d = await open('click');
    var c6 = checked(d);
    await exportIt(function () { document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    // One undo step took the Tabloid + orientation change: check it before clearing.
    // (Read back from the Paper select and the dialog, not a Save: undo lands on the saved state, so Save is off.)
    byId('undo-btn').click(); await settle('the grid after undo');
    var u6 = { paper: byId('wf-paper').value, store: store() };
    d = await open('click');
    u6.opened = checked(d); u6.rec = recommended(d);
    await exportIt(function () { document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    byId('redo-btn').click(); await settle('the grid after redo');
    var r6 = await save();
    d = await open('click');
    await pick(recT);
    var b6 = await exportIt();
    var p6 = b6 ? await pdfOf(b6) : null;
    var s6 = await save();
    kase('D6', 'the dialog opens on the saved orientation; ONE undo takes back the paper and the orientation together and leaves the grid-lines preference; redo brings both back; exporting with the recommended orientation clears pageOrientation and keeps the paper',
      sameArr(c6, ['tabloid', other, 'solid']) &&
      u6.paper === '' && sameArr(u6.opened, ['letter', u6.rec, 'solid']) && /solid/.test(u6.store || '') &&
      r6.paperSize === 'tabloid' && r6.pageOrientation === other &&
      !!p6 && p6.orient === recT && s6.paperSize === 'tabloid' && !('pageOrientation' in s6),
      { opened: c6, undo: u6,
        redo: { paperSize: r6.paperSize, pageOrientation: r6.pageOrientation }, cleared: { pdf: p6 && p6.orient, pageOrientation: s6.pageOrientation } });

    // ===== D7: Enter exports =================================================================================
    d = await open('click');
    await pick('letter'); await pick('none');
    var seg = radios().find(function (i) { return i.value === 'letter'; });
    var b7 = await exportIt(function () { press('Enter', { target: seg }); });
    var s7 = await save();
    kase('D7', 'Enter (on a segment) exports with what is selected: a Letter PDF, and the file back on Letter with no key',
      !!b7 && !('paperSize' in s7) && !('pageOrientation' in s7),
      { file: !!b7, paperSize: s7.paperSize });

    // ===== D8: the sweep never takes the dialog's ids ========================================================
    d = await open('click');
    var dlgIds = Array.from(document.querySelectorAll('.export-pdf-dlg input[id]')).map(function (i) { return i.id; });
    var s8 = await save();
    await exportIt(function () { document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    var ids8 = Object.keys(s8.fields.byId).sort();
    kase('D8', 'the dialog\'s controls carry ids, and a Save while it is open puts none of them in fields.byId (the id set is the one from before it opened)',
      dlgIds.length >= 8 && sameArr(ids8, ids0) && dlgIds.every(function (i) { return ids8.indexOf(i) < 0; }),
      { dialogIds: dlgIds.length, added: ids8.filter(function (k) { return ids0.indexOf(k) < 0; }) });

    // ===== D9: the probe never reaches the screen ============================================================
    byId('one-col-btn').click(); await settle('the grid in Single Column');
    var w0 = colWidths();
    d = await open('click');
    var wOpen = colWidths();
    await pick('legal'); await pick('tabloid');
    var wPicked = colWidths();
    await exportIt(function () { document.querySelector('.export-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    var wAfter = colWidths();
    // ...and on the NEXT render: a probe left set would only show once the grid is drawn again.
    byId('view-month-btn').click(); await settle('the month view');
    byId('view-sheet-btn').click(); await settle('the waterfall again');
    var wRedrawn = colWidths();
    kase('D9', 'Single Column, whose widths follow the paper: opening the dialog (which asks about all three papers) and clicking papers in it leaves the on-screen columns exactly as they were, open, after Cancel and on the next render',
      w0.length > 0 && sameArr(wOpen, w0) && sameArr(wPicked, w0) && sameArr(wAfter, w0) && sameArr(wRedrawn, w0),
      { before: w0, open: wOpen, picked: wPicked, after: wAfter, redrawn: wRedrawn });
    byId('one-col-btn').click(); await settle('the grid out of Single Column');

    // ===== D1 (month): no dialog in the month view ===========================================================
    byId('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-week'); }, 'the month view', 200, 100);
    await settle('the month view');
    var sp = T.fakeSavePicker(), sawDialog = false;
    var mo = new MutationObserver(function () { if (document.querySelector('.export-pdf-dlg')) sawDialog = true; });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    await T.sleep(800);
    byId('export-btn').click();
    try { await T.until(function () { return sp.files.length > 0; }, 'the month PDF written', 200, 100); } catch (e) {}
    mo.disconnect(); sp.restore();
    kase('D10', 'the month view\'s Export PDF never opens the dialog and writes the month PDF straight away',
      !sawDialog && sp.files.length === 1 && /Month Calendar\.pdf/.test(sp.files[0].name || ''), { sawDialog: sawDialog, files: sp.files.length });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) { out.EX = String(e && e.stack || e); kase('EX', 'the leg ran to the end', false, { error: out.EX }); }
  out.health = T.appHealth ? T.appHealth() : null;
  T.done(out);
})(); });
