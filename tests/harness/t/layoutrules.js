// layoutrules -- the waterfall layout rules (LAYOUT-RULES.md §0; LAYOUT-BUILD-PLAN.md), one fixture per rule group.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=layout-r3 ./run.sh layoutrules 120     (r3, r6, r7, r9, r13, r17)
//
// Each fixture (tools/layout-study/fixtures.mjs) is a STAMPED synthetic calendar, and each is red on the build
// before the rules where its rule differs (dist/pre.html, kept out of git). What is read is the frozen grid as
// drawn: every phase cell's own slot (data-own), its position and colspan in its row, the Sim Post lane by its
// text, per year block -- the same reading tools/layout-study/compare.mjs scores the owner's calendars with.
//
//   layout-r3   rule 3 as the pictures have it: Production in Writers' column though only Prep's was handed off
//               that week; the lane in Prep's; Post continues the lane (6); Localization follows Post (7).
//   layout-r6   rule 6, general: a short custom phase and Post starting the week Production ends -- with Sim Post
//               the short one takes Production's column and Post the lane; without, Post goes right.
//   layout-r9   rule 9: the same two columns on opposite sides in consecutive years (stintOrderFor).
//   layout-r7   rules 2, 4 (R-D), 7: a handoff may sit left of a running phase; a phase not following on goes
//               right of everything running, and a paused phase keeps its column; Post -> Localization stacked.
//   layout-r13  rules 11-16 + 18 (piece 2, frozen widths): widths week by week.
//   layout-r17  rule 17 (piece 2): Single Column, nothing widens; Post in the lane.
//   layout-r20  rule 20 as it stands since 6 Nov 2026: Post starting in Production's last week gets a third column
//               beside the lane and Sim Post stays on every shoot week (the give-way of v1.12.0-v1.12.1, which sent
//               Post into the lane and dropped the marker, was withdrawn by the owner); Design beside Writers spreads
//               into that column.
//   layout-r2g  rule 2's short gap (6 Nov 2026): a phase starting up to 4 working weeks after a column empties follows into it;
//               5 weeks is R-D again -- for a phase the user has not moved. Test is moved here, so since sticky columns
//               (STICKY-COLUMNS-PLAN.md, ruling K3) it KEEPS Writers' column at five weeks; Reset Columns then hands it
//               back to the rules, which put it right (R2Gd)
//   layout-r2h  the short gap takes the LATEST-freed column: Prod Prep slid six weeks changes side once, not three times
//               (R2Hb, re-placed by the rules after each step with Reset Columns); slid by the user, it never changes
//               side at all (R2Ha, sticky columns)
//   layout-r3b  rule 3 since 6 Nov 2026: Production takes the leftmost FREE column even with a phase running to the
//               right of it (Writers' column over Prod Prep's handoff, Post running), and R-E gives it the spare.
//   layout-r13b rules 12, 13 and 15 since 6 Nov 2026 (frozen edit LR4): the owner's three-week-overlap calendar --
//               Pre-Prep two wide beside Writers (the right spread is not capped by the even share), the lane reserved
//               until the shoot ends, Sim Post on every shoot week, Post in a third column for its three overlap weeks.
//   layout-r20b rule 20, absorbing: a one-week Table Read's column does not count toward the even share; Prep
//               spreads into it once it is free for the rest of Prep's run.
//   layout-r21  rule 21, a run never shrinks: Post, two wide while alone, keeps both columns for the two weeks
//               Localization runs beside it (today it narrows to one and the spare sits at the left edge).
//   layout-r22  rule 22, a follow-on carries its predecessor's width (frozen edit LR6, owner 6 Nov 2026): Prod Prep keeps
//               Pre-Prep's two-wide cell until Casting takes the third column, then one wide to the end -- never across
//               all three for its last three weeks alone.
//   layout-r22b rule 22 measured by rule 21: Pre-Prep, KEPT two wide beside a Casting that remembers its own column, hands
//               that cell to Prod Prep (the first build saw one column and drew an upside-down T); after Reset Columns
//               Casting takes Writers' freed column and the year is two columns.
//   layout-r22c rule 22's hold keeps what the phase had: squeezed by Post, Prod Prep keeps Writers' freed column.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  var q = new URLSearchParams(location.search);
  var FX = q.get('state') || '';
  out.fixture = FX;
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var txt = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); };
  async function settle(label) {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, label, 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled ' + label, 200, 100);
  }
  // The grid as drawn: blocks[bi] = { year, rows: [{ date, iso, band, cells: [{what, pos, width, own}] }] }.
  function read() {
    var blocks = [];
    [].forEach.call(document.querySelectorAll('#table-wrap table.sheet-table tbody tr'), function (tr) {
      var bi = -1, pos = 0, cur = null;
      [].forEach.call(tr.children, function (td) {
        var cls = td.classList;
        if (cls.contains('sheet-date')) {
          bi++; pos = 0;
          if (!blocks[bi]) blocks[bi] = { rows: [] };
          cur = { date: txt(td), cells: [] };
          blocks[bi].rows.push(cur);
          return;
        }
        if (cls.contains('sheet-empty')) { bi += cls.contains('sheet-blockstart') ? 1 : 0; cur = null; return; }
        if (!cur) return;
        if (cls.contains('sheet-note-cell')) { cur = null; return; }
        var span = td.colSpan || 1, pkey = td.dataset.pkey, t = txt(td);
        if (cls.contains('sheet-hiatus-cell') && !pkey) { cur.band = t; pos += span; return; }
        if (pkey) cur.cells.push({ what: pkey, pos: pos, width: span, own: td.dataset.own === undefined ? null : +td.dataset.own, band: cls.contains('sheet-hiatus-cell') || undefined });
        else if (/Simultaneous Post/i.test(t)) cur.cells.push({ what: 'simpost', pos: pos, width: span, own: null });
        pos += span;
      });
    });
    blocks.forEach(function (b) {
      b.rows.forEach(function (r) { var m = r.date.match(/(\d+)\/(\d+)\/(\d+)/); r.iso = m ? (2000 + +m[3]) + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2) : r.date; });
      var m = b.rows[0] && b.rows[0].date.match(/(\d+)\/(\d+)\/(\d+)/);
      b.year = m ? String(2000 + +m[3]) : '?';
      b.width = Math.max.apply(null, [0].concat(b.rows.map(function (r) { return r.cells.reduce(function (w, c) { return Math.max(w, c.pos + c.width); }, 0); })));
    });
    return blocks;
  }
  var blockOf = function (bl, year) { return bl.filter(function (b) { return b.year === String(year); })[0] || null; };
  // The slot (data-own) a phase holds in a year, or null; the distinct slots in a year.
  function slotOf(bl, year, key) {
    var b = blockOf(bl, year); if (!b) return null;
    for (var i = 0; i < b.rows.length; i++) for (var j = 0; j < b.rows[i].cells.length; j++) { var c = b.rows[i].cells[j]; if (c.what === key && c.own !== null) return c.own; }
    return null;
  }
  function slotsIn(bl, year) {
    var b = blockOf(bl, year), s = {}; if (!b) return 0;
    b.rows.forEach(function (r) { r.cells.forEach(function (c) { if (c.own !== null) s[c.own] = 1; }); });
    return Object.keys(s).length;
  }
  // The lane's position in the first Sim Post row of a year, or null.
  function laneIn(bl, year) {
    var b = blockOf(bl, year); if (!b) return null;
    for (var i = 0; i < b.rows.length; i++) for (var j = 0; j < b.rows[i].cells.length; j++) { var c = b.rows[i].cells[j]; if (c.what === 'simpost') return c.pos; }
    return null;
  }
  // A phase's [pos, width] on a row, or null.
  function cellAt(bl, iso, key) {
    for (var bi = 0; bi < bl.length; bi++) for (var i = 0; i < bl[bi].rows.length; i++) {
      var r = bl[bi].rows[i]; if (r.iso !== iso) continue;
      for (var j = 0; j < r.cells.length; j++) if (r.cells[j].what === key) return [r.cells[j].pos, r.cells[j].width];
      return null;
    }
    return null;
  }
  // Every row of a phase's run in a year, as "iso:pos+width", for the width checks.
  function widthsOf(bl, year, key) {
    var b = blockOf(bl, year), o = []; if (!b) return o;
    b.rows.forEach(function (r) { r.cells.forEach(function (c) { if (c.what === key) o.push(r.iso + ':' + c.pos + '+' + c.width); }); });
    return o;
  }
  // Each distinct [pos, width] a phase draws over a run of rows, with the row it first does, in order.
  function shape(bl, year, key) {
    var o = [], last = '';
    var b = blockOf(bl, year); if (!b) return o;
    b.rows.forEach(function (r) { r.cells.forEach(function (c) {
      if (c.what !== key) return;
      var s = c.pos + '+' + c.width; if (s !== last) { o.push(r.iso + ':' + s); last = s; }
    }); });
    return o;
  }
  var same = function (bl, year, a, b) { var x = slotOf(bl, year, a); return x !== null && x === slotOf(bl, year, b); };
  var J = function (x) { return JSON.stringify(x); };

  try {
    try { localStorage.clear(); } catch (e) {}
    await settle('the restored grid');
    var bl = read();
    out.slots = {}; bl.forEach(function (b) { out.slots[b.year] = {}; });
    bl.forEach(function (b) { b.rows.forEach(function (r) { r.cells.forEach(function (c) { if (c.own !== null) { var S = out.slots[b.year][c.own] = out.slots[b.year][c.own] || []; if (S.indexOf(c.what) < 0) S.push(c.what); } }); }); });
    out.blockWidths = {}; bl.forEach(function (b) { out.blockWidths[b.year] = b.width; });
    out.lanes = {}; bl.forEach(function (b) { out.lanes[b.year] = laneIn(bl, b.year); });
    out.strip = !!(document.getElementById('layout-notice') || {hidden: true}).hidden === false;   // a stamped fixture raises no strip

    if (FX === 'layout-r3') {
      C('R3a', 'Production in Writers’ column, though only Prep’s column was handed off that week (rule 3 as pictured)',
        same(bl, 2031, 'production', 'writersRoom') && !same(bl, 2031, 'production', 'prodPrep'), J(out.slots['2031']));
      C('R3b', 'Design, Prep and then the Sim Post lane share the column right of Production (rules 2, 8)',
        same(bl, 2031, 'prePrep', 'prodPrep') && laneIn(bl, 2031) === slotOf(bl, 2031, 'prodPrep') && slotOf(bl, 2031, 'production') === 0 && slotOf(bl, 2031, 'prodPrep') === 1,
        J({ slots: out.slots['2031'], lane: out.lanes['2031'] }));
      C('R3c', '2031 is two columns, not three', slotsIn(bl, 2031) === 2 && blockOf(bl, 2031).width === 2, J(out.blockWidths));
      C('R6a', 'Post continues the Sim Post lane (rule 6)', same(bl, 2031, 'post', 'prodPrep') && !same(bl, 2031, 'post', 'production'), J(out.slots['2031']));
      C('R7a', 'Localization follows Post into its column in 2032 (rule 7)', same(bl, 2032, 'localization', 'post') && slotsIn(bl, 2032) === 1, J(out.slots['2032']));
    }
    if (FX === 'layout-r6') {
      C('R6a', 'with Sim Post: Reshoots (3 wk, not a wrap) takes Production’s column, Post the lane (rule 6, general)',
        same(bl, 2031, 'custom1', 'production') && same(bl, 2031, 'post', 'prodPrep') && laneIn(bl, 2031) === slotOf(bl, 2031, 'post') && slotsIn(bl, 2031) === 2,
        J({ slots: out.slots['2031'], lane: out.lanes['2031'] }));
      // Sim Post off: the short one still takes the handoff, Post goes right (into Prep's free column).
      var sp = document.getElementById('simpost-enabled');
      sp.checked = false; sp.dispatchEvent(new Event('change', { bubbles: true }));
      await T.sleep(400); await settle('the grid without Sim Post');
      var b2 = read();
      out.slotsNoSim = {}; b2.forEach(function (b) { out.slotsNoSim[b.year] = {}; b.rows.forEach(function (r) { r.cells.forEach(function (c) { if (c.own !== null) { var S = out.slotsNoSim[b.year][c.own] = out.slotsNoSim[b.year][c.own] || []; if (S.indexOf(c.what) < 0) S.push(c.what); } }); }); });
      C('R6b', 'without Sim Post: Reshoots still takes Production’s column and Post goes right, two columns',
        same(b2, 2031, 'custom1', 'production') && !same(b2, 2031, 'post', 'production') && same(b2, 2031, 'post', 'prodPrep') && slotsIn(b2, 2031) === 2,
        J(out.slotsNoSim['2031']));
      C('R6c', 'no Sim Post lane drawn', laneIn(b2, 2031) === null, laneIn(b2, 2031));
    }
    if (FX === 'layout-r9') {
      C('R9a', '2031: last season’s Post column left of Writers’', slotOf(bl, 2031, 'custom1') === 0 && slotOf(bl, 2031, 'writersRoom') === 1 && slotsIn(bl, 2031) === 2, J(out.slots['2031']));
      C('R9b', '2032: Writers’ column LEFT of the column Design, Prep and Production reuse (Writers started first; rule 9)',
        slotOf(bl, 2032, 'writersRoom') === 0 && slotOf(bl, 2032, 'prePrep') === 1 && same(bl, 2032, 'prePrep', 'prodPrep') && same(bl, 2032, 'prodPrep', 'production'),
        J(out.slots['2032']));
      C('R9c', '2032: the lane right of Production, Post continuing it, three columns',
        laneIn(bl, 2032) === 2 && slotOf(bl, 2032, 'post') === 2 && slotsIn(bl, 2032) === 3, J({ slots: out.slots['2032'], lane: out.lanes['2032'] }));
    }
    if (FX === 'layout-r7') {
      C('R7a', 'Prep hands off from S1 Post into the column LEFT of the running Writers (rule 2 beats R-D)',
        same(bl, 2031, 'prodPrep', 'custom1') && slotOf(bl, 2031, 'custom1') === 0 && slotOf(bl, 2031, 'writersRoom') === 1, J(out.slots['2031']));
      C('R7b', 'Research, starting the week Writers pauses, takes a NEW column: not Writers’ (paused, not ended), not the free column left of Writers (R-D)',
        slotOf(bl, 2031, 'custom2') === 2 && !same(bl, 2031, 'custom2', 'custom1') && !same(bl, 2031, 'custom2', 'writersRoom'), J(out.slots['2031']));
      C('R7c', 'Writers’ own hiatus band keeps its column', (function () { var b = blockOf(bl, 2031); return b.rows.some(function (r) { return r.cells.some(function (c) { return c.what === 'writersRoom' && c.band && c.own === 1; }); }); })(), J(widthsOf(bl, 2031, 'writersRoom').slice(12, 18)));
      C('R7d', 'Production goes left (S1 Post’s column), Post follows Production, Localization follows Post: one column (rules 3, 2, 7)',
        same(bl, 2031, 'production', 'custom1') && same(bl, 2031, 'post', 'production') && same(bl, 2031, 'localization', 'post'), J(out.slots['2031']));
      C('R7e', '2031 is three columns', slotsIn(bl, 2031) === 3, slotsIn(bl, 2031));
    }
    if (FX === 'layout-r17') {
      C('R17a', 'Single Column: Writers, then Hard Prep + Production, then the lane with Post and Localization (rules 2, 6, 7, 8)',
        slotOf(bl, 2031, 'writersRoom') === 0 && same(bl, 2031, 'prodPrep', 'production') && slotOf(bl, 2031, 'production') === 1 && slotOf(bl, 2031, 'post') === 2 && same(bl, 2031, 'localization', 'post') && laneIn(bl, 2031) === 2,
        J({ slots: out.slots, lane: out.lanes }));
      C('R17b', 'one block, three columns', bl.length === 1 && slotsIn(bl, 2031) === 3, J(out.blockWidths));
      // Rule 17: every cell one column wide at its own slot -- Writers alone before its first band included, and
      // Post and Localization in the lane with two empty columns beside them.
      var narrow = true, wide = [];
      bl[0].rows.forEach(function (r) { r.cells.forEach(function (c) { if (c.what !== 'simpost' && (c.width !== 1 || c.pos !== c.own)) { narrow = false; wide.push(r.iso + ':' + c.what + ':' + c.pos + '+' + c.width); } }); });
      C('R17c', 'Single Column: nothing widens -- every phase cell is one column wide at its own slot (rule 17)', narrow, J(wide.slice(0, 8)));
      C('R17d', 'Writers is one wide in the weeks before its first band (rule 17; today it fills the width)', J(shape(bl, 2031, 'writersRoom')) === J(['2031-11-10:0+1']), J(shape(bl, 2031, 'writersRoom')));
    }
    if (FX === 'layout-r13') {
      C('R13a', 'columns: Writers | Pilot Cut, Bible, Production left with the lane in Pilot Cut’s column, Reshoots under Production, Post in the lane; 2032 Delivery under Post, Marketing right',
        slotOf(bl, 2031, 'writersRoom') === 0 && slotOf(bl, 2031, 'custom1') === 1 && slotOf(bl, 2031, 'custom2') === 2 && same(bl, 2031, 'production', 'writersRoom')
          && laneIn(bl, 2031) === 1 && same(bl, 2031, 'custom3', 'production') && slotOf(bl, 2031, 'post') === 1
          && slotOf(bl, 2032, 'custom4') === 0 && slotOf(bl, 2032, 'custom5') === 1 && slotsIn(bl, 2032) === 2,
        J({ slots: out.slots, lane: out.lanes }));
      // The widths, week by week (rules 11-16, 18): each phase's shape is the rows where its [pos+width] changes.
      var W = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      W('R13b', 'Writers: one wide beside Pilot Cut and Bible, then TWO wide the week Pilot Cut ends -- the spare column between it and Bible goes to the left phase (rule 12, R-E)',
        'writersRoom', 2031, ['2031-01-06:0+1', '2031-04-07:0+2']);
      W('R13c', 'Pilot Cut: one wide for its whole run', 'custom1', 2031, ['2031-02-03:1+1']);
      W('R13d', 'Bible: one wide in its own column, then fills the width (three wide from the left) the week Writers ends (rules 13, 14)',
        'custom2', 2031, ['2031-03-03:2+1', '2031-05-26:0+3']);
      W('R13e', 'Production: one wide beside the active Sim Post lane for the whole shoot (rule 15)', 'production', 2031, ['2031-06-23:0+1']);
      W('R13f', 'Reshoots: one wide under Production beside Post', 'custom3', 2031, ['2031-09-15:0+1']);
      W('R13g', 'Post: in the lane beside Reshoots it takes the empty column to its right at once (rule 13 uncapped, 6 Nov 2026; until then the even share held it to one), then fills the width the week Reshoots ends',
        'post', 2031, ['2031-09-15:1+2', '2031-10-06:0+3']);
      W('R13h', '2032: Post alone fills the two columns', 'post', 2032, ['2032-01-05:0+2']);
      W('R13i', 'Delivery: follows Post, so it carries Post\u2019s two-wide cell across the mid-year hiatus while the second column is empty (rule 22), one wide once Marketing takes it, and stays one wide after Marketing ends (rule 22\u2019s hold; until 6 Nov 2026 one wide, then two)',
        'custom4', 2032, ['2032-02-16:0+2', '2032-08-02:0+1']);
      W('R13j', 'Marketing: one wide beside Delivery', 'custom5', 2032, ['2032-08-02:1+1']);
      C('R13k', 'block widths: 2031 three columns, 2032 two', out.blockWidths['2031'] === 3 && out.blockWidths['2032'] === 2, J(out.blockWidths));
    }
    if (FX === 'layout-r20') {
      var W20 = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R20a', '2031 is THREE columns: Post, starting in Production’s last week, needs one beside the lane (the marker never steps aside; owner, 6 Nov 2026)', slotsIn(bl, 2031) === 3 && blockOf(bl, 2031).width === 3, J(out.blockWidths));
      C('R20b', 'Sim Post stays on every shoot week, Production’s last included: that row reads Production | Simultaneous Post | Post',
        J(cellAt(bl, '2031-11-24', 'production')) === '[0,1]' && J(cellAt(bl, '2031-11-24', 'simpost')) === '[1,1]' && J(cellAt(bl, '2031-11-24', 'post')) === '[2,1]' && laneIn(bl, 2031) === 1,
        J({ nov24: [cellAt(bl, '2031-11-24', 'production'), cellAt(bl, '2031-11-24', 'simpost'), cellAt(bl, '2031-11-24', 'post')], lane: out.lanes['2031'] }));
      W20('R20c', 'Post: one wide in the third column that week, then fills the three (rule 14)', 'post', 2031, ['2031-11-24:2+1', '2031-12-01:0+3']);
      W20('R20d', 'Design: beside Writers it spreads into the third column, free for the rest of its run (rule 13, uncapped), then fills the width when Writers ends',
        'prePrep', 2031, ['2031-05-12:1+2', '2031-05-26:0+3']);
      W20('R20e', 'Production: one wide beside the lane for the whole shoot; the column beside the lane stays empty (the lane never widens, rule 15)', 'production', 2031, ['2031-08-25:0+1']);
      C('R20f', '2032: Post alone, one column', slotsIn(bl, 2032) === 1 && slotOf(bl, 2032, 'post') === 0, J(out.slots['2032']));
    }
    if (FX === 'layout-r13b') {
      var W13b = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R13Ba', 'columns: Writers | Pre-Prep, Prep and the lane | Post (three weeks beside the shoot); three columns',
        slotOf(bl, 2031, 'writersRoom') === 0 && slotOf(bl, 2031, 'prePrep') === 1 && same(bl, 2031, 'prePrep', 'prodPrep') && slotOf(bl, 2031, 'production') === 0 && laneIn(bl, 2031) === 1 && slotOf(bl, 2031, 'post') === 2 && slotsIn(bl, 2031) === 3,
        J({ slots: out.slots['2031'], lane: out.lanes['2031'] }));
      W13b('R13Bb', 'Pre-Prep: TWO wide beside Writers from its first week -- the column to its right is free for the rest of its run, and the even share no longer caps a spread to the right (owner, 6 Nov 2026) -- then fills the width when Writers ends',
        'prePrep', 2031, ['2031-03-17:1+2', '2031-04-14:0+3']);
      W13b('R13Bc', 'Writers: one wide throughout (Pre-Prep takes the next column before Writers’ run ends, rule 13)', 'writersRoom', 2031, ['2031-01-06:0+1']);
      W13b('R13Bd', 'Production: one wide beside the lane for the whole shoot', 'production', 2031, ['2031-08-04:0+1']);
      C('R13Be', 'Sim Post on every shoot week, the three Post overlaps included', (function () { var b = blockOf(bl, 2031); var rows = b.rows.filter(function (r) { return r.cells.some(function (c) { return c.what === 'production' && !c.band; }); }); return rows.length === 19 && rows.every(function (r) { return r.cells.some(function (c) { return c.what === 'simpost'; }); }); })(), J((function () { var b = blockOf(bl, 2031); return b.rows.filter(function (r) { return r.cells.some(function (c) { return c.what === 'production'; }) && !r.cells.some(function (c) { return c.what === 'simpost'; }); }).map(function (r) { return r.iso; }); })()));
      W13b('R13Bf', 'Post: one wide in the third column for the three overlap weeks, then fills the three', 'post', 2031, ['2031-11-24:2+1', '2031-12-15:0+3']);
    }
    if (FX === 'layout-r21') {
      var W21 = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R21a', 'columns: Writers then Production left with the lane beside them, Post in the lane, Localization right of the running Post (rules 2, 6, 8, 4); three columns',
        same(bl, 2031, 'production', 'writersRoom') && slotOf(bl, 2031, 'production') === 0 && laneIn(bl, 2031) === 1 && slotOf(bl, 2031, 'post') === 1 && slotOf(bl, 2031, 'localization') === 2 && slotsIn(bl, 2031) === 3,
        J({ slots: out.slots['2031'], lane: out.lanes['2031'] }));
      W21('R21b', 'Post: two wide from its first week (alone; the third column is Localization’s before Post ends) and STILL two wide for its last two weeks beside Localization (rule 21; today it narrows to one)',
        'post', 2031, ['2031-05-12:0+2']);
      W21('R21c', 'Localization: one wide beside Post for two weeks, then fills the width', 'localization', 2031, ['2031-10-13:2+1', '2031-10-27:0+3']);
      W21('R21d', 'Production: one wide beside the lane', 'production', 2031, ['2031-02-03:0+1']);
      C('R21e', 'no empty column beside Post in its last two weeks', (function () { var a = cellAt(bl, '2031-10-13', 'post'), b = cellAt(bl, '2031-10-20', 'post'); return J(a) === '[0,2]' && J(b) === '[0,2]'; })(), J([cellAt(bl, '2031-10-13', 'post'), cellAt(bl, '2031-10-20', 'post')]));
    }
    if (FX === 'layout-r3b') {
      var W3b = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R3Ba', 'Production takes the leftmost FREE column, Writers’, though Prod Prep’s was handed off and Post runs to the right (rule 3, 6 Nov 2026); Post in the third column',
        same(bl, 2031, 'production', 'writersRoom') && slotOf(bl, 2031, 'production') === 0 && same(bl, 2031, 'prePrep', 'prodPrep') && slotOf(bl, 2031, 'prodPrep') === 1 && slotOf(bl, 2031, 'post') === 2 && slotsIn(bl, 2031) === 3,
        J(out.slots['2031']));
      W3b('R3Bb', 'Production: two wide beside Post for the whole shoot -- the spare middle column goes to it (rule 12); no empty column', 'production', 2031, ['2031-08-04:0+2']);
      W3b('R3Bc', 'Post: one wide in the third column beside Prod Prep and then the shoot, then fills the three', 'post', 2031, ['2031-07-07:2+1', '2031-12-01:0+3']);
      W3b('R3Bd', 'Prod Prep: follows Pre-Prep, so it carries Pre-Prep\u2019s three-wide cell until Post takes the third column, then two wide (rule 22; until 6 Nov 2026 two wide throughout, rule 13)', 'prodPrep', 2031, ['2031-04-28:0+3', '2031-07-07:0+2']);
      W3b('R3Be', 'Pre-Prep: two wide beside Writers (rule 13 uncapped), then fills the width', 'prePrep', 2031, ['2031-03-17:1+2', '2031-04-14:0+3']);
    }
    if (FX === 'layout-r2g') {
      // Rule 2's short gap (LAYOUT_FOLLOW_GAP_WEEKS = 4). Test is moved by typing its start, then the grid re-read.
      var r2g = function () { var b2 = read(); return { same: same(b2, 2031, 'custom1', 'writersRoom'), test: slotOf(b2, 2031, 'custom1'), cols: slotsIn(b2, 2031) }; };
      var g1 = r2g();
      C('R2Ga', 'Test, one working week after Writers’ column emptied, follows Writers into it: two columns, not a third right of Pre-Prep (rule 2, short gap)',
        g1.same && g1.test === 0 && g1.cols === 2, J(g1));
      T.set('start-custom1', '2031-05-12'); await settle('Test at 5/12');
      var g4 = r2g();
      C('R2Gb', 'moved to 5/12, four working weeks after: still Writers’ column, two columns', g4.same && g4.test === 0 && g4.cols === 2, J(g4));
      T.set('start-custom1', '2031-05-19'); await settle('Test at 5/19');
      var g5 = r2g();
      C('R2Gc', 'moved to 5/19, five working weeks after: Test was MOVED, so it keeps Writers\u2019 column (sticky columns, ruling K3: kept beats rule 2\u2019s gap and R-D)',
        g5.same && g5.test === 0 && g5.cols === 2, J(g5));
      var rb = document.getElementById('tb-cols-reset-btn'); if (rb) rb.click();
      await settle('Test at 5/19, reset');
      var g6 = r2g();
      C('R2Gd', 'Reset Columns: placed by the rules, five working weeks is not following on, so right of everything running -- a third column (R-D, as layout-r7)',
        !!rb && !g6.same && g6.test === 2 && g6.cols === 3, J(g6));
    }
    if (FX === 'layout-r2h') {
      // The owner's sweep: Prod Prep slid a week at a time; which side of Production it sits on, each week.
      var sideOf = function () { var b2 = read(); var a1 = slotOf(b2, 2031, 'prodPrep'), p1 = slotOf(b2, 2031, 'production'); return (a1 === null || p1 === null) ? '?' : (a1 < p1 ? 'L' : 'R'); };
      var sweep = [];
      var days = ['2031-01-27', '2031-02-03', '2031-02-10', '2031-02-17', '2031-02-24', '2031-03-03'];
      for (var d = 0; d < days.length; d++) { T.set('start-prodPrep', days[d]); await settle('Prod Prep at ' + days[d]); sweep.push(days[d].slice(5) + ' ' + sideOf()); }
      C('R2Ha', 'Prod Prep slid by the user 1/27 -> 3/3 a week at a time: right of Production EVERY week -- it keeps Pre-Prep\u2019s column, the one it was in (sticky columns, ruling K3; until then it went left at 3/3, R-D)',
        J(sweep) === J(['01-27 R', '02-03 R', '02-10 R', '02-17 R', '02-24 R', '03-03 R']), J(sweep));
      // The rules alone, as they place a phase nobody moved: Reset Columns after each step forgets the move.
      var rsweep = [], rbtn = document.getElementById('tb-cols-reset-btn');
      for (var e = 0; e < days.length && rbtn; e++) {
        T.set('start-prodPrep', days[e]); await settle('Prod Prep at ' + days[e]);
        rbtn.click(); await settle('Prod Prep at ' + days[e] + ', reset');
        rsweep.push(days[e].slice(5) + ' ' + sideOf());
      }
      C('R2Hb', 'the rules alone (Reset Columns after each step): right of Production through four weeks\u2019 gap (the latest-freed column) and left from 3/3, five weeks after (R-D) -- ONE change, not three',
        J(rsweep) === J(['01-27 R', '02-03 R', '02-10 R', '02-17 R', '02-24 R', '03-03 L']), J(rsweep));
    }
    if (FX === 'layout-r22') {
      var W22 = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R22a', 'columns: Writers then Production left; Pre-Prep, Prod Prep and the lane in the middle; Casting right; three columns',
        same(bl, 2031, 'production', 'writersRoom') && slotOf(bl, 2031, 'writersRoom') === 0 && same(bl, 2031, 'prePrep', 'prodPrep') && slotOf(bl, 2031, 'prodPrep') === 1 && laneIn(bl, 2031) === 1 && slotOf(bl, 2031, 'custom1') === 2 && slotsIn(bl, 2031) === 3,
        J({ slots: out.slots['2031'], lane: out.lanes['2031'] }));
      W22('R22b', 'Pre-Prep: two wide beside Writers (rule 13, the third column free for its whole run)', 'prePrep', 2031, ['2031-07-07:1+2']);
      W22('R22c', 'Prod Prep: carries Pre-Prep\u2019s two-wide cell until Casting takes the third column, then one wide to the end -- not three wide alone for its last three weeks (rule 22; today one wide, then three)',
        'prodPrep', 2031, ['2031-08-18:1+2', '2031-09-08:1+1']);
      C('R22d', 'its last three weeks, alone: one wide in its own column, both others empty',
        J(cellAt(bl, '2031-10-06', 'prodPrep')) === '[1,1]' && J(cellAt(bl, '2031-10-20', 'prodPrep')) === '[1,1]', J([cellAt(bl, '2031-10-06', 'prodPrep'), cellAt(bl, '2031-10-20', 'prodPrep')]));
      W22('R22e', 'Writers one wide throughout; Casting one wide; Production one wide beside the lane', 'writersRoom', 2031, ['2031-04-28:0+1']);
      C('R22f', 'Casting and Production one wide', J(shape(bl, 2031, 'custom1')) === J(['2031-09-08:2+1']) && J(shape(bl, 2031, 'production')) === J(['2031-10-27:0+1']),
        J({ casting: shape(bl, 2031, 'custom1'), production: shape(bl, 2031, 'production') }));
    }
    if (FX === 'layout-r22b') {
      var W22b = function (id, title, key, year, want, b2) { var got = shape(b2 || bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R22Ba', 'Casting remembers a column of its own (it had been moved): three columns, Casting right', slotOf(bl, 2031, 'custom1') === 2 && slotsIn(bl, 2031) === 3, J(out.slots['2031']));
      W22b('R22Bb', 'Pre-Prep: one wide beside Writers, then two wide alone, and kept two wide beside Casting (rule 21)', 'prePrep', 2031, ['2031-07-07:1+1', '2031-08-04:0+2']);
      W22b('R22Bc', 'Prod Prep: carries that two-wide cell beside Casting -- no empty column on its left, no upside-down T -- and fills the width once Casting ends (rule 22 measured as rule 21 measures; alone it still fills)',
        'prodPrep', 2031, ['2031-08-18:0+2', '2031-09-08:0+3']);
      var rb = document.getElementById('tb-cols-reset-btn'); if (rb) rb.click();
      await settle('reset');
      var b3 = read();
      C('R22Bd', 'Reset Columns: Casting, remembering nothing, follows Writers into its freed column -- two columns -- and Prod Prep follows Pre-Prep one wide, then fills alone',
        !!rb && same(b3, 2031, 'custom1', 'writersRoom') && slotsIn(b3, 2031) === 2 && J(shape(b3, 2031, 'prodPrep')) === J(['2031-08-18:1+1', '2031-09-08:0+2']),
        J({ slots: slotsIn(b3, 2031), casting: slotOf(b3, 2031, 'custom1'), prodPrep: shape(b3, 2031, 'prodPrep') }));
    }
    if (FX === 'layout-r22c') {
      var W22c = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      W22c('R22Ca', 'Prod Prep: carries Pre-Prep\u2019s two-wide cell, spreads into Writers\u2019 column when Writers ends, and when Post takes the third column it KEEPS the other two (rule 22\u2019s hold keeps what it had; the first build gave Writers\u2019 column back)',
        'prodPrep', 2031, ['2031-04-28:1+2', '2031-05-26:0+3', '2031-07-07:0+2']);
    }
    if (FX === 'layout-r20b') {
      var W20b = function (id, title, key, year, want) { var got = shape(bl, year, key); C(id, title, J(got) === J(want), J(got), J(want)); };
      C('R20Ba', 'columns: Writers | Prep | Table Read (one week, a phantom), Production and Post left; three columns',
        slotOf(bl, 2031, 'writersRoom') === 0 && slotOf(bl, 2031, 'prodPrep') === 1 && slotOf(bl, 2031, 'custom1') === 2 && slotOf(bl, 2031, 'production') === 0 && slotOf(bl, 2031, 'post') === 0 && slotsIn(bl, 2031) === 3,
        J(out.slots['2031']));
      W20b('R20Bb', 'Prep: one wide until Table Read’s week, TWO wide from the week after (the phantom column does not count toward the share; rule 13’s rest of the run), then fills the width when Writers ends',
        'prodPrep', 2031, ['2031-04-07:1+1', '2031-04-28:1+2', '2031-05-26:0+3']);
      W20b('R20Bc', 'Writers: one wide throughout -- Prep takes the next column before Writers’ run ends (rule 13), and Writers is not beside the phantom', 'writersRoom', 2031, ['2031-01-06:0+1']);
      W20b('R20Bd', 'Table Read: its one cell, one wide', 'custom1', 2031, ['2031-04-21:2+1']);
    }
    C('S0', 'a stamped fixture raises no "Update layout" strip', !out.strip, out.strip);
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
