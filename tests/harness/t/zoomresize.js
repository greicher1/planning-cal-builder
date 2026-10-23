// zoomresize -- the waterfall's column, row and cell-edge drags at every calendar zoom (owner, 22 Oct 2026:
// "can we make it so you can still adjust the size of columns and rows at any zoom level of the viewport").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh zoomresize 200
//
// Until 22 Oct 2026 the handles were hidden at any zoom but 100%: frozen installGridResizers placed them, and
// the frozen drags sized them, by mixing screen px (rects, clientX) with the grid's own px (inline styles),
// and a zoomed row drag SAVED the zoomed height. Frozen edits Z1-Z6 (owner sign-off by picker) divide every
// rect and pointer length by the zoom, which is 1 at 100%.
//
// For each zoom (100% first, then 50%, 150%, 200%) the same drag in the GRID's px (so D x zoom on screen):
// H  every row and column handle on its row or column, and the three handles used below on top where grabbed
// C  a column dragged 20 grid px saves exactly the width the same drag saves at 100%
// R  a row dragged 15 grid px saves the height it saves at 100%, within 1 px (a zoomed layout's rows are not
//    quite its 100% rows: 20.00 px at 200%, ~20.84 at 100%, and the drag starts from the row as laid out)
// S  a phase cell's right edge dragged onto the next column boundary takes exactly one more column
// U  each is undone before the next zoom, back to the same starting grid
// Red on a build before Z1-Z6 (C, R and S at 50%, 150% and 200%; the handles were also hidden).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'zoomresize', runs: {} }, fails = [], checks = [];
  function check(cond, what){ checks.push({ what: what, ok: !!cond }); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function near(a, b, tol){ return Math.abs(a - b) <= (tol == null ? 1 : tol); }
  function centre(el){ var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  // At the handle's centre, or, for a column handle (the whole grid tall), at its x halfway down the scroll
  // box: zoomed in, the middle of the grid is below the box's bottom.
  function onTop(el){
    var p = centre(el);
    if(el.classList.contains('is-col')){ var sr = $('sheet-scroll-container').getBoundingClientRect(); p.y = (sr.top + sr.bottom) / 2; }
    var t = document.elementsFromPoint(p.x, p.y)[0];
    return t === el;
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  async function zoomTo(z){
    document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom: z } }));
    await T.sleep(400);   // past the engine's 150 ms settle, which re-places the handles
  }
  // Pointer events in SCREEN px, as a mouse sends them: from the handle's centre to (dx, dy) away.
  async function drag(h, toX, toY) {
    var p = centre(h);
    if(toX == null) toX = p.x; if(toY == null) toY = p.y;
    h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 9, button: 0, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: (p.x + toX) / 2, clientY: (p.y + toY) / 2, pointerId: 9, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: toX, clientY: toY, pointerId: 9, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: toX, clientY: toY, pointerId: 9, isPrimary: true }));
    await settle('the grid after the drag');
  }
  async function undo(){ $('undo-btn').click(); await settle('the grid after undo'); await T.sleep(250); }
  function colEl(ckey){ return q('#table-wrap table.sheet-table colgroup col[data-ckey="' + ckey + '"]'); }
  function rowEl(r){ return q('#table-wrap table.sheet-table').tBodies[0].rows[r]; }
  function colX(i){
    var cols = qa('#table-wrap table.sheet-table colgroup col'), x = 0;
    for(var k = 0; k < i; k++) x += parseFloat(cols[k].style.width) || 0;
    return x;
  }
  // Every handle in the grid's own px against its row's or column's screen place divided by the zoom.
  function handlesPlaced(z){
    var wrap = q('.sheet-grid-wrap'), wr = wrap.getBoundingClientRect();
    var rows = Array.from(q('#table-wrap table.sheet-table').tBodies[0].rows), bad = 0, badc = 0, bads = 0;
    qa('.grid-resize.is-row', wrap).forEach(function (h, i){
      if(!near(parseFloat(h.style.top), (rows[i].getBoundingClientRect().bottom - wr.top) / z, 0.6)) bad++;
    });
    var cols = qa('#table-wrap table.sheet-table colgroup col'), ch = qa('.grid-resize.is-col', wrap), x = 0;
    cols.forEach(function (c, i){ x += parseFloat(c.style.width) || 0; if(!ch[i] || !near(parseFloat(ch[i].style.left), x, 0.6)) badc++; });
    var spans = qa('.grid-resize.is-span', wrap);
    spans.forEach(function (h){
      var td = q('#table-wrap td.sheet-phase-cell[data-week="' + h.dataset.week + '"][data-pkey="' + h.dataset.pkey + '"]');
      if(!td){ bads++; return; }
      var r = td.getBoundingClientRect();
      if(!near(parseFloat(h.style.top), (r.top - wr.top) / z, 0.6) || !near(parseFloat(h.style.height), r.height / z, 0.6)) bads++;
    });
    return { rows: rows.length, bad: bad, cols: ch.length, badc: badc, spans: spans.length, bads: bads,
             hidden: getComputedStyle(q('.grid-resize-layer')).display === 'none' };
  }
  var CKEY = 'y2026:notes', ROW = 10, DC = 20, DR = 15;
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 20; }, 'the grid', 200, 100);
    await settle('the calendar to settle');
    // A phase cell whose right edge has at least one empty column beside it, near the top of the grid.
    var spanH = qa('#table-wrap .grid-resize.is-span[data-side="r"]').find(function (h){ return +h.dataset.rmax > +h.dataset.b; });
    if(!spanH) throw new Error('no phase cell with room on its right');
    var SPAN = { week: spanH.dataset.week, pkey: spanH.dataset.pkey };
    out.span = SPAN;
    function spanHandle(){ return q('#table-wrap .grid-resize.is-span[data-side="r"][data-week="' + SPAN.week + '"][data-pkey="' + SPAN.pkey + '"]'); }
    function spanTd(){ return q('#table-wrap td.sheet-phase-cell[data-week="' + SPAN.week + '"][data-pkey="' + SPAN.pkey + '"]'); }

    var base0 = null;
    for(var z of [1, 0.5, 1.5, 2]){
      var run = out.runs[z] = {};
      await zoomTo(z);
      check($('table-wrap').style.zoom === (z === 1 ? '' : String(z)), 'Z ' + (z * 100) + '%: #table-wrap carries the zoom');
      var box = $('sheet-scroll-container'); box.scrollTop = 0; box.scrollLeft = 0; await T.sleep(150);

      // H: placement, and the three handles grabbable.
      run.placed = handlesPlaced(z);
      var p = run.placed;
      check(!p.hidden && p.rows > 20 && !p.bad && !p.badc && p.spans > 0 && !p.bads,
            'H1 ' + (z * 100) + '%: the handles show, every row, column and cell-edge handle on its place (' + JSON.stringify(p) + ')');
      var hc = q('#table-wrap .grid-resize.is-col[data-ckey="' + CKEY + '"]'), hr = q('#table-wrap .grid-resize.is-row[data-row="' + ROW + '"]'), hs = spanHandle();
      [hc, hr, hs].forEach(function (h){ if(h) h.scrollIntoView({ block: 'center', inline: 'center' }); });
      hr.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(150);
      run.onTop = { row: onTop(hr) };
      hc.scrollIntoView({ block: 'nearest', inline: 'center' }); await T.sleep(150);
      run.onTop.col = onTop(hc);
      hs.scrollIntoView({ block: 'center', inline: 'center' }); await T.sleep(150);
      run.onTop.span = onTop(hs);
      check(run.onTop.row && run.onTop.col && run.onTop.span, 'H2 ' + (z * 100) + '%: the row, column and cell-edge handles are on top where they are grabbed (' + JSON.stringify(run.onTop) + ')');

      // Starting grid, the same at every zoom (each drag is undone).
      var start = { w: parseFloat(colEl(CKEY).style.width), h: rowEl(ROW).style.height, b: +spanTd().dataset.b };
      run.start = start;
      if(base0 === null) base0 = start;
      else check(start.w === base0.w && start.h === base0.h && start.b === base0.b,
                 'U1 ' + (z * 100) + '%: the grid starts as it did at 100% (' + JSON.stringify(start) + ' vs ' + JSON.stringify(base0) + ')');

      // C: a column, DC grid px wider.
      hc = q('#table-wrap .grid-resize.is-col[data-ckey="' + CKEY + '"]');
      hc.scrollIntoView({ block: 'nearest', inline: 'center' }); await T.sleep(100);
      await drag(hc, centre(hc).x + DC * z, null);
      run.colW = parseFloat(colEl(CKEY).style.width);
      if(z === 1) check(near(run.colW - start.w, DC, 1), 'C0 100%: a column dragged ' + DC + ' px is ' + DC + ' px wider (' + start.w + ' -> ' + run.colW + ')');
      else check(run.colW === out.runs[1].colW, 'C1 ' + (z * 100) + '%: the same column drag saves exactly the 100% width (' + run.colW + ' vs ' + out.runs[1].colW + ')');
      await undo();
      check(parseFloat(colEl(CKEY).style.width) === start.w, 'U2 ' + (z * 100) + '%: undo puts the column back');

      // R: a row, DR grid px taller.
      hr = q('#table-wrap .grid-resize.is-row[data-row="' + ROW + '"]');
      hr.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(100);
      var laid = rowEl(ROW).getBoundingClientRect().height / z;
      await drag(hr, null, centre(hr).y + DR * z);
      run.rowH = parseFloat(rowEl(ROW).style.height);
      run.rowLaid = Math.round(laid * 100) / 100;
      if(z === 1) check(near(run.rowH, Math.round(laid + DR), 0), 'R0 100%: a row dragged ' + DR + ' px is saved ' + DR + ' px taller than laid out (' + run.rowLaid + ' -> ' + run.rowH + ')');
      else check(near(run.rowH, out.runs[1].rowH, 1) && near(run.rowH, Math.round(laid + DR), 0),
                 'R1 ' + (z * 100) + '%: the same row drag saves the 100% height within 1 px (' + run.rowH + ' vs ' + out.runs[1].rowH + ', laid out ' + run.rowLaid + ')');
      await undo();
      check(rowEl(ROW).style.height === start.h, 'U3 ' + (z * 100) + '%: undo puts the row back');

      // S: a cell's right edge onto the next column boundary.
      hs = spanHandle();
      hs.scrollIntoView({ block: 'center', inline: 'center' }); await T.sleep(100);
      var wr = q('.sheet-grid-wrap').getBoundingClientRect(), b0 = +hs.dataset.b, target = +hs.dataset.base + b0 + 2;
      await drag(hs, wr.left + colX(target) * z, null);
      run.spanB = +spanTd().dataset.b;
      check(run.spanB === b0 + 1, 'S1 ' + (z * 100) + '%: a cell edge dragged onto the next column takes exactly that column (b ' + b0 + ' -> ' + run.spanB + ')');
      await undo();
      check(+spanTd().dataset.b === b0, 'U4 ' + (z * 100) + '%: undo puts the cell back');
    }
    await zoomTo(1);
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  check(!errs.length, 'E1 no console error or warning (' + errs.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
