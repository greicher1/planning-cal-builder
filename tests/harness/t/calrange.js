// calrange -- the calendar range (owner ruling 3, 20 Oct 2026): two dates in the Show tab that replace the
// waterfall's full-year padding. A gate.sh audit-fix-style leg (cases).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh calrange 300
//
// The owner's rulings, and the four answers asked before building (picker, 20 Oct 2026):
//   * blank = today's full calendar years; a typed date is the first / last row, snapped to its Monday;
//   * rows outside are cut, and a strip above the grid names the phases that lose weeks, with the weeks
//     ("Names and weeks"), in the waterfall view only;
//   * it limits the waterfall, Excel and the waterfall PDF, NOT the month view or the month PDF;
//   * year blocks still split on 1 January (frozen computeYearBlocks);
//   * the shift tools move it like an unlocked hiatus; it applies in Single Column Mode too, where a blank
//     date keeps that layout's own first/last working week;
//   * saved in the file as two new field ids, cal-range-start and cal-range-end.
//
// A synthetic calendar (made-up dates and lengths) that straddles a year end, with Simultaneous Post on, so
// the range cuts phases at BOTH ends and cuts sim-post weeks the month view must keep:
//   Writer's Rm 3/2/26 x10, Pre Prep 5/11/26 x8, Production 8/3/26 (6 x 5 days), Post 10/5/26 x20 with its own
//   two-week hiatus from 2/1/27.
// The range is Wed 9/2/26 .. Wed 1/20/27, so its rows are Mon 8/31/26 .. Mon 1/18/27.
//
// ⭐ Every expectation is DERIVED from the same calendar with the range blank (the "full" grid), never typed
// from a hand count: which weeks each phase loses, the labels of the rows kept, the month view's HTML.
//
// ⚠️ Red on a build without the feature: C0 finds no fields, and every case after it fails or throws.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'calrange', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function $(id) { return document.getElementById(id); }
  function val(id) { return ($(id) || {}).value; }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label || 'the grid to settle', 200, 100);
  }
  var DAY = 86400000;
  function isoOfShort(s) {                                   // '8/31/26' -> '2026-08-31'
    var m = /^(\d+)\/(\d+)\/(\d\d)$/.exec(s || ''); if (!m) return null;
    return '20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  }
  function grid() {
    var dates = [].map.call(document.querySelectorAll('#table-wrap td.sheet-date'), function (td) { return (td.textContent || '').trim(); })
      .filter(Boolean);
    var isos = dates.map(isoOfShort).filter(Boolean).sort();
    // byWeek: every phase cell, paused ones included; work: the WORK weeks only (a phase's own hiatus is a
    // .sheet-hiatus-cell.sheet-phase-cell, and is not a week of work lost).
    var byWeek = {}, work = {};
    [].forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
      (byWeek[td.dataset.week] = byWeek[td.dataset.week] || []).push(td.dataset.pkey + '=' + (td.textContent || '').trim());
      if (!td.classList.contains('sheet-hiatus-cell')) (work[td.dataset.week] = work[td.dataset.week] || []).push(td.dataset.pkey);
    });
    Object.keys(byWeek).forEach(function (k) { byWeek[k].sort(); });
    var years = [].map.call(document.querySelectorAll('#table-wrap table.sheet-table thead th'), function (th) { return (th.textContent || '').trim(); })
      .filter(function (t) { return /^\d{4}$/.test(t); });
    var empty = document.querySelector('#table-wrap .empty-state');
    return { first: dates[0] || null, firstIso: isos[0] || null, lastIso: isos[isos.length - 1] || null, count: isos.length,
             isos: isos, byWeek: byWeek, work: work, years: years, empty: empty ? (empty.textContent || '').trim() : '' };
  }
  function notice() {
    var el = $('calrange-notice');
    return { exists: !!el, shown: !!el && !el.hidden, text: el ? ((el.querySelector('.ln-text') || {}).textContent || '').trim() : '' };
  }
  async function setRange(s, e) { T.set('cal-range-start', s); T.set('cal-range-end', e); await T.sleep(400); await settle(); }
  async function view(mode) { $('view-' + mode + '-btn').click(); await T.sleep(500); await settle('the ' + mode + ' view'); }
  function closePops() { document.body.click(); }
  async function openPop(btn) { closePops(); await T.sleep(150); $(btn).click(); await T.sleep(250); }
  async function undo(n) { for (var i = 0; i < (n || 1); i++) { $('undo-btn').click(); await T.sleep(900); } }
  async function walkMonths() {
    for (var i = 0; i < 40; i++) { var p = $('mv-prev'); if (!p || p.disabled) break; p.click(); await T.sleep(60); }
    var pages = [];
    for (var j = 0; j < 40; j++) {
      pages.push(($('table-wrap').innerHTML || '').replace(/\d{1,2}\.\d{1,2}\.\d{2}/g, 'DATESTAMP'));
      var n = $('mv-next'); if (!n || n.disabled) break; n.click(); await T.sleep(60);
    }
    return pages;
  }
  // The waterfall PDF's text: every decompressed content stream that draws text, joined.
  async function pdfText() {
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF');
    var bytes = new Uint8Array(await pb.arrayBuffer());
    var latin = ''; for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var all = '', re = /stream\r?\n/g, m;
    while ((m = re.exec(latin))) {
      var s0 = m.index + m[0].length, en = latin.indexOf('endstream', s0);
      if (en < 0) continue;
      while (en > s0 && (bytes[en - 1] === 10 || bytes[en - 1] === 13 || bytes[en - 1] === 32)) en--;
      try {
        // The writer's own promises reject too on a stream that is not deflate (a font): caught, or each one
        // is an unhandled rejection that H0 counts as a console error.
        var ds = new DecompressionStream('deflate'); var w = ds.writable.getWriter();
        w.write(bytes.subarray(s0, en)).catch(function () {}); w.close().catch(function () {});
        var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), txt = '';
        for (var j = 0; j < u.length; j += 8192) txt += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
        if (/\bTj\b|\bTJ\b/.test(txt)) all += txt + '\n';
      } catch (e) { /* font streams */ }
    }
    return all;
  }
  // The workbook's Date columns, read back through the page's own ExcelJS (xlsxdates' reading).
  async function xlsxDates() {
    var blob = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    var ws = wb.worksheets[0], cols = [], isos = [];
    ws.getRow(1).eachCell(function (cell, col) { if (String(cell.value || '').trim() === 'Date') cols.push(col); });
    function toIso(v) {
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === 'number') return new Date(Math.round((v - 25569) * DAY)).toISOString().slice(0, 10);
      return null;
    }
    cols.forEach(function (col) {
      for (var r = 2; r <= ws.rowCount; r++) {
        var v = ws.getRow(r).getCell(col).value;
        if (v === null || v === undefined || v === '') continue;
        var iso = (v && typeof v === 'object' && !(v instanceof Date) && 'result' in v) ? toIso(v.result) : toIso(v);
        if (iso) isos.push(iso);
      }
    });
    return { cols: cols.length, isos: isos.slice().sort(), first: isos[0] || null };
  }
  function phaseOrder() {
    return [].map.call(document.querySelectorAll('#phase-rows input[id^="start-"], #custom-phase-rows input[id^="start-"]'),
      function (el) { return el.id.slice(6); });
  }
  function displayName(key) { var el = $('name-' + key); return (el && (el.value || '').trim()) || key; }

  // ---- Save and Load through the real paths (offweek's shape) ----------------------------------------------
  var written = [];
  function textOf(w) { return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'calrange.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? textOf(written[written.length - 1]) : ''], 'calrange.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return textOf(written[written.length - 1]);
  }
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'calrange-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/tests/fixtures/none.sptcal', name, { text: text, writes: written });
    // Patient on purpose: the unsaved-work question can take seconds to come up while other sessions' gates
    // load the machine (one run timed out at 4 s + 10 s under a load average of 15).
    for (var i = 0; i < 150; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file’s name in the file menu', 300, 100);
    await T.sleep(600); await settle('the loaded calendar');
  }

  try {
    await T.appReady();
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);

    // ---- C0: the card --------------------------------------------------------------------------------------
    var sEl = $('cal-range-start'), eEl = $('cal-range-end');
    var card = sEl && sEl.closest('section.card');
    kase('C0', 'the Show tab has a Calendar range card with two native date fields, blank, swept into saved files (not in .prefs-card)',
      !!sEl && !!eEl && sEl.type === 'date' && eEl.type === 'date' && !!card && card.dataset.tab === 'show' &&
      !card.classList.contains('prefs-card') && sEl.value === '' && eEl.value === '' && card === eEl.closest('section.card'),
      { start: !!sEl, end: !!eEl, tab: card && card.dataset.tab });

    T.set('show-title', 'Range Leg'); T.set('season-num', '1');
    T.set('num-episodes', '6'); T.set('shoot-days-per-ep', '5');
    T.set('start-writersRoom', '2026-03-02'); T.set('weeks-writersRoom', '10');
    T.set('start-prePrep', '2026-05-11');     T.set('weeks-prePrep', '8');
    T.set('start-production', '2026-08-03');
    T.set('start-post', '2026-10-05');        T.set('weeks-post', '20');
    var sp = $('simpost-enabled'); if (!sp.checked) sp.click();
    // Post's own two-week hiatus, AFTER the range's end: its paused weeks are cut but are not work lost.
    var phe = $('phiatus-en-post'); if (!phe.checked) phe.click();
    await T.sleep(300);
    T.set('phiatus-start-post', '2027-02-01'); T.set('phiatus-weeks-post', '2');
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await T.sleep(800); await settle();

    // ---- C1: blank is today --------------------------------------------------------------------------------
    var full = grid(), n0 = notice();
    kase('C1', 'blank range: full calendar years as today (first row Mon 1/5/26, blocks 2026 and 2027), and no strip',
      full.first === '1/5/26' && full.years.join() === '2026,2027' && n0.exists && !n0.shown,
      { first: full.first, years: full.years, rows: full.count, notice: n0 });
    var fullMonths = null;

    // ---- R1-R3: the range cuts the waterfall ---------------------------------------------------------------
    await setRange('2026-09-02', '2027-01-20');
    var g = grid(), nA = notice();
    var expectIsos = []; for (var t = Date.UTC(2026, 7, 31); t <= Date.UTC(2027, 0, 18); t += 7 * DAY) expectIsos.push(new Date(t).toISOString().slice(0, 10));
    kase('R1', 'the range is the first and last row, each snapped to its Monday (8/31/26 .. 1/18/27), and a block still starts each 1 January',
      g.first === '8/31/26' && JSON.stringify(g.isos) === JSON.stringify(expectIsos) && g.years.join() === '2026,2027',
      { first: g.first, firstIso: g.firstIso, lastIso: g.lastIso, rows: g.count, expected: expectIsos.length, years: g.years });
    var rowDiffs = expectIsos.filter(function (iso) { return JSON.stringify(g.byWeek[iso] || []) === JSON.stringify(full.byWeek[iso] || []) ? false : true; });
    var prodFirst = (g.byWeek['2026-08-31'] || []).filter(function (c) { return c.indexOf('production=') === 0; });
    kase('R2', 'every row kept reads exactly as in the full calendar, so a cut phase keeps counting from its real start (' + prodFirst.join() + ')',
      rowDiffs.length === 0 && prodFirst.length === 1 && !/wk 1$/.test(prodFirst[0]),
      { differing: rowDiffs.slice(0, 4), prodFirst: prodFirst });
    var lost = {};
    Object.keys(full.work).forEach(function (wk) {
      if (wk >= '2026-08-31' && wk <= '2027-01-18') return;
      full.work[wk].forEach(function (k) { lost[k] = (lost[k] || 0) + 1; });
    });
    var parts = [], total = 0;
    phaseOrder().forEach(function (k) { if (lost[k]) { total += lost[k]; parts.push(lost[k] + (lost[k] === 1 ? ' week of ' : ' weeks of ') + displayName(k)); } });
    var expectText = 'The calendar range cuts ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0])
      + ' from the waterfall, Excel and PDF. The month view still shows ' + (total === 1 ? 'it.' : 'them.');
    var pausedCut = Object.keys(full.byWeek).filter(function (wk) { return wk > '2027-01-18' && (full.byWeek[wk] || []).some(function (c) { return c === 'post=Post Hiatus'; }); });
    kase('R3', 'the strip names each phase that loses WORK weeks, with its weeks, as ruled ("Names and weeks"); Post\'s 2 cut hiatus weeks are not counted',
      nA.shown && nA.text === expectText && parts.length === 4 && pausedCut.length === 2,
      { observed: nA.text, expected: expectText, lost: lost, pausedCut: pausedCut });

    // ---- R4-R5: Excel and the waterfall PDF follow it ------------------------------------------------------
    var xl = await xlsxDates();
    kase('R4', 'Excel: the Date columns hold exactly the range\'s weeks, first 8/31/26',
      xl.cols >= 1 && JSON.stringify(xl.isos) === JSON.stringify(expectIsos) && xl.first === '2026-08-31',
      { cols: xl.cols, n: xl.isos.length, first: xl.first, last: xl.isos[xl.isos.length - 1] });
    var pt = await pdfText();
    var has = function (s) { return pt.indexOf('(' + s + ')') !== -1; };
    kase('R5', 'the waterfall PDF prints the range\'s first and last weeks and none of the cut ones',
      pt.length > 0 && has('8/31/26') && has('1/18/27') && !has('8/24/26') && !has('1/25/27') && !has('1/5/26'),
      { textBytes: pt.length, first: has('8/31/26'), last: has('1/18/27'), cutBefore: has('8/24/26'), cutAfter: has('1/25/27'), jan: has('1/5/26') });

    // ---- R6: the month view keeps the whole calendar ------------------------------------------------------
    await view('month');
    var nM = notice(), cardInMonth = getComputedStyle(card).display;
    var rangedMonths = await walkMonths();
    await setRange('', '');
    fullMonths = await walkMonths();
    var same = rangedMonths.length === fullMonths.length && rangedMonths.every(function (h, i) { return h === fullMonths[i]; });
    var joined = fullMonths.join('\n');
    kase('R6', 'the month view is identical with and without the range, every month (' + fullMonths.length + '), the cut sim-post and Writer\'s Room weeks included, and the strip hides there',
      same && fullMonths.length >= 12 && /Simultaneous Post/.test(joined) && /Writer(&#39;|'|’)s Room Opens/.test(joined) && !nM.shown && nM.text === expectText,
      { ranged: rangedMonths.length, full: fullMonths.length, firstDiff: rangedMonths.findIndex(function (h, i) { return h !== fullMonths[i]; }), noticeShown: nM.shown });
    await setRange('2026-09-02', '2027-01-20');
    var keptInMonth = { s: val('cal-range-start'), e: val('cal-range-end') };
    await view('sheet');
    // The owner's standing rule (20 Oct 2026): a control shows only where it matters. The card hides in the month
    // view, where it changes nothing, and its dates stay in force.
    kase('R6b', 'back in the waterfall the strip shows again; the card hides in the month view (dates kept) and shows in the waterfall',
      notice().shown && cardInMonth === 'none' && getComputedStyle(card).display !== 'none' && card.offsetHeight > 0 &&
      keptInMonth.s === '2026-09-02' && keptInMonth.e === '2027-01-20',
      { cardInMonth: cardInMonth, cardInSheet: getComputedStyle(card).display, kept: keptInMonth });

    // ---- R7: Single Column Mode ----------------------------------------------------------------------------
    $('one-col-btn').click(); await T.sleep(1200); await settle();
    var oc = grid();
    T.set('cal-range-start', ''); await T.sleep(400); await settle();
    var ocEnd = grid();
    $('one-col-btn').click(); await T.sleep(1200); await settle();
    kase('R7', 'Single Column Mode: the range applies there too, and a blank start keeps that layout\'s first working week (3/2/26)',
      oc.years.length === 1 && JSON.stringify(oc.isos) === JSON.stringify(expectIsos) &&
      ocEnd.years.length === 1 && ocEnd.firstIso === '2026-03-02' && ocEnd.lastIso === '2027-01-18',
      { ranged: { years: oc.years, first: oc.firstIso, last: oc.lastIso, n: oc.count }, endOnly: { first: ocEnd.firstIso, last: ocEnd.lastIso } });
    T.set('cal-range-start', '2026-09-02'); await T.sleep(400); await settle();

    // ---- R8: the shift tools move it like an unlocked hiatus ----------------------------------------------
    await openPop('pop-shift-btn');
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await T.sleep(900); await settle();
    var afterAll = { s: val('cal-range-start'), e: val('cal-range-end'), first: grid().first };
    await undo(1);
    var afterUndo = { s: val('cal-range-start'), e: val('cal-range-end') };
    await openPop('pop-ripple-btn');
    T.set('tool-ripple-phase', 'post'); T.set('tool-ripple-weeks', '2');
    $('tool-ripple-later').click(); await T.sleep(900); await settle();
    var afterFrom = { s: val('cal-range-start'), e: val('cal-range-end') };
    await undo(1); closePops(); await T.sleep(200);
    var afterUndo2 = { s: val('cal-range-start'), e: val('cal-range-end') };
    kase('R8', 'Shift All moves both dates a week; Shift From Post moves only the end (after Post\'s start); undo puts each back',
      afterAll.s === '2026-09-09' && afterAll.e === '2027-01-27' && afterAll.first === '9/7/26' &&
      afterUndo.s === '2026-09-02' && afterUndo.e === '2027-01-20' &&
      afterFrom.s === '2026-09-02' && afterFrom.e === '2027-02-03' &&
      afterUndo2.s === '2026-09-02' && afterUndo2.e === '2027-01-20',
      { shiftAll: afterAll, undo: afterUndo, shiftFrom: afterFrom, undo2: afterUndo2 });

    // ---- R9-R11: dates that cannot make a range ------------------------------------------------------------
    await setRange('2027-01-20', '2026-09-02');
    var gBack = grid();
    kase('R9', 'an end before the start rings the end and leaves the range out: full years, no strip',
      eEl.classList.contains('is-invalid') && !sEl.classList.contains('is-invalid') && gBack.first === '1/5/26' &&
      JSON.stringify(gBack.isos) === JSON.stringify(full.isos) && !notice().shown,
      { endRinged: eEl.classList.contains('is-invalid'), first: gBack.first, rows: gBack.count });
    await setRange('2028-03-06', '');
    var gOut = grid();
    await view('month');
    var monthStillDraws = !!document.querySelector('#table-wrap .mv-daygrid');
    await view('sheet');
    kase('R10', 'a start after the calendar\'s last week leaves no row: the waterfall says why and rings it; the month view still draws',
      /date range/i.test(gOut.empty) && gOut.count === 0 && sEl.classList.contains('is-invalid') && monthStillDraws,
      { empty: gOut.empty, ringed: sEl.classList.contains('is-invalid'), month: monthStillDraws });
    await setRange('', '2045-06-05');
    var hint = (($('span-hint') || {}).textContent || '').trim();
    kase('R11', 'an end years away makes the calendar too long: the span hint names the range\'s end and rings it',
      /calendar range/i.test(hint) && /end date/.test(hint) && eEl.classList.contains('is-invalid'),
      { hint: hint, ringed: eEl.classList.contains('is-invalid') });

    // ---- R12: saved in the file, restored unconditionally -------------------------------------------------
    await setRange('2026-09-02', '2027-01-20');
    var saved = await save(), snap = JSON.parse(saved), byId = (snap.fields && snap.fields.byId) || {};
    var ok12a = byId['cal-range-start'] && byId['cal-range-start'].value === '2026-09-02' &&
                byId['cal-range-end'] && byId['cal-range-end'].value === '2027-01-20';
    var older = JSON.parse(saved);
    delete older.fields.byId['cal-range-start']; delete older.fields.byId['cal-range-end'];
    await load(JSON.stringify(older));
    var afterOld = { s: val('cal-range-start'), e: val('cal-range-end'), first: grid().first, notice: notice().shown };
    await load(saved);
    var afterSaved = { s: val('cal-range-start'), e: val('cal-range-end'), first: grid().first };
    kase('R12', 'Save writes the two ids; a file without them opens with NO range (the M-5 trap), and the saved file brings it back',
      !!ok12a && afterOld.s === '' && afterOld.e === '' && afterOld.first === '1/5/26' && !afterOld.notice &&
      afterSaved.s === '2026-09-02' && afterSaved.e === '2027-01-20' && afterSaved.first === '8/31/26',
      { saved: { s: byId['cal-range-start'], e: byId['cal-range-end'] }, olderFile: afterOld, savedFile: afterSaved });

    // ---- R13: a shareable copy does not ship the strip up ----------------------------------------------------
    var cap = T.captureDownload();
    $('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable copy', 200, 100);
    var html = await cap.stop().text();
    var tag = (html.match(/<div id="calrange-notice"[^>]*>/) || [''])[0];
    kase('R13', 'a shareable copy made while the strip is up carries it hidden (its own engine raises it again)',
      notice().shown && /\shidden(=""|\s|>)/.test(tag), { tag: tag });

    // ---- R14: New clears it ------------------------------------------------------------------------------------
    $('new-file-btn').click();
    for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
    await T.sleep(1200);
    kase('R14', 'New clears both dates', val('cal-range-start') === '' && val('cal-range-end') === '' && !notice().shown,
      { s: val('cal-range-start'), e: val('cal-range-end') });

    out.health = T.appHealth();
    var errs = (out.health && out.health.errors) || [];
    kase('H0', 'no console errors', errs.length === 0, { errors: errs.slice(0, 3) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'the leg ran to the end: ' + String(e && e.message || e).slice(0, 80), false);
  }
  T.done(out);
})(); });
