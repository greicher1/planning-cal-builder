// stintbtn -- the "Swap Block" hover button and the mode inference, end to end through the real user
// path (COLUMN-ORDER-PLAN.md section 2.2 and section 6 item 5).
//
// Fixture: ?state=colswap-gesture -- the owner's screenshot shape, with NO order stored:
//
//     11/2   Prod Prep wk 1                     <- Prod Prep alone, held to ONE column
//     11/9   Prod Prep wk 2
//     11/16  Prod Prep wk 3 | Post wk 1         <- overlap, Post's whole run
//     11/23  Prod Prep wk 4 | Post wk 2
//     11/30  Prod Prep wk 5 | Post wk 3
//     12/7   Prod Prep wk 6 | Post wk 4
//
// `colswapmove` drives the PER-WEEK swap on this same fixture and asserts that 11/2 and 11/9 WIDEN
// to two columns (the sanctioned magnitude-1 collateral). This leg drives the BLOCK swap and asserts
// the opposite: every one of Prod Prep's six cells keeps colspan 1 -- the whole reason the block
// swap exists. Then it deselects one cell and asserts the chip says the per-week mode is back.
//
// ⛔ Hover and selection are built with REAL pointer events at REAL coordinates: hitCell() resolves
// the cell by walking elementsFromPoint, and gridSel is session UI unreachable from outside the IIFE.
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
    function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
    function ptr(type, el, at, opts) {
      el.dispatchEvent(new PointerEvent(type, Object.assign({
        bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y,
        button: 0, buttons: type === 'pointerup' || type === 'pointermove' ? 0 : 1,
        pointerId: 7, pointerType: 'mouse', isPrimary: true
      }, opts || {})));
    }
    async function hover(el) { var c = centre(el); ptr('pointermove', el, c); await T.sleep(80); return c; }
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };

    out.before = snapshot();
    out.naturalNarrow = PP.every(function (w, i) { return out.before[w] === (i < 2 ? 'prodPrep@0/cs1' : 'post@1/cs1 prodPrep@0/cs1'); });

    // 1. Hover a MIDDLE week of Prod Prep: the button must appear, anchored to the block's FIRST week,
    //    not to the hovered cell.
    var mid = cell('2026-11-30', 'prodPrep');
    mid.scrollIntoView({ block: 'center' });
    await T.sleep(120);
    await hover(mid);
    await T.until(btn, 'the Swap Block button', 40, 50);
    var b = btn();
    out.btnText = b.textContent;
    out.btnPhase = b.dataset.pkey + '/' + b.dataset.year;
    var firstBox = cell('2026-11-02', 'prodPrep').getBoundingClientRect(), bb = b.getBoundingClientRect();
    out.btnOnFirstWeek = bb.top >= firstBox.top - 1 && bb.bottom <= firstBox.bottom + 1 && bb.right <= firstBox.right + 1;
    out.btnInsideCell = bb.left >= firstBox.left - 1;
    // 2. Travel toward it across the block's own cells: it must not vanish on the way.
    await hover(cell('2026-11-16', 'prodPrep'));
    await hover(cell('2026-11-09', 'prodPrep'));
    out.btnSurvivedTravel = !!btn() && btn().dataset.pkey === 'prodPrep';
    // 3. Hover the other phase: it re-anchors. Hover a notes cell: it goes away.
    await hover(cell('2026-11-23', 'post'));
    out.btnFollowsPhase = !!btn() && btn().dataset.pkey === 'post';
    var noteTd = document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-11-23"]');
    if (noteTd) await hover(noteTd);
    out.btnGoneOffPhase = !btn();

    // 4. Click it for Prod Prep: every cell of the block is selected, drawn as ONE outline (E3), and
    //    the chip states the BLOCK mode before anything is committed.
    await hover(cell('2026-11-30', 'prodPrep'));
    await T.until(function () { return btn() && btn().dataset.pkey === 'prodPrep'; }, 'the button back on Prod Prep', 40, 50);
    btn().click();
    await T.sleep(60);
    out.outlines = document.querySelectorAll('.grid-sel-layer .grid-sel-cell').length;
    var selChip = document.querySelector('.grid-sel-layer .grid-sel-chip');
    out.selChipText = selChip ? selChip.textContent : '';
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="1"]'); }, 'the rightward knob', 120, 100);
    out.knobLabel = document.querySelector('.grid-swap-knob[data-dir="1"]').getAttribute('aria-label') || '';
    out.noLeftKnob = !document.querySelector('.grid-swap-knob[data-dir="-1"]');
    var info = document.querySelector('.grid-swap-layer .grid-swap-chip.is-info');
    out.modeText = info ? info.textContent : '';
    out.modeSaysBlock = /All 6 weeks of Prod Prep in 2026/.test(out.modeText) &&
                        /trades the whole block with Post/.test(out.modeText) && /nothing re-flows/.test(out.modeText);
    out.knobSaysBlock = /block of Prod Prep with Post/.test(out.knobLabel);

    // 5. Commit through the toolbar. ALL SIX weeks move and NOT ONE changes width.
    document.getElementById('colswap-right-btn').click();
    await T.until(function () { return rowOf('2026-11-16') === 'post@0/cs1 prodPrep@1/cs1'; }, 'the block swap to land', 120, 100);
    await T.sleep(200);
    out.after = snapshot();
    out.wholeBlockMoved = PP.every(function (w, i) { return out.after[w] === (i < 2 ? 'prodPrep@1/cs1' : 'post@0/cs1 prodPrep@1/cs1'); });
    out.noCellWidened = PP.every(function (w) { return !/cs2/.test(out.after[w]); });
    // The selection survives the move (same week|phase keys), so the affordance follows: left now.
    await T.until(function () {
      return !document.querySelector('.grid-swap-knob[data-dir="1"]') && !!document.querySelector('.grid-swap-knob[data-dir="-1"]');
    }, 'the knob to follow the move', 120, 100);
    out.knobFollowed = true;

    // 6. Swap back: the pair is DELETED, and the grid returns exactly to the natural layout.
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return rowOf('2026-11-16') === out.before['2026-11-16']; }, 'the reverse to land', 120, 100);
    await T.sleep(200);
    out.afterReverse = snapshot();
    out.reverseRestoredExactly = PP.every(function (w) { return out.afterReverse[w] === out.before[w]; });

    // 7. A PARTIAL selection resolves to the per-week mode, and the chip says so. Deselect 11/9, then
    //    toggle 12/7 off and on so it becomes the anchor (the seed the per-week run walks from).
    //    ⚠️ Not 11/2: that is the block's FIRST week, and while the pointer is over the block the Swap
    //    Block button covers most of that cell -- the button owns its box in hitCell exactly as a knob
    //    does, so a click there is a click on the button. Deselecting 11/9 also leaves a GAP in the
    //    selection (11/2 alone, then 11/16-12/7), which is exactly the case E3's one-outline-per-run
    //    rule exists for: two rectangles, never one box across the unselected week.
    var c1 = centre(cell('2026-11-09', 'prodPrep'));
    ptr('pointerdown', cell('2026-11-09', 'prodPrep'), c1, { metaKey: true }); ptr('pointerup', cell('2026-11-09', 'prodPrep'), c1, { metaKey: true });
    await T.sleep(40);
    var c6 = centre(cell('2026-12-07', 'prodPrep'));
    ptr('pointerdown', cell('2026-12-07', 'prodPrep'), c6, { metaKey: true }); ptr('pointerup', cell('2026-12-07', 'prodPrep'), c6, { metaKey: true });
    await T.sleep(40);
    ptr('pointerdown', cell('2026-12-07', 'prodPrep'), c6, { metaKey: true }); ptr('pointerup', cell('2026-12-07', 'prodPrep'), c6, { metaKey: true });
    await T.sleep(400);
    out.diag = {
      selChip: (document.querySelector('.grid-sel-layer .grid-sel-chip') || {}).textContent || '',
      swapChips: Array.prototype.map.call(document.querySelectorAll('.grid-swap-layer .grid-swap-chip'), function (c) { return c.className + ': ' + c.textContent; }),
      outlines: document.querySelectorAll('.grid-sel-layer .grid-sel-cell').length,
      knobs: Array.prototype.map.call(document.querySelectorAll('.grid-swap-knob'), function (k) { return k.dataset.dir; }),
      body: document.body.className, btn: !!btn(),
      c1: c1, hit: (document.elementsFromPoint(c1.x, c1.y) || []).slice(0, 4).map(function (e) { return e.tagName + '.' + e.className; })
    };
    await T.until(function () {
      var ch = document.querySelector('.grid-swap-layer .grid-swap-chip.is-info');
      return ch && /5 of 6 weeks/.test(ch.textContent);
    }, 'the per-week mode line', 120, 100);
    out.partialText = document.querySelector('.grid-swap-layer .grid-swap-chip.is-info').textContent;
    out.partialSaysWeek = /5 of 6 weeks of Prod Prep selected/.test(out.partialText) &&
                          /moves the 4-week run at 11\/16/.test(out.partialText) && /2 weeks re-flow/.test(out.partialText);
    out.partialOutlines = document.querySelectorAll('.grid-sel-layer .grid-sel-cell').length;   // 11/2 | 11/16-12/7: TWO (E3)

    // 8. Nothing to swap with: with Post gone the block has one phase column and the button must not
    //    appear at all, rather than appear and refuse.
    T.set('weeks-post', '');
    await T.until(function () { return !cell('2026-11-16', 'post'); }, 'Post to leave the grid', 60, 100);
    await T.sleep(150);
    await hover(cell('2026-11-30', 'prodPrep'));
    await T.sleep(250);
    out.noBtnSingleColumn = !btn();

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.naturalNarrow && out.btnText === 'Swap Block' && out.btnPhase === 'prodPrep/2026' &&
               out.btnOnFirstWeek && out.btnInsideCell && out.btnSurvivedTravel && out.btnFollowsPhase && out.btnGoneOffPhase &&
               out.outlines === 1 && out.noLeftKnob && out.modeSaysBlock && out.knobSaysBlock &&
               out.wholeBlockMoved && out.noCellWidened && out.knobFollowed && out.reverseRestoredExactly &&
               out.partialSaysWeek && out.partialOutlines === 2 && out.noBtnSingleColumn &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
