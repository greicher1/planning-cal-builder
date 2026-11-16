// backuplive -- a second window is never offered the FIRST window's live work (audit AUD2-074, item 3.7).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backuplive 120
//
// Before: offerBackupRecovery() took the newest backup slot any page had written, with no test of whether the page
// that owned it was still open. A second SPTCal window offered the first one's unsaved calendar as lost work, and
// Recover copied it in (linked to the same file) and deleted the first window's crash copy.
// Now every page holds a Web Lock named after its own slot for as long as it is open (the browser releases it when
// the page closes or crashes), and a slot whose lock is held belongs to a live window: never offered, never listed.
// run.sh's headless Chrome cannot open a second app window, so the "other window" is played by this page holding the
// lock of a seeded slot before the engine boots: the LockManager state a second window produces, read through the same
// navigator.locks.query(). The LockManager is lib.js's in-page fake (memoryIDB installs it), because the real query is
// a round trip --virtual-time-budget does not wait for (lib.js has the trap). The REAL API, across two real windows of
// one profile, is backuptwowin.mjs.
//
//   V1  the launch question offers the closed window's backup (dead.sptcal), not the open window's newer one
//   V2  Cancel: the file menu lists the closed window's backup and NOT the open window's
//   V3  the open window's backup is untouched (same object, still there)
//   V4  this page holds its own slot's lock (so a window opened after it skips this page's backup in turn)
//   V5  the file menu's x on an entry asks, and Discard deletes that backup only; the menu entry goes
//   V6  ...the open window's backup is still untouched after all of it
//   V7  control for backupblocked: with storage working, an edit is backed up and no "not keeping" strip shows
window.__T.memoryIDB();   // and lib.js's in-page LockManager: the real one is proved by backuptwowin.mjs
(function seed(){
  var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var live = JSON.parse(x.responseText), dead = JSON.parse(x.responseText);
  live.fields.byId['show-title'] = {value: 'LIVE OTHER WINDOW'};
  dead.fields.byId['show-title'] = {value: 'CLOSED WINDOW'};
  var now = Date.now();
  window.__LIVE = {state: live, at: now - 30000, fileName: null};
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['unsavedBackup:liveother', window.__LIVE],
    ['unsavedBackup:deadone', {state: dead, at: now - 2 * 3600000, fileName: 'dead.sptcal'}]
  ])};
  // The open window: it holds its slot's lock for as long as it lives.
  window.__lockHeld = false;
  try {
    navigator.locks.request('unsavedBackup:liveother', function () { window.__lockHeld = true; return new Promise(function () {}); });
  } catch (e) { window.__lockErr = String(e); }
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function handles(){ return window.__MEMIDB['spt-planning-cal'].handles; }
  function slots(){ return Array.from(handles().keys()).filter(function (k) { return String(k).indexOf('unsavedBackup') === 0; }).sort(); }
  function listed(){ return Array.from(document.querySelectorAll('#file-menu [data-backup]')).map(function (e) { return e.getAttribute('data-backup'); }); }
  try {
    await T.appReady();
    var q = '';
    for(var i = 0; i < 80; i++){ await T.sleep(100); q = T.modalText(); if(/Recover unsaved work/.test(q)) break; }
    add('V1', 'the question offers the CLOSED window\'s backup (dead.sptcal), not the open window\'s newer one',
      /dead\.sptcal/.test(q) && !/an unsaved calendar/.test(q), {modal: q, lockHeld: window.__lockHeld, lockErr: window.__lockErr || null, fakeErr: window.__MEMLOCKS_FAILED || null},
      '"Recover unsaved work from “dead.sptcal” …"');
    T.clickModalButton('Cancel'); await T.sleep(1000);
    var l = listed();
    add('V2', 'Cancel: the file menu lists the closed window\'s backup, never the open window\'s',
      l.length === 1 && l[0] === 'unsavedBackup:deadone', {listed: l}, '[unsavedBackup:deadone]');
    add('V3', 'the open window\'s backup is untouched', handles().get('unsavedBackup:liveother') === window.__LIVE,
      {slots: slots()}, 'same object');
    var held = [];
    try { held = ((await navigator.locks.query()).held || []).map(function (x) { return x.name; }); } catch (e) { held = ['ERR ' + e]; }
    var mine = held.filter(function (n) { return /^unsavedBackup:/.test(n) && n !== 'unsavedBackup:liveother'; });
    add('V4', 'this page holds its own slot\'s lock', mine.length === 1, {held: held}, 'one unsavedBackup:<this page> lock');

    var x = document.querySelector('#file-menu [data-backup-discard="unsavedBackup:deadone"]');
    if(x) x.click();
    await T.until(function () { return /Discard/.test(T.modalText()); }, 'the discard question', 40, 100);
    var dq = T.modalText();
    T.clickModalButton('Discard'); await T.sleep(1000);
    add('V5', 'the x asks, and Discard deletes that backup only; its menu entry goes',
      /dead\.sptcal/.test(dq) && slots().indexOf('unsavedBackup:deadone') === -1 && listed().length === 0,
      {modal: dq, slots: slots(), listed: listed()}, 'asked naming dead.sptcal; deadone gone; menu empty');
    add('V6', 'the open window\'s backup is still untouched', handles().get('unsavedBackup:liveother') === window.__LIVE,
      {slots: slots()}, 'same object');

    // Control for AUD2-075's strip: where storage works, an edit is backed up and no strip is raised.
    T.set('show-title', 'EDITED HERE'); await T.sleep(3800);
    var st = document.getElementById('storage-notice');
    var own = slots().filter(function (k) { return k !== 'unsavedBackup:liveother'; });
    add('V7', 'control: storage working, an edit is backed up in this page\'s slot and no "not keeping" strip shows',
      own.length === 1 && !!st && st.hidden, {own: own, stripExists: !!st, stripHidden: !!st && st.hidden}, 'one own slot; strip hidden');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'backuplive', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
