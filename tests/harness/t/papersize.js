// papersize -- the paper the waterfall PDF and the workbook are laid out for (owner, 21 Oct 2026;
// PAPER-SIZE-PLAN.md, rulings R1-R4). A gate.sh leg (the generic self-judging block).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh papersize 400
//
// Letter is the default and must stay byte-identical (gates 2 and 3 hold that); this leg holds the shapes
// that prove the setting is inert until chosen, then drives it through Settings ▸ Preferences ▸ Waterfall ▸
// Paper and reads every output back: the PDF's page box and the size the grid is drawn at, and the workbook's
// paper number and orientation (through the page's own ExcelJS).
//
//   I   -- inert: the select (in .prefs-card, three options, Letter selected), no snapshot key, a Letter PDF
//          page box, Excel paper 1.
//   P   -- Legal and Tabloid: the PDF's page box, Excel's paper number, the PDF and the workbook turning the
//          same way, the grid drawn larger on bigger paper and never past 100%.
//   C   -- the calendars: one, two and three year blocks, Single Column, side boxes, Header: Off, each on all
//          three papers, the PDF and the workbook always agreeing.
//   O   -- Single Column follows the paper (R3): narrower columns on screen on Legal, the column printed larger.
//   S   -- the file: Save writes `paperSize` (Letter writes no key), Load restores it, a file with no key opens
//          on Letter whatever was open before (the M-5 trap), unknown values are dropped, fields.byId gains no
//          id, one undo step, redo, New clears.
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'papersize', cases: [] };
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

  // ---- the PDF, read back: its page box, and the grid's drawn width from the header row's grey fills ----
  // Every header cell of every block is one #D9D9D9 rect on the same baseline, so their union is the whole
  // grid at the page's scale; divided by the grid's own width (the screen's colgroup, which is the writer's
  // unscaled width in points) it is the scale the PDF was drawn at.
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
    while ((rm = rre.exec(content))) rects.push({ x: +rm[1], y: +rm[2], w: +rm[3], h: +rm[4] });
    var x0 = null, x1 = null, top = null;
    if (rects.length) {
      var y = rects[0].y;
      rects.filter(function (r) { return Math.abs(r.y - y) < 0.01; }).forEach(function (r) {
        x0 = x0 === null ? r.x : Math.min(x0, r.x); x1 = x1 === null ? r.x + r.w : Math.max(x1, r.x + r.w);
      });
      top = Math.round((H - rects[0].y - rects[0].h) * 100) / 100;
    }
    var gw = T.gridWidthPt();
    return { w: W, h: H, orient: W > H ? 'landscape' : 'portrait', drawn: x1 === null ? null : Math.round((x1 - x0) * 100) / 100,
             scale: (x1 === null || !gw) ? null : Math.round((x1 - x0) / gw * 1000) / 1000, gridTop: top, len: bytes.length };
  }
  async function pdf() { await T.sleep(700); return pdfOf(await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob')); }
  async function xlsx() {
    await T.sleep(700);
    var blob = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    var ws = wb.worksheets[0];
    return { paper: ws.pageSetup.paperSize, orient: ws.pageSetup.orientation, top: (ws.pageSetup.margins || {}).top };
  }
  async function both() { var p = await pdf(), x = await xlsx(); return { pdf: p, xlsx: x, agree: p.orient === x.orient }; }
  async function setPaper(v) { T.set('wf-paper', v); await settle('the grid after Paper ' + (v || 'letter')); }

  // ---- Save and Load through the real paths (hdrrow's shape) -------------------------------------------
  var written = [];
  function textOf(w) { return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'papersize.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? textOf(written[written.length - 1]) : ''], 'papersize.sptcal', { lastModified: 1 }); },
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
  var loads = 0, TABS = ['phases', 'show'];
  function activeTab() { var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  async function load(text) {
    var name = 'papersize-load-' + (++loads) + '.sptcal';
    var snap = JSON.parse(text), tab = TABS[loads % 2];
    if (tab === activeTab()) tab = TABS[(loads + 1) % 2];
    snap.sidebarTab = tab;
    var p = T.openViaFakePicker('/tests/fixtures/v1.5.0-saved.sptcal', name, { text: JSON.stringify(snap), writes: written });
    for (var i = 0; i < 100; i++) { await T.sleep(100); if (activeTab() === tab) break; T.clickModalButton('Load'); }
    await p;
    await T.until(function () { return activeTab() === tab; }, 'the loaded calendar (its sidebar tab)', 100, 100);
    await settle('the grid after Load');
  }
  async function fixture(name) { return (await fetch('/tests/fixtures/' + name)).text(); }
  async function closeMenu() {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await T.sleep(100);
  }
  async function headerOff() {
    await closeMenu();
    byId('tb-hdr-mode-btn').click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the header mode menu', 50, 100);
    var row = Array.from(document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice'))
      .find(function (r) { return r.querySelector('.hdr-mode-name').textContent.trim() === 'Off'; });
    if (!row) throw new Error('no Off row in the header mode menu');
    row.click();
    await settle('the grid after Header: Off');
  }
  function undoOff() { var b = byId('undo-btn'); return !b || b.disabled || b.hasAttribute('data-disabled'); }
  async function undo() { byId('undo-btn').click(); await settle('the grid after undo'); }
  async function redo() { byId('redo-btn').click(); await settle('the grid after redo'); }
  function colWidths() { return T.colList().map(function (c) { return c.w; }); }

  try {
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid to render', 200, 100);
    await settle('the first render');
    out.pdfDialogMode = T.pdfDialog().mode;

    // ===== I: inert ========================================================================================
    var sel = byId('wf-paper');
    var opts = sel ? Array.prototype.map.call(sel.options, function (o) { return o.value; }) : [];
    var s0 = JSON.parse(await save());
    var ids0 = Object.keys(s0.fields.byId).sort();
    var b0 = await both();
    kase('I1', 'inert: the Paper select is in .prefs-card with Letter / Legal / Tabloid, Letter selected; Save writes no paperSize or pageOrientation key; the PDF is a Letter page and the workbook says paper 1; the two agree',
      !!sel && !!sel.closest('.prefs-card') && sameArr(opts, ['', 'legal', 'tabloid']) && sel.value === '' &&
      !('paperSize' in s0) && !('pageOrientation' in s0) && ids0.indexOf('wf-paper') < 0 &&
      ((b0.pdf.w === 612 && b0.pdf.h === 792) || (b0.pdf.w === 792 && b0.pdf.h === 612)) && b0.xlsx.paper === 1 && b0.agree,
      { opts: opts, keys: ['paperSize', 'pageOrientation'].filter(function (k) { return k in s0; }), b0: b0 });

    // ===== P: Legal and Tabloid, through the select =======================================================
    var undoWas = undoOff();
    await setPaper('legal');
    var dirtyLegal = /Unsaved/.test((document.querySelector('.save-status') || {}).textContent || '');
    var bL = await both();
    await setPaper('tabloid');
    var bT = await both();
    kase('P1', 'Legal: the PDF page box is 612 x 1008 (or 1008 x 612 turned), the workbook says paper 5, the two turn the same way, and the change marks the calendar changed',
      ((bL.pdf.w === 612 && bL.pdf.h === 1008) || (bL.pdf.w === 1008 && bL.pdf.h === 612)) && bL.xlsx.paper === 5 && bL.agree && dirtyLegal,
      { bL: bL, dirty: dirtyLegal });
    kase('P2', 'Tabloid: the PDF page box is 792 x 1224 (or turned), the workbook says paper 3 (Tabloid, not Ledger\'s 4), the two agree',
      ((bT.pdf.w === 792 && bT.pdf.h === 1224) || (bT.pdf.w === 1224 && bT.pdf.h === 792)) && bT.xlsx.paper === 3 && bT.agree,
      { bT: bT });
    kase('P3', 'bigger paper never draws the grid smaller, and never past 100%: Letter <= Legal <= Tabloid <= 1',
      b0.pdf.scale !== null && b0.pdf.scale <= bL.pdf.scale + 0.005 && bL.pdf.scale <= bT.pdf.scale + 0.005 && bT.pdf.scale <= 1.005,
      { letter: b0.pdf.scale, legal: bL.pdf.scale, tabloid: bT.pdf.scale });

    // ===== S: the file ======================================================================================
    var sT = JSON.parse(await save());
    await setPaper('');
    var sLetter = JSON.parse(await save());
    await load(JSON.stringify(sT));
    var afterLoad = byId('wf-paper').value, bLoad = await pdf();
    var noKey = JSON.parse(JSON.stringify(sT)); delete noKey.paperSize; delete noKey.pageOrientation;
    await load(JSON.stringify(noKey));
    var afterNoKey = byId('wf-paper').value, bNoKey = await pdf();
    var junk = JSON.parse(JSON.stringify(sT)); junk.paperSize = 'a4'; junk.pageOrientation = 'sideways';
    await load(JSON.stringify(junk));
    var afterJunk = byId('wf-paper').value, sJunk = JSON.parse(await save());
    kase('S1', 'Save writes paperSize: "tabloid", and Letter writes no key; Load brings Tabloid back (the select and the PDF); a file with no key opens on Letter, never the previous file\'s paper (M-5); an unknown paper and orientation are dropped',
      sT.paperSize === 'tabloid' && !('paperSize' in sLetter) && afterLoad === 'tabloid' && (bLoad.w === 792 || bLoad.w === 1224) &&
      afterNoKey === '' && (bNoKey.w === 612 || bNoKey.w === 792) && bNoKey.h !== 1008 && bNoKey.h !== 1224 &&
      afterJunk === '' && !('paperSize' in sJunk) && !('pageOrientation' in sJunk),
      { saved: sT.paperSize, letterKey: 'paperSize' in sLetter, afterLoad: afterLoad, loadBox: [bLoad.w, bLoad.h], afterNoKey: afterNoKey,
        noKeyBox: [bNoKey.w, bNoKey.h], afterJunk: afterJunk, junkKeys: ['paperSize', 'pageOrientation'].filter(function (k) { return k in sJunk; }) });
    var idsNow = Object.keys(sT.fields.byId).sort();
    kase('S2', 'fields.byId gains no id: the Paper select is skipped by the sweep (its id set is the one from before any paper was chosen)',
      sameArr(idsNow, ids0) && idsNow.indexOf('wf-paper') < 0, { added: idsNow.filter(function (k) { return ids0.indexOf(k) < 0; }) });

    // One undo step, and redo.
    await load(JSON.stringify(sLetter));
    await T.sleep(800);
    await setPaper('legal');
    await T.sleep(800);
    await undo();
    var uVal = byId('wf-paper').value, uBox = await pdf();
    await redo();
    var rVal = byId('wf-paper').value;
    await undo();
    kase('S3', 'a Paper change is one undo step: undo puts Letter back (the select and the PDF), redo Legal again',
      uVal === '' && uBox.h !== 1008 && uBox.w !== 1008 && rVal === 'legal', { undo: uVal, undoBox: [uBox.w, uBox.h], redo: rVal, undoWasOff: undoWas });

    // ===== C: the calendars, each on every paper ===========================================================
    async function sweep(tag) {
      var r = {};
      for (var k = 0; k < 3; k++) {
        var v = ['', 'legal', 'tabloid'][k];
        await setPaper(v);
        var bb = await both();
        r[v || 'letter'] = { box: [bb.pdf.w, bb.pdf.h], pdf: bb.pdf.orient, xlsx: bb.xlsx.orient, paper: bb.xlsx.paper, scale: bb.pdf.scale, agree: bb.agree };
      }
      await setPaper('');
      r.blocks = document.querySelectorAll('#table-wrap table.sheet-table thead th.sheet-date, #table-wrap table.sheet-table thead th').length
        ? Array.from(document.querySelectorAll('#table-wrap table.sheet-table thead th')).filter(function (t) { return /^Date/.test((t.textContent || '').trim()); }).length : 0;
      r.ok = ['letter', 'legal', 'tabloid'].every(function (p) { return r[p].agree; }) &&
             r.letter.paper === 1 && r.legal.paper === 5 && r.tabloid.paper === 3;
      out['sweep_' + tag] = r;
      return r;
    }
    var c2 = await sweep('two');
    // Three year blocks: Localization moved into 2028.
    T.set('start-localization', '2028-01-03'); await settle('the grid with a third year');
    var c3 = await sweep('three');
    // Four: wide enough that the rule turns the page to landscape, so a landscape page is covered too.
    T.set('start-localization', '2029-01-01'); await settle('the grid with a fourth year');
    var c4 = await sweep('four');
    T.set('start-localization', '2027-03-01'); await settle('the grid back to two years');
    // One year block: everything inside 2026.
    T.set('start-post', '2026-09-07'); T.set('weeks-post', '8'); T.set('start-localization', '2026-11-02'); T.set('weeks-localization', '6');
    await settle('the grid in one year');
    var c1 = await sweep('one');
    T.set('start-post', '2026-11-02'); T.set('weeks-post', '16'); T.set('start-localization', '2027-03-01'); T.set('weeks-localization', '8');
    await settle('the grid back to two years');
    kase('C1', 'one, two, three and four year blocks (four turns the page to landscape): on Letter, Legal and Tabloid the PDF and the workbook always turn the same way, and Excel says 1 / 5 / 3',
      c1.ok && c2.ok && c3.ok && c4.ok && c1.blocks === 1 && c2.blocks === 2 && c3.blocks === 3 && c4.blocks === 4 &&
      c4.letter.pdf === 'landscape' && (c4.legal.box[0] === 1008 || c4.legal.box[1] === 1008),
      { one: c1, two: c2, three: c3, four: c4 });

    // Header: Off on Legal: the workbook's 0.25in top and the PDF's 18pt grid top both hold on the taller page.
    await headerOff();
    await setPaper('legal');
    var hOff = await both();
    await undo(); await undo();
    kase('C2', 'Header: Off on Legal: a Legal page box, Excel paper 5 with the 0.25in top, the PDF grid starting 18pt down, the two agreeing',
      (hOff.pdf.h === 1008 || hOff.pdf.w === 1008) && hOff.xlsx.paper === 5 && hOff.xlsx.top === 0.25 && hOff.agree &&
      hOff.pdf.gridTop !== null && Math.abs(hOff.pdf.gridTop - 18) < 1.5,
      { hOff: hOff });

    // Side boxes (a synthetic fixture): the page turns on the grid + boxes, through the same rule.
    var sbText = await fixture('sideboxes.sptcal');
    await load(sbText);
    var cSB = await sweep('sideboxes');
    kase('C3', 'with side boxes: on every paper the PDF and the workbook agree, and Excel says 1 / 5 / 3', cSB.ok, { sideboxes: cSB });

    // ===== O: Single Column follows the paper (R3) ==========================================================
    await load(JSON.stringify(sLetter));
    byId('one-col-btn').click(); await settle('the grid in Single Column');
    var wLetter = colWidths(), pOneL = await pdf();
    await setPaper('legal');
    var wLegal = colWidths(), pOneLg = await pdf();
    var sumL = wLetter.reduce(function (a, b) { return a + b; }, 0), sumLg = wLegal.reduce(function (a, b) { return a + b; }, 0);
    var cOne = await sweep('onecol');
    kase('O1', 'Single Column follows the paper: on Legal the column is narrower on screen than on Letter (it needs less widening to fill a taller page) and prints larger; the PDF and the workbook agree on every paper',
      sumLg < sumL - 1 && pOneLg.scale > pOneL.scale + 0.02 && (pOneLg.h === 1008 || pOneLg.w === 1008) && cOne.ok,
      { letterW: Math.round(sumL), legalW: Math.round(sumLg), letterScale: pOneL.scale, legalScale: pOneLg.scale, onecol: cOne });
    byId('one-col-btn').click(); await settle('the grid out of Single Column');

    // ===== N: New clears it =================================================================================
    await setPaper('tabloid');
    byId('new-file-btn').click();
    for (var q = 0; q < 30; q++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
    await settle('the grid after New');
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid after New', 200, 100);
    await settle('the calendar after New');
    var nBox = await pdf(), nSnap = JSON.parse(await save());
    kase('N1', 'New starts on Letter: the select, the PDF page box and the snapshot (no key)',
      byId('wf-paper').value === '' && nBox.h !== 1224 && nBox.w !== 1224 && !('paperSize' in nSnap) && !('pageOrientation' in nSnap),
      { select: byId('wf-paper').value, box: [nBox.w, nBox.h] });
    out.pdfDialogAnswered = T.pdfDialog().answered;
  } catch (e) { out.EX = String(e && e.stack || e); kase('EX', 'the leg ran to the end', false, { error: out.EX }); }
  out.health = T.appHealth ? T.appHealth() : null;
  T.done(out);
})(); });
