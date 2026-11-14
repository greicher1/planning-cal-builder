// shiftbandline -- the Shift result line after a part move that carried an unlocked all-phase hiatus (audit AUD2-069,
// the Nov 2026 audit's item 3.2, 14 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh shiftbandline 400
//
// A part move (some phases ticked) carries every UNLOCKED all-phase hiatus inside a ticked phase's weeks (rule T2, owner's
// picker 5 Nov 2026: kept as ruled). Such a hiatus also pauses the unticked phases that run through it, so moving it
// changes their dates: one stops pausing and ends early, another starts pausing and is pushed. The line said they all
// "stayed where they were". Now it says the hiatus moved and names each unticked phase whose dates changed, with the
// owner's words for a moved date ("pulled 2 wks", never + or -); the "stayed" list keeps only the ones that did not.
//
// On T.buildFixture() (synthetic) plus two custom phases, both left unticked:
//   Music   10/5/26, 12 wks: runs through the winter break 12/21/26, so it is paused by it (ends Fri 1/8/27)
//   Titles  1/4/27, 4 wks: starts the Monday after that break
// The 12/21/26 break (2 wks) is UNLOCKED. Ticked: Post alone (11/2/26, whose run holds the break). By weeks 2, Later.
//   S1     the scenario: the break moves to 1/4/27 (T2), Music works through 12/21 and ends a fortnight early, Titles is
//          paused 1/4-1/15 and runs a fortnight later; every other unticked phase is untouched
//   L1     the line says the hiatus moved with Post, last, after the "stayed" sentence (so a line with nothing carried
//          reads as before)
//   L2     it names Music: "… so Music now ends 12/25/26 (pulled 2 wks) …"
//   L3     it names Titles: "… and Titles now runs 1/18/27 to 2/12/27 (pushed 2 wks)."
//   L4     the "stayed" list keeps only the phases that did not change (no Music, no Titles)
//   U1     Undo brings the calendar back
//   N1     a part move that carries no hiatus keeps its line word for word ("1 ticked phase moved. … stayed where they were.")
//   P1     Prior to / After: "After Post" carries the same break; the line names Music and says the hiatus moved
//   E0     no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases, steps: []};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ var e = $(id); return e ? e.value : null; }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){ var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(500); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1', 'custom2'];
  // Each phase's first and last WORKING week in the waterfall (its cells, the hiatus bands left out), and the bands.
  function runs(){
    var o = {};
    KEYS.forEach(function (k) {
      var c = qa('#table-wrap td.sheet-phase-cell[data-pkey="' + k + '"]:not(.sheet-hiatus-cell)').map(function (td) { return td.getAttribute('data-week'); }).sort();
      o[k] = c.length ? c[0] + '..' + c[c.length - 1] + ' (' + c.length + ')' : '';
    });
    o.bands = qa('#hiatus-list .hiatus-entry').map(function (r) { var l = r.querySelector('.hiatus-locked');
      return r.querySelector('.hiatus-start').value + '/' + r.querySelector('.hiatus-weeks').value + (l && l.checked ? 'L' : 'U'); }).join(' ');
    return o;
  }
  async function openShift(){ T.closePops(); await T.sleep(150); $('pop-shift-btn').click();
    await T.until(function () { return T.shiftRow('production').getBoundingClientRect().height > 0; }, 'Shift', 60, 100); await T.sleep(200); }
  async function onlyTick(key){ var all = q('#pop-shift [data-shift-all]'); if(all.checked){ all.click(); await T.sleep(200); } await T.shiftPress(key, 'box'); await T.sleep(150); }
  async function later(n){ T.set('tool-shift-weeks', String(n)); $('tool-shift-later').click(); await settled(); return txt(q('#pop-shift [data-tools-msg]')); }
  async function undo(){ T.closePops(); await T.sleep(150); $('undo-btn').click(); await settled(); }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="localization"]').length > 0; }, 'the calendar', 200, 100);
    await settled();
    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom1'); }, 'custom1', 60, 100);
    T.set('name-custom1', 'Music'); T.set('start-custom1', '2026-10-05'); T.set('weeks-custom1', '12'); await settled();
    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom2'); }, 'custom2', 60, 100);
    T.set('name-custom2', 'Titles'); T.set('start-custom2', '2027-01-04'); T.set('weeks-custom2', '4'); await settled();
    // Unlock the 12/21/26 break (every break starts locked).
    var row = qa('#hiatus-list .hiatus-entry').filter(function (r) { return r.querySelector('.hiatus-start').value === '2026-12-21'; })[0];
    var lock = row && row.querySelector('.hiatus-locked');
    if(lock && lock.checked){ lock.click(); await settled(); }
    var base = sig(), r0 = runs(); out.r0 = r0;

    await openShift(); await onlyTick('post');
    out.count = txt(q('#pop-shift [data-shift-count]'));
    var m1 = await later(2), r1 = runs(); out.r1 = r1; out.m1 = m1;
    add('S1', 'the scenario: the break moves to 1/4/27 (T2, kept), Music ends a fortnight early, Titles runs a fortnight later, the rest stay',
      out.count === '1 of 8 move' && /2027-01-04\/2U/.test(r1.bands) && /2026-12-21\/2U/.test(r0.bands)
        && r0.custom1 === '2026-10-05..2027-01-04 (12)' && r1.custom1 === '2026-10-05..2026-12-21 (12)'
        && r0.custom2 === '2027-01-04..2027-01-25 (4)' && r1.custom2 === '2027-01-18..2027-02-08 (4)'
        && ['writersRoom', 'prePrep', 'prodPrep', 'production', 'localization'].every(function (k) { return r0[k] === r1[k]; }),
      {count: out.count, before: r0, after: r1}, 'bands 12/21 -> 1/4; custom1 ends 12/21 wk; custom2 from 1/18 wk');
    add('L1', 'the line says the hiatus moved with Post', /stayed where they were\. 1 hiatus moved with it, so /.test(m1), m1, '"… stayed where they were. 1 hiatus moved with it, so …"');
    add('L2', 'it names Music: "Music now ends 12/25/26 (pulled 2 wks)"', /Music now ends 12\/25\/26 \(pulled 2 wks\)/.test(m1), m1, 'Music now ends 12/25/26 (pulled 2 wks)');
    add('L3', 'it names Titles: "Titles now runs 1/18/27 to 2/12/27 (pushed 2 wks)"', /Titles now runs 1\/18\/27 to 2\/12\/27 \(pushed 2 wks\)/.test(m1), m1, 'Titles now runs 1/18/27 to 2/12/27 (pushed 2 wks)');
    var stay = (m1.match(/([^.]*) stayed where they were\./) || [])[1] || '';
    add('L4', 'the "stayed" list keeps only the phases that did not change',
      /^Shifted 2 weeks later\./.test(m1) && /1 ticked phase moved\./.test(m1) && /Writer's Rm, Pre Prep, Prod Prep, Production and Localization$/.test(stay.trim()),
      {line: m1, stayed: stay}, '"Writer\'s Rm, Pre Prep, Prod Prep, Production and Localization stayed where they were."');
    await undo();
    add('U1', 'Undo brings the calendar back', sig() === base, runs(), 'the grid before the move');

    // A part move that carries no hiatus: the line as it always was.
    await openShift(); await onlyTick('production');
    var m2 = await later(1); out.m2 = m2;
    add('N1', 'a part move that carries no hiatus keeps its line word for word',
      /^Shifted 1 week later\./.test(m2) && /1 ticked phase moved\. Writer's Rm, Pre Prep, Prod Prep, Music, Post, Titles and Localization stayed where they were\./.test(m2)
        && !/hiatus moved/.test(m2) && !/ now /.test(m2), m2, '"Shifted 1 week later. 1 ticked phase moved. Writer\'s Rm, … stayed where they were."');
    await undo();

    // After Post: the bottom of the list from Post carries the same break.
    await openShift(); await T.shiftSide('after', 'post');
    var m3 = await later(2), r3 = runs(); out.m3 = m3; out.r3 = r3;
    add('P1', '"After Post" carries the break too: the line says so and names Music (Titles moved with the ticks)',
      /Post and everything after it moved \(3 phases\)\. 4 stayed where they were\. 1 hiatus moved with them, so Music now ends 12\/25\/26 \(pulled 2 wks\)\.$/.test(m3),
      {line: m3, runs: r3}, '"Post and everything after it moved (3 phases). 4 stayed where they were. 1 hiatus moved with them, so Music now ends 12/25/26 (pulled 2 wks)."');
    await undo();
    T.closePops();
    add('E0', 'no console errors', T.appHealth().errors.length === 0, {errors: T.appHealth().errors, modal: T.modalText()}, 'none');
  } catch (err) { add('EX', 'the leg threw', false, String(err && err.stack || err).slice(0, 800), 'no exception'); }
  T.done(out);
})(); });
