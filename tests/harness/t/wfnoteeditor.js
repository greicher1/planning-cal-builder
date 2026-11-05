// wfnoteeditor -- the waterfall's note editor says what a line is, and hides it (owner, 30 Oct + 4 Nov 2026:
// "why does this still show as Note in the waterfall", "Should there be an equivalent hide auto note button in the
// waterfall view?"; WATERFALL-NOTE-EDITOR-PLAN.md, rulings R1(a) R2(b) R3(a), defaults D1-D10). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=autonoterename ./run.sh wfnoteeditor 500
//
// tests/fixtures/autonoterename.sptcal (synthetic, US Area Standards): the 6/29/26 week holds "Start Principal
// Photography" AND "Independence Day (Observed)" (shown in both views); 9/7/26 holds Labor Day alone (ticked for the
// waterfall); 10/19/26 the wrap alone; 11/2/26 a TYPED note carrying "Post Begins 11/2/26" word for word plus "Post
// kickoff 11/3/26"; 8/3/26 nothing.
//
//   E1  each cell's heading, button / list, hint, and whether the Day picker and "Show in month view" show
//   E2  no id on any control in the editor, and opening then Esc saves nothing
//   E3  typing a line into a cell of automatic lines brings the Day picker and the switch; taking it out hides them
//   H1  Hide Auto-Note on the wrap: the editor closes, the cell empties, the month view keeps it, saved as
//       autoNotesView {principalWrap: {sheet: false}}; ONE undo puts it all back
//   H2  Hide Holiday on Labor Day: the cell empties, the month view keeps it, holidayView sheet false; one undo
//   H3  the list's Hide on Independence Day in the 6/29 cell: only the start is left; the month view keeps the holiday
//   H4  a line typed before Hide is saved with it; one undo takes both back
//   H5  Hide on a note the month view already hides switches it off (autoNotesOff, no split left)
//   R1  a holiday renamed AND a line added in one save: both stick (D2)
//   R2  an automatic note renamed AND a line added in one save: both stick
//   R3  a line taken out and another typed in one save: the taken-out holiday is hidden from the waterfall
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'wfnoteeditor', cases: [] };
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
  function lines(day) { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]').map(txt); }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellText(wk) {
    var t = noteTd(wk); if (!t) return null;
    var x = ((t.querySelector('.cell-body') || t).innerText || '').replace(/\s*\n\s*/g, '\n').trim();
    return x === '+' ? '' : x;                           // an empty Notes cell shows its "+"
  }
  async function undo() { byId('undo-btn').click(); await settle(); }

  // ---- the waterfall's note editor ----
  function pop() { return q('.note-pop'); }
  function shown(el) { return !!el && getComputedStyle(el).display !== 'none'; }
  async function openEditor(wk) {
    if (!q('#table-wrap table.sheet-table')) await view('sheet');
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(noteTd(wk));
    await T.until(function () { return !!pop(); }, 'the note editor on ' + wk, 40, 50);
    return pop();
  }
  function editorFacts(p) {
    return {
      title: txt(q('.note-pop-title', p)),
      button: txt(q('.note-pop-delete', p)),
      rows: qa('.wf-note-item', p).map(function (r) { return (q('.wf-note-mark-auto', r) ? 'auto ' : q('.wf-note-mark-holiday', r) ? 'holiday ' : '? ') + txt(q('.wf-note-item-name', r)); }),
      day: shown(q('.note-day-row', p)), sw: shown(q('.note-view-row', p)),
      hint: txt(q('.note-pop-hint', p))
    };
  }
  function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  async function closeEditor() { esc(); await T.until(function () { return !pop(); }, 'the editor to close', 40, 50); await T.sleep(100); }
  function setBox(p, text) { var ta = q('textarea', p); ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  async function saveBox(p) {
    q('textarea', p).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }
  // A Hide, clicked where it is drawn (hit-tested).
  async function clickHide(btn) {
    btn.scrollIntoView({ block: 'nearest' }); await T.sleep(80);
    var r = btn.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== btn) throw new Error('the Hide button is not on top (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    hit.click();
    await settle();
  }

  // ---- Save and Load through the real controls ----
  var written = [];
  var saveHandle = { name: 'wfnoteeditor.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'wfnoteeditor.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];                 // after a Load, the fake picker records {file, text}
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(snap) {
    var stem = 'wfnoteeditor-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: JSON.stringify(snap), writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
    await view('sheet');
  }
  function un(s, wk) { return !!(s.userNotes && Object.prototype.hasOwnProperty.call(s.userNotes, wk)); }

  var START = 'Start Principal Photography 6/29/26', IND = 'Independence Day (Observed) 7/3/26';
  var WRAP = 'Principal Photography Wraps 10/20/26', LABOR = 'Labor Day 9/7/26';
  var INDID = 'independence-day-observed@2026', LABORID = 'labor-day@2026';

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!q('#table-wrap table.sheet-table') || !!q('#table-wrap .mv-daygrid'); }, 'the fixture', 200, 100);
    await settle();
    await view('sheet');
    var S0 = await save();

    await step('E1', async function () {
      var f = {};
      f.wrap = editorFacts(await openEditor('2026-10-19')); await closeEditor();
      f.labor = editorFacts(await openEditor('2026-09-07')); await closeEditor();
      f.mix = editorFacts(await openEditor('2026-06-29')); await closeEditor();
      f.typed = editorFacts(await openEditor('2026-11-02')); await closeEditor();
      f.empty = editorFacts(await openEditor('2026-08-03')); await closeEditor();
      kase('E1', 'the headings name a cell holding one automatic note ("Auto Note · 10/20/26", Hide Auto-Note) or one holiday ("Holiday · 9/7/26", Hide Holiday); a mixed cell lists both with their marks; the Day picker and the switch show only where a typed line is (or the cell is empty)',
           same(f.wrap, { title: 'Auto Note · 10/20/26', button: 'Hide Auto-Note', rows: [], day: false, sw: false, hint: 'Renames it wherever it shows · Its date follows the schedule · Tab or Ctrl/Cmd‑Enter to save · Esc to cancel' })
             && same(f.labor, { title: 'Holiday · 9/7/26', button: 'Hide Holiday', rows: [], day: false, sw: false, hint: 'Renames this holiday wherever it shows · Tab or Ctrl/Cmd‑Enter to save · Esc to cancel' })
             && same(f.mix, { title: 'Note · 6/29/26', button: '', rows: ['auto Start Principal Photography', 'holiday Independence Day (Observed)'], day: false, sw: false, hint: 'Tab or Ctrl/Cmd‑Enter to save · Esc to cancel' })
             && same(f.typed, { title: 'Note · 11/2/26', button: '', rows: ['auto Post Begins'], day: true, sw: true, hint: 'Tab or Ctrl/Cmd‑Enter to save · Esc to cancel' })
             && same(f.empty, { title: 'Note · 8/3/26', button: '', rows: [], day: true, sw: true, hint: 'Tab or Ctrl/Cmd‑Enter to save · Esc to cancel' }),
           f);
    });

    await step('E2', async function () {
      var p = await openEditor('2026-06-29');
      var ids = qa('[id]', p).map(function (e) { return e.id; });
      await closeEditor();
      var s = await save();
      kase('E2', 'no id on any control in the editor, and opening it then Esc saves nothing',
           ids.length === 0 && same(s, S0), { ids: ids, identical: same(s, S0) });
    });

    await step('E3', async function () {
      var p = await openEditor('2026-06-29');
      setBox(p, START + '\n' + IND + '\nTable read');
      var typed = { day: shown(q('.note-day-row', p)), sw: shown(q('.note-view-row', p)) };
      setBox(p, START + '\n' + IND);
      var back = { day: shown(q('.note-day-row', p)), sw: shown(q('.note-view-row', p)) };
      await closeEditor();
      kase('E3', 'a typed line in the box brings the Day picker and the switch; taking it out hides them again',
           same(typed, { day: true, sw: true }) && same(back, { day: false, sw: false }), { typed: typed, back: back });
    });

    await step('H1', async function () {
      var p = await openEditor('2026-10-19');
      await clickHide(q('.note-pop-delete', p));
      var closed = !pop(), c = cellText('2026-10-19'), s = await save();
      await toMonth('October 2026');
      var m = lines('2026-10-20');
      await view('sheet');
      await undo();
      var back = cellText('2026-10-19'), s2 = await save();
      kase('H1', 'Hide Auto-Note on the wrap: the editor closes, the cell empties, the month view keeps it, saved as autoNotesView {principalWrap: {sheet: false}}; ONE undo puts it all back',
           closed && c === '' && same(m, [WRAP]) && same(s.autoNotesView, { principalWrap: { sheet: false } }) && !(s.autoNotesOff || {}).principalWrap
             && back === WRAP && same(s2, S0),
           { closed: closed, cell: c, month: m, view: s.autoNotesView, back: back, undoneIdentical: same(s2, S0) });
    });

    await step('H2', async function () {
      var p = await openEditor('2026-09-07');
      await clickHide(q('.note-pop-delete', p));
      var c = cellText('2026-09-07'), s = await save();
      await toMonth('September 2026');
      var m = lines('2026-09-07');
      await view('sheet');
      await undo();
      var back = cellText('2026-09-07'), s2 = await save();
      kase('H2', 'Hide Holiday on Labor Day: the cell empties, the month view keeps it (still a day off), holidayView sheet false; one undo puts it back',
           c === '' && same(m, [LABOR]) && s.holidayView[LABORID] && s.holidayView[LABORID].sheet === false && s.holidayView[LABORID].month === true
             && !Object.keys(s.holidayOff || {}).length && back === LABOR && same(s2, S0),
           { cell: c, month: m, holiday: s.holidayView[LABORID], back: back, undoneIdentical: same(s2, S0) });
    });

    await step('H3', async function () {
      var p = await openEditor('2026-06-29');
      var btn = qa('.wf-note-item', p).filter(function (r) { return /Independence/.test(txt(r)); })[0];
      await clickHide(q('.wf-note-hide', btn));
      var c = cellText('2026-06-29'), s = await save();
      await toMonth('July 2026');
      var m = { jun29: lines('2026-06-29'), jul3: lines('2026-07-03') };
      await view('sheet');
      await undo();
      var back = cellText('2026-06-29'), s2 = await save();
      kase('H3', 'the list\'s Hide on Independence Day in the 6/29 cell: only the start is left there, the month view keeps both, the start untouched; one undo puts it back',
           c === START && s.holidayView[INDID].sheet === false && !('autoNotesView' in s) && !un(s, '2026-06-29')
             && same(m.jun29, [START]) && same(m.jul3, [IND]) && back === START + '\n' + IND && same(s2, S0),
           { cell: c, holiday: s.holidayView[INDID], view: s.autoNotesView, month: m, back: back, undoneIdentical: same(s2, S0) });
    });

    await step('H4', async function () {
      var p = await openEditor('2026-06-29');
      setBox(p, START + '\n' + IND + '\nTable read');
      var row = qa('.wf-note-item', p).filter(function (r) { return /Start Principal/.test(txt(r)); })[0];
      await clickHide(q('.wf-note-hide', row));
      var c = cellText('2026-06-29'), s = await save();
      await undo();
      var back = cellText('2026-06-29'), s2 = await save();
      kase('H4', 'a line typed before Hide is saved with it: the start hidden from the waterfall, the cell the holiday and "Table read"; ONE undo takes both back',
           c === IND + '\nTable read' && same(s.autoNotesView, { principalStart: { sheet: false } }) && s.userNotes['2026-06-29'].text === IND + '\nTable read'
             && back === START + '\n' + IND && same(s2, S0),
           { cell: c, view: s.autoNotesView, userNote: s.userNotes['2026-06-29'], back: back, undoneIdentical: same(s2, S0) });
    });

    await step('H5', async function () {
      var F = JSON.parse(JSON.stringify(S0)); F.autoNotesView = { principalWrap: { month: false } };
      await load(F);
      var p = await openEditor('2026-10-19');
      var title = q('.note-pop-delete', p).title;
      await clickHide(q('.note-pop-delete', p));
      var s = await save();
      kase('H5', 'Hide on a note the month view already hides switches it off (autoNotesOff, no split left), and its button says so',
           (s.autoNotesOff || {}).principalWrap === true && !('autoNotesView' in s) && cellText('2026-10-19') === '' && /switched off/.test(title),
           { off: s.autoNotesOff, view: s.autoNotesView, title: title });
      await load(S0);
    });

    await step('R1', async function () {
      var p = await openEditor('2026-09-07');
      setBox(p, 'Labour Day 9/7/26\nCrew BBQ');
      await saveBox(p);
      var c = cellText('2026-09-07'), s = await save();
      await toMonth('September 2026');
      var m = lines('2026-09-07');
      await view('sheet');
      kase('R1', 'a holiday renamed AND a line added in one save: both stick (the holiday renamed everywhere, the line typed)',
           c === 'Labour Day 9/7/26\nCrew BBQ' && (s.holidayNames || {})[LABORID] === 'Labour Day' && m.indexOf('Labour Day 9/7/26') !== -1,
           { cell: c, names: s.holidayNames, month: m });
      await load(S0);
    });

    await step('R2', async function () {
      var p = await openEditor('2026-10-19');
      setBox(p, 'Camera Wraps 10/20/26\nWrap party');
      await saveBox(p);
      var c = cellText('2026-10-19'), s = await save();
      kase('R2', 'an automatic note renamed AND a line added in one save: both stick',
           c === 'Camera Wraps 10/20/26\nWrap party' && (s.autoNoteNames || {}).principalWrap === 'Camera Wraps',
           { cell: c, names: s.autoNoteNames });
      await load(S0);
    });

    await step('R3', async function () {
      var p = await openEditor('2026-06-29');
      // The new line goes ABOVE the start, not in the holiday's place: typed in its place, it would be typing over the
      // holiday's line, which renames it (rename ruling 3; D2 pairs a line that left with the line that came in its place).
      setBox(p, 'Table read\n' + START);
      await saveBox(p);
      var c = cellText('2026-06-29'), s = await save();
      kase('R3', 'a line taken out and another typed elsewhere in one save: the taken-out holiday is hidden from the waterfall (it used to come back after a move); not renamed',
           c === 'Table read\n' + START && s.holidayView[INDID].sheet === false && !((s.holidayNames || {})[INDID]),
           { cell: c, holiday: s.holidayView[INDID], names: s.holidayNames });
      await load(S0);
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'wfnoteeditor threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
