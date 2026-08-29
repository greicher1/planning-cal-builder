// restore -- open the genuine pre-.sptcal calendar in tests/fixtures/ and prove it still opens.
//
// The rule this defends is the one in CLAUDE.md: a saved calendar written by ANY past version
// must open in EVERY future version. Nothing is stubbed but the file picker, so parseCalendarText,
// applyStateSnapshot and refreshAfterRestore all run exactly as they do for a user.
//
//   ./run.sh restore 35
window.__alerts=[]; window.alert=function(m){ window.__alerts.push(String(m)); };
window.addEventListener('load',function(){ (async function(){
  var T=window.__T, out={};
  try{
    // Wait for the app to be ALIVE, not for a duration. Under --virtual-time-budget a sleep is
    // not a real wait, which is why time-paced runs came back with an empty calendar at random.
    // This test DOES need the file menu -- it opens a file through the real Open item -- so it
    // genuinely depends on renderRecents() and therefore on IndexedDB. If this times out, read
    // the README's fresh-profile note before blaming the app: the failure is environmental and
    // the grid will already have rendered fine.
    await T.appReady();
    out.health = T.appHealth();
    out.bytes = await T.openViaFakePicker('/tests/fixtures/v1.0.0-saved.html','v1.0.0-saved.html');
    // The restore is async and ends by rebuilding the grid. Wait for the grid, not for a clock.
    await T.until(function(){ return (document.getElementById('show-title')||{}).value
                                  && document.querySelectorAll('table.sheet-table tbody tr').length > 1; },
                  'restored calendar', 120, 100);
    out.alerts = window.__alerts;
    out.form = T.formSignature();
    out.sig = T.gridSignature();
    out.rows = document.querySelectorAll('table.sheet-table tbody tr').length;
    out.cells = document.querySelectorAll('table.sheet-table tbody td').length;
    out.gridWidthPt = Math.round(T.gridWidthPt()*100)/100;
    out.cols = T.colList();
    var c = T.clippedCells(); out.hClip=c.h.length; out.vClip=c.v.length;
    // The legacy-upgrade strip: opening a pre-.sptcal .html must OFFER the upgrade, never force it.
    // ⚠️ showLegacyNotice() is the LAST thing openRecentFile() does -- after applyStateSnapshot,
    // refreshAfterRestore, persistRecents and renderRecents. So the grid appearing is NOT the end
    // of the restore, and reading the strip the moment rows show up races it and reports `false`
    // on a working app. Wait for it in its own right; the failure is then a real failure.
    // It is driven by the `hidden` ATTRIBUTE, not by a style.
    try {
      await T.until(function(){ return !document.getElementById('legacy-notice').hidden; },
                    'legacy-upgrade strip', 40, 100);
      out.legacyNotice = true;
    } catch(_) { out.legacyNotice = false; }
    out.headers = [].map.call(document.querySelectorAll('table.sheet-table thead th'),
      function(th){ return (th.textContent||'').trim()+'#'+(th.colSpan||1); });
  }catch(e){ out.EX = e.message; out.alerts=window.__alerts; out.health=T.appHealth(); }
  T.done(out);
})(); });
