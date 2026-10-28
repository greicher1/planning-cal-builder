// hiatusfold -- the caret on every all-phase hiatus card (owner, 28 Oct 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh hiatusfold 300
//
// "Lets give collapsing arrows to the all phase hiatuses just like phases": phasefold's caret on the hiatus card.
// Folded, only the red head shows (the name, still editable, its dates and ×). Session UI, never in the saved file,
// never an undo step, and the calendar draws exactly as it did. A hiatus row has NO KEY, so the fold lives on the
// row and applyStateSnapshot() carries it across a rebuild: position for position while the row count holds, by
// the row's own values when an undo or redo added or removed a row. A Load or New is a different calendar and
// unfolds everything.
//
// THE CALENDAR (synthetic: made-up dates, no region, so no holidays), with New's four default hiatuses:
//   prePrep    Pre Prep    Mon 11/2/26 x 10 weeks   (crosses the 12/21/26 hiatus)
//   production             Mon 1/11/27, 4 episodes x 5 days
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hiatusfold', cases: [] };
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
  async function phasesTab() {
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
    await T.sleep(150);
  }
  function rows() { return Array.from(document.querySelectorAll('#hiatus-list > .hiatus-entry')); }
  function caretOf(row) { return row ? row.querySelector(':scope > .hiatus-head > .hiatus-collapse-btn') : null; }
  function folded(row) { return !!row && row.classList.contains('is-collapsed'); }
  function folds() { return rows().map(folded); }
  function starts() { return rows().map(function (r) { return r.querySelector('.hiatus-start').value; }); }
  // The card's children a user can see. Folded, that is exactly the head.
  function shown(row) {
    return Array.from(row.children).filter(function (c) { return getComputedStyle(c).display !== 'none'; })
                                   .map(function (c) { return c.classList[0] || c.tagName; });
  }
  function type(el, v) {
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    d.set.call(el, v); ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  // ⛔ HIT-TESTED: the element on top at the caret's centre must be the caret (or its ::before, which hit-tests as
  // the caret), and THAT element gets the click.
  async function clickCaret(i) {
    await phasesTab();
    var b = caretOf(rows()[i]);
    if (!b) throw new Error('no caret on hiatus card ' + i);
    b.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== b) throw new Error('the caret is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await T.sleep(150);
  }
  var written = [];
  var saveHandle = { name: 'hiatusfold.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hiatusfold.sptcal', { lastModified: 1 }); },
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
    var stem = 'hiatusfold-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function grid() { return ($('table-wrap') || { innerHTML: '' }).innerHTML; }

  try {
    await T.appReady();
    T.set('show-title', 'Hiatus Fold Test'); T.set('season-num', '1');   // Season completes Show Info: Production schedules
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-prePrep', '2026-11-02'); T.set('weeks-prePrep', '10');
    T.set('start-production', '2027-01-11');
    await phasesTab();                                 // sidebarTab is saved state
    await settle();
    var saveA = await save();                          // the calendar with every card open
    var gridA = grid();

    await step('H1', async function () {
      var rs = rows(), carets = rs.map(caretOf);
      kase('H1', 'every all-phase hiatus card (New\'s four) has ONE caret, first in its head: a type=button with no id, open (aria-expanded=true), every card unfolded',
           rs.length === 4 && carets.every(function (b, i) {
             return b && b === rs[i].querySelector('.hiatus-head').firstElementChild && b.tagName === 'BUTTON' && b.type === 'button' &&
                    !b.id && b.getAttribute('aria-expanded') === 'true';
           }) && rs.every(function (r) { return r.querySelectorAll('.hiatus-collapse-btn').length === 1 && !folded(r); }),
           { rows: rs.length, carets: carets.filter(Boolean).length });
    });

    await step('H2', async function () {
      var row = rows()[0], before = shown(row);
      await clickCaret(0);
      var b = caretOf(row), h = row.getBoundingClientRect().height;
      kase('H2', 'a hit-tested click folds the 12/21/26 card to its head (Starts, Weeks and both switches hidden; the dates still on the head), the caret reads aria-expanded=false / "Show this hiatus’s settings"',
           folded(row) && JSON.stringify(shown(row)) === '["hiatus-head"]' && JSON.stringify(before) === '["hiatus-head","hiatus-body"]' &&
           h < 70 && txt(row.querySelector('.hiatus-range')) === '12/21/26 → 1/3/27 (2 wk)' &&
           b.getAttribute('aria-expanded') === 'false' && b.title === 'Show this hiatus’s settings' && !folded(rows()[1]),
           { before: before, after: shown(row), height: h, aria: b.getAttribute('aria-expanded'), caretTitle: b.title });
    });

    await step('H3', async function () {
      await settle();
      var dirty = /Unsaved changes/.test(txt(document.querySelector('header')));
      var saveB = await save();
      kase('H3', 'the fold is not calendar data: the calendar is not marked changed (so no undo step and no autosave), the grid is unchanged and a Save is BYTE-IDENTICAL to the one before the fold',
           !dirty && grid() === gridA && saveB === saveA,
           { dirty: dirty, gridSame: grid() === gridA, saveSame: saveB === saveA, lenA: saveA.length, lenB: saveB.length });
    });

    await step('H4', async function () {
      var n = rows()[0].querySelector('.hiatus-name');
      n.scrollIntoView({ block: 'center' });
      await T.sleep(100);
      var r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      type(n, 'Winter Break');
      await settle();
      var inGrid = /Winter Break/.test(txt($('table-wrap')));
      type(n, '');
      await settle();
      kase('H4', 'folded, the name is still on top and editable: typing "Winter Break" renames the hiatus band in the waterfall',
           hit === n && folded(rows()[0]) && inGrid && !/Winter Break/.test(txt($('table-wrap'))), { hit: hit && hit.className, inGrid: inGrid });
    });

    await step('H5', async function () {
      // A calendar edit on ANOTHER card, then undo and redo: every row is rebuilt, the count holds, so the fold is
      // carried position for position.
      var el0 = rows()[0];
      type(rows()[3].querySelector('.hiatus-weeks'), '3');
      await settle();
      $('undo-btn').click(); await settle();
      var u = { rebuilt: rows()[0] !== el0, folds: folds(), weeks: rows()[3].querySelector('.hiatus-weeks').value,
                aria: caretOf(rows()[0]).getAttribute('aria-expanded') };
      $('redo-btn').click(); await settle();
      var r = { folds: folds(), weeks: rows()[3].querySelector('.hiatus-weeks').value };
      kase('H5', 'undo and redo REBUILD every hiatus row, and the folded card comes back folded (and only it)',
           u.rebuilt && JSON.stringify(u.folds) === '[true,false,false,false]' && u.weeks === '2' && u.aria === 'false' &&
           JSON.stringify(r.folds) === '[true,false,false,false]' && r.weeks === '3', { undo: u, redo: r });
      $('undo-btn').click(); await settle();           // back to 2 weeks for the cases below
    });

    await step('H6', async function () {
      // Fold the 12/18/28 card too, then remove the OPEN 12/20/27 card between them with its ×. The undo puts a row
      // back (the count changes), so each folded card is found again by its own values.
      await clickCaret(2);
      var s0 = starts(), f0 = folds();
      var x = rows()[1].querySelector('.remove-hiatus');
      x.scrollIntoView({ block: 'center' }); await T.sleep(100);
      x.click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Remove this hiatus/.test(T.modalText())) { T.clickModalButton('Remove'); break; } }
      await settle();
      var rm = { starts: starts(), folds: folds() };
      $('undo-btn').click(); await settle();
      var u = { starts: starts(), folds: folds() };
      $('redo-btn').click(); await settle();
      var r = { starts: starts(), folds: folds() };
      $('undo-btn').click(); await settle();
      kase('H6', 'remove an open card between two folded ones: the others keep their folds; undo puts it back OPEN with the two around it still folded, and redo takes it away again leaving them folded',
           JSON.stringify(f0) === '[true,false,true,false]' && rm.starts.length === 3 && JSON.stringify(rm.folds) === '[true,true,false]' &&
           JSON.stringify(u.starts) === JSON.stringify(s0) && JSON.stringify(u.folds) === '[true,false,true,false]' &&
           JSON.stringify(r.folds) === '[true,true,false]' && JSON.stringify(folds()) === '[true,false,true,false]',
           { before: { starts: s0, folds: f0 }, removed: rm, undo: u, redo: r });
    });

    await step('H7', async function () {
      $('add-hiatus').click(); await settle();
      var f = folds();
      $('undo-btn').click(); await settle();
      kase('H7', '+ Add hiatus adds an OPEN card and the folded ones stay folded; its undo leaves them folded',
           JSON.stringify(f) === '[true,false,true,false,false]' && JSON.stringify(folds()) === '[true,false,true,false]', { added: f, after: folds() });
    });

    await step('H8', async function () {
      var row = rows()[0], f0 = folded(row);
      await toMonth('December 2026');
      // The 22 Dec cell, dated from its row's Sunday (mvmenu's arithmetic), right-clicked at its centre.
      var cell = null;
      Array.from(document.querySelectorAll('#table-wrap .mv-body > .mv-week')).forEach(function (wk) {
        var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
        Array.from(cells).forEach(function (c) { if (!c.classList.contains('mv-out') && txt(c.querySelector('.mv-daynum')) === '22') cell = c; });
      });
      if (!cell) throw new Error('no 22 Dec cell');
      cell.scrollIntoView({ block: 'center' });
      await T.sleep(250);
      var cr = cell.getBoundingClientRect(), x = Math.round(cr.left + cr.width / 2), y = Math.round(cr.top + cr.height / 2);
      var el = document.elementFromPoint(x, y), base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2 };
      el.dispatchEvent(new MouseEvent('mousedown', base));
      el.dispatchEvent(new MouseEvent('contextmenu', base));
      el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
      await T.until(function () { return !!document.querySelector('.day-menu [data-item^="band-colour-"]'); }, 'the day menu\'s hiatus section', 40, 100);
      var shows = document.querySelectorAll('.day-menu [data-item^="band-show-"]').length;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await settle();
      kase('H8', 'the month view\'s day menu on a folded hiatus offers no "Show in Phases card" (the trim, ruling T1), and opening it folds nothing open',
           f0 && shows === 0 && !document.querySelector('.day-menu') && JSON.stringify(folds()) === '[true,false,true,false]',
           { f0: f0, shows: shows, folds: folds() });
      await view('sheet');
    });

    await step('H9', async function () {
      var before = folds();                              // H8 leaves the folds as H7 did
      await load(saveA);
      kase('H9', 'a Load is a different calendar: every hiatus card opens unfolded, every caret aria-expanded=true',
           JSON.stringify(before) === '[true,false,true,false]' && rows().length === 4 && folds().every(function (f) { return !f; }) &&
           document.querySelectorAll('.hiatus-collapse-btn[aria-expanded="false"]').length === 0,
           { before: before, after: folds() });
    });

    await step('H10', async function () {
      await clickCaret(1); await clickCaret(3);
      var before = folds();
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      kase('H10', 'New starts with every hiatus card unfolded', JSON.stringify(before) === '[false,true,false,true]' &&
           rows().length === 4 && folds().every(function (f) { return !f; }) &&
           document.querySelectorAll('.hiatus-collapse-btn[aria-expanded="false"]').length === 0, { before: before, after: folds() });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hiatusfold threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
