// doubleups -- double-up days ("10+1"), a second crew's day on the next episode's shoot (DOUBLE-UP-DAYS-PLAN.md).
//
// FOUR RUNS, chosen by the starting state:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh doubleups 300
//     LIVE. The reference calendar (T.buildFixture): the card under Production, month view only, no id on any control,
//     "None" by default and no pill; a default typed in its box draws a pill per episode but the last, and back at none the
//     calendar saves byte for byte what it did (lastEdited aside); one undo per edit; typed counts are the episode's own
//     (R19: number boxes like Prep's, not − / +; the card's two explanatory lines are gone).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=doubleups ./run.sh doubleups 600
//     RESTORE. The hand trace below; the join (R6), the colour (R7), the menu (R11), the double-click (R12), the drag
//     and its drop rules (R8, R9), a move kept by shoot day through Shift (R10), Production's days untouched (R17),
//     Save / Load / Undo, the M-5 trap, and the workbook and waterfall PDF exported with double-ups on and off (R13),
//     which gate.sh holds byte-identical.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=doubleups-blocks ./run.sh doubleups 300
//     BLOCKS (episodeprep-blocks.sptcal plus a default of 1). The same rules per block: "Tandem Block 1", none for the
//     last block.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=doubleups-half ./run.sh doubleups 300
//     HALF (halfdays.sptcal plus a default of 1). R15: with a .5 count, the double-up starts on the first FULL day after
//     the switch day; and R6 with two double-ups in one week.
//
// THE CALENDAR (tests/fixtures/doubleups.sptcal: episodeprep.sptcal's made-up 2027 show with Production moved to start on
// Wednesday 2/24/27, Snap to Mon off, prep 3 days with no overrides, and the double-up keys; see the fixtures README):
//   Atlanta (US-GEN); 6 episodes x 5 days, shooting order 302, 301, 304, 303, 306, 305; one LOCKED all-phase hiatus the
//   week of Mon 3/15/27; Good Friday 3/26/27 is a union holiday. The shoot, 30 days, as slots on its line:
//     302  0-4   2/24 2/25 2/26 3/1 3/2         301  5-9   3/3 3/4 3/5 3/8 3/9
//     304 10-14  3/10 3/11 3/12 [hiatus] 3/22 3/23
//     303 15-19  3/24 3/25 [GF] 3/29 3/30 3/31  306 20-24  4/1 4/2 4/5 4/6 4/7
//     305 25-29  4/8 4/9 4/12 4/13 4/14 (wrap)  after wrap: 4/15 (slot 30), 4/16 (31), 4/19 (32)
//   Double-ups: default 1; 304 its own 2 named "Tandem"; 303 moved to shoot day 27; 305 (the last) its own 1.
//     Double-up 302  3/3          joined (slot 5)        Double-up 301  3/10        joined (slot 10)
//     Tandem 304     3/24 3/25    joined (slots 15, 16)  Double-up 303  4/9         moved to day 27 (slot 26, 305's)
//     Double-up 306  4/8          joined (slot 25)       Double-up 305  4/14        the last: beside its own last day
//   Shift +1 week (the hiatus is locked, so the shoot re-flows around it): slots 0-29 are
//     3/3 3/4 3/5 3/8 3/9 | 3/10 3/11 3/12 3/22 3/23 | 3/24 3/25 3/29 3/30 3/31 | 4/1 4/2 4/5 4/6 4/7 | 4/8 4/9 4/12 4/13 4/14
//     | 4/15 4/16 4/19 4/20 4/21, so Double-up 303 (shoot day 27, slot 26) lands on 4/16 (R10) and 302's on 3/10.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  var DAY = 864e5;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(d){ return d.toISOString().slice(0, 10); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(700);   // past the 500 ms undo debounce, so the next action is its own step
  }
  async function undo(){ $('undo-btn').click(); await settle(); }
  function tab(name){ var b = document.querySelector('.side-tab-btn[data-tab="' + name + '"]'); if(b) b.click(); }
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await T.sleep(300); }
  function shownEl(el){ return !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none'; }

  // ---- the month view, read back -------------------------------------------------------------------
  function monthOnScreen(){
    var t = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '';
    var m = /(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/.exec(t);
    return m ? new Date(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1)) : null;
  }
  // Every pill of the month on screen, row by row.
  function rowsOnScreen(){
    var first = monthOnScreen(); if(!first) return [];
    var gs = new Date(first.getTime() - first.getUTCDay() * DAY);
    return [].map.call(document.querySelectorAll('#table-wrap .mv-body > .mv-week'), function (w, k) {
      var start = new Date(gs.getTime() + 7 * k * DAY);
      var bars = [].map.call(w.querySelectorAll('.mv-bars > .mv-pill'), function (p, idx) {
        var gc = String(p.style.gridColumn || '').split('/').map(function (x) { return parseInt(x, 10); });
        var days = [];
        for(var c = gc[0] - 1; c <= gc[1] - 2; c++) days.push(iso(new Date(start.getTime() + c * DAY)));
        var sp = p.querySelector('.mv-pill-block'), txt = '';
        p.childNodes.forEach(function (n) { if(n !== sp) txt += n.textContent; });
        var st = p.getAttribute('style') || '';
        return {el: p, ph: p.getAttribute('data-ph') || '', du: p.getAttribute('data-du') || '', line: p.getAttribute('data-du-line') === '1',
                text: txt.trim(), cols: String(p.style.gridColumn).replace(/\s+/g, ''), lane: parseInt(p.style.gridRow, 10), days: days,
                bg: p.style.backgroundColor, ink: p.style.color,
                joinL: /border-top-left-radius:0; border-bottom-left-radius:0; margin-left:0;/.test(st),
                joinR: /border-top-right-radius:0; border-bottom-right-radius:0; margin-right:0;/.test(st)};
      });
      return {start: iso(start), bars: bars};
    });
  }
  async function toFirstMonth(){
    await view('month');
    await T.until(function () { return !!monthOnScreen(); }, 'the month grid', 100, 100);
    for(var g = 0; g < 40; g++){ var a = monthOnScreen().getTime(); $('mv-prev').click(); await T.sleep(60); if(monthOnScreen().getTime() === a) break; }
  }
  async function eachMonth(fn){
    await toFirstMonth();
    for(var h = 0; h < 40; h++){
      fn(monthOnScreen(), rowsOnScreen());
      var b = monthOnScreen().getTime(); $('mv-next').click(); await T.sleep(60);
      if(monthOnScreen().getTime() === b) break;
    }
  }
  async function toMonth(label){
    await toFirstMonth();
    for(var h = 0; h < 40; h++){
      var mo = monthOnScreen();
      if(MONTHS[mo.getUTCMonth()] + ' ' + mo.getUTCFullYear() === label) return true;
      $('mv-next').click(); await T.sleep(80);
      if(monthOnScreen().getTime() === mo.getTime()) return false;
    }
    return false;
  }
  // double-up label -> its sorted dates, across every month (a spillover day is in two pages: one key either way).
  async function duMap(){
    var m = {};
    await eachMonth(function (mo, rows) {
      rows.forEach(function (r) { r.bars.forEach(function (b) {
        if(!b.du) return;
        (m[b.text] = m[b.text] || {});
        b.days.forEach(function (d) { m[b.text][d] = 1; });
      }); });
    });
    var o = {};
    Object.keys(m).sort().forEach(function (k) { o[k] = Object.keys(m[k]).sort().join(','); });
    return o;
  }
  function wantMap(w){ var o = {}; Object.keys(w).sort().forEach(function (k) { o[k] = w[k].slice().sort().join(','); }); return o; }
  function sameMap(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function mapDiff(a, b){
    var o = {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) { if(a[k] !== b[k]) o[k] = {got: a[k] || null, want: b[k] || null}; });
    return o;
  }
  // Production's own bars, text and days (not lanes: a double-up drops the next episode a line in its week, by design).
  async function prodBars(){
    var o = [];
    await eachMonth(function (mo, rows) {
      rows.forEach(function (r) { r.bars.forEach(function (b) { if(b.ph === 'production') o.push(iso(mo) + '|' + b.text + '|' + b.days.join(',')); }); });
    });
    return o;
  }
  // The pill element of a double-up on a date, on the month page on screen.
  function duPillOn(text, day){
    var hit = null;
    rowsOnScreen().forEach(function (r) { r.bars.forEach(function (b) { if(b.du && b.text === text && b.days.indexOf(day) >= 0 && !hit) hit = b; }); });
    return hit;
  }
  function cellOf(day){
    var first = monthOnScreen(), gs = new Date(first.getTime() - first.getUTCDay() * DAY);
    var cells = document.querySelectorAll('#table-wrap .mv-body > .mv-week > .mv-daygrid > .mv-daycell');
    for(var i = 0; i < cells.length; i++){ if(iso(new Date(gs.getTime() + i * DAY)) === day) return cells[i]; }
    return null;
  }
  function centre(el){ var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  // A drag of a double-up pill (held by its first day) onto a day, by mouse events, as a pointer would.
  async function dragDu(text, fromDay, toDay){
    var b = duPillOn(text, fromDay), c = cellOf(toDay);
    if(!b || !c) throw new Error('dragDu: no pill ' + text + ' on ' + fromDay + ' or no cell ' + toDay);
    var r = b.el.getBoundingClientRect(), x0 = r.left + 6, y0 = r.top + r.height / 2;
    var cr = c.getBoundingClientRect(), x1 = cr.left + 8, y1 = cr.top + cr.height / 2;
    b.el.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, clientX: x0, clientY: y0, button: 0, buttons: 1}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: x0 + 6, clientY: y0, buttons: 1}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: x1, clientY: y1, buttons: 1}));
    var mid = {boxes: document.querySelectorAll('.du-drop-box').length, target: document.querySelectorAll('.du-drop-box.is-target').length,
               bad: document.querySelectorAll('.du-drop-box.is-bad').length, nodrop: document.querySelectorAll('.du-drop-box.is-nodrop').length,
               ghost: document.querySelectorAll('.mv-drag-ghost').length};
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: x1, clientY: y1, button: 0}));
    await settle();
    mid.toast = ((document.querySelector('.du-toast') || {}).textContent || '');
    mid.after = document.querySelectorAll('.du-drop-box, .mv-drag-ghost').length;
    return mid;
  }
  // A tandem's grip (owner, 17 Nov 2026, "Both ends"): hover the pill, press its start or end grip, move to a day.
  // `esc` presses Escape before letting go. Returns what was shown and done.
  async function gripDrag(text, fromDay, edge, toDay, esc){
    var b = duPillOn(text, fromDay); if(!b) throw new Error('gripDrag: no pill ' + text + ' on ' + fromDay);
    b.el.scrollIntoView({block: 'center'}); await T.sleep(150);
    var r = b.el.getBoundingClientRect();
    b.el.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2}));
    var shown = [].filter.call(document.querySelectorAll('.phase-edge-handle[data-ph="doubleUp"]'), function (h) { return !h.hidden; });
    var h = shown.filter(function (x) { return x.getAttribute('data-edge') === edge; })[0];
    var info = {edges: shown.map(function (x) { return x.getAttribute('data-edge'); }).join(), ids: shown.filter(function (x) { return x.id; }).length};
    if(!h) return info;
    var hr = h.getBoundingClientRect(), c = cellOf(toDay), cr = c.getBoundingClientRect();
    h.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, clientX: hr.left + 5, clientY: hr.top + 5, button: 0, buttons: 1}));
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: cr.left + cr.width / 2, clientY: hr.top + 5, buttons: 1}));
    await T.sleep(200);
    if(esc) document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: cr.left + cr.width / 2, clientY: hr.top + 5, button: 0}));
    await settle();
    info.done = true;
    return info;
  }
  async function menuOn(text, day){
    var b = duPillOn(text, day), p = centre(b.el);
    b.el.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 2}));
    await T.sleep(200);
    var m = document.querySelector('.day-menu');
    return m ? {el: m, items: [].map.call(m.querySelectorAll('.day-menu-item'), function (x) { return x.getAttribute('data-item'); }),
                head: ((m.querySelector('.day-menu-head') || {}).innerText || '').replace(/\s+/g, ' ').trim()} : null;
  }
  async function menuPick(m, item){ var b = m.el.querySelector('[data-item="' + item + '"]'); b.click(); await settle(); }
  function closeMenu(){ document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true})); }

  // ---- the card --------------------------------------------------------------------------------------
  function card(){ return $('du-row'); }
  // Each row as it reads: `n` is the count the box shows, typed or (blank) its placeholder, the default or "–" for none.
  function cardList(){
    return [].map.call(document.querySelectorAll('#du-row .du-unit-row'), function (r) {
      var v = r.querySelector('.du-unit-days'), n = r.querySelector('.du-unit-name');
      return {id: r.dataset.id, tag: r.querySelector('.du-unit-tag').textContent, n: v.value || v.placeholder, typed: v.value, own: v.classList.contains('is-edited'),
              name: n.value, ph: n.placeholder, nameOwn: n.classList.contains('is-own'), last: r.dataset.last === '1'};
    });
  }
  // R19: the counts are number boxes (Prep's), typed into.
  function setVal(el, v){
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true}));
  }
  function cardBox(id){
    return id ? [].find.call(document.querySelectorAll('#du-row .du-unit-row'), function (r) { return r.dataset.id === id; }).querySelector('.du-unit-days')
              : document.querySelector('#du-row .du-default-in');
  }
  function cardType(id, v){ setVal(cardBox(id), v); }
  function noIds(){ return document.querySelectorAll('#du-row input[id], #du-row button[id], #du-row select[id], #du-row textarea[id]').length; }

  // ---- Save and Load through the real paths (episodeprep's) ------------------------------------------
  var written = [];
  function textOf(w){ return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'doubleups.sptcal', kind: 'file',
    queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
    isSameEntry: async function(o){ return o === saveHandle; },
    getFile: async function(){ return new File([written.length ? textOf(written[written.length - 1]) : ''], 'doubleups.sptcal', {lastModified: 1}); },
    createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
  async function save(){
    var n = written.length;
    window.showSaveFilePicker = async function(){ return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return textOf(written[written.length - 1]);
  }
  var loads = 0;
  function menuLabel(){ return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text){
    var stem = 'du-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/tests/fixtures/doubleups.sptcal', name, {text: text, writes: written});
    for(var i = 0; i < 40; i++){ await T.sleep(100); if(T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file’s name in the file menu', 100, 100);
    await settle();
  }
  function noStamp(text){ var s = JSON.parse(text); delete s.lastEdited; return JSON.stringify(s); }
  async function exportsNow(tag){
    await view('sheet');
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob (' + tag + ')');
    out['xlsx' + tag] = T.b64(await xb.arrayBuffer());
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob (' + tag + ')');
    out['pdf' + tag] = T.b64(await pb.arrayBuffer());
    out['grid' + tag] = T.gridSignature();
    await view('month');
  }

  var WANT = wantMap({
    'Tandem 302': ['2027-03-03'], 'Tandem 301': ['2027-03-10'], 'Tandem 304': ['2027-03-24', '2027-03-25'],
    'Tandem 303': ['2027-04-09'], 'Tandem 306': ['2027-04-08'], 'Tandem 305': ['2027-04-14'],
  });
  var WANT_SHIFT = wantMap({
    'Tandem 302': ['2027-03-10'], 'Tandem 301': ['2027-03-24'], 'Tandem 304': ['2027-04-01', '2027-04-02'],
    'Tandem 303': ['2027-04-16'], 'Tandem 306': ['2027-04-15'], 'Tandem 305': ['2027-04-21'],
  });

  try {
    await T.appReady();
    var st = (new URL(location.href)).searchParams.get('state') || '';
    out.run = st === 'doubleups' ? 'restore' : st === 'doubleups-blocks' ? 'blocks' : st === 'doubleups-half' ? 'half' : 'live';

    if(out.run === 'live'){
      // ================= LIVE =================
      T.buildFixture();
      await settle();
      out.health = T.appHealth();
      await view('sheet'); await T.sleep(200);
      check(!!card() && !shownEl(card()), 'L0 the Double-ups card exists and is hidden in the waterfall (month view only, R1)');
      await view('month'); tab('phases'); await T.sleep(300);
      var prodRow = $('swatch-production').closest('.phase-row');
      check(shownEl(card()) && prodRow.nextElementSibling === card(), 'L1 in the month view it shows, directly UNDER Production (R1)');
      check(noIds() === 0, 'L2 no id on any of its controls (gate 5 cannot move)');
      out.l3 = {meta: card().querySelector('.du-meta').textContent, dflt: cardBox(null).value, dph: cardBox(null).placeholder,
                name: card().querySelector('.du-name-input').value, list: cardList().length, pills: document.querySelectorAll('#table-wrap .mv-pill[data-du]').length,
                boxes: card().querySelectorAll('input[type="number"]').length, buttons: card().querySelectorAll('.du-body button, .du-fields button').length,
                notes: (card().querySelector('.du-body') || {}).innerText};
      check(out.l3.meta === 'None yet' && out.l3.dflt === '' && out.l3.dph === 'None' && out.l3.name === 'Tandem' && out.l3.list === 10 && out.l3.pills === 0,
            'L3 a new calendar has none: "None yet", the default box blank ("None"), the card head reads "Tandem" (R21), 10 episodes listed, no pill');
      check(out.l3.boxes === 11 && out.l3.buttons === 0 && !/Bold = its own|joined to the end of its shoot/.test(out.l3.notes || ''),
            'L3 (R19) the counts are number boxes like every other phase’s (the default and one per episode), no − / + buttons, and no explanatory lines');
      var before = await save();
      var s0 = JSON.parse(before);
      check(!('doubleUps' in s0) && !s0.episodeDefs.some(function (e) { return 'doubleUpDays' in e || 'doubleUpName' in e; }),
            'L4 its Save carries no doubleUps key and no per-episode double-up field');
      cardType(null, '1'); await settle();
      out.l5 = {dflt: cardBox(null).value, list: cardList(), map: await duMap()};
      check(out.l5.dflt === '1' && out.l5.list.filter(function (x) { return x.n === '1' && !x.typed; }).length === 9 && out.l5.list[9].n === '–'
            && out.l5.list[9].last && Object.keys(out.l5.map).length === 9 && !out.l5.map['Tandem 210'],
            'L5 a default of 1 gives every episode but the LAST a 1-day double-up (R5), shown as each box’s placeholder; 9 pills, none for 210');
      await undo();
      out.l6 = {dflt: cardBox(null).value, pills: document.querySelectorAll('#table-wrap .mv-pill[data-du]').length};
      check(out.l6.dflt === '' && out.l6.pills === 0, 'L6 one Undo takes it back to none');
      cardType(null, '1'); await settle(); cardType(null, ''); await settle();
      var after = await save();
      check(noStamp(before) === noStamp(after), 'L7 ⭐ back at none, the calendar saves byte for byte what it saved before (the Date Last Edited stamp aside)');
      // A unit's own count (Prep's rule): typed is its own, in bold, even when it equals the default; blank is the default.
      cardType(null, '1'); await settle();
      var last = cardList()[9];
      cardType(last.id, '1'); await settle();
      out.l8 = cardList()[9];
      cardType(cardList()[0].id, '1'); await settle();
      out.l8a = cardList()[0];
      var s8 = JSON.parse(await save());
      cardType(cardList()[0].id, ''); await settle();
      out.l8b = cardList()[0];
      var s8b = JSON.parse(await save());
      check(out.l8.n === '1' && out.l8.own && out.l8a.own && out.l8a.n === '1' && s8.episodeDefs[0].doubleUpDays === 1
            && !out.l8b.own && out.l8b.typed === '' && out.l8b.n === '1' && !('doubleUpDays' in s8b.episodeDefs[0]),
            'L8 a number typed is that episode’s own (bold), the last one’s and one equal to the default alike; cleared, it is the default again and leaves the file');
      cardType(cardList()[1].id, '2.5'); await settle();
      out.l9 = {err: (cardBox(cardList()[1].id).closest('.du-unit-row') || {}).getAttribute && cardBox(cardList()[1].id).closest('.du-unit-row').getAttribute('data-whole-err'),
                invalid: cardBox(cardList()[1].id).classList.contains('is-invalid')};
      check(out.l9.err === 'Whole days only' && out.l9.invalid, 'L9 a fraction is ringed "Whole days only", as Prep’s boxes are');

      // ---- Show info's Tandem Days box (owner, 19 Nov 2026; Sidebar.jsx TandemDaysBox): the card's default, a 2nd time ----
      cardType(cardList()[1].id, ''); await settle();
      cardType(null, ''); await settle();
      tab('show'); await T.sleep(300);
      var siBoxes = function () { return [].slice.call(document.querySelectorAll('.si-tandem-in')); };
      var siShown = function () { return siBoxes().filter(shownEl)[0]; };
      var siVals = function () { return siBoxes().map(function (b) { return b.value; }).join(); };
      var lineOf = function (box, days) {
        var a = box.getBoundingClientRect(), b = $(days).getBoundingClientRect(), lab = $(days + '-label').getBoundingClientRect();
        return {sameLine: Math.abs(a.bottom - b.bottom) < 0.5 && a.left > b.right, labelOneLine: lab.height < 20,
                plus: !!box.closest('.si-days-tandem').querySelector('.si-plus svg')};
      };
      var sb = siShown();
      out.si0 = {n: siBoxes().length, ids: siBoxes().filter(function (b) { return b.id; }).length, line: sb && lineOf(sb, 'shoot-days-per-ep'),
                 ph: sb && sb.placeholder, val: siVals(), label: sb && sb.closest('.si-tandem').textContent.trim()};
      check(out.si0.n === 2 && out.si0.ids === 0 && sb && sb.closest('.show-mode-episodes') && out.si0.line.sameLine && out.si0.line.labelOneLine
            && out.si0.line.plus && out.si0.ph === 'None' && out.si0.val === ',' && out.si0.label === 'Tandem Days',
            'SI0 Show info: "Shooting Days per Episode" + "Tandem Days" on one line, the box blank ("None"), and NO id on either copy');
      setVal(sb, '2'); await settle();
      out.si1 = {card: cardBox(null).value, si: siVals(), ep: cardList()[2].n};
      check(out.si1.card === '2' && out.si1.si === '2,2' && out.si1.ep === '2',
            'SI1 a count typed in Show info IS the card’s default: the card reads 2, and so does every episode without its own');
      await undo();
      check(cardBox(null).value === '' && siVals() === ',', 'SI2 ...one Undo takes both back to none');
      cardType(null, '3'); await settle();
      check(siVals() === '3,3', 'SI3 a default typed on the card shows in Show info');
      var s4 = JSON.parse(await save());
      out.si4 = {days: s4.doubleUps && s4.doubleUps.days, extra: Object.keys(s4.fields.byId).filter(function (k) { return !(k in s0.fields.byId); })};
      check(out.si4.days === 3 && out.si4.extra.length === 0, 'SI4 Save writes doubleUps.days 3 and no new field: fields.byId has exactly the keys it had');
      s4.doubleUps.days = 1;
      await load(JSON.stringify(s4)); tab('show'); await T.sleep(300);
      check(siVals() === '1,1' && cardBox(null).value === '1', 'SI5 Load a file with a default of 1: Show info reads 1');
      sb = siShown();
      setVal(sb, '3.5'); await settle();
      var w = sb.closest('.si-tandem');
      out.si6 = {err: w.getAttribute('data-whole-err'), invalid: sb.classList.contains('is-invalid'), line: lineOf(sb, 'shoot-days-per-ep')};
      check(out.si6.err === 'Whole days only' && out.si6.invalid && out.si6.line.sameLine,
            'SI6 a fraction there is ringed "Whole days only" too, and the box stays in line with the days box');
      setVal(sb, '1'); await settle();
      var mode = $('show-mode'); mode.value = 'blocks'; mode.dispatchEvent(new Event('change', {bubbles: true})); await settle();
      sb = siShown();
      out.si7 = {inBlocks: !!(sb && sb.closest('.show-mode-blocks')), line: sb && lineOf(sb, 'days-per-block'), val: sb && sb.value};
      check(out.si7.inBlocks && out.si7.line.sameLine && out.si7.line.labelOneLine && out.si7.val === '1',
            'SI7 Blocks mode: "Shooting Days per Block" + "Tandem Days" on one line, the same count');
      mode.value = 'episodes'; mode.dispatchEvent(new Event('change', {bubbles: true})); await settle();
    }

    if(out.run === 'restore'){
      // ================= RESTORE =================
      await T.until(function () { return document.querySelectorAll('#du-row .du-unit-row').length === 6; }, 'the restored episode list', 200, 100);
      await settle();
      out.health = T.appHealth();
      tab('phases'); await T.sleep(200);
      out.r0 = {list: cardList(), meta: card().querySelector('.du-meta').textContent, dflt: cardBox(null).value};
      check(out.r0.list.map(function (x) { return x.tag + '=' + x.n + (x.own ? '*' : '') + (x.name ? ':' + x.name : ''); }).join()
            === '302=1,301=1,304=2*:Tandem,303=1,306=1,305=1*' && out.r0.dflt === '1',
            'R0 the card restores the default 1, 304 its own 2 named Tandem, 305 (the last) its own 1, in shooting order');
      check(out.r0.meta === '7 tandem days · 6 episodes · 302–305 · 1 moved', 'R0 its summary line: "' + out.r0.meta + '"');
      out.map = await duMap();
      check(sameMap(out.map, WANT), 'R1 every double-up matches the hand trace (default, own count, own name, moved, the last unit)');
      if(!sameMap(out.map, WANT)) out.mapDiff = mapDiff(out.map, WANT);
      // R6: the join, on March's first row (Sun 2/28): Shoot 302 Mon-Tue, Double-up 302 Wed on its line, flush; 301 below.
      await toMonth('March 2027');
      var row = rowsOnScreen()[0], p302 = row.bars.filter(function (b) { return b.ph === 'production' && b.text === 'Shoot 302'; })[0];
      var d302 = row.bars.filter(function (b) { return b.text === 'Tandem 302'; })[0], s301 = row.bars.filter(function (b) { return b.text.indexOf('Shoot 301') === 0; })[0];
      out.r2 = {p302: p302 && [p302.cols, p302.lane, p302.joinR], d302: d302 && [d302.cols, d302.lane, d302.joinL, d302.line, d302.ph], s301: s301 && [s301.cols, s301.lane]};
      check(p302 && d302 && s301 && p302.cols === '2/4' && d302.cols === '4/5' && d302.lane === p302.lane && p302.joinR && d302.joinL && d302.line
            && d302.ph === 'doubleUp' && s301.lane === p302.lane + 1,
            'R2 (R6) the double-up comes out of the end of the shoot pill on the SAME line, flush (square corners, no margin), and the next episode sits on the line below that week');
      // R18 (owner, 17 Nov 2026, "A: one faint line"): where they meet, no border on either side, padding 9 px (8 + the
      // border given up, so no box or text moves), and ONE 1 px line on the double-up's edge, a shadow in its ink at 40%.
      var cP = getComputedStyle(p302.el), cD = getComputedStyle(d302.el), rP = p302.el.getBoundingClientRect(), rD = d302.el.getBoundingClientRect();
      var tP = document.createRange(); tP.selectNodeContents(d302.el.firstChild || d302.el);
      out.r18 = {pBorderR: cP.borderRightWidth, pPadR: cP.paddingRight, pShadow: cP.boxShadow, dBorderL: cD.borderLeftWidth, dPadL: cD.paddingLeft,
                 dShadow: cD.boxShadow, meet: Math.abs(rP.right - rD.left), textX: tP.getBoundingClientRect().left - rD.left,
                 pBorderT: cP.borderTopWidth, dBorderT: cD.borderTopWidth};
      check(out.r18.pBorderR === '0px' && out.r18.pPadR === '9px' && out.r18.dBorderL === '0px' && out.r18.dPadL === '9px'
            && out.r18.pBorderT === '1px' && out.r18.dBorderT === '1px' && out.r18.meet < 0.01 && Math.abs(out.r18.textX - 9) < 0.01
            && /\/ 0\.4\) 1px 0px 0px 0px inset/.test(out.r18.dShadow) && (out.r18.pShadow.match(/inset/g) || []).length === 3
            && (out.r18.dShadow.match(/inset/g) || []).length === 4,
            'R2 (R18) where they meet, ONE faint line: no border on either side, padding 9 px (the text 9 px in, as before), the top and bottom borders kept, and a 1 px shadow line in the double-up’s ink at 40%');
      var row2 = rowsOnScreen()[1], s301b = row2.bars.filter(function (b) { return b.text.indexOf('Shoot 301') === 0; })[0];
      check(s301b && s301b.lane === p302.lane, 'R2 ...and is back on its usual line the next week');
      // R7: a darker shade of Production's own colour, following it.
      out.r3 = {bg: d302.bg, ink: d302.ink, sw: card().querySelector('.du-swatch').style.backgroundColor};
      check(out.r3.bg === 'rgb(181, 217, 158)' && out.r3.ink === 'rgb(36, 57, 23)' && out.r3.sw === out.r3.bg,
            'R3 (R7) the pill and the card’s square are the darker shade of Production’s green (#B5D99E on #243917)');
      tab('phases'); await T.sleep(150);
      $('swatch-production').click();
      await T.until(function () { return document.querySelectorAll('.phase-color-pop .pc-sw').length > 10; }, 'the colour picker', 40, 100);
      document.querySelectorAll('.phase-color-pop .pc-sw')[10].click();   // Strong blue #5B9BD5
      await settle();
      var d302b = duPillOn('Tandem 302', '2027-03-03');
      out.r3b = {bg: d302b && d302b.bg, sw: card().querySelector('.du-swatch').style.backgroundColor};
      check(d302b && out.r3b.bg !== out.r3.bg && out.r3b.bg === out.r3b.sw && /^rgb\(\d+, \d+, (\d+)\)$/.test(out.r3b.bg)
            && +out.r3b.bg.match(/(\d+)\)$/)[1] > +out.r3b.bg.match(/^rgb\((\d+)/)[1],
            'R3 recolour Production to blue and the double-ups follow it, a darker blue (' + out.r3b.bg + ')');
      await undo();
      // THE TANDEM'S OWN COLOUR (owner, 17 Nov 2026: "Allow me to change the color of tandem"): its square opens the
      // phase picker with "Follow Production" first; a pick holds even when Production is recoloured; the first swatch
      // goes back to following Production, and the file holds no pick again.
      async function duPick(k){
        tab('phases'); await T.sleep(150);
        var sq = card().querySelector('.du-swatch'); sq.scrollIntoView({block: 'center'}); await T.sleep(100);
        sq.click();
        await T.until(function () { return document.querySelectorAll('.phase-color-pop .pc-sw').length > 0; }, 'the tandem colour picker', 40, 100);
        var sws = document.querySelectorAll('.phase-color-pop .pc-sw'), info = {n: sws.length, first: sws[0].title, selected: [].findIndex.call(sws, function (x) { return x.classList.contains('selected'); })};
        sws[k].click();
        await settle();
        return info;
      }
      var cp1 = await duPick(12);          // the palette's Pink (#FF66CC on #5C0A3E), index 11, after "Follow Production"
      await toMonth('March 2027');
      var pinkPill = duPillOn('Tandem 302', '2027-03-03'), shootPill = rowsOnScreen()[0].bars.filter(function (b) { return b.text === 'Shoot 302'; })[0];
      var cs1 = JSON.parse(await save());
      out.c1 = {pop: cp1, bg: pinkPill && pinkPill.bg, ink: pinkPill && pinkPill.ink, sq: card().querySelector('.du-swatch').style.backgroundColor,
                shoot: shootPill && shootPill.bg, saved: (cs1.phaseColorOverride || {}).doubleUp};
      check(cp1.n === 15 && /^Follow Production/.test(cp1.first) && cp1.selected === 0 && out.c1.bg === 'rgb(255, 102, 204)' && out.c1.ink === 'rgb(92, 10, 62)'
            && out.c1.sq === out.c1.bg && out.c1.shoot === 'rgb(226, 240, 217)' && out.c1.saved === 11,
            'C1 the Tandem square opens the colour picker ("Follow Production" first, chosen); a pick colours every tandem pill and the square, not Production, and is saved as phaseColorOverride.doubleUp');
      tab('phases'); await T.sleep(150);
      $('swatch-production').click();
      await T.until(function () { return document.querySelectorAll('.phase-color-pop .pc-sw').length > 10; }, 'the colour picker', 40, 100);
      document.querySelectorAll('.phase-color-pop .pc-sw')[10].click();
      await settle();
      await toMonth('March 2027');
      out.c2 = (duPillOn('Tandem 302', '2027-03-03') || {}).bg;
      check(out.c2 === 'rgb(255, 102, 204)', 'C2 a picked tandem colour holds when Production is recoloured');
      await undo();
      var cp3 = await duPick(0);
      await toMonth('March 2027');
      var cs3 = JSON.parse(await save());
      out.c3 = {selected: cp3.selected, bg: (duPillOn('Tandem 302', '2027-03-03') || {}).bg, saved: cs3.phaseColorOverride};
      check(cp3.selected === 12 && out.c3.bg === 'rgb(181, 217, 158)' && !('doubleUp' in (out.c3.saved || {})),
            'C3 "Follow Production" puts it back to Production’s darker shade, and the file holds no tandem colour again');
      // R5: the last unit's double-up sits beside its own last day, loose, under its shoot pill.
      await toMonth('April 2027');
      var ar = rowsOnScreen().filter(function (r) { return r.start === '2027-04-11'; })[0];
      var s305 = ar.bars.filter(function (b) { return b.text.indexOf('Shoot 305') === 0; })[0], d305 = ar.bars.filter(function (b) { return b.text === 'Tandem 305'; })[0];
      check(s305 && d305 && d305.days.join() === '2027-04-14' && d305.lane > s305.lane && !d305.joinL && !d305.line,
            'R4 (R5) the last episode’s double-up sits under its own last day (4/14), not joined and not past wrap');
      // R11: the menu. A joined one: Rename…, Remove. A moved one: Rename…, Put back, Remove.
      var m = await menuOn('Tandem 306', '2027-04-08');
      out.r5 = m && {items: m.items, head: m.head};
      check(m && m.items.join() === 'du-rename,du-remove' && /^Tandem 306 1 day$/.test(m.head),
            'R5 (R11) right-click a joined double-up: exactly Rename… and Remove double-up, headed "Tandem 306 · 1 day"');
      closeMenu(); await T.sleep(150);
      m = await menuOn('Tandem 303', '2027-04-09');
      out.r5b = m && {items: m.items, head: m.head};
      check(m && m.items.join() === 'du-rename,du-back,du-remove', 'R5 a moved one adds "Put back on its default days"');
      await menuPick(m, 'du-back');
      out.r5c = await duMap();
      check(out.r5c['Tandem 303'] === '2027-04-01', 'R5 Put back: Double-up 303 goes to its default day, 4/1 (joined to 303)');
      await undo();
      check((await duMap())['Tandem 303'] === '2027-04-09', 'R5 ...and one Undo moves it back to 4/9');
      // Rename… through the menu: that episode's own name.
      await toMonth('April 2027');
      m = await menuOn('Tandem 306', '2027-04-08');
      m.el.querySelector('[data-item="du-rename"]').click();
      await T.until(function () { return !!document.querySelector('.du-rename-pop .du-rename-input'); }, 'the Rename box', 40, 100);
      var inp = document.querySelector('.du-rename-pop .du-rename-input');
      out.r6pre = {focused: document.activeElement === inp, ph: inp.placeholder};
      inp.value = 'Splinter';
      inp.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      await settle();
      out.r6 = {map: await duMap(), row: cardList().filter(function (x) { return x.tag === '306'; })[0]};
      check(out.r6pre.focused && out.r6pre.ph === 'Tandem' && out.r6.map['Splinter 306'] === '2027-04-08' && out.r6.row.name === 'Splinter' && out.r6.row.nameOwn,
            'R6 (R11) Rename… names that episode’s own double-up: "Splinter 306", bold in its row');
      await undo();
      check(!!(await duMap())['Tandem 306'], 'R6 ...one Undo');
      // Remove double-up: the count to 0 (its own), the move with it.
      await toMonth('April 2027');
      m = await menuOn('Tandem 303', '2027-04-09');
      await menuPick(m, 'du-remove');
      out.r7 = {map: await duMap(), row: cardList().filter(function (x) { return x.tag === '303'; })[0]};
      check(!out.r7.map['Tandem 303'] && out.r7.row.typed === '0' && out.r7.row.own, 'R7 (R11) Remove double-up: 303 has none, its box reads 0 (its own)');
      var saved7 = JSON.parse(await save());
      check(saved7.episodeDefs.filter(function (e) { return e.id === 'ep3'; })[0].doubleUpDays === 0 && !(saved7.doubleUps.moved || {}).ep3,
            'R7 ...saved as doubleUpDays 0, and its moved position is gone');
      await undo();
      check((await duMap())['Tandem 303'] === '2027-04-09', 'R7 ...one Undo brings it back where it was');
      // R12: double-click opens the card at the episode's row.
      tab('show'); await T.sleep(200);
      await toMonth('March 2027');
      var dbl = duPillOn('Tandem 304', '2027-03-24'), pc = centre(dbl.el);
      // A real double-click: two presses where it lands (the month's dblclick ignores one whose press was elsewhere).
      ['mousedown', 'mouseup', 'click', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(function (t) {
        (t === 'mouseup' ? window : dbl.el).dispatchEvent(new MouseEvent(t, {bubbles: true, cancelable: true, clientX: pc.x, clientY: pc.y, button: 0, buttons: t === 'mousedown' ? 1 : 0}));
      });
      await T.sleep(250);
      var rowEl = [].find.call(document.querySelectorAll('#du-row .du-unit-row'), function (r) { return r.dataset.id === 'ep4'; });
      out.r8 = {tab: (document.querySelector('.side-tab-btn[data-tab="phases"]') || {}).getAttribute && document.querySelector('.side-tab-btn[data-tab="phases"]').getAttribute('aria-selected'),
                shown: shownEl(card()), flash: rowEl && rowEl.classList.contains('is-flash'), folded: card().classList.contains('is-collapsed')};
      check(out.r8.shown && out.r8.flash && !out.r8.folded, 'R8 (R12) double-click a double-up: the Phases tab, the Double-ups card open, its episode’s row flashed');
      // R8 / R9: the drag.
      await settle();
      await toMonth('February 2027');
      var dr = await dragDu('Tandem 302', '2027-03-03', '2027-02-23');
      out.r9a = dr;
      check(dr.toast.indexOf('never before the shoot starts') >= 0 && dr.after === 0 && (await duMap())['Tandem 302'] === '2027-03-03',
            'R9 a drop before the shoot starts is refused: it snaps back with a one-line reason');
      await toMonth('February 2027');
      dr = await dragDu('Tandem 302', '2027-03-03', '2027-03-01');
      out.r9b = dr;
      check(dr.toast.indexOf('can only go on another episode’s days, or after wrap') >= 0 && dr.bad > 0 && dr.nodrop > 0 && dr.ghost === 1
            && (await duMap())['Tandem 302'] === '2027-03-03',
            'R9 a drop on its OWN episode’s days is refused (red outline, its own days greyed, the moving copy shown), and it snaps back');
      await toMonth('March 2027');
      dr = await dragDu('Tandem 301', '2027-03-10', '2027-03-11');
      out.r9c = {dr: dr, map: await duMap()};
      check(dr.toast === '' && dr.bad === 0 && out.r9c.map['Tandem 301'] === '2027-03-11', 'R9 a drop on another episode’s day (304’s 3/11) is allowed');
      var s9 = JSON.parse(await save());
      check(JSON.stringify(s9.doubleUps.moved.ep1) === '{"day":12}', 'R9 ...and kept by its shoot-day number, {day: 12}, never a date');
      await undo();
      check((await duMap())['Tandem 301'] === '2027-03-10', 'R9 the drag is ONE undo step');
      await toMonth('April 2027');
      dr = await dragDu('Tandem 306', '2027-04-08', '2027-04-16');
      out.r9d = {dr: dr, map: await duMap()};
      var s9d = JSON.parse(await save());
      check(out.r9d.map['Tandem 306'] === '2027-04-16' && JSON.stringify(s9d.doubleUps.moved.ep7) === '{"after":2}',
            'R9 a drop after wrap is allowed, kept as {after: 2} (working days after wrap)');
      await toMonth('April 2027');
      dr = await dragDu('Tandem 306', '2027-04-16', '2027-04-08');
      out.r9e = {map: await duMap(), saved: JSON.parse(await save())};
      check(out.r9e.map['Tandem 306'] === '2027-04-08' && !('ep7' in (out.r9e.saved.doubleUps.moved || {})),
            'R9 dragged back onto its default day it is PUT BACK: the move is gone from the file');
      // R20 (owner, 17 Nov 2026, "None during episode 1"): no double-up on ANY of the first episode's days (302 in
      // shooting order: slots 0-4, 2/24-3/2). Its last day refused; the next episode's first day (3/3, 301's) allowed.
      await toMonth('March 2027');
      dr = await dragDu('Tandem 301', '2027-03-10', '2027-03-02');
      out.r20a = {dr: dr, map: await duMap()};
      check(dr.toast.indexOf('can’t go on the first episode’s days') >= 0 && dr.bad > 0 && out.r20a.map['Tandem 301'] === '2027-03-10',
            'R20 a drop on the FIRST episode’s days (302’s 3/2) is refused with a one-line reason, and snaps back');
      await toMonth('April 2027');
      var firstGrey = await (async function () {
        // While dragging, 302's days are greyed too (on March's page, which shows them).
        await toMonth('March 2027');
        var b = duPillOn('Tandem 301', '2027-03-10'), c = cellOf('2027-03-01'), r = b.el.getBoundingClientRect(), cr = c.getBoundingClientRect();
        b.el.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, clientX: r.left + 6, clientY: r.top + 5, button: 0, buttons: 1}));
        window.dispatchEvent(new MouseEvent('mousemove', {clientX: r.left + 14, clientY: r.top + 5, buttons: 1}));
        window.dispatchEvent(new MouseEvent('mousemove', {clientX: r.left + 14, clientY: r.top + 6, buttons: 1}));
        var hit = Array.prototype.some.call(document.querySelectorAll('.du-drop-box.is-nodrop'), function (x) {
          var q = x.getBoundingClientRect(); return Math.abs(q.left - cr.left) < 2 && Math.abs(q.top - cr.top) < 2; });
        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        window.dispatchEvent(new MouseEvent('mouseup', {clientX: r.left + 14, clientY: r.top + 6, button: 0}));
        await settle();
        return hit;
      })();
      check(firstGrey, 'R20 ...and while a double-up is dragged, the first episode’s days are greyed');
      await toMonth('March 2027');
      dr = await dragDu('Tandem 304', '2027-03-24', '2027-03-03');
      out.r20b = {dr: dr, map: await duMap()};
      check(dr.toast === '' && out.r20b.map['Tandem 304'] === '2027-03-03,2027-03-04', 'R20 the earliest a double-up can go is the next episode’s first day (3/3, 301’s)');
      await undo();
      check((await duMap())['Tandem 304'] === '2027-03-24,2027-03-25', 'R20 ...one Undo');
      // THE GRIPS (owner, 17 Nov 2026: "i should be able to extend tandem day just like any other phase"; picker "Both ends").
      await toMonth('March 2027');
      var g1 = await gripDrag('Tandem 302', '2027-03-03', 'end', '2027-03-05');
      out.g1 = {g: g1, map: await duMap()};
      await toMonth('March 2027');
      var g1row = rowsOnScreen()[0], g1du = g1row.bars.filter(function (b) { return b.text === 'Tandem 302'; })[0];
      var s1 = JSON.parse(await save());
      check(g1.edges === 'start,end' && g1.ids === 0 && out.g1.map['Tandem 302'] === '2027-03-03,2027-03-04,2027-03-05' && g1du && g1du.line && g1du.joinL
            && s1.episodeDefs.filter(function (e) { return e.id === 'ep2'; })[0].doubleUpDays === 3 && !('ep2' in (s1.doubleUps.moved || {})),
            'G1 a tandem has a grip at each end (no id); dragging its END to Friday makes 302’s 3 days, still joined to its shoot bar, saved as its own count');
      await undo();
      check((await duMap())['Tandem 302'] === '2027-03-03', 'G1 ...the drag is ONE undo step');
      await toMonth('March 2027');
      var g2 = await gripDrag('Tandem 304', '2027-03-24', 'start', '2027-03-25');
      out.g2 = {map: await duMap(), saved: JSON.parse(await save())};
      check(out.g2.map['Tandem 304'] === '2027-03-25' && out.g2.saved.episodeDefs.filter(function (e) { return e.id === 'ep4'; })[0].doubleUpDays === 1
            && JSON.stringify(out.g2.saved.doubleUps.moved.ep4) === '{"day":17}',
            'G2 dragging its START later holds its end: 304’s is 3/25 alone, its count 1, its start now a moved position (unjoined)');
      await undo();
      check((await duMap())['Tandem 304'] === '2027-03-24,2027-03-25', 'G2 ...one Undo');
      await toMonth('March 2027');
      await gripDrag('Tandem 302', '2027-03-03', 'start', '2027-03-01');
      await toMonth('March 2027');
      await gripDrag('Tandem 301', '2027-03-10', 'end', '2027-03-12', true);
      out.g3 = await duMap();
      check(out.g3['Tandem 302'] === '2027-03-03' && out.g3['Tandem 301'] === '2027-03-10',
            'G3 a start pulled onto its own episode’s days stops where it was (R9), and Esc during a drag puts it back');
      // R17: Production's own days, and the waterfall, untouched. R10: Shift keeps a moved one on its shoot day.
      out.prodOn = await prodBars();
      var total = (document.querySelector('.prod-total-readout strong') || {}).textContent;
      $('shift-fwd-btn').click(); await settle();
      out.shift = await duMap();
      check(sameMap(out.shift, WANT_SHIFT), 'R10 Shift +1 week: every double-up moves with the shoot, the moved one kept on shoot day 27 (now 4/16)');
      if(!sameMap(out.shift, WANT_SHIFT)) out.shiftDiff = mapDiff(out.shift, WANT_SHIFT);
      await undo();
      check(sameMap(await duMap(), WANT), 'R10 ...one Undo');
      await exportsNow('On');
      // The same calendar with every double-up key taken out: Load it, and nothing of Production or the waterfall moved.
      var base = JSON.parse(await save());
      check(JSON.stringify(base.doubleUps) === '{"days":1,"moved":{"ep3":{"day":27}}}', 'S0 Save writes doubleUps {days, moved} as it was loaded');
      check(!Object.keys(base.fields.byId).some(function (k) { return /double|^du-/i.test(k); }) && noIds() === 0,
            'S0 ...and fields.byId holds no double-up id (the card has none)');
      await load(JSON.stringify(base));
      check(sameMap(await duMap(), WANT), 'S1 Save then Load: every double-up as it was');
      // R20 and a v1.17.0 file: a double-up saved moved onto the first episode's days keeps opening, is drawn at its
      // default, and its saved move is kept (nothing in the file is lost).
      var onFirst = JSON.parse(JSON.stringify(base));
      onFirst.doubleUps.moved.ep7 = {day: 2};
      await load(JSON.stringify(onFirst));
      out.r20c = {map: await duMap(), saved: JSON.parse(await save()).doubleUps};
      check(out.r20c.map['Tandem 306'] === '2027-04-08' && JSON.stringify(out.r20c.saved.moved.ep7) === '{"day":2}' && sameMap(out.r20c.map, WANT),
            'R20 a file whose double-up was moved onto episode 1 (v1.17.0 allowed it) opens with it on its default day, and the saved move is kept');
      // The owner's exception (picker "Allow it there"): a show of ONE episode keeps its double-up on its own last day.
      var one = JSON.parse(JSON.stringify(base));
      one.fields.byId['num-episodes'] = {value: '1'};
      one.episodeDefs = [Object.assign({}, one.episodeDefs.filter(function (e) { return e.id === 'ep2'; })[0], {doubleUpDays: 1})];
      one.episodeShootOrder = [];
      delete one.doubleUps.moved;
      await load(JSON.stringify(one));
      out.r20d = {map: await duMap(), list: cardList().map(function (x) { return x.tag + '=' + x.n; }).join()};
      check(Object.keys(out.r20d.map).length === 1 && out.r20d.map[Object.keys(out.r20d.map)[0]] === '2027-03-02',
            'R20 the one exception: a ONE-episode show keeps its double-up on its own last day (3/2), episode 1 though it is');
      var bare = JSON.parse(JSON.stringify(base));
      delete bare.doubleUps;
      bare.episodeDefs.forEach(function (e) { delete e.doubleUpDays; delete e.doubleUpName; });
      await load(JSON.stringify(bare));
      out.off = {map: await duMap(), dflt: cardBox(null).value === '' ? cardBox(null).placeholder : cardBox(null).value, list: cardList().map(function (x) { return x.n; }).join(),
                 meta: card().querySelector('.du-meta').textContent};
      check(sameMap(out.off.map, {}) && out.off.dflt === 'None' && out.off.list === '–,–,–,–,–,–' && out.off.meta === 'None yet',
            'S2 ⛔ the M-5 trap: a calendar with no double-up keys, loaded after one with them, has NONE (default, counts, moves)');
      out.prodOff = await prodBars();
      check(out.prodOn.length > 0 && JSON.stringify(out.prodOn) === JSON.stringify(out.prodOff)
            && (document.querySelector('.prod-total-readout strong') || {}).textContent === total,
            'S3 (R17) Production is untouched: every shoot bar’s text and days, and the total, are the same with double-ups on and off');
      await exportsNow('Off');
      check(out.gridOn && out.gridOn.length > 0 && JSON.stringify(out.gridOn) === JSON.stringify(out.gridOff),
            'S4 (R13) the waterfall on screen is identical with double-ups on and off (' + (out.gridOn || []).length + ' rows)');
      check(!!(out.xlsxOn && out.xlsxOff && out.pdfOn && out.pdfOff), 'S4 (R13) the workbook and the waterfall PDF were exported on and off (gate.sh compares them)');
      // Undo across the Load is not a step back into the old file, so the last Load's state is where Undo stops.
      var hostile = JSON.parse(JSON.stringify(base));
      hostile.doubleUps = {days: 100, name: 42, moved: {ep1: {day: -3}, ep2: {when: '2027-03-03'}, '<x>': {day: 2}}, extra: 1};
      hostile.episodeDefs[0].doubleUpDays = 'two';
      hostile.episodeDefs[1].doubleUpName = {x: 1};
      await load(JSON.stringify(hostile));
      out.hostile = {map: await duMap(), list: cardList().map(function (x) { return x.n + (x.name ? ':' + x.name : ''); }).join(), health: T.appHealth()};
      check(sameMap(out.hostile.map, wantMap({'Tandem 304': ['2027-03-24', '2027-03-25'], 'Tandem 305': ['2027-04-14']}))
            && !((out.hostile.health || {}).errors || []).filter(function (e) { return !/^warn: SPTCal: \d+ value\(s\) in this calendar were not in a form the app writes/.test(e); }).length,
            'S5 a hostile file: every bad double-up value dropped (default, name, moves, an episode’s count and name), no error but the app’s own "were ignored" notice');
    }

    if(out.run === 'blocks'){
      // ================= BLOCKS =================
      await T.until(function () { return document.querySelectorAll('#du-row .du-unit-row').length === 3; }, 'the restored block list', 200, 100);
      await settle();
      out.health = T.appHealth();
      tab('phases'); await T.sleep(200);
      out.list = cardList();
      out.map = await duMap();
      // The first day of each block's bars: a joined double-up is on the next block's first shoot day.
      var firsts = {};
      await eachMonth(function (mo, rows) { rows.forEach(function (r) { r.bars.forEach(function (b) {
        if(b.ph === 'production' && /^Block \d/.test(b.text)) b.days.forEach(function (d) { if(!firsts[b.text] || d < firsts[b.text]) firsts[b.text] = d; });
      }); }); });
      out.firsts = firsts;
      check(out.list.map(function (x) { return x.tag + '=' + x.n; }).join() === 'Block 1=1,Block 2=1,Block 3=–', 'B0 the card lists the blocks; the last has none (R5)');
      check(Object.keys(out.map).join() === 'Tandem Block 1,Tandem Block 2' && out.map['Tandem Block 1'] === firsts['Block 2']
            && out.map['Tandem Block 2'] === firsts['Block 3'],
            'B1 "Tandem Block 1" sits on Block 2’s first shoot day, "Tandem Block 2" on Block 3’s');
    }

    if(out.run === 'half'){
      // ================= HALF (R15) =================
      await T.until(function () { return document.querySelectorAll('#du-row .du-unit-row').length === 10; }, 'the episode list', 200, 100);
      await settle();
      out.health = T.appHealth();
      out.map = await duMap();
      // Every Production day, and each episode's last day (a switch day is the earlier episode's last).
      var shot = {}, lastOf = {};
      await eachMonth(function (mo, rows) { rows.forEach(function (r) { r.bars.forEach(function (b) {
        if(b.ph !== 'production') return;
        var m2 = /(\d{3})/.exec(b.text);
        b.days.forEach(function (d) { shot[d] = 1; if(m2 && (!lastOf[m2[1]] || d > lastOf[m2[1]])) lastOf[m2[1]] = d; });
      }); }); });
      var days = Object.keys(shot).sort(), next = function (d) { return days.filter(function (x) { return x > d; })[0]; };
      out.half = {last202: lastOf['202'], du202: out.map['Tandem 202'], next202: next(lastOf['202'] || '')};
      // 202 is 4.5 days: its last day is a switch day it shares with 203, and its double-up is the next FULL day.
      var shared = days.indexOf(lastOf['202']) >= 0 && Object.keys(lastOf).length > 3;
      check(shared && out.half.du202 && out.half.du202 === out.half.next202 && out.half.du202 !== out.half.last202,
            'H1 (R15) 202 ends half way through ' + out.half.last202 + '; its double-up starts on the first full day after the switch, ' + out.half.next202);
      check(Object.keys(out.map).length === 9 && !out.map['Tandem 210'], 'H2 nine double-ups, none for 210, the last');
      // R6 with two double-ups in one week (Sun 7/26): 204's on Monday, 205's joined on Friday; the next episode, 206,
      // takes the line BELOW 205's double-up, never a line above it that 204's left free.
      await toMonth('July 2026');
      var wk = rowsOnScreen().filter(function (r) { return r.start === '2026-07-26'; })[0];
      var d205 = wk && wk.bars.filter(function (b) { return b.text === 'Tandem 205'; })[0];
      var s205 = wk && wk.bars.filter(function (b) { return b.text.indexOf('Shoot 205') === 0; })[0];
      var s206 = wk && wk.bars.filter(function (b) { return /^(Shoot|Ep\.) 206/.test(b.text); })[0];
      out.h3 = {d205: d205 && [d205.cols, d205.lane, d205.joinL], s205: s205 && [s205.cols, s205.lane, s205.joinR], s206: s206 && [s206.cols, s206.lane]};
      check(d205 && s205 && s206 && d205.lane === s205.lane && d205.joinL && s205.joinR && s206.lane === d205.lane + 1,
            'H3 (R6) two double-ups in one week: 205’s joins its bar, and 206 sits on the line directly below it');
    }
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
