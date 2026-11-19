// whatsnew -- the blue update bar on every release, and the What's New window after an update (owner, 19 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh whatsnew 240
//
// Six launches of one page (the backupdecline leg's reload pattern; cases ride in sessionStorage). Every launch seeds
// a fresh in-memory IndexedDB holding one crash backup from last week, so "Recover unsaved work" is asked each time,
// and fakes the engine's fetch of version.json so the update bar can be driven (the build's own file matches it).
//
// Launch 1 (plain ?test=, so What's New is OFF, as on localhost and every other leg):
//   W0  no What's New window; the recovery question is asked as before (nothing to wait for)
//   W1  the version under the SPTCal name is a button ("What's new") that opens the window on the latest entries
//   U1  version.json with the SAME version and a DIFFERENT build stamp: the bar shows, "An update to SPTCal…"
// Launch 1b (the bar's Reload, pressed for real):
//   U4  the page reloaded, and 'sptcal.updating' is '1' (read by launch 3)
// Launch 2 (?whatsnew=live, no key, no prefs: a first-ever launch):
//   W2  no window, and 'sptcal.whatsNew' now holds the newest id
//   U2  version.json with this build's own stamp: no bar
// Launch 3 (live, no key, 'sptcal.updating' = '1': the first update after this ships, via the bar's Reload):
//   W3  What's New opens FIRST, with the newest entry only, and no recovery question behind it (owner: What's New
//       comes before "Recover unsaved work"); the flag is gone and the key is the newest id
//   W4  Got it, and only then the recovery question
// Launch 4 (live, key = an id older than every entry):
//   W5  every entry newer than the key is shown (up to four)
//   U3  version.json with an OLDER version and another stamp (a rollback): no bar
// Launch 5 (live, key = the newest): W6  no window (once per entry)
// Launch 6 (live, no key, 'sptcal.prefs' present: someone who has used the app): W7  the newest entry only
(function () {
  var phase = '1'; try { phase = sessionStorage.getItem('wn-phase') || '1'; } catch (e) {}
  window.__PHASE = phase;
  // lib.js writes 'sptcal.prefs' (Ripple Hiatus off) at the top of every leg page, before this. Launch 2 is a
  // first-ever launch, which has none, so it goes again here, still before the app decides anything.
  if(phase === '2'){ try { localStorage.removeItem('sptcal.prefs'); } catch (e) {} }
  window.__T.memoryIDB();
  var x = new XMLHttpRequest(); x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var old = JSON.parse(x.responseText); old.fields.byId['show-title'] = {value: 'OLD WORK FROM LAST WEEK'};
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['unsavedBackup:lastweek', {state: old, at: Date.now() - 6 * 864e5, fileName: 'show-a.sptcal'}]
  ])};
  // The marker the engine polls: {version, build} as this launch's case needs, resolved at fetch time.
  var realFetch = window.fetch.bind(window);
  window.__MARKER = null;   // a function returning the object to answer with, set per launch below
  window.__MARKER_ASKED = 0;
  window.fetch = function (u, o) {
    if(/version\.json/.test(String(u)) && window.__MARKER){
      window.__MARKER_ASKED++;
      return Promise.resolve(new Response(JSON.stringify(window.__MARKER()), {status: 200, headers: {'Content-Type': 'application/json'}}));
    }
    return realFetch(u, o);
  };
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, phase = window.__PHASE, cases = [];
  try { cases = JSON.parse(sessionStorage.getItem('wn-cases') || '[]'); } catch (e) {}
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function ls(k){ try { return localStorage.getItem(k); } catch (e) { return 'THREW'; } }
  function dlg(){
    var d = document.querySelector('.whatsnew-dlg');
    if(!d) return null;
    return {dates: Array.from(d.querySelectorAll('.whatsnew-date')).map(function (e) { return e.textContent.trim(); }),
            items: Array.from(d.querySelectorAll('.whatsnew-title')).map(function (e) { return e.textContent.trim(); })};
  }
  function recoverAsked(){ return /Recover unsaved work/.test(T.modalText()); }
  function gotIt(){
    var b = Array.from(document.querySelectorAll('.whatsnew-dlg button')).find(function (e) { return e.textContent.trim() === 'Got it'; });
    if(b) b.click(); return !!b;
  }
  function bar(){
    var el = document.getElementById('update-notice');
    return {shown: !!el && !el.hidden, text: el ? (el.querySelector('.ln-text').textContent || '').replace(/\s+/g, ' ').trim() : ''};
  }
  function meta(){ return (document.querySelector('meta[name="sptcal-build"]') || {}).content; }
  function version(){ return ((document.querySelector('.app-brand-ver') || {}).textContent || '').replace(/^v/, '').trim(); }
  async function waitFor(fn, ms){ for(var i = 0; i < ms / 100; i++){ var v = fn(); if(v) return v; await T.sleep(100); } return fn(); }
  function next(p, query){
    sessionStorage.setItem('wn-cases', JSON.stringify(cases));
    sessionStorage.setItem('wn-phase', p);
    location.href = location.pathname + '?test=whatsnew' + (query || '');
  }
  try {
    await T.appReady();
    if(phase === '1'){
      // A fresh profile, but say so: every key this leg reads starts absent.
      ['sptcal.whatsNew', 'sptcal.updating', 'sptcal.prefs'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      window.__MARKER = function () { return {version: version(), build: '0123456789ab'}; };
      var asked = await waitFor(recoverAsked, 6000);
      add('W0', 'What\'s New is off on localhost without ?whatsnew=: no window, and the recovery question comes as before',
        asked && !dlg() && ls('sptcal.whatsNew') === null, {recover: asked, dialog: dlg(), key: ls('sptcal.whatsNew')}, 'recovery asked; no window; no key');
      T.clickModalButton('Cancel'); await T.sleep(600);
      var b = document.querySelector('button.app-brand-ver');
      if(b) b.click();
      var d1 = await waitFor(dlg, 2000);
      add('W1', 'the version under the SPTCal name is a button ("What\'s new") that opens the window on the latest entries',
        !!b && b.title === 'What’s new' && !!d1 && d1.items.length > 0 && d1.dates.length >= 1,
        {button: b ? {tag: b.tagName, title: b.title, text: b.textContent} : null, dialog: d1}, 'a button; the window with entries');
      gotIt(); await T.sleep(400);
      var u1 = await waitFor(function () { return bar().shown && bar(); }, 12000);
      add('U1', 'the same version with another build stamp shows the bar: "An update to SPTCal is available"',
        !!u1 && /An update to SPTCal is available/.test(u1.text) && /Save first/.test(u1.text),
        {bar: bar(), asked: window.__MARKER_ASKED, meta: meta()}, 'the bar, worded for an update with no new number');
      // Its Reload, for real: the page reloads (same URL, so What's New is still off) into launch 1b.
      sessionStorage.setItem('wn-cases', JSON.stringify(cases));
      sessionStorage.setItem('wn-phase', '1b');
      document.querySelector('#update-notice .ln-go').click();
      return;
    }
    if(phase === '1b'){
      add('U4', 'the bar\'s Reload reloads the page and sets \'sptcal.updating\', which the next launch\'s What\'s New reads',
        ls('sptcal.updating') === '1', {flag: ls('sptcal.updating')}, 'reloaded; flag "1"');
      localStorage.removeItem('sptcal.updating');
      next('2', '&whatsnew=live'); return;
    }
    if(phase === '2'){
      window.__MARKER = function () { return {version: version(), build: meta()}; };
      await waitFor(recoverAsked, 6000);
      await T.sleep(1500);
      var key2 = ls('sptcal.whatsNew');
      add('W2', 'a first-ever launch (no key, no prefs, no Reload) shows no window, and records the newest entry as seen',
        !dlg() && /^\d{4}-\d{2}-\d{2}/.test(key2 || ''), {dialog: dlg(), key: key2, recover: recoverAsked()}, 'no window; key = newest id');
      T.clickModalButton('Cancel'); await T.sleep(400);
      var u2 = await waitFor(function () { return window.__MARKER_ASKED > 0; }, 12000);
      await T.sleep(300);
      add('U2', 'version.json with this build\'s own stamp: no bar', u2 && !bar().shown,
        {asked: window.__MARKER_ASKED, bar: bar()}, 'asked; no bar');
      sessionStorage.setItem('wn-newest', key2 || '');
      localStorage.removeItem('sptcal.whatsNew');
      localStorage.setItem('sptcal.updating', '1');
      next('3', '&whatsnew=live'); return;
    }
    var newest = sessionStorage.getItem('wn-newest');
    if(phase === '3'){
      var d3 = await waitFor(dlg, 6000);
      var behind = recoverAsked();
      add('W3', 'after the bar\'s Reload, What\'s New opens FIRST with the newest entry only, no recovery question behind it',
        !!d3 && d3.dates.length === 1 && !behind && ls('sptcal.updating') === null && ls('sptcal.whatsNew') === newest,
        {dialog: d3, recoverBehind: behind, flag: ls('sptcal.updating'), key: ls('sptcal.whatsNew'), newest: newest},
        'one entry; no recovery yet; flag cleared; key = newest');
      await T.sleep(1500);
      var stillAlone = !recoverAsked();
      gotIt();
      var after = await waitFor(recoverAsked, 4000);
      add('W4', 'the recovery question waits while What\'s New is open, and comes once it is closed',
        stillAlone && after && !dlg(), {waitedAlone: stillAlone, recoverAfter: after}, 'not before Got it; asked after');
      T.clickModalButton('Cancel'); await T.sleep(400);
      localStorage.setItem('sptcal.whatsNew', '2000-01-01');
      next('4', '&whatsnew=live'); return;
    }
    if(phase === '4'){
      window.__MARKER = function () { return {version: '0.9.0', build: 'fedcba987654'}; };
      var d4 = await waitFor(dlg, 6000);
      add('W5', 'with a key older than every entry, each newer entry is shown (up to four), newest first',
        !!d4 && d4.dates.length >= 1 && d4.dates.length <= 4 && ls('sptcal.whatsNew') === newest,
        {dialog: d4, key: ls('sptcal.whatsNew')}, 'every entry, at most four');
      gotIt();
      await waitFor(recoverAsked, 4000);
      T.clickModalButton('Cancel'); await T.sleep(400);
      var u3 = await waitFor(function () { return window.__MARKER_ASKED > 0; }, 12000);
      await T.sleep(300);
      add('U3', 'an OLDER version with another stamp (a rollback) shows no bar', u3 && !bar().shown,
        {asked: window.__MARKER_ASKED, bar: bar()}, 'asked; no bar');
      next('5', '&whatsnew=live'); return;
    }
    if(phase === '5'){
      await waitFor(recoverAsked, 6000);
      await T.sleep(1500);
      add('W6', 'a seen entry is not shown again', !dlg() && ls('sptcal.whatsNew') === newest,
        {dialog: dlg(), key: ls('sptcal.whatsNew')}, 'no window');
      T.clickModalButton('Cancel'); await T.sleep(400);
      localStorage.removeItem('sptcal.whatsNew');
      localStorage.setItem('sptcal.prefs', JSON.stringify({version: 1}));
      next('6', '&whatsnew=live'); return;
    }
    if(phase === '6'){
      var d6 = await waitFor(dlg, 6000);
      add('W7', 'no key but \'sptcal.prefs\' present (used the app before): the newest entry only',
        !!d6 && d6.dates.length === 1 && ls('sptcal.whatsNew') === newest, {dialog: d6, key: ls('sptcal.whatsNew')}, 'one entry');
      gotIt(); await T.sleep(300);
      ['sptcal.whatsNew', 'sptcal.updating', 'sptcal.prefs'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      ['wn-phase', 'wn-cases', 'wn-newest'].forEach(function (k) { try { sessionStorage.removeItem(k); } catch (e) {} });
      T.done({test: 'whatsnew', cases: cases, err: []});
    }
  } catch (e) {
    ['wn-phase', 'wn-cases', 'wn-newest'].forEach(function (k) { try { sessionStorage.removeItem(k); } catch (_) {} });
    T.done({test: 'whatsnew', cases: cases, err: [String(e && e.stack || e)]});
  }
})(); });
