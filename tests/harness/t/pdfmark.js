// pdfmark -- the SPTCal mark on every saved PDF (owner, 2 Nov 2026: "Add hidden text too"; markPdf in
// src/legacy/app.js). Its own gate.sh block, which also reads the two files back with poppler.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh pdfmark 300
//
// A PDF the app saves is the writer's bytes, untouched, and then one appended incremental update: the document's
// properties (Creator "SPTCal", Producer "SPTCal <version>") and every page redefined as itself with
// /Contents [q, <its own stream>, Q + "Made with SPTCal <version>" in text render mode 3, never painted].
//
//   W0  the waterfall PDF, through its real button: the writer's bytes end at their own %%EOF with a trailer that has
//       no /Info, and the update after them names SPTCal and this version, and redefines the one page as
//       [q, its own stream, the mark], the mark set in a font of the page's own
//   W1  the same calendar exported twice is the same file, byte for byte: the mark carries no date
//   M0  the month PDF, through its real Save dialog: the same, on every page, and the page count is unchanged
//   M1  the same calendar exported twice is the same file
//   S0  the SOURCE's markPdf, sliced, turns the writer's bytes of both files into exactly the files the BUILD saved
//       (so the minified mark is the source's), and FAILS OPEN: bytes it cannot read come back as they were, with one
//       console error, and so does a file it has already marked
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'pdfmark', cases: [], pdfs: {} }, info = {};
  out.info = info;
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function byId(id) { return document.getElementById(id); }
  function sameBytes(a, b) { if (!a || !b || a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function latin(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label || 'the grid to settle', 200, 100);
  }
  async function view(mode) {
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!document.querySelector('#table-wrap .mv-daygrid') : !!document.querySelector('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await settle('the ' + mode + ' view');
  }
  async function waterfallPdf() {
    await T.sleep(600);
    return new Uint8Array(await (await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob')).arrayBuffer());
  }
  async function monthPdf() {
    T.monthPrintPath(false);
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    return rec.files.filter(function (f) { return f.closed; })[0].bytes;
  }
  // What one saved file says, against what the mark must say.
  function verdict(u8, version) {
    var u = T.pdfUnmark(u8), text = 'Made with SPTCal ' + version, r = { bytes: u8.length };
    if (!u) { r.why = 'no update after the writer\'s bytes'; return r; }
    var w = latin(u.writer), wtr = /trailer\s*<<([^]*?)>>\s*startxref\s+(\d+)\s+%%EOF\n(?![^])/.exec(w.slice(-200));
    r.writerBytes = u.writer.length; r.markBytes = u.mark.bytes; r.creator = u.mark.creator; r.producer = u.mark.producer;
    r.writerTrailer = wtr ? wtr[1].trim() : null; r.pages = u.mark.pages.length; r.writerPages = T.pdfPages(u.writer);
    r.writerOk = !!wtr && +wtr[2] === u.mark.prev && !/\/(Info|Prev)\b/.test(wtr[1]);
    r.propsOk = u.mark.creator === 'SPTCal' && u.mark.producer === 'SPTCal ' + version;
    r.pageFaults = u.mark.pages.map(function (p) {
      var own = new RegExp('(?:^|\\n)' + p.n + ' 0 obj\\n<< /Type /Page [^]*?/Contents (\\d+) 0 R').exec(w);
      var res = /\/Resources (\d+) 0 R/.exec(p.dict), rd = p.dict;
      if (res) { var rm = new RegExp('(?:^|\\n)' + res[1] + ' 0 obj\\n(<<[^]*?)\\nendobj').exec(w); rd = rm ? rm[1] : ''; }
      var font = (/\/Font\s*<<\s*\/([^\s\/<>\[\]()]+)\s+\d+\s+0\s+R/.exec(rd) || [])[1];
      var want = '\nQ\nq BT /' + font + ' 2 Tf 3 Tr 2 2 Td (' + text + ') Tj ET Q\n';
      if (!p.contents || !own || p.contents[1] !== +own[1]) return 'page ' + p.n + ': contents ' + JSON.stringify(p.contents);
      if (!font || p.pre !== 'q\n' || p.post !== want) return 'page ' + p.n + ': ' + JSON.stringify([p.pre, p.post]);
      return null;
    }).filter(Boolean);
    r.ok = r.writerOk && r.propsOk && r.pages > 0 && r.pages === r.writerPages && T.pdfPages(u8) === r.writerPages && !r.pageFaults.length;
    r.writer = u.writer;
    return r;
  }
  function shown(r) { var o = {}; Object.keys(r).forEach(function (k) { if (k !== 'writer') o[k] = r[k]; }); return o; }

  try {
    var version = (await (await fetch('/version.json', { cache: 'no-store' })).json()).version;
    info.version = version;
    T.buildFixture();   // base's calendar: a fresh profile has no phases, so nothing to export
    await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 1; }, 'the grid to render', 150, 100);
    await settle('the app');

    // ---- the waterfall PDF ----------------------------------------------------------------------------------------
    await view('sheet');
    var wf = await waterfallPdf(), wf2 = await waterfallPdf(), wv = verdict(wf, version);
    out.pdfs.wf = T.b64(wf);
    kase('W0', 'the waterfall PDF is the writer\'s bytes, then the mark: SPTCal ' + version + ' in its properties, and its one page as [q, its own stream, the unpainted text]',
      wv.ok === true && wv.pages === 1, shown(wv));
    kase('W1', 'the waterfall PDF exported twice is the same file, byte for byte', sameBytes(wf, wf2), { a: wf.length, b: wf2.length });

    // ---- the month PDF --------------------------------------------------------------------------------------------
    await view('month');
    var mv = await monthPdf(), mv2 = await monthPdf(), mvv = verdict(mv, version);
    out.pdfs.month = T.b64(mv);
    kase('M0', 'the month PDF is the writer\'s bytes, then the mark on every one of its ' + mvv.writerPages + ' pages, and the page count is unchanged',
      mvv.ok === true && mvv.pages > 1, shown(mvv));
    kase('M1', 'the month PDF exported twice is the same file, byte for byte', sameBytes(mv, mv2), { a: mv.length, b: mv2.length });

    // ---- the source's mark, sliced ---------------------------------------------------------------------------------
    var src = await (await fetch('/src/legacy/app.js', { cache: 'no-store' })).text();
    var a = src.indexOf('  function markPdf(bytes){'), b = src.indexOf('\n  // The Save dialog, or a download where there is none.');
    if (a < 0 || b < a || src.indexOf('  function markPdf(bytes){', a + 1) >= 0) throw new Error('could not locate markPdf in src/legacy/app.js: re-anchor this leg');
    var logged = [];
    var fakeConsole = { error: function (m) { logged.push(String(m)); } };
    var esc = function (s) { return String(s).replace(/[()\\]/g, function (c) { return '\\' + c; }); };   // the mark is plain ASCII
    var markPdf = new Function('APP_VERSION', 'pdfEscape', 'console', "'use strict';\n" + src.slice(a, b) + '\nreturn markPdf;')(version, esc, fakeConsole);
    var wfSame = !!wv.writer && sameBytes(markPdf(wv.writer), wf), mvSame = !!mvv.writer && sameBytes(markPdf(mvv.writer), mv);
    var junk = new TextEncoder().encode('not a PDF at all'), back = markPdf(junk), again = markPdf(wf);
    kase('S0', 'the source\'s markPdf turns both writers\' bytes into exactly the files the build saved, and fails open: unreadable bytes and an already-marked file come back unchanged, each with one console error',
      wfSame && mvSame && back === junk && again === wf && logged.length === 2 &&
      logged.every(function (m) { return /^The PDF was saved without its SPTCal mark: /.test(m); }),
      { waterfall: wfSame, month: mvSame, junkBack: back === junk, againBack: again === wf, logged: logged });
  } catch (e) {
    out.EX = String(e && e.stack || e);
  }
  var health = T.appHealth ? T.appHealth() : null, errs = (health && health.errors) || [];
  kase('E0', 'no console errors', !!health && errs.length === 0, { errors: errs.slice(0, 5) });
  T.done(out);
})(); });
