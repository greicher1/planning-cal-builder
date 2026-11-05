// rebuildticks -- Rebuild From's tick list (owner, 30 Oct 2026: "Build A", mockups/rebuild-from-ticks.html).
//
// ⚠️ UPDATED 5 Nov 2026 for BUILD AROUND (REBUILD-FROM-LENGTHS-PLAN.md, layout B): the list holds both sides with the
// pin in its place, Before / After are shortcuts that tick one side, Writer's Rm starts UNTICKED (owner), the button
// reads "Build N phases", and the box opens on Both every time. The cases below keep what this leg uniquely holds (a
// custom phase ticked into the chain, Localization's rule, the preview moving nothing); buildaround holds the rest.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh rebuildticks 300
//
// The owner's question: "what if you dont want localization added by rebuild From or you do want a custom
// phase moved by rebuild from. How does it know which phases to affect?" The direction now picks a side, the
// list names its phases with the start each would get, and Rebuild moves only the ticked ones. An unticked
// phase keeps its dates and the chain carries on from the last phase placed.
//
// THE CALENDAR: buildFixture() (synthetic, US-General, 10 episodes x 8 days) plus one custom phase,
// "Casting", 6 weeks from Mon 4/27/26, running ALONGSIDE Pre Prep and Prod Prep:
//   Writer's Rm 1/5/26 x 12 wk (it ends 3/30, a week before Pre Prep), Pre Prep 4/6 x 6, Prod Prep 5/18 x 6,
//   Production 6/29, Post 11/2 x 16, Localization 3/1/27 x 8.
// Production pinned two weeks later, Mon 7/13, Before at the starting ticks (built-ins ticked except Writer's Rm,
// custom phases not): Prod Prep 6/1, Pre Prep 4/20 (6 and 6 weeks back, end to end); Writer's Rm and Casting stay.
// With Casting ticked it is chained between them instead, and pushes everything before it six weeks earlier: the
// bug the default avoids.
//
//   T0      truth guard: the calendar as built
//   L1-L3   the list backwards from Production: rows in the order the phases run, the starting ticks, the
//           count and the button, and every row's date and "Pushed / Pulled / Stays"
//   P1      drawing the preview moved nothing (it runs the real solvers and puts them back)
//   G1-G3   Rebuild: exactly the previewed dates, Casting untouched, the result line, one undo restores
//   R1      reopened, the ticks are back at their defaults
//   C1      Casting ticked: chained in, and the phases before it pulled earlier by its length
//   F1-F4   forwards with Localization unticked: Post lands on the previewed date, Localization keeps 3/1/27,
//           the phases before the pin do not move, one undo restores
//   D1      the box opens on Both every time (Build Around; the direction was kept across openings until then)
//   I1      no tick carries an id (collectFieldValues() must never sweep one into a saved file)
//   U1-U2   Localization starts unticked unless its weeks were entered (owner, 30 Oct 2026); a start date
//           alone gives it no length, so its row reads "No length"
//   E0      0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) || {}).value; }
  function msg(){ return (($('pop-solve').querySelector('[data-tools-msg]') || {}).textContent || '').trim(); }
  function closePops(){ document.body.click(); }
  async function openSolve(){ closePops(); await T.sleep(150); $('pop-solve-btn').click(); await T.sleep(300); }
  async function settle(){ await T.sleep(700); }
  function rows(){
    return Array.prototype.map.call(document.querySelectorAll('#pop-solve .solve-row:not(.solve-colhead)'), function (r) {
      var box = r.querySelector('input[type=checkbox]');
      function t(c){ var e = r.querySelector('.' + c); return e ? (e.textContent || '').trim() : ''; }
      return {nm: t('solve-nm'), dt: t('solve-dt'), ch: t('solve-ch'), pin: r.classList.contains('is-pin'),
              ticked: box ? box.checked : null};
    });
  }
  function row(name){ return rows().filter(function (r) { return r.nm === name; })[0] || {}; }
  function tick(name, on){
    var r = Array.prototype.filter.call(document.querySelectorAll('#pop-solve .solve-row'), function (x) {
      var n = x.querySelector('.solve-nm'); return n && n.textContent.trim() === name;
    })[0];
    var box = r && r.querySelector('input[data-key]');
    if(box && box.checked !== on) box.click();
  }
  function go(){ return $('tool-solve-go'); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1'];
  function starts(){ var o = {}; KEYS.forEach(function (k) { o[k] = val('start-' + k); }); return o; }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  // m/d/yy, as the list prints a date
  function short(iso){ var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2); }

  try {
    await T.appReady();
    T.buildFixture();
    await settle();
    $('add-phase-btn').click(); await T.sleep(300);
    T.set('name-custom1', 'Casting'); T.set('start-custom1', '2026-04-27'); T.set('weeks-custom1', '6');
    await T.until(function () { return /shoot days/.test((($('meta-production') || {}).textContent || '')); }, 'the shoot', 200, 100);
    await T.sleep(1500);
    var s0 = starts();
    add('T0', 'the calendar as built (Casting 4/27 alongside Pre Prep and Prod Prep)',
      s0.writersRoom === '2026-01-05' && s0.prePrep === '2026-04-06' && s0.prodPrep === '2026-05-18' && s0.production === '2026-06-29'
        && s0.post === '2026-11-02' && s0.localization === '2027-03-01' && s0.custom1 === '2026-04-27', s0, 'buildFixture + Casting 4/27');

    // ---- Backwards from Production, pinned to 7/13, at the starting ticks ----
    await openSolve();
    $('tool-solve-back').click(); await T.sleep(150);
    T.set('tool-solve-phase', 'production'); await T.sleep(150);
    var gridBefore = $('table-wrap').innerHTML;
    T.set('tool-solve-date', '2026-07-13'); await T.sleep(400);
    var r1 = rows();
    add('L1', 'every phase in the order it runs, the pin in its place',
      same(r1.map(function (r) { return r.nm; }), ["Writer's Rm", 'Pre Prep', 'Casting', 'Prod Prep', 'Production', 'Post', 'Localization']) && r1[4].pin,
      r1.map(function (r) { return r.nm; }), "Writer's Rm, Pre Prep, Casting, Prod Prep, Production (pinned), Post, Localization");
    add('L2', 'Before\'s ticks: the built-ins before the pin except Writer\'s Rm, no custom phase; "2 of 6 ticked", "Build 2 phases"',
      row("Writer's Rm").ticked === false && row('Pre Prep').ticked === true && row('Prod Prep').ticked === true && row('Casting').ticked === false
        && row('Post').ticked === false
        && ($('pop-solve').querySelector('[data-solve-count]').textContent === '2 of 6 ticked')
        && go().textContent === 'Build 2 phases' && !go().disabled,
      {rows: r1, count: $('pop-solve').querySelector('[data-solve-count]').textContent, go: go().textContent}, 'Pre Prep and Prod Prep ticked');
    add('L3', 'each row shows its new start and how it moves, in the owner\'s words',
      row("Writer's Rm").dt === '1/5/26' && row("Writer's Rm").ch === 'Stays'
        && row('Pre Prep').dt === '4/20/26' && row('Pre Prep').ch === 'Pushed 2 wks'
        && row('Casting').dt === '4/27/26' && row('Casting').ch === 'Stays'
        && row('Prod Prep').dt === '6/1/26' && row('Prod Prep').ch === 'Pushed 2 wks'
        && row('Production').dt === '7/13/26' && row('Production').ch === 'Pushed 2 wks',
      r1, 'WR 1/5 Stays, Pre Prep 4/20 Pushed 2 wks, Casting 4/27 Stays, Prod Prep 6/1 Pushed 2 wks, Production 7/13 Pushed 2 wks');
    add('P1', 'drawing the preview moved nothing: every start and the grid are as they were',
      same(starts(), s0) && $('table-wrap').innerHTML === gridBefore, {starts: starts(), gridSame: $('table-wrap').innerHTML === gridBefore}, s0);

    go().click(); await settle();
    var s1 = starts();
    add('G1', 'Build delivers exactly the previewed dates, and Casting and Writer\'s Rm keep their own',
      s1.writersRoom === '2026-01-05' && s1.prePrep === '2026-04-20' && s1.prodPrep === '2026-06-01' && s1.production === '2026-07-13'
        && s1.custom1 === '2026-04-27' && s1.post === s0.post && s1.localization === s0.localization,
      s1, 'WR 1/5, Pre Prep 4/20, Prod Prep 6/1, Production 7/13, Casting 4/27, Post and Localization unmoved');
    add('G2', 'the result line names the pin and the far end', /^Production starts 7\/13\/26\. 2 phases built around it\./.test(msg()) && /Pre Prep starts 4\/20\/26/.test(msg()),
      {msg: msg()}, '"Production starts 7/13/26. 2 phases built around it. Pre Prep starts 4/20/26."');
    await undo();
    add('G3', 'one undo restores every phase', same(starts(), s0), starts(), s0);

    // ---- Reopened: the ticks are back at their defaults. Tick Casting and watch the chain change ----
    await openSolve();
    $('tool-solve-back').click(); await T.sleep(150);
    T.set('tool-solve-phase', 'production'); await T.sleep(150);
    T.set('tool-solve-date', '2026-07-13'); await T.sleep(400);
    add('R1', 'reopened, the ticks start from the defaults again (Casting unticked)', row('Casting').ticked === false && row('Pre Prep').ticked === true,
      rows(), 'Casting unticked');
    tick('Casting', true); await T.sleep(250);
    var rc = rows();
    add('C1', 'Casting ticked: chained in before Prod Prep, so Pre Prep is pulled earlier by its 6 weeks; Writer\'s Rm stays',
      row('Casting').dt === '4/20/26' && row('Casting').ch === 'Pulled 1 wk'
        && row('Pre Prep').dt === '3/9/26' && row('Pre Prep').ch === 'Pulled 4 wks'
        && row("Writer's Rm").dt === '1/5/26' && row("Writer's Rm").ch === 'Stays'
        && go().textContent === 'Build 3 phases' && same(starts(), s0),
      {rows: rc, go: go().textContent, unmoved: same(starts(), s0)}, 'Casting 4/20, Pre Prep 3/9, WR stays; nothing moved yet');
    tick('Casting', false); await T.sleep(250);

    // ---- Forwards from Production, Localization unticked ----
    $('tool-solve-fwd').click(); await T.sleep(250);
    var rf = rows();
    var ok1 = rf[4].pin && row('Post').ticked === true && row('Localization').ticked === true
      && row('Pre Prep').ticked === false && row('Prod Prep').ticked === false;
    tick('Localization', false); await T.sleep(250);
    var postPreview = row('Post').dt, locRow = row('Localization');
    add('F1', 'After: the phases after the pin ticked, the ones before it not; Localization unticked reads "Stays" on 3/1/27 and the button counts 1',
      ok1 && locRow.ch === 'Stays' && locRow.dt === '3/1/27' && go().textContent === 'Build 1 phase' && /^Pushed /.test(row('Post').ch),
      {rows: rows(), go: go().textContent}, 'Post (Pushed …), Localization Stays 3/1/27; "Build 1 phase"');
    go().click(); await settle();
    var s2 = starts();
    add('F2', 'Post lands on the previewed date; Localization keeps 3/1/27',
      short(s2.post) === postPreview && s2.post > s0.post && s2.localization === '2027-03-01' && s2.production === '2026-07-13',
      {post: s2.post, preview: postPreview, localization: s2.localization, msg: msg()}, 'Post = ' + postPreview + ', Localization 2027-03-01');
    add('F3', 'the phases before the pin do not move when working forwards',
      s2.writersRoom === s0.writersRoom && s2.prePrep === s0.prePrep && s2.prodPrep === s0.prodPrep && s2.custom1 === s0.custom1, s2, s0);
    await undo();
    add('F4', 'one undo restores every phase', same(starts(), s0), starts(), s0);

    // ---- The direction lasts the session; nothing in the list has an id ----
    await openSolve();
    add('D1', 'reopened, the box is back on Both (it opens on Both every time)',
      $('tool-solve-both').getAttribute('aria-pressed') === 'true' && $('tool-solve-fwd').getAttribute('aria-pressed') === 'false',
      {both: $('tool-solve-both').getAttribute('aria-pressed'), fwd: $('tool-solve-fwd').getAttribute('aria-pressed')}, 'Both pressed');
    var boxes = document.querySelectorAll('#pop-solve .solve-list input');
    add('I1', 'no tick or length box carries an id, and every one sits inside .tools-menu',
      boxes.length > 0 && !document.querySelector('#pop-solve .solve-list input[id]')
        && Array.prototype.every.call(boxes, function (b) { return !!b.closest('.tools-menu'); }),
      {boxes: boxes.length, withId: document.querySelectorAll('#pop-solve .solve-list input[id]').length}, 'no ids');
    closePops(); await T.sleep(150);

    // ---- Localization starts unticked unless someone filled it in (owner, 30 Oct 2026: "localization should
    //      also be unticked by default (unless someone entered a number of weeks or a starting date for it)").
    //      A new calendar leaves its weeks blank, and a phase with no length is never ticked: its row says
    //      "No length". A start date alone gives it no length, so it still cannot be placed. ----
    T.set('weeks-localization', ''); await settle();
    await openSolve();
    $('tool-solve-fwd').click(); T.set('tool-solve-phase', 'production'); await T.sleep(400);
    var locNo = row('Localization'), goNo = go().textContent;
    add('U1', 'Localization with a start date but no weeks starts unticked and reads "No length"; Build counts only Post',
      locNo.ticked === false && locNo.ch === 'No length' && val('start-localization') === '2027-03-01' && goNo === 'Build 1 phase',
      {row: locNo, go: goNo, start: val('start-localization')}, 'unticked, "No length", "Build 1 phase"');
    closePops(); await T.sleep(150);
    T.set('weeks-localization', '8'); await settle();
    await openSolve();
    $('tool-solve-fwd').click(); await T.sleep(400);
    var locYes = row('Localization');
    add('U2', 'with its weeks entered, Localization starts ticked', locYes.ticked === true && go().textContent === 'Build 2 phases',
      {row: locYes, go: go().textContent}, 'ticked, "Build 2 phases"');
    closePops();
    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'rebuildticks', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
