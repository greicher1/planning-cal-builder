// buildaroundfresh -- Build Around's FIRST run on a brand-new calendar must see the all-phase hiatuses (owner's report,
// 11 Nov 2026: "its putting pre-prep 2 weeks into writers room. but it seems to only do this the first time you use
// build around in a new file").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh buildaroundfresh 120
//
// The cause: hiatusRangesForSolve() read the all-phase hiatuses off currentSchedule.hiatuses, and computeSchedule
// returns no `hiatuses` at all while no phase has a date. So on a new calendar the backward pass counted 20 plain
// calendar weeks back from Pre Prep, the default winter break (Mon 12/21/26 x 2) then paused the room, and it ran two
// weeks into Pre Prep. A second Build, on a calendar that now had a schedule, came out right. It reads the rows now.
//
// A new calendar (no HARNESS_STATE): every phase blank, the four default winter breaks. Writer's Rm 20 wks and
// Pre Prep 6 wks are typed, nothing is dated, Pre Prep is pinned to start Mon 4/26/27 and Build is pressed.
//   20 working weeks ending the Monday 4/26/27, skipping 12/21/26 and 12/28/26 = Mon 11/23/26 -> Fri 4/23/27.
//   The old build gave Mon 12/7/26 -> Fri 5/7/27.
//
//   T0   truth guard: a new calendar -- nothing dated, the default hiatuses present
//   F1   the list's preview already says 11/23/26 before Build (the trial runs the same solver)
//   F2   the first Build places Writer's Rm 11/23/26 -> 4/23/27, ending the Friday before Pre Prep starts
//   F3   reopened, Writer's Rm is ticked (it does not run alongside Pre Prep), and building again changes nothing
//   E0   0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(id){ return (($(id) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function starts(){ var o = {}; KEYS.forEach(function (k) { o[k] = ($('start-' + k) || {}).value; }); return o; }
  function wrRow(){ return $('pop-solve').querySelector('[data-solve-list] .solve-row[data-key="writersRoom"]'); }
  function wrBox(){ var r = wrRow(); return r ? r.querySelector('input[type=checkbox]') : null; }
  function wrDate(){ var r = wrRow(), d = r && r.querySelector('.solve-dt'); return d ? (d.textContent || '').trim() : ''; }
  async function openPinned(){
    $('pop-solve-btn').click(); await T.sleep(700);
    T.set('tool-solve-phase', 'prePrep'); await T.sleep(500);
    T.set('tool-solve-date', '2027-04-26'); await T.sleep(500);
  }
  async function press(){ $('tool-solve-go').click(); await T.sleep(1200); document.body.click(); await T.sleep(300); }
  try {
    await T.appReady(); await T.sleep(1000);
    var s0 = starts();
    var hi = Array.prototype.map.call(document.querySelectorAll('.hiatus-entry'), function (e) {
      return e.querySelector('.hiatus-start').value + ' x' + e.querySelector('.hiatus-weeks').value;
    });
    add('T0', 'a new calendar: no phase dated, the default winter breaks present (12/21/26 x 2 first)',
      KEYS.every(function (k) { return !s0[k]; }) && hi[0] === '2026-12-21 x2', {starts: s0, hiatuses: hi}, 'all blank; 2026-12-21 x2');

    T.set('weeks-writersRoom', '20'); T.set('weeks-prePrep', '6'); await T.sleep(800);

    await openPinned();
    var f1 = {ticked: wrBox() && wrBox().checked, preview: wrDate(), go: $('tool-solve-go').textContent};
    add('F1', 'before Build, the list previews Writer\'s Rm at 11/23/26 (the winter break counted)',
      f1.ticked === true && f1.preview === '11/23/26' && f1.go === 'Build 1 phase', f1, 'ticked, 11/23/26, "Build 1 phase"');

    await press();
    var f2 = {starts: starts(), wr: txt('meta-writersRoom'), pp: txt('meta-prePrep')};
    add('F2', 'the FIRST Build places Writer\'s Rm 11/23/26 -> 4/23/27, the Friday before Pre Prep\'s 4/26/27 (was 12/7/26 -> 5/7/27, two weeks into Pre Prep)',
      f2.starts.writersRoom === '2026-11-23' && f2.starts.prePrep === '2027-04-26' && /11\/23\/26/.test(f2.wr) && /4\/23\/27/.test(f2.wr),
      f2, 'start-writersRoom 2026-11-23; meta 11/23/26 -> 4/23/27');

    await openPinned();
    var f3 = {ticked: wrBox() && wrBox().checked, preview: wrDate(), ch: ((wrRow() && wrRow().querySelector('.solve-ch')) || {}).textContent};
    await press();
    f3.after = starts().writersRoom;
    add('F3', 'reopened, Writer\'s Rm is ticked (it ends before Pre Prep, so it is not alongside it) and a second Build moves nothing',
      f3.ticked === true && f3.preview === '11/23/26' && f3.ch === 'No change' && f3.after === '2026-11-23', f3, 'ticked, 11/23/26, "No change", still 2026-11-23');

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'buildaroundfresh', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
