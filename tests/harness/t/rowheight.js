// rowheight -- a hand-dragged row height travels with its note when the calendar shifts
// (FIX-PLAN.md 2.4; AUDIT-REPORT M-12).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=shift-stores ./run.sh rowheight 90
//
// tests/fixtures/shift-stores.sptcal is v1.3.0-saved.sptcal with two notes and two dragged rows:
//   - week of 8/3/26: an UNDATED three-clause note in a 60px row -- it must move with a shift;
//   - week of 9/7/26: a note PINNED to 9/10/26 in a 45px row -- a dated note stays put on a shift
//     (PROJECT-CONTEXT §7a), so its row must stay too.
// Before the fix shiftCalendar re-keyed userNotes / noteColors / noteFontSize but not
// rowHeightsByWeek, so the note moved to a 20px row and was cut off in the grid, Excel and the PDF,
// while an empty 60px row sat on the old week.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  // The 2026 block is the FIRST block, so a row's first cell is its 2026 date.
  function rowH(dateText){
    var trs = document.querySelectorAll('#table-wrap table.sheet-table tbody tr');
    for(var i = 0; i < trs.length; i++){
      var td = trs[i].querySelector('td');
      if(td && td.textContent.trim() === dateText) return Math.round(trs[i].getBoundingClientRect().height);
    }
    return null;
  }
  function noteAt(weekIso){
    var td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="' + weekIso + '"]');
    return td ? (td.textContent || '').replace(/\s+/g, ' ').trim() : null;
  }
  function state(){
    return {h0803: rowH('8/3/26'), h0810: rowH('8/10/26'), h0907: rowH('9/7/26'), h0914: rowH('9/14/26'),
            n0803: noteAt('2026-08-03'), n0810: noteAt('2026-08-10'), n0907: noteAt('2026-09-07')};
  }
  var NOTE = /^Table read Thursday/, WRAP = /Wrap party booked/;
  async function settle(){
    var l = -1, st = 0;
    await T.until(function () {
      var n = document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length;
      st = (n === l && n > 10) ? st + 1 : 0; l = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
  }
  try {
    await T.appReady();
    await settle();
    await T.sleep(1200);

    var r0 = state();
    add('R0', 'restored: the undated note sits in its 60px row, the pinned note in its 45px row',
      r0.h0803 === 60 && NOTE.test(r0.n0803 || '') && r0.h0907 === 45 && WRAP.test(r0.n0907 || '')
        && r0.h0810 <= 22 && r0.h0914 <= 22,
      r0, '8/3 60px + note, 9/7 45px + pinned note, neighbours at the default');

    // R1: Shift All, one week later -- the toolbar arrow, one click.
    document.getElementById('shift-fwd-btn').click();
    await T.sleep(600); await settle(); await T.sleep(400);
    var r1 = state();
    add('R1', 'Shift All +1 wk: the 60px height moved WITH the undated note to 8/10/26',
      NOTE.test(r1.n0810 || '') && r1.h0810 === 60, {n0810: r1.n0810, h0810: r1.h0810}, 'note + 60px on 8/10/26');
    add('R2', 'Shift All +1 wk: the week the note left is back to the default height (no empty tall row)',
      !NOTE.test(r1.n0803 || '') && r1.h0803 !== null && r1.h0803 <= 22, {n0803: r1.n0803, h0803: r1.h0803}, 'no note, <= 22px on 8/3/26');
    add('R3', 'Shift All +1 wk: the date-pinned note stayed on 9/7/26, and so did its 45px row',
      WRAP.test(r1.n0907 || '') && r1.h0907 === 45 && r1.h0914 <= 22, {n0907: r1.n0907, h0907: r1.h0907, h0914: r1.h0914}, 'pinned note + 45px still on 9/7/26');

    // R4: one undo puts the whole thing back -- height included.
    document.getElementById('undo-btn').click();
    await T.sleep(600); await settle(); await T.sleep(400);
    var r4 = state();
    add('R4', 'one undo restores the note AND its 60px row to 8/3/26',
      r4.h0803 === 60 && NOTE.test(r4.n0803 || '') && r4.h0810 <= 22 && r4.h0907 === 45, r4, 'the R0 state');

    // R5: Shift From Post (11/2/26) +1 wk -- both tall rows are before the cutoff and must not move.
    document.getElementById('pop-ripple-btn').click();
    await T.sleep(300);
    T.set('tool-ripple-phase', 'post');
    T.set('tool-ripple-weeks', '1');
    document.getElementById('tool-ripple-later').click();
    await T.sleep(600); await settle(); await T.sleep(400);
    var r5 = state();
    var msg = ((document.querySelector('#pop-ripple [data-tools-msg]') || {}).textContent || '').trim();
    add('R5', 'Shift From Post +1 wk: rows before the cutoff keep their heights',
      /Shifted 1 week later/.test(msg) && r5.h0803 === 60 && NOTE.test(r5.n0803 || '') && r5.h0907 === 45 && r5.h0810 <= 22,
      {msg: msg, h0803: r5.h0803, h0810: r5.h0810, h0907: r5.h0907}, '8/3 60px, 9/7 45px, unchanged');

    var clipped = T.clippedCells();
    add('R6', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: clipped.h.slice(0, 5)}, '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'rowheight', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
