// settingswin -- the Settings window (owner ruling 12, 20 Oct 2026): every control that moved out of the
// sidebar's old Settings tab still saves and restores by its id, the window is session UI, and it lies
// over the sidebar without touching the waterfall.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh settingswin 240
//
// The window is a Mantine Tabs panel portalled into #settings-host, inside aside.form-panel, laid over the
// sidebar by CSS. Its tabs: Preferences, Region, Presets. (It shipped with a Calendar tab too; the owner merged
// that into Preferences, 20 Oct 2026: "Delete the calendar tab. this should apply to both the waterfall and month
// view".) What this leg holds it to:
//
//   W0  at boot it is mounted and CLOSED (display:none); the rail is two tabs plus a Settings button that is
//       not a tab; the window's tabs are Preferences, Region, Presets, in that order, with no Calendar tab, and
//       it opens on Preferences
//   W1  every moved id is in the page exactly once, inside the window, on its tab
//   W1b the header presets are in the Presets tab, inside .prefs-card
//   W2  no sidebar card names the retired Settings tab: one merged in with data-tab="settings" would be
//       hidden for good
//   W3  the sweep: the window gives fields.byId exactly #union-place, #custom-hol-name, #custom-hol-date, in
//       that order, straight after #show-version -- where the Region and Holidays cards put them
//   W3b every other id'd control in the window is inside .prefs-card, so the sweep skips it
//   W4  set through the window by real (hit-tested) clicks: Region, a custom holiday, a holiday's Enable and
//       Waterfall boxes, Single Column Mode, Label Production by, Pause prep; and two preferences
//   W5  Save writes each calendar setting to its own place (byId for the Region; singleColumn, mvProdLabel,
//       prepPauseOff, customHolidays, holidayOff, holidayView), and neither preferences nor the calendar
//       switches' ids reach fields.byId; sidebarTab is never 'settings'
//   W6  New puts every calendar setting back to its default and leaves the preferences alone
//   W7  Load of the saved file brings every one back, control by control, and the same swept values
//   W8  opening, switching tabs and closing push no undo step and do not dirty the calendar
//   W9  ⛔ the stale-switch trap: after a Load and after an undo, re-rendering the window (tabs, close, open)
//       leaves each switch showing the ENGINE's value, not Mantine's remembered one
//   W10 it covers the sidebar from the rail's bottom edge down, leaving the rail (Show / Phases / Settings) in
//       view (owner, 23 Oct 2026); the preview panel and the grid box do not move; with the sidebar scrolled it
//       still sits right under the rail, and closing leaves the sidebar's scroll where it was
//   W11 open: aria-expanded, `inert` on what it covers but never on the rail, focus on the selected tab. Escape
//       from inside closes it and puts focus back on the button; an Escape elsewhere does not close it
//   W12 a file saved with the old Settings tab up (sidebarTab 'settings') opens on Show, the window closed
//   W13 the merged Preferences tab, BY VIEW: in the waterfall it shows ONE Waterfall card holding the old Calendar
//       tab's waterfall settings and Grid Lines, Automatic notes and App, no Month view card, and the opening line
//       that names Grid Lines; in the month view ONE Month view card holding Label Production by, the grey-text
//       switches, Pause prep and Number Production Days, Automatic notes and App, no Waterfall card, and the line
//       that names the grey-text switches. Exactly one opening line shows in each view
//   W14 the rail stays live while it is open (owner, 23 Oct 2026): no head of its own, its tabs straight under
//       the rail; the Settings button takes the selected look and the sidebar tab gives it up; a hit-tested click
//       on Phases or Show closes it and goes there, as does an arrow key on the rail; the Settings button closes
//       it again; an undo of a change made in it leaves it open
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function el(id){ return document.getElementById(id); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function near(a, b){ return Math.abs(a - b) < 1; }
  function rectOf(e){ var r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (el('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(700);   // past the 500 ms undo debounce, so the next action is its own step
  }
  async function view(mode){ el(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  function activeTab(){ var b = document.querySelector('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  function statusText(){ return ((el('save-status') || {}).textContent || '').trim(); }
  function undoOff(){ return !!el('undo-btn').disabled; }
  var win, btn, aside;
  function isOpen(){ return win.classList.contains('is-open'); }
  // A pointer click: the element on top at the centre must be the target (or inside it), and THAT gets it.
  // Scrolled into view first, as a user would: the Region tab is taller than the window, and scrolls inside it.
  function hitClick(target, what){
    target.scrollIntoView({block: 'nearest'});
    var r = target.getBoundingClientRect();
    var top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if(!top || !(top === target || target.contains(top))) throw new Error(what + ' is covered (' + (top && (top.className || top.tagName)) + ')');
    top.click();
  }
  // A Mantine Switch is clicked on its TRACK: the input itself is invisible.
  function track(id){ return el(id).closest('.mantine-Switch-root').querySelector('.mantine-Switch-track'); }
  async function answer(re, label, polls){
    for(var i = 0; i < (polls || 8); i++){ await T.sleep(100); if(re.test(T.modalText())){ T.clickModalButton(label); await T.sleep(300); return true; } }
    return false;
  }
  // Save and Load through the real paths, one log of every write.
  var written = [];
  var saveHandle = { name: 'settingswin.sptcal', kind: 'file',
    queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
    isSameEntry: async function(o){ return o === saveHandle; },
    getFile: async function(){ return new File([written.length ? written[written.length - 1].text : ''], 'settingswin.sptcal', {lastModified: 1}); },
    createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push({text: parts.join('')}); } }; } };
  async function save(){
    var n = written.length;
    window.showSaveFilePicker = async function(){ return saveHandle; };
    await T.until(function () { return !el('save-file-btn').disabled && !el('save-file-btn').hasAttribute('data-disabled'); }, 'the Save button', 60, 100);
    el('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1].text;
  }
  var loads = 0;
  function menuLabel(){ return ((el('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text){
    var stem = 'settingswin-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/tests/fixtures/show-a.sptcal', name, {text: text, writes: written});
    for(var i = 0; i < 40; i++){ await T.sleep(100); if(T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file’s name in the file menu', 100, 100);
    await settle();
  }

  // Every control that left the sidebar's Settings tab, by the tab it lives on now.
  var MOVED = {
    region: ['union-place', 'union-resolves', 'union-locals', 'union-caveat', 'holiday-vis', 'holiday-vis-empty', 'holiday-vis-list',
             'custom-hol-name', 'custom-hol-date', 'custom-hol-add', 'custom-hol-err', 'holiday-reset-btn'],
    // wf-date-format: the header row's Dates (ruling 4), folded into the Waterfall card when the branches merged
    // (20 Oct 2026). The first eight were the Calendar tab's until the owner merged it into Preferences, the same
    // night. (wf-hdr-custom, Custom Column Headings, sat beside it until 22 Oct 2026, when the owner had the switch
    // removed and every heading made editable: HEADINGS-EDITABLE-PLAN.md. It was in .prefs-card, so the sweep's id
    // set, gate 5, does not move.)
    prefs: ['one-col-btn', 'mv-prod-label-week', 'mv-prod-label-episode', 'mv-prod-label-block', 'prep-pause-off', 'share-copy-btn',
            'wf-date-format', 'col-reuse-btn', 'pref-mv-shootdays',
            'pref-gridlines', 'pref-mv-week', 'pref-mv-blocks', 'pref-mv-episodes']
  };
  // The merged cards, by view: what each one holds (W13).
  var WF_CARD = ['one-col-btn', 'col-reuse-btn', 'wf-date-format', 'pref-gridlines'];
  var MV_CARD = ['mv-prod-label-week', 'pref-mv-week', 'pref-mv-blocks', 'pref-mv-episodes', 'prep-pause-off', 'pref-mv-shootdays'];
  var SWEPT = ['union-place', 'custom-hol-name', 'custom-hol-date'];
  var NEVER_IN_BYID = ['one-col-btn', 'mv-prod-label-week', 'mv-prod-label-episode', 'mv-prod-label-block', 'prep-pause-off',
                       'col-reuse-btn', 'pref-mv-shootdays',
                       'wf-date-format',
                       'pref-gridlines', 'pref-mv-week', 'pref-mv-blocks', 'pref-mv-episodes'];

  try {
    await T.appReady();
    await T.sleep(600);
    win = el('settings-window'); btn = document.querySelector('.side-settings-btn'); aside = document.querySelector('.form-panel');
    // The slide is a CSS transition, which this headless Chrome never runs (see T.openSettings).
    if(win) win.style.transition = 'none';

    // ---- W0 -- W3: what is where ------------------------------------------------------------------------
    var rail = [].map.call(document.querySelectorAll('.side-tabs-track .side-tab-btn'), function (b) { return b.dataset.tab; });
    var swTabs = [].map.call(document.querySelectorAll('#settings-window [role="tab"]'), function (b) {
      return b.id.replace('settings-tabs-tab-', '') + ':' + b.textContent.trim() + (b.getAttribute('aria-selected') === 'true' ? '*' : '');
    });
    out.w0 = {display: win && getComputedStyle(win).display, open: win && isOpen(), rail: rail, swTabs: swTabs,
              calendarPanel: !!el('settings-tabs-panel-calendar'),
              btnInTablist: !!(btn && btn.closest('[role="tablist"]')), btnTab: btn && btn.getAttribute('data-tab'),
              expanded: btn && btn.getAttribute('aria-expanded'), inside: !!(win && aside.contains(win))};
    add('W0', 'At boot the window is mounted inside the sidebar and CLOSED (display:none); the rail is Show and Phases, and Settings is a button outside the tablist',
      out.w0.display === 'none' && out.w0.open === false && eq(rail, ['show', 'phases']) && !out.w0.btnInTablist && out.w0.btnTab === null
        && out.w0.expanded === 'false' && out.w0.inside, out.w0, 'display none, closed, rail show+phases');
    add('W0b', 'The window\'s tabs are Preferences, Region, Presets -- no Calendar tab, no Calendar panel -- and it opens on Preferences',
      eq(swTabs, ['prefs:Preferences*', 'region:Region', 'presets:Presets']) && !out.w0.calendarPanel,
      {tabs: swTabs, calendarPanel: out.w0.calendarPanel}, ['prefs:Preferences*', 'region:Region', 'presets:Presets']);

    var where = {}, ok1 = true;
    Object.keys(MOVED).forEach(function (t) { MOVED[t].forEach(function (id) {
      var n = document.querySelectorAll('[id="' + id + '"]').length, e = el(id), got = e ? T.settingsTabOf(e) : null;
      where[id] = n + ':' + got;
      if(n !== 1 || got !== t) ok1 = false;
    }); });
    add('W1', 'Every control that left the Settings tab is in the page exactly once, inside the window, on its tab (Region, Preferences)',
      ok1, where, 'each 1:<its tab>');
    var hp = document.querySelector('.hdr-presets');
    add('W1b', 'The header presets are in the Presets tab, inside .prefs-card',
      !!hp && T.settingsTabOf(hp) === 'presets' && !!hp.closest('.prefs-card'), hp && T.settingsTabOf(hp), 'presets');

    var strayCards = [].filter.call(document.querySelectorAll('.side-content section.card'), function (c) {
      return !win.contains(c) && ['show', 'phases'].indexOf(c.dataset.tab) === -1;
    }).map(function (c) { return (c.querySelector('h2') || c).textContent.trim().slice(0, 40) + ' [' + (c.dataset.tab || '') + ']'; });
    add('W2', 'No sidebar card names a tab other than Show or Phases: a card merged in with data-tab="settings" would be hidden for good',
      strayCards.length === 0 && document.querySelectorAll('[data-tab="settings"]').length === 0, strayCards, []);

    var keys = Object.keys(T.formSignature());
    // The anchor is the last swept id ahead of the window: #cal-range-end since the calendar range (ruling 3, the
    // Show tab's card after Show Info) merged beside the window, 20 Oct 2026; #show-version before that.
    var inWin = keys.filter(function (k) { return win.contains(el(k)); }), iv = keys.indexOf('cal-range-end');
    out.w3 = {inWin: inWin, after: keys.slice(iv, iv + 5)};
    add('W3', 'The window gives fields.byId exactly #union-place, #custom-hol-name, #custom-hol-date, in that order, straight after #cal-range-end (where the Region and Holidays cards put them)',
      eq(inWin, SWEPT) && iv >= 0 && eq(keys.slice(iv - 2, iv), ['show-version', 'cal-range-start']) && eq(keys.slice(iv + 1, iv + 4), SWEPT), out.w3, SWEPT);
    var stray = [].filter.call(win.querySelectorAll('input[id], select[id], textarea[id]'), function (e) {
      return !e.closest('.prefs-card') && SWEPT.indexOf(e.id) === -1;
    }).map(function (e) { return e.id; });
    add('W3b', 'Every other id\'d control in the window is inside .prefs-card, so collectFieldValues() skips it', stray.length === 0, stray, []);

    // ---- W4: set everything through the window, the way a user does -----------------------------------
    T.buildFixture();
    await settle();
    await T.openSettings('region');
    T.set('union-place', 'us-new-york');
    await answer(/Changing the Production Region/, 'Continue');
    await settle();
    T.set('custom-hol-name', 'Studio shutdown');
    T.set('custom-hol-date', '2026-08-12');
    hitClick(el('custom-hol-add'), 'Add');
    await answer(/Recompute/, 'Continue');
    await settle();
    // The first built-in holiday: off, and on in the Waterfall.
    var row0 = [].find.call(document.querySelectorAll('#holiday-vis-list .hv-row'), function (r) { return !r.querySelector('.hv-del'); });
    // A row's name is .hv-name's FIRST text node: a custom or out-of-range tag follows it in the same span.
    function nameOf(r){ var n = r.querySelector('.hv-name'); return n && n.firstChild ? n.firstChild.textContent.trim() : ''; }
    var hName = row0 ? nameOf(row0) : '';
    function rowNamed(name){ return [].find.call(document.querySelectorAll('#holiday-vis-list .hv-row'), function (r) { return nameOf(r) === name; }); }
    hitClick(rowNamed(hName).querySelector('.hv-cb[data-view="sheet"]'), 'the Waterfall box');
    await settle();
    hitClick(rowNamed(hName).querySelector('.hv-en'), 'the Enable box');
    await answer(/Recompute/, 'Continue');
    await settle();
    await T.openSettings('prefs');
    hitClick(track('one-col-btn'), 'Single Column Mode');
    await settle();
    await view('month');
    await T.openSettings('prefs');
    hitClick(document.querySelector('label[for="mv-prod-label-week"]'), 'Label Production by: Week');
    await settle();
    hitClick(track('prep-pause-off'), 'Pause prep');
    await settle();
    await T.openSettings('prefs');
    T.set('pref-gridlines', 'dashed');
    hitClick(track('pref-mv-episodes'), 'Show Episodes');   // Week is the bar's text now, so its row is hidden
    await T.sleep(400);
    var set4 = {place: el('union-place').value, onecol: el('one-col-btn').checked, label: el('mv-prod-label-week').checked,
                pause: el('prep-pause-off').checked, custom: !!rowNamed('Studio shutdown'), hName: hName,
                hOff: !rowNamed(hName).querySelector('.hv-en').checked, hSheet: rowNamed(hName).querySelector('.hv-cb[data-view="sheet"]').checked,
                grid: el('pref-gridlines').value, mvEps: el('pref-mv-episodes').checked};
    out.w4 = set4;
    add('W4', 'Through the window, by hit-tested clicks: Region New York, a custom holiday, a holiday off and in the Waterfall, Single Column Mode on, Label Production by Week, Pause prep on; and Grid lines Dashed, Show Episodes off',
      set4.place === 'us-new-york' && set4.onecol && set4.label && set4.pause && set4.custom && !!hName && set4.hOff && set4.hSheet
        && set4.grid === 'dashed' && set4.mvEps === false, set4, 'all set');
    var sig4 = T.formSignature();

    // ---- W5: Save -----------------------------------------------------------------------------------------
    var savedText = await save(), snap = JSON.parse(savedText), byId = (snap.fields && snap.fields.byId) || {};
    out.w5 = {place: byId['union-place'], singleColumn: snap.singleColumn, mvProdLabel: snap.mvProdLabel, prepPauseOff: snap.prepPauseOff,
              custom: (snap.customHolidays || []).map(function (h) { return h.name + '@' + h.date; }),
              holidayOff: Object.keys(snap.holidayOff || {}).length, holidayView: JSON.stringify(snap.holidayView || {}).length,
              leaked: NEVER_IN_BYID.filter(function (k) { return k in byId; }), sidebarTab: snap.sidebarTab,
              prefKeys: ['prefs', 'mvWeek', 'gridlines', 'SHEET_GRIDLINES'].filter(function (k) { return k in snap; }),
              sameKeys: eq(Object.keys(byId), Object.keys(sig4))};
    add('W5', 'Save writes each calendar setting to its own place -- the Region in fields.byId; singleColumn, mvProdLabel, prepPauseOff, customHolidays, holidayOff, holidayView as their own keys',
      out.w5.place && out.w5.place.value === 'us-new-york' && snap.singleColumn === true && snap.mvProdLabel === 'week' && snap.prepPauseOff === true
        && out.w5.custom.indexOf('Studio shutdown@2026-08-12') !== -1 && out.w5.holidayOff > 0 && out.w5.holidayView > 2,
      out.w5, 'each in its place');
    add('W5b', 'No preference and no calendar switch id reaches fields.byId, the byId key set is the sweep\'s, and sidebarTab is a real tab',
      out.w5.leaked.length === 0 && out.w5.prefKeys.length === 0 && out.w5.sameKeys && ['show', 'phases'].indexOf(snap.sidebarTab) !== -1,
      {leaked: out.w5.leaked, prefKeys: out.w5.prefKeys, sameKeys: out.w5.sameKeys, sidebarTab: snap.sidebarTab}, 'none, same keys, show/phases');

    // ---- W6: New ------------------------------------------------------------------------------------------
    el('new-file-btn').click();
    await answer(/Start a new blank calendar/, 'Start new', 30);
    await settle().catch(function () {});   // a blank calendar has no grid; the page still settles
    await T.sleep(500);
    out.w6 = {place: el('union-place').value, onecol: el('one-col-btn').checked, week: el('mv-prod-label-week').checked,
              pause: el('prep-pause-off').checked, custom: !!rowNamed('Studio shutdown'), grid: el('pref-gridlines').value, mvEps: el('pref-mv-episodes').checked};
    add('W6', 'New puts every calendar setting back (no Region, One column off, no label chosen, Pause prep off, no custom holiday) and leaves the preferences alone',
      out.w6.place === '' && !out.w6.onecol && !out.w6.week && !out.w6.pause && !out.w6.custom && out.w6.grid === 'dashed' && out.w6.mvEps === false,
      out.w6, 'defaults; prefs kept');

    // ---- W7: Load it back -----------------------------------------------------------------------------------
    await load(savedText);
    await view('month');
    var r7 = rowNamed(hName), sig7 = T.formSignature();
    out.w7 = {place: el('union-place').value, onecol: el('one-col-btn').checked, week: el('mv-prod-label-week').checked,
              pause: el('prep-pause-off').checked, custom: !!rowNamed('Studio shutdown'),
              hOff: r7 ? !r7.querySelector('.hv-en').checked : null, hSheet: r7 ? r7.querySelector('.hv-cb[data-view="sheet"]').checked : null,
              swept: SWEPT.map(function (k) { return sig7[k] === sig4[k]; }), sameSig: eq(sig7, sig4),
              grid: el('pref-gridlines').value, mvEps: el('pref-mv-episodes').checked};
    add('W7', 'Load of the saved file brings every one back, control by control, with the same swept values; the preferences are this computer\'s, untouched',
      out.w7.place === 'us-new-york' && out.w7.onecol && out.w7.week && out.w7.pause && out.w7.custom && out.w7.hOff === true && out.w7.hSheet === true
        && out.w7.sameSig && out.w7.grid === 'dashed' && out.w7.mvEps === false, out.w7, 'all back');

    // ---- W8: session UI ---------------------------------------------------------------------------------------
    await T.closeSettings();
    await T.sleep(700);
    var u8 = undoOff(), s8 = statusText();
    await T.openSettings('region');
    await T.openSettings('presets');
    await T.openSettings('prefs');
    await T.closeSettings();
    await T.sleep(800);
    out.w8 = {undoBefore: u8, undoAfter: undoOff(), statusBefore: s8, statusAfter: statusText()};
    add('W8', 'Opening the window, switching its tabs and closing it push no undo step and leave the calendar as saved',
      u8 === true && undoOff() === true && s8 === statusText(), out.w8, 'no step, no change');

    // ---- W9: the stale-switch trap ----------------------------------------------------------------------------
    // After the Load the engine wrote every switch; re-render the window and they must still say so.
    await T.openSettings('presets'); await T.openSettings('prefs'); await T.closeSettings(); await T.openSettings('prefs');
    var a9 = {onecol: el('one-col-btn').checked, pause: el('prep-pause-off').checked, mvEps: el('pref-mv-episodes').checked};
    // And after an undo: switch Single Column Mode off by a click, undo (the engine writes it back ON), re-render.
    await view('sheet');
    await T.openSettings('prefs');
    hitClick(track('one-col-btn'), 'Single Column Mode');
    await settle();
    var offNow = el('one-col-btn').checked;
    el('undo-btn').click();
    await settle();
    var undone = el('one-col-btn').checked;
    await T.openSettings('region'); await T.openSettings('prefs'); await T.closeSettings(); await T.openSettings('prefs');
    out.w9 = {afterLoad: a9, clickedOff: offNow, undone: undone, afterRerender: el('one-col-btn').checked};
    add('W9', '⛔ After a Load and after an undo, re-rendering the window (tabs, close, open) leaves every switch showing the engine\'s value, never the one Mantine remembered',
      a9.onecol === true && a9.pause === true && a9.mvEps === false && offNow === false && undone === true && out.w9.afterRerender === true,
      out.w9, 'on, on, off; off then back on, and still on');

    // ---- W10: geometry ----------------------------------------------------------------------------------------
    await T.closeSettings();
    var scroller = document.getElementById('sheet-scroll-container') || document.querySelector('#table-wrap .sheet-scroll');
    var p0 = rectOf(document.querySelector('.preview-panel')), g0 = scroller ? rectOf(scroller) : null;
    await T.openSettings('prefs');
    var rail = document.querySelector('.side-tabs');
    var w10 = rectOf(win), a10 = rectOf(aside), p1 = rectOf(document.querySelector('.preview-panel')), g1 = scroller ? rectOf(scroller) : null;
    var wB10 = win.getBoundingClientRect(), aB10 = aside.getBoundingClientRect(), rB10 = rail.getBoundingClientRect();
    await T.closeSettings();
    // The Phases tab, so the sidebar has something to scroll (Show info is shorter than the window).
    document.querySelector('.side-tab-btn[data-tab="phases"]').click(); await settle();
    aside.scrollTop = 300; await T.sleep(200);
    var st0 = aside.scrollTop;
    await T.openSettings('region');
    var wS = win.getBoundingClientRect(), aS = aside.getBoundingClientRect(), rS = rail.getBoundingClientRect(), stOpen = aside.scrollTop;
    await T.closeSettings();
    out.w10 = {win: w10, aside: a10, preview: [p0, p1], grid: [g0, g1],
               edges: {railTop: rB10.top, railBottom: rB10.bottom, winTop: wB10.top, winBottom: wB10.bottom, asideTop: aB10.top, asideBottom: aB10.bottom},
               scrolled: {st: st0, winTop: wS.top, railTop: rS.top, railBottom: rS.bottom, asideTop: aS.top, winBottom: wS.bottom, asideBottom: aS.bottom, stOpen: stOpen, stAfter: aside.scrollTop}};
    out.w10.asideInner = aside.clientWidth;
    // The sidebar's own 1 px right border stays visible beside the window: the window is its padding box.
    // ⭐ Its top is the rail's bottom edge, and the rail is at the sidebar's top: it is in view, not under the window.
    add('W10', 'Open, it covers the sidebar (inside its 1 px border) from the rail\'s bottom edge down, the rail in view at the sidebar\'s top; the preview panel and the grid box do not move; with the sidebar scrolled it still sits right under the rail, and the sidebar keeps its scroll',
      w10[0] === a10[0] && near(wB10.top, rB10.bottom) && near(rB10.top, aB10.top) && rB10.bottom > rB10.top + 20 && near(wB10.bottom, aB10.bottom)
        && near(w10[2], aside.clientWidth) && eq(p0, p1) && !!g0 && eq(g0, g1)
        && st0 > 0 && near(rS.top, aS.top) && near(wS.top, rS.bottom) && near(wS.bottom, aS.bottom) && stOpen === st0 && aside.scrollTop === st0,
      out.w10, 'win = aside below the rail; preview and grid unmoved');
    aside.scrollTop = 0;

    // ---- W11: focus, inert, Escape ------------------------------------------------------------------------------
    hitClick(btn, 'the Settings button');
    await T.until(function () { return isOpen(); }, 'the window to open on a click', 30, 50);
    await T.sleep(200);
    var act = document.activeElement;
    var inert = [].map.call(document.querySelectorAll('[inert]'), function (e) { return e.id || e.className; });
    out.w11 = {expanded: btn.getAttribute('aria-expanded'), focusRole: act && act.getAttribute('role'), focusSel: act && act.getAttribute('aria-selected'),
               focusInWin: win.contains(act), inert: inert, tabsInert: !!document.querySelector('.side-tabs[inert]'),
               winInert: !!win.closest('[inert]'), settingsOpen: aside.classList.contains('settings-open')};
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.sleep(200);
    out.w11.openAfterOutsideEsc = isOpen();
    act.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.until(function () { return !isOpen(); }, 'Escape to close the window', 30, 50);
    await T.sleep(200);
    out.w11.after = {expanded: btn.getAttribute('aria-expanded'), focusOnBtn: document.activeElement === btn,
                     inert: document.querySelectorAll('[inert]').length, settingsOpen: aside.classList.contains('settings-open'),
                     display: getComputedStyle(win).display};
    add('W11', 'Opened by a click: aria-expanded, focus on the selected tab, `inert` on the covered cards but not the window and NOT the rail; an Escape outside leaves it open; Escape inside closes it, focus back on the button, nothing left inert',
      out.w11.expanded === 'true' && out.w11.focusRole === 'tab' && out.w11.focusSel === 'true' && out.w11.focusInWin && !out.w11.tabsInert
        && !out.w11.winInert && out.w11.settingsOpen && inert.length >= 2 && out.w11.openAfterOutsideEsc === true
        && out.w11.after.expanded === 'false' && out.w11.after.focusOnBtn && out.w11.after.inert === 0 && !out.w11.after.settingsOpen
        && out.w11.after.display === 'none', out.w11, 'as described');

    // ---- W12: the retired tab in an old file ----------------------------------------------------------------------
    var old = JSON.parse(savedText); old.sidebarTab = 'settings';
    await load(JSON.stringify(old));
    out.w12 = {tab: activeTab(), open: isOpen(), place: el('union-place').value};
    var resaved = JSON.parse(await save());
    out.w12.resavedTab = resaved.sidebarTab;
    add('W12', 'A file saved with the old Settings tab up (sidebarTab "settings") opens on Show with the window closed, and saves back as Show',
      out.w12.tab === 'show' && out.w12.open === false && out.w12.place === 'us-new-york' && out.w12.resavedTab === 'show', out.w12, 'show, closed');

    // ---- W13: the merged Preferences tab, by view ----------------------------------------------------------------
    // What a user sees on the tab: the cards laid out (display:none hides the other view's), by heading, and which
    // of the given ids sit in the one card with that heading.
    function shown(e){ return !!e && e.getClientRects().length > 0; }
    function prefsLooks(){
      var panel = el('settings-tabs-panel-prefs');
      var cards = [].filter.call(panel.querySelectorAll('section.card'), shown);
      var heads = cards.map(function (c) { return (c.querySelector('h2') || c).textContent.trim(); });
      var scope = [].filter.call(panel.querySelectorAll('.sw-scope'), shown).map(function (e) { return e.textContent.trim(); });
      function holds(head, ids){
        var c = cards.filter(function (c) { return (c.querySelector('h2') || c).textContent.trim() === head; });
        return c.length === 1 && ids.every(function (id) { return c[0].contains(el(id)); });
      }
      return {heads: heads, scope: scope, wf: holds('Waterfall', WF_CARD), mv: holds('Month view', MV_CARD)};
    }
    await view('sheet');
    await T.openSettings('prefs');
    var l13s = prefsLooks(), gridShown = shown(el('pref-gridlines')), oneShown = shown(el('one-col-btn'));
    await view('month');
    await T.openSettings('prefs');
    var l13m = prefsLooks();
    // Which grey-text rows are offered depends on the label (the contextual rule); at least one always shows.
    var mvRows = ['pref-mv-week', 'pref-mv-blocks', 'pref-mv-episodes'].filter(function (id) { return shown(el(id)); });
    var l13mShown = {label: shown(el('mv-prod-label-week')), pause: shown(el('prep-pause-off')), days: shown(el('pref-mv-shootdays')), rows: mvRows};
    await T.closeSettings();
    // ...and no Custom Column Headings switch in it (removed 22 Oct 2026, HEADINGS-EDITABLE-PLAN.md): the only way it
    // could come back is a stray row, which would carry its old id or its label.
    var wfCards = [].filter.call(document.querySelectorAll('#settings-window section.card'), function (c) { return /Waterfall/.test((c.querySelector('h2') || c).textContent); });
    out.w13 = {sheet: l13s, gridShown: gridShown, oneShown: oneShown, month: l13m, monthShown: l13mShown,
               noHdrSwitch: !el('wf-hdr-custom') && wfCards.length === 1 && !/Custom Column Headings/i.test(wfCards[0].textContent)};
    add('W13', 'Preferences, by view: in the waterfall ONE Waterfall card (the old Calendar tab\'s waterfall settings and Grid Lines, and no Custom Column Headings switch), Automatic notes, App and a line naming Grid Lines; in the month view ONE Month view card (Label Production by, the grey-text switches, Pause prep, Number Production Days), Automatic notes, App and a line naming the grey-text switches',
      eq(l13s.heads, ['Waterfall', 'Automatic notes', 'App']) && l13s.wf && gridShown && oneShown && out.w13.noHdrSwitch
        && l13s.scope.length === 1 && /Grid Lines in Exports, which stays on this computer/.test(l13s.scope[0])
        && eq(l13m.heads, ['Month view', 'Automatic notes', 'App']) && l13m.mv
        && l13m.scope.length === 1 && /grey-text switches, which stay on this computer/.test(l13m.scope[0])
        && l13mShown.label && l13mShown.pause && l13mShown.days && mvRows.length >= 1,
      out.w13, 'one card per view, its own line');

    // ---- W14: the rail stays live while the window is open (owner, 23 Oct 2026) --------------------------------
    // "it should not cover the Show/phases/settings bar. Instead it should appear right below it with the
    // preferences/region/presets menu below". Every click here is hit-tested, so a rail left covered fails.
    await view('sheet');
    await T.closeSettings();
    function tabBtn(t){ return document.querySelector('.side-tab-btn[data-tab="' + t + '"]'); }
    function bg(e){ return getComputedStyle(e).backgroundColor; }
    win.style.transition = 'none';
    [].forEach.call(document.querySelectorAll('.side-tab-btn, .side-settings-btn'), function (b) { b.style.transition = 'none'; });
    hitClick(tabBtn('show'), 'the Show tab'); await T.sleep(300);
    var selBg = bg(tabBtn('show'));                      // the selected look, read off the selected tab before opening
    hitClick(btn, 'the Settings button');
    await T.until(function () { return isOpen(); }, 'the window to open', 30, 50);
    await T.sleep(200);
    var list = win.querySelector('[role="tablist"]'), rB = document.querySelector('.side-tabs').getBoundingClientRect();
    out.w14 = {selBg: selBg, open: {settingsBg: bg(btn), showBg: bg(tabBtn('show')), showStillActive: tabBtn('show').classList.contains('active'),
               // No head: nothing of its own above the tabs (the cards inside have h2 headings of their own).
               head: !!win.querySelector('.sw-head, .sw-close, #settings-window-title') || !(win.firstElementChild && win.firstElementChild.classList.contains('sw-tabs')),
               label: win.getAttribute('aria-label'),
               listTop: list && list.getBoundingClientRect().top, railBottom: rB.bottom,
               firstTab: list && (list.querySelector('[role="tab"]') || {}).textContent}};
    hitClick(tabBtn('phases'), 'the Phases tab');
    await T.until(function () { return !isOpen(); }, 'Phases to close the window', 30, 50);
    await T.sleep(200);
    out.w14.phases = {tab: activeTab(), open: isOpen(), inert: document.querySelectorAll('[inert]').length, expanded: btn.getAttribute('aria-expanded'),
                      cardShown: shown(document.querySelector('.form-panel section.card[data-tab="phases"]'))};
    hitClick(btn, 'the Settings button');
    await T.until(function () { return isOpen(); }, 'the window to reopen', 30, 50);
    hitClick(tabBtn('show'), 'the Show tab');
    await T.until(function () { return !isOpen(); }, 'Show to close the window', 30, 50);
    out.w14.show = {tab: activeTab(), open: isOpen()};
    // The arrow keys move along the rail's tablist (app.js) and leave Settings the same way.
    hitClick(btn, 'the Settings button');
    await T.until(function () { return isOpen(); }, 'the window to reopen', 30, 50);
    tabBtn('show').focus();
    tabBtn('show').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
    await T.until(function () { return !isOpen(); }, 'an arrow key on the rail to close the window', 30, 50).catch(function () {});
    out.w14.arrow = {tab: activeTab(), open: isOpen()};
    hitClick(tabBtn('show'), 'the Show tab'); await T.sleep(300);
    // The Settings button closes it again: a toggle.
    hitClick(btn, 'the Settings button');
    await T.until(function () { return isOpen(); }, 'the window to reopen', 30, 50);
    hitClick(btn, 'the Settings button');
    await T.until(function () { return !isOpen(); }, 'the Settings button to close the window', 30, 50).catch(function () {});
    out.w14.toggled = {open: isOpen(), settingsBg: bg(btn), showBg: bg(tabBtn('show'))};
    // An undo of a change made IN the window replays the saved sidebar tab (setSidebarTab) and must not close it.
    await T.openSettings('prefs');
    var one = el('one-col-btn').checked;
    hitClick(track('one-col-btn'), 'Single Column Mode');
    await settle();
    el('undo-btn').click();
    await settle();
    out.w14.undo = {open: isOpen(), back: el('one-col-btn').checked === one};
    await T.closeSettings();
    var o14 = out.w14;
    add('W14', 'The rail stays live while it is open: no head, its tabs (Preferences first) straight under the rail; Settings looks selected and Show gives it up; a click on Phases or Show, or an arrow key on the rail, closes it and goes there; the Settings button closes it again; an undo of a change made in it leaves it open',
      o14.open.settingsBg === selBg && selBg !== 'rgba(0, 0, 0, 0)' && o14.open.showBg !== selBg && o14.open.showStillActive
        && !o14.open.head && o14.open.label === 'Settings' && near(o14.open.listTop, o14.open.railBottom) && o14.open.firstTab === 'Preferences'
        && o14.phases.tab === 'phases' && !o14.phases.open && o14.phases.inert === 0 && o14.phases.expanded === 'false' && o14.phases.cardShown
        && o14.show.tab === 'show' && !o14.show.open && o14.arrow.tab === 'phases' && !o14.arrow.open
        && !o14.toggled.open && o14.toggled.settingsBg !== selBg && o14.toggled.showBg === selBg
        && o14.undo.open && o14.undo.back,
      out.w14, 'as described');
  } catch (e) { out.EX = String(e && e.stack || e); add('EX', 'the leg ran to the end', false, out.EX, 'no exception'); }
  out.errors = (window.__ERR || []).slice(0, 10);
  add('E0', '0 console errors', out.errors.length === 0, out.errors, []);
  out.cases = cases;
  T.done(out);
})(); });
