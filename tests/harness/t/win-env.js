// win-env -- what the browser and OS under the app look like: platform strings, scrollbar width, device scale, the
// fonts, and which modifier-key names the UI copy shows. Measures; judges only what must hold on every OS.
// Run by xleg.mjs (WINDOWS.md); under run.sh the trusted hover is skipped and reported as such.
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var measured = {}, out = {cases: cases, measured: measured};
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
  }
  var xseq = 0;
  async function xinput(steps) {
    if (!window.__XLEG) return null;
    var id = ++xseq; window.__XREQ = {id: id, steps: steps};
    await T.until(function () { return window.__XACK === id; }, 'xleg input ' + id, 100, 100);
    return window.__XRES;
  }
  function keyNames(s) { return {cmd: (s.match(/⌘/g) || []).length, ctrl: (s.match(/\bCtrl\b/g) || []).length, opt: (s.match(/⌥/g) || []).length}; }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="post"]'); }, 'grid', 100, 100);
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;top:-999px;left:-999px;width:100px;height:100px;overflow:scroll';
    document.body.appendChild(d);
    var sb = [d.offsetWidth - d.clientWidth, d.offsetHeight - d.clientHeight]; d.remove();
    var sc = document.querySelector('#table-wrap .sheet-scroll');
    var faces = []; document.fonts.forEach(function (f) { faces.push(f.family.replace(/["']/g, '') + ' ' + f.weight + ' ' + f.status); });
    measured.platform = navigator.platform;
    measured.uaPlatform = (navigator.userAgentData && navigator.userAgentData.platform) || null;
    measured.userAgent = navigator.userAgent;
    measured.dpr = devicePixelRatio;
    measured.inner = [innerWidth, innerHeight];
    measured.scrollbar = sb;
    measured.gridScrollbar = sc ? [sc.offsetWidth - sc.clientWidth, sc.offsetHeight - sc.clientHeight] : null;
    measured.fontsStatus = document.fonts.status;
    measured.fontFaces = faces;
    measured.interSet = document.fonts.check('12px Inter');
    measured.locale = navigator.language;
    measured.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    measured.runner = window.__XLEG || null;
    add('E1', 'environment measured', true, {platform: measured.platform, uaPlatform: measured.uaPlatform, dpr: measured.dpr, scrollbar: sb}, 'reported, not judged');
    var h = T.appHealth();
    add('E2', 'the app reports its fonts loaded and ExcelJS present', h.fontsLoaded === true && h.excelJs === 'object', {fontsLoaded: h.fontsLoaded, excelJs: h.excelJs, fontsStatus: measured.fontsStatus}, 'true / object');

    // The modifier names the UI shows: every visible text and every title / aria-label, plus the Undo / Redo tooltips.
    var attrs = [];
    document.querySelectorAll('[title], [aria-label]').forEach(function (e) { attrs.push((e.getAttribute('title') || '') + ' ' + (e.getAttribute('aria-label') || '')); });
    measured.copyKeys = {visibleText: keyNames(document.body.innerText || ''), attributes: keyNames(attrs.join(' '))};
    var tips = {};
    if (window.__XLEG) {
      for (var lbl of ['Undo', 'Redo']) {
        var b = document.querySelector('button[aria-label="' + lbl + '"]');
        if (!b) { tips[lbl] = 'no button'; continue; }
        var r = b.getBoundingClientRect();
        await xinput([{move: [5, 5]}, {wait: 150}, {move: [r.left + r.width / 2, r.top + r.height / 2]}]);
        try {
          await T.until(function () { var t = document.querySelector('.mantine-Tooltip-tooltip'); return t && t.textContent.indexOf(lbl) === 0; }, lbl + ' tooltip', 30, 100);
          tips[lbl] = document.querySelector('.mantine-Tooltip-tooltip').textContent;
        } catch (e) { tips[lbl] = 'no tooltip'; }
      }
      await xinput([{move: [5, 5]}]);
    } else tips = 'needs xleg (trusted hover)';
    measured.tooltips = tips;
    measured.isMacPlatform = /^mac/i.test(measured.uaPlatform || measured.platform || '');
    add('E3', 'modifier-key names in the UI copy measured', true, {copyKeys: measured.copyKeys, tooltips: tips, macPlatform: measured.isMacPlatform}, 'reported, not judged');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  T.done(out);
})(); });
