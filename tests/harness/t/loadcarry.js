// loadcarry -- nothing from one calendar may survive into the next one loaded, and undo must put
// back exactly what was there (FIX-PLAN.md 1.1 and 1.3; AUDIT-REPORT M-2 and M-5; HANDOFF §2b-3
// known bugs #1 and #2).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh loadcarry 90
//
// Everything goes through the REAL File ▸ Load… path (openViaFakePicker: parseCalendarText →
// applyStateSnapshot → refreshAfterRestore), and what a calendar WOULD SAVE is read by pressing
// Cmd+S into a recording handle -- captureSnapshot() itself is unreachable from a test (the engine is
// one closure), and the saved text is the thing that must not carry another show's data anyway.
//
// ⛔ memoryIDB() MUST run synchronously, here at the top, before the engine boots: openRecentFile()
// awaits persistRecents() before it clears isDirty, and real IndexedDB never settles in headless.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], W = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); progress(id); }
  // Progress is written into #R as it goes, so a run that runs out of budget still says how far it got.
  function progress(step){ var r = document.getElementById('R'); if(r) r.textContent = 'pending ' + step + ' ' + JSON.stringify(cases.map(function(c){ return c.id + ':' + c.pass; })); }
  function val(id){ var e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : null; }
  function customRows(){
    return Array.from(document.querySelectorAll('#custom-phase-rows .phase-row')).map(function (r) {
      var n = r.querySelector('.phase-name-input'); return r.dataset.key + ':' + (n ? n.value : '');
    });
  }
  function gridHas(re){ return re.test((document.getElementById('table-wrap') || {}).textContent || ''); }
  async function load(file, title){
    progress('load ' + file);
    var p = T.openViaFakePicker('/tests/fixtures/' + file, file, {writes: W});
    // The unsaved-work guard ("Load another calendar?") sits between the menu click and the
    // picker whenever the previous step left the calendar dirty. Answer it the way a user would.
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p;
    if(title) await T.until(function () { return val('show-title') === title; }, 'title ' + title, 200, 100);
    await T.sleep(1500);
  }
  async function saveText(){
    var n = W.length;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', code: 'KeyS', metaKey: true, ctrlKey: true, bubbles: true}));
    await T.until(function () { return W.length > n; }, 'a Save write', 150, 100);
    await T.sleep(600);
    return W[W.length - 1].text;
  }
  // The two saves being compared differ legitimately in nothing but these keys: the sidebar tab a
  // test happened to leave open. Everything else must be byte-identical.
  function norm(text){ var o = JSON.parse(text); delete o.sidebarTab; return JSON.stringify(o); }
  try {
    await T.appReady(); await T.sleep(800);

    // ---- C1: custom phases do not carry from A into B (M-2 / known bug #2) --------------------
    await load('blocks.sptcal', 'Test Show');
    var fresh = await saveText();
    await load('stintswap-chained.sptcal', 'Chained Swap Fixture');
    var rowsA = customRows();
    await load('blocks.sptcal', 'Test Show');
    var rowsAB = customRows(), afterAB = await saveText();
    var sAB = JSON.parse(afterAB), sFresh = JSON.parse(fresh);
    add('C1', 'loading a customless calendar after one with custom phases leaves no custom phase behind',
      rowsAB.length === 0 && (sAB.customPhaseDefs || []).length === 0 && !gridHas(/Casting wk/),
      {rowsInA: rowsA, rowsAfterAthenB: rowsAB, savedCustomPhaseDefs: sAB.customPhaseDefs, savedCounter: sAB.customPhaseCounter,
       gridShowsCasting: gridHas(/Casting wk/)},
      '0 custom rows, customPhaseDefs [] in the saved file, no "Casting wk" in the grid');
    add('C2', 'what B saves after A→B is byte-identical to what B saves when loaded fresh',
      norm(afterAB) === norm(fresh),
      {identical: norm(afterAB) === norm(fresh), freshBytes: fresh.length, afterABBytes: afterAB.length,
       customIdsInAB: Object.keys((sAB.fields || {}).byId || {}).filter(function (k) { return /custom\d/.test(k); }),
       customIdsInFresh: Object.keys((sFresh.fields || {}).byId || {}).filter(function (k) { return /custom\d/.test(k); })},
      'identical');

    // ---- C3: undo past "Add phase" removes the row (M-2, the undo trigger) ---------------------
    var undoBtn = document.getElementById('undo-btn');
    document.getElementById('add-phase-btn').click(); await T.sleep(900);
    var k = (document.querySelector('#custom-phase-rows .phase-row') || {dataset: {}}).dataset.key;
    if(k){ T.set('name-' + k, 'Casting'); await T.sleep(900); T.set('start-' + k, '2026-10-05'); await T.sleep(900); T.set('weeks-' + k, '4'); await T.sleep(1500); }
    var rowsAfterAdd = customRows(), undos = 0;
    for(var i = 0; i < 12 && undoBtn && !undoBtn.disabled && undoBtn.getAttribute('data-disabled') !== 'true'; i++){ undoBtn.click(); undos++; await T.sleep(900); }
    add('C3', 'undoing every step after "Add phase" removes the custom row',
      rowsAfterAdd.length === 1 && customRows().length === 0 && !gridHas(/Casting wk/),
      {rowsAfterAdd: rowsAfterAdd, undos: undos, rowsAfterUndo: customRows()}, '1 row after the add, 0 after undoing it all');

    // ---- C4: a non-dense custom key restores with LIVE handlers (known bug #1) ------------------
    await load('custom-nondense.sptcal', 'Non-dense Custom Key');
    var rows4 = customRows();
    var name2 = document.getElementById('name-custom2'), ph2 = document.getElementById('phiatus-name-custom2');
    var phBefore = ph2 ? ph2.placeholder : null;
    if(name2){ T.set('name-custom2', 'Pickups Renamed'); await T.sleep(700); }
    var phAfter = ph2 ? ph2.placeholder : null;
    var errsBefore = (window.__ERR || []).length;
    var rm = document.querySelector('#custom-phase-rows .phase-row .remove-custom-phase');
    if(rm){ rm.click(); await T.sleep(700); T.clickModalButton('Remove'); await T.sleep(1500); }
    var saved4 = JSON.parse(await saveText());
    var newErrs = (window.__ERR || []).slice(errsBefore);
    add('C4', 'a restored custom phase with a non-dense key (custom2) keeps working: rename updates its hiatus placeholder, remove removes its def',
      rows4.length === 1 && phAfter === 'Pickups Renamed Hiatus' && customRows().length === 0 &&
        (saved4.customPhaseDefs || []).length === 0 && newErrs.length === 0,
      {rowsLoaded: rows4, placeholderBefore: phBefore, placeholderAfterRename: phAfter, rowsAfterRemove: customRows(),
       savedCustomPhaseDefs: saved4.customPhaseDefs, newErrors: newErrs.slice(0, 3)},
      'placeholder "Pickups Renamed Hiatus"; 0 rows and customPhaseDefs [] after remove; no errors');

    // ---- C5: Snap to Mon and per-phase hiatus names do not carry into an older file (M-5) -------
    // v1.0.0-wed-state.html is the REAL v1.0.0 fixture's saved state with Pre Prep moved to Wed
    // 3/18/26: on the real fixture Pre Prep starts on a Monday, where snapped and unsnapped agree and
    // the carry-over cannot show.
    await load('carry-snap.sptcal', 'Snap Carry A');
    var snapA = val('snap-prePrep'), phA = val('phiatus-name-post');
    var pl = T.openViaFakePicker('/tests/fixtures/v1.0.0-wed-state.html', 'v1.0.0-wed-state.html', {writes: W});
    for(var g2 = 0; g2 < 40; g2++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await pl;
    await T.until(function () { return val('show-title') !== 'Snap Carry A'; }, 'the legacy file to load', 200, 100);
    await T.sleep(2000);
    var meta = (document.getElementById('meta-prePrep') || {}).textContent || '';
    add('C5', 'a pre-snap file opened after a snap-off calendar is scheduled SNAPPED, with no inherited hiatus name',
      snapA === false && phA === 'SHOW A POST BREAK' && val('snap-prePrep') === true && val('phiatus-name-post') === '' && /^3\/16\/26/.test(meta.trim()) && /Snapped to Mon/.test(meta),
      {inA: {snapPrePrep: snapA, phiatusNamePost: phA}, afterLegacy: {snapPrePrep: val('snap-prePrep'), phiatusNamePost: val('phiatus-name-post'), metaPrePrep: meta.replace(/\s+/g, ' ').trim()}},
      'snap-prePrep checked, phiatus-name-post empty, Pre Prep 3/16/26 (the entered Wed 3/18/26 snapped to its Monday)');

    // ---- C6: New resets them too (M-5, the New / Reset All half) --------------------------------
    await load('carry-snap.sptcal', 'Snap Carry A');
    var nb = document.getElementById('new-file-btn');
    if(nb){ nb.click(); await T.sleep(900); T.clickModalButton(/^Start new$/); await T.sleep(1500); }
    add('C6', 'New starts with Snap to Mon on and no per-phase hiatus names',
      val('show-title') === '' && val('snap-prePrep') === true && val('phiatus-name-post') === '',
      {title: val('show-title'), snapPrePrep: val('snap-prePrep'), phiatusNamePost: val('phiatus-name-post')},
      'title "", snap-prePrep checked, phiatus-name-post ""');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'loadcarry', cases: cases, writes: W.length, memIdb: !!window.__MEMIDB, memIdbFailed: window.__MEMIDB_FAILED || null,
          err: (window.__ERR || []).slice(0, 10)});
})(); });
