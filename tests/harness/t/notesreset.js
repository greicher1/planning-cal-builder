// notesreset -- the two notes resets ASK FIRST, and each clears the notes its own view shows (audit item 3.5,
// AUD2-054 + AUD2-070, 14 Nov 2026). A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh notesreset 400
//
// AUD2-054: "Reset Waterfall Notes" / "Reset Month Notes" sit in the app header beside Export PDF, and one press
// wiped every note at once with no word (44 waterfall notes to 4 on the audit's calendar), while New, Load, Delete
// scenario and Reset holidays all ask first. Autosave then wrote the wiped calendar ten minutes later. Default applied
// (no decision needed): ask first, as Reset holidays does (uiConfirm, danger style, the number of notes in the text),
// and skip the question when there is nothing to clear -- a press then does nothing at all.
// AUD2-070: a note linked to a phase from the MONTH view ("Stays with: Production", Show in waterfall off, so
// sheetHidden) was deleted by Reset Waterfall Notes, where it never showed, and survived Reset Month Notes. Default
// applied: each reset clears the linked notes its own view shows.
//
// The calendar: the reference calendar (T.buildFixture), reloaded with a waterfall note "Table read" (7/13/26), a note
// linked to Production's week 2 that the waterfall shows ("Linked read", 7/6/26), a month day note "Camera test"
// (7/8/26) and a month-only note linked to Production's 3rd shoot day ("Crew BBQ", 7/1/26: the audit's own case).
//
//   Q0  a fresh calendar: each reset, in its own view, asks nothing and changes nothing (the file stays unmodified)
//   W1  Reset Waterfall Notes asks ONE question, "Reset Waterfall Notes", naming 2 waterfall notes, with a red Reset;
//       nothing is cleared while it is up
//   W2  ⌘Z under that question does nothing (the app's dialog guard): the question stays, the title edit stays
//   W3  Cancel changes nothing: both waterfall notes and both month notes are still there
//   W4  Reset clears the waterfall's notes (Table read, Linked read) in both views and LEAVES the month-only linked
//       note Crew BBQ and the day note Camera test (AUD2-070's first half)
//   W5  one Undo brings both waterfall notes back, and nothing else (the title edit stays)
//   W6  pressed again with nothing of the waterfall's left: no question, nothing changes
//   M1  in the Month view, Reset Month Notes asks ONE question, "Reset Month Notes", naming 2 notes added in the Month
//       view, with a red Reset; Cancel changes nothing
//   M2  Reset deletes Camera test AND Crew BBQ (AUD2-070's second half); the waterfall notes stay in both views
//   M3  one Undo brings both back
//   M4  reloaded with nothing added in the Month view and one automatic note recoloured there: the question asks to
//       "Return 1 note in the Month view to automatic colours and places", deleting nothing; Reset
//   M5  then a press asks nothing (the colour was cleared)
//   E0  no console errors, no native alert
//
// Red on 2089aa5 (before the fix): Q0 (a press on the empty calendar marked the file "Unsaved changes"), W1, W2, W3
// (no question: the first press cleared everything at once), W4 (Crew BBQ deleted), M1, M2 (Crew BBQ left on the
// calendar), M4. W5, W6, M3, M5 and E0 hold what must not change.
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases, log: {}};
  function add(id, title, pass, observed, expected) {
    cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected});
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function toMonth(re) {
    var g = 0, pl = null;
    while (g++ < 40) { var l0 = (q('.mv-monthyear') || {}).textContent; if (l0 === pl) break; pl = l0; byId('mv-prev').click(); await T.sleep(120); }
    g = 0; while (g++ < 40 && !re.test((q('.mv-monthyear') || {}).textContent)) { byId('mv-next').click(); await T.sleep(120); }
  }
  async function view(v) {
    byId(v === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return v === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, v + ' view', 100, 100);
    await settle();
    if (v === 'month') await toMonth(/July 2026/);
  }
  var NOTES = /Crew BBQ|Camera test|Table read|Linked read/;
  function mvNotes() {
    return qa('.mv-note-block[data-note-day]').map(function (b) { return b.dataset.noteDay + ' ' + (b.textContent || '').replace(/[↻⚑]/g, '').trim(); })
      .filter(function (n) { return NOTES.test(n); }).sort();
  }
  function mvHas(s) { return mvNotes().some(function (n) { return n.indexOf(s) >= 0; }); }
  function cell(wk) { var td = q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); return td ? (td.innerText || '').replace(/\s+/g, ' ').trim() : null; }
  function wfNotes() { return {jul6: cell('2026-07-06'), jul13: cell('2026-07-13')}; }
  function wfHas(s) { var w = wfNotes(); return (w.jul6 || '').indexOf(s) >= 0 || (w.jul13 || '').indexOf(s) >= 0; }
  function status() { return ((byId('save-status') || {}).textContent || '').trim(); }
  function resetBtn() { return byId('tb-notes-reset-btn'); }
  function label() { var b = resetBtn(); return b ? (b.textContent || '').trim() : null; }
  function modals() { return qa('.mantine-Modal-content').filter(function (d) { return !d.closest('.export-pdf-dlg'); }); }
  async function waitModal() { for (var g = 0; g < 30; g++) { if (T.modalText()) return true; await T.sleep(100); } return false; }
  async function waitNoModal() { for (var g = 0; g < 30; g++) { if (!T.modalText()) return true; await T.sleep(100); } return false; }
  // The question's facts, read while it is up: its text, how many, and whether its Reset is the danger colour.
  function question() {
    var m = modals(), b = null;
    if (m.length) b = qa('button', m[0]).filter(function (x) { return (x.innerText || x.textContent || '').trim() === 'Reset'; })[0] || null;
    return {count: m.length, text: T.modalText(), resetDanger: !!b && /danger/.test(b.getAttribute('style') || '')};
  }
  // A keydown as a keyboard makes it: sent to whatever has focus (Mantine's autofocus button), so it bubbles.
  function press(key) {
    var b = q('.mantine-Modal-content [data-autofocus]') || q('.mantine-Modal-content button');
    if (b) b.focus();
    var e = new KeyboardEvent('keydown', {key: key, code: 'Key' + key.toUpperCase(), bubbles: true, cancelable: true, metaKey: true});
    (document.activeElement || document).dispatchEvent(e);
    return e.defaultPrevented;
  }
  function blur() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  // Press the header's reset; report the question it asked (if any) a moment later.
  async function pressReset() {
    blur();
    await T.sleep(700);
    resetBtn().click();
    var asked = await waitModal();
    return {asked: asked, q: question()};
  }
  async function answer(label) {
    var ok = T.clickModalButton(label);
    await waitNoModal();
    await settle();
    return ok;
  }
  try {
    await T.appReady();
    await T.sleep(800);

    // ---- Q0: a fresh calendar, nothing to clear ---------------------------------------------------------------
    await T.until(function () { return !!resetBtn(); }, 'the reset button', 100, 100);
    var q0 = {sheet: {label: label(), statusBefore: status()}};
    var p0 = await pressReset(); await T.sleep(600);
    q0.sheet.asked = p0.asked; q0.sheet.text = p0.q.text; q0.sheet.statusAfter = status();
    if (p0.asked) T.clickModalButton(/^Cancel/);
    byId('view-month-btn').click(); await T.sleep(1200);
    q0.month = {label: label(), statusBefore: status()};
    var p0m = await pressReset(); await T.sleep(600);
    q0.month.asked = p0m.asked; q0.month.text = p0m.q.text; q0.month.statusAfter = status();
    if (p0m.asked) T.clickModalButton(/^Cancel/);
    byId('view-sheet-btn').click(); await T.sleep(800);
    add('Q0', 'a fresh calendar: each reset, in its own view, asks nothing and changes nothing (the file stays unmodified)',
      q0.sheet.label === 'Reset Waterfall Notes' && !q0.sheet.asked && q0.sheet.statusAfter === q0.sheet.statusBefore
        && q0.month.label === 'Reset Month Notes' && !q0.month.asked && q0.month.statusAfter === q0.month.statusBefore,
      q0, 'no question; the status unchanged in both views');

    // ---- the calendar ------------------------------------------------------------------------------------------
    T.buildFixture();
    await T.until(function () { return !!q('#table-wrap table.sheet-table'); }, 'the grid', 100, 100);
    await settle();
    await T.reloadWith(function (s) {
      s.userNotes = {'2026-07-13': {text: 'Table read'}};
      s.phaseNotes = {'production@2': {text: 'Linked read'}, 'production@day3': {text: 'Crew BBQ', sheetHidden: true}};
      s.dayNotes = {'2026-07-08': [{text: 'Camera test'}]};
    }, 'notesreset');
    await settle();
    await view('month');
    var m0 = mvNotes();
    await view('sheet');
    var w0 = wfNotes();
    out.log.start = {month: m0, waterfall: w0};
    if (!(m0.length === 4 && /Linked read/.test(w0.jul6 || '') && /Table read/.test(w0.jul13 || '') && !wfHas('Crew BBQ')))
      throw new Error('the calendar did not load as seeded: ' + JSON.stringify(out.log.start));

    // An ordinary edit first, its own undo step, for ⌘Z to take if it ran under the question.
    blur(); T.set('show-title', 'Mark W'); await T.sleep(900); blur();

    // ---- W1-W3: the waterfall's question, ⌘Z under it, Cancel --------------------------------------------------
    var w1 = await pressReset();
    w1.label = label(); w1.waterfall = wfNotes();
    add('W1', 'Reset Waterfall Notes asks ONE question, "Reset Waterfall Notes", naming 2 waterfall notes, with a red Reset; nothing is cleared while it is up',
      w1.asked && w1.q.count === 1 && /Reset Waterfall Notes/.test(w1.q.text) && /\b2 waterfall notes\b/.test(w1.q.text)
        && /Undo brings them back/.test(w1.q.text) && w1.q.resetDanger && /Table read/.test(w1.waterfall.jul13 || '') && /Linked read/.test(w1.waterfall.jul6 || ''),
      w1, 'one danger question naming 2 waterfall notes; both notes still drawn');
    var w2 = {prevented: press('z')};
    await T.sleep(500);
    w2.sameQuestion = T.modalText() === w1.q.text; w2.title = byId('show-title').value;
    add('W2', '⌘Z under that question does nothing: the question stays up and the title edit stays',
      w1.asked && w2.prevented && w2.sameQuestion && w2.title === 'Mark W', w2, 'prevented; same question; title Mark W');
    var w3 = {answered: await answer('Cancel')};
    w3.waterfall = wfNotes(); await view('month'); w3.month = mvNotes(); await view('sheet');
    add('W3', 'Cancel changes nothing: both waterfall notes and both month notes are still there',
      w3.answered && /Table read/.test(w3.waterfall.jul13 || '') && /Linked read/.test(w3.waterfall.jul6 || '') && w3.month.length === 4,
      w3, 'all four notes');

    // ---- W4-W5: Reset, then one Undo ---------------------------------------------------------------------------
    var w4 = await pressReset();
    w4.answered = await answer('Reset');
    w4.waterfall = wfNotes(); await view('month'); w4.month = mvNotes(); await view('sheet');
    add('W4', 'Reset clears the waterfall\'s notes (Table read, Linked read) in both views and leaves the month-only linked note Crew BBQ and the day note Camera test',
      w4.asked && w4.answered && !wfHas('Table read') && !wfHas('Linked read')
        && w4.month.length === 2 && w4.month.some(function (n) { return /Crew BBQ/.test(n); }) && w4.month.some(function (n) { return /Camera test/.test(n); }),
      {asked: w4.asked, question: w4.q.text, answered: w4.answered, waterfall: w4.waterfall, month: w4.month}, 'waterfall notes gone; Crew BBQ and Camera test kept');

    // W6 before the Undo: with nothing of the waterfall's left, a press asks nothing and changes nothing.
    var w6 = {statusBefore: status(), before: wfNotes()};
    var p6 = await pressReset(); await T.sleep(600);
    w6.asked = p6.asked; w6.text = p6.q.text; w6.after = wfNotes(); w6.statusAfter = status();
    if (p6.asked) await answer(/^Cancel/);

    await T.sleep(600);
    byId('undo-btn').click(); await settle();
    var w5 = {waterfall: wfNotes(), title: byId('show-title').value};
    await view('month'); w5.month = mvNotes(); await view('sheet');
    add('W5', 'one Undo brings both waterfall notes back, and nothing else (the title edit stays)',
      /Table read/.test(w5.waterfall.jul13 || '') && /Linked read/.test(w5.waterfall.jul6 || '') && w5.month.length === 4 && w5.title === 'Mark W',
      w5, 'all four notes; title Mark W');
    add('W6', 'pressed again with nothing of the waterfall\'s left: no question, nothing changes',
      !w6.asked && JSON.stringify(w6.after) === JSON.stringify(w6.before) && w6.statusAfter === w6.statusBefore,
      w6, 'no question');

    // ---- M1-M3: the month view's question, Reset, Undo ---------------------------------------------------------
    await view('month');
    var m1 = await pressReset();
    m1.label = label();
    m1.answered = await answer('Cancel');
    await toMonth(/July 2026/);
    m1.month = mvNotes();
    add('M1', 'in the Month view, Reset Month Notes asks ONE question, "Reset Month Notes", naming 2 notes added in the Month view, with a red Reset; Cancel changes nothing',
      m1.label === 'Reset Month Notes' && m1.asked && m1.q.count === 1 && /Reset Month Notes/.test(m1.q.text)
        && /\b2 notes added in the Month view\b/.test(m1.q.text) && /Waterfall notes stay/.test(m1.q.text) && m1.q.resetDanger
        && m1.answered && m1.month.length === 4,
      m1, 'one danger question naming 2 notes; all four notes after Cancel');
    var m2 = await pressReset();
    m2.answered = await answer('Reset');
    await toMonth(/July 2026/);
    m2.month = mvNotes();
    await view('sheet'); m2.waterfall = wfNotes();
    add('M2', 'Reset deletes Camera test AND Crew BBQ; the waterfall notes stay in both views',
      m2.asked && m2.answered && !m2.month.some(function (n) { return /Crew BBQ|Camera test/.test(n); })
        && m2.month.some(function (n) { return /Table read/.test(n); }) && m2.month.some(function (n) { return /Linked read/.test(n); })
        && /Table read/.test(m2.waterfall.jul13 || '') && /Linked read/.test(m2.waterfall.jul6 || ''),
      {asked: m2.asked, question: m2.q.text, answered: m2.answered, month: m2.month, waterfall: m2.waterfall}, 'Crew BBQ and Camera test gone; Table read and Linked read kept');
    await view('month');
    await T.sleep(600);
    byId('undo-btn').click(); await settle(); await toMonth(/July 2026/);
    var m3 = {month: mvNotes()};
    add('M3', 'one Undo brings both back', m3.month.length === 4, m3, 'all four notes');

    // ---- M4-M5: nothing added in the Month view, one automatic note recoloured there ----------------------------
    await view('sheet');
    await T.reloadWith(function (s) {
      s.userNotes = {}; s.phaseNotes = {}; s.dayNotes = {};
      s.autoNoteColors = {principalStart: '#FFC000'};
    }, 'notesreset2');
    await settle();
    await view('month');
    var m4 = await pressReset();
    m4.answered = await answer('Reset');
    add('M4', 'with only an automatic note\'s month colour to clear, Reset Month Notes asks to return 1 note to automatic colours, deleting nothing',
      m4.asked && m4.q.count === 1 && /Reset Month Notes/.test(m4.q.text) && /Return 1 note in the Month view to automatic colours and places\?/.test(m4.q.text)
        && /Nothing is deleted/.test(m4.q.text) && m4.q.resetDanger && m4.answered,
      m4, 'one danger question: Return 1 note ...; Reset');
    var m5 = await pressReset(); await T.sleep(600);
    if (m5.asked) await answer(/^Cancel/);
    add('M5', 'after that Reset nothing of the month\'s is left: a press asks nothing',
      !m5.asked, m5, 'no question');

    var h = T.appHealth();
    add('E0', 'no console errors, no native alert', h.errors.length === 0 && window.__alerts.length === 0,
      {errors: h.errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  T.done(out);
})(); });
