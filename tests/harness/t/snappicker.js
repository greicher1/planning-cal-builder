// snappicker -- Snap to Monday is switched in the phase's Starts date picker, not on the card (owner, 18 Nov 2026:
// "what do you think about putting snap to monday slider inside the mini calendar pop up box, at the bottom where the
// message currently is?", then "Yes, build it"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh snappicker 200
//
// src/chrome/DatePop.jsx (snapBoxOf, flipSnap) and legacy.css (.phase-row .phase-snap hidden, .date-pop .dp-snap):
//   C1  no phase card shows a Snap to Monday row, every snap-<key> box is still in the document (it is the saved
//       field), and Production's switch block, which held only that row, is gone
//   S1  a snapped phase's Starts picker ends in the switch, ON, in the hint's place (no hint), with no id anywhere in it
//   S2  flipping it OFF in the picker unticks snap-<key>, the picker stays open and every day becomes pickable
//   S3  that flip is ONE undo step: Undo ticks the box again, Redo unticks it
//   S4  Production's Starts picker has the switch too, and it drives snap-production
//   S5  pick a Wednesday with Snap off, reopen, switch Snap ON in the picker, then leave the box: the Wednesday stays
//       (the card's switch always did; datepick P7). Switching back off in the picker gives the Wednesday back.
//       ⛔ Without flipSnap's focusout the leave rewrote it to its Monday (red on that mutant).
//   N1  no switch where Snap means nothing or is not the phase's to change: an all-phase hiatus, a phase's own hiatus,
//       a Dates phase's start, Build Around's date, a custom holiday's date
//   F1  opening the picker and flipping the switch add no field id (formSignature's keys unchanged)
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  var MS = 86400000, MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(t){ return new Date(t).toISOString().slice(0, 10); }
  function mondayOf(t){ return t - ((new Date(t).getUTCDay() + 6) % 7) * MS; }
  async function settle(){ await T.sleep(700); }   // past the 500 ms undo debounce
  function pop(){ return document.querySelector('.date-pop'); }
  async function open(id){
    var el = typeof id === 'string' ? byId(id) : id;
    el.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    await T.sleep(150);
    return read();
  }
  async function close(){ document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true})); await T.sleep(120); }
  function cells(){
    var p = pop(); if(!p) return [];
    var m = /^(\w+) (\d{4})/.exec(p.querySelector('.dp-title').textContent.trim());
    var start = mondayOf(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1));
    return Array.from(p.querySelectorAll('.dp-day')).map(function (b, i) { return {b: b, iso: iso(start + i * MS)}; });
  }
  function read(){
    var p = pop(); if(!p) return null;
    var sw = p.querySelector('.dp-snap input');
    return {
      snap: sw ? (sw.checked ? 'on' : 'off') : null,
      hint: Array.from(p.querySelectorAll('.dp-hint')).map(function (h) { return h.textContent.trim(); }).join(' | '),
      off: p.querySelectorAll('.dp-off').length,
      ids: p.querySelectorAll('[id]').length,
      solo: cells().filter(function (c) { return c.b.classList.contains('dp-cap') && c.b.classList.contains('dp-solo'); }).map(function (c) { return c.iso; })
    };
  }
  async function flip(){ var sw = pop() && pop().querySelector('.dp-snap input'); if(!sw) throw new Error('no Snap switch in the picker'); sw.click(); await T.sleep(250); }
  async function clickDay(d){
    var c = cells().filter(function (x) { return x.iso === d; })[0];
    if(!c) throw new Error('no ' + d + ' in the picker');
    c.b.click(); await T.sleep(200);
  }
  function shownEl(el){ return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the fixture grid', 200, 100);
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if(tab) tab.click();
    await settle();
    var keysBefore = Object.keys(T.formSignature()).sort().join();

    // ---- C1: the cards
    var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
    var c1 = KEYS.map(function (k) { var b = byId('snap-' + k); return {k: k, inDoc: !!b, rowShown: b ? shownEl(b.closest('.phase-snap')) : null}; });
    var prodSw = byId('snap-production') && byId('snap-production').closest('.phase-switches');
    add('C1', 'no card shows Snap to Monday; every snap-<key> is still in the document; Production\'s switch block is gone',
      c1.every(function (x) { return x.inDoc && x.rowShown === false; }) && !!prodSw && getComputedStyle(prodSw).display === 'none',
      {cards: c1, prodBlock: prodSw && getComputedStyle(prodSw).display}, 'every box in the document, no row shown, Production\'s block display none');

    // ---- S1: the picker's foot
    var r = await open('start-prodPrep');
    var swEl = pop() && pop().querySelector('.dp-snap input');
    add('S1', 'a snapped phase\'s Starts picker ends in the Snap to Monday switch, on, with no hint and no id in the picker',
      !!r && r.snap === 'on' && r.hint === '' && r.ids === 0 && r.off === 36 && !!swEl && !swEl.id && /Snap to Monday/.test(pop().querySelector('.dp-snap').textContent),
      r, 'snap on, no hint, 0 ids, Mondays only');

    // ---- S2: flip off in the picker
    await flip();
    r = read();
    add('S2', 'flipped off in the picker: snap-prodPrep unticked, the picker still open, every day pickable',
      !!r && r.snap === 'off' && r.off === 0 && byId('snap-prodPrep').checked === false, {pick: r, box: byId('snap-prodPrep').checked}, 'snap off, 0 greyed, box unticked');
    await close(); await settle();

    // ---- S3: one undo step
    byId('undo-btn').click(); await settle();
    var afterUndo = byId('snap-prodPrep').checked;
    byId('redo-btn').click(); await settle();
    var afterRedo = byId('snap-prodPrep').checked;
    add('S3', 'the flip is one undo step: Undo ticks the box again, Redo unticks it', afterUndo === true && afterRedo === false,
      {afterUndo: afterUndo, afterRedo: afterRedo}, 'true then false');
    // Back on, through the picker.
    await open('start-prodPrep'); await flip(); await close(); await settle();

    // ---- S4: Production
    r = await open('start-production');
    var s4a = r && r.snap, s4box = byId('snap-production').checked;
    if(r && r.snap){ await flip(); }
    var s4b = read() && read().snap, s4box2 = byId('snap-production').checked;
    if(r && r.snap){ await flip(); }
    await close(); await settle();
    add('S4', 'Production\'s Starts picker has the switch and it drives snap-production',
      s4a === (s4box ? 'on' : 'off') && s4b === (s4box2 ? 'on' : 'off') && s4box !== s4box2 && byId('snap-production').checked === s4box,
      {first: s4a, box: s4box, second: s4b, box2: s4box2}, 'the switch follows the box both ways, and is put back');

    // ---- S5: the Wednesday survives switching Snap on in the picker and leaving the box
    var f = byId('start-prodPrep');
    await open(f); await flip();                 // Snap off
    await clickDay('2026-05-20');                // a Wednesday, picked (the picker closes)
    var picked = f.value;
    // Reopened by a CLICK: the box still has focus after a pick, so a person's click fires no focusin (which would
    // clear the engine's "typed in this visit" mark, showSnappedMonday's snapTyped, and hide the bug this case is for).
    f.dispatchEvent(new MouseEvent('click', {bubbles: true})); await T.sleep(150);
    await flip();                                // Snap back on, focus still in the box
    var onSnap = read();
    f.dispatchEvent(new FocusEvent('focusout', {bubbles: true})); await close(); await settle();   // leave the box
    var afterLeave = f.value;
    await open(f); await flip();                 // Snap off again: the Wednesday comes back as the start
    var backOff = read();
    await flip(); await close(); await settle(); // and on, as the fixture had it
    add('S5', 'a Wednesday picked with Snap off survives switching Snap on in the picker and leaving the box; off again, it is the start',
      picked === '2026-05-20' && !!onSnap && onSnap.snap === 'on' && onSnap.solo.join() === '2026-05-18' && afterLeave === '2026-05-20' &&
      !!backOff && backOff.snap === 'off' && backOff.solo.join() === '2026-05-20' && byId('snap-prodPrep').checked === true,
      {picked: picked, onSnap: onSnap, afterLeave: afterLeave, backOff: backOff}, '2026-05-20 kept; Monday 5/18 capped while on; 5/20 when off');

    // ---- N1: no switch elsewhere
    var none = {};
    T.addHiatus && T.addHiatus('2026-12-21', 2); await settle();
    var hs = document.querySelector('.hiatus-start'); none.hiatus = hs ? (await open(hs)) : 'missing'; await close();
    var phs = document.querySelector('.phiatus-start'); none.phaseHiatus = phs ? (await open(phs)) : 'missing'; await close();
    T.set('unit-post', 'dates'); await settle();
    none.dates = await open('start-post'); await close();
    T.set('unit-post', 'weeks'); await settle();
    var ch = byId('custom-hol-date'); none.customHoliday = ch ? (await open(ch)) : 'missing'; await close();
    byId('pop-solve-btn').click(); await T.sleep(300);
    T.set('tool-solve-phase', 'prodPrep'); await T.sleep(300);
    none.buildAround = await open('tool-solve-date'); await close();
    T.closePops && T.closePops(); await T.sleep(200);
    var n1 = Object.keys(none).every(function (k) { var x = none[k]; return x === 'missing' || (!!x && x.snap === null); });
    var n1seen = Object.keys(none).filter(function (k) { return none[k] && none[k] !== 'missing'; }).length;
    add('N1', 'no Snap switch on a hiatus, a phase\'s own hiatus, a Dates start, a custom holiday or Build Around\'s date',
      n1 && n1seen >= 4, none, 'snap null on each picker opened (at least four of the five)');

    // ---- F1: no new field ids
    var keysAfter = Object.keys(T.formSignature()).sort().join();
    add('F1', 'opening the picker and flipping its switch add no field id', keysAfter === keysBefore,
      {before: keysBefore.split(',').length, after: keysAfter.split(',').length}, 'the same keys');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'snappicker', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
