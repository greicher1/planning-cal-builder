// notephase -- a NEW note stays with its phase week by default (owner, 19 Nov 2026: "New default, notes should stay with
// their specifc phase week and not the specific actual week"; pickers "First in the list", "Leave them on their week",
// "Yes, both editors", "Yes, pasted notes too").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh notephase 900
//
// tests/fixtures/phasenotes.sptcal (t/phasenotes.js): Production from Mon 6/29/26 (7/20 is its wk 4, 8/31 wk 10), typed
// week notes on 8/3 ("Table read", the visiting linked "Visitor"), 8/10, 9/7 and 9/14 ("Blocker"), the automatic
// "Principal Photography Wraps 10/20/26" alone in 10/19's cell, no phase at all in the week of 10/26 (Production wraps
// 10/20, Post starts 11/2).
//
//   W1  an empty cell (7/20): Stays with opens on the FIRST phase it offers (production@4, "Production wk 4"), not the week;
//       the hint says it moves with Production
//   W2  "Camera test" saved there with the row left alone: phaseNotes production@4 = {text: "Camera test"}, no week note
//   C3  a line added beside the cell's one linked note joins it (case 3, owner 20 Nov 2026), and M1 moves both together
//   W3  a cell that already holds a week note (9/14 "Blocker", 8/3 "Table read" + a visitor) opens on "Week of", so no
//       saved note changes home
//   W4  "Week of" picked by hand on an empty cell (8/24): saved as the week's own note, as before
//   W5  10/19's automatic note retyped alone ("Wrap shoot 10-20", a rename): the row stays hidden (its select may sit on
//       a phase) and it is a rename only, nothing linked
//   W6  the automatic line renamed ("Wrap day 10/20/26") and a line added ("Crew party") in ONE save: the new line is
//       linked, the automatic note is renamed and stays the week's (commitActiveNoteEditor's preEdits)
//   W7  a week no phase runs in (10/26): no Stays with row; saved as a week note
//   P1  plain text pasted onto an empty cell (8/31): linked to production@10; pasted over 9/14's week note: stays the week's
//   M1  Production a week later: the linked new notes move a week (7/27, 9/7, the 10/19 line to 10/26); the week notes stay
//   Q1  ⌘V of plain text onto a month day (Wed 7/15): linked to Production's shoot day, not a note of the day
//   Q2  Paste notes…: a line on a shoot day is linked (its colour kept); a line in a week no phase runs in stays the day's
//   N1  the month view's "+" on Wed 7/8: Stays with opens on the first phase (production@day7, Production · Day 7), and
//       saving with it left alone links it there
//   Q3  two notes pasted into one free phase week: the first links, the second stays a note of its own day (never joined)
//   N2  a "+" in a phase week that already holds a linked note opens on This day
//   N1D that note is drawn "Rig check" with no date (a note hidden from the waterfall; owner's picker "Drop the date")
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.__keepNewNoteDefault = true;   // this leg tests the new note's default "Stays with" (t/lib.js)
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'notephase', cases: [] };
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
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  // ---- Save (notedates') -------------------------------------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'notephase.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'notephase.sptcal', { lastModified: 1 }); },
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
  // ---- views -------------------------------------------------------------------------------------------------------------
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
  // ---- the waterfall -----------------------------------------------------------------------------------------------------
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellLines(wk) { var t = noteTd(wk); return t ? (t.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && l !== '+'; }) : null; }
  function weeksWith(s) {
    return qa('#table-wrap td.sheet-note-cell[data-week]').filter(function (td) {
      return (td.innerText || '').split('\n').some(function (l) { return l.indexOf(s) !== -1; });
    }).map(function (td) { return td.dataset.week; });
  }
  async function openWf(wk) {
    await view('sheet');
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  function type(pop, text) { var ta = q('textarea', pop); ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  function linkInfo(pop) {
    var sel = q('.note-link-select', pop), row = q('.note-link-row', pop);
    return { sel: sel ? sel.value : null, label: sel && sel.selectedOptions[0] ? txt(sel.selectedOptions[0]) : null,
             shown: !!row && row.style.display !== 'none', hint: txt(q('.note-link-hint', pop)) };
  }
  function choose(pop, value) {
    var sel = q('.note-link-select', pop); if (!sel) throw new Error('no Stays with row');
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function commit(pop) {
    q('textarea', pop).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }
  function un(s, wk) { return (s.userNotes || {})[wk]; }
  function pn(s) { return s.phaseNotes || {}; }
  // A cell highlighted by a click (pointer events, wfkeys'), then a paste onto it.
  function pe(type, p) {
    var o = { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
              buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true };
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if (type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  async function pasteOn(wk, text) {
    await view('sheet');
    var td = noteTd(wk); td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    var p = mid(td); pe('pointerdown', p); pe('pointerup', p); await T.sleep(250);
    var dt = new DataTransfer(); dt.setData('text/plain', text);
    (document.activeElement || document.body).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await settle();
  }
  // ---- the month view's "+" ----------------------------------------------------------------------------------------------
  function mvPop() { return byId('mv-note-pop'); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && (cellLines('2026-09-14') || []).join() === 'Blocker'; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    await step('W1', async function () {
      var pop = await openWf('2026-07-20');
      var a = linkInfo(pop);
      type(pop, 'Camera test');
      await commit(pop);
      var s = await snap();
      kase('W1', 'an empty cell (7/20) opens Stays with on its first phase, production@4 "Production wk 4", with the Production hint',
        a.sel === 'production@4' && a.label === 'Production wk 4' && a.shown && /^Moves when Production moves/.test(a.hint), a);
      kase('W2', '"Camera test" saved with the row left alone is linked: production@4 = {text: "Camera test"}, no week note; the cell shows it',
        same(pn(s)['production@4'], { text: 'Camera test' }) && un(s, '2026-07-20') === undefined && same(cellLines('2026-07-20'), ['Camera test']),
        { note: pn(s)['production@4'], week: un(s, '2026-07-20'), cell: cellLines('2026-07-20') });
    });

    await step('C3', async function () {
      // Case 3 (owner, 20 Nov 2026): the cell holds its one linked note; a line added beside it, the row left on its home,
      // joins that note and moves with it (it was left as a week note, split from it by the next move).
      var pop = await openWf('2026-07-20');
      var a = linkInfo(pop);
      type(pop, 'Camera test\nWardrobe fittings');
      await commit(pop);
      var s = await snap();
      kase('C3', 'a cell holding a linked note (7/20, Production wk 4) opens on it; a line added there joins it: production@4 = "Camera test / Wardrobe fittings", no week note',
        a.sel === 'production@4' && same(pn(s)['production@4'], { text: 'Camera test\nWardrobe fittings' }) && un(s, '2026-07-20') === undefined
          && same(cellLines('2026-07-20'), ['Camera test', 'Wardrobe fittings']),
        { opened: a, note: pn(s)['production@4'], week: un(s, '2026-07-20'), cell: cellLines('2026-07-20') });
    });

    await step('W3', async function () {
      var p1 = await openWf('2026-09-14'); var a = linkInfo(p1); await commit(p1);
      var p2 = await openWf('2026-08-03'); var b = linkInfo(p2); await commit(p2);
      var s = await snap();
      kase('W3', 'cells already holding a week note open on "Week of" (9/14 "Blocker", 8/3 "Table read" + a visitor) and stay week notes',
        a.sel === '' && b.sel === '' && same(un(s, '2026-09-14'), { text: 'Blocker' }) && same(un(s, '2026-08-03'), { text: 'Table read' }),
        { blocker: a, table: b, saved: [un(s, '2026-09-14'), un(s, '2026-08-03')] });
    });

    await step('W4', async function () {
      var pop = await openWf('2026-08-24');
      choose(pop, ''); type(pop, 'Lens check');
      await commit(pop);
      var s = await snap();
      kase('W4', '"Week of" picked by hand on 8/24: saved as the week\'s own note, nothing linked',
        same(un(s, '2026-08-24'), { text: 'Lens check' }) && !Object.keys(pn(s)).some(function (k) { return pn(s)[k].text === 'Lens check'; }),
        { saved: un(s, '2026-08-24') });
    });

    await step('W5', async function () {
      var pop = await openWf('2026-10-19');
      var a = linkInfo(pop);
      type(pop, 'Wrap shoot 10-20');
      var b = linkInfo(pop);
      await commit(pop);
      var s = await snap();
      var linked = Object.keys(pn(s)).filter(function (k) { return /Wrap shoot/.test(pn(s)[k].text); });
      kase('W5', '10/19\'s automatic note retyped alone ("Wrap shoot 10-20"): the row stays hidden, it is a rename, nothing linked',
        !a.shown && !b.shown && !linked.length && un(s, '2026-10-19') === undefined && same(cellLines('2026-10-19'), ['Wrap shoot 10/20/26'])
          && (s.autoNoteNames || {}).principalWrap === 'Wrap shoot',
        { before: a, typed: b, linked: linked, week: un(s, '2026-10-19'), cell: cellLines('2026-10-19'), names: s.autoNoteNames });
    });

    await step('W6', async function () {
      var pop = await openWf('2026-10-19');
      var a = linkInfo(pop);
      type(pop, 'Wrap day 10/20/26\nCrew party');
      var b = linkInfo(pop);
      await commit(pop);
      var s = await snap();
      var key = Object.keys(pn(s)).filter(function (k) { return pn(s)[k].text === 'Crew party'; })[0] || null;
      W5key = key;
      kase('W6', 'the automatic line renamed AND a line added in one save: the row shows on a phase once the line is added; "Crew party" is linked, the automatic note is renamed "Wrap day" and stays the week\'s',
        !a.shown && b.shown && !!b.sel && key === b.sel && un(s, '2026-10-19') === undefined
          && (s.autoNoteNames || {}).principalWrap === 'Wrap day' && same(cellLines('2026-10-19'), ['Wrap day 10/20/26', 'Crew party']),
        { before: a, typed: b, key: key, week: un(s, '2026-10-19'), cell: cellLines('2026-10-19'), names: s.autoNoteNames });
    });

    await step('W7', async function () {
      var pop = await openWf('2026-10-26');
      var a = linkInfo(pop);
      type(pop, 'Gap week note');
      await commit(pop);
      var s = await snap();
      kase('W7', 'a week no phase runs in (10/26): no Stays with row; saved as the week\'s note',
        a.sel === null && same(un(s, '2026-10-26'), { text: 'Gap week note' }), { row: a, saved: un(s, '2026-10-26') });
    });

    await step('P1', async function () {
      await pasteOn('2026-08-31', 'Pasted note');
      await pasteOn('2026-09-14', 'Pasted over');
      var s = await snap();
      kase('P1', 'plain text pasted onto an empty cell (8/31) is linked (production@10); pasted over 9/14\'s week note it stays the week\'s',
        same(pn(s)['production@10'], { text: 'Pasted note' }) && un(s, '2026-08-31') === undefined && same(cellLines('2026-08-31'), ['Pasted note'])
          && same(un(s, '2026-09-14'), { text: 'Pasted over' }),
        { linked: pn(s)['production@10'], week: un(s, '2026-08-31'), cell: cellLines('2026-08-31'), over: un(s, '2026-09-14') });
    });

    await step('M1', async function () {
      await view('sheet');
      T.set('start-production', '2026-07-06'); await settle();
      var w = { camera: weeksWith('Camera test'), wardrobe: weeksWith('Wardrobe fittings'), pasted: weeksWith('Pasted note'), crew: weeksWith('Crew party'),
                lens: weeksWith('Lens check'), table: weeksWith('Table read'), over: weeksWith('Pasted over'), gap: weeksWith('Gap week note') };
      kase('M1', 'Production a week later: the new linked notes move a week (Camera test and the line added to it, C3, 7/27, Pasted note 9/7, Crew party 10/26); the week notes stay',
        same(w.camera, ['2026-07-27']) && same(w.wardrobe, ['2026-07-27']) && same(w.pasted, ['2026-09-07']) && same(w.crew, ['2026-10-26'])
          && same(w.lens, ['2026-08-24']) && same(w.table, ['2026-08-03']) && same(w.over, ['2026-09-14']) && same(w.gap, ['2026-10-26']), w);
      T.set('start-production', '2026-06-29'); await settle();
    });

    await step('N1', async function () {
      await toMonth('July 2026');
      var plus = q('#table-wrap .mv-note-add[data-note-day="2026-07-08"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="2026-07-08"]');
      if (!plus) throw new Error('no + on 7/8');
      plus.click(); await T.sleep(250);
      var p = mvPop(); if (!p) throw new Error('no month editor on 7/8');
      var sel = q('.note-link-select', p);
      var a = { sel: sel ? sel.value : null, label: sel && sel.selectedOptions[0] ? txt(sel.selectedOptions[0]) : null };
      var ta = q('textarea', p); ta.value = 'Rig check'; ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      await settle();
      var s = await snap();
      var shown = qa('#table-wrap .mv-note-block[data-note-day="2026-07-08"]').map(txt);
      kase('N1D', 'and it is drawn on 7/8 as "Rig check", with no date after it (owner\'s picker "Drop the date": a Month-only note sits on its own day)',
        shown.indexOf('Rig check') !== -1 && !shown.some(function (t) { return /^Rig check \d/.test(t); }), { shown: shown });
      kase('N1', 'the month view\'s "+" on Wed 7/8 opens Stays with on its first phase (production@day7, "Production · Day 7"); saved as is, it is linked there (hidden from the waterfall, as a month note starts)',
        a.sel === 'production@day7' && a.label === 'Production · Day 7' && same(pn(s)['production@day7'], { text: 'Rig check', sheetHidden: true })
          && !(s.dayNotes || {})['2026-07-08'],
        { opened: a, note: pn(s)['production@day7'], day: (s.dayNotes || {})['2026-07-08'] });
    });

    await step('Q1', async function () {
      await toMonth('July 2026');
      var plus = q('#table-wrap .mv-note-add[data-note-day="2026-07-15"]');
      if (!plus) throw new Error('no day cell for 7/15');
      plus.scrollIntoView({ block: 'center' }); await T.sleep(150);
      var r = plus.getBoundingClientRect();
      // A click on the day (not on its "+"): the page records it as the day a paste goes to.
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
      await T.sleep(150);
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
      var dt = new DataTransfer(); dt.setData('text/plain', 'Pasted month note');
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      await settle();
      var s = await snap();
      var keys = Object.keys(pn(s)).filter(function (k) { return pn(s)[k].text === 'Pasted month note'; });
      var shown = qa('#table-wrap .mv-note-block[data-note-day="2026-07-15"]').map(txt);
      kase('Q1', '⌘V of plain text onto Wed 7/15 in the month view: linked to Production\'s shoot day (hidden from the waterfall, as a month note starts), not a note of the day; drawn on 7/15 as "Pasted month note", no date after it',
        keys.length === 1 && /^production@day\d+$/.test(keys[0]) && pn(s)[keys[0]].sheetHidden === true && !(s.dayNotes || {})['2026-07-15']
          && shown.indexOf('Pasted month note') !== -1,
        { keys: keys, note: keys.length ? pn(s)[keys[0]] : null, day: (s.dayNotes || {})['2026-07-15'], shown: shown });
    });

    await step('Q2', async function () {
      await view('month');
      await T.openSettings('prefs'); await T.sleep(300);
      var btn = qa('button').filter(function (b) { return /^Paste notes/.test(txt(b)) && b.offsetWidth; })[0];
      if (!btn) throw new Error('no Paste notes button');
      btn.click(); await T.until(function () { return q('.paste-notes-overlay textarea'); }, 'paste box', 40, 100);
      var pt = q('.paste-notes-overlay textarea');
      pt.value = '7/16/26, Boxed note, red\n10/28/26, Gap day note'; pt.dispatchEvent(new Event('input', { bubbles: true })); await T.sleep(300);
      q('.paste-notes-add').click(); await T.sleep(700);
      try { T.closeSettings(); } catch (e) {}
      await settle();
      var s = await snap();
      var keys = Object.keys(pn(s)).filter(function (k) { return pn(s)[k].text === 'Boxed note'; });
      var gap = ((s.dayNotes || {})['2026-10-28'] || []).map(function (e) { return e.text; });
      kase('Q2', 'Paste notes…: "7/16/26, Boxed note, red" is linked to Production\'s shoot day with its red; "10/28/26, Gap day note" (no phase that week) stays a note of the day',
        keys.length === 1 && /^production@day\d+$/.test(keys[0]) && String(pn(s)[keys[0]].color || '').toUpperCase() === '#FF0000'
          && pn(s)[keys[0]].sheetHidden === true && !(s.dayNotes || {})['2026-07-16'] && same(gap, ['Gap day note']),
        { keys: keys, note: keys.length ? pn(s)[keys[0]] : null, gap: gap });
    });

    await step('Q3', async function () {
      // Prod Prep wk 5 (week of 6/15) holds no linked note: the first pasted note links there; the second, two days later
      // in the same phase week, would have JOINED it (taking Monday and the red), so it stays a note of its own day.
      await view('month');
      await T.openSettings('prefs'); await T.sleep(300);
      var btn = qa('button').filter(function (b) { return /^Paste notes/.test(txt(b)) && b.offsetWidth; })[0];
      if (!btn) throw new Error('no Paste notes button');
      btn.click(); await T.until(function () { return q('.paste-notes-overlay textarea'); }, 'paste box', 40, 100);
      var pt = q('.paste-notes-overlay textarea');
      pt.value = '6/15/26, Mon note, red\n6/17/26, Wed note, pink'; pt.dispatchEvent(new Event('input', { bubbles: true })); await T.sleep(300);
      q('.paste-notes-add').click(); await T.sleep(700);
      try { T.closeSettings(); } catch (e) {}
      await settle();
      var s = await snap();
      var wed = ((s.dayNotes || {})['2026-06-17'] || []).map(function (e) { return [e.text, e.color]; });
      kase('Q3', 'two notes pasted into one free phase week (Prod Prep wk 5): Mon links (prodPrep@5, Mon, red); Wed stays a note of its day, pink, never joined to Monday\'s',
        same(pn(s)['prodPrep@5'], { text: 'Mon note', dow: 0, color: '#FF0000', sheetHidden: true }) && wed.length === 1 && wed[0][0] === 'Wed note'
          && String(wed[0][1] || '').toUpperCase() !== '#FF0000' && !!wed[0][1],
        { linked: pn(s)['prodPrep@5'], wed: (s.dayNotes || {})['2026-06-17'] });
    });

    await step('N2', async function () {
      // Thu 6/4 is in Prod Prep wk 3, which already holds the linked "Tech scout" (Wed): a "+" there opens on This day.
      await toMonth('June 2026');
      var plus = q('#table-wrap .mv-note-add[data-note-day="2026-06-04"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="2026-06-04"]');
      if (!plus) throw new Error('no + on 6/4');
      plus.click(); await T.sleep(250);
      var p = mvPop(); if (!p) throw new Error('no month editor on 6/4');
      var sel = q('.note-link-select', p);
      var a = { sel: sel ? sel.value : null, marked: sel ? sel.hasAttribute('data-new-note') : null };
      p.querySelector('textarea').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await settle();
      kase('N2', 'a "+" on Thu 6/4, in a phase week that already holds a linked note (Tech scout, prodPrep@3): Stays with opens on This day, so nothing is joined',
        a.sel === '' && a.marked === false, a);
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'notephase threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
var W5key = null;
