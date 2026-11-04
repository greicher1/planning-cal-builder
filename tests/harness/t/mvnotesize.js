// mvnotesize -- the month view's "Note size" and the phase bar size's two new steps (MONTH-NOTE-SIZE-PLAN.md step 2;
// owner rulings R0-R9 by picker, 2 Nov 2026, and the same day's "do sizes 10, 11, 12, 13, and 14 for the phase bar
// sizes. And make sizes for both the phase bars and the notes be dropdown menus"). Note size is 10-14 px, CALENDAR
// DATA saved as captureSnapshot()'s `mvNoteSize` ('11'-'14'; absent = 10 px). Above 10 px a note shows at most two
// lines, the second ending in "…" (R2, R3), and any one note may take its own size from the text style bar (R4). On
// screen it is legacy.css's "Note size" block (E1: a note's geometry rides in its own inline style, --mvn-h1/--mvn-h2,
// written by mvTextCss; body.mv-note-sized turns on content-sized lanes) and app.js's E2 (mvNoteLineCount at the
// note's effective size, at its DRAWN width). The month PDF's half is plan step 3; gates 10 and 13 hold 10 px.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh mvnotesize 900
//     Day notes, waterfall lines and holidays on many days, two-lane notes, a two-line custom bar.
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=month-dense60 ./run.sh mvnotesize 900
//     Sixty notes in one August, most of them two lines at 10 px.
//
// Every calendar is opened through the real Load path (T.openViaFakePicker) as JSON with viewMode 'month' and no
// size keys, so the undo stack starts EMPTY; every size is picked in its dropdown, as a user picks it. Measured in the
// box's own px (rect / currentCSSZoom), lanes read from Chrome's computed grid-template-rows.
//
// CASES
//   N0   opened with no key: the Note size dropdown shows 10 px, inside .prefs-card in the Month view card; no
//        mv-note-sized class; no note carries --mvn-h1; every lane and box as at 10 px; not dirty, Undo off
//   N1-<px>  after a pick of 11, 12, 13, 14 px: the dropdown and the class follow, the file is dirty, Undo on; in every
//        month every note is at the size (font and whole-px line), exactly its one- or two-line height, clamped at
//        two lines, given exactly min(2, its natural lines) lanes (the element itself, unclamped, in a second pass);
//        every lane without a sized note exactly 17 px or its bar's height; every bar, 10 px note and "+" as before
//   N2   R4: in a 10 px calendar, a day note picked with a click and set to 14 px in the text style bar is the ONLY
//        sized note: it is drawn at 14 px in its own taller lanes, the class goes on, and every other week of the month
//        keeps exactly its 10 px lanes; the style bar's note sizes run 6-14; picking 10 (the calendar's size) stores
//        nothing, and the month is byte-identical to the one first drawn; then with the calendar at 14 px the same note
//        set to 8 px keeps its own size and today's 10 px rule, while every other note is drawn at 14 px
//   N3   each pick is ONE undo step: Undo from 14 gives 13, 12, 11, then 10 (Undo off); Redo four times gives 14; the
//        month on screen byte-identical to the one first drawn at each size
//   N4   Save writes mvNoteSize: "14"; a Save at 10 px writes NO key; both hold exactly the same fields.byId ids (no
//        size dropdown's id among them); Load of the saved text opens at 14; with no key, right after, at 10 px; "15",
//        14 (a number), true and "toString" each open at 10 px, one validator warning each
//   N5   the phase bar size's new steps: 11 and 13 px picked in their dropdown put mv-bar-11 / mv-bar-13 on <body>; every
//        bar and band exactly 20 / 23 px, text 11 / 13 px, grey tag 10 / 12 px, every lane of them exactly that; a Save
//        writes mvBarSize "11" / "13", and Load opens it there; 12 and 14 px are still saved as "large" and "xl"
//   N6   14 px notes at 75%, 150% and 200% zoom: the first four months have exactly their 100% lanes and boxes, own px
//   N7   New, from 14 px, starts at 10 px (the dropdown and the class)
//   E0   no console errors, and exactly the four validator warnings N4 opens on purpose
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'mvnotesize', cases: [], info: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  var st = (/[?&]state=([\w.-]+)/.exec(location.search) || [])[1] || '';
  out.info.state = st;
  var $ = function (id) { return document.getElementById(id); };
  // The plan's §2 table (notes) and §1a table (bars), stated here, never read from the app.
  var NOTE = { 11: { line: 14, h1: 20, h2: 34 }, 12: { line: 16, h1: 22, h2: 38 }, 13: { line: 17, h1: 23, h2: 40 }, 14: { line: 18, h1: 24, h2: 42 } };
  var BAR = { '': { px: 10, tag: 9, h: 17, h2: 36 }, '11': { px: 11, tag: 10, h: 20, h2: 36 }, large: { px: 12, tag: 11, h: 22, h2: 40 },
              '13': { px: 13, tag: 12, h: 23, h2: 42 }, xl: { px: 14, tag: 12, h: 25, h2: 46 } };
  var WARN = 'warn: SPTCal: 1 value(s) in this calendar were not in a form the app writes, and were ignored.';

  function settle(label) {
    var last = -1, n0 = 0;
    return T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      n0 = (n === last && n > 0) ? n0 + 1 : 0; last = n; return n0 >= 4;
    }, label || 'settle', 200, 50);
  }
  // Answer the unsaved-work guard if a re-open raises it: it is the app's own dialog.
  var guard = setInterval(function () {
    var b = [].find.call(document.querySelectorAll('button'), function (x) {
      return (x.textContent || '').trim() === 'Load' && x.offsetParent !== null;
    });
    if (b) b.click();
  }, 50);
  var seq = 0;
  async function openText(text, writes) {
    seq++;
    await T.openViaFakePicker(null, 'mvnotesize-' + seq + '.sptcal', { text: text, writes: writes || [] });
    await T.sleep(300);
    await settle('open ' + seq);
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'month grid ' + seq, 200, 100);
    await settle('month ' + seq);
  }
  async function saveNow(writes) {
    var save = $('save-file-btn'), n = writes.length;
    await T.until(function () { return !save.disabled && !save.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
    save.click();
    await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
    await T.sleep(200);
    return writes[writes.length - 1].text;
  }
  function noteCtl() { var s = $('pref-mv-notesize'); return s ? (s.value || '10') : null; }
  function barCtl() { var s = $('pref-mv-barsize'); return s ? s.value : null; }
  function sized() { return document.body.classList.contains('mv-note-sized'); }
  async function pickNote(v) {
    await T.pickSelect('pref-mv-notesize', v === '10' ? '' : v, v);
    await T.until(function () { return noteCtl() === v && sized() === (v !== '10'); }, 'note size ' + v, 60, 100);
    await settle('note size ' + v);
  }
  async function pickBar(v) {
    await T.pickSelect('pref-mv-barsize', v, v);
    await T.until(function () { return barCtl() === v; }, 'bar size ' + v, 60, 100);
    await settle('bar size ' + v);
  }
  function undoOff() { return !!$('undo-btn').disabled; }
  function dirty() { return ((($('save-status') || {}).textContent) || '').trim() === 'Unsaved changes'; }
  async function undo() { $('undo-btn').click(); await T.sleep(150); await settle('undo'); }
  async function redo() { $('redo-btn').click(); await T.sleep(150); await settle('redo'); }

  function monthShown() { var b = document.querySelector('#table-wrap .mv-monthyear'); return b ? (b.textContent || '').trim() : ''; }
  async function step(id) {
    var before = monthShown(), b = $(id);
    if (!b || b.disabled) return false;
    b.click();
    await T.until(function () { return monthShown() && monthShown() !== before; }, 'the month to change', 100, 50);
    await settle('the month to settle');
    return true;
  }
  async function goFirst() { for (var i = 0; i < 120; i++) { if (!(await step('mv-prev'))) break; } }
  async function goTo(title) {
    await goFirst();
    for (var i = 0; i < 120 && monthShown() !== title; i++) { if (!(await step('mv-next'))) break; }
    return monthShown() === title;
  }
  function zz(el) { return el.currentCSSZoom || 1; }
  function hOf(el) { return el.getBoundingClientRect().height / zz(el); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function kindOf(b) {
    var c = b.classList;
    return c.contains('mv-pill') ? 'pill' : c.contains('mv-hiatus-bar') ? 'band' : c.contains('mv-note-add') ? 'add'
      : c.contains('mv-note-block') ? 'note' : 'other';
  }
  // A sized note's natural line count: the element itself, laid out for a moment with no clamp and no fixed height.
  function naturalLines(b, line) {
    var s = b.style, keep = [s.display, s.height, s.webkitLineClamp];
    s.display = 'block'; s.height = 'auto'; s.webkitLineClamp = 'none';
    var h = b.getBoundingClientRect().height / zz(b);
    s.display = keep[0]; s.height = keep[1]; s.webkitLineClamp = keep[2];
    return Math.round((h - 6) / line);
  }
  // The month on screen: per week, Chrome's lane tracks and every bar in the grid (the absolutely placed "+" of a full
  // day is not in a lane, so it is left out). With `withLines`, each sized note's natural lines in a SECOND pass, once
  // every box has been read: unclamping one re-lays the week, and a box read after that is not the box the user sees.
  function measureMonth(withLines) {
    return Array.from(document.querySelectorAll('#table-wrap .mv-body > .mv-week')).map(function (wk, wi) {
      var layer = wk.querySelector(':scope > .mv-bars');
      var tracks = getComputedStyle(layer).gridTemplateRows.split(' ').map(parseFloat).map(r2);
      var items = Array.from(layer.children).filter(function (b) {
        return b.classList.contains('mv-bar') && !b.classList.contains('mv-note-add-full');
      }).map(function (b) {
        var gr = String(b.style.gridRow || '').match(/^\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/);
        var cs = getComputedStyle(b), tag = b.querySelector('.mv-pill-block');
        return { el: b, kind: kindOf(b), lane: gr ? +gr[1] - 1 : -1, span: gr && gr[2] ? +gr[2] : 1, h: r2(hOf(b)),
                 font: parseFloat(cs.fontSize), lineH: parseFloat(cs.lineHeight), tagFont: tag ? parseFloat(getComputedStyle(tag).fontSize) : null,
                 twoLine: b.classList.contains('mv-pill-2l'), sized: (b.getAttribute('style') || '').indexOf('--mvn-h1') >= 0,
                 clamp: String(cs.webkitLineClamp), display: cs.display,
                 text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
      });
      if (withLines) items.forEach(function (o) { if (o.sized) o.natural = naturalLines(o.el, o.lineH); });
      items.forEach(function (o) { delete o.el; });
      return { wi: wi, tracks: tracks, items: items };
    });
  }
  async function walk(withLines) {
    await goFirst();
    var months = [];
    for (var i = 0; i < 120; i++) {
      months.push({ month: monthShown(), html: $('table-wrap').innerHTML, weeks: measureMonth(withLines) });
      if (!(await step('mv-next'))) break;
    }
    return months;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  // The lane rules over a walk at bar size `barKey`. `px` = the calendar's note size, which every sized note must be
  // drawn at (null: notes may differ, as in N2). `bad` keeps the first few misses per rule, and its counts.
  function judge(months, barKey, px) {
    var B = BAR[barKey], R = { n: {}, bad: {}, counts: { sizedNotes: 0, cut: 0, twoLane: 0, plainLanes: 0, noteLanes: 0, barLanes: 0 } };
    function miss(rule, s) { R.n[rule] = (R.n[rule] || 0) + 1; R.bad[rule] = R.bad[rule] || []; if (R.bad[rule].length < 4) R.bad[rule].push(s); }
    months.forEach(function (m) { m.weeks.forEach(function (w) {
      var where0 = m.month + ' wk' + (w.wi + 1);
      var reach = w.items.reduce(function (x, it) { return Math.max(x, it.lane + it.span); }, 0);
      if (w.tracks.length < reach) miss('tracks', where0);
      for (var L = 0; L < w.tracks.length; L++) {
        var cover = w.items.filter(function (it) { return it.lane <= L && L < it.lane + it.span; });
        if (cover.some(function (it) { return it.span > 1 && (it.sized || it.twoLine); })) continue;   // shared out by the grid; judged by fit
        var bars = cover.filter(function (it) { return it.kind === 'pill' || it.kind === 'band'; });
        var notes1 = cover.filter(function (it) { return it.sized; });
        var want = bars.length ? B.h : 17;
        notes1.forEach(function (it) { want = Math.max(want, it.h); });
        if (notes1.length) R.counts.noteLanes++; else if (bars.length) R.counts.barLanes++; else R.counts.plainLanes++;
        if (Math.abs(w.tracks[L] - want) > 0.01) miss('lane', where0 + ' lane' + (L + 1) + ': ' + w.tracks[L] + ' vs ' + want);
      }
      w.items.forEach(function (it) {
        var where = where0 + ' ' + it.kind + ' "' + it.text + '"';
        var lanes = sum(w.tracks.slice(it.lane, it.lane + it.span)) + 2 * (it.span - 1);
        if (it.sized) {
          R.counts.sizedNotes++;
          var G = NOTE[it.font];
          if (!G) { miss('sizedFont', where + ': ' + it.font); return; }
          if (px && it.font !== +px) miss('atSize', where + ': ' + it.font + ' vs ' + px);
          if (it.lineH !== G.line) miss('lineH', where + ': ' + it.lineH + ' vs ' + G.line);
          if (it.span > 2) miss('span', where + ': ' + it.span);
          if (it.span === 2) R.counts.twoLane++;
          var wantH = it.span === 2 ? G.h2 : G.h1;
          if (Math.abs(it.h - wantH) > 0.02) miss('noteH', where + ': ' + it.h + ' vs ' + wantH);
          if (it.h > lanes + 0.02) miss('noteFit', where + ': ' + it.h + ' in ' + r2(lanes));
          // Chrome 156 reports a clamped -webkit-box as flow-root; the clamp is what matters.
          if (it.clamp !== '2' || (it.display !== '-webkit-box' && it.display !== 'flow-root')) miss('clamp', where + ': ' + it.clamp + ' ' + it.display);
          if (it.natural != null) {
            if (it.span !== Math.min(2, Math.max(1, it.natural))) miss('measure', where + ': ' + it.span + ' lanes, ' + it.natural + ' lines');
            if (it.natural > 2) R.counts.cut++;
          }
        } else if (it.kind === 'pill' || it.kind === 'band') {
          var wb = it.twoLine ? B.h2 : B.h;
          if (Math.abs(it.h - wb) > 0.02) miss('barH', where + ': ' + it.h + ' vs ' + wb);
          if (it.font !== B.px && it.font >= 10) miss('barFont', where + ': ' + it.font + ' vs ' + B.px);
          if (it.tagFont != null && it.tagFont !== B.tag) miss('tagFont', where + ': ' + it.tagFont + ' vs ' + B.tag);
        } else if (Math.abs(it.h - lanes) > 0.02) miss('fill-' + it.kind, where + ' lane' + (it.lane + 1) + ': ' + it.h + ' vs ' + r2(lanes));
      });
    }); });
    R.ok = Object.keys(R.n).length === 0;
    return R;
  }
  function tracksOf(months) { return months.map(function (m) { return m.weeks.map(function (w) { return w.tracks; }); }); }

  try {
    await T.appReady();
    var text0 = await (await fetch('/tests/fixtures/' + st + '.sptcal', { cache: 'no-store' })).text();
    var base = JSON.parse(text0);
    base.viewMode = 'month'; delete base.mvNoteSize; delete base.mvBarSize;
    var text = JSON.stringify(base);

    // ---- N0: 10 px, as every calendar saved before the setting opens ----
    var w0 = [];
    await openText(text, w0);
    await T.openSettings('prefs');
    var sel = $('pref-mv-notesize');
    var inCard = !!(sel && sel.closest('.prefs-card') && sel.closest('.pref-view-month'));
    var std = await walk(true), J0 = judge(std, '', null);
    var mvnAt10 = std.some(function (m) { return m.html.indexOf('--mvn-') >= 0; });
    kase('N0', 'opened with no key: Note size shows 10 px in the Month view card (.prefs-card), no class, no note carries --mvn-h1, every lane as at 10 px, not dirty, Undo off',
         noteCtl() === '10' && inCard && !sized() && !mvnAt10 && J0.ok && undoOff() && !dirty(),
         { months: std.length, ctl: noteCtl(), inCard: inCard, sized: sized(), mvn: mvnAt10, misses: J0.n, first: J0.bad, undoOff: undoOff(), dirty: dirty() });

    // ---- N1: 11, 12, 13, 14 px ----
    var htmlAt = { '10': std[std.length - 1].html }, J = {};
    for (var px of ['11', '12', '13', '14']) {
      await pickNote(px);
      // The undo step is banked on a short debounce, so Undo lights a moment after the pick (N3 counts the steps).
      await T.until(function () { return !undoOff(); }, 'Undo to light', 40, 100).catch(function () {});
      var picked = { ctl: noteCtl(), sized: sized(), dirty: dirty(), undoOn: !undoOff() };
      var months = await walk(true);
      htmlAt[px] = months[months.length - 1].html;
      J[px] = judge(months, '', px);
      kase('N1-' + px, px + ' px: the dropdown and the class follow, dirty, Undo on; every note at ' + px + ' px, exactly its one- or two-line height, clamped at two, given min(2, its natural lines) lanes; every other lane and box as at 10 px',
           picked.ctl === px && picked.sized && picked.dirty && picked.undoOn && J[px].ok && J[px].counts.sizedNotes > 0,
           { picked: picked, counts: J[px].counts, misses: J[px].n, first: J[px].bad });
    }

    // ---- N3: undo and redo, one step per pick ----
    var u = { back: [], fwd: [] };
    for (var ub of ['13', '12', '11', '10']) { await undo(); u.back.push({ want: ub, ctl: noteCtl(), sized: sized(), same: $('table-wrap').innerHTML === htmlAt[ub] }); }
    u.offAt10 = undoOff();
    for (var rf = 0; rf < 4; rf++) await redo();
    u.fwd = { ctl: noteCtl(), sized: sized(), same: $('table-wrap').innerHTML === htmlAt['14'] };
    kase('N3', 'each pick is ONE undo step: Undo from 14 gives 13, 12, 11, then 10 (Undo off); Redo x4 gives 14; the month byte-identical to the one first drawn at each size',
         u.back.every(function (x) { return x.ctl === x.want && x.sized === (x.want !== '10') && x.same; }) && u.offAt10 &&
         u.fwd.ctl === '14' && u.fwd.sized && u.fwd.same, u);

    // ---- N2: one note sized on its own, from the text style bar, in a 10 px calendar ----
    await openText(text, []);
    await T.closeSettings();
    // A month holding a day NOTE (the "+" slots carry data-note-kind="day" too, so the note's class is part of the test).
    var first = std.filter(function (m) { return /class="mv-bar mv-note-block[^"]*" data-note-week="[^"]*" data-note-day="[^"]*" data-note-kind="day"/.test(m.html); })[0] || null;
    var n2 = { month: first && first.month };
    if (first && await goTo(first.month)) {
      var dayNote = document.querySelector('#table-wrap .mv-bars > .mv-note-block[data-note-kind="day"]');
      n2.text = (dayNote.textContent || '').slice(0, 40);
      var before = measureMonth(false).map(function (w) { return w.tracks; }), html10 = $('table-wrap').innerHTML;
      dayNote.scrollIntoView({ block: 'center' }); await T.sleep(80);
      var r = dayNote.getBoundingClientRect(), px0 = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true, composed: true, button: 0, detail: 1 };
      var tgt = document.elementFromPoint(px0.clientX, px0.clientY) || dayNote;
      tgt.dispatchEvent(new MouseEvent('mousedown', px0)); tgt.dispatchEvent(new MouseEvent('mouseup', px0)); tgt.dispatchEvent(new MouseEvent('click', px0));
      await T.sleep(250);
      var bar = document.querySelector('.view-toggle-row .style-bar-host .style-bar'), szSel = bar && bar.querySelector('.hf-size');
      n2.sizes = szSel ? [].map.call(szSel.options, function (o) { return o.value; }).filter(Boolean).join(',') : null;
      if (szSel) { szSel.value = '14'; szSel.dispatchEvent(new Event('change', { bubbles: true })); await T.sleep(300); await settle('styled'); }
      var after = measureMonth(true), sizedNow = [];
      after.forEach(function (w) { w.items.forEach(function (it) { if (it.sized) sizedNow.push({ wk: w.wi, text: it.text, font: it.font, h: it.h, span: it.span, natural: it.natural }); }); });
      var JN = judge([{ month: monthShown(), weeks: after }], '', null);
      var changedWeeks = after.map(function (w, i) { return JSON.stringify(w.tracks) !== JSON.stringify(before[i]) ? i : -1; }).filter(function (i) { return i >= 0; });
      n2.sized = sizedNow; n2.cls = sized(); n2.changedWeeks = changedWeeks; n2.misses = JN.n; n2.first = JN.bad; n2.dirty = dirty();
      // Back to the calendar's size: picking 10 stores nothing, and the month is the one first drawn.
      szSel = document.querySelector('.view-toggle-row .style-bar-host .style-bar .hf-size');
      if (szSel) { szSel.value = '10'; szSel.dispatchEvent(new Event('change', { bubbles: true })); await T.sleep(300); await settle('unstyled'); }
      n2.backCls = sized(); n2.backSame = $('table-wrap').innerHTML === html10;
      // N2b: the other way round. The calendar at 14 px, and the same note set to 8 px: it keeps its own size and
      // today's 10 px rule (no --mvn-h1, filling its lanes), while every other note is at 14 px.
      await pickNote('14');
      dayNote = [].filter.call(document.querySelectorAll('#table-wrap .mv-bars > .mv-note-block[data-note-kind="day"]'), function (b) {
        return (b.textContent || '').slice(0, 40) === n2.text; })[0];
      if (dayNote) {
        dayNote.scrollIntoView({ block: 'center' }); await T.sleep(80);
        r = dayNote.getBoundingClientRect(); px0 = Object.assign({}, px0, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
        tgt = document.elementFromPoint(px0.clientX, px0.clientY) || dayNote;
        tgt.dispatchEvent(new MouseEvent('mousedown', px0)); tgt.dispatchEvent(new MouseEvent('mouseup', px0)); tgt.dispatchEvent(new MouseEvent('click', px0));
        await T.sleep(250);
        szSel = document.querySelector('.view-toggle-row .style-bar-host .style-bar .hf-size');
        if (szSel) { szSel.value = '8'; szSel.dispatchEvent(new Event('change', { bubbles: true })); await T.sleep(300); await settle('styled 8'); }
        var m8 = measureMonth(true), own = null, others14 = 0, othersBad = 0;
        m8.forEach(function (w) { w.items.forEach(function (it) {
          if (it.kind !== 'note') return;
          if (it.text === n2.text) own = { font: it.font, sized: it.sized };
          else if (it.sized) { if (it.font === 14) others14++; else othersBad++; }
        }); });
        var J8 = judge([{ month: monthShown(), weeks: m8 }], '', null);
        n2.b = { own: own, others14: others14, othersBad: othersBad, misses: J8.n, first: J8.bad };
      }
    }
    var okN2 = !!n2.sized && n2.sized.length === 1 && n2.sized[0].font === 14 && n2.cls && n2.changedWeeks.length === 1 &&
               n2.changedWeeks[0] === n2.sized[0].wk && Object.keys(n2.misses).length === 0 && n2.sizes === '6,7,8,9,10,11,12,13,14' &&
               n2.dirty && !n2.backCls && n2.backSame &&
               !!n2.b && !!n2.b.own && n2.b.own.font === 8 && !n2.b.own.sized && n2.b.others14 > 0 && n2.b.othersBad === 0 &&
               Object.keys(n2.b.misses).length === 0;
    kase('N2', 'R4: a day note set to 14 px in the style bar, in a 10 px calendar, is the only sized note, in its own taller lanes (only its week changes); the bar offers notes 6-14; picking 10 stores nothing and gives back the first month exactly; then, the calendar at 14 px, the same note set to 8 px keeps 8 px and the 10 px rule while every other note is at 14',
         okN2, n2);
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'mvnotesize threw (N0-N3): ' + String(e && e.message || e), false);
  }

  try {
    // ---- N4: Save and Load ----
    var w4 = [];
    await openText(text, w4);
    await T.openSettings('prefs');
    await pickNote('14');
    var saved = await saveNow(w4), snap = JSON.parse(saved);
    await pickNote('10');
    var savedStd = await saveNow(w4), snapStd = JSON.parse(savedStd);
    var ids0 = Object.keys(snapStd.fields.byId).sort(), ids1 = Object.keys(snap.fields.byId).sort();
    var warn0 = (T.appHealth().errors || []).filter(function (e) { return e === WARN; }).length;
    var l = {};
    await openText(saved, []); l.saved = { ctl: noteCtl(), sized: sized() };
    var plain = JSON.parse(saved); delete plain.mvNoteSize;
    await openText(JSON.stringify(plain), []); l.noKey = { ctl: noteCtl(), sized: sized() };
    l.junk = [];
    for (var v of ['15', 14, true, 'toString']) {
      await openText(saved, []);   // from 14 px each time, so a junk value that stuck would show
      var j = JSON.parse(saved); j.mvNoteSize = v;
      await openText(JSON.stringify(j), []);
      l.junk.push({ v: JSON.stringify(v), ctl: noteCtl(), sized: sized() });
    }
    var warns = (T.appHealth().errors || []).filter(function (e) { return e === WARN; }).length - warn0;
    kase('N4', 'Save writes mvNoteSize "14", a Save at 10 px writes NO key, the same fields.byId ids (no size id); Load opens at 14, with no key at 10 px; "15", 14, true and "toString" each open at 10 px, one validator warning each',
         snap.mvNoteSize === '14' && !('mvNoteSize' in snapStd) && JSON.stringify(ids0) === JSON.stringify(ids1) &&
         !ids1.some(function (k) { return /bar-?size|note-?size/.test(k); }) &&
         l.saved.ctl === '14' && l.saved.sized && l.noKey.ctl === '10' && !l.noKey.sized &&
         l.junk.every(function (x) { return x.ctl === '10' && !x.sized; }) && warns === 4,
         { mvNoteSize: snap.mvNoteSize, stdHasKey: 'mvNoteSize' in snapStd, added: ids1.filter(function (k) { return ids0.indexOf(k) < 0; }),
           lost: ids0.filter(function (k) { return ids1.indexOf(k) < 0; }), l: l, warnings: warns });
    out.sptcal = btoa(unescape(encodeURIComponent(saved)));   // the minted 14 px calendar (plan step 3's fixture)

    // ---- N5: the phase bar size's 11 and 13 px ----
    await openText(text, w4);
    await T.openSettings('prefs');
    var n5 = {};
    for (var bk of ['11', '13']) {
      await pickBar(bk);
      var bm = await walk(false), JB = judge(bm, bk, null);
      var bsaved = JSON.parse(await saveNow(w4));
      n5[bk] = { body: document.body.classList.contains('mv-bar-' + bk), misses: JB.n, first: JB.bad, lanes: [JB.counts.barLanes, JB.counts.plainLanes], saved: bsaved.mvBarSize };
    }
    await pickBar('large'); n5.large = JSON.parse(await saveNow(w4)).mvBarSize;
    await pickBar('xl'); n5.xl = JSON.parse(await saveNow(w4)).mvBarSize;
    var j13 = JSON.parse(saved); j13.mvBarSize = '13';
    await openText(JSON.stringify(j13), []); n5.loaded = { ctl: barCtl(), body: document.body.classList.contains('mv-bar-13') };
    kase('N5', 'bar sizes 11 and 13 px from the dropdown: the class, every bar and band 20 / 23 px in 11 / 13 px text with 10 / 12 px tags, saved as "11" / "13" and loaded back; 12 and 14 px still saved as "large" / "xl"',
         ['11', '13'].every(function (k) { return n5[k].body && Object.keys(n5[k].misses).length === 0 && n5[k].lanes[0] > 0 && n5[k].saved === k; }) &&
         n5.large === 'large' && n5.xl === 'xl' && n5.loaded.ctl === '13' && n5.loaded.body, n5);

    // ---- N6: zoom, 14 px notes ----
    var jz = JSON.parse(saved); delete jz.mvBarSize;
    await openText(JSON.stringify(jz), []);
    await goFirst();
    var at100 = [], z = {};
    function sig() { return JSON.stringify(measureMonth(false).map(function (w) { return [w.tracks, w.items.map(function (it) { return it.h; })]; })); }
    for (var mi = 0; mi < 4; mi++) { at100.push(sig()); if (!(await step('mv-next'))) break; }
    for (var zv of [0.75, 1.5, 2]) {
      document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom: zv } }));
      await T.sleep(400); await settle('zoom ' + zv); await goFirst();
      var same = true;
      for (var mj = 0; mj < at100.length; mj++) { if (sig() !== at100[mj]) same = false; if (!(await step('mv-next'))) break; }
      var wk1 = document.querySelector('#table-wrap .mv-week');
      z[zv] = { zoom: wk1 && wk1.currentCSSZoom, same: same };
    }
    document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom: 1 } }));
    await T.sleep(400); await settle('zoom 1');
    kase('N6', '14 px notes at 75%, 150% and 200% zoom: the first four months have exactly their 100% lanes and boxes, in their own px',
         [0.75, 1.5, 2].every(function (k) { return z[k].zoom === k && z[k].same; }), z);

    // ---- N7: New ----
    var n7 = { before: noteCtl() };
    $('new-file-btn').click();
    for (var ni = 0; ni < 30; ni++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
    await T.sleep(300);
    n7.ctl = noteCtl(); n7.sized = sized();
    kase('N7', 'New, from 14 px, starts at 10 px (the dropdown and the class)', n7.before === '14' && n7.ctl === '10' && !n7.sized, n7);

    clearInterval(guard);
    var all = T.appHealth().errors || [];
    var others = all.filter(function (e) { return e !== WARN; });
    kase('E0', 'no console errors, and exactly the four validator warnings N4 opens on purpose',
         others.length === 0 && all.length - others.length === 4, { warnings: all.length - others.length, errors: others.slice(0, 5) });
  } catch (e) {
    clearInterval(guard);
    out.EX2 = String(e && e.stack || e);
    kase('EX2', 'mvnotesize threw (N4-N7): ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
