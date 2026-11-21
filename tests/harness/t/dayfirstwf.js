// dayfirstwf -- on a DAY-FIRST calendar the month view places a TYPED waterfall line by its day-first trailing date, read
// by the frozen reader itself (November 2026 audit item 2.4, AUD2-066; the owner's decision D3 (a), 13 Nov 2026: "typed or
// pasted dates are read day first too"; frozen edit D3 in notesForWaterfallDate, owner-approved by picker 16 Nov 2026:
// "Work on it now").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh dayfirstwf 300
//
// v1.15.0 shipped this behaviour through a stand-in (wfLinesOnDay handed the frozen function a rewritten copy of the
// week's note for the length of one call). Frozen edit D3 reads the date in the calendar's order inside
// notesForWaterfallDate (slashDateInWeek), and the stand-in is gone. This leg holds every place a typed line's
// date decides where the month view draws it, on T.buildFixture at DD/MM/YY:
//   T1     "Table read 17/7/26" (week of 13 Jul) on Fri 17 Jul, nowhere else
//   T2     one note of three lines (week of 27 Jul): each day-first line on its own day, the undated line on Monday
//   T3     a line written MONTH first before the switch ("Cast dinner 8/6/26") still read inside its week, beside a
//          day-first line in the same note
//   H1     a holiday's line typed into a note ("Independence Day (Observed) 3/7/26" in the week of 29 Jun) on Fri 3 Jul,
//          once, never on Monday; H2 that day takes the holiday tint and Monday does not (mvHolidayDays)
//   R1     RE-DATED by the calendar: Production typed to start Wed 1 Jul (Snap to Monday off), the typed note's
//          automatic line follows ("Start Principal Photography 1/7/26", followAutoNotes), drawn on 1 Jul
//   R2     RE-DATED by the month view's drag inside its week: Table read dragged to Wed 15 Jul reads "15/7/26" in the
//          waterfall cell and is drawn on 15 Jul
//   R3     ...and across weeks: Wrap drinks dragged from Fri 31 Jul to Tue 4 Aug leaves the week of 27 Jul, joins the
//          week of 3 Aug as "Wrap drinks 4/8/26", and is drawn on 4 Aug
//   R4     one Undo puts R3's drag back
//   M1     the SAME calendar back on MM/DD/YY (the month-first control: a line whose date reads only day first sits on its
//          week's Monday, a month-first line on its day). ⚠️ Since 17 Nov 2026 (notedates, owner's picker "Pin it") a
//          ONE-LINE note's typed date is its Day, so Table read (dragged to 15 Jul by R2; the drag now takes its Day along)
//          and Score spotting (8/3's last line, beside the dated Cast dinner) stay on 15 Jul and 7 Aug; the three-line
//          27 Jul note has an undated line, so it pins nothing and its day-first lines go back to Monday as before
//   E0     no console error, no native alert
// v1.15.0 (the stand-in) is green on every case: the frozen edit moves the reading, it changes no result. A mutant of
// v1.15.0 with the stand-in removed and no frozen edit is red at T1-T3, H1, H2, R1-R4 and M1 (M1 only because R2 could
// not drag a line the month view had put on Monday), measured 16 Nov 2026; so every case here is held by D3 alone.
try{var o=JSON.parse(localStorage.getItem('sptcal.prefs')||'{}')||{};delete o.hiatusRipple;localStorage.setItem('sptcal.prefs',JSON.stringify(o));}catch(e){}
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settled() { var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(100); var s = (byId('table-wrap') || {}).innerHTML || ''; if (s.length && s === last) same++; else { same = 0; last = s; } } }
  async function view(mode) {
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); if (on) return;
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, mode, 100, 100); await settled();
  }
  async function toMonth(label) {
    await view('month'); var want = Date.parse('1 ' + label);
    for (var i = 0; i < 60; i++) { var my = txt(q('#table-wrap .mv-monthyear')); if (my === label) return settled();
      byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150); }
    throw new Error('never reached ' + label);
  }
  // The waterfall's lines the month view draws (data-note-kind "wf"), as "day | text", for the lines this leg types.
  var RE = /Table read|Fitting|Wrap drinks|Crew call|Cast dinner|Score spotting|Read-through|Start Principal|Independence/;
  function mvNotes() { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day]').map(function (b) { return b.getAttribute('data-note-day') + ' | ' + txt(b); }).filter(function (s) { return RE.test(s); }); }
  async function census(months) { var r = []; for (var i = 0; i < months.length; i++) { await toMonth(months[i]); r = r.concat(mvNotes()); } return Array.from(new Set(r)).sort(); }
  function on(list, re) { return list.filter(function (s) { return re.test(s.split(' | ')[1] || ''); }); }
  function cell(weekIso) {
    var td = q('#table-wrap td.sheet-note-cell[data-week="' + weekIso + '"]');
    if (!td || !td.classList.contains('has-note')) return [];
    var body = td.querySelector('.cell-body') || td;
    return (body.innerText || body.textContent || '').replace(/\r/g, '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  // The month grid's own cell for a day (its row is the one holding that day's "+" cell; its column is the weekday).
  function dayCell(iso) {
    var add = q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]'), row = add && add.closest('.mv-week');
    if (!row) return null;
    return qa(':scope > .mv-daygrid > .mv-daycell', row)[new Date(iso + 'T00:00:00Z').getUTCDay()] || null;
  }
  function mid(el) { var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  // The month view's note drag, as autonoterename's G1 drives it: press on the note, move through the days' "+" cells
  // (re-found every step: the grid redraws live), let go.
  async function dragNote(day, re, via) {
    var find = function () { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]').filter(function (b) { return re.test(txt(b)); })[0] || null; };
    var b = find(); if (!b) return false;   // not drawn on that day (the case reads red, the leg goes on)
    b.scrollIntoView({block: 'center'}); await T.sleep(150); b = find();
    var at = mid(b);
    b.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 0, buttons: 1}));
    for (var i = 0; i < via.length; i++) {
      var t = q('#table-wrap .mv-note-add[data-note-day="' + via[i] + '"]'); if (!t) throw new Error('no day cell for ' + via[i]);
      var to = mid(t);
      for (var k = 1; k <= 5; k++) {
        window.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, buttons: 1, clientX: at.x + (to.x - at.x) * k / 5, clientY: at.y + (to.y - at.y) * k / 5}));
        await T.sleep(60);
      }
      at = to;
    }
    window.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, clientX: at.x, clientY: at.y}));
    await settled();
    return true;
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return q('table.sheet-table'); }, 'grid'); await settled();
    T.pickSelect('wf-date-format', 'd/m/yy'); await settled();
    out.dateCells = qa('#table-wrap td.sheet-date').map(txt).slice(0, 2);

    // The week of 29 Jun's holiday line, as the month view writes it before any note is typed (a holiday is month-only
    // by default, so it is drawn on its own day by frozen edit N1's rule).
    await toMonth('July 2026');
    var hol = qa('#table-wrap .mv-note-block[data-note-day="2026-07-03"]').map(txt).filter(function (t) { return /\b3\/7\/26$/.test(t); })[0] || '';
    out.holiday = hol;
    await view('sheet');
    if (!hol) throw new Error('no holiday line on Fri 3 Jul');

    var notes = [['2026-06-29', 'Start Principal Photography 29/6/26\nRead-through 1/7/26\n' + hol],
                 ['2026-07-13', 'Table read 17/7/26'],
                 ['2026-07-27', 'Fitting 29/7/26\nWrap drinks 31/7/26\nCrew call'],
                 ['2026-08-03', 'Cast dinner 8/6/26\nScore spotting 7/8/26']];
    for (var i = 0; i < notes.length; i++) { await T.typeUserNote(notes[i][0], notes[i][1]); await settled(); }
    out.cells = {jun29: cell('2026-06-29'), jul13: cell('2026-07-13'), jul27: cell('2026-07-27'), aug3: cell('2026-08-03')};

    var dm = await census(['July 2026', 'August 2026']);
    out.dm = dm;
    add('T1', 'Table read 17/7/26 is drawn on Fri 17 Jul, and nowhere else',
      same(on(dm, /^Table read/), ['2026-07-17 | Table read 17/7/26']), on(dm, /^Table read/), ['2026-07-17 | Table read 17/7/26']);
    add('T2', 'one note of three lines: Fitting on Wed 29 Jul, Wrap drinks on Fri 31 Jul, the undated Crew call on Mon 27 Jul',
      same(on(dm, /^(Fitting|Wrap drinks|Crew call)/), ['2026-07-27 | Crew call', '2026-07-29 | Fitting 29/7/26', '2026-07-31 | Wrap drinks 31/7/26']),
      on(dm, /^(Fitting|Wrap drinks|Crew call)/), '27 Jul Crew call, 29 Jul Fitting, 31 Jul Wrap drinks');
    add('T3', 'a line written month first (Cast dinner 8/6/26) is still read inside its week, on Thu 6 Aug, beside Score spotting 7/8/26 on Fri 7 Aug',
      same(on(dm, /^(Cast dinner|Score spotting)/), ['2026-08-06 | Cast dinner 8/6/26', '2026-08-07 | Score spotting 7/8/26']),
      on(dm, /^(Cast dinner|Score spotting)/), '6 Aug Cast dinner, 7 Aug Score spotting');
    add('H1', 'a holiday line typed into the note (' + hol + ') is drawn on Fri 3 Jul, once, never on Mon 29 Jun; Read-through on Wed 1 Jul',
      same(on(dm, /^Independence Day \(Observed\)/), ['2026-07-03 | ' + hol]) && same(on(dm, /^Read-through/), ['2026-07-01 | Read-through 1/7/26']),
      on(dm, /^(Independence Day \(Observed\)|Read-through)/), '3 Jul the holiday, 1 Jul Read-through');
    await toMonth('July 2026');
    var tint = {jul3: (dayCell('2026-07-03') || {className: 'none'}).className, jun29: (dayCell('2026-06-29') || {className: 'none'}).className};
    out.tint = tint;
    add('H2', 'Fri 3 Jul, where the typed holiday line is drawn, takes the holiday tint; Mon 29 Jun does not',
      /\bmv-holiday\b/.test(tint.jul3) && !/\bmv-holiday\b/.test(tint.jun29), tint, '3 Jul .mv-holiday, 29 Jun not');
    await view('sheet');

    // R1: re-dated by the calendar. Production typed to start Wed 1 Jul (Snap to Monday off first, or the start snaps
    // back to Mon 29 Jun): the typed note's automatic line follows.
    var snap = byId('snap-production'); if (snap && snap.checked) { snap.click(); await settled(); }
    T.set('start-production', '2026-07-01'); await settled(); await T.sleep(400); await settled();
    var c629 = cell('2026-06-29');
    var r1 = await census(['July 2026']);
    out.r1 = {cell: c629, month: on(r1, /^Start Principal/)};
    add('R1', 'Production typed to Wed 1 Jul: the typed note reads "Start Principal Photography 1/7/26" and the month view draws it on 1 Jul',
      c629.indexOf('Start Principal Photography 1/7/26') >= 0 && c629.indexOf('Start Principal Photography 29/6/26') < 0 &&
      same(on(r1, /^Start Principal/), ['2026-07-01 | Start Principal Photography 1/7/26']),
      out.r1, 'cell and month on 1/7/26');

    // R2: re-dated by the month view's drag, inside its week.
    await toMonth('July 2026');
    var r2d = await dragNote('2026-07-17', /^Table read/, ['2026-07-15']);
    var r2m = on(mvNotes(), /^Table read/);
    await view('sheet');
    var c713 = cell('2026-07-13');
    out.r2 = {dragged: r2d, month: r2m, cell: c713};
    add('R2', 'Table read dragged from Fri 17 to Wed 15 Jul reads "Table read 15/7/26" in its cell and is drawn on 15 Jul',
      r2d && same(c713, ['Table read 15/7/26']) && same(r2m, ['2026-07-15 | Table read 15/7/26']), out.r2, 'cell and month on 15/7/26');

    // R3: ...and across weeks, into a week that has its own typed note (August's grid holds both days).
    await toMonth('August 2026');
    var r3d = await dragNote('2026-07-31', /^Wrap drinks/, ['2026-08-04']);
    var r3 = await census(['July 2026', 'August 2026']);
    await view('sheet');
    out.r3 = {dragged: r3d, jul27: cell('2026-07-27'), aug3: cell('2026-08-03'), month: on(r3, /^(Wrap drinks|Cast dinner|Score spotting|Fitting|Crew call)/)};
    add('R3', 'Wrap drinks dragged from Fri 31 Jul to Tue 4 Aug leaves the week of 27 Jul, joins the week of 3 Aug as "Wrap drinks 4/8/26", and is drawn on 4 Aug',
      r3d && same(out.r3.jul27, ['Fitting 29/7/26', 'Crew call']) && same(out.r3.aug3, ['Cast dinner 8/6/26', 'Score spotting 7/8/26', 'Wrap drinks 4/8/26']) &&
      same(out.r3.month, ['2026-07-27 | Crew call', '2026-07-29 | Fitting 29/7/26', '2026-08-04 | Wrap drinks 4/8/26', '2026-08-06 | Cast dinner 8/6/26', '2026-08-07 | Score spotting 7/8/26']),
      out.r3, 'Wrap drinks 4/8/26 in the week of 3 Aug, drawn on 4 Aug');

    if (r3d) { byId('undo-btn').click(); await settled(); }
    var r4 = await census(['July 2026', 'August 2026']);
    await view('sheet');
    out.r4 = {jul27: cell('2026-07-27'), aug3: cell('2026-08-03'), month: on(r4, /^Wrap drinks/)};
    add('R4', 'one Undo puts the drag back: Wrap drinks 31/7/26 in the week of 27 Jul, drawn on 31 Jul',
      r3d && same(out.r4.jul27, ['Fitting 29/7/26', 'Wrap drinks 31/7/26', 'Crew call']) && same(out.r4.aug3, ['Cast dinner 8/6/26', 'Score spotting 7/8/26']) &&
      same(out.r4.month, ['2026-07-31 | Wrap drinks 31/7/26']), out.r4, 'as before the drag');

    // M1: the same calendar back on MM/DD/YY reads exactly as it always did.
    T.pickSelect('wf-date-format', ''); await settled();
    var mf = await census(['July 2026', 'August 2026']);
    await view('sheet');
    out.mf = mf;
    var want = ['2026-07-15 | Table read 15/7/26', '2026-07-27 | Crew call', '2026-07-27 | Fitting 29/7/26', '2026-07-27 | Wrap drinks 31/7/26',
                '2026-08-06 | Cast dinner 8/6/26', '2026-08-07 | Score spotting 7/8/26'];
    add('M1', 'back on MM/DD/YY: the one-line notes stay on the days they were typed for (their Day: Table read 15 Jul after R2\'s drag, Score spotting 7 Aug); the three-line note\'s day-first lines sit on Monday; a month-first line on its day',
      same(on(mf, /^(Table read|Fitting|Wrap drinks|Crew call|Cast dinner|Score spotting)/), want),
      on(mf, /^(Table read|Fitting|Wrap drinks|Crew call|Cast dinner|Score spotting)/), want);

    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 500), 'no exception'); }
  T.done(out);
})(); });
