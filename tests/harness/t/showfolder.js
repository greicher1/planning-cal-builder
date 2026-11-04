// showfolder -- right-click a loaded file in the file menu -> "Show in folder…" (owner, 4 Nov 2026: "I want to see
// where the file is saved").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh showfolder 240
//
// A web app cannot open Finder or learn a file's path, so the item opens the Mac's file window IN THE FOLDER that holds
// the file: showOpenFilePicker({startIn: <the recent's own handle>}). Chrome resolves the folder; the page never sees it.
// The native window cannot be driven headless, so the picker is a spy here, and the cases hold what the APP does:
//   M  the right-click opens the app's menu (not the browser's), naming the file, with one item
//   P  the item asks for the file window with startIn = THAT file's handle, Load…'s own types, one file; the menus close
//      -- and it survives a real press: the mousedown on the item closes the file menu (it is outside it), and the
//      item must still be there for the click (the reason the two menus keep separate state)
//   C  Cancel (AbortError) changes nothing and raises no dialog -- looking is the point, so Cancel is the usual way out
//   D  picking a file with unsaved work asks "Load another calendar?" AFTER the pick (never before: looking must not
//      threaten your work), and answering Cancel keeps the calendar on screen
//   L  picking a file loads it, as Load… does
//   O  the right-click on a file's x (Remove) opens the same menu, and a right-click elsewhere in the file menu does not
// ⚠️ The real window's user-activation rule (the call must be synchronous from the click) is not provable here: the
// spy records navigator.userActivation.isActive for a session that drives a real click.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed){ cases.push({id: id, title: title, pass: !!pass, observed: observed}); }
  function title(){ return (document.getElementById('show-title') || {}).value; }
  function ctxMenu(){ return document.querySelector('.fm-ctx'); }
  // Open = Mantine's own state on the button. NOT the dropdown's CSS display: headless Chrome leaves a closed keepMounted
  // dropdown display:block (measured 4 Nov 2026), so a display test read the menu as open and never clicked to open it.
  function fileMenuOpen(){ var b = document.querySelector('.file-menu-btn'); return !!b && b.getAttribute('aria-expanded') === 'true'; }
  async function openFileMenu(){
    if(!fileMenuOpen()) document.querySelector('.file-menu-btn').click();
    await T.until(function () { return fileMenuOpen() && document.querySelectorAll('#file-menu .file-menu-item[data-id]').length > 0; }, 'the file menu with a recent', 60, 100);
  }
  function recentItem(name){
    return Array.from(document.querySelectorAll('#file-menu .file-menu-item[data-id]'))
      .find(function (el) { return (el.querySelector('.fm-name') || {}).textContent === name; });
  }
  function rightClick(el){
    var r = el.getBoundingClientRect();
    var ev = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, button: 2, clientX: r.left + 20, clientY: r.top + r.height / 2});
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  }
  // A press as a pointer makes it: the file menu's click-outside listens to mousedown, so this is what closes it.
  function press(el){
    var r = el.getBoundingClientRect(), o = {bubbles: true, cancelable: true, button: 0, clientX: r.left + 10, clientY: r.top + r.height / 2};
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
  }
  function release(el){
    var r = el.getBoundingClientRect(), o = {bubbles: true, cancelable: true, button: 0, clientX: r.left + 10, clientY: r.top + r.height / 2};
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }
  function showItem(){
    var m = ctxMenu();
    return m && Array.from(m.querySelectorAll('[role="menuitem"], button')).find(function (b) { return /Show in folder/.test(b.textContent || ''); });
  }
  // The spy. mode: 'abort' -> Cancel; a handle -> that file picked.
  var calls = [], spyMode = 'abort';
  function installSpy(){
    window.showOpenFilePicker = function (opts) {
      calls.push({opts: opts, active: !!(navigator.userActivation && navigator.userActivation.isActive), fileMenuOpenAtCall: fileMenuOpen()});
      if(spyMode === 'abort') return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'));
      return Promise.resolve([spyMode]);
    };
  }
  async function useItem(){
    var it = showItem();
    if(!it) return false;
    press(it);
    await T.sleep(250);          // the file menu closes on that press; React re-renders before the click lands
    var still = showItem();
    if(still) release(still);
    return !!still;
  }
  try {
    await T.appReady();
    await T.sleep(800);

    // Two loaded files, so the recents list has a file that is NOT the open one.
    var ctlA = {};   // ctlA.handle: the handle the app holds for show-a.sptcal
    await T.openViaFakePicker('/tests/fixtures/show-a.sptcal', 'show-a.sptcal', {control: ctlA});
    await T.until(function () { return title() === 'SHOW A'; }, 'SHOW A to load', 200, 100);
    await T.sleep(800);
    await T.openViaFakePicker('/tests/fixtures/blocks.sptcal', 'blocks.sptcal');
    await T.until(function () { return title() === 'Test Show'; }, 'blocks.sptcal to load', 200, 100);
    await T.sleep(800);
    installSpy();

    // ---- M: the right-click opens the app's menu, naming the file ----------------------------------------------------
    await openFileMenu();
    var a = recentItem('show-a.sptcal');
    var prevented = a ? rightClick(a) : null;
    try { await T.until(function () { return !!showItem(); }, 'the right-click menu', 30, 100); } catch (e) {}
    var m = ctxMenu();
    add('M', 'right-clicking a loaded file opens the app’s menu (not the browser’s), naming the file, with Show in folder…',
        a && prevented === true && m && /show-a\.sptcal/.test(m.textContent || '') && !!showItem() &&
          m.querySelectorAll('[role="menuitem"]').length === 1 && !/Finder/.test(m.textContent || ''),
        {found: !!a, defaultPrevented: prevented, menuText: m ? (m.textContent || '').trim() : null,
         items: m ? m.querySelectorAll('[role="menuitem"]').length : 0});

    // ---- P: the item asks for the file window in THAT file's folder ------------------------------------------------------
    var before = calls.length, titleBefore = title();
    var survived = await useItem();
    try { await T.until(function () { return calls.length > before; }, 'the file window to be asked for', 30, 100); } catch (e) {}
    await T.sleep(500);
    var c = calls[before], o = c && c.opts;
    // The recent's own handle, by identity: the one openViaFakePicker handed the app for show-a.sptcal.
    var startName = o && o.startIn && o.startIn.name, sameHandle = !!o && o.startIn === ctlA.handle;
    var types = o && o.types ? o.types.map(function (t) { return t.description + ':' + Object.keys(t.accept).join(',') + ':' + [].concat.apply([], Object.values(t.accept)).join(','); }) : null;
    add('P', 'Show in folder… survives the press that closes the file menu, and asks for the file window in that file’s folder (startIn = its handle), with Load…’s types, one file; both menus close',
        survived && calls.length === before + 1 && sameHandle && o.multiple === false &&
          types && types.length === 2 && /\.sptcal/.test(types[0]) && /\.html/.test(types[1]) && !ctxMenu() && !fileMenuOpen(),
        {survivedPress: survived, calls: calls.length - before, startIn: startName, sameHandle: sameHandle, multiple: o ? o.multiple : null, types: types,
         ctxMenuAfter: !!ctxMenu(), fileMenuOpenAfter: fileMenuOpen()});

    // ---- C: Cancel changes nothing ---------------------------------------------------------------------------------------
    await T.sleep(400);
    add('C', 'Cancel in the file window changes nothing and raises no dialog',
        title() === titleBefore && titleBefore === 'Test Show' && !T.modalText(),
        {title: title(), modal: T.modalText()});

    // ---- D: unsaved work is asked about AFTER the pick, and Cancel keeps it -----------------------------------------------
    T.set('show-title', 'EDITED'); await T.sleep(1400);
    spyMode = ctlA.handle;   // the same file picked back, as a person would
    await openFileMenu();
    rightClick(recentItem('show-a.sptcal'));
    await T.until(function () { return !!showItem(); }, 'the right-click menu again', 30, 100);
    var modalBeforeClick = T.modalText();
    before = calls.length;
    await useItem();
    var asked = '';
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ asked = T.modalText(); break; } }
    var calledBeforeAsk = calls.length === before + 1;
    T.clickModalButton('Cancel');
    await T.sleep(800);
    add('D', 'with unsaved work, picking a file asks “Load another calendar?” after the pick, and Cancel keeps the calendar on screen',
        !modalBeforeClick && calledBeforeAsk && /Load another calendar/.test(asked) && title() === 'EDITED' && !T.modalText(),
        {modalBeforeClick: modalBeforeClick, pickerCalledFirst: calledBeforeAsk, asked: asked.slice(0, 90), titleAfter: title()});

    // ---- L: picking a file loads it ---------------------------------------------------------------------------------------
    await openFileMenu();
    rightClick(recentItem('show-a.sptcal'));
    await T.until(function () { return !!showItem(); }, 'the right-click menu a third time', 30, 100);
    await useItem();
    for(var g2 = 0; g2 < 40; g2++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    try { await T.until(function () { return title() === 'SHOW A'; }, 'SHOW A to load from the folder window', 100, 100); } catch (e) {}
    await T.sleep(600);
    add('L', 'picking a file in that window loads it, as Load… does',
        title() === 'SHOW A' && /show-a\.sptcal/.test((document.getElementById('file-menu-label') || {}).textContent || ''),
        {title: title(), label: (document.getElementById('file-menu-label') || {}).textContent});

    // ---- O: the x opens the same menu; Load… and the search box do not ----------------------------------------------------
    spyMode = 'abort';
    await openFileMenu();
    var b = recentItem('blocks.sptcal'), x = b && b.querySelector('[data-remove]');
    rightClick(x);
    var onX = false;
    try { await T.until(function () { return !!showItem(); }, 'the menu from the x', 20, 100); onX = /blocks\.sptcal/.test(ctxMenu().textContent || ''); } catch (e) {}
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0, clientX: 5, clientY: 700}));
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(500);
    await openFileMenu();
    var load = document.querySelector('#file-menu .file-menu-item[data-action="open"]');
    var loadPrevented = rightClick(load);
    await T.sleep(500);
    add('O', 'right-clicking a file’s × opens the same menu; right-clicking Load… leaves the browser its own menu',
        onX && loadPrevented === false && !showItem(),
        {menuFromX: onX, loadDefaultPrevented: loadPrevented, menuAfterLoadRightClick: !!showItem()});

    // ---- S: a shareable copy exported with the menu open does not carry it ------------------------------------------------
    // Mantine portals the menu to <body>, outside the header the copy empties, so buildSavedHtml() must strip .fm-ctx.
    // Matched as MARKUP, a class attribute naming fm-ctx: the bare name is also in the copy's own JS and CSS, which every
    // copy carries, and in THIS script, which the harness injects into the page (so never spell the attribute out here).
    await openFileMenu();
    rightClick(recentItem('blocks.sptcal'));
    await T.until(function () { return !!showItem(); }, 'the menu before sharing', 30, 100);
    await T.openSettings('prefs');
    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    await T.sleep(900);
    var openAtShare = !!ctxMenu();
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var inMarkup = (html.match(/class="[^"]*\bfm-ctx\b/g) || []).length;
    add('S', 'a shareable copy exported while the right-click menu is open does not carry the menu',
        openAtShare && html.length > 100000 && inMarkup === 0,
        {menuOpenAtShare: openAtShare, bytes: html.length, fmCtxInMarkup: inMarkup,
         at: inMarkup ? (function () { var i = html.search(/class="[^"]*\bfm-ctx\b/); return html.slice(Math.max(0, i - 160), i + 120); })() : null});
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'showfolder', cases: cases, calls: calls.map(function (c) { return {active: c.active, fileMenuOpenAtCall: c.fileMenuOpenAtCall}; }), err: (window.__ERR || []).slice(0, 12)});
})(); });
