// monthnotes -- month-only holidays survive an edited waterfall note, and the month editor never
// bakes them INTO one (FIX-PLAN.md 2.9; AUDIT-REPORT M-13 + MONTH-6; R3 approved the frozen half).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=monthnotes ./run.sh monthnotes 150
//
// tests/fixtures/monthnotes.sptcal is v1.3.0-saved (US General) in the month view, with
//   6/29 week   "Start Principal Photography 6/29/26" + "Table Read"  -- a waterfall edit, undated
//   11/23 week  "Post screening Wed"                                   -- a plain override
//   5/25 week   "Memorial Day 5/25/26" + "Office closed", pinned 5/25  -- what the OLD month editor
//                                                                        wrote, holiday baked in
// Holidays are month-only by default (hidden in the waterfall). On v1.3.0 an override replaced the
// week's auto text in the month view too, so Independence Day and Thanksgiving vanished from the
// month view and the month PDF; and editing a holiday week's note FROM the month view saved the
// holiday line into the waterfall note, the waterfall and Excel.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function blocks(day){
    return Array.from(document.querySelectorAll('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]'))
      .map(function (b) { return (b.textContent || '').replace(/\s+/g, ' ').trim(); });
  }
  function monthLabel(){ return ((document.querySelector('#table-wrap .mv-monthbar') || {}).textContent || '').replace(/[◀▶]/g, '').replace(/\s+/g, ' ').trim(); }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthIndex(label){ var m = /^(\w+) (\d{4})$/.exec(label || ''); return m ? (+m[2]) * 12 + MONTHS.indexOf(m[1]) : NaN; }
  // Page the month view to `label`, in whichever direction it lies.
  async function goTo(label){
    var want = monthIndex(label);
    for(var g = 0; g < 40 && monthLabel() !== label; g++){
      var btn = document.getElementById(monthIndex(monthLabel()) < want ? 'mv-next' : 'mv-prev');
      if(!btn) break; btn.click(); await T.sleep(200);
    }
    if(monthLabel() !== label) throw new Error('could not page the month view to ' + label + ' (at ' + monthLabel() + ')');
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () {
      var m = window.__MEMIDB && window.__MEMIDB['spt-planning-cal'] && window.__MEMIDB['spt-planning-cal'].handles;
      got = m && m.get('unsavedBackup');
      return !!(got && got.state && got.at > lastAt);
    }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    return got.state;
  }
  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month view', 200, 100);
    await T.sleep(1200);

    // N1 -- July 2026 (its first row is Sun 6/28 - Sat 7/4).
    await goTo('July 2026');
    var n1 = {mon: blocks('2026-06-29'), fri: blocks('2026-07-03'), sat: blocks('2026-07-04')};
    add('N1', 'a WATERFALL-edited week keeps its month-only holidays in the month view (Independence Day)',
      n1.fri.indexOf('Independence Day (Observed) 7/3/26') !== -1 && n1.sat.indexOf('Independence Day 7/4/26') !== -1,
      n1, 'Independence Day (Observed) on 7/3, Independence Day on 7/4');
    add('N1b', '...and the edited note itself is still there on its Monday',
      n1.mon.indexOf('Table Read') !== -1 && n1.mon.indexOf('Start Principal Photography 6/29/26') !== -1, {mon: n1.mon}, 'both lines');

    // N2 -- November: a plain override on Thanksgiving week.
    await goTo('November 2026');
    var n2 = {mon: blocks('2026-11-23'), thu: blocks('2026-11-26'), fri: blocks('2026-11-27')};
    add('N2', 'a plain override on Thanksgiving week: Thanksgiving and the day after still show',
      n2.thu.indexOf('Thanksgiving 11/26/26') !== -1 && n2.fri.indexOf('Day After Thanksgiving 11/27/26') !== -1 && n2.mon.indexOf('Post screening Wed') !== -1,
      n2, 'Thanksgiving 11/26, Day After 11/27, the note on 11/23');

    // N3 -- no duplicate when an old override already carries the holiday line.
    await goTo('May 2026');
    var n3 = blocks('2026-05-25');
    add('N3', 'a holiday already baked into an old override is shown ONCE',
      n3.filter(function (t) { return t === 'Memorial Day 5/25/26'; }).length === 1 && n3.indexOf('Office closed') !== -1, {may25: n3}, 'Memorial Day once + Office closed');

    // N4 -- the REVERSE: edit Labor Day's note from the month view. The saved waterfall note must not
    // carry "Labor Day 9/7/26" (a month-only holiday); the month view still shows it.
    await goTo('September 2026');
    var lab = document.querySelector('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="2026-09-07"]');
    if(!lab) throw new Error('no Labor Day block on 9/7');
    lab.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await T.sleep(400);
    var ta = document.querySelector('#mv-note-pop textarea');
    if(!ta) throw new Error('the month-view note editor did not open');
    var prefill = ta.value;
    ta.value = prefill + '\nCrew BBQ';
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true}));
    await T.sleep(800);
    var s4 = await snap();
    var stored = s4.userNotes && s4.userNotes['2026-09-07'];
    var storedText = stored ? (stored.text || '') : null;
    add('N4', 'editing a holiday week from the month view does NOT bake the month-only holiday into the waterfall note',
      storedText === 'Crew BBQ', {prefill: prefill, stored: stored}, '"Crew BBQ"');
    var n4 = blocks('2026-09-07');
    add('N4b', '...and the month view still shows both the holiday and the new line',
      n4.indexOf('Labor Day 9/7/26') !== -1 && n4.indexOf('Crew BBQ') !== -1, {sep7: n4}, 'Labor Day 9/7/26 + Crew BBQ');

    // N5 -- the waterfall shows the new note, and no holiday line in it.
    document.getElementById('view-sheet-btn').click();
    await T.sleep(900);
    var cell = document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-09-07"]');
    var cellText = cell ? ((cell.querySelector('.cell-body') || cell).innerText || '').trim() : null;
    add('N5', 'the waterfall note for 9/7 reads just "Crew BBQ"', cellText === 'Crew BBQ', {cell: cellText}, 'Crew BBQ');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'monthnotes', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
