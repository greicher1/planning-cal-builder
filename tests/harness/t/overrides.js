// overrides -- Production's day overrides travel BY SHOOT-DAY NUMBER on every mover
// (FIX-PLAN.md 2.1; AUDIT-REPORT M-4; owner ruling R2).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides ./run.sh overrides 150
//
// tests/fixtures/dayoverrides.sptcal: Production from Mon 6/29/26, 80 days, US General, with
//   7/3  'on'   -- the observed Independence Day, worked
//   7/6  'half' -- shoot day 5
//   7/7  'off'  -- shoot day 6
//   7/11 'on'   -- a worked Saturday
// a LOCKED one-week "Summer Break" hiatus from 7/13 (it does not move with a shift), and Pre Prep
// snap-off on Wed 4/8 -- a gap after the Writers' Room, which Close all gaps closes.
//
// On v1.3.0: Shift All moved the marks by calendar days, so +1 wk put the half and the off INSIDE the
// Summer Break, where the simulation cannot honour them (both marks vanish); Shift From on Post --
// which does not move Production -- moved them too; the month-view drag, Rebuild From, Close all gaps
// and "Start after previous phase" did not move them at all.
//
// By shoot-day number (the natural shoot days -- no overrides -- index the marks; FIX-PLAN 2.1):
//   +1 wk (Production 7/6; natural days 7/6-7/10, the hiatus, then 7/20 on):
//     half: day 5 -> 7/10   off: day 6 -> 7/20   worked Saturday: the Saturday of the week holding
//     its reference day (day 9, 7/23) -> 7/25   worked holiday: its weekday (Fri) in its reference
//     day's week -> 7/10, an ordinary shoot day that already carries the half -- it no longer works a
//     day off, and the result line says so.
//   Close all gaps from there (Production 6/22; natural days 6/22-6/26, 6/29-7/2, 7/6...):
//     half: day 5 -> 6/26   off: day 6 -> 6/29   worked Saturday: reference day 10 (7/6) -> 7/11
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var ORIGINAL = {'2026-07-03': 'on', '2026-07-06': 'half', '2026-07-07': 'off', '2026-07-11': 'on'};
  var PLUS_ONE = {'2026-07-10': 'half', '2026-07-20': 'off', '2026-07-25': 'on'};
  var CLOSED   = {'2026-06-26': 'half', '2026-06-29': 'off', '2026-07-11': 'on'};
  function same(a, b){
    var ka = Object.keys(a || {}).sort(), kb = Object.keys(b || {}).sort();
    return ka.join() === kb.join() && ka.every(function (k) { return a[k] === b[k]; });
  }
  function txt(id){ return ((document.getElementById(id) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function reading(){ return {meta: txt('meta-production'), note: txt('prod-ov-note'), start: document.getElementById('start-production').value}; }
  function msg(pop){ return ((document.querySelector('#' + pop + ' [data-tools-msg]') || {}).textContent || '').trim(); }
  // The wrap is the meta line's last date; Post must start on the Monday after it.
  function wrapIso(meta){
    var m = /→\s*(\d+)\/(\d+)\/(\d+)\s*$/.exec(meta || '');
    return m ? ('20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2)) : '';
  }
  function mondayAfterIso(iso){
    var d = new Date(iso + 'T00:00:00Z'); do { d = new Date(d.getTime() + 86400000); } while(d.getUTCDay() !== 1);
    return d.toISOString().slice(0, 10);
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
  async function settle(){ await T.sleep(600); }
  function closePops(){ document.body.click(); }
  async function openPop(btn){ closePops(); await T.sleep(150); document.getElementById(btn).click(); await T.sleep(200); }
  async function undo(n){ for(var i = 0; i < (n || 1); i++){ document.getElementById('undo-btn').click(); await T.sleep(900); } }
  var r0;
  function isOriginal(r){ return r.meta === r0.meta && r.note === r0.note && r.start === r0.start; }
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt('meta-production')); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A crash backup IS captureSnapshot(). The title is not a schedule input, so editing it banks a
    // backup of the restored calendar exactly as loaded.
    T.set('show-title', 'Overrides Test');
    var s0 = await snap();
    r0 = reading();
    add('O0', 'restored: the four marks as saved, all honoured',
      same(s0.dayOverrides, ORIGINAL) && /1 half/.test(r0.note) && /1 off/.test(r0.note) && /2 added/.test(r0.note),
      {dayOverrides: s0.dayOverrides, note: r0.note, meta: r0.meta}, ORIGINAL);

    // O1 -- Shift From Post +1 wk: Production does not move, so no mark may move.
    await openPop('pop-ripple-btn');
    T.set('tool-ripple-phase', 'post'); T.set('tool-ripple-weeks', '1');
    document.getElementById('tool-ripple-later').click();
    await settle();
    var s1 = await snap(), r1 = reading();
    add('O1', 'Shift From Post +1 wk leaves every mark, the Production row and the override note alone',
      same(s1.dayOverrides, ORIGINAL) && r1.meta === r0.meta && r1.note === r0.note,
      {dayOverrides: s1.dayOverrides, meta: r1.meta, note: r1.note}, {dayOverrides: ORIGINAL, meta: r0.meta, note: r0.note});
    await undo(1);
    add('O1u', 'one undo of the Shift From restores the calendar', isOriginal(reading()), reading(), r0);

    // O2 -- Shift All +1 wk (the popover form, so the result line can be read).
    await openPop('pop-shift-btn');
    T.set('tool-shift-weeks', '1');
    document.getElementById('tool-shift-later').click();
    await settle();
    var s2 = await snap(), r2 = reading(), m2 = msg('pop-shift');
    add('O2', 'Shift All +1 wk: each mark lands on its own shoot day (half 7/10, off 7/20, Saturday 7/25)',
      same(s2.dayOverrides, PLUS_ONE), {dayOverrides: s2.dayOverrides}, PLUS_ONE);
    add('O2n', 'Shift All +1 wk: the half and the off are still honoured (inside the hiatus they were lost)',
      /1 half/.test(r2.note) && /1 off/.test(r2.note) && /1 added/.test(r2.note), {note: r2.note}, '1 half · 1 off · 1 added');
    add('O2m', 'Shift All +1 wk: the result line says the worked holiday no longer lands on a day off',
      /no longer/i.test(m2), {msg: m2}, '... no longer ...');
    await undo(1);
    add('O2u', 'one undo of the Shift All restores the calendar and its marks', isOriginal(reading()), reading(), r0);

    // O3 -- the arrow button (runShift), the other Shift All entry point.
    closePops(); await T.sleep(150);
    document.getElementById('shift-fwd-btn').click();
    await settle();
    var s3a = await snap();
    add('O3a', 'the toolbar "1 wk ->" arrow: the same shoot-day move as the form', same(s3a.dayOverrides, PLUS_ONE), {dayOverrides: s3a.dayOverrides}, PLUS_ONE);
    await undo(1);

    // O3 -- the month-view drag: Production's pill one week row down (+7 days).
    if(!document.querySelector('.mv-daygrid')){ document.getElementById('view-month-btn').click(); await T.sleep(600); }
    for(var g = 0; g < 14 && !document.querySelector('#table-wrap .mv-pill[data-ph="production"]'); g++){
      var nx = document.getElementById('mv-next'); if(!nx) break; nx.click(); await T.sleep(250);
    }
    var pill = document.querySelector('#table-wrap .mv-pill[data-ph="production"]');
    if(!pill) throw new Error('no Production pill in the month view');
    var weekH = pill.closest('.mv-week').getBoundingClientRect().height;
    var pr = pill.getBoundingClientRect(), x = Math.round(pr.left + pr.width / 2), y = Math.round(pr.top + pr.height / 2);
    pill.dispatchEvent(new MouseEvent('mousedown', {clientX: x, clientY: y, button: 0, buttons: 1, bubbles: true, cancelable: true}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: x, clientY: y + Math.round(weekH), button: 0, buttons: 1, bubbles: true, cancelable: true}));
    await T.sleep(300);
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: x, clientY: y + Math.round(weekH), button: 0, buttons: 0, bubbles: true}));
    await settle();
    var s3 = await snap(), r3 = reading();
    add('O3', 'month-view drag of Production +7 days: the marks travel with the shoot, as Shift All',
      r3.start === '2026-07-06' && same(s3.dayOverrides, PLUS_ONE), {start: r3.start, dayOverrides: s3.dayOverrides, note: r3.note}, PLUS_ONE);
    await undo(1);
    add('O3u', 'one undo of the drag restores the calendar and its marks', isOriginal(reading()), reading(), r0);

    // O4 -- Shift From Production +1 wk, then Close all gaps (which also closes Pre Prep's gap).
    await openPop('pop-ripple-btn');
    T.set('tool-ripple-phase', 'production'); T.set('tool-ripple-weeks', '1');
    document.getElementById('tool-ripple-later').click();
    await settle();
    var s4a = await snap();
    add('O4a', 'Shift From Production +1 wk: the marks travel with the shoot', same(s4a.dayOverrides, PLUS_ONE), {dayOverrides: s4a.dayOverrides}, PLUS_ONE);
    await openPop('pop-solve-btn');
    document.getElementById('tool-close-gaps').click();
    await settle();
    var s4 = await snap(), r4 = reading();
    add('O4', 'then Close all gaps: Production on 6/22 with each mark on its shoot day (half 6/26, off 6/29, Saturday 7/11)',
      r4.start === '2026-06-22' && same(s4.dayOverrides, CLOSED), {start: r4.start, dayOverrides: s4.dayOverrides, note: r4.note}, CLOSED);
    await undo(2);
    add('O4u', 'two undos restore the calendar and its marks', isOriginal(reading()), reading(), r0);

    // O5 -- Shift From Production +1 wk, then the per-phase "Start after previous phase" button, which
    // puts Production back on 6/29. ⚠️ NOT a full round trip, by design: the half and the off come back
    // exactly (a natural day's number maps both ways), but a WORKED day off does not. On the way out the
    // worked holiday landed on the half's day and went (reported); the worked Saturday followed its
    // reference shoot day to 7/25, and from there its reference day is day 10, whose Saturday is still
    // 7/25 once the shoot is back. No rule can do better: a worked day off must land on a real weekend
    // or holiday, and the moved shoot need not have one where the original did.
    var BACK = {'2026-07-06': 'half', '2026-07-07': 'off', '2026-07-25': 'on'};
    await openPop('pop-ripple-btn');
    T.set('tool-ripple-phase', 'production'); T.set('tool-ripple-weeks', '1');
    document.getElementById('tool-ripple-later').click();
    await settle();
    closePops(); await T.sleep(150);
    await snap();
    document.getElementById('autostart-production').click();
    await settle();
    var s5 = await snap(), r5 = reading();
    add('O5', '"Start after previous phase" on Production: back on 6/29, the half and off on their original days',
      r5.start === '2026-06-29' && same(s5.dayOverrides, BACK) && /1 half/.test(r5.note) && /1 off/.test(r5.note),
      {start: r5.start, dayOverrides: s5.dayOverrides, note: r5.note}, BACK);
    await undo(2);

    // O6 -- Rebuild From Prod Prep, forward, pinned one week later (5/25): Production lands on 7/6.
    await openPop('pop-solve-btn');
    T.set('tool-solve-phase', 'prodPrep'); T.set('tool-solve-date', '2026-05-25');
    document.getElementById('tool-solve-fwd').click();
    await settle();
    var s6 = await snap(), r6 = reading(), post6 = document.getElementById('start-post').value;
    add('O6', 'Rebuild From Prod Prep forward (+1 wk): Production on 7/6 with the marks on their shoot days',
      r6.start === '2026-07-06' && same(s6.dayOverrides, PLUS_ONE), {start: r6.start, dayOverrides: s6.dayOverrides, msg: msg('pop-solve')}, PLUS_ONE);
    add('O6p', 'Rebuild forward: Post starts the Monday after the shoot as it now stands (marks included)',
      !!wrapIso(r6.meta) && post6 === mondayAfterIso(wrapIso(r6.meta)), {post: post6, wrap: wrapIso(r6.meta), note: r6.note}, 'Post = Monday after the wrap');
    await undo(1);
    add('O6u', 'one undo of the Rebuild restores the calendar and its marks', isOriginal(reading()), reading(), r0);

    // O7 -- Rebuild From Post, BACKWARDS, pinned one week later (11/9): the latest Production that still
    // ends by 11/9 must be searched with the marks where they will actually be.
    await openPop('pop-solve-btn');
    T.set('tool-solve-phase', 'post'); T.set('tool-solve-date', '2026-11-09');
    document.getElementById('tool-solve-back').click();
    await settle();
    var s7 = await snap(), r7 = reading(), post7 = document.getElementById('start-post').value;
    add('O7', 'Rebuild From Post backwards (11/9): Production on 7/6 with the marks on their shoot days',
      r7.start === '2026-07-06' && same(s7.dayOverrides, PLUS_ONE), {start: r7.start, note: r7.note, dayOverrides: s7.dayOverrides}, PLUS_ONE);
    add('O7e', 'Rebuild backwards: the shoot, marks included, wraps before Post begins',
      !!wrapIso(r7.meta) && wrapIso(r7.meta) < post7, {wrap: wrapIso(r7.meta), post: post7}, 'wrap < Post start');
    await undo(1);

    var clipped = T.clippedCells();
    add('O8', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: (clipped.h || []).slice(0, 5)}, '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'overrides', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
