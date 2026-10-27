// monthmap -- the phase map above the month view (MONTH-RAIL-PLAN.md). Part A, plan step 2: the engine's half.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh monthmap 120
//
// Step 2 has no UI, so the leg makes its OWN buttons carrying the attributes the map's buttons will carry
// (data-mvgo, data-mvstep) and clicks them: that is the whole input contract, caught by the engine on document.
// What the engine PUSHES (chrome.monthMap) has no consumer until step 3's MonthMap.jsx, which is when part B holds
// it to the month view. Here the push is held to running clean: any exception in monthMapInput / monthMapModel lands
// in __ERR, on every render this leg causes, in both views (E0).
//
// CASES
//   A0  a month inside the range: data-mvgo goes there, as the month bar reads it
//   A1  the same set as the frozen arrows: every month they page through is reachable by data-mvgo, the dimmed
//       ends included, and the month on each side of that range is refused (the view stays put)
//   A2  data-mvstep steps one month each way, and stops at both ends where the frozen › and ‹ are disabled
//   A3  a garbage value goes nowhere
//   A4  paging is session UI: the undo button's state and the save status are what they were
//   A5  in the waterfall the attributes do nothing: the grid is untouched and the view stays the waterfall
//   E0  no console errors over every render above, in both views
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  info.fixture = (/[?&]state=([^&]+)/.exec(location.search) || [])[1] || '(none)';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var shown = function () { var el = document.querySelector('#table-wrap .mv-monthyear'); return el ? el.textContent.trim() : ''; };
  var keyOf = function (label) { var r = /^(\w+) (\d{4})$/.exec(label); return r ? r[2] + '-' + String(MONTHS.indexOf(r[1]) + 1).padStart(2, '0') : ''; };
  var labelOf = function (k) { return MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); };
  var step = function (k, n) { var y = +k.slice(0, 4), m = +k.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
                               return y + '-' + String(m + 1).padStart(2, '0'); };
  // The test's own map buttons: outside #table-wrap, as MonthMap.jsx's will be.
  var host = document.createElement('div');
  host.className = 'monthmap-test-host';
  document.body.appendChild(host);
  function press(attr, value){
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute(attr, value);
    host.replaceChildren(b);
    b.click();
    return shown();
  }
  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); },
                  'the restored calendar', 200, 100);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, 'the calendar to settle', 200, 100);

    // ---- A5 first, in the waterfall ----
    // ⚠️ Switched to explicitly: a calendar may open in the month view (mvnotes and episodeprep do, saved that way).
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table tbody tr') && !document.querySelector('#table-wrap .month-view'); },
                  'the waterfall', 200, 100);
    // CONTROL first: the same click on a button WITHOUT the attributes. A click outside the grid may clear a selected
    // cell, which redraws its classes; that is the app's own behaviour, so it is taken before the snapshot.
    press('data-control', '1');
    await new Promise(function (r) { setTimeout(r, 100); });
    var wfHtml = document.getElementById('table-wrap').innerHTML;
    press('data-mvgo', '2026-10');
    press('data-mvstep', '1');
    var wfAfter = document.getElementById('table-wrap').innerHTML;
    if(wfAfter !== wfHtml){
      var at = 0; while(at < wfHtml.length && wfHtml[at] === wfAfter[at]) at++;
      info.a5diff = {at: at, before: wfHtml.slice(Math.max(0, at - 120), at + 120), after: wfAfter.slice(Math.max(0, at - 120), at + 120)};
    }
    add('A5', 'in the waterfall the attributes do nothing: the grid is untouched and the view stays the waterfall',
        document.getElementById('table-wrap').innerHTML === wfHtml && !document.querySelector('#table-wrap .month-view'),
        {sameGrid: document.getElementById('table-wrap').innerHTML === wfHtml}, {sameGrid: true});

    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    var undoBefore = !!(document.getElementById('undo-btn') || {}).disabled;
    var statusBefore = ((document.querySelector('.save-status') || {}).textContent || '').trim();

    // ---- The frozen arrows' months ----
    var prev = function () { return document.getElementById('mv-prev'); }, next = function () { return document.getElementById('mv-next'); };
    for(var g = 0; g < 300 && !prev().disabled; g++) prev().click();
    var walked = [shown()];
    for(g = 0; g < 300 && !next().disabled; g++){ next().click(); walked.push(shown()); }
    var keys = walked.map(keyOf);
    info.months = keys.length;
    info.range = [keys[0], keys[keys.length - 1]];

    // ---- A0 ----
    var mid = keys[Math.floor(keys.length / 2)];
    var landed = press('data-mvgo', mid);
    add('A0', 'a month inside the range: data-mvgo goes there, as the month bar reads it',
        landed === labelOf(mid), landed, labelOf(mid));

    // ---- A1: the same set as the arrows ----
    var bad = [];
    keys.forEach(function (k, i) {
      press('data-mvgo', keys[(i + Math.floor(keys.length / 2)) % keys.length]);   // start somewhere else
      if(press('data-mvgo', k) !== labelOf(k)) bad.push(k);
    });
    var before = press('data-mvgo', mid);
    var outLow = press('data-mvgo', step(keys[0], -1)), outHigh = press('data-mvgo', step(keys[keys.length - 1], 1));
    add('A1', 'every month the frozen arrows page through is reachable by data-mvgo, ends included; the months past them are refused',
        bad.length === 0 && outLow === before && outHigh === before,
        {unreachable: bad, pastStart: outLow, pastEnd: outHigh}, {unreachable: [], pastStart: before, pastEnd: before});

    // ---- A2: stepping ----
    var a = press('data-mvstep', '1'), b = press('data-mvstep', '-1');
    press('data-mvgo', keys[keys.length - 1]);
    var atEnd = press('data-mvstep', '1'), endArrowOff = next().disabled;
    press('data-mvgo', keys[0]);
    var atStart = press('data-mvstep', '-1'), startArrowOff = prev().disabled;
    add('A2', 'data-mvstep steps one month each way and stops at both ends, where the frozen arrows are disabled',
        a === labelOf(step(mid, 1)) && b === labelOf(mid) && atEnd === labelOf(keys[keys.length - 1]) && endArrowOff &&
        atStart === labelOf(keys[0]) && startArrowOff,
        {forward: a, back: b, pastEnd: atEnd, pastStart: atStart},
        {forward: labelOf(step(mid, 1)), back: labelOf(mid), pastEnd: labelOf(keys[keys.length - 1]), pastStart: labelOf(keys[0])});

    // ---- A3: garbage ----
    press('data-mvgo', mid);
    var g1 = press('data-mvgo', 'October'), g2 = press('data-mvgo', '2026-13'), g3 = press('data-mvstep', '2'), g4 = press('data-mvgo', '');
    add('A3', 'a garbage value goes nowhere', [g1, g2, g3, g4].every(function (x) { return x === labelOf(mid); }),
        [g1, g2, g3, g4], labelOf(mid));

    // ---- A4: session UI only ----
    await new Promise(function (r) { setTimeout(r, 400); });   // past markDirty's debounce, had paging called it
    var undoAfter = !!(document.getElementById('undo-btn') || {}).disabled;
    var statusAfter = ((document.querySelector('.save-status') || {}).textContent || '').trim();
    add('A4', "paging is session UI: the undo button's state and the save status are what they were",
        undoAfter === undoBefore && statusAfter === statusBefore,
        {undoDisabled: undoAfter, status: statusAfter}, {undoDisabled: undoBefore, status: statusBefore});

    // ---- E0: and back to the waterfall once more, so both views' pushes ran ----
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !document.querySelector('#table-wrap .month-view'); }, 'the waterfall', 100, 50);
    await new Promise(function (r) { setTimeout(r, 50); });
    out.errors = (window.__ERR || []).filter(function (m) { return !/SPTCal: \d+ value\(s\) in this calendar were not in a form/.test(m); }).slice(0, 10);
    add('E0', 'no console errors over every render above, in both views', out.errors.length === 0, out.errors, []);
  } catch (e) {
    out.EX = String(e && e.message || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);
})(); });
