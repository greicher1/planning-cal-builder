// simpostdays -- Simultaneous Post runs on exactly Production's weeks and days (owner, 2 Nov 2026: "when production
// starts (or possibly ends) on a non-monday or non-friday it doesnt add that first week or last week of sim post. Sim
// post weeks (and dates) should always match production weeks (and days) exactly"; frozen edit SD1 approved 3 Nov 2026
// by picker, "Approve the frozen edit"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh simpostdays 300
//
// T.buildFixture()'s calendar (U.S. Area Standards: Independence Day observed Fri 7/3/26, Labor Day Mon 9/7/26) with
// Sim Post on at offset 0, then Production moved about with Snap to Monday off. Each scenario reads the waterfall (the
// weeks holding a "Production wk N" cell against the weeks holding Sim Post) and the month view's print document (per
// row, the day columns Production's bars cover against the columns Sim Post's bar covers).
//
// Measured before the fix: B, C and D lost Sim Post's first week in both views; E kept Sim Post through Production's
// own hiatus week; and in every scenario the month bar ran Monday to Friday, over 7/3 and 9/7 and past a Tuesday wrap.
//
//   A1/A2  Production from Mon 6/29/26 (snapped): the same weeks; the same days on every month row
//   B1/B2  from Wed 7/1/26 (snap off): the first week (6/29) is a Sim Post week; its bar is Wed-Thu, as Production's
//   C1/C2  from Thu 7/2/26
//   D1/D2  from Fri 7/10/26
//   E1/E2  plus Production's own one-week hiatus 8/3/26: no Sim Post that week, in either view. ⚠️ The hiatus pushes
//          Production's last week onto Post's first (11/2/26), and under rule 20 (LAYOUT-RULES.md §0, 5 Nov 2026: a
//          column must earn its place) Post, whose own column would be a phantom, takes the lane there -- so that
//          one working week carries Post's cell and no marker, in both views. Every other working week has Sim Post.
//   E3     numbered ("Number these weeks"): Sim Post wk 1..K over Production's working weeks but that last one, skipping the hiatus, and
//          Post carries on at wk K+1
//   F1     offset 2 on the Friday start: Sim Post from 7/20/26, two calendar weeks after Production's first row (7/6);
//          the old rounding counted from the Friday and gave 7/27/26
//   G1     the month map's Sim Post band runs from Production's first drawn day in a Sim Post week to its last
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'simpostdays', cases: [], probe: {}};
  function add(id, title, pass, observed, expected){ out.cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var byId = function (id) { return document.getElementById(id); };
  function settle(){
    var last = -1, st = 0;
    return T.until(function () {
      var n = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the calendar to settle', 200, 100);
  }
  function key(t){ var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t); if(!m) return null;
    var y = +m[3]; if(y < 100) y += 2000; return y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); }
  var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  // The waterfall: every week with a working Production cell, its hiatus band, Sim Post, and Post's first label.
  // Keyed by real date: the grid lays its year blocks side by side, so document order is not date order.
  function waterfallWeeks(){
    var prod = {}, prodHi = {}, sim = {}, post = {};
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim(), k = key(t);
        if(k){ date = k; return; }
        if(!date) return;
        if(/^Production wk \d+$/.test(t)) prod[date] = t;
        else if(t === 'Production Hiatus') prodHi[date] = 1;
        else if(t.indexOf('Simultaneous Post') === 0) sim[date] = t;
        else if(/^Post wk \d+$/.test(t)) post[date] = t;
      });
    });
    var simK = Object.keys(sim).sort(), postK = Object.keys(post).sort();
    return {prod: Object.keys(prod).sort(), prodHi: Object.keys(prodHi).sort(), sim: simK,
            simLabels: simK.map(function (k) { return sim[k]; }), firstPost: postK.length ? post[postK[0]] : null};
  }
  // The month view's print document: per row (keyed by its Sunday), the columns Production's pills cover and the
  // columns Sim Post's bar covers. Production's bars carry data-ph; Sim Post's is the yellow one without.
  async function monthRows(){
    byId('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    await settle();
    var bands = Array.from(document.querySelectorAll('.month-map .mm-band')).map(function (b) { return b.getAttribute('title') || ''; });
    var printed = null, calls = 0, realPrint = window.print;
    window.print = function () { calls++; var h = byId('print-root'); printed = h ? h.innerHTML : null; };
    T.monthPrintPath();
    byId('export-btn').click();
    await T.until(function () { return calls > 0; }, 'the print call', 200, 100);
    window.dispatchEvent(new Event('afterprint'));
    window.print = realPrint;
    byId('view-sheet-btn').click();
    await settle();
    var host = document.createElement('div'); host.innerHTML = printed || '';
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var rows = {};
    host.querySelectorAll('.month-view').forEach(function (mv) {
      var my = /^(\w+) (\d{4})$/.exec((mv.querySelector('.mv-monthyear') || {textContent: ''}).textContent.trim());
      if(!my) return;
      var first = new Date(Date.UTC(+my[2], MONTHS.indexOf(my[1]), 1));
      var gridStart = new Date(first.getTime() - first.getUTCDay() * 864e5);
      mv.querySelectorAll('.mv-body > .mv-week').forEach(function (w, wi) {
        var sun = new Date(gridStart.getTime() + wi * 7 * 864e5).toISOString().slice(0, 10);
        var prod = {}, sim = {};
        w.querySelectorAll('.mv-bars > .mv-bar').forEach(function (b) {
          var gc = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(b.getAttribute('style') || '');
          if(!gc) return;
          var target = b.getAttribute('data-ph') === 'production' ? prod
                     : /background:\s*#FFFF00/i.test(b.getAttribute('style') || '') ? sim : null;
          if(!target) return;
          for(var c = +gc[1] - 1; c < +gc[2] - 1; c++) target[c] = 1;
        });
        var p = Object.keys(prod).sort().join(''), s = Object.keys(sim).sort().join('');
        if(p || s) rows[sun] = {prod: p, sim: s};   // a row on two months' pages is the same row twice
      });
    });
    return {rows: rows, bands: bands};
  }
  async function scenario(name){
    await settle();
    var wf = waterfallWeeks();
    var mv = await monthRows();
    var badRows = Object.keys(mv.rows).filter(function (k) { return mv.rows[k].prod !== mv.rows[k].sim; })
      .map(function (k) { return k + ' prod[' + mv.rows[k].prod + '] sim[' + mv.rows[k].sim + ']'; });
    var r = {wf: wf, mv: mv, badRows: badRows,
             missing: wf.prod.filter(function (d) { return wf.sim.indexOf(d) < 0; }),
             extra: wf.sim.filter(function (d) { return wf.prod.indexOf(d) < 0; })};
    out.probe[name] = {prodFirst: wf.prod[0], prodLast: wf.prod[wf.prod.length - 1], prodWeeks: wf.prod.length, prodHi: wf.prodHi,
      simFirst: wf.sim[0], simLast: wf.sim[wf.sim.length - 1], simWeeks: wf.sim.length,
      wfMissing: r.missing, wfExtra: r.extra, mvBadRows: badRows};
    return r;
  }
  function weeksCase(id, title, r){
    add(id, title, !r.missing.length && !r.extra.length && r.wf.sim.length > 0,
        {missing: r.missing, extra: r.extra, prod: [r.wf.prod[0], r.wf.prod[r.wf.prod.length - 1], r.wf.prod.length],
         sim: [r.wf.sim[0], r.wf.sim[r.wf.sim.length - 1], r.wf.sim.length]},
        'every week Production works carries Sim Post, and no other');
  }
  function daysCase(id, title, r, row, expectDays){
    var at = r.mv.rows[row] || {prod: '', sim: ''};   // a row with no bar at all is not recorded
    add(id, title, !r.badRows.length && at.sim === expectDays,
        {badRows: r.badRows.slice(0, 6), row: row, at: at}, {badRows: [], rowSimDays: expectDays});
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await settle();
    var sp = byId('simpost-enabled'); if(!sp.checked) sp.click();
    var cnt = byId('simpost-count'); if(cnt.checked) cnt.click();
    await settle();

    // A: the fixture as built. Production Mon 6/29/26; Fri 7/3 is a holiday, so the first row's days are Mon-Thu.
    var A = await scenario('A-monday');
    weeksCase('A1', 'Production from Mon 6/29/26: Sim Post on exactly Production\'s weeks', A);
    daysCase('A2', 'and on exactly its days on every month row (6/28 row: Mon-Thu, the observed holiday blank)', A, '2026-06-28', '1234');

    // B: snap off, Production from Wed 7/1/26.
    var snap = byId('snap-production'); if(snap.checked) snap.click();
    await T.sleep(300);
    T.set('start-production', '2026-07-01');
    var B = await scenario('B-wednesday');
    weeksCase('B1', 'from Wed 7/1/26 (snap off): the first week, 6/29, is a Sim Post week', B);
    daysCase('B2', 'and its month bar is Wed-Thu, as Production\'s', B, '2026-06-28', '34');

    // C: from Thu 7/2/26.
    T.set('start-production', '2026-07-02');
    var C = await scenario('C-thursday');
    weeksCase('C1', 'from Thu 7/2/26: the first week is a Sim Post week', C);
    daysCase('C2', 'and its month bar is the Thursday alone', C, '2026-06-28', '4');

    // D: from Fri 7/10/26.
    T.set('start-production', '2026-07-10');
    var D = await scenario('D-friday');
    weeksCase('D1', 'from Fri 7/10/26: the first week, 7/6, is a Sim Post week', D);
    daysCase('D2', 'and its month bar is the Friday alone', D, '2026-07-05', '5');

    // E: Production's own one-week hiatus (8/3/26), numbered.
    var en = byId('phiatus-en-production'); if(!en.checked) en.click();
    await T.sleep(300);
    T.set('phiatus-weeks-production', '1');
    T.set('phiatus-start-production', '2026-08-03');
    cnt = byId('simpost-count'); if(!cnt.checked) cnt.click();
    var E = await scenario('E-prodhiatus');
    // Rule 20: the one working week without Sim Post is Post's first, 11/2/26, where Post sits in the lane.
    add('E1', 'Production\'s own hiatus (8/3/26): no Sim Post that week; Sim Post on every other working week but the last, where Post takes the lane (rule 20)',
        same(E.missing, ['2026-11-02']) && !E.extra.length && E.wf.sim.length > 0,
        {missing: E.missing, extra: E.extra, prod: [E.wf.prod[0], E.wf.prod[E.wf.prod.length - 1], E.wf.prod.length],
         sim: [E.wf.sim[0], E.wf.sim[E.wf.sim.length - 1], E.wf.sim.length]},
        {missing: ['2026-11-02'], extra: []});
    add('E1b', 'the hiatus week is Production\'s hiatus band, without Sim Post', same(E.wf.prodHi, ['2026-08-03']) && E.wf.sim.indexOf('2026-08-03') < 0,
        {prodHi: E.wf.prodHi, simHas: E.wf.sim.indexOf('2026-08-03') >= 0}, {prodHi: ['2026-08-03'], simHas: false});
    var e2 = E.mv.rows['2026-08-02'] || {prod: '', sim: ''};
    add('E2', 'and no Sim Post bar in the month view that week; the one row where the bars differ is Post\'s first week, 11/1 (rule 20)',
        same(E.badRows, ['2026-11-01 prod[12345] sim[]']) && e2.sim === '',
        {badRows: E.badRows.slice(0, 6), row: '2026-08-02', at: e2}, {badRows: ['2026-11-01 prod[12345] sim[]'], rowSimDays: ''});
    var K = E.wf.prod.length - 1;   // rule 20: the last working week is Post's, in the lane, so the marker stops at K
    var wantLabels = []; for (var ki = 0; ki < K; ki++) wantLabels.push('Simultaneous Post wk ' + (ki + 1));
    add('E3', 'numbered: Sim Post wk 1..K over Production\'s working weeks, and Post carries on at wk K+1',
        same(E.wf.simLabels, wantLabels) && E.wf.firstPost === 'Post wk ' + (K + 1),
        {first: E.wf.simLabels[0], last: E.wf.simLabels[E.wf.simLabels.length - 1], n: E.wf.simLabels.length, firstPost: E.wf.firstPost},
        {first: wantLabels[0], last: wantLabels[K - 1], n: K, firstPost: 'Post wk ' + (K + 1)});

    // F: offset 2 on the Friday start.
    if(en.checked) en.click();
    await T.sleep(300);
    T.set('simpost-offset', '2');
    var F = await scenario('F-offset');
    var wantF = F.wf.prod.filter(function (d) { return d >= '2026-07-20'; });
    add('F1', 'offset 2 on a Friday start: Sim Post from 7/20/26, two calendar weeks after Production\'s first row (7/6)',
        F.wf.prod[0] === '2026-07-06' && same(F.wf.sim, wantF),
        {prodFirst: F.wf.prod[0], simFirst: F.wf.sim[0], simWeeks: F.wf.sim.length}, {prodFirst: '2026-07-06', simFirst: '2026-07-20', simWeeks: wantF.length});

    // G: the month map's Sim Post band (D's calendar: offset 0, from Fri 7/10/26) runs from Production's first drawn day
    // to its last. D's rows are keyed by their Sunday; a column is a day after it.
    var drawnDays = [];
    Object.keys(D.mv.rows).forEach(function (sun) {
      D.mv.rows[sun].sim.split('').forEach(function (c) {
        drawnDays.push(new Date(Date.parse(sun + 'T00:00:00Z') + (+c) * 864e5).toISOString().slice(0, 10));
      });
    });
    drawnDays.sort();
    var md = function (iso) { var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2); };
    var wantBand = 'Sim Post, ' + md(drawnDays[0]) + ' to ' + md(drawnDays[drawnDays.length - 1]) + '.';
    var simBands = D.mv.bands.filter(function (t) { return t.indexOf('Sim Post, ') === 0; });
    add('G1', 'the month map\'s Sim Post band runs from Production\'s first drawn day to its last',
        simBands.length === 1 && simBands[0].indexOf(wantBand) === 0,
        {bands: simBands}, wantBand + ' Click to go to ...');
  } catch (e) { out.cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
