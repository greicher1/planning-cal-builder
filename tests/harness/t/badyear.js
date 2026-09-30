// badyear -- a hiatus or per-phase-hiatus date with a typo'd year rings THAT field
// (FIX-PLAN.md 4.4; AUDIT-REPORT L-10).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh badyear 120
//
// readState() refuses the whole calendar ('invalid-year': "One of the dates has a year that doesn't
// look right ... check the fields above") when ANY date field has a year outside 1970-2100: a
// phase's start, an all-phase hiatus's start, or an ENABLED per-phase hiatus's start. Only the phase
// starts were ever ringed (reflectStartDateValidity, owner request No. 4), so a hiatus typo blanked
// the calendar and marked nothing -- the audit's `ringedFields: []`.
//
// The ring must mirror the refusal EXACTLY: every field that causes it, and no other. So a
// per-phase hiatus whose toggle is OFF is not counted by readState and must not be ringed either.
//
//   Y0  the reference calendar renders and nothing is ringed
//   Y1  the default 12/21/26 all-phase hiatus typed as year 20266: refused, and exactly that field ringed
//   Y2  the year corrected: the calendar is back and nothing is ringed
//   Y3  Post's per-phase hiatus, enabled, typed as year 20266: refused, exactly phiatus-start-post ringed
//   Y4  that toggle switched OFF: readState no longer counts it, so the calendar is back and the
//       ring is gone
//   Y5  guard: a phase START with a bad year is still ringed as before, and only it
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
  function refused(){
    var e = document.querySelector('#table-wrap .empty-state');
    return e ? (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  }
  function gridRows(){ return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length; }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var YEAR = /year that doesn/;
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return gridRows() > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);
    add('Y0', 'the reference calendar renders and nothing is ringed', gridRows() > 10 && ringed().length === 0,
      {rows: gridRows(), ringed: ringed()}, 'rows > 10, ringed []');

    var hs = document.querySelector('#hiatus-list .hiatus-entry .hiatus-start');
    var orig = hs.value;
    setEl(hs, '20266-12-21'); await T.sleep(1200);
    add('Y1', 'an all-phase hiatus with year 20266: the calendar is refused and exactly that field is ringed',
      YEAR.test(refused()) && same(ringed(), ['.hiatus-start']) && hs.classList.contains('is-invalid'),
      {refused: refused(), ringed: ringed(), orig: orig}, 'refused (year), ringed [.hiatus-start]');

    setEl(hs, orig); await T.sleep(1200);
    add('Y2', 'the year corrected: the calendar is back and nothing is ringed', gridRows() > 10 && ringed().length === 0,
      {rows: gridRows(), ringed: ringed()}, 'rows > 10, ringed []');

    var en = document.getElementById('phiatus-en-post');
    if(!en.checked) en.click();
    await T.sleep(600);
    T.set('phiatus-weeks-post', '2');
    T.set('phiatus-start-post', '20266-12-07'); await T.sleep(1200);
    add('Y3', 'Post\'s per-phase hiatus, enabled, with year 20266: refused, exactly phiatus-start-post ringed',
      YEAR.test(refused()) && same(ringed(), ['phiatus-start-post']),
      {refused: refused(), ringed: ringed(), enabled: en.checked}, 'refused (year), ringed [phiatus-start-post]');

    en.click(); await T.sleep(1200);
    add('Y4', 'the per-phase toggle switched off: not counted, so the calendar is back and the ring is gone',
      !en.checked && gridRows() > 10 && ringed().length === 0,
      {enabled: en.checked, rows: gridRows(), ringed: ringed(), refused: refused()}, 'rows > 10, ringed []');

    var wr = document.getElementById('start-writersRoom'), wrOrig = wr.value;
    T.set('start-writersRoom', '20266-01-05'); await T.sleep(1200);
    add('Y5', 'guard: a phase start with year 20266 is still ringed, and only it',
      YEAR.test(refused()) && same(ringed(), ['start-writersRoom']), {refused: refused(), ringed: ringed()}, 'ringed [start-writersRoom]');
    T.set('start-writersRoom', wrOrig); await T.sleep(800);
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'badyear', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
