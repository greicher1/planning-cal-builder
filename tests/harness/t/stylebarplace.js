// stylebarplace -- the preview toolbar's first line (owner, 10-11 Nov 2026). The view toggle at the left; then Shift and
// Build Around, the text style bar, the page tools (Fill Gaps, Side Boxes, Header: each its own grey button) and Undo /
// Redo. In the month view the month stepper (no Today) takes Fill Gaps' and Side Boxes' place, in the same grid cell, so
// nothing moves between views. ONE equal gap after every item, Redo's to the edge included, solved to fill the row
// (useToolbarFit, --tb-gap-fit on .preview-panel), never under 10 px and, since 16 Nov 2026, never over 14 px: on a wide
// window the line stays at its laptop size, packed LEFT, the spare room after Redo (owner's picker "On the right").
// Nothing moves as you click around: Highlight is always in the bar (greyed until a header or side-box line is picked),
// Header has a fixed width, Fill Gaps never leaves.
// Where the line cannot fit it FOLDS, always one line (owner's picker, 16 Nov 2026, "Icons, then a More menu"): classes
// tbf1-tbf5 on .preview-panel, cumulative. Until then the text bar alone dropped to its own line (`.style-own-line`).
// The real-window side (window widths, the menus, the 960 px minimum) is toolbarfit.mjs.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=fill-intent ./run.sh stylebarplace 300
//
// tests/fixtures/fill-intent.sptcal: a calendar on the automatic layout, so Fill Gaps is live (the widest toolbar). The
// harness window is fixed (1600 x 1200), so the leg sets the ROW's width to put the line either side of the fit.
//
// CASES
//   P0  the order: view toggle | date tools | Text button | text bar's host | tools [More [⋯, page tools (slot [pair,
//       stepper], Header)], Undo]
//   P1  the text bar's controls are Shift's height (30 px); the Size box draws its own arrow 8 px in
//   P2  a wide row: one line, nothing folded, packed left; the seven gaps between items all --tb-gap-max (14 px) and
//       the spare room after Redo
//   P2b just over the fit: all eight gaps equal (within 0.5 px), between --tb-gap-min and --tb-gap-max
//   P3  nothing moves when a header line is picked: Highlight comes on (it was greyed), every shared box stays put
//   P4  no room: the line FOLDS instead of wrapping. Narrowing the row step by step, the level never goes back down, it
//       reaches 5, every control on show stays level with the view toggle and inside the row, nothing drops to a
//       second line, and no `.style-own-line`
//   P5  the fit holds still: the level does not change once settled, wide or narrow
//   P6  the month view: the stepper covers the slot's span exactly, no Today; every shared box at the same place and size
//   P7  the hint is the bar's tooltip while nothing is picked, and goes once something is
//   P8  one value: the row's, the date tools', the page tools', the pair's and the tools' gaps are all --tb-gap; the solved
//       value is on .preview-panel; no section adds a margin
//   P9  the row itself carries no class and no style, on either side of the fit (the shareable copy clones its attributes)
//   P10 the looks: the view toggle, the text bar and Undo / Redo are one well look; Fill Gaps, Side Boxes and Header are grey
//       34 px buttons with no border; the date tools have no well
//   P11 the switch reads "Fill Gaps"; Header keeps one width in every mode, and Manual wears the navy outline, moving nothing
//   P12 the month view, folded (level 2+): the stepper is not on the line but in the More panel, the line is one line
//       above the phase map, and the ⋯ button opens the panel with the stepper in it
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
  var row, host, bar, tog, tools, panel;
  function own(){ return host.classList.contains('style-own-line'); }
  function lvl(){ return [1, 2, 3, 4, 5].filter(function (k) { return panel.classList.contains('tbf' + k); }).length; }
  // The controls on show on the first line, whatever the level.
  function onLine(){
    return [tog, $id('shift-group'), $id('pop-solve-btn'), q('.tb-text-btn', row), bar, $id('tb-fill-space-btn'), $id('tb-side-boxes-btn'),
            $id('tb-hdr-mode-btn'), q('.tb-more-btn', row), q('.undo-redo-group', row)]
      .filter(function (e) { return e && e.getClientRects().length && R(e).width > 0 && !e.closest('.tb-more.is-open .tb-page'); });
  }
  function $id(id){ return document.getElementById(id); }
  // The first line's items, in order, and what the fit needs (the eight items at the smallest gap).
  function items(){ return [tog, $id('shift-group'), $id('pop-solve-btn'), bar, $id('tb-fill-space-btn'), $id('tb-side-boxes-btn'), $id('tb-hdr-mode-btn'), q('.undo-redo-group', row)]; }
  function minGap(){ return parseFloat(getComputedStyle(row).getPropertyValue('--tb-gap-min')); }
  function need(){ return items().reduce(function (t, el) { return t + R(el).width; }, 0) + 8 * minGap(); }
  function gaps(){
    var it = items(), g = [];
    for(var i = 1; i < it.length; i++) g.push(+(R(it[i]).left - R(it[i - 1]).right).toFixed(2));
    g.push(+(R(row).right - R(it[it.length - 1]).right).toFixed(2));
    return g;
  }
  // Every shared box, for the "nothing moves" checks: left, top and width.
  function boxes(){
    var o = {};
    qa('.view-toggle, #shift-group, #pop-solve-btn, .style-bar, .style-bar .hf-ctl, #tb-hdr-mode-btn, .undo-redo-group, .undo-redo-group .icon-btn', row)
      .forEach(function (e, i) { var r = R(e); o[i] = [r.left, r.top, r.width]; });
    return o;
  }
  function moved(a, b){ var w = 0; Object.keys(a).forEach(function (k) { if(b[k]) for(var j = 0; j < 3; j++) w = Math.max(w, Math.abs(a[k][j] - b[k][j])); }); return +w.toFixed(2); }
  async function setRowWidth(w){ row.style.width = w == null ? '' : w + 'px'; window.dispatchEvent(new Event('resize')); await T.sleep(300); }
  async function steady(){ var seen = [lvl()]; for(var i = 0; i < 8; i++){ await T.sleep(60); seen.push(lvl()); } return seen.every(function (v) { return v === seen[0]; }); }
  async function view(v){ $id('view-' + v + '-btn').click(); await T.until(function () { return v === 'month' ? !!q('#table-wrap .month-view') : !q('#table-wrap .month-view'); }, 'the ' + v + ' view', 100, 50); await T.sleep(400); }
  try {
    await T.appReady();
    await T.until(function () { return !!q('.view-toggle-row .style-bar-host .style-bar'); }, 'the style bar', 60, 100);
    row = q('.view-toggle-row'); host = q('.style-bar-host', row); bar = q('.style-bar', host);
    tog = q('.view-toggle', row); tools = q('.preview-tools', row); panel = row.closest('.preview-panel');
    if(!$id('view-sheet-btn').classList.contains('active')) await view('sheet');

    // ---- P0: the order ----
    var kids = Array.from(row.children).map(function (e) { return e.classList.contains('tb-dates') ? 'tb-dates' : e.className.split(' ')[0]; });
    var tkids = Array.from(tools.children).map(function (e) { return e.classList.contains('tb-more') ? 'tb-more' : e.classList.contains('undo-redo-group') ? 'undo-redo-group' : e.className; });
    var more = q(':scope > .tb-more', tools), page = more && q(':scope > .tb-page', more), slots = page && q(':scope > .tb-slots', page), pair = slots && q(':scope > .tb-pair', slots);
    var ok0 = kids.indexOf('tb-dates') === kids.indexOf('view-toggle') + 1 && kids.indexOf('tb-text-btn') === kids.indexOf('tb-dates') + 1 &&
      kids.indexOf('style-bar-host') === kids.indexOf('tb-text-btn') + 1 &&
      kids.indexOf('preview-tools') === kids.indexOf('style-bar-host') + 1 && JSON.stringify(tkids) === JSON.stringify(['tb-more', 'undo-redo-group']) &&
      more.firstElementChild === q('.tb-more-btn', more) && !q('.tb-more-btn', more).id && !q('.tb-text-btn', row).id &&
      !!pair && !!q('#tb-fill-space-btn', pair) && !!q('#tb-side-boxes-btn', pair) && page.lastElementChild === $id('tb-hdr-mode-btn') &&
      !!q('#shift-group', q('.tb-dates', row)) && !!q('#pop-solve-btn', q('.tb-dates', row)) && !qa('[id]', host).length &&
      row.nextElementSibling === $id('table-wrap');
    add('P0', 'the order: view toggle | date tools | Text button | text bar | tools [More [⋯, page tools (slot [Fill Gaps, Side Boxes | stepper], Header)], Undo / Redo]',
        ok0, {row: kids, tools: tkids, pair: !!pair}, 'view-toggle | tb-dates | tb-text-btn | style-bar-host | preview-tools [tb-more, undo-redo-group] | …');

    // ---- P1: the text bar's controls ----
    var shiftH = Math.round(R($id('shift-group')).height);
    var hs = qa('.hf-ctl', bar).filter(function (e) { return e.offsetParent; }).map(function (e) { return Math.round(R(e).height); });
    var scs = getComputedStyle(q('.hf-size', bar));
    add('P1', "the text bar's controls are Shift's height (30 px), Highlight among them; the Size box draws its own arrow 8 px in",
        shiftH === 30 && hs.length >= 7 && hs.every(function (h) { return h === shiftH; }) && scs.appearance === 'none' && /calc\(100% - 8px\)/.test(scs.backgroundPosition),
        {shift: shiftH, controls: hs, arrowAt: scs.backgroundPosition}, {shift: 30, controls: '7, all 30'});

    var hintIdle = bar.title;

    // ---- P2: a wide row: the laptop size, packed left ----
    function maxGap(){ return parseFloat(getComputedStyle(row).getPropertyValue('--tb-gap-max')); }
    await setRowWidth(2400);
    var NEED = need();   // measured with nothing folded
    var s2 = await steady(), rowClassWide = row.className, rowStyleWide = row.getAttribute('style');
    var g2 = gaps(), inner2 = g2.slice(0, 7), mids2 = items().map(function (e) { return mid(R(e)); });
    add('P2', 'a wide row: nothing folded, one line, packed left; the seven gaps between items all --tb-gap-max, the spare room after Redo',
        lvl() === 0 && s2 && maxGap() === 14 && inner2.every(function (g) { return Math.abs(g - maxGap()) < 0.5; }) && g2[7] > 300 &&
          Math.abs(R(tog).left - R(row).left) < 1 && Math.max.apply(null, mids2) - Math.min.apply(null, mids2) < 1,
        {level: lvl(), gaps: g2, max: maxGap(), toggleLeft: Math.round(R(tog).left - R(row).left)}, 'seven gaps of 14, spare after Redo');
    // ---- P2b: just over the fit ----
    await setRowWidth(Math.ceil(NEED) + 16);
    var g2b = gaps(), spread = Math.max.apply(null, g2b) - Math.min.apply(null, g2b);
    add('P2b', 'just over the fit: nothing folded; all eight gaps equal, Redo to the edge included, between the minimum and the maximum',
        lvl() === 0 && !own() && spread < 0.5 && Math.min.apply(null, g2b) >= minGap() - 0.01 && Math.max.apply(null, g2b) <= maxGap() + 0.01,
        {level: lvl(), gaps: g2b, min: minGap(), max: maxGap()}, 'eight equal gaps, 10-14');

    // ---- P8: one value ----
    var tbGap = getComputedStyle(row).getPropertyValue('--tb-gap').trim();
    var g8 = {rowGap: getComputedStyle(row).columnGap, dates: getComputedStyle(q('.tb-dates', row)).columnGap, page: getComputedStyle(page).columnGap,
              pair: getComputedStyle(pair).columnGap, tools: getComputedStyle(tools).columnGap, fitOnPanel: panel.style.getPropertyValue('--tb-gap-fit').trim(),
              afterBuildAround: getComputedStyle($id('pop-solve-btn').closest('.tools-wrap')).marginRight,
              hostMargins: getComputedStyle(host).marginLeft + ' ' + getComputedStyle(host).marginRight};
    add('P8', 'one value: every gap on the line is --tb-gap, solved on .preview-panel; no section adds a margin',
        [g8.rowGap, g8.dates, g8.page, g8.pair, g8.tools].every(function (v) { return Math.abs(parseFloat(v) - parseFloat(tbGap)) < 0.01; }) &&
          parseFloat(g8.fitOnPanel) === parseFloat(tbGap) && g8.afterBuildAround === '0px' && g8.hostMargins === '0px 0px',
        Object.assign({var: tbGap}, g8), 'all equal to --tb-gap');

    // ---- P10: the looks ----
    var look = function (el) { var c = getComputedStyle(el); return [c.paddingTop, c.columnGap, c.borderTopLeftRadius, c.backgroundColor].join(' '); };
    var wells = {toggle: look(tog), text: look(bar), undo: look(q('.undo-redo-group', row))};
    var grey = getComputedStyle(tog).backgroundColor;
    var solos = ['tb-fill-space-btn', 'tb-side-boxes-btn', 'tb-hdr-mode-btn'].map(function (id) { var c = getComputedStyle($id(id)); return [c.backgroundColor === grey, Math.round(R($id(id)).height), c.borderTopLeftRadius, c.borderTopColor]; });
    var dcs = getComputedStyle(q('.tb-dates', row));
    add('P10', 'one well look (toggle, text bar, Undo / Redo); Fill Gaps, Side Boxes and Header grey 34 px buttons, no border; the date tools no well',
        wells.text === wells.toggle && wells.undo === wells.toggle && /^2px 2px 9px rgb/.test(wells.toggle) &&
          solos.every(function (s) { return s[0] && s[1] === 34 && s[2] === '9px' && s[3] === 'rgba(0, 0, 0, 0)'; }) &&
          dcs.backgroundColor === 'rgba(0, 0, 0, 0)' && dcs.paddingTop === '0px',
        {wells: wells, solos: solos}, 'as described');

    // ---- P3: a header line picked ----
    var b0 = boxes(), hlWasOff = q('.hf-swatch-hl', bar).classList.contains('is-disabled') && !q('.hf-swatch-hl', bar).hidden;
    var line = q('#table-wrap .cal-header-bar .hdr-line[data-hid="c2"]') || q('#table-wrap .cal-header-bar .hdr-line');
    if(line){ line.click(); await T.sleep(450); }
    var hlOn = !q('.hf-swatch-hl', bar).classList.contains('is-disabled'), m3 = moved(b0, boxes());
    add('P3', 'a header line picked: Highlight comes on (it was greyed, never hidden) and no shared box moves or resizes',
        !!line && hlWasOff && hlOn && m3 < 0.5, {line: !!line, greyedBefore: hlWasOff, onAfter: hlOn, moved: m3}, {moved: 0});
    var hintArmed = bar.title;
    add('P7', 'the hint is the bar\'s tooltip while nothing is picked, and goes once something is',
        /Highlight any text in the calendar to style it/.test(hintIdle) && hintArmed === '', {idle: hintIdle, armed: hintArmed}, 'hint, then empty');
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(250);

    // ---- P11: the switch's name; Header's width and Manual's outline ----
    var hb = $id('tb-hdr-mode-btn'), wAuto = R(hb).width, b11 = boxes();
    hb.click(); await T.sleep(400);
    var choice = qa('.hdr-mode-choice').filter(function (c) { return /Manual/.test(c.textContent); })[0];
    if(choice){ choice.click(); await T.sleep(700); }
    var hcs = getComputedStyle(hb), m11 = moved(b11, boxes());
    var navy = hcs.borderTopColor === 'rgb(44, 62, 80)' && hcs.color === 'rgb(44, 62, 80)';
    add('P11', 'the switch reads "Fill Gaps"; Header keeps its width on Manual, wears the navy outline, and nothing moves',
        $id('tb-fill-space-btn').textContent.trim() === 'Fill Gaps' && !!choice && hb.classList.contains('is-manual') && Math.abs(R(hb).width - wAuto) < 0.5 && navy && m11 < 0.5,
        {label: $id('tb-fill-space-btn').textContent.trim(), manual: hb.classList.contains('is-manual'), widthAuto: +wAuto.toFixed(1), widthManual: +R(hb).width.toFixed(1), navy: navy, moved: m11},
        {label: 'Fill Gaps', manual: true, navy: true, moved: 0});

    // ---- P6: the month view ----
    var bW = boxes(), fR = R($id('tb-fill-space-btn')), sR = R($id('tb-side-boxes-btn'));
    await view('month');
    var st = q('.tb-slots > .month-step', row), stR = st && R(st), mM = moved(bW, boxes());
    add('P6', 'the month view: the stepper covers Fill Gaps\' and Side Boxes\' span exactly, no Today; no shared box moves or resizes',
        !!st && Math.abs(stR.left - fR.left) < 0.5 && Math.abs(stR.right - sR.right) < 0.5 && !q('.ms-today', st) && mM < 0.5 &&
          getComputedStyle($id('tb-side-boxes-btn')).visibility === 'hidden' && getComputedStyle($id('tb-fill-space-btn')).visibility === 'hidden',
        {stepper: stR && rnd(stR), slot: [Math.round(fR.left), Math.round(sR.right)], today: !!(st && q('.ms-today', st)), moved: mM}, {moved: 0, today: false});

    // ---- P12: the month view, folded ----
    await setRowWidth(Math.floor(NEED) - 260);
    var lv12 = lvl(), st12 = q('.tb-slots > .month-step', row), sh12 = R($id('shift-group')), map12 = q('.view-toggle-row > .month-map');
    var line12 = onLine().every(function (e) { return Math.abs(mid(R(e)) - mid(sh12)) < 1; });
    var offLine = !!st12 && !st12.getClientRects().length;
    q('.tb-more-btn', row).click(); await T.sleep(300);
    var inPanel = !!st12 && st12.getClientRects().length > 0 && !!st12.closest('.tb-more.is-open .tb-page') && R(st12).width > 150;
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); await T.sleep(250);
    add('P12', 'the month view, folded: the stepper leaves the line for the More panel, the line stays one line above the phase map, and ⋯ shows the stepper',
        lv12 >= 2 && offLine && line12 && !!map12 && R(map12).top >= sh12.bottom && inPanel && !q('.tb-more', row).classList.contains('is-open'),
        {level: lv12, offLine: offLine, oneLine: line12, inPanel: inPanel}, 'level 2+, stepper in the panel');
    await setRowWidth(null);
    await view('sheet');

    // ---- P4 + P5: no room: it folds ----
    var ladder = [], bad = [], prev = 0;
    for(var w = Math.floor(NEED) - 1; w >= 540; w -= 40){
      await setRowWidth(w);
      var L = lvl(), shown = onLine(), tgm = mid(R(tog)), rr = R(row).right;
      var level = shown.every(function (e) { return Math.abs(mid(R(e)) - tgm) < 1; });
      var inside = shown.every(function (e) { return R(e).right <= rr + 0.5; });
      ladder.push(w + ':' + L);
      if(L < prev || !level || !inside || own() || bar.getBoundingClientRect().top > R(tog).bottom) bad.push({w: w, level: L, oneLine: level, inside: inside, own: own()});
      prev = L;
    }
    var s4 = await steady(), rowClassNarrow = row.className, rowStyleNarrow = row.getAttribute('style');
    add('P4', 'no room: it folds instead of wrapping; narrowing step by step the level never goes back, reaches 5, and every control on show stays on one line inside the row',
        !bad.length && prev === 5 && ladder.length > 10, {ladder: ladder.join(' '), bad: bad.slice(0, 4)}, 'monotonic 0 to 5, one line');
    add('P5', 'the fit holds still: the level does not change once settled, wide or narrow', s2 && s4, {wide: s2, narrow: s4}, 'steady');
    await setRowWidth(null);

    // ---- P9: the row carries nothing ----
    add('P9', 'the row itself carries no class and no style on either side of the fit (the shareable copy clones its attributes)',
        rowClassWide === 'view-toggle-row' && rowClassNarrow === 'view-toggle-row' && row.className === 'view-toggle-row' &&
          !String(rowStyleWide || '').includes('--tb') && !String(rowStyleNarrow || '').includes('--tb'),
        {wide: rowClassWide, narrow: rowClassNarrow, styleWide: rowStyleWide}, 'view-toggle-row, no --tb style');
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
