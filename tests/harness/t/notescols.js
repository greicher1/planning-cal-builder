// notescols -- hide a year's Notes column (HIDE-NOTES-PLAN.md, the owner's option B, 22 Oct 2026: "we need an
// option to be able to hide unused notes collumns"; frozen edits W1-W2, R1-R5, X1, E1-E3, P1-P3 signed off).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colreuse ./run.sh notescols 1200
//
// On the colreuse fixture: three year blocks. 2030 and 2031 hold notes (2031 also an all-phase hiatus band),
// 2032 holds none. Red on the pre-change build (no Notes panel opens), green after. Since HEADINGS-EDITABLE-PLAN.md
// (22 Oct 2026) the A group is red on the hide-notes build too: there a double-click on an untouched Notes heading
// opened the separate Notes panel, which that change retired for the heading editor.
//
// A  the heading editor: a double-click on an untouched Notes heading opens it with Hide column; "Has notes" only
//    where the column holds any; hiding types nothing. A6-A9 (group C until the Custom Column Headings switch went):
//    with a heading typed, the typed path's editor carries the same Hide button, and the typed path draws the strip.
// S  the screen with 2031 and 2032 hidden: their strips (no rowspan, every row the colgroup's width, the strip's
//    resize handle hidden, the dot only on 2031), the grid's right edge on the last strip, 0 clipped cells.
// U  one undo step each way; the Settings row's pills and Show all.
// X  the workbook: the two columns HIDDEN (width and notes kept), the right rule on the last phase column, the
//    hiatus band merged only to the last phase column, no column removed, orientation the PDF's.
// P  the waterfall PDF: one "Notes" heading, the hidden year's note not drawn, a character the PDF cannot print
//    in a hidden note raises no warning (and does once the column shows); gridlines on still exports.
// R  the print fallback (localhost route sptcal.wfPdfTest): no strip on paper, the edge rule present.
// O  Single Column Mode: its one Notes column hides, and the PDF draws no Notes heading.
// F  the file: hiddenNotesCols only while something is hidden, a Load brings it back, hostile values are dropped
//    and counted, New clears it, no field id added.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'notescols'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function byId(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function table(){ return q('#table-wrap table.sheet-table'); }
  function colKeys(t){ return qa('colgroup col', t || table()).map(function (c) { return c.dataset.ckey; }); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(250);
  }
  // A heading by its column key, the way headingColKey() finds one: walk the header row's colspans.
  function thFor(key){
    var t = table(); if(!t) return null;
    var cols = colKeys(t), ci = 0, hit = null;
    Array.from(t.tHead.rows[0].cells).forEach(function (th) { if(cols[ci] === key && !hit) hit = th; ci += th.colSpan || 1; });
    return hit;
  }
  function dbl(el){
    var r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2}));
  }
  async function hideByHeading(year){
    var th = thFor('y' + year + ':notes');
    if(!th) throw new Error('no Notes heading for ' + year);
    dbl(th);
    await T.until(function () { return !!q('.hdrrow-pop .wf-notes-hide'); }, 'the heading editor for ' + year, 50, 100);
    q('.hdrrow-pop .wf-notes-hide').click();
    await T.until(function () { return !thFor('y' + year + ':notes'); }, year + "'s column to hide", 50, 100);
    await settle();
  }
  async function inflate(u8){
    var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
    w.write(u8).catch(function(){}); w.close().catch(function(){});
    var r = ds.readable.getReader(), parts = [], n = 0;
    for(;;){ var x = await r.read(); if(x.done) break; parts.push(x.value); n += x.value.length; }
    var o = new Uint8Array(n), k = 0; parts.forEach(function (p) { o.set(p, k); k += p.length; });
    return new TextDecoder('latin1').decode(o);
  }
  async function pdfContent(blob){
    var u8 = new Uint8Array(await blob.arrayBuffer()), s = '';
    for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var L = +((s.match(/4 0 obj\s*<< \/Length (\d+)/) || [])[1] || 0);
    var a = s.indexOf('stream'), st = a + 6; if(s[st] === '\r') st++; if(s[st] === '\n') st++;
    var c = await inflate(u8.subarray(st, st + L));
    var runs = Array.from(c.matchAll(/1 0 ([\d.-]+) 1 ([\d.-]+) ([\d.-]+) Tm \((.*?)\) Tj/g)).map(function (m) { return m[4]; });
    var mb = ((s.match(/\/MediaBox\s*\[([^\]]*)\]/) || [])[1] || '').trim().split(/\s+/).map(Number);
    return {content: c, runs: runs, landscape: mb[2] > mb[3]};
  }
  async function exportAgain(id, label){ await T.sleep(700); return T.captureExport(id, label); }
  async function workbook(label){
    var b = await exportAgain('export-btn', label);
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
    return wb.worksheets[0];
  }
  async function pdf(label){ return pdfContent(await exportAgain('export-wf-pdf-btn', label)); }
  async function savedCopy(){
    await T.sleep(700);
    var cap = T.captureDownload();
    byId('share-copy-btn').click();
    try { await T.until(cap.peek, 'the shareable copy', 200, 100); } catch(e){ cap.stop(); throw e; }
    var html = await cap.stop().text();
    var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    return m ? JSON.parse(m[1]) : null;
  }
  function pills(){ return qa('.wf-hidden-notes .wf-hidden-pill').map(function (p) { return txt(p) + (q('.wf-notes-dot', p) ? '•' : ''); }); }
  function strips(){ var s = {}; qa('#table-wrap td.wf-notes-strip').forEach(function (td) { s[td.dataset.shownotes] = (s[td.dataset.shownotes] || 0) + 1; }); return s; }

  try {
    await T.until(function () { return !!table() && !!thFor('y2032:notes'); }, 'the colreuse grid', 200, 100);
    await settle();
    var keys0 = colKeys();
    out.keys0 = keys0;
    check(keys0.length === 13 && keys0.indexOf('y2031:notes') >= 0, 'S0 the fixture draws three blocks with three Notes columns (' + keys0.length + ' columns)');
    var x0 = await workbook('the workbook before'), p0 = await pdf('the PDF before');
    var nc31 = keys0.indexOf('y2031:notes') + 1, nc32 = keys0.indexOf('y2032:notes') + 1;   // Excel columns, 1-based
    out.notesCols = [nc31, nc32];
    var w31 = x0.getColumn(nc31).width, w32 = x0.getColumn(nc32).width, cc0 = x0.columnCount;
    out.p0Notes = p0.runs.filter(function (r) { return r === 'Notes'; }).length;
    check(out.p0Notes === 3 && /Principal Photography Wraps/.test(p0.content), 'S0 before: the PDF draws three Notes headings and 2031\'s note');

    // ---- A: the heading editor over a Notes heading ------------------------------------------------------------
    // Nothing is typed, so these are the ORIGINAL path's headings (no th.hdrrow-cell): the editor opens on them all
    // the same (HEADINGS-EDITABLE-PLAN.md), and the retired Notes panel (.wf-notes-pop) must never appear.
    check(!q('#table-wrap th.hdrrow-cell'), 'A0 the fixture types no heading: the original path draws the heading row');
    dbl(thFor('y2032:notes'));
    await T.until(function () { return !!q('.hdrrow-pop'); }, 'the heading editor', 50, 100);
    var pop = q('.hdrrow-pop');
    out.panel = txt(pop);
    check(/Heading · 2032/.test(out.panel) && q('.hdrrow-input', pop).value === 'Notes' && !q('.wf-notes-badge', pop) &&
          txt(q('.wf-notes-hide', pop)) === 'Hide column' && !!q('.hdrrow-ring') && !q('.wf-notes-pop'),
          'A1 a double-click on 2032\'s untouched Notes heading opens the heading editor: Notes, Hide column, the ring, no badge, no separate Notes panel (' + out.panel + ')');
    check(qa('[id]', pop).length === 0, 'A2 the editor carries no id (collectFieldValues sweeps ids)');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(100);
    check(!q('.hdrrow-pop') && !q('.hdrrow-ring'), 'A3 Esc closes it');
    dbl(thFor('y2031:notes'));
    await T.until(function () { return !!q('.hdrrow-pop'); }, 'the 2031 editor', 50, 100);
    check(txt(q('.hdrrow-pop .wf-notes-badge')) === 'Has notes', 'A4 2031\'s editor flags it: a "Has notes" badge, no count, no text');
    q('.hdrrow-pop .wf-notes-hide').click();
    await T.until(function () { return !thFor('y2031:notes'); }, '2031 to hide', 50, 100);
    await settle();
    check(!q('.hdrrow-pop') && !q('#table-wrap th.hdrrow-cell'), 'A5 Hide column hides it and closes the editor, and types nothing: the original path still draws the headings');
    await hideByHeading(2032);

    // ---- S: the screen ------------------------------------------------------------------------------------------
    var t = table(), keys = colKeys(t);
    out.keys = keys;
    check(keys.indexOf('y2031:notes') < 0 && keys.indexOf('y2032:notes') < 0 && keys.indexOf('y2031:notesoff') >= 0 && keys.indexOf('y2032:notesoff') >= 0 && keys.indexOf('y2030:notes') >= 0,
          'S1 2031 and 2032 trade their Notes columns for strips; 2030 keeps its own');
    var widths = qa('tbody tr', t).map(function (tr) { var n = 0; Array.from(tr.cells).forEach(function (c) { n += c.colSpan || 1; }); return n; });
    check(widths.every(function (n) { return n === keys.length; }) && qa('[rowspan]', t).length === 0,
          'S2 every row spans the colgroup exactly, and nothing uses rowspan (' + Array.from(new Set(widths)).join(',') + ' / ' + keys.length + ')');
    var st = strips(), rows = t.tBodies[0].rows.length;
    check(st['2031'] === rows && st['2032'] === rows, 'S3 one strip cell per row per hidden year (' + JSON.stringify(st) + ', ' + rows + ' rows)');
    var hd = qa('.grid-resize.is-col').filter(function (h) { return /:notesoff$/.test(h.dataset.ckey); });
    check(hd.length === 2 && hd.every(function (h) { return getComputedStyle(h).display === 'none'; }) && qa('.grid-resize.is-col').length === keys.length,
          'S4 the strips have no visible resize handle, and every column still has its handle element (index pairing)');
    check(!!q('td.wf-notes-strip[data-shownotes="2031"] .wf-notes-dot') && !q('td.wf-notes-strip[data-shownotes="2032"] .wf-notes-dot'),
          'S5 the dot is on 2031\'s strip (it holds notes) and not on 2032\'s');
    check(t.classList.contains('wf-notes-end') && qa('tbody tr', t).every(function (tr) { var c = tr.cells[tr.cells.length - 1]; return parseFloat(getComputedStyle(c).borderRightWidth) >= 2; }),
          'S6 the grid\'s 2 px right edge is on the last strip in every row');
    var clip = T.clippedCells();
    check(clip.h.length === 0, 'S7 no horizontally clipped cell with two columns hidden (' + clip.h.length + ')');
    check(txt(q('td.wf-notes-strip[data-shownotes="2031"]')) === '', 'S8 the strip holds no text of its own (its label is CSS), so no frozen text reader sees it');

    // ---- U: undo and the Settings row ---------------------------------------------------------------------------
    await T.openSettings('prefs');
    out.pills = pills();
    check(out.pills.join('|') === '2031•|2032' && !!q('.wf-hidden-notes [data-shownotes="all"]'),
          'U1 Settings lists both years as pills, the dot on 2031, and Show all (' + out.pills.join('|') + ')');
    byId('undo-btn').click(); await T.until(function () { return !!thFor('y2032:notes'); }, 'the undo', 50, 100);
    check(!!thFor('y2032:notes') && !thFor('y2031:notes'), 'U2 one undo shows 2032 again, 2031 stays hidden');
    byId('redo-btn').click(); await T.until(function () { return !thFor('y2032:notes'); }, 'the redo', 50, 100);
    check(!thFor('y2032:notes'), 'U3 one redo hides it again');
    await settle();
    await T.closeSettings();

    // ---- X: the workbook ----------------------------------------------------------------------------------------
    var x1 = await workbook('the workbook with two hidden');
    check(x1.getColumn(nc31).hidden === true && x1.getColumn(nc32).hidden === true && !x1.getColumn(keys0.indexOf('y2030:notes') + 1).hidden,
          'X1 the two Notes columns are HIDDEN in the workbook, 2030\'s is not');
    check(x1.getColumn(nc31).width === w31 && x1.getColumn(nc32).width === w32 && x1.columnCount === cc0,
          'X2 they keep their widths and no column is removed (' + [x1.getColumn(nc31).width, w31, x1.columnCount, cc0].join(' / ') + ')');
    var hiddenText = []; x1.getColumn(nc31).eachCell(function (c) { if(typeof c.value === 'string') hiddenText.push(c.value); });
    check(hiddenText.some(function (v) { return /Principal Photography Wraps/.test(v); }), 'X3 2031\'s notes are still in its hidden column (unhide it in Excel and they are there)');
    var dc31 = keys0.indexOf('y2031:date') + 1, lastRow = 1;
    x1.getColumn(dc31).eachCell(function (c, r) { lastRow = Math.max(lastRow, r); });
    var ruled = 0, total = 0;
    for(var r = 1; r <= lastRow; r++){ total++; var b = x1.getRow(r).getCell(nc31 - 1).border; if(b && b.right && b.right.style === 'thin') ruled++; }
    check(ruled === total && total > 40, 'X4 2031\'s right rule moved to its last phase column, header row included (' + ruled + '/' + total + ')');
    var m31 = (x1.model.merges || []).filter(function (m) { var c = m.split(':'); return c[1] && c[1].replace(/\d+/g, '') === x1.getColumn(nc31).letter; });
    // The all-phase hiatus rows: the band's text sits in the block's first phase column.
    var hiRows = []; x1.getColumn(dc31 + 1).eachCell(function (c, r) { if(c.value === 'Hiatus') hiRows.push(r); });
    var L0 = x1.getColumn(dc31 + 1).letter, L1 = x1.getColumn(nc31 - 1).letter;
    var bands = hiRows.map(function (r) { return (x1.model.merges || []).filter(function (m) { return m.indexOf(L0 + r + ':') === 0; })[0] || null; });
    out.bandMerges = bands; out.mergesIntoHidden = m31;
    check(hiRows.length === 2 && bands.every(function (m, i) { return m === L0 + hiRows[i] + ':' + L1 + hiRows[i]; }) && m31.length === 0,
          'X5 each hiatus band merges only to the last phase column, never into the hidden one (' + bands.join(' ') + ')');
    check(hiRows.every(function (r) { var b = x1.getRow(r).getCell(nc31 - 1).border; return b && b.right && b.right.style === 'thin'; }),
          'X5b the band keeps the block\'s right rule on its last visible cell');
    var p1 = await pdf('the PDF with two hidden');
    check(x1.pageSetup.orientation === (p1.landscape ? 'landscape' : 'portrait'), 'X6 the workbook\'s orientation is the PDF\'s (' + x1.pageSetup.orientation + ')');

    // ---- P: the PDF -----------------------------------------------------------------------------------------------
    out.p1Notes = p1.runs.filter(function (r) { return r === 'Notes'; }).length;
    check(out.p1Notes === 1, 'P1 the PDF draws one Notes heading, 2030\'s (' + out.p1Notes + ')');
    check(!/Principal Photography Wraps/.test(p1.content) && /Room Opens/.test(p1.content), 'P2 2031\'s note is not drawn; 2030\'s is');
    // A star in a hidden note: the PDF's font has none, and the warning names every place the writer would draw one.
    await T.openSettings('prefs');
    T.set('pref-gridlines', 'solid'); await T.sleep(200);
    var pg = await pdf('the PDF with gridlines on');
    check(pg.runs.length > 50 && pg.runs.filter(function (r) { return r === 'Notes'; }).length === 1,
          'P3 with Grid Lines in Exports on, the PDF still writes with two columns hidden');
    T.set('pref-gridlines', 'none'); await T.sleep(200);
    await T.closeSettings();

    // ---- R: the print fallback ------------------------------------------------------------------------------------
    await T.sleep(700);
    try { localStorage.setItem('sptcal.wfPdfTest', 'print'); } catch(e){}
    var printed = false, realPrint = window.print;
    window.print = function () { printed = true; };
    byId('export-wf-pdf-btn').click();
    await T.until(function () { return printed; }, 'the print fallback', 200, 100);
    var pt = q('#print-root table.sheet-table');
    out.printCols = pt ? colKeys(pt) : null;
    check(!!pt && !q('#print-root .wf-notes-strip') && out.printCols.indexOf('y2031:notesoff') < 0 && out.printCols.length === 11,
          'R1 the printed grid has no strip and no hidden Notes column (' + (out.printCols || []).length + ' columns)');
    check(!!pt && pt.classList.contains('wf-notes-end'), 'R2 the printed grid carries the edge rule\'s class');
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint;
    try { localStorage.removeItem('sptcal.wfPdfTest'); } catch(e){}
    await settle();
    check(!!q('#table-wrap td.wf-notes-strip'), 'R3 the screen keeps its strips after printing (the flag was reset)');

    // ---- F: the file, part 1 ----------------------------------------------------------------------------------------
    var s1 = await savedCopy();
    check(JSON.stringify(s1 && s1.hiddenNotesCols) === '["y2031:notes","y2032:notes"]', 'F1 a saved copy carries hiddenNotesCols, sorted (' + JSON.stringify(s1 && s1.hiddenNotesCols) + ')');

    // ---- the star: no warning while hidden, one once shown ----------------------------------------------------------
    q('td.wf-notes-strip[data-shownotes="2031"]').click();
    await T.until(function () { return !!thFor('y2031:notes'); }, '2031 to show from its strip', 50, 100);
    check(!!thFor('y2031:notes'), 'U4 a click on the strip shows the column again');
    await settle();
    await T.typeUserNote('2031-01-13', 'Lock ★ cut');
    await hideByHeading(2031);
    await T.sleep(700);
    var cap = T.captureDownload(), warned = false;
    byId('export-wf-pdf-btn').click();
    try { await T.until(function () { warned = /Some characters/.test(T.modalText()); return warned || !!cap.peek(); }, 'the PDF or a warning', 200, 100); }
    finally { cap.stop(); }
    if(warned) T.clickModalButton('Cancel');
    check(!warned && !!cap.peek(), 'P4 a character the PDF cannot print, in a hidden note, raises no warning');
    q('td.wf-notes-strip[data-shownotes="2031"]').click();
    await T.until(function () { return !!thFor('y2031:notes'); }, '2031 to show', 50, 100);
    await T.sleep(700);
    cap = T.captureDownload(); warned = false;
    byId('export-wf-pdf-btn').click();
    try { await T.until(function () { warned = /Some characters/.test(T.modalText()); return warned || !!cap.peek(); }, 'the PDF or a warning', 200, 100); }
    finally { cap.stop(); }
    check(warned, 'P5 shown again, the same note raises the warning (the check reads what prints)');
    if(warned) T.clickModalButton('Cancel');
    await T.sleep(300);
    await T.typeUserNote('2031-01-13', '');   // take the star note back off
    await hideByHeading(2031);

    // ---- A, continued: a typed heading (the typed path) ------------------------------------------------------------
    // This was group C, which switched Custom Column Headings on, until the switch went (22 Oct 2026). Now one typed
    // heading puts the calendar on the typed path (every heading a th.hdrrow-cell), and Reset takes it off again.
    function typeIn(text){
      var inp = q('.hdrrow-pop .hdrrow-input');
      inp.value = text; inp.dispatchEvent(new Event('input', {bubbles: true}));
      inp.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
    }
    dbl(thFor('y2030:s0'));
    await T.until(function () { return !!q('.hdrrow-pop'); }, 'the heading editor on 2030', 50, 100);
    typeIn('WRITERS');
    await T.until(function () { return !!q('#table-wrap th.hdrrow-cell[data-hcol="y2030:notes"]'); }, 'the typed path', 50, 100);
    await settle();
    dbl(q('#table-wrap th.hdrrow-cell[data-hcol="y2030:notes"]'));
    await T.until(function () { return !!q('.hdrrow-pop'); }, 'the heading editor', 50, 100);
    var hb = q('.hdrrow-pop .wf-notes-hide');
    check(!!hb && txt(hb) === 'Hide column' && !!q('.hdrrow-pop .wf-notes-badge'), 'A6 on the typed path the editor over a Notes column carries "Hide column" and the Has notes badge');
    hb.click();
    await T.until(function () { return !q('#table-wrap th.hdrrow-cell[data-hcol="y2030:notes"]'); }, '2030 to hide', 50, 100);
    await settle();
    check(!!q('#table-wrap th.wf-notes-strip[data-shownotes="2030"]') && !q('.hdrrow-pop') && !!q('#table-wrap th.hdrrow-cell'), 'A7 it hides the column, and the typed path draws the strip');
    var px = await pdf('the PDF with a typed heading and all three hidden');
    check(px.runs.filter(function (r) { return r === 'Notes'; }).length === 0, 'A8 with every Notes column hidden the PDF draws no Notes heading');
    await T.openSettings('prefs');
    q('.wf-hidden-notes [data-shownotes="all"]').click();
    await T.until(function () { return !!thFor('y2030:notes') && !!thFor('y2032:notes'); }, 'Show all', 50, 100);
    check(pills().length === 0 && /None/.test(txt(q('.wf-hidden-notes'))), 'A9 Show all brings every column back and the row reads None');
    await T.closeSettings();
    dbl(thFor('y2030:s0'));
    await T.until(function () { return !!q('.hdrrow-pop .hdrrow-reset'); }, 'the editor on WRITERS', 50, 100);
    q('.hdrrow-pop .hdrrow-reset').click();
    await T.until(function () { return !q('#table-wrap th.hdrrow-cell'); }, 'the original path again', 50, 100);
    await settle();
    await T.openSettings('prefs');

    // ---- O: Single Column Mode ---------------------------------------------------------------------------------------
    byId('one-col-btn').click();
    await T.until(function () { return colKeys().filter(function (k) { return /:date$/.test(k); }).length === 1; }, 'one column', 80, 100);
    await T.closeSettings();
    await settle();
    var oneKey = colKeys().filter(function (k) { return /:notes$/.test(k); })[0];
    out.oneKey = oneKey;
    await hideByHeading(+oneKey.slice(1, 5));
    var po = await pdf('the single-column PDF');
    var xo = await workbook('the single-column workbook');
    check(po.runs.filter(function (r) { return r === 'Notes'; }).length === 0 && xo.getColumn(colKeys().length).hidden === true,
          'O1 Single Column Mode hides its one Notes column: no heading in the PDF, the workbook\'s column hidden');
    check(T.clippedCells().h.length === 0, 'O2 no clipped cell with the page filled by the phase columns');
    q('td.wf-notes-strip').click();
    await T.until(function () { return colKeys().some(function (k) { return /:notes$/.test(k); }); }, 'the one Notes column back', 50, 100);
    await T.openSettings('prefs');
    byId('one-col-btn').click();
    await T.until(function () { return colKeys().filter(function (k) { return /:date$/.test(k); }).length === 3; }, 'three blocks', 80, 100);
    await T.closeSettings();
    await settle();

    // ---- F: the file, part 2 ----------------------------------------------------------------------------------------
    var s2 = await savedCopy();
    check(s2 && !('hiddenNotesCols' in s2), 'F2 with nothing hidden the key is ABSENT, never []');
    check(Object.keys((s2.fields || {}).byId || {}).sort().join(',') === Object.keys((s1.fields || {}).byId || {}).sort().join(','),
          'F3 no field id added (' + Object.keys((s2.fields || {}).byId || {}).length + ' ids)');
    var answer = setInterval(function () { T.clickModalButton(/^(Load|Discard|Don.t save)/); }, 50);
    await T.openViaFakePicker('/tests/fixtures/colreuse.sptcal', 'hidden.sptcal', {text: JSON.stringify(s1)});
    await T.until(function () { return !thFor('y2031:notes') && !thFor('y2032:notes') && !!thFor('y2030:notes'); }, 'the hidden file to load', 100, 100);
    check(!!q('#table-wrap td.wf-notes-strip[data-shownotes="2031"]'), 'F4 a Load brings 2031 and 2032 back hidden');
    var hostile = JSON.parse(JSON.stringify(s1));
    hostile.hiddenNotesCols = ['y2031:notes', 'y2031:notes', 'bogus', 7];
    await T.openViaFakePicker('/tests/fixtures/colreuse.sptcal', 'hostile.sptcal', {text: JSON.stringify(hostile)});
    await T.until(function () { return !thFor('y2031:notes') && !!thFor('y2032:notes'); }, 'the hostile file to load', 100, 100);
    clearInterval(answer);
    await settle();
    var s3 = await savedCopy();
    check(JSON.stringify(s3 && s3.hiddenNotesCols) === '["y2031:notes"]', 'F5 a hostile list keeps only the one valid key, once (' + JSON.stringify(s3 && s3.hiddenNotesCols) + ')');
    byId('new-file-btn').click();
    await T.sleep(700);
    var go = qa('button').find(function (b) { return /Start new/.test(b.textContent || ''); });
    if(go) go.click();
    await T.sleep(1200);
    var s4 = await savedCopy();
    check(s4 && !('hiddenNotesCols' in s4) && !q('#table-wrap .wf-notes-strip'), 'F6 New clears it');
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  // The hostile file (F5) is MEANT to raise the sanitizer's one warning, for its three planted values.
  var errs = ((out.health || {}).errors || []);
  var expected = errs.filter(function (e) { return /SPTCal: 3 value\(s\) in this calendar were not in a form the app writes/.test(e); });
  check(expected.length === 1, 'F7 the hostile file raised the sanitizer\'s warning once, for exactly the 3 planted values');
  out.unexpectedErrors = errs.filter(function (e) { return expected.indexOf(e) < 0; });
  check(!out.unexpectedErrors.length, 'F8 no other console error or warning (' + out.unexpectedErrors.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
