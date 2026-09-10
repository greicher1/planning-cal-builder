// onecol -- "one continuous column": stop splitting the waterfall per calendar year, and stop
// padding the schedule out to whole years.
//
// Owner, 10 Sep 2026, with a reference calendar running 10/5/26 -> 10/4/27 in a single column.
//
// ⭐ THE FOUR THINGS THAT MATTER:
//
//   offIsInert    -- default OFF, so every calendar ever saved renders exactly as it did. The
//                    PDF/Excel byte-compare in gate.sh is the other half; this leg asserts the
//                    shape is untouched and that the key defaults to false on a file without it.
//   bothHalves    -- ONE flag drives TWO changes, and the measurement is why. Merging the blocks
//                    alone takes a straddling 52-week run from 52x7 to 104x4, and since both
//                    writers fit the whole grid to ONE page that halves the print scale
//                    (0.81 -> 0.41). Dropping the whole-year padding too gives 53x4 at 0.80.
//                    If a future change splits these apart, this leg should fail.
//   keysStayNumeric -- column keys are `y<year>:s<slot>` and installGridResizers matches them with
//                    /^(y\d+):s(\d+)$/. Labelling the merged block '2026 - 2027' produces
//                    `y2026 - 2027:s0`, fails that regex, and silently kills column resizing and
//                    stint swaps. Found while prototyping; this is the guard.
//   travelsInFile -- the owner chose calendar data over preference, so it must be in
//                    captureSnapshot() and must NOT be a swept input[id].
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    try { localStorage.clear(); } catch (e) {}
    // A run that STRADDLES the year end -- the owner's reference shape, and the only shape where
    // the two halves of this feature can be told apart.
    T.set('show-title', 'One Col'); T.set('season-num', '1');
    T.set('num-episodes', '9'); T.set('shoot-days-per-ep', '8');
    T.set('start-writersRoom', '2026-10-05'); T.set('weeks-writersRoom', '20');
    T.set('start-prePrep', '2027-02-08');     T.set('weeks-prePrep', '10');
    T.set('start-production', '2027-04-19');
    T.set('start-post', '2027-06-21');        T.set('weeks-post', '16');
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 10;
    }, 'the grid', 200, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 150, 100);

    var btn = function () { return document.getElementById('one-col-btn'); };
    function shape() {
      var trs = document.querySelectorAll('table.sheet-table tbody tr');
      var firstCells = [].map.call(trs, function (tr) {
        var td = tr.querySelector('td'); return td ? (td.textContent || '').trim() : '';
      }).filter(Boolean);
      return {
        rows: trs.length,
        cols: document.querySelectorAll('table.sheet-table colgroup col').length,
        ckeys: [].map.call(document.querySelectorAll('table.sheet-table colgroup col'),
                           function (c) { return c.dataset.ckey; }),
        headers: [].map.call(document.querySelectorAll('table.sheet-table thead th'),
                             function (t) { return (t.textContent || '').trim(); }),
        first: firstCells[0], lastDate: firstCells[firstCells.length - 1],
        gridWidthPt: T.gridWidthPt(),
        clippedH: T.clippedCells().h.length
      };
    }

    // ---- 1. OFF is today, unchanged -------------------------------------------------------------
    out.off = shape();
    out.btnExists = !!btn();
    out.btnStartsOff = out.btnExists && btn().getAttribute('aria-pressed') === 'false';
    // ⛔ NOT a swept input: collectFieldValues() takes input[id]/select[id]/textarea[id]. A <button>
    // is none of those, which is why the view toggles have ids safely too.
    out.btnIsButton = out.btnExists && btn().tagName === 'BUTTON';
    out.offIsBlocked = out.off.headers.filter(function (h) { return /^\d{4}$/.test(h); }).length >= 2;
    out.offStartsAtYearTop = /^1\//.test(out.off.first || '');

    // ---- 2. ⭐ ON: one block, and the padding gone ------------------------------------------------
    btn().click();
    await T.sleep(1500);
    var l2 = -1, s2 = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      s2 = (n === l2) ? s2 + 1 : 0; l2 = n; return s2 >= 5;
    }, 'the single-column grid to settle', 150, 100);
    out.on = shape();
    out.btnNowPressed = btn().getAttribute('aria-pressed') === 'true';
    out.btnNowActive = btn().classList.contains('active');
    // ONE year header, not two.
    out.onYearHeaders = out.on.headers.filter(function (h) { return /^\d{4}$/.test(h); });
    out.oneBlock = out.onYearHeaders.length === 1;
    // ⭐ The padding is gone: it starts on the first WORKING week, not 1 January.
    out.startsAtWork = out.on.first === '10/5/26';
    out.bothHalves = out.oneBlock && out.startsAtWork && out.on.rows < out.off.rows * 1.2;
    // ⭐ Column keys still numeric-year, or resizing and stint swaps die silently.
    out.onCkeys = out.on.ckeys;
    out.keysStayNumeric = out.on.ckeys.filter(function (k) { return /^y\d+:s\d+$/.test(k || ''); }).length > 0 &&
                          out.on.ckeys.every(function (k) { return !/\s/.test(k || ''); });
    out.narrower = out.on.gridWidthPt < out.off.gridWidthPt;

    // ---- 3. ⭐ IT TRAVELS IN THE FILE, and is not double-stored -----------------------------------
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable copy', 200, 100);
    var html = await cap.stop().text();
    var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    var snap = m ? JSON.parse(m[1]) : null;
    out.snapHasKey = !!snap && snap.singleColumn === true;
    // ⛔ exactly once: as the snapshot key, NEVER also as a swept field id.
    out.snapFieldIds = snap && snap.fields && snap.fields.byId ? Object.keys(snap.fields.byId) : [];
    out.notInFieldIds = out.snapFieldIds.every(function (k) { return !/one-col|single/i.test(k); });

    // ---- 3b. ⭐ COLUMN SWAPPING STILL WORKS WITH THE SETTING ON -----------------------------------
    // ⛔ THIS WAS BROKEN ON FIRST SHIP AND FAILED SILENTLY. The swap machinery identified a column
    // BLOCK by the hovered week's own calendar year (`String(weekIso).slice(0,4)`) across ten
    // sites -- correct while there was exactly one block per year. In one-column mode there is a
    // single block labelled with the FIRST year, so a cell in Feb 2027 reported year 2027, the
    // code looked up `y2027:s1`, found no such column and returned: the Swap Block button simply
    // never appeared. No error, nothing in the console. blockYearOf() is the fix.
    function ptr(t, el, x, y, b) {
      el.dispatchEvent(new PointerEvent(t, { bubbles:true, cancelable:true, composed:true,
        clientX:x, clientY:y, button:0, buttons:b, pointerId:7, pointerType:'mouse', isPrimary:true }));
    }
    function rowSig(wk) {
      return [].filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.week === wk; })
        .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own; }).sort().join(' ');
    }
    var overlap = (function () {
      var by = {};
      [].forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
        (by[td.dataset.week] = by[td.dataset.week] || []).push(td);
      });
      var wk = Object.keys(by).find(function (w) { return by[w].length >= 2; });
      return wk ? { week: wk, td: by[wk][0] } : null;
    })();
    out.overlapWeek = overlap ? overlap.week : null;
    if (overlap) {
      var r = overlap.td.getBoundingClientRect();
      ptr('pointermove', overlap.td, Math.round(r.left + r.width/2), Math.round(r.top + r.height/2), 0);
      await T.sleep(450);
      var sb = document.querySelector('.grid-swap-layer .grid-stint-btn');
      out.swapBtnAppears = !!sb;
      // ⭐ The button must name the BLOCK's year, not the hovered week's -- that is the whole bug.
      out.swapBtnYear = sb ? sb.dataset.year : null;
      out.swapBtnUsesBlockYear = out.swapBtnYear === String(new Date(overlap.week + 'T00:00:00Z').getUTCFullYear() - 1) ||
                                 out.swapBtnYear === '2026';
      if (sb) {
        sb.click();
        await T.sleep(500);
        out.swapBefore = rowSig(overlap.week);
        var rb = document.getElementById('colswap-right-btn');
        var lb = document.getElementById('colswap-left-btn');
        var use = (rb && !rb.disabled) ? rb : ((lb && !lb.disabled) ? lb : null);
        out.swapToolbarEnabled = !!use;
        if (use) { use.click(); await T.sleep(1500); }
        out.swapAfter = rowSig(overlap.week);
        out.swapLanded = out.swapBefore !== out.swapAfter;
        // ...and survives the next render, or it was only ever a paint.
        T.set('weeks-post', '17');
        await T.sleep(1500);
        out.swapPersists = rowSig(overlap.week) === out.swapAfter;
        T.set('weeks-post', '16');
        await T.sleep(1300);
      }
    }
    out.swapWorksInOneCol = !!out.swapBtnAppears && out.swapBtnUsesBlockYear &&
                            !!out.swapLanded && !!out.swapPersists;

    // ---- 4. back OFF returns to exactly the shape we started from ---------------------------------
    btn().click();
    await T.sleep(1500);
    var l3 = -1, s3 = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      s3 = (n === l3) ? s3 + 1 : 0; l3 = n; return s3 >= 5;
    }, 'the blocked grid to come back', 150, 100);
    out.back = shape();
    out.offIsInert = JSON.stringify(out.back) === JSON.stringify(out.off);

    // ---- 5. one undo step, not two ----------------------------------------------------------------
    btn().click();
    await T.sleep(1400);
    out.beforeUndo = shape().rows;
    // ⚠️ THE BUTTON, not a keystroke. There is no Cmd/Ctrl+Z binding in this app -- undo is
    // #undo-btn only. A synthetic keydown listens to nothing and the assertion passed vacuously
    // in its first cut, reporting "no change" as though the undo had worked.
    document.getElementById('undo-btn').click();
    await T.sleep(1600);
    out.afterUndo = shape().rows;
    out.oneUndoStep = out.afterUndo === out.off.rows && out.beforeUndo !== out.off.rows;

    // ⚠️ SIZING RUNS LAST, DELIBERATELY. It drags a column and a row, which changes the very
    // shape `offIsInert` above compares against -- running it earlier made that assertion fail
    // on a grid the test itself had resized, which reads exactly like a regression in the app.
    // ---- 3c. ⭐ SIZES SURVIVE THE TOGGLE ----------------------------------------------------------
    // Both of these were measured as BROKEN on first ship and fixed on 10 Sep 2026.
    //   * A row height was keyed by ROW INDEX, and row 4 is 2/2/26 in the padded layout and
    //     11/2/26 in the trimmed one -- so a height dragged onto one week silently moved to
    //     another. It is keyed by the week's ISO date now and follows its week.
    //   * Column widths were one shared set, but `y2026:s0` names a different column in each
    //     layout. Each layout keeps its own set now, and toggling is lossless both ways.
    // ⚠️ The week has to exist in BOTH layouts: the padded layout includes Jan-Sep of the first
    // year, which the trimmed one legitimately drops. Picking a week in there and asking where it
    // went is asking about a week that is simply not on the calendar.
    function widthMap() {
      var o = {};
      [].forEach.call(document.querySelectorAll('table.sheet-table colgroup col'),
        function (c) { o[c.dataset.ckey] = Math.round(parseFloat(c.style.width) || 0); });
      return o;
    }
    function heightOfWeek(txt) {
      var trs = document.querySelectorAll('table.sheet-table tbody tr');
      for (var i = 0; i < trs.length; i++) {
        var td = trs[i].querySelector('td');
        if (td && td.textContent.trim() === txt) return { row: i, h: Math.round(trs[i].getBoundingClientRect().height) };
      }
      return null;
    }
    function ptr2(t, el, x, y, b) {
      el.dispatchEvent(new PointerEvent(t, { bubbles:true, cancelable:true, composed:true,
        clientX:x, clientY:y, button:0, buttons:b, pointerId:9, pointerType:'mouse', isPrimary:true }));
    }
    async function drag(sel, dx, dy) {
      var h = document.querySelector(sel); if (!h) return false;
      var r = h.getBoundingClientRect(), x = Math.round(r.left + r.width/2), y = Math.round(r.top + r.height/2);
      ptr2('pointerdown', h, x, y, 1); await T.sleep(50);
      ptr2('pointermove', document, x+dx, y+dy, 1); await T.sleep(70);
      ptr2('pointerup', document, x+dx, y+dy, 0); await T.sleep(800);
      return true;
    }
    // Turn it OFF, size things there, then compare across a round trip.
    btn().click(); await T.sleep(1600);
    var lz=-1, sz=0;
    await T.until(function(){ var n=document.querySelectorAll('table.sheet-table tbody tr').length;
      sz=(n===lz)?sz+1:0; lz=n; return sz>=5; }, 'off again', 150, 100);
    var WK = '10/12/26';
    var wkRow = heightOfWeek(WK);
    out.sizeWeekRowOff = wkRow ? wkRow.row : null;
    if (wkRow) await drag('.grid-resize.is-row[data-row="' + wkRow.row + '"]', 0, 24);
    await drag('.grid-resize.is-col[data-ckey="y2026:s0"]', 70, 0);
    out.offHeight = (heightOfWeek(WK) || {}).h;
    out.offWidths = widthMap();
    btn().click(); await T.sleep(1700);
    var lx=-1, sx=0;
    await T.until(function(){ var n=document.querySelectorAll('table.sheet-table tbody tr').length;
      sx=(n===lx)?sx+1:0; lx=n; return sx>=5; }, 'on again', 150, 100);
    var onWk = heightOfWeek(WK);
    out.onHeight = onWk ? onWk.h : null;
    out.sizeWeekRowOn = onWk ? onWk.row : null;
    out.onWidths = widthMap();
    // ⭐ The height followed the WEEK even though its row NUMBER changed.
    out.rowHeightFollowsWeek = out.onHeight === out.offHeight && out.sizeWeekRowOn !== out.sizeWeekRowOff;
    // ⭐ ...and the single layout has its OWN widths, untouched by the drag done in the other one.
    out.widthsArePerLayout = out.onWidths['y2026:s0'] !== out.offWidths['y2026:s0'];
    btn().click(); await T.sleep(1700);
    var ly=-1, sy=0;
    await T.until(function(){ var n=document.querySelectorAll('table.sheet-table tbody tr').length;
      sy=(n===ly)?sy+1:0; ly=n; return sy>=5; }, 'off once more', 150, 100);
    out.widthsBack = widthMap();
    out.widthRoundTripLossless = JSON.stringify(out.widthsBack) === JSON.stringify(out.offWidths);
    btn().click(); await T.sleep(1700);
    var lw=-1, sw=0;
    await T.until(function(){ var n=document.querySelectorAll('table.sheet-table tbody tr').length;
      sw=(n===lw)?sw+1:0; lw=n; return sw>=5; }, 'on for the shape checks', 150, 100);


    out.errors = (window.__ERR || []).slice(0, 6);
    out.PASS = out.btnExists && out.btnStartsOff && out.btnIsButton &&
               out.offIsBlocked && out.offStartsAtYearTop &&
               out.btnNowPressed && out.btnNowActive &&
               out.oneBlock && out.startsAtWork && out.bothHalves &&
               out.keysStayNumeric && out.narrower &&
               out.snapHasKey && out.notInFieldIds &&
               out.swapWorksInOneCol &&
               out.rowHeightFollowsWeek && out.widthsArePerLayout && out.widthRoundTripLossless &&
               out.offIsInert && out.oneUndoStep &&
               out.errors.length === 0 && out.on.clippedH === 0 && out.off.clippedH === 0;
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
