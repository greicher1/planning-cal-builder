// monthlayout -- the month-PDF writer's LAYOUT MODEL (MONTH-PDF-WRITER-PLAN.md §8 step 2), held to the
// print document on tier 1, the nine gate-10 calendars.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh monthlayout 150                          tier 1, from the baselines
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture> ./run.sh monthlayout 150  one calendar, captured fresh
//
// HOW IT SEES THE MODEL (owner ruling, 1 Oct 2026: "Slice it, no hook"). The engine exposes nothing,
// and the harness has always driven the DOM rather than add debug hooks to the app. So the model's
// code -- src/legacy/app.js from `const MVL_GEOMETRY` to the end of buildMonthLayout -- is sliced out
// VERBATIM, with the frozen ttf* readers, PDF_WINANSI_HI, isoOf and DAY_MS that it calls, the way
// interfonts and prove-header-template.mjs slice their subjects. Anchored on a declaration and a
// final statement: an edit to a body is picked up, and an edit to a shape fails loudly here.
// ⚠️ What a slice cannot run is buildMonthLayout's own month walk (printingCursor, renderMonthView),
// because nothing calls it until step 5 routes the export through it. The plan's "a different window
// size identical" control proves it there. Everything it calls is proven here.
//
// WHAT THE MODEL IS HELD TO: the PRINT DOCUMENT, what exportMonthPdf hands window.print(). With no
// HARNESS_STATE that is tests/baselines/2026-09-22-monthprint/<case>.html, which gate 10 holds byte-
// identical to the live print path. blocksoff prints reference's document, so eight documents cover
// the nine calendars. With HARNESS_STATE, the leg loads that calendar and captures its print document
// the way monthprint does.
//
// ⭐ THE EXPECTED DIFFERENCES (owner, picker, 1 Oct 2026: "As listed"). Ruling 2 moves exactly one
// thing: a NOTE's lane span, which the PDF takes from its own note box rather than the screen's. So:
//   - exact: kinds, text, grey tags, fills, ink, day spans, half-day slices, day cells, header lines
//     and formats, month labels, placement order, and the LANE of every item that is not a note
//     (notes are placed last, and first-fit never moves an earlier placement);
//   - a note's span may differ, and so may its lane, but only when its own span or the span of an
//     earlier note on the same day changed (notes are one column wide);
//   - line breaks must equal Chrome's own breaker run on the SAME font program in the SAME box, with
//     kerning and hyphenation off. Against the print document they then differ only by the width, by
//     kerning and by hyphenation, and `info.spanChanges` says which, note by note.
//
// CASES (each judged over every document)
//   S0  the slice: the model and what it calls, found in src/legacy/app.js and evaluated
//   F0  nothing calls loadInterPdfFont() yet, so no Inter block is decoded at boot (or at all)
//   F1  the REAL loader decodes font-inter-500 (atob + DecompressionStream) into a program the frozen
//       ttfRead reads as PJIXRL+InterPDF-Medium, 2048 units/em; it is cached; a bad weight is refused
//   F2  a line is measured as the PDF will set it: what pdfEscape writes "?" for measures as "?"
//   G0  MVL_GEOMETRY equals this leg's own derivation from the page (Letter landscape, 8 mm), and the
//       note text width is the owner's 128.22 px
//   G1  ⭐ every CSS number MVL_GEOMETRY copies is the LIVE stylesheet's: a real printed month laid out
//       at the page's width measures W, the day column, the note box and the text width the model
//       uses, at 10 px / 500 / 13 px; and the print-only @page and .print-page rules say 8 mm and 2 px
//   P0  the model's reading of every month agrees with this leg's own reading of the same HTML,
//       done differently (regular expressions over the markup, as exportMonthPdf reads grid-row):
//       labels, header lines and formats, the weekday row, every day cell, every bar in order
//   P1  half-day slices: every pill's slices are exactly the columns its days carry the ½ mark on,
//       and no other kind of bar has any (the renderer's two half-day codes agree, read through the
//       model)
//   L0  CONTROL: the re-pack, run at the print document's OWN spans, reproduces every lane in it
//   L1  at the PDF's spans, every non-note keeps its lane, and a note moves only when its own span
//       or an earlier same-day note's span changed; a note's span is min(3, its lines)
//   W0  ⭐ every note's lines equal Chrome's own line breaker on the same program, line for line
//   W1  the same on edge cases: newlines, leading and doubled spaces, no-break spaces, words longer
//       than a line, widths just inside and just outside the box, three and four lines
//   R0  pure data: each month's model is the same twice over, and survives JSON unchanged
//   E0  no console errors
// Recorded, not judged: `info.spanChanges` (each note whose span moved, and whether the width or the
// metrics moved it, read with the FROZEN mvNoteLineCount at the PDF's box) and `info.chromeExtra`
// (where Chrome also breaks after a hyphen, a dash or a slash, which the writer does not).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var fromState = /[?&]state=/.test(location.search);
  var BASE = '/tests/baselines/2026-09-22-monthprint/';
  // Eight documents, nine calendars: blocksoff is held to reference's baseline by gate 10.
  var TIER1 = [['reference', 'reference + blocksoff'], ['dayoverrides'], ['mvheader'], ['mvheaderlegacy'],
               ['blocks'], ['dayoverrides-onhalf'], ['month-lanecap'], ['hiatus-blanklabel']];
  function decode(s){
    return String(s).replace(/&(amp|lt|gt|quot|apos|nbsp|#(\d+)|#x([0-9a-f]+));/gi, function (m, n, dec, hex) {
      if(dec) return String.fromCodePoint(parseInt(dec, 10));
      if(hex) return String.fromCodePoint(parseInt(hex, 16));
      return {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '}[n.toLowerCase()];
    });
  }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  try {
    await T.appReady();

    // ---- S0: the slice -------------------------------------------------------------------------------
    var src = await (await fetch('/src/legacy/app.js', {cache: 'no-store'})).text();
    function slice(startMark, endMark, what){
      var from = src.indexOf(startMark), to = from < 0 ? -1 : src.indexOf(endMark, from);
      if(from < 0 || to < 0) throw new Error('could not locate ' + what + ' in src/legacy/app.js: re-anchor this leg');
      if(src.indexOf(startMark, from + 1) >= 0) throw new Error(what + "'s anchor is not unique: re-anchor this leg");
      return src.slice(from, to + endMark.length);
    }
    var dayMsSrc = slice('const DAY_MS = ', ';', 'DAY_MS');
    var isoSrc = slice('function isoOf(d){', '}', 'isoOf');
    var ttfSrc = slice('function ttfRead(bytes){', 'return w * sizePt / t.unitsPerEm;\n  }', 'ttfRead..ttfTextWidth');
    var hiSrc = slice('const PDF_WINANSI_HI = {', '};', 'PDF_WINANSI_HI');
    var mvlSrc = slice('  const MVL_GEOMETRY = (function(){',
      'return { geometry: MVL_GEOMETRY, months: htmls.map(function(h){ return mvlMonthLayout(h, widthOf); }) };\n  }',
      'the layout model (MVL_GEOMETRY..buildMonthLayout)');
    // The frozen screen measurement, for info.spanChanges only: what the SCREEN's own rule would say at
    // the PDF's box, which separates the width's effect from the metrics'.
    var mnlSrc = slice('let _mvNoteMeasureEl = null;', 'return lines;\n  }', 'mvNoteLineCount');
    var F = new Function("'use strict';\n" + dayMsSrc + '\n' + isoSrc + '\n' + ttfSrc + '\n' + hiSrc + '\n' + mvlSrc + '\n' + mnlSrc +
      '\nreturn {G: MVL_GEOMETRY, loadInterPdfFont: loadInterPdfFont, mvlTextWidth: mvlTextWidth, mvlWrapText: mvlWrapText,' +
      ' mvlNoteLines: mvlNoteLines, mvlParseMonth: mvlParseMonth, mvlPackLanes: mvlPackLanes, mvlMonthLayout: mvlMonthLayout,' +
      ' buildMonthLayout: buildMonthLayout, ttfTextWidth: ttfTextWidth, mvNoteLineCount: mvNoteLineCount};')();
    add('S0', 'the layout model and what it calls are sliced verbatim out of src/legacy/app.js and evaluate',
        typeof F.mvlMonthLayout === 'function' && typeof F.buildMonthLayout === 'function',
        {modelChars: mvlSrc.length}, 'the slice evaluates');

    // ---- F0: nothing calls the model yet, so nothing decodes the Inter blocks -------------------------------
    // Every name the section defines, counted in app.js OUTSIDE THE WRITER, comment lines skipped: none
    // may appear, so the product runs exactly as before. Step 5 routes the export here and updates this.
    // ⚠️ "The writer" is the model AND step 3's emitter after it, which uses the model's names (owner
    // ruling, 1 Oct 2026, step 3). So the region runs on to the end of buildMonthPdf; the monthemit leg
    // holds the emitter's own names to the same rule.
    var code = function (s) { return s.split('\n').filter(function (l) { return !/^\s*\/\//.test(l); }).join('\n'); };
    var writerEnd = "return { tag: 'F' + w, ttf: fonts[w].font, raw: fonts[w].bytes, deflated: fonts[w].deflated };\n    }));\n  }";
    var at = src.indexOf(mvlSrc), wEnd = src.indexOf(writerEnd, at);
    var writerLen = wEnd < 0 ? mvlSrc.length : wEnd + writerEnd.length - at;
    var outside = code(src.slice(0, at) + src.slice(at + writerLen));
    var NAMES = ['MVL_GEOMETRY', 'MVL_FONT_WEIGHTS', '_mvlFonts', 'loadInterPdfFont', 'mvlPdfChar', 'mvlTextWidth', 'mvlCleanText',
                 'mvlWrapText', 'mvlNoteLines', 'MVL_MONTH_NAMES', 'mvlDecls', 'mvlHeaderFmt', 'MVL_HALF_IMAGE', 'mvlHalfColumns',
                 'mvlParseItem', 'mvlParseMonth', 'mvlPackLanes', 'mvlMonthLayout', 'buildMonthLayout'];
    var used = NAMES.filter(function (n) { return new RegExp('\\b' + n + '\\b').test(outside); });
    var defined = NAMES.filter(function (n) { return new RegExp('\\b(?:function|const|let) ' + n + '\\b').test(mvlSrc); });
    // And inside the writer too, nothing runs at boot: buildMonthLayout appears once in the whole file, as
    // its declaration, and the loader twice, as its declaration and as buildMonthPdf's one call (mutant M9
    // calls the loader from inside the section: a third).
    var once = ['loadInterPdfFont(', 'buildMonthLayout('].map(function (s) { return code(src).split(s).length - 1; });
    add('F0', 'nothing outside the writer uses a name the layout model defines, and nothing calls its entry points: the product runs as before, and no Inter block is decoded at boot, or at all, before step 5',
        used.length === 0 && defined.length === NAMES.length && once[0] === 2 && once[1] === 1,
        {usedOutside: used, definedInSection: defined.length, entryPointOccurrences: once},
        {usedOutside: [], definedInSection: NAMES.length, entryPointOccurrences: [2, 1]});

    // ---- F1: the real loader ------------------------------------------------------------------------------
    var p1 = F.loadInterPdfFont('500'), p2 = F.loadInterPdfFont(500);
    var inter = await p1;
    var refused = await F.loadInterPdfFont('450').then(function () { return false; }, function () { return true; });
    var f1 = {name: inter.font.name, unitsPerEm: inter.font.unitsPerEm, cached: p1 === p2, refused450: refused,
              ttfBytes: inter.bytes.length, deflatedBytes: inter.deflated.length};
    add('F1', 'the real loader decodes font-inter-500 lazily into the program ttfRead reads as PJIXRL+InterPDF-Medium',
        f1.name === 'PJIXRL+InterPDF-Medium' && f1.unitsPerEm === 2048 && f1.cached && f1.refused450 && f1.ttfBytes === 18004,
        f1, {name: 'PJIXRL+InterPDF-Medium', unitsPerEm: 2048, cached: true, refused450: true, ttfBytes: 18004});
    var G = F.G;
    var widthOf = function (s) { return F.mvlTextWidth(inter.font, s, G.noteFontPx); };

    // ---- F2: measured as the PDF will set it ---------------------------------------------------------
    var q = widthOf('?');
    var f2 = {
      nonWinAnsi: [widthOf('ė'), widthOf('中'), widthOf('😀')].map(function (w) { return Math.abs(w - q) < 1e-9; }),
      winAnsiHi: Math.abs(widthOf('…') - F.ttfTextWidth(inter.font, '…', 10)) < 1e-9 && Math.abs(widthOf('…') - q) > 0.1,
      latin1: Math.abs(widthOf('é') - F.ttfTextWidth(inter.font, 'é', 10)) < 1e-9,
    };
    add('F2', 'a character pdfEscape writes as "?" measures as "?"; WinAnsi text measures as itself',
        f2.nonWinAnsi.every(Boolean) && f2.winAnsiHi && f2.latin1, f2, 'all true');

    // ---- G0: the derivation ----------------------------------------------------------------------------
    var mm = 96 / 25.4, mine = {};
    mine.contentW = 11 * 96 - 2 * 8 * mm;
    mine.weekW = mine.contentW - 2 * 2 - 2 * 2;
    mine.dayW = mine.weekW / 7;
    mine.trackW = (mine.weekW - 2 * 3) / 7;
    mine.noteBoxW = mine.trackW - 2 * 1;
    mine.noteTextW = mine.noteBoxW - 2 * (4 + 1);
    mine.contentH = 8.5 * 96 - 2 * 8 * mm;
    var g0 = Object.keys(mine).filter(function (k) { return Math.abs(G[k] - mine[k]) > 1e-9; });
    add('G0', "MVL_GEOMETRY is this leg's own derivation from Letter landscape and 8 mm, and the text width is the owner's 128.22 px",
        !g0.length && Math.abs(G.noteTextW - 128.218) < 0.001 && G.noteFontPx === 10 && G.noteLinePx === 13 && G.noteMaxLanes === 3,
        {mismatched: g0, noteTextW: G.noteTextW, noteBoxW: G.noteBoxW, weekW: G.weekW}, {noteTextW: 128.218});

    // ---- the documents -------------------------------------------------------------------------------------
    var docs = [];
    if(!fromState){
      for(var di = 0; di < TIER1.length; di++){
        var r = await fetch(BASE + TIER1[di][0] + '.html', {cache: 'no-store'});
        if(!r.ok) throw new Error('no baseline ' + TIER1[di][0] + '.html');
        docs.push({name: TIER1[di][1] || TIER1[di][0], html: await r.text()});
      }
    } else {
      docs.push({name: (location.search.match(/[?&]state=([^&]+)/) || [])[1], html: await captureFresh()});
    }
    // One document -> its months: the raw markup of each page (for this leg's own reading) and the page's
    // innerHTML (renderMonthView's month-view element, which is what the model is handed).
    docs.forEach(function (d) {
      var dom = new DOMParser().parseFromString(d.html, 'text/html');
      d.modelHtml = Array.prototype.map.call(dom.querySelectorAll('.print-page'), function (p) { return p.innerHTML; });
      d.rawPages = d.html.split('<div class="print-page">').slice(1);
      if(d.modelHtml.length !== d.rawPages.length || !d.rawPages.length) throw new Error(d.name + ': cannot split the print document');
    });

    // ---- G1: the live stylesheet ---------------------------------------------------------------------------
    // A real printed month in #print-root, off-screen, at the width a .print-page's content box has on
    // paper. Two print-only rules are stood in for, because a page cannot switch itself to print media:
    // .print-page's padding (by the width) and #print-root .month-view{border:none; padding:0} (inline).
    // Every number the model copies is otherwise the app's own stylesheet in screen media -- which is
    // where the 2 px print borders live too, OUTSIDE @media print on purpose (legacy.css).
    var host = document.getElementById('print-root'), prevCss = host.style.cssText;
    var g1 = {};
    var probePage = docs[0].modelHtml.filter(function (h) { return h.indexOf('mv-note-block') >= 0; })[0] || docs[0].modelHtml[0];
    try {
      host.innerHTML = '<div class="print-page">' + probePage + '</div>';
      host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:' + (G.contentW - 2 * G.pagePad) + 'px;';
      var mv = host.querySelector('.month-view');
      mv.style.border = '0'; mv.style.padding = '0';
      host.querySelectorAll('.mv-tools, .mv-arrow, .mv-note-add, .mv-row-expand').forEach(function (el) { el.style.display = 'none'; });
      function cs(el){ return getComputedStyle(el); }
      function px(v){ return parseFloat(v) || 0; }
      var body = host.querySelector('.mv-body'), bs = cs(body);
      g1.weekW = body.getBoundingClientRect().width - px(bs.borderLeftWidth) - px(bs.borderRightWidth);
      g1.dayW = host.querySelector('.mv-daycell').getBoundingClientRect().width;
      var note = host.querySelector('.mv-note-block') || host.querySelector('.mv-bar');
      // A one-day bar for the box: the first note, or any bar whose grid-column spans one day.
      var oneDay = Array.prototype.filter.call(host.querySelectorAll('.mv-bars > .mv-bar:not(.mv-note-add)'), function (b) {
        var m = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(b.getAttribute('style') || ''); return m && (+m[2] - +m[1]) === 1;
      })[0];
      var ns = cs(note);
      g1.noteBoxW = oneDay ? oneDay.getBoundingClientRect().width : null;
      g1.noteTextW = g1.noteBoxW == null ? null : g1.noteBoxW - px(ns.paddingLeft) - px(ns.paddingRight) - px(ns.borderLeftWidth) - px(ns.borderRightWidth);
      g1.noteFont = [ns.fontSize, ns.fontWeight, ns.lineHeight, ns.paddingLeft, ns.borderLeftWidth, ns.marginLeft].join(' ');
      g1.noteIsNote = note.classList.contains('mv-note-block');
      g1.barsPadLeft = cs(host.querySelector('.mv-bars')).paddingLeft;
      g1.frame = bs.borderLeftWidth;
      // The print-only rules, read from the app's own stylesheet.
      g1.atPage = null; g1.pagePad = null;
      Array.prototype.forEach.call(document.styleSheets, function (sh) {
        var rules; try { rules = sh.cssRules; } catch (e) { return; }
        Array.prototype.forEach.call(rules || [], function (r) {
          if(r.type !== CSSRule.MEDIA_RULE || !/print/.test(r.media.mediaText)) return;
          Array.prototype.forEach.call(r.cssRules, function (x) {
            if(x.type === CSSRule.PAGE_RULE) g1.atPage = x.style.getPropertyValue('size') + ' / ' + x.style.getPropertyValue('margin');
            if(x.selectorText === '#print-root .print-page') g1.pagePad = x.style.getPropertyValue('padding');
          });
        });
      });
    } finally {
      host.innerHTML = ''; host.style.cssText = prevCss;
    }
    var near = function (a, b) { return a != null && Math.abs(a - b) < 0.05; };
    add('G1', 'the live stylesheet lays a printed month out at exactly the W, day column, note box and text width the model copies',
        near(g1.weekW, G.weekW) && near(g1.dayW, G.dayW) && near(g1.noteBoxW, G.noteBoxW) && near(g1.noteTextW, G.noteTextW) &&
        g1.noteIsNote && g1.noteFont === '10px 500 13px 4px 1px 1px' && g1.barsPadLeft === '3px' && g1.frame === '2px' &&
        g1.atPage === 'letter landscape / 8mm' && g1.pagePad === '2px',
        g1, {weekW: G.weekW, dayW: G.dayW, noteBoxW: G.noteBoxW, noteTextW: G.noteTextW, noteFont: '10px 500 13px 4px 1px 1px',
             barsPadLeft: '3px', frame: '2px', atPage: 'letter landscape / 8mm', pagePad: '2px'});

    // ---- this leg's own reading of one printed month (regular expressions, no DOM) --------------------------
    function attrs(s){ var o = {}, m, re = /([\w-]+)="([^"]*)"/g; while((m = re.exec(s))) o[m[1]] = decode(m[2]); return o; }
    function legRead(raw){
      var r = {weeks: []};
      r.label = decode((/<div class="mv-monthyear">([^<]*)<\/div>/.exec(raw) || [])[1] || '').trim();
      r.header = []; var m, re = /<div class="hdr-line ([^"]*)" data-mvhid="(\w+)"([^>]*)>([^<]*)<\/div>/g;
      while((m = re.exec(raw))){
        var st = attrs(m[3]).style || '', f = {}, x;
        if((x = /font-size:\s*([\d.]+)px/.exec(st))) f.size = parseFloat(x[1]);
        if((x = /font-weight:\s*(\d+)/.exec(st))) f.bold = x[1] === '700';
        if((x = /font-style:\s*(\w+)/.exec(st))) f.italic = x[1] === 'italic';
        if((x = /(?:^|;)\s*color:\s*([^;]+)/.exec(st))) f.color = x[1].trim();
        if((x = /text-align:\s*(\w+)/.exec(st))) f.align = x[1];
        if((x = /background-color:\s*([^;]+)/.exec(st))) f.highlight = x[1].trim();
        r.header.push({id: m[2], text: decode(m[4]), empty: /(^| )hdr-empty( |$)/.test(m[1]), slot: /(^| )hdr-slot( |$)/.test(m[1]), fmt: f});
      }
      r.dow = []; re = /<div class="mv-dow">([^<]*)<\/div>/g; while((m = re.exec(raw))) r.dow.push(decode(m[1]));
      raw.split('<div class="mv-week"').slice(1).forEach(function (wk) {
        var w = {cells: [], bars: []};
        var cre = /<div class="(mv-daycell[^"]*)"><span class="mv-daynum">(\d+)<\/span><\/div>/g;
        while((m = cre.exec(wk))) w.cells.push({cls: ' ' + m[1] + ' ', n: parseInt(m[2], 10)});
        var bre = /<div class="mv-bar ([^"]*)"((?:\s+[\w-]+="[^"]*")*)>([\s\S]*?)<\/div>/g;
        while((m = bre.exec(wk))){
          var cls = ' ' + m[1] + ' ';
          if(cls.indexOf(' mv-note-add ') >= 0) continue;
          var a = attrs(m[2]), st = a.style || '', body = m[3];
          var gc = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(st), gr = /grid-row:\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/.exec(st);
          var tagM = /<span class="mv-pill-block">([\s\S]*?)<\/span>/.exec(body);
          w.bars.push({
            kind: cls.indexOf(' mv-note-block ') >= 0 ? 'note' : cls.indexOf(' mv-hiatus-bar ') >= 0 ? 'hiatus'
                : cls.indexOf(' mv-pill ') >= 0 ? ('data-ph' in a ? 'pill' : 'simpost') : '?',
            from: +gc[1] - 1, to: +gc[2] - 2, lane: +gr[1] - 1, lanes: gr[2] ? +gr[2] : 1,
            fill: ((/(?:^|;)\s*background:\s*([^;]+)/.exec(st) || [])[1] || '').trim(),
            ink: ((/(?:^|;)\s*color:\s*([^;]+)/.exec(st) || [])[1] || '').trim(),
            text: decode(body.replace(/<span class="mv-pill-block">[\s\S]*?<\/span>/, '')),
            tag: tagM ? decode(tagM[1]) : '',
            ph: 'data-ph' in a ? a['data-ph'] : null,
            note: cls.indexOf(' mv-note-block ') >= 0 ? {kind: a['data-note-kind'], day: a['data-note-day'],
                   index: 'data-note-index' in a ? parseInt(a['data-note-index'], 10) : null} : null,
            halfLayers: (st.match(/linear-gradient\(/g) || []).length,
          });
        }
        r.weeks.push(w);
      });
      return r;
    }
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // ---- per document: P0, P1, L0, L1, R0, and the notes for W0 -------------------------------------------
    // The frozen mvNoteLineCount measures in the APP's Inter, so that face must be loaded first.
    await document.fonts.load('500 10px Inter');
    var bad = {P0: [], P1: [], L0: [], L1: [], R0: []}, noteTexts = new Map(), spanChanges = [], perDoc = [];
    var totals = {months: 0, weeks: 0, items: 0, notes: 0, spansChanged: 0, notesMoved: 0, halves: 0};
    docs.forEach(function (d) {
      var dt = {name: d.name, months: d.modelHtml.length, items: 0, notes: 0, spansChanged: 0, notesMoved: 0};
      d.modelHtml.forEach(function (html, pi) {
        var where = d.name + ' / page ' + (pi + 1);
        var leg = legRead(d.rawPages[pi]);
        var parsed = F.mvlParseMonth(html);
        var model = F.mvlMonthLayout(html, widthOf);
        // R0: twice, and through JSON.
        var j = JSON.stringify(model);
        if(j !== JSON.stringify(F.mvlMonthLayout(html, widthOf)) || JSON.stringify(JSON.parse(j)) !== j) bad.R0.push(where);
        // P0: month, header, weekday row.
        var mi = MONTHS.indexOf(leg.label.split(' ')[0]), yr = parseInt(leg.label.split(' ')[1], 10);
        if(model.label !== leg.label || model.month !== mi || model.year !== yr) bad.P0.push(where + ': label ' + model.label + ' vs ' + leg.label);
        if(!same(model.header.map(function (h) { return {id: h.id, text: h.text, empty: h.empty, slot: h.slot, fmt: h.fmt}; }), leg.header)) bad.P0.push(where + ': header');
        if(!same(model.dow, leg.dow) || !same(leg.dow, ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])) bad.P0.push(where + ': weekday row');
        if(model.weeks.length !== leg.weeks.length) { bad.P0.push(where + ': ' + model.weeks.length + ' weeks vs ' + leg.weeks.length); return; }
        var first = Date.UTC(yr, mi, 1), lead = new Date(first).getUTCDay();
        model.weeks.forEach(function (w, wi) {
          var lw = leg.weeks[wi], wWhere = where + ' / week ' + (wi + 1);
          totals.weeks++;
          // Day cells, against this leg's own calendar arithmetic.
          w.days.forEach(function (c, i) {
            var dd = new Date(first + (wi * 7 + i - lead) * 86400000), lc = lw.cells[i];
            var exp = {iso: dd.toISOString().slice(0, 10), n: dd.getUTCDate(), out: lc.cls.indexOf(' mv-out ') >= 0,
                       weekend: lc.cls.indexOf(' mv-weekend ') >= 0,
                       mark: lc.cls.indexOf(' mv-day-off ') >= 0 ? 'off' : lc.cls.indexOf(' mv-day-on ') >= 0 ? 'on' : '',
                       half: lc.cls.indexOf(' mv-day-half ') >= 0};
            if(lc.n !== exp.n || !same(c, exp)) bad.P0.push(wWhere + ' day ' + (i + 1) + ': ' + JSON.stringify(c) + ' vs ' + JSON.stringify(exp));
          });
          if(w.items.length !== lw.bars.length) { bad.P0.push(wWhere + ': ' + w.items.length + ' bars vs ' + lw.bars.length); return; }
          // L0: the control -- the copy of takeLane at the print document's OWN spans.
          var ctl = F.mvlPackLanes(lw.bars.map(function (b) { return {from: b.from, to: b.to, s: b.lanes}; }), function (it) { return it.s; });
          ctl.forEach(function (p, k) { if(p.lane !== lw.bars[k].lane || p.lanes !== lw.bars[k].lanes) bad.L0.push(wWhere + ' bar ' + (k + 1)); });
          // The parse stage carries the screen's spans; they must be the print document's.
          parsed.weeks[wi].items.forEach(function (it, k) { if(it.htmlLane !== lw.bars[k].lane || it.htmlLanes !== lw.bars[k].lanes) bad.P0.push(wWhere + ' bar ' + (k + 1) + ': placement'); });
          var changedOnDay = {};
          w.items.forEach(function (it, k) {
            var b = lw.bars[k], bWhere = wWhere + ' bar ' + (k + 1) + ' (' + it.kind + ')';
            totals.items++; dt.items++;
            // P0: everything but the lane.
            var mine = {kind: it.kind, from: it.from, to: it.to, fill: it.fill, ink: it.ink, text: it.text, tag: it.tag, ph: it.ph, note: it.note};
            var theirs = {kind: b.kind, from: b.from, to: b.to, fill: b.fill, ink: b.ink, text: b.text, tag: b.tag, ph: b.ph, note: b.note};
            if(!same(mine, theirs)) bad.P0.push(bWhere + ': ' + JSON.stringify(mine) + ' vs ' + JSON.stringify(theirs));
            if(it.halves.length !== b.halfLayers) bad.P0.push(bWhere + ': ' + it.halves.length + ' half slices vs ' + b.halfLayers);
            // P1: the half slices against the day cells' ½ marks.
            var expHalves = [];
            if(it.kind === 'pill') for(var c = it.from; c <= it.to; c++) if(w.days[c].half) expHalves.push(c);
            if(!same(it.halves, expHalves)) bad.P1.push(bWhere + ': ' + JSON.stringify(it.halves) + ' vs ' + JSON.stringify(expHalves));
            totals.halves += it.halves.length;
            // L1: what ruling 2 may move.
            if(it.kind !== 'note'){
              if(it.lane !== b.lane || it.lanes !== b.lanes) bad.L1.push(bWhere + ': lane ' + it.lane + '/' + it.lanes + ' vs ' + b.lane + '/' + b.lanes);
              return;
            }
            totals.notes++; dt.notes++;
            if(it.lanes !== Math.min(3, it.lines.length)) bad.L1.push(bWhere + ': span ' + it.lanes + ' for ' + it.lines.length + ' lines');
            var spanChanged = it.lanes !== b.lanes;
            if(!spanChanged && !changedOnDay[it.from] && it.lane !== b.lane) bad.L1.push(bWhere + ': moved with nothing to move it');
            if(spanChanged){
              changedOnDay[it.from] = true; totals.spansChanged++; dt.spansChanged++;
              // The SCREEN's own rule (kerned, hyphenated) at the PDF's box: what the width alone changes.
              var frozenAtPdf = F.mvNoteLineCount(it.text, G.noteBoxW), by = [];
              if(b.lanes !== frozenAtPdf) by.push('width');
              if(frozenAtPdf !== it.lanes) by.push('metrics');
              spanChanges.push({where: bWhere, text: it.text, screen: b.lanes, frozenRuleAtPdfBox: frozenAtPdf, pdf: it.lanes, by: by.join(' + ')});
            }
            if(it.lane !== b.lane){ totals.notesMoved++; dt.notesMoved++; }
            if(!noteTexts.has(it.text)) noteTexts.set(it.text, it.lines);
          });
        });
        totals.months++;
      });
      perDoc.push(dt);
    });
    info.documents = perDoc;
    info.totals = totals;
    info.spanChanges = spanChanges;
    function judged(id, title, list, extra){
      add(id, title, list.length === 0 && totals.items > 0, {failures: list.length, first: list.slice(0, 6), totals: extra || undefined}, 'no failures');
    }
    judged('P0', "the model reads every month as this leg's own reading does: labels, header lines and formats, the weekday row, every day cell, every bar in placement order",
           bad.P0, {months: totals.months, weeks: totals.weeks, items: totals.items});
    judged('P1', 'every pill is half-shaded exactly on the days marked ½, and no other bar is', bad.P1, {halfSlices: totals.halves});
    judged('L0', "CONTROL: re-packed at the print document's own spans, every lane is the print document's", bad.L0, {items: totals.items});
    judged('L1', "at the PDF's spans no non-note moves, and a note moves only when its own or an earlier same-day note's span changed",
           bad.L1, {notes: totals.notes, spansChanged: totals.spansChanged, notesMoved: totals.notesMoved});
    judged('R0', 'each month is the same model twice over, and survives JSON unchanged', bad.R0);

    // ---- W0 + W1: the line breaker, against Chrome's on the same program ------------------------------------
    var ff = new FontFace('MVL Probe Inter 500', inter.bytes.slice().buffer, {weight: '500', style: 'normal'});
    await ff.load(); document.fonts.add(ff);
    function chromeLines(text){
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute; left:0; top:0; visibility:hidden; margin:0; padding:0; border:0; box-sizing:content-box;' +
        'width:' + G.noteTextW + 'px; font-family:"MVL Probe Inter 500"; font-weight:500; font-style:normal; font-size:10px;' +
        'line-height:13px; white-space:pre-wrap; word-break:break-word; hyphens:manual; font-kerning:none; letter-spacing:0;' +
        'word-spacing:0; text-transform:none;';
      el.textContent = text;
      document.body.appendChild(el);
      var box = el.getBoundingClientRect(), n = Math.round(box.height / 13), lines = [];
      for(var i = 0; i < n; i++) lines.push('');
      var tn = el.firstChild, at = 0;
      if(tn) for(var ch of tn.data){
        if(ch !== '\n'){
          var rg = document.createRange(); rg.setStart(tn, at); rg.setEnd(tn, at + ch.length);
          var rs = rg.getClientRects();
          if(rs.length){ var li = Math.round((rs[0].top - box.top) / 13); if(li >= 0 && li < n) lines[li] += ch; }
        }
        at += ch.length;
      }
      el.remove();
      return lines.map(function (l) { return l.replace(/ +$/, ''); });
    }
    var w0 = [];
    noteTexts.forEach(function (lines, text) {
      var c = chromeLines(text);
      if(!same(lines, c)) w0.push({text: text, model: lines, chrome: c});
    });
    add('W0', "every note's lines equal Chrome's own line breaker on the same font program in the same box, line for line",
        w0.length === 0 && noteTexts.size > 0, {notes: noteTexts.size, mismatches: w0.slice(0, 5)}, 'no mismatches');

    // W1: edge cases. Two are built to sit just inside and just outside the box, by the MODEL's
    // measure, so Chrome's measure of the same program has to agree with it to within that margin.
    function fitTo(target){
      // A run of short words whose width lands within 0.25 px of `target`. Widths add exactly (whole
      // font units times 10/2048, which a double holds exactly), so the tails are searched by sum and
      // only the winner is measured whole.
      var words = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'tempor', 'magna', 'aliqua', 'veniam', 'nostrud', 'ullamco', 'labor'];
      var tails = 'iljtfrsaeocnuxyzkhbdpqgvwmASTWMKQ0123456789'.split('');
      var tw = tails.map(widthOf);
      for(var a = 0; a < words.length; a++) for(var b = 0; b < words.length; b++) for(var c = 0; c < words.length; c++){
        var base = words[a] + ' ' + words[b] + ' ' + words[c] + ' ' + words[(a + b + c) % words.length], wb = widthOf(base);
        for(var t1 = 0; t1 < tails.length; t1++) for(var t2 = 0; t2 < tails.length; t2++){
          if(Math.abs(wb + tw[t1] + tw[t2] - target) < 0.25){
            var s = base + tails[t1] + tails[t2];
            if(Math.abs(widthOf(s) - target) < 0.25) return s;
          }
        }
      }
      return null;
    }
    var inside = fitTo(G.noteTextW - 0.5), outside = fitTo(G.noteTextW + 0.5);
    var BATTERY = [
      'a\n', 'a\n\nb', '\nleading newline', 'two lines\nof text',
      '   leading spaces before words that will have to wrap in a note',
      'doubled  spaces  between   words that keep going until they wrap',
      'these no break spaces join the words into one long unbreakable run',
      'Supercalifragilisticexpialidociousandthensomemoreletters',
      'Short words then Averyveryveryverylongwordthatmustbesplitacrosslines end',
      '      Averyveryveryverylongwordaftersomeleadingspaces',
      'Curly “quotes” and ‘apostrophes’ … then an em dash — spaced, €5',
      'A note that runs to three full lines in the box when it is wrapped at the width',
      'A note long enough to run to four lines in the box, which the lanes cap at three while the text keeps all of its lines',
      inside, outside,
    ].filter(function (s) { return s != null; });
    var w1 = [];
    info.battery = [];
    BATTERY.forEach(function (text) {
      var m = F.mvlNoteLines(text, widthOf), c = chromeLines(text);
      info.battery.push({text: text, lines: m});
      if(!same(m, c)) w1.push({text: text, model: m, chrome: c});
    });
    var shape = {inside: inside && F.mvlNoteLines(inside, widthOf).length, outside: outside && F.mvlNoteLines(outside, widthOf).length,
                 long: F.mvlNoteLines(BATTERY[12], widthOf).length};
    add('W1', 'the same on edge cases: newlines, leading and doubled spaces, no-break spaces, over-long words, just inside and just outside the box, past three lines',
        w1.length === 0 && shape.inside === 1 && shape.outside === 2 && shape.long > 3,
        {cases: BATTERY.length, mismatches: w1.slice(0, 5), shape: shape, inside: inside, outside: outside},
        {mismatches: 0, shape: {inside: 1, outside: 2, long: 'more than 3'}});
    // Recorded, not judged: where Chrome ALSO breaks (plan §7: the writer does not).
    info.chromeExtra = ['Pre-production meeting with all of the department heads today',
                        'Cast/Crew/Locations/Vendors call sheet distribution today',
                        'Monday–Friday second-unit pickups with the splinter crew'].map(function (text) {
      return {text: text, model: F.mvlNoteLines(text, widthOf), chrome: chromeLines(text)};
    });

    out.errors = (T.appHealth().errors || []).slice(0, 10);
    add('E0', 'no console errors', out.errors.length === 0, out.errors, []);
  } catch (e) {
    out.EX = String(e && e.message || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);

  // HARNESS_STATE: the calendar's own print document, captured the way monthprint captures it.
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
    window.print = function () { calls++; var h = document.getElementById('print-root'); printed = h ? h.innerHTML : null; };
    document.getElementById('export-btn').click();
    await T.until(function () { return calls > 0; }, 'the print call', 200, 100);
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint;
    if(!printed) throw new Error('no print document was captured');
    return printed;
  }
})(); });
