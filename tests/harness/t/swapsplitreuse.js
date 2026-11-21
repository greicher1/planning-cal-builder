// swapsplitreuse -- Reuse Empty Columns gave a year an extra column, and Swap Column then split a phase
// (owner, 4 Nov 2026, with before/after screenshots: "turning off reuse empty collumns fixed it! But how
// would a user know that was what they needed to turn off?" Answer ruled "Fix both").
//
// Fixture: ?state=swapsplit-reuse -- made up, Reuse Empty Columns ticked, no region, Sim Post on:
//
//     Post        2/7/33,  26 wk   -> its own column, 2033 only
//     Writers     5/2/33,  70 wk   -> to 9/34
//     Design      7/4/33,  20 wk   -> hands off to Prep the week it ends
//     Prep       11/21/33, 16 wk   -> hands off to Production
//     Production  3/13/34, 6 eps x 10 days
//     Late Post  11/6/34,  10 wk   -> starts after EVERY column is free (no handoff)
//
// Before the fix, rule 3 ("the lowest free column") put Late Post in Post's 2033 column. Nothing else
// uses that column in 2034, so 2034 got a 4th column, and the block swap of Prep (Production moves with
// it) needed Sim Post to land in that column: refused, and the arrow fell back to swapping only the
// weeks Prep and Writers share, which left Writers in two columns. Now rule 3 prefers a free column
// already used in the phase's years, 2034 keeps 3 columns, and the whole-column swap is offered.
//
// ⛔ Hover, selection and the button are REAL pointer events at REAL coordinates, as in colswappartial.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 100, 100);

    var BLOCK = 'Swap the 2034 block of Prep with Writers (Production moves with it)';
    var DIR = -1;   // towards Writers, which the layout rules put LEFT of Prep (see step 2)
    function cells(pkey, year) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
        return td.dataset.pkey === pkey && td.dataset.week.slice(0, 4) === String(year);
      });
    }
    function cell(wk, pkey) {
      return Array.prototype.find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk && td.dataset.pkey === pkey; }) || null;
    }
    function owns(pkey, year) {
      var s = {}; cells(pkey, year).forEach(function (td) { s[td.dataset.own] = 1; });
      return Object.keys(s).map(Number).sort();
    }
    function phaseCols(year) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap colgroup col[data-ckey]'),
        function (c) { return new RegExp('^y' + year + ':s\\d+$').test(c.dataset.ckey); }).length;
    }
    function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
    function ptr(type, el, at) {
      el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y,
        button: 0, buttons: type === 'pointerup' || type === 'pointermove' ? 0 : 1,
        pointerId: 7, pointerType: 'mouse', isPrimary: true
      }));
    }
    async function hover(el) { var c = centre(el); ptr('pointermove', el, c); await T.sleep(80); return c; }
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    var knob = function (dir) { return document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="' + dir + '"]'); };
    async function clickStintBtn(wk, pkey) {
      var td = cell(wk, pkey);
      td.scrollIntoView({ block: 'center', inline: 'center' });
      await T.sleep(120);
      await hover(td);
      await T.until(function () { return btn() && btn().dataset.pkey === pkey; }, 'the Swap Column button on ' + pkey, 40, 50);
      btn().click();
      await T.sleep(60);
    }

    // 0. The fixture loaded with reuse on.
    out.latePost = cells('custom1', 2034).length;
    out.reuseOn = !!(document.querySelector('#col-reuse') || {}).checked;

    // 1. 2034 has 3 column slots (Writers, Production, Sim Post's lane), not 4: Late Post shares a column
    //    already used in 2034 (rule 4: an unused column sorts after every used one).
    out.cols2034 = phaseCols(2034);
    out.lateOwn = owns('custom1', 2034);
    out.writersOwn = owns('writersRoom', 2034);
    out.prodOwn = owns('production', 2034);

    // 2. Swap Column on Prep's 2034 block: the knob towards Writers is the WHOLE-column swap, teal, no dashed box.
    // ⭐ Since the layout rules (5 Nov 2026, LAYOUT-RULES.md) Writers' column is already LEFT of Prep's in 2034 --
    // rule 9 orders a year's columns by their top phase's start, and Writers started before Design -- so the
    // partner is on the left and the swap goes that way; before, with Production renumbered column 0, Writers sat
    // right of the lane and the swap stepped over it.
    await clickStintBtn('2034-01-16', 'prodPrep');
    await T.until(function () { return !!knob(DIR); }, 'a knob towards Writers on Prep\'s block', 120, 100).catch(function () {});
    out.knobLabels = { left: knob(-1) ? knob(-1).getAttribute('aria-label') : null, right: knob(1) ? knob(1).getAttribute('aria-label') : null };
    out.knob = knob(DIR) ? knob(DIR).getAttribute('aria-label') : null;
    out.knobPartial = !!(knob(DIR) && knob(DIR).classList.contains('is-partial'));
    out.partialBox = !!document.querySelector('.grid-sel-layer .grid-swap-partial');

    // 3. Commit: Writers ends up in ONE column for all of 2034, on the other side of Production.
    T.altSwap(DIR);
    await T.until(function () { return owns('writersRoom', 2034).join() !== out.writersOwn.join(); },
      'the swap to land', 120, 100).catch(function () {});
    await T.sleep(200);
    out.writersAfter = owns('writersRoom', 2034);
    out.prodAfter = owns('production', 2034);
    out.prepAfter = owns('prodPrep', 2034);

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    var C = function (id, title, pass) { return { id: id, title: title, pass: !!pass }; };
    out.cases = [
      C('S0', 'the fixture: reuse on, Late Post drawn in 2034', out.latePost > 0),
      C('S1', 'Late Post takes a column already used in 2034, so 2034 keeps 3 column slots -- slots ' + out.cols2034
        + ', Late Post ' + out.lateOwn + ', Writers ' + out.writersOwn + ', Production ' + out.prodOwn,
        out.cols2034 === 3 && out.lateOwn.length === 1
        && (out.lateOwn[0] === out.writersOwn[0] || out.lateOwn[0] === out.prodOwn[0])),
      C('S2', 'Swap Column on Prep offers the whole-column swap, teal, with no dashed box -- ' + out.knob,
        out.knob === BLOCK && !out.knobPartial && !out.partialBox),
      C('S3', 'after the swap Writers sits in ONE column for all of 2034, right of Production and its lane -- Writers '
        + out.writersAfter + ', Production ' + out.prodAfter + ', Prep ' + out.prepAfter,
        out.writersAfter.length === 1 && out.prodAfter.length === 1 && out.prepAfter.length === 1
        && out.writersAfter[0] > out.prodAfter[0] && out.prepAfter[0] === out.prodAfter[0]),
      C('S4', '0 console errors, 0 clipped cells', out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length))
    ];
    out.pass = out.cases.every(function (c) { return c.pass; });
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
