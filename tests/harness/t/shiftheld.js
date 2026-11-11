// shiftheld -- THE STEP-OVER: Shift counts only the weeks a held hiatus does not cover (owner, 5 Nov 2026, picker
// "Step over it"; stepOverHeld in src/legacy/app.js).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=shiftheld ./run.sh shiftheld 300
//
// THE BUG (owner's screenshots, 5 Nov 2026): Phase & after Pre-Prep, to a date 4 weeks earlier, slid every phase 4
// CALENDAR weeks while the locked Christmas break stayed on Christmas. The break left Prod Prep's last weeks (Prod Prep
// finished 2 weeks sooner: a 2-week gap before Production) and landed in Production (the shoot ran 2 weeks longer: Post
// overlapped its last 2 weeks). Shift promises to keep the gaps; it kept neither.
//
// THE CALENDAR: tests/fixtures/shiftheld.sptcal (synthetic, built from anchorside.sptcal): every handoff back to back,
// the locked Christmas break 12/21/26 x 2 inside Prod Prep's last weeks.
//   Writer's Rm 4/20/26 x 20, Pre Prep 9/7/26 x 6, Prod Prep 10/19/26 x 10 (to 1/8/27, over the break),
//   Production 1/11/27 (100 days, US General, wrap Thu 6/3/27), Post 6/7/27 x 26, Localization 12/6/27 x 10;
//   the four locked winter breaks; notes PROD-WK1 1/11/27, PROD-WK4 2/1/27, POST-WK1 6/7/27, XMAS-NOTE 12/21/26
//   (under the break).
//
//   T0  the calendar as loaded
//   B1  Build Around from Pre Prep at 8/10/26, After (the plan rebuilt from scratch with the same lengths and gaps):
//       Production 11/30/26, wrap 5/5/27, Post 5/10/27. Then one Undo.
//   L1  the owner's move, set up but not run: the list shows Production landing 11/30/26, "Pulled 6 wks"
//   S1  ... Go: every phase lands where Build Around put it (red on the old build: Production 12/14/26, wrap 5/19/27)
//   S2  ... both handoffs either side of the shoot are back to back: Prod Prep ends Fri 11/27, Production starts Mon
//       11/30; the wrap (Wed 5/5) is before Post (Mon 5/10)
//   S3  ... notes ride with their phase's week: PROD-WK1 11/30/26, PROD-WK4 1/4/27 (Production's 4th week, after the
//       break), POST-WK1 5/10/27; XMAS-NOTE stays under the break
//   S4  ... the result line says it: "Production was pulled 6 wks to step over a held hiatus."
//   U1  one Undo restores the calendar
//   A1  the toolbar arrow, ← 1 wk twice: the second click takes Production from 1/4/27 over the break to 12/14/26
//       (3 calendar weeks), Prod Prep ends Fri 12/11, and the readout says "Production pulled 3 wks"
//   H1  To a date INSIDE the held break (Phase & after Production, starts on 12/21/26): Production starts 1/4/27, the
//       week after it, and the line says why
//   E1  an Ends phase: Prod Prep held by its end (1/8/27) and Phase & after Pre Prep to 8/10/26 lands it on Fri
//       11/27/26, start 9/21/26 (its END is mapped, not moved by its start's calendar distance)
//   W1  All phases by weeks, 4 Earlier: Production 11/30/26 too, and Writer's Rm moves 4 weeks (no break to cross)
//   E0  0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(id){ return (($(id) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  var MENU = function () { return $('pop-shift'); };
  function q(sel){ return MENU().querySelector(sel); }
  function msg(){ return ((q('[data-tools-msg]') || {}).textContent || '').trim(); }
  function nativeSet(e, v) {
    var proto = e instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
  }
  async function settle(){ await T.sleep(1100); }
  async function openShift(){ document.body.click(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(250); }
  async function far(f){ q('[data-far="' + f + '"]').click(); await T.sleep(150); }
  async function undo(){ document.body.click(); await T.sleep(150); $('undo-btn').click(); await settle(); }
  function listRows(){ return Array.prototype.map.call(MENU().querySelectorAll('[data-shift-list] .solve-row'), function (r) { return (r.innerText || r.textContent || '').replace(/\s+/g, ' ').trim(); }); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function metas(){ var o = {}; KEYS.forEach(function (k) { o[k] = txt('meta-' + k); }); return o; }
  function starts(){ var o = {}; KEYS.forEach(function (k) { o[k] = ($('start-' + k) || {}).value; }); return o; }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function rowOf(key){ var s = $('swatch-' + key); return s ? s.closest('.phase-row') : null; }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    return got.state;
  }
  function notesOf(s){ var o = {}; Object.keys(s.userNotes || {}).sort().forEach(function (k) { o[k] = s.userNotes[k].text; }); return o; }
  // What moves is said through the list now (the Shift box, list first, 9 Nov 2026): 'after' is "After <phase>",
  // that phase and every phase after it, which is also the phase that lands (the box follows the outlined row).
  async function shiftTo(move, key, iso){
    await openShift(); await far('date');
    if(move === 'after') await T.shiftSide('after', key);
    else if(move === 'before') await T.shiftSide('prior', key);
    T.set('tool-anchor-phase', key); await T.sleep(200);
    T.set('tool-anchor-date', iso); await T.sleep(400);
  }
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt('meta-production')); }, 'the restored calendar', 200, 100);
    await T.sleep(1200);
    // A loaded calendar is clean, and a clean page writes no backup: one edit that is not a schedule input.
    T.set('show-title', 'Shift Held'); await settle();
    var s0 = await snap(), m0 = metas(), st0 = starts();
    add('T0', 'the calendar as loaded: back to back, the break inside Prod Prep, wrap Thu 6/3/27',
      same(st0, {writersRoom: '2026-04-20', prePrep: '2026-09-07', prodPrep: '2026-10-19', production: '2027-01-11', post: '2027-06-07', localization: '2027-12-06'})
        && /10\/19\/26 → 1\/8\/27/.test(m0.prodPrep) && /1\/11\/27 → 6\/3\/27/.test(m0.production)
        && same(notesOf(s0), {'2026-12-21': 'XMAS-NOTE', '2027-01-11': 'PROD-WK1', '2027-02-01': 'PROD-WK4', '2027-06-07': 'POST-WK1'}),
      {starts: st0, metas: m0, notes: notesOf(s0)}, 'the fixture');

    // ---- B1: the plan rebuilt from scratch, the reference ----
    document.body.click(); await T.sleep(150); $('pop-solve-btn').click(); await T.sleep(300);
    T.set('tool-solve-phase', 'prePrep'); await T.sleep(200);
    T.solveKeepSide(1); await T.sleep(200);   // the phases after the pin alone (no After button since 10 Nov 2026)
    T.set('tool-solve-date', '2026-08-10'); await T.sleep(300);
    $('tool-solve-go').click(); await settle();
    var mB = metas(), stB = starts();
    add('B1', 'Build Around Pre Prep 8/10/26, the phases after it alone: Production 11/30/26, wrap 5/5/27, Post 5/10/27',
      stB.production === '2026-11-30' && /11\/30\/26 → 5\/5\/27/.test(mB.production) && stB.post === '2027-05-10' && stB.localization === '2027-11-08',
      {starts: stB, metas: mB}, 'Production 2026-11-30, wrap 5/5/27');
    await undo();
    var backB = same(starts(), st0);

    // ---- L1: the owner's move, set up ----
    await shiftTo('after', 'prePrep', '2026-08-10');
    var l1 = listRows();
    var prodRow = l1.filter(function (r) { return /^Production/.test(r); })[0] || '';
    add('L1', 'Phase & after Pre Prep to 8/10/26: the list shows Production landing 11/30/26, "Pulled 6 wks", and Prod Prep "Pulled 4 wks"',
      backB && /11\/30\/26/.test(prodRow) && /Pulled 6 wks/.test(prodRow) && l1.some(function (r) { return /^Prod Prep.*9\/21\/26.*Pulled 4 wks/.test(r); }),
      {rows: l1, undoBack: backB}, 'Production 11/30/26 Pulled 6 wks');

    // ---- S1-S4: Go ----
    $('tool-anchor-go').click(); await settle();
    var mS = msg(), m1 = metas(), st1 = starts(), s1 = await snap();
    add('S1', 'Go: every phase lands where Build Around put it (Writer\'s Rm stays)',
      same(m1, mB) && same(st1, stB), {metas: m1, buildAround: mB}, 'identical to B1');
    add('S2', 'both handoffs either side of the shoot stay back to back: Prod Prep ends Fri 11/27, Production starts Mon 11/30; the wrap Wed 5/5 is before Post Mon 5/10',
      /9\/21\/26 → 11\/27\/26/.test(m1.prodPrep) && /11\/30\/26 → 5\/5\/27/.test(m1.production) && /^5\/10\/27/.test(m1.post),
      m1, 'Prod Prep to 11/27/26, Production 11/30/26 to 5/5/27, Post from 5/10/27');
    var n1 = notesOf(s1);
    add('S3', 'notes ride with their phase\'s week: PROD-WK1 11/30/26, PROD-WK4 1/4/27 (the shoot\'s 4th week, after the break), POST-WK1 5/10/27; XMAS-NOTE stays under the break',
      same(n1, {'2026-11-30': 'PROD-WK1', '2026-12-21': 'XMAS-NOTE', '2027-01-04': 'PROD-WK4', '2027-05-10': 'POST-WK1'}), n1, 'those four keys');
    add('S4', 'the result line says Production stepped over the held hiatus',
      /Shifted 4 weeks earlier\./.test(mS) && /Production was pulled 6 wks to step over a held hiatus\./.test(mS) && /Pre Prep starts 8\/10\/26\./.test(mS),
      mS, '"... Production was pulled 6 wks to step over a held hiatus. ..."');

    // ---- U1 ----
    await undo();
    add('U1', 'one Undo restores the calendar', same(starts(), st0) && same(metas(), m0), {starts: starts()}, 'T0');

    // ---- A1: the toolbar arrows ----
    document.body.click(); await T.sleep(150);
    $('shift-back-btn').click(); await settle();
    var a1a = starts().production;
    $('shift-back-btn').click(); await T.sleep(400);
    var ro = txt('shift-readout');
    await settle();
    var mA = metas();
    add('A1', '← 1 wk twice: Production 1/4/27, then over the break to 12/14/26; Prod Prep ends Fri 12/11/26; the readout says "Production pulled 3 wks"',
      a1a === '2027-01-04' && starts().production === '2026-12-14' && /10\/5\/26 → 12\/11\/26/.test(mA.prodPrep) && /^1 wk earlier · Production pulled 3 wks/.test(ro),
      {first: a1a, second: starts().production, prodPrep: mA.prodPrep, readout: ro}, 'Production 2027-01-04 then 2026-12-14');
    await undo(); await undo();
    var backA = same(starts(), st0);

    // ---- H1: a date inside the held break ----
    await shiftTo('after', 'production', '2026-12-21');
    $('tool-anchor-go').click(); await settle();
    var mH = msg();
    add('H1', 'Phase & after Production, starts on 12/21/26 (inside the break): it starts 1/4/27, the week after, and the line says why',
      backA && starts().production === '2027-01-04' && /Production starts 1\/4\/27\./.test(mH) && /Your date is inside a held hiatus, so it starts the week after it\./.test(mH),
      {production: starts().production, msg: mH, undoBack: backA}, 'Production 2027-01-04');
    await undo();

    // ---- E1: an Ends phase ----
    var sel = rowOf('prodPrep').querySelector('select.phase-anchor');
    nativeSet(sel, 'ends'); sel.dispatchEvent(new Event('change', {bubbles: true})); await settle();
    var endBefore = ($('end-prodPrep') || {}).value;
    await shiftTo('after', 'prePrep', '2026-08-10');
    $('tool-anchor-go').click(); await settle();
    var endAfter = ($('end-prodPrep') || {}).value, mE = metas();
    add('E1', 'Prod Prep held by its end (1/8/27): the same move lands its end on Fri 11/27/26 and its start on 9/21/26, Production 11/30/26',
      /1\/8\/27|2027-01-08/.test(endBefore) && endAfter === '2026-11-27' && starts().prodPrep === '2026-09-21' && starts().production === '2026-11-30',
      {endBefore: endBefore, endAfter: endAfter, prodPrep: mE.prodPrep, production: starts().production}, 'end 2026-11-27, start 2026-09-21');
    await undo(); await undo();

    // ---- W1: All phases by weeks ----
    await openShift();                       // it opens with every phase ticked, By weeks
    T.set('tool-shift-weeks', '4'); $('tool-shift-earlier').click(); await settle();
    var stW = starts(), mW = msg();
    add('W1', 'All phases, 4 weeks Earlier: Writer\'s Rm 3/23/26 (4 wks), Production 11/30/26 (6 wks), Post 5/10/27',
      stW.writersRoom === '2026-03-23' && stW.prePrep === '2026-08-10' && stW.production === '2026-11-30' && stW.post === '2027-05-10'
        && /Production was pulled 6 wks to step over a held hiatus\./.test(mW),
      {starts: stW, msg: mW}, 'Production 2026-11-30');

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'shiftheld', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
