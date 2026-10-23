// dlgkeys -- ⌘S, ⌘Z and ⇧⌘Z while one of the app's dialogs is open (19 Oct 2026). A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh dlgkeys 240
//
// The engine's global keydown handler let plain ⌘S click Save, and ⌘Z / ⇧⌘Z run undo() / redo(), under
// any of the app's dialogs. Only ⇧⌘S, ⌘N, ⇧⌘E and ⌘P checked appDialogOpen(). Mantine traps focus inside
// the modal on one of its buttons, which is not an editable field, so the in-field exemption never
// applied and the app's own undo ran underneath the question. Found, with real key presses in the pane:
//
//   * ⌘Z under "Remove hiatus?", then Remove: the hiatus was NOT removed. undo() rebuilds the hiatus
//     rows, and the handler then removed the row it held, which was no longer in the document.
//   * ⌘Z under "Remove phase?", then Remove: a GHOST ROW. The phase left the calendar and
//     customPhaseDefs, but its rebuilt row stayed in the sidebar, where editing it changed nothing.
//   * ⌘S under the Region's "Continue?" on a linked file changed on disk: Save's own question replaced
//     it, which answers the open one as Cancel, so the Region change the user was being asked about
//     was dropped without their answering it.
//
// Every probe opens one dialog, presses ⌘S, ⌘Z and ⇧⌘Z (in that order, each on the focused element so
// it bubbles as a real key does), and then answers it. A probe passes when each key was prevented and
// did nothing (no Save, no write, no undo, no redo, the same question still up) and the answer then did
// what it says. Before the fix D1-D12 are all red: every probe on its key checks, and D1, D2, D11 and D12
// on what the question was about as well.
//
//   D1  Remove hiatus?  -> Remove: the hiatus is gone
//   D2  Remove phase?   -> Remove: the row is gone from the sidebar, and the phase from the calendar
//   D3  the Region's "Continue?" -> Continue: the new Region applies
//   D4  a holiday's Enable box, "Recompute?" -> Continue: the holiday is off
//   D5  Add a custom holiday, "Recompute?" -> Continue: it is added
//   D6  Remove holiday? -> Remove: it is gone
//   D7  Reset holidays? -> Cancel: nothing changed
//   D8  New's question  -> Cancel: the calendar is untouched
//   D9  Load's question -> Cancel: no picker, the calendar is untouched
//   D10 File changed on disk -> Overwrite: the file gets the calendar the user was asked about
//   D11 ⌘S under the Region's "Continue?" on a file changed on disk: the Region question stays up, and
//       Continue applies the Region (before: Save's question replaced it, as Cancel)
//   D12 the template header editor (.hde-overlay, above the modal tier): ⌘S and ⌘Z on its Close button do
//       nothing (before: ⌘Z put the header back in Auto with the editor still open)
//   X1  KEPT: with focus in the editor's template field, ⌘Z is left to the field (not prevented)
//   X2  KEPT: with no dialog, focus in a sidebar field, ⌘Z is left to the field (not prevented, no undo)
//   X3  KEPT: with no dialog, ⌘Z undoes, ⇧⌘Z redoes and ⌘S saves, as before
//   E0  0 console errors
//
// ⛔ memoryIDB() runs synchronously, here at the top, before the engine boots: Save awaits recordRecent(),
// and real IndexedDB never settles in headless Chrome.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'dlgkeys', cases: [], observed: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function title() { return document.getElementById('show-title').value; }
  function region() { return document.getElementById('union-place').value; }
  function q() { return T.modalText(); }
  function writtenTitle(w) { try { return JSON.parse(w.text).fields.byId['show-title'].value; } catch (e) { return '(unparseable)'; } }
  function theirs(base, t) { var o = JSON.parse(base); o.fields.byId['show-title'] = { value: t }; return JSON.stringify(o, null, 1); }
  // A keydown as a keyboard makes it: sent to whatever has focus, so it bubbles to the document. A held
  // Shift reports the capital letter.
  function press(key, mods) {
    mods = mods || {};
    var e = new KeyboardEvent('keydown', { key: mods.shift ? key.toUpperCase() : key, code: 'Key' + key.toUpperCase(),
      bubbles: true, cancelable: true, metaKey: true, shiftKey: !!mods.shift });
    (document.activeElement || document).dispatchEvent(e);
    return e.defaultPrevented;
  }
  async function waitModal(re) {
    for (var g = 0; g < 40; g++) { if (re ? re.test(q()) : !!q()) return true; await T.sleep(100); }
    return false;
  }
  async function waitNoModal() {
    for (var g = 0; g < 40; g++) { if (!q()) return true; await T.sleep(100); }
    return false;
  }
  // Where a user's focus is while a question is up: Mantine traps it on the dialog's autofocus button
  // (seen in the pane). Headless Chrome leaves it on <body>, so it is put there by hand. Neither is an
  // editable field, which is why the in-field exemption never applied.
  function focusDialog() {
    var b = document.querySelector('.mantine-Modal-content [data-autofocus]') || document.querySelector('.mantine-Modal-content button');
    if (b) b.focus();
    var a = document.activeElement || {};
    return (a.tagName || '') + ':' + String(a.textContent || '').trim().slice(0, 20);
  }
  function blur() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  // An ordinary edit, banked as its own undo step, for ⌘Z to take if it runs.
  async function step(mark) {
    blur();
    T.set('show-title', mark);
    await T.sleep(900);
    blur();
  }
  var writes = [], ctl = {}, saves = 0, picker;
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#save-file-btn')) saves++;
  }, true);

  // Opens one dialog, presses ⌘S, ⌘Z and ⇧⌘Z under it, answers it, and reports what each did.
  async function probe(id, label, open, re, answer, outcome) {
    var mark = 'Probe ' + id;
    await step(mark);
    await open();
    var asked = await waitModal(re);
    var w0 = writes.length, s0 = saves, p0 = picker.calls.length;   // after the question is up: D10's opens it with Save
    // The whole form, not just the title: under D5's question the newest undo step is the typed holiday
    // name, so an undo there leaves the title alone (mutant M2 was green on D5 until this compared both).
    var sig0 = JSON.stringify(T.formSignature());
    var question = q();
    var o = { asked: asked, question: question.slice(0, 90), focus: focusDialog() };
    o.cmdS = { prevented: press('s') };
    await T.sleep(900);
    o.cmdS.saveClicked = saves - s0; o.cmdS.written = writes.length - w0; o.cmdS.pickers = picker.calls.length - p0;
    o.cmdS.sameQuestion = q() === question; o.cmdS.dialog = q().slice(0, 90);
    o.cmdZ = { prevented: press('z') };
    await T.sleep(400);
    o.cmdZ.title = title(); o.cmdZ.sameQuestion = q() === question; o.cmdZ.sameForm = JSON.stringify(T.formSignature()) === sig0;
    o.shiftCmdZ = { prevented: press('z', { shift: true }) };
    await T.sleep(400);
    o.shiftCmdZ.title = title(); o.shiftCmdZ.sameQuestion = q() === question; o.shiftCmdZ.sameForm = JSON.stringify(T.formSignature()) === sig0;
    var keysInert = asked && o.cmdS.prevented && !o.cmdS.saveClicked && !o.cmdS.written && !o.cmdS.pickers && o.cmdS.sameQuestion &&
                    o.cmdZ.prevented && o.cmdZ.title === mark && o.cmdZ.sameForm && o.cmdZ.sameQuestion &&
                    o.shiftCmdZ.prevented && o.shiftCmdZ.title === mark && o.shiftCmdZ.sameForm && o.shiftCmdZ.sameQuestion;
    o.answered = T.clickModalButton(answer);
    if (!o.answered) T.clickModalButton(/^Cancel/);          // whatever replaced it: leave nothing up
    await waitNoModal();
    await T.sleep(900);
    var res = await outcome(mark);
    o.outcome = res.observed;
    o.keysInert = keysInert;
    out.observed[id] = o;
    kase(id, label, keysInert && o.answered && res.pass === true, { observed: o });
    blur();
  }

  try {
    picker = T.fakeSavePicker();
    var p = T.openViaFakePicker('/tests/fixtures/v1.4.2-saved.sptcal', 'v1.4.2-saved.sptcal', { writes: writes, control: ctl });
    for (var g = 0; g < 40; g++) { await T.sleep(100); if (/Load another calendar/.test(q())) { T.clickModalButton('Load'); break; } }
    await p;
    await T.until(function () { return title() === 'Test Show' && !q(); }, 'v1.4.2-saved loaded through the picker', 100, 100);
    await T.sleep(1500);
    var base = ctl.text();
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap td.sheet-note-cell'); }, 'the waterfall', 100, 100);
    // A note edit, with Production scheduled, is what makes a Region or holiday change ask first.
    var noteWeek = document.querySelector('#table-wrap td.sheet-note-cell').dataset.week;
    await T.typeUserNote(noteWeek, 'A note the Region could misplace');
    out.noteWeek = noteWeek;

    // ---- X2 + X3: what the keys do with no dialog up, which must not change -----------------------------
    await step('Before X');
    await step('X step');
    var st = document.getElementById('show-title');
    st.focus();
    var x2 = { prevented: press('z'), title: title() };
    kase('X2', 'KEPT: no dialog, focus in a sidebar field: ⌘Z is left to the field (not prevented, no app undo)',
         x2.prevented === false && x2.title === 'X step', { observed: x2 });
    blur();
    var w0 = writes.length;
    var x3 = { undo: { prevented: press('z') } };
    await T.sleep(400); x3.undo.title = title();
    x3.redo = { prevented: press('z', { shift: true }) };
    await T.sleep(400); x3.redo.title = title();
    x3.save = { prevented: press('s') };
    await T.until(function () { return writes.length > w0; }, 'the ⌘S write', 40, 100).catch(function () {});
    x3.save.written = writes.length - w0; x3.save.writtenTitle = writes.length > w0 ? writtenTitle(writes[writes.length - 1]) : null;
    kase('X3', 'KEPT: no dialog: ⌘Z undoes, ⇧⌘Z redoes, ⌘S saves the linked file',
         x3.undo.prevented && x3.undo.title === 'Before X' && x3.redo.prevented && x3.redo.title === 'X step' &&
         x3.save.prevented && x3.save.written === 1 && x3.save.writtenTitle === 'X step', { observed: x3 });
    await T.sleep(600);

    // ---- D1: Remove hiatus? ---------------------------------------------------------------------------
    function hiatusStarts() { return [].map.call(document.querySelectorAll('#hiatus-list .hiatus-entry .hiatus-start'), function (e) { return e.value; }); }
    document.getElementById('sidetab-phases').click();
    await T.sleep(300);
    var h0 = hiatusStarts();
    await probe('D1', 'Remove hiatus? -- the keys do nothing, and Remove removes the hiatus',
      async function () { document.querySelector('#hiatus-list .hiatus-entry .remove-hiatus').click(); },
      /Remove this hiatus/, 'Remove',
      async function () { var h = hiatusStarts(); return { pass: h.length === h0.length - 1 && h.indexOf(h0[0]) < 0, observed: { before: h0, after: h } }; });

    // ---- D2: Remove phase? ----------------------------------------------------------------------------
    document.getElementById('add-phase-btn').click();
    await T.sleep(400);
    var rows = document.querySelectorAll('.phase-row[data-key^="custom"]');
    var ck = rows[rows.length - 1].dataset.key;
    T.set('start-' + ck, '2026-09-07');
    if (document.getElementById('weeks-' + ck)) T.set('weeks-' + ck, '4');
    var nm = document.querySelector('.phase-row[data-key="' + ck + '"] .phase-name-input');
    nm.value = 'Ghost Test'; nm.dispatchEvent(new Event('input', { bubbles: true })); nm.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(900);
    var inGrid0 = /Ghost Test/.test(document.getElementById('table-wrap').innerText);
    await probe('D2', 'Remove phase? -- the keys do nothing, and Remove takes the row out of the sidebar and the phase off the calendar',
      async function () { document.querySelector('.phase-row[data-key="' + ck + '"] .remove-custom-phase').click(); },
      /Remove this phase/, 'Remove',
      async function () {
        var left = document.querySelectorAll('.phase-row[data-key="' + ck + '"]').length;
        var inGrid = /Ghost Test/.test(document.getElementById('table-wrap').innerText);
        return { pass: inGrid0 && left === 0 && !inGrid, observed: { key: ck, inGridBefore: inGrid0, rowsLeftInSidebar: left, onCalendar: inGrid } };
      });

    // ---- D3: the Region's "Continue?" -----------------------------------------------------------------
    document.getElementById('sidetab-show').click();
    await T.sleep(300);
    var r0 = region(), r1 = r0 === 'us-new-york' ? 'us-los-angeles' : 'us-new-york';
    await probe('D3', 'the Region’s “Continue?” -- the keys do nothing, and Continue applies the new Region',
      async function () { T.set('union-place', r1); },
      /Production Region/, 'Continue',
      async function () { return { pass: region() === r1, observed: { from: r0, want: r1, now: region() } }; });

    // ---- D4-D7: the holiday questions -----------------------------------------------------------------
    // The holidays are in the Settings window's Region tab since ruling 12 merged (20 Oct 2026); this clicked the
    // sidebar's Settings tab, which the window retired.
    await T.openSettings('region');
    await T.sleep(400);
    var en = document.querySelector('#holiday-vis .hv-en:checked'), hid = en && en.dataset.hid;
    function enBox() { return document.querySelector('#holiday-vis .hv-en[data-hid="' + hid + '"]'); }
    await probe('D4', 'a holiday’s Enable box asks “Recompute?” -- the keys do nothing, and Continue switches it off',
      async function () { enBox().click(); },
      /Changing which holidays apply/, 'Continue',
      async function () { var b = enBox(); return { pass: !!b && b.checked === false, observed: { hid: hid, checked: b && b.checked } }; });
    function customDel() {
      return [].filter.call(document.querySelectorAll('#holiday-vis .hv-del'), function (b) {
        var r = b.closest('tr, .hv-row, li, div'); return r && /Dialog Day/.test(r.textContent || '');
      })[0] || null;
    }
    await probe('D5', 'Add a custom holiday asks “Recompute?” -- the keys do nothing, and Continue adds it',
      async function () { T.set('custom-hol-name', 'Dialog Day'); T.set('custom-hol-date', '2026-11-04'); document.getElementById('custom-hol-add').click(); },
      /Changing which holidays apply/, 'Continue',
      async function () { return { pass: !!customDel(), observed: { added: !!customDel() } }; });
    await probe('D6', 'Remove holiday? -- the keys do nothing, and Remove removes it',
      async function () { customDel().click(); },
      /Remove the custom holiday/, 'Remove',
      async function () { return { pass: !customDel(), observed: { stillThere: !!customDel() } }; });
    await probe('D7', 'Reset holidays? -- the keys do nothing, and Cancel changes nothing',
      async function () { document.getElementById('holiday-reset-btn').click(); },
      /Re-enable every holiday/, 'Cancel',
      async function (mark) { var b = enBox(); return { pass: !!b && b.checked === false && title() === mark, observed: { stillOff: b && !b.checked, title: title() } }; });

    // ---- D8, D9: New's and Load's questions -----------------------------------------------------------
    await T.closeSettings();                              // back to the sidebar, as the leg was before the window
    await T.sleep(800);                                   // clear the file actions' re-click guard
    await probe('D8', 'New’s question -- the keys do nothing, and Cancel leaves the calendar as it was',
      async function () { document.getElementById('new-file-btn').click(); },
      /Start a new blank calendar/, 'Cancel',
      async function (mark) { return { pass: title() === mark && region() === r1, observed: { title: title(), region: region() } }; });
    var opened = 0, realOpen = window.showOpenFilePicker;
    window.showOpenFilePicker = async function () { opened++; throw new DOMException('test', 'AbortError'); };
    await T.sleep(800);
    await probe('D9', 'Load’s question -- the keys do nothing, and Cancel opens no picker and leaves the calendar as it was',
      async function () {
        document.querySelector('.file-menu-btn').click();
        await T.until(function () { return !!document.querySelector('#file-menu .file-menu-item[data-action="open"]'); }, 'Load…', 60, 100);
        document.querySelector('#file-menu .file-menu-item[data-action="open"]').click();
      },
      /Load another calendar/, 'Cancel',
      async function (mark) { return { pass: opened === 0 && title() === mark, observed: { pickers: opened, title: title() } }; });
    window.showOpenFilePicker = realOpen;
    document.body.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await T.sleep(400);

    // ---- D10: the file-conflict choice itself ---------------------------------------------------------
    ctl.touch(theirs(base, 'Someone else’s title'));
    var wD10 = writes.length;
    await probe('D10', 'File changed on disk -- the keys do nothing, and Overwrite writes the calendar the user was asked about',
      async function () { document.getElementById('save-file-btn').click(); },
      /changed on disk/i, 'Overwrite',
      async function (mark) {
        var w = writes.slice(wD10);
        return { pass: w.length === 1 && writtenTitle(w[0]) === mark, observed: { writes: w.map(writtenTitle) } };
      });
    await T.sleep(600);

    // ---- D11: ⌘S under the Region question, on a file changed on disk ---------------------------------
    // The one route by which ⌘S answered an open question for the user: Save asks its own, and a second
    // dialog answers the first as Cancel (Dialogs.jsx).
    await step('Probe D11');
    ctl.touch(theirs(ctl.text(), 'Someone else’s title again'));
    var wD11 = writes.length, rD11 = region(), rWant = rD11 === 'us-new-york' ? 'us-los-angeles' : 'us-new-york';
    document.getElementById('sidetab-show').click();
    await T.sleep(300);
    T.set('union-place', rWant);
    var d11 = { asked: await waitModal(/Production Region/) };
    d11.focus = focusDialog();
    d11.prevented = press('s');
    await T.sleep(1200);
    d11.dialogAfterCmdS = q().slice(0, 90);
    d11.regionQuestionStillUp = /Production Region/.test(q());
    d11.conflictQuestionUp = /changed on disk/i.test(q());
    d11.continued = T.clickModalButton('Continue');
    if (!d11.continued) T.clickModalButton(/^Cancel/);
    await waitNoModal();
    await T.sleep(900);
    d11.region = region(); d11.written = writes.length - wD11;
    out.observed.D11 = d11;
    kase('D11', '⌘S under the Region’s “Continue?”, file changed on disk: the question stays up and Continue applies the Region (Save’s own question must not answer it as Cancel)',
         d11.asked && d11.prevented && d11.regionQuestionStillUp && !d11.conflictQuestionUp && d11.continued && d11.region === rWant && d11.written === 0,
         { observed: d11 });
    // Settle the conflict so nothing below meets it.
    document.getElementById('save-file-btn').click();
    if (await waitModal(/changed on disk/i)) T.clickModalButton('Overwrite');
    await waitNoModal();
    await T.sleep(900);

    // ---- D12 + X1: the template header editor --------------------------------------------------------
    var modeBtn = function () { return document.getElementById('hdr-mode-btn'); };
    var mode0 = (modeBtn().textContent || '').trim();
    await step('Probe D12');
    var stale = document.querySelector('.hdr-mode-pop'); if (stale) stale.remove();
    modeBtn().click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-peek'); }, 'the header mode popover', 40, 100);
    document.querySelector('.hdr-mode-peek').click();
    await T.until(function () { return !!document.querySelector('.hde-overlay'); }, 'the header editor', 60, 100);
    await T.sleep(1000);                                  // opening switched the header to Template: one undo step, banked
    var d12 = { modeBefore: mode0, modeOpen: (modeBtn().textContent || '').trim() };
    document.querySelector('.hde-overlay .hde-close').focus();
    var wD12 = writes.length, sD12 = saves;
    d12.cmdS = { prevented: press('s') };
    await T.sleep(900);
    d12.cmdS.saveClicked = saves - sD12; d12.cmdS.written = writes.length - wD12;
    d12.cmdZ = { prevented: press('z') };
    await T.sleep(500);
    d12.cmdZ.mode = (modeBtn().textContent || '').trim(); d12.cmdZ.title = title(); d12.cmdZ.editorUp = !!document.querySelector('.hde-overlay');
    out.observed.D12 = d12;
    kase('D12', 'the template header editor: ⌘S and ⌘Z on its Close button do nothing (no Save, no undo of the Template switch under it)',
         d12.modeOpen === 'Header: Template' && d12.cmdS.prevented && !d12.cmdS.saveClicked && !d12.cmdS.written &&
         d12.cmdZ.prevented && d12.cmdZ.mode === 'Header: Template' && d12.cmdZ.title === 'Probe D12' && d12.cmdZ.editorUp,
         { observed: d12 });
    var tpl = document.querySelector('.hde-overlay .hde-tpl');
    var x1 = { field: !!tpl, modeBefore: (modeBtn().textContent || '').trim(), titleBefore: title() };
    if (tpl) { tpl.focus(); x1.focused = document.activeElement === tpl; x1.prevented = press('z'); }
    await T.sleep(400);
    x1.mode = (modeBtn().textContent || '').trim(); x1.title = title();
    kase('X1', 'KEPT: in the editor’s template field, ⌘Z is left to the field (not prevented, no app undo)',
         x1.field && x1.focused && x1.prevented === false && x1.mode === x1.modeBefore && x1.title === x1.titleBefore, { observed: x1 });
    var close = document.querySelector('.hde-overlay .hde-close'); if (close) close.click();
    await T.sleep(500);

    out.health = T.appHealth();
    kase('E0', '0 console errors', out.health.errors.length === 0, { observed: out.health.errors });
  } catch (err) {
    out.EX = String(err && err.stack || err);
    kase('EX', 'the leg ran to the end', false, { observed: out.EX });
  }
  if (picker) picker.restore();
  T.done(out);
})(); });
