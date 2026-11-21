// hostile -- no value read from a file, a header preset, or a preset already stored in this browser
// can put markup into the page (FIX-PLAN.md 1.4; AUDIT-REPORT H-1, L-8, L-9).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=xss-mixed ./run.sh hostile 240
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=xss-proto ./run.sh hostile 240   (the startup path, S0, for xss-proto*)
//
// Every payload lives in a tests/fixtures/xss-* file and is an INERT marker (see that README): it
// pushes a tag onto window.__PWN / window.__pwn, or an injected element carries a data-pwn
// attribute. This leg NEVER builds a payload of its own -- it loads the files and counts what got
// through, so the harness source stays clean. A file must still LOAD (a fix that refused the whole
// file would pass the injection check while losing the calendar), so each load also confirms the
// fixture's title arrived.
//
// Load the prefs blob (a preset a pre-fix build could have stored) BEFORE the engine boots.
(function seedStoredPreset(){
  try {
    var req = new XMLHttpRequest();
    req.open('GET', '/tests/fixtures/xss-stored-prefs.json', false);
    req.send(null);
    if(req.status === 200) localStorage.setItem('sptcal.prefs', req.responseText);
  } catch (e) { window.__SEED_FAILED = String(e); }
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed){ cases.push({id: id, title: title, pass: pass, observed: observed}); }
  function markerTags(){
    var out = [];
    ['__PWN', '__pwn'].forEach(function (k) { if(Array.isArray(window[k])) out = out.concat(window[k]); });
    Object.keys(window).forEach(function (k) { if(/^__PWN/.test(k) && !/^__PWN$|^__PWNlist$/.test(k)) out.push(k); });
    return out;
  }
  function injectedCount(){
    return document.querySelectorAll('[data-pwn], img[src="x"], img[src="data:,"], svg[onload]').length;
  }
  function fired(){ return {tags: markerTags(), injected: injectedCount()}; }
  function clean(){ window.__PWN = undefined; window.__pwn = undefined; }
  async function load(file){
    var p = T.openViaFakePicker('/tests/fixtures/' + file, file);
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(2200);
  }
  function title(){ return (document.getElementById('show-title') || {}).value; }
  try {
    await T.appReady();
    await T.sleep(1500);

    // S0: the inline saved-state restored at startup (HARNESS_STATE = xss-mixed, the shareable-copy path).
    // A second gate run starts from xss-proto (the shareable-copy path with the values on a prototype): month view too.
    var s0 = fired();
    var mv0 = document.getElementById('view-month-btn'); if(mv0){ mv0.click(); await T.sleep(1200); }
    var s0m = fired();
    var wf0 = document.getElementById('view-sheet-btn'); if(wf0){ wf0.click(); await T.sleep(600); }
    add('S0', 'inline saved-state at startup fires nothing and still restores (waterfall and month view)',
      s0.tags.length === 0 && s0.injected === 0 && s0m.tags.length === 0 && s0m.injected === 0 && /^SHOW XSS( PROTO)?$/.test(title()),
      {fired: s0, month: s0m, title: title()});

    // S1..: File > Load of every hostile calendar, through the real picker.
    var FILES = ['xss-hdrfmt.sptcal', 'xss-hdrfmt-auto.sptcal', 'xss-notecolor.sptcal', 'xss-hiatuscolor.sptcal',
                 'xss-daynotecolor.sptcal', 'xss-holidayid.sptcal', 'xss-episodes.sptcal', 'xss-blocks.sptcal',
                 'xss-grid.sptcal', 'xss-mixed.sptcal'];
    for(var i = 0; i < FILES.length; i++){
      clean();
      await load(FILES[i]);
      // Switch to the month view too: several sinks (day-note colour, hiatus band, pills) only render there.
      var mv = document.getElementById('view-month-btn'); if(mv){ mv.click(); await T.sleep(1200); }
      var f = fired();
      add('S1.' + FILES[i], 'File > Load of ' + FILES[i] + ' fires nothing', f.tags.length === 0 && f.injected === 0, {fired: f, title: title()});
      var wf = document.getElementById('view-sheet-btn'); if(wf){ wf.click(); await T.sleep(600); }
    }

    // R1: a hostile .spthdr imported and applied through the Settings tab.
    clean();
    var real = window.showOpenFilePicker;
    var presetText = null;
    try { var rq = new XMLHttpRequest(); rq.open('GET', '/tests/fixtures/xss-preset.spthdr', false); rq.send(null); presetText = rq.responseText; } catch (e) {}
    window.showOpenFilePicker = async function () { return [{ name: 'xss-preset.spthdr', getFile: async function () { return new File([presetText], 'xss-preset.spthdr'); } }]; };
    await T.openSettings('presets');   // the Settings window's Presets tab since ruling 12
    await T.sleep(300);
    var importBtn = document.querySelector('[data-hdrpreset="import"]');
    if(importBtn){ importBtn.click(); await T.sleep(1200); if(/[A-Za-z]/.test(T.modalText())) T.clickModalButton(/OK|Close/); await T.sleep(400); }
    // apply the last preset
    var sel = document.querySelector('.hdr-preset-select');
    if(sel){
      var last = sel.options[sel.options.length - 1];
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, last.value);
      sel.dispatchEvent(new Event('change', {bubbles: true}));
      var applyBtn = document.querySelector('[data-hdrpreset="apply"]'); if(applyBtn){ applyBtn.click(); await T.sleep(1200); }
    }
    window.showOpenFilePicker = real;
    var rf = fired();
    add('R1', 'importing and applying a hostile .spthdr fires nothing', rf.tags.length === 0 && rf.injected === 0, {fired: rf, applied: !!sel});

    // P3: a preset ALREADY stored in this browser (pre-fix) fires nothing when applied.
    clean();
    if(sel && sel.options.length){
      var stored = null;
      Array.from(sel.options).forEach(function (o) { if(/Stored hostile/.test(o.textContent)) stored = o; });
      if(stored){
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, stored.value);
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        var ab2 = document.querySelector('[data-hdrpreset="apply"]'); if(ab2){ ab2.click(); await T.sleep(1200); }
      }
      var pf = fired();
      add('P3', 'applying a preset stored by a pre-fix build fires nothing', pf.tags.length === 0 && pf.injected === 0, {fired: pf, seedFailed: window.__SEED_FAILED || null});
    }

    // S2..: values a file puts on an object's PROTOTYPE rather than on its own keys (a "__proto__" key), where a value
    // the app refuses must not be read instead. Each file must still LOAD (its title arrives) and fire nothing, in the
    // waterfall and the month view: a .sptcal, one whose marker is a refresh, the same inside a legacy .html, and a
    // two-scenario file. Last in the leg, so a calendar left on screen here cannot colour R1's and P3's counts.
    async function bothViews(){
      var w = fired();
      var mvb = document.getElementById('view-month-btn'); if(mvb){ mvb.click(); await T.sleep(1200); }
      var m = fired();
      var wfb = document.getElementById('view-sheet-btn'); if(wfb){ wfb.click(); await T.sleep(600); }
      return {sheet: w, month: m, ok: !w.tags.length && !w.injected && !m.tags.length && !m.injected};
    }
    var PROTO = [['xss-proto.sptcal', 'SHOW XSS PROTO'], ['xss-proto-refresh.sptcal', 'SHOW XSS PROTO R'],
                 ['xss-proto-legacy.html', 'SHOW XSS PROTO L'], ['xss-proto-scenarios.sptcal', 'SHOW XSS PROTO S']];
    for(var j = 0; j < PROTO.length; j++){
      clean();
      await load(PROTO[j][0]);
      // The "Load another calendar?" question can come after load()'s 4 s look on a loaded machine, and then the NEXT
      // load answers it and reads this file's title. So wait for this file's own title, answering the question if it
      // is still up.
      for(var g2 = 0; g2 < 50 && title() !== PROTO[j][1]; g2++){
        if(/Load another calendar/.test(T.modalText())) T.clickModalButton('Load');
        await T.sleep(200);
      }
      await T.sleep(600);
      var t2 = title(), b2 = await bothViews();
      add('S2.' + PROTO[j][0], 'File > Load of ' + PROTO[j][0] + ' loads it and fires nothing (waterfall and month view)',
        b2.ok && t2 === PROTO[j][1], {fired: b2, title: t2, want: PROTO[j][1], modal: T.modalText().slice(0, 160)});
    }
    // S3: that file's parked scenario, switched to (it is applied only now).
    clean();
    document.dispatchEvent(new CustomEvent('sptcal-scenario', {detail: {op: 'switch', id: 's2'}}));
    await T.sleep(2000);
    var t3 = title(), b3 = await bothViews();
    add('S3', 'switching to the scenario file\'s parked tab shows it and fires nothing', b3.ok && t3 === 'SHOW XSS PROTO S2',
      {fired: b3, title: t3});
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'hostile', cases: cases, err: (window.__ERR || []).slice(0, 12)});
})(); });
