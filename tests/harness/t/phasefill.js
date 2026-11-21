// phasefill -- a phase fills its free space: the double-click stores the WISH on the phase, not a width on a cell
// (FILL-INTENT-PLAN.md; owner, 6 Nov 2026: "so theres no way to automate the fix in the background?" -> "Yes, build it").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=fill-intent ./run.sh phasefill 400
//
// fill-intent.sptcal (tools/layout-study/fixtures.mjs; stamped, no Sim Post): Writers 14 wks alone, Pre-Prep 6 wks with
// Production arriving in its sixth week, Post after -- under rule 13 Pre-Prep is one wide for all six weeks.
//   F1  the automatic layout, Pre-Prep one wide for six weeks
//   F2  double-click: two wide for five weeks, one beside Production; the file carries phaseFill: {prePrep: true}, no
//       per-cell width, no new field id
//   F3  Production two weeks earlier: Pre-Prep narrows there on its own, nothing to reset
//   F4  undo; a double-click on a WIDE cell -> the phase keeps to its column ({prePrep: false}); undo; the edge handle's
//       double-click -> automatic again (the key gone); undo: one step each
//   F5  an UNSTAMPED calendar (anchorside.sptcal through the picker): the double-click keeps its per-cell meaning
//   F6  Load a file carrying the key: applied; New: cleared
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. Red on the build before it at F2.
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
  // Each distinct [pos+width] a phase draws over its rows in a year, with the row it first does.
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
  function cellOf(key, week) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + week + '"]'); }
  function dbl(td) { td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); }
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  // Save through a stood-in handle and read the file back (phiatusnum's pattern).
  var written = [];
  var saveHandle = { name: 'phasefill.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phasefill.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  var loads = 0;
  async function load(url, text) {
    var stem = 'phasefill-load-' + (++loads), name = stem + '.sptcal';
    // `writes: written`: after a Load the file's OWN handle takes the Save, and it records into the same array.
    var p = T.openViaFakePicker(url, name, text ? { text: text, writes: written } : { writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.sleep(400);
    // A file saved in the month view opens there (anchorside.sptcal does): the leg reads the waterfall.
    if (!document.querySelector('#table-wrap table.sheet-table')) { $('view-sheet-btn').click(); await T.sleep(400); }
    try { await settle(); } catch (e) {
      var sig = function () { return [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join(''); };
      var a = sig(); await T.sleep(300); var b = sig();
      out.settleDbg = { cells: document.querySelectorAll('#table-wrap td.sheet-phase-cell').length, same: a === b, a: a.slice(0, 200), b: b.slice(0, 200), strip: !!(document.getElementById('layout-notice') || {hidden: true}).hidden === false, err: (window.__ERR || []).slice(0, 3) };
      throw e;
    }
  }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    var S = function () { return shape('prePrep', 2031); };
    C('F1', 'the automatic layout: Pre-Prep one wide for all six weeks (Production takes the column beside it in the sixth, rule 13)', J(S()) === J(['4/14/31:0+1']), J(S()));
    dbl(cellOf('prePrep', '2031-04-14')); await settle();
    C('F2a', 'double-click: Pre-Prep fills the empty column for five weeks and is one wide beside Production in the sixth', J(S()) === J(['4/14/31:0+2', '5/19/31:0+1']), J(S()));
    var s1 = await save();
    C('F2b', 'the file carries phaseFill: {prePrep: true}, no per-cell width, and no new field id',
      J(s1.phaseFill) === J({ prePrep: true }) && !Object.keys(s1.cellSpans || {}).length && !Object.keys(s1.fields.byId).some(function (k) { return /fill/i.test(k); }),
      J({ phaseFill: s1.phaseFill, cellSpans: s1.cellSpans }));
    T.set('start-production', '2031-05-05'); await settle();
    C('F3', 'Production two weeks earlier: Pre-Prep is two wide for three weeks and one wide beside Production for three, on its own', J(S()) === J(['4/14/31:0+2', '5/5/31:0+1']), J(S()));
    $('undo-btn').click(); await settle();
    C('F4a', 'undo puts Production back: two wide for five weeks again', J(S()) === J(['4/14/31:0+2', '5/19/31:0+1']), J(S()));
    dbl(cellOf('prePrep', '2031-04-21')); await settle();
    var s2 = await save();
    C('F4b', 'double-click a WIDE cell: the phase keeps to its column -- one wide for six weeks, the file says phaseFill: {prePrep: false}', J(S()) === J(['4/14/31:0+1']) && J(s2.phaseFill) === J({ prePrep: false }), J({ shape: S(), key: s2.phaseFill }));
    $('undo-btn').click(); await settle();
    C('F4c', 'undo: filling again, one step', J(S()) === J(['4/14/31:0+2', '5/19/31:0+1']), J(S()));
    var hs = document.querySelector('#table-wrap .grid-resize.is-span[data-pkey="prePrep"]');
    if (hs) { dbl(hs); await settle(); }
    var s2b = await save();
    C('F4d', 'double-click the cell\'s edge handle: the layout decides again -- the key is gone, Pre-Prep back to one wide', !!hs && !('phaseFill' in s2b) && J(S()) === J(['4/14/31:0+1']), J({ handle: !!hs, key: s2b.phaseFill, shape: S() }));
    $('undo-btn').click(); await settle();
    C('F4e', 'undo: filling again', J(S()) === J(['4/14/31:0+2', '5/19/31:0+1']), J(S()));
    // F5: an unstamped calendar keeps the per-cell double-click.
    await load('/tests/fixtures/anchorside.sptcal');
    var tds = [].slice.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="prePrep"]'));
    var roomy = tds.filter(function (td) { return (+td.dataset.rmax - +td.dataset.own) > 0 || (+td.dataset.own - +td.dataset.lmin) > 0; });
    var pick = roomy[0] || tds[0];
    var before = pick ? pick.colSpan : 0;
    if (pick) { dbl(pick); await settle(); }
    var s3 = await save();
    var after = pick ? (cellOf('prePrep', pick.dataset.week) || {}).colSpan : 0;
    C('F5', 'unstamped (anchorside.sptcal): the double-click writes a per-cell width (' + (roomy.length ? 'the cell widened' : 'no room, nothing to do') + ') and no phaseFill key',
      !('phaseFill' in s3) && !s3.colReuse && (roomy.length ? (Object.keys(s3.cellSpans || {}).length === 1 && after > before) : true),
      J({ phaseFill: s3.phaseFill, cellSpans: s3.cellSpans, before: before, after: after, stamped: !!s3.colReuse }));
    // F6: a file carrying the key loads with it; New clears it.
    await load('/x.sptcal', JSON.stringify(s1));
    C('F6a', 'Load a file with phaseFill: Pre-Prep fills its free space again', J(S()) === J(['4/14/31:0+2', '5/19/31:0+1']), J(S()));
    $('new-file-btn').click();
    for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Start new')) break; }
    await T.sleep(900);   // a new calendar has no phase cells: nothing to settle on
    var s4 = await save();
    C('F6b', 'New: the key is cleared', !('phaseFill' in s4), J(s4.phaseFill));
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
