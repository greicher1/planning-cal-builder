// stintmulti -- owner decision E1, complete, through the real user path: a block swap against a column
// that hosts SEVERAL blocks inside the run names all of them BEFORE the commit and moves all of them.
//
// Fixture: ?state=stintswap-multi -- the `stintcollide` schedule with NO order stored:
//
//     slot 0:  Writer's Rm   1/5 .. 5/18  (20 weeks)
//     slot 1:  Post          2/9 .. 3/2   (wks 6-9)   +   Localization  4/6 .. 4/27  (wks 14-17)
//
// Exchanging Writer's Rm with Post ALONE would put it in a column Localization still holds and drop
// four of its weeks (measured; `stintcollide` proves the reconciler refuses that). The gesture must
// therefore offer -- and the chip must state -- a swap with BOTH, from either side of the seam.
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

    function cell(wk, pkey) {
      return Array.prototype.find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk && td.dataset.pkey === pkey; }) || null;
    }
    function layout() {
      var per = {}, spans = {};
      Array.prototype.forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
        (per[td.dataset.pkey] = per[td.dataset.pkey] || []).push(td.dataset.own);
        (spans[td.dataset.pkey] = spans[td.dataset.pkey] || []).push(td.getAttribute('colspan') || '1');
      });
      var u = function (a) { return a ? [...new Set(a)].join('') : ''; };
      return {
        slots: { writersRoom: u(per.writersRoom), post: u(per.post), localization: u(per.localization) },
        spans: { writersRoom: u(spans.writersRoom), post: u(spans.post), localization: u(spans.localization) },
        weeks: { writersRoom: (per.writersRoom || []).length, post: (per.post || []).length, localization: (per.localization || []).length }
      };
    }
    function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
    async function hover(el) {
      el.scrollIntoView({ block: 'center' }); await T.sleep(80);
      var c = centre(el);
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, composed: true,
        clientX: c.x, clientY: c.y, button: 0, buttons: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true }));
      await T.sleep(80);
    }
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
    var NATURAL = { writersRoom: '0', post: '1', localization: '1' };
    var SWAPPED = { writersRoom: '1', post: '0', localization: '0' };
    var ONE = { writersRoom: '1', post: '1', localization: '1' };
    var COUNTS = { writersRoom: 20, post: 4, localization: 4 };

    out.before = layout();
    out.naturalOrder = same(out.before.slots, NATURAL) && same(out.before.spans, ONE) && same(out.before.weeks, COUNTS);

    // A. From the LONG side. Hover Writer's Rm week 11, take the button, read the knob and the chip.
    await hover(cell('2026-03-16', 'writersRoom'));
    await T.until(function () { return btn() && btn().dataset.pkey === 'writersRoom'; }, 'Swap Block on Writer\'s Rm', 40, 50);
    btn().click();
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="1"]'); }, 'the rightward knob', 120, 100);
    out.knobA = document.querySelector('.grid-swap-knob[data-dir="1"]').getAttribute('aria-label') || '';
    var info = document.querySelector('.grid-swap-layer .grid-swap-chip.is-info');
    out.modeA = info ? info.textContent : '';
    // ⭐ Both partners named, before anything moves.
    out.namesBothA = /Post and Localization/.test(out.knobA) && /All 20 weeks of Writer/.test(out.modeA) &&
                     /trades the whole block with Post and Localization/.test(out.modeA);
    document.getElementById('colswap-right-btn').click();
    await T.until(function () { return same(layout().slots, SWAPPED); }, 'the group swap to land', 120, 100);
    await T.sleep(200);
    out.afterA = layout();
    out.groupMovedA = same(out.afterA.slots, SWAPPED) && same(out.afterA.spans, ONE) && same(out.afterA.weeks, COUNTS);
    // A move with several partners is never silent.
    var flash = document.querySelector('.grid-swap-layer .grid-swap-chip.is-flash');
    out.flashA = flash ? flash.textContent : '';
    out.flashNamesAllA = /Swapped the 2026 block of Writer/.test(out.flashA) && /Post and Localization/.test(out.flashA);
    // Swap back from the same selection: natural order returns exactly.
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="-1"]'); }, 'the leftward knob', 120, 100);
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return same(layout().slots, NATURAL); }, 'the reverse to land', 120, 100);
    await T.sleep(200);
    out.reversedA = same(layout(), out.before);

    // B. From the SHORT side. Hover Post: its block is the 4 weeks; the swap is with Writer's Rm, and
    //    Localization -- which shares Post's column inside Writer's Rm's run -- must move with it.
    await hover(cell('2026-02-16', 'post'));
    await T.until(function () { return btn() && btn().dataset.pkey === 'post'; }, 'Swap Block on Post', 40, 50);
    btn().click();
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="-1"]'); }, 'the leftward knob on Post', 120, 100);
    out.knobB = document.querySelector('.grid-swap-knob[data-dir="-1"]').getAttribute('aria-label') || '';
    // The confirmation from A's reverse is still up for ~4s and takes the chip's one slot; wait it out.
    await T.until(function () { return !!document.querySelector('.grid-swap-layer .grid-swap-chip.is-info'); }, 'the mode line after the flash', 120, 100);
    info = document.querySelector('.grid-swap-layer .grid-swap-chip.is-info');
    out.modeB = info ? info.textContent : '';
    out.namesCompanionB = /block of Post with Writer/.test(out.knobB) && /Localization moves with it/.test(out.knobB) &&
                          /All 4 weeks of Post/.test(out.modeB) && /Localization moves with it/.test(out.modeB);
    out.noRightKnobB = !document.querySelector('.grid-swap-knob[data-dir="1"]');
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return same(layout().slots, SWAPPED); }, 'the group swap from Post to land', 120, 100);
    await T.sleep(200);
    out.afterB = layout();
    out.groupMovedB = same(out.afterB.slots, SWAPPED) && same(out.afterB.spans, ONE) && same(out.afterB.weeks, COUNTS);
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="1"]'); }, 'the rightward knob on Post', 120, 100);
    document.getElementById('colswap-right-btn').click();
    await T.until(function () { return same(layout().slots, NATURAL); }, 'the reverse from Post to land', 120, 100);
    await T.sleep(200);
    out.reversedB = same(layout(), out.before);

    out.colKeys = Array.prototype.map.call(document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || '?'; }).join(',');
    out.colKeysOk = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';
    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells ? T.clippedCells() : 'n/a';
    out.PASS = out.naturalOrder && out.namesBothA && out.groupMovedA && out.flashNamesAllA && out.reversedA &&
               out.namesCompanionB && out.noRightKnobB && out.groupMovedB && out.reversedB && out.colKeysOk &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
