// pinchzoom -- pinch, Ctrl-scroll and the zoom keys zoom the CALENDAR, never the app (owner, 18 Nov 2026: "Allow
// trackpad pinch and related mouse zoom buttons to control the viewport of the waterfall and month view rather than
// just zooming in the entire UI of the app"). app.js, "PINCH, CTRL-SCROLL AND THE ZOOM KEYS".
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh pinchzoom 300
//
// Chrome sends a trackpad pinch as `wheel` events with ctrlKey and small deltas, Ctrl + a mouse wheel the same with a
// notch's ~100 px. These are synthetic events, so the leg cannot see Chrome's own page zoom refused; it reads the
// cancel (defaultPrevented), which is what stops it.
// P  the pinch: cancelled, zooms the calendar, has what was under the pointer back under it by the gesture's end
//    (1.5 px) in both views,
//    leaves a plain scroll alone, and never zooms past the slider's range.
// N  a mouse notch: one button step (100% to 110%), both ways.
// K  the keys: ⌘+ / ⌘- (Ctrl off a Mac) cancelled and stepped; ⌘0 back to 100% and NOT cancelled (Chrome puts the app
//    back too); with Alt nothing.
// D  a dialog over the calendar: the pinch is still cancelled, and nothing zooms.
// F  a zoom is not an edit: no dirty mark, no undo step; no console error.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'pinchzoom'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  var tw = function(){ return $('table-wrap'); };
  function zoom(){ return parseFloat(tw().style.zoom) || 1; }
  function mac(){ return /Mac/i.test(navigator.platform || ''); }
  function wheel(dy, x, y, ctrl){
    var e = new WheelEvent('wheel', {ctrlKey: ctrl !== false, deltaY: dy, clientX: x, clientY: y, cancelable: true, bubbles: true});
    (document.elementFromPoint(x, y) || document.body).dispatchEvent(e);
    return e.defaultPrevented;
  }
  function key(k, extra){
    var o = {key: k, cancelable: true, bubbles: true};
    if(mac()) o.metaKey = true; else o.ctrlKey = true;
    Object.assign(o, extra || {});
    var e = new KeyboardEvent('keydown', o);
    document.body.dispatchEvent(e);
    return e.defaultPrevented;
  }
  async function zoomTo(z){ document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: z}})); await T.sleep(400); }
  // Pinches at a point inside the scroll box and reports how far what was under the pointer drifted from it.
  async function pinch(box, steps, dy){
    var r = box.getBoundingClientRect();
    var cx = Math.round(Math.min(r.left + 300, innerWidth - 60)), cy = Math.round(Math.min(r.top + 220, innerHeight - 80));
    var el = document.elementFromPoint(cx, cy), b = el.getBoundingClientRect();
    var fx = (cx - b.left) / b.width, fy = (cy - b.top) / b.height, worst = 0, cancelled = true;
    for(var i = 0; i < steps; i++){
      cancelled = wheel(dy, cx, cy) && cancelled;
      var a = el.getBoundingClientRect();
      worst = Math.max(worst, Math.abs(a.left + fx * a.width - cx), Math.abs(a.top + fy * a.height - cy));
    }
    // Where the box has no room to scroll yet (a window wider than the page at 100%) what is under the pointer slides
    // off it for a few steps; the pinch holds the point it started on, so it is back under the pointer by the end.
    var e = el.getBoundingClientRect();
    var end = Math.max(Math.abs(e.left + fx * e.width - cx), Math.abs(e.top + fy * e.height - cy));
    await T.sleep(400);
    return {worst: Math.round(end * 10) / 10, during: Math.round(worst * 10) / 10, cancelled: cancelled, on: el.tagName + '.' + el.className};
  }
  try {
    await T.until(function(){ return tw() && tw().querySelector('.mv-body') && document.querySelector('.cal-zoom'); }, 'the month view and the zoom control', 150, 100);
    await zoomTo(1);
    var dirty0 = document.title, undo0 = $('undo-btn') ? $('undo-btn').disabled : null;

    // ---- the month view (the fixture opens in it) ----
    var p = await pinch(tw(), 20, -4);
    out.monthIn = {zoom: zoom(), p: p};
    check(p.cancelled && zoom() > 1.5, 'P1 a pinch out in the month view is cancelled and zooms the calendar in (' + zoom() + ')');
    check(p.worst <= 1.5, 'P2 what is under the pointer stays under it in the month view (' + p.worst + ' px off, on ' + p.on + ')');
    p = await pinch(tw(), 10, 4);
    check(p.worst <= 1.5 && zoom() < out.monthIn.zoom, 'P3 pinching in again zooms out about the same point (' + zoom() + ', ' + p.worst + ' px)');
    for(var i = 0; i < 200; i++) wheel(-8, 500, 400);
    await T.sleep(400);
    check(zoom() === 2, 'P4 never past the slider\'s 200% (' + zoom() + ')');
    for(i = 0; i < 400; i++) wheel(8, 500, 400);
    await T.sleep(400);
    check(zoom() === 0.25, 'P5 never under the slider\'s 25% (' + zoom() + ')');
    await zoomTo(1);
    check(!wheel(100, 500, 400, false) && zoom() === 1, 'P6 a plain scroll (no Ctrl) is not cancelled and zooms nothing');

    // ---- a mouse notch ----
    check(wheel(-100, 500, 400) && zoom() === 1.1, 'N1 a Ctrl + wheel notch up is one button step, 100% to 110% (' + zoom() + ')');
    wheel(100, 500, 400); wheel(100, 500, 400);
    check(zoom() === 0.9, 'N2 two notches down, 110% to 90% (' + zoom() + ')');
    await zoomTo(1);

    // ---- the keys ----
    check(key('=') && zoom() === 1.1, 'K1 ' + (mac() ? '⌘' : 'Ctrl') + '+ (=) is cancelled and steps in (' + zoom() + ')');
    check(key('+') && zoom() === 1.2, 'K2 the shifted + steps in too (' + zoom() + ')');
    check(key('-') && zoom() === 1.1, 'K3 - is cancelled and steps out (' + zoom() + ')');
    check(!key('0') && zoom() === 1, 'K4 0 puts the calendar back to 100% and is NOT cancelled, so Chrome resets the app too (' + zoom() + ')');
    check(!key('=', {altKey: true}) && zoom() === 1, 'K5 with Alt held nothing happens');

    // ---- the waterfall ----
    $('view-sheet-btn').click();
    await T.until(function(){ return tw().querySelector(':scope > .sheet-scroll'); }, 'the waterfall', 100, 100);
    await T.sleep(300);
    await zoomTo(1);
    var sc = tw().querySelector(':scope > .sheet-scroll');
    sc.scrollTop = 300;
    p = await pinch(sc, 25, -4);
    check(p.cancelled && zoom() > 1.5, 'P7 a pinch in the waterfall zooms its calendar (' + zoom() + ')');
    check(p.worst <= 1.5, 'P8 what is under the pointer stays under it in the waterfall (' + p.worst + ' px off, on ' + p.on + ')');
    // Only while the grid is still wider than its box: zoomed out until it fits, it sits on the box's left edge, as at
    // 100%, and nothing can hold a point right of that.
    p = await pinch(tw().querySelector(':scope > .sheet-scroll'), 6, 4);
    check(p.worst <= 1.5, 'P9 and back out (' + zoom() + ', ' + p.worst + ' px)');
    await zoomTo(1);

    // ---- a dialog over it ----
    // appDialogOpen()'s own test is the selector; a stand-in overlay is enough to hold the rule.
    var ov = document.createElement('div'); ov.className = 'paste-notes-overlay'; document.body.appendChild(ov);
    check(wheel(-20, 500, 400) && key('=') && zoom() === 1, 'D1 with a dialog up the pinch and the keys are cancelled and nothing zooms (' + zoom() + ')');
    ov.remove();

    check(document.title === dirty0, 'F1 a zoom is not an edit: the title carries no unsaved mark');
    if(undo0 !== null) check($('undo-btn').disabled === undo0, 'F2 no undo step');
  } catch(e){
    out.EX = String(e && e.stack || e);
  }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  check(!errs.length, 'F3 no console error or warning (' + errs.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
