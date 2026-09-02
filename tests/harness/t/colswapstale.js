// colswapstale -- a STALE cell-width override must not block a swap, and must not be reported.
//
// The bug (owner, 1 Sep 2026): "it's saying to clear the hand-set width but the column was not hand
// set." Both halves of that were true. The D4 refusal read the cellSpans STORE rather than asking
// whether the override was doing anything, and frozen applyCellSpanOverrides deliberately KEEPS an
// override the schedule has moved under -- its own comment says "a stale override shrinks to
// whatever is genuinely free rather than being dropped outright". So a claim written while a week
// still had a free column beside it survives invisibly once another phase moves in, and the swap was
// refused over a width that grants nothing, naming a cell with nothing on screen to clear.
//
// Driven by  ?state=colswap-stalespan : the ordinary Prod Prep / Post overlap, plus two cellSpans
// claims on overlap weeks where Prod Prep has no room at all.
//
//     11/2, 11/9    Prod Prep alone
//     11/16 .. 12/7 Prod Prep | Post          <- 11/16 and 11/23 carry {l:0, r:1} claims
//
// ⛔ The claims must stay INERT for this test to mean anything, so assert that first: if the fixture
// ever starts granting them, this leg silently stops testing the thing it is named after.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 150, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n;
      return stable >= 5;
    }, 'the row count to settle', 100, 100);

    var CLAIMED = ['2026-11-16', '2026-11-23'];
    var OVERLAP = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];

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

    // 1. The fixture really does carry the claims -- read them back off the saved-state block the
    //    harness injected, which is the app's own restore input.
    var raw = (document.getElementById('saved-state') || {}).textContent || '{}';
    var snap = {}; try { snap = JSON.parse(raw); } catch (e) {}
    var spans = (snap && snap.cellSpans) || {};
    out.storedClaims = Object.keys(spans);
    out.fixtureHasClaims = CLAIMED.every(function (w) {
      var v = spans[w + '|prodPrep']; return !!(v && (v.l || v.r));
    });

    // 2. ...and they are INERT: every claimed cell renders exactly one column wide, at its own slot.
    //    That is the whole premise -- there is no widened cell for the user to "clear".
    out.claimedCells = {};
    CLAIMED.forEach(function (w) {
      var td = cell(w, 'prodPrep');
      out.claimedCells[w] = td ? { own: +td.dataset.own, a: +td.dataset.a, b: +td.dataset.b,
                                   cs: +(td.getAttribute('colspan') || 1) } : null;
    });
    out.claimsAreInert = CLAIMED.every(function (w) {
      var c = out.claimedCells[w];
      return c && c.cs === 1 && c.a === c.own && c.b === c.own;
    });

    // 3. The swap must be OFFERED. Before the fix there was no knob and the chip named a cell the
    //    user could do nothing about.
    var seed = cell('2026-11-16', 'post');
    if (!seed) throw new Error('no Post cell at 2026-11-16');
    seed.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = seed.getBoundingClientRect();
    var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    ['pointerdown', 'pointerup'].forEach(function (t) {
      seed.dispatchEvent(new PointerEvent(t, {
        bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy,
        button: 0, buttons: t === 'pointerup' ? 0 : 1, pointerId: 7,
        pointerType: 'mouse', isPrimary: true, metaKey: true
      }));
    });
    await T.until(function () {
      return !!document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="-1"]');
    }, 'the swap knob despite the stale claims', 120, 100);
    out.knobOffered = true;
    // No passive chip about a hand-set width -- that message was the bug.
    var chip0 = document.querySelector('.grid-swap-chip');
    out.noWidthComplaint = !(chip0 && /hand/i.test(chip0.textContent || ''));
    // ...and the SAME defect in Feature 1's count chip: an inert claim used to make the cell read as
    // actionable and offer "double-click to pull back" with nothing to pull. Post 11/16 is the seed
    // and carries no claim, so the honest answer for it is "no room to expand".
    var selChip = document.querySelector('.grid-sel-chip');
    out.selChipText = selChip ? selChip.textContent : '';
    out.selChipHonest = !/pull back/.test(out.selChipText);

    // 4. And it actually swaps.
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return rowOf('2026-11-16') === 'post@0/cs1 prodPrep@1/cs1'; },
      'the swap to land over the stale claims', 120, 100);
    await T.sleep(250);
    out.movedWeeks = OVERLAP.filter(function (w) { return rowOf(w) === 'post@0/cs1 prodPrep@1/cs1'; }).length;
    out.swapApplied = out.movedWeeks === 4;

    // 5. ⛔ The claims must SURVIVE untouched. Refusing was wrong, but so would be quietly deleting
    //    or mirroring them: cellSpans is persisted, and the user's fill has to come back if the
    //    schedule moves back. Nothing here should have written to the store at all.
    out.claimedStillInert = CLAIMED.every(function (w) {
      var td = cell(w, 'prodPrep');
      return td && +(td.getAttribute('colspan') || 1) === 1;
    });

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.fixtureHasClaims && out.claimsAreInert && out.knobOffered &&
               out.noWidthComplaint && out.selChipHonest && out.swapApplied && out.claimedStillInert &&
               out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
