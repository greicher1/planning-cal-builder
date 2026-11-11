// swapbtnwhere -- the Swap Column button shows only where its click leads to a swap (owner, 10 Nov 2026, a screenshot
// of it on Production beside Simultaneous Post: "this swap column button shouldn't show up at all here", then "In fact
// it shouldn't show up anywhere it doesnt make sense. For example its also showing up in places where theres only one
// collumn for a phase's entire span").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=swapbtn-simpost-shared ./run.sh swapbtnwhere 120
//
// The fixture is the screenshot's shape, synthetic: in 2026 Writer's Rm runs alone (full width), Design and Prep
// overlap for two weeks (Prep in the second column), then Production runs with Sim Post glued beside it and only the
// Notes column beyond. Sim Post's lane is SHARED with Prep's two weeks, so it is not an inserted column. 2027 holds
// Post alone. Before the fix the button showed on every 2026 block (the year had a second column), and on Production
// its click drew a knob, "Move Production into the free column, after Prep", which left Production where it was and
// swapped Design and Prep instead.
//
//   W0  the layout is the one described: 2026 has two phase columns, Production in the first, Sim Post beside it
//   W1  Writer's Rm, alone in its column for its whole run: no button
//   W2  Production beside Sim Post, nothing beyond: no button
//   W3  2027's Post, the year's only column: no button
//   W4  Prep, which shares two weeks with Design: the button shows, and its click draws a knob
//   W5  Production's whole block selected BY HAND (click its first week, Shift-click its last): no knob either way,
//       so the bogus "Move Production into the free column" is gone from the knob too, not just the button
//   E0  0 console errors
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function tds(pkey, year) {
    return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
      return td.dataset.pkey === pkey && (!year || td.dataset.week.slice(0, 4) === year);
    });
  }
  function centre(td){ td.scrollIntoView({block: 'center'}); var r = td.getBoundingClientRect(); return {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)}; }
  function ptr(type, el, c, opts) {
    el.dispatchEvent(new PointerEvent(type, Object.assign({bubbles: true, cancelable: true, composed: true, clientX: c.x, clientY: c.y,
      button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 7, pointerType: 'mouse', isPrimary: true}, opts || {})));
  }
  var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
  var knobs = function () { return Array.prototype.map.call(document.querySelectorAll('.grid-swap-layer .grid-swap-knob'),
    function (k) { return k.dataset.dir + ' ' + (k.getAttribute('aria-label') || ''); }); };
  // Off every cell, then onto the middle week of the block: the button is drawn only when the block under the
  // pointer CHANGES. 450 ms is what onecol and simpostbeside allow; the verdict is synchronous.
  async function hoverBlock(pkey, year) {
    var list = tds(pkey, year);
    if (!list.length) throw new Error('no ' + pkey + ' cells in ' + year);
    var td = list[Math.floor(list.length / 2)], c = centre(td);
    await T.sleep(150);
    c = centre(td);
    ptr('pointermove', document.body, {x: 1, y: 1});
    await T.sleep(150);
    ptr('pointermove', td, c);
    await T.sleep(450);
    var b = btn();
    return b ? b.dataset.pkey + '/' + b.dataset.year : null;
  }
  async function clearSel() {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(250);
  }
  try {
    await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 1; }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 100, 100);

    var cols = Array.prototype.map.call(document.querySelectorAll('#table-wrap colgroup col'), function (c) { return c.dataset.ckey; });
    var prod = tds('production', '2026'), sim = Array.prototype.filter.call(document.querySelectorAll('#table-wrap td'),
      function (td) { return /Simultaneous Post/.test(td.textContent); }).length;
    var prepOwn = tds('prodPrep', '2026').map(function (td) { return td.dataset.own; });
    var w0 = cols.join(' ') === 'y2026:date y2026:s0 y2026:s1 y2026:notes y2027:date y2027:s0 y2027:notes'
      && prod.length === 20 && prod.every(function (td) { return td.dataset.own === '0' && td.dataset.a === '0' && td.dataset.b === '0'; })
      && sim === 20 && prepOwn.indexOf('1') >= 0 && tds('writersRoom', '2026').every(function (td) { return td.dataset.a === '0' && td.dataset.b === '1'; });
    add('W0', 'the fixture lays out as described: Production in the first of two columns, Sim Post beside it, Prep in the second for two weeks',
      w0, {cols: cols, prod: prod.length, sim: sim, prepOwn: prepOwn}, 'two phase columns in 2026, one in 2027');

    var wr = await hoverBlock('writersRoom', '2026');
    add('W1', 'Writer’s Rm, alone in its column for its whole run: no Swap Column button', wr === null, wr, 'no button');
    var pr = await hoverBlock('production', '2026');
    add('W2', 'Production beside Sim Post, with only the Notes column beyond: no Swap Column button', pr === null, pr, 'no button');
    var po = await hoverBlock('post', '2027');
    add('W3', '2027’s Post, the year’s only column: no Swap Column button', po === null, po, 'no button');

    var pp = await hoverBlock('prodPrep', '2026');
    var k4 = [];
    if (pp) {
      btn().focus(); btn().click();
      await T.until(function () { return knobs().length > 0; }, 'a knob after Swap Column on Prep', 60, 100);
      k4 = knobs();
    }
    add('W4', 'Prep, which shares two weeks with Design: the button shows, and its click draws a swap knob',
      pp === 'prodPrep/2026' && k4.length === 1 && /Prep with Design/.test(k4[0]), {button: pp, knobs: k4}, 'prodPrep/2026 and one knob naming Design');
    await clearSel();

    // W5: the same block by hand, so no button is involved: Cmd-click its first week (the path noswapbtns and
    // colswapmove select by), then Shift-click its last.
    var first = tds('production', '2026')[0], lastTd = tds('production', '2026').slice(-1)[0];
    var c1 = centre(first); await T.sleep(120); c1 = centre(first);
    ptr('pointerdown', first, c1, {metaKey: true}); ptr('pointerup', first, c1, {metaKey: true});
    await T.sleep(150);
    var c2 = centre(lastTd); await T.sleep(120); c2 = centre(lastTd);
    ptr('pointerdown', lastTd, c2, {shiftKey: true}); ptr('pointerup', lastTd, c2, {shiftKey: true});
    await T.sleep(150);
    var selected = document.querySelectorAll('.grid-sel-layer .grid-sel-cell').length;
    // The verdicts land 140 ms after the selection settles (ensureSwapCandidates); give them well over that.
    await T.sleep(1200);
    var k5 = knobs();
    add('W5', 'Production’s whole block selected by hand: no knob either way (no "Move Production into the free column")',
      selected > 0 && k5.length === 0, {outlines: selected, knobs: k5}, 'a selection and no knob');
    await clearSel();

    var errs = T.appHealth().errors;
    add('E0', '0 console errors', errs.length === 0, {errors: errs.slice(0, 5)}, 'none');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'swapbtnwhere', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
