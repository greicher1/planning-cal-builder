// simpostname -- Simultaneous Post can be renamed (owner, 2 Nov 2026: "Allow me to be able to edit the name of
// Simultaneous Post"). A name box at the top of Sim Post's settings, like a hiatus's name box; what is typed there
// replaces "Simultaneous Post" in both views and every export, and the numbered weeks read "<name> wk N". A gate.sh
// AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh simpostname 400
//
// The calendar is the harness's reference calendar, T.buildFixture(), with Sim Post switched on (un-numbered).
// ⚠️ NOT colswap-simpost-refuse, the one fixture that already has Sim Post on: it holds a stored column swap, and on
// such a calendar update() draws the column-swap gate's CACHED schedule, whose key ignores Sim Post's offset and
// numbering (and a phase's typed name), so "Number these weeks" changes nothing there. That is a bug of its own,
// on main before this change (found 2 Nov 2026 while writing this leg); see HANDOFF. Fixed the same day, and held by
// leg colswapcache on that fixture.
//
// The name is typed with & < > and " in it on purpose: the month view's Sim Post bar is drawn by frozen
// renderMonthView, whose place() writes its label as raw HTML, so it is escaped there now (frozen edit S1, owner's
// picker "Approve the frozen edit", 2 Nov 2026). Unescaped, the bar's text and its title come out wrong.
//
//   D0  the box: inside Sim Post's settings, NO id, blank, placeholder "Simultaneous Post"; the cells read
//       "Simultaneous Post"; Save writes no simPostName
//   N1  typing a name renames every waterfall Sim Post cell, as one undo step
//   N2  the month view: every Sim Post bar's text AND title read the name exactly (S1), and the month map's bar too
//   N3  numbered ("Number these weeks"): the cells read "<name> wk 1", "wk 2", ...
//   F1  Save writes simPostName and nothing else new; fields.byId's key set is unchanged (no new id)
//   F2  Load a file WITHOUT the key after one with it: "Simultaneous Post" and a blank box (restore unconditionally);
//       Load the renamed one again: the name and the box come back
//   F3  a name that is not text is dropped on Load and the repair is reported; one with a control character and
//       runs of spaces is tidied, as the box would have kept it
//   X1  the workbook's Sim Post cells read the name
//   P1  the waterfall PDF draws the name
//   M1  the written month PDF draws the name
//   U1  undo takes the name back (the box with it); redo puts it back
//   C1  clearing the box, or typing the default in full, is the default: the key leaves the file
//   R1  New: the box is blank and the file carries no simPostName
//   E0  no console errors, apart from the warning F3's values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'simpostname', cases: [] };
  var NAME = 'Post & VFX "<A>"', DEF = 'Simultaneous Post';
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
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
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
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
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
  function box() { return q('#phase-rows .simpost-name'); }
  // Typed as a user types: the value, then the input event, then the box left (change).
  async function typeName(v) {
    var b = box(), d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    b.focus(); d.set.call(b, v); b.dispatchEvent(new Event('input', { bubbles: true }));
    b.dispatchEvent(new Event('change', { bubbles: true })); b.blur();
    await settle();
  }
  // The waterfall's Sim Post cells (isSimPostTd's own test: no class, the yellow fill first).
  function simCells() {
    return qa('#table-wrap table.sheet-table td').filter(function (td) {
      return !td.className && (td.getAttribute('style') || '').toUpperCase().indexOf('BACKGROUND:#FFFF00') === 0;
    }).map(function (td) { return td.textContent; });
  }
  function simBars() { return qa('#table-wrap .mv-pill:not([data-ph])'); }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- Save and Load through the real controls ----------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'simpostname.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'simpostname.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(snap) {
    var stem = 'simpostname-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: JSON.stringify(snap), writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  // Every Flate stream of a PDF, inflated, as one string. Cut at /Length (hiatuslabel.js says why), else trimmed.
  async function pdfText(u8) {
    var s = '', all = [];
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      var dictAt = s.lastIndexOf('<<', m.index), lm = s.slice(dictAt, m.index).match(/\/Length (\d+)/);
      if (lm) en = st + parseInt(lm[1], 10);
      else while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        all.push(await new Response(ds).text());
      } catch (e) { /* not a Flate stream */ }
    }
    return all.join('\n');
  }
  // A string as the PDF writers set it: a literal string with \ ( ) escaped.
  function pdfLit(t) { return '(' + t.replace(/[\\()]/g, function (c) { return '\\' + c; }) + ')'; }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return qa('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 200, 100);
    await settle();
    var sp = byId('simpost-enabled'); if (!sp.checked) sp.click();
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = await save();

    await step('D0', async function () {
      var b = box(), cells = uniq(simCells());
      kase('D0', 'the box sits in Sim Post\'s settings with no id, blank, placeholder "Simultaneous Post"; the cells read "Simultaneous Post"; the file has no simPostName',
           !!b && !!b.closest('.simpost-panel .simpost-body') && !b.id && b.value === '' && b.placeholder === DEF
             && same(cells, [DEF]) && !('simPostName' in S0),
           { box: !!b, boxId: b && b.id, value: b && b.value, placeholder: b && b.placeholder, cells: cells, key: 'simPostName' in S0 });
    });

    var undoBefore = byId('undo-btn').disabled;
    await step('N1', async function () {
      await typeName(NAME);
      var cells = simCells();
      kase('N1', 'typing a name renames every waterfall Sim Post cell, and Undo is on',
           cells.length > 0 && same(uniq(cells), [NAME]) && byId('undo-btn').disabled === false,
           { cells: uniq(cells), n: cells.length, undoBefore: undoBefore, undoAfter: byId('undo-btn').disabled });
    });

    await step('N2', async function () {
      await toMonth('July 2026');                           // Sim Post runs from 6/29/26 on the reference calendar
      var bars = simBars(), texts = uniq(bars.map(function (b) { return b.textContent; })), titles = uniq(bars.map(function (b) { return b.getAttribute('title'); }));
      var map = qa('[title]').map(function (e) { return e.getAttribute('title'); }).filter(function (t) { return t.indexOf(NAME + ', ') === 0; });
      kase('N2', 'the month view: every Sim Post bar\'s text and title read the name exactly (S1), and so does the month map',
           bars.length > 0 && same(texts, [NAME]) && same(titles, [NAME]) && map.length > 0,
           { bars: bars.length, texts: texts, titles: titles, map: map.slice(0, 2) });
      await view('sheet');
    });

    await step('N3', async function () {
      var cb = byId('simpost-count'); if (!cb.checked) cb.click();
      await settle();
      var cells = simCells();
      kase('N3', 'numbered: the cells read "<name> wk 1", "<name> wk 2", ...',
           cells.length > 1 && cells.every(function (c) { return /^Post & VFX "<A>" wk \d+(?![\s\S])/.test(c); }) && cells.indexOf(NAME + ' wk 1') !== -1,
           { cells: cells });
    });

    var S1 = null;
    await step('F1', async function () {
      S1 = await save();
      var added = Object.keys(S1).filter(function (k) { return !(k in S0); }).sort();
      var idsSame = same(Object.keys(S1.fields.byId).sort(), Object.keys(S0.fields.byId).sort());
      kase('F1', 'Save writes simPostName and nothing else new, and fields.byId\'s key set is unchanged',
           same(added, ['simPostName']) && S1.simPostName === NAME && idsSame,
           { added: added, simPostName: S1.simPostName, idsSame: idsSame });
    });

    await step('F2', async function () {
      var w0 = repairWarnings();
      var plainSnap = JSON.parse(JSON.stringify(S1)); delete plainSnap.simPostName;
      await load(plainSnap);
      var plain = { cells: uniq(simCells()), box: box().value };
      await load(S1);
      var back = { cells: uniq(simCells()), box: box().value };
      kase('F2', 'Load a file without the key after a renamed one: "Simultaneous Post" and a blank box; Load the renamed one: both back',
           plain.cells.length > 0 && plain.cells.every(function (c) { return c.indexOf(DEF + ' wk ') === 0; }) && plain.box === ''
             && back.cells.every(function (c) { return c.indexOf(NAME + ' wk ') === 0; }) && back.box === NAME && repairWarnings() === w0,
           { without: plain, renamed: back, warnings: repairWarnings() - w0 });
    });

    await step('F3', async function () {
      var w0 = repairWarnings();
      var bad = JSON.parse(JSON.stringify(S1)); bad.simPostName = 42;
      await load(bad);
      var a = { cells: uniq(simCells()), box: box().value, warned: repairWarnings() > w0 };
      var w1 = repairWarnings();
      var messy = JSON.parse(JSON.stringify(S1)); messy.simPostName = '  Sim\u0001   Post ';
      await load(messy);
      var b = { cells: uniq(simCells()), box: box().value, warned: repairWarnings() > w1 };
      kase('F3', 'a name that is not text is dropped (the default shows) and reported; a control character and runs of spaces are tidied to "Sim Post" and reported',
           a.cells.length > 0 && a.cells.every(function (c) { return c.indexOf(DEF + ' wk ') === 0; }) && a.box === '' && a.warned
             && b.cells.every(function (c) { return c.indexOf('Sim Post wk ') === 0; }) && b.box === 'Sim Post' && b.warned,
           { notText: a, messy: b });
      await load(S1);
    });

    await step('X1', async function () {
      await T.sleep(700);
      var blob = await T.captureExport('export-btn', 'the workbook');
      var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await blob.arrayBuffer());
      var found = [];
      wb.worksheets[0].eachRow({ includeEmpty: false }, function (row) {
        row.eachCell({ includeEmpty: false }, function (c) { if (typeof c.value === 'string' && /Post & VFX|Simultaneous Post/.test(c.value)) found.push(c.value); });
      });
      kase('X1', 'the workbook\'s Sim Post cells read the name',
           found.length > 0 && found.every(function (v) { return /^Post & VFX "<A>" wk \d+(?![\s\S])/.test(v); }), { found: uniq(found) });
    });

    await step('P1', async function () {
      var blob = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF');
      var all = await pdfText(new Uint8Array(await blob.arrayBuffer()));
      kase('P1', 'the waterfall PDF draws the name',
           all.indexOf(pdfLit(NAME + ' wk 1')) !== -1 && all.indexOf('(' + DEF) === -1,
           { name: all.indexOf(pdfLit(NAME + ' wk 1')) !== -1, oldName: all.indexOf('(' + DEF) !== -1 });
    });

    await step('M1', async function () {
      await view('month');
      T.monthPrintPath(false);
      var rec = T.fakeSavePicker();
      try {
        await T.sleep(700);
        byId('export-btn').click();
        await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
      } finally { rec.restore(); }
      var all = await pdfText(rec.files.filter(function (f) { return f.closed; })[0].bytes);
      kase('M1', 'the written month PDF draws the name',
           all.indexOf(pdfLit(NAME + ' wk 1')) !== -1 && all.indexOf('(' + DEF) === -1,
           { name: all.indexOf(pdfLit(NAME + ' wk 1')) !== -1, oldName: all.indexOf('(' + DEF) !== -1 });
      await view('sheet');
    });

    await step('U1', async function () {
      await typeName('Sim Post');
      var typed = { cells: uniq(simCells()), box: box().value };
      await undo();
      var undone = { cells: uniq(simCells()), box: box().value };
      await redo();
      var redone = { cells: uniq(simCells()), box: box().value };
      kase('U1', 'undo takes the name back, the box with it; redo puts it back',
           typed.box === 'Sim Post' && typed.cells.every(function (c) { return c.indexOf('Sim Post wk ') === 0; })
             && undone.box === NAME && undone.cells.every(function (c) { return c.indexOf(NAME + ' wk ') === 0; })
             && redone.box === 'Sim Post' && redone.cells.every(function (c) { return c.indexOf('Sim Post wk ') === 0; }),
           { typed: typed, undone: undone, redone: redone });
    });

    await step('C1', async function () {
      await typeName('');
      var cleared = { cells: uniq(simCells()), key: 'simPostName' in (await save()) };
      await typeName(DEF);
      var full = { cells: uniq(simCells()), box: box().value, key: 'simPostName' in (await save()) };
      kase('C1', 'clearing the box, or typing "Simultaneous Post" in full, is the default: the key leaves the file (and the box shows blank)',
           cleared.cells.every(function (c) { return c.indexOf(DEF + ' wk ') === 0; }) && !cleared.key
             && full.cells.every(function (c) { return c.indexOf(DEF + ' wk ') === 0; }) && full.box === '' && !full.key,
           { cleared: cleared, typedDefault: full });
    });

    await step('R1', async function () {
      await typeName('Concurrent Post');
      byId('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Start new')) break; }
      await settle();
      var b = box().value, s = await save();
      kase('R1', 'New: the box is blank and the file carries no simPostName', b === '' && !('simPostName' in s), { box: b, key: 'simPostName' in s });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (F3\'s repair warnings aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'simpostname threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
