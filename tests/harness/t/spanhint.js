// spanhint -- a too-long calendar names the field that made it too long (FIX-PLAN.md 4.4; AUDIT-REPORT
// N-2; owner ruling 30 Sep 2026, "name the cause, above the preview").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh spanhint 150
//
// Frozen render() refuses a calendar over MAX_WEEKS with "that's almost certainly a typo in one of the
// years" -- measured wrong in 4 of 5 cases on this reference calendar. #span-hint, above the preview,
// names the one field that explains it (found by re-running computeSchedule with that field
// neutralised) and that field is ringed. The frozen sentence itself must NOT change: every case
// asserts it still reads as it always has.
//
//   N0  a normal calendar: no hint, nothing ringed
//   N1  Post's weeks 16 -> 5000: "Post's 5,000 weeks", weeks-post ringed
//   N2  shooting days per episode 8 -> 800: "Production's 8,000 shooting days (Show Info)", no ring
//       (Production's total is the episode list's sum, not a field)
//   N3  the 12/21/26 hiatus's weeks -> 5000: "the 12/21/26 hiatus's 5,000 weeks", that row's weeks ringed
//   N4  Post's start year 2026 -> 2062: "Post starts in 2062, 36 years after <Writer's Room's own
//       name>", start-post ringed. 36 is the difference in YEAR NUMBERS (the dates are 36.8 years apart)
//   N5  Post's own hiatus at 5000 weeks: "Post's own hiatus, 5,000 weeks", phiatus-weeks-post ringed
//   N6  two typos at once (Post AND Localization at 5000 weeks): no single field explains it, so the
//       generic line, and nothing ringed
//   N7  a bad YEAR (the invalid-year refusal, whose frozen message is right): no hint
//   N8  every typo undone: the grid is back, no hint, nothing ringed
//
// ⛔ The expected texts are exact strings compared with ===, never anchored regexes: no dollar sign
// may appear anywhere in a leg (srv.js). The curly quotes are literal characters in this file.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function setEl(e, v){
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(e, v);
    ['input', 'change'].forEach(function (t) { e.dispatchEvent(new Event(t, {bubbles: true})); });
  }
  function ringed(){
    return Array.from(document.querySelectorAll('.form-panel input.is-invalid')).map(function (e) {
      return e.id || ('.' + e.className.split(/\s+/).filter(function (c) { return c !== 'is-invalid'; }).join('.'));
    });
  }
  function hint(){
    var e = document.getElementById('span-hint');
    return {exists: !!e, shown: !!e && !e.hidden, text: e ? (e.textContent || '').trim() : null};
  }
  function frozen(){
    var e = document.querySelector('#table-wrap .empty-state');
    return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }
  function gridRows(){ return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length; }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var YEARS = /almost certainly a typo in one of the years/;
  // One refused case: the hint must be shown with exactly `want`, the ring must be exactly `ring`, and
  // the frozen sentence must still blame the years, unchanged.
  function refusedCase(id, title, want, ring){
    var h = hint(), r = ringed(), f = frozen();
    add(id, title, h.shown && h.text === want && same(r, ring) && YEARS.test(f),
      {hint: h, ringed: r, frozen: f.slice(0, 70)}, {hint: want, ringed: ring, frozen: 'unchanged, blames the years'});
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return gridRows() > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);
    var h0 = hint();
    add('N0', 'a normal calendar: the hint exists, hidden and empty, and nothing is ringed',
      h0.exists && !h0.shown && h0.text === '' && ringed().length === 0, {hint: h0, ringed: ringed()}, 'hidden, empty');

    T.set('weeks-post', '5000'); await T.sleep(1200);
    refusedCase('N1', 'Post at 5,000 weeks: the hint names Post\'s weeks, and weeks-post is ringed',
      'It isn’t a year: Post’s 5,000 weeks make the calendar too long. Check that number.', ['weeks-post']);
    T.set('weeks-post', '16'); await T.sleep(1000);

    T.set('shoot-days-per-ep', '800'); await T.sleep(1200);
    refusedCase('N2', '800 shooting days per episode: the hint names Production\'s shooting days and where they come from',
      'It isn’t a year: Production’s 8,000 shooting days (Show Info) make the calendar too long. Check that number.', []);
    T.set('shoot-days-per-ep', '8'); await T.sleep(1000);

    var hw = document.querySelector('#hiatus-list .hiatus-entry .hiatus-weeks'), hwOrig = hw.value;
    setEl(hw, '5000'); await T.sleep(1200);
    refusedCase('N3', 'the 12/21/26 hiatus at 5,000 weeks: the hint names that hiatus, and its weeks are ringed',
      'It isn’t a year: the 12/21/26 hiatus’s 5,000 weeks make the calendar too long. Check that number.', ['.hiatus-weeks']);
    setEl(hw, hwOrig); await T.sleep(1000);

    // The phase's own name, as its sidebar field shows it ("Writer's Rm"): what the hint uses.
    var wrName = document.getElementById('name-writersRoom').value.trim();
    T.set('start-post', '2062-11-02'); await T.sleep(1200);
    refusedCase('N4', 'Post\'s start typed as 2062: the hint says it IS a year, which one, and start-post is ringed',
      'Post starts in 2062, 36 years after ' + wrName + ' — check that year.', ['start-post']);
    T.set('start-post', '2026-11-02'); await T.sleep(1000);

    var en = document.getElementById('phiatus-en-post');
    if(!en.checked) en.click();
    await T.sleep(600);
    T.set('phiatus-start-post', '2026-12-07'); T.set('phiatus-weeks-post', '5000'); await T.sleep(1200);
    refusedCase('N5', 'Post\'s own hiatus at 5,000 weeks: the hint names it, and phiatus-weeks-post is ringed',
      'It isn’t a year: Post’s own hiatus, 5,000 weeks, makes the calendar too long. Check that number.', ['phiatus-weeks-post']);
    T.set('phiatus-weeks-post', '2'); en.click(); await T.sleep(1000);

    T.set('weeks-post', '5000'); T.set('weeks-localization', '5000'); await T.sleep(1200);
    refusedCase('N6', 'two typos at once: no single field explains it, so the generic line, and nothing ringed',
      'It may not be a year: the weeks and shooting days can make the calendar too long as well. Check them too.', []);
    T.set('weeks-post', '16'); T.set('weeks-localization', '8'); await T.sleep(1000);

    T.set('start-writersRoom', '20266-01-05'); await T.sleep(1200);
    var h7 = hint();
    add('N7', 'a bad year (the frozen message is right there): no hint', !h7.shown && /year that doesn/.test(frozen()),
      {hint: h7, frozen: frozen().slice(0, 60), ringed: ringed()}, 'hint hidden');
    T.set('start-writersRoom', '2026-01-05'); await T.sleep(1200);

    var h8 = hint();
    add('N8', 'every typo undone: the grid is back, no hint, nothing ringed', gridRows() > 10 && !h8.shown && ringed().length === 0,
      {rows: gridRows(), hint: h8, ringed: ringed()}, 'rows > 10, hidden, ringed []');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'spanhint', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
