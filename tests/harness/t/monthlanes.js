// monthlanes -- batch 3, step 3.6 (FIX-PLAN §5; audit L-16 + L-17): renderMonthView's lane search
// and its month cursor, proven through the real UI. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=month-lanecap ./run.sh monthlanes 150
//
// L-16  takeLane() searched lanes 0-59 only and, finding none free, returned lane 0 -- so on a day
//       carrying more than 60 lanes of notes, every further note was drawn ON TOP of the first
//       ones. month-lanecap.sptcal holds 25 day notes on Wed 8/12/26. The fix loops until a lane
//       is free. Proof: in August 2026 no two bars share a lane AND a day column, and 8/12's notes
//       run past lane 60 instead of folding back onto lane 0.
// L-17  when the month range shrank below the month on screen, the view jumped to the FIRST
//       month. It now clamps to the NEAREST month in range.
//       ⭐ Owner ruling, 29 Sep 2026: a DIFFERENT calendar arriving (Load) still opens on its FIRST
//       month when the month on screen is outside it, and keeps the month on screen when it is
//       inside it -- both exactly as before. Those two cases are regression guards: green before
//       the fix AND after it. A bare nearest-month clamp would open the first one on its LAST month.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'monthlanes', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthShown() {
    var b = document.querySelector('#table-wrap .mv-monthbar');
    var m = b ? (b.textContent || '').match(/([A-Z][a-z]+) (\d{4})/) : null;
    return m ? m[1] + ' ' + m[2] : '';
  }
  function monthIdx(s) { var p = String(s).split(' '); return Number(p[1]) * 12 + MONTHS.indexOf(p[0]); }
  function navState() {
    var p = document.getElementById('mv-prev'), n = document.getElementById('mv-next');
    return { month: monthShown(), atFirst: !!(p && p.disabled), atLast: !!(n && n.disabled) };
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  async function step(id) {
    var before = monthShown(), b = document.getElementById(id);
    if (!b || b.disabled) return false;
    b.click();
    await T.until(function () { return monthShown() && monthShown() !== before; }, 'the month to change', 100, 50);
    return true;
  }
  async function goTo(label) {
    for (var i = 0; i < 80 && monthShown() !== label; i++) {
      if (!(await step(monthIdx(monthShown()) < monthIdx(label) ? 'mv-next' : 'mv-prev'))) break;
    }
    return monthShown() === label;
  }
  async function goLast() { for (var i = 0; i < 80; i++) { if (!(await step('mv-next'))) break; } return monthShown(); }
  async function monthView() {
    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the month grid', 200, 100);
    await settle('the month grid to settle');
  }
  // Load through the real File > Load path. The unsaved-work guard ("Load another calendar?") comes
  // BEFORE the picker, so answer it while openViaFakePicker waits for the picker to be reached.
  async function loadFixture(name) {
    var finished = false, err = null;
    var p = T.openViaFakePicker('/tests/fixtures/' + name, name)
      .then(function () { finished = true; }, function (e) { err = e; finished = true; });
    for (var i = 0; i < 100 && !finished; i++) { T.clickModalButton('Load'); await T.sleep(100); }
    await p;
    if (err) throw err;
    await T.until(function () { return (document.getElementById('show-title') || {}).value !== undefined; }, 'the load', 50, 100);
    await settle('the loaded calendar to settle');
  }
  // Every bar of every week row of the month on screen, as lane x column boxes. The "+" add
  // affordances and the row-expand control are left out, exactly as exportMonthPdf leaves them out.
  function barBoxes() {
    return Array.from(document.querySelectorAll('#table-wrap .mv-week')).map(function (wk) {
      return Array.from(wk.querySelectorAll('.mv-bar:not(.mv-note-add):not(.mv-row-expand)')).map(function (b) {
        var gc = String(b.style.gridColumn || '').match(/(\d+)\s*\/\s*(\d+)/);
        var gr = String(b.style.gridRow || '').match(/^\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/);
        if (!gc || !gr) return null;
        return { c0: +gc[1], c1: +gc[2], r0: +gr[1], r1: +gr[1] + (+(gr[2] || 1)),
                 day: b.getAttribute('data-note-day') || '', kind: b.getAttribute('data-note-kind') || '' };
      }).filter(Boolean);
    });
  }
  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'the restored month view', 200, 100);
    await settle('the restored calendar to settle');
    out.firstMonth = monthShown();

    // ---- L-16: August 2026, 25 notes on Wed 8/12 -------------------------------------------------
    var reached = await goTo('August 2026');
    var weeks = barBoxes(), overlaps = [], aug12 = [];
    weeks.forEach(function (bars, wi) {
      for (var i = 0; i < bars.length; i++) {
        if (bars[i].day === '2026-08-12' && bars[i].kind === 'day') aug12.push(bars[i]);
        for (var j = i + 1; j < bars.length; j++) {
          var a = bars[i], b = bars[j];
          if (a.r0 < b.r1 && b.r0 < a.r1 && a.c0 < b.c1 && b.c0 < a.c1) overlaps.push({ week: wi, a: a, b: b });
        }
      }
    });
    var maxRow = aug12.reduce(function (m, b) { return Math.max(m, b.r1 - 1); }, 0);
    // ⚠️ "Past lane 60" alone proves nothing: a 3-lane note taken at lane 58 already ends on row 61
    // under the cap (measured on the unfixed build). The symptom is the notes that did NOT fit being
    // folded onto lane 0, on top of each other -- so the test is that 8/12's notes are pairwise
    // disjoint, and only then that the last one ends past the old cap.
    var aug12Clash = 0;
    for (var i = 0; i < aug12.length; i++) for (var j = i + 1; j < aug12.length; j++) {
      if (aug12[i].r0 < aug12[j].r1 && aug12[j].r0 < aug12[i].r1) aug12Clash++;
    }
    kase('L16a', 'August 2026: no two bars share a lane AND a day column (every note has its own space)',
         reached && overlaps.length === 0, { reached: reached, overlaps: overlaps.length, sample: overlaps.slice(0, 3) });
    kase('L16b', "8/12/26's 25 day notes all render, each in lanes of its own, running past the old 60-lane cap",
         aug12.length === 25 && aug12Clash === 0 && maxRow > 60, { notes: aug12.length, clashes: aug12Clash, lastLane: maxRow });

    // ---- L-17: a range that shrinks in-session clamps to the NEAREST month -----------------------
    var lastBefore = await goLast();
    var shrinkFrom = (document.getElementById('weeks-localization') || {}).value;
    T.set('weeks-localization', '1');
    await T.until(function () { return monthShown() !== lastBefore; }, 'the month view to react to the shrink', 100, 100);
    await settle('the shrunk calendar to settle');
    var afterShrink = navState();
    kase('L17a', 'a shrink below the month on screen shows the NEAREST month (the new last one), not the first',
         monthIdx(afterShrink.month) < monthIdx(lastBefore) && afterShrink.atLast && !afterShrink.atFirst &&
         afterShrink.month !== out.firstMonth,
         { lastBefore: lastBefore, localizationWeeks: shrinkFrom + ' -> 1', shown: afterShrink });

    // ---- L-17 guards: a LOADED calendar opens where it always did ---------------------------------
    // hiatus-blank ends before the month on screen, so it must open on its FIRST month. Walk to the
    // last month first: on the unfixed build L17a leaves the view on the FIRST month, which would
    // sit inside hiatus-blank's range and make this guard fail for the wrong reason.
    var fromMonth = await goLast();
    await loadFixture('hiatus-blank.sptcal');
    await monthView();
    var loadedEarly = navState();
    kase('L17b', 'Load: a calendar that ends before the month on screen opens on its FIRST month (as before)',
         loadedEarly.atFirst && monthIdx(loadedEarly.month) < monthIdx(fromMonth),
         { from: fromMonth, shown: loadedEarly });
    // Then a calendar that CONTAINS the month on screen must keep it.
    var mid = 'June 2026';
    var reachedMid = await goTo(mid);
    await loadFixture('month-dense60.sptcal');
    await monthView();
    var loadedIn = navState();
    kase('L17c', 'Load: a calendar that contains the month on screen keeps that month (as before)',
         reachedMid && loadedIn.month === mid, { from: mid, shown: loadedIn });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'monthlanes threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
