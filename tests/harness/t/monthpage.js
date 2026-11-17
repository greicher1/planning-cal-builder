// monthpage -- the month view on screen is the month PDF's page (owner, 16 Nov 2026: *"I think the viewport for the
// month view calendar needs to work like the waterfall calendar where it maintains consistent proportions despite the
// window width or height. It should reflect whatever is as close as how it will appear when exported to pdf"*, then
// *"phase bar size and note size should also reflect the export exactly. essentially the live viewer should look just
// like what it will look like in the pdf export"*). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh monthpage 300
//   HARNESS_WINDOW=1100,760 ... the same leg in a small window: every number below is the same
//   HARNESS_QUERY=tall=1 ... on a calendar with a month the PDF shrinks (monthscale): T must find one
//
// Rulings (owner's pickers, 16 Nov 2026): the full page shape (width AND the weeks stretched over a Letter landscape
// page); 100% is one fixed size and a smaller window scrolls, the spare room on the right; a month the PDF shrinks
// stays full size on screen, in a card taller than the page; no note symbols.
//
// The numbers are MVL_GEOMETRY's (the month PDF writer's page), which a leg cannot read (the engine is one IIFE):
// Letter landscape 1056 x 816 px, 8 mm margins, so the card is 11in - 16mm + 32px = 1027.528 px wide and at least
// 8.5in - 16mm + 32.5px = 788.028 px tall, and a day column is 141.075 px.
//
//   G0  the card is the page: 1027.53 px wide in the month view, at least 788.03 px tall, a day column 141.07 px; the
//       card starts at the left of its scroll box, and the box scrolls sideways exactly when it is narrower than the card
//   P   EVERY month: the screen's week heights are the written PDF's rows, within 0.1 px, on every month that fits a page
//   T   a month the PDF shrinks is full size on screen, in a card taller than the page (every week at least the PDF's)
//   B   bars and notes at the height they print: a Standard pill 19 px (34 px on two lines), a band 19 px, a 10 px note
//       13 px a line plus 6
//   S   no note symbol anywhere in the month view
//   Z   the calendar zoom scales the page and nothing else: at 50, 75 and 150% the card's own size is unchanged and
//       every week within 2 px of its 100% height (a hairline draws at least one device pixel, so zoomed out the
//       page's lines take a little more of it: 1.5 px a week at 50%); back at 100% the weeks are exactly as they were
//   X   a line added to a week (the row's "+") stays inside the week, and the "+" strip sits at the week's bottom edge
//   V   the fit's numbers are on #table-wrap's own style in the month view only: the waterfall carries none
//   F   a month drawn where there was none (coming from the waterfall) is already measured at the page's day: every
//       note has the lines it has after any later render. (Frozen mvNoteBoxWidth() reads a day cell already on screen
//       and guesses from the box's width when there is none; the fit's observer renders such a month a second time.)
//   E0  no console error
//
// With no calendar (no HARNESS_STATE) the leg runs E alone:
//   E   with the Month button on and nothing to draw, the message keeps the panel's width (no fixed track)
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'monthpage', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function byId(id) { return document.getElementById(id); }
  function r2(x) { return Math.round(x * 100) / 100; }
  var params = new URLSearchParams(location.search);
  var PAGE_W = 1056 - 16 * 96 / 25.4 + 32, PAGE_H = 816 - 16 * 96 / 25.4 + 32.5, DAY_W = (1056 - 16 * 96 / 25.4 - 8) / 7;
  var tw = function () { return byId('table-wrap'); };
  function zoomOf() { return tw().currentCSSZoom || 1; }
  function weeks() { return qa('#table-wrap .month-view > .mv-body > .mv-week'); }
  function rows() { var z = zoomOf(); return weeks().map(function (w) { return r2(w.getBoundingClientRect().height / z); }); }
  function card() { var z = zoomOf(), b = q('#table-wrap .month-view').getBoundingClientRect(); return [r2(b.width / z), r2(b.height / z)]; }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (tw() || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, label || 'the month to settle', 200, 60);
  }
  async function zoomTo(z) { document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom: z } })); await T.sleep(450); }
  try {
    await T.until(function () { return q('#table-wrap .sheet-scroll, #table-wrap .mv-body, #table-wrap .month-empty, #table-wrap .sheet-empty, #table-wrap > *'); }, 'the app', 150, 100);
    if (!q('#table-wrap .mv-body')) { byId('view-month-btn').click(); }
    await T.until(function () { return q('#table-wrap .mv-body, #table-wrap .month-empty, #table-wrap .empty-state'); }, 'the month view', 150, 100);
    await T.sleep(700);

    if (!q('#table-wrap .mv-body')) {
      // ---- E: no calendar ----
      var em = q('#table-wrap .month-empty, #table-wrap .empty-state'), cs0 = getComputedStyle(tw());
      kase('E', 'the Month button on and nothing to draw: the message keeps the panel\'s width, no fixed track on #table-wrap',
        !!em && byId('view-month-btn').classList.contains('active') && cs0.display !== 'grid' && Math.abs(em.getBoundingClientRect().width - (tw().clientWidth - parseFloat(cs0.paddingLeft) - parseFloat(cs0.paddingRight))) < 1.5,
        { display: cs0.display, empty: em ? r2(em.getBoundingClientRect().width) : null, box: tw().clientWidth, monthOn: byId('view-month-btn').classList.contains('active') });
    } else {
      var prev = function () { return byId('mv-prev'); }, next = function () { return byId('mv-next'); };
      for (var g = 0; g < 300 && !prev().disabled; g++) { prev().click(); await T.sleep(25); }
      await settle();

      // ---- every month on screen ----
      var screen = [], pills = [], notes = [], marks = 0;
      var standard = !/\bmv-bar-(11|large|13|xl)\b/.test(document.body.className), sized = document.body.classList.contains('mv-note-sized');
      for (g = 0; g < 300; g++) {
        var mv = q('#table-wrap .month-view'), box = tw(), bcs = getComputedStyle(box);
        var mb = mv.getBoundingClientRect(), bb = box.getBoundingClientRect();
        screen.push({ label: q('#table-wrap .mv-monthyear').textContent.trim(), rows: rows(), card: card(),
          day: r2(q('#table-wrap .mv-daycell').getBoundingClientRect().width),
          left: r2(mb.left - bb.left - (parseFloat(bcs.borderLeftWidth) || 0) - (parseFloat(bcs.paddingLeft) || 0) + box.scrollLeft),
          nnotes: qa('#table-wrap .mv-note-block').length, track: bcs.gridTemplateColumns, scrolls: box.scrollWidth > box.clientWidth + 1, narrow: box.clientWidth - (parseFloat(bcs.paddingLeft) || 0) - (parseFloat(bcs.paddingRight) || 0) < PAGE_W - 0.5 });
        marks += qa('#table-wrap .mv-note-mark').length;
        if (standard) {
          qa('#table-wrap .mv-pill, #table-wrap .mv-hiatus-bar').forEach(function (p) {
            if (p.style.fontSize) return;
            pills.push(r2(p.getBoundingClientRect().height));
          });
        }
        if (!sized) {
          qa('#table-wrap .mv-note-block').forEach(function (n) {
            if (n.style.fontSize || n.querySelector('[style*="font-size"]')) return;
            notes.push(r2(n.getBoundingClientRect().height));
          });
        }
        if (next().disabled) break;
        next().click(); await T.sleep(60);
      }
      var s0 = screen[0];
      var badG = screen.filter(function (s) {
        return Math.abs(s.card[0] - PAGE_W) > 0.1 || s.card[1] < PAGE_H - 0.1 || Math.abs(s.day - DAY_W) > 0.1 || Math.abs(s.left) > 0.6 ||
          Math.abs(parseFloat(s.track) - PAGE_W) > 0.1 || s.scrolls !== s.narrow;
      });
      kase('G0', 'the card is the page in every month: 1027.53 px wide, at least 788.03 px tall, a day column 141.07 px, at the left of its box, which scrolls sideways exactly when it is narrower than the card',
        screen.length > 0 && !badG.length,
        { months: screen.length, first: s0, bad: badG.slice(0, 3), want: { width: r2(PAGE_W), minHeight: r2(PAGE_H), day: r2(DAY_W) } });

      // ---- the written PDF ----
      var rec = T.fakeSavePicker();
      byId('export-btn').click();
      await T.until(function () { return rec.files.length > 0 || !!q('.mantine-Modal-content'); }, 'the month PDF', 300, 100);
      var warned = false;
      if (!rec.files.length) {
        var mc = q('.mantine-Modal-content');
        var go = qa('button', mc).filter(function (b) { return /export anyway/i.test(b.textContent); })[0];
        warned = /shrunk to fit/i.test(mc.textContent);
        if (go) go.click();
        await T.until(function () { return rec.files.length > 0; }, 'the month PDF after its warning', 300, 100);
      }
      rec.restore();
      var u = T.pdfUnmark(rec.files[0].bytes), bytes = u ? u.writer : rec.files[0].bytes;
      var streams = await T.pdfInflated(bytes), pages = {};
      streams.forEach(function (t) {
        if (!/ re\b/.test(t)) return;
        var re = /(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g, m, wide = [];
        while ((m = re.exec(t))) { if (+m[3] > 700) wide.push([+m[1], +m[2], +m[3], +m[4]]); }
        var lab = /\(((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4})\) Tj/.exec(t);
        if (!lab || !wide.length) return;
        // The month bar and the weekday row are the page's wide fills; each week's top rule is a 1.5 pt line inside
        // the frame, and the frame's bottom rule the lowest full-width one. Points to px: 0.75.
        var fills = wide.filter(function (r) { return r[3] > 5; });
        var rules = wide.filter(function (r) { return Math.abs(r[3] - 1.5) < 0.01 && r[2] < 742; }).sort(function (a, b) { return b[1] - a[1]; });
        var frame = wide.filter(function (r) { return Math.abs(r[3] - 1.5) < 0.01 && r[2] > 742; });
        if (!fills.length || !frame.length) return;
        var edges = [Math.min.apply(null, fills.map(function (r) { return r[1]; }))]
          .concat(rules.map(function (r) { return r[1] + 1.5; }))
          .concat([Math.min.apply(null, frame.map(function (r) { return r[1]; })) + 1.5]);
        var rr = [];
        for (var j = 0; j < edges.length - 1; j++) rr.push(r2((edges[j] - edges[j + 1]) / 0.75));
        pages[lab[1]] = rr;
      });
      var fit = 0, tall = [], off = [], shape = [];
      screen.forEach(function (s) {
        var p = pages[s.label];
        if (!p) return;
        if (p.length !== s.rows.length) { shape.push({ month: s.label, screen: s.rows.length, pdf: p.length }); return; }
        if (s.card[1] > PAGE_H + 0.2) { tall.push({ month: s.label, card: s.card[1], screen: s.rows, pdf: p }); return; }
        var d = Math.max.apply(null, s.rows.map(function (h, i) { return Math.abs(h - p[i]); }));
        if (d > 0.1) off.push({ month: s.label, worst: r2(d), screen: s.rows, pdf: p }); else fit++;
      });
      kase('P', 'every month that fits a page: the screen\'s week heights are the written PDF\'s rows, within 0.1 px',
        fit > 0 && !off.length && !shape.length,
        { monthsOnScreen: screen.length, pdfPages: Object.keys(pages).length, exact: fit, tall: tall.length, off: off.slice(0, 4), shape: shape.slice(0, 3) });
      var wantTall = params.get('tall') === '1';
      var tallOk = tall.every(function (t) { return t.screen.every(function (h, i) { return h >= t.pdf[i] - 0.1; }); });
      kase('T', 'a month the PDF shrinks stays full size on screen, in a card taller than the page' + (wantTall ? ' (this calendar has one, and the export warned)' : ''),
        tallOk && (!wantTall || (tall.length > 0 && warned)), { tall: tall.slice(0, 2), warned: warned, wantTall: wantTall });

      // ---- B: printed heights ----
      var badPills = pills.filter(function (h) { return Math.abs(h - 19) > 0.05 && Math.abs(h - 34) > 0.05; });
      var badNotes = notes.filter(function (h) { var n = (h - 6) / 13; return Math.abs(n - Math.round(n)) > 0.01 || n < 0.99; });
      kase('B', 'bars and notes at the height they print: a Standard pill or band 19 px (34 px on two lines), a 10 px note 13 px a line plus 6',
        !badPills.length && !badNotes.length && (pills.length + notes.length > 0 || !standard || sized),
        { standardBars: standard, sizedNotes: sized, pills: pills.length, notes: notes.length, badPills: badPills.slice(0, 6), badNotes: badNotes.slice(0, 6) });

      // ---- S: no symbol ----
      kase('S', 'no note symbol anywhere in the month view', marks === 0, { marks: marks });

      // ---- Z: the zoom ----
      for (g = 0; g < 300 && !prev().disabled; g++) { prev().click(); await T.sleep(25); }
      // The first month that fits a page and has something in it.
      for (g = 0; g < 300; g++) { if (card()[1] <= PAGE_H + 0.2 && qa('#table-wrap .mv-bar:not(.mv-note-add):not(.mv-row-expand)').length) break; if (next().disabled) break; next().click(); await T.sleep(60); }
      await settle();
      var z100 = { card: card(), rows: rows() }, zs = {};
      for (var zi = 0, ZL = [0.5, 0.75, 1.5]; zi < ZL.length; zi++) { await zoomTo(ZL[zi]); zs[ZL[zi]] = { z: zoomOf(), card: card(), rows: rows() }; }
      await zoomTo(1);
      var back = { card: card(), rows: rows() };
      var zOk = Object.keys(zs).every(function (k) {
        var s = zs[k];
        return Math.abs(s.z - (+k)) < 0.01 && Math.abs(s.card[0] - z100.card[0]) < 0.1 && Math.abs(s.card[1] - z100.card[1]) < 1.5 &&
          s.rows.length === z100.rows.length && s.rows.every(function (h, i) { return Math.abs(h - z100.rows[i]) <= 2; });
      });
      kase('Z', 'the zoom scales the page and nothing else: at 50, 75 and 150% the card\'s own size is unchanged and every week within 2 px; back at 100% exactly as before',
        zOk && JSON.stringify(back) === JSON.stringify(z100), { at100: z100, zoomed: zs, back: back });

      // ---- X: a line added to a week ----
      var wk = weeks().filter(function (w) { return q('.mv-row-expand:not(.is-full)', w); })[0], x = null;
      if (wk) {
        var idx = weeks().indexOf(wk), before = rows();
        q('.mv-row-expand', wk).click(); await T.sleep(200); await settle();
        wk = weeks()[idx];
        var layer = q('.mv-bars', wk), slots = qa('.mv-note-add:not(.mv-note-add-full)', layer);
        var wr = wk.getBoundingClientRect(), ex = q('.mv-row-expand', wk).getBoundingClientRect();
        var lowest = Math.max.apply(null, slots.map(function (s) { return s.getBoundingClientRect().bottom; }));
        x = { week: idx, before: before[idx], after: rows()[idx], lowestSlotInside: r2(wr.bottom - lowest), expandFromBottom: r2(wr.bottom - ex.bottom), card: card() };
      }
      kase('X', 'a line added to a week stays inside the week, and the "+" strip sits at the week\'s bottom edge',
        !!x && x.lowestSlotInside >= -0.5 && Math.abs(x.expandFromBottom) <= 1.5 && Math.abs(x.card[0] - PAGE_W) < 0.1, x || { none: 'no week with a + strip' });

      // ---- V: the fit's numbers ----
      var inMonth = (tw().getAttribute('style') || '').match(/--mvp-[fm]\d/g) || [], nWeeks = weeks().length;
      byId('view-sheet-btn').click();
      await T.until(function () { return !!q('#table-wrap .sheet-scroll'); }, 'the waterfall', 100, 100);
      await T.sleep(300);
      var inSheet = (tw().getAttribute('style') || '').match(/--mvp-[fm]\d/g) || [];
      var sheetTrack = getComputedStyle(tw()).display;
      kase('V', 'the fit\'s numbers sit on #table-wrap\'s own style in the month view only (two per week), and the waterfall carries none and no fixed track',
        inMonth.length === nWeeks * 2 && inSheet.length === 0 && sheetTrack !== 'grid', { month: inMonth.length, weeks: nWeeks, waterfall: inSheet.length, waterfallDisplay: sheetTrack });

      // ---- F: a month drawn where there was none ----
      // The month with the most notes is put under the cursor, then the waterfall, then Month again: that render had
      // no day cell on screen to measure. Paging away and back renders it with one.
      var laneSig = function () { return qa('#table-wrap .mv-bars > .mv-note-block').map(function (n) {
        return n.getAttribute('data-note-day') + '|' + n.textContent.trim().slice(0, 30) + '|' + n.style.gridRow; }).join(' ; '); };
      var busiest = screen.slice().sort(function (a, b) { return b.nnotes - a.nnotes; })[0];
      byId('view-month-btn').click();
      await T.until(function () { return !!q('#table-wrap .mv-body'); }, 'the month view again', 100, 100);
      for (g = 0; g < 300 && !prev().disabled; g++) { prev().click(); await T.sleep(25); }
      for (g = 0; g < 300 && q('#table-wrap .mv-monthyear').textContent.trim() !== busiest.label; g++) { if (next().disabled) break; next().click(); await T.sleep(40); }
      await settle();
      byId('view-sheet-btn').click();
      await T.until(function () { return !!q('#table-wrap .sheet-scroll'); }, 'the waterfall again', 100, 100);
      await T.sleep(200);
      byId('view-month-btn').click();
      await T.until(function () { return !!q('#table-wrap .mv-body'); }, 'the month view from the waterfall', 100, 100);
      await T.sleep(150); await settle();
      var sigFirst = laneSig(), rowsFirst = rows(), monthFirst = q('#table-wrap .mv-monthyear').textContent.trim();
      if (!next().disabled) { next().click(); await T.sleep(80); prev().click(); } else if (!prev().disabled) { prev().click(); await T.sleep(80); next().click(); }
      await T.sleep(150); await settle();
      var sigAgain = laneSig(), rowsAgain = rows();
      kase('F', 'a month drawn where there was none (from the waterfall) is measured at the page\'s day: every note has the lines, and every week the height, it has after a later render',
        monthFirst === busiest.label && busiest.nnotes > 0 && sigFirst === sigAgain && JSON.stringify(rowsFirst) === JSON.stringify(rowsAgain),
        { month: monthFirst, notes: busiest.nnotes, same: sigFirst === sigAgain, first: sigFirst === sigAgain ? undefined : sigFirst.slice(0, 500), again: sigFirst === sigAgain ? undefined : sigAgain.slice(0, 500), rowsFirst: rowsFirst, rowsAgain: rowsAgain });
    }
  } catch (e) { out.EX = String(e && e.stack || e); kase('EX', 'monthpage threw: ' + out.EX, false); }
  var errs = T.appHealth ? T.appHealth() : null, all = (errs && errs.errors) || [];
  kase('E0', 'no console error', all.length === 0, { errors: all.slice(0, 5) });
  T.done(out);
})(); });
