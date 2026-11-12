// holidayenable -- the Holidays list (Settings › Region) shows Enable only where switching a holiday off moves a date, is
// one list in date order, and marks the holidays inside a phase that counts days with a strip in that phase's colours,
// its name sideways (option 6 of mockups/holiday-list-layouts.html, owner, 11 Nov 2026). It also says why a Production
// holiday with a box costs no shoot day.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=anchorside ./run.sh holidayenable 200
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=customunits ./run.sh holidayenable 200
//
// On anchorside.sptcal (US Area Standards; Production from Mon 6/29/26, 80 shoot days; Fri 7/3/26 marked Work this
// day; the default winter hiatus over Christmas and New Year's; Post after the shoot):
//   E1  a holiday in a Weeks phase (Thanksgiving, in Post) has no Enable box (an empty cell), and still its data-hid and notes
//   E2  a weekend holiday in the shoot (Sat 7/4/26) has no box; Labor Day, a weekday in the shoot, has one
//   E3  Fri 7/3/26 keeps its box and reads "Marked Working Day", not "Costs a shoot day"; Labor Day the other way round
//   S1  exactly one strip, "Production" in Production's fill, beside exactly 7/3, Sat 7/4 and Labor Day
//   S2  no headings, no phase words, no "also"; with the window open every name and the header's "Holiday" line up
//   T1  Toggle all: Enable switches off ONLY the boxed rows, and no box-less row grows a box
//   O1  a holiday saved OFF outside the shoot (Thanksgiving) keeps its box, unticked, so it can be turned back on
//   S3  a shoot with one holiday in it: the strip is one row tall and reads "Prod" (its title "Production")
// On customunits.sptcal (Read-through and Rigging are custom phases counted in Days; a hiatus over the week of 2/15/27):
//   D1  MLK Day 1/18/27 sits beside a "Read-through" strip in that phase's colours, with its box
//   D2  Presidents' Day 2/15/27 (in the hiatus, inside Rigging's span) sits beside a "Rigging" strip, with no box
// Red on main before 11 Nov 2026: every row there has a box and there are no strips.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  var FIX = /state=customunits/.test(location.search) ? 'customunits' : 'anchorside';
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function rowsOf(){
    return [].slice.call(document.querySelectorAll('#holiday-vis-list .hv-row')).map(function (r) {
      var en = r.querySelector('.hv-en'), run = r.closest('.hv-run'), strip = run && run.querySelector('.hv-strip');
      return {name: txt(r.querySelector('.hv-name')), date: txt(r.querySelector('.hv-date')), hid: r.getAttribute('data-hid'),
              box: !!en, on: en ? en.checked : null, dash: !!r.querySelector('.hv-en-na'),
              notes: r.querySelectorAll('.hv-cb').length, costs: !!r.querySelector('.hv-shoot'), worked: /Marked Working Day/.test(txt(r)),
              strip: strip ? txt(strip) : null};
    });
  }
  function row(name, date){ return rowsOf().filter(function (r) { return r.name === name && (!date || r.date.indexOf(date) === 0); })[0] || null; }
  function strips(){
    return [].slice.call(document.querySelectorAll('#holiday-vis-list .hv-strip')).map(function (s) {
      return {label: txt(s), title: s.getAttribute('title'), bg: getComputedStyle(s).backgroundColor, fg: getComputedStyle(s).color,
              rows: [].slice.call(s.parentElement.querySelectorAll('.hv-row')).map(function (r) { return txt(r.querySelector('.hv-name')) + ' ' + txt(r.querySelector('.hv-date')).split(' ')[0]; })};
    });
  }
  async function settle(){
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('holiday-vis-list') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the holiday list to settle', 150, 100);
  }
  try {
    await T.appReady();
    await settle();

    if (FIX === 'customunits') {
      var mlk = row('Martin Luther King Jr. Day', '1/18/27'), pres = row("Presidents' Day", '2/15/27');
      var ss = strips(), rt = ss.filter(function (s) { return s.title === 'Read-through'; })[0], rg = ss.filter(function (s) { return s.title === 'Rigging'; })[0];
      add('D1', 'MLK Day 1/18/27 sits beside a "Read-through" strip in that phase\'s own colours (not Production\'s), with its Enable box',
        mlk && mlk.box && mlk.strip && rt && rt.rows.length === 1 && /^Martin Luther King/.test(rt.rows[0]) && rt.bg !== 'rgb(226, 240, 217)' && rt.bg !== 'rgba(0, 0, 0, 0)',
        {row: mlk, strip: rt}, 'Read-through strip, box');
      add('D2', 'Presidents\' Day 2/15/27 (in the hiatus, inside Rigging\'s span) sits beside a "Rigging" strip, with no box',
        pres && !pres.box && rg && rg.rows.length === 1 && /^Presidents/.test(rg.rows[0]), {row: pres, strip: rg}, 'Rigging strip, no box');
    } else {
      var thx = row('Thanksgiving', '11/26/26');
      add('E1', 'Thanksgiving, in Post (a Weeks phase), has no Enable box (an empty cell) and no strip, and keeps its data-hid and both note boxes',
        thx && !thx.box && thx.dash && !thx.strip && thx.hid === 'thanksgiving@2026' && thx.notes === 2, thx, 'no box, no strip, its hid, two note boxes');

      var sat = row('Independence Day', '7/4/26'), lab = row('Labor Day', '9/7/26');
      add('E2', 'Sat 7/4/26 (a weekend in the shoot) has no box; Labor Day (a weekday in the shoot) has one, ticked',
        sat && !sat.box && sat.dash && lab && lab.box && lab.on === true, {sat: sat, labor: lab}, 'weekend no box; Labor Day ticked box');

      var obs = row('Independence Day (Observed)', '7/3/26');
      add('E3', 'Fri 7/3/26, marked Work this day, keeps its box and reads "Marked Working Day", not "Costs a shoot day"; Labor Day costs a day and has no such tag',
        obs && obs.box && obs.worked && !obs.costs && lab && lab.costs && !lab.worked, {observed: obs, labor: lab}, 'tag on 7/3 only');

      var s1 = strips();
      add('S1', 'exactly one strip, "Production" in Production\'s fill, beside exactly Independence Day (Observed) 7/3, Independence Day 7/4 and Labor Day 9/7',
        s1.length === 1 && s1[0].label === 'Production' && s1[0].bg === 'rgb(226, 240, 217)'
          && JSON.stringify(s1[0].rows) === JSON.stringify(['Independence Day (Observed) 7/3/26', 'Independence Day 7/4/26', 'Labor Day 9/7/26']),
        s1, 'one Production strip over 7/3, 7/4, 9/7');

      await T.openSettings('region');
      await T.sleep(400);
      var list = document.getElementById('holiday-vis-list');
      var xs = [].slice.call(list.querySelectorAll('.hv-name')).map(function (e) { return Math.round(e.getBoundingClientRect().left); });
      var hn = document.querySelector('#holiday-vis .hv-head-name');
      var hx = hn ? Math.round(hn.getBoundingClientRect().left + parseFloat(getComputedStyle(hn).paddingLeft)) : null;
      var s2 = {grp: list.querySelectorAll('.hv-grp').length, phaseWords: rowsOf().filter(function (r) { return /·/.test(r.date); }).map(function (r) { return r.date; }),
                also: /also/.test(txt(list)), nameXs: xs.filter(function (x, i) { return xs.indexOf(x) === i; }), headX: hx};
      add('S2', 'no headings, no phase words, no "also"; with the window open every holiday name and the header\'s "Holiday" start at one x',
        s2.grp === 0 && s2.phaseWords.length === 0 && !s2.also && s2.nameXs.length === 1 && s2.nameXs[0] > 0 && s2.headX === s2.nameXs[0],
        s2, 'none, none, none; one x');
      await T.closeSettings();

      // T1: Toggle all: Enable. The fixture holds notes, so the recompute question may come: Continue.
      var boxed = rowsOf().filter(function (r) { return r.box; }).map(function (r) { return r.hid; });
      document.querySelector('#holiday-vis .hv-bulk[data-view="enabled"]').click();
      for (var i = 0; i < 20; i++) { await T.sleep(100); if (/Recompute/.test(T.modalText())) { T.clickModalButton('Continue'); break; } }
      await settle();
      var after = rowsOf();
      var offNow = after.filter(function (r) { return r.box && r.on === false; }).map(function (r) { return r.hid; });
      var grew = after.filter(function (r) { return r.box && boxed.indexOf(r.hid) === -1; }).map(function (r) { return r.hid; });
      add('T1', 'Toggle all: Enable switches off exactly the boxed rows, and no box-less row grows a box',
        boxed.length >= 2 && JSON.stringify(offNow.slice().sort()) === JSON.stringify(boxed.slice().sort()) && grew.length === 0,
        {boxed: boxed, offNow: offNow, grew: grew}, 'off = the boxed ones; none grew');

      // O1: a file that has Thanksgiving switched off (made by an older build, or before the shoot moved) keeps its box.
      await T.reloadWith(function (snap) { snap.holidayOff = {'thanksgiving@2026': true}; }, 'holidayenable-off');
      await settle();
      var thxOff = row('Thanksgiving', '11/26/26'), dayAfter = row('Day After Thanksgiving', '11/27/26');
      add('O1', 'Thanksgiving saved OFF keeps its box, unticked (the way back on), while the Day After Thanksgiving next to it, on, has none',
        thxOff && thxOff.box && thxOff.on === false && dayAfter && !dayAfter.box, {thanksgiving: thxOff, dayAfter: dayAfter}, 'box unticked; neighbour none');

      // S3: a one-episode shoot from Mon 8/31/26 holds only Labor Day.
      T.set('num-episodes', '1');
      await settle();
      T.set('start-production', '2026-08-31');
      await settle();
      var s3 = strips();
      add('S3', 'a shoot holding one holiday (Labor Day): its strip is one row tall and reads "Prod", titled "Production"',
        s3.length === 1 && s3[0].label === 'Prod' && s3[0].title === 'Production' && s3[0].rows.length === 1 && /^Labor Day/.test(s3[0].rows[0]),
        s3, 'Prod over Labor Day');
    }
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'holidayenable', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
