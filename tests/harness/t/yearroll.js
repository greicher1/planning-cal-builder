// yearroll -- TYPED HEADINGS, THEIR STYLES, HAND-SET WIDTHS AND HIDDEN NOTES COLUMNS FOLLOW A WHOLE-CALENDAR MOVE
// INTO ANOTHER YEAR (audit AUD2-052, the Nov 2026 audit's item 3.3).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh yearroll 400
//
// Five stores name a waterfall column by its YEAR BLOCK and position ("y2026:s0", "y2027:notes"): the typed headings
// and their splits, the headings' text styles, the dragged widths of both layouts, and the hidden Notes columns. A
// shift re-keyed only week-keyed stores, so rolling the season forward a year left all five on the old years: the
// 2027 block (now Writer's Room to Post) was headed with last year's "POST", and the bold red heading and its width
// stayed on 2026, which no longer exists. THE RULE NOW: when a whole-calendar move leaves the waterfall's year blocks
// exactly as they were, every one a whole number of years later (or earlier) with the same phases in the same
// columns, the five stores move by that many years (moveYearKeys). Any other whole-calendar move that changes the
// years leaves them, and the Shift line says so.
//
// THE CALENDAR: T.buildFixture() (two year blocks: 2026 one phase column, 2027 two), then through a saved file:
// headings 2026 "DEVELOPMENT + SHOOT" (bold, red), 2027 "POST" | "LOCALIZATION"; the 2026 phase column 30 wide; the
// 2027 Notes column hidden.
//   K0  as loaded: the headings, the width (161 px on screen) and the hidden column where they were typed
//   K1  Shift, every phase, By weeks 52 Later: the blocks are 2027 and 2028 with the same columns, so 2027 reads
//       "DEVELOPMENT + SHOOT" (styled) at 161 px and 2028 "POST" | "LOCALIZATION" with its Notes column hidden (red
//       before: 2027 read "POST", 2028 the default "2028", 92 px)
//   K2  ... the saved stores hold the new keys and no 2026 key
//   K3  ... and the line says nothing about headings (they moved)
//   K4  By weeks 52 Earlier: every store exactly as it was loaded
//   K5  By weeks 40 Later: the years become 2026, 2027 and 2028, not a whole-year move, so nothing moves and the line
//       says "The column headings, column widths and hidden Notes columns you set stayed on 2026 and 2027."
//   K6  Undo: as loaded
//   K7  By weeks 2 Later (the same years): nothing moves and the line says nothing about headings
//   E0  no console errors, no native alert
window.__T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: pass === true ? undefined : expected}); }
  function $(id){ return document.getElementById(id); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function q(s){ return document.querySelector(s); }
  function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function msg(){ return txt(q('#pop-shift [data-tools-msg]')); }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){
    var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(500);
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    return got.state;
  }
  function heads(){
    return qa('#table-wrap th.hdrrow-cell').map(function (th) {
      var st = th.getAttribute('style') || '';
      return th.getAttribute('data-hcol') + '=' + txt(th) + (/font-weight:700/.test(st) && /color:#c00000/.test(st) ? '[styled]' : '');
    });
  }
  function width(k){ var c = T.colList().filter(function (c) { return c.k === k; })[0]; return c ? Math.round(c.w) : null; }
  function stores(s){
    return {labels: s.headerRowLabels || {}, splits: s.headerRowSplits || [], heading: (s.textStyles || {}).heading || {},
            widths: s.colWidths || {}, hidden: s.hiddenNotesCols || []};
  }
  function J(o){ return JSON.stringify(o); }
  async function openShift(){ T.closePops(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(300); }
  async function shiftWeeks(n, dir){
    await openShift(); q('#pop-shift [data-far="weeks"]').click(); await T.sleep(150);
    T.set('tool-shift-weeks', String(n)); $(dir < 0 ? 'tool-shift-earlier' : 'tool-shift-later').click(); await settled();
    var m = msg(); T.closePops(); await T.sleep(150);
    return m;
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!q('table.sheet-table'); }, 'grid', 100, 100);
    await settled();
    await T.reloadWith(function (snap) {
      snap.headerRowLabels = {'y2026:s0': 'DEVELOPMENT + SHOOT', 'y2027:s0': 'POST', 'y2027:s1': 'LOCALIZATION'};
      snap.textStyles = Object.assign({}, snap.textStyles || {}, {heading: {'y2026:s0': {bold: true, color: '#c00000'}}});
      snap.colWidths = Object.assign({}, snap.colWidths || {}, {'y2026:s0': 30});
      snap.hiddenNotesCols = ['y2027:notes'];
    }, 'Harbor Yearroll');
    await settled();
    // A fresh backup to read the loaded stores from: one harmless edit, undone.
    T.set('show-version', 'x'); await T.sleep(200); var s0 = stores(await snap());
    T.set('show-version', ''); await T.sleep(200); s0 = stores(await snap());
    var h0 = heads(), w0 = width('y2026:s0');
    add('K0', 'as loaded: 2026 "DEVELOPMENT + SHOOT" styled at the dragged width, 2027 "POST" | "LOCALIZATION", 2027 Notes hidden',
      h0.indexOf('y2026:s0=DEVELOPMENT + SHOOT[styled]') >= 0 && h0.indexOf('y2027:s0=POST') >= 0 && h0.indexOf('y2027:s1=LOCALIZATION') >= 0
        && w0 > 150 && !T.colList().some(function (c) { return c.k === 'y2027:notes'; }) && T.colList().some(function (c) { return c.k === 'y2027:notesoff'; }),
      {heads: h0, w: w0, cols: T.colList().map(function (c) { return c.k; })}, 'as typed');

    var m1 = await shiftWeeks(52, 1);
    var h1 = heads(), w1 = width('y2027:s0');
    add('K1', 'By weeks 52 Later: 2027 reads "DEVELOPMENT + SHOOT" (styled) at the same width, 2028 "POST" | "LOCALIZATION" with its Notes column hidden',
      h1.indexOf('y2027:s0=DEVELOPMENT + SHOOT[styled]') >= 0 && h1.indexOf('y2028:s0=POST') >= 0 && h1.indexOf('y2028:s1=LOCALIZATION') >= 0
        && w1 === w0 && T.colList().some(function (c) { return c.k === 'y2028:notesoff'; }) && T.colList().some(function (c) { return c.k === 'y2027:notes'; }),
      {heads: h1, w: w1, cols: T.colList().map(function (c) { return c.k; })}, 'moved a year');
    var s1 = stores(await snap());
    var noOld = !/y2026/.test(J(s1));
    add('K2', 'the saved stores hold the 2027 / 2028 keys and no 2026 key',
      noOld && s1.labels['y2027:s0'] === 'DEVELOPMENT + SHOOT' && s1.labels['y2028:s1'] === 'LOCALIZATION' && J(s1.heading['y2027:s0']) === J(s0.heading['y2026:s0'])
        && s1.widths['y2027:s0'] === 30 && J(s1.hidden) === J(['y2028:notes']),
      s1, 'every key a year later');
    add('K3', 'the line says nothing about headings (they moved)', /^Shifted 52 /.test(m1) && !/stayed on 20/.test(m1), m1, 'no "stayed on"');

    await shiftWeeks(52, -1);
    var s2 = stores(await snap());
    add('K4', 'By weeks 52 Earlier: every store exactly as loaded, and the screen too', J(s2) === J(s0) && J(heads()) === J(h0),
      {s2: s2, heads: heads()}, s0);

    var m5 = await shiftWeeks(40, 1);
    var s5 = stores(await snap());
    var years5 = Array.from(new Set(T.colList().map(function (c) { return c.k.slice(0, 5); })));
    add('K5', 'By weeks 40 Later (years become 2026, 2027, 2028): nothing moves, and the line says so',
      J(s5) === J(s0) && /The column headings, column widths and hidden Notes columns you set stayed on 2026 and 2027\./.test(m5),
      {years: years5, msg: m5, same: J(s5) === J(s0)}, '"The column headings, column widths and hidden Notes columns you set stayed on 2026 and 2027."');
    T.closePops(); await T.sleep(150); $('undo-btn').click(); await settled();
    var s6 = stores(await snap());
    add('K6', 'Undo: as loaded', J(s6) === J(s0) && J(heads()) === J(h0), {heads: heads()}, 'as loaded');

    var m7 = await shiftWeeks(2, 1);
    add('K7', 'By weeks 2 (the same years): the line says nothing about headings', /^Shifted 2 /.test(m7) && !/stayed on 20/.test(m7), m7, 'no "stayed on"');

    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
      {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) {
    add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 800), 'no exception');
  }
  T.done({cases: cases});
})(); });
