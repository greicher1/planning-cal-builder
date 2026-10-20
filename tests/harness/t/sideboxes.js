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
    var cap = T.captureDownload();
    $('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable copy', 200, 100);
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
    out.lineHeights = qa('.side-col[data-side="left"] .sb-edit').map(function (e) { return e.style.minHeight; });
    check(out.lineHeights.join(',') === '20px,20px,60px,20px,20px,40px',
          'S5 every line takes its PRINT rows at 20 px: the three-line wrap 3, the 14 pt line 2 (' + out.lineHeights + ')');
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
    // The format bar, on the left box's bold first line: B turns it off, 16 makes it two rows tall.
    var lb = q('.sb-line[data-li="0"]', sideBoxEls('left')[0]);
    lb.focus(); lb.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.until(function () { return !!q('.sb-fmt'); }, 'the format bar', 30, 100);
    var bar = q('.sb-fmt'), bBtn = bar && q('.hf-b', bar);
    check(bar && qa('[id]', bar).length === 0 && bBtn.classList.contains('is-on') && hits(bBtn),
          'G8 focusing a line shows the format bar: no ids, Bold lit for a bold line, on top');
    bBtn.click();
    check(getComputedStyle(lb).fontWeight === '400' && !bBtn.classList.contains('is-on'), 'G9 Bold turns the line\'s bold off, in place');
    var sz = q('.hf-size', bar); sz.value = '16'; sz.dispatchEvent(new Event('change', {bubbles: true}));
    check(lb.style.minHeight === '40px' && getComputedStyle(lb).fontSize === '16px', 'G10 size 16 takes two print rows (' + lb.style.minHeight + ')');
    q('.hf-clear', bar).click();
    check(lb.style.minHeight === '20px' && getComputedStyle(lb).fontWeight === '400', 'G11 clear returns the line to the plain default');
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
    await T.sleep(700);   // the share button's re-click guard is 600 ms
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
      {side: 'left', kind: 'text', title: '<img src=x onerror="window.__PWN=1">', lines: [{t: 'a\nb', f: {size: 'huge', color: 'red'}}, 7]},
      {side: 'right', kind: 'key', title: 'Key', names: {'#e2f0d9': 'Lower', 'nope': 'x'}, hidden: ['#zzzzzz']}],
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
  // bad hidden colour, the out-of-range width. Anything else in the console fails the leg.
  var errs = ((out.health || {}).errors || []);
  var expected = errs.filter(function (e) { return /SPTCal: 8 value\(s\) in this calendar were not in a form the app writes/.test(e); });
  check(expected.length === 1, 'F12 the hostile file raised the sanitizer\'s warning once, for exactly the 8 planted values');
  out.unexpectedErrors = errs.filter(function (e) { return expected.indexOf(e) < 0; });
  check(!out.unexpectedErrors.length, 'F13 no other console error or warning (' + out.unexpectedErrors.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
