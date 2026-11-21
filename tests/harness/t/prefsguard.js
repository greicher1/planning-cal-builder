// prefsguard -- one bad saved preference must never leave the app a blank window (audit AUD2-078, the Nov 2026 audit's
// item 3.13; its default: "validate stored preferences when they are read and offer a reset instead of a blank window").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh prefsguard 200
//
// Before: a header preset in sptcal.prefs whose name was not text (an object) reached <option>{p.name}</option> in the
// Settings window, React threw while rendering it, and with no error boundary the whole chrome unmounted: a window with
// no header, no sidebar and no grid, on every launch, because the value stays in storage. Three loads of one page (the
// backupdecline leg's reload pattern, the phase carried in sessionStorage):
//
//   Load 1, a store holding one good preset among damaged ones (an object name, a number name, a number id, a string,
//   null, an impostor of the built-in Default, a duplicate id, a preset with no usable header) and wrong-typed values
//   for four other preferences:
//     G1  the app boots and builds a calendar
//     G2  the preset list is Default, then the presets that have a text id, each named as text, the damaged rest left out
//     G3  the good preset still applies (its line resolves on the calendar)
//     G4  the next preference written repairs the store: the damaged presets and the wrong-typed values are gone, a
//         preference this build does not know is kept
//     G5  no error logged
//   Load 2, a valid store and a chrome that fails while drawing (a test trap makes React's own option element throw, so
//   the failure is in the chrome's render, after the engine has booted, as the real one was):
//     F1  a panel says what happened and offers Reset preferences (a button with no id), instead of a blank window
//   Load 3, after that button:
//     F2  the preferences are reset and the app boots with its full chrome; no panel
(function () {
  var phase = '1'; try { phase = sessionStorage.getItem('pguard-phase') || '1'; } catch (e) {}
  window.__PHASE = phase;
  window.__T.memoryIDB();
  // lib.js has just written {hiatusRipple:false} into the store (it does for every leg); each load replaces it whole.
  if(phase === '1'){
    localStorage.setItem('sptcal.prefs', JSON.stringify({
      version: 1, hiatusRipple: false, futurePref: 'kept',
      calZoom: 'x', gridlines: {a: 1}, mvNoteColor: 5, mvWeek: 'no',
      headerPresets: [
        {id: 'h1', name: {evil: 1}, sheet: {lines: {c1: 'x'}, format: {}}},
        {id: 'h2', name: 12345, sheet: {lines: {c1: 'y'}}},
        {id: 7, name: 'Number id', sheet: {lines: {c1: 'z'}}},
        'not an object', null,
        {id: '__default', name: 'Impostor', sheet: {lines: {c1: 'i'}}},
        {id: 'good', name: 'Kept preset', sheet: {lines: {c1: 'Kept {title}'}, format: {}}},
        {id: 'good', name: 'Duplicate', sheet: {lines: {c1: 'd'}}},
        {id: 'h3', name: 'No header', sheet: 'oops', month: [1, 2]}
      ]
    }));
  }
  if(phase === '2'){
    localStorage.setItem('sptcal.prefs', JSON.stringify({version: 1, hiatusRipple: false,
      headerPresets: [{id: 'crash-probe', name: 'Probe', sheet: {lines: {c1: 'p'}, format: {}}}]}));
    // The trap: React sets an <option>'s value as it creates it, inside its render. Only the probe preset's option
    // throws, and only the Settings window's preset list ever draws one.
    var setAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) {
      if(this.tagName === 'OPTION' && n === 'value' && String(v) === 'crash-probe') throw new Error('prefsguard: test failure in the chrome');
      return setAttr.apply(this, arguments);
    };
    var d = Object.getOwnPropertyDescriptor(HTMLOptionElement.prototype, 'value');
    Object.defineProperty(HTMLOptionElement.prototype, 'value', {configurable: true, get: d.get, set: function (v) {
      if(String(v) === 'crash-probe') throw new Error('prefsguard: test failure in the chrome');
      return d.set.call(this, v);
    }});
  }
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, phase = window.__PHASE, cases = [];
  try { cases = JSON.parse(sessionStorage.getItem('pguard-cases') || '[]'); } catch (e) {}
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function stored(){ try { return JSON.parse(localStorage.getItem('sptcal.prefs') || 'null'); } catch (e) { return 'unreadable'; } }
  function options(){
    return Array.prototype.map.call(document.querySelectorAll('.hdr-preset-select option'), function (o) { return [o.value, o.textContent]; });
  }
  function chromeUp(){ return !!document.getElementById('file-menu-label') && !!document.getElementById('show-title') && !!document.querySelector('.hdr-preset-select'); }
  function resetBtn(){
    return Array.prototype.filter.call(document.querySelectorAll('button'), function (b) { return (b.textContent || '').trim() === 'Reset preferences'; })[0] || null;
  }
  function next(p){
    sessionStorage.setItem('pguard-cases', JSON.stringify(cases));
    sessionStorage.setItem('pguard-phase', p);
  }
  try {
    if(phase === '1'){
      var ready = true;
      try { await T.appReady(); } catch (e) { ready = String(e).slice(0, 160); }
      await T.sleep(1500);
      var up = chromeUp(), grid = false;
      if(ready === true && up){
        T.buildFixture();
        try { await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 10; }, 'the grid', 100, 100); grid = true; } catch (e) {}
      }
      add('G1', 'the app boots with its chrome and builds a calendar', ready === true && up && grid,
        {ready: ready, chrome: up, grid: grid, bodyChars: (document.body.innerText || '').length}, 'boots, chrome up, grid');
      var opts = options();
      var want = [['__default', 'Default'], ['h1', 'Unnamed preset'], ['h2', '12345'], ['good', 'Kept preset']];
      add('G2', 'the preset list: Default, then each preset with a text id, named as text; the damaged rest left out',
        JSON.stringify(opts) === JSON.stringify(want), opts, want);
      var c1 = '';
      var sel = document.querySelector('.hdr-preset-select');
      if(sel && up){
        sel.value = 'good'; sel.dispatchEvent(new Event('change', {bubbles: true}));
        var b = document.querySelector('[data-hdrpreset="apply"]'); if(b) b.click();
        await T.sleep(800);
        c1 = ((document.querySelector('#table-wrap [data-hid="c1"]') || {}).textContent || '').trim();
      }
      add('G3', 'the good preset still applies', c1 === 'Kept Test Show', {c1: c1}, 'Kept Test Show');
      // Any preference written saves the whole store: the Ripple switch, off and back on.
      var rip = document.getElementById('pref-hiatus-ripple');
      if(rip){ rip.click(); await T.sleep(200); rip.click(); await T.sleep(200); }
      var s = stored() || {};
      var ids = Array.isArray(s.headerPresets) ? s.headerPresets.map(function (p) { return p && p.id; }) : s.headerPresets;
      var names = Array.isArray(s.headerPresets) ? s.headerPresets.map(function (p) { return p && typeof p.name; }) : null;
      add('G4', 'the next preference written repairs the store; a preference this build does not know is kept',
        !!rip && JSON.stringify(ids) === JSON.stringify(['h1', 'h2', 'good']) && JSON.stringify(names) === JSON.stringify(['string', 'string', 'string'])
          && !('calZoom' in s) && !('gridlines' in s) && !('mvNoteColor' in s) && !('mvWeek' in s) && s.futurePref === 'kept',
        {switch: !!rip, ids: ids, names: names, keys: Object.keys(s)}, 'presets h1, h2, good, each named as text; calZoom, gridlines, mvNoteColor, mvWeek gone; futurePref kept');
      var errs = T.appHealth().errors;
      add('G5', 'no error logged', errs.length === 0, errs.slice(0, 6), 'none');
      next('2'); location.reload(); return;
    }
    if(phase === '2'){
      var btn = null;
      for(var i = 0; i < 100 && !(btn = resetBtn()); i++) await T.sleep(100);
      var panel = btn ? (btn.closest('[role="alertdialog"]') || btn.parentNode) : null;
      var text = panel ? (panel.textContent || '').replace(/\s+/g, ' ').trim() : '';
      var shown = !!btn && btn.getClientRects().length > 0;
      add('F1', 'a chrome that fails while drawing shows a panel offering Reset preferences (no id), not a blank window',
        !!btn && shown && btn.id === '' && /preferences/i.test(text) && /calendars/i.test(text),
        {button: !!btn, shown: shown, id: btn ? btn.id : null, text: text.slice(0, 300), bodyChars: (document.body.innerText || '').length},
        'a visible id-less Reset preferences button, with a line about preferences and calendars');
      next('3');
      if(btn){ btn.click(); return; }   // the button reloads the page into load 3
      location.reload(); return;
    }
    // Load 3.
    var ready3 = true;
    try { await T.appReady(); } catch (e) { ready3 = String(e).slice(0, 160); }
    await T.sleep(1500);
    var s3 = stored() || {};
    add('F2', 'after Reset preferences: the presets are gone and the app boots with its full chrome; no panel',
      ready3 === true && chromeUp() && !resetBtn() && !('headerPresets' in s3) && JSON.stringify(options()) === JSON.stringify([['__default', 'Default']]),
      {ready: ready3, chrome: chromeUp(), panel: !!resetBtn(), keys: Object.keys(s3), options: options()}, 'boots; Default only; no panel');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  try { ['pguard-phase', 'pguard-cases'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
  T.done({test: 'prefsguard', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
