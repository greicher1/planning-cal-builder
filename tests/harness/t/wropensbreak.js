// wropensbreak -- a Writer's Room typed to start inside a hiatus opens on its first worked day, in every output (the
// second audit's AUD2-072, item 3.6; leg built from repro/audit-b1-wropens.js).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh wropensbreak 300
//
// THE BUG: on the reference calendar (T.buildFixture, locked winter break Mon 12/21/26 x 2) a room typed to start
// 12/21/26 x 4 is paused by the break and works from Mon 1/4/27 (its "wk 1"). But computeSchedule dated the "Writer's
// Room Opens" note on the segment's start, 12/21: the waterfall has no Notes cell on an all-phase hiatus row, so the note
// vanished from the waterfall, Excel and the waterfall PDF, while the month view put it on a hiatus day; and the auto
// header read the typed date, "Writer's Room Opens: 12.21.26". Every other phase-edge note was already right.
// THE FIX: the note is dated on the first day the month view draws the room (the phase-edge notes' rule, computeSchedule's
// `drawn`), and the header line (c3, and the {writersRoom.line} token that copies it) names the room's first worked day
// when its start is inside a hiatus (phaseOpenDay, the {writersRoom.open} rule); any other start prints as before.
//
//   W1  room 12/21/26 x 4: the waterfall's 1/4/27 Notes cell reads "Writer's Room Opens 1/4/27"
//   W2  the header line reads "Writer's Room Opens: 1.4.27"
//   W3  Excel holds a "Writer's Room Opens" note dated 1/4/27, none dated 12/21/26
//   W4  the waterfall PDF holds it too
//   W5  the month view: none in December 2026; 1/4/27 holds "Writer's Room Opens 1/4/27"
//   W6  Snap to Mon OFF, typed Wed 12/23/26: the same, 1/4/27 note and header (the step a day at a time)
//   C2  control, Snap off, typed SATURDAY 1/10/26 (no hiatus): the note stays dated 1/10/26 in the 1/5/26 row, beside
//       the room's wk 1, and the header reads 1.5.26, as before (red on the first fix, which dated it Mon 1/12/26)
//   C1  control, the room back at 1/5/26 (not in a break): the note in the 1/5/26 cell and the header 1.5.26, as before
//   E0  no console errors, no native alert
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function tx(el) { return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function byId(id) { return document.getElementById(id); }
  async function settle() { var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(60); var s = JSON.stringify(T.gridSignature()) + hdr().join('|'); if (s === last) same++; else { same = 0; last = s; } } }
  function noteAt(wk) { var t = document.querySelector('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); return t ? (t.innerText || '').trim() : null; }
  function opensCells() { return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td'), function (t) { return /Room Opens/.test(t.textContent); }).map(function (t) { return (t.dataset.week || '?') + ' ' + tx(t); }); }
  function hdr() { return Array.prototype.map.call(document.querySelectorAll('.cal-header-bar .hdr-line'), tx).filter(function (s) { return /Writer/.test(s); }); }
  async function monthNotes(label) {
    byId('view-month-btn').click(); await settle(); await T.sleep(300);
    var g = 0, prev = null;
    while (g++ < 40) { var l0 = tx(document.querySelector('.mv-monthyear')); if (l0 === prev) break; prev = l0; byId('mv-prev').click(); await T.sleep(120); }
    g = 0; while (g++ < 60 && tx(document.querySelector('.mv-monthyear')) !== label) { byId('mv-next').click(); await T.sleep(120); }
    var month = tx(document.querySelector('.mv-monthyear'));
    var n = Array.prototype.filter.call(document.querySelectorAll('.mv-note-block'), function (b) { return /Room Opens/.test(b.textContent); })
      .map(function (b) { return b.dataset.noteDay + ' ' + tx(b).replace(/[↻⚑]/g, '').trim(); });
    byId('view-sheet-btn').click(); await settle();
    return {month: month, notes: n};
  }
  try {
    await T.appReady(); T.buildFixture(); await settle();
    var c0 = {note: noteAt('2026-01-05'), hdr: hdr()};
    T.set('start-writersRoom', '2026-12-21'); T.set('weeks-writersRoom', '4'); await settle();
    var w1 = {note: noteAt('2027-01-04'), any: opensCells()};
    add('W1', 'room 12/21/26 x 4: "Writer\'s Room Opens 1/4/27" in the 1/4/27 Notes cell',
        /Writer's Room Opens 1\/4\/27/.test(w1.note || '') && w1.any.length === 1, w1, 'the 1/4/27 cell, nowhere else');
    var w2 = hdr();
    add('W2', 'the header reads "Writer\'s Room Opens: 1.4.27"', w2.length === 1 && /Writer's Room Opens: 1\.4\.27$/.test(w2[0]), w2, "Writer's Room Opens: 1.4.27");
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var xs = [];
    wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) {
      if (c.isMerged && c.master && c.master.address !== c.address) return;
      var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
      if (typeof v === 'string' && /Room Opens/.test(v)) xs.push(v);
    }); }); });
    // The page header (Excel's &C) carries c3, so read it too.
    var hf = []; wb.eachSheet(function (ws) { var h = ws.headerFooter || {}; hf.push(String(h.oddHeader || '')); });
    add('W3', 'Excel: the note is dated 1/4/27 and the page header names 1.4.27; nothing names 12/21',
        xs.some(function (s) { return /Writer's Room Opens 1\/4\/27/.test(s); }) && !xs.some(function (s) { return /12\/21/.test(s); })
        && hf.some(function (h) { return /Room Opens: 1\.4\.27/.test(h); }) && !hf.some(function (h) { return /12\.21\.26/.test(h); }),
        {cells: xs, headers: hf}, '1/4/27 in the Notes column and the header');
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    var runs = await T.pdfRuns(new Uint8Array(await pb.arrayBuffer()));
    var joined = runs.join(' ');
    add('W4', 'the waterfall PDF holds "Writer\'s Room Opens 1/4/27"', /Room Opens 1\/4\/27/.test(joined) && !/Room Opens:? 12[./]21/.test(joined),
        runs.filter(function (r) { return /Room|Opens|1\/4\/27/.test(r); }), 'a run with the 1/4/27 note');
    var dec = await monthNotes('December 2026'), jan = await monthNotes('January 2027');
    add('W5', 'month view: no Opens note in December 2026; 1/4/27 holds it',
        dec.month === 'December 2026' && dec.notes.length === 0 && jan.month === 'January 2027'
        && jan.notes.length === 1 && /^2027-01-04 Writer's Room Opens 1\/4\/27/.test(jan.notes[0]), {dec: dec, jan: jan}, '2027-01-04 only');
    var sw = byId('snap-writersRoom'); if (sw && sw.checked) sw.click(); await settle();
    T.set('start-writersRoom', '2026-12-23'); await settle();
    var w6 = {note: noteAt('2027-01-04'), any: opensCells(), hdr: hdr(), snap: sw ? sw.checked : 'none'};
    add('W6', 'Snap off, typed Wed 12/23/26: the note and the header name 1/4/27',
        /Writer's Room Opens 1\/4\/27/.test(w6.note || '') && w6.any.length === 1 && w6.hdr.length === 1 && /1\.4\.27$/.test(w6.hdr[0]), w6, '1/4/27');
    // C2: a snap-off room typed on a SATURDAY outside any hiatus keeps the note on that Saturday, in the row holding its
    // wk 1, as before (the review of the first fix: dated on the first drawn day, it went to the next row, 1/12/26).
    T.set('start-writersRoom', '2026-01-10'); T.set('weeks-writersRoom', '12'); await settle();
    var c2 = {note: noteAt('2026-01-05'), any: opensCells(), hdr: hdr(),
      row: Array.prototype.map.call(document.querySelectorAll('#table-wrap td[data-week="2026-01-05"]'), tx).join(' | ')};
    add('C2', 'control, Snap off, typed Sat 1/10/26: the note stays "Writer\'s Room Opens 1/10/26" in the 1/5/26 row; header 1.5.26',
        /Writer's Room Opens 1\/10\/26/.test(c2.note || '') && /Writer's Rm wk 1/.test(c2.row) && c2.any.length === 1 && c2.hdr.length === 1 && /1\.5\.26$/.test(c2.hdr[0]),
        c2, 'the 1/5/26 row, dated 1/10/26');
    if (sw && !sw.checked) sw.click();
    T.set('start-writersRoom', '2026-01-05'); T.set('weeks-writersRoom', '12'); await settle();
    var c1 = {note: noteAt('2026-01-05'), hdr: hdr()};
    add('C1', 'control: the room back on 1/5/26 prints exactly as it did',
        /Writer's Room Opens 1\/5\/26/.test(c1.note || '') && JSON.stringify(c1) === JSON.stringify(c0) && /1\.5\.26$/.test(c1.hdr[0] || ''), {before: c0, after: c1}, 'same as the fixture');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors.slice(0, 3), alerts: window.__alerts}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception'); }
  T.done(out);
})(); });
