// phasesmore -- every phase card shows every one of its switches; the all-phase hiatus cards open folded.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phasesmore 300
//   HARNESS_PAGE=/dist/index.html HARNESS_WINDOW=1280,943 ./run.sh phasesmore 300    (a 1280 x 800 laptop page)
//
// Audit 2.14 (AUD2-036, v1.15.0) hid each phase card's rarely used switches behind a "More options" line. The owner
// removed that on 16 Nov 2026 ("get rid of the entire hiding menu - leave the options as they were before"), so this
// leg now holds the opposite: every switch on show, on every card, whatever it is set to, and no More options line.
// AUD2-036's other half, the all-phase hiatus cards opening folded, stays and is still checked here (M3, M6, M8).
//
// Starts on a NEW calendar (no state), then loads tests/fixtures/phasesmore.sptcal through the Load picker: a
// synthetic calendar (fill-intent's phases) with options switched on: Pre-Prep's Snap to Monday off, Post's own
// hiatus on, the custom phase Research with Number weeks off and Hide in waterfall on, and two all-phase hiatuses,
// one of them unlocked.
//
// CASES
//   M1  a new calendar: every card shows every switch it has (Snap to Monday, Number weeks, Hide in waterfall,
//       Hiatus, Simultaneous Post), on or off, and there is no "More options" line anywhere
//   M3  the four winter breaks start FOLDED to their head, which still shows their dates
//   M5  a switch turned on and undone stays on show both ways (nothing hides a switch by its value)
//   M6  + Add hiatus period adds an OPEN card; the folded ones stay folded
//   M8  a loaded calendar: every switch on every card on show, set or not, Post's hiatus fields with it; both hiatus
//       cards folded; no "More options" line
//   Z   no console error
// Red on v1.15.0 at M1, M5 and M8 (the switches a closed More options hid).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'phasesmore', vw: innerWidth, vh: innerHeight}, cases = [];
  function add(id, title, pass, got, want){ cases.push({id: id, title: title, pass: !!pass, got: got, want: want}); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function $id(id){ return document.getElementById(id); }
  var RARE = '.phase-switches > .phase-snap, .phase-switches > .phase-wknum, .phase-switches > .phase-hidewf, .phase-hiatus > .phase-hiatus-toggle, .simpost-panel > .simpost-toggle';
  // The phase cards that carry switches (the Prep row has none of these).
  function cards(){ return qa('#phase-rows > .phase-row, #custom-phase-rows > .phase-row').filter(function (r) { return r.querySelector(':scope > .swatch[id^="swatch-"]') && r.querySelector(':scope > .phase-switches'); }); }
  function keyOf(row){ return row.querySelector(':scope > .swatch').id.slice(7); }
  function vis(el){ return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  function hiatusRows(){ return qa('#hiatus-list > .hiatus-entry'); }
  function folds(){ return hiatusRows().map(function (r) { return r.classList.contains('is-collapsed'); }); }
  async function settle(label){
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () { var n = ($id('table-wrap') || {innerHTML: ''}).innerHTML.length; st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3; }, label || 'the grid to settle', 150, 100);
  }
  async function phasesTab(){ var tab = q('.side-tab-btn[data-tab="phases"]'); if(tab) tab.click(); await T.sleep(200); }
  var loads = 0;
  function menuLabel(){ return (($id('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text){
    var stem = 'phasesmore-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, {text: text});
    for(var i = 0; i < 40; i++){ await T.sleep(100); if(T.clickModalButton('Load') || T.clickModalButton('Discard') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle('the loaded calendar');
  }
  try {
    await T.appReady();
    await phasesTab();
    await T.sleep(300);

    // ---- M1 ----
    var ks = cards().map(keyOf);
    function perCard(){
      var o = {};
      cards().forEach(function (r) { var sw = qa(RARE, r); o[keyOf(r)] = {all: sw.length, shown: sw.filter(vis).length}; });
      return o;
    }
    function allShown(pc){ return Object.keys(pc).every(function (k) { return pc[k].all >= 3 && pc[k].shown === pc[k].all; }); }
    var pc1 = perCard(), noMore1 = !document.querySelector('.phase-more-btn');
    add('M1', 'a new calendar: every card shows every switch it has, on or off, and there is no "More options" line',
        ks.length >= 6 && allShown(pc1) && noMore1, {cards: pc1, moreLines: document.querySelectorAll('.phase-more-btn').length},
        'every switch shown, at least 3 a card; no More options');

    // ---- M3 ----
    var f3 = folds(), ranges = hiatusRows().map(function (r) { var e = r.querySelector('.hiatus-range'); return vis(e) ? e.textContent.trim() : ''; });
    var bodies = hiatusRows().map(function (r) { return vis(r.querySelector('.hiatus-body')); });
    add('M3', 'the four winter breaks start folded to their head, which still shows their dates',
        f3.length === 4 && f3.every(Boolean) && ranges.every(function (t) { return /→/.test(t); }) && bodies.every(function (b) { return !b; }),
        {folded: f3, heads: ranges, bodiesShown: bodies}, 'four folded, dates on each head');

    // ---- M5 ----
    var hideRow = $id('swatch-prePrep').parentElement.querySelector('.phase-hidewf');
    var shownOff = vis(hideRow);
    hideRow.click(); await T.sleep(200); await settle('Pre-Prep hidden in the waterfall');
    var cbOn = hideRow.querySelector('input').checked, shownOn = vis(hideRow);
    $id('undo-btn').click(); await T.sleep(400); await settle('the undo');
    // The undo puts back the sidebar tab its snapshot was taken on (sidebarTab is saved state), so look on Phases.
    var tabAfterUndo = (q('.side-tab-btn[aria-selected="true"], .side-tab-btn.active') || {dataset: {}}).dataset.tab || null;
    await phasesTab();
    var cbOff = !hideRow.querySelector('input').checked, shownBack = vis(hideRow);
    add('M5', 'a switch turned on and undone stays on show both ways',
        shownOff && cbOn && shownOn && cbOff && shownBack, {shownOff: shownOff, on: cbOn, shownOn: shownOn, undone: cbOff, shownAfterUndo: shownBack, tabAfterUndo: tabAfterUndo}, 'on show throughout');

    // ---- M6 ----
    $id('add-hiatus').click(); await T.sleep(300); await settle('a new hiatus');
    var f6 = folds();
    add('M6', '+ Add hiatus period adds an OPEN card; the folded ones stay folded',
        f6.length === 5 && f6.slice(0, 4).every(Boolean) && f6[4] === false && vis(hiatusRows()[4].querySelector('.hiatus-body')),
        {folds: f6, bodyShown: vis(hiatusRows()[4].querySelector('.hiatus-body')), body: hiatusRows()[4].querySelector('.hiatus-body') && getComputedStyle(hiatusRows()[4].querySelector('.hiatus-body')).display}, '[true,true,true,true,false]');

    // ---- M8: a loaded calendar ----
    var text = await (await fetch('/tests/fixtures/phasesmore.sptcal')).text();
    await load(text);
    await phasesTab(); await T.sleep(300);
    var pc8 = perCard(), f8 = folds(), noMore8 = !document.querySelector('.phase-more-btn');
    var postFields = vis($id('phiatus-fields-post')) && vis($id('phiatus-start-post'));
    add('M8', 'a loaded calendar: every switch on every card on show, set or not; Post\'s hiatus fields; its hiatus cards folded',
        allShown(pc8) && Object.keys(pc8).length >= 7 && postFields && f8.length === 2 && f8.every(Boolean) && noMore8,
        {cards: pc8, postHiatusFields: postFields, folds: f8, moreLines: document.querySelectorAll('.phase-more-btn').length}, {folds: [true, true]});
  } catch (e) { out.EX = String(e && e.stack || e); }
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  add('Z', 'no console error', !errs.length, errs.slice(0, 3), []);
  if(out.EX) add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  out.cases = cases;
  out.pass = !out.EX && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
