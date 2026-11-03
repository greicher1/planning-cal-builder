// colswapcache -- on a calendar holding a stored column swap, every edit reaches the waterfall, not only the edits that
// move a column. A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colswap-simpost-refuse ./run.sh colswapcache 400
//
// THE BUG (found 2 Nov 2026 while building the Sim Post rename; on main before it). update() runs the column-swap
// gate, maybeRunColSwapGate(), which caches its result against a structural key: the week count, each week's column
// multiset, the stored swaps, colWidths and Sim Post on/off. On a cache hit update() drew the CACHED result's
// schedule, the one computed at the last miss, in place of the schedule it had just computed. So any edit that moved
// none of those never reached the screen: a phase renamed, Sim Post's offset, "Number these weeks", an undo of any of
// them. Measured on a build of 270687f with this fixture: the cells kept "Post wk N", "Simultaneous Post" and the old
// Sim Post weeks.
//
// The fixture: Production 11/2/26 (30 shoot days), Post 11/30/26 x 6, Sim Post on at offset 1, and a stored
// Production <-> Post swap on 11/30 and 12/7. With Sim Post on, the gate REFUSES the swap (colswapgate says why); with
// it off, the swap applies. Both halves are driven, because the cache hit returned a stale schedule either way.
//
//   G0  as loaded: the swap is refused (Production left of Post on 11/30 and 12/7), the cells read "Simultaneous
//       Post", "Post wk N"
//   N1  "Number these weeks" ticked: the Sim Post cells read "Simultaneous Post wk 1, 2, ..." in date order, and
//       Post carries on the count; the gate's verdict is unchanged (still refused)
//   O1  Sim Post's offset 1 -> 0: Sim Post starts one week EARLIER, numbered from wk 1 there
//   R1  Post renamed "Edit": every Post cell reads "Edit wk N"
//   S1  Sim Post switched off: the stored swap APPLIES (Post left of Production on 11/30 and 12/7), no Sim Post cell
//   R2  Post renamed "Cut" with the swap applied: every Post cell reads "Cut wk N", and the swap is still applied
//   U1  undo: the cells read "Edit wk N" again, the swap still applied; redo: "Cut wk N"
//   C1  Post recoloured, the swap applied: every Post cell takes the new fill. The one case here the cache KEY cannot
//       see (no layout measures a colour), so it holds the other half of the fix: a hit returns the fresh schedule
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'colswapcache', cases: [] };
  var SWAPPED = ['2026-11-30', '2026-12-07'];
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
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  // A phase's name box, typed as a user types: the value, input, change, then the box left.
  async function rename(id, v) {
    var b = byId(id), d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    b.focus(); d.set.call(b, v); b.dispatchEvent(new Event('input', { bubbles: true }));
    b.dispatchEvent(new Event('change', { bubbles: true })); b.blur();
    await settle();
  }
  async function click(id) { byId(id).click(); await settle(); }
  // Which phase holds which column in a week, as colswapgate reads it: "post@2 production@0".
  function rowOf(wk) {
    return qa('#table-wrap td.sheet-phase-cell').filter(function (td) { return td.dataset.week === wk; })
      .map(function (td) { return td.dataset.pkey + '@' + td.dataset.own; }).sort().join(' ');
  }
  // Post at 2: since frozen edit SP1 (2 Nov 2026) Sim Post has its own column between Production and Post (see
  // colswapgate.js). Every case that asks refused() has Sim Post on.
  function refused() { return SWAPPED.every(function (w) { return rowOf(w) === 'post@2 production@0'; }); }
  function applied() { return SWAPPED.every(function (w) { return rowOf(w) === 'post@0 production@1'; }); }
  function rows() { var o = {}; SWAPPED.forEach(function (w) { o[w] = rowOf(w); }); return o; }
  // Every Post cell's text, in date order.
  function postCells() {
    return qa('#table-wrap td.sheet-phase-cell').filter(function (td) { return td.dataset.pkey === 'post'; })
      .sort(function (a, b) { return a.dataset.week < b.dataset.week ? -1 : a.dataset.week > b.dataset.week ? 1 : 0; })
      .map(function (td) { return (td.textContent || '').trim(); });
  }
  function allRead(cells, prefix) {
    return cells.length > 0 && cells.every(function (t, i) { return t === prefix + ' wk ' + (+cells[0].split(' wk ')[1] + i); });
  }
  // Every Sim Post cell as {week, text}, in date order. A Sim Post cell has no class and the yellow fill first
  // (simpostname's test). Its week is the date cell before it in the same row: the year blocks sit side by side, so
  // the row's last date seen is the block it belongs to (simpostlabel reads it the same way).
  function simCells() {
    var found = [];
    qa('#table-wrap table.sheet-table tbody tr').forEach(function (tr) {
      var iso = null;
      Array.from(tr.children).forEach(function (td) {
        var t = (td.textContent || '').trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?![\s\S])/.exec(t);
        if (m && !td.className.match(/sheet-phase-cell/)) {
          var y = +m[3]; if (y < 100) y += 2000;
          iso = y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
        } else if (!td.className && (td.getAttribute('style') || '').toUpperCase().indexOf('BACKGROUND:#FFFF00') === 0) {
          found.push({ week: iso, text: t });
        }
      });
    });
    return found.sort(function (a, b) { return a.week < b.week ? -1 : a.week > b.week ? 1 : 0; });
  }
  function uniqFills(tds) {
    return tds.map(function (td) { return getComputedStyle(td).backgroundColor; })
      .filter(function (c, i, a) { return a.indexOf(c) === i; });
  }
  function weekBefore(iso) {
    var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString().slice(0, 10);
  }

  try {
    await T.until(function () { return qa('#table-wrap table.sheet-table tbody tr').length > 1; }, 'the grid to render', 150, 100);
    await settle();
    var sim0 = simCells(), post0 = postCells();

    await step('G0', async function () {
      kase('G0', 'as loaded: the stored swap is refused (Sim Post on), the cells read "Simultaneous Post" and "Post wk N"',
        refused() && sim0.length > 0 && sim0.every(function (c) { return c.text === 'Simultaneous Post' && c.week; }) &&
        allRead(post0, 'Post') && post0[0] === 'Post wk 1',
        { rows: rows(), sim: sim0, post: post0 });
    });

    await step('N1', async function () {
      await click('simpost-count');
      var sim = simCells(), post = postCells();
      var numbered = sim.length === sim0.length && sim.every(function (c, i) { return c.text === 'Simultaneous Post wk ' + (i + 1); });
      kase('N1', '"Number these weeks": the Sim Post cells read "Simultaneous Post wk 1, 2, ..." and Post carries on the count; the swap still refused',
        byId('simpost-count').checked && numbered && allRead(post, 'Post') && post[0] === 'Post wk ' + (sim.length + 1) && refused(),
        { rows: rows(), sim: sim, post: post });
    });

    await step('O1', async function () {
      var before = simCells();
      T.set('simpost-offset', '0'); await settle();
      var sim = simCells();
      kase('O1', 'Sim Post\'s offset 1 -> 0: it starts one week earlier, numbered from wk 1 there; the swap still refused',
        before.length > 0 && sim.length > 0 && sim[0].week === weekBefore(before[0].week) &&
        sim[0].text === 'Simultaneous Post wk 1' && refused(),
        { rows: rows(), firstBefore: before[0], first: sim[0], count: sim.length });
    });

    await step('R1', async function () {
      await rename('name-post', 'Edit');
      var post = postCells();
      kase('R1', 'Post renamed "Edit" (Sim Post on, swap refused): every Post cell reads "Edit wk N"',
        allRead(post, 'Edit') && refused(), { rows: rows(), post: post });
    });

    await step('S1', async function () {
      await click('simpost-enabled');
      kase('S1', 'Sim Post off: the stored swap applies (Post left of Production on 11/30 and 12/7), no Sim Post cell',
        !byId('simpost-enabled').checked && applied() && simCells().length === 0, { rows: rows(), sim: simCells().length });
    });

    await step('R2', async function () {
      await rename('name-post', 'Cut');
      var post = postCells();
      kase('R2', 'Post renamed "Cut" with the swap applied: every Post cell reads "Cut wk N", and the swap is still applied',
        allRead(post, 'Cut') && post[0] === 'Cut wk 1' && applied(), { rows: rows(), post: post });
    });

    await step('U1', async function () {
      await click('undo-btn');
      var undone = postCells(), rowsUndone = rows(), appliedUndone = applied();
      await click('redo-btn');
      var redone = postCells();
      kase('U1', 'undo takes "Cut" back to "Edit wk N" and redo puts it back, the swap applied throughout',
        allRead(undone, 'Edit') && appliedUndone && allRead(redone, 'Cut') && applied(),
        { undone: undone, rowsUndone: rowsUndone, redone: redone, rows: rows() });
    });

    // C1 is the case the cache KEY cannot see: a cell's colour is in the schedule, but no layout measures it, so the
    // key does not carry it and this is a cache HIT. It holds the fix's other half: a hit returns the verdict with the
    // schedule update() just computed. (A wider key alone turns N1-U1 green and leaves this red.)
    await step('C1', async function () {
      var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
      await T.sleep(100);
      var sw = byId('swatch-post'), was = getComputedStyle(sw).backgroundColor;
      sw.scrollIntoView({ block: 'center' }); await T.sleep(100);
      sw.click();
      await T.until(function () { return qa('.phase-color-pop .pc-sw').length > 0; }, 'the colour picker', 30, 100);
      var p = qa('.phase-color-pop .pc-sw')[13];
      if (!p) throw new Error('the picker has no colour 13');
      var r = p.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit !== p) throw new Error('colour 13 is not on top at its centre');
      hit.click();
      await settle();
      var now = getComputedStyle(byId('swatch-post')).backgroundColor;
      var fills = uniqFills(qa('#table-wrap td.sheet-phase-cell').filter(function (td) { return td.dataset.pkey === 'post'; }));
      kase('C1', 'Post recoloured with the swap applied (a change the cache key does not carry): every Post cell takes the new fill',
        now !== was && fills.length === 1 && fills[0] === now && applied(), { was: was, swatch: now, fills: fills, rows: rows() });
    });
    var errs = (T.appHealth().errors || []);
    kase('E0', 'no console errors', errs.length === 0, { errors: errs.slice(0, 6) });
  } catch (e) { out.cases.push({ id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e) }); }
  T.done(out);
})(); });
