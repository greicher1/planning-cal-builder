// halfmarks -- a saved ½-day MARK inside a bar that starts or ends half way through a switch day.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides-onhalf ./run.sh halfmarks 150
//
// HALF-SQUARE-BARS-PLAN.md (16 Oct 2026, a frozen edit approved by the owner's picker): on a switch day the
// earlier episode's month bar stops half way through the day's square and the next one starts there, in one
// lane. A bar inset like that is shorter than its columns, and renderMonthView's halfSlices() -- the dark lower
// half a saved 'half' / 'onhalf' mark paints on its day's slice of the bar -- sizes its slices as a share of the
// BAR. So the same frozen edit re-fits a slice to the inset box; without it the shade would cover a quarter of
// the neighbouring day. No baselined calendar has both a saved mark and a .5 day count, which is why this leg
// exists: it makes one through the real app and measures where every shade lands.
//
// Starts from tests/fixtures/dayoverrides-onhalf.sptcal (the halfworked leg's calendar: Production from Mon
// 6/29/26, 8 days per episode, US General, 'onhalf' on Fri 7/3 and Sat 8/1, 'half' on Mon 7/6, 'off' on 7/7,
// 'on' on Sat 7/11, a locked "Summer Break" week from 7/13) and types Episode 201's count as 4.5. Every boundary
// after it then falls at .5, and by entries (the 18 Sep ruling: a marked day is one entry) the shoot days run
//   0-4 6/29 6/30 7/1 7/2 7/3*   5 7/6*   6-9 7/8 7/9 7/10 7/11   10-14 7/20-7/24   15-19 7/27-7/31   20 8/1*
// (* marked ½). So Fri 7/3 (index 4, 'onhalf') is the 201|202 switch day: 201's bar 6/29-7/3 ends half way through
// its marked last day, and 202's one-day bar on 7/3 is all of its half. Mon 7/6 ('half', 7/7 off) is a whole bar
// of 202's. Sat 8/1 (index 20, 'onhalf') is the 203|204 switch day, marked too. Worked out by hand, not read back.
//
//   M0  setup: Episode 201 at 4.5, 76.5 shoot days
//   M1  Fri 7/3 carries 201 and 202 in ONE lane, 201 inset right and 202 inset left (the switch on a marked day)
//   M2  ⭐ every Production bar's shade covers exactly that bar's share of a ½-marked day, measured in px against
//       the day's track in .mv-bars' grid, July and August: 201's slice is the first half of 7/3, 202's the second
//   M3  no shade anywhere else: every slice is on a marked day, and every marked day a bar covers is shaded
//   M4  0 console errors
// At the end the calendar's snapshot is returned as `fixture`: how tests/fixtures/halfmarks.sptcal was cut, from
// the running app (gate.sh runs monthlayout and monthwriter on it, which hold the PDF writer to the same slices).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'halfmarks'};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function meta(){ return txt(document.getElementById('meta-production')); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
  }
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
  // Every Production bar in the month on screen, measured. For each: its label, its days (ISO), its lane, its inset,
  // its padding box in px, and each shade layer as a px range [x0, x1] read from its background-size and
  // -position (a percentage position is a share of the FREE space: offset = P% x (box - W% x box)). And per day of
  // each week row, that day's TRACK in .mv-bars' own grid (3 px of padding a side) and whether it carries the ½.
  function measure(){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var bars = [], days = {};
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-week'), function (wk) {
      var cells = wk.querySelectorAll('.mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(inIdx < 0) return;
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), +txt(cells[inIdx].querySelector('.mv-daynum'))) - inIdx * 86400000;
      var iso = function (c) { return new Date(sunday + c * 86400000).toISOString().slice(0, 10); };
      var lay = wk.querySelector('.mv-bars'), lr = lay.getBoundingClientRect(), lcs = getComputedStyle(lay);
      var pl = parseFloat(lcs.paddingLeft), tw = (lr.width - pl - parseFloat(lcs.paddingRight)) / 7;
      for(var c = 0; c < 7; c++){
        days[iso(c)] = {x0: lr.left + pl + c * tw, x1: lr.left + pl + (c + 1) * tw, half: cells[c].classList.contains('mv-day-half'),
                        out: cells[c].classList.contains('mv-out')};
      }
      [].forEach.call(wk.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        var st = p.getAttribute('style') || '', a = +p.style.gridColumnStart - 1, b = +p.style.gridColumnEnd - 2;
        var r = p.getBoundingClientRect(), cs = getComputedStyle(p);
        var bx0 = r.left + parseFloat(cs.borderLeftWidth), bw = r.width - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
        var sizes = /background-size:\s*([^;]+)/.exec(st), poss = /background-position:\s*([^;]+)/.exec(st);
        var slices = [];
        if(sizes && poss){
          var S = sizes[1].split(','), P = poss[1].split(',');
          S.forEach(function (s, k) {
            var W = parseFloat(s) / 100, Pp = parseFloat(P[k]) / 100, w = W * bw;
            var x0 = bx0 + Pp * (bw - w);
            slices.push([+x0.toFixed(2), +(x0 + w).toFixed(2)]);
          });
        }
        var list = [];
        for(var c2 = a; c2 <= b; c2++) list.push(iso(c2));
        // The episode, without the "Shoot " a full bar carries by default (owner, 20 Oct 2026): this leg is about where
        // shades land, and halfdays D2s holds the prefix rule.
        bars.push({label: (p.firstChild && p.firstChild.nodeType === 3 ? p.firstChild.textContent : txt(p)).trim().replace(/^Shoot /, ''), days: list,
                   lane: +p.style.gridRowStart, inset: (/margin-left:\s*calc\(/.test(st) ? 'L' : '') + (/margin-right:\s*calc\(/.test(st) ? 'R' : ''),
                   box: [+bx0.toFixed(2), +(bx0 + bw).toFixed(2)], slices: slices});
      });
    });
    return {month: my, bars: bars, days: days};
  }
  // Judge one month: every slice must lie on a ½-marked day and cover exactly the bar's share of it (to 2.5 px, the
  // border and margin the renderer's rule folds into the box), and every marked day a bar covers must be shaded.
  function judge(M){
    var bad = [], seen = 0;
    M.bars.forEach(function (b) {
      var shaded = [];
      b.slices.forEach(function (s) {
        var mid = (s[0] + s[1]) / 2;
        var day = Object.keys(M.days).filter(function (k) { return M.days[k].x0 <= mid && mid < M.days[k].x1 && b.days.indexOf(k) >= 0; })[0];
        if(!day){ bad.push(b.label + ': a slice at ' + s.join('-') + ' on none of its days'); return; }
        var D = M.days[day];
        if(!D.half){ bad.push(b.label + ': a slice on ' + day + ', which carries no ½'); return; }
        var want0 = Math.max(D.x0, b.box[0]), want1 = Math.min(D.x1, b.box[1]);
        if(Math.abs(s[0] - want0) > 2.5 || Math.abs(s[1] - want1) > 2.5){
          bad.push(b.label + ' on ' + day + ': slice ' + s.join('-') + ' vs its share ' + want0.toFixed(2) + '-' + want1.toFixed(2));
        }
        shaded.push(day); seen++;
      });
      b.days.forEach(function (k) {
        if(M.days[k] && M.days[k].half && shaded.indexOf(k) < 0) bad.push(b.label + ': ' + k + ' is marked ½ and not shaded');
      });
    });
    return {bad: bad, slices: seen};
  }

  try {
    await T.appReady();
    await settle();
    var before = meta();
    setEl(epBox('201'), '4.5');
    await settle();
    add('M0', 'setup: Episode 201 at 4.5 makes 76.5 shoot days (4.5 + 9 x 8)',
      /^76\.5 shoot days/.test(meta()), {before: before, after: meta()}, '76.5 shoot days');

    await toMonth('July 2026');
    var jul = measure();
    out.july = jul;
    var on3 = jul.bars.filter(function (b) { return b.days.indexOf('2026-07-03') >= 0; });
    add('M1', 'Fri 7/3, marked ½ (\'onhalf\'), is the 201|202 switch day: two bars in ONE lane, 201 inset right, 202 inset left',
      on3.length === 2 && on3[0].label === 'Ep. 201' && on3[1].label === 'Ep. 202' && on3[0].lane === on3[1].lane
        && on3[0].inset === 'R' && on3[1].inset === 'L' && jul.days['2026-07-03'].half,
      on3.map(function (b) { return [b.label, b.days[0] + '..' + b.days[b.days.length - 1], b.lane, b.inset]; }), '201 R | 202 L, one lane');
    var j = judge(jul);
    var s201 = (on3[0] || {slices: []}).slices, s202 = (on3[1] || {slices: []}).slices, d3 = jul.days['2026-07-03'];
    var mid3 = (d3.x0 + d3.x1) / 2;
    add('M2', '⭐ July: every shade covers exactly its bar\'s share of a ½ day -- 201\'s the FIRST half of 7/3, 202\'s the SECOND',
      !j.bad.length && s201.length === 1 && s202.length === 1 && Math.abs(s201[0][1] - mid3) < 2.5 && Math.abs(s202[0][0] - mid3) < 2.5
        && Math.abs(s201[0][0] - d3.x0) < 2.5 && Math.abs(s202[0][1] - d3.x1) < 2.5,
      {failures: j.bad, slices: j.slices, '201': s201, '202': s202, day: [d3.x0, d3.x1]}, 'no failures; 201 x0..mid, 202 mid..x1');

    await toMonth('August 2026');
    var aug = measure();
    out.august = aug;
    var a = judge(aug);
    var on81 = aug.bars.filter(function (b) { return b.days.indexOf('2026-08-01') >= 0; });
    add('M3', 'August: Sat 8/1, marked ½, is the 203|204 switch day (one lane, 203 R, 204 L); every shade is on a marked day, its bar\'s share, and nothing else is shaded',
      !a.bad.length && a.slices >= 2 && on81.length === 2 && on81[0].label === 'Ep. 203' && on81[1].label === 'Ep. 204'
        && on81[0].lane === on81[1].lane && on81[0].inset === 'R' && on81[1].inset === 'L',
      {failures: a.bad, augustSlices: a.slices, on81: on81.map(function (b) { return [b.label, b.lane, b.inset, b.slices]; })}, 'no failures');

    add('M4', '0 console errors', !(window.__ERR || []).length, (window.__ERR || []).slice(0, 5), []);

    // The fixture: the final state, once a backup carries the title set last.
    T.set('show-title', 'Half Marks Test');
    var fx = null;
    await T.until(function () {
      var g = T.latestBackup();
      fx = g && g.state;
      return !!(fx && fx.fields && fx.fields.byId && (fx.fields.byId['show-title'] || {}).value === 'Half Marks Test');
    }, 'the final backup', 150, 100);
    out.fixture = JSON.parse(JSON.stringify(fx));
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  out.cases = cases;
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
