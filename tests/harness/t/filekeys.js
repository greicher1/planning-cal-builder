// filekeys -- the file actions' keyboard shortcuts (owner, 1 Oct 2026, picker): ⌘N New, ⌘S Save,
// ⇧⌘S Save As, ⇧⌘E Export, with ⌘P (batch 5) unchanged. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=v1.4.2-saved ./run.sh filekeys 150
//
// The owner asked for New / Save / Save As / Export in the installed app's native File menu. That
// menu is CHROME'S (it builds an installed web app's menu bar itself) and no web API adds an item to
// it, so the owner chose the keys instead. In an installed app window Chrome reserves no shortcut,
// so they reach the page before the menu does -- which no headless run can show; this leg proves
// what the page does with them.
//
// Each key CLICKS its button, as Cmd+S and Cmd+P do, so the ROUTING cases record which button a key
// clicked, with HTMLButtonElement.prototype.click intercepted (cmdprint's P5 shape). The END-TO-END
// cases then let the click through.
//
//   K1  ⌘N: default prevented, clicks #new-file-btn
//   K2  ⇧⌘S: default prevented, clicks #save-as-btn (it used to be plain Save)
//   K3  ⇧⌘E: default prevented, clicks #export-btn
//   K4  guard: ⌘S still clicks #save-file-btn, and ⌘P still clicks #export-wf-pdf-btn
//   K5  guard (this is a Mac): ⌃N and ⌃⇧E are NOT taken. They are macOS text navigation (next line,
//       select to the end of the line) inside the note editors; nothing prevented, nothing clicked
//   K6  guard: ⌘E, ⇧⌘N, ⌥⌘N and ⌥⇧⌘E are not taken
//   K7  guard: a held key's repeats do nothing (prevented, nothing clicked)
//   K8  guard: while one of the app's dialogs is open, ⌘N / ⇧⌘S / ⇧⌘E do nothing
//   K9  another platform (navigator reports Windows): Ctrl+N and Ctrl+Shift+E are taken, ⌘N is not
//   K10 end to end, ⇧⌘E: the waterfall writes the Excel workbook; the month view writes the month PDF
//   K11 end to end, ⇧⌘S on a calendar already linked to file A: a second picker, the edited calendar
//       written as a .sptcal into the NEW file B, A left alone, and the next ⌘S writes B
//   K12 end to end, ⌘N with unsaved work: New's own question appears, and "Start new" leaves a blank calendar
//   K13 guard: while the template header editor is up, the keys click nothing. It sits above the
//       dialog tier (z-index 400), so a question opened under it could be neither seen nor answered
//   K14 like a press, the key blurs first: a Manual header line typed but not yet left (it commits on
//       focusout) is IN the file ⇧⌘S writes
//   H1  the Help has a "Keyboard shortcuts" section naming them
//   E0  0 console errors
//
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots: Save As awaits
// recordRecent(), and real IndexedDB never settles in headless Chrome.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'filekeys', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value : null; }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  // A keydown as a keyboard makes it: a held Shift reports the capital letter.
  function press(key, mods, extra) {
    mods = mods || {};
    var init = { key: mods.shift ? key.toUpperCase() : key, code: 'Key' + key.toUpperCase(), bubbles: true, cancelable: true,
                 metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt };
    if (extra) Object.keys(extra).forEach(function (k) { init[k] = extra[k]; });
    var e = new KeyboardEvent('keydown', init);
    document.dispatchEvent(e);
    return e.defaultPrevented;
  }
  // Which button(s) did a key click? Nothing runs: the click itself is recorded, not delivered.
  function route(key, mods, extra) {
    var realClick = HTMLButtonElement.prototype.click, clicked = [], prevented;
    HTMLButtonElement.prototype.click = function () { clicked.push(this.id || this.className); };
    try { prevented = press(key, mods, extra); } finally { HTMLButtonElement.prototype.click = realClick; }
    return { prevented: prevented, clicked: clicked };
  }
  function only(r, id) { return r.prevented === true && r.clicked.length === 1 && r.clicked[0] === id; }
  function untaken(r) { return r.prevented === false && r.clicked.length === 0; }
  function modals() { return document.querySelectorAll('.mantine-Modal-content').length; }
  try {
    out.fsa = typeof window.showSaveFilePicker;
    out.platform = navigator.platform;
    await T.appReady();
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle('the restored calendar to settle');
    var title0 = val('show-title');

    // ---- routing ---------------------------------------------------------------------------------
    var r1 = route('n', { meta: true });
    kase('K1', '⌘N: default prevented, clicks #new-file-btn', only(r1, 'new-file-btn'), { observed: r1 });
    var r2 = route('s', { meta: true, shift: true });
    kase('K2', '⇧⌘S: default prevented, clicks #save-as-btn', only(r2, 'save-as-btn'), { observed: r2 });
    var r3 = route('e', { meta: true, shift: true });
    kase('K3', '⇧⌘E: default prevented, clicks #export-btn', only(r3, 'export-btn'), { observed: r3 });
    var r4s = route('s', { meta: true }), r4p = route('p', { meta: true });
    kase('K4', 'guard: ⌘S still clicks #save-file-btn, ⌘P still clicks #export-wf-pdf-btn (waterfall)',
         only(r4s, 'save-file-btn') && only(r4p, 'export-wf-pdf-btn'), { observed: { cmdS: r4s, cmdP: r4p } });
    var r5n = route('n', { ctrl: true }), r5e = route('e', { ctrl: true, shift: true });
    kase('K5', 'guard (a Mac): ⌃N and ⌃⇧E are left to text navigation -- nothing prevented, nothing clicked',
         out.platform === 'MacIntel' && untaken(r5n) && untaken(r5e), { observed: { platform: out.platform, ctrlN: r5n, ctrlShiftE: r5e } });
    var r6 = { cmdE: route('e', { meta: true }), shiftCmdN: route('n', { meta: true, shift: true }),
               altCmdN: route('n', { meta: true, alt: true }), altShiftCmdE: route('e', { meta: true, shift: true, alt: true }) };
    kase('K6', 'guard: ⌘E, ⇧⌘N, ⌥⌘N and ⌥⇧⌘E are not taken',
         untaken(r6.cmdE) && untaken(r6.shiftCmdN) && untaken(r6.altCmdN) && untaken(r6.altShiftCmdE), { observed: r6 });
    var r7 = { cmdN: route('n', { meta: true }, { repeat: true }), shiftCmdS: route('s', { meta: true, shift: true }, { repeat: true }),
               shiftCmdE: route('e', { meta: true, shift: true }, { repeat: true }) };
    kase('K7', 'guard: a held key’s repeats are prevented and click nothing',
         r7.cmdN.prevented && !r7.cmdN.clicked.length && r7.shiftCmdS.prevented && !r7.shiftCmdS.clicked.length &&
         r7.shiftCmdE.prevented && !r7.shiftCmdE.clicked.length, { observed: r7 });

    // K9 -- another platform's command key. The engine reads the platform per press, so this can
    // stand in for Windows without a reload; the own properties are deleted afterwards and the real
    // getters come back (checked).
    var uad = navigator.userAgentData;
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
    Object.defineProperty(navigator, 'userAgentData', { value: { platform: 'Windows', brands: uad ? uad.brands : [], mobile: false }, configurable: true });
    var r9;
    try {
      r9 = { ctrlN: route('n', { ctrl: true }), ctrlShiftE: route('e', { ctrl: true, shift: true }), cmdN: route('n', { meta: true }) };
    } finally { delete navigator.platform; delete navigator.userAgentData; }
    r9.restored = navigator.platform;
    kase('K9', 'Windows: Ctrl+N and Ctrl+Shift+E are taken, ⌘N (the Windows key) is not',
         only(r9.ctrlN, 'new-file-btn') && only(r9.ctrlShiftE, 'export-btn') && untaken(r9.cmdN) && r9.restored === out.platform, { observed: r9 });

    // ---- K10: ⇧⌘E end to end, in both views -------------------------------------------------------
    await T.sleep(800);                                   // clear the export button's re-click guard
    var cap = T.captureDownload();
    var p10 = press('e', { meta: true, shift: true });
    try { await T.until(function () { return !!cap.peek(); }, 'the Excel workbook', 150, 100); } catch (e) {}
    var blob = cap.stop();
    var head = blob ? await blob.slice(0, 2).text() : null;
    var sheet = { prevented: p10, wrote: !!blob, head: head, type: blob ? blob.type : null, bytes: blob ? blob.size : 0, dialog: T.modalText().slice(0, 120) };

    document.getElementById('view-month-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-week'); }, 'the month view', 200, 100);
    await settle('the month view to settle');
    // Since MONTH-PDF-WRITER-PLAN.md step 5 the month view's export is the direct writer: a file through the Save
    // dialog (stood in for), and no print at all.
    var sp10 = T.fakeSavePicker(), printed = false, realPrint = window.print;
    window.print = function () { printed = true; };
    await T.sleep(800);
    var p10m = press('e', { meta: true, shift: true });
    try { await T.until(function () { return sp10.files.length > 0; }, 'the month PDF written', 200, 100); } catch (e) {}
    window.print = realPrint;
    sp10.restore();
    var f10 = sp10.files[0];
    var month = { prevented: p10m, name: f10 && f10.name, pages: f10 ? T.pdfPages(f10.bytes) : 0, printCalled: printed };
    kase('K10', '⇧⌘E end to end: the waterfall writes the .xlsx, the month view writes the month PDF (one page per month)',
         sheet.prevented && sheet.wrote && sheet.head === 'PK' && month.prevented && !!f10 && f10.closed &&
         /Month Calendar\.pdf$/.test(f10.name || '') && month.pages >= 12 && !printed, { observed: { sheet: sheet, month: month } });
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall again', 200, 100);
    await settle('the waterfall to settle again');

    // ---- K11: ⇧⌘S end to end, on a calendar ALREADY linked to a file ---------------------------
    // ⚠️ It has to be linked first. On an unlinked calendar plain Save opens the picker too, so the
    // two are indistinguishable there (the first draft of this case passed on the build WITHOUT the
    // shortcut). Linked, Save writes back to file A with no picker; Save As must ask for a NEW file
    // B, write the edited calendar into it, leave A alone, and make B the file the next ⌘S writes.
    var W = [], pickerCalls = 0, realPicker = window.showSaveFilePicker;
    window.showSaveFilePicker = async function () {
      pickerCalls++;
      var name = (pickerCalls === 1 ? 'Linked A' : pickerCalls === 2 ? 'Save As B' : 'Save As C') + '.sptcal', txt = '', mtime = Date.now() - 60000;
      var handle = {
        name: name, kind: 'file',
        queryPermission: async function () { return 'granted'; },
        requestPermission: async function () { return 'granted'; },
        isSameEntry: async function (o) { return o === handle; },
        getFile: async function () { return new File([txt], name, { lastModified: mtime }); },
        createWritable: async function () {
          var parts = [];
          return {
            write: async function (c) { parts.push(typeof c === 'string' ? c : (c instanceof Blob ? await c.text() : String((c && c.data) || c))); },
            close: async function () { txt = parts.join(''); mtime = Math.max(Date.now(), mtime + 1000); W.push({ file: name, text: txt }); }
          };
        }
      };
      return handle;
    };
    function savedTitle(w) {
      try { var f = JSON.parse(w.text).fields.byId['show-title']; return f && typeof f === 'object' ? f.value : f; } catch (e) { return undefined; }
    }
    await T.sleep(800);
    press('s', { meta: true });                           // link file A: the first Save asks where
    try { await T.until(function () { return W.length >= 1; }, 'the first Save into A', 150, 100); } catch (e) {}
    await T.sleep(900);
    var titleB = title0 + ' (forked)';
    T.set('show-title', titleB);
    await T.sleep(900);
    var p11 = press('s', { meta: true, shift: true });
    try { await T.until(function () { return W.length >= 2; }, 'the Save As write', 150, 100); } catch (e) {}
    await T.sleep(900);
    var status = ((document.getElementById('save-status') || {}).textContent || '').trim();
    press('s', { meta: true });                           // the next Save: into B now, with no picker
    try { await T.until(function () { return W.length >= 3; }, 'the Save after Save As', 150, 100); } catch (e) {}
    await T.sleep(600);
    var snapB = null;
    try { snapB = W.length >= 2 ? JSON.parse(W[1].text) : null; } catch (e) {}
    var saved = { prevented: p11, pickerCalls: pickerCalls, files: W.map(function (w) { return w.file; }),
                  titles: W.map(savedTitle), firstChar: W.length >= 2 ? W[1].text.charAt(0) : null,
                  version: snapB && snapB.version, idCount: snapB && snapB.fields && snapB.fields.byId ? Object.keys(snapB.fields.byId).length : 0,
                  statusAfterSaveAs: status, menuLabel: ((document.getElementById('file-menu-label') || {}).textContent || '').trim() };
    kase('K11', '⇧⌘S end to end on a linked calendar: a second picker, the edited calendar written into the NEW file as a .sptcal, A left alone, and the next ⌘S writes B',
         p11 && pickerCalls === 2 && W.length === 3 && W[0].file === 'Linked A.sptcal' && W[1].file === 'Save As B.sptcal' &&
         W[2].file === 'Save As B.sptcal' && saved.titles[0] === title0 && saved.titles[1] === titleB && saved.firstChar === '{' &&
         saved.version === 1 && saved.idCount > 0 && !/Unsaved/i.test(status), { observed: saved });

    // ---- K14: the key blurs first, as a press does -------------------------------------------------
    // A Manual header line commits on FOCUSOUT. A real click on Save As moves focus off the line
    // first; a key moves nothing, so without the blur the file would lack what was just typed.
    async function chooseMode(mode) {
      var b = document.getElementById('tb-hdr-mode-btn');
      if (!b) throw new Error('no toolbar Header button');
      if (!document.querySelector('.hdr-mode-pop')) b.click();
      await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the mode menu', 40, 100);
      var row = null;
      document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function (r) {
        if (((r.querySelector('.hdr-mode-name') || {}).textContent || '') === mode) row = r;
      });
      if (!row) throw new Error('no "' + mode + '" row in the mode menu');
      row.click();
      await T.sleep(700);
    }
    await chooseMode('Manual');
    var line = document.querySelector('#table-wrap .hdr-line[data-hid][contenteditable="true"]');
    var typed = 'KEYED HEADER EDIT', hid = line ? line.dataset.hid : null;
    if (line) { line.focus(); line.textContent = typed; }
    var focusedBefore = !!line && document.activeElement === line;
    await T.sleep(300);
    var n14 = W.length;
    var p14 = press('s', { meta: true, shift: true });
    try { await T.until(function () { return W.length > n14; }, 'the Save As write from a header line', 150, 100); } catch (e) {}
    await T.sleep(600);
    window.showSaveFilePicker = realPicker;
    var snap14 = null;
    try { snap14 = W.length > n14 ? JSON.parse(W[W.length - 1].text) : null; } catch (e) {}
    var k14 = { prevented: p14, hid: hid, focusedBefore: focusedBefore, file: W.length > n14 ? W[W.length - 1].file : null,
                headerMode: snap14 && snap14.headerMode, savedLine: snap14 && snap14.headerManual ? snap14.headerManual[hid] : undefined };
    kase('K14', 'like a press, the key blurs first: a Manual header line typed but not yet left is IN the file ⇧⌘S writes',
         p14 && !!hid && focusedBefore && k14.file === 'Save As C.sptcal' && k14.headerMode === 'manual' && k14.savedLine === typed,
         { observed: k14 });

    // ---- K13: the template header editor is up --------------------------------------------------
    var stalePop = document.querySelector('.hdr-mode-pop');
    if (stalePop) stalePop.remove();
    document.getElementById('tb-hdr-mode-btn').click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-peek'); }, 'the mode popover', 40, 100);
    document.querySelector('.hdr-mode-peek').click();
    await T.until(function () { return !!document.querySelector('.hde-overlay'); }, 'the header editor', 60, 100);
    await T.sleep(400);
    var r13 = { cmdN: route('n', { meta: true }), shiftCmdS: route('s', { meta: true, shift: true }), shiftCmdE: route('e', { meta: true, shift: true }) };
    r13.modals = modals();
    kase('K13', 'guard: while the template header editor is up (it sits above the dialogs), ⌘N / ⇧⌘S / ⇧⌘E click nothing',
         !r13.cmdN.clicked.length && !r13.shiftCmdS.clicked.length && !r13.shiftCmdE.clicked.length && r13.modals === 0, { observed: r13 });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await T.until(function () { return !document.querySelector('.hde-overlay'); }, 'the header editor to close', 60, 100);

    // ---- K8: no shortcut acts while one of the app's dialogs is open -------------------------------
    T.set('show-title', title0 + ' (edited)');
    await T.sleep(900);
    await T.sleep(800);                                   // clear New's re-click guard
    document.getElementById('new-file-btn').click();
    await T.until(function () { return /Start a new blank calendar/.test(T.modalText()); }, 'New’s question', 60, 100);
    var r8 = { cmdN: route('n', { meta: true }), shiftCmdS: route('s', { meta: true, shift: true }), shiftCmdE: route('e', { meta: true, shift: true }) };
    await T.sleep(300);
    r8.modals = modals();
    kase('K8', 'guard: while a dialog is open, ⌘N / ⇧⌘S / ⇧⌘E click nothing (and open no second dialog)',
         !r8.cmdN.clicked.length && !r8.shiftCmdS.clicked.length && !r8.shiftCmdE.clicked.length && r8.modals === 1, { observed: r8 });
    T.clickModalButton('Cancel');
    await T.until(function () { return modals() === 0; }, 'the dialog to close', 60, 100);

    // ---- K12: ⌘N end to end, with unsaved work -----------------------------------------------------
    var before12 = { title: val('show-title'), prod: val('start-production') };
    await T.sleep(800);
    var p12 = press('n', { meta: true });
    var asked = false;
    try { await T.until(function () { return /Start a new blank calendar/.test(T.modalText()); }, 'New’s question after ⌘N', 60, 100); asked = true; } catch (e) {}
    var question = T.modalText().slice(0, 160);
    if (asked) T.clickModalButton('Start new');
    try { await T.until(function () { return val('show-title') === '' && !!document.querySelector('#table-wrap .empty-state'); }, 'a blank calendar', 60, 100); } catch (e) {}
    var after12 = { title: val('show-title'), prod: val('start-production'), empty: !!document.querySelector('#table-wrap .empty-state'), modals: modals() };
    kase('K12', '⌘N end to end: New’s question appears over unsaved work, and "Start new" leaves a blank calendar',
         p12 && asked && before12.title !== '' && before12.prod !== '' && after12.title === '' && after12.prod === '' && after12.empty && after12.modals === 0,
         { observed: { prevented: p12, asked: asked, question: question, before: before12, after: after12 } });

    var help = (document.getElementById('help-overlay') || {}).textContent || '';
    var keys = ['⌘N', '⌘S', '⇧⌘S', '⇧⌘E', '⌘P'];
    kase('H1', 'the Help has a Keyboard shortcuts section naming ⌘N, ⌘S, ⇧⌘S, ⇧⌘E and ⌘P',
         /Keyboard shortcuts/.test(help) && keys.every(function (k) { return help.indexOf(k) >= 0; }),
         { observed: { section: /Keyboard shortcuts/.test(help), missing: keys.filter(function (k) { return help.indexOf(k) < 0; }) } });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'filekeys threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
