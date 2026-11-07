// phasekeys -- NOTES LINKED TO A PHASE, step 4: the waterfall's keys, copy, paste and drag (PHASE-LINKED-NOTES-PLAN.md
// §4.6; WATERFALL-KEYS-PLAN's code: wfClearNote, wfNoteItem, wfPutNote, wfNoteDragEnd).
//   - Delete and Cut delete the cell's linked notes (until step 4 a linked line survived Delete).
//   - Copy, then Paste: the paste lands as a PLAIN note of the week it is pasted on, in the look the cell was drawn in;
//     a copy pasted back onto its own cell changes nothing; plain text pasted over a linked note replaces it and keeps
//     the look the note lent the cell.
//   - A drag: each linked note keeps its phase when that phase runs in the drop week (re-linked to that week's n, with
//     its look and day); otherwise it lands as a plain note there.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh phasekeys 900
//
// tests/fixtures/phasenotes.sptcal (see t/phasenotes.js): Stunt rehearsal = Production wk 2 on 7/6 (size 9, height 60),
// Day ten = Production's 10th shoot day, Mon 7/13, Tech scout = Prod Prep wk 3 on 6/1 (Wed, #00B0F0, drawn
// "Tech scout 6/3/26"), Visitor = Production wk 6 (#FF0000) under 8/3's typed "Table read" (#FFC000, size 9,
// bold+italic). Production starts 6/29/26, Prod Prep 5/18/26 (6 weeks).
//
//   D1  Delete on Stunt rehearsal's cell: it empties, the note is gone from the file, its 60 px row with it, and
//       Production moved two weeks later does not bring it back
//   D2  Delete on 8/3 (typed + a visiting linked note): both go, and the week's look
//   U1  one undo puts the deleted linked note back, its row height too
//   X1  Cut on Tech scout's cell: the clipboard holds its line, the note is gone; pasted on 9/21 it is a PLAIN note
//       pinned to that week's Wednesday ("Tech scout 9/23/26"), in its colour, and Prod Prep moved leaves it there
//   C1  Copy Stunt rehearsal, Paste on 10/26: a plain note there with the size and row height the note lent its cell;
//       the linked note stays, and still moves with Production while the copy stays
//   C2  a copy pasted back onto its own cell (a linked-only cell, then a typed cell with a visitor) changes nothing
//   C3  plain text pasted over Stunt rehearsal replaces it (the note is deleted) and keeps the look it lent the cell
//   C4  Copy 8/3 (typed + visitor), Paste on 9/21: one plain note of both lines, in 8/3's look; the visitor stays linked
//   G1  Stunt rehearsal dragged to 7/20 (Production wk 4): re-linked as production@4, its size and 60 px row with it,
//       no typed note there; Production a week later carries it to 7/27
//   GU  one undo puts the drag back
//   G2  Tech scout dragged to 6/15 (Prod Prep wk 5): re-linked as prodPrep@5, its Wednesday and colour with it
//   G3  Tech scout dragged to 9/21, where Prod Prep does not run: a plain note pinned to that week's Wednesday
//   G4  Day ten dragged to 7/27: re-linked by day, Production's 20th shoot day (production@day20)
//   G5  8/3 dragged to 8/24 (Production wk 9): "Table read" lands as 8/24's own note in its look, Visitor re-linked as
//       production@9
//   G6  Stunt rehearsal dragged onto Day ten's week: the question, then Replace: Day ten is deleted, Stunt rehearsal is
//       production@3
//   G7  8/3 dragged to 6/22, before Production: both lines land as one plain note; no linked note holds Visitor
//   F1  no snapshot key and no fields.byId id added
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phasekeys', cases: [] };
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
    await T.sleep(500);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function bodyFocus() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  function closePops() { document.body.click(); }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function noteText(wk) { var t = noteTd(wk); return t && t.classList.contains('has-note') ? (q('.cell-body', t) || t).textContent : ''; }
  function bg(wk) { var t = noteTd(wk); return t ? getComputedStyle(t).backgroundColor : null; }
  function rowH(wk) { var t = noteTd(wk), tr = t && t.closest('tr'); return tr ? tr.style.height : null; }

  // ---- pointer, keys and clipboard (wfkeys' helpers) -----------------------------------------------------------------
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function pe(type, p, extra) {
    var o = Object.assign({ bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true }, extra || {});
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if (type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  function seen(el) { el.scrollIntoView({ block: 'center', inline: 'nearest' }); }
  async function click(el) { if (!el) throw new Error('no cell to click'); seen(el); await T.sleep(60); var p = mid(el); pe('pointerdown', p); pe('pointerup', p); await T.sleep(200); }
  function key(k, opts) { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {}))); }
  function clip(type, data) {
    var dt = new DataTransfer();
    Object.keys(data || {}).forEach(function (t) { dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
    (document.activeElement || document.body).dispatchEvent(ev);
    return { prevented: ev.defaultPrevented, text: dt.getData('text/plain'), rich: dt.getData('application/x-sptcal-notes') };
  }
  async function paste(text, rich) { var d = { 'text/plain': text }; if (rich !== undefined) d['application/x-sptcal-notes'] = rich; var r = clip('paste', d); await settle(); return r; }
  var held = null;
  async function grab(el, to) {
    if (!el) throw new Error('no cell to grab'); seen(el);
    if (to) { var sp = q('#table-wrap .sheet-scroll'), sr = sp.getBoundingClientRect();
      sp.scrollTop += (mid(el).y + mid(to).y) / 2 - (sr.top + sr.height / 2); }
    await T.sleep(60); held = mid(el); pe('pointerdown', held); await T.sleep(30);
  }
  async function moveTo(el) { var r = mid(el), p = held;
    for (var i = 1; i <= 10; i++) { pe('pointermove', { x: p.x + (r.x - p.x) * i / 10, y: p.y + (r.y - p.y) * i / 10 }); await T.sleep(15); }
    held = r; await T.sleep(80); }
  async function letGo() { pe('pointerup', held); held = null; await T.sleep(400); }
  // Highlight the note on `from`, drag it onto `to`, let go; answer the Replace question with `answer` when one comes.
  async function drag(from, to, answer) {
    await click(noteTd(from));
    await grab(noteTd(from), noteTd(to));
    await moveTo(noteTd(to));
    await letGo();
    var asked = T.modalText();
    if (asked && answer) { T.clickModalButton(answer); }
    await settle(); bodyFocus();
    return asked;
  }

  // ---- Save and Load (phaselook's) ----------------------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'phasekeys.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phasekeys.sptcal', { lastModified: 1 }); },
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
      closePops(); key('Escape'); await T.sleep(200);
      var stem = 'phasekeys-load-' + (++loads), name = stem + '.sptcal';
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
  function undoOn() { return !byId('undo-btn').disabled && byId('undo-btn').getAttribute('data-disabled') !== 'true'; }
  function pn(s) { return s.phaseNotes || {}; }
  function noteStores(s) { return JSON.stringify([s.phaseNotes || {}, s.userNotes || {}, s.noteColors || {}, s.noteFontSize || {},
                                                   s.textStyles || {}, s.rowHeightsByWeek || {}]); }
  function holds(s, text) { return Object.keys(pn(s)).filter(function (k) { return pn(s)[k].text === text; }); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && /Blocker/.test(noteTd('2026-09-14').innerText || ''); }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (!byId('view-sheet-btn').classList.contains('active')) { byId('view-sheet-btn').click(); await settle(); }
    bodyFocus();
    var S0 = await snap(), S0text = JSON.stringify(S0);
    var ids0 = Object.keys(S0.fields.byId).sort().join(','), keys0 = Object.keys(S0).sort().join(',');

    // ===== D: Delete ===================================================================================================
    await step('D1', async function () {
      var o = { before: noteText('2026-07-06'), rh0: rowH('2026-07-06') };
      await click(noteTd('2026-07-06'));
      key('Delete'); await settle();
      var s = await snap();
      o.after = noteText('2026-07-06'); o.rh = rowH('2026-07-06'); o.keys = Object.keys(pn(s));
      T.set('start-production', '2026-07-13'); await settle();
      o.t720 = noteText('2026-07-20'); o.t76 = noteText('2026-07-06');
      kase('D1', 'Delete on Stunt rehearsal\'s cell (a linked note, no typed text): the cell empties, production@2 is gone from the file with its 60 px row, and Production two weeks later does not bring it back',
        o.before === 'Stunt rehearsal' && o.rh0 === '60px' && o.after === '' && o.rh !== '60px' && !pn(s)['production@2'] &&
        same(s.rowHeightsByWeek, {}) && !(s.userNotes || {})['2026-07-06'] && !/Stunt/.test(o.t720) && !/Stunt/.test(o.t76), o);
      await load(S0text);
    });
    await step('D2', async function () {
      var before = noteText('2026-08-03');
      await click(noteTd('2026-08-03'));
      key('Delete'); await settle();
      var s = await snap();
      kase('D2', 'Delete on 8/3 (typed "Table read" + the visiting Visitor): both go, production@6 with them, and the week\'s look',
        before === 'Table read\nVisitor' && noteText('2026-08-03') === '' && !pn(s)['production@6'] && !(s.userNotes || {})['2026-08-03'] &&
        !(s.noteColors || {})['2026-08-03'] && !(s.noteFontSize || {})['2026-08-03'] && Object.keys(pn(s)).length === 4,
        { before: before, after: noteText('2026-08-03'), keys: Object.keys(pn(s)), user: (s.userNotes || {})['2026-08-03'] || null });
      await load(S0text);
    });
    await step('U1', async function () {
      await click(noteTd('2026-07-06'));
      key('Delete'); await settle();
      var gone = noteText('2026-07-06');
      await undo();
      var s = await snap();
      kase('U1', 'one undo puts the deleted linked note back, on its phase week, with its 60 px row',
        gone === '' && noteText('2026-07-06') === 'Stunt rehearsal' && rowH('2026-07-06') === '60px' && same(pn(s)['production@2'], pn(S0)['production@2']),
        { gone: gone, back: noteText('2026-07-06'), rh: rowH('2026-07-06'), note: pn(s)['production@2'] || null });
      await load(S0text);
    });

    // ===== X / C: Cut, Copy, Paste =====================================================================================
    await step('X1', async function () {
      await click(noteTd('2026-06-01'));
      var c = clip('cut'); await settle();
      var s1 = await snap();
      var o = { clip: c.text, prevented: c.prevented, emptied: noteText('2026-06-01'), keys: Object.keys(pn(s1)) };
      await click(noteTd('2026-09-21'));
      await paste(c.text, c.rich);
      var s2 = await snap();
      o.pasted = noteText('2026-09-21'); o.user = (s2.userNotes || {})['2026-09-21'] || null; o.colour = (s2.noteColors || {})['2026-09-21'] || null;
      o.bg = bg('2026-09-21'); o.keys2 = Object.keys(pn(s2));
      T.set('start-prodPrep', '2026-05-25'); await settle();
      o.after = noteText('2026-09-21'); o.t68 = noteText('2026-06-08');
      kase('X1', 'Cut on Tech scout\'s cell: its line on the clipboard, prodPrep@3 gone; pasted on 9/21 it is a PLAIN note pinned to that week\'s Wednesday, in its colour, and Prod Prep moved a week leaves it there',
        o.prevented && o.clip === 'Tech scout 6/3/26\n' && o.emptied === '' && !pn(s1)['prodPrep@3'] &&
        o.pasted === 'Tech scout 9/23/26' && same(o.user, { text: 'Tech scout 9/23/26', date: '2026-09-23' }) && o.colour === '#00B0F0' &&
        o.bg === 'rgb(0, 176, 240)' && same(o.keys2, o.keys) && o.after === 'Tech scout 9/23/26' && !/Tech scout/.test(o.t68), o);
      await load(S0text);
    });
    await step('C1', async function () {
      await click(noteTd('2026-07-06'));
      var c = clip('copy');
      await click(noteTd('2026-10-26'));
      await paste(c.text, c.rich);
      var s = await snap();
      var o = { clip: c.text, pasted: noteText('2026-10-26'), rh: rowH('2026-10-26'), user: (s.userNotes || {})['2026-10-26'] || null,
                size: (s.noteFontSize || {})['2026-10-26'], height: (s.rowHeightsByWeek || {})['2026-10-26'], note: pn(s)['production@2'] || null };
      T.set('start-production', '2026-07-06'); await settle();
      o.t713 = noteText('2026-07-13'); o.t1026 = noteText('2026-10-26'); o.t76 = noteText('2026-07-06');
      kase('C1', 'Copy Stunt rehearsal, Paste on 10/26: a plain note there with the size (9) and row height (60) the note lent its cell; the linked note stays and moves with Production (to 7/13) while the copy stays',
        o.clip === 'Stunt rehearsal\n' && o.pasted === 'Stunt rehearsal' && o.rh === '60px' && same(o.user, { text: 'Stunt rehearsal' }) &&
        o.size === 9 && o.height === 60 && same(o.note, pn(S0)['production@2']) &&
        /Stunt rehearsal/.test(o.t713) && o.t1026 === 'Stunt rehearsal' && !/Stunt/.test(o.t76), o);
      await load(S0text);
    });
    await step('C2', async function () {
      var on0 = undoOn();
      await click(noteTd('2026-07-06'));
      var c = clip('copy');
      await paste(c.text, c.rich);
      await click(noteTd('2026-08-03'));
      var c2 = clip('copy');
      await paste(c2.text, c2.rich);
      var s = await snap();
      kase('C2', 'a copy pasted back onto its own cell changes nothing: Stunt rehearsal (linked only) and 8/3 (typed + Visitor) keep every store, and no undo step is banked',
        noteStores(s) === noteStores(S0) && !on0 && !undoOn() && noteText('2026-07-06') === 'Stunt rehearsal' && noteText('2026-08-03') === 'Table read\nVisitor',
        { undo0: on0, undo1: undoOn(), phaseNotes: pn(s), user: s.userNotes });
      await load(S0text);
    });
    await step('C3', async function () {
      await click(noteTd('2026-07-06'));
      await paste('Outside\n');
      var s = await snap();
      var o = { text: noteText('2026-07-06'), rh: rowH('2026-07-06'), user: (s.userNotes || {})['2026-07-06'] || null,
                size: (s.noteFontSize || {})['2026-07-06'], height: (s.rowHeightsByWeek || {})['2026-07-06'], keys: Object.keys(pn(s)) };
      T.set('start-production', '2026-07-13'); await settle();
      o.t720 = noteText('2026-07-20'); o.t76 = noteText('2026-07-06');
      kase('C3', 'plain text pasted over Stunt rehearsal replaces it (production@2 deleted) and keeps the look it lent the cell (size 9, the 60 px row) on the week; a Production move leaves "Outside" where it is',
        o.text === 'Outside' && same(o.user, { text: 'Outside' }) && !pn(s)['production@2'] && o.size === 9 && o.height === 60 && o.rh === '60px' &&
        !/Stunt/.test(o.t720) && o.t76 === 'Outside', o);
      await load(S0text);
    });
    await step('C4', async function () {
      await click(noteTd('2026-08-03'));
      var c = clip('copy');
      await click(noteTd('2026-09-21'));
      await paste(c.text, c.rich);
      var s = await snap();
      var o = { clip: c.text, pasted: noteText('2026-09-21'), user: (s.userNotes || {})['2026-09-21'] || null, colour: (s.noteColors || {})['2026-09-21'],
                visitor: pn(s)['production@6'] || null, src: noteText('2026-08-03') };
      kase('C4', 'Copy 8/3 (typed + Visitor), Paste on 9/21: one plain note of both lines in 8/3\'s look (#FFC000); Visitor stays linked on 8/3',
        o.pasted === 'Table read\nVisitor' && o.user && o.user.text === 'Table read\nVisitor' && o.colour === '#FFC000' &&
        same(o.visitor, pn(S0)['production@6']) && o.src === 'Table read\nVisitor', o);
      await load(S0text);
    });

    // ===== G: drag =====================================================================================================
    await step('G1', async function () {
      var asked = await drag('2026-07-06', '2026-07-20');
      var s = await snap();
      var o = { asked: asked, t720: noteText('2026-07-20'), t76: noteText('2026-07-06'), rh720: rowH('2026-07-20'), rh76: rowH('2026-07-06'),
                note: pn(s)['production@4'] || null, old: pn(s)['production@2'] || null, user: (s.userNotes || {})['2026-07-20'] || null, byWeek: s.rowHeightsByWeek };
      T.set('start-production', '2026-07-06'); await settle();
      o.t727 = noteText('2026-07-27'); o.t720b = noteText('2026-07-20');
      kase('G1', 'Stunt rehearsal dragged to 7/20 (Production wk 4): re-linked as production@4 with its size and 60 px row, no typed note there; Production a week later carries it to 7/27',
        !o.asked && o.t720 === 'Stunt rehearsal' && o.t76 === '' && o.rh720 === '60px' && o.rh76 !== '60px' &&
        same(o.note, { text: 'Stunt rehearsal', size: 9, height: 60 }) && !o.old && !o.user && same(o.byWeek, {}) &&
        o.t727 === 'Stunt rehearsal' && !/Stunt/.test(o.t720b), o);
      await load(S0text);
    });
    await step('GU', async function () {
      await drag('2026-07-06', '2026-07-20');
      var moved = noteText('2026-07-20');
      await undo();
      var s = await snap();
      kase('GU', 'one undo puts the drag back: production@2 on 7/6 again, nothing on 7/20',
        moved === 'Stunt rehearsal' && noteText('2026-07-06') === 'Stunt rehearsal' && noteText('2026-07-20') === '' && same(pn(s), pn(S0)),
        { moved: moved, back: noteText('2026-07-06'), keys: Object.keys(pn(s)) });
      await load(S0text);
    });
    await step('G2', async function () {
      await drag('2026-06-01', '2026-06-15');
      var s = await snap();
      var o = { t615: noteText('2026-06-15'), t61: noteText('2026-06-01'), note: pn(s)['prodPrep@5'] || null, old: pn(s)['prodPrep@3'] || null, bg: bg('2026-06-15'),
                user: (s.userNotes || {})['2026-06-15'] || null };
      kase('G2', 'Tech scout dragged to 6/15 (Prod Prep wk 5): re-linked as prodPrep@5, its Wednesday and colour with it ("Tech scout 6/17/26")',
        o.t615 === 'Tech scout 6/17/26' && o.t61 === '' && same(o.note, { text: 'Tech scout', dow: 2, color: '#00B0F0' }) && !o.old && !o.user &&
        o.bg === 'rgb(0, 176, 240)', o);
      await load(S0text);
    });
    await step('G3', async function () {
      await drag('2026-06-01', '2026-09-21');
      var s = await snap();
      var o = { t921: noteText('2026-09-21'), user: (s.userNotes || {})['2026-09-21'] || null, colour: (s.noteColors || {})['2026-09-21'] || null,
                keys: Object.keys(pn(s)), held: holds(s, 'Tech scout') };
      T.set('start-prodPrep', '2026-05-25'); await settle();
      o.after = noteText('2026-09-21');
      kase('G3', 'Tech scout dragged to 9/21, where Prod Prep does not run: a PLAIN note pinned to that week\'s Wednesday, in its colour; no linked note holds it, and Prod Prep moved leaves it',
        o.t921 === 'Tech scout 9/23/26' && same(o.user, { text: 'Tech scout 9/23/26', date: '2026-09-23' }) && o.colour === '#00B0F0' &&
        !o.held.length && o.keys.length === 4 && o.after === 'Tech scout 9/23/26', o);
      await load(S0text);
    });
    await step('G4', async function () {
      await drag('2026-07-13', '2026-07-27');
      var s = await snap();
      var o = { t727: noteText('2026-07-27'), t713: noteText('2026-07-13'), held: holds(s, 'Day ten'), note: pn(s)['production@day20'] || null };
      kase('G4', 'Day ten (a shoot-day note) dragged to 7/27: re-linked by day, as Production\'s 20th shoot day (production@day20), drawn "Day ten 7/27/26"',
        o.t727 === 'Day ten 7/27/26' && o.t713 === '' && same(o.held, ['production@day20']) && same(o.note, { text: 'Day ten' }), o);
      await load(S0text);
    });
    await step('G5', async function () {
      await drag('2026-08-03', '2026-08-24');
      var s = await snap();
      var o = { t824: noteText('2026-08-24'), t83: noteText('2026-08-03'), user: (s.userNotes || {})['2026-08-24'] || null,
                colour: (s.noteColors || {})['2026-08-24'], size: (s.noteFontSize || {})['2026-08-24'], style: ((s.textStyles || {}).note || {})['2026-08-24'] || null,
                visitor: pn(s)['production@9'] || null, old: pn(s)['production@6'] || null, user83: (s.userNotes || {})['2026-08-03'] || null };
      kase('G5', '8/3 dragged to 8/24 (Production wk 9): "Table read" is 8/24\'s own note in its look (#FFC000, 9, bold+italic), Visitor re-linked as production@9',
        o.t824 === 'Table read\nVisitor' && o.t83 === '' && same(o.user, { text: 'Table read' }) && o.colour === '#FFC000' && o.size === 9 &&
        same(o.style, { bold: true, italic: true }) && same(o.visitor, { text: 'Visitor', color: '#FF0000' }) && !o.old && !o.user83, o);
      var S5 = s;
      kase('F1', 'no snapshot key and no fields.byId id added (after a drag that re-links)',
        Object.keys(S5).sort().join(',') === keys0 && Object.keys(S5.fields.byId).sort().join(',') === ids0,
        { keys: Object.keys(S5).length, ids: Object.keys(S5.fields.byId).length });
      await load(S0text);
    });
    await step('G6', async function () {
      var asked = await drag('2026-07-06', '2026-07-13', 'Replace');
      var s = await snap();
      var o = { asked: asked, t713: noteText('2026-07-13'), t76: noteText('2026-07-06'), note: pn(s)['production@3'] || null,
                day10: pn(s)['production@day10'] || null, old: pn(s)['production@2'] || null };
      kase('G6', 'Stunt rehearsal dragged onto Day ten\'s week asks first; Replace deletes Day ten and re-links Stunt rehearsal as production@3',
        /already has a note/.test(o.asked || '') && o.t713 === 'Stunt rehearsal' && o.t76 === '' &&
        same(o.note, { text: 'Stunt rehearsal', size: 9, height: 60 }) && !o.day10 && !o.old, o);
      await load(S0text);
    });
    await step('G7', async function () {
      await drag('2026-08-03', '2026-06-22');
      var s = await snap();
      var o = { t622: noteText('2026-06-22'), user: (s.userNotes || {})['2026-06-22'] || null, held: holds(s, 'Visitor'), colour: (s.noteColors || {})['2026-06-22'] };
      kase('G7', '8/3 dragged to 6/22, before Production starts: both lines land as ONE plain note in 8/3\'s look; no linked note holds Visitor',
        o.t622 === 'Table read\nVisitor' && o.user && o.user.text === 'Table read\nVisitor' && !o.held.length && o.colour === '#FFC000', o);
      await load(S0text);
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phasekeys threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
