// mvdragcarry -- the month view's body drag carries what the phase card's ▲ / ▼ carry (PHASE-WEEK-ARROWS-PLAN.md §5;
// owner, 4 Nov 2026, by picker: "yes, as its own change, right after the arrows"). Tracker card month-drag-carries-phase.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvdragcarry ./run.sh mvdragcarry 400
//
// Before this, a phase dragged by its bar in the month view moved its start date and nothing else: its own hiatus stayed
// on its old dates, and its "<week>|<key>" stores (band colours, cell spans, column swaps, its text styles) stayed on
// its old weeks, where the arrows and the Shift tool carry them. Now the drag carries them with the arrows' own mover
// (carryPhaseDrag -> shiftCalendar's one-phase part move, carryOnly), by the whole weeks the phase's run moved, and
// always FROM THE PRESS: every increment puts the stores back to their press copies and carries them once.
//
// THE CALENDAR: tests/fixtures/mvdragcarry.sptcal, which is the arrows' own phasearrows.sptcal plus ONE stale band label
// ("Old Break Name" keyed 7/6/26, a week with no band, one week above the held Summer Break's 7/13), so a drag and an
// arrow can be compared snapshot for snapshot: Post 11/2/26 with its own one-week hiatus "Post Pause" 1/4/27 and four stores keyed "<week>|post" (a cell
// span and a bold phase text style on 11/23, Post Pause's band colour on 1/4/27, and Post's half of a column swap with
// Production on 11/2, the week they share); Production 6/29/26 with four day marks and an edited "Start Principal
// Photography 6/29/26" + "PROD-EXTRA" note; locked Summer Break and Christmas hiatuses, an unlocked Fall Break, a range
// start of 2/2/26, typed week notes. It opens in the waterfall on the Phases tab.
//
// The drags are SYNTHETIC mouse events, as monthdragundo's are: they drive the gesture's handlers, which is what is
// under test here. That the pill is reachable by a real pointer is pilldrag's job (trusted CDP input).
// Every state is read back from the crash backup, which IS captureSnapshot(), copied on read (phasearrows' take()).
//
//   T0  truth guard: the calendar as loaded; the month view on November 2026 shows Post's bar
//   W1  Post dragged one row down (held 1.5 s mid-gesture, past the undo debounce), released: Post 11/9, its own hiatus
//       1/11/27, its four Post stores a week later, Production's half of the swap still on 11/2, and every other phase,
//       typed note, all-phase hiatus, the range and the day marks where they were. Since 5 Nov 2026 (stalebandkey) the
//       band labels too: the stale "Old Break Name" stays on 7/6 (it used to move onto Summer Break's week and yield)
//   L1  ... the own hiatus read 1/11/27 WHILE the button was still down: the live month view shows it travelling
//   U1  ONE Undo puts the calendar back as it was, snapshot for snapshot (the drag was one step)
//   A1  ⭐ the drag = Post ▼: the same calendar, snapshot for snapshot (bar the view it was made in)
//   O1  out and back in ONE gesture (down 1, down 2, right 3, back up, up 1 more, home): mid-gesture at down 2 the
//       backup shows Post 11/16, its hiatus 1/18/27 and its stores two weeks on; at up 1, 10/26 and 12/28/26
//   O2  ... released at home: the calendar exactly as it was, every store included
//   O3  ... the stale label is on 7/6. ⭐ Written as the case for carrying FROM THE PRESS: a one-phase move re-keyed a
//       plain band key that sits on no band, and the first row down landed this one on Summer Break's 7/13, where it
//       YIELDED (shiftKeyedMap) and was gone, so carried step to step it never came back (red on that mutant). Since
//       5 Nov 2026 a stale plain key stays on a one-phase move (stalebandkey), so the label never leaves 7/6 and the
//       step-to-step mutant passes here too; carrying from the press is now what guards a store added later
//   K1  by whole weeks of the run: right 3 days (Thu 11/5) carries nothing; a row and 3 days (Thu 11/12) carries one
//       week; a row and 6 days (Sun 11/15, still the 11/9 week) still one; two rows (11/16) two. Released at Thu 11/12:
//       Snap to Monday off (the 18 Sep 2026 ruling), Post Pause on Monday 1/11/27 (whole weeks keep its weekday), the
//       stores a week on; one Undo restores it all
//   P1  Production dragged one row down = Production ▼, snapshot for snapshot: its day marks by shoot-day number
//       (not the loaded ones), its half of the swap to 11/9 while Post's stays on 11/2, the edited note shedding its
//       standard line ("PROD-EXTRA" alone on 6/29) as the arrows' N2 does
//   E1  Localization held by its END, with its own hiatus 3/22/27: right 3 days moves neither the end nor the hiatus;
//       right 4 days moves the end Friday a week (4/30/27) and the hiatus with it (3/29/27); one Undo restores both
//   E2  ... and a row down = Localization ▼, snapshot for snapshot
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
  async function nudge(key, dir){ btn(key, dir).click(); await T.sleep(150); }
  async function burstEnd(){ await T.sleep(1900); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await T.sleep(700); }
  function canon(o){
    if(Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
    if(o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(o[k]); }).join(',') + '}';
    return JSON.stringify(o);
  }
  function same(a, b){ return canon(a) === canon(b); }
  // A drag is made in the month view and an arrow in the waterfall; the view is the one thing that may differ.
  function noView(s){ var o = Object.assign({}, s); delete o.viewMode; return o; }
  function sameCal(a, b){ return same(noView(a), noView(b)); }
  var lastAt = 0, snaps = [];
  async function take(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    // ⚠️ COPIED, never kept as read: the in-memory IndexedDB keeps the live userNotes by reference (phasearrows' take()).
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
  // Everything a one-phase move must leave alone. The all-phase bands' labels included, the PLAIN keys (a "<week>|post"
  // label is Post's own and moves with it) (stalebandkey, 5 Nov 2026): the stale "Old Break Name" on 7/6 used to move
  // onto Summer Break's 7/13 and yield there.
  function plainLabels(s){ var o = {}; Object.keys(s.hiatusTexts || {}).forEach(function (k) { if(k.indexOf('|') < 0) o[k] = s.hiatusTexts[k]; }); return o; }
  function restSame(s, base){
    return same(notesOf(s), notesOf(base)) && same(s.fields.hiatuses, base.fields.hiatuses)
      && same(s.fields.byId['cal-range-start'], base.fields.byId['cal-range-start']) && same(plainLabels(s), plainLabels(base));
  }

  // ---- the month view ----
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthShown(){ var e = document.querySelector('#table-wrap .mv-monthyear'); return e ? e.textContent.trim() : ''; }
  function monthIdx(t){ var p = String(t).trim().split(/\s+/); return +p[1] * 12 + MONTHS.indexOf(p[0]); }
  async function gotoMonth(label){
    var want = monthIdx(label);
    for(var i = 0; i < 40 && monthIdx(monthShown()) !== want; i++){
      $(monthIdx(monthShown()) < want ? 'mv-next' : 'mv-prev').click();
      await T.sleep(200);
    }
    await T.sleep(200);
    return monthShown();
  }
  // The gesture, as installMonthPillDrag reads it: days = round(dx / day column) + round(dy / that bar's week row) * 7.
  function pillOf(key){ return document.querySelector('#table-wrap .mv-pill[data-ph="' + key + '"]'); }
  function press(key){
    var p = pillOf(key);
    if(!p) throw new Error('no month bar for ' + key + ' on ' + monthShown());
    var r = p.getBoundingClientRect();
    var g = {x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2,
             dayW: document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect().width,
             weekH: p.closest('.mv-week').getBoundingClientRect().height};
    p.dispatchEvent(new MouseEvent('mousedown', {clientX: g.x, clientY: g.y, button: 0, buttons: 1, bubbles: true, cancelable: true}));
    return g;
  }
  // ⛔ buttons:1 is load-bearing: a move with the button up is read as a release the page never saw (monthdragundo).
  function moveTo(g, days, rows){
    g.cx = g.x + days * g.dayW; g.cy = g.y + rows * g.weekH;
    window.dispatchEvent(new MouseEvent('mousemove', {clientX: g.cx, clientY: g.cy, button: 0, buttons: 1, bubbles: true, cancelable: true}));
  }
  async function release(g){
    window.dispatchEvent(new MouseEvent('mouseup', {clientX: g.cx, clientY: g.cy, button: 0, buttons: 0, bubbles: true}));
    await T.sleep(400);
  }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(($('meta-production') || {}).textContent || ''); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A loaded calendar is clean, and a clean page writes no backup: one edit that is not a schedule input.
    T.set('show-title', 'Drag Carry');
    await T.sleep(700);   // past the undo debounce, so the title is its own step
    var s0 = await take();
    var st0 = startsOf(s0), ph0 = phiatusOf(s0), ps0 = postStores(s0), n0 = notesOf(s0);
    await view('month');
    var onNov = await gotoMonth('November 2026');
    var bar0 = !!pillOf('post');
    add('T0', 'the calendar as loaded (Post 11/2/26, Post Pause 1/4/27, the four Post stores, the edited Production note); the month view on November 2026 shows Post\'s bar',
      same(st0, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-02', localization: '2027-03-01'})
        && ph0.post === '2027-01-04'
        && same(ps0, {spans: ['2026-11-23|post'], style: ['2026-11-23|post'], colors: ['2027-01-04|post'], swaps: ['2026-11-02|post', '2026-11-02|production']})
        && n0['2026-06-29'] === 'Start Principal Photography 6/29/26\nPROD-EXTRA' && onNov === 'November 2026' && bar0
        && s0.hiatusTexts['2026-07-06'] === 'Old Break Name' && s0.hiatusTexts['2026-07-13'] === 'Summer Break',
      {starts: st0, phiatus: ph0, stores: ps0, month: onNov, bar: bar0, bandLabels: s0.hiatusTexts}, 'the fixture as written, and Post\'s bar on November 2026');

    // ---- W1 / L1 / U1: one row down ----
    var g = press('post');
    moveTo(g, 0, 1);
    var live = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    await T.sleep(1500);  // held, longer than the 500 ms undo debounce: the drag must still be ONE step
    await release(g);
    var sD = await take();
    add('W1', 'Post dragged one row down: Post 11/9, its own hiatus 1/11/27, its four stores a week on (Production\'s half of the swap stays on 11/2); every other phase, typed note, all-phase hiatus and its label (the stale one on 7/6 too), the range and the day marks stay',
      same(startsOf(sD), withStart(st0, 'post', '2026-11-09')) && same(phiatusOf(sD), withStart(ph0, 'post', '2027-01-11'))
        && same(postStores(sD), {spans: ['2026-11-30|post'], style: ['2026-11-30|post'], colors: ['2027-01-11|post'], swaps: ['2026-11-02|production', '2026-11-09|post']})
        && restSame(sD, s0) && same(sD.dayOverrides, s0.dayOverrides),
      {starts: startsOf(sD), phiatus: phiatusOf(sD), stores: postStores(sD), rest: restSame(sD, s0), labels: plainLabels(sD), marks: same(sD.dayOverrides, s0.dayOverrides)},
      'post 11/9, Post Pause 1/11/27, stores 11/30 / 1/11/27 / 11/9, the rest as loaded');
    add('L1', '... the own hiatus read 1/11/27 while the button was still down (the live month view shows it travelling with the bar)',
      live.start === '2026-11-09' && live.hiatus === '2027-01-11', live, 'start 2026-11-09, hiatus 2027-01-11 mid-gesture');
    await undo();
    var sU = await take();
    add('U1', 'ONE Undo puts the calendar back as it was, snapshot for snapshot: the drag, pause and all, was one step',
      sameCal(sU, s0), sameCal(sU, s0) ? 'identical' : {starts: startsOf(sU), phiatus: phiatusOf(sU), stores: postStores(sU)}, 'identical to the loaded state');

    // ---- A1: the same as the arrow ----
    await view('sheet');
    await nudge('post', 1);
    await burstEnd();
    var sA = await take();
    await undo();
    var sAu = await take();
    add('A1', 'the drag = Post ▼ in the waterfall: the same calendar, snapshot for snapshot (bar the view each was made in)',
      sameCal(sD, sA) && sameCal(sAu, s0),
      sameCal(sD, sA) ? {undone: sameCal(sAu, s0)} : {drag: {starts: startsOf(sD), phiatus: phiatusOf(sD), stores: postStores(sD), notes: notesOf(sD)},
                                                     arrow: {starts: startsOf(sA), phiatus: phiatusOf(sA), stores: postStores(sA), notes: notesOf(sA)}},
      'identical');
    await view('month');
    await gotoMonth('November 2026');

    // ---- O1 / O2: out and back in one gesture ----
    g = press('post');
    moveTo(g, 0, 1);
    moveTo(g, 0, 2);
    var o2live = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    var sO2 = await take();   // held until the crash backup writes the mid-gesture calendar
    moveTo(g, 3, 2);
    moveTo(g, 3, 0);
    moveTo(g, 0, 0);
    moveTo(g, 0, -1);
    var oUp = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    var sOu = await take();
    moveTo(g, 0, 0);
    await release(g);
    var sO = await take();
    add('O1', 'out and back in ONE gesture: two rows down, the backup shows Post 11/16, Post Pause 1/18/27 and its stores two weeks on; one row up, 10/26 and 12/28/26 and a week back',
      o2live.start === '2026-11-16' && o2live.hiatus === '2027-01-18' && startsOf(sO2).post === '2026-11-16' && phiatusOf(sO2).post === '2027-01-18'
        && same(postStores(sO2), {spans: ['2026-12-07|post'], style: ['2026-12-07|post'], colors: ['2027-01-18|post'], swaps: ['2026-11-02|production', '2026-11-16|post']})
        && oUp.start === '2026-10-26' && oUp.hiatus === '2026-12-28'
        && same(postStores(sOu), {spans: ['2026-11-16|post'], style: ['2026-11-16|post'], colors: ['2026-12-28|post'], swaps: ['2026-10-26|post', '2026-11-02|production']}),
      {down2: {live: o2live, stores: postStores(sO2)}, up1: {live: oUp, stores: postStores(sOu)}},
      '11/16 + 1/18/27 + stores 12/7, 1/18/27, 11/16; then 10/26 + 12/28/26 + stores 11/16, 12/28/26, 10/26');
    add('O2', '... released at home: the calendar exactly as it was, every carried store included',
      sameCal(sO, s0), sameCal(sO, s0) ? 'identical' : {starts: startsOf(sO), phiatus: phiatusOf(sO), stores: postStores(sO)}, 'identical to the loaded state');
    add('O3', '... and the stale band label "Old Break Name" is on 7/6 and Summer Break keeps its own name on 7/13',
      sO.hiatusTexts['2026-07-06'] === 'Old Break Name' && sO.hiatusTexts['2026-07-13'] === 'Summer Break', sO.hiatusTexts,
      '7/6 Old Break Name, 7/13 Summer Break');

    // ---- K1: by whole weeks of the run ----
    g = press('post');
    moveTo(g, 3, 0);
    var k3 = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    moveTo(g, 3, 1);
    var k10 = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    moveTo(g, 6, 1);
    var k13 = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    moveTo(g, 0, 2);
    var k14 = {start: val('start-post'), hiatus: val('phiatus-start-post')};
    moveTo(g, 3, 1);
    await release(g);
    var sK = await take();
    var kSnap = (sK.fields.byId['snap-post'] || {}).checked;
    await undo();
    var sKu = await take();
    add('K1', 'by the whole weeks the run moved: Thu 11/5 carries nothing, Thu 11/12 and Sun 11/15 one week, Mon 11/16 two; dropped on Thu 11/12, Snap to Monday comes off, Post Pause sits on Monday 1/11/27, the stores a week on, and ONE Undo restores it all',
      k3.start === '2026-11-05' && k3.hiatus === '2027-01-04' && k10.start === '2026-11-12' && k10.hiatus === '2027-01-11'
        && k13.start === '2026-11-15' && k13.hiatus === '2027-01-11' && k14.start === '2026-11-16' && k14.hiatus === '2027-01-18'
        && startsOf(sK).post === '2026-11-12' && kSnap === false && phiatusOf(sK).post === '2027-01-11'
        && same(postStores(sK), {spans: ['2026-11-30|post'], style: ['2026-11-30|post'], colors: ['2027-01-11|post'], swaps: ['2026-11-02|production', '2026-11-09|post']})
        && sameCal(sKu, s0),
      {steps: [k3, k10, k13, k14], dropped: {start: startsOf(sK).post, snap: kSnap, hiatus: phiatusOf(sK).post, stores: postStores(sK)}, undone: sameCal(sKu, s0)},
      '1/4, 1/11, 1/11, 1/18; dropped 11/12, snap off, 1/11/27, stores a week on; undone');

    // ---- P1: Production, the same as its arrow ----
    var prodNoteMoved = Object.assign({}, n0, {'2026-06-29': 'PROD-EXTRA'});
    await gotoMonth('June 2026');
    g = press('production');
    moveTo(g, 0, 1);
    await T.sleep(300);
    await release(g);
    var sP = await take();
    await undo();
    var sPu = await take();
    await view('sheet');
    await nudge('production', 1);
    await burstEnd();
    var sPA = await take();
    await undo();
    var sPAu = await take();
    add('P1', 'Production dragged one row down = Production ▼, snapshot for snapshot: 7/6, its marks by shoot-day number (not the loaded ones), its half of the swap to 11/9 (Post\'s stays on 11/2), "PROD-EXTRA" alone on 6/29; one Undo each',
      same(startsOf(sP), withStart(st0, 'production', '2026-07-06')) && !same(sP.dayOverrides, s0.dayOverrides)
        && same(postStores(sP).swaps, ['2026-11-02|post', '2026-11-09|production']) && same(notesOf(sP), prodNoteMoved)
        && sameCal(sP, sPA) && sameCal(sPu, s0) && sameCal(sPAu, s0),
      {drag: {start: startsOf(sP).production, marks: sP.dayOverrides, swaps: postStores(sP).swaps, note: notesOf(sP)['2026-06-29']},
       arrow: sameCal(sP, sPA) ? 'identical' : {start: startsOf(sPA).production, marks: sPA.dayOverrides, swaps: postStores(sPA).swaps, note: notesOf(sPA)['2026-06-29']},
       undone: [sameCal(sPu, s0), sameCal(sPAu, s0)]},
      'production 7/6, marks moved, swaps 11/2 post + 11/9 production, PROD-EXTRA; identical to the arrow');

    // ---- E1 / E2: a phase held by its end, with its own hiatus ----
    var anchorSel = row('localization').querySelector('select.phase-anchor');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(anchorSel, 'ends');
    anchorSel.dispatchEvent(new Event('change', {bubbles: true}));
    await T.sleep(900);
    $('phiatus-en-localization').click();
    await T.sleep(900);   // each its own undo step (the debounce is 500 ms): F1 undoes exactly three
    T.set('phiatus-start-localization', '2027-03-22');
    T.set('phiatus-weeks-localization', '1');
    await T.sleep(900);
    var sE0 = await take();
    var e0 = {end: val('end-localization'), start: val('start-localization'), hiatus: val('phiatus-start-localization')};
    await view('month');
    await gotoMonth(MONTHS[+e0.start.slice(5, 7) - 1] + ' ' + e0.start.slice(0, 4));
    g = press('localization');
    moveTo(g, 3, 0);
    var e3 = {end: val('end-localization'), hiatus: val('phiatus-start-localization')};
    moveTo(g, 4, 0);
    var e4 = {end: val('end-localization'), hiatus: val('phiatus-start-localization')};
    await release(g);
    var sE = await take();
    await undo();
    var sEu = await take();
    add('E1', 'Localization held by its END (4/23/27) with its own hiatus 3/22/27: right 3 days moves neither; right 4 days moves the end Friday a week (4/30/27) and the hiatus with it (3/29/27); one Undo restores both',
      e0.end === '2027-04-23' && e0.hiatus === '2027-03-22' && e3.end === '2027-04-23' && e3.hiatus === '2027-03-22'
        && e4.end === '2027-04-30' && e4.hiatus === '2027-03-29'
        && ((sE.fields.byId['end-localization'] || {}).value) === '2027-04-30' && phiatusOf(sE).localization === '2027-03-29'
        && sameCal(sEu, sE0),
      {before: e0, right3: e3, right4: e4, undone: sameCal(sEu, sE0)}, 'end 4/23 + 3/22, then 4/30 + 3/29, then undone');
    g = press('localization');
    moveTo(g, 0, 1);
    await release(g);
    var sE2 = await take();
    await undo();
    await view('sheet');
    await nudge('localization', 1);
    await burstEnd();
    var sE2A = await take();
    await undo();
    var sE2Au = await take();
    add('E2', '... and a row down = Localization ▼, snapshot for snapshot (end 4/30/27, its hiatus 3/29/27)',
      sameCal(sE2, sE2A) && ((sE2.fields.byId['end-localization'] || {}).value) === '2027-04-30' && phiatusOf(sE2).localization === '2027-03-29'
        && sameCal(sE2Au, sE0),
      sameCal(sE2, sE2A) ? {undone: sameCal(sE2Au, sE0)}
        : {drag: {end: (sE2.fields.byId['end-localization'] || {}).value, start: startsOf(sE2).localization, hiatus: phiatusOf(sE2).localization},
           arrow: {end: (sE2A.fields.byId['end-localization'] || {}).value, start: startsOf(sE2A).localization, hiatus: phiatusOf(sE2A).localization}},
      'identical');
    // Back to the loaded calendar: the hiatus and the Ends switch were three steps (the switch, the tick, the two dates).
    await undo(); await undo(); await undo();
    var sF = await take();
    add('F1', 'every move undone: the calendar is the one it started as', sameCal(sF, s0),
      sameCal(sF, s0) ? 'identical' : {starts: startsOf(sF), phiatus: phiatusOf(sF), stores: postStores(sF), end: (sF.fields.byId['end-localization'] || {}).value},
      'identical to the loaded state');

    // ---- S1: the save format ----
    var keys0 = Object.keys(s0.fields.byId).sort().join(), top0 = Object.keys(s0).sort();
    var drift = snaps.filter(function (s) { return Object.keys(s.fields.byId).sort().join() !== keys0; }).length;
    // phaseEnds is the one the E section's own setup writes (Localization held by its end), and only as that.
    var topDrift = snaps.filter(function (s) {
      return Object.keys(s).some(function (k) { return top0.indexOf(k) < 0 && !(k === 'phaseEnds' && same(s.phaseEnds, ['localization'])); });
    }).length;
    add('S1', 'no new key in fields.byId, and no new top-level key (bar E\'s own phaseEnds: ["localization"]), in any of the ' + snaps.length + ' snapshots',
      drift === 0 && topDrift === 0 && snaps.length >= 15, {snapshots: snaps.length, drift: drift, topDrift: topDrift}, '0 and 0');

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'mvdragcarry', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
