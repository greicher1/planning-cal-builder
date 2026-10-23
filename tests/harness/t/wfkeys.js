// wfkeys -- Excel's editing keys in the waterfall (WATERFALL-KEYS-PLAN.md; owner rulings Q1-Q4, 22 Oct 2026):
// the arrow keys, Tab and Delete on the highlight, copy / cut / paste notes, and dragging notes to another week.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=wfkeys ./run.sh wfkeys 400
//
// tests/fixtures/wfkeys.sptcal (synthetic: shift-stores' "Test Show", two year blocks, 2026 and 2027) carries:
//   2026-08-03 "Table read"               #FFC000, size 9, bold + italic (the style bar)
//   2026-08-10 "Cast fittings\nNetwork call"   two lines
//   2026-09-07 "Wrap party 9/10/26"        pinned to Thu 9/10 (the editor's Day picker), its date stamped
//   2026-09-14 "Blocker"
//   automatic notes on 2026-01-05, 2026-06-29 and 2026-10-19; an all-phase hiatus 11/23/26, 2 weeks (two
//   band rows, which have no Notes cell).
//
// K  the keys: arrows, Shift+arrows, Tab, the edges, blank gaps, bands, scrolling, guards, Enter after a move
// D  Delete / Backspace (Q1: empty the Notes cells, automatic notes too; nothing else touched), one undo step
// C  copy / cut / paste (Q2 the look travels; Q3 replace), Excel's quoting, past the end, hostile clipboard data
// G  drag (a highlighted note only; a block keeps its spacing; Q4 ask before replacing; Escape; refusals)
// F  the file: no new fields.byId id, no new snapshot key, nothing clipped, no id in the overlay
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'wfkeys'}, fails = [], checks = [];
  function check(c, w){ checks.push({what: w, ok: !!c}); if(!c) fails.push(w); return !!c; }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function pe(type, p, extra){
    var o = Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true}, extra || {});
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if(type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  // ⚠️ 'center', never 'nearest': 'nearest' parks a row at the pane's top edge, UNDER the sticky heading row, and
  // the click then lands on the heading (found when K16 passed for the wrong reason and K18 started a row short).
  function seen(el){ el.scrollIntoView({block: 'center', inline: 'nearest'}); }
  async function click(el, extra){ seen(el); await T.sleep(60); var p = mid(el); pe('pointerdown', p, extra); pe('pointerup', p, extra); await T.sleep(200); }
  async function sweep(a, b){ seen(a); await T.sleep(60); var p = mid(a), r = mid(b); pe('pointerdown', p);
    for(var i = 1; i <= 8; i++){ pe('pointermove', {x: p.x + (r.x - p.x) * i / 8, y: p.y + (r.y - p.y) * i / 8}); await T.sleep(15); }
    pe('pointerup', r); await T.sleep(250); }
  // A drag in three parts, so the leg can look at the ghost and the drop outline before letting go.
  var held = null;
  async function grab(el, to){ seen(el);
    if(to){ var sp = q('#table-wrap .sheet-scroll'), sr = sp.getBoundingClientRect();
      sp.scrollTop += (mid(el).y + mid(to).y) / 2 - (sr.top + sr.height / 2); }
    await T.sleep(60); held = mid(el); pe('pointerdown', held); await T.sleep(30); }
  async function moveTo(el){ var r = mid(el), p = held;
    for(var i = 1; i <= 10; i++){ pe('pointermove', {x: p.x + (r.x - p.x) * i / 10, y: p.y + (r.y - p.y) * i / 10}); await T.sleep(15); }
    held = r; await T.sleep(80); }
  async function letGo(){ pe('pointerup', held); held = null; await T.sleep(400); }
  function key(k, opts){ (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, opts || {}))); }
  async function press(k, opts){ key(k, opts); await T.sleep(120); }
  async function settle(){ await T.sleep(400); }
  function bodyFocus(){ var a = document.activeElement; if(a && a !== document.body && a.blur) a.blur(); }
  async function undo(){ $('undo-btn').click(); await settle(); bodyFocus(); }
  async function redo(){ $('redo-btn').click(); await settle(); bodyFocus(); }
  function noteTd(wk){ return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function noteText(wk){ var t = noteTd(wk); return t && t.classList.contains('has-note') ? (q('.cell-body', t) || t).textContent : ''; }
  function rowOf(wk){ return noteTd(wk).parentElement; }
  function dateTdOf(wk){ var tr = rowOf(wk), c = noteTd(wk);
    while(c && !c.classList.contains('sheet-date')) c = c.previousElementSibling; return c; }
  function phaseIn(tr){ return q('td.sheet-phase-cell[data-pkey]:not(.sheet-hiatus-cell)', tr); }
  // The highlighted cells, read off the overlay's boxes: '<kind>:<what>', '*' before the active one.
  function cellId(c){
    if(c.tagName === 'TH') return 'heading:' + (c.textContent || '').trim();
    if(c.classList.contains('sheet-note-cell')) return 'note:' + c.dataset.week;
    if(c.classList.contains('sheet-date')) return 'date:' + (c.textContent || '').trim();
    if(c.classList.contains('sheet-hiatus-cell')) return 'band:' + c.dataset.week + (c.dataset.pkey ? '|' + c.dataset.pkey : '');
    if(c.classList.contains('sheet-phase-cell')) return 'phase:' + c.dataset.week + '|' + c.dataset.pkey;
    return 'other:' + (c.textContent || '').trim().slice(0, 12);
  }
  function hi(){
    var cells = qa('#table-wrap table.sheet-table td, #table-wrap table.sheet-table th');
    return qa('#table-wrap .text-sel-cell').map(function (b) {
      var r = b.getBoundingClientRect();
      var c = cells.find(function (c) { var x = c.getBoundingClientRect(); return Math.abs(x.left - r.left) < 1.5 && Math.abs(x.top - r.top) < 1.5 && Math.abs(x.width - r.width) < 1.5; });
      return (b.classList.contains('is-active') ? '*' : '') + (c ? cellId(c) : 'NONE');
    }).sort();
  }
  function hiIs(list){ return JSON.stringify(hi()) === JSON.stringify(list.slice().sort()); }
  function chip(){ var c = q('#table-wrap .text-sel-chip'); return c ? c.textContent : ''; }
  function clip(type, data){
    var dt = new DataTransfer();
    Object.keys(data || {}).forEach(function (t) { dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, {clipboardData: dt, bubbles: true, cancelable: true});
    (document.activeElement || document.body).dispatchEvent(ev);
    return {prevented: ev.defaultPrevented, text: dt.getData('text/plain'), rich: dt.getData('application/x-sptcal-notes')};
  }
  function before(type){ var ev = new Event(type, {bubbles: true, cancelable: true}); (document.activeElement || document.body).dispatchEvent(ev); return ev.defaultPrevented; }
  async function paste(text, rich){ var d = {'text/plain': text}; if(rich !== undefined) d['application/x-sptcal-notes'] = rich; var r = clip('paste', d); await settle(); return r; }
  function undoOn(){ return !$('undo-btn').disabled && $('undo-btn').getAttribute('data-disabled') !== 'true'; }
  var written = [];
  var saveHandle = { name: 'wfkeys.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'wfkeys.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function snap(){
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    bodyFocus();
    return JSON.parse(written[written.length - 1]);
  }
  try {
    await T.appReady();
    await T.sleep(1500);
    if(!q('#view-sheet-btn').classList.contains('active')){ $('view-sheet-btn').click(); await T.sleep(900); }
    var S0 = await snap();
    var ids0 = Object.keys(S0.fields.byId).sort().join(','), keys0 = Object.keys(S0).sort().join(',');
    var clip0 = T.clippedCells().h.length;
    check(noteText('2026-08-03') === 'Table read' && noteText('2026-08-10') === 'Cast fittings\nNetwork call' &&
          !noteTd('2026-11-23') && !noteTd('2026-11-30') && !!q('#table-wrap td.sheet-hiatus-cell[data-week="2026-11-23"]'),
          'K0 the fixture: its notes drawn; the two hiatus rows have a band and no Notes cell');
    check(!undoOn(), 'K0b nothing to undo after the load');

    // ---- K: the keys ---------------------------------------------------------------------------------------------
    await click(noteTd('2026-08-03'));
    check(hiIs(['*note:2026-08-03']), 'K1 a click highlights the note (' + hi().join(' ') + ')');
    await press('ArrowDown');
    check(hiIs(['*note:2026-08-10']), 'K2 ArrowDown moves to the next week\'s Notes cell (' + hi().join(' ') + ')');
    await press('ArrowUp');
    check(hiIs(['*note:2026-08-03']), 'K3 ArrowUp moves back');
    await press('ArrowDown'); await press('ArrowDown');
    check(hiIs(['*note:2026-08-17']), 'K4 an EMPTY Notes cell is a stop (' + hi().join(' ') + ')');
    await press('ArrowLeft');
    var ph = phaseIn(rowOf('2026-08-17'));
    check(ph && hiIs(['*' + cellId(ph)]), 'K5 ArrowLeft goes to the phase cell beside it (' + hi().join(' ') + ')');
    await press('ArrowRight'); await press('ArrowRight');
    var d27 = qa('td.sheet-date', rowOf('2026-08-17'))[1];
    check(d27 && hiIs(['*' + cellId(d27)]), 'K6 ArrowRight off the 2026 Notes column lands on the 2027 block\'s date (' + hi().join(' ') + ')');
    // In the 2027 block, the week of 8/16/27 has no phase: both its phase slots are a blank gap.
    check(!q('#table-wrap td.sheet-phase-cell[data-week="2027-08-16"]'), 'K7a (the 2027 block\'s week of 8/16/27 has no phase cell)');
    await press('Tab');
    check(hiIs(['*note:2027-08-16']), 'K7 Tab moves right, stepping over the blank phase gap to the Notes cell (' + hi().join(' ') + ')');
    await press('Tab', {shiftKey: true});
    check(hiIs(['*' + cellId(d27)]), 'K8 Shift+Tab moves left again');
    await press('Tab'); await press('Tab');
    check(hiIs(['*note:2027-08-16']), 'K9 Tab at the right edge of the grid stays put (and keeps Tab from leaving the grid)');
    // Shift+arrow: a rectangle from the anchor, the active cell kept.
    await click(noteTd('2026-08-03'));
    await press('ArrowDown', {shiftKey: true}); await press('ArrowDown', {shiftKey: true});
    check(hiIs(['*note:2026-08-03', 'note:2026-08-10', 'note:2026-08-17']), 'K10 Shift+ArrowDown twice: three weeks, the first still active (' + hi().join(' ') + ')');
    await press('ArrowUp', {shiftKey: true});
    check(hiIs(['*note:2026-08-03', 'note:2026-08-10']), 'K11 Shift+ArrowUp shrinks it back (' + hi().join(' ') + ')');
    await press('ArrowLeft', {shiftKey: true});
    var p0 = phaseIn(rowOf('2026-08-03')), p1 = phaseIn(rowOf('2026-08-10'));
    check(hiIs(['*note:2026-08-03', 'note:2026-08-10', cellId(p0), cellId(p1)]), 'K12 Shift+ArrowLeft widens the rectangle over the phase cells (' + hi().join(' ') + ')');
    await press('ArrowDown');
    check(hiIs(['*note:2026-08-10']), 'K13 a plain arrow after a range moves from the active cell, as Excel does (' + hi().join(' ') + ')');
    // Bands: a band row is a stop, and the column comes back on the far side.
    await click(noteTd('2026-11-16'));
    await press('ArrowDown');
    check(hiIs(['*band:2026-11-23']), 'K14 ArrowDown into an all-phase hiatus row stops on its band (' + hi().join(' ') + ')');
    await press('ArrowDown'); await press('ArrowDown');
    check(hiIs(['*note:2026-12-07']), 'K15 down through the second band and out in the Notes column it went in by (' + hi().join(' ') + ')');
    // The top edge: the heading row, then nothing.
    await click(noteTd('2026-01-12'));
    await press('ArrowUp'); await press('ArrowUp');
    check(hiIs(['*heading:Notes']), 'K16 ArrowUp off the first week reaches the Notes heading (' + hi().join(' ') + ')');
    await press('ArrowUp');
    check(hiIs(['*heading:Notes']), 'K17 and stops there');
    // Scrolling: down past the pane's fold, then back up under the sticky heading row.
    // The heading row's drawn bottom: a sticky heading CELL's, never the <thead>'s (it scrolls away; the cells stick).
    var sc = q('#table-wrap .sheet-scroll'), thead = q('#table-wrap table.sheet-table thead th');
    await click(noteTd('2026-01-05'));
    for(var i = 0; i < 51; i++) key('ArrowDown');
    await settle();
    var last = noteTd('2026-12-28'), sr = sc.getBoundingClientRect(), lr = last.getBoundingClientRect();
    check(hiIs(['*note:2026-12-28']) && sc.scrollTop > 0 && lr.bottom <= sr.top + sc.clientHeight + 0.5,
          'K18 51 ArrowDowns reach 12/28/26 (the two band rows are stops), and the pane scrolled it into view (scrollTop ' + Math.round(sc.scrollTop) + ')');
    for(i = 0; i < 51; i++) key('ArrowUp');
    await settle();
    var fr = noteTd('2026-01-05').getBoundingClientRect();
    check(hiIs(['*note:2026-01-05']) && fr.top >= thead.getBoundingClientRect().bottom - 0.5,
          'K19 back up to 1/5/26, shown below the sticky heading row, not under it (' + hi().join(' ') + '; top ' + Math.round(fr.top) + ' vs head ' + Math.round(thead.getBoundingClientRect().bottom) + ', scrollTop ' + Math.round(sc.scrollTop) + ')');
    // Guards: a focused field keeps its keys; Alt and Cmd arrows are not the grid's; no undo step from moving.
    var title = $('show-title');
    title.focus();
    await press('ArrowDown');
    check(hiIs(['*note:2026-01-05']), 'K20 with a sidebar field focused, ArrowDown leaves the highlight alone');
    title.blur();
    await press('ArrowDown', {altKey: true}); await press('ArrowDown', {metaKey: true});
    check(hiIs(['*note:2026-01-05']), 'K21 Alt+ and Cmd+ArrowDown do not move the highlight');
    check(!undoOn(), 'K22 moving the highlight banks no undo step');
    // One selection on screen: a key move retires the phase selection. (A plain click makes none; a Cmd-click does.)
    await click(noteTd('2026-08-03'));
    await click(phaseIn(rowOf('2026-08-03')), {metaKey: true});
    var hadGrid = qa('#table-wrap .grid-sel-cell').length;
    await press('ArrowDown');
    check(hadGrid > 0 && qa('#table-wrap .grid-sel-cell').length === 0, 'K23 a key move leaves the phase selection behind (' + hadGrid + ' outline before; ' + hi().join(' ') + '; layer ' + !!q('#table-wrap .grid-sel-layer') + ')');
    // Enter and typing still open the note, on the cell the keys moved to.
    await click(noteTd('2026-08-03'));
    await press('ArrowDown'); await press('ArrowDown');
    await press('Enter');
    var pop = q('.note-pop');
    check(pop && /8\/17\/26/.test(q('.note-pop-title', pop).textContent), 'K24 Enter opens the note the keys moved to (' + (pop ? q('.note-pop-title', pop).textContent : 'no editor') + ')');
    key('Escape'); await settle();
    await press('ArrowDown');
    check(hiIs(['*note:2026-08-24']), 'K25 after Escape closes the editor, the arrows go on from the same cell (' + hi().join(' ') + ')');

    // ---- D: Delete --------------------------------------------------------------------------------------------
    await click(noteTd('2026-08-03'));
    await press('Delete'); await settle();
    var S1 = await snap();
    check(noteText('2026-08-03') === '' && !('2026-08-03' in (S1.userNotes || {})) && !('2026-08-03' in (S1.noteColors || {})) &&
          !('2026-08-03' in (S1.noteFontSize || {})) && !((S1.textStyles || {}).note || {})['2026-08-03'],
          'D1 Delete empties a typed note, and its colour, size and style go with it');
    await undo();
    check(noteText('2026-08-03') === 'Table read' && getComputedStyle(noteTd('2026-08-03')).backgroundColor === 'rgb(255, 192, 0)',
          'D2 one undo puts it back, colour and all');
    await redo();
    check(noteText('2026-08-03') === '', 'D3 redo empties it again');
    await undo();
    await click(noteTd('2026-01-05'));
    await press('Backspace'); await settle();
    var S2 = await snap();
    check(noteText('2026-01-05') === '' && JSON.stringify((S2.userNotes || {})['2026-01-05']) === '{"text":""}',
          'D4 Backspace empties an AUTOMATIC note, stored as the editor\'s explicit clear (' + JSON.stringify((S2.userNotes || {})['2026-01-05']) + ')');
    await undo();
    check(noteText('2026-01-05') === 'Writer\'s Room Opens 1/5/26', 'D5 undo brings the automatic note back');
    // A sweep over phases, dates, a band and notes: only the notes go.
    var bandTxt = q('#table-wrap td.sheet-hiatus-cell[data-week="2026-11-23"]').textContent;
    var phase0 = phaseIn(rowOf('2026-11-16')).textContent;
    await click(noteTd('2026-12-07'));
    clip('paste', {'text/plain': 'Swept note'}); await settle();
    await click(dateTdOf('2026-11-16'));
    for(i = 0; i < 5; i++) key('ArrowDown', {shiftKey: true});
    for(i = 0; i < 3; i++) key('ArrowRight', {shiftKey: true});
    await settle();
    var sw2 = hi();
    await press('Delete'); await settle();
    check(sw2.some(function (k) { return /band:/.test(k); }) && sw2.some(function (k) { return /^\*?date:/.test(k); }) &&
          noteText('2026-12-07') === '' && q('#table-wrap td.sheet-hiatus-cell[data-week="2026-11-23"]').textContent === bandTxt &&
          phaseIn(rowOf('2026-11-16')).textContent === phase0 && !!dateTdOf('2026-11-16').textContent.trim(),
          'D6 Delete over dates, phases, a band and a note empties only the note (' + sw2.length + ' cells highlighted)');
    await undo();
    check(noteText('2026-12-07') === 'Swept note', 'D7 one undo takes back only that Delete');
    await undo();
    check(noteText('2026-12-07') === '', 'D8 and the next undo takes back the paste before it, separately');
    await click(phaseIn(rowOf('2026-08-03')));
    var undoBefore = undoOn();
    await press('Delete');
    check(noteText('2026-08-03') === 'Table read' && undoOn() === undoBefore, 'D9 Delete with only a phase cell highlighted does nothing');

    // ---- C: copy, cut, paste ------------------------------------------------------------------------------------
    await click(noteTd('2026-08-03'));
    key('ArrowDown', {shiftKey: true}); key('ArrowDown', {shiftKey: true}); await settle();
    check(before('beforecopy') && before('beforecut') && before('beforepaste'),
          'C1 with notes highlighted the page claims the clipboard commands (beforecopy / beforecut / beforepaste cancelled)');
    var c1 = clip('copy');
    check(c1.prevented && c1.text === 'Table read\n"Cast fittings\nNetwork call"\n\n',
          'C2 Copy: one line per week, the two-line note in Excel\'s quotes, the empty week a blank line (' + JSON.stringify(c1.text) + ')');
    var rich1 = null; try { rich1 = JSON.parse(c1.rich); } catch(e){}
    check(rich1 && rich1.items && rich1.items[0].color === '#FFC000' && rich1.items[0].size === 9 && rich1.items[0].style && rich1.items[0].style.bold === true,
          'C3 and the clipboard carries SPTCal\'s own copy of the look');
    await click(noteTd('2026-10-05'));
    await paste(c1.text, c1.rich);
    var td105 = noteTd('2026-10-05'), cs105 = getComputedStyle(q('.cell-body', td105) || td105);
    check(noteText('2026-10-05') === 'Table read' && noteText('2026-10-12') === 'Cast fittings\nNetwork call' && noteText('2026-10-19') === '' &&
          getComputedStyle(td105).backgroundColor === 'rgb(255, 192, 0)' && cs105.fontWeight === '700' && cs105.fontStyle === 'italic',
          'C4 Paste fills three weeks down (Q3: the third, an automatic note, emptied by the blank line), with the look (Q2)');
    check(hiIs(['*note:2026-10-05', 'note:2026-10-12', 'note:2026-10-19']), 'C5 the pasted cells end up highlighted (' + hi().join(' ') + ')');
    var S3 = await snap();
    check((S3.noteFontSize || {})['2026-10-05'] === 9 && JSON.stringify((S3.userNotes || {})['2026-10-19']) === '{"text":""}',
          'C6 saved: the size travelled, and the emptied automatic note is the explicit clear');
    await undo();
    check(noteText('2026-10-05') === '' && noteText('2026-10-19') === 'Principal Photography Wraps 10/20/26', 'C7 one undo takes back the whole paste');
    // Text from outside SPTCal: the cell's own look; Excel's trailing line break ignored; quotes; illegal characters.
    await click(noteTd('2026-08-03'));
    await paste('Outside text\r\n');
    check(noteText('2026-08-03') === 'Outside text' && noteText('2026-08-10') === 'Cast fittings\nNetwork call' &&
          getComputedStyle(noteTd('2026-08-03')).backgroundColor === 'rgb(255, 192, 0)',
          'C8 plain text replaces the note and keeps that cell\'s look; Excel\'s trailing line break pastes nothing');
    await undo();
    await click(noteTd('2026-12-07'));
    await paste('"two\nlines"\tsecond cell\n"He said ""hi"""\nPlain "quote" here\nBad\u000Bline￿');
    check(noteText('2026-12-07') === 'two\nlines second cell' && noteText('2026-12-14') === 'He said "hi"' &&
          noteText('2026-12-21') === 'Plain "quote" here' && noteText('2026-12-28') === 'Bad\nline',
          'C9 Excel\'s quoting: a quoted cell keeps its line break, cells on a row join with a space, doubled quotes undo, a stray quote is text; U+000B and U+FFFF never get in');
    await undo();
    // Across the band rows, past the end, one line over many.
    await click(noteTd('2026-11-16'));
    await paste('One\nTwo\nThree');
    check(noteText('2026-11-16') === 'One' && noteText('2026-12-07') === 'Two' && noteText('2026-12-14') === 'Three',
          'C10 a paste steps over the hiatus rows (no Notes cell there) to the next Notes cells');
    await undo();
    var seq = qa('#table-wrap td.sheet-note-cell[data-week]').map(function (t) { return t.dataset.week; }).sort();
    var lastWk = seq[seq.length - 1];
    await click(noteTd(lastWk));
    await paste('Last\nPast one\nPast two');
    check(noteText(lastWk) === 'Last' && /2 lines did not fit after the last week/.test(chip()),
          'C11 lines past the last week are not pasted, and the grid says so ("' + chip() + '")');
    await undo();
    await click(noteTd('2026-09-21'));
    key('ArrowDown', {shiftKey: true}); key('ArrowDown', {shiftKey: true}); await settle();
    await paste('Same in each');
    check(noteText('2026-09-21') === 'Same in each' && noteText('2026-09-28') === 'Same in each' && noteText('2026-10-05') === 'Same in each',
          'C12 one line pasted over three highlighted Notes cells fills each (Excel)');
    await undo();
    // The pinned day: the weekday travels and the stamped date follows it.
    await click(noteTd('2026-09-07'));
    var c2 = clip('copy');
    await click(noteTd('2026-09-28'));
    await paste(c2.text, c2.rich);
    var S4 = await snap();
    check(noteText('2026-09-28') === 'Wrap party 10/1/26' && ((S4.userNotes || {})['2026-09-28'] || {}).date === '2026-10-01',
          'C13 a note pinned to Thursday lands on that week\'s Thursday, its stamped date re-stamped (' + noteText('2026-09-28') + ')');
    await undo();
    // The same text through navigator.clipboard's path: no custom data, the look comes from the last copy.
    await click(noteTd('2026-08-03'));
    var c3 = clip('copy');
    await click(noteTd('2026-10-26'));
    await paste(c3.text);
    check(noteText('2026-10-26') === 'Table read' && getComputedStyle(noteTd('2026-10-26')).backgroundColor === 'rgb(255, 192, 0)',
          'C14 pasting the last copy\'s own text without SPTCal\'s data still brings its look (the right-click menu\'s path)');
    await undo();
    // Hostile SPTCal data is held to a saved file's rules; data that does not match the text is ignored.
    await click(noteTd('2026-10-26'));
    await paste('Evil', JSON.stringify({text: 'Evil', items: [{text: 'Evil', color: 'red;background:url(x)', size: 9999, style: {bold: 'yes', italic: true, size: 12, highlight: '#000000'}, dow: 9}]}));
    var S5 = await snap();
    var st5 = ((S5.textStyles || {}).note || {})['2026-10-26'];
    check(noteText('2026-10-26') === 'Evil' && !(S5.noteColors || {})['2026-10-26'] && !(S5.noteFontSize || {})['2026-10-26'] &&
          JSON.stringify(st5) === '{"italic":true}' && !((S5.userNotes || {})['2026-10-26'] || {}).date,
          'C15 hostile clipboard data: a bad colour, size, day and style keys are dropped, a good italic kept (' + JSON.stringify(st5) + ')');
    await undo();
    await click(noteTd('2026-10-26'));
    await paste('Not the same', JSON.stringify({text: 'Something else', items: [{text: 'Something else', color: '#FF0000'}]}));
    check(noteText('2026-10-26') === 'Not the same' && getComputedStyle(noteTd('2026-10-26')).backgroundColor !== 'rgb(255, 0, 0)',
          'C16 SPTCal data whose text is not the clipboard\'s is ignored: the plain text wins');
    await undo();
    // Cut: copy, then Delete; then paste elsewhere; two separate undo steps.
    await click(noteTd('2026-08-03'));
    var c4 = clip('cut'); await settle();
    check(c4.prevented && c4.text === 'Table read\n' && noteText('2026-08-03') === '', 'C17 Cut puts the note on the clipboard and empties the cell');
    await click(noteTd('2026-11-02'));
    await paste(c4.text, c4.rich);
    check(noteText('2026-11-02') === 'Table read' && getComputedStyle(noteTd('2026-11-02')).backgroundColor === 'rgb(255, 192, 0)', 'C18 and Paste puts it, and its look, in another week');
    await undo();
    check(noteText('2026-11-02') === '' && noteText('2026-08-03') === '', 'C19 one undo takes back the paste only');
    await undo();
    check(noteText('2026-08-03') === 'Table read', 'C20 the next takes back the cut');
    // Where the page leaves the clipboard alone.
    await click(phaseIn(rowOf('2026-08-03')));
    var pr = await paste('Nowhere');
    check(pr.prevented && /Paste goes into the Notes column/.test(chip()) && noteText('2026-08-03') === 'Table read',
          'C21 a paste with no Notes cell highlighted changes nothing and says where paste goes');
    check(!before('beforecopy') && !clip('copy').prevented, 'C22 Copy with no note highlighted is left to the browser');
    await click(noteTd('2026-08-03'));
    title.focus();
    var pf = clip('paste', {'text/plain': 'Into the field'});
    check(!pf.prevented && !before('beforepaste') && noteText('2026-08-03') === 'Table read', 'C23 with a sidebar field focused, the field gets the paste, not the grid');
    title.blur();
    T.openCell(noteTd('2026-08-10')); await settle();
    var ta = q('.note-pop textarea');
    if(ta) ta.focus();
    var pe2 = clip('paste', {'text/plain': 'Into the editor'});
    check(!!ta && !pe2.prevented, 'C24 with the note editor open, its textarea gets the paste');
    key('Escape'); await settle();

    // ---- G: drag ------------------------------------------------------------------------------------------------
    // A press on a note that is NOT highlighted sweeps, as before.
    await click(noteTd('2026-01-12'));
    await sweep(noteTd('2026-08-10'), noteTd('2026-08-24'));
    check(hiIs(['*note:2026-08-10', 'note:2026-08-17', 'note:2026-08-24']) && noteText('2026-08-10') === 'Cast fittings\nNetwork call' && !q('.mv-drag-ghost'),
          'G1 dragging from a note that is not highlighted still sweeps a highlight (' + hi().join(' ') + ')');
    // A highlighted note: the ghost, the drop outline, the move, one undo step.
    await click(noteTd('2026-08-03'));
    await grab(noteTd('2026-08-03'), noteTd('2026-10-26'));
    await moveTo(noteTd('2026-10-26'));
    var drops = qa('#table-wrap .text-sel-drop'), dropOk = drops.length === 1 && (function () {
      var a = drops[0].getBoundingClientRect(), b = noteTd('2026-10-26').getBoundingClientRect(); return Math.abs(a.top - b.top) < 1.5 && Math.abs(a.left - b.left) < 1.5; })();
    check(!!q('.mv-drag-ghost') && !!q('.mv-drag-shield') && dropOk, 'G2 mid-drag: the copy in the hand, and the drop outline on the week under the pointer');
    await letGo();
    check(noteText('2026-10-26') === 'Table read' && noteText('2026-08-03') === '' && getComputedStyle(noteTd('2026-10-26')).backgroundColor === 'rgb(255, 192, 0)' &&
          !q('.mv-drag-ghost') && !q('.mv-drag-shield') && hiIs(['*note:2026-10-26']),
          'G3 let go: the note and its look move, the old week empties, the highlight follows');
    await undo();
    check(noteText('2026-08-03') === 'Table read' && noteText('2026-10-26') === '', 'G4 one undo puts the drag back');
    // A block keeps its spacing, and may land over itself.
    await click(noteTd('2026-08-03'));
    key('ArrowDown', {shiftKey: true}); await settle();
    await grab(noteTd('2026-08-10'));
    await moveTo(noteTd('2026-08-17'));
    check(qa('#table-wrap .text-sel-drop').length === 2, 'G5 a block of two shows two drop outlines');
    await letGo();
    check(noteText('2026-08-03') === '' && noteText('2026-08-10') === 'Table read' && noteText('2026-08-17') === 'Cast fittings\nNetwork call' && !T.modalText(),
          'G6 the two notes move down a week together, over their own place, with no question');
    await undo();
    // Q4: onto a week with a note, ask; Cancel changes nothing; Replace replaces.
    await click(noteTd('2026-08-03'));
    await grab(noteTd('2026-08-03'), noteTd('2026-09-14'));
    await moveTo(noteTd('2026-09-14'));
    await letGo();
    var asked = T.modalText();
    check(/That week already has a note\. Replace it\?/.test(asked), 'G7 a drop on a week with a note asks first ("' + asked.slice(0, 80) + '")');
    T.clickModalButton('Cancel'); await settle(); bodyFocus();
    check(noteText('2026-08-03') === 'Table read' && noteText('2026-09-14') === 'Blocker' && !T.modalText(), 'G8 Cancel leaves both notes as they were');
    await click(noteTd('2026-08-03'));
    await grab(noteTd('2026-08-03'), noteTd('2026-09-14'));
    await moveTo(noteTd('2026-09-14'));
    await letGo();
    T.clickModalButton('Replace'); await settle(); bodyFocus();
    check(noteText('2026-09-14') === 'Table read' && noteText('2026-08-03') === '', 'G9 Replace moves the note over the one there');
    await undo();
    check(noteText('2026-09-14') === 'Blocker' && noteText('2026-08-03') === 'Table read', 'G10 one undo puts both back');
    // Off the Notes column, back on its own place, Escape: nothing changes, nothing banked.
    await click(noteTd('2026-08-03'));
    await grab(noteTd('2026-08-03'), noteTd('2026-09-21'));
    await moveTo(phaseIn(rowOf('2026-09-21')));
    check(qa('#table-wrap .text-sel-drop').length === 0, 'G11 over a phase cell there is no drop outline');
    await letGo();
    check(noteText('2026-08-03') === 'Table read', 'G12 a drop off the Notes column changes nothing');
    await click(noteTd('2026-08-03'));
    await grab(noteTd('2026-08-03'), noteTd('2026-10-26'));
    await moveTo(noteTd('2026-10-26'));
    key('Escape'); await T.sleep(100);
    check(!q('.mv-drag-ghost') && !q('.mv-drag-shield') && hiIs(['*note:2026-08-03']), 'G13 Escape mid-drag drops the copy and keeps the highlight');
    await letGo();
    check(noteText('2026-08-03') === 'Table read' && noteText('2026-10-26') === '', 'G14 and nothing moved');
    // Past the end: refused, and said.
    await click(noteTd(seq[seq.length - 2]));
    key('ArrowDown', {shiftKey: true}); await settle();
    await paste('Penult\nUltimate');
    await click(noteTd(seq[seq.length - 2]));
    key('ArrowDown', {shiftKey: true}); await settle();
    await grab(noteTd(seq[seq.length - 2]));
    await moveTo(noteTd(seq[seq.length - 1]));
    check(qa('#table-wrap .text-sel-drop').length === 0, 'G15 a block that would run past the last week shows no drop outline');
    await letGo();
    check(noteText(seq[seq.length - 2]) === 'Penult' && /Not enough weeks below/.test(chip()), 'G16 and the drop is refused, with the reason ("' + chip() + '")');
    await undo();
    // An automatic note dragged away leaves an explicit clear behind.
    await click(noteTd('2026-06-29'));
    await grab(noteTd('2026-06-29'));
    await moveTo(noteTd('2026-07-06'));
    await letGo();
    var S6 = await snap();
    check(noteText('2026-07-06') === 'Start Principal Photography 6/29/26' && noteText('2026-06-29') === '' &&
          JSON.stringify((S6.userNotes || {})['2026-06-29']) === '{"text":""}', 'G17 an automatic note dragged away leaves its week empty (the explicit clear)');
    await undo();

    // ---- F: the file and the grid -------------------------------------------------------------------------------
    var S9 = await snap();
    check(Object.keys(S9.fields.byId).sort().join(',') === ids0, 'F1 no fields.byId id added (' + Object.keys(S9.fields.byId).length + ')');
    check(Object.keys(S9).sort().join(',') === keys0, 'F2 no snapshot key added');
    function canon(v){ return JSON.stringify(v, function (k, x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? Object.keys(x).sort().reduce(function (o, kk) { o[kk] = x[kk]; return o; }, {}) : x; }); }
    check(canon([S9.userNotes, S9.noteColors, S9.noteFontSize, S9.textStyles]) === canon([S0.userNotes, S0.noteColors, S0.noteFontSize, S0.textStyles]),
          'F3 after every undo, the notes are byte for byte the loaded file\'s');
    check(T.clippedCells().h.length <= clip0, 'F4 no cell clips sideways (' + T.clippedCells().h.length + ', ' + clip0 + ' at load)');
    check(!qa('[id]', q('#table-wrap .text-sel-layer')).length && !qa('[id]', q('#table-wrap .text-sel-head')).length, 'F5 no id in the highlight\'s layers');
  } catch(e){ out.EX = String(e && e.stack || e); }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  check(!errs.length, 'Z no console error or warning (' + errs.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
