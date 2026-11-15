// buildcarry -- Build Around carries each moved phase's OWN hiatus and its "<week>|<key>" stores (audit AUD2-009, the
// Nov 2026 audit's item 2.2, 13 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=buildcarry ./run.sh buildcarry 600
//
// Before: buildAround wrote start-<key> alone (setPhaseStart), so a moved phase's own hiatus (phiatus-start-<key>) and
// every store keyed "<week>|<key>" (hiatusTexts, hiatusColors, textStyle.phase, cellSpans, gridColSwaps) stayed on the
// old weeks. Carried past its own break, Post lost the break in the waterfall and the workbook and ended a week early,
// with nothing said; Shift, the card arrows and the month drag all carry them. Now each phase Build Around places takes
// its own hiatus along by the weeks its start moved, in the solvers too (a phase placed BACK from the next one, and an
// "ends by" pin, are solved with the break where it will land), and its stores by the same weeks, in the same undo step.
// Typed week notes stay on their weeks, as documented (owner-approved default), and the result line says how many.
//
// On tests/fixtures/buildcarry.sptcal: the audit's audit-b2-mov.sptcal (synthetic; 10 eps x 8 days, US-General,
// Production 10/5/26, Post 2/15/27 x 16 with its own 1-week "Spring break" 4/5/27, Production's phase cell 10/19/26
// bold) plus three Post-keyed stores: a colour on the break band (4/5/27), a hand-widened cell and an italic phase cell
// (both 3/1/27).
//   A1-A7  pin Production starts 1/4/27, default ticks: Post 5/3/27 with its break 6/21/27 (Pushed 11 wks, as Shift's
//          After Production does), 16 work weeks + the band, ending 8/23/27; the band colour, the widened cell and the
//          italic go with Post, Production's bold with Production (1/18/27); the line counts the typed notes that stayed;
//          one undo puts it all back
//   B1-B2  every phase ticked: Localization chains off Post's REAL end (8/30/27, the break counted), and the preview
//          promised exactly that date (the trial carries the break as the build does)
//   C1-C2  pin Localization starts 9/6/27, every phase ticked: Post is placed BACK from it with its break where it will
//          land (start 5/10/27, break 6/28/27), so it ends the week before Localization and never overlaps it
//   D1-D3  Production given its own 1-week break 11/2/26 (four weeks in): pinned "ends by" 3/5/27 it wraps by then with
//          the break kept four weeks in, and the next Monday would not (typed by hand, break moved with it); pinned Post
//          6/7/27 places the shoot back with its break four weeks in, ending before Post
//   F1     a custom DAYS phase with its own break, placed back from Localization 9/6/27: the latest working day from
//          which its 6 days, the break carried with it, are done by then (Fri 8/20/27, break 8/23/27, to Fri 9/3/27)
//   E0     no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) || {}).value; }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  var pop = function () { return $('pop-solve'); };
  function msg(){ return txt(pop().querySelector('[data-tools-msg]')); }
  function go(){ return $('tool-solve-go'); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function starts(){ var o = {}; KEYS.forEach(function (k) { o[k] = val('start-' + k); }); return o; }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){ var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(500); }
  function iso(d){ return d.toISOString().slice(0, 10); }
  function addD(isoStr, n){ return iso(new Date(Date.parse(isoStr + 'T00:00:00Z') + n * 864e5)); }
  function wks(a, b){ return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5 / 7); }
  // A phase's waterfall cells, by week: work cells and its own band cells ([text]).
  function cells(key){
    return qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]').map(function (td) {
      return td.getAttribute('data-week') + (td.classList.contains('sheet-hiatus-cell') ? '[' + txt(td) + ']' : '');
    }).sort();
  }
  function run(key){
    var c = cells(key), w = c.filter(function (x) { return x.indexOf('[') < 0; }), b = c.filter(function (x) { return x.indexOf('[') > 0; });
    return {n: c.length, work: w.length, first: c.length ? c[0].slice(0, 10) : null, last: c.length ? c[c.length - 1].slice(0, 10) : null,
            band: b.map(function (x) { return x.slice(0, 10); }), bandText: b.map(function (x) { return x.slice(10); })};
  }
  function boldWeeks(key){
    return qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]').filter(function (td) {
      return /bold|700/.test(td.getAttribute('style') || '') || !!td.querySelector('[style*="bold"],[style*="700"]');
    }).map(function (td) { return td.getAttribute('data-week'); });
  }
  async function backup(){ await T.sleep(3600); var b = T.latestBackup(); return (b && b.state) || {}; }
  function suffixKeys(map, key){ return Object.keys(map || {}).filter(function (k) { return k.slice(-(key.length + 1)) === '|' + key; }).sort(); }
  // The typed week notes inside the runs of the phases that moved, read off the grid before the build.
  function typedNotesIn(runs, notes){
    return Object.keys(notes || {}).filter(function (k) {
      var v = notes[k], t = typeof v === 'string' ? v : (v && (v.text || (Array.isArray(v.notes) ? v.notes.map(function (n) { return n && n.text || ''; }).join('') : ''))) || '';
      if(!t) return false;
      return runs.some(function (r) { return r.first && k >= r.first && k <= r.last; });
    }).length;
  }
  function rowEls(){ return Array.prototype.filter.call(pop().querySelectorAll('.solve-row'), function (r) { return !!r.dataset.key; }); }
  function rowDate(key){ var r = rowEls().filter(function (e) { return e.dataset.key === key; })[0]; return r ? txt(r.querySelector('.solve-dt')) : ''; }
  function mdy(isoStr){ var p = isoStr.split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2); }
  async function openBox(){
    T.closePops(); await T.sleep(150); $('pop-solve-btn').click();
    await T.until(function () { return T.solveRow('production').getBoundingClientRect().height > 0; }, 'the box', 60, 100);
    await T.sleep(300);
  }
  async function pin(key, edge, dateIso, all){
    await openBox();
    await T.solvePress(key, 'row');
    T.set('tool-solve-edge', edge); await T.sleep(300);
    T.set('tool-solve-date', dateIso); await T.sleep(500);
    if(all){ var box = pop().querySelector('[data-solve-all]'); if(box && !box.checked){ box.click(); await T.sleep(450); } }
  }
  async function build(){ go().click(); await T.sleep(700); await settled(); }
  async function undo(){ T.closePops(); await T.sleep(150); $('undo-btn').click(); await T.sleep(900); await settled(); }
  // Production's wrap, from its meta line ("... → Wed 12/16/26").
  function wrapIso(){ var m = txt($('meta-production')).match(/(\d+)\/(\d+)\/(\d+)\s*$/); if(!m) return null;
    return '20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); }

  try {
    await T.appReady();
    await T.until(function () { return cells('post').length > 0; }, 'the fixture', 200, 100);
    await settled();

    // ===================== A: pin Production starts 1/4/27, default ticks =====================
    // The stores as saved: no edit has been made yet, so there is no crash backup to read them from.
    var k0 = await (await fetch('/tests/fixtures/buildcarry.sptcal')).json();
    var s0 = starts(), post0 = run('post'), ph0 = val('phiatus-start-post');
    out.a0 = {starts: s0, post: post0, phiatus: ph0, bold: boldWeeks('production')};
    var movedRuns = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post'].map(run);
    var expectStayed = typedNotesIn(movedRuns, k0.userNotes);
    add('A0', 'the fixture as saved: Post 2/15/27 with its own break 4/5/27 inside it, Production bold on 10/19/26',
      s0.post === '2027-02-15' && ph0 === '2027-04-05' && post0.band.join() === '2027-04-05' && post0.work === 16
        && out.a0.bold.indexOf('2026-10-19') >= 0 && !!(k0.hiatusColors || {})['2027-04-05|post'],
      out.a0, 'Post 2/15/27, break 4/5/27 in it, 16 work cells, bold 10/19/26');
    await pin('production', 'start', '2027-01-04', false);
    var prevA = {post: rowDate('post'), prodPrep: rowDate('prodPrep')};
    await build();
    var a1 = {starts: starts(), post: run('post'), phiatus: val('phiatus-start-post'), msg: msg(), bold: boldWeeks('production'), prev: prevA};
    var k1 = await backup();
    a1.stores = {hiatusColors: suffixKeys(k1.hiatusColors, 'post'), cellSpans: suffixKeys(k1.cellSpans, 'post'),
                 phasePost: suffixKeys((k1.textStyles || {}).phase, 'post'), phaseProd: suffixKeys((k1.textStyles || {}).phase, 'production'),
                 hiatusTexts: suffixKeys(k1.hiatusTexts, 'post'), userNotes: Object.keys(k1.userNotes || {}).sort()};
    out.a1 = a1;
    var dPost = wks(s0.post, a1.starts.post);
    add('A1', 'Post moves to 5/3/27 and its own break goes with it, by the same 11 weeks, to 6/21/27',
      a1.starts.post === '2027-05-03' && a1.phiatus === '2027-06-21' && wks(ph0, a1.phiatus) === dPost,
      {post: a1.starts.post, phiatus: a1.phiatus, weeks: dPost}, 'Post 2027-05-03, break 2027-06-21');
    add('A2', 'Post keeps its break in the waterfall: 16 work weeks and the "Spring break" band seven weeks in, ending 8/23/27 (a week later than without it)',
      a1.post.work === 16 && a1.post.band.join() === '2027-06-21' && /Spring break/.test(a1.post.bandText.join())
        && a1.post.first === '2027-05-03' && a1.post.last === '2027-08-23',
      a1.post, '16 work + band 2027-06-21, 2027-05-03 .. 2027-08-23');
    add('A3', 'Post\'s stores go with it: the break band\'s colour (6/21/27), the hand-widened cell and the italic phase cell (5/17/27); nothing left on the old weeks',
      a1.stores.hiatusColors.join() === '2027-06-21|post' && a1.stores.cellSpans.join() === '2027-05-17|post'
        && a1.stores.phasePost.join() === '2027-05-17|post' && a1.stores.hiatusTexts.every(function (k) { return k >= '2027-05-03'; }),
      a1.stores, 'hiatusColors 2027-06-21|post, cellSpans 2027-05-17|post, textStyles.phase 2027-05-17|post');
    add('A4', 'Production\'s bold phase cell goes with Production (10/19/26 -> 1/18/27, the shoot\'s 13 weeks)',
      a1.stores.phaseProd.join() === '2027-01-18|production' && a1.bold.indexOf('2027-01-18') >= 0 && a1.bold.indexOf('2026-10-19') < 0
        && wks(s0.production, a1.starts.production) === 13,
      {phaseProd: a1.stores.phaseProd, bold: a1.bold, prod: a1.starts.production}, '2027-01-18|production, drawn bold there');
    var stayRe = new RegExp('(^|\\. )' + expectStayed + ' typed notes? stayed on (their|its) weeks?\\.');
    add('A5', 'the result line counts the typed notes that stayed on their weeks while their phases moved (' + expectStayed + '), and the notes did stay',
      expectStayed > 0 && stayRe.test(a1.msg) && a1.stores.userNotes.join() === Object.keys(k0.userNotes || {}).sort().join()
        && !/[+−]|slot|lane|stint|\bcol\b/i.test(a1.msg),
      {msg: a1.msg, expect: expectStayed, notes: a1.stores.userNotes}, '"… ' + expectStayed + ' typed notes stayed on their weeks."');
    add('A6', 'the preview promised the dates Build delivered (Post, Prod Prep)',
      prevA.post === mdy(a1.starts.post) && prevA.prodPrep === mdy(a1.starts.prodPrep), {prev: prevA, built: a1.starts}, 'equal');
    await undo();
    var u1 = {starts: starts(), post: run('post'), phiatus: val('phiatus-start-post'), bold: boldWeeks('production')};
    var ku = await backup();
    add('A7', 'one undo puts back the starts, Post\'s break, its stores and Production\'s bold cell',
      JSON.stringify(u1.starts) === JSON.stringify(s0) && u1.phiatus === ph0 && u1.post.band.join() === '2027-04-05'
        && u1.bold.indexOf('2026-10-19') >= 0 && !!(ku.hiatusColors || {})['2027-04-05|post'] && !!(ku.cellSpans || {})['2027-03-01|post'],
      u1, 'as before the build');

    // ===================== B: every phase ticked: Localization chains off Post's real end =====================
    await pin('production', 'start', '2027-01-04', true);
    var prevLoc = rowDate('localization');
    await build();
    var b1 = {starts: starts(), post: run('post'), loc: run('localization'), prev: prevLoc, msg: msg()};
    out.b1 = b1;
    add('B1', 'Localization starts the Monday after Post\'s last week, with Post\'s break counted (8/30/27)',
      b1.starts.localization === '2027-08-30' && b1.post.last === '2027-08-23' && b1.post.band.join() === '2027-06-21',
      b1, 'Localization 2027-08-30, Post to 2027-08-23 with its band');
    add('B2', 'the preview promised that date for Localization', prevLoc === mdy(b1.starts.localization), {prev: prevLoc, built: b1.starts.localization}, mdy('2027-08-30'));
    await undo();

    // ===================== C: Post placed BACK from Localization, with its break where it will land =====================
    await pin('localization', 'start', '2027-09-06', true);
    var prevPost = rowDate('post');
    await build();
    var c1 = {starts: starts(), post: run('post'), phiatus: val('phiatus-start-post'), prev: prevPost, msg: msg()};
    out.c1 = c1;
    add('C1', 'Post is placed back from Localization 9/6/27 with its break seven weeks in: starts 5/10/27, break 6/28/27',
      c1.starts.localization === '2027-09-06' && c1.starts.post === '2027-05-10' && c1.phiatus === '2027-06-28'
        && wks(c1.starts.post, c1.phiatus) === wks(s0.post, ph0),
      {post: c1.starts.post, phiatus: c1.phiatus, loc: c1.starts.localization}, 'Post 2027-05-10, break 2027-06-28');
    add('C2', 'Post ends the week before Localization (no overlap), 16 work weeks and its band, as the preview said',
      c1.post.work === 16 && c1.post.band.join() === '2027-06-28' && addD(c1.post.last, 7) === c1.starts.localization && prevPost === mdy(c1.starts.post),
      c1, 'Post 2027-05-10 .. 2027-08-30, Localization 2027-09-06');
    await undo();

    // ===================== D: Production's own break =====================
    T.closePops(); await T.sleep(150);
    var en = $('phiatus-en-production'); if(en && !en.checked){ en.click(); await T.sleep(300); }
    T.set('phiatus-start-production', '2026-11-02'); await T.sleep(300);
    T.set('phiatus-weeks-production', '1'); await T.sleep(600); await settled();
    var d0 = {start: val('start-production'), ph: val('phiatus-start-production'), wrap: wrapIso(), band: run('production').band};
    out.d0 = d0;
    var off = wks(d0.start, d0.ph);
    await pin('production', 'end', '2027-03-05', false);
    await build();
    var d1 = {start: val('start-production'), ph: val('phiatus-start-production'), wrap: wrapIso(), band: run('production').band, msg: msg()};
    out.d1 = d1;
    // The oracle: the next Monday, typed by hand with the break moved with it, wraps after the date.
    await undo();
    var nextMon = addD(d1.start, 7);
    T.set('start-production', nextMon); await T.sleep(300);
    T.set('phiatus-start-production', addD(d1.ph, 7)); await T.sleep(600); await settled();
    var dNext = {start: val('start-production'), ph: val('phiatus-start-production'), wrap: wrapIso()};
    out.dNext = dNext;
    add('D1', 'Production "ends by" 3/5/27 with its own break: it wraps by then, the break still ' + off + ' weeks in (as a band), and the next Monday would wrap after it',
      off === 4 && d0.band.join() === '2026-11-02' && !!d1.wrap && d1.wrap <= '2027-03-05' && wks(d1.start, d1.ph) === off
        && d1.band.join() === d1.ph && !!dNext.wrap && dNext.wrap > '2027-03-05',
      {before: d0, after: d1, next: dNext}, 'wrap <= 2027-03-05, break 4 wks in, next Monday wraps later');
    // Put the calendar back (the two typed fields), then place the shoot BACK from Post.
    T.set('start-production', d0.start); await T.sleep(300);
    T.set('phiatus-start-production', d0.ph); await T.sleep(600); await settled();
    await pin('post', 'start', '2027-06-07', true);
    await build();
    var d2 = {start: val('start-production'), ph: val('phiatus-start-production'), prod: run('production'), post: val('start-post'), msg: msg()};
    out.d2 = d2;
    add('D2', 'Post pinned 6/7/27 (16 wks later): the shoot is placed back from it with its break still four weeks in, and ends before Post starts',
      d2.post === '2027-06-07' && wks(d0.start, d2.start) > 10 && wks(d2.start, d2.ph) === off && d2.prod.band.join() === d2.ph
        && addD(d2.prod.last, 7) <= '2027-06-07',
      d2, 'break 4 wks in, Production\'s last week before 2027-06-07');
    await undo();
    add('D3', 'undo puts the shoot and its break back', val('start-production') === d0.start && val('phiatus-start-production') === d0.ph,
      {start: val('start-production'), ph: val('phiatus-start-production')}, d0);

    // ===================== F: a custom DAYS phase with its own break, placed back from Localization =====================
    T.closePops(); await T.sleep(150);
    $('add-phase-btn').click(); await T.sleep(600);
    var ck = qa('[id^="start-custom"]').map(function (e) { return e.id.slice(6); }).pop();
    T.set('unit-' + ck, 'days'); await T.sleep(300);
    T.set('days-' + ck, '6'); await T.sleep(300);
    T.set('start-' + ck, '2027-06-03'); await T.sleep(400);
    var cen = $('phiatus-en-' + ck); if(cen && !cen.checked){ cen.click(); await T.sleep(300); }
    T.set('phiatus-start-' + ck, '2027-06-07'); await T.sleep(300);
    T.set('phiatus-weeks-' + ck, '1'); await T.sleep(600); await settled();
    var f0 = {key: ck, start: val('start-' + ck), ph: val('phiatus-start-' + ck), meta: txt($('unitmeta-' + ck))};
    out.f0 = f0;
    await pin('localization', 'start', '2027-09-06', true);
    var prevC = rowDate(ck);
    await build();
    var f1 = {start: val('start-' + ck), ph: val('phiatus-start-' + ck), meta: txt($('unitmeta-' + ck)), band: run(ck).band, loc: val('start-localization'), prev: prevC};
    out.f1 = f1;
    add('F1', 'a Days phase (6 days, its own 1-week break the week after it starts) placed back from Localization 9/6/27: Fri 8/20/27, break 8/23/27, its sixth day Fri 9/3/27',
      /Thu 6\/3\/27 → Thu 6\/17\/27/.test(f0.meta) && f1.loc === '2027-09-06' && f1.start === '2027-08-20' && f1.ph === '2027-08-23'
        && f1.band.join() === '2027-08-23' && /6 working days · Fri 8\/20\/27 → Fri 9\/3\/27/.test(f1.meta) && prevC === mdy(f1.start),
      {before: f0, after: f1}, 'start 2027-08-20, break 2027-08-23, Fri 8/20/27 → Fri 9/3/27, as previewed');

    add('E0', 'no console errors', T.appHealth().errors.length === 0, {errors: T.appHealth().errors, modal: T.modalText()}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 800), 'no exception'); }
  T.done(out);
})(); });
