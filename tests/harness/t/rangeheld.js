// rangeheld -- a calendar range with a date inside a HELD break stays where it is, whole, when the step-over moves the
// calendar (the second audit's AUD2-055, item 3.6; leg built from repro/audit-b2-range.js).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh rangeheld 400
//
// THE BUG: a coordinator limits the waterfall to the calendar year (Show tab range 1/1/26 to 12/31/26) on the reference
// calendar (T.buildFixture: four locked 2-week winter breaks, the first Mon 12/21/26). The toolbar arrow 1 wk later,
// then 1 wk earlier, must leave every date where it was. The phases came back, but the range end went 12/31/26 ->
// 1/14/27 -> 1/7/27: stepOverHeld first pushes a date inside a held break out of it, so the end landed the week after
// the break and never came back. The waterfall, Excel and both PDFs then quietly gained the week of 1/4/27.
// THE FIRST FIX held only the date inside the break, and its partner kept moving: the window narrowed a week per press
// and, pressed far enough, its start passed its end (11/2/26 - 12/31/26 read 1/18/27 - 12/31/26 after nine presses: an
// invalid range, the waterfall back to all 104 weeks). The W checks below are that review's cases.
// THE FIX: under the step-over a range with a date on a held break's week stays where it is, BOTH dates, as the break
// does (shiftCalendarDates step 2b). A range with neither date in a held break moves N working weeks, as before.
//
//   R1  +1 then -1: the range is back to 1/1/26 - 12/31/26, the same 53 rows, the last the week of 12/28/26, and the
//       amber strip reads as it did (red on the build before: 54 rows ending 1/4/27)
//   R2  after +1: the whole range stays 1/1/26 - 12/31/26, still 53 rows (the first fix moved the start to 1/8/26)
//   R3  every phase start round-trips (as it already did), and the phases did move
//   C2  the toolbar arrow twice each way: the range stays 1/1/26 - 12/31/26 throughout, and everything comes back
//   W1  11/2/26 - 12/31/26, the arrow 1 wk later nine times: the range never turns invalid, never narrows (9 rows,
//       11/2/26 to the week of 12/28/26, every press), and nine presses back return everything (red on the first fix)
//   F1  the Shift form (all phases, By weeks) 9 Later then 9 Earlier on that window: the same (red on the first fix)
//   W2  1/1/26 - 12/31/26: +4 keeps 53 rows, -4 brings everything back; -3 keeps 53 rows, +3 brings everything back
//       (red on the first fix: 49 and 56 rows)
//   C1  control: a range END outside any break (11/30/26) still moves with the calendar: +1 -> 12/7/26, -1 -> 11/30/26
//   C3  control: a range that spans the break with neither date inside it (11/30/26 - 1/13/27) moves as it always did:
//       +1 -> 12/7/26 - 1/20/27, -1 -> back
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
  function invalid() { return ['cal-range-start', 'cal-range-end'].some(function (id) { var e = byId(id); return !!e && e.classList.contains('is-invalid'); }); }
  function snap() { return {range: [val('cal-range-start'), val('cal-range-end')], weeks: weeks(), notice: notice(), starts: starts(), invalid: invalid()}; }
  function same(x, y) { return JSON.stringify(x) === JSON.stringify(y); }
  async function arrow(id) { byId(id).click(); await T.sleep(900); await settled(); }
  async function setRange(s, e) { T.set('cal-range-start', s); T.set('cal-range-end', e); await T.sleep(700); await settled(); }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!q('table.sheet-table'); }, 'grid', 100, 100);
    await settled();
    await setRange('2026-01-01', '2026-12-31');
    var a = snap();
    await arrow('shift-fwd-btn');
    var b = snap();
    await arrow('shift-back-btn');
    var c = snap();
    out.range = {before: a, plus1: b, back: c};
    add('R1', 'range, rows and strip are back after +1 then -1',
        same(a.range, c.range) && same(a.weeks, c.weeks) && a.notice === c.notice && a.weeks.n === 53 && a.weeks.last === '2026-12-28',
        {before: a, back: c}, '2026-01-01..2026-12-31, 53 rows ending 2026-12-28, same strip');
    add('R2', 'after +1 the whole range stays where it is (its end is inside a held break): 53 rows',
        same(b.range, ['2026-01-01', '2026-12-31']) && same(b.weeks, a.weeks) && !b.invalid,
        {range: b.range, weeks: b.weeks}, ['2026-01-01', '2026-12-31']);
    add('R3', 'every phase start round-trips, and the phases did move', a.starts === c.starts && a.starts !== b.starts,
        {a: a.starts, b: b.starts, c: c.starts}, 'same starts');
    // Two arrows each way: the range never moves, everything comes back.
    await arrow('shift-fwd-btn'); await arrow('shift-fwd-btn');
    var d2 = snap();
    await arrow('shift-back-btn'); await arrow('shift-back-btn');
    var d0 = snap();
    add('C2', '+2 then -2: the range stays 1/1/26 - 12/31/26 throughout; everything is back',
        same(d2.range, ['2026-01-01', '2026-12-31']) && same(d2.weeks, a.weeks) && same(d0, a),
        {plus2: d2, back: d0}, '2026-01-01..2026-12-31 throughout');

    // W1 (the review's first case): a "through year end" window pressed nine weeks later never inverts or narrows.
    await setRange('2026-11-02', '2026-12-31');
    var w0 = snap(), w1 = [];
    for (var i = 0; i < 9; i++) { await arrow('shift-fwd-btn'); w1.push(snap()); }
    for (var j = 0; j < 9; j++) await arrow('shift-back-btn');
    var w9 = snap();
    var w1bad = w1.filter(function (s) { return s.invalid || !same(s.range, w0.range) || !same(s.weeks, w0.weeks); });
    out.w1 = {before: w0, presses: w1, back: w9};
    add('W1', '11/2/26 - 12/31/26 pressed nine weeks later: valid and 9 rows every press; nine back return everything',
        w0.weeks.n === 9 && w0.weeks.first === '2026-11-02' && w0.weeks.last === '2026-12-28' && !w0.invalid
        && w1bad.length === 0 && w1[8].starts !== w0.starts && same(w9, w0),
        {before: w0, bad: w1bad.map(function (s) { return {range: s.range, weeks: s.weeks, invalid: s.invalid}; }), back: w9},
        '9 rows 2026-11-02..2026-12-28 after every press, no invalid ring, then back');

    // F1: the Shift form takes the same path. All phases (as it opens), By weeks, 9 Later, on the same window.
    T.closePops(); await T.sleep(150); byId('pop-shift-btn').click(); await T.sleep(300);
    T.set('tool-shift-weeks', '9'); byId('tool-shift-later').click(); await T.sleep(1100); await settled();
    var f9 = snap();
    T.closePops(); await T.sleep(150); byId('pop-shift-btn').click(); await T.sleep(300);
    T.set('tool-shift-weeks', '9'); byId('tool-shift-earlier').click(); await T.sleep(1100); await settled();
    T.closePops(); await T.sleep(150);
    var f0 = snap();
    out.f1 = {plus9: f9, back: f0};
    add('F1', 'the Shift form, all phases 9 weeks Later then Earlier: the window stays 11/2/26 - 12/31/26 and valid; back',
        same(f9.range, w0.range) && same(f9.weeks, w0.weeks) && !f9.invalid && f9.starts !== w0.starts && same(f0, w0),
        {plus9: {range: f9.range, weeks: f9.weeks, invalid: f9.invalid}, back: same(f0, w0)}, '9 rows, then back');

    // W2 (the review's second case): 1/1/26 - 12/31/26, four forward and three back, from the start each time.
    await setRange('2026-01-01', '2026-12-31');
    var v0 = snap();
    for (var k = 0; k < 4; k++) await arrow('shift-fwd-btn');
    var v4 = snap();
    for (k = 0; k < 4; k++) await arrow('shift-back-btn');
    var v4b = snap();
    for (k = 0; k < 3; k++) await arrow('shift-back-btn');
    var v3 = snap();
    for (k = 0; k < 3; k++) await arrow('shift-fwd-btn');
    var v3b = snap();
    out.w2 = {before: v0, plus4: v4, back4: v4b, minus3: v3, back3: v3b};
    add('W2', '1/1/26 - 12/31/26: +4 and -3 each keep 53 rows; each comes back',
        v4.weeks.n === 53 && v3.weeks.n === 53 && same(v4.range, v0.range) && same(v3.range, v0.range)
        && !v4.invalid && !v3.invalid && same(v4b, v0) && same(v3b, v0),
        {plus4: {range: v4.range, weeks: v4.weeks}, minus3: {range: v3.range, weeks: v3.weeks}, back4: same(v4b, v0), back3: same(v3b, v0)},
        '53 rows after +4 and after -3; both back');

    // Control: a range end outside a break moves with the calendar, as it always did.
    await setRange('2026-01-01', '2026-11-30');
    var e0 = snap();
    await arrow('shift-fwd-btn');
    var e1 = snap();
    await arrow('shift-back-btn');
    var e2 = snap();
    add('C1', 'a range end outside a break still moves: 11/30/26 -> 12/7/26 -> 11/30/26',
        e1.range[1] === '2026-12-07' && e1.range[0] === '2026-01-08' && same(e2, e0),
        {before: e0, plus1: e1, back: e2}, '2026-12-07 after +1, back after -1');
    // Control: a range spanning the break, neither date inside it, moves N working weeks as it always did.
    await setRange('2026-11-30', '2027-01-13');
    var s0 = snap();
    await arrow('shift-fwd-btn');
    var s1 = snap();
    await arrow('shift-back-btn');
    var s2 = snap();
    add('C3', 'a range across the break, neither date inside it, still moves: 12/7/26 - 1/20/27, then back',
        same(s1.range, ['2026-12-07', '2027-01-20']) && same(s2, s0), {before: s0, plus1: s1, back: s2},
        '2026-12-07..2027-01-20 after +1, back after -1');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception'); }
  T.done(out);
})(); });
