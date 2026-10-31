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
      got = T.latestBackup();    // the page's own slot (per-page since v1.3.1)
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

    // N4 -- the REVERSE: add a line to Thanksgiving week's note from the month view. Since 30 Oct 2026 a waterfall
    // line opens ALONE in the month editor (owner, by picker), and saving puts it back among the week's lines, so the
    // week is edited through its own line, "Post screening Wed". The saved waterfall note must not carry Thanksgiving
    // or the day after (month-only holidays); the month view still shows them. (Until 30 Oct 2026 this clicked Labor
    // Day, whose editor was its week's note; a holiday now opens its own editor, N6.)
    await goTo('November 2026');
    var ps = document.querySelector('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="2026-11-23"]');
    if(!ps) throw new Error('no "Post screening Wed" block on 11/23');
    ps.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await T.sleep(400);
    var ta = document.querySelector('#mv-note-pop textarea');
    if(!ta) throw new Error('the month-view note editor did not open');
    var prefill = ta.value;
    ta.value = prefill + '\nCrew BBQ';
    ta.dispatchEvent(new Event('input', {bubbles: true}));
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true}));
    await T.sleep(800);
    var s4 = await snap();
    var stored = s4.userNotes && s4.userNotes['2026-11-23'];
    var storedText = stored ? (stored.text || '') : null;
    add('N4', 'editing a line of a holiday week from the month view does NOT bake the month-only holidays into the waterfall note; the editor held just that line',
      prefill === 'Post screening Wed' && storedText === 'Post screening Wed\nCrew BBQ', {prefill: prefill, stored: stored}, 'prefill "Post screening Wed"; saved "Post screening Wed\\nCrew BBQ"');
    var n4 = {mon: blocks('2026-11-23'), thu: blocks('2026-11-26'), fri: blocks('2026-11-27')};
    add('N4b', '...and the month view still shows both holidays and both lines',
      n4.thu.indexOf('Thanksgiving 11/26/26') !== -1 && n4.fri.indexOf('Day After Thanksgiving 11/27/26') !== -1
        && n4.mon.indexOf('Post screening Wed') !== -1 && n4.mon.indexOf('Crew BBQ') !== -1, n4, 'Thanksgiving, Day After, Post screening Wed + Crew BBQ');

    // N6 -- a holiday opens ITS OWN editor (owner, 30 Oct 2026): its name, never its week's note. Renaming Labor Day
    // writes no waterfall note at all.
    await goTo('September 2026');
    var lab = document.querySelector('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="2026-09-07"]');
    if(!lab) throw new Error('no Labor Day block on 9/7');
    lab.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await T.sleep(400);
    var pop6 = document.getElementById('mv-note-pop');
    var ta6 = pop6 && pop6.querySelector('textarea');
    if(!ta6) throw new Error('the holiday editor did not open');
    var head6 = ((pop6.querySelector('.mv-note-pop-day') || {}).textContent || '').trim(), pre6 = ta6.value;
    ta6.value = 'Labor Day BBQ';
    ta6.dispatchEvent(new Event('input', {bubbles: true}));
    ta6.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
    await T.sleep(800);
    var s6 = await snap();
    var n6 = blocks('2026-09-07');
    add('N6', 'Labor Day opens the holiday editor (its name alone) and a rename writes no waterfall note: the day reads "Labor Day BBQ 9/7/26" once',
      head6 === '9/7/26 · Holiday' && pre6 === 'Labor Day' && !(s6.userNotes && s6.userNotes['2026-09-07'])
        && s6.holidayNames && s6.holidayNames['labor-day@2026'] === 'Labor Day BBQ'
        && n6.filter(function (t) { return t === 'Labor Day BBQ 9/7/26'; }).length === 1 && n6.indexOf('Labor Day 9/7/26') === -1,
      {head: head6, prefill: pre6, userNote: s6.userNotes && s6.userNotes['2026-09-07'], names: s6.holidayNames, sep7: n6}, 'heading "9/7/26 · Holiday", prefill "Labor Day", no userNotes, renamed once');

    // N5 -- the waterfall shows the week's two lines, and no holiday line in it; Labor Day's week stays empty there.
    document.getElementById('view-sheet-btn').click();
    await T.sleep(900);
    function cellText(wk){
      var cell = document.querySelector('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]');
      return cell ? ((cell.querySelector('.cell-body') || cell).innerText || '').replace(/\s*\n\s*/g, '\n').trim() : null;
    }
    var c23 = cellText('2026-11-23'), c07 = cellText('2026-09-07');
    add('N5', 'the waterfall note for 11/23 reads just "Post screening Wed" and "Crew BBQ"; the 9/7 cell has no note',
      c23 === 'Post screening Wed\nCrew BBQ' && (c07 === '' || c07 === '+'), {nov23: c23, sep7: c07}, '"Post screening Wed\\nCrew BBQ"; 9/7 empty');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'monthnotes', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
