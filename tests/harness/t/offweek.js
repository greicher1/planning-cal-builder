// offweek -- a Production week with no shoot days reads and counts as a Production hiatus (OFF-WEEK-PLAN.md).
//
// TWO RUNS, chosen by the starting state:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh offweek 600
//     LIVE + MINT. Builds the calendar below through the UI, marks every day off (and the one Saturday
//     worked) through the month view's day menu (the Full day/Off popover until day menu step 4), each
//     click HIT-TESTED at the day-number band as a pointer would land, then saves through the real Save path (only the OS picker stood in for):
//     out.sptcal -> tests/fixtures/offweek.sptcal.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=offweek ./run.sh offweek 600
//     RESTORE. Every case below, against the hand trace. Exports the workbook (read back in the page
//     with ExcelJS) and the waterfall PDF (out.pdf, which gate.sh reads with pdftotext).
//
// THE CALENDAR (made-up 2027 dates and a made-up show shape; US General):
//   "Off Week Fixture", Season 3, 8 episodes x 5 days = 40 shoot days from Mon 8/2/27. Prod Prep from
//   6/21/27 (6 wk), Post from 11/8/27 (12 wk). An all-phase hiatus the week of 8/23 (LOCKED, as every new
//   row is). Production's OWN hiatus the week of 10/4. Labor Day Mon 9/6/27 is the only union holiday in
//   the shoot. Marks: 8/2-8/6 off, 8/30-9/3 off, 9/7-9/10 off, 9/20-9/24 off, Sat 9/25 worked ('on').
//
// HAND TRACE -- the waterfall's Production cell, week by week (before this change in brackets):
//   8/2   wk 1               no shoot day, but BEFORE the first one: ruling Q3 keeps it numbered
//   8/9   wk 2               8/9-8/13, shoot days 1-5
//   8/16  wk 3               8/16-8/20, 6-10
//   8/23  (all-phase Hiatus) a full-width band; Production has no cell
//   8/30  Production Hiatus  [wk 4]  all five weekdays off: an OFF WEEK
//   9/6   Production Hiatus  [wk 5]  Labor Day + four offs: an off week of mixed cause
//   9/13  wk 4              [wk 6]  9/13-9/17, 11-15
//   9/20  wk 5              [wk 7]  five offs but Sat 9/25 worked: day 16, so NOT an off week
//   9/27  wk 6              [wk 8]  9/27-10/1, 17-21
//   10/4  Production Hiatus          Production's own hiatus (unchanged)
//   10/11 wk 7              [wk 9]  22-26
//   10/18 wk 8              [wk 10] 27-31
//   10/25 wk 9              [wk 11] 32-36
//   11/1  wk 10             [wk 12] 11/1-11/4, 37-40: wrap Thu 11/4/27
//   Header span: 13 rows carry a Production cell (all but 8/23) -> "13-Week Production Span", unchanged.
//   {production.weeks}: 13 less the three hiatus weeks = 10 [12].
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'offweek'}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  var DAY = 864e5;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(d){ return d.toISOString().slice(0, 10); }
  function addD(s, n){ return iso(new Date(Date.parse(s + 'T00:00:00Z') + n * DAY)); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(700);   // past the 500 ms undo debounce, so the next action is its own step
  }
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  // A case that throws fails alone, so a red build still reports every other case.
  async function step(name, fn){
    try { await fn(); }
    catch (e) { check(false, name + ' threw: ' + String(e && e.message || e)); out['ex_' + name] = String(e && e.stack || e); }
  }

  // ---- the waterfall, read back ---------------------------------------------------------------------------
  // Production's cell per week Monday: its text, and whether it is a band (a phase-hiatus cell).
  function wfProd(){
    var m = {};
    document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="production"]').forEach(function (td) {
      m[td.getAttribute('data-week')] = {text: td.textContent.trim(), band: td.classList.contains('sheet-hiatus-cell')};
    });
    return m;
  }
  function wfLabels(){ var m = wfProd(), o = {}; Object.keys(m).sort().forEach(function (k) { o[k] = m[k].text; }); return o; }
  function sameObj(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function diffObj(a, b){
    var o = {};
    Object.keys(Object.assign({}, a, b)).sort().forEach(function (k) { if(a[k] !== b[k]) o[k] = {got: a[k], want: b[k]}; });
    return o;
  }

  // ---- the month view, driven and read the way a pointer and an eye would --------------------------------
  function monthOnScreen(){
    var t = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '';
    var m = /(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/.exec(t);
    return m ? {label: m[0], first: new Date(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1))} : null;
  }
  async function toMonth(label){
    if(!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var cur = monthOnScreen();
      if(cur && cur.label === label) return;
      var btn = $(Date.parse('1 ' + cur.label) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + (cur && cur.label) + ')');
      btn.click(); await T.sleep(250);
    }
    throw new Error('never reached ' + label);
  }
  function dayCell(n){
    var cells = document.querySelectorAll('#table-wrap .mv-daycell:not(.mv-out)');
    for(var i = 0; i < cells.length; i++){
      var num = cells[i].querySelector('.mv-daynum');
      if(num && parseInt(num.textContent, 10) === n) return cells[i];
    }
    return null;
  }
  // ⛔ HIT-TESTED (halfworked's rule): the element on top at the day-number band must belong to the cell,
  // and THAT element gets the click.
  async function hitDay(n){
    var cell = dayCell(n);
    if(!cell) throw new Error('no cell for day ' + n);
    cell.scrollIntoView({block: 'center'}); await T.sleep(120);
    var r = cell.getBoundingClientRect();
    var top = document.elementFromPoint(Math.round(r.left + 12), Math.round(r.top + 9));
    if(!top || !top.closest || top.closest('.mv-daycell') !== cell) throw new Error('day ' + n + ' is not reachable at its number band');
    return top;
  }
  // ⚠️ Since day menu step 4 (MONTH-CONTEXT-MENU-PLAN.md, ruling L1; merged into main with this leg on 19 Oct
  // 2026) the click opens the DAY MENU, and the retired Full day/Off popover's rows are its shoot-day section,
  // each keeping its data-ov: the same values, read from [data-section="shoot"]. The menu closes on a PRESS
  // outside it, so the leg presses before its click-away.
  async function mark(n, v){
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, button: 0}));
    document.body.click(); await T.sleep(150);
    (await hitDay(n)).click(); await T.sleep(250);
    var pop = document.querySelector('.day-menu');
    if(!pop || !pop.querySelector('[data-section="shoot"]')) throw new Error('no day menu with a shoot-day section opened for day ' + n);
    var b = pop.querySelector('[data-section="shoot"] .day-menu-item[data-ov="' + v + '"]');
    if(!b) throw new Error('no option "' + v + '" for day ' + n);
    var r = b.getBoundingClientRect();
    var top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if(!top || !top.closest || top.closest('.day-menu-item') !== b) throw new Error('option "' + v + '" is covered');
    top.click();
    await settle();
  }
  // Every row of the month on screen, keyed by the row's MONDAY: the band (text, columns, lane), whether a
  // Production pill is drawn and on which columns, and which in-month days carry the off hatching.
  function monthRows(){
    var cur = monthOnScreen(); if(!cur) return {};
    var gs = new Date(cur.first.getTime() - cur.first.getUTCDay() * DAY), rows = {};
    document.querySelectorAll('#table-wrap .mv-body > .mv-week').forEach(function (w, k) {
      var mon = iso(new Date(gs.getTime() + (7 * k + 1) * DAY));
      var bands = [].map.call(w.querySelectorAll('.mv-hiatus-bar'), function (b) {
        return {text: (b.getAttribute('title') || b.textContent || '').trim(), cols: String(b.style.gridColumn || '').replace(/\s+/g, ''), lane: String(b.style.gridRow || '')};
      });
      var pills = [].map.call(w.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        return {cols: String(p.style.gridColumn || '').replace(/\s+/g, ''), lane: String(p.style.gridRow || '')};
      });
      var off = [].filter.call(w.querySelectorAll('.mv-daycell:not(.mv-out)'), function (c) { return c.classList.contains('mv-day-off'); })
        .map(function (c) { return parseInt((c.querySelector('.mv-daynum') || {}).textContent, 10); });
      rows[mon] = {bands: bands, pills: pills, off: off};
    });
    return rows;
  }
  async function monthRowsOf(labels){
    var all = {};
    for(var i = 0; i < labels.length; i++){
      await toMonth(labels[i]);
      var r = monthRows();
      Object.keys(r).forEach(function (k) { if(!all[k] || (r[k].bands.length + r[k].pills.length) > (all[k].bands.length + all[k].pills.length)) all[k] = r[k]; });
    }
    return all;
  }

  // ---- Save and Load through the real paths (episodeprep's shape) --------------------------------------------
  var written = [];
  function textOf(w){ return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'offweek.sptcal', kind: 'file',
    queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
    isSameEntry: async function(o){ return o === saveHandle; },
    getFile: async function(){ return new File([written.length ? textOf(written[written.length - 1]) : ''], 'offweek.sptcal', {lastModified: 1}); },
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
    var stem = 'offweek-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/tests/fixtures/offweek.sptcal', name, {text: text, writes: written});
    for(var i = 0; i < 40; i++){ await T.sleep(100); if(T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file’s name in the file menu', 100, 100);
    await settle();
  }

  // ---- prep and its "Pause prep on days marked Off" switch (owner, 20 Oct 2026) -------------------------------
  // Since owner ruling 12 (20 Oct 2026, the day it was built) the switch is in the Settings window ▸ Calendar ▸
  // Month view, #prep-pause-off inside .prefs-card; it was an id-less box in the Prep row. That card shows in
  // the MONTH VIEW only, like the Prep row, so both the view and the window must be up before it can be hit.
  function pauseBox(){ return document.getElementById('prep-pause-off'); }
  function pauseText(){ var l = [].find.call(document.querySelectorAll('label[for="prep-pause-off"]'), function (x) { return x.textContent.trim(); }); return l ? l.textContent.trim() : ''; }
  async function showPrepRow(){
    if(!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    await T.openSettings('prefs');
  }
  // ⛔ HIT-TESTED: the element on top at the centre of the switch's TRACK (the input itself is invisible) must
  // be the track's, and THAT element gets the click -- the label it sits in toggles the switch, as for a user.
  async function clickPause(){
    await showPrepRow();
    var cb = pauseBox();
    if(!cb) throw new Error('no Pause prep switch in the Settings window');
    var tr = cb.closest('.mantine-Switch-root').querySelector('.mantine-Switch-track');
    var r = tr.getBoundingClientRect();
    var top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    if(!top || !tr.contains(top)) throw new Error('the Pause prep switch is covered (' + (top && (top.className || top.tagName)) + ')');
    top.click();
    await settle();
    await T.closeSettings();
  }
  // Every prep pill of the shoot's months, as {"Prep 303": "iso,iso,..."} (a pill's own text, not its grey span).
  async function prepRuns(){
    var got = {};
    for(var i = 0; i < MONTHS_OF_SHOOT.length; i++){
      await toMonth(MONTHS_OF_SHOOT[i]);
      var first = monthOnScreen().first, gs = first.getTime() - first.getUTCDay() * DAY;
      document.querySelectorAll('#table-wrap .mv-body > .mv-week').forEach(function (w, k) {
        w.querySelectorAll('.mv-pill[data-ph="episodePrep"]').forEach(function (p) {
          var sp = p.querySelector('.mv-pill-block'), txt = '';
          p.childNodes.forEach(function (n) { if(n !== sp) txt += n.textContent; });
          var gc = String(p.style.gridColumn || '').split('/').map(function (x) { return parseInt(x, 10); });
          var o = (got[txt.trim()] = got[txt.trim()] || {});
          for(var c = gc[0] - 1; c <= gc[1] - 2; c++) o[iso(new Date(gs + (7 * k + c) * DAY))] = 1;
        });
      });
    }
    var map = {};
    Object.keys(got).sort().forEach(function (k) { map[k] = Object.keys(got[k]).sort().join(','); });
    return map;
  }

  // ---- the hand trace ------------------------------------------------------------------------------------------
  var EXPECT = {
    '2027-08-02': 'Production wk 1',  '2027-08-09': 'Production wk 2',  '2027-08-16': 'Production wk 3',
    '2027-08-30': 'Production Hiatus', '2027-09-06': 'Production Hiatus',
    '2027-09-13': 'Production wk 4',  '2027-09-20': 'Production wk 5',  '2027-09-27': 'Production wk 6',
    '2027-10-04': 'Production Hiatus',
    '2027-10-11': 'Production wk 7',  '2027-10-18': 'Production wk 8',  '2027-10-25': 'Production wk 9',
    '2027-11-01': 'Production wk 10'
  };
  var OFF_WEEKS = ['2027-08-30', '2027-09-06'];
  var MONTHS_OF_SHOOT = ['August 2027', 'September 2027', 'October 2027', 'November 2027'];

  try {
    var st = new URLSearchParams(location.search).get('state') || '';
    await T.appReady();
    out.run = st ? 'restore' : 'live';

    if(!st){
      // ================= LIVE + MINT =================
      T.set('show-title', 'Off Week Fixture'); T.set('season-num', '3');
      T.set('num-episodes', '8'); T.set('shoot-days-per-ep', '5');
      T.set('union-place', 'us-general');
      T.set('start-prodPrep', '2027-06-21'); T.set('weeks-prodPrep', '6');
      T.set('start-production', '2027-08-02');
      T.set('start-post', '2027-11-08'); T.set('weeks-post', '12');
      T.addHiatus('2027-08-23', 1);
      var en = $('phiatus-en-production');
      if(!en.checked) en.click();
      T.set('phiatus-start-production', '2027-10-04'); T.set('phiatus-weeks-production', '1');
      await settle();
      await view('sheet');
      out.liveBefore = wfLabels();
      check(out.liveBefore['2027-08-30'] === 'Production wk 4' && out.liveBefore['2027-10-04'] === 'Production Hiatus',
            'LIVE before any mark, 8/30 is an ordinary wk 4 and 10/4 is Production\'s own hiatus');

      await toMonth('August 2027');
      for(var d = 2; d <= 6; d++) await mark(d, 'off');
      await mark(30, 'off'); await mark(31, 'off');
      await toMonth('September 2027');
      for(d = 1; d <= 3; d++) await mark(d, 'off');
      for(d = 7; d <= 10; d++) await mark(d, 'off');
      for(d = 20; d <= 24; d++) await mark(d, 'off');
      await mark(25, 'on');
      await view('sheet');
      out.liveAfter = wfLabels();
      check(sameObj(out.liveAfter, EXPECT), 'LIVE after the marks, every Production cell matches the hand trace');
      if(!sameObj(out.liveAfter, EXPECT)) out.liveDiff = diffObj(out.liveAfter, EXPECT);

      var text = await save();
      var snap = JSON.parse(text);
      out.savedMarks = snap.dayOverrides;
      var offs = Object.keys(snap.dayOverrides || {}).filter(function (k) { return snap.dayOverrides[k] === 'off'; }).length;
      check(offs === 19 && snap.dayOverrides['2027-09-25'] === 'on' && Object.keys(snap.dayOverrides).length === 20,
            'MINT the file carries the 19 off marks and the worked Saturday, nothing else (' + offs + ' off)');
      check(!JSON.stringify(snap).match(/offWeek/i), 'MINT nothing named offWeek reaches the file (the band is derived, never saved)');
      check(!('prepPauseOff' in snap), 'MINT the Pause prep switch was never ticked, so the file carries no prepPauseOff key');
      out.sptcal = btoa(unescape(encodeURIComponent(text)));
    }

    if(st === 'offweek'){
      // ================= RESTORE =================
      var fixtureText = await (await fetch('/tests/fixtures/offweek.sptcal')).text();
      await view('sheet');

      await step('R1', async function () {
        out.r1 = wfLabels();
        check(sameObj(out.r1, EXPECT), 'R1 every Production cell in the waterfall matches the hand trace (off weeks banded, numbering skips them)');
        if(!sameObj(out.r1, EXPECT)) out.r1diff = diffObj(out.r1, EXPECT);
        var m = wfProd();
        check(OFF_WEEKS.concat(['2027-10-04']).every(function (k) { return m[k] && m[k].band; })
              && Object.keys(m).filter(function (k) { return m[k].band; }).length === 3,
              'R1 exactly three Production bands: the two off weeks and the own hiatus');
        check(!!document.querySelector('#table-wrap td.sheet-hiatus-cell:not(.sheet-phase-cell)[data-week="2027-08-23"]'),
              'R1 the all-phase hiatus of 8/23 is still its own full-width band');
        var td = document.querySelector('#table-wrap td.sheet-hiatus-cell.sheet-phase-cell[data-week="2027-08-30"][data-pkey="production"]');
        out.r1band = td ? {bg: td.style.background, tip: td.title, def: td.getAttribute('data-default-label')} : null;
        check(!!td && td.title === 'Click to rename or recolor this hiatus' && td.getAttribute('data-default-label') === 'Production Hiatus',
              'R1 an off-week band is the own-hiatus cell exactly: the same tip and default label');
      });

      await step('R2', async function () {
        var lines = [].map.call(document.querySelectorAll('.hdr-line'), function (e) { return e.textContent.trim(); });
        out.r2 = lines.filter(function (l) { return /Week Production Span/.test(l); });
        check(out.r2.length && /^13-Week Production Span/.test(out.r2[0]), 'R2 the header still reads a 13-Week Production Span (a paused week stays in the span)');
      });

      await step('R3', async function () {
        await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
        var xb = await T.captureExport('export-btn', 'the .xlsx blob');
        var buf = await xb.arrayBuffer();
        out.xlsx = T.b64(buf);
        var wb = new window.ExcelJS.Workbook(); await wb.xlsx.load(buf);
        var strs = [];
        wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) { if(typeof c.value === 'string') strs.push(c.value); }); }); });
        var wks = strs.filter(function (s) { return /^Production wk \d+$/.test(s); }).map(function (s) { return +s.split(' ').pop(); }).sort(function (a, b) { return a - b; });
        out.r3 = {wk: wks, hiatus: strs.filter(function (s) { return s === 'Production Hiatus'; }).length};
        check(wks.join() === '1,2,3,4,5,6,7,8,9,10', 'R3 the workbook numbers Production wk 1 to wk 10, once each');
        check(out.r3.hiatus === 3, 'R3 the workbook has three Production Hiatus cells');
      });

      await step('R4', async function () {
        var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
        out.pdf = T.b64(await pb.arrayBuffer());
        check(out.pdf.length > 10000, 'R4 the waterfall PDF was exported (gate.sh reads its text)');
      });

      await step('R5', async function () {
        var rows = await monthRowsOf(MONTHS_OF_SHOOT);
        out.r5 = {};
        ['2027-08-02', '2027-08-30', '2027-09-06', '2027-09-20', '2027-10-04'].forEach(function (k) { out.r5[k] = rows[k]; });
        var band = function (k) { return (rows[k] || {bands: []}).bands; }, pills = function (k) { return (rows[k] || {pills: []}).pills; };
        check(OFF_WEEKS.every(function (k) { return band(k).length === 1 && band(k)[0].text === 'Production Hiatus' && band(k)[0].cols === '2/7' && !pills(k).length; }),
              'R5 each off week has ONE Production Hiatus band, Mon-Fri, and no Production bar');
        check(band('2027-10-04').length === 1 && band('2027-10-04')[0].cols === '2/7', 'R5 the own hiatus band is unchanged');
        // ⚠️ NOT hatched: the five marks sit before the first shoot day (8/9), and the month view draws no
        // mark outside the shoot's span ("an override there is inert by design", the dayOverrides UI). So
        // the month view shows this week EMPTY while the waterfall says "Production wk 1". That predates this
        // change (prove-red shows it on the old build too), and ruling Q3 keeps the waterfall's text.
        check(!band('2027-08-02').length && !pills('2027-08-02').length && !rows['2027-08-02'].off.length,
              'R5 the Q3 week (8/2) has no band and no bar (and no hatching: its marks precede the first shoot day)');
        check(!band('2027-09-20').length && pills('2027-09-20').length === 1 && pills('2027-09-20')[0].cols === '7/8',
              'R5 the Saturday-worked week (9/20) has no band: one bar, on the Saturday');
        check(rows['2027-08-30'].off.length === 2 && rows['2027-09-06'].off.join() === '7,8,9,10',
              'R5 the hatching is unchanged under the bands');
        var ln = function (k) { return (pills(k)[0] || {}).lane; };
        out.r5lanes = {band830: (band('2027-08-30')[0] || {}).lane, pill816: ln('2027-08-16'), pill913: ln('2027-09-13')};
      });

      // ⚠️ A view switch is an undo step of its own (viewMode is in the snapshot), so the undo here comes
      // straight after the choice, in the same view, and the waterfall is read after a REDO.
      await step('R6', async function () {
        await toMonth('September 2027');
        await mark(1, '');
        var r = monthRows()['2027-08-30'];
        out.r6 = {row: r};
        check(r && !r.bands.length && r.pills.length === 1 && r.pills[0].cols === '4/5', 'R6 Full day on Wed 9/1: its month row loses the band and gains one bar, on the Wednesday');
        $('undo-btn').click(); await settle();
        r = monthRows()['2027-08-30'];
        check(r && r.bands.length === 1 && !r.pills.length, 'R6 one undo puts the band back');
        $('redo-btn').click(); await settle();
        await view('sheet');
        var a = wfLabels();
        out.r6.after = a;
        check(a['2027-08-30'] === 'Production wk 4' && a['2027-09-06'] === 'Production Hiatus' && a['2027-09-13'] === 'Production wk 5'
              && a['2027-11-01'] === 'Production wk 11', 'R6 after redo the waterfall has 8/30 back as wk 4, and every later number moves with it');
      });

      await step('R7', async function () {
        await load(fixtureText);
        await view('sheet');
        var sel = '#table-wrap td.sheet-hiatus-cell.sheet-phase-cell[data-week="2027-08-30"][data-pkey="production"]';
        var td = document.querySelector(sel);
        if(!td) throw new Error('no band cell for 8/30');
        T.openCell(td);   // a double-click since D5 (TEXT-STYLE-BAR-PLAN.md)
        await T.until(function () { return !!document.querySelector('.note-editor textarea'); }, 'the band editor', 50, 100);
        var ta = document.querySelector('.note-editor textarea');
        ta.value = 'Crew Rest';
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true}));
        await T.until(function () { return !document.querySelector('.note-editor textarea'); }, 'the editor to close', 50, 100);
        await settle();
        check(wfLabels()['2027-08-30'] === 'Crew Rest', 'R7 the off-week band renames in the waterfall');
        await toMonth('August 2027');
        var b = (monthRows()['2027-08-30'] || {bands: []}).bands;
        check(b.length === 1 && b[0].text === 'Crew Rest', 'R7 the month band shows the waterfall\'s rename');
        var saved = await save();
        var snap = JSON.parse(saved);
        check((snap.hiatusTexts || {})['2027-08-30|production'] === 'Crew Rest', 'R7 the rename is saved under 2027-08-30|production');
        await load(saved);
        await view('sheet');
        var l = wfLabels();
        await toMonth('August 2027');
        b = (monthRows()['2027-08-30'] || {bands: []}).bands;
        check(l['2027-08-30'] === 'Crew Rest' && b.length === 1 && b[0].text === 'Crew Rest', 'R7 after Save and Load, both views still read Crew Rest');
      });

      await step('R8', async function () {
        var s = JSON.parse(fixtureText);
        s.headerMode = 'manual'; s.headerTemplates = true;
        s.headerManual = {r3: 'W={production.weeks}'};
        await load(JSON.stringify(s));
        await view('sheet');
        var e = document.querySelector('.hdr-line[data-hid="r3"]');
        out.r8 = e ? e.textContent.trim() : null;
        check(out.r8 === 'W=10', 'R8 the {production.weeks} token counts the worked weeks, 10 (it was 12)');
      });

      await step('R9', async function () {
        await load(fixtureText);
        $('shift-fwd-btn').click(); await settle();
        await view('sheet');
        var m = wfProd(), keys = Object.keys(m).sort();
        var nums = keys.filter(function (k) { return !m[k].band; }).map(function (k) { return +m[k].text.split(' ').pop(); });
        out.r9 = {wf: wfLabels()};
        check(nums.every(function (n, i) { return n === i + 1; }), 'R9 after Shift All +1 wk the numbering still runs 1, 2, 3 ... with no gap');
        var rows = await monthRowsOf(['August 2027', 'September 2027', 'October 2027', 'November 2027']);
        var agree = keys.every(function (k) {
          var r = rows[k]; if(!r) return false;
          return m[k].band ? (r.bands.length === 1 && !r.pills.length) : (k === keys[0] || r.pills.length > 0);
        });
        out.r9.month = {};
        keys.forEach(function (k) { out.r9.month[k] = rows[k] && {bands: rows[k].bands.length, pills: rows[k].pills.length}; });
        check(agree, 'R9 and the two views still agree: a band in the waterfall is a band and no bar in the month view, and every numbered week but the first has a bar');
      });

      await step('R10', async function () {
        await load(await (await fetch('/tests/fixtures/dayoverrides.sptcal')).text());
        await view('sheet');
        var m = wfProd(), keys = Object.keys(m).sort();
        var nums = keys.map(function (k) { return m[k].text; });
        out.r10 = nums;
        check(!keys.some(function (k) { return m[k].band; }) && nums.every(function (t, i) { return t === 'Production wk ' + (i + 1); }) && nums.length === 17,
              'R10 a calendar with no off week (dayoverrides) loaded after it reads Production wk 1 to 17 with no band');
        await toMonth('August 2026');
        var rows = monthRows();
        check(Object.keys(rows).every(function (k) { return !rows[k].bands.length; }), 'R10 and its month view draws no Production band');
      });

      // ⭐ R11-R13 -- "Pause prep on days marked Off" (owner, 20 Oct 2026, by picker: "Switch, default: don't
      // skip", "Prep card, saved", and "Follow the switch" for Production's own hiatus). TICKED, prep is never
      // laid on a day marked Off inside the shoot, nor in Production's own hiatus: both PAUSE prep as a holiday
      // does, so each run keeps its 5 days and starts earlier (the 19 Oct rulings, "Skip it, start earlier" and
      // "Yes, skip it too"). UNTICKED, the default, prep runs through both, as the live app did before.
      // Hand trace with a 5-day default (shot range 8/9-11/4; unticked in brackets where it differs):
      //   Prep 301  8/2-8/6            the Q3 week: its marks precede the first shoot day, so they are inert
      //   Prep 302  8/9-8/13
      //   Prep 303  8/16-8/20          past 9/7-9/10 off, Labor Day, 8/30-9/3 off, the 8/23 hiatus  [9/3, 9/7-9/10]
      //   Prep 304  9/13-9/17          past 9/20-9/24 off                                            [9/20-9/24]
      //   Prep 305  9/17, 9/27-9/30    past 9/20-9/24 off                                            [9/24, 9/27-9/30]
      //   Prep 306  10/1, 10/11-10/14  past Production's own hiatus, 10/4-10/8                       [10/8, 10/11-10/14]
      //   Prep 307  10/15, 10/18-10/21
      //   Prep 308  10/22, 10/25-10/28
      var PAUSED = {
        'Prep 301': '2027-08-02,2027-08-03,2027-08-04,2027-08-05,2027-08-06',
        'Prep 302': '2027-08-09,2027-08-10,2027-08-11,2027-08-12,2027-08-13',
        'Prep 303': '2027-08-16,2027-08-17,2027-08-18,2027-08-19,2027-08-20',
        'Prep 304': '2027-09-13,2027-09-14,2027-09-15,2027-09-16,2027-09-17',
        'Prep 305': '2027-09-17,2027-09-27,2027-09-28,2027-09-29,2027-09-30',
        'Prep 306': '2027-10-01,2027-10-11,2027-10-12,2027-10-13,2027-10-14',
        'Prep 307': '2027-10-15,2027-10-18,2027-10-19,2027-10-20,2027-10-21',
        'Prep 308': '2027-10-22,2027-10-25,2027-10-26,2027-10-27,2027-10-28'
      };
      var THROUGH = Object.assign({}, PAUSED, {
        'Prep 303': '2027-09-03,2027-09-07,2027-09-08,2027-09-09,2027-09-10',
        'Prep 304': '2027-09-20,2027-09-21,2027-09-22,2027-09-23,2027-09-24',
        'Prep 305': '2027-09-24,2027-09-27,2027-09-28,2027-09-29,2027-09-30',
        'Prep 306': '2027-10-08,2027-10-11,2027-10-12,2027-10-13,2027-10-14'
      });
      var marks = JSON.parse(fixtureText).dayOverrides || {};
      function badDays(map){
        var days = [].concat.apply([], Object.keys(map).map(function (k) { return map[k].split(','); }));
        return {onOff: days.filter(function (d) { return marks[d] === 'off' && d >= '2027-08-09' && d <= '2027-11-04'; }),
                inOwn: days.filter(function (d) { return d >= '2027-10-04' && d <= '2027-10-08'; })};
      }

      await step('R11', async function () {
        await load(fixtureText);
        T.set('prep-days', '5'); await settle();
        await clickPause();
        check(pauseBox().checked, 'R11 a real click ticks "Pause prep on days marked Off"');
        var map = await prepRuns();
        out.r11 = map;
        check(sameObj(map, PAUSED), 'R11 ticked, with a 5-day default, every prep run matches the hand trace (each keeps 5 days and starts earlier)');
        if(!sameObj(map, PAUSED)) out.r11diff = diffObj(map, PAUSED);
        var bad = out.r11bad = badDays(map);
        check(!bad.onOff.length, 'R11 ticked, no prep pill sits on a day marked Off inside the shoot (' + bad.onOff.join(' ') + ')');
        check(!bad.inOwn.length, 'R11 ticked, no prep pill sits in Production\'s own hiatus, 10/4-10/8 (' + bad.inOwn.join(' ') + ')');
      });

      // R12 -- THE DEFAULT. The same file, freshly loaded (it has no prepPauseOff key): the box is unticked and
      // prep runs through the Off days and Production's own hiatus, exactly as before 19 Oct.
      await step('R12', async function () {
        await load(fixtureText);
        T.set('prep-days', '5'); await settle();
        await showPrepRow();
        out.r12box = {present: !!pauseBox(), checked: pauseBox() && pauseBox().checked, id: pauseBox() && pauseBox().id,
                      text: pauseText()};
        check(out.r12box.present && out.r12box.checked === false && out.r12box.text === 'Pause prep on days marked Off',
              'R12 a file with no prepPauseOff key opens with "Pause prep on days marked Off" UNTICKED');
        var map = await prepRuns();
        out.r12 = map;
        check(sameObj(map, THROUGH), 'R12 unticked, every prep run matches the hand trace\'s bracketed values (prep runs through Off days and the own hiatus)');
        if(!sameObj(map, THROUGH)) out.r12diff = diffObj(map, THROUGH);
        var bad = out.r12bad = badDays(map);
        check(bad.onOff.join() === '2027-09-03,2027-09-07,2027-09-08,2027-09-09,2027-09-10,2027-09-20,2027-09-21,2027-09-22,2027-09-23,2027-09-24,2027-09-24'
              && bad.inOwn.join() === '2027-10-08',
              'R12 unticked, prep sits on the in-shoot Off days 9/3, 9/7-9/10, 9/20-9/24 and on 10/8 in Production\'s own hiatus');
      });

      // R13 -- one undo step, saved with the calendar, and restored UNCONDITIONALLY (the M-5 trap: an older
      // file loaded after a ticked one must open unticked, never keep the previous file's tick).
      await step('R13', async function () {
        // Continues from R12: the fixture with a 5-day default, unticked.
        var plain = JSON.parse(await save());
        check(!('prepPauseOff' in plain), 'R13 an unticked calendar saves NO prepPauseOff key (byte for byte the format before the switch)');
        await clickPause();
        check(pauseBox().checked && sameObj(await prepRuns(), PAUSED), 'R13 ticking it pauses prep (the R11 trace)');
        await showPrepRow();
        $('undo-btn').click(); await settle();
        await showPrepRow();
        var undone = {checked: pauseBox().checked, map: await prepRuns()};
        check(undone.checked === false && sameObj(undone.map, THROUGH), 'R13 ONE undo unticks it and prep runs through again');
        $('redo-btn').click(); await settle();
        await showPrepRow();
        check(pauseBox().checked && sameObj(await prepRuns(), PAUSED), 'R13 redo ticks it again');
        var savedText = await save(), snap = JSON.parse(savedText);
        out.r13 = {key: snap.prepPauseOff, byId: Object.keys(snap.fields.byId).length, plainById: Object.keys(plain.fields.byId).length};
        check(snap.prepPauseOff === true, 'R13 Save writes prepPauseOff: true');
        check(JSON.stringify(Object.keys(snap.fields.byId).sort()) === JSON.stringify(Object.keys(plain.fields.byId).sort())
              && !Object.keys(snap.fields.byId).some(function (k) { return /pause/i.test(k); }),
              'R13 ticking adds nothing to fields.byId (' + out.r13.byId + ' ids, as unticked)');
        await load(fixtureText);
        await showPrepRow();
        check(pauseBox().checked === false, 'R13 the fixture (no key) loaded straight after opens unticked');
        await load(savedText);
        await showPrepRow();
        var back = {checked: pauseBox().checked, map: await prepRuns()};
        check(back.checked === true && sameObj(back.map, PAUSED), 'R13 Loading the saved file brings the tick back, and prep pauses');
        // ⛔ The M-5 trap: the same calendar as an OLDER file -- no key -- loaded after the ticked one.
        var old = JSON.parse(savedText); delete old.prepPauseOff;
        await load(JSON.stringify(old));
        await showPrepRow();
        var m5 = {checked: pauseBox().checked, map: await prepRuns()};
        out.r13m5 = m5;
        check(m5.checked === false && sameObj(m5.map, THROUGH),
              'R13 the same calendar with no key, loaded after the ticked one, opens UNTICKED and prep runs through (never the previous file\'s tick)');
      });

      // R14 -- New starts unticked too: the Prep row is static markup, so New's reset puts the switch back by hand.
      await step('R14', async function () {
        await load(fixtureText);
        await clickPause();
        var before = pauseBox().checked;
        $('new-file-btn').click();
        for(var i = 0; i < 30; i++){ await T.sleep(100); if(/Start a new blank calendar/.test(T.modalText())){ T.clickModalButton('Start new'); break; } }
        await settle();
        await showPrepRow();
        out.r14 = {before: before, after: pauseBox().checked};
        check(before === true && out.r14.after === false, 'R14 New, after a calendar with the box ticked, starts with it UNTICKED');
      });
    }
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.health = T.appHealth ? T.appHealth() : null;
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
