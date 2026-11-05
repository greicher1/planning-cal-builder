// centrepullback -- a double-click on the MIDDLE of an expanded phase cell pulls it back (owner, 5 Nov 2026: "just
// like how i can drag and select collumns then double click to expand them, i should be able to drag and select
// collumns and double click to unexpand them").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=layout-r13 ./run.sh centrepullback 240
//
// The trap: a cell two columns wide has the boundary between its columns down its centre, and that boundary's
// .grid-resize.is-col handle (7px, the table's full height) took the double-click, so "a handle owns its own band"
// sent it to the frozen column autofit, which did nothing. Pull-back worked only off the centre. On layout-r13 the
// layout rules widen Writer's Rm wk 14-20 to two columns and Bible wk 13 to three, with no override.
// Every gesture here is pointer events at real coordinates, dispatched on whatever elementsFromPoint has on top,
// which is how the bug was missed: noswapbtns S4 dispatches its double-click on the td itself.
//
//   P0  the trap's precondition: wk 14-17 two columns wide, a column handle on top at each one's centre
//   P1  a marquee over wk 14-17 selects the four; the hint says "Double click to pull back cells"
//   P2  a double-click on wk 15's centre (the handle) pulls all four back; no column width moved
//   P3  a double-click on the same spot (now a cell) expands them again: the round trip
//   P4  each was ONE undo step: two undos put the calendar back and leave nothing to undo
//   P5  nothing selected: a double-click on wk 18's centre pulls back that one cell, and selects nothing
//   P6  a press that drifts the boundary 1px (the frozen drag saves a width on any move): the double-click still
//       pulls wk 19 back, the width is put back, and the gesture is one undo step
//   P7  a boundary that is a real cell edge keeps the column autofit: a dragged width there is refit, no cell moves
//   P8  a three-column cell (Bible wk 13): a double-click on its second inner boundary pulls it back
//   E0  0 console errors
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function cell(label) {
    return Array.prototype.find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
      function (td) { return td.textContent.replace(/\s+/g, ' ').trim() === label; }) || null;
  }
  function wr(n) { return cell("Writer's Rm wk " + n); }
  function spans(from, to) { var o = []; for (var n = from; n <= to; n++) { var c = wr(n); o.push(n + ':' + (c ? c.colSpan : '?')); } return o.join(' '); }
  function cols() { return Array.prototype.map.call(document.querySelectorAll('#table-wrap table.sheet-table colgroup col'), function (c) { return c.style.width; }).join(','); }
  function chipText() { return ((document.querySelector('.grid-sel-layer .grid-sel-chip') || {}).textContent || '').trim(); }
  function selShown() { return document.querySelectorAll('.grid-sel-layer > *').length; }
  function undoOn() { var b = document.querySelector('button[aria-label="Undo"]'); return !!b && !b.disabled; }
  function top(x, y) { return document.elementsFromPoint(x, y)[0] || null; }
  function centre(td) { var r = td.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  async function show(td) { td.scrollIntoView({block: 'center'}); await T.sleep(150); }
  function ptr(el, type, x, y, extra) {
    var o = {bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0,
             buttons: type === 'pointerup' ? 0 : 1, pointerId: 9, pointerType: 'mouse', isPrimary: true};
    for (var k in extra || {}) o[k] = extra[k];
    el.dispatchEvent(new PointerEvent(type, o));
  }
  // A real double-click as the browser delivers it: press, release, click, twice, then dblclick, each on the
  // element on top at that point when it happens (a render between the clicks replaces the handles).
  // `drift` moves the first press by that many px before its release.
  async function dblAt(x, y, drift) {
    for (var d = 1; d <= 2; d++) {
      var el = top(x, y);
      ptr(el, 'pointerdown', x, y);
      if (d === 1 && drift) { ptr(document, 'pointermove', x + drift, y); }
      ptr(document, 'pointerup', x + (d === 1 && drift ? drift : 0), y);
      el.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, detail: d}));
      await T.sleep(40);
    }
    top(x, y).dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, detail: 2}));
    await T.sleep(250);
  }
  async function undo() { document.querySelector('button[aria-label="Undo"]').click(); await T.sleep(300); }
  try {
    await T.until(function () { return !!wr(20); }, 'the grid to render', 200, 100);
    var last = '', stable = 0;
    await T.until(function () { var s = spans(13, 20); stable = (s === last) ? stable + 1 : 0; last = s; return stable >= 5; }, 'the grid to settle', 100, 100);
    var start = spans(13, 20), cols0 = cols();

    await show(wr(15));
    var onHandle = [14, 15, 16, 17].map(function (n) { var c = centre(wr(n)), t = top(c.x, c.y); return !!t && t.classList.contains('grid-resize') && t.classList.contains('is-col'); });
    add('P0', "precondition: Writer's Rm wk 14-17 two columns wide, a column handle on top at each one's centre",
      start === '13:1 14:2 15:2 16:2 17:2 18:2 19:2 20:2' && onHandle.every(Boolean), {spans: start, onHandle: onHandle}, '14-20 :2, 4 handles');

    // P1: a marquee from wk 14's left quarter down to wk 17's.
    var a = wr(14).getBoundingClientRect(), b = wr(17).getBoundingClientRect();
    var x0 = a.left + a.width / 4, y0 = a.top + a.height / 2, y1 = b.top + b.height / 2;
    ptr(wr(14), 'pointerdown', x0, y0);
    for (var i = 1; i <= 6; i++) ptr(document, 'pointermove', x0, y0 + (y1 - y0) * i / 6);
    ptr(document, 'pointerup', x0, y1);
    await T.until(function () { return /pull back/.test(chipText()); }, 'the pull-back hint', 60, 100);
    add('P1', 'a marquee over wk 14-17 selects them; the hint says "Double click to pull back cells"',
      chipText() === 'Double click to pull back cells', {chip: chipText()}, 'Double click to pull back cells');

    var c15 = centre(wr(15));
    await dblAt(c15.x, c15.y);
    await T.until(function () { return wr(15) && wr(15).colSpan === 1; }, 'the pull-back to land', 40, 100);
    add('P2', "a double-click on wk 15's centre (the column handle) pulls all four back; no column width moved",
      spans(13, 20) === '13:1 14:1 15:1 16:1 17:1 18:2 19:2 20:2' && cols() === cols0 && chipText() === 'Double click to expand cells',
      {spans: spans(13, 20), colsSame: cols() === cols0, chip: chipText()}, '14-17 :1, 18-20 :2, widths unchanged, hint "expand"');

    // Its own centre now: the old centre is the boundary at its right edge, which is the column's handle.
    var n15 = centre(wr(15));
    await dblAt(n15.x, n15.y);
    await T.until(function () { return wr(15) && wr(15).colSpan === 2; }, 'the expand to land', 40, 100);
    add('P3', "a double-click on the narrowed cell's centre expands the four again", spans(13, 20) === start && cols() === cols0,
      {spans: spans(13, 20)}, start);

    await undo(); var u1 = spans(13, 20);
    await undo(); var u2 = spans(13, 20), more = undoOn();
    add('P4', 'each was one undo step: undo -> pulled back, undo -> as loaded, nothing left to undo',
      u1 === '13:1 14:1 15:1 16:1 17:1 18:2 19:2 20:2' && u2 === start && !more, {afterOne: u1, afterTwo: u2, undoStillOn: more}, 'two steps exactly');

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(200);
    await show(wr(18));
    var c18 = centre(wr(18)), t18 = top(c18.x, c18.y);
    await dblAt(c18.x, c18.y);
    await T.until(function () { return wr(18) && wr(18).colSpan === 1; }, 'the one-cell pull-back', 40, 100);
    add('P5', "nothing selected: a double-click on wk 18's centre pulls back that one cell and selects nothing",
      !!t18 && t18.classList.contains('is-col') && spans(13, 20) === '13:1 14:2 15:2 16:2 17:2 18:1 19:2 20:2' && selShown() === 0 && cols() === cols0,
      {top: t18 && t18.className, spans: spans(13, 20), sel: selShown(), colsSame: cols() === cols0}, '18 :1 only, no selection');
    await undo();

    // P6: the frozen column drag saves a width on ANY move, so a press that drifts 1.4px pins the column. The
    // double-click must put it back, and leave one undo step (the pull-back), not two.
    await show(wr(19));
    var c19 = centre(wr(19)), sawDrift = false;
    var el19 = top(c19.x, c19.y);
    ptr(el19, 'pointerdown', c19.x, c19.y); ptr(document, 'pointermove', c19.x + 1.4, c19.y); ptr(document, 'pointerup', c19.x + 1.4, c19.y);
    el19.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true, clientX: c19.x, clientY: c19.y, button: 0, detail: 1}));
    await T.sleep(40);
    sawDrift = cols() !== cols0;
    var el19b = top(c19.x, c19.y);
    ptr(el19b, 'pointerdown', c19.x, c19.y); ptr(document, 'pointerup', c19.x, c19.y);
    el19b.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, composed: true, clientX: c19.x, clientY: c19.y, button: 0, detail: 2}));
    top(c19.x, c19.y).dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, composed: true, clientX: c19.x, clientY: c19.y, button: 0, detail: 2}));
    await T.sleep(700);   // past the 500 ms undo debounce the drift's own markDirty armed
    var p6 = spans(13, 20), p6cols = cols() === cols0;
    await undo();
    var p6u = spans(13, 20), p6more = undoOn();
    add('P6', "a press that drifts the boundary 1.4px: the double-click still pulls wk 19 back, the width is put back, one undo step",
      sawDrift && p6 === '13:1 14:2 15:2 16:2 17:2 18:2 19:1 20:2' && p6cols && p6u === start && cols() === cols0 && !p6more,
      {driftWroteAWidth: sawDrift, spans: p6, colsSame: p6cols, afterUndo: p6u, undoStillOn: p6more}, 'drift written, then put back; one step');

    // P7: wk 13's right edge is the same y2031:s0 boundary, a real edge there. Drag it 40px, then double-click it
    // there: the frozen autofit refits it and no cell changes.
    await show(wr(13));
    var r13 = wr(13).getBoundingClientRect(), y13 = r13.top + r13.height / 2;
    var h = Array.prototype.find.call(document.elementsFromPoint(r13.right, y13), function (e) { return e.classList && e.classList.contains('is-col'); });
    var ckey = h && h.dataset.ckey;
    ptr(h, 'pointerdown', r13.right, y13); ptr(document, 'pointermove', r13.right + 40, y13); ptr(document, 'pointerup', r13.right + 40, y13);
    await T.sleep(1000);   // a separate gesture: outside the double-click window
    var dragged = cols() !== cols0;
    h = Array.prototype.find.call(document.querySelectorAll('#table-wrap .grid-resize.is-col'), function (e) { return e.dataset.ckey === ckey; });
    var hb = h.getBoundingClientRect(), hx = (hb.left + hb.right) / 2, before7 = spans(13, 20) + ' ' + cell('Pilot Cut wk 9').colSpan;
    await dblAt(hx, y13);
    var after7 = spans(13, 20) + ' ' + cell('Pilot Cut wk 9').colSpan;
    add('P7', "a boundary that is a real cell edge (wk 13 | Pilot Cut wk 9) keeps the column autofit; no cell moves",
      ckey === 'y2031:s0' && dragged && cols() === cols0 && after7 === before7,
      {ckey: ckey, dragged: dragged, refit: cols() === cols0, before: before7, after: after7}, 'y2031:s0 dragged then refit, cells unchanged');

    var bible = cell('Bible wk 13');
    await show(bible);
    var rb = bible.getBoundingClientRect(), yb = rb.top + rb.height / 2;
    var inner = Array.prototype.map.call(document.querySelectorAll('#table-wrap .grid-resize.is-col'), function (e) { var q = e.getBoundingClientRect(); return (q.left + q.right) / 2; })
      .filter(function (x) { return x > rb.left + 7 && x < rb.right - 7; });
    var cs0 = bible.colSpan;
    if (inner.length > 1) await dblAt(inner[1], yb);
    add('P8', 'a three-column cell (Bible wk 13): a double-click on its second inner boundary pulls it back',
      cs0 === 3 && inner.length === 2 && cell('Bible wk 13').colSpan === 1, {before: cs0, inner: inner.length, after: cell('Bible wk 13').colSpan}, '3 -> 1');
    await undo();

    // P9 (owner, 5 Nov 2026, after P0-P8 shipped: "i tried highlighing a bunch of expanced cells and double clicking
    // and it only pulled back the cell my cursor was on"). Bible wk 13-16 own the RIGHT of their three columns; a
    // sweep down their left third touched no own column, so it selected nothing (the text highlight still outlined
    // all four) and the double-click pulled back one. Now it selects the cells it touches.
    function bibles() { var o = []; for (var n = 13; n <= 16; n++) { var c = cell('Bible wk ' + n); o.push(c ? c.colSpan : '?'); } return o.join(''); }
    async function sweep(x, ya, yb2) {
      ptr(top(x, ya), 'pointerdown', x, ya);
      for (var s = 1; s <= 6; s++) ptr(document, 'pointermove', x, ya + (yb2 - ya) * s / 6);
      ptr(document, 'pointerup', x, yb2);
      await T.sleep(200);
    }
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(150);
    await show(cell('Bible wk 14'));
    var b13 = cell('Bible wk 13').getBoundingClientRect(), b16 = cell('Bible wk 16').getBoundingClientRect();
    var xl = b13.left + b13.width / 6, before9 = bibles();
    await sweep(xl, b13.top + b13.height / 2, b16.top + b16.height / 2);
    var chip9 = chipText();
    var b14 = cell('Bible wk 14').getBoundingClientRect(), y14 = b14.top + b14.height / 2;
    var in14 = Array.prototype.map.call(document.querySelectorAll('#table-wrap .grid-resize.is-col'), function (e) { var q = e.getBoundingClientRect(); return (q.left + q.right) / 2; })
      .filter(function (x) { return x > b14.left + 7 && x < b14.right - 7; });
    if (in14.length) await dblAt(in14[0], y14);
    await T.until(function () { return bibles() !== before9; }, 'the sweep pull-back', 30, 100).catch(function () {});
    add('P9', "a sweep down the expanded part of Bible wk 13-16 (no own column touched) selects all four; a double-click pulls all four back",
      before9 === '3333' && chip9 === 'Double click to pull back cells' && bibles() === '1111',
      {before: before9, chip: chip9, after: bibles()}, '3333, the pull-back hint, then 1111');
    await undo();

    // P10: the owner's 1 Sep 2026 rule holds: a sweep down column one that DOES touch own columns (Writer's Rm wk
    // 18-20) selects only those, never the full-width Bible cells straddling the same column below them.
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(150);
    await show(wr(20));
    var w18 = wr(18).getBoundingClientRect(), b16b = cell('Bible wk 16').getBoundingClientRect();
    await sweep(w18.left + w18.width / 6, w18.top + w18.height / 2, b16b.top + b16b.height / 2);
    var chip10 = chipText();
    var c19 = centre(wr(19));
    await dblAt(c19.x, c19.y);
    await T.sleep(200);
    add('P10', "a sweep down column one from Writer's Rm wk 18 into the Bible rows selects only Writer's Rm wk 18-20 (the own-column rule)",
      chip10 === 'Double click to pull back cells' && spans(18, 20) === '18:1 19:1 20:1' && bibles() === '3333',
      {chip: chip10, writers: spans(18, 20), bible: bibles()}, "Writer's 18-20 pulled back, Bible 13-16 untouched");

    var errs = T.appHealth().errors;
    add('E0', '0 console errors', errs.length === 0, {errors: errs.slice(0, 5)}, 'none');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'centrepullback', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
