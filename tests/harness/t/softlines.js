// softlines -- the month view's on-screen Soft Lines look (MONTH-RAIL-PLAN.md step 4; owner, 27 Oct 2026: Option 1,
// "Screen only for now"). The look is PAINT ONLY and the day marks win over it; this leg holds it to both claims.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides ./run.sh softlines 240
//
// HOW: one run, two looks, no baseline file and no hook. The Soft Lines block is legacy.css's `@media screen{...}`
// holding `#table-wrap .month-view .mv-arrow`; the leg finds that rule in the page's own stylesheet, and on every
// month page measures the view WITH it, deletes it, measures the look underneath (today's frozen look, exactly), and
// puts it back. Deleting a rule re-renders nothing, so the two measurements are of the very same elements.
//
// CASES (each over every page of the calendar)
//   L0  the block is found in the page's stylesheet, and switching it off and on again restores it
//   L1  ⭐ NOTHING MOVES: every element in the month view has the same box, to 0.01 px, with the look and without
//   L2  ⭐ THE MARKS WIN: a worked day, an Off day and a half day paint exactly as without the look (background and
//       date colour), and so does every bar, note, hiatus band and header line (background, colour, borders, shadow)
//   L3  the look itself: plain weekends and out-of-month days take the soft tints, the grid's lines the soft greys
//   L4  the frozen arrows are hidden (visibility) and take no clicks from the pointer, yet are still in the page with
//       their ids, and a scripted click still pages the month (the ~100 legs that click them keep working)
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  info.fixture = (/[?&]state=([^&]+)/.exec(location.search) || [])[1] || '(none)';
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 30); }); };
  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); },
                  'the restored calendar', 200, 100);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, 'the calendar to settle', 200, 100);
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);

    // ---- L0: find the block ----
    var found = null;
    Array.from(document.styleSheets).forEach(function (sh) {
      var rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.from(rules).forEach(function (r, i) {
        if(found || !(r instanceof CSSMediaRule) || !/^screen$/i.test(r.media.mediaText)) return;
        if(Array.from(r.cssRules).some(function (x) { return x.selectorText === '#table-wrap .month-view .mv-arrow'; })) found = {sheet: sh, index: i, text: r.cssText};
      });
    });
    var off = function () { found.sheet.deleteRule(found.index); };
    var on = function () { found.sheet.insertRule(found.text, found.index); };
    var restored = false;
    if(found){ off(); on(); var back = found.sheet.cssRules[found.index]; restored = !!back && back.cssText === found.text; }
    add('L0', 'the Soft Lines block is in the page, and switching it off and on again restores it exactly', !!found && restored,
        {found: !!found, restored: restored}, {found: true, restored: true});
    if(!found) throw new Error('no Soft Lines block in the page');

    var PAINT = ['backgroundColor', 'backgroundImage', 'color', 'borderTopColor', 'borderRightColor', 'borderBottomColor',
                 'borderLeftColor', 'boxShadow', 'opacity', 'textDecorationLine'];
    function snap(){
      return Array.from(document.querySelectorAll('#table-wrap .month-view, #table-wrap .month-view *')).map(function (el) {
        var r = el.getBoundingClientRect(), cs = getComputedStyle(el), o = {el: el, box: [r.x, r.y, r.width, r.height]};
        PAINT.forEach(function (p) { o[p] = cs[p]; });
        o.visibility = cs.visibility; o.pointerEvents = cs.pointerEvents;
        return o;
      });
    }
    var isMarkedCell = function (el) { return el.classList.contains('mv-daycell') &&
      (el.classList.contains('mv-day-on') || el.classList.contains('mv-day-off') || el.classList.contains('mv-day-half')); };
    var inMarkedCell = function (el) { var c = el.closest('.mv-daycell'); return !!c && isMarkedCell(c); };
    var isBarish = function (el) { return !!el.closest('.mv-bar, .mv-header'); };
    var prev = function () { return document.getElementById('mv-prev'); }, next = function () { return document.getElementById('mv-next'); };
    for(var g = 0; g < 300 && !prev().disabled; g++) prev().click();

    var moved = [], markDiff = [], lookBad = [], pages = 0, marked = 0, bars = 0, plainWeekend = 0, plainOut = 0, lines = 0;
    var WEEKEND = 'rgb(250, 249, 246)', WHITE = 'rgb(255, 255, 255)', CELL_LINE = 'rgb(230, 228, 222)', LINE = 'rgb(220, 217, 208)';
    for(g = 0; g < 300; g++){
      pages++;
      var a = snap(); off(); var b = snap(); on();
      var label = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent;
      if(a.length !== b.length) moved.push({page: label, count: [a.length, b.length]});
      for(var i = 0; i < Math.min(a.length, b.length); i++){
        var A = a[i], B = b[i], el = A.el;
        if(A.box.some(function (v, k) { return Math.abs(v - B.box[k]) > 0.01; }) && moved.length < 5)
          moved.push({page: label, el: el.className || el.tagName, with: A.box.map(Math.round), without: B.box.map(Math.round)});
        if(isMarkedCell(el) || inMarkedCell(el) || isBarish(el)){
          if(isMarkedCell(el)) marked++;
          if(el.classList.contains('mv-bar')) bars++;
          var diff = PAINT.filter(function (p) { return A[p] !== B[p]; });
          // A marked cell's own grid line is a LINE, not its mark: borders may take the soft grey.
          if(isMarkedCell(el)) diff = diff.filter(function (p) { return !/^border/.test(p); });
          if(diff.length && markDiff.length < 5) markDiff.push({page: label, el: el.className, props: diff.map(function (p) { return p + ': ' + B[p] + ' -> ' + A[p]; })});
          continue;
        }
        var cl = el.classList;
        if(cl.contains('mv-daycell')){
          if(cl.contains('mv-weekend')){ plainWeekend++; if(A.backgroundColor !== WEEKEND) lookBad.push({page: label, el: 'weekend', bg: A.backgroundColor}); }
          else if(cl.contains('mv-out')){ plainOut++; if(A.backgroundColor !== WHITE) lookBad.push({page: label, el: 'out', bg: A.backgroundColor}); }
          if(el.previousElementSibling){ lines++; if(A.borderLeftColor !== CELL_LINE) lookBad.push({page: label, el: 'cell line', c: A.borderLeftColor}); }
        }
        if(cl.contains('mv-week') && el.previousElementSibling && A.borderTopColor !== LINE) lookBad.push({page: label, el: 'week line', c: A.borderTopColor});
      }
      if(next().disabled) break;
      next().click();
      await wait();
    }
    info.pages = pages; info.markedCells = marked; info.bars = bars; info.plainWeekend = plainWeekend; info.plainOut = plainOut;
    add('L1', 'nothing moves: every element in the month view has the same box, to 0.01 px, with the look and without it',
        moved.length === 0, moved.slice(0, 5), []);
    add('L2', 'the marks win: worked, Off and half days, and every bar, note, hiatus band and header line, paint exactly as without the look',
        markDiff.length === 0 && bars > 0, {differences: markDiff.slice(0, 5), markedCells: marked, bars: bars}, {differences: []});
    add('L3', 'the look itself: plain weekends and out-of-month days take the soft tints, the lines the soft greys',
        lookBad.length === 0 && plainWeekend > 0 && lines > 0, {wrong: lookBad.slice(0, 5), plainWeekend: plainWeekend, plainOut: plainOut},
        {wrong: [], weekend: WEEKEND, out: WHITE, cellLine: CELL_LINE, weekLine: LINE});

    // ---- L4: the frozen arrows ----
    for(g = 0; g < 300 && !prev().disabled; g++) prev().click();
    var before = document.querySelector('#table-wrap .mv-monthyear').textContent;
    // Read BEFORE the click: the click re-renders the month, and a detached element's computed style is empty.
    var cs0 = getComputedStyle(next()), p = {visibility: cs0.visibility, pointerEvents: cs0.pointerEvents};
    next().click();
    await wait();
    var after = document.querySelector('#table-wrap .mv-monthyear').textContent;
    var r = next().getBoundingClientRect(), topEl = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    add('L4', 'the frozen arrows are hidden and take no pointer clicks, yet keep their ids and still page on a scripted click',
        p.visibility === 'hidden' && p.pointerEvents === 'none' && !!document.getElementById('mv-prev') && after !== before && topEl !== next(),
        {visibility: p.visibility, pointerEvents: p.pointerEvents, scriptedClick: before + ' -> ' + after, pointerHitsArrow: topEl === next()},
        {visibility: 'hidden', pointerEvents: 'none', pointerHitsArrow: false});

    out.errors = (window.__ERR || []).filter(function (m) { return !/SPTCal: \d+ value\(s\) in this calendar were not in a form/.test(m); }).slice(0, 10);
    add('E0', 'no console errors', out.errors.length === 0, out.errors, []);
  } catch (e) {
    out.EX = String(e && e.message || e);
    out.errors = (window.__ERR || []).slice(0, 10);
    add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  }
  T.done(out);
})(); });
