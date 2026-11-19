// notedates -- the waterfall note editor's Day, and a date TYPED at the end of a note (owner, 17 Nov 2026):
//   "In waterfall view, the default, for Day should be "No date" rather than Mon (default)"
//   "When you do select a date and ALSO have stays with set to a week of a phase ... when you shift the phase/calendar
//    the date should auto-change to the same day of the week but in whatever new week its in"
//   "what if you hand type 7/29/25 as 7/29 or 7-29-25 or 7-29. All should be recognized" -- "Yes, plain notes too"
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh notedates 900
//
// tests/fixtures/phasenotes.sptcal (see t/phasenotes.js and t/phaselink.js): Production from Mon 6/29/26 (wk 2 = 7/6
// holds the linked "Stunt rehearsal", size 9, height 60; wk 6 = 8/3 the typed "Table read" + the linked "Visitor"; wk 11
// = 9/7 "Wrap party 9/10/26" pinned Thu), the automatic "Principal Photography Wraps 10/20/26" in 10/19's cell, Post from
// 11/2/26, paused 11/23-12/6 by an all-phase hiatus (a week later after S1). Empty cells used here: 7/20, 7/27, 8/17,
// 8/24, 8/31, 9/21, 9/28, 10/5, 11/9, 11/16, 12/14, 12/21, 12/28, 1/4/27, 2/1/27.
//
//   N0  an empty cell's Day reads "No date" and holds ''; typing "Camera test 7-22" turns it to Wed 7/22 as you type
//   T1  saved: the text "Camera test 7/22/26" (the Day list's form) and the Day 2026-07-22, as a picked date is saved
//   T2  7/29 forms: "8/19", "8-26-2026", "9-2-26" each saved in the standard form with their day
//   T3  a full slashed date typed by hand ("7/29/2026") stays exactly as typed and gives the note its Day
//   T4  words, not a date: "Scenes 12-14" (no day of its week) and "9/30/25" (the wrong year) -- No date, text as typed
//   T5  a date typed and then deleted puts the Day back to No date, and nothing is pinned
//   T6  a Day picked after typing "2-3" REPLACES it ("Dailies 2/5/27"), never a second date beside it
//   T7  a note of two lines, the date on the last ("Studio cut due" / "Network cut due 12-30"): the date is written
//       12/30/26 but does NOT pin the note (Day stays No date): a pin would carry the undated first line to 12/30 in the
//       month view. The month view draws "Studio cut due" on Mon 12/28 and "Network cut due" on Wed 12/30
//   R1  "Wrap shoot 10-20" typed over the automatic wrap: the Day rows stay hidden (a rename), it saves as the renamed
//       automatic note "Wrap shoot 10/20/26", and no typed note is left on 10/19
//   L1  "Lens test 9-23" + Stays with Production wk 13: stored as {text: "Lens test", dow: 2}, drawn "Lens test 9/23/26"
//   L2  the cell's one linked note ("Stunt rehearsal", no day) retyped "Stunt rehearsal 7-9": dow 3, look kept
//   L3  a full date on a linked note ("Color review 11/18/26" + Post wk 3): the date comes out, dow 2
//   M1  Production one week later: each linked note on the SAME weekday of its new week ("Lens test 9/30/26" on 9/28,
//       "Stunt rehearsal 7/16/26" on 7/13); Post's note and the plain notes stay
//   S1  the whole calendar a week later (1 wk ->): every typed-date plain note stays on its date as a picked one does
//       (7/20, 7/27, 8/17, 8/24, 8/31, 2/1/27), an undated one moves ("Scenes 12-14" 10/5 -> 10/12), and the linked
//       notes follow their phase on the same weekday ("Lens test 10/7/26")
//   V1  the month view draws the typed-date notes on their days (Camera test on Wed 7/22, Lens test on Wed 10/7)
//   D1  Dates DD/MM: "Mix 16-12" (week of 12/14) is 16 Dec, saved "Mix 16/12/26"; "Spot 12-23" (written month first)
//       is 23 Dec, saved "Spot 23/12/26"; a full "Cue 1/6/27" (month first) stays as typed, Day 1/6/27
//   F1  the saved file carries no id from the editor (fields.byId as loaded)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'notedates', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellLines(wk) { var t = noteTd(wk); return t ? (t.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && l !== '+'; }) : null; }
  function weeksWith(s) {
    return qa('#table-wrap td.sheet-note-cell[data-week]').filter(function (td) {
      return (td.innerText || '').split('\n').some(function (l) { return l.indexOf(s) !== -1; });
    }).map(function (td) { return td.dataset.week; });
  }

  // ---- Save ------------------------------------------------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'notedates.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'notedates.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function snap() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return JSON.parse(written[written.length - 1]);
  }

  // ---- the views -------------------------------------------------------------------------------------------------------
  async function view(mode) {
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table');
    if (on) return;
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await settle();
  }
  async function toMonth(label) {
    await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 60; i++) {
      var my = txt(q('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  function mvDaysOf(like) {
    return qa('#table-wrap .mv-note-block[data-note-day]').filter(function (b) { return txt(b).indexOf(like) !== -1; })
      .map(function (b) { return b.getAttribute('data-note-day'); });
  }

  // ---- the editor ------------------------------------------------------------------------------------------------------
  async function openWf(wk) {
    await view('sheet');
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  function type(pop, text) { var ta = q('textarea', pop); ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  function box(pop) { return q('textarea', pop).value; }
  function dayOf(pop) { var d = q('.note-day-select', pop); return d ? d.value : null; }
  function dayDefault(pop) { var d = q('.note-day-select', pop); return d ? txt(d.querySelector('option[value=""]')) : null; }
  function dayShown(pop) { var r = q('.note-day-row', pop); return !!r && r.style.display !== 'none'; }
  function pickDay(pop, iso) { var d = q('.note-day-select', pop); d.value = iso; d.dispatchEvent(new Event('change', { bubbles: true })); }
  function choose(pop, value) {
    var sel = q('.note-link-select', pop); if (!sel) throw new Error('no Stays with row');
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function commit(pop) {
    q('textarea', pop).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }
  // ⭐ A new note stays with its phase week by default since 19 Nov 2026 (t/notephase.js). These cases are about a note
  // of the WEEK, so they pick "Week of …" first, as a user now does for one (a week with no phase has no row).
  function weekOf(pop) { var sel = q('.note-link-select', pop); if (sel && sel.value) choose(pop, ''); }
  async function typeSave(wk, text) { var pop = await openWf(wk); weekOf(pop); type(pop, text); var d = dayOf(pop); await commit(pop); return d; }
  function un(s, wk) { return (s.userNotes || {})[wk]; }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && (cellLines('2026-09-14') || []).join() === 'Blocker'; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = await snap();

    // ===== N0, T1: the Day follows a typed short date, and saves as a picked one ==========================================
    await step('N0', async function () {
      var pop = await openWf('2026-07-20'); weekOf(pop);
      var a = { dflt: dayDefault(pop), day: dayOf(pop) };
      type(pop, 'Camera test 7-22');
      var b = { day: dayOf(pop), shown: dayShown(pop) };
      await commit(pop);
      kase('N0', 'an empty cell\'s Day reads "No date" (value \'\'); typing "Camera test 7-22" turns it to 2026-07-22 as you type',
        a.dflt === 'No date' && a.day === '' && b.day === '2026-07-22' && b.shown, { opened: a, typed: b });
      var s = await snap();
      kase('T1', 'saved as "Camera test 7/22/26" with the Day 2026-07-22, as a picked date is; the cell reads the same',
        same(un(s, '2026-07-20'), { text: 'Camera test 7/22/26', date: '2026-07-22' }) && same(cellLines('2026-07-20'), ['Camera test 7/22/26']),
        { saved: un(s, '2026-07-20'), cell: cellLines('2026-07-20') });
    });

    // ===== T2, T3, T4: the forms ==========================================================================================
    await step('T2', async function () {
      var d = [await typeSave('2026-08-17', 'Fittings 8/19'), await typeSave('2026-08-24', 'Lens check 8-26-2026'),
               await typeSave('2026-08-31', 'Rehearsal 9-2-26')];
      var s = await snap();
      kase('T2', '"8/19", "8-26-2026" and "9-2-26" each turn Day to their day as typed and save in the standard form with it',
        same(d, ['2026-08-19', '2026-08-26', '2026-09-02'])
          && same(un(s, '2026-08-17'), { text: 'Fittings 8/19/26', date: '2026-08-19' })
          && same(un(s, '2026-08-24'), { text: 'Lens check 8/26/26', date: '2026-08-26' })
          && same(un(s, '2026-08-31'), { text: 'Rehearsal 9/2/26', date: '2026-09-02' }),
        { days: d, saved: [un(s, '2026-08-17'), un(s, '2026-08-24'), un(s, '2026-08-31')] });
    });
    await step('T3', async function () {
      var d = await typeSave('2026-07-27', 'Table read 7/29/2026');
      var s = await snap();
      kase('T3', 'a full "7/29/2026" typed by hand stays exactly as typed and gives the note its Day (2026-07-29)',
        d === '2026-07-29' && same(un(s, '2026-07-27'), { text: 'Table read 7/29/2026', date: '2026-07-29' }),
        { day: d, saved: un(s, '2026-07-27') });
    });
    await step('T4', async function () {
      var d = [await typeSave('2026-10-05', 'Scenes 12-14'), await typeSave('2026-09-28', 'Notes due 9/30/25')];
      var s = await snap();
      kase('T4', '"Scenes 12-14" (no day of its week) and "9/30/25" (the wrong year) are words: No date, saved as typed',
        same(d, ['', '']) && same(un(s, '2026-10-05'), { text: 'Scenes 12-14' }) && same(un(s, '2026-09-28'), { text: 'Notes due 9/30/25' }),
        { days: d, saved: [un(s, '2026-10-05'), un(s, '2026-09-28')] });
    });

    // ===== T5, T6: typed away; picked after typing ========================================================================
    await step('T5', async function () {
      var pop = await openWf('2026-11-09'); weekOf(pop);
      type(pop, 'Temp 11-11'); var a = dayOf(pop);
      type(pop, 'Temp'); var b = dayOf(pop);
      await commit(pop);
      var s = await snap();
      kase('T5', 'a date typed (Day 2026-11-11) and deleted again puts Day back to No date; saved with no Day',
        a === '2026-11-11' && b === '' && same(un(s, '2026-11-09'), { text: 'Temp' }), { typed: a, deleted: b, saved: un(s, '2026-11-09') });
    });
    await step('T6', async function () {
      var pop = await openWf('2027-02-01'); weekOf(pop);
      type(pop, 'Dailies 2-3'); pickDay(pop, '2027-02-05');
      var b = box(pop);
      await commit(pop);
      var s = await snap();
      kase('T6', 'Fri picked after typing "Dailies 2-3" replaces the typed date: "Dailies 2/5/27", Day 2027-02-05',
        b === 'Dailies 2/5/27' && same(un(s, '2027-02-01'), { text: 'Dailies 2/5/27', date: '2027-02-05' }), { box: b, saved: un(s, '2027-02-01') });
    });

    // ===== T7: a note of two lines ===================================================================================
    await step('T7', async function () {
      var pop = await openWf('2026-12-28'); weekOf(pop);
      type(pop, 'Studio cut due\nNetwork cut due 12-30'); var d = dayOf(pop);
      await commit(pop);
      var s = await snap();
      await toMonth('December 2026'); var st = mvDaysOf('Studio cut due'), nw = mvDaysOf('Network cut due');
      await view('sheet');
      kase('T7', 'two lines, the date on the last: written 12/30/26 but no pin (Day No date); the month view keeps "Studio cut due" on Mon 12/28 and draws "Network cut due" on Wed 12/30',
        d === '' && same(un(s, '2026-12-28'), { text: 'Studio cut due\nNetwork cut due 12/30/26' })
          && same(st, ['2026-12-28']) && same(nw, ['2026-12-30']),
        { day: d, saved: un(s, '2026-12-28'), studio: st, network: nw });
    });

    // ===== R1: a rename of an automatic note ==============================================================================
    await step('R1', async function () {
      var pop = await openWf('2026-10-19');
      var a = box(pop);
      type(pop, 'Wrap shoot 10-20');
      var shown = dayShown(pop);
      await commit(pop);
      var s = await snap();
      var names = Object.keys(s.autoNoteNames || {}).map(function (k) { return s.autoNoteNames[k]; });
      kase('R1', '"Wrap shoot 10-20" over "Principal Photography Wraps 10/20/26": the Day rows stay hidden, it saves as the renamed automatic note "Wrap shoot 10/20/26", no typed note on 10/19',
        a === 'Principal Photography Wraps 10/20/26' && !shown && names.indexOf('Wrap shoot') !== -1 && un(s, '2026-10-19') === undefined
          && same(cellLines('2026-10-19'), ['Wrap shoot 10/20/26']),
        { opened: a, rowsShown: shown, names: s.autoNoteNames || null, own: un(s, '2026-10-19') || null, cell: cellLines('2026-10-19') });
    });

    // ===== L1-L3: notes that stay with a phase ============================================================================
    await step('L1', async function () {
      var pop = await openWf('2026-09-21');
      type(pop, 'Lens test 9-23'); choose(pop, 'production@13');
      await commit(pop);
      var s = await snap();
      kase('L1', '"Lens test 9-23" + Stays with Production wk 13: stored {text: "Lens test", dow: 2}, drawn "Lens test 9/23/26", no typed note on 9/21',
        same((s.phaseNotes || {})['production@13'], { text: 'Lens test', dow: 2 }) && un(s, '2026-09-21') === undefined
          && same(cellLines('2026-09-21'), ['Lens test 9/23/26']),
        { note: (s.phaseNotes || {})['production@13'] || null, own: un(s, '2026-09-21') || null, cell: cellLines('2026-09-21') });
    });
    await step('L2', async function () {
      var pop = await openWf('2026-07-06');
      var a = box(pop);
      type(pop, 'Stunt rehearsal 7-9');
      await commit(pop);
      var s = await snap();
      kase('L2', 'the cell\'s one linked note retyped "Stunt rehearsal 7-9": dow 3, its size 9 and height 60 kept, drawn "Stunt rehearsal 7/9/26"',
        a === 'Stunt rehearsal' && same((s.phaseNotes || {})['production@2'], { text: 'Stunt rehearsal', dow: 3, size: 9, height: 60 })
          && same(cellLines('2026-07-06'), ['Stunt rehearsal 7/9/26']),
        { opened: a, note: (s.phaseNotes || {})['production@2'] || null, cell: cellLines('2026-07-06') });
    });
    await step('L3', async function () {
      var pop = await openWf('2026-11-16');
      type(pop, 'Color review 11/18/26'); choose(pop, 'post@3');
      await commit(pop);
      var s = await snap();
      kase('L3', 'a full date on a note linked to Post wk 3 ("Color review 11/18/26"): the date comes out, dow 2',
        same((s.phaseNotes || {})['post@3'], { text: 'Color review', dow: 2 }) && same(cellLines('2026-11-16'), ['Color review 11/18/26']),
        { note: (s.phaseNotes || {})['post@3'] || null, cell: cellLines('2026-11-16') });
    });

    // ===== M1: Production one week later ==================================================================================
    await step('M1', async function () {
      await view('sheet');
      T.set('start-production', '2026-07-06'); await settle();
      var m = { lens: weeksWith('Lens test'), lensLine: (cellLines('2026-09-28') || []).filter(function (l) { return l.indexOf('Lens test') === 0; }),
                stunt: cellLines('2026-07-13'), color: cellLines('2026-11-16'), camera: weeksWith('Camera test') };
      kase('M1', 'Production a week later: "Lens test 9/30/26" on 9/28 and "Stunt rehearsal 7/16/26" on 7/13 (same weekdays); Post\'s note and the plain notes stay',
        same(m.lens, ['2026-09-28']) && same(m.lensLine, ['Lens test 9/30/26']) && (m.stunt || []).indexOf('Stunt rehearsal 7/16/26') !== -1
          && same(m.color, ['Color review 11/18/26']) && same(m.camera, ['2026-07-20']), m);
    });

    // ===== S1: the whole calendar a week later ============================================================================
    await step('S1', async function () {
      await view('sheet');
      byId('shift-fwd-btn').click(); await settle();
      var w = { camera: weeksWith('Camera test 7/22/26'), table: weeksWith('Table read 7/29/2026'), fit: weeksWith('Fittings 8/19/26'),
                lensCheck: weeksWith('Lens check 8/26/26'), reh: weeksWith('Rehearsal 9/2/26'), dailies: weeksWith('Dailies 2/5/27'),
                scenes: weeksWith('Scenes 12-14'), lens: weeksWith('Lens test 10/7/26'), color: weeksWith('Color review 11/25/26') };
      kase('S1', '1 wk ->: the typed-date plain notes stay on their dates as a picked one does; "Scenes 12-14" moves 10/5 -> 10/12; the linked notes follow on the same weekday ("Lens test 10/7/26", "Color review 11/25/26")',
        same(w.camera, ['2026-07-20']) && same(w.table, ['2026-07-27']) && same(w.fit, ['2026-08-17']) && same(w.lensCheck, ['2026-08-24'])
          && same(w.reh, ['2026-08-31']) && same(w.dailies, ['2027-02-01']) && same(w.scenes, ['2026-10-12'])
          && same(w.lens, ['2026-10-05']) && same(w.color, ['2026-11-23']), w);
    });

    // ===== V1: the month view ============================================================================================
    await step('V1', async function () {
      await toMonth('July 2026'); var cam = mvDaysOf('Camera test');
      await toMonth('October 2026'); var lens = mvDaysOf('Lens test');
      await view('sheet');
      kase('V1', 'the month view draws "Camera test" on Wed 7/22 and the linked "Lens test" on Wed 10/7',
        same(cam, ['2026-07-22']) && same(lens, ['2026-10-07']), { camera: cam, lens: lens });
    });

    // ===== D1: a day-first calendar ======================================================================================
    await step('D1', async function () {
      await view('sheet');
      T.pickSelect('wf-date-format', 'd/m/yy'); await settle(); await T.sleep(600);
      var d = [await typeSave('2026-12-14', 'Mix 16-12'), await typeSave('2026-12-21', 'Spot 12-23'), await typeSave('2027-01-04', 'Cue 1/6/27')];
      var s = await snap();
      T.pickSelect('wf-date-format', ''); await settle();
      kase('D1', 'Dates DD/MM: "Mix 16-12" is 16 Dec, saved "Mix 16/12/26"; "Spot 12-23" (month first) is 23 Dec, saved "Spot 23/12/26"; a full "Cue 1/6/27" (month first) stays as typed with Day 1/6/27',
        same(d, ['2026-12-16', '2026-12-23', '2027-01-06'])
          && same(un(s, '2026-12-14'), { text: 'Mix 16/12/26', date: '2026-12-16' })
          && same(un(s, '2026-12-21'), { text: 'Spot 23/12/26', date: '2026-12-23' })
          && same(un(s, '2027-01-04'), { text: 'Cue 1/6/27', date: '2027-01-06' }),
        { days: d, saved: [un(s, '2026-12-14'), un(s, '2026-12-21'), un(s, '2027-01-04')] });
    });

    // ===== F1: nothing from the editor reaches the file ===================================================================
    await step('F1', async function () {
      var s = await snap();
      kase('F1', 'the saved state carries no id from the editor: fields.byId holds exactly the ids it loaded with',
        same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort()) && !q('.note-day-select[id]'),
        { added: Object.keys(s.fields.byId).filter(function (k) { return !(k in S0.fields.byId); }) });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'notedates threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
