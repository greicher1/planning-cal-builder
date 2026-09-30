// cmdprint -- batch 5 (FIX-PLAN §7, "Cmd/Ctrl+P prints the whole UI"): Cmd/Ctrl+P runs the current
// view's own export. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=v1.4.0-saved ./run.sh cmdprint 150
//
// The owner REPRODUCED it (29 Sep 2026): Cmd+P printed the app itself -- header, notices, sidebar,
// toolbar, then a grid clipped by its scroller -- 2 pages in the waterfall, 3 in the month view. It was
// simulated in Chrome's real print pipeline on this fixture, with the fixes, and the OWNER CHOSE
// (30 Sep 2026, picker) "A: route to real export": the waterfall's Cmd+P is Export PDF (the direct
// writer's 1-page file), the month view's is the month PDF (one sheet per month). A print started from
// the browser's own menu is left alone (a page can neither intercept nor cancel one).
//
//   P1  waterfall, Ctrl+P: the keydown is defaultPrevented (so the browser prints nothing of its own)
//       and a PDF file is written -- the waterfall PDF, 1 page
//   P2  waterfall, Cmd+P (metaKey): the same
//   P3  month view, Ctrl+P: the month PDF is prepared and window.print() is called on it -- the print
//       class is set and #print-root holds one page per month
//   P4  guard: a plain "p" (no modifier) exports nothing
//   P5  guard: Ctrl+S still saves-through-the-button (the handler's other shortcut is untouched):
//       its keydown is still defaultPrevented
//   E0  0 console errors
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'cmdprint', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  function press(key, mods) {
    var e = new KeyboardEvent('keydown', { key: key, code: 'Key' + key.toUpperCase(), bubbles: true, cancelable: true,
                                           ctrlKey: !!(mods && mods.ctrl), metaKey: !!(mods && mods.meta) });
    document.dispatchEvent(e);
    return e.defaultPrevented;
  }
  async function pdfPages(blob) {
    var s = await blob.text();
    return { head: s.slice(0, 5), pages: (s.match(/\/Type\s*\/Page[^s]/g) || []).length };
  }
  try {
    await T.appReady();
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle('the restored calendar to settle');

    // P1 / P2 -- the waterfall: the key exports the waterfall PDF.
    var results = [];
    var mods = [{ ctrl: true }, { meta: true }];
    for (var i = 0; i < mods.length; i++) {
      await T.sleep(800);                                  // clear the export button's re-click guard
      var cap = T.captureDownload();
      var prevented = press('p', mods[i]);
      try { await T.until(function () { return !!cap.peek(); }, 'the waterfall PDF', 100, 100); } catch (e) {}
      var blob = cap.stop();
      var info = blob ? await pdfPages(blob) : null;
      results.push({ prevented: prevented, wrote: !!blob, info: info, dialog: T.modalText().slice(0, 120) });
    }
    out.sheet = results;
    kase('P1', 'waterfall, Ctrl+P: default prevented, and the waterfall PDF (1 page) is written',
         results[0].prevented && results[0].wrote && results[0].info.head === '%PDF-' && results[0].info.pages === 1, results[0]);
    kase('P2', 'waterfall, Cmd+P: the same', results[1].prevented && results[1].wrote && results[1].info.head === '%PDF-' && results[1].info.pages === 1, results[1]);

    // P4 -- a plain "p" does nothing.
    await T.sleep(800);
    var cap4 = T.captureDownload();
    var prevented4 = press('p', null);
    await T.sleep(1500);
    var wrote4 = !!cap4.stop();
    kase('P4', 'guard: a plain "p" exports nothing', !prevented4 && !wrote4, { prevented: prevented4, wrote: wrote4 });

    // P5 -- Ctrl+S is still the Save shortcut (the handler's other branch).
    kase('P5', 'guard: Ctrl+S is still taken by the app (defaultPrevented), untouched by the new branch',
         (function () { var e = new KeyboardEvent('keydown', { key: 's', code: 'KeyS', bubbles: true, cancelable: true, ctrlKey: true });
                        var realClick = HTMLButtonElement.prototype.click, clicked = null;
                        HTMLButtonElement.prototype.click = function () { clicked = this.id; };
                        try { document.dispatchEvent(e); } finally { HTMLButtonElement.prototype.click = realClick; }
                        out.p5 = { prevented: e.defaultPrevented, clicked: clicked };
                        return e.defaultPrevented && clicked === 'save-file-btn'; })(), {});
    if (out.p5) out.cases[out.cases.length - 1].observed = out.p5;

    // P3 -- the month view: the key prepares the month PDF and calls print on it.
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-week'); }, 'the month view', 200, 100);
    await settle('the month view to settle');
    var printed = null;
    var realPrint = window.print;
    window.print = function () {
      printed = { cls: document.body.className, pages: document.querySelectorAll('#print-root .print-page').length };
    };
    await T.sleep(800);
    var prevented3 = press('p', { ctrl: true });
    try { await T.until(function () { return !!printed; }, 'window.print() on the month PDF', 100, 100); } catch (e) {}
    window.print = realPrint;
    window.dispatchEvent(new Event('afterprint'));
    await T.sleep(300);
    out.month = { prevented: prevented3, printed: printed, after: document.body.className };
    kase('P3', 'month view, Ctrl+P: default prevented, the month PDF is prepared (print class, one page per month) and printed',
         prevented3 && !!printed && printed.cls.indexOf('printing-calendar') >= 0 && printed.pages >= 12, out.month);

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'cmdprint threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
