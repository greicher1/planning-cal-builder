// viewclean -- switching between the Waterfall and the Month view is NOT an unsaved change (the Nov 2026 audit's
// item 2.9, AUD2-022; its default, approved by the owner: "switching views does not count as an unsaved change; the
// view is still saved with the next real save").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh viewclean 1500
//
// Before the fix, setViewMode() ran update(), update() called markDirty(), and viewMode is a captureSnapshot() key: a
// file opened only to look at (or export) the other view read "Unsaved changes", armed the browser's leave warning, and
// was rewritten by the 10-minute autosave although nobody had edited it. Paging months never did.
//
// Builds the synthetic calendar, saves it through the harness's stand-in for the OS Save dialog, and Loads it back as a
// LINKED file whose writes are recorded (openViaFakePicker's opts.writes), so the page starts clean, as a just-opened
// file does, with autosave running against it.
//   P0  precondition: right after Load the status is clean, the leave warning is off, Undo is off; the file says Waterfall
//   V1  the Month view: still clean -- no "Unsaved changes", no leave warning, no crash backup, Undo still off
//   V2  back to the Waterfall: the same
//   A1  a whole autosave tick (10 minutes) after a switch to the Month view writes nothing to the file
//   S1  KEPT: Save after that switch writes the view (viewMode 'month') and the Date Last Edited the file already had
//   D1  KEPT: with unsaved work a switch leaves it unsaved (leave warning on), and the next autosave writes the edit
//       WITH the new view -- the positive control that A1's silence is the fix, not an autosave that never runs
//   E0  no console errors
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots: the recents list and the crash backup
// settle only through it (README trap), and V1 / V2 read the backup.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases, observed: {}};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id) { return document.getElementById(id); }
  function status() { return ((byId('save-status') || {}).textContent || '').trim(); }
  // The app's own beforeunload handler calls preventDefault() exactly when it would ask "Leave site?".
  function guard() { var e = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(e); return e.defaultPrevented; }
  function undoOff() { var b = byId('undo-btn'); return !!b && (b.disabled || b.hasAttribute('data-disabled')); }
  function label() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  function view() { return document.querySelector('#table-wrap .mv-daygrid') ? 'month' : document.querySelector('#table-wrap table.sheet-table') ? 'sheet' : '?'; }
  function backupAt() { var b = T.latestBackup(); return b ? b.key + '@' + b.at : null; }
  async function settle() {
    var last = '', same = 0;
    await T.until(function () { var s = view() + ':' + document.querySelectorAll('#table-wrap *').length; same = s === last ? same + 1 : 0; last = s; return same >= 4; }, 'the calendar to settle', 150, 100);
  }
  async function toView(v) {
    byId('view-' + v + '-btn').click();
    await T.until(function () { return view() === v; }, 'the ' + v + ' view', 100, 100);
    await settle();
    await T.sleep(3600);   // past the crash backup's 3 s debounce and the undo push's 500 ms
  }
  var W = [];
  function lastWrite() { return W.length ? JSON.parse(W[W.length - 1].text) : null; }
  function state() { return {status: status(), guard: guard(), undoOff: undoOff(), backup: backupAt(), writes: W.length, view: view()}; }
  try {
    await T.appReady();
    T.buildFixture();
    await settle(); await T.sleep(1500);

    // ---- the first Save, through the picker, then Load it back as a linked file ----------------------------------
    var rec = T.fakeSavePicker(), text0;
    try {
      await T.until(function () { var b = byId('save-file-btn'); return !!b && !b.disabled; }, 'Save', 60, 100);
      byId('save-file-btn').click();
      await T.until(function () { return rec.files.length > 0; }, 'the first Save', 200, 100);
      text0 = new TextDecoder().decode(rec.files[rec.files.length - 1].bytes);
    } finally { rec.restore(); }
    var snap0 = JSON.parse(text0);
    var p = T.openViaFakePicker('/x.sptcal', 'viewclean.sptcal', {text: text0, writes: W});
    for (var g = 0; g < 40; g++) { await T.sleep(100); if (T.clickModalButton('Load') || /viewclean/.test(label())) break; }
    await p;
    await T.until(function () { return /viewclean/.test(label()); }, 'the file to load', 100, 100);
    await settle(); await T.sleep(3600);
    var s0 = state();
    out.observed.P0 = s0;
    add('P0', 'precondition: right after Load the file is clean (no "Unsaved changes", no leave warning, Undo off) and was saved in the Waterfall',
        !/Unsaved/.test(s0.status) && s0.guard === false && s0.undoOff && s0.view === 'sheet' && snap0.viewMode === 'sheet' && !!snap0.lastEdited,
        {state: s0, fileView: snap0.viewMode, fileStamp: snap0.lastEdited || null}, 'clean, sheet, a stamp');

    // ---- V1 / V2: the switch itself -----------------------------------------------------------------------------
    await toView('month');
    var s1 = state();
    out.observed.V1 = s1;
    add('V1', 'the Month view is not an edit: no "Unsaved changes", no leave warning, no crash backup, Undo still off',
        s1.view === 'month' && !/Unsaved/.test(s1.status) && s1.guard === false && s1.backup === s0.backup && s1.undoOff && s1.writes === 0,
        s1, {view: 'month', status: s0.status, guard: false, backup: s0.backup, undoOff: true, writes: 0});

    await toView('sheet');
    var s2 = state();
    out.observed.V2 = s2;
    add('V2', 'back to the Waterfall: still clean, no leave warning, no crash backup, Undo still off',
        s2.view === 'sheet' && !/Unsaved/.test(s2.status) && s2.guard === false && s2.backup === s0.backup && s2.undoOff && s2.writes === 0,
        s2, {view: 'sheet', status: s0.status, guard: false, backup: s0.backup, undoOff: true, writes: 0});

    // ---- A1: a whole autosave tick in the Month view writes nothing ------------------------------------------------
    await toView('month');
    var n1 = W.length;
    await T.sleep(610000);   // AUTOSAVE_MS is 10 minutes; virtual time, fast-forwarded while the page is idle
    var s3 = state();
    out.observed.A1 = s3;
    add('A1', 'a whole autosave tick after a switch to the Month view writes nothing to the file, and it is still clean',
        W.length === n1 && !/Unsaved/.test(s3.status) && s3.guard === false,
        {writesBefore: n1, writesAfter: W.length, status: s3.status, guard: s3.guard}, {writes: n1, clean: true});

    // ---- S1: the view is still saved with the next real save -------------------------------------------------------
    var n2 = W.length;
    await T.sleep(700);
    byId('save-file-btn').click();
    await T.until(function () { return W.length > n2; }, 'the Save write', 100, 100);
    var w1 = lastWrite();
    await T.sleep(800);
    out.observed.S1 = {viewMode: w1.viewMode, lastEdited: w1.lastEdited || null, status: status()};
    add('S1', 'KEPT: Save after the switch writes the view (Month) and the Date Last Edited the file already had',
        w1.viewMode === 'month' && (w1.lastEdited || null) === (snap0.lastEdited || null) && /^Saved/.test(status()),
        out.observed.S1, {viewMode: 'month', lastEdited: snap0.lastEdited || null, status: 'Saved …'});

    // ---- D1: unsaved work stays unsaved across a switch, and autosave writes the view with it ----------------------
    T.set('show-title', 'Viewclean edit');
    await T.sleep(1200);
    var d0 = state();
    await toView('sheet');
    var d1 = state(), n3 = W.length;
    await T.sleep(610000);
    var w2 = lastWrite();
    var d2 = {writes: W.length, status: status(), guard: guard(), viewMode: w2 && w2.viewMode,
              title: w2 && w2.fields && w2.fields.byId && w2.fields.byId['show-title'] && w2.fields.byId['show-title'].value};
    out.observed.D1 = {afterEdit: d0, afterSwitch: d1, afterTick: d2};
    add('D1', 'KEPT: with unsaved work a switch leaves it unsaved (leave warning on), and the next autosave writes the edit with the Waterfall view',
        /Unsaved/.test(d0.status) && /Unsaved/.test(d1.status) && d1.guard === true && d1.view === 'sheet' &&
        W.length > n3 && d2.viewMode === 'sheet' && d2.title === 'Viewclean edit' && !/Unsaved/.test(d2.status) && d2.guard === false,
        out.observed.D1, 'unsaved through the switch; autosave writes viewMode sheet and the new title; then clean');

    out.health = T.appHealth();
    add('E0', 'no console errors', out.health.errors.length === 0, out.health.errors, []);
  } catch (err) {
    out.EX = String(err && err.stack || err);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);
})(); });
