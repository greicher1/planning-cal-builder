// autonote -- an edited auto-note is REWRITTEN when a shift moves it (FIX-PLAN.md 2.2; AUDIT-REPORT
// M-10; owner ruling R5).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=v1.3.0-saved ./run.sh autonote 150
//
// Once a user adds a line to an auto-note -- "Start Principal Photography 6/29/26" + "Table read Thu"
// -- the week stores the whole text as a literal override. On v1.3.0 a shift moved that override to
// the new week with the OLD date still in it, hiding the correct auto-note: the Notes column stated
// the wrong start and wrap on screen, in Excel and in the PDF. The fix swaps the pre-shift auto text
// at the head of a moving note for the auto text of the week it lands on, keeping the user's lines.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function cellText(weekIso){
    var td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="' + weekIso + '"]');
    if(!td) return null;
    var body = td.querySelector('.cell-body') || td;
    return (body.innerText || body.textContent || '').replace(/\r/g, '').trim();
  }
  function isoPlus(iso, days){ var d = new Date(iso + 'T00:00:00Z'); d = new Date(d.getTime() + days * 86400000); return d.toISOString().slice(0, 10); }
  function mondayIso(iso){ var d = new Date(iso + 'T00:00:00Z'); var back = (d.getUTCDay() + 6) % 7; return isoPlus(iso, -back); }
  function mdyToIso(t){ var m = /(\d+)\/(\d+)\/(\d+)/.exec(t || ''); return m ? ('20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2)) : ''; }
  function fmt(iso){ var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2); }
  function meta(){ return ((document.getElementById('meta-production') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function wrapIso(){ var m = /→\s*(\d+\/\d+\/\d+)\s*$/.exec(meta()); return m ? mdyToIso(m[1]) : ''; }
  async function settle(){ await T.sleep(700); }
  try {
    await T.appReady();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the restored grid', 200, 100);
    await T.sleep(1200);
    if(!document.querySelector('#table-wrap td.sheet-note-cell')){ document.getElementById('view-sheet-btn').click(); await settle(); }

    // The calendar as restored: Production from 6/29/26; read its auto texts off the grid.
    var START = '2026-06-29', startAuto = cellText(START);
    var wrap0 = wrapIso(), wrapWeek0 = mondayIso(wrap0), wrapAuto = cellText(wrapWeek0);
    add('A0', 'restored: the start and wrap weeks carry their auto-notes',
      startAuto === 'Start Principal Photography 6/29/26' && /^Principal Photography Wraps /.test(wrapAuto || ''),
      {startAuto: startAuto, wrap: wrap0, wrapAuto: wrapAuto}, 'the two milestones');

    // Edit both, plus a plain note of the user's own on an empty week, through the real editor.
    await T.typeUserNote(START, startAuto + '\nTable read Thu');
    await T.typeUserNote(wrapWeek0, wrapAuto + '\nWrap party Fri');
    await T.typeUserNote('2026-08-03', 'Network notes call');
    await T.sleep(800);
    var e = {start: cellText(START), wrap: cellText(wrapWeek0), plain: cellText('2026-08-03')};
    add('A1', 'the three edits are in the grid', /Table read Thu/.test(e.start || '') && /Wrap party Fri/.test(e.wrap || '') && e.plain === 'Network notes call', e, 'edited');

    // Shift All +1 wk -- the toolbar arrow.
    document.getElementById('shift-fwd-btn').click();
    await settle();
    var START1 = isoPlus(START, 7), wrap1 = wrapIso();
    var s = {start: cellText(START1), oldStart: cellText(START), wrap: cellText(isoPlus(wrapWeek0, 7)), wrap1: wrap1, plain: cellText('2026-08-10')};
    add('A2', 'the edited start note moved AND reads the new start date, with the user\'s line kept',
      s.start === 'Start Principal Photography 7/6/26\nTable read Thu', {start: s.start}, 'Start Principal Photography 7/6/26 / Table read Thu');
    // The wrap moves by 7 days only if no holiday changes the shoot's length. The note moved exactly
    // one week, so it shows the new wrap only if the wrap is still in that week; otherwise the stale
    // line is gone and the real wrap week shows its own auto-note.
    var wrapStillThere = mondayIso(wrap1) === isoPlus(wrapWeek0, 7);
    var wantWrap = wrapStillThere ? ('Principal Photography Wraps ' + fmt(wrap1) + '\nWrap party Fri') : 'Wrap party Fri';
    add('A3', 'the edited wrap note reads the new wrap (or loses the stale line if the wrap left its week)',
      s.wrap === wantWrap, {wrapNote: s.wrap, newWrap: wrap1}, wantWrap);
    var noteTexts = Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell')).map(function (td) { return (td.textContent || ''); }).join(' | ');
    add('A4', 'no note cell states the old start any more', noteTexts.indexOf('Photography 6/29/26') === -1,
      {found: noteTexts.indexOf('Photography 6/29/26')}, 'absent');
    add('A5', 'a note with no auto text in it just moves, untouched', s.plain === 'Network notes call', {plain: s.plain}, 'Network notes call');

    // Undo puts every text back exactly.
    document.getElementById('undo-btn').click();
    await settle();
    var u = {start: cellText(START), wrap: cellText(wrapWeek0), plain: cellText('2026-08-03')};
    add('A6', 'one undo restores the three edited notes on their original weeks', u.start === e.start && u.wrap === e.wrap && u.plain === e.plain, u, e);

    // Shift All -1 then +1 by the arrows is a round trip for the start note.
    document.getElementById('shift-back-btn').click(); await settle();
    document.getElementById('shift-fwd-btn').click(); await settle();
    add('A7', 'earlier then later again: the start note is back to "... 6/29/26" + its line',
      cellText(START) === e.start, {start: cellText(START)}, e.start);

    var clipped = T.clippedCells();
    add('A8', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: (clipped.h || []).slice(0, 5)}, '[]');
  } catch (err) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(err && err.stack || err)}); }
  T.done({test: 'autonote', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
