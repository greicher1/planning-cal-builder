// monthrowlimit -- a day in the Month view holds 10 lines (owner, 17 Nov 2026; MONTH-ROW-LIMIT-PLAN.md).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=g=doors ./run.sh monthrowlimit 400
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=g=shrunk ./run.sh monthrowlimit 400
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=month-lanecap HARNESS_QUERY=g=over ./run.sh monthrowlimit 300
//
// The owner, looking at a month where one week took most of the page: "there reall should be a max limit on how tall a
// calendar row can be". Ruled by picker: "Stop adding notes" (a full day refuses another note and says so, nothing is
// ever hidden), "10 lines in a week" (bars count), "No new notes until under" (a calendar already over opens and shows
// everything), "Never refused" (what arrives on its own, and every edit), "Short message by the day".
// A day's lines are the lowest line any bar or note covering it ends on; a day that reaches its 10th takes no new note
// added by hand in the Month view. The check is at four doors: a "+", a paste, Paste notes…, a note dragged to another
// day. Before the build every case marked ⛔ let the note in.
//
// g=doors (the standard calendar, loaded as a file with July 2026's notes: one day over the limit, one at 9 lines):
//   C0  the calendar as loaded: the full day reaches 10 lines or more, the near day exactly 9 (control). Its one-line
//       notes take one line at any size, so the counts on screen are the full-size ones although July shrinks a little
//   L1  ⛔ a "+" on the full day opens no editor and the grid says "This day is full (10 lines). …" by that day;
//       L1b a "+" on the day at 9 lines, and on an empty day, opens the editor (controls)
//   L2  ⛔ ⌘V of three notes onto the full day lands none, says so, and banks no undo step;
//       L2b ⛔ onto the day at 9 lines lands ONE and says "1 of 3 notes were pasted"; one Undo takes it back;
//       L2c onto an empty day lands all three and says nothing (control)
//       L2d onto a full day scrolled out of view (200% zoom): none land, and the message still shows, naming the date
//   L3  ⛔ Paste notes…: the full day's row is an error naming its date, and Add is off;
//       L3b ⛔ twelve rows for one day: the day fills as the rows above land, and the rows past its 10th line are errors;
//       L3c the calendar on screen is untouched while the box previews; L3d with those rows removed the rest are added,
//       and one Undo takes them all back (controls)
//   L4  ⛔ a note dragged onto the full day goes back where it was, the grid says so, and nothing is banked;
//       L4b dragged ACROSS the full day onto a day with room, it lands there; one Undo puts it back (control)
//   L5  never refused: a note already on the full day, edited to three lines, saves;
//       L5b a Waterfall note typed with the full day's date shows on it; L5c the full day's holiday is still drawn
// g=over (HARNESS_STATE=month-lanecap: one day holding 25 notes, 51 lines):
//   L6  the over-limit calendar opens and draws all 25 notes; L6b ⛔ its "+" takes no new note, the day beside it does
// g=shrunk (a month the page has to shrink; on screen its notes take fewer lines than at full size):
//   L7  ⛔ the count is the FULL-SIZE one: a day showing fewer than 10 lines in the shrunk month, which reaches 10 at
//       full size, is full
// Every run: E0 no console errors and no native alert.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  async function settle(){
    await T.sleep(400); var last = -1, st = 0;
    await T.until(function () { var n = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length; st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3; }, 'settle', 150, 100);
  }
  function bodyFocus(){ var a = document.activeElement; if(a && a !== document.body && a.blur) a.blur(); }
  async function view(mode){
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table');
    if(on) return;
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, mode, 100, 100);
    await settle();
  }
  async function toMonth(label){
    await view('month'); var want = Date.parse('1 ' + label);
    for(var i = 0; i < 60; i++){
      var my = txt(q('#table-wrap .mv-monthyear')); if(my === label) return settle();
      byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  function blocks(iso, kind){ return qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"]' + (kind ? '[data-note-kind="' + kind + '"]' : '')); }
  function texts(iso, kind){ return blocks(iso, kind).map(txt); }
  // A day's typed notes, its own ('day') and the lines drawn with the Waterfall's ('wf'), where a note that stays with a
  // phase is drawn: since 19 Nov 2026 a pasted note on a day a phase runs on stays with that phase (t/notephase.js Q1-Q3),
  // so the paste cases count both. Sorted, since the two kinds are drawn apart.
  function typed(iso){ return texts(iso, 'day').concat(texts(iso, 'wf')).sort(); }
  function block(iso, re){ return blocks(iso).filter(function (b) { return re.test(txt(b)); })[0] || null; }
  function centre(e){ var r = e.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function mouse(t, type, p, mods){
    t.dispatchEvent(new MouseEvent(type, Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, detail: 1}, mods || {})));
  }
  async function click(e){
    e.scrollIntoView({block: 'center', inline: 'nearest'}); await T.sleep(60);
    var p = centre(e), t = document.elementFromPoint(p.x, p.y) || e;
    mouse(t, 'mousedown', p); mouse(t, 'mouseup', p); mouse(t, 'click', p);
    await T.sleep(200);
  }
  // A click at a point on the month, dispatched on <body> so it opens no day menu: the day it lands on is the day last
  // clicked, which is where a paste goes.
  async function clickAt(p){ mouse(document.body, 'mousedown', p); mouse(document.body, 'mouseup', p); mouse(document.body, 'click', p); await T.sleep(200); }
  function clip(type, data){
    var dt = new DataTransfer(); Object.keys(data || {}).forEach(function (t) { if(data[t] != null) dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, {clipboardData: dt, bubbles: true, cancelable: true});
    (document.activeElement || document.body).dispatchEvent(ev);
    return {handled: ev.defaultPrevented};
  }
  // Notes on the clipboard as the app's own copy writes them: plain text, one per line, and its own data.
  function clipOf(list){
    var text = list.map(function (t) { return t + '\n'; }).join('');
    return {'text/plain': text, 'application/x-sptcal-notes': JSON.stringify({text: text, items: list.map(function (t) { return {text: t}; })})};
  }
  async function undo(){ byId('undo-btn').click(); await settle(); bodyFocus(); }
  function undoOff(){ var b = byId('undo-btn'); return !!b && (b.disabled || b.getAttribute('data-disabled') === 'true' || b.getAttribute('aria-disabled') === 'true'); }
  function pop(){ return byId('mv-note-pop'); }
  // A day's "+": a free line's when it has one, else the full-day one in the row's bottom padding.
  function plus(iso){ return q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]'); }
  function typeIn(ta, v){ ta.value = v; ta.dispatchEvent(new Event('input', {bubbles: true})); }
  function press(ta, k, mods){
    var e = new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, mods || {}));
    ta.dispatchEvent(e); return e.defaultPrevented;
  }
  async function closeEditor(){
    var t = pop() && q('textarea', pop());
    if(t){ typeIn(t, ''); press(t, 'Escape'); await settle(); }
    bodyFocus();
  }
  // The grid's message, as shown: its text with its line break, and the day column it sits over.
  function chip(){ var c = q('body > .month-sel-chip'); return c ? (c.textContent || '') : ''; }
  function chipLeft(){ var c = q('body > .month-sel-chip'); return c ? Math.round(c.getBoundingClientRect().left) : null; }
  async function chipGone(){ for(var i = 0; i < 70 && q('body > .month-sel-chip'); i++) await T.sleep(100); }
  // ---- what a day holds ON SCREEN: its week's bars, and the lines its own column reaches ----
  function weekOf(iso){ var a = q('#table-wrap .mv-note-add[data-note-day="' + iso + '"], #table-wrap .mv-note-block[data-note-day="' + iso + '"]'); return a ? a.closest('.mv-week') : null; }
  function colOf(iso){ var d = new Date(iso + 'T00:00:00Z'); return d.getUTCDay(); }   // a row runs Sunday to Saturday
  function place(b){
    var c0 = parseInt(b.style.gridColumnStart, 10) - 1, c1 = parseInt(b.style.gridColumnEnd, 10) - 2;
    var lane = parseInt(b.style.gridRowStart, 10) - 1, m = /span\s*(\d+)/.exec(b.style.gridRowEnd || '');
    return {c0: c0, c1: c1, lane: lane, span: m ? parseInt(m[1], 10) : 1, note: b.classList.contains('mv-note-block')};
  }
  // {lines, bars, taken}: the lowest line the day reaches, the lines its bars (not its notes) reach, the lanes in use.
  function dayLines(iso){
    var wk = weekOf(iso), col = colOf(iso), out = {lines: 0, bars: 0, taken: {}};
    if(!wk) return null;
    qa('.mv-bars > .mv-bar:not(.mv-note-add)', wk).forEach(function (b) {
      var p = place(b); if(!(p.c0 >= 0) || p.c0 > col || p.c1 < col) return;
      for(var l = p.lane; l < p.lane + p.span; l++) out.taken[l] = 1;
      out.lines = Math.max(out.lines, p.lane + p.span);
      if(!p.note) out.bars = Math.max(out.bars, p.lane + p.span);
    });
    return out;
  }
  // How many one-line notes take a day that holds only its bars to exactly `target` lines (first fit, as the renderer packs).
  function notesToReach(iso, target){
    var d = dayLines(iso), taken = Object.assign({}, d.taken), n = 0, reach = d.lines;
    while(reach < target && n < 40){ var l = 0; while(taken[l]) l++; taken[l] = 1; reach = Math.max(reach, l + 1); n++; }
    return reach === target ? n : null;
  }
  // The month view's note drag, as autonoterename's G1 drives it: press on the note, move the pointer through the days'
  // "+" cells (found again at every step: the grid redraws live), and let go.
  async function dragNote(day, re, via){
    var b = block(day, re); if(!b) throw new Error('no block matching ' + re + ' on ' + day);
    b.scrollIntoView({block: 'center'}); await T.sleep(150);
    b = block(day, re);
    var at = centre(b);
    b.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 0, buttons: 1}));
    for(var i = 0; i < via.length; i++){
      var t = q('#table-wrap .mv-note-add[data-note-day="' + via[i] + '"]'); if(!t) throw new Error('no day cell for ' + via[i]);
      var to = centre(t);
      for(var k = 1; k <= 5; k++){
        window.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, buttons: 1, clientX: at.x + (to.x - at.x) * k / 5, clientY: at.y + (to.y - at.y) * k / 5}));
        await T.sleep(60);
      }
      at = to;
    }
    var said = chip();
    window.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, clientX: at.x, clientY: at.y}));
    await settle();
    return said;
  }
  function noteTd(wk){ return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  // Paste notes…: its button is in Settings ▸ Preferences ▸ Month view.
  function box(){ return q('.paste-notes-overlay'); }
  async function openBox(){
    await T.openSettings('prefs');
    var b = byId('paste-notes-btn'); if(!b) throw new Error('no Paste notes button');
    b.click(); await T.sleep(300);
    if(!box()) throw new Error('the Paste notes box did not open');
  }
  async function boxType(v){
    var ta = q('.paste-notes-text', box()); typeIn(ta, v); await T.sleep(200);
    return {rows: qa('.paste-notes-preview .paste-row', box()).map(function (r) { return (r.classList.contains('is-error') ? 'ERR ' : 'ok ') + txt(q('.paste-row-err', r) || q('.paste-row-text', r)); }),
            sum: txt(q('.paste-notes-sum', box())), addOff: q('.paste-notes-add', box()).disabled, addText: txt(q('.paste-notes-add', box()))};
  }

  var MAX = 10, FULL_MSG = 'This day is full (10 lines).\nDelete or move a note to add another.';
  var G = new URLSearchParams(location.search).get('g') || 'doors';
  try {
    if(G === 'over'){
      // ---- L6: month-lanecap, one day holding 25 notes ----
      await T.until(function () { return !!q('#table-wrap table.sheet-table tbody tr, #table-wrap .mv-daygrid'); }, 'the calendar', 300, 100);
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      await toMonth('August 2026'); bodyFocus();
      var OVER = '2026-08-12', BESIDE = '2026-08-11';
      var drawn = texts(OVER, 'day'), reach = dayLines(OVER);
      add('L6', 'the over-limit calendar opens and draws every note it holds: 25 on Wed 8/12, far past 10 lines',
        drawn.length === 25 && reach.lines > MAX, {notes: drawn.length, lines: reach.lines, first: drawn[0], last: drawn[24]}, '25 notes, more than 10 lines');
      plus(OVER).click(); await T.sleep(250);
      var o1 = {editor: !!pop(), said: chip()};
      await closeEditor();
      plus(BESIDE).click(); await T.sleep(250);
      var o2 = {editor: !!pop(), said: chip()};
      await closeEditor();
      add('L6b', 'the over-full day takes no new note (no editor, the message); the day beside it opens its editor',
        o1.editor === false && o1.said === FULL_MSG && o2.editor === true && texts(OVER, 'day').length === 25,
        {overFull: o1, beside: o2, notes: texts(OVER, 'day').length}, 'refused there, opened beside it');
    }

    if(G === 'doors' || G === 'shrunk'){
      await T.appReady();
      T.buildFixture();
      await T.until(function () { return !!noteTd('2026-08-03'); }, 'fixture', 200, 100);
      await settle(); if(document.fonts && document.fonts.ready) await document.fonts.ready;
      await toMonth('July 2026');
    }

    if(G === 'doors'){
      // July 2026 of the standard calendar. FULL holds ten one-line notes (over the limit with its bar), NEAR as many as
      // take it to exactly 9 lines, ROOM one note to drag, FILL and EMPTY none. HOL is the Independence Day holiday's
      // day, with ten notes of its own under the holiday.
      var FULL = '2026-07-08', NEAR = '2026-07-09', ROOM = '2026-07-15', EMPTY = '2026-07-16', FILL = '2026-07-22', HOL = '2026-07-03';
      var nearN = notesToReach(NEAR, 9), fillBars = dayLines(FILL).lines;
      info.before = {nearNotes: nearN, fillBars: fillBars, fullBars: dayLines(FULL).lines};
      if(nearN === null) throw new Error('no number of notes takes ' + NEAR + ' to exactly 9 lines');
      var seq = function (stem, n) { var a = []; for(var i = 1; i <= n; i++) a.push({text: stem + ' ' + (i < 10 ? '0' : '') + i, lane: null, color: null}); return a; };
      await T.reloadWith(function (s) {
        s.dayNotes = {};
        s.dayNotes[FULL] = seq('Full', 10);
        s.dayNotes[NEAR] = seq('Near', nearN);
        s.dayNotes[ROOM] = [{text: 'Mover', lane: null, color: null}];
        s.dayNotes[HOL] = seq('Hol', 10);
        s.viewMode = 'month';
      }, 'monthrowlimit');
      await toMonth('July 2026'); bodyFocus();

      var c0 = {full: dayLines(FULL).lines, near: dayLines(NEAR).lines, room: dayLines(ROOM).lines, empty: dayLines(EMPTY).lines, k: byId('table-wrap').style.getPropertyValue('--mvk')};
      add('C0', 'the calendar as loaded: Wed 7/8 reaches 10 lines or more, Thu 7/9 exactly 9, Wed 7/15 far fewer (control)',
        c0.full >= MAX && c0.near === 9 && c0.room < 9, c0, 'full >= 10, near 9');

      // ---- L1: the "+" ----
      var undo0 = undoOff();
      plus(FULL).click(); await T.sleep(250);
      var cell = q('#table-wrap .mv-note-add[data-note-day="' + FULL + '"]').closest('.mv-week');
      var cellLeft = (function () { var cs = qa('.mv-daygrid > .mv-daycell', cell); return Math.round(cs[colOf(FULL)].getBoundingClientRect().left); })();
      var l1 = {editor: !!pop(), said: chip(), chipLeft: chipLeft(), dayLeft: cellLeft, notes: texts(FULL, 'day').length};
      await closeEditor();
      add('L1', 'a "+" on the full day (Wed 7/8) opens no editor, and the grid says "This day is full (10 lines). Delete or move a note to add another." over that day',
        l1.editor === false && l1.said === FULL_MSG && l1.chipLeft !== null && Math.abs(l1.chipLeft - l1.dayLeft) <= 1 && l1.notes === 10,
        l1, 'no editor; the message; over the day');
      plus(NEAR).click(); await T.sleep(250);
      var l1n = {editor: !!pop(), said: chip()};
      await closeEditor();
      plus(EMPTY).click(); await T.sleep(250);
      var l1e = {editor: !!pop()};
      await closeEditor();
      add('L1b', 'a "+" on the day at 9 lines (Thu 7/9) and on an empty day opens the editor, and the message is gone (controls)',
        l1n.editor === true && l1n.said === '' && l1e.editor === true, {near: l1n, empty: l1e}, 'both open');

      // ---- L2: paste ----
      var THREE = clipOf(['Pasted one', 'Pasted two', 'Pasted three']);
      await click(block(FULL, /Full 01/));
      var before2 = texts(FULL, 'day');
      var p1 = clip('paste', THREE); await settle();
      var l2 = {handled: p1.handled, said: chip(), same: same(texts(FULL, 'day'), before2), undoOffBefore: undo0, undoOffAfter: undoOff()};
      add('L2', '⌘V of three notes onto the full day lands none, says the day is full, and banks no undo step (Undo stays off)',
        l2.handled === true && l2.said === FULL_MSG && l2.same && l2.undoOffBefore === true && l2.undoOffAfter === true, l2, 'none landed, the message, Undo off');
      await chipGone();
      await click(block(NEAR, /Near 01/));
      var near0 = typed(NEAR);
      var p2 = clip('paste', THREE); await settle();
      var near1 = typed(NEAR), said2 = chip();
      await undo();
      var near2 = typed(NEAR);
      add('L2b', '⌘V of three notes onto the day at 9 lines lands ONE (it then holds 10) and says "This day is full (10 lines). 1 of 3 notes were pasted."; one Undo takes it back',
        p2.handled === true && near1.length === near0.length + 1 && near1.indexOf('Pasted one') !== -1 && near0.indexOf('Pasted one') === -1 && said2 === 'This day is full (10 lines).\n1 of 3 notes were pasted.' && same(near2, near0),
        {before: near0.length, after: near1.length, landed: near1.indexOf('Pasted one') !== -1, said: said2, afterUndo: near2.length}, '+1, the message, then back');
      await chipGone();
      var ec = q('#table-wrap .mv-note-add[data-note-day="' + EMPTY + '"]');
      ec.scrollIntoView({block: 'center'}); await T.sleep(100);
      await clickAt(centre(q('#table-wrap .mv-note-add[data-note-day="' + EMPTY + '"]')));
      await closeEditor();
      var p3 = clip('paste', THREE); await settle();
      var l2c = {handled: p3.handled, notes: typed(EMPTY), said: chip()};
      await undo();
      add('L2c', '⌘V of three notes onto an empty day lands all three and says nothing (control)',
        l2c.handled === true && same(l2c.notes, ['Pasted one', 'Pasted three', 'Pasted two']) && l2c.said === '' && same(typed(EMPTY), []),
        l2c, 'three notes, no message');

      // ---- L3: Paste notes… ----
      await openBox();
      var b1 = await boxType('7/8/26, for the full day\n7/16/26, for the empty day');
      add('L3', 'Paste notes…: the full day\'s row is an error, "7/8/26 is full (10 lines)", the other row reads, and Add is off',
        same(b1.rows, ['ERR 7/8/26 is full (10 lines)', 'ok for the empty day']) && b1.addOff === true && /^1 line needs fixing/.test(b1.sum), b1, 'one error row, Add off');
      var twelve = []; for(var r = 1; r <= 12; r++) twelve.push('7/22/26, Row ' + (r < 10 ? '0' : '') + r);
      var b2 = await boxType(twelve.join('\n'));
      var room = MAX - fillBars, errs = b2.rows.filter(function (x) { return x.indexOf('ERR ') === 0; });
      add('L3b', 'twelve rows for Wed 7/22: the day fills as the rows above land, so the first ' + room + ' read and the rest are errors naming the day',
        room > 0 && room < 12 && b2.rows.length === 12 && errs.length === 12 - room && b2.rows.slice(0, room).every(function (x) { return x.indexOf('ok ') === 0; })
          && errs.every(function (x) { return x === 'ERR 7/22/26 is full (10 lines)'; }) && b2.addOff === true,
        {room: room, errors: errs.length, first: b2.rows[0], last: b2.rows[11], addOff: b2.addOff}, room + ' ok, ' + (12 - room) + ' errors');
      add('L3c', 'the calendar on screen is untouched while the box previews: Wed 7/22 still has no note (control)',
        same(texts(FILL, 'day'), []) && same(texts(FULL, 'day'), before2), {fill: texts(FILL, 'day').length, full: texts(FULL, 'day').length}, 'unchanged');
      var b3 = await boxType(twelve.slice(0, room).join('\n'));
      q('.paste-notes-add', box()).click(); await settle();
      var added = typed(FILL).filter(function (t) { return /^Row \d\d$/.test(t); }), closed = !box();
      await T.closeSettings(); bodyFocus();
      var fillLines = dayLines(FILL).lines;
      await undo();
      add('L3d', 'with the rows past the day\'s 10th line removed, Add adds the rest (the day then holds 10 lines); one Undo takes them all back (control)',
        b3.addOff === false && closed && added.length === room && fillLines === MAX && !typed(FILL).some(function (t) { return /^Row \d\d$/.test(t); }),
        {addText: b3.addText, added: added.length, lines: fillLines, afterUndo: typed(FILL).length}, room + ' added, 10 lines, then none');

      // ---- L4: the drag ----
      await toMonth('July 2026'); bodyFocus(); await chipGone();
      var full4 = texts(FULL, 'day'), u4 = undoOff();
      var said4 = await dragNote(ROOM, /^Mover/, [FULL]);
      var l4 = {said: said4, room: texts(ROOM, 'day'), fullSame: same(texts(FULL, 'day'), full4), undoOffBefore: u4, undoOffAfter: undoOff()};
      add('L4', 'a note dragged from Wed 7/15 onto the full day goes back where it was, the grid says the day is full, and nothing is banked',
        l4.said === FULL_MSG && same(l4.room, ['Mover']) && l4.fullSame && l4.undoOffBefore === l4.undoOffAfter, l4, 'back on 7/15, the message, no step');
      await chipGone();
      // On a build with no limit the note landed on the full day: put it back, so the cases below still run.
      if(!block(ROOM, /^Mover/)) await undo();
      await dragNote(ROOM, /^Mover/, [FULL, EMPTY]);
      var l4b = {room: texts(ROOM, 'day'), empty: texts(EMPTY, 'day'), fullSame: same(texts(FULL, 'day'), full4)};
      await undo();
      add('L4b', 'dragged across the full day onto Thu 7/16, which has room, it lands there; one Undo puts it back (control)',
        same(l4b.room, []) && same(l4b.empty, ['Mover']) && l4b.fullSame && same(texts(ROOM, 'day'), ['Mover']) && same(texts(EMPTY, 'day'), []),
        l4b, 'on 7/16, then back');

      // ---- L5: never refused ----
      await chipGone(); bodyFocus();
      var n1 = block(FULL, /^Full 01/), pc = centre(n1), tg = document.elementFromPoint(pc.x, pc.y) || n1;
      tg.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, clientX: pc.x, clientY: pc.y, button: 0, detail: 2}));
      await T.sleep(250);
      var opened5 = !!pop();
      if(opened5){ var ta5 = q('textarea', pop()); typeIn(ta5, 'Full 01 grows\nto three\nlines'); press(ta5, 'Enter', {ctrlKey: true}); await settle(); }
      var grown = block(FULL, /^Full 01 grows/);
      add('L5', 'a note already on the full day opens, and edited to three lines it saves (an edit is never refused)',
        opened5 && !pop() && !!grown && (grown.innerText || '').split('\n').length === 3 && texts(FULL, 'day').length === 10,
        {opened: opened5, saved: !!grown, lines: grown && (grown.innerText || '').split('\n').length, notes: texts(FULL, 'day').length}, 'opened, three lines saved');
      await view('sheet');
      var td = noteTd('2026-07-06'); td.scrollIntoView({block: 'center'}); await T.sleep(100);
      T.openCell(td); await T.sleep(300);
      var wta = q('.note-pop textarea') || q('.note-editor textarea');
      if(wta){ typeIn(wta, 'Network cut 7/8/26'); press(wta, 'Enter', {ctrlKey: true}); await settle(); }
      await toMonth('July 2026'); bodyFocus();
      var arrived = block(FULL, /^Network cut/);
      add('L5b', 'a Waterfall note typed with the full day\'s date ("Network cut 7/8/26") shows on that day in the Month view',
        !!wta && !!arrived && arrived.getAttribute('data-note-kind') === 'wf', {editor: !!wta, shown: !!arrived, onFull: texts(FULL).length}, 'shown');
      var hol = texts(HOL, 'wf'), holOwn = texts(HOL, 'day');
      add('L5c', 'the holiday on Fri 7/3 is still drawn on a day holding ten notes of its own, and that day is full',
        hol.length >= 1 && /Independence Day/.test(hol.join('|')) && holOwn.length === 10 && dayLines(HOL).lines > MAX, {holiday: hol, own: holOwn.length, lines: dayLines(HOL).lines}, 'holiday + 10 notes');

      // ---- L2d: a refusal is never silent ----
      // A paste goes to the day last clicked, and that day can have been scrolled out of view since. At 200% zoom the
      // month is taller than the window: click a note on the full day, scroll its row away, paste. The message cannot
      // sit by a day that is not in view, so it shows at the top of the calendar and names the date.
      document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: 2}}));
      await T.sleep(500); await settle();
      await chipGone();
      var away = null;
      var tries = [[HOL, /^Hol 01/, 'max'], [FULL, /^Full 01/, 'max'], [FULL, /^Full 01/, 0], [HOL, /^Hol 01/, 0]];
      for(var ti = 0; ti < tries.length && !away; ti++){
        var dIso = tries[ti][0], nb = block(dIso, tries[ti][1]);
        if(!nb) continue;
        await click(nb);
        var cellEl = null;
        qa('#table-wrap .mv-note-add[data-note-day="' + dIso + '"], #table-wrap .mv-note-block[data-note-day="' + dIso + '"]').slice(0, 1).forEach(function (e) { cellEl = e.closest('.mv-week'); });
        var sc = cellEl;
        while(sc && sc !== document.body){
          var cs = getComputedStyle(sc);
          if(/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 4) break;
          sc = sc.parentElement;
        }
        if(!sc || sc === document.body) continue;
        sc.scrollTop = tries[ti][2] === 'max' ? sc.scrollHeight : 0;
        await T.sleep(300);
        var wr = cellEl.getBoundingClientRect(), sr = sc.getBoundingClientRect();
        if(wr.bottom <= sr.top + 1 || wr.top >= sr.bottom - 1) away = {iso: dIso, scroller: sc, weekTop: Math.round(wr.top), weekBottom: Math.round(wr.bottom), viewTop: Math.round(sr.top), viewBottom: Math.round(sr.bottom)};
      }
      var l2d = {away: away ? {iso: away.iso, weekTop: away.weekTop, weekBottom: away.weekBottom, viewTop: away.viewTop, viewBottom: away.viewBottom} : null};
      if(away){
        var beforeD = texts(away.iso, 'day');
        var pd = clip('paste', THREE); await settle();
        var cEl = q('body > .month-sel-chip'), cr = cEl ? cEl.getBoundingClientRect() : null;
        var md = /^(\d{4})-(\d\d)-(\d\d)/.exec(away.iso);
        l2d.handled = pd.handled; l2d.said = chip(); l2d.same = same(texts(away.iso, 'day'), beforeD);
        l2d.want = (+md[2]) + '/' + (+md[3]) + '/' + md[1].slice(2) + ' is full (10 lines).\nDelete or move a note to add another.';
        l2d.inView = !!cr && cr.top >= 0 && cr.bottom <= window.innerHeight && cr.left >= 0 && cr.right <= window.innerWidth && cr.top >= away.viewTop - 1;
        away.scroller.scrollTop = 0;
      }
      document.dispatchEvent(new CustomEvent('sptcal-zoom', {detail: {zoom: 1}}));
      await T.sleep(500); await settle();
      add('L2d', '⌘V onto a full day that has been scrolled out of view (200% zoom) lands none and still says so, at the top of the calendar and naming the date',
        !!away && l2d.handled === true && l2d.same === true && l2d.said === l2d.want && l2d.inView === true, l2d, 'none landed; "<date> is full (10 lines)…" on screen');
    }

    if(G === 'shrunk'){
      // A month the page has to shrink: Tue 7/21 holds 45 one-line notes. On Thu 7/9 a few notes that take three lines
      // at full size and one or two once the month is shrunk: fewer than 10 lines on screen, 10 or more at full size.
      var HEAVY = '2026-07-21', TEST = '2026-07-09';
      var LONG = 'Second unit splinter day with stunts and crane on stage';
      var bars = dayLines(TEST).lines;
      var n = 0; for(var tryN = 1; tryN <= 6 && !n; tryN++){ if(bars + 3 * tryN >= MAX + 1 && bars + 2 * tryN <= MAX - 1) n = tryN; }
      if(!n) throw new Error('no note count separates the two counts with ' + bars + ' lines of bars');
      await T.reloadWith(function (s) {
        s.dayNotes = {};
        s.dayNotes[HEAVY] = []; for(var i = 1; i <= 45; i++) s.dayNotes[HEAVY].push({text: 'H' + (i < 10 ? '0' : '') + i, lane: null, color: null});
        s.dayNotes[TEST] = []; for(var j = 1; j <= n; j++) s.dayNotes[TEST].push({text: LONG + ' ' + j, lane: null, color: null});
        s.viewMode = 'month';
      }, 'monthrowlimit');
      await toMonth('July 2026'); bodyFocus();
      await T.until(function () { return !!byId('table-wrap').style.getPropertyValue('--mvk'); }, 'the month to shrink', 100, 100).catch(function () {});
      await settle();
      var k = parseFloat(byId('table-wrap').style.getPropertyValue('--mvk')) || 1;
      var onScreen = dayLines(TEST), spans = blocks(TEST, 'day').map(function (b) { return place(b).span; });
      plus(TEST).click(); await T.sleep(250);
      var l7 = {k: k, notes: n, bars: bars, screenLines: onScreen.lines, screenSpans: spans, fullSizeLines: bars + 3 * n, editor: !!pop(), said: chip()};
      await closeEditor();
      add('L7', 'in a shrunk month a day showing ' + onScreen.lines + ' lines on screen (its notes re-wrapped smaller), which reaches ' + (bars + 3 * n) + ' at full size, is full: the "+" opens nothing and says so',
        k < 1 && onScreen.lines < MAX && spans.length === n && spans.every(function (x) { return x < 3; }) && l7.editor === false && l7.said === FULL_MSG, l7, 'shrunk, under 10 on screen, refused');
      // The same notes at full size take three lines each: the premise, read where no month is shrunk.
      await T.reloadWith(function (s) {
        var keep = s.dayNotes[TEST]; s.dayNotes = {}; s.dayNotes[TEST] = keep; s.viewMode = 'month';
      }, 'monthrowlimit2');
      await toMonth('July 2026'); bodyFocus(); await settle();
      var full7 = dayLines(TEST), spans7 = blocks(TEST, 'day').map(function (b) { return place(b).span; });
      add('L7b', 'the same notes in a month at full size take three lines each, ' + (bars + 3 * n) + ' lines in all (the premise)',
        !byId('table-wrap').style.getPropertyValue('--mvk') && spans7.every(function (x) { return x === 3; }) && full7.lines === bars + 3 * n,
        {k: byId('table-wrap').style.getPropertyValue('--mvk'), spans: spans7, lines: full7.lines}, 'three lines each');
    }
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  var h = T.appHealth();
  add('E0', 'no console errors and no native alert', h.errors.length === 0, {errors: h.errors.slice(0, 5)}, 'none');
  T.done({test: 'monthrowlimit', g: G, cases: cases, info: info});
})(); });
