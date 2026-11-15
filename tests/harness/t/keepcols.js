// keepcols -- a calendar adjusted in the app does not grow wider than the same dates laid out fresh (audit AUD2-057,
// FIX-PLAN batch 3 item 3.8, 14 Nov 2026; STICKY-COLUMNS-PLAN.md rulings K1 and K5, LAYOUT-RULES.md rule 23).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=keepcols-heavy ./run.sh keepcols 600
//
// keepcols-heavy.sptcal is the audit's ten-phase calendar (audit-a6-heavy, title made generic), built by a leg that
// TYPED every field into the app: the old writer remembered a column (colKeep) for eight of its ten phases on the way,
// so the file carries those eight. Two halves, each red on the build before the fix:
//   - THE WRITER (noteMovedPhases): only a deliberate move of ONE phase is remembered -- its start changed, alone. A
//     typed length, a whole-calendar Shift and a calendar typed in from New remember nothing; a phase's ▼ remembers it.
//   - THE PLACEMENT (placeSegmentsByRules): every remembered column, a predecessor's too, gives way when it costs a
//     column, so the eight old memories cannot keep an extra column: after each edit the column list is the one Reset
//     Columns gives for the same dates (the rules alone).
//   KC0  as loaded: the column list equals Reset Columns'; the file's eight memories are untouched by loading
//   KC1  Pre-Prep's length +4 (typed): no new memory; columns = Reset Columns' (old build: 2026 two columns wider)
//   KC2  VFX's length -10 (typed): no new memory; columns = Reset Columns'
//   KC3  Shift 1 wk later (the toolbar arrow, every phase): no new memory (old build: all ten remembered); columns =
//        Reset Columns'
//   KC4  Delivery's ▼ (one phase, deliberately): exactly that phase is added to the memories; columns = Reset Columns'
//   KC5  New, the reference calendar typed in field by field, two lengths re-typed: nothing remembered
//   KC6  then Post's start re-typed a week later: exactly {post} remembered
//   KC7  Ripple Hiatus on (the users' default, on for this whole leg): a new break after every start but Localization's
//        pushes Localization alone, which by dates alone reads as one phase moved: still exactly {post}
//   E0   no engine errors
//
// Red on the build before the fix at every KC case: KC0 (2026 five columns against four), KC1-KC4 (six against four;
// the Shift remembered Delivery and S4 Writers Rm too), KC5-KC7 (Pre-Prep and Post remembered from typed lengths). KC7
// alone is red on the fix without its ripple guard (colKeepQuiet): Localization remembered.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. No dollar sign in this file (srv.js splices legs in with
// String.replace).
// ⭐ RIPPLE HIATUS ON, the users' default (lib.js switches it off for every leg; this runs after lib.js and before the
// app reads its preferences, as phasearrowsripple does): KC7 needs it, and every other case holds with it on.
try {
  var prefs0 = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
  delete prefs0.hiatusRipple;
  localStorage.setItem('sptcal.prefs', JSON.stringify(prefs0));
} catch (e) {}
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  function byId(id) { return document.getElementById(id); }
  var sig = function () { return [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join(''); };
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () { var s = sig(); stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4; }, 'a settled grid', 200, 100);
  }
  // The phase columns, per year, as the width model keys them (y2026:s0 ...).
  function cols() { return T.colList().filter(function (c) { return /:s\d+/.test(c.k || ''); }).map(function (c) { return c.k; }).join(' '); }
  function perYear(c) { var o = {}; c.split(' ').forEach(function (k) { var y = k.slice(1, 5); o[y] = (o[y] || 0) + 1; }); return o; }
  // The current calendar as a file, through Save As into a fake picker (lib.js reloadWith's first half).
  async function snap() {
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      await T.until(function () { var b = byId('save-as-btn'); return !!b && !b.disabled; }, 'Save As', 60, 100);
      byId('save-as-btn').click();
      await T.until(function () { return rec.files.length > 0; }, 'the Save As write', 100, 100);
    } finally { rec.restore(); }
    return JSON.parse(new TextDecoder().decode(rec.files[rec.files.length - 1].bytes));
  }
  function keepOf(s) { return s.colKeep || {}; }
  function added(a, b) { return Object.keys(b).filter(function (k) { return !(k in a); }).sort(); }
  // What Reset Columns lays out for the dates on screen now, then one Undo back to the calendar as it was.
  async function rulesCols() {
    var rb = byId('tb-cols-reset-btn');
    if (!rb || rb.getAttribute('data-disabled')) return { cols: cols(), reset: false };
    await T.sleep(700);
    rb.click(); await T.sleep(300); await settle();
    var c = cols();
    byId('undo-btn').click(); await T.sleep(500); await settle();
    return { cols: c, reset: true };
  }
  async function typed(id, delta) {
    T.set(id, String(+byId(id).value + delta));
    await T.sleep(400); await settle();
  }
  function arrow(key, dir) {
    var n = byId('start-' + key);
    for (var i = 0; i < 10 && n; i++) {
      n = n.parentElement; if (!n) break;
      var b = n.querySelectorAll('.ph-nudge-btn[data-nudge="' + dir + '"]');
      if (b.length === 1) return b[0]; if (b.length > 1) return null;
    }
    return null;
  }
  try {
    await T.appReady(); await settle();
    var s0 = await snap(), k0 = keepOf(s0), c0 = cols(), r0 = await rulesCols();
    C('KC0', 'as loaded: the phase columns are the ones Reset Columns gives for the same dates; the file’s eight memories are kept',
      r0.reset && c0 === r0.cols && Object.keys(k0).length === 8,
      J({ cols: perYear(c0), rules: perYear(r0.cols), memories: Object.keys(k0).length }));

    await typed('weeks-prePrep', 4);
    var s1 = await snap(), c1 = cols(), r1 = await rulesCols();
    C('KC1', 'Pre-Prep’s length typed +4: nothing new remembered, and no column more than Reset Columns gives',
      r1.reset && !added(k0, keepOf(s1)).length && c1 === r1.cols,
      J({ kept: Object.keys(keepOf(s1)).length, added: added(k0, keepOf(s1)), cols: perYear(c1), rules: perYear(r1.cols) }));

    await typed('weeks-custom1', -10);
    var s2 = await snap(), c2 = cols(), r2 = await rulesCols();
    C('KC2', 'VFX’s length typed -10: nothing new remembered, and no column more than Reset Columns gives',
      r2.reset && !added(k0, keepOf(s2)).length && c2 === r2.cols,
      J({ kept: Object.keys(keepOf(s2)).length, added: added(k0, keepOf(s2)), cols: perYear(c2), rules: perYear(r2.cols) }));

    byId('shift-fwd-btn').click();
    await T.sleep(600); await settle();
    var s3 = await snap(), c3 = cols(), r3 = await rulesCols();
    C('KC3', 'Shift 1 wk later (every phase moves): nothing new remembered, and no column more than Reset Columns gives',
      r3.reset && !added(k0, keepOf(s3)).length && c3 === r3.cols,
      J({ kept: Object.keys(keepOf(s3)).length, added: added(k0, keepOf(s3)), cols: perYear(c3), rules: perYear(r3.cols) }));

    var b = arrow('custom3', 1);
    if (!b) throw new Error('no ▼ on Delivery');
    var start3 = byId('start-custom3').value;
    b.click(); await T.sleep(250); await settle();
    await T.sleep(1900);   // NUDGE_BURST_MS (1600) after the click banks the burst
    var s4 = await snap(), c4 = cols(), r4 = await rulesCols();
    C('KC4', 'Delivery’s ▼ (one phase, moved on purpose): exactly Delivery is added to the memories; no column more than Reset Columns gives',
      r4.reset && J(added(k0, keepOf(s4))) === J(['custom3']) && byId('start-custom3').value !== start3 && c4 === r4.cols,
      J({ kept: Object.keys(keepOf(s4)).length, added: added(k0, keepOf(s4)), start: [start3, byId('start-custom3').value], cols: perYear(c4), rules: perYear(r4.cols) }));

    byId('new-file-btn').click();
    for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Start new') || T.clickModalButton('Discard')) break; }
    await T.sleep(900);
    T.buildFixture();
    await T.sleep(400); await settle();
    await typed('weeks-post', 4);
    await typed('weeks-prePrep', 2);
    var s5 = await snap();
    C('KC5', 'New, the reference calendar typed in field by field, then two lengths re-typed: nothing remembered',
      !('colKeep' in s5) && s5.colReuse === true, J({ colKeep: s5.colKeep, stamped: s5.colReuse }));

    T.set('start-post', '2026-11-09'); await T.sleep(400); await settle();
    var s6 = await snap();
    C('KC6', 'then Post’s start re-typed a week later (one phase moved on purpose): exactly Post is remembered',
      J(Object.keys(keepOf(s6))) === J(['post']), J(s6.colKeep));

    // KC7: a break after every start but Localization's. Ripple Hiatus pushes Localization alone, which by dates alone
    // reads as one phase moved; the user edited a break, so nothing is remembered.
    // The break is added by code (no push: a field written by code was never focused), then its Weeks changed the way a
    // user does, in the focused box: a Weeks change pushes at once (rippleSettle).
    if (byId('sidetab-phases')) { byId('sidetab-phases').click(); await T.sleep(300); }   // a box must be shown to be focused
    T.addHiatus('2027-01-11', 1); await T.sleep(600); await settle();
    var loc0 = byId('start-localization').value;
    var rows = document.querySelectorAll('#hiatus-list .hiatus-entry'), wk = rows[rows.length - 1].querySelector('.hiatus-weeks');
    wk.focus(); await T.sleep(100);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(wk, '2');
    wk.dispatchEvent(new Event('input', { bubbles: true })); wk.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(600); wk.blur(); await settle();
    var loc1 = byId('start-localization').value, s7 = await snap();
    C('KC7', 'Ripple Hiatus on: a new break pushes Localization alone, and nothing new is remembered',
      loc0 && loc1 && loc1 > loc0 && J(Object.keys(keepOf(s7))) === J(['post']), J({ localization: [loc0, loc1], colKeep: s7.colKeep }));

    out.errors = (T.appHealth().errors || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.stack || e.message || String(e));
    C('EX', 'the leg ran to the end', false, String(out.EX).slice(0, 600));
  }
  T.done(out);
})(); });
