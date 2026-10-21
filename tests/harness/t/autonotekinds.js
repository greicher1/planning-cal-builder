// autonotekinds -- the Automatic notes card: which KINDS of automatic note a calendar shows (owner ruling 9,
// 20 Oct 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh autonotekinds 300
//
// computeSchedule tags each automatic note with a kind ('writersRoomOpens', 'principalStart', 'principalWrap'),
// and autoNotesForView() -- the one filter every reader of the notes goes through -- drops a kind the calendar has
// switched off. Holiday notes are not a kind (owner's picker: they keep their per-holiday list). A note the user
// typed (userNotes) is never touched, even one that began as an automatic note's text.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays):
//   Writer's Room Mon 1/4/27 x 8        -> "Writer's Room Opens 1/4/27", which the user then EDITS (+ "Pitch day")
//   Production    Mon 5/3/27, 4 x 5 days -> "Start Principal Photography 5/3/27", "Principal Photography Wraps 5/28/27"
//   Post          Mon 7/5/27 x 4
//   a typed note  week of 3/1/27        -> "Table read", the user's own
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'autonotekinds', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function $(id) { return document.getElementById(id); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  var KINDS = ['writersRoomOpens', 'principalStart', 'principalWrap'];
  var WR = "Writer's Room Opens 1/4/27", START = 'Start Principal Photography 5/3/27', WRAP = 'Principal Photography Wraps 5/28/27';
  var EDITED = WR + ' Pitch day';
  // The two NOTES, not the header: the auto header's "Principal Photography 5.3.27 / Wrap: 5.28.27" is a header
  // line, which ruling 9 does not touch.
  var NOTE_RE = /Start Principal Photography|Principal Photography Wraps/;
  function sorted(o) { var r = {}; Object.keys(o || {}).sort().forEach(function (k) { r[k] = o[k]; }); return r; }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) { $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  async function toMonth(label) {
    if (!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 40; i++) {
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // The waterfall's note cell text, per week Monday.
  function note(w) { var td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="' + w + '"]'); return td ? txt(td).replace(/^\+$/, '') : null; }
  function notes() { return { '2027-01-04': note('2027-01-04'), '2027-03-01': note('2027-03-01'), '2027-05-03': note('2027-05-03'), '2027-05-24': note('2027-05-24') }; }
  var ALL_ON = { '2027-01-04': EDITED, '2027-03-01': 'Table read', '2027-05-03': START, '2027-05-24': WRAP };
  function box(kind) { return document.querySelector('input[data-autonote="' + kind + '"]'); }
  function boxes() { return KINDS.map(function (k) { var b = box(k); return b ? b.checked : null; }); }
  // ⛔ HIT-TESTED: the element on top at the box's centre must be the box, and THAT element gets the click.
  async function clickBox(kind) {
    // The card lives in the Settings window's Calendar tab since ruling 12 merged (it was the sidebar's
    // Settings tab): open it there so the box is laid out and on top.
    await T.openSettings('calendar');
    await T.sleep(150);
    var b = box(kind);
    if (!b) throw new Error('no Automatic notes box for ' + kind);
    b.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== b) throw new Error('the ' + kind + ' box is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await settle();
  }
  async function pdfRuns(u8) {
    var s = '', runs = [];
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;   // DecompressionStream rejects the EOL
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var t = await new Response(ds).text(), tj = /\(((?:\\.|[^\\)])*)\) Tj/g, x;
        while ((x = tj.exec(t))) runs.push(x[1].replace(/\\(.)/g, '$1'));
      } catch (e) { /* not a Flate stream */ }
    }
    return runs;
  }
  function has(list, re) { return list.some(function (x) { return re.test(x); }); }
  // The month PDF's runs for May 2027, through its real Save dialog (the direct writer).
  // ⚠️ The writer WRAPS a note into short runs in a day cell ("Start Principal", "Principal Photography"), so
  // the full note text never appears there: MV_NOTE_RE matches the fragments, and A0b proves it can see them.
  var MV_NOTE_RE = /^Start Principal|^Principal Photography|^Photography|^Wraps/;
  async function monthPdfRuns() {
    await toMonth('May 2027');
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      $('export-btn').click();                         // the month view's Export PDF: the direct writer
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var mf = rec.files.filter(function (f) { return f.closed; })[0];
    var runs = await pdfRuns(mf.bytes);
    await view('sheet');
    return runs;
  }
  var written = [];
  var saveHandle = { name: 'autonotekinds.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'autonotekinds.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1];
  }
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'autonotekinds-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function idSet(snapText) { return Object.keys(JSON.parse(snapText).fields.byId).sort(); }

  try {
    await T.appReady();
    T.set('show-title', 'Notes Kind Test'); T.set('season-num', '2');
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-writersRoom', '2027-01-04'); T.set('weeks-writersRoom', '8');
    T.set('start-production', '2027-05-03');
    T.set('start-post', '2027-07-05'); T.set('weeks-post', '4');
    await settle();
    await T.typeUserNote('2027-03-01', 'Table read');
    await T.typeUserNote('2027-01-04', WR + '\nPitch day');
    await settle();
    var saveA = await save();

    await step('A0', async function () {
      var s = JSON.parse(saveA);
      kase('A0', 'control: every kind shows (Writer\'s Room Opens under the user\'s edit, Start and Wraps), and the file has no autoNotesOff key',
           same(notes(), ALL_ON) && !('autoNotesOff' in s), { notes: notes(), key: 'autoNotesOff' in s });
    });

    await step('A0b', async function () {
      var runs = await monthPdfRuns();
      kase('A0b', 'control: with every kind on, the written month PDF DOES carry the Start and Wraps notes (as wrapped runs)',
           has(runs, /^Start Principal/) && has(runs, /^Principal Photography/), { runs: runs.filter(function (r) { return MV_NOTE_RE.test(r); }) });
    });

    await step('A1', async function () {
      var card = document.querySelector('.autonote-list'), sec = card && card.closest('section.card');
      var labels = card ? Array.from(card.querySelectorAll('label')).map(txt) : [];
      // The FORM CONTROLS collectFieldValues() would sweep. (The InfoHint's button carries a Mantine id; it is no
      // form control, as on every card.)
      var ids = sec ? Array.from(sec.querySelectorAll('input[id], select[id], textarea[id]')).map(function (e) { return e.id; }) : ['(no card)'];
      kase('A1', 'the card: in the Settings window\'s Calendar tab, "Automatic notes", one ticked box per kind, and NO id on any control in it',
           !!sec && T.settingsTabOf(sec) === 'calendar' && /Automatic notes/.test(txt(sec.querySelector('h2'))) &&
           same(labels, ['Writer’s Room Opens', 'Start Principal Photography', 'Principal Photography Wraps']) &&
           same(boxes(), [true, true, true]) && ids.length === 0 && !sec.closest('.prefs-card'),
           { labels: labels, boxes: boxes(), ids: ids });
    });

    await step('A2', async function () {
      await clickBox('principalStart');
      var n = notes();
      kase('A2', 'unticking Start Principal Photography (a hit-tested click) empties its week; every other note stays',
           same(n, Object.assign({}, ALL_ON, { '2027-05-03': '' })), { notes: n, boxes: boxes() });
    });

    await step('A3', async function () {
      await clickBox('writersRoomOpens');
      await clickBox('principalWrap');
      var n = notes();
      kase('A3', 'all three off: Wraps\'s week is empty, and the user\'s EDITED Writer\'s Room note and their own note are untouched',
           same(n, { '2027-01-04': EDITED, '2027-03-01': 'Table read', '2027-05-03': '', '2027-05-24': '' }) && same(boxes(), [false, false, false]),
           { notes: n, boxes: boxes() });
    });

    await step('A4', async function () {
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var cells = [];
      wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) {
        if (c.isMerged && c.master && c.master.address !== c.address) return;
        var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
        if (typeof v === 'string') cells.push(v);
      }); }); });
      kase('A4', 'Excel: no Start or Wraps note; the user\'s two notes are there as typed',
           !has(cells, NOTE_RE) && has(cells, /^Table read$/) && has(cells, /^Writer's Room Opens 1\/4\/27\nPitch day$/),
           { notes: cells.filter(function (c) { return /Table read|Pitch day|Principal/.test(c); }) });
    });

    await step('A5', async function () {
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var runs = await pdfRuns(new Uint8Array(await pb.arrayBuffer()));
      kase('A5', 'the waterfall PDF: no Start or Wraps text run; "Table read" and "Pitch day" are',
           !has(runs, NOTE_RE) && has(runs, /^Table read$/) && has(runs, /^Pitch day$/),
           { runs: runs.filter(function (r) { return /Table|Pitch|Principal|Writer/.test(r); }) });
    });

    await step('A6', async function () {
      await toMonth('May 2027');
      var may = Array.from(document.querySelectorAll('#table-wrap .mv-note-block')).map(txt);
      await toMonth('March 2027');
      var mar = Array.from(document.querySelectorAll('#table-wrap .mv-note-block')).map(txt);
      kase('A6', 'the month view: no Start or Wraps note in May; the user\'s "Table read" still in March',
           !has(may, NOTE_RE) && has(mar, /Table read/), { may: may, mar: mar });
    });

    await step('A7', async function () {
      var runs = await monthPdfRuns();
      kase('A7', 'the written month PDF: no run of the Start or Wraps notes (A0b found them); "Table read" is',
           !has(runs, MV_NOTE_RE) && has(runs, /Table read/),
           { runs: runs.filter(function (r) { return /Table|Pitch|Principal|Photography|Wraps|Writer/.test(r); }) });
    });

    await step('A8', async function () {
      // ⚠️ From a clean step: the view switches above are undo steps of their own (viewMode is saved state).
      await clickBox('principalWrap');                 // on
      await clickBox('principalWrap');                 // off: the step under test
      $('undo-btn').click(); await settle();
      var undone = { boxes: boxes(), wrap: note('2027-05-24') };
      $('redo-btn').click(); await settle();
      var redone = { boxes: boxes(), wrap: note('2027-05-24') };
      kase('A8', 'ONE undo puts Wraps back (box ticked, its note in its week); redo takes it out again',
           same(undone, { boxes: [false, false, true], wrap: WRAP }) && same(redone, { boxes: [false, false, false], wrap: '' }),
           { undone: undone, redone: redone });
    });

    var saveC;
    await step('A9', async function () {
      saveC = await save();
      var s = JSON.parse(saveC), a = JSON.parse(saveA);
      kase('A9', 'Save writes autoNotesOff with the three kinds; fields.byId holds the SAME ids, and userNotes is untouched',
           same(sorted(s.autoNotesOff), { principalStart: true, principalWrap: true, writersRoomOpens: true }) &&
           same(idSet(saveC), idSet(saveA)) && same(s.userNotes, a.userNotes),
           { key: s.autoNotesOff, ids: idSet(saveC).length, idsBefore: idSet(saveA).length });
    });

    await step('A10', async function () {
      await clickBox('writersRoomOpens'); await clickBox('principalStart'); await clickBox('principalWrap');
      var saveB = await save();
      kase('A10', 'ticking them all back: every note returns, and the saved file is BYTE-IDENTICAL to the one saved before any untick',
           same(notes(), ALL_ON) && saveB === saveA, { notes: notes(), identical: saveB === saveA, lenA: saveA.length, lenB: saveB.length });
    });

    await step('A11', async function () {
      await clickBox('principalStart');
      $('shift-fwd-btn').click(); await settle();
      var shifted = { start: note('2027-05-10'), wrap: note('2027-05-31') };
      $('undo-btn').click(); await settle();
      await clickBox('principalStart');
      kase('A11', 'Shift All one week later with Start off: Start stays hidden on its new week, Wraps moves with the shoot',
           same(shifted, { start: '', wrap: 'Principal Photography Wraps 6/4/27' }), { shifted: shifted });
    });

    await step('A12', async function () {
      await load(saveC);
      var rt = { boxes: boxes(), notes: notes() };
      await load(saveA);
      var m5 = { boxes: boxes(), notes: notes() };
      kase('A12', 'Load round trip: the file with kinds off opens with them off; the same calendar with no key, loaded after it, opens with every kind ON (the M-5 trap)',
           same(rt.boxes, [false, false, false]) && same(rt.notes, { '2027-01-04': EDITED, '2027-03-01': 'Table read', '2027-05-03': '', '2027-05-24': '' }) &&
           same(m5.boxes, [true, true, true]) && same(m5.notes, ALL_ON), { roundTrip: rt, m5: m5 });
    });

    await step('A13', async function () {
      await load(saveC);
      var before = boxes();
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      kase('A13', 'New, after a calendar with every kind off, starts with every box TICKED',
           same(before, [false, false, false]) && same(boxes(), [true, true, true]), { before: before, after: boxes() });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'autonotekinds threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
