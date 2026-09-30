// swscope -- the boot clean-up unregisters only the service workers under THIS app's own path
// (FIX-PLAN.md 4.2; AUDIT-REPORT SUPPLY-3; owner ruling R7).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh swscope 60
//
// The app registers no service worker; it unregisters the caching one early versions installed.
// It did that with getRegistrations().forEach(unregister) -- EVERY registration on the origin. On
// greicher1.github.io that origin is shared by every repo the owner publishes, so opening SPTCal
// silently removed other sites' workers (and with them their offline copies).
//
// srv.js serves a no-op worker at /__sw.js with Service-Worker-Allowed: /, so the leg can register
// at any scope. Phase 1 registers four, then reloads; phase 2 lets the app's boot clean-up run and
// reads what is left. run.sh gives every run a fresh profile, so nothing carries between runs.
//
//   S1  /dist/      the app's own path              -> removed
//   S2  /dist/sub/  under the app's path            -> removed
//   S3  /other-app/ a neighbouring site             -> KEPT
//   S4  /           the origin root (a user site)   -> KEPT: it is above this app, not under it
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], KEY = 'swscope-phase';
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  var SCOPES = ['/dist/sub/', '/dist/', '/other-app/', '/'];
  async function scopes(){
    var regs = await navigator.serviceWorker.getRegistrations();
    return regs.map(function (r) { return new URL(r.scope).pathname; }).sort();
  }
  function mark(m){ document.documentElement.setAttribute('data-swstep', m); }
  try {
    mark('start');
    if(!('serviceWorker' in navigator)){ throw new Error('no navigator.serviceWorker in this Chrome'); }
    var phase = null; try { phase = sessionStorage.getItem(KEY); } catch (e) {}
    if(phase !== '2'){
      await T.appReady(); await T.sleep(1500);   // let the FIRST boot's clean-up finish before registering
      for(var i = 0; i < SCOPES.length; i++){ mark('reg ' + SCOPES[i]); await navigator.serviceWorker.register('/__sw.js', {scope: SCOPES[i]}); }
      mark('registered');
      var before = await scopes();
      sessionStorage.setItem(KEY, '2'); sessionStorage.setItem('swscope-before', JSON.stringify(before));
      location.reload();
      return;
    }
    mark('phase2'); await T.appReady(); await T.sleep(2500); mark('reading');
    var registered = JSON.parse(sessionStorage.getItem('swscope-before') || '[]'), left = await scopes();
    add('S0', 'all four workers were registered before the reload', registered.length === 4, registered, SCOPES.slice().sort());
    [['S1', '/dist/', false], ['S2', '/dist/sub/', false], ['S3', '/other-app/', true], ['S4', '/', true]].forEach(function (c) {
      var kept = left.indexOf(c[1]) >= 0;
      add(c[0], 'scope ' + c[1] + (c[2] ? ' is KEPT (not under this app)' : ' is removed (this app\'s own path)'),
        kept === c[2], {kept: kept, left: left}, c[2] ? 'kept' : 'removed');
    });
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'swscope', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
