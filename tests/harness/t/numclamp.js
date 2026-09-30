// numclamp -- batch 5 (FIX-PLAN §7, suspected "NumberInput clamp-on-blur desync"): when Mantine
// clamps a Show Info number on blur, the ENGINE follows. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=v1.4.0-saved ./run.sh numclamp 150
//
// The four Show Info counts are Mantine NumberInputs with min={1} (episodes and blocks also
// max={200}). Mantine clamps a typed value to that range on BLUR, and writes the clamped value
// into the field without an `input` event -- the only event the engine listens to. So typing 0
// episodes computed the calendar on 0 (Production drops out), then the field showed 1 while the
// calendar stayed on 0. A Save wrote "1" (the DOM value) for a calendar computed on 0, and the next
// unrelated edit silently put Production back. Reproduced in the pane with real typing and a real
// Tab (30 Sep 2026). The fix: on blur the engine re-reads a field whose value changed under it.
//
// The fixture is a real Save (v1.4.0-saved: 10 episodes x 8 days from 6/29/26), restored clean.
//   N0  baseline: 80 shoot days, "10 Episodes" in the header
//   N1  Number of Episodes: 0 typed, blurred -> the field shows 1 AND the engine computes 1 x 8
//   N2  Shooting Days per Episode: 0 typed, blurred -> 1, and the engine computes 1 x 1
//   N3  Blocks mode: Number of Blocks and Days per Block, 0 typed, blurred -> 1 each, engine 1 x 1
//   N4  guard: focusing and leaving a field WITHOUT typing re-renders nothing. A fix that simply
//       re-ran update() on every blur would re-render (and markDirty()) on every tab through the
//       sidebar. Observed on #table-wrap, because a calendar restored through ?state= already reads
//       "Unsaved changes" (it has no linked file), so the status line cannot show it.
//   E0  0 console errors
// ⚠️ It blurs with el.focus() / el.blur(). If this headless Chrome does not deliver those as
// focus changes, N1 reports field "0" (no clamp at all) on BOTH builds -- a harness problem, not
// a pass or a fail of the app. Watch for that before reading a red.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'numclamp', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  function probe() {
    return {
      meta: ((document.getElementById('meta-production') || {}).textContent || '').trim(),
      r3: ((document.querySelector('#table-wrap .hdr-line[data-hid="r3"]') || {}).textContent || '').trim(),
      status: ((document.querySelector('.save-status') || {}).textContent || '').replace(/\s+/g, ' ').trim()
    };
  }
  // Type v into a field the way the harness types (native setter + input), then leave it.
  async function typeAndLeave(id, v) {
    var el = document.getElementById(id);
    el.focus();
    await T.sleep(100);
    T.set(id, v);
    await T.sleep(300);
    el.blur();
    await T.sleep(600);
    await settle('the calendar to settle after leaving ' + id);
    return document.getElementById(id).value;
  }
  try {
    await T.appReady();
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle('the restored calendar to settle');
    var p0 = probe();
    out.p0 = p0;
    kase('N0', 'baseline: 10 episodes x 8 days is 80 shoot days, "10 Episodes" in the header',
         p0.meta.indexOf('80 shoot days') === 0 && p0.r3 === '10 Episodes', p0);

    // N4: focus and leave without typing -- nothing may re-render.
    var mutations = 0;
    var mo = new MutationObserver(function (list) { mutations += list.length; });
    mo.observe(document.getElementById('table-wrap'), { childList: true, subtree: true });
    var ids4 = ['num-episodes', 'shoot-days-per-ep', 'num-blocks', 'days-per-block'];
    for (var i4 = 0; i4 < ids4.length; i4++) {
      var e4 = document.getElementById(ids4[i4]);
      e4.focus(); await T.sleep(100); e4.blur(); await T.sleep(200);
    }
    await T.sleep(800);
    mo.disconnect();
    kase('N4', 'guard: focusing and leaving each field without typing re-renders nothing',
         mutations === 0, { mutations: mutations });

    var f1 = await typeAndLeave('num-episodes', '0');
    var p1 = probe();
    kase('N1', 'Number of Episodes: 0 typed and left -> the field shows 1, and the engine computes 1 episode x 8 days',
         f1 === '1' && p1.meta.indexOf('8 shoot days') === 0 && p1.r3 === '1 Episodes', { field: f1, meta: p1.meta, r3: p1.r3 });

    var f2 = await typeAndLeave('shoot-days-per-ep', '0');
    var p2 = probe();
    kase('N2', 'Shooting Days per Episode: 0 typed and left -> 1, and the engine computes 1 x 1 day',
         f2 === '1' && p2.meta.indexOf('1 shoot day') === 0, { field: f2, meta: p2.meta });

    T.set('show-mode', 'blocks');
    await settle('Blocks mode to settle');
    T.set('num-blocks', '3');
    T.set('days-per-block', '5');
    await settle('three 5-day blocks to settle');
    var pb = probe();
    var f3a = await typeAndLeave('num-blocks', '0');
    var f3b = await typeAndLeave('days-per-block', '0');
    var p3 = probe();
    kase('N3', 'Blocks mode: 0 blocks and 0 days per block, each left -> 1 and 1, and the engine computes 1 x 1',
         pb.meta.indexOf('15 shoot days') === 0 && f3a === '1' && f3b === '1' && p3.meta.indexOf('1 shoot day') === 0,
         { before: pb.meta, blocks: f3a, perBlock: f3b, meta: p3.meta });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'numclamp threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
