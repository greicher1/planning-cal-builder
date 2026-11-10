// lastedited -- the auto header's date is the DATE LAST EDITED (owner, 9 Nov 2026: "make the date in the top left
// corner for waterfall view (and top right corner for month view) be the last time the calendar was edited. By edited
// i mean an actual meaningful change to the calendar, basically anything that would change if it was exported to pdf
// or excel. Then add this "Date Last Edited" variable to the template builder").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=lastedited ./run.sh lastedited 300
//
// tests/fixtures/lastedited.sptcal is hdrversion.sptcal (synthetic) with `lastEdited: 2026-10-01T15:00:00.000Z`, so
// the stamp and today differ (a run on 1 Oct 2026 would prove nothing, and says so in P0). Driven the way a user
// drives it: the view buttons, Show info's title box, Undo / Redo, Save As and Load through the harness's stand-ins
// for the OS dialogs, the header's mode popover, the scenario strip's events, New.
//   L1-L3  the stamp shows: the waterfall's top left (M.D.YY), the month view's top right (M.DD.YY), Excel's &L
//   V1-V2  a view switch, a sidebar tab and the add-a-holiday box are not edits: the date stays (no undo step for V1)
//   E1-E4  an edit shows today; Undo brings the old date back, Redo today's; typing the title back the old date
//   S1-S2  Save As writes the stamp the calendar has (the old one, unchanged; today's after an edit)
//   F1-F2  a file with no stamp (every calendar saved before this) takes the file's modified time, and saves it
//   T1-T4  Template mode's Default reads {lastEdited}; the template builder lists the "Date Last Edited" tokens
//   C1-C2  scenarios: a copy keeps its tab's date, an edit stamps only that tab, flipping back shows the other's
//   N1     New: today, and no stamp in the saved file
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var STAMP = '2026-10-01T15:00:00.000Z', MTIME = Date.UTC(2026, 7, 14, 18, 0, 0);   // 14 Aug 2026, 18:00 UTC
  function dot(d){ return (d.getMonth() + 1) + '.' + d.getDate() + '.' + String(d.getFullYear()).slice(2); }
  function dotpad(d){ return (d.getMonth() + 1) + '.' + String(d.getDate()).padStart(2, '0') + '.' + String(d.getFullYear()).slice(2); }
  var OLD = dot(new Date(STAMP)), OLDPAD = dotpad(new Date(STAMP)), NOW = dot(new Date()), NOWPAD = dotpad(new Date());
  var FILE = dot(new Date(MTIME)), FILEPAD = dotpad(new Date(MTIME));
  function $(id){ return document.getElementById(id); }
  function wfLeft(){ var e = document.querySelector('#table-wrap .cal-header-bar .hdr-line[data-hid="left"]'); return e ? e.textContent.trim() : null; }
  function mvDate(){ var e = document.querySelector('#table-wrap .mv-header [data-mvhid="today"]'); return e ? e.textContent.trim() : null; }
  function undoOff(){ var b = $('undo-btn'); return !!b && (b.disabled || b.hasAttribute('data-disabled')); }
  async function view(which){ $(which === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await T.sleep(700); }
  async function typeTitle(v){ T.set('show-title', v); await T.sleep(900); }   // past the undo debounce (500 ms)
  async function saveAs(){
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);   // Save As drops a second click inside 600 ms (reClickGuard)
      await T.until(function(){ var b = $('save-as-btn'); return !!b && !b.disabled; }, 'Save As', 60, 100);
      $('save-as-btn').click();
      await T.until(function(){ return rec.files.length > 0; },
        'the Save As write (calls ' + rec.calls.length + ', dialog: ' + JSON.stringify(T.modalText()) + ')', 300, 100);
    } finally { rec.restore(); }
    return JSON.parse(new TextDecoder().decode(rec.files[rec.files.length - 1].bytes));
  }
  function localDay(iso){ return iso ? dot(new Date(iso)) : null; }
  async function pickMode(name){
    var stale = document.querySelector('.hdr-mode-pop'); if(stale) stale.remove();
    $('hdr-mode-btn').click();
    await T.until(function(){ return !!document.querySelector('.hdr-mode-pop'); }, 'the header mode popover', 40, 100);
    var row = null;
    document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function(r){
      if((r.querySelector('.hdr-mode-name').textContent || '') === name) row = r;
    });
    if(!row) throw new Error('no "' + name + '" row in the mode popover');
    row.click();
    await T.sleep(800);
  }
  try {
    await T.appReady();
    await T.sleep(1200);
    add('P0', 'precondition: the fixture\'s stamp is not today, so a date that stayed "today" could not pass',
      OLD !== NOW && FILE !== NOW, {OLD: OLD, NOW: NOW, FILE: FILE}, 'three different days');

    // ---- L: the stamp shows, in both headers and in the workbook ---------------------------------------------------
    var title0 = $('show-title').value;
    add('L1', 'the waterfall\'s top left reads the Date Last Edited (M.D.YY), not today', wfLeft() === OLD, wfLeft(), OLD);
    var undo0 = undoOff();
    await view('month');
    add('L2', 'the month view\'s top right reads it as M.DD.YY', mvDate() === OLDPAD, mvDate(), OLDPAD);
    await view('sheet');
    var tb = document.querySelector('.side-tab-btn[data-tab="phases"]'); if(tb){ tb.click(); await T.sleep(300); }
    var tb2 = document.querySelector('.side-tab-btn[data-tab="show"]'); if(tb2){ tb2.click(); await T.sleep(900); }
    add('V1', 'a view switch and a sidebar tab are not edits: the date stays, and Undo is still off',
      wfLeft() === OLD && undo0 && undoOff(), {left: wfLeft(), undoOffBefore: undo0, undoOffAfter: undoOff()}, OLD + ', Undo off');
    // The Holidays card's add-a-holiday boxes are swept into the saved fields, but are a form: nothing changes until Add.
    // A view switch after typing forces a render, so the header is really re-read (no render would pass vacuously).
    T.set('custom-hol-name', 'Studio shutdown'); await T.sleep(700);
    await view('month'); await view('sheet');
    add('V2', 'typing in the Holidays card\'s add-a-holiday box is not an edit until Add', wfLeft() === OLD, wfLeft(), OLD);
    T.set('custom-hol-name', ''); await T.sleep(700);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var hdr = String((wb.worksheets[0].headerFooter || {}).oddHeader || '');
    var secs = {};
    hdr.replace(/&([LCR])((?:(?!&[LCR])[\s\S])*)/g, function(_, k, v){ secs[k] = v; return ''; });
    var L = String(secs.L || '').replace(/&(?:"[^"]*"|K[0-9A-Fa-f]{6}|\d{1,3}(?=&")|[A-Z])/g, '');
    add('L3', 'Excel\'s header carries the same date (its &L section starts with it)', L.split('\n')[0] === OLD, L, OLD + '\\n…');

    // ---- E: an edit stamps today; Undo, Redo and a value typed back bring their own dates ----------------------------
    await typeTitle(title0 + ' X');
    add('E1', 'an edit (Show info\'s title) stamps today', wfLeft() === NOW, wfLeft(), NOW);
    $('undo-btn').click(); await T.sleep(900);
    add('E2', 'Undo puts the old date back with the old title', wfLeft() === OLD && $('show-title').value === title0,
      {left: wfLeft(), title: $('show-title').value}, OLD + ', "' + title0 + '"');
    $('redo-btn').click(); await T.sleep(900);
    add('E3', 'Redo brings today\'s date back with the edit', wfLeft() === NOW && $('show-title').value === title0 + ' X',
      {left: wfLeft(), title: $('show-title').value}, NOW);
    await typeTitle(title0);
    add('E4', 'typing the title back the way it was: the calendar is what it was on the stamp\'s day, so that date returns',
      wfLeft() === OLD, wfLeft(), OLD);

    // ---- S: Save As writes the stamp the calendar has --------------------------------------------------------------
    var s1 = await saveAs();
    add('S1', 'Save As of the unchanged calendar writes its own stamp, untouched', s1.lastEdited === STAMP, s1.lastEdited, STAMP);
    await typeTitle(title0 + ' Y');
    var s2 = await saveAs();
    add('S2', 'after an edit, Save As writes a stamp of today', localDay(s2.lastEdited) === NOW && s2.lastEdited !== STAMP,
      s2.lastEdited, 'an ISO time on ' + NOW);

    // ---- F: a file with no stamp takes the file's modified time ----------------------------------------------------
    var old = JSON.parse(JSON.stringify(s2));
    delete old.lastEdited;
    old.fields.byId['show-title'] = {value: 'Pre-stamp File'};
    var p = T.openViaFakePicker('/x.sptcal', 'prestamp.sptcal', {text: JSON.stringify(old), mtime: MTIME});
    for(var i = 0; i < 40; i++){
      await T.sleep(100);
      if(T.clickModalButton('Load') || /prestamp/.test(($('file-menu-label') || {}).textContent || '')) break;
    }
    await p;
    await T.until(function(){ return /prestamp/.test(($('file-menu-label') || {}).textContent || ''); }, 'the loaded file in the file menu', 100, 100);
    await T.sleep(900);
    var fL = wfLeft();
    await view('month'); var fM = mvDate(); await view('sheet');
    add('F1', 'a file saved before the stamp existed reads its file\'s modified time, in both headers',
      fL === FILE && fM === FILEPAD && $('show-title').value === 'Pre-stamp File', {left: fL, month: fM, title: $('show-title').value}, FILE + ' / ' + FILEPAD);
    var s3 = await saveAs();
    add('F2', 'and its next save writes that time as its stamp', s3.lastEdited === new Date(MTIME).toISOString(),
      s3.lastEdited, new Date(MTIME).toISOString());

    // ---- T: Template mode, then the template builder ----------------------------------------------------------------
    // ⚠️ Opening the builder from Auto PUTS THE HEADER IN TEMPLATE MODE (and leaves it there, with an undo step), and a
    // mode switch is a change to the calendar, so it stamps today. Measured while this leg was written: the builder's
    // live values read 11.9.26 on a calendar stamped 10.1.26 for exactly that reason. So the builder is opened here on
    // a calendar that is already in Template mode, which opening it does not change.
    await pickMode('Template');
    var s4 = await saveAs();
    add('T1', 'Template mode seeds the Default\'s date as {lastEdited}; switching the mode is a change to the header, so it stamps today',
      (s4.headerManual || {}).left === '{lastEdited}' && s4.headerTemplates === true && wfLeft() === NOW,
      {line: (s4.headerManual || {}).left, templates: s4.headerTemplates, left: wfLeft()}, '{lastEdited}, ' + NOW);
    await T.reloadWith(function(snap){ snap.lastEdited = STAMP; snap.fields.byId['show-title'] = {value: 'Template File'}; }, 'tplstamp');
    add('T2', '{lastEdited} in a Template line reads the calendar\'s stamp (a file stamped 1 Oct shows ' + OLD + ')',
      wfLeft() === OLD && $('show-title').value === 'Template File', {left: wfLeft(), title: $('show-title').value}, OLD);
    var st = document.querySelector('.hdr-mode-pop'); if(st) st.remove();
    $('hdr-mode-btn').click();
    await T.until(function(){ return !!document.querySelector('.hdr-mode-pop .hdr-mode-peek'); }, 'the mode popover', 40, 100);
    document.querySelector('.hdr-mode-pop .hdr-mode-peek').click();
    await T.until(function(){ return !!document.querySelector('.hde-overlay'); }, 'the template editor', 60, 100);
    var ed = document.querySelector('.hde-overlay');
    var groups = [].map.call(ed.querySelectorAll('.hde-rail-list .hdr-token-group'), function(g){ return g.textContent.trim(); });
    var items = [].map.call(ed.querySelectorAll('.hde-rail-list .hdr-token-item'), function(b){
      return {code: b.querySelector('.hdr-token-code').textContent, live: b.querySelector('.hdr-token-desc').textContent};
    });
    var le = items.filter(function(x){ return /^\{lastEdited/.test(x.code); });
    var byCode = {}; le.forEach(function(x){ byCode[x.code] = x.live; });
    var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var od = new Date(STAMP);
    add('T3', 'the template builder lists a "Date Last Edited" group before Dates, each entry with its live value (the stamp, not today)',
      groups.indexOf('Date Last Edited') >= 0 && groups.indexOf('Date Last Edited') < groups.indexOf('Dates') && le.length === 4
        && byCode['{lastEdited}'] === OLD && byCode['{lastEdited:long}'] === MON[od.getMonth()] + ' ' + od.getDate() + ', ' + od.getFullYear()
        && byCode['{lastEdited:slash}'] === OLD.replace(/\./g, '/'),
      {groups: groups.slice(0, 4), entries: le}, '4 entries, ' + OLD);
    ed.querySelector('.hde-done').click();
    await T.until(function(){ return !document.querySelector('.hde-overlay'); }, 'the editor to close', 40, 100);
    add('T4', 'opening and closing the builder on a Template header is not an edit', wfLeft() === OLD, wfLeft(), OLD);

    // ---- C: scenarios: each tab has its own date ---------------------------------------------------------------------
    var before = wfLeft();
    document.dispatchEvent(new CustomEvent('sptcal-scenario', {detail: {op: 'add'}}));
    await T.sleep(1200);
    var copyLeft = wfLeft();
    await typeTitle('Scenario Two Title');
    var editedLeft = wfLeft();
    document.dispatchEvent(new CustomEvent('sptcal-scenario', {detail: {op: 'switch', id: 's1'}}));
    await T.sleep(1200);
    add('C1', 'a scenario copy keeps the date it was copied with; an edit in it stamps today',
      before === OLD && copyLeft === OLD && editedLeft === NOW, {before: before, copy: copyLeft, edited: editedLeft}, OLD + ', ' + OLD + ', ' + NOW);
    add('C2', 'flipping back to the first tab shows its own date, untouched by the other tab\'s edit',
      wfLeft() === OLD && $('show-title').value === 'Template File', {left: wfLeft(), title: $('show-title').value}, OLD);

    // ---- N: New -----------------------------------------------------------------------------------------------------
    $('new-file-btn').click();
    await T.sleep(500);
    T.clickModalButton('Start new');
    await T.sleep(1200);
    var s5 = await saveAs();
    add('N1', 'New: a blank calendar has no stamp, so its saved file carries none (and its header, once drawn, reads today)',
      !('lastEdited' in s5) && (wfLeft() === null || wfLeft() === NOW), {left: wfLeft(), stamp: s5.lastEdited}, 'no key');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'lastedited', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
