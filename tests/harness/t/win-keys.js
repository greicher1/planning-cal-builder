// win-keys -- the app's keyboard shortcuts pressed as TRUSTED keys (CDP Input.dispatchKeyEvent, through xleg's hook),
// with the platform's own command key: Ctrl on Windows and Linux, Cmd on macOS (the app's isPlatformCommandKey). So on
// a Windows runner this is Ctrl+Z, Ctrl+Shift+Z, Ctrl+S, Ctrl+Shift+S and Ctrl+N, judged against what they do on macOS
// with Cmd. Reported only: Ctrl+Y, the command key + P, and a trusted Ctrl+click in the waterfall (on a Mac
// the app reads Ctrl+click as a right-click; on Windows it should add to the selection). Needs xleg; under run.sh it
// reports that and stops.
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.__prints = 0; window.print = function () { window.__prints++; };
window.addEventListener('load', function () { (async function () {
  var measured = {}, out = {cases: cases, measured: measured};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function q(s) { return document.querySelector(s); }
  var xseq = 0;
  async function xinput(steps) {
    var id = ++xseq; window.__XREQ = {id: id, steps: steps};
    await T.until(function () { return window.__XACK === id; }, 'xleg input ' + id, 100, 100);
    return window.__XRES;
  }
  async function settled() { var last = '', same = 0; for (var i = 0; i < 60 && same < 3; i++) { await T.sleep(100); var s = JSON.stringify(T.gridSignature()); same = (s === last) ? same + 1 : 0; last = s; } }
  function bodyFocus() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  var seen = [];
  window.addEventListener('keydown', function (e) { seen.push({key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, trusted: e.isTrusted, prevented: e.defaultPrevented}); });
  var downloads = [], realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { downloads.push(this.download); return; } return realClick.apply(this, arguments); };
  try {
    await T.appReady();
    if (!window.__XLEG) {
      add('K0', 'trusted keys need xleg.mjs (WINDOWS.md); nothing pressed', true, 'run.sh', 'xleg');
      T.done(out); return;
    }
    var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    var mac = /^mac/i.test(plat), mod = mac ? 'meta' : 'ctrl';
    measured.platform = plat; measured.commandKey = mod;
    function k(letter, shift, m) {
      var up = letter.toUpperCase();
      return {key: shift ? up : letter, code: 'Key' + up, keyCode: up.charCodeAt(0), mods: [m || mod].concat(shift ? ['shift'] : [])};
    }
    async function press(step) { seen.length = 0; bodyFocus(); await xinput([step]); await T.sleep(400); return seen.slice(); }
    T.buildFixture();
    await T.until(function () { return !!q('#table-wrap td.sheet-phase-cell[data-pkey="post"]'); }, 'grid', 100, 100);
    await settled();
    await T.sleep(900);
    T.set('weeks-post', '17'); bodyFocus();
    await T.sleep(900);   // an edit becomes an undo step after 500 ms
    var w = function () { return q('#weeks-post').value; };

    var ev = await press(k('z'));
    await T.until(function () { return w() === '16'; }, 'undo', 30, 100).catch(function () {});
    add('K1', 'command key + Z undoes (Post weeks back to 16) and is prevented', w() === '16' && ev.length > 0 && ev[0].prevented && ev[0].trusted, {weeks: w(), events: ev}, '16, prevented, trusted');
    ev = await press(k('z', true));
    await T.until(function () { return w() === '17'; }, 'redo', 30, 100).catch(function () {});
    add('K2', 'command key + Shift + Z redoes (17) and is prevented', w() === '17' && ev.length > 0 && ev[0].prevented, {weeks: w(), events: ev}, '17, prevented');

    await T.sleep(900);
    ev = await press(k('n'));
    await T.until(function () { return /new blank calendar/i.test(T.modalText()); }, 'new dialog', 30, 100).catch(function () {});
    var mt = T.modalText();
    add('K5', 'command key + N on unsaved work asks to start a new calendar, prevented (the page wins over the browser\'s New Window)', /Start a new blank calendar/.test(mt) && ev.length > 0 && ev[0].prevented, {modal: mt, events: ev}, 'the New calendar dialog');
    if (mt) { try { T.clickModalButton('Cancel'); } catch (e) { /* reported by K5 */ } await T.sleep(400); }

    var rec = T.fakeSavePicker();
    try {
      ev = await press(k('s'));
      await T.until(function () { return rec.calls.length >= 1; }, 'save picker', 50, 100).catch(function () {});
      await T.until(function () { return rec.files.length >= 1; }, 'save write', 50, 100).catch(function () {});
      var c1 = rec.calls.map(function (c) { return c.suggestedName; });
      add('K3', 'command key + S saves: one picker call for a .sptcal, prevented', c1.length === 1 && /\.sptcal$/.test(c1[0]) && ev.length > 0 && ev[0].prevented, {calls: c1, events: ev}, 'one call, <title> <date>.sptcal');
      await T.sleep(900);
      ev = await press(k('s', true));
      await T.until(function () { return rec.calls.length >= 2; }, 'save as picker', 50, 100).catch(function () {});
      add('K4', 'command key + Shift + S is Save As: a second picker call, prevented', rec.calls.length === 2 && ev.length > 0 && ev[0].prevented, {calls: rec.calls.length, events: ev}, '2 calls');
      await T.until(function () { return rec.files.length >= 2; }, 'save as write', 50, 100).catch(function () {});
    } finally { rec.restore(); }


    // Reported only.
    var rep = {};
    var before = w();
    ev = await press(k('y', false, 'ctrl'));
    rep.ctrlY = {weeksBefore: before, weeksAfter: w(), events: ev};
    await T.sleep(900);
    var dl0 = downloads.length;
    ev = await press(k('p'));
    await T.sleep(1500);
    rep.cmdP = {events: ev, prints: window.__prints, downloads: downloads.slice(dl0), modal: T.modalText()};
    if (T.modalText()) { try { T.clickModalButton('Cancel'); } catch (e) { /* */ } }
    T.closePops(); await settled();
    // Trusted Ctrl+click on Post's cells: a plain click on the 4th, Ctrl+click the 6th and 8th.
    var posts = Array.prototype.slice.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="post"]')).sort(function (a, b) { return a.dataset.week < b.dataset.week ? -1 : 1; });
    async function tclick(el, mods) { el.scrollIntoView({block: 'center', inline: 'nearest'}); await T.sleep(100); var r = el.getBoundingClientRect(); await xinput([{click: [r.left + r.width / 2, r.top + r.height / 2], mods: mods || []}]); await T.sleep(300); }
    await tclick(posts[3]);
    await tclick(posts[5], ['ctrl']);
    var s2 = document.querySelectorAll('#table-wrap .grid-sel-cell').length, menu1 = !!q('.day-menu');
    await tclick(posts[7], ['ctrl']);
    rep.ctrlClick = {afterFirstCtrl: s2, afterSecondCtrl: document.querySelectorAll('#table-wrap .grid-sel-cell').length, dayMenu: menu1 || !!q('.day-menu')};
    measured.reported = rep;
    add('R1', 'Ctrl+Y, command key + P and trusted Ctrl+click measured', true, rep, 'reported, not judged (Windows: Ctrl+click should give 2 then 3 boxes and no menu)');
    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  HTMLAnchorElement.prototype.click = realClick;
  T.done(out);
})(); });
