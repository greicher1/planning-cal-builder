// monthexport -- the month PDF's EXPORT through the direct writer, end to end in the BUILT app
// (MONTH-PDF-WRITER-PLAN.md §8 step 5, ruling 4(a); the owner's step-5 rulings of 2 Oct 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh monthexport 300                          the reference calendar
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture> ./run.sh monthexport 300  a saved calendar
//   node rtleg.mjs --leg monthexport --query realtime=1                            the same, on the REAL clock
//
// ⭐ THE STEP-3 OBLIGATION, MET HERE. Until step 5 the minifier dropped the whole writer, so every leg tested the
// SOURCE, sliced. Now the build carries it, minified, and X2 holds the file the BUILT app writes to the one the
// sliced source writes for the same calendar, byte for byte: the print document is captured in the same page (the
// print path, by its localhost-only switch), and the slice turns it into a PDF exactly as monthwriter does. Both
// read renderMonthView's own HTML, so equal bytes say the minified writer IS the source.
//
// THE CLOCK IS PINNED (step 3's ruling 4: "from step 5 the leg must pin the page's CLOCK"). The header prints today's
// date, read as `new Date()`. Before the app boots (this script runs before the app's module does), the no-argument
// `new Date()` is pinned to local noon on 22 Sep 2026, so every file prints "9.22.26" in any time zone, on any day, and
// two runs can compare bytes. Date.now() is left real: the export button's re-click guard reads it.
//
// TWO PHASES, as nofsa runs them: phase 1 with the File System Access API, then a reload into phase 2 with it deleted
// before boot (the app reads it once, at boot), where the PDF must download instead.
//
// CASES
//   X0  the clock is pinned: `new Date()` is 22 Sep 2026, and the month header shows "9.22.26" (a Manual header's date
//       slot shows its own text instead: mvheaderlegacy's is "{version}")
//   X1  a build that FAILS offers the print path (owner ruling 2): Cancel prints nothing and writes nothing; "Print
//       instead" runs the print path, one page per month; nothing is written either way
//   X2  ⭐ Export PDF writes the month PDF through the Save dialog: one call, named "<title> Month Calendar.pdf", PDF
//       typed, one write, closed; a PDF with one page per month; no print; the button busy, then not. And its bytes
//       ARE the sliced source's for the same calendar
//   X3  a cancelled dialog (AbortError) is silent: no file, no dialog of the app's own, no print, the button free
//   X4  the click's activation ran out during the build (SecurityError): "Your month PDF is ready" asks once more;
//       Cancel writes nothing, "Save…" writes the same bytes
//   X5  a soft hyphen is dropped (step 5): a note typed with one gives no warning, and its lines carry none
//   X6  characters the PDF cannot set are NAMED first (owner ruling 4): the warning lists each one and where it is,
//       names the ones that print as a box; Cancel writes nothing; Export anyway writes the slice's bytes
//   X7  (phase 2) without the File System Access API the PDF DOWNLOADS: "<title> Month Calendar.pdf", application/pdf,
//       the same bytes as phase 1's
//   T0  the build fits well inside a click's activation (Chrome allows 5 s): real-clock runs only (?realtime=1)
//   E0  no console errors but the one X1 caused on purpose
(function pinClock(){
  var RealDate = window.Date, FIXED = new RealDate(2026, 8, 22, 12, 0, 0).getTime();
  function PinnedDate(a, b, c, d, e, f, g){
    if(!(this instanceof PinnedDate)) return new RealDate(FIXED).toString();   // Date() called as a function
    if(arguments.length === 0) return new RealDate(FIXED);
    if(arguments.length === 1) return new RealDate(a);
    return new RealDate(a, b, c === undefined ? 1 : c, d || 0, e || 0, f || 0, g || 0);
  }
  PinnedDate.prototype = RealDate.prototype;
  PinnedDate.now = RealDate.now; PinnedDate.UTC = RealDate.UTC; PinnedDate.parse = RealDate.parse;
  window.Date = PinnedDate;
  window.__RealDate = RealDate;
})();
(function phase2(){
  var phase = null; try { phase = sessionStorage.getItem('monthexport-phase'); } catch (e) {}
  if(phase !== '2') return;
  ['showSaveFilePicker', 'showOpenFilePicker', 'showDirectoryPicker'].forEach(function (k) {
    try { delete window[k]; } catch (e) {}
    try { if(typeof window[k] === 'function') delete Window.prototype[k]; } catch (e) {}
    try { if(typeof window[k] === 'function') Object.defineProperty(window, k, {value: undefined, configurable: true, writable: true}); } catch (e) {}
  });
  window.__NOFSA = typeof window.showSaveFilePicker;
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info, pdfs: {}};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var fromState = /[?&]state=/.test(location.search), realTime = /[?&]realtime=1\b/.test(location.search);
  var phase = null; try { phase = sessionStorage.getItem('monthexport-phase'); } catch (e) {}
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function sameBytes(a, b){ if(!a || !b || a.length !== b.length) return false; for(var i = 0; i < a.length; i++) if(a[i] !== b[i]) return false; return true; }
  function b64(u8){ var s = ''; for(var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s){ var bin = atob(s), u8 = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
  async function sha(u8){
    var h = new Uint8Array(await crypto.subtle.digest('SHA-256', u8));
    return Array.prototype.map.call(h.slice(0, 8), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  var btn = function () { return document.getElementById('export-btn'); };
  var busy = function () { var b = btn(); return !!b && (b.disabled || b.hasAttribute('data-loading')); };
  async function settle(label){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  async function toMonth(){
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month view', 200, 100);
    await settle('the month view to settle');
  }
  // An app dialog's text once it is up, or '' if none comes: a missing dialog is the case's own failure to report,
  // not a reason to stop the leg (a mutant that skips one would otherwise read as a crash).
  async function modal(fn, label){
    fn();
    try { await T.until(function () { return !!T.modalText(); }, label, 120, 100); } catch (e) { return ''; }
    return T.modalText();
  }
  async function clickExport(){ await T.sleep(700); btn().click(); }   // past the button's 600 ms re-click guard
  try {
    await T.appReady();
    if(!fromState){
      T.buildFixture();
      await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 10; }, 'the waterfall grid', 200, 100);
    } else {
      await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); }, 'the restored calendar', 200, 100);
    }
    await settle('the calendar to settle');
    var title = (document.getElementById('show-title').value || '').trim();
    var wantName = (title ? title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() + ' ' : '') + 'Month Calendar.pdf';
    info.window = [window.innerWidth, window.innerHeight];
    info.tz = {zone: Intl.DateTimeFormat().resolvedOptions().timeZone, offsetMin: new Date().getTimezoneOffset()};

    // ================================ phase 2: no File System Access API ================================
    if(phase === '2'){
      var keep = JSON.parse(sessionStorage.getItem('monthexport-keep') || '{}');
      (keep.cases || []).forEach(function (c) { cases.push(c); });
      info.phase1 = keep.info || {};
      await toMonth();
      // The download, as it leaves: the Blob handed to createObjectURL, and the name on the anchor that is clicked (the
      // click itself is stopped, so nothing lands on disk).
      var dl = null, name = null, realURL = URL.createObjectURL, realClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = function (b) { dl = b; return realURL.call(URL, b); };
      HTMLAnchorElement.prototype.click = function () { if(this.download){ name = this.download; return; } return realClick.call(this); };
      await clickExport();
      try { await T.until(function () { return !!dl && !!name; }, 'the month PDF download', 200, 100); } catch (e) {}
      URL.createObjectURL = realURL; HTMLAnchorElement.prototype.click = realClick;
      var dlBytes = dl ? new Uint8Array(await dl.arrayBuffer()) : null;
      var want = keep.built ? unb64(keep.built) : null;
      add('X7', 'without the File System Access API the month PDF DOWNLOADS: "<title> Month Calendar.pdf", application/pdf, the same bytes as with the Save dialog',
          window.__NOFSA === 'undefined' && !!dl && dl.type === 'application/pdf' && name === wantName && sameBytes(dlBytes, want),
          {api: window.__NOFSA, type: dl && dl.type, name: name, wantName: wantName, bytes: dlBytes && dlBytes.length, sameAsPhase1: sameBytes(dlBytes, want)},
          'undefined; that name; application/pdf; identical');
      var errs = (T.appHealth().errors || []).filter(function (e) { return !/font-inter-600/.test(e); });
      add('E0', 'no console errors but the one X1 caused on purpose', errs.length === 0 && (keep.errs || []).length === 0,
          {phase1: keep.errs || [], phase2: errs.slice(0, 5)}, []);
      try { sessionStorage.removeItem('monthexport-phase'); sessionStorage.removeItem('monthexport-keep'); } catch (e) {}
      if(keep.built) out.pdfs.built = keep.built;
      T.done(out);
      return;
    }

    // ================================ phase 1: the Save dialog ================================
    // ---- the writer, sliced, as monthwriter slices it -------------------------------------------------------------
    // ?src=<path> slices another copy of the source (HARNESS_QUERY=src=...), for the mutant runs: the BUILD stays the
    // product, and a source that differs from it must turn X2 red.
    var srcPath = decodeURIComponent((location.search.match(/[?&]src=([^&]+)/) || [])[1] || '/src/legacy/app.js');
    if(!/^\/[\w.\/-]+\.js$/.test(srcPath) || srcPath.indexOf('..') >= 0) throw new Error('a src= that is not a plain path: ' + srcPath);
    info.src = srcPath;
    var src = await (await fetch(srcPath, {cache: 'no-store'})).text();
    function slice(a, b, what){
      var f = src.indexOf(a), t = f < 0 ? -1 : src.indexOf(b, f);
      if(f < 0 || t < 0) throw new Error('could not locate ' + what + ' in src/legacy/app.js: re-anchor this leg');
      if(src.indexOf(a, f + 1) >= 0) throw new Error(what + "'s anchor is not unique: re-anchor this leg");
      return src.slice(f, t + b.length);
    }
    var F = new Function("'use strict';\n" + slice('const DAY_MS = ', ';', 'DAY_MS') + '\n' + slice('function isoOf(d){', '}', 'isoOf') + '\n' +
      slice('const MV_MIN_LANES = ', ';', 'MV_MIN_LANES') + '\n' +
      slice('function ttfRead(bytes){', 'pipeThrough(cs)).arrayBuffer());\n  }', 'the frozen primitives') + '\n' +
      slice('  const MVL_GEOMETRY = (function(){', "return { tag: 'F' + w, ttf: fonts[w].font, raw: fonts[w].bytes, deflated: fonts[w].deflated };\n    }));\n  }", 'the writer') +
      '\nreturn {G: MVL_GEOMETRY, loadInterPdfFont: loadInterPdfFont, mvlMonthLayout: mvlMonthLayout, fitMonthLayout: fitMonthLayout,' +
      ' buildMonthPdf: buildMonthPdf, mvlUnprintable: mvlUnprintable, mvlTextWidth: mvlTextWidth};')();
    var fonts = {};
    for(var fw of ['400', '500', '600', '700']) fonts[fw] = await F.loadInterPdfFont(fw);
    var noteW = function (s) { return F.mvlTextWidth(fonts['500'].font, s, F.G.noteFontPx); };
    // The calendar through the PRINT path (its switch), and then through the sliced writer.
    async function sliceFile(){
      // ⚠️ The button stays DISABLED until the export before this one has saved and closed its file, and a click on it
      // then does nothing: no print document, an empty slice. X2 always waited for it; X5 and X6 did not, and X5 once
      // came back with no note and no match (a mutant run, 2 Oct 2026; the same mutant passed on a rerun). So the wait
      // is here, for every caller, and `printed` says whether the print document arrived.
      await T.until(function () { return !busy(); }, 'the button to come free', 100, 100).catch(function () {});
      T.monthPrintPath();
      var printed = null, calls = 0, realPrint = window.print;
      window.print = function () { calls++; var h = document.getElementById('print-root'); printed = h ? h.innerHTML : null; };
      await clickExport();
      var got = await T.until(function () { return calls > 0; }, 'the print document', 200, 100).then(function () { return true; }, function () { return false; });
      window.dispatchEvent(new Event('afterprint'));
      window.print = realPrint;
      T.monthPrintPath(false);
      // No print document (the switch did not reach the print path) is the case's failure, judged there.
      if(!got) return {layout: {months: []}, bytes: new Uint8Array(0), months: 0, printed: false};
      var dom = new DOMParser().parseFromString('<div id="x">' + printed + '</div>', 'text/html');
      var months = Array.prototype.map.call(dom.querySelectorAll('#x > .print-page'), function (p) { return F.mvlMonthLayout(p.innerHTML, noteW); });
      var layout = F.fitMonthLayout({geometry: F.G, months: months}, fonts);
      return {layout: layout, bytes: await F.buildMonthPdf(layout), months: months.length, printed: true};
    }

    await toMonth();
    var todayEl = document.querySelector('#table-wrap .mv-header [data-mvhid="today"]');
    var hdrToday = ((todayEl || {}).textContent || '').trim();
    // A MANUAL header's date slot is the user's own text, and then the file reads no clock at all: mvheaderlegacy's
    // holds the literal "{version}" (gate 10's README: "0 stamp hits is correct"). Such a slot must show what was typed,
    // and never a dotted date, which only the page's clock could have made. (Step 6 found this, running the leg on the
    // baselines' calendars: X0 was red on mvheaderlegacy alone, with the clock pinned.)
    var manualSlot = !!todayEl && todayEl.classList.contains('hdr-editable') && !/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(hdrToday);
    var pinned = new Date();
    add('X0', 'the clock is pinned: new Date() is 22 Sep 2026, and the month header shows "9.22.26" (or a Manual header\'s own text)',
        pinned.getFullYear() === 2026 && pinned.getMonth() === 8 && pinned.getDate() === 22 && (hdrToday === '9.22.26' || manualSlot),
        {date: pinned.toString(), header: hdrToday, manualSlot: manualSlot}, '22 Sep 2026; 9.22.26, or a Manual slot\'s text');

    // ---- X1: a build that fails offers the print path --------------------------------------------------------------
    // The fonts are decoded on first use and a failed decode is not cached, so hiding one block makes the FIRST exports
    // fail, and putting it back lets the rest succeed.
    var block = document.getElementById('font-inter-600'), parent = block.parentNode, next = block.nextSibling;
    parent.removeChild(block);
    var sp1 = T.fakeSavePicker(), prints1 = 0, realPrint1 = window.print;
    window.print = function () { prints1++; window.__x1pages = document.querySelectorAll('#print-root .print-page').length; };
    var m1 = await modal(function () { clickExport(); }, 'the failure dialog');
    var cancelled1 = T.clickModalButton('Cancel');
    await T.sleep(800);
    var afterCancel = {prints: prints1, files: sp1.files.length, modal: T.modalText()};
    var m1b = await modal(function () { clickExport(); }, 'the failure dialog again');
    T.clickModalButton('Print instead');
    try { await T.until(function () { return prints1 > 0; }, 'the print path', 200, 100); } catch (e) {}
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint1;
    sp1.restore();
    parent.insertBefore(block, next);
    await T.until(function () { return !busy(); }, 'the button to come free', 100, 100).catch(function () {});
    add('X1', 'a build that fails offers the print path: Cancel prints and writes nothing, "Print instead" prints one page per month',
        /Something went wrong writing the month PDF/.test(m1) && /font-inter-600/.test(m1) && /Print it with the browser instead/.test(m1) &&
        cancelled1 && afterCancel.prints === 0 && afterCancel.files === 0 && !afterCancel.modal &&
        /Something went wrong writing the month PDF/.test(m1b) && prints1 === 1 && window.__x1pages > 0 && sp1.calls.length === 0 && !busy(),
        {dialog: m1.slice(0, 200), afterCancel: afterCancel, prints: prints1, pages: window.__x1pages, saveDialogs: sp1.calls.length},
        'the dialog; nothing on Cancel; one print on "Print instead"; no Save dialog');

    // ---- X2: Export PDF writes the month PDF; the BUILT bytes are the SLICE's --------------------------------------
    var sp2 = T.fakeSavePicker(), prints2 = 0, realPrint2 = window.print, busySeen = false;
    window.print = function () { prints2++; };
    var t0 = performance.now(), tPick = null;
    var realPick = window.showSaveFilePicker;
    window.showSaveFilePicker = function (o) { if(tPick === null) tPick = performance.now(); busySeen = busySeen || busy(); return realPick(o); };
    await clickExport();
    t0 = performance.now() - 0;   // the click itself: clickExport waited out the guard first
    try { await T.until(function () { return sp2.files.length > 0; }, 'the month PDF written', 300, 100); } catch (e) {}
    window.print = realPrint2;
    sp2.restore();
    await T.until(function () { return !busy(); }, 'the button to come free', 100, 100).catch(function () {});
    var f2 = sp2.files[0], built = f2 ? f2.bytes : null;
    var ref = await sliceFile();
    info.buildMs = tPick === null ? null : Math.round(tPick - t0);
    info.months = ref.months;
    info.bytes = built ? built.length : 0;
    info.sha = built ? await sha(built) : null;
    var call = sp2.calls[0] || {};
    var types = call.types || [];
    add('X2', 'Export PDF writes the month PDF through the Save dialog, one page per month, and its bytes ARE the sliced source\'s',
        sp2.calls.length === 1 && call.suggestedName === wantName &&
        same(types, [{description: 'PDF document', accept: {'application/pdf': ['.pdf']}}]) &&
        !!f2 && f2.closed && f2.parts.length === 1 && T.pdfPages(built) === ref.months && prints2 === 0 && busySeen && !busy() &&
        sameBytes(built, ref.bytes),
        {calls: sp2.calls.length, name: call.suggestedName, wantName: wantName, types: types, closed: !!(f2 && f2.closed),
         writes: f2 ? f2.parts.length : 0, pages: built ? T.pdfPages(built) : 0, months: ref.months, prints: prints2,
         busyWhileBuilding: busySeen, busyAfter: busy(), sameAsSlice: sameBytes(built, ref.bytes),
         bytes: built ? built.length : 0, sliceBytes: ref.bytes.length},
        'one call; that name; PDF; one write, closed; a page per month; no print; busy then free; identical to the slice');
    if(built) out.pdfs.built = b64(built);

    // ---- X3: a cancelled dialog is silent --------------------------------------------------------------------------
    var sp3 = T.fakeSavePicker(), prints3 = 0, realPrint3 = window.print;
    sp3.fail.push('AbortError');
    window.print = function () { prints3++; };
    await clickExport();
    try { await T.until(function () { return sp3.calls.length > 0; }, 'the dialog', 200, 100); } catch (e) {}
    await T.sleep(900);
    window.print = realPrint3;
    sp3.restore();
    add('X3', 'a cancelled Save dialog is silent: no file, no dialog of the app\'s own, no print, the button free',
        sp3.calls.length === 1 && sp3.files.length === 0 && !T.modalText() && prints3 === 0 && !busy(),
        {calls: sp3.calls.length, files: sp3.files.length, modal: T.modalText(), prints: prints3, busy: busy()}, 'one call; nothing else');

    // ---- X4: the activation ran out during the build ---------------------------------------------------------------
    var sp4 = T.fakeSavePicker();
    sp4.fail.push('SecurityError');
    var m4 = await modal(function () { clickExport(); }, 'the "ready" prompt');
    T.clickModalButton('Cancel');
    await T.sleep(800);
    var after4 = {calls: sp4.calls.length, files: sp4.files.length, modal: T.modalText()};
    sp4.fail.push('SecurityError');
    var m4b = await modal(function () { clickExport(); }, 'the "ready" prompt again');
    T.clickModalButton('Save\u2026');
    try { await T.until(function () { return sp4.files.length > 0; }, 'the month PDF written after "Save\u2026"', 200, 100); } catch (e) {}
    sp4.restore();
    var f4 = sp4.files[0];
    add('X4', 'the click\'s activation ran out: "Your month PDF is ready" asks again; Cancel writes nothing, "Save…" writes the same bytes',
        /Your month PDF is ready/.test(m4) && after4.calls === 1 && after4.files === 0 && !after4.modal &&
        /Your month PDF is ready/.test(m4b) && sp4.calls.length === 3 && !!f4 && sameBytes(f4.bytes, built),
        {prompt: m4.slice(0, 80), afterCancel: after4, calls: sp4.calls.length, same: !!f4 && sameBytes(f4.bytes, built)},
        'the prompt; nothing on Cancel; the same file on Save');

    // ---- X5 + X6: what the PDF cannot set ---------------------------------------------------------------------------
    // Two month-view notes, typed through the month view's own note editor (its "+", then Ctrl+Enter), on days of the
    // third week, which is always inside the month on screen and so on a page: one with a soft hyphen alone, then one
    // with characters outside WinAnsi and three the Inter subset lacks.
    async function typeDayNote(nth, text){
      var adds = document.querySelectorAll('#table-wrap .mv-body > .mv-week:nth-child(3) .mv-note-add[data-note-day]');
      var add = adds[Math.min(nth, adds.length - 1)];
      if(!add) throw new Error('no "+" in the third week to add a month-view note with');
      var day = add.getAttribute('data-note-day');
      add.click();
      await T.until(function () { return !!document.querySelector('#mv-note-pop textarea'); }, 'the month note editor', 100, 50);
      var ta = document.querySelector('#mv-note-pop textarea');
      ta.value = text; ta.dispatchEvent(new Event('input', {bubbles: true}));
      ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true}));
      await T.until(function () { return !document.getElementById('mv-note-pop'); }, 'the note to be saved', 100, 50);
      await settle('the month view to settle');
      return day;
    }
    info.noteDays = [await typeDayNote(1, 'Pre\u00ADproduction meeting')];
    var sp5 = T.fakeSavePicker();
    await clickExport();
    try { await T.until(function () { return sp5.files.length > 0 || !!T.modalText(); }, 'the export', 200, 100); } catch (e) {}
    var m5 = T.modalText();
    if(m5) T.clickModalButton('Cancel');
    sp5.restore();
    var ref5 = await sliceFile(), shyLeft = 0, shyNote = null;
    ref5.layout.months.forEach(function (m) { m.weeks.forEach(function (w) { w.items.forEach(function (it) {
      if(it.kind === 'note' && /production meeting/.test(it.text)){ shyNote = it.lines; if(it.lines.join('').indexOf('\u00AD') >= 0) shyLeft++; }
    }); }); });
    add('X5', 'a soft hyphen is dropped: no warning, a file written, and the note\'s lines carry none',
        !m5 && sp5.files.length === 1 && !!shyNote && shyLeft === 0 && sameBytes(sp5.files[0].bytes, ref5.bytes),
        {warning: m5, files: sp5.files.length, lines: shyNote, sameAsSlice: !!sp5.files[0] && sameBytes(sp5.files[0].bytes, ref5.bytes),
         slicePrinted: ref5.printed},
        'no warning; one file; no soft hyphen; identical to the slice');

    info.noteDays.push(await typeDayNote(3, '\u0141\u00F3d\u017A \u2192 \u0160t\u011Bp\u00E1n \u017Di\u017Ek\u0061 \u2713'));
    var sp6 = T.fakeSavePicker();
    var m6 = await modal(function () { clickExport(); }, 'the characters warning');
    T.clickModalButton('Cancel');
    await T.sleep(800);
    var after6 = {calls: sp6.calls.length, files: sp6.files.length, modal: T.modalText()};
    var m6b = await modal(function () { clickExport(); }, 'the characters warning again');
    T.clickModalButton('Export anyway');
    try { await T.until(function () { return sp6.files.length > 0; }, 'the month PDF written anyway', 200, 100); } catch (e) {}
    sp6.restore();
    var ref6 = await sliceFile();
    var places = F.mvlUnprintable(ref6.layout, fonts);
    var listed = function (ch) { return m6.indexOf(ch) >= 0; };
    var wantChars = ['\u0141', '\u017A', '\u2192', '\u011B', '\u2713', '\u0160', '\u017D', '\u017E'];
    add('X6', 'characters the PDF cannot set are named first, with where they are; Cancel writes nothing, Export anyway writes the slice\'s bytes',
        /Some characters won\u2019t print/.test(m6) && wantChars.every(listed) && /\u0160 \u017D \u017E as a box/.test(m6) && /in the note on /.test(m6) &&
        !listed('\u00F3') && after6.calls === 0 && after6.files === 0 && !after6.modal && /Export anyway/.test(m6b) &&
        sp6.files.length === 1 && sameBytes(sp6.files[0].bytes, ref6.bytes) &&
        places.length === 1 && places[0].kind === 'note' && same(places[0].chars.map(function (c) { return c.ch + c.as; }),
          ['\u0141?', '\u017A?', '\u2192?', '\u0160box', '\u011B?', '\u017Dbox', '\u017Ebox', '\u2713?']),
        {dialog: m6.slice(0, 400), afterCancel: after6, files: sp6.files.length,
         sameAsSlice: !!sp6.files[0] && sameBytes(sp6.files[0].bytes, ref6.bytes), places: places, slicePrinted: ref6.printed},
        'each character named; Š Ž ž as a box; nothing on Cancel; the slice\'s file on Export anyway');

    // ---- T0: the build against a click's activation (real time only) ------------------------------------------------
    if(realTime){
      add('T0', 'the build fits well inside a click\'s activation (Chrome allows 5 s): the Save dialog opens within 2 s of the click',
          info.buildMs !== null && info.buildMs < 2000, {buildMs: info.buildMs, months: info.months}, '< 2000 ms');
    } else info.buildMsNote = 'virtual time: the measured build time is not real (run with rtleg.mjs --query realtime=1)';

    // ---- on to phase 2 -----------------------------------------------------------------------------------------------
    var errs1 = (T.appHealth().errors || []).filter(function (e) { return !/font-inter-600/.test(e); });
    // Phase 2 reloads and starts the calendar from its own fixture again, so it must not see this phase's typed notes:
    // its file is compared with X2's, made before them.
    sessionStorage.setItem('monthexport-keep', JSON.stringify({cases: cases, info: info, built: out.pdfs.built || null, errs: errs1}));
    sessionStorage.setItem('monthexport-phase', '2');
    location.reload();
    return;
  } catch (e) {
    out.EX = String(e && e.stack || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
    try { sessionStorage.removeItem('monthexport-phase'); sessionStorage.removeItem('monthexport-keep'); } catch (e2) {}
  }
  T.done(out);
})(); });
