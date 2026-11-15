// backupblocked -- a browser that refuses SPTCal its site data says so (audit AUD2-075, item 3.7).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backupblocked 150
//
// Before: with IndexedDB refused (a managed browser blocking site data, or a profile keeping none), the app booted and
// worked with no word: idbSet() swallows every failure by design, so the crash backup was never written and the list
// of loaded files never kept, while the status line read "Unsaved changes" as if the work were protected.
// IndexedDB is replaced BEFORE boot with one that refuses as Chrome does when site data is blocked
// ("UnknownError: The user denied permission to access the database."), as the audit's leg did. A COLD file launch
// (launchopen's fake launchQueue) rides along, to hold the finding's other claim: a double-clicked file still loads.
//
//   K1  the app boots and draws the calendar
//   K2  one strip says the backup of unsaved work is not being kept, and to save often
//   K3  the double-clicked calendar loads all the same (title, file menu label)
//   K4  no unhandled rejection, no dialog
//   K5  a shareable copy exported from here carries the strip HIDDEN (buildSavedHtml's clone re-hides it)
//   K6  the x dismisses it, and a later failed backup does not raise it again on this page
var T = window.__T;
T.memoryLocks();   // lib.js's in-page LockManager (memoryIDB's, without its IndexedDB: this leg refuses that itself)
(function () {
  var realIdb = window.indexedDB;
  window.__opens = 0;
  var fake = {
    open: function () {
      window.__opens++;
      var req = {result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null,
        addEventListener: function () {}, removeEventListener: function () {}};
      setTimeout(function () {
        req.error = new DOMException('The user denied permission to access the database.', 'UnknownError');
        if (typeof req.onerror === 'function') req.onerror({target: req});
      }, 5);
      return req;
    },
    deleteDatabase: function () { return {}; },
    databases: function () { return Promise.reject(new DOMException('denied', 'UnknownError')); },
    cmp: realIdb && realIdb.cmp ? realIdb.cmp.bind(realIdb) : function () { return 0; }
  };
  try { Object.defineProperty(window, 'indexedDB', {value: fake, configurable: true}); } catch (e) { window.__idbStubFail = String(e); }
  // A cold launch of show-a.sptcal, delivered just after the engine sets its consumer (launchopen's fake queue).
  var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var txt = x.responseText;
  var h = {name: 'show-a.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === h; },
    getFile: async function () { return new File([txt], 'show-a.sptcal', {lastModified: 1700000000000}); },
    createWritable: async function () { return {write: async function () {}, close: async function () {}}; }};
  var fakeQ = {setConsumer: function (fn) { window.__consumer = true; setTimeout(function () { fn({files: [h], targetURL: location.href}); }, 0); }};
  try { Object.defineProperty(window, 'launchQueue', {configurable: true, get: function () { return fakeQ; }}); } catch (e) { window.__lqErr = String(e); }
})();
window.__rej = []; window.addEventListener('unhandledrejection', function (e) { window.__rej.push(String(e.reason && (e.reason.name + ': ' + e.reason.message) || e.reason)); });
window.addEventListener('load', function () { (async function () {
  var cases = [], dialogs = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function strip(){
    var e = document.getElementById('storage-notice');
    return {exists: !!e, shown: !!e && !e.hidden && getComputedStyle(e).display !== 'none',
            text: e ? ((e.querySelector('.ln-text') || e).textContent || '').replace(/\s+/g, ' ').trim() : null};
  }
  function title(){ return document.getElementById('show-title').value; }
  function chip(){ var e = document.getElementById('file-menu-label'); return e ? e.textContent.trim() : null; }
  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('table.sheet-table'); }, 'grid', 200, 100);
    for(var i = 0; i < 30; i++){ await T.sleep(100); var m = T.modalText(); if(m && dialogs.indexOf(m) < 0) dialogs.push(m); }
    add('K1', 'the app boots and draws the calendar with IndexedDB refused', !!document.querySelector('table.sheet-table'),
      {stubFail: window.__idbStubFail || null, opens: window.__opens}, true);
    var s = strip();
    add('K2', 'one strip says the backup of unsaved work is not being kept, and to save often',
      s.shown && /backup/i.test(s.text) && /save often/i.test(s.text), s, 'shown; names the backup; "save often"');
    await T.until(function () { return title() === 'SHOW A'; }, 'the launched calendar', 60, 100).catch(function () {});
    add('K3', 'a double-clicked calendar still loads with site data blocked', title() === 'SHOW A' && chip() === 'show-a.sptcal',
      {title: title(), chip: chip(), consumer: !!window.__consumer, lqErr: window.__lqErr || null}, 'SHOW A; show-a.sptcal');

    // An edit, past the 3 s backup debounce: the backup write fails too.
    T.set('show-title', 'EDITED WITH STORAGE BLOCKED'); await T.sleep(4000);
    for(i = 0; i < 5; i++){ await T.sleep(100); m = T.modalText(); if(m && dialogs.indexOf(m) < 0) dialogs.push(m); }
    add('K4', 'no unhandled rejection, no dialog', window.__rej.length === 0 && dialogs.length === 0,
      {rejections: window.__rej.slice(0, 5), dialogs: dialogs, errors: T.appHealth().errors.slice(0, 5)}, 'none');

    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var inCopy = new DOMParser().parseFromString(html, 'text/html').getElementById('storage-notice');
    var inCopyText = inCopy ? ((inCopy.querySelector('.ln-text') || inCopy).textContent || '').trim() : null;
    add('K5', 'a shareable copy carries the strip HIDDEN, and empty as it ships', !!inCopy && inCopy.hasAttribute('hidden') && inCopyText === '',
      {inCopy: !!inCopy, hidden: !!inCopy && inCopy.hasAttribute('hidden'), text: inCopyText}, 'present, hidden, empty');

    var x = document.querySelector('#storage-notice .ln-x');
    if(x) x.click();
    await T.sleep(300);
    T.set('show-title', 'EDITED AGAIN'); await T.sleep(4000);
    add('K6', 'the x dismisses it, and a later failed backup does not raise it again', !!x && !strip().shown,
      {dismiss: !!x, after: strip()}, 'hidden');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'backupblocked', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
