// snaptools -- the shift / anchor / rebuild tools respect "Snap to Mon" being OFF, and their edges
// (FIX-PLAN.md 2.3; AUDIT-REPORT M-11, L-13, L-14, L-15, and L-24 from batch 1's list).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides ./run.sh snaptools 150
//
// tests/fixtures/dayoverrides.sptcal has Pre Prep with Snap to Mon OFF on Wed 4/8/26 (6 wk, so it
// ends -- exclusive -- on Wed 5/20), Prod Prep snapped on 5/18 (6 wk), Production 6/29, Post 11/2, and
// a locked one-week Summer Break from 7/13.
//
//   M-11  Rebuild From on a snap-off phase moved it back to Monday; its prefill showed the Monday.
//   L-24  "Start after previous phase" off a snap-off phase started the next phase on the day the
//         previous one ends -- a Wednesday -- so a SNAPPED next phase landed on that week's Monday and
//         overlapped it by two days. Rule (FIX-PLAN §0): start the day after the previous phase ends;
//         if the chained phase is snapped, the next Monday instead. Never overlap.
//   L-13  Anchor To "ends by" treated a phase as ending on Sunday, so a Friday deadline cost a week.
//   L-15  Rebuild From said "Nothing to place" after it had already moved the pinned phase.
//   L-14  A shift that lands an undated note on an all-phase hiatus week hides it; the result line
//         now says so.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function val(id){ return (document.getElementById(id) || {}).value; }
  function msg(pop){ return ((document.querySelector('#' + pop + ' [data-tools-msg]') || {}).textContent || '').trim(); }
  function closePops(){ document.body.click(); }
  async function openPop(btn){ closePops(); await T.sleep(150); document.getElementById(btn).click(); await T.sleep(250); }
  async function settle(){ await T.sleep(700); }
  async function undo(n){ for(var i = 0; i < (n || 1); i++){ document.getElementById('undo-btn').click(); await T.sleep(900); } }
  function starts(){ return {prePrep: val('start-prePrep'), prodPrep: val('start-prodPrep'), production: val('start-production'), post: val('start-post')}; }
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(((document.getElementById('meta-production') || {}).textContent || '')); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    var s0 = starts();
    add('S0', 'restored: Pre Prep snap-off on Wed 4/8', s0.prePrep === '2026-04-08' && document.getElementById('snap-prePrep').checked === false, s0, 'Pre Prep 2026-04-08, snap off');

    // M-11 -- Rebuild From: pick Pre Prep; the prefill shows its REAL start, and working forward
    // from it keeps that Wednesday.
    await openPop('pop-solve-btn');
    T.set('tool-solve-phase', 'prePrep');
    await T.sleep(150);
    var pre = val('tool-solve-date');
    add('M1', 'Rebuild From prefill shows a snap-off phase\'s real start (Wed 4/8, not Mon 4/6)', pre === '2026-04-08', {prefill: pre}, '2026-04-08');
    document.getElementById('tool-solve-fwd').click();
    await settle();
    var s1 = starts();
    add('M2', 'Rebuild forward from snap-off Pre Prep keeps its Wednesday start', s1.prePrep === '2026-04-08' && document.getElementById('snap-prePrep').checked === false,
      {s: s1, msg: msg('pop-solve')}, 'Pre Prep still 2026-04-08');
    // Pre Prep ends Wed 5/20; Prod Prep is snapped, so it chains to the next Monday (L-24's rule, now
    // shared by the rebuild): 5/25 -- not 5/20, which would snap back to 5/18 and overlap two days.
    add('M3', 'the snapped phase after it starts the NEXT Monday (5/25), never overlapping Pre Prep', s1.prodPrep === '2026-05-25', {prodPrep: s1.prodPrep}, '2026-05-25');
    await undo(1);
    add('M4', 'one undo restores the rebuild', JSON.stringify(starts()) === JSON.stringify(s0), starts(), s0);

    // M-11 backwards -- pin snap-off Pre Prep a week later (Wed 4/15) and rebuild what comes before it.
    await openPop('pop-solve-btn');
    T.set('tool-solve-phase', 'prePrep');
    await T.sleep(150);
    T.set('tool-solve-date', '2026-04-15');
    document.getElementById('tool-solve-back').click();
    await settle();
    var s2 = starts(), wr2 = val('start-writersRoom');
    add('M5', 'Rebuild backwards pinning snap-off Pre Prep on Wed 4/15 keeps the Wednesday', s2.prePrep === '2026-04-15', {prePrep: s2.prePrep, writersRoom: wr2, msg: msg('pop-solve')}, '2026-04-15');
    add('M6', 'the Writers\' Room before it ends by that week\'s Monday (12 wk -> starts 1/19)', wr2 === '2026-01-19', {writersRoom: wr2}, '2026-01-19');
    await undo(1);

    // L-24 -- "Start after previous phase" on Prod Prep (snapped) after snap-off Pre Prep.
    closePops(); await T.sleep(150);
    document.getElementById('autostart-prodPrep').click();
    await settle();
    add('L24a', '"Start after previous" on a SNAPPED phase after a snap-off one: the next Monday (5/25)', val('start-prodPrep') === '2026-05-25', {prodPrep: val('start-prodPrep')}, '2026-05-25');
    await undo(1);
    // ...and with Prod Prep's own snap off, exactly the day after Pre Prep ends.
    var snapPP = document.getElementById('snap-prodPrep');
    snapPP.click(); await settle();
    document.getElementById('autostart-prodPrep').click();
    await settle();
    add('L24b', '"Start after previous" on a SNAP-OFF phase: the day after the previous phase ends (Wed 5/20)', val('start-prodPrep') === '2026-05-20', {prodPrep: val('start-prodPrep')}, '2026-05-20');
    await undo(2);
    add('L24u', 'undo restores Prod Prep and its snap', val('start-prodPrep') === '2026-05-18' && document.getElementById('snap-prodPrep').checked === true,
      {prodPrep: val('start-prodPrep'), snap: document.getElementById('snap-prodPrep').checked}, '2026-05-18, snapped');

    // L-13 -- Anchor To, Prod Prep "ends by": it works through Fri 6/26 (it ends -- exclusive -- Mon
    // 6/29). The prefill shows the Friday, and a Friday 6/26 deadline is already met.
    await openPop('pop-anchor-btn');
    T.set('tool-anchor-phase', 'prodPrep');
    T.set('tool-anchor-edge', 'end');
    await T.sleep(150);
    var endPre = val('tool-anchor-date');
    add('L13a', '"ends by" prefill is the phase\'s last WORKDAY (Fri 6/26), not Sunday', endPre === '2026-06-26', {prefill: endPre}, '2026-06-26');
    T.set('tool-anchor-date', '2026-06-26');
    document.getElementById('tool-anchor-go').click();
    await settle();
    add('L13b', 'a Friday deadline the phase already meets costs no week', val('start-prodPrep') === '2026-05-18', {prodPrep: val('start-prodPrep'), msg: msg('pop-anchor')}, 'unchanged 2026-05-18');
    closePops(); await T.sleep(150);
    if(val('start-prodPrep') !== '2026-05-18') await undo(1);

    // L-15 -- Rebuild From Post, forwards: nothing after Post has a week count. Type a new date: the
    // tool must refuse BEFORE writing it.
    await openPop('pop-solve-btn');
    T.set('tool-solve-phase', 'post');
    await T.sleep(150);
    T.set('tool-solve-date', '2026-11-16');
    document.getElementById('tool-solve-fwd').click();
    await settle();
    add('L15', 'Rebuild with nothing to place says so and moves nothing', val('start-post') === '2026-11-02' && /nothing to place/i.test(msg('pop-solve')),
      {post: val('start-post'), msg: msg('pop-solve')}, 'Post still 2026-11-02, "Nothing to place"');

    // L-14 -- a note on the week of 7/6, Shift All +1 wk: it lands on the Summer Break week.
    closePops(); await T.sleep(150);
    if(!document.querySelector('#table-wrap td.sheet-note-cell')){ document.getElementById('view-sheet-btn').click(); await settle(); }
    await T.typeUserNote('2026-07-06', 'Stunt rehearsal');
    await openPop('pop-shift-btn');
    T.set('tool-shift-weeks', '1');
    document.getElementById('tool-shift-later').click();
    await settle();
    add('L14', 'a shift that lands a note on an all-phase hiatus week says so', /hiatus/i.test(msg('pop-shift')) && /note/i.test(msg('pop-shift')),
      {msg: msg('pop-shift')}, '... note ... hiatus ...');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'snaptools', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
