// backuplinkstale -- recovered work goes back into its file, but never OVER a newer save of that file (owner, 4 Nov
// 2026; backuplink has the plain case).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backuplinkstale 120
//
// What the crashed page left: a recents entry for show-a.sptcal and a backup naming it, with the file's stamp as that
// page last saw it. Since then show-a.sptcal was saved somewhere else (a later mtime on disk), and the new window has
// not been allowed to write it yet (queryPermission says 'prompt' until Save's click asks).
// - S1: recovered into the file, and the status line says Save must ask permission first.
// - S2: Save asks for permission, then asks before overwriting the newer file (audit M-6's question), because the
//   stamp it compares is the BACKUP's, not a fresh read taken at recovery.
// - S3: Overwrite writes the recovered work into show-a.sptcal, with no Save picker.
window.__T.memoryIDB();
var DISK = (function seed(){
  var x = new XMLHttpRequest();                      // synchronous: this must land before boot
  x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var onDisk = x.responseText, work = JSON.parse(onDisk);
  work.fields.byId['show-title'] = {value: 'RECOVERED WORK'};
  var disk = {text: onDisk, mtime: 1700000000000, writes: [], pickerCalls: 0, permAsks: 0, granted: false};
  var h = {name: 'show-a.sptcal', kind: 'file',
    queryPermission: async function(){ return disk.granted ? 'granted' : 'prompt'; },
    requestPermission: async function(){ disk.permAsks++; disk.granted = true; return 'granted'; },
    isSameEntry: async function(o){ return o === h; },
    getFile: async function(){ return new File([disk.text], 'show-a.sptcal', {lastModified: disk.mtime}); },
    createWritable: async function(){ var parts = []; return {
      write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); },
      close: async function(){ disk.text = parts.join(''); disk.mtime += 1000; disk.writes.push(disk.text); } }; } };
  var now = Date.now();
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['recentFiles', [{id: 'f1', handle: h, name: 'show-a.sptcal', savedAt: now - 120000}]],
    ['activeFileId', 'f1'],
    // The crashed page last saw the file 5 minutes before it is now on disk.
    ['unsavedBackup:crashed', {state: work, at: now - 60000, fileName: 'show-a.sptcal', fileId: 'f1',
      fileStamp: {lastModified: disk.mtime - 300000, size: new Blob([onDisk]).size}}]
  ])};
  window.showSaveFilePicker = async function(){ disk.pickerCalls++; throw new DOMException('test: no picker expected', 'AbortError'); };
  return disk;
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function label(){ return ((document.getElementById('file-menu-label') || {}).textContent || '').trim(); }
  function status(){ return ((document.getElementById('save-status') || {}).textContent || '').trim(); }
  function titleIn(text){ try { return JSON.parse(text).fields.byId['show-title'].value; } catch(e){ return null; } }
  try {
    var asked = false;
    for(var g = 0; g < 60; g++){ await T.sleep(100); if(/Recover unsaved work/.test(T.modalText())){ asked = true; break; } }
    T.clickModalButton('Recover');
    await T.sleep(1500);
    add('S1', 'recovered into show-a.sptcal, and the status line says Save must ask permission first',
      asked && document.getElementById('show-title').value === 'RECOVERED WORK' && label().indexOf('show-a.sptcal') !== -1 && /Autosave needs permission/.test(status()),
      {asked: asked, title: document.getElementById('show-title').value, label: label(), status: status()},
      'RECOVERED WORK; label show-a.sptcal; "Autosave needs permission — click Save"');

    await T.sleep(700);
    document.getElementById('save-file-btn').click();
    var q = '';
    for(var i = 0; i < 40; i++){ await T.sleep(100); q = T.modalText(); if(/File changed on disk/.test(q)) break; }
    add('S2', 'Save asks permission, then asks before overwriting the file saved elsewhere since the crash; nothing written yet',
      DISK.permAsks === 1 && /File changed on disk/.test(q) && DISK.writes.length === 0,
      {permAsks: DISK.permAsks, modal: q, writes: DISK.writes.length}, '1 permission ask; "File changed on disk"; 0 writes');

    T.clickModalButton('Overwrite');
    await T.sleep(1500);
    add('S3', 'Overwrite writes the recovered work into show-a.sptcal, with no Save picker',
      DISK.pickerCalls === 0 && DISK.writes.length === 1 && titleIn(DISK.writes[0]) === 'RECOVERED WORK' && /^Saved/.test(status()),
      {pickerCalls: DISK.pickerCalls, writes: DISK.writes.length, written: DISK.writes.length ? titleIn(DISK.writes[0]) : null, status: status()},
      '0 picker calls; 1 write holding RECOVERED WORK; Saved');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'backuplinkstale', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
