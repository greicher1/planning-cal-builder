// dayfirst -- a DAY-FIRST calendar writes every date day first (November 2026 audit, Batch 2 item 2.4: AUD2-012; the
// owner's decision D3 (a), 13 Nov 2026). Before, Dates = DD/MM changed the Date column only: the same page said
// 30/3/2026 beside "Good Friday 4/3/26", the title block "Writer's Room Opens: 1.5.26", and the sidebar, the tool lists
// and the note editors read month first.
//
// Each check compares the calendar against ITSELF read month first, swapped: every a/b/yy (and a.b.yy) the month-first
// calendar shows must read b/a/yy once Dates is DD/MM, in the same place, and nothing else may change. So the leg needs
// no hand-written dates, and a line the app writes month first anywhere fails it.
//   N  the waterfall's notes, a typed note holding an automatic line included (re-dated through audit item 1.1's follow)
//   H  the title block      S  the sidebar's phase lines      T  the Shift list      E  the note editor's title
//   X  the workbook's text cells and its page header           P  the waterfall PDF's text
//   M  the month view: the typed week's re-dated automatic line on its own day, written day first
//   U  one undo step: Undo brings the month-first text back exactly, Redo the day-first
//   R  back to MM/DD/YY: every one of the above exactly as it was, and the PDF byte for byte (the writer's own bytes)
//   B  the key facts band and Compare (a three-scenario file): day first too
//   E0 no console error, no native alert
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function txt(e) { return e ? (e.innerText || e.textContent || '').replace(/[ \t]+/g, ' ').trim() : null; }
  async function settled() {
    var last = '', same = 0;
    for (var i = 0; i < 100 && same < 3; i++) {
      await T.sleep(100);
      var s = (byId('table-wrap') || {}).innerHTML || '';
      if (s.length && s === last) same++; else { same = 0; last = s; }
    }
    await T.sleep(150);
  }
  // Every a/b/yy (or a.b.yy, a/b/yyyy) in `s`, its first two numbers swapped.
  var DATE = /(^|[^\d.\/])(\d{1,2})([\/.])(\d{1,2})\3(\d{2}|\d{4})(?![\d.\/])/g;
  function swap(s) { return String(s).replace(DATE, function (all, pre, a, sep, b, y) { return pre + b + sep + a + sep + y; }); }
  function dated(s) { DATE.lastIndex = 0; var r = DATE.test(String(s)); DATE.lastIndex = 0; return r; }
  function swapAll(list) { return list.map(swap); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function diffs(a, b) {
    var o = [];
    for (var i = 0; i < Math.max(a.length, b.length) && o.length < 6; i++) if (a[i] !== b[i]) o.push({i: i, want: a[i], got: b[i]});
    return o;
  }

  function notes() {
    return qa('#table-wrap td.sheet-note-cell.has-note').map(function (td) { return td.getAttribute('data-week') + ' | ' + (td.innerText || '').trim().split('\n').map(function (l) { return l.trim(); }).join(' / '); });
  }
  function header() { return qa('#table-wrap .cal-header-bar .hdr-line').map(txt); }
  function meta() { return qa('[id^="meta-"], [id^="unitmeta-"]').map(function (e) { return e.id + ': ' + txt(e); }).filter(function (s) { return /\d/.test(s); }); }
  async function shiftList() {
    T.closePops(); await T.sleep(150);
    byId('pop-shift-btn').click(); await T.sleep(400);
    var r = qa('#pop-shift .solve-dt').map(txt);
    T.closePops(); await T.sleep(200);
    return r;
  }
  async function editorTitle(wk) {
    var td = q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]');
    td.scrollIntoView({block: 'center'}); await T.sleep(80);
    T.openCell(td); await T.sleep(350);
    // ⚠️ Re-expected on release-v1.15, where 2.4 met the note editors' look A2: A2 splits the title into the name
    // (.note-pop-title, "Note") and the day in grey (.note-pop-when, "Week of 6/29/26"), so the title read here is the
    // whole heading, both spans.
    var pop = q('.note-pop'), t = pop ? txt(q('.note-pop-heading', pop) || q('.note-pop-title', pop)) : null;
    var ds = pop && q('.note-day-select', pop);
    var days = ds ? Array.prototype.slice.call(ds.options).map(function (o) { return o.text; }) : [];
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    if (q('.note-pop textarea')) q('.note-pop textarea').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await settled();
    return {title: t, days: days};
  }
  async function workbook(tag) {
    await T.sleep(500);
    var blob = await T.captureExport('export-btn', 'the workbook ' + tag);
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    var ws = wb.worksheets[0], texts = [];
    ws.eachRow(function (row, r) { row.eachCell(function (c, k) {
      if (typeof c.value === 'string' && dated(c.value)) texts.push(r + ':' + k + ' ' + c.value.replace(/\n/g, ' / '));
    }); });
    return {texts: texts, header: (ws.headerFooter && ws.headerFooter.oddHeader) || ''};
  }
  async function pdf(tag) {
    var blob = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF ' + tag);
    var u8 = new Uint8Array(await blob.arrayBuffer());
    var un = T.pdfUnmark(u8), own = un ? un.writer : u8;
    var runs = (await T.pdfRuns(own)).filter(function (s) { return dated(s); });
    var h = 0; for (var i = 0; i < own.length; i++) h = (h * 31 + own[i]) >>> 0;
    return {runs: runs, len: own.length, hash: h};
  }
  async function monthLines(label) {
    byId('view-month-btn').click();
    await T.until(function () { return q('#table-wrap .mv-daygrid'); }, 'the month view', 80, 100);
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 40; i++) {
      var my = txt(q('#table-wrap .mv-monthyear'));
      if (my === label) break;
      byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150);
    }
    await settled();
    var r = qa('#table-wrap .mv-note-block[data-note-day]').map(function (b) { return b.getAttribute('data-note-day') + ' | ' + txt(b).replace(/^[↻⚑]\s*/, ''); });
    byId('view-sheet-btn').click();
    await T.until(function () { return q('#table-wrap table.sheet-table'); }, 'the waterfall', 80, 100);
    await settled();
    return r;
  }
  async function snap(tag) {
    var s = {notes: notes(), header: header(), meta: meta()};
    s.shift = await shiftList();
    s.editor = await editorTitle('2026-06-29');
    s.xl = await workbook(tag);
    s.pdf = await pdf(tag);
    return s;
  }

  try {
    await T.appReady();
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    T.buildFixture();
    await T.until(function () { return q('table.sheet-table'); }, 'grid');
    await settled();
    await T.showHolidaysInSheet(); await settled();
    // A typed note holding its week's automatic line: Production's start week, one line of the user's own added.
    var td = q('#table-wrap td.sheet-note-cell[data-week="2026-06-29"]');
    var auto = (td.innerText || '').trim();
    await T.typeUserNote('2026-06-29', auto + '\nCast dinner'); await settled();
    out.typed = notes().filter(function (n) { return /^2026-06-29/.test(n); });

    // ---- MINT (?g=m): tests/fixtures/dayfirst.sptcal, a MONTH-FIRST calendar to try the change on by hand: this
    // calendar (every holiday ticked into the waterfall, the typed 6/29 note) plus "Table read 7/17/26" typed in the
    // 7/13 week, saved through the real Save. Switch Dates to DD/MM and every date turns round; the typed "7/17/26"
    // stays as typed and still sits on Fri 17 Jul in the month view. Not a gate run.
    if (/[?&]g=m\b/.test(location.search)) {
      await T.typeUserNote('2026-07-13', 'Table read 7/17/26'); await settled();
      var written = [];
      var h = { name: 'dayfirst.sptcal', kind: 'file',
        queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
        isSameEntry: async function (o) { return o === h; },
        getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'dayfirst.sptcal', {lastModified: 1}); },
        createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
      window.showSaveFilePicker = async function () { return h; };
      byId('save-file-btn').click();
      await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
      var ms = JSON.parse(written[0]);
      add('M0', 'the minted calendar is month first and carries the two typed notes',
        !('dateFormat' in ms) && Object.keys(ms.userNotes || {}).length === 2 && ((ms.userNotes || {})['2026-07-13'] || {}).text === 'Table read 7/17/26',
        ms.userNotes, 'no dateFormat; two notes');
      out.sptcal = T.b64(new TextEncoder().encode(written[0]));
      T.done(out);
      return;
    }

    var A = await snap('month first');
    out.A = {notes: A.notes.slice(0, 12), header: A.header, meta: A.meta, shift: A.shift, editor: A.editor, xlHeader: A.xl.header, pdfRuns: A.pdf.runs.slice(0, 20)};

    T.pickSelect('wf-date-format', 'd/m/yyyy'); await settled();
    var B = await snap('day first');
    out.B = {notes: B.notes.slice(0, 12), header: B.header, meta: B.meta, shift: B.shift, editor: B.editor, xlHeader: B.xl.header, pdfRuns: B.pdf.runs.slice(0, 20)};

    add('N1', 'every date in the waterfall’s notes reads day first, in the same place (holidays, automatic notes)',
      A.notes.length > 5 && A.notes.some(dated) && same(B.notes, swapAll(A.notes)),
      {n: A.notes.length, diffs: diffs(swapAll(A.notes), B.notes)}, 'the month-first notes, each date swapped');
    var tA = A.notes.filter(function (n) { return /^2026-06-29/.test(n); })[0] || '', tB = B.notes.filter(function (n) { return /^2026-06-29/.test(n); })[0] || '';
    add('N2', 'a typed note’s automatic line is re-dated day first and the user’s own line stays (audit item 1.1’s follow)',
      /Start Principal Photography 6\/29\/26/.test(tA) && /Cast dinner/.test(tA) && /Start Principal Photography 29\/6\/26/.test(tB) && /Cast dinner/.test(tB),
      {before: tA, after: tB}, 'Start Principal Photography 29/6/26 / Cast dinner');
    add('H1', 'the title block reads day first (Writer’s Room Opens, Principal Photography / Wrap, the date stamp)',
      A.header.some(dated) && same(B.header, swapAll(A.header)) && B.header.some(function (l) { return /Principal Photography 29\.6\.26/.test(l); }),
      {before: A.header, after: B.header}, 'every m.d.yy swapped');
    add('S1', 'the sidebar’s phase lines read day first',
      A.meta.some(dated) && same(B.meta, swapAll(A.meta)), {before: A.meta.slice(0, 6), after: B.meta.slice(0, 6)}, 'swapped');
    add('T1', 'the Shift list’s dates read day first',
      A.shift.length > 3 && A.shift.some(dated) && same(B.shift, swapAll(A.shift)), {before: A.shift, after: B.shift}, 'swapped');
    add('E1', 'the note editor’s title and its Day list read day first',
      dated(A.editor.title) && same(B.editor, {title: swap(A.editor.title), days: swapAll(A.editor.days)}),
      {before: A.editor, after: B.editor}, 'swapped');
    add('X1', 'the workbook’s notes and its page header read day first',
      A.xl.texts.length > 5 && same(B.xl.texts, swapAll(A.xl.texts)) && dated(A.xl.header) && B.xl.header === swap(A.xl.header),
      {diffs: diffs(swapAll(A.xl.texts), B.xl.texts), header: [A.xl.header, B.xl.header]}, 'swapped');
    // The PDF's Date column is the setting itself (5/1/2026 against 1/5/26), so those runs are left out: a date run
    // alone. Every other dated run is a note or the title block.
    var noteRuns = function (rs) { return rs.filter(function (s) { return !/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/.test(s); }); };
    add('P1', 'the waterfall PDF’s notes and title block read day first',
      noteRuns(A.pdf.runs).length > 5 && same(noteRuns(B.pdf.runs), swapAll(noteRuns(A.pdf.runs))),
      {diffs: diffs(swapAll(noteRuns(A.pdf.runs)), noteRuns(B.pdf.runs))}, 'swapped');

    var mv = await monthLines('June 2026');
    out.mv = mv.filter(function (l) { return /Principal|Cast dinner/.test(l); });
    add('M1', 'month view: the typed week’s automatic line is written day first and drawn on its own day',
      mv.indexOf('2026-06-29 | Start Principal Photography 29/6/26') >= 0 && mv.some(function (l) { return /Cast dinner/.test(l); }) &&
      !mv.some(function (l) { return /6\/29\/26/.test(l); }),
      out.mv, '2026-06-29 | Start Principal Photography 29/6/26');

    byId('undo-btn').click(); await settled();
    var uN = notes(), uH = header();
    byId('redo-btn').click(); await settled();
    var rN = notes(), rH = header();
    add('U1', 'one undo step: Undo brings every month-first date back, Redo the day-first ones',
      same(uN, A.notes) && same(uH, A.header) && same(rN, B.notes) && same(rH, B.header),
      {undo: diffs(A.notes, uN), redo: diffs(B.notes, rN)}, 'exactly');

    T.pickSelect('wf-date-format', ''); await settled();
    var C = await snap('month first again');
    add('R1', 'back to MM/DD/YY: notes, title block, sidebar, Shift list, editor and workbook exactly as before',
      same(C.notes, A.notes) && same(C.header, A.header) && same(C.meta, A.meta) && same(C.shift, A.shift) &&
      same(C.editor, A.editor) && same(C.xl, A.xl),
      {notes: diffs(A.notes, C.notes), header: [A.header, C.header], xl: diffs(A.xl.texts, C.xl.texts)}, 'identical');
    add('R2', 'back to MM/DD/YY: the waterfall PDF is byte for byte the month-first one',
      C.pdf.len === A.pdf.len && C.pdf.hash === A.pdf.hash, {A: [A.pdf.len, A.pdf.hash], C: [C.pdf.len, C.pdf.hash]}, 'identical');

    // B: the key facts band and Compare, on a three-scenario file.
    var p = T.openViaFakePicker('/tests/fixtures/scenarios-3.sptcal', 'scenarios-3.sptcal', {});
    for (var g = 0; g < 40; g++) { await T.sleep(100); if (/Load another calendar|unsaved/i.test(T.modalText())) { try { T.clickModalButton('Load'); } catch (e) {} break; } }
    await p; await T.sleep(1500);
    await T.until(function () { return q('.sc-band'); }, 'the key facts band', 80, 100);
    var band = function () { return qa('.sc-band .sc-band-v').map(txt); };
    var compare = async function () {
      qa('.sc-strip button').filter(function (b) { return txt(b) === 'Compare'; })[0].click();
      await T.until(function () { return q('.compare-dlg .sc-compare-table'); }, 'the Compare window', 80, 100);
      await T.sleep(300);
      var rows = qa('.compare-dlg tbody tr').map(function (r) { return r.children[0].innerText.trim() + ': ' + Array.prototype.slice.call(r.children).slice(1).map(function (c) { return c.innerText.split('\n')[0].trim(); }).join(' | '); }).filter(dated);
      qa('.compare-dlg button').filter(function (b) { return txt(b) === 'Done'; })[0].click();
      await T.sleep(500);
      return rows;
    };
    var bandA = band(), cmpA = await compare();
    T.pickSelect('wf-date-format', 'd/m/yy'); await settled(); await T.sleep(1200);
    var bandB = band(), cmpB = await compare();
    out.band = {A: bandA, B: bandB, cmpA: cmpA, cmpB: cmpB};
    add('B1', 'the key facts band and the Compare window read day first',
      bandA.some(dated) && same(bandB, swapAll(bandA)) && cmpA.length > 1 && same(cmpB, swapAll(cmpA)),
      out.band, 'swapped');

    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
      {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
