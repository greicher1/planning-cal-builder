// backupswept -- two slips the 14 Nov 2026 review of item 3.7 (crash recovery, AUD2-056) found:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backupswept 120
//
// 1. A recovery question closed because ANOTHER dialog opened over it was counted as a No. Dialogs.jsx never stacks two
//    dialogs: a second answers the first, and it answered it `false`, the same as the user's own Cancel. Two launches
//    whose question something else swept away, and the launch never asked again, the user having said nothing.
// 2. The file menu's "Unsaved work" was redrawn only on a pointerdown on its button, so a menu opened with no pointer
//    (Enter or Space on the focused button; a `.click()` here, which fires no pointerdown either) listed what was kept
//    at launch, not what is kept now.
//
// Two loads of one page (backupdecline's reload pattern; the in-memory IndexedDB carried in sessionStorage):
//
//   S1  launch 1: a dialog opening over the question (the menu entry's Discard, clicked behind it) closes the question,
//       and that is NOT counted as a No: the backup's record has no `declined`
//   S2  launch 2: asked again (so neither the swept question nor anything else counted)
//   S3  ...Escape on it IS the user's No, and counts: `declined` 1
//   S4  a backup kept after launch (a window closed since) is listed when the menu is opened without a pointer
(function () {
  var phase = '1'; try { phase = sessionStorage.getItem('bswept-phase') || '1'; } catch (e) {}
  window.__PHASE = phase;
  window.__T.memoryIDB();
  var entries = null;
  try { entries = JSON.parse(sessionStorage.getItem('bswept-idb') || 'null'); } catch (e) {}
  if(phase !== '1' && entries){
    window.__MEMIDB['spt-planning-cal'] = {handles: new Map(entries)};
    return;
  }
  var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var old = JSON.parse(x.responseText); old.fields.byId['show-title'] = {value: 'OLD WORK'};
  window.__OLD = old;
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['unsavedBackup:lastweek', {state: old, at: Date.now() - 6 * 864e5, fileName: 'show-a.sptcal'}]
  ])};
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, phase = window.__PHASE, cases = [];
  try { cases = JSON.parse(sessionStorage.getItem('bswept-cases') || '[]'); } catch (e) {}
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function handles(){ return window.__MEMIDB['spt-planning-cal'].handles; }
  function rec(){ return handles().get('unsavedBackup:lastweek') || null; }
  function listed(){ return Array.from(document.querySelectorAll('#file-menu [data-backup]')).map(function (e) { return e.getAttribute('data-backup'); }); }
  async function asked(ms){ for(var i = 0; i < ms / 100; i++){ await T.sleep(100); var m = T.modalText(); if(/Recover unsaved work/.test(m)) return m; } return ''; }
  function next(p){
    sessionStorage.setItem('bswept-idb', JSON.stringify(Array.from(handles().entries())));
    sessionStorage.setItem('bswept-cases', JSON.stringify(cases));
    sessionStorage.setItem('bswept-phase', p);
    location.reload();
  }
  try {
    await T.appReady();
    if(phase === '1'){
      var q1 = await asked(8000);
      // The entry's Discard is in the DOM behind the question (the menu is keepMounted, and the launch drew the list
      // before asking). Clicked there, it opens its own question, which closes the recovery question unanswered.
      await T.until(function () { return !!document.querySelector('#file-menu [data-backup-discard="unsavedBackup:lastweek"]'); },
        'the menu entry\'s Discard', 40, 100).catch(function () {});
      var dis = document.querySelector('#file-menu [data-backup-discard="unsavedBackup:lastweek"]');
      if(dis) dis.click();
      var over = '';
      for(var i = 0; i < 40; i++){ await T.sleep(100); over = T.modalText(); if(/Discard/.test(over)) break; }
      await T.sleep(600);
      var r1 = rec();
      add('S1', 'a dialog opening over the recovery question closes it, and that is not counted as a No',
        /Recover unsaved work/.test(q1) && /Discard/.test(over) && !!r1 && !(r1.declined > 0),
        {asked: q1, over: over, declined: r1 && r1.declined, kept: !!r1}, 'asked; Discard\'s question over it; kept; declined absent');
      T.clickModalButton('Cancel'); await T.sleep(800);
      next('2'); return;
    }
    var q2 = await asked(8000);
    add('S2', 'launch 2: asked again', /Recover unsaved work/.test(q2), {modal: q2}, 'asked');
    var content = document.querySelector('.mantine-Modal-content');
    if(content) content.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', code: 'Escape', bubbles: true}));
    await T.until(function () { return !T.modalText(); }, 'the question closed by Escape', 40, 100).catch(function () {});
    await T.sleep(800);
    var r2 = rec();
    add('S3', 'Escape is the user\'s own No, and counts once', !T.modalText() && !!r2 && r2.declined === 1,
      {modal: T.modalText(), declined: r2 && r2.declined}, 'closed; declined 1');

    // A window closed after this one launched leaves its backup behind.
    var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
    var other = JSON.parse(x.responseText); other.fields.byId['show-title'] = {value: 'CLOSED WINDOW'};
    handles().set('unsavedBackup:closedwin', {state: other, at: Date.now() - 30000, fileName: 'show-c.sptcal'});
    var before = listed();
    document.querySelector('.file-menu-btn').click();   // no pointerdown: what Enter or Space on the button gives
    await T.until(function () { return listed().indexOf('unsavedBackup:closedwin') !== -1; }, 'the redrawn list', 30, 100).catch(function () {});
    var after = listed();
    add('S4', 'the menu opened without a pointer lists a backup kept since launch',
      before.indexOf('unsavedBackup:closedwin') === -1 && after.indexOf('unsavedBackup:closedwin') !== -1 && after.indexOf('unsavedBackup:lastweek') !== -1,
      {before: before, after: after}, 'closedwin absent before, listed after (with lastweek)');
    document.querySelector('.file-menu-btn').click();
  } catch (e) { cases.push({id: 'EX', title: 'harness (phase ' + phase + ')', pass: null, observed: String(e && e.stack || e)}); }
  try { ['bswept-phase', 'bswept-idb', 'bswept-cases'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
  T.done({test: 'backupswept', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
