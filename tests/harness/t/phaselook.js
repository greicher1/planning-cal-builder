// phaselook -- NOTES LINKED TO A PHASE, step 3: the look travels (PHASE-LINKED-NOTES-PLAN.md §4.3, R7(a), D10). Every
// writer of a Notes cell's look -- the text style bar (bold, italic, colour, alignment, size), the row drag, the row
// handle's double-click and the menu's Reset row height, the note editor's colour -- writes ON a linked note when the
// cell takes its look from one (no typed text of its own), and drops the week's own copy, so it travels with the note.
// The row drag and the handle's double-click are frozen (installGridResizers): they are observed, not edited.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh phaselook 600
//
// tests/fixtures/phasenotes.sptcal (see t/phasenotes.js): Stunt rehearsal = Production wk 2 on 7/6 (size 9, height 60),
// Tech scout = Prod Prep wk 3 on 6/1 (Wed, #00B0F0), Visitor = Production wk 6 under 8/3's typed "Table read"
// (#FFC000, size 9, bold+italic), Day ten on 7/13.
//
//   S1  the style bar's B on Stunt rehearsal's cell: bold goes on the note (phaseNotes.style), none on the week
//   S2  the bar's size 10 there: the note's size, none on the week
//   S3  Production two weeks later: the bold, the size and the 60 px row are drawn on its new week (7/20); 7/6 keeps none
//   S4  the bar on 8/3 (typed "Table read" + visiting Visitor): the colour goes on the WEEK, Visitor's note gets none
//   H1  a row dragged taller on Tech scout's cell: the height goes on the note, rowHeightsByWeek keeps none; Prod Prep a
//       week later carries the tall row to 6/8 and 6/1 is back to the default; U1 one undo takes the height back off
//   H2  the handle's double-click on Stunt rehearsal's 60 px row: the note loses its height, and it stays gone after the
//       schedule is worked out again
//   H3  the menu's Reset row height does the same on Tech scout's moved row
//   C1  the note editor's colour on 7/13 (Day ten), a week whose own colour (#00B050) was winning: the colour goes on
//       the note and the week's own is dropped, so the pick shows
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phaselook', cases: [] };
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
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function closePops(){ T.closePops(); }   // presses an open tool panel's ✕ (no click-away since 11 Nov 2026)
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function inner(td) { return td.querySelector('.cell-body') || td; }
  function weightOf(wk) { var t = noteTd(wk); return t ? +getComputedStyle(inner(t)).fontWeight : null; }
  function bg(wk) { var t = noteTd(wk); return t ? getComputedStyle(t).backgroundColor : null; }
  function rowH(wk) { var t = noteTd(wk), tr = t && t.closest('tr'); return tr ? tr.style.height : null; }
  function rowIdx(wk) { var t = noteTd(wk), tr = t && t.closest('tr'); return tr ? Array.prototype.indexOf.call(tr.parentElement.rows, tr) : -1; }

  // ---- pointer helpers (textstyle's and zoomresize's) ----------------------------------------------------------------
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function pe(type, p, extra) {
    var o = Object.assign({ bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true }, extra || {});
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if (type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  async function pick(el) { el.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(80); var p = mid(el); pe('pointerdown', p); pe('pointerup', p); await T.sleep(250); }
  function bar() { return q('.view-toggle-row .style-bar-host .style-bar'); }
  async function press(cls) { q(cls, bar()).click(); await T.sleep(400); }
  async function size(v) { var s = q('.hf-size', bar()); s.value = String(v); s.dispatchEvent(new Event('change', { bubbles: true })); await T.sleep(400); }
  async function colour(hex) { var c = q('.hf-color', bar()); c.value = hex;
    c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); await T.sleep(400); }
  function unpick() { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }
  async function dragRow(wk, dy) {
    var r = rowIdx(wk); if (r < 0) throw new Error('no row for ' + wk);
    noteTd(wk).scrollIntoView({ block: 'center' }); await T.sleep(150);
    var h = q('#table-wrap .grid-resize.is-row[data-row="' + r + '"]'); if (!h) throw new Error('no row handle ' + r);
    var p = mid(h);
    h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, pointerId: 9, button: 0, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y + dy / 2, pointerId: 9, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y + dy, pointerId: 9, buttons: 1, isPrimary: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: p.x, clientY: p.y + dy, pointerId: 9, isPrimary: true }));
    await settle();
  }
  async function dblRow(wk) {
    var r = rowIdx(wk); if (r < 0) throw new Error('no row for ' + wk);
    noteTd(wk).scrollIntoView({ block: 'center' }); await T.sleep(150);
    var h = q('#table-wrap .grid-resize.is-row[data-row="' + r + '"]'); if (!h) throw new Error('no row handle ' + r);
    h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    await settle();
  }

  // ---- Save and Load -------------------------------------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'phaselook.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phaselook.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function snap() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    for (var attempt = 0; attempt < 2; attempt++) {
      closePops(); unpick(); await T.sleep(200);
      var stem = 'phaselook-load-' + (++loads), name = stem + '.sptcal';
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

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && /Blocker/.test(noteTd('2026-09-14').innerText || ''); }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = await snap(), S0text = JSON.stringify(S0);

    // ===== S1-S3: the style bar on a linked cell ========================================================================
    await step('S1', async function () {
      await pick(noteTd('2026-07-06'));
      var armed = !!bar() && bar().classList.contains('has-target');
      await press('.hf-b');
      var s = await snap();
      kase('S1', 'the bar\'s B on Stunt rehearsal\'s cell (a linked note, no typed text): bold is on the note, the week has no style, the cell draws bold',
        armed && same(s.phaseNotes['production@2'].style, { bold: true }) && !((s.textStyles || {}).note || {})['2026-07-06'] && weightOf('2026-07-06') >= 700,
        { armed: armed, note: s.phaseNotes['production@2'], weekStyle: ((s.textStyles || {}).note || {})['2026-07-06'] || null, weight: weightOf('2026-07-06') });
      await size(10);
      var s2 = await snap();
      kase('S2', 'the bar\'s size 10 there: the note\'s size is 10, the week has none',
        s2.phaseNotes['production@2'].size === 10 && !(s2.noteFontSize || {})['2026-07-06'],
        { note: s2.phaseNotes['production@2'], weekSize: (s2.noteFontSize || {})['2026-07-06'] || null });
      unpick(); await T.sleep(200);
      T.set('start-production', '2026-07-13'); await settle();
      var o = { w720: weightOf('2026-07-20'), rh720: rowH('2026-07-20'), rh76: rowH('2026-07-06'), text76: (noteTd('2026-07-06').innerText || '').trim() };
      var s3 = await snap();
      kase('S3', 'Production two weeks later: the bold, the size and the 60 px row are drawn on 7/20 with the note; 7/6 keeps none of them',
        o.w720 >= 700 && o.rh720 === '60px' && o.rh76 !== '60px' && !/Stunt/.test(o.text76) && !(s3.noteFontSize || {})['2026-07-20'] && !((s3.textStyles || {}).note || {})['2026-07-20'],
        o);
      await load(S0text);
    });
    await step('S4', async function () {
      await pick(noteTd('2026-08-03'));
      await colour('#ff0000');
      unpick(); await T.sleep(200);
      var s = await snap();
      kase('S4', 'the bar on 8/3 (typed "Table read" + a visiting linked note): the colour goes on the week\'s own style, the visitor gets none',
        ((s.textStyles || {}).note || {})['2026-08-03'] && s.textStyles.note['2026-08-03'].color === '#ff0000' && !s.phaseNotes['production@6'].style,
        { weekStyle: ((s.textStyles || {}).note || {})['2026-08-03'] || null, note: s.phaseNotes['production@6'] });
      await load(S0text);
    });

    // ===== H1-H3: row heights ==========================================================================================
    await step('H1', async function () {
      var before = rowH('2026-06-01');
      await dragRow('2026-06-01', 30);
      await T.sleep(300);
      var s = await snap(), dragged = rowH('2026-06-01');
      var h = (s.phaseNotes['prodPrep@3'] || {}).height;
      T.set('start-prodPrep', '2026-05-25'); await settle();
      var o = { before: before, dragged: dragged, noteHeight: h, byWeek: s.rowHeightsByWeek, rh68: rowH('2026-06-08'), rh61: rowH('2026-06-01') };
      kase('H1', 'a row dragged taller on Tech scout\'s cell: the height is the note\'s (rowHeightsByWeek keeps none); Prod Prep a week later draws the tall row on 6/8, and 6/1 is back to the default',
        typeof h === 'number' && h > 40 && dragged === h + 'px' && same(s.rowHeightsByWeek, {}) && o.rh68 === h + 'px' && o.rh61 !== h + 'px', o);
      await undo();   // the start
      await undo();   // the drag
      var su = await snap();
      kase('U1', 'two undos (the start, then the drag) take the height back off the note',
        su.phaseNotes['prodPrep@3'].height === undefined && same(su.rowHeightsByWeek, {}) && rowH('2026-06-01') !== h + 'px',
        { note: su.phaseNotes['prodPrep@3'], byWeek: su.rowHeightsByWeek, rh: rowH('2026-06-01') });
      await load(S0text);
    });
    await step('H2', async function () {
      var before = rowH('2026-07-06');
      await dblRow('2026-07-06');
      await T.sleep(300);
      var s = await snap();
      T.set('start-production', '2026-07-13'); await settle();
      T.set('start-production', '2026-06-29'); await settle();
      var o = { before: before, after: rowH('2026-07-06'), note: s.phaseNotes['production@2'], byWeek: s.rowHeightsByWeek };
      kase('H2', 'the handle\'s double-click on Stunt rehearsal\'s 60 px row: the note loses its height, and the row stays default after the schedule is worked out twice more',
        before === '60px' && o.after !== '60px' && o.note.height === undefined && same(o.byWeek, {}), o);
      await load(S0text);
    });
    await step('H3', async function () {
      await dragRow('2026-06-01', 30);
      await T.sleep(300);
      var tall = rowH('2026-06-01');
      var td = noteTd('2026-06-01'); td.scrollIntoView({ block: 'center' }); await T.sleep(100);
      var p = mid(td);
      td.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 2 }));
      await T.sleep(300);
      var item = qa('.day-menu-item, [role=menuitem]').filter(function (e) { return /Reset row height/.test(e.textContent || ''); })[0];
      if (!item) throw new Error('no Reset row height in the menu');
      item.click(); await settle();
      var s = await snap();
      T.set('weeks-prodPrep', '7'); await settle();
      var o = { tall: tall, after: rowH('2026-06-01'), note: s.phaseNotes['prodPrep@3'], byWeek: s.rowHeightsByWeek };
      kase('H3', 'the right-click menu\'s Reset row height on Tech scout\'s dragged row: the note loses its height, and the row stays default after the schedule changes',
        parseFloat(tall) > 40 && o.after !== tall && o.note.height === undefined && same(o.byWeek, {}), o);
      await load(S0text);
    });

    // ===== C1: the editor's colour over a week's own ===================================================================
    await step('C1', async function () {
      var s0 = JSON.parse(S0text); s0.noteColors = Object.assign({}, s0.noteColors, { '2026-07-13': '#00B050' });
      await load(JSON.stringify(s0));
      var green = bg('2026-07-13');
      var td = noteTd('2026-07-13'); td.scrollIntoView({ block: 'center' }); await T.sleep(100);
      T.openCell(td); await T.sleep(300);
      var pop = q('.note-pop'); if (!pop) throw new Error('no editor on 7/13');
      var sw = pop.querySelector('.color-swatch[data-color="#0070C0"]'); if (!sw) throw new Error('no #0070C0 swatch');
      sw.click();
      var ta = q('textarea', pop); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      await settle();
      var s = await snap();
      kase('C1', 'the editor\'s colour on Day ten\'s cell, whose week colour #00B050 was winning: the colour goes on the note and the week\'s own is dropped, so the cell shows it',
        green === 'rgb(0, 176, 80)' && s.phaseNotes['production@day10'].color === '#0070C0' && !(s.noteColors || {})['2026-07-13'] && bg('2026-07-13') === 'rgb(0, 112, 192)',
        { green: green, note: s.phaseNotes['production@day10'], weekColour: (s.noteColors || {})['2026-07-13'] || null, bg: bg('2026-07-13') });
      await load(S0text);
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phaselook threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
