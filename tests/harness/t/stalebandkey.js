// stalebandkey -- a band override on a week with NO band stays put unless its week moves (PHASE-WEEK-ARROWS-PLAN.md
// §5b; found while building the month drag carry, 5 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=stalebandkey ./run.sh stalebandkey 400
//
// An all-phase band's label, colour, size and styles are keyed by plain week ("2026-07-06"), one key per week of the
// band. A key can outlive its band: a label typed on a band whose hiatus was later retyped to other dates. Such a key is
// ignored (no band draws it) and must never be destroyed, so a later retype or an Undo brings it back.
// shiftCalendarDates' step 3 (hiatusKeyStays) kept a plain key only on a held band's week, so EVERY other plain key
// moved: one-phase moves (the phase card's ▲ / ▼, the month drag) carried a stale label a week, and Shift From carried
// one from before its cutoff. Moved onto a held band's week, the label yielded (shiftKeyedMap) and was gone, and its
// colour, size and styles landed on that band: nudging Post recoloured Summer Break.
// The rule now: a plain key on a band that stays, stays; on a band that moves, moves with the band, every week of it;
// on no band, it goes by its week as a note does (inside the move's weeks it moves, outside it stays).
//
// THE CALENDAR: tests/fixtures/stalebandkey.sptcal, which is phasearrows.sptcal with, added by script:
//   - a STALE band override on 7/6/26, a week with no band one week above the locked Summer Break (7/13, named, no
//     colour): the label "Old Break Name" (typed, not synced), colour #7030A0, size 9, an italic waterfall style and a
//     bold month style;
//   - a second stale label, "Late Stale", on 2/8/27 (inside Post's run, no band);
//   - a Dates phase, Stage Build 5/3-5/14/27 (custom1; a hiatus does not lengthen a Dates phase), and an UNLOCKED
//     two-week all-phase band, "Strike Break" from 5/10/27, starting in Stage Build's LAST week and running a week past
//     it, with a typed label "Strike wk 2" and colour #00B0F0 on its second week (5/17/27).
// From phasearrows it keeps: six phases (Post 11/2/26 with its own "Post Pause" 1/4/27 and four "<week>|post" stores),
// Production 6/29/26 with day marks, the unlocked Fall Break 9/21/26, the locked Summer Break and Christmas hiatuses,
// a range start of 2/2/26, typed week notes. It opens in the waterfall on the Phases tab.
//
// Every state is read back from the crash backup, which IS captureSnapshot(), and compared key-sorted.
//
//   T0  truth guard: the fixture as loaded (the stale stores on 7/6 and 2/8/27, the Strike Break's on 5/10 and 5/17)
//   N1  Post ▼: Post 11/9 and its own stores a week on; the stale override stays on 7/6, every store of it, and Summer
//       Break keeps its name and gets no colour, size or style; "Late Stale" stays on 2/8/27. Red before the fix (the
//       label yielded on 7/13 and was gone; its colour, size and styles landed on Summer Break)
//   N2  Production ▲: the stale stores stay on 7/6 (before the fix they moved to 6/29)
//   F1  Phase & after Post, 1 wk later (= Shift From): Post, Localization and Stage Build move, and so does the
//       unlocked Strike Break with both its weeks' stores; the stale override BEFORE the cutoff stays on 7/6 (red
//       before the fix); "Late Stale", after the cutoff, moves to 2/15/27 as a note there would
//   P1  only Stage Build ticked, 1 wk earlier: Stage Build 4/26-5/7/27; the Strike Break, starting in its last week,
//       moves to 5/3 and BOTH its weeks' stores go with it ("Strike wk 2" and its colour 5/17 -> 5/10, though 5/17 is
//       outside Stage Build's run); both stale labels, outside its run, stay; every other phase stays. Red before the
//       fix (stale labels moved), and red on the "plain key stays when outside the window" one-liner (5/17 left behind)
//   A1  All phases, 1 wk earlier: the whole calendar, stale labels included, a week earlier (unchanged by the fix);
//       the locked Summer Break keeps 7/13 and its name
//   U1  each move undone by ONE Undo: the calendar is the one it started as, snapshot for snapshot
//   S1  no new key in fields.byId, in any snapshot taken
//   E0  0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function row(key){ return $('swatch-' + key).parentElement; }
  function btn(key, dir){ return row(key).querySelector('.ph-nudge-btn[data-nudge="' + dir + '"]'); }
  async function nudge(key, dir){ btn(key, dir).click(); await T.sleep(150); }
  async function burstEnd(){ await T.sleep(1900); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  async function settle(){ await T.sleep(900); }
  var MENU = function () { return $('pop-shift'); };
  function q(sel){ return MENU().querySelector(sel); }
  function tick(key, on){ var b = q('input[data-key="' + key + '"]'); if(!b) throw new Error('no tick for ' + key); if(b.checked !== on){ b.checked = on; b.dispatchEvent(new Event('change', {bubbles: true})); } }
  async function openShift(){ document.body.click(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(250); }
  async function choose(move){ q('[data-move="' + move + '"]').click(); await T.sleep(120); }
  function canon(o){
    if(Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
    if(o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(o[k]); }).join(',') + '}';
    return JSON.stringify(o);
  }
  function same(a, b){ return canon(a) === canon(b); }
  var lastAt = 0, snaps = [];
  async function take(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    // ⚠️ COPIED, never kept as read: the in-memory IndexedDB keeps the live userNotes by reference (phasearrows' take()).
    var state = JSON.parse(JSON.stringify(got.state));
    snaps.push(state);
    return state;
  }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1'];
  function startsOf(s){ var o = {}; KEYS.forEach(function (k) { o[k] = ((s.fields.byId['start-' + k]) || {}).value; }); return o; }
  function withStarts(st, ch){ return Object.assign({}, st, ch); }
  // Every PLAIN-keyed band store (the all-phase bands' own), and the hiatus rows.
  function plain(m){ var o = {}; Object.keys(m || {}).forEach(function (k) { if(k.indexOf('|') < 0) o[k] = m[k]; }); return o; }
  function bands(s){
    return {texts: plain(s.hiatusTexts), synced: plain(s.hiatusNameSyncedKeys), colors: plain(s.hiatusColors),
            sizes: plain(s.hiatusFontSize), wfStyle: plain((s.textStyles || {}).hiatus), mvStyle: plain((s.mvTextStyles || {}).band)};
  }
  function hiatusOf(s){ return (s.fields.hiatuses || []).map(function (h) { return h.start + ' x' + h.weeks + (h.locked ? ' locked' : '') + (h.name ? ' ' + h.name : ''); }); }
  // A band-store set with some keys moved: `moves` maps an old week to a new one (null = gone).
  function rekey(b, moves){
    var o = {};
    Object.keys(b).forEach(function (store) {
      o[store] = {};
      Object.keys(b[store]).forEach(function (k) { var to = (k in moves) ? moves[k] : k; if(to) o[store][to] = b[store][k]; });
    });
    return o;
  }
  var STALE = {texts: 'Old Break Name', colors: '#7030A0', sizes: 9, wfStyle: {italic: true}, mvStyle: {bold: true}};
  function staleOn(b, iso){
    return Object.keys(STALE).every(function (store) { return same(b[store][iso], STALE[store]); });
  }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test((($('meta-production') || {}).textContent) || ''); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A loaded calendar is clean, and a clean page writes no backup: one edit that is not a schedule input.
    T.set('show-title', 'Stale Band Key');
    await T.sleep(700);   // past the undo debounce, so the title is its own step
    var s0 = await take();
    var st0 = startsOf(s0), b0 = bands(s0), h0 = hiatusOf(s0);
    add('T0', 'the fixture as loaded: the stale override on 7/6/26 (all five stores), "Late Stale" on 2/8/27, Summer Break 7/13 named with no colour, Stage Build 5/3-5/14/27, the unlocked Strike Break 5/10/27 x2 with "Strike wk 2" + colour on 5/17',
      same(st0, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-02', localization: '2027-03-01', custom1: '2027-05-03'})
        && ((s0.fields.byId['end-custom1']) || {}).value === '2027-05-14'
        && staleOn(b0, '2026-07-06') && !b0.synced['2026-07-06'] && b0.texts['2027-02-08'] === 'Late Stale'
        && b0.texts['2026-07-13'] === 'Summer Break' && !b0.colors['2026-07-13'] && !b0.sizes['2026-07-13'] && !b0.wfStyle['2026-07-13'] && !b0.mvStyle['2026-07-13']
        && b0.texts['2027-05-10'] === 'Strike Break' && b0.texts['2027-05-17'] === 'Strike wk 2' && b0.colors['2027-05-17'] === '#00B0F0'
        && h0.indexOf('2027-05-10 x2 Strike Break') >= 0 && h0.indexOf('2026-07-13 x1 locked Summer Break') >= 0,
      {starts: st0, bands: b0, hiatuses: h0}, 'the fixture as written');

    // ---- N1: Post ▼ ----
    await nudge('post', 1);
    await burstEnd();
    var sN1 = await take(), bN1 = bands(sN1);
    add('N1', 'Post ▼: Post 11/9 and its own hiatus a week on; the stale override stays on 7/6 (every store), Summer Break keeps its name and gets no colour, size or style; "Late Stale" stays on 2/8/27; every plain band store as loaded',
      same(startsOf(sN1), withStarts(st0, {post: '2026-11-09'})) && ((sN1.fields.byId['phiatus-start-post']) || {}).value === '2027-01-11'
        && same(bN1, b0) && same(hiatusOf(sN1), h0),
      {post: startsOf(sN1).post, on0706: {text: bN1.texts['2026-07-06'], color: bN1.colors['2026-07-06']},
       on0713: {text: bN1.texts['2026-07-13'], color: bN1.colors['2026-07-13'], size: bN1.sizes['2026-07-13'], wf: bN1.wfStyle['2026-07-13'], mv: bN1.mvStyle['2026-07-13']},
       late: Object.keys(bN1.texts).filter(function (k) { return bN1.texts[k] === 'Late Stale'; }), same: same(bN1, b0)},
      'post 11/9; Old Break Name + #7030A0 on 7/6; Summer Break, no colour, on 7/13; Late Stale on 2/8/27');
    await undo();
    var sN1u = await take();

    // ---- N2: Production ▲ ----
    await nudge('production', -1);
    await burstEnd();
    var sN2 = await take(), bN2 = bands(sN2);
    await undo();
    var sN2u = await take();
    add('N2', 'Production ▲: Production 6/22; the stale override stays on 7/6 (before the fix it moved to 6/29), every plain band store as loaded',
      startsOf(sN2).production === '2026-06-22' && same(bN2, b0) && same(hiatusOf(sN2), h0),
      {production: startsOf(sN2).production, on0706: bN2.texts['2026-07-06'], on0629: bN2.texts['2026-06-29'], same: same(bN2, b0)},
      'production 6/22; Old Break Name on 7/6');

    // ---- F1: Phase & after Post, 1 wk later (Shift From) ----
    await openShift(); await choose('after');
    T.set('tool-anchor-phase', 'post'); await T.sleep(150);
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var sF1 = await take(), bF1 = bands(sF1);
    var wantF1 = rekey(b0, {'2027-02-08': '2027-02-15', '2027-05-10': '2027-05-17', '2027-05-17': '2027-05-24'});
    add('F1', 'Phase & after Post +1 wk (Shift From): Post, Localization and Stage Build a week on, and the unlocked Strike Break with both its weeks\' stores (5/17, 5/24); the stale override BEFORE the cutoff stays on 7/6; "Late Stale", after it, moves to 2/15/27',
      same(startsOf(sF1), withStarts(st0, {post: '2026-11-09', localization: '2027-03-08', custom1: '2027-05-10'}))
        && hiatusOf(sF1).indexOf('2027-05-17 x2 Strike Break') >= 0 && same(bF1, wantF1),
      {starts: startsOf(sF1), bands: bF1}, wantF1);
    await undo();
    var sF1u = await take();

    // ---- P1: only Stage Build ticked, 1 wk earlier ----
    await openShift();
    q('[data-shift-choose]').click(); await T.sleep(150);
    KEYS.forEach(function (k) { tick(k, k === 'custom1'); });
    await T.sleep(150);
    T.set('tool-shift-weeks', '1');
    $('tool-shift-earlier').click(); await settle();
    var sP1 = await take(), bP1 = bands(sP1);
    var wantP1 = rekey(b0, {'2027-05-10': '2027-05-03', '2027-05-17': '2027-05-10'});
    add('P1', 'only Stage Build ticked, 1 wk earlier: Stage Build 4/26-5/7/27; the Strike Break, starting in its last week, moves to 5/3 and BOTH weeks\' stores go with it ("Strike wk 2" and its colour 5/17 -> 5/10); both stale labels, outside its run, stay; every other phase stays',
      same(startsOf(sP1), withStarts(st0, {custom1: '2027-04-26'})) && ((sP1.fields.byId['end-custom1']) || {}).value === '2027-05-07'
        && hiatusOf(sP1).indexOf('2027-05-03 x2 Strike Break') >= 0 && same(bP1, wantP1),
      {starts: startsOf(sP1), end: ((sP1.fields.byId['end-custom1']) || {}).value, hiatuses: hiatusOf(sP1), bands: bP1}, wantP1);
    await undo();
    var sP1u = await take();

    // ---- A1: All phases, 1 wk earlier (unchanged by the fix) ----
    await openShift();
    T.set('tool-shift-weeks', '1');
    $('tool-shift-earlier').click(); await settle();
    var sA1 = await take(), bA1 = bands(sA1);
    var wantA1 = rekey(b0, {'2026-07-06': '2026-06-29', '2026-09-21': '2026-09-14', '2027-02-08': '2027-02-01', '2027-05-10': '2027-05-03', '2027-05-17': '2027-05-10'});
    add('A1', 'All phases -1 wk: every phase a week earlier, both stale labels with them (6/29/26, 2/1/27) and the unlocked bands\' stores (Fall Break 9/14, Strike Break 5/3 + 5/10); the locked Summer Break keeps 7/13 and its name',
      same(startsOf(sA1), {writersRoom: '2025-12-29', prePrep: '2026-04-01', prodPrep: '2026-05-11', production: '2026-06-22', post: '2026-10-26', localization: '2027-02-22', custom1: '2027-04-26'})
        && same(bA1, wantA1),
      {starts: startsOf(sA1), bands: bA1}, wantA1);
    await undo();
    var sA1u = await take();

    var undone = [sN1u, sN2u, sF1u, sP1u, sA1u].map(function (s) { return same(s, s0); });
    add('U1', 'each move undone by ONE Undo: the calendar is the one it started as, snapshot for snapshot',
      undone.every(Boolean), undone, '[true, true, true, true, true]');

    var keys0 = Object.keys(s0.fields.byId).sort().join();
    var drift = snaps.filter(function (s) { return Object.keys(s.fields.byId).sort().join() !== keys0; }).length;
    add('S1', 'no new key in fields.byId, in any of the ' + snaps.length + ' snapshots', drift === 0 && snaps.length >= 11,
      {snapshots: snaps.length, drift: drift}, '0');

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'stalebandkey', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
