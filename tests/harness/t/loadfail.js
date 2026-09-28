// loadfail -- a file that fails to load leaves the open calendar untouched, keeps dirty tracking
// alive, and is never written into the user's own file (FIX-PLAN.md 1.5; AUDIT-REPORT M-1, L-1, L-19).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh loadfail 150
//
// SHOW A is opened first through the real picker with a RECORDING handle, so it becomes the linked
// Save target. Then:
//   V  a newer-version file           -> refused (version gate), SHOW A kept, Save writes SHOW A
//   S  a non-calendar JSON            -> refused (shape gate), never written
//   C  a malformed-but-loadable file  -> H-1's sanitize drops the bad bits; it loads cleanly, with
//                                        no hybrid and no error (it fully becomes its own show)
//   R  a value that throws mid-apply  -> the atomic wrapper rolls back to SHOW A, handle kept,
//                                        dirty alive, Save writes SHOW A (the forced-throw head js)
// A ONE-SHOT forced throw for the atomic-rollback case (R). Installed here, at the top of the test
// script, so it is in place before the app module boots (like memoryIDB). applyStateSnapshot always
// clears #custom-phase-rows early on; throwing there once simulates a value a future build can't
// apply, AFTER some stores are touched -- and disarming as it throws lets the rollback's re-apply of
// THIS build's own snapshot succeed, which is the real invariant.
window.__THROW_ON_APPLY = false; window.__THROW_FIRED = 0;
(function () {
  var realGet = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id) {
    if (window.__THROW_ON_APPLY && id === 'custom-phase-rows') { window.__THROW_ON_APPLY = false; window.__THROW_FIRED++; throw new Error('forced apply throw (test)'); }
    return realGet.call(this, id);
  };
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], W = [];
  function add(id, title, pass, observed){ cases.push({id: id, title: title, pass: pass, observed: observed}); }
  function title(){ return (document.getElementById('show-title') || {}).value; }
  function hiatusNames(){ return Array.from(document.querySelectorAll('#hiatus-list .hiatus-name')).map(function (i) { return i.value; }).filter(Boolean); }
  function status(){ return (document.body.innerText.match(/Unsaved changes|Saved \d+:\d+ [AP]M|Autosave[^\n]*/) || [''])[0]; }
  async function open(file){
    var p = T.openViaFakePicker('/tests/fixtures/' + file, file, {writes: W});
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    try { await p; } catch (e) {}
    await T.sleep(1600);
  }
  async function dismissIfRefused(){
    var msg = '';
    for(var i = 0; i < 30; i++){ await T.sleep(100); if(/couldn|newer version|doesn.t contain/i.test(T.modalText())){ msg = T.modalText(); break; } }
    if(msg) T.clickModalButton(/OK|Close/);
    await T.sleep(500);
    return msg;
  }
  async function saveNow(){
    var n = W.length;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', code: 'KeyS', metaKey: true, ctrlKey: true, bubbles: true}));
    for(var i = 0; i < 60 && W.length === n; i++) await T.sleep(100);
    return W.length > n ? W[W.length - 1] : null;
  }
  // A refusal case: SHOW A must be untouched, an edit must dirty it, and Save must write SHOW A's
  // own edited content back to SHOW A -- never the bad file.
  async function refusalCase(id, file, why, expectMsg){
    await open('show-a.sptcal');
    var loadedA = title() === 'SHOW A' && hiatusNames().indexOf('Summer Break') >= 0;
    await open(file);
    var msg = await dismissIfRefused();
    T.set('show-title', 'EDIT ' + id); await T.sleep(1400);
    var st = status();
    var w = await saveNow();
    add(id, 'refuse ' + why + ': SHOW A kept, Save writes SHOW A not the bad file',
        loadedA && expectMsg.test(msg) && title() === 'EDIT ' + id && hiatusNames().indexOf('Summer Break') >= 0 &&
          st === 'Unsaved changes' && w && w.file === 'show-a.sptcal' &&
          /"value":\s*"EDIT / .test(w.text) && W.every(function (x) { return x.file === 'show-a.sptcal'; }),
        {loadedA: loadedA, refusal: (msg || '').slice(0, 80), titleAfter: title(), hiatusAfter: hiatusNames(),
         status: st, wroteTo: w ? w.file : null, allWrites: W.map(function (x) { return x.file; })});
  }
  try {
    await T.appReady();
    await T.sleep(800);

    // V: newer version.
    await refusalCase('V', 'loadfail-future.sptcal', 'a newer version', /newer version/i);
    W.length = 0;
    // S: not a calendar.
    await refusalCase('S', 'foreign.json', 'a non-calendar JSON', /doesn.t contain/i);
    W.length = 0;

    // C: a malformed-but-sanitizable file loads cleanly (H-1 drops the bad bits, so no throw, no
    // hybrid). It fully becomes SHOW B, and there are no console errors.
    await open('show-a.sptcal');
    var errsBefore = (window.__ERR || []).filter(function (e) { return /error|reject/i.test(e); }).length;
    await open('loadfail-null-field.sptcal');
    var newErrs = (window.__ERR || []).filter(function (e) { return /error|reject/i.test(e); }).slice(errsBefore);
    add('C', 'a malformed-but-sanitizable file loads cleanly as its own show, not a hybrid, with no errors',
        title() === 'SHOW B' && newErrs.length === 0 && hiatusNames().indexOf('Summer Break') < 0,
        {titleAfter: title(), hiatusAfter: hiatusNames(), newErrors: newErrs});

    // R: force a throw partway through applyStateSnapshot -> the atomic wrapper must restore SHOW A.
    W.length = 0;
    await open('show-a.sptcal');
    var loadedA = title() === 'SHOW A';
    window.__THROW_ON_APPLY = true;
    await open('blocks.sptcal');       // a perfectly valid file; the forced throw fires mid-apply
    var msg = await dismissIfRefused();
    T.set('show-title', 'EDIT R'); await T.sleep(1400);
    var st = status();
    var w = await saveNow();
    add('R', 'a value that throws mid-apply rolls back to SHOW A; the handle is kept and Save writes SHOW A',
        loadedA && /couldn/i.test(msg) && title() === 'EDIT R' && hiatusNames().indexOf('Summer Break') >= 0 &&
          st === 'Unsaved changes' && w && w.file === 'show-a.sptcal' && /"value":\s*"EDIT R"/.test(w.text),
        {loadedA: loadedA, refusal: (msg || '').slice(0, 80), titleAfter: title(), hiatusAfter: hiatusNames(),
         status: st, wroteTo: w ? w.file : null, throwFired: window.__THROW_FIRED});
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'loadfail', cases: cases, err: (window.__ERR || []).slice(0, 12)});
})(); });
