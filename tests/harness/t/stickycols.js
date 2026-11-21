// stickycols -- a phase you move keeps its column (owner, 6 Nov 2026: "its not just about production i dont like how it
// does this for any phase"; STICKY-COLUMNS-PLAN.md, rulings K1-K4 by picker).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=sticky-cols ./run.sh stickycols 400
//
// sticky-cols.sptcal (tools/layout-study/fixtures.mjs): Writers then Prod Prep in the left column, Prod Prep's last week
// 7/28/31; Production 8/4 (20 weeks); a 10-week custom "Test" starting 7/28, right of Production. By the rules alone the
// week both start with Prod Prep's column just freed is rule 6's tie, and the shorter one takes that column: Test
// nudged to 8/4 jumps LEFT and back right at 8/11, and Production nudged into Test's start week jumps RIGHT.
//   K0  as loaded: Test right of Production; a calendar nobody moved a phase on saves no colKeep
//   K1  Test's ▼ once, into the tie week (8/4): Test stays right (the rules alone put it left)
//   K2  undo: back at 7/28, no key; redo: 8/4 and still right (the undo step carries the memory)
//   K3  Test ▼▼ then ▲▲▲ (8/11, 8/18, 8/11, 8/4, 7/28): right at every step
//   K4  the file: colKeep is exactly {custom1: ''} -- Test had a column of its own; Production, never moved, has none
//   K5  Reset Columns: the key is gone, the button greys, Test (typed to 8/11 first) is placed by the rules: right
//   K6  Production ▼ into the tie (8/11), ▼ 8/18, ▲ 8/11, ▲ 8/4, ▲ 7/28 (into Prod Prep's last week: it can't fit, so
//       the rules place it, K2), ▼ 8/4 (home again), ▼ 8/11: left every step but the overlap. At 8/18 only the
//       RESERVATION keeps it: Test, unmoved and starting first, is not offered the column Production remembers
//   K7  the file: colKeep is exactly {production: 'prodPrep'}
//   K8  New clears it; Load of K7's file puts Production back left at 8/11 and remembers nothing new on the way in
//   K9  Load of K0's file (no key) remembers nothing from the calendar before it
//   K10 Test's year TYPED into its date box, as Chrome delivers it (0002, 0020, 0203, then 2031-08-04): the in-between
//       years lay nothing out, and the finished date still reads as a move from 7/28 -- right, and the file says so
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. Red on the build before sticky columns at K1, K3, K6 and K8.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  function $(id) { return document.getElementById(id); }
  var sig = function () { return [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join(''); };
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () { var s = sig(); stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4; }, 'a settled grid', 200, 100);
  }
  // The slot (data-own) a phase holds in the 2031 block, or null.
  function slotOf(key) {
    var td = [].filter.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]'), function (t) { return /^2031-/.test(t.dataset.week || '') && t.dataset.own !== undefined; })[0];
    return td ? +td.dataset.own : null;
  }
  // Which side of the other one a phase sits: 'L' or 'R' ('?' when either has no cell).
  function side(key, other) { var a = slotOf(key), b = slotOf(other); return (a === null || b === null) ? '?' : (a < b ? 'L' : a > b ? 'R' : '='); }
  function arrow(key, dir) {
    var n = $('start-' + key);
    for (var i = 0; i < 10 && n; i++) {
      n = n.parentElement; if (!n) break;
      var b = n.querySelectorAll('.ph-nudge-btn[data-nudge="' + dir + '"]');
      if (b.length === 1) return b[0]; if (b.length > 1) return null;
    }
    return null;
  }
  // One arrow click, settled; returns "mm-dd <side of key against other>".
  async function nudge(key, dir, other) {
    var b = arrow(key, dir); if (!b) throw new Error('no ' + (dir < 0 ? '▲' : '▼') + ' on ' + key);
    b.click(); await T.sleep(250); await settle();
    return $('start-' + key).value.slice(5) + ' ' + side(key, other);
  }
  async function burstEnd() { await T.sleep(1900); }   // NUDGE_BURST_MS (1600) after the last click banks the burst
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  var written = [];
  var saveHandle = { name: 'stickycols.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'stickycols.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  var loads = 0;
  async function load(text) {
    var stem = 'stickycols-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.sleep(400);
    if (!document.querySelector('#table-wrap table.sheet-table')) { $('view-sheet-btn').click(); await T.sleep(400); }
    await settle();
  }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    var s0 = await save();
    C('K0', 'as loaded: Test right of Production, Production in the left column; no colKeep in the file',
      side('custom1', 'production') === 'R' && slotOf('production') === 0 && !('colKeep' in s0),
      J({ test: slotOf('custom1'), production: slotOf('production'), colKeep: s0.colKeep }));

    var k1 = await nudge('custom1', 1, 'production');
    C('K1', 'Test ▼ into the week both start (8/4): it stays right (the rules alone put it left there, rule 6’s tie)', k1 === '08-04 R', k1, '08-04 R');
    await burstEnd();
    $('undo-btn').click(); await settle();
    var s2 = await save();
    var u = $('start-custom1').value.slice(5) + ' ' + side('custom1', 'production');
    $('redo-btn').click(); await settle();
    var r = $('start-custom1').value.slice(5) + ' ' + side('custom1', 'production');
    C('K2', 'undo: Test back at 7/28 with nothing remembered; redo: 8/4 and still right (the memory is in the undo step)',
      u === '07-28 R' && !('colKeep' in s2) && r === '08-04 R', J({ undo: u, undoKey: s2.colKeep, redo: r }));

    var steps = [];
    steps.push(await nudge('custom1', 1, 'production'));
    steps.push(await nudge('custom1', 1, 'production'));
    steps.push(await nudge('custom1', -1, 'production'));
    steps.push(await nudge('custom1', -1, 'production'));
    steps.push(await nudge('custom1', -1, 'production'));
    await burstEnd();
    C('K3', 'Test ▼▼ then ▲▲▲: right of Production at every step', J(steps) === J(['08-11 R', '08-18 R', '08-11 R', '08-04 R', '07-28 R']), J(steps));
    var s4 = await save();
    C('K4', 'the file: colKeep is exactly {custom1: ""} (a column of its own); Production, never moved, remembers nothing', J(s4.colKeep) === J({ custom1: '' }), J(s4.colKeep));

    T.set('start-custom1', '2031-08-11'); await settle();
    var rb = $('tb-cols-reset-btn');
    var was = rb && rb.getAttribute('data-disabled');
    if (rb) rb.click();
    await settle(); await T.sleep(300);
    var s5 = await save();
    C('K5', 'Reset Columns: colKeep gone, the button greys, Test at 8/11 placed by the rules (right)',
      !!rb && !was && !('colKeep' in s5) && !!rb.getAttribute('data-disabled') && side('custom1', 'production') === 'R',
      J({ button: !!rb, wasDisabled: was, colKeep: s5.colKeep, nowDisabled: rb && rb.getAttribute('data-disabled'), side: side('custom1', 'production') }));

    var p = [];
    p.push(await nudge('production', 1, 'custom1'));
    p.push(await nudge('production', 1, 'custom1'));
    p.push(await nudge('production', -1, 'custom1'));
    p.push(await nudge('production', -1, 'custom1'));
    p.push(await nudge('production', -1, 'custom1'));
    p.push(await nudge('production', 1, 'custom1'));
    p.push(await nudge('production', 1, 'custom1'));
    await burstEnd();
    C('K6', 'Production ▼ into Test’s week (8/11), ▼ 8/18, ▲ back to 8/4: left every step; ▲ to 7/28 overlaps Prod Prep, so the rules place it (right); ▼ 8/4: home again; ▼ 8/11: left',
      J(p) === J(['08-11 L', '08-18 L', '08-11 L', '08-04 L', '07-28 R', '08-04 L', '08-11 L']), J(p));
    var s7 = await save();
    C('K7', 'the file: colKeep is exactly {production: "prodPrep"} (Test, unmoved since Reset Columns, has none)', J(s7.colKeep) === J({ production: 'prodPrep' }), J(s7.colKeep));

    $('new-file-btn').click();
    for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Start new')) break; }
    await T.sleep(900);
    var s8a = await save();
    await load(JSON.stringify(s7));
    var after = side('production', 'custom1') + ' ' + $('start-production').value.slice(5);
    var s8 = await save();
    C('K8', 'New clears the key; Load of K7’s file: Production left at 8/11 again (the rules alone put it right), and the load remembers nothing new',
      !('colKeep' in s8a) && after === 'L 08-11' && J(s8.colKeep) === J({ production: 'prodPrep' }),
      J({ afterNew: s8a.colKeep, production: after, colKeep: s8.colKeep }));

    await load(JSON.stringify(s0));
    var s9 = await save();
    C('K9', 'Load of a file with no key, over a calendar that had one: nothing remembered; Test right as loaded',
      !('colKeep' in s9) && side('custom1', 'production') === 'R', J({ colKeep: s9.colKeep, side: side('custom1', 'production') }));

    // K10: a date box delivers a typed year digit by digit, each one an `input` with a whole (mostly invalid) date.
    var el = $('start-custom1'), native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    var typed = ['0002-08-04', '0020-08-04', '0203-08-04', '2031-08-04'];
    for (var t = 0; t < typed.length; t++) { native.call(el, typed[t]); el.dispatchEvent(new Event('input', { bubbles: true })); await T.sleep(120); }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    var s10 = await save();
    C('K10', 'Test\u2019s start typed through invalid years to 8/4/31: still right of Production (the rules alone put it left), colKeep {custom1: ""}',
      side('custom1', 'production') === 'R' && J(s10.colKeep) === J({ custom1: '' }),
      J({ side: side('custom1', 'production'), start: el.value, colKeep: s10.colKeep }));

    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
