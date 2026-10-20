// phasenum -- a custom phase's "Number weeks" (PHASE-NUMBERING-PLAN.md, owner rulings R1, R2, Q1-Q4, 19 Oct 2026).
//
// TWO RUNS, chosen by the starting state, as customunits:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phasenum 200
//     LIVE + MINT. Builds the synthetic calendar below through the UI (made-up 2027 dates; no real show's shape),
//     asserts the automatic flips as they happen (By -> Days / Dates unticks, the day menu's 1-day item unticks, its
//     1-week item does not), then saves through the real Save path and returns the .sptcal text as out.text. That is
//     how tests/fixtures/phasenumbering.sptcal was cut (see that README).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenumbering ./run.sh phasenum 200
//     RESTORE. Loads that fixture and asserts the text of every output: the waterfall rows, the month pills, the day
//     menu's header, the workbook's cells (read through the page's own ExcelJS), and the waterfall PDF and the WRITTEN
//     month PDF, handed back as files (phasenum.pdf, phasenum.month.pdf) for gate.sh to read their text runs. Then the
//     undo steps, Days <-> Dates, the month edge drag (Q3), and the M-5 shape: an older calendar loaded after this one
//     must come back with every box ticked.
//
// THE CALENDAR (no region, so no holidays):
//   prePrep  Pre Prep     built-in WEEKS, Mon 3/1/27 x 3     -> the control: R2, it has no box at all
//   custom1  Table Read   DAYS 1 from Wed 3/10/27            -> By -> Days unticked it
//   custom2  Scout        DATES Thu 3/18/27 -> Mon 3/22/27    -> By -> Dates unticked it; two week rows, both "Scout"
//   custom3  Stage Lock   WEEKS, Mon 3/1/27 x 2              -> unticked by hand: a Weeks phase may go without
//   custom4  Rigging      WEEKS, Mon 3/8/27 x 2              -> left ticked: the custom control
//   custom5  Fitting      day menu > Add 1-day phase, Fri 3/26/27   -> Dates, unticked by addPhaseHere
//   custom6  Camera Test  day menu > Add 1-week phase, Mon 3/29/27  -> Weeks 1, ticked
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function el(id){ return document.getElementById(id); }
  function txt(e){ return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function uniq(a){ return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var KEYS = ['custom1', 'custom2', 'custom3', 'custom4', 'custom5', 'custom6'];
  var NAMES = ['Pre Prep', 'Table Read', 'Scout', 'Stage Lock', 'Rigging', 'Fitting', 'Camera Test'];
  function boxes(){ return KEYS.map(function (k) { var b = el('wknum-' + k); return b ? (b.checked ? 'on' : 'off') : '-'; }).join(','); }
  function units(){ return KEYS.map(function (k) { return (el('unit-' + k) || {}).value || '-'; }).join(','); }
  function shown(e){ var l = e && e.closest('label'); return !!l && getComputedStyle(l).display !== 'none'; }
  async function settle(){
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (el('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode){ el(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  async function toMonth(label){
    if(!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if(my === label) return settle();
      var btn = el(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // Waterfall: row date -> the phase texts in that row, sorted. Only cells that begin with one of the calendar's
  // phase names count, so the date and note columns stay out of it.
  function sheetRows(){
    var map = {};
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = null, cells = [];
      Array.from(tr.children).forEach(function (td) {
        var t = txt(td);
        if(/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(t)){ date = t; return; }
        if(NAMES.some(function (n) { return t.indexOf(n) === 0; })) cells.push(t);
      });
      if(date && cells.length) map[date] = cells.sort();
    });
    return map;
  }
  // Month: the distinct pill texts of one phase in the month on screen.
  function pillTexts(k){
    return uniq(Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="' + k + '"]')).map(txt));
  }
  function monthPills(){
    var o = {prePrep: pillTexts('prePrep')};
    KEYS.forEach(function (k) { o[k] = pillTexts(k); });
    return o;
  }
  // The month on screen as {iso: {cell, week, col, sunday}}: mvmenu's arithmetic, every cell dated from its row's
  // Sunday through the row's first in-month cell.
  function monthCells(){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var map = {};
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-body > .mv-week'), function (wk) {
      var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(inIdx < 0) return;
      var d = +txt(cells[inIdx].querySelector('.mv-daynum'));
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), d) - inIdx * 86400000;
      [].forEach.call(cells, function (c, i) {
        map[new Date(sunday + i * 86400000).toISOString().slice(0, 10)] = {cell: c, week: wk, col: i, sunday: sunday};
      });
    });
    return map;
  }
  async function bringIntoView(e){
    var pp = document.querySelector('.preview-panel');
    var r = e.getBoundingClientRect(), q = pp ? pp.getBoundingClientRect() : {top: 0, bottom: innerHeight, height: innerHeight};
    if(pp && (r.top < q.top + 20 || r.bottom > q.bottom - 20)){
      pp.scrollTop += (r.top + r.height / 2) - (q.top + q.height / 2);
      await T.sleep(250);
    }
  }
  // A right-click on a day's number band, hit-tested as Chrome sends it (mvmenu's rclickAt).
  async function rclickDay(iso){
    var m = monthCells()[iso];
    if(!m) throw new Error('no cell for ' + iso);
    await bringIntoView(m.cell);
    m = monthCells()[iso];
    var r = m.cell.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + 8);
    var t = document.elementFromPoint(x, y);
    var base = {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2};
    t.dispatchEvent(new MouseEvent('mousedown', base));
    t.dispatchEvent(new MouseEvent('contextmenu', base));
    t.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    await T.until(function () { return !!document.querySelector('.day-menu'); }, 'the day menu on ' + iso, 40, 100);
    return document.querySelector('.day-menu');
  }
  function closeMenu(){ document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); }
  function choose(id){
    var b = document.querySelector('.day-menu [data-item="' + id + '"]');
    if(!b) throw new Error('no item ' + id);
    b.click();
  }
  function lastCustomKey(){
    var rows = document.querySelectorAll('#custom-phase-rows .phase-row[data-key]');
    return rows.length ? rows[rows.length - 1].getAttribute('data-key') : null;
  }
  async function undo(){ el('undo-btn').click(); await settle(); }

  // What the restored calendar must say, worked by hand from the calendar above.
  var WANT_SHEET = {
    '3/1/27':  ['Pre Prep Wk 1', 'Stage Lock'],
    '3/8/27':  ['Pre Prep Wk 2', 'Rigging wk 1', 'Stage Lock', 'Table Read'],
    '3/15/27': ['Pre Prep Wk 3', 'Rigging wk 2', 'Scout'],
    '3/22/27': ['Fitting', 'Scout'],
    '3/29/27': ['Camera Test wk 1']
  };
  var WANT_MONTH = {
    prePrep: ['Pre Prep Week 1', 'Pre Prep Week 2', 'Pre Prep Week 3'],
    custom1: ['Table Read'], custom2: ['Scout'], custom3: ['Stage Lock'],
    custom4: ['Rigging Week 1', 'Rigging Week 2'], custom5: ['Fitting'], custom6: ['Camera Test Week 1']
  };

  try {
    await T.appReady();
    var st = (new URL(location.href)).searchParams.get('state') || '';
    out.run = st ? 'restore' : 'live';

    if(!st){
      // ---------------- LIVE: build it through the UI ----------------
      T.set('start-prePrep', '2027-03-01'); T.set('weeks-prePrep', '3');
      for(var i = 0; i < 4; i++){ el('add-phase-btn').click(); await T.sleep(80); }
      out.fresh = boxes();
      check(out.fresh === 'on,on,on,on,-,-', 'a new custom phase starts with Number weeks ticked');
      check(!el('wknum-prePrep') && !el('wknum-production') && !el('wknum-post'), 'R2: the built-in phases have no Number weeks box');

      T.set('name-custom1', 'Table Read'); T.set('unit-custom1', 'days');
      check(!el('wknum-custom1').checked, 'By -> Days unticks Number weeks');
      T.set('start-custom1', '2027-03-10'); T.set('days-custom1', '1');
      T.set('name-custom2', 'Scout'); T.set('unit-custom2', 'dates');
      check(!el('wknum-custom2').checked, 'By -> Dates unticks Number weeks');
      T.set('start-custom2', '2027-03-18'); T.set('end-custom2', '2027-03-22');
      T.set('name-custom3', 'Stage Lock'); T.set('start-custom3', '2027-03-01'); T.set('weeks-custom3', '2');
      var b3 = el('wknum-custom3'); b3.checked = false;
      ['input', 'change'].forEach(function (t) { b3.dispatchEvent(new Event(t, {bubbles: true})); });
      T.set('name-custom4', 'Rigging'); T.set('start-custom4', '2027-03-08'); T.set('weeks-custom4', '2');
      await settle();

      // Shown in every unit (it carries no pu-* class), and reachable by a real pointer.
      out.shown = ['custom1', 'custom2', 'custom3'].map(function (k) { return shown(el('wknum-' + k)); });
      check(out.shown.join() === 'true,true,true', 'the box shows in Days, Dates and Weeks');
      var tb = document.querySelector('.side-tab-btn[data-tab="phases"]'); if(tb) tb.click(); await T.sleep(150);
      var cb = el('wknum-custom2'); cb.scrollIntoView({block: 'center'}); await T.sleep(100);
      var r = cb.getBoundingClientRect();
      out.reachable = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).indexOf(cb) !== -1;
      check(out.reachable, 'the Number weeks checkbox is hit-testable');

      // The day menu's two add items (MONTH-CONTEXT-MENU-PLAN step 1).
      await toMonth('March 2027');
      await rclickDay('2027-03-26'); choose('phase-day'); await settle();
      var k5 = lastCustomKey();
      out.dayItem = {key: k5, unit: (el('unit-' + k5) || {}).value, box: (el('wknum-' + k5) || {}).checked};
      check(k5 === 'custom5' && out.dayItem.unit === 'dates' && out.dayItem.box === false, 'Add 1-day phase here: a Dates phase with Number weeks unticked');
      T.set('name-custom5', 'Fitting');
      await toMonth('March 2027');
      await rclickDay('2027-03-29'); choose('phase-week'); await settle();
      var k6 = lastCustomKey();
      out.weekItem = {key: k6, unit: (el('unit-' + k6) || {}).value, box: (el('wknum-' + k6) || {}).checked};
      check(k6 === 'custom6' && out.weekItem.unit === 'weeks' && out.weekItem.box === true, 'Add 1-week phase here: a Weeks phase with Number weeks ticked');
      T.set('name-custom6', 'Camera Test');
      await view('sheet');
      out.health = T.appHealth();
    }

    // ---------------- BOTH RUNS: the calendar as it stands ----------------
    if(st){
      await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 3; }, 'the restored grid', 200, 100);
      await T.sleep(1200);
      out.health = T.appHealth();
    }
    if(document.querySelector('#table-wrap .mv-daygrid')) await view('sheet');
    out.boxes = boxes(); out.units = units();
    check(out.boxes === 'off,off,off,on,off,on', 'each phase\'s box as built');
    check(out.units === 'days,dates,weeks,weeks,dates,weeks', 'each phase\'s unit as built');
    out.sheet = sheetRows();
    Object.keys(WANT_SHEET).forEach(function (d) {
      check(same(out.sheet[d], WANT_SHEET[d]), 'waterfall row ' + d + ': ' + WANT_SHEET[d].join(' | '));
    });
    await toMonth('March 2027');
    out.month = monthPills();
    Object.keys(WANT_MONTH).forEach(function (k) {
      check(same(out.month[k], WANT_MONTH[k]), 'month pills ' + k + ': ' + WANT_MONTH[k].join(' | '));
    });
    // The day menu's header names the bar the way its pill does (dayFacts -> prodWeekLabel).
    await rclickDay('2027-03-10');
    out.menuCtx = txt(document.querySelector('.day-menu .day-menu-ctx'));
    closeMenu(); await T.sleep(200);
    check(/Table Read/.test(out.menuCtx) && !/Table Read Week/.test(out.menuCtx) && /Rigging Week 1/.test(out.menuCtx),
          'the day menu\'s header: "Table Read", and "Rigging Week 1" beside it');

    if(st){
      // ---------------- RESTORE: the exports ----------------
      await view('sheet');
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var cellTexts = [];
      wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) {
        // A merge reports its master's value from every cell it covers: count each merge once.
        if(c.isMerged && c.master && c.master.address !== c.address) return;
        var v = c.value; if(v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
        if(typeof v === 'string' && NAMES.some(function (n) { return v.indexOf(n) === 0; })) cellTexts.push(v.trim());
      }); }); });
      out.xlsxCells = cellTexts.slice().sort();
      var count = function (s) { return cellTexts.filter(function (x) { return x === s; }).length; };
      check(count('Table Read') === 1 && count('Stage Lock') === 2 && count('Scout') === 2 && count('Fitting') === 1,
            'Excel: the unnumbered phases are their bare names (Scout and Stage Lock on two rows each)');
      check(count('Rigging wk 1') === 1 && count('Rigging wk 2') === 1 && count('Camera Test wk 1') === 1 && count('Pre Prep Wk 3') === 1,
            'Excel: the numbered phases keep "wk N"');
      check(!cellTexts.some(function (x) { return /^(Table Read|Scout|Stage Lock|Fitting) wk/.test(x); }), 'Excel: no "wk N" on an unnumbered phase');
      try {
        var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
        out.pdf = T.b64(await pb.arrayBuffer());
      } catch (e) { out.pdfErr = String(e && e.message || e); }
      check(!out.pdfErr, 'the waterfall PDF exported');
      // The month PDF through its real Save dialog: the direct writer, which parses renderMonthView's HTML.
      await toMonth('March 2027');
      var rec = T.fakeSavePicker();
      try {
        await T.sleep(700);
        el('export-btn').click();
        await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
      } catch (e) { out.monthPdfErr = String(e && e.message || e); }
      rec.restore();
      var mf = rec.files.filter(function (f) { return f.closed; })[0];
      if(mf){ out.pdfs = {month: T.b64(mf.bytes.buffer)}; out.monthPdfPages = T.pdfPages(mf.bytes); }
      check(!!mf && out.monthPdfPages > 0, 'the month PDF was written');
      await view('sheet');

      // ---------------- RESTORE: undo, and the flips on a loaded calendar ----------------
      var base = {boxes: boxes(), units: units()};
      // Unticking by hand is one step; one undo puts the text back.
      var b4 = el('wknum-custom4'); b4.checked = false;
      ['input', 'change'].forEach(function (t) { b4.dispatchEvent(new Event(t, {bubbles: true})); });
      await settle();
      out.untick = sheetRows()['3/8/27'];
      check(same(out.untick, ['Pre Prep Wk 2', 'Rigging', 'Stage Lock', 'Table Read']), 'unticking Rigging drops its "wk N" in the waterfall');
      await undo();
      check(same({boxes: boxes(), units: units()}, base) && same(sheetRows()['3/8/27'], WANT_SHEET['3/8/27']), 'one undo puts the box and the text back');
      // By -> Dates on a ticked Weeks phase: unticked, and ONE undo restores the unit AND the box.
      T.set('unit-custom4', 'dates'); await settle();
      out.toDates = {unit: el('unit-custom4').value, box: el('wknum-custom4').checked};
      check(out.toDates.unit === 'dates' && out.toDates.box === false, 'By -> Dates on Rigging unticks it');
      await undo();
      check(same({boxes: boxes(), units: units()}, base), 'one undo restores the unit and the box together');
      // Back to Weeks ticks it (owner Q2), and Days <-> Dates keeps what the user set.
      T.set('unit-custom2', 'weeks'); await settle();
      check(el('wknum-custom2').checked === true, 'By -> Weeks ticks it again (Q2)');
      await undo();
      var b1 = el('wknum-custom1'); b1.checked = true;
      ['input', 'change'].forEach(function (t) { b1.dispatchEvent(new Event(t, {bubbles: true})); });
      await settle();
      T.set('unit-custom1', 'dates'); await settle();
      check(el('unit-custom1').value === 'dates' && el('wknum-custom1').checked === true, 'Days -> Dates keeps a box the user ticked');
      await undo(); await undo();
      check(same({boxes: boxes(), units: units()}, base), 'two undos put Table Read back as it was');

      // The month edge drag's Weeks -> Dates switch leaves the box alone (owner Q3). Rigging's END, one day left.
      await toMonth('March 2027');
      var pills4 = Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="custom4"]'));
      var lastPill = pills4[pills4.length - 1], cell = document.querySelector('#table-wrap .mv-daycell');
      out.edge = {pills: pills4.length};
      if(lastPill && cell){
        await bringIntoView(lastPill);
        var pr = lastPill.getBoundingClientRect(), dayW = cell.getBoundingClientRect().width;
        var hx = pr.right - 4, hy = pr.top + pr.height / 2;
        lastPill.dispatchEvent(new MouseEvent('mousemove', {clientX: pr.left + pr.width / 2, clientY: hy, bubbles: true}));
        await T.sleep(100);
        var h = document.querySelector('.phase-edge-handle[data-ph="custom4"][data-edge="end"]:not([hidden])');
        out.edge.handle = !!h;
        if(h){
          var hr = h.getBoundingClientRect(); hx = hr.left + hr.width / 2;
          h.dispatchEvent(new MouseEvent('mousedown', {clientX: hx, clientY: hy, button: 0, buttons: 1, bubbles: true, cancelable: true}));
          window.dispatchEvent(new MouseEvent('mousemove', {clientX: hx - dayW, clientY: hy, button: 0, buttons: 1, bubbles: true, cancelable: true}));
          window.dispatchEvent(new MouseEvent('mouseup', {clientX: hx - dayW, clientY: hy, button: 0, buttons: 0, bubbles: true}));
          await settle();
        }
      }
      out.edge.unit = el('unit-custom4').value; out.edge.end = (el('end-custom4') || {}).value; out.edge.box = el('wknum-custom4').checked;
      out.edge.pills = pillTexts('custom4');
      check(out.edge.unit === 'dates' && out.edge.end === '2027-03-18' && out.edge.box === true && same(out.edge.pills, WANT_MONTH.custom4),
            'Q3: the end drag switches Rigging to Dates (ends Thu 3/18) and keeps its week numbers');
      await undo();
      check(same({boxes: boxes(), units: units()}, base), 'one undo puts the dragged phase back in Weeks');
      await view('sheet');

      // ---------------- RESTORE: the M-5 shape ----------------
      // customunits.sptcal has no wknum- ids. Loaded after a calendar with unticked boxes, every one of its custom
      // phases must come back ticked (the rows are rebuilt fresh; this proves it rather than arguing it).
      var p = T.openViaFakePicker('/tests/fixtures/customunits.sptcal', 'customunits.sptcal', {writes: []});
      for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
      await p; await T.sleep(1500); await settle();
      out.older = {boxes: ['custom1', 'custom2', 'custom3', 'custom4', 'custom5'].map(function (k) { var b = el('wknum-' + k); return b ? b.checked : '-'; }).join(),
                   names: (el('name-custom2') || {}).value};
      var olderRows = [];
      document.querySelectorAll('#table-wrap table.sheet-table tbody td').forEach(function (td) { var t = txt(td); if(/^Read-through/.test(t)) olderRows.push(t); });
      out.older.readThrough = olderRows;
      check(out.older.names === 'Read-through' && out.older.boxes === 'true,true,true,true,-', 'an older calendar loaded after this one: every box ticked');
      check(same(olderRows, ['Read-through wk 1', 'Read-through wk 2']), '...and its Days phase still reads "wk N"');
    }

    if(!st){
      // ---------------- MINT: save through the real Save path ----------------
      await view('sheet');                               // viewMode is saved state: the fixture opens on the waterfall
      var written = [];
      var hnd = { name: 'phasenumbering.sptcal', kind: 'file',
        queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
        isSameEntry: async function(o){ return o === hnd; },
        getFile: async function(){ return new File([written.length ? written[written.length - 1] : ''], 'phasenumbering.sptcal', {lastModified: 1}); },
        createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
      window.showSaveFilePicker = async function(){ return hnd; };
      el('save-file-btn').click();
      await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
      var snap = JSON.parse(written[0]);
      out.text = written[0];
      var fc = function (id) { var v = snap.fields.byId[id]; return v && typeof v === 'object' ? v.checked : undefined; };
      out.savedBoxes = KEYS.map(function (k) { return fc('wknum-' + k); });
      check(same(out.savedBoxes, [false, false, false, true, false, true]), 'the boxes are in fields.byId as {checked}');
    }
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
