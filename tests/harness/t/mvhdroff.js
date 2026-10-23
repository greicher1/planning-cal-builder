// mvhdroff -- the month view's Header: Off (owner, 23 Oct 2026: *"also add "Off" for the month view header"*).
// A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh mvhdroff 400
//
// Ruling 10 gave the WATERFALL's header an Off (hdrrow's O cases); this is its twin for the month's own, independent
// header, built with no frozen function edited: a <body> class COLLAPSES .mv-header on screen and in the print
// rollback (so frozen exportMonthPdf's reserve, measured from .mv-header's top to the first week, stays exact on
// every page), and the direct writer skips the header when exportMonthPdfDirect stamps `headerOff` on each month.
//
//   M0  control: the month menu is Auto / Template / Manual / Off; the header shows; the file has no mvHeaderOff
//   M1  Off: the button reads Header: Off, .mv-header is collapsed and the month bar moves up; the WATERFALL keeps
//       its header (the two are independent)
//   M2  the print rollback: on EVERY page the reserve frozen exportMonthPdf measures (.mv-header's top to the first
//       week) drops by the same amount, the header's height, and stays above its 20 px floor. A display:none header
//       has no top, so every page after the first would fall back to a 105 px guess. (The weeks' extra height itself
//       is CSS flex inside a fixed print page, which only print media lays out; the reserve is what the fit decides
//       shrink-or-fill from, so it is what can go wrong.)
//   M3  the written month PDF: none of the header's lines, and the month bar drawn higher than in the control
//   M4  Off is ONE undo step
//   M5  Off over a Manual header hides it, and Manual again brings back the same hand-written lines
//   M6  Save writes mvHeaderOff: true (no headerOff, no new field id); Load brings Off back; the same file with no
//       key opens with its header ON (the M-5 trap); a non-boolean value is dropped (header on)
//   M7  "Open the template editor…" from Off shows the header again, in Template
//   E0  no console errors, apart from the one warning M6's junk value is meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'mvhdroff', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function byId(id) { return document.getElementById(id); }
  function sameArr(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
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
  function hdrBtn() { return ((byId('tb-hdr-mode-btn') || {}).textContent || '').replace(/[^\w: ]/g, '').trim(); }
  function mvHeader() { return document.querySelector('#table-wrap .mv-header'); }
  function mvHeaderH() { var h = mvHeader(); return h ? Math.round(h.getBoundingClientRect().height) : -1; }
  function mvShown() { return mvHeaderH() > 10; }
  function barTop() { var b = document.querySelector('#table-wrap .mv-monthbar'); return b ? Math.round(b.getBoundingClientRect().top) : null; }
  function wfBarShown() {
    var b = document.querySelector('#table-wrap .cal-header-bar');
    return !!b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0;
  }
  // The header's non-empty lines, as the month view shows them.
  function headerLines() {
    return Array.from(document.querySelectorAll('#table-wrap .mv-header .hdr-line[data-mvhid]'))
      .map(function (e) { return txt(e); }).filter(Boolean);
  }

  // ---- the header mode menu, through the toolbar button (as hdrrow drives it) ------------------------
  async function closeMenu() {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await T.sleep(100);
  }
  async function menuRows() {
    await closeMenu();
    byId('tb-hdr-mode-btn').click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the header mode menu', 50, 100);
    return Array.from(document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice .hdr-mode-name'))
      .map(function (n) { return n.textContent.trim(); });
  }
  async function chooseMode(label) {
    await menuRows();
    var row = Array.from(document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice'))
      .find(function (r) { return r.querySelector('.hdr-mode-name').textContent.trim() === label; });
    if (!row) throw new Error('no ' + label + ' row in the header mode menu');
    row.click();
    await settle('the month after Header: ' + label);
  }
  async function undo() { byId('undo-btn').click(); await settle('the month after undo'); }
  async function redo() { byId('redo-btn').click(); await settle('the month after redo'); }

  // ---- the written month PDF: its text runs, and where the first month bar's label is set ---------------
  async function monthPdf() {
    T.monthPrintPath(false);
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var u8 = rec.files.filter(function (f) { return f.closed; })[0].bytes;
    var s = '', runs = [], labelY = null;
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;   // DecompressionStream rejects the EOL
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var t = await new Response(ds).text(), tj = /(-?[\d.]+) (-?[\d.]+) Tm \(((?:\\.|[^\\)])*)\) Tj/g, x;
        while ((x = tj.exec(t))) {
          var run = x[3].replace(/\\(.)/g, '$1');
          runs.push(run);
          if (labelY === null && /^[A-Z][a-z]+ \d{4}$/.test(run)) labelY = parseFloat(x[2]);
        }
      } catch (e) { /* not a Flate stream */ }
    }
    return { runs: runs, labelY: labelY, pages: T.pdfPages(u8) };
  }
  // ---- the print rollback's document: each page's reserve, measured as the frozen fit measures it -------
  // (exportMonthPdf: the print-root shown off-screen at the print width, .mv-arrow / .mv-tools / .mv-note-add /
  // .mv-row-expand hidden, then the first week's top minus .mv-header's top.)
  async function printReserves() {
    await T.sleep(700);
    var captured = false, realPrint = window.print;
    window.print = function () { captured = true; };
    T.monthPrintPath();
    try {
      byId('export-btn').click();
      await T.until(function () { return captured; }, 'the month print path', 200, 100);
      var host = byId('print-root'), prev = host.style.cssText;
      host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:996px;';
      var hid = Array.from(host.querySelectorAll('.mv-arrow, .mv-tools, .mv-note-add, .mv-row-expand'));
      hid.forEach(function (e) { e.dataset.mvhdroffDisp = e.style.display; e.style.display = 'none'; });
      var pages = Array.from(host.querySelectorAll('.print-page')).map(function (p) {
        var h = p.querySelector('.mv-header'), w = p.querySelector('.mv-week');
        if (!h || !w) return null;
        return Math.round(w.getBoundingClientRect().top - h.getBoundingClientRect().top);
      });
      hid.forEach(function (e) { e.style.display = e.dataset.mvhdroffDisp; delete e.dataset.mvhdroffDisp; });
      host.style.cssText = prev;
      return pages;
    } finally {
      window.dispatchEvent(new Event('afterprint'));
      window.print = realPrint;
      T.monthPrintPath(false);
    }
  }

  // ---- Save and Load through the real controls (hdrrow's shape: a load is in when its sidebar tab is) -----
  var written = [];
  var saveHandle = { name: 'mvhdroff.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'mvhdroff.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1];
  }
  var loads = 0, TABS = ['phases', 'show'];
  function activeTab() { var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  async function load(text) {
    var name = 'mvhdroff-load-' + (++loads) + '.sptcal';
    var snap = JSON.parse(text), tab = TABS[loads % 2];
    if (tab === activeTab()) tab = TABS[(loads + 1) % 2];
    snap.sidebarTab = tab;
    var p = T.openViaFakePicker('/tests/fixtures/v1.5.0-saved.sptcal', name, { text: JSON.stringify(snap), writes: written });
    for (var i = 0; i < 100; i++) { await T.sleep(100); if (activeTab() === tab) break; T.clickModalButton('Load'); }
    await p;
    await T.until(function () { return activeTab() === tab; }, 'the loaded calendar (its sidebar tab)', 100, 100);
    await settle('the calendar after Load');
    if (!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await settle('the calendar to settle');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    // ===== M0: control ================================================================================
    await view('month');
    var rows0 = await menuRows();
    await closeMenu();
    var lines0 = headerLines(), top0 = barTop(), h0 = mvHeaderH();
    var plain = await save(), plainSnap = JSON.parse(plain), ids0 = Object.keys(plainSnap.fields.byId).sort();
    kase('M0', 'control: the month menu is Auto / Template / Manual / Off; the header shows its lines; the file has no mvHeaderOff',
      sameArr(rows0, ['Auto', 'Template', 'Manual', 'Off']) && hdrBtn() === 'Header: Auto' && h0 > 30 && lines0.length >= 2 &&
      !('mvHeaderOff' in plainSnap) && !('headerOff' in plainSnap) && !document.body.classList.contains('mv-hdr-off'),
      { rows: rows0, lines: lines0, headerH: h0 });
    var pdf0 = await monthPdf();
    var print0 = await printReserves();

    // ===== M1: Off on screen ==========================================================================
    await chooseMode('Off');
    var top1 = barTop(), h1 = mvHeaderH();
    var m1 = { btn: hdrBtn(), headerH: h1, moved: top0 - top1, bodyCls: document.body.classList.contains('mv-hdr-off'),
               wfCls: document.body.classList.contains('wf-hdr-off') };
    await view('sheet');
    m1.wfBtn = hdrBtn(); m1.wfBar = wfBarShown();
    await view('month');
    m1.backBtn = hdrBtn();
    kase('M1', 'Off: the button reads Header: Off, the month header is collapsed and the month bar moves up by its height; the waterfall keeps its own header (Header: Auto, title block shown)',
      m1.btn === 'Header: Off' && h1 === 0 && m1.bodyCls && !m1.wfCls && Math.abs(m1.moved - (h0 + 14)) <= 2 &&
      m1.wfBtn === 'Header: Auto' && m1.wfBar && m1.backBtn === 'Header: Off',
      m1);

    // ===== M2: the print rollback =====================================================================
    var print1 = await printReserves();
    var drops = print1.map(function (r, i) { return (r === null || print0[i] === null) ? null : print0[i] - r; });
    var real = drops.filter(function (g) { return g !== null; });
    kase('M2', 'the print rollback: the same pages, and on EVERY page the reserve the frozen fit measures (header top to first week) drops by the same amount, the header\'s, and stays above the fit\'s 20 px floor',
      print1.length === print0.length && real.length >= 2 && real.length === print1.length &&
      real.every(function (g) { return g >= 40 && Math.abs(g - real[0]) <= 2; }) &&
      print1.every(function (r) { return r > 20 && Math.abs(r - print1[0]) <= 2; }),
      { pages: print1.length, control: print0, off: print1, drops: drops });

    // ===== M3: the written month PDF ==================================================================
    var pdf1 = await monthPdf();
    var hdrInControl = lines0.filter(function (l) { return pdf0.runs.indexOf(l) !== -1; });
    var hdrInOff = lines0.filter(function (l) { return pdf1.runs.indexOf(l) !== -1; });
    kase('M3', 'the written month PDF: the same pages, none of the header\'s lines (the control has them), and the month bar set higher on the page',
      pdf1.pages === pdf0.pages && hdrInControl.length >= 1 && hdrInOff.length === 0 &&
      pdf0.labelY !== null && pdf1.labelY !== null && pdf1.labelY - pdf0.labelY >= 30,
      { pages: [pdf0.pages, pdf1.pages], inControl: hdrInControl, inOff: hdrInOff, labelY: [pdf0.labelY, pdf1.labelY] });

    // ===== M4: one undo step ==========================================================================
    await undo();
    var undone = { shown: mvShown(), btn: hdrBtn() };
    await redo();
    var redone = { shown: mvShown(), btn: hdrBtn() };
    kase('M4', 'Off is ONE undo step: undo brings the month header back (Auto), redo turns it off again',
      undone.shown && undone.btn === 'Header: Auto' && !redone.shown && redone.btn === 'Header: Off', { undone: undone, redone: redone });

    // ===== M5: Off over Manual ========================================================================
    await chooseMode('Auto');
    await chooseMode('Manual');
    var line = document.querySelector('#table-wrap .mv-header .hdr-line[data-mvhid="title"]');
    line.focus(); line.textContent = 'Hand Month Line'; line.blur();
    await settle('the month after a manual line');
    var manualText = txt(mvHeader());
    await chooseMode('Off');
    var offWhileManual = { shown: mvShown(), btn: hdrBtn() };
    await chooseMode('Manual');
    var backText = txt(mvHeader());
    kase('M5', 'Off over a Manual header hides it, and choosing Manual again brings back the same hand-written lines',
      !offWhileManual.shown && offWhileManual.btn === 'Header: Off' && /Hand Month Line/.test(manualText) && backText === manualText && hdrBtn() === 'Header: Manual',
      { offWhileManual: offWhileManual, same: backText === manualText });

    // ===== M6: Save / Load / the M-5 trap / junk =======================================================
    await chooseMode('Off');
    var offSaved = await save(), offSnap = JSON.parse(offSaved);
    await load(plain);
    var afterPlain = { shown: mvShown(), btn: hdrBtn() };
    await load(offSaved);
    var afterOff = { shown: mvShown(), btn: hdrBtn(), cls: document.body.classList.contains('mv-hdr-off') };
    var noKey = JSON.parse(offSaved); delete noKey.mvHeaderOff;
    await load(JSON.stringify(noKey));
    var m5 = { shown: mvShown(), btn: hdrBtn() };
    var junk = JSON.parse(offSaved); junk.mvHeaderOff = 'yes';
    await load(JSON.stringify(junk));
    var junked = { shown: mvShown(), btn: hdrBtn() };
    kase('M6', 'Save writes mvHeaderOff: true (no headerOff, no new field id); Load brings Off back; the same file with no key opens with its month header ON (the M-5 trap); a non-boolean value is dropped',
      offSnap.mvHeaderOff === true && !('headerOff' in offSnap) && sameArr(Object.keys(offSnap.fields.byId).sort(), ids0) &&
      afterPlain.shown && afterPlain.btn === 'Header: Auto' && !afterOff.shown && afterOff.btn === 'Header: Off' && afterOff.cls &&
      m5.shown && m5.btn === 'Header: Manual' && junked.shown && junked.btn === 'Header: Manual',
      { afterPlain: afterPlain, afterOff: afterOff, m5: m5, junked: junked });

    // ===== M7: the template editor from Off ===========================================================
    await load(offSaved);
    await menuRows();
    var peek = document.querySelector('.hdr-mode-pop .hdr-mode-peek');
    if (!peek) throw new Error('no "Open the template editor…" link in the month menu');
    peek.click();
    await settle('the month after opening the template editor');
    var m7 = { shown: mvShown(), btn: hdrBtn(), cls: document.body.classList.contains('mv-hdr-off') };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await T.sleep(300);
    kase('M7', '"Open the template editor…" from Off shows the month header again, in Template (editing lines nobody can see would be editing blind)',
      m7.shown && m7.btn === 'Header: Template' && !m7.cls, m7);
  } catch (e) {
    out.EX = String(e && e.stack || e);
  }
  // M6 loads a file with mvHeaderOff: 'yes' on purpose, and sanitizeSnapshot says so once: that warning is the
  // sanitizer working, so it is counted, not forgiven blindly -- exactly one, and nothing else.
  var errs = T.appHealth ? T.appHealth() : null, all = (errs && errs.errors) || [];
  var sanit = all.filter(function (m) { return /were not in a form the app writes, and were ignored/.test(m); });
  var other = all.filter(function (m) { return sanit.indexOf(m) === -1; });
  kase('E0', 'no console errors, apart from exactly one sanitizer warning, for M6\'s junk value',
    !!errs && other.length === 0 && sanit.length === 1, { other: other, sanitizer: sanit.length });
  T.done(out);
})(); });
