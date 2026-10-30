// endsdate -- a Weeks phase held by its END (owner, 30 Oct 2026: "what if for phases you could select EITHER starting
// date OR ending date. So if you selected ending date and then 20 weeks, it would calculate backwards", then, on
// snapping, "Yes, no switch", then "build it"; mockups/weeks-end-date.html). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh endsdate 400
//
// T.buildFixture()'s calendar: Post from Mon 11/2/26 for 16 weeks, through the locked all-phase hiatus of 12/21/26
// (2 weeks), so its last week is 3/1/27 and its Friday 3/5/27.
//
//   C1  every Weeks phase card but Production's has the Starts / Ends select and the Ends box, neither with an id;
//       all on Starts
//   R1  Starts -> Ends -> Starts leaves the file byte for byte as it was (no phaseEnds key, the same fields)
//   E1  to Ends moves nothing: the same Post cells; end-post is Fri 3/5/27; the Ends box shows it in the start box's
//       place; Snap to Monday and "Start after previous phase" go (Localization keeps both)
//   U1  one undo step back to Starts (end-post emptied), one redo to Ends
//   E2  the end holds: 16 -> 18 weeks moves the START two weeks earlier (10/19/26), and Post still ends the week of 3/1/27
//   E3  the phase's own hiatus inside it pulls the start one more week; turned off, it goes back
//   E4  a typed Wednesday is read as its week's Friday (end-post), and the box shows that Friday once it loses focus
//   E5  the picker offers only Fridays, with its hint, the end capped alone; a picked Friday becomes the end
//   S1  Shift All +1 wk moves the END a week (the locked hiatus stays), and the start follows; undo puts it back
//   F1  Save writes phaseEnds ["post"] and the same field ids as before; start-post holds the worked-out start
//   F2  the same file with NO phaseEnds key opens with Post on Starts at the same dates (what an older build shows),
//       and loading the real file after it brings Ends back (the M-5 trap)
//   F3  a hostile key: Production, an unknown phase, a number and a repeat are dropped, Post kept
//   D1  Length -> Dates from Ends moves nothing (the range is the phase as scheduled) and leaves Ends; back to Weeks
//       comes back on Starts
//   K1  a custom Weeks phase: to Ends, then 4 -> 6 weeks pulls its start back over the hiatus; typing in its Ends
//       box (the custom row's own blanket input listener) moves the end to that week's Friday
//   E0  no console errors, apart from the one warning F3's hostile values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'endsdate', cases: [] };
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
  function rowOf(key) { var s = byId('swatch-' + key); return s ? s.closest('.phase-row') : null; }
  function sel(key) { return rowOf(key).querySelector('select.phase-anchor'); }
  function box(key) { return rowOf(key).querySelector('.phase-endsdate'); }
  async function anchor(key, v) {
    var s = sel(key); nativeSet(s, v); s.dispatchEvent(new Event('change', { bubbles: true })); await settle();
  }
  async function typeEnd(key, v) {
    var b = box(key); b.focus(); nativeSet(b, v); b.dispatchEvent(new Event('input', { bubbles: true }));
    b.blur(); b.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await settle();
  }
  // "date:label" for every waterfall cell that names the phase, in grid order (the year blocks sit side by side).
  function isDate(t) { var p = t.split('/'); return p.length === 3 && p.every(function (x) { return /^\d{1,2}/.test(x) && x.length <= 2; }); }
  function cellsOf(name) {
    var o = [];
    document.querySelectorAll('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var date = '';
      Array.prototype.forEach.call(tr.children, function (td) {
        var t = (td.textContent || '').trim();
        if (isDate(t)) date = t;
        else if (t.indexOf(name + ' wk ') === 0) o.push(date + ':' + t);
      });
    });
    return o.sort(function (a, b) { return parseInt(a.split(' wk ')[1], 10) - parseInt(b.split(' wk ')[1], 10); });
  }
  function postState() {
    var c = cellsOf('Post');
    return { start: byId('start-post').value, end: byId('end-post').value, weeks: byId('weeks-post').value,
             first: c[0], last: c[c.length - 1], n: c.length };
  }

  // ---- Save and Load through the real controls (hidewf's shape) --------------------------------------------------
  var written = [];
  var saveHandle = { name: 'endsdate.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'endsdate.sptcal', { lastModified: 1 }); },
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
    var stem = 'endsdate-load-' + (++loads), name = stem + '.sptcal';
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
    await T.until(function () { return cellsOf('Post').length > 10; }, 'the fixture grid', 200, 100);
    await settle();
    // The Phases tab, so the cards are laid out (shown() reads offsetParent).
    var tab = Array.prototype.filter.call(document.querySelectorAll('button, [role=tab]'), function (b) { return (b.textContent || '').trim() === 'Phases'; })[0];
    if (tab) { tab.click(); await T.sleep(400); }
    var P0 = postState();

    // ===== C1: the cards ==========================================================================================
    await step('C1', async function () {
      var weeksKeys = ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization'];
      var every = weeksKeys.every(function (k) { return !!sel(k) && !!box(k) && sel(k).value === 'starts' && !rowOf(k).classList.contains('ends-mode'); });
      var prod = !rowOf('production').querySelector('select.phase-anchor') && !rowOf('production').querySelector('.phase-endsdate');
      var noIds = document.querySelectorAll('select.phase-anchor[id], .phase-endsdate[id]').length === 0;
      kase('C1', 'every Weeks card but Production\'s has the Starts / Ends select and the Ends box, with no id, on Starts',
           every && prod && noIds && shown(sel('post')) && shown(byId('start-post')) && !shown(box('post')), { every: every, prod: prod, noIds: noIds });
    });

    // ===== R1: a round trip leaves nothing behind ===================================================================
    await step('R1', async function () {
      var a = await save();
      await anchor('post', 'ends'); await anchor('post', 'starts');
      var b = await save();
      kase('R1', 'Starts -> Ends -> Starts saves byte for byte the file it saved before (no phaseEnds key, the same fields)',
           comparable(a) === comparable(b) && !('phaseEnds' in JSON.parse(b)), { lenA: a.length, lenB: b.length });
    });

    // ===== E1 / U1: to Ends moves nothing ===========================================================================
    await step('E1', async function () {
      await anchor('post', 'ends');
      var p = postState();
      var ok = same(p, Object.assign({}, P0, { end: '2027-03-05' })) && p.start === '2026-11-02' && p.last === '3/1/27:Post wk 16';
      var ui = rowOf('post').classList.contains('ends-mode') && shown(box('post')) && box('post').value === '2027-03-05'
            && !shown(byId('start-post')) && !shown(byId('snap-post')) && !shown(byId('autostart-post'))
            && shown(byId('snap-localization')) && shown(byId('autostart-localization'));
      kase('E1', 'to Ends moves nothing (the same Post cells, start 11/2/26); end-post is Fri 3/5/27, shown in the start box\'s place; Snap and "Start after previous phase" go, Localization keeps both',
           ok && ui, { before: P0, after: p, ui: ui });
    });
    await step('U1', async function () {
      await undo();
      var back = sel('post').value === 'starts' && !rowOf('post').classList.contains('ends-mode') && byId('end-post').value === '' && same(postState(), P0);
      await redo();
      var again = sel('post').value === 'ends' && byId('end-post').value === '2027-03-05' && same(postState(), Object.assign({}, P0, { end: '2027-03-05' }));
      kase('U1', 'one undo step back to Starts (end-post emptied, the same cells), one redo to Ends', back && again, { back: back, again: again });
    });

    // ===== E2: the end holds ========================================================================================
    var P18 = null;
    await step('E2', async function () {
      T.set('weeks-post', '18'); await settle();
      P18 = postState();
      kase('E2', '16 -> 18 weeks moves the START two weeks earlier (10/19/26) and Post still ends the week of 3/1/27 (end-post 3/5/27)',
           P18.start === '2026-10-19' && P18.end === '2027-03-05' && P18.first === '10/19/26:Post wk 1' && P18.last === '3/1/27:Post wk 18', { p: P18 });
    });

    // ===== E3: the phase's own hiatus ==============================================================================
    await step('E3', async function () {
      byId('phiatus-en-post').click(); await T.sleep(300);
      T.set('phiatus-start-post', '2027-01-18'); T.set('phiatus-weeks-post', '1'); await settle();
      var on = postState();
      byId('phiatus-en-post').click(); await settle();
      var off = postState();
      kase('E3', 'Post\'s own one-week hiatus inside it pulls the start one more week (10/12/26) and the end holds; turned off, back to 10/19/26',
           on.start === '2026-10-12' && on.last === '3/1/27:Post wk 18' && same(off, P18), { on: on, off: off });
    });

    // ===== E4: a typed Wednesday ===================================================================================
    await step('E4', async function () {
      await typeEnd('post', '2027-03-17');
      var p = postState(), shows = box('post').value;
      await typeEnd('post', '2027-03-05');
      kase('E4', 'a typed Wed 3/17/27 is read as Fri 3/19/27 (the start two weeks later, 11/2/26), and the box shows the Friday once it loses focus',
           p.end === '2027-03-19' && p.start === '2026-11-02' && shows === '2027-03-19' && same(postState(), P18), { p: p, shows: shows });
    });

    // ===== E5: the picker ==========================================================================================
    await step('E5', async function () {
      box('post').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await T.sleep(200);
      var pop = document.querySelector('.date-pop');
      if (!pop) throw new Error('the picker did not open');
      var days = Array.prototype.slice.call(pop.querySelectorAll('.dp-day'));
      // The grid starts on a Monday, so column 4 is Friday.
      var onlyFri = days.every(function (b, i) { return (i % 7 === 4) === !b.classList.contains('dp-off'); });
      var capped = days.filter(function (b) { return b.classList.contains('dp-cap') && b.classList.contains('dp-solo'); }).map(function (b) { return b.textContent.trim(); });
      var hint = Array.prototype.map.call(pop.querySelectorAll('.dp-hint'), function (h) { return h.textContent.trim(); }).join(' | ');
      var title = pop.querySelector('.dp-title').textContent.trim();
      var fri12 = days.filter(function (b, i) { return i % 7 === 4 && b.textContent.trim() === '12' && !b.classList.contains('dp-out'); })[0];
      if (fri12) { fri12.click(); await settle(); }
      var p = postState();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await typeEnd('post', '2027-03-05');
      kase('E5', 'the picker (March 2027) offers only Fridays with "This phase ends on a Friday, so only Fridays can be picked.", Fri 5 capped alone; picking Fri 12 makes it the end',
           title === 'March 2027' && onlyFri && same(capped, ['5']) && hint === 'This phase ends on a Friday, so only Fridays can be picked.'
           && p.end === '2027-03-12' && p.start === '2026-10-26', { month: title, onlyFri: onlyFri, capped: capped, hint: hint, p: p });
    });

    // ===== S1: Shift All moves the end =============================================================================
    await step('S1', async function () {
      var btn = Array.prototype.filter.call(document.querySelectorAll('button'), function (b) { return /1 wk\s*→/.test((b.textContent || '').trim()); })[0];
      if (!btn) throw new Error('no "1 wk →" button');
      btn.click(); await settle();
      var p = postState();
      await undo();
      kase('S1', 'Shift All +1 wk moves the END a week (3/12/27) and the start follows (10/26/26) past the locked hiatus; undo puts both back',
           p.end === '2027-03-12' && p.start === '2026-10-26' && p.last === '3/8/27:Post wk 18' && same(postState(), P18), { p: p });
    });

    // ===== F: the file =============================================================================================
    var saved = null;
    await step('F1', async function () {
      saved = await save();
      var s = JSON.parse(saved), a = JSON.parse(written[0]);
      var ok = same(s.phaseEnds, ['post']) && same(Object.keys(s.fields.byId), Object.keys(a.fields.byId))
            && s.fields.byId['start-post'].value === '2026-10-19' && s.fields.byId['end-post'].value === '2027-03-05';
      var off = JSON.parse(saved); delete off.phaseEnds;
      await load(JSON.stringify(off, null, 1));
      var offLoaded = sel('post').value === 'starts' && !rowOf('post').classList.contains('ends-mode') && same(postState(), P18);
      await load(saved);
      var back = sel('post').value === 'ends' && rowOf('post').classList.contains('ends-mode') && box('post').value === '2027-03-05' && same(postState(), P18);
      kase('F1', 'Save writes phaseEnds ["post"], the same field ids as before, start-post 10/19/26 and end-post 3/5/27; Load brings Ends back',
           ok && back, { phaseEnds: s.phaseEnds, back: back });
      kase('F2', 'the same file with NO phaseEnds key opens with Post on Starts at the same dates, never the previous calendar\'s Ends (the M-5 trap)',
           offLoaded, { offLoaded: offLoaded });
    });
    await step('F3', async function () {
      var s = JSON.parse(saved);
      s.phaseEnds = ['production', 'custom9', 7, 'post', 'post'];
      await load(JSON.stringify(s, null, 1));
      var only = ['writersRoom', 'prePrep', 'prodPrep', 'localization'].every(function (k) { return sel(k).value === 'starts'; }) && sel('post').value === 'ends';
      var again = JSON.parse(await save());
      kase('F3', 'a hostile phaseEnds (Production, an unknown phase, a number, a repeat) keeps Post alone, and saves as ["post"]',
           only && same(again.phaseEnds, ['post']) && same(postState(), P18), { only: only, phaseEnds: again.phaseEnds });
    });

    // ===== D1: Length -> Dates ======================================================================================
    await step('D1', async function () {
      // Dates and Weeks may number the weeks across the hiatus differently, so the span is compared by its dates.
      function span() { var c = cellsOf('Post'); return [c[0].split(':')[0], c[c.length - 1].split(':')[0]]; }
      var before = span();
      T.set('unit-post', 'dates'); await settle();
      var asDates = same(span(), before) && byId('start-post').value === '2026-10-19' && byId('end-post').value === '2027-03-05'
                 && !rowOf('post').classList.contains('ends-mode') && !shown(sel('post')) && shown(byId('start-post'));
      var file = JSON.parse(await save());
      T.set('unit-post', 'weeks'); await settle();
      var backWeeks = sel('post').value === 'starts' && !rowOf('post').classList.contains('ends-mode');
      kase('D1', 'Length -> Dates from Ends moves nothing (Post still 10/19/26 to the week of 3/1/27; start 10/19/26, end 3/5/27) and leaves Ends (no phaseEnds saved); back to Weeks is on Starts',
           asDates && !('phaseEnds' in file) && backWeeks, { asDates: asDates, saved: file.phaseEnds, backWeeks: backWeeks });
    });

    // ===== K1: a custom Weeks phase ================================================================================
    await step('K1', async function () {
      byId('add-phase-btn').click(); await T.sleep(500);
      var units = document.querySelectorAll('.form-panel select[id^="unit-custom"]');
      var key = units[units.length - 1].id.slice(5);
      T.set('name-' + key, 'Colour'); T.set('start-' + key, '2027-01-04'); T.set('weeks-' + key, '4'); await settle();
      await anchor(key, 'ends');
      var e0 = byId('end-' + key).value, s0 = byId('start-' + key).value;
      T.set('weeks-' + key, '6'); await settle();
      var s6 = byId('start-' + key).value;
      await typeEnd(key, '2027-02-03');
      var e1 = byId('end-' + key).value, s1 = byId('start-' + key).value, b1 = box(key).value;
      kase('K1', 'a custom Weeks phase: to Ends holds Fri 1/29/27 (start 1/4/27 unmoved); 6 weeks starts it 12/7/26, back over the hiatus; a typed Wed 2/3/27 ends it Fri 2/5/27 (start 12/14/26)',
           e0 === '2027-01-29' && s0 === '2027-01-04' && s6 === '2026-12-07' && e1 === '2027-02-05' && s1 === '2026-12-14' && b1 === '2027-02-05',
           { key: key, e0: e0, s0: s0, s6: s6, e1: e1, s1: s1, b1: b1 });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/value\(s\) in this calendar were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (the one F3 warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'endsdate threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
