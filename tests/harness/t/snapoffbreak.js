// snapoffbreak -- a Weeks phase with Snap to Mon OFF beside a hiatus still delivers its whole weeks (the second audit's
// AUD2-071, item 3.6; leg built from repro/audit-b1-snapoff.js and the skeptic's vr09-snapoff).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh snapoffbreak 300
//
// THE BUG: computeSchedule's extendEndForHiatus stepped 7 days at a time from the typed start and asked only each
// step's FIRST day whether it was in a hiatus. Hiatuses are whole Monday-to-Sunday weeks, so with Snap on (every step a
// Monday) that is exact; from a mid-week start a step straddling the break's first or last Monday counted as wholly
// worked or wholly paused. On the reference calendar (Christmas break Mon 12/21/26 - Sun 1/3/27) with Post's Snap off:
// 12/23 x 2 wk read "12/23/26 -> 1/19/27" and drew THREE cells (Post wk 1-3) in the grid and in Excel; 12/30 x 1 drew
// two; 12/18 x 1 ended 12/24, inside the break; 11/25 x 4 ended 12/22 having worked 18 of its 20 days.
// THE FIX: a non-Monday start counts the phase's days, 7 per week, skipping every day a hiatus covers (all-phase or its
// own). With no hiatus in the way that is exactly the old 7-day step; a Monday start keeps the week walk.
//
//   S1  12/23 x 2: "12/23/26 -> 1/15/27 (2 wk)", Post wk 1 (1/4/27) and wk 2 (1/11/27) only
//   S2  12/30 x 1: "-> 1/8/27 (1 wk)", one cell, 1/4/27
//   S3  12/18 x 1: Fri 12/18, then Mon-Thu after the break: "-> 1/7/27 (1 wk)", cells 12/14/26 and 1/4/27
//   S4  11/25 x 4: 20 working days, the last two after the break: "-> 1/5/27 (4 wk)", cells 11/23 ... 12/14/26, 1/4/27
//   S5  12/16 x 1: "-> 1/5/27", cells 12/14/26 and 1/4/27 (red before: ended 12/22/26, inside the break)
//   C1  controls that never touched a break boundary, unchanged: 12/16 x 3 and 1/6/27 x 2 both end 1/19/27, 4 and 3 cells
//   R1  12/23 x 2, the toolbar arrow +1 then -1 (the step-over): Post starts Mon 1/11/27, then Mon 1/4/27, where it works
//       from, with the very weeks it had as typed (a start inside a held break moves from its Monday, stepOverHeld's
//       workStart; keeping the Wednesday put it 1/13 then 1/6, two days late)
//   P1  the hiatus ripple (on for this case): the break cut from 2 weeks to 1 puts Post, typed Wed 12/23, on the Monday it
//       works from and pulls it a week, to Mon 12/28/26 (12/28 - 1/8/27); keeping the Wednesday put it on 12/30, 5 days
//   C2  Snap ON, 12/21 x 2 (a Monday inside the break): "-> 1/15/27", cells 1/4 and 1/11/27, exactly as before
//   X1  Excel for 12/23 x 2: "Post wk 1" and "Post wk 2", no "Post wk 3"
//   E0  no console errors, no native alert
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases, steps: []};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function tx(el) { return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  async function settle() { var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(60); var s = JSON.stringify(T.gridSignature()) + tx(document.getElementById('meta-post')); if (s === last) same++; else { same = 0; last = s; } } }
  function cells() { var a = []; document.querySelectorAll('#table-wrap td[data-pkey="post"][data-week]').forEach(function (t) { a.push(t.dataset.week + (t.classList.contains('sheet-hiatus-cell') ? 'H' : '') + ':' + tx(t).slice(0, 22)); }); return a.sort(); }
  function meta() { return tx(document.getElementById('meta-post')); }
  async function post(start, weeks) { T.set('start-post', start); T.set('weeks-post', String(weeks)); await settle(); var r = {l: start + ' x ' + weeks, meta: meta(), cells: cells()}; out.steps.push(r); return r; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  try {
    await T.appReady(); T.buildFixture(); await settle();
    T.set('start-localization', ''); T.set('weeks-localization', ''); await settle();
    var sp = document.getElementById('snap-post'); if (sp && sp.checked) sp.click(); await settle();
    out.snapPostChecked = sp ? sp.checked : 'none';

    var s1 = await post('2026-12-23', 2);
    add('S1', '12/23 x 2 (inside the break): works 1/4 - 1/15/27, two cells',
        /^12\/23\/26 → 1\/15\/27 \(2 wk\)/.test(s1.meta) && same(s1.cells, ['2027-01-04:Post wk 1', '2027-01-11:Post wk 2']), s1,
        '12/23/26 → 1/15/27 (2 wk); 2027-01-04 wk 1, 2027-01-11 wk 2');
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var xs = [];
    wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) {
      if (c.isMerged && c.master && c.master.address !== c.address) return;
      var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
      if (typeof v === 'string' && /^Post wk/.test(v)) xs.push(v);
    }); }); });
    add('X1', 'Excel for 12/23 x 2: Post wk 1 and wk 2, no wk 3', same(xs.slice().sort(), ['Post wk 1', 'Post wk 2']), xs, ['Post wk 1', 'Post wk 2']);

    var s2 = await post('2026-12-30', 1);
    add('S2', '12/30 x 1 (inside the break): works 1/4 - 1/8/27, one cell',
        /→ 1\/8\/27 \(1 wk\)/.test(s2.meta) && same(s2.cells, ['2027-01-04:Post wk 1']), s2, '→ 1/8/27 (1 wk); 2027-01-04 only');
    var s3 = await post('2026-12-18', 1);
    add('S3', '12/18 x 1 (Fri before the break): Fri 12/18, then 1/4 - Thu 1/7/27',
        /^12\/18\/26 → 1\/7\/27 \(1 wk\)/.test(s3.meta) && same(s3.cells, ['2026-12-14:Post wk 1', '2027-01-04:Post wk 2']), s3,
        '12/18/26 → 1/7/27 (1 wk); 2026-12-14, 2027-01-04');
    var s4 = await post('2026-11-25', 4);
    add('S4', '11/25 x 4 (ends across the break\'s first Monday): 20 working days, the last on Tue 1/5/27',
        /^11\/25\/26 → 1\/5\/27 \(4 wk\)/.test(s4.meta) && same(s4.cells,
          ['2026-11-23:Post wk 1', '2026-11-30:Post wk 2', '2026-12-07:Post wk 3', '2026-12-14:Post wk 4', '2027-01-04:Post wk 5']), s4,
        '11/25/26 → 1/5/27 (4 wk); five cells, the last 2027-01-04');
    var s5 = await post('2026-12-16', 1);
    add('S5', '12/16 x 1: Wed-Fri before the break, Mon-Tue after it: ends Tue 1/5/27',
        /^12\/16\/26 → 1\/5\/27 \(1 wk\)/.test(s5.meta) && same(s5.cells, ['2026-12-14:Post wk 1', '2027-01-04:Post wk 2']), s5,
        '12/16/26 → 1/5/27 (1 wk)');
    var c1a = await post('2026-12-16', 3), c1b = await post('2027-01-06', 2);
    add('C1', 'controls already right stay as they were: 12/16 x 3 and 1/6/27 x 2 end 1/19/27',
        /^12\/16\/26 → 1\/19\/27 \(3 wk\)/.test(c1a.meta) && same(c1a.cells, ['2026-12-14:Post wk 1', '2027-01-04:Post wk 2', '2027-01-11:Post wk 3', '2027-01-18:Post wk 4'])
        && /^1\/6\/27 → 1\/19\/27 \(2 wk\)/.test(c1b.meta) && same(c1b.cells, ['2027-01-04:Post wk 1', '2027-01-11:Post wk 2', '2027-01-18:Post wk 3']),
        {a: c1a, b: c1b}, 'as before the fix');
    // The toolbar arrows step over the locked break: a start typed inside it moves from the Monday it works from.
    var r0 = await post('2026-12-23', 2);
    document.getElementById('shift-fwd-btn').click(); await T.sleep(900); await settle();
    var r1 = {start: document.getElementById('start-post').value, meta: meta(), cells: cells()};
    document.getElementById('shift-back-btn').click(); await T.sleep(900); await settle();
    var r2 = {start: document.getElementById('start-post').value, meta: meta(), cells: cells()};
    add('R1', '12/23 x 2, toolbar +1 then -1: Mon 1/11/27 (1/11 - 1/22), then Mon 1/4/27 with the same weeks as typed',
        r1.start === '2027-01-11' && /^1\/11\/27 → 1\/22\/27 \(2 wk\)/.test(r1.meta) && same(r1.cells, ['2027-01-11:Post wk 1', '2027-01-18:Post wk 2'])
        && r2.start === '2027-01-04' && /^1\/4\/27 → 1\/15\/27 \(2 wk\)/.test(r2.meta) && same(r2.cells, r0.cells),
        {typed: r0, plus1: r1, back: r2}, '2027-01-11 then 2027-01-04, cells as typed');
    // The hiatus ripple (switched on here; every other leg runs with it off): the break a snap-off start sits in is cut to
    // one week, so the start is first put on the Monday it works from (rippleNormaliseInside), then pulled one week.
    var p0 = await post('2026-12-23', 2);
    var sw = document.getElementById('pref-hiatus-ripple'); if (sw && !sw.checked) sw.click(); await T.sleep(300);
    var side = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (side && !side.classList.contains('active')) side.click(); await T.sleep(400);
    var brk = Array.prototype.filter.call(document.querySelectorAll('#hiatus-list .hiatus-entry'), function (r) { return (r.querySelector('.hiatus-start') || {}).value === '2026-12-21'; })[0];
    var wk = brk && brk.querySelector('.hiatus-weeks');
    if (wk) { wk.focus(); await T.sleep(100); }
    var focused = !!wk && document.activeElement === wk;
    if (wk) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(wk, '1');
      ['input', 'change'].forEach(function (t) { wk.dispatchEvent(new Event(t, {bubbles: true})); });
      await T.sleep(600); await settle();
    }
    if (wk) wk.blur();
    var p1 = {start: document.getElementById('start-post').value, meta: meta(), cells: cells(), focused: focused, ripple: sw ? sw.checked : 'none',
              note: tx(brk && brk.querySelector('.ripple-note'))};
    if (sw && sw.checked) sw.click(); await T.sleep(300);
    if (wk) {   // the break back to 2 weeks, with the ripple off again, for C2
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(wk, '2');
      ['input', 'change'].forEach(function (t) { wk.dispatchEvent(new Event(t, {bubbles: true})); });
      await settle();
    }
    add('P1', 'ripple: the break 12/21/26 cut to 1 week pulls Post (typed Wed 12/23) one week from where it works: Mon 12/28/26',
        p1.focused && p1.start === '2026-12-28' && /^12\/28\/26 → 1\/8\/27 \(2 wk\)/.test(p1.meta), {typed: p0, after: p1}, 'start 2026-12-28, 12/28/26 → 1/8/27');
    if (sp && !sp.checked) sp.click(); await settle();
    var c2 = await post('2026-12-21', 2);
    add('C2', 'Snap on, 12/21 x 2: unchanged, 1/4 - 1/15/27',
        /→ 1\/15\/27 \(2 wk\)/.test(c2.meta) && same(c2.cells, ['2027-01-04:Post wk 1', '2027-01-11:Post wk 2']), c2, '→ 1/15/27 (2 wk)');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors.slice(0, 3), alerts: window.__alerts}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception'); }
  T.done(out);
})(); });
