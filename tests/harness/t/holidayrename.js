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
//   H1  the MONTH editor's Hide Holiday (owner, 21 Nov 2026) hides Thanksgiving from the month view only: its Month
//       box unticked, its Waterfall box and Day After untouched; one undo brings it back
//   S1  the Holidays list in Settings (owner, 21 Nov 2026): a holiday's name is the edit box itself (plaintext-only, no
//       id, the first thing in .hv-name), drawn with no border or fill until pointed at, and no row moved for it
//   S2  typed there and Enter: renamed everywhere it shows (the list, the month view, the file's holidayNames, no new
//       field id); one undo takes it back, redo puts it back
//   S3  Esc puts the name back, renames nothing, and the Settings window stays open
//   S4  a redraw while a name is being typed keeps the typing, the caret and the focus
//   S5  its own date typed after the name is not doubled; cleared, it shows its own name as a hint and goes back to it
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
    var u8 = rec.files.filter(function (f) { return f.closed; })[0].bytes;
    // Every Flate stream, inflated and cut at its own /Length (T.pdfInflated, lib.js: never by trimming the EOL).
    return (await T.pdfInflated(u8)).join('\n');
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
      // ⚠️ RE-EXPECTED for the editors' look A2 (owner, 4 Nov 2026; notelook): the heading is the name, then the day. It
      // read "11/27/26 · Holiday".
      kase('R1', 'Day After Thanksgiving opens the holiday editor: "Holiday Fri 11/27/26", its name alone, the original named in the placeholder, the week\'s purple selected',
           txt(q('.mv-note-pop-day', pop)) === 'Holiday Fri 11/27/26' && ta.value === 'Day After Thanksgiving'
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
      // ⚠️ Date Last Edited (1507204, 9 Nov 2026) writes a top-level lastEdited once a calendar has been edited (or opened from a file with
      // no stamp, which takes the file's time), so it is left out here, as noteviews does (11 Nov 2026).
      var added = Object.keys(s).filter(function (k) { return !(k in S0) && k !== 'lastEdited'; }).sort();
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
    await step('H1', async function () {
      // Hide Holiday in the MONTH view's holiday editor (owner, 21 Nov 2026): the waterfall editor's button, mirrored.
      await toMonth('November 2026');
      var box = function (v) { return q('#holiday-vis-list input[data-view="' + v + '"][data-hid="thanksgiving@2026"]'); };
      var sheet0 = box('sheet') ? box('sheet').checked : null, fri0 = lines('2026-11-27');
      var pop = await openMv('2026-11-26', /^Thanksgiving/);
      var btn = q('.note-pop-head .mv-holiday-hide', pop);
      var label = btn ? txt(btn) : null;
      if (!btn) throw new Error('no Hide Holiday button');
      btn.click();
      await settle();
      var thu = lines('2026-11-26'), fri = lines('2026-11-27'), s = JSON.parse(await save());
      var hv = (s.holidayView || {})['thanksgiving@2026'] || {};
      var monthBox = box('month') ? box('month').checked : null, sheet1 = box('sheet') ? box('sheet').checked : null;
      await undo();
      var back = lines('2026-11-26');
      kase('H1', 'the month holiday editor has Hide Holiday at its top right: it hides Thanksgiving from the month view only (its Month box unticked, its Waterfall box and Day After untouched), and one undo brings it back',
           label === 'Hide Holiday' && !byId('mv-note-pop') && thu.length === 0 && fri.length === 1 && same(fri, fri0)
             && hv.month === false && monthBox === false && sheet1 === sheet0 && back.length === 1 && /^Thanksgiving/.test(back[0]),
           { label: label, thu: thu, fri: fri, holidayView: hv, monthBox: monthBox, sheet: [sheet0, sheet1], afterUndo: back });
    });
    // ===== S1-S5: rename from the Holidays list in Settings (owner, 21 Nov 2026) ====================================
    // "No text box until you hover over the title similar to how the episode names in the production phase section
    // work": the name reads as text and edits in place (.hv-name-edit). Memorial Day 2026: no Enable box, Month ticked.
    var MEM = 'memorial-day@2026';
    function hvName(hid) { return qa('#holiday-vis-list .hv-name-edit').filter(function (e) { return e.getAttribute('data-hid') === hid; })[0] || null; }
    function press(el, k) { var ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev.defaultPrevented; }
    function typeName(hid, text) {
      var el = hvName(hid); if (!el) throw new Error('no list name for ' + hid);
      el.scrollIntoView({ block: 'center' }); el.focus();
      el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return el;
    }
    await step('S1', async function () {
      await T.openSettings('region');
      var el = hvName(MEM), nm = el && el.closest('.hv-name'), cs = el && getComputedStyle(el);
      // The box moves nothing: every row's height and every name's left edge, against the same name as plain text.
      var moved = [];
      qa('#holiday-vis-list .hv-name-edit').forEach(function (e) {
        var row = e.closest('.hv-row'), h1 = row.getBoundingClientRect().height, l1 = e.getBoundingClientRect().left + 5;
        var p = document.createElement('span'); p.textContent = e.textContent; e.parentNode.insertBefore(p, e); e.style.display = 'none';
        var h0 = row.getBoundingClientRect().height, l0 = p.getBoundingClientRect().left;
        p.remove(); e.style.display = '';
        if (Math.abs(h1 - h0) > 0.01 || Math.abs(l1 - l0) > 0.01) moved.push([e.textContent, h0, h1, l0, l1]);
      });
      kase('S1', 'the list\'s name is the edit box: plaintext-only, no id, the first thing in .hv-name, no border or fill until pointed at, and no row moved',
           !!el && el.getAttribute('contenteditable') === 'plaintext-only' && !el.id && nm.firstChild === el && txt(el) === 'Memorial Day'
             && cs.borderTopColor === 'rgba(0, 0, 0, 0)' && cs.backgroundColor === 'rgba(0, 0, 0, 0)' && moved.length === 0,
           { editable: el && el.getAttribute('contenteditable'), first: !!nm && nm.firstChild === el, name: txt(el), border: cs && cs.borderTopColor, fill: cs && cs.backgroundColor, moved: moved.slice(0, 3) });
    });
    await step('S2', async function () {
      await toMonth('May 2026');
      var mv0 = lines('2026-05-25'), ids0 = Object.keys(JSON.parse(await save()).fields.byId).sort();
      var el = typeName(MEM, 'Memorial Day (office closed)');
      var prevented = press(el, 'Enter');
      await settle();
      var row = holidayRow(/^Memorial Day \(office closed\) · 5\/25\/26/), mv1 = lines('2026-05-25'), s = JSON.parse(await save());
      var focused = !!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('hv-name-edit'));
      await undo();
      var undone = txt(hvName(MEM)), mv2 = lines('2026-05-25');
      await redo();
      var redone = txt(hvName(MEM));
      kase('S2', 'typed in the list and Enter: renamed everywhere it shows (the list with "renamed from", the month view, the file\'s holidayNames, no new field id), focus leaves; one undo takes it back, redo puts it back',
           prevented && !focused && !!row && /renamed from Memorial Day/.test(row.title)
             && same(mv0, ['Memorial Day 5/25/26']) && same(mv1, ['Memorial Day (office closed) 5/25/26'])
             && (s.holidayNames || {})[MEM] === 'Memorial Day (office closed)' && same(Object.keys(s.fields.byId).sort(), ids0)
             && undone === 'Memorial Day' && same(mv2, ['Memorial Day 5/25/26']) && redone === 'Memorial Day (office closed)',
           { prevented: prevented, focused: focused, listRow: row && row.title, month: [mv0, mv1, mv2], name: (s.holidayNames || {})[MEM], undone: undone, redone: redone });
    });
    await step('S3', async function () {
      var before = JSON.parse(await save()).holidayNames;
      var el = typeName(MEM, 'Something else');
      var prevented = press(el, 'Escape');
      await settle();
      var after = JSON.parse(await save()).holidayNames;
      kase('S3', 'Esc puts the name back and renames nothing, and the Settings window stays open (the key is taken)',
           prevented && txt(hvName(MEM)) === 'Memorial Day (office closed)' && same(before, after) && byId('settings-window').classList.contains('is-open'),
           { prevented: prevented, name: txt(hvName(MEM)), names: after, open: byId('settings-window').classList.contains('is-open') });
    });
    await step('S4', async function () {
      // A redraw lands while a name is being typed (the list is rewritten on every render): toggling another holiday's
      // Month box redraws it. The typing, the caret and the focus carry over to the new row.
      var el = typeName(MEM, 'Memorial Day typed');
      var r = document.createRange(); r.setStart(el.firstChild, 7); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r);
      var other = q('#holiday-vis-list input[data-view="month"]:not([data-hid="' + MEM + '"])');
      other.checked = !other.checked; other.dispatchEvent(new Event('change', { bubbles: true }));
      await T.sleep(100);
      var a = document.activeElement, sameRow = !!a && a.getAttribute && a.getAttribute('data-hid') === MEM;
      var kept = { replaced: !el.isConnected, focused: sameRow, text: a && a.textContent, caret: getSelection().anchorOffset };
      press(a, 'Escape');
      other = q('#holiday-vis-list input[data-view="month"][data-hid="' + other.getAttribute('data-hid') + '"]');
      other.checked = !other.checked; other.dispatchEvent(new Event('change', { bubbles: true }));
      await settle();
      kase('S4', 'a redraw while a name is being typed keeps the typing, the caret and the focus in the new row',
           kept.replaced && kept.focused && kept.text === 'Memorial Day typed' && kept.caret === 7 && txt(hvName(MEM)) === 'Memorial Day (office closed)', kept);
    });
    await step('S5', async function () {
      // Its own date typed after the name is dropped (the date is added back), then cleared: its own name again.
      var el = typeName(MEM, 'Memorial Day (closed) 5/25/26');
      el.blur();
      await settle();
      var dated = { list: txt(hvName(MEM)), month: lines('2026-05-25') };
      el = typeName(MEM, '');
      var hint = getComputedStyle(el, '::before').content;
      el.blur();
      await settle();
      var s = JSON.parse(await save());
      kase('S5', 'its own date typed after the name is not doubled; cleared, it shows its own name as a hint and goes back to it, and its key leaves the file',
           dated.list === 'Memorial Day (closed)' && same(dated.month, ['Memorial Day (closed) 5/25/26']) && hint === '"Memorial Day"'
             && txt(hvName(MEM)) === 'Memorial Day' && same(lines('2026-05-25'), ['Memorial Day 5/25/26']) && !((s.holidayNames || {})[MEM]),
           { dated: dated, hint: hint, name: txt(hvName(MEM)), month: lines('2026-05-25'), names: s.holidayNames });
      await T.closeSettings();
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
