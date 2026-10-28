// autonotephases -- automatic notes for each phase's start and end, OFF until ticked (owner, 27 Oct 2026: "do the
// phase starts and ends. they should be disabled by default"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh autonotephases 400
//
// Nine kinds beside ruling 9's three: writersRoomEnd, and prePrep / prodPrep / post / localization x Start / End.
// They live in their own store, autoNotesOn (absent = hidden), because autoNotesOff's absent = SHOWN would have put
// them on every calendar saved before them. Each is dated on the first or last day the month view draws the phase's
// bar (weekdays, outside every hiatus), named "<phase name> Begins|Ends" (Writer's Room: "Closes"), and goes through
// autoNotesForView like every automatic note.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays):
//   Writer's Room Mon 1/4/27 x 8         -> Opens 1/4/27 (on by default), Closes Fri 2/26/27
//   Pre-Prep      Mon 3/1/27 x 4         -> Begins 3/1/27, Ends Fri 3/26/27
//   Prod Prep     Mon 3/29/27 x 5        -> Begins 3/29/27, Ends Fri 4/30/27
//   Production    Mon 5/3/27, 4 x 5 days -> Start 5/3/27, Wraps 5/28/27 (both on by default)
//   Post          Mon 7/5/27 x 12        -> Begins 7/5/27, Ends Fri 9/24/27
//   Localization  Mon 9/27/27 x 4        -> Begins 9/27/27, Ends Fri 10/22/27
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'autonotephases', cases: [] };
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
  function sorted(o) { var r = {}; Object.keys(o || {}).sort().forEach(function (k) { r[k] = o[k]; }); return r; }
  var NEW = ['writersRoomEnd', 'prePrepStart', 'prePrepEnd', 'prodPrepStart', 'prodPrepEnd',
             'postStart', 'postEnd', 'localizationStart', 'localizationEnd'];
  var OLD = ['writersRoomOpens', 'principalStart', 'principalWrap'];
  var NONE_ON = [false, false, false, false, false, false, false, false, false];
  var ALL_ON9 = [true, true, true, true, true, true, true, true, true];
  // The waterfall's Notes cells, week Monday -> text, with only the three kinds that start on.
  var BASE = { '2027-01-04': "Writer's Room Opens 1/4/27", '2027-05-03': 'Start Principal Photography 5/3/27',
               '2027-05-24': 'Principal Photography Wraps 5/28/27' };
  // ...and with all nine ticked.
  var ALL = { '2027-01-04': "Writer's Room Opens 1/4/27", '2027-02-22': "Writer's Room Closes 2/26/27",
              '2027-03-01': 'Pre-Prep Begins 3/1/27', '2027-03-22': 'Pre-Prep Ends 3/26/27',
              '2027-03-29': 'Prod Prep Begins 3/29/27', '2027-04-26': 'Prod Prep Ends 4/30/27',
              '2027-05-03': 'Start Principal Photography 5/3/27', '2027-05-24': 'Principal Photography Wraps 5/28/27',
              '2027-07-05': 'Post Begins 7/5/27', '2027-09-20': 'Post Ends 9/24/27',
              '2027-09-27': 'Localization Begins 9/27/27', '2027-10-18': 'Localization Ends 10/22/27' };
  // Each new note's DAY in the month view, by month.
  var DAYS = { 'February 2027': { '2027-02-26': "Writer's Room Closes 2/26/27" },
               'March 2027': { '2027-03-01': 'Pre-Prep Begins 3/1/27', '2027-03-26': 'Pre-Prep Ends 3/26/27',
                               '2027-03-29': 'Prod Prep Begins 3/29/27' },
               'April 2027': { '2027-04-30': 'Prod Prep Ends 4/30/27' },
               'July 2027': { '2027-07-05': 'Post Begins 7/5/27' },
               'September 2027': { '2027-09-24': 'Post Ends 9/24/27', '2027-09-27': 'Localization Begins 9/27/27' },
               'October 2027': { '2027-10-22': 'Localization Ends 10/22/27' } };
  var NEW_LINE = /(Begins|Ends|Closes) \d/;
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
  // Every non-empty Notes cell in the waterfall, week Monday -> text.
  function notes() {
    var o = {};
    document.querySelectorAll('#table-wrap td.sheet-note-cell[data-week]').forEach(function (td) {
      var t = txt(td).replace(/^\+$/, ''); if (t) o[td.getAttribute('data-week')] = t;
    });
    return sorted(o);
  }
  // The month view's notes on one day.
  function dayNotes(iso) { return Array.from(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="' + iso + '"]')).map(txt); }
  function box(kind) { return document.querySelector('input[data-autonote="' + kind + '"]'); }
  function boxes(kinds) { return kinds.map(function (k) { var b = box(k); return b ? b.checked : null; }); }
  // ⛔ HIT-TESTED: the element on top at the box's centre must be the box, and THAT element gets the click.
  async function clickBox(kind) {
    await T.openSettings('prefs');
    await T.sleep(150);
    var b = box(kind);
    if (!b) throw new Error('no Automatic notes box for ' + kind);
    b.scrollIntoView({ block: 'center' });
    await T.sleep(100);
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
  // The written month PDF (the direct writer, through its real Save dialog), as one string of its text runs. The
  // writer WRAPS a note into short runs, so the runs are joined with spaces and searched for words, not whole notes.
  async function monthPdfText() {
    await toMonth('March 2027');
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      $('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var mf = rec.files.filter(function (f) { return f.closed; })[0];
    var runs = await pdfRuns(mf.bytes);
    await view('sheet');
    return runs.join(' ');
  }
  var written = [];
  var saveHandle = { name: 'autonotephases.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'autonotephases.sptcal', { lastModified: 1 }); },
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
    var stem = 'autonotephases-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function idSet(snapText) { return Object.keys(JSON.parse(snapText).fields.byId).sort(); }
  function rowOf(key) { var sw = $('swatch-' + key); return sw ? sw.closest('.phase-row') : null; }

  try {
    await T.appReady();
    T.set('show-title', 'Phase Notes Test'); T.set('season-num', '2');
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-writersRoom', '2027-01-04'); T.set('weeks-writersRoom', '8');
    T.set('start-prePrep', '2027-03-01'); T.set('weeks-prePrep', '4');
    T.set('start-prodPrep', '2027-03-29'); T.set('weeks-prodPrep', '5');
    T.set('start-production', '2027-05-03');
    T.set('start-post', '2027-07-05'); T.set('weeks-post', '12');
    T.set('start-localization', '2027-09-27'); T.set('weeks-localization', '4');
    await settle();
    var saveA = await save();

    await step('P0', async function () {
      var s = JSON.parse(saveA);
      kase('P0', 'by default the nine new kinds are OFF: only Writer\'s Room Opens, Start and Wraps show, every new box is unticked, and the file has neither autoNotesOn nor autoNotesOff',
           same(notes(), sorted(BASE)) && same(boxes(NEW), NONE_ON) && same(boxes(OLD), [true, true, true]) &&
           !('autoNotesOn' in s) && !('autoNotesOff' in s),
           { notes: notes(), boxes: boxes(NEW), keys: ['autoNotesOn', 'autoNotesOff'].filter(function (k) { return k in s; }) });
    });

    var pdfBefore;
    await step('P0b', async function () {
      pdfBefore = await monthPdfText();
      kase('P0b', 'control: the written month PDF has no Begins, Ends or Closes before any is ticked (and does carry the March pills)',
           !/Begins|Ends|Closes/.test(pdfBefore) && /Pre-Prep/.test(pdfBefore), { sample: pdfBefore.slice(0, 300) });
    });

    await step('P1', async function () {
      await T.openSettings('prefs');
      var card = document.querySelector('.autonote-list'), sec = card && card.closest('section.card');
      var names = card ? Array.from(card.querySelectorAll('.autonote-name')).map(txt) : [];
      var words = card ? Array.from(card.querySelectorAll('label.autonote-row')).map(txt) : [];
      var ids = sec ? Array.from(sec.querySelectorAll('input[id], select[id], textarea[id]')).map(function (e) { return e.id; }) : ['(no card)'];
      // Every phase name on ONE line, uncut: the 12 px gap first shipped cut "Writer's Room" to "Writer's Ro...".
      var oneLine = card ? Array.from(card.querySelectorAll('.autonote-name')).every(function (n) {
        var lh = parseFloat(getComputedStyle(n).lineHeight) || 20; return n.scrollWidth <= n.clientWidth + 1 && n.getBoundingClientRect().height < lh * 1.5;
      }) : false;
      kase('P1', 'the card: one row per phase in calendar order, a start box and an end box each, every name on one line, NO id on any control, not a .prefs-card',
           same(names, ['Writer’s Room', 'Pre-Prep', 'Prod Prep', 'Production', 'Post', 'Localization']) &&
           same(words, ['Opens', 'Closes', 'Begins', 'Ends', 'Begins', 'Ends', 'Starts', 'Wraps', 'Begins', 'Ends', 'Begins', 'Ends']) &&
           oneLine && ids.length === 0 && !!sec && !sec.closest('.prefs-card') && T.settingsTabOf(sec) === 'prefs',
           { names: names, words: words, oneLine: oneLine, ids: ids, cardW: sec && Math.round(sec.getBoundingClientRect().width) });
    });

    await step('P2', async function () {
      for (var i = 0; i < NEW.length; i++) await clickBox(NEW[i]);
      kase('P2', 'ticking the nine (hit-tested clicks): each phase\'s start and end note lands in its week, the end dated on the last weekday',
           same(notes(), sorted(ALL)) && same(boxes(NEW), ALL_ON9), { notes: notes(), boxes: boxes(NEW) });
    });

    await step('P3', async function () {
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
      var want = Object.keys(ALL).map(function (k) { return ALL[k]; });
      var missing = want.filter(function (t) { return cells.indexOf(t) === -1; });
      kase('P3', 'Excel: all twelve notes, each its own Notes cell, as the waterfall shows them', missing.length === 0, { missing: missing });
    });

    await step('P4', async function () {
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var joined = (await pdfRuns(new Uint8Array(await pb.arrayBuffer()))).join(' ');
      var missing = Object.keys(ALL).map(function (k) { return ALL[k]; }).filter(function (t) { return joined.indexOf(t) === -1; });
      kase('P4', 'the waterfall PDF: all twelve notes\' text', missing.length === 0, { missing: missing });
    });

    await step('P5', async function () {
      var bad = [];
      for (var label in DAYS) {
        await toMonth(label);
        Object.keys(DAYS[label]).forEach(function (iso) {
          if (!dayNotes(iso).some(function (t) { return t.indexOf(DAYS[label][iso]) !== -1; })) bad.push(iso + ' ' + DAYS[label][iso] + ' -> ' + JSON.stringify(dayNotes(iso)));
        });
      }
      await view('sheet');
      kase('P5', 'the month view: each new note sits on its own day, the first or last day its phase\'s bar is drawn', bad.length === 0, { bad: bad });
    });

    await step('P6', async function () {
      var t = await monthPdfText();
      kase('P6', 'the written month PDF now carries Begins, Ends and Closes (P0b had none)',
           /Begins/.test(t) && /Ends/.test(t) && /Closes/.test(t), { sample: t.slice(0, 400) });
    });

    var saveB;
    await step('P7', async function () {
      saveB = await save();
      var s = JSON.parse(saveB), a = JSON.parse(saveA), want = {};
      NEW.forEach(function (k) { want[k] = true; });
      kase('P7', 'Save writes autoNotesOn with the nine kinds, no autoNotesOff, and fields.byId holds the SAME ids',
           same(sorted(s.autoNotesOn), sorted(want)) && !('autoNotesOff' in s) && same(idSet(saveB), idSet(saveA)) &&
           same(s.userNotes, a.userNotes), { key: s.autoNotesOn, ids: idSet(saveB).length, idsBefore: idSet(saveA).length });
    });

    await step('P8', async function () {
      await clickBox('postEnd');                         // off: the step under test
      var off = { box: box('postEnd').checked, cell: notes()['2027-09-20'] || '' };
      $('undo-btn').click(); await settle();
      var undone = { box: box('postEnd').checked, cell: notes()['2027-09-20'] || '' };
      $('redo-btn').click(); await settle();
      var redone = { box: box('postEnd').checked, cell: notes()['2027-09-20'] || '' };
      $('undo-btn').click(); await settle();             // leave it on for the cases below
      kase('P8', 'unticking Post Ends empties its week; ONE undo puts it back (box ticked), redo takes it out again',
           same(off, { box: false, cell: '' }) && same(undone, { box: true, cell: 'Post Ends 9/24/27' }) &&
           same(redone, { box: false, cell: '' }) && same(notes(), sorted(ALL)), { off: off, undone: undone, redone: redone });
    });

    await step('P9', async function () {
      T.set('name-post', 'Edit'); await settle();
      var renamed = { row: txt(document.querySelector('[data-autonote-name="post"]')), start: notes()['2027-07-05'], end: notes()['2027-09-20'] };
      T.set('name-post', ''); await settle();
      var back = { row: txt(document.querySelector('[data-autonote-name="post"]')), start: notes()['2027-07-05'] };
      kase('P9', 'a phase renamed in the Phases tab: its notes and its card row follow the name ("Edit Begins"), and go back when it is cleared',
           same(renamed, { row: 'Edit', start: 'Edit Begins 7/5/27', end: 'Edit Ends 9/24/27' }) &&
           same(back, { row: 'Post', start: 'Post Begins 7/5/27' }), { renamed: renamed, back: back });
    });

    await step('P10', async function () {
      var en = $('phiatus-en-prePrep');
      if (!en.checked) en.click();
      await T.sleep(400);
      T.set('phiatus-weeks-prePrep', '1');
      T.set('phiatus-start-prePrep', '2027-03-01'); await settle();
      var n = notes();
      await toMonth('March 2027');
      var mv = { d1: dayNotes('2027-03-01'), d8: dayNotes('2027-03-08') };
      await view('sheet');
      en = $('phiatus-en-prePrep'); if (en.checked) en.click();
      await settle();
      kase('P10', 'Pre-Prep paused for its first week: "Pre-Prep Begins" moves to Mon 3/8 (its first drawn day) and "Pre-Prep Ends" to Fri 4/2, after Prod Prep Begins in that week; the month view agrees; the pause removed, both come back',
           n['2027-03-01'] === undefined && n['2027-03-08'] === 'Pre-Prep Begins 3/8/27' && n['2027-03-22'] === undefined &&
           n['2027-03-29'] === 'Prod Prep Begins 3/29/27 Pre-Prep Ends 4/2/27' &&
           !mv.d1.some(function (t) { return /Pre-Prep Begins/.test(t); }) && mv.d8.some(function (t) { return /Pre-Prep Begins 3\/8\/27/.test(t); }) &&
           same(notes(), sorted(ALL)), { notes: n, month: mv, after: notes() });
    });

    await step('P11', async function () {
      var r = rowOf('post'), tick = r && r.querySelector('.phase-hidewf-cb');
      if (!tick) throw new Error('no Hide in waterfall box on Post');
      tick.click(); await settle();
      var n = notes();
      await toMonth('July 2027');
      var mv = dayNotes('2027-07-05');
      await view('sheet');
      tick = rowOf('post').querySelector('.phase-hidewf-cb'); tick.click(); await settle();
      kase('P11', 'Post hidden in the waterfall takes its Begins and Ends out of the waterfall and keeps them in the month view',
           n['2027-07-05'] === undefined && n['2027-09-20'] === undefined && n['2027-09-27'] === 'Localization Begins 9/27/27' &&
           mv.some(function (t) { return /Post Begins 7\/5\/27/.test(t); }) && same(notes(), sorted(ALL)), { notes: n, month: mv });
    });

    await step('P12', async function () {
      await load(saveB);
      var rt = { boxes: boxes(NEW), notes: notes() };
      await load(saveA);
      var m5 = { boxes: boxes(NEW), old: boxes(OLD), notes: notes() };
      kase('P12', 'Load round trip: the file with the nine on opens with them on; the same calendar with no key, loaded after it, opens with them OFF (the M-5 trap) and the three old kinds on',
           same(rt.boxes, ALL_ON9) && same(rt.notes, sorted(ALL)) && same(m5.boxes, NONE_ON) && same(m5.old, [true, true, true]) &&
           same(m5.notes, sorted(BASE)), { roundTrip: rt, m5: m5 });
    });

    await step('P13', async function () {
      var text = await (await fetch('/tests/fixtures/v1.8.0-saved.sptcal')).text();
      await load(text);
      var n = notes(), lines = Object.keys(n).map(function (k) { return n[k]; });
      var before = { boxes: boxes(NEW), newLines: lines.filter(function (t) { return NEW_LINE.test(t); }) };
      await clickBox('prePrepStart');
      var n2 = notes(), added = Object.keys(n2).filter(function (k) { return n2[k] !== n[k]; }).map(function (k) { return k + ' ' + n2[k]; });
      kase('P13', 'a REAL v1.8.0 calendar opens with the nine off and no new note in it; ticking Pre Prep Begins (its saved name, kept since Pre-Prep became the default) adds exactly one note',
           same(before.boxes, NONE_ON) && before.newLines.length === 0 && added.length === 1 && /Pre Prep Begins \d/.test(added[0]),
           { before: before, added: added });
    });

    await step('P14', async function () {
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      kase('P14', 'New, after a calendar with a new kind ticked, starts with the nine unticked and the three old kinds ticked',
           same(boxes(NEW), NONE_ON) && same(boxes(OLD), [true, true, true]), { boxes: boxes(NEW), old: boxes(OLD) });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'autonotephases threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
