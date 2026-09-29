// caps -- runaway counts are capped before any loop runs (FIX-PLAN.md 2.7; AUDIT-REPORT M-15, L-25).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh caps 120
//
// On v1.3.0: typing 8000 into Number of Episodes (or Number of Blocks) built 8000 rows before any
// guard, and a named hiatus with a typo'd week count wrote one hiatusTexts key PER WEEK -- ~200,000
// of them -- before MAX_WEEKS refused the calendar, bloating the snapshot (and so the crash backup,
// every undo step and the saved file) to megabytes. The caps: 200 episodes, 200 blocks (FIX-PLAN §0
// defaults table), and a hiatus's weeks clamped at MAX_WEEKS (600) before the name-sync loop.
//
// The snapshot is read from the crash backup, which IS captureSnapshot() (HANDOFF: the cheapest way
// to get one out of a running app); memoryIDB() makes that backup settle in headless Chrome.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function fieldVal(id){ return (document.getElementById(id) || {}).value; }
  function epRows(){ return document.querySelectorAll('#episode-rows .ep-name').length; }
  function blockRows(){ return document.querySelectorAll('#episode-rows .blk-row, #episode-rows [data-block-id]').length; }
  async function backup(){
    var got = null;
    await T.until(function () {
      got = T.latestBackup();    // the page's own slot (per-page since v1.3.1)
      return !!(got && got.state);
    }, 'the crash backup to be written', 120, 100);
    return got.state;
  }
  try {
    await T.appReady();
    await T.sleep(800);
    T.set('season-num', '2');
    T.set('shoot-days-per-ep', '8');

    // C1: 8000 episodes.
    T.set('num-episodes', '8000');
    await T.sleep(1500);
    var c1 = {rows: epRows(), field: fieldVal('num-episodes'), meta: ((document.getElementById('meta-production') || {}).textContent || '').trim()};
    add('C1', 'typing 8000 into Number of Episodes builds at most 200 rows, and the field says so',
      c1.rows === 200 && c1.field === '200', c1, '200 rows, field "200"');

    // C2: 200 exactly is allowed and unchanged.
    T.set('num-episodes', '12');
    await T.sleep(800);
    var c2 = {rows: epRows(), field: fieldVal('num-episodes')};
    add('C2', 'an ordinary count is untouched (12 -> 12 rows)', c2.rows === 12 && c2.field === '12', c2, '12 rows');

    // C3: blocks mode, 8000 blocks.
    T.set('show-mode', 'blocks');
    T.set('days-per-block', '5');
    T.set('num-blocks', '8000');
    await T.sleep(1500);
    var snapB = await backup();
    var c3 = {blockDefs: (snapB.blockDefs || []).length, field: fieldVal('num-blocks')};
    add('C3', 'typing 8000 into Number of Blocks keeps at most 200 blocks, and the field says so',
      c3.blockDefs === 200 && c3.field === '200', c3, '200 blockDefs, field "200"');
    T.set('num-blocks', '4');
    T.set('show-mode', 'episodes');
    await T.sleep(800);

    // C4: a NAMED all-phase hiatus with a typo'd week count.
    T.set('start-production', '2026-06-29');
    T.addHiatus('2026-03-02', 999999);
    var rowsH = document.querySelectorAll('#hiatus-list .hiatus-entry');
    var nameEl = rowsH[rowsH.length - 1].querySelector('.hiatus-name');
    if(!nameEl) throw new Error('no .hiatus-name on the new hiatus row');
    nameEl.value = 'Typo Break';
    ['input', 'change'].forEach(function (t) { nameEl.dispatchEvent(new Event(t, {bubbles: true})); });
    await T.sleep(4000);
    var snap = await backup();
    var hiKeys = Object.keys(snap.hiatusTexts || {}).length;
    var bytes = JSON.stringify(snap).length;
    add('C4', 'a named 999,999-week hiatus writes at most MAX_WEEKS (600) name keys; the snapshot stays small',
      hiKeys <= 600 && bytes < 200000, {hiatusTextsKeys: hiKeys, snapshotBytes: bytes}, '<= 600 keys, < 200 KB');
    add('C5', 'the calendar is still refused as too large (the typo is reported, not silently shortened)',
      /typo|too large|years/i.test(((document.getElementById('table-wrap') || {}).textContent || '')) ||
      /typo|too large|years/i.test(((document.getElementById('meta-production') || {}).textContent || '') + ((document.querySelector('.preview-meta, #preview-meta') || {}).textContent || '')),
      {tableWrap: ((document.getElementById('table-wrap') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160)}, 'the refusal message');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'caps', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
