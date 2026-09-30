// simpostlabel -- Sim Post's offset says what it counts: CALENDAR weeks after Production begins,
// hiatus weeks included (FIX-PLAN.md 4.15; AUDIT-REPORT SCHED-13; the defaults table: "Relabel it
// 'calendar weeks after Production begins'. No date change").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh simpostlabel 120
//
// computeSchedule's isSimPostWeek measures the offset as Math.round((week - Production's start) / 7
// days): calendar weeks, so a hiatus inside the window still counts toward it. The row said only
// "weeks after Production begins", which reads as working weeks. The fix is words only, so this leg
// proves two things: the row (and the Help text) now say "calendar weeks", and the words are TRUE --
// with a two-week hiatus inside a three-week offset, the first Sim Post week is exactly three
// CALENDAR weeks after Production's first week (working weeks would put it two weeks later).
//
//   S1  the offset row reads "Starts [n] calendar weeks after Production begins"
//   S2  the Help overlay describes the offset in calendar weeks too
//   S3  the words are true: Production 6/29/26, a hiatus 7/6-7/19, offset 3 -> Sim Post from 7/20/26
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function setEl(e, v){
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(e, v);
    ['input', 'change'].forEach(function (t) { e.dispatchEvent(new Event(t, {bubbles: true})); });
  }
  // The EARLIEST week carrying a Sim Post cell, by date -- not document order, because the waterfall
  // lays its year blocks side by side (PROJECT-CONTEXT 11, the false-failure table).
  function firstSimPost(){
    var best = null, bestKey = Infinity;
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})(?!\d)/.exec(t);
        if(m && t.length <= 8){ date = {text: t, key: (+m[3]) * 10000 + (+m[1]) * 100 + (+m[2])}; }
        else if(t.indexOf('Simultaneous Post') === 0 && date && date.key < bestKey){ bestKey = date.key; best = date.text; }
      });
    });
    return best;
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1000);
    var row = document.getElementById('simpost-offset-row');
    var rowText = row ? (row.textContent || '').replace(/\s+/g, ' ').trim() : null;
    add('S1', 'the offset row says "calendar weeks after Production begins"',
      !!rowText && rowText.indexOf('Starts') === 0 && rowText.indexOf('calendar weeks after Production begins') > 0,
      {row: rowText}, 'Starts [n] calendar weeks after Production begins');
    var help = document.getElementById('help-overlay');
    var helpText = help ? (help.textContent || '').replace(/\s+/g, ' ') : '';
    add('S2', 'the Help overlay describes the offset in calendar weeks too',
      helpText.indexOf('calendar weeks after Production begins') >= 0 && helpText.indexOf('how many weeks after Production begins') < 0,
      {help: (helpText.match(/offset[^.]*\./) || [''])[0].slice(0, 200)}, 'calendar weeks');

    // S3: a two-week hiatus inside a three-week offset.
    var hs = document.querySelector('#hiatus-list .hiatus-entry .hiatus-start');
    var hw = document.querySelector('#hiatus-list .hiatus-entry .hiatus-weeks');
    setEl(hs, '2026-07-06'); setEl(hw, '2'); await T.sleep(800);
    var sp = document.getElementById('simpost-enabled');
    if(!sp.checked) sp.click();
    await T.sleep(600);
    T.set('simpost-offset', '3'); await T.sleep(1200);
    var first = firstSimPost();
    add('S3', 'the words are true: a hiatus inside the window still counts, so Sim Post starts 3 CALENDAR weeks in (7/20/26)',
      first === '7/20/26', {firstSimPost: first}, '7/20/26 (working weeks would give 8/3/26)');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'simpostlabel', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
