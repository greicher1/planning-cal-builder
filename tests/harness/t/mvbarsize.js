// mvbarsize -- the month view's "Phase bar size" (MONTH-BAR-SIZE-PLAN.md step 2; owner rulings R0-R7 by picker,
// 27 Oct 2026): Standard · Large · Extra large, phase bars AND hiatus bands (R1(b)), CALENDAR DATA saved as
// captureSnapshot()'s `mvBarSize` (absent = Standard). On screen it is legacy.css's E1 block (a <body> class, every
// rule under #table-wrap) and app.js's E2 (mvPillLineCount measures at the bar's own size). The month PDF's half is
// plan step 3; gates 10 and 13, byte-identical at Standard, hold the frozen surface.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh mvbarsize 900
//     Two-line custom bars, an all-phase hiatus, notes over several lanes. B5 renames the one-day "Fittings" bar to a
//     label that fits one line at 10 px and not at 12 px (measured here, at this window's day width).
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hiatus-blanklabel ./run.sh mvbarsize 900
//     Three hiatus bands whose labels were emptied (the 1 Oct 2026 "full height" ruling).
//
// Every calendar is opened through the real Load path (T.openViaFakePicker) as JSON with viewMode 'month' and no
// mvBarSize, so the undo stack starts EMPTY; every size is picked by a click on its segment's label, as a user picks it.
// Measured in the box's own px (rect / currentCSSZoom), lanes read from Chrome's computed grid-template-rows.
//
// CASES
//   B0   opened with no key: the control shows Standard, inside .prefs-card in the Month view card; no size class on
//        <body>; every lane and every bar of every month 17 px; not dirty, Undo off
//   B1-<size>  after a click on Large / Extra large: the control and the class follow, the calendar is dirty, Undo on;
//        in every month, every lane with no phase bar or band is EXACTLY 17 px, every lane holding a one-lane bar or
//        band EXACTLY the size's bar height (22 / 25), every bar, band, note and "+" fills exactly the lanes it spans,
//        text and grey tags at the size's px, every band whose label was emptied as tall as a labelled one, and no
//        one-line bar or band overflows its box
//   P0   the renderer places every bar in the same lane at every size, except in a week where E2 now wraps a one-day
//        custom bar it did not wrap before (B5's week)
//   B2   at Large, every gesture lands on a bigger bar: a pill is on top at its centre and a plain press there arms the
//        body drag (release, nothing moved); a right-click at a pill's centre opens the day menu for that phase; one at
//        a band's centre opens it with the hiatus section; a pointer move over a pill shows its edge grips, each as
//        tall as the pill and level with it; a click on a "+" opens the note editor; a click on the day number opens
//        the day menu for that day
//   B4   both sizes at 75%, 150% and 200% zoom: the month on screen has exactly the lanes it has at 100%, in its own px
//   B5   (mvnotes) E2: at Standard the renamed one-day bar is one uncut line; at Large and Extra large it wraps to two
//        lines, uncut, and no one-day custom bar anywhere is cut on one line
//   B3a  each pick is ONE undo step: Undo from Extra large gives Large, again gives Standard (Undo off), Redo twice
//        gives Extra large; the month on screen byte-identical to the one first drawn at each size
//   B3b  Save writes mvBarSize: "xl", and fields.byId has exactly the opened file's ids (the control's radios carry
//        ids, all inside .prefs-card)
//   B3c  Load of that text opens at Extra large; the same file with no key, loaded right after, opens at Standard
//        (restore unconditionally); so do "huge", true and "toString", each with one validator warning
//   B6   a shareable copy made at Extra large carries mvBarSize: "xl" in its saved state and a bare #table-wrap
//   B7   New, from Extra large, starts at Standard
//   E0   no console errors, and exactly the three validator warnings B3c opens on purpose
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'mvbarsize', cases: [], info: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  var st = (/[?&]state=([\w.-]+)/.exec(location.search) || [])[1] || '';
  out.info.state = st;
  var $ = function (id) { return document.getElementById(id); };
  var SIZES = {
    standard: { text: 10, tag: 9, h: 17, r: 9 },
    large: { cls: 'mv-bar-large', text: 12, tag: 11, h: 22, r: 11 },
    xl: { cls: 'mv-bar-xl', text: 14, tag: 12, h: 25, r: 13 },
  };
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
    await T.openViaFakePicker(null, 'mvbarsize-' + seq + '.sptcal', { text: text, writes: writes || [] });
    await T.sleep(300);
    await settle('open ' + seq);
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'month grid ' + seq, 200, 100);
    await settle('month ' + seq);
    await T.openSettings('prefs');
  }
  async function saveNow(writes) {
    var save = $('save-file-btn'), n = writes.length;
    await T.until(function () { return !save.disabled && !save.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
    save.click();
    await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
    await T.sleep(200);
    return writes[writes.length - 1].text;
  }
  function ctl() {
    var r = [].filter.call(document.querySelectorAll('input[name="mv-bar-size"]'), function (x) { return x.checked; });
    return r.length === 1 ? r[0].value : null;
  }
  function bodySize() {
    var c = document.body.classList;
    return c.contains('mv-bar-xl') ? (c.contains('mv-bar-large') ? 'both' : 'xl') : c.contains('mv-bar-large') ? 'large' : 'standard';
  }
  async function pick(v) {
    var lab = document.querySelector('label[for="mv-bar-size-' + v + '"]');
    if (!lab) throw new Error('no segment label for ' + v);
    lab.click();
    await T.until(function () { return ctl() === v && bodySize() === v; }, 'picked ' + v, 60, 100);
    await settle('size ' + v);
  }
  function undoOff() { return !!$('undo-btn').disabled; }
  function dirty() { return ((($('save-status') || {}).textContent) || '').trim() === 'Unsaved changes'; }
  async function undo() { $('undo-btn').click(); await T.sleep(150); await settle('undo'); }
  async function redo() { $('redo-btn').click(); await T.sleep(150); await settle('redo'); }

  function monthShown() {
    var b = document.querySelector('#table-wrap .mv-monthyear');
    return b ? (b.textContent || '').trim() : '';
  }
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
  // The month on screen: per week, Chrome's lane tracks and every bar in the grid (the absolutely placed "+" of a
  // full day is not in a lane, so it is left out).
  function measureMonth() {
    return Array.from(document.querySelectorAll('#table-wrap .mv-body > .mv-week')).map(function (wk, wi) {
      var layer = wk.querySelector(':scope > .mv-bars');
      var tracks = getComputedStyle(layer).gridTemplateRows.split(' ').map(parseFloat).map(r2);
      var items = Array.from(layer.children).filter(function (b) {
        return b.classList.contains('mv-bar') && !b.classList.contains('mv-note-add-full');
      }).map(function (b) {
        var gr = String(b.style.gridRow || '').match(/^\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/);
        var cs = getComputedStyle(b), tag = b.querySelector('.mv-pill-block');
        var oneDay = (+b.style.gridColumnEnd - +b.style.gridColumnStart) === 1;
        return { kind: kindOf(b), lane: gr ? +gr[1] - 1 : -1, span: gr && gr[2] ? +gr[2] : 1, h: r2(hOf(b)),
                 font: parseFloat(cs.fontSize), tagFont: tag ? parseFloat(getComputedStyle(tag).fontSize) : null,
                 radius: parseFloat(cs.borderTopLeftRadius), clipY: b.scrollHeight - b.clientHeight,
                 cutX: b.scrollWidth > b.clientWidth + 0.5, twoLine: b.classList.contains('mv-pill-2l'),
                 customOneDay: oneDay && /^custom\d+$/.test(b.getAttribute('data-ph') || ''),
                 empty: !(b.textContent || '').trim(), text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
      });
      return { wi: wi, tracks: tracks, items: items };
    });
  }
  async function walk() {
    await goFirst();
    var months = [];
    for (var i = 0; i < 120; i++) {
      months.push({ month: monthShown(), html: $('table-wrap').innerHTML, weeks: measureMonth() });
      if (!(await step('mv-next'))) break;
    }
    return months;
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  // The lane rules at one size, over a walk. `bad` keeps the first few misses per rule, and its counts.
  function judge(months, key) {
    var S = SIZES[key], R = { smallLanes: 0, bigLanes: 0, sharedLanes: 0, bad: {}, n: {}, emptyBands: [], clipY: {} };
    function miss(rule, s) { R.n[rule] = (R.n[rule] || 0) + 1; R.bad[rule] = R.bad[rule] || []; if (R.bad[rule].length < 5) R.bad[rule].push(s); }
    months.forEach(function (m) {
      m.weeks.forEach(function (w) {
        var reach = w.items.reduce(function (x, it) { return Math.max(x, it.lane + it.span); }, 0);
        if (w.tracks.length < reach) miss('tracks', m.month + ' wk' + (w.wi + 1));
        for (var L = 0; L < w.tracks.length; L++) {
          var cover = w.items.filter(function (it) { return it.lane <= L && L < it.lane + it.span; });
          var big = cover.filter(function (it) { return it.kind === 'pill' || it.kind === 'band'; });
          var where = m.month + ' wk' + (w.wi + 1) + ' lane' + (L + 1) + ': ' + w.tracks[L];
          if (!big.length) { R.smallLanes++; if (Math.abs(w.tracks[L] - 17) > 0.01) miss('smallLane', where); }
          else if (big.some(function (it) { return it.span > 1; })) R.sharedLanes++;   // a two-line bar shares its height out
          else { R.bigLanes++; if (Math.abs(w.tracks[L] - S.h) > 0.01) miss('bigLane', where); }
        }
        w.items.forEach(function (it) {
          var where = m.month + ' wk' + (w.wi + 1) + ' ' + it.kind + ' "' + it.text + '"';
          var lanes = sum(w.tracks.slice(it.lane, it.lane + it.span)) + 2 * (it.span - 1);
          var big = it.kind === 'pill' || it.kind === 'band';
          // At Large and Extra large a bar or band has a FIXED height (E1): the size's bar height, or two lines' worth
          // on a wrapping one-day bar, and never more than its lanes. Everything else stretches to fill its lanes, as
          // every bar does at Standard.
          if (big && key !== 'standard') {
            var want = it.twoLine ? 2 * S.text * 1.5 + 4 : S.h;
            if (Math.abs(it.h - want) > 0.02 || it.h > lanes + 0.02) miss('fill', where + ': ' + it.h + ' vs ' + want + ' in ' + r2(lanes));
          } else if (Math.abs(it.h - lanes) > 0.02) miss('fill', where + ': ' + it.h + ' vs ' + r2(lanes));
          if (!big) return;
          if (it.font !== S.text) miss('font', where + ': ' + it.font);
          if (it.tagFont !== null && it.tagFont !== S.tag) miss('font', where + ': tag ' + it.tagFont);
          if (it.radius !== S.r) miss('radius', where + ': ' + it.radius);
          R.clipY[it.clipY] = (R.clipY[it.clipY] || 0) + 1;
          if (key !== 'standard' && !it.twoLine && it.clipY > 0) miss('clip', where + ': ' + it.clipY);
          if (it.customOneDay && !it.twoLine && it.cutX) miss('cutOneDay', where);
          if (it.kind === 'band' && it.empty) R.emptyBands.push(it.h);
        });
      });
    });
    return R;
  }
  function placement(months) {
    return months.map(function (m) { return m.weeks.map(function (w) {
      return JSON.stringify(w.items.map(function (it) { return [it.kind, it.lane, it.span, it.text]; })); }); });
  }
  function hasCustomTwoLine(m) { return m.weeks.some(function (w) { return w.items.some(function (it) { return it.twoLine; }); }); }

  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); }, 'restored', 200, 100);
    await settle('first load');
    var text0 = await (await fetch('/tests/fixtures/' + st + '.sptcal', { cache: 'no-store' })).text();
    var base = JSON.parse(text0);
    base.viewMode = 'month';
    delete base.mvBarSize;

    // B5's label (mvnotes): one that fits a one-day bar's line at 10 px and not at 12, at THIS window's day width, so
    // E2's measuring at the bar's own size is what decides whether it wraps. The room is mvPillLineCount's: the day
    // minus the bar's 1 px margins, 8 px padding and 1 px border each side.
    var b5 = null, fb = base.fields && base.fields.byId;
    if (fb && fb['name-custom3'] && fb['name-custom3'].value === 'Fittings') {
      if (!document.querySelector('#table-wrap .mv-daycell')) { $('view-month-btn').click(); await settle('month for B5'); }
      var cellW = document.querySelector('#table-wrap .mv-daycell').getBoundingClientRect().width;
      var room = cellW - 2 - 16 - 2, cv = document.createElement('canvas').getContext('2d');
      var wOf = function (s, px) { cv.font = '600 ' + px + 'px Inter'; return cv.measureText(s).width; };
      var src = 'Wardrobe Fittings For The Principal Cast And Day Players';
      for (var n = 8; n <= src.length; n++) {
        var s = src.slice(0, n).trim();
        if (wOf(s, 12) > room + 6) { if (wOf(s, 10) < room - 6) b5 = s; break; }
      }
      out.info.b5 = { cellW: r2(cellW), room: r2(room), label: b5, w10: b5 && r2(wOf(b5, 10)), w12: b5 && r2(wOf(b5, 12)) };
      if (b5) fb['name-custom3'] = { value: b5 };
      // THE PDF'S HALF (plan step 3): the minted fixture's other one-day bar (custom1, 4/15/26) gets a label that fits
      // one line at 10 px in the PDF's own box and not at 12, so its WRITTEN PDF shows the writer wrapping at the bar's
      // size (gate.sh reads it with pdftotext). The PDF's box is narrower than the screen's: the writer's
      // MVL_GEOMETRY.noteBoxW less 2 x (8 + 1), about 120.2 px on Letter landscape (stated here, never read from the
      // writer). At 12 px it still fits the screen's wider box, so on screen it stays one line at Standard and Large.
      if (fb['name-custom1'] && fb['name-custom1'].value === 'Network Table Read and Studio Notes Session') {
        var pdfRoom = ((1056 - 2 * 8 * 96 / 25.4 - 4 - 4) - 6) / 7 - 2 - 18, srcP = 'Camera Prep Day For The Second Unit Crew';
        var bP = null;
        for (var np = 8; np <= srcP.length; np++) {
          var sp = srcP.slice(0, np).trim();
          if (wOf(sp, 10) >= pdfRoom - 13.7) { if (wOf(sp, 10) <= pdfRoom - 6 && wOf(sp, 12) >= pdfRoom + 6 && wOf(sp, 12) <= room - 4) bP = sp; break; }
        }
        out.info.b5pdf = { pdfRoom: r2(pdfRoom), label: bP, w10: bP && r2(wOf(bP, 10)), w12: bP && r2(wOf(bP, 12)) };
        if (bP) fb['name-custom1'] = { value: bP };
      }
    }
    var text = JSON.stringify(base);
    out.info.window = [innerWidth, innerHeight];

    // ---- B0: Standard, as every calendar saved before the setting opens ----
    var w0 = [];
    await openText(text, w0);
    var input = document.querySelector('input[name="mv-bar-size"]');
    var inCard = !!(input && input.closest('.prefs-card') && input.closest('.pref-view-month'));
    var std = await walk(), J0 = judge(std, 'standard');
    kase('B0', 'opened with no key: the control shows Standard in the Month view card (.prefs-card), no size class, every lane and bar 17 px, not dirty, Undo off',
         ctl() === 'standard' && inCard && bodySize() === 'standard' && !J0.n.smallLane && !J0.n.bigLane && !J0.n.fill && !J0.n.font && undoOff() && !dirty(),
         { months: std.length, ctl: ctl(), inCard: inCard, body: bodySize(), misses: J0.n, first: J0.bad, undoOff: undoOff(), dirty: dirty() });

    // ---- B1: Large, then Extra large ----
    var walks = { standard: std }, J = { standard: J0 };
    async function sizeCase(key) {
      await pick(key);
      // The undo step is banked after the app's undo debounce (UNDO_DEBOUNCE_MS), not inside the click.
      try { await T.until(function () { return !undoOff(); }, 'Undo on after ' + key, 40, 100); } catch (e) {}
      var picked = { ctl: ctl(), body: bodySize(), dirty: dirty(), undoOn: !undoOff() };
      var m = await walk(), R = judge(m, key);
      walks[key] = m; J[key] = R;
      var S = SIZES[key];
      kase('B1-' + key, key + ': control, class, dirty and Undo follow the click; lanes with no bar or band exactly 17 px, bar lanes exactly ' + S.h +
           ' px, every bar fills its lanes, text ' + S.text + '/' + S.tag + ' px, emptied bands full height, no one-line bar overflows',
           picked.ctl === key && picked.body === key && picked.dirty && picked.undoOn && !R.n.tracks && !R.n.smallLane && !R.n.bigLane && !R.n.fill &&
           !R.n.font && !R.n.radius && !R.n.clip && R.emptyBands.every(function (h) { return Math.abs(h - S.h) <= 0.02; }) && R.bigLanes > 0,
           { picked: picked, smallLanes: R.smallLanes, bigLanes: R.bigLanes, sharedLanes: R.sharedLanes, emptyBands: R.emptyBands, clipY: R.clipY, misses: R.n, first: R.bad });
    }
    await sizeCase('large');

    // ---- P0: placement unchanged, but where E2 now wraps ----
    var p0 = placement(std), p1 = placement(walks.large), moved = [];
    p0.forEach(function (weeks, mi) { weeks.forEach(function (s, wi) { if (p1[mi] && s !== p1[mi][wi]) moved.push({ month: std[mi].month, week: wi + 1, wraps: hasCustomTwoLine(walks.large[mi]) }); }); });
    kase('P0', 'every bar sits in the same lane at Standard and Large, except in weeks where E2 now wraps a one-day custom bar',
         std.length === walks.large.length && moved.every(function (x) { return x.wraps; }) && (b5 ? moved.length > 0 : true), { changedWeeks: moved });

    // ---- B2: the gestures, at Large, in the first month with both a bar and a band (else the first with a bar) ----
    await goFirst();
    var target = null, firstBar = null;
    for (var gi = 0; gi < 120; gi++) {
      var hasPill = !!document.querySelector('#table-wrap .mv-pill'), hasBand = !!document.querySelector('#table-wrap .mv-hiatus-bar');
      if (hasPill && !firstBar) firstBar = monthShown();
      if (hasPill && hasBand) { target = monthShown(); break; }
      if (!(await step('mv-next'))) break;
    }
    if (!target) await goTo(firstBar);
    out.info.b2Month = monthShown();
    var tw = $('table-wrap');
    function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), r: r }; }
    async function intoView(el) {
      var r = el.getBoundingClientRect(), q = tw.getBoundingClientRect();
      if (r.top < q.top + 20 || r.bottom > q.bottom - 20) { tw.scrollTop += (r.top + r.height / 2) - (q.top + q.height / 2); await T.sleep(250); }
    }
    function mouse(el, type, x, y, button) {
      var b = button || 0;
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: b, buttons: type === 'mouseup' || type === 'click' ? 0 : (b === 2 ? 2 : 1), view: window }));
    }
    function rclickAt(x, y) { var el = document.elementFromPoint(x, y); mouse(el, 'mousedown', x, y, 2); mouse(el, 'contextmenu', x, y, 2); mouse(el, 'mouseup', x, y, 2); return el; }
    function lclickAt(x, y) { var el = document.elementFromPoint(x, y); mouse(el, 'mousedown', x, y); mouse(el, 'mouseup', x, y); mouse(el, 'click', x, y); return el; }
    function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }
    var g = {};
    // A one-line pill, the widest, so its centre is clear of grips and neighbours.
    var pills = [].filter.call(tw.querySelectorAll('.mv-pill[data-ph]'), function (p) { return !p.classList.contains('mv-pill-2l'); });
    pills.sort(function (a, b) { return b.getBoundingClientRect().width - a.getBoundingClientRect().width; });
    var pill = pills[0];
    if (pill) {
      await intoView(pill);
      var pc = centre(pill), ph = pill.getAttribute('data-ph');
      g.pillH = r2(hOf(pill)); g.onTop = document.elementFromPoint(pc.x, pc.y) === pill;
      mouse(pill, 'mousedown', pc.x, pc.y); g.dragArmed = document.body.classList.contains('grid-swapping');
      var before = $('table-wrap').innerHTML;
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: pc.x, clientY: pc.y }));
      await T.sleep(100); await settle('after press');
      g.pressChangedNothing = !document.body.classList.contains('grid-swapping') && $('table-wrap').innerHTML === before;
      rclickAt(pc.x, pc.y); await T.sleep(30);
      var menu = document.querySelector('.day-menu');
      g.menuPh = menu && menu.getAttribute('data-ph'); g.menuForPill = g.menuPh === ph;
      esc(); await T.sleep(30);
    }
    var band = tw.querySelector('.mv-hiatus-bar');
    if (band) {
      await intoView(band);
      var bc = centre(band);
      g.bandH = r2(hOf(band));
      rclickAt(bc.x, bc.y); await T.sleep(30);
      var bm = document.querySelector('.day-menu');
      g.bandSections = bm ? [].map.call(bm.querySelectorAll('[data-section]'), function (s) { return s.getAttribute('data-section'); }) : null;
      g.bandMenu = !!(g.bandSections && g.bandSections.indexOf('hiatus') >= 0);
      esc(); await T.sleep(30);
    }
    var add = [].find.call(tw.querySelectorAll('.mv-note-add:not(.mv-note-add-full)'), function (a) { return a.getClientRects().length; });
    if (add) {
      await intoView(add);
      var ac = centre(add);
      g.addOnTop = document.elementFromPoint(ac.x, ac.y) === add;
      lclickAt(ac.x, ac.y); await T.sleep(60);
      g.noteEditor = !!document.querySelector('.mv-note-pop');
      esc(); await T.sleep(60);
      if (document.querySelector('.mv-note-pop')) { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 2, clientY: 2 })); await T.sleep(60); }
    }
    var cell = pill ? (function () {
      var wk = pill.closest('.mv-week'), cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      return cells[+pill.style.gridColumnStart - 1];
    })() : null;
    if (cell) {
      await intoView(cell);
      var cr = cell.getBoundingClientRect(), nx = Math.round(cr.left + cr.width / 2), ny = Math.round(cr.top + 8);
      lclickAt(nx, ny); await T.sleep(40);
      g.numMenu = !!document.querySelector('.day-menu');
      esc(); await T.sleep(40);
    }
    // Edge grips: a pointer move over a pill shows them, level with it. Not every piece has an edge in it (a week in the
    // middle of a phase has none, and some months have none at all), so months and pills are tried in turn until one
    // shows its grips. Last, because it pages the month.
    await goFirst();
    for (var gm = 0; gm < 120 && !g.grips; gm++) {
      var cands = [].filter.call(tw.querySelectorAll('.mv-pill[data-ph]'), function (p) { return !p.classList.contains('mv-pill-2l'); });
      for (var pi = 0; pi < cands.length && !g.grips; pi++) {
        var gp = cands[pi];
        await intoView(gp);
        var gc = centre(gp);
        if (document.elementFromPoint(gc.x, gc.y) !== gp) continue;
        gp.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: gc.x, clientY: gc.y }));
        await T.sleep(50);
        var grips = [].filter.call(document.querySelectorAll('.phase-edge-handle'), function (h) { return !h.hidden && h.getClientRects().length; });
        if (!grips.length) continue;
        g.gripAt = monthShown() + ' ' + gp.getAttribute('data-ph') + ' "' + (gp.textContent || '').trim().slice(0, 24) + '" ' + r2(hOf(gp)) + ' px';
        g.grips = grips.map(function (h) { var r = h.getBoundingClientRect(); return { top: r2(r.top - gc.r.top), bottom: r2(r.bottom - gc.r.bottom), ph: h.getAttribute('data-ph') }; });
      }
      if (!g.grips && !(await step('mv-next'))) break;
    }
    g.gripsLevel = !!g.grips && g.grips.every(function (x) { return Math.abs(x.top) <= 1 && Math.abs(x.bottom) <= 1; });
    document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1, clientY: 1 }));
    await T.sleep(50);
    await goTo(out.info.b2Month);
    kase('B2', 'at Large every gesture lands: a pill on top and a press arms its drag (nothing moves on release); right-clicks open the menu for the pill and, on a band, its hiatus section; the edge grips are level with the bigger pill; a "+" opens the note editor; the day number opens the day menu',
         !!pill && g.pillH === 22 && g.onTop && g.dragArmed && g.pressChangedNothing && g.menuForPill && g.gripsLevel &&
         (!band || (g.bandH === 22 && g.bandMenu)) && !!add && g.addOnTop && g.noteEditor && g.numMenu,
         { month: monthShown(), g: g, band: !!band });

    // ---- B4: zoom, Large then (below) Extra large ----
    async function zoomCase(key) {
      var at100 = measureMonth().map(function (w) { return w.tracks; }), res = {};
      for (var z of [0.75, 1.5, 2]) {
        document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom: z } }));
        await T.sleep(400); await settle('zoom ' + z);
        var wk = document.querySelector('#table-wrap .mv-week');
        res[z] = { zoom: wk && wk.currentCSSZoom, same: JSON.stringify(measureMonth().map(function (w) { return w.tracks; })) === JSON.stringify(at100) };
      }
      document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom: 1 } }));
      await T.sleep(400); await settle('zoom 1');
      return res;
    }
    var z1 = await zoomCase('large');

    // ---- Extra large ----
    await T.openSettings('prefs');
    await sizeCase('xl');
    await goTo(out.info.b2Month);
    var z2 = await zoomCase('xl');
    function zoomOk(r) { return [0.75, 1.5, 2].every(function (z) { return r[z].zoom === z && r[z].same; }); }
    kase('B4', 'Large and Extra large at 75%, 150% and 200% zoom: the month has exactly its 100% lanes, in its own px', zoomOk(z1) && zoomOk(z2),
         { month: out.info.b2Month, large: z1, xl: z2 });

    // ---- B5: E2, the wrap measured at the bar's own size ----
    if (b5) {
      function b5Bars(m) {
        var res = [];
        m.forEach(function (mo) { mo.weeks.forEach(function (w) { w.items.forEach(function (it) {
          if (it.customOneDay && it.text.indexOf(b5.slice(0, 20)) === 0) res.push({ month: mo.month, twoLine: it.twoLine, cutX: it.cutX, span: it.span });
        }); }); });
        return res;
      }
      var s5 = b5Bars(std), l5 = b5Bars(walks.large), x5 = b5Bars(walks.xl);
      kase('B5', 'E2: the renamed one-day bar is one uncut line at Standard and wraps to two lines, uncut, at Large and Extra large; no one-day custom bar is cut on one line at any size',
           s5.length > 0 && s5.every(function (b) { return !b.twoLine && !b.cutX && b.span === 1; }) &&
           l5.length === s5.length && l5.every(function (b) { return b.twoLine && b.span === 2; }) &&
           x5.length === s5.length && x5.every(function (b) { return b.twoLine && b.span === 2; }) &&
           !J.standard.n.cutOneDay && !J.large.n.cutOneDay && !J.xl.n.cutOneDay,
           { label: b5, standard: s5, large: l5, xl: x5, cut: { standard: J.standard.bad.cutOneDay, large: J.large.bad.cutOneDay, xl: J.xl.bad.cutOneDay } });
    }

    // ---- B3a: one undo step per pick ----
    var at = monthShown();
    function htmlOf(key) { var m = walks[key].find(function (x) { return x.month === at; }); return m ? m.html : null; }
    var u = {};
    await undo(); u.first = { ctl: ctl(), body: bodySize(), same: $('table-wrap').innerHTML === htmlOf('large') };
    await undo(); u.second = { ctl: ctl(), body: bodySize(), same: $('table-wrap').innerHTML === htmlOf('standard'), undoOff: undoOff() };
    await redo(); await redo(); u.redo = { ctl: ctl(), body: bodySize(), same: $('table-wrap').innerHTML === htmlOf('xl') };
    kase('B3a', 'each pick is ONE undo step: Undo gives Large, Undo again Standard (and the stack is empty), Redo twice Extra large; each month byte-identical to its first drawing',
         u.first.ctl === 'large' && u.first.body === 'large' && u.first.same && u.second.ctl === 'standard' && u.second.body === 'standard' && u.second.same &&
         u.second.undoOff && u.redo.ctl === 'xl' && u.redo.body === 'xl' && u.redo.same, { month: at, u: u });

    // ---- B3b: Save, at Extra large and then at Standard ----
    // ⚠️ Against a Standard save by THIS build, never the fixture's own ids: a fixture saved by an older build lacks
    // every id added since (the calendar range, Show info's Location...).
    var saved = await saveNow(w0), snap = JSON.parse(saved);
    await T.openSettings('prefs');
    await pick('standard');
    var savedStd = await saveNow(w0), snapStd = JSON.parse(savedStd);
    var ids0 = Object.keys(snapStd.fields.byId).sort(), ids1 = Object.keys(snap.fields.byId).sort();
    kase('B3b', 'Save writes mvBarSize: "xl"; a Save at Standard writes NO mvBarSize key; both hold exactly the same fields.byId ids',
         snap.mvBarSize === 'xl' && !('mvBarSize' in snapStd) && JSON.stringify(ids0) === JSON.stringify(ids1) &&
         !ids1.some(function (k) { return /bar-size/.test(k); }),
         { mvBarSize: snap.mvBarSize, stdHasKey: 'mvBarSize' in snapStd, added: ids1.filter(function (k) { return ids0.indexOf(k) < 0; }), lost: ids0.filter(function (k) { return ids1.indexOf(k) < 0; }) });
    // The minted fixture (plan step 3): this calendar's real Save at Large, out.sptcal -> mvbarsize.sptcal, copied by
    // hand to tests/fixtures/mvbarsize-large.sptcal when it is meant to be one (it is cut from the mvnotes run).
    await pick('large');
    var savedLarge = await saveNow(w0);
    out.sptcal = btoa(unescape(encodeURIComponent(savedLarge)));
    out.info.mintedSize = JSON.parse(savedLarge).mvBarSize;

    // ---- B3c: Load ----
    var warn0 = (T.appHealth().errors || []).filter(function (e) { return e === WARN; }).length;
    var l = {};
    await openText(saved, []); l.saved = { ctl: ctl(), body: bodySize() };
    var plain = JSON.parse(saved); delete plain.mvBarSize;
    await openText(JSON.stringify(plain), []); l.noKey = { ctl: ctl(), body: bodySize() };
    l.junk = [];
    for (var v of ['huge', true, 'toString']) {
      await openText(saved, []);   // from Extra large each time, so a junk value that stuck would show
      var j = JSON.parse(saved); j.mvBarSize = v;
      await openText(JSON.stringify(j), []);
      l.junk.push({ v: String(v), ctl: ctl(), body: bodySize() });
    }
    var warns = (T.appHealth().errors || []).filter(function (e) { return e === WARN; }).length - warn0;
    kase('B3c', 'Load of the saved text opens at Extra large; with no key, right after, at Standard; "huge", true and "toString" each open at Standard, one validator warning each',
         l.saved.ctl === 'xl' && l.saved.body === 'xl' && l.noKey.ctl === 'standard' && l.noKey.body === 'standard' &&
         l.junk.every(function (x) { return x.ctl === 'standard' && x.body === 'standard'; }) && warns === 3, { l: l, warnings: warns });

    // ---- B6: the shareable copy, at Extra large ----
    await openText(saved, []);
    await T.sleep(700);   // the share handler's reClickGuard(600)
    var cap = T.captureDownload();
    $('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable copy', 200, 100);
    var html = await cap.stop().text();
    var sm = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    var csnap = sm ? JSON.parse(sm[1]) : null, twTag = (html.match(/<div id="table-wrap"[^>]*>/) || [''])[0];
    kase('B6', 'a shareable copy made at Extra large carries mvBarSize: "xl" in its saved state, and a bare #table-wrap',
         !!csnap && csnap.mvBarSize === 'xl' && twTag === '<div id="table-wrap">', { mvBarSize: csnap && csnap.mvBarSize, twTag: twTag });

    // ---- B7: New ----
    var b7 = { before: bodySize() };
    $('new-file-btn').click();
    for (var ni = 0; ni < 30; ni++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
    await T.sleep(300);
    b7.ctl = ctl(); b7.body = bodySize();
    kase('B7', 'New, from Extra large, starts at Standard (the control and the class)', b7.before === 'xl' && b7.ctl === 'standard' && b7.body === 'standard', b7);

    clearInterval(guard);
    var all = T.appHealth().errors || [];
    var others = all.filter(function (e) { return e !== WARN; });
    kase('E0', 'no console errors, and exactly the three validator warnings B3c opens on purpose',
         others.length === 0 && all.length - others.length === 3, { warnings: all.length - others.length, errors: others.slice(0, 5) });
    out.info.judge = { standard: { lanes: [J.standard.smallLanes, J.standard.bigLanes], clipY: J.standard.clipY },
                       large: { lanes: [J.large.smallLanes, J.large.bigLanes, J.large.sharedLanes] },
                       xl: { lanes: [J.xl.smallLanes, J.xl.bigLanes, J.xl.sharedLanes] } };
  } catch (e) {
    clearInterval(guard);
    out.EX = String(e && e.stack || e);
    kase('EX', 'mvbarsize threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
