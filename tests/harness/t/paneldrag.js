// paneldrag -- the Shift and Build Around panels can be dragged anywhere and stay open while the grid is used
// (owner, 11 Nov 2026: "shift popup covers the waterfall which can be annoying when you're trying to reference it";
// then "lets do 1+2 where it pops up like normal but you can drag it whereever you want. no put back button", and
// "keep it open").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=anchorside ./run.sh paneldrag 300
//
//   O1  Shift opens under its button as it always did: absolute, not floating, its right edge on the button group's
//   H1  the title row holds the grip, the hint and a close, and nothing else: no Put back, no `title`, and no id
//       but the hint's own (Mantine mints one for the existing InfoHint trigger)
//   D1  a drag by the title row floats the panel (position:fixed) where it is dropped, over the sidebar if dropped there
//   S1  a click on a grid cell and a scroll of the grid leave it open
//   R1  1 wk → while it is open: its Production row quotes the new date; Undo: the old one again
//   C1  the ✕ closes it; reopened, it drops down under its button again (a drag lasts only until it closes)
//   K1  Escape with focus on a sidebar field (someone else's key) leaves it open; Escape with nothing focused closes it
//   B1  Build Around: opening it closes Shift; it drags the same, and a drag far off screen keeps it on screen
//   E0  0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function rect(el){ var r = el.getBoundingClientRect(); return {left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom)}; }
  function isOpen(m){ return m.classList.contains('open'); }
  function prodDate(){
    var r = Array.prototype.filter.call($('pop-shift').querySelectorAll('.solve-row'), function (x) {
      var n = x.querySelector('.solve-nm'); return n && n.textContent.trim() === 'Production';
    })[0];
    var d = r && r.querySelector('.solve-dt'); return d ? d.textContent.trim() : '';
  }
  // A drag by the title row, as pointer events on the row (the engine listens there and captures the pointer).
  async function drag(menu, toX, toY){
    var head = menu.querySelector('.tools-head'), r = head.getBoundingClientRect();
    var x0 = r.left + 60, y0 = r.top + r.height / 2;
    function ev(type, x, y){ head.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 7, clientX: x, clientY: y})); }
    ev('pointerdown', x0, y0); await T.sleep(30);
    ev('pointermove', (x0 + toX) / 2, (y0 + toY) / 2); await T.sleep(30);
    ev('pointermove', toX, toY); await T.sleep(30);
    ev('pointerup', toX, toY); await T.sleep(80);
    return {dx: toX - x0, dy: toY - y0};
  }
  try {
    await T.appReady(); await T.sleep(800);
    if($('view-sheet-btn')) $('view-sheet-btn').click();
    await T.sleep(900);
    var shift = $('pop-shift'), solve = $('pop-solve');
    T.closePops(); await T.sleep(150);

    $('pop-shift-btn').click(); await T.sleep(400);
    var home = rect(shift), grp = rect($('shift-group'));
    add('O1', 'Shift opens under its button as before: absolute, not floating, right edge on the button group\'s, below it',
      isOpen(shift) && getComputedStyle(shift).position === 'absolute' && !shift.classList.contains('is-floating')
        && Math.abs(home.right - grp.right) <= 1 && home.top > grp.bottom,
      {open: isOpen(shift), pos: getComputedStyle(shift).position, home: home, group: grp}, 'open, absolute, right edges equal, top below the group');

    var head = shift.querySelector('.tools-head');
    var headBtns = Array.prototype.map.call(head.querySelectorAll('button'), function (b) { return b.getAttribute('aria-label') || b.textContent.trim(); });
    add('H1', 'the title row holds the grip, the hint and a close, nothing else: no Put back, no id, no title attribute',
      !!head.querySelector('.tools-grip') && headBtns.join('|') === 'About Shift|Close' && !head.querySelector('[id]:not(.info-hint)')
        && !head.querySelector('[title]') && !document.querySelector('[data-tools-putback], .tools-putback')
        && getComputedStyle(head).cursor === 'grab',
      {buttons: headBtns, ids: head.querySelectorAll('[id]:not(.info-hint)').length, titles: head.querySelectorAll('[title]').length, cursor: getComputedStyle(head).cursor},
      'About Shift|Close, no ids, no titles, cursor grab');

    var side = $('sidebar') || document.querySelector('.sidebar, aside');
    var sideR = side ? rect(side) : {left: 0, right: 300};
    var mv = await drag(shift, sideR.left + 120, 420);
    var dropped = rect(shift);
    add('D1', 'a drag by the title row floats it (position:fixed) where it is dropped: over the sidebar, moved by exactly the drag',
      shift.classList.contains('is-floating') && getComputedStyle(shift).position === 'fixed'
        && Math.abs(dropped.left - (home.left + mv.dx)) <= 1 && Math.abs(dropped.top - (home.top + mv.dy)) <= 1
        && dropped.left < sideR.right && isOpen(shift),
      {dropped: dropped, expected: {left: home.left + mv.dx, top: home.top + mv.dy}, sidebarRight: sideR.right, pos: getComputedStyle(shift).position},
      'fixed, at home + the drag, left of the sidebar\'s right edge');

    var cell = document.querySelector('#table-wrap td');
    cell.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
    cell.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, cancelable: true, button: 0}));
    cell.click(); await T.sleep(200);
    var sc = document.querySelector('.sheet-scroll'); if(sc){ sc.scrollTop = 200; sc.dispatchEvent(new Event('scroll')); }
    await T.sleep(200);
    add('S1', 'a click on a grid cell and a scroll of the grid leave it open, where it was dropped',
      isOpen(shift) && JSON.stringify(rect(shift)) === JSON.stringify(dropped),
      {open: isOpen(shift), at: rect(shift)}, 'open, unmoved');

    var d0 = prodDate();
    $('shift-fwd-btn').click(); await T.sleep(900);
    var d1 = prodDate();
    $('undo-btn').click(); await T.sleep(900);
    var d2 = prodDate();
    add('R1', 'while it is open, 1 wk → refreshes its rows (Production a week later) and Undo brings the old date back',
      d0 === '6/29/26' && d1 === '7/6/26' && d2 === '6/29/26' && isOpen(shift),
      {before: d0, afterShift: d1, afterUndo: d2, open: isOpen(shift)}, '6/29/26, 7/6/26, 6/29/26, open');

    shift.querySelector('[data-tools-close]').click(); await T.sleep(150);
    var closed = !isOpen(shift);
    $('pop-shift-btn').click(); await T.sleep(400);
    var again = rect(shift);
    add('C1', 'the ✕ closes it; reopened, it drops down under its button again, not where it was dragged',
      closed && isOpen(shift) && !shift.classList.contains('is-floating') && JSON.stringify(again) === JSON.stringify(home),
      {closed: closed, reopened: again, home: home, floating: shift.classList.contains('is-floating')}, 'closed, then open at home');

    // A visible field outside the panels (a hidden one cannot take focus, and Escape would then be nobody's).
    var field = Array.prototype.filter.call(document.querySelectorAll('input:not([type=checkbox]):not([type=radio])'), function (i) {
      return i.offsetParent && !i.closest('.tools-menu');
    })[0];
    field.focus();
    field.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(100);
    var keptOpen = isOpen(shift);
    field.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(100);
    add('K1', 'Escape from a sidebar field is that field\'s and leaves the panel open; Escape with nothing focused closes it',
      keptOpen && !isOpen(shift), {afterFieldEsc: keptOpen, afterBodyEsc: isOpen(shift), field: field.id || field.className}, 'open, then closed');

    $('pop-shift-btn').click(); await T.sleep(300);
    $('pop-solve-btn').click(); await T.sleep(500);
    var sOpen = isOpen(solve), shClosed = !isOpen(shift);
    await drag(solve, window.innerWidth + 900, window.innerHeight + 900);
    var off = rect(solve);
    add('B1', 'Build Around: opening it closes Shift; it floats on a drag, and a drag far off screen keeps the whole panel on screen',
      sOpen && shClosed && solve.classList.contains('is-floating') && !!solve.querySelector('.tools-grip')
        && off.right <= window.innerWidth && off.bottom <= window.innerHeight && off.left >= 0 && off.top >= 0,
      {solveOpen: sOpen, shiftClosed: shClosed, at: off, vw: window.innerWidth, vh: window.innerHeight}, 'inside the window');
    T.closePops(); await T.sleep(150);

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'paneldrag', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
