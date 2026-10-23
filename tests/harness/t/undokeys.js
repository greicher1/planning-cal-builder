// undokeys -- ⌘Z and ⇧⌘Z after every kind of edit, and a view switch is not an undo step (owner, 22 Oct 2026).
// A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh undokeys 240
//
// The owner asked "Does command z and command shift z works for EVERYTHING?", and two gaps were found with
// real key presses in the pane. Then, mid-fix: "also command z should not count switching between views as an
// undo step".
//
//   * The keydown handler left ⌘Z to the focused element whenever it was an <input>, which also matched a
//     CHECKBOX or SWITCH (Chrome leaves focus on one after a click) and a DATE box (Chrome keeps no undo
//     history for one: document.execCommand('undo') returns false in it). ⌘Z right after ticking a phase's
//     Hiatus box, flipping Single Column Mode, or typing a start date did nothing at all.
//   * The grid's drags cancel their pointerdown, so the browser never moves focus: after typing a title and
//     dragging a column, the cursor was still in the title and ⌘Z went to the title. The drag stayed.
//   * viewMode is in captureSnapshot(), so a view switch was its own undo step: ⌘Z after a switch just
//     switched back, and the switch wiped the redo history.
//
//   K1  a phase's Hiatus box, focused after its click: ⌘Z unticks it, ⇧⌘Z ticks it again (both prevented)
//   K2  Settings ▸ Single Column Mode, a switch, focused after its click: ⌘Z turns it off, ⇧⌘Z on
//   K3  a start date typed into its date box, focus still there: ⌘Z puts the old date back, ⇧⌘Z the new one
//   K4  title typed, then a column dragged with the cursor still in the title: ⌘Z undoes the drag and keeps
//       the title; ⇧⌘Z redoes the drag
//   K5  after K4, a click back IN the title gives it the keys back (⌘Z not prevented)
//   K6  a grid press, then typing in the title: the title has the keys again (⌘Z not prevented)
//   K7  a view switch is no undo step: ⌘Z in the Month view undoes the last edit and stays in the Month
//       view; back in the Waterfall, ⇧⌘Z still redoes it (the switches left the redo history alone)
//   X1  KEPT: typing in a text box with no press elsewhere, ⌘Z is left to the box (not prevented, no undo)
//   X2  KEPT: a press OUTSIDE the calendar (a sidebar card) does not take the keys from the box
//   X3  KEPT: the saved calendar still records its view (the crash backup's viewMode is 'month')
//   E0  0 console errors
//
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots: X3 reads the crash backup,
// and real IndexedDB never settles in headless Chrome.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'undokeys', cases: [], observed: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function $(id) { return document.getElementById(id); }
  // A keydown as a keyboard makes it: sent to whatever has focus, so it bubbles to the document. A held
  // Shift reports the capital letter.
  function press(key, mods) {
    mods = mods || {};
    var e = new KeyboardEvent('keydown', { key: mods.shift ? key.toUpperCase() : key, code: 'Key' + key.toUpperCase(),
      bubbles: true, cancelable: true, metaKey: true, shiftKey: !!mods.shift });
    (document.activeElement || document).dispatchEvent(e);
    return e.defaultPrevented;
  }
  function blur() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  function ptr(t, el, x, y, b) {
    el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, composed: true,
      clientX: x, clientY: y, button: 0, buttons: b, pointerId: 9, pointerType: 'mouse', isPrimary: true }));
  }
  function widths() { return [].map.call(document.querySelectorAll('table.sheet-table colgroup col'), function (c) { return c.style.width; }).join(','); }
  function view() { return document.querySelector('#table-wrap .mv-daygrid') ? 'month' : document.querySelector('#table-wrap table.sheet-table') ? 'sheet' : '?'; }
  function redoOn() { var b = $('redo-btn'); return !!b && !b.hasAttribute('data-disabled') && !b.disabled; }
  function focused(el) { return document.activeElement === el; }
  async function settle() {
    var last = '', same = 0;
    await T.until(function () { var s = view() + ':' + document.querySelectorAll('#table-wrap *').length; same = s === last ? same + 1 : 0; last = s; return same >= 4; }, 'the calendar to settle', 150, 100);
  }
  async function toView(v) { $('view-' + v + '-btn').click(); await settle(); await T.sleep(900); }

  try {
    await T.appReady();
    T.buildFixture();
    await settle();
    await T.sleep(900);

    // ---- X1: a text box keeps ⌘Z for its own typing ---------------------------------------------------
    var st = $('show-title');
    blur();
    st.focus();
    T.set('show-title', 'Typed title');
    await T.sleep(900);
    var x1 = { focused: focused(st), prevented: press('z') };
    await T.sleep(400);
    x1.title = st.value;
    kase('X1', 'KEPT: typing in a text box with no press elsewhere, ⌘Z is left to the box (not prevented, no app undo)',
         x1.focused && x1.prevented === false && x1.title === 'Typed title', { observed: x1 });

    // ---- X2: a press on the sidebar, outside the calendar, leaves the box its keys ----------------------
    var card = st.closest('section.card') || st.parentNode;
    ptr('pointerdown', card, 5, 5, 1); ptr('pointerup', card, 5, 5, 0);
    var x2 = { focused: focused(st), prevented: press('z') };
    await T.sleep(400);
    x2.title = st.value;
    kase('X2', 'KEPT: a press outside the calendar (a sidebar card) leaves ⌘Z with the focused text box',
         x2.focused && x2.prevented === false && x2.title === 'Typed title', { observed: x2 });

    // ---- K4: title typed, then a column dragged with the cursor still in it ---------------------------
    var h = document.querySelectorAll('.grid-resize.is-col')[1];
    var k4 = { handle: !!h, title0: st.value, w0: widths() };
    if (h) {
      var r = h.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + 40);
      ptr('pointerdown', h, x, y, 1); await T.sleep(50);
      ptr('pointermove', document, x + 60, y, 1); await T.sleep(70);
      ptr('pointerup', document, x + 60, y, 0); await T.sleep(900);
    }
    k4.w1 = widths(); k4.dragged = k4.w1 !== k4.w0; k4.focused = focused(st);
    k4.undo = { prevented: press('z') };
    await T.sleep(600);
    k4.undo.w = widths(); k4.undo.title = st.value;
    k4.redo = { prevented: press('z', { shift: true }) };
    await T.sleep(600);
    k4.redo.w = widths(); k4.redo.title = st.value;
    out.observed.K4 = k4;
    kase('K4', 'title typed, column dragged with the cursor still in the title: ⌘Z undoes the drag and keeps the title, ⇧⌘Z redoes it',
         k4.handle && k4.dragged && k4.focused && k4.undo.prevented && k4.undo.w === k4.w0 && k4.undo.title === 'Typed title' &&
         k4.redo.prevented && k4.redo.w === k4.w1 && k4.redo.title === 'Typed title', { observed: k4 });

    // ---- K5: a click back in the title gives it the keys back -------------------------------------------
    ptr('pointerdown', st, 3, 3, 1); ptr('pointerup', st, 3, 3, 0);
    var k5 = { focused: focused(st), w: widths(), prevented: press('z') };
    await T.sleep(400);
    k5.wAfter = widths();
    kase('K5', 'a click back in the title gives it ⌘Z again (not prevented, the drag stays)',
         k5.focused && k5.prevented === false && k5.wAfter === k5.w, { observed: k5 });

    // ---- K6: a grid press, then typing in the title -----------------------------------------------------
    var cell = document.querySelector('table.sheet-table tbody td');
    ptr('pointerdown', cell, 3, 3, 1); ptr('pointerup', cell, 3, 3, 0);
    var k6 = { focused: focused(st), stalePrevented: null };
    T.set('show-title', 'Typed again');
    await T.sleep(900);
    k6.prevented = press('z');
    await T.sleep(400);
    k6.title = st.value;
    kase('K6', 'a grid press, then typing in the title: the title has ⌘Z again (not prevented)',
         k6.focused && k6.prevented === false && k6.title === 'Typed again', { observed: k6 });
    blur();

    // ---- K1: a phase's Hiatus box -----------------------------------------------------------------------
    $('sidetab-phases').click();
    await T.sleep(300);
    var cb = $('phiatus-en-writersRoom');
    var k1 = { box: !!cb, before: cb && cb.checked };
    if (cb) { cb.focus(); cb.click(); }
    await T.sleep(900);
    k1.ticked = $('phiatus-en-writersRoom').checked; k1.focused = focused($('phiatus-en-writersRoom'));
    k1.undo = { prevented: press('z') };
    await T.sleep(600);
    k1.undo.checked = $('phiatus-en-writersRoom').checked;
    // ⚠️ The undo also put back the sidebar TAB the step was taken on (sidebarTab is in the snapshot), which
    // hides this box. Back to Phases, as a user would click, so the redo is pressed on the box itself.
    $('sidetab-phases').click();
    await T.sleep(300);
    $('phiatus-en-writersRoom').focus();
    k1.redo = { focusedType: (document.activeElement || {}).type, prevented: press('z', { shift: true }) };
    await T.sleep(600);
    k1.redo.checked = $('phiatus-en-writersRoom').checked;
    out.observed.K1 = k1;
    kase('K1', 'a phase’s Hiatus box, focused after its click: ⌘Z unticks it, ⇧⌘Z ticks it again',
         k1.box && k1.before === false && k1.ticked === true && k1.focused &&
         k1.undo.prevented && k1.undo.checked === false && k1.redo.focusedType === 'checkbox' && k1.redo.prevented && k1.redo.checked === true,
         { observed: k1 });
    blur();
    press('z');                                            // back to no hiatus, for what follows
    await T.sleep(600);

    // ---- K2: Settings ▸ Single Column Mode -------------------------------------------------------------
    await T.openSettings('prefs');
    var sw = $('one-col-btn');
    var k2 = { sw: !!sw, before: sw && sw.checked };
    if (sw) { sw.focus(); sw.click(); }
    await settle();
    await T.sleep(900);
    k2.on = $('one-col-btn').checked; k2.focused = focused($('one-col-btn'));
    k2.undo = { prevented: press('z') };
    await settle();
    k2.undo.checked = $('one-col-btn').checked;
    $('one-col-btn').focus();
    k2.redo = { prevented: press('z', { shift: true }) };
    await settle();
    k2.redo.checked = $('one-col-btn').checked;
    out.observed.K2 = k2;
    kase('K2', 'Settings ▸ Single Column Mode, focused after its click: ⌘Z turns it off, ⇧⌘Z turns it on',
         k2.sw && k2.before === false && k2.on === true && k2.focused &&
         k2.undo.prevented && k2.undo.checked === false && k2.redo.prevented && k2.redo.checked === true, { observed: k2 });
    blur();
    press('z');                                            // Single Column off again
    await settle();
    await T.closeSettings();

    // ---- K3: a start date typed into its date box -----------------------------------------------------
    $('sidetab-phases').click();                           // the start dates live on the Phases tab
    await T.sleep(300);
    var d = $('start-post');
    var k3 = { type: d.type, before: d.value };
    d.focus();
    T.set('start-post', '2026-11-09');
    await settle();
    await T.sleep(900);
    // Focus is put back by hand: headless Chrome drops it from a date box once the date is set (in the pane it
    // stays, as it does for a user typing a date). The probe is only a probe with the box focused.
    $('start-post').focus();
    k3.typed = $('start-post').value; k3.focused = focused($('start-post'));
    k3.undo = { prevented: press('z') };
    await settle();
    k3.undo.value = $('start-post').value;
    $('sidetab-phases').click();                           // the undo put the Show tab back (see K1)
    await T.sleep(300);
    $('start-post').focus();
    k3.redo = { focused: focused($('start-post')), prevented: press('z', { shift: true }) };
    await settle();
    k3.redo.value = $('start-post').value;
    out.observed.K3 = k3;
    kase('K3', 'a start date typed into its date box, focus still there: ⌘Z puts the old date back, ⇧⌘Z the new one',
         k3.type === 'date' && k3.before === '2026-11-02' && k3.typed === '2026-11-09' && k3.focused &&
         k3.undo.prevented && k3.undo.value === '2026-11-02' && k3.redo.focused && k3.redo.prevented && k3.redo.value === '2026-11-09',
         { observed: k3 });
    blur();

    // ---- K7: a view switch is no undo step --------------------------------------------------------------
    $('sidetab-show').click();
    await T.sleep(300);
    T.set('show-title', 'Before view');
    await T.sleep(900);
    T.set('show-title', 'After view');
    await T.sleep(900);
    await toView('month');
    var k7 = { inMonth: view() === 'month' };
    k7.undo = { prevented: press('z') };
    await settle();
    k7.undo.title = $('show-title').value; k7.undo.view = view();
    await toView('sheet');
    k7.backInSheet = view() === 'sheet'; k7.redoOnAfterSwitch = redoOn();
    k7.redo = { prevented: press('z', { shift: true }) };
    await settle();
    k7.redo.title = $('show-title').value; k7.redo.view = view();
    out.observed.K7 = k7;
    kase('K7', 'a view switch is no undo step: ⌘Z in the Month view undoes the last edit and stays there; back in the Waterfall ⇧⌘Z still redoes it',
         k7.inMonth && k7.undo.prevented && k7.undo.title === 'Before view' && k7.undo.view === 'month' &&
         k7.backInSheet && k7.redoOnAfterSwitch && k7.redo.prevented && k7.redo.title === 'After view' && k7.redo.view === 'sheet',
         { observed: k7 });

    // ---- X3: the saved calendar still records its view -------------------------------------------------
    await toView('month');
    await T.sleep(3600);                                   // the crash backup is debounced 3 s
    var bk = T.latestBackup();
    var x3 = { backup: !!bk, viewMode: bk && bk.state && bk.state.viewMode };
    kase('X3', 'KEPT: the saved calendar still records its view (the crash backup’s viewMode is month)',
         x3.backup && x3.viewMode === 'month', { observed: x3 });

    out.health = T.appHealth();
    kase('E0', '0 console errors', out.health.errors.length === 0, { observed: out.health.errors });
  } catch (err) {
    out.EX = String(err && err.stack || err);
    kase('EX', 'the leg ran to the end', false, { observed: out.EX });
  }
  T.done(out);
})(); });
