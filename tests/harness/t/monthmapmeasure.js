// monthmapmeasure -- MONTH-RAIL-PLAN.md step 1: how many rows the phase map needs on a real calendar, measured
// before any of the map's UI is built (the owner's guardrail, 27 Oct 2026: "measured on real calendars first").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture> ./run.sh monthmapmeasure 120   one calendar
//   ./monthmapmeasure.sh                                                                  every fixture, as a table
//
// HOW IT SEES THE MODEL (owner ruling, 1 Oct 2026: "Slice it, no hook"). monthMapModel() takes plain data and reads
// nothing from the engine, so it is sliced out of src/legacy/app.js VERBATIM and run here. What it is fed is what
// the month view DRAWS (ruling R2): the leg pages through every month with the frozen arrows, reads each month's
// markup with the month-PDF writer's own parser (mvlParseMonth, sliced as the monthlayout leg slices it), and takes
// each phase's first and last day across all of them. Sim Post is the pill with no data-ph. Hiatus bands take no
// row (R2), so they are counted, not packed.
// ⚠️ The spans go in DATE order, which is the month view's order on a calendar nobody has reordered (mvLaneOrder,
// R7). A reordered month view is packed in its own order by plan step 2's glue, and may need a row more.
//
// CASES
//   S0  the model and the parser are sliced verbatim out of src/legacy/app.js and evaluate
//   W0  the walk: the frozen arrows page from the first month to the last, and every page parses
//   M0  the model's months are exactly the pages the arrows walked, in order, the dimmed ones the two ends
//   C0  CONTROL: the rows the model packs equal the most phases running on any one day, counted here by a sweep
//   B0  every phase on the map has one bar, inside the map, on a row within the cap
//   E0  no console errors
// Recorded in `info`: the months, every phase's span and row, and the rows needed, named and thin.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var NAMES = {writersRoom: "Writer's Rm", prePrep: 'Pre Prep', prodPrep: 'Prod Prep', production: 'Production', post: 'Post',
               localization: 'Localization', simPost: 'Sim Post', episodePrep: 'Prep'};
  info.fixture = (/[?&]state=([^&]+)/.exec(location.search) || [])[1] || '(none)';
  try {
    await T.appReady();
    // ---- S0: the slice ----------------------------------------------------------------------------------------
    var src = await (await fetch('/src/legacy/app.js', {cache: 'no-store'})).text();
    function slice(startMark, endMark, what){
      var from = src.indexOf(startMark), to = from < 0 ? -1 : src.indexOf(endMark, from);
      if(from < 0 || to < 0) throw new Error('could not locate ' + what + ' in src/legacy/app.js: re-anchor this leg');
      if(src.indexOf(startMark, from + 1) >= 0) throw new Error(what + "'s anchor is not unique: re-anchor this leg");
      return src.slice(from, to + endMark.length);
    }
    // The parser, sliced exactly as monthlayout slices it (that leg owns these anchors).
    var dayMsSrc = slice('const DAY_MS = ', ';', 'DAY_MS');
    var isoSrc = slice('function isoOf(d){', '}', 'isoOf');
    var ttfSrc = slice('function ttfRead(bytes){', 'return w * sizePt / t.unitsPerEm;\n  }', 'ttfRead..ttfTextWidth');
    var hiSrc = slice('const PDF_WINANSI_HI = {', '};', 'PDF_WINANSI_HI');
    var mvlSrc = slice('  const MVL_GEOMETRY = (function(){',
      'return { geometry: MVL_GEOMETRY, months: htmls.map(function(h){ return mvlMonthLayout(h, widthOf, pillWidthOf); }) };\n  }',
      'the layout model (MVL_GEOMETRY..buildMonthLayout)');
    var mapSrc = slice('  const MONTH_MAP_NAMED_ROWS = ',
      'thin: Math.max(0, Math.min(needed - MONTH_MAP_NAMED_ROWS, MONTH_MAP_THIN_ROWS)) } };\n  }', 'monthMapModel');
    var F = new Function("'use strict';\n" + dayMsSrc + '\n' + isoSrc + '\n' + ttfSrc + '\n' + hiSrc + '\n' + mvlSrc + '\n' + mapSrc +
      '\nreturn {mvlParseMonth: mvlParseMonth, monthMapModel: monthMapModel, NAMED: MONTH_MAP_NAMED_ROWS, THIN: MONTH_MAP_THIN_ROWS};')();
    add('S0', 'monthMapModel and the month parser are sliced verbatim out of src/legacy/app.js and evaluate',
        typeof F.monthMapModel === 'function' && typeof F.mvlParseMonth === 'function', {modelChars: mapSrc.length}, 'the slice evaluates');

    // ---- W0: walk every month with the frozen arrows -----------------------------------------------------------
    var drew = false;
    try {
      await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); },
                    'the restored calendar', 150, 100);
      drew = true;
    } catch (e) { /* a calendar with no dates draws nothing: recorded, not judged */ }
    if(!drew){ info.status = 'no calendar drawn'; T.done(out); return; }
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, 'the calendar to settle', 200, 100);
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    var prev = function () { return document.getElementById('mv-prev'); }, next = function () { return document.getElementById('mv-next'); };
    for(var g = 0; g < 300 && prev() && !prev().disabled; g++) prev().click();
    var pages = [], guard = 0;
    while(guard++ < 300){
      pages.push(F.mvlParseMonth(document.querySelector('#table-wrap .month-view').outerHTML));
      if(!next() || next().disabled) break;
      next().click();
    }
    var keyOf = function (p) { return p.year + '-' + String(p.month + 1).padStart(2, '0'); };
    var walked = pages.map(keyOf);
    add('W0', 'the frozen arrows page from the first month to the last, and every page parses',
        pages.length > 0 && !!prev() && !!next() && next().disabled, {pages: walked.length}, 'at least one page, ending with › disabled');

    // ---- What the month view draws: each phase's first and last day ------------------------------------------
    var spans = {}, hiatusBars = 0;
    pages.forEach(function (p) {
      p.weeks.forEach(function (w) {
        w.items.forEach(function (it) {
          if(it.kind === 'hiatus'){ hiatusBars++; return; }
          if(it.kind !== 'pill' && it.kind !== 'simpost') return;
          var key = it.kind === 'simpost' ? 'simPost' : it.ph;
          var a = w.days[it.from].iso, b = w.days[it.to].iso;
          var s = spans[key] || (spans[key] = {key: key, first: a, lastDay: b, fill: it.fill, ink: it.ink});
          if(a < s.first) s.first = a;
          if(b > s.lastDay) s.lastDay = b;
        });
      });
    });
    var dayAfter = function (iso) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
    var nameOf = function (key) {
      var el = document.getElementById('name-' + key);
      return (el && el.value && el.value.trim()) || NAMES[key] || key;
    };
    var list = Object.keys(spans).map(function (k) {
      var s = spans[k];
      return {key: k, name: nameOf(k), fill: s.fill, ink: s.ink, start: s.first, end: dayAfter(s.lastDay)};
    }).sort(function (x, y) { return x.start < y.start ? -1 : x.start > y.start ? 1 : (x.key < y.key ? -1 : 1); });

    var step = function (k, n) { var y = +k.slice(0, 4), m = +k.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
                                 return y + '-' + String(m + 1).padStart(2, '0'); };
    var first = walked[0], lastM = walked[walked.length - 1];
    // The screen's range is always the core months and one each side (monthRangeForSchedule).
    var model = F.monthMapModel({first: first, last: lastM, coreFirst: step(first, 1), coreLast: step(lastM, -1),
                                 cursor: first, today: '2026-10-27', spans: list, hiatus: []});

    // ---- M0: the model's months are the walked pages ---------------------------------------------------------
    var mk = model ? model.months.map(function (m) { return m.key; }) : [];
    var edges = model ? model.months.filter(function (m) { return m.edge; }).map(function (m) { return m.key; }) : [];
    add('M0', "the model's months are exactly the pages the arrows walked, the dimmed ones the two ends",
        JSON.stringify(mk) === JSON.stringify(walked) && JSON.stringify(edges) === JSON.stringify(walked.length > 1 ? [first, lastM] : [first]),
        {months: mk.length, edges: edges}, {months: walked.length, edges: [first, lastM]});

    // ---- C0: the packing equals the most phases on any one day ----------------------------------------------
    var ev = [];
    list.forEach(function (s) { ev.push([s.start, 1]); ev.push([s.end, -1]); });
    ev.sort(function (x, y) { return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]; });   // an end before a start on the same day
    var live = 0, most = 0, busiest = '';
    ev.forEach(function (e) { live += e[1]; if(live > most){ most = live; busiest = e[0]; } });
    add('C0', 'CONTROL: the rows the model packs equal the most phases running on any one day (a sweep, counted here)',
        model && model.rows.needed === most, {needed: model && model.rows.needed}, {mostAtOnce: most, on: busiest});

    // ---- B0: one bar per phase, inside the map, within the cap ----------------------------------------------
    var cap = F.NAMED + F.THIN;
    var bandsOk = model && model.bands.length === list.length && model.bands.every(function (b) {
      return b.from >= 0 && b.to <= model.months.length && b.to > b.from && b.row < cap && b.thin === (b.row >= F.NAMED);
    });
    add('B0', 'every phase on the map has one bar, inside the map, on a row within the cap',
        bandsOk, {bands: model && model.bands.length}, {phases: list.length, rowsBelow: cap});

    info.status = 'measured';
    info.months = mk.length;
    info.phases = list.length;
    info.hiatusBars = hiatusBars;
    info.rows = model && model.rows;
    info.busiest = busiest;
    info.bands = model && model.bands.map(function (b) { return {key: b.key, name: b.name, start: b.start, end: b.end, row: b.row, thin: b.thin}; });
    // The load-time sanitizer's one warning is EXPECTED on the hostile fixtures (xss-*, loadfail-null-*,
    // mvorder-hostile): it says what it dropped. It is recorded, and nothing else may appear.
    var SANITIZED = /SPTCal: \d+ value\(s\) in this calendar were not in a form the app writes/;
    info.sanitized = (window.__ERR || []).filter(function (m) { return SANITIZED.test(m); }).length;
    out.errors = (window.__ERR || []).filter(function (m) { return !SANITIZED.test(m); }).slice(0, 10);
    add('E0', "no console errors (the sanitizer's own warning on a hostile fixture aside)", out.errors.length === 0, out.errors, []);
  } catch (e) {
    out.EX = String(e && e.message || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);
})(); });
