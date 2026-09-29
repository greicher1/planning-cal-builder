// yearblock -- a schedule whose LAST week starts in late December must not grow an empty year block
// (FIX-PLAN.md 2.6; AUDIT-REPORT M-14).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh yearblock 90
//
// computeYearBlocks() files a week under the year of its MONDAY. The full-year padding in
// computeSchedule used the final week's SUNDAY instead, so a last week of Mon 12/30/30 - Sun 1/5/31
// padded the grid out to the first Monday of 2032: a whole 2031 block of 52 empty rows. Every
// export then carried a blank year column and printed at about half size.
//
// Each case starts from a fresh page state (no fixture): only Post is scheduled, and no default
// hiatus falls in 2030, so Post's weeks are exactly the ones typed.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function blockYears(){
    var ys = [];
    T.colList().forEach(function (c) { var m = /^y(\d+):date$/.exec(c.k || ''); if(m) ys.push(+m[1]); });
    return ys;
  }
  function rows(){ return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length; }
  function lastPostWeek(){
    var best = null, bestKey = -1;
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(t);
        if(m){ date = {text: t, key: (+m[3]) * 10000 + (+m[1]) * 100 + (+m[2])}; }
        else if(/^Post wk \d+$/.test(t) && date && date.key > bestKey){ bestKey = date.key; best = date.text; }
      });
    });
    return best;
  }
  async function schedulePost(startIso, weeks){
    T.set('start-post', startIso);
    T.set('weeks-post', String(weeks));
    await T.sleep(700);
    var l = -1, st = 0;
    await T.until(function () { var n = rows(); st = (n === l && n > 0) ? st + 1 : 0; l = n; return st >= 3; }, 'the grid to settle', 100, 100);
  }
  try {
    await T.appReady();
    await T.sleep(800);

    // Y1: the audit's repro -- Post's last week is Mon 12/30/30 (its Sunday is 1/5/31).
    await schedulePost('2030-10-07', 13);
    var y1 = {years: blockYears(), rows: rows(), last: lastPostWeek()};
    add('Y1', 'last week Mon 12/30/30: one 2030 block, no empty 2031 block',
      y1.last === '12/30/30' && y1.years.join(',') === '2030', y1, 'years [2030], Post ends 12/30/30');

    // Y2: the same edge one day earlier in the week -- Mon 12/29/31 -> Sun 1/4/32.
    await schedulePost('2031-10-06', 13);
    var y2 = {years: blockYears(), rows: rows(), last: lastPostWeek()};
    add('Y2', 'last week Mon 12/29/31: one 2031 block, no empty 2032 block',
      y2.last === '12/29/31' && y2.years.join(',') === '2031', y2, 'years [2031], Post ends 12/29/31');

    // Y3 (control, unchanged by the fix): the last week is wholly in December.
    await schedulePost('2030-10-07', 12);
    var y3 = {years: blockYears(), rows: rows(), last: lastPostWeek()};
    add('Y3', 'control: last week Mon 12/23/30 -- one 2030 block, as before',
      y3.last === '12/23/30' && y3.years.join(',') === '2030', y3, 'years [2030]');

    // Y4 (control): work that genuinely reaches a January Monday keeps its second block.
    await schedulePost('2030-10-07', 14);
    var y4 = {years: blockYears(), rows: rows(), last: lastPostWeek()};
    add('Y4', 'control: last week Mon 1/6/31 -- 2030 and 2031 blocks, as before',
      y4.last === '1/6/31' && y4.years.join(',') === '2030,2031', y4, 'years [2030, 2031]');

    var clipped = T.clippedCells();
    add('Y5', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: clipped.h.slice(0, 5)}, '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'yearblock', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
