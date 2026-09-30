// regionlock -- a Region change ASKS FIRST when it could misplace a note, and a custom holiday asks
// the same "Recompute the schedule?" question as switching one on.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh regionlock 150
//
// History, because the name outlived the thing it names:
// - FIX-PLAN.md 4.7 (AUDIT-REPORT L-23, v1.4.1) made month-view DAY notes count toward the Region
//   LOCK -- with only month notes the Region could change, Production re-skipped another country's
//   holidays, and a note on the wrap day was left beside the wrong day (uk-london: wrap 10/20 ->
//   10/19) -- and gave the custom-holiday Add button the confirm the .hv-en checkbox shows.
// - Owner ruling 6 (relayed 30 Sep 2026, built after v1.4.1) REPLACED the lock with a "Continue?"
//   prompt shaped like confirmHolidayRecompute(): no locked select, no #union-lock-hint, no refusal
//   alert. hasNoteEdits() -- day notes included, so 4.7 is not undone -- still decides whether the
//   prompt appears. L1/L2/L3 were rewritten for the prompt, and L2b added.
//
// Every note here is made through the real UI: the month view's "+" add bar and its editor.
//
//   C0  control: the reference calendar, no edits -- a Region change goes straight through, no dialog
//   L0  the lock's UI is gone: no #union-lock-hint in the page
//   L1  a day note added in the month view: the select is NOT locked (no .locked, no lock title)
//   L2  choosing London ASKS "Recompute the schedule? ... Continue?"; while it asks, the select and
//       the calendar still hold the OLD Region; Cancel leaves the Region and Production's dates alone
//   L2b asked again and answered Continue: the Region is London, Production's dates recompute, and the
//       day note stays on its day
//   H1  adding a custom holiday on a shoot day ASKS "Recompute the schedule?" (hv-en's question);
//       Cancel adds nothing, keeps what was typed, and leaves Production's dates alone
//   H2  asked again and answered Continue: the holiday is added and Production's end moves
//   D1  owner ruling 7 (30 Sep 2026, "one dialog"): with a note to misplace, removing a custom holiday
//       asks ONE dialog -- its own "Remove holiday" confirm, carrying the recompute sentence; Cancel
//       keeps the holiday and the dates
//   D2  asked again and answered Remove: it goes, Production's end comes back, and no second dialog
//   R1  "Reset holidays" asks ONE dialog carrying the recompute sentence, and without the old "This
//       only affects the Holidays section." line (untrue once Production's dates move); Cancel
//   L3  Reset Notes & Hiatus clears the day note, and then a Region change no longer asks
//   H3  with no note edits, adding a custom holiday does NOT ask -- the same rule as hv-en
//   D3  with nothing to misplace, removing a custom holiday asks only today's plain confirm
//   R2  with nothing to misplace, "Reset holidays" asks its plain question, still without the
//       "only affects the Holidays section" line; Reset works
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
    return {locked: !!sel && sel.classList.contains('locked'), lockTitle: !!sel && /Locked/.test(sel.title || ''),
            hintEl: !!hint, hintShown: !!hint && hint.style.display === 'block', place: sel ? sel.value : null};
  }
  function prodMeta(){ return ((document.getElementById('meta-production') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function customCount(){ return document.querySelectorAll('#holiday-vis-list .hv-del').length; }
  function dayNoteOn(day){ return !!document.querySelector('#table-wrap .mv-note-block[data-note-kind="day"][data-note-day="' + day + '"]'); }
  function modalButtons(){
    return Array.prototype.map.call(document.querySelectorAll('.mantine-Modal-content button'), function (b) { return (b.innerText || b.textContent || '').trim(); })
      .filter(function (t) { return t; });
  }
  async function waitModal(re, polls){
    for(var i = 0; i < (polls || 30); i++){ await T.sleep(100); var t = T.modalText(); if(re.test(t)) return t; }
    return '';
  }
  // Pick a Region the way a user does, and answer the question if one comes up.
  async function pickPlace(place, answer){
    T.set('union-place', place);
    var asked = await waitModal(/Changing the Production Region/, answer ? 30 : 12);
    // A build that still REFUSES shows a one-button alert; press OK so the next case can run.
    if(asked && answer && !T.clickModalButton(answer)) T.clickModalButton('OK');
    await T.sleep(900);
    return asked;
  }
  function delBtn(name){
    var rows = document.querySelectorAll('#holiday-vis-list .hv-row');
    for(var i = 0; i < rows.length; i++){
      var n = (rows[i].querySelector('.hv-name') || {}).textContent || '';
      if(n.indexOf(name) === 0) return rows[i].querySelector('.hv-del');
    }
    return null;
  }
  // The text of the one dialog a click raises, plus proof that answering it raised no second one.
  async function oneDialog(click, re, answer){
    click();
    var t = await waitModal(re, 30);
    var content = document.querySelector('.mantine-Modal-content');
    var raw = content ? (content.innerText || '') : '';
    if(t && answer) T.clickModalButton(answer);
    await T.sleep(1000);
    return {text: t, raw: raw, second: T.modalText()};
  }
  var WARN_DEL = /Removing it recomputes Production’s dates, which can misplace the comment\/hiatus edits you’ve made/;
  var WARN_RESET = /This recomputes Production’s dates, which can misplace the comment\/hiatus edits you’ve made/;
  async function addCustom(name, date){
    T.set('custom-hol-name', name); T.set('custom-hol-date', date);
    document.getElementById('custom-hol-add').click();
  }
  var ASK = /Recompute the schedule\?.*Changing which holidays apply recomputes Production/;
  var REGION_ASK = /Recompute the schedule\?.*Changing the Production Region recomputes Production.*Continue\?/;
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);

    // C0: with nothing to misplace, the Region just changes -- there and back, no dialog either way.
    var m00 = prodMeta();
    var askedThere = await pickPlace('uk-london', null);
    var there = lock().place, metaThere = prodMeta();
    var askedBack = await pickPlace('us-general', null);
    add('C0', 'control: with no edits a Region change goes straight through, both ways, with no dialog',
      !askedThere && !askedBack && there === 'uk-london' && lock().place === 'us-general' && metaThere !== m00 && prodMeta() === m00,
      {askedThere: askedThere.slice(0, 60), askedBack: askedBack.slice(0, 60), there: there, back: lock().place, metaThere: metaThere, meta: prodMeta()},
      'no dialog; uk-london then us-general; the dates move and come back');

    var c0 = lock();
    add('L0', 'the Region lock\'s UI is gone: no #union-lock-hint in the page', !c0.hintEl, c0, 'no hint element');

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
    add('L1', 'a month-view day note does NOT lock the Region select (no .locked, no "Locked" title, no hint)',
      dayNoteOn('2026-07-08') && !l1.locked && !l1.lockTitle && !l1.hintShown,
      {dayNote: dayNoteOn('2026-07-08'), lock: l1}, 'the note is there; the select is an ordinary select');

    // L2: the change ASKS; while it asks, nothing has moved yet; Cancel keeps everything.
    var metaBefore = prodMeta();
    T.set('union-place', 'uk-london');
    var ask2 = await waitModal(/Changing the Production Region/, 30);
    var during = {place: lock().place, meta: prodMeta(), buttons: modalButtons()};
    if(ask2 && !T.clickModalButton('Cancel')) T.clickModalButton('OK');
    await T.sleep(900);
    var l2 = lock();
    add('L2', 'choosing London asks "Continue?" (Cancel / Continue); while it asks the OLD Region holds; Cancel changes nothing',
      REGION_ASK.test(ask2) && during.buttons.indexOf('Cancel') >= 0 && during.buttons.indexOf('Continue') >= 0
        && during.place === 'us-general' && during.meta === metaBefore
        && l2.place === 'us-general' && prodMeta() === metaBefore && !T.modalText(),
      {asked: ask2.slice(0, 140), during: during, place: l2.place, meta: prodMeta(), metaBefore: metaBefore},
      'the prompt; us-general throughout; the same dates');

    // L2b: asked again and answered Continue -- the change goes through, and the note stays put.
    var ask2b = await pickPlace('uk-london', 'Continue');
    add('L2b', 'Continue: the Region is London, Production\'s dates recompute, and the day note stays on its day',
      REGION_ASK.test(ask2b) && lock().place === 'uk-london' && prodMeta() !== metaBefore && dayNoteOn('2026-07-08'),
      {asked: !!ask2b, place: lock().place, meta: prodMeta(), metaBefore: metaBefore, dayNote: dayNoteOn('2026-07-08')},
      'uk-london; the dates moved; the note is still on 7/8/26');
    // Back to the reference Region for the holiday cases, through the same question.
    await pickPlace('us-general', 'Continue');
    if(lock().place !== 'us-general') throw new Error('could not return the Region to us-general (at ' + lock().place + ')');

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
    var ask2h = await waitModal(ASK, 30);
    if(ask2h) T.clickModalButton('Continue');
    await T.sleep(1200);
    add('H2', 'Continue: the holiday is added and Production\'s dates recompute',
      !!ask2h && customCount() === n0 + 1 && prodMeta() !== m0,
      {asked: !!ask2h, custom: customCount(), meta: prodMeta(), metaBefore: m0}, 'added; dates moved');

    // D1: removing it, with a note to misplace -- ONE dialog, its own, with the recompute sentence.
    var mH2 = prodMeta();
    var d1 = await oneDialog(function () { var b = delBtn('Studio Day'); if(!b) throw new Error('no remove button for Studio Day'); b.click(); },
      /Remove the custom holiday/, 'Cancel');
    add('D1', 'with a note to misplace, removing a custom holiday asks ONE dialog, its own, carrying the recompute sentence; Cancel keeps it',
      /Remove holiday/.test(d1.text) && WARN_DEL.test(d1.raw) && !d1.second && customCount() === n0 + 1 && prodMeta() === mH2,
      {text: d1.text.slice(0, 200), second: d1.second.slice(0, 60), custom: customCount(), meta: prodMeta()}, 'one dialog with the sentence; kept');

    // D2: asked again, Remove: gone, and Production's end comes back to where it was before H2.
    var d2 = await oneDialog(function () { delBtn('Studio Day').click(); }, /Remove the custom holiday/, 'Remove');
    add('D2', 'Remove: the holiday goes, Production\'s end comes back, and no second dialog follows',
      !!d2.text && !d2.second && customCount() === n0 && prodMeta() === m0,
      {second: d2.second.slice(0, 60), custom: customCount(), meta: prodMeta(), want: m0}, 'removed; the pre-H2 dates; no second dialog');

    // R1: Reset holidays, with a note to misplace -- ONE dialog with the sentence, no "only affects".
    var r1 = await oneDialog(function () { document.getElementById('holiday-reset-btn').click(); }, /Re-enable every holiday/, 'Cancel');
    add('R1', 'with a note to misplace, Reset holidays asks ONE dialog with the recompute sentence and without "only affects the Holidays section"; Cancel',
      /Reset holidays/.test(r1.text) && WARN_RESET.test(r1.raw) && !/only affects the Holidays section/.test(r1.raw) && !r1.second,
      {text: r1.raw.replace(/\s+/g, ' ').slice(0, 220), second: r1.second.slice(0, 60)}, 'one dialog: the sentence, not the old line');

    // L3: Reset Notes & Hiatus (a waterfall control) clears the day note, and the Region stops asking.
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.getElementById('notes-reset-btn'); }, 'the waterfall reset button', 100, 100);
    document.getElementById('notes-reset-btn').click();
    await T.sleep(900);
    var ask3 = await pickPlace('uk-london', null);
    var l3 = lock();
    await pickPlace('us-general', null);
    add('L3', 'Reset Notes & Hiatus clears the day note, and then a Region change no longer asks',
      !ask3 && l3.place === 'uk-london' && lock().place === 'us-general',
      {asked: ask3.slice(0, 60), placeAfter: l3.place, back: lock().place}, 'no dialog; the change goes through');

    // H3: with nothing to misplace, the Add button does not ask (hv-en's own rule).
    var n3 = customCount();
    await addCustom('Second Day', '2026-07-22');
    var ask3h = await waitModal(ASK, 12);
    await T.sleep(600);
    add('H3', 'with no note edits, adding a custom holiday does not ask', !ask3h && customCount() === n3 + 1,
      {asked: ask3h.slice(0, 40), custom: customCount(), was: n3}, 'not asked; added');

    // D3: nothing to misplace -- removing asks only today's plain confirm.
    var d3 = await oneDialog(function () { var b = delBtn('Second Day'); if(!b) throw new Error('no remove button for Second Day'); b.click(); },
      /Remove the custom holiday/, 'Remove');
    add('D3', 'with nothing to misplace, removing a custom holiday asks only its plain confirm',
      /Remove the custom holiday “Second Day”\?/.test(d3.raw) && !/recomputes/.test(d3.raw) && !d3.second && customCount() === n3,
      {text: d3.raw.replace(/\s+/g, ' ').slice(0, 160), second: d3.second.slice(0, 60), custom: customCount()}, 'plain; removed');

    // R2: nothing to misplace -- the plain question, still without the old line; Reset works.
    var r2 = await oneDialog(function () { document.getElementById('holiday-reset-btn').click(); }, /Re-enable every holiday/, 'Reset');
    add('R2', 'with nothing to misplace, Reset holidays asks its plain question (no recompute sentence, no "only affects" line), and Reset works',
      /Re-enable every holiday, clear the note choices, and delete your custom holidays\?/.test(r2.raw) && !/recomputes/.test(r2.raw)
        && !/only affects the Holidays section/.test(r2.raw) && !r2.second && !T.modalText(),
      {text: r2.raw.replace(/\s+/g, ' ').slice(0, 200), second: r2.second.slice(0, 60)}, 'plain; answered');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'regionlock', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
