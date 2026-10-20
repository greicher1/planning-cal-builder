// colreuse -- "Reuse empty columns" (COLUMN-REUSE-PLAN.md; owner rulings 20 Oct 2026).
//
// A phase takes over the column of one that has just finished, so a long calendar keeps a few steady
// columns instead of drifting right. One box in Settings, the grid's own drag to fix a pick, and a
// phase-row note only when something was moved by hand.
//
// ⛔ SYNTHETIC CALENDAR. Made-up phases and dates, 2030-2032. Each phase is placed to exercise ONE
// rule of the plan's §3, and the comment beside it says which. Never replace this with a real calendar.
//
// Two runs:
//   LIVE     builds the calendar through the DOM, checks every rule, the drag, the note, Reset, the
//            width clearing (ruled Q7), undo and the save format, then emits the snapshot.
//   RESTORE  (?state=colreuse, tests/fixtures/colreuse.sptcal, cut from LIVE's snapshot) proves a saved
//            calendar opens with the box ticked, the hand move applied, and the same columns.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  var RESTORE = /[?&]state=colreuse\b/.test(location.search);
  out.mode = RESTORE ? 'restore' : 'live';
  try {
    try { localStorage.clear(); } catch (e) {}
    var box = function () { return document.getElementById('col-reuse-btn'); };
    async function settle(label) {
      var last = '', stable = 0;
      await T.until(function () {
        var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
          function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week; }).join('');
        stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
      }, label, 200, 100);
    }
    // The phases in each column of each year: { '2030': { '0': ['custom1','writersRoom'], ... } }.
    // Read off the cells' own data-own (the phase's own column), never off the painted spans.
    function columns() {
      var by = {};
      [].forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
        var y = (td.dataset.week || '').slice(0, 4), s = td.dataset.own, k = td.dataset.pkey;
        if (!y || s === undefined || !k) return;
        var Y = by[y] = by[y] || {}, S = Y[s] = Y[s] || [];
        if (S.indexOf(k) < 0) S.push(k);
      });
      Object.keys(by).forEach(function (y) { Object.keys(by[y]).forEach(function (s) { by[y][s].sort(); }); });
      return by;
    }
    function slotOf(cols, year, key) {
      var Y = cols[year] || {};
      for (var s in Y) if (Y[s].indexOf(key) >= 0) return +s;
      return null;
    }
    var nCols = function (cols, year) { return Object.keys(cols[year] || {}).length; };
    var same = function (cols, year, a, b) { var x = slotOf(cols, year, a); return x !== null && x === slotOf(cols, year, b); };
    async function snapshot() {
      var cap = T.captureDownload();
      document.getElementById('share-copy-btn').click();
      await T.until(cap.peek, 'the shareable copy', 200, 100);
      var html = await cap.stop().text();
      var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
      return m ? JSON.parse(m[1]) : null;
    }
    function noteOf(key) { var el = document.getElementById('colnote-' + key); return el ? { text: el.textContent, stale: el.classList.contains('is-stale') } : null; }
    function ptr(t, el, x, y, b) {
      el.dispatchEvent(new PointerEvent(t, { bubbles:true, cancelable:true, composed:true,
        clientX:x, clientY:y, button:0, buttons:b, pointerId:7, pointerType:'mouse', isPrimary:true }));
    }
    // Select a whole block through the "Swap Column" hover button, as a user does.
    async function selectBlock(key, weekIso) {
      var td = [].find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (t) { return t.dataset.pkey === key && t.dataset.week === weekIso; });
      if (!td) return false;
      td.scrollIntoView({ block: 'center' });
      await T.sleep(200);
      var r = td.getBoundingClientRect();
      ptr('pointermove', td, Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), 0);
      await T.sleep(450);
      var sb = document.querySelector('.grid-swap-layer .grid-stint-btn');
      if (!sb) return false;
      sb.focus(); sb.click();
      await T.sleep(600);
      return true;
    }

    if (!RESTORE) {
      // ---- the calendar ---------------------------------------------------------------------------
      T.set('show-title', 'Column Reuse'); T.set('season-num', '1');
      T.set('num-episodes', '20'); T.set('shoot-days-per-ep', '8');          // 160 days = 32 weeks
      var add = document.getElementById('add-phase-btn');
      for (var i = 0; i < 8; i++) { add.click(); await T.sleep(60); }
      var P = [
        // key            name        start         weeks   the rule it exercises (plan §3)
        ['writersRoom',  'Writers',  '2030-01-07', '20'],   // first column
        ['prePrep',      'Design',   '2030-04-15', '12'],   // starts while Writers runs: a new column
        ['custom1',      'Stage',    '2030-05-27', '10'],   // HANDOFF from Writers while Design runs (old rule: pushed right)
        ['prodPrep',     'Prep',     '2030-07-08', '8'],    // handoff from Design
        ['custom2',      'Build',    '2030-08-05', '4'],    // handoff from Stage; ends with Prep
        ['post',         'Post',     '2030-10-07', '8'],    // no handoff: the LOWEST FREE column
        ['custom3',      'Cut',      '2030-10-21', '9'],    // nothing free: a NEW column
        ['localization', 'Loc',      '2031-01-06', '6'],    // handoff from Cut ACROSS the New Year hiatus
        ['custom4',      'Score',    '2031-01-06', '6'],    // lowest free; ends with Loc
        ['custom5',      'Mix',      '2031-02-17', '4'],    // TIE (Score, Loc), custom: the LEFTMOST
        ['custom6',      'Grade',    '2031-04-28', '5'],    // handoff from Production
        ['custom7',      'Ship',     '2031-06-16', '3'],    // handoff from Grade ACROSS a mid-year hiatus (ruled Q5)
        ['custom8',      'Delivery', '2032-03-01', '4']     // alone in 2032: that year's columns never change
      ];
      P.forEach(function (p) { T.set('name-' + p[0], p[1]); T.set('start-' + p[0], p[2]); T.set('weeks-' + p[0], p[3]); });
      // Production starts the week Prep and Build both end: the TIE the "Start after" chain settles.
      T.set('start-production', '2030-09-02');
      T.addHiatus('2030-12-23', 2);
      T.addHiatus('2031-06-02', 2);
      await settle('the grid');

      // ---- 1. OFF is today ----------------------------------------------------------------------
      out.boxExists = !!box();
      out.boxStartsOff = out.boxExists && box().checked === false;
      out.boxSkippedBySweep = out.boxExists && !!box().closest('.prefs-card');
      out.off = columns();
      out.offCols2030 = nCols(out.off, '2030');
      var snapOff = await snapshot();
      out.offSnapHasNoKeys = !!snapOff && !('colReuse' in snapOff) && !('colFollow' in snapOff);
      out.offNoNotes = document.querySelectorAll('.col-move-note').length === 0;

      // Hand-dragged widths, set while OFF, to watch ruled Q7 (2030 changes shape, 2032 does not).
      function ptr2(t, el, x, y, b) {
        el.dispatchEvent(new PointerEvent(t, { bubbles:true, cancelable:true, composed:true,
          clientX:x, clientY:y, button:0, buttons:b, pointerId:9, pointerType:'mouse', isPrimary:true }));
      }
      async function dragCol(ckey, dx) {
        var h = document.querySelector('.grid-resize.is-col[data-ckey="' + ckey + '"]'); if (!h) return false;
        h.scrollIntoView({ block: 'nearest', inline: 'center' }); await T.sleep(150);
        var r = h.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
        ptr2('pointerdown', h, x, y, 1); await T.sleep(50);
        ptr2('pointermove', document, x + dx, y, 1); await T.sleep(70);
        ptr2('pointerup', document, x + dx, y, 0); await T.sleep(800);
        return true;
      }
      out.dragged2030 = await dragCol('y2030:s0', 60);
      out.dragged2032 = await dragCol('y2032:s0', 60);
      var snapW = await snapshot();
      out.widthsBefore = snapW ? snapW.colWidths : null;

      // ---- 2. ON: every rule of §3 ---------------------------------------------------------------
      box().click();
      await T.sleep(400);
      await settle('the reused grid');
      out.boxNowOn = box().checked === true;
      var on = out.on = columns();
      out.onCols = { '2030': nCols(on, '2030'), '2031': nCols(on, '2031'), '2032': nCols(on, '2032') };
      out.fewerColumns = out.onCols['2030'] === 3 && out.offCols2030 > 3;
      out.handoff     = same(on, '2030', 'custom1', 'writersRoom') && !same(on, '2030', 'custom1', 'prePrep');
      out.chainTie    = same(on, '2030', 'production', 'prodPrep') && !same(on, '2030', 'production', 'custom2');
      out.lowestFree  = same(on, '2030', 'post', 'writersRoom');
      out.newColumn   = [slotOf(on, '2030', 'custom3')].every(function (s) {
        return s !== null && s !== slotOf(on, '2030', 'writersRoom') && s !== slotOf(on, '2030', 'production'); });
      out.prodLeft2031 = slotOf(on, '2031', 'production') === 0;                 // ruled Q2
      out.customTieLeftmost = same(on, '2031', 'custom5', 'custom4') && !same(on, '2031', 'custom5', 'localization');  // ruled Q1
      out.acrossHiatus = same(on, '2031', 'custom7', 'custom6') && same(on, '2031', 'custom6', 'production');         // ruled Q5
      out.onNoNotes = document.querySelectorAll('.col-move-note').length === 0;

      // ---- 3. Q7: widths cleared only where the columns changed -----------------------------------
      var snapW2 = await snapshot();
      out.widthsAfter = snapW2 ? snapW2.colWidths : null;
      out.widthsCleared2030 = !!out.widthsBefore && ('y2030:s0' in out.widthsBefore) && !('y2030:s0' in (out.widthsAfter || {}));
      out.widthsKept2032 = !!out.widthsBefore && ('y2032:s0' in out.widthsBefore) &&
                           (out.widthsAfter || {})['y2032:s0'] === out.widthsBefore['y2032:s0'];

      // ---- 4. the box is ONE undo step ------------------------------------------------------------
      document.getElementById('undo-btn').click();
      await T.sleep(500); await settle('undo');
      out.undoBoxOff = box().checked === false;
      out.undoLayout = JSON.stringify(columns()) === JSON.stringify(out.off);
      var snapU = await snapshot();
      out.undoWidthsBack = !!snapU && JSON.stringify(snapU.colWidths) === JSON.stringify(out.widthsBefore);
      document.getElementById('redo-btn').click();
      await T.sleep(500); await settle('redo');
      out.redoBack = box().checked === true && JSON.stringify(columns()) === JSON.stringify(on);

      // ---- 5. the drag: move Mix into the free column beside it (where Loc was) ------------------
      out.selectedMix = await selectBlock('custom5', '2031-02-17');
      out.mixSlotBefore = slotOf(columns(), '2031', 'custom5');
      T.altSwap(1);
      await T.sleep(900); await settle('the move');
      var mv = columns();
      out.mixSlotAfter = slotOf(mv, '2031', 'custom5');
      out.moved = same(mv, '2031', 'custom5', 'localization') && !same(mv, '2031', 'custom5', 'custom4');
      out.noteMoved = noteOf('custom5');
      out.noteSaysMoved = !!out.noteMoved && !out.noteMoved.stale && /Moved by hand into Loc/.test(out.noteMoved.text) && /Reset/.test(out.noteMoved.text);
      out.onlyOneNote = document.querySelectorAll('.col-move-note').length === 1;
      var snapM = await snapshot();
      out.snapM = snapM;
      out.snapHasKeys = !!snapM && snapM.colReuse === true && !!snapM.colFollow && snapM.colFollow.custom5 === 'localization';
      out.notInFieldIds = !!snapM && Object.keys((snapM.fields || {}).byId || {}).every(function (k) { return !/col-?reuse/i.test(k); });

      // ---- 5b. the workbook puts every phase where the screen does --------------------------------
      // Read through the page's own ExcelJS. A merge reports its master's value from every cell it
      // covers, so only master cells count; the first cell of each label is enough, as each phase
      // holds ONE column per year.
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var xcol = {};
      wb.worksheets[0].eachRow(function (row) { row.eachCell(function (c) {
        if (c.isMerged && c.master && c.master.address !== c.address) return;
        var v = c.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
        if (typeof v === 'string' && !(v.trim() in xcol)) xcol[v.trim()] = c.col;
      }); });
      out.xlsxCols = { writers: xcol['Writers wk 1'], stage: xcol['Stage wk 1'], prep: xcol['Prep wk 1'],
                       prod: xcol['Production wk 1'], loc: xcol['Loc wk 1'], mix: xcol['Mix wk 1'] };
      out.xlsxAgrees = !!out.xlsxCols.writers && out.xlsxCols.writers === out.xlsxCols.stage &&
                       out.xlsxCols.prep === out.xlsxCols.prod && out.xlsxCols.loc === out.xlsxCols.mix;
      try { await T.sleep(700); var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF'); out.pdfBytes = pb ? pb.size : 0; }
      catch (e) { out.pdfErr = String(e && e.message || e); }
      out.pdfExported = !out.pdfErr && out.pdfBytes > 1000;

      // ---- 6. a move that can't apply: Loc now runs into Mix's start ------------------------------
      T.set('weeks-localization', '8');
      await T.sleep(600); await settle('Loc longer');
      var st = columns();
      out.noteStale = noteOf('custom5');
      out.staleSaysWhy = !!out.noteStale && out.noteStale.stale && /Loc is still running/.test(out.noteStale.text);
      out.staleBackToAuto = same(st, '2031', 'custom5', 'custom4');
      T.set('weeks-localization', '6');
      await T.sleep(600); await settle('Loc back');
      out.reapplies = same(columns(), '2031', 'custom5', 'localization') && !!noteOf('custom5') && !noteOf('custom5').stale;

      // ---- 7. Reset --------------------------------------------------------------------------------
      var rb = document.querySelector('#colnote-custom5 .col-move-reset');
      out.resetExists = !!rb;
      if (rb) rb.click();
      await T.sleep(600); await settle('reset');
      out.resetBack = same(columns(), '2031', 'custom5', 'custom4') && !noteOf('custom5');
      // Leave the hand move in place for the snapshot the RESTORE run is cut from.
      document.getElementById('undo-btn').click();
      await T.sleep(600); await settle('undo reset');
      out.undoReset = same(columns(), '2031', 'custom5', 'localization');
      out.finalCols = columns();
      out.fixture = await snapshot();
    } else {
      // ---- RESTORE: a saved calendar opens exactly as it was saved ---------------------------------
      await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 20; }, 'the restored grid', 200, 100);
      await settle('the restored grid');
      out.boxOn = !!box() && box().checked === true;
      var rc = out.cols = columns();
      out.restoredMove = same(rc, '2031', 'custom5', 'localization');
      out.restoredRules = same(rc, '2030', 'custom1', 'writersRoom') && same(rc, '2030', 'production', 'prodPrep') &&
                          slotOf(rc, '2031', 'production') === 0 && same(rc, '2031', 'custom7', 'custom6');
      out.restoredNote = noteOf('custom5');
      out.noteRestored = !!out.restoredNote && /Moved by hand into Loc/.test(out.restoredNote.text);
      // New clears both, unconditionally.
      document.getElementById('new-file-btn').click();
      await T.sleep(700);
      var go = [].find.call(document.querySelectorAll('button'), function (b) { return /Start new/.test(b.textContent || ''); });
      if (go) go.click();
      await T.sleep(1200);
      out.newClears = !!box() && box().checked === false && document.querySelectorAll('.col-move-note').length === 0;
    }
    out.errors = (window.__ERR || []).slice(0, 6);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
