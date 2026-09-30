// hdroverrides -- a file from before headerManual existed (per-line headerOverrides) migrates into
// Manual with defaults computed from ITS OWN schedule, not the previous calendar's
// (FIX-PLAN.md 4.14; AUDIT-REPORT N-8, the remaining part).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh hdroverrides 150
//
// applyStateSnapshot's step 4b migrated `headerOverrides` as
//   headerManual = Object.assign(computeHeaderDefaults(currentSchedule), snap.headerOverrides)
// and at that point currentSchedule is still the PREVIOUS calendar's: nothing has recomputed it,
// and the holidays the new file's wrap depends on are restored later in the same function. So the
// lines the file did NOT override were baked, permanently (Manual is literal text), from whatever
// calendar was open before. The DOM-derived lines (title, Writer's Room) were already the new
// file's, because step 3 applies fields.byId first; the schedule-derived ones were not.
//
// No real pre-headerManual file survives (v1.0.0 already writes headerMode/headerManual), so the
// file is v1.0.0-saved.html's own snapshot with its header keys swapped for headerOverrides. It is
// built here, in the page, from the committed fixture: synthetic, and nothing new is committed.
//
//   C0  control: calendar A (blocks) and the v1.0.0 calendar differ in a schedule-derived line,
//       or H1 would prove nothing
//   H1  A, then the overrides file: every line equals the file's own Auto header, except `left`,
//       which is the override
//   H2  A, then an overrides file carrying a number (l3), an id the app never writes and a
//       "__proto__" key: the number and the bad id are dropped as sanitizeSnapshot drops them in
//       headerManual, and nothing reaches a line through the prototype
//   H3  the migrated lines are BAKED: moving Production afterwards leaves r1/r2 as the file had them
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var IDS = ['left', 'l2', 'l3', 'c1', 'c2', 'c3', 'c4', 'r1', 'r2', 'r3'];
  function lines(){
    var o = {};
    IDS.forEach(function (id) {
      var e = document.querySelector('#table-wrap .hdr-line[data-hid="' + id + '"]');
      o[id] = e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null;
    });
    return o;
  }
  function title(){ return (document.getElementById('show-title') || {}).value; }
  async function load(text, name, wantTitle){
    var picked = false;
    var p = T.openViaFakePicker(null, name, {text: text}).then(function () { picked = true; });
    for(var g = 0; g < 80 && !picked; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); } }
    await p;
    await T.until(function () { return title() === wantTitle && document.querySelector('#table-wrap .hdr-line'); }, 'the loaded calendar ' + wantTitle, 100, 100);
    await T.sleep(1200);
    return lines();
  }
  function diff(a, b){ return IDS.filter(function (id) { return a[id] !== b[id]; }); }
  try {
    await T.appReady();
    var real = await (await fetch('/tests/fixtures/v1.0.0-saved.html')).text();
    var i = real.indexOf('id="saved-state"'), b = real.indexOf('>', i) + 1, c = real.indexOf('<\/script>', b);
    var snap = JSON.parse(real.slice(b, c));
    var bTitle = snap.fields.byId['show-title'].value;
    var aText = await (await fetch('/tests/fixtures/blocks.sptcal')).text();
    var aTitle = JSON.parse(aText).fields.byId['show-title'].value;

    function variant(overridesJson){
      var s = JSON.parse(JSON.stringify(snap));
      delete s.headerMode; delete s.headerManual;
      if(overridesJson) s.headerOverrides = JSON.parse(overridesJson);   // JSON.parse keeps "__proto__" as an OWN key
      else s.headerMode = 'auto';
      return JSON.stringify(s);
    }
    var truth = await load(variant(null), 'legacy-auto.sptcal', bTitle);
    var hdrA = await load(aText, 'blocks.sptcal', aTitle);
    var dA = diff(truth, hdrA).filter(function (id) { return id !== 'left'; });
    add('C0', 'control: calendar A and the v1.0.0 calendar differ in some line besides the title',
      dA.length > 0, {differ: dA, truth: truth, A: hdrA}, 'at least one line differs');

    var h1 = await load(variant('{"left":"Custom Left Line"}'), 'legacy-overrides.sptcal', bTitle);
    var want1 = JSON.parse(JSON.stringify(truth)); want1.left = 'Custom Left Line';
    add('H1', 'after A, a headerOverrides file keeps ITS OWN defaults for every line it did not override',
      diff(h1, want1).length === 0, {wrong: diff(h1, want1), got: h1}, want1);

    // H3: the defaults were BAKED, not merely falling back live. Manual is literal text, so moving
    // Production must leave the migrated r2 alone. Without this, H1 passes on a build that never
    // bakes at all, because a missing line falls back to the (then still correct) live defaults.
    T.set('start-production', '2026-06-01'); await T.sleep(1500);
    var h3 = lines();
    add('H3', 'the migrated lines are baked: moving Production leaves r1/r2 as the file had them',
      h3.r1 === want1.r1 && h3.r2 === want1.r2, {r1: h3.r1, r2: h3.r2}, {r1: want1.r1, r2: want1.r2});

    await load(aText, 'blocks.sptcal', aTitle);
    var h2 = await load(variant('{"left":"Custom Left Line","l3":42,"Bad Id!":"x","__proto__":{"c4":"PROTO-C4"}}'), 'legacy-overrides-bad.sptcal', bTitle);
    var protoHit = IDS.filter(function (id) { return /PROTO/.test(h2[id] || ''); });
    add('H2', 'a number, a bad id and a __proto__ key in headerOverrides are dropped; the lines are H1\'s',
      diff(h2, want1).length === 0 && protoHit.length === 0 && h2.l3 !== '42',
      {wrong: diff(h2, want1), protoHit: protoHit, got: h2}, want1);
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'hdroverrides', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
// ⛔ Never write the closing-script-tag literal in this file (srv.js injects legs inline); it is
// written with a backslash before the slash above.
