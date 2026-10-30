// holidayrename -- a holiday is renamed, not turned into a note (owner, 30 Oct 2026: "being able to edit the name of a
// holiday slightly", and by picker "Just this date", "Everywhere it shows", "Just that holiday", "Just the clicked
// line"). Until then a click on Thanksgiving in the month view opened its WEEK's waterfall note: the editor held "Day
// After Thanksgiving" too, a colour recoloured both, and an edit put a second copy on the day and printed it in the
// waterfall, which hides holidays. A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=holidayrename ./run.sh holidayrename 400
//
// tests/fixtures/holidayrename.sptcal (synthetic, US Area Standards) runs Post from 11/2/26 for 60 weeks, so both
// Thanksgivings (2026 and 2027) are inside a phase; its 11/2/26 week carries "Post kickoff 11/3/26" and "Network call
// 11/5/26"; Labor Day 2026 is switched on for the waterfall.
//
//   R1  Day After Thanksgiving opens the HOLIDAY editor: heading "11/27/26 · Holiday", its name alone, a placeholder
//       naming the original, its colour (the week's purple) selected
//   R2  renamed "Thanksgiving Fri" with Enter: the day reads "Thanksgiving Fri 11/27/26" once, Thanksgiving is
//       untouched, 2027's Day After keeps its name, and the Holidays list shows the new name ("renamed from" on hover)
//   R3  no waterfall note was written for the week, and the waterfall's 11/23/26 cell stays empty
//   R4  red picked on Thanksgiving colours Thanksgiving alone (frozen edit H1): Thanksgiving Fri stays purple
//   R5  typing the name WITH its own date ("... 11/27/26") does not double the date
//   U1  undo takes the colour back, then the name; redo puts both back
//   F1  Save writes holidayNames {day-after-thanksgiving@2026} and holidayColors {thanksgiving@2026} and nothing else
//       new (no new field id); Load brings both back with no repair warning
//   F2  a bad name or colour in a file is dropped on Load, and the repair is reported
//   M2  the written month PDF draws "Thanksgiving Fri" and Thanksgiving's red
//   R6  clearing the name brings "Day After Thanksgiving" back, and the key leaves the file
//   L1  a waterfall line opens ALONE in the month editor ("Network call 11/5/26"); saving puts it back with its
//       neighbour, in the waterfall too
//   W1  renaming Labor Day in the WATERFALL's editor renames the holiday: the cell stays automatic (no waterfall
//       note), the month view and the Holidays list follow
//   X1  the workbook prints the renamed Labor Day
//   E0  no console errors, apart from the one warning F2's values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'holidayrename', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) {
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await settle();
  }
  async function toMonth(label) {
    if (!q('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 60; i++) {
      var my = txt(q('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // The month view's waterfall-kind blocks on a day, as text, and one of them by its text.
  function lines(day) { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]').map(txt); }
  function block(day, re) { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]').filter(function (b) { return re.test(txt(b)); })[0] || null; }
  function bg(el) { return el ? getComputedStyle(el).backgroundColor : null; }
  async function openMv(day, re) {
    var b = block(day, re); if (!b) throw new Error('no block matching ' + re + ' on ' + day);
    b.scrollIntoView({ block: 'center' }); await T.sleep(100);
    b = block(day, re);
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
    await T.until(function () { return !!byId('mv-note-pop'); }, 'the month note editor', 40, 50);
    return byId('mv-note-pop');
  }
  async function commitMv(pop, value, key, swatch) {
    var ta = q('textarea', pop);
    if (swatch) { var sw = q('.color-swatch[title="' + swatch + '"]', pop); if (!sw) throw new Error('no swatch ' + swatch); sw.click(); await T.sleep(100); }
    if (value !== undefined) { ta.value = value; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', key === 'Tab' ? { key: 'Tab', bubbles: true, cancelable: true } : { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
  }
  function holidayRow(re) { return qa('#holiday-vis-list .hv-label').filter(function (e) { return re.test(e.title || ''); })[0] || null; }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellText(wk) { var t = noteTd(wk); return t ? ((t.querySelector('.cell-body') || t).innerText || '').replace(/\s*\n\s*/g, '\n').trim() : null; }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- Save and Load through the real controls ----------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'holidayrename.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'holidayrename.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'holidayrename-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  // The written month PDF: every Flate stream's text, decoded.
  async function monthPdfStreams() {
    T.monthPrintPath(false);
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var u8 = rec.files.filter(function (f) { return f.closed; })[0].bytes, s = '', all = [];
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        all.push(await new Response(ds).text());
      } catch (e) { /* not a Flate stream */ }
    }
    return all.join('\n');
  }

  var PURPLE = 'rgb(112, 48, 160)', RED = 'rgb(255, 0, 0)';
  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!q('#table-wrap table.sheet-table') || !!q('#table-wrap .mv-daygrid'); }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = JSON.parse(await save());

    // ===== R1-R3: rename Day After Thanksgiving in the month view ===================================================
    await step('R1', async function () {
      await toMonth('November 2026');
      var pop = await openMv('2026-11-27', /^Day After Thanksgiving/);
      var ta = q('textarea', pop), sel = q('.color-swatch.selected', pop);
      kase('R1', 'Day After Thanksgiving opens the holiday editor: "11/27/26 · Holiday", its name alone, the original named in the placeholder, the week\'s purple selected',
           txt(q('.mv-note-pop-day', pop)) === '11/27/26 · Holiday' && ta.value === 'Day After Thanksgiving'
             && /Day After Thanksgiving/.test(ta.placeholder) && !!sel && sel.title === 'Purple',
           { heading: txt(q('.mv-note-pop-day', pop)), text: ta.value, placeholder: ta.placeholder, selected: sel && sel.title });
      await commitMv(pop, 'Thanksgiving Fri');
    });
    await step('R2', async function () {
      var fri = lines('2026-11-27'), thu = lines('2026-11-26'), row = holidayRow(/^Thanksgiving Fri · 11\/27\/26/);
      await toMonth('November 2027');
      var next = lines('2027-11-26');
      kase('R2', 'the day reads "Thanksgiving Fri 11/27/26" once, Thanksgiving is untouched, 2027\'s Day After keeps its name, and the Holidays list shows the rename',
           same(fri, ['Thanksgiving Fri 11/27/26']) && same(thu, ['Thanksgiving 11/26/26']) && same(next, ['Day After Thanksgiving 11/26/27'])
             && !!row && /renamed from Day After Thanksgiving/.test(row.title),
           { nov27: fri, nov26: thu, nov26of2027: next, listRow: row && row.title });
    });
    await step('R3', async function () {
      var s = JSON.parse(await save());
      await view('sheet');
      var c = cellText('2026-11-23');
      kase('R3', 'no waterfall note was written for the week, and the waterfall\'s 11/23/26 cell stays empty',
           !(s.userNotes && s.userNotes['2026-11-23']) && (c === '' || c === '+'), { userNote: s.userNotes && s.userNotes['2026-11-23'], cell: c });
    });

    // ===== R4-R5: colour one holiday; a typed date is not doubled ===================================================
    await step('R4', async function () {
      await toMonth('November 2026');
      var pop = await openMv('2026-11-26', /^Thanksgiving 11/);
      await commitMv(pop, undefined, 'Enter', 'Red');
      var thu = block('2026-11-26', /^Thanksgiving 11/), fri = block('2026-11-27', /^Thanksgiving Fri/);
      kase('R4', 'red on Thanksgiving colours Thanksgiving alone (frozen edit H1); Thanksgiving Fri stays the week\'s purple',
           bg(thu) === RED && bg(fri) === PURPLE, { thanksgiving: bg(thu), thanksgivingFri: bg(fri) });
    });
    await step('R5', async function () {
      var pop = await openMv('2026-11-27', /^Thanksgiving Fri/);
      await commitMv(pop, 'Thanksgiving Fri 11/27/26');
      kase('R5', 'typing the name with its own date does not double the date', same(lines('2026-11-27'), ['Thanksgiving Fri 11/27/26']), { nov27: lines('2026-11-27') });
    });

    // ===== U1: undo and redo ========================================================================================
    await step('U1', async function () {
      await undo();
      var a = { thu: bg(block('2026-11-26', /^Thanksgiving 11/)), fri: lines('2026-11-27') };
      await undo();
      var b = { thu: bg(block('2026-11-26', /^Thanksgiving 11/)), fri: lines('2026-11-27') };
      await redo(); await redo();
      var c = { thu: bg(block('2026-11-26', /^Thanksgiving 11/)), fri: lines('2026-11-27') };
      kase('U1', 'undo takes the colour back, then the name; redo puts both back',
           a.thu === PURPLE && same(a.fri, ['Thanksgiving Fri 11/27/26']) && b.thu === PURPLE && same(b.fri, ['Day After Thanksgiving 11/27/26'])
             && c.thu === RED && same(c.fri, ['Thanksgiving Fri 11/27/26']), { afterOne: a, afterTwo: b, redone: c });
    });

    // ===== F1-F2: the file ==========================================================================================
    var savedText = null;
    await step('F1', async function () {
      savedText = await save();
      var s = JSON.parse(savedText);
      var added = Object.keys(s).filter(function (k) { return !(k in S0); }).sort();
      var idsSame = same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort());
      var w0 = repairWarnings();
      await load(JSON.stringify(S0));                     // the fixture opens in the waterfall: page back to the month
      await toMonth('November 2026');
      var plain = { thu: bg(block('2026-11-26', /^Thanksgiving 11/)), fri: lines('2026-11-27') };
      await load(savedText);
      await toMonth('November 2026');
      var back = { thu: bg(block('2026-11-26', /^Thanksgiving 11/)), fri: lines('2026-11-27') };
      kase('F1', 'Save writes holidayNames and holidayColors, keyed by holiday id, and nothing else new; Load brings both back (and a file without them shows neither)',
           same(added, ['holidayColors', 'holidayNames']) && same(s.holidayNames, { 'day-after-thanksgiving@2026': 'Thanksgiving Fri' })
             && same(s.holidayColors, { 'thanksgiving@2026': '#FF0000' }) && idsSame
             && plain.thu === PURPLE && same(plain.fri, ['Day After Thanksgiving 11/27/26'])
             && back.thu === RED && same(back.fri, ['Thanksgiving Fri 11/27/26']) && repairWarnings() === w0,
           { added: added, holidayNames: s.holidayNames, holidayColors: s.holidayColors, idsSame: idsSame, withoutKeys: plain, loaded: back, warnings: repairWarnings() - w0 });
    });
    await step('F2', async function () {
      var s = JSON.parse(savedText);
      s.holidayNames['thanksgiving@2026'] = 42; s.holidayColors['day-after-thanksgiving@2026'] = 'red';
      var w0 = repairWarnings();
      await load(JSON.stringify(s));
      var thu = block('2026-11-26', /^Thanksgiving 11/), fri = block('2026-11-27', /^Thanksgiving Fri/);
      kase('F2', 'a name that is not text and a colour that is not one are dropped on Load (the good ones kept), and the repair is reported',
           same(lines('2026-11-26'), ['Thanksgiving 11/26/26']) && bg(thu) === RED && !!fri && bg(fri) === PURPLE && repairWarnings() > w0,
           { nov26: lines('2026-11-26'), thanksgiving: bg(thu), fri: bg(fri), warnings: repairWarnings() - w0 });
      await load(savedText);
    });

    // ===== M2: the written month PDF ================================================================================
    await step('M2', async function () {
      var all = await monthPdfStreams();
      kase('M2', 'the written month PDF draws "Thanksgiving Fri" and Thanksgiving\'s red',
           all.indexOf('Thanksgiving Fri') !== -1 && /(^|[^\d.])1 0 0 rg/.test(all), { name: all.indexOf('Thanksgiving Fri') !== -1, red: /(^|[^\d.])1 0 0 rg/.test(all) });
    });

    // ===== R6: clear the name ======================================================================================
    await step('R6', async function () {
      await toMonth('November 2026');
      var pop = await openMv('2026-11-27', /^Thanksgiving Fri/);
      await commitMv(pop, '');
      var s = JSON.parse(await save());
      kase('R6', 'clearing the name brings "Day After Thanksgiving" back, and holidayNames leaves the file',
           same(lines('2026-11-27'), ['Day After Thanksgiving 11/27/26']) && !('holidayNames' in s), { nov27: lines('2026-11-27'), holidayNames: s.holidayNames });
    });

    // ===== L1: one waterfall line at a time =========================================================================
    await step('L1', async function () {
      var pop = await openMv('2026-11-05', /^Network call/);
      var pre = q('textarea', pop).value;
      await commitMv(pop, 'Network call (moved) 11/5/26', 'Tab');
      var m = { tue: lines('2026-11-03'), thu: lines('2026-11-05') };
      await view('sheet');
      var c = cellText('2026-11-02');
      kase('L1', 'a waterfall line opens alone in the month editor; saving puts it back beside its neighbour, in the waterfall too',
           pre === 'Network call 11/5/26' && same(m.tue, ['Post kickoff 11/3/26']) && same(m.thu, ['Network call (moved) 11/5/26'])
             && c === 'Post kickoff 11/3/26\nNetwork call (moved) 11/5/26', { prefill: pre, month: m, cell: c });
    });

    // ===== W1, X1: rename in the waterfall ==========================================================================
    await step('W1', async function () {
      var td = noteTd('2026-09-07'); if (!td) throw new Error('no note cell for 9/7/26');
      var before = cellText('2026-09-07');
      td.scrollIntoView({ block: 'center' }); await T.sleep(100);
      T.openCell(noteTd('2026-09-07')); await T.sleep(300);
      var pop = q('.note-pop'); if (!pop) throw new Error('the waterfall note editor did not open');
      var ta = q('textarea', pop);
      ta.value = ta.value.replace('Labor Day 9/7/26', 'Labor Day (closed) 9/7/26');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      await settle();
      var after = cellText('2026-09-07'), s = JSON.parse(await save()), row = holidayRow(/^Labor Day \(closed\) · 9\/7\/26/);
      await toMonth('September 2026');
      var mv = lines('2026-09-07');
      kase('W1', 'renaming Labor Day in the waterfall\'s editor renames the holiday: the cell stays automatic (no waterfall note), the month view and the Holidays list follow',
           before === 'Labor Day 9/7/26' && after === 'Labor Day (closed) 9/7/26' && !(s.userNotes && s.userNotes['2026-09-07'])
             && s.holidayNames && s.holidayNames['labor-day@2026'] === 'Labor Day (closed)' && same(mv, ['Labor Day (closed) 9/7/26']) && !!row,
           { before: before, after: after, userNote: s.userNotes && s.userNotes['2026-09-07'], names: s.holidayNames, month: mv, listRow: row && row.title });
    });
    await step('X1', async function () {
      await view('sheet');
      await T.sleep(700);
      var b = await T.captureExport('export-btn', 'the workbook');
      var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
      var found = [];
      wb.worksheets[0].eachRow({ includeEmpty: false }, function (row) {
        row.eachCell({ includeEmpty: false }, function (c) { if (typeof c.value === 'string' && /Labor Day/.test(c.value)) found.push(c.value); });
      });
      kase('X1', 'the workbook prints the renamed Labor Day', found.indexOf('Labor Day (closed) 9/7/26') !== -1 && found.indexOf('Labor Day 9/7/26') === -1, { found: found });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (F2\'s repair warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'holidayrename threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
