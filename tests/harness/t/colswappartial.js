// colswappartial -- swapping PART of a column when the rest of it is widened by hand (owner, 2 Nov 2026:
// "for swapping a portion of a column (such as 3 cells only while all the others have been extended) the
// little blue arrow only pops up when you drag the cursor across to the cells in the column next to it.
// If you just select the cells in the one column, and click swap column, no blue arrow pops up.")
//
// Fixture: ?state=colswap-widened -- colswap-gesture with Prod Prep's two lone weeks WIDENED by hand
// (a live cellSpans claim on each, exactly what a double-click writes):
//
//     11/2   Prod Prep wk 1 ---------------    <- both columns, hand-set
//     11/9   Prod Prep wk 2 ---------------    <- both columns, hand-set
//     11/16  Prod Prep wk 3 | Post wk 1
//     11/23  Prod Prep wk 4 | Post wk 2
//     11/30  Prod Prep wk 5 | Post wk 3
//     12/7   Prod Prep wk 6 | Post wk 4
//
// Post's four cells are Post's WHOLE block, so selecting them (or its Swap Column button) resolves to the
// BLOCK swap, which carries all of Prod Prep with it (E1) and is refused for the widened weeks (D4). Before
// the fix that left no knob at all. Now a refused block falls back to the per-week swap of the weeks the two
// share, and the per-week swap walks on past a seed with nothing beside it. Both must leave the widened
// weeks exactly as they were.
//
// gate.sh runs it on colswap-widened-reuse too: the same calendar with Reuse Empty Columns ticked, as every
// new calendar starts since 2 Nov 2026. After the first swap Prod Prep sits in two columns, so Post's block
// has no partner, and with reuse on that asks for a move into the free column. A refused move used to be
// returned before the per-week fallback, which left no knob to swap back (P3, then P4).
//
// ⛔ Hover, selection and the button are REAL pointer events at REAL coordinates, as in stintbtn: hitCell()
// walks elementsFromPoint, and gridSel is session UI unreachable from outside the IIFE.
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

    var PP = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    var OVERLAP = PP.slice(2);
    var NATURAL = 'post@1/cs1 prodPrep@0/cs1', SWAPPED = 'post@0/cs1 prodPrep@1/cs1', WIDE = 'prodPrep@0/cs2';
    var LABEL_POST = 'Swap Post with Prod Prep (11/16/26–12/7/26)';
    var LABEL_PP = 'Swap Prod Prep with Post (11/16/26–12/7/26)';
    function cell(wk, pkey) {
      return Array.prototype.find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk && td.dataset.pkey === pkey; }) || null;
    }
    function rowOf(wk) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk; })
        .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own + '/cs' + (td.getAttribute('colspan') || 1); })
        .sort().join(' ');
    }
    function snapshot() { var o = {}; PP.forEach(function (w) { o[w] = rowOf(w); }); return o; }
    function shape(snap, overlap) {
      return PP.every(function (w, i) { return snap[w] === (i < 2 ? WIDE : overlap); });
    }
    function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
    function ptr(type, el, at, opts) {
      el.dispatchEvent(new PointerEvent(type, Object.assign({
        bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y,
        button: 0, buttons: type === 'pointerup' || type === 'pointermove' ? 0 : 1,
        pointerId: 7, pointerType: 'mouse', isPrimary: true
      }, opts || {})));
    }
    async function hover(el) { var c = centre(el); ptr('pointermove', el, c); await T.sleep(80); return c; }
    async function metaClick(wk, pkey) {
      var td = cell(wk, pkey), c = centre(td);
      ptr('pointerdown', td, c, { metaKey: true }); ptr('pointerup', td, c, { metaKey: true });
      await T.sleep(40);
    }
    function escape() {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    }
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    var knob = function (dir) { return document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="' + dir + '"]'); };
    var knobs = function () { return Array.prototype.map.call(document.querySelectorAll('.grid-swap-layer .grid-swap-knob'), function (k) { return k.dataset.dir; }); };
    async function clickStintBtn(wk, pkey) {
      await hover(cell(wk, pkey));
      await T.until(function () { return btn() && btn().dataset.pkey === pkey; }, 'the Swap Column button on ' + pkey, 40, 50);
      btn().click();
      await T.sleep(60);
    }

    // 0. The fixture: two hand-widened weeks, then the natural overlap.
    out.before = snapshot();
    out.widenedBefore = shape(out.before, NATURAL);
    cell('2026-11-30', 'prodPrep').scrollIntoView({ block: 'center' });
    await T.sleep(120);

    // 1. Swap Column on POST -- its whole block, the block swap is refused. The LEFT knob must still come
    //    up, offering the four weeks the two share.
    await clickStintBtn('2026-11-23', 'post');
    out.postSelected = document.querySelectorAll('.grid-sel-layer .grid-sel-cell').length;
    await T.until(function () { return !!knob(-1); }, 'a left knob on Post\'s block', 120, 100).catch(function () {});
    out.postKnob = knob(-1) ? knob(-1).getAttribute('aria-label') : null;
    out.postNoRightKnob = !knob(1);
    // 2. Commit it: those four weeks trade columns, and the two widened weeks are untouched.
    T.altSwap(-1);
    await T.until(function () { return rowOf('2026-11-16') === SWAPPED; }, 'the Post swap to land', 120, 100).catch(function () {});
    await T.sleep(200);
    out.afterPost = snapshot();
    out.postSwapped = shape(out.afterPost, SWAPPED);
    out.postSilent = !document.querySelector('.grid-swap-layer .grid-swap-chip');
    // 3. The selection survives; the knob turns round and swapping back restores the fixture exactly.
    await T.until(function () { return !!knob(1); }, 'the knob to follow the move', 120, 100).catch(function () {});
    out.postKnobBack = knob(1) ? knob(1).getAttribute('aria-label') : null;
    T.altSwap(1);
    await T.until(function () { return rowOf('2026-11-16') === NATURAL; }, 'the reverse to land', 120, 100).catch(function () {});
    await T.sleep(200);
    out.postRestored = shape(snapshot(), NATURAL);

    // 4. Swap Column on PROD PREP -- the long phase's whole block, refused for its own widened weeks. Its
    //    anchor is the FIRST week, which is widened and has nothing beside it, so this also proves the walk
    //    past a seed with no run.
    escape();
    await T.sleep(60);
    await clickStintBtn('2026-11-30', 'prodPrep');
    await T.until(function () { return !!knob(1); }, 'a right knob on Prod Prep\'s block', 120, 100).catch(function () {});
    out.ppKnob = knob(1) ? knob(1).getAttribute('aria-label') : null;
    out.ppNoLeftKnob = !knob(-1);
    T.altSwap(1);
    await T.until(function () { return rowOf('2026-11-16') === SWAPPED; }, 'the Prod Prep swap to land', 120, 100).catch(function () {});
    await T.sleep(200);
    out.afterPP = snapshot();
    out.ppSwapped = shape(out.afterPP, SWAPPED);
    await T.until(function () { return !!knob(-1); }, 'the knob to follow the move', 120, 100).catch(function () {});
    T.altSwap(-1);
    await T.until(function () { return rowOf('2026-11-16') === NATURAL; }, 'the reverse to land', 120, 100).catch(function () {});
    await T.sleep(200);
    out.ppRestored = shape(snapshot(), NATURAL);

    // 5. The per-week mode, seeded on a widened cell: five of Prod Prep's six weeks, the anchor 11/9 (⌘-clicked
    //    last). Nothing is beside 11/9, but the four weeks below it in the same selection can swap.
    escape();
    await T.sleep(60);
    for (var i = 0; i < OVERLAP.length; i++) await metaClick(OVERLAP[i], 'prodPrep');
    await metaClick('2026-11-09', 'prodPrep');
    await T.until(function () { return !!knob(1); }, 'a right knob from a widened seed', 120, 100).catch(function () {});
    out.seedKnob = knob(1) ? knob(1).getAttribute('aria-label') : null;
    out.seedKnobs = knobs();

    // 6. Guard: the drag across both columns (the path that always worked) still gets exactly ONE knob. The
    //    walk covers only the seed's phase, so the partner cannot add a second knob on the same seam.
    escape();
    await T.sleep(60);
    for (var j = 0; j < OVERLAP.length; j++) await metaClick(OVERLAP[j], 'prodPrep');
    for (var k = OVERLAP.length - 1; k >= 0; k--) await metaClick(OVERLAP[k], 'post');
    await T.until(function () { return !!knob(-1); }, 'the two-column knob', 120, 100).catch(function () {});
    await T.sleep(300);
    out.bothKnobs = knobs();
    out.bothKnob = knob(-1) ? knob(-1).getAttribute('aria-label') : null;
    escape();
    await T.sleep(60);

    out.final = snapshot();
    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    var C = function (id, title, pass) { return { id: id, title: title, pass: !!pass }; };
    out.cases = [
      C('P0', 'the fixture: Prod Prep 11/2 and 11/9 widened by hand, then the natural overlap', out.widenedBefore),
      C('P1', 'Swap Column on Post (its whole block, refused as a block): the left knob offers the 4 shared weeks -- ' + out.postKnob,
        out.postSelected === 1 && out.postKnob === LABEL_POST && out.postNoRightKnob),
      C('P2', 'committing it swaps those 4 weeks, leaves the widened weeks as they were, and says nothing',
        out.postSwapped && out.postSilent),
      C('P3', 'the knob turns round and swapping back restores the fixture exactly', out.postKnobBack === LABEL_POST && out.postRestored),
      C('P4', 'Swap Column on Prod Prep (anchor on a widened week): the right knob offers the 4 shared weeks; swap and back -- ' + out.ppKnob,
        out.ppKnob === LABEL_PP && out.ppNoLeftKnob && out.ppSwapped && out.ppRestored),
      C('P5', 'a per-week selection begun on a widened cell gets ONE knob for the weeks below it -- ' + out.seedKnobs.join(','),
        out.seedKnob === LABEL_PP && out.seedKnobs.join(',') === '1'),
      C('P6', 'guard: the drag across both columns still gets exactly one knob -- ' + out.bothKnobs.join(','),
        out.bothKnobs.join(',') === '-1' && out.bothKnob === LABEL_POST && shape(out.final, NATURAL)),
      C('P7', '0 console errors, 0 clipped cells', out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length))
    ];
    out.pass = out.cases.every(function (c) { return c.pass; });
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
