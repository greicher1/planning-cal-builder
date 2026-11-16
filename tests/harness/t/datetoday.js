// datetoday -- the pop-out date picker's "today" is the user's LOCAL calendar day (the second audit's AUD2-007,
// 13 Nov 2026). Before the fix DatePop.jsx took today as the UTC date of the instant, so from 16:00 Pacific (19:00
// Eastern) the ring sat on TOMORROW, a click on it entered tomorrow's date, and on a month's last afternoon an empty
// field opened on NEXT month; Tokyo and Auckland mornings saw yesterday.
//
//   TZ=America/Los_Angeles HARNESS_PAGE=/dist/index.html HARNESS_QUERY="tz=America/Los_Angeles&clock=2026-11-30T17:30" \
//     ./run.sh datetoday 150
//
// ⚠️ TWO halves make one run, and both must be given. The TIME ZONE comes from the environment (TZ=…, which Chrome
// inherits; a page cannot set its own), and `tz=` in the query names the one the run expects, so a run that forgot TZ
// fails Z0 instead of silently testing this Mac's zone. The CLOCK is faked here, before the app loads: `clock=` is a
// LOCAL wall time in that zone, and Date / Date.now() read it from then on (the audit's repro, audit-vtz-journey).
// What "today" must be is read off the query itself (the clock's date part), never worked out by the code under test.
//
// gate.sh runs four: la (Los Angeles 17:30 on Mon 30 Nov 2026, a month's last afternoon), tokyo (Tokyo 08:00 on
// Tue 1 Dec 2026), ny (New York 20:30 on Thu 31 Dec 2026, the year's last evening) and the control noon (Los Angeles
// 12:00 on 30 Nov, where the UTC date and the local date agree). On the build before the fix T1-T3 were red in la,
// tokyo and ny, and the control was green.
(function(){
  var m = /[?&]clock=(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(location.search); if(!m) return;
  var RD = Date; var target = new RD(+m[1], +m[2]-1, +m[3], +m[4], +m[5]).getTime(); var off = target - RD.now();
  function FD(){
    var a = Array.prototype.slice.call(arguments);
    if(!(this instanceof FD)) return new RD(RD.now()+off).toString();
    if(a.length === 0) return new RD(RD.now()+off);
    return new (Function.prototype.bind.apply(RD, [null].concat(a)))();
  }
  FD.prototype = RD.prototype; FD.now = function(){ return RD.now()+off; }; FD.UTC = RD.UTC; FD.parse = RD.parse;
  window.Date = FD;
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  var MS = 86400000, MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var q = new URLSearchParams(location.search);
  var clock = q.get('clock') || '', wantTz = q.get('tz') || '';
  var cm = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(clock);
  // What the user's wall calendar says, from the query alone.
  var localIso = cm ? cm[1] + '-' + cm[2] + '-' + cm[3] : null;
  var localTitle = cm ? MONTHS[+cm[2] - 1] + ' ' + cm[1] : null;
  var now0 = new Date();
  var out = {cases: cases, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, now: now0.toString(),
             utcIso: now0.toISOString().slice(0, 10), localIso: localIso};
  function iso(t){ return new Date(t).toISOString().slice(0, 10); }
  function mondayOf(t){ return t - ((new Date(t).getUTCDay() + 6) % 7) * MS; }
  function $(id){ return document.getElementById(id); }
  // The open picker as data: its title, each of its 42 days by ISO date, and which carry the "today" ring.
  function read(){
    var p = document.querySelector('.date-pop'); if(!p) return null;
    var title = p.querySelector('.dp-title').textContent.trim();
    var mm = /^(\w+) (\d{4})$/.exec(title);
    var start = mondayOf(Date.UTC(+mm[2], MONTHS.indexOf(mm[1]), 1));
    var days = Array.from(p.querySelectorAll('.dp-day')).map(function (b, i) { return {b: b, iso: iso(start + i * MS)}; });
    var rings = days.filter(function (d) { return d.b.classList.contains('dp-today'); });
    return {title: title, rings: rings.map(function (d) { return d.iso; }),
            ringText: rings.map(function (d) { return d.b.textContent.trim(); }), days: days};
  }
  async function open(el){
    if(typeof el === 'string') el = $(el);
    el.focus(); el.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.sleep(200);
    return read();
  }
  async function shut(el){
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    if(el) el.blur();
    await T.sleep(150);
  }
  function plain(r){ return r ? {title: r.title, rings: r.rings, ringText: r.ringText} : null; }
  function opensOnToday(r){ return !!r && r.title === localTitle && r.rings.length === 1 && r.rings[0] === localIso; }
  try {
    // Z0: the run is what it says it is. Without TZ the zone is this Mac's, and every case below would pass or fail
    // for the wrong reason.
    var two = function (n) { return String(n).padStart(2, '0'); };
    var fakeLocal = now0.getFullYear() + '-' + two(now0.getMonth() + 1) + '-' + two(now0.getDate()) + 'T' + two(now0.getHours()) + ':' + two(now0.getMinutes());
    add('Z0', 'the page runs in the asked time zone at the asked local clock', !!cm && out.tz === wantTz && fakeLocal === clock,
      {tz: out.tz, local: fakeLocal, utc: now0.toISOString()}, {tz: wantTz, local: clock});

    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    await T.sleep(800);

    // T1: a NEW all-phase hiatus (an empty, Monday-only field) opens on this month with today ringed.
    $('add-hiatus').click(); await T.sleep(200);
    var rows = document.querySelectorAll('#hiatus-list .hiatus-entry');
    var hs = rows[rows.length - 1].querySelector('.hiatus-start');
    var r1 = await open(hs);
    out.t1 = plain(r1);
    add('T1', "an empty hiatus start opens on the user's month with the user's today ringed", opensOnToday(r1) && hs.value === '',
      {picker: plain(r1), value: hs.value}, {title: localTitle, rings: [localIso], value: ''});
    await shut(hs);

    // T2: the custom holiday's date (an empty field that picks any day): the same.
    var ch = $('custom-hol-date');
    T.set('custom-hol-date', ''); await T.sleep(100);
    var r2 = await open(ch);
    out.t2 = plain(r2);
    add('T2', "an empty single-day field opens on the user's month with the user's today ringed", opensOnToday(r2),
      plain(r2), {title: localTitle, rings: [localIso]});

    // T3: a click on the ring writes the user's today, not tomorrow or yesterday.
    var ring = r2 && r2.days.filter(function (d) { return d.b.classList.contains('dp-today'); })[0];
    if(ring){ ring.b.click(); await T.sleep(200); }
    add('T3', "a click on the ringed day writes the user's today into the field", ch.value === localIso,
      {value: ch.value, ring: ring ? ring.iso : null}, localIso);
    await shut(ch);
    T.set('custom-hol-date', ''); await T.sleep(100);

    // T4 (control, unchanged by the fix): a field that holds a date opens on that date's month, and still rings today
    // only when today's day is in the grid shown.
    var sp = $('start-post'), spv = sp.value;
    var r4 = await open(sp);
    var spm = /^(\d{4})-(\d{2})/.exec(spv || '');
    var wantT4 = spm ? MONTHS[+spm[2] - 1] + ' ' + spm[1] : null;
    var gridHasToday = !!r4 && r4.days.some(function (d) { return d.iso === localIso; });
    add('T4', "a field holding a date opens on that date's month; the ring, if any, is on the user's today",
      !!r4 && !!wantT4 && r4.title === wantT4 && sp.value === spv &&
        (gridHasToday ? (r4.rings.length === 1 && r4.rings[0] === localIso) : r4.rings.length === 0),
      {picker: plain(r4), value: sp.value}, {title: wantT4, value: spv, rings: gridHasToday ? [localIso] : []});
    await shut(sp);

    add('E0', 'no console errors', T.appHealth().errors.length === 0, T.appHealth().errors.slice(0, 5), 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception'); }
  T.done(out);
})(); });
