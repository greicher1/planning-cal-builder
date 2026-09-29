// halfworked -- a weekend or holiday worked as a HALF day: the 'onhalf' day override
// (owner request, 29 Sep 2026: "flag days as both half and on so you could do a half day on a
// weekend or holiday").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides ./run.sh halfworked 150
//
// tests/fixtures/dayoverrides.sptcal: Production from Mon 6/29/26, 80 days, US General, with
//   7/3  'on'   -- the observed Independence Day, worked
//   7/6  'half' -- shoot day 5
//   7/7  'off'  -- shoot day 6
//   7/11 'on'   -- a worked Saturday
// and a LOCKED one-week "Summer Break" hiatus from 7/13. As saved it delivers 80.5 of 80 (the one
// half day over-delivers, MONTH-VIEW-PLAN §4.4), which is what makes a half-weight day measurable:
//
//   + Sat 8/1 worked FULL ('on')      -> wraps one shoot day earlier, 80.5 of 80
//   + Sat 8/1 worked HALF ('onhalf')  -> wraps one shoot day earlier too, at EXACTLY 80 of 80
// (the loop stops on the first day the count reaches 80: 79.5 + 1 and 79.5 + 0.5 both get there a
// day sooner). So the two differ by precisely the half day, on the same wrap. That 0.5 is the feature.
//
// Every day is opened through the real gesture: the cell is HIT-TESTED at its day-number band (the
// only part of a day cell a pointer can reach -- HANDOFF, 18 Sep 2026) and the element actually on
// top there is clicked. A dispatched event at the node would prove the handler and nothing else.
//
// Cases M* need the month view to MARK the day -- a frozen edit to renderMonthView, made in its own
// commit so it can be reviewed alone. They fail on the build without it, by design.
//
// At the end the calendar carries a half-worked Saturday (8/1) and a half-worked holiday (7/3) beside
// the fixture's half, off and worked Saturday, and its snapshot is returned as `fixture`. That is how
// tests/fixtures/dayoverrides-onhalf.sptcal was cut: from the running app, not written by hand.
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

  var r0, s0, f0, wrap0, title0;
  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt('meta-production')); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A crash backup IS captureSnapshot(). The title is not a schedule input, so editing it banks a
    // backup of the restored calendar exactly as loaded.
    title0 = document.getElementById('show-title').value;
    T.set('show-title', 'Half Worked Test');
    s0 = await snap();
    r0 = reading(); f0 = floorOf(r0.note); wrap0 = wrapIso(r0.meta);
    add('H0', 'restored as saved: 1 half, 1 off, 2 added, 80.5 of 80 (the precondition the half-weight maths needs)',
      !!f0 && f0.work === 80.5 && f0.of === 80 && /1 half/.test(r0.note) && /2 added/.test(r0.note) && !!wrap0
        && !Object.keys(s0.dayOverrides || {}).some(function (k) { return s0.dayOverrides[k] === 'onhalf'; }),
      {note: r0.note, wrap: wrap0, dayOverrides: s0.dayOverrides}, '80.5 of 80, no onhalf');

    // ---- H1-H2: a weekend offers it, and it counts half ----
    await toMonth('August 2026');
    var pop = await openDay(1);
    var o1 = options(pop);
    add('H1', 'Sat 8/1 offers Weekend — not shot (current) · Work this day · Work half day, in that order',
      o1.map(function (o) { return o.v; }).join('|') === '|on|onhalf' && o1[0].current && !o1[1].current && !o1[2].current
        && o1[2].label === 'Work half day' && !o1.some(function (o) { return o.disabled || o.warn; }),
      o1, "['' current, 'on', 'onhalf'], no warn on a weekend");
    await choose(pop, 'onhalf');
    var s2 = await snap(), r2 = reading(), f2 = floorOf(r2.note), wrap2 = wrapIso(r2.meta);
    add('H2', 'Work half day on Sat 8/1 is saved as the word "onhalf" (the crash backup IS the .sptcal)',
      s2.dayOverrides && s2.dayOverrides['2026-08-01'] === 'onhalf'
        && Object.keys(s2.dayOverrides).length === Object.keys(s0.dayOverrides).length + 1,
      {dayOverrides: s2.dayOverrides}, "'2026-08-01': 'onhalf'");
    add('H2w', 'it counts HALF: 80 of 80 exactly, the same days on the floor, wrap one shoot day earlier',
      !!f2 && f2.work === 80 && f2.floor === f0.floor && wrap2 === weekdayBefore(wrap0),
      {note: r2.note, wrap: wrap2}, {work: 80, floor: f0.floor, wrap: weekdayBefore(wrap0)});
    add('H2n', 'the sidebar counts it as BOTH a half and an added day: 2 half · 1 off · 3 added',
      /2 half/.test(r2.note) && /1 off/.test(r2.note) && /3 added/.test(r2.note), {note: r2.note}, '2 half · 1 off · 3 added');
    var m2 = marks(1), h2 = halfColumns(1);
    add('M1', 'month view marks 8/1 as worked AND half (mv-day-on + mv-day-half: the tint and the ½)',
      JSON.stringify(m2) === JSON.stringify(['mv-day-half', 'mv-day-on']), m2, ['mv-day-half', 'mv-day-on']);
    add('M1p', 'Production\'s pill darkens exactly the 8/1 slice (column ' + colOf(1) + ') as half',
      JSON.stringify(h2) === JSON.stringify([colOf(1)]), h2, [colOf(1)]);

    // ---- H3: the same Saturday worked FULL -- the difference is exactly the half day ----
    pop = await openDay(1);
    var o3 = options(pop);
    add('H3c', 'reopened, the popover shows Work half day as the current choice',
      o3.filter(function (o) { return o.current; }).map(function (o) { return o.v; }).join() === 'onhalf', o3, "current = 'onhalf'");
    await choose(pop, 'on');
    var s3 = await snap(), r3 = reading(), f3 = floorOf(r3.note), wrap3 = wrapIso(r3.meta);
    add('H3', 'Work this day on the same Saturday: 80.5 of 80 on the same wrap -- full minus half = exactly 0.5',
      s3.dayOverrides['2026-08-01'] === 'on' && !!f3 && f3.work === 80.5 && wrap3 === wrap2 && f3.floor === f2.floor
        && /1 half/.test(r3.note) && /3 added/.test(r3.note),
      {note: r3.note, wrap: wrap3, v: s3.dayOverrides['2026-08-01']}, {work: 80.5, wrap: wrap2});
    var m3 = marks(1), h3 = halfColumns(1);
    add('M3', 'worked full, 8/1 is marked worked only -- no ½ and no half slice',
      JSON.stringify(m3) === JSON.stringify(['mv-day-on']) && JSON.stringify(h3) === '[]', {marks: m3, half: h3}, {marks: ['mv-day-on'], half: []});
    await undo(1);
    var s3u = await snap();
    add('H3u', 'one undo puts the half day back (one choice is one undo step)',
      s3u.dayOverrides['2026-08-01'] === 'onhalf' && sameReading(reading(), r2), {v: s3u.dayOverrides['2026-08-01'], r: reading()}, r2);
    await undo(1);
    add('H3uu', 'a second undo returns the calendar exactly as loaded', sameReading(reading(), r0), reading(), r0);

    // ---- H4: double-click clears it ----
    pop = await openDay(1);
    await choose(pop, 'onhalf');
    await snap();
    await dblDay(1);
    var s4 = await snap();
    add('H4', 'double-clicking the half-worked Saturday clears it back to automatic',
      !('2026-08-01' in (s4.dayOverrides || {})) && sameReading(reading(), r0), {dayOverrides: s4.dayOverrides, r: reading()}, r0);

    // ---- H5: a union holiday offers it too, and says what it overrides ----
    await toMonth('July 2026');
    pop = await openDay(3);
    var o5 = options(pop);
    add('H5', 'Fri 7/3 (a worked holiday) offers Holiday — not shot · Work this day (current) · Work half day, BOTH captioned "Overrides …"',
      o5.map(function (o) { return o.v; }).join('|') === '|on|onhalf' && o5[1].current
        && /^Overrides /.test(o5[1].warn) && o5[2].warn === o5[1].warn,
      o5, 'both work rows warn');
    await choose(pop, 'onhalf');
    var s5 = await snap(), r5 = reading(), f5 = floorOf(r5.note), wrap5 = wrapIso(r5.meta);
    add('H5w', 'the holiday worked HALF: 80 of 80 on the same wrap and the same days on the floor (it was worked full)',
      s5.dayOverrides['2026-07-03'] === 'onhalf' && !!f5 && f5.work === 80 && f5.floor === f0.floor && wrap5 === wrap0
        && /2 half/.test(r5.note) && /2 added/.test(r5.note),
      {note: r5.note, wrap: wrap5}, {work: 80, floor: f0.floor, wrap: wrap0});
    var m5 = marks(3), h5 = halfColumns(3);
    add('M5', 'month view marks 7/3 worked AND half, and its pill slice (column ' + colOf(3) + ') as half',
      JSON.stringify(m5) === JSON.stringify(['mv-day-half', 'mv-day-on'])
        && h5.indexOf(colOf(3)) !== -1,
      {marks: m5, half: h5}, {marks: ['mv-day-half', 'mv-day-on'], includes: colOf(3)});
    await undo(1);
    add('H5u', 'one undo puts the holiday back to worked full', sameReading(reading(), r0), reading(), r0);

    // ---- H6: where it is NOT offered ----
    pop = await openDay(18);
    var o6 = options(pop);
    add('H6', 'Sat 7/18 inside the Summer Break: only the greyed Work this day, no Work half day (a hiatus always wins)',
      o6.length === 1 && o6[0].v === 'on' && o6[0].disabled, o6, "[{v:'on', disabled:true}]");
    pop = await openDay(28);
    var o7 = options(pop);
    add('H7', 'Tue 7/28, an ordinary shoot day: Full day · Half day · Off -- Work half day is not offered',
      o7.map(function (o) { return o.v; }).join('|') === '|half|off', o7, "['', 'half', 'off']");
    closePops(); await T.sleep(150);

    // ---- H8: it travels with a move exactly as a worked day does (owner ruling R2) ----
    pop = await openDay(11);
    await choose(pop, 'onhalf');
    await snap();
    closePops(); await T.sleep(150);
    document.getElementById('pop-shift-btn').click(); await T.sleep(250);
    T.set('tool-shift-weeks', '1');
    document.getElementById('tool-shift-later').click();
    await settle();
    var s8 = await snap(), r8 = reading();
    var PLUS_ONE = {'2026-07-10': 'half', '2026-07-20': 'off', '2026-07-25': 'onhalf'};
    add('H8', 'Shift All +1 wk: the half-worked Saturday follows its reference shoot day to Sat 7/25 (as "on" does), still onhalf',
      same(s8.dayOverrides, PLUS_ONE), {dayOverrides: s8.dayOverrides}, PLUS_ONE);
    add('H8n', 'and it is still honoured there: 2 half · 1 off · 1 added',
      /2 half/.test(r8.note) && /1 off/.test(r8.note) && /1 added/.test(r8.note), {note: r8.note}, '2 half · 1 off · 1 added');
    var msg8 = ((document.querySelector('#pop-shift [data-tools-msg]') || {}).textContent || '').trim();
    add('H8m', 'the result line reports the worked holiday that lost its day off, in words that fit both kinds',
      /worked-day mark no longer falls on a weekend or holiday/.test(msg8), {msg: msg8}, 'A worked-day mark no longer falls …');
    closePops(); await T.sleep(150);
    await toMonth('July 2026');
    var m8 = marks(25), h8 = halfColumns(25);
    add('M8', 'the moved mark renders on 7/25: worked + half, slice on its column',
      JSON.stringify(m8) === JSON.stringify(['mv-day-half', 'mv-day-on']) && h8.indexOf(colOf(25)) !== -1,
      {marks: m8, half: h8}, {marks: ['mv-day-half', 'mv-day-on'], includes: colOf(25)});
    await undo(2);
    add('H8u', 'two undos (the shift, then the choice) restore the calendar as loaded', sameReading(reading(), r0), reading(), r0);

    // ---- the fixture: a half-worked Saturday and a half-worked holiday beside the fixture's marks ----
    T.set('show-title', title0);
    await snap();
    await toMonth('July 2026');
    pop = await openDay(3); await choose(pop, 'onhalf'); await snap();
    await toMonth('August 2026');
    pop = await openDay(1); await choose(pop, 'onhalf');
    closePops(); await T.sleep(150);
    var sf = await snap(), rf = reading();
    var WANT = {'2026-07-03': 'onhalf', '2026-07-06': 'half', '2026-07-07': 'off', '2026-07-11': 'on', '2026-08-01': 'onhalf'};
    add('HF', 'the fixture state: both kinds of half-worked day beside the half, the off and the worked Saturday',
      same(sf.dayOverrides, WANT) && /3 half/.test(rf.note) && /1 off/.test(rf.note) && /3 added/.test(rf.note),
      {dayOverrides: sf.dayOverrides, note: rf.note, meta: rf.meta}, WANT);
    out.fixture = sf;
    out.fixtureReading = rf;

    var clipped = T.clippedCells();
    add('H9', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: (clipped.h || []).slice(0, 5)}, '[]');
    add('H10', '0 console errors', !(window.__ERR || []).length, (window.__ERR || []).slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  out.cases = cases;
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
