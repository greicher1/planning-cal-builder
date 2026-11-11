// phaselink -- NOTES LINKED TO A PHASE, step 2: the waterfall note editor's "Stays with" row (PHASE-LINKED-NOTES-PLAN.md
// §4.4, §4.5; rulings R1 "Stays with", R2(a) one cell one home, R3(a) a shorter phase parks the note, R6(a), R7(a), D3).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh phaselink 900
//
// tests/fixtures/phasenotes.sptcal (see t/phasenotes.js): five linked notes (Stunt rehearsal = Production wk 2 on 7/6,
// Visitor = Production wk 6 under 8/3's typed "Table read", Day ten, Tech scout = Prod Prep wk 3 dated Wed 6/3, Post
// kickoff) and wfkeys' typed notes (8/3 "Table read" #FFC000 size 9 bold+italic, 8/10 two lines, 9/7 "Wrap party 9/10/26"
// pinned Thu, 9/14 "Blocker"). The automatic "Start Principal Photography 6/29/26" sits in 6/29's cell.
//
//   R1  a cell whose one note is linked opens on its home: "Stays with" + Production wk 2 (the week first, then the phase
//       cells), "Moves when Production moves. Stays on its week 2.", the Day's empty choice "First day (default)"; the
//       select has no id, and switched to the week the hint and the Day wording follow
//   R2  a cell with typed text and a visiting linked note opens on the week, names the visitor ("Also here: ... stays
//       with Production wk 6. Leave the choice alone and it keeps its link."), and committed unchanged keeps both
//   L1  8/10's typed note linked to Production wk 7: phaseNotes holds it, userNotes no longer does; Production two weeks
//       later carries it to 8/24 while 8/3's typed note stays; U1 one undo puts it back on the week as typed text
//   L2  8/3 linked to Production wk 6: "Table read" and the visiting "Visitor" become ONE note at that key (R2(a)), with
//       8/3's look (#FFC000, size 9, bold+italic) moved onto it (R7(a)) and the week's own look gone
//   L3  6/29 linked to Production wk 1 with a line typed under "Start Principal Photography 6/29/26": only the typed line
//       is linked; the automatic line stays automatic (no userNotes for 6/29)
//   L4  9/7's pinned "Wrap party 9/10/26" linked to Production wk 11: the stamped date comes out, its Thursday becomes
//       dow 3 (D3), drawn "Wrap party 9/10/26"; ▼ on Production draws it "Wrap party 9/17/26" in 9/14's cell
//   D1  the Day changed on a linked note (Tech scout, Wed -> Fri): dow 4, its text without a date, drawn "Tech scout 6/5/26"
//   C1  a colour picked on a linked note goes on the note, not the week
//   V1  "Show in month view" off on a linked note is stored on the note (monthHidden)
//   W1  unlinked (Stunt rehearsal to its week): a typed note of 7/6 again, its size and row height moved to the week; a
//       move of Production leaves it
//   P1  a parked note (Prod Prep wk 8 of 6): the row offers "Prod Prep wk 8 (waits on its last week)" and the amber
//       message; committed unchanged it keeps its key; Prod Prep at 8 weeks draws it on its wk 8
//   F1  the saved file carries no id from the row (fields.byId as loaded)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phaselink', cases: [] };
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
  function closePops() { document.body.click(); }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellLines(wk) { var t = noteTd(wk); return t ? (t.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean) : null; }
  function weeksWith(s) {
    return qa('#table-wrap td.sheet-note-cell[data-week]').filter(function (td) {
      return (td.innerText || '').split('\n').some(function (l) { return l.indexOf(s) !== -1; });
    }).map(function (td) { return td.dataset.week; });
  }
  function bg(wk) { var t = noteTd(wk); return t ? getComputedStyle(t).backgroundColor : null; }

  // ---- Save and Load -------------------------------------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'phaselink.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phaselink.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;
  }
  async function snap() { return JSON.parse(await save()); }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    for (var attempt = 0; attempt < 2; attempt++) {
      closePops();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await T.sleep(200);
      var stem = 'phaselink-load-' + (++loads), name = stem + '.sptcal';
      var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
      for (var i = 0; i < 80; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
      await p;
      try {
        await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
        await settle();
        return;
      } catch (e) { if (attempt) throw e; }
    }
  }
  async function undo() { byId('undo-btn').click(); await settle(); }

  // ---- the editor ---------------------------------------------------------------------------------------------------
  async function openWf(wk) {
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  function rowInfo(pop) {
    var row = q('.note-link-row', pop), sel = row && q('select', row), day = q('.note-day-select', pop);
    var also = q('.note-link-also', pop), hint = q('.note-link-hint', pop);
    return row ? { label: txt(q('label', row)).split(' ').slice(0, 2).join(' '), value: sel.value, id: sel.id || null,
                   options: Array.from(sel.options).map(function (o) { return [o.value, o.textContent.trim()]; }),
                   hint: txt(hint), wait: !!hint && hint.classList.contains('is-wait'), also: also && !also.hidden ? txt(also) : null,
                   dayDefault: day ? txt(day.querySelector('option[value=""]')) : null, dayValue: day ? day.value : null,
                   shown: getComputedStyle(row).display !== 'none' } : null;
  }
  function choose(pop, value) {
    var sel = q('.note-link-select', pop); if (!sel) throw new Error('no Stays with row');
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function pickDay(pop, iso) {
    var sel = q('.note-day-select', pop); sel.value = iso; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function commitWf(pop, text) {
    var ta = q('textarea', pop);
    if (text !== undefined) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && (cellLines('2026-09-14') || []).join() === 'Blocker'; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0text = await save(), S0 = JSON.parse(S0text);

    // ===== R1: a single linked note ====================================================================================
    await step('R1', async function () {
      var pop = await openWf('2026-07-06'), a = rowInfo(pop);
      choose(pop, ''); var b = rowInfo(pop);
      pop.querySelector('textarea').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await settle();
      kase('R1', 'a cell whose one note is linked opens on its home: Stays with, Production wk 2, "Moves when Production moves. Stays on its week 2.", "First day (default)"; no id; switched to the week, the hint and the Day wording follow',
        !!a && a.label === 'Stays with' && a.value === 'production@2' && a.id === null && a.shown
          && same(a.options, [['', 'Week of 7/6/26'], ['production@2', 'Production wk 2']])
          && a.hint === 'Moves when Production moves. Stays on its week 2.' && a.dayDefault === 'First day (default)' && a.also === null
          && b.hint === 'Stays on the week of 7/6/26, whatever the phases do.' && b.dayDefault === 'Mon (default)',
        { opened: a, toWeek: b });
    });

    // ===== R2: a visiting note ==========================================================================================
    await step('R2', async function () {
      var pop = await openWf('2026-08-03'), a = rowInfo(pop);
      choose(pop, 'production@6'); var b = rowInfo(pop); choose(pop, '');
      await commitWf(pop);
      var s = await snap();
      kase('R2', 'typed text + a visiting linked note opens on the week and names the visitor; committed unchanged the visitor keeps its link and the typed note stays',
        a.value === '' && a.also === 'Also here: “Visitor” stays with Production wk 6. Leave the choice alone and it keeps its link.'
          && !(b.also || '').endsWith('Saving with this choice gives it this one instead.')
          && same(s.phaseNotes['production@6'], { text: 'Visitor', color: '#FF0000' }) && s.userNotes['2026-08-03'].text === 'Table read'
          && same(cellLines('2026-08-03'), ['Table read', 'Visitor']),
        { opened: a, chosen: b, note: s.phaseNotes['production@6'], own: s.userNotes['2026-08-03'] });
    });

    // ===== L1, U1: a typed note linked ==================================================================================
    await step('L1', async function () {
      var pop = await openWf('2026-08-10'), a = rowInfo(pop);
      choose(pop, 'production@7'); var b = rowInfo(pop);
      await commitWf(pop);
      var s = await snap();
      T.set('start-production', '2026-07-13'); await settle();
      var moved = { cast: weeksWith('Cast fittings'), table: weeksWith('Table read'), c824: cellLines('2026-08-24') };
      kase('L1', '8/10\'s typed note linked to Production wk 7 is stored as phaseNotes[production@7] and no longer as typed text; Production two weeks later carries it to 8/24, 8/3\'s typed note stays',
        a.value === '' && same(a.options.map(function (o) { return o[0]; }), ['', 'production@7']) && b.hint === 'Moves when Production moves. Stays on its week 7.'
          && same(s.phaseNotes['production@7'], { text: 'Cast fittings\nNetwork call' }) && s.userNotes['2026-08-10'] === undefined
          && same(moved.cast, ['2026-08-24']) && same(moved.table, ['2026-08-03']) && same(moved.c824, ['Cast fittings', 'Network call']),
        { opened: a, chosen: b, note: s.phaseNotes['production@7'], own: s.userNotes['2026-08-10'] || null, moved: moved });
      await undo();   // the start
      await undo();   // the link
      var su = await snap();
      kase('U1', 'two undos (the start, then the link) put 8/10\'s note back on its week as typed text',
        su.userNotes['2026-08-10'] && su.userNotes['2026-08-10'].text === 'Cast fittings\nNetwork call' && !(su.phaseNotes || {})['production@7']
          && same(weeksWith('Cast fittings'), ['2026-08-10']),
        { own: su.userNotes['2026-08-10'] || null, linked: Object.keys(su.phaseNotes || {}) });
      await load(S0text);
    });

    // ===== L2: typed text + a visitor, one home =========================================================================
    await step('L2', async function () {
      var pop = await openWf('2026-08-03');
      choose(pop, 'production@6'); var b = rowInfo(pop);
      await commitWf(pop);
      var s = await snap();
      kase('L2', '8/3 linked to Production wk 6: "Table read" and the visiting "Visitor" become one note at that key, with 8/3\'s look (#FFC000, size 9, bold+italic) on it and none left on the week; the cell still wears it',
        !(b.also || '').endsWith('Saving with this choice gives it this one instead.')
          && same(s.phaseNotes['production@6'], { text: 'Table read\nVisitor', color: '#FFC000', size: 9, style: { bold: true, italic: true } })
          && s.userNotes['2026-08-03'] === undefined && !(s.noteColors || {})['2026-08-03'] && !(s.noteFontSize || {})['2026-08-03']
          && !((s.textStyles || {}).note || {})['2026-08-03'] && same(cellLines('2026-08-03'), ['Table read', 'Visitor']) && bg('2026-08-03') === 'rgb(255, 192, 0)',
        { chosen: b, note: s.phaseNotes['production@6'], own: s.userNotes['2026-08-03'] || null, colours: s.noteColors, cell: cellLines('2026-08-03'), bg: bg('2026-08-03') });
      await load(S0text);
    });

    // ===== L3: the automatic line stays automatic =======================================================================
    await step('L3', async function () {
      var pop = await openWf('2026-06-29');
      var ta = q('textarea', pop); ta.value = ta.value + '\nCamera tests'; ta.dispatchEvent(new Event('input', { bubbles: true }));
      await T.sleep(100);
      var a = rowInfo(pop);
      choose(pop, 'production@1');
      await commitWf(pop);
      var s = await snap();
      kase('L3', 'a line typed under 6/29\'s "Start Principal Photography 6/29/26", linked to Production wk 1: only the typed line is linked; the automatic line stays automatic',
        !!a && a.shown && same(s.phaseNotes['production@1'], { text: 'Camera tests' }) && s.userNotes['2026-06-29'] === undefined
          && same(cellLines('2026-06-29'), ['Start Principal Photography 6/29/26', 'Camera tests']),
        { row: a, note: s.phaseNotes['production@1'] || null, own: s.userNotes['2026-06-29'] || null, cell: cellLines('2026-06-29') });
      await load(S0text);
    });

    // ===== L4: a pinned note keeps its weekday ==========================================================================
    await step('L4', async function () {
      var pop = await openWf('2026-09-07'), a = rowInfo(pop);
      choose(pop, 'production@11');
      await commitWf(pop);
      var s = await snap(), c97 = cellLines('2026-09-07');
      var b = byId('swatch-production').parentElement.querySelector('.ph-nudge-btn[data-nudge="1"]');
      b.click(); await T.sleep(1500); await settle();
      var c914 = cellLines('2026-09-14');
      kase('L4', '9/7\'s pinned "Wrap party 9/10/26" linked to Production wk 11: text "Wrap party", Thursday as dow 3, drawn "Wrap party 9/10/26"; one week later (▼) it reads "Wrap party 9/17/26" in 9/14\'s cell',
        a.dayValue === '2026-09-10' && same(s.phaseNotes['production@11'], { text: 'Wrap party', dow: 3 }) && s.userNotes['2026-09-07'] === undefined
          && same(c97, ['Wrap party 9/10/26']) && (c914 || []).indexOf('Wrap party 9/17/26') !== -1,
        { opened: a, note: s.phaseNotes['production@11'] || null, own: s.userNotes['2026-09-07'] || null, c97: c97, c914: c914 });
      await load(S0text);
    });

    // ===== D1, C1, V1: a linked note's day, colour and month switch =====================================================
    await step('D1', async function () {
      var pop = await openWf('2026-06-01'), a = rowInfo(pop);
      pickDay(pop, '2026-06-05');
      var green = pop.querySelector('.color-swatch[data-color="#92D050"]');
      if (green) green.click();
      var cb = pop.querySelector('.note-view-cb'); if (cb && cb.checked) cb.click();
      await commitWf(pop);
      var s = await snap();
      kase('D1', 'the Day changed on a linked note (Tech scout, Wed -> Fri): its weekday becomes dow 4 and its text keeps no date; drawn "Tech scout 6/5/26"',
        a.value === 'prodPrep@3' && a.dayValue === '2026-06-03' && s.phaseNotes['prodPrep@3'].text === 'Tech scout' && s.phaseNotes['prodPrep@3'].dow === 4
          && same(cellLines('2026-06-01'), ['Tech scout 6/5/26']) && s.userNotes['2026-06-01'] === undefined,
        { opened: a, note: s.phaseNotes['prodPrep@3'], cell: cellLines('2026-06-01') });
      kase('C1', 'a colour picked on a linked note goes on the note (#92D050), not the week',
        !!green && s.phaseNotes['prodPrep@3'].color === '#92D050' && !(s.noteColors || {})['2026-06-01'] && bg('2026-06-01') === 'rgb(146, 208, 80)',
        { note: s.phaseNotes['prodPrep@3'], weekColour: (s.noteColors || {})['2026-06-01'] || null, bg: bg('2026-06-01') });
      kase('V1', '"Show in month view" switched off on a linked note is stored on the note (monthHidden: true)',
        !!cb && s.phaseNotes['prodPrep@3'].monthHidden === true && !(s.userNotes['2026-06-01'] || {}).monthHidden,
        { note: s.phaseNotes['prodPrep@3'] });
      await load(S0text);
    });

    // ===== W1: unlinked ================================================================================================
    await step('W1', async function () {
      var pop = await openWf('2026-07-06');
      choose(pop, '');
      await commitWf(pop);
      var s = await snap();
      T.set('start-production', '2026-07-13'); await settle();
      var after = { stunt: weeksWith('Stunt rehearsal'), rh: (noteTd('2026-07-06').closest('tr') || {}).style.height };
      kase('W1', 'Stunt rehearsal unlinked: a typed note of 7/6 again, its size (9) and row height (60) moved to the week; Production two weeks later leaves it on 7/6',
        s.userNotes['2026-07-06'] && s.userNotes['2026-07-06'].text === 'Stunt rehearsal' && !(s.phaseNotes || {})['production@2']
          && (s.noteFontSize || {})['2026-07-06'] === 9 && (s.rowHeightsByWeek || {})['2026-07-06'] === 60
          && same(after.stunt, ['2026-07-06']) && after.rh === '60px',
        { own: s.userNotes['2026-07-06'] || null, size: (s.noteFontSize || {})['2026-07-06'], height: (s.rowHeightsByWeek || {})['2026-07-06'], after: after });
      await load(S0text);
    });

    // ===== P1: a parked note ============================================================================================
    await step('P1', async function () {
      var s0 = JSON.parse(S0text); s0.phaseNotes['prodPrep@8'] = { text: 'Late prep' };
      await load(JSON.stringify(s0));
      var at = weeksWith('Late prep');
      var pop = await openWf('2026-06-22'), a = rowInfo(pop);
      await commitWf(pop);
      var s = await snap();
      T.set('weeks-prodPrep', '8'); await settle();
      var grown = weeksWith('Late prep');
      kase('P1', 'a note linked to Prod Prep wk 8 of 6 waits on wk 6 (6/22); its row offers "Prod Prep wk 8 (waits on its last week)" with the amber message; committed unchanged it keeps its key; Prod Prep at 8 weeks draws it on its wk 8 (7/6)',
        same(at, ['2026-06-22']) && a.value === 'prodPrep@8' && a.wait
          && a.options.some(function (o) { return o[0] === 'prodPrep@8' && o[1] === 'Prod Prep wk 8 (waits on its last week)'; })
          && a.hint === 'Prod Prep has 6 weeks now. This note waits on its last week, and goes back to Prod Prep wk 8 if it grows.'
          && same(s.phaseNotes['prodPrep@8'], { text: 'Late prep' }) && same(grown, ['2026-07-06']),
        { at: at, opened: a, note: s.phaseNotes['prodPrep@8'] || null, grown: grown });
      await load(S0text);
    });

    // ===== F1: nothing from the row reaches the file =====================================================================
    await step('F1', async function () {
      var s = await snap();
      kase('F1', 'the saved state carries no id from the row: fields.byId holds exactly the ids it loaded with',
        same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort()) && !q('.note-link-select[id]'),
        { added: Object.keys(s.fields.byId).filter(function (k) { return !(k in S0.fields.byId); }) });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phaselink threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
