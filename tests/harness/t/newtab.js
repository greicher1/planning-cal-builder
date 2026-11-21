// newtab -- New always opens the sidebar on Show info (owner, 5 Nov 2026: "when you click New the left bar should always
// be on the Show Info tab"). Before, newFile() reset the calendar but left whichever tab was up, Phases usually.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh newtab 120
//
//   N1  on the Phases tab with nothing unsaved, New lands on Show info: its tab selected, its cards shown, Phases' hidden
//   N2  on the Phases tab with unsaved work, New asks first; "Start new" lands on Show info
//   N3  with the Settings window open over the sidebar, New closes it and lands on Show info
//   N4  New starts a fresh undo history whose baseline holds Show: Undo is disabled, and the tab stays Show
//   N5  a positive control: the Phases tab really was up before each New (so N1-N3 could fail)
//   E0  0 console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'newtab', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function byId(id) { return document.getElementById(id); }
  function tabState() {
    var on = Array.from(document.querySelectorAll('.side-tab-btn.active')).map(function (b) { return b.dataset.tab; });
    var shown = Array.from(document.querySelectorAll('.form-panel section.card[data-tab]'))
      .filter(function (s) { return !s.classList.contains('tab-hidden'); })
      .map(function (s) { return s.dataset.tab; });
    var uniq = shown.filter(function (t, i) { return shown.indexOf(t) === i; });
    return { active: on, shown: uniq };
  }
  function isShow(s) { return s.active.length === 1 && s.active[0] === 'show' && s.shown.length === 1 && s.shown[0] === 'show'; }
  function isPhases(s) { return s.active.length === 1 && s.active[0] === 'phases' && s.shown.length === 1 && s.shown[0] === 'phases'; }
  function settingsOpen() { var w = byId('settings-window'); return !!(w && w.classList.contains('is-open')); }
  async function toPhases() {
    document.querySelector('.side-tab-btn[data-tab="phases"]').click();
    await T.sleep(200);
    return tabState();
  }
  async function clickNew() {
    await T.sleep(700);   // reClickGuard(600) on the New button
    byId('new-file-btn').click();
    await T.sleep(400);
  }
  var before = [];

  try {
    await T.appReady();
    await T.sleep(600);

    // N1 -- nothing unsaved: New runs at once.
    before.push(await toPhases());
    await clickNew();
    var n1 = tabState();
    kase('N1', 'Phases tab, nothing unsaved: New lands on Show info (tab selected, its cards shown, Phases hidden)',
         isShow(n1) && !T.modalText(), { after: n1, modal: T.modalText() });

    // N2 -- unsaved work: New asks first.
    before.push(await toPhases());
    var f = byId('weeks-post');
    f.value = String((parseInt(f.value, 10) || 10) + 3);
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(800);
    await clickNew();
    var asked = T.modalText();
    var clicked = T.clickModalButton('Start new');
    await T.sleep(600);
    var n2 = tabState();
    kase('N2', 'Phases tab, unsaved work: New asks first, and "Start new" lands on Show info',
         /new blank calendar/i.test(asked) && clicked && isShow(n2), { asked: asked, clicked: clicked, after: n2 });

    // N3 -- the Settings window open over the sidebar.
    before.push(await toPhases());
    await T.openSettings();
    var openBefore = settingsOpen();
    await clickNew();
    var n3 = tabState(), openAfter = settingsOpen();
    kase('N3', 'Settings window open on the Phases tab: New closes it and lands on Show info',
         openBefore && !openAfter && isShow(n3), { openBefore: openBefore, openAfter: openAfter, after: n3 });

    // N4 -- the fresh undo history's baseline holds Show.
    var undoBtn = byId('undo-btn');
    var undoDisabled = !!(undoBtn && (undoBtn.disabled || undoBtn.getAttribute('aria-disabled') === 'true' || undoBtn.hasAttribute('data-disabled')));
    if (undoBtn) undoBtn.click();
    await T.sleep(700);
    var n4 = tabState();
    kase('N4', 'after New, Undo is disabled and the tab stays Show', undoDisabled && isShow(n4), { undoDisabled: undoDisabled, after: n4 });

    kase('N5', 'positive control: the Phases tab was up before each New', before.length === 3 && before.every(isPhases), { before: before });

    var errs = T.appHealth().errors || [];
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'newtab threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
