// launchopen -- double-click a .sptcal: the OS hands the file to the installed app through
// window.launchQueue, and the engine loads it as Load... would (1 Oct 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh launchopen 240
//
// Headless Chrome cannot produce an installed app window (PWA-ONLY-PLAN M10), so this leg cannot
// see the OS half -- the manifest's file_handlers, the "Open and edit in this web app?" prompt, the
// window coming forward. That half was MEASURED instead (a throwaway profile, the app renamed
// ProbeCal, PWA.install + PWA.launchFilesInApp over CDP, Chrome 154; HANDOFF has the numbers), and
// check-build asserts the manifest entry. What this leg owns is everything after Chrome's queue:
//
// It replaces window.launchQueue BEFORE the engine boots (this script runs ahead of the deferred
// module) with a fake whose setConsumer() records the engine's consumer, and queues a COLD launch
// -- the app started by a double-click -- exactly as Chrome does: delivered just after setConsumer.
// The handles are fakes in the shape of t/lib.js's openViaFakePicker, plus a permission switch;
// IndexedDB is the in-memory one (backupslots' pattern), seeded with a crash backup from "another
// page" so the leg can prove a file launch does not bury the file under the recovery question.
window.__T.memoryIDB();
// ⚠️ A SLOW START, on purpose. The in-memory store answers on the next microtask, but a real cold
// IndexedDB takes far longer than Chrome takes to deliver the launch -- and that is the race the
// engine's recentsReady guards: loadRecents() settling AFTER the launch loaded would unlink the
// file and overwrite the recents list. So every open() in the first 1.5 s after boot is held until
// then. Without this, L1/L3/L4 passed with the guard deleted (mutation run, 1 Oct 2026).
(function slowStart(){
  var mem = window.indexedDB, until = Date.now() + 1500;
  var slow = { open: function(name, v){
    var p = {result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null};
    setTimeout(function(){
      var r = mem.open(name, v);
      r.onupgradeneeded = function(){ p.result = r.result; if(p.onupgradeneeded) p.onupgradeneeded({target: p}); };
      r.onsuccess = function(){ p.result = r.result; if(p.onsuccess) p.onsuccess({target: p}); };
    }, Math.max(0, until - Date.now()));
    return p;
  } };
  Object.defineProperty(window, 'indexedDB', {configurable: true, get: function(){ return slow; }});
})();
(function seed(){
  function get(u){ var x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); return x.responseText; }
  var showA = get('/tests/fixtures/show-a.sptcal');
  var back = JSON.parse(showA); back.fields.byId['show-title'] = {value: 'BACKUP FROM EARLIER'};
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['unsavedBackup:otherpage', {state: back, at: Date.now() - 60000, fileName: null}]
  ])};
  var c = JSON.parse(showA); c.fields.byId['show-title'] = {value: 'SHOW C READONLY'};
  window.__TXT = {
    A: get('/tests/fixtures/v1.4.2-saved.sptcal'),          // "Test Show"
    B: showA,                                               // "SHOW A"
    C: JSON.stringify(c),
    FUTURE: get('/tests/fixtures/loadfail-future.sptcal'),  // version 2: refused whole
    JUNK: 'these are my notes, not a calendar'
  };
  // A fake file handle. perm.readwrite starts as given ('granted' unless told otherwise) and
  // requestPermission() flips it, recording the call -- which is how L12 sees Save ask.
  window.__mkHandle = function(name, key, readwrite){
    var txt = window.__TXT[key], mtime = Date.now() - 60000;
    var h = { name: name, kind: 'file', writes: [], asked: 0, perm: readwrite || 'granted',
      queryPermission: async function(o){ return (o && o.mode === 'readwrite') ? h.perm : 'granted'; },
      requestPermission: async function(o){ h.asked++; if(o && o.mode === 'readwrite') h.perm = 'granted'; return 'granted'; },
      isSameEntry: async function(other){ return other === h; },
      getFile: async function(){ return new File([txt], name, {type: 'application/json', lastModified: mtime}); },
      createWritable: async function(){
        if(h.perm !== 'granted') throw new DOMException('no write permission', 'NotAllowedError');
        var parts = [];
        return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); },
                 close: async function(){ txt = parts.join(''); mtime = Math.max(Date.now(), mtime + 1000); h.writes.push(txt); } };
      } };
    return h;
  };
  // The fake queue. Chrome holds launch params until a consumer is set, then delivers them -- this
  // does the same, on a task after setConsumer().
  var consumer = null, queued = [];
  var fake = { setConsumer: function(fn){ consumer = fn; queued.splice(0).forEach(function(p){ setTimeout(function(){ fn(p); }, 0); }); } };
  try { Object.defineProperty(window, 'launchQueue', {configurable: true, get: function(){ return fake; }}); }
  catch(e){ window.__LQERR = String(e); }
  window.__launch = function(files){ var p = {files: files, targetURL: location.href}; if(consumer) consumer(p); else queued.push(p); };
  window.__consumerSet = function(){ return !!consumer; };
  window.__H = { A: window.__mkHandle('Test Show.sptcal', 'A') };
  window.__launch([window.__H.A]);                           // the COLD launch
  // Save must write back to the launched file, never open the picker. supportsFsAccess is read
  // from this function's existence, so it stays a function -- one that records and refuses.
  window.__pickerCalls = 0;
  window.showSaveFilePicker = async function(){ window.__pickerCalls++; throw new DOMException('test: no picker', 'AbortError'); };
})();

