// notewrap -- batch 3, step 3.1 (FIX-PLAN §5; audit M-8): the waterfall PDF word-wraps a cell's text
// the way the screen and Excel do. Owner scope (29 Sep 2026): notes AND both hiatus bands, all-phase
// and per-phase. Phase labels keep clipping by design. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh notewrap 150
//
// buildWaterfallPdf's drawLines split only on "\n" and drew each piece on ONE centred line, so a long
// note ran off both ends of its cell and the clip cut its first and last words, while the screen and
// Excel wrapped it. The fix breaks lines with the same greedy rule and measure as wrapLineCount
// (measureTextPx at the 11pt basis), so the PDF draws exactly the lines cellTextFit counted --
// the count the screen publishes as data-notelines -- top-aligned, as the screen does when it wraps.
//
// The calendar is the reference one (T.buildFixture()) plus, all through the real UI:
//   A  a long note in a default 20px row      -> floored and over budget: wraps, clipped by the row
//   B  a long note in a row dragged to 80px   -> wraps within the row's 5-line budget
//   C  a long all-phase hiatus label, 80px row (the 2-week hiatus from 8/24/26)
//   D  a long per-phase hiatus label (Post, one week from 12/7/26)
// Each uses its own vocabulary (alphaN, bravoN, ...) so its text runs can be picked out of the PDF.
//
// Per target, from the PDF's inflated content stream:
//   L  the number of text runs == the screen's data-notelines for that cell (and > 1)
//   F  every run fits inside its cell's fill rect -- nothing runs off either end to be clipped
//   W  the runs, in order, carry every word of the text in order
// and T (B and C): top-aligned -- the first baseline is where baselineIn puts it for a block starting
// at the cell top, not where a centred block's would be (measured against the same row's date).
//
// It also saves the calendar through the real Save as out.mintText (tests/fixtures/notewrap.sptcal,
// the waterfall-PDF A/B input) and returns the PDF as out.pdfB64.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'notewrap', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function words(stem, n) { var a = []; for (var i = 1; i <= n; i++) a.push(stem + i); return a.join(' '); }
  // B stays SHORT on purpose: two or three lines at full size in the 55-character notes column. A longer B would shrink and hit the
  // capacity mismatch MANTINE-SEAM §5.8 records (an 80 px row budgets 5 lines on screen, the PDF holds
  // about 4), whose last line clips by design -- which is not what the top-alignment check is about.
  var TEXT = { A: words('alpha', 30), B: words('bravo', 18), C: words('charlie', 22), D: words('delta', 14) };
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  async function dragRow(r, dy) {
    var h = document.querySelector('#table-wrap .grid-resize.is-row[data-row="' + r + '"]');
    if (!h) throw new Error('no row handle ' + r);
    var rc = h.getBoundingClientRect(), x = rc.left + rc.width / 2, y = rc.top + rc.height / 2;
    h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, button: 0, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y + dy, pointerId: 7, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y + dy, pointerId: 7, isPrimary: true }));
    await settle('the grid after the row drag');
  }
  async function editCell(sel, text) {
    var td = document.querySelector(sel);
    if (!td) throw new Error('no cell ' + sel);
    td.click();
    await T.until(function () { return !!document.querySelector('.note-editor textarea'); }, 'the editor for ' + sel, 50, 100);
    var ta = document.querySelector('.note-editor textarea');
    ta.value = text;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await T.until(function () { return !document.querySelector('.note-editor textarea'); }, 'the editor to close', 50, 100);
    await settle('the grid after the edit');
  }
  function rowIndexOf(weekIso) {
    var td = document.querySelector('#table-wrap td.sheet-date[data-week="' + weekIso + '"], #table-wrap [data-week="' + weekIso + '"]');
    var tr = td && td.closest('tr');
    return tr ? Array.prototype.indexOf.call(tr.parentElement.children, tr) : -1;
  }
  // Text runs and fill rects from the PDF's content streams, in draw order.
  async function pdfContent(blob) {
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
    var runs = [], rects = [], mm;
    var reRun = /BT \/(F\d+) ([\d.]+) Tf [\d. ]+ rg 1 0 [-\d.]+ 1 ([-\d.]+) ([-\d.]+) Tm \(((?:\\.|[^\\)])*)\) Tj ET/g;
    while ((mm = reRun.exec(txt))) runs.push({ font: mm[1], size: +mm[2], x: +mm[3], y: +mm[4], text: mm[5].replace(/\\(.)/g, function (all, ch) { return ch; }) });
    var reRect = /([\d.]+) ([\d.]+) ([\d.]+) rg ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) re f/g;
    while ((mm = reRect.exec(txt))) rects.push({ rgb: [+mm[1], +mm[2], +mm[3]], x: +mm[4], y: +mm[5], w: +mm[6], h: +mm[7] });
    return { runs: runs, rects: rects };
  }
  var mctx = document.createElement('canvas').getContext('2d');
  function runWidth(r) { mctx.font = r.size + 'px Carlito, Calibri, sans-serif'; return mctx.measureText(r.text).width; }
  function judge(key, content, screenLines, topCheck) {
    var stem = { A: 'alpha', B: 'bravo', C: 'charlie', D: 'delta' }[key];
    var mine = content.runs.filter(function (r) { return r.text.indexOf(stem) >= 0; });
    var res = { runs: mine.length, screenLines: screenLines };
    // the fill rect each run sits in: the rect whose box contains the run's baseline and centre
    var fits = mine.map(function (r) {
      var w = runWidth(r), cx = r.x + w / 2;
      var rect = content.rects.filter(function (q) {
        return cx >= q.x && cx <= q.x + q.w && r.y >= q.y && r.y <= q.y + q.h && q.w < 700;
      }).sort(function (a, b) { return a.w * a.h - b.w * b.h; })[0];
      return rect ? { ok: r.x >= rect.x - 0.6 && r.x + w <= rect.x + rect.w + 0.6, rect: rect, x0: r.x, x1: r.x + w } : { ok: false };
    });
    res.overflow = fits.filter(function (f) { return !f.ok; }).length;
    var drawn = mine.map(function (r) { return r.text.trim(); }).join(' ').split(/\s+/).filter(Boolean).join(' ');
    res.wordsInOrder = drawn === TEXT[key];
    // TOP vs CENTRED, from the PDF's own arithmetic. baselineIn puts a line's baseline k*size below the
    // top of its line box (k is a property of the font's ascent/descent), and a block's top is the cell
    // top when top-aligned, or (h - n*lh)/2 lower when centred. The date in the SAME row is always one
    // centred line, so it yields k with no font tables needed; the note is then held to both predictions.
    if (topCheck && mine.length && fits[0] && fits[0].rect) {
      var rc = fits[0].rect, top = rc.y + rc.h;
      var d = content.runs.filter(function (r) { return r.text === topCheck && r.y >= rc.y && r.y <= top; })[0];
      if (d) {
        var k = ((top - d.y) - (rc.h - 1.35 * d.size) / 2) / d.size;
        var sz = mine[0].size, lh = 1.35 * sz;
        res.gapTop = +(top - mine[0].y).toFixed(2);
        res.expectTop = +(k * sz).toFixed(2);
        res.expectCentred = +(k * sz + Math.max(0, (rc.h - mine.length * lh) / 2)).toFixed(2);
      } else res.noDateRun = topCheck;
    }
    return res;
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    T.addHiatus('2026-08-24', 2);
    var en = document.getElementById('phiatus-en-post');
    if (en && !en.checked) en.click();
    T.set('phiatus-start-post', '2026-12-07');
    T.set('phiatus-weeks-post', '1');
    await T.until(function () { return !!document.querySelector('#table-wrap td.sheet-hiatus-cell.sheet-phase-cell[data-week="2026-12-07"]'); }, 'the Post hiatus band', 200, 100);
    await settle('the calendar to settle');

    // A: a default row. B and C: rows dragged from 20 to 80 px (the handle sits on the row's bottom edge).
    await dragRow(rowIndexOf('2026-09-14'), 60);
    await dragRow(rowIndexOf('2026-08-24'), 60);
    await T.typeUserNote('2026-10-05', TEXT.A);
    await T.typeUserNote('2026-09-14', TEXT.B);
    await settle('the notes');
    await editCell('#table-wrap td.sheet-hiatus-cell:not(.sheet-phase-cell)[data-week="2026-08-24"]', TEXT.C);
    await editCell('#table-wrap td.sheet-hiatus-cell.sheet-phase-cell[data-week="2026-12-07"]', TEXT.D);

    function lines(sel) { var td = document.querySelector(sel); return td ? +td.getAttribute('data-notelines') : null; }
    var screen = {
      A: lines('#table-wrap td.sheet-note-cell[data-week="2026-10-05"]'),
      B: lines('#table-wrap td.sheet-note-cell[data-week="2026-09-14"]'),
      C: lines('#table-wrap td.sheet-hiatus-cell:not(.sheet-phase-cell)[data-week="2026-08-24"]'),
      D: lines('#table-wrap td.sheet-hiatus-cell.sheet-phase-cell[data-week="2026-12-07"]')
    };
    out.screen = screen;
    out.rowPx = { r0914: (document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-09-14"]') || { closest: function () { return null; } }).closest('tr').getBoundingClientRect().height };
    kase('S0', 'setup: all four cells wrap on screen (data-notelines > 1), and the 9/14 row is dragged taller',
         screen.A > 1 && screen.B > 1 && screen.C > 1 && screen.D > 1 && out.rowPx.r0914 > 70, { screen: screen, rowPx: out.rowPx });

    var blob = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    out.pdfB64 = T.b64(await blob.arrayBuffer());
    var content = await pdfContent(blob);
    ['A', 'B', 'C', 'D'].forEach(function (k) {
      var j = judge(k, content, screen[k], { B: '9/14/26', C: '8/24/26' }[k] || null);
      var name = { A: 'a long note, default row', B: 'a long note, 80 px row', C: 'a long all-phase hiatus label, 80 px row', D: 'a long per-phase hiatus label' }[k];
      kase(k + '-L', name + ': the PDF draws it on the SAME number of lines the screen counts (data-notelines)',
           j.runs > 1 && j.runs === screen[k], j);
      kase(k + '-F', name + ': every line fits inside its cell -- nothing runs off either end', j.runs > 0 && j.overflow === 0, { overflow: j.overflow, runs: j.runs });
      kase(k + '-W', name + ': the lines carry every word, in order', j.wordsInOrder, {});
      if (k === 'B' || k === 'C') kase(k + '-T', name + ': TOP-aligned, as the screen is when it wraps',
                          j.gapTop !== undefined && Math.abs(j.gapTop - j.expectTop) < 0.3 && Math.abs(j.gapTop - j.expectCentred) > 1,
                          { gapTop: j.gapTop, expectTop: j.expectTop, expectCentred: j.expectCentred, noDateRun: j.noDateRun });
    });

    // Mint through the real Save.
    var written = [];
    var h = { name: 'notewrap.sptcal', kind: 'file',
      queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
      isSameEntry: async function (o) { return o === h; },
      getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'notewrap.sptcal', { lastModified: 1 }); },
      createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
    window.showSaveFilePicker = async function () { return h; };
    document.getElementById('save-file-btn').click();
    await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
    out.mintText = written[0];

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'notewrap threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
