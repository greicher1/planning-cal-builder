// base -- build a realistic calendar, measure the grid, and capture both exports.
//
// This is the BEFORE side of an acceptance gate: run it on unmodified code, keep the output,
// then run it again after a change and diff. The measurements it takes are the ones this
// project has actually been caught by -- horizontal clipping, grid width, export validity.
//
//   ./run.sh base 45
window.addEventListener('load',function(){ (async function(){
  var T=window.__T, out={};
  try{
    // ** Deliberately NOT appReady(). ** This test never touches the file menu, and appReady()
    // ** waits on renderRecents(), which sits behind an IndexedDB round trip -- see the README's
    // ** note on the fresh-profile stall. Gating a grid measurement on the storage layer made
    // ** this test fail for a reason it does not care about. Wait for the thing being measured.
    T.buildFixture();
    await T.until(function(){ return document.querySelectorAll('table.sheet-table tbody tr').length > 1; },
                  'the grid to render', 150, 100);
    out.health = T.appHealth();
    T.addHiatus('2026-08-24', 2);              // an all-phase band, which spans mc + notes
    await T.sleep(500);
    out.holidaysTurnedOn = await T.showHolidaysInSheet();
    await T.sleep(600);
    // A free-text note: the path that must stay pixel-identical, spanning the whole Notes width.
    await T.typeUserNote('2026-09-07', 'Studio Cut Due\nNetwork Cut Due 9/11/26');
    await T.sleep(600);

    out.gridWidthPt = Math.round(T.gridWidthPt()*100)/100;
    out.cols = T.colList();
    var c = T.clippedCells();
    out.hClip = c.h; out.hClipCount = c.h.length;
    out.vClip = c.v; out.vClipCount = c.v.length;
    out.rows = document.querySelectorAll('table.sheet-table tbody tr').length;
    out.noteCells = [].map.call(document.querySelectorAll('td.sheet-note-cell.has-note'),
      function(td){ return {w:td.dataset.week, span:td.colSpan||1,
                            t:(td.textContent||'').replace(/\s+/g,' ').trim()}; });
    out.sig = T.gridSignature();
    out.headers = [].map.call(document.querySelectorAll('table.sheet-table thead th'),
      function(th){ return (th.textContent||'').trim()+'#'+(th.colSpan||1); });

    // Both exports are awaited on the Blob itself, never on a clock. ExcelJS has to build a
    // workbook and the PDF writer has to subset and deflate a font; how long either takes is not
    // something a sleep can know.
    try {
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      out.xlsxLen = xb.size; out.xlsx = T.b64(await xb.arrayBuffer());
    } catch(e){ out.xlsxErr = e.message; }
    try {
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      out.pdfLen = pb.size; out.pdf = T.b64(await pb.arrayBuffer());
    } catch(e){ out.pdfErr = e.message; }
  }catch(e){ out.EX = e.message; try { out.health = T.appHealth(); } catch(_){} }
  T.done(out);
})(); });
