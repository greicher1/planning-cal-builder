// stylebarplace -- the preview toolbar's sections and where the text style bar sits (owner, 10 Nov 2026). The bar was a
// full-width boxed line under the toolbar ("TEXT", the buttons, a hint). Since variation 27 of
// mockups/toolbar-variations.html (owner: "Lets go with 27", then "remove the faint grey box surrounding the shift and
// build around buttons") the view toggle sits alone at the left edge, and Undo / Redo, the text style buttons, the date
// tools and the page tools are packed to the right, one gap (--tb-gap, 12 px) between every section; Undo / Redo, the
// text buttons and the page tools sit in grey wells like the view toggle's (2 px padding, 2 px between buttons, 9 px
// corners), Shift and Build Around in none. Where the sections no longer fit on one line the text bar alone drops to its
// old line (PreviewToolbar.jsx, useStyleBarFit: `.style-own-line` on the host).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=fill-intent ./run.sh stylebarplace 300
//
// tests/fixtures/fill-intent.sptcal: a calendar on the automatic layout, so Fill Gaps shows (the widest toolbar).
// The harness window is fixed (1600 x 1200), so the leg sets the ROW's width to put the toolbar either side of the
// fit (the row is what the fit measures) and puts it back at the end.
//
// CASES
//   P0  the row reads view toggle | Undo / Redo | the style bar's host | the tools, and the tools hold the date tools'
//       section (Shift, Build Around) then the page tools' well (Fill Gaps, Side Boxes, Header); no id in the host;
//       row -> #table-wrap kept
//   P1  the buttons are the toolbar's: every shown control 30 px tall (Shift's height), the Size box draws its own
//       arrow 8 px in from the edge
//   P2  room for everything: all five sections on the first line, centred on it; Undo -> text, text -> Shift and Build
//       Around -> the page tools each exactly --tb-gap (12 px); the free space between the view toggle and Undo
//   P3  a header line picked: the Highlight well appears, the bar grows to the left, and nothing else moves (the fit
//       counts the well as shown, so the line does not flip)
//   P4  no room: the bar alone drops to a line of its own under the tools, at the row's left edge; the toggle, Undo and
//       the tools keep the first line, unwrapped, 12 px apart
//   P5  it holds still: the class does not flip back and forth after it settles, on either side of the fit
//   P6  the month view, no room: the bar shares the stepper's line, left of the stepper, as before 10 Nov 2026
//   P7  the hint is the bar's tooltip while nothing is picked, and goes once something is
//   P8  the gap is one value: --tb-gap (12 px) is the row's column gap and the tools' own; nothing adds a margin of its
//       own (Build Around's old 16 px, the bar's old margins)
//   P9  the row itself never takes a class, on either side of the fit: the shareable copy is a clone that keeps the row's
//       attributes (sharecopy2 wants `<div class="view-toggle-row"></div>`), so the fit's class lives on the host
//   P10 the wells are one look: the view toggle, Undo / Redo, the style bar and the page tools each 2 px padding, 2 px
//       between buttons, 9 px corners and the view toggle's grey; the date tools have no well (no ground, no padding)
//   P11 the switch reads "Fill Gaps" (owner, 10 Nov 2026), its id still tb-fill-space-btn
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
  var row, host, bar, tog, tools, undo;
  function own(){ return host.classList.contains('style-own-line'); }
  // What the fit needs, worked out here on its own terms: the four sections, the row's three gaps, and the Highlight
  // well's slot when it is hidden.
  function need(){
    var sw = q('.hf-swatch:not(.hf-swatch-hl)', bar), hl = q('.hf-swatch-hl', bar);
    var gap = parseFloat(getComputedStyle(row).columnGap);
    return tog.offsetWidth + gap + undo.offsetWidth + gap + bar.offsetWidth +
      (hl.hidden ? sw.offsetWidth + parseFloat(getComputedStyle(bar).columnGap) : 0) + gap + tools.offsetWidth;
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
    tog = q('.view-toggle', row); tools = q('.preview-tools', row); undo = q('.undo-redo-group', row);
    if(!q('#view-sheet-btn').classList.contains('active')){ q('#view-sheet-btn').click(); await T.sleep(600); }

    // ---- P0: where it is in the markup ----
    var kids = Array.from(row.children).map(function (e) { return e.className.split(' ')[0]; });
    var tkids = Array.from(tools.children).map(function (e) { return e.className.split(' ').slice(0, 2).join(' '); });
    var dates = q('.tb-dates', tools), page = q('.tb-page', tools);
    var datesHold = !!dates && !!q('#shift-group', dates) && !!q('#pop-solve-btn', dates);
    var pageHold = !!page && ['tb-fill-space-btn', 'tb-side-boxes-btn', 'tb-hdr-mode-btn'].every(function (id) { return !!q('#' + id, page); });
    add('P0', 'the row reads view toggle | Undo / Redo | the style bar | the tools (the date tools, then the page tools\' well); no id in the host',
        kids.indexOf('undo-redo-group') === kids.indexOf('view-toggle') + 1 && kids.indexOf('style-bar-host') === kids.indexOf('undo-redo-group') + 1 &&
          kids.indexOf('preview-tools') === kids.indexOf('style-bar-host') + 1 && JSON.stringify(tkids) === JSON.stringify(['tb-well tb-dates', 'tb-well tb-page']) &&
          datesHold && pageHold && !qa('[id]', host).length && row.nextElementSibling === document.getElementById('table-wrap'),
        {row: kids, tools: tkids, datesHold: datesHold, pageHold: pageHold}, 'view-toggle | undo-redo-group | style-bar-host | preview-tools [tb-dates, tb-page] | …');

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

    // ---- P2: room for everything ----
    await setRowWidth(Math.ceil(need()) + 40);
    var s2 = await steady(), rowClassWide = row.className;
    var bR = R(bar), shR = R(q('.shift-group')), tR = R(tog), uR = R(undo), baR = R(q('#pop-solve-btn')), pgR = R(q('.tb-page'));
    var tbGap = parseFloat(getComputedStyle(row).getPropertyValue('--tb-gap'));
    var gp = {undoToText: +(bR.left - uR.right).toFixed(2), textToShift: +(shR.left - bR.right).toFixed(2), buildAroundToPage: +(pgR.left - baR.right).toFixed(2)};
    var mids = [tR, uR, bR, shR, pgR].map(mid);
    add('P2', 'room for everything: five sections on one line, centred on it; Undo -> text, text -> Shift, Build Around -> page tools each the one 12 px gap; the free space left of Undo',
        !own() && s2 && tbGap === 12 && Object.keys(gp).every(function (k) { return Math.abs(gp[k] - tbGap) < 0.5; }) &&
          Math.max.apply(null, mids) - Math.min.apply(null, mids) < 1 && uR.left - tR.right > 30,
        Object.assign({own: own(), tbGap: tbGap, leftSpace: Math.round(uR.left - tR.right), midsSpread: +(Math.max.apply(null, mids) - Math.min.apply(null, mids)).toFixed(2)}, gp),
        {own: false, tbGap: 12, undoToText: 12, textToShift: 12, buildAroundToPage: 12});

    // ---- P10: the wells are one look ----
    var look = function (el) { var c = getComputedStyle(el); return [c.paddingTop, c.columnGap, c.borderTopLeftRadius, c.backgroundColor].join(' '); };
    var wells = {toggle: look(tog), undo: look(undo), text: look(bar), page: look(page)};
    var dcs = getComputedStyle(dates);
    var heights = [tog, undo, bar, page].map(function (e) { return Math.round(R(e).height); });
    add('P10', 'the wells are one look (2 px padding, 2 px between buttons, 9 px corners, the toggle\'s grey); the date tools have no well',
        Object.keys(wells).every(function (k) { return wells[k] === wells.toggle; }) && /^2px 2px 9px rgb/.test(wells.toggle) &&
          dcs.backgroundColor === 'rgba(0, 0, 0, 0)' && dcs.paddingTop === '0px' && heights.every(function (h) { return h === 34; }),
        {wells: wells, dates: dcs.paddingTop + ' ' + dcs.backgroundColor, heights: heights}, {every: '2px 2px 9px <grey>', dates: '0px transparent', heights: 34});

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
        own() && bR4.top >= tlR.bottom && Math.abs(bR4.left - rowR.left) < 1 && Math.abs(mid(tgR) - mid(tlR)) < 1 &&
          Math.abs(mid(R(undo)) - mid(tlR)) < 1 && Math.round(tlR.height) === 34 && Math.abs(tlR.left - R(undo).right - 12) < 0.5,
        {own: own(), bar: rnd(bR4), tools: rnd(tlR), undo: rnd(R(undo)), toggle: rnd(tgR), rowLeft: Math.round(rowR.left)}, 'bar under the tools at the row\'s left');
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
    var tg = getComputedStyle(row).getPropertyValue('--tb-gap').trim();
    var g8 = {var: tg, rowGap: getComputedStyle(row).columnGap, toolsGap: getComputedStyle(tools).columnGap,
              afterBuildAround: getComputedStyle(q('#pop-solve-btn').closest('.tools-wrap')).marginRight,
              hostMargins: getComputedStyle(host).marginLeft + ' ' + getComputedStyle(host).marginRight};
    add('P8', 'the gap is one value: --tb-gap (12 px) is the row\'s and the tools\' column gap; no section adds a margin of its own',
        tg === '12px' && g8.rowGap === '12px' && g8.toolsGap === '12px' && g8.afterBuildAround === '0px' && g8.hostMargins === '0px 0px',
        g8, {var: '12px', rowGap: '12px', toolsGap: '12px', afterBuildAround: '0px', hostMargins: '0px 0px'});
    var fg = q('#tb-fill-space-btn');
    add('P11', 'the switch reads "Fill Gaps", its id still tb-fill-space-btn',
        !!fg && fg.textContent.trim() === 'Fill Gaps', fg && fg.textContent.trim(), 'Fill Gaps');
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
