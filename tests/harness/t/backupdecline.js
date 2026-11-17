// backupdecline -- a crash backup from last week, declined (audit AUD2-056, item 3.7; default "show the backup's
// date; after a second No stop asking at launch and keep the backup under the file menu").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh backupdecline 150
//
// Before: the launch question showed the time of day only ("(12:17 AM)" for a backup six days old), and a Cancel
// kept the backup, so EVERY later launch opened on the same question, with nothing in the app to reach it otherwise.
// Three launches here, as three loads of one page (the nofsa leg's reload pattern): the in-memory IndexedDB is
// carried across each reload in sessionStorage, so launch 2 and 3 see what launch 1 and 2 left.
//
//   D1  launch 1: the question names the backup's DATE (it is not from today), not the time alone
//   D2  ...Cancel keeps the backup, and the file menu lists it under "Unsaved work", with its date
//   D3  launch 2: asked again (one accidental No is not final)
//   D4  launch 3, after the second No: no question at all; the backup is still kept and still in the file menu
//   D5  the file menu's entry, with unsaved work on screen, asks first; Cancel changes nothing
//   D6  ...and Recover brings the work back: its calendar on screen, unsaved, the old backup retired (this page backs
//       it up in its own), and the menu entry gone
(function () {
  var phase = '1'; try { phase = sessionStorage.getItem('bdecl-phase') || '1'; } catch (e) {}
  window.__PHASE = phase;
  window.__T.memoryIDB();
  var entries = null;
  try { entries = JSON.parse(sessionStorage.getItem('bdecl-idb') || 'null'); } catch (e) {}
  if(phase !== '1' && entries){
    window.__MEMIDB['spt-planning-cal'] = {handles: new Map(entries)};
    return;
  }
  var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var old = JSON.parse(x.responseText); old.fields.byId['show-title'] = {value: 'OLD WORK FROM LAST WEEK'};
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['unsavedBackup:lastweek', {state: old, at: Date.now() - 6 * 864e5, fileName: 'show-a.sptcal'}]
  ])};
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, phase = window.__PHASE, cases = [];
  try { cases = JSON.parse(sessionStorage.getItem('bdecl-cases') || '[]'); } catch (e) {}
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function handles(){ return window.__MEMIDB['spt-planning-cal'].handles; }
  function slots(){ return Array.from(handles().keys()).filter(function (k) { return String(k).indexOf('unsavedBackup') === 0; }).sort(); }
  function listed(){
    return Array.from(document.querySelectorAll('#file-menu [data-backup]')).map(function (e) {
      return {key: e.getAttribute('data-backup'), text: (e.textContent || '').replace(/\s+/g, ' ').trim()};
    });
  }
  function title(){ return document.getElementById('show-title').value; }
  function status(){ var e = document.getElementById('save-status'); return e ? (e.textContent || '').trim() : ''; }
  async function asked(ms){ for(var i = 0; i < ms / 100; i++){ await T.sleep(100); var m = T.modalText(); if(/Recover unsaved work/.test(m)) return m; } return ''; }
  function next(p){
    sessionStorage.setItem('bdecl-idb', JSON.stringify(Array.from(handles().entries())));
    sessionStorage.setItem('bdecl-cases', JSON.stringify(cases));
    sessionStorage.setItem('bdecl-phase', p);
    location.reload();
  }
  // The backup's date as the question should write it: the app's own day menu style, "Sun 8 Nov".
  var at = (handles().get('unsavedBackup:lastweek') || {}).at || 0, d = new Date(at);
  var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var day = DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  try {
    await T.appReady();
    if(phase === '1'){
      var q1 = await asked(8000);
      add('D1', 'launch 1: the question names the backup\'s date, not only the time of day',
        q1.indexOf('show-a.sptcal') !== -1 && q1.indexOf(day) !== -1, {modal: q1}, 'mentions show-a.sptcal and "' + day + '"');
      T.clickModalButton('Cancel'); await T.sleep(1000);
      var l1 = listed();
      add('D2', 'Cancel keeps the backup, and the file menu lists it (name and date) under Unsaved work',
        slots().indexOf('unsavedBackup:lastweek') !== -1 && l1.length === 1 && l1[0].key === 'unsavedBackup:lastweek'
          && l1[0].text.indexOf('show-a.sptcal') !== -1 && l1[0].text.indexOf(day) !== -1
          && /Unsaved work/.test(((document.querySelector('#file-menu .fm-backups-label') || {}).textContent) || ''),
        {slots: slots(), listed: l1}, 'kept; one entry: show-a.sptcal, ' + day);
      next('2'); return;
    }
    if(phase === '2'){
      var q2 = await asked(8000);
      add('D3', 'launch 2: asked again, with the date (one accidental No is not final)',
        q2.indexOf('show-a.sptcal') !== -1 && q2.indexOf(day) !== -1, {modal: q2}, 'asked again');
      T.clickModalButton('Cancel'); await T.sleep(1200);
      next('3'); return;
    }
    // Launch 3: two No's given.
    var q3 = await asked(4000);
    var l3 = listed();
    add('D4', 'launch 3, after the second No: no question; the backup is kept and is still in the file menu',
      !q3 && slots().indexOf('unsavedBackup:lastweek') !== -1 && l3.length === 1 && l3[0].key === 'unsavedBackup:lastweek',
      {modal: q3, slots: slots(), listed: l3}, 'no question; kept; listed');

    T.set('show-title', 'WORK ON SCREEN'); await T.sleep(800);
    var item = document.querySelector('#file-menu [data-backup="unsavedBackup:lastweek"]');
    if(item) item.click();
    await T.until(function () { return !!T.modalText(); }, 'the unsaved-changes question', 40, 100);
    var guard = T.modalText();
    T.clickModalButton('Cancel'); await T.sleep(800);
    add('D5', 'the menu entry, with unsaved work on screen, asks first; Cancel changes nothing',
      /unsaved changes/i.test(guard) && /show-a\.sptcal/.test(guard) && title() === 'WORK ON SCREEN'
        && slots().indexOf('unsavedBackup:lastweek') !== -1,
      {modal: guard, title: title(), slots: slots()}, 'asked (naming show-a.sptcal); WORK ON SCREEN kept; backup kept');

    item = document.querySelector('#file-menu [data-backup="unsavedBackup:lastweek"]');
    if(item) item.click();
    await T.until(function () { return !!T.modalText(); }, 'the unsaved-changes question (2)', 40, 100);
    T.clickModalButton('Recover');
    await T.until(function () { return title() === 'OLD WORK FROM LAST WEEK'; }, 'the recovered calendar', 60, 100);
    await T.sleep(1000);
    var own = slots().filter(function (k) { return k !== 'unsavedBackup:lastweek'; });
    var ownVal = own.length ? handles().get(own[0]) : null;
    add('D6', 'Recover from the menu: the work is back and unsaved, the old backup retired, this page backs it up, the entry gone',
      title() === 'OLD WORK FROM LAST WEEK' && /Unsaved/.test(status()) && slots().indexOf('unsavedBackup:lastweek') === -1
        && own.length === 1 && ownVal && ownVal.state.fields.byId['show-title'].value === 'OLD WORK FROM LAST WEEK' && listed().length === 0,
      {title: title(), status: status(), slots: slots(), listed: listed()}, 'OLD WORK FROM LAST WEEK; Unsaved changes; one own slot; menu empty');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  try { ['bdecl-phase', 'bdecl-idb', 'bdecl-cases'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
  T.done({test: 'backupdecline', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
