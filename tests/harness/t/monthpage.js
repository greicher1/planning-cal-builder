// monthpage -- the month view on screen is the month PDF's page (owner, 16 Nov 2026: *"I think the viewport for the
// month view calendar needs to work like the waterfall calendar where it maintains consistent proportions despite the
// window width or height. It should reflect whatever is as close as how it will appear when exported to pdf"*, then
// *"phase bar size and note size should also reflect the export exactly. essentially the live viewer should look just
// like what it will look like in the pdf export"*). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh monthpage 300
//   HARNESS_WINDOW=1100,760 ... the same leg in a small window: every number below is the same
//   HARNESS_QUERY=shrunk=1 ... on a calendar with a month the PDF shrinks (monthscale, month-dense60, month-lanecap):
//                              T, N and K must find one
//
// Rulings (owner's pickers, 16 Nov 2026): the full page shape (width AND the weeks stretched over a Letter landscape
// page); 100% is one fixed size and a smaller window scrolls, the spare room on the right; no note symbols.
// ⭐ 17 Nov 2026, "Shrink like the PDF" (MONTH-SHRINK-PLAN.md), which REPLACES the 16 Nov "Full size, taller page": the
// card is one page at EVERY month, and a month the PDF shrinks is drawn at the PDF's own factor, its notes in the
// PDF's lanes. And "Stay one page": a line added to a shrunk month's week does not make its card taller.
// (Until then T held the opposite: such a month stayed full size in a card taller than the page.)
//
// The numbers are MVL_GEOMETRY's (the month PDF writer's page), which a leg cannot read (the engine is one IIFE):
// Letter landscape 1056 x 816 px, 8 mm margins, so the card is 11in - 16mm + 32px = 1027.528 px wide and
// 8.5in - 16mm + 32.5px = 788.028 px tall, and a day column is 141.075 px.
// What the PDF did is read from the WRITTEN PDF's own page streams, never from the app: a page's factor is its day
// numbers' type over the full-size 8.25 pt, and a note is the clipped group of text lines the writer draws in its box.
//
//   G0  the card is the page in EVERY month: 1027.53 px wide in the month view, 788.03 px tall, a day column 141.07 px;
//       the card starts at the left of its scroll box, and the box scrolls sideways exactly when it is narrower than it
//   P   EVERY month the PDF prints, a shrunk one too: the screen's week heights are the written PDF's rows, within
//       0.1 px
//   T   the factor on screen is the PDF's in every month: --mvk on #table-wrap where the PDF shrinks the month (a whole
//       number of 64ths, the PDF's own), absent where it does not; a shrunk month's card is one page
//   N   in a month the PDF shrinks, every note is in the PDF's box: the lanes it spans are the lines the PDF sets it
//       in, its box the PDF's width, never taller than the PDF's, and the PDF's height for all but a knife-edge few
//       (Chrome draws a font at a size cut to 1/100 of a device pixel, so a note within about 0.16% of its box can
//       draw a line fewer inside the same lanes: 1 of 42 on monthscale's August)
//   B   bars and notes at the height they print, at the month's factor k: a Standard pill or band 17k + 2 px (32k + 2
//       on two lines; 19 and 34 px in a month that fits), a 10 px note (13 a line + 4)k + 2
//   S   no note symbol anywhere in the month view
//   Z   the calendar zoom scales the page and nothing else: at 50, 75 and 150% the card's own size is unchanged and
//       every week within 2 px of its 100% height (a hairline draws at least one device pixel, so zoomed out the
//       page's lines take a little more of it: 1.5 px a week at 50%); back at 100% the weeks are exactly as they were
//   X   a line added to a week (the row's "+") stays inside the week, and the "+" strip sits at the week's bottom edge
//   K   "Stay one page": in a month the PDF shrinks, a line added to a week (the row's "+") leaves the card one page
//       and that week the height it had (the PDF's row; the PDF draws no blank lines)
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
  // The factor the month on screen is drawn at: --mvk on #table-wrap's own style, 1 when it carries none.
  function kNow() { return parseFloat(tw().style.getPropertyValue('--mvk')) || 1; }
  // Text as both sides can be compared: printable ASCII, single spaces. (The PDF's strings are WinAnsi with octal
  // escapes; anything outside ASCII is dropped on both sides.)
  function norm(s) { return String(s).replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim(); }
  function pdfText(s) { return String(s).replace(/\\[0-7]{3}/g, '').replace(/\\(.)/g, function (_, c) { return c; }); }
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
        var kS = kNow(), zS = zoomOf();
        screen.push({ label: q('#table-wrap .mv-monthyear').textContent.trim(), rows: rows(), card: card(), k: kS,
          notes: qa('#table-wrap .mv-bars > .mv-note-block').map(function (n) {
            var nb = n.getBoundingClientRect(), sp = /span\s*(\d+)/.exec(n.style.gridRow || '');
            return { text: norm(n.textContent), span: sp ? +sp[1] : 1, w: r2(nb.width / zS), h: r2(nb.height / zS),
              own: !!(n.style.fontSize || n.querySelector('[style*="font-size"]')) };
          }),
          day: r2(q('#table-wrap .mv-daycell').getBoundingClientRect().width),
          left: r2(mb.left - bb.left - (parseFloat(bcs.borderLeftWidth) || 0) - (parseFloat(bcs.paddingLeft) || 0) + box.scrollLeft),
          nnotes: qa('#table-wrap .mv-note-block').length, track: bcs.gridTemplateColumns, scrolls: box.scrollWidth > box.clientWidth + 1, narrow: box.clientWidth - (parseFloat(bcs.paddingLeft) || 0) - (parseFloat(bcs.paddingRight) || 0) < PAGE_W - 0.5 });
        marks += qa('#table-wrap .mv-note-mark').length;
        if (standard) {
          qa('#table-wrap .mv-pill, #table-wrap .mv-hiatus-bar').forEach(function (p) {
            if (p.style.fontSize) return;
            pills.push({ h: r2(p.getBoundingClientRect().height), k: kS });
          });
        }
        if (!sized) {
          qa('#table-wrap .mv-note-block').forEach(function (n) {
            if (n.style.fontSize || n.querySelector('[style*="font-size"]')) return;
            notes.push({ h: r2(n.getBoundingClientRect().height), k: kS });
          });
        }
        if (next().disabled) break;
        next().click(); await T.sleep(60);
      }
      var s0 = screen[0];
      var badG = screen.filter(function (s) {
        return Math.abs(s.card[0] - PAGE_W) > 0.1 || Math.abs(s.card[1] - PAGE_H) > 0.1 || Math.abs(s.day - DAY_W) > 0.1 || Math.abs(s.left) > 0.6 ||
          Math.abs(parseFloat(s.track) - PAGE_W) > 0.1 || s.scrolls !== s.narrow;
      });
      var lite = function (s) { var o = {}; Object.keys(s).forEach(function (key) { if (key !== 'notes') o[key] = s[key]; }); return o; };
      kase('G0', 'the card is the page in every month: 1027.53 px wide, 788.03 px tall, a day column 141.07 px, at the left of its box, which scrolls sideways exactly when it is narrower than the card',
        screen.length > 0 && !badG.length,
        { months: screen.length, first: lite(s0), bad: badG.slice(0, 3).map(lite), want: { width: r2(PAGE_W), height: r2(PAGE_H), day: r2(DAY_W) } });

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
      var streams = await T.pdfInflated(bytes), pages = {}, pdfK = {}, pdfNotes = {};
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
        // The page's factor: its day numbers are 11 px (8.25 pt) type times the factor, in the 600 weight.
        var sizes = {}, dm, reDay = /BT \/F600 ([\d.]+) Tf 1 0 0 1 [\d.]+ [\d.]+ Tm \((\d{1,2})\) Tj ET/g;
        while ((dm = reDay.exec(t))) sizes[dm[1]] = (sizes[dm[1]] || 0) + 1;
        var daySize = Object.keys(sizes).sort(function (a, b) { return sizes[b] - sizes[a]; })[0];
        pdfK[lab[1]] = daySize ? (+daySize) / 8.25 : null;
        // Every clipped group of text lines: a note's lines are drawn inside a clip of its box less its 1 px border
        // (0.75 pt a side). Bars are clipped groups too; a note is found among them by its text.
        var groups = [], gm, reClip = /q ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re W n\n([\s\S]*?)\nQ\n/g, src = t + '\n';
        while ((gm = reClip.exec(src))) {
          var lines = [], lm, reRun = /BT \/F\d+ [\d.]+ Tf 1 0 0 1 [\d.]+ [\d.]+ Tm \(((?:[^()\\]|\\.)*)\) Tj ET/g;
          while ((lm = reRun.exec(gm[5]))) lines.push(pdfText(lm[1]));
          if (lines.length) groups.push({ text: norm(lines.join(' ')), lines: lines.length, w: r2((+gm[3] + 1.5) / 0.75), h: r2((+gm[4] + 1.5) / 0.75) });
        }
        pdfNotes[lab[1]] = groups;
      });
      var fit = 0, off = [], shape = [], paged = 0;
      screen.forEach(function (s) {
        var p = pages[s.label];
        if (!p) return;
        paged++;
        if (p.length !== s.rows.length) { shape.push({ month: s.label, screen: s.rows.length, pdf: p.length }); return; }
        var d = Math.max.apply(null, s.rows.map(function (h, i) { return Math.abs(h - p[i]); }));
        if (d > 0.1) off.push({ month: s.label, k: s.k, worst: r2(d), screen: s.rows, pdf: p }); else fit++;
      });
      kase('P', 'every month the PDF prints, a shrunk one too: the screen\'s week heights are the written PDF\'s rows, within 0.1 px',
        fit > 0 && fit === paged && !off.length && !shape.length,
        { monthsOnScreen: screen.length, pdfPages: Object.keys(pages).length, exact: fit, off: off.slice(0, 4), shape: shape.slice(0, 3) });

      // ---- T: the factor ----
      var wantShrunk = params.get('shrunk') === '1', shrunkMonths = [], badK = [];
      screen.forEach(function (s) {
        var kp = pdfK[s.label];
        // A month the PDF does not print (an empty one at either end of the calendar) has no factor to match: none here.
        if (!pages[s.label]) { if (s.k !== 1) badK.push({ month: s.label, screen: s.k, pdf: 'no page' }); return; }
        if (typeof kp !== 'number') { badK.push({ month: s.label, screen: s.k, pdf: null }); return; }
        var pdfShrunk = kp < 0.9995, n64 = s.k * 64;
        if (Math.abs(s.k - kp) > 0.002 || (pdfShrunk ? !(s.k > 0 && s.k < 1 && Math.abs(n64 - Math.round(n64)) < 1e-9) : s.k !== 1)) badK.push({ month: s.label, screen: s.k, pdf: r2(kp * 1000) / 1000 });
        else if (pdfShrunk) shrunkMonths.push({ month: s.label, k: s.k, sixtyFourths: Math.round(n64), card: s.card });
      });
      var cardOk = shrunkMonths.every(function (m) { return Math.abs(m.card[1] - PAGE_H) <= 0.1 && Math.abs(m.card[0] - PAGE_W) <= 0.1; });
      kase('T', 'the factor on screen is the PDF\'s in every month (a whole number of 64ths where the PDF shrinks the month, none where it does not), and a shrunk month\'s card is one page' + (wantShrunk ? ' (this calendar has one, and the export warned)' : ''),
        !badK.length && cardOk && (!wantShrunk || (shrunkMonths.length > 0 && warned)),
        { shrunk: shrunkMonths.slice(0, 4), bad: badK.slice(0, 4), warned: warned, wantShrunk: wantShrunk });

      // ---- N: a shrunk month's notes are in the PDF's boxes ----
      var nPairs = 0, nUnpaired = [], nLanes = [], nWide = [], nTaller = [], nShorter = [];
      shrunkMonths.forEach(function (m) {
        var s = screen.filter(function (x) { return x.label === m.month; })[0], pool = (pdfNotes[m.month] || []).slice();
        var mine = s.notes.filter(function (n) { return !n.own; });
        var take = function (test) { for (var i = 0; i < pool.length; i++) { if (test(pool[i])) return pool.splice(i, 1)[0]; } return null; };
        // The same text on several days: paired in order of size, so only a real difference is left over.
        var order = function (a, b) { return (a.span || a.lines) - (b.span || b.lines) || a.w - b.w || a.h - b.h; };
        pool.sort(order); mine.sort(order);
        mine.forEach(function (n) {
          // The PDF's lines joined are the note's text; a note cut at its last line is a start of it.
          var g = take(function (x) { return x.text === n.text; }) || take(function (x) { return x.text.length >= 8 && n.text.indexOf(x.text) === 0; });
          if (!g) { nUnpaired.push({ month: m.month, note: n.text.slice(0, 40) }); return; }
          nPairs++;
          var where = { month: m.month, note: n.text.slice(0, 40), screen: { lanes: n.span, w: n.w, h: n.h }, pdf: { lines: g.lines, w: g.w, h: g.h } };
          if (n.span !== g.lines) nLanes.push(where);
          if (Math.abs(n.w - g.w) > 0.1) nWide.push(where);
          if (n.h > g.h + 0.1) nTaller.push(where); else if (n.h < g.h - 0.1) nShorter.push(where);
        });
      });
      var knife = Math.max(1, Math.ceil(nPairs * 0.03));
      kase('N', 'in a month the PDF shrinks, every note is in the PDF\'s box: the lanes it spans are the PDF\'s lines, its box the PDF\'s width and never taller, and the PDF\'s height for all but a knife-edge few' + (wantShrunk ? ' (this calendar has such notes)' : ''),
        !nUnpaired.length && !nLanes.length && !nWide.length && !nTaller.length && nShorter.length <= knife && (!wantShrunk || nPairs > 0),
        { notes: nPairs, unpaired: nUnpaired.slice(0, 4), lanes: nLanes.slice(0, 4), width: nWide.slice(0, 4), taller: nTaller.slice(0, 4), aLineFewer: nShorter.length, allowed: knife, fewer: nShorter.slice(0, 3) });

      // ---- B: printed heights ----
      var badPills = pills.filter(function (p) { return Math.abs(p.h - (17 * p.k + 2)) > 0.06 && Math.abs(p.h - (32 * p.k + 2)) > 0.06; });
      var badNotes = notes.filter(function (p) { var n = ((p.h - 2) / p.k - 4) / 13; return Math.abs(n - Math.round(n)) > 0.02 || n < 0.98; });
      kase('B', 'bars and notes at the height they print, at the month\'s factor k: a Standard pill or band 17k + 2 px (32k + 2 on two lines; 19 and 34 at full size), a 10 px note (13 a line + 4)k + 2',
        !badPills.length && !badNotes.length && (pills.length + notes.length > 0 || !standard || sized),
        { standardBars: standard, sizedNotes: sized, pills: pills.length, notes: notes.length, badPills: badPills.slice(0, 6), badNotes: badNotes.slice(0, 6) });

      // ---- S: no symbol ----
      kase('S', 'no note symbol anywhere in the month view', marks === 0, { marks: marks });

      // ---- Z: the zoom ----
      for (g = 0; g < 300 && !prev().disabled; g++) { prev().click(); await T.sleep(25); }
      // The first month that fits a page and has something in it.
      for (g = 0; g < 300; g++) { if (kNow() === 1 && card()[1] <= PAGE_H + 0.2 && qa('#table-wrap .mv-bar:not(.mv-note-add):not(.mv-row-expand)').length) break; if (next().disabled) break; next().click(); await T.sleep(60); }
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

      // ---- K: "Stay one page" ----
      // The first month the PDF shrinks, and its first week with a "+" strip that still takes a line.
      var kk = null;
      if (shrunkMonths.length) {
        for (g = 0; g < 300 && !prev().disabled; g++) { prev().click(); await T.sleep(25); }
        for (g = 0; g < 300 && q('#table-wrap .mv-monthyear').textContent.trim() !== shrunkMonths[0].month; g++) { if (next().disabled) break; next().click(); await T.sleep(40); }
        await T.sleep(150); await settle();
        var kw = weeks().filter(function (w) { return q('.mv-row-expand:not(.is-full)', w); })[0];
        if (kw) {
          var ki = weeks().indexOf(kw), kRows = rows(), kCard = card(), kLanes = getComputedStyle(q('.mv-bars', kw)).gridTemplateRows.split(/\s+/).length;
          q('.mv-row-expand', kw).click(); await T.sleep(250); await settle();
          var kw2 = weeks()[ki], kLanes2 = getComputedStyle(q('.mv-bars', kw2)).gridTemplateRows.split(/\s+/).length;
          kk = { month: shrunkMonths[0].month, k: kNow(), week: ki, lanesBefore: kLanes, lanesAfter: kLanes2, rowBefore: kRows[ki], rowAfter: rows()[ki], cardBefore: kCard, cardAfter: card(),
            min: tw().style.getPropertyValue('--mvp-m' + (ki + 1)) };
        }
      }
      kase('K', 'in a month the PDF shrinks, a line added to a week (the row\'s "+") leaves the card one page and the week the height it had' + (wantShrunk ? ' (this calendar has such a month)' : ''),
        kk ? (kk.lanesAfter > kk.lanesBefore && Math.abs(kk.rowAfter - kk.rowBefore) <= 0.1 && Math.abs(kk.cardAfter[1] - PAGE_H) <= 0.1 && Math.abs(kk.cardAfter[1] - kk.cardBefore[1]) <= 0.1 && kk.k < 1)
           : (!wantShrunk && !shrunkMonths.length), kk || { none: shrunkMonths.length ? 'no week with a + strip that takes a line' : 'no shrunk month on this calendar' });

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
