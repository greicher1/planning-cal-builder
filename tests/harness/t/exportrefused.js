// exportrefused -- Export on a calendar with nothing to show SAYS WHY instead of doing nothing
// (FIX-PLAN.md 4.10; AUDIT-REPORT N-3).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh exportrefused 150
//
// While the preview is empty -- no dates yet, or a calendar refused as too long (> MAX_WEEKS) --
// frozen render() sends chrome.exportBtn({disabled:true}) and the same for the waterfall-PDF button.
// A disabled button never fires its click, so Export produced no file and no word: the audit's "no
// file and no notice within 30 s". Now the buttons stay clickable (Mantine's data-disabled look,
// not the disabled attribute) and the click handlers explain, quoting the frozen empty state's own
// text -- plus the N-2 line that names the cause when there is one.
//
// A button is clicked with element.click(), which a DISABLED button ignores -- exactly as a user's
// click is ignored. No real export is allowed to happen in a refused case: downloads and print are
// both watched.
//
//   E0  a fresh, empty calendar: Export explains ("Enter at least one phase...")
//   E1  the reference calendar with Post at 5,000 weeks (refused): Export to Excel explains, quoting
//       the refusal and the N-2 cause, and writes no file
//   E2  the same, the waterfall-PDF button
//   E3  the same in the Month view: Export PDF explains, and print is never called
//   E4  back to a normal calendar: Export to Excel produces a workbook (the guard lets real work by)
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var prints = 0, realPrint = window.print;
  window.print = function(){ prints++; };
  async function modalAfter(click){
    click();
    for(var i = 0; i < 30; i++){ await T.sleep(100); var t = T.modalText(); if(t) return t; }
    return '';
  }
  async function dismiss(){ T.clickModalButton('OK'); await T.sleep(300); }
  try {
    await T.appReady();
    await T.sleep(1000);
    var empty0 = ((document.querySelector('#table-wrap .empty-state') || {}).textContent || '').trim();
    var m0 = await modalAfter(function () { document.getElementById('export-btn').click(); });
    add('E0', 'a fresh, empty calendar: Export explains instead of doing nothing',
      /Enter at least one phase/.test(m0), {emptyState: empty0.slice(0, 60), modal: m0.slice(0, 120)}, 'the empty state\'s own words');
    if(m0) await dismiss();

    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1000);
    T.set('weeks-post', '5000'); await T.sleep(1200);
    var cap = T.captureDownload();
    var m1 = await modalAfter(function () { document.getElementById('export-btn').click(); });
    await T.sleep(800);
    var file1 = cap.peek();
    add('E1', 'refused (Post 5,000 weeks): Export to Excel explains, quoting the refusal and the named cause, and writes no file',
      /spans about 2,087 weeks/.test(m1) && /Post’s 5,000 weeks/.test(m1) && !file1,
      {modal: m1.slice(0, 220), file: !!file1}, 'the refusal + the N-2 line; no file');
    if(m1) await dismiss();

    var m2 = await modalAfter(function () { document.getElementById('export-wf-pdf-btn').click(); });
    await T.sleep(800);
    var file2 = cap.peek();
    add('E2', 'refused: the waterfall-PDF button explains too, and writes no file',
      /spans about 2,087 weeks/.test(m2) && !file2, {modal: m2.slice(0, 120), file: !!file2}, 'the refusal; no file');
    if(m2) await dismiss();
    cap.stop();

    document.getElementById('view-month-btn').click();
    await T.sleep(1200);
    var m3 = await modalAfter(function () { document.getElementById('export-btn').click(); });
    await T.sleep(600);
    add('E3', 'refused, Month view: Export PDF explains, and print is never called',
      /spans about 2,087 weeks/.test(m3) && prints === 0, {modal: m3.slice(0, 120), prints: prints}, 'the refusal; 0 prints');
    if(m3) await dismiss();
    document.getElementById('view-sheet-btn').click();
    await T.sleep(800);

    T.set('weeks-post', '16'); await T.sleep(1200);
    var cap2 = T.captureDownload();
    document.getElementById('export-btn').click();
    await T.until(cap2.peek, 'the workbook', 200, 100).catch(function () {});
    var wb = cap2.stop();
    add('E4', 'a normal calendar again: Export to Excel still produces a workbook, with no dialog',
      !!wb && wb.size > 1000 && !T.modalText(), {bytes: wb ? wb.size : 0, modal: T.modalText().slice(0, 60)}, 'a workbook');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  window.print = realPrint;
  T.done({test: 'exportrefused', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
