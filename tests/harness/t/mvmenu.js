// mvmenu -- the month view's day menu (MONTH-CONTEXT-MENU-PLAN.md). Plan step 1: the right-click
// listener and its guards, the panel and its close rules, and four items -- Add note, Add 1-day
// phase here, Add 1-week phase here, Show this week in the waterfall. Plan step 2 (the A-cases): Add
// hiatus ▸, its submenu (pointer, grace period, keys) and its three kinds of item. Plan step 3 (the
// P-cases): the bar's own section -- Start here (a mover), End here (the edge handle's rule), Colour…,
// Show in Phases card. Later steps add their sections here, and flip the "absent" checks below as they do.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays ./run.sh mvmenu 150
//
// Owner, 19 Oct 2026: "One i know i want is to right click to add a custom phase starting on the day
// youre hovering over." Rulings in plan §9; the cases are plan §11's, on tests/fixtures/halfdays.sptcal
// (US General, a shoot from Mon 6/29/26 at 4.5 days an episode with Episode 201 at 5, Post from 11/2/26,
// and a locked two-week hiatus from Mon 12/21/26). The days, worked out by hand from that calendar:
//   Wed  8 Jul 2026  shoot day 7 (6/29, 6/30, 7/1, 7/2, 7/6, 7/7 come first; 7/3 is a holiday), on Ep. 202's
//                    bar in Production Week 2
//   Fri  3 Jul 2026  Independence Day (Observed), a weekday holiday inside the shoot: not shot
//   Sun 12 Jul 2026  a weekend inside the shoot
//   Tue 22 Dec 2026  inside the all-phase hiatus
//   Fri 25 Dec 2026  inside the hiatus, and Christmas Day
//
// ⛔ EVERY RIGHT-CLICK IS HIT-TESTED. The contextmenu event is dispatched on document.elementFromPoint() at
// the point, never on a node the leg picked, because only hit-testing proves a user can reach it (the trap
// installDayOverrideUI's comment records twice). The point is chosen on the day's own cell or bar.
// ⚠️ WHAT IT DOES NOT PROVE: that macOS turns a real Ctrl+click into a right-click. The G-cases drive the
// Ctrl guard with synthetic presses; the OS half needs a real mouse or trackpad (plan §5).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'mvmenu'};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  // fields.byId as the engine would save it, keys sorted so a rebuilt row's order cannot read as a change.
  function sig(){ var s = T.formSignature(), o = {}; Object.keys(s).sort().forEach(function (k) { o[k] = s[k]; }); return o; }
  function sigDiff(a, b){
    var d = {added: [], removed: [], changed: []};
    Object.keys(b).forEach(function (k) { if(!(k in a)) d.added.push(k); else if(a[k] !== b[k]) d.changed.push(k); });
    Object.keys(a).forEach(function (k) { if(!(k in b)) d.removed.push(k); });
    return d;
  }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function toMonth(label){
    if(!document.querySelector('#table-wrap .mv-daygrid')){ document.getElementById('view-month-btn').click(); await settle(); }
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if(my === label) return settle();
      var btn = document.getElementById(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // The month on screen as {iso: {cell, week, col}}, every cell dated from its row's Sunday (an in-month
  // cell's own number), the halfdays leg's arithmetic.
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
  // The days a phase's pills cover in the month on screen, from each pill's own grid-column.
  function pillDays(key){
    var days = [];
    var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var map = monthCells();
    Object.keys(map).forEach(function (iso) {
      var m = map[iso];
      if(m.col !== 0) return;
      [].forEach.call(m.week.querySelectorAll('.mv-pill[data-ph="' + key + '"]'), function (p) {
        for(var c = +p.style.gridColumnStart - 1; c < +p.style.gridColumnEnd - 1; c++){
          days.push(new Date(m.sunday + c * 86400000).toISOString().slice(0, 10));
        }
      });
    });
    return days.sort();
  }
  // Bring a node into the preview panel's view, then let the scroll event land BEFORE anything opens: the
  // menu closes on a capture-phase scroll, and a scroll still in flight would close it under the leg.
  async function bringIntoView(el){
    var pp = document.querySelector('.preview-panel');
    var r = el.getBoundingClientRect(), q = pp ? pp.getBoundingClientRect() : {top: 0, bottom: innerHeight, height: innerHeight};
    if(pp && (r.top < q.top + 20 || r.bottom > q.bottom - 20)){
      pp.scrollTop += (r.top + r.height / 2) - (q.top + q.height / 2);
      await T.sleep(250);
    }
  }
  // A point on a day: 'num' is the day-number band, 'mid' the cell's centre, 'bar:<key>' that phase's bar.
  async function pointOn(iso, where){
    var m = monthCells()[iso];
    if(!m) throw new Error('no cell for ' + iso + ' in ' + txt(document.querySelector('#table-wrap .mv-monthyear')));
    await bringIntoView(m.cell);
    m = monthCells()[iso];
    var r = m.cell.getBoundingClientRect();
    var x = Math.round(r.left + r.width / 2), y;
    if(where === 'num') y = Math.round(r.top + 8);
    else if(where === 'mid') y = Math.round(r.top + r.height / 2);
    else {
      var key = where.slice(4);
      var pill = [].find.call(m.week.querySelectorAll('.mv-pill[data-ph="' + key + '"]'), function (p) {
        return +p.style.gridColumnStart - 1 <= m.col && +p.style.gridColumnEnd - 2 >= m.col;
      });
      if(!pill) throw new Error('no ' + key + ' bar on ' + iso);
      var pr = pill.getBoundingClientRect();
      y = Math.round(pr.top + pr.height / 2);
    }
    return {x: x, y: y, cell: m.cell};
  }
  // A right-click at a point, as Chrome sends it: the press (which closes an open menu), the event, the
  // release. Dispatched on whatever is ON TOP at the point.
  function rclickAt(x, y, opts){
    opts = opts || {};
    var el = document.elementFromPoint(x, y);
    var base = {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2, shiftKey: !!opts.shift};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    var ev = new MouseEvent('contextmenu', base);
    el.dispatchEvent(ev);
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    return {el: el, prevented: ev.defaultPrevented};
  }
  async function rclick(iso, where, opts){
    var p = await pointOn(iso, where || 'num');
    var r = rclickAt(p.x, p.y, opts);
    r.point = p;
    r.inBody = !!(r.el && r.el.closest && r.el.closest('#table-wrap .mv-body'));
    return r;
  }
  function menuEl(){ return document.querySelector('.day-menu'); }
  function menuInfo(){
    var m = menuEl();
    if(!m) return null;
    return {
      day: m.getAttribute('data-day'), ph: m.getAttribute('data-ph'),
      date: txt(m.querySelector('.day-menu-date')), ctx: txt(m.querySelector('.day-menu-ctx')),
      sections: [].map.call(m.querySelectorAll('[data-section]'), function (s) { return s.getAttribute('data-section'); }),
      items: [].map.call(m.querySelectorAll('.day-menu-item'), function (b) {
        return {id: b.getAttribute('data-item'), disabled: b.getAttribute('aria-disabled') === 'true', second: txt(b.querySelector('small'))};
      }),
      ids: m.querySelectorAll('[id]').length + (m.id ? 1 : 0),
      focus: document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-item'),
    };
  }
  function item(info, id){ return (info && info.items.find(function (x) { return x.id === id; })) || {}; }
  function key(k){ document.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); }
  function choose(id){ var b = menuEl() && menuEl().querySelector('[data-item="' + id + '"]'); if(!b) throw new Error('no item ' + id); b.click(); }
  function customRows(){ return document.querySelectorAll('#custom-phase-rows .phase-row').length; }
  function activeTab(){ var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  function sheetActive(){ return document.getElementById('view-sheet-btn').classList.contains('active'); }
  async function undo(){ document.getElementById('undo-btn').click(); await settle(); }
  async function redo(){ document.getElementById('redo-btn').click(); await settle(); }
  function lastCustomKey(){
    var rows = document.querySelectorAll('#custom-phase-rows .phase-row');
    return rows.length ? rows[rows.length - 1].dataset.key : null;
  }
  var CANT_WEEKEND = 'A phase can’t be drawn on a weekend', CANT_HIATUS = 'A phase can’t be drawn inside a hiatus';
  var NO_LANES = 'A hiatus day has no note lanes';
  var ITEMS = ['note', 'phase-day', 'phase-week', 'hiatus', 'waterfall'];

  try {
    await T.appReady();
    await settle();
    await T.until(function () { return (document.getElementById('start-production') || {}).value === '2026-06-29'; }, 'the halfdays fixture', 150, 100);
    out.platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform;
    await toMonth('July 2026');
    await T.sleep(700);                      // the fixture's own debounced steps land first

    // ---- H: the day and the bar under the pointer, and what the menu offers there ----
    var s0 = sig();
    var h1 = await rclick('2026-07-08', 'bar:production');
    var i1 = menuInfo();
    var ring = document.querySelector('.day-menu-ring'), cr = h1.point.cell.getBoundingClientRect();
    var rr = ring && ring.getBoundingClientRect();
    var mr = menuEl() && menuEl().getBoundingClientRect();
    add('H1', 'Right-click on Ep. 202\'s bar on Wed 8 Jul: hit-tested on the bar, prevented, the menu for 8 Jul with Production as its bar, header "Wed 8 Jul 2026 / Shoot day 7 · Ep. 202 · Production Week 2", no id inside, ringed day, inside the window',
      h1.inBody && !!h1.el.closest('.mv-pill[data-ph="production"]') && h1.prevented && i1 && i1.day === '2026-07-08' && i1.ph === 'production'
        && i1.date === 'Wed 8 Jul 2026' && i1.ctx === 'Shoot day 7 · Ep. 202 · Production Week 2' && i1.ids === 0
        && !!rr && Math.abs(rr.left - cr.left) < 1.5 && Math.abs(rr.width - cr.width) < 1.5
        && mr.left >= 0 && mr.top >= 0 && mr.right <= innerWidth && mr.bottom <= innerHeight,
      {hit: h1.el.className, prevented: h1.prevented, info: i1, ring: rr && [rr.left, rr.width], cell: [cr.left, cr.width]},
      'the menu for 2026-07-08 on production');
    // On a bar, step 3's section for it sits between This day and the way out (the P-cases test it).
    var ITEMS_BAR = ITEMS.slice(0, 4).concat(['phase-start', 'phase-end', 'phase-colour', 'phase-show'], ITEMS.slice(4));
    add('H1s', 'The sections are This day, Production\'s own (step 3) and the way out, in that order; the items are step 1\'s four, step 2\'s Add hiatus and step 3\'s four, only End Production here greyed out on a shoot day; focus is on the first',
      i1 && eq(i1.sections, ['day', 'phase', 'out']) && eq(i1.items.map(function (x) { return x.id; }), ITEMS_BAR)
        && i1.items.every(function (x) { return x.disabled === (x.id === 'phase-end'); }) && i1.focus === 'note',
      i1 && {sections: i1.sections, items: i1.items, focus: i1.focus}, 'day, phase, out; ' + ITEMS_BAR.join(', '));
    key('Escape');
    add('S1', 'Opening and closing the menu leaves fields.byId exactly as it was, and Escape leaves no panel or ring behind',
      eq(sig(), s0) && !menuEl() && !document.querySelector('.day-menu-ring'), sigDiff(s0, sig()), 'no change');

    var h2 = await rclick('2026-07-03', 'num');
    var i2 = menuInfo();
    add('H2', 'Fri 3 Jul, a weekday holiday inside the shoot (on its day number): no bar, the holiday named, not a shoot day, and Add 1-day phase here OFFERED (a Dates phase is drawn on a weekday holiday)',
      h2.inBody && h2.prevented && i2 && i2.day === '2026-07-03' && i2.ph === null && /Independence Day/.test(i2.ctx) && !/Shoot day/.test(i2.ctx)
        && !item(i2, 'phase-day').disabled && !item(i2, 'note').disabled && item(i2, 'phase-day').second === 'Custom phase · Fri 3 Jul only',
      i2, '3 Jul, holiday, 1-day offered');
    key('Escape');

    var h3 = await rclick('2026-07-12', 'mid');
    var i3 = menuInfo();
    add('H3', 'Sun 12 Jul, a weekend inside the shoot: Add 1-day phase here greyed out WITH ITS REASON; Add note and Add 1-week phase here offered; the header says Weekend',
      h3.inBody && h3.prevented && i3 && i3.day === '2026-07-12' && item(i3, 'phase-day').disabled && item(i3, 'phase-day').second === CANT_WEEKEND
        && !item(i3, 'note').disabled && !item(i3, 'phase-week').disabled && i3.ctx === 'Weekend' && item(i3, 'waterfall').second === 'Week of Mon 6 Jul',
      i3, '1-day greyed: ' + CANT_WEEKEND);
    // A greyed item does nothing, and the menu stays open.
    var rows0 = customRows();
    choose('phase-day');
    add('I2a', 'Clicking the greyed-out Add 1-day phase here on 12 Jul adds nothing and leaves the menu open',
      customRows() === rows0 && !!menuEl(), {rows: customRows(), open: !!menuEl()}, 'no row, menu open');
    key('Escape');

    // ---- G: where the browser keeps its own menu ----
    var g1 = await rclick('2026-07-08', 'bar:production', {shift: true});
    add('G1', 'Shift + right-click is left to the browser: not prevented, no menu',
      !g1.prevented && !menuEl(), {prevented: g1.prevented, open: !!menuEl()}, 'not prevented');
    var title = document.querySelector('#table-wrap .mv-monthyear'), tr = title.getBoundingClientRect();
    var g2a = rclickAt(Math.round(tr.left + tr.width / 2), Math.round(tr.top + tr.height / 2));
    var hdr = document.querySelector('header.app-header'), hr = hdr.getBoundingClientRect();
    var g2b = rclickAt(Math.round(hr.left + hr.width / 2), Math.round(hr.top + hr.height / 2));
    add('G2', 'A right-click on the month bar or the app header is left to the browser',
      !g2a.prevented && !g2b.prevented && !menuEl(), {monthbar: [g2a.el.className, g2a.prevented], header: [g2b.el.className, g2b.prevented]}, 'not prevented');

    // ---- C: the close rules ----
    async function openOn(iso, where){ await rclick(iso, where || 'num'); return !!menuEl(); }
    var c = {};
    c.inside = await openOn('2026-07-09');
    menuEl().dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
    c.insideKept = !!menuEl();
    document.querySelector('.form-panel').dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
    c.outside = !menuEl();
    await openOn('2026-07-09');
    document.querySelector('.preview-panel').dispatchEvent(new Event('scroll'));
    c.scroll = !menuEl();
    await openOn('2026-07-09');
    window.dispatchEvent(new Event('resize'));
    c.resize = !menuEl();
    await openOn('2026-07-09');
    window.dispatchEvent(new Event('blur'));
    c.blur = !menuEl();
    await openOn('2026-07-09');
    document.getElementById('view-month-btn').click();     // a render, with no press to close it
    await T.sleep(50);
    c.render = !menuEl();
    await settle();
    add('C1', 'The menu closes on an outside press (not one inside it), a scroll, a resize, a window blur, and a re-render of #table-wrap',
      c.inside && c.insideKept && c.outside && c.scroll && c.resize && c.blur && c.render, c, 'all true');

    // Opening closes an open shoot-day popover (a right-click fires no click, so it would not close itself).
    var p8 = await pointOn('2026-07-08', 'num');
    var top8 = document.elementFromPoint(p8.x, p8.y);
    top8.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: p8.x, clientY: p8.y, button: 0}));
    var popWas = !!document.querySelector('.day-ov-pop');
    await rclick('2026-07-09', 'num');
    add('C2', 'Opening the menu closes an open Full day/Off popover (a left-click on 8 Jul\'s number still opens that popover until plan step 4)',
      popWas && !document.querySelector('.day-ov-pop') && !!menuEl() && menuInfo().day === '2026-07-09',
      {popWas: popWas, popNow: !!document.querySelector('.day-ov-pop'), menu: menuInfo() && menuInfo().day}, 'popover closed, menu on 9 Jul');
    key('Escape');

    // Opening commits an open month note editor -- whose commit RE-RENDERS the grid, which the menu's own
    // observer must not take for a render under the menu it is opening.
    var cells = monthCells();
    var plus = cells['2026-07-09'].week.querySelector('.mv-note-add[data-note-day="2026-07-09"]');
    await bringIntoView(plus);
    plus.click();
    var ta = document.querySelector('#mv-note-pop textarea');
    if(ta){ ta.value = 'Menu commit check'; ta.dispatchEvent(new Event('input', {bubbles: true})); }
    await rclick('2026-07-10', 'num');
    var noteThere = [].some.call(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="2026-07-09"]'), function (n) { return /Menu commit check/.test(n.textContent); });
    add('C3', 'Opening the menu commits an open month note editor (the outside-click rule) and the menu survives the render that commit causes',
      !!ta && !document.getElementById('mv-note-pop') && noteThere && !!menuEl() && menuInfo().day === '2026-07-10',
      {editor: !!ta, editorNow: !!document.getElementById('mv-note-pop'), noteThere: noteThere, menu: menuInfo() && menuInfo().day}, 'note saved, menu on 10 Jul');
    key('Escape');
    await T.sleep(700);
    await undo();                              // put the note back out, so the later cases start clean

    // ---- I: the four items, each one undo step ----
    // ⛔ "Exactly one step", tested from both sides: a title typed JUST BEFORE the item must survive one
    // undo (the leading push filed it as its own step, so the item did not fold into it), and one undo must
    // land exactly on that state (two steps would land between, zero would go further back).
    var n = 0;
    async function primeThenOpen(iso, where){
      // update() runs synchronously inside the input event, so there is nothing to settle -- and no wait
      // here, or the 500 ms debounce would bank the title on its own and the check would prove nothing.
      T.set('show-title', 'Menu step ' + (++n));
      var before = sig();
      var r = await rclick(iso, where);
      return {before: before, r: r};
    }

    // I1: Add 1-day phase here on Wed 8 Jul.
    var a = await primeThenOpen('2026-07-08', 'bar:production');
    choose('phase-day');
    await settle();
    var k1 = lastCustomKey();
    var after1 = sig();
    var d1 = sigDiff(a.before, after1);
    var rowIds = k1 ? [].map.call(document.querySelectorAll('#custom-phase-rows .phase-row[data-key="' + k1 + '"] input[id], #custom-phase-rows .phase-row[data-key="' + k1 + '"] select[id], #custom-phase-rows .phase-row[data-key="' + k1 + '"] textarea[id]'), function (e) { return e.id; }).sort() : [];
    var drawn1 = k1 ? pillDays(k1) : [];
    add('I1', 'Add 1-day phase here on Wed 8 Jul: a new custom row, unit Dates, start = end = 2026-07-08, drawn on 8 Jul ONLY; the sidebar on Phases with the cursor in its name box; the menu gone',
      !!k1 && (document.getElementById('unit-' + k1) || {}).value === 'dates' && (document.getElementById('start-' + k1) || {}).value === '2026-07-08'
        && (document.getElementById('end-' + k1) || {}).value === '2026-07-08' && eq(drawn1, ['2026-07-08'])
        && activeTab() === 'phases' && (document.activeElement || {}).id === 'name-' + k1 && !menuEl(),
      {key: k1, unit: (document.getElementById('unit-' + k1) || {}).value, start: (document.getElementById('start-' + k1) || {}).value,
       end: (document.getElementById('end-' + k1) || {}).value, drawn: drawn1, tab: activeTab(), focus: (document.activeElement || {}).id},
      'dates 2026-07-08..2026-07-08, drawn [2026-07-08]');
    add('I1f', 'fields.byId gains only the new row\'s own ids (what + Add phase adds) and changes nothing else',
      d1.removed.length === 0 && d1.changed.length === 0 && eq(d1.added.slice().sort(), rowIds) && rowIds.length > 0,
      {diff: d1, rowIds: rowIds}, 'added = the row\'s ids');
    await T.sleep(700);
    await undo();
    var undone1 = sig();
    var ok1 = eq(undone1, a.before) && customRows() === 0 && activeTab() === 'show' && (document.getElementById('show-title') || {}).value === 'Menu step 1';
    await redo();
    var redone1 = sig();
    var ok1r = eq(redone1, after1) && customRows() === 1;
    await undo();
    add('I1u', 'It is exactly ONE undo step: one undo removes the phase and goes back to the Show tab while keeping the title typed just before; redo puts it all back',
      ok1 && ok1r, {undo: sigDiff(a.before, undone1), redo: sigDiff(after1, redone1), tab: activeTab()}, 'undo = before, redo = after');

    // I2b: greyed out on 22 Dec too (12 Jul is H3/I2a).
    await toMonth('December 2026');
    var h4 = await rclick('2026-12-22', 'mid');
    var i4 = menuInfo();
    add('H4', 'Tue 22 Dec, inside the hiatus: Add note greyed out ("' + NO_LANES + '") and Add 1-day phase here greyed out ("' + CANT_HIATUS + '"); Add 1-week phase here and Add hiatus offered',
      h4.inBody && h4.prevented && i4 && i4.day === '2026-12-22' && item(i4, 'note').disabled && item(i4, 'note').second === NO_LANES
        && item(i4, 'phase-day').disabled && item(i4, 'phase-day').second === CANT_HIATUS && !item(i4, 'phase-week').disabled
        && !item(i4, 'hiatus').disabled && /Hiatus/.test(i4.ctx),
      i4, 'note and 1-day greyed');
    rows0 = customRows();
    choose('phase-day');
    choose('note');
    add('I2b', 'Clicking either greyed-out item on 22 Dec does nothing: no row, no note editor, the menu still open',
      customRows() === rows0 && !document.getElementById('mv-note-pop') && !!menuEl(), {rows: customRows(), editor: !!document.getElementById('mv-note-pop')}, 'nothing');
    // K: the keyboard, here where two items are greyed out.
    var kf = [menuInfo().focus];
    key('ArrowDown'); kf.push(menuInfo().focus);
    key('ArrowDown'); kf.push(menuInfo().focus);
    key('ArrowUp'); kf.push(menuInfo().focus);
    key('Home'); kf.push(menuInfo().focus);
    key('End'); kf.push(menuInfo().focus);
    add('K1', 'Arrow keys, Home and End move focus through the items that are not greyed out, wrapping',
      eq(kf, ['phase-week', 'hiatus', 'waterfall', 'hiatus', 'phase-week', 'waterfall']), kf, 'phase-week, hiatus, waterfall, hiatus, phase-week, waterfall');
    var s4 = sig();
    key('Escape');
    var h5 = await rclick('2026-12-25', 'mid');
    var i5 = menuInfo();
    add('H5', 'Fri 25 Dec, the hiatus and Christmas Day: both named in the header, both greyed out as on 22 Dec',
      h5.inBody && h5.prevented && i5 && i5.day === '2026-12-25' && /Hiatus/.test(i5.ctx) && /Christmas Day/.test(i5.ctx)
        && item(i5, 'note').disabled && item(i5, 'phase-day').disabled && !item(i5, 'phase-week').disabled,
      i5, 'hiatus + Christmas Day');
    // K2: Enter chooses. Show this week in the waterfall from a hiatus week: its row is a band, not a note cell.
    key('End');
    key('Enter');
    await settle();
    var box = document.getElementById('sheet-scroll-container');
    var band = box && box.querySelector('td[data-week="2026-12-21"]');
    var br = box && box.getBoundingClientRect(), bc = band && band.getBoundingClientRect();
    add('K2', 'Enter chooses: Show this week in the waterfall on 25 Dec switches to the waterfall with the week of Mon 21 Dec (a hiatus band) inside the scroll box',
      sheetActive() && !!band && bc.top >= br.top && bc.bottom <= br.bottom && !menuEl(),
      {sheet: sheetActive(), band: !!band, box: br && [br.top, br.bottom], row: bc && [bc.top, bc.bottom]}, 'the 12/21 band in view');
    await T.sleep(700);
    await undo();
    add('K2u', 'One undo goes back to the month view on December, with fields.byId as it was',
      !sheetActive() && !!document.querySelector('#table-wrap .mv-daygrid') && eq(sig(), s4), {sheet: sheetActive(), diff: sigDiff(s4, sig())}, 'month');

    // I3: Add 1-day phase here on a weekday holiday, 3 Jul.
    await toMonth('July 2026');
    a = await primeThenOpen('2026-07-03', 'num');
    choose('phase-day');
    await settle();
    var k3 = lastCustomKey(), drawn3 = k3 ? pillDays(k3) : [];
    add('I3', 'Add 1-day phase here on Fri 3 Jul (Independence Day, observed) is drawn on 3 Jul only',
      !!k3 && eq(drawn3, ['2026-07-03']), {key: k3, drawn: drawn3}, '[2026-07-03]');
    await T.sleep(700);
    await undo();
    add('I3u', 'One undo removes it, keeping the title typed before', eq(sig(), a.before) && customRows() === 0, sigDiff(a.before, sig()), 'before');

    // I4: Add 1-week phase here on Wed 8 Jul starts on the WEDNESDAY, not that week's Monday.
    a = await primeThenOpen('2026-07-08', 'num');
    choose('phase-week');
    await settle();
    var k4 = lastCustomKey(), drawn4 = k4 ? pillDays(k4) : [];
    var after4 = sig();
    add('I4', 'Add 1-week phase here on Wed 8 Jul: unit Weeks, 1 week, start 2026-07-08 with Snap to Mon UNTICKED, so it is drawn from Wed 8 Jul (8, 9, 10, 13, 14 Jul), not from Mon 6 Jul',
      !!k4 && (document.getElementById('unit-' + k4) || {}).value === 'weeks' && (document.getElementById('weeks-' + k4) || {}).value === '1'
        && (document.getElementById('start-' + k4) || {}).value === '2026-07-08' && (document.getElementById('snap-' + k4) || {}).checked === false
        && eq(drawn4, ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-13', '2026-07-14']) && activeTab() === 'phases',
      {key: k4, snap: (document.getElementById('snap-' + k4) || {}).checked, drawn: drawn4}, 'snap off, drawn 7/8-7/14');
    await T.sleep(700);
    await undo();
    var ok4 = eq(sig(), a.before) && customRows() === 0;
    await redo();
    var ok4r = eq(sig(), after4);
    await undo();
    add('I4u', 'Exactly one undo step: undo lands on the state just before (title kept), redo on the state after', ok4 && ok4r, sigDiff(a.before, sig()), 'one step');

    // I5: on a Monday Snap to Mon stays ticked.
    await rclick('2026-07-06', 'num');
    choose('phase-week');
    await settle();
    var k5 = lastCustomKey();
    add('I5', 'Add 1-week phase here on Mon 6 Jul keeps Snap to Mon ticked', !!k5 && (document.getElementById('snap-' + k5) || {}).checked === true
      && (document.getElementById('start-' + k5) || {}).value === '2026-07-06', {key: k5, snap: (document.getElementById('snap-' + k5) || {}).checked}, 'snap on');
    await T.sleep(700);
    await undo();

    // I6: Add note on Wed 8 Jul opens the note editor there, exactly as the day's "+" does.
    a = await primeThenOpen('2026-07-08', 'bar:production');
    choose('note');
    var pop = document.getElementById('mv-note-pop');
    var popDay = txt(pop && pop.querySelector('.mv-note-pop-day'));
    var focused = document.activeElement && document.activeElement.tagName;
    add('I6', 'Add note on 8 Jul opens the month note editor on 7/8/26 with the cursor in it, and the click that chose it does not close it',
      !!pop && popDay === '7/8/26' && focused === 'TEXTAREA' && !menuEl(), {pop: !!pop, day: popDay, focus: focused}, 'editor on 7/8/26');
    var ta6 = pop && pop.querySelector('textarea');
    if(ta6){ ta6.value = 'Day menu note'; ta6.dispatchEvent(new Event('input', {bubbles: true})); }
    ta6 && ta6.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
    await settle();
    var note6 = [].some.call(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="2026-07-08"]'), function (b) { return /Day menu note/.test(b.textContent); });
    await T.sleep(700);
    await undo();
    var note6u = [].some.call(document.querySelectorAll('#table-wrap .mv-note-block[data-note-day="2026-07-08"]'), function (b) { return /Day menu note/.test(b.textContent); });
    add('I6u', 'The note is written on 8 Jul when the editor commits, and one undo removes just the note (the title typed before stays)',
      note6 && !note6u && (document.getElementById('show-title') || {}).value === 'Menu step 4', {written: note6, afterUndo: note6u, title: (document.getElementById('show-title') || {}).value}, 'written, then undone');

    // ---- A: Add hiatus ▸ (plan step 2, §3.3) ----
    // On halfdays only Production runs on 8 Jul (Writer's Rm and the preps end before the shoot, Post starts
    // 11/2), so the submenu is All phases, then Production only. Every hiatus starts on its week's Monday.
    function subEl(){ return document.querySelector('.day-menu-sub'); }
    function subInfo(){
      var s = subEl();
      if(!s) return null;
      return {
        parent: s.getAttribute('data-parent'), label: txt(s.querySelector('.day-menu-label')),
        items: [].map.call(s.querySelectorAll('.day-menu-item'), function (b) {
          return {id: b.getAttribute('data-item'), text: txt(b.querySelector('.day-menu-text')).replace(txt(b.querySelector('small')), '').trim(),
                  disabled: b.getAttribute('aria-disabled') === 'true', second: txt(b.querySelector('small'))};
        }),
        ids: s.querySelectorAll('[id]').length + (s.id ? 1 : 0),
      };
    }
    function hoverItem(b){
      var q = b.getBoundingClientRect();
      b.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2}));
    }
    function rootBtn(id){ return menuEl().querySelector('[data-item="' + id + '"]'); }
    function subChoose(id){
      rootBtn('hiatus').click();                       // a click opens the submenu, focus on its first item
      var b = subEl() && subEl().querySelector('[data-item="' + id + '"]');
      if(!b) throw new Error('no submenu item ' + id);
      b.click();
    }
    function hiatusRows(){
      return [].map.call(document.querySelectorAll('#hiatus-list .hiatus-entry'), function (r) {
        return r.querySelector('.hiatus-start').value + '/' + r.querySelector('.hiatus-weeks').value + (r.querySelector('.hiatus-locked').checked ? '/locked' : '');
      });
    }
    function phi(){
      return {en: document.getElementById('phiatus-en-production').checked, start: document.getElementById('phiatus-start-production').value,
              weeks: document.getElementById('phiatus-weeks-production').value, shown: document.getElementById('phiatus-fields-production').style.display};
    }
    // Which of a range of days Production's bars cover, in the month on screen.
    function prodOn(days){ var p = pillDays('production'); return days.filter(function (d) { return p.indexOf(d) >= 0; }); }
    var WK6 = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'];
    var WK20 = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'];

    var sA = sig();
    await rclick('2026-07-08', 'bar:production');
    var hb = rootBtn('hiatus');
    var a0 = {haspopup: hb.getAttribute('aria-haspopup'), expanded: hb.getAttribute('aria-expanded'), chev: !!hb.querySelector('.day-menu-chev'), sub: !!subEl()};
    hoverItem(hb);
    var a1 = subInfo(), sr = subEl() && subEl().getBoundingClientRect(), ir = hb.getBoundingClientRect();
    var a1f = menuInfo().focus, a1x = hb.getAttribute('aria-expanded');
    add('A1', 'Add hiatus ▸ on 8 Jul: a chevron and aria-haspopup, closed until hovered; a hover opens the submenu BESIDE the item (inside the window) with focus left on the item: All phases, then "One phase only" and Production only, each "Week of Mon 6 Jul · 2 weeks"; no id inside',
      a0.haspopup === 'menu' && a0.expanded === 'false' && a0.chev && !a0.sub && !!a1 && a1.parent === 'hiatus' && a1.label === 'One phase only'
        && eq(a1.items.map(function (x) { return [x.id, x.text, x.second, x.disabled]; }),
              [['hiatus-all', 'All phases', 'Week of Mon 6 Jul · 2 weeks', false], ['hiatus-production', 'Production only', 'Week of Mon 6 Jul · 2 weeks', false]])
        && a1.ids === 0 && a1f === 'hiatus' && a1x === 'true'
        && Math.abs(sr.top - (ir.top - 5)) < 1.5 && (sr.left >= ir.right - 3 || sr.right <= ir.left + 3)
        && sr.left >= 0 && sr.top >= 0 && sr.right <= innerWidth && sr.bottom <= innerHeight,
      {before: a0, sub: a1, focus: a1f, expanded: a1x, sub_rect: sr && [sr.left, sr.top, sr.right, sr.bottom], item: [ir.left, ir.top, ir.right]},
      'submenu beside the item, focus on it');
    // A2: the grace period. Crossing the next item on the way in keeps the submenu; resting on it closes it.
    hoverItem(rootBtn('waterfall'));
    await T.sleep(80);
    var a2 = {crossing: !!subEl()};
    // Null-safe from here: a build that closes the submenu at once must turn THIS case red, not end the leg.
    function lit(el){ var b = el && el.querySelector('.is-active'); return b ? b.getAttribute('data-item') : null; }
    if(subEl()){
      subEl().dispatchEvent(new MouseEvent('mouseenter'));
      hoverItem(subEl().querySelector('[data-item="hiatus-production"]'));
    }
    await T.sleep(400);
    a2.reached = lit(subEl()) === 'hiatus-production';
    a2.rootLit = lit(menuEl());
    hoverItem(rootBtn('waterfall'));
    await T.sleep(400);
    a2.rested = !subEl();
    a2.rootNow = lit(menuEl());
    a2.expanded = rootBtn('hiatus').getAttribute('aria-expanded');
    add('A2', 'Moving into the submenu across "Show this week in the waterfall" (80 ms) keeps it open and lands on Production only; resting on that item (400 ms) closes it',
      a2.crossing && a2.reached && a2.rootLit === 'hiatus' && a2.rested && a2.rootNow === 'waterfall' && a2.expanded === 'false', a2, 'kept, then closed');
    // A3: the keyboard.
    var kk = [];
    function kstate(){ return (menuInfo() ? menuInfo().focus : 'closed') + (subEl() ? '+sub' : ''); }
    // Reached from the top, so the walk holds whatever sections follow This day (step 3 adds the bar's).
    key('Home'); kk.push(kstate());
    key('ArrowDown'); key('ArrowDown'); key('ArrowDown'); kk.push(kstate());
    key('ArrowRight'); kk.push(kstate());
    key('ArrowDown'); kk.push(kstate());
    key('ArrowLeft'); kk.push(kstate());
    key('Enter'); kk.push(kstate());
    key('Escape'); kk.push(kstate());
    key('Escape'); kk.push(menuEl() ? 'open' : 'closed');
    add('A3', 'Keys: → opens the submenu on its first item, ↓ moves in it, ← closes it back onto Add hiatus, Enter opens it, Escape closes the submenu first and then the menu',
      eq(kk, ['note', 'hiatus', 'hiatus-all+sub', 'hiatus-production+sub', 'hiatus', 'hiatus-all+sub', 'hiatus', 'closed']), kk,
      'note, hiatus, hiatus-all+sub, hiatus-production+sub, hiatus, hiatus-all+sub, hiatus, closed');
    await rclick('2026-07-08', 'bar:production');
    hoverItem(rootBtn('hiatus'));
    var ap = {opened: !!subEl()};
    if(subEl()) subEl().dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
    ap.menu = !!menuEl(); ap.sub = !!subEl();
    add('A1p', 'A press inside the submenu closes nothing (the outside-press rule counts the submenu as inside)',
      ap.opened && ap.menu && ap.sub, ap, 'menu and submenu open');
    key('Escape'); key('Escape');
    add('S3', 'Opening the submenu, by hover and by key, leaves fields.byId exactly as it was', eq(sig(), sA), sigDiff(sA, sig()), 'no change');

    // A4: All phases from SUNDAY 12 Jul: the week of Mon 6 Jul, two weeks, locked, a row like the sidebar's.
    var rowsA = hiatusRows();
    a = await primeThenOpen('2026-07-12', 'mid');
    subChoose('hiatus-all');
    await settle();
    var rows4 = hiatusRows(), after4a = rows4.slice(), p4 = prodOn(WK6);
    var bands4 = [].filter.call(document.querySelectorAll('#table-wrap .mv-hiatus-bar'), function (b) { return /Hiatus/.test(b.textContent); }).length;
    add('A4', 'All phases on Sun 12 Jul adds ONE all-phase hiatus row "2026-07-06/2/locked" (its Monday, 2 weeks, locked); the shoot pauses over 6-17 Jul, which show hiatus bands; fields.byId unchanged; menu gone',
      rows4.length === rowsA.length + 1 && rows4[rows4.length - 1] === '2026-07-06/2/locked' && p4.length === 0 && bands4 >= 2 && eq(sig(), a.before) && !menuEl() && !subEl(),
      {rows: rows4, prodOn: p4, bands: bands4, diff: sigDiff(a.before, sig())}, 'one row 2026-07-06/2/locked, no shoot 6-17 Jul');
    await T.sleep(700);
    await undo();
    var u4 = {rows: hiatusRows(), title: (document.getElementById('show-title') || {}).value, prod: prodOn(WK6)};
    await redo();
    var r4 = hiatusRows();
    await undo();
    add('A4u', 'Exactly one undo step: undo removes just the row (the title typed before stays, the shoot is back on 6-17 Jul), redo puts it back',
      eq(u4.rows, rowsA) && u4.title === 'Menu step ' + n && u4.prod.length === WK6.length && eq(r4, after4a) && eq(hiatusRows(), rowsA),
      {undo: u4, redo: r4}, 'undo = before, redo = after');

    // A5: Production only on Wed 8 Jul: its own hiatus switched on, from Mon 6 Jul, 2 weeks.
    a = await primeThenOpen('2026-07-08', 'bar:production');
    var phi0 = phi();
    subChoose('hiatus-production');
    await settle();
    var phi5 = phi(), d5 = sigDiff(a.before, sig()), p5 = prodOn(WK6), p5b = prodOn(WK20), after5 = sig();
    add('A5', 'Production only on Wed 8 Jul turns on Production\'s own hiatus from Mon 6 Jul for 2 weeks, shows its fields, and pauses only the shoot over 6-17 Jul (it resumes on 20 Jul); fields.byId changes only its toggle and start',
      phi0.en === false && phi5.en === true && phi5.start === '2026-07-06' && phi5.weeks === '2' && phi5.shown === 'flex'
        && p5.length === 0 && p5b.length === WK20.length && d5.added.length === 0 && d5.removed.length === 0
        && eq(d5.changed.slice().sort(), ['phiatus-en-production', 'phiatus-start-production']) && eq(hiatusRows(), rowsA),
      {before: phi0, after: phi5, diff: d5, prod6: p5, prod20: p5b}, 'en, 2026-07-06, 2 weeks; no shoot 6-17 Jul');
    await T.sleep(700);
    // A6: ruling Q2. With a hiatus of its own (stretched to 3 weeks first), the item MOVES it and keeps 3 weeks.
    T.set('phiatus-weeks-production', '3');
    await settle();
    await T.sleep(700);
    var s6m = sig();
    await rclick('2026-07-22', 'num');
    rootBtn('hiatus').click();
    var a6 = subInfo();
    var mv = a6 && a6.items.find(function (x) { return x.id === 'hiatus-production'; });
    subEl().querySelector('[data-item="hiatus-production"]').click();
    await settle();
    var phi6 = phi(), d6 = sigDiff(s6m, sig());
    add('A6', 'On Wed 22 Jul, with a 3-week hiatus of its own, the item reads "Move Production’s hiatus here" / "Week of Mon 20 Jul · 3 weeks"; it moves the start to Mon 20 Jul and KEEPS 3 weeks; only the start changes',
      !!mv && mv.text === 'Move Production’s hiatus here' && mv.second === 'Week of Mon 20 Jul · 3 weeks' && !mv.disabled
        && phi6.en === true && phi6.start === '2026-07-20' && phi6.weeks === '3' && eq(d6.changed, ['phiatus-start-production']) && d6.added.length === 0,
      {item: mv, after: phi6, diff: d6}, 'start 2026-07-20, 3 weeks kept');
    await T.sleep(700);
    // Inside the week it now starts, the move would change nothing: greyed out with its reason, and inert.
    await rclick('2026-07-21', 'num');
    rootBtn('hiatus').click();
    var a7 = subInfo(), mv7 = a7 && a7.items.find(function (x) { return x.id === 'hiatus-production'; });
    var s7m = sig();
    subEl().querySelector('[data-item="hiatus-production"]').click();
    add('A7', 'On Tue 21 Jul, the week its hiatus already starts, "Move Production’s hiatus here" is greyed out ("Its hiatus already starts this week") and clicking it changes nothing and leaves the menu open',
      !!mv7 && mv7.disabled && mv7.second === 'Its hiatus already starts this week' && eq(sig(), s7m) && !!subEl() && !!menuEl(),
      {item: mv7, diff: sigDiff(s7m, sig()), open: [!!menuEl(), !!subEl()]}, 'greyed, inert');
    key('Escape'); key('Escape');
    await undo();
    var u6 = phi();
    await undo();
    var u6b = phi();
    await undo();
    add('A5u', 'One undo per step: the move (start back to 6 Jul, 3 weeks), then the length (2 weeks), then the item itself (hiatus off, the title typed before kept)',
      u6.start === '2026-07-06' && u6.weeks === '3' && u6.en && u6b.weeks === '2' && u6b.en && eq(sig(), a.before) && phi().en === false,
      {move: u6, length: u6b, item: phi(), diff: sigDiff(a.before, sig())}, 'three steps back to before');

    // I7: Show this week in the waterfall from SUNDAY 12 Jul -- the week of the Monday BEFORE it.
    var s7 = sig();
    await rclick('2026-07-12', 'mid');
    choose('waterfall');
    await settle();
    box = document.getElementById('sheet-scroll-container');
    var note7 = box && box.querySelector('td.sheet-note-cell[data-week="2026-07-06"]');
    br = box && box.getBoundingClientRect();
    // The box's scrollport: inside its border and scrollbars.
    var port = br && {l: br.left + box.clientLeft, t: br.top + box.clientTop, r: br.left + box.clientLeft + box.clientWidth, b: br.top + box.clientTop + box.clientHeight};
    var nc = note7 && note7.getBoundingClientRect();
    add('I7', 'Show this week in the waterfall from Sun 12 Jul switches to the waterfall with the week of Mon 6 Jul\'s note cell inside the scroll box',
      sheetActive() && !!note7 && nc.top >= port.t && nc.bottom <= port.b && nc.left >= port.l - 1 && nc.right <= port.r + 1,
      {sheet: sheetActive(), cell: !!note7, port: port, row: nc && [nc.left, nc.top, nc.right, nc.bottom]}, '7/6 note cell in view');
    // G3: in the waterfall the browser keeps its menu.
    var g3 = nc ? rclickAt(Math.round(nc.left + 5), Math.round(nc.top + nc.height / 2)) : {prevented: true};
    add('G3', 'In the waterfall a right-click is left to the browser', !g3.prevented && !menuEl(), {prevented: g3.prevented}, 'not prevented');
    await T.sleep(700);
    await undo();
    add('I7u', 'One undo goes back to the month view', !sheetActive() && eq(sig(), s7), {sheet: sheetActive(), diff: sigDiff(s7, sig())}, 'month');

    // ---- G4-G6: a macOS Ctrl+click starts no month drag (plan §5) ----
    // Forced to a Mac for the guard and to Windows for the control, so the leg means the same on any host.
    function asPlatform(p, fn){
      Object.defineProperty(navigator, 'platform', {configurable: true, get: function () { return p.platform; }});
      Object.defineProperty(navigator, 'userAgentData', {configurable: true, get: function () { return {platform: p.uad}; }});
      try { return fn(); } finally { delete navigator.platform; delete navigator.userAgentData; }
    }
    var MAC = {platform: 'MacIntel', uad: 'macOS'}, WIN = {platform: 'Win32', uad: 'Windows'};
    function press(el, x, y, ctrl){
      el.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0, buttons: 1, ctrlKey: !!ctrl, clientX: x, clientY: y}));
    }
    function release(x, y){ window.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, button: 0, clientX: x, clientY: y})); }
    await toMonth('July 2026');
    var pb = await pointOn('2026-07-08', 'bar:production');
    var pillEl = document.elementFromPoint(pb.x, pb.y);
    var g4 = {};
    g4.macCtrl = asPlatform(MAC, function () { press(pillEl, pb.x, pb.y, true); var on = document.body.classList.contains('grid-swapping'); release(pb.x, pb.y); return on; });
    g4.winCtrl = asPlatform(WIN, function () { press(pillEl, pb.x, pb.y, true); var on = document.body.classList.contains('grid-swapping'); release(pb.x, pb.y); return on; });
    g4.plain = asPlatform(MAC, function () { press(pillEl, pb.x, pb.y, false); var on = document.body.classList.contains('grid-swapping'); release(pb.x, pb.y); return on; });
    add('G4', 'A Ctrl+press on a bar arms no body drag on a Mac (no body.grid-swapping); a plain press, and a Ctrl+press on Windows, still do',
      g4.macCtrl === false && g4.winCtrl === true && g4.plain === true && !document.body.classList.contains('grid-swapping'), g4, 'mac ctrl false, win ctrl true, plain true');

    // Production's handles: shown by a pointer move over its bar.
    async function handleFor(sel, iso, k){
      var p = await pointOn(iso, 'bar:' + k);
      var el = document.elementFromPoint(p.x, p.y);
      el.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, clientX: p.x, clientY: p.y}));
      return [].find.call(document.querySelectorAll('.phase-edge-handle'), function (h) { return !h.hidden && (!sel || h.matches(sel)); }) || null;
    }
    function shieldAfter(h, ctrl, plat){
      var r = h.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      return asPlatform(plat, function () { press(h, x, y, ctrl); var on = !!document.querySelector('.phase-edge-shield'); release(x, y); return on; });
    }
    var s6 = sig();
    var ph = await handleFor(null, '2026-07-08', 'production');
    var g5 = ph ? {macCtrl: shieldAfter(ph, true, MAC)} : {};
    ph = await handleFor(null, '2026-07-08', 'production');
    if(ph) g5.plain = shieldAfter(ph, false, MAC);
    add('G5', 'A Ctrl+press on one of Production\'s edge handles appends no drag shield on a Mac; a plain press does, and a release without a move changes nothing',
      !!ph && g5.macCtrl === false && g5.plain === true && !document.querySelector('.phase-edge-shield') && eq(sig(), s6), {handle: !!ph, g5: g5, diff: sigDiff(s6, sig())}, 'mac ctrl false, plain true');

    // Every other phase's handles: Post's start, on Mon 2 Nov.
    await toMonth('November 2026');
    var qh = await handleFor('[data-ph="post"]', '2026-11-02', 'post');
    var g6 = qh ? {macCtrl: shieldAfter(qh, true, MAC)} : {};
    qh = await handleFor('[data-ph="post"]', '2026-11-02', 'post');
    if(qh) g6.plain = shieldAfter(qh, false, MAC);
    add('G6', 'The same on Post\'s start handle (installPhaseEdgeHandles): no shield on a Mac Ctrl+press, a shield on a plain one, nothing changed',
      !!qh && g6.macCtrl === false && g6.plain === true && !document.querySelector('.phase-edge-shield') && eq(sig(), s6), {handle: !!qh, g6: g6, diff: sigDiff(s6, sig())}, 'mac ctrl false, plain true');

    // A right-click ON an edge handle (body-level, so it never reaches #table-wrap) opens the menu for its day and bar.
    qh = await handleFor('[data-ph="post"]', '2026-11-02', 'post');
    var qr = qh && qh.getBoundingClientRect();
    var h6 = qr ? rclickAt(Math.round(qr.left + qr.width / 2), Math.round(qr.top + qr.height / 2)) : {};
    var i6 = menuInfo();
    add('H6', 'A right-click on Post\'s start handle opens the menu for Mon 2 Nov with Post as its bar',
      !!qh && h6.el === qh && h6.prevented && i6 && i6.day === '2026-11-02' && i6.ph === 'post', {hit: h6.el && h6.el.className, info: i6}, '2 Nov, post');
    key('Escape');

    // ---- P: the bar's own section (plan step 3, §3.4–3.7) ----
    // Post (halfdays): a Weeks phase from Mon 2 Nov 2026, Snap to Mon ticked, 16 weeks. The leg is on November.
    function phaseLabel(){ var l = menuEl() && menuEl().querySelector('[data-section="phase"] .day-menu-label'); return l ? txt(l) : null; }
    function fv(id){ var e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : undefined; }
    function inNov(days){ return days.filter(function (d) { return d.slice(0, 7) === '2026-11'; }); }
    var NOV_WK1 = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];

    await rclick('2026-11-11', 'bar:post');
    var p1 = menuInfo();
    add('P1', 'Right-click on Post\'s bar on Wed 11 Nov: This day, then Post\'s own section headed "Post" with its colour, then the way out; Start, End, Colour… and Show in Phases card, none greyed out',
      !!p1 && eq(p1.sections, ['day', 'phase', 'out']) && phaseLabel() === 'Post' && !!menuEl().querySelector('[data-section="phase"] .day-menu-swatch')
        && eq(p1.items.filter(function (x) { return /^phase-(start|end|colour|show)$/.test(x.id); }).map(function (x) { return [x.id, x.disabled, x.second]; }),
              [['phase-start', false, 'Moves it. Its length stays'], ['phase-end', false, 'Keeps its start. Changes its length'], ['phase-colour', false, ''], ['phase-show', false, '']]),
      p1 && {sections: p1.sections, label: phaseLabel(), items: p1.items}, 'day, phase (Post), out');
    key('Escape');

    // P2: Start Post here on a WEDNESDAY: a mover, so the length stays and Snap to Mon comes off.
    a = await primeThenOpen('2026-11-11', 'bar:post');
    choose('phase-start');
    await settle();
    var p2 = {start: fv('start-post'), snap: fv('snap-post'), weeks: fv('weeks-post'), unit: fv('unit-post'), first: inNov(pillDays('post'))[0]};
    var after2 = sig();
    add('P2', 'Start Post here on Wed 11 Nov moves Post to start that day: start 2026-11-11, Snap to Mon UNTICKED, still 16 weeks in Weeks, its first bar day 11 Nov',
      p2.start === '2026-11-11' && p2.snap === false && p2.weeks === '16' && p2.unit === 'weeks' && p2.first === '2026-11-11' && !menuEl(),
      p2, 'start 2026-11-11, snap off, 16 weeks');
    await T.sleep(700);
    await undo();
    var ok2 = eq(sig(), a.before) && (document.getElementById('show-title') || {}).value === 'Menu step ' + n;
    await redo();
    var ok2r = eq(sig(), after2);
    await undo();
    add('P2u', 'Exactly one undo step: undo lands on the state just before (the title typed before kept), redo on the state after', ok2 && ok2r, sigDiff(a.before, sig()), 'one step');
    // On a Monday Snap to Mon is left ticked; on the day it already starts, the item is greyed out.
    await rclick('2026-11-16', 'bar:post');
    choose('phase-start');
    await settle();
    var p2m = {start: fv('start-post'), snap: fv('snap-post')};
    await T.sleep(700);
    await undo();
    await rclick('2026-11-02', 'bar:post');
    var p2g = item(menuInfo(), 'phase-start');
    key('Escape');
    add('P2m', 'Start Post here on Mon 16 Nov keeps Snap to Mon ticked; on Mon 2 Nov, where it already starts, the item is greyed out ("It already starts on this day")',
      p2m.start === '2026-11-16' && p2m.snap === true && p2g.disabled && p2g.second === 'It already starts on this day', {monday: p2m, onItsStart: p2g}, 'snap kept; greyed on 2 Nov');

    // P4: End Post here on Wed 11 Nov, the end handle's rule: Weeks first becomes Dates where it is drawn.
    a = await primeThenOpen('2026-11-11', 'bar:post');
    choose('phase-end');
    await settle();
    var p4 = {unit: fv('unit-post'), start: fv('start-post'), end: fv('end-post'), drawn: pillDays('post')};
    var d4 = sigDiff(a.before, sig());
    // weeks-<key> is a Dates phase's old-build fallback, kept in step by syncCustomUnitFallback() as the end handle does.
    add('P4', 'End Post here on Wed 11 Nov: Post becomes Dates from 2026-11-02 to 2026-11-11 and is drawn on exactly 2-6 and 9-11 Nov; fields.byId changes only its unit, start, end and weeks fallback',
      p4.unit === 'dates' && p4.start === '2026-11-02' && p4.end === '2026-11-11'
        && eq(p4.drawn, NOV_WK1.concat(['2026-11-09', '2026-11-10', '2026-11-11'])) && d4.added.length === 0 && d4.removed.length === 0
        && d4.changed.every(function (k) { return /^(unit|start|end|weeks)-post$/.test(k); }) && d4.changed.indexOf('end-post') >= 0,
      {fields: p4, diff: d4}, 'dates 11/2-11/11');
    await T.sleep(700);
    await rclick('2026-11-11', 'bar:post');
    var p4g = item(menuInfo(), 'phase-end');
    key('Escape');
    await undo();
    add('P4u', 'On the day it now ends, End Post here is greyed out ("It already ends on this day"); one undo puts Post back in Weeks with the title typed before kept',
      p4g.disabled && p4g.second === 'It already ends on this day' && eq(sig(), a.before) && fv('unit-post') === 'weeks', {greyed: p4g, diff: sigDiff(a.before, sig())}, 'greyed, then one step back');

    // P5: Colour… opens the swatch's own picker under the bar; a pick is one step.
    // The bar is read BEFORE the right-click: the menu opens at the pointer, so its corner covers that point.
    function barAt(q){ var el = document.elementFromPoint(q.x, q.y); return el && el.closest && el.closest('.mv-pill[data-ph="post"]'); }
    T.set('show-title', 'Menu step ' + (++n));
    a = {before: sig()};
    var q5 = await pointOn('2026-11-04', 'bar:post');
    var bar5 = barAt(q5);
    var bg0 = bar5 && getComputedStyle(bar5).backgroundColor, sw0 = document.getElementById('swatch-post').style.background;
    rclickAt(q5.x, q5.y);
    choose('phase-colour');
    await T.sleep(50);                                   // its click-away listeners attach after a tick
    var pop5 = document.querySelector('.phase-color-pop');
    var pr5 = pop5 && pop5.getBoundingClientRect(), br5 = bar5 && bar5.getBoundingClientRect();
    var sel0 = pop5 ? [].findIndex.call(pop5.children, function (c) { return c.classList.contains('selected'); }) : -1;
    var pick = sel0 === 6 ? 7 : 6;
    var p5open = !!pop5 && !menuEl() && Math.abs(pr5.left - br5.left) < 2 && pr5.top >= br5.bottom && pr5.top - br5.bottom < 12 && sel0 >= 0;
    if(pop5) pop5.children[pick].click();
    await settle();
    var bar5b = barAt(await pointOn('2026-11-04', 'bar:post'));
    var p5 = {open: p5open, selected: sel0, picked: pick, pill: bar5b && getComputedStyle(bar5b).backgroundColor, was: bg0,
              swatch: document.getElementById('swatch-post').style.background, swatchWas: sw0, popGone: !document.querySelector('.phase-color-pop')};
    add('P5', 'Colour… on Post\'s bar opens the colour picker just under the bar, on Post\'s current colour; a pick repaints the bars and the sidebar swatch',
      p5.open && p5.popGone && p5.pill !== p5.was && p5.swatch !== p5.swatchWas && p5.pill === p5.swatch, p5, 'picker under the bar; bars and swatch repainted');
    await T.sleep(700);
    await undo();
    var bar5c = barAt(await pointOn('2026-11-04', 'bar:post'));
    add('P5u', 'One undo puts Post\'s colour back, keeping the title typed before',
      !!bar5c && getComputedStyle(bar5c).backgroundColor === bg0 && document.getElementById('swatch-post').style.background === sw0
        && (document.getElementById('show-title') || {}).value === 'Menu step ' + n,
      {pill: bar5c && getComputedStyle(bar5c).backgroundColor, swatch: document.getElementById('swatch-post').style.background}, 'the old colour');

    // P6: Show in Phases card.
    var showTab = [].find.call(document.querySelectorAll('.side-tab-btn'), function (b) { return b.dataset.tab === 'show'; });
    if(showTab) showTab.click();
    await T.sleep(700);
    a = await primeThenOpen('2026-11-04', 'bar:post');   // a title typed just before: the step must not fold it in
    choose('phase-show');
    await T.sleep(100);
    var row6 = document.getElementById('swatch-post').closest('.phase-row'), fp = document.querySelector('.form-panel');
    var rr6 = row6.getBoundingClientRect(), fr6 = fp.getBoundingClientRect();
    var p6 = {tab: activeTab(), row: [Math.round(rr6.top), Math.round(rr6.bottom)], panel: [Math.round(fr6.top), Math.round(fr6.bottom)]};
    add('P6', 'Show in Phases card switches the sidebar to Phases with Post\'s row in view',
      p6.tab === 'phases' && rr6.top >= fr6.top - 1 && rr6.top < fr6.bottom && !menuEl(), p6, 'phases, row in view');
    await T.sleep(700);
    await undo();
    add('P6u', 'Exactly one undo step: it goes back to the Show tab and keeps the title typed just before',
      activeTab() === 'show' && eq(sig(), a.before) && (document.getElementById('show-title') || {}).value === 'Menu step ' + n,
      {tab: activeTab(), diff: sigDiff(a.before, sig())}, 'show, title kept');

    // P3: Production. End is greyed out (ruling Q3), and Start is a MOVER: a day mark travels with the shoot BY
    // SHOOT-DAY NUMBER (owner ruling R2). Marked off through the real Full day/Off popover on Wed 8 Jul, natural
    // shoot day 7 (6/29, 6/30, 7/1, 7/2, 7/6, 7/7, 7/8; 7/3 is a holiday). Moved to Mon 13 Jul, day 7 is Tue 21
    // Jul (7/13-7/17, 7/20, 7/21), so the mark lands there and Wed 22 Jul becomes shoot day 7. A mark left on its
    // DATE would leave 21 Jul as shoot day 7.
    await toMonth('July 2026');

    // P7: R5, as on the body drag (merged from main, 19 Oct 2026). An EDITED auto-note follows its date: the
    // waterfall note "Start Principal Photography 6/29/26" with a line of the user's added. Start Production here
    // on Mon 13 Jul swaps the stale auto text for the week's own NOW, so nothing says 6/29/26 any more, the user's
    // line stays, and 13 Jul carries "Start Principal Photography 7/13/26". A menu that skipped it leaves the old
    // date on the calendar (and in Excel and both PDFs).
    // ⚠️ The month view draws each LINE of a note as its own block, so the two lines are checked across blocks.
    function noteTexts(){ return [].map.call(document.querySelectorAll('#table-wrap .mv-note-block'), function (b) { return txt(b); }); }
    function has(list, re){ return list.some(function (t) { return re.test(t); }); }
    var sp = [].find.call(document.querySelectorAll('#table-wrap .mv-note-block[data-note-kind="wf"]'), function (b) { return /Start Principal Photography 6\/29\/26/.test(txt(b)); });
    if(sp){ await bringIntoView(sp); sp = [].find.call(document.querySelectorAll('#table-wrap .mv-note-block[data-note-kind="wf"]'), function (b) { return /Start Principal Photography 6\/29\/26/.test(txt(b)); }); sp.click(); }
    var ta7 = document.querySelector('#mv-note-pop textarea');
    if(ta7){ ta7.value = ta7.value + '\nCall sheet out'; ta7.dispatchEvent(new Event('input', {bubbles: true}));
             ta7.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})); }
    await settle();
    await T.sleep(700);
    var n7a = noteTexts();
    a = await primeThenOpen('2026-07-13', 'bar:production');
    choose('phase-start');
    await settle();
    var n7b = noteTexts();
    add('P7', 'R5: with "Start Principal Photography 6/29/26" edited (a line added), Start Production here on Mon 13 Jul leaves no note saying 6/29/26, keeps the added line, and shows "Start Principal Photography 7/13/26"',
      !!ta7 && has(n7a, /Start Principal Photography 6\/29\/26/) && has(n7a, /Call sheet out/)
        && !n7b.some(function (t) { return /6\/29\/26/.test(t); }) && n7b.some(function (t) { return /Call sheet out/.test(t); })
        && n7b.some(function (t) { return /Start Principal Photography 7\/13\/26/.test(t); }),
      {editor: !!ta7, before: n7a.filter(function (t) { return /Principal|Call sheet/.test(t); }), after: n7b.filter(function (t) { return /Principal|Call sheet|6\/29/.test(t); })},
      'no 6/29/26; the line kept; 7/13/26 shown');
    await T.sleep(700);
    await undo();
    var n7u = noteTexts();
    await undo();                                       // the title typed before,
    await undo();                                       // and the note edit, so P3 starts clean
    add('P7u', 'One undo puts the shoot back on 29 Jun with the edited note saying 6/29/26 again',
      fv('start-production') === '2026-06-29' && has(n7u, /Start Principal Photography 6\/29\/26/) && has(n7u, /Call sheet out/) && !has(n7u, /7\/13\/26/),
      {start: fv('start-production'), notes: n7u.filter(function (t) { return /Principal|Call sheet/.test(t); })}, 'back to 6/29/26 with the line');

    var p8 = await pointOn('2026-07-08', 'num');
    document.elementFromPoint(p8.x, p8.y).dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: p8.x, clientY: p8.y, button: 0}));
    var offOpt = document.querySelector('.day-ov-pop .day-ov-opt[data-ov="off"]');
    if(offOpt) offOpt.click();
    await settle();
    await T.sleep(700);
    function header(iso){ return rclick(iso, 'num').then(function () { var c = menuInfo().ctx; key('Escape'); return c; }); }
    var h3a = {d8: await header('2026-07-08'), d9: await header('2026-07-09')};
    a = await primeThenOpen('2026-07-13', 'bar:production');
    var p3e = item(menuInfo(), 'phase-end');
    choose('phase-start');
    await settle();
    var h3b = {start: fv('start-production'), first: pillDays('production')[0], d21: await header('2026-07-21'), d22: await header('2026-07-22')};
    add('P3', 'Production: End is greyed out ("Its end comes from the shoot days"); Start Production here on Mon 13 Jul moves the shoot there AND its Off mark with it by shoot-day number: off on 8 Jul (9 Jul shoot day 7) before, off on 21 Jul (22 Jul shoot day 7) after',
      !!offOpt && p3e.disabled && p3e.second === 'Its end comes from the shoot days' && !/Shoot day/.test(h3a.d8) && /^Shoot day 7 /.test(h3a.d9)
        && h3b.start === '2026-07-13' && h3b.first === '2026-07-13' && !/Shoot day/.test(h3b.d21) && /^Shoot day 7 /.test(h3b.d22),
      {offOpt: !!offOpt, end: p3e, before: h3a, after: h3b}, 'mark on 21 Jul, 22 Jul shoot day 7');
    await T.sleep(700);
    await undo();
    var h3u = {start: fv('start-production'), d8: await header('2026-07-08'), d9: await header('2026-07-09')};
    add('P3u', 'One undo moves the shoot back to 29 Jun with the mark back on 8 Jul (9 Jul shoot day 7), the title typed before kept',
      h3u.start === '2026-06-29' && !/Shoot day/.test(h3u.d8) && /^Shoot day 7 /.test(h3u.d9) && eq(sig(), a.before), h3u, 'back, mark on 8 Jul');
    await undo();                                       // the title typed before the item,
    await undo();                                       // and the mark itself, so S2 starts clean
    await toMonth('November 2026');

    // ---- S2: a shareable copy exported with the menu open carries no menu ----
    var settings = [].find.call(document.querySelectorAll('.side-tab-btn'), function (b) { return b.dataset.tab === 'settings'; });
    if(settings) settings.click();
    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    await T.sleep(900);
    await rclick('2026-11-04', 'num');
    hoverItem(rootBtn('hiatus'));                      // and its submenu, which is a .day-menu too
    // ⚠️ Built from pieces. The harness injects THIS script into the page, so the copy serialises its
    // source too, and a literal pattern here would find itself there (the trap sharecopy2 records for the
    // app's own bundle). The rendered markup is the only place the joined string can occur.
    var MENU_RE = new RegExp('<div class="day-' + 'menu" role="menu"'), RING_RE = new RegExp('<div class="day-' + 'menu-ring"');
    var SUB_RE = new RegExp('<div class="day-' + 'menu day-' + 'menu-sub" role="menu"');
    var liveHas = MENU_RE.test(document.body.outerHTML) && RING_RE.test(document.body.outerHTML) && SUB_RE.test(document.body.outerHTML);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var stillOpen = !!menuEl();
    add('S2', 'A shareable copy exported with the menu and its Add hiatus submenu open contains none of the menu, the submenu or the ring (and the live page did hold all three, so the check is not vacuous)',
      liveHas && stillOpen && html.length > 100000 && !MENU_RE.test(html) && !RING_RE.test(html) && !SUB_RE.test(html),
      {liveHas: liveHas, stillOpen: stillOpen, bytes: html.length, menuInCopy: MENU_RE.test(html), ringInCopy: RING_RE.test(html), subInCopy: SUB_RE.test(html)}, 'none in the copy');
    key('Escape');
    key('Escape');

    out.health = T.appHealth();
    add('E1', 'No uncaught page errors', !(out.health.errors || []).length, out.health.errors, '[]');
  } catch (e) {
    out.error = String(e && e.stack || e);
    add('X', 'the leg ran to the end', false, out.error, 'no exception');
  }
  out.cases = cases;
  out.pass = cases.length > 0 && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
