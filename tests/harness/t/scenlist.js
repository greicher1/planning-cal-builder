// scenlist -- the scenario tabs you cannot see (audit AUD2-060, item 3.10): with more scenarios than the strip under
// the calendar can show, a list button at the end of the tabs names every scenario and switches to the one clicked,
// as Excel's sheet list does, and the cut edges of the strip fade to say there is more.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=scenlist-20 node rtleg.mjs --leg scenlist --secs 120
//
// ⚠️ REAL TIME (rtleg.mjs), NOT run.sh. The list is a Mantine Menu, whose dropdown mounts through its open transition,
// and that runs on requestAnimationFrame, which headless Chrome under run.sh's --virtual-time-budget starves: there the
// button turns aria-expanded and the dropdown never appears (measured, 14 Nov 2026). On the real clock it opens as in
// a browser. L2 needs no dropdown and was red on the build before the fix under either driver.
//
// tests/fixtures/scenlist-20.sptcal (synthetic, "Test Show"; built by the audit's audit-a4-many leg from
// T.buildFixture()): 20 scenarios, "Scenario A" then "Shoot +1 wk, 11 eps" .. "Shoot +19 wk, 13 eps", each with
// Production one week later than the last. The tab on screen is "Shoot +18 wk, 12 eps". At the harness's 1600 px window
// the strip shows about 7 of the 20 tabs.
//
//   L1  the strip overflows (the precondition: more tabs than room)
//   L2  the strip carries the list button while it overflows
//   L3  it lists all 20 scenarios in tab order, the one on screen marked
//   L3b ...and opens scrolled so that one is in view (it is 19th of 20)
//   L4  clicking a hidden scenario switches to it, closes the list, and scrolls its tab fully into view
//   L5  the strip fades the edge it cuts tabs at: the left one only, once scrolled to the end
//   L6  Escape closes the list without switching
//   L7  with 3 scenarios (nothing hidden) there is no list button and no fade (reloaded with 3 tabs)
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return [].slice.call(document.querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function cur(){ return txt(q('.sc-tab.is-current .sc-tab-name')); }
  function listBtn(){ return q('.sc-strip [aria-label="All scenarios"]'); }
  function items(){ return qa('.sc-strip .sc-list-item'); }
  function strip(){ return q('.sc-tabs'); }
  // Wholly inside the strip's visible box (2 px of slack for borders).
  function inView(name){
    var t = qa('.sc-tab').filter(function(x){ return txt(x.querySelector('.sc-tab-name')) === name; })[0];
    if(!t) return false;
    var s = strip().getBoundingClientRect(), r = t.getBoundingClientRect();
    return r.left >= s.left - 2 && r.right <= s.right + 2;
  }
  function edges(){ var s = strip(); return {l: s.classList.contains('is-cut-l'), r: s.classList.contains('is-cut-r')}; }
  try {
    await T.appReady();
    await T.until(function(){ return qa('.sc-tab').length === 20; }, '20 tabs', 100, 100);
    await T.sleep(600);
    var s = strip();
    out.strip = {scrollW: s.scrollWidth, clientW: s.clientWidth, winW: innerWidth, current: cur()};
    var hidden = qa('.sc-tab .sc-tab-name').map(txt).filter(function(n){ return !inView(n); });
    out.hidden = hidden;
    add('L1', 'the strip overflows: some of the 20 tabs are out of view', s.scrollWidth > s.clientWidth + 1 && hidden.length > 0,
        {scrollW: s.scrollWidth, clientW: s.clientWidth, hidden: hidden.length}, 'scrollWidth > clientWidth, tabs hidden');

    var b = listBtn();
    add('L2', 'the strip carries an "All scenarios" list button while tabs are hidden', !!b && b.getBoundingClientRect().width > 0,
        {button: !!b, strip: qa('.sc-strip > button, .sc-strip > [role=button]').map(function(x){ return x.getAttribute('aria-label') || txt(x); })},
        'a visible [aria-label="All scenarios"] in .sc-strip');
    if(!b) throw new Error('no list button: the rest needs it');

    b.click();
    await T.until(function(){ return items().length > 0; }, 'the list', 40, 100);
    await T.sleep(200);
    var names = items().map(function(i){ return txt(i.querySelector('.sc-list-name') || i); });
    var marked = items().filter(function(i){ return i.getAttribute("aria-current") === "true"; }).map(function(i){ return txt(i.querySelector('.sc-list-name') || i); });
    var tabNames = qa('.sc-tab .sc-tab-name').map(txt);
    var box = q('.sc-strip .sc-list'), onItem = items().filter(function(i){ return i.getAttribute('aria-current') === 'true'; })[0];
    var br = box && box.getBoundingClientRect(), ir = onItem && onItem.getBoundingClientRect();
    add('L3b', 'the list opens with the one on screen in view (it is 19th of 20, below the fold of a list from the top)',
        !!(br && ir) && ir.top >= br.top - 1 && ir.bottom <= br.bottom + 1 && box.scrollTop > 0,
        {scrollTop: box && box.scrollTop, box: br && [Math.round(br.top), Math.round(br.bottom)], item: ir && [Math.round(ir.top), Math.round(ir.bottom)]}, 'item inside the list box, scrolled');
    add('L3', 'the list names all 20 scenarios in tab order, the one on screen marked',
        names.length === 20 && JSON.stringify(names) === JSON.stringify(tabNames) && marked.length === 1 && marked[0] === cur(),
        {names: names, marked: marked, current: cur()}, '20 names = the tabs, one marked = the tab on screen');

    // The last tab, out of view to the right of "Shoot +18" (on screen) or the first, out of view to the left.
    var target = hidden.indexOf('Scenario A') >= 0 ? 'Scenario A' : hidden[0];
    out.target = target;
    var it = items().filter(function(i){ return txt(i.querySelector('.sc-list-name') || i) === target; })[0];
    it.click();
    await T.until(function(){ return cur() === target; }, 'switched to ' + target, 60, 100);
    await T.sleep(700);
    add('L4', 'clicking a hidden scenario in the list switches to it, closes the list and brings its tab into view',
        cur() === target && items().length === 0 && inView(target),
        {current: cur(), listOpen: items().length, inView: inView(target), scrollLeft: strip().scrollLeft}, target + ' on screen, list closed, tab in view');

    // To the far end: the last tab. Scrolled to its end, only the LEFT edge is cut.
    listBtn().click();
    await T.until(function(){ return items().length === 20; }, 'the list again', 40, 100);
    var last = tabNames[tabNames.length - 1];
    items().filter(function(i){ return txt(i.querySelector('.sc-list-name') || i) === last; })[0].click();
    await T.until(function(){ return cur() === last; }, 'switched to the last', 60, 100);
    await T.sleep(700);
    var eEnd = edges();
    strip().scrollLeft = 0; strip().dispatchEvent(new Event('scroll'));
    await T.sleep(300);
    var eStart = edges();
    strip().scrollLeft = Math.round((strip().scrollWidth - strip().clientWidth) / 2); strip().dispatchEvent(new Event('scroll'));
    await T.sleep(300);
    var eMid = edges();
    add('L5', 'the strip fades the edges where it cuts tabs off (end: left only; start: right only; middle: both)',
        eEnd.l && !eEnd.r && !eStart.l && eStart.r && eMid.l && eMid.r, {end: eEnd, start: eStart, middle: eMid}, 'end {l}, start {r}, middle {l,r}');

    listBtn().click();
    await T.until(function(){ return items().length === 20; }, 'the list a third time', 40, 100);
    var before = cur();
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.until(function(){ return items().length === 0; }, 'the list closed by Escape', 40, 100);
    add('L6', 'Escape closes the list and switches nothing', cur() === before && items().length === 0, {current: cur(), before: before}, 'closed, same tab');

    // Three scenarios: everything fits, so nothing new shows.
    await T.reloadWith(function(snap){
      var keep = snap.scenarios.tabs.filter(function(t, i){ return t.id === snap.scenarios.current || i < 2; });
      snap.scenarios.tabs = keep;
    }, 'scenlist-3');
    await T.until(function(){ return qa('.sc-tab').length === 3; }, '3 tabs', 60, 100);
    await T.sleep(500);
    var e3 = edges();
    add('L7', 'with 3 scenarios nothing is hidden: no list button, no fade', !listBtn() && !e3.l && !e3.r && strip().scrollWidth <= strip().clientWidth + 1,
        {button: !!listBtn(), edges: e3, scrollW: strip().scrollWidth, clientW: strip().clientWidth}, 'no button, no fade');

    var h = T.appHealth();
    add('E0', 'no console errors', h.errors.length === 0, h.errors.slice(0, 5), 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception'); }
  out.cases = cases;
  T.done(out);
})(); });