window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function title(){ return document.getElementById('show-title').value; }
  function chip(){ var e = document.getElementById('file-menu-label'); return e ? e.textContent.trim() : null; }
  function recents(){ return Array.from(document.querySelectorAll('#file-menu .file-menu-item[data-id]')).map(function(e){ return (e.textContent || '').trim(); }); }
  function status(){ var e = document.getElementById('save-status'); return e ? (e.textContent || '').trim() : ''; }
  function slots(){ return Array.from(window.__MEMIDB['spt-planning-cal'].handles.keys()).filter(function(k){ return String(k).indexOf('unsavedBackup') === 0; }); }
  async function modal(re, label){ await T.until(function(){ return re.test(T.modalText()); }, label, 80, 100); return T.modalText(); }
  async function noModal(ms){ var seen = ''; for(var i = 0; i < ms / 100; i++){ await T.sleep(100); var m = T.modalText(); if(m){ seen = m; break; } } return seen; }
  async function closeModal(label){ T.clickModalButton(label); await T.until(function(){ return !T.modalText(); }, 'the dialog to close', 40, 100); await T.sleep(300); }
  try {
    if(window.__LQERR) throw new Error('could not replace window.launchQueue: ' + window.__LQERR);
    await T.appReady();
    add('L0', 'the engine set a launchQueue consumer', window.__consumerSet(), {set: window.__consumerSet()}, true);

    // ---- L1/L2/L3: the COLD launch ----------------------------------------------------------
    await T.until(function(){ return title() === 'Test Show'; }, 'the launched calendar to load', 80, 100);
    var during = await noModal(2500);   // well past offerBackupRecovery's 400 ms and its IDB reads
    add('L1', 'cold launch: the double-clicked calendar loads, and the recovery question does NOT pile on top',
      title() === 'Test Show' && chip() === 'Test Show.sptcal' && !during,
      {title: title(), chip: chip(), modal: during}, 'Test Show; chip Test Show.sptcal; no dialog');
    add('L2', 'the crash backup is KEPT for the next ordinary launch (as a Cancel keeps it)',
      slots().indexOf('unsavedBackup:otherpage') !== -1, {slots: slots()}, 'unsavedBackup:otherpage still there');
    add('L3', 'the launched file joins the recents list', recents().some(function(t){ return t.indexOf('Test Show.sptcal') !== -1; }),
      {recents: recents()}, 'Test Show.sptcal listed');

    // ---- L4: it is the LINKED file: Save writes back to it, no picker -------------------------
    T.set('show-title', 'Test Show EDITED'); await T.sleep(600);
    document.getElementById('save-file-btn').click();
    await T.until(function(){ return window.__H.A.writes.length > 0; }, 'Save to write the launched file', 60, 100);
    var w = JSON.parse(window.__H.A.writes[window.__H.A.writes.length - 1]);
    add('L4', 'Save writes straight back to the double-clicked file (no picker)',
      window.__pickerCalls === 0 && w.fields.byId['show-title'].value === 'Test Show EDITED',
      {pickerCalls: window.__pickerCalls, written: w.fields.byId['show-title'].value}, '0 picker calls; Test Show EDITED written');
    await T.sleep(1500);

    // ---- L5/L6: unsaved work in the open window -----------------------------------------------
    T.set('show-title', 'UNSAVED WORK'); await T.sleep(600);
    window.__launch([window.__mkHandle('Show A.sptcal', 'B')]);
    var ask = await modal(/Load another calendar/, 'the unsaved-changes question');
    await closeModal('Cancel');
    add('L5', 'unsaved work + a double-click asks first; Cancel keeps what is on screen',
      /unsaved changes will be lost/.test(ask) && title() === 'UNSAVED WORK' && chip() === 'Test Show.sptcal',
      {asked: ask, title: title(), chip: chip()}, 'asked; UNSAVED WORK kept; still Test Show.sptcal');
    window.__launch([window.__mkHandle('Show A.sptcal', 'B')]);
    await modal(/Load another calendar/, 'the unsaved-changes question (2)');
    await closeModal('Load');
    await T.until(function(){ return title() === 'SHOW A'; }, 'SHOW A to load', 60, 100);
    add('L6', '…and Load replaces it with the double-clicked calendar',
      title() === 'SHOW A' && chip() === 'Show A.sptcal', {title: title(), chip: chip()}, 'SHOW A; chip Show A.sptcal');
    await T.sleep(800);

    // ---- L7: two files at once (single-client: ONE call carrying both) --------------------------
    window.__launch([window.__mkHandle('Test Show.sptcal', 'A'), window.__mkHandle('Show A.sptcal', 'B')]);
    var two = await modal(/one calendar at a time/, 'the one-at-a-time notice');
    await closeModal('OK');
    add('L7', 'two files: the FIRST loads, and the user is told only it was',
      title() === 'Test Show' && /Test Show\.sptcal/.test(two), {title: title(), notice: two}, 'Test Show; the notice names Test Show.sptcal');

    // ---- L8/L9: files the app refuses -------------------------------------------------------
    var junk = window.__mkHandle('notes.sptcal', 'JUNK');
    window.__launch([junk]);
    var j = await modal(/doesn.t contain saved calendar data/, 'the not-a-calendar refusal');
    await closeModal('OK');
    add('L8', 'a .sptcal that is not a calendar: refused, nothing changes, and it does not join recents',
      title() === 'Test Show' && !recents().some(function(t){ return t.indexOf('notes.sptcal') !== -1; }),
      {notice: j, title: title(), recents: recents()}, 'refused; Test Show unchanged; notes.sptcal not listed');
    window.__launch([window.__mkHandle('From Later.sptcal', 'FUTURE')]);
    var fut = await modal(/newer version of SPTCal/, 'the newer-version refusal');
    await closeModal('OK');
    add('L9', 'a calendar from a NEWER SPTCal: refused whole (audit M-1), nothing changes',
      title() === 'Test Show', {notice: fut, title: title()}, 'refused; Test Show unchanged');

    // ---- L10: a dialog already on screen is never answered by the launch ------------------------
    T.set('show-title', 'DIRTY AGAIN'); await T.sleep(600);
    document.getElementById('new-file-btn').click();
    await modal(/Start a new blank calendar/, 'New\'s own question');
    window.__launch([window.__mkHandle('Show A.sptcal', 'B')]);
    await T.sleep(1500);
    var stillNew = T.modalText();
    // NOT closeModal(): the launch's own question takes the screen the moment New's goes, so the
    // screen is never empty in between -- which is the behaviour under test.
    T.clickModalButton('Cancel');
    var then = await modal(/Load another calendar/, 'the launch\'s question, AFTER New\'s');
    await closeModal('Load');
    await T.until(function(){ return title() === 'SHOW A'; }, 'SHOW A to load after the wait', 60, 100);
    add('L10', 'a double-click while another question is up WAITS for it (a second dialog would cancel the first)',
      /Start a new blank calendar/.test(stillNew) && /Load another calendar/.test(then) && title() === 'SHOW A',
      {whileNewWasUp: stillNew, afterwards: then, title: title()}, 'New\'s question untouched; then the launch asks; SHOW A');
    await T.sleep(800);

    // ---- L11: a note half-typed in the editor counts as unsaved work ---------------------------
    var td = document.querySelector('td.sheet-note-cell[data-week]');
    td.click(); await T.sleep(400);
    var ta = document.querySelector('.note-editor textarea');
    if(ta){ ta.value = 'HALF TYPED NOTE'; ta.dispatchEvent(new Event('input', {bubbles: true})); }
    window.__launch([window.__mkHandle('Test Show.sptcal', 'A')]);
    var noteAsk = await modal(/Load another calendar/, 'the question a half-typed note should raise');
    await closeModal('Cancel');
    var cellText = (document.querySelector('td.sheet-note-cell[data-week="' + td.dataset.week + '"]') || {}).textContent || '';
    add('L11', 'an open note editor is committed first, so its text counts as unsaved (and survives a Cancel)',
      !!ta && /unsaved changes/.test(noteAsk) && cellText.indexOf('HALF TYPED NOTE') !== -1 && title() === 'SHOW A',
      {editorOpened: !!ta, asked: noteAsk, cell: cellText.slice(0, 60), title: title()}, 'asked; the note is in its cell; SHOW A kept');
    // Back to a clean calendar for L12.
    document.getElementById('save-file-btn').click(); await T.sleep(1500);

    // ---- L12: a launch Chrome gave READ-only access to ----------------------------------------
    var ro = window.__mkHandle('Show C.sptcal', 'C', 'prompt');
    window.__launch([ro]);
    await T.until(function(){ return title() === 'SHOW C READONLY'; }, 'the read-only file to load', 60, 100);
    T.set('show-title', 'SHOW C EDITED'); await T.sleep(800);
    var st = status();
    document.getElementById('save-file-btn').click();
    await T.until(function(){ return ro.writes.length > 0; }, 'Save to ask, then write', 60, 100);
    await T.sleep(500);
    add('L12', 'read-only launch: the status line says autosave needs permission; Save asks once, then writes',
      /Autosave needs permission/.test(st) && ro.asked === 1 && JSON.parse(ro.writes[0]).fields.byId['show-title'].value === 'SHOW C EDITED' &&
      !/Autosave needs permission/.test(status()) && window.__pickerCalls === 0,
      {statusBefore: st, asked: ro.asked, writes: ro.writes.length, statusAfter: status(), pickerCalls: window.__pickerCalls},
      'Autosave needs permission -- click Save; asked 1; written; status cleared; no picker');

    // ---- L13: an ordinary launch (the app icon) carries no files and changes nothing ------------
    window.__launch([]);
    var none = await noModal(1200);
    add('L13', 'an ordinary launch (no files) does nothing', !none && title() === 'SHOW C EDITED', {modal: none, title: title()}, 'no dialog; unchanged');

    // ---- L15: two SEPARATE launches back to back each get their own question, in order ----------
    T.set('show-title', 'DIRTY FOR TWO'); await T.sleep(600);
    window.__launch([window.__mkHandle('Show A.sptcal', 'B')]);
    window.__launch([window.__mkHandle('Test Show.sptcal', 'A')]);
    var first = await modal(/Load another calendar/, 'the first launch\'s question');
    var firstEl = document.querySelector('.mantine-Modal-content');
    T.clickModalButton('Cancel');   // not closeModal(): the second question follows at once (see L10)
    await T.until(function(){ var e = document.querySelector('.mantine-Modal-content'); return !e || e !== firstEl; }, 'the first question to go', 40, 100);
    var second = await modal(/Load another calendar/, 'the SECOND launch\'s question, after the first was answered');
    await closeModal('Load');
    await T.until(function(){ return title() === 'Test Show'; }, 'the second file to load', 60, 100);
    add('L15', 'two launches back to back are queued: the first is answered (Cancel), then the second asks (Load)',
      /Load another calendar/.test(second) && title() === 'Test Show', {second: second, title: title()}, 'asked twice, in order; Test Show');

    add('L14', '0 console errors', !(window.__ERR || []).length, {errors: (window.__ERR || []).slice(0, 5)}, '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'launchopen', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
