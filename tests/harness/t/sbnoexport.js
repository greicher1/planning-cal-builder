// sbnoexport -- "Hide from Exports" on a side box (owner, 21 Oct 2026: "be able to hide side boxes from the
// export but still keep them on the screen in the app"; per box, by picker, the button's words theirs).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=sideboxes ./run.sh sbnoexport 900
//
// On the sideboxes fixture: a five-line text box on the LEFT, a colour key on the RIGHT. Red on the
// pre-change build (no .sb-noexp exists there), green after.
//
// T  the tab: one per box, no id, hidden at rest, on top when the box has focus, under the box (covering
//    none of it), and no stack made to scroll by it.
// H  hiding: the box stays on screen, dashed, its tab pressed and still shown after focus leaves; one
//    undo step each way.
// X  the workbook without the hidden left box: the grid back in column A, the key still at the far right.
// P  the waterfall PDF without it: its text gone, the key's still drawn, and a character the PDF cannot
//    print, typed into the hidden box, raises no warning (pdfUnprintablePlaces reads the printed layout).
// N  both boxes hidden: the PDF content and the workbook's grid are those of a calendar with no box at all
//    (sideBoxLayoutSafe hands the writers the very "no boxes" object), while both boxes stay on screen.
// F  the file: `noExport: true` only on a hidden box, absent once shown again; a Load brings it back
//    hidden; a hostile value is dropped and counted; no field id added.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'sbnoexport'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function byId(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)}; }
  // ⛔ elementsFromPoint is the only proof a control is reachable (HANDOFF traps).
  function topAt(p){ return document.elementsFromPoint(p.x, p.y)[0] || null; }
  function hits(el){ var t = topAt(mid(el)); return !!t && (t === el || el.contains(t)); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(250);
  }
  function box(side){ return q('.side-col[data-side="' + side + '"] .sb-box'); }
  function tab(side){ return q(':scope > .sb-noexp', box(side)); }
  function pressed(side){ var t = tab(side); return !!t && t.getAttribute('aria-pressed') === 'true'; }
  function shown(el){ return !!el && getComputedStyle(el).visibility === 'visible'; }
  // Click a box's tab the way a user does: give the box focus (the tab shows on hover OR focus), ask what
  // is on top at the tab's centre, click THAT.
  async function clickTab(side){
    var t = q('.sb-title', box(side));
    t.focus(); t.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.sleep(50);
    var el = tab(side), top = topAt(mid(el));
    var ok = shown(el) && !!top && (top === el || el.contains(top));
    (top || el).click();
    await T.sleep(80);
    t = q('.sb-title', box(side)); if(t) t.blur();
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    await T.sleep(50);
    return ok;
  }
  async function savedCopy(){
    // The share handler sits behind reClickGuard(600): any click in the 600 ms before swallows it.
    await T.sleep(700);
    var cap = T.captureDownload();
    byId('share-copy-btn').click();
    try { await T.until(cap.peek, 'the shareable copy', 200, 100); } catch(e){ cap.stop(); throw e; }
    var html = await cap.stop().text();
    var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    return m ? JSON.parse(m[1]) : null;
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
    var runs = Array.from(c.matchAll(/1 0 ([\d.-]+) 1 ([\d.-]+) ([\d.-]+) Tm \((.*?)\) Tj/g))
      .map(function (m) { return [m[4], +m[2], +m[3], +m[1]]; });
    return {content: c, runs: runs, media: (s.match(/\/MediaBox\s*\[([^\]]*)\]/) || [])[1]};
  }
  function stampless(c){ return c.replace(/\(\d{1,2}\.\d{1,2}\.\d{2}\) Tj/g, '(STAMP) Tj'); }
  // Each export button carries a 600 ms re-click guard (reClickGuard).
  async function exportAgain(id, label){ await T.sleep(700); return T.captureExport(id, label); }
  async function workbook(label){
    var b = await exportAgain('export-btn', label);
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
    var ws = wb.worksheets[0], last = ws.columnCount;
    var colA = []; for(var r = 1; r <= Math.min(ws.rowCount, 12); r++) colA.push(ws.getCell('A' + r).value);
    return {ws: ws, A1: ws.getCell('A1').value, colA: colA, last: last, lastL: ws.getColumn(last).letter,
            lastTop: ws.getRow(1).getCell(last).value, printArea: ws.pageSetup.printArea,
            orientation: ws.pageSetup.orientation, merges: ws.model.merges.slice().sort().join(' ')};
  }

  try {
    await T.until(function () { return qa('.side-col .sb-box').length >= 2; }, 'the side boxes to draw', 200, 100);
    await settle();

    // ---- T: the tab ---------------------------------------------------------------------------------------
    var tabs = qa('.side-col .sb-box > .sb-noexp');
    check(tabs.length === 2 && tabs.every(function (b) { return txt(b) === 'Hide from Exports' && b.getAttribute('aria-pressed') === 'false'; }),
          'T1 each box has one "Hide from Exports" tab, not pressed (' + tabs.map(txt).join(' | ') + ')');
    check(qa('.side-col [id]').length === 0, 'T2 no id anywhere in the side columns (collectFieldValues sweeps ids)');
    check(!shown(tab('left')) && !shown(tab('right')), 'T3 at rest the tabs are hidden, so no invisible control sits in the empty row');
    var lt = q('.sb-title', box('left'));
    lt.focus(); lt.dispatchEvent(new FocusEvent('focusin', {bubbles: true})); await T.sleep(50);
    var br = box('left').getBoundingClientRect(), tr = tab('left').getBoundingClientRect();
    out.tabGeom = {boxBottom: br.bottom, tabTop: tr.top, tabBottom: tr.bottom, tabLeft: tr.left, boxLeft: br.left, tabW: tr.width, boxW: br.width};
    check(shown(tab('left')) && hits(tab('left')), 'T4 with the box focused its tab shows and is on top at its centre');
    check(tr.top >= br.bottom - 0.5 && tr.bottom <= br.bottom + 20 && Math.abs(tr.left - br.left) < 1 && tr.width <= br.width + 0.5,
          'T5 the tab hangs under the box, inside the empty row, no wider than it (' + JSON.stringify(out.tabGeom) + ')');
    lt.blur(); document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    var stacks = qa('.side-col .sb-stack');
    // ⚠️ Not "no column scrolls": since free positions (sidebox-free-pos, which took this branch in on 22 Oct
    // 2026; the check is the land-five test merge's) every side column is as long as the grid, so the two scroll together. What the tabs must not do is
    // add scroll of their OWN: the same scroll length with them taken out of the layout as with them in.
    var withTabs = stacks.map(function (s) { return s.scrollHeight; });
    qa('.side-col .sb-noexp').forEach(function (b) { b.style.display = 'none'; });
    var withoutTabs = stacks.map(function (s) { return s.scrollHeight; });
    qa('.side-col .sb-noexp').forEach(function (b) { b.style.display = ''; });
    out.stackScroll = {withTabs: withTabs, withoutTabs: withoutTabs};
    check(withTabs.every(function (h, k) { return Math.abs(h - withoutTabs[k]) <= 1; }),
          'T6 the tabs add no scroll to a side column (' + JSON.stringify(out.stackScroll) + ')');

    // ---- H: hiding the left text box ------------------------------------------------------------------------
    var xBefore = await workbook('the workbook with both boxes');
    check(xBefore.A1 === 'Notes' && xBefore.lastTop === 'Color Key', 'H0 before: the text box prints in column A, the key in the last column');
    var hitOk = await clickTab('left');
    check(hitOk && pressed('left') && box('left') && box('left').classList.contains('sb-noexport'),
          'H1 clicking the tab hides the box from exports: still on screen, its tab pressed');
    check(shown(tab('left')) && txt(tab('left')) === 'Hide from Exports' && getComputedStyle(box('left')).borderTopStyle === 'dashed',
          'H2 with focus gone the pressed tab stays shown, same words, and the box\'s frame is dashed');
    check(!pressed('right') && !box('right').classList.contains('sb-noexport'), 'H3 the other box is untouched');
    byId('undo-btn').click(); await T.until(function () { return !pressed('left'); }, 'the undo', 50, 100);
    check(!pressed('left') && !box('left').classList.contains('sb-noexport'), 'H4 one undo shows it in exports again');
    byId('redo-btn').click(); await T.until(function () { return pressed('left'); }, 'the redo', 50, 100);
    check(pressed('left'), 'H5 one redo hides it again');

    // ---- X: the workbook ------------------------------------------------------------------------------------
    var x1 = await workbook('the workbook with the left box hidden');
    out.x1 = {A1: x1.A1, colA: x1.colA, lastTop: x1.lastTop, printArea: x1.printArea, last: x1.lastL};
    check(x1.A1 === 'Date' && x1.colA.indexOf('Notes') < 0 && x1.colA.indexOf('Locations TBC') < 0,
          'X1 the hidden box is not in the workbook and the grid is back in column A (' + JSON.stringify(x1.colA.slice(0, 3)) + ')');
    check(x1.lastTop === 'Color Key' && x1.last === xBefore.last - 2 && new RegExp('^A1:' + x1.lastL + '\\d+$').test(x1.printArea || ''),
          'X2 the key still prints at the far right, two columns nearer, inside the print area (' + x1.printArea + ')');

    // ---- P: the waterfall PDF -------------------------------------------------------------------------------
    // A star in the hidden box: the PDF's font has no star, and the warning names every place the writer
    // would draw one. This one will not be drawn, so the export must go straight through.
    var l2 = q('.sb-line[data-li="1"]', box('left'));
    l2.focus(); l2.textContent = 'Table read ★ on the first Monday'; l2.dispatchEvent(new InputEvent('input', {bubbles: true}));
    l2.blur(); document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    await T.sleep(700);
    var cap = T.captureDownload(), warned = false;
    byId('export-wf-pdf-btn').click();
    try {
      await T.until(function () { warned = /Some characters/.test(T.modalText()); return warned || !!cap.peek(); }, 'the PDF or a warning', 200, 100);
    } finally { cap.stop(); }
    if(warned){ out.warning = T.modalText(); T.clickModalButton('Cancel'); }
    check(!warned && !!cap.peek(), 'P1 a character the PDF cannot print, in the hidden box, raises no warning: the export goes straight through');
    var P1 = cap.peek() ? await pdfContent(cap.peek()) : {runs: [], content: ''};
    var run = function (P, t) { return P.runs.filter(function (r) { return r[0] === t; }); };
    // ("Notes" is no test: the grid's own column header says it too.)
    out.p2 = ['Locations TBC', 'Budget lock 6/19', 'Wrap party', 'Color Key', 'Pre Prep / Prod Prep'].map(function (t) { return run(P1, t).length; });
    check(out.p2.join(',') === '0,0,0,1,1', 'P2 the PDF draws the key but none of the hidden box (' + out.p2 + ')');
    var dateX = Math.min.apply(null, run(P1, 'Date').map(function (r) { return r[1]; }));
    out.pdfStampX = (P1.runs[0] || [])[1]; out.pdfDateX = dateX;
    check(P1.runs[0] && P1.runs[0][1] > dateX - 20, 'P3 the header band starts at the grid again, not where the hidden box was (' + out.pdfStampX + ' / ' + dateX + ')');

    // ---- N: both hidden = no box at all, in print ------------------------------------------------------------
    await clickTab('right');
    check(pressed('left') && pressed('right') && qa('.side-col .sb-box').length === 2 && q('main.preview-panel').classList.contains('has-side-boxes'),
          'N1 with both boxes hidden both still show on screen');
    var pBoth = await pdfContent(await exportAgain('export-wf-pdf-btn', 'the PDF with both hidden'));
    var xBoth = await workbook('the workbook with both hidden');
    // The no-box reference: delete both boxes, export, then undo the deletes.
    var saveHidden = await savedCopy();
    while(qa('.side-col .sb-del').length){ qa('.side-col .sb-del')[0].click(); await T.sleep(60); }
    var pNone = await pdfContent(await exportAgain('export-wf-pdf-btn', 'the PDF with no box'));
    var xNone = await workbook('the workbook with no box');
    out.both = {pdfSame: stampless(pBoth.content) === stampless(pNone.content), media: [pBoth.media, pNone.media],
                xl: [xBoth.printArea, xNone.printArea, xBoth.orientation, xNone.orientation, xBoth.last, xNone.last]};
    check(out.both.pdfSame && pBoth.media === pNone.media, 'N2 the PDF with every box hidden is, page content and paper, the PDF with no box');
    check(xBoth.A1 === 'Date' && xBoth.printArea === xNone.printArea && xBoth.orientation === xNone.orientation &&
          xBoth.last === xNone.last && xBoth.merges === xNone.merges,
          'N3 the workbook with every box hidden has the no-box grid: column A, print area, orientation, columns, merges (' + JSON.stringify(out.both.xl) + ')');
    byId('undo-btn').click(); await T.sleep(150); byId('undo-btn').click();
    await T.until(function () { return qa('.side-col .sb-box').length === 2; }, 'undo the two deletes', 50, 100);
    check(pressed('left') && pressed('right'), 'N4 undoing the deletes brings both boxes back still hidden from exports');

    // ---- F: the file ----------------------------------------------------------------------------------------
    var sb = saveHidden && saveHidden.sideBoxes;
    out.savedFlags = sb ? sb.boxes.map(function (b) { return b.side + ':' + ('noExport' in b ? b.noExport : 'absent'); }) : null;
    check(sb && sb.boxes.length === 2 && sb.boxes.every(function (b) { return b.noExport === true; }),
          'F1 a saved copy carries noExport: true on each hidden box (' + (out.savedFlags || []).join(', ') + ')');
    await clickTab('right');
    var s2 = await savedCopy(), b2 = s2 && s2.sideBoxes && s2.sideBoxes.boxes;
    var kb = b2 && b2.find(function (b) { return b.kind === 'key'; }), tb = b2 && b2.find(function (b) { return b.kind === 'text'; });
    check(kb && !('noExport' in kb) && tb && tb.noExport === true, 'F2 shown again, the key carries no noExport key at all (absent, never false)');
    check(Object.keys((s2.fields || {}).byId || {}).sort().join(',') === Object.keys((saveHidden.fields || {}).byId || {}).sort().join(','),
          'F3 the tab adds no field id (' + Object.keys((s2.fields || {}).byId || {}).length + ' ids)');
    // Load the copy saved with both hidden: both come back hidden. Then a hostile value.
    var answer = setInterval(function () { T.clickModalButton(/^(Load|Discard|Don.t save)/); }, 50);
    await T.openViaFakePicker('/tests/fixtures/sideboxes.sptcal', 'hidden.sptcal', {text: JSON.stringify(saveHidden)});
    await T.until(function () { return qa('.side-col .sb-box').length === 2 && pressed('left') && pressed('right'); }, 'the hidden file to load', 100, 100);
    check(pressed('left') && pressed('right') && box('left').classList.contains('sb-noexport'), 'F4 a Load brings both boxes back hidden from exports');
    var hostile = JSON.parse(JSON.stringify(saveHidden));
    hostile.sideBoxes.boxes[0].noExport = 'yes';
    hostile.sideBoxes.boxes[1].noExport = false;
    await T.openViaFakePicker('/tests/fixtures/sideboxes.sptcal', 'hostile.sptcal', {text: JSON.stringify(hostile)});
    await T.until(function () { return qa('.side-col .sb-box').length === 2 && !pressed('left') && !pressed('right'); }, 'the hostile file to load', 100, 100);
    clearInterval(answer);
    await settle();
    var s3 = await savedCopy(), b3 = s3 && s3.sideBoxes && s3.sideBoxes.boxes;
    check(b3 && b3.every(function (b) { return !('noExport' in b); }) && !pressed('left') && !pressed('right'),
          'F5 a hostile noExport ("yes") and a false one both load as a box that prints, with no key written back');
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  // The hostile file (F5) is MEANT to raise the sanitizer's one warning, for its one planted value ("yes";
  // false is the absent key's own meaning and is not counted). Anything else in the console fails the leg.
  var errs = ((out.health || {}).errors || []);
  var expected = errs.filter(function (e) { return /SPTCal: 1 value\(s\) in this calendar were not in a form the app writes/.test(e); });
  check(expected.length === 1, 'F6 the hostile file raised the sanitizer\'s warning once, for exactly the 1 planted value');
  out.unexpectedErrors = errs.filter(function (e) { return expected.indexOf(e) < 0; });
  check(!out.unexpectedErrors.length, 'F7 no other console error or warning (' + out.unexpectedErrors.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
