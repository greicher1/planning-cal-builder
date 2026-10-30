// datepick -- the pop-out date picker picks each field the way the engine reads it (owner, 30 Oct 2026:
// "when snap to monday is on wouldn't it make sense that you aren't able to pick any dates except mondays?").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh datepick 150
//
// src/chrome/DatePop.jsx's fieldKind():
//   monday -- a phase start with Snap to Monday on, every hiatus start, Rebuild From's date for a snapped
//             phase: only Mondays can be picked (the rest carry .dp-off + aria-disabled and do nothing),
//             the picked Monday is capped alone, and a Wednesday already in the field shows ITS Monday.
//   day    -- Snap off, a Days or Dates phase, a Dates end, a custom holiday, Anchor To's "ends by": any
//             day, the picked day capped alone, no week band.
//   week   -- the calendar range and Anchor To's start: any day picks its week, the band stays.
// Typing and the engine are untouched: picking never rewrites a field it did not pick into, and turning
// Snap on or off leaves the typed date alone.
//
// The picker is opened by a dispatched focusin, the event it listens for: a click inside a tool popover
// never reaches the document (the engine stops it), and a real focus needs a focused window.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var MS = 86400000, MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(t){ return new Date(t).toISOString().slice(0, 10); }
  function mondayOf(t){ return t - ((new Date(t).getUTCDay() + 6) % 7) * MS; }
  function $(id){ return document.getElementById(id); }
  async function open(el){
    if(typeof el === 'string') el = $(el);
    el.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.sleep(150);
    return read();
  }
  // The open picker as data: each of its 42 days by ISO date, from the month in its title.
  function cells(){
    var p = document.querySelector('.date-pop'); if(!p) return null;
    var m = /^(\w+) (\d{4})$/.exec(p.querySelector('.dp-title').textContent.trim());
    var start = mondayOf(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1));
    return Array.from(p.querySelectorAll('.dp-day')).map(function (b, i) { return {b: b, iso: iso(start + i * MS), mon: i % 7 === 0}; });
  }
  function read(){
    var p = document.querySelector('.date-pop'); if(!p) return null;
    var cs = cells();
    var off = cs.filter(function (c) { return c.b.classList.contains('dp-off'); });
    var hint = Array.from(p.querySelectorAll('.dp-hint')).map(function (h) { return h.textContent.trim(); }).join(' | ');
    return {
      off: off.length,
      offExact: off.every(function (c) { return !c.mon && c.b.getAttribute('aria-disabled') === 'true' && c.b.tabIndex === -1; }) &&
                cs.filter(function (c) { return c.mon; }).every(function (c) { return !c.b.classList.contains('dp-off') && !c.b.hasAttribute('aria-disabled'); }),
      band: p.querySelectorAll('.dp-band').length,
      solo: cs.filter(function (c) { return c.b.classList.contains('dp-cap') && c.b.classList.contains('dp-solo'); }).map(function (c) { return c.iso; }),
      hint: hint,
      ids: p.querySelectorAll('[id]').length
    };
  }
  async function clickDay(dayIso){
    var c = (cells() || []).filter(function (x) { return x.iso === dayIso; })[0];
    if(!c) throw new Error('no ' + dayIso + ' in the picker');
    c.b.click(); await T.sleep(150);
  }
  var MON_HINT = 'Snap to Monday is on, so only Mondays can be picked.';
  var HIA_HINT = 'A hiatus always starts on a Monday.';
  var WEEK_HINT = 'Any day picks its week — the calendar snaps to that Monday.';
  function isMondayOnly(r, hint){ return !!r && r.off === 36 && r.offExact && r.band === 0 && r.hint === hint && r.ids === 0; }
  function isDay(r){ return !!r && r.off === 0 && r.band === 0 && r.hint === '' && r.ids === 0; }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    await T.sleep(800);

    // ---- A phase start with Snap to Monday on (the fixture's Prod Prep, 5/18/26, a Monday).
    var r = await open('start-prodPrep');
    add('P1', 'snapped phase start: only the six Mondays can be picked, the start capped alone, the snap hint',
      isMondayOnly(r, MON_HINT) && r.solo.join() === '2026-05-18', r, '36 greyed non-Mondays, no band, solo 2026-05-18, "' + MON_HINT + '"');

    await clickDay('2026-05-20');
    var after = {value: $('start-prodPrep').value, open: !!document.querySelector('.date-pop')};
    add('P2', 'a click on a greyed Wednesday writes nothing and leaves the picker open',
      after.value === '2026-05-18' && after.open, after, 'value 2026-05-18, still open');

    await clickDay('2026-05-25');
    after = {value: $('start-prodPrep').value, open: !!document.querySelector('.date-pop')};
    add('P3', 'a click on a Monday writes it and closes the picker', after.value === '2026-05-25' && !after.open, after, 'value 2026-05-25, closed');

    // A Wednesday already in the field (typed, or saved before this change) shows the Monday the phase starts on,
    // and opening the picker does not rewrite it.
    T.set('start-prodPrep', '2026-05-27'); await T.sleep(400);
    r = await open('start-prodPrep');
    add('P4', 'a typed Wednesday with Snap on: the picker caps its Monday, the field keeps the Wednesday',
      isMondayOnly(r, MON_HINT) && r.solo.join() === '2026-05-25' && $('start-prodPrep').value === '2026-05-27',
      {pick: r, value: $('start-prodPrep').value}, 'solo 2026-05-25, value 2026-05-27');

    // ---- Snap to Monday off: any day, the exact day, no band.
    $('snap-prodPrep').click(); await T.sleep(400);
    r = await open('start-prodPrep');
    add('P5', 'Snap off: every day can be picked, the start (a Wednesday) capped alone, no band, no hint',
      isDay(r) && r.solo.join() === '2026-05-27' && !$('snap-prodPrep').checked, r, 'no greyed day, no band, solo 2026-05-27');
    await clickDay('2026-05-28');
    add('P6', 'Snap off: a click on a Thursday writes the Thursday', $('start-prodPrep').value === '2026-05-28',
      $('start-prodPrep').value, '2026-05-28');

    // Snap back on: Mondays only again, and the switch rewrote nothing.
    $('snap-prodPrep').click(); await T.sleep(400);
    r = await open('start-prodPrep');
    add('P7', 'Snap back on: Mondays only again, and the Thursday stays in the field',
      isMondayOnly(r, MON_HINT) && r.solo.join() === '2026-05-25' && $('start-prodPrep').value === '2026-05-28' && $('snap-prodPrep').checked,
      {pick: r, value: $('start-prodPrep').value}, 'solo 2026-05-25, value 2026-05-28');

    // ---- A Dates phase (Post): its start and its end are both used to the day.
    T.set('unit-post', 'dates'); await T.sleep(500);
    var rs = await open('start-post'), re = await open('end-post');
    add('U1', 'a Dates phase: start and end are picked to the day, with no band (its hidden Snap switch is ignored)',
      isDay(rs) && isDay(re) && $('snap-post').checked, {start: rs, end: re, snapChecked: $('snap-post').checked}, 'both: no greyed day, no band, no hint');

    // ---- A custom phase in Days.
    $('add-phase-btn').click(); await T.sleep(500);
    var units = document.querySelectorAll('.form-panel select[id^="unit-custom"]');
    var ckey = units.length ? units[units.length - 1].id.slice(5) : null;
    if(ckey){ T.set('unit-' + ckey, 'days'); await T.sleep(400); }
    r = ckey ? await open('start-' + ckey) : null;
    add('U2', 'a custom phase in Days: its start is picked to the day', !!ckey && isDay(r), {key: ckey, pick: r}, 'no greyed day, no band, no hint');

    // ---- Every hiatus start is snapped, so Mondays only.
    r = await open(document.querySelector('#hiatus-list .hiatus-start'));
    add('H1', 'an all-phase hiatus start: Mondays only, the hiatus hint', isMondayOnly(r, HIA_HINT), r, '36 greyed, "' + HIA_HINT + '"');
    r = await open('phiatus-start-prodPrep');
    add('H2', "a phase's own hiatus start: Mondays only, the hiatus hint", isMondayOnly(r, HIA_HINT), r, '36 greyed, "' + HIA_HINT + '"');

    // ---- A custom holiday is one day.
    r = await open('custom-hol-date');
    add('D1', 'a custom holiday: any day, no band, no hint (as before)', isDay(r), r, 'no greyed day, no band, no hint');

    // ---- The calendar range keeps the week band: any day picks its week.
    T.set('cal-range-start', '2026-05-20'); await T.sleep(500);
    r = await open('cal-range-start');
    add('W1', 'the calendar range: any day, the picked week banded, the week hint (unchanged)',
      !!r && r.off === 0 && r.band === 7 && r.solo.length === 0 && r.hint === WEEK_HINT, r, 'no greyed day, band 7, "' + WEEK_HINT + '"');
    T.set('cal-range-start', ''); await T.sleep(500);

    // ---- Anchor To: its start picks a week (whole-week shift), its "ends by" is a day.
    $('pop-anchor-btn').click(); await T.sleep(300);
    T.set('tool-anchor-phase', 'prodPrep'); T.set('tool-anchor-edge', 'start'); await T.sleep(300);
    r = await open('tool-anchor-date');
    add('A1', "Anchor To's start: any day picks its week (unchanged)", !!r && r.off === 0 && r.band === 7 && r.hint === WEEK_HINT,
      {pick: r, value: $('tool-anchor-date').value}, 'no greyed day, band 7, the week hint');
    T.set('tool-anchor-edge', 'end'); await T.sleep(300);
    r = await open('tool-anchor-date');
    add('A2', "Anchor To's \"ends by\": the exact day, no band", isDay(r) && r.solo.length === 1 && r.solo[0] === $('tool-anchor-date').value,
      {pick: r, value: $('tool-anchor-date').value}, 'no greyed day, no band, the deadline capped alone');
    T.set('tool-anchor-edge', 'start');

    // ---- Rebuild From follows the chosen phase's own Snap to Monday.
    $('pop-solve-btn').click(); await T.sleep(300);
    T.set('tool-solve-phase', 'prodPrep'); await T.sleep(300);
    r = await open('tool-solve-date');
    add('R1', 'Rebuild From on a snapped phase: Mondays only', isMondayOnly(r, MON_HINT), {pick: r, phase: $('tool-solve-phase').value}, '36 greyed, the snap hint');
    $('snap-prodPrep').click(); await T.sleep(400);
    T.set('tool-solve-phase', 'prodPrep'); await T.sleep(300);
    r = await open('tool-solve-date');
    add('R2', 'Rebuild From on a phase with Snap off: any day, no band', isDay(r), {pick: r, snap: $('snap-prodPrep').checked}, 'no greyed day, no band, no hint');
    $('snap-prodPrep').click(); await T.sleep(300);
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'datepick', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
