// recoverfail -- a crash backup that cannot be applied is REPORTED and KEPT, and the file it names is left alone
// (audit AUD2-004, 13 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=mode=newer ./run.sh recoverfail 900
//   mode = newer | damaged | throws | scen          (default newer; gate.sh runs all four)
//
// What it guards. Recover used to ignore whether the backup had been applied. When it had not, the screen kept the
// blank launch calendar, and recovery still linked the backup's file, marked the page unsaved, wrote the BLANK
// calendar as this page's backup and deleted the slot it came from. The next autosave tick (10 minutes; no click
// when Chrome still holds write permission) then wrote the blank calendar over the saved file: the unsaved work
// and the saved file both gone, with no message.
//
// The leg seeds the in-memory IndexedDB BEFORE the engine boots, as backuplink does: a recents entry for
// my-show.sptcal with a recording handle (write permission already granted, the worst case) and a crashed page's
// backup that names it. Three backups that cannot be applied, and one control that can:
//   newer    the backup is one snapshot version ahead: what a rollback after a version bump would meet
//   damaged  two scenario tabs, the parked one holding no calendar
//   throws   a good backup whose apply throws partway (a one-shot forced throw, loadfail's technique), so the
//            atomic rollback runs
//   scen     CONTROL: a good two-tab backup recovers as before -- into its file, both tabs, the old slot retired
// Red on the build before the fix at F1, F2, F3 and F4 in each of the three failing modes.
window.__THROW_ON_ID = null; window.__THROW_FIRED = 0;
(function () {
  var realGet = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id) {
    if (window.__THROW_ON_ID && id === window.__THROW_ON_ID) { window.__THROW_ON_ID = null; window.__THROW_FIRED++; throw new Error('forced apply throw (test)'); }
    return realGet.call(this, id);
  };
})();
window.__T.memoryIDB();
var MODE = (function () { var m = /[?&]mode=([a-z]+)/.exec(location.search); return m ? m[1] : 'newer'; })();
var DISK = (function seed(){
  var x = new XMLHttpRequest();                      // synchronous: this must land before boot
  x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var onDisk = x.responseText, base = JSON.parse(onDisk), work = JSON.parse(onDisk);
  work.fields.byId['show-title'] = {value: 'UNSAVED EDITS'};
  if (MODE === 'newer') work.version = 2;          // one step past SNAPSHOT_VERSION 1
  if (MODE === 'damaged') work = Object.assign({}, work, {version: 2, scenarios: {current: 's1', counter: 2,
    tabs: [{id: 's1', name: 'Plan A'}, {id: 's2', name: 'Plan B', snapshot: {}}]}});
  if (MODE === 'scen') {
    var planB = JSON.parse(onDisk); planB.fields.byId['show-title'] = {value: 'PLAN B EDITS'};
    work = Object.assign({}, work, {version: 2, scenarios: {current: 's1', counter: 2,
      tabs: [{id: 's1', name: 'Plan A'}, {id: 's2', name: 'Plan B', snapshot: planB}]}});
  }
  var disk = {text: onDisk, mtime: 1700000000000, writes: [], pickerCalls: 0,
    origTitle: (base.fields.byId['show-title'] || {}).value, origBytes: onDisk.length};
  var h = {name: 'my-show.sptcal', kind: 'file',
    queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
    isSameEntry: async function(o){ return o === h; },
    getFile: async function(){ return new File([disk.text], 'my-show.sptcal', {lastModified: disk.mtime}); },
    createWritable: async function(){ var parts = []; return {
      write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); },
      close: async function(){ disk.text = parts.join(''); disk.mtime += 1000; disk.writes.push(disk.text); } }; } };
  var now = Date.now();
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['recentFiles', [{id: 'fA', handle: h, name: 'my-show.sptcal', savedAt: now - 300000}]],
    ['activeFileId', 'fA'],
    ['unsavedBackup:crashed', {state: work, at: now - 90000, fileName: 'my-show.sptcal', fileId: 'fA',
      fileStamp: {lastModified: disk.mtime, size: new Blob([onDisk]).size}}]
  ])};
  window.showSaveFilePicker = async function(){ disk.pickerCalls++; throw new DOMException('test: no picker', 'AbortError'); };
  return disk;
})();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function handles(){ return window.__MEMIDB['spt-planning-cal'].handles; }
  function ownSlots(){ return Array.from(handles().keys()).filter(function (k) { return String(k).indexOf('unsavedBackup:') === 0 && k !== 'unsavedBackup:crashed'; }); }
  function label(){ return ((document.getElementById('file-menu-label') || {}).textContent || '').trim(); }
  function status(){ return ((document.getElementById('save-status') || {}).textContent || '').trim(); }
  function val(id){ return (document.getElementById(id) || {}).value; }
  function titleIn(text){ try { return JSON.parse(text).fields.byId['show-title'].value; } catch(e){ return null; } }
  function crashedTitle(){ var b = handles().get('unsavedBackup:crashed'); return b && b.state ? titleIn(JSON.stringify(b.state)) : null; }
  function tabs(){ return Array.prototype.map.call(document.querySelectorAll('.sc-tab'), function (t) { return t.textContent.trim(); }); }
  try {
    await T.until(function(){ return /Recover unsaved work/.test(T.modalText()); }, 'the recover question', 100, 100);
    var offer = T.modalText();
    add('F0', 'the launch offers to recover the work on my-show.sptcal', /my-show\.sptcal/.test(offer), {modal: offer}, 'Recover unsaved work from "my-show.sptcal"');
    if (MODE === 'throws') window.__THROW_ON_ID = 'start-localization';   // late: several stores already written
    T.clickModalButton('Recover');
    await T.sleep(2500);

    if (MODE === 'scen') {
      var own = ownSlots();
      add('S1', 'CONTROL: a good two-tab backup recovers into its file, with both tabs, and the crashed slot is retired',
        val('show-title') === 'UNSAVED EDITS' && label().indexOf('my-show.sptcal') !== -1 && /Unsaved changes/.test(status())
          && tabs().length === 2 && !handles().has('unsavedBackup:crashed') && own.length === 1 && !T.modalText(),
        {title: val('show-title'), label: label(), status: status(), tabs: tabs(), crashedKept: handles().has('unsavedBackup:crashed'), own: own, modal: T.modalText()},
        'UNSAVED EDITS; label my-show.sptcal; Unsaved changes; 2 tabs; crashed slot gone; 1 own slot; no message');
    } else {
      var msg = T.modalText();
      var want = MODE === 'newer' ? /newer version of SPTCal/ : /couldn’t be opened/;
      add('F1', 'Recover says the unsaved work could not be opened, and that it has been kept',
        want.test(msg) && /kept/.test(msg), {modal: msg}, MODE === 'newer' ? 'a message naming a newer version' : 'a message saying it couldn’t be opened');
      add('F2', 'the backup is KEPT, untouched, and this page writes no backup of its own',
        handles().has('unsavedBackup:crashed') && crashedTitle() === 'UNSAVED EDITS' && ownSlots().length === 0,
        {crashedKept: handles().has('unsavedBackup:crashed'), crashedTitle: crashedTitle(), own: ownSlots()},
        'slot unsavedBackup:crashed still holding UNSAVED EDITS; no other slot');
      add('F3', 'the file is NOT linked and nothing is marked unsaved: the blank launch calendar, under no file’s name',
        label().indexOf('my-show') === -1 && val('show-title') === '' && !/Unsaved|Autosave/.test(status()),
        {label: label(), title: val('show-title'), status: status()},
        'a file menu that does not name my-show.sptcal; an empty title; no Unsaved changes');
      if (MODE === 'throws') add('F5', 'the forced throw really fired inside the apply (so the rollback is what F3 saw)',
        window.__THROW_FIRED === 1, {fired: window.__THROW_FIRED}, '1');
      if (T.modalText()) T.clickModalButton('OK');
      await T.sleep(11 * 60 * 1000);                  // past one autosave tick
      add('F4', '11 minutes later the saved file is untouched: autosave wrote nothing into it',
        DISK.writes.length === 0 && titleIn(DISK.text) === DISK.origTitle && DISK.text.length === DISK.origBytes,
        {writes: DISK.writes.length, writtenTitles: DISK.writes.map(titleIn), writtenBytes: DISK.writes.map(function (w) { return w.length; }),
         diskTitle: titleIn(DISK.text), status: status(), label: label()},
        '0 writes; still "' + DISK.origTitle + '", ' + DISK.origBytes + ' bytes');
      var btn = document.getElementById('save-file-btn');
      if (btn) btn.click();
      await T.sleep(2500);
      add('F6', 'a Save click does not write into the file either',
        DISK.writes.length === 0, {writes: DISK.writes.length, pickerCalls: DISK.pickerCalls, status: status(), modal: T.modalText()},
        '0 writes (an unlinked calendar asks where to save)');
    }
    // The forced throw is logged by the engine on purpose (console.error in restoreSavedState); nothing else may be.
    var errs = T.appHealth().errors.filter(function (e) { return !/forced apply throw \(test\)/.test(String(e)); });
    add('E0', 'no unexpected console error, no native alert', errs.length === 0 && window.__alerts.length === 0,
        {errors: errs.slice(0, 6), alerts: window.__alerts}, 'none');
  } catch (e) { cases.push({id: 'EX', title: 'the leg threw', pass: false, observed: String(e && e.stack || e), expected: 'no exception'}); }
  T.done({test: 'recoverfail', mode: MODE, cases: cases});
})(); });
