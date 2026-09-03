// wrapdate -- both ends of the header's Principal Photography line must be REAL SHOOT DAYS.
//
// ⚠️ THE FIRST VERSION OF THIS PROBE WAS WRONG AND THE APP WAS RIGHT, which is worth recording:
// it hardcoded a holiday list (wrongly including Veterans Day, which is US-NY only, not US-GEN)
// and it ignored the FOUR default winter hiatuses the app ships with (DEFAULT_HIATUSES: 12/21/26,
// 12/20/27, 12/18/28, 12/24/29, two weeks each). Both errors made the expected wrap land early, and
// the app's correct answer looked like a bug. So this version reads BOTH from the app's own state:
// holidays from the Settings list (name · date, with its Enable box), hiatuses from the sidebar rows.
//
// The header's r2 line is `Principal Photography <startDate> / Wrap: <lastShootDay>`, both from
// schedule.productionInfo. lastShootDay comes from simulateProductionSchedule(), which walks day by
// day from the phase's MONDAY, skipping weekends, hiatus days and ENABLED holidays, until the
// requested shoot-day count is met.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  try {
    await T.until(function () { return !!document.getElementById('start-production'); }, 'the sidebar', 100, 100);

    // The app's own enabled-holiday dates, read from the Settings list: "<name> · <M/D/YY>".
    function appHolidays() {
      var out = [];
      document.querySelectorAll('#holiday-vis-list .hv-row, #holiday-vis-list > *').forEach(function (row) {
        var en = row.querySelector('input.hv-en');
        if (en && !en.checked) return;                     // switched off = an ordinary working day
        var m = (row.textContent || '').match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2})\b/);
        if (!m) return;
        out.push('20' + m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0'));
      });
      return out;
    }
    // The app's own hiatus rows, defaults included.
    function appHiatuses() {
      var out = [];
      document.querySelectorAll('#hiatus-list .hiatus-entry').forEach(function (row) {
        var s = (row.querySelector('.hiatus-start') || {}).value;
        var w = parseInt((row.querySelector('.hiatus-weeks') || {}).value, 10);
        if (!s || !(w > 0)) return;
        var d = new Date(s + 'T00:00:00Z');
        var back = (d.getUTCDay() + 6) % 7;                // hiatuses are Monday-snapped
        var mon = new Date(d.getTime() - back * 86400000);
        out.push({ start: mon.toISOString().slice(0, 10),
                   end: new Date(mon.getTime() + w * 7 * 86400000).toISOString().slice(0, 10) });
      });
      return out;
    }
    function walk(startIso, days, hol, hiatuses) {
      var cur = new Date(startIso + 'T00:00:00Z'), count = 0, last = null, guard = 0, first = null;
      while (count < days && guard++ < 5000) {
        var dow = cur.getUTCDay(), iso = cur.toISOString().slice(0, 10);
        var inHi = hiatuses.some(function (h) { return iso >= h.start && iso < h.end; });
        if (dow >= 1 && dow <= 5 && !inHi && hol.indexOf(iso) < 0) {
          count++; last = iso; if (!first) first = iso;
        }
        cur = new Date(cur.getTime() + 86400000);
      }
      return { last: last, first: first };
    }
    var mondayOf = function (iso) {
      var d = new Date(iso + 'T00:00:00Z');
      return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
    };
    var toIso = function (s) {
      var m = String(s).match(/(\d+)\.(\d+)\.(\d+)/);
      return m ? '20' + m[3].padStart(2, '0') + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : null;
    };

    async function scenario(name, opts) {
      T.set('show-title', 'Wrap Probe');
      T.set('union-country', 'US'); T.set('union-usregion', 'US-GEN');
      T.set('num-episodes', ''); T.set('shoot-days-per-ep', '');
      T.set('start-production', opts.start);
      T.set('weeks-production', String(opts.days));
      // Per-phase production hiatus, for the scenario that exercises it.
      var en = document.getElementById('phiatus-en-production');
      if (en) { if (en.checked !== !!opts.phiatus) { en.click(); } }
      if (opts.phiatus) {
        T.set('phiatus-start-production', opts.phiatus.start);
        T.set('phiatus-weeks-production', String(opts.phiatus.weeks));
      }
      await T.sleep(700);

      var r2 = '';
      document.querySelectorAll('#table-wrap .hdr-line').forEach(function (el) {
        if (/Principal Photography/.test(el.textContent)) r2 = el.textContent.trim();
      });
      var prodWeeks = Array.prototype.filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.pkey === 'production'; })
        .map(function (td) { return td.dataset.week; }).sort();

      var hol = appHolidays(), his = appHiatuses();
      if (opts.phiatus) {
        var pd = new Date(mondayOf(opts.phiatus.start) + 'T00:00:00Z');
        his = his.concat([{ start: mondayOf(opts.phiatus.start),
          end: new Date(pd.getTime() + opts.phiatus.weeks * 7 * 86400000).toISOString().slice(0, 10) }]);
      }
      var exp = walk(mondayOf(opts.start), opts.days, hol, his);
      var m = r2.match(/Principal Photography ([\d.]+) \/ Wrap: ([\d.]+)/) || [];
      var appStart = toIso(m[1] || ''), appWrap = toIso(m[2] || '');

      out.cases.push({
        name: name, entered: opts.start, days: opts.days,
        header: r2,
        appWrap: appWrap, expectedWrap: exp.last,
        WRAP_OK: appWrap === exp.last,
        appStartLine: appStart,
        firstRealShootDay: exp.first,
        // ⭐ Does the header's "Principal Photography <date>" name a day production actually shoots?
        START_OK: appStart === exp.first,
        firstProdWeekInGrid: prodWeeks[0] || null,
        hiatusesSeen: his.length, holidaysSeen: hol.length
      });
    }

    await scenario('A: Monday start, 40 days', { start: '2026-11-02', days: 40 });
    await scenario('B: Wednesday start (snapped to Monday)', { start: '2026-11-04', days: 40 });
    await scenario('C: start INSIDE the default 12/21 hiatus', { start: '2026-12-21', days: 20 });
    await scenario('D: start ON a holiday Monday (Memorial Day 5/31/27)', { start: '2027-05-31', days: 15 });
    await scenario('E: per-phase Production hiatus mid-shoot', {
      start: '2027-02-01', days: 30, phiatus: { start: '2027-03-01', weeks: 2 } });

    out.errors = (window.__ERR || []).slice(0, 6);
    out.allWrapOk = out.cases.every(function (c) { return c.WRAP_OK; });
    out.allStartOk = out.cases.every(function (c) { return c.START_OK; });
    // The two cases that were WRONG before the 3 Sep 2026 fix, named so a regression is legible
    // rather than just a count: a start inside a hiatus was out by two weeks, a start on a holiday
    // Monday by a day.
    var byName = {}; out.cases.forEach(function (c) { byName[c.name.charAt(0)] = c; });
    out.hiatusStartCase = byName.C && byName.C.appStartLine;
    out.holidayStartCase = byName.D && byName.D.appStartLine;
    out.PASS = out.allWrapOk && out.allStartOk && out.cases.length === 5 &&
               out.hiatusStartCase === '2027-01-04' && out.holidayStartCase === '2027-06-01' &&
               out.errors.length === 0;
  } catch (e) { out.EX = e && (e.message || String(e)); }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
