// seasonroll -- ROLLING A SEASON FORWARD A YEAR (audit AUD2-050, AUD2-051; the Nov 2026 audit's item 3.3).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=v1.13.0-saved ./run.sh seasonroll 400
//
// THE CALENDAR: tests/fixtures/v1.13.0-saved.sptcal (synthetic: "Test Show", US General, Writer's Rm 1/5/26 x 12,
// Pre Prep 4/6/26, Prod Prep 5/18/26, Production 6/29/26 (80 days), Post 11/2/26 x 16, Localization 3/1/27 x 8, the
// four locked winter breaks), plus an all-phase hiatus the user adds, 8/10/26 x 1 (its Lock in place comes ticked).
//
// AUD2-050: holidays shown in the waterfall disappeared from the new season's weeks. holidayView is per holiday, and
// showing every holiday wrote an entry for the holidays in the calendar AT THAT MOMENT; a holiday that entered later
// fell back to month-view-only. THE RULE NOW (the finding's default, "yes"): while every holiday in the calendar is
// shown in a view, a holiday that enters the calendar is shown there too. Nothing new is saved: the newcomer gets the
// same per-holiday entry a tick would write.
//   N1  the calendar as loaded (no holiday in the waterfall): rolled forward a year (Shift, To a date, Writer's Rm
//       starts 1/4/27), no holiday is written into the waterfall and holidayView stays empty (a default calendar saves
//       byte for byte as before)
//   H1  every holiday shown in the waterfall, then the same roll: Independence Day (observed 7/5/27), Labor Day 9/6/27
//       and Thanksgiving 11/25/27 show in their 2027 weeks' Notes cells (red before: none of the three)
//   H2  ... and every sheet box in the Holidays list is ticked
//   U1  one Undo puts holidayView back exactly as it was before the roll (the newcomers' entries are the move's own)
//   R1  Redo brings them back
//   H3  By weeks 52 Later (every phase) shows them too
//   H4  a LONGER plan (Localization 8 -> 30 weeks): Memorial Day 5/31/27, Independence Day and Labor Day 2027 show
//   U4  ... and one Undo puts Localization and holidayView back exactly
//   N2  with ONE holiday taken out of the waterfall first, the roll leaves the newcomers month-view-only, as before
//
// AUD2-051: the result line. Shift counts WORKING weeks and steps over held (locked) breaks: owner's ruling, 5 Nov
// 2026, kept. The finding's default: keep it, and make the line say "working weeks" and name the breaks that stayed.
//   L1  To a date: "Shifted 49 working weeks later." (red before: "Shifted 49 weeks later.")
//   L2  ... and it names the two held breaks the moved phases no longer run through: "Hiatus 8/10/26 and Hiatus
//       12/21/26 stayed on their dates, so no phase pauses for them now."
//   L3  By weeks 52: "Shifted 52 working weeks later." and the same two breaks named
//   L4  a move that crosses no held break says "weeks", as before (By weeks 2, every phase, on the calendar as loaded)
//   L5  no new hiatus default: the hiatus added from the sidebar still starts locked
//   E0  no console errors, no native alert
window.__T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: pass === true ? undefined : expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function msg(){ return txt(q('#pop-shift [data-tools-msg]')); }
  function noteText(week){
    var td = q('#table-wrap td.sheet-note-cell[data-week="' + week + '"]');
    return td && td.classList.contains('has-note') ? txt(td) : '';
  }
  var HOL27 = [['2027-07-05', 'Independence Day'], ['2027-09-06', 'Labor Day'], ['2027-11-22', 'Thanksgiving']];
  function missing(list){ return list.filter(function (h) { return noteText(h[0]).indexOf(h[1]) === -1; }); }
  function present(list){ return list.filter(function (h) { return noteText(h[0]).indexOf(h[1]) !== -1; }); }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){
    var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(500);
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    return got.state;
  }
  function sheetIds(hv){ return Object.keys(hv || {}).filter(function (k) { return hv[k] && hv[k].sheet === true; }).sort(); }
  async function openShift(){ T.closePops(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(300); }
  async function far(f){ q('#pop-shift [data-far="' + f + '"]').click(); await T.sleep(150); }
  async function rollToDate(){
    await openShift(); await far('date');
    T.set('tool-anchor-phase', 'writersRoom'); T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    T.set('tool-anchor-date', '2027-01-04'); await T.sleep(200);
    $('tool-anchor-go').click(); await settled();
    return msg();
  }
  async function shiftWeeks(n, dir){
    await openShift(); await far('weeks');
    T.set('tool-shift-weeks', String(n)); $(dir < 0 ? 'tool-shift-earlier' : 'tool-shift-later').click(); await settled();
    return msg();
  }
  async function undo(){ T.closePops(); await T.sleep(150); $('undo-btn').click(); await settled(); }
  async function redo(){ T.closePops(); await T.sleep(150); $('redo-btn').click(); await settled(); }
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt($('meta-production'))) && $('start-localization').value === '2027-03-01'; }, 'the restored calendar', 200, 100);
    await settled();
    var loaded = sig();

    // ---- L4 / N1: the calendar as loaded (no holiday in the waterfall) ----
    var m4 = await shiftWeeks(2, 1);
    add('L4', 'By weeks 2, every phase, crossing no held break: "Shifted 2 weeks later." as before', /^Shifted 2 weeks later\./.test(m4) && !/working/.test(m4), m4, '"Shifted 2 weeks later. …"');
    await undo();
    var mN1 = await rollToDate();
    var sN1 = await snap();
    add('N1', 'no holiday in the waterfall: the roll writes none (holidayView stays empty, no 2027 holiday in a Notes cell)',
      JSON.stringify(sN1.holidayView || {}) === '{}' && present(HOL27).length === 0,
      {holidayView: sN1.holidayView, shown: present(HOL27), msg: mN1}, '{} and none shown');
    await undo();
    add('N1u', 'Undo returns to the calendar as loaded', sig() === loaded, 'differs', 'the loaded grid');

    // ---- the user's season: a summer break, every holiday in the waterfall ----
    T.addHiatus('2026-08-10', 1);
    await settled();
    var rows = qa('#hiatus-list .hiatus-entry'), last = rows[rows.length - 1];
    var lk = last && last.querySelector('.hiatus-locked');
    add('L5', 'the hiatus added from the sidebar starts locked, as before (no change to how a new hiatus starts)', !!(lk && lk.checked), lk ? lk.checked : 'no box', true);
    await T.showHolidaysInSheet();
    await settled();
    var s0 = await snap();
    var before = sig();
    var hv0 = JSON.stringify(s0.holidayView);

    // ---- H1 / L1 / L2: To a date ----
    var m1 = await rollToDate();
    var s1 = await snap();
    var miss1 = missing(HOL27);
    add('H1', 'every holiday shown, rolled forward a year: Independence Day (7/5/27), Labor Day (9/6/27) and Thanksgiving (11/25/27) show in their weeks', miss1.length === 0,
      {missing: miss1, newSheet: sheetIds(s1.holidayView).filter(function (k) { return sheetIds(s0.holidayView).indexOf(k) < 0; })}, 'none missing');
    var boxes = qa('#holiday-vis-list input.hv-cb[data-view="sheet"]');
    var unticked = boxes.filter(function (b) { return !b.checked; }).map(function (b) { return b.dataset.hid; });
    add('H2', 'every sheet box in the Holidays list is ticked after the roll', boxes.length > 0 && unticked.length === 0, {boxes: boxes.length, unticked: unticked}, 'all ticked');
    add('L1', 'the headline counts WORKING weeks: "Shifted 49 working weeks later."', /^Shifted 49 working weeks later\./.test(m1), m1, '"Shifted 49 working weeks later. …"');
    add('L2', 'it names the held breaks the moved phases no longer run through',
      /Hiatus 8\/10\/26 and Hiatus 12\/21\/26 stayed on their dates, so no phase pauses for them now\./.test(m1) && /5 locked hiatuses held\./.test(m1),
      m1, '"… 5 locked hiatuses held. Hiatus 8/10/26 and Hiatus 12/21/26 stayed on their dates, so no phase pauses for them now. …"');
    await undo();
    var u1 = await snap();
    add('U1', 'one Undo: holidayView exactly as before the roll, and the grid as before', JSON.stringify(u1.holidayView) === hv0 && sig() === before,
      {same: JSON.stringify(u1.holidayView) === hv0, grid: sig() === before}, 'both');
    await redo();
    var r1 = await snap();
    add('R1', 'Redo: the newcomers shown again', missing(HOL27).length === 0 && JSON.stringify(r1.holidayView) === JSON.stringify(s1.holidayView),
      {missing: missing(HOL27)}, 'none missing');
    await undo();

    // ---- H3 / L3: By weeks 52 ----
    var m3 = await shiftWeeks(52, 1);
    var hol3 = [['2027-09-06', 'Labor Day'], ['2027-11-22', 'Thanksgiving']];
    add('H3', 'By weeks 52 Later: the 2027 holidays in the moved weeks show too', missing(hol3).length === 0, {missing: missing(hol3)}, 'none missing');
    add('L3', 'By weeks 52: "Shifted 52 working weeks later." and the same two breaks named',
      /^Shifted 52 working weeks later\./.test(m3) && /Hiatus 8\/10\/26 and Hiatus 12\/21\/26 stayed on their dates/.test(m3), m3,
      '"Shifted 52 working weeks later. … Hiatus 8/10/26 and Hiatus 12/21/26 stayed on their dates …"');
    await undo();
    add('U3', 'back to the season before the roll', sig() === before, 'differs', 'same grid');

    // ---- H4: a longer plan ----
    T.set('weeks-localization', '30'); await settled();
    var hol4 = [['2027-05-31', 'Memorial Day'], ['2027-07-05', 'Independence Day'], ['2027-09-06', 'Labor Day']];
    add('H4', 'a longer plan (Localization 8 -> 30 weeks): Memorial Day, Independence Day and Labor Day 2027 show', missing(hol4).length === 0, {missing: missing(hol4)}, 'none missing');
    await T.sleep(1500);   // the edit banks its own undo step (the typing debounce)
    await undo();
    var u4 = await snap();
    add('U4', 'Undo of the longer plan: Localization 8 weeks and holidayView exactly as before it', $('weeks-localization').value === '8' && JSON.stringify(u4.holidayView) === hv0,
      {weeks: $('weeks-localization').value, same: JSON.stringify(u4.holidayView) === hv0}, 'both');

    // ---- N2: one holiday taken out of the waterfall ----
    var lab = qa('#holiday-vis-list input.hv-cb[data-view="sheet"]').filter(function (b) { return /labor-day@2026/.test(b.dataset.hid); })[0];
    if(lab){ lab.click(); await settled(); }
    var sN2a = await snap();
    await rollToDate();
    var sN2 = await snap();
    var added = sheetIds(sN2.holidayView).filter(function (k) { return sheetIds(sN2a.holidayView).indexOf(k) < 0; });
    add('N2', 'one holiday out of the waterfall: the roll leaves the newcomers month-view-only (no entry written, none shown)',
      !!lab && added.length === 0 && present(HOL27).length === 0, {labor: !!lab, added: added, shown: present(HOL27)}, 'none');

    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
      {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 800), 'no exception');
  }
  T.done({cases: cases});
})(); });
