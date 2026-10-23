// phiatusnum -- a phase's own hiatus, "Number weeks" (owner ruling 8, 20 Oct 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phiatusnum 300
//
// Ticked, the band reads "<hiatus name> wk 1", "wk 2", ... in the waterfall, Excel, both PDFs and the month view.
// The engine writes those labels through syncHiatusNamesFromSidebar() into hiatusTexts, the channel the sidebar
// Name already uses, because frozen renderMonthView builds its own band label and reads only hiatusTexts over it.
// The box carries no id (gate 5's fields.byId set must not move); its store is the snapshot's
// `phaseHiatusNumbered`, written only while something is ticked.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays):
//   prePrep   Pre Prep   Mon 3/1/27 x 6 weeks, its own hiatus Mon 3/15/27 x 3   -> the numbered one
//   custom1   Set Build  Mon 3/1/27 x 4 weeks, its own hiatus Mon 3/8/27 x 2    -> the control, until H10
//   production           Mon 5/3/27, 4 episodes x 5 days
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phiatusnum', cases: [] };
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
  var PP = ['2027-03-15', '2027-03-22', '2027-03-29'], SB = ['2027-03-08', '2027-03-15'];
  var NUM = ['Pre Prep Hiatus wk 1', 'Pre Prep Hiatus wk 2', 'Pre Prep Hiatus wk 3'];
  var BARE = ['Pre Prep Hiatus', 'Pre Prep Hiatus', 'Pre Prep Hiatus'];
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
  // The waterfall's band text per week Monday, for one phase.
  function bands(key, weeks) {
    return weeks.map(function (w) {
      var td = document.querySelector('#table-wrap td.sheet-hiatus-cell[data-pkey="' + key + '"][data-week="' + w + '"]');
      return td ? txt(td) : null;
    });
  }
  function box(key) { var f = $('phiatus-fields-' + key); return f ? f.querySelector('.phiatus-wknum-cb') : null; }
  // ⛔ HIT-TESTED: the element on top at the box's centre must be the box, and THAT element gets the click.
  async function clickBox(key) {
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
    await T.sleep(150);
    var b = box(key);
    if (!b) throw new Error('no Number weeks box under ' + key + '\'s hiatus');
    b.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== b) throw new Error('the box is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await settle();
  }
  // Every "(text) Tj" run in a PDF's Flate streams: both writers set a line of text as one literal string.
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
  function count(list, s) { return list.filter(function (x) { return x === s; }).length; }
  var written = [];
  var saveHandle = { name: 'phiatusnum.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phiatusnum.sptcal', { lastModified: 1 }); },
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
    var stem = 'phiatusnum-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function idSet(snapText) { return Object.keys(JSON.parse(snapText).fields.byId).sort(); }

  try {
    await T.appReady();
    T.set('show-title', 'Hiatus Number Test'); T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-prePrep', '2027-03-01'); T.set('weeks-prePrep', '6');
    T.set('start-production', '2027-05-03');
    $('add-phase-btn').click();
    await T.sleep(200);
    T.set('name-custom1', 'Set Build'); T.set('start-custom1', '2027-03-01'); T.set('weeks-custom1', '4');
    ['prePrep', 'custom1'].forEach(function (k) {
      var en = $('phiatus-en-' + k); en.checked = true; en.dispatchEvent(new Event('change', { bubbles: true }));
    });
    T.set('phiatus-start-prePrep', '2027-03-15'); T.set('phiatus-weeks-prePrep', '3');
    T.set('phiatus-start-custom1', '2027-03-08'); T.set('phiatus-weeks-custom1', '2');
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();   // sidebarTab is saved state
    await settle();
    var saveA = await save();                          // the calendar before any box is ticked

    await step('H0', async function () {
      var s = JSON.parse(saveA);
      kase('H0', 'control: unticked, every band reads "<phase> Hiatus" and the file has no phaseHiatusNumbered key',
           same(bands('prePrep', PP), BARE) && same(bands('custom1', SB), ['Set Build Hiatus', 'Set Build Hiatus']) &&
           !('phaseHiatusNumbered' in s), { pp: bands('prePrep', PP), sb: bands('custom1', SB), key: 'phaseHiatusNumbered' in s });
    });

    await step('H1', async function () {
      var b = box('prePrep'), lab = b && b.closest('label');
      var ids = Array.from(($('phiatus-fields-prePrep') || document.createElement('i')).querySelectorAll('.phiatus-wknum, .phiatus-wknum *'))
                     .filter(function (e) { return e.id; }).map(function (e) { return e.id; });
      kase('H1', 'the box: under the hiatus\'s Start date / Weeks, "Number weeks", unticked, no id on it or its label; one under each phase\'s hiatus',
           !!b && b.type === 'checkbox' && !b.checked && !b.id && txt(lab) === 'Number weeks' && ids.length === 0 &&
           document.querySelectorAll('.phiatus-wknum-cb').length === document.querySelectorAll('.phiatus-en').length,
           { found: !!b, label: txt(lab), ids: ids, boxes: document.querySelectorAll('.phiatus-wknum-cb').length, toggles: document.querySelectorAll('.phiatus-en').length });
    });

    await step('H2', async function () {
      await clickBox('prePrep');
      kase('H2', 'ticked (a hit-tested click): the waterfall reads Pre Prep Hiatus wk 1, wk 2, wk 3; Set Build\'s band is untouched',
           box('prePrep').checked && same(bands('prePrep', PP), NUM) && same(bands('custom1', SB), ['Set Build Hiatus', 'Set Build Hiatus']),
           { pp: bands('prePrep', PP), sb: bands('custom1', SB) });
    });

    await step('H3', async function () {
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var cells = [];
      wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) {
        if (c.isMerged && c.master && c.master.address !== c.address) return;
        var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
        if (typeof v === 'string' && /Hiatus/.test(v)) cells.push(v.trim());
      }); }); });
      kase('H3', 'Excel: one cell each for Pre Prep Hiatus wk 1-3, no bare "Pre Prep Hiatus", Set Build\'s two bare',
           count(cells, NUM[0]) === 1 && count(cells, NUM[1]) === 1 && count(cells, NUM[2]) === 1 &&
           count(cells, 'Pre Prep Hiatus') === 0 && count(cells, 'Set Build Hiatus') === 2, { cells: cells });
    });

    await step('H4', async function () {
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var runs = (await pdfRuns(new Uint8Array(await pb.arrayBuffer()))).filter(function (r) { return /Hiatus/.test(r); });
      kase('H4', 'the waterfall PDF: one text run each for Pre Prep Hiatus wk 1-3, none bare',
           count(runs, NUM[0]) === 1 && count(runs, NUM[1]) === 1 && count(runs, NUM[2]) === 1 &&
           count(runs, 'Pre Prep Hiatus') === 0 && count(runs, 'Set Build Hiatus') === 2, { runs: runs });
    });

    await step('H5', async function () {
      await toMonth('March 2027');
      var mv = Array.from(document.querySelectorAll('#table-wrap .mv-hiatus-bar')).map(txt).filter(function (t) { return /^Pre Prep/.test(t); });
      kase('H5', 'the month view (March 2027): Pre Prep\'s bands read wk 1, wk 2, wk 3 (it numbered nothing before)',
           same(mv, NUM), { bands: mv });
    });

    await step('H6', async function () {
      await toMonth('March 2027');
      var rec = T.fakeSavePicker();
      try {
        await T.sleep(700);
        $('export-btn').click();                       // the month view's Export PDF: the direct writer
        await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
      } finally { rec.restore(); }
      var mf = rec.files.filter(function (f) { return f.closed; })[0];
      var runs = (await pdfRuns(mf.bytes)).filter(function (r) { return /^Pre Prep Hiatus/.test(r); });
      // Week 3 (Mon 3/29 - Fri 4/2) sits in the row both the March and the April pages draw.
      kase('H6', 'the written month PDF: Pre Prep\'s bands are wk 1, wk 2, wk 3 (wk 3 on the March AND April pages), none bare',
           count(runs, NUM[0]) === 1 && count(runs, NUM[1]) === 1 && count(runs, NUM[2]) >= 1 && runs.every(function (r) { return NUM.indexOf(r) >= 0; }),
           { runs: runs });
      await view('sheet');
    });

    await step('H7', async function () {
      // ⚠️ From a clean step: the view switches above are undo steps of their own (viewMode is saved state).
      await clickBox('prePrep');                         // untick
      await clickBox('prePrep');                         // tick: the step under test
      $('undo-btn').click(); await settle();
      var undone = { box: box('prePrep').checked, pp: bands('prePrep', PP) };
      $('redo-btn').click(); await settle();
      var redone = { box: box('prePrep').checked, pp: bands('prePrep', PP) };
      kase('H7', 'ONE undo unticks the box and puts the bare labels back; redo ticks it and numbers them again',
           undone.box === false && same(undone.pp, BARE) && redone.box === true && same(redone.pp, NUM), { undone: undone, redone: redone });
    });

    var saveC;
    await step('H8', async function () {
      saveC = await save();
      var s = JSON.parse(saveC);
      kase('H8', 'Save writes phaseHiatusNumbered {prePrep: true}, and fields.byId holds the SAME ids as before the tick',
           same(s.phaseHiatusNumbered, { prePrep: true }) && same(idSet(saveC), idSet(saveA)),
           { key: s.phaseHiatusNumbered, ids: idSet(saveC).length, idsBefore: idSet(saveA).length });
    });

    await step('H9', async function () {
      await clickBox('prePrep');
      var saveB = await save();
      kase('H9', 'unticking puts the bare labels back, and the saved file is BYTE-IDENTICAL to the one saved before the tick',
           !box('prePrep').checked && same(bands('prePrep', PP), BARE) && saveB === saveA,
           { pp: bands('prePrep', PP), identical: saveB === saveA, lenA: saveA.length, lenB: saveB.length });
      await clickBox('prePrep');
    });

    await step('H10', async function () {
      T.set('phiatus-name-prePrep', 'Break'); await settle();
      var named = bands('prePrep', PP);
      T.set('phiatus-name-prePrep', ''); await settle();
      var cleared = bands('prePrep', PP);
      kase('H10', 'a typed hiatus Name is numbered too ("Break wk 1-3"), and clearing it goes back to "Pre Prep Hiatus wk N"',
           same(named, ['Break wk 1', 'Break wk 2', 'Break wk 3']) && same(cleared, NUM), { named: named, cleared: cleared });
    });

    await step('H11', async function () {
      // Retype the middle band through the real band editor.
      var td = document.querySelector('#table-wrap td.sheet-hiatus-cell[data-pkey="prePrep"][data-week="' + PP[1] + '"]');
      T.openCell(td);   // a double-click since D5 (TEXT-STYLE-BAR-PLAN.md)
      await T.until(function () { return !!document.querySelector('.note-editor textarea'); }, 'the band editor', 50, 100);
      var ta = document.querySelector('.note-editor textarea');
      ta.value = 'Lock-off';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      await T.until(function () { return !document.querySelector('.note-editor textarea'); }, 'the editor to close', 50, 100);
      await settle();
      var ticked = bands('prePrep', PP);
      await clickBox('prePrep');
      var unticked = bands('prePrep', PP);
      await clickBox('prePrep');
      var retick = bands('prePrep', PP);
      // "Reset hiatus bands" clears every band's own text; the sync then claims the band again, numbered.
      $('hiatus-reset-btn').click(); await settle();
      var reset = bands('prePrep', PP);
      kase('H11', 'a band retyped in the grid keeps exactly what was typed, ticked or not; its neighbours are numbered; Reset hiatus bands numbers it again',
           same(ticked, [NUM[0], 'Lock-off', NUM[2]]) && same(unticked, ['Pre Prep Hiatus', 'Lock-off', 'Pre Prep Hiatus']) &&
           same(retick, ticked) && same(reset, NUM), { ticked: ticked, unticked: unticked, retick: retick, reset: reset });
    });

    await step('H12', async function () {
      var before = bands('prePrep', PP);
      $('shift-fwd-btn').click(); await settle();
      var moved = bands('prePrep', ['2027-03-22', '2027-03-29', '2027-04-05']);
      $('undo-btn').click(); await settle();
      kase('H12', 'Shift All one week later: the numbered band moves with its phase, still wk 1-3; undo puts it back',
           same(before, NUM) && same(moved, NUM) && same(bands('prePrep', PP), NUM), { before: before, moved: moved });
    });

    await step('H13', async function () {
      await clickBox('custom1');
      var sb = bands('custom1', SB);
      var key1 = JSON.parse(await save()).phaseHiatusNumbered;
      var rm = document.querySelector('#custom-phase-rows .phase-row[data-key="custom1"] .remove-custom-phase');
      rm.click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Remove')) break; }
      await settle();
      var key2 = JSON.parse(await save()).phaseHiatusNumbered;
      $('undo-btn').click(); await settle();
      kase('H13', 'a custom phase\'s own hiatus numbers too (Set Build Hiatus wk 1, wk 2); removing the phase drops its key from the file',
           same(sb, ['Set Build Hiatus wk 1', 'Set Build Hiatus wk 2']) && same(key1, { prePrep: true, custom1: true }) && same(key2, { prePrep: true }),
           { sb: sb, key1: key1, key2: key2 });
    });

    await step('H14', async function () {
      await load(saveC);
      var rt = { box: box('prePrep').checked, pp: bands('prePrep', PP), sb: bands('custom1', SB), sbBox: box('custom1').checked };
      await load(saveA);
      var m5 = { box: box('prePrep').checked, pp: bands('prePrep', PP), sbBox: box('custom1').checked };
      kase('H14', 'Load round trip: the ticked file opens ticked and numbered; the same calendar with no key, loaded after it, opens UNTICKED and bare (the M-5 trap)',
           rt.box === true && rt.sbBox === false && same(rt.pp, NUM) && same(rt.sb, ['Set Build Hiatus', 'Set Build Hiatus']) &&
           m5.box === false && m5.sbBox === false && same(m5.pp, BARE), { roundTrip: rt, m5: m5 });
    });

    await step('H16', async function () {
      // An ALL-PHASE hiatus row's "Number weeks" (bundle B, item 9) went live writing "Hiatus Week N"; the owner then
      // ruled "wk" for both kinds (20 Oct 2026). A file saved by that build carries the old text as the sync's own
      // (hiatusNameSyncedKeys matches), so it must re-read as "Hiatus wk N" on open. Built from saveA: the
      // 20 Dec 2027 row ticked, its two bands holding what that build wrote.
      var s = JSON.parse(saveA), W = ['2027-12-20', '2027-12-27'];
      var row = s.fields.hiatuses.filter(function (h) { return h.start === W[0]; })[0];
      if (!row) throw new Error('saveA has no 20 Dec 2027 hiatus row');
      row.numbered = true;
      s.hiatusTexts = Object.assign({}, s.hiatusTexts, { '2027-12-20': 'Hiatus Week 1', '2027-12-27': 'Hiatus Week 2' });
      s.hiatusNameSyncedKeys = Object.assign({}, s.hiatusNameSyncedKeys, { '2027-12-20': 'Hiatus Week 1', '2027-12-27': 'Hiatus Week 2' });
      await load(JSON.stringify(s));
      var got = W.map(function (w) { var td = document.querySelector('#table-wrap td.sheet-hiatus-cell[data-week="' + w + '"]:not([data-pkey])'); return td ? txt(td) : null; });
      kase('H16', 'an all-phase numbered hiatus saved as "Hiatus Week 1/2" opens reading "Hiatus wk 1/2" (one word for both kinds, the owner\'s ruling)',
           same(got, ['Hiatus wk 1', 'Hiatus wk 2']), { got: got });
    });

    await step('H15', async function () {
      await load(saveC);
      var before = box('prePrep').checked;
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      var after = Array.from(document.querySelectorAll('.phiatus-wknum-cb')).map(function (b) { return b.checked; });
      kase('H15', 'New, after a calendar with a box ticked, starts with every box UNTICKED',
           before === true && after.length > 0 && after.every(function (c) { return c === false; }), { before: before, after: after });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phiatusnum threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
