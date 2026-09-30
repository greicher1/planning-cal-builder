// sharecopy2 -- a shareable copy opens with the chrome rendered ONCE, and carries none of the
// sender's preferences or recents (FIX-PLAN.md 1.6; AUDIT-REPORT H-2, L-21).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh sharecopy2 90
//
// The copy is captured from the running build, then written into an <iframe> the way a recipient's
// double-click opens it (its own document, its own React boot). Before the fix the iframe showed two
// of every control; after it, one.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  function set(id, v){ var e = document.getElementById(id); if(!e) return; Object.getOwnPropertyDescriptor((e.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement).prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); }
  try {
    await T.appReady();
    await T.sleep(800);
    // A real calendar, and a non-default preference (Grid Lines dashed) that must NOT travel.
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    set('pref-gridlines', 'dashed');
    await T.sleep(700);

    // The share control is #share-copy-btn in the Settings tab (it left the file menu 29 Aug 2026).
    // The delegated handler has a 600ms re-click guard, so leave a gap after the tab switch or the
    // share click is swallowed.
    var settings = null; document.querySelectorAll('.side-tab-btn').forEach(function (b) { if(b.dataset.tab === 'settings') settings = b; });
    if(settings){ settings.click(); }
    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    await T.sleep(900);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    out.bytes = html.length;

    // The React hosts must serialise EMPTY: that is what stops the doubled chrome, and it is also
    // what stops the sender's rendered file-menu / recents markup and preference options travelling.
    // ⚠️ Grepping for `fm-list` or `value="dashed"` in the whole file is wrong -- both appear inside
    // the app's own JS bundle, which every self-contained copy must carry. Assert on the SKELETON.
    out.headerEmpty = /<header class="app-header"><\/header>/.test(html);
    out.sidebarEmpty = /<div id="sidebar-static"><\/div>/.test(html);
    out.toolbarEmpty = /<div class="view-toggle-row"><\/div>/.test(html);
    out.reactRootEmpty = /<div id="react-root"><\/div>/.test(html);
    // "Reset hiatus bands" is portalled into its own host in the static hiatus card (owner ruling
    // 5, 30 Sep 2026), so that host must serialise empty too.
    out.hiatusResetHostEmpty = /<div id="hiatus-reset-host"><\/div>/.test(html);
    // No RENDERED <select> carries a selected <option> in the copy: with the hosts emptied, every
    // value restores from the saved-state JSON instead, so the sender's preference options cannot
    // travel as markup. ⚠️ Require a <select> before the option, or the check matches the app's own
    // JS bundle (which every self-contained copy carries) rather than rendered markup.
    // A RENDERED select is `<select ... id="…">` with its options right after it. Anchoring on the
    // id keeps the match inside real markup: the JS bundle never emits that exact opening tag.
    var selRe = /<select[^>]*\bid="[^"]*"[^>]*>[\s\S]{0,600}?<option[^>]*\bselected\b/g, sm, n = 0;
    while((sm = selRe.exec(html))) n++;
    out.renderedSelectsWithSelected = n;

    // Open it the way a recipient does: its own document in an iframe, its own React boot.
    var ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;left:-9999px;width:1024px;height:800px';
    document.body.appendChild(ifr);
    ifr.srcdoc = html;
    await new Promise(function (r) { ifr.onload = r; setTimeout(r, 4000); });
    await T.sleep(3500);   // let its React mount
    var idoc = ifr.contentDocument;
    function countIn(sel){ return idoc ? idoc.querySelectorAll(sel).length : -1; }
    out.copy = {
      showTitleIds: countIn('[id="show-title"]'),
      exportBtns: countIn('[id="export-btn"]'),
      undoBtns: countIn('[id="undo-btn"]'),
      viewMonthBtns: countIn('[id="view-month-btn"]'),
      headers: countIn('header.app-header'),
      sidebarStatics: countIn('#sidebar-static'),
      fileMenuBtns: countIn('.file-menu-btn'),
      hiatusResetBtns: countIn('[id="hiatus-reset-btn"]'),
      tbHdrModeBtns: countIn('[id="tb-hdr-mode-btn"]'),
      tbNotesResetBtns: countIn('[id="tb-notes-reset-btn"]'),
      docWidth: idoc ? idoc.documentElement.scrollWidth : -1,
      titleRestored: idoc ? (idoc.getElementById('show-title') || {}).value : null
    };
    var c = out.copy;
    out.pass = c.showTitleIds === 1 && c.exportBtns === 1 && c.undoBtns === 1 && c.headers === 1 &&
               c.docWidth > 0 && c.docWidth <= 1024 && c.titleRestored === 'Test Show' &&
               out.headerEmpty && out.sidebarEmpty && out.toolbarEmpty && out.reactRootEmpty &&
               out.hiatusResetHostEmpty && c.hiatusResetBtns === 1 && c.tbHdrModeBtns === 1 && c.tbNotesResetBtns === 1 &&
               out.renderedSelectsWithSelected === 0;
    ifr.remove();
  } catch (e) { out.EX = String(e && e.stack || e); }
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
