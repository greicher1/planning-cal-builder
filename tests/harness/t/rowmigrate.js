// rowmigrate -- a REAL calendar saved before 10 Sep 2026, carrying a hand-dragged row height, must
// keep that height on the SAME WEEK after the store changed from row-index keys to week keys.
//
// ⛔ THIS IS THE FORWARD-COMPATIBILITY HALF OF THE ROW-HEIGHT CHANGE, and the risky half. Every
// calendar anyone has ever dragged a row in stores `rowHeights: { "<row index>": px }`. This build
// reads `rowHeightsByWeek` instead, so without the migration in syncRowHeights() those files would
// open with every dragged row silently back to default -- and nothing would say so.
//
// The fixture is a genuine minted save (CLAUDE.md: test with real files, not synthesised ones):
// built in the app, a row dragged by hand, exported through the real share path, then the three
// keys that build could not have written -- rowHeightsByWeek, colWidthsAlt, singleColumn -- removed.
// Row 40 of the padded layout is the week of 10/12/26, at 45px.
//
// ⚠️ Driven by ?state=rowheightlegacy. Run against the BUILD.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 10;
    }, 'the restored grid', 200, 100);
    var l = -1, st = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      st = (n === l) ? st + 1 : 0; l = n; return st >= 5;
    }, 'the row count to settle', 150, 100);

    function heightOf(dateText) {
      var trs = document.querySelectorAll('table.sheet-table tbody tr');
      for (var i = 0; i < trs.length; i++) {
        var td = trs[i].querySelector('td');
        if (td && td.textContent.trim() === dateText) {
          return { row: i, h: Math.round(trs[i].getBoundingClientRect().height) };
        }
      }
      return null;
    }
    function tallRows() {
      return [].filter.call(document.querySelectorAll('table.sheet-table tbody tr'),
        function (tr) { return Math.round(tr.getBoundingClientRect().height) > 30; })
        .map(function (tr) { var td = tr.querySelector('td'); return td ? td.textContent.trim() : '?'; });
    }

    // ---- 1. ⭐ the legacy index key resolved to the RIGHT WEEK -----------------------------------
    out.restored = heightOf('10/12/26');
    out.migratedToRightWeek = !!out.restored && out.restored.h === 45 && out.restored.row === 40;
    // ...and to that week ONLY -- a migration that smeared the height across rows would still pass
    // the check above.
    out.tallRows = tallRows();
    out.onlyThatWeekIsTall = out.tallRows.length === 1 && out.tallRows[0] === '10/12/26';

    // ---- 2. ⭐ and it survives the layout it was never saved with --------------------------------
    // The fixture predates one-column mode entirely, so its singleColumn key is absent and the flag
    // must default to off. Turning it on moves 10/12/26 to a different ROW; the height must follow
    // the week, which is the whole point of the re-keying.
    out.btnStartsOff = document.getElementById('one-col-btn').getAttribute('aria-pressed') === 'false';
    document.getElementById('one-col-btn').click();
    await T.sleep(1700);
    var l2 = -1, s2 = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      s2 = (n === l2) ? s2 + 1 : 0; l2 = n; return s2 >= 5;
    }, 'the single-column grid', 150, 100);
    out.afterToggle = heightOf('10/12/26');
    out.movedRow = !!out.afterToggle && out.afterToggle.row !== out.restored.row;
    out.heightFollowedWeek = !!out.afterToggle && out.afterToggle.h === 45;
    out.stillOnlyOneTall = tallRows().length === 1;

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.migratedToRightWeek && out.onlyThatWeekIsTall && out.btnStartsOff &&
               out.movedRow && out.heightFollowedWeek && out.stillOnlyOneTall &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) { out.EX = e && (e.message || String(e)); }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
