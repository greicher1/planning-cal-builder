// autonoteview -- an automatic note shown in ONE view only (owner, 2 Nov 2026: "Can automatic notes be seperated like
// holidays so you can indepentenly show/hide them in the waterfall and month view"; AUTO-NOTES-PER-VIEW-PLAN.md,
// rulings R1(a)-R4(a), defaults D1-D8). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=autonoterename ./run.sh autonoteview 500
//
// tests/fixtures/autonoterename.sptcal (synthetic, US Area Standards): Writer's Room from 1/5/26, Production from
// 6/29/26 (wraps 10/20/26), Post from 11/2/26 with "Post Begins" ticked on, Independence Day (Observed) 7/3/26 shown in
// both views (so the 6/29/26 week holds an automatic note AND a holiday). The leg loads it with the wrap RENAMED to a
// long name (LONG), so it is the 2026 block's widest note and taking it out of the waterfall must narrow the Notes
// column.
//
//   V0  control: the card has a Waterfall | Month heading and two boxes per note; the wrap ticked in both; the file has
//       no autoNotesView key
//   V1  the wrap's Waterfall box unticked (hit-tested): gone from the waterfall cell, the Notes column narrower, the
//       workbook and the waterfall PDF; still in the month view and the written month PDF; saved as autoNotesView
//       {principalWrap: {sheet: false}}, with no autoNotesOff and the SAME fields.byId ids
//   V2  the start's Month box unticked: still in the waterfall cell and the workbook; gone from the month view (the
//       holiday beside it stays) and the written month PDF; both splits saved, sorted
//   V3  the boxes and their aria-labels read the stores back
//   V4  ONE undo per tick: the start's Month box ticked, one undo unticks it again, redo ticks it
//   V5  both of the wrap's boxes unticked = OFF: autoNotesOff, and no autoNotesView entry left
//   V6  every box ticked back: the saved file is BYTE-IDENTICAL to the untouched calendar's
//   V7  an opt-in kind (Post Ends) ticked for the month view only: autoNotesOn plus the split; unticked again, neither,
//       and never autoNotesOff
//   V8  a hostile file: malformed entries and __proto__ / constructor keys are dropped (the note shows in both
//       views), the one well-formed entry kept, the repair reported, and no prototype touched
//   V9  the untouched calendar loaded after it opens with no split (restored unconditionally, the M-5 trap), and saves
//       byte for byte as it did
//   ---- a waterfall note typed over the week (frozen edits N1 and N2, R2(a)) ----
//   T1  typed in the waterfall over the wrap's week: the month-only wrap stays in the month view, ONCE (N1)
//   T2  a typed note carrying the waterfall-only start word for word: the month view leaves that line out (N2) and
//       keeps the typed line and the holiday, each once
//   T3  that line renamed in the waterfall: still automatic (the rename), still waterfall-only, still not in the month
//       view
//   T5  Shift All one week later with both typed weeks: the typed text follows its milestone (R5), the month view still
//       shows each split note once and in its own view only; one undo puts everything back
//   T4  edited from the month view: the typed line is saved without the month-only wrap, and the waterfall-only line
//       in the other typed week is kept
//   ---- a delete hides the note from the view it was made in (R4(a)) ----
//   D1  Hide Auto-Note on the month-only wrap: shown nowhere now, so switched OFF (autoNotesOff), its name with it
//   D2  Delete on the waterfall cell of the waterfall-only start: switched off too, and no week blank
//   E0  no console errors, apart from the one warning V8's values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'autonoteview', cases: [] };
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
  // Every waterfall-kind line the month view draws in the month on screen, for "once, never twice".
  function monthLines() { return qa('#table-wrap .mv-note-block[data-note-kind="wf"]').map(txt); }
  function count(list, s) { return list.filter(function (l) { return l === s; }).length; }
  async function openMv(day, re) {
    var b = block(day, re); if (!b) throw new Error('no block matching ' + re + ' on ' + day);
    b.scrollIntoView({ block: 'center' }); await T.sleep(100);
    b = block(day, re);
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
    await T.until(function () { return !!byId('mv-note-pop'); }, 'the month note editor', 40, 50);
    return byId('mv-note-pop');
  }
  async function commitMv(pop, value) {
    var ta = q('textarea', pop);
    if (value !== undefined) { ta.value = value; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    // Tab saves in every mode (plain Enter is a new line in a waterfall line's editor).
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await settle();
  }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellText(wk) {
    var t = noteTd(wk); if (!t) return null;
    var x = ((t.querySelector('.cell-body') || t).innerText || '').replace(/\s*\n\s*/g, '\n').trim();
    return x === '+' ? '' : x;                           // an empty Notes cell shows its "+"
  }
  function exactly(text) { return { test: function (t) { return t === text; } }; }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- the card's boxes ---------------------------------------------------------------------------------------
  function box(kind, v) { return q('.autonote-list input[data-autonote="' + kind + '"][data-view="' + v + '"]'); }
  function ticks(kind) { var s = box(kind, 'sheet'), m = box(kind, 'month'); return (s && m) ? [s.checked, m.checked] : null; }
  // ⛔ HIT-TESTED: the element on top at the box's centre must be the box, and THAT element gets the click.
  async function clickBox(kind, v) {
    // From the waterfall: opening the window over the month view (a far heavier redraw) missed T.openSettings' 2 s
    // REAL-time wait under a full gate's load, twice running (gate of 4 Nov 2026, T2), and every later case fell with it.
    // The cases switch views themselves after the click. Up to three tries, for the same reason.
    if (q('#table-wrap .mv-daygrid')) await view('sheet');
    for (var tries = 0; ; tries++) {
      try { await T.openSettings('prefs'); break; }
      catch (e) {
        if (tries >= 2) {
          var win = byId('settings-window'), aside = q('.form-panel'), rail = q('.side-tabs');
          var R = function (el) { if (!el) return null; var r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
          throw new Error(e.message + ' -- window ' + (win && win.className) + ' ' + JSON.stringify(R(win)) + ', sidebar ' + JSON.stringify(R(aside))
                          + ' scrolled ' + (aside && aside.scrollTop)
                          + ', rail ' + JSON.stringify(R(rail)) + ', page scroll ' + window.scrollY + ', focus ' + (document.activeElement && (document.activeElement.className || document.activeElement.tagName)));
        }
        await T.sleep(1500);
      }
    }
    await T.sleep(150);
    var b = box(kind, v);
    if (!b) throw new Error('no ' + v + ' box for ' + kind);
    // Scroll the window's OWN panel, never scrollIntoView: that also scrolls the sidebar the window lies in (508 px,
    // measured), and the window, placed from the sidebar's scroll when it opened, was left that far down the next time
    // the sidebar's scroll moved back, so T.openSettings never saw it open (gate of 4 Nov 2026, T2).
    var panel = b.closest('.sw-panel');
    if (panel) {
      var pr = panel.getBoundingClientRect(), br = b.getBoundingClientRect();
      panel.scrollTop += (br.top + br.height / 2) - (pr.top + pr.height / 2);
    } else b.scrollIntoView({ block: 'center' });
    await T.sleep(100);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== b) throw new Error('the ' + kind + ' ' + v + ' box is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await settle();
  }

  // ---- Save and Load through the real controls ----------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'autonoteview.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'autonoteview.sptcal', { lastModified: 1 }); },
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
    var stem = 'autonoteview-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  function idSet(snap) { return Object.keys(snap.fields.byId).sort(); }

  // ---- the exports --------------------------------------------------------------------------------------------
  // Every Flate stream of a PDF, inflated, each cut at its own /Length (T.pdfInflated, lib.js: never by trimming).
  async function inflate(u8) { return (await T.pdfInflated(u8)).join('\n'); }
  async function monthPdfText() {
    await view('month');
    T.monthPrintPath(false);
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var t = await inflate(rec.files.filter(function (f) { return f.closed; })[0].bytes);
    await view('sheet');
    return t;
  }
  async function wfPdfText() {
    await view('sheet');
    await T.sleep(700);
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    return inflate(new Uint8Array(await pb.arrayBuffer()));
  }
  async function workbookCells() {
    await view('sheet');
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    await T.sleep(700);
    var xb = await T.captureExport('export-btn', 'the workbook');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var cells = [];
    wb.worksheets[0].eachRow({ includeEmpty: false }, function (row) {
      row.eachCell({ includeEmpty: false }, function (c) {
        var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
        if (typeof v === 'string') cells.push(v);
      });
    });
    return cells;
  }

  // The wrap, renamed so it is the 2026 block's widest note (STRIKE is a word no other text in the calendar has).
  var LONG = 'Wrap And Every Department Strikes The Last Standing Set';
  var WRAP = LONG + ' 10/20/26', START = 'Start Principal Photography 6/29/26', IND = 'Independence Day (Observed) 7/3/26';
  function cellW(wk) { var t = noteTd(wk); return t ? Math.round(t.getBoundingClientRect().width * 10) / 10 : null; }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!q('#table-wrap table.sheet-table') || !!q('#table-wrap .mv-daygrid'); }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var F = JSON.parse(await save());
    F.autoNoteNames = { principalWrap: LONG };
    var SL = JSON.stringify(F);
    await load(SL);
    await view('sheet');
    var S0 = await save(), s0 = JSON.parse(S0);
    var w0 = cellW('2026-10-19');

    await step('V0', async function () {
      await T.openSettings('prefs');
      var card = q('.autonote-list'), heads = qa('.autonote-hd', card).map(txt);
      var ids = qa('input[id], select[id], textarea[id]', card.closest('section.card')).map(function (e) { return e.id; });
      kase('V0', 'control: a Waterfall | Month heading and two boxes per note, the wrap ticked in both, its long name in its waterfall cell, and the file has no autoNotesView key',
           same(heads, ['', 'Waterfall', 'Month']) && same(ticks('principalWrap'), [true, true]) && same(ticks('postStart'), [true, true])
             && same(ticks('postEnd'), [false, false]) && ids.length === 0 && cellText('2026-10-19') === WRAP && !('autoNotesView' in s0),
           { heads: heads, wrap: ticks('principalWrap'), ids: ids, cell: cellText('2026-10-19'), key: 'autoNotesView' in s0 });
    });

    await step('V1', async function () {
      await clickBox('principalWrap', 'sheet');
      await view('sheet');
      var c = cellText('2026-10-19'), w1 = cellW('2026-10-19'), s = JSON.parse(await save());
      var cells = await workbookCells(), wf = await wfPdfText(), mp = await monthPdfText();
      await toMonth('October 2026');
      var m = lines('2026-10-20');
      kase('V1', 'the wrap\'s Waterfall box unticked: gone from the waterfall cell (the Notes column narrower), the workbook and the waterfall PDF; still in the month view and the written month PDF; saved as autoNotesView {principalWrap: {sheet: false}}, no autoNotesOff, the same ids',
           c === '' && w1 < w0 && !cells.some(function (v) { return /Strikes/.test(v); }) && wf.indexOf('Strikes') === -1
             && mp.indexOf('Strikes') !== -1 && same(m, [WRAP]) && same(s.autoNotesView, { principalWrap: { sheet: false } })
             && !('autoNotesOff' in s) && same(s.autoNotesOn, s0.autoNotesOn) && same(idSet(s), idSet(s0)),
           { cell: c, width: [w0, w1], xlsx: cells.filter(function (v) { return /Strikes/.test(v); }), wfPdf: wf.indexOf('Strikes') !== -1,
             monthPdf: mp.indexOf('Strikes') !== -1, month: m, view: s.autoNotesView, off: s.autoNotesOff });
    });

    await step('V2', async function () {
      await clickBox('principalStart', 'month');
      await view('sheet');
      var c = cellText('2026-06-29'), s = JSON.parse(await save());
      var cells = await workbookCells(), mp = await monthPdfText();
      await toMonth('June 2026');
      var m = { jun29: lines('2026-06-29') };
      await toMonth('July 2026');
      m.jul3 = lines('2026-07-03');
      kase('V2', 'the start\'s Month box unticked: still in its waterfall cell (beside the holiday) and the workbook; gone from the month view, where the holiday stays, and from the written month PDF; both splits saved, sorted',
           c === START + '\n' + IND && cells.some(function (v) { return v.indexOf(START) !== -1; }) && mp.indexOf('Start Principal') === -1
             && same(m.jun29, []) && same(m.jul3, [IND]) && JSON.stringify(s.autoNotesView) === JSON.stringify({ principalStart: { month: false }, principalWrap: { sheet: false } }),
           { cell: c, xlsx: cells.filter(function (v) { return /Principal/.test(v); }), monthPdf: mp.indexOf('Start Principal') !== -1, month: m, view: s.autoNotesView });
    });

    await step('V3', async function () {
      await T.openSettings('prefs');
      var a = box('principalWrap', 'sheet'), b = box('principalStart', 'month');
      kase('V3', 'the boxes read the stores back, and each says which note and which view it is',
           same(ticks('principalWrap'), [false, true]) && same(ticks('principalStart'), [true, false]) && same(ticks('writersRoomOpens'), [true, true])
             && a.getAttribute('aria-label') === 'Production Wraps, Waterfall' && b.getAttribute('aria-label') === 'Production Starts, Month view',
           { wrap: ticks('principalWrap'), start: ticks('principalStart'), labels: [a.getAttribute('aria-label'), b.getAttribute('aria-label')] });
    });

    await step('V4', async function () {
      await clickBox('principalStart', 'month');
      var on = ticks('principalStart');
      await undo();
      var undone = ticks('principalStart');
      await redo();
      var redone = ticks('principalStart'), s = JSON.parse(await save());
      kase('V4', 'ONE undo per tick: the start\'s Month box ticked, one undo unticks it again, redo ticks it (and the split is gone from the file)',
           same(on, [true, true]) && same(undone, [true, false]) && same(redone, [true, true]) && same(s.autoNotesView, { principalWrap: { sheet: false } }),
           { on: on, undone: undone, redone: redone, view: s.autoNotesView });
    });

    await step('V5', async function () {
      await clickBox('principalWrap', 'month');
      var s = JSON.parse(await save());
      await toMonth('October 2026');
      var m = lines('2026-10-20');
      await view('sheet');
      kase('V5', 'both of the wrap\'s boxes unticked = OFF: autoNotesOff, no autoNotesView entry left, in neither view',
           same(ticks('principalWrap'), [false, false]) && (s.autoNotesOff || {}).principalWrap === true && !('autoNotesView' in s)
             && same(m, []) && cellText('2026-10-19') === '',
           { ticks: ticks('principalWrap'), off: s.autoNotesOff, view: s.autoNotesView, month: m });
    });

    await step('V6', async function () {
      await clickBox('principalWrap', 'sheet'); await clickBox('principalWrap', 'month');
      var S = await save();
      kase('V6', 'every box ticked back: the saved file is BYTE-IDENTICAL to the untouched calendar\'s',
           S === S0 && same(ticks('principalWrap'), [true, true]), { identical: S === S0, lenA: S0.length, lenB: S.length });
    });

    await step('V7', async function () {
      await clickBox('postEnd', 'month');
      var s1 = JSON.parse(await save());
      await clickBox('postEnd', 'month');
      var s2 = JSON.parse(await save());
      kase('V7', 'an opt-in kind (Post Ends) ticked for the month view only: autoNotesOn plus the split; unticked again, neither, and never autoNotesOff',
           (s1.autoNotesOn || {}).postEnd === true && same(s1.autoNotesView, { postEnd: { sheet: false } }) && !('autoNotesOff' in s1)
             && !(s2.autoNotesOn || {}).postEnd && !('autoNotesView' in s2) && !('autoNotesOff' in s2),
           { on1: s1.autoNotesOn, view1: s1.autoNotesView, on2: s2.autoNotesOn, view2: s2.autoNotesView, off2: s2.autoNotesOff });
    });

    await step('V8', async function () {
      var w0n = repairWarnings();
      // Spliced in as TEXT: a "__proto__" key cannot be written through an object literal and JSON.stringify.
      var bad = '{"__proto__":{"sheet":false},"constructor":{"month":false},"principalWrap":{"sheet":false,"month":false},'
              + '"principalStart":{"sheet":true},"postStart":"x","writersRoomOpens":{"month":false},"bad key!":{"sheet":false},'
              + '"postEnd":{"month":false,"x":1}}';
      var text = SL.slice(0, SL.lastIndexOf('}')) + ',"autoNotesView":' + bad + '}';
      await load(text);
      await T.openSettings('prefs');
      var t = { wrap: ticks('principalWrap'), start: ticks('principalStart'), post: ticks('postStart'), wr: ticks('writersRoomOpens') };
      var s = JSON.parse(await save());
      var clean = ({}).sheet === undefined && ({}).month === undefined && Object.prototype.sheet === undefined;
      kase('V8', 'a hostile file: the malformed entries and the __proto__ / constructor keys are dropped (those notes show in both views), the one well-formed entry is kept, the repair is reported, and no prototype is touched',
           same(t, { wrap: [true, true], start: [true, true], post: [true, true], wr: [true, false] }) && same(s.autoNotesView, { writersRoomOpens: { month: false } })
             && repairWarnings() > w0n && clean,
           { ticks: t, view: s.autoNotesView, warned: repairWarnings() - w0n, clean: clean });
    });

    await step('V9', async function () {
      await load(SL);
      await T.openSettings('prefs');
      var t = ticks('writersRoomOpens'), S = await save();
      kase('V9', 'the untouched calendar loaded after it opens with no split (restored unconditionally, the M-5 trap) and saves byte for byte as it did',
           same(t, [true, true]) && S === S0, { ticks: t, identical: S === S0 });
    });

    // ===== T1-T5: a waterfall note typed over the week (frozen edits N1 and N2) =======================================
    await step('T1', async function () {
      await clickBox('principalWrap', 'sheet');                 // the wrap: month view only
      await view('sheet');
      await T.typeUserNote('2026-10-19', 'Wrap party');
      await settle();
      var c = cellText('2026-10-19'), s = JSON.parse(await save());
      await toMonth('October 2026');
      var all = monthLines();
      kase('T1', 'typed in the waterfall over the wrap\'s week: the month-only wrap stays in the month view on its day, ONCE, beside the typed note (N1)',
           c === 'Wrap party' && same((s.userNotes || {})['2026-10-19'], { text: 'Wrap party' }) && same(lines('2026-10-20'), [WRAP])
             && count(all, WRAP) === 1 && same(lines('2026-10-19'), ['Wrap party']),
           { cell: c, userNote: (s.userNotes || {})['2026-10-19'], oct19: lines('2026-10-19'), oct20: lines('2026-10-20'), wraps: count(all, WRAP) });
    });

    await step('T2', async function () {
      await clickBox('principalStart', 'month');                // the start: waterfall only
      await view('sheet');
      await T.typeUserNote('2026-06-29', START + '\n' + IND + '\nTable read');
      await settle();
      var c = cellText('2026-06-29');
      await toMonth('June 2026');
      var jun = { d29: lines('2026-06-29'), all: monthLines() };
      await toMonth('July 2026');
      var jul = { d3: lines('2026-07-03'), all: monthLines() };
      kase('T2', 'a typed note carrying the waterfall-only start word for word: the month view leaves that line out (N2) and keeps the typed line and the holiday, each once',
           c === START + '\n' + IND + '\nTable read' && same(jun.d29, ['Table read']) && count(jun.all.concat(jul.all), START) === 0
             && same(jul.d3, [IND]) && count(jul.all, IND) === 1,
           { cell: c, jun29: jun.d29, jul3: jul.d3, starts: count(jun.all.concat(jul.all), START), holidays: count(jul.all, IND) });
    });

    await step('T3', async function () {
      await view('sheet');
      T.openCell(noteTd('2026-06-29')); await T.sleep(300);
      var ta = q('.note-pop textarea');
      ta.value = ta.value.replace(START, 'Camera Rolls 6/29/26');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      await settle();
      var c = cellText('2026-06-29'), s = JSON.parse(await save());
      await toMonth('June 2026');
      var all = monthLines();
      kase('T3', 'that line renamed in the waterfall: the note stays automatic (renamed "Camera Rolls"), still waterfall-only, still not in the month view',
           c === 'Camera Rolls 6/29/26\n' + IND + '\nTable read' && (s.autoNoteNames || {}).principalStart === 'Camera Rolls'
             && same((s.autoNotesView || {}).principalStart, { month: false }) && same(lines('2026-06-29'), ['Table read'])
             && !all.some(function (l) { return /Camera Rolls/.test(l); }),
           { cell: c, names: s.autoNoteNames, view: s.autoNotesView, jun29: lines('2026-06-29') });
    });

    // Before T4: a note edited from the month view is pinned to its day, and Shift All never moves a pinned note.
    await step('T5', async function () {
      await view('sheet');
      byId('shift-fwd-btn').click(); await settle();
      var c = { jun29: cellText('2026-06-29'), jul6: cellText('2026-07-06'), oct26: cellText('2026-10-26') };
      await toMonth('July 2026');
      var jul = { d6: lines('2026-07-06'), d3: lines('2026-07-03'), all: monthLines() };
      await toMonth('October 2026');
      // One fewer holiday inside the shoot (Independence Day (Observed) is now before it), so the wrap lands on Mon 10/26.
      var WRAP2 = LONG + ' 10/26/26';
      var oct = { d26: lines('2026-10-26').sort(), all: monthLines() };
      await view('sheet');
      await undo();
      var back = { jun29: cellText('2026-06-29'), oct19: cellText('2026-10-19') };
      kase('T5', 'Shift All one week later: the typed note over the waterfall-only start follows it (R5, its own line kept), the month view shows that start nowhere, the month-only wrap once on its new day beside the moved typed note, and the holiday once; one undo puts it all back',
           c.jul6 === 'Camera Rolls 7/6/26\nTable read' && c.jun29 === IND && c.oct26 === 'Wrap party'
             && same(jul.d6, ['Table read']) && !jul.all.some(function (l) { return /Camera Rolls/.test(l); })
             && same(jul.d3, [IND]) && count(jul.all, IND) === 1
             && same(oct.d26, [WRAP2, 'Wrap party'].sort()) && count(oct.all, WRAP2) === 1
             && back.jun29 === 'Camera Rolls 6/29/26\n' + IND + '\nTable read' && back.oct19 === 'Wrap party',
           { cells: c, jul: { d6: jul.d6, d3: jul.d3, ind: count(jul.all, IND) }, oct: { d26: oct.d26, wraps: count(oct.all, WRAP2) }, back: back });
    });

    await step('T4', async function () {
      await toMonth('October 2026');
      await commitMv(await openMv('2026-10-19', exactly('Wrap party')), 'Wrap party at the studio');
      await toMonth('June 2026');
      await commitMv(await openMv('2026-06-29', exactly('Table read')), 'Table read with the cast');
      var s = JSON.parse(await save());
      var u = s.userNotes || {}, m = lines('2026-06-29');
      await toMonth('October 2026');
      var oct = { d19: lines('2026-10-19'), d20: lines('2026-10-20') };
      await view('sheet');
      var c = { oct19: cellText('2026-10-19'), jun29: cellText('2026-06-29') };
      kase('T4', 'edited from the month view: the typed line is saved without the month-only wrap, and the other typed week keeps its waterfall-only line',
           same(u['2026-10-19'] && u['2026-10-19'].text, 'Wrap party at the studio') && c.oct19 === 'Wrap party at the studio'
             && same(oct.d20, [WRAP]) && same(oct.d19, ['Wrap party at the studio'])
             && c.jun29 === 'Camera Rolls 6/29/26\n' + IND + '\nTable read with the cast' && same(m, ['Table read with the cast']),
           { userNotes: { oct19: u['2026-10-19'], jun29: u['2026-06-29'] }, cells: c, oct: oct, jun29: m });
    });

    // ===== D1-D2: a delete hides the note from the view it was made in (R4(a)) =======================================
    await step('D1', async function () {
      await toMonth('October 2026');
      var pop = await openMv('2026-10-20', /Strikes/);
      var btn = q('.note-pop-delete', pop), label = txt(btn);
      btn.click();
      await settle();
      var s = JSON.parse(await save()), m = lines('2026-10-20');
      await view('sheet');
      kase('D1', 'Hide Auto-Note on the month-only wrap: shown nowhere now, so it is switched OFF (autoNotesOff), its split and its name with it',
           label === 'Hide Auto-Note' && same(m, []) && (s.autoNotesOff || {}).principalWrap === true && !('principalWrap' in (s.autoNotesView || {}))
             && !('principalWrap' in (s.autoNoteNames || {})) && cellText('2026-10-19') === 'Wrap party at the studio',
           { label: label, month: m, off: s.autoNotesOff, view: s.autoNotesView, names: s.autoNoteNames });
    });

    await step('D2', async function () {
      await view('sheet');
      var td = noteTd('2026-06-29');
      td.scrollIntoView({ block: 'center' }); await T.sleep(80);
      var r = td.getBoundingClientRect(), p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      var o = { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1, pointerType: 'mouse', pointerId: 1, isPrimary: true };
      var hit = document.elementFromPoint(p.x, p.y) || td;
      hit.dispatchEvent(new PointerEvent('pointerdown', o));
      o.buttons = 0; hit.dispatchEvent(new PointerEvent('pointerup', o)); hit.dispatchEvent(new MouseEvent('click', o));
      await T.sleep(250);
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
      await settle();
      var c = cellText('2026-06-29'), s = JSON.parse(await save());
      kase('D2', 'Delete on the waterfall cell of the waterfall-only start: switched OFF too (autoNotesOff, no split left), the holiday hidden from the waterfall only, and no week blank',
           c === '' && (s.autoNotesOff || {}).principalStart === true && !('autoNotesView' in s)
             && !Object.prototype.hasOwnProperty.call(s.userNotes || {}, '2026-06-29'),
           { cell: c, off: s.autoNotesOff, view: s.autoNotesView, userNote: (s.userNotes || {})['2026-06-29'] });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (V8\'s repair warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'autonoteview threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
