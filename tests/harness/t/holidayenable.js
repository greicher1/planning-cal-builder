// holidayenable -- the Holidays list (Settings › Region) shows Enable only where switching a holiday off moves a date,
// lists those under the phase that counts them and the rest under "Notes only" (option 5 of
// mockups/holiday-list-layouts.html), and says why a Production holiday with a box costs no shoot day (owner, 11 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=anchorside ./run.sh holidayenable 200
//
// On anchorside.sptcal (US Area Standards; Production from Mon 6/29/26, 80 shoot days; Fri 7/3/26 marked Work this
// day; the default winter hiatus over Christmas and New Year's; Post after the shoot):
//   E1  a holiday in a Weeks phase (Thanksgiving, in Post) has no Enable box (an empty cell), and still its data-hid and notes
//   E2  a weekend holiday in the shoot (Sat 7/4/26) has no box; Labor Day, a weekday in the shoot, has one
//   E3  Fri 7/3/26 keeps its box and reads "Marked Working Day", not "Costs a shoot day"; Labor Day the other way round
//   G1  exactly two headings, Production then Notes only; Production holds 7/3 and Labor Day, with no phase word
//   G2  Christmas is under Notes only reading "· Hiatus", Thanksgiving "· Post", Sat 7/4 "· Production"; no "also" anywhere
//   T1  Toggle all: Enable switches off ONLY the boxed rows, and no dashed row grows a box
//   O1  a holiday saved OFF outside the shoot (Thanksgiving) keeps its box, unticked, so it can be turned back on
// Red on main before 11 Nov 2026: every row there has a box and the list has no headings.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function rowsOf(){
    return [].slice.call(document.querySelectorAll('#holiday-vis-list .hv-row')).map(function (r) {
      var en = r.querySelector('.hv-en');
      return {name: txt(r.querySelector('.hv-name')), date: txt(r.querySelector('.hv-date')), hid: r.getAttribute('data-hid'),
              box: !!en, on: en ? en.checked : null, dash: !!r.querySelector('.hv-en-na'),
              notes: r.querySelectorAll('.hv-cb').length, costs: !!r.querySelector('.hv-shoot'), worked: /Marked Working Day/.test(txt(r))};
    });
  }
  function row(name, date){ return rowsOf().filter(function (r) { return r.name === name && (!date || r.date.indexOf(date) === 0); })[0] || null; }
  function heads(){
    return [].slice.call(document.querySelectorAll('#holiday-vis-list > .hv-grp')).map(function (g) {
      return {name: txt(g.querySelector('.hv-grp-name')), note: txt(g.querySelector('.hv-grp-note'))};
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

    var thx = row('Thanksgiving', '11/26/26');
    add('E1', 'Thanksgiving, in Post (a Weeks phase), has no Enable box (an empty cell), and keeps its data-hid and both note boxes',
      thx && !thx.box && thx.dash && thx.hid === 'thanksgiving@2026' && thx.notes === 2, thx, 'no box (empty cell), its hid, two note boxes');

    var sat = row('Independence Day', '7/4/26'), lab = row('Labor Day', '9/7/26');
    add('E2', 'Sat 7/4/26 (a weekend in the shoot) has no box; Labor Day (a weekday in the shoot) has one, ticked',
      sat && !sat.box && sat.dash && lab && lab.box && lab.on === true, {sat: sat, labor: lab}, 'weekend dash; Labor Day ticked box');

    var obs = row('Independence Day (Observed)', '7/3/26');
    add('E3', 'Fri 7/3/26, marked Work this day, keeps its box and reads "Marked Working Day", not "Costs a shoot day"; Labor Day costs a day and has no such tag',
      obs && obs.box && obs.worked && !obs.costs && lab && lab.costs && !lab.worked, {observed: obs, labor: lab}, 'tag on 7/3 only');

    // Each row's heading: the nearest .hv-grp above it.
    function headOf(hid){
      var el = [].find.call(document.querySelectorAll('#holiday-vis-list .hv-row'), function (r) { return r.getAttribute('data-hid') === hid; });
      for (var p = el && el.previousElementSibling; p; p = p.previousElementSibling) if (p.classList.contains('hv-grp')) return txt(p.querySelector('.hv-grp-name'));
      return null;
    }
    var names = heads().map(function (x) { return x.name; });
    var g1 = {heads: names, obs: headOf('independence-day-observed@2026'), labor: headOf('labor-day@2026'),
              laborDate: lab && lab.date, obsDate: obs && obs.date};
    add('G1', 'exactly two headings, Production then Notes only; 7/3 and Labor Day are under Production with no phase word on their date lines',
      JSON.stringify(names) === JSON.stringify(['Production', 'Notes only']) && g1.obs === 'Production' && g1.labor === 'Production'
        && !/·/.test(g1.laborDate || '') && !/·/.test(g1.obsDate || ''), g1, 'Production, Notes only');

    var xmas = row('Christmas Day', '12/25/26');
    var g2 = {xmas: xmas && xmas.date, xmasHead: headOf('christmas-day@2026'), thx: thx && thx.date, thxHead: headOf('thanksgiving@2026'),
              sat: sat && sat.date, satHead: headOf('independence-day@2026'),
              also: /also/.test(txt(document.getElementById('holiday-vis-list')))};
    add('G2', 'Notes only rows carry one phase word: Christmas "· Hiatus", Thanksgiving "· Post", Sat 7/4 "· Production"; no "also" anywhere',
      g2.xmasHead === 'Notes only' && /· Hiatus$/.test(g2.xmas || '') && g2.thxHead === 'Notes only' && /· Post$/.test(g2.thx || '')
        && g2.satHead === 'Notes only' && /· Production$/.test(g2.sat || '') && !g2.also, g2, 'one word each, no also');

    // T1: Toggle all: Enable. The fixture holds notes, so the recompute question may come: Continue.
    var before = rowsOf();
    var boxed = before.filter(function (r) { return r.box; }).map(function (r) { return r.hid; });
    document.querySelector('#holiday-vis .hv-bulk[data-view="enabled"]').click();
    for (var i = 0; i < 20; i++) { await T.sleep(100); if (/Recompute/.test(T.modalText())) { T.clickModalButton('Continue'); break; } }
    await settle();
    var after = rowsOf();
    var offNow = after.filter(function (r) { return r.box && r.on === false; }).map(function (r) { return r.hid; });
    var grew = after.filter(function (r) { return r.box && boxed.indexOf(r.hid) === -1; }).map(function (r) { return r.hid; });
    add('T1', 'Toggle all: Enable switches off exactly the boxed rows, and no dashed row grows a box',
      boxed.length >= 2 && JSON.stringify(offNow.slice().sort()) === JSON.stringify(boxed.slice().sort()) && grew.length === 0,
      {boxed: boxed, offNow: offNow, grew: grew}, 'off = the boxed ones; none grew');

    // O1: a file that has Thanksgiving switched off (made by an older build, or before the shoot moved) keeps its box.
    await T.reloadWith(function (snap) { snap.holidayOff = {'thanksgiving@2026': true}; }, 'holidayenable-off');
    await settle();
    var thxOff = row('Thanksgiving', '11/26/26'), dayAfter = row('Day After Thanksgiving', '11/27/26');
    add('O1', 'Thanksgiving saved OFF keeps its box, unticked (the way back on), while the Day After Thanksgiving next to it, on, has none',
      thxOff && thxOff.box && thxOff.on === false && dayAfter && !dayAfter.box, {thanksgiving: thxOff, dayAfter: dayAfter}, 'box unticked; neighbour dash');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'holidayenable', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
