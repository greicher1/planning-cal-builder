// forcedcolors -- frozen edit FC1 (audit 2026-11 item W.2, WIN-5; owner's picker 16 Nov 2026, "Keep colours
// (contrast)"): in forced-colors mode, a Windows contrast theme, the calendar keeps its own colours, and nothing
// changes anywhere else.
//
//   node rtleg.mjs --leg forcedcolors --page /dist/index.html --query forced=active   the contrast theme, emulated
//   HARNESS_PAGE=/dist/index.html ./run.sh forcedcolors 200                          the control: no contrast theme
//
// HOW. A page cannot switch forced-colors on for itself, so the RUNNER does: rtleg.mjs (and the Windows runner's
// xleg.mjs) call CDP Emulation.setEmulatedMedia({features: [{name: 'forced-colors', value: 'active'}]}) before the
// page loads when the query carries forced=active. Chrome then paints as under a contrast theme: every background
// becomes the theme's unless an element opts out with forced-color-adjust:none, which is all FC1 is (legacy.css,
// `@media (forced-colors: active){ #table-wrap, .month-map, .side-col, .pc-sw{ forced-color-adjust:none } }`).
// One run, two looks, as softlines does it: the leg measures every coloured cell WITH FC1's block, deletes the block,
// measures again, and puts it back. Deleting a rule re-renders nothing, so both measurements are of the same cells.
// A cell's own colour is its INLINE background (style.backgroundColor, the colour the renderer wrote); what the
// screen paints is getComputedStyle, which Chrome computes after the theme's override.
//
// CASES (forced = with ?forced=active; control = without)
//   F0  forced: matchMedia('(forced-colors: active)') is true; control: false
//   B0  FC1's block is in the page
//   F1  the waterfall: every phase cell, hiatus band and coloured note paints its own fill and text colour with FC1
//       (forced and control alike)
//   F2  forced: with FC1's block switched off, those fills are NOT kept (the emulation bites, and FC1 is what keeps
//       them); control: switching the block off changes nothing at all (it matches nothing outside forced colours)
//   F3  the month view: every coloured bar and note keeps its fill with FC1; forced: replaced without it
//   F4  FC1 is fenced: #table-wrap and the phase map compute forced-color-adjust none only in forced mode, and the
//       sidebar, the toolbar and the page itself stay "auto" in both (the chrome follows the contrast theme)
//   E0  no console errors
// Red on the build before FC1 (the merged release-wave4 build at bddc3bd), forced run: B0, F1 (all 72 cells painted in
// the theme's colours), F3 and F4 (F2 holds trivially there: nothing keeps the fills). The control run is green there
// but for B0: outside forced colours nothing changes.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {}, out = {cases: cases, info: info};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var forced = /[?&]forced=active(&|$)/.test(location.search);
  info.mode = forced ? 'forced=active (emulated)' : 'control (no emulation)';
  try {
    await T.appReady();
    await T.buildFixture();
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, 'the calendar to settle', 200, 100);

    // ---- F0: the mode ----
    var mq = window.matchMedia('(forced-colors: active)').matches;
    add('F0', forced ? 'the page is in forced-colors mode (the runner emulates a contrast theme)' : 'the page is not in forced-colors mode',
        mq === forced, {matches: mq}, {matches: forced});

    // FC1's block: the @media (forced-colors: active) rule whose style rule names #table-wrap.
    var found = null;
    Array.from(document.styleSheets).forEach(function (sh) {
      var rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.from(rules).forEach(function (r, i) {
        if(found || !(r instanceof CSSMediaRule) || !/forced-colors\s*:\s*active/i.test(r.media.mediaText)) return;
        if(Array.from(r.cssRules).some(function (x) { return /#table-wrap/.test(x.selectorText || ''); })) found = {sheet: sh, index: i, text: r.cssText};
      });
    });
    info.fc1 = found ? found.text : null;
    add('B0', 'FC1\'s block (@media (forced-colors: active) naming #table-wrap) is in the page', !!found,
        {found: !!found}, {found: true});
    // Without the block (a build before FC1) the cases below still measure, so the forced run is red where it matters
    // (F1: the theme's colours, not the calendar's); switching a missing block off and on is a no-op.
    var off = function () { if(found) found.sheet.deleteRule(found.index); };
    var on = function () { if(found) found.sheet.insertRule(found.text, found.index); };

    // Every element in the frozen container that the renderer gave an inline background.
    function coloured(sel){
      return Array.from(document.querySelectorAll(sel)).filter(function (el) {
        var bg = el.style.backgroundColor; return !!bg && bg !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(bg);
      });
    }
    function paints(els){
      return els.map(function (el) { var cs = getComputedStyle(el); return {bg: cs.backgroundColor, fg: cs.color}; });
    }
    function own(els){
      // The renderer's own colours: the inline background, and the inline text colour where it wrote one.
      return els.map(function (el) { return {bg: el.style.backgroundColor, fg: el.style.color || null}; });
    }
    function same(p, o){ return p.bg === o.bg && (o.fg == null || p.fg === o.fg); }
    function compare(els){
      var a = paints(els), o = own(els), bad = [];
      for(var i = 0; i < els.length; i++) if(!same(a[i], o[i])) bad.push({cls: els[i].className, own: o[i], paints: a[i]});
      return bad;
    }

    // ---- F1 / F2: the waterfall ----
    var wf = coloured('#table-wrap td.sheet-phase-cell, #table-wrap td.sheet-hiatus-cell, #table-wrap td.sheet-note-cell');
    info.wfCells = wf.length;
    var wfBad = compare(wf);
    add('F1', 'the waterfall: every phase cell, hiatus band and coloured note paints its own fill and text colour with FC1',
        wf.length > 20 && wfBad.length === 0, {cells: wf.length, wrong: wfBad.length, first: wfBad.slice(0, 3)}, {cells: '> 20', wrong: 0});
    var withFc1 = paints(wf);
    off(); var wfOff = paints(wf); var wfOffBad = compare(wf); on();
    var changed = wfOff.filter(function (p, i) { return p.bg !== withFc1[i].bg; }).length;
    if(forced){
      add('F2', 'with FC1 switched off, the contrast theme replaces the waterfall\'s fills (the emulation bites, and FC1 is what keeps them)',
          wfOffBad.length > wf.length / 2, {cellsReplaced: wfOffBad.length, of: wf.length, sample: wfOff[0]}, 'most of them replaced');
    } else {
      add('F2', 'outside forced colours, switching FC1 off changes no cell of the waterfall (it matches nothing there)',
          changed === 0 && wfOffBad.length === 0, {changed: changed, wrong: wfOffBad.length}, {changed: 0, wrong: 0});
    }

    // ---- F3: the month view ----
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    await T.sleep(300);
    var mv = coloured('#table-wrap .mv-bar');
    info.mvBars = mv.length;
    var mvBad = compare(mv);
    off(); var mvOffBad = compare(mv); on();
    add('F3', forced ? 'the month view: every coloured bar and note keeps its fill with FC1, and loses it without'
                     : 'the month view: every coloured bar and note keeps its fill, with FC1 and without',
        mv.length > 5 && mvBad.length === 0 && (forced ? mvOffBad.length > mv.length / 2 : mvOffBad.length === 0),
        {bars: mv.length, wrongWithFc1: mvBad.length, replacedWithout: mvOffBad.length, first: mvBad.slice(0, 2)},
        forced ? {bars: '> 5', wrongWithFc1: 0, replacedWithout: 'most'} : {bars: '> 5', wrongWithFc1: 0, replacedWithout: 0});

    // ---- F4: the fence ----
    var fca = function (sel) { var el = document.querySelector(sel); return el ? getComputedStyle(el).forcedColorAdjust : '(absent)'; };
    var inside = {tableWrap: fca('#table-wrap'), monthMap: fca('.month-map')};
    var outside = {body: fca('body'), sidebar: fca('.sidebar, aside, .layout > :first-child'), toolbar: fca('#view-month-btn'), header: fca('header, .app-header')};
    var want = forced ? 'none' : 'auto';
    var inOk = Object.keys(inside).every(function (k) { return inside[k] === want || inside[k] === '(absent)'; }) && inside.tableWrap === want;
    var outOk = Object.keys(outside).every(function (k) { return outside[k] === 'auto' || outside[k] === '(absent)'; });
    add('F4', 'FC1 is fenced: the calendar and the phase map opt out of the contrast theme only in forced mode, and the sidebar, toolbar and page never do',
        inOk && outOk, {inside: inside, outside: outside}, {inside: want, outside: 'auto'});

    var errs = T.appHealth().errors || [];
    add('E0', 'no console errors', errs.length === 0, errs.slice(0, 5), []);
  } catch (e) {
    out.EX = String(e && e.stack || e);
  }
  T.done(out);
})(); });
