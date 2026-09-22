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
    // The episodes are the same grip rows Episodes mode uses (owner, 22 Sep 2026), not chips.
    return [].map.call(document.querySelectorAll('#episode-rows .block-row'), function (r) {
      var eps = [].map.call(r.querySelectorAll('.episode-row .ep-name'), function (i) { return i.value.replace(/^Episode /, ''); });
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
  function epRow(epLabel) {
    return [].find.call(document.querySelectorAll('#episode-rows .episode-row'), function (r) {
      return r.querySelector('.ep-name').value === 'Episode ' + epLabel; });
  }
  // Drop on a block's HEADER: the episode goes to the end of that block.
  function drag(epLabel, blockId) {
    var row = epRow(epLabel), grip = row && row.querySelector('.ep-grip');
    var head = document.querySelector('.block-row[data-id="' + blockId + '"] .blk-name');
    if (!grip || !head) throw new Error('drag: no grip for ' + epLabel + ' or header for ' + blockId);
    var dt = new DataTransfer();
    grip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    head.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    head.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    grip.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  }
  // Drop on another episode's ROW, before/after it. ⚠️ Needs the Phases tab VISIBLE: a hidden row
  // measures 0x0, so every drop would read as "before".
  function dragOnRow(epLabel, targetLabel, side) {
    var grip = epRow(epLabel).querySelector('.ep-grip'), t = epRow(targetLabel), b = t.getBoundingClientRect();
    var y = side === 'before' ? b.top + 2 : b.bottom - 2, dt = new DataTransfer();
    grip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    t.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
    t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
    grip.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
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

    // ---- 2b. the same move by ROW: joins that row's block at that point in the shooting order ----
    var tabBtn = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tabBtn) tabBtn.click();
    await T.sleep(200);
    dragOnRow('204', '201', 'before');
    await settle();
    out.rowDrop = rows();
    out.rowDropGridSame = JSON.stringify(T.gridSignature()) === gridBefore;
    out.rowDropMetaSame = meta() === metaBefore;
    document.getElementById('undo-btn').click();
    await settle();
    out.rowDropUndoExact = JSON.stringify(rows()) === JSON.stringify(out.restoredRows);
    out.gripsInBlocks = document.querySelectorAll('#episode-rows .block-row .episode-row .ep-grip').length;

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

    // ---- 4b. the block tag (step 4): present, and never clipped -------------------------------
    // ⛔ BLOCKS-PLAN §5.1: "measure it at the narrowest month-view column before assuming it fits".
    // A pill is nowrap + ellipsis on purpose (a wrap would grow the row), so "fits" means the pill's
    // whole text -- label AND tag -- is inside its box. Measured on screen AND at the printed width: exportMonthPdf's own
    // fit pass lays #print-root out at PRINT_W = round((11 - 2*8/25.4) * 96) = 996 px, off-screen, and
    // that is what is replicated here.
    function tagFit(root) {
      // The tag is a span INSIDE Production's pill (owner, 22 Sep 2026), so what can clip is the
      // PILL: nowrap + ellipsis, and a pill piece too short for label + tag truncates the tail.
      // ⚠️ scrollWidth never drops below clientWidth, so their difference only says "clipped or
      // not". Headroom is the content's own extent (a Range over the pill) against the pill's
      // content box -- what a longer episode list would eat into.
      var tags = root.querySelectorAll('.mv-pill-block');
      var clipped = [], minSlack = Infinity;
      [].forEach.call(tags, function (sp) {
        var pill = sp.closest('.mv-pill');
        var cs = getComputedStyle(pill);
        var box = pill.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var rg = document.createRange(); rg.selectNodeContents(pill);
        var slack = Math.floor(box - rg.getBoundingClientRect().width);
        if (slack < minSlack) minSlack = slack;
        if (pill.scrollWidth > pill.clientWidth || slack < 0) clipped.push(pill.textContent);
      });
      // Ruling 7: a one-day piece of Production's pill carries NO tag. A pill's span is its
      // grid-column, "a / b" with b - a days.
      var oneDayTagged = [].filter.call(root.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        var m = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(p.getAttribute('style') || '');
        return m && (+m[2] - +m[1]) === 1 && p.querySelector('.mv-pill-block');
      }).length;
      var oneDayPieces = [].filter.call(root.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        var m = /grid-column:\s*(\d+)\s*\/\s*(\d+)/.exec(p.getAttribute('style') || '');
        return m && (+m[2] - +m[1]) === 1;
      }).length;
      return { n: tags.length, clipped: clipped, minSlack: tags.length ? minSlack : null,
               oneDayTagged: oneDayTagged, oneDayPieces: oneDayPieces,
               texts: [].map.call(tags, function (t) { return t.textContent; }),
               pills: [].map.call(tags, function (t) { return t.closest('.mv-pill').textContent; }) };
    }
    out.tagScreen = tagFit(document.getElementById('table-wrap'));
    async function printFit() {
      // The export button is reClickGuard(600)-wrapped: a second click inside 600 ms is dropped
      // silently, which read as "the export never ran" on the first cut of this leg.
      await T.sleep(700);
      var captured = false, realPrint = window.print;
      window.print = function () { captured = true; };
      document.getElementById('export-btn').click();
      await T.until(function () { return captured; }, 'the month export', 200, 100);
      var host = document.getElementById('print-root'), prev = host.style.cssText;
      host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:996px;';
      var r = tagFit(host);
      host.style.cssText = prev;
      window.dispatchEvent(new Event('afterprint'));
      window.print = realPrint;
      return r;
    }
    out.tagPrint = await printFit();
    // The widest case the model allows: a block SHORTER than a week, so one row touches three.
    var d2 = document.querySelector('.block-row[data-id="blk3"] .blk-days');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(d2, '2');
    d2.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    out.tagPrint3 = await printFit();
    out.threeBlockWeek = out.tagPrint3.texts.filter(function (t) { return (t.match(/Block /g) || []).length >= 3; });

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
