// customunits -- a custom phase's length in Weeks, Days or Dates (CUSTOM-PHASE-UNITS-PLAN.md, steps 1-3).
//
// TWO RUNS, chosen by the starting state:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh customunits 120
//     LIVE + MINT. Builds a synthetic calendar through the UI (made-up 2027 dates; no real show's
//     shape), asserts what a user sees while editing, then saves it through the real Save path
//     (saveToFile -> buildSavedData, only the OS picker stood in for) and returns the .sptcal text
//     as out.text -- that is how tests/fixtures/customunits.sptcal was cut (see that README).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=customunits ./run.sh customunits 120
//     RESTORE. Loads that fixture through the inline saved-state path and asserts it comes back
//     exactly: the units, the visible boxes, the month pills day for day, the waterfall rows, the
//     hint lines and the {key.close} header tokens (the fixture's month header is a template).
//
// THE CALENDAR (region Atlanta = US-GEN, saved as us-atlanta, which loads as us-general since 29 Oct 2026, so MLK Day Mon 1/18/27 and Presidents' Day Mon 2/15/27 are
// union holidays; one all-phase hiatus, the week of Mon 2/15/27):
//   custom1 Scout         WEEKS, Snap off, Wed 1/13/27 x 2 wk      -> ends Tue 1/26 (the {close} bug case)
//   custom2 Read-through  DAYS 6 from Thu 1/14/27                  -> Thu 14, Fri 15, [Mon 18 MLK],
//                                                                     Tue 19 .. Fri 22: ends Fri 1/22
//   custom3 Stage Build   DATES Wed 2/10/27 -> Tue 2/23/27          -> stays put; hiatus week blank
//   custom4 Rigging       DAYS 5 from Thu 2/11/27                  -> Thu 11, Fri 12, [hiatus week],
//                                                                     Mon 22 .. Wed 24: ends Wed 2/24
//   prePrep               WEEKS (built-in), Mon 1/4/27 x 4 wk       -> the control: a Monday end
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  // The hint line the USER SEES: frozen render()'s meta-<key>, or the engine's unitmeta-<key> for a
  // Days/Dates phase -- whichever CSS shows. Reading the visible one asserts the CSS swap as well.
  function meta(k){
    var el = [$('meta-' + k), $('unitmeta-' + k)].filter(function (e) { return e && getComputedStyle(e).display !== 'none'; });
    return el.map(function (e) { return (e.textContent || '').replace(/\s+/g, ' ').trim(); }).join(' || ');
  }
  function shown(el){ var l = el && el.closest('label'); return !!l && getComputedStyle(l).display !== 'none'; }
  async function settle(){ await T.sleep(700); }   // past the 500 ms undo debounce
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await T.sleep(300); }
  async function gotoMonth(label){
    for(var i = 0; i < 40; i++){
      var t = ($('table-wrap') || {}).textContent || '';
      if(t.indexOf(label) !== -1) return true;
      var m = /(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/.exec(t);
      var want = new Date(label + ' 1 UTC'), have = m ? new Date(m[1] + ' 1, ' + m[2] + ' UTC') : null;
      var btn = (have && have > want) ? $('mv-prev') : $('mv-next');
      if(!btn) return false;
      btn.click(); await T.sleep(120);
    }
    return false;
  }
  // The month pills of one phase in the month on screen: their grid columns (Sun = 1) in row order.
  function pills(k){
    return Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="' + k + '"]'))
      .map(function (p) { return p.style.gridColumn.replace(/\s+/g, ''); }).join(' ');
  }
  // Waterfall: phase label -> the dates of the rows it appears in.
  function sheetRows(){
    var map = {};
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim();
        if(/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(t)){ date = t; return; }
        // ⚠️ Or the BARE name (PHASE-NUMBERING-PLAN.md, 19 Oct 2026): LIVE sets Days and Dates through the By select,
        // which unticks "Number weeks", so Read-through, Stage Build and Rigging read without "wk N" there. RESTORE's
        // fixture predates the box and stays numbered.
        var m = /^(.*?) wk \d+$/.exec(t) || (['Scout', 'Read-through', 'Stage Build', 'Rigging'].indexOf(t) !== -1 ? [t, t] : null);
        if(m && date){ (map[m[1]] = map[m[1]] || []).push(date); }
      });
    });
    return map;
  }
  async function monthFacts(){
    await view('month');
    var f = {};
    if(await gotoMonth('January 2027')){ f.jan = {c1: pills('custom1'), c2: pills('custom2'), pre: pills('prePrep')}; }
    if(await gotoMonth('February 2027')){ f.feb = {c3: pills('custom3'), c4: pills('custom4')}; }
    f.hdr = Array.from(document.querySelectorAll('#table-wrap .mv-hdr-line, #table-wrap [data-mvh]'))
      .map(function (e) { return (e.textContent || '').trim(); }).filter(Boolean);
    f.hdrText = (($('table-wrap') || {}).textContent || '').slice(0, 400);
    await view('sheet');
    return f;
  }
  // The expected month pills (grid-column "a/b", Sun = 1, row by row), worked out by hand from the
  // calendar above. A Weeks phase draws every weekday in its range, holidays included; a Days phase
  // draws only the days it counted.
  var WANT = {
    jan: { c1: '4/7 2/7 2/4',             // Wed 13-Fri 15 | Mon 18-Fri 22 | Mon 25-Tue 26
           c2: '5/7 3/7',                 // Thu 14-Fri 15 | Tue 19-Fri 22 (Mon 18, MLK, blank)
           pre: '2/7 2/7 2/7 2/7' },      // four whole weeks: the Weeks control
    feb: { c3: '4/7 2/4',                 // Wed 10-Fri 12 | [hiatus week] | Mon 22-Tue 23
           c4: '5/7 2/5' }                // Thu 11-Fri 12 | [hiatus week] | Mon 22-Wed 24
  };

  try {
    await T.appReady();
    var st = (new URL(location.href)).searchParams.get('state') || '';
    out.run = st ? 'restore' : 'live';

    if(!st){
      // ---------------- LIVE: build it through the UI ----------------
      T.set('union-place', 'us-general');   // was us-atlanta, retired 29 Oct 2026: same list (RETIRED_PLACES)
      T.set('start-prePrep', '2027-01-04'); T.set('weeks-prePrep', '4');
      T.addHiatus('2027-02-15', 1);
      for(var i = 0; i < 4; i++){ $('add-phase-btn').click(); await T.sleep(80); }
      T.set('name-custom1', 'Scout');
      var sn = $('snap-custom1'); sn.checked = false; ['input', 'change'].forEach(function (t) { sn.dispatchEvent(new Event(t, {bubbles:true})); });
      T.set('start-custom1', '2027-01-13'); T.set('weeks-custom1', '2');
      T.set('name-custom2', 'Read-through'); T.set('unit-custom2', 'days');
      T.set('start-custom2', '2027-01-14'); T.set('days-custom2', '6');
      T.set('name-custom3', 'Stage Build'); T.set('unit-custom3', 'dates');
      T.set('start-custom3', '2027-02-10'); T.set('end-custom3', '2027-02-23');
      T.set('name-custom4', 'Rigging'); T.set('unit-custom4', 'days');
      T.set('start-custom4', '2027-02-11'); T.set('days-custom4', '5');
      await settle();
      out.health = T.appHealth();

      // Which boxes each unit shows -- pure CSS off the select (plan §6).
      out.boxes = {
        weeks: [shown($('weeks-custom1')), shown($('days-custom1')), shown($('end-custom1')), shown($('snap-custom1'))],
        days:  [shown($('weeks-custom2')), shown($('days-custom2')), shown($('end-custom2')), shown($('snap-custom2'))],
        dates: [shown($('weeks-custom3')), shown($('days-custom3')), shown($('end-custom3')), shown($('snap-custom3'))],
      };
      check(out.boxes.weeks.join() === 'true,false,false,true', 'Weeks shows Weeks + Snap only');
      check(out.boxes.days.join()  === 'false,true,false,false', 'Days shows the Days box only');
      check(out.boxes.dates.join() === 'false,false,true,false', 'Dates shows the End date only');

      // ⭐ Reachable by a real pointer, not just by a dispatched event (MONTH-VIEW-PLAN §8 step 5).
      var tb = document.querySelector('.side-tab-btn[data-tab="phases"]'); if(tb) tb.click(); await T.sleep(150);
      var sel = $('unit-custom2'); sel.scrollIntoView({block:'center'}); await T.sleep(100);
      var r = sel.getBoundingClientRect();
      out.selectReachable = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).indexOf(sel) !== -1;
      check(out.selectReachable, 'the Length select is hit-testable');

      // The old-build fallback: weeks-<key> holds the week rows a Days/Dates phase spans.
      out.fallback = [$('weeks-custom2').value, $('weeks-custom3').value, $('weeks-custom4').value];
      check(out.fallback.join() === '2,3,3', 'weeks-<key> fallback = week rows spanned');

      // ---- switching unit never moves the phase (plan §5), and is ONE undo step ----
      await view('month'); await gotoMonth('February 2027');
      var before3 = pills('custom3');
      T.set('unit-custom3', 'days'); await settle();
      out.switch = {pillsBefore: before3, pillsAfter: pills('custom3'), daysPrefill: $('days-custom3').value, meta: meta('custom3')};
      // Wed 10 - Tue 23 with the hiatus week out = 3 + 2 = 5 working days (Presidents' Day is in the hiatus).
      check(out.switch.daysPrefill === '5' && out.switch.pillsAfter === before3, 'Dates -> Days prefills 5 and nothing moves');
      $('undo-btn').click(); await settle();
      // ⚠️ Undo restores the snapshot's viewMode too (it is in captureSnapshot), so look again.
      await view('month'); await gotoMonth('February 2027');
      out.undo = {unit: $('unit-custom3').value, days: $('days-custom3').value, pills: pills('custom3')};
      check(out.undo.unit === 'dates' && out.undo.days === '' && out.undo.pills === before3, 'one undo restores the unit AND clears the prefill');
      await view('sheet');

      // ---- an end before the start: phase left out, end ringed, hint says why ----
      T.set('end-custom3', '2027-02-01'); await settle();
      out.endBefore = {meta: meta('custom3'), ringed: $('end-custom3').classList.contains('is-invalid'),
                       inGrid: !!sheetRows()['Stage Build']};
      check(/before the start date/.test(out.endBefore.meta) && out.endBefore.ringed && !out.endBefore.inGrid, 'end before start: unscheduled, ringed, explained');
      T.set('end-custom3', '2027-02-23'); await settle();
      check(!$('end-custom3').classList.contains('is-invalid'), 'the ring clears');

      // ---- a fractional day count is ringed, like a fractional week count ----
      T.set('days-custom4', '4.5'); await settle();
      out.wholeDays = {ringed: $('days-custom4').classList.contains('is-invalid'),
                       words: ($('days-custom4').closest('label') || {getAttribute:function(){return null;}}).getAttribute('data-whole-err')};
      check(out.wholeDays.ringed && out.wholeDays.words === 'Whole days only', 'a fractional Days value says "Whole days only"');
      T.set('days-custom4', '5'); await settle();

      // ---- a Days start typed on a weekend: the hint names the first working day ----
      T.set('start-custom4', '2027-02-06'); await settle();   // a Saturday
      out.weekendStart = meta('custom4');
      check(/First working day Mon 2\/8\/27/.test(out.weekendStart), 'a weekend start names the first working day');
      T.set('start-custom4', '2027-02-11'); await settle();
    }

    // ---------------- BOTH RUNS: the calendar as it stands ----------------
    if(st){
      await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 3; }, 'the restored grid', 200, 100);
      await T.sleep(1200);
      out.health = T.appHealth();
      out.units = ['custom1', 'custom2', 'custom3', 'custom4'].map(function (k) { return ($('unit-' + k) || {}).value; });
      check(out.units.join() === 'weeks,days,dates,days', 'units restored');
      check(shown($('days-custom2')) && !shown($('weeks-custom2')) && shown($('end-custom3')), 'the right boxes show after a restore');
    }
    out.meta = {c1: meta('custom1'), c2: meta('custom2'), c3: meta('custom3'), c4: meta('custom4')};
    check(out.meta.c2 === '6 working days · Thu 1/14/27 → Fri 1/22/27 (2 wk)', 'Read-through hint');
    check(out.meta.c3 === 'Wed 2/10/27 → Tue 2/23/27 (3 wk)', 'Stage Build hint');
    check(out.meta.c4 === '5 working days · Thu 2/11/27 → Wed 2/24/27 (3 wk)', 'Rigging hint');

    out.sheet = sheetRows();
    check((out.sheet['Read-through'] || []).join() === '1/11/27,1/18/27', 'waterfall: Read-through on 2 week rows');
    check((out.sheet['Stage Build'] || [])[0] === '2/8/27' && (out.sheet['Stage Build'] || []).slice(-1)[0] === '2/22/27', 'waterfall: Stage Build 2/8 .. 2/22');
    check((out.sheet['Rigging'] || [])[0] === '2/8/27' && (out.sheet['Rigging'] || []).slice(-1)[0] === '2/22/27', 'waterfall: Rigging 2/8 .. 2/22');

    out.month = await monthFacts();
    out.want = WANT;
    check(out.month.jan && out.month.jan.c1 === WANT.jan.c1, 'month: Scout Wed 1/13 .. Tue 1/26');
    check(out.month.jan && out.month.jan.c2 === WANT.jan.c2, 'month: Read-through skips MLK Day');
    check(out.month.jan && out.month.jan.pre === WANT.jan.pre, 'month: Pre Prep (the Weeks control) unchanged');
    check(out.month.feb && out.month.feb.c3 === WANT.feb.c3, 'month: Stage Build stays on its dates, hiatus week blank');
    check(out.month.feb && out.month.feb.c4 === WANT.feb.c4, 'month: Rigging pauses through the hiatus');

    if(st){
      // The fixture's month header is a template naming every phase's {close}. Each must name the
      // phase's LAST WORKING DAY (plan §9) -- the old `end - 3` named Sun 1/24 for Scout.
      var hdr = out.month.hdrText || '';
      out.closeTokens = ((/CLOSES((?:\d+\.\d+\.\d+ ?)+)/.exec(hdr) || [])[1] || '').trim();
      // Scout Tue 1/26, Read-through Fri 1/22, Stage Build Tue 2/23, Rigging Wed 2/24, and Pre Prep
      // Fri 1/29 -- the Monday-end control, which `end - 3` always got right.
      check(out.closeTokens === '1.26.27 1.22.27 2.23.27 2.24.27 1.29.27', '{key.close} names each last working day');
      delete out.month.hdrText;

      // ---------------- STEP 4: THE MOVERS (plan §8) ----------------
      // Every tool that moves a phase writes its start through setPhaseStart(), so a Dates phase's
      // END moves with it instead of the range stretching. Each tool runs on the fixture as loaded,
      // then ONE undo must put every date back. Expected dates worked by hand from the calendar above
      // (the 2/15/27 hiatus is LOCKED, as a new hiatus row is, so a shift leaves it where it is).
      var dates = function () {
        return {pre: $('start-prePrep').value, s1: $('start-custom1').value, s2: $('start-custom2').value,
                s3: $('start-custom3').value, e3: $('end-custom3').value, s4: $('start-custom4').value,
                d2: $('days-custom2').value, d4: $('days-custom4').value, snap3: $('snap-custom3').checked};
      };
      var base = dates(), same = function () { return JSON.stringify(dates()) === JSON.stringify(base); };
      var undo = async function () { $('undo-btn').click(); await settle(); };
      out.movers = {base: base};

      // Shift All +1 week.
      $('pop-shift-btn').click(); await T.sleep(150);
      T.set('tool-shift-weeks', '1'); $('tool-shift-later').click(); await settle();
      out.movers.shift = dates(); out.movers.shiftHint4 = meta('custom4');
      check(out.movers.shift.s3 === '2027-02-17' && out.movers.shift.e3 === '2027-03-02', 'Shift All +1 wk moves BOTH ends of a Dates phase');
      // Rigging's new start 2/18 sits in the locked hiatus, so its 5 days run Mon 2/22 - Fri 2/26.
      check(out.movers.shift.s4 === '2027-02-18' && out.movers.shiftHint4.indexOf('Mon 2/22/27 \u2192 Fri 2/26/27') !== -1,
            'Shift All moves a Days phase, which walks past the locked hiatus');
      await undo(); check(same(), 'one undo restores every date after Shift All');

      // Anchor To: Stage Build's START to 2/24/27, a whole-calendar shift of 2 weeks.
      $('pop-anchor-btn').click(); await T.sleep(150);
      T.set('tool-anchor-phase', 'custom3'); T.set('tool-anchor-edge', 'start'); T.set('tool-anchor-date', '2027-02-24');
      $('tool-anchor-go').click(); await settle();
      out.movers.anchor = dates();
      check(out.movers.anchor.s3 === '2027-02-24' && out.movers.anchor.e3 === '2027-03-09', 'Anchor To moves BOTH ends of a Dates phase');
      await undo(); check(same(), 'one undo restores every date after Anchor To');

      // Rebuild From FORWARDS from Scout, pinned where it is (Wed 1/13, ends Tue 1/26):
      //   Read-through (Days 6) from Wed 1/27 -> Wed 2/3;  Stage Build (Dates, 13 days) Thu 2/4 -> Wed 2/17;
      //   Rigging hands off on 2/18, inside the hiatus, so chainedStart() steps a week to Thu 2/25.
      $('pop-solve-btn').click(); await T.sleep(150);
      T.set('tool-solve-phase', 'custom1'); T.set('tool-solve-date', '2027-01-13');
      T.rebuildAll(1); await settle();   // the custom phases start unticked: tick them all
      out.movers.fwd = dates(); out.movers.fwdHint2 = meta('custom2');
      check(out.movers.fwd.s2 === '2027-01-27' && out.movers.fwd.s3 === '2027-02-04' && out.movers.fwd.e3 === '2027-02-17'
            && out.movers.fwd.s4 === '2027-02-25', 'Rebuild forwards chains Days and Dates phases, a Dates phase keeping its length');
      await undo(); check(same(), 'one undo restores every date after Rebuild forwards');

      // Rebuild From BACKWARDS from Rigging, pinned to Mon 3/1/27:
      //   Stage Build ends the day before (Sun 2/28), keeping 13 days: Mon 2/15;
      //   Read-through counts 6 working days back from Sun 2/14: Fri 2/5 .. Fri 2/12;
      //   Scout (Weeks, Snap off) 2 weeks back from Fri 2/5: Fri 1/22;
      //   Pre Prep (snapped) 4 working weeks back from 1/18, the 12/21/26 winter hiatus skipped: 12/7/26.
      $('pop-solve-btn').click(); await T.sleep(150);
      T.set('tool-solve-phase', 'custom4'); T.set('tool-solve-date', '2027-03-01');
      T.rebuildAll(-1); await settle();
      out.movers.back = dates(); out.movers.backHint2 = meta('custom2');
      check(out.movers.back.s3 === '2027-02-15' && out.movers.back.e3 === '2027-02-28', 'Rebuild backwards: a Dates phase ends the day before the next, keeping its length');
      check(out.movers.back.s2 === '2027-02-05' && out.movers.backHint2.indexOf('Fri 2/5/27 \u2192 Fri 2/12/27') !== -1,
            'Rebuild backwards: a Days phase ends by the next phase start (checked against the scheduler)');
      check(out.movers.back.s1 === '2027-01-22' && out.movers.back.pre === '2026-12-07' && out.movers.back.s4 === '2027-03-01',
            'Rebuild backwards: the Weeks phases before them, and the pin');
      await undo(); check(same(), 'one undo restores every date after Rebuild backwards');

      // The month-view drag: Stage Build's first pill, two day-columns right. Synthetic events, so
      // this proves the handler (the pill's hit-testing is proven by monthdragundo's reachability).
      await view('month'); await gotoMonth('February 2027');
      var pill = document.querySelector('#table-wrap .mv-pill[data-ph="custom3"]');
      var cell = document.querySelector('#table-wrap .mv-daycell');
      if(pill && cell){
        var pr = pill.getBoundingClientRect(), dayW = cell.getBoundingClientRect().width;
        var x = pr.left + 10, y = pr.top + pr.height / 2;
        pill.dispatchEvent(new MouseEvent('mousedown', {clientX: x, clientY: y, button: 0, buttons: 1, bubbles: true, cancelable: true}));
        window.dispatchEvent(new MouseEvent('mousemove', {clientX: x + dayW * 2, clientY: y, button: 0, buttons: 1, bubbles: true, cancelable: true}));
        window.dispatchEvent(new MouseEvent('mouseup', {clientX: x + dayW * 2, clientY: y, button: 0, buttons: 0, bubbles: true}));
        await settle();
      }
      out.movers.drag = dates();
      check(out.movers.drag.s3 === '2027-02-12' && out.movers.drag.e3 === '2027-02-25', 'the month drag moves BOTH ends of a Dates phase');
      check(out.movers.drag.snap3 === base.snap3, 'the drag leaves a Dates phase\'s hidden Snap to Mon alone');
      await undo(); await view('sheet'); check(same(), 'one undo restores the dragged dates');
    }

    if(!st){
      // ---------------- MINT: save through the real Save path ----------------
      var written = [];
      var h = { name: 'customunits.sptcal', kind: 'file',
        queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
        isSameEntry: async function(o){ return o === h; },
        getFile: async function(){ return new File([written.length ? written[written.length - 1] : ''], 'customunits.sptcal', {lastModified: 1}); },
        createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
      window.showSaveFilePicker = async function(){ return h; };
      $('save-file-btn').click();
      await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
      var snap = JSON.parse(written[0]);
      out.text = written[0];
      var fv = function (id) { var v = snap.fields.byId[id]; return v && typeof v === 'object' ? v.value : v; };
      out.savedIds = ['unit-custom1', 'unit-custom2', 'days-custom2', 'unit-custom3', 'end-custom3', 'weeks-custom3'].map(function (id) { return id + '=' + fv(id); });
      check(fv('unit-custom2') === 'days' && fv('end-custom3') === '2027-02-23' && fv('unit-custom1') === 'weeks', 'the units and dates are in fields.byId');
    }
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
