// phasesui -- the Phases tab redesigned to the A + D blend (owner, 23 Oct 2026; PHASES-TAB-PLAN.md §3, rulings R6-R10)
// "without changing functionality". A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hidewf ./run.sh phasesui 1500
//
// ⭐ BEFORE vs AFTER. The redesign moved the engine's own markup around, and the phase cards' ids ARE the save format
// (fields.byId is built in document order). So the leg loads every fixture that is a calendar the app wrote and
// records, for each: the Phases card's id'd controls in document order (id, tag, type), the saved fields.byId (keys
// in order, and values), and the saved all-phase hiatus rows. `?record=1` runs ONLY that, on any build: run on the
// build from before the redesign (HEAD at 5ce6129), its output is tests/baselines/2026-10-23-phasesui/before.json,
// which this leg then holds the new build to.
//
//   P1  every fixture: the same id'd controls in the same order, the same fields.byId, the same hiatus rows
//   P2  every id'd control in the Phases card still drives update(): a change banks ONE undo step (undo puts the value
//       back), and a Weeks phase's start or length change redraws the waterfall
//   P3  a folded custom card stays folded through undo and redo (which rebuild it)
//   P4  a custom card rebuilt by undo keeps its look (head colour, square, switch, title)
//   P5  every head is its phase colour lightened (60% colour, 40% white), in black (R8, R9); a colour pick repaints it
//   P6  280 px and 440 px sidebars: nothing in a card overflows it, no sideways scroll, every date field wide enough
//   P7  the all-phase hiatus card: its dates under the name, Lock in place and Number weeks as switches (R7)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phasesui', cases: [] };
  var RECORD = /[?&]record=1/.test(location.search);
  var FIXTURES = ['hidewf', 'halfdays', 'halfmarks', 'blocks', 'blocks-noeps-v1.5.0', 'blocksoff', 'customunits', 'builtindates',
    'episodeprep', 'episodeprep-blocks', 'colreuse', 'carry-rich', 'carry-snap', 'custom-nondense', 'dayoverrides',
    'dayoverrides-onhalf', 'hiatusdrag', 'hiatus-blank', 'hiatus-blanklabel', 'notewrap', 'offweek', 'phasenumbering',
    'mvnotes', 'monthnotes', 'shootdays', 'shootorder', 'show-a', 'sideboxes', 'snapoff-friday', 'snapoff-sheet',
    'stintswap-reshape', 'stintswap-chained', 'colswap-simpost-refuse', 'autonote-grips', 'wfkeys', 'mvorder',
    'v1.3.0-saved', 'v1.3.1-saved', 'v1.4.0-saved', 'v1.4.1-saved', 'v1.4.2-saved', 'v1.4.3-saved', 'v1.5.0-saved',
    'v1.6.0-saved', 'v1.7.0-saved', 'v1.8.0-saved'];
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
    await T.until(function () { return mode === 'month' ? !!document.querySelector('#table-wrap .mv-daygrid') : !!document.querySelector('#table-wrap table.sheet-table, #table-wrap .empty-state'); }, 'the ' + mode + ' view', 100, 100);
    await settle();
  }
  async function phasesTab() {
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
    await T.sleep(150);
  }
  function rowOf(key) { var sw = byId('swatch-' + key); return sw ? sw.closest('.phase-row') : null; }
  function cardControls() {
    return Array.from(document.querySelectorAll('#phase-rows [id], #custom-phase-rows [id]'))
      .filter(function (e) { return ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(e.tagName) !== -1; })
      .map(function (e) { return e.id + ':' + e.tagName.toLowerCase() + (e.type ? ':' + e.type : ''); });
  }
  var written = [];
  var saveHandle = { name: 'phasesui.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([''], 'phasesui.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;          // after a Load the linked file is the fake picker's ({file, text})
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'phasesui-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || T.clickModalButton('Discard') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  async function record(name) {
    var text = await (await fetch('/tests/fixtures/' + name + '.sptcal')).text();
    await load(text);
    var saved = JSON.parse(await save());
    return { controls: cardControls(),
             byId: Object.keys(saved.fields.byId).map(function (k) { return [k, saved.fields.byId[k]]; }),
             hiatuses: saved.fields.hiatuses || [] };
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await settle();

    // ===== P1: every fixture, before vs after =======================================================================
    var rec = {};
    for (var fi = 0; fi < FIXTURES.length; fi++) {
      try { rec[FIXTURES[fi]] = await record(FIXTURES[fi]); }
      catch (e) { rec[FIXTURES[fi]] = { error: String(e && e.message || e) }; }
    }
    if (RECORD) {
      out.records = rec;
      kase('REC', 'recorded ' + Object.keys(rec).length + ' fixtures', Object.keys(rec).every(function (k) { return !rec[k].error; }),
           { errors: Object.keys(rec).filter(function (k) { return rec[k].error; }) });
      T.done(out); return;
    }
    await step('P1', async function () {
      var base = await (await fetch('/tests/baselines/2026-10-23-phasesui/before.json')).json();
      var bad = [];
      FIXTURES.forEach(function (n) {
        var a = rec[n], b = base[n];
        if (!a || a.error || !b) { bad.push(n + ': ' + (a && a.error || 'no record')); return; }
        if (!same(a.controls, b.controls)) bad.push(n + ': controls');
        if (!same(a.byId, b.byId)) bad.push(n + ': fields.byId');
        if (!same(a.hiatuses, b.hiatuses)) bad.push(n + ': hiatuses');
      });
      kase('P1', 'all ' + FIXTURES.length + ' fixtures: the Phases card\'s id\'d controls (same ids, tags and types, in the same order), the saved fields.byId (keys in order, and values) and the all-phase hiatus rows are those of the build before the redesign',
           bad.length === 0 && Object.keys(base).length === FIXTURES.length, { bad: bad.slice(0, 12), fixtures: FIXTURES.length });
    });

    // Back to the reference calendar, with a phase hiatus and Sim Post switched on so every block is open.
    await load(await (await fetch('/tests/fixtures/hidewf.sptcal')).text());
    await phasesTab();

    // ===== P2: every control still drives update() =================================================================
    await step('P2', async function () {
      var els = Array.from(document.querySelectorAll('#phase-rows [id], #custom-phase-rows [id]'))
        .filter(function (e) { return (e.tagName === 'INPUT' || e.tagName === 'SELECT') && e.type !== 'hidden'; });
      var results = [], bad = [];
      for (var i = 0; i < els.length; i++) {
        var el = byId(els[i].id);
        if (!el) { bad.push(els[i].id + ': gone'); continue; }
        var isCb = el.type === 'checkbox', was = isCb ? el.checked : el.value, grid0 = byId('table-wrap').innerHTML;
        if (isCb) el.click();
        else if (el.tagName === 'SELECT') {
          var opt = Array.from(el.options).filter(function (o) { return o.value !== el.value; })[0];
          T.set(el.id, opt ? opt.value : el.value);
        } else if (el.type === 'date') T.set(el.id, el.value ? (el.value.slice(0, 8) + (el.value.slice(8) === '15' ? '16' : '15')) : '2027-02-01');
        else if (el.type === 'number') T.set(el.id, String((parseInt(el.value, 10) || 1) + 1));
        else T.set(el.id, (el.value || '') + ' X');
        await settle();
        var now = isCb ? byId(el.id).checked : byId(el.id).value;
        var redrew = byId('table-wrap').innerHTML !== grid0;
        byId('undo-btn').click();
        await settle();
        var back = isCb ? byId(el.id).checked : byId(el.id).value;
        // A Weeks phase's start or length moves it, so the waterfall must redraw (render() ran). A unit switch is
        // built never to move a phase (the new box is prefilled), and snap on a Monday start changes nothing drawn.
        var key = el.id.replace(/^(start|weeks)-/, '');
        var schedules = /^(start|weeks)-(writersRoom|prePrep|prodPrep|post|localization)(?![\w-])/.test(el.id) &&
                        !!(byId('start-' + key) || {}).value && (byId('unit-' + key) || {}).value === 'weeks';
        var ok = now !== was && back === was && (!schedules || redrew);
        results.push(el.id + (ok ? '' : '!'));
        if (!ok) bad.push(el.id + ': was ' + was + ', changed ' + now + ', after undo ' + back + (schedules ? ', redrew ' + redrew : ''));
      }
      kase('P2', 'every id\'d control in the Phases card (' + els.length + ') still drives update(): its change banks one undo step that puts it back, and a scheduled Weeks phase\'s start or length redraws the waterfall',
           bad.length === 0 && els.length > 50, { bad: bad.slice(0, 10), controls: els.length });
    });

    // ===== P3 / P4: a custom card through undo and redo =============================================================
    function look(key) {
      var r = rowOf(key); if (!r) return null;
      var head = r.querySelector(':scope > .custom-phase-header'), sw = r.querySelector(':scope > .swatch');
      var rr = r.getBoundingClientRect(), sr = sw.getBoundingClientRect();
      var cb = r.querySelector('.phase-switches .sw-row > .phase-hidewf-cb'), cr = cb ? cb.getBoundingClientRect() : { width: 0, height: 0 };
      var name = r.querySelector('.phase-name-input'), ns = getComputedStyle(name);
      return { head: getComputedStyle(head).backgroundColor, phaseColor: r.style.getPropertyValue('--phase-color'), swatch: sw.style.backgroundColor,
               sq: [Math.round(sr.left - rr.left), Math.round(sr.top - rr.top), Math.round(sr.width), Math.round(sr.height)],
               sw: [Math.round(cr.width), Math.round(cr.height)], title: [ns.fontSize, ns.fontWeight, ns.color] };
    }
    await step('P3', async function () {
      function caret() { return rowOf('custom1').querySelector(':scope > .custom-phase-header > .phase-collapse-btn'); }
      var open0 = look('custom1');                     // the card open, as built from the file
      caret().click(); await T.sleep(150);             // folded
      var el0 = rowOf('custom1');
      T.set('end-custom1', '2027-01-29'); await settle();
      byId('undo-btn').click(); await settle();
      var el1 = rowOf('custom1'), folded1 = el1.classList.contains('is-collapsed');
      byId('redo-btn').click(); await settle();
      var folded2 = rowOf('custom1').classList.contains('is-collapsed');
      byId('undo-btn').click(); await settle();       // rebuilt again, folded
      caret().click(); await T.sleep(150);             // open, to read its look
      var open1 = look('custom1');
      kase('P3', 'a folded custom card is rebuilt by undo (a new element) and stays folded through undo and redo',
           el1 !== el0 && folded1 && folded2, { rebuilt: el1 !== el0, folded1: folded1, folded2: folded2 });
      kase('P4', 'the card undo rebuilt keeps its look: head colour, --phase-color, the square\'s place and size, the switch, the title',
           !!open0 && same(open0, open1) && open0.sq[2] === 16 && open0.sw[0] === 32 && open0.sw[1] === 16,
           { before: open0, after: open1 });
    });

    // ===== P5: the heads ============================================================================================
    function rgb(s) { var m = String(s).match(/[\d.]+/g) || []; var v = m.slice(0, 3).map(Number); if (/color\(srgb/.test(s)) v = v.map(function (x) { return x * 255; }); return v.map(Math.round); }
    function tint(c) { return c.map(function (x) { return Math.round(x * 0.6 + 255 * 0.4); }); }
    function close(a, b) { return a.length === 3 && b.length === 3 && a.every(function (x, i) { return Math.abs(x - b[i]) <= 1; }); }
    await step('P5', async function () {
      await view('month');                                // the Prep card shows in the month view only
      await phasesTab();
      var rows = Array.from(document.querySelectorAll('#phase-rows > .phase-row, #custom-phase-rows > .phase-row'));
      var bad = [];
      rows.forEach(function (r) {
        var sw = r.querySelector(':scope > .swatch'), head = r.querySelector(':scope > .custom-phase-header');
        var want = tint(rgb(sw.style.backgroundColor)), got = rgb(getComputedStyle(head).backgroundColor);
        var ink = rgb(getComputedStyle(r.querySelector('.phase-name-input')).color), caretInk = rgb(getComputedStyle(r.querySelector('.phase-collapse-btn')).color);
        if (!close(want, got) || !close(ink, [30, 29, 27]) || !close(caretInk, [30, 29, 27])) bad.push(sw.id + ' head ' + got + ' want ' + want + ' ink ' + ink + ' caret ' + caretInk);
      });
      // A colour pick through the square's own picker repaints the head.
      var sw = byId('swatch-post');
      sw.scrollIntoView({ block: 'center' }); await T.sleep(100);
      var r0 = sw.getBoundingClientRect(), hit = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2);
      hit.click(); await T.sleep(150);
      var swatches = document.querySelectorAll('.phase-color-pop .pc-sw');
      var popText = txt(document.querySelector('.phase-color-pop'));
      if (swatches[10]) swatches[10].click();
      await settle();
      var head = rgb(getComputedStyle(rowOf('post').querySelector(':scope > .custom-phase-header')).backgroundColor);
      var picked = close(head, tint([0x5B, 0x9B, 0xD5]));
      byId('undo-btn').click(); await settle();
      var undone = close(rgb(getComputedStyle(rowOf('post').querySelector(':scope > .custom-phase-header')).backgroundColor), tint(rgb(byId('swatch-post').style.backgroundColor)));
      kase('P5', 'every head (' + rows.length + ' cards) is its phase colour lightened 60/40 with black text, caret and title (R8, R9); the square is on top and opens the 14 swatches with no text (R10); a pick repaints the head, and undo puts it back',
           bad.length === 0 && rows.length === 8 && hit === sw && swatches.length === 14 && popText === '' && picked && undone,
           { bad: bad, hitSquare: hit === sw, swatches: swatches.length, popText: popText, picked: picked, undone: undone });
    });

    // ===== P6: 280 px and 440 px ====================================================================================
    await step('P6', async function () {
      // Every block open: a phase hiatus and Sim Post on, Episodic Prep with a default.
      var en = byId('phiatus-en-post'); if (!en.checked) en.click();
      var sp = byId('simpost-enabled'); if (!sp.checked) sp.click();
      T.set('prep-days', '5');
      await settle();
      var fp = document.querySelector('.form-panel'), prev = fp.getAttribute('style') || '', report = {};
      for (var wi = 0; wi < 2; wi++) {
        var w = [280, 440][wi];
        fp.setAttribute('style', prev + ';width:' + w + 'px !important;min-width:' + w + 'px;max-width:' + w + 'px;');
        await T.sleep(250);
        var bad = [], narrowDates = [];
        Array.from(document.querySelectorAll('#phase-rows > .phase-row, #custom-phase-rows > .phase-row, #hiatus-list > .hiatus-entry')).forEach(function (card) {
          if (getComputedStyle(card).display === 'none') return;
          var cr = card.getBoundingClientRect();
          card.querySelectorAll('*').forEach(function (e) {
            var r = e.getBoundingClientRect();
            if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') return;
            if (r.left < cr.left - 0.5 || r.right > cr.right + 0.5) bad.push((card.querySelector('[id]') || card).id + ' > ' + (e.id || e.className || e.tagName) + ' ' + Math.round(r.left - cr.left) + '..' + Math.round(r.right - cr.left) + '/' + Math.round(cr.width));
            if (e.tagName === 'INPUT' && e.type === 'date' && r.width < 112) narrowDates.push((e.id || e.className) + ' ' + Math.round(r.width));
          });
        });
        var side = fp.scrollWidth - fp.clientWidth;
        report[w] = { overflow: bad.slice(0, 6), narrowDates: narrowDates.slice(0, 6), sideways: side, width: Math.round(fp.getBoundingClientRect().width) };
      }
      fp.setAttribute('style', prev);
      kase('P6', 'at a 280 px and a 440 px sidebar, with every block open: nothing in any phase or hiatus card overflows it, the sidebar never scrolls sideways, and every date field is at least 112 px wide',
           [280, 440].every(function (w) { var r = report[w]; return r.width === w && !r.overflow.length && !r.narrowDates.length && r.sideways <= 0; }), report);
    });

    // ===== P7: the all-phase hiatus card ============================================================================
    await step('P7', async function () {
      var row = document.querySelector('#hiatus-list > .hiatus-entry');
      var range = txt(row.querySelector('.hiatus-range')), name = row.querySelector('.hiatus-head .hiatus-name');
      var lock = row.querySelector('.hiatus-lock.sw-row > .hiatus-locked'), num = row.querySelector('.hiatus-numbered.sw-row > .hiatus-num');
      var head = rgb(getComputedStyle(row.querySelector('.hiatus-head')).backgroundColor);
      kase('P7', 'the all-phase hiatus card: a head in HIATUS_COLOR lightened with the name and "12/21/26 → 1/3/27 (2 wk)" under it, and Lock in place and Number weeks as switches (R7)',
           range === '12/21/26 → 1/3/27 (2 wk)' && !!name && !!lock && lock.checked && !!num && close(head, tint([255, 0, 0])) &&
           Math.round(lock.getBoundingClientRect().width) === 32, { range: range, head: head });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phasesui threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
