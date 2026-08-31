// fsprobe -- the diagnostic that explains a failing `restore` leg. NOT part of gate.sh.
//
// WHEN TO RUN IT: the restore gate fails with "timed out waiting for: renderRecents() to reveal
// the file menu". Before blaming the build, run this against BOTH pages:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh fsprobe 30   # the build
//   HARNESS_PAGE=/index.html      ./run.sh fsprobe 30   # the deployed app, untouched
//
// ⚠️ `run.sh` DEFAULTS TO /index.html. A bare `./run.sh restore` therefore tests the deployed app
// and not the build -- it can pass while the build fails, which reads as a clean bill of health
// and is not one. Always pass HARNESS_PAGE explicitly.
//
// WHAT IT MEASURED (round 7): `indexedDB.open('spt-planning-cal')` in headless Chrome NEVER
// SETTLES -- no success, no error, no `blocked` -- it simply hangs past 8 s. renderRecents() sits
// behind that round trip, so #file-menu-wrap is never revealed and appReady() times out. The
// behaviour is IDENTICAL on the untouched deployed page, which is what proves it environmental.
// The File System Access API is present and the context is secure in headless, so capability is
// not the cause; the prime suspect is --virtual-time-budget fast-forwarding timers while IDB does
// real async I/O. ⛔ Removing that flag is not a fix: --dump-dom then produces no output at all,
// because the budget is what makes Chrome wait before dumping.
//
// If both pages hang here, the restore leg is unprovable in this environment and its FAIL means
// nothing on its own. If only the build hangs, that IS a regression -- start looking.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  function idbOpen(timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now(), done = false;
      var req = indexedDB.open('spt-planning-cal', 1);
      var timer = setTimeout(function () {
        if (!done) { done = true; resolve({ result: 'TIMEOUT', ms: Date.now() - t0 }); }
      }, timeoutMs);
      req.onsuccess = function () { if (!done) { done = true; clearTimeout(timer);
        resolve({ result: 'open', ms: Date.now() - t0, stores: Array.prototype.slice.call(req.result.objectStoreNames) }); } };
      req.onerror = function () { if (!done) { done = true; clearTimeout(timer);
        resolve({ result: 'error:' + (req.error && req.error.name), ms: Date.now() - t0 }); } };
      req.onblocked = function () { if (!done) { done = true; clearTimeout(timer);
        resolve({ result: 'BLOCKED', ms: Date.now() - t0 }); } };
    });
  }
  try {
    await T.sleep(2000);
    var wrap = document.getElementById('file-menu-wrap');
    out.wrapInlineDisplay = wrap ? (wrap.style.display || '(none set)') : null;
    out.idb = await idbOpen(8000);
    await T.sleep(3000);
    out.wrapAfterWait = wrap ? (wrap.style.display || '(none set)') : null;
    out.errors = (window.__ERR || []).slice(0, 5);
  } catch (e) { out.EX = String(e); }
  T.done(out);
})(); });
