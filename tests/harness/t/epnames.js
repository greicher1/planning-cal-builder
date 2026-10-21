// epnames -- an episode's DEFAULT NAME is its month-bar text (owner, 20 Oct 2026, by picker; episodeNamesLegacy,
// unitBarLabel). A new calendar names its episodes "Shoot Ep. 201", "Shoot Ep. 202"..., and an episode's bar reads
// its name AS TYPED, so a rename in the episode list is the one control. Replaced v1.6.0's separate prefix (the day
// menu's Prefix…, retired the same evening, and its leg barprefix). Rulings: Prefix… removed; a typed name is the
// bar's text; old files keep "Episode 201" ("Leave them as saved"), read off the names they store; prep pills and
// episode LISTS keep the number ("Prep 201", "Ep. 201, 202"). A switch day's one-day HALF bar keeps the short form
// (16 Oct ruling). A v1.6.0 file's own barPrefix still draws as v1.6.0 drew it until that episode is renamed.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays ./run.sh epnames 300     (an Episodes calendar)
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=blocks   ./run.sh epnames 300     (a Blocks calendar)
//
// halfdays (the mvmenu leg's calendar, saved by an older build): a shoot from Mon 6/29/26, Episode 201 at 5 days and
// the rest at 4.5, so switch days carry half bars. Wed 8 Jul 2026 is shoot day 7, on Episode 202's bar.
//
// CASES, halfdays
//   N0  the old file as saved: every full bar reads its stored name ("Episode 20N"), a one-day half bar "Ep. 20N";
//       no grey text carries "Shoot" or "Episode"; the episode list holds "Episode 201".."Episode 210"
//   N1  the day menu on Episode 202's bar offers no Prefix…, carries no id, and its header names "Ep. 202"
//   N2  renaming Episode 202 to "Pilot" in the list: every bar of it, half bars included, reads "Pilot", every other
//       bar is unchanged; Save writes name "Pilot", nameEdited, and no barPrefix anywhere
//   N3  an old file keeps its style: an 11th episode is "Episode 211", and its bars read that
//   N4  a calendar whose episodes this build named (the file with no stored episodes): the list holds "Shoot Ep. 201"..
//       "Shoot Ep. 210", every full bar its name, a half bar "Ep. 20N"; Save writes those names, not renamed; an 11th
//       episode is "Shoot Ep. 211"
//   N5  restore unconditionally: N4's file, then the old file, then N4's file again -- each shows its own names, and
//       an episode added after the old file is "Episode 211" (never the previous calendar's style)
//   N6  a v1.6.0 file's own prefixes: "Pickup" on Episode 202 reads "Pickup Ep. 202", "" on Episode 203 reads
//       "Ep. 203", the rest their names; Save keeps both; renaming Episode 202 drops its prefix (and only its)
//   N7  prefixes no build writes (a number, 40 characters) are dropped by the validator: the bars read the names
//   N8  the month PDF the app writes from N4 with Episode 202 renamed "Pilot"; gate.sh reads "Shoot Ep. 201" and
//       "Pilot" in it, and neither "Shoot Ep. 202" nor "Episode"
// CASES, blocks
//   B0  block bars read "Block N"; no "Shoot" and no "Episode" on any bar
//   B1  the day menu on Block 1's bar offers no Prefix…
//   B2  labelled by Episode, every bar reads its episode list ("Ep. 201, 202"), with no "Shoot" (lists unchanged)
//   B3  a v1.6.0 block prefix ("2nd Unit" on Block 1) still reads "2nd Unit Block 1", and Save keeps it
//   E0  no console errors but N7's one validator warning
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'epnames'};
  var st = (/[?&]state=([\w.-]+)/.exec(location.search) || [])[1] || '';
  out.run = st;
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var $ = function (id) { return document.getElementById(id); };
  var warns = [];
  var cw = console.warn; console.warn = function () { warns.push([].join.call(arguments, ' ')); return cw.apply(console, arguments); };
  async function settle(){
    var last = -1, n0 = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      n0 = (n === last && n > 0) ? n0 + 1 : 0; last = n; return n0 >= 4;
    }, 'the grid to settle', 150, 100);
  }
  // The unsaved-work guard, when a Load raises it, is the app's own dialog.
  var guard = setInterval(function () {
    var b = [].find.call(document.querySelectorAll('button'), function (x) { return txt(x) === 'Load' && x.offsetParent !== null; });
    if (b) b.click();
  }, 50);
  var seq = 0, writes = [];
  async function openText(text){
    seq++;
    await T.openViaFakePicker(null, 'epnames-' + seq + '.sptcal', {text: text, writes: writes});
    await T.sleep(300); await settle();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'month grid ' + seq, 150, 100);
    await settle();
  }
  async function save(){
    var b = $('save-file-btn'), n = writes.length;
    await T.until(function () { return !b.disabled && !b.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
    b.click();
    await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
    await T.sleep(200);
    return writes[writes.length - 1].text;
  }
  async function toMonth(label){
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if(my === label) return settle();
      var btn = $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // Every Production bar of every month: its bar text (the first text node), its grey text, and whether it is
  // a one-day half bar (halfInset's margin on a one-column pill).
  async function allBars(){
    var res = [];
    for(var g = 0; g < 60; g++){ var p = $('mv-prev'); if(!p || p.disabled) break; p.click(); await T.sleep(120); }
    await settle();
    for(g = 0; g < 60; g++){
      [].forEach.call(document.querySelectorAll('#table-wrap .mv-pill[data-ph="production"]'), function (el) {
        var one = (+el.style.gridColumnEnd) - (+el.style.gridColumnStart) === 1;
        var half = /margin-(left|right):\s*calc/.test(el.getAttribute('style') || '');
        res.push({bar: ((el.firstChild && el.firstChild.nodeType === 3) ? el.firstChild.nodeValue : '').trim(),
                  grey: txt(el.querySelector('.mv-pill-block')), halfOne: one && half});
      });
      var n = $('mv-next'); if(!n || n.disabled) break; n.click(); await T.sleep(120);
    }
    await settle();
    return res;
  }
  function cellOf(iso){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear')), m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var hit = null;
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-body > .mv-week'), function (wk) {
      var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      var k = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(k < 0) return;
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), +txt(cells[k].querySelector('.mv-daynum'))) - k * 86400000;
      [].forEach.call(cells, function (c, i) { if(new Date(sunday + i * 86400000).toISOString().slice(0, 10) === iso) hit = {cell: c, week: wk, col: i}; });
    });
    return hit;
  }
  async function barPoint(iso){
    var m = cellOf(iso);
    if(!m) throw new Error('no cell for ' + iso);
    m.cell.scrollIntoView({block: 'center'}); await T.sleep(250);
    m = cellOf(iso);
    var pill = [].find.call(m.week.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
      return +p.style.gridColumnStart - 1 <= m.col && +p.style.gridColumnEnd - 2 >= m.col;
    });
    if(!pill) throw new Error('no Production bar on ' + iso);
    var c = m.cell.getBoundingClientRect(), r = pill.getBoundingClientRect();
    return {x: Math.round(c.left + c.width / 2), y: Math.round(r.top + r.height / 2)};
  }
  // ⛔ HIT-TESTED, as mvmenu's: the event goes to whatever is on top at the point.
  async function rclickBar(iso){
    var p = await barPoint(iso), el = document.elementFromPoint(p.x, p.y);
    var base = {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 2, buttons: 2};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('contextmenu', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    await T.sleep(150);
    return el;
  }
  function menu(){ return document.querySelector('.day-menu'); }
  function menuIds(){ var m = menu(); return m ? [].map.call(m.querySelectorAll('.day-menu-item'), function (b) { return b.getAttribute('data-item'); }) : []; }
  function key(k){ (document.activeElement || document).dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); }
  // The episode list's names, in its own (shooting) order, and a rename typed into one of them.
  function listNames(){ return [].map.call(document.querySelectorAll('#episode-rows .ep-name'), function (i) { return i.value; }); }
  async function rename(from, to){
    var inp = [].find.call(document.querySelectorAll('#episode-rows .ep-name'), function (i) { return i.value === from; });
    if(!inp) throw new Error('no episode named ' + from + ' (' + listNames().join(', ') + ')');
    inp.value = to; inp.dispatchEvent(new Event('input', {bubbles: true}));
    await settle(); await T.sleep(700);   // past the 500 ms undo debounce
  }
  async function setCount(n){ T.set('num-episodes', String(n)); await settle(); await T.sleep(700); }
  function names(text){ return (JSON.parse(text).episodeDefs || []).map(function (d) { return d.name; }); }
  function full(bars){ return bars.filter(function (b) { return !b.halfOne; }); }
  function halves(bars){ return bars.filter(function (b) { return b.halfOne; }); }
  function bad(list, re){ return list.filter(function (b) { return !re.test(b.bar); }).map(function (b) { return b.bar; }).slice(0, 4); }
  var EPISODE = /^Episode 2(0[1-9]|10)$/, SHOOT = /^Shoot Ep\. 2(0[1-9]|10)$/, SHORT = /^Ep\. 2(0[1-9]|10)$/;

  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); }, 'restored', 200, 100);
    await settle();
    var fixture = await (await fetch('/tests/fixtures/' + st + '.sptcal', {cache: 'no-store'})).text();
    function asMonth(text, edit){ var o = JSON.parse(text); o.viewMode = 'month'; if(edit) edit(o); return JSON.stringify(o); }

    if(st === 'halfdays'){
      // ---- N0 ----
      await openText(asMonth(fixture));
      var b0 = await allBars();
      var list0 = listNames();
      add('N0', 'An old file as saved: every full bar its stored "Episode N", a one-day half bar "Ep. N"; no grey text says Shoot or Episode; the list holds "Episode 201".."Episode 210"',
        full(b0).length > 0 && bad(full(b0), EPISODE).length === 0 && halves(b0).length > 0 && bad(halves(b0), SHORT).length === 0 &&
        b0.every(function (b) { return !/Shoot|Episode/.test(b.grey); }) && list0.length === 10 && list0.every(function (n) { return EPISODE.test(n); }),
        {full: full(b0).length, halves: halves(b0).length, badFull: bad(full(b0), EPISODE), badHalf: bad(halves(b0), SHORT), list: list0});

      // ---- N1 ----
      await toMonth('July 2026');
      await rclickBar('2026-07-08');
      var ids1 = menuIds(), hdr = txt(menu() && menu().querySelector('.day-menu-ctx')), idCount = menu() ? menu().querySelectorAll('[id]').length : -1;
      add('N1', 'The day menu on Episode 202\'s bar: no Prefix…, no id, and its header names "Ep. 202"',
        !!menu() && ids1.length > 0 && !ids1.some(function (x) { return /^bar-prefix/.test(x || ''); }) && idCount === 0 && /Ep\. 202/.test(hdr),
        {items: ids1, ids: idCount, header: hdr});
      key('Escape'); await T.sleep(150);

      // ---- N2 ----
      var n202 = b0.filter(function (b) { return /^(Episode|Ep\.) 202$/.test(b.bar); }).length;
      await rename('Episode 202', 'Pilot');
      var b2 = await allBars();
      var pilot = b2.filter(function (b) { return b.bar === 'Pilot'; });
      var rest = b2.filter(function (b) { return b.bar !== 'Pilot'; });
      var s2 = await save(), d2 = JSON.parse(s2).episodeDefs, i202 = d2.findIndex(function (d) { return d.name === 'Pilot'; });
      add('N2', 'Renamed "Pilot": every bar of it (half bars too) reads "Pilot", the others are unchanged; Save writes the name, nameEdited, and no barPrefix',
        n202 > 0 && pilot.length === n202 && bad(full(rest), EPISODE).length === 0 && bad(halves(rest), SHORT).length === 0 &&
        i202 === 1 && d2[i202].nameEdited === true && d2.every(function (d) { return !('barPrefix' in d); }),
        {before: n202, pilot: pilot.length, badRest: bad(full(rest), EPISODE), saved: d2[i202]});

      // ---- N3 ----
      await openText(asMonth(fixture));
      await setCount(11);
      var list3 = listNames(), b3 = await allBars();
      add('N3', 'An old file keeps its style: an 11th episode is "Episode 211", and its bars read that',
        list3.length === 11 && list3.indexOf('Episode 211') >= 0 && b3.some(function (b) { return b.bar === 'Episode 211'; }),
        {list: list3.slice(-3), bars211: b3.filter(function (b) { return /211/.test(b.bar); }).map(function (b) { return b.bar; }).slice(0, 3)});

      // ---- N4 ----
      var fresh = asMonth(fixture, function (o) { o.episodeDefs = []; o.episodeCounter = 0; });
      await openText(fresh);
      var b4 = await allBars(), list4 = listNames();
      var s4 = await save(), d4 = JSON.parse(s4).episodeDefs;
      await setCount(11);
      var list4b = listNames();
      add('N4', 'Episodes this build named: the list holds "Shoot Ep. 201".."Shoot Ep. 210", every full bar its name, a half bar "Ep. N"; Save writes those names unrenamed; an 11th is "Shoot Ep. 211"',
        list4.length === 10 && list4.every(function (n) { return SHOOT.test(n); }) && full(b4).length > 0 && bad(full(b4), SHOOT).length === 0 &&
        bad(halves(b4), SHORT).length === 0 && d4.length === 10 && d4.every(function (d) { return SHOOT.test(d.name) && !d.nameEdited && !('barPrefix' in d); }) &&
        list4b.indexOf('Shoot Ep. 211') >= 0,
        {list: list4, badFull: bad(full(b4), SHOOT), halves: halves(b4).length, badHalf: bad(halves(b4), SHORT), added: list4b.slice(-2)});

      // ---- N5 ----
      await openText(asMonth(s4));
      var l5a = listNames(), b5a = full(await allBars());
      await openText(asMonth(fixture));
      var l5b = listNames(), b5b = full(await allBars());
      await setCount(11);
      var l5c = listNames();
      await openText(asMonth(s4));
      var l5d = listNames(), b5d = full(await allBars());
      add('N5', 'Each Load shows its own file\'s names (new, old, new), and an episode added to the old file is "Episode 211"',
        l5a.every(function (n) { return SHOOT.test(n); }) && bad(b5a, SHOOT).length === 0 &&
        l5b.every(function (n) { return EPISODE.test(n); }) && bad(b5b, EPISODE).length === 0 && l5c.indexOf('Episode 211') >= 0 &&
        l5d.length === 10 && l5d.every(function (n) { return SHOOT.test(n); }) && bad(b5d, SHOOT).length === 0,
        {first: l5a.slice(0, 2), old: l5b.slice(0, 2), added: l5c.slice(-1), again: l5d.slice(0, 2)});

      // ---- N6 ----
      var v160 = asMonth(fixture, function (o) { o.episodeDefs[1].barPrefix = 'Pickup'; o.episodeDefs[2].barPrefix = ''; });
      await openText(v160);
      var b6 = full(await allBars());
      var pick = b6.filter(function (b) { return /202$/.test(b.bar); }), none = b6.filter(function (b) { return /203$/.test(b.bar); });
      var others6 = b6.filter(function (b) { return !/20[23]$/.test(b.bar); });
      var s6 = await save(), d6 = JSON.parse(s6).episodeDefs;
      await rename('Episode 202', 'Pickup Day');
      var b6b = full(await allBars()), s6b = await save(), d6b = JSON.parse(s6b).episodeDefs;
      add('N6', 'A v1.6.0 prefix draws as v1.6.0 drew it ("Pickup Ep. 202", "" -> "Ep. 203"), Save keeps both, and renaming Episode 202 drops only its prefix',
        pick.length > 0 && pick.every(function (b) { return b.bar === 'Pickup Ep. 202'; }) && none.length > 0 && none.every(function (b) { return b.bar === 'Ep. 203'; }) &&
        bad(others6, EPISODE).length === 0 && d6[1].barPrefix === 'Pickup' && d6[2].barPrefix === '' &&
        b6b.some(function (b) { return b.bar === 'Pickup Day'; }) && !b6b.some(function (b) { return /Pickup Ep/.test(b.bar); }) &&
        !('barPrefix' in d6b[1]) && d6b[2].barPrefix === '' && d6b[1].name === 'Pickup Day',
        {pick: pick.map(function (b) { return b.bar; }).slice(0, 2), none: none.map(function (b) { return b.bar; }).slice(0, 2), saved: [d6[1].barPrefix, d6[2].barPrefix],
         renamed: d6b[1], kept: d6b[2].barPrefix});

      // ---- N7 ----
      warns.length = 0;
      await openText(asMonth(fixture, function (o) { o.episodeDefs[0].barPrefix = 5; o.episodeDefs[1].barPrefix = new Array(41).join('x'); }));
      var b7 = full(await allBars());
      add('N7', 'Prefixes no build writes (a number, 40 characters) are dropped by the validator, and the bars read the names',
        b7.length > 0 && bad(b7, EPISODE).length === 0 && warns.some(function (w) { return /2 value\(s\)/.test(w); }),
        {bad: bad(b7, EPISODE), warns: warns.slice(0, 2)});

      // ---- N8 ----
      await openText(asMonth(s4));
      await rename('Shoot Ep. 202', 'Pilot');
      var spk = T.fakeSavePicker();
      await T.sleep(500);
      $('export-btn').click();
      try { await T.until(function () { return spk.files.length > 0; }, 'the month PDF written', 300, 100); } catch (e) {}
      spk.restore();
      var f = spk.files[0];
      if(f && f.bytes) out.pdf = T.b64(f.bytes.buffer);
      add('N8', 'Export PDF writes the month PDF (gate.sh reads its text)', !!(f && f.bytes && f.bytes.length > 10000), {bytes: f && f.bytes ? f.bytes.length : 0});
    }

    if(st === 'blocks'){
      // ---- B0 ----
      await openText(asMonth(fixture));
      var c0 = await allBars();
      add('B0', 'A Blocks calendar: every block bar "Block N", and no "Shoot" or "Episode" on any bar',
        c0.length > 0 && c0.every(function (b) { return /^Block \d+$/.test(b.bar) && !/Shoot|Episode/.test(b.grey); }),
        {bad: bad(c0, /^Block \d+$/)});
      // ---- B1 ----
      await toMonth('July 2026');
      await rclickBar('2026-06-30');
      var ids = menuIds();
      add('B1', 'The day menu on Block 1\'s bar offers no Prefix…', !!menu() && ids.length > 0 && !ids.some(function (x) { return /^bar-prefix/.test(x || ''); }), {items: ids});
      key('Escape'); await T.sleep(150);
      // ---- B2 ----
      await openText(asMonth(fixture, function (o) { o.mvProdLabel = 'episode'; }));
      var c2 = full(await allBars());
      add('B2', 'Labelled by Episode: every bar reads its episode list ("Ep. 201, 202"), with no "Shoot"',
        c2.length > 0 && bad(c2, /^Ep\. \d/).length === 0 && !c2.some(function (b) { return /Shoot/.test(b.bar); }),
        {bars: c2.map(function (b) { return b.bar; }).slice(0, 4), bad: bad(c2, /^Ep\. \d/)});
      // ---- B3 ----
      await openText(asMonth(fixture, function (o) { o.blockDefs[0].barPrefix = '2nd Unit'; }));
      var c3 = await allBars(), sB = await save();
      add('B3', 'A v1.6.0 block prefix still reads "2nd Unit Block 1", the other blocks bare, and Save keeps it',
        c3.filter(function (b) { return /Block 1$/.test(b.bar); }).every(function (b) { return b.bar === '2nd Unit Block 1'; }) &&
        c3.some(function (b) { return b.bar === '2nd Unit Block 1'; }) &&
        c3.filter(function (b) { return !/Block 1$/.test(b.bar); }).every(function (b) { return /^Block \d+$/.test(b.bar); }) &&
        JSON.parse(sB).blockDefs[0].barPrefix === '2nd Unit',
        {bars: c3.map(function (b) { return b.bar; }).slice(0, 3), saved: JSON.parse(sB).blockDefs[0].barPrefix});
    }

    // N7's validator warning is on purpose, once; anything else is a failure.
    var all = (window.__ERR || []).slice(), mine = all.filter(function (x) { return /value\(s\) in this calendar were not in a form/.test(String(x)); });
    var errs = all.filter(function (x) { return mine.indexOf(x) < 0; });
    add('E0', 'No console errors but N7\'s one validator warning', errs.length === 0 && mine.length === (st === 'halfdays' ? 1 : 0), {errors: errs.slice(0, 5), validator: mine.length}, []);
  } catch (e) {
    out.EX = String(e && e.stack || e);
    add('EX', 'the leg ran to the end', false, out.EX.slice(0, 400), 'no exception');
  }
  clearInterval(guard);
  out.cases = cases;
  T.done(out);
})(); });
