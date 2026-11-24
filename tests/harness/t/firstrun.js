// firstrun -- the first five minutes (audit 2026-11, batch 2 item 2.13: AUD2-030, -031, -032, -033 and WIN-2).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh firstrun 240
//
// What a coordinator meets on a cold start, before any calendar is on screen:
//
//   R1  AUD2-030: an Untitled, empty calendar shows the recent calendars in the preview panel, beside
//       #table-wrap (its sibling, never inside it), with a Load... button
//   R2  nothing in that list carries an id (collectFieldValues sweeps input/select/textarea[id]; no id at all is
//       the rule for new controls)
//   P1  AUD2-031: Production's card names what Show info is missing (all three, before any is filled), never
//       "Enter a shooting day count" (no such box exists)
//   P2  ...and with only the Season blank it says to pick a Season in Show info
//   P3  the Season rule is kept: with no Season, Production is not scheduled (the preview stays empty)
//   R3  once a Season is picked Production schedules, the calendar is no longer empty, and the list goes away
//   M3  WIN-2: New is the header's button (the File menu has NO New since 18 Nov 2026, owner); with unsaved work it
//       asks New's own question, and "Start new" leaves a blank calendar -- whereupon the list comes back (R4)
//   C1  a shareable copy built while the list shows carries the host empty and hidden: no sender's file names
//   M1  AUD2-033: Esc closes the File menu (focus on the menu's button, as after a click)
//   M1b ...and with focus nowhere in particular
//   M2  the File menu does not stay open behind one of the app's dialogs (Cmd+P on an empty calendar answers
//       "Nothing to export")
//   K1  Cmd+O is Load: prevented, and it opens the file picker
//   K2  ...with unsaved work it asks "Load another calendar?" first, and Cancel opens no picker
//   K3  ...not while one of the app's dialogs is open; a held key's repeats do nothing
//   K4  Ctrl+O is left alone on a Mac (text navigation in the note editors); Windows: Ctrl+O is taken
//   Y1  Cmd+Y redoes (after Cmd+Z), as Shift+Cmd+Z does
//   Y2  Windows: Ctrl+Y redoes
//   Y3  inside a text box Cmd+Y is the box's own (not prevented)
//   R5  a click on a recent in the list loads that calendar (the file menu then names it) and the list goes away
//   (H1, AUD2-032 / WIN-2: Help is up to date, moved into the help leg (tests/harness/t/help.js) on 23 Nov 2026: Help is a window now, and the one-page Guide this text check read is gone; the keys moved to oskeys)
//   E0  0 console errors
//
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots, and is seeded with two recent files:
// real IndexedDB never settles in headless Chrome, and the list must be in place when the engine reads it.
window.__T.memoryIDB();
(function seed(){
  var x = new XMLHttpRequest();                      // synchronous: this must land before boot
  x.open('GET', '/tests/fixtures/show-a.sptcal', false); x.send();
  var text = x.responseText;
  function handle(name){
    var h = {name: name, kind: 'file', reads: 0,
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === h; },
      getFile: async function(){ h.reads++; return new File([text], name, {lastModified: 1700000000000}); }};
    return h;
  }
  window.__H = {a: handle('show-a.sptcal'), b: handle('Pilot Plan.sptcal')};
  var now = Date.now();
  window.__MEMIDB['spt-planning-cal'] = {handles: new Map([
    ['recentFiles', [{id: 'fa', handle: window.__H.a, name: 'show-a.sptcal', savedAt: now - 60000},
                     {id: 'fb', handle: window.__H.b, name: 'Pilot Plan.sptcal', savedAt: now - 120000}]],
    ['activeFileId', 'fa']
  ])};
})();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'firstrun', cases: [], observed: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function txt(e) { return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function shown(e) { return !!e && !e.closest('[hidden]') && e.getClientRects().length > 0; }
  function list() { return q('.start-recents'); }
  function listState() {
    var l = list(), tw = q('#table-wrap');
    return { exists: !!l, shown: shown(l), sibling: !!l && !!tw && l.parentElement === tw.parentElement,
             insideGrid: !!q('#table-wrap .start-recents'), names: l ? qa('.start-recents [data-id]').map(txt) : [],
             load: !!(l && l.querySelector('[data-action="open"]')), ids: l ? qa('.start-recents [id]').map(function (e) { return e.id; }) : [],
             empty: !!q('#table-wrap .empty-state') };
  }
  function menuOpen() {
    var b = q('.file-menu-btn'), d = q('#file-menu');
    return { expanded: b && b.getAttribute('aria-expanded'), dropdown: !!d && getComputedStyle(d).display !== 'none' };
  }
  // aria-expanded is the menu's state (React's), and it is what the cases judge. The dropdown's display follows Mantine's
  // 150 ms transition and floating-ui's placement, which headless virtual time holds back or never runs (measured: open
  // menus read display:none here, while in the pane the same steps show the menu and then `display: none !important`
  // under the dialog), so settled() only waits for it a little and reports it.
  function isOpen(m) { return m.expanded === 'true'; }
  async function settled(open) {
    await T.until(function () { var m = menuOpen(); return (m.expanded === 'true') === open && m.dropdown === open; },
                  'the File menu to ' + (open ? 'open' : 'shut'), 10, 100).catch(function () {});
    return menuOpen();
  }
  function label() { return txt(q('#file-menu-label')); }
  function meta() { return txt(q('#meta-production')); }
  function press(key, mods, target, extra) {
    mods = mods || {};
    var init = { key: mods.shift ? key.toUpperCase() : key, code: key.length === 1 ? 'Key' + key.toUpperCase() : key,
                 bubbles: true, cancelable: true, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt };
    if (extra) Object.keys(extra).forEach(function (k) { init[k] = extra[k]; });
    var e = new KeyboardEvent('keydown', init);
    (target || document.activeElement || document.body).dispatchEvent(e);
    return e.defaultPrevented;
  }
  function asWindows(fn) {
    var uad = navigator.userAgentData;
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
    Object.defineProperty(navigator, 'userAgentData', { value: { platform: 'Windows', brands: uad ? uad.brands : [], mobile: false }, configurable: true });
    try { return fn(); } finally { delete navigator.platform; delete navigator.userAgentData; }
  }
  var picker = { calls: 0 };
  function stubPicker() {
    window.showOpenFilePicker = async function () { picker.calls++; throw new DOMException('test: cancelled', 'AbortError'); };
  }
  async function settleModal() { await T.sleep(250); }
  async function waitNoModal() { await T.until(function () { return !q('.mantine-Modal-content'); }, 'no dialog', 60, 100); }
  try {
    out.platform = navigator.platform;
    await T.appReady();
    await T.until(function () { return qa('#file-menu .file-menu-item[data-id]').length === 2; }, 'the two recent files in the file menu', 100, 100);
    await T.sleep(600);

    // ---- AUD2-030: the recents on an empty start ------------------------------------------------------------
    var r1 = listState();
    out.observed.coldLabel = label();
    kase('R1', 'cold start: Untitled and empty, and the recent calendars show beside #table-wrap with a Load… button',
         label() === 'Untitled' && r1.empty && r1.exists && r1.shown && r1.sibling && !r1.insideGrid &&
         r1.names.length === 2 && r1.names[0].indexOf('show-a') !== -1 && r1.names[1].indexOf('Pilot Plan') !== -1 && r1.load,
         { observed: r1, label: label() });
    kase('R2', 'nothing in the list carries an id', r1.exists && r1.ids.length === 0, { observed: r1.ids });

    // ---- AUD2-031: Production's card names what Show info is missing ---------------------------------------
    document.querySelector('.side-tab-btn[data-tab="phases"]') && document.querySelector('.side-tab-btn[data-tab="phases"]').click();
    T.set('start-production', '2027-01-04');
    await T.sleep(500);
    var m1 = meta();
    kase('P1', 'Show info blank: Production’s line names Show info and its missing fields, not a “shooting day count”',
         /Show info/i.test(m1) && /Season/.test(m1) && /Shooting Days per Episode/.test(m1) && /Number of Episodes/.test(m1) &&
         !/shooting day count/i.test(m1), { observed: m1 });
    T.set('show-title', 'Harbor Lights'); T.set('shoot-days-per-ep', '8'); T.set('num-episodes', '10');
    await T.sleep(600);
    var m2 = meta();
    kase('P2', 'only the Season blank: “Pick a Season in Show info”',
         /Pick a Season in Show info/.test(m2) && !/Number of Episodes|Shooting Days/.test(m2) && !/shooting day count/i.test(m2),
         { observed: m2 });
    var noProd = qa('#table-wrap td.sheet-phase-cell[data-pkey="production"]').length;
    kase('P3', 'the Season rule is kept: no Season, no Production', noProd === 0 && !!q('#table-wrap .empty-state'),
         { observed: { prodCells: noProd, empty: !!q('#table-wrap .empty-state') } });
    var r6 = listState();
    out.observed.listWhileEmptyButEdited = r6;
    T.set('season-num', '1');
    await T.until(function () { return qa('#table-wrap td.sheet-phase-cell[data-pkey="production"]').length > 0; }, 'Production to schedule', 60, 100);
    await T.sleep(400);
    var r3 = listState();
    kase('R3', 'a Season picked: Production schedules and the list goes away', !r3.shown && !r3.empty && meta().indexOf('shoot day') !== -1,
         { observed: { list: r3, meta: meta() } });

    // ---- WIN-2: New is the header's button; the File menu has no New (owner, 18 Nov 2026) -----------------------
    q('.file-menu-btn').click();
    await T.sleep(300);
    var menuNew = q('#file-menu .file-menu-item[data-action="new"]');
    var menuItems = qa('#file-menu .file-menu-item').map(function (i) { return (i.dataset.action || 'recent') + ':' + txt(i); });
    q('.file-menu-btn').click();
    await T.sleep(300);
    var newItem = q('#new-file-btn');
    if (newItem) newItem.click();
    await T.sleep(300);
    var askedNew = T.modalText();
    var startedNew = T.clickModalButton('Start new');
    await T.sleep(800);
    var r4 = listState();
    kase('M3', 'the File menu has no New; the New button asks New’s question with unsaved work; “Start new” leaves a blank calendar',
         !menuNew && !!newItem && /new blank calendar/i.test(askedNew) && startedNew && (document.getElementById('show-title') || {}).value === '' && r4.empty,
         { observed: { items: menuItems, asked: askedNew, title: (document.getElementById('show-title') || {}).value } });
    kase('R4', 'after New: Untitled and empty again, and the list is back', label() === 'Untitled' && r4.shown && r4.names.length === 2,
         { observed: { list: r4, label: label() } });
    await waitNoModal();

    // ---- the list never travels in a shareable copy: those are the sender's file names -------------------------
    await T.openSettings('prefs');
    await T.until(function () { return !!document.getElementById('share-copy-btn'); }, 'the Export-App button', 80, 100);
    await T.sleep(900);                                 // the share listener drops any click within 600 ms of the last
    var cap = T.captureDownload();
    var copyHtml = '';
    try {
      document.getElementById('share-copy-btn').click();
      await T.until(cap.peek, 'the shareable copy', 100, 100);
      copyHtml = await cap.peek().text();
    } catch (e) { out.observed.copyErr = String(e); } finally { cap.stop(); }
    await T.closeSettings();
    var cdoc = new DOMParser().parseFromString(copyHtml, 'text/html');
    var chost = cdoc.querySelector('.start-recents'), cpanel = cdoc.querySelector('main.preview-panel');
    // The names are looked for in the copy's MARKUP: its scripts are left out, because this leg's own source (injected
    // by srv.js, so in the cloned document too) spells them.
    Array.prototype.slice.call(cdoc.querySelectorAll('script')).forEach(function (x) { x.remove(); });
    var c1 = { bytes: copyHtml.length, host: !!chost, hidden: !!chost && chost.hasAttribute('hidden'), children: chost ? chost.children.length : -1,
               panelClass: cpanel ? cpanel.className : null, names: /Pilot Plan\.sptcal/.test(cdoc.documentElement.outerHTML), liveShown: listState().shown };
    kase('C1', 'a shareable copy built while the list shows carries it empty and hidden, and no recent file name',
         c1.bytes > 100000 && c1.liveShown && c1.host && c1.hidden && c1.children === 0 && !/has-start-recents/.test(c1.panelClass || '') && !c1.names,
         { observed: c1 });

    // ---- AUD2-033: Esc closes the File menu ----------------------------------------------------------------
    var btn = q('.file-menu-btn');
    if (isOpen(menuOpen())) { btn.click(); await settled(false); }
    btn.click(); btn.focus();
    var before1 = await settled(true);
    press('Escape', {}, document.activeElement);
    var after1 = await settled(false);
    kase('M1', 'Esc closes the File menu (focus on its button)', isOpen(before1) && !isOpen(after1),
         { observed: { before: before1, after: after1, focus: document.activeElement && document.activeElement.className } });
    if (isOpen(menuOpen())) { btn.click(); await settled(false); }
    btn.click();
    var before1b = await settled(true);
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    press('Escape', {}, document.body);
    var after1b = await settled(false);
    kase('M1b', 'Esc closes the File menu (focus nowhere in particular)', isOpen(before1b) && !isOpen(after1b),
         { observed: { before: before1b, after: after1b } });
    if (isOpen(menuOpen())) { btn.click(); await settled(false); }

    // ---- AUD2-033: the menu never stays open behind a dialog -------------------------------------------------
    btn.click();
    var before2 = await settled(true);
    press('p', { meta: true }, document.body);          // an empty calendar: "Nothing to export"
    await T.sleep(500);
    var dlg2 = T.modalText();
    var after2 = await settled(false);
    kase('M2', 'a dialog opening closes the File menu', isOpen(before2) && /Nothing to export/.test(dlg2) && !isOpen(after2),
         { observed: { before: before2, dialog: dlg2, after: after2 } });
    T.clickModalButton('OK');
    await waitNoModal();
    if (isOpen(menuOpen())) { btn.click(); await settled(false); }

    // ---- AUD2-033: Cmd+O loads ------------------------------------------------------------------------------
    stubPicker();
    await T.sleep(700);                                 // past the re-click guard
    var k1 = press('o', { meta: true }, document.body);
    await T.until(function () { return picker.calls > 0; }, 'the picker after Cmd+O', 30, 100).catch(function () {});
    kase('K1', 'Cmd+O: prevented, and the file picker opens', k1 === true && picker.calls === 1, { observed: { prevented: k1, calls: picker.calls } });
    T.set('show-title', 'Unsaved Work');
    q('#show-title').blur();
    await T.sleep(800);
    var calls0 = picker.calls;
    var k2 = press('o', { meta: true }, document.body);
    await T.sleep(400);
    var asked2 = T.modalText();
    var cancelled = T.clickModalButton('Cancel');
    await waitNoModal();
    await T.sleep(300);
    kase('K2', 'Cmd+O with unsaved work asks “Load another calendar?” first, and Cancel opens no picker',
         k2 === true && /Load another calendar/.test(asked2) && cancelled && picker.calls === calls0,
         { observed: { prevented: k2, asked: asked2, calls: picker.calls - calls0 } });
    // K3: under a dialog, and a held key
    press('p', { meta: true }, document.body);           // the calendar is still empty: "Nothing to export"
    await T.sleep(400);
    var calls3 = picker.calls;
    var k3a = press('o', { meta: true }, document.body);
    await T.sleep(300);
    var stillOne = qa('.mantine-Modal-content').length;
    T.clickModalButton('OK');
    await waitNoModal();
    var k3b = press('o', { meta: true }, document.body, { repeat: true });
    await T.sleep(300);
    kase('K3', 'Cmd+O does nothing under a dialog, nor on a held key’s repeats', k3a === true && k3b === true && stillOne === 1 && picker.calls === calls3,
         { observed: { underDialog: k3a, repeat: k3b, modals: stillOne, calls: picker.calls - calls3 } });
    var k4mac = press('o', { ctrl: true }, document.body);
    var k4win = asWindows(function () { return press('o', { ctrl: true }, document.body, { repeat: true }); });
    kase('K4', 'Ctrl+O is left to text navigation on a Mac; on Windows it is taken', k4mac === false && k4win === true,
         { observed: { macCtrlO: k4mac, winCtrlO: k4win, platform: navigator.platform } });

    // ---- AUD2-033: Cmd+Y / Ctrl+Y redo ----------------------------------------------------------------------
    await T.sleep(900);
    var t0 = q('#show-title').value;                   // 'Unsaved Work'
    T.set('show-title', 'Redo Me');
    q('#show-title').blur();
    await T.sleep(1200);
    press('z', { meta: true }, document.body);
    await T.sleep(500);
    var afterUndo = q('#show-title').value;
    var y1 = press('y', { meta: true }, document.body);
    await T.sleep(500);
    var afterRedo = q('#show-title').value;
    kase('Y1', 'Cmd+Y redoes what Cmd+Z took back', afterUndo === t0 && y1 === true && afterRedo === 'Redo Me',
         { observed: { before: t0, afterUndo: afterUndo, prevented: y1, afterRedo: afterRedo } });
    press('z', { meta: true }, document.body);
    await T.sleep(500);
    var afterUndo2 = q('#show-title').value;
    var y2 = asWindows(function () { return press('y', { ctrl: true }, document.body); });
    await T.sleep(500);
    kase('Y2', 'Windows: Ctrl+Y redoes', afterUndo2 === t0 && y2 === true && q('#show-title').value === 'Redo Me',
         { observed: { afterUndo: afterUndo2, prevented: y2, after: q('#show-title').value } });
    q('#show-title').focus();
    var y3 = press('y', { meta: true }, q('#show-title'));
    q('#show-title').blur();
    kase('Y3', 'inside a text box Cmd+Y is the box’s own', y3 === false, { observed: y3 });

    // ---- AUD2-030: a click on a recent loads it ---------------------------------------------------------------
    // Back to an untitled, empty calendar (the title edits above made it dirty).
    await T.sleep(700);
    q('#new-file-btn').click();
    await T.sleep(300);
    T.clickModalButton('Start new');
    await waitNoModal();
    await T.sleep(500);
    var item = qa('.start-recents [data-id]').filter(function (e) { return txt(e).indexOf('show-a') !== -1; })[0];
    if (item) item.click();
    await T.until(function () { return label().indexOf('show-a') !== -1; }, 'show-a to load', 60, 100).catch(function () {});
    await T.sleep(600);
    var r5 = listState();
    kase('R5', 'a click on a recent in the list loads it, and the list goes away',
         !!item && label().indexOf('show-a') !== -1 && (q('#show-title') || {}).value === 'SHOW A' && !r5.shown && window.__H.a.reads > 0,
         { observed: { label: label(), title: (q('#show-title') || {}).value, list: r5, reads: window.__H.a.reads } });

    // (AUD2-032 + WIN-2's H1, Help matching the app, moved into the help leg, tests/harness/t/help.js, 23 Nov 2026: Help is a window now, and the one-page Guide these text checks read is gone.)

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    kase('EX', 'the leg threw', false, { observed: String(e && e.stack || e) });
  }
  T.done(out);
})(); });
