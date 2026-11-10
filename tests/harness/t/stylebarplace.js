// stylebarplace -- where the text style bar sits (owner, 10 Nov 2026). It was a full-width boxed line under the preview
// toolbar ("TEXT", the buttons, a hint). Now it is its bare buttons on the toolbar's first line, beside Shift, with the
// same gap before Shift as between Build Around and Fill Space, at the toolbar buttons' 30 px; where the three groups no
// longer fit on one line it alone drops to its old line (PreviewToolbar.jsx, useStyleBarFit: `.style-own-line` on the
// host).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=fill-intent ./run.sh stylebarplace 300
//
// tests/fixtures/fill-intent.sptcal: a calendar on the automatic layout, so Fill Space shows (the widest toolbar).
// The harness window is fixed (1600 x 1200), so the leg sets the ROW's width to put the toolbar either side of the
// fit (the row is what the fit measures) and puts it back at the end.
//
// CASES
//   P0  the host sits in .view-toggle-row between the view toggle and the tools; no id in it; row -> #table-wrap kept
//   P1  the buttons are the toolbar's: every shown control 30 px tall (Shift's height), the Size box draws its own
//       arrow 8 px in from the edge
//   P2  room for all three: on the first line, level with Shift, the gap before Shift = Build Around -> Fill Space
//       (26 px), the free space to its LEFT
//   P3  a header line picked: the Highlight well appears, the bar grows to the left, and nothing else moves (the fit
//       counts the well as shown, so the line does not flip)
//   P4  no room: the bar alone drops to a line of its own under the tools, at the row's left edge; the toggle and the
//       tools keep the first line, unwrapped
//   P5  it holds still: the class does not flip back and forth after it settles, on either side of the fit
//   P6  the month view, no room: the bar shares the stepper's line, left of the stepper, as before 10 Nov 2026
//   P7  the hint is the bar's tooltip while nothing is picked, and goes once something is
//   P8  the 16 px is one value: --tools-group-gap on the row, read by the gap after Build Around and after the bar
//   P9  the row itself never takes a class, on either side of the fit: the shareable copy is a clone that keeps the row's
//       attributes (sharecopy2 wants `<div class="view-toggle-row"></div>`), so the fit's class lives on the host
//   Z   no console error (a ResizeObserver loop would land here)
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'stylebarplace'}, cases = [];
  function add(id, title, pass, got, want){ cases.push({id: id, title: title, pass: !!pass, got: got, want: want}); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function R(el){ return el.getBoundingClientRect(); }
  function mid(r){ return r.top + r.height / 2; }
  function rnd(r){ return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; }
  var row, host, bar, tog, tools;
  function own(){ return host.classList.contains('style-own-line'); }
  // What the fit needs, worked out here on its own terms: the three groups, the row's two gaps, the 16 px after the
  // bar, and the Highlight well's slot when it is hidden.
  function need(){
    var sw = q('.hf-swatch:not(.hf-swatch-hl)', bar), hl = q('.hf-swatch-hl', bar);
    var gap = parseFloat(getComputedStyle(row).columnGap), trail = parseFloat(getComputedStyle(row).getPropertyValue('--tools-group-gap'));
    return tog.offsetWidth + gap + bar.offsetWidth + (hl.hidden ? sw.offsetWidth + parseFloat(getComputedStyle(bar).columnGap) : 0) + trail + gap + tools.offsetWidth;
  }
  async function setRowWidth(w){
    row.style.width = w == null ? '' : w + 'px';
    window.dispatchEvent(new Event('resize'));
    await T.sleep(250);
  }
  // Watch the class over a stretch of timer ticks: it must not change once settled.
  async function steady(){ var seen = [own()]; for(var i = 0; i < 8; i++){ await T.sleep(60); seen.push(own()); } return seen.every(function (v) { return v === seen[0]; }); }
  try {
    await T.appReady();
    await T.until(function () { return !!q('.view-toggle-row .style-bar-host .style-bar'); }, 'the style bar', 60, 100);
    row = q('.view-toggle-row'); host = q('.style-bar-host', row); bar = q('.style-bar', host);
    tog = q('.view-toggle', row); tools = q('.preview-tools', row);
    if(!q('#view-sheet-btn').classList.contains('active')){ q('#view-sheet-btn').click(); await T.sleep(600); }

    // ---- P0: where it is in the markup ----
    var kids = Array.from(row.children).map(function (e) { return e.className.split(' ')[0]; });
    add('P0', 'the host sits between the view toggle and the tools in the toolbar row; no id in it; row -> #table-wrap kept',
        kids.indexOf('style-bar-host') === kids.indexOf('view-toggle') + 1 && kids.indexOf('preview-tools') === kids.indexOf('style-bar-host') + 1 &&
          !qa('[id]', host).length && row.nextElementSibling === document.getElementById('table-wrap'),
        kids, 'view-toggle | style-bar-host | preview-tools | …');

    // ---- P1: the toolbar's buttons ----
    var shiftH = Math.round(R(q('.shift-group')).height);
    var hs = qa('.hf-ctl', bar).filter(function (e) { return e.offsetParent; }).map(function (e) { return Math.round(R(e).height); });
    var size = q('.hf-size', bar), scs = getComputedStyle(size);
    add('P1', "every shown control is Shift's height (30 px), and the Size box draws its own arrow 8 px in from the edge",
        shiftH === 30 && hs.length >= 6 && hs.every(function (h) { return h === shiftH; }) &&
          scs.appearance === 'none' && /calc\(100% - 8px\)/.test(scs.backgroundPosition) && /^url/.test(scs.backgroundImage) && parseFloat(scs.paddingRight) >= 20,
        {shift: shiftH, controls: hs, appearance: scs.appearance, arrowAt: scs.backgroundPosition, padRight: scs.paddingRight},
        {shift: 30, controls: 'all 30', appearance: 'none', arrowAt: 'calc(100% - 8px) 50%'});

    // ---- P7 (first half): the hint, nothing picked ----
    var hintIdle = bar.title;

    // ---- P2: room for all three ----
    await setRowWidth(Math.ceil(need()) + 40);
    var s2 = await steady(), rowClassWide = row.className;
    var bR = R(bar), shR = R(q('.shift-group')), tR = R(tog);
    var gapBar = shR.left - bR.right, gapBA = R(q('#tb-fill-space-btn')).left - R(q('#pop-solve-btn')).right;
    add('P2', 'room for all three: on the first line, level with Shift; the gap before Shift is the Build Around -> Fill Space gap; the free space is on its left',
        !own() && s2 && Math.abs(mid(bR) - mid(shR)) < 1 && Math.abs(gapBar - gapBA) < 0.5 && Math.abs(gapBar - 26) < 0.5 && bR.left - tR.right > 30,
        {own: own(), gapBeforeShift: +gapBar.toFixed(2), buildAroundToFill: +gapBA.toFixed(2), leftSpace: Math.round(bR.left - tR.right), bar: rnd(bR), shift: rnd(shR)},
        {own: false, gapBeforeShift: 26, buildAroundToFill: 26});

    // ---- P3: a header line picked ----
    var shiftLeft0 = shR.left, barRight0 = bR.right, barW0 = bR.width;
    var line = q('#table-wrap .cal-header-bar .hdr-line[data-hid="c2"]') || q('#table-wrap .cal-header-bar .hdr-line');
    if(line){ line.click(); await T.sleep(400); }
    var hlShown = !q('.hf-swatch-hl', bar).hidden, s3 = await steady();
    var bR3 = R(bar), shR3 = R(q('.shift-group'));
    add('P3', 'a header line picked: the Highlight well appears, the bar grows to the left, and Shift, the bar\'s right edge and the line stay put',
        !!line && hlShown && !own() && s3 && bR3.width > barW0 + 20 && Math.abs(bR3.right - barRight0) < 0.5 && Math.abs(shR3.left - shiftLeft0) < 0.5,
        {line: !!line, highlightShown: hlShown, own: own(), widthBefore: Math.round(barW0), widthAfter: Math.round(bR3.width),
         rightMoved: +(bR3.right - barRight0).toFixed(2), shiftMoved: +(shR3.left - shiftLeft0).toFixed(2)},
        {highlightShown: true, own: false, rightMoved: 0, shiftMoved: 0});

    // ---- P7 (second half): armed, the tooltip goes ----
    var hintArmed = bar.title;
    add('P7', 'the hint is the bar\'s tooltip while nothing is picked, and goes once something is',
        /Highlight any text in the calendar to style it/.test(hintIdle) && hintArmed === '' && bar.classList.contains('has-target'),
        {idle: hintIdle, armed: hintArmed}, {idle: 'Highlight any text in the calendar to style it', armed: ''});
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(200);

    // ---- P4 + P5: no room ----
    await setRowWidth(Math.floor(need()) - 40);
    var s4 = await steady(), rowClassNarrow = row.className;
    var bR4 = R(bar), tlR = R(tools), tgR = R(tog), rowR = R(row);
    add('P4', 'no room: the bar alone drops to a line of its own under the tools, at the row\'s left edge; the toggle and the tools keep the first line, unwrapped',
        own() && bR4.top >= tlR.bottom && Math.abs(bR4.left - rowR.left) < 1 && Math.abs(mid(tgR) - mid(tlR)) < 1 && Math.round(tlR.height) === 30,
        {own: own(), bar: rnd(bR4), tools: rnd(tlR), toggle: rnd(tgR), rowLeft: Math.round(rowR.left)}, 'bar under the tools at the row\'s left');
    add('P5', 'it holds still: the class does not change once settled, on either side of the fit',
        s2 && s3 && s4, {wide: s2, header: s3, narrow: s4}, {wide: true, header: true, narrow: true});

    // ---- P6: the month view, no room ----
    q('#view-month-btn').click();
    await T.until(function () { return !!q('#table-wrap .month-view') && !!q('.month-step'); }, 'the month view and its stepper', 100, 50);
    await setRowWidth(null);
    await setRowWidth(Math.floor(need()) - 40);
    var stR = R(q('.month-step')), bR6 = R(bar);
    add('P6', 'the month view, no room: the bar shares the stepper\'s line, left of it, as before 10 Nov 2026',
        own() && Math.abs(mid(bR6) - mid(stR)) < 1 && bR6.right <= stR.left,
        {own: own(), bar: rnd(bR6), step: rnd(stR)}, 'level with the stepper, to its left');
    await setRowWidth(null);
    q('#view-sheet-btn').click();
    await T.until(function () { return !q('#table-wrap .month-view'); }, 'the waterfall', 100, 50);
    await T.sleep(300);

    // ---- P8: one value ----
    var tg = getComputedStyle(row).getPropertyValue('--tools-group-gap').trim();
    var waMR = getComputedStyle(q('#pop-solve-btn').closest('.tools-wrap')).marginRight;
    var hostMR = own() ? '(own line: 0 by design)' : getComputedStyle(host).marginRight;
    add('P8', 'the 16 px is one value: --tools-group-gap on the row, read by the margin after Build Around and after the bar',
        tg === '16px' && waMR === '16px' && (own() || hostMR === '16px'), {var: tg, afterBuildAround: waMR, afterBar: hostMR}, '16px everywhere');
    add('P9', 'the row itself never takes a class, on either side of the fit (the shareable copy clones its attributes)',
        rowClassWide === 'view-toggle-row' && rowClassNarrow === 'view-toggle-row' && row.className === 'view-toggle-row',
        {wide: rowClassWide, narrow: rowClassNarrow, now: row.className}, 'view-toggle-row');
  } catch (e) { out.EX = String(e && e.stack || e); }
  if(row) row.style.width = '';
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  add('Z', 'no console error or warning (a ResizeObserver loop would land here)', !errs.length, errs.slice(0, 3), []);
  if(out.EX) add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  out.cases = cases;
  out.pass = !out.EX && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
