// conflict -- the linked calendar file changed on disk since it was loaded: autosave PAUSES and Save
// ASKS (FIX-PLAN.md 2.8; AUDIT-REPORT M-6, L-18; owner ruling R4: "pause and ask").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh conflict 2400
//
// ⚠️ The budget is VIRTUAL seconds and the leg needs ~32 minutes of them: autosave ticks every 10
// minutes, and under --virtual-time-budget a T.sleep() of 10.5 minutes fast-forwards while the page is
// idle, costing a few real seconds.
//
// The file is show-a.sptcal behind openViaFakePicker's recording handle, and `ctl.touch(text)` plays
// the part of someone else writing it: another window, a colleague on a shared drive, a sync client.
// On v1.3.0 Save and autosave wrote straight over that, and the other person's work was gone with no
// message on either side.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function title(){ return document.getElementById('show-title').value; }
  function status(){ return ((document.querySelector('.save-status') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function writtenTitle(w){ try { return JSON.parse(w.text).fields.byId['show-title'].value; } catch(e){ return '(unparseable)'; } }
  function theirs(base, t){ var o = JSON.parse(base); o.fields.byId['show-title'] = {value: t}; return JSON.stringify(o, null, 1); }
  async function clickSave(){ document.getElementById('save-file-btn').click(); await T.sleep(600); }
  async function waitModal(re){ for(var g = 0; g < 40; g++){ if(re.test(T.modalText())) return true; await T.sleep(100); } return false; }
  var writes = [], ctl = {};
  try {
    var p = T.openViaFakePicker('/tests/fixtures/show-a.sptcal', 'show-a.sptcal', {writes: writes, control: ctl});
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(2000);
    var base = ctl.text();
    add('C0', 'show-a loaded through the picker, clean', title() === 'SHOW A' && writes.length === 0, {title: title(), status: status()}, 'SHOW A');

    // C1 -- someone else saves the file; we edit and press Save. Nothing is written until we choose.
    ctl.touch(theirs(base, 'SHOW A (theirs)'));
    T.set('show-title', 'SHOW A (mine)'); await T.sleep(700);
    await clickSave();
    var asked = await waitModal(/changed on disk/i);
    add('C1', 'Save on a file changed since it was loaded ASKS first, and writes nothing yet',
      asked && writes.length === 0, {modal: T.modalText(), writes: writes.length}, 'a "changed on disk" dialog, 0 writes');
    T.clickModalButton('Cancel'); await T.sleep(500);
    add('C1c', 'Cancel writes nothing and leaves the edit unsaved', writes.length === 0 && title() === 'SHOW A (mine)' && /unsaved|changed/i.test(status()),
      {writes: writes.length, status: status()}, '0 writes, still unsaved');

    // C2 -- Overwrite.
    await clickSave();
    await waitModal(/changed on disk/i);
    T.clickModalButton('Overwrite'); await T.sleep(900);
    add('C2', 'Overwrite writes OUR calendar into the file', writes.length === 1 && writtenTitle(writes[0]) === 'SHOW A (mine)',
      {writes: writes.map(writtenTitle)}, '1 write: SHOW A (mine)');

    // C3 -- a later outside change, then Load newer version: theirs replaces ours, nothing written.
    ctl.touch(theirs(base, 'SHOW A (theirs 2)'));
    T.set('show-title', 'SHOW A (mine 2)'); await T.sleep(700);
    await clickSave();
    await waitModal(/changed on disk/i);
    T.clickModalButton('Load newer version'); await T.sleep(2000);
    add('C3', 'Load newer version replaces the calendar with the file as it now is, writing nothing',
      title() === 'SHOW A (theirs 2)' && writes.length === 1, {title: title(), writes: writes.length}, 'SHOW A (theirs 2), still 1 write');

    // C4 -- L-18: an autosave tick while a note editor is open must not commit and close it.
    T.set('show-title', 'SHOW A (mine 3)'); await T.sleep(700);
    if(!document.querySelector('#table-wrap td.sheet-note-cell')){ document.getElementById('view-sheet-btn').click(); await T.sleep(800); }
    var cell = document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-08-10"]') || document.querySelector('#table-wrap td.sheet-note-cell');
    cell.click(); await T.sleep(400);
    var ta = document.querySelector('.note-editor textarea');
    if(ta){ ta.value = 'Half-typed note'; ta.dispatchEvent(new Event('input', {bubbles: true})); }
    await T.sleep(10.5 * 60 * 1000);
    var ta2 = document.querySelector('.note-editor textarea');
    add('C4', 'an autosave tick while a note editor is open leaves the editor open, text and all',
      !!ta && !!ta2 && ta2.value === 'Half-typed note' && writes.length === 1, {editorOpen: !!ta2, value: ta2 && ta2.value, writes: writes.length}, 'open, "Half-typed note", no write');
    if(ta2) ta2.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(400);
    await T.sleep(10.5 * 60 * 1000);
    add('C4b', '...and once the editor is closed, the next tick autosaves', writes.length === 2 && writtenTitle(writes[1]) === 'SHOW A (mine 3)',
      {writes: writes.map(writtenTitle)}, '2 writes, the second SHOW A (mine 3)');

    // C5 -- autosave meets a file changed on disk: it PAUSES, and says so.
    ctl.touch(theirs(base, 'SHOW A (theirs 3)'));
    T.set('show-title', 'SHOW A (mine 4)'); await T.sleep(700);
    await T.sleep(10.5 * 60 * 1000);
    add('C5', 'autosave on a file changed on disk writes nothing and says "changed on disk"',
      writes.length === 2 && /changed on disk/i.test(status()), {writes: writes.length, status: status(), fileNow: JSON.parse(ctl.text()).fields.byId['show-title'].value}, '2 writes still, status names the change');

    // C6 -- Save a copy: the picker's new file gets our calendar, theirs is left alone.
    var copyWrites = [];
    var copyHandle = {
      name: 'show-a copy.sptcal', kind: 'file',
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === copyHandle; },
      getFile: async function(){ return new File([copyWrites.length ? copyWrites[copyWrites.length - 1] : ''], 'show-a copy.sptcal', {lastModified: 1}); },
      createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ copyWrites.push(parts.join('')); } }; }
    };
    window.showSaveFilePicker = async function(){ return copyHandle; };
    await clickSave();
    await waitModal(/changed on disk/i);
    T.clickModalButton(/^Save a copy/); await T.sleep(1200);
    var copyTitle = copyWrites.length ? JSON.parse(copyWrites[0]).fields.byId['show-title'].value : null;
    add('C6', 'Save a copy writes our calendar to a NEW file and leaves the changed one untouched',
      copyTitle === 'SHOW A (mine 4)' && writes.length === 2 && JSON.parse(ctl.text()).fields.byId['show-title'].value === 'SHOW A (theirs 3)',
      {copyTitle: copyTitle, originalWrites: writes.length, status: status()}, 'copy = SHOW A (mine 4); original still theirs');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'conflict', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
