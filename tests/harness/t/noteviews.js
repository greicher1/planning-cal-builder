// noteviews -- a note shown in the OTHER view (owner, 4 Nov 2026): "Add a toggle in the popup when you edit a note (right
// below the color selector), both in the month view and the waterfall view popups to hide/show the note in the other
// calendar. By default it should be set to Show from waterfall to month view but hide by default for notes entered into
// the month view." Rulings by picker the same day: R1 a month note in the waterfall reads "text m/d/yy" on one line;
// R2 edits follow it (renamed from the waterfall's editor, switched off when its line is taken out); R3 "Show in month
// view" off hides the week's TYPED lines only (holidays and automatic notes stay); R4 typed notes only. No frozen code:
// effectiveNoteText (every waterfall reader's) and mvDayNotePlan (the month view's) are where it happens.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=wfkeys ./run.sh noteviews 500
//
// tests/fixtures/wfkeys.sptcal (synthetic, US General): typed waterfall notes on 2026-08-03 "Table read", 2026-08-10
// "Cast fittings\nNetwork call", 2026-09-07 "Wrap party 9/10/26" (pinned 9/10) and 2026-09-14 "Blocker"; no month notes.
// Labor Day 9/7/26 is a holiday the month view shows and the waterfall does not.
//
//   W1  the waterfall note editor: "Show in month view" right below the colour rows, on, its checkbox with no id; a hiatus
//       band's editor has none
//   W2  switched off on the 9/7 week: the month view drops "Wrap party 9/10/26" and keeps Labor Day on 9/7 (R3) and every
//       other week's note; the waterfall cell is unchanged; the editor reopens off
//   U1  one undo brings Wrap party back to the month view, one redo takes it out again
//   D1  the month editor of a new note: "Show in waterfall" right below the colours, OFF, no id; saved off, the
//       waterfall's 8/10 cell is unchanged
//   D2  switched on: the 8/10 cell reads its own two lines, then "Crew party 8/12/26" (R1); the month view still draws
//       it once, as the day's own note; the editor reopens on
//   D3  a two-line month note switched on reads as one line with its date: "Lunch with network 8/13/26"
//   X1  the workbook's 8/10 cell holds all four lines
//   P1  the waterfall PDF draws "Crew party 8/12/26"
//   E1  R2: renamed in the waterfall's editor, the month note takes the new text (date out); the typed note is unchanged
//   E2  R2: a line taken out in the waterfall's editor switches that month note off; it stays in the month view
//   K1  R2: Cut on the 8/10 cell empties it and switches its month note off (kept in the month view); undo puts it back
//   C1  a waterfall line's switch, turned off in the month view, moves it out of the waterfall into a note of its day
//   F1  Save writes userNotes[9/7].monthHidden and dayNotes[8/12][0].waterfall, both true, with no new key or field id;
//       Load brings both back with no repair warning
//   F2  any other value of either is dropped on Load and counted
//   E0  no console errors, apart from the one warning F2 is meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'noteviews', cases: [] };
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
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table');
    if (on) return;
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await settle();
  }
  async function toMonth(label) {
    await view('month');
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
  // ---- the waterfall ----------------------------------------------------------------------------------------------
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  // A Notes cell's lines as drawn (the cell keeps the note's line breaks).
  function cellLines(wk) { var t = noteTd(wk); return t ? (t.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean) : null; }
  async function openWf(wk) {
    await view('sheet');
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  async function commitWf(pop, text) {
    var ta = q('textarea', pop);
    if (text !== undefined) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }
  function escapeWf(pop) { var ta = pop && q('textarea', pop); if (ta) ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  // The switch row: where it sits (right after the last colour row), its label, its state, its checkbox's id.
  function switchInfo(pop) {
    var row = pop && q('.note-view-row', pop), cb = row && q('input[type=checkbox]', row);
    var colours = pop ? qa('.note-color-row', pop) : [];
    var last = colours[colours.length - 1];
    return row ? { label: txt(q('.note-view-label', row)), on: !!cb && cb.checked, id: cb ? cb.id : null,
                   belowColours: !!last && last.nextElementSibling === row } : null;
  }
  // ---- the month view ----------------------------------------------------------------------------------------------
  function blocks(iso, kind) { return qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"]' + (kind ? '[data-note-kind="' + kind + '"]' : '')); }
  function texts(iso, kind) { return blocks(iso, kind).map(function (b) { return txt(b); }); }
  function plus(iso) { return q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]'); }
  function mvPop() { return byId('mv-note-pop'); }
  async function openAdd(iso) { var p = plus(iso); if (!p) throw new Error('no + on ' + iso); p.click(); await T.sleep(200); if (!mvPop()) throw new Error('no editor on ' + iso); return mvPop(); }
  async function openBlock(iso, kind, like) {
    var b = blocks(iso, kind).filter(function (x) { return txt(x).indexOf(like) !== -1; })[0];
    if (!b) throw new Error('no ' + kind + ' note like "' + like + '" on ' + iso + ' (have ' + JSON.stringify(texts(iso)) + ')');
    b.scrollIntoView({ block: 'center' }); await T.sleep(80);
    b.click(); await T.sleep(250);
    if (!mvPop()) throw new Error('no editor for "' + like + '" on ' + iso);
    return mvPop();
  }
  async function commitMv(text, switchTo) {
    var p = mvPop(); if (!p) throw new Error('no month editor open');
    if (switchTo !== undefined) { var cb = q('.note-view-cb', p); if (!cb) throw new Error('no switch'); if (cb.checked !== switchTo) cb.click(); }
    var ta = q('textarea', p);
    if (text !== undefined) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await settle();
  }
  function escMv() { var p = mvPop(); if (p) q('textarea', p).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- the exports -------------------------------------------------------------------------------------------------
  async function exportAgain(id, label) { await T.sleep(700); return T.captureExport(id, label); }
  async function workbook(label) {
    var b = await exportAgain('export-btn', label);
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
    var ws = wb.worksheets[0], vals = [];
    ws.eachRow({ includeEmpty: false }, function (row) {
      row.eachCell({ includeEmpty: false }, function (c) { if (typeof c.value === 'string') vals.push(c.value); });
    });
    return vals;
  }
  async function inflate(u8) {
    var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    var r = ds.readable.getReader(), parts = [], n = 0;
    for (;;) { var x = await r.read(); if (x.done) break; parts.push(x.value); n += x.value.length; }
    var o = new Uint8Array(n), k = 0; parts.forEach(function (p) { o.set(p, k); k += p.length; });
    return new TextDecoder('latin1').decode(o);
  }
  async function wfPdf(label) {
    var blob = await exportAgain('export-wf-pdf-btn', label);
    var u8 = new Uint8Array(await blob.arrayBuffer()), s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var L = +((s.match(/4 0 obj\s*<< \/Length (\d+)/) || [])[1] || 0);
    var a = s.indexOf('stream'), st = a + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
    return inflate(u8.subarray(st, st + L));
  }

  // ---- Save and Load through the real controls ----------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'noteviews.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'noteviews.sptcal', { lastModified: 1 }); },
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
    var stem = 'noteviews-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  function clip(type, data) {
    var dt = new DataTransfer();
    Object.keys(data || {}).forEach(function (t) { dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
    (document.activeElement || document.body).dispatchEvent(ev);
    return { text: dt.getData('text/plain'), rich: dt.getData('application/x-sptcal-notes') };
  }
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  async function highlight(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(80);
    var p = mid(el), t = document.elementFromPoint(p.x, p.y) || document.body;
    ['pointerdown', 'pointerup'].forEach(function (type) {
      t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
        buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true }));
    });
    t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0 }));
    await T.sleep(250);
    var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur();
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && txt(noteTd('2026-09-14')) === 'Blocker'; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = JSON.parse(await save());

    // ===== W1: the waterfall's editor ==================================================================================
    await step('W1', async function () {
      var pop = await openWf('2026-08-10'), s = switchInfo(pop);
      escapeWf(pop); await T.sleep(200);
      var band = q('#table-wrap td.sheet-hiatus-cell[data-week="2026-11-23"]'); if (!band) throw new Error('no hiatus band at 11/23/26');
      band.scrollIntoView({ block: 'center' }); await T.sleep(100);
      T.openCell(band); await T.sleep(300);
      var bp = q('.note-pop'), bandSw = bp ? !!q('.note-view-row', bp) : null;
      escapeWf(bp); await T.sleep(200);
      kase('W1', 'the waterfall note editor carries "Show in month view" right below its colour rows, on, its checkbox with no id; a hiatus band\'s editor has none',
           !!s && s.label === 'Show in month view' && s.on && !s.id && s.belowColours && bandSw === false, { sw: s, bandSwitch: bandSw });
    });

    // ===== W2, U1: "Show in month view" off (R3) ======================================================================
    var before = null;
    await step('W2', async function () {
      await toMonth('September 2026');
      before = { d7: texts('2026-09-07'), d10: texts('2026-09-10'), d14: texts('2026-09-14') };
      var pop = await openWf('2026-09-07');
      var cb = q('.note-view-cb', pop); cb.click();
      await commitWf(pop);
      var cell = cellLines('2026-09-07');
      var re = await openWf('2026-09-07'), s = switchInfo(re);
      escapeWf(re); await T.sleep(200);
      await toMonth('September 2026');
      var after = { d7: texts('2026-09-07'), d10: texts('2026-09-10'), d14: texts('2026-09-14') };
      kase('W2', 'switched off on the 9/7 week: the month view drops "Wrap party 9/10/26" but keeps Labor Day on 9/7 (R3) and Blocker on 9/14; the waterfall cell is unchanged; the editor reopens off',
           before.d10.some(function (t) { return /Wrap party/.test(t); }) && !after.d10.some(function (t) { return /Wrap party/.test(t); })
             && before.d7.some(function (t) { return /Labor Day/.test(t); }) && after.d7.some(function (t) { return /Labor Day/.test(t); })
             && same(after.d14, before.d14) && after.d14.indexOf('Blocker') !== -1
             && same(cell, ['Wrap party 9/10/26']) && !!s && !s.on,
           { before: before, after: after, cell: cell, reopened: s });
    });
    await step('U1', async function () {
      await undo();
      await toMonth('September 2026');
      var back = texts('2026-09-10');
      await redo();
      await toMonth('September 2026');
      var again = texts('2026-09-10');
      kase('U1', 'one undo brings "Wrap party 9/10/26" back to the month view; one redo takes it out again',
           back.some(function (t) { return /Wrap party/.test(t); }) && !again.some(function (t) { return /Wrap party/.test(t); }), { undone: back, redone: again });
    });

    // ===== D1-D3: "Show in waterfall" on a month note ==================================================================
    await step('D1', async function () {
      await toMonth('August 2026');
      var pop = await openAdd('2026-08-12'), s = switchInfo(pop);
      await commitMv('Crew party');
      await view('sheet');
      var cell = cellLines('2026-08-10');
      kase('D1', 'a new month note\'s editor carries "Show in waterfall" right below its colours, OFF, with no id; saved off, the waterfall\'s 8/10 cell is unchanged',
           !!s && s.label === 'Show in waterfall' && !s.on && !s.id && s.belowColours && same(cell, ['Cast fittings', 'Network call']), { sw: s, cell: cell });
    });
    await step('D2', async function () {
      await toMonth('August 2026');
      await openBlock('2026-08-12', 'day', 'Crew party');
      await commitMv(undefined, true);
      var day = texts('2026-08-12'), wfKind = texts('2026-08-12', 'wf');
      var re = await openBlock('2026-08-12', 'day', 'Crew party'), s = switchInfo(re);
      escMv(); await T.sleep(200);
      await view('sheet');
      var cell = cellLines('2026-08-10');
      kase('D2', 'switched on: the 8/10 cell reads its own two lines, then "Crew party 8/12/26" (R1); the month view still draws it once, as the day\'s own note; the editor reopens on',
           same(cell, ['Cast fittings', 'Network call', 'Crew party 8/12/26']) && same(day, ['Crew party']) && wfKind.length === 0 && !!s && s.on,
           { cell: cell, day: day, reopened: s });
    });
    await step('D3', async function () {
      await toMonth('August 2026');
      await openAdd('2026-08-13');
      await commitMv('Lunch\nwith network', true);
      await view('sheet');
      var cell = cellLines('2026-08-10');
      kase('D3', 'a two-line month note switched on reads as ONE line with its date: "Lunch with network 8/13/26", after the 8/12 one',
           same(cell, ['Cast fittings', 'Network call', 'Crew party 8/12/26', 'Lunch with network 8/13/26']), { cell: cell });
    });

    // ===== X1, P1: the waterfall's writers ==========================================================================
    await step('X1', async function () {
      var vals = await workbook('the workbook');
      var want = 'Cast fittings\nNetwork call\nCrew party 8/12/26\nLunch with network 8/13/26';
      kase('X1', 'the workbook\'s 8/10 Notes cell holds the typed note, then both month notes with their dates',
           vals.indexOf(want) !== -1, { found: vals.filter(function (v) { return /Cast fittings/.test(v); }) });
    });
    await step('P1', async function () {
      var c = await wfPdf('the waterfall PDF');
      var a = c.indexOf('(Crew party 8/12/26) Tj') !== -1, b = c.indexOf('(Lunch with network 8/13/26) Tj') !== -1;
      kase('P1', 'the waterfall PDF draws "Crew party 8/12/26" and "Lunch with network 8/13/26"', a && b, { crew: a, lunch: b });
    });

    // ===== E1, E2: edits follow it (R2) ===============================================================================
    await step('E1', async function () {
      var pop = await openWf('2026-08-10');
      var opened = q('textarea', pop).value;
      await commitWf(pop, 'Cast fittings\nNetwork call\nCrew dinner 8/12/26\nLunch with network 8/13/26');
      var cell = cellLines('2026-08-10'), s = JSON.parse(await save());
      await toMonth('August 2026');
      var day = texts('2026-08-12');
      kase('E1', 'the waterfall editor opens on all four lines; renaming the 8/12 line there renames the month note ("Crew dinner", its date out) and leaves the typed note as it was',
           opened === 'Cast fittings\nNetwork call\nCrew party 8/12/26\nLunch with network 8/13/26' && same(cell, ['Cast fittings', 'Network call', 'Crew dinner 8/12/26', 'Lunch with network 8/13/26'])
             && same(day, ['Crew dinner']) && s.userNotes['2026-08-10'].text === 'Cast fittings\nNetwork call' && s.dayNotes['2026-08-12'][0].text === 'Crew dinner' && s.dayNotes['2026-08-12'][0].waterfall === true,
           { opened: opened, cell: cell, day: day, userNote: s.userNotes['2026-08-10'], dayNote: s.dayNotes['2026-08-12'] });
    });
    await step('E2', async function () {
      var pop = await openWf('2026-08-10');
      await commitWf(pop, 'Cast fittings\nNetwork call\nCrew dinner 8/12/26');
      var cell = cellLines('2026-08-10'), s = JSON.parse(await save());
      await toMonth('August 2026');
      var day = texts('2026-08-13');
      var re = await openBlock('2026-08-13', 'day', 'Lunch'), sw = switchInfo(re);
      escMv(); await T.sleep(200);
      kase('E2', 'a month note\'s line taken out in the waterfall editor switches that note off for the waterfall; it stays in the month view (switch off), and the typed note is as it was',
           same(cell, ['Cast fittings', 'Network call', 'Crew dinner 8/12/26']) && day.length === 1 && /Lunch/.test(day[0]) && !!sw && !sw.on
             && s.dayNotes['2026-08-13'][0].waterfall === undefined && s.userNotes['2026-08-10'].text === 'Cast fittings\nNetwork call',
           { cell: cell, day: day, sw: sw, dayNote: s.dayNotes['2026-08-13'] });
    });

    // ===== K1: Cut takes a month note's line out (R2) ===================================================================
    await step('K1', async function () {
      await view('sheet');
      await highlight(noteTd('2026-08-10'));
      var c = clip('cut');
      await settle();
      var empty = !noteTd('2026-08-10').classList.contains('has-note'), s = JSON.parse(await save());
      await toMonth('August 2026');
      var day = texts('2026-08-12');
      await undo();
      await view('sheet');
      var back = cellLines('2026-08-10');
      kase('K1', 'Cut copies all three lines and empties the 8/10 cell; its month note is switched off but stays in the month view; one undo puts the cell back whole',
           c.text.indexOf('Crew dinner 8/12/26') !== -1 && empty && s.dayNotes['2026-08-12'][0].waterfall === undefined && same(day, ['Crew dinner'])
             && same(back, ['Cast fittings', 'Network call', 'Crew dinner 8/12/26']),
           { clip: c.text, empty: empty, day: day, back: back });
    });

    // ===== C1: a waterfall line switched off in the month view ==========================================================
    await step('C1', async function () {
      await toMonth('September 2026');
      var pop = await openBlock('2026-09-14', 'wf', 'Blocker'), s = switchInfo(pop);
      await commitMv(undefined, false);
      var dayKind = texts('2026-09-14', 'day'), wfKind = texts('2026-09-14', 'wf');
      await view('sheet');
      var has = noteTd('2026-09-14').classList.contains('has-note'), sv = JSON.parse(await save());
      kase('C1', 'a waterfall line\'s editor in the month view carries "Show in waterfall", on; switched off, the line leaves the waterfall (9/14 cell empty) and stays on 9/14 as a note of the day\'s own, off',
           !!s && s.label === 'Show in waterfall' && s.on && s.belowColours && same(dayKind, ['Blocker']) && wfKind.length === 0 && !has
             && same(sv.dayNotes['2026-09-14'].map(function (e) { return [e.text, e.waterfall === true]; }), [['Blocker', false]])
             && !(sv.userNotes['2026-09-14'] && sv.userNotes['2026-09-14'].text),
           { sw: s, dayKind: dayKind, wfKind: wfKind, cellHasNote: has, dayNote: sv.dayNotes['2026-09-14'], userNote: sv.userNotes['2026-09-14'] || null });
    });

    // ===== F1, F2: the file =============================================================================================
    var savedText = null;
    await step('F1', async function () {
      savedText = await save();
      var s = JSON.parse(savedText);
      var keysSame = same(Object.keys(s).sort(), Object.keys(S0).sort()), idsSame = same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort());
      var w0 = repairWarnings();
      await load(savedText);
      await view('sheet');
      var cell = cellLines('2026-08-10');
      await toMonth('September 2026');
      var d10 = texts('2026-09-10');
      kase('F1', 'Save writes userNotes[9/7].monthHidden and dayNotes[8/12][0].waterfall, both true, with no new key or field id; Load brings both back with no repair warning',
           s.userNotes['2026-09-07'].monthHidden === true && s.dayNotes['2026-08-12'][0].waterfall === true && keysSame && idsSame
             && same(cell, ['Cast fittings', 'Network call', 'Crew dinner 8/12/26']) && !d10.some(function (t) { return /Wrap party/.test(t); }) && repairWarnings() === w0,
           { userNote: s.userNotes['2026-09-07'], dayNote: s.dayNotes['2026-08-12'], keysSame: keysSame, idsSame: idsSame, cell: cell, d10: d10, warnings: repairWarnings() - w0 });
    });
    await step('F2', async function () {
      var s = JSON.parse(savedText);
      s.userNotes['2026-09-07'].monthHidden = 1; s.dayNotes['2026-08-12'][0].waterfall = 'yes';
      var w0 = repairWarnings();
      await load(JSON.stringify(s));
      await view('sheet');
      var cell = cellLines('2026-08-10');
      await toMonth('September 2026');
      var d10 = texts('2026-09-10');
      kase('F2', 'any other value of either flag is dropped on Load (the month note out of the waterfall, Wrap party back in the month view), and the repair is reported',
           same(cell, ['Cast fittings', 'Network call']) && d10.some(function (t) { return /Wrap party/.test(t); }) && repairWarnings() > w0,
           { cell: cell, d10: d10, warnings: repairWarnings() - w0 });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (F2\'s repair warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'noteviews threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
