// wfnoteellipsis -- a waterfall note or hiatus band cut off by its row ends in "…" (owner, 21 Nov 2026: "When you
// increase font size of a note, don't just silently cut off the text, add an elipses"; pickers "Screen + PDF" and
// "Notes and hiatus bands"). Frozen edit EL1: cellClampLines / cellClampCss on screen (renderSpreadsheetView and
// applyCellFitLive), wfPdfEllipsize in buildWaterfallPdf. Excel is unchanged on purpose.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=noteellipsis ./run.sh wfnoteellipsis 300
//
// tests/fixtures/noteellipsis.sptcal (synthetic, wfkeys plus three cells):
//   2026-08-17  a long note at 14 px in a 20 px row: one line shows, so it is clamped to 1 and ends in "…"
//   2026-08-24  "One\nTwo\nThree" at the automatic size: the shrink floor shows two of its three lines, clamped to 2
//   2026-11-23  the all-phase hiatus band, a long name at 14 px: clamped to 1
//   2026-08-10  "Cast fittings\nNetwork call" (the control): its second line is mostly visible, so it is NOT clamped
//
//   S1  the sized note's body is clamped to 1 line (-webkit-box, line-clamp 1) and its text runs past it
//   S2  the three-line automatic note is clamped to 2 lines
//   S3  the sized hiatus band is clamped to 1 line
//   S4  nothing else is clamped: the control note and every other cell's body carry no line-clamp
//   S5  the clamped note is drawn centred, as before (text-align centre, the body as wide as its cell)
//   P1  the waterfall PDF: the sized note draws ONE line, ending in "…", and none of its later words
//   P2  the PDF: the three-line note draws "One" and "Two…", never "Three"
//   P3  the PDF: the band draws one line ending in "…"
//   P4  the PDF: the control note draws both its lines, with no "…"
//   X1  the workbook keeps every cut text whole (Excel is not changed)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'wfnoteellipsis', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function noteBody(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"] .cell-body'); }
  function bandBody(wk) { return q('#table-wrap td.sheet-hiatus-cell[data-week="' + wk + '"] .cell-body'); }
  function clampOf(el) {
    if (!el) return null;
    var cs = getComputedStyle(el);
    return { display: cs.display, clamp: cs.webkitLineClamp, overflows: el.scrollHeight > el.clientHeight + 1,
             h: el.clientHeight, sh: el.scrollHeight };
  }

  // ---- the waterfall PDF's page content, its date stamp masked --------------------------------------------------
  async function inflate(u8) {
    var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    var r = ds.readable.getReader(), parts = [], n = 0;
    for (;;) { var x = await r.read(); if (x.done) break; parts.push(x.value); n += x.value.length; }
    var o = new Uint8Array(n), k = 0; parts.forEach(function (p) { o.set(p, k); k += p.length; });
    return new TextDecoder('latin1').decode(o);
  }
  async function wfPdf(label) {
    await T.sleep(700);
    var blob = await T.captureExport('export-wf-pdf-btn', label);
    var u8 = new Uint8Array(await blob.arrayBuffer()), s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var L = +((s.match(/4 0 obj\s*<< \/Length (\d+)/) || [])[1] || 0);
    var a = s.indexOf('stream'), st = a + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
    return inflate(u8.subarray(st, st + L));
  }
  // Every text run the page draws, decoded from pdfEscape (\205 is WinAnsi's "…").
  function runs(content) {
    var re = /Tm \(((?:\\.|[^\\)])*)\) Tj/g, m, o = [];
    while ((m = re.exec(content))) {
      o.push(m[1].replace(/\\([0-7]{3})/g, function (_, oct) { var c = parseInt(oct, 8); return c === 0x85 ? '…' : String.fromCharCode(c); })
                 .replace(/\\(.)/g, function (_, c) { return c; }));
    }
    return o;
  }

  var LONG = 'Network call with the studio and the whole post team about delivery';
  var BAND = 'Holiday break for the whole crew while the stages are repainted and the sets are struck';

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteBody('2026-08-17') && txt(noteBody('2026-08-17')) === LONG; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await settle();

    await step('S1', async function () {
      var c = clampOf(noteBody('2026-08-17'));
      kase('S1', 'the 14 px note in a 20 px row is clamped to one line ending in "…" (-webkit-box, line-clamp 1), and its text runs past it',
           !!c && ['-webkit-box', 'flow-root'].indexOf(c.display) !== -1 && c.clamp === '1' && c.overflows, c);
    });
    await step('S2', async function () {
      var c = clampOf(noteBody('2026-08-24'));
      kase('S2', 'the three-line automatic-size note shows two lines, the second ending in "…" (line-clamp 2)',
           !!c && ['-webkit-box', 'flow-root'].indexOf(c.display) !== -1 && c.clamp === '2', c);
    });
    await step('S3', async function () {
      var c = clampOf(bandBody('2026-11-23'));
      kase('S3', 'the 14 px hiatus band is clamped to one line ending in "…"',
           !!c && ['-webkit-box', 'flow-root'].indexOf(c.display) !== -1 && c.clamp === '1' && c.overflows, c);
    });
    await step('S4', async function () {
      var ctl = clampOf(noteBody('2026-08-10'));
      var clamped = qa('#table-wrap .cell-body').filter(function (b) { return /line-clamp/.test(b.getAttribute('style') || ''); })
        .map(function (b) { var td = b.closest('td'); return td.dataset.week + (td.dataset.pkey ? '|' + td.dataset.pkey : ''); });
      var want = ['2026-08-17', '2026-08-24', '2026-11-23', '2026-11-30'];
      var ok = ctl && ctl.display === 'block' && ctl.clamp === 'none'
        && clamped.length === want.length && want.every(function (w) { return clamped.indexOf(w) !== -1; });
      kase('S4', 'nothing else is clamped: the two-line control note (second line mostly visible) and every other cell keep their look',
           ok, { control: ctl, clamped: clamped });
    });
    await step('S5', async function () {
      var b = noteBody('2026-08-17'), td = b && b.closest('td');
      var cs = b && getComputedStyle(b), bw = b && b.getBoundingClientRect().width, tw = td && td.clientWidth;
      kase('S5', 'the clamped note is still centred and as wide as its cell (less the cell padding)',
           !!b && cs.textAlign === 'center' && Math.abs(tw - bw) <= 4, { align: cs && cs.textAlign, body: bw, cell: tw });
    });

    var content = await wfPdf('wfnoteellipsis');
    var R = runs(content);
    function has(s) { return R.indexOf(s) !== -1; }
    function startsWith(p) { return R.filter(function (r) { return r.indexOf(p) === 0; }); }
    await step('P1', async function () {
      var lines = startsWith('Network call w');
      var later = R.filter(function (r) { return /delivery|post team/.test(r); });
      kase('P1', 'the PDF draws the sized note as ONE line ending in "…", and none of its later words',
           lines.length === 1 && lines[0].slice(-1) === '\u2026' && later.length === 0, { lines: lines, later: later });
    });
    await step('P2', async function () {
      kase('P2', 'the PDF draws the three-line note as "One" and "Two…", never "Three"',
           has('One') && has('Two…') && !has('Three'), { one: has('One'), two: startsWith('Two'), three: has('Three') });
    });
    await step('P3', async function () {
      var lines = startsWith('Holiday break');
      kase('P3', 'the PDF draws the sized band as one line ending in "…"',
           lines.length >= 1 && lines.every(function (l) { return l.slice(-1) === '\u2026'; }) && !R.some(function (r) { return /sets are struck/.test(r); }),
           { lines: lines });
    });
    await step('P4', async function () {
      kase('P4', 'the PDF draws the control note\'s two lines whole, with no "…"',
           has('Cast fittings') && has('Network call'), { cast: has('Cast fittings'), net: has('Network call') });
    });

    await step('X1', async function () {
      await T.sleep(700);
      var blob = await T.captureExport('export-btn', 'wfnoteellipsis');
      var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await blob.arrayBuffer());
      var vals = [];
      wb.worksheets[0].eachRow({ includeEmpty: false }, function (row) {
        row.eachCell({ includeEmpty: false }, function (c) { if (typeof c.value === 'string') vals.push(c.value); });
      });
      var ok = vals.indexOf(LONG) !== -1 && vals.indexOf('One\nTwo\nThree') !== -1 && vals.indexOf(BAND) !== -1
        && !vals.some(function (v) { return v.indexOf('…') !== -1; });
      kase('X1', 'the workbook keeps every cut text whole, with no "…" (Excel is not changed)', ok,
           { long: vals.indexOf(LONG) !== -1, three: vals.indexOf('One\nTwo\nThree') !== -1, band: vals.indexOf(BAND) !== -1 });
    });

    var errs = T.appHealth().errors || [];
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'wfnoteellipsis threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
