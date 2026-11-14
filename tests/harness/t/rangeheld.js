// rangeheld -- a calendar range date inside a HELD break stays with the break when the step-over moves the calendar
// (the second audit's AUD2-055, item 3.6; leg built from repro/audit-b2-range.js).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh rangeheld 240
//
// THE BUG: a coordinator limits the waterfall to the calendar year (Show tab range 1/1/26 to 12/31/26) on the reference
// calendar (T.buildFixture: four locked 2-week winter breaks, the first Mon 12/21/26). The toolbar arrow 1 wk later,
// then 1 wk earlier, must leave every date where it was. The phases came back, but the range end went 12/31/26 ->
// 1/14/27 -> 1/7/27: stepOverHeld first pushes a date inside a held break out of it, so the end landed the week after
// the break and never came back. The waterfall, Excel and both PDFs then quietly gained the week of 1/4/27.
// THE FIX: under the step-over a range date on a held break's week stays with the break, as a note under a held band
// already does (shiftCalendarDates step 2b). A range date anywhere else moves N working weeks, as before.
//
//   R1  +1 then -1: the range is back to 1/1/26 - 12/31/26, the same 53 rows, the last the week of 12/28/26, and the
//       amber strip reads as it did (red on the build before: 54 rows ending 1/4/27)
//   R2  after +1: the range end is still 12/31/26 (inside the held break) and the start moved one week, to 1/8/26
//   R3  every phase start round-trips (as it already did)
//   C1  control: a range END outside any break (11/30/26) still moves with the calendar: +1 -> 12/7/26, -1 -> 11/30/26
//   C2  the toolbar arrow twice each way: the held end stays 12/31/26 throughout, and everything comes back
//   E0  no console errors, no native alert
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function byId(id) { return document.getElementById(id); }
  function val(id) { var e = byId(id); return e ? e.value : null; }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  async function settled() { var p = '', n = 0; for (var i = 0; i < 60 && n < 3; i++) { var s = JSON.stringify(T.gridSignature()); if (s === p) n++; else { n = 0; p = s; } await T.sleep(100); } }
  function weeks() { var s = {}; qa('#table-wrap td[data-week]').forEach(function (td) { s[td.getAttribute('data-week')] = 1; }); var k = Object.keys(s).sort(); return {n: k.length, first: k[0], last: k[k.length - 1]}; }
  function notice() { return txt(byId('calrange-notice')); }
  var PH = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function starts() { return PH.map(function (k) { return val('start-' + k); }).join(','); }
  function snap() { return {range: [val('cal-range-start'), val('cal-range-end')], weeks: weeks(), notice: notice(), starts: starts()}; }
  async function arrow(id) { byId(id).click(); await T.sleep(900); await settled(); }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!q('table.sheet-table'); }, 'grid', 100, 100);
    await settled();
    T.set('cal-range-start', '2026-01-01'); T.set('cal-range-end', '2026-12-31'); await T.sleep(700); await settled();
    var a = snap();
    await arrow('shift-fwd-btn');
    var b = snap();
    await arrow('shift-back-btn');
    var c = snap();
    out.range = {before: a, plus1: b, back: c};
    add('R1', 'range, rows and strip are back after +1 then -1',
        JSON.stringify(a.range) === JSON.stringify(c.range) && JSON.stringify(a.weeks) === JSON.stringify(c.weeks)
        && a.notice === c.notice && a.weeks.n === 53 && a.weeks.last === '2026-12-28',
        {before: a, back: c}, '2026-01-01..2026-12-31, 53 rows ending 2026-12-28, same strip');
    add('R2', 'after +1 the range end stays inside its held break; the start moves one week',
        b.range[0] === '2026-01-08' && b.range[1] === '2026-12-31', b.range, ['2026-01-08', '2026-12-31']);
    add('R3', 'every phase start round-trips', a.starts === c.starts && a.starts !== b.starts, {a: a.starts, b: b.starts, c: c.starts}, 'same starts');
    // Two arrows each way: the held end never moves, the start comes back.
    await arrow('shift-fwd-btn'); await arrow('shift-fwd-btn');
    var d2 = snap();
    await arrow('shift-back-btn'); await arrow('shift-back-btn');
    var d0 = snap();
    add('C2', '+2 then -2: the held end stays 12/31/26 throughout; everything is back',
        d2.range[1] === '2026-12-31' && d2.range[0] === '2026-01-15' && JSON.stringify(d0) === JSON.stringify(a),
        {plus2: d2, back: d0}, 'end 2026-12-31 throughout');
    // Control: a range end outside any break moves with the calendar, as it always did.
    T.set('cal-range-end', '2026-11-30'); await T.sleep(700); await settled();
    var e0 = snap();
    await arrow('shift-fwd-btn');
    var e1 = snap();
    await arrow('shift-back-btn');
    var e2 = snap();
    add('C1', 'a range end outside a break still moves: 11/30/26 -> 12/7/26 -> 11/30/26',
        e1.range[1] === '2026-12-07' && e1.range[0] === '2026-01-08' && JSON.stringify(e2) === JSON.stringify(e0),
        {before: e0, plus1: e1, back: e2}, '2026-12-07 after +1, back after -1');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception'); }
  T.done(out);
})(); });
