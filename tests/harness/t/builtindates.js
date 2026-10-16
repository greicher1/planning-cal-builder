// builtindates -- Dates mode on the five built-in Weeks phases (CUSTOM-PHASE-UNITS-PLAN.md §7a, step 6;
// MONTH-VIEW-PLAN rulings 7 and 9d: Weeks or Dates, `unit-<key>` + `end-<key>`, ten ids).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh builtindates 150
//     LIVE + MINT. Builds a synthetic calendar through the UI (made-up 2027 dates, no real show's
//     shape), asserts the rows, "Start after previous phase" on a Dates phase, and then the two
//     paths the STATIC built-in rows make dangerous -- loading an OLDER calendar and pressing New must
//     both put every phase back in Weeks (audit M-5's trap). It saves through the real Save first;
//     out.text is how tests/fixtures/builtindates.sptcal was cut.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=builtindates ./run.sh builtindates 150
//     RESTORE + MOVERS. Loads the fixture and asserts it comes back, then runs every mover on the
//     built-in Dates phases with one undo after each.
//
// THE CALENDAR (Atlanta = US-GEN; one all-phase hiatus, the week of Mon 2/15/27, LOCKED):
//   writersRoom   WEEKS  Mon 1/4/27 x 4 wk       -> the Weeks control
//   prePrep       DATES  Wed 2/10/27 -> Tue 2/23/27 (stays put; the hiatus week drawn blank)
//   prodPrep      WEEKS  Mon 3/1/27 x 4 wk       -> ends Fri 3/26 (exclusive Mon 3/29)
//   post          DATES  Thu 4/1/27 -> Wed 5/12/27
//   production, localization: unscheduled
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {}, fails = [], checks = [], W = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  function val(id){ var e = $(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : null; }
  // The hint line the user SEES: frozen render()'s meta-<key>, or unitmeta-<key> for a Dates phase.
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
  function pills(k){
    return Array.from(document.querySelectorAll('#table-wrap .mv-pill[data-ph="' + k + '"]'))
      .map(function (p) { return p.style.gridColumn.replace(/\s+/g, ''); }).join(' ');
  }
  function sheetRows(){
    var map = {};
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim();
        if(/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(t)){ date = t; return; }
        var m = /^(.*?) [wW]k \d+$/.exec(t);   // Pre Prep's template says "Wk"; the others "wk"
        if(m && date){ (map[m[1]] = map[m[1]] || []).push(date); }
      });
    });
    return map;
  }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization'];
  function units(){ return KEYS.map(function (k) { return val('unit-' + k); }).join(); }
  function ends(){ return KEYS.map(function (k) { return val('end-' + k); }).join(); }
  function dates(){
    return {wr: val('start-writersRoom'), pre: val('start-prePrep'), preEnd: val('end-prePrep'), pp: val('start-prodPrep'),
            post: val('start-post'), postEnd: val('end-post'), preSnap: val('snap-prePrep')};
  }

  try {
    await T.appReady();
    var st = (new URL(location.href)).searchParams.get('state') || '';
    out.run = st ? 'restore' : 'live';

    if(!st){
      // ---------------- LIVE: build it through the UI ----------------
      T.set('union-place', 'us-atlanta');
      T.addHiatus('2027-02-15', 1);
      T.set('start-writersRoom', '2027-01-04'); T.set('weeks-writersRoom', '4');
      T.set('unit-prePrep', 'dates'); T.set('start-prePrep', '2027-02-10'); T.set('end-prePrep', '2027-02-23');
      T.set('start-prodPrep', '2027-03-01'); T.set('weeks-prodPrep', '4');
      T.set('unit-post', 'dates'); T.set('start-post', '2027-04-01'); T.set('end-post', '2027-05-12');
      await settle();
      out.health = T.appHealth();

      check(!$('unit-production') && !$('end-production'), 'Production has no Length select and no End date');
      check(KEYS.every(function (k) { return $('unit-' + k) && $('end-' + k); }), 'all five built-ins have unit-<key> and end-<key>');
      check(!$('unit-prePrep').querySelector('option[value="days"]'), 'a built-in offers Weeks and Dates only (no Days)');
      out.boxes = {
        weeks: [shown($('weeks-writersRoom')), shown($('end-writersRoom')), shown($('snap-writersRoom'))],
        dates: [shown($('weeks-prePrep')), shown($('end-prePrep')), shown($('snap-prePrep'))]
      };
      check(out.boxes.weeks.join() === 'true,false,true', 'a built-in in Weeks shows Weeks and Snap to Mon');
      check(out.boxes.dates.join() === 'false,true,false', 'a built-in in Dates shows only the End date');
      var tb = document.querySelector('.side-tab-btn[data-tab="phases"]'); if(tb) tb.click(); await T.sleep(150);
      var sel = $('unit-prePrep'); sel.scrollIntoView({block: 'center'}); await T.sleep(100);
      var r = sel.getBoundingClientRect();
      out.selectReachable = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).indexOf(sel) !== -1;
      check(out.selectReachable, 'the built-in Length select is hit-testable');

      out.meta = {pre: meta('prePrep'), post: meta('post'), wr: meta('writersRoom')};
      check(out.meta.pre === 'Wed 2/10/27 → Tue 2/23/27 (3 wk)', 'Pre Prep (Dates) hint line');
      check(out.meta.post === 'Thu 4/1/27 → Wed 5/12/27 (7 wk)', 'Post (Dates) hint line');
      out.fallback = [val('weeks-prePrep'), val('weeks-post')];
      check(out.fallback.join() === '3,7', 'weeks-<key> holds the old-build fallback (3, 7)');
      out.sheet = sheetRows();
      check((out.sheet['Pre Prep'] || []).join() === '2/8/27,2/22/27', 'waterfall: Pre Prep on the weeks of 2/8 and 2/22 (2/15 is the hiatus row)');
      await view('month'); await gotoMonth('February 2027');
      out.pillsPre = pills('prePrep');
      check(out.pillsPre === '4/7 2/4', 'month: Pre Prep Wed 10-Fri 12, hiatus week blank, Mon 22-Tue 23');
      await view('sheet');

      // "Start after previous phase" on a Dates built-in: Post follows Prod Prep (Production is
      // unscheduled), which ends Fri 3/26, exclusive Mon 3/29. Post keeps its 41-day length.
      $('autostart-post').click(); await settle();
      out.autostart = {post: val('start-post'), postEnd: val('end-post')};
      check(out.autostart.post === '2027-03-29' && out.autostart.postEnd === '2027-05-09', 'Start after previous phase moves BOTH ends of a Dates built-in');
      $('undo-btn').click(); await settle();
      check(val('start-post') === '2027-04-01' && val('end-post') === '2027-05-12', 'one undo puts Post back');

      // ---------------- MINT: save through the real Save path ----------------
      var h = { name: 'builtindates.sptcal', kind: 'file',
        queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
        isSameEntry: async function(o){ return o === h; },
        getFile: async function(){ return new File([W.length ? W[W.length - 1] : ''], 'builtindates.sptcal', {lastModified: 1}); },
        createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ W.push(parts.join('')); } }; } };
      window.showSaveFilePicker = async function(){ return h; };
      $('save-file-btn').click();
      await T.until(function () { return W.length > 0; }, 'the Save write', 100, 100);
      out.text = W[0];
      var snap = JSON.parse(W[0]);
      var fv = function (id) { var v = snap.fields.byId[id]; return v && typeof v === 'object' ? v.value : v; };
      out.savedIds = KEYS.map(function (k) { return k + ':' + fv('unit-' + k) + '/' + fv('end-' + k); });
      check(fv('unit-prePrep') === 'dates' && fv('end-prePrep') === '2027-02-23' && fv('unit-writersRoom') === 'weeks',
            'the built-in units and end dates are in fields.byId');

      // ---------------- THE M-5 TRAP: an OLDER calendar must open in Weeks ----------------
      // v1.4.3-saved has no unit-/end- ids at all. These rows are static, so without the explicit
      // absent -> Weeks default the previous file's Dates mode would survive into it.
      var p = T.openViaFakePicker('/tests/fixtures/v1.4.3-saved.sptcal', 'v1.4.3-saved.sptcal', {writes: []});
      for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
      await p; await T.sleep(1500);
      out.afterOldLoad = {units: units(), ends: ends(), pre: meta('prePrep')};
      check(out.afterOldLoad.units === 'weeks,weeks,weeks,weeks,weeks' && out.afterOldLoad.ends === ',,,,',
            'loading an older calendar puts every built-in back in Weeks with no end date');
      check(shown($('weeks-prePrep')) && !shown($('end-prePrep')), '...and its Weeks boxes show');

      // ---------------- New ----------------
      T.set('unit-prodPrep', 'dates'); T.set('end-prodPrep', '2027-09-10'); await settle();
      $('new-file-btn').click();
      for(var i = 0; i < 30; i++){ await T.sleep(100); if(/Start a new blank calendar/.test(T.modalText())){ T.clickModalButton('Start new'); break; } }
      await T.sleep(1200);
      out.afterNew = {units: units(), ends: ends()};
      check(out.afterNew.units === 'weeks,weeks,weeks,weeks,weeks' && out.afterNew.ends === ',,,,', 'New puts every built-in back in Weeks with no end date');
    }

    if(st){
      // ---------------- RESTORE ----------------
      await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 3; }, 'the restored grid', 200, 100);
      await T.sleep(1200);
      out.health = T.appHealth();
      out.units = units();
      check(out.units === 'weeks,dates,weeks,dates,weeks', 'units restored');
      check(shown($('end-prePrep')) && !shown($('weeks-prePrep')) && shown($('weeks-prodPrep')), 'the right boxes show after a restore');
      out.meta = {pre: meta('prePrep'), post: meta('post')};
      check(out.meta.pre === 'Wed 2/10/27 → Tue 2/23/27 (3 wk)' && out.meta.post === 'Thu 4/1/27 → Wed 5/12/27 (7 wk)', 'hint lines restored');
      out.sheet = sheetRows();
      check((out.sheet['Post'] || []).join() === '3/29/27,4/5/27,4/12/27,4/19/27,4/26/27,5/3/27,5/10/27', 'waterfall: Post on its seven week rows');

      // ---------------- THE MOVERS, on built-in Dates phases ----------------
      var base = dates(), same = function () { return JSON.stringify(dates()) === JSON.stringify(base); };
      var undo = async function () { $('undo-btn').click(); await settle(); };
      out.movers = {base: base};

      $('pop-shift-btn').click(); await T.sleep(150);
      T.set('tool-shift-weeks', '1'); $('tool-shift-later').click(); await settle();
      out.movers.shift = dates();
      check(out.movers.shift.pre === '2027-02-17' && out.movers.shift.preEnd === '2027-03-02'
            && out.movers.shift.post === '2027-04-08' && out.movers.shift.postEnd === '2027-05-19', 'Shift All +1 wk moves BOTH ends of each built-in Dates phase');
      await undo(); check(same(), 'one undo restores every date after Shift All');

      $('pop-anchor-btn').click(); await T.sleep(150);
      T.set('tool-anchor-phase', 'post'); T.set('tool-anchor-edge', 'start'); T.set('tool-anchor-date', '2027-04-15');
      $('tool-anchor-go').click(); await settle();
      out.movers.anchor = dates();
      check(out.movers.anchor.post === '2027-04-15' && out.movers.anchor.postEnd === '2027-05-26', 'Anchor To moves BOTH ends of a built-in Dates phase');
      await undo(); check(same(), 'one undo restores every date after Anchor To');

      // Rebuild BACKWARDS from Prod Prep pinned to Mon 3/1: Pre Prep (Dates, 13 days) ends Sun 2/28,
      // so Mon 2/15 -> Sun 2/28; Writer's Room (snapped, 4 wk) ends by Mon 2/15 -> starts Mon 1/18.
      $('pop-solve-btn').click(); await T.sleep(150);
      T.set('tool-solve-phase', 'prodPrep'); T.set('tool-solve-date', '2027-03-01');
      $('tool-solve-back').click(); await settle();
      out.movers.back = dates();
      check(out.movers.back.pre === '2027-02-15' && out.movers.back.preEnd === '2027-02-28' && out.movers.back.wr === '2027-01-18',
            'Rebuild backwards: a built-in Dates phase ends the day before the next, keeping its length');
      await undo(); check(same(), 'one undo restores every date after Rebuild backwards');

      // Rebuild FORWARDS from Prod Prep: Production has no span (skipped), so Post (Dates, 41 days)
      // follows Prod Prep's exclusive end Mon 3/29 -> Mon 3/29 to Sun 5/9.
      $('pop-solve-btn').click(); await T.sleep(150);
      T.set('tool-solve-phase', 'prodPrep'); T.set('tool-solve-date', '2027-03-01');
      $('tool-solve-fwd').click(); await settle();
      out.movers.fwd = dates();
      check(out.movers.fwd.post === '2027-03-29' && out.movers.fwd.postEnd === '2027-05-09', 'Rebuild forwards chains a built-in Dates phase, keeping its length');
      await undo(); check(same(), 'one undo restores every date after Rebuild forwards');

      // The month-view drag: Pre Prep's first pill two day-columns right (synthetic events: this proves
      // the handler; pill hit-testing is monthdragundo's).
      await view('month'); await gotoMonth('February 2027');
      var pill = document.querySelector('#table-wrap .mv-pill[data-ph="prePrep"]');
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
      check(out.movers.drag.pre === '2027-02-12' && out.movers.drag.preEnd === '2027-02-25', 'the month drag moves BOTH ends of a built-in Dates phase');
      check(out.movers.drag.preSnap === base.preSnap, 'the drag leaves a Dates phase\'s hidden Snap to Mon alone');
      await undo(); await view('sheet'); check(same(), 'one undo restores the dragged dates');
    }
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
