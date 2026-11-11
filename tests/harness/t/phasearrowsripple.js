// phasearrowsripple -- the phase card's ▲ / ▼ STEP OVER an all-phase hiatus while Ripple Hiatus is on (owner,
// 11 Nov 2026: "When ripple hiatus is on if you bump over a hiatus period, it should bump it right to the week
// before/after the hiatus"; nudgePhase's `stepHeld: hiatusRippleOn()` in src/legacy/app.js).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasearrows ./run.sh phasearrowsripple 300
//
// THE CALENDAR: tests/fixtures/phasearrows.sptcal (see t/phasearrows.js): Production 6/29/26 with the LOCKED one-week
// Summer Break on 7/13/26, Post 11/2/26 with its own one-week "Post Pause" on 1/4/27, the locked two-week Christmas
// break on 12/21/26, the UNLOCKED one-week Fall Break on 9/21/26.
//
// ⚠️ lib.js turns the ripple OFF for every leg (HIATUS-RIPPLE-PLAN.md §8). This leg puts the users' default back
// (the key absent = on) at the top of the script, which runs before the build's deferred app module reads prefs.
// t/phasearrows.js is the same arrows with the ripple off: one calendar week a click, into a break if it falls there.
//
//   R0  the ripple preference is the users' default (absent = on)
//   R1  Production ▼ from 6/29: 7/6 ("Pushed 1 wk"), then ▼ again lands 7/20, the week after the Summer Break, with
//       "Pushed 3 wks" (red on the build before: 7/13, inside the break, "Pushed 2 wks")
//   R2  ... ▲ in the same burst: back to 7/6, the week before the break; ▲ again: "Back where it was"
//   R3  ... the Summer Break is where it was, locked, through all of it
//   R4  Post ▼ seven times from 11/2: the seventh takes it from 12/14/26 over the Christmas break to 1/4/27,
//       "Pushed 9 wks"; ▲ once brings it back to 12/14
//   R5  ... the Christmas break never moved
//   R6  an UNLOCKED all-phase hiatus is stepped over too: Prod Prep typed onto 9/14/26, ▼ = 9/28/26 (the Fall Break,
//       9/21, stays)
//   R7  ... ▲ from 9/28 = 9/14
//   U1  undone: every phase start as loaded
//   E0  0 console errors
try {
  var o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
  delete o.hiatusRipple;
  localStorage.setItem('sptcal.prefs', JSON.stringify(o));
} catch (e) {}
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) || {}).value; }
  function row(key){ return $('swatch-' + key).parentElement; }
  function btn(key, dir){ return row(key).querySelector('.ph-nudge-btn[data-nudge="' + dir + '"]'); }
  function chip(key){ return (row(key).querySelector('.ph-nudge-chip') || {}).textContent || ''; }
  async function nudge(key, dir){ btn(key, dir).click(); await T.sleep(200); }
  async function burstEnd(){ await T.sleep(1900); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function starts(){ var s = {}; KEYS.forEach(function (k) { s[k] = val('start-' + k); }); return s; }
  function bands(){
    return Array.prototype.map.call(document.querySelectorAll('#hiatus-list .hiatus-entry'), function (r) {
      return r.querySelector('.hiatus-start').value + ' x' + r.querySelector('.hiatus-weeks').value
        + (r.querySelector('.hiatus-locked') && r.querySelector('.hiatus-locked').checked ? ' locked' : '');
    });
  }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(($('meta-production') || {}).textContent || ''); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    var st0 = starts(), b0 = bands();
    var pref = {};
    try { pref = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {}; } catch (e) {}
    add('R0', 'the ripple preference is the users\' default (absent = on), on the loaded calendar',
      !Object.prototype.hasOwnProperty.call(pref, 'hiatusRipple') && st0.production === '2026-06-29' && st0.post === '2026-11-02'
        && b0.indexOf('2026-07-13 x1 locked') >= 0 && b0.indexOf('2026-12-21 x2 locked') >= 0 && b0.indexOf('2026-09-21 x1') >= 0,
      {pref: pref, starts: st0, bands: b0}, 'no hiatusRipple key; Production 6/29, Post 11/2; the three bands');

    // ---- R1-R3: Production over the locked Summer Break ----
    await nudge('production', 1);
    var r1a = val('start-production'), c1a = chip('production');
    await nudge('production', 1);
    var r1b = val('start-production'), c1b = chip('production');
    add('R1', 'Production ▼ from 6/29: 7/6, then the next ▼ lands 7/20, the week after the Summer Break, "Pushed 3 wks"',
      r1a === '2026-07-06' && /^Pushed 1 wk\b/.test(c1a) && r1b === '2026-07-20' && /^Pushed 3 wks\b/.test(c1b),
      [r1a, c1a, r1b, c1b], '2026-07-06 "Pushed 1 wk", 2026-07-20 "Pushed 3 wks"');
    await nudge('production', -1);
    var r2a = val('start-production'), c2a = chip('production');
    await nudge('production', -1);
    var r2b = val('start-production'), c2b = chip('production');
    add('R2', '... ▲ in the same burst: 7/6, the week before the break; ▲ again: "Back where it was"',
      r2a === '2026-07-06' && /^Pushed 1 wk\b/.test(c2a) && r2b === '2026-06-29' && /^Back where it was/.test(c2b),
      [r2a, c2a, r2b, c2b], '2026-07-06 "Pushed 1 wk", 2026-06-29 "Back where it was"');
    await burstEnd();
    add('R3', '... the hiatuses are where they were, locked, through all of it', bands().join() === b0.join(), bands(), b0);

    // ---- R4-R5: Post over the two-week Christmas break ----
    for(var i = 0; i < 6; i++) await nudge('post', 1);
    var r4a = val('start-post');
    await nudge('post', 1);
    var r4b = val('start-post'), c4b = chip('post');
    await nudge('post', -1);
    var r4c = val('start-post');
    add('R4', 'Post ▼ x7 from 11/2: the sixth ends on 12/14/26, the seventh steps the Christmas break to 1/4/27 ("Pushed 9 wks"); ▲ = 12/14',
      r4a === '2026-12-14' && r4b === '2027-01-04' && /^Pushed 9 wks\b/.test(c4b) && r4c === '2026-12-14',
      [r4a, r4b, c4b, r4c], '2026-12-14, 2027-01-04 "Pushed 9 wks", 2026-12-14');
    await burstEnd();
    add('R5', '... the Christmas break never moved', bands().join() === b0.join(), bands(), b0);
    await undo();

    // ---- R6-R7: an unlocked band is stepped over too ----
    T.set('start-prodPrep', '2026-09-14');
    await T.sleep(900);
    var r6a = val('start-prodPrep');
    await nudge('prodPrep', 1);
    var r6b = val('start-prodPrep');
    await burstEnd();
    var b6 = bands();
    add('R6', 'the UNLOCKED Fall Break (9/21) is stepped over too: Prod Prep 9/14 ▼ = 9/28, and the break stays',
      r6a === '2026-09-14' && r6b === '2026-09-28' && b6.join() === b0.join(), {from: r6a, to: r6b, bands: b6}, '2026-09-14 -> 2026-09-28, bands as loaded');
    await nudge('prodPrep', -1);
    var r7 = val('start-prodPrep');
    await burstEnd();
    add('R7', '... ▲ from 9/28 = 9/14', r7 === '2026-09-14', r7, '2026-09-14');
    await undo(); await undo(); await undo();

    var stF = starts();
    add('U1', 'undone: every phase start as loaded', JSON.stringify(stF) === JSON.stringify(st0), stF, st0);

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'phasearrowsripple', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
