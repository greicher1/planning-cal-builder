// phasearrows -- the phase card's week arrows (owner, 4 Nov 2026; PHASE-WEEK-ARROWS-PLAN.md, layout D: "lets go
// with D"). ▲ / ▼ beside a phase's date box move THAT phase one week (▲ earlier, D1), in the waterfall only (D6).
// A burst of clicks is one undo step (D4) and carries a "Pulled 2 wks" label (D5).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasearrows ./run.sh phasearrows 400
//
// THE CALENDAR: tests/fixtures/phasearrows.sptcal, which is anchorside.sptcal (the Shift tool's) with, added by script:
// Post's own one-week hiatus "Post Pause" from 1/4/27, four stores keyed "<week>|post" (a cell span and a bold
// phase text style on 11/23, the Post Pause band's colour on 1/4/27, and Post's half of a column swap with Production
// on 11/2, the week they share), and an EDITED automatic note on 6/29/26: Production's own "Start Principal
// Photography 6/29/26" with "PROD-EXTRA" under it (Production Starts is one of the three automatic notes this
// calendar has on; Localization's are off). It opens in the waterfall on the Phases tab.
// From anchorside it keeps: six phases (Pre Prep snap-off on Wed 4/8), Production 6/29/26 with four day marks, the
// unlocked Fall Break 9/21/26 inside the shoot, the locked Summer Break and Christmas hiatuses, a calendar range start
// of 2/2/26, and six typed week notes (one dated, so pinned).
//
// Every state is read back from the crash backup, which IS captureSnapshot(), and compared key-sorted.
//
//   T0  truth guard: the calendar as loaded, and the Post stores where the fixture put them
//   L1  every dated card shows the arrows: 30 x 30 on the date box's line, the box at least 112 px (the cards' floor, phasesui P6)
//   I1  no id on the arrows, the label or their holder, and no input inside them; each arrow names its phase
//   P1  Post ▼ once: Post's start a week later, every other phase where it was
//   P2  ... its own hiatus a week later, and no other phase's
//   P3  ... its "<week>|post" stores a week later (span, text style, band colour, its half of the swap); Production's
//           half of the swap stays
//   P4  ... every typed note, every all-phase hiatus (locked or not) and the calendar range stay; the day marks too
//   C1  ... the label read "Pushed 1 wk" while the burst ran, and is gone after it
//   U1  one Undo puts back the calendar as it was, snapshot for snapshot
//   B1  a burst (▼ ▼ ▼ ▲, one gap longer than the undo debounce) moves Post 2 weeks, with "Pushed 2 wks"
//   B2  ... and ONE Undo takes the whole burst back
//   B3  a click anywhere else ends a burst: ▼, a click on the page, ▼ = two steps, each with its own "Pushed 1 wk"
//   N1  ▼ ▲ inside one burst on Production: "Back where it was", and the calendar (its edited note too) exactly as
//       it was
//   N2  Production ▼: the edited note's standard line goes (its week no longer starts the shoot), "PROD-EXTRA"
//       stays on 6/29/26, and every typed note stays
//   M1  Production ▲: only Production moves, the unlocked Fall Break inside it stays, and its day marks land where
//       the toolbar's ← 1 wk puts them (both bind them by shoot-day number)
//   K1  Pre Prep (Snap to Monday off, Wed 4/8): ▼ = Wed 4/15
//   E1  Localization held by its END: ▼ moves the end Friday a week, and the start follows
//   L2  at sidebars of 280 to 440 px with a Dates phase on screen: every date box at least 112 px, nothing outside
//       its card, the arrows level with the box
//   D1  Writer's Rm by Dates: ▼ moves both dates a week, so its length is unchanged
//   A1  Alt+Down / Alt+Up in Post's date box: one burst, "Pushed 2 wks" then "Back where it was"
//   V1  the month view keeps its month: five ▼ on Post (35 days) leave it on January 2026 (keepView)
//   V2  in the month view no card shows the arrows, and Alt+Down in a date box does nothing
//   H1  a phase with no date shows none; given one back, it shows them again
//   F1  every move undone: the calendar is the one it started as
//   S1  no new key in fields.byId, and no new top-level key, in any snapshot taken
//   E0  0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) || {}).value; }
  function row(key){ return $('swatch-' + key).parentElement; }
  function btn(key, dir){ return row(key).querySelector('.ph-nudge-btn[data-nudge="' + dir + '"]'); }
  function chip(key){ return (row(key).querySelector('.ph-nudge-chip') || {}).textContent || ''; }
  function chipOn(key){ var c = row(key).querySelector('.ph-nudge-chip'); return !!c && c.classList.contains('on'); }
  async function nudge(key, dir, gap){ btn(key, dir).click(); await T.sleep(gap == null ? 150 : gap); }
  async function burstEnd(){ await T.sleep(1900); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  function altKey(key, k){
    var box = $('start-' + key);
    var ev = new KeyboardEvent('keydown', {key: k, altKey: true, bubbles: true, cancelable: true});
    box.dispatchEvent(ev);
    return ev.defaultPrevented;
  }
  function canon(o){
    if(Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
    if(o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(o[k]); }).join(',') + '}';
    return JSON.stringify(o);
  }
  function same(a, b){ return canon(a) === canon(b); }
  var lastAt = 0, snaps = [];
  async function take(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    // ⚠️ COPIED, never kept as read. captureSnapshot() puts the live userNotes object in the snapshot (it is a const,
    // mutated in place), and the harness's in-memory IndexedDB keeps what it is given by reference where a real one
    // clones it. A snapshot kept as read would show the notes as they are at the moment it is COMPARED: M1 read its
    // Production move after the next two undos and saw the loaded notes. A copy is the state at the backup.
    var state = JSON.parse(JSON.stringify(got.state));
    snaps.push(state);
    return state;
  }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function startsOf(s){ var o = {}; KEYS.forEach(function (k) { o[k] = ((s.fields.byId['start-' + k]) || {}).value; }); return o; }
  function phiatusOf(s){ var o = {}; KEYS.forEach(function (k) { o[k] = ((s.fields.byId['phiatus-start-' + k]) || {}).value; }); return o; }
  function notesOf(s){ var o = {}; Object.keys(s.userNotes || {}).sort().forEach(function (k) { o[k] = s.userNotes[k].text; }); return o; }
  function postStores(s){
    return {spans: Object.keys(s.cellSpans || {}).sort(), style: Object.keys(((s.textStyles || {}).phase) || {}).sort(),
            colors: Object.keys(s.hiatusColors || {}).sort(), swaps: Object.keys(s.gridColSwaps || {}).sort()};
  }
  function withStart(st, key, iso){ var o = Object.assign({}, st); o[key] = iso; return o; }
  function monthShown(){ var e = document.querySelector('#table-wrap .mv-monthyear'); return e ? e.textContent.trim() : ''; }
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await T.sleep(700); }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(($('meta-production') || {}).textContent || ''); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A loaded calendar is clean, and a clean page writes no backup: one edit that is not a schedule input.
    T.set('show-title', 'Phase Arrows');
    await T.sleep(700);   // past the undo debounce, so the title is its own step
    var s0 = await take();
    var st0 = startsOf(s0), n0 = notesOf(s0), ph0 = phiatusOf(s0), ps0 = postStores(s0);
    add('T0', 'the calendar as loaded: six phases, Post Pause on 1/4/27, the four Post stores, the edited Production note',
      same(st0, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-02', localization: '2027-03-01'})
        && ph0.post === '2027-01-04'
        && same(ps0, {spans: ['2026-11-23|post'], style: ['2026-11-23|post'], colors: ['2027-01-04|post'], swaps: ['2026-11-02|post', '2026-11-02|production']})
        && n0['2026-06-29'] === 'Start Principal Photography 6/29/26\nPROD-EXTRA' && n0['2027-03-08'] === 'LOC-WK2'
        && s0.viewMode === 'sheet',
      {starts: st0, phiatus: ph0, stores: ps0, notes: n0, view: s0.viewMode}, 'the fixture as written');

    // ---- L1 / I1: the arrows on the cards ----
    var cards = KEYS.map(function (k) {
      var r = row(k), on = r.classList.contains('nudge-on');
      var box = r.classList.contains('ends-mode') ? r.querySelector('.ph-ends-box input') : $('start-' + k);
      var b = box.getBoundingClientRect(), u = btn(k, -1).getBoundingClientRect(), d = btn(k, 1).getBoundingClientRect();
      return {key: k, on: on, boxW: Math.round(b.width), up: [Math.round(u.width), Math.round(u.height)], down: [Math.round(d.width), Math.round(d.height)],
              level: Math.abs(u.top - b.top) < 1 && Math.abs(d.top - b.top) < 1, after: u.left >= b.right && d.left >= u.right,
              inCard: d.right <= r.getBoundingClientRect().right};
    });
    var badCards = cards.filter(function (c) {
      return !c.on || c.boxW < 112 || c.up.join() !== '30,30' || c.down.join() !== '30,30' || !c.level || !c.after || !c.inCard;
    });
    add('L1', 'every dated card shows ▲ ▼: 30 x 30, level with the date box and right of it, the box at least 112 px wide (the floor every card holds, phasesui P6)',
      badCards.length === 0, {bad: badCards, boxWidths: cards.map(function (c) { return c.key + ' ' + c.boxW; })}, 'none bad');
    var withId = document.querySelectorAll('.ph-nudge[id], .ph-nudge-btn[id], .ph-nudge-chip[id], .ph-nudge [id]').length;
    var inputs = document.querySelectorAll('.ph-nudge input, .ph-nudge select, .ph-nudge textarea, .ph-nudge-chip input').length;
    var labels = [btn('prodPrep', -1).getAttribute('aria-label'), btn('prodPrep', 1).getAttribute('aria-label'), btn('prodPrep', -1).title];
    add('I1', 'no id on the arrows, their holder or the label, nothing to sweep inside them, and each arrow names its phase',
      withId === 0 && inputs === 0 && labels[0] === 'Move Prod Prep 1 week earlier' && labels[1] === 'Move Prod Prep 1 week later' && labels[2] === labels[0],
      {withId: withId, inputs: inputs, labels: labels}, '0, 0, "Move Prod Prep 1 week earlier / later"');

    // ---- P: Post ▼ once ----
    await nudge('post', 1, 120);
    var c1 = {during: chip('post'), on: chipOn('post')};
    await burstEnd();
    c1.after = chip('post'); c1.afterOn = chipOn('post');
    var s1 = await take();
    add('P1', 'Post ▼: Post starts a week later, 11/9; every other phase where it was',
      same(startsOf(s1), withStart(st0, 'post', '2026-11-09')), startsOf(s1), 'post 2026-11-09, the rest as loaded');
    add('P2', '... its own hiatus a week later (1/11/27), and no other phase\'s',
      same(phiatusOf(s1), withStart(ph0, 'post', '2027-01-11')), phiatusOf(s1), 'post 2027-01-11, the rest as loaded');
    add('P3', '... its "<week>|post" stores a week later; Production\'s half of the swap stays on 11/2',
      same(postStores(s1), {spans: ['2026-11-30|post'], style: ['2026-11-30|post'], colors: ['2027-01-11|post'], swaps: ['2026-11-02|production', '2026-11-09|post']}),
      postStores(s1), 'spans/style 11/30, colour 1/11/27, swaps 11/2 production + 11/9 post');
    add('P4', '... every typed note, every all-phase hiatus, the calendar range and the day marks stay',
      same(notesOf(s1), n0) && same(s1.fields.hiatuses, s0.fields.hiatuses) && same(s1.fields.byId['cal-range-start'], s0.fields.byId['cal-range-start'])
        && same(s1.dayOverrides, s0.dayOverrides),
      {notes: same(notesOf(s1), n0), hiatuses: same(s1.fields.hiatuses, s0.fields.hiatuses), range: s1.fields.byId['cal-range-start'], marks: same(s1.dayOverrides, s0.dayOverrides)},
      'all four unchanged');
    add('C1', '... the label read "Pushed 1 wk" while the burst ran, and is gone once it ends',
      c1.during === 'Pushed 1 wk' && c1.on && c1.after === '' && !c1.afterOn, c1, '"Pushed 1 wk", then empty');

    await undo();
    var u1 = await take();
    add('U1', 'one Undo puts the calendar back as it was, snapshot for snapshot', same(u1, s0),
      same(u1, s0) ? 'identical' : {starts: startsOf(u1), stores: postStores(u1)}, 'identical to the loaded state');

    // ---- B: a burst is one step ----
    await nudge('post', 1, 250);
    await nudge('post', 1, 900);   // longer than the 500 ms undo debounce, shorter than the burst
    await nudge('post', 1, 250);
    await nudge('post', -1, 120);
    var b1chip = chip('post');
    await burstEnd();
    var sb = await take();
    add('B1', 'a burst (▼ ▼ ▼ ▲, one 900 ms gap) moves Post 2 weeks, to 11/16, labelled "Pushed 2 wks"',
      startsOf(sb).post === '2026-11-16' && b1chip === 'Pushed 2 wks' && same(withStart(startsOf(sb), 'post', st0.post), st0),
      {post: startsOf(sb).post, chip: b1chip}, '2026-11-16, "Pushed 2 wks"');
    await undo();
    var ub = await take();
    add('B2', '... and ONE Undo takes the whole burst back', same(ub, s0), same(ub, s0) ? 'identical' : startsOf(ub), 'identical to the loaded state');

    await nudge('post', 1, 120);
    var b3a = chip('post');
    document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
    await T.sleep(100);
    var b3cleared = chip('post') === '';
    await nudge('post', 1, 120);
    var b3b = chip('post');
    await burstEnd();
    var s3 = await take();
    await undo();
    var s3u = await take();
    await undo();
    var s3uu = await take();
    add('B3', 'a click elsewhere ends a burst: ▼, a click on the page, ▼ = two steps, each labelled "Pushed 1 wk"',
      b3a === 'Pushed 1 wk' && b3cleared && b3b === 'Pushed 1 wk' && startsOf(s3).post === '2026-11-16'
        && startsOf(s3u).post === '2026-11-09' && same(s3uu, s0),
      {chips: [b3a, b3cleared, b3b], post: [startsOf(s3).post, startsOf(s3u).post, startsOf(s3uu).post]},
      '"Pushed 1 wk" twice; 11/16, then one Undo 11/9, then 11/2');

    // ---- N: an edited automatic note ----
    var prodNoteMoved = Object.assign({}, n0, {'2026-06-29': 'PROD-EXTRA'});
    await nudge('production', 1, 150);
    await nudge('production', -1, 120);
    var n1chip = chip('production');
    await burstEnd();
    // Nothing changed, so the burst banked no step; the page is still dirty from the title, so a backup still comes.
    var sn1 = await take();
    add('N1', '▼ ▲ inside one burst on Production: "Back where it was", and the calendar (its edited note too) exactly as it was',
      n1chip === 'Back where it was' && same(sn1, s0), same(sn1, s0) ? {chip: n1chip} : {chip: n1chip, starts: startsOf(sn1), notes: notesOf(sn1)},
      '"Back where it was", identical to the loaded state');
    await nudge('production', 1, 120);
    await burstEnd();
    var sn = await take();
    add('N2', 'Production ▼ (7/6): its standard line leaves the edited note, "PROD-EXTRA" stays on 6/29/26, every typed note stays',
      startsOf(sn).production === '2026-07-06' && same(notesOf(sn), prodNoteMoved), {start: startsOf(sn).production, notes: notesOf(sn)},
      '6/29/26 "PROD-EXTRA", every other note as loaded');
    await undo();
    var nu = await take();
    var n1back = same(nu, s0);

    // ---- M: Production and its day marks ----
    await nudge('production', -1, 150);
    var mChip = chip('production');
    await burstEnd();
    var sm = await take();
    await undo();
    var smu = await take();
    $('shift-back-btn').click();
    await T.sleep(900);
    var sAll = await take();
    await undo();
    var sAllu = await take();
    add('M1', 'Production ▲: only Production moves (6/22), the Fall Break inside it stays, and its marks land where ← 1 wk puts them',
      same(startsOf(sm), withStart(st0, 'production', '2026-06-22')) && same(sm.fields.hiatuses, s0.fields.hiatuses)
        && same(notesOf(sm), prodNoteMoved) && !same(sm.dayOverrides, s0.dayOverrides) && same(sm.dayOverrides, sAll.dayOverrides)
        && same(smu, s0) && same(sAllu, s0) && /^Pulled 1 wk/.test(mChip),
      {starts: startsOf(sm), notes: notesOf(sm), marks: sm.dayOverrides, allMarks: sAll.dayOverrides, was: s0.dayOverrides, chip: mChip, undone: [same(smu, s0), same(sAllu, s0)]},
      'production 2026-06-22; marks = ← 1 wk\'s, not the loaded ones');

    // ---- K / E / D: the phase kinds ----
    await nudge('prePrep', 1, 150);
    var k1 = val('start-prePrep');
    await undo();
    add('K1', 'Pre Prep (Snap to Monday off, Wed 4/8): ▼ = Wed 4/15', k1 === '2026-04-15' && val('start-prePrep') === '2026-04-08',
      {after: k1, undone: val('start-prePrep')}, '2026-04-15, then 2026-04-08');

    var anchorSel = row('localization').querySelector('select.phase-anchor');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(anchorSel, 'ends');
    anchorSel.dispatchEvent(new Event('change', {bubbles: true}));
    await T.sleep(900);
    var e0 = {end: val('end-localization'), start: val('start-localization'), on: row('localization').classList.contains('nudge-on')};
    await nudge('localization', 1, 150);
    var e1 = {end: val('end-localization'), start: val('start-localization')};
    await undo();
    var e2 = {end: val('end-localization'), start: val('start-localization')};
    await undo();
    add('E1', 'Localization held by its end (Fri 4/23/27): ▼ moves it to Fri 4/30/27 and the start follows to 3/8/27',
      e0.on && e0.end === '2027-04-23' && e1.end === '2027-04-30' && e1.start === '2027-03-08' && e2.end === '2027-04-23' && e2.start === '2027-03-01'
        && anchorSel.value === 'starts',
      {before: e0, after: e1, undone: e2, back: anchorSel.value}, 'end 4/23 -> 4/30, start 3/1 -> 3/8, both undone');

    T.set('unit-writersRoom', 'dates');
    await T.sleep(900);
    // L2, while a Dates phase (two date boxes) is on screen: the sidebar from 280 to 440 px, as phasesui P6 sweeps it.
    var fp = document.querySelector('.form-panel'), fpStyle = fp.getAttribute('style') || '', l2 = {};
    for(var wi = 0; wi < 6; wi++){
      var w = [280, 300, 335, 348, 380, 440][wi];
      fp.setAttribute('style', fpStyle + ';width:' + w + 'px !important;min-width:' + w + 'px;max-width:' + w + 'px;');
      await T.sleep(250);
      var narrow = [], spill = [], loose = [];
      KEYS.forEach(function (k) {
        var r = row(k), cr = r.getBoundingClientRect();
        r.querySelectorAll('input[type=date]').forEach(function (e) {
          var b = e.getBoundingClientRect();
          if(b.width && b.width < 112) narrow.push((e.id || e.className) + ' ' + Math.round(b.width));
        });
        r.querySelectorAll('.ph-nudge-btn, .ph-nudge-chip').forEach(function (e) {
          var b = e.getBoundingClientRect();
          if(b.width && (b.left < cr.left - 0.5 || b.right > cr.right + 0.5)) spill.push(k + ' ' + e.className);
        });
        var box = r.querySelector('.ph-start-box input'), up = btn(k, -1);
        if(Math.abs(up.getBoundingClientRect().top - box.getBoundingClientRect().top) >= 1) loose.push(k);
      });
      l2[w] = {narrow: narrow, spill: spill, loose: loose, sideways: fp.scrollWidth - fp.clientWidth};
    }
    fp.setAttribute('style', fpStyle);
    await T.sleep(250);
    add('L2', 'at sidebars of 280 to 440 px, with a Dates phase on screen: every date box at least 112 px, no arrow or label outside its card, the arrows level with the box, no sideways scroll',
      Object.keys(l2).every(function (w) { var r = l2[w]; return !r.narrow.length && !r.spill.length && !r.loose.length && r.sideways <= 0; }),
      l2, 'nothing narrow, spilled or loose at any width');
    var d0 = {start: val('start-writersRoom'), end: val('end-writersRoom')};
    await nudge('writersRoom', 1, 150);
    var d1 = {start: val('start-writersRoom'), end: val('end-writersRoom')};
    await undo();
    await undo();
    function plus7(iso){ var d = new Date(iso + 'T00:00:00Z'); return new Date(d.getTime() + 7 * 86400000).toISOString().slice(0, 10); }
    add('D1', 'Writer\'s Rm by Dates: ▼ moves both its dates a week, so its length is unchanged',
      !!d0.end && d1.start === plus7(d0.start) && d1.end === plus7(d0.end) && val('unit-writersRoom') === 'weeks',
      {before: d0, after: d1, unitBack: val('unit-writersRoom')}, 'start and end each +7 days');

    // ---- A: the keyboard ----
    var a = [];
    a.push(altKey('post', 'ArrowDown')); await T.sleep(120);
    a.push(altKey('post', 'ArrowDown')); await T.sleep(120);
    var aPushed = {chip: chip('post'), start: val('start-post')};
    a.push(altKey('post', 'ArrowUp')); await T.sleep(120);
    a.push(altKey('post', 'ArrowUp')); await T.sleep(120);
    var aBack = {chip: chip('post'), start: val('start-post')};
    await burstEnd();
    add('A1', 'Alt+Down twice, Alt+Up twice in Post\'s date box: one burst, "Pushed 2 wks" then "Back where it was"',
      a.every(Boolean) && aPushed.chip === 'Pushed 2 wks' && aPushed.start === '2026-11-16' && aBack.chip === 'Back where it was' && aBack.start === '2026-11-02',
      {prevented: a, pushed: aPushed, back: aBack}, 'all four handled; 11/16, then 11/2');

    // ---- V: the views ----
    await view('month');
    var m0 = monthShown();
    await view('sheet');
    for(var i = 0; i < 5; i++) await nudge('post', 1, 120);
    await burstEnd();
    await view('month');
    var m1 = monthShown();
    var vOn = KEYS.filter(function (k) { return row(k).classList.contains('nudge-on'); });
    var vShown = Array.prototype.filter.call(document.querySelectorAll('.ph-nudge'), function (e) { return getComputedStyle(e).display !== 'none'; }).length;
    var vStart = val('start-post');
    var vPrevented = altKey('post', 'ArrowDown');
    await T.sleep(300);
    var vAfter = val('start-post');
    add('V1', 'the month view keeps its month: five ▼ on Post (35 days) leave it on ' + m0, !!m0 && m1 === m0 && vStart === '2026-12-07',
      {before: m0, after: m1, post: vStart}, m0 + ' both times; post 2026-12-07');
    add('V2', 'in the month view no card shows the arrows, and Alt+Down in a date box does nothing',
      vOn.length === 0 && vShown === 0 && !vPrevented && vAfter === vStart, {nudgeOn: vOn, shown: vShown, prevented: vPrevented, post: vAfter}, 'none, 0, not handled');
    await view('sheet');
    await undo();

    // ---- H: no date, no arrows ----
    T.set('start-localization', '');
    await T.sleep(400);
    var h0 = row('localization').classList.contains('nudge-on');
    T.set('start-localization', '2027-03-01');
    await T.sleep(400);
    var h1 = row('localization').classList.contains('nudge-on');
    add('H1', 'a phase with no date shows no arrows; given its date back, it shows them again', !h0 && h1, {empty: h0, back: h1}, 'false, then true');

    var sf = await take();
    add('F1', 'every move undone: the calendar is the one it started as (and the edited note came back with its undo)',
      same(sf, s0) && n1back, same(sf, s0) ? {noteUndo: n1back} : {starts: startsOf(sf), notes: notesOf(sf), stores: postStores(sf)}, 'identical to the loaded state');

    // ---- S1: the save format ----
    var keys0 = Object.keys(s0.fields.byId).sort().join(), top0 = Object.keys(s0).sort().join();
    var drift = snaps.filter(function (s) { return Object.keys(s.fields.byId).sort().join() !== keys0; }).length;
    var topDrift = snaps.filter(function (s) { return Object.keys(s).filter(function (k) { return top0.split(',').indexOf(k) < 0; }).length; }).length;
    add('S1', 'no new key in fields.byId, and no new top-level key, in any of the ' + snaps.length + ' snapshots',
      drift === 0 && topDrift === 0 && snaps.length >= 15, {snapshots: snaps.length, drift: drift, topDrift: topDrift}, '0 and 0');

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'phasearrows', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
