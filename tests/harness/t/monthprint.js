// monthprint -- capture the EXACT document the month PDF prints, so a frozen edit to
// renderMonthView can be proved not to have moved it. ⭐ A gate.sh leg since 22 Sep 2026, diffed
// against tests/baselines/2026-09-22-monthprint/ by monthcmp.py.
//
// ⛔ WHY THIS LEG HAD TO EXIST. MONTH-VIEW-PLAN.md §6.5 conditions the owner's frozen-edit approval
// on "month PDF diffed against a pre-change export" -- and that could not be run. Unlike the
// waterfall PDF, which buildWaterfallPdf() writes byte by byte and gate 2 byte-compares, the MONTH
// PDF has no writer at all:
//
//     host.innerHTML = '';
//       html += '<div class="print-page">' + renderMonthView(currentSchedule) + '</div>';
//     host.innerHTML = html;                       // <- #print-root now holds the document
//     document.body.classList.add('printing-calendar');
//     window.print();                              // <- the browser prints THAT DOM
//
// The print stylesheet hides the whole app except #print-root, so the printed pages ARE that
// element's HTML and nothing else contributes. Diffing it is therefore equivalent to diffing the
// PDF -- one step earlier in the same pipeline, and strictly MORE sensitive, since it catches an
// attribute change a rasterised comparison would miss.
//
// ⚠️ WHAT THE HTML CANNOT CATCH: pagination, and any CSS-only change. Whether a month spills onto
// a second sheet is Chrome's page breaking, and a frozen `.mv-*` rule edit changes the printout
// without changing one byte of innerHTML. So the leg ALSO puts the captured document back into
// print state at the end, and run.sh's HARNESS_PRINT_PDF=1 has Chrome print it for real
// (monthprint.print.pdf) -- the same print media, @page box and page breaking a user's "Save as
// PDF" goes through. monthcmp.py counts those sheets. BLOCKS-PLAN.md §5 condition 2 ("the month PDF
// still paginates the same") is that count.
//
// TWO WAYS IN:
//   no HARNESS_STATE   the reference calendar T.buildFixture() types in (10 x 8 days, us-general)
//   HARNESS_STATE=x    a saved calendar restored through the inline ?state= path, measured AS
//                      SAVED -- buildFixture() is skipped, or it would overwrite the file under test
//
// HOW IT CAPTURES: window.print() is stubbed. At the moment the app calls it, #print-root holds the
// finished document -- populated at the line above, cleared only by the afterprint cleanup. So the
// stub reads innerHTML and never opens a dialog. ⛔ Do NOT capture earlier: the measure/scale pass
// between population and print writes the row heights and any scaleY onto the pages as inline
// styles, and those print. They are also what makes this capture a pagination record: every
// month's fit (fill or shrink, and each week's height) is IN the HTML, and monthcmp.py reads it
// back out as a table.
//
// ⛔ THE TODAY STAMP IS NORMALISED HERE, OR THIS LEG FALSE-FAILS EVERY DAY. The month header prints
// today's date as M.DD.YY (the {today:dotpad} form -- NOT the waterfall's M.D.YY; they differ on
// every 1st to 9th). An un-normalised baseline would fail the day after it was cut, which is
// exactly what made gates 2 and 3 useless for two rounds. Both dotted forms of the page's OWN
// "today" are replaced with DATESTAMP -- the same clock the app just read, so a capture taken a
// second before midnight still normalises. Content dates render with slashes and are untouched.
// `stampHits` counts the replacements, so a normalisation that silently matched nothing is visible
// (and is compared against the baseline's count).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  var fromState = /[?&]state=/.test(location.search);
  function settle(label) {
    // The grid re-renders several times as a restore lands (refreshAfterRestore -> update ->
    // render). Wait until #table-wrap has stopped changing, not merely until it exists.
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  try {
    await T.appReady();
    out.fromState = fromState;
    if (fromState) {
      await T.until(function () {
        return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr');
      }, 'the restored calendar', 200, 100);
    } else {
      T.buildFixture();
      await T.until(function () {
        return document.querySelectorAll('table.sheet-table tbody tr').length > 10;
      }, 'the waterfall grid', 200, 100);
    }
    await settle('the calendar to settle');

    // Month view, or exportMonthPdf has nothing to build from. (A restored month-view file is
    // already there; the click is then a no-op.)
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); },
                  'the month grid', 200, 100);
    await settle('the month grid to settle');

    var printed = null, printCalls = 0;
    var realPrint = window.print;
    window.print = function () {
      printCalls++;
      var host = document.getElementById('print-root');
      printed = host ? host.innerHTML : null;
      // Deliberately NOT calling through: a real dialog would hang headless Chrome.
    };
    // afterprint never fires (no real print), so the app's cleanup would leave
    // body.printing-calendar set -- which hides the app and makes the NEXT print silently do
    // nothing. Fire it by hand, exactly as the 60s safety net in exportMonthPdf would.
    document.getElementById('export-btn').click();
    await T.until(function () { return printCalls > 0; }, 'the print call', 200, 100);
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint;

    out.printCalls = printCalls;
    out.captured = !!printed;
    var host2 = document.getElementById('print-root');
    out.cleanedUp = !!host2 && host2.innerHTML === '';
    out.classCleared = !document.body.classList.contains('printing-calendar');

    var now = new Date(), y2 = String(now.getFullYear()).slice(2), mo = now.getMonth() + 1,
        dy = now.getDate();
    var stamps = [mo + '.' + String(dy).padStart(2, '0') + '.' + y2, mo + '.' + dy + '.' + y2]
      .filter(function (s, i, a) { return a.indexOf(s) === i; });
    var html = printed || '', hits = 0;
    stamps.forEach(function (s) {
      var re = new RegExp('(?<![\\d.])' + s.replace(/\./g, '\\.') + '(?!\\d)', 'g');
      html = html.replace(re, function () { hits++; return 'DATESTAMP'; });
    });
    out.stamps = stamps;
    out.stampHits = hits;
    // The number of months exportMonthPdf built -- what the printed sheet count must equal.
    out.pages = (html.match(/class="print-page"/g) || []).length;
    out.bytes = html.length;
    out.printHtml = html;
    // ⚠️ window.__ERR, which srv.js installs in <head>. This leg used to read `window.__errors`,
    // which nothing sets, so it reported 0 errors whatever happened.
    out.errors = (T.appHealth().errors || []).slice(0, 10);

    // ⭐ PUT THE DOCUMENT BACK IN PRINT STATE, for HARNESS_PRINT_PDF. Chrome prints the page when
    // the virtual budget runs out, and it must print exactly what was captured: the RAW innerHTML
    // (real date, not DATESTAMP) with the fit pass's inline styles, under body.printing-calendar,
    // which is precisely the state the real window.print() call is made in. The 60 s safety-net
    // cleanup cannot undo this: it is the same `cleanup` closure afterprint already ran, and its
    // `done` flag makes the second call a no-op.
    if (printed && host2) {
      host2.innerHTML = printed;
      document.body.classList.add('printing-calendar');
      out.leftInPrintState = true;
    }
  } catch (e) { out.EX = e.message; out.errors = (window.__ERR || []).slice(0, 10); }
  T.done(out);
})(); });
