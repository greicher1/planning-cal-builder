// backupslots -- one crash-backup slot per page; recovery offers the newest; a save deletes only its
// own (FIX-PLAN.md 2.8 / §0 default; AUDIT-REPORT SAVE-7).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backupslots 120
//
// On v1.3.0 there was ONE slot for the whole origin ('unsavedBackup'): tab B's Save deleted tab A's
// recovery copy, and two tabs overwrote each other's. The leg seeds the in-memory IndexedDB BEFORE
// the engine boots with two leftovers: the old single slot (as a v1.3.0 page would have left it) and
// a newer per-page slot from some other page.
window.__T.memoryIDB();
(function seed(){
  var x = new XMLHttpRequest();                      // synchronous: this must land before boot
  x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var a = JSON.parse(x.responseText), b = JSON.parse(x.responseText);
  a.fields.byId['show-title'] = {value: 'OLDER LEGACY BACKUP'};
  b.fields.byId['show-title'] = {value: 'NEWER OTHER PAGE'};
  var now = Date.now();
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['unsavedBackup', {state: a, at: now - 3600000, fileName: 'legacy.sptcal'}],
    ['unsavedBackup:otherpage', {state: b, at: now - 60000, fileName: 'other.sptcal'}]
  ])};
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function slots(){ return Array.from(window.__MEMIDB['spt-planning-cal'].handles.keys()).filter(function (k) { return String(k).indexOf('unsavedBackup') === 0; }).sort(); }
  function ownSlots(){ return slots().filter(function (k) { return k !== 'unsavedBackup' && k !== 'unsavedBackup:otherpage'; }); }
  try {
    var asked = false;
    for(var g = 0; g < 60; g++){ await T.sleep(100); if(/Recover unsaved work/.test(T.modalText())){ asked = true; break; } }
    var offer = T.modalText();
    add('B1', 'recovery offers the NEWEST backup any page left (other.sptcal), not the old single slot',
      asked && /other\.sptcal/.test(offer) && !/legacy\.sptcal/.test(offer), {modal: offer}, '"Recover unsaved work from “other.sptcal”"');
    T.clickModalButton('Recover');
    await T.sleep(1500);
    var s = slots();
    add('B2', 'recovered: the calendar is that backup, its slot is retired, and THIS page backs it up at once',
      document.getElementById('show-title').value === 'NEWER OTHER PAGE' && s.indexOf('unsavedBackup:otherpage') === -1 && ownSlots().length === 1,
      {title: document.getElementById('show-title').value, slots: s}, 'NEWER OTHER PAGE; otherpage gone; one own slot');
    add('B3', 'the older, unrecovered v1.3.0 slot is left alone', s.indexOf('unsavedBackup') !== -1, {slots: s}, 'unsavedBackup still there');

    // An edit updates this page's own slot -- and only it.
    T.set('show-title', 'EDITED HERE'); await T.sleep(3600);
    var own = ownSlots(), ownVal = own.length ? window.__MEMIDB['spt-planning-cal'].handles.get(own[0]) : null;
    add('B4', 'an edit backs up into this page\'s own slot', own.length === 1 && ownVal && ownVal.state.fields.byId['show-title'].value === 'EDITED HERE',
      {own: own, title: ownVal && ownVal.state.fields.byId['show-title'].value}, 'one own slot, EDITED HERE');

    // Save to a new file: this page's slot goes; the other page's leftover stays.
    var writes = [];
    var h = { name: 'mine.sptcal', kind: 'file',
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === h; },
      getFile: async function(){ return new File([writes.length ? writes[writes.length - 1] : ''], 'mine.sptcal', {lastModified: 5}); },
      createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ writes.push(parts.join('')); } }; } };
    window.showSaveFilePicker = async function(){ return h; };
    document.getElementById('save-file-btn').click();
    await T.sleep(1500);
    var s5 = slots();
    add('B5', 'a Save deletes ONLY this page\'s slot', writes.length === 1 && ownSlots().length === 0 && s5.indexOf('unsavedBackup') !== -1,
      {writes: writes.length, slots: s5}, '1 write; no own slot; the other leftover kept');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'backupslots', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
