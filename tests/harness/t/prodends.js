// prodends -- Production held by its WRAP (owner, 30 Oct 2026: "would it be possible we could add the "ends" date option
// to production ... if i know production needs to end on a certain day we could work backwards to calculate"; ruled
// "id say do exactly then"; mockups/production-end-date.html "Yes, build it"; the start shown as option B of
// mockups/production-start-readout.html, a span in both modes, "Yes, build it"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh prodends 400
//
// T.buildFixture()'s calendar: Production from Mon 6/29/26, 10 episodes x 8 days = 80 shoot days, U.S. Area Standards
// (Juneteenth Fri 6/19/26, Independence Day observed Fri 7/3/26, Labor Day Mon 9/7/26, Thanksgiving and the day after
// 11/26-27/26), so it wraps Tue 10/20/26. Prod Prep runs to Fri 6/26/26.
//
//   C1  Production's card has the Starts / Ends select, the wrap box and the span, none with an id, and no Weeks
//       .phase-endsdate; on Starts the span reads Starts Mon 6/29/26 (solid) to Wraps Tue 10/20/26 (dashed)
//   R1  Starts -> Ends -> Starts saves byte for byte the file it saved before (no productionEnds key, the same fields)
//   E1  to Ends moves nothing: the same Production cells and meta line; the wrap box shows Tue 10/20/26 in the start
//       box's place; Snap to Monday and "Start after previous phase" go; the span's WRAP is solid now
//   U1  one undo step back to Starts, one redo to Ends
//   E2  the wrap holds to the day: 8 -> 9 days an episode (90 shoot days) starts the shoot Fri 6/12/26, ten shoot days
//       earlier over Juneteenth, and the meta line still ends 10/20/26; the span's start (dashed) says so
//   E3  Production's own one-week hiatus (8/3/26) pulls the start five more shoot days (Fri 6/5/26); off, back
//   E4  a typed Saturday (10/24/26) wraps on the Friday before (10/23/26; start Wed 6/17/26), a typed holiday (Fri
//       11/27/26, the day after Thanksgiving) on the Wednesday before it (11/25/26), and the box shows the wrap
//   E5  the picker offers only shoot days (October 2026: weekends off; November: Thanksgiving and the day after off
//       too), with its hint, the wrap capped alone; picking Fri 10/23 makes it the wrap
//   S1  Shift All +1 wk moves the shoot as in Starts and the wrap it lands on holds (start Mon 6/22/26 after
//       Juneteenth, wrap Tue 10/27/26); an update with no edit leaves both; undo puts them back
//   F1  Save writes productionEnds "2026-10-20", the same field ids as a Starts save, start-production 6/12/26 with
//       Snap to Monday off; Load brings Ends back
//   F2  the same file with NO productionEnds key opens on Starts with the same shoot (what an older build shows), never
//       the previous calendar's Ends (the M-5 trap)
//   B1  back to Starts from a Friday start keeps Snap to Monday off and moves nothing; the span's start is solid again;
//       the file has no productionEnds key
//   F3  a hostile productionEnds (a number, a US-style date) is dropped and the calendar opens on Starts
//   E0  no console errors, apart from the one warning F3's hostile values are meant to raise
//
// Not timed: under --virtual-time-budget performance.now() does not move during synchronous work, so an update() reads
// 0 ms here. Measured in the browser pane on episodeprep instead: 10-18 ms an update in Ends.
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'prodends', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function byId(id) { return document.getElementById(id); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function shown(el) { return !!(el && el.offsetParent); }
  function nativeSet(e, v) {
    var proto = e instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
  }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }
  function row() { return byId('start-production').closest('.phase-row'); }
  function sel() { return row().querySelector('select.phase-anchor'); }
  function box() { return row().querySelector('.prod-wrapdate'); }
  function span() { return row().querySelector('.prod-span'); }
  async function anchor(v) { var s = sel(); nativeSet(s, v); s.dispatchEvent(new Event('change', { bubbles: true })); await settle(); }
  async function typeWrap(v) {
    var b = box(); b.focus(); nativeSet(b, v); b.dispatchEvent(new Event('input', { bubbles: true }));
    b.blur(); b.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await settle();
  }
  // "Starts* Mon 6/29/26 | Wraps Tue 10/20/26": the span's two ends, * on the one that holds.
  function spanText() {
    var s = span();
    if (!s || s.hidden) return null;
    return Array.prototype.map.call(s.querySelectorAll('.prod-span-end'), function (e) {
      return e.querySelector('.prod-span-k').textContent.trim() + (e.classList.contains('held') ? '*' : '') + ' ' + e.querySelector('.prod-span-d').textContent.trim();
    }).join(' | ');
  }
  function metaOf() { return ((byId('meta-production') || {}).textContent || '').split('\n')[0].trim(); }
  function metaEnd() { var m = metaOf(), i = m.lastIndexOf('→'); return i < 0 ? null : m.slice(i + 1).trim(); }
  function isDate(t) { var p = t.split('/'); return p.length === 3 && p.every(function (x) { return /^\d{1,2}/.test(x) && x.length <= 2; }); }
  function prodCells() {
    var o = [];
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = '';
      Array.prototype.forEach.call(tr.children, function (td) {
        var t = (td.textContent || '').trim();
        if (isDate(t)) date = t;
        else if (/^Production wk \d+/.test(t)) o.push(date + ':' + t);
      });
    });
    return o.sort();
  }
  function prod() {
    return { mode: sel().value, start: byId('start-production').value, snap: byId('snap-production').checked,
             box: box().value, meta: metaOf(), span: spanText() };
  }

  // ---- Save and Load through the real controls (endsdate's shape) -----------------------------------------------
  var written = [];
  var saveHandle = { name: 'prodends.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'prodends.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'prodends-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function comparable(text) { var o = JSON.parse(text); delete o.sidebarTab; delete o.viewMode; return JSON.stringify(o, null, 1); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return prodCells().length > 10; }, 'the fixture grid', 200, 100);
    await settle();
    var tab = Array.prototype.filter.call(document.querySelectorAll('button, [role=tab]'), function (b) { return (b.textContent || '').trim() === 'Phases'; })[0];
    if (tab) { tab.click(); await T.sleep(400); }
    var C0 = prodCells(), M0 = metaOf();

    // ===== C1: the card ===========================================================================================
    await step('C1', async function () {
      var r = row();
      var parts = !!sel() && !!box() && !!span() && !r.querySelector('.phase-endsdate');
      var noIds = r.querySelectorAll('select.phase-anchor[id], .prod-wrapdate[id], .prod-span [id], .prod-span[id]').length === 0;
      var p = prod();
      kase('C1', 'Production\'s card has the Starts / Ends select, the wrap box and the span, no id among them and no Weeks Ends box; on Starts the span reads Starts* Mon 6/29/26 | Wraps Tue 10/20/26',
           parts && noIds && p.mode === 'starts' && shown(byId('start-production')) && !shown(box()) && shown(span())
           && p.span === 'Starts* Mon 6/29/26 | Wraps Tue 10/20/26' && metaEnd() === '10/20/26',
           { parts: parts, noIds: noIds, p: p, meta: M0 });
    });

    // ===== R1: a round trip leaves nothing behind =================================================================
    await step('R1', async function () {
      var a = await save();
      await anchor('ends'); await anchor('starts');
      var b = await save();
      kase('R1', 'Starts -> Ends -> Starts saves byte for byte the file it saved before (no productionEnds key, the same fields)',
           comparable(a) === comparable(b) && !('productionEnds' in JSON.parse(b)), { lenA: a.length, lenB: b.length });
    });

    // ===== E1 / U1: to Ends moves nothing =========================================================================
    await step('E1', async function () {
      await anchor('ends');
      var p = prod();
      var ui = row().classList.contains('ends-mode') && shown(box()) && !shown(byId('start-production'))
            && !shown(byId('snap-production')) && !shown(byId('autostart-production'));
      kase('E1', 'to Ends moves nothing (the same Production cells and meta line, start 6/29/26); the wrap box shows Tue 10/20/26 in the start box\'s place; Snap and "Start after previous phase" go; the span\'s wrap holds',
           same(prodCells(), C0) && p.meta === M0 && p.start === '2026-06-29' && p.box === '2026-10-20' && !p.snap && ui
           && p.span === 'Starts Mon 6/29/26 | Wraps* Tue 10/20/26', { p: p, ui: ui });
    });
    await step('U1', async function () {
      await undo();
      var back = prod();
      await redo();
      var again = prod();
      kase('U1', 'one undo step back to Starts (Snap to Monday on again, the span\'s start solid), one redo to Ends',
           back.mode === 'starts' && back.snap && back.span === 'Starts* Mon 6/29/26 | Wraps Tue 10/20/26' && same(prodCells(), C0)
           && again.mode === 'ends' && again.box === '2026-10-20' && again.span === 'Starts Mon 6/29/26 | Wraps* Tue 10/20/26',
           { back: back, again: again });
    });

    // ===== E2: the wrap holds, to the day =========================================================================
    var P90 = null;
    await step('E2', async function () {
      T.set('shoot-days-per-ep', '9'); await settle();
      P90 = prod();
      kase('E2', '8 -> 9 days an episode (90 shoot days) starts the shoot Fri 6/12/26, ten shoot days earlier over Juneteenth; the meta line still ends 10/20/26; the span\'s start moved, its wrap holds',
           P90.start === '2026-06-12' && P90.box === '2026-10-20' && metaEnd() === '10/20/26' && /^90 shoot days/.test(P90.meta)
           && P90.span === 'Starts Fri 6/12/26 | Wraps* Tue 10/20/26', { p: P90 });
    });

    // ===== E3: Production's own hiatus ============================================================================
    await step('E3', async function () {
      byId('phiatus-en-production').click(); await T.sleep(300);
      T.set('phiatus-start-production', '2026-08-03'); T.set('phiatus-weeks-production', '1'); await settle();
      var on = prod();
      byId('phiatus-en-production').click(); await settle();
      var off = prod();
      kase('E3', 'Production\'s own one-week hiatus (8/3/26) pulls the start five more shoot days (Fri 6/5/26) and the wrap holds; off, back to 6/12/26',
           on.start === '2026-06-05' && on.box === '2026-10-20' && on.span === 'Starts Fri 6/5/26 | Wraps* Tue 10/20/26' && same(off, P90),
           { on: on, off: off });
    });

    // ===== E4: a typed day the shoot cannot work =================================================================
    await step('E4', async function () {
      await typeWrap('2026-10-24');
      var sat = prod();
      await typeWrap('2026-11-27');
      var hol = prod(), holMeta = metaEnd();
      await typeWrap('2026-10-20');
      kase('E4', 'a typed Sat 10/24/26 wraps Fri 10/23/26 (start Wed 6/17/26); a typed Fri 11/27/26, the day after Thanksgiving, wraps Wed 11/25/26; the box shows the wrap',
           sat.box === '2026-10-23' && sat.start === '2026-06-17' && sat.span === 'Starts Wed 6/17/26 | Wraps* Fri 10/23/26'
           && hol.box === '2026-11-25' && holMeta === '11/25/26' && same(prod(), P90), { sat: sat, hol: hol, holMeta: holMeta });
    });

    // ===== E5: the picker ==========================================================================================
    await step('E5', async function () {
      box().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await T.sleep(200);
      var pop = document.querySelector('.date-pop');
      if (!pop) throw new Error('the picker did not open');
      function monthOf() {
        var days = Array.prototype.slice.call(pop.querySelectorAll('.dp-day'));
        // The grid starts on a Monday, so columns 5 and 6 are the weekend.
        return days.map(function (b, i) {
          return { d: b.textContent.trim(), out: b.classList.contains('dp-out'), off: b.classList.contains('dp-off'), wknd: i % 7 >= 5,
                   cap: b.classList.contains('dp-cap') && b.classList.contains('dp-solo') };
        });
      }
      var oct = monthOf(), title = pop.querySelector('.dp-title').textContent.trim();
      var octOk = oct.filter(function (c) { return !c.out; }).every(function (c) { return c.off === c.wknd; });
      var capped = oct.filter(function (c) { return c.cap; }).map(function (c) { return c.d; });
      var hint = Array.prototype.map.call(pop.querySelectorAll('.dp-hint'), function (h) { return h.textContent.trim(); }).join(' | ');
      pop.querySelector('.dp-nav[aria-label="Next month"]').click(); await T.sleep(150);
      var nov = monthOf();
      var novOff = nov.filter(function (c) { return !c.out && c.off && !c.wknd; }).map(function (c) { return c.d; });
      pop.querySelector('.dp-nav[aria-label="Previous month"]').click(); await T.sleep(150);
      var fri23 = Array.prototype.filter.call(pop.querySelectorAll('.dp-day'), function (b) { return !b.classList.contains('dp-out') && b.textContent.trim() === '23'; })[0];
      if (fri23) { fri23.click(); await settle(); }
      var p = prod();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await typeWrap('2026-10-20');
      kase('E5', 'the picker (October 2026) offers only shoot days, every weekday but no weekend; November also greys Thanksgiving and the day after (26, 27); the hint; the wrap capped alone; picking Fri 23 makes it the wrap',
           title === 'October 2026' && octOk && same(capped, ['20']) && same(novOff, ['26', '27'])
           && hint === 'The shoot wraps on a shoot day, so only shoot days can be picked.' && p.box === '2026-10-23' && p.start === '2026-06-17',
           { month: title, octOk: octOk, capped: capped, novOff: novOff, hint: hint, p: p });
    });

    // ===== S1: a mover moves the shoot, and the wrap it lands on holds ============================================
    await step('S1', async function () {
      var btn = Array.prototype.filter.call(document.querySelectorAll('button'), function (b) { return /1 wk\s*→/.test((b.textContent || '').trim()); })[0];
      if (!btn) throw new Error('no "1 wk →" button');
      btn.click(); await settle();
      var moved = prod();
      T.set('weeks-post', byId('weeks-post').value); await settle();      // an update() with no edit
      var still = prod();
      await undo();
      kase('S1', 'Shift All +1 wk moves the shoot as in Starts (start Mon 6/22/26, past Juneteenth) and the wrap it lands on, Tue 10/27/26, holds; an update with no edit leaves both; undo puts back 6/12 and 10/20',
           moved.start === '2026-06-22' && moved.box === '2026-10-27' && moved.span === 'Starts Mon 6/22/26 | Wraps* Tue 10/27/26'
           && same(still, moved) && same(prod(), P90), { moved: moved, still: still, back: prod() });
    });

    // ===== F: the file =============================================================================================
    var saved = null;
    await step('F1', async function () {
      saved = await save();
      var s = JSON.parse(saved), a = JSON.parse(written[0]);
      var snapField = JSON.stringify(s.fields.byId['snap-production'] || null);
      var ok = s.productionEnds === '2026-10-20' && same(Object.keys(s.fields.byId), Object.keys(a.fields.byId))
            && s.fields.byId['start-production'].value === '2026-06-12' && snapField.indexOf('false') >= 0;
      var off = JSON.parse(saved); delete off.productionEnds;
      await load(JSON.stringify(off, null, 1));
      var offLoaded = prod();
      await load(saved);
      var back = prod();
      kase('F1', 'Save writes productionEnds "2026-10-20", the same field ids as a Starts save, start-production 6/12/26 with Snap to Monday off; Load brings Ends back',
           ok && same(back, P90), { productionEnds: s.productionEnds, snapField: snapField, back: back });
      kase('F2', 'the same file with NO productionEnds key opens on Starts with the same shoot (6/12/26 to 10/20/26, the start solid), never the previous calendar\'s Ends',
           offLoaded.mode === 'starts' && offLoaded.start === '2026-06-12' && !offLoaded.snap && metaOf() !== '' && offLoaded.meta === P90.meta
           && offLoaded.span === 'Starts* Fri 6/12/26 | Wraps Tue 10/20/26', { offLoaded: offLoaded });
    });

    // ===== B1: back to Starts =====================================================================================
    await step('B1', async function () {
      await anchor('starts');
      var p = prod();
      var file = JSON.parse(await save());
      kase('B1', 'back to Starts from Fri 6/12/26 keeps Snap to Monday off and moves nothing; the span\'s start is solid; the file has no productionEnds key',
           p.mode === 'starts' && !p.snap && p.start === '2026-06-12' && p.meta === P90.meta && p.span === 'Starts* Fri 6/12/26 | Wraps Tue 10/20/26'
           && !('productionEnds' in file), { p: p });
    });

    // ===== F3: a hostile key ======================================================================================
    await step('F3', async function () {
      var s = JSON.parse(saved);
      s.productionEnds = 7;
      await load(JSON.stringify(s, null, 1));
      var num = prod();
      s.productionEnds = '10/20/2026';
      await load(JSON.stringify(s, null, 1));
      var us = prod();
      kase('F3', 'a hostile productionEnds (the number 7, the string "10/20/2026") is dropped and the calendar opens on Starts at the same shoot',
           num.mode === 'starts' && us.mode === 'starts' && num.start === '2026-06-12' && us.meta === P90.meta, { num: num, us: us });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/value\(s\) in this calendar were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (the F3 warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'prodends threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
