// monthpick -- the month view's Export PDF writes a CHOSEN RUN OF MONTHS (audit AUD2-026, item 2.11; owner D8 = c,
// 13 Nov 2026). Started as the audit's repro (audit-m2-print: with July on screen, 16 pages and no question asked),
// moved onto the synthetic reference calendar (T.buildFixture), and grown into the fix's leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh monthpick 300
//
// The dialog (src/chrome/MonthPdfDialog.jsx): Months All / This month / Range (From .. to), opening on All. Owner-
// approved defaults: All is the default and writes exactly the file from before; the choice is session only; the print
// rollback is not asked and prints every month. This leg drives the dialog itself (T.pdfDialog('manual')).
//
// THE CLOCK IS PINNED to local noon on 22 Sep 2026, as monthexport pins it, so the all-months file can be held BYTE FOR
// BYTE to gate 13's own baseline for this calendar (M1, below).
//
// CASES
//   M0  Export PDF in the month view opens the month dialog: "Export PDF", All / This month / Range, on All; This
//       month names the month on screen (July 2026); All names the span; no From / To until Range is picked
//   M1  ⭐ Export at the default writes every month, then the SPTCal mark; Enter writes the same bytes, and so does Some
//       months spanning every month. The file is written out as monthpick.all.pdf, and the caller holds it, mark
//       stripped, BYTE FOR BYTE to gate 13's baseline for this calendar (tests/baselines/2026-10-05-monthwriter/
//       reference.pdf), with pdfmark.py and monthbase.py. ⚠️ Not in the page: srv.js serves every file as a string,
//       so a PDF fetched from it arrives re-encoded as UTF-8 (measured: 81,804 bytes in, 140,327 out).
//   M2  This month (July on screen) writes ONE page, July 2026, and that page is the all-months file's July page
//   M3  Range, July to September 2026, writes three pages, in order, each the all-months file's own page
//   M4  the run reads forwards: a From after the To moves the To with it (October alone), and the other way round
//   M5  Cancel and Escape write nothing: no Save dialog, the calendar still saved, no undo step
//   M6  session only: the next opening is back on All, and a Save while the dialog is open (Range showing) puts
//       none of its ids in fields.byId and no new key in the file
//   M7  the print rollback (MV_PDF_MODE 'print', by its localhost switch) is not asked and prints every month
//   M8  a calendar with one month to print writes it with no dialog
//   E0  no console errors
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
(function pinClock(){
  var RealDate = window.Date, FIXED = new RealDate(2026, 8, 22, 12, 0, 0).getTime();
  function PinnedDate(a, b, c, d, e, f, g){
    if(!(this instanceof PinnedDate)) return new RealDate(FIXED).toString();
    if(arguments.length === 0) return new RealDate(FIXED);
    if(arguments.length === 1) return new RealDate(a);
    return new RealDate(a, b, c === undefined ? 1 : c, d || 0, e || 0, f || 0, g || 0);
  }
  PinnedDate.prototype = RealDate.prototype;
  PinnedDate.now = RealDate.now; PinnedDate.UTC = RealDate.UTC; PinnedDate.parse = RealDate.parse;
  window.Date = PinnedDate;
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {test: 'monthpick', cases: cases, info: info};
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
  }
  function q(s) { return document.querySelector(s); }
  function byId(id) { return document.getElementById(id); }
  function txt(el) { return el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : null; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function sameBytes(a, b) { if(!a || !b || a.length !== b.length) return false; for(var i = 0; i < a.length; i++) if(a[i] !== b[i]) return false; return true; }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTH_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d(?![\s\S])/;
  function monthLabel() { return txt(q('#table-wrap .mv-monthyear')); }
  function monthIndex(l) { var p = String(l || '').split(' '); return p.length === 2 ? (+p[1]) * 12 + MONTHS.indexOf(p[0]) : NaN; }
  async function goTo(label) {
    for (var g = 0; g < 40 && monthLabel() !== label; g++) {
      byId(monthIndex(monthLabel()) < monthIndex(label) ? 'mv-next' : 'mv-prev').click(); await T.sleep(60);
    }
  }
  async function settle(label) {
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label || 'the calendar to settle', 200, 100);
  }
  var btn = function () { return byId('export-btn'); };
  var busy = function () { var b = btn(); return !!b && (b.disabled || b.hasAttribute('data-loading')); };

  // ---- the dialog ---------------------------------------------------------------------------------------------------
  function dlg() { return q('.month-pdf-dlg .mantine-Modal-content'); }
  function radios() { return Array.prototype.slice.call(document.querySelectorAll('.month-pdf-dlg input[type="radio"]')); }
  function checkedSeg() { var r = radios().filter(function (i) { return i.checked; })[0]; return r ? r.value : null; }
  function segText(value) {
    var inp = radios().filter(function (i) { return i.value === value; })[0];
    var lab = inp && q('label[for="' + inp.id + '"]');
    return lab ? txt(lab) : null;
  }
  function sel(which) { return q('.month-pdf-dlg select[data-pdfdlg="' + which + '"]'); }
  async function open() {
    await T.until(function () { return !busy(); }, 'the Export button to come free', 100, 100).catch(function () {});
    await T.sleep(700);   // the button's 600 ms re-click guard
    btn().click();
    await T.until(function () { return !!q('.month-pdf-dlg [data-pdfdlg="export"]'); }, 'the month Export PDF dialog', 60, 100);
    await T.sleep(150);
    return dlg();
  }
  async function pick(value) {
    var inp = radios().filter(function (i) { return i.value === value; })[0];
    if(!inp) throw new Error('no ' + value + ' segment in the month dialog');
    var lab = q('label[for="' + inp.id + '"]');
    (lab || inp).click();
    await T.sleep(250);
  }
  async function choose(which, value) {
    var s = sel(which);
    if(!s) throw new Error('no ' + which + ' select in the month dialog');
    var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    d.set.call(s, value);
    s.dispatchEvent(new Event('change', {bubbles: true}));
    await T.sleep(200);
  }
  function press(key, target) {
    var e = new KeyboardEvent('keydown', {key: key, bubbles: true, cancelable: true});
    (target || document).dispatchEvent(e);
  }
  // Answer the open dialog with `how` (a function that clicks or presses), and capture the file it writes: {file, calls}.
  async function exportWith(how) {
    var rec = T.fakeSavePicker();
    try {
      how();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100).catch(function () {});
    } finally { rec.restore(); }
    await T.until(function () { return !busy(); }, 'the button to come free', 100, 100).catch(function () {});
    var f = rec.files.filter(function (f) { return f.closed; })[0] || null;
    return {file: f, calls: rec.calls.length};
  }
  async function nothingWith(how) {
    var rec = T.fakeSavePicker();
    try { how(); await T.until(function () { return !dlg(); }, 'the dialog to close', 50, 100).catch(function () {}); await T.sleep(1200); }
    finally { rec.restore(); }
    return {calls: rec.calls.length, files: rec.files.length, open: !!dlg()};
  }
  function clickExport() { q('.month-pdf-dlg [data-pdfdlg="export"]').click(); }
  // ---- a written PDF, read back ------------------------------------------------------------------------------------
  async function read(f) {
    if(!f) return null;
    var u = T.pdfUnmark(f.bytes);
    var runs = await T.pdfRuns(f.bytes);
    var streams = await T.pdfInflated(f.bytes);
    return {bytes: f.bytes, writer: u ? u.writer : null, marked: !!u, name: f.name, pages: T.pdfPages(f.bytes),
            months: runs.filter(function (r) { return MONTH_RE.test(r); }), streams: streams};
  }
  // Every inflated stream of `part` (each page's content, each font program) is one of `whole`'s, each used once: so
  // every page it draws is a page the all-months file draws, operator for operator.
  function within(part, whole) {
    var pool = whole.streams.slice(), missing = 0;
    part.streams.forEach(function (s) { var k = pool.indexOf(s); if(k < 0) missing++; else pool.splice(k, 1); });
    return missing;
  }
  // ---- Save (as pdfdialog saves) ------------------------------------------------------------------------------------
  var written = [];
  var saveHandle = {name: 'monthpick.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'monthpick.sptcal', {lastModified: 1}); },
    createWritable: async function () { var parts = []; return {write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); }}; }};
  async function save() {
    var n = written.length, real = window.showSaveFilePicker;
    window.showSaveFilePicker = async function () { return saveHandle; };
    try {
      await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
      byId('save-file-btn').click();
      await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    } finally { window.showSaveFilePicker = real; }
    await T.sleep(300);
    return JSON.parse(written[written.length - 1]);
  }
  function status() { return ((q('.save-status') || {}).textContent || '').trim(); }
  function undoOff() { var b = byId('undo-btn'); return !b || b.disabled || b.hasAttribute('data-disabled'); }

  try {
    await T.appReady();
    T.pdfDialog('manual');
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 10; }, 'the waterfall grid', 200, 100);
    await settle('the first render');
    var s0 = await save();
    var ids0 = Object.keys(s0.fields.byId).sort(), keys0 = Object.keys(s0).sort();
    byId('view-month-btn').click();
    await T.until(function () { return !!q('#table-wrap .mv-daygrid'); }, 'the month view', 200, 100);
    await settle('the month view');
    await goTo('July 2026');
    info.onScreen = monthLabel();

    // ===== M0: the dialog, and what it opens on =======================================================================
    var d = await open();
    var m0 = {title: txt(q('.month-pdf-dlg .mantine-Modal-title')), segs: radios().map(function (i) { return i.value; }), on: checkedSeg(),
              all: segText('all'), thisMonth: segText('this'), some: segText('some'), selects: !!sel('from') || !!sel('to'),
              thisDisabled: (radios().filter(function (i) { return i.value === 'this'; })[0] || {}).disabled};
    var nothing0 = await nothingWith(function () { q('.month-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    add('M0', 'Export PDF in the month view opens the month dialog on All: All (Jan 2026 – Apr 2027) / This month (July 2026) / Range, and no From or To yet',
        m0.title === 'Export PDF' && same(m0.segs, ['all', 'this', 'some']) && m0.on === 'all' && /^All Jan 2026 – Apr 2027/.test(m0.all || '') &&
        /^This month July 2026/.test(m0.thisMonth || '') && m0.thisDisabled === false && /^Range/.test(m0.some || '') && !m0.selects,
        m0, 'that dialog, on All');

    // ===== M1: the default is exactly the file from before ===========================================================
    await open();
    var all = await read((await exportWith(clickExport)).file);
    await open();
    var enter = await read((await exportWith(function () { press('Enter', q('.month-pdf-dlg input[type="radio"]')); })).file);
    await open();
    await pick('some'); await choose('from', '2026-01'); await choose('to', '2027-04');
    var span = await read((await exportWith(clickExport)).file);
    info.allPages = all && all.pages; info.allMonths = all && all.months; info.allWriterBytes = all && all.writer && all.writer.length;
    if(all) out.pdfs = {all: T.b64(all.bytes.buffer)};
    add('M1', '⭐ Export at the default writes all 16 months (then the SPTCal mark); Enter writes the same bytes, and so does Range spanning every month (the file goes out as monthpick.all.pdf for the byte check against gate 13\'s baseline)',
        !!all && all.marked && all.pages === 16 && same(all.months, ['January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
          'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026', 'January 2027', 'February 2027', 'March 2027', 'April 2027']) &&
        !!enter && sameBytes(enter.bytes, all.bytes) && !!span && sameBytes(span.bytes, all.bytes),
        {pages: all && all.pages, months: all && all.months, writer: all && all.writer && all.writer.length,
         enterSame: !!enter && !!all && sameBytes(enter.bytes, all.bytes), spanSame: !!span && !!all && sameBytes(span.bytes, all.bytes)},
        '16 pages, January 2026 to April 2027; the three files identical');

    // ⚠️ Re-expected on release-v1.15, where 2.11 met 2.10: "named as before" is now the all-months file's own name,
    // which since audit 2.10 carries the season and the Date Last Edited ("Test Show Month Calendar S2 2026-09-22.pdf"),
    // and since 16 Nov 2026 the season beside the title (owner-approved, exportFileName: "Test Show S2 Month Calendar
    // 2026-09-22.pdf"). Re-expected then: the prefix below was /^Test Show Month Calendar[ .]/.
    // ===== M2: This month =============================================================================================
    await open();
    await pick('this');
    var one = await read((await exportWith(clickExport)).file);
    add('M2', 'This month (July 2026 on screen) writes ONE page, July 2026, the very page the all-months file draws for July, named as before',
        !!one && one.pages === 1 && same(one.months, ['July 2026']) && within(one, all) === 0 && /^Test Show S2 Month Calendar (?:v\S+ )?(?:WRO \d+\.\d+\.\d{2} )?- a\.o\. \d+\.\d+\.\d{2}\.pdf$/.test(one.name || '') && !!all && one.name === all.name,
        {pages: one && one.pages, months: one && one.months, notInAll: one ? within(one, all) : null, name: one && one.name, allName: all && all.name}, '1 page, July 2026, named as the all-months file is');

    // ===== M3: Range ============================================================================================
    await open();
    await pick('some');
    var m3open = {from: sel('from') && sel('from').value, to: sel('to') && sel('to').value, options: sel('from') ? sel('from').options.length : 0};
    await choose('to', '2026-09');
    var run = await read((await exportWith(clickExport)).file);
    add('M3', 'Range opens From the month on screen To the last (July 2026 to April 2027, 16 months offered); July to September 2026 writes those three pages, in order, each the all-months file\'s own',
        m3open.from === '2026-07' && m3open.to === '2027-04' && m3open.options === 16 &&
        !!run && run.pages === 3 && same(run.months, ['July 2026', 'August 2026', 'September 2026']) && within(run, all) === 0,
        {opened: m3open, pages: run && run.pages, months: run && run.months, notInAll: run ? within(run, all) : null}, '3 pages: July, August, September 2026');

    // ===== M4: the run reads forwards =================================================================================
    await open();
    await pick('some'); await choose('to', '2026-09'); await choose('from', '2026-10');
    var fwd = {from: sel('from').value, to: sel('to').value};
    await choose('to', '2026-08');
    var back = {from: sel('from').value, to: sel('to').value};
    await choose('to', '2026-10'); await choose('from', '2026-10');
    var oct = await read((await exportWith(clickExport)).file);
    add('M4', 'the run reads forwards: a From past the To moves the To with it, a To before the From moves the From; October to October writes October alone',
        fwd.from === '2026-10' && fwd.to === '2026-10' && back.from === '2026-08' && back.to === '2026-08' &&
        !!oct && oct.pages === 1 && same(oct.months, ['October 2026']) && within(oct, all) === 0,
        {fromPastTo: fwd, toBeforeFrom: back, pages: oct && oct.pages, months: oct && oct.months}, 'Oct/Oct; Aug/Aug; 1 page, October 2026');

    // ===== M5: Cancel and Escape write nothing ========================================================================
    await save();
    var st0 = /Unsaved/.test(status()), undo0 = undoOff();
    await open(); await pick('some');
    var c5 = await nothingWith(function () { q('.month-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    var after5 = {unsaved: /Unsaved/.test(status()), undoOff: undoOff()};
    await open(); await pick('this');
    var e5 = await nothingWith(function () { press('Escape', dlg()); });
    var afterEsc = {unsaved: /Unsaved/.test(status()), undoOff: undoOff()};
    add('M5', 'Cancel and Escape write nothing: no Save dialog, no file, the dialog gone, the calendar still saved, no undo step',
        c5.calls === 0 && c5.files === 0 && !c5.open && e5.calls === 0 && e5.files === 0 && !e5.open &&
        st0 === false && after5.unsaved === false && afterEsc.unsaved === false && after5.undoOff === undo0 && afterEsc.undoOff === undo0,
        {cancel: c5, escape: e5, before: {unsaved: st0, undoOff: undo0}, afterCancel: after5, afterEscape: afterEsc}, 'nothing at all');

    // ===== M6: session only ===========================================================================================
    await open();
    var reopened = checkedSeg();
    await pick('some');
    var dlgIds = Array.prototype.slice.call(document.querySelectorAll('.month-pdf-dlg input[id], .month-pdf-dlg select[id]')).map(function (i) { return i.id; });
    var s6 = await save();
    await nothingWith(function () { q('.month-pdf-dlg [data-pdfdlg="cancel"]').click(); });
    var ids6 = Object.keys(s6.fields.byId).sort(), keys6 = Object.keys(s6).sort();
    add('M6', 'session only: the next opening is back on All, and a Save with Range showing puts none of the dialog\'s ids in fields.byId and no new key in the file',
        reopened === 'all' && dlgIds.length >= 5 && same(ids6, ids0) && dlgIds.every(function (i) { return ids6.indexOf(i) < 0; }) && same(keys6, keys0),
        {reopenedOn: reopened, dialogIds: dlgIds.length, addedIds: ids6.filter(function (k) { return ids0.indexOf(k) < 0; }),
         addedKeys: keys6.filter(function (k) { return keys0.indexOf(k) < 0; })}, 'All; none; none');

    // ===== M7: the print rollback is not asked =======================================================================
    await T.until(function () { return !busy(); }, 'the button to come free', 100, 100).catch(function () {});
    T.monthPrintPath();
    var printed = null, saw7 = false, realPrint = window.print;
    var mo = new MutationObserver(function () { if (q('.month-pdf-dlg')) saw7 = true; });
    mo.observe(document.documentElement, {childList: true, subtree: true});
    window.print = function () { printed = document.querySelectorAll('#print-root .print-page').length; };
    try {
      await T.sleep(700);
      btn().click();
      await T.until(function () { return printed !== null; }, 'the print path', 200, 100).catch(function () {});
    } finally {
      window.dispatchEvent(new Event('afterprint'));
      window.print = realPrint; mo.disconnect(); T.monthPrintPath(false);
    }
    add('M7', 'the print rollback (MV_PDF_MODE \'print\', by its localhost switch) asks nothing and prints every month',
        !saw7 && printed === 16, {sawDialog: saw7, printedPages: printed}, 'no dialog; 16 sheets');

    // ===== M8: one month to print, no dialog ==========================================================================
    await T.sleep(400);
    ['start-writersRoom', 'start-prodPrep', 'start-production', 'start-post', 'start-localization'].forEach(function (id) { T.set(id, ''); });
    T.set('weeks-prePrep', '2');
    T.set('union-place', '');
    await settle('the one-month calendar');
    await T.sleep(800);
    var saw8 = false;
    var mo8 = new MutationObserver(function () { if (q('.month-pdf-dlg')) saw8 = true; });
    mo8.observe(document.documentElement, {childList: true, subtree: true});
    var only = null;
    try {
      only = await read((await exportWith(function () { btn().click(); })).file);
    } finally { mo8.disconnect(); }
    add('M8', 'a calendar with one month to print (Pre-Prep alone, two weeks of April 2026, no Region) writes it with no dialog',
        !saw8 && !!only && only.pages === 1 && same(only.months, ['April 2026']),
        {sawDialog: saw8, pages: only && only.pages, months: only && only.months, modal: T.modalText()}, 'no dialog; 1 page, April 2026');

    var errs = (T.appHealth().errors || []);
    add('E0', 'no console errors', errs.length === 0, {errors: errs.slice(0, 5)}, 'none');
  } catch (e) {
    add('EX', 'the leg ran to the end', false, String(e && e.stack || e), 'no exception');
  }
  out.health = T.appHealth ? T.appHealth() : null;
  T.done(out);
})(); });
