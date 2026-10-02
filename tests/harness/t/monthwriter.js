// monthwriter -- the month-PDF writer's FIT (MONTH-PDF-WRITER-PLAN.md §8 step 4, ruling 3), and the A/B leg that holds
// the writer's PDF to the print path's (plan §5.2).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_PRINT_PDF=1 ./run.sh monthwriter 300                          tier 1
//   HARNESS_PAGE=/dist/index.html HARNESS_PRINT_PDF=1 HARNESS_STATE=<fixture> ./run.sh monthwriter 300  one calendar
//   python3 monthab.py monthwriter.json monthwriter.print.pdf [--sheets <dir>]      the A/B judge, outside the page
//
// ONE RUN, THREE THINGS, sharing one build, one date, one window and one set of preferences (plan §5.2): the print
// documents (tier 1's gate-10 baselines, or a calendar's own, captured as monthprint captures it), the writer's PDF of
// each, and Chrome's REAL print of the same documents, which run.sh's HARNESS_PRINT_PDF=1 makes once the leg has left
// the page in print state. The today stamp is pinned in every document first ("9.22.26", as monthemit pins it), so the
// two PDFs carry the same date and the controls can compare bytes.
//
// HOW IT SEES THE CODE ("slice it, no hook", as monthemit). The writer -- the model, the emitter, and step 4's fit
// before buildMonthPdf -- is sliced verbatim out of src/legacy/app.js with the frozen primitives it calls and the
// engine's MV_MIN_LANES, and run on each document's months. ?src=<path> slices a copy (HARNESS_QUERY=src=...), so a
// mutant lives in a throwaway file and src/legacy/app.js is never edited to make one.
//
// THREE ORACLES HOLD THE FIT, and none of them is the writer's own code:
//  - THE PRINT PATH'S FIT TABLE, which exportMonthPdf writes into every week of the document (flex basis and grow, or a
//    height when it scales). A month that fits must give the same basis and grow to every week whose notes the print
//    path measured as the writer lays them out (the owner's ruling: "exactly as today's print path does").
//  - THE PRINT PATH'S MEASUREMENT, re-run here exactly as exportMonthPdf runs it: the document off-screen at 996 px in
//    SCREEN media, the affordances print hides hidden, each bar layer's lanes content-sized. It reproduces the table
//    (C0), and it says which notes print measured at another width than it prints, or at another span: the only reasons
//    a week may differ from the table, with a blank band (owner ruling 5).
//  - CHROME'S LAYOUT OF THE WRITER'S OWN DECISIONS: each document re-spanned to the writer's lanes, every note set in the
//    writer's lines, the weeks at the writer's rows, a shrunk month restyled at its factor (the app's computed print
//    styles times k), laid out with the app's print rules transplanted into screen media as monthemit transplants
//    them. Every box and baseline the writer draws must be where Chrome puts it (A3), and Chrome's own measure of the
//    same lanes, put through the print path's rule AS THIS LEG WRITES IT, must give the writer's rows (A2).
// The cross-PDF checks -- the writer's file against Chrome's print, page by page: structure, text, the grid's lines
// from both files' vector coordinates, and the pixel heat maps and contact sheets for the owner -- are monthab.py's.
//
// CASES (each judged over every document)
//   S0  the writer, MV_MIN_LANES and the frozen primitives slice verbatim out of src/legacy/app.js and evaluate
//   F0  only the month export (exportMonthPdfDirect, since step 5) calls the writer, and only through its public
//       entry points; nothing else in app.js uses a name the writer defines
//   C0  CONTROL: the print path's measurement, re-run here, gives every week exactly the basis (or the shrunk height)
//       the print path wrote into the document, and the scaled oracle's base sizes are the app's computed print styles
//   A0  every month that fits: each week the print path measured as the writer lays it out gets the table's basis and
//       grow (1 px); each other week holds a note measured at another span or line count, or a blank band
//   A1  every month whose weeks all keep the table: its rows are Chrome's print layout's (0.02 px)
//   A2  every month that fits: Chrome's measure of the writer's own lanes, through the print path's rule, gives the
//       writer's rows (0.02 px)
//   A3  every box the writer draws is where Chrome lays out the writer's decisions (boxes 0.03 px, starts 0.05 px,
//       baselines 0.03 px): the weeks, the cells and their lines, the day numbers and ½, every bar, its text, its tag,
//       a note line by line, and the frame's foot; in every month, a shrunk one at its factor
//   A4  a shrunk month: exactly where the print path shrinks one; one factor in (0, 1), a whole number of 64ths, the
//       largest that fits; its rows fill the page and hold their lanes; every text in its weeks at the factor; every
//       note re-wrapped as Chrome's own breaker wraps it on the same program at the smaller size, and every week
//       re-packed by first-fit at the new spans (this leg's own first-fit, not the writer's)
//   A5  every band whose label was emptied is as tall as a labelled band at its month's factor, and draws no text
//   X0  the files: one /Page per month at 792 x 612, every number finite, every text run inside its box, all paint
//       inside the margins -- a shrunk month's too, now
//   R0  determinism: the fit is the same twice and through JSON; the bytes are the same twice and through JSON
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info, pdfs: {}};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var fromState = /[?&]state=/.test(location.search);
  var BASE = '/tests/baselines/2026-09-22-monthprint/';
  var TIER1 = ['reference', 'dayoverrides', 'mvheader', 'mvheaderlegacy', 'blocks', 'dayoverrides-onhalf', 'month-lanecap', 'hiatus-blanklabel'];
  var STAMP = '9.22.26';
  // exportMonthPdf's own numbers for its measurement, written here independently of the writer's copies.
  var PRINT_W = Math.round((11 - 2 * 8 / 25.4) * 96), ROW_FLOOR = 38 + 19, LANE = 19, CHROME_PAD = 38;
  // The shrink factor's step, stated here and never read from the writer: a mutant that changed the writer's own step
  // would otherwise pass its own test (mutant S3 did, until this line).
  var STEPS = 64;
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function near(a, b, tol){ return typeof a === 'number' && typeof b === 'number' && isFinite(a) && isFinite(b) && Math.abs(a - b) <= tol; }
  function r3(v){ return Math.round(v * 1000) / 1000; }
  var bad = {C0: [], A0: [], A1: [], A2: [], A3: [], A4: [], A5: [], X0: [], R0: []}, worst = {};
  function track(cat, d){ if(!(cat in worst) || d > worst[cat]) worst[cat] = Math.round(d * 1e4) / 1e4; }
  function judgeNear(cat, sub, where, mine, theirs, tol){
    var d = Math.abs(mine - theirs);
    track(cat + ':' + sub, isFinite(d) ? d : 1e9);
    if(!near(mine, theirs, tol)) bad[cat].push(where + ': ' + r3(mine) + ' vs ' + r3(theirs));
  }
  var styles = [];
  // The sizes a shrunk page's restyle multiplies by its factor: the app's print styles, which C0 holds to Chrome's
  // computed styles. (Up here, not beside scaledCss: a `var` after T.done() is hoisted without its value.)
  var BASE_STYLE = {cellPadTop: 3, cellFont: 14, dayNum: 11, barsPadTop: 24, barsPadBottom: 14, rowGap: 2, laneMin: 17,
                    barFont: 10, barPadY: 1, radius: 9, notePadY: 2, tagFont: 9};
  try {
    await T.appReady();

    // ---- S0: the slice ----------------------------------------------------------------------------------------------
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
    var minLanesSrc = slice('const MV_MIN_LANES = ', ';', 'MV_MIN_LANES');
    var primSrc = slice('function ttfRead(bytes){', 'pipeThrough(cs)).arrayBuffer());\n  }', 'the frozen primitives (ttfRead..pdfDeflate)');
    var writerSrc = slice('  const MVL_GEOMETRY = (function(){',
      "return { tag: 'F' + w, ttf: fonts[w].font, raw: fonts[w].bytes, deflated: fonts[w].deflated };\n    }));\n  }",
      'the writer (MVL_GEOMETRY..buildMonthPdf)');
    var F = new Function("'use strict';\n" + dayMsSrc + '\n' + isoSrc + '\n' + minLanesSrc + '\n' + primSrc + '\n' + writerSrc +
      '\nreturn {G: MVL_GEOMETRY, P: MVL_PAINT, MV_MIN_LANES: MV_MIN_LANES, loadInterPdfFont: loadInterPdfFont,' +
      ' mvlMonthLayout: mvlMonthLayout, fitMonthLayout: fitMonthLayout, buildMonthPdf: buildMonthPdf, mvlPaintMonth: mvlPaintMonth,' +
      ' mvlWeekPaint: mvlWeekPaint, mvlWeekNeed: mvlWeekNeed, mvlShrinkWeeks: mvlShrinkWeeks, mvlFitNumbers: mvlFitNumbers,' +
      ' mvlTextWidth: mvlTextWidth, mvlFlat: mvlFlat};')();
    add('S0', 'the writer (model, emitter and fit), MV_MIN_LANES and the frozen primitives slice verbatim out of src/legacy/app.js and evaluate',
        typeof F.fitMonthLayout === 'function' && typeof F.buildMonthPdf === 'function' && F.MV_MIN_LANES === 4,
        {writerChars: writerSrc.length, MV_MIN_LANES: F.MV_MIN_LANES}, 'the slice evaluates');

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
        usedOut.length === 0 && NAMES.indexOf('mvlFitMonth') >= 0 && same(usedByExport, PUBLIC) && same(counts, [3, 2, 2, 2, 2]),
        {usedOutside: usedOut, usedByExport: usedByExport, namesDeclared: NAMES.length, entryPointOccurrences: counts},
        {usedOutside: [], usedByExport: PUBLIC, entryPointOccurrences: [3, 2, 2, 2, 2]});

    var G = F.G, P = F.P, fonts = {};
    for(var fw of ['400', '500', '600', '700']) fonts[fw] = await F.loadInterPdfFont(fw);
    var noteWidthOf = function (s) { return F.mvlTextWidth(fonts['500'].font, s, G.noteFontPx); };
    var ascentAt = function (size) { return Math.round(fonts['400'].font.ascent * size / fonts['400'].font.unitsPerEm); };

    // ---- the documents, stamp pinned ------------------------------------------------------------------------------
    var docs = [];
    if(!fromState){
      for(var di = 0; di < TIER1.length; di++){
        var r = await fetch(BASE + TIER1[di] + '.html', {cache: 'no-store'});
        if(!r.ok) throw new Error('no baseline ' + TIER1[di] + '.html');
        var raw = await r.text();
        docs.push({name: TIER1[di], html: raw.split('DATESTAMP').join(STAMP), stampHits: raw.split('DATESTAMP').length - 1});
      }
    } else {
      var cap = await captureFresh();
      docs.push({name: ((location.search.match(/[?&]state=([^&]+)/) || [])[1] || 'fresh').replace(/[^\w-]/g, '_'), html: cap.html, stampHits: cap.hits});
    }
    info.stampHits = docs.map(function (d) { return d.name + ':' + d.stampHits; });
    info.tz = {zone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMin: new Date().getTimezoneOffset()};
    info.window = [window.innerWidth, window.innerHeight];
    // The print document itself, for the window control: two windows must give different documents (the print path's
    // note spans and rows follow the window) but the same writer PDF.
    info.docHash = await Promise.all(docs.map(async function (d) {
      var h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d.html)));
      return d.name + ':' + Array.prototype.map.call(h.slice(0, 8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }));

    // ---- the print path's measurement, re-run (before anything else is styled) --------------------------------------
    docs.forEach(function (d) { d.measured = printMeasure(d.html); });

    // ---- Chrome's print layout: the app's print rules in screen media, plus the ruled blank band ------------------------
    var transplanted = transplantPrintRules();
    // ⛔ The owner's ruling 5 (1 Oct 2026, "Full height"), the one rule here that is not the app's: an emptied band keeps
    // its line box. ON for the writer's decisions (A2, A3), OFF for the print path's own layout (A1), which keeps print's
    // 4 px strip, as today's print does. A zero-width space IS that line box.
    var ruled = addStyle('#print-root .mv-bar:empty::before{content:"\\200B"}');
    var scaledSheet = addStyle('');
    await Promise.all(['400 16px Inter', '500 10px Inter', '600 10px Inter', '700 20px Inter', 'italic 700 22px Inter']
                      .map(function (f) { return document.fonts.load(f); }));
    // Chrome's own line breaker on the PDF's program, for the re-wrapped notes (as monthlayout's W0 runs it).
    var probeFace = new FontFace('MVW Probe Inter 500', fonts['500'].bytes.slice().buffer, {weight: '500', style: 'normal'});
    await probeFace.load(); document.fonts.add(probeFace);

    var totals = {documents: 0, months: 0, weeks: 0, fillMonths: 0, keptMonths: 0, shrunkMonths: 0, keptWeeks: 0, changedWeeks: 0,
                  explainedBy: {span: 0, lines: 0, blankBand: 0}, bars: 0, texts: 0, blankBands: 0, rewrapped: 0};
    var perDoc = [], ab = {docs: [], printPages: 0}, baseCheck = null;

    for(var dk = 0; dk < docs.length; dk++){
      var doc = docs[dk], pages = parseDoc(doc.html);
      if(pages.length !== doc.measured.length) throw new Error(doc.name + ': ' + pages.length + ' pages but ' + doc.measured.length + ' measured');
      var months = pages.map(function (pg) { return F.mvlMonthLayout(pg.inner, noteWidthOf); });
      var layout = {geometry: G, months: months};
      var fitted = F.fitMonthLayout(layout, fonts);
      var again = F.fitMonthLayout(layout, fonts), viaJson = F.fitMonthLayout(JSON.parse(JSON.stringify(layout)), fonts);
      if(!same(fitted, again) || !same(fitted, viaJson)) bad.R0.push(doc.name + ': the fit is not the same twice and through JSON');
      ruled.disabled = true;
      var printLay = chromeLayout(doc.html, null);
      ruled.disabled = false;
      if(!baseCheck) baseCheck = checkBaseStyles(printLay);
      var natural = chromeNatural(pages, fitted);
      var drawn = chromeLayout(pages.map(function (pg, pi) { return decidePage(pg.el, fitted.months[pi], 'drawn', pi).outerHTML; }).join(''),
                               fitted.months);
      var dt = {name: doc.name, months: []};
      fitted.months.forEach(function (m, pi) {
        var where0 = doc.name + ' / ' + m.label, pg = pages[pi], meas = doc.measured[pi], model = months[pi];
        totals.months++; totals.weeks += m.weeks.length;
        var full = model.weeks.map(function (wk) { var n = F.mvlWeekNeed(wk.items, F.mvlWeekPaint(1)); return {basis: Math.max(n.h, ROW_FLOOR), lanes: n.lanes}; });
        // C0: the measurement re-run IS the print path's.
        pg.table.forEach(function (t, wi) {
          var want = pg.mode === 'scale' ? t.height : t.basis;
          if(!(meas[wi] && meas[wi].reqH === want)) bad.C0.push(where0 + ' week ' + (wi + 1) + ': measured ' + (meas[wi] && meas[wi].reqH) + ', the document says ' + want);
        });
        // Which weeks keep the table, and why the others do not.
        var weekInfo = m.weeks.map(function (wk, wi) {
          var t = pg.table[wi], basisNow = full[wi].basis;
          var tBasis = pg.mode === 'scale' ? t.height : t.basis;
          var kept = near(basisNow, tBasis, 1) && (pg.mode === 'scale' || m.fit.mode !== 'fill' || near(m.fit.grow[wi], t.grow, 1));
          var why = [];
          model.weeks[wi].items.forEach(function (it, k) {
            var mk = meas[wi].items[k];
            if(!mk) return;
            if(it.kind === 'note'){
              if(mk.span !== it.lanes) why.push('span');
              if(mk.lines !== it.lines.length) why.push('lines');
            } else if(it.kind === 'hiatus' && F.mvlFlat(it.text) === '' && F.mvlFlat(it.tag || '') === '') why.push('blankBand');
          });
          return {kept: kept, why: why.filter(function (w, i, a) { return a.indexOf(w) === i; }), tableBasis: tBasis, basis: basisNow};
        });
        var allKept = weekInfo.every(function (w) { return w.kept; });
        // A4 (mode): the writer shrinks exactly the months the print path shrinks, unless a changed week explains it.
        var shrunk = m.fit.mode === 'shrink';
        if(shrunk !== (pg.mode === 'scale') && allKept) bad.A4.push(where0 + ': the writer ' + (shrunk ? 'shrinks' : 'fits') + ' a month print ' + (pg.mode === 'scale' ? 'scales' : 'fits'));
        if(m.fit.mode === 'fill'){
          totals.fillMonths++;
          // A0: the table, week by week.
          weekInfo.forEach(function (w, wi) {
            if(w.kept){ totals.keptWeeks++; return; }
            totals.changedWeeks++;
            w.why.forEach(function (k) { totals.explainedBy[k]++; });
            if(!w.why.length) bad.A0.push(where0 + ' week ' + (wi + 1) + ': basis ' + r3(m.fit.basis[wi]) + '/g' + r3(m.fit.grow[wi]) +
                                          ' against the table\'s ' + pg.table[wi].basis + '/g' + pg.table[wi].grow + ', with no note measured differently');
          });
          // A1: a month whose every week keeps the table gets Chrome's rows.
          if(allKept && pg.mode === 'fill'){
            totals.keptMonths++;
            m.fit.rows.forEach(function (h, wi) { judgeNear('A1', 'row', where0 + ' week ' + (wi + 1), h, printLay.pages[pi].rows[wi], 0.02); });
          }
          // A2: the print path's rule, as this leg writes it, over Chrome's measure of the writer's lanes.
          var nat = natural[pi], room = G.margin + G.contentH - G.pagePad - P.line - printLay.pages[pi].bodyTop;
          var basis = nat.map(function (n) { return Math.max(n.barsH, ROW_FLOOR); });
          var nice = nat.map(function (n) { return CHROME_PAD + Math.max(n.tracks, 4) * LANE; });
          var grow = basis.map(function (b, i) { return Math.max(0, nice[i] - b); });
          if(!grow.some(function (g) { return g > 0; })) grow = nice.slice();
          var gs = grow.reduce(function (a, b) { return a + b; }, 0), free = room - basis.reduce(function (a, b) { return a + b; }, 0);
          basis.forEach(function (b, wi) { judgeNear('A2', 'row', where0 + ' week ' + (wi + 1), m.fit.rows[wi], b + free * grow[wi] / gs, 0.02); });
          judgeNear('A2', 'room', where0 + ' room', m.fit.room, room, 0.02);
        } else {
          totals.shrunkMonths++;
          checkShrunk(where0, m, model, pg, natural[pi]);
        }
        // A3: every box, against Chrome's layout of the writer's decisions.
        var list = F.mvlPaintMonth(m, fonts), a3Before = bad.A3.length;
        compareDrawn(where0, m, drawn.pages[pi], list);
        // Which months A3 fails in, and how: `first` holds only eight failures, and an error that ADDS UP down
        // a month (it found Chrome's 1/64 px truncation) shows only when the failures are seen month by month.
        if(bad.A3.length > a3Before){ info.a3ByMonth = info.a3ByMonth || {}; info.a3ByMonth[where0] = {n: bad.A3.length - a3Before, mode: m.fit.mode, first: bad.A3.slice(a3Before, a3Before + 3)}; }
        // A5: blank bands.
        var S = F.mvlWeekPaint(m.fit.scale);
        m.weeks.forEach(function (wk, wi) {
          wk.items.forEach(function (it, k) {
            totals.bars++;
            if(it.kind !== 'hiatus' || F.mvlFlat(it.text) !== '' || F.mvlFlat(it.tag || '') !== '') return;
            totals.blankBands++;
            var bar = list.filter(function (o) { return o.role === 'bar' && o.wk === wi && o.i === k; })[0];
            var want = S.bar.size * S.lineHeight + 2 * (S.bar.padY + S.bar.border);
            if(!bar || !near(bar.h, want, 1e-9)) bad.A5.push(where0 + ' week ' + (wi + 1) + ' bar ' + (k + 1) + ': a blank band ' + (bar ? r3(bar.h) : 'not drawn') + ' px tall, not ' + r3(want));
            if(list.some(function (o) { return o.k === 'text' && o.wk === wi && o.i === k; })) bad.A5.push(where0 + ' week ' + (wi + 1) + ' bar ' + (k + 1) + ': a blank band with text');
          });
        });
        dt.months.push({label: m.label, mode: m.fit.mode, printMode: pg.mode, scale: m.fit.scale, printScale: pg.scale,
                        kept: allKept, changed: weekInfo.filter(function (w) { return !w.kept; }).map(function (w, i) { return w.why.join('+') || '?'; }),
                        blankBands: m.weeks.reduce(function (a, wk) { return a + wk.items.filter(function (it) { return it.kind === 'hiatus' && F.mvlFlat(it.text) === '' && F.mvlFlat(it.tag || '') === ''; }).length; }, 0),
                        rows: m.fit.rows.map(r3), printRows: printLay.pages[pi].rows.map(r3)});
      });
      // The file, built twice and through JSON.
      var bytes = await F.buildMonthPdf(fitted), bytes2 = await F.buildMonthPdf(fitted);
      var bytes3 = await F.buildMonthPdf(JSON.parse(JSON.stringify(fitted)));
      if(!sameBytes(bytes, bytes2) || !sameBytes(bytes, bytes3)) bad.R0.push(doc.name + ': the bytes are not the same twice and through JSON');
      await checkFile(doc.name, bytes, fitted);
      out.pdfs[doc.name] = b64(bytes);
      dt.bytes = bytes.length;
      perDoc.push(dt);
      ab.docs.push({name: doc.name, file: 'monthwriter.' + doc.name + '.pdf', firstPrintPage: ab.printPages + 1, months: dt.months});
      ab.printPages += fitted.months.length;
      totals.documents++;
    }
    info.documents = perDoc;
    info.totals = totals;
    info.worst = worst;
    info.transplantedRules = transplanted;
    info.baseStyles = baseCheck;
    info.ab = ab;

    function judged(id, title, list, extra){
      add(id, title, list.length === 0 && totals.months > 0, {failures: list.length, first: list.slice(0, 8), detail: extra}, 'no failures');
    }
    if(baseCheck && baseCheck.bad.length) baseCheck.bad.forEach(function (s) { bad.C0.push('base style ' + s); });
    judged('C0', "CONTROL: the print path's measurement, re-run, gives every week the document's own basis, and the scaled oracle's sizes are the app's computed print styles", bad.C0,
           {weeks: totals.weeks, baseStyles: baseCheck && baseCheck.seen});
    judged('A0', "every month that fits: the fit table's basis and grow wherever the print path measured the notes as the writer lays them out, and an explanation everywhere else", bad.A0,
           {keptWeeks: totals.keptWeeks, changedWeeks: totals.changedWeeks, explainedBy: totals.explainedBy});
    judged('A1', "every month whose weeks all keep the table: its rows are Chrome's print layout's, to 0.02 px", bad.A1,
           {keptMonths: totals.keptMonths, fillMonths: totals.fillMonths, worst: pick(worst, 'A1')});
    judged('A2', "every month that fits: Chrome's measure of the writer's own lanes, through the print path's rule, gives the writer's rows", bad.A2,
           {fillMonths: totals.fillMonths, worst: pick(worst, 'A2')});
    judged('A3', "every box the writer draws is where Chrome lays out the writer's decisions, shrunk months at their factor", bad.A3,
           {bars: totals.bars, texts: totals.texts, worst: pick(worst, 'A3')});
    judged('A4', "a shrunk month: exactly where print shrinks one; the largest factor that fits; rows that fill the page and hold their lanes; text at the factor; notes re-wrapped as Chrome wraps them", bad.A4,
           {shrunkMonths: totals.shrunkMonths, rewrapped: totals.rewrapped, factors: perDoc.map(function (d) { return d.months.filter(function (m) { return m.mode === 'shrink'; }).map(function (m) { return d.name + ' ' + m.label + ' ' + r3(m.scale) + ' (print ' + m.printScale + ')'; }); }).reduce(function (a, b) { return a.concat(b); }, [])});
    judged('A5', 'every band whose label was emptied prints as tall as a labelled band at its factor, with no text (owner ruling 5)', bad.A5, {blankBands: totals.blankBands});
    judged('X0', 'the files: a /Page per month at 792 x 612, every number finite, every run inside its box, all paint inside the margins', bad.X0);
    judged('R0', 'the fit is the same twice and through JSON, and so are the bytes', bad.R0);
    out.errors = (T.appHealth().errors || []).slice(0, 10);
    add('E0', 'no console errors', out.errors.length === 0, out.errors, []);

    // ⭐ PRINT STATE, for HARNESS_PRINT_PDF: Chrome prints the page when the virtual budget runs out. Every document, its
    // stamp pinned, one after another (each .print-page is one sheet), and this leg's own stylesheets REMOVED first, so
    // print media sees only the app's. That print is the "print" half of monthab.py's A/B.
    styles.forEach(function (st) { st.remove(); });
    var host = document.getElementById('print-root');
    host.style.cssText = '';
    host.innerHTML = docs.map(function (d) { return d.html; }).join('');
    document.body.classList.add('printing-calendar');
    info.leftInPrintState = true;
  } catch (e) {
    out.EX = String(e && e.stack || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);

  // ==================================================================================================================
  function pick(o, prefix){ var res = {}; Object.keys(o).forEach(function (k) { if(k.indexOf(prefix) === 0) res[k] = o[k]; }); return res; }
  function sameBytes(a, b){ if(a.length !== b.length) return false; for(var i = 0; i < a.length; i++) if(a[i] !== b[i]) return false; return true; }
  function b64(u8){ var s = ''; for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function latin1(u8){ var s = ''; for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }
  function addStyle(css){ var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); styles.push(st); return st; }

  // A document's pages, without layout: each page's element, its HTML, and the print path's fit table for it.
  function parseDoc(html){
    var dom = new DOMParser().parseFromString('<div id="mvw-root">' + html + '</div>', 'text/html');
    return Array.prototype.map.call(dom.querySelectorAll('#mvw-root > .print-page'), function (page) {
      var body = page.querySelector('.mv-body'), sm = /scaleY\(([\d.]+)\)/.exec(body.getAttribute('style') || '');
      var table = Array.prototype.map.call(body.querySelectorAll(':scope > .mv-week'), function (w) { return fitEntry(w.getAttribute('style') || ''); });
      return {el: page, inner: page.innerHTML, mode: sm ? 'scale' : 'fill', scale: sm ? +sm[1] : 1, table: table};
    });
  }
  // A week's inline fit, as Chrome serialised what exportMonthPdf set: `flex: <grow> 0 <basis>px` in fill mode (the three
  // longhands come back as the shorthand), `height: <h>px` in scale mode.
  function fitEntry(st){
    var d = {};
    st.split(';').forEach(function (kv) { var i = kv.indexOf(':'); if(i > 0) d[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); });
    if(d.height) return {height: parseFloat(d.height)};
    if(d.flex){ var p = d.flex.split(/\s+/); return {grow: parseFloat(p[0]), basis: parseFloat(p[2])}; }
    if('flex-grow' in d) return {grow: parseFloat(d['flex-grow']), basis: parseFloat(d['flex-basis'])};
    return {};
  }

  // The print path's measurement, re-run exactly as exportMonthPdf runs it: the document in #print-root, shown off-screen
  // at PRINT_W in SCREEN media with only the app's own styles, the affordances print hides hidden, and each bar layer's
  // lanes content-sized while it is read. Per week: the basis it took (the bar layer's scrollHeight, ceiled, never under
  // 57) and, per bar in placement order, the span the document gave it and, for a note, how many lines it took there
  // (read once the lanes are measured, with the note top-aligned so its box is its text).
  function printMeasure(html){
    var host = document.getElementById('print-root'), prev = host.style.cssText;
    host.innerHTML = html;
    host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:' + PRINT_W + 'px;';
    try {
      host.querySelectorAll('.mv-arrow, .mv-tools, .mv-note-add, .mv-row-expand').forEach(function (el) { el.style.display = 'none'; });
      return Array.prototype.map.call(host.querySelectorAll(':scope > .print-page'), function (page) {
        return Array.prototype.map.call(page.querySelectorAll('.mv-body > .mv-week'), function (wk) {
          var bars = wk.querySelector('.mv-bars');
          if(!bars) return {reqH: ROW_FLOOR, items: []};
          var prevGAR = bars.style.gridAutoRows;
          bars.style.gridAutoRows = 'minmax(17px, auto)';
          var reqH = Math.max(Math.ceil(bars.scrollHeight), ROW_FLOOR);
          var items = Array.prototype.map.call(bars.querySelectorAll(':scope > .mv-bar:not(.mv-note-add)'), function (b) {
            var gr = /grid-row:\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/.exec(b.getAttribute('style') || '');
            var o = {note: b.classList.contains('mv-note-block'), span: gr && gr[2] ? +gr[2] : 1};
            if(o.note){ b.style.alignSelf = 'start'; o.lines = Math.round((b.getBoundingClientRect().height - 6) / 13); }
            return o;
          });
          bars.style.gridAutoRows = prevGAR;
          return {reqH: reqH, items: items};
        });
      });
    } finally { host.innerHTML = ''; host.style.cssText = prev; }
  }

  // The app's own @media print rules for #print-root, copied into a screen stylesheet (as monthemit copies them: selector
  // by selector, since the minifier merges rules with equal declarations into one comma list).
  function transplantPrintRules(){
    var css = [];
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      if(styles.indexOf(sh.ownerNode) >= 0) return;
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
    addStyle(css.join('\n'));
    return css.length;
  }

  // A page with the writer's decisions written into it: every bar at the writer's lane and span, every note's text as
  // the writer's lines (white-space:pre, so Chrome keeps them), and -- `how` = 'drawn' -- every week at the writer's row
  // with the print path's flex and scale taken off; 'natural' leaves the weeks at their own height instead. A shrunk
  // page is tagged for its restyle.
  function decidePage(pageEl, m, how, pi){
    var p = pageEl.cloneNode(true), body = p.querySelector('.mv-body');
    body.classList.remove('mv-scaled');
    body.setAttribute('style', how === 'natural' ? 'display:block' : '');
    var weekEls = body.querySelectorAll(':scope > .mv-week');
    if(weekEls.length !== m.weeks.length) throw new Error(m.label + ': ' + weekEls.length + ' weeks in the document, ' + m.weeks.length + ' in the model');
    // ⚠️ Chrome keeps a length on a 1/64 px grid, so a row given as its exact height is truncated to the grid, and the
    // error ADDS UP down the month (measured: 0.03-0.045 px by the fourth week, past the box tolerance). So each row is
    // given as the difference of its ROUNDED cumulative edges: every week top lands within 1/128 px of the writer's.
    var q = function (v) { return Math.round(v * 64) / 64; }, cum = 0;
    m.weeks.forEach(function (wk, wi) {
      var h = q(cum + m.fit.rows[wi]) - q(cum); cum += m.fit.rows[wi];
      weekEls[wi].setAttribute('style', how === 'natural' ? '' : 'flex:none; height:' + h + 'px; min-height:0;');
      var bars = weekEls[wi].querySelectorAll(':scope > .mv-bars > .mv-bar:not(.mv-note-add)');
      if(bars.length !== wk.items.length) throw new Error(m.label + ' week ' + (wi + 1) + ': ' + bars.length + ' bars, ' + wk.items.length + ' items');
      wk.items.forEach(function (it, k) {
        var b = bars[k], st = (b.getAttribute('style') || '').replace(/grid-row:\s*[^;]*/, 'grid-row:' + (it.lane + 1) + ' / span ' + it.lanes);
        if(it.kind === 'note'){ b.textContent = it.lines.join('\n'); st += ';white-space:pre'; }
        b.setAttribute('style', st);
      });
    });
    if(m.fit.scale !== 1) p.setAttribute('data-mvw-k', String(pi));
    return p;
  }
  // A shrunk page's restyle: every size the owner's ruling scales, as the app's own computed print style times k
  // (BASE_STYLE, at the top: checkBaseStyles holds its numbers to Chrome's computed styles of the unscaled document).
  function scaledCss(pi, k){
    var sel = '#print-root .print-page[data-mvw-k="' + pi + '"]', B = BASE_STYLE, px = function (v) { return (v * k) + 'px'; };
    return [
      sel + ' .mv-daycell{ padding-top:' + px(B.cellPadTop) + '; font-size:' + px(B.cellFont) + ' }',
      sel + ' .mv-daynum{ font-size:' + px(B.dayNum) + ' }',
      sel + ' .mv-bars{ padding-top:' + px(B.barsPadTop) + '; padding-bottom:' + px(B.barsPadBottom) + '; row-gap:' + px(B.rowGap) +
            '; grid-auto-rows:minmax(' + px(B.laneMin) + ', auto) }',
      sel + ' .mv-bar{ font-size:' + px(B.barFont) + '; padding-top:' + px(B.barPadY) + '; padding-bottom:' + px(B.barPadY) + ' }',
      sel + ' .mv-pill, ' + sel + ' .mv-hiatus-bar{ border-radius:' + px(B.radius) + ' }',
      sel + ' .mv-note-block{ padding-top:' + px(B.notePadY) + '; padding-bottom:' + px(B.notePadY) + ' }',
      sel + ' .mv-pill-block{ font-size:' + px(B.tagFont) + ' }',
    ].join('\n');
  }
  // C0's second half: the base numbers the restyle multiplies are the app's computed print styles, read off the
  // unscaled print layout (the first element of each kind any page has).
  function checkBaseStyles(lay){
    var res = {bad: [], seen: {}};
    function want(name, v, got){ res.seen[name] = got; if(got !== undefined && Math.abs(got - v) > 1e-6) res.bad.push(name + ' ' + got + ' vs ' + v); }
    lay.samples.forEach(function (s) { Object.keys(s).forEach(function (k) { if(!(k in res.seen)) want(k, BASE_STYLE[k], s[k]); }); });
    ['cellPadTop', 'cellFont', 'dayNum', 'barsPadTop', 'barsPadBottom', 'rowGap', 'laneMin', 'barFont', 'barPadY', 'radius', 'notePadY'].forEach(function (k) {
      if(!(k in res.seen)) res.bad.push(k + ' never seen');
    });
    return res;
  }

  // Chrome's measure of the writer's lanes: every page with the writer's decisions and its weeks at their natural height,
  // a shrunk page restyled at its factor, each bar layer's border-box height and how many lanes its grid made.
  function chromeNatural(pages, fitted){
    var host = document.getElementById('print-root'), prev = host.style.cssText;
    host.innerHTML = pages.map(function (pg, pi) { return decidePage(pg.el, fitted.months[pi], 'natural', pi).outerHTML; }).join('');
    host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:' + G.contentW + 'px;';
    scaledSheet.textContent = fitted.months.map(function (m, pi) { return m.fit.scale !== 1 ? scaledCss(pi, m.fit.scale) : ''; }).join('\n');
    try {
      return Array.prototype.map.call(host.querySelectorAll(':scope > .print-page'), function (page) {
        page.style.height = 'auto';
        return Array.prototype.map.call(page.querySelectorAll('.mv-body > .mv-week'), function (wk) {
          var bars = wk.querySelector(':scope > .mv-bars');
          var rows = getComputedStyle(bars).gridTemplateRows;
          return {barsH: bars.getBoundingClientRect().height, tracks: rows === 'none' ? 0 : rows.trim().split(/\s+/).length};
        });
      });
    } finally { host.innerHTML = ''; host.style.cssText = prev; scaledSheet.textContent = ''; }
  }

  // One set of pages laid out as print lays it out, measured. Coordinates are the PAPER's: CSS px from the sheet's top-left,
  // the .print-page's border box at the 8 mm margin. `fittedMonths` (the 'drawn' pages) brings each shrunk page's restyle.
  function chromeLayout(html, fittedMonths){
    var host = document.getElementById('print-root'), prev = host.style.cssText;
    host.innerHTML = html;
    host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:' + G.contentW + 'px;';
    scaledSheet.textContent = (fittedMonths || []).map(function (m, pi) { return m.fit.scale !== 1 ? scaledCss(pi, m.fit.scale) : ''; }).join('\n');
    var res = {pages: [], samples: []};
    try {
      Array.prototype.forEach.call(host.querySelectorAll(':scope > .print-page'), function (page) {
        page.style.height = G.contentH + 'px';
        var body = page.querySelector('.mv-body');
        if(!fittedMonths && /scaleY/.test(body.style.transform || '')){
          body.style.transform = ''; body.style.transformOrigin = ''; body.classList.remove('mv-scaled'); body.style.removeProperty('--mv-line-y');
        }
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
        var br = rel(body.getBoundingClientRect());
        var p = {rows: [], weekTops: [], bodyTop: br.y, body: br, weeks: []};
        Array.prototype.forEach.call(body.querySelectorAll(':scope > .mv-week'), function (wk) {
          var rc = rel(wk.getBoundingClientRect());
          p.rows.push(rc.h); p.weekTops.push(rc.y);
          p.weeks.push({
            cells: Array.prototype.map.call(wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell'), function (c) {
              var num = c.querySelector('.mv-daynum');
              return {box: rel(c.getBoundingClientRect()), borderLeft: parseFloat(getComputedStyle(c).borderLeftWidth) || 0,
                      span: rel(num.getBoundingClientRect()), num: textRects(num)[0]};
            }),
            bars: Array.prototype.map.call(wk.querySelectorAll(':scope > .mv-bars > .mv-bar:not(.mv-note-add)'), function (b) {
              var tagEl = b.querySelector('.mv-pill-block');
              return {box: rel(b.getBoundingClientRect()), text: textRects(b), tag: tagEl ? textRects(tagEl)[0] : null};
            }),
          });
        });
        // The base sizes, off an unscaled page (for checkBaseStyles).
        if(!fittedMonths){
          var s = {}, cell = page.querySelector('.mv-daycell'), dn = page.querySelector('.mv-daynum'), bars = page.querySelector('.mv-bars');
          var pill = page.querySelector('.mv-bars > .mv-pill'), note = page.querySelector('.mv-bars > .mv-note-block'), tag = page.querySelector('.mv-pill-block');
          if(cell){ var cc = getComputedStyle(cell); s.cellPadTop = parseFloat(cc.paddingTop); s.cellFont = parseFloat(cc.fontSize); }
          if(dn) s.dayNum = parseFloat(getComputedStyle(dn).fontSize);
          if(bars){ var bc = getComputedStyle(bars); s.barsPadTop = parseFloat(bc.paddingTop); s.barsPadBottom = parseFloat(bc.paddingBottom);
                    s.rowGap = parseFloat(bc.rowGap); var mm = /minmax\(([\d.]+)px/.exec(bc.gridAutoRows); if(mm) s.laneMin = parseFloat(mm[1]); }
          if(pill){ var pc = getComputedStyle(pill); s.barFont = parseFloat(pc.fontSize); s.barPadY = parseFloat(pc.paddingTop); s.radius = parseFloat(pc.borderTopLeftRadius); }
          if(note) s.notePadY = parseFloat(getComputedStyle(note).paddingTop);
          if(tag) s.tagFont = parseFloat(getComputedStyle(tag).fontSize);
          res.samples.push(s);
        }
        res.pages.push(p);
      });
    } finally { host.innerHTML = ''; host.style.cssText = prev; scaledSheet.textContent = ''; }
    return res;
  }

  // ---- A3: the display list against Chrome's layout of the writer's decisions ------------------------------------------
  function compareDrawn(where0, m, pg, list){
    var BOX = 0.03, BASE_TOL = 0.03, LEFT = 0.05, ln = P.line;
    var by = function (role) { return list.filter(function (o) { return o.role === role; }); };
    var frame = by('frame'), foot = frame.filter(function (o) { return o.h === ln && o.w > 900 && o.y > pg.bodyTop; })[0];
    if(!foot) bad.A3.push(where0 + ': no frame foot');
    else judgeNear('A3', 'box', where0 + ' frame foot', foot.y + foot.h, pg.body.y + pg.body.h, BOX);
    var firstTop = frame.filter(function (o) { return o.w === ln && o.h > 50; })[0];
    if(firstTop) judgeNear('A3', 'box', where0 + ' body top', firstTop.y, pg.bodyTop, BOX);
    var wkLines = by('week-line');
    m.weeks.forEach(function (wk, wi) {
      var cw = pg.weeks[wi], wWhere = where0 + ' week ' + (wi + 1);
      if(!cw){ bad.A3.push(wWhere + ': not laid out'); return; }
      if(wi){ var wl = wkLines.filter(function (o) { return o.wk === wi; })[0];
              if(!wl) bad.A3.push(wWhere + ': no top line'); else judgeNear('A3', 'box', wWhere + ' top', wl.y, pg.weekTops[wi], BOX); }
      wk.days.forEach(function (d, dj) {
        var cc = cw.cells[dj], dWhere = wWhere + ' day ' + (dj + 1);
        var cell = list.filter(function (o) { return o.role === 'cell' && o.wk === wi && o.d === dj; })[0];
        var pad = {x: cc.box.x + cc.borderLeft, y: cc.box.y, w: cc.box.w - cc.borderLeft, h: cc.box.h};
        if(cell) ['x', 'y', 'w', 'h'].forEach(function (k) { judgeNear('A3', 'box', dWhere + ' cell ' + k, cell[k], pad[k], BOX); });
        if(dj){ var cl = list.filter(function (o) { return o.role === 'cell-line' && o.wk === wi && o.d === dj; })[0];
                if(!cl) bad.A3.push(dWhere + ': no line'); else { judgeNear('A3', 'box', dWhere + ' line x', cl.x, cc.box.x, BOX); judgeNear('A3', 'box', dWhere + ' line h', cl.h, cc.box.h, BOX); } }
        var num = list.filter(function (o) { return o.role === 'daynum' && o.wk === wi && o.d === dj; })[0];
        if(!num || !cc.num){ bad.A3.push(dWhere + ': no day number'); return; }
        totals.texts++;
        judgeNear('A3', 'left', dWhere + ' number start', num.x, cc.num.x, LEFT);
        judgeNear('A3', 'baseline', dWhere + ' number baseline', num.y, cc.num.y + ascentAt(num.size), BASE_TOL);
        var half = list.filter(function (o) { return o.role === 'half' && o.wk === wi && o.d === dj; })[0];
        if(half) judgeNear('A3', 'left', dWhere + ' ½ after its number', half.x + half.w - (num.x + num.w), cc.span.x + cc.span.w - (cc.num.x + cc.num.w), LEFT);
      });
      if(cw.bars.length !== wk.items.length){ bad.A3.push(wWhere + ': ' + cw.bars.length + ' bars laid out for ' + wk.items.length); return; }
      wk.items.forEach(function (it, k) {
        var cb = cw.bars[k], bWhere = wWhere + ' bar ' + (k + 1) + ' (' + it.kind + ')';
        var bar = list.filter(function (o) { return o.role === 'bar' && o.wk === wi && o.i === k; })[0];
        if(!bar){ bad.A3.push(bWhere + ': not drawn'); return; }
        ['x', 'y', 'w', 'h'].forEach(function (key) { judgeNear('A3', 'box', bWhere + ' ' + key, bar[key], cb.box[key], BOX); });
        var texts = list.filter(function (o) { return o.role === 'bar-text' && o.wk === wi && o.i === k; });
        var cut = list.some(function (o) { return o.role === 'bar-ell' && o.wk === wi && o.i === k; });
        if(!texts.length) return;
        var first = texts[0], c0 = cb.text[0];
        if(!c0){ bad.A3.push(bWhere + ': drawn text Chrome has none of'); return; }
        totals.texts += texts.length;
        judgeNear('A3', 'baseline', bWhere + ' baseline', first.y, c0.y + ascentAt(first.size), BASE_TOL);
        if(it.kind === 'hiatus' && !cut) judgeNear('A3', 'centre', bWhere + ' centre', first.x + first.w / 2, c0.x + c0.w / 2, LEFT);
        else judgeNear('A3', 'left', bWhere + ' start', first.x, c0.x, LEFT);
        if(it.kind === 'note'){
          var lh = F.mvlWeekPaint(m.fit.scale).note.lineH;
          texts.forEach(function (o) {
            var c = cb.text.filter(function (rc) { return Math.round((rc.y - c0.y) / lh) === o.li; })[0];
            if(!c){ bad.A3.push(bWhere + ' line ' + (o.li + 1) + ': not laid out'); return; }
            judgeNear('A3', 'baseline', bWhere + ' line ' + (o.li + 1) + ' baseline', o.y, c.y + ascentAt(o.size), BASE_TOL);
            judgeNear('A3', 'left', bWhere + ' line ' + (o.li + 1) + ' start', o.x, c.x, LEFT);
          });
        }
        var tag = list.filter(function (o) { return o.role === 'bar-tag' && o.wk === wi && o.i === k; })[0];
        if(tag){
          if(!cb.tag) bad.A3.push(bWhere + ': a grey tag Chrome has none of');
          else { judgeNear('A3', 'baseline', bWhere + ' tag baseline', tag.y, cb.tag.y + ascentAt(tag.size), BASE_TOL);
                 judgeNear('A3', 'left', bWhere + ' tag start', tag.x + (c0.w - first.w), cb.tag.x, LEFT); }
        }
      });
    });
  }

  // ---- A4: a shrunk month ------------------------------------------------------------------------------------------
  function checkShrunk(where0, m, model, pg, nat){
    var k = m.fit.scale, FN = F.mvlFitNumbers();
    if(!(k > 0 && k < 1)) bad.A4.push(where0 + ': a factor of ' + k);
    var sum = m.fit.rows.reduce(function (a, b) { return a + b; }, 0);
    judgeNear('A4', 'fill', where0 + ' rows to the room', sum, m.fit.room, 1e-6);
    // Every row holds its lanes in full: at least its top line plus the height CHROME gives its bar layer, restyled at
    // the factor, at its natural height (the owner's ruling leaves no squeeze in a shrunk week).
    m.fit.rows.forEach(function (h, wi) {
      var need = (wi ? P.line : 0) + nat[wi].barsH;
      track('A4:holds', Math.max(0, need - h));
      if(h + 0.02 < need) bad.A4.push(where0 + ' week ' + (wi + 1) + ': a row of ' + r3(h) + ' for lanes Chrome lays out ' + r3(need) + ' tall');
    });
    // A whole number of 64ths; it fits at k, and not one 64th above.
    if(k * STEPS !== Math.round(k * STEPS)) bad.A4.push(where0 + ': a factor of ' + k + ', not a whole number of ' + STEPS + 'ths');
    var at = F.mvlShrinkWeeks(model, fonts, k, FN).reduce(function (a, w) { return a + w.h; }, 0);
    var above = F.mvlShrinkWeeks(model, fonts, Math.min(1, k + 1 / STEPS), FN).reduce(function (a, w) { return a + w.h; }, 0);
    if(!(at <= m.fit.room + 1e-9)) bad.A4.push(where0 + ': does not fit at its own factor (' + r3(at) + ' > ' + r3(m.fit.room) + ')');
    if(!(above > m.fit.room)) bad.A4.push(where0 + ': still fits a 64th above its factor, so it is not the largest');
    // Every text in its weeks at the factor.
    var base = {daynum: 11, half: 11, 'bar-text': 10, 'bar-ell': 10, 'bar-tag': 9};
    F.mvlPaintMonth(m, fonts).forEach(function (o) {
      if(o.k !== 'text' || !(o.role in base)) return;
      if(Math.abs(o.size - base[o.role] * k) > 1e-9) bad.A4.push(where0 + ': a ' + o.role + ' at ' + o.size + ' px, not ' + base[o.role] * k);
    });
    // Every week re-packed by the renderer's first-fit rule at the new spans -- a note at min(3, its lines), anything
    // else at its own -- written here independently of the writer's copy (mvlPackLanes), in placement order.
    m.weeks.forEach(function (wk, wi) {
      var used = [];
      wk.items.forEach(function (it, k) {
        var span = it.kind === 'note' ? Math.min(3, it.lines.length) : model.weeks[wi].items[k].lanes, lane = 0;
        var free = function (L) { for(var q = L; q < L + span; q++) for(var c = it.from; c <= it.to; c++) if(used[q] && used[q][c]) return false; return true; };
        while(!free(lane)) lane++;
        for(var q = lane; q < lane + span; q++){ used[q] = used[q] || {}; for(var c = it.from; c <= it.to; c++) used[q][c] = true; }
        if(it.lane !== lane || it.lanes !== span) bad.A4.push(where0 + ' week ' + (wi + 1) + ' bar ' + (k + 1) + ': lane ' + it.lane + ' / ' + it.lanes + ', first-fit says ' + lane + ' / ' + span);
      });
    });
    // Every note re-wrapped as Chrome's own breaker wraps it on the PDF's program, at the smaller size in the same box.
    m.weeks.forEach(function (wk) {
      wk.items.forEach(function (it) {
        if(it.kind !== 'note' || !String(it.text || '').trim()) return;
        totals.rewrapped++;
        var c = chromeLines(it.text, G.noteFontPx * k, G.noteLinePx * k);
        if(!same(c, it.lines)) bad.A4.push(where0 + ': "' + it.text.slice(0, 40) + '" wraps as ' + JSON.stringify(it.lines) + ', Chrome ' + JSON.stringify(c));
      });
    });
  }
  function chromeLines(text, size, lineH){
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute; left:0; top:0; visibility:hidden; margin:0; padding:0; border:0; box-sizing:content-box;' +
      'width:' + G.noteTextW + 'px; font-family:"MVW Probe Inter 500"; font-weight:500; font-style:normal; font-size:' + size + 'px;' +
      'line-height:' + lineH + 'px; white-space:pre-wrap; word-break:break-word; hyphens:manual; font-kerning:none; letter-spacing:0;' +
      'word-spacing:0; text-transform:none;';
    el.textContent = text;
    document.body.appendChild(el);
    var box = el.getBoundingClientRect(), n = Math.round(box.height / lineH), lines = [];
    for(var i = 0; i < n; i++) lines.push('');
    var tn = el.firstChild, pos = 0;
    if(tn) for(var ch of tn.data){
      if(ch !== '\n'){
        var rg = document.createRange(); rg.setStart(tn, pos); rg.setEnd(tn, pos + ch.length);
        var rs = rg.getClientRects();
        if(rs.length){ var li = Math.round((rs[0].top - box.top) / lineH); if(li >= 0 && li < n) lines[li] += ch; }
      }
      pos += ch.length;
    }
    el.remove();
    return lines.map(function (l) { return l.replace(/ +$/, ''); });
  }

  // ---- X0: the file --------------------------------------------------------------------------------------------------
  async function inflate(u8){
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  }
  async function checkFile(name, bytes, fitted){
    var s = latin1(bytes), pagesFound = 0;
    var pageRe = /\n(\d+) 0 obj\n<< \/Type \/Page \/Parent 2 0 R \/MediaBox \[0 0 792 612\] \/Resources 3 0 R \/Contents (\d+) 0 R >>\n/g, pm;
    while((pm = pageRe.exec(s))){
      pagesFound++;
      var cm = new RegExp('\\n' + pm[2] + ' 0 obj\\n<< /Length (\\d+) /Filter /FlateDecode >>\\nstream\\n').exec(s);
      if(!cm){ bad.X0.push(name + ': page ' + pagesFound + ' has no content stream'); continue; }
      var at0 = cm.index + cm[0].length, ops = latin1(await inflate(bytes.subarray(at0, at0 + +cm[1])));
      if(/NaN|Infinity|undefined/.test(ops)) bad.X0.push(name + ': page ' + pagesFound + ' writes a number that is not one');
    }
    if(pagesFound !== fitted.months.length || !/\/Count (\d+)/.test(s) || +/\/Count (\d+)/.exec(s)[1] !== fitted.months.length) bad.X0.push(name + ': ' + pagesFound + ' pages for ' + fitted.months.length + ' months');
    fitted.months.forEach(function (m) {
      var list = F.mvlPaintMonth(m, fonts), where = name + ' / ' + m.label;
      var lo = G.margin - 1e-6, hiX = G.pageW - G.margin + 1e-6, hiY = G.pageH - G.margin + 1e-6;
      list.forEach(function (o) {
        if(o.k === 'clip' || o.k === 'unclip') return;
        var x1 = o.x + (o.w || 0), y1 = o.k === 'text' ? o.y : o.y + o.h;
        if(o.x < lo || x1 > hiX || o.y < lo || y1 > hiY) bad.X0.push(where + ': ' + (o.role || o.k) + ' outside the margins');
      });
      var barsAt = {};
      list.forEach(function (o) { if(o.role === 'bar') barsAt[o.wk + ':' + o.i] = o; });
      list.forEach(function (o) {
        if(o.k !== 'text' || o.s === '') return;
        var right = null;
        if(o.role === 'bar-text' || o.role === 'bar-tag' || o.role === 'bar-ell'){
          var b = barsAt[o.wk + ':' + o.i];
          right = b.x + b.w - P.bar.border - (b.kind === 'note' ? P.note.padX : P.bar.padX);
        } else if(o.role === 'daynum' || o.role === 'half') right = G.margin + G.pagePad + P.line + (o.d + 1) * G.dayW;
        if(right != null && o.x + o.w > right + 1e-6) bad.X0.push(where + ': "' + o.s.slice(0, 24) + '" runs ' + r3(o.x + o.w - right) + ' px past its box');
      });
    });
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
      var mo = d.getMonth() + 1, day = d.getDate(), yy = String(d.getFullYear()).slice(2);
      [mo + '.' + String(day).padStart(2, '0') + '.' + yy, mo + '.' + day + '.' + yy].forEach(function (form) {
        var parts = printed.split(form); hits += parts.length - 1; printed = parts.join(STAMP);
      });
    });
    return {html: printed, hits: hits};
  }
})(); });
