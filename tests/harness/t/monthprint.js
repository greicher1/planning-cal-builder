// monthprint -- capture the EXACT document the month PDF prints, so a frozen edit to
// renderMonthView can be proved not to have moved it.
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
// ⚠️ WHAT IT CANNOT CATCH: pagination. Whether taller rows push a month onto an extra page is
// Chrome's page-breaking, not the HTML. Guard that with a measured row-height check instead --
// BLOCKS-PLAN.md §5 depends on this distinction, because per-week subtext changes row heights by
// design while these override marks do not.
//
// HOW IT CAPTURES: window.print() is stubbed. At the moment the app calls it, #print-root holds the
// finished document -- populated at the line above, cleared only by the afterprint cleanup. So the
// stub reads innerHTML and never opens a dialog. ⛔ Do NOT capture earlier: the measure/scale pass
// between population and print writes transform styles onto the pages, and those print.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 10;
    }, 'the waterfall grid', 200, 100);

    // Month view, or exportMonthPdf has nothing to build from.
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('.mv-daygrid'); },
                  'the month grid', 200, 100);

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
    out.bytes = printed ? printed.length : 0;
    // The page count is what a pagination regression would move first.
    out.pages = printed ? (printed.match(/class="print-page"/g) || []).length : 0;
    // ⭐ THE COMPARABLE. A hash alone says "changed" without saying where, so keep a structural
    // fingerprint too: every element's tag + class, in document order.
    out.printHtml = printed;
    var host2 = document.getElementById('print-root');
    out.cleanedUp = !!host2 && host2.innerHTML === '';
    out.classCleared = !document.body.classList.contains('printing-calendar');
    out.errors = (window.__errors || []).slice(0, 5);
  } catch (e) { out.EX = e.message; }
  T.done(out);
})(); });
