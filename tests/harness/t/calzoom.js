// calzoom -- the calendar zoom (owner, 20 Oct 2026: "a zoom in/zoom out slider in the bottom right corner of
// both the waterfall view and month view"). src/chrome/ZoomControl.jsx is the control; app.js "CALENDAR ZOOM"
// holds one zoom per view and puts it on #table-wrap as CSS `zoom`.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh calzoom 300
//
// tests/fixtures/mvnotes.sptcal opens in the month view with notes that wrap to two and three lines, which is
// what the month checks need; its waterfall is a full two-year grid. Red on the pre-change build (no control).
//
// Z  the control: bottom right, left of the help button and clear of it, on top where it is pressed, no id
//    anywhere in it, 100% writes nothing at all (no style on #table-wrap, no body class), and both it and the
//    help button in the bottom strip, below the preview's scroll box (Z5, W1b; owner, 21 Oct 2026).
// W  the waterfall: a step through the hit stack, the grid box ending at the panel's bottom at every zoom with
//    the panel never scrolling, the frozen resize handles shown while zoomed and ON their rows and columns at
//    90% and back at 100% (frozen edits Z1-Z6, 22 Oct 2026; the drags themselves are leg zoomresize), the
//    selection outline on its cell and the swap button in the same grid place at 150%.
// M  the month view: its own zoom, the day columns and every note lane exactly as at 100% (a magnification,
//    nothing reflows), sideways scroll when zoomed in, and the zoom it remembers for the waterfall untouched.
// F  the file: a zoom is not an edit (no dirty mark, no undo step), a shareable copy carries no zoom and no
//    zoom key, the preference holds both views' values and drops the key at 100%.
//
// M4 is the frozen edit the owner approved (21 Oct 2026): a MONTH render made while zoomed (paging a month)
// used to size note lanes for the zoomed width, because mvNoteBoxWidth() measured the day column on screen.
// Red before that edit (2 notes lost a line at 150-200% on this fixture), green after.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'calzoom'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)}; }
  function topAt(p){ return document.elementsFromPoint(p.x, p.y)[0] || null; }
  function hits(el){ var t = topAt(mid(el)); return !!t && (t === el || el.contains(t)); }
  function near(a, b, tol){ return Math.abs(a - b) <= (tol == null ? 1 : tol); }
  function pct(){ var e = q('.cal-zoom .cal-zoom-pct'); return e ? e.textContent.trim() : null; }
  function view(){ return $('view-month-btn').classList.contains('active') ? 'month' : 'sheet'; }
  function prefs(){ try { return JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); } catch(e){ return {}; } }
  // The control speaks through this event; the buttons are also pressed for real below.
  async function zoomTo(z){
    document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: z}}));
    await T.sleep(400);   // past the engine's 150 ms settle (the stored value, the re-render at 100%, the handles re-placed)
  }
  async function press(el){
    if(!hits(el)) throw new Error('not on top: ' + (el.getAttribute('aria-label') || el.className));
    el.click();
    await T.sleep(400);
  }
  function lanes(){ return qa('#table-wrap .mv-note-block').map(function (n){ return n.getAttribute('style'); }).join('|'); }
  function gridBox(){
    var s = $('sheet-scroll-container'), pp = q('main.preview-panel');
    var r = s.getBoundingClientRect(), pr = pp.getBoundingClientRect();
    var floor = pr.bottom - parseFloat(getComputedStyle(pp).paddingBottom);
    // Either it reaches the panel's floor, or the whole grid fits above it (zoomed far out). The GRID, not the
    // box's scrollHeight: the last row's resize handle hangs 3 px below the table (frozen installGridResizers,
    // margin-top -4px on a 7 px handle), which has always added a few px of scroll at 100% and, since the handles
    // show at every zoom (22 Oct 2026), does at 50% too.
    var t = q('#table-wrap table.sheet-table').getBoundingClientRect();
    return {bottom: r.bottom, floor: floor, fits: t.bottom <= r.bottom + 1 && s.scrollTop === 0,
            panelScrolls: pp.scrollHeight > pp.clientHeight + 1};
  }
  // The bottom strip (owner, 21 Oct 2026: the control covered the grid's last rows and its scrollbar). The
  // control and the help button sit BELOW the box, 8px clear, so nothing drawn in it passes under them.
  function clearOfStrip(el){
    var b = el.getBoundingClientRect().bottom, c = q('.cal-zoom').getBoundingClientRect(), f = $('help-fab').getBoundingClientRect();
    out.strip = [b, c.top, f.top].map(Math.round);
    return b <= Math.min(c.top, f.top) - 8 + 0.5;
  }
  // In the grid's own px: a handle's inline top against its row's screen offset divided by the zoom.
  function handlesOnRows(z){
    z = z || 1;
    var wrap = q('.sheet-grid-wrap'), wr = wrap.getBoundingClientRect();
    var rows = Array.from(q('table.sheet-table').tBodies[0].rows), hs = qa('.grid-resize.is-row', wrap), bad = 0;
    hs.forEach(function (h, i){ if(!near(parseFloat(h.style.top), (rows[i].getBoundingClientRect().bottom - wr.top) / z, 0.6)) bad++; });
    var cols = qa('table.sheet-table colgroup col'), ch = qa('.grid-resize.is-col', wrap), x = 0, badc = 0;
    cols.forEach(function (c, i){ x += parseFloat(c.style.width) || 0; if(!ch[i] || !near(parseFloat(ch[i].style.left), x, 0.6)) badc++; });
    return {rows: hs.length, bad: bad, cols: ch.length, badc: badc};
  }
  try {
    await T.until(function () { return q('#table-wrap .mv-body') && q('.cal-zoom'); }, 'the month view and the zoom control', 150, 100);
    await T.sleep(300);
    out.saveStatus0 = (q('.save-status') || {}).textContent || '';
    var undoOff0 = !!($('undo-btn') && $('undo-btn').hasAttribute('data-disabled'));

    // ---- Z: the control ----
    var ctl = q('.cal-zoom'), fab = $('help-fab');
    var cr = ctl.getBoundingClientRect(), fr = fab.getBoundingClientRect();
    out.ctlRect = [cr.left, cr.top, cr.right, cr.bottom].map(Math.round);
    check(cr.right <= fr.left - 8 && near((cr.top + cr.bottom) / 2, (fr.top + fr.bottom) / 2, 1.5) &&
          cr.right > innerWidth - 120 && cr.bottom > innerHeight - 60,
          'Z1 bottom right, left of the help button and clear of it, centred on it (' + out.ctlRect + ' vs fab ' + [fr.left, fr.top].map(Math.round) + ')');
    check(pct() === '100%' && hits(q('.cal-zoom-slider')) && hits(q('.cal-zoom [aria-label="Zoom out"]')) && hits(q('.cal-zoom [aria-label="Zoom in"]')),
          'Z2 it reads 100% and its slider and both buttons are on top where they are pressed');
    check(!qa('[id]', ctl).length, 'Z3 no id anywhere in it (collectFieldValues sweeps every input[id] into the file)');
    // The month view scrolls in .preview-panel itself, so the panel is the box that must end above them.
    check(clearOfStrip(q('main.preview-panel')), 'Z5 the bottom strip: the month view\'s scroll box ends 8px above the control and the help button (' + out.strip + ')');
    check(!$('table-wrap').hasAttribute('style') && !document.body.classList.contains('cal-zoomed') && !prefs().calZoom,
          'Z4 at 100% nothing is written: no style on #table-wrap, no body class, no preference');

    // ---- M: the month view (the fixture opens in it) ----
    var cell0 = q('#table-wrap .mv-daycell').offsetWidth, tw0 = $('table-wrap').getBoundingClientRect().width, lanes0 = lanes();
    out.lanes0 = lanes0.length;
    await zoomTo(1.5);
    var pp = q('main.preview-panel');
    out.m150 = {pct: pct(), cell: q('#table-wrap .mv-daycell').offsetWidth, w: $('table-wrap').getBoundingClientRect().width,
                sideways: pp.scrollWidth > pp.clientWidth + 1, style: $('table-wrap').getAttribute('style')};
    check(out.m150.pct === '150%' && out.m150.cell === cell0 && near(out.m150.w, tw0 * 1.5, 2) && lanes() === lanes0,
          'M1 150%: the day columns keep their width and every note its lanes, the month drawn 1.5x (' + JSON.stringify(out.m150) + ')');
    check(out.m150.sideways, 'M2 zoomed in, the preview scrolls sideways');
    await zoomTo(0.5);
    out.m50 = {cell: q('#table-wrap .mv-daycell').offsetWidth, cell0: cell0, w: $('table-wrap').getBoundingClientRect().width, tw0: tw0,
               lanesSame: lanes() === lanes0, lanes: lanes().slice(0, 300), lanes0: lanes0.slice(0, 300),
               cut: qa('#table-wrap .mv-note-block').filter(function (n){ return n.scrollHeight > n.clientHeight + 1; }).map(function (n){ return n.textContent.slice(0, 30) + ' ' + n.scrollHeight + '/' + n.clientHeight; })};
    // ±1: at 50% the pinned width is laid out at half-pixel steps, so a column can round a pixel narrower.
    check(near(out.m50.cell, cell0, 1) && out.m50.lanesSame && near(out.m50.w, tw0 * 0.5, 2),
          'M3 50%: the same columns and lanes, the month drawn at half size (' + out.m50.cell + ' vs ' + cell0 + ')');
    // ⚠️ Data, not a check: text is laid out at the zoomed size, so a note that only just fits its lines at
    // 100% can need one more at another zoom (seen once, headless, at 50%). The lanes themselves do not move.
    out.m50cut = out.m50.cut;
    // A month render WHILE zoomed (page away and back): the note lanes must be the 100% lanes.
    out.mvRerender = {};
    for(var rz of [1.5, 2, 0.5]){
      await zoomTo(rz);
      $('mv-next').click(); await T.sleep(250); $('mv-prev').click(); await T.sleep(350);
      out.mvRerender[rz] = lanes() === lanes0;
    }
    check(out.mvRerender[1.5] && out.mvRerender[2] && out.mvRerender[0.5],
          'M4 paging a month while zoomed to 150%, 200% and 50% leaves every note lane as at 100% (' + JSON.stringify(out.mvRerender) + ')');
    await zoomTo(1);
    check(lanes() === lanes0 && !$('table-wrap').hasAttribute('style'),
          'M5 back at 100% the month is re-rendered: every note lane as it was, and nothing left on #table-wrap');
    await zoomTo(1.25);

    // ---- W: the waterfall ----
    $('view-sheet-btn').click();
    await T.until(function () { return q('#table-wrap table.sheet-table') && view() === 'sheet'; }, 'the waterfall', 100, 100);
    await T.sleep(300);
    check(pct() === '100%' && !$('table-wrap').hasAttribute('style'), 'W1 the waterfall keeps its own zoom: 100% while the month is at 125%');
    check(clearOfStrip($('sheet-scroll-container')), 'W1b the bottom strip: the grid box ends 8px above the control and the help button (' + out.strip + ')');
    await press(q('.cal-zoom [aria-label="Zoom out"]'));
    check(pct() === '90%' && $('table-wrap').style.zoom === '0.9' && document.body.classList.contains('cal-zoomed'),
          'W2 Zoom out, pressed through the hit stack, steps to 90%');
    // Until 22 Oct 2026 the handles were hidden while zoomed (a row drag saved the zoomed height).
    var h90 = handlesOnRows(0.9);
    out.handles90 = h90;
    check(getComputedStyle(q('.grid-resize-layer')).display !== 'none' && h90.rows > 0 && !h90.bad && !h90.badc,
          'W3 zoomed to 90%, the resize handles show, every one on its row or column (' + JSON.stringify(h90) + ')');
    out.fit = {};
    var fitOk = true;
    for(var zs of [0.5, 0.9, 1.5, 2]){
      await zoomTo(zs);
      var g = gridBox(); out.fit[zs] = g;
      if(g.panelScrolls || !(near(g.bottom, g.floor, 1.5) || (g.fits && g.bottom < g.floor))) fitOk = false;
    }
    check(fitOk, 'W4 at 50/90/150/200% the grid box ends on the panel\'s floor (or the whole grid fits above it) and the panel never scrolls (' + JSON.stringify(out.fit).slice(0, 150) + ')');
    // The selection outline on its cell, at 150%.
    await zoomTo(1.5);
    var tds = qa('#table-wrap td.sheet-phase-cell').filter(function (t){ return t.dataset.own !== undefined; });
    var td = tds[Math.min(12, tds.length - 1)];
    td.scrollIntoView({block: 'center', inline: 'center'}); await T.sleep(200);
    // A point on the cell itself: a spanned cell's middle can sit on a column boundary, where the column's
    // resize handle (shown at every zoom since 22 Oct 2026, and always at 100%) takes the pointerdown.
    var p = mid(td), tgt = topAt(p), tr0 = td.getBoundingClientRect();
    for(var dx = 0; tgt && tgt.closest('.grid-resize') && dx < tr0.width / 2; dx += 4){
      p = {x: Math.round(tr0.left + tr0.width / 2 + dx), y: p.y}; tgt = topAt(p);
    }
    var po = {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1, metaKey: true, pointerType: 'mouse', pointerId: 9, isPrimary: true};
    tgt.dispatchEvent(new PointerEvent('pointerdown', po));
    tgt.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, po, {buttons: 0})));
    tgt.dispatchEvent(new MouseEvent('click', Object.assign({}, po, {buttons: 0})));
    await T.sleep(250);
    var sel = q('.grid-sel-layer .grid-sel-cell'), tr = td.getBoundingClientRect();
    var sr = sel && sel.getBoundingClientRect();
    out.sel = sr ? [sr.left - tr.left, sr.top - tr.top, sr.width - tr.width, sr.height - tr.height].map(function (v){ return Math.round(v * 10) / 10; }) : null;
    check(!!sr && out.sel.every(function (v){ return Math.abs(v) <= 1; }), 'W5 at 150% the selection outline sits on its cell (' + out.sel + ')');
    // The swap button, in grid px, where it is at 100%.
    // From the grid's top-left corner at both zooms, so the button's keep-below-the-header rule meets the
    // same run in the same place, and a cell near the top that is on screen at 150%.
    async function stint(z){
      await zoomTo(z);
      var box = $('sheet-scroll-container'); box.scrollTop = 0; box.scrollLeft = 0; await T.sleep(150);
      var c = qa('#table-wrap td.sheet-phase-cell').filter(function (t){ return t.dataset.own !== undefined; })[4];
      var m = mid(c), e = topAt(m);
      e.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: m.x, clientY: m.y, pointerType: 'mouse', pointerId: 9}));
      await T.sleep(250);
      var b = q('.grid-stint-btn'), wr = q('.sheet-grid-wrap').getBoundingClientRect();
      if(!b) return null;
      var br = b.getBoundingClientRect();
      return [(br.left - wr.left) / z, (br.top - wr.top) / z, br.width / z].map(function (v){ return Math.round(v * 10) / 10; });
    }
    document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: 2, clientY: 2, button: 0, buttons: 1, pointerId: 9, pointerType: 'mouse'}));
    out.stint1 = await stint(1); out.stint15 = await stint(1.5);
    // Within a pixel: the button's own text is laid out at the zoomed size, so its width rounds.
    check(!!out.stint1 && !!out.stint15 && out.stint1.every(function (v, i){ return near(v, out.stint15[i], 1.5); }),
          'W6 the Swap column button sits in the same grid place at 150% as at 100% (' + out.stint1 + ' / ' + out.stint15 + ')');
    // Back to 100%: the handles are re-placed, on their rows and columns.
    await zoomTo(1);
    var h = handlesOnRows();
    out.handles = h;
    check(getComputedStyle(q('.grid-resize-layer')).display !== 'none' && h.rows > 0 && !h.bad && !h.badc && !document.body.classList.contains('cal-zoomed'),
          'W7 at 100% the resize handles are re-placed, every one on its row or column (' + JSON.stringify(h) + ')');
    await zoomTo(0.75);

    // ---- F: the file and the preference ----
    // The view switches above are edits of their own (viewMode is saved state: they mark the file unsaved,
    // though since 22 Oct 2026 they bank no undo step), so the zoom-only window
    // starts here: from now on only the zoom changes.
    var save1 = (q('.save-status') || {}).textContent || '';
    var undoOff1 = !!($('undo-btn') && $('undo-btn').hasAttribute('data-disabled'));
    await zoomTo(1.4); await zoomTo(0.6); await zoomTo(1); await zoomTo(0.75);
    out.prefs = prefs().calZoom || null;
    check(out.prefs && out.prefs.sheet === 0.75 && out.prefs.month === 1.25,
          'F1 the preference holds each view\'s zoom (' + JSON.stringify(out.prefs) + ')');
    check(((q('.save-status') || {}).textContent || '') === save1 && out.saveStatus0 === '',
          'F2 zooming never marks the calendar unsaved (the page opened clean, and four zooms left the status at "' + save1 + '")');
    check(!!($('undo-btn') && $('undo-btn').hasAttribute('data-disabled')) === undoOff1, 'F3 zooming adds no undo step');
    // A shareable copy, built while zoomed.
    await T.sleep(700);   // the share handler's reClickGuard(600) swallows a click inside 600 ms of the last
    var cap = T.captureDownload();
    $('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable copy', 200, 100);
    var html = await cap.stop().text();
    var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    var snap = m ? JSON.parse(m[1]) : null;
    var twTag = (html.match(/<div id="table-wrap"[^>]*>/) || [''])[0];
    // ⚠️ Not a search for the control's class: srv.js injects THIS leg into the page, and the copy is a clone
    // of the page, so the leg's own source travels in it. #react-root is where the control renders.
    out.reactRoot = (html.match(/<div id="react-root">[\s\S]{0,40}/) || [''])[0];
    var bodyTag = (html.match(/<body[^>]*>/) || [''])[0];
    out.copy = {twTag: twTag, bodyTag: bodyTag.slice(0, 120), zoomKey: snap ? Object.keys(snap).filter(function (k){ return /zoom/i.test(k); }) : null};
    check(!!snap && twTag === '<div id="table-wrap">' && !/cal-zoomed/.test(bodyTag) && !out.copy.zoomKey.length && /^<div id="react-root"><\/div>/.test(out.reactRoot),
          'F4 a shareable copy made at 75% carries no zoom: a bare #table-wrap, no body class, no control, no zoom key (' + JSON.stringify(out.copy).slice(0, 160) + ')');
    await zoomTo(1);
    $('view-month-btn').click(); await T.sleep(400);
    await zoomTo(1);
    check(!prefs().calZoom, 'F5 both views at 100%: the preference key is gone');
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  check(!errs.length, 'F6 no console error or warning (' + errs.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
