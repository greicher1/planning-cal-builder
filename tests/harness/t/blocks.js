// blocks -- block shooting, BLOCKS-PLAN.md steps 1-3, end to end on a REAL saved calendar.
//
// ⚠️ Driven by ?state=blocks (tests/fixtures/blocks.sptcal). Run against the BUILD:
//     HARNESS_PAGE=/dist/index.html HARNESS_STATE=blocks ./run.sh blocks 120
//
// The fixture was minted in the app, not written by hand: the reference calendar (10 episodes,
// us-general, every phase dated) switched to Blocks mode with 5 blocks x 18 days, Block 3 typed
// down to 13 (the per-block override, ruling 4), and episode 205 dragged from Block 3 into Block 2
// (a hand arrangement, so blockAssignEdited is true). 85 shoot days; Episodes mode would be 80.
//
// ⛔ THE PROPERTIES THAT MATTER MOST, and the plan is void without the first:
//   labelsNotDates  -- moving an episode between blocks moves NO date (§4.3). Asserted as the whole
//                      waterfall grid signature AND the Production meta line being identical.
//   roundTrip       -- Blocks -> Episodes -> Blocks lands on the same dates, and the hand
//                      arrangement survives the trip (§3: never discard the other mode's inputs).
//   uncondRestore   -- a calendar saved BEFORE Blocks existed, loaded after this one, opens in
//                      Episodes mode with no block fields. Without applyStateSnapshot()'s default it
//                      would be scheduled from THIS file's block count. Loaded through the REAL
//                      picker path (openViaFakePicker), so it is also the first .sptcal the gate
//                      opens that way rather than through ?state=.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  function rows() {
    return [].map.call(document.querySelectorAll('#episode-rows .block-row'), function (r) {
      var eps = [].map.call(r.querySelectorAll('.blk-ep'), function (c) { return c.textContent; });
      return r.querySelector('.blk-name').textContent + '(' + r.querySelector('.blk-days').value + '):' + eps.join(',');
    });
  }
  function meta() { return ((document.getElementById('meta-production') || {}).textContent || '').trim(); }
  function hdrText() {
    return [].map.call(document.querySelectorAll('#table-wrap .hdr-line'), function (h) { return h.textContent; }).join(' | ');
  }
  function hiddenByCss(id) {
    var el = document.getElementById(id), box = el && el.closest('.show-mode-episodes, .show-mode-blocks');
    return !!box && getComputedStyle(box).display === 'none';
  }
  function drag(epLabel, blockId) {
    var chip = [].find.call(document.querySelectorAll('.blk-ep'), function (c) { return c.textContent === epLabel; });
    var zone = document.querySelector('.block-row[data-id="' + blockId + '"]');
    if (!chip || !zone) throw new Error('drag: no chip ' + epLabel + ' or block ' + blockId);
    var dt = new DataTransfer();
    chip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    chip.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  }
  async function settle() {
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
  }
  try {
    await T.appReady();
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 10 &&
             document.querySelectorAll('#episode-rows .block-row').length > 0;
    }, 'the restored Blocks calendar', 200, 100);
    await settle();

    // ---- 1. restored as saved --------------------------------------------------------------
    out.mode = document.getElementById('show-mode').value;
    out.restoredRows = rows();
    out.restoredMeta = meta();
    out.readout = (document.getElementById('prod-total-readout') || {}).textContent;
    out.hdr = hdrText();
    out.perEpHidden = hiddenByCss('shoot-days-per-ep');
    out.blockFieldsShown = !hiddenByCss('num-blocks') && !hiddenByCss('days-per-block');
    // ⛔ id hygiene: collectFieldValues() sweeps every input[id]; the block panel must carry none.
    out.idsInPanel = [].map.call(document.querySelectorAll('#ep-panel [id]'), function (e) { return e.id; })
      .filter(function (id) { return id !== 'ep-panel-warn' && id !== 'episode-rows'; });
    var sig = T.formSignature();
    out.formHasBlockIds = ['show-mode', 'num-blocks', 'days-per-block'].every(function (k) { return k in sig; });
    out.formIds = Object.keys(sig).length;

    // ---- 2. labels, not dates: a hand move changes NO date --------------------------------
    var gridBefore = JSON.stringify(T.gridSignature()), metaBefore = meta();
    drag('206', 'blk1');
    await settle();
    out.afterMove = rows();
    out.moveGridSame = JSON.stringify(T.gridSignature()) === gridBefore;
    out.moveMetaSame = meta() === metaBefore;
    // ...and it is ONE undo step.
    document.getElementById('undo-btn').click();
    await settle();
    out.afterUndo = rows();
    out.undoExact = JSON.stringify(out.afterUndo) === JSON.stringify(out.restoredRows);

    // ---- 3. the mode round trip ------------------------------------------------------------
    T.set('show-mode', 'episodes');
    await settle();
    out.epMeta = meta();
    out.epHdr = hdrText();
    out.epRowsShown = document.querySelectorAll('#episode-rows .episode-row').length;
    out.epBlockRows = document.querySelectorAll('#episode-rows .block-row').length;
    T.set('show-mode', 'blocks');
    await settle();
    out.backMeta = meta();
    out.backRows = rows();
    out.roundTrip = out.backMeta === out.restoredMeta &&
                    JSON.stringify(out.backRows) === JSON.stringify(out.restoredRows);

    // ---- 4. month view: Production's pills, no episode pills (ruling 5) --------------------
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    // Walk to the first month of the shoot.
    for (var g = 0; g < 24; g++) {
      if (/July 2026/.test((document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '')) break;
      var nx = document.getElementById('mv-next'); if (!nx || nx.disabled) break;
      nx.click(); await T.sleep(120);
    }
    out.mvMonth = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent;
    var pills = [].map.call(document.querySelectorAll('#table-wrap .mv-pill'), function (p) { return (p.textContent || '').trim(); });
    out.mvEpisodePills = pills.filter(function (t) { return /^Episode\b/.test(t); }).length;
    out.mvProductionPills = pills.filter(function (t) { return /^Production\b/.test(t); }).length;
    document.getElementById('view-sheet-btn').click();
    await settle();

    // ---- 5. restore unconditionally: a pre-Blocks file loaded AFTER this one ---------------
    // The page is dirty now, so Load raises the unsaved-work confirm. Answer it -- it is the app's
    // own Mantine dialog, not window.confirm.
    var answered = false;
    var poll = setInterval(function () {
      var b = [].find.call(document.querySelectorAll('button'), function (x) {
        return (x.textContent || '').trim() === 'Load' && x.offsetParent !== null;
      });
      if (b) { answered = true; b.click(); clearInterval(poll); }
    }, 50);
    await T.openViaFakePicker('/tests/fixtures/dayoverrides.sptcal', 'dayoverrides.sptcal');
    clearInterval(poll);
    out.loadGuardAnswered = answered;
    // ⚠️ Wait on something the MODE CANNOT AFFECT -- that file's Wednesday Pre Prep start -- not on
    // its wrap date. The first cut waited for the wrap, so with the default removed (the control
    // this leg was proven against) it timed out instead of reporting the wrong mode and wrong dates.
    await T.until(function () {
      return (document.getElementById('start-prePrep') || {}).value === '2026-04-08';
    }, 'dayoverrides.sptcal to land', 200, 100);
    await settle();
    out.oldMode = document.getElementById('show-mode').value;
    out.oldNumBlocks = document.getElementById('num-blocks').value;
    out.oldDaysPerBlock = document.getElementById('days-per-block').value;
    out.oldMeta = meta();
    out.oldEpisodeRows = document.querySelectorAll('#episode-rows .episode-row').length;
    out.oldBlockRows = document.querySelectorAll('#episode-rows .block-row').length;
    out.oldHdr = hdrText();

    out.errors = (T.appHealth().errors || []).slice(0, 10);
    out.clipped = (function () { var c = T.clippedCells(); return { h: c.h.length }; })();
  } catch (e) { out.EX = e.message; out.errors = (window.__ERR || []).slice(0, 10); }
  T.done(out);
})(); });
