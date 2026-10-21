// halfdays -- an episode's or block's day count may end in .5, and the switch day carries BOTH units.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh halfdays 150
//
// Owner, 15 Oct 2026: "Half days means instances where we would switch to the next episode or block half
// way thru a day. So we need to be able to type in half days for number of days per episode or block.
// Then those episodes/blocks overlap on the month view calendar. We don't need a function to mark random
// days as half days." Rulings, same day (picked from mock-ups): "Stacked bars, always" -- Production is
// drawn as one bar per episode (per block in Blocks mode), and a switch day carries both bars, one above
// the other -- and "Keep them as they are" for half-day MARKS already saved (the halfworked leg).
// ⭐ REVISED 16 Oct 2026 (HALF-SQUARE-BARS-PLAN.md, the owner's own idea, a frozen edit approved by picker):
// the switch day's two bars no longer stack. They share ONE lane and meet half way through the day's square,
// the earlier ending there and the later starting there. D2, D2i, D7m and D10m hold that.
//
// Starts from the reference calendar T.buildFixture() types in (10 x 8 days from Mon 6/29/26, US
// General, so Fri 7/3 is a union holiday). With 4.5 days per episode the shoot days of July are
//   index 0-3  6/29-7/2      index 4-8  7/6-7/10     index 9-13 7/13-7/17
//   index 14-18 7/20-7/24    index 19-22 7/27-7/30   (7/31 is index 23)
// and the episodes sit on [0,4.5) [4.5,9) [9,13.5) [13.5,18) [18,22.5) [22.5,27) ... so the SWITCH DAYS
// (a boundary at .5) are index 4, 13 and 22 = Mon 7/6, Fri 7/17 and Thu 7/30. A whole boundary (9, 18)
// is no switch day: 7/10 is 202's alone and 7/13 is 203's alone. Those dates are written here as
// constants, worked out by hand from the union calendar, not read back from the app.
//
// At the end the calendar is left at 4.5 days per episode with one episode at 5 (an odd half total) and
// its snapshot is returned as `fixture` -- how tests/fixtures/halfdays.sptcal was cut, from the running
// app, not written by hand.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'halfdays'};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function meta(){ return txt(document.getElementById('meta-production')); }
  function total(){ return txt(document.querySelector('.ptr-value')); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
  }
  // A control with no id (the episode and block day boxes): the prototype setter, then the events a
  // keystroke fires -- what T.set() does by id.
  function setEl(el, v){
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    d.set.call(el, v);
    ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, {bubbles: true})); });
  }
  function epBox(n){
    return [].find.call(document.querySelectorAll('#episode-rows .episode-row'), function (r) {
      return (r.querySelector('.ep-name') || {}).value === 'Episode ' + n;
    }).querySelector('.ep-days');
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    return JSON.parse(JSON.stringify(got.state));
  }
  async function toMonth(label){
    if(!document.querySelector('#table-wrap .mv-daygrid')){ document.getElementById('view-month-btn').click(); await settle(); }
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if(my === label) return settle();
      var btn = document.getElementById(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(200);
    }
    throw new Error('never reached ' + label);
  }
  // Production's bars in the month on screen, as {iso: [[label, grey, lane, inset], ...] top to bottom, then in
  // placement order}. A bar's days come from its own grid-column, and its week row's Sunday from the row's day cells.
  // `inset` is the half-day inset renderMonthView writes on a switch day (HALF-SQUARE-BARS-PLAN.md, 16 Oct 2026):
  // 'R' for a bar that stops half way through its last day (margin-right), 'L' for one that starts half way
  // through its first (margin-left), '' for neither.
  function prodByDay(){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var out = {};
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-week'), function (wk) {
      var cells = wk.querySelectorAll('.mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(inIdx < 0) return;
      var d = +txt(cells[inIdx].querySelector('.mv-daynum'));
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), d) - inIdx * 86400000;
      [].forEach.call(wk.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        var st = p.getAttribute('style') || '';
        var gc = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(st), gr = /grid-row:\s*(\d+)/.exec(st);
        var sp = p.querySelector('.mv-pill-block');
        var label = (p.firstChild && p.firstChild.nodeType === 3 ? p.firstChild.textContent : p.textContent).trim();
        for(var c = +gc[1] - 1; c < +gc[2] - 1; c++){
          var iso = new Date(sunday + c * 86400000).toISOString().slice(0, 10);
          var inset = (/margin-left:\s*calc\(/.test(st) ? 'L' : '') + (/margin-right:\s*calc\(/.test(st) ? 'R' : '');
          // [0] is the episode as the checks below name it, WITHOUT the "Shoot " a full bar carries by default
          // (owner, 20 Oct 2026; first ruled 16 Oct); [4] is the bar's own text and [5] its width in days, for D2s,
          // which holds that rule. barprefix holds the rest (each unit's own prefix, set from its bar).
          (out[iso] = out[iso] || []).push([label.replace(/^Shoot /, ''), sp ? sp.textContent : '', +(gr ? gr[1] : 0), inset,
            label, +gc[2] - +gc[1]]);
        }
      });
    });
    Object.keys(out).forEach(function (k) { out[k].sort(function (a, b) { return a[2] - b[2]; }); });
    return out;
  }
  function labelsOn(map, iso){ return (map[iso] || []).map(function (x) { return x[0]; }); }
  // A switch day's two bars, measured: the same lane, the earlier inset on the right and the later on the left,
  // and the gap between them straddling the middle of the day's TRACK in .mv-bars' own grid (its 3 px padding a
  // side makes a track narrower than a day cell). {ok, why, ...}.
  function switchGeom(iso){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var found = null;
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-week'), function (wk) {
      var cells = wk.querySelectorAll('.mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(inIdx < 0) return;
      var d = +txt(cells[inIdx].querySelector('.mv-daynum'));
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), d) - inIdx * 86400000;
      var col = Math.round((Date.parse(iso + 'T00:00:00Z') - sunday) / 86400000);
      if(col < 0 || col > 6) return;
      var bars = wk.querySelector('.mv-bars'), br = bars.getBoundingClientRect(), cs = getComputedStyle(bars);
      var pl = parseFloat(cs.paddingLeft), tw = (br.width - pl - parseFloat(cs.paddingRight)) / 7;
      var mid = br.left + pl + (col + 0.5) * tw;
      var ps = [].filter.call(wk.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        return +p.style.gridColumnStart - 1 <= col && +p.style.gridColumnEnd - 2 >= col;
      });
      found = {ps: ps, mid: mid};
    });
    if(!found) return {ok: false, why: 'no week row holds ' + iso};
    if(found.ps.length !== 2) return {ok: false, why: found.ps.length + ' bars on ' + iso};
    var a = found.ps[0], b = found.ps[1], ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    var r = {lanes: [a.style.gridRowStart, b.style.gridRowStart], aRight: +ra.right.toFixed(2), bLeft: +rb.left.toFixed(2),
             mid: +found.mid.toFixed(2), aStyle: /margin-right:[^;]*/.exec(a.getAttribute('style') || '') + '',
             bStyle: /margin-left:[^;]*/.exec(b.getAttribute('style') || '') + ''};
    r.ok = r.lanes[0] === r.lanes[1] && /calc\(/.test(r.aStyle) && /calc\(/.test(r.bStyle)
      && !/margin-left/.test(a.getAttribute('style')) && !/margin-right/.test(b.getAttribute('style'))
      && Math.abs((rb.left - ra.right) - 2) < 0.6 && Math.abs((ra.right + rb.left) / 2 - found.mid) < 0.6;
    return r;
  }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }

  try {
    await T.appReady();
    T.buildFixture();
    await settle();
    await T.until(function () { return /80 shoot days/.test(meta()); }, 'the reference calendar', 200, 100);
    var meta80 = meta();

    // ---- D1: 4.5 days per episode ----
    T.set('shoot-days-per-ep', '4.5');
    await settle();
    var boxes = [].map.call(document.querySelectorAll('#episode-rows .ep-days'), function (b) { return b.value; });
    add('D1', 'Shooting Days per Episode takes 4.5: all ten episode boxes read 4.5, Production is 45 shoot days',
      boxes.length === 10 && boxes.every(function (v) { return v === '4.5'; }) && /^45 shoot days/.test(meta())
        && /^45(?![\d.])/.test(total()) && !document.getElementById('shoot-days-per-ep').classList.contains('is-invalid'),
      {boxes: boxes, meta: meta(), total: total()}, '10 x "4.5", 45 shoot days');
    var s1 = await snap();
    add('D1s', 'saved as numbers that read back as halves: fields.byId["shoot-days-per-ep"] = "4.5", every episode day count 4.5',
      s1.fields && s1.fields.byId && String((s1.fields.byId['shoot-days-per-ep'] || {}).value) === '4.5'
        && (s1.episodeDefs || []).length === 10 && s1.episodeDefs.every(function (e) { return parseFloat(e.days) === 4.5; }),
      {perEp: s1.fields && s1.fields.byId && (s1.fields.byId['shoot-days-per-ep'] || {}).value, days: (s1.episodeDefs || []).map(function (e) { return e.days; })}, '4.5');

    // ---- D2: the month view -- one bar per episode; a switch day's two MEET HALF WAY THROUGH ITS SQUARE ----
    // ⚠️ REVISED 16 Oct 2026 (HALF-SQUARE-BARS-PLAN.md; the owner's idea, a frozen edit approved by picker). Until
    // then the two bars stacked, one lane each ("Stacked bars, always"). Now they share ONE lane: the earlier
    // episode's bar stops half way through the day (margin-right), the later one's starts there (margin-left).
    await toMonth('July 2026');
    var jul = prodByDay();
    out.july = jul;
    var geo = {'07-06': switchGeom('2026-07-06'), '07-17': switchGeom('2026-07-17'), '07-30': switchGeom('2026-07-30')};
    out.switchGeom = geo;
    add('D2', '⭐ Mon 7/6, Fri 7/17 and Thu 7/30 each carry TWO bars in ONE lane, the earlier ending and the later starting half way through the square: 201|202, 203|204, 205|206',
      eq(labelsOn(jul, '2026-07-06'), ['Ep. 201', 'Ep. 202']) && eq(labelsOn(jul, '2026-07-17'), ['Ep. 203', 'Ep. 204'])
        && eq(labelsOn(jul, '2026-07-30'), ['Ep. 205', 'Ep. 206'])
        && ['2026-07-06', '2026-07-17', '2026-07-30'].every(function (k) {
             return jul[k][0][2] === jul[k][1][2] && jul[k][0][3] === 'R' && jul[k][1][3] === 'L';
           })
        && geo['07-06'].ok && geo['07-17'].ok && geo['07-30'].ok,
      {'07-06': jul['2026-07-06'], '07-17': jul['2026-07-17'], '07-30': jul['2026-07-30'], geometry: geo},
      'one lane; the earlier inset right, the later left, 2 px apart either side of the day\'s middle');
    var insets = [].filter.call(document.querySelectorAll('#table-wrap .mv-bar'), function (b) { return /margin-(left|right):/.test(b.getAttribute('style') || ''); }).length;
    add('D2i', 'only those six bars carry an inset: no whole boundary, week edge, other phase or note has one',
      insets === 6, insets, 6);
    // "Shoot" (owner, 20 Oct 2026, by picker: "Yes, every calendar"; first asked 16 Oct, "Can it say 'Shoot' before
    // Ep. 101"). Every bar reads "Shoot Ep. N" except a switch day's ONE-DAY half bar, which keeps "Ep. N" (the 16 Oct
    // ruling: "Shoot Ep. 202" needs about 68 px, and both month PDFs give that bar 50 px). At 4.5 days each (D2's
    // state) July's two are 201 on Mon 7/6 (it ends there at lunch) and 204 on Fri 7/17 (it starts there at lunch);
    // 7/30's switch gives 205 Mon-Thu and 206 Thu-Fri, both wider than a day.
    var shootBad = [], halfOnes = [];
    Object.keys(jul).sort().forEach(function (k) { jul[k].forEach(function (x) {
      if(!/^Ep\. /.test(x[0])) return;
      var halfOne = x[5] === 1 && x[3] !== '';
      if(halfOne) halfOnes.push(k.slice(5) + ' ' + x[4]);
      var want = halfOne ? x[0] : 'Shoot ' + x[0];
      if(x[4] !== want) shootBad.push(k + ': ' + x[4] + ' (want ' + want + ')');
    }); });
    add('D2s', '"Shoot": every July bar reads "Shoot Ep. N", except a switch day\'s one-day half bar, which keeps "Ep. N" (201 on 7/6, 204 on 7/17)',
      !shootBad.length && eq(halfOnes, ['07-06 Ep. 201', '07-17 Ep. 204']),
      {bad: shootBad.slice(0, 6), halfOneDay: halfOnes}, {bad: [], halfOneDay: ['07-06 Ep. 201', '07-17 Ep. 204']});
    var singles = {'2026-06-29': 'Ep. 201', '2026-07-02': 'Ep. 201', '2026-07-07': 'Ep. 202', '2026-07-10': 'Ep. 202',
                   '2026-07-13': 'Ep. 203', '2026-07-16': 'Ep. 203', '2026-07-20': 'Ep. 204', '2026-07-23': 'Ep. 204',
                   '2026-07-24': 'Ep. 205', '2026-07-29': 'Ep. 205', '2026-07-31': 'Ep. 206'};
    var badSingles = Object.keys(singles).filter(function (k) { return !eq(labelsOn(jul, k), [singles[k]]); });
    add('D3', 'every other shoot day carries exactly one bar, its own episode -- a WHOLE boundary (7/10 | 7/13, 7/23 | 7/24) is no overlap',
      !badSingles.length, badSingles.map(function (k) { return [k, labelsOn(jul, k)]; }), singles);
    add('D3h', 'the 7/3 union holiday and the weekends carry no Production bar',
      !jul['2026-07-03'] && !jul['2026-07-04'] && !jul['2026-07-05'] && !jul['2026-07-11'],
      {h: jul['2026-07-03'], w: jul['2026-07-04']}, 'none');
    var g13 = (jul['2026-07-13'] || [[]])[0][1], g06 = (jul['2026-07-06'] || [[], []])[1][1], g01 = (jul['2026-07-06'] || [[]])[0][1];
    add('D4', 'an episode bar\'s grey text is its Production Week ("Production Week 3" on 203\'s 7/13-7/17 bar); the one-day piece of 201 on 7/6 has none (ruling 7)',
      g13 === 'Production Week 3' && g06 === 'Production Week 2' && g01 === '',
      {'203 on 7/13': g13, '202 on 7/6': g06, '201 on 7/6': g01}, ['Production Week 3', 'Production Week 2', '']);
    var plain = [].filter.call(document.querySelectorAll('#table-wrap .mv-pill'), function (p) { return /^Episode\b/.test(txt(p)); }).length;
    add('D4e', 'every bar is Production\'s own pill (data-ph="production", draggable): the dormant "Episode N" pill branch stays unreached',
      plain === 0 && document.querySelectorAll('#table-wrap .mv-pill[data-ph="production"]').length > 0, {episodePills: plain}, 0);

    // ---- D5: a switch day is an ordinary shoot day to the day menu ----
    var cell6 = [].find.call(document.querySelectorAll('#table-wrap .mv-daycell:not(.mv-out)'), function (c) { return txt(c.querySelector('.mv-daynum')) === '6'; });
    cell6.scrollIntoView({block: 'center'}); await T.sleep(120);
    var r6 = cell6.getBoundingClientRect();
    var top6 = document.elementFromPoint(Math.round(r6.left + 12), Math.round(r6.top + 9));
    if(!top6 || top6.closest('.mv-daycell') !== cell6) throw new Error('7/6 is not reachable at its number band');
    top6.click(); await T.sleep(250);
    // ⚠️ Since day menu step 4 (MONTH-CONTEXT-MENU-PLAN.md, ruling L1) the click opens the DAY MENU, and the
    // retired Full day/Off popover's rows are its shoot-day section, each keeping its data-ov.
    var menu = document.querySelector('.day-menu');
    var opts = (menu && menu.getAttribute('data-day') === '2026-07-06')
      ? [].map.call(menu.querySelectorAll('[data-section="shoot"] .day-menu-item[data-ov]'), function (b) { return b.getAttribute('data-ov'); }) : null;
    add('D5', 'the switch day\'s menu offers Full day · Off -- no Half day (withdrawn; a half day is the episode\'s .5)',
      eq(opts, ['', 'off']), opts, ['', 'off']);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); await T.sleep(200);

    // ---- D6: Show Episodes off changes NOTHING here ----
    // ⚠️ REVISED 15 Oct 2026 (owner's picker, MONTH-PILL-LABEL-PLAN): a "Show" switch edits the grey
    // text only, and the bars stay split. This build first had Show Episodes off join the bars back into
    // one "Production Week N" bar per run. With no label chosen an Episodes calendar's bar NAMES the
    // episode, so the switch has nothing to take away; the pilllabel leg holds what it does in Week mode.
    var undoBefore = document.getElementById('undo-btn').disabled;
    document.getElementById('pref-mv-episodes').click(); await settle();
    var off = prodByDay();
    add('D6', '"Show Episodes" off: the bars stay split and read exactly as D2 -- 7/6 still carries 201 and 202',
      eq(off, jul) && eq(labelsOn(off, '2026-07-06'), ['Ep. 201', 'Ep. 202']),
      {'07-06': off['2026-07-06'], '07-13': off['2026-07-13']}, 'identical to D2');
    document.getElementById('pref-mv-episodes').click(); await settle();
    add('D6b', 'back on, still exactly D2', eq(prodByDay(), jul), null, 'identical to D2');

    // ---- D7: an odd total -- one episode at 5 makes 45.5, and the shoot runs 46 days ----
    document.getElementById('view-sheet-btn').click(); await settle();
    var b201 = epBox('201');
    setEl(b201, '5');
    await settle();
    add('D7', 'Episode 201 at 5 days: 45.5 shoot days, so 46 days on the floor (the last one ends at lunch)',
      /^45\.5 shoot days/.test(meta()) && /^45\.5(?!\d)/.test(total()) && /\u2192 9\/1\/26$/.test(meta()),
      {meta: meta(), total: total()}, '45.5 shoot days, wrap 9/1/26 (46 shoot days: 7/3 and 9/7 are holidays)');
    var hdr = txt(document.getElementById('table-wrap'));
    add('D7h', 'the header reads "4.5-Day Shooting Schedule"', /4\.5-Day Shooting Schedule/.test(hdr),
      (/[\d.]+-Day Shooting Schedule/.exec(hdr) || [''])[0], '4.5-Day Shooting Schedule');
    // 201 is 5 whole days now, so 202 sits on [5, 9.5): index 9, Mon 7/13, is the new switch day.
    await toMonth('July 2026');
    var jul2 = prodByDay();
    var geo13 = switchGeom('2026-07-13');
    add('D7m', 'and the switch days follow: 7/6 is 201 alone, 7/10 is 202 alone, Mon 7/13 carries 202 and 203 meeting half way, in one lane',
      eq(labelsOn(jul2, '2026-07-06'), ['Ep. 201']) && eq(labelsOn(jul2, '2026-07-10'), ['Ep. 202'])
        && eq(labelsOn(jul2, '2026-07-13'), ['Ep. 202', 'Ep. 203']) && geo13.ok
        && jul2['2026-07-06'][0][3] === '' && jul2['2026-07-10'][0][3] === '',
      {'07-06': jul2['2026-07-06'], '07-10': jul2['2026-07-10'], '07-13': jul2['2026-07-13'], geometry: geo13}, '201 | 202 | 202 meeting 203');

    // ---- D8: a value between halves is flagged and reads down to the half below ----
    document.getElementById('view-sheet-btn').click(); await settle();
    setEl(epBox('201'), '5.3');
    await settle();
    b201 = epBox('201');                       // the list re-renders: never trust an element across an edit
    var row = b201.closest('.episode-row');
    add('D8', '5.3 in an episode box: ringed, "Whole or half days only", and read as 5 (45.5 still)',
      b201.classList.contains('is-invalid') && row.getAttribute('data-whole-err') === 'Whole or half days only' && /^45\.5 shoot days/.test(meta()),
      {cls: b201.className, err: row.getAttribute('data-whole-err'), meta: meta()}, 'is-invalid, 45.5');
    setEl(b201, '5');
    await settle();
    b201 = epBox('201'); row = b201.closest('.episode-row');
    add('D8c', 'back to 5, the ring and the words go', !b201.classList.contains('is-invalid') && !row.hasAttribute('data-whole-err'),
      {cls: b201.className}, 'clean');
    T.set('shoot-days-per-ep', '4.25');
    await settle();
    var per = document.getElementById('shoot-days-per-ep');
    var host = per.closest('.mantine-InputWrapper-root');
    add('D8m', 'Shooting Days per Episode keeps one decimal at most (4.25 -> 4.2) and 4.2 is flagged under the field',
      per.classList.contains('is-invalid') && !!host && host.getAttribute('data-whole-err') === 'Whole or half days only',
      {value: per.value, cls: per.className, err: host && host.getAttribute('data-whole-err')}, 'is-invalid');
    T.set('shoot-days-per-ep', '4.5');
    await settle();

    // ---- D9: restore -- an undo goes back through applyStateSnapshot, which must carry the halves ----
    var before = meta();
    setEl(epBox('203'), '6');
    await settle();
    document.getElementById('undo-btn').click();
    await T.sleep(900); await settle();
    add('D9', 'an edit then one undo (applyStateSnapshot) restores 4.5 exactly: same meta, Episode 203 box reads 4.5',
      meta() === before && epBox('203').value === '4.5', {meta: meta(), before: before, box: epBox('203').value}, before);

    // ---- D10: Blocks mode -- 8.5 days per block, Block 1 and Block 2 share Fri 7/10 ----
    T.set('show-mode', 'blocks'); T.set('num-blocks', '5'); T.set('days-per-block', '8.5');
    await settle();
    add('D10', 'Blocks mode with 8.5 days per block: 42.5 shoot days', /^42\.5 shoot days/.test(meta()), meta(), '42.5 shoot days');
    await toMonth('July 2026');
    var blk = prodByDay();
    // Blocks of 8.5: [0,8.5) [8.5,17) [17,25.5) -> switch days index 8 (Fri 7/10) and 25 (in August).
    var geo10 = switchGeom('2026-07-10');
    add('D10m', '⭐ Fri 7/10 carries Block 1 and Block 2 meeting half way through the square, in one lane; 7/9 is Block 1 alone, 7/13 Block 2 alone',
      eq(labelsOn(blk, '2026-07-10'), ['Block 1', 'Block 2']) && geo10.ok
        && blk['2026-07-10'][0][3] === 'R' && blk['2026-07-10'][1][3] === 'L'
        && eq(labelsOn(blk, '2026-07-09'), ['Block 1']) && eq(labelsOn(blk, '2026-07-13'), ['Block 2']),
      {'07-09': blk['2026-07-09'], '07-10': blk['2026-07-10'], '07-13': blk['2026-07-13'], geometry: geo10}, 'Block 1 | Block 2');
    var g7 = (blk['2026-07-07'] || [[]])[0][1];
    add('D10g', 'a block bar\'s grey text is its week and its episodes ("Production Week 2 · Ep. 201, 202")',
      g7 === 'Production Week 2 · Ep. 201, 202', g7, 'Production Week 2 · Ep. 201, 202');
    T.set('show-mode', 'episodes');
    await settle();
    add('D10b', 'back to Episodes mode, the 45.5-day schedule comes back', /^45\.5 shoot days/.test(meta()), meta(), '45.5 shoot days');

    // ---- D11: whole numbers draw side by side, never stacked ----
    // A copy of the calendar at 8 days is the reference calendar: 201 is 6/29-7/2 and 7/6-7/9, 202 from 7/10.
    document.getElementById('view-sheet-btn').click(); await settle();
    var keep = epBox('201').value;
    T.set('shoot-days-per-ep', '8'); setEl(epBox('201'), '8');
    await settle();
    await toMonth('July 2026');
    var w8 = prodByDay();
    add('D11', 'at 8 whole days: 7/9 is 201, 7/10 is 202, ONE bar each and in the SAME lane (side by side, not stacked)',
      eq(labelsOn(w8, '2026-07-09'), ['Ep. 201']) && eq(labelsOn(w8, '2026-07-10'), ['Ep. 202'])
        && w8['2026-07-09'][0][2] === w8['2026-07-10'][0][2] && /^80 shoot days/.test(meta()) && meta() === meta80,
      {'07-09': w8['2026-07-09'], '07-10': w8['2026-07-10'], meta: meta()}, 'same lane, 80 shoot days');
    document.getElementById('view-sheet-btn').click(); await settle();
    T.set('shoot-days-per-ep', '4.5'); setEl(epBox('201'), keep);
    await settle();

    var clipped = T.clippedCells();
    add('D12', '0 horizontally clipped cells', !(clipped.h && clipped.h.length), {h: (clipped.h || []).slice(0, 5)}, '[]');
    add('D13', '0 console errors', !(window.__ERR || []).length, (window.__ERR || []).slice(0, 5), '[]');

    // ---- the fixture ----
    // ⚠️ Wait for the backup that carries THIS title: snap() returns the first backup newer than the
    // last one read, and with this many edits since D1s that can be one from the middle of the leg.
    T.set('show-title', 'Half Days Test');
    var fx = null;
    await T.until(function () {
      var g = T.latestBackup();
      fx = g && g.state;
      return !!(fx && fx.fields && fx.fields.byId && (fx.fields.byId['show-title'] || {}).value === 'Half Days Test');
    }, 'the final backup', 150, 100);
    out.fixture = JSON.parse(JSON.stringify(fx));
    out.fixtureMeta = meta();
    add('DF', 'the fixture state: 4.5 days per episode, Episode 201 at 5, 45.5 shoot days, in Episodes mode',
      String((fx.fields.byId['shoot-days-per-ep'] || {}).value) === '4.5' && /^45\.5 shoot days/.test(meta())
        && (fx.fields.byId['show-mode'] || {}).value === 'episodes'
        && fx.episodeDefs.map(function (e) { return String(e.days); }).join() === '5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5',
      {days: fx.episodeDefs.map(function (e) { return e.days; }), meta: meta()}, '5, then 4.5 x 9');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  out.cases = cases;
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
