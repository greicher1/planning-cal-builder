// regionlock -- month-view day notes lock the Production Region like every other note edit, and
// adding a custom holiday asks the same "Recompute the schedule?" question as switching one on
// (FIX-PLAN.md 4.7; AUDIT-REPORT L-23).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh regionlock 150
//
// The Region lock (hasNoteEdits -> countryChangeWouldClobber) counted waterfall notes, note colours
// and hiatus labels, but not dayNotes: with only month-view notes the Region could change, Production
// re-skipped a different country's holidays, and a note on the wrap day was left beside the wrong day
// (the audit: uk-london, wrap 10/20 -> 10/19). And the Add button for a custom holiday -- which also
// moves Production when the day is a shoot day -- skipped the confirm the .hv-en checkbox shows.
//
// Every note here is made through the real UI: the month view's "+" add bar and its editor.
//
//   C0  control: the reference calendar, no edits -- the Region is not locked
//   L1  a day note added in the month view: the Region locks (class + hint)
//   L2  choosing another Region is refused (the guard's alert) and the select goes back
//   H1  adding a custom holiday on a shoot day ASKS "Recompute the schedule?" (hv-en's question);
//       Cancel adds nothing, keeps what was typed, and leaves Production's dates alone
//   H2  asked again and answered Continue: the holiday is added and Production's end moves
//   L3  Reset Notes & Hiatus clears the day note, and the Region unlocks (the lock is escapable)
//   H3  with no note edits, adding a custom holiday does NOT ask -- the same rule as hv-en
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthLabel(){ return ((document.querySelector('#table-wrap .mv-monthbar') || {}).textContent || '').replace(/[◀▶]/g, '').replace(/\s+/g, ' ').trim(); }
  // "July 2026" -> a comparable number, without an anchored regex (no dollar sign in a leg).
  function monthIndex(label){ var p = String(label || '').split(' '); return p.length === 2 ? (+p[1]) * 12 + MONTHS.indexOf(p[0]) : NaN; }
  async function goTo(label){
    var want = monthIndex(label);
    for(var g = 0; g < 40 && monthLabel() !== label; g++){
      var btn = document.getElementById(monthIndex(monthLabel()) < want ? 'mv-next' : 'mv-prev');
      if(!btn) break; btn.click(); await T.sleep(200);
    }
    if(monthLabel() !== label) throw new Error('could not page the month view to ' + label + ' (at ' + monthLabel() + ')');
  }
  function lock(){
    var sel = document.getElementById('union-place'), hint = document.getElementById('union-lock-hint');
    return {locked: !!sel && sel.classList.contains('locked'), hint: !!hint && hint.style.display === 'block', place: sel ? sel.value : null};
  }
  function prodMeta(){ return ((document.getElementById('meta-production') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function customCount(){ return document.querySelectorAll('#holiday-vis-list .hv-del').length; }
  function dayNoteOn(day){ return !!document.querySelector('#table-wrap .mv-note-block[data-note-kind="day"][data-note-day="' + day + '"]'); }
  async function waitModal(re, polls){
    for(var i = 0; i < (polls || 30); i++){ await T.sleep(100); var t = T.modalText(); if(re.test(t)) return t; }
    return '';
  }
  async function addCustom(name, date){
    T.set('custom-hol-name', name); T.set('custom-hol-date', date);
    document.getElementById('custom-hol-add').click();
  }
  var ASK = /Recompute the schedule\?.*Changing which holidays apply recomputes Production/;
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);
    var c0 = lock();
    add('C0', 'control: the reference calendar with no edits -- the Region is not locked', !c0.locked && !c0.hint, c0, 'unlocked');

    // L1: a day note through the month view's own "+" and editor.
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month view', 100, 100);
    await goTo('July 2026');
    var plus = document.querySelector('#table-wrap .mv-note-add[data-note-kind="day"][data-note-day="2026-07-08"]');
    if(!plus) throw new Error('no add bar on 7/8/26');
    plus.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await T.sleep(400);
    var ta = document.querySelector('#mv-note-pop textarea');
    if(!ta) throw new Error('the day-note editor did not open');
    ta.value = 'Crew BBQ';
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true}));
    await T.sleep(900);
    var l1 = lock();
    add('L1', 'a month-view day note locks the Region, like any other note edit', dayNoteOn('2026-07-08') && l1.locked && l1.hint,
      {dayNote: dayNoteOn('2026-07-08'), lock: l1}, 'the note is there; locked, hint shown');

    // L2: the guard refuses a Region change and puts the select back.
    var metaBefore = prodMeta();
    T.set('union-place', 'uk-london');
    var alertText = await waitModal(/Changing the Production Region/, 30);
    if(alertText) T.clickModalButton('OK');
    await T.sleep(900);
    var l2 = lock();
    add('L2', 'choosing London is refused: the guard explains, and the Region and Production stay as they were',
      !!alertText && l2.place === 'us-general' && prodMeta() === metaBefore,
      {alert: alertText.slice(0, 60), place: l2.place, meta: prodMeta(), metaBefore: metaBefore}, 'refused; us-general; same dates');

    // H1: adding a custom holiday on a shoot day asks first; Cancel changes nothing.
    var n0 = customCount(), m0 = prodMeta();
    await addCustom('Studio Day', '2026-07-15');
    var ask1 = await waitModal(ASK, 30);
    if(ask1) T.clickModalButton('Cancel');
    await T.sleep(900);
    var kept = {name: document.getElementById('custom-hol-name').value, date: document.getElementById('custom-hol-date').value};
    add('H1', 'adding a custom holiday on a shoot day asks hv-en\'s question; Cancel adds nothing and keeps what was typed',
      !!ask1 && customCount() === n0 && prodMeta() === m0 && kept.name === 'Studio Day' && kept.date === '2026-07-15',
      {asked: ask1.slice(0, 70), custom: customCount(), was: n0, meta: prodMeta(), kept: kept}, 'asked; not added; inputs kept; same dates');

    // H2: asked again, Continue: added, and Production's end moves (a shoot day was taken away).
    document.getElementById('custom-hol-add').click();
    var ask2 = await waitModal(ASK, 30);
    if(ask2) T.clickModalButton('Continue');
    await T.sleep(1200);
    add('H2', 'Continue: the holiday is added and Production\'s dates recompute',
      !!ask2 && customCount() === n0 + 1 && prodMeta() !== m0,
      {asked: !!ask2, custom: customCount(), meta: prodMeta(), metaBefore: m0}, 'added; dates moved');

    // L3: Reset Notes & Hiatus (a waterfall control) clears the day note, and the lock lets go.
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.getElementById('notes-reset-btn'); }, 'the waterfall reset button', 100, 100);
    document.getElementById('notes-reset-btn').click();
    await T.sleep(900);
    var l3 = lock();
    add('L3', 'Reset Notes & Hiatus clears the day note, and the Region unlocks', !l3.locked && !l3.hint, l3, 'unlocked');

    // H3: with nothing to misplace, the Add button does not ask (hv-en's own rule).
    var n3 = customCount();
    await addCustom('Second Day', '2026-07-22');
    var ask3 = await waitModal(ASK, 12);
    await T.sleep(600);
    add('H3', 'with no note edits, adding a custom holiday does not ask', !ask3 && customCount() === n3 + 1,
      {asked: ask3.slice(0, 40), custom: customCount(), was: n3}, 'not asked; added');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'regionlock', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
