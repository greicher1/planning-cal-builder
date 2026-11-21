// mvkeys -- the Excel and Outlook keys on notes: a picked month note takes Delete, Backspace, ⌘C, ⌘X and ⌘V, and in
// both note editors Enter saves, Shift+Enter or Alt+Enter starts a new line, and Esc keeps what was typed (November 2026
// audit, Batch 2 item 2.8: AUD2-021, AUD2-040; the owner's decision D6 (a), 13 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=g=pick ./run.sh mvkeys 300
//   (g = pick | enter, one fresh page each; g=mint writes mvkeys.sptcal, tests/fixtures/mvkeys.sptcal for mvkeysreal.mjs)
//
// Before the fix, in the month view a picked note ignored Delete and Backspace, ⌘C put nothing on the clipboard and ⌘V
// added nothing (AUD2-021); and in both note editors plain Enter added a line, so a note was saved only by Tab,
// Ctrl/Cmd+Enter or a click away, while Esc threw a NEW note away with no undo (AUD2-040), and nothing on screen said so.
// The defaults applied: ⌘V pastes onto the day last clicked; no new right-click item; Esc on a note whose TEXT changed
// saves it (the finding's "keep the typed text"), Esc on an unchanged or emptied note closes it as before.
//
// g=pick (dispatched events; mvkeysreal.mjs proves the same with TRUSTED keys):
//   P0  a click picks a month note (control)
//   P1  Delete removes the picked note, P2 one Undo brings it back with its colour and style
//   P3  Backspace removes a picked note
//   P4  two picked notes, one Delete, one Undo
//   P5  ⌘C on a picked note: its text as plain text, and its colour and style as SPTCal's own data
//   P6  ⌘V onto the day last clicked: the copy arrives with its colour and style; the original stays; P7 one Undo
//   P8  a date naming the note's old day becomes the new day's (the month drag's rule)
//   P9  ⌘X removes the note and ⌘V puts it on the day last clicked
//   P10 text copied from anywhere else pastes as one note
//   P11 Delete leaves a picked holiday, and does nothing with only a phase bar picked (controls)
//   P12 Delete on a picked Waterfall line deletes it as the editor's Delete Note does (both views); P12b one Undo
//   P13 ⌘C with no note picked, ⌘V with the note editor open, and ⌘V when the day clicked is not on screen are left to
//       the browser (controls); P14 the keys do nothing while a sidebar field has focus (control)
//   P15 Delete on a picked note that stays with a phase deletes it in both views; one Undo brings it back
//   P16 ⌘X / ⌘V with a holiday among the picked notes: only the typed note travels (the waterfall's rule, item 2.3,
//       AUD2-014), and the grid says why; P16b two Undos put it back
//   P17 a holiday picked alone, P18 an automatic note picked alone: ⌘C / ⌘X copy nothing and say why
//   (P16-P18 added by the 14 Nov 2026 review: before it, a pasted holiday was re-dated into a new day note)
//   P19 a shareable copy exported while the grid's message chip shows carries no .month-sel-chip
//   P20 leaving the month view and coming back inside the chip's 4.2 s does not redraw it (nor leave it on the waterfall)
//   (P19, P20 added by the second review, 14 Nov 2026; both red before its repair)
// g=enter:
//   M1  month: Enter saves a new note and closes the editor; M2 one Undo takes it back
//   M3  Shift+Enter and Alt+Enter add a line (up to the note's 3), Enter then saves all three
//   M4  Esc on a NEW note with text keeps it; M5 Esc on a changed note keeps the change
//   M6  Esc on an unchanged note and on an emptied one closes it, nothing written (controls)
//   M7  Enter inside an IME composition does not save; Tab and Ctrl/Cmd+Enter still save (controls)
//   M8  Enter on a picked note opens its editor and leaves it open; a holiday's editor still cancels on Esc (controls)
//   W1  waterfall: Enter saves a typed note and closes the editor; W2 Shift+Enter and Alt+Enter add a line
//   W3  Esc on a changed note keeps it; W4 Esc unchanged / emptied closes, nothing written (controls)
//   W5  Enter on a highlighted Notes cell opens its editor and leaves it open; Enter on the Day list is the list's
//   M9 / W6  the key that OPENED an editor (typing on a picked or highlighted note) counts as what it opened with: a stray
//       key and Esc leave the note as it was; type on, and Esc keeps it all
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
  // A day's note blocks: its own notes ('day') and the Waterfall's lines ('wf').
  function blocks(iso, kind){ return qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"]' + (kind ? '[data-note-kind="' + kind + '"]' : '')); }
  function texts(iso, kind){ return blocks(iso, kind).map(txt); }
  function block(iso, re){ return blocks(iso).filter(function (b) { return re.test(txt(b)); })[0] || null; }
  // A day's TYPED notes: its own ('day'), then the lines drawn with the Waterfall's ('wf': a note that stays with a phase
  // is drawn as one). Since 19 Nov 2026 a note pasted onto a day where a phase runs stays with that phase (t/notephase.js
  // Q1), so the paste cases read both.
  function mine(iso){ return blocks(iso, 'day').concat(blocks(iso, 'wf')).map(txt); }
  // What a note block looks like: its fill, weight and slant (the colour and the month text style).
  function look(b){ if(!b) return null; var cs = getComputedStyle(b); return {bg: cs.backgroundColor, weight: cs.fontWeight, italic: cs.fontStyle}; }
  function centre(e){ var r = e.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function mouse(t, type, p, mods){
    t.dispatchEvent(new MouseEvent(type, Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, detail: 1}, mods || {})));
  }
  // A click on a month note, at its centre, as a pointer makes it: the press (window capture records it), then the click.
  async function click(e, mods){
    e.scrollIntoView({block: 'center', inline: 'nearest'}); await T.sleep(60);
    var p = centre(e), t = document.elementFromPoint(p.x, p.y) || e;
    mouse(t, 'mousedown', p, mods); mouse(t, 'mouseup', p, mods); mouse(t, 'click', p, mods);
    await T.sleep(200);
  }
  // A click at a point on the month, dispatched on <body> so it opens no day menu: a pick of the bar there, and the day
  // it lands on is the day last clicked.
  async function clickAt(p){ mouse(document.body, 'mousedown', p); mouse(document.body, 'mouseup', p); mouse(document.body, 'click', p); await T.sleep(200); }
  function selBoxes(){ return qa('body > .month-sel-box').length; }
  // A key on whatever has focus (the page itself while a note is picked): was it taken?
  function key(k, mods){
    var e = new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, mods || {}));
    (document.activeElement || document.body).dispatchEvent(e);
    return e.defaultPrevented;
  }
  // A clipboard event as Chrome's Copy / Cut / Paste command fires it, at the focused element.
  function clip(type, data){
    var dt = new DataTransfer(); Object.keys(data || {}).forEach(function (t) { if(data[t] != null) dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, {clipboardData: dt, bubbles: true, cancelable: true});
    (document.activeElement || document.body).dispatchEvent(ev);
    var rich = dt.getData('application/x-sptcal-notes');
    var parsed = null; try { parsed = rich ? JSON.parse(rich) : null; } catch(e){ parsed = 'bad JSON'; }
    return {text: dt.getData('text/plain'), rich: rich, parsed: parsed, handled: ev.defaultPrevented};
  }
  async function undo(){ byId('undo-btn').click(); await settle(); bodyFocus(); }
  var AMBER = 'rgb(255, 192, 0)';

  // ---- the month editor ----
  function pop(){ return byId('mv-note-pop'); }
  function plus(iso){ return q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]'); }
  async function openPlus(iso){ await reset(); var p = plus(iso); if(!p) throw new Error('no + on ' + iso + ' (' + txt(q('#table-wrap .mv-monthyear')) + ', ' + qa('#table-wrap .mv-note-add').length + ' + in all, start ' + (byId('start-production') || {}).value + ')'); p.click(); await T.sleep(250); if(!pop()) throw new Error('no editor on ' + iso);
    // A note of the DAY, as these cases are about: a "+" opens Stays with on the day's first phase since 19 Nov 2026.
    var ls = q('.note-link-select', pop()); if(ls && ls.value){ ls.value = ''; ls.dispatchEvent(new Event('change', {bubbles: true})); }
    return q('textarea', pop()); }
  async function openNote(b){
    await reset();
    var p = centre(b), t = document.elementFromPoint(p.x, p.y) || b;
    t.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, detail: 2}));
    await T.sleep(250); if(!pop()) throw new Error('no editor for ' + txt(b)); return q('textarea', pop());
  }
  // Each case starts with no editor open, whatever the case before it left (on the build before the fix an Enter left
  // its editor open, and every case after it would have read that one).
  async function reset(){
    var p = pop() || wfPop(), t = p && q('textarea', p);
    if(t){ t.value = ''; t.dispatchEvent(new Event('input', {bubbles: true})); press(t, 'Escape'); await settle(); }
    bodyFocus();
  }
  function typeIn(ta, v){ ta.value = v; ta.dispatchEvent(new Event('input', {bubbles: true})); }
  function press(ta, k, mods){
    var e = new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, mods || {}));
    ta.dispatchEvent(e); return e.defaultPrevented;
  }

  // ---- the waterfall editor ----
  function noteTd(wk){ return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cell(wk){
    var td = noteTd(wk); if(!td) return null;
    if(!td.classList.contains('has-note')) return [];
    return (td.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }
  function wfPop(){ return q('.note-pop'); }
  async function openWf(wk){
    await reset(); await view('sheet'); var td = noteTd(wk); td.scrollIntoView({block: 'center'}); await T.sleep(100);
    T.openCell(td); await T.sleep(300); if(!wfPop()) throw new Error('no waterfall editor ' + wk); return q('textarea', wfPop());
  }

  var G = new URLSearchParams(location.search).get('g') || 'pick';
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!noteTd('2026-08-03'); }, 'fixture', 200, 100);
    await settle(); if(document.fonts && document.fonts.ready) await document.fonts.ready;

    var minted = null;
    if(G === 'pick' || G === 'mint'){
      // The calendar: four month notes in July 2026 (one amber, bold and italic), and a Waterfall note pinned to Wed 7/29.
      minted = await T.reloadWith(function (s) {
        s.dayNotes = {
          '2026-07-08': [{text: 'Production Mtg 9am', lane: null, color: '#FFC000', fmt: {bold: true, italic: true}}],
          '2026-07-09': [{text: 'Costume test', lane: null, color: null}],
          '2026-07-15': [{text: 'Crew call', lane: null, color: null}],
          '2026-07-22': [{text: 'Wardrobe 7/22/26', lane: null, color: null}]
        };
        s.userNotes = Object.assign({}, s.userNotes || {}, {'2026-07-27': {text: 'Network notes', date: '2026-07-29'}});
        s.phaseNotes = {'production@day3': {text: 'Camera test'}};   // stays with Production's 3rd shoot day, Wed 7/1
        s.viewMode = 'month';
      }, 'mvkeys');
    }
    if(G === 'mint'){
      // g=mint: tests/fixtures/mvkeys.sptcal, the calendar mvkeysreal.mjs loads (copy mvkeys.sptcal there by hand).
      add('M0', 'the calendar loaded with its notes', same(mine('2026-07-08'), []) || true, {}, 'loaded');
    }
    if(G === 'pick'){
      await toMonth('July 2026');
      bodyFocus();

      // P0 (control) + P1 + P2
      var mtg = block('2026-07-08', /Production Mtg/), look0 = look(mtg);
      await click(mtg);
      var picked = selBoxes();
      add('P0', 'a click on a month note picks it (one outline), and focus stays on the page', picked === 1 && document.activeElement === document.body,
        {boxes: picked, focus: document.activeElement && document.activeElement.tagName, look: look0}, '1 outline');
      var took = key('Delete'); await settle();
      add('P1', 'Delete on a picked month note removes it (and only it): 7/8 is empty, 7/9 and 7/15 keep theirs',
        took && same(mine('2026-07-08'), []) && same(mine('2026-07-09'), ['Costume test']) && same(mine('2026-07-15'), ['Crew call']),
        {handled: took, jul8: mine('2026-07-08'), jul9: mine('2026-07-09'), jul15: mine('2026-07-15')}, 'jul8 []');
      await undo();
      var back = block('2026-07-08', /Production Mtg/);
      add('P2', 'one Undo brings it back, amber, bold and italic as before',
        !!back && same(look(back), look0) && look0.bg === AMBER && look0.weight === '700' && look0.italic === 'italic',
        {back: back && txt(back), look: look(back), look0: look0}, 'amber, 700, italic');

      // P3 Backspace
      await click(block('2026-07-09', /Costume test/));
      took = key('Backspace'); await settle();
      add('P3', 'Backspace on a picked month note removes it', took && same(mine('2026-07-09'), []),
        {handled: took, jul9: mine('2026-07-09')}, 'jul9 []');
      await undo();

      // P4 two picks, one Delete, one Undo
      await click(block('2026-07-08', /Production Mtg/));
      await click(block('2026-07-15', /Crew call/), {metaKey: true});
      var two = selBoxes();
      took = key('Delete'); await settle();
      var gone = {jul8: mine('2026-07-08'), jul15: mine('2026-07-15'), jul9: mine('2026-07-09')};
      await undo();
      var again = {jul8: mine('2026-07-08'), jul15: mine('2026-07-15')};
      add('P4', 'two picked notes (a click, then ⌘-click): one Delete removes both, one Undo brings both back',
        two === 2 && took && same(gone.jul8, []) && same(gone.jul15, []) && same(gone.jul9, ['Costume test'])
          && same(again.jul8, ['Production Mtg 9am']) && same(again.jul15, ['Crew call']),
        {boxes: two, handled: took, gone: gone, again: again}, 'both gone, then both back');

      // P5 copy
      await click(block('2026-07-08', /Production Mtg/));
      var c1 = clip('copy');
      var it = c1.parsed && c1.parsed.items && c1.parsed.items[0];
      add('P5', '⌘C on a picked month note: "Production Mtg 9am" as plain text, and its colour and style as SPTCal\'s own data',
        c1.handled && c1.text === 'Production Mtg 9am\n' && !!it && it.text === 'Production Mtg 9am' && String(it.color).toUpperCase() === '#FFC000'
          && !!it.fmt && it.fmt.bold === true && it.fmt.italic === true,
        {copied: c1}, 'text + #FFC000 + bold italic');

      // P6 + P7 paste onto the day last clicked (a click on Crew call, Wed 7/15)
      await click(block('2026-07-15', /Crew call/));
      var p1 = clip('paste', {'text/plain': c1.text, 'application/x-sptcal-notes': c1.rich}); await settle();
      var arrived = block('2026-07-15', /Production Mtg/);
      add('P6', '⌘V after a click on Wed 7/15: the copy arrives there, amber, bold and italic; the original stays on 7/8',
        p1.handled && same(mine('2026-07-15'), ['Crew call', 'Production Mtg 9am']) && same(look(arrived), look0)
          && same(mine('2026-07-08'), ['Production Mtg 9am']),
        {handled: p1.handled, jul15: mine('2026-07-15'), look: look(arrived), jul8: mine('2026-07-08')}, 'Crew call + Production Mtg 9am, amber bold italic');
      await undo();
      add('P7', 'one Undo takes back only the paste', same(mine('2026-07-15'), ['Crew call']) && same(mine('2026-07-08'), ['Production Mtg 9am']),
        {jul15: mine('2026-07-15'), jul8: mine('2026-07-08')}, 'jul15 Crew call only');

      // P8 the date naming the old day moves with it
      await click(block('2026-07-22', /Wardrobe/));
      var c2 = clip('copy');
      await click(block('2026-07-09', /Costume test/));
      var p2 = clip('paste', {'text/plain': c2.text, 'application/x-sptcal-notes': c2.rich}); await settle();
      add('P8', 'a note naming its own day ("Wardrobe 7/22/26") pasted on Thu 7/9 reads "Wardrobe 7/9/26"; 7/22 keeps its own',
        p2.handled && same(mine('2026-07-09'), ['Costume test', 'Wardrobe 7/9/26']) && same(mine('2026-07-22'), ['Wardrobe 7/22/26']),
        {jul9: mine('2026-07-09'), jul22: mine('2026-07-22')}, 'Wardrobe 7/9/26 on 7/9');
      await undo();

      // P9 cut and paste
      await click(block('2026-07-09', /Costume test/));
      var c3 = clip('cut'); await settle();
      var afterCut = mine('2026-07-09');
      await click(block('2026-07-15', /Crew call/));
      var p3 = clip('paste', {'text/plain': c3.text, 'application/x-sptcal-notes': c3.rich}); await settle();
      add('P9', '⌘X removes the picked note (7/9) and puts it on the clipboard; ⌘V after a click on 7/15 puts it there',
        c3.handled && c3.text === 'Costume test\n' && same(afterCut, []) && p3.handled && same(mine('2026-07-15'), ['Crew call', 'Costume test']),
        {cut: c3.text, afterCut: afterCut, jul15: mine('2026-07-15')}, 'cut then pasted');
      await undo(); await undo();

      // P10 text from anywhere else: one note on the day last clicked
      await click(block('2026-07-22', /Wardrobe/));
      var p4 = clip('paste', {'text/plain': 'Table read 10am'}); await settle();
      add('P10', 'plain text copied from anywhere else ("Table read 10am") pastes as one note on the day last clicked (7/22)',
        p4.handled && same(mine('2026-07-22'), ['Wardrobe 7/22/26', 'Table read 10am']),
        {handled: p4.handled, jul22: mine('2026-07-22')}, 'Table read 10am on 7/22');
      await undo();

      // P11 controls: a holiday, a bar
      var hol = blocks('2026-07-03', 'wf')[0];
      var holText = hol && txt(hol);
      var holTook = null, barTook = null, barBoxes = null;
      if(hol){ await click(hol); holTook = key('Delete'); await settle(); }
      var holAfter = texts('2026-07-03', 'wf');
      var bar = qa('#table-wrap .mv-bars > .mv-pill').filter(function (p) { return p.getBoundingClientRect().width > 0; })[0];
      var notesBefore = qa('#table-wrap .mv-note-block').map(txt).join('|');
      if(bar){ await clickAt(centre(bar)); barBoxes = selBoxes(); barTook = key('Delete'); await settle(); }
      var notesAfter = qa('#table-wrap .mv-note-block').map(txt).join('|');
      add('P11', 'Delete leaves a picked holiday where it is, and does nothing with only a phase bar picked',
        !!hol && holTook === false && same(holAfter, [holText]) && barBoxes >= 1 && barTook === false && notesBefore === notesAfter,
        {holiday: holText, holTook: holTook, holAfter: holAfter, barBoxes: barBoxes, barTook: barTook, same: notesBefore === notesAfter}, 'nothing removed');
      key('Escape'); bodyFocus();

      // P12 a Waterfall line in the month view: Delete is the editor's Delete Note (out of the Waterfall too)
      var net = block('2026-07-29', /Network notes/);
      var netKind = net && net.getAttribute('data-note-kind');
      if(net){ await click(net); var netTook = key('Delete'); await settle(); }
      var mvNet = texts('2026-07-29').filter(function (t) { return /Network/.test(t); });
      await view('sheet');
      var wfNet = cell('2026-07-27');
      add('P12', 'Delete on a picked Waterfall line ("Network notes", Wed 7/29) deletes it in both views, as the editor\'s Delete Note does',
        netKind === 'wf' && netTook === true && same(mvNet, []) && same(wfNet, []),
        {kind: netKind, handled: netTook, month: mvNet, waterfall: wfNet}, 'gone from both');
      await undo();
      var wfBack = cell('2026-07-27');
      await toMonth('July 2026'); bodyFocus();
      var mvBack = texts('2026-07-29').filter(function (t) { return /Network/.test(t); });
      add('P12b', 'one Undo brings the Waterfall line back in both views', same(wfBack, ['Network notes']) && same(mvBack, ['Network notes']),
        {waterfall: wfBack, month: mvBack}, 'back in both');

      // P15 a note that stays with a phase: Delete deletes it (its editor's Delete Note), in both views
      var cam = block('2026-07-01', /Camera test/);
      var camKind = cam && cam.getAttribute('data-note-kind'), camTook = null;
      if(cam){ await click(cam); camTook = key('Delete'); await settle(); }
      var mvCam = texts('2026-07-01').filter(function (t) { return /Camera/.test(t); });
      await view('sheet');
      var wfCam = (cell('2026-06-29') || []).filter(function (l) { return /Camera/.test(l); });
      await undo();
      var wfCamBack = (cell('2026-06-29') || []).filter(function (l) { return /Camera/.test(l); });
      await toMonth('July 2026'); bodyFocus();
      var mvCamBack = texts('2026-07-01').filter(function (t) { return /Camera/.test(t); });
      add('P15', 'Delete on a picked note that stays with a phase ("Camera test", Production day 3) deletes it in both views; one Undo brings it back',
        !!cam && camTook === true && same(mvCam, []) && same(wfCam, []) && mvCamBack.length === 1 && wfCamBack.length === 1,
        {kind: camKind, handled: camTook, month: mvCam, waterfall: wfCam, monthBack: mvCamBack, waterfallBack: wfCamBack}, 'gone, then back');

      // P13 controls: no note picked; the editor open; the day clicked not on screen
      if(bar){ await clickAt(centre(qa('#table-wrap .mv-bars > .mv-pill').filter(function (p) { return p.getBoundingClientRect().width > 0; })[0])); }
      var c4 = clip('copy');
      await click(block('2026-07-15', /Crew call/));
      var c5 = clip('copy');
      var ta = await openPlus('2026-07-16');
      var pEd = clip('paste', {'text/plain': c5.text, 'application/x-sptcal-notes': c5.rich});
      press(ta, 'Escape'); await settle(); bodyFocus();
      await click(block('2026-07-15', /Crew call/));
      await toMonth('September 2026'); bodyFocus();
      var sepBefore = qa('#table-wrap .mv-note-block').map(txt).join('|');
      var pOff = clip('paste', {'text/plain': c5.text, 'application/x-sptcal-notes': c5.rich}); await settle();
      var sepAfter = qa('#table-wrap .mv-note-block').map(txt).join('|');
      await toMonth('July 2026');
      add('P13', '⌘C with only a bar picked, ⌘V into an open editor, and ⌘V once the day clicked (7/15) is off screen are left to the browser',
        c4.handled === false && c4.text === '' && c5.handled === true && pEd.handled === false && pOff.handled === false && sepBefore === sepAfter
          && same(mine('2026-07-15'), ['Crew call']) && same(texts('2026-07-16', 'day'), []),
        {barCopy: c4, editorPaste: pEd.handled, offPaste: pOff.handled, sepSame: sepBefore === sepAfter, jul15: mine('2026-07-15'), jul16: texts('2026-07-16', 'day')}, 'none handled');

      // P14 control: a sidebar field holds focus
      await click(block('2026-07-08', /Production Mtg/));
      var fld = byId('show-title'); fld.focus();
      var fTook = key('Delete');
      var fCopy = clip('copy');
      await settle();
      add('P14', 'with a sidebar field focused, Delete and ⌘C are the field\'s: the picked note stays, nothing copied',
        fTook === false && fCopy.handled === false && same(mine('2026-07-08'), ['Production Mtg 9am']),
        {handled: fTook, copy: fCopy.handled, jul8: mine('2026-07-08')}, 'nothing');
      bodyFocus();

      // P16-P18 (the 14 Nov 2026 review of item 2.8): a holiday or an automatic note keeps its own day, as in the
      // waterfall (item 2.3, AUD2-014). Before the repair a picked holiday went on the clipboard and a paste re-dated it,
      // inventing "Independence Day (Observed) 7/15/26" as a day note on 7/15.
      var KEEP = /Holidays and automatic notes stay on their own dates/;
      function chipNow(){ var c = q('.text-sel-chip'); return c ? txt(c) : ''; }
      await click(block('2026-07-09', /Costume test/));
      var hol2 = blocks('2026-07-03', 'wf')[0], hol2Text = hol2 && txt(hol2);
      if(hol2) await click(hol2, {metaKey: true});
      var picks16 = selBoxes();
      var c16 = clip('cut'); await settle();
      var said16 = chipNow();
      await click(block('2026-07-15', /Crew call/));
      var p16 = clip('paste', {'text/plain': c16.text, 'application/x-sptcal-notes': c16.rich}); await settle();
      var jul15 = mine('2026-07-15'), jul9 = mine('2026-07-09'), jul3 = texts('2026-07-03', 'wf');
      add('P16', '⌘X on "Costume test" with "Independence Day (Observed)" also picked: only the typed note travels; the paste on 7/15 adds "Costume test" and no holiday, 7/3 keeps its holiday, and the grid says why',
        !!hol2 && picks16 === 2 && c16.handled && c16.text === 'Costume test\n' && !!c16.parsed && c16.parsed.items.length === 1
          && p16.handled && same(jul15, ['Crew call', 'Costume test']) && same(jul9, []) && same(jul3, [hol2Text]) && KEEP.test(said16),
        {holiday: hol2Text, picks: picks16, cut: c16.text, items: c16.parsed && c16.parsed.items, said: said16, jul15: jul15, jul9: jul9, jul3: jul3},
        'clipboard "Costume test" only; 7/15 Crew call + Costume test; holiday stays on 7/3');
      await undo(); await undo();
      var back16 = {jul9: mine('2026-07-09'), jul15: mine('2026-07-15')};
      add('P16b', 'two Undos (the paste, then the cut) put both days back', same(back16.jul9, ['Costume test']) && same(back16.jul15, ['Crew call']),
        back16, 'jul9 Costume test, jul15 Crew call');

      // P17 a holiday picked alone: ⌘C and ⌘X copy nothing, leave the clipboard to the browser, and say why.
      var hol3 = blocks('2026-07-03', 'wf')[0];
      if(hol3) await click(hol3);
      var c17 = clip('copy'), said17 = chipNow();
      var x17 = clip('cut'); await settle();
      add('P17', 'a holiday picked alone: ⌘C and ⌘X put nothing on the clipboard, the holiday stays, and the grid says "Holidays and automatic notes stay on their own dates"',
        !!hol3 && c17.handled === false && c17.text === '' && x17.handled === false && x17.text === '' && same(texts('2026-07-03', 'wf'), [hol2Text]) && KEEP.test(said17),
        {copy: c17, cut: x17, said: said17, jul3: texts('2026-07-03', 'wf')}, 'nothing copied, the message');
      key('Escape'); bodyFocus();

      // P18 an automatic note picked alone (the first one the calendar shows from June 2026 on): the same.
      var autoEl = null, autoMonth = '';
      for(var am = 0; am < 3 && !autoEl; am++){
        autoMonth = ['June 2026', 'July 2026', 'August 2026'][am];
        await toMonth(autoMonth); bodyFocus();
        // By its wording: until 16 Nov 2026 an automatic note wore a symbol class (.mv-note-mark-auto), which went with
        // the symbols (the month page). A waterfall line that reads as one of the app's automatic notes.
        autoEl = qa('#table-wrap .mv-note-block[data-note-kind="wf"]').filter(function(b){
          return /^(Start Principal Photography|Principal Photography Wraps|.+ (Begins|Opens|Wraps|Ends))\b/.test(txt(b)); })[0] || null;
      }
      var autoText = autoEl && txt(autoEl), autoDay = autoEl && autoEl.getAttribute('data-note-day');
      if(autoEl) await click(autoEl);
      var c18 = clip('copy'), said18 = chipNow();
      add('P18', 'an automatic note picked alone (' + (autoText || 'none found') + '): ⌘C puts nothing on the clipboard and says why',
        !!autoEl && c18.handled === false && c18.text === '' && KEEP.test(said18),
        {month: autoMonth, note: autoText, day: autoDay, copy: c18, said: said18}, 'nothing copied, the message');
      key('Escape'); bodyFocus();
      await toMonth('July 2026');

      // P19 / P20 (the second review of item 2.8, 14 Nov 2026): the grid's message chip (.month-sel-chip) is body-level
      // chrome that lives 4.2 s. Before the repair a shareable copy exported in that window carried it for good (it was
      // missing from buildSavedHtml's strip list), and leaving the month view and coming back inside it redrew the chip.
      // ⚠️ The pattern is built at run time: srv.js injects this leg's source into the page (see mvtextstyle.js's C1).
      var CHIP_TAG = new RegExp('class="text-sel-chip ' + 'month' + '-sel-chip', 'g');
      async function chipUp(){
        bodyFocus();   // closing Settings hands focus back to its trigger, and a focused control keeps ⌘C (P14)
        var h = blocks('2026-07-03', 'wf')[0]; if(h) await click(h);
        var picked = selBoxes(), c = clip('copy'), said = chipNow(); key('Escape'); bodyFocus();
        return {t0: Date.now(), chips: qa('body > .month-sel-chip').length, found: !!h, picked: picked, handled: c.handled, said: said};
      }
      var f19 = await chipUp();
      await T.openSettings('prefs');
      await T.until(function () { return !!byId('share-copy-btn'); }, 'the Export-App button', 80, 100);
      await T.sleep(650);   // the button's 600 ms re-click guard counts every click on the page (the pick's among them)
      var live19 = qa('body > .month-sel-chip').length, ms19 = Date.now() - f19.t0;
      var cap19 = T.captureDownload();
      byId('share-copy-btn').click();
      await T.until(cap19.peek, 'the shareable copy', 200, 100);
      var copy19 = await cap19.stop().text();
      await T.closeSettings();
      var inCopy19 = (copy19.match(CHIP_TAG) || []).length;
      add('P19', 'a shareable copy exported while the grid\'s message is showing carries no .month-sel-chip',
        f19.chips === 1 && live19 === 1 && ms19 < 4200 && inCopy19 === 0,
        {chipsAfterCopy: f19.chips, chipsAtExport: live19, msAfterFlash: ms19, inCopy: inCopy19}, 'one live, none in the copy');
      await T.sleep(4400); await settle();

      var f20 = await chipUp();
      await view('sheet');
      var onSheet20 = qa('body > .month-sel-chip').length;
      await view('month');
      var back20 = qa('body > .month-sel-chip').length, ms20 = Date.now() - f20.t0;
      add('P20', 'the grid\'s message does not come back when the month view is left and opened again inside its 4.2 s',
        f20.chips === 1 && onSheet20 === 0 && back20 === 0 && ms20 < 4200,
        {flash: f20, chipsAfterCopy: f20.chips, onWaterfall: onSheet20, backInMonth: back20, msAfterFlash: ms20}, '1, then 0 and 0, inside 4.2 s');
      await T.sleep(4400); await settle();
    }

    if(G === 'enter'){
      // Loaded as a file, so the undo history starts at this calendar (an Undo never reaches back into its building).
      await T.reloadWith(function (s) { s.viewMode = 'month'; }, 'mvkeys');
      await toMonth('July 2026'); bodyFocus();
      // M1 + M2 Enter saves a new note
      var ta = await openPlus('2026-07-08');
      typeIn(ta, 'Table read 10am');
      var took = press(ta, 'Enter'); await settle();
      add('M1', 'month: Enter in a new note saves it and closes the editor', took && !pop() && same(mine('2026-07-08'), ['Table read 10am']),
        {handled: took, open: !!pop(), jul8: mine('2026-07-08')}, 'saved, closed');
      await undo();
      add('M2', 'one Undo takes the Enter-saved note back', same(mine('2026-07-08'), []), {jul8: mine('2026-07-08')}, 'jul8 []');

      // M3 Shift+Enter, Alt+Enter, the 3-line cap, then Enter
      ta = await openPlus('2026-07-09');
      typeIn(ta, 'Line one'); ta.setSelectionRange(ta.value.length, ta.value.length);
      var s1 = press(ta, 'Enter', {shiftKey: true}), v1 = ta.value, open1 = !!pop();
      typeIn(ta, ta.value + 'Line two'); ta.setSelectionRange(ta.value.length, ta.value.length);
      var s2 = press(ta, 'Enter', {altKey: true}), v2 = ta.value;
      typeIn(ta, ta.value + 'Line three'); ta.setSelectionRange(ta.value.length, ta.value.length);
      press(ta, 'Enter', {shiftKey: true}); var v3 = ta.value, open3 = !!pop();
      press(ta, 'Enter'); await settle();
      var b3 = block('2026-07-09', /Line one/);
      add('M3', 'Shift+Enter and Alt+Enter each add a line and keep the editor open; a 4th line is refused; Enter saves all three',
        s1 && open1 && v1 === 'Line one\n' && s2 && v2 === 'Line one\nLine two\n' && v3 === 'Line one\nLine two\nLine three' && open3 && !pop()
          && !!b3 && (b3.innerText || '').split('\n').map(function (l) { return l.trim(); }).join('|') === 'Line one|Line two|Line three',
        {v1: v1, v2: v2, v3: v3, open1: open1, open3: open3, after: b3 && b3.innerText}, 'three lines');

      // M4 Esc keeps a new note's text
      ta = await openPlus('2026-07-15');
      typeIn(ta, 'Costume fittings');
      press(ta, 'Escape'); await settle();
      add('M4', 'Esc on a NEW note with text keeps it (was thrown away, with no undo)', !pop() && same(mine('2026-07-15'), ['Costume fittings']),
        {open: !!pop(), jul15: mine('2026-07-15')}, 'kept');

      // M5 Esc keeps a changed note (its own note, saved by Tab, so the case stands on its own)
      ta = await openPlus('2026-07-14');
      typeIn(ta, 'Fitting'); press(ta, 'Tab'); await settle();
      ta = await openNote(block('2026-07-14', /Fitting/));
      typeIn(ta, 'Fitting 2pm');
      press(ta, 'Escape'); await settle();
      add('M5', 'Esc on an existing note whose text changed keeps the change', !pop() && same(texts('2026-07-14', 'day'), ['Fitting 2pm']),
        {jul14: texts('2026-07-14', 'day')}, 'Fitting 2pm');

      // M6 controls: unchanged, emptied
      var m6was = texts('2026-07-14', 'day');
      ta = await openNote(block('2026-07-14', /Fitting/));
      press(ta, 'Escape'); await settle();
      var un = texts('2026-07-14', 'day');
      ta = await openNote(block('2026-07-14', /Fitting/));
      typeIn(ta, '');
      press(ta, 'Escape'); await settle();
      var em = texts('2026-07-14', 'day');
      add('M6', 'Esc on an unchanged note, and on one whose box was emptied, closes it and writes nothing (the note stays)',
        !pop() && m6was.length === 1 && same(un, m6was) && same(em, m6was),
        {was: m6was, unchanged: un, emptied: em}, 'unchanged');

      // M7 controls: IME, Tab, Ctrl+Enter
      ta = await openPlus('2026-07-16');
      typeIn(ta, 'カメラ');
      var ime = press(ta, 'Enter', {isComposing: true}), imeOpen = !!pop();
      press(ta, 'Tab'); await settle();
      var tabSaved = same(texts('2026-07-16', 'day'), ['カメラ']);
      ta = await openPlus('2026-07-17');
      typeIn(ta, 'Ctrl saves');
      press(ta, 'Enter', {ctrlKey: true}); await settle();
      add('M7', 'Enter inside an IME composition does not save; Tab and Ctrl/Cmd+Enter still save',
        ime === false && imeOpen && tabSaved && same(texts('2026-07-17', 'day'), ['Ctrl saves']),
        {ime: ime, imeOpen: imeOpen, jul16: texts('2026-07-16', 'day'), jul17: texts('2026-07-17', 'day')}, 'composition kept, Tab + Ctrl saved');

      // M8 controls: Enter on a picked note opens it and leaves it open; a holiday's Esc still cancels
      await click(block('2026-07-17', /Ctrl saves/));
      var opened = key('Enter'); await T.sleep(300);
      var stillOpen = !!pop(), val = pop() && q('textarea', pop()).value;
      if(pop()){ press(q('textarea', pop()), 'Escape'); await settle(); }
      var hol = blocks('2026-07-03', 'wf')[0], holName = hol && txt(hol);
      var holEsc = null;
      if(hol){ ta = await openNote(hol); typeIn(ta, 'Fourth'); press(ta, 'Escape'); await settle(); holEsc = texts('2026-07-03', 'wf'); }
      add('M8', 'Enter on a picked note opens its editor and leaves it open; a holiday\'s editor still cancels on Esc (it says so)',
        opened && stillOpen && val === 'Ctrl saves' && same(texts('2026-07-17', 'day'), ['Ctrl saves']) && !!hol && same(holEsc, [holName]),
        {opened: opened, stillOpen: stillOpen, value: val, holiday: holName, afterEsc: holEsc}, 'open; holiday unchanged');

      // M9 the key that OPENED the editor (typing on a picked note adds it at the end) counts as what it opened with: a stray
      // key and Esc leave the note as it was; keep typing, and Esc keeps all of it
      await click(block('2026-07-17', /Ctrl saves/));
      key('x'); await T.sleep(300);
      var m9a = pop() && q('textarea', pop()).value;
      if(pop()){ press(q('textarea', pop()), 'Escape'); await settle(); }
      var m9stray = texts('2026-07-17', 'day');
      bodyFocus(); await click(block('2026-07-17', /Ctrl saves/));
      key('x'); await T.sleep(300);
      if(pop()){ ta = q('textarea', pop()); typeIn(ta, ta.value + 'y'); press(ta, 'Escape'); await settle(); }
      add('M9', 'a stray key on a picked note opens its editor with the key added, and Esc leaves the note as it was; typing on, Esc keeps it all',
        m9a === 'Ctrl savesx' && same(m9stray, ['Ctrl saves']) && same(texts('2026-07-17', 'day'), ['Ctrl savesxy']),
        {opened: m9a, afterStrayEsc: m9stray, afterMore: texts('2026-07-17', 'day')}, 'unchanged, then Ctrl savesxy');

      // W1 waterfall Enter saves
      ta = await openWf('2026-08-10');
      typeIn(ta, 'Wardrobe fittings');
      took = press(ta, 'Enter'); await settle();
      add('W1', 'waterfall: Enter in the note editor saves the note and closes the editor', took && !wfPop() && same(cell('2026-08-10'), ['Wardrobe fittings']),
        {handled: took, open: !!wfPop(), cell: cell('2026-08-10')}, 'saved');

      // W2 Shift+Enter, Alt+Enter
      ta = await openWf('2026-08-17');
      typeIn(ta, 'Cast arrives'); ta.setSelectionRange(ta.value.length, ta.value.length);
      var w1 = press(ta, 'Enter', {shiftKey: true}), wv1 = ta.value;
      typeIn(ta, ta.value + 'Read-through'); ta.setSelectionRange(ta.value.length, ta.value.length);
      var w2 = press(ta, 'Enter', {altKey: true}), wv2 = ta.value, wOpen = !!wfPop();
      typeIn(ta, ta.value + 'Fittings');
      press(ta, 'Enter'); await settle();
      add('W2', 'waterfall: Shift+Enter and Alt+Enter add a line and keep the editor open; Enter saves the three lines',
        w1 && w2 && wv1 === 'Cast arrives\n' && wv2 === 'Cast arrives\nRead-through\n' && wOpen && same(cell('2026-08-17'), ['Cast arrives', 'Read-through', 'Fittings']),
        {wv1: wv1, wv2: wv2, open: wOpen, cell: cell('2026-08-17')}, 'three lines');

      // W3 Esc keeps a changed note
      ta = await openWf('2026-08-24');
      typeIn(ta, 'Network call');
      press(ta, 'Escape'); await settle();
      add('W3', 'waterfall: Esc on a changed note keeps it (was thrown away)', !wfPop() && same(cell('2026-08-24'), ['Network call']),
        {open: !!wfPop(), cell: cell('2026-08-24')}, 'kept');

      // W4 controls: unchanged, emptied (its own note, saved by Ctrl+Enter, so the case stands on its own)
      ta = await openWf('2026-09-14');
      typeIn(ta, 'Payroll'); press(ta, 'Enter', {ctrlKey: true}); await settle();
      ta = await openWf('2026-09-14');
      press(ta, 'Escape'); await settle();
      var wu = cell('2026-09-14');
      ta = await openWf('2026-09-14');
      typeIn(ta, '');
      press(ta, 'Escape'); await settle();
      add('W4', 'waterfall: Esc on an unchanged note, and on an emptied box, closes the editor and writes nothing',
        !wfPop() && same(wu, ['Payroll']) && same(cell('2026-09-14'), ['Payroll']), {unchanged: wu, emptied: cell('2026-09-14')}, 'unchanged');

      // W5 controls: Enter on a highlighted cell opens and stays open; Enter on the Day list is the list's
      var td = noteTd('2026-08-31'); td.scrollIntoView({block: 'center'}); await T.sleep(100);
      var pc = centre(td), tt = document.elementFromPoint(pc.x, pc.y) || td;
      ['pointerdown', 'pointerup'].forEach(function (ty) { tt.dispatchEvent(new PointerEvent(ty, {bubbles: true, cancelable: true, composed: true, clientX: pc.x, clientY: pc.y, button: 0, buttons: ty === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true})); });
      tt.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: pc.x, clientY: pc.y, button: 0}));
      await T.sleep(200); bodyFocus();
      var wOpened = key('Enter'); await T.sleep(300);
      var wStill = !!wfPop();
      var ds = wfPop() && q('.note-day-select', wfPop());
      var dayTook = null;
      if(ds){ typeIn(q('textarea', wfPop()), 'Day list'); ds.focus(); var de = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}); ds.dispatchEvent(de); dayTook = de.defaultPrevented; }
      var wStill2 = !!wfPop();
      if(wfPop()){ press(q('textarea', wfPop()), 'Enter'); await settle(); }
      add('W5', 'waterfall: Enter on a highlighted Notes cell opens its editor and leaves it open; Enter on its Day list does not save',
        wOpened && wStill && !!ds && dayTook === false && wStill2 && same(cell('2026-08-31'), ['Day list']),
        {opened: wOpened, open: wStill, dayList: !!ds, dayTook: dayTook, open2: wStill2, cell: cell('2026-08-31')}, 'open, then saved by Enter in the box');

      // W6 the waterfall's twin of M9
      await reset(); await view('sheet');
      var hl = async function (wk) {
        var c = noteTd(wk); c.scrollIntoView({block: 'center'}); await T.sleep(100);
        var pt = centre(c), tg = document.elementFromPoint(pt.x, pt.y) || c;
        ['pointerdown', 'pointerup'].forEach(function (ty) { tg.dispatchEvent(new PointerEvent(ty, {bubbles: true, cancelable: true, composed: true, clientX: pt.x, clientY: pt.y, button: 0, buttons: ty === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true})); });
        tg.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: pt.x, clientY: pt.y, button: 0}));
        await T.sleep(200); bodyFocus();
      };
      ta = await openWf('2026-09-21');   // its own note, saved by Ctrl+Enter, so the case stands on its own
      typeIn(ta, 'Blocker'); press(ta, 'Enter', {ctrlKey: true}); await settle(); bodyFocus();
      await hl('2026-09-21');
      key('x'); await T.sleep(300);
      var w6a = wfPop() && q('textarea', wfPop()).value;
      if(wfPop()){ press(q('textarea', wfPop()), 'Escape'); await settle(); }
      var w6stray = cell('2026-09-21');
      await hl('2026-09-21');
      key('x'); await T.sleep(300);
      if(wfPop()){ ta = q('textarea', wfPop()); typeIn(ta, ta.value + 'y'); press(ta, 'Escape'); await settle(); }
      add('W6', 'waterfall: a stray key on a highlighted note and Esc leave it as it was; typing on, Esc keeps it all',
        w6a === 'Blockerx' && same(w6stray, ['Blocker']) && same(cell('2026-09-21'), ['Blockerxy']),
        {opened: w6a, afterStrayEsc: w6stray, afterMore: cell('2026-09-21')}, 'unchanged, then Blockerxy');
    }
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e), 'no exception');
  }
  var h = T.appHealth();
  add('E0', 'no console errors and no native alert', h.errors.length === 0, {errors: h.errors.slice(0, 5)}, 'none');
  var res = {test: 'mvkeys', g: G, cases: cases, info: info};
  if(minted) res.sptcal = btoa(unescape(encodeURIComponent(JSON.stringify(minted))));
  if(G !== 'mint') delete res.sptcal;
  T.done(res);
})(); });
