// unlinkrange -- removing a custom phase while a calendar range cuts one of its linked notes' weeks out of the waterfall
// keeps that week's automatic note (the second audit's AUD2-073, item 3.6; leg is repro/audit-b3-unlinkcut.js).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh unlinkrange 400
//
// THE BUG: the reference calendar (Production 6/29/26) with a custom phase Reshoots 6/29/26 x 3 and a note "Reshoot
// prep" linked to its week 1, the calendar range 9/7/26 - 12/28/26 (the 6/29 row is cut from the waterfall). Removing
// Reshoots turns the linked note into a plain note of 6/29 (unlinkPhaseNotesOf), built on the week's own text,
// wfOwnNoteText(wk, sheetAutoNotesFor(wk)). sheetAutoNotesFor read currentSchedule, which in the waterfall under a range
// is the CUT row list: 6/29 had no automatic notes there, so the stored note was just "Reshoot prep", and it then
// replaced the week's automatic text everywhere. "Start Principal Photography 6/29/26" was gone from the month view and
// the month PDF, and stayed gone with the range cleared. With no range the same removal kept both lines.
// THE FIX: sheetAutoNotesFor reads the whole calendar (wholeCalendar), as weekAutoTexts does. It searches by week, so
// a week the waterfall shows answers exactly as before; a week a range or a hidden phase cut away now answers too.
//
//   C1  no range: removing Reshoots keeps Start Principal Photography in the month view and the waterfall (control)
//   C3  range cutting 6/29, no linked note: the month view shows Start Principal Photography (control)
//   C2  range cutting 6/29: removing Reshoots keeps Start Principal Photography in the month view and, range cleared,
//       in the waterfall's 6/29 cell, beside "Reshoot prep" (red on the build before)
//   C4  ...and with the range cleared, Production moved to 7/13 takes its start line along, exactly as with no range
//       (green before too: the follow hook moves the line either way; it holds the fix to that)
//   E0  no console errors, no native alert
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases, log: {}};
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
  }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function notesAt(wk) { var t = q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); return t ? (t.innerText || '').trim() : null; }
  async function mvMonth(re) {
    byId('view-month-btn').click(); await settle();
    var g = 0, pl = null; while (g++ < 40) { var l0 = (q('.mv-monthyear') || {}).textContent; if (l0 === pl) break; pl = l0; byId('mv-prev').click(); await T.sleep(120); } g = 0; while (g++ < 40 && !re.test((q('.mv-monthyear') || {}).textContent)) { byId('mv-next').click(); await T.sleep(120); }
    var notes = qa('.mv-note-block[data-note-day]').map(function (b) { return b.dataset.noteDay + ' ' + (b.textContent || '').replace(/[↻⚑]/g, '').trim(); });
    byId('view-sheet-btn').click(); await settle();
    return notes.filter(function (n) { return /2026-0(6-29|6-30|7-0)/.test(n); });
  }
  async function run(tag, range, nolink) {
    await T.reloadWith(function (s) {
      s.customPhaseDefs = [{key: 'custom1', colorIndex: 0}]; s.customPhaseCounter = 1;
      s.fields.byId['name-custom1'] = {value: 'Reshoots'};
      s.fields.byId['start-custom1'] = {value: '2026-06-29'};
      s.fields.byId['weeks-custom1'] = {value: '3'};
      s.phaseNotes = nolink ? {} : {'custom1@1': {text: 'Reshoot prep'}};
      s.userNotes = {}; s.fields.byId['start-production'] = {value: '2026-06-29'};
      s.fields.byId['cal-range-start'] = {value: range ? '2026-09-07' : ''};
      s.fields.byId['cal-range-end'] = {value: range ? '2026-12-28' : ''};
    }, 'unlink-' + tag);
    await settle();
    var before = await mvMonth(/June 2026/);
    if (nolink) return {before: before};
    var row = q('.phase-row[data-key="custom1"]');
    row.querySelector('.remove-custom-phase').click();
    for (var k = 0; k < 20 && !T.modalText(); k++) await T.sleep(100);
    out.log['modal-' + tag] = T.modalText();
    if (T.modalText()) { T.clickModalButton('Remove') || T.clickModalButton('Delete') || T.clickModalButton('OK') || T.clickModalButton('Continue'); }
    await settle();
    var after = await mvMonth(/June 2026/);
    T.set('cal-range-start', ''); T.set('cal-range-end', ''); await T.sleep(400); await settle();
    var cell = notesAt('2026-06-29');
    // then move Production two weeks: does the 6/29 cell keep a stale Start Principal Photography 6/29/26?
    T.set('start-production', '2026-07-13'); await settle();
    var cellAfterMove = notesAt('2026-06-29'), cell713 = notesAt('2026-07-13');
    return {before: before, after: after, wf0629: cell, wf0629AfterMove: cellAfterMove, wf0713AfterMove: cell713};
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!q('table.sheet-table'); }, 'grid', 100, 100);
    await settle();
    var a = await run('norange', false);
    add('C1', 'no range: removing Reshoots keeps Start Principal Photography in the month view and the waterfall', a.after.some(function (n) { return /Start Principal Photography/.test(n); }) && /Start Principal/.test(a.wf0629 || ''), a, 'both lines');
    var c = await run('rangenolink', true, true);
    add('C3', 'range cutting 6/29, no linked note: month view keeps Start Principal Photography', c.before.some(function (n) { return /Start Principal Photography/.test(n); }), c, 'shown');
    var b = await run('range', true);
    add('C2', 'range cutting 6/29 out: removing Reshoots keeps Start Principal Photography in the month view and (range cleared) the waterfall', b.after.some(function (n) { return /Start Principal Photography/.test(n); }) && /Start Principal/.test(b.wf0629 || ''), b, 'both lines');
    add('C4', 'range cutting 6/29: with the range cleared and Production moved to 7/13, the start line follows exactly as with no range',
        b.wf0629AfterMove === a.wf0629AfterMove && b.wf0713AfterMove === a.wf0713AfterMove && /Start Principal Photography 7\/13\/26/.test(b.wf0713AfterMove || ''),
        {range: [b.wf0629AfterMove, b.wf0713AfterMove], norange: [a.wf0629AfterMove, a.wf0713AfterMove]}, 'the same as C1');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  T.done(out);
})(); });
