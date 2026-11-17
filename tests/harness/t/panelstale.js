// panelstale -- a tool panel left open while the calendar changes under it (audit AUD2-049, the Nov 2026 audit's item
// 3.2, 14 Nov 2026). Since 11 Nov 2026 the Shift and Build Around panels stay open while the grid and the sidebar are
// used, and every new schedule re-reads the calendar into them (refreshMenuFromCalendar, from the #table-wrap observer).
// ⚠️ Since 16 Nov 2026 only a DRAGGED panel stays open through a click outside it (owner: "should hide when you click
// anywhere outside of them EXCEPT when a user has dragged them to any custom spot"). The B steps click the sidebar's
// Add phase with Shift open, so they drag it aside first (dragAside), as someone keeping it up while they work would.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh panelstale 400
//
// Before: that re-read also REFILLED the date boxes from the calendar, so a date typed into Build Around (or Shift's To
// a date) was silently replaced by the pinned phase's current date after any edit underneath, and Build then built
// around the OLD date. And Shift kept its ticks as a fixed set filled on opening, so a phase dated while the panel was
// open came in unticked ("6 of 7 move"): the whole-calendar move the panel showed became a part move that left the new
// phase, its notes and the range behind.
// Now a typed date stays until the user changes the pin (or the phase that lands), the edge, closes the panel or runs the
// tool; and a Shift panel with EVERY phase ticked ticks a phase that appears while it is open (a hand-picked set keeps
// the new phase unticked, as the user left it).
//
// On T.buildFixture() (synthetic: US-General, 10 eps x 8 days, Production 6/29/26, Post 11/2/26 16 wks).
//   A1-A3  Build Around: pin Production, starts on, type 9/7/26; an edit to Post's weeks and to Localization's start
//          underneath leave 9/7/26 in the box and the Production row previews 9/7/26
//   A4     Build builds around 9/7/26 (Production starts 9/7/26)
//   A5-A7  a new pin, the edge, and reopening the panel refill the date from the calendar as before
//   D1-D2  Shift, To a date: Production's date typed (9/14/26) survives an edit underneath, and Go lands it there
//   B1-B3  Shift with every phase ticked: a phase dated while it is open comes in ticked ("7 of 7 move"), and 1 wk later
//          moves the whole calendar: VFX with it, the line is the whole-calendar one (nothing "stayed")
//   B4     with one phase unticked, a phase added while it is open comes in unticked (the user's own set is kept)
//   E0     no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases, steps: []};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ var e = $(id); return e ? e.value : null; }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){ var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(500); }
  function solveRowText(key){ var r = T.solveRow(key); return {dt: txt(r.querySelector('.solve-dt')), ch: txt(r.querySelector('.solve-ch'))}; }
  function shiftList(){ return qa('#pop-shift [data-shift-list] .solve-row[data-key]').map(function (r) {
    var cb = r.querySelector('input[type=checkbox]'); return r.getAttribute('data-key') + (cb && cb.checked ? '+' : '-'); }); }
  function shiftCount(){ return txt(q('#pop-shift [data-shift-count]')); }
  async function openSolve(){ T.closePops(); await T.sleep(150); $('pop-solve-btn').click();
    await T.until(function () { return T.solveRow('production').getBoundingClientRect().height > 0; }, 'Build Around', 60, 100); await T.sleep(300); }
  async function openShift(){ T.closePops(); await T.sleep(150); $('pop-shift-btn').click();
    await T.until(function () { return T.shiftRow('production').getBoundingClientRect().height > 0; }, 'Shift', 60, 100); await T.sleep(200); }
  async function undo(){ T.closePops(); await T.sleep(150); $('undo-btn').click(); await settled(); }
  // A drag by the title row (pointer events on the row, which the engine listens on), so the panel is the user's to
  // close: a click outside then leaves it open.
  async function dragAside(menu){
    var head = menu.querySelector('.tools-head'), r = head.getBoundingClientRect();
    var x0 = r.left + 60, y0 = r.top + r.height / 2;
    function ev(type, x, y){ head.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 7, clientX: x, clientY: y})); }
    ev('pointerdown', x0, y0); await T.sleep(30);
    ev('pointermove', x0 - 40, y0 + 40); await T.sleep(30);
    ev('pointerup', x0 - 40, y0 + 40); await T.sleep(80);
    head.click();   // the click a real drag ends in, on the row it was captured by
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="localization"]').length > 0; }, 'the calendar', 200, 100);
    await settled();
    var base = sig();

    // ---- A: Build Around keeps a typed date ----
    await openSolve();
    await T.solvePress('production', 'row');
    T.set('tool-solve-edge', 'start'); await T.sleep(150);
    T.set('tool-solve-date', '2026-09-07'); await T.sleep(500);
    var a0 = {date: val('tool-solve-date'), pin: val('tool-solve-phase'), row: solveRowText('production'), go: txt($('tool-solve-go'))};
    T.set('weeks-post', '18'); await settled();
    var a1 = {date: val('tool-solve-date'), pin: val('tool-solve-phase'), row: solveRowText('production'), go: txt($('tool-solve-go')), open: $('pop-solve').classList.contains('open')};
    add('A1', 'Build Around: a date typed for Production (9/7/26) is still in the box after Post\'s weeks change underneath',
      a0.date === '2026-09-07' && a1.open && a1.pin === 'production' && a1.date === '2026-09-07', {typed: a0, afterPostWeeks: a1}, '2026-09-07 kept');
    T.set('start-localization', '2027-04-05'); await settled();
    var a2 = {date: val('tool-solve-date'), row: solveRowText('production'), go: txt($('tool-solve-go'))};
    add('A2', 'Build Around: and after Localization\'s start changes underneath', a2.date === '2026-09-07', a2, '2026-09-07 kept');
    add('A3', 'Build Around: the Production row previews the typed date (9/7/26), not its current start',
      a2.row.dt === '9/7/26' && /^Pushed /.test(a2.row.ch), a2.row, '9/7/26, Pushed …');
    $('tool-solve-go').click(); await settled();
    var a4 = {prod: val('start-production'), msg: txt(q('#pop-solve [data-tools-msg]'))};
    add('A4', 'Build builds around the typed date: Production starts 9/7/26', a4.prod === '2026-09-07', a4, 'start-production 2026-09-07');
    // A new pin refills from the calendar, as before.
    await T.solvePress('post', 'row');
    var a5 = {pin: val('tool-solve-phase'), date: val('tool-solve-date'), post: val('start-post')};
    add('A5', 'a new pin refills the date from the calendar (Post\'s own start)', a5.pin === 'post' && a5.date === a5.post, a5, 'the date = start-post');
    T.set('tool-solve-date', '2027-01-04'); await T.sleep(300);
    T.set('tool-solve-edge', 'end'); await T.sleep(300);
    var a6 = {date: val('tool-solve-date')};
    add('A6', 'a new edge refills it too (ends by: Post\'s last workday, a Friday)', !!a6.date && a6.date !== '2027-01-04' && new Date(a6.date + 'T00:00:00Z').getUTCDay() === 5, a6, 'a Friday, not the typed 2027-01-04');
    T.set('tool-solve-edge', 'start'); await T.sleep(200);
    T.set('tool-solve-date', '2027-01-04'); await T.sleep(300);
    await openSolve();
    var a7 = {date: val('tool-solve-date'), pin: val('tool-solve-phase'), prod: val('start-production')};
    add('A7', 'reopened, the panel starts from the calendar again (the typed date is forgotten)', a7.date !== '2027-01-04' && a7.date === (a7.pin === 'production' ? a7.prod : val('start-' + a7.pin)), a7, 'the pin\'s own start');
    T.closePops();
    await undo(); await undo(); await undo();
    out.afterUndo = {prod: val('start-production'), post: val('weeks-post'), loc: val('start-localization')};
    add('AU', 'Undo x3 brings the fixture back', sig() === base, out.afterUndo, 'the base grid');

    // ---- D: Shift To a date keeps a typed date ----
    await openShift();
    var far = q('#pop-shift [data-far="date"]'); far.click(); await T.sleep(200);
    T.pickSelect('tool-anchor-phase', 'production'); await T.sleep(150);
    T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    T.set('tool-anchor-date', '2026-09-14'); await T.sleep(400);
    T.set('weeks-localization', '9'); await settled();
    var d1 = {date: val('tool-anchor-date'), phase: val('tool-anchor-phase'), open: $('pop-shift').classList.contains('open')};
    add('D1', 'Shift, To a date: Production\'s typed 9/14/26 is still in the box after Localization\'s weeks change underneath',
      d1.open && d1.phase === 'production' && d1.date === '2026-09-14', d1, '2026-09-14 kept');
    $('tool-anchor-go').click(); await settled();
    var d2 = {prod: val('start-production'), msg: txt(q('#pop-shift [data-tools-msg]'))};
    add('D2', 'Go lands Production on the typed date', d2.prod === '2026-09-14', d2, 'start-production 2026-09-14');
    T.closePops();
    if(d2.prod !== '2026-06-29') await undo();   // the Go, when it moved anything (it did not before the fix)
    await undo();
    add('DU', 'Undo x2 brings the fixture back', sig() === base, {prod: val('start-production'), loc: val('weeks-localization')}, 'the base grid');

    // ---- B: Shift ticks a phase that appears while every phase is ticked ----
    await openShift(); await dragAside($('pop-shift'));
    var b0 = {count: shiftCount(), list: shiftList(), floating: $('pop-shift').classList.contains('is-floating')};
    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom1'); }, 'custom row', 60, 100);
    T.set('name-custom1', 'VFX'); T.set('start-custom1', '2026-09-07'); T.set('weeks-custom1', '4'); await settled();
    var b1 = {count: shiftCount(), list: shiftList(), open: $('pop-shift').classList.contains('open')};
    add('B1', 'Shift with every phase ticked: VFX, dated while it is open, comes in ticked ("7 of 7 move")',
      b0.count === '6 of 6 move' && b1.open && b1.count === '7 of 7 move' && b1.list.indexOf('custom1+') >= 0, {before: b0, after: b1}, '7 of 7 move, custom1 ticked');
    var pre = {}; ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1'].forEach(function (k) { pre[k] = val('start-' + k); });
    T.set('tool-shift-weeks', '1'); $('tool-shift-later').click(); await settled();
    var post = {}; ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1'].forEach(function (k) { post[k] = val('start-' + k); });
    var b2msg = txt(q('#pop-shift [data-tools-msg]'));
    function plus7(iso){ var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); }
    var allMoved = Object.keys(pre).every(function (k) { return post[k] === plus7(pre[k]); });
    add('B2', '1 wk later moves every phase a week, VFX included (9/14/26)', allMoved && post.custom1 === '2026-09-14', {pre: pre, post: post}, 'every start + 7 days');
    add('B3', 'the line is the whole-calendar one: nothing "stayed where it was"', /^Shifted 1 week later\./.test(b2msg) && !/stayed/.test(b2msg) && !/ticked phase/.test(b2msg), b2msg, '"Shifted 1 week later. …" with no "stayed"');
    T.closePops();
    await undo();
    // A hand-picked set keeps a new phase out.
    await openShift(); await dragAside($('pop-shift'));
    await T.shiftPress('writersRoom', 'box');
    var b4a = {count: shiftCount()};
    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom2'); }, 'custom row 2', 60, 100);
    T.set('name-custom2', 'Music'); T.set('start-custom2', '2026-10-05'); T.set('weeks-custom2', '4'); await settled();
    var b4 = {count: shiftCount(), list: shiftList(), open: $('pop-shift').classList.contains('open')};
    add('B4', 'with Writer\'s Rm unticked (6 of 7), Music added while it is open comes in unticked ("6 of 8 move")',
      b4a.count === '6 of 7 move' && b4.open && b4.count === '6 of 8 move' && b4.list.indexOf('custom2-') >= 0 && b4.list.indexOf('writersRoom-') >= 0, {before: b4a, after: b4}, '6 of 8 move, custom2 unticked');
    T.closePops();
    add('E0', 'no console errors', T.appHealth().errors.length === 0, {errors: T.appHealth().errors, modal: T.modalText()}, 'none');
  } catch (err) { add('EX', 'the leg threw', false, String(err && err.stack || err).slice(0, 800), 'no exception'); }
  T.done(out);
})(); });
