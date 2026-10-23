// phasefold -- the caret on every phase card (owner, 20 Oct 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phasefold 300
//
// "There should be a carrot that lets you hide and unhide phases within the phases menu. When you hide them it
// should show just their name (name still editable) with their color but hide all the settings underneath."
// A sidebar fold and nothing else: which cards are folded is session UI, never in the saved file, never an undo
// step, and the calendar draws exactly as it did. It survives undo and redo, which REBUILD every custom row; a
// Load or New is a different calendar and unfolds everything.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays):
//   prePrep    Pre Prep    Mon 3/1/27 x 6 weeks
//   custom1    Set Build   Mon 3/1/27 x 4 weeks
//   production             Mon 5/3/27, 4 episodes x 5 days
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phasefold', cases: [] };
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
  function rowOf(key) { var sw = $('swatch-' + key); return sw ? sw.closest('.phase-row') : null; }
  function caretOf(key) { var r = rowOf(key); return r ? r.querySelector(':scope > .custom-phase-header > .phase-collapse-btn') : null; }
  function folded(key) { var r = rowOf(key); return !!r && r.classList.contains('is-collapsed'); }
  // The card's children a user can see. Folded, that is exactly the colour bar and the name line.
  function shown(key) {
    var r = rowOf(key);
    return r ? Array.from(r.children).filter(function (c) { return getComputedStyle(c).display !== 'none'; })
                                      .map(function (c) { return c.classList[0] || c.tagName; }) : null;
  }
  // ⛔ HIT-TESTED: the element on top at the caret's centre must be the caret (or its ::before, which hit-tests
  // as the caret), and THAT element gets the click.
  async function clickCaret(key) {
    await phasesTab();
    var b = caretOf(key);
    if (!b) throw new Error('no caret on ' + key + '\'s card');
    b.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== b) throw new Error('the caret is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await T.sleep(150);
  }
  var written = [];
  var saveHandle = { name: 'phasefold.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phasefold.sptcal', { lastModified: 1 }); },
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
    var stem = 'phasefold-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function grid() { return ($('table-wrap') || { innerHTML: '' }).innerHTML; }

  try {
    await T.appReady();
    T.set('show-title', 'Phase Fold Test'); T.set('season-num', '1');   // Season completes Show Info: Production schedules
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-prePrep', '2027-03-01'); T.set('weeks-prePrep', '6');
    T.set('start-production', '2027-05-03');
    $('add-phase-btn').click();
    await T.sleep(200);
    T.set('name-custom1', 'Set Build'); T.set('start-custom1', '2027-03-01'); T.set('weeks-custom1', '4');
    await phasesTab();                                 // sidebarTab is saved state
    await settle();
    var saveA = await save();                          // the calendar with every card open
    var gridA = grid();

    await step('F1', async function () {
      var rows = Array.from(document.querySelectorAll('#phase-rows > .phase-row, #custom-phase-rows > .phase-row'));
      var carets = rows.map(function (r) { return r.querySelector(':scope > .custom-phase-header > .phase-collapse-btn'); });
      var first = rows.map(function (r) { var h = r.querySelector(':scope > .custom-phase-header'); return h && h.firstElementChild; });
      kase('F1', 'every phase card (the six built-ins, Prep, each custom phase) has ONE caret, first on its name line: a type=button with no id, open (aria-expanded=true), every card unfolded',
           rows.length === 8 && carets.every(function (b, i) {
             return b && b === first[i] && b.tagName === 'BUTTON' && b.type === 'button' && !b.id && b.getAttribute('aria-expanded') === 'true';
           }) && rows.every(function (r) { return r.querySelectorAll('.phase-collapse-btn').length === 1 && !r.classList.contains('is-collapsed'); }),
           { rows: rows.length, carets: carets.filter(Boolean).length });
    });

    await step('F2', async function () {
      var before = shown('prePrep');
      await clickCaret('prePrep');
      var b = caretOf('prePrep'), h = rowOf('prePrep').getBoundingClientRect().height;
      kase('F2', 'a hit-tested click folds Pre Prep to its colour bar and name line (everything under it hidden), the caret reads aria-expanded=false / "Show this phase’s settings"',
           folded('prePrep') && JSON.stringify(shown('prePrep')) === '["swatch","custom-phase-header"]' && before.length > 2 &&
           h < 80 && b.getAttribute('aria-expanded') === 'false' && b.title === 'Show this phase’s settings',
           { before: before, after: shown('prePrep'), height: h, aria: b.getAttribute('aria-expanded'), caretTitle: b.title });
    });

    await step('F3', async function () {
      await settle();
      var dirty = /Unsaved changes/.test(txt(document.querySelector('header')));
      var saveB = await save();
      kase('F3', 'the fold is not calendar data: the calendar is not marked changed (so no undo step and no autosave), the grid is unchanged and a Save is BYTE-IDENTICAL to the one before the fold',
           !dirty && grid() === gridA && saveB === saveA,
           { dirty: dirty, gridSame: grid() === gridA, saveSame: saveB === saveA, lenA: saveA.length, lenB: saveB.length });
    });

    await step('F4', async function () {
      var n = $('name-prePrep');
      n.scrollIntoView({ block: 'center' });
      await T.sleep(100);
      var r = n.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      T.set('name-prePrep', 'Early Prep');
      await settle();
      var inGrid = /Early Prep wk 1/.test(txt($('table-wrap')));
      T.set('name-prePrep', 'Pre Prep');
      await settle();
      kase('F4', 'folded, the name is still on top and editable: typing "Early Prep" renames the phase in the waterfall',
           hit === n && folded('prePrep') && inGrid, { hit: hit && (hit.id || hit.className), inGrid: inGrid });
    });

    await step('F5', async function () {
      var ep = $('ep-panel'), open = getComputedStyle(ep).display;
      await clickCaret('production');
      var shut = getComputedStyle(ep).display;
      var prodGrid = /Production wk 1/.test(txt($('table-wrap')));
      await clickCaret('production');
      kase('F5', 'Production folds with its episode list (which the engine shows by inline style) and still schedules; a second click unfolds it',
           open !== 'none' && shut === 'none' && prodGrid && !folded('production') && getComputedStyle(ep).display === open,
           { open: open, shut: shut, prodGrid: prodGrid, after: getComputedStyle(ep).display });
    });

    await step('F6', async function () {
      await clickCaret('custom1');
      var el0 = rowOf('custom1');
      T.set('weeks-custom1', '5');                     // a calendar edit: one undo step
      await settle();
      $('undo-btn').click(); await settle();
      var el1 = rowOf('custom1'), u = { rebuilt: el1 !== el0, folded: folded('custom1'), weeks: $('weeks-custom1').value,
        aria: caretOf('custom1').getAttribute('aria-expanded'), pp: folded('prePrep') };
      $('redo-btn').click(); await settle();
      var r = { folded: folded('custom1'), weeks: $('weeks-custom1').value, pp: folded('prePrep') };
      kase('F6', 'undo and redo REBUILD the custom row, and it comes back still folded (and Pre Prep with it)',
           u.rebuilt && u.folded && u.weeks === '4' && u.aria === 'false' && u.pp && r.folded && r.weeks === '5' && r.pp, { undo: u, redo: r });
      $('undo-btn').click(); await settle();           // back to 4 weeks for the cases below
    });

    await step('F7', async function () {
      // Undo an Add phase made while folded, then Add again: the new phase gets the same key and must open unfolded.
      $('add-phase-btn').click(); await settle();
      var rows = document.querySelectorAll('#custom-phase-rows .phase-row'), k = rows[rows.length - 1].dataset.key;
      await clickCaret(k);
      var f0 = folded(k);
      $('undo-btn').click(); await settle();
      var gone = !rowOf(k);
      $('add-phase-btn').click(); await settle();
      rows = document.querySelectorAll('#custom-phase-rows .phase-row');
      var k2 = rows[rows.length - 1].dataset.key, open = !folded(k2);
      $('undo-btn').click(); await settle();
      kase('F7', 'a new phase opens unfolded, even on the key of an undone phase that was folded',
           f0 && gone && k2 === k && open && !rowOf(k), { key: k, key2: k2, f0: f0, gone: gone, open: open });
    });

    await step('F8', async function () {
      await clickCaret('production');
      var f0 = folded('production');
      await toMonth('May 2027');
      var pill = document.querySelector('#table-wrap .mv-pill[data-ph="production"]');
      if (!pill) throw new Error('no Production bar in May 2027');
      pill.scrollIntoView({ block: 'center' });
      await T.sleep(150);
      var pr = pill.getBoundingClientRect(), x = Math.round(pr.left + 6), y = Math.round(pr.top + pr.height / 2);
      var el = document.elementFromPoint(x, y), base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2 };
      el.dispatchEvent(new MouseEvent('mousedown', base));
      el.dispatchEvent(new MouseEvent('contextmenu', base));
      el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
      await T.until(function () { return !!document.querySelector('.day-menu [data-item="phase-show"]'); }, 'the day menu\'s Show in Phases card', 40, 100);
      document.querySelector('.day-menu [data-item="phase-show"]').click();
      await settle();
      kase('F8', 'the month view\'s "Show in Phases card" unfolds a folded Production card',
           f0 && !folded('production') && caretOf('production').getAttribute('aria-expanded') === 'true' &&
           getComputedStyle($('ep-panel')).display !== 'none', { f0: f0, after: folded('production') });
      await view('sheet');
    });

    await step('F9', async function () {
      await clickCaret('production');
      var before = ['prePrep', 'custom1', 'production'].map(folded);
      await load(saveA);
      var after = Array.from(document.querySelectorAll('.phase-row')).filter(function (r) { return r.classList.contains('is-collapsed'); }).length;
      kase('F9', 'a Load is a different calendar: every card opens unfolded, every caret aria-expanded=true',
           before.every(Boolean) && after === 0 && document.querySelectorAll('.phase-collapse-btn[aria-expanded="false"]').length === 0,
           { before: before, foldedAfter: after });
    });

    await step('F10', async function () {
      await clickCaret('prePrep'); await clickCaret('custom1');
      var before = folded('prePrep') && folded('custom1');
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      var after = Array.from(document.querySelectorAll('.phase-row')).filter(function (r) { return r.classList.contains('is-collapsed'); }).length;
      kase('F10', 'New starts with every card unfolded', before && after === 0 &&
           document.querySelectorAll('.phase-collapse-btn[aria-expanded="false"]').length === 0, { before: before, foldedAfter: after });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phasefold threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
