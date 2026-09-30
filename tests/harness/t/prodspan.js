// prodspan -- batch 4, step 4.5 (FIX-PLAN §6; audit L-11): the "N-Week Production Span" header line
// counts PRODUCTION's weeks, and only Production's. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh prodspan 150
//
// Two places count the span, and they must agree (the hdrtemplate leg holds them to each other):
//   - computeHeaderDefaults()'s r1: the Auto header on screen, Excel's page header and the waterfall
//     PDF's header;
//   - buildHeaderCtx()'s {production.summary} token: Template mode, in either view.
// Both counted a week as Production's when any cell in it had key 'production' OR a label starting
// with "Production". So a custom phase named "Production 2nd Unit" (its cells read "Production 2nd
// Unit wk N"), or a built-in phase RENAMED that way ("Production Prep"), added its own weeks to the
// shoot's span. The audit's SCHED_custom C1 read 7 for a 4-week shoot. The fix counts key ===
// 'production' only, at both sites.
//
// The calendar is synthetic and built through the real UI, region None (no holidays): 4 episodes x
// 5 days = 20 shoot days from Mon 6 Jul 2026, so four weeks, 7/6 to 7/31.
//   A0  truth guard: the Auto r1 reads "4-Week Production Span / 5-Day Shooting Schedule"
//   G1  truth guard: a Production per-phase hiatus band still counts. Its cell carries key
//       'production', so a one-week pause at 7/13 makes the span 5 weeks, before AND after the fix;
//       switching the pause off puts it back to 4
//   then "+ Add phase" -> "Production 2nd Unit", 5 weeks from 7/20 (to 8/21): it overlaps the shoot's
//   last two weeks and runs three weeks past the wrap
//     A1  the Auto r1 on screen still reads 4 weeks (the bug read 7)
//     X1  the exported workbook's header carries that r1 (read back with the page's own ExcelJS)
//     P1  the waterfall PDF's header carries it (its inflated content stream)
//   then Prod Prep is renamed "Production Prep", 3 weeks from 6/15, before the shoot
//     R1  the Auto r1 still reads 4 weeks (the same bug through a renamed built-in; it read 10)
//   then Template mode, whose r1 is DEFAULT_HEADER_TEMPLATE's {production.summary}
//     T1  the token resolves to the same 4 weeks
//   E0  0 console errors
// It returns the two exports as out.xlsxB64 / out.pdfB64: the before/after the owner sees.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'prodspan', cases: [], r1: {} };
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
  function r1() {
    var el = document.querySelector('#table-wrap .cal-header-bar .hdr-line[data-hid="r1"]');
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null;
  }
  var WANT4 = '4-Week Production Span / 5-Day Shooting Schedule';
  var WANT5 = '5-Week Production Span / 5-Day Shooting Schedule';
  // The PDF's inflated content streams, as text (notewrap's reader).
  async function pdfText(blob) {
    var bytes = new Uint8Array(await blob.arrayBuffer()), s = '';
    for (var i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m, txt = '';
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (bytes[en - 1] === 10 || bytes[en - 1] === 13)) en--;   // DecompressionStream rejects trailing bytes
      try {
        var ds = new Blob([bytes.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var t = await new Response(ds).text();
        if (t.indexOf(' Tj') >= 0) txt += t + '\n';
      } catch (e) { /* not a Flate stream */ }
    }
    return txt;
  }
  try {
    await T.appReady();
    T.set('show-title', 'Span Test');
    T.set('season-num', '1');
    T.set('num-episodes', '4');
    T.set('shoot-days-per-ep', '5');
    T.set('union-place', '');
    T.set('start-production', '2026-07-06');
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle('the calendar to settle');
    out.r1.base = r1();
    out.meta = (document.getElementById('meta-production') || {}).textContent || '';
    kase('A0', 'truth guard: a 20-day shoot from 7/6 reads a 4-week span', out.r1.base === WANT4, { r1: out.r1.base, meta: out.meta });

    // G1 -- the Production hiatus band is key 'production', so it counts on both builds.
    document.getElementById('phiatus-en-production').click();
    await T.sleep(300);
    T.set('phiatus-start-production', '2026-07-13');
    T.set('phiatus-weeks-production', '1');
    await settle('the paused shoot to settle');
    out.r1.paused = r1();
    document.getElementById('phiatus-en-production').click();
    await settle('the unpaused shoot to settle');
    out.r1.unpaused = r1();
    kase('G1', "truth guard: a week of Production's own hiatus is in its span (key 'production'), and leaving it is not",
         out.r1.paused === WANT5 && out.r1.unpaused === WANT4, { paused: out.r1.paused, unpaused: out.r1.unpaused });

    // A custom phase whose name starts with "Production".
    document.getElementById('add-phase-btn').click();
    await T.until(function () { return !!document.getElementById('name-custom1'); }, 'the custom phase row', 60, 100);
    T.set('name-custom1', 'Production 2nd Unit');
    T.set('start-custom1', '2026-07-20');
    T.set('weeks-custom1', '5');
    await settle('the custom phase to settle');
    out.r1.custom = r1();
    out.customCells = document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="custom1"]').length;
    kase('A1', 'a custom phase named "Production 2nd Unit" adds nothing to the span (Auto header, on screen)',
         out.r1.custom === WANT4 && out.customCells > 0, { r1: out.r1.custom, customCells: out.customCells });

    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var xblob = await T.captureExport('export-btn', 'the .xlsx blob');
    var xbuf = await xblob.arrayBuffer();
    out.xlsxB64 = T.b64(xbuf);
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(xbuf);
    var hdr = String((wb.worksheets[0].headerFooter || {}).oddHeader || '');
    out.xlsxHeader = hdr;
    var rAt = hdr.indexOf('&R');
    var rSec = rAt >= 0 ? hdr.slice(rAt + 2) : '';
    // The right section opens with the section's size/bold prefix; r1 is its first line.
    var rFirst = rSec.split('\n')[0].replace(/^&B&12&"Calibri,Bold"/, '').replace(/^&\d{1,3}&"Calibri,[A-Za-z ]+"&K[0-9A-F]{6}/, '');
    out.xlsxR1 = rFirst;
    kase('X1', "the Excel page header's r1 reads the same 4 weeks", rFirst === WANT4, { r1: rFirst });

    var pblob = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    out.pdfB64 = T.b64(await pblob.arrayBuffer());
    var ptxt = await pdfText(pblob);
    var spans = [], re2 = /\(([^()]*Production Span[^()]*)\) Tj/g, mm;
    while ((mm = re2.exec(ptxt))) spans.push(mm[1]);
    out.pdfSpans = spans;
    kase('P1', "the waterfall PDF's header draws the same 4 weeks", spans.length === 1 && spans[0] === WANT4, { runs: spans });

    // A built-in phase renamed so its label starts with "Production".
    T.set('name-prodPrep', 'Production Prep');
    T.set('start-prodPrep', '2026-06-15');
    T.set('weeks-prodPrep', '3');
    await settle('the renamed Prod Prep to settle');
    out.r1.renamed = r1();
    kase('R1', 'a built-in phase renamed "Production Prep" adds nothing either', out.r1.renamed === WANT4, { r1: out.r1.renamed });

    // Template mode: r1 is {production.summary}, the second counting site.
    var stale = document.querySelector('.hdr-mode-pop');
    if (stale) stale.remove();
    document.getElementById('hdr-mode-btn').click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the header mode popover', 40, 100);
    var row = null;
    document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function (r) {
      if ((r.querySelector('.hdr-mode-name').textContent || '') === 'Template') row = r;
    });
    if (!row) throw new Error('no "Template" row in the mode popover');
    row.click();
    await settle('Template mode to settle');
    out.modeLabel = (document.getElementById('hdr-mode-btn').textContent || '').trim();
    out.r1.template = r1();
    kase('T1', 'Template mode: {production.summary} resolves to the same 4 weeks',
         out.modeLabel === 'Header: Template' && out.r1.template === WANT4, { r1: out.r1.template, mode: out.modeLabel });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'prodspan threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
