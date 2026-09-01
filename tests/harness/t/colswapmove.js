// colswapmove -- prove the column-order GESTURE, end to end, through the real user path.
//
// The companion legs cover the halves either side of this one: `colswap` proves a stored override
// applies, `colswapgate` proves an unsafe one is refused and narrated. Neither exercises the layer
// that decides WHAT would move -- computeSwapRun's run walk, the whole-run restriction (owner ruling
// D7) and canSwapRun's trial-and-gate verdict -- because both start from a store that already
// exists. This leg starts from a fixture with NO column order at all and makes the app create one.
//
// Driven by  ?state=colswap-gesture , the same genuine capture the `colswap` leg uses with its
// gridColSwaps emptied. Its schedule is the owner's screenshot shape:
//
//     11/2   Prod Prep wk 1                     <- outside the overlap, FULL WIDTH
//     11/9   Prod Prep wk 2                     <- outside the overlap, FULL WIDTH
//     11/16  Prod Prep wk 3 | Post wk 1         <- overlap, and Post's WHOLE run in the block
//     11/23  Prod Prep wk 4 | Post wk 2
//     11/30  Prod Prep wk 5 | Post wk 3
//     12/7   Prod Prep wk 6 | Post wk 4
//
// So ONE gesture on ONE Post cell must move all FOUR overlap weeks (the run walk), and 11/2 and
// 11/9 must not SWAP -- they have no partner to trade with and Prod Prep keeps slot 0 in both.
//
// ⚠️ They do, however, WIDEN, and this leg asserts that rather than denying it. MEASURED, not
// assumed: before the swap Prod Prep holds slot 0 for all six weeks, so frozen phaseRunBounds
// bounds its run across the whole block and slot 1 is occupied by Post inside it -- Prod Prep stays
// one column wide even at 11/2. After the swap slot 0's occupant CHANGES at 11/16, so Prod Prep's
// slot-0 run is only 11/2-11/9, slot 1 is free there, and it spans to two columns. That is exactly
// the magnitude-1 collateral the owner sanctioned (plan D2 / gate check G5): allowed, previewed
// before the drop, and reported afterwards. An earlier draft of this test asserted the two weeks
// were byte-identical, which is a claim about a DIFFERENT fixture, not about this feature.
//
// ⛔ The selection is built with a REAL pointer gesture at REAL coordinates, not by poking module
// state -- there is no hook to poke, and that is deliberate: gridSel is session UI and never
// reachable from outside the IIFE. A single plain click does NOT select (verified in the code: a
// bare click with an empty selection is a no-op, which is what keeps double-click-to-fill working),
// so this uses the meta-click path, the same one a user gets with Cmd held.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    // Not T.appReady() -- that waits on the IndexedDB-backed file menu, which never settles under
    // --virtual-time-budget. Wait on the grid, then let the row count settle.
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n;
      return stable >= 5;
    }, 'the row count to settle', 100, 100);

    var OVERLAP = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
    var ABOVE   = ['2026-11-02', '2026-11-09'];

    function cell(wk, pkey) {
      return Array.prototype.find.call(
        document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk && td.dataset.pkey === pkey; }) || null;
    }
    function rowOf(wk) {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk; })
        .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own + '/cs' + (td.getAttribute('colspan') || 1); })
        .sort().join(' ');
    }
    function snapshot(weeks) { var o = {}; weeks.forEach(function (w) { o[w] = rowOf(w); }); return o; }

    // 1. The natural order first, so a pass cannot be a no-op that merely looks tidy. segCol assigns
    //    in START order, so Prod Prep (11/2) is left of Post (11/16) in every overlap week.
    out.before = snapshot(OVERLAP.concat(ABOVE));
    out.naturalOrder = OVERLAP.every(function (w) { return out.before[w] === 'post@1/cs1 prodPrep@0/cs1'; });
    // 11/2 and 11/9 are Prod Prep alone but held to ONE column, because its slot-0 run spans the
    // whole block and Post occupies slot 1 inside it. See the note at the top.
    out.aboveNarrowBefore = ABOVE.every(function (w) { return out.before[w] === 'prodPrep@0/cs1'; });

    // 2. Select ONE Post cell with a meta-click at its real centre. hitCell() resolves the cell by
    //    walking elementsFromPoint (the .grid-resize handles cover ~29% of a cell's width and would
    //    otherwise swallow e.target), so the coordinates have to be genuine.
    var seed = cell('2026-11-16', 'post');
    out.seedFound = !!seed;
    if (!seed) throw new Error('no Post cell at 2026-11-16');
    seed.scrollIntoView({ block: 'center' });
    await T.sleep(120);
    var r = seed.getBoundingClientRect();
    var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    out.seedBox = { x: cx, y: cy, w: Math.round(r.width), h: Math.round(r.height) };
    function press(type, opts) {
      seed.dispatchEvent(new PointerEvent(type, Object.assign({
        bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy,
        button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 7, pointerType: 'mouse', isPrimary: true
      }, opts || {})));
    }
    press('pointerdown', { metaKey: true });
    press('pointerup', { metaKey: true });
    await T.sleep(60);

    // 3. The KNOB is the proof that the whole F2-c chain ran and said yes: the run walk found a
    //    partner in every week, the widths matched, the whole-run restriction was satisfied (Post's
    //    entire block run IS the overlap), and canSwapRun's trial passed the F2-b gate. It appears on
    //    a debounce, so poll for it.
    await T.until(function () {
      return !!document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="-1"]');
    }, 'the leftward swap knob', 120, 100);
    var knobL = document.querySelector('.grid-swap-knob[data-dir="-1"]');
    out.knobLabel = knobL.getAttribute('aria-label') || '';
    out.knobRole = knobL.getAttribute('role') + '/' + knobL.getAttribute('tabindex');
    // The label has to name BOTH phases and the run's real extent -- it is the only thing a screen
    // reader gets, and the run is four weeks even though one cell was clicked.
    out.labelNamesBoth = /Post/.test(out.knobLabel) && /Prod Prep/.test(out.knobLabel);
    out.labelNamesRun  = /11\/16/.test(out.knobLabel) && /12\/7/.test(out.knobLabel);
    // Post has nothing to its RIGHT, so that direction must offer no knob at all. A knob there
    // would be an affordance for a move that cannot happen.
    out.noRightKnob = !document.querySelector('.grid-swap-knob[data-dir="1"]');

    // 3b. THE REFUSAL, tested here and not later: Post has nothing to its right YET, so that
    //     direction must move nothing and must SAY why. A gesture that appears to do nothing is the
    //     top UX risk in this feature, and the buttons stay enabled precisely so a press can answer
    //     "why can't I". (After the swap the right direction becomes the un-swap, so this is the one
    //     moment in the fixture where it is genuinely unavailable.)
    var right = document.getElementById('colswap-right-btn');
    out.rightExists = !!right;
    right.click();
    await T.sleep(300);
    out.rightNoOp = OVERLAP.every(function (w) { return rowOf(w) === out.before[w]; });
    var chip0 = document.querySelector('.grid-swap-layer .grid-swap-chip');
    out.chipShown = !!chip0;
    out.chipText = chip0 ? chip0.textContent : '';
    out.chipExplains = /column beside it|different widths|whole run|Nothing would move|Can’t swap/.test(out.chipText);

    // 4. The toolbar is the primary path (discoverable, keyboard, touch). Press it and require the
    //    ENTIRE run to move in one step -- not one week, and not a per-week undo trail.
    var btn = document.getElementById('colswap-left-btn');
    out.btnExists = !!btn;
    out.btnVisible = !!(btn && btn.offsetParent !== null);
    btn.click();
    await T.until(function () { return rowOf('2026-11-16') === 'post@0/cs1 prodPrep@1/cs1'; },
      'the swap to land', 120, 100);
    await T.sleep(200);

    out.after = snapshot(OVERLAP.concat(ABOVE));
    out.movedWeeks = OVERLAP.filter(function (w) { return out.after[w] === 'post@0/cs1 prodPrep@1/cs1'; }).length;
    out.wholeRunMoved = out.movedWeeks === 4;
    // The owner's criterion, stated the way it is actually true: the two weeks the swap does not
    // name do not SWAP -- Prod Prep still holds slot 0 in both. They widen by exactly one column,
    // which is the sanctioned magnitude-1 collateral.
    out.aboveKeptSlot = ABOVE.every(function (w) { return /^prodPrep@0\//.test(out.after[w]); });
    out.aboveWidened  = ABOVE.every(function (w) { return out.after[w] === 'prodPrep@0/cs2'; });
    // ...and the user is TOLD, with the right count. Silent collateral is the failure mode the
    // disclosure exists to prevent.
    var chip1 = document.querySelector('.grid-swap-layer .grid-swap-chip');
    out.confirmText = chip1 ? chip1.textContent : '';
    out.confirmReportsCollateral = /2 other weeks changed width/.test(out.confirmText);

    // 5. The affordance FOLLOWS the move: Post now sits at slot 0 with nothing to its left, so the
    //    leftward knob must be gone and a rightward one must have appeared. A stale knob would offer
    //    a move that no longer exists.
    await T.until(function () {
      return !document.querySelector('.grid-swap-knob[data-dir="-1"]')
          && !!document.querySelector('.grid-swap-knob[data-dir="1"]');
    }, 'the knob to follow the move', 120, 100);
    out.knobFollowed = true;

    // 6. Moving it BACK must DELETE the stored pair, not store an identity. This is a store
    //    assertion even though the store is unreachable from a test: gridColSwaps is re-read by the
    //    reconciler on every recompute, so if the entries had survived as no-ops the grid would come
    //    back swapped. A byte-identical return to the pre-swap layout is only possible if they went.
    document.getElementById('colswap-right-btn').click();
    await T.until(function () { return rowOf('2026-11-16') === out.before['2026-11-16']; },
      'the reverse move to land', 120, 100);
    await T.sleep(250);
    out.afterReverse = snapshot(OVERLAP.concat(ABOVE));
    out.reverseRestoredExactly = OVERLAP.concat(ABOVE)
      .every(function (w) { return out.afterReverse[w] === out.before[w]; });

    // 7. Refusing and moving must both leave a WORKING grid: no thrown error, nothing clipped, and
    //    the same two phase columns the block started with.
    out.errors = (window.__ERR || []).slice(0, 6);
    out.colKeys = Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';

    out.PASS = out.naturalOrder && out.aboveNarrowBefore && out.labelNamesBoth && out.labelNamesRun &&
               out.noRightKnob && out.btnVisible && out.rightNoOp && out.chipShown && out.chipExplains &&
               out.wholeRunMoved && out.aboveKeptSlot && out.aboveWidened &&
               out.confirmReportsCollateral && out.knobFollowed && out.reverseRestoredExactly &&
               out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
