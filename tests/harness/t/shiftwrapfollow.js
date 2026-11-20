// shiftwrapfollow -- the phases tied to Production's wrap keep their distance from it when a move changes the shoot's
// length (SHIFT-WRAP-FOLLOW-PLAN.md, owner 20 Nov 2026, rulings R1-R7).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh shiftwrapfollow 400
//
// THE CALENDAR (A): T.buildFixture() (US General) cut to 5 episodes x 8 days = 40 shoot days, Production Mon 7/13/26.
// It wraps Fri 9/4/26; one week later (7/20) the shoot takes Labor Day (Mon 9/7) and wraps Mon 9/14/26, TWO weeks on.
//   Post 9/7 x 16            starts after the wrap: follows (R1)
//   Localization 8/24 x 2    alongside the shoot, ends Fri 9/4, the wrap week: follows (R3)
//   Pre Prep 8/3 x 2         alongside, ends 8/14: stays where the shift puts it (R3)
//   Writer's Rm 8/24 x 4     starts during the shoot, ends 9/18, after the wrap: stays (R7)
// THE CALENDAR (B): the same shoot from Mon 6/29/26 wraps Mon 8/24 (July 3 costs a day); from 7/6 it wraps Fri 8/28, the
// SAME week: the shoot lost a week. Post 8/31, Localization 8/17 x 2 (ends 8/28, the wrap week).
//
//   R0   the ripple preference is the users' default (on), for R1
//   F0   truth guard: calendar A wraps 9/4/26
//   F1   the toolbar's → : Production a week later wraps 9/14; Post and Localization go one more week (9/21, 9/7);
//        Pre Prep, Writer's Rm and Prod Prep move exactly one; the readout names the follow
//   F2   one Undo puts the whole move back
//   F3   Shift form, Post UNticked: Post stays; Localization follows; the line names Labor Day and Localization
//   F4   Shift form, Production unticked: nothing follows (the shoot did not move)
//   F5   Production's own ▼ (R4): one phase, nothing follows
//   F6   calendar B, → : the shoot lost a week, so Post and Localization are PULLED one week (back on 8/31, 8/17)
//   F7   To a date, Production ENDS BY Fri 9/18 (R6): the old delta (+2) wraps Mon 9/21, past the date; the search
//        lands the shoot a week earlier (7/20, wrap 9/14); Post follows the final wrap; the line says why
//   F8   the reference calendar (80 days), → : the wrap moves exactly a week, nothing follows, the readout as before
//   F9   the hiatus ripple (R5): a break before the shoot made a week longer pushes the shoot onto Labor Day; Post and
//        Localization go one more week; the line under the hiatus names Labor Day; one Undo puts it all back
//   E0   no console errors
(function(){
  try {
    var o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
    delete o.hiatusRipple;
    localStorage.setItem('sptcal.prefs', JSON.stringify(o));
  } catch(e){}
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function wrap(){ var m = txt($('meta-production')).match(/→\s*([\d\/]+)\s*$/); return m ? m[1] : null; }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function starts(){ var o = {}; KEYS.forEach(function (k) { o[k] = $('start-' + k).value; }); o.wrap = wrap(); return o; }
  function eq(a, b){ return KEYS.concat(['wrap']).every(function (k) { return b[k] === undefined || a[k] === b[k]; }); }
  function readout(){ return txt(document.querySelector('.shift-group [data-shift-readout], .shift-readout')); }
  function msg(){ return txt(document.querySelector('#pop-shift [data-tools-msg]')); }
  async function settle(){ await T.sleep(1000); }
  async function arrow(){ T.closePops(); await T.sleep(150); $('shift-fwd-btn').click(); await settle(); }
  async function undo(){ $('undo-btn').click(); await settle(); }
  async function openShift(){ T.closePops(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(300); }
  function tick(key, on){ var b = T.shiftRow(key).querySelector('input[type=checkbox]'); if(b.checked !== on){ b.checked = on; b.dispatchEvent(new Event('change', {bubbles: true})); } }
  async function setCal(v){ Object.keys(v).forEach(function (id) { T.set(id, v[id]); }); await settle(); }
  var A = {'num-episodes': '5', 'shoot-days-per-ep': '8',
           'start-writersRoom': '2026-08-24', 'weeks-writersRoom': '4', 'start-prePrep': '2026-08-03', 'weeks-prePrep': '2',
           'start-prodPrep': '2026-05-18', 'weeks-prodPrep': '6', 'start-production': '2026-07-13',
           'start-post': '2026-09-07', 'weeks-post': '16', 'start-localization': '2026-08-24', 'weeks-localization': '2'};
  var B = Object.assign({}, A, {'start-writersRoom': '2026-01-05', 'weeks-writersRoom': '12', 'start-production': '2026-06-29',
           'start-post': '2026-08-31', 'start-localization': '2026-08-17'});
  try {
    var pr = {}; try { pr = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {}; } catch(e){}
    add('R0', 'the hiatus ripple is on (the users\' default)', pr.hiatusRipple === undefined, pr, 'no hiatusRipple key');
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return /shoot days/.test(txt($('meta-production'))); }, 'calendar', 200, 100);
    await T.sleep(1200);

    // ---- F8: the reference calendar, nothing to follow ----
    var r0 = starts(); await arrow(); var r1 = starts(), ro8 = readout();
    add('F8', 'reference calendar, →: the wrap moves exactly a week; Post moves exactly a week; nothing is said about the wrap following',
      r0.post === '2026-11-02' && r1.post === '2026-11-09' && r1.localization === '2027-03-08' && r1.wrap === '10/26/26' && !/pushed|pulled/.test(ro8),
      {before: r0, after: r1, readout: ro8}, 'Post 11/9, Localization 3/8/27, wrap 10/26/26, readout "1 wk later · wrap 10/26/26"');

    // ---- F0 / F1 / F2: calendar A, the arrow ----
    await setCal(A);
    var a0 = starts();
    add('F0', 'calendar A wraps Fri 9/4/26', a0.wrap === '9/4/26' && a0.production === '2026-07-13', a0, 'wrap 9/4/26');
    await arrow();
    var a1 = starts(), ro1 = readout();
    add('F1', '→: the shoot takes Labor Day and wraps 9/14; Post and Localization (tied to the wrap) go one more week; the others move one',
      eq(a1, {production: '2026-07-20', wrap: '9/14/26', post: '2026-09-21', localization: '2026-09-07',
              prePrep: '2026-08-10', writersRoom: '2026-08-31', prodPrep: '2026-05-25'}) && /pushed 1 wk/.test(ro1) && /Post/.test(ro1),
      {after: a1, readout: ro1}, 'Production 7/20, wrap 9/14/26, Post 9/21, Localization 9/7, Pre Prep 8/10, Writer\'s Rm 8/31, Prod Prep 5/25; "Post & 1 more pushed 1 wk"');
    await undo();
    var a2 = starts();
    add('F2', 'one Undo puts the whole move back', eq(a2, a0), a2, a0);

    // ---- F3: Post unticked ----
    await setCal(A);
    await openShift(); T.set('tool-shift-weeks', '1'); tick('post', false); await T.sleep(200);
    $('tool-shift-later').click(); await settle();
    var f3 = starts(), m3 = msg();
    add('F3', 'Shift form, Post unticked: Post stays (the overlap is the user\'s choice); Localization follows; the line names Labor Day and the follow',
      eq(f3, {production: '2026-07-20', wrap: '9/14/26', post: '2026-09-07', localization: '2026-09-07'})
        && /Labor Day falls in the shoot now/.test(m3) && /Localization was also pushed 1 wk to keep its distance from the wrap/.test(m3),
      {after: f3, msg: m3}, 'Post 9/7, Localization 9/7; "...Labor Day falls in the shoot now. Localization was also pushed 1 wk..."');

    // ---- F4: Production unticked ----
    await setCal(A);
    await openShift(); T.set('tool-shift-weeks', '1'); tick('production', false); await T.sleep(200);
    $('tool-shift-later').click(); await settle();
    var f4 = starts(), m4 = msg();
    add('F4', 'Shift form, Production unticked: the shoot stays, so nothing follows; the others move one week',
      eq(f4, {production: '2026-07-13', wrap: '9/4/26', post: '2026-09-14', localization: '2026-08-31'}) && !/distance from the wrap/.test(m4),
      {after: f4, msg: m4}, 'Production 7/13, Post 9/14, Localization 8/31');
    T.closePops(); await T.sleep(150);

    // ---- F5: Production's own ▼ ----
    await setCal(A);
    $('swatch-production').parentElement.querySelector('.ph-nudge-btn[data-nudge="1"]').click(); await T.sleep(2200);
    var f5 = starts();
    add('F5', 'Production\'s ▼ moves only Production (R4): Post and Localization stay',
      eq(f5, {production: '2026-07-20', wrap: '9/14/26', post: '2026-09-07', localization: '2026-08-24'}), f5, 'Production 7/20, Post 9/7, Localization 8/24');

    // ---- F6: calendar B, the shoot loses a week ----
    await setCal(B);
    var b0 = starts(); await arrow(); var b1 = starts(), ro6 = readout();
    add('F6', 'calendar B, →: the shoot drops July 3 and wraps the same week (8/28); Post and Localization are pulled back a week to keep their distance',
      b0.wrap === '8/24/26' && eq(b1, {production: '2026-07-06', wrap: '8/28/26', post: '2026-08-31', localization: '2026-08-17', prePrep: '2026-08-10'})
        && /pulled 1 wk/.test(ro6),
      {before: b0, after: b1, readout: ro6}, 'wrap 8/24 -> 8/28/26, Post 8/31, Localization 8/17, Pre Prep 8/10; "pulled 1 wk"');

    // ---- F7: To a date, Production ends by ----
    await setCal(A);
    await openShift(); document.querySelector('#pop-shift [data-far="date"]').click(); await T.sleep(200);
    T.set('tool-anchor-phase', 'production'); T.set('tool-anchor-edge', 'end'); await T.sleep(150);
    T.set('tool-anchor-date', '2026-09-18'); await T.sleep(300);
    $('tool-anchor-go').click(); await settle();
    var f7 = starts(), m7 = msg();
    add('F7', 'Production ends by Fri 9/18 (R6): it lands on or before the date (wrap 9/14, start 7/20), Post follows the final wrap; the line says why',
      eq(f7, {production: '2026-07-20', wrap: '9/14/26', post: '2026-09-21', localization: '2026-09-07'})
        && /Shifted 1 week later/.test(m7) && /Labor Day falls in the shoot now/.test(m7) && /Production starts 1 wk earlier than the shift alone would put it, so it still ends by your date/.test(m7) && !/Still past your date/.test(m7),
      {after: f7, msg: m7}, 'Production 7/20, wrap 9/14/26, Post 9/21; "Shifted 1 week later" and "...1 wk earlier than the shift alone would put it: Labor Day..."');
    await undo();
    var f7u = starts();
    add('F7u', 'one Undo puts the search and the follow back', eq(f7u, a0), f7u, a0);
    T.closePops(); await T.sleep(150);

    // ---- F9: the hiatus ripple ----
    await setCal(A);
    T.addHiatus('2026-06-01', 1); await settle();
    var h0 = starts();
    var row = document.querySelectorAll('#hiatus-list .hiatus-entry'); row = row[row.length - 1];
    var w = row.querySelector('.hiatus-weeks');
    // Headless Chrome may not move focus: the "before" is taken on focusin (rippleBegin), so it is sent as rippleundo does.
    w.focus(); w.dispatchEvent(new FocusEvent('focusin', {bubbles: true})); await T.sleep(150);
    w.value = '2'; w.dispatchEvent(new Event('input', {bubbles: true}));
    await T.sleep(1500);
    var h1 = starts(), note = txt(row.querySelector('.ripple-note'));
    add('F9', 'the ripple (R5): a break before the shoot made a week longer pushes the shoot onto Labor Day; Post and Localization go one more week; the line names Labor Day',
      h0.production === '2026-07-13' && eq(h1, {production: '2026-07-20', wrap: '9/14/26', post: '2026-09-21', localization: '2026-09-07', prePrep: '2026-08-10'})
        && /Labor Day falls in the shoot now/.test(note),
      {before: h0, after: h1, note: note}, 'Production 7/20, Post 9/21, Localization 9/7; the note names Labor Day');
    w.blur(); await T.sleep(200);
    await undo();
    var h2 = starts();
    // A restore rebuilds the hiatus rows, so the box is read afresh.
    var rows2 = document.querySelectorAll('#hiatus-list .hiatus-entry'), w2 = rows2[rows2.length - 1].querySelector('.hiatus-weeks');
    add('F9u', 'one Undo puts the ripple and the follow back', eq(h2, h0) && w2.value === '1', {after: h2, weeks: w2.value}, h0);

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'shiftwrapfollow', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
