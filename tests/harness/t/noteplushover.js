// noteplushover -- the waterfall's empty Notes cell shows its "+" only while you point at that cell (owner, 19 Nov
// 2026: "What if the plus symbol only appears in the notes column of the waterfall when you hover over it - similar
// to how it works in the month view"). Two ADDED rules in legacy.css, under the two frozen .note-add-hint rules:
//   #table-wrap td.sheet-note-cell .note-add-hint{ opacity:0; transition:opacity .12s; }
//   #table-wrap td.sheet-note-cell:hover .note-add-hint{ opacity:1; }
//
//   HARNESS_PAGE=/dist/index.html ./run.sh noteplushover 120
//
// A page cannot put itself under the pointer, so H2 reads the hover rule and asks whether its selector, less
// ":hover", matches every hint, rather than hovering (the browser pane did that by hand when it was built: the hovered
// cell's "+" at opacity 1 in #b39ddb, every other at 0). Paint only is what keeps the frozen surface where it was, so
// G1 measures every Notes cell and hint with both rules in and with both deleted, and requires the same boxes.
//
// CASES
//   H0  both rules are in the page
//   H1  every empty Notes cell holds a "+" and every one computes opacity 0 (nothing is pointed at)
//   H2  the hover rule sets opacity 1, and its selector without ":hover" matches every hint
//   H3  the "+" keeps its frozen look: colour #ccc, 11 px, and its text is still "+"
//   G1  paint only: every Notes cell's and every hint's box is identical with the rules and without them
//   P1  the print copy still hides the "+" (#print-root .note-add-hint{display:none !important} is untouched)
//   E0  no console errors
// Red on origin/main before the change (2215aa5): H0, H1 (opacity 1), H2.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  try {
    await T.appReady();
    await T.buildFixture();
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, 'the calendar to settle', 200, 100);
    // Let the .12s transition finish, so a computed opacity is the resting one.
    await new Promise(function (r) { setTimeout(r, 400); });

    // ---- H0: the two rules ----
    var rules = [];
    Array.from(document.styleSheets).forEach(function (sh) {
      var rs; try { rs = sh.cssRules; } catch (e) { return; }
      Array.from(rs).forEach(function (r, i) {
        if(r instanceof CSSStyleRule && /^#table-wrap td\.sheet-note-cell(:hover)? \.note-add-hint$/.test(r.selectorText))
          rules.push({sheet: sh, index: i, text: r.cssText, sel: r.selectorText, opacity: r.style.opacity});
      });
    });
    var rest = rules.filter(function (r) { return !/:hover/.test(r.sel); })[0];
    var hov = rules.filter(function (r) { return /:hover/.test(r.sel); })[0];
    info.rules = rules.map(function (r) { return r.text; });
    add('H0', 'both added rules are in the page', !!rest && !!hov && rest.opacity === '0',
        {resting: rest ? rest.text : null, hover: hov ? hov.text : null}, {resting: 'opacity: 0', hover: 'opacity: 1'});

    // ---- H1: hidden at rest ----
    var cells = Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell:not(.has-note)'));
    var hints = Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell .note-add-hint'));
    var shown = hints.filter(function (h) { return getComputedStyle(h).opacity !== '0'; });
    add('H1', 'every empty Notes cell holds a "+", and none shows while nothing is pointed at',
        cells.length > 10 && hints.length === cells.length && shown.length === 0,
        {emptyCells: cells.length, hints: hints.length, showing: shown.length}, {emptyCells: '> 10', hints: 'one each', showing: 0});

    // ---- H2: shown on hover ----
    var bare = hov ? hov.sel.replace(':hover', '') : null;
    var matched = bare ? hints.filter(function (h) { return h.matches(bare); }).length : 0;
    add('H2', 'the hover rule shows the "+" (opacity 1) and reaches every hint', !!hov && hov.opacity === '1' && matched === hints.length,
        {opacity: hov ? hov.opacity : null, matched: matched, hints: hints.length}, {opacity: '1', matched: hints.length});

    // ---- H3: the frozen look is unchanged ----
    var h0 = hints[0], cs = h0 ? getComputedStyle(h0) : null;
    add('H3', 'the "+" keeps its frozen colour, size and text',
        !!cs && cs.color === 'rgb(204, 204, 204)' && cs.fontSize === '11px' && hints.every(function (h) { return h.textContent === '+'; }),
        cs ? {color: cs.color, fontSize: cs.fontSize} : null, {color: 'rgb(204, 204, 204)', fontSize: '11px'});

    // ---- G1: paint only ----
    function boxes(){
      return Array.from(document.querySelectorAll('#table-wrap td.sheet-note-cell, #table-wrap td.sheet-note-cell .note-add-hint')).map(function (el) {
        var b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(function (v) { return Math.round(v * 100) / 100; }).join(',');
      });
    }
    var withRules = boxes();
    // Delete from the highest index down so the lower one's index still holds, then put both back in order.
    var del = rules.slice().sort(function (a, b) { return b.index - a.index; });
    del.forEach(function (r) { r.sheet.deleteRule(r.index); });
    var without = boxes();
    var offOpacity = h0 ? getComputedStyle(h0).opacity : null;
    del.slice().reverse().forEach(function (r) { r.sheet.insertRule(r.text, r.index); });
    var diff = withRules.filter(function (b, i) { return b !== without[i]; }).length;
    add('G1', 'paint only: every Notes cell and "+" has the same box with the rules and without them',
        withRules.length > 10 && withRules.length === without.length && diff === 0 && offOpacity === '1',
        {boxes: withRules.length, differ: diff, opacityWithoutRules: offOpacity}, {boxes: '> 10', differ: 0, opacityWithoutRules: '1'});

    // ---- P1: print still hides it ----
    var printRule = null;
    Array.from(document.styleSheets).forEach(function (sh) {
      var rs; try { rs = sh.cssRules; } catch (e) { return; }
      (function walk(list){ Array.from(list).forEach(function (r) {
        if(r.cssRules) walk(r.cssRules);
        if(r instanceof CSSStyleRule && /#print-root \.note-add-hint/.test(r.selectorText) && r.style.display === 'none') printRule = r.cssText;
      }); })(rs);
    });
    add('P1', 'the print copy still hides the "+"', !!printRule, printRule, '#print-root .note-add-hint{display:none !important}');

    var errs = T.appHealth().errors || [];
    add('E0', 'no console errors', errs.length === 0, errs.slice(0, 5), []);
  } catch (e) {
    out.EX = String(e && e.stack || e);
  }
  T.done(out);
})(); });
