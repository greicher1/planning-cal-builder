// textfit -- audit item 3.1 (AUD2-043 to AUD2-046; the owner's decision D4 = a, 14 Nov 2026): text printed too small or
// cut off, and a typed line thrown away. One group per finding, picked by HARNESS_QUERY g=<group>:
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=textfit-shared HARNESS_QUERY=g=small ./run.sh textfit 300
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=textfit-dense  HARNESS_QUERY="g=date&notesize=12" ./run.sh textfit 300
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=textfit-dense  HARNESS_QUERY="g=date&notesize=14" ./run.sh textfit 300
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=textfit-shared HARNESS_QUERY=g=lines ./run.sh textfit 120
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=textfit-heavy  HARNESS_QUERY=g=wf    ./run.sh textfit 60
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=textfit-dense  HARNESS_QUERY="g=screen&notesize=14" ./run.sh textfit 300
//   HARNESS_PAGE=/dist/index.html                              HARNESS_QUERY=g=tick  ./run.sh textfit 120
//
// The three fixtures are the audit's own synthetic calendars (repro/audit-shared-month, audit-m1-dense2, audit-a3-heavy),
// copied in as textfit-shared, textfit-dense and textfit-heavy.
//
// g=small  (AUD2-043) The month PDF fits every month on one sheet with no floor (owner, 1 Oct 2026), so a dense month
//          prints at 3 to 4 pt. Export now says so first, naming each month whose notes and bars print below 6 pt.
//   S1  Export PDF (all months) stops on the notice before any Save dialog: it names exactly the months whose pages print
//       their 10 px text below 6 pt (read back off the file S3 writes: 7.5 pt x the page's shrink, the shrink taken from
//       its day numbers, 8.25 pt x it), each with a size no larger than that (the smallest such text: this calendar
//       styles some notes at 9 px, which print smaller still)
//   S2  Cancel writes nothing and asks for no file
//   S3  Export anyway writes the month PDF, one page per month
//   S4  a calendar whose months all fit says nothing: the same calendar with July and August thinned (every day note
//       removed) exports straight to the Save dialog
// g=date   (AUD2-045) At note sizes 11 to 14 a note shows two lines, the second cut with "…" (ruling R2), and a holiday's
//          or automatic note's date was what the cut took ("Day After / Thanksgiving…", no 11/27/26).
//   D1  every waterfall line the month view shows that ends in a date prints that date on its month's page
//   D2  a typed day note is still cut at two lines with "…" (R2 unchanged): the file has at least one "…"
// g=lines  (AUD2-046) A fourth line pasted into a month day note was sliced off without a word.
//   L1  four pasted lines: the box keeps three, the fourth joined to the third with a space
//   L2  saved (Tab): the day's note on the calendar is those three lines
//   L3  three lines pasted are kept exactly
// g=screen (AUD2-045 on screen, FROZEN edit D1, proposed, not applied: red on the branch until it lands) run with
//          HARNESS_QUERY="g=screen&notesize=14" (and at 12 with HARNESS_WINDOW=1100,800)
//   V1  every waterfall line ending in a date shows it whole in the month view
// g=wf     (AUD2-044, FROZEN edit R4, proposed, not applied: red on the branch until it lands)
//   W1  the waterfall's Notes cells holding two holiday lines (Thanksgiving week, both years) show both lines whole
// g=tick   (R4 went stale, owner's picker 16 Nov 2026: "Fix it, update refs") R4's row height was remembered against the
//          schedule object, and a holiday's Waterfall box re-renders that SAME schedule, so ticking Thanksgiving and the
//          Day After on left their row at 20 px until the next edit made a new schedule: the screen, Excel and the
//          waterfall PDF then depended on the order things were done in. buildFixture (no state), both boxes ticked
//          through the Holidays list, nothing else touched:
//   K1  the Thanksgiving week's row is 23 px on screen at once (declared and measured), both lines whole; the week
//       before it is still 20 (declared: an EMPTY Notes cell's "+" measures 20.84, as it always has)
//   K2  the workbook exported at once gives that row 17.25 pt (23 px x 0.75) and the rows either side 15
//   K3  the waterfall PDF exported at once: the two date gaps around that week sum to 43 rows' worth of 20 px rows' 40
//       (23 + 20 px, by the gaps of two plain rows above it), whatever the page's fit scale
//   K4  that PDF is byte for byte the one exported after a fresh schedule (month view and back), so the order is moot
//   K5  both boxes ticked off again: the row is 20 px at once
// The two frozen edits are "SPTCal Audit 2026-11/work/overnight/3.1-frozen.patch"; V1 and W1 are their acceptance checks.
// E0 no console errors, no native alert (every group)
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  var G = (/[?&]g=(\w+)/.exec(location.search) || [])[1] || 'small';
  out.group = G;
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
  }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function month() { return txt(q('#table-wrap .mv-monthyear')); }
  async function toMonthView() {
    if (!q('#table-wrap .mv-monthyear')) byId('view-month-btn').click();
    await T.until(function () { return !!q('#table-wrap .mv-monthyear'); }, 'the month view', 100, 100);
  }
  async function step(id) {
    var m = month(); byId(id).click();
    try { await T.until(function () { return month() !== m; }, 'month change', 20, 50); return true; } catch (e) { return false; }
  }
  async function goMonth(label) {
    for (var i = 0; i < 60 && month() !== label; i++) {
      var go = new Date(month() + ' 1') < new Date(label + ' 1') ? 'mv-next' : 'mv-prev';
      if (!(await step(go))) break;
    }
    return month() === label;
  }
  // The month PDF through the toolbar's Export (the month dialog answered at All by t/lib.js), with the Save dialog faked.
  // `answer` is the label clicked on a notice of ours, if one comes ('' = none expected, any notice is left up).
  async function exportMonth(answer) {
    var rec = T.fakeSavePicker(), seen = '';
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }) || !!T.modalText(); }, 'the PDF or a notice', 600, 100);
      seen = T.modalText();
      if (seen && answer) {
        T.clickModalButton(answer);
        if (answer !== 'Cancel') await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 600, 100);
        else await T.sleep(800);
      }
    } finally { rec.restore(); }
    var f = rec.files.filter(function (x) { return x.closed; })[0] || null;
    return {notice: seen, calls: rec.calls.length, file: f, modalAfter: T.modalText()};
  }
  var MONTHS = 'January February March April May June July August September October November December'.split(' ');
  // Each page's runs, read from the inflated streams: [{label, runs: [{size, s}]}].
  async function pages(u8) {
    var out2 = [];
    (await T.pdfInflated(u8)).forEach(function (t) {
      if (t.indexOf(' Tf ') < 0) return;
      var re = /BT \/F\d+ ([\d.]+) Tf [^(]*\(((?:\\.|[^\\)])*)\) Tj ET/g, x, runs = [];
      while ((x = re.exec(t))) runs.push({size: parseFloat(x[1]), s: x[2].replace(/\\([0-7]{1,3})|\\(.)/g, function (m, o, c) { return o ? String.fromCharCode(parseInt(o, 8)) : c; })});
      if (!runs.length) return;
      var lab = runs.filter(function (r) { return new RegExp('^(' + MONTHS.join('|') + ') \\d{4}$').test(r.s); })[0];
      out2.push({label: lab ? lab.s : '?', runs: runs});
    });
    return out2;
  }
  // A page's shrink, from its day numbers (11 px = 8.25 pt at full size), and what its 10 px text prints at.
  function pageScale(p) {
    var nums = p.runs.filter(function (r) { return /^\d{1,2}$/.test(r.s) && r.size <= 8.25 + 1e-6; });
    var k = nums.length ? Math.min.apply(null, nums.map(function (r) { return r.size; })) / 8.25 : 1;
    return {k: k, bodyPt: 7.5 * k};
  }
  try {
    await T.appReady();
    out.noteSize = await T.applyNoteSizeQuery();

    if (G === 'small') {
      await toMonthView();
      var e1 = await exportMonth('');
      out.s1 = {notice: e1.notice, calls: e1.calls, wrote: !!e1.file};
      // S2: Cancel
      var cancelled = e1.notice ? T.clickModalButton('Cancel') : false;
      await T.sleep(800);
      var afterCancel = {modal: T.modalText(), calls: e1.calls};
      add('S2', 'Cancel on the notice writes nothing and asks for no file', !!e1.notice && cancelled && !afterCancel.modal && e1.calls === 0 && !e1.file,
          {notice: !!e1.notice, cancelled: cancelled, after: afterCancel, wrote: !!e1.file}, 'the notice; no Save dialog; no file');
      // S3: Export anyway
      var e3 = await exportMonth('Export anyway');
      var f = e3.file || e1.file;
      var pg = f ? await pages(f.bytes) : [];
      if (f) out.pdfs = {month: T.b64(f.bytes.buffer)};
      out.pages = pg.map(function (p) { var s = pageScale(p); return {label: p.label, k: Math.round(s.k * 1000) / 1000, bodyPt: Math.round(s.bodyPt * 100) / 100}; });
      add('S3', 'Export anyway writes the month PDF, a page per month', !!f && pg.length > 1 && pg.length === T.pdfPages(f.bytes),
          {wrote: !!f, pages: pg.length, notice: e3.notice}, 'a PDF');
      var want = out.pages.filter(function (p) { return p.bodyPt < 6 - 1e-6; });
      var named = (e1.notice.match(/• ([A-Z][a-z]+ \d{4}): ([\d.]+) pt/g) || []).map(function (l) { var m = /• (.+): ([\d.]+) pt/.exec(l); return {label: m[1], pt: parseFloat(m[2])}; });
      var sameMonths = named.length === want.length && want.every(function (w, i) { return named[i] && named[i].label === w.label && named[i].pt > 0 && named[i].pt <= Math.floor(w.bodyPt * 10) / 10 + 1e-9; });
      add('S1', 'Export stops on a notice before any Save dialog, naming exactly the months that print their notes and bars below 6 pt, with that size',
          !!e1.notice && /prints? very small/.test(e1.notice) && e1.calls === 0 && want.length > 0 && sameMonths,
          {notice: e1.notice.slice(0, 400), named: named, small: want, saveDialogs: e1.calls}, 'a notice naming ' + JSON.stringify(want.map(function (w) { return w.label; })));
      // S4: thin the small months (delete every month day note in them) and export again: no notice.
      var smallIsos = {};
      want.forEach(function (w) { var d = new Date(w.label + ' 1'); smallIsos[d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)] = true; });
      var removed = 0;
      for (var mi = 0; mi < want.length; mi++) {
        if (!(await goMonth(want[mi].label))) continue;
        for (var guard = 0; guard < 400; guard++) {
          var b = qa('#table-wrap .mv-note-block[data-note-kind="day"]').filter(function (x) { return smallIsos[(x.getAttribute('data-note-day') || '').slice(0, 7)]; })[0];
          if (!b) break;
          // Through the note editor's own Delete, as a user deletes one.
          b.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true}));
          try { await T.until(function () { return !!byId('mv-note-pop'); }, 'the note editor', 30, 50); } catch (e) { break; }
          var del = qa('#mv-note-pop button').filter(function (x) { return /Delete/.test(x.textContent); })[0];
          if (!del) break;
          del.click(); removed++;
          await T.until(function () { return !byId('mv-note-pop'); }, 'the editor closed', 30, 50).catch(function () {});
          await T.sleep(60);
        }
      }
      var e4 = await exportMonth('Export anyway');
      var pg4 = e4.file ? await pages(e4.file.bytes) : [];
      var small4 = pg4.map(function (p) { return {label: p.label, bodyPt: pageScale(p).bodyPt}; }).filter(function (p) { return p.bodyPt < 6 - 1e-6; });
      add('S4', 'with those months thinned so every month prints at 6 pt or more, Export goes straight to the Save dialog',
          removed > 0 && !e4.notice && e4.calls === 1 && !!e4.file && small4.length === 0,
          {removed: removed, notice: e4.notice.slice(0, 200), calls: e4.calls, small: small4}, 'no notice; one Save dialog');
    }

    if (G === 'date') {
      await toMonthView();
      // Every waterfall line ending in a date, month by month, as the month view shows them.
      var guard2 = 0; while (guard2++ < 60 && await step('mv-prev')) {}
      var dated = {}; guard2 = 0;
      do {
        var lab = month();
        qa('#table-wrap .mv-note-block[data-note-kind="wf"]').forEach(function (b) {
          var t = (b.textContent || '').trim(), m = /\s(\d{1,2}\/\d{1,2}\/\d{2,4})$/.exec(t);
          if (m && (b.getAttribute('data-note-day') || '').slice(0, 7) === new Date(Date.UTC(+lab.slice(-4), MONTHS.indexOf(lab.split(' ')[0]), 1)).toISOString().slice(0, 7))
            (dated[lab] = dated[lab] || []).push({t: t, date: m[1]});
        });
      } while (guard2++ < 60 && await step('mv-next'));
      var e5 = await exportMonth('Export anyway');
      var pg5 = e5.file ? await pages(e5.file.bytes) : [];
      var missing = [], checked = 0, ells = 0;
      pg5.forEach(function (p) {
        var all = p.runs.map(function (r) { return r.s; }).join(' ');
        ells += p.runs.filter(function (r) { return r.s === '…' || r.s === '\\205' || r.s === '\x85'; }).length;
        (dated[p.label] || []).forEach(function (d) { checked++; if (all.indexOf(d.date) < 0) missing.push(p.label + ': ' + d.t); });
      });
      out.dated = dated;
      add('D1', 'every waterfall line ending in a date prints its date on its month\'s page (note size ' + (out.noteSize || '10') + ')',
          !!e5.file && checked > 0 && missing.length === 0, {checked: checked, missing: missing.slice(0, 12), pages: pg5.length}, 'no date missing');
      add('D2', 'a typed note is still cut at two lines with "…" above 10 px (R2 unchanged)', !out.noteSize || ells > 0, {ellipses: ells}, 'at least one');
    }

    if (G === 'lines') {
      await toMonthView();
      await goMonth('July 2026');
      async function addNote(iso, text) {
        q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]').click();
        await T.until(function () { return !!byId('mv-note-pop'); }, 'the note editor', 30, 50);
        var ta = q('#mv-note-pop textarea');
        ta.focus(); ta.value = text; ta.setSelectionRange(text.length, text.length);
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        var boxed = ta.value;
        ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
        await T.until(function () { return !byId('mv-note-pop'); }, 'the editor closed', 40, 100).catch(function () {});
        await T.sleep(300);
        var shown = qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"][data-note-kind="day"]').map(function (b) { return b.textContent; });
        return {boxed: boxed, shown: shown};
      }
      var r4 = await addNote('2026-07-22', 'Call times:\nCast 6:00a\nCrew 7:00a\nBG 8:30a');
      // ⚠️ Tue 7/14, not Tue 7/28 as until 17 Nov 2026: on this fixture 7/28 already reaches 10 lines at full size, and a
      // day that full takes no new note from its "+" (MONTH-ROW-LIMIT-PLAN.md), so the editor never opened and this leg
      // threw. What is tested here (three lines kept exactly) does not depend on the day.
      var r3 = await addNote('2026-07-14', 'Unit move\nLunch at basecamp\nWrap by 7p');
      out.r4 = r4; out.r3 = r3;
      var want4 = 'Call times:\nCast 6:00a\nCrew 7:00a BG 8:30a';
      add('L1', 'four lines pasted into a day note: the box keeps three, the fourth joined to the third', r4.boxed === want4, r4.boxed, want4);
      add('L2', 'saved, the day shows those three lines', r4.shown.indexOf(want4) >= 0, r4.shown, want4);
      add('L3', 'three lines are kept exactly', r3.boxed === 'Unit move\nLunch at basecamp\nWrap by 7p' && r3.shown.indexOf(r3.boxed) >= 0, r3, 'unchanged');
    }

    if (G === 'screen') {
      // (AUD2-045, FROZEN edit D1, proposed) On screen at a note size: every waterfall line ending in a date shows its
      // date, i.e. no line box of it lies below the bottom of its block. Run narrow (HARNESS_WINDOW) so lines wrap.
      await toMonthView();
      var g3 = 0; while (g3++ < 60 && await step('mv-prev')) {}
      var seen3 = 0, cut3 = []; g3 = 0;
      do {
        qa('#table-wrap .mv-note-block[data-note-kind="wf"]').forEach(function (b) {
          var t = (b.textContent || '').trim();
          if (!/\s\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) return;
          seen3++;
          var r = b.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(b);
          var last = 0; Array.prototype.forEach.call(rg.getClientRects(), function (x) { if (x.height) last = Math.max(last, x.bottom); });
          if (last > r.bottom + 0.5) cut3.push(month() + ': ' + t + ' [' + Math.round(last - r.bottom) + ' px hidden]');
        });
      } while (g3++ < 60 && await step('mv-next'));
      out.screenCut = cut3;
      add('V1', 'on screen at note size ' + (out.noteSize || '10') + ', every waterfall line ending in a date shows it whole (FROZEN edit D1, proposed)',
          seen3 > 0 && cut3.length === 0, {lines: seen3, cut: cut3.slice(0, 10), window: [window.innerWidth, window.innerHeight]}, 'none cut');
    }

    if (G === 'wf') {
      await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 0; }, 'the waterfall', 200, 100);
      await T.sleep(800);
      var cells = qa('#table-wrap td.sheet-note-cell.has-note').filter(function (td) {
        return /Thanksgiving \d+\/\d+\/\d+\nDay After Thanksgiving/.test(td.textContent);
      }).map(function (td) {
        var b = td.querySelector('.cell-body') || td;
        return {wk: td.dataset.week, t: td.textContent.trim(), fs: getComputedStyle(b).fontSize, sh: b.scrollHeight, ch: b.clientHeight,
                rowH: Math.round(td.closest('tr').getBoundingClientRect().height * 100) / 100};
      });
      out.cells = cells; out.clipped = T.clippedCells();
      add('W1', 'the Notes cells holding two holiday lines show both whole (FROZEN edit, proposed)',
          cells.length >= 2 && cells.every(function (c) { return c.sh <= c.ch + 1; }), cells, 'scrollHeight <= clientHeight');
    }

    if (G === 'tick') {
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      T.buildFixture();
      await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 0; }, 'the waterfall', 200, 100);
      await T.sleep(1200);
      var TG = '2026-11-23';
      var rowOf = function (wk) {
        var td = q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]');
        if (!td) return null;
        var b = td.querySelector('.cell-body') || td;
        var tr = td.closest('tr');
        // h: the height the renderer declared on the row (sheetRowPx); rect: what it measures on screen.
        return {t: (td.textContent || '').trim(), sh: b.scrollHeight, ch: b.clientHeight,
                h: parseFloat(tr.style.height), rect: Math.round(tr.getBoundingClientRect().height * 100) / 100};
      };
      // The two holidays' Waterfall boxes, re-queried each time (the list redraws on every change).
      var tgBox = function (on) {
        var n = 0;
        for (var guard = 0; guard < 10; guard++) {
          var next = qa('#holiday-vis-list input.hv-cb[data-view="sheet"]').filter(function (cb) {
            return /^(day-after-)?thanksgiving@2026$/.test(cb.dataset.hid) && cb.checked !== on;   // holidaySlug(name, date)
          })[0];
          if (!next) break;
          next.click(); n++;
        }
        return n;
      };
      var before = rowOf(TG);
      var clicked = tgBox(true);
      await T.sleep(150);                                   // the change handler renders synchronously; no other edit
      var at = rowOf(TG), plain = rowOf('2026-11-16');
      out.tick = {before: before, clicked: clicked, at: at, plain: plain};
      add('K1', 'ticked on, the Thanksgiving week\'s row is 23 px on screen at once, both lines whole',
          clicked === 2 && before && before.h === 20 && at && at.h === 23 && /Thanksgiving[\s\S]*Day After Thanksgiving/.test(at.t)
          && at.sh <= at.ch + 1 && plain && plain.h === 20 && Math.abs(at.rect - 23) < 0.05,
          out.tick, 'declared 20 before, 23 after (and 23 measured), the week before 20');

      // K2: the workbook, exported at once.
      await T.sleep(400);
      var xb = await T.captureExport('export-btn', 'the workbook');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var ws = wb.worksheets[0], tgRow = null;
      ws.eachRow(function (row, r) { row.eachCell(function (c) {
        if (typeof c.value === 'string' && /Thanksgiving/.test(c.value) && /Day After/.test(c.value)) tgRow = r;
      }); });
      var hOf = function (r) { var x = ws.getRow(r).height; return x === undefined ? null : x; };
      out.xl = tgRow ? {row: tgRow, h: hOf(tgRow), above: hOf(tgRow - 1), below: hOf(tgRow + 1)} : null;
      add('K2', 'the workbook exported at once: that row 17.25 pt, the rows either side 15',
          !!out.xl && out.xl.h === 17.25 && out.xl.above === 15 && out.xl.below === 15, out.xl, '17.25 / 15 / 15');

      // K3: the waterfall PDF, exported at once. Every date string with its Tm position.
      var pdfAt = async function (label) {
        var pb = await T.captureExport('export-wf-pdf-btn', label);
        var u8 = new Uint8Array(await pb.arrayBuffer()), un = T.pdfUnmark(u8), own = un ? un.writer : u8;
        var ops = [];
        (await T.pdfInflated(own)).forEach(function (t) {
          var x = 0, y = 0, tok = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm|\(((?:\\.|[^\\)])*)\)\s*Tj/g, m;
          while ((m = tok.exec(t))) { if (m[1] !== undefined) { x = +m[1]; y = +m[2]; } else ops.push({x: x, y: y, s: m[3]}); }
        });
        var h = 0; for (var i = 0; i < own.length; i++) h = (h * 31 + own[i]) >>> 0;
        return {ops: ops, len: own.length, hash: h};
      };
      var p1 = await pdfAt('the waterfall PDF');
      var yOf = function (p, s) { var o = p.ops.filter(function (o) { return o.s === s; })[0]; return o ? o.y : null; };
      var y = {'11/2/26': yOf(p1, '11/2/26'), '11/16/26': yOf(p1, '11/16/26'), '11/30/26': yOf(p1, '11/30/26')};
      var plainSum = y['11/2/26'] - y['11/16/26'], tgSum = y['11/16/26'] - y['11/30/26'];
      out.pdf = {y: y, plainTwoGaps: plainSum, aroundThanksgiving: tgSum, ratio: plainSum ? tgSum / plainSum : null, len: p1.len};
      add('K3', 'the waterfall PDF exported at once: the gaps around that week are 43/40 of two plain rows (a 23 px row)',
          plainSum > 0 && Math.abs(tgSum / plainSum - 43 / 40) < 0.004, out.pdf, 'ratio 1.075');

      // K4: the same PDF after a fresh schedule (setViewMode runs update()).
      byId('view-month-btn').click();
      await T.until(function () { return !!q('#table-wrap .mv-monthyear'); }, 'the month view', 100, 100);
      byId('view-sheet-btn').click();
      await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 0; }, 'the waterfall', 100, 100);
      await T.sleep(600);
      var p2 = await pdfAt('the waterfall PDF after a fresh schedule');
      out.pdf2 = {len: p2.len, hash: p2.hash, first: {len: p1.len, hash: p1.hash}, row: rowOf(TG)};
      add('K4', 'that PDF is byte for byte the one exported after a fresh schedule',
          p1.len === p2.len && p1.hash === p2.hash && out.pdf2.row && out.pdf2.row.h === 23, out.pdf2, 'identical');

      // K5: ticked off again.
      var off = tgBox(false);
      await T.sleep(150);
      out.untick = {clicked: off, row: rowOf(TG)};
      add('K5', 'ticked off again, the row is 20 px at once', off === 2 && out.untick.row && out.untick.row.h === 20, out.untick, '20');
    }

    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  T.done(out);
})(); });
