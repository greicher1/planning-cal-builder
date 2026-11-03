// spancounts -- the shoot's weeks and the shoot days it lost, on Production's span (owner, 2 Nov 2026: "can we have three
// icons: one that says the number of production weeks, one that says the number of holidays costing a shoot day, and
// something that says the number of Off Days costing a shoot day"; version D of mockups/production-span-stats.html,
// then "D replaces the whole line", the totals box's "16 off · 3 added — 102 days on the floor" line; then "we need
// the sum of these listed", "net: lost minus added", and version C of mockups/production-span-net.html, "Lets go with
// C but I want it to dynamically hide the off days and added days part of the calculation if there are none", "And if
// you hover over holidays, it should show you which ones"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh spancounts 300
//
// T.buildFixture()'s calendar: Production from Mon 6/29/26, 80 shoot days on U.S. Area Standards, wrapping Tue
// 10/20/26. Inside the shoot: Independence Day (Observed) Fri 7/3/26 and Labor Day Mon 9/7/26. A plain Monday-to-Friday
// 80 days would wrap Fri 10/16/26, so every case's wrap is that day moved by its net, which is what the sum claims.
//
//   C1  the weeks on the dashed line (the meta line's "→ N wk"); under the dates, holidays only: "2 holidays = 2 shoot
//       days lost", no Off or added term; hovering the holidays names both; no id; one row; the totals line hidden
//   A1  "↳ Start after …" directly under the date box (owner, 3 Nov 2026), above the span, flush with the box
//   F1  the span OPENS the Total Shooting Days box (version F of mockups/production-span-placement.html, "Build F"):
//       its first child, over the total, inside the box's edges, with a hairline under it
//   M1  a Load with marks: Off on Wed 7/15 (counts), Sat 7/18 (a weekend, costs nothing) and Labor Day (counts, as an
//       Off day: the walk leaves a holiday marked Off out of its holidays); 'on' on Fri 7/3 (a holiday worked: NOT
//       added, simply not lost, and named on the total's hover) and Sat 8/1 (added), and Wed 7/8 (a day shot anyway).
//       So no holidays term: "2 Off days − 1 added = 1 shoot day lost", and the wrap is Mon 10/19/26. The hidden
//       totals line is still written (three legs read it)
//   W1  a whole week marked Off (Mon-Fri 7/20-7/24): "2 holidays + 5 Off days = 7 shoot days lost", the weeks the
//       same as C1's (an Off week is left out, as the meta line does), the wrap Tue 10/27/26
//   G1  three Saturdays worked: "2 holidays − 3 added = 1 shoot day gained", green, the wrap Thu 10/15/26
//   Z1  Region None: no term at all, "No shoot days lost", grey, no "=", the wrap Fri 10/16/26
//   E1  Ends shows the same weeks and sum as Starts
//   N1  squeezed to 210 px (the sidebar measured 221 px at a 961 px window) and redrawn, the dashed line is too short
//       for the weeks, which move to their own row under the dates; widened and redrawn, back on the line. (Not the
//       ResizeObserver that re-fits on a window resize: it did not deliver while this leg ran.)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'spancounts', cases: [] };
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
  function shown(el) { return !!(el && el.offsetParent); }
  function nativeSet(e, v) {
    var proto = e instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
  }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function row() { return byId('start-production').closest('.phase-row'); }
  function span() { return row().querySelector('.prod-span'); }
  async function anchor(v) { var s = row().querySelector('select.phase-anchor'); nativeSet(s, v); s.dispatchEvent(new Event('change', { bubbles: true })); await settle(); }
  function metaWeeks() { var m = /→ (\d+) wk/.exec((byId('meta-production') || {}).textContent || ''); return m ? +m[1] : null; }
  // The sum under the dates, each part as {kind, n, op, text, title, top}; the total is kind 'net' with its class.
  function stats() {
    var s = span();
    if (!s || s.hidden) return null;
    return Array.prototype.map.call(s.querySelectorAll('.prod-span-stats .prod-stat'), function (e) {
      var op = e.querySelector('.prod-stat-op'), net = e.querySelector('.prod-span-net');
      return { kind: e.dataset.stat, n: +((e.querySelector('strong') || {}).textContent), op: op ? op.textContent : '',
               text: (e.textContent || '').replace(/\s+/g, ' ').trim(), title: e.getAttribute('title') || '',
               cls: net ? net.className.replace('prod-span-net', '').trim() : '', top: Math.round(e.getBoundingClientRect().top) };
    });
  }
  function sumText() { var s = span(); return s ? (s.querySelector('.prod-span-stats').textContent || '').replace(/\s+/g, ' ').trim() : null; }
  function weeksOnLine() {
    var w = span().querySelector('.prod-span-weeks');
    return { text: (w.textContent || '').trim(), title: (w.querySelector('.prod-stat') || {}).title || '',
             visible: getComputedStyle(w).visibility !== 'hidden' && !span().classList.contains('weeks-under'),
             row: shown(span().querySelector('.prod-span-weeksrow')) };
  }
  // The total's pill is 2 px taller than a count, so the row's parts are centred, not top-aligned: within 3 px is one row.
  function oneRow(s) { return s.every(function (x) { return Math.abs(x.top - s[0].top) <= 3; }); }
  function wrapText() { return (span().querySelector('[data-end="wrap"] .prod-span-d') || {}).textContent; }
  function byKind(list, k) { return (list || []).filter(function (x) { return x.kind === k; })[0] || null; }

  // ---- Save and Load through the real controls (prodends' shape) ------------------------------------------------
  var written = [];
  var saveHandle = { name: 'spancounts.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'spancounts.sptcal', { lastModified: 1 }); },
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
    var stem = 'spancounts-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function withMarks(base, marks) { var s = JSON.parse(base); s.dayOverrides = marks; return JSON.stringify(s, null, 1); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!(span() && !span().hidden); }, 'the span', 200, 100);
    await settle();
    var tab = Array.prototype.filter.call(document.querySelectorAll('button, [role=tab]'), function (b) { return (b.textContent || '').trim() === 'Phases'; })[0];
    if (tab) { tab.click(); await T.sleep(400); }
    var base = await save();
    var W0 = null;

    // ===== C1: the fixture, holidays only ==========================================================================
    await step('C1', async function () {
      var s = stats(), hol = byKind(s, 'hols'), net = byKind(s, 'net'), wk = weeksOnLine();
      var line = span().querySelector('.prod-span-stats');
      var pills = Array.prototype.map.call(span().querySelectorAll('.prod-span-d'), function (e) { return e.getBoundingClientRect().bottom; });
      var note = byId('prod-ov-note');
      W0 = wk.text;
      kase('C1', 'the weeks on the dashed line (the meta line\'s); under the dates, holidays only: "2 holidays = 2 shoot days lost", the holidays named on hover; no id; one row, below the pills; the totals line hidden',
           !!s && s.length === 2 && wk.text === metaWeeks() + ' weeks' && wk.visible && !wk.row
           && wk.title === metaWeeks() + ' weeks of shooting. Hiatus weeks and weeks marked Off are not counted.'
           && !!hol && hol.n === 2 && hol.op === '' && hol.title === '2 holidays cost a shoot day:\nIndependence Day (Observed), Fri 7/3/26\nLabor Day, Mon 9/7/26'
           && !!net && net.cls === 'lost' && sumText() === '2 holidays = 2 shoot days lost'
           && net.title === '2 shoot days lost: the wrap is 2 shoot days later than it would be with no holidays, Off days or weekends worked.\n2 holidays = 2'
           && span().querySelectorAll('[id]').length === 0
           && line.getBoundingClientRect().top >= Math.max.apply(null, pills) && oneRow(s)
           && !!note && note.hidden && !shown(note) && (row().innerText || '').indexOf('on the floor') < 0,
           { stats: s, sum: sumText(), weeks: wk, meta: metaWeeks(), noteHidden: note && note.hidden });
    });

    // ===== A1: "Start after" under the date box ===================================================================
    await step('A1', async function () {
      var btn = byId('autostart-production'), box = byId('start-production');
      var b = btn.getBoundingClientRect(), d = box.getBoundingClientRect(), s = span().getBoundingClientRect();
      kase('A1', '"↳ Start after …" sits directly under the date box (owner, 3 Nov 2026), above the span, flush with the box\'s left edge',
           shown(btn) && /^↳ Start after /.test(btn.textContent || '')
           && b.top >= d.bottom && b.top - d.bottom <= 8 && b.bottom <= s.top && Math.abs(b.left - d.left) <= 1,
           { btn: { top: b.top, bottom: b.bottom, left: b.left }, box: { bottom: d.bottom, left: d.left }, spanTop: s.top, text: btn.textContent });
    });

    // ===== F1: the span opens the Total Shooting Days box =========================================================
    await step('F1', async function () {
      var blk = row().querySelector('.prod-total-block'), rd = byId('prod-total-readout');
      var sp = span(), b = blk && blk.getBoundingClientRect(), s = sp.getBoundingClientRect(), r = rd && rd.getBoundingClientRect();
      var cs = getComputedStyle(sp);
      kase('F1', 'the span opens the Total Shooting Days box: its first child, over the total, inside the box, a hairline under it',
           !!blk && blk.firstElementChild === sp && !!rd && s.bottom <= r.top && s.top >= b.top && s.left >= b.left - 0.5 && s.right <= b.right + 0.5
           && cs.borderBottomStyle === 'solid' && parseFloat(cs.borderBottomWidth) === 1,
           { box: b && { top: b.top, left: b.left, right: b.right }, span: { top: s.top, bottom: s.bottom, left: s.left, right: s.right }, readoutTop: r && r.top,
             border: cs.borderBottom, first: blk && blk.firstElementChild && blk.firstElementChild.className });
    });

    // ===== M1: marks ==============================================================================================
    await step('M1', async function () {
      await load(withMarks(base, { '2026-07-15': 'off', '2026-07-18': 'off', '2026-09-07': 'off',
                                   '2026-07-03': 'on', '2026-08-01': 'on', '2026-07-08': 'on' }));
      var s = stats(), off = byKind(s, 'offs'), add = byKind(s, 'added'), net = byKind(s, 'net');
      var note = byId('prod-ov-note');
      kase('M1', 'Off on Wed 7/15 and Labor Day count, a Saturday Off does not; a worked Saturday is added, a worked holiday is not (it is named on the total\'s hover); no holidays term: "2 Off days − 1 added = 1 shoot day lost", wrapping Mon 10/19/26; the hidden totals line still written',
           !!s && s.map(function (x) { return x.kind; }).join() === 'offs,added,net' && !byKind(s, 'hols')
           && sumText() === '2 Off days − 1 added = 1 shoot day lost' && off.op === '' && add.op === '−'
           && off.title === '2 days marked Off cost a shoot day:\nWed 7/15/26\nMon 9/7/26'
           && add.title === '1 weekend day worked:\nSat 8/1/26'
           && net.cls === 'lost' && /\n\nWorked, so not lost:\nIndependence Day \(Observed\), Fri 7\/3\/26$/.test(net.title)
           && wrapText() === 'Mon 10/19/26' && weeksOnLine().text === W0
           && !!note && note.hidden && /3 off/.test(note.textContent) && /3 added/.test(note.textContent)
           && oneRow(s),
           { stats: s, sum: sumText(), wrap: wrapText(), note: note && note.textContent });
    });

    // ===== W1: an Off week ========================================================================================
    await step('W1', async function () {
      await load(withMarks(base, { '2026-07-20': 'off', '2026-07-21': 'off', '2026-07-22': 'off', '2026-07-23': 'off', '2026-07-24': 'off' }));
      var s = stats(), off = byKind(s, 'offs');
      kase('W1', 'a week marked Off: "2 holidays + 5 Off days = 7 shoot days lost"; the weeks are C1\'s (the Off week left out, as the meta line does) though the wrap is a week later, Tue 10/27/26',
           sumText() === '2 holidays + 5 Off days = 7 shoot days lost' && !!off && off.op === '+'
           && weeksOnLine().text === W0 && weeksOnLine().text === metaWeeks() + ' weeks' && wrapText() === 'Tue 10/27/26',
           { stats: s, sum: sumText(), weeks: weeksOnLine(), W0: W0, wrap: wrapText() });
    });

    // ===== G1: more added than lost ===============================================================================
    await step('G1', async function () {
      await load(withMarks(base, { '2026-07-11': 'on', '2026-07-18': 'on', '2026-07-25': 'on' }));
      var s = stats(), net = byKind(s, 'net');
      kase('G1', 'three Saturdays worked: "2 holidays − 3 added = 1 shoot day gained", green, wrapping Thu 10/15/26',
           sumText() === '2 holidays − 3 added = 1 shoot day gained' && !!net && net.cls === 'gained'
           && /^1 shoot day gained: the wrap is 1 shoot day earlier /.test(net.title) && wrapText() === 'Thu 10/15/26',
           { stats: s, sum: sumText(), wrap: wrapText() });
    });

    // ===== Z1: nothing lost =======================================================================================
    await step('Z1', async function () {
      var z = JSON.parse(base);
      z.fields.byId['union-place'] = { value: '' };
      await load(JSON.stringify(z, null, 1));
      var s = stats(), net = byKind(s, 'net');
      kase('Z1', 'Region None, no marks: no term at all, just "No shoot days lost", grey, with no "=", wrapping Fri 10/16/26',
           !!s && s.length === 1 && !!net && net.cls === 'none' && net.op === '' && sumText() === 'No shoot days lost'
           && wrapText() === 'Fri 10/16/26',
           { stats: s, sum: sumText(), wrap: wrapText() });
    });

    // ===== E1: Ends ===============================================================================================
    await step('E1', async function () {
      await load(base);
      var a = span().querySelector('.prod-span-stats').innerHTML + span().querySelector('.prod-span-weeks').innerHTML;
      await anchor('ends');
      var b = span().querySelector('.prod-span-stats').innerHTML + span().querySelector('.prod-span-weeks').innerHTML;
      await anchor('starts');
      kase('E1', 'Ends shows the same weeks and sum as Starts', a.length > 0 && a === b, { starts: a.length, ends: b.length });
    });

    // ===== N1: a narrow sidebar ===================================================================================
    await step('N1', async function () {
      // ⚠️ A ResizeObserver did not deliver while this leg ran (measured: a bare probe saw 0 callbacks, the first one
      // included), so the squeeze alone moves nothing here. The span is redrawn at the narrow width instead (a Load that
      // changes it), which runs fitProdSpanWeeks directly; the observer runs that same function in a browser.
      span().style.width = '210px';
      await load(withMarks(base, { '2026-07-15': 'off' }));
      var narrow = weeksOnLine(), nSum = sumText();
      span().style.width = '';
      await load(base);
      var wide = weeksOnLine();
      kase('N1', 'squeezed to 210 px and redrawn, the dashed line is too short for the weeks, which move to their own row under the dates; widened and redrawn, back on the line',
           !narrow.visible && narrow.row && span().querySelector('.prod-span-weeksrow').textContent.trim() === W0
           && nSum === '2 holidays + 1 Off day = 3 shoot days lost' && wide.visible && !wide.row,
           { narrow: narrow, wide: wide, sum: nSum });
    });

    var errs = T.appHealth().errors || [];
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'spancounts threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
