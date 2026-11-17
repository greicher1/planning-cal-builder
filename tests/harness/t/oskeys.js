// oskeys -- the keys the app NAMES, on the computer it is on (November 2026 audit, item W.2: WIN-3 and WIN-5).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays HARNESS_QUERY=os=win   ./run.sh oskeys 240
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays HARNESS_QUERY=os=mac   ./run.sh oskeys 240
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays HARNESS_QUERY=os=linux ./run.sh oskeys 240
//
// WIN-3: Windows Chrome showed "Undo (⌘Z)" and "Redo (⌘⇧Z)", the Ripple Hiatus hint said ⌘Z, and Help named every
// shortcut with ⌘ under one line telling Windows users to translate. Now one helper (src/chrome/keys.js) reads the
// platform once and writes Ctrl+Z / Ctrl+Shift+Z / Ctrl-click on Windows and Linux, and ⌘Z / ⇧⌘Z / ⌘-click on a Mac.
//
// THE PLATFORM IS FAKED BEFORE THE APP BOOTS. This script is injected at </body>, ahead of the app's deferred module,
// so its top level runs first: navigator.platform and navigator.userAgentData are replaced there for the whole page
// (`os=` in the query; `mac` is MacIntel / macOS, so the run means the same on any host). The words are read once, at
// boot, so a fake installed later (filekeys' asWindows) would not reach them: that is the design, and why this leg
// runs once per platform rather than switching mid-page.
//
// The fixture is tests/fixtures/halfdays.sptcal (synthetic; wfmenu's): a note on the week of 1/5/26, nothing on 7/13/26.
//
// CASES
//   P0  the page reports the platform asked for
//   H1  Help's VISIBLE text names this platform's keys: on Windows and Linux Ctrl+S, Ctrl+Shift+S, Ctrl+Shift+E, Ctrl+P,
//       Ctrl+O, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Ctrl+C / X / V and Ctrl-click, and no ⌘ ⇧ ⌥ glyph at all; on a Mac ⌘N, ⌘O,
//       ⌘S, ⇧⌘S, ⇧⌘E, ⌘P, ⌘Z, ⇧⌘Z, ⌘Y, ⌘C / X / V and ⌘-click, and no "Ctrl" (the old "⌘S or Ctrl+S" pairs are gone)
//   H2  New (WIN-2): a Mac is offered ⌘N; Windows and Linux are offered no key for New (the browser keeps Ctrl+N) and
//       are pointed at New in the File menu; the paragraph about the Mac menu bar shows on a Mac only
//   T1  the Undo / Redo hover hints: "Undo (Ctrl+Z)" / "Redo (Ctrl+Shift+Z)", or "Undo (⌘Z)" / "Redo (⇧⌘Z)" on a Mac
//       (Apple's order, as Help writes it). Read from the Tooltip's own label prop: a headless run never draws a Mantine
//       tooltip (no animation frames), so the prop React was handed is the evidence
//   T2  Settings › Preferences › Hiatus, the Ripple Hiatus hint: "Ctrl+Z takes back…" or "⌘Z takes back…"
//   N1  Paste notes (month view): its foot says "Ctrl+Enter to add", or "⌘-Enter to add" on a Mac
//   N2  the waterfall's right-click Paste with the clipboard refused says "press Ctrl+V instead", or "press ⌘V instead"
//   O1  WIN-5: Load… offers ONE first type that takes both .sptcal and .html, so Windows' file dialog (one filter at a
//       time, the first applied) lists an older .html calendar without a change of "Files of type"; the two specific
//       types follow it
//   L1  WIN-5: a 420-character show title gives a Save As name and a month PDF name that fit Windows (each under 255
//       characters), the title cut at a word, the date and extension kept. (Excel and the waterfall PDF name their files
//       inside frozen code: recorded in out.frozenNames, not judged here)
//   E0  no console errors
window.__T.memoryIDB();
var OSQ = (/[?&]os=(\w+)/.exec(location.search) || [])[1] || 'win';
var OSFAKE = {win: {platform: 'Win32', uad: 'Windows'}, linux: {platform: 'Linux x86_64', uad: 'Linux'}, mac: {platform: 'MacIntel', uad: 'macOS'}}[OSQ];
(function () {
  var uad = navigator.userAgentData;
  Object.defineProperty(navigator, 'platform', {value: OSFAKE.platform, configurable: true});
  Object.defineProperty(navigator, 'userAgentData', {value: {platform: OSFAKE.uad, brands: uad ? uad.brands : [], mobile: false}, configurable: true});
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'oskeys', os: OSQ};
  var MAC = OSQ === 'mac';
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  async function settle(){ await T.sleep(450); }
  function bodyFocus(){ var a = document.activeElement; if(a && a !== document.body && a.blur) a.blur(); }
  // What a person can read: the text with every [hidden] part taken out.
  function shown(el){
    if(!el || el.hidden) return '';
    var c = el.cloneNode(true);
    qa('[hidden]', c).forEach(function (h) { h.remove(); });
    return txt(c);
  }
  // React hands a component its props; the fiber on a DOM node leads up to them. Test-only reading.
  function fiberOf(el){ var k = el && Object.keys(el).find(function (k) { return k.indexOf('__reactFiber$') === 0; }); return k ? el[k] : null; }
  function propsUp(el, test){ for(var f = fiberOf(el); f; f = f.return){ var p = f.memoizedProps; if(p && typeof p === 'object' && test(p)) return p; } return null; }
  function flat(c){
    if(c == null || typeof c === 'boolean') return '';
    if(Array.isArray(c)) return c.map(flat).join('');
    if(typeof c === 'string' || typeof c === 'number') return String(c);
    return c.props ? flat(c.props.children) : '';
  }

  // ---- the waterfall's right-click (wfmenu's helpers, cut down) ----
  var lastScroll = 0;
  window.addEventListener('scroll', function () { lastScroll = performance.now(); }, true);
  async function quiet(){ for(var i = 0; i < 60; i++){ if(performance.now() - lastScroll >= 300) return; await T.sleep(60); } }
  async function bring(el){
    var box = $('sheet-scroll-container'), b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    var head = q('#table-wrap thead th'), top = Math.max(b.top, head ? head.getBoundingClientRect().bottom : b.top);
    if(!(r.top >= top + 30 && r.bottom <= b.bottom - 40 && r.left >= b.left + 10 && r.right <= b.right - 30)){
      box.scrollTop += (r.top + r.height / 2) - (b.top + b.height / 2);
      box.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2);
      lastScroll = performance.now();
    }
    await quiet();
  }
  function noteTd(wk){ return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function menuEl(){ return q('.day-menu'); }
  async function rc(el){
    await bring(el);
    var p = mid(el), hit = document.elementFromPoint(p.x, p.y);
    (hit || document.body).dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 2, buttons: 2}));
    await T.sleep(60);
  }
  async function choose(id){ var b = menuEl() && q('[data-item="' + id + '"]', menuEl()); if(!b) throw new Error('no item ' + id); b.click(); await settle(); }
  var clipMode = 'ok';
  try {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
      writeText: function () { return clipMode === 'ok' ? Promise.resolve() : Promise.reject(new Error('NotAllowedError')); },
      readText: function () { return clipMode === 'ok' ? Promise.resolve('') : Promise.reject(new Error('NotAllowedError')); },
    }});
  } catch (e) { out.clipStubError = String(e); }

  try {
    await T.appReady();
    await T.sleep(1500);

    // ---- P0 ----
    var plat = {platform: navigator.platform, uad: navigator.userAgentData && navigator.userAgentData.platform};
    add('P0', 'the page reports the platform asked for (' + OSQ + ')', plat.platform === OSFAKE.platform && plat.uad === OSFAKE.uad, plat, OSFAKE);

    // ---- H1, H2: Help ----
    var help = shown($('help-body'));
    var keysSec = (function () {
      var h = qa('#help-body h3').filter(function (x) { return /Keyboard shortcuts/.test(x.textContent); })[0], s = '';
      for(var n = h && h.nextElementSibling; n && n.tagName !== 'H3'; n = n.nextElementSibling) s += ' ' + shown(n);
      return s;
    })();
    var want = MAC ? ['⌘N', '⌘O', '⌘S', '⇧⌘S', '⇧⌘E', '⌘P', '⌘Z', '⇧⌘Z', '⌘Y', '⌘C', '⌘X', '⌘V', '⌘-click']
                   : ['Ctrl+O', 'Ctrl+S', 'Ctrl+Shift+S', 'Ctrl+Shift+E', 'Ctrl+P', 'Ctrl+Z', 'Ctrl+Shift+Z', 'Ctrl+Y', 'Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Ctrl-click'];
    var missing = want.filter(function (k) { return help.indexOf(k) < 0; });
    var foreign = MAC ? (help.match(/.{0,30}\bCtrl\b.{0,30}/g) || []) : (help.match(/.{0,30}[⌘⇧⌥⌃].{0,30}/g) || []);
    add('H1', 'Help names this platform\'s keys and no other platform\'s', missing.length === 0 && foreign.length === 0,
      {missing: missing, foreign: foreign.slice(0, 6)}, MAC ? 'every ⌘ key, no Ctrl' : 'every Ctrl key, no ⌘ ⇧ ⌥ ⌃');
    var h2 = {
      newKey: MAC ? /⌘N — New\b/.test(keysSec) : !/Ctrl\+N|⌘N/.test(keysSec),
      fileMenu: MAC ? true : /New[^.]*File menu/.test(keysSec),
      macMenuBar: /Mac menu bar/.test(help) === MAC,
      windowsAside: !/On Windows, use/.test(help),
    };
    add('H2', MAC ? 'New is ⌘N on a Mac, and the Mac menu bar paragraph shows' : 'no key is offered for New (Chrome keeps Ctrl+N), New in the File menu is; no Mac menu bar paragraph',
      h2.newKey && h2.fileMenu && h2.macMenuBar && h2.windowsAside, {checks: h2, keys: keysSec.slice(0, 700)}, 'all true');

    // ---- T1: the Undo / Redo hover hints ----
    function tipOf(id){ var p = propsUp($(id), function (p) { return typeof p.label === 'string' && 'withArrow' in p; }); return p ? p.label : null; }
    var t1 = {undo: tipOf('undo-btn'), redo: tipOf('redo-btn')};
    var t1want = MAC ? {undo: 'Undo (⌘Z)', redo: 'Redo (⇧⌘Z)'} : {undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Shift+Z)'};
    add('T1', 'the Undo and Redo hover hints name this platform\'s keys', t1.undo === t1want.undo && t1.redo === t1want.redo, t1, t1want);

    // ---- T2: the Ripple Hiatus hint ----
    await T.openSettings('prefs');
    var rip = q('.info-hint[aria-label="About Ripple Hiatus Periods"]');
    var ripP = rip && propsUp(rip, function (p) { return p.label === 'Ripple Hiatus Periods' && 'children' in p; });
    var ripText = ripP ? flat(ripP.children).replace(/\s+/g, ' ').trim() : null;
    var t2want = (MAC ? '⌘Z' : 'Ctrl+Z') + ' takes back your hiatus change';
    add('T2', 'the Ripple Hiatus hint names this platform\'s undo key', !!ripText && ripText.indexOf(t2want) >= 0 && !(MAC ? /Ctrl/ : /[⌘⇧]/).test(ripText),
      ripText, t2want);

    // ---- N1: Paste notes ----
    await T.closeSettings();
    $('view-month-btn').click(); await settle();
    await T.openSettings('prefs');
    $('paste-notes-btn').click(); await T.sleep(300);
    var foot = txt(q('.paste-notes-keys'));
    var n1want = 'Month view only · ' + (MAC ? '⌘-Enter' : 'Ctrl+Enter') + ' to add · Esc to cancel';
    add('N1', 'Paste notes says the add key for this platform', foot === n1want, foot, n1want);
    var cancel = q('.paste-notes-cancel'); if(cancel) cancel.click();
    await T.closeSettings();

    // ---- N2: the paste key, when the clipboard is refused ----
    $('view-sheet-btn').click(); await settle(); bodyFocus();
    await T.until(function () { return !!noteTd('2026-07-13'); }, 'the halfdays waterfall', 100, 100);
    clipMode = 'refuse';
    await rc(noteTd('2026-07-13'));
    await choose('paste');
    await T.sleep(200);
    var chip = txt(q('#table-wrap .text-sel-chip'));
    clipMode = 'ok';
    var n2want = 'Paste needs clipboard access: press ' + (MAC ? '⌘V' : 'Ctrl+V') + ' instead';
    add('N2', 'a refused paste names this platform\'s paste key', chip === n2want, chip, n2want);
    bodyFocus();

    // ---- O1: Load…'s file types ----
    var pick = {calls: []};
    var realOpen = window.showOpenFilePicker;
    window.showOpenFilePicker = async function (o) { pick.calls.push(o || {}); throw new DOMException('test: cancelled', 'AbortError'); };
    await T.until(function () { return !!q('#file-menu .file-menu-item[data-action="open"]'); }, 'Load…', 60, 100);
    q('#file-menu .file-menu-item[data-action="open"]').click();
    await T.sleep(600);
    var askAgain = T.modalText && T.modalText();
    window.showOpenFilePicker = realOpen;
    var types = pick.calls.length ? (pick.calls[0].types || []) : [];
    var exts = function (t) { var a = []; Object.keys((t && t.accept) || {}).forEach(function (m) { a = a.concat(t.accept[m]); }); return a.sort(); };
    var o1 = {calls: pick.calls.length, modal: askAgain || '', types: types.map(function (t) { return {description: t.description, ext: exts(t)}; })};
    add('O1', 'Load… offers .sptcal and .html in ONE first type, then each on its own', pick.calls.length === 1 && types.length === 3
      && JSON.stringify(exts(types[0])) === JSON.stringify(['.html', '.sptcal']) && JSON.stringify(exts(types[1])) === '[".sptcal"]' && JSON.stringify(exts(types[2])) === '[".html"]',
      o1, '3 types: [.html .sptcal], [.sptcal], [.html]');

    // ---- L1: a very long show title ----
    var longTitle = 'The Extremely Long Working Title Of A Synthetic Test Show That Somebody Typed Into The Box Without Stopping To Think About File Names At All';
    while(longTitle.length < 420) longTitle += ' And Then Some More';
    longTitle = longTitle.slice(0, 420);
    T.set('show-title', longTitle);
    await settle();
    var rec = T.fakeSavePicker();
    rec.fail.push('AbortError');
    $('save-as-btn').click();
    await T.until(function () { return rec.calls.length >= 1; }, 'Save As\'s picker', 60, 100).catch(function () {});
    var saveName = rec.calls[0] ? rec.calls[0].suggestedName : null;
    $('view-month-btn').click(); await settle();
    rec.fail.push('AbortError');
    $('export-btn').click();
    await T.until(function () { return rec.calls.length >= 2; }, 'the month PDF\'s Save dialog', 120, 100).catch(function () {});
    var pdfName = rec.calls[1] ? rec.calls[1].suggestedName : null;
    rec.restore();
    await T.sleep(400);
    $('view-sheet-btn').click(); await settle();
    var fits = function (n) { return typeof n === 'string' && n.length <= 200 && n.indexOf('The Extremely Long') === 0 && !/[ .]\./.test(n); };
    add('L1', 'a 420-character title: the Save As name and the month PDF name fit Windows (200 characters or fewer here), the date and extension kept',
      fits(saveName) && /\d{4}-\d\d-\d\d\.sptcal$/.test(saveName) && fits(pdfName) && /Month Calendar.*\.pdf$/.test(pdfName),
      {save: saveName && saveName.length, pdf: pdfName && pdfName.length, saveName: saveName, pdfName: pdfName}, '<= 200 each');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  var errs = (T.appHealth().errors || []);
  add('E0', 'no console errors', errs.length === 0, errs.slice(0, 5), []);
  out.health = T.appHealth();
  out.cases = cases;
  T.done(out);
})(); });
