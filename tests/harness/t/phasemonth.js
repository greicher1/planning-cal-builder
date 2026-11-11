// phasemonth -- NOTES LINKED TO A PHASE, step 5: the month view (PHASE-LINKED-NOTES-PLAN.md §4.2, §4.6's last bullet,
// R8(a), R10(a); built 10 Nov 2026), and the note popups' one action button at the top right (owner, 10 Nov 2026).
//   - The month view draws each linked note on its day (mvWfLinesFor), after the week's own lines, in its colour.
//   - Its editor (kind 'linked') edits that note's line and colour, its "Show in waterfall" (sheetHidden, R10(a)) and
//     "Stays with" (R8(a)): "This day", or a phase whose working week this is (Production on a shoot day: that shoot
//     day). A month note or a waterfall line can be linked from the same row.
//   - The month view's drag moves a linked line by DAY: re-linked where its phase runs that week (a shoot day for
//     Production), else a plain note of the day it lands on.
//   - Delete Note at the top right of the waterfall's and the month's editor for a typed note; Hide Auto-Note there for
//     an automatic one.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh phasemonth 900
//
// tests/fixtures/phasenotes.sptcal (see t/phasenotes.js): Stunt rehearsal = production@2 (size 9, height 60), drawn on
// Mon 7/6, Production's 5th shoot day; Day ten = production@day10, Mon 7/13; Tech scout = prodPrep@3 on Wed 6/3
// (#00B0F0); Visitor = production@6 (#FF0000) under 8/3's typed "Table read"; 8/10's typed "Cast fittings\nNetwork
// call"; post@1 on Mon 11/2. Production starts Mon 6/29/26 (7/3 is a holiday, so shoot day 7 is Wed 7/8); Prod Prep runs
// 5/18-6/26 (6 weeks).
//
//   P1  the month view draws each linked note on its day, in its colour, after the week's own line (8/3: Table read,
//       then Visitor); Production a week later carries Stunt rehearsal to 7/13 and Day ten to its 10th shoot day, 7/17
//   P2  monthHidden: the note leaves the month view and stays in the waterfall
//   P3  sheetHidden: the note leaves the waterfall and stays in the month view
//   E1  the linked editor: the stored line (no date), Stays with on its link ("Production wk 2"), offering This day and
//       Production · Day 5; renamed and recoloured, it writes the linked note (look kept), not 7/6's typed note
//   E2  "Show in waterfall" off: the note leaves the waterfall (sheetHidden), stays in the month view, reopens off; on
//       again: back in the waterfall
//   E3  Stays with "This day": the note becomes 7/6's own typed line, dated, with the size and row height it lent the
//       cell, and Production moved leaves it there
//   E4  a "+" on Wed 7/8 linked to "Production · Day 7": a linked note hidden from the waterfall (a month note starts
//       off), drawn on 7/8, and on the 7th shoot day (7/14) when Production moves a week
//   E5  8/10's typed "Network call" linked to its shoot day: out of the week's typed note, into the linked note; it
//       follows that shoot day when Production moves
//   E6  a "+" on Thu 6/4 linked to Prod Prep wk 3, where Tech scout is: the hint says it joins it there, and it does
//   D1  Stunt rehearsal dragged 7/6 -> 7/8: re-linked to the 7th shoot day, its look with it
//   DU  one undo puts the drag back
//   D2  Tech scout dragged 6/3 -> 6/24 (Prod Prep wk 6): re-linked as prodPrep@6 on Wednesday, its colour with it
//   D3  Tech scout dragged 6/3 -> 7/1, where Prod Prep does not run: a plain line of the 6/29 week stamped 7/1, in its
//       colour; no linked note holds it
//   D4  the same drag of a note hidden from the waterfall: a month note of 7/1, in its colour; the waterfall unchanged
//       (until 10 Nov 2026 the drag rebuilt 7/1's month notes without it, and the note was lost)
//   C1  a custom phase removed: its note hidden from the waterfall becomes a month note of its day, colour kept
//   B1  the month editor of a linked note: Delete Note at its top right; it deletes the note in both views; undo
//   B2  a "+" has no Delete Note; a month note's editor has one
//   B3  the waterfall editor: Delete Note at the top right of a typed cell (8/3) deletes the typed text and the visiting
//       linked note; an automatic note's cell has Hide Auto-Note there and no Delete Note
//   F1  sheetHidden is saved as true, with no new snapshot key and no new fields.byId id
//   F2  any other sheetHidden value is dropped on Load and counted; the note is kept
//   E0  no console errors, apart from F2's repair warning
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phasemonth', cases: [] };
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
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function bodyFocus() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  function closePops() { document.body.click(); }
  function key(k, opts) { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {}))); }
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  // ---- views ----------------------------------------------------------------------------------------------------------
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
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function monthOf(iso) { return MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4); }

  // ---- the waterfall ---------------------------------------------------------------------------------------------------
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  async function cell(wk) {
    await view('sheet');
    var t = noteTd(wk);
    return t && t.classList.contains('has-note') ? (q('.cell-body', t) || t).innerText.trim() : '';
  }
  async function cellBg(wk) { await view('sheet'); var t = noteTd(wk); return t ? getComputedStyle(t).backgroundColor : null; }
  async function openWf(wk) {
    await view('sheet');
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  function escWf() { var p = q('.note-pop'), ta = p && q('textarea', p); if (ta) ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }

  // ---- the month view -------------------------------------------------------------------------------------------------
  function blocks(iso, kind) { return qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"]' + (kind ? '[data-note-kind="' + kind + '"]' : '')); }
  async function texts(iso, kind) { await toMonth(monthOf(iso)); return blocks(iso, kind).map(function (b) { return txt(b); }); }
  async function blockBg(iso, like) {
    await toMonth(monthOf(iso));
    var b = blocks(iso).filter(function (x) { return txt(x).indexOf(like) !== -1; })[0];
    return b ? getComputedStyle(b).backgroundColor : null;
  }
  function plus(iso) { return q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]'); }
  function mvPop() { return byId('mv-note-pop'); }
  async function openAdd(iso) {
    await toMonth(monthOf(iso));
    var p = plus(iso); if (!p) throw new Error('no + on ' + iso);
    p.click(); await T.sleep(250);
    if (!mvPop()) throw new Error('no editor on ' + iso);
    return mvPop();
  }
  async function openBlock(iso, like) {
    await toMonth(monthOf(iso));
    var b = blocks(iso).filter(function (x) { return txt(x).indexOf(like) !== -1; })[0];
    if (!b) throw new Error('no note like "' + like + '" on ' + iso + ' (have ' + JSON.stringify(blocks(iso).map(txt)) + ')');
    b.scrollIntoView({ block: 'center' }); await T.sleep(80);
    b.click(); await T.sleep(250);
    if (!mvPop()) throw new Error('no editor for "' + like + '" on ' + iso);
    return mvPop();
  }
  // What the month editor shows: its kind's markers, the text box, the switch, the Stays with row and hint.
  function popInfo(p) {
    p = p || mvPop();
    var sel = p && q('.note-link-select', p), cb = p && q('.note-view-cb', p);
    return p ? { text: q('textarea', p).value, on: cb ? cb.checked : null, sel: sel ? sel.value : null, selId: sel ? sel.id : null,
                 opts: sel ? Array.from(sel.options).map(function (o) { return [o.value, o.textContent.trim()]; }) : null,
                 hint: txt(q('.note-link-hint', p)), del: !!q('.note-pop-head .mv-note-delete', p) } : null;
  }
  function choose(value) {
    var sel = q('.note-link-select', mvPop()); if (!sel) throw new Error('no Stays with row');
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function pickColour(hex) {
    var sw = qa('.color-swatch', mvPop()).filter(function (s) { return (s.getAttribute('data-color') || '').toUpperCase() === hex.toUpperCase(); })[0];
    if (!sw) throw new Error('no swatch ' + hex);
    sw.click();
  }
  function setSwitch(on) { var cb = q('.note-view-cb', mvPop()); if (!cb) throw new Error('no switch'); if (cb.checked !== on) cb.click(); }
  async function commitMv(text) {
    var p = mvPop(); if (!p) throw new Error('no month editor open');
    var ta = q('textarea', p);
    if (text !== undefined) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    await settle();
  }
  function escMv() { var p = mvPop(); if (p) q('textarea', p).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); }
  // Press on a note, move through days (each day's "+" cell, re-found every step: the grid redraws live), let go.
  async function dragNote(day, like, via) {
    await toMonth(monthOf(day));
    var find = function () { return blocks(day).filter(function (x) { return txt(x).indexOf(like) !== -1; })[0]; };
    var b = find(); if (!b) throw new Error('no note like ' + like + ' on ' + day);
    b.scrollIntoView({ block: 'center' }); await T.sleep(150);
    b = find();
    var at = mid(b);
    b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 0, buttons: 1 }));
    for (var i = 0; i < via.length; i++) {
      var t = q('#table-wrap .mv-note-add[data-note-day="' + via[i] + '"]'); if (!t) throw new Error('no day cell for ' + via[i]);
      var to = mid(t);
      for (var k = 1; k <= 5; k++) {
        window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX: at.x + (to.x - at.x) * k / 5, clientY: at.y + (to.y - at.y) * k / 5 }));
        await T.sleep(60);
      }
      at = to;
    }
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: at.x, clientY: at.y }));
    await settle();
  }

  // ---- Save and Load (phasekeys') ---------------------------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'phasemonth.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phasemonth.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function snap() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    bodyFocus();
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    for (var attempt = 0; attempt < 2; attempt++) {
      escMv(); escWf(); closePops(); key('Escape'); await T.sleep(200);
      var stem = 'phasemonth-load-' + (++loads), name = stem + '.sptcal';
      var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
      for (var i = 0; i < 80; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
      await p;
      try {
        await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
        await settle();
        bodyFocus();
        return;
      } catch (e) { if (attempt) throw e; }
    }
  }
  async function undo() { byId('undo-btn').click(); await settle(); bodyFocus(); }
  function pn(s) { return s.phaseNotes || {}; }
  function holds(s, text) { return Object.keys(pn(s)).filter(function (k) { return split(pn(s)[k].text).indexOf(text) !== -1; }); }
  function split(t) { return String(t || '').split('\n'); }
  function with_(mut) { var s = JSON.parse(S0text); mut(s); return JSON.stringify(s); }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  // ⚠️ lastEdited is left out of the key list (11 Nov 2026), as noteviews does: Date Last Edited (1507204) writes it at the
  // top level once a calendar has been edited, and S0 is a save of the untouched fixture.
  function topKeys(o) { return Object.keys(o).filter(function (k) { return k !== 'lastEdited'; }).sort().join(','); }
  var S0, S0text, ids0, keys0;

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && /Blocker/.test(noteTd('2026-09-14').innerText || ''); }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    bodyFocus();
    S0 = await snap(); S0text = JSON.stringify(S0);
    ids0 = Object.keys(S0.fields.byId).sort().join(','); keys0 = topKeys(S0);

    // ===== P: drawing ==================================================================================================
    await step('P1', async function () {
      var o = { d63: await texts('2026-06-03'), bg63: await blockBg('2026-06-03', 'Tech scout'), d76: await texts('2026-07-06'),
                d713: await texts('2026-07-13'), d83: await texts('2026-08-03'), bgVis: await blockBg('2026-08-03', 'Visitor'),
                d112: await texts('2026-11-02') };
      T.set('start-production', '2026-07-06'); await settle();
      o.m76 = await texts('2026-07-06'); o.m713 = await texts('2026-07-13'); o.m717 = await texts('2026-07-17');
      kase('P1', 'the month view draws each linked note on its day, in its colour, after the week\'s own line; Production a week later carries Stunt rehearsal to 7/13 and Day ten to its 10th shoot day, 7/17',
        same(o.d63, ['Tech scout 6/3/26']) && o.bg63 === 'rgb(0, 176, 240)' && same(o.d76, ['Stunt rehearsal']) && same(o.d713, ['Day ten 7/13/26']) &&
        same(o.d83, ['Table read', 'Visitor']) && o.bgVis === 'rgb(255, 0, 0)' && same(o.d112, ['Post kickoff with editorial and the network team']) &&
        o.m76.indexOf('Stunt rehearsal') === -1 && o.m713.indexOf('Stunt rehearsal') !== -1 && o.m713.join('|').indexOf('Day ten') === -1 &&
        same(o.m717, ['Day ten 7/17/26']), o);
      await load(S0text);
    });
    await step('P2', async function () {
      await load(with_(function (s) { s.phaseNotes['production@6'].monthHidden = true; }));
      var o = { d83: await texts('2026-08-03'), wf: await cell('2026-08-03') };
      kase('P2', 'monthHidden: Visitor leaves the month view (8/3 keeps Table read) and stays in the waterfall\'s 8/3 cell',
        same(o.d83, ['Table read']) && o.wf === 'Table read\nVisitor', o);
      await load(S0text);
    });
    await step('P3', async function () {
      await load(with_(function (s) { s.phaseNotes['prodPrep@3'].sheetHidden = true; }));
      var o = { d63: await texts('2026-06-03'), wf: await cell('2026-06-01') };
      kase('P3', 'sheetHidden: Tech scout leaves the waterfall (6/1 empty) and stays in the month view on 6/3',
        same(o.d63, ['Tech scout 6/3/26']) && o.wf === '', o);
      await load(S0text);
    });

    // ===== E: the editor ===============================================================================================
    await step('E1', async function () {
      var info = popInfo(await openBlock('2026-07-06', 'Stunt rehearsal'));
      pickColour('#92D050');
      await commitMv('Stunt day');
      var s = await snap();
      var o = { info: info, note: pn(s)['production@2'] || null, user: (s.userNotes || {})['2026-07-06'] || null,
                wf: await cell('2026-07-06'), wfBg: await cellBg('2026-07-06'), mv: await texts('2026-07-06'), mvBg: await blockBg('2026-07-06', 'Stunt day') };
      kase('E1', 'the linked editor shows the stored line, Stays with on "Production wk 2" (This day and Production · Day 5 offered, no id), the switch on; renamed and recoloured it writes production@2 (size and height kept), not 7/6\'s typed note',
        info.text === 'Stunt rehearsal' && info.on === true && info.sel === 'production@2' && !info.selId && info.del &&
        same(info.opts, [['', 'This day (Mon 7/6)'], ['production@day5', 'Production · Day 5'], ['production@2', 'Production wk 2']]) &&
        same(o.note, { text: 'Stunt day', color: '#92D050', size: 9, height: 60 }) && !o.user &&
        o.wf === 'Stunt day' && o.wfBg === 'rgb(146, 208, 80)' && same(o.mv, ['Stunt day']) && o.mvBg === 'rgb(146, 208, 80)', o);
      await load(S0text);
    });
    await step('E2', async function () {
      await openBlock('2026-06-03', 'Tech scout');
      setSwitch(false);
      await commitMv();
      var s1 = await snap();
      var o = { note: pn(s1)['prodPrep@3'] || null, wf: await cell('2026-06-01'), mv: await texts('2026-06-03') };
      o.reopen = popInfo(await openBlock('2026-06-03', 'Tech scout')).on;
      setSwitch(true);
      await commitMv();
      var s2 = await snap();
      o.note2 = pn(s2)['prodPrep@3'] || null; o.wf2 = await cell('2026-06-01');
      kase('E2', '"Show in waterfall" off: Tech scout leaves the waterfall (sheetHidden), stays in the month view, reopens off; switched on again it is back in the 6/1 cell',
        same(o.note, { text: 'Tech scout', dow: 2, color: '#00B0F0', sheetHidden: true }) && o.wf === '' && same(o.mv, ['Tech scout 6/3/26']) &&
        o.reopen === false && same(o.note2, { text: 'Tech scout', dow: 2, color: '#00B0F0' }) && o.wf2 === 'Tech scout 6/3/26', o);
      await load(S0text);
    });
    await step('E3', async function () {
      await openBlock('2026-07-06', 'Stunt rehearsal');
      choose('');
      await commitMv();
      var s = await snap();
      var o = { user: (s.userNotes || {})['2026-07-06'] || null, size: (s.noteFontSize || {})['2026-07-06'], height: (s.rowHeightsByWeek || {})['2026-07-06'],
                linked: holds(s, 'Stunt rehearsal'), mv: await texts('2026-07-06') };
      T.set('start-production', '2026-07-13'); await settle();
      o.after = await cell('2026-07-06'); o.t720 = await cell('2026-07-20');
      kase('E3', 'Stays with "This day": Stunt rehearsal becomes 7/6\'s own typed line stamped 7/6/26, with the size (9) and row height (60) it lent the cell; no linked note holds it; Production two weeks later leaves it on 7/6',
        same(o.user, { text: 'Stunt rehearsal 7/6/26' }) && o.size === 9 && o.height === 60 && !o.linked.length &&
        same(o.mv, ['Stunt rehearsal 7/6/26']) && o.after === 'Stunt rehearsal 7/6/26' && !/Stunt/.test(o.t720), o);
      await load(S0text);
    });
    var S4 = null;
    await step('E4', async function () {
      var info = popInfo(await openAdd('2026-07-08'));
      choose('production@day7');
      var hint = txt(q('.note-link-hint', mvPop()));
      await commitMv('Rig check');
      var s = S4 = await snap();
      var o = { info: info, hint: hint, note: pn(s)['production@day7'] || null, day: (s.dayNotes || {})['2026-07-08'] || null,
                mv: await texts('2026-07-08'), wf: await cell('2026-07-06') };
      T.set('start-production', '2026-07-06'); await settle();
      o.m714 = await texts('2026-07-14'); o.m78 = await texts('2026-07-08');
      kase('E4', 'a "+" on Wed 7/8 (switch off, no Delete Note) linked to "Production · Day 7": production@day7 hidden from the waterfall, drawn on 7/8 and not in 7/6\'s cell; Production a week later draws it on its 7th shoot day, 7/14',
        info.text === '' && info.on === false && info.sel === '' && !info.del && info.opts.some(function (x) { return x[0] === 'production@day7' && x[1] === 'Production · Day 7'; }) &&
        same(o.note, { text: 'Rig check', sheetHidden: true }) && !o.day && same(o.mv, ['Rig check 7/8/26']) && o.wf === 'Stunt rehearsal' &&
        o.m714.indexOf('Rig check 7/14/26') !== -1 && o.m78.join('|').indexOf('Rig check') === -1, o);
      await load(S0text);
    });
    await step('E5', async function () {
      var info = popInfo(await openBlock('2026-08-10', 'Network call'));
      var day = (info.opts.filter(function (x) { return /^production@day\d+(?!.)/.test(x[0]); })[0] || [])[0];
      if (!day) throw new Error('no shoot-day option on 8/10: ' + JSON.stringify(info.opts));
      choose(day);
      await commitMv();
      var s = await snap();
      var o = { info: info, day: day, note: pn(s)[day] || null, user: (s.userNotes || {})['2026-08-10'] || null,
                wf: await cell('2026-08-10'), mv: await texts('2026-08-10') };
      T.set('start-production', '2026-07-06'); await settle();
      o.wf810 = await cell('2026-08-10');
      kase('E5', '8/10\'s typed "Network call" (opening on This day) linked to its shoot day (Production · Day 30): out of the week\'s typed note (Cast fittings stays), into ' + day + ', shown in both views; Production a week later (its run no longer crosses the 7/3 holiday) draws it on its 30th shoot day, Fri 8/14',
        info.on === true && info.sel === '' && day === 'production@day30' && same(o.note, { text: 'Network call' }) && same(o.user, { text: 'Cast fittings' }) &&
        o.wf === 'Cast fittings\nNetwork call 8/10/26' && same(o.mv, ['Cast fittings', 'Network call 8/10/26']) && o.wf810 === 'Cast fittings\nVisitor\nNetwork call 8/14/26', o);
      await load(S0text);
    });
    await step('E6', async function () {
      await openAdd('2026-06-04');
      choose('prodPrep@3');
      var hint = txt(q('.note-link-hint', mvPop()));
      await commitMv('Gear check');
      var s = await snap();
      var o = { hint: hint, note: pn(s)['prodPrep@3'] || null, mv63: await texts('2026-06-03'), mv64: await texts('2026-06-04') };
      kase('E6', 'a "+" on Thu 6/4 linked to Prod Prep wk 3, where Tech scout is: the hint says it joins it there on Wed; it does (prodPrep@3 holds both lines, drawn on 6/3)',
        /already has a note/.test(o.hint) && /Tech scout/.test(o.hint) && /joins it there/.test(o.hint) &&
        same(o.note, { text: 'Tech scout\nGear check', dow: 2, color: '#00B0F0' }) && same(o.mv63, ['Tech scout', 'Gear check 6/3/26']) && !o.mv64.length, o);
      await load(S0text);
    });

    // ===== D: the month view's drag ====================================================================================
    await step('D1', async function () {
      await dragNote('2026-07-06', 'Stunt rehearsal', ['2026-07-08']);
      var s = await snap();
      var o = { note: pn(s)['production@day7'] || null, old: pn(s)['production@2'] || null, mv78: await texts('2026-07-08'), mv76: await texts('2026-07-06'),
                wf: await cell('2026-07-06'), user: (s.userNotes || {})['2026-07-06'] || null };
      kase('D1', 'Stunt rehearsal dragged 7/6 -> 7/8: re-linked to the 7th shoot day (production@day7), its size and row height with it, drawn "Stunt rehearsal 7/8/26"',
        same(o.note, { text: 'Stunt rehearsal', size: 9, height: 60 }) && !o.old && same(o.mv78, ['Stunt rehearsal 7/8/26']) && !o.mv76.length &&
        o.wf === 'Stunt rehearsal 7/8/26' && !o.user, o);
    });
    await step('DU', async function () {
      await undo();
      var s = await snap();
      kase('DU', 'one undo puts the drag back: production@2 on 7/6, nothing on 7/8',
        same(pn(s), pn(S0)) && same(await texts('2026-07-06'), ['Stunt rehearsal']) && !(await texts('2026-07-08')).length,
        { keys: Object.keys(pn(s)) });
      await load(S0text);
    });
    await step('D2', async function () {
      await dragNote('2026-06-03', 'Tech scout', ['2026-06-24']);
      var s = await snap();
      var o = { note: pn(s)['prodPrep@6'] || null, old: pn(s)['prodPrep@3'] || null, mv: await texts('2026-06-24'), bg: await blockBg('2026-06-24', 'Tech scout'),
                wf: await cell('2026-06-22') };
      kase('D2', 'Tech scout dragged 6/3 -> 6/24 (Prod Prep wk 6): re-linked as prodPrep@6 on Wednesday, its colour with it',
        same(o.note, { text: 'Tech scout', dow: 2, color: '#00B0F0' }) && !o.old && same(o.mv, ['Tech scout 6/24/26']) && o.bg === 'rgb(0, 176, 240)' &&
        o.wf === 'Tech scout 6/24/26', o);
      await load(S0text);
    });
    await step('D3', async function () {
      await dragNote('2026-06-03', 'Tech scout', ['2026-07-01']);
      var s = await snap();
      var o = { user: (s.userNotes || {})['2026-06-29'] || null, colour: (s.noteColors || {})['2026-06-29'] || null, held: holds(s, 'Tech scout'),
                mv: await texts('2026-07-01'), wf: await cell('2026-06-29') };
      T.set('start-prodPrep', '2026-05-25'); await settle();
      o.after = await texts('2026-07-01');
      kase('D3', 'Tech scout dragged 6/3 -> 7/1, where Prod Prep does not run: a plain line of the 6/29 week stamped 7/1/26 (after the week\'s automatic line), in its colour; no linked note holds it, and Prod Prep moved leaves it',
        same(o.user, { text: 'Start Principal Photography 6/29/26\nTech scout 7/1/26' }) && o.colour === '#00B0F0' && !o.held.length &&
        same(o.mv, ['Tech scout 7/1/26']) && o.wf === 'Start Principal Photography 6/29/26\nTech scout 7/1/26' && same(o.after, ['Tech scout 7/1/26']), o);
      await load(S0text);
    });
    await step('D4', async function () {
      await load(with_(function (s) { s.phaseNotes['prodPrep@3'].sheetHidden = true; }));
      await dragNote('2026-06-03', 'Tech scout', ['2026-07-01']);
      var s = await snap();
      var o = { day: (s.dayNotes || {})['2026-07-01'] || null, user: (s.userNotes || {})['2026-06-29'] || null, held: holds(s, 'Tech scout'),
                mv: await texts('2026-07-01', 'day'), wf: await cell('2026-06-29') };
      kase('D4', 'the same drag of a note hidden from the waterfall: a month note of 7/1 in its colour, under the bars where it was dropped; the 6/29 cell keeps its automatic line alone',
        same(o.day, [{ text: 'Tech scout', lane: null, color: '#00B0F0', bottom: true }]) && !o.user && !o.held.length && same(o.mv, ['Tech scout']) &&
        o.wf === 'Start Principal Photography 6/29/26', o);
      await load(S0text);
    });

    // ===== C1: a custom phase removed ==================================================================================
    await step('C1', async function () {
      await load(with_(function (s) {
        s.customPhaseDefs = [{ key: 'custom1', colorIndex: 0 }]; s.customPhaseCounter = 1;
        s.fields.byId['name-custom1'] = { value: 'Reshoots' };
        s.fields.byId['start-custom1'] = { value: '2026-12-07' };
        s.fields.byId['weeks-custom1'] = { value: '3' };
        s.phaseNotes['custom1@2'] = { text: 'Reshoot prep', color: '#92D050', sheetHidden: true };
      }));
      var before = { mv: await texts('2026-12-14'), wf: await cell('2026-12-14') };
      var row = q('.phase-row[data-key="custom1"]');
      if (!row) throw new Error('no custom1 row');
      row.querySelector('.remove-custom-phase').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Remove')) break; }
      await settle();
      var s = await snap();
      var o = { before: before, day: (s.dayNotes || {})['2026-12-14'] || null, user: (s.userNotes || {})['2026-12-14'] || null,
                linked: Object.keys(pn(s)), mv: await texts('2026-12-14', 'day'), bg: await blockBg('2026-12-14', 'Reshoot prep'), wf: await cell('2026-12-14') };
      kase('C1', 'a custom phase removed: its note hidden from the waterfall becomes a month note of its day (12/14), green; the waterfall stays without it',
        same(before.mv, ['Reshoot prep']) && before.wf === '' && same(o.day, [{ text: 'Reshoot prep', lane: null, color: '#92D050' }]) && !o.user &&
        o.linked.indexOf('custom1@2') === -1 && same(o.mv, ['Reshoot prep']) && o.bg === 'rgb(146, 208, 80)' && o.wf === '', o);
      await load(S0text);
    });

    // ===== B: the action button at the top right =======================================================================
    function topRight(p, btn) {
      if (!p || !btn) return null;
      var pr = p.getBoundingClientRect(), br = btn.getBoundingClientRect(), head = btn.parentElement, title = head && head.firstElementChild;
      var tr = title ? title.getBoundingClientRect() : null;
      return { inHead: !!head && head.classList.contains('note-pop-head'), last: !!head && head.lastElementChild === btn,
               rightGap: Math.round(pr.right - br.right), topGap: Math.round(br.top - pr.top),
               centred: tr ? Math.abs((br.top + br.bottom) / 2 - (tr.top + tr.bottom) / 2) <= 2 : false };
    }
    function placed(t) { return !!t && t.inHead && t.last && t.rightGap >= 0 && t.rightGap <= 16 && t.topGap <= 20 && t.centred; }
    await step('B1', async function () {
      var p = await openBlock('2026-07-06', 'Stunt rehearsal');
      var btn = q('.note-pop-head .mv-note-delete', p), at = topRight(p, btn), label = txt(btn);
      btn.click(); await settle();
      var s = await snap();
      var o = { at: at, label: label, keys: Object.keys(pn(s)), mv: await texts('2026-07-06'), wf: await cell('2026-07-06'), pop: !!mvPop() };
      await undo();
      var su = await snap();
      o.back = pn(su)['production@2'] || null; o.mvBack = await texts('2026-07-06');
      kase('B1', 'the linked note\'s month editor: "Delete Note" at its top right, beside the date; it deletes production@2 in both views and closes; one undo brings it back',
        placed(at) && label === 'Delete Note' && o.keys.indexOf('production@2') === -1 && o.keys.length === 4 && !o.mv.length && o.wf === '' && !o.pop &&
        same(o.back, pn(S0)['production@2']) && same(o.mvBack, ['Stunt rehearsal']), o);
      await load(S0text);
    });
    await step('B2', async function () {
      var add = popInfo(await openAdd('2026-07-07'));
      await commitMv('Fittings');
      var p = await openBlock('2026-07-07', 'Fittings');
      var at = topRight(p, q('.note-pop-head .mv-note-delete', p));
      q('.note-pop-head .mv-note-delete', p).click(); await settle();
      var s = await snap();
      kase('B2', 'a "+" has no Delete Note; a month note\'s editor has one at its top right, and it deletes that note',
        add.del === false && placed(at) && !(s.dayNotes || {})['2026-07-07'] && !(await texts('2026-07-07')).length, { add: add, at: at, day: (s.dayNotes || {})['2026-07-07'] || null });
      await load(S0text);
    });
    await step('B3', async function () {
      var p = await openWf('2026-08-03');
      var btn = q('.note-pop-head .wf-note-delete', p), at = topRight(p, btn), label = txt(btn);
      btn.click(); await settle();
      var s = await snap();
      var o = { at: at, label: label, user: (s.userNotes || {})['2026-08-03'] || null, visitor: pn(s)['production@6'] || null, wf: await cell('2026-08-03'), pop: !!q('.note-pop') };
      var p2 = await openWf('2026-06-29');
      var hide = q('.note-pop-head .wf-note-hide', p2);
      o.auto = { hide: txt(hide), at: topRight(p2, hide), del: !!q('.wf-note-delete', p2) };
      escWf(); await T.sleep(200);
      kase('B3', 'the waterfall editor: "Delete Note" at the top right of 8/3 (typed + Visitor) deletes the typed text and the visiting linked note; the automatic note\'s cell (6/29) has "Hide Auto-Note" there and no Delete Note',
        placed(at) && label === 'Delete Note' && !o.user && !o.visitor && o.wf === '' && !o.pop &&
        o.auto.hide === 'Hide Auto-Note' && placed(o.auto.at) && !o.auto.del, o);
      await load(S0text);
    });

    // ===== F: the file =================================================================================================
    await step('F1', async function () {
      var s = S4;
      if (!s) throw new Error('E4 did not save');
      kase('F1', 'sheetHidden is saved as true on the note (E4\'s save), with no new snapshot key and no new fields.byId id',
        pn(s)['production@day7'] && pn(s)['production@day7'].sheetHidden === true &&
        topKeys(s) === keys0 && Object.keys(s.fields.byId).sort().join(',') === ids0,
        { note: pn(s)['production@day7'] || null, keys: Object.keys(s).length, ids: Object.keys(s.fields.byId).length });
    });
    await step('F2', async function () {
      var w0 = repairWarnings();
      await load(with_(function (s) {
        s.phaseNotes['prodPrep@3'].sheetHidden = 'yes';
        s.phaseNotes['production@6'].sheetHidden = false;
        s.phaseNotes['production@2'].sheetHidden = 1;
      }));
      var s = await snap();
      var o = { warned: repairWarnings() - w0, tech: pn(s)['prodPrep@3'] || null, vis: pn(s)['production@6'] || null, stunt: pn(s)['production@2'] || null,
                wf: await cell('2026-06-01') };
      kase('F2', 'any other sheetHidden value ("yes", false, 1) is dropped on Load and the repair counted; each note is kept and still in the waterfall',
        o.warned >= 1 && same(o.tech, pn(S0)['prodPrep@3']) && same(o.vis, pn(S0)['production@6']) && same(o.stunt, pn(S0)['production@2']) &&
        o.wf === 'Tech scout 6/3/26', o);
      await load(S0text);
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (apart from F2\'s repair warning)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phasemonth threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
