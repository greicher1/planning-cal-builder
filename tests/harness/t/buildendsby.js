// buildendsby -- Build Around, Production "ends by" a date, with Snap to Mon on (audit AUD2-010, the Nov 2026 audit's
// item 2.2, 13 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh buildendsby 900
//
// Before: pinStartEndingBy('production') searched start DAYS (solveProductionEndsStart) while the trials ran with
// Production's Snap to Mon on, so every trial start collapsed to its Monday. Near the Christmas break the search
// stalled two weeks short: "ends by Fri 12/18/26" started the shoot 8/10/26 and wrapped it 12/2/26, when 8/24/26
// wraps 12/16/26 (Shift's own "ends by" gives that). Now a snapped Production is searched by whole Mondays, walking
// back from the date (productionStartEndingBy's way), and a snap-off one by days, as before.
//
// On T.buildFixture() (synthetic: US-General, 10 eps x 8 days, Production 6/29/26, the default locked winter break
// 12/21/26). Expected starts worked by hand (the audit's sim.py) and confirmed by typing every Monday by hand (VR09):
//   B0-B8  snap on: each target gives the LATEST MONDAY whose last shoot day is on or before it; 12/18/26 and 12/17/27
//          (just before the break) were two weeks early; the others guard the targets that were already right
//   U0-U8  each build is one undo step
//   S0-S1  snap off: 12/18/26 and 12/17/27 still land to the day (the day search, unchanged)
//   E0     no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases, runs: []};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){ var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(700); }
  function wrapIso(){ var m = txt($('meta-production')).match(/(\d+)\/(\d+)\/(\d+)\s*$/); if(!m) return null;
    return '20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); }
  async function endsBy(target){
    T.closePops(); await T.sleep(150); $('pop-solve-btn').click();
    await T.until(function () { return T.solveRow('production').getBoundingClientRect().height > 0; }, 'the box', 60, 100);
    await T.sleep(300);
    await T.solvePress('production', 'row');
    T.set('tool-solve-edge', 'end'); await T.sleep(150); T.set('tool-solve-date', target); await T.sleep(400);
    $('tool-solve-go').click(); await settled();
    var r = {target: target, start: $('start-production').value, wrap: wrapIso(), prodPrep: $('start-prodPrep').value, post: $('start-post').value,
             snap: ($('snap-production') || {}).checked, msg: txt(document.querySelector('#pop-solve [data-tools-msg]'))};
    out.runs.push(r);
    return r;
  }
  async function undo(){ T.closePops(); await T.sleep(150); $('undo-btn').click(); await settled(); }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="localization"]').length > 0; }, 'the calendar', 200, 100);
    await settled();
    out.snapStart = ($('snap-production') || {}).checked;
    var base = sig();
    // [target, latest Monday start, its wrap, latest any-day start, its wrap]
    var EXP = [['2026-12-18', '2026-08-24', '2026-12-16', '2026-08-26', '2026-12-18'],
               ['2027-12-17', '2027-08-23', '2027-12-15', '2027-08-25', '2027-12-17'],
               ['2026-11-13', '2026-07-20', '2026-11-09', '2026-07-24', '2026-11-13'],
               ['2026-11-20', '2026-07-27', '2026-11-16', '2026-07-31', '2026-11-20'],
               ['2026-11-25', '2026-08-03', '2026-11-23', '2026-08-05', '2026-11-25'],
               ['2026-12-04', '2026-08-10', '2026-12-02', '2026-08-12', '2026-12-04'],
               ['2027-01-15', '2026-09-07', '2027-01-13', '2026-09-10', '2027-01-15'],
               ['2027-11-24', '2027-08-02', '2027-11-22', '2027-08-04', '2027-11-24'],
               ['2027-12-10', '2027-08-16', '2027-12-08', '2027-08-18', '2027-12-10']];
    for(var i = 0; i < EXP.length; i++){
      var e = EXP[i];
      var r = await endsBy(e[0]);
      add('B' + i, 'snap on, ends by ' + e[0] + ': the latest Monday whose wrap is on or before it (' + e[1] + ', wrap ' + e[2] + ')',
        out.snapStart === true && r.snap === true && r.start === e[1] && r.wrap === e[2], r, 'start ' + e[1] + ', wrap ' + e[2]);
      await undo();
      add('U' + i, 'undo after ends by ' + e[0] + ' restores the calendar', sig() === base, $('start-production').value, '2026-06-29');
    }
    // Snap off: the day search, to the day, as before.
    var sn = $('snap-production'); if(sn && sn.checked){ sn.click(); await settled(); }
    for(var j = 0; j < 2; j++){
      var f = EXP[j];
      var rs = await endsBy(f[0]);
      add('S' + j, 'snap off, ends by ' + f[0] + ': to the day (' + f[3] + ', wrap ' + f[4] + ')',
        rs.snap === false && rs.start === f[3] && rs.wrap === f[4], rs, 'start ' + f[3] + ', wrap ' + f[4]);
      await undo();
    }
    add('E0', 'no console errors', T.appHealth().errors.length === 0, {errors: T.appHealth().errors, modal: T.modalText()}, 'none');
  } catch (err) { add('EX', 'the leg threw', false, String(err && err.stack || err).slice(0, 800), 'no exception'); }
  T.done(out);
})(); });
