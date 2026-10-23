// sideboxes -- boxes beside the waterfall: a colour key and a text box, on screen, in the workbook and in
// the waterfall PDF (SIDE-BOXES-PLAN.md, owner ruling 7, 20 Oct 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=sideboxes ./run.sh sideboxes 900
//
// tests/fixtures/sideboxes.sptcal is a made-up calendar (show-a's) with Prod Prep recoloured to Pre Prep's
// blue, a five-line text box on the LEFT and a colour key on the RIGHT. Red on the pre-change build (no side
// columns exist there), green after.
//
// S  the screen: both side columns, the key's rows in grid order with the shared colour joined (rulings Q1,
//    Q2), every line's height in print rows, no id anywhere, the columns capped at the grid box's height.
// X  the workbook (frozen edits E1-E3): the box in column A, the 2-unit spacer B, the grid moved to C with
//    its date chain following, the key at the far right with its fills, the merged multi-row lines, the
//    print area taking it all in.
// P  the waterfall PDF (E4-E6): the box text present and drawn beside the grid, the italic line sheared,
//    the header band starting at the box's edge (ruling Q5).
// M  the month view: no side column, no button, and #table-wrap exactly as wide as with no box at all.
// R  anywhere up and down (owner, 21 Oct 2026): a box is drawn level with the grid's row it sits on; the
//    grid and each side column scroll on their own (owner, 22 Oct 2026), lining up when scrolled alike, a
//    drag near a column's edge scrolls that column, and a column that appears for a drop opens level with
//    the grid;
//    dragged to row 10 it lands there (an outline shows where while it moves), and
//    the workbook and the PDF put it on that row; undo puts it back; it stays beside its row at any zoom; a
//    box dropped onto another takes its place and pushes it down; a new box goes under the lowest; Alt+Down
//    swaps or steps a row; zoomed out, boxes that keep their size never cover each other.
// G  the gestures, each through the hit stack: the menu, adding a box (one undo step), typing and Enter,
//    the format bar, hiding and renaming a key row, the width handle, dragging a box across, Alt+arrow.
// F  the file: the key's shape in a real shareable copy, no new field id, deleting the last box puts the
//    key AND the PDF back exactly as they were, a hostile file held to the shape, New clearing it all.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'sideboxes'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)}; }
  // ⛔ elementsFromPoint is the only proof an affordance is reachable (HANDOFF traps): dispatching at the
  // node skips hit-testing. Every gesture below first asks what is on top at the point it presses.
  function topAt(p){ return document.elementsFromPoint(p.x, p.y)[0] || null; }
  function hits(el){ var t = topAt(mid(el)); return !!t && (t === el || el.contains(t)); }
  function ptr(type, target, p, buttons){
    target.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, composed: true,
      clientX: p.x, clientY: p.y, button: 0, buttons: buttons, pointerId: 9, pointerType: 'mouse', isPrimary: true}));
  }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(250);
  }
  function snapNow(){ var b = T.latestBackup(); return b ? b.state : null; }
  // The live state, read the way Save reads it: a real shareable copy's saved-state block.
  async function savedCopy(){
    // ⚠️ The share handler is a DOCUMENT-wide click listener inside reClickGuard(600), and the guard runs
    // before its target test: ANY click in the 600 ms before this one swallows it (a pre-existing quirk,
    // logged in HANDOFF). So wait it out.
    await T.sleep(700);
    var cap = T.captureDownload();
    $('share-copy-btn').click();
    try { await T.until(cap.peek, 'the shareable copy', 200, 100); }
    catch(e){ out.shareStall = {modal: T.modalText(), btn: !!$('share-copy-btn'), menu: !!document.querySelector('#file-menu')}; cap.stop(); throw e; }
    var html = await cap.stop().text();
    var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    return {html: html, snap: m ? JSON.parse(m[1]) : null};
  }
  async function inflate(u8){
    var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
    w.write(u8).catch(function(){}); w.close().catch(function(){});
    var r = ds.readable.getReader(), parts = [], n = 0;
    for(;;){ var x = await r.read(); if(x.done) break; parts.push(x.value); n += x.value.length; }
    var o = new Uint8Array(n), k = 0; parts.forEach(function (p) { o.set(p, k); k += p.length; });
    return new TextDecoder('latin1').decode(o);
  }
  // The page's content stream, inflated, and its text runs as [string, x, y, skew].
  async function pdfContent(blob){
    var u8 = new Uint8Array(await blob.arrayBuffer()), s = '';
    for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var L = +((s.match(/4 0 obj\s*<< \/Length (\d+)/) || [])[1] || 0);
    var a = s.indexOf('stream'), st = a + 6; if(s[st] === '\r') st++; if(s[st] === '\n') st++;
    var c = await inflate(u8.subarray(st, st + L));
    var runs = Array.from(c.matchAll(/1 0 ([\d.-]+) 1 ([\d.-]+) ([\d.-]+) Tm \((.*?)\) Tj/g))
      .map(function (m) { return [m[4], +m[2], +m[3], +m[1]]; });
    return {u8: u8, content: c, runs: runs, media: (s.match(/\/MediaBox\s*\[([^\]]*)\]/) || [])[1]};
  }
  // The content with the today stamp normalised (the header's M.D.YY line), as gate.sh's pdfcmp does.
  // Each export button carries a 600 ms re-click guard (reClickGuard): a second press inside it is dropped.
  async function exportAgain(id, label){ await T.sleep(700); return T.captureExport(id, label); }
  function stampless(c){ return c.replace(/\(\d{1,2}\.\d{1,2}\.\d{2}\) Tj/g, '(STAMP) Tj'); }
  function sideBoxEls(side){ return qa('.side-col[data-side="' + side + '"] .sb-box'); }
  function keyNames(){ return qa('.side-col .sb-box[data-kind="key"] .sb-key-name').map(txt); }
  // The grid's sheet row r on screen: 0 is the heading row (the table's top), r >= 1 the body row data-row r-1.
  function rowTop(r){
    if(!r) return q('#table-wrap table.sheet-table').getBoundingClientRect().top;
    return q('#table-wrap tbody tr[data-row="' + (r - 1) + '"]').getBoundingClientRect().top;
  }
  function rowsTall(r, k){ return rowTop(r + k) - rowTop(r); }
  function topOf(el){ return el.getBoundingClientRect().top; }
  function level(el, r){ return Math.abs(topOf(el) - rowTop(r)) < 1.5; }
  // Drag a box by its grip so that its TOP is let go at screen y `top` (x stays in its own column, or `x`).
  async function dragBoxTo(box, top, x){
    var g = q('.sb-grip', box), gp = mid(g), dy = gp.y - topOf(box), to = {x: x === undefined ? gp.x : x, y: Math.round(top + dy)};
    ptr('pointerdown', g, gp, 1); ptr('pointermove', document.body, {x: gp.x, y: gp.y + 8}, 1);
    ptr('pointermove', document.body, to, 1);
    var ghost = q('.sb-drop'), gr = ghost && ghost.getBoundingClientRect();
    ptr('pointerup', document.body, to, 0);
    await T.sleep(150);
    return gr ? {top: gr.top, height: gr.height, cls: ghost.className} : null;
  }

  try {
    await T.until(function () { return qa('.side-col .sb-box').length >= 2; }, 'the side boxes to draw', 200, 100);
    await settle();
    var panel = q('main.preview-panel');

    // ---- S: the screen ----------------------------------------------------------------------------------
    check(panel.classList.contains('has-side-boxes'), 'S1 the preview panel takes the side-box grid while a box exists');
    check(sideBoxEls('left').length === 1 && sideBoxEls('right').length === 1, 'S2 one box on each side, from the file');
    out.keys = keyNames();
    check(out.keys.join('|') === "Writer's Rm|Pre Prep / Prod Prep|Production|Post|Hiatus",
          'S3 the key: grid order, the shared blue joined, the hiatus red last (' + out.keys.join(' | ') + ')');
    var hex = qa('.side-col .sb-key').map(function (k) { return k.dataset.hex; });
    check(hex.join(',') === '#FFF2CC,#DAE3F3,#E2F0D9,#FBE5D6,#FF0000', 'S4 each key row is filled with its colour (' + hex + ')');
    // Each line is as tall as the grid rows beside it that it takes in print: title row 0, then 1, 2-4 (the
    // three-line wrap), 5, 6, 7-8 (the 14 pt line). On screen a grid row is ~20.8 px, not 20, so a box
    // drawn at 20 px a row would drift off the rows it prints beside.
    out.lineHeights = qa('.side-col[data-side="left"] .sb-edit').map(function (e) { return parseFloat(e.style.minHeight); });
    var spans = [[0, 1], [1, 1], [2, 3], [5, 1], [6, 1], [7, 2]];
    out.lineWant = spans.map(function (s) { return Math.round(rowsTall(s[0], s[1]) * 100) / 100; });
    check(out.lineHeights.length === 6 && out.lineHeights.every(function (h, i) { return Math.abs(h - out.lineWant[i]) < 0.05; }),
          'S5 every line takes its PRINT rows, each as tall as the grid rows beside it (' + out.lineHeights.map(Math.round) + ' / ' + out.lineWant.map(Math.round) + ')');
    out.idsInSide = qa('.side-col [id]').length;
    check(out.idsInSide === 0, 'S6 no id anywhere in the side columns (collectFieldValues sweeps ids)');
    var sm = getComputedStyle(q('.side-col .sb-stack')).maxHeight, gm = getComputedStyle(q('#table-wrap .sheet-scroll')).maxHeight;
    check(sm === gm, 'S7 the side column is capped at the grid box\'s own max-height (' + sm + ' / ' + gm + ')');
    check(panel.scrollHeight <= panel.clientHeight + 1, 'S8 the window still never scrolls (' + panel.scrollHeight + ' / ' + panel.clientHeight + ')');
    var lr = q('.side-left').getBoundingClientRect(), wr = $('table-wrap').getBoundingClientRect(), rr = q('.side-right').getBoundingClientRect();
    check(lr.right <= wr.left + 0.5 && rr.left >= wr.right - 0.5 && Math.abs(lr.top - wr.top) < 1 && Math.abs(rr.top - wr.top) < 1,
          'S9 left of, right of, and top-aligned with #table-wrap');
    check(Math.round(q('.side-left .sb-stack').getBoundingClientRect().width) === 109, 'S10 the default width, 20 column units = 109 px');
    out.clippedWithBoxes = T.clippedCells().h.length;
    check(out.clippedWithBoxes === 0, 'S11 0 horizontally clipped grid cells with a box on each side (' + out.clippedWithBoxes + ')');
    // S12 the calendar zoom leaves the boxes alone (owner, 21 Oct 2026: "the side boxes should not change size
    // with the viewport slider"): same screen size at 50% and 200% as at 100%, and still capped at the grid
    // box's ON-SCREEN height, which the fit solves in the zoomed box's own px. Red before: they were zoomed.
    // The BOXES and their lines, not the column: since 21 Oct 2026 (free positions) a column is as long as the
    // grid's scroll, so that it can scroll with it, and the grid's length does change with the zoom.
    var sbSizes = function () {
      return qa('.side-col .sb-box, .side-col .sb-edit, .side-col .sb-key').map(function (e) {
        var r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height);
      }).join(',');
    };
    var sizes100 = sbSizes();
    out.zoomSides = {};
    for(var zi = 0, zs = [0.5, 2]; zi < zs.length; zi++){
      document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: zs[zi]}}));
      await T.sleep(400);
      var zsc = q('#table-wrap .sheet-scroll'), zst = q('.side-col .sb-stack');
      out.zoomSides[zs[zi]] = {grid: zsc.currentCSSZoom, side: q('.side-col').currentCSSZoom, same: sbSizes() === sizes100,
        cap: Math.round(parseFloat(getComputedStyle(zst).maxHeight)), gridCap: Math.round(parseFloat(getComputedStyle(zsc).maxHeight) * zsc.currentCSSZoom),
        scroll: panel.scrollHeight - panel.clientHeight};
    }
    document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: 1}}));
    await T.sleep(400); await settle();
    check([0.5, 2].every(function (z) {
      var o = out.zoomSides[z];
      return o.grid === z && o.side === 1 && o.same && Math.abs(o.cap - o.gridCap) <= 1 && o.scroll <= 1;
    }) && sbSizes() === sizes100,
          'S12 at 50% and 200% the grid zooms and the side boxes keep their size, capped at the grid box\'s screen height ('
          + JSON.stringify(out.zoomSides) + ')');

    // ---- X: the workbook ---------------------------------------------------------------------------------
    var xb = await T.captureExport('export-btn', 'the workbook');
    out.xlsx = T.b64(await xb.arrayBuffer());
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await xb.arrayBuffer());
    var ws = wb.worksheets[0], val = function (a) { var v = ws.getCell(a).value; return v && v.formula ? '=' + v.formula : v; };
    var last = ws.columnCount, lastL = ws.getColumn(last).letter;
    out.xl = {A1: val('A1'), C1: val('C1'), C3: val('C3'), widths: [ws.getColumn(1).width, ws.getColumn(2).width, ws.getColumn(last - 1).width, ws.getColumn(last).width],
              merges: ws.model.merges.filter(function (m) { return /^A\d/.test(m); }), printArea: ws.pageSetup.printArea,
              orientation: ws.pageSetup.orientation, last: lastL};
    check(out.xl.A1 === 'Notes' && val('A2') === 'Locations TBC', 'X1 the text box is in column A, title first');
    check(out.xl.widths[0] === 20 && out.xl.widths[1] === 2 && out.xl.widths[2] === 2 && out.xl.widths[3] === 20,
          'X2 each side 20 units wide with a 2-unit spacer beside the grid (' + out.xl.widths + ')');
    check(out.xl.C1 === 'Date' && out.xl.C3 === '=C2+7', 'X3 the grid starts in column C and its date chain follows (' + out.xl.C1 + ', ' + out.xl.C3 + ')');
    check(out.xl.merges.indexOf('A3:A5') >= 0 && out.xl.merges.indexOf('A8:A9') >= 0,
          'X4 a wrapped line and a 14 pt line are merged over their rows (' + out.xl.merges + ')');
    var kc = [1, 2, 3, 6].map(function (r) { var c = ws.getRow(r).getCell(last);
      return [c.value, c.fill && c.fill.fgColor && c.fill.fgColor.argb, !!(c.font && c.font.bold), c.font && c.font.color && c.font.color.argb]; });
    out.xl.key = kc;
    check(kc[0][0] === 'Color Key' && kc[0][1] === 'FFD9D9D9' && kc[1][0] === "Writer's Rm" && kc[1][1] === 'FFFFF2CC' && kc[1][2] &&
          kc[2][0] === 'Pre Prep / Prod Prep' && kc[3][0] === 'Hiatus' && kc[3][1] === 'FFFF0000' && kc[3][3] === 'FFFFFFFF',
          'X5 the key in the last column: the grey title, each row filled, bold, white on the red (' + JSON.stringify(kc) + ')');
    var b4 = ws.getCell('A9').font || {}, a7 = ws.getCell('A7').fill || {};
    check(b4.size === 14 && b4.bold === true && (ws.getCell('A8').alignment || {}).horizontal === 'center' &&
          a7.fgColor && a7.fgColor.argb === 'FFFFFF00' && (ws.getCell('A6').font || {}).italic === true,
          'X6 each line\'s format reaches its cell: size, bold, centre, the highlight as the fill, italic');
    check(new RegExp('^A1:' + lastL + '\\d+$').test(out.xl.printArea || ''), 'X7 the print area runs from the box to the key (' + out.xl.printArea + ')');

    // ---- P: the waterfall PDF ----------------------------------------------------------------------------
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF');
    out.pdf = T.b64(await pb.arrayBuffer());
    var P = await pdfContent(pb);
    var run = function (t) { return P.runs.filter(function (r) { return r[0] === t; }); };
    var dateX = Math.min.apply(null, run('Date').map(function (r) { return r[1]; }));
    var loc = run('Locations TBC')[0], ck = run('Color Key')[0];
    out.pdfPos = {date: dateX, locations: loc && loc[1], colorKey: ck && ck[1], media: P.media, stamp: (P.runs[0] || [])[1]};
    check(loc && ck && run('Pre Prep / Prod Prep').length === 1, 'P1 the box text and the key are in the PDF');
    check(loc && ck && loc[1] < dateX && ck[1] > dateX + 100, 'P2 the text box is drawn left of the grid, the key right of it (' + JSON.stringify(out.pdfPos) + ')');
    check(P.runs.some(function (r) { return r[0] === 'Hiatus dates tentative' && r[3] > 0; }), 'P3 the italic line is sheared, as the header draws italic');
    check(run('Table read on the first').length === 1 && run('and crew welcome').length === 1, 'P4 the long line wraps onto three lines');
    // The first run is the header's left line (the today stamp). The box text sits 3 pt (scaled) inside
    // the box's edge, so the band's left edge is just left of it -- and well left of the grid.
    check(P.runs[0] && loc && P.runs[0][1] <= loc[1] && loc[1] - P.runs[0][1] < 4 && P.runs[0][1] < dateX - 50,
          'P5 the header band starts at the left box, not at the grid (ruling Q5)');

    // ---- M: the month view --------------------------------------------------------------------------------
    $('view-month-btn').click(); await settle();
    var colsShown = qa('.side-col').filter(function (c) { return getComputedStyle(c).display !== 'none'; }).length;
    var btnShown = $('tb-side-boxes-btn') && getComputedStyle($('tb-side-boxes-btn')).display !== 'none';
    out.monthWrapW = $('table-wrap').getBoundingClientRect().width;
    check(colsShown === 0 && !btnShown, 'M1 the month view shows no side column and no Side boxes button');
    $('view-sheet-btn').click(); await settle();

    // ---- R: anywhere up and down -----------------------------------------------------------------------
    var bl = sideBoxEls('left')[0], br = sideBoxEls('right')[0];
    out.r1 = {left: topOf(bl), right: topOf(br), row0: rowTop(0)};
    check(level(bl, 0) && level(br, 0), 'R1 a box on row 0 sits level with the grid\'s heading row, on both sides (' + JSON.stringify(out.r1) + ')');
    out.r2 = await dragBoxTo(bl, rowTop(10));
    await T.until(function () { var b = sideBoxEls('left')[0]; return b && level(b, 10); }, 'the box to land on row 10', 50, 100);
    bl = sideBoxEls('left')[0];
    check(out.r2 && /sb-drop-ghost/.test(out.r2.cls) && Math.abs(out.r2.top - rowTop(10)) < 1.5,
          'R2 while it moves, a dashed outline shows where it will land, level with row 10 (' + JSON.stringify(out.r2) + ')');
    check(level(bl, 10) && level(sideBoxEls('right')[0], 0), 'R3 let go, the box sits level with the grid\'s row 10; the other side is untouched');
    var xr = new ExcelJS.Workbook(); await xr.xlsx.load(await (await exportAgain('export-btn', 'the workbook, box on row 10')).arrayBuffer());
    var wr = xr.worksheets[0], vr = function (a) { var v = wr.getCell(a).value; return v && v.formula ? '=' + v.formula : v; };
    out.r4 = {A1: vr('A1'), A11: vr('A11'), A12: vr('A12'), C1: vr('C1'), merges: wr.model.merges.filter(function (m) { return /^A\d/.test(m); })};
    check(out.r4.A1 === null && out.r4.A11 === 'Notes' && out.r4.A12 === 'Locations TBC' && out.r4.C1 === 'Date' &&
          out.r4.merges.indexOf('A13:A15') >= 0 && out.r4.merges.indexOf('A18:A19') >= 0,
          'R4 the workbook puts the box on row 11 (sheet row 10), its merges moved with it, the grid unmoved (' + JSON.stringify(out.r4) + ')');
    var prb = await exportAgain('export-wf-pdf-btn', 'the PDF, box on row 10');
    out.pdfs = {row10: T.b64(await prb.arrayBuffer())};
    var pr = await pdfContent(prb);
    var dCell = q('#table-wrap tbody tr[data-row="10"] td.sheet-date'), dTxt = txt(dCell);
    var pdx = Math.min.apply(null, pr.runs.filter(function (r) { return r[0] === 'Date'; }).map(function (r) { return r[1]; }));
    var dRun = pr.runs.filter(function (r) { return r[0] === dTxt; }).sort(function (a, b) { return Math.abs(a[1] - pdx) - Math.abs(b[1] - pdx); })[0];
    var lRun = pr.runs.filter(function (r) { return r[0] === 'Locations TBC'; })[0];
    out.r5 = {date: dTxt, dateY: dRun && dRun[2], lineY: lRun && lRun[2], lineX: lRun && lRun[1], gridX: pdx};
    check(dRun && lRun && Math.abs(dRun[2] - lRun[2]) < 1.5 && lRun[1] < pdx,
          'R5 the PDF draws the box\'s first line beside the grid\'s row 11 (' + JSON.stringify(out.r5) + ')');
    var gs = q('#table-wrap > .sheet-scroll'), ls = q('.side-left .sb-stack'), rs = q('.side-right .sb-stack');
    var lTop = topOf(sideBoxEls('left')[0]);
    out.r6 = {scrollable: gs.scrollHeight > gs.clientHeight + 150};
    // ⚠️ Headless Chrome here fires no 'scroll' event for a scrollTop set by script (a probe waited 650 ms
    // and heard none), so each scroll below is announced by hand: what is tested is the app's answer to it.
    // Until 22 Oct 2026 that answer was to scroll the others to match; now it is to leave them alone.
    gs.scrollTop = 120; gs.dispatchEvent(new Event('scroll')); await T.sleep(150);
    out.r6.grid = gs.scrollTop; out.r6.left = ls.scrollTop; out.r6.right = rs.scrollTop;
    out.r6.boxMoved = Math.round((topOf(sideBoxEls('left')[0]) - lTop) * 100) / 100;
    check(out.r6.scrollable && out.r6.grid > 100 && out.r6.left === 0 && out.r6.right === 0 && Math.abs(out.r6.boxMoved) < 0.5,
          'R6 scrolling the grid scrolls only the grid: both side columns, and the box in one, stay put (' + JSON.stringify(out.r6) + ')');
    ls.scrollTop = 60; ls.dispatchEvent(new Event('scroll')); await T.sleep(150);
    out.r7 = {grid: gs.scrollTop, left: ls.scrollTop, right: rs.scrollTop};
    check(out.r7.left > 50 && Math.abs(out.r7.grid - out.r6.grid) < 0.5 && out.r7.right === 0,
          'R7 scrolling a side column scrolls only that column: the grid and the other side stay put (' + JSON.stringify(out.r7) + ')');
    ls.scrollTop = gs.scrollTop; ls.dispatchEvent(new Event('scroll')); await T.sleep(150);
    check(level(sideBoxEls('left')[0], 10), 'R15 scrolled alike, the grid and the column line up again: the box is beside row 10');
    // Carried near the bottom of its column, a box scrolls THAT column (no longer the grid), so it can reach
    // a row out of view. Escape then cancels the drag, so nothing moves.
    ls.scrollTop = 0; ls.dispatchEvent(new Event('scroll')); await T.sleep(150);
    var lg = q('.sb-grip', sideBoxEls('left')[0]), lgp = mid(lg), lsr = ls.getBoundingClientRect(), gBefore = gs.scrollTop;
    ptr('pointerdown', lg, lgp, 1); ptr('pointermove', document.body, {x: lgp.x, y: lgp.y + 8}, 1);
    ptr('pointermove', document.body, {x: lgp.x, y: Math.round(lsr.bottom - 6)}, 1);
    await T.sleep(400);
    out.r16 = {left: ls.scrollTop, grid: gs.scrollTop, gridWas: gBefore};
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(150);
    gs.scrollTop = 0; gs.dispatchEvent(new Event('scroll'));
    ls.scrollTop = 0; ls.dispatchEvent(new Event('scroll')); await T.sleep(150);
    check(out.r16.left > 5 && Math.abs(out.r16.grid - gBefore) < 0.5 && !q('.sb-drop') && level(sideBoxEls('left')[0], 10),
          'R16 a box carried to the bottom of its column scrolls that column, not the grid; Escape leaves it on row 10 (' + JSON.stringify(out.r16) + ')');
    $('undo-btn').click(); await T.until(function () { return level(sideBoxEls('left')[0], 0); }, 'undo the move', 50, 100);
    $('redo-btn').click(); await T.until(function () { return level(sideBoxEls('left')[0], 10); }, 'redo the move', 50, 100);
    check(level(sideBoxEls('left')[0], 10), 'R8 one undo puts the box back at the top, one redo on row 10');
    // The calendar zoom magnifies the grid and the side columns together; a box stays beside its row.
    var zl = {};
    for(var zi = 0, zz = [0.5, 2, 1]; zi < zz.length; zi++){
      document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: zz[zi]}})); await settle();
      zl[zz[zi]] = Math.round((topOf(sideBoxEls('left')[0]) - rowTop(10)) * 100) / 100;
    }
    out.rzoom = zl;
    check(Math.abs(zl[0.5]) < 1.5 && Math.abs(zl[2]) < 1.5 && Math.abs(zl[1]) < 1.5,
          'R9 at 50% and at 200% zoom the box stays level with its row (' + JSON.stringify(zl) + ')');

    // ---- G: the gestures -----------------------------------------------------------------------------------
    var sb = $('tb-side-boxes-btn');
    check(sb && hits(sb), 'G1 the Side boxes button is on top at its centre');
    sb.click();
    await T.until(function () { return qa('.sb-menu .sb-menu-item').length === 4; }, 'the Side boxes menu', 50, 100);
    var item = qa('.sb-menu .sb-menu-item').find(function (b) { return b.dataset.kind === 'text' && b.dataset.side === 'right'; });
    check(item && hits(item) && qa('.sb-menu [id]').length === 0, 'G2 the menu offers four items, hit-testable, none with an id');
    var undoBefore = !$('undo-btn').disabled;
    item.click();
    await T.until(function () { return sideBoxEls('right').length === 2; }, 'the new text box', 50, 100);
    var newTitle = q('.sb-title', sideBoxEls('right')[1]);
    check(document.activeElement === newTitle && txt(newTitle) === 'Notes', 'G3 the new box sits at the bottom of its side, its title focused');
    $('undo-btn').click(); await T.until(function () { return sideBoxEls('right').length === 1; }, 'the undo', 50, 100);
    check(sideBoxEls('right').length === 1, 'G4 one undo takes the new box away');
    $('redo-btn').click(); await T.until(function () { return sideBoxEls('right').length === 2; }, 'the redo', 50, 100);
    check(sideBoxEls('right').length === 2, 'G5 one redo puts it back');
    // Typing: the title, Enter to the first line, a line, Enter splits a new one.
    newTitle = q('.sb-title', sideBoxEls('right')[1]);
    newTitle.focus(); newTitle.textContent = 'Dates'; newTitle.dispatchEvent(new InputEvent('input', {bubbles: true}));
    newTitle.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
    var l0 = q('.sb-line[data-li="0"]', sideBoxEls('right')[1]);
    check(document.activeElement === l0, 'G6 Enter in the title moves to the first line');
    l0.textContent = 'Prep starts 5/18 and runs six weeks'; l0.dispatchEvent(new InputEvent('input', {bubbles: true}));
    var s = getSelection(), r = document.createRange(); r.setStart(l0.firstChild, 'Prep starts 5/18'.length); r.collapse(true); s.removeAllRanges(); s.addRange(r);
    l0.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
    await T.sleep(100);
    var rl = qa('.sb-line', sideBoxEls('right')[1]).map(txt);
    check(rl.join('|') === 'Prep starts 5/18|and runs six weeks' && document.activeElement === q('.sb-line[data-li="1"]', sideBoxEls('right')[1]),
          'G7 Enter splits the line at the caret and moves to the new one (' + rl.join(' | ') + ')');
    // A character the PDF's font cannot set is named BEFORE the export, box text included: the warning walks
    // what the writer draws (pdfUnprintablePlaces), and the boxes are drawn now. Cancel, then take it out.
    var l1 = q('.sb-line[data-li="1"]', sideBoxEls('right')[1]);
    l1.textContent = 'and runs six weeks \u2605'; l1.dispatchEvent(new InputEvent('input', {bubbles: true}));
    await T.sleep(700);
    $('export-wf-pdf-btn').click();
    await T.until(function () { return /Some characters/.test(T.modalText()); }, 'the unprintable-character warning', 50, 100);
    out.unprintable = T.modalText();
    check(/\u2605 in the side box \u201cDates\u201d/.test(out.unprintable), 'G21 a character the PDF cannot print is named in its side box before the export');
    T.clickModalButton('Cancel');
    await T.until(function () { return !/Some characters/.test(T.modalText()); }, 'the warning to close', 50, 100);
    l1 = q('.sb-line[data-li="1"]', sideBoxEls('right')[1]);
    l1.textContent = 'and runs six weeks'; l1.dispatchEvent(new InputEvent('input', {bubbles: true}));
    // The format bar, on the left box's bold first line: B turns it off, 16 makes it two rows tall.
    // ⭐ Since 21 Oct 2026 that bar is the TEXT STYLE BAR under the toolbar (TEXT-STYLE-BAR-PLAN.md): the box's
    // floating .sb-fmt retired, and focusing a line arms the permanent bar instead, through applySideFmt.
    var lb = q('.sb-line[data-li="0"]', sideBoxEls('left')[0]);
    lb.focus(); lb.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.until(function () { return !!q('.style-bar.has-target'); }, 'the text style bar to arm', 30, 100);
    var bar = q('.style-bar'), bBtn = bar && q('.hf-b', bar);
    check(bar && !q('.sb-fmt') && qa('[id]', bar).length === 0 && bBtn.classList.contains('is-on') && hits(bBtn),
          'G8 focusing a line arms the text style bar (no floating bar): no ids, Bold lit for a bold line, on top');
    bBtn.click();
    check(getComputedStyle(lb).fontWeight === '400' && !bBtn.classList.contains('is-on'), 'G9 Bold turns the line\'s bold off, in place');
    var h1 = parseFloat(lb.style.minHeight);
    var sz = q('.hf-size', bar); sz.value = '16'; sz.dispatchEvent(new Event('change', {bubbles: true}));
    check(Math.abs(parseFloat(lb.style.minHeight) / h1 - 2) < 0.05 && getComputedStyle(lb).fontSize === '16px', 'G10 size 16 takes two print rows (' + h1 + ' -> ' + lb.style.minHeight + ')');
    q('.hf-clear', bar).click();
    check(parseFloat(lb.style.minHeight) === h1 && getComputedStyle(lb).fontWeight === '400', 'G11 clear returns the line to the plain default');
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    // Hide a key row (Post), then bring it back.
    var post = q('.sb-key[data-hex="#FBE5D6"] .sb-key-hide');
    post.click();
    await T.until(function () { return keyNames().indexOf('Post') < 0; }, 'the row to hide', 30, 100);
    var un = q('.sb-unhide');
    check(un && /Show 1 hidden row/.test(txt(un)), 'G12 hiding a key row leaves a way back (' + txt(un) + ')');
    un.click();
    await T.until(function () { return keyNames().indexOf('Post') >= 0; }, 'the row to come back', 30, 100);
    check(!q('.sb-unhide'), 'G13 Show hidden rows brings it back');
    // Rename Production's row; empty it again and it goes back to the phase's name.
    var pn = q('.sb-key[data-hex="#E2F0D9"] .sb-key-name');
    pn.focus(); pn.textContent = 'Shoot'; pn.dispatchEvent(new InputEvent('input', {bubbles: true}));
    pn.dispatchEvent(new FocusEvent('focusout', {bubbles: true})); pn.blur();
    await T.sleep(150);
    out.renamed = keyNames();
    check(out.renamed.indexOf('Shoot') >= 0, 'G14 a key row\'s name is editable (' + out.renamed.join(' | ') + ')');
    // The width handle, on the right side: drag it 40 px toward the grid (wider), then double-click it back.
    var wh = q('.side-right .sb-width'), w0 = q('.side-right .sb-stack').getBoundingClientRect().width;
    var p0 = mid(wh);
    check(hits(wh), 'G15 the right side\'s width handle is on top at its centre');
    ptr('pointerdown', wh, p0, 1); ptr('pointermove', document.body, {x: p0.x - 40, y: p0.y}, 1); ptr('pointerup', document.body, {x: p0.x - 40, y: p0.y}, 0);
    await T.sleep(100);
    var w1 = q('.side-right .sb-stack').getBoundingClientRect().width;
    check(w1 > w0 + 30, 'G16 dragging the handle widens the side (' + w0 + ' -> ' + w1 + ')');
    q('.side-right .sb-width').dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    await T.sleep(100);
    check(Math.round(q('.side-right .sb-stack').getBoundingClientRect().width) === 109, 'G17 a double-click puts the default back');
    // Drag the left text box by its grip across to the right side, then Alt+Left brings it home.
    var grip = q('.sb-grip', sideBoxEls('left')[0]), gp = mid(grip);
    check(hits(grip), 'G18 the box\'s grip is on top at its centre');
    var wrap = $('table-wrap').getBoundingClientRect(), dropAt = {x: Math.round(wrap.right - 40), y: Math.round(wrap.top + 30)};
    ptr('pointerdown', grip, gp, 1); ptr('pointermove', document.body, {x: gp.x + 10, y: gp.y + 10}, 1);
    ptr('pointermove', document.body, dropAt, 1);
    var zone = q('.sb-drop');
    out.dropShown = !!zone;
    ptr('pointerup', document.body, dropAt, 0);
    await T.until(function () { return sideBoxEls('left').length === 0; }, 'the box to move across', 30, 100);
    check(sideBoxEls('right').length === 3 && q('.side-left').hidden && out.dropShown,
          'G19 a box dragged over the grid\'s right half lands on the right side, with a drop mark while it moves');
    var moved = sideBoxEls('right').find(function (b) { return txt(q('.sb-title', b)) === 'Notes' && b.dataset.kind === 'text' && /Locations/.test(txt(b)); });
    q('.sb-grip', moved).dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true}));
    await T.until(function () { return sideBoxEls('left').length === 1; }, 'Alt+Left', 30, 100);
    check(sideBoxEls('left').length === 1 && /Locations/.test(txt(sideBoxEls('left')[0])), 'G20 Alt+Left on the grip moves it back to the left');
    // A box dropped on an EMPTY side while the grid is scrolled: the column that appears opens level with
    // the grid, so the box shows where it was let go. (Alt+Left cannot show this: it focuses the box, which
    // rightly scrolls the box into view.) Two undos then put everything back.
    var lbRow = Math.round((topOf(sideBoxEls('left')[0]) - rowTop(0)) / rowsTall(1, 1));
    q('.sb-grip', sideBoxEls('left')[0]).dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true}));
    await T.until(function () { return sideBoxEls('left').length === 0; }, 'Alt+Right', 30, 100);
    var gsg = q('#table-wrap > .sheet-scroll');
    gsg.scrollTop = 120; gsg.dispatchEvent(new Event('scroll')); await T.sleep(150);
    var gAt = gsg.scrollTop, back = sideBoxEls('right').find(function (b) { return /Locations/.test(txt(b)); });
    await dragBoxTo(back, rowTop(14), Math.round($('table-wrap').getBoundingClientRect().left + 40));
    await T.until(function () { return sideBoxEls('left').length === 1; }, 'the drop on the empty left side', 30, 100);
    out.r17 = {grid: gAt, gridNow: gsg.scrollTop, left: q('.side-left .sb-stack').scrollTop,
               off: Math.round((topOf(sideBoxEls('left')[0]) - rowTop(14)) * 100) / 100};
    check(gAt > 100 && Math.abs(out.r17.left - gAt) < 1.5 && Math.abs(out.r17.off) < 1.5,
          'R17 a box dropped on an empty side shows where it was let go: the new column opens level with the grid (' + JSON.stringify(out.r17) + ')');
    gsg.scrollTop = 0; gsg.dispatchEvent(new Event('scroll')); await T.sleep(150);
    $('undo-btn').click(); await T.until(function () { return sideBoxEls('left').length === 0; }, 'undo the drop', 50, 100);
    $('undo-btn').click(); await T.until(function () { return sideBoxEls('left').length === 1; }, 'undo Alt+Right', 50, 100);
    await T.sleep(150);
    check(/Locations/.test(txt(sideBoxEls('left')[0])) && level(sideBoxEls('left')[0], lbRow) && q('.side-left .sb-stack').scrollTop === 0,
          'R18 two undos put the box back on its row (' + lbRow + ') on the left');
    // Dropped onto the upper half of another box, a box takes its place and that box moves down under it.
    var rk = q('.side-right .sb-box[data-kind="key"]'), rd = sideBoxEls('right').find(function (b) { return txt(q('.sb-title', b)) === 'Dates'; });
    var keyTop = topOf(rk), rowH = rowsTall(1, 1);
    await dragBoxTo(rd, keyTop + rowH);
    await T.until(function () { return sideBoxEls('right')[0].dataset.kind === 'text'; }, 'Dates to take the key\'s place', 30, 100);
    rk = q('.side-right .sb-box[data-kind="key"]'); rd = sideBoxEls('right')[0];
    out.r9 = {keyWas: keyTop, dates: topOf(rd), datesBottom: rd.getBoundingClientRect().bottom, key: topOf(rk)};
    check(Math.abs(out.r9.dates - keyTop) < 1.5 && out.r9.key > out.r9.datesBottom + rowH * 0.6 && out.r9.key < out.r9.datesBottom + rowH * 1.6,
          'R10 a box let go in the upper half of another takes its place; that one moves under it, one empty row down (' + JSON.stringify(out.r9) + ')');
    // A new box on a side whose boxes have rows goes under the lowest of them.
    $('tb-side-boxes-btn').click();
    await T.until(function () { return qa('.sb-menu .sb-menu-item').length === 4; }, 'the Side boxes menu again', 50, 100);
    qa('.sb-menu .sb-menu-item').find(function (b) { return b.dataset.kind === 'text' && b.dataset.side === 'right'; }).click();
    await T.until(function () { return sideBoxEls('right').length === 3; }, 'a third box on the right', 50, 100);
    var rn = sideBoxEls('right')[2], lowest = q('.side-right .sb-box[data-kind="key"]').getBoundingClientRect().bottom;
    out.r10 = {newTop: topOf(rn), keyBottom: lowest, title: txt(q('.sb-title', rn))};
    check(out.r10.title === 'Notes' && out.r10.newTop > lowest + rowH * 0.6 && out.r10.newTop < lowest + rowH * 1.6,
          'R11 a new box goes under the lowest box on its side, one empty row down (' + JSON.stringify(out.r10) + ')');
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    $('undo-btn').click(); await T.until(function () { return sideBoxEls('right').length === 2; }, 'undo the new box', 50, 100);
    // Alt+Down against the box below trades places with it; with room below, it steps down one row.
    var rdTop = topOf(sideBoxEls('right')[0]);
    q('.sb-grip', sideBoxEls('right')[0]).dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true}));
    await T.until(function () { return sideBoxEls('right')[0].dataset.kind === 'key'; }, 'Alt+Down to swap', 30, 100);
    check(Math.abs(topOf(sideBoxEls('right')[0]) - rdTop) < 1.5 && sideBoxEls('right')[1].dataset.kind === 'text',
          'R12 Alt+Down against the box below swaps the two, the upper starting where the first did');
    var low = sideBoxEls('right')[1], lowTop = topOf(low);
    q('.sb-grip', low).dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true}));
    await T.until(function () { return topOf(sideBoxEls('right')[1]) > lowTop + 5; }, 'Alt+Down to step', 30, 100);
    out.r12 = {was: lowTop, now: topOf(sideBoxEls('right')[1])};
    check(Math.abs(out.r12.now - out.r12.was - rowH) < 2, 'R13 Alt+Down with room below moves the box one row (' + JSON.stringify(out.r12) + ')');
    // Zoomed out the grid's rows shrink and the boxes keep their size, so a box would cover the one under it;
    // on screen it is moved just under it instead, the top box staying level with its row.
    var rTop = sideBoxEls('right')[0], rowOf = Math.round((topOf(rTop) - rowTop(0)) / rowH);
    document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: 0.5}})); await settle();
    var rb = sideBoxEls('right').map(function (b) { var r = b.getBoundingClientRect(); return {top: r.top, bottom: r.bottom}; });
    out.r14 = {boxes: rb, firstLevel: level(sideBoxEls('right')[0], rowOf)};
    document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: 1}})); await settle();
    check(rb.length === 2 && rb[0].bottom <= rb[1].top && out.r14.firstLevel,
          'R14 at 50% two boxes on a side never overlap; the upper one stays level with its row (' + JSON.stringify(out.r14) + ')');

    // ---- F: the file ---------------------------------------------------------------------------------------
    var c1 = await savedCopy(), sbk = c1.snap && c1.snap.sideBoxes;
    out.savedBoxes = sbk ? sbk.boxes.map(function (b) { return b.side + ':' + b.kind + ':' + b.title; }) : null;
    var dates = sbk && sbk.boxes.find(function (b) { return b.title === 'Dates'; });
    var key = sbk && sbk.boxes.find(function (b) { return b.kind === 'key'; });
    check(sbk && sbk.boxes.length === 3 && dates && dates.side === 'right' && dates.lines.length === 2 &&
          key && key.names['#E2F0D9'] === 'Shoot' && key.hidden.length === 0 && !('right' in (sbk.widths || {})),
          'F1 a real saved copy carries the boxes as edited (' + (out.savedBoxes || []).join(', ') + ')');
    var idsWith = Object.keys((c1.snap.fields || {}).byId || {}).sort().join(',');
    // Parsed, not grepped: the copy is a working app, so its own script and stylesheet name every one of
    // these classes. What must be absent is the drawn MARKUP.
    var cdoc = new DOMParser().parseFromString(c1.html, 'text/html');
    check(!cdoc.querySelector('.side-col .sb-box') && !cdoc.querySelector('main.preview-panel.has-side-boxes') &&
          !cdoc.querySelector('.sb-fmt, .sb-menu, .sb-drop') && cdoc.querySelectorAll('.side-col[hidden]').length === 2,
          'F2 the copy carries no drawn box, no panel grid and no body-level panel: its own engine draws them');
    // Delete every box: the key leaves the file and the PDF is the no-box PDF again.
    while(qa('.side-col .sb-del').length){ qa('.side-col .sb-del')[0].click(); await T.sleep(60); }
    check(!panel.classList.contains('has-side-boxes') && q('.side-left').hidden && q('.side-right').hidden,
          'F3 with the last box gone the panel is plain again');
    var c0 = await savedCopy();
    var idsWithout = Object.keys((c0.snap.fields || {}).byId || {}).sort().join(',');
    check(c0.snap && !('sideBoxes' in c0.snap), 'F5 with no box the file has no sideBoxes key');
    check(idsWith === idsWithout, 'F6 the boxes add no field id (' + idsWithout.split(',').length + ' ids)');
    var p0b = await pdfContent(await exportAgain('export-wf-pdf-btn', 'the PDF with no box'));
    var x0 = new ExcelJS.Workbook(); await x0.xlsx.load(await (await exportAgain('export-btn', 'the workbook with no box')).arrayBuffer());
    check(x0.worksheets[0].getCell('A1').value === 'Date', 'F7 with no box the workbook\'s grid is back in column A');
    $('undo-btn').click(); await T.until(function () { return qa('.side-col .sb-box').length === 1; }, 'undo the last delete', 50, 100);
    var p1b = await pdfContent(await exportAgain('export-wf-pdf-btn', 'the PDF with one box'));
    $('redo-btn').click(); await T.until(function () { return qa('.side-col .sb-box').length === 0; }, 'redo the delete', 50, 100);
    var p2b = await pdfContent(await exportAgain('export-wf-pdf-btn', 'the PDF with none again'));
    check(stampless(p1b.content) !== stampless(p0b.content) && stampless(p2b.content) === stampless(p0b.content),
          'F8 a box changes the PDF, and taking it away gives back the very same page content');
    // ⚠️ AFTER the undo/redo above: a view switch is itself an undo step (viewMode is saved), so taking this
    // measurement first put the undo on the switch instead of on the delete.
    $('view-month-btn').click(); await settle();
    var monthNoBox = $('table-wrap').getBoundingClientRect().width;
    check(Math.abs(monthNoBox - out.monthWrapW) < 0.01, 'F4 #table-wrap is exactly as wide in the month view with boxes as without (' + out.monthWrapW + ' / ' + monthNoBox + ')');
    $('view-sheet-btn').click(); await settle();
    // A hostile file: an unknown kind, markup in a title, a bad colour key, a width out of range.
    var hostile = JSON.parse(JSON.stringify(c0.snap));
    hostile.sideBoxes = {boxes: [
      {side: 'left', kind: 'chart', title: 'from a future build'},
      {side: 'middle', kind: 'text', title: 'nowhere'},
      {side: 'left', kind: 'text', title: '<img src=x onerror="window.__PWN=1">', row: 4, lines: [{t: 'a\nb', f: {size: 'huge', color: 'red'}}, 7]},
      {side: 'right', kind: 'key', title: 'Key', row: -2, names: {'#e2f0d9': 'Lower', 'nope': 'x'}, hidden: ['#zzzzzz']}],
      widths: {left: 999, right: 30}};
    var answered = false, poll = setInterval(function () {
      var b = [].find.call(document.querySelectorAll('button'), function (x) { return /^(Load|Discard|Don.t save)/.test((x.textContent || '').trim()) && x.offsetParent !== null; });
      if(b){ answered = true; b.click(); }
    }, 50);
    await T.openViaFakePicker('/tests/fixtures/sideboxes.sptcal', 'hostile.sptcal', {text: JSON.stringify(hostile)});
    clearInterval(poll);
    await T.until(function () { return qa('.side-col .sb-box').length === 2; }, 'the hostile file to load', 100, 100);
    await settle();
    var hl = q('.side-left .sb-box');
    out.hostile = {boxes: qa('.side-col .sb-box').map(function (b) { return b.closest('.side-col').dataset.side + ':' + b.dataset.kind; }),
                   title: txt(q('.sb-title', hl)), lines: qa('.sb-line', hl).map(txt), leftW: q('.side-left .sb-stack').getBoundingClientRect().width,
                   rightW: q('.side-right .sb-stack').getBoundingClientRect().width, keys: keyNames()};
    check(out.hostile.boxes.join(',') === 'left:text,right:key' && !q('.side-col img') && !window.__PWN &&
          out.hostile.title === '<img src=x onerror="window.__PWN=1">' && out.hostile.lines.join('|') === 'a b',
          'F9 a hostile file: unknown kinds and sides dropped, markup shown as text, a line break flattened (' + JSON.stringify(out.hostile.boxes) + ')');
    check(Math.round(out.hostile.leftW) === 109 && Math.round(out.hostile.rightW) === 161 && out.hostile.keys.indexOf('Lower') >= 0,
          'F10 an out-of-range width is dropped, a good one kept, a lower-case colour key normalised (' + Math.round(out.hostile.leftW) + ', ' + Math.round(out.hostile.rightW) + ')');
    check(level(hl, 4) && level(q('.side-right .sb-box'), 0), 'F14 a good row is kept (the text box on row 4), a negative one dropped (the key back on row 0)');
    // New clears every box.
    var poll2 = setInterval(function () { T.clickModalButton('Start new'); }, 50);
    $('new-file-btn').click();
    await T.until(function () { return qa('.side-col .sb-box').length === 0; }, 'New to clear the boxes', 100, 100);
    clearInterval(poll2);
    check(!panel.classList.contains('has-side-boxes'), 'F11 New clears every box');
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  // The hostile file (F9) is MEANT to raise the sanitizer's one warning, naming the eight values it planted:
  // the unknown kind, the unknown side, the non-object line, the bad size and colour, the bad key name, the
  // bad hidden colour, the out-of-range width, the negative row. Anything else in the console fails the leg.
  var errs = ((out.health || {}).errors || []);
  var expected = errs.filter(function (e) { return /SPTCal: 9 value\(s\) in this calendar were not in a form the app writes/.test(e); });
  check(expected.length === 1, 'F12 the hostile file raised the sanitizer\'s warning once, for exactly the 9 planted values');
  out.unexpectedErrors = errs.filter(function (e) { return expected.indexOf(e) < 0; });
  check(!out.unexpectedErrors.length, 'F13 no other console error or warning (' + out.unexpectedErrors.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
