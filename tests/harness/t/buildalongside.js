// buildalongside -- Build Around's STARTING TICKS on a calendar where phases touch by a day or two (owner, 10 Nov
// 2026: "its just confusing if you click prior to pre prep and then writers room isn't selected"; "writers room doesnt
// always overlap the next phases, only sometimes"; the rule: a phase is left unticked ONLY when it runs alongside the
// phase it would be built against).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=anchorside ./run.sh buildalongside 200
//
// "Alongside" is five shared days or more, a full working week (SOLVE_ALONGSIDE_DAYS). This leg holds the LOWER side
// of that line, which buildFixture cannot: tests/fixtures/anchorside.sptcal has two phases that touch by two days,
// through how their dates fall, and one that shares a whole week:
//   * Pre Prep (snap-off, Wed 4/8/26 x 6) works to Tue 5/19, two days into Prod Prep's first week (Mon 5/18);
//   * Production wraps Tue 11/3/26 (its Fall Break pushes the wrap), the day after Post starts (Mon 11/2);
//   * Post (16 weeks, paused two by the locked Christmas hiatuses) works to Fri 3/5/27, and Localization starts
//     Mon 3/1/27: the five days of Post's last week;
//   * Writer's Rm (1/5/26 x 12) ends Fri 3/27, before Pre Prep starts.
// So only Localization is left out. A build that counts ONE shared day leaves Pre Prep and Post out too (red on A2,
// A3, A5); the old rule (Writer's Rm and custom phases always out) is red on A1 and A4.
//
//   T0      truth guard: the three touching ends, read from the phase cards
//   A1      Writer's Rm, ending before Pre Prep, is ticked
//   A2      Pre Prep, two days into Prod Prep's first week, is ticked (and built: pulled 2 days)
//   A3      Post, starting the day before the wrap, is ticked
//   A4      Localization, in Post's last week, is left unticked, reads "Stays" and is named on the line
//   A5      the count and the button: "4 of 5 build", "Build 4 phases"
//   A6      After Post: the same verdict with Post pinned (Localization against the pin itself)
//   E0      0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(id){ return (($(id) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  var pop = function () { return $('pop-solve'); };
  function rows(){
    var o = {};
    Array.prototype.forEach.call(pop().querySelectorAll('[data-solve-list] .solve-row[data-key]'), function (r) {
      var box = r.querySelector('input[type=checkbox]');
      function t(c){ var e = r.querySelector('.' + c); return e ? (e.textContent || '').trim() : ''; }
      o[r.dataset.key] = {ticked: box ? (box.disabled ? null : box.checked) : null, pin: r.classList.contains('is-pin'), dt: t('solve-dt'), ch: t('solve-ch')};
    });
    return o;
  }
  function left(){ var n = pop().querySelector('[data-solve-left]'); return n && !n.hidden ? (n.textContent || '').trim() : ''; }
  function count(){ return (pop().querySelector('[data-solve-count]') || {}).textContent; }
  var LOC_LINE = 'Localization left unticked: it runs alongside Post. Tick it to build it in line.';
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt('meta-production')); }, 'the restored calendar', 200, 100);
    await T.sleep(1200);
    var m = {prePrep: txt('meta-prePrep'), production: txt('meta-production'), post: txt('meta-post'), writersRoom: txt('meta-writersRoom')};
    add('T0', 'the calendar: Pre Prep works to 5/19/26 (Prod Prep starts 5/18), the shoot wraps 11/3/26 (Post starts 11/2), Post works to 3/5/27 (Localization starts 3/1)',
      /5\/19\/26/.test(m.prePrep) && /11\/3\/26/.test(m.production) && /3\/5\/27/.test(m.post) && /3\/27\/26/.test(m.writersRoom)
        && $('start-prodPrep').value === '2026-05-18' && $('start-post').value === '2026-11-02' && $('start-localization').value === '2027-03-01',
      m, 'ends 5/19/26, 11/3/26, 3/5/27; the room 3/27/26');

    $('pop-solve-btn').click(); await T.sleep(600);
    var r = rows();
    add('A1', 'Writer\'s Rm ends before Pre Prep starts, so it is ticked like any other phase',
      r.writersRoom.ticked === true, r.writersRoom, 'ticked');
    add('A2', 'Pre Prep works two days into Prod Prep\'s first week: that is how its dates fall, not two phases side by side, so it is ticked (and would be pulled 2 days)',
      r.prePrep.ticked === true && r.prePrep.ch === 'Pulled 2 days', r.prePrep, 'ticked, "Pulled 2 days"');
    add('A3', 'Post starts the day before the shoot wraps: two shared days, so it is ticked',
      r.post.ticked === true && r.production.pin, {post: r.post, production: r.production}, 'ticked');
    add('A4', 'Localization starts in Post\'s last week, five shared days: it is left unticked, reads "Stays", and the line names it and Post',
      r.localization.ticked === false && r.localization.ch === 'Stays' && left() === LOC_LINE, {row: r.localization, left: left()}, 'unticked, "Stays", the line');
    add('A5', 'four of the five phases that can be built are ticked',
      count() === '4 of 5 build' && $('tool-solve-go').textContent === 'Build 4 phases', {count: count(), go: $('tool-solve-go').textContent}, '"4 of 5 build", "Build 4 phases"');

    await T.solvePress('post', 'row');
    $('tool-solve-fwd').click(); await T.sleep(450);
    var r6 = rows();
    add('A6', 'with Post pinned, After Post leaves Localization out for the same reason, judged against the pin itself, and ticks nothing else',
      $('tool-solve-phase').value === 'post' && $('tool-solve-fwd').textContent === 'After Post' && r6.localization.ticked === false && left() === LOC_LINE
        && count() === '0 of 5 build' && $('tool-solve-go').textContent === 'Tick a phase to build',
      {pin: $('tool-solve-phase').value, rows: r6, left: left(), count: count(), go: $('tool-solve-go').textContent}, 'Localization unticked and on the line; "Tick a phase to build"');
    document.body.click();
    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'buildalongside', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
