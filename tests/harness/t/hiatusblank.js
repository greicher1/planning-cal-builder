// hiatusblank -- a hiatus whose Weeks box the user cleared stays OFF through every restore path
// (FIX-PLAN.md 1.2; AUDIT-REPORT M-3).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hiatus-blank ./run.sh hiatusblank 90
//
// tests/fixtures/hiatus-blank.sptcal is `blocks` with the default 12/21/26 hiatus's weeks saved as
// "" -- exactly what collectFieldValues() writes when the box is cleared. While the box is blank the
// hiatus is inert (readState needs weeks > 0), so Post ends 2/15/27. Before the fix, every restore
// rebuilt the row with `prefillWeeks||2`, re-arming a 2-week break and pushing Post to 3/1/27.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function row0(){ var e = document.querySelector('#hiatus-list .hiatus-entry'); return e ? {start: e.querySelector('.hiatus-start').value, weeks: e.querySelector('.hiatus-weeks').value} : null; }
  // The LATEST week carrying a Post cell in the waterfall (the grid is what a user reads and
  // exports). ⚠️ Latest by DATE, not by document order: the waterfall renders its year blocks side by
  // side, so a row carries one date cell per block and the 2026 block's December rows come after the
  // 2027 block's February rows in the document (PROJECT-CONTEXT §11, false-failure table).
  function postLast(){
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
  try {
    await T.appReady();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the restored grid', 200, 100);
    await T.sleep(1500);
    var boot = {row0: row0(), postLast: postLast()};
    add('B1', 'restored at startup (inline saved-state, the shareable-copy path): the blank weeks stay blank',
      boot.row0 && boot.row0.weeks === '' && boot.postLast === '2/15/27', boot, 'row0 weeks "", Post ends 2/15/27');

    // B2: an unrelated edit, then undo -- undo replays a snapshot through the same restore.
    T.set('show-title', 'Blank Hiatus Undo'); await T.sleep(1500);
    document.getElementById('undo-btn').click(); await T.sleep(1500);
    var undo = {title: document.getElementById('show-title').value, row0: row0(), postLast: postLast()};
    add('B2', 'undo of an unrelated edit leaves the blank hiatus blank',
      undo.row0 && undo.row0.weeks === '' && undo.postLast === '2/15/27', undo, 'row0 weeks "", Post ends 2/15/27');

    // B3: File ▸ Load… of the same file through the real picker.
    var p = T.openViaFakePicker('/tests/fixtures/hiatus-blank.sptcal', 'hiatus-blank.sptcal');
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(2000);
    var picked = {row0: row0(), postLast: postLast()};
    add('B3', 'File > Load of the file: the blank weeks stay blank',
      picked.row0 && picked.row0.weeks === '' && picked.postLast === '2/15/27', picked, 'row0 weeks "", Post ends 2/15/27');

    // B4: the start value is escaped into the row, so a file cannot break out of value="…" (H-1).
    add('B4', 'no hiatus row markup came from a file value', !document.querySelector('#hiatus-list img, #hiatus-list [onerror]'),
      {injected: document.querySelectorAll('#hiatus-list img, #hiatus-list [onerror]').length}, '0');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'hiatusblank', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
