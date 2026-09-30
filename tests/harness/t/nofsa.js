// nofsa -- a browser without the File System Access API is told, in one line, that SPTCal saves and
// loads in Chrome or Edge (FIX-PLAN.md 4.9; AUDIT-REPORT L-20; owner ruling R6, "Chrome/Edge only:
// a notice on other browsers").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh nofsa 150
//
// Without the API (Safari, Firefox) the engine hides the whole file menu -- Load... with it -- and Save
// becomes a plain download of the old .html copy. So such a user can never load a calendar back, and
// nothing said so. HANDOFF 3 B and CLAUDE.md both claimed "opening a calendar works fine" there.
//
// The API is removed BEFORE the app boots, as the audit did: this script is an inline classic script
// at the end of <body>, and the app bundle is a <script type="module"> in <head>, which runs only
// after parsing finishes. Phase 1 boots with the API as the control, then reloads; phase 2 removes it.
//
//   C0  control, the API present: the notice exists and stays hidden
//   B0  evidence: in phase 2 the API is really gone (typeof showSaveFilePicker is 'undefined')
//   B1  the notice is shown, saying "SPTCal saves and loads in Chrome or Edge"
//   B2  the premise: the file menu (and Load...) is hidden in this browser
//   B3  a shareable copy exported from here carries the notice HIDDEN (the clone re-hides it, as it
//       does the legacy and update strips) -- otherwise the copy opened in Chrome would show it
//   B4  the x dismisses it
(function () {
  var phase = null; try { phase = sessionStorage.getItem('nofsa-phase'); } catch (e) {}
  if(phase !== '2') return;
  ['showSaveFilePicker', 'showOpenFilePicker', 'showDirectoryPicker'].forEach(function (k) {
    try { delete window[k]; } catch (e) {}
    try { if(typeof window[k] === 'function') delete Window.prototype[k]; } catch (e) {}
    try { if(typeof window[k] === 'function') Object.defineProperty(window, k, {value: undefined, configurable: true, writable: true}); } catch (e) {}
  });
  window.__NOFSA = typeof window.showSaveFilePicker;
})();
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function strip(){
    var e = document.getElementById('browser-notice');
    return {exists: !!e, shown: !!e && !e.hidden && getComputedStyle(e).display !== 'none',
            text: e ? ((e.querySelector('.ln-text') || e).textContent || '').replace(/\s+/g, ' ').trim() : null};
  }
  var phase = null; try { phase = sessionStorage.getItem('nofsa-phase'); } catch (e) {}
  try {
    await T.appReady();
    await T.sleep(1200);
    if(phase !== '2'){
      sessionStorage.setItem('nofsa-c0', JSON.stringify({api: typeof window.showSaveFilePicker, strip: strip()}));
      sessionStorage.setItem('nofsa-phase', '2');
      location.reload();
      return;
    }
    var c0 = JSON.parse(sessionStorage.getItem('nofsa-c0') || '{}');
    add('C0', 'control, with the API: the notice exists and stays hidden',
      c0.api === 'function' && c0.strip && c0.strip.exists && !c0.strip.shown, c0, 'api function; exists, hidden');
    add('B0', 'the API is really gone before boot', window.__NOFSA === 'undefined' && typeof window.showSaveFilePicker === 'undefined',
      {atBoot: window.__NOFSA, now: typeof window.showSaveFilePicker}, 'undefined');
    var b1 = strip();
    add('B1', 'without the API the notice is shown: "SPTCal saves and loads in Chrome or Edge"',
      b1.shown && b1.text.indexOf('SPTCal saves and loads in Chrome or Edge') === 0, b1, 'shown, that sentence');
    var fm = document.querySelector('.file-menu-btn');
    add('B2', 'the premise (audit L-20): the file menu, and Load... with it, is hidden here',
      !fm || fm.offsetParent === null || getComputedStyle(fm).display === 'none', {fileMenuVisible: !!(fm && fm.offsetParent)}, 'hidden');

    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var inCopy = doc.getElementById('browser-notice');
    add('B3', 'a shareable copy exported from here carries the notice HIDDEN', !!inCopy && inCopy.hasAttribute('hidden'),
      {inCopy: !!inCopy, hidden: !!inCopy && inCopy.hasAttribute('hidden'), bytes: html.length}, 'present, hidden');

    var x = document.querySelector('#browser-notice .ln-x');
    if(x) x.click();
    await T.sleep(400);
    add('B4', 'the x dismisses it', !!x && !strip().shown, {dismissBtn: !!x, after: strip()}, 'hidden');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  try { sessionStorage.removeItem('nofsa-phase'); sessionStorage.removeItem('nofsa-c0'); } catch (e) {}
  T.done({test: 'nofsa', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
