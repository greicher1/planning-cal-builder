// mvbarcard -- double-click a month-view bar to open its phase's card (owner, 28 Oct 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh mvbarcard 300
//
// "When you double click on a phase in the month view, could it reveal that phase menu in the left side bar"
// The double-click runs the day menu's own Show in Phases card (showPhaseRow): the Phases tab, the card unfolded,
// scrolled into view, one undo step (the tab is saved state). The bar is found BY POINT, so it must work through an
// edge handle laid over the bar's end, whose press puts a full-window shield on top and makes the dblclick's target
// <body>. Every double-click here is the whole real sequence (press, release, click, twice, then dblclick), each
// event dispatched at what is on top at that moment, never at a node picked by selector.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays):
//   custom1    Set Build   Mon 3/1/27 x 4 weeks
//   production             Mon 5/3/27, 4 episodes x 5 days, 3 days of prep before each episode
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'mvbarcard', cases: [] };
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
  async function tab(name) {
    var b = document.querySelector('.side-tab-btn[data-tab="' + name + '"]'); if (b) b.click();
    await settle();
  }
  function activeTab() { var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  function rowOf(key) { var sw = $('swatch-' + key); return sw ? sw.closest('.phase-row') : null; }
  function folded(key) { var r = rowOf(key); return !!r && r.classList.contains('is-collapsed'); }
  async function fold(key) {
    await tab('phases');
    var r = rowOf(key), b = r && r.querySelector(':scope > .custom-phase-header > .phase-collapse-btn');
    if (!b) throw new Error('no caret on ' + key + '\'s card');
    if (!folded(key)) b.click();
    await T.sleep(150);
  }
  // The card's box against the box the sidebar scrolls in: on screen means wholly inside both.
  function cardOnScreen(key) {
    var r = rowOf(key);
    if (!r || !r.getClientRects().length) return false;
    var b = r.getBoundingClientRect(), top = 0, bottom = innerHeight;
    for (var a = r.parentElement; a && a !== document.body; a = a.parentElement) {
      var cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowY) && a.scrollHeight > a.clientHeight) {
        var ar = a.getBoundingClientRect(); top = Math.max(top, ar.top); bottom = Math.min(bottom, ar.bottom);
      }
    }
    return b.top >= top - 1 && b.top < bottom && Math.min(b.bottom, bottom) - b.top >= Math.min(40, b.height);
  }
  function sig() {                                     // the calendar's inputs that a bar's dates live in
    var o = {};
    ['start-custom1', 'weeks-custom1', 'start-production', 'num-episodes', 'shoot-days-per-ep', 'prep-days'].forEach(function (id) {
      o[id] = ($(id) || {}).value;
    });
    return JSON.stringify(o);
  }
  // A real double-click at (x, y). Each event goes to what is on top when it happens: a press on an edge handle
  // appends a shield, so the release lands on that, and the click and dblclick on the two targets' common
  // ancestor (Chrome's rule), which is <body> there.
  // A real pointer moves before each press, which is what shows an edge handle again after its first press hid it.
  // Returns each click's targets, by class.
  function name(e) { return e ? (e === document.body ? 'BODY' : (e.className && String(e.className)) || e.tagName) : null; }
  async function dblAt(x, y, from) {
    var seen = [];
    for (var i = 1; i <= 2; i++) {
      var dx = (i === 2 && from) ? from.x : x, dy = (i === 2 && from) ? from.y : y;
      var o = { bubbles: true, cancelable: true, composed: true, clientX: dx, clientY: dy, button: 0, buttons: 1, detail: i };
      (document.elementFromPoint(dx, dy) || document.body).dispatchEvent(new MouseEvent('mousemove', Object.assign({}, o, { buttons: 0 })));
      await T.sleep(30);
      var down = document.elementFromPoint(dx, dy) || document.body;
      down.dispatchEvent(new MouseEvent('mousedown', o));
      var u = Object.assign({}, o, { clientX: x, clientY: y, buttons: 0 });
      var up = document.elementFromPoint(x, y) || document.body;
      up.dispatchEvent(new MouseEvent('mouseup', u));
      var c = down.contains(up) ? down : up.contains(down) ? up : document.body;
      if (!c.isConnected) c = document.body;
      c.dispatchEvent(new MouseEvent('click', u));
      if (i === 2) c.dispatchEvent(new MouseEvent('dblclick', u));
      seen.push({ down: name(down), up: name(up), click: name(c) });
      await T.sleep(60);
    }
    await settle();
    return seen;
  }
  function centre(e) { var r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
  async function bar(sel) {
    var p = document.querySelector('#table-wrap .mv-pill' + sel);
    if (!p) throw new Error('no bar ' + sel + ' in ' + txt(document.querySelector('#table-wrap .mv-monthyear')));
    p.scrollIntoView({ block: 'center', inline: 'nearest' });
    await T.sleep(150);
    return p;
  }
  function onTop(x, y) { var e = document.elementFromPoint(x, y); return e ? (e.className && String(e.className)) || e.tagName : null; }

  try {
    await T.appReady();
    T.set('show-title', 'Bar Card Test'); T.set('season-num', '1');   // Season completes Show Info: Production schedules
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-production', '2027-05-03');
    $('add-phase-btn').click();
    await T.sleep(200);
    T.set('name-custom1', 'Set Build'); T.set('start-custom1', '2027-03-01'); T.set('weeks-custom1', '4');
    T.set('prep-days', '3');
    await settle();
    var sig0 = sig();

    await step('B1', async function () {
      await fold('production');
      var f0 = folded('production');
      await tab('show');
      await toMonth('May 2027');
      var p = await bar('[data-ph="production"]'), c = centre(p), top = onTop(c.x, c.y);
      await dblAt(c.x, c.y);
      kase('B1', 'a double-click on a Production bar, with the Show tab open and Production\'s card folded, opens the Phases tab with that card unfolded and on screen',
           f0 && /mv-pill/.test(top) && activeTab() === 'phases' && !folded('production') && cardOnScreen('production'),
           { f0: f0, onTop: top, tab: activeTab(), folded: folded('production'), onScreen: cardOnScreen('production') });
    });

    await step('B2', async function () {
      var same = sig() === sig0;
      $('undo-btn').click(); await settle();
      var back = activeTab();
      $('redo-btn').click(); await settle();
      kase('B2', 'the bar did not move (every date input unchanged), and it is ONE undo step: Undo puts the Show tab back, Redo the Phases tab',
           same && back === 'show' && activeTab() === 'phases' && sig() === sig0, { same: same, afterUndo: back, afterRedo: activeTab() });
    });

    await step('B3', async function () {
      await fold('custom1');
      await tab('show');
      await toMonth('March 2027');
      var pills = Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="custom1"]'));
      var p = pills[pills.length - 1];
      if (!p) throw new Error('no Set Build bar in March 2027');
      p.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(150);
      var pr = p.getBoundingClientRect(), hy = Math.round(pr.top + pr.height / 2);
      p.dispatchEvent(new MouseEvent('mousemove', { clientX: pr.left + pr.width / 2, clientY: hy, bubbles: true }));
      await T.sleep(100);
      var h = document.querySelector('.phase-edge-handle[data-ph="custom1"][data-edge="end"]:not([hidden])');
      if (!h) throw new Error('no end handle over Set Build\'s bar');
      var hx = Math.round(centre(h).x), top = onTop(hx, hy);
      var seen = { shield: false };
      // From the records: the press appends the shield and the release removes it in the same task, before any callback.
      var mo = new MutationObserver(function (recs) {
        recs.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.classList && n.classList.contains('phase-edge-shield')) seen.shield = true; }); });
      });
      mo.observe(document.body, { childList: true });
      var clicks = await dblAt(hx, hy);
      mo.disconnect();
      var last = clicks[1] || {};
      kase('B3', 'through the END HANDLE over Set Build\'s bar (each press puts a shield on top, so the dblclick lands on <body>): the Phases tab opens with Set Build\'s card unfolded and on screen, and nothing moved',
           /phase-edge-handle/.test(top) && seen.shield && /phase-edge-handle/.test(last.down) && last.click === 'BODY' &&
           activeTab() === 'phases' && !folded('custom1') && cardOnScreen('custom1') &&
           sig() === sig0 && !document.querySelector('.phase-edge-shield'),
           { onTop: top, shield: seen.shield, clicks: clicks, tab: activeTab(), folded: folded('custom1'), onScreen: cardOnScreen('custom1'), same: sig() === sig0 });
    });

    await step('B4', async function () {
      await fold('episodePrep');
      await tab('show');
      await toMonth('May 2027');
      var p = await bar('[data-ph="episodePrep"]'), c = centre(p), top = onTop(c.x, c.y);
      await dblAt(c.x, c.y);
      kase('B4', 'a Prep bar opens the Prep card (it has no dates of its own, but it has a card)',
           /mv-pill/.test(top) && activeTab() === 'phases' && !folded('episodePrep') && cardOnScreen('episodePrep'),
           { onTop: top, tab: activeTab(), folded: folded('episodePrep'), onScreen: cardOnScreen('episodePrep') });
    });

    await step('B5', async function () {
      await tab('show');
      var p = await bar('[data-ph="production"]'), c = centre(p);
      await dblAt(c.x, c.y, { x: c.x + 40, y: c.y + 40 });   // the second press began 40 px away: a drag's end
      var t1 = activeTab();
      // A day with no bar: the number band at the top of a day cell mid-month (bars and notes sit below it).
      var cell = document.querySelectorAll('#table-wrap .mv-body > .mv-week > .mv-daygrid > .mv-daycell')[10];
      if (!cell) throw new Error('no day cell');
      cell.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(150);
      var num = cell.querySelector('.mv-daynum'), cr = cell.getBoundingClientRect();
      var cc = num && num.getClientRects().length ? centre(num) : { x: Math.round(cr.left + cr.width / 2), y: Math.round(cr.top + 6) };
      var dayTop = onTop(cc.x, cc.y);
      await dblAt(cc.x, cc.y);
      var t2 = activeTab();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));   // the day menu, if open
      await T.sleep(150);
      kase('B5', 'nothing but a bar opens a card: a double-click whose press travelled past the click slop, and one on a day with no bar, both leave the Show tab open',
           t1 === 'show' && t2 === 'show' && !/mv-pill/.test(dayTop) && sig() === sig0, { afterTravel: t1, afterDay: t2, dayOnTop: dayTop });
    });

    await step('B6', async function () {
      await view('sheet');
      var td = document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="custom1"]');
      if (!td) throw new Error('no Set Build cell in the waterfall');
      td.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(150);
      var c = centre(td); await dblAt(c.x, c.y);
      var t = activeTab();
      kase('B6', 'the WATERFALL is untouched: a double-click on a phase cell there keeps its own meaning and opens no card',
           t === 'show', { tab: t });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'mvbarcard threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
