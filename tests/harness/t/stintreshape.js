// stintreshape -- a block swap CAN reshape a block, and when it would, the app says so in words and
// paints the weeks amber BEFORE the commit. Owner ruling 2 Sep 2026: "keep offering it, warn harder".
//
// ⭐ THE OWNER'S SECOND CALENDAR, schedule intact, titles genericised. It is the counter-example to
// the plan's founding premise. §1 argued that a block swap reflows nothing, because the phase keeps
// its whole run in the new column and the neighbour that held it narrow still sits inside that run.
// TRUE WITH TWO PHASE COLUMNS. FALSE WITH THREE OR MORE -- and this block has three:
//
//     slot 0:  Writer's Rm   1/5 .. 9/14   (37 weeks)
//     slot 1:  Pre Prep      8/31 .. 10/5  (6 weeks, 3 of them inside Writer's Rm)
//     slot 2:  Prod Prep     9/28 .. 11/16 (starts AFTER Writer's Rm ends)
//
// Before: Writer's Rm is at slot 0 and its only neighbour is slot 1, which Pre Prep occupies inside
// its run -- freeForRun refuses, so it is one column wide for all 37 weeks. After the swap it sits at
// slot 1, on the far side of Pre Prep, and its right-hand neighbour is slot 2 -- EMPTY for its entire
// run, because Prod Prep does not start until after it ends. So it absorbs it and widens to two
// columns for 34 weeks (all but the 3 it shares with Pre Prep, where the even-share cap holds it).
//
// This leg does not assert that the widening is desirable -- the owner decided to keep it. It asserts
// the WARNING: the phase named, the new width named, the extent named, an amber chip, and one amber
// rectangle per affected week, all before anything is committed.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 200, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 6;
    }, 'the row count to settle', 150, 100);

    function tds() {
      return Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return Number.isFinite(+td.dataset.own); });
    }
    function snap() {
      var m = {};
      tds().forEach(function (td) {
        if (String(td.dataset.week).slice(0, 4) !== '2026') return;
        var k = td.dataset.pkey;
        if (!m[k]) m[k] = { slots: {}, spans: {}, n: 0 };
        m[k].slots[td.dataset.own] = 1;
        m[k].spans[td.getAttribute('colspan') || '1'] = 1;
        m[k].n++;
      });
      var o = {};
      Object.keys(m).sort().forEach(function (k) {
        o[k] = 'slot' + Object.keys(m[k].slots).sort().join('/') + ' span' + Object.keys(m[k].spans).sort().join('/') + ' n' + m[k].n;
      });
      return o;
    }
    async function hover(el) {
      el.scrollIntoView({ block: 'center' }); await T.sleep(150);
      var r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, composed: true,
        clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2),
        button: 0, buttons: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true }));
      await T.sleep(150);
    }
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    function cellOf(key) {
      var l = tds().filter(function (td) { return td.dataset.pkey === key && String(td.dataset.week).slice(0, 4) === '2026'; });
      return l.length ? l[Math.floor(l.length / 2)] : null;
    }
    var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };

    // 1. Three phase columns, and Writer's Rm held to ONE for all 37 weeks.
    out.before = snap();
    out.threeColumns = /y2026:s2/.test(Array.prototype.map.call(
      document.querySelectorAll('table.sheet-table colgroup col'),
      function (c) { return c.dataset.ckey || ''; }).join(','));
    out.narrowBefore = /^slot0 span1 n37$/.test(out.before.writersRoom || '') &&
                       /^slot1 span1 n6$/.test(out.before.prePrep || '');

    // 2. Select Pre Prep's block. The swap is offered -- and the warning is specific, amber, and
    //    painted over the weeks it is about, all BEFORE the commit.
    await hover(cellOf('prePrep'));
    await T.until(function () { return btn() && btn().dataset.pkey === 'prePrep'; }, 'Swap Block on Pre Prep', 60, 100);
    btn().click();
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="-1"]'); }, 'the leftward knob', 150, 100);
    await T.sleep(300);
    var chip = document.querySelector('.grid-swap-layer .grid-swap-chip');
    out.chipClass = chip ? chip.className : '';
    out.chipText = chip ? chip.textContent : '';
    out.amberRects = document.querySelectorAll('.grid-sel-layer .grid-swap-collateral').length;
    out.warnIsAmber = /is-warn/.test(out.chipClass);
    // ⭐ The phase, the new width and the extent -- not a bare count, which is what it used to say.
    out.warnNamesIt = /Writer.s Rm would widen to 2 columns in 34 weeks/.test(out.chipText);
    out.amberMatchesCount = out.amberRects === 34;

    // 3. It commits, and the confirmation says the same thing in the past tense.
    document.getElementById('colswap-left-btn').click();
    await T.until(function () { return (snap().prePrep || '').indexOf('slot0 ') === 0; }, 'the swap to land', 150, 100);
    await T.sleep(400);
    out.after = snap();
    out.swapped = /^slot0 span1 n6$/.test(out.after.prePrep || '') && /^slot1 /.test(out.after.writersRoom || '');
    out.widened = /span1\/2 n37$/.test(out.after.writersRoom || '');
    out.flash = (document.querySelector('.grid-swap-layer .grid-swap-chip.is-flash') || {}).textContent || '';
    out.flashNamesIt = /Writer.s Rm widened to 2 columns in 34 weeks/.test(out.flash);
    // Reshaping is not cell loss, and it must not clip: the width model is untouched by a swap.
    out.nothingLost = (out.after.writersRoom || '').indexOf('n37') > 0 && (out.after.prePrep || '').indexOf('n6') > 0;
    out.clipped = T.clippedCells();

    // 4. Reversing restores the year exactly, widening included.
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="1"]'); }, 'the rightward knob', 150, 100);
    document.getElementById('colswap-right-btn').click();
    await T.until(function () { return (snap().prePrep || '').indexOf('slot1 ') === 0; }, 'the reverse to land', 150, 100);
    await T.sleep(400);
    out.afterReverse = snap();
    out.reversedExactly = same(out.afterReverse, out.before);

    out.errors = (window.__ERR || []).slice(0, 6);
    out.PASS = out.threeColumns && out.narrowBefore && out.warnIsAmber && out.warnNamesIt &&
               out.amberMatchesCount && out.swapped && out.widened && out.flashNamesIt &&
               out.nothingLost && out.reversedExactly && out.errors.length === 0 &&
               !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
