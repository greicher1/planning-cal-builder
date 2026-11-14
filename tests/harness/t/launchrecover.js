// launchrecover -- reopening a calendar by double-click after a crash mentions the unsaved work that was kept
// (audit AUD2-076, item 3.7; default "when the double-clicked file is the backup's own file, ask the recovery question
// after it loads, else a dismissible strip 'Unsaved work from <file> was kept' with Recover").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh launchrecover 180
//
// Before: a file launch skipped the recovery offer outright ("a file launch outranks the offer"), so a user who always
// opens calendars by double-click never heard of the work kept for that very file.
// Three loads of one page (nofsa's reload pattern), each seeding the in-memory IndexedDB afresh and a COLD launch of
// show-a.sptcal through launchopen's fake launchQueue:
//
//   phase 1, the backup is show-a.sptcal's own (its recents entry, a minute old):
//   R1  the launched file loads FIRST, then the question asks about its unsaved work, by time alone (it is from today)
//   R2  Recover: the work is back, still linked to show-a.sptcal, unsaved; the backup retired
//   R3  Save writes it straight into show-a.sptcal (no picker, no "changed on disk")
//   phase 2, the backup is ANOTHER file's (show-b.sptcal, three days old):
//   R4  show-a loads with no dialog, and a strip says the unsaved work from show-b.sptcal (with its date) was kept
//   R5  its x hides it; the backup is kept, and the file menu lists it
//   phase 3, the same as phase 2:
//   R6  with unsaved work on screen the strip's Recover asks first, then brings show-b's work back, linked to
//       show-b.sptcal; the strip goes and the backup is retired
(function seed(){
  var phase = '1'; try { phase = sessionStorage.getItem('lrec-phase') || '1'; } catch (e) {}
  window.__PHASE = phase;
  window.__T.memoryIDB();
  function get(u){ var x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); return x.responseText; }
  var onDisk = get('/tests/fixtures/show-a.sptcal');
  var b = JSON.parse(onDisk); b.fields.byId['show-title'] = {value: 'SHOW B'};
  window.__mk = function (name, text, mtime) {
    var disk = {text: text, mtime: mtime, writes: []};
    var h = {name: name, kind: 'file', disk: disk,
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === h || (o && o.name === name); },
      getFile: async function(){ return new File([disk.text], name, {lastModified: disk.mtime}); },
      createWritable: async function(){ var parts = []; return {
        write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); },
        close: async function(){ disk.text = parts.join(''); disk.mtime += 1000; disk.writes.push(disk.text); } }; } };
    return h;
  };
  var hA = window.__mk('show-a.sptcal', onDisk, 1700000000000), hB = window.__mk('show-b.sptcal', JSON.stringify(b), 1700000500000);
  var now = Date.now(), work;
  var handles = [['recentFiles', [{id: 'f1', handle: hA, name: 'show-a.sptcal', savedAt: now - 120000},
                                  {id: 'f2', handle: hB, name: 'show-b.sptcal', savedAt: now - 240000}]],
                 ['activeFileId', 'f1']];
  if(phase === '1'){
    work = JSON.parse(onDisk); work.fields.byId['show-title'] = {value: 'UNSAVED WORK'};
    handles.push(['unsavedBackup:crashed', {state: work, at: now - 60000, fileName: 'show-a.sptcal', fileId: 'f1',
      fileStamp: {lastModified: hA.disk.mtime, size: new Blob([onDisk]).size}}]);
  } else {
    work = JSON.parse(onDisk); work.fields.byId['show-title'] = {value: 'SHOW B UNSAVED'};
    handles.push(['unsavedBackup:crashb', {state: work, at: now - 3 * 864e5, fileName: 'show-b.sptcal', fileId: 'f2',
      fileStamp: {lastModified: hB.disk.mtime, size: new Blob([hB.disk.text]).size}}]);
  }
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map(handles)};
  window.__hA = hA; window.__hB = hB;
  // The double-click: a fresh handle for show-a.sptcal, as Chrome hands one over.
  var launched = window.__mk('show-a.sptcal', onDisk, 1700000000000);
  launched.disk = hA.disk;
  launched.getFile = hA.getFile; launched.createWritable = hA.createWritable;
  var fakeQ = {setConsumer: function (fn) { window.__consumer = true; setTimeout(function () { fn({files: [launched], targetURL: location.href}); }, 0); }};
  try { Object.defineProperty(window, 'launchQueue', {configurable: true, get: function () { return fakeQ; }}); } catch (e) { window.__lqErr = String(e); }
  window.__pickerCalls = 0;
  window.showSaveFilePicker = async function () { window.__pickerCalls++; throw new DOMException('test', 'AbortError'); };
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, phase = window.__PHASE, cases = [];
  try { cases = JSON.parse(sessionStorage.getItem('lrec-cases') || '[]'); } catch (e) {}
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function handles(){ return window.__MEMIDB['spt-planning-cal'].handles; }
  function slots(){ return Array.from(handles().keys()).filter(function (k) { return String(k).indexOf('unsavedBackup') === 0; }).sort(); }
  function title(){ return document.getElementById('show-title').value; }
  function chip(){ var e = document.getElementById('file-menu-label'); return e ? e.textContent.trim() : null; }
  function status(){ var e = document.getElementById('save-status'); return e ? (e.textContent || '').trim() : ''; }
  function listed(){ return Array.from(document.querySelectorAll('#file-menu [data-backup]')).map(function (e) { return e.getAttribute('data-backup'); }); }
  function strip(){
    var e = document.getElementById('backup-notice');
    return {exists: !!e, shown: !!e && !e.hidden && getComputedStyle(e).display !== 'none',
            text: e ? ((e.querySelector('.ln-text') || e).textContent || '').replace(/\s+/g, ' ').trim() : null};
  }
  function next(p){ sessionStorage.setItem('lrec-cases', JSON.stringify(cases)); sessionStorage.setItem('lrec-phase', p); location.reload(); }
  var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  try {
    await T.appReady();
    if(window.__lqErr) throw new Error('could not replace window.launchQueue: ' + window.__lqErr);
    if(phase === '1'){
      var seenTitle = null, q = '';
      for(var i = 0; i < 80; i++){
        await T.sleep(100);
        q = T.modalText();
        if(/Recover unsaved work/.test(q)){ seenTitle = title(); break; }
      }
      add('R1', 'the launched file loads first, then the question asks about ITS unsaved work (today: the time alone)',
        seenTitle === 'SHOW A' && chip() === 'show-a.sptcal' && /show-a\.sptcal/.test(q) && /\(\d{1,2}:\d\d [AP]M\)/.test(q),
        {titleWhenAsked: seenTitle, chip: chip(), modal: q}, 'SHOW A on screen; "Recover unsaved work from “show-a.sptcal” (h:mm AM/PM)?"');
      T.clickModalButton('Recover');
      await T.until(function () { return title() === 'UNSAVED WORK'; }, 'the recovered work', 60, 100).catch(function () {});
      await T.sleep(1200);
      add('R2', 'Recover: the work is back, linked to show-a.sptcal, unsaved; its backup retired',
        title() === 'UNSAVED WORK' && chip() === 'show-a.sptcal' && /Unsaved/.test(status()) && slots().indexOf('unsavedBackup:crashed') === -1,
        {title: title(), chip: chip(), status: status(), slots: slots()}, 'UNSAVED WORK; show-a.sptcal; Unsaved changes; crashed gone');
      document.getElementById('save-file-btn').click();
      await T.sleep(1500);
      var w = window.__hA.disk.writes, last = w.length ? JSON.parse(w[w.length - 1]) : null;
      add('R3', 'Save writes it straight into show-a.sptcal (no picker, no conflict)',
        window.__pickerCalls === 0 && !!last && last.fields.byId['show-title'].value === 'UNSAVED WORK' && !/changed on disk/i.test(status() + T.modalText()),
        {pickerCalls: window.__pickerCalls, writes: w.length, written: last && last.fields.byId['show-title'].value, status: status(), modal: T.modalText()},
        '0 picker calls; UNSAVED WORK written');
      next('2'); return;
    }
    var at = (handles().get('unsavedBackup:crashb') || {}).at || 0, d = new Date(at);
    var day = DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
    await T.until(function () { return title() === 'SHOW A'; }, 'the launched calendar', 80, 100);
    var dlg = '';
    for(i = 0; i < 25; i++){ await T.sleep(100); dlg = T.modalText(); if(dlg) break; }
    await T.until(function () { return strip().shown; }, 'the kept-work strip', 40, 100).catch(function () {});
    var s = strip();
    if(phase === '2'){
      add('R4', 'another file\'s backup: show-a loads with no dialog, and a strip says show-b.sptcal\'s work was kept (with its date)',
        title() === 'SHOW A' && !dlg && s.shown && /show-b\.sptcal/.test(s.text) && s.text.indexOf(day) !== -1 && /kept/i.test(s.text)
          && !!document.querySelector('#backup-notice .ln-go'),
        {title: title(), modal: dlg, strip: s}, 'no dialog; "Unsaved work from show-b.sptcal (' + day + ', …) was kept." + Recover');
      var x = document.querySelector('#backup-notice .ln-x');
      if(x) x.click();
      await T.sleep(1000);
      add('R5', 'the x hides it; the backup is kept and the file menu lists it',
        !strip().shown && slots().indexOf('unsavedBackup:crashb') !== -1 && listed().indexOf('unsavedBackup:crashb') !== -1,
        {strip: strip(), slots: slots(), listed: listed()}, 'hidden; kept; listed');
      next('3'); return;
    }
    T.set('show-title', 'EDITED SHOW A'); await T.sleep(800);
    var go = document.querySelector('#backup-notice .ln-go');
    if(go) go.click();
    await T.until(function () { return !!T.modalText(); }, 'the unsaved-changes question', 40, 100).catch(function () {});
    var guard = T.modalText();
    T.clickModalButton('Recover');
    await T.until(function () { return title() === 'SHOW B UNSAVED'; }, 'show-b\'s work', 60, 100).catch(function () {});
    await T.sleep(1200);
    add('R6', 'the strip\'s Recover (unsaved work on screen) asks first, then brings show-b\'s work back linked to show-b.sptcal',
      s.shown && /unsaved changes/i.test(guard) && title() === 'SHOW B UNSAVED' && chip() === 'show-b.sptcal' && !strip().shown
        && slots().indexOf('unsavedBackup:crashb') === -1,
      {stripBefore: s, modal: guard, title: title(), chip: chip(), strip: strip(), slots: slots()},
      'asked; SHOW B UNSAVED; show-b.sptcal; strip gone; crashb retired');
  } catch (e) { cases.push({id: 'EX', title: 'harness (phase ' + phase + ')', pass: null, observed: String(e && e.stack || e)}); }
  try { ['lrec-phase', 'lrec-cases'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
  T.done({test: 'launchrecover', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
