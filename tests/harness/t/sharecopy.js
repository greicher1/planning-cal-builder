// sharecopy -- does File > "Export shareable copy..." bake transient notice strips into the file?
//
// buildSavedHtml() serialises a CLONE of the document and strips what the file does not need:
// #table-wrap, #print-root and the three body-level popover classes. It does NOT strip
// #legacy-notice or #update-notice. Both ship `hidden` in the markup and are un-hidden at runtime
// by setting el.hidden = false -- which REMOVES the attribute, and outerHTML serialises attributes.
//
// So: open a legacy .html (which raises the upgrade strip), export a shareable copy, and look at
// what came out. If the strip is in the file without its `hidden` attribute, the recipient opens
// a working calendar with a permanently stale banner about somebody else's file.
window.__alerts=[]; window.alert=function(m){ window.__alerts.push(String(m)); };
window.addEventListener('load',function(){ (async function(){
  var T=window.__T, out={};
  try{
    await T.appReady();
    await T.openViaFakePicker('/tests/fixtures/v1.0.0-saved.html','v1.0.0-saved.html');
    await T.until(function(){ return (document.getElementById('show-title')||{}).value; },
                  'the calendar to restore', 120, 100);
    // showLegacyNotice() is the LAST thing openRecentFile() does, and it sits behind
    // `await persistRecents()` -- an IndexedDB write. Give it room: a short wait here fails on a
    // slow storage layer, not on a broken app. (See the README's fresh-profile note.)
    await T.until(function(){ return !document.getElementById('legacy-notice').hidden; },
                  'the legacy-upgrade strip', 200, 100);
    out.legacyStripShowing = !document.getElementById('legacy-notice').hidden;

    // Export shareable copy lives in the file menu, same as Open.
    document.getElementById('file-menu-btn').click();
    await T.until(function(){
      return !!document.querySelector('#file-menu .file-menu-item[data-action="share"]');
    }, 'the Export-shareable-copy item', 60, 100);
    var cap = T.captureDownload();
    document.querySelector('#file-menu .file-menu-item[data-action="share"]').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var blob = cap.stop();
    var html = await blob.text();

    out.bytes = blob.size;
    // What did the clone actually carry out?
    var m = html.match(/<div id="legacy-notice"[^>]*>/);
    out.legacyTag = m ? m[0] : null;
    out.legacyHiddenInFile = m ? /\shidden(\s|>|=)/.test(m[0]) : null;
    var u = html.match(/<div id="update-notice"[^>]*>/);
    out.updateTag = u ? u[0] : null;
    out.updateHiddenInFile = u ? /\shidden(\s|>|=)/.test(u[0]) : null;
    // The strip's text is written into .ln-text by showLegacyNotice(); if it travelled, the
    // recipient sees the SENDER's filename.
    var t = html.match(/<span class="ln-text">([\s\S]{0,160})/);
    out.legacyTextInFile = t ? t[1].replace(/\s+/g,' ').trim().slice(0,120) : null;
    // Control: the things buildSavedHtml DOES strip, to prove the test is reading the right file.
    out.tableWrapEmptied = /<div[^>]*id="table-wrap"[^>]*>\s*<\/div>/.test(html);
    out.hasSavedState = /id="saved-state"/.test(html);
  }catch(e){ out.EX = e.message; out.alerts = window.__alerts; }
  T.done(out);
})(); });
