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

    // The share control is #share-copy-btn, in the Settings window's Preferences tab since owner ruling 12
    // (20 Oct 2026; its Calendar tab until the owner merged that into Preferences the same night; the sidebar's Settings tab before that, and the file menu before 29 Aug 2026). The
    // delegated handler has a 600ms re-click guard, so leave a gap after opening it or the share click
    // is swallowed. ⭐ The copy is exported WITH THE WINDOW OPEN on purpose: its open state reaches
    // outside its host (inert, .settings-open), and buildSavedHtml() must strip all of it.
    await T.openSettings('prefs');
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
    // The Settings window's host (owner ruling 12, 20 Oct 2026), exported here with the window OPEN.
    // Its open state reaches outside the host -- `inert` on the sidebar it covers, .settings-open on
    // the sidebar, aria-expanded on the button -- and none of it may travel, or the copy boots with a
    // sidebar nothing can click. ⚠️ `inert=""` is how the attribute serialises; the bundle never
    // spells it that way, so this matches markup only.
    out.settingsHostEmpty = /<div id="settings-host"><\/div>/.test(html);
    out.inertInMarkup = (html.match(/<[a-z]+\b[^>]*\binert=""/g) || []).length;
    out.settingsOpenInMarkup = /<aside class="[^"]*\bsettings-open\b/.test(html);
    out.expandedInMarkup = /class="side-settings-btn"[^>]*aria-expanded="true"/.test(html);
    out.windowWasOpen = document.getElementById('settings-window').classList.contains('is-open');
    // No RENDERED <select> carries a selected <option> in the copy: with the hosts emptied, every
    // value restores from the saved-state JSON instead, so the sender's preference options cannot
    // travel as markup. ⚠️ Require a <select> before the option, or the check matches the app's own
    // JS bundle (which every self-contained copy carries) rather than rendered markup.
    // A RENDERED select is `<select ... id="…">` with its options right after it. Anchoring on the
    // id keeps the match inside real markup: the JS bundle never emits that exact opening tag.
    // ⛔ NARROWED 15 Oct 2026 (CUSTOM-PHASE-UNITS-PLAN step 6). This counted EVERY rendered select with a
    // selected option, which held only while no engine-built <select> lived outside the React hosts.
    // The five built-in Length selects (unit-<key>) do, and reflectFieldsToAttributes() bakes every
    // CALENDAR field into the copy's markup BY DESIGN (it skips only .prefs-card). Their values are in
    // the copy's own saved state and restore to the same thing. The guarantee this check exists for is
    // unchanged: a select that is NOT calendar data -- a preference -- must never carry `selected` in
    // the copy. So a select counts only when its id is NOT in the copy's own fields.byId, which no
    // preference ever is (collectFieldValues() skips .prefs-card). A copy whose saved state cannot be
    // read counts every select, so the check fails closed.
    var byId = null, ssRe = /<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/g, ss;
    while(!byId && (ss = ssRe.exec(html))){
      try { var st = JSON.parse(ss[1]); if(st && st.fields && st.fields.byId) byId = st.fields.byId; } catch (e) {}
    }
    var selRe = /<select[^>]*\bid="([^"]*)"[^>]*>[\s\S]{0,600}?<option[^>]*\bselected\b/g, sm, n = 0, calSel = [];
    while((sm = selRe.exec(html))){
      if(byId && Object.prototype.hasOwnProperty.call(byId, sm[1])) calSel.push(sm[1]); else n++;
    }
    out.renderedSelectsWithSelected = n;           // non-calendar selects: must be 0
    out.calendarSelectsWithSelected = calSel;      // calendar fields, baked by design (information)
    out.savedStateRead = !!byId;

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
      settingsWindows: countIn('#settings-window'),
      unionPlaces: countIn('[id="union-place"]'),
      // ⚠️ NOT the copy's [inert] / .settings-open at runtime: the harness injects THIS script into the page,
      // the copy serialises it, and inside the iframe it runs again -- and opens the window itself (seen
      // 20 Oct 2026). The markup checks above are the guarantee: what the copy BOOTS from is clean.
      docWidth: idoc ? idoc.documentElement.scrollWidth : -1,
      titleRestored: idoc ? (idoc.getElementById('show-title') || {}).value : null
    };
    var c = out.copy;
    out.pass = c.showTitleIds === 1 && c.exportBtns === 1 && c.undoBtns === 1 && c.headers === 1 &&
               c.docWidth > 0 && c.docWidth <= 1024 && c.titleRestored === 'Test Show' &&
               out.headerEmpty && out.sidebarEmpty && out.toolbarEmpty && out.reactRootEmpty &&
               out.hiatusResetHostEmpty && c.hiatusResetBtns === 1 && c.tbHdrModeBtns === 1 && c.tbNotesResetBtns === 1 &&
               out.renderedSelectsWithSelected === 0 &&
               out.windowWasOpen && out.settingsHostEmpty && out.inertInMarkup === 0 && !out.settingsOpenInMarkup &&
               !out.expandedInMarkup && c.settingsWindows === 1 && c.unionPlaces === 1;
    ifr.remove();
  } catch (e) { out.EX = String(e && e.stack || e); }
  out.err = (window.__ERR || []).slice(0, 10);
  T.done(out);
})(); });
