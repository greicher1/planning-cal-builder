// weeknum -- the month view numbers weeks as the waterfall does (OFF-WEEK-PLAN.md step B; owner ruling Q5).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture> ./run.sh weeknum 900
//
// Before step B, prodWeekLabel() counted CALENDAR weeks from a segment's start, while the waterfall's week loop
// skips all-phase hiatus weeks, the phase's own hiatus and Production's off weeks. So after any hiatus the two
// views named the same week differently: on dayoverrides, the week of 7/20/26 read "Production wk 3" in the
// waterfall and "Production Week 4" in the month view; across the winter hiatus, "Post wk 8" vs "Post Week 10".
//
// N0, on any calendar: every month-view bar whose label carries "Week N" -- across EVERY month, every phase but
// prep -- names the same N as the waterfall's cell for that phase in that week. The bar's week is the Monday of
// its first day, the row the waterfall files that day under. N1 says how many bars were compared, so a page
// that drew nothing cannot pass. The fixed cases (N2..) hold named weeks to the hand count for two fixtures,
// and D1 reads the day menu's header, the third place the label reaches.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'weeknum'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  var DAY = 864e5;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(d){ return d.toISOString().slice(0, 10); }
  function mondayIso(d){ var g = d.getUTCDay(); return iso(new Date(d.getTime() - ((g + 6) % 7) * DAY)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(300);
  }
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  function monthOnScreen(){
    var t = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var m = /(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/.exec(t);
    return m ? {label: m[0], first: new Date(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1))} : null;
  }
  async function toMonth(label){
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 60; i++){
      var cur = monthOnScreen();
      if(cur && cur.label === label) return;
      var btn = $(Date.parse('1 ' + cur.label) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label);
      btn.click(); await T.sleep(200);
    }
    throw new Error('never reached ' + label);
  }

  // The waterfall: phase key | week Monday -> the N of its "wk N" cell.
  function waterfallNumbers(){
    var m = {};
    document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey]:not(.sheet-hiatus-cell)').forEach(function (td) {
      var n = /\bwk (\d+)\s*$/i.exec(txt(td));   // "Pre Prep Wk N" is capitalised
      if(n) m[td.getAttribute('data-pkey') + '|' + td.getAttribute('data-week')] = +n[1];
    });
    return m;
  }
  // The month on screen: every bar with a "Week N" in its label, as {key, week, n, label, first}.
  function monthBars(){
    var cur = monthOnScreen(); if(!cur) return [];
    var gs = new Date(cur.first.getTime() - cur.first.getUTCDay() * DAY), bars = [];
    document.querySelectorAll('#table-wrap .mv-body > .mv-week').forEach(function (w, k) {
      w.querySelectorAll('.mv-pill[data-ph]').forEach(function (p) {
        var key = p.getAttribute('data-ph');
        if(key === 'episodePrep') return;           // prep is named by its episode, never by week
        var label = p.getAttribute('title') || txt(p);
        var all = label.match(/Week (\d+)/g);
        if(!all) return;
        var col = parseInt(String(p.style.gridColumn || '').split('/')[0], 10);
        var first = new Date(gs.getTime() + (7 * k + col - 1) * DAY);
        bars.push({key: key, week: mondayIso(first), first: iso(first), n: +all[all.length - 1].split(' ')[1], label: label});
      });
    });
    return bars;
  }
  async function allMonthBars(){
    await view('month');
    for(var i = 0; i < 80 && $('mv-prev') && !$('mv-prev').disabled; i++){ $('mv-prev').click(); await T.sleep(150); }
    var seen = {}, bars = [];
    for(var j = 0; j < 80; j++){
      var cur = monthOnScreen();
      monthBars().forEach(function (b) {
        var id = b.key + '|' + b.first + '|' + b.label;
        if(!seen[id]){ seen[id] = 1; bars.push(b); }
      });
      if(!$('mv-next') || $('mv-next').disabled) break;
      $('mv-next').click(); await T.sleep(150);
      if(monthOnScreen() && cur && monthOnScreen().label === cur.label) await T.sleep(300);
    }
    return bars;
  }
  function barAt(bars, key, week){ return bars.filter(function (b) { return b.key === key && b.week === week; }); }

  // The day menu's header for a day, through a HIT-TESTED right-click on the day-number band.
  async function menuHeader(dayIso){
    var d = new Date(dayIso + 'T00:00:00Z');
    await toMonth(MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear());
    var cur = monthOnScreen(), gs = new Date(cur.first.getTime() - cur.first.getUTCDay() * DAY);
    var idx = Math.round((d - gs) / DAY), row = Math.floor(idx / 7), col = idx % 7;
    var w = document.querySelectorAll('#table-wrap .mv-body > .mv-week')[row];
    var cell = w && w.querySelectorAll('.mv-daycell')[col];
    if(!cell) throw new Error('no cell for ' + dayIso);
    cell.scrollIntoView({block: 'center'}); await T.sleep(150);
    var r = cell.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + 8);
    var el = document.elementFromPoint(x, y);
    var base = {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('contextmenu', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    await T.sleep(300);
    var h = txt(document.querySelector('.day-menu .day-menu-ctx'));
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(200);
    return h;
  }

  try {
    var st = new URLSearchParams(location.search).get('state') || '';
    out.state = st;
    await T.appReady();
    await settle();
    await view('sheet');
    var wf = waterfallNumbers();
    out.wfCells = Object.keys(wf).length;
    var bars = await allMonthBars();
    var bad = bars.filter(function (b) { return wf[b.key + '|' + b.week] !== b.n; });
    out.compared = bars.length;
    out.mismatch = bad.slice(0, 12).map(function (b) { return b.label + ' @' + b.first + ' (waterfall: ' + wf[b.key + '|' + b.week] + ')'; });
    out.keys = Array.from(new Set(bars.map(function (b) { return b.key; })));
    check(!bad.length, 'N0 every month-view "Week N" (' + bars.length + ' bars, phases ' + out.keys.join(', ') + ') names the waterfall\'s number for that phase and week');
    check(bars.length > 5 && out.wfCells > 5, 'N1 the comparison saw bars and cells (' + bars.length + ' bars, ' + out.wfCells + ' waterfall cells)');

    if(st === 'dayoverrides'){
      var p = barAt(bars, 'production', '2026-07-20'), q = barAt(bars, 'post', '2027-01-04'), w = barAt(bars, 'writersRoom', '2026-03-23');
      out.fixed = {p: p.map(function (b) { return b.label; }), q: q.map(function (b) { return b.label; }), w: w.map(function (b) { return b.label; })};
      check(p.length && p.every(function (b) { return / Production Week 3$/.test(' ' + b.label) || /Production Week 3$/.test(b.label); }),
            'N2 the week after Summer Break (7/20/26) reads Production Week 3, as the waterfall\'s wk 3 (it read Week 4)');
      check(q.length && q.every(function (b) { return /Post Week 8$/.test(b.label); }),
            'N3 the week after the winter hiatus (1/4/27) reads Post Week 8, as the waterfall\'s wk 8 (it read Week 10)');
      check(w.length && w.every(function (b) { return /Week 12$/.test(b.label); }),
            'N4 a phase with no hiatus in its run reads as before: Writer\'s Room\'s 12th calendar week is its Week 12');
      var h = await menuHeader('2026-07-22');
      out.menu = h;
      check(/Production Week 3\b/.test(h), 'D1 the day menu\'s header for Wed 7/22/26 names Production Week 3 (' + h + ')');
    }
    if(st === 'offweek'){
      var a = barAt(bars, 'production', '2027-09-13'), z = barAt(bars, 'production', '2027-11-01');
      out.fixed = {a: a.map(function (b) { return b.label; }), z: z.map(function (b) { return b.label; })};
      check(a.length && a.every(function (b) { return /Production Week 4$/.test(b.label); }),
            'N5 after the hiatus and two off weeks, 9/13/27 reads Production Week 4 as in the waterfall (it read Week 7)');
      check(z.length && z.every(function (b) { return /Production Week 10$/.test(b.label); }),
            'N6 the wrap week, 11/1/27, reads Production Week 10 (it read Week 14)');
    }
    out.health = T.appHealth();
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
