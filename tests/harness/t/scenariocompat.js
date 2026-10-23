// scenariocompat -- an OLDER build meets a scenarios file (SCENARIOS-PLAN.md §3.2): tests/fixtures/scenarios-3.sptcal,
// file version 2, three tabs with Toronto on screen (the scenarios leg saved it).
//
//   HARNESS_PAGE=/releases/v1.8.0.html ./run.sh scenariocompat 120   refused WHOLE with "saved by a newer version"
//   HARNESS_PAGE=/releases/v1.2.0.html ./run.sh scenariocompat 120   opens the tab on screen (Toronto); never a blank
//
// v1.3.0 to v1.8.0 check the version before applying anything, so they refuse the file and the calendar on screen
// stays. v1.1.x and v1.2.0 take any JSON object as a calendar: the current tab sits at the file's top level so that
// what they open is a real calendar, the one that was on screen, rather than a blank one they could save over every
// scenario with. This leg reports what happened; gate.sh judges it per build.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { page: location.pathname };
  try {
    await T.appReady();
    out.before = { title: document.getElementById('show-title').value, place: (document.getElementById('union-place') || {}).value || null };
    var p = T.openViaFakePicker('/tests/fixtures/scenarios-3.sptcal', 'scenarios-3.sptcal');
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(1500);
    out.modal = T.modalText().replace(/\s+/g, ' ').slice(0, 160);
    out.after = {
      title: document.getElementById('show-title').value,
      place: (document.getElementById('union-place') || {}).value || null,
      episodes: (document.getElementById('num-episodes') || {}).value || null,
    };
  } catch(e){ out.EX = String(e && e.stack || e); }
  out.health = T.appHealth();
  T.done(out);
})(); });
