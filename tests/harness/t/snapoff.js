// snapoff -- what a snap-off calendar looks like in the grid and the exports (FIX-PLAN.md 1.7;
// AUDIT-REPORT H-3, H-4). Captures the waterfall Excel + PDF and reports the grid facts a human
// reads: how many week rows, and which week each phase's first/last cell sits on. Run before and
// after the fix on the same fixture; the JSON is the before/after evidence.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=snapoff-sheet ./run.sh snapoff 60
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.appReady();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 3; }, 'the restored grid', 200, 100);
    await T.sleep(1500);

    // Walk the waterfall: for each row, the date cell(s) and the phase-cell labels in that row.
    // The grid renders year blocks side by side, so a row can carry more than one date; attribute
    // each label to the nearest preceding date IN ITS OWN ROW, and key weeks by real date.
    var phaseFirst = {}, phaseLast = {}, rowCount = 0, allDates = [];
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      rowCount++;
      var date = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim();
        if(/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(t)){ date = t; allDates.push(t); return; }
        var m = /^(.*?) (?:wk|Wk|Week) \d+$/.exec(t);
        if(m && date){
          var ph = m[1];
          if(!(ph in phaseFirst)) phaseFirst[ph] = date;
          phaseLast[ph] = date;
        }
      });
    });
    out.rowCount = rowCount;
    out.firstDate = allDates[0];
    out.phaseFirst = phaseFirst;
    out.phaseLast = phaseLast;
    // Every date cell must be a Monday (the grid is week-keyed; a snap-off phase must not re-anchor
    // it to another weekday, or the Monday-keyed note/hiatus stores stop matching -- audit H-4).
    function dow(mdY){ var p = mdY.split('/'); var y = 2000 + (+p[2]); return new Date(Date.UTC(y, +p[0]-1, +p[1])).getUTCDay(); }
    out.nonMondayDates = allDates.filter(function (d) { return dow(d) !== 1; });
    // The meta line for each phase (what the sidebar states), and the gap banner.
    out.gapBanner = (document.querySelector('.gap-warning, #gap-warning') || {}).textContent || '';
    out.prePrepMeta = ((document.getElementById('meta-prePrep') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    out.prodMeta = ((document.getElementById('meta-production') || {}).textContent || '').replace(/\s+/g, ' ').trim();

    // Capture the two frozen exports so a human (and pdfcmp/check-xlsx) can diff them.
    try { var xlsx = await T.captureExport('export-btn', 'excel'); if(xlsx) out.xlsx = T.b64(await xlsx.arrayBuffer()); } catch (e) { out.xlsxEX = String(e.message); }
    try { var pdf = await T.captureExport('export-wf-pdf-btn', 'pdf'); if(pdf) out.pdf = T.b64(await pdf.arrayBuffer()); } catch (e) { out.pdfEX = String(e.message); }
    var st = (new URL(location.href)).searchParams.get('state') || '';
    // Shared to all three: the grid is fully Monday-keyed.
    var mondayOk = out.nonMondayDates.length === 0;
    if(st === 'snapoff-sheet'){
      // Pre Prep entered Wed 4/8/26: it must appear in the week of Mon 4/6/26, not a week late on
      // 4/13, and the gap banner must read the true 1 week, not 2.
      out.pass = mondayOk && out.phaseFirst['Pre Prep'] === '4/6/26' && /3\/30\/26.*1 wk/.test(out.gapBanner);
    } else if(st === 'snapoff-onecol'){
      // The saved "Table read" note and the "Summer Break" hiatus label must be present (they used
      // to vanish because the rows were Wednesday-keyed), and no false gap.
      var grid = (document.getElementById('table-wrap') || {}).textContent || '';
      out.pass = mondayOk && out.phaseFirst['Pre Prep'] === '4/6/26' && /Summer Break/.test(grid) && !/Unscheduled gap/.test(out.gapBanner);
    } else if(st === 'snapoff-friday'){
      // Monday-anchored (the earliest phase was snap-off on a Friday). The empty 2025 block is a
      // documented, accepted edge (a Jan-2 start's week is Dec 29 2025); the invariant here is only
      // that every row is a Monday.
      out.pass = mondayOk && out.phaseFirst["Writer's Rm"] === '1/5/26';
    }
  } catch (e) { out.EX = String(e && e.stack || e); }
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
