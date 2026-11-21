// colsreset -- Reset Columns: every column back on the automatic layout in one step (owner, 6 Nov 2026: "will there
// be a way to reset back to default algorithm?" -> "Add it"; FILL-INTENT-PLAN.md §6).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=fill-intent ./run.sh colsreset 300
//
// Loads fill-intent.sptcal with one of every column choice added (a fill wish, a dragged cell width, dragged column
// widths in both layouts, a per-week swap, a block swap, a phase moved by hand, and since 6 Nov 2026 a moved phase's kept
// column, colKeep, STICKY-COLUMNS-PLAN.md) plus a note and a row height, then:
//   R1  the button shows in the Waterfall, live (not greyed), labelled Reset Columns
//   R2  one click: every column store is empty in the saved file; the note, the row height and the stamp are kept
//   R3  Pre-Prep is back on the automatic layout (one wide for six weeks, as phasefill's F1)
//   R4  the button greys, and its tooltip says every column is automatic
//   R5  a click while grey adds no step: ONE undo brings every choice back
//   R6  the Month view hides it; the Waterfall shows it again
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. Red on the build before it at R1 (no button).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var txt = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); };
  var J = function (x) { return JSON.stringify(x); };
  function $(id) { return document.getElementById(id); }
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
  }
  // phasefill's shape(): each distinct [pos+width] a phase draws over its rows in a year, with the row it first does.
  function shape(key, year) {
    var o = [], last = '';
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var pos = 0, date = null;
      [].forEach.call(tr.children, function (td) {
        var cls = td.classList;
        if (cls.contains('sheet-date')) { pos = 0; date = txt(td); return; }
        if (cls.contains('sheet-empty')) { date = null; return; }
        if (!date) return;
        if (cls.contains('sheet-note-cell')) { date = null; return; }
        var span = td.colSpan || 1;
        if (td.dataset.pkey === key) { var m = date.match(/(\d+)\/(\d+)\/(\d+)/); var y = m ? 2000 + +m[3] : 0; if (y === year) { var s = pos + '+' + span; if (s !== last) { o.push(date + ':' + s); last = s; } } }
        pos += span;
      });
    });
    return o;
  }
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  var written = [];
  async function save() {
    var n = written.length;
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  async function load(text) {
    var name = 'colsreset-load.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf('colsreset-load') !== -1) break; }
    await p;
    await T.sleep(400);
    if (!document.querySelector('#table-wrap table.sheet-table')) { $('view-sheet-btn').click(); await T.sleep(400); }
    await settle();
  }
  function btn() { return $('tb-cols-reset-btn'); }
  function shown() { var b = btn(); return !!b && getComputedStyle(b).display !== 'none'; }
  function grey() { var b = btn(); return !!b && b.hasAttribute('data-disabled'); }
  var COLS = ['phaseFill', 'cellSpans', 'colWidths', 'colWidthsAlt', 'gridColSwaps', 'gridStintSwaps', 'colFollow', 'colKeep'];
  function colStores(s) { var o = {}; COLS.forEach(function (k) { if (s[k] && Object.keys(s[k]).length) o[k] = Object.keys(s[k]).length; }); return o; }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    var base = JSON.parse(await (await fetch('/tests/fixtures/fill-intent.sptcal')).text());
    base.phaseFill = { prePrep: true };
    base.cellSpans = { '2031-05-19|production': { l: 0, r: 0 } };
    base.colWidths = { notes: 30, 'y2031:s0': 20 };
    base.colWidthsAlt = { 'y2031:s1': 15 };
    base.gridColSwaps = { '2031-05-19|prePrep': { with: 'production' }, '2031-05-19|production': { with: 'prePrep' } };
    base.gridStintSwaps = { '2031|prePrep': { with: 'production' }, '2031|production': { with: 'prePrep' } };
    base.colFollow = { post: 'writersRoom' };
    base.colKeep = { production: 'writersRoom' };   // sticky columns (ruling K4: Reset Columns clears every kept column)
    base.userNotes = Object.assign({}, base.userNotes || {}, { '2031-04-14': { text: 'Table read' } });
    base.rowHeightsByWeek = Object.assign({}, base.rowHeightsByWeek || {}, { '2031-04-21': 40 });
    await load(JSON.stringify(base));
    var s0 = await save();
    C('R0', 'the loaded file holds one of every column choice (the leg\'s premise)', Object.keys(colStores(s0)).length === COLS.length, J(colStores(s0)));
    C('R1', 'the button shows in the Waterfall, live, labelled Reset Columns', shown() && !grey() && txt(btn()) === 'Reset Columns', J({ shown: shown(), grey: grey(), label: btn() ? txt(btn()) : null }));
    btn().click(); await settle();
    var s1 = await save();
    C('R2', 'one click: no column choice left in the file; the note, the row height and the layout stamp are kept',
      !Object.keys(colStores(s1)).length && s1.userNotes && s1.userNotes['2031-04-14'] && s1.userNotes['2031-04-14'].text === 'Table read'
        && s1.rowHeightsByWeek && s1.rowHeightsByWeek['2031-04-21'] === 40 && s1.colReuse === true,
      J({ cols: colStores(s1), note: s1.userNotes && s1.userNotes['2031-04-14'], row: s1.rowHeightsByWeek && s1.rowHeightsByWeek['2031-04-21'], stamp: s1.colReuse }));
    C('R3', 'Pre-Prep is back on the automatic layout: one wide for all six weeks', J(shape('prePrep', 2031)) === J(['4/14/31:0+1']), J(shape('prePrep', 2031)));
    await T.sleep(200);
    C('R4', 'the button greys, and says every column is automatic', grey() && /already on the automatic layout/.test(btn().title || ''), J({ grey: grey(), title: btn().title }));
    btn().click(); await T.sleep(300);
    $('undo-btn').click(); await settle();
    var s2 = await save();
    C('R5', 'a click while grey adds no step: one undo brings every choice back', J(colStores(s2)) === J(colStores(s0)), J(colStores(s2)), J(colStores(s0)));
    $('view-month-btn').click(); await T.sleep(800);
    var inMonth = shown();
    $('view-sheet-btn').click(); await settle();
    C('R6', 'the Month view hides it; the Waterfall shows it again', !inMonth && shown(), J({ month: inMonth, waterfall: shown() }));
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
