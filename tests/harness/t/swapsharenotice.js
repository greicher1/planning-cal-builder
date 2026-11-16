// swapsharenotice -- a shareable copy exported while the purple column-order strip (#colswap-notice) is up does not
// carry it (review slip on audit 2.12). buildSavedHtml re-hid the other notice strips in its clone, but not this one,
// so the copy's markup shipped it visible, naming the sender's phases and weeks, before its own engine had judged
// anything.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colswap-simpost-refuse ./run.sh swapsharenotice 200
//
// colswap-simpost-refuse stores a Production<->Post swap the gate refuses, so the strip is up when the page settles
// (the colswapgate leg's fixture).
//   S1  the strip is up in the app before the export
//   S2  the copy's markup has the strip HIDDEN                                                         (red before)
//   S3  ...and its text EMPTY                                                                          (red before)
//   S4  opened, the copy raises the strip itself: its own state refuses the same swap, so its own engine says so
//   S5  no console errors, no native alert
//
// ⚠️ The copy carries this script (the harness injects it into the page it serialises), so inside the iframe it would
// run again: it stops at once when it is not the top window.
//
// ⚠️ Run against the BUILD (HARNESS_PAGE=/dist/index.html).
(function () {
if (window !== window.top) return;
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function C(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  try {
    await T.appReady();
    await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 1; }, 'the grid', 200, 100);
    await T.sleep(1200);
    var strip = document.getElementById('colswap-notice');
    var liveText = strip ? ((strip.querySelector('.ln-text') || {}).textContent || '') : '';
    C('S1', 'the purple strip is up in the app before the export', !!strip && !strip.hidden && liveText.length > 0,
      {shown: !!strip && !strip.hidden, text: liveText}, 'shown, with text');

    await T.openSettings('prefs');
    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    await T.sleep(900);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var m = /<div id="colswap-notice"([^>]*)>([\s\S]*?)<\/div>/.exec(html);
    var attrs = m ? m[1] : null;
    var inner = m ? ((/<span class="ln-text">([\s\S]*?)<\/span>/.exec(m[2]) || [])[1]) : null;
    C('S2', 'the copy\'s markup has the strip hidden', !!m && /\bhidden\b/.test(attrs), {attrs: attrs}, 'hidden attribute');
    C('S3', 'the copy\'s markup has the strip\'s text empty', inner === '', {text: inner}, '""');

    var ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;left:-9999px;width:1280px;height:900px';
    document.body.appendChild(ifr);
    ifr.srcdoc = html;
    await new Promise(function (r) { ifr.onload = r; setTimeout(r, 5000); });
    var idoc = ifr.contentDocument, istrip = null;
    try {
      await T.until(function () {
        istrip = idoc && idoc.getElementById('colswap-notice');
        return !!(istrip && !istrip.hidden);
      }, 'the copy to raise its strip', 100, 100);
    } catch (e) {}
    var iText = istrip ? ((istrip.querySelector('.ln-text') || {}).textContent || '') : '';
    C('S4', 'opened, the copy raises the strip itself from its own state', !!istrip && !istrip.hidden && iText === liveText,
      {shown: !!istrip && !istrip.hidden, text: iText}, 'shown, with the same text its engine derives');
    ifr.remove();
    C('S5', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
      {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
})();
