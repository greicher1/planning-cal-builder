// backuplink -- recovered work goes back into the file it came from, and a calendar already saved is never offered
// as "Recover unsaved work" (owner, 4 Nov 2026: "sometimes when we reopen the app, it loads the last calendar we were
// on but as an unsaved, untitled duplicate").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backuplink 120
//
// Two causes, one case each:
// - L2/L3: recovery restored the state and nothing else, so work on show-a.sptcal came back Untitled and Save asked
//   for a NEW file. The leg seeds the in-memory IndexedDB BEFORE the engine boots with what the crashed page left:
//   a recents entry for show-a.sptcal and a backup that names it (fileId, fileStamp).
// - L4: writeBackup() runs 3 s after an edit, and a Save inside those 3 s deleted the slot BEFORE the timer wrote it
//   back, so the saved calendar was offered for recovery at the next launch.
// The file changed on disk since the crash, and a file the new window may not write yet, are backuplinkstale's.
window.__T.memoryIDB();
var DISK = (function seed(){
  var x = new XMLHttpRequest();                      // synchronous: this must land before boot
  x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var onDisk = x.responseText, work = JSON.parse(onDisk);
  work.fields.byId['show-title'] = {value: 'RECOVERED WORK'};
  var disk = {text: onDisk, mtime: 1700000000000, writes: [], pickerCalls: 0};
  var h = {name: 'show-a.sptcal', kind: 'file',
    queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
    isSameEntry: async function(o){ return o === h; },
    getFile: async function(){ return new File([disk.text], 'show-a.sptcal', {lastModified: disk.mtime}); },
    createWritable: async function(){ var parts = []; return {
      write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); },
      close: async function(){ disk.text = parts.join(''); disk.mtime += 1000; disk.writes.push(disk.text); } }; } };
  var now = Date.now();
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['recentFiles', [{id: 'f1', handle: h, name: 'show-a.sptcal', savedAt: now - 120000}]],
    ['activeFileId', 'f1'],
    ['unsavedBackup:crashed', {state: work, at: now - 60000, fileName: 'show-a.sptcal', fileId: 'f1',
      fileStamp: {lastModified: disk.mtime, size: new Blob([onDisk]).size}}]
  ])};
  window.showSaveFilePicker = async function(){ disk.pickerCalls++; throw new DOMException('test: no picker expected', 'AbortError'); };
  return disk;
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function handles(){ return window.__MEMIDB['spt-planning-cal'].handles; }
  function ownSlots(){ return Array.from(handles().keys()).filter(function (k) { return String(k).indexOf('unsavedBackup:') === 0 && k !== 'unsavedBackup:crashed'; }); }
  function label(){ return ((document.getElementById('file-menu-label') || {}).textContent || '').trim(); }
  function status(){ return ((document.getElementById('save-status') || {}).textContent || '').trim(); }
  function titleIn(text){ try { return JSON.parse(text).fields.byId['show-title'].value; } catch(e){ return null; } }
  try {
    var asked = false;
    for(var g = 0; g < 60; g++){ await T.sleep(100); if(/Recover unsaved work/.test(T.modalText())){ asked = true; break; } }
    var offer = T.modalText();
    add('L1', 'the launch offers to recover the work on show-a.sptcal', asked && /show-a\.sptcal/.test(offer), {modal: offer}, 'Recover unsaved work from "show-a.sptcal"');
    T.clickModalButton('Recover');
    await T.sleep(1500);
    var own = ownSlots(), ownVal = own.length ? handles().get(own[0]) : null;
    add('L2', 'recovered INTO show-a.sptcal: the file menu names it (not Untitled), the work is unsaved, and this page\'s own backup keeps the link',
      document.getElementById('show-title').value === 'RECOVERED WORK' && label().indexOf('show-a.sptcal') !== -1 && /Unsaved changes/.test(status())
        && !!ownVal && ownVal.fileId === 'f1' && !!ownVal.fileStamp,
      {title: document.getElementById('show-title').value, label: label(), status: status(), own: own, fileId: ownVal && ownVal.fileId, fileStamp: ownVal && ownVal.fileStamp},
      'RECOVERED WORK; label show-a.sptcal; Unsaved changes; own slot with fileId f1 and a stamp');

    // Save writes the recovered work back into show-a.sptcal, with no picker and no question.
    await T.sleep(700);
    document.getElementById('save-file-btn').click();
    await T.sleep(1500);
    add('L3', 'Save writes the recovered work into show-a.sptcal itself: no Save picker, no question',
      DISK.pickerCalls === 0 && DISK.writes.length === 1 && titleIn(DISK.writes[0]) === 'RECOVERED WORK' && /^Saved/.test(status()) && !T.modalText(),
      {pickerCalls: DISK.pickerCalls, writes: DISK.writes.length, written: DISK.writes.length ? titleIn(DISK.writes[0]) : null, status: status(), modal: T.modalText()},
      '0 picker calls; 1 write holding RECOVERED WORK; Saved; no modal');

    // An edit, then Save at once (inside the backup's 3 s): once the timer has come round, nothing is left to recover.
    T.set('show-title', 'SAVED QUICKLY');
    await T.sleep(200);
    document.getElementById('save-file-btn').click();
    await T.sleep(4500);
    add('L4', 'a Save inside 3 s of an edit leaves NO backup behind: the next launch has nothing to offer',
      DISK.writes.length === 2 && titleIn(DISK.writes[1]) === 'SAVED QUICKLY' && /^Saved/.test(status()) && ownSlots().length === 0,
      {writes: DISK.writes.length, written: DISK.writes.length > 1 ? titleIn(DISK.writes[1]) : null, status: status(), own: ownSlots()},
      '2 writes, the second SAVED QUICKLY; Saved; no own slot');

    // A guard: a slot is still written for real unsaved work (the change above must not stop backups).
    T.set('show-title', 'NOT SAVED');
    await T.sleep(3600);
    own = ownSlots(); ownVal = own.length ? handles().get(own[0]) : null;
    add('L5', 'unsaved work is still backed up 3 s after the edit, with its file named',
      own.length === 1 && !!ownVal && ownVal.state.fields.byId['show-title'].value === 'NOT SAVED' && ownVal.fileId === 'f1',
      {own: own, title: ownVal && ownVal.state.fields.byId['show-title'].value, fileId: ownVal && ownVal.fileId}, 'one own slot, NOT SAVED, fileId f1');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'backuplink', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
