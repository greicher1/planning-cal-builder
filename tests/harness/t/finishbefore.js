
// finishbefore -- "Finish before <next phase>", building a calendar BACKWARDS (owner, 18 Nov 2026, from the
// executives' review of 17 Nov: "Would it be hard to put in a button that moves it the other direction?"; rulings by
// picker, HANDOFF "Finish before": R1 contextual, R2 the words, R3 no automatic pull, R4 a click puts the card on Ends).
// A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh finishbefore 300
//
// T.buildFixture()'s calendar: Writer's Rm 1/5/26 12 wk, Pre Prep 4/6/26 6 wk, Prod Prep 5/18/26 6 wk, Production from
// Mon 6/29/26 (10 x 8 shoot days), Post Mon 11/2/26 16 wk, Localization 3/1/27 8 wk; the all-phase hiatus 12/21/26-1/3/27.
//
//   C1  every phase on Starts: no card shows Finish before; Start after shows on Pre Prep..Localization as before; a
//       Finish before button on every built-in card but Localization's (the chain's last), none with an id
//   C2  Post on Ends (R1): Writer's Rm, Pre Prep, Prod Prep and Production show "Finish before <next phase>" IN PLACE
//       of Start after (Writer's Rm, the chain's head, gains one); Post shows neither; Localization keeps Start after
//   C3  Production on Ends too: it shows Finish before Post (a later phase is on Ends); Post back on Starts: Production
//       shows neither, the cards before it keep Finish before, Post and Localization show Start after
//   N1  the label names the next phase as typed: Production renamed "Shoot" reads "Finish before Shoot" on Prod Prep
//   F1  Production's Finish before Post (R4): its card goes on Ends and it wraps Fri 10/30/26, the last shoot day before
//       Post's Mon 11/2/26, starting Fri 7/10/26 (later: it wrapped well before Post); one undo step puts it back on
//       Starts at 6/29/26, one redo brings the wrap back
//   F2  Prod Prep's Finish before Production: on Ends, ending the Friday of the week before Production's first week,
//       still 6 weeks, so no overlap and no gap week
//   F3  R3: a shoot-day more per episode moves Production's START earlier while its wrap holds at 10/30/26, and Prod
//       Prep does not move (no automatic pull: Build Around is the way, by ruling)
//   D1  a built-in on Dates (no Ends): Pre Prep 3/2/26-3/27/26 keeps its length, both dates move so it ends the last
//       weekday before Prod Prep starts, and the card is not put on Ends
//   H1  over the hiatus, Production: Post starting Mon 1/4/27 (on Ends), Production's Finish before Post wraps Fri
//       12/18/26, the last shoot day before the break, not on 1/1/27 inside it
//   H2  over the hiatus, a Weeks phase: Production starting Mon 1/4/27 (on Ends), Prod Prep's Finish before Production
//       ends Fri 12/18/26, stepped back two whole weeks over the break
//   K1  a custom phase's card has no Finish before (custom phases are not in the chain, as for Start after)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'finishbefore', cases: [] };
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
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }
  var CHAIN = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function rowOf(key) { var s = byId('swatch-' + key); return s ? s.closest('.phase-row') : null; }
  function fin(key) { return rowOf(key).querySelector('.finish-before-btn'); }
  function aft(key) { return byId('autostart-' + key); }
  function mode(key) { return rowOf(key).querySelector('select.phase-anchor').value; }
  async function anchor(key, v) {
    var s = rowOf(key).querySelector('select.phase-anchor');
    nativeSet(s, v); s.dispatchEvent(new Event('change', { bubbles: true })); await settle();
  }
  async function finish(key) { fin(key).click(); await settle(); }
  function wrap() { return rowOf('production').querySelector('.prod-wrapdate').value; }
  // What each card offers: 'F:<label>' (Finish before shown), 'S:<label>' (Start after shown), '-' (neither).
  function offers() {
    var o = {};
    CHAIN.forEach(function (k) {
      var f = fin(k), a = aft(k);
      o[k] = (shown(f) ? 'F:' + f.textContent.trim() : '') + (shown(a) ? 'S:' + a.textContent.trim() : '') || '-';
    });
    return o;
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  // UTC date arithmetic, the app's own convention.
  function d(iso) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
  function iso(dt) { return dt.toISOString().slice(0, 10); }
  function plus(dt, n) { return new Date(dt.getTime() + n * 86400000); }
  function monday(dt) { var w = dt.getUTCDay(); return plus(dt, w === 0 ? -6 : 1 - w); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.buildFixture();
    await settle();
    var tab = Array.prototype.filter.call(document.querySelectorAll('button, [role=tab]'), function (b) { return (b.textContent || '').trim() === 'Phases'; })[0];
    if (tab) { tab.click(); await T.sleep(400); }

    // ===== C1: on Starts, nothing changes =========================================================================
    await step('C1', async function () {
      var o = offers();
      var want = { writersRoom: '-', prePrep: "S:↳ Start after Writer's Rm", prodPrep: 'S:↳ Start after Pre Prep',
                   production: 'S:↳ Start after Prod Prep', post: 'S:↳ Start after Production', localization: 'S:↳ Start after Post' };
      var buttons = CHAIN.map(function (k) { return !!fin(k); });
      var noIds = document.querySelectorAll('.finish-before-btn[id]').length === 0;
      kase('C1', 'all on Starts: Start after as before, no Finish before shown; a Finish before button on every built-in card but Localization, none with an id',
           same(o, want) && same(buttons, [true, true, true, true, true, false]) && noIds, { offers: o, buttons: buttons, noIds: noIds });
    });

    // ===== C2: Post on Ends ========================================================================================
    await step('C2', async function () {
      await anchor('post', 'ends');
      var o = offers();
      var want = { writersRoom: '↳ Finish before Pre Prep', prePrep: '↳ Finish before Prod Prep', prodPrep: '↳ Finish before Production',
                   production: '↳ Finish before Post', post: '-', localization: 'S:↳ Start after Post' };
      ['writersRoom', 'prePrep', 'prodPrep', 'production'].forEach(function (k) { want[k] = 'F:' + want[k]; });
      kase('C2', 'Post on Ends: the four cards before it show Finish before <next phase> in place of Start after; Post neither; Localization keeps Start after',
           same(o, want), { offers: o });
    });

    // ===== C3: which Ends phase decides ============================================================================
    await step('C3', async function () {
      await anchor('production', 'ends');
      var both = offers();
      await anchor('post', 'starts');
      var prodOnly = offers();
      await anchor('production', 'starts');
      await anchor('post', 'ends');
      var okBoth = both.production === 'F:↳ Finish before Post' && both.post === '-' && both.prodPrep === 'F:↳ Finish before Production';
      var okProd = prodOnly.production === '-' && prodOnly.prodPrep === 'F:↳ Finish before Production' && prodOnly.writersRoom === 'F:↳ Finish before Pre Prep'
        && prodOnly.post === 'S:↳ Start after Production' && prodOnly.localization === 'S:↳ Start after Post';
      kase('C3', 'Production and Post on Ends: Production shows Finish before Post; Production alone on Ends: it shows neither, the cards before it Finish before, Post and Localization Start after',
           okBoth && okProd, { both: both, prodOnly: prodOnly });
    });

    // ===== N1: the label follows a renamed phase ===================================================================
    await step('N1', async function () {
      T.set('name-production', 'Shoot'); await settle();
      var renamed = fin('prodPrep').textContent.trim();
      T.set('name-production', 'Production'); await settle();
      var back = fin('prodPrep').textContent.trim();
      kase('N1', 'Production renamed "Shoot": Prod Prep reads "Finish before Shoot", and "Finish before Production" again after',
           renamed === '↳ Finish before Shoot' && back === '↳ Finish before Production', { renamed: renamed, back: back });
    });

    // ===== F1: Production finishes before Post =====================================================================
    var F1 = {};
    await step('F1', async function () {
      var s0 = byId('start-production').value;
      await finish('production');
      F1 = { mode: mode('production'), cls: rowOf('production').classList.contains('ends-mode'), wrap: wrap(), start: byId('start-production').value,
             post: byId('start-post').value, offer: offers().production };
      await undo();
      var u = { mode: mode('production'), start: byId('start-production').value, wrap: wrap() };
      await redo();
      var r = { mode: mode('production'), wrap: wrap() };
      // The shoot wrapped well before Post, so finishing right before it moves the start LATER (to Fri 7/10/26, the
      // latest start the Ends search finds for 80 shoot days by 10/30/26): the gap closes from this side.
      kase('F1', 'Production\'s Finish before Post puts it on Ends wrapping Fri 10/30/26 (Post starts Mon 11/2/26), starting Fri 7/10/26, still offering Finish before Post; one undo back to Starts at 6/29/26, one redo back',
           s0 === '2026-06-29' && F1.mode === 'ends' && F1.cls && F1.wrap === '2026-10-30' && F1.post === '2026-11-02' && F1.start === '2026-07-10'
           && F1.offer === 'F:↳ Finish before Post' && u.mode === 'starts' && u.start === '2026-06-29' && u.wrap === ''
           && r.mode === 'ends' && r.wrap === '2026-10-30',
           { s0: s0, after: F1, undone: u, redone: r });
    });

    // ===== F2: Prod Prep finishes before Production ================================================================
    var F2 = {};
    await step('F2', async function () {
      var prodStart = byId('start-production').value;
      await finish('prodPrep');
      var want = iso(plus(monday(d(prodStart)), -3));
      F2 = { mode: mode('prodPrep'), end: byId('end-prodPrep').value, start: byId('start-prodPrep').value, weeks: byId('weeks-prodPrep').value,
             box: rowOf('prodPrep').querySelector('.phase-endsdate').value, prodStart: prodStart, want: want };
      kase('F2', 'Prod Prep\'s Finish before Production: on Ends, ending the Friday of the week before Production\'s first week, still 6 weeks (start 5 weeks before that Monday)',
           F2.mode === 'ends' && F2.end === want && F2.box === want && F2.weeks === '6' && F2.start === iso(plus(monday(d(want)), -35)) && F2.end < prodStart,
           F2);
    });

    // ===== F3: R3, no automatic pull ===============================================================================
    await step('F3', async function () {
      var s0 = byId('start-production').value;
      T.set('shoot-days-per-ep', '9'); await settle();
      var grown = { wrap: wrap(), start: byId('start-production').value, ppEnd: byId('end-prodPrep').value };
      T.set('shoot-days-per-ep', '8'); await settle();
      var back = { wrap: wrap(), start: byId('start-production').value };
      kase('F3', 'one more shoot day per episode: Production still wraps 10/30/26 and starts earlier; Prod Prep stays where Finish before put it (no automatic pull, R3); back to 8 puts the start back',
           grown.wrap === '2026-10-30' && grown.start < s0 && grown.ppEnd === F2.end && back.wrap === '2026-10-30' && back.start === s0,
           { s0: s0, grown: grown, back: back });
    });

    // ===== D1: a built-in on Dates =================================================================================
    await step('D1', async function () {
      T.set('unit-prePrep', 'dates'); await settle();
      T.set('start-prePrep', '2026-03-02'); await settle();
      T.set('end-prePrep', '2026-03-27'); await settle();
      var shownBefore = shown(fin('prePrep'));
      await finish('prePrep');
      var next = d(byId('start-prodPrep').value), last = plus(next, -1);
      while (last.getUTCDay() === 0 || last.getUTCDay() === 6) last = plus(last, -1);
      var span = Math.round((d('2026-03-27') - d('2026-03-02')) / 86400000);
      var got = { start: byId('start-prePrep').value, end: byId('end-prePrep').value, ends: rowOf('prePrep').classList.contains('ends-mode') };
      kase('D1', 'Pre Prep on Dates 3/2/26-3/27/26: Finish before Prod Prep keeps its length and ends it the last weekday before Prod Prep starts; the card is not put on Ends',
           shownBefore && got.end === iso(last) && got.start === iso(plus(last, -span)) && !got.ends,
           { got: got, want: { end: iso(last), start: iso(plus(last, -span)) }, prodPrepStart: iso(next) });
      T.set('unit-prePrep', 'weeks'); await settle();
    });

    // ===== H1: Production over the hiatus ==========================================================================
    await step('H1', async function () {
      await anchor('post', 'starts');
      T.set('start-post', '2027-01-04'); await settle();
      await anchor('post', 'ends');
      await finish('production');
      var got = { wrap: wrap(), post: byId('start-post').value };
      kase('H1', 'Post starting Mon 1/4/27 after the 12/21/26 hiatus: Production\'s Finish before Post wraps Fri 12/18/26, before the break',
           got.post === '2027-01-04' && got.wrap === '2026-12-18', got);
    });

    // ===== H2: a Weeks phase over the hiatus =======================================================================
    await step('H2', async function () {
      await anchor('production', 'starts');
      T.set('start-production', '2027-01-04'); await settle();
      await anchor('production', 'ends');
      var prodStart = byId('start-production').value;
      await finish('prodPrep');
      var got = { end: byId('end-prodPrep').value, start: byId('start-prodPrep').value, prodStart: prodStart };
      kase('H2', 'Production starting Mon 1/4/27: Prod Prep\'s Finish before Production ends Fri 12/18/26, stepped back over the 12/21/26-1/3/27 hiatus (not Fri 1/1/27 inside it)',
           prodStart === '2027-01-04' && got.end === '2026-12-18', got);
    });

    // ===== K1: custom phases are not in the chain ==================================================================
    await step('K1', async function () {
      byId('add-phase-btn').click(); await settle();
      var rows = document.querySelectorAll('#custom-phase-rows > .phase-row');
      var n = document.querySelectorAll('#custom-phase-rows .finish-before-btn').length;
      kase('K1', 'a custom phase\'s card has no Finish before button', rows.length > 0 && n === 0, { rows: rows.length, buttons: n });
    });

    var errs = T.appHealth().errors || [];
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'finishbefore threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
