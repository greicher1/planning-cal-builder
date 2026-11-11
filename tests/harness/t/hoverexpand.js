// hoverexpand -- the hover prompt: "Expand?" over a blank beside a phase, "Pull back?" over what was widened
// (owner, 6 Nov 2026: "could the system recognise blank spaces ... draw a square around them on hover and ask Expand?",
// "It also needs the reverse to unexpand"; built 10 Nov 2026; FILL-INTENT-PLAN.md §11).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hover-expand ./run.sh hoverexpand 300
//
// hover-expand.sptcal (tools/layout-study/fixtures.mjs; stamped, no Sim Post): a 10-week custom "Test" with an empty
// column on its RIGHT in week 1 only, and on its LEFT in its last weeks, once Pre-Prep has ended. Every hover is a
// pointermove at real coordinates, dispatched on whatever is on top there, with no button held.
//   H0  the precondition: Test wk 1 has a blank on its right, and a run of weeks at the end has one on its left
//   H1  resting on the blank beside the middle week of that run: nothing before the delay; then ONE dashed box over
//       exactly the run, a faint outline on Test, the chip "Expand?" in the box's very centre (owner: "always sit in the
//       very center of the outlined box"), its title naming the weeks
//   H2  the chip's press, release and click: those weeks widen and NOTHING ELSE does -- Test wk 1 stays one wide (the
//       owner, on the first build: "it also expanded test wk 1"); the file carries one per-cell width per week and no
//       phaseFill; the press starts no selection; one undo step
//   H3  resting on a widened week: "Pull back?" in amber over the columns taken; the click clears the whole run; one
//       undo step
//   H4  Test wk 1 expanded, then rested on: it is the column's top cell, where the Swap Column button sits; the chip
//       "Pull back this week?" keeps 4px clear of the button, on the same row (owner, 10 Nov 2026: "ok except when these
//       buttons collide"); moving onto the chip neither closes the prompt nor moves the button; the click pulls it back
//   H5  the fill wish (a double-click on Test): resting on a widened cell offers "Pull back?", whose click turns the
//       wish off (the key leaves the file), one undo step
//   H6  never offered with cells highlighted, in the Month view, or on an unstamped calendar; a re-render takes it down
//   E0  no engine errors
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. H4 is red on the build before the step-aside (v3).
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  var txt = function (el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); };
  function $(id) { return document.getElementById(id); }
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
  }
  function testWk(n) {
    return [].find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return txt(td) === 'Test wk ' + n; }) || null;
  }
  function spans() { var o = []; for (var n = 1; n <= 10; n++) { var t = testWk(n); o.push(t ? t.colSpan : 0); } return o.join(''); }
  var isBlank = function (td) { return !!td && td.tagName === 'TD' && !td.hasAttribute('class') && !td.hasAttribute('style') && !txt(td); };
  function rect(el) { var r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }
  function R(el) { var r = rect(el); return [Math.round(r.l), Math.round(r.t), Math.round(r.r), Math.round(r.b)]; }
  function chip() { return document.querySelector('.grid-hover-layer .grid-hover-chip'); }
  function boxes() { return [].slice.call(document.querySelectorAll('.grid-hover-layer .grid-hover-rect')); }
  function swapBtn() { return document.querySelector('.grid-swap-layer .grid-stint-btn'); }
  function top(x, y) { return document.elementsFromPoint(x, y)[0] || null; }
  function moveAt(x, y) {
    var el = top(x, y);
    if (el) el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y,
      button: -1, buttons: 0, pointerId: 9, pointerType: 'mouse', isPrimary: true }));
    return el;
  }
  // Rest the pointer on a cell (fx of the way across it) and wait out the prompt's delay.
  async function rest(td, fx, wait) {
    td.scrollIntoView({ block: 'center' }); await T.sleep(120);
    var r = rect(td);
    moveAt(r.l + (r.r - r.l) * (fx === undefined ? 0.5 : fx), (r.t + r.b) / 2);
    await T.sleep(wait === undefined ? 450 : wait);
  }
  // The chip as a mouse uses it: press, release, click, each on the chip.
  async function press(el) {
    var r = rect(el), x = (r.l + r.r) / 2, y = (r.t + r.b) / 2;
    var o = function (b) { return { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: b, pointerId: 9, pointerType: 'mouse', isPrimary: true }; };
    el.dispatchEvent(new PointerEvent('pointerdown', o(1)));
    el.dispatchEvent(new PointerEvent('pointerup', o(0)));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, detail: 1 }));
    await T.sleep(250); await settle();
  }
  function selCount() { return document.querySelectorAll('.grid-sel-layer > *').length; }
  async function undo() { $('undo-btn').click(); await T.sleep(200); await settle(); }
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  // Save through a stood-in handle and read the file back (phasefill's pattern).
  var written = [];
  var saveHandle = { name: 'hoverexpand.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hoverexpand.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  async function load(url) {
    var stem = 'hoverexpand-load', name = stem + '.sptcal';
    var p = T.openViaFakePicker(url, name, { writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.sleep(400);
    if (!document.querySelector('#table-wrap table.sheet-table')) { $('view-sheet-btn').click(); await T.sleep(400); }
    try { await settle(); } catch (e) {
      out.loadDbg = { table: !!document.querySelector('#table-wrap table.sheet-table'), cells: document.querySelectorAll('#table-wrap td.sheet-phase-cell').length,
        menu: menuLabel(), modal: T.modalText ? T.modalText() : '', month: !!document.querySelector('#table-wrap .month-view'), err: (window.__ERR || []).slice(0, 3) };
      throw e;
    }
  }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    // ---- H0 ----
    var w1 = testWk(1), run = [];
    for (var n = 2; n <= 10; n++) { var t = testWk(n); if (t && isBlank(t.previousElementSibling)) run.push(n); }
    var runOk = run.length >= 2 && run.every(function (v, i) { return i === 0 || v === run[i - 1] + 1; }) && run[run.length - 1] === 10;
    C('H0', 'precondition: Test wk 1 has a blank on its right, and Test\'s last weeks (' + run.join(', ') + ') one on their left',
      !!w1 && isBlank(w1.nextElementSibling) && !isBlank(w1.previousElementSibling) && runOk && spans() === '1111111111',
      J({ w1R: !!w1 && isBlank(w1.nextElementSibling), run: run, spans: spans() }));
    var mid = testWk(run[Math.floor(run.length / 2)]), first = testWk(run[0]), last = testWk(run[run.length - 1]);
    // ---- H1 ----
    await rest(mid.previousElementSibling, 0.5, 100);
    var early = !!chip();
    await T.sleep(350);
    var c1 = chip(), bx = boxes(), ph = document.querySelectorAll('.grid-hover-layer .grid-hover-phase');
    var fr = rect(first.previousElementSibling), lr = rect(last.previousElementSibling);
    var b0 = bx[0] ? rect(bx[0]) : null, cr = c1 ? rect(c1) : null;
    var centred = !!(b0 && cr) && Math.abs((cr.l + cr.r) / 2 - (b0.l + b0.r) / 2) <= 1 && Math.abs((cr.t + cr.b) / 2 - (b0.t + b0.b) / 2) <= 1;
    C('H1', 'resting on the blank beside Test wk ' + run[Math.floor(run.length / 2)] + ': nothing before the delay, then one dashed box over exactly the ' + run.length + ' weeks, Test outlined, "Expand?" in the box\'s centre',
      !early && !!c1 && txt(c1) === 'Expand?' && bx.length === 1 && !bx[0].classList.contains('is-pull') && ph.length === 1 && centred
        && Math.abs(b0.t - fr.t) <= 1 && Math.abs(b0.b - lr.b) <= 1 && Math.abs(b0.l - fr.l) <= 1 && Math.abs(b0.r - fr.r) <= 1
        && /these \d+ weeks only/.test(c1.title) && c1.title.indexOf('these ' + run.length + ' weeks') !== -1,
      J({ early: early, chip: c1 && txt(c1), title: c1 && c1.title, boxes: bx.map(R), want: [Math.round(fr.l), Math.round(fr.t), Math.round(fr.r), Math.round(lr.b)], phase: ph.length, chipR: c1 && R(c1) }));
    // ---- H2 ----
    var runWeeks = run.map(function (k) { return testWk(k).dataset.week; });
    await press(c1);
    var sp = spans(), wantSp = '1111111111'.split('').map(function (d, i) { return run.indexOf(i + 1) !== -1 ? '2' : '1'; }).join('');
    var s1 = await save();
    var keys = Object.keys(s1.cellSpans || {}).sort();
    C('H2a', 'the click widens those weeks and nothing else: Test wk 1 stays one wide; the file has one per-cell width per week, no phaseFill; the press started no selection',
      sp === wantSp && J(keys) === J(runWeeks.map(function (w) { return w + '|custom1'; }).sort()) && !('phaseFill' in s1) && selCount() === 0 && !chip(),
      J({ spans: sp, want: wantSp, cellSpans: s1.cellSpans, phaseFill: s1.phaseFill, sel: selCount() }));
    await undo();
    C('H2b', 'one undo step puts every week back', spans() === '1111111111', spans());
    await rest(testWk(run[0]).previousElementSibling);
    if (chip()) await press(chip());
    // ---- H3 ----
    await rest(testWk(run[Math.floor(run.length / 2)]), 0.75);
    var c3 = chip(), b3 = boxes();
    C('H3a', 'resting on a widened week: "Pull back?" in amber over the columns it took, all ' + run.length + ' weeks in one box',
      !!c3 && txt(c3) === 'Pull back?' && c3.classList.contains('is-pull') && b3.length === 1 && b3[0].classList.contains('is-pull')
        && c3.title.indexOf('these ' + run.length + ' weeks') !== -1,
      J({ spansBefore: spans(), chip: c3 && txt(c3), title: c3 && c3.title, boxes: b3.map(R) }));
    if (c3) await press(c3);
    var s3 = await save();
    C('H3b', 'the click pulls the whole run back: every week one wide, no per-cell width left', spans() === '1111111111' && !Object.keys(s3.cellSpans || {}).length,
      J({ spans: spans(), cellSpans: s3.cellSpans }));
    await undo();
    C('H3c', 'one undo step: widened again', spans() === wantSp, spans());
    await undo();
    // ---- H4 ----
    await rest(testWk(1).nextElementSibling);
    var c4a = chip();
    C('H4a', 'the blank beside Test wk 1: "Expand?" for this week only', !!c4a && txt(c4a) === 'Expand?' && /this week only/.test(c4a.title), J(c4a && [txt(c4a), c4a.title]));
    if (c4a) await press(c4a);
    var t1 = testWk(1);
    await rest(t1, 0.25);
    var c4 = chip(), sb = swapBtn(), row = rect(t1);
    var k4 = c4 && rect(c4), q4 = sb && rect(sb);
    var clear = !!(k4 && q4) && (k4.r <= q4.l - 3.5 || k4.l >= q4.r + 3.5 || k4.b <= q4.t - 3.5 || k4.t >= q4.b + 3.5);
    C('H4b', 'resting on Test wk 1, the column\'s top cell: Swap Column is there, and "Pull back this week?" sits 4px clear of it on the same row',
      t1.colSpan === 2 && !!sb && !!c4 && txt(c4) === 'Pull back this week?' && clear && Math.abs((k4.t + k4.b) / 2 - (row.t + row.b) / 2) <= 1.5,
      J({ span: t1.colSpan, chip: c4 && R(c4), btn: sb && R(sb), row: R(t1) }));
    var btnAt = sb ? sb.style.left + ',' + sb.style.top : '';
    if (c4) {
      var cx = (k4.l + k4.r) / 2, cy = (k4.t + k4.b) / 2, sx = row.l + (row.r - row.l) * 0.25, lost = -1;
      for (var i = 0; i <= 20; i++) { moveAt(sx + (cx - sx) * i / 20, cy); await T.sleep(20); if (!chip()) { lost = i; break; } }
      var sb2 = swapBtn();
      C('H4c', 'the pointer travels from the cell onto the chip: the prompt stays up and Swap Column does not move',
        lost === -1 && !!sb2 && sb2.style.left + ',' + sb2.style.top === btnAt, J({ lost: lost, btn: sb2 && [sb2.style.left, sb2.style.top], was: btnAt }));
      await press(chip());
      C('H4d', 'the click pulls Test wk 1 back', spans() === '1111111111', spans());
    } else { C('H4c', 'the chip appeared', false, 'no chip'); }
    // ---- H5 ----
    testWk(3).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); await T.sleep(200); await settle();
    var sw = spans();
    await rest(testWk(run[0]), 0.75);
    var c5 = chip();
    C('H5a', 'with Test\'s fill wish on (' + sw + '): resting on a widened cell offers "Pull back?", turning the fill off',
      sw !== '1111111111' && !!c5 && txt(c5) === 'Pull back?' && /Turn off .*fill/.test(c5.title), J({ spans: sw, chip: c5 && [txt(c5), c5.title] }));
    if (c5) await press(c5);
    var s5 = await save();
    C('H5b', 'the click: back to the automatic layout, the phaseFill key gone from the file', spans() === '1111111111' && !('phaseFill' in s5), J({ spans: spans(), phaseFill: s5.phaseFill }));
    await undo();
    C('H5c', 'one undo step: filling again', spans() === sw, spans());
    await undo();
    // ---- H6 ----
    await rest(testWk(run[0]).previousElementSibling);
    var up = !!chip();
    T.set('weeks-production', '19'); await T.sleep(300); await settle();
    var gone = !chip();
    sb = null;
    var t2 = testWk(2); await rest(t2, 0.5, 150);
    sb = swapBtn();
    if (sb) { sb.click(); await T.sleep(200); }
    var selected = selCount() > 0;
    await rest(testWk(run[0]).previousElementSibling);
    var withSel = !!chip();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await T.sleep(150);
    $('view-month-btn').click(); await T.sleep(500);
    var mvTd = document.querySelector('#table-wrap td');
    if (mvTd) { var mr = rect(mvTd); moveAt((mr.l + mr.r) / 2, (mr.t + mr.b) / 2); }
    await T.sleep(450);
    var inMonth = !!document.querySelector('.grid-hover-chip');
    $('view-sheet-btn').click(); await T.sleep(500); await settle();
    await load('/tests/fixtures/anchorside.sptcal');
    var blank = [].find.call(document.querySelectorAll('#table-wrap table.sheet-table tbody td'), function (td) { return isBlank(td) && (td.previousElementSibling || {}).classList && td.previousElementSibling.classList.contains('sheet-phase-cell'); });
    if (blank) await rest(blank);
    var unstamped = !!chip();
    C('H6', 'a re-render takes the prompt down; never offered with cells highlighted, in the Month view, or on an unstamped calendar',
      up && gone && selected && !withSel && !inMonth && !!blank && !unstamped,
      J({ up: up, goneOnRender: gone, selected: selected, chipWithSel: withSel, chipInMonth: inMonth, unstampedBlank: !!blank, chipUnstamped: unstamped }));
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
