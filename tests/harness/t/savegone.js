// savegone -- the linked file is gone (moved, renamed, deleted, a share unmounted) or can no longer be written
// (permission taken away), and the user does what the status line says: click Save. Audit AUD2-039 (and the purge half
// of AUD2-017), item 2.6. Grown from the audit's repro leg (repro/audit-a5-gone.js), which this build failed: Save
// answered every click with the browser's own words ("A requested file or directory could not be found...") and never
// offered anywhere else to put the work; a vanished recent said "Could not read that file" and stayed in the list.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh savegone 900
//
// The budget is virtual: the leg waits out one 10-minute autosave tick, which headless Chrome fast-forwards.
// The handles are fakes (mkHandle below) whose file can vanish (NotFoundError), lose its write permission
// (NotAllowedError until requestPermission grants it, or for good), or be unreadable for another reason. The OS Save
// dialog is t/lib.js's fakeSavePicker, installed for the whole leg. IndexedDB is the in-memory one (the recents list).
var T = window.__T, cases = [];
T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id) { return document.getElementById(id); }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function label() { return txt(byId('file-menu-label')); }
  function status() { return txt(byId('save-status')); }
  function recents() { return Array.prototype.map.call(document.querySelectorAll('#file-menu .file-menu-item[data-id]'), txt); }
  function weeksPost() { return byId('weeks-post').value; }
  function nf() { return new DOMException('A requested file or directory could not be found at the time an operation was processed.', 'NotFoundError'); }
  function get(u) { var x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); return x.responseText; }
  // A fake FileSystemFileHandle. gone: every read and write throws NotFoundError. perm: 'granted' or 'prompt' (a write
  // then throws NotAllowedError); answer: what requestPermission() says, and 'granted' grants. readErr: a read throws
  // that error name instead (a lock, say).
  function mkHandle(name, text) {
    var body = text, mtime = Date.now() - 60000;
    var h = {name: name, kind: 'file', writes: [], asked: 0, gone: false, perm: 'granted', answer: 'granted', readErr: null,
      queryPermission: async function () { return h.perm; },
      requestPermission: async function () { h.asked++; if (h.answer === 'granted') h.perm = 'granted'; return h.answer; },
      isSameEntry: async function (o) { return o === h; },
      getFile: async function () {
        if (h.gone) throw nf();
        if (h.readErr) throw new DOMException('test: ' + h.readErr, h.readErr);
        return new File([body], name, {type: 'application/json', lastModified: mtime});
      },
      createWritable: async function () {
        if (h.gone) throw nf();
        if (h.perm !== 'granted') throw new DOMException('The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError');
        var parts = [];
        return {write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); },
                close: async function () { body = parts.join(''); mtime = Math.max(Date.now(), mtime + 1000); h.writes.push(body); }};
      }};
    return h;
  }
  function written(s) { try { return JSON.parse(s).fields.byId['weeks-post'].value; } catch (e) { return '?'; } }
  // Load... through the real file menu (its unsaved-work question answered Load).
  async function load(h) {
    var called = false;
    window.showOpenFilePicker = async function () { called = true; return [h]; };
    await menuItem('[data-action="open"]').then(function (e) { e.click(); });
    for (var i = 0; i < 60 && !called; i++) { await T.sleep(100); if (/Load another calendar/.test(T.modalText())) T.clickModalButton('Load'); }
    await T.until(function () { return label() === h.name; }, 'Load ' + h.name, 200, 100);
    await T.sleep(1200);
  }
  // The file menu's dropdown mounts on its first opening (then stays mounted): open it once, then click inside it.
  async function menuItem(sel) {
    if (!document.querySelector('#file-menu')) {
      document.querySelector('.file-menu-btn').click();
      await T.until(function () { return !!document.querySelector('#file-menu .file-menu-item[data-action="open"]'); }, 'the file menu', 200, 100);
    }
    return document.querySelector('#file-menu .file-menu-item' + sel);
  }
  async function pickRecent(name) {
    await menuItem('[data-id]');
    Array.prototype.forEach.call(document.querySelectorAll('#file-menu .file-menu-item[data-id]'), function (e) { if (txt(e) === name) e.click(); });
  }
  async function saveFree() {
    await T.sleep(1400);   // flashSaveBtn holds the button for 1.2 s
    await T.until(function () { var b = byId('save-file-btn'); return b && !b.disabled; }, 'the Save button', 200, 100);
  }
  // Waits for A dialog, not for the expected one, so a wrong dialog is recorded as the case's observation (and fails
  // it) rather than timing out with nothing to show. `re` only says what the leg is waiting for.
  async function modal(re, what) { await T.until(function () { return !!T.modalText(); }, what + ' (' + re + ')', 200, 100); await T.sleep(200); return T.modalText(); }
  async function answer(lbl) { T.clickModalButton(lbl); await T.until(function () { return !T.modalText(); }, 'the dialog to close', 100, 100); await T.sleep(400); }
  var RAW = /requested file or directory|not allowed by the user agent|Something went wrong/;
  try {
    await T.appReady();
    var pick = T.fakeSavePicker();   // the OS Save dialog, for the whole leg
    var D = mkHandle('Old Draft.sptcal', get('/tests/fixtures/show-a.sptcal'));
    var A = mkHandle('Harbor Lights.sptcal', get('/tests/fixtures/v1.13.0-saved.sptcal'));
    var B = mkHandle('Pier Nine.sptcal', get('/tests/fixtures/v1.4.2-saved.sptcal'));
    var C = mkHandle('Corner Store.sptcal', get('/tests/fixtures/show-a.sptcal'));
    await load(D);
    await load(A);

    // ---- G: the linked file disappears; autosave notices; Save explains and offers Save As ----------------------
    T.set('weeks-post', '10'); await T.sleep(1200);
    A.gone = true;
    await T.sleep(10.5 * 60 * 1000);   // one autosave tick
    var st = status();
    add('G0', 'autosave notices the linked file is gone and says to click Save', /Autosave failed/.test(st), {status: st}, 'Autosave failed - click Save');
    byId('save-file-btn').click();
    var m1 = await modal(/File not found/, 'Save\'s "file not found" dialog');
    add('G1', 'Save explains in plain words (moved, renamed or deleted) and offers Save As, never the browser\'s raw error',
      /“Harbor Lights\.sptcal” can’t be found/.test(m1) && /moved, renamed or deleted/.test(m1) && /Save As/.test(m1) && !RAW.test(m1) && pick.calls.length === 0,
      {modal: m1, pickerCalls: pick.calls.length}, 'names the file, says moved/renamed/deleted, a Save As button; no picker yet');
    add('G2', 'the dead file has left Recents and is no longer the linked file',
      recents().indexOf('Harbor Lights.sptcal') === -1 && recents().indexOf('Old Draft.sptcal') !== -1 && label() === 'Untitled',
      {recents: recents(), label: label()}, 'Harbor Lights gone, Old Draft kept; label Untitled');
    await answer('Cancel');
    add('G3', 'Cancel keeps the work on screen, writes nothing, and the status line says autosave needs a file',
      weeksPost() === '10' && A.writes.length === 0 && pick.calls.length === 0 && /Autosave needs a file/.test(status()),
      {weeksPost: weeksPost(), writes: A.writes.length, pickerCalls: pick.calls.length, status: status()}, '10; nothing written; Autosave needs a file');
    await saveFree();
    byId('save-file-btn').click();
    await T.until(function () { return pick.files.length === 1; }, 'the Save picker write', 200, 100);
    await T.sleep(800);
    var f1 = new TextDecoder().decode(pick.files[0].bytes);
    add('G4', 'the next Save goes straight to the Save dialog (nothing is linked) and keeps the work',
      pick.calls.length === 1 && written(f1) === '10' && !T.modalText() && /^Saved/.test(status()),
      {pickerCalls: pick.calls.length, written: written(f1), modal: T.modalText(), status: status()}, 'one picker call; 10 written; Saved');

    // ---- S: Save on a vanished file, answered Save As ----------------------------------------------------------
    await saveFree();
    await load(B);
    T.set('weeks-post', '9'); await T.sleep(1200);
    B.gone = true;
    byId('save-file-btn').click();
    await modal(/File not found/, 'the dialog for Pier Nine');
    T.clickModalButton('Save As…');
    await T.until(function () { return pick.files.length === 2; }, 'the Save As write', 200, 100);
    await T.sleep(1000);
    var f2 = new TextDecoder().decode(pick.files[1].bytes);
    add('S1', 'Save As from the dialog suggests the lost file\'s own name and writes the calendar there',
      pick.calls.length === 2 && pick.calls[1].suggestedName === 'Pier Nine.sptcal' && written(f2) === '9' && /^Saved/.test(status()) && !T.modalText(),
      {suggested: pick.calls[1].suggestedName, written: written(f2), status: status(), modal: T.modalText()}, 'Pier Nine.sptcal; 9 written; Saved');
    await saveFree();
    T.set('weeks-post', '8'); await T.sleep(1200);
    byId('save-file-btn').click();
    await T.until(function () { return pick.files.length === 3; }, 'Save into the new file', 200, 100);
    await T.sleep(600);
    // ⚠️ fakeSavePicker's handle keeps ONE parts list for every writer, so a second write to it holds both bodies:
    // read the last chunk written (saveToFile writes the file as one string).
    var lastChunk = function (f) { var p = f.parts[f.parts.length - 1]; return typeof p === 'string' ? p : ''; };
    add('S2', 'the new file is the linked one: the next Save writes to it with no dialog and no picker',
      pick.calls.length === 2 && pick.files.length === 3 && written(lastChunk(pick.files[2])) === '8' && B.writes.length === 0 &&
      recents().filter(function (r) { return r === 'Pier Nine.sptcal'; }).length === 1,
      {pickerCalls: pick.calls.length, writes: pick.files.length, written: written(lastChunk(pick.files[pick.files.length - 1])),
       deadWrites: B.writes.length, recents: recents()}, 'written to the new file; Pier Nine listed once');

    // ---- P: write permission taken away ------------------------------------------------------------------------
    await saveFree();
    await load(C);
    T.set('weeks-post', '7'); await T.sleep(1200);
    C.perm = 'prompt'; C.answer = 'granted';
    byId('save-file-btn').click();
    await T.until(function () { return C.writes.length === 1; }, 'Save after asking for permission', 200, 100);
    await T.sleep(600);
    add('P1', 'permission lost: Save asks for it once (a Save is a click) and writes, with no dialog of its own',
      C.asked === 1 && written(C.writes[0]) === '7' && !T.modalText() && pick.calls.length === 2,
      {asked: C.asked, written: written(C.writes[0]), modal: T.modalText(), pickerCalls: pick.calls.length}, 'asked 1; 7 written; no dialog; no picker');
    await saveFree();
    T.set('weeks-post', '6'); await T.sleep(1200);
    C.perm = 'prompt'; C.answer = 'denied';
    byId('save-file-btn').click();
    var m2 = await modal(/Couldn’t save/, 'the permission-refused dialog');
    add('P2', 'permission refused: Save says SPTCal is not allowed to change the file and offers Save As (no raw error)',
      /isn’t allowed to change “Corner Store\.sptcal”/.test(m2) && /Save As/.test(m2) && !RAW.test(m2) && C.asked === 2,
      {modal: m2, asked: C.asked}, 'not allowed to change Corner Store.sptcal; Save As; asked 2');
    await answer('Cancel');
    add('P3', 'a file that is still there stays linked and listed after Cancel',
      label() === 'Corner Store.sptcal' && recents().indexOf('Corner Store.sptcal') !== -1 && weeksPost() === '6' && C.writes.length === 1,
      {label: label(), recents: recents(), weeksPost: weeksPost(), writes: C.writes.length}, 'still Corner Store; listed; 6 on screen; nothing more written');

    // ---- R: picking a recent whose file is gone ----------------------------------------------------------------
    D.gone = true;
    var before = recents();
    await pickRecent('Old Draft.sptcal');
    await modal(/Load another calendar/, 'the unsaved-work question');
    T.clickModalButton('Load');   // the notice follows at once, so the screen is never empty in between
    await T.until(function () { return !/Load another calendar/.test(T.modalText()) && !!T.modalText(); }, 'the vanished-recent notice', 200, 100);
    var m3 = T.modalText();
    add('R1', 'a recent whose file is gone: says so, and takes it off the list',
      /“Old Draft\.sptcal” can’t be found/.test(m3) && /taken off your recent files/.test(m3) && recents().indexOf('Old Draft.sptcal') === -1,
      {modal: m3, before: before, after: recents()}, 'notice; Old Draft gone from the list');
    await answer('OK');
    add('R2', '...and the calendar on screen is untouched and still linked',
      label() === 'Corner Store.sptcal' && weeksPost() === '6', {label: label(), weeksPost: weeksPost()}, 'Corner Store; 6');
    C.perm = 'granted'; C.answer = 'granted'; C.readErr = 'NotReadableError';
    await pickRecent('Corner Store.sptcal');
    await modal(/Load another calendar/, 'the unsaved-work question (2)');
    T.clickModalButton('Load');
    await T.until(function () { return !/Load another calendar/.test(T.modalText()) && !!T.modalText(); }, 'the unreadable-file notice', 200, 100);
    var m4 = T.modalText();
    add('R3', 'a recent that cannot be read for another reason (a lock) keeps its entry and its link',
      recents().indexOf('Corner Store.sptcal') !== -1 && label() === 'Corner Store.sptcal', {modal: m4, recents: recents(), label: label()}, 'kept');
    await answer('OK');

    var errs = T.appHealth().errors.filter(function (e) { return e.indexOf('warn:') !== 0; });
    add('E0', 'no console errors or exceptions (warnings are the expected diagnostics)', errs.length === 0, {errors: T.appHealth().errors.slice(0, 8)}, '[]');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception');
    out.modal = T.modalText();
  }
  T.done(out);
})(); });
