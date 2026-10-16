// halfworked -- the 'half' and 'onhalf' day overrides, now WITHDRAWN as choices.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides-onhalf ./run.sh halfworked 150
//
// History: 'half' (an ordinary shoot day worked half, 16-21 Sep 2026) and 'onhalf' (a weekend or holiday
// worked half, 29 Sep 2026) were day marks set from the month view's day menu. On 15 Oct 2026 the owner
// withdrew both: "Half days means instances where we would switch to the next episode or block half way
// thru a day ... We don't need a function to mark random days as half days." A half day is now a day
// count ending in .5 (the halfdays leg). Ruling, same day: "Keep them as they are" -- a mark already
// saved keeps counting, still shows, still travels with a move, and can be cleared; it cannot be made.
//
// tests/fixtures/dayoverrides-onhalf.sptcal (cut by this leg's earlier version, from the running app):
// Production from Mon 6/29/26, 80 days, US General, with
//   7/3  'onhalf' -- the observed Independence Day, worked half
//   7/6  'half'   -- shoot day 5
//   7/7  'off'    -- shoot day 6
//   7/11 'on'     -- a worked Saturday
//   8/1  'onhalf' -- a Saturday worked half
// and a LOCKED one-week "Summer Break" hiatus from 7/13. A mark is proved HONOURED by changing it: the
// work counted goes up by exactly 0.5 on the same wrap.
//
// Every day is opened through the real gesture: the cell is HIT-TESTED at its day-number band (the
// only part of a day cell a pointer can reach -- HANDOFF, 18 Sep 2026) and the element actually on
// top there is clicked. A dispatched event at the node would prove the handler and nothing else.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'halfworked'};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function txt(id){ return ((document.getElementById(id) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function reading(){ return {meta: txt('meta-production'), note: txt('prod-ov-note')}; }
  function sameReading(a, b){ return a.meta === b.meta && a.note === b.note; }
  function same(a, b){
    var ka = Object.keys(a || {}).sort(), kb = Object.keys(b || {}).sort();
    return ka.join() === kb.join() && ka.every(function (k) { return a[k] === b[k]; });
  }
  // "... — 81 days on the floor for 80.5 of 80" -> {floor: 81, work: 80.5, of: 80}
  function floorOf(note){
    var m = /(\d+) days on the floor for ([\d.]+) of (\d+)/.exec(note || '');
    return m ? {floor: +m[1], work: +m[2], of: +m[3]} : null;
  }
  // The wrap is the meta line's last date.
  function wrapIso(meta){
    var m = /→\s*(\d+)\/(\d+)\/(\d+)\s*$/.exec(meta || '');
    return m ? ('20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2)) : '';
  }
  function weekdayBefore(iso){
    var d = new Date(iso + 'T00:00:00Z');
    do { d = new Date(d.getTime() - 86400000); } while(d.getUTCDay() === 0 || d.getUTCDay() === 6);
    return d.toISOString().slice(0, 10);
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () {
      got = T.latestBackup();    // the page's own slot (per-page since v1.3.1, audit SAVE-7)
      return !!(got && got.state && got.at > lastAt);
    }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    // ⚠️ COPIED, or it goes on changing under you. captureSnapshot() hands out the LIVE stores
    // (dayOverrides included), real IndexedDB structured-clones them on put, and T.memoryIDB() does
    // not -- so an uncopied snapshot kept here silently tracks every later edit. Found on this leg:
    // s0 grew the 8/1 mark after the fact and a correct key count read as a failure.
    return JSON.parse(JSON.stringify(got.state));
  }
  async function settle(){ await T.sleep(600); }
  function closePops(){ document.body.click(); }
  async function undo(n){ for(var i = 0; i < (n || 1); i++){ document.getElementById('undo-btn').click(); await T.sleep(900); } }

  // ---- the month view, driven the way a pointer drives it ----
  async function toMonth(label){                       // e.g. 'August 2026'
    if(!document.querySelector('#table-wrap .mv-daygrid')){ document.getElementById('view-month-btn').click(); await T.sleep(600); }
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = ((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '').trim();
      if(my === label) return;
      var btn = document.getElementById(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(250);
    }
    throw new Error('never reached ' + label);
  }
  function dayCell(n){                                 // the IN-MONTH cell showing day n
    var cells = document.querySelectorAll('#table-wrap .mv-daycell:not(.mv-out)');
    for(var i = 0; i < cells.length; i++){
      var num = cells[i].querySelector('.mv-daynum');
      if(num && parseInt(num.textContent, 10) === n) return cells[i];
    }
    return null;
  }
  // ⛔ HIT-TESTED. The element on top at the day-number band must belong to the cell, and THAT
  // element is what gets the click -- exactly what a user's pointer would hit.
  async function hitDay(n){
    var cell = dayCell(n);
    if(!cell) throw new Error('no cell for day ' + n);
    cell.scrollIntoView({block: 'center'}); await T.sleep(120);
    var r = cell.getBoundingClientRect();
    var top = document.elementFromPoint(Math.round(r.left + 12), Math.round(r.top + 9));
    if(!top || !top.closest || top.closest('.mv-daycell') !== cell) throw new Error('day ' + n + ' is not reachable at its number band');
    return top;
  }
  async function openDay(n){
    closePops(); await T.sleep(150);
    (await hitDay(n)).click(); await T.sleep(250);
    var pop = document.querySelector('.day-ov-pop');
    if(!pop) throw new Error('no day popover opened for day ' + n);
    return pop;
  }
  function options(pop){
    return Array.prototype.map.call(pop.querySelectorAll('.day-ov-opt'), function (b) {
      return {v: b.getAttribute('data-ov'), label: ((b.childNodes[0] || {}).textContent || '').trim(),
              current: b.classList.contains('is-current'), disabled: !!b.disabled,
              warn: ((b.querySelector('.day-ov-warn') || {}).textContent || '')};
    });
  }
  // The option row itself must be what a pointer reaches, and the element on top is what is clicked.
  async function choose(pop, v){
    var b = pop.querySelector('.day-ov-opt[data-ov="' + v + '"]');
    if(!b) throw new Error('no option "' + v + '" in the popover');
    var r = b.getBoundingClientRect();
    var top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if(!top || !top.closest || top.closest('.day-ov-opt') !== b) throw new Error('option "' + v + '" is covered');
    top.click();
    await settle();
  }
  async function dblDay(n){
    closePops(); await T.sleep(150);
    var top = await hitDay(n);
    top.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true}));
    await settle();
  }
  // The month-view marks on day n's cell (M cases).
  function marks(n){
    var c = dayCell(n);
    return c ? Array.prototype.filter.call(c.classList, function (k) { return /^mv-day-/.test(k); }).sort() : null;
  }
  // Which COLUMNS of day n's week row Production's pills darken as half, read back out of each pill's
  // own inline style -- so a slice painted on the wrong day fails here, not just a missing slice.
  // With background-size W% the browser maps a position P% onto the free space, so the slice's
  // offset is P x (100 - W) / 100 of the pill (halfSlices' own comment has the derivation).
  function halfColumns(n){
    var cell = dayCell(n);
    if(!cell) return null;
    var week = cell.closest('.mv-week'), cols = [];
    Array.prototype.forEach.call(week.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
      var st = p.getAttribute('style') || '';
      var gc = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(st);
      var sz = /background-size:([^;]+)/.exec(st), ps = /background-position:([^;]+)/.exec(st);
      if(!gc || !sz || !ps) return;
      var start = +gc[1] - 1, span = +gc[2] - +gc[1];
      var sizes = sz[1].split(','), poss = ps[1].split(',');
      sizes.forEach(function (s, i) {
        var W = parseFloat(s), P = parseFloat(poss[i]);
        var O = (span === 1) ? 0 : P * (100 - W) / 100;
        cols.push(start + Math.round(O / W));
      });
    });
    return cols.sort();
  }
  function colOf(n){ var c = dayCell(n); return c ? Array.prototype.indexOf.call(c.parentNode.children, c) : -1; }

  var r0, s0, f0, wrap0;
  var LOADED = {'2026-07-03': 'onhalf', '2026-07-06': 'half', '2026-07-07': 'off', '2026-07-11': 'on', '2026-08-01': 'onhalf'};
  function vals(opts){ return opts.map(function (o) { return o.v; }).join('|'); }
  function currentOf(opts){ return opts.filter(function (o) { return o.current; }).map(function (o) { return o.v; }).join(); }
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt('meta-production')); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A crash backup IS captureSnapshot(). The title is not a schedule input, so editing it banks a
    // backup of the restored calendar exactly as loaded.
    var title0 = document.getElementById('show-title').value;
    T.set('show-title', 'Half Worked Test');
    s0 = await snap();
    r0 = reading(); f0 = floorOf(r0.note); wrap0 = wrapIso(r0.meta);
    add('H0', 'restored as saved: the five marks, read back as 3 half · 1 off · 3 added',
      same(s0.dayOverrides, LOADED) && !!f0 && /3 half/.test(r0.note) && /1 off/.test(r0.note) && /3 added/.test(r0.note) && !!wrap0,
      {note: r0.note, wrap: wrap0, dayOverrides: s0.dayOverrides}, LOADED);

    // ---- H1-H2: a saved half-worked Saturday still shows, still counts half, and can be changed ----
    await toMonth('August 2026');
    var pop = await openDay(1);
    var o1 = options(pop);
    add('H1', 'Sat 8/1, saved as Work half day, offers Weekend — not shot · Work this day · Work half day (current), in that order',
      vals(o1) === '|on|onhalf' && currentOf(o1) === 'onhalf' && o1[2].label === 'Work half day'
        && !o1.some(function (o) { return o.disabled || o.warn; }),
      o1, "['', 'on', 'onhalf' current], no warn on a weekend");
    var m1 = marks(1), h1 = halfColumns(1);
    add('M1', 'month view still marks 8/1 as worked AND half (mv-day-on + mv-day-half: the tint and the ½)',
      JSON.stringify(m1) === JSON.stringify(['mv-day-half', 'mv-day-on']), m1, ['mv-day-half', 'mv-day-on']);
    add('M1p', 'Production\'s pill still darkens exactly the 8/1 slice (column ' + colOf(1) + ') as half',
      JSON.stringify(h1) === JSON.stringify([colOf(1)]), h1, [colOf(1)]);
    await choose(pop, 'on');
    var s2 = await snap(), r2 = reading(), f2 = floorOf(r2.note), wrap2 = wrapIso(r2.meta);
    // As loaded the shoot over-delivers by one half (80.5 of 80 on 82 days: the last FULL day crossed 80
    // from 79.5, MONTH-VIEW-PLAN §4.4). Make any earlier half day full and the count reaches EXACTLY 80
    // one shoot day sooner -- which can only happen if that day was counting 0.5.
    add('H2', 'Work this day on that Saturday: saved as "on", and the shoot reaches exactly 80 of 80 one shoot day sooner -- so the half was honoured',
      s2.dayOverrides['2026-08-01'] === 'on' && !!f2 && f0.work === 80.5 && f2.work === 80 && f2.floor === f0.floor - 1
        && wrap2 === weekdayBefore(wrap0) && /2 half/.test(r2.note) && /3 added/.test(r2.note),
      {note: r2.note, wrap: wrap2, v: s2.dayOverrides['2026-08-01']}, {work: 80, floor: f0.floor - 1, wrap: weekdayBefore(wrap0)});
    pop = await openDay(1);
    var o2 = options(pop);
    add('H2c', '⭐ WITHDRAWN (owner, 15 Oct 2026): once changed, 8/1 offers Weekend — not shot · Work this day (current) and NO Work half day',
      vals(o2) === '|on' && currentOf(o2) === 'on', o2, "['', 'on' current]");
    closePops(); await T.sleep(150);
    m1 = marks(1);
    add('M2', 'worked full, 8/1 is marked worked only -- no ½', JSON.stringify(m1) === JSON.stringify(['mv-day-on']), m1, ['mv-day-on']);
    await undo(1);
    var s2u = await snap();
    add('H2u', 'one undo puts the half-worked Saturday back exactly as loaded',
      s2u.dayOverrides['2026-08-01'] === 'onhalf' && sameReading(reading(), r0), {v: s2u.dayOverrides['2026-08-01'], r: reading()}, r0);

    // ---- H3: double-click clears it ----
    await dblDay(1);
    var s3 = await snap(), r3 = reading();
    add('H3', 'double-clicking the half-worked Saturday clears it back to automatic',
      !('2026-08-01' in (s3.dayOverrides || {})) && /2 half/.test(r3.note) && /2 added/.test(r3.note), {dayOverrides: s3.dayOverrides, r: r3}, 'no 8/1');
    await undo(1);
    add('H3u', 'one undo restores it', sameReading(reading(), r0), reading(), r0);

    // ---- H4: a saved half-worked HOLIDAY ----
    await toMonth('July 2026');
    pop = await openDay(3);
    var o4 = options(pop);
    add('H4', 'Fri 7/3 (a holiday saved as Work half day) offers Holiday — not shot · Work this day · Work half day (current), BOTH captioned "Overrides …"',
      vals(o4) === '|on|onhalf' && currentOf(o4) === 'onhalf' && /^Overrides /.test(o4[1].warn) && o4[2].warn === o4[1].warn,
      o4, 'both work rows warn');
    closePops(); await T.sleep(150);
    var m4 = marks(3), h4 = halfColumns(3);
    add('M4', 'month view marks 7/3 worked AND half, and its pill slice (column ' + colOf(3) + ') as half',
      JSON.stringify(m4) === JSON.stringify(['mv-day-half', 'mv-day-on']) && h4.indexOf(colOf(3)) !== -1,
      {marks: m4, half: h4}, {marks: ['mv-day-half', 'mv-day-on'], includes: colOf(3)});

    // ---- H5: a saved 'half' on an ordinary shoot day ----
    pop = await openDay(6);
    var o5 = options(pop);
    add('H5', 'Mon 7/6, saved as Half day, offers Full day · Half day (current) · Off',
      vals(o5) === '|half|off' && currentOf(o5) === 'half', o5, "['', 'half' current, 'off']");
    await choose(pop, '');
    var s5 = await snap(), r5 = reading(), f5 = floorOf(r5.note);
    add('H5w', 'Full day clears it, and the shoot reaches exactly 80 of 80 one shoot day sooner (it was honoured as half; see H2)',
      !('2026-07-06' in s5.dayOverrides) && !!f5 && f5.work === 80 && f5.floor === f0.floor - 1
        && wrapIso(r5.meta) === weekdayBefore(wrap0) && /2 half/.test(r5.note),
      {note: r5.note, wrap: wrapIso(r5.meta), dayOverrides: s5.dayOverrides}, {work: 80, floor: f0.floor - 1, wrap: weekdayBefore(wrap0)});
    pop = await openDay(6);
    var o5b = options(pop);
    add('H5c', '⭐ WITHDRAWN: cleared, Mon 7/6 offers Full day (current) · Off, and NO Half day',
      vals(o5b) === '|off' && currentOf(o5b) === '', o5b, "['' current, 'off']");
    closePops(); await T.sleep(150);
    await undo(1);
    add('H5u', 'one undo puts the half day back', sameReading(reading(), r0), reading(), r0);

    // ---- H6/H7: where nothing half is offered ----
    pop = await openDay(18);
    var o6 = options(pop);
    add('H6', 'Sat 7/18 inside the Summer Break: only the greyed Work this day (a hiatus always wins)',
      o6.length === 1 && o6[0].v === 'on' && o6[0].disabled, o6, "[{v:'on', disabled:true}]");
    pop = await openDay(28);
    var o7 = options(pop);
    add('H7', '⭐ WITHDRAWN: Tue 7/28, an ordinary shoot day, offers Full day · Off -- no Half day',
      vals(o7) === '|off' && currentOf(o7) === '', o7, "['' current, 'off']");
    pop = await openDay(25);
    var o7w = options(pop);
    add('H7w', '⭐ WITHDRAWN: Sat 7/25, an unmarked weekend, offers Weekend — not shot · Work this day -- no Work half day',
      vals(o7w) === '|on' && currentOf(o7w) === '', o7w, "['' current, 'on']");
    closePops(); await T.sleep(150);

    // ---- H8: a saved half-worked day travels with a move EXACTLY as a worked day does (R2) ----
    // Differential, so no move rule is restated here: the same Shift All +1 wk on the calendar with both
    // half-worked days turned into 'on', then on the calendar as loaded. The two results must have the
    // same dates, and differ only in those two marks' words.
    pop = await openDay(3); await choose(pop, 'on');
    await toMonth('August 2026');
    pop = await openDay(1); await choose(pop, 'on');
    await snap();          // bank the two choices before the shift, as the earlier version of H8 did
    closePops(); await T.sleep(150);
    async function shiftLater(){
      document.getElementById('pop-shift-btn').click(); await T.sleep(250);
      T.set('tool-shift-weeks', '1');
      document.getElementById('tool-shift-later').click();
      await settle();
      closePops(); await T.sleep(150);
    }
    await shiftLater();
    var sOn = await snap();
    await undo(3);
    var back = await snap();
    add('H8a', 'three undos (the shift, then both choices) restore the calendar as loaded',
      same(back.dayOverrides, LOADED) && sameReading(reading(), r0), {dayOverrides: back.dayOverrides, r: reading()}, LOADED);
    await shiftLater();
    var sHalf = await snap(), r8 = reading();
    var onKeys = Object.keys(sOn.dayOverrides || {}).sort(), halfKeys = Object.keys(sHalf.dayOverrides || {}).sort();
    var differ = halfKeys.filter(function (k) { return sHalf.dayOverrides[k] !== sOn.dayOverrides[k]; });
    add('H8', 'Shift All +1 wk moves the half-worked days to the SAME dates as worked days, still "onhalf"',
      onKeys.join() === halfKeys.join() && differ.length >= 1
        && differ.every(function (k) { return sHalf.dayOverrides[k] === 'onhalf' && sOn.dayOverrides[k] === 'on'; }),
      {onhalf: sHalf.dayOverrides, on: sOn.dayOverrides}, 'same keys; differ only onhalf vs on');
    await undo(1);
    add('H8u', 'one undo restores the calendar as loaded', sameReading(reading(), r0), reading(), r0);
    T.set('show-title', title0);

    var clipped = T.clippedCells();
    add('H9', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: (clipped.h || []).slice(0, 5)}, '[]');
    add('H10', '0 console errors', !(window.__ERR || []).length, (window.__ERR || []).slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  out.cases = cases;
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
