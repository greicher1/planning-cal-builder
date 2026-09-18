// monthdragundo -- one body-drag of a month-view phase pill is ONE undo step.
//
// ⛔ WHY THIS LEG EXISTS. The gesture writes `start-<key>` and calls update() on every increment,
// and update() calls markDirty() -> scheduleUndoPush(), which CLEARS AND RE-ARMS a 500ms timer
// (UNDO_DEBOUNCE_MS). Hold the button still for longer than that -- which is what aiming at a
// target looks like -- and the timer fires MID-GESTURE, banking an intermediate date the user
// never chose. One Cmd+Z then lands on that intermediate date instead of where the drag began.
//
// Every OTHER continuous gesture in the app is immune for free, and the contrast is the point:
// installGridResizers and beginSpanDrag mutate only PRESENTATION while dragging (col.style.width,
// tr.style.height) and write their store once, in onUp -- so markDirty() runs exactly once. This
// gesture cannot do that, because a phase's start date IS the state and moving it is the whole
// preview, so it has to cancel the pending push on each step and bank its own on release.
//
// ⭐ THE PAUSE IS THE TEST, and virtual time makes it deterministic rather than flaky. Under
// --virtual-time-budget the clock jumps forward as soon as the task queue drains, so the sleep()
// between the two moves reliably takes the 500ms timer past its deadline. Against the unfixed
// build this leg fails every run; it is not a race.
//
// ⚠️ WHAT IT DOES NOT PROVE. Synthetic MouseEvents exercise the handlers, not real hit-testing or
// pointer capture -- HANDOFF.md records a shipped regression that was invisible to exactly this
// kind of driving. This asserts the UNDO CONTRACT only. That the pill is reachable by a real
// pointer is a separate claim and needs a real pointer.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 10;
    }, 'the waterfall grid', 200, 100);

    // The drag listener is guarded on viewMode, so it only binds in the month view.
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('.mv-daygrid'); },
                  'the month grid', 200, 100);

    // Let the fixture's own debounced pushes land and bank themselves. Without this the drag's
    // step could not be told apart from the setup's -- the mistake PROJECT-CONTEXT §11 calls the
    // single most expensive one made in this project's testing.
    await T.sleep(1500);

    // Whichever phase happens to have a pill in the month on screen. Naming one would couple the
    // test to which month the view opens on, which is not what is under test.
    var pill = document.querySelector('.mv-pill[data-ph]');
    if (!pill) throw new Error('no .mv-pill[data-ph] in the month view');
    var key = pill.getAttribute('data-ph');
    var startEl = document.getElementById('start-' + key);
    if (!startEl) throw new Error('no #start-' + key);

    out.phase = key;
    out.before = startEl.value;
    out.snapped = !!(document.getElementById('snap-' + key) || {}).checked;

    var dayW = document.querySelector('.mv-daycell').getBoundingClientRect().width;
    var r = pill.getBoundingClientRect();
    var x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);

    // ⛔ buttons:1 is load-bearing. The handler treats a move with the primary button released as a
    // mouseup it never saw (a release outside the window), so a move dispatched without it ends the
    // drag immediately and the test would pass vacuously.
    function move(dx) {
      window.dispatchEvent(new MouseEvent('mousemove', {
        clientX: x + dx, clientY: y, button: 0, buttons: 1, bubbles: true, cancelable: true
      }));
    }

    pill.dispatchEvent(new MouseEvent('mousedown', {
      clientX: x, clientY: y, button: 0, buttons: 1, bubbles: true, cancelable: true
    }));

    move(Math.round(dayW * 7));            // +7 days
    await T.sleep(1500);                   // <- the pause the old code banks a step inside
    out.midDrag = startEl.value;
    move(Math.round(dayW * 14));           // +14 days
    await T.sleep(200);
    out.afterMoves = startEl.value;

    window.dispatchEvent(new MouseEvent('mouseup', {
      clientX: x + Math.round(dayW * 14), clientY: y, button: 0, buttons: 0, bubbles: true
    }));
    await T.sleep(1500);                   // let the trailing push and any debounce settle
    out.afterDrag = startEl.value;
    out.moved = out.afterDrag !== out.before;

    // ⭐ THE ASSERTION. One undo must return to where the drag STARTED. Against the unfixed build
    // this lands on midDrag instead -- a date the user passed through but never chose.
    var undo = document.getElementById('undo-btn');
    out.undoPresent = !!undo;
    out.undoDisabled = !!(undo && (undo.disabled || undo.getAttribute('data-disabled') !== null));
    if (undo) undo.click();
    await T.sleep(1200);
    out.afterUndo1 = startEl.value;
    out.oneStep = (out.afterUndo1 === out.before);

    out.errors = (window.__errors || []).slice(0, 5);
    out.health = T.appHealth ? T.appHealth() : null;
  } catch (e) { out.EX = e.message; }
  T.done(out);
})(); });
