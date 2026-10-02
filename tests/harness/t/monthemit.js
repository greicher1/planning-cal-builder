// monthemit -- the month-PDF writer's EMITTER and SERIALIZER (MONTH-PDF-WRITER-PLAN.md §8 step 3). Every box and
// baseline it draws is held to CHROME'S OWN print layout of the same document, and the bytes it writes are held
// to what a PDF of this calendar must be.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh monthemit 240                          tier 1 + the header variants
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture> ./run.sh monthemit 240  one calendar, captured fresh
//
// HOW IT SEES THE CODE (owner ruling, 1 Oct 2026: "slice it, no hook" extends to the emitter). The writer --
// src/legacy/app.js from `const MVL_GEOMETRY` to the end of buildMonthPdf, the model and the emitter both -- is
// sliced out VERBATIM with the frozen primitives it calls (ttfRead..pdfDeflate, DAY_MS, isoOf) and run in this
// page. Nothing in the product calls the writer yet and the minifier drops it from the build, so step 5 owes the
// check that the BUILT app writes the same bytes as this slice does for the same calendar.
//
// WHERE THE ROW HEIGHTS COME FROM (owner ruling, 1 Oct 2026: "Chrome's, measured"). The emitter draws each week at
// the height it is handed. Here that is the height CHROME'S print layout gives the same document: the document is
// laid out off-screen at the page's own content size, with the app's @media print rules transplanted into screen
// media (a page cannot switch itself to print), and each .mv-week measured. A month the print path SHRINKS
// (scaleY) is laid out at its natural size instead, its transform removed: the writer then draws it full size and
// it runs off its sheet. That month is step 4's (ruling 3), and only it is exempt from the margins check.
//
// THE TODAY STAMP IS PINNED (owner ruling, 1 Oct 2026). Every document's stamp is rewritten as one fixed, real-
// looking date before anything reads it -- tier 1's DATESTAMP, or a fresh capture's own today in both dotted
// forms -- so every byte comparison is exact. DATESTAMP itself is 128 px wide against a real date's 65-83 px, and
// the title is centred in what the date leaves, so it would lay the title out in a box no real day produces.
//
// THE HEADER VARIANTS. Tier 1 prints no header size, colour, alignment or highlight and no wrapping title, so five
// one-page documents are made here from reference's first page, with exactly the style strings headerFormatCss
// writes: a two-line title; every line highlighted; sizes, colours, alignments, bold off and italic; and the
// widest and the narrowest real stamps, which move the title. A sixth, v-cut, is made the same way for the bars,
// since tier 1 cuts no label: a one-day pill with a long label, a long grey tag that has to be cut, and a long
// hiatus band, each in the lane first-fit gives it and in a week with no note, so its lanes stay the document's.
//
// CASES (each judged over every document)
//   S0  the writer and the primitives it calls are sliced verbatim out of src/legacy/app.js and evaluate
//   F0  only the month export (exportMonthPdfDirect, since step 5) calls the writer, and only through its public
//       entry points; nothing else in app.js uses a name the writer defines
//   C0  CONTROL: the transplanted print layout is the print path's own -- every fill month's weeks fill the body to
//       the page's foot, every week is at least its document min-height, and the page is laid out at W
//   H0  the header: every line's box, highlight, text anchor and baseline where Chrome puts them
//   M0  the month bar and the weekday row: boxes, the label's and every weekday's anchor and baseline
//   D0  the frame, every week's top, every day cell's box and line, every day number's start and baseline, the ½
//   B0  every bar's box -- its lane, span and height -- in every week whose notes print as the document's
//   T0  every bar's text: a pill's label and grey tag, a band's centred label, a note's lines, at start and baseline
//   K0  what each thing is painted WITH: every fill, border, hatch, half-day shade, ink, font size, weight, letter-
//       spacing, case, italic and strike-through is Chrome's computed style for the same element, colours mixed
//       at Chrome's opacity over the cell beneath
//   X0  the file's structure: header, xref offsets, startxref, one /Page per month at 792 x 612, /Count, and a
//       trailer of /Size and /Root alone -- no /Info, no /ID
//   X1  the fonts: each /FontFile2 is the font-inter-<w> block's deflated bytes, byte for byte; /Length1, /BaseFont;
//       exactly the weights some page sets text in
//   X2  /Widths: every code 32-255 is the advance of the glyph a viewer draws, exact to 3 decimals (owner ruling,
//       1 Oct 2026), .notdef's for the ten characters the subset lacks
//   X3  the content: every number finite; every text run, measured with the file's OWN /Widths, the width the model
//       measured; every run inside its box; everything painted inside the margins
//   X4  the text: the content streams carry exactly the display list's strings, in order, and the display list
//       carries the model: every day number, weekday, label, header line, bar label (a cut one as a prefix of it)
//       and note line
//   R0  determinism: the same layout gives the same bytes twice, and through JSON
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info, pdfs: {}};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var fromState = /[?&]state=/.test(location.search);
  var BASE = '/tests/baselines/2026-09-22-monthprint/';
  var TIER1 = [['reference', 'reference'], ['dayoverrides'], ['mvheader'], ['mvheaderlegacy'],
               ['blocks'], ['dayoverrides-onhalf'], ['month-lanecap'], ['hiatus-blanklabel']];
  var STAMP = '9.22.26';
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function near(a, b, tol){ return typeof a === 'number' && typeof b === 'number' && isFinite(a) && isFinite(b) && Math.abs(a - b) <= tol; }
  try {
    await T.appReady();

    // ---- S0: the slice ----------------------------------------------------------------------------------
    // ?src=<path> slices from another copy of the source (HARNESS_QUERY=src=...). It exists for the MUTANT runs, so a
    // mutant lives in a throwaway file and src/legacy/app.js is never edited: an interrupted run once left one in place.
    var srcPath = decodeURIComponent((location.search.match(/[?&]src=([^&]+)/) || [])[1] || '/src/legacy/app.js');
    if(!/^\/[\w.\/-]+\.js$/.test(srcPath) || srcPath.indexOf('..') >= 0) throw new Error('a src= that is not a plain path: ' + srcPath);
    info.src = srcPath;
    var src = await (await fetch(srcPath, {cache: 'no-store'})).text();
    function slice(startMark, endMark, what){
      var from = src.indexOf(startMark), to = from < 0 ? -1 : src.indexOf(endMark, from);
      if(from < 0 || to < 0) throw new Error('could not locate ' + what + ' in src/legacy/app.js: re-anchor this leg');
      if(src.indexOf(startMark, from + 1) >= 0) throw new Error(what + "'s anchor is not unique: re-anchor this leg");
      return src.slice(from, to + endMark.length);
    }
    var dayMsSrc = slice('const DAY_MS = ', ';', 'DAY_MS');
    var isoSrc = slice('function isoOf(d){', '}', 'isoOf');
    var primSrc = slice('function ttfRead(bytes){', 'pipeThrough(cs)).arrayBuffer());\n  }', 'the frozen primitives (ttfRead..pdfDeflate)');
    var writerSrc = slice('  const MVL_GEOMETRY = (function(){',
      "return { tag: 'F' + w, ttf: fonts[w].font, raw: fonts[w].bytes, deflated: fonts[w].deflated };\n    }));\n  }",
      'the writer (MVL_GEOMETRY..buildMonthPdf)');
    var F = new Function("'use strict';\n" + dayMsSrc + '\n' + isoSrc + '\n' + primSrc + '\n' + writerSrc +
      '\nreturn {G: MVL_GEOMETRY, P: MVL_PAINT, loadInterPdfFont: loadInterPdfFont, mvlMonthLayout: mvlMonthLayout,' +
      ' mvlTextWidth: mvlTextWidth, mvlPaintMonth: mvlPaintMonth, mvlLaneTracks: mvlLaneTracks, mvlBarHeight: mvlBarHeight,' +
      ' mvlPageOps: mvlPageOps, buildMonthPdf: buildMonthPdf, mvlLineMetrics: mvlLineMetrics, mvlMeasure: mvlMeasure,' +
      ' mvlFlat: mvlFlat, mvlHeader: mvlHeader, ttfGlyph: ttfGlyph, ttfAdvance: ttfAdvance, pdfEscape: pdfEscape, pdfNum: pdfNum,' +
      ' PDF_WINANSI_HI: PDF_WINANSI_HI};')();
    add('S0', 'the writer (model + emitter) and the frozen primitives it calls are sliced verbatim out of src/legacy/app.js and evaluate',
        typeof F.buildMonthPdf === 'function' && typeof F.mvlPaintMonth === 'function',
        {writerChars: writerSrc.length, primitiveChars: primSrc.length}, 'the slice evaluates');

    // ---- F0: only the month export calls the writer, and only through its entry points (step 5) ------------------
    // Since MONTH-PDF-WRITER-PLAN.md step 5 the month view's Export PDF runs the writer, through ONE function after it in
    // app.js, exportMonthPdfDirect. So every top-level name the writer declares is counted in app.js outside both the
    // writer and that function, comment lines skipped: none may appear. Inside the function exactly the writer's
    // public surface may: the fonts' loader and weights, the model, the fit, the printable-characters walk and the
    // emitter. And each entry point appears once more than before: loadInterPdfFont three times (its declaration,
    // buildMonthPdf's call, the export's), the others twice (declared, and called by the export).
    var code = function (s) { return s.split('\n').filter(function (l) { return !/^\s*\/\//.test(l); }).join('\n'); };
    var exportSrc = slice('  async function exportMonthPdfDirect(){', "      chrome.exportBtn({ busy: false, disabled: false });\n    }\n  }", 'exportMonthPdfDirect');
    var at = src.indexOf(writerSrc), rest = src.slice(0, at) + src.slice(at + writerSrc.length);
    var eAt = rest.indexOf(exportSrc), outside = code(rest.slice(0, eAt) + rest.slice(eAt + exportSrc.length));
    var NAMES = [], dm, dre = /^  (?:async )?(?:function|const|let) (\w+)/gm;
    while((dm = dre.exec(writerSrc))) NAMES.push(dm[1]);
    var has = function (n, s) { return new RegExp('\\b' + n + '\\b').test(s); };
    var usedOut = NAMES.filter(function (n) { return has(n, outside); });
    var PUBLIC = ['MVL_FONT_WEIGHTS', 'buildMonthLayout', 'buildMonthPdf', 'fitMonthLayout', 'loadInterPdfFont', 'mvlUnprintable'];
    var usedByExport = NAMES.filter(function (n) { return has(n, code(exportSrc)); }).sort();
    var counts = ['loadInterPdfFont(', 'buildMonthLayout(', 'buildMonthPdf(', 'fitMonthLayout(', 'mvlUnprintable('].map(function (s) { return code(src).split(s).length - 1; });
    add('F0', 'only the month export (exportMonthPdfDirect) calls the writer, and only through its public entry points',
        usedOut.length === 0 && NAMES.length > 30 && same(usedByExport, PUBLIC) && same(counts, [3, 2, 2, 2, 2]),
        {usedOutside: usedOut, usedByExport: usedByExport, namesDeclared: NAMES.length, entryPointOccurrences: counts},
        {usedOutside: [], usedByExport: PUBLIC, entryPointOccurrences: [3, 2, 2, 2, 2]});

    var G = F.G, P = F.P, fonts = {};
    for(var fw of ['400', '500', '600', '700']) fonts[fw] = await F.loadInterPdfFont(fw);
    var noteWidthOf = function (s) { return F.mvlTextWidth(fonts['500'].font, s, G.noteFontPx); };
    // Chrome's rounded ascent at a size: a text fragment's rect top is its baseline less this.
    var ascentAt = function (size) { return Math.round(fonts['400'].font.ascent * size / fonts['400'].font.unitsPerEm); };

    // ---- the documents, stamp pinned ----------------------------------------------------------------------
    var docs = [];
    if(!fromState){
      for(var di = 0; di < TIER1.length; di++){
        var r = await fetch(BASE + TIER1[di][0] + '.html', {cache: 'no-store'});
        if(!r.ok) throw new Error('no baseline ' + TIER1[di][0] + '.html');
        var raw = await r.text();
        docs.push({name: TIER1[di][1] || TIER1[di][0], html: raw.split('DATESTAMP').join(STAMP),
                   stampHits: raw.split('DATESTAMP').length - 1});
      }
      makeVariants(docs[0].html).forEach(function (v) { docs.push(v); });
    } else {
      var cap = await captureFresh();
      docs.push({name: ((location.search.match(/[?&]state=([^&]+)/) || [])[1] || 'fresh').replace(/[^\w-]/g, '_'),
                 html: cap.html, stampHits: cap.hits});
    }
    info.stampHits = docs.map(function (d) { return d.name + ':' + d.stampHits; });
    // What the determinism controls change, recorded so a control that changed nothing is visible.
    info.tz = {zone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMin: new Date().getTimezoneOffset()};
    info.window = [window.innerWidth, window.innerHeight];

    // ---- Chrome's print layout, transplanted into screen media --------------------------------------------
    var transplanted = transplantPrintRules();
    await Promise.all(['400 16px Inter', '500 10px Inter', '600 10px Inter', '700 20px Inter', 'italic 700 22px Inter']
                      .map(function (f) { return document.fonts.load(f); }));

    var bad = {C0: [], H0: [], M0: [], D0: [], B0: [], T0: [], K0: [], X3: [], X4: []}, worst = {}, kernMax = {};
    function track(cat, d){ if(!(cat in worst) || d > worst[cat]) worst[cat] = Math.round(d * 1e4) / 1e4; }
    function judgeNear(cat, where, mine, theirs, tol, sub){
      var d = Math.abs(mine - theirs);
      track(cat + (sub ? ':' + sub : ''), isFinite(d) ? d : 1e9);
      if(!near(mine, theirs, tol)) bad[cat].push(where + ': ' + (Math.round(mine * 1000) / 1000) + ' vs Chrome ' + (Math.round(theirs * 1000) / 1000));
    }
    var totals = {documents: 0, months: 0, weeks: 0, bars: 0, barsCompared: 0, weeksSkipped: 0, scaleMonths: 0, cuts: 0, texts: 0};
    var perDoc = [];

    for(var dk = 0; dk < docs.length; dk++){
      var doc = docs[dk], lay = chromeLayout(doc.html);
      var months = lay.pages.map(function (pg, pi) {
        var m = F.mvlMonthLayout(pg.inner, noteWidthOf);
        m.fit = {rows: pg.rows.slice()};
        return m;
      });
      var dt = {name: doc.name, months: months.length};
      months.forEach(function (m, pi) {
        var pg = lay.pages[pi], where0 = doc.name + ' / ' + m.label;
        totals.months++;
        if(pg.mode === 'scale') totals.scaleMonths++;
        // C0: the oracle is the print path's own layout.
        var sumRows = pg.rows.reduce(function (a, b) { return a + b; }, 0);
        if(pg.mode === 'fill' && !near(pg.body.y + sumRows + P.line, G.margin + G.contentH - G.pagePad, 0.05)) bad.C0.push(where0 + ': the weeks end at ' + (pg.body.y + sumRows + P.line) + ', not the page foot');
        pg.rows.forEach(function (h, wi) { if(h + 0.02 < pg.minRows[wi]) bad.C0.push(where0 + ' week ' + (wi + 1) + ': ' + h + ' under its min-height ' + pg.minRows[wi]); });
        if(!near(pg.weekW, G.weekW, 0.03)) bad.C0.push(where0 + ': W ' + pg.weekW);
        var list = F.mvlPaintMonth(m, fonts);
        compareMonth(where0, m, pg, list);
        compareStyles(where0, m, pg, list);
        totals.weeks += m.weeks.length;
      });
      // The file, built twice and through JSON.
      var layout = {geometry: G, months: months};
      var bytes = await F.buildMonthPdf(layout), again = await F.buildMonthPdf(layout);
      var viaJson = await F.buildMonthPdf(JSON.parse(JSON.stringify(layout)));
      dt.bytes = bytes.length;
      dt.r0 = sameBytes(bytes, again) && sameBytes(bytes, viaJson);
      var lists = months.map(function (m) { return F.mvlPaintMonth(m, fonts); });
      var xr = await inspectPdf(doc.name, bytes, months, lists, lay);
      dt.x = xr;
      out.pdfs[doc.name] = b64(bytes);
      perDoc.push(dt);
      totals.documents++;
    }
    info.documents = perDoc;
    info.totals = totals;
    info.worst = worst;
    info.kerning = kernMax;   // the widest difference Chrome's kerning made, per header line and over bar labels
    info.transplantedRules = transplanted;

    function judged(id, title, list, extra){
      add(id, title, list.length === 0 && totals.months > 0, {failures: list.length, first: list.slice(0, 8), detail: extra}, 'no failures');
    }
    judged('C0', 'CONTROL: the transplanted print layout is the print path\'s own: fill months reach the page foot, no week under its min-height, the page at W', bad.C0, {months: totals.months, scaleMonths: totals.scaleMonths});
    judged('H0', 'the header: every line\'s box, highlight, text anchor and baseline where Chrome puts them', bad.H0, {worst: pick(worst, 'H0')});
    judged('M0', 'the month bar and the weekday row: boxes, and every label\'s anchor and baseline', bad.M0, {worst: pick(worst, 'M0')});
    judged('D0', 'the frame, every week\'s top, every day cell and its line, every day number and ½', bad.D0, {worst: pick(worst, 'D0')});
    judged('B0', 'every bar\'s box (lane, span, height) in every week whose notes print as the document\'s', bad.B0,
           {bars: totals.bars, compared: totals.barsCompared, weeksSkipped: totals.weeksSkipped, worst: pick(worst, 'B0')});
    judged('T0', 'every bar\'s text at its start (a band\'s at its centre) and baseline: labels, grey tags, note lines', bad.T0, {worst: pick(worst, 'T0'), cuts: totals.cuts});
    judged('K0', 'every fill, border, hatch, shade, ink, font size, weight, letter-spacing, case, italic and strike is Chrome\'s computed style for the same element', bad.K0);
    var x = perDoc.map(function (d) { return d.x; });
    var x0bad = [], x1bad = [], x2bad = [];
    x.forEach(function (r, i) { (r.X0 || []).forEach(function (s) { x0bad.push(perDoc[i].name + ': ' + s); });
                                (r.X1 || []).forEach(function (s) { x1bad.push(perDoc[i].name + ': ' + s); });
                                (r.X2 || []).forEach(function (s) { x2bad.push(perDoc[i].name + ': ' + s); }); });
    judged('X0', 'the file: header, xref offsets, startxref, one /Page per month at 792 x 612, /Count, and a trailer of /Size and /Root only', x0bad);
    judged('X1', 'the fonts: every /FontFile2 is its font-inter-<w> block byte for byte, with /Length1 and /BaseFont; only the weights set in', x1bad,
           {weights: perDoc.map(function (d) { return d.name + ':' + (d.x.weights || []).join('/'); })});
    judged('X2', '/Widths: every code is the advance of the glyph a viewer draws, exact to 3 decimals, .notdef for the ten the subset lacks', x2bad);
    judged('X3', 'the content: numbers finite, every run as wide by the file\'s /Widths as the model measured, inside its box, and all paint inside the margins', bad.X3, {worst: pick(worst, 'X3')});
    judged('X4', 'the text: the streams carry exactly the display list\'s strings, and the display list carries every text in the model', bad.X4, {texts: totals.texts});
    add('R0', 'the same layout gives the same bytes twice over and through JSON', perDoc.every(function (d) { return d.r0; }),
        perDoc.map(function (d) { return d.name + ':' + d.r0; }), 'all true');
    out.errors = (T.appHealth().errors || []).slice(0, 10);
    add('E0', 'no console errors', out.errors.length === 0, out.errors, []);
  } catch (e) {
    out.EX = String(e && e.stack || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);

  // ====================================================================================================
  function pick(o, prefix){ var r = {}; Object.keys(o).forEach(function (k) { if(k.indexOf(prefix) === 0) r[k] = o[k]; }); return r; }
  function sameBytes(a, b){ if(a.length !== b.length) return false; for(var i = 0; i < a.length; i++) if(a[i] !== b[i]) return false; return true; }
  function b64(u8){ var s = ''; for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function latin1(u8){ var s = ''; for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }

  // The app's own @media print rules for #print-root, copied into a screen stylesheet. The body.printing-* rules
  // (which hide the app) and the waterfall's are left out; the page box's 100vh is stood in for per page.
  // ⚠️ JUDGED SELECTOR BY SELECTOR. The build's minifier MERGES rules with the same declarations, so the five
  // print-only display:none rules arrive as ONE comma list (`#print-root .mv-arrow,#print-root .mv-tools,…`). A
  // first cut dropped the whole list for naming .hdr-tools, the arrows and the Manual format strip stayed up, and
  // the oracle reported a month bar 1.5 px too tall and a Manual header 39 px too low.
  function transplantPrintRules(){
    var css = [];
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      var rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.prototype.forEach.call(rules || [], function (r) {
        if(r.type !== CSSRule.MEDIA_RULE || !/\bprint\b/.test(r.media.mediaText)) return;
        Array.prototype.forEach.call(r.cssRules, function (x) {
          if(x.type !== CSSRule.STYLE_RULE) return;
          var keep = x.selectorText.split(',').map(function (s) { return s.trim(); }).filter(function (s) {
            return /^#print-root\b/.test(s) && !/waterfall|wf-print|sheet-/.test(s);
          });
          if(keep.length) css.push(keep.join(', ') + '{' + x.style.cssText + '}');
        });
      });
    });
    // ⛔ ONE RULE THAT IS NOT THE APP'S: the owner's ruling of 1 Oct 2026 (step 4, "Full height"). A hiatus band
    // whose label was emptied prints as tall as a labelled band, so the writer gives an empty bar its line box. Print
    // gives it none (its bars are align-self:start, and an empty block has no line), and draws a 4 px strip. A
    // zero-width space is that line box exactly, so Chrome lays out the RULED band and the oracle stays box for box.
    css.push('#print-root .mv-bar:empty::before{content:"\\200B"}');
    var st = document.createElement('style');
    st.textContent = css.join('\n');
    document.head.appendChild(st);
    return css.length;
  }

  // One document laid out as print lays it out, measured. Coordinates are the PAPER's: CSS px from the sheet's
  // top-left, the .print-page's border box sitting at the 8 mm margin.
  function chromeLayout(html){
    var host = document.getElementById('print-root'), prev = host.style.cssText;
    host.innerHTML = html;
    host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:' + G.contentW + 'px;';
    var res = {pages: []};
    try {
      Array.prototype.forEach.call(host.querySelectorAll(':scope > .print-page'), function (page) {
        page.style.height = G.contentH + 'px';
        var body = page.querySelector('.mv-body'), mode = /scaleY/.test(body.style.transform || '') ? 'scale' : 'fill';
        if(mode === 'scale'){
          body.style.transform = ''; body.style.transformOrigin = ''; body.classList.remove('mv-scaled');
          body.style.removeProperty('--mv-line-y');
        }
        var inner = page.innerHTML;          // what the model reads: the month-view element, as captured
        var o = page.getBoundingClientRect();
        var rel = function (rc) { return {x: rc.left - o.left + G.margin, y: rc.top - o.top + G.margin, w: rc.width, h: rc.height}; };
        var textRects = function (el) {
          var outR = [];
          Array.prototype.forEach.call(el.childNodes, function (n) {
            if(n.nodeType !== 3 || !n.data.length) return;
            var rg = document.createRange(); rg.selectNodeContents(n);
            Array.prototype.forEach.call(rg.getClientRects(), function (rc) { if(rc.width > 0 || rc.height > 0) outR.push(rel(rc)); });
          });
          return outR;
        };
        var p = {mode: mode, inner: inner, rows: [], minRows: [], weekTops: []};
        var mv = page.querySelector('.month-view');
        // What Chrome PAINTS each thing with: its computed style, for K0.
        var cs = function (el, pseudo) {
          var s = getComputedStyle(el, pseudo || null);
          return {size: parseFloat(s.fontSize), weight: s.fontWeight, style: s.fontStyle, color: s.color, bg: s.backgroundColor,
                  bgImage: s.backgroundImage, opacity: parseFloat(s.opacity), ls: s.letterSpacing, deco: s.textDecorationLine,
                  transform: s.textTransform, border: s.borderTopColor, radius: s.borderTopLeftRadius, content: s.content};
        };
        p.hdr = {};
        Array.prototype.forEach.call(mv.querySelectorAll('.mv-header .hdr-line[data-mvhid]'), function (el) {
          var shown = getComputedStyle(el).display !== 'none';
          p.hdr[el.getAttribute('data-mvhid')] = {shown: shown, box: rel(el.getBoundingClientRect()), lines: shown ? textRects(el) : [], cs: cs(el)};
        });
        p.monthbar = rel(mv.querySelector('.mv-monthbar').getBoundingClientRect());
        p.monthbarCs = cs(mv.querySelector('.mv-monthbar'));
        p.monthyear = textRects(mv.querySelector('.mv-monthyear'))[0];
        p.monthyearCs = cs(mv.querySelector('.mv-monthyear'));
        p.dowrow = rel(mv.querySelector('.mv-dowrow').getBoundingClientRect());
        p.dowrowCs = cs(mv.querySelector('.mv-dowrow'));
        p.dow = Array.prototype.map.call(mv.querySelectorAll('.mv-dowrow > .mv-dow'), function (el) { return textRects(el)[0]; });
        p.dowCs = Array.prototype.map.call(mv.querySelectorAll('.mv-dowrow > .mv-dow'), function (el) { return cs(el); });
        p.body = rel(body.getBoundingClientRect());
        var bodyCs = getComputedStyle(body);
        p.weekW = body.getBoundingClientRect().width - parseFloat(bodyCs.borderLeftWidth) - parseFloat(bodyCs.borderRightWidth);
        p.weeks = Array.prototype.map.call(body.querySelectorAll(':scope > .mv-week'), function (wk) {
          var rc = rel(wk.getBoundingClientRect());
          p.rows.push(rc.h); p.weekTops.push(rc.y);
          p.minRows.push(parseFloat(wk.style.minHeight || wk.style.height || '0') || 0);
          return {
            cells: Array.prototype.map.call(wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell'), function (c) {
              var num = c.querySelector('.mv-daynum');
              return {box: rel(c.getBoundingClientRect()), borderLeft: parseFloat(getComputedStyle(c).borderLeftWidth) || 0,
                      borderColor: getComputedStyle(c).borderLeftColor,
                      span: rel(num.getBoundingClientRect()), num: textRects(num)[0], cs: cs(c), numCs: cs(num), afterCs: cs(num, '::after')};
            }),
            bars: Array.prototype.map.call(wk.querySelectorAll(':scope > .mv-bars > .mv-bar:not(.mv-note-add):not(.mv-row-expand)'), function (b) {
              var tagEl = b.querySelector('.mv-pill-block');
              return {box: rel(b.getBoundingClientRect()), note: b.classList.contains('mv-note-block'),
                      text: textRects(b), tag: tagEl ? textRects(tagEl)[0] : null, cs: cs(b), tagCs: tagEl ? cs(tagEl) : null};
            }),
          };
        });
        res.pages.push(p);
      });
    } finally {
      host.innerHTML = ''; host.style.cssText = prev;
    }
    return res;
  }

  // ---- H0 / M0 / D0 / B0 / T0: the display list against Chrome's layout of the same page ------------------
  function compareMonth(where0, m, pg, list){
    var by = function (role) { return list.filter(function (o) { return o.role === role; }); };
    var BOX = 0.03, BASE_TOL = 0.03, LEFT = 0.05;
    var A = function (sz) { return ascentAt(sz); };
    // H0: the header. ⭐ KERNING IS ACCOUNTED FOR, NOT TOLERATED. Chrome kerns and the PDF does not (plan §7), so
    // a box that hugs its text -- the left slot past 84 px, the date, a highlighted subtitle -- is as much narrower
    // in Chrome as Chrome's text is, and the title's box moves by its neighbours' differences. So each expected box
    // is the writer's own, corrected by the difference CHROME REPORTS between its text width and the writer's, and
    // then held to 0.03 px; every anchor is held relative to its own box. `info.kerning` records the differences.
    var hd = F.mvlHeader(m, fonts, G.margin + G.pagePad, G.margin + G.pagePad, G.contentW - 2 * G.pagePad);
    var hTexts = by('hdr'), hHi = by('hdr-hi'), Wp = G.contentW - 2 * G.pagePad;
    var one = function (id) { var t = hTexts.filter(function (o) { return o.id === id; }); return t.length === 1 ? t[0] : null; };
    var kernOf = function (id) {
      var ch = pg.hdr[id], t = one(id);
      return (ch && ch.shown && t && ch.lines.length === 1) ? ch.lines[0].w - t.w : 0;
    };
    var padOf = function (id) { var h = m.header.filter(function (x) { return x.id === id; })[0]; return (h && h.fmt && h.fmt.highlight) ? P.hdrHiPadX : P.hdrPadX; };
    var exp = {}, L = hd.boxes.tleft, R = hd.boxes.today, Tb = hd.boxes.title, S = hd.boxes.subtitle;
    var lw = one('tleft') ? Math.max(P.tleft.minW, one('tleft').w + kernOf('tleft') + 2 * padOf('tleft')) : L.w;
    var rw = R.w + kernOf('today');
    exp.tleft = {x: L.x, y: L.y, w: lw, h: L.h};
    exp.today = {x: R.x + R.w - rw, y: R.y, w: rw, h: R.h};
    exp.title = {x: L.x + lw + P.barGap, y: Tb.y, w: (R.x + R.w - rw - P.barGap) - (L.x + lw + P.barGap), h: Tb.h};
    if(S){
      var shi = (m.header.filter(function (x) { return x.id === 'subtitle'; })[0].fmt || {}).highlight;
      var sw = shi && one('subtitle') ? Math.min(Wp, S.w + kernOf('subtitle')) : S.w, sal = alignOf(m, 'subtitle');
      exp.subtitle = {x: !shi ? S.x : (sal === 'center' ? S.x + (S.w - sw) / 2 : (sal === 'right' ? S.x + S.w - sw : S.x)), y: S.y, w: sw, h: S.h};
    }
    ['tleft', 'today', 'subtitle'].forEach(function (id) { var k = Math.abs(kernOf(id)); if(!(id in kernMax) || k > kernMax[id]) kernMax[id] = Math.round(k * 1e4) / 1e4; });
    ['tleft', 'title', 'today', 'subtitle'].forEach(function (id) {
      var ch = pg.hdr[id], mine = hTexts.filter(function (o) { return o.id === id; });
      if(!ch) { bad.H0.push(where0 + ' ' + id + ': no line in the document'); return; }
      if(!ch.shown){ if(mine.length || hd.boxes[id]) bad.H0.push(where0 + ' ' + id + ': drawn, but hidden in print'); return; }
      var e = exp[id];
      if(!e){ bad.H0.push(where0 + ' ' + id + ': shown in print, not laid out'); return; }
      ['x', 'y', 'w', 'h'].forEach(function (k) { judgeNear('H0', where0 + ' ' + id + ' box ' + k, e[k], ch.box[k], BOX, 'box'); });
      if(mine.length !== ch.lines.length){ bad.H0.push(where0 + ' ' + id + ': ' + mine.length + ' lines vs Chrome ' + ch.lines.length); return; }
      var hi = hHi.filter(function (o) { return o.id === id; })[0], box = hd.boxes[id];
      if(hi && !(hi.x === box.x && hi.y === box.y && hi.w === box.w && hi.h === box.h)) bad.H0.push(where0 + ' ' + id + ': the highlight is not the line\'s box');
      mine.forEach(function (o, li) {
        var c = ch.lines[li], al = alignOf(m, id);
        totals.texts++;
        judgeNear('H0', where0 + ' ' + id + ' line ' + (li + 1) + ' baseline', o.y, c.y + A(o.size), BASE_TOL, 'baseline');
        // The anchor its alignment fixes, measured from its own box, each side with its own width.
        var mineAt, theirsAt;
        if(al === 'left'){ mineAt = o.x - box.x; theirsAt = c.x - ch.box.x; }
        else if(al === 'right'){ mineAt = box.x + box.w - (o.x + o.w); theirsAt = ch.box.x + ch.box.w - (c.x + c.w); }
        else { mineAt = o.x + o.w / 2 - (box.x + box.w / 2); theirsAt = c.x + c.w / 2 - (ch.box.x + ch.box.w / 2); }
        judgeNear('H0', where0 + ' ' + id + ' line ' + (li + 1) + ' ' + al + ' anchor', mineAt, theirsAt, LEFT, 'anchor');
        if(o.s !== F.mvlFlat(o.s)) bad.H0.push(where0 + ' ' + id + ': a line that is not flat');
      });
    });
    // M0: the month bar and the weekday row.
    var mb = by('monthbar')[0], dr = by('dowrow')[0];
    if(!mb || !dr || !by('monthbar-text')[0]){ bad.M0.push(where0 + ': the month bar or the weekday row is not drawn'); return; }
    ['x', 'y', 'w', 'h'].forEach(function (k) {
      judgeNear('M0', where0 + ' month bar ' + k, mb[k], pg.monthbar[k], BOX, 'box');
      judgeNear('M0', where0 + ' weekday row ' + k, dr[k], pg.dowrow[k], BOX, 'box');
    });
    var mt = by('monthbar-text')[0];
    judgeNear('M0', where0 + ' month label baseline', mt.y, pg.monthyear.y + A(mt.size), BASE_TOL, 'baseline');
    judgeNear('M0', where0 + ' month label centre', mt.x + mt.w / 2, pg.monthyear.x + pg.monthyear.w / 2, LEFT, 'centre');
    by('dow').forEach(function (o, i) {
      var c = pg.dow[i];
      judgeNear('M0', where0 + ' ' + o.s + ' baseline', o.y, c.y + A(o.size), BASE_TOL, 'baseline');
      judgeNear('M0', where0 + ' ' + o.s + ' centre', o.x + o.w / 2, c.x + c.w / 2, LEFT, 'centre');
    });
    // D0: the frame, the weeks, the cells, the numbers.
    var frame = by('frame'), ln = P.line;
    var bodyLines = frame.filter(function (o) { return near(o.y, pg.body.y, BOX) || o.h > pg.body.h - 5; });
    var left = frame.filter(function (o) { return o.w === ln && near(o.x, pg.body.x, BOX) && o.h > 50; })[0];
    var right = frame.filter(function (o) { return o.w === ln && near(o.x + o.w, pg.body.x + pg.body.w, BOX) && o.h > 50; })[0];
    var foot = frame.filter(function (o) { return o.h === ln && o.w > 900 && o.y > pg.body.y; })[0];
    if(!left || !right || !foot) bad.D0.push(where0 + ': the frame is not drawn at the body\'s edges');
    else if(pg.mode === 'fill') judgeNear('D0', where0 + ' frame foot', foot.y + foot.h, pg.body.y + pg.body.h, BOX, 'box');
    void bodyLines;
    var wkLines = by('week-line');
    m.weeks.forEach(function (wk, wi) {
      var cw = pg.weeks[wi], wWhere = where0 + ' week ' + (wi + 1);
      if(wi){ var wl = wkLines.filter(function (o) { return o.wk === wi; })[0];
              if(!wl) bad.D0.push(wWhere + ': no top line'); else judgeNear('D0', wWhere + ' top', wl.y, pg.weekTops[wi], BOX, 'box'); }
      wk.days.forEach(function (d, dj) {
        var cc = cw.cells[dj], dWhere = wWhere + ' day ' + (dj + 1);
        var cell = list.filter(function (o) { return (o.role === 'cell') && o.wk === wi && o.d === dj; })[0];
        var pad = {x: cc.box.x + cc.borderLeft, y: cc.box.y, w: cc.box.w - cc.borderLeft, h: cc.box.h};
        if(cell){ ['x', 'y', 'w', 'h'].forEach(function (k) { judgeNear('D0', dWhere + ' cell ' + k, cell[k], pad[k], BOX, 'box'); }); }
        else if(d.mark || d.weekend || d.out) bad.D0.push(dWhere + ': a shaded day drawn white');
        if(dj){ var cl = list.filter(function (o) { return o.role === 'cell-line' && o.wk === wi && o.d === dj; })[0];
                if(!cl) bad.D0.push(dWhere + ': no line'); else { judgeNear('D0', dWhere + ' line x', cl.x, cc.box.x, BOX, 'box'); judgeNear('D0', dWhere + ' line w', cl.w, cc.borderLeft, BOX, 'box'); } }
        var num = list.filter(function (o) { return o.role === 'daynum' && o.wk === wi && o.d === dj; })[0];
        if(!num){ bad.D0.push(dWhere + ': no day number'); return; }
        judgeNear('D0', dWhere + ' number start', num.x, cc.num.x, LEFT, 'left');
        judgeNear('D0', dWhere + ' number baseline', num.y, cc.num.y + A(num.size), BASE_TOL, 'baseline');
        var half = list.filter(function (o) { return o.role === 'half' && o.wk === wi && o.d === dj; })[0];
        if(d.half !== !!half) bad.D0.push(dWhere + ': ½ ' + !!half + ' for a half day ' + d.half);
        // The ½ as the 2 px gap plus its own advance after the number, each side from its own number's end (a
        // lone glyph in its own ::after box, so nothing kerns it).
        if(half) judgeNear('D0', dWhere + ' ½ after its number', half.x + half.w - (num.x + num.w), cc.span.x + cc.span.w - (cc.num.x + cc.num.w), LEFT, 'half');
        totals.texts++;
      });
      // B0 + T0: compared only where the week's notes print as the document's, so its lanes are the same lanes.
      totals.bars += wk.items.length;
      var notesSame = cw.bars.length === wk.items.length && wk.items.every(function (it, k) {
        if(it.kind !== 'note') return true;
        var chLines = Math.round((cw.bars[k].box.h - 6) / G.noteLinePx);
        return chLines === it.lines.length;
      }) && sameLanes(m, pg, wi);
      if(!notesSame){ totals.weeksSkipped++; return; }
      wk.items.forEach(function (it, k) {
        var cb = cw.bars[k], bWhere = wWhere + ' bar ' + (k + 1) + ' (' + it.kind + ')';
        var bar = list.filter(function (o) { return o.role === 'bar' && o.wk === wi && o.i === k; })[0];
        if(!bar){ bad.B0.push(bWhere + ': not drawn'); return; }
        ['x', 'y', 'w', 'h'].forEach(function (key) { judgeNear('B0', bWhere + ' ' + key, bar[key], cb.box[key], BOX, 'box'); });
        totals.barsCompared++;
        var texts = list.filter(function (o) { return o.role === 'bar-text' && o.wk === wi && o.i === k; });
        var tag = list.filter(function (o) { return o.role === 'bar-tag' && o.wk === wi && o.i === k; })[0];
        if(list.some(function (o) { return o.role === 'bar-ell' && o.wk === wi && o.i === k; })) totals.cuts++;
        if(!texts.length) return;
        var first = texts[0], c0 = cb.text[0];
        if(!c0){ bad.T0.push(bWhere + ': drawn text Chrome has none of'); return; }
        totals.texts += texts.length;
        judgeNear('T0', bWhere + ' baseline', first.y, c0.y + A(first.size), BASE_TOL, 'baseline');
        var centred = it.kind === 'hiatus' && !list.some(function (o) { return o.role === 'bar-ell' && o.wk === wi && o.i === k; });
        if(centred) judgeNear('T0', bWhere + ' centre', first.x + first.w / 2, c0.x + c0.w / 2, LEFT, 'centre');
        else judgeNear('T0', bWhere + ' start', first.x, c0.x, LEFT, 'left');
        if(it.kind === 'note'){
          // Every further line: the same start, 13 px lower each (Chrome's line rects, one per line box).
          texts.forEach(function (o) {
            var c = cb.text.filter(function (rc) { return Math.round((rc.y - c0.y) / G.noteLinePx) === o.li; })[0];
            if(c){ judgeNear('T0', bWhere + ' line ' + (o.li + 1) + ' baseline', o.y, c.y + A(o.size), BASE_TOL, 'baseline');
                   judgeNear('T0', bWhere + ' line ' + (o.li + 1) + ' start', o.x, c.x, LEFT, 'left'); }
          });
        }
        if(tag){
          // The tag starts 7 px after the label, so Chrome's starts as much earlier as Chrome kerns the label.
          if(!cb.tag) bad.T0.push(bWhere + ': a grey tag Chrome has none of');
          else { judgeNear('T0', bWhere + ' tag baseline', tag.y, cb.tag.y + A(tag.size), BASE_TOL, 'baseline');
                 judgeNear('T0', bWhere + ' tag start', tag.x + (c0.w - first.w), cb.tag.x, LEFT, 'tag');
                 var kl = Math.abs(c0.w - first.w); if(!('label' in kernMax) || kl > kernMax.label) kernMax.label = Math.round(kl * 1e4) / 1e4; }
        }
      });
    });
  }
  // ---- K0: what each thing is painted WITH, held to Chrome's computed style for the same element --------------
  // Colours are compared as the PDF must show them: Chrome's colour at Chrome's opacity, mixed over the cell's
  // own background (a hatched cell's being the mean of its two stripes, as the emitter mixes it).
  function rgbOf(css){
    var m = /rgba?\(([^)]*)\)/.exec(css || '');
    if(!m) return null;
    var v = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return {c: [v[0] / 255, v[1] / 255, v[2] / 255], a: v.length > 3 ? v[3] : 1};
  }
  function mix(fg, a, bg){ return fg.map(function (v, i) { return v * a + bg[i] * (1 - a); }); }
  function sameC(a, b){ return a && b && a.length === 3 && b.length === 3 && a.every(function (v, i) { return Math.abs(v - b[i]) <= 0.002; }); }
  function compareStyles(where0, m, pg, list){
    // (Inside, not beside: a `var` after T.done() is hoisted without its value.)
    var HATCH_MEAN = [(0xEF + 0xF8) / 2 / 255, (0xEF + 0xF8) / 2 / 255, (0xEF + 0xF8) / 2 / 255];
    var K = bad.K0, fmtC = function (c) { return c ? '[' + c.map(function (v) { return Math.round(v * 255); }).join(',') + ']' : 'none'; };
    var font = function (where, o, s) {
      if(o.wt !== String(s.weight)) K.push(where + ': weight ' + o.wt + ' vs ' + s.weight);
      if(Math.abs(o.size - s.size) > 1e-6) K.push(where + ': size ' + o.size + ' vs ' + s.size);
    };
    var hTexts = list.filter(function (o) { return o.role === 'hdr'; });
    ['tleft', 'title', 'today', 'subtitle'].forEach(function (id) {
      var ch = pg.hdr[id]; if(!ch || !ch.shown) return;
      hTexts.filter(function (o) { return o.id === id; }).forEach(function (o) {
        font(where0 + ' ' + id, o, ch.cs);
        if(o.skew !== (ch.cs.style === 'italic' ? P.italicSkew : 0)) K.push(where0 + ' ' + id + ': skew ' + o.skew + ' for ' + ch.cs.style);
        if(!sameC(o.c, rgbOf(ch.cs.color).c)) K.push(where0 + ' ' + id + ': ink ' + fmtC(o.c) + ' vs ' + ch.cs.color);
      });
      var hi = list.filter(function (o) { return o.role === 'hdr-hi' && o.id === id; })[0], bg = rgbOf(ch.cs.bg);
      var painted = bg && bg.a > 0;
      if(!!hi !== !!painted) K.push(where0 + ' ' + id + ': highlight ' + !!hi + ' for a background ' + ch.cs.bg);
      else if(hi && !sameC(hi.c, bg.c)) K.push(where0 + ' ' + id + ': highlight ' + fmtC(hi.c) + ' vs ' + ch.cs.bg);
      if(hi && hi.r !== parseFloat(ch.cs.radius)) K.push(where0 + ' ' + id + ': highlight radius ' + hi.r + ' vs ' + ch.cs.radius);
    });
    var mt = list.filter(function (o) { return o.role === 'monthbar-text'; })[0];
    if(!mt){ K.push(where0 + ': no month label'); return; }
    font(where0 + ' month label', mt, pg.monthyearCs);
    if(Math.abs(mt.ls - parseFloat(pg.monthyearCs.ls)) > 1e-6) K.push(where0 + ' month label: letter-spacing ' + mt.ls + ' vs ' + pg.monthyearCs.ls);
    if(!sameC(mt.c, rgbOf(pg.monthyearCs.color).c)) K.push(where0 + ' month label: ink ' + fmtC(mt.c) + ' vs ' + pg.monthyearCs.color);
    var mbFill = list.filter(function (o) { return o.role === 'monthbar'; })[0], drFill = list.filter(function (o) { return o.role === 'dowrow'; })[0];
    if(!sameC(mbFill.c, rgbOf(pg.monthbarCs.bg).c)) K.push(where0 + ': month bar ' + fmtC(mbFill.c) + ' vs ' + pg.monthbarCs.bg);
    if(!sameC(drFill.c, rgbOf(pg.dowrowCs.bg).c)) K.push(where0 + ': weekday row ' + fmtC(drFill.c) + ' vs ' + pg.dowrowCs.bg);
    list.filter(function (o) { return o.role === 'dow'; }).forEach(function (o) {
      var s = pg.dowCs[o.i];
      font(where0 + ' ' + o.s, o, s);
      if(Math.abs(o.ls - parseFloat(s.ls)) > 1e-6) K.push(where0 + ' ' + o.s + ': letter-spacing ' + o.ls + ' vs ' + s.ls);
      if(s.transform !== 'uppercase' || o.s !== o.s.toUpperCase()) K.push(where0 + ' ' + o.s + ': case');
      if(!sameC(o.c, rgbOf(s.color).c)) K.push(where0 + ' ' + o.s + ': ink ' + fmtC(o.c) + ' vs ' + s.color);
    });
    m.weeks.forEach(function (wk, wi) {
      var cw = pg.weeks[wi], wWhere = where0 + ' week ' + (wi + 1);
      wk.days.forEach(function (d, dj) {
        var cc = cw.cells[dj], dWhere = wWhere + ' day ' + (dj + 1);
        var cell = list.filter(function (o) { return o.role === 'cell' && o.wk === wi && o.d === dj; })[0];
        var bgC = rgbOf(cc.cs.bg), hatched = /repeating-linear-gradient/.test(cc.cs.bgImage), under;
        if(hatched){
          if(!cell || cell.k !== 'hatch' || !sameC(cell.c[0], [0xEF / 255, 0xEF / 255, 0xEF / 255]) || !sameC(cell.c[1], [0xF8 / 255, 0xF8 / 255, 0xF8 / 255]))
            K.push(dWhere + ': not the #EFEFEF/#F8F8F8 hatch Chrome paints (' + cc.cs.bgImage.slice(0, 60) + ')');
          under = HATCH_MEAN;
        } else if(bgC && bgC.a > 0){
          if(!cell || cell.k !== 'fill' || !sameC(cell.c, bgC.c)) K.push(dWhere + ': cell ' + (cell ? fmtC(cell.c) : 'unpainted') + ' vs ' + cc.cs.bg);
          under = bgC.c;
        } else {
          if(cell) K.push(dWhere + ': a painted cell Chrome leaves white');
          under = [1, 1, 1];
        }
        if(dj){ var cl = list.filter(function (o) { return o.role === 'cell-line' && o.wk === wi && o.d === dj; })[0];
                if(cl && !sameC(cl.c, rgbOf(cc.borderColor).c)) K.push(dWhere + ': line ' + fmtC(cl.c) + ' vs ' + cc.borderColor); }
        var num = list.filter(function (o) { return o.role === 'daynum' && o.wk === wi && o.d === dj; })[0];
        if(!num){ K.push(dWhere + ': no day number'); return; }
        var ink = rgbOf(cc.numCs.color);
        font(dWhere + ' number', num, cc.numCs);
        if(!sameC(num.c, mix(ink.c, ink.a * cc.numCs.opacity, under))) K.push(dWhere + ': number ' + fmtC(num.c) + ' vs ' + cc.numCs.color + ' at ' + cc.numCs.opacity);
        var strike = list.filter(function (o) { return o.role === 'strike' && o.wk === wi && o.d === dj; })[0];
        if(!!strike !== /line-through/.test(cc.numCs.deco)) K.push(dWhere + ': strike ' + !!strike + ' for ' + cc.numCs.deco);
        else if(strike && !sameC(strike.c, num.c)) K.push(dWhere + ': the strike is not the number\'s colour');
        var half = list.filter(function (o) { return o.role === 'half' && o.wk === wi && o.d === dj; })[0];
        if(half){
          if(cc.afterCs.content.indexOf('½') < 0) K.push(dWhere + ': a ½ Chrome does not draw');
          font(dWhere + ' ½', half, cc.afterCs);
          if(!sameC(half.c, mix(ink.c, ink.a * cc.numCs.opacity * cc.afterCs.opacity, under))) K.push(dWhere + ': ½ ' + fmtC(half.c));
        } else if(cc.afterCs.content.indexOf('½') >= 0) K.push(dWhere + ': Chrome draws a ½ the PDF does not');
      });
      wk.items.forEach(function (it, k) {
        var cb = cw.bars[k], bWhere = wWhere + ' bar ' + (k + 1) + ' (' + it.kind + ')';
        if(!cb) return;
        var bar = list.filter(function (o) { return o.role === 'bar' && o.wk === wi && o.i === k; })[0];
        if(!bar){ K.push(bWhere + ': not drawn'); return; }
        var fill = rgbOf(cb.cs.bg), ink = rgbOf(cb.cs.color), brd = rgbOf(cb.cs.border);
        if(!sameC(bar.c, fill.c)) K.push(bWhere + ': fill ' + fmtC(bar.c) + ' vs ' + cb.cs.bg);
        if(bar.r !== parseFloat(cb.cs.radius)) K.push(bWhere + ': radius ' + bar.r + ' vs ' + cb.cs.radius);
        var ring = list.filter(function (o) { return o.role === 'bar-ring' && o.wk === wi && o.i === k; })[0];
        if(!ring || !sameC(ring.c, mix(brd.c, brd.a, fill.c))) K.push(bWhere + ': border ' + (ring ? fmtC(ring.c) : 'missing') + ' vs ' + cb.cs.border + ' over the fill');
        var shades = list.filter(function (o) { return o.role === 'bar-shade' && o.wk === wi && o.i === k; }).length;
        var layers = (cb.cs.bgImage.match(/linear-gradient\(/g) || []).length;
        if(shades !== layers) K.push(bWhere + ': ' + shades + ' half-day shades for ' + layers + ' layers');
        list.filter(function (o) { return (o.role === 'bar-text' || o.role === 'bar-ell') && o.wk === wi && o.i === k; }).forEach(function (o) {
          font(bWhere + ' text', o, cb.cs);
          if(!sameC(o.c, ink.c)) K.push(bWhere + ': ink ' + fmtC(o.c) + ' vs ' + cb.cs.color);
        });
        var tag = list.filter(function (o) { return o.role === 'bar-tag' && o.wk === wi && o.i === k; })[0];
        if(tag){ font(bWhere + ' tag', tag, cb.tagCs);
                 if(!sameC(tag.c, rgbOf(cb.tagCs.color).c)) K.push(bWhere + ': tag ' + fmtC(tag.c) + ' vs ' + cb.tagCs.color); }
      });
    });
  }

  // A week's lanes are the document's when every bar's lane and span in the model are the document's.
  function sameLanes(m, pg, wi){
    var parsed = new DOMParser().parseFromString(pg.inner, 'text/html');
    var wk = parsed.querySelectorAll('.mv-body > .mv-week')[wi];
    var bars = wk ? Array.prototype.slice.call(wk.querySelectorAll(':scope > .mv-bars > .mv-bar:not(.mv-note-add)')) : [];
    if(bars.length !== m.weeks[wi].items.length) return false;
    return m.weeks[wi].items.every(function (it, k) {
      var gr = /grid-row:\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/.exec(bars[k].getAttribute('style') || '');
      return gr && +gr[1] - 1 === it.lane && (gr[2] ? +gr[2] : 1) === it.lanes;
    });
  }
  function alignOf(m, id){
    var h = m.header.filter(function (x) { return x.id === id; })[0], f = (h && h.fmt) || {};
    return f.align || ({tleft: 'left', title: 'center', today: 'left', subtitle: 'center'})[id];
  }

  // ---- X0..X4: the bytes ------------------------------------------------------------------------------------
  async function inflate(u8){
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  }
  async function inspectPdf(name, bytes, months, lists, lay){
    var r = {X0: [], X1: [], X2: []}, s = latin1(bytes);
    // X0: structure, read through the xref (which also proves every offset).
    if(s.indexOf('%PDF-1.4\n') !== 0) r.X0.push('no %PDF-1.4 header');
    var sx = /startxref\n(\d+)\n%%EOF\n$/.exec(s);
    if(!sx) { r.X0.push('no startxref/%%EOF at the end'); return r; }
    var xrefAt = +sx[1];
    if(s.slice(xrefAt, xrefAt + 5) !== 'xref\n') r.X0.push('startxref does not point at the xref');
    var xm = /^xref\n0 (\d+)\n/.exec(s.slice(xrefAt)), n = xm ? +xm[1] : 0;
    var objs = {};
    for(var i = 1; i < n; i++){
      var row = s.substr(xrefAt + xm[0].length + i * 20, 20);
      var off = parseInt(row.slice(0, 10), 10);
      if(!/^\d{10} 00000 n \n$/.test(row)) { r.X0.push('xref row ' + i + ' is "' + row + '"'); continue; }
      var head = i + ' 0 obj\n';
      if(s.substr(off, head.length) !== head) { r.X0.push('object ' + i + ' is not at its offset'); continue; }
      var bodyAt = off + head.length, dictEnd = s.indexOf('\n', bodyAt);
      var dict = s.slice(bodyAt, dictEnd), o = {dict: dict};
      if(s.substr(dictEnd + 1, 7) === 'stream\n'){
        var lenM = /\/Length (\d+)/.exec(dict), L = lenM ? +lenM[1] : -1, at0 = dictEnd + 8;
        o.stream = bytes.subarray(at0, at0 + L);
        if(s.substr(at0 + L, 18) !== '\nendstream\nendobj\n') r.X0.push('object ' + i + '\'s /Length is wrong');
      } else if(s.substr(dictEnd + 1, 7) !== 'endobj\n') r.X0.push('object ' + i + ' does not end');
      objs[i] = o;
    }
    var trailer = /trailer\n(<<[^\n]*>>)\nstartxref/.exec(s);
    if(!trailer || trailer[1] !== '<< /Size ' + n + ' /Root 1 0 R >>') r.X0.push('a trailer of "' + (trailer && trailer[1]) + '"');
    var outsideStreams = Object.keys(objs).map(function (k) { return objs[k].dict; }).join('\n') + (trailer ? trailer[1] : '');
    if(/\/Info\b|\/ID\b|\/CreationDate|\/ModDate/.test(outsideStreams)) r.X0.push('an /Info, /ID or date key');
    var pagesDict = (objs[2] || {}).dict || '';
    var kids = (/\/Kids \[([^\]]*)\]/.exec(pagesDict) || [])[1] || '', count = +((/\/Count (\d+)/.exec(pagesDict) || [])[1]);
    var kidNums = kids.split(' 0 R').map(function (t) { return t.trim(); }).filter(Boolean).map(Number);
    if(count !== months.length || kidNums.length !== months.length) r.X0.push('/Count ' + count + ' and ' + kidNums.length + ' kids for ' + months.length + ' months');
    var pageObjs = kidNums.map(function (k) { return objs[k]; });
    pageObjs.forEach(function (po, pi) {
      if(!po || !/^<< \/Type \/Page \/Parent 2 0 R \/MediaBox \[0 0 792 612\] \/Resources 3 0 R \/Contents (\d+) 0 R >>$/.test(po.dict)) r.X0.push('page ' + (pi + 1) + ': ' + (po && po.dict));
    });
    // X1: the fonts.
    var res = (objs[3] || {}).dict || '', fontRefs = {}, fm, fre = /\/F(\d{3}) (\d+) 0 R/g;
    while((fm = fre.exec(res))) fontRefs[fm[1]] = +fm[2];
    r.weights = Object.keys(fontRefs);
    var usedW = ['400', '500', '600', '700'].filter(function (w) { return lists.some(function (l) { return l.some(function (o) { return o.k === 'text' && o.s !== '' && o.wt === w; }); }); });
    if(!same(r.weights, usedW)) r.X1.push('embedded ' + r.weights.join('/') + ', set in ' + usedW.join('/'));
    var widthsBy = {};
    for(var w in fontRefs){
      var fo = objs[fontRefs[w]], fd = fo && fo.dict, prog = fonts[w];
      var desc = objs[+((/\/FontDescriptor (\d+) 0 R/.exec(fd || '') || [])[1])], file = desc && objs[+((/\/FontFile2 (\d+) 0 R/.exec(desc.dict) || [])[1])];
      if(!fd || !desc || !file){ r.X1.push(w + ': a font object is missing'); continue; }
      if((/\/BaseFont \/(\S+)/.exec(fd) || [])[1] !== prog.font.name) r.X1.push(w + ': /BaseFont is not ' + prog.font.name);
      if(!/\/Subtype \/TrueType/.test(fd) || !/\/Encoding \/WinAnsiEncoding/.test(fd) || !/\/FirstChar 32 \/LastChar 255/.test(fd)) r.X1.push(w + ': ' + fd.slice(0, 120));
      if(!sameBytes(file.stream, prog.deflated)) r.X1.push(w + ': /FontFile2 is not the font-inter-' + w + ' block');
      if(+((/\/Length1 (\d+)/.exec(file.dict) || [])[1]) !== prog.bytes.length) r.X1.push(w + ': /Length1');
      // X2: /Widths, recomputed here from the program.
      var ws = ((/\/Widths \[([^\]]*)\]/.exec(fd) || [])[1] || '').split(' ').map(Number);
      widthsBy[w] = ws;
      if(ws.length !== 224) { r.X2.push(w + ': ' + ws.length + ' widths'); continue; }
      var notdef = F.ttfAdvance(prog.font, 0) * 1000 / prog.font.unitsPerEm;
      for(var c = 32; c <= 255; c++){
        var u = (c >= 0x80 && c <= 0x9F) ? (F.PDF_WINANSI_HI[c] || 0) : c;
        var exact = F.ttfAdvance(prog.font, F.ttfGlyph(prog.font, u)) * 1000 / prog.font.unitsPerEm;
        if(Math.abs(ws[c - 32] - exact) > 0.0005 + 1e-9) r.X2.push(w + ': code ' + c + ' is ' + ws[c - 32] + ', not ' + exact);
      }
      [0xAD, 0x83, 0x86, 0x87, 0x89, 0x8A, 0x9A, 0x8E, 0x9E, 0x9F].forEach(function (code) {
        if(Math.abs(ws[code - 32] - notdef) > 0.0005) r.X2.push(w + ': code ' + code + ' (missing from the subset) is not .notdef\'s ' + notdef);
      });
    }
    // X3 + X4: the content streams.
    for(var pi = 0; pi < pageObjs.length; pi++){
      var po = pageObjs[pi]; if(!po) continue;
      var cnum = +((/\/Contents (\d+) 0 R/.exec(po.dict) || [])[1]), cont = objs[cnum];
      if(!cont || !cont.stream) { r.X0.push('page ' + (pi + 1) + ' has no content'); continue; }
      var ops = new TextDecoder('latin1').decode(await inflate(cont.stream)).split('\n');
      var where = name + ' / ' + months[pi].label, list = lists[pi], runs = [], tc = 0;
      ops.forEach(function (op) {
        if(/NaN|Infinity|undefined/.test(op)) bad.X3.push(where + ': "' + op.slice(0, 80) + '"');
        var tcm = /^(-?[\d.]+) Tc$/.exec(op); if(tcm) tc = +tcm[1];
        var tm = /^BT \/F(\d{3}) ([\d.]+) Tf 1 0 (-?[\d.]+) 1 (-?[\d.]+) (-?[\d.]+) Tm \(((?:\\[0-7]{3}|\\.|[^\\)])*)\) Tj ET$/.exec(op);
        if(/^BT /.test(op) && !tm) bad.X3.push(where + ': an unexpected text op "' + op.slice(0, 80) + '"');
        if(tm) runs.push({wt: tm[1], size: +tm[2], x: +tm[4], y: +tm[5], lit: tm[6], tc: tc});
      });
      var texts = list.filter(function (o) { return o.k === 'text' && o.s !== ''; });
      if(runs.length !== texts.length) { bad.X4.push(where + ': ' + runs.length + ' text runs for ' + texts.length + ' texts'); continue; }
      runs.forEach(function (run, k) {
        var o = texts[k];
        if(run.lit !== F.pdfEscape(o.s)) bad.X4.push(where + ': run ' + (k + 1) + ' is (' + run.lit + '), not (' + F.pdfEscape(o.s) + ')');
        // Its width by the file's own /Widths, against the model's measure: the same to rounding.
        var codes = decodeLit(run.lit), wsF = widthsBy[run.wt] || [];
        var wPt = codes.reduce(function (a, cc) { return a + (cc >= 32 ? wsF[cc - 32] : 0) * run.size / 1000 + run.tc; }, 0);
        judgeNear('X3', where + ' run ' + (k + 1) + ' "' + o.s.slice(0, 20) + '" width', wPt, o.w * G.ptPerPx, 0.002, 'width');
      });
      // Every run inside its box; all paint inside the margins (a shrunk month's is step 4's).
      boxesOf(list).forEach(function (b) { if(b.over > 1e-6) bad.X3.push(where + ': "' + b.s + '" runs ' + b.over.toFixed(4) + ' px past its box'); });
      if(lay.pages[pi].mode === 'fill'){
        var lo = G.margin - 1e-6, hiX = G.pageW - G.margin + 1e-6, hiY = G.pageH - G.margin + 1e-6;
        list.forEach(function (o) {
          if(o.k === 'clip' || o.k === 'unclip') return;
          var x1 = o.x + (o.w || 0), y1 = o.k === 'text' ? o.y : o.y + o.h;
          if(o.x < lo || x1 > hiX || o.y < lo || y1 > hiY) bad.X3.push(where + ': ' + (o.role || o.k) + ' outside the margins');
        });
      }
      // X4: the display list carries the model.
      var m = months[pi];
      var need = [m.label].concat(m.dow.map(function (d) { return d.toUpperCase(); }));
      m.weeks.forEach(function (wk) { wk.days.forEach(function (d) { need.push(String(d.n)); }); });
      var have = texts.map(function (o) { return o.s; });
      need.forEach(function (sx) { var at = have.indexOf(sx); if(at < 0) bad.X4.push(where + ': "' + sx + '" is not drawn'); else have.splice(at, 1); });
      ['tleft', 'title', 'today', 'subtitle'].forEach(function (id) {
        var h = m.header.filter(function (x) { return x.id === id; })[0];
        if(!h || (id === 'subtitle' && h.empty && h.slot)) return;
        var drawn = texts.filter(function (o) { return o.role === 'hdr' && o.id === id; }).map(function (o) { return o.s; }).join(' ');
        if(drawn !== F.mvlFlat(h.text)) bad.X4.push(where + ': header ' + id + ' drawn "' + drawn + '" for "' + F.mvlFlat(h.text) + '"');
      });
      m.weeks.forEach(function (wk, wi) {
        wk.items.forEach(function (it, k) {
          var mine = texts.filter(function (o) { return o.wk === wi && o.i === k; });
          if(it.kind === 'note'){
            var drawnLines = mine.filter(function (o) { return o.role === 'bar-text'; }).map(function (o) { return o.s; });
            var wantLines = it.lines.filter(function (l) { return l !== ''; });
            if(!same(drawnLines, wantLines)) bad.X4.push(where + ' week ' + (wi + 1) + ' note ' + (k + 1) + ': ' + JSON.stringify(drawnLines) + ' for ' + JSON.stringify(wantLines));
          } else {
            var lbl = F.mvlFlat(it.text), head = mine.filter(function (o) { return o.role === 'bar-text'; }).map(function (o) { return o.s; }).join('');
            var cut = mine.some(function (o) { return o.role === 'bar-ell'; });
            if(cut ? lbl.indexOf(head) !== 0 : head !== lbl) bad.X4.push(where + ' week ' + (wi + 1) + ' bar ' + (k + 1) + ': drew "' + head + '" for "' + lbl + '"');
            var tagText = F.mvlFlat(it.tag || ''), tg = mine.filter(function (o) { return o.role === 'bar-tag'; }).map(function (o) { return o.s; }).join('');
            if(tagText && (cut ? tagText.indexOf(tg) !== 0 : tg !== tagText)) bad.X4.push(where + ' week ' + (wi + 1) + ' bar ' + (k + 1) + ': tag "' + tg + '" for "' + tagText + '"');
          }
        });
      });
    }
    return r;
  }
  // A PDF literal string's byte codes.
  function decodeLit(lit){
    var outC = [];
    for(var i = 0; i < lit.length; i++){
      var ch = lit[i];
      if(ch !== '\\'){ outC.push(lit.charCodeAt(i)); continue; }
      var nx = lit[i + 1];
      if(/[0-7]/.test(nx)){ outC.push(parseInt(lit.substr(i + 1, 3), 8)); i += 3; }
      else { outC.push(nx.charCodeAt(0)); i += 1; }
    }
    return outC;
  }
  // For each drawn run, how far it runs past the box it is set in (0 when it fits). The box of a bar's text is
  // its padding box less its side padding; of a day number, its cell; of a weekday, its column; of the month
  // label, the bar's content box; of a header line, its own box less padding (a single word wider than the
  // title's box overflows it in Chrome too, so the title is exempt when its line is one word).
  function boxesOf(list){
    var res = [], bars = {};
    list.forEach(function (o) { if(o.role === 'bar') bars[o.wk + ':' + o.i] = o; });
    list.forEach(function (o) {
      if(o.k !== 'text' || o.s === '') return;
      var right = null;
      if(o.role === 'bar-text' || o.role === 'bar-tag' || o.role === 'bar-ell'){
        var b = bars[o.wk + ':' + o.i];
        var padX = b.kind === 'note' ? P.note.padX : P.bar.padX;
        right = b.x + b.w - P.bar.border - padX;
      } else if(o.role === 'daynum' || o.role === 'half'){
        right = G.margin + G.pagePad + P.line + (o.d + 1) * G.dayW;
      } else if(o.role === 'dow'){
        right = G.margin + G.pagePad + P.line + (o.i + 1) * G.dayW;
      } else if(o.role === 'monthbar-text'){
        right = G.margin + G.pagePad + G.contentW - 2 * G.pagePad - P.line - P.monthBar.padX;
      }
      if(right != null) res.push({s: o.s, over: Math.max(0, o.x + o.w - right)});
    });
    return res;
  }

  // ---- the header variants: reference's first page, its header rewritten as headerFormatCss writes it ------------
  function makeVariants(refHtml){
    var dom = new DOMParser().parseFromString(refHtml, 'text/html');
    var page = dom.querySelector('.print-page');
    function variant(name, edits){
      var p = page.cloneNode(true);
      Object.keys(edits).forEach(function (id) {
        var el = p.querySelector('.hdr-line[data-mvhid="' + id + '"]'), e = edits[id];
        if('text' in e){ el.textContent = e.text; el.classList.toggle('hdr-empty', e.text === ''); }
        if('style' in e) el.setAttribute('style', e.style);
      });
      return {name: name, html: p.outerHTML, stampHits: 0};
    }
    var hi = function (c, al) {
      return 'background-color:' + c + ';width:fit-content;padding-left:4px;padding-right:4px;' +
             (al === 'center' ? 'margin-left:auto;margin-right:auto;' : al === 'right' ? 'margin-left:auto;' : 'margin-right:auto;');
    };
    return [
      variant('v-wrap', {title: {text: 'Test Show S2 Full Prelim Production Calendar for the Second Season, Revised Draft with Every Department Included'}}),
      variant('v-highlight', {tleft: {text: 'v3', style: hi('#FFFF00', 'center')}, title: {style: hi('#DAE3F3', 'center')},
                              today: {style: hi('#FBE5D6', 'right')}, subtitle: {text: 'Ten Episodes', style: hi('#E2F0D9', 'center')}}),
      variant('v-format', {tleft: {text: 'Draft 2', style: 'font-size:14px;font-weight:400;color:#C00000;text-align:right;'},
                           title: {style: 'font-size:26px;font-style:italic;text-align:left;'},
                           today: {style: 'font-size:12px;font-weight:400;'},
                           subtitle: {text: 'Prepared for the producers', style: 'font-size:20px;color:#0070C0;text-align:right;'}}),
      variant('v-stamp-wide', {today: {text: '10.08.26'}}),
      variant('v-stamp-narrow', {today: {text: '1.11.26'}}),
      cutVariant(),
    ];
    // v-cut: in week 3 (no notes) the Writer's Rm pill becomes one day, Tuesday, with a long label; in week 4 its
    // pill gains a grey tag too long for it; in week 5 a one-day hiatus band with a long label joins on Wednesday, in
    // lane 2, where first-fit puts it (the pill holds lane 1 from Monday to Friday).
    function cutVariant(){
      var p = page.cloneNode(true), weeks = p.querySelectorAll('.mv-body > .mv-week');
      var pillA = weeks[2].querySelector('.mv-bars > .mv-pill');
      pillA.setAttribute('style', pillA.getAttribute('style').replace(/grid-column:\s*\d+\s*\/\s*\d+/, 'grid-column:3 / 4'));
      pillA.textContent = 'Writer\'s Room Week 2 with a label far too long for one day';
      var pillB = weeks[3].querySelector('.mv-bars > .mv-pill');
      var tg = p.ownerDocument.createElement('span'); tg.className = 'mv-pill-block';
      tg.textContent = 'Block 2 \u00B7 Episodes 201, 202, 203, 204, 205, 206, 207, 208, 209 and 210, every one of them shot in this block, with their cast, crew, locations and vendors listed here at a length no pill can hold';
      pillB.appendChild(tg);
      var band = p.ownerDocument.createElement('div');
      band.className = 'mv-bar mv-hiatus-bar';
      band.setAttribute('style', 'grid-column:4 / 5; grid-row:2;background:#FF0000; color:#FFFFFF;');
      band.textContent = 'A hiatus label much too long to fit in a single day';
      weeks[4].querySelector('.mv-bars').appendChild(band);
      return {name: 'v-cut', html: p.outerHTML, stampHits: 0};
    }
  }

  // HARNESS_STATE: the calendar's own print document, captured as monthprint captures it, its stamp pinned.
  async function captureFresh(){
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); },
                  'the restored calendar', 200, 100);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, 'the calendar to settle', 200, 100);
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    var printed = null, calls = 0, realPrint = window.print;
    var before = new Date();
    window.print = function () { calls++; var h = document.getElementById('print-root'); printed = h ? h.innerHTML : null; };
    T.monthPrintPath();   // the PRINT path: this leg reads the print document (MONTH-PDF-WRITER-PLAN.md step 5)
    document.getElementById('export-btn').click();
    await T.until(function () { return calls > 0; }, 'the print call', 200, 100);
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint;
    if(!printed) throw new Error('no print document was captured');
    var hits = 0;
    [before, new Date()].forEach(function (d) {
      var m = d.getMonth() + 1, day = d.getDate(), yy = String(d.getFullYear()).slice(2);
      [m + '.' + String(day).padStart(2, '0') + '.' + yy, m + '.' + day + '.' + yy].forEach(function (form) {
        var parts = printed.split(form); hits += parts.length - 1; printed = parts.join(STAMP);
      });
    });
    return {html: printed, hits: hits};
  }
})(); });
