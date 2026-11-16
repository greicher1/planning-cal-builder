// laptopfit -- a laptop-sized window (audit 2.14: AUD2-034, AUD2-035, WIN-4). Run it at the sizes it is about:
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=laptopstrips HARNESS_WINDOW=1280,800 ./run.sh laptopfit 300
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=laptopstrips HARNESS_WINDOW=1366,768 ./run.sh laptopfit 300
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=laptopstrips HARNESS_WINDOW=1280,943 ./run.sh laptopfit 300
//
// A headless window's page is 143 px shorter than the window: 1280,800 gives a 1280 x 657 page (a 1080p Windows
// laptop at 150%), 1366,768 a 1366 x 625 page, and 1280,943 the 1280 x 800 page the audit measured.
//
// tests/fixtures/laptopstrips.sptcal: the audit's own calendar (synthetic, carry-rich in Alberta), saved before the
// automatic column layout and before Alberta's holiday list was corrected, so it raises TWO strips on load: the
// holiday list's correction and "Columns can now lay out automatically".
//
// CASES
//   T1  nothing moves between the views: every control both views share (the view switch, Shift, Build Around, the
//       text style bar and its buttons, Header, Undo / Redo) keeps its place and size when Month is clicked (AUD2-034)
//   T2  the shared tools stay on ONE line in both views: Shift, Build Around, Header and Undo / Redo level with the
//       view switch (the month stepper never pushes them to a second line). At 1280 px and up only: narrower, they
//       wrap, the same way in both views, which T1 holds
//   T3  stepping through the months moves nothing: the stepper's label changes length, its slot does not
//   T4  the column question is a waterfall question: the layout strip is never shown in the month view (AUD2-035)
//   T5  one strip at a time: of the two raised, only the first shows; dismissing it brings the next
//   T6  a strip is one line: a strip's text never wraps, and a long one offers Details, which shows the rest and folds
//       back
//   T7  Build Around's foot stays on screen: with four more phases in its list, the pin date and the Build button
//       are fully in view and are what a click there reaches (WIN-4)
//   T8  the same for Shift's To a date: the date and Go are in view
//   T9  the four newer strips are enrolled too (owner's picker, 16 Nov 2026: "Yes, same rule"): with all eleven raised
//       at once exactly one shows at a time, and dismissing each brings the next in priority order: the two about
//       work at risk first (#backup-notice, then #storage-notice), then 2.14's order with #launch-notice after the
//       legacy strip and #heading-notice after the column-order strip (legacy, launch, holiday, layout, update,
//       colswap, heading, calrange, browser). Raised as the engine raises them (`hidden` off, .ln-text written); each
//       one's own trigger is held by its own leg (launchtemp, headingsfollow, launchrecover, backupblocked)
//   T10 two of them at once, each with a long line (a long file name; four removed headings): only the backup strip
//       shows, on one line, with Details, which shows the rest and folds back; its x brings the heading strip, also
//       one line, with Details where its line is cut short (at 1280 px; at 1366 px the longest line the engine writes
//       fits). And the storage strip outranks the double-clicked-file strip
//   Z   no console error
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'laptopfit', vw: innerWidth, vh: innerHeight}, cases = [];
  function add(id, title, pass, got, want){ cases.push({id: id, title: title, pass: !!pass, got: got, want: want}); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function $id(id){ return document.getElementById(id); }
  function R(el){ return el.getBoundingClientRect(); }
  function mid(r){ return r.top + r.height / 2; }
  function rnd(r){ return r ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] : null; }
  var SHARED = '.view-toggle, #shift-group, #pop-solve-btn, .style-bar, .style-bar .hf-ctl, #tb-hdr-mode-btn, .undo-redo-group, .undo-redo-group .icon-btn';
  function boxes(){
    var o = {};
    qa(SHARED, q('.view-toggle-row')).forEach(function (e, i) { var r = R(e); o[i] = [r.left, r.top, r.width]; });
    return o;
  }
  function moved(a, b){
    var w = 0;
    Object.keys(a).forEach(function (k) { if(!b[k]) { w = Math.max(w, 999); return; } for(var j = 0; j < 3; j++) w = Math.max(w, Math.abs(a[k][j] - b[k][j])); });
    return +w.toFixed(2);
  }
  // The first line: every shared tool level with the view switch.
  function oneLine(){
    var t = mid(R(q('.view-toggle'))), ids = ['shift-group', 'pop-solve-btn', 'tb-hdr-mode-btn'];
    var ys = ids.map(function (id) { return +(mid(R($id(id))) - t).toFixed(1); });
    ys.push(+(mid(R(q('.undo-redo-group'))) - t).toFixed(1));
    return {ok: ys.every(function (d) { return Math.abs(d) < 1; }), off: ys};
  }
  var STRIPS = ['legacy-notice', 'holiday-notice', 'layout-notice', 'update-notice', 'colswap-notice', 'calrange-notice', 'browser-notice'];
  function shown(){ return STRIPS.filter(function (id) { var e = $id(id); return e && e.offsetHeight > 0; }); }
  async function settle(label){
    await T.sleep(600);
    var last = -1, st = 0;
    await T.until(function () { var n = ($id('table-wrap') || {innerHTML: ''}).innerHTML.length; st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3; }, label || 'the grid to settle', 150, 100);
  }
  async function view(v){
    $id('view-' + v + '-btn').click();
    await T.until(function () { return v === 'month' ? !!q('#table-wrap .month-view') : !q('#table-wrap .month-view'); }, 'the ' + v + ' view', 100, 50);
    await settle('the ' + v + ' view'); await T.sleep(300);
  }
  // Is this control fully on screen and what a click at its centre reaches?
  function reach(el){
    if(!el) return {ok: false, why: 'missing'};
    var r = R(el), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var top = (y >= 0 && y < innerHeight) ? document.elementFromPoint(x, y) : null;
    var onTop = !!top && (top === el || el.contains(top));
    return {ok: onTop && r.top >= 0 && r.bottom <= innerHeight + 0.5, box: rnd(r), topIs: top ? top.tagName + '.' + String(top.className).slice(0, 30) : 'off-screen', vh: innerHeight};
  }
  try {
    await T.appReady();
    await T.until(function () { return !!q('.view-toggle-row .style-bar'); }, 'the style bar', 60, 100);
    await settle();
    if(!$id('view-sheet-btn').classList.contains('active')) await view('sheet');

    // ---- T1 / T2: the views ----
    var wf = boxes(), wfLine = oneLine(), wfShown = shown();
    out.wfStrips = wfShown.map(function (id) { return id + ' h' + $id(id).offsetHeight; });
    await view('month');
    var mv = boxes(), mvLine = oneLine(), mvShown = shown(), mM = moved(wf, mv);
    out.mvStrips = mvShown.map(function (id) { return id + ' h' + $id(id).offsetHeight; });
    add('T1', 'nothing moves between the views: every shared control keeps its place and size when Month is clicked',
        mM < 0.5, {moved: mM, shift: [rnd(R($id('shift-group')))], header: rnd(R($id('tb-hdr-mode-btn')))}, {moved: 0});
    // At 1280 px and up (a laptop). Narrower, the tools wrap to a second line, the same in both views (T1).
    if(innerWidth >= 1280)
      add('T2', 'the shared tools stay on one line, level with the view switch, in both views',
          wfLine.ok && mvLine.ok, {waterfall: wfLine.off, month: mvLine.off}, 'all 0');
    else out.T2skipped = {why: 'under 1280 px the tools wrap in both views', waterfall: wfLine.off, month: mvLine.off};

    // ---- T3: step through the months ----
    var stepMoves = 0, labels = [], notFit = [];
    // The label on show: the full name, or its short form where the full one does not fit (the full one is then
    // visually hidden, 1 px, for the live region).
    function shownLabelNow(){ return qa('.month-step .ms-label, .month-step .ms-short').filter(function (e) { return getComputedStyle(e).display !== 'none' && R(e).width > 2; })[0]; }
    for(var i = 0; i < 6; i++){
      var nx = q('.month-step [data-mvstep="1"]');
      if(!nx || nx.disabled) break;
      var b0 = boxes();
      nx.click(); await settle('the next month'); await T.sleep(150);
      labels.push((q('.month-step .ms-label') || {}).textContent);
      stepMoves = Math.max(stepMoves, moved(b0, boxes()));
      var sl = shownLabelNow();
      if(!sl || sl.scrollWidth > sl.clientWidth + 0.5) notFit.push(labels[labels.length - 1]);
    }
    var stepR = q('.month-step') && R(q('.month-step')), slotR = R(q('.tb-slots'));
    var shownLabel = shownLabelNow(), labelFits = !notFit.length;
    add('T3', 'stepping through the months moves nothing, and the month on show always fits its box',
        labels.length >= 3 && stepMoves < 0.5 && labelFits && !!stepR && Math.abs(stepR.width - slotR.width) < 0.5,
        {labels: labels, shown: shownLabel && shownLabel.textContent, notFit: notFit, moved: stepMoves, labelFits: labelFits, stepper: rnd(stepR), slot: rnd(slotR)}, {moved: 0, labelFits: true});

    // ---- T4 / T5 / T6: the strips ----
    var layoutInMonth = $id('layout-notice').offsetHeight;
    var layoutRaised = !$id('layout-notice').hidden, holidayRaised = !$id('holiday-notice').hidden;
    add('T4', 'the column question is a waterfall question: never shown in the month view',
        layoutRaised && layoutInMonth === 0, {raised: layoutRaised, heightInMonth: layoutInMonth}, {raised: true, heightInMonth: 0});
    // One line and Details, on the first strip, in the month view.
    var hn = $id('holiday-notice'), h1 = hn.offsetHeight, txt = q('.ln-text', hn);
    var oneLineText = !!txt && txt.getClientRects().length > 0 && Math.round(R(txt).height) <= 20;
    var det = q('.ln-more', hn), h2 = 0, h3 = 0, detLabel = det && det.textContent.trim(), detOpen = '';
    if(det){ det.click(); await T.sleep(250); h2 = hn.offsetHeight; detOpen = det.textContent.trim(); det.click(); await T.sleep(250); h3 = hn.offsetHeight; }
    // The month view's room with that one strip up, for the record (AUD2-035: under two weeks of the month in view at
    // 1280 x 800, the first week starting about 550 px down, with both strips stacked and wrapped).
    function room(){
      var pp = R(q('.preview-panel')), wk = q('#table-wrap .mv-week');
      return {strips: shown(), gridTop: Math.round(R($id('table-wrap')).top), firstWeekTop: wk && Math.round(R(wk).top), panelBottom: Math.round(pp.bottom),
              fullWeeksInView: qa('#table-wrap .mv-week').filter(function (w) { var r = R(w); return r.top >= pp.top && r.bottom <= pp.bottom + 0.5; }).length};
    }
    out.monthRoom = room();
    add('T6', 'a strip is one line; a long one offers Details, which shows the rest and folds back',
        holidayRaised && h1 <= 38 && oneLineText && !!det && detLabel === 'Details' && h2 > h1 + 10 && detOpen === 'Less' && h3 === h1,
        {height: h1, textH: txt && Math.round(R(txt).height), details: detLabel, open: h2, openLabel: detOpen, back: h3}, {height: '<= 38 (one line)', details: 'Details', open: '> height', back: 'height'});
    await view('sheet');
    var wfOnly = shown();
    var x = q('#holiday-notice .ln-x'); if(x) x.click(); await T.sleep(400);
    var afterX = shown();
    add('T5', 'one strip at a time: the first shows, dismissing it brings the next',
        JSON.stringify(wfShown) === JSON.stringify(['holiday-notice']) && JSON.stringify(mvShown) === JSON.stringify(['holiday-notice']) &&
          JSON.stringify(wfOnly) === JSON.stringify(['holiday-notice']) && JSON.stringify(afterX) === JSON.stringify(['layout-notice']),
        {waterfall: wfShown, month: mvShown, waterfallAgain: wfOnly, afterDismiss: afterX}, {waterfall: ['holiday-notice'], month: ['holiday-notice'], afterDismiss: ['layout-notice']});
    // ...and with no strip at all.
    await view('month');
    out.monthRoomNoStrip = room();
    await view('sheet');

    // ---- T7 / T8: the panels' foot ----
    for(var k = 0; k < 4; k++){ $id('add-phase-btn').click(); await T.sleep(250); }
    await settle('four more phases');
    T.closePops(); await T.sleep(150);
    $id('pop-solve-btn').click(); await T.sleep(700);
    var go = reach($id('tool-solve-go')), date = reach($id('tool-solve-date')), list = q('#pop-solve .solve-list');
    var listR = list && R(list), rows = list ? qa('.solve-row', list).length : 0;
    add('T7', 'Build Around\'s foot stays on screen: the pin date and the Build button are in view and take a click',
        $id('pop-solve').classList.contains('open') && go.ok && date.ok && listR && listR.height >= 80,
        {build: go, date: date, list: rnd(listR), rows: rows, panel: rnd(R($id('pop-solve')))}, 'both in view, the list at least 80 px');
    T.closePops(); await T.sleep(300);
    $id('pop-shift-btn').click(); await T.sleep(700);
    var far = qa('#pop-shift [data-shift-far] button').filter(function (b) { return /To a date/.test(b.textContent); })[0];
    if(far){ far.click(); await T.sleep(400); }
    var sgo = reach($id('tool-anchor-go')), sdate = reach($id('tool-anchor-date'));
    add('T8', 'Shift\'s To a date: the date and Go are in view and take a click',
        !!far && sgo.ok && sdate.ok, {go: sgo, date: sdate, panel: rnd(R($id('pop-shift')))}, 'both in view');
    T.closePops(); await T.sleep(200);

    // ---- T9 / T10: the four newer strips (#launch-notice, #heading-notice, #backup-notice, #storage-notice) ----
    var ORDER = ['backup-notice', 'storage-notice', 'legacy-notice', 'launch-notice', 'holiday-notice', 'layout-notice',
                 'update-notice', 'colswap-notice', 'heading-notice', 'calrange-notice', 'browser-notice'];
    function shownAll(){ return ORDER.filter(function (id) { var e = $id(id); return e && e.offsetHeight > 0; }); }
    function raise(id, html){ var e = $id(id), t = q('.ln-text', e); if(html !== undefined) t.innerHTML = html; else if(!t.textContent.trim()) t.textContent = 'A line from ' + id + '.'; e.hidden = false; }
    var kept = ORDER.map(function (id) { var e = $id(id); return {id: id, hidden: e.hidden, html: q('.ln-text', e).innerHTML}; });
    ORDER.forEach(function (id) { raise(id); });
    await T.sleep(300);
    var seq = [], steps = [];
    for(var g = 0; g < ORDER.length + 2; g++){
      var now = shownAll(); steps.push(now);
      if(now.length !== 1) break;
      seq.push(now[0]); $id(now[0]).hidden = true; await T.sleep(200);
    }
    add('T9', 'all eleven strips raised: one at a time, in priority order (the two about work at risk first)',
        JSON.stringify(seq) === JSON.stringify(ORDER) && steps.every(function (x, i) { return x.length === (i < ORDER.length ? 1 : 0); }),
        {order: seq, shownEachStep: steps.map(function (x) { return x.length; })}, ORDER);
    ORDER.forEach(function (id) { $id(id).hidden = true; });
    await T.sleep(200);

    // T10: two of them, each with a long line (the engine's own wording, with a long file name and four headings).
    // One line is the TEXT's height (<= 20 px): the backup strip's Recover button makes the strip itself 46 px, as the
    // layout strip's buttons make it.
    raise('heading-notice', 'Removed 4 column headings (\u201cPost-Production and Online Fin\u2026\u201d, \u201cPrincipal Photography, Unit\u2026\u201d, \u201cSecond Unit and Pickups Sched\u2026\u201d and 1 more): their columns were merged with others. Undo brings them back.');
    raise('backup-notice', 'Unsaved work from <strong>Pilot Season Two Planning Calendar, Revised After the Network Notes, Final Draft for the Studio and the Network, with the Second Unit, the Pickups and the Reshoots Added After the Table Read (Copy 3).sptcal</strong> (Mon 16 Nov, 11:40 AM) was kept.');
    await T.sleep(400);
    function line(id){
      var e = $id(id), t = q('.ln-text', e), m = q('.ln-more', e);
      return {h: e.offsetHeight, textH: t && Math.round(R(t).height), more: m ? m.textContent.trim() : null,
              cut: !!t && t.scrollWidth > t.clientWidth + 1};
    }
    var both = shownAll(), b1 = line('backup-notice'), bOpen = null, bBack = null;
    var bm = q('#backup-notice .ln-more');
    if(bm){ bm.click(); await T.sleep(250); bOpen = line('backup-notice'); bm.click(); await T.sleep(250); bBack = line('backup-notice'); }
    q('#backup-notice .ln-x').click(); await T.sleep(400);
    var next = shownAll(), h1 = line('heading-notice');
    q('#heading-notice .ln-x').click(); await T.sleep(300);
    raise('launch-notice'); raise('storage-notice'); await T.sleep(300);
    var pair2 = shownAll();
    out.t10 = {both: both, backup: b1, open: bOpen, back: bBack, afterX: next, heading: h1, storageLaunch: pair2};
    add('T10', 'two at once: only the backup strip shows, one line, Details shows the rest and folds back; its x brings the heading strip, one line with Details; storage outranks the double-clicked-file strip',
        JSON.stringify(both) === JSON.stringify(['backup-notice']) && b1.h <= 46 && b1.textH <= 20 && b1.more === 'Details' &&
          !!bOpen && bOpen.textH > b1.textH + 10 && bOpen.h > b1.h && bOpen.more === 'Less' && !!bBack && bBack.h === b1.h && bBack.more === 'Details' &&
          JSON.stringify(next) === JSON.stringify(['heading-notice']) && h1.h <= 38 && h1.textH <= 20 && h1.more === (h1.cut ? 'Details' : null) &&
          JSON.stringify(pair2) === JSON.stringify(['storage-notice']),
        out.t10, {both: ['backup-notice'], backup: 'one line, Details', open: 'taller, Less', afterX: ['heading-notice'], storageLaunch: ['storage-notice']});
    kept.forEach(function (k) { var e = $id(k.id); q('.ln-text', e).innerHTML = k.html; e.hidden = k.hidden; });
    await T.sleep(200);
  } catch (e) { out.EX = String(e && e.stack || e); }
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  add('Z', 'no console error (a ResizeObserver loop would land here)', !errs.length, errs.slice(0, 3), []);
  if(out.EX) add('EX', 'the leg ran to the end', false, out.EX, 'no exception');
  out.cases = cases;
  out.pass = !out.EX && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
