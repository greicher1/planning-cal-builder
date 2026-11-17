// phasesmore -- the Phases tab without the wall of switches (audit 2.14, AUD2-036).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phasesmore 300
//   HARNESS_PAGE=/dist/index.html HARNESS_WINDOW=1280,943 ./run.sh phasesmore 300    (a 1280 x 800 laptop page)
//
// Starts on a NEW calendar (no state), then loads tests/fixtures/phasesmore.sptcal through the Load picker: a
// synthetic calendar (fill-intent's phases) with options switched on: Pre-Prep's Snap to Monday off, Post's own
// hiatus on, the custom phase Research with Number weeks off and Hide in waterfall on, and two all-phase hiatuses,
// one of them unlocked.
//
// CASES
//   M1  a new calendar: no rare switch on show on any card (Snap to Monday, Number weeks, Hide in waterfall, Hiatus,
//       Simultaneous Post), and every card ends with "More options" (a button, no id, aria-expanded=false)
//   M2  every id'd control is still in the document, and toggling More options adds or removes none
//       (T.formSignature's key set) and banks no undo step
//   M3  the four winter breaks start FOLDED to their head, which still shows their dates
//   M4  More options shows the card's switches and reads "Fewer options"; again, they hide
//   M5  a switch turned on while open stays on show once More options closes; undoing it hides it again
//   M6  + Add hiatus period adds an OPEN card; the folded ones stay folded
//   M7  the tab is shorter: the controls on show, and the Phases card's height, against everything opened
//   M8  a loaded calendar: every switch it has set is on show without More options (and only those), Post's hiatus
//       fields with it; both hiatus cards folded; every More options closed
//   Z   no console error
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'phasesmore', vw: innerWidth, vh: innerHeight}, cases = [];
  function add(id, title, pass, got, want){ cases.push({id: id, title: title, pass: !!pass, got: got, want: want}); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function $id(id){ return document.getElementById(id); }
  var RARE = '.phase-switches > .phase-snap, .phase-switches > .phase-wknum, .phase-switches > .phase-hidewf, .phase-hiatus > .phase-hiatus-toggle, .simpost-panel > .simpost-toggle';
  // The phase cards that carry switches (the Prep row has none of these, and no More options).
  function cards(){ return qa('#phase-rows > .phase-row, #custom-phase-rows > .phase-row').filter(function (r) { return r.querySelector(':scope > .swatch[id^="swatch-"]') && r.querySelector(':scope > .phase-switches'); }); }
  function keyOf(row){ return row.querySelector(':scope > .swatch').id.slice(7); }
  function vis(el){ return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  // The rare switch rows on show, as "key:class".
  function rareShown(){
    var o = [];
    cards().forEach(function (r) { qa(RARE, r).forEach(function (sw) { if(vis(sw)) o.push(keyOf(r) + ':' + sw.classList[0]); }); });
    return o;
  }
  function moreBtn(key){ var r = $id('swatch-' + key); return r && r.parentElement.querySelector(':scope > .phase-more-btn'); }
  function hiatusRows(){ return qa('#hiatus-list > .hiatus-entry'); }
  function folds(){ return hiatusRows().map(function (r) { return r.classList.contains('is-collapsed'); }); }
  function controlsOnShow(){
    var tab = q('.form-panel');
    return qa('input:not([type=hidden]), select, textarea, button', tab).filter(function (e) { return e.closest('[data-tab="phases"]') && vis(e); }).length;
  }
  function phasesHeight(){ return Math.round(qa('.form-panel section.card[data-tab="phases"]').reduce(function (t, s) { return t + s.getBoundingClientRect().height; }, 0)); }
  function undoOff(){ return !!$id('undo-btn').disabled; }
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
    var ks = cards().map(keyOf), btns = ks.map(moreBtn);
    var shown1 = rareShown();
    add('M1', 'a new calendar: no rare switch on show, and every card ends with "More options" (a button, no id, closed)',
        ks.length >= 6 && shown1.length === 0 && btns.every(function (b) {
          return b && b.tagName === 'BUTTON' && b.type === 'button' && !b.id && b.getAttribute('aria-expanded') === 'false' &&
                 b.textContent === 'More options' && b === b.parentElement.lastElementChild && vis(b); }),
        {cards: ks, rareShown: shown1, buttons: btns.map(function (b) { return b && [b.textContent, b.id, b.getAttribute('aria-expanded'), vis(b)]; })}, {rareShown: []});

    // ---- M2 / M4 ----
    var ids = ['snap-writersRoom', 'phiatus-en-writersRoom', 'snap-production', 'phiatus-en-production', 'simpost-enabled', 'snap-post', 'phiatus-en-post'];
    var sig0 = Object.keys(T.formSignature()).sort().join(','), undo0 = undoOff(), inDoc = ids.every(function (id) { return !!$id(id); });
    var mb = moreBtn('writersRoom'); mb.click(); await T.sleep(250);
    var openShown = rareShown().filter(function (s) { return s.indexOf('writersRoom:') === 0; });
    var openLabel = mb.textContent, openExp = mb.getAttribute('aria-expanded');
    var mbP = moreBtn('production'); mbP.click(); await T.sleep(250);
    var prodShown = rareShown().filter(function (s) { return s.indexOf('production:') === 0; });
    var sig1 = Object.keys(T.formSignature()).sort().join(','), undo1 = undoOff();
    mb.click(); mbP.click(); await T.sleep(250);
    var closedShown = rareShown();
    add('M4', 'More options shows the card\'s switches and reads "Fewer options"; again, they hide',
        JSON.stringify(openShown) === JSON.stringify(['writersRoom:phase-snap', 'writersRoom:phase-hidewf', 'writersRoom:phase-hiatus-toggle']) &&
          JSON.stringify(prodShown) === JSON.stringify(['production:phase-snap', 'production:phase-hiatus-toggle', 'production:simpost-toggle']) &&
          openLabel === 'Fewer options' && openExp === 'true' && mb.textContent === 'More options' && closedShown.length === 0,
        {writersRoom: openShown, production: prodShown, label: openLabel, expanded: openExp, closed: closedShown}, 'Snap, Hide, Hiatus; Production Snap, Hiatus, Sim Post');
    var sig2 = Object.keys(T.formSignature()).sort().join(',');
    add('M2', 'every id\'d control is still in the document; More options adds or removes none and banks no undo step',
        inDoc && sig0 === sig1 && sig1 === sig2 && undo0 && undo1 && sig0.split(',').length > 50,
        {inDoc: inDoc, ids: sig0.split(',').length, same: sig0 === sig1 && sig1 === sig2, undoStillOff: undo0 && undo1}, 'unchanged');

    // ---- M3 ----
    var f3 = folds(), ranges = hiatusRows().map(function (r) { var e = r.querySelector('.hiatus-range'); return vis(e) ? e.textContent.trim() : ''; });
    var bodies = hiatusRows().map(function (r) { return vis(r.querySelector('.hiatus-body')); });
    add('M3', 'the four winter breaks start folded to their head, which still shows their dates',
        f3.length === 4 && f3.every(Boolean) && ranges.every(function (t) { return /→/.test(t); }) && bodies.every(function (b) { return !b; }),
        {folded: f3, heads: ranges, bodiesShown: bodies}, 'four folded, dates on each head');

    // ---- M7: on show now, against everything opened (the old tab) ----
    var nowControls = controlsOnShow(), nowH = phasesHeight();
    cards().forEach(function (r) { var b = r.querySelector(':scope > .phase-more-btn'); if(b && b.getAttribute('aria-expanded') === 'false') b.click(); });
    hiatusRows().forEach(function (r) { var c = r.querySelector('.hiatus-collapse-btn'); if(c && r.classList.contains('is-collapsed')) c.click(); });
    await T.sleep(300);
    var allControls = controlsOnShow(), allH = phasesHeight();
    cards().forEach(function (r) { var b = r.querySelector(':scope > .phase-more-btn'); if(b && b.getAttribute('aria-expanded') === 'true') b.click(); });
    hiatusRows().forEach(function (r) { var c = r.querySelector('.hiatus-collapse-btn'); if(c && !r.classList.contains('is-collapsed')) c.click(); });
    await T.sleep(300);
    out.tab = {controlsNow: nowControls, controlsAllOpen: allControls, heightNow: nowH, heightAllOpen: allH};
    add('M7', 'the tab is shorter: fewer controls on show and a shorter Phases card than with everything opened',
        nowControls <= allControls - 20 && nowH <= allH * 0.7, out.tab, 'at least 20 fewer controls, at most 70% of the height');

    // ---- M5 ----
    var pb = moreBtn('prePrep'); pb.click(); await T.sleep(200);
    var hideRow = $id('swatch-prePrep').parentElement.querySelector('.phase-hidewf');
    hideRow.click(); await T.sleep(200); await settle('Pre-Prep hidden in the waterfall');
    pb.click(); await T.sleep(250);
    var stays = rareShown().indexOf('prePrep:phase-hidewf') !== -1, cbOn = hideRow.querySelector('input').checked;
    $id('undo-btn').click(); await T.sleep(400); await settle('the undo');
    var gone = rareShown().indexOf('prePrep:phase-hidewf') === -1, cbOff = !hideRow.querySelector('input').checked;
    add('M5', 'a switch turned on while open stays on show once More options closes; undoing it hides it again',
        cbOn && stays && cbOff && gone, {on: cbOn, staysOnShow: stays, undone: cbOff, hiddenAgain: gone}, 'on show, then hidden');

    // ---- M6 ----
    await phasesTab();   // the undo above put back the tab its snapshot was taken on (sidebarTab is saved state)
    $id('add-hiatus').click(); await T.sleep(300); await settle('a new hiatus');
    var f6 = folds();
    add('M6', '+ Add hiatus period adds an OPEN card; the folded ones stay folded',
        f6.length === 5 && f6.slice(0, 4).every(Boolean) && f6[4] === false && vis(hiatusRows()[4].querySelector('.hiatus-body')),
        {folds: f6, bodyShown: vis(hiatusRows()[4].querySelector('.hiatus-body')), body: hiatusRows()[4].querySelector('.hiatus-body') && getComputedStyle(hiatusRows()[4].querySelector('.hiatus-body')).display}, '[true,true,true,true,false]');

    // ---- M8: a loaded calendar ----
    var text = await (await fetch('/tests/fixtures/phasesmore.sptcal')).text();
    await load(text);
    await phasesTab(); await T.sleep(300);
    var shown8 = rareShown().sort(), f8 = folds(), openMore = cards().filter(function (r) { return r.classList.contains('more-open'); }).length;
    var postFields = vis($id('phiatus-fields-post')) && vis($id('phiatus-start-post'));
    var want8 = ['custom1:phase-hidewf', 'custom1:phase-wknum', 'post:phase-hiatus-toggle', 'prePrep:phase-snap'];
    add('M8', 'a loaded calendar: every switch it has set is on show without More options, and only those; its hiatus cards folded',
        JSON.stringify(shown8) === JSON.stringify(want8) && postFields && f8.length === 2 && f8.every(Boolean) && openMore === 0,
        {shown: shown8, postHiatusFields: postFields, folds: f8, moreOpen: openMore}, {shown: want8, folds: [true, true]});
  } catch (e) { out.EX = String(e && e.stack || e); }
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  add('Z', 'no console error', !errs.length, errs.slice(0, 3), []);
  if(out.EX) add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  out.cases = cases;
  out.pass = !out.EX && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
