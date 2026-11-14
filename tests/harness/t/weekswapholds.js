// weekswapholds -- a PART-COLUMN (per-week) swap holds when one of its two phases moves (audit AUD2-041, owner decision
// D5 b, 14 Nov 2026; the owner's ruling of 6 Nov 2026: "if you swap a column then move one of those column up, it
// should maintain the position its in"). Started from the audit's repro leg audit-s2-weekswap.js.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=colswap-widened ./run.sh weekswapholds 400
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=weekswap-apart  ./run.sh weekswapholds 200
//
// colswap-widened: Prod Prep 11/2/26 x6 with its first two weeks widened by hand, Post 11/16/26 x4. Swap Column on Post
// cannot move the whole column (the widened weeks), so its circle turns amber and swaps the four weeks the two share.
//   H0  the amber swap: Post left of Prod Prep in all four shared weeks
//   H1  Post's start typed a week earlier (11/9): Post left in EVERY week it shares with Prod Prep    (red before: 11/9)
//   H2  Post's ▲ once: the same                                                                         (red before)
//   H3  Prod Prep's ▼ once: the same                                                                    (red before)
//   H4  Shift, only Post ticked, one week earlier: the same                                            (red before)
//   H5  Ripple Hiatus on: an all-phase hiatus at 11/9 grown from 1 to 2 weeks pushes Post: the same    (red before)
//   H6  Post's start typed a week later: holds (it did before, and still does)
//   H7  undo of a move puts the dates and the swap back exactly (one step)
//   H8  Save after a move: the file holds the same {with} entries as ever, both sides, exactly the shared weeks
//   H9  a date typed through a value on the way (11/2, then 11/30): the swap is still there
// weekswap-apart: what a build before this fix saved after typing Post's start a week earlier -- the swap's eight
// entries on 11/16-12/7 and Post on 11/9 -- so it opens with Post in two columns.
//   A1  it opens EXACTLY as before: Prod Prep left on 11/9, Post left 11/16-11/30 (no file changes how it opens)
//   A2  Post's ▲ on it: the swap keeps only the weeks it held (it covered part of the overlap), so it does not grow
//
// ⚠️ Run against the BUILD (HARNESS_PAGE=/dist/index.html). Ripple Hiatus is ON in this leg (its key is deleted at the
// top, before the app reads its preferences, as hiatusripple does), for H5.
try { var o0 = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {}; delete o0.hiatusRipple; localStorage.setItem('sptcal.prefs', JSON.stringify(o0)); } catch (e) {}
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases, log: []};
  function C(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(i) { return document.getElementById(i); }
  function val(i) { var e = $(i); return e ? e.value : null; }
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'grid', 200, 100);
    var last = '', st = 0;
    await T.until(function () { var s = JSON.stringify(T.gridSignature()) + rows(); st = (s === last) ? st + 1 : 0; last = s; return st >= 3; }, 'settled', 200, 100);
  }
  function cell(wk, key) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + wk + '"]'); }
  // Which of the two is drawn on the LEFT in each week they share, read off the drawn boxes: 'post x4' when it is Post
  // in all four, 'mixed 11-09prod,11-16post,...' when it changes.
  function leftOne() {
    var o = {};
    document.querySelectorAll('#table-wrap td.sheet-phase-cell').forEach(function (td) {
      var k = td.dataset.pkey; if (k !== 'post' && k !== 'prodPrep') return;
      (o[td.dataset.week] = o[td.dataset.week] || {})[k] = td.getBoundingClientRect().left;
    });
    var sh = Object.keys(o).filter(function (w) { return 'post' in o[w] && 'prodPrep' in o[w]; }).sort();
    if (!sh.length) return 'none';
    var who = sh.map(function (w) { return o[w].prodPrep < o[w].post ? 'prodPrep' : 'post'; });
    return who.every(function (x) { return x === who[0]; }) ? who[0] + ' x' + sh.length
      : 'mixed ' + sh.map(function (w, i) { return w.slice(5) + who[i].slice(0, 4); }).join(',');
  }
  function rows() {
    var o = {};
    document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey]').forEach(function (td) {
      var k = td.dataset.pkey; if (k !== 'post' && k !== 'prodPrep') return;
      (o[td.dataset.week.slice(5)] = o[td.dataset.week.slice(5)] || []).push(k.slice(0, 4) + td.dataset.own + 's' + td.colSpan);
    });
    return Object.keys(o).sort().map(function (w) { return w + ':' + o[w].join(','); }).join(' ');
  }
  var written = [];
  var H = { name: 'weekswapholds.sptcal', kind: 'file', queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (x) { return x === H; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'weekswapholds.sptcal', {lastModified: 1}); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length; window.showSaveFilePicker = async function () { return H; };
    await T.sleep(600);
    await T.until(function () { return !$('save-file-btn').disabled; }, 'save btn', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'save write', 100, 100);
    return JSON.parse(written[written.length - 1]);
  }
  // The pair's entries in a saved file: {post: [weeks], prodPrep: [weeks]}, each sorted.
  function entries(s) {
    var g = s.gridColSwaps || {}, r = {post: [], prodPrep: [], other: 0};
    Object.keys(g).forEach(function (k) {
      var p = k.split('|'), v = g[k];
      if (p[1] === 'post' && v.with === 'prodPrep') r.post.push(p[0]);
      else if (p[1] === 'prodPrep' && v.with === 'post') r.prodPrep.push(p[0]);
      else r.other++;
      if (Object.keys(v).join() !== 'with') r.other++;
    });
    r.post.sort(); r.prodPrep.sort();
    return r;
  }
  function arrow(key, dir) {
    var n = $('start-' + key);
    for (var i = 0; i < 10 && n; i++) { n = n.parentElement; if (!n) break; var b = n.querySelectorAll('.ph-nudge-btn[data-nudge="' + dir + '"]'); if (b.length === 1) return b[0]; if (b.length > 1) return null; }
    return null;
  }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
  function ptr(type, el, at) { el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y, button: 0, buttons: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true})); }
  async function undoTo(test, label) { $('undo-btn').click(); await T.until(test, 'undo ' + label, 100, 100); await settle(); }
  async function snap(label) { await settle(); var r = {step: label, post: val('start-post') + ' x' + val('weeks-post'), prodPrep: val('start-prodPrep') + ' x' + val('weeks-prodPrep'), left: leftOne(), rows: rows()}; out.log.push(r); return r; }
  try {
    await T.appReady(); await settle();
    if (val('show-title') === 'Weekswap Apart Fixture') {
      var a1 = await snap('open');
      C('A1', 'a file saved with the swap\'s halves apart opens exactly as before: Prod Prep left on 11/9, Post left 11/16-11/30',
        a1.left === 'mixed 11-09prod,11-16post,11-23post,11-30post', a1, 'mixed 11-09prod,11-16post,11-23post,11-30post');
      var up0 = arrow('post', -1);
      up0.click(); await T.until(function () { return val('start-post') === '2026-11-02'; }, 'post up', 100, 100);
      var a2 = await snap('post up on the old file');
      C('A2', 'Post ▲ on it: the swap keeps the weeks it held, so it covers 11/16-11/23 and does not grow over the overlap',
        a2.left === 'mixed 11-02prod,11-09prod,11-16post,11-23post', a2, 'mixed 11-02prod,11-09prod,11-16post,11-23post');
    } else {
      cell('2026-11-30', 'prodPrep').scrollIntoView({block: 'center'}); await T.sleep(120);
      ptr('pointermove', cell('2026-11-23', 'post'), centre(cell('2026-11-23', 'post'))); await T.sleep(80);
      await T.until(function () { var b = document.querySelector('.grid-swap-layer .grid-stint-btn'); return b && b.dataset.pkey === 'post'; }, 'Swap Column on Post', 40, 50);
      document.querySelector('.grid-swap-layer .grid-stint-btn').click(); await T.sleep(80);
      await T.until(function () { return !!document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="-1"]'); }, 'the left circle', 120, 100);
      var amber = document.querySelector('.grid-swap-layer .grid-swap-knob[data-dir="-1"]').classList.contains('is-partial');
      T.altSwap(-1);
      await T.until(function () { return /^post/.test(leftOne()); }, 'the swap', 120, 100);
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
      var h0 = await snap('amber swap'); h0.amber = amber;
      C('H0', 'the amber swap: Post left of Prod Prep in all four shared weeks', amber && h0.left === 'post x4', h0, 'amber, post x4');

      T.set('start-post', '2026-11-09');
      var h1 = await snap('Post typed 11/9');
      C('H1', 'Post\'s start typed a week earlier: Post left in every week it shares with Prod Prep', h1.left === 'post x4', h1, 'post x4');
      await undoTo(function () { return val('start-post') === '2026-11-16'; }, 'H1');
      var h7 = await snap('undo H1');
      C('H7', 'one undo puts the date and the swap back exactly', h7.rows === h0.rows && h7.left === 'post x4', h7, h0.rows);

      var up = arrow('post', -1);
      up.click(); await T.until(function () { return val('start-post') === '2026-11-09'; }, 'Post up', 100, 100);
      var h2 = await snap('Post ▲');
      C('H2', 'Post\'s ▲ once: Post left in every week it shares with Prod Prep', h2.left === 'post x4', h2, 'post x4');
      var s2 = await save(), e2 = entries(s2);
      var shared = ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
      C('H8', 'the saved file holds the same {with} entries as ever: both sides, exactly the four weeks they share (11/9-11/30)',
        e2.other === 0 && JSON.stringify(e2.post) === JSON.stringify(shared) && JSON.stringify(e2.prodPrep) === JSON.stringify(shared),
        e2, 'post and prodPrep entries on 11/9-11/30, no other key or field');
      await T.sleep(1200);
      await undoTo(function () { return val('start-post') === '2026-11-16'; }, 'H2');

      var dn = arrow('prodPrep', 1);
      dn.click(); await T.until(function () { return val('start-prodPrep') === '2026-11-09'; }, 'Prod Prep down', 100, 100);
      var h3 = await snap('Prod Prep ▼');
      C('H3', 'Prod Prep\'s ▼ once: Post left in every week it shares with Prod Prep', h3.left === 'post x4', h3, 'post x4');
      await T.sleep(1200);
      await undoTo(function () { return val('start-prodPrep') === '2026-11-02'; }, 'H3');

      T.closePops(); $('pop-shift-btn').click();
      await T.until(function () { return T.shiftRow('post').getBoundingClientRect().height > 0; }, 'the Shift box', 60, 100);
      var all = document.querySelector('#pop-shift [data-shift-all]'); if (all && all.checked) all.click(); await T.sleep(100);
      await T.shiftPress('post', 'box'); await T.sleep(100);
      T.set('tool-shift-weeks', '1'); $('tool-shift-earlier').click();
      await T.until(function () { return val('start-post') === '2026-11-09'; }, 'Shift Post earlier', 100, 100);
      T.closePops();
      var h4 = await snap('Shift, Post alone, 1 wk earlier');
      C('H4', 'Shift with only Post ticked, one week earlier: Post left in every week it shares with Prod Prep', h4.left === 'post x4' && val('start-prodPrep') === '2026-11-02', h4, 'post x4');
      await undoTo(function () { return val('start-post') === '2026-11-16'; }, 'H4');

      T.addHiatus('2026-11-09', 1); await settle();
      var hr = Array.prototype.slice.call(document.querySelectorAll('#hiatus-list .hiatus-entry')), w = hr[hr.length - 1].querySelector('.hiatus-weeks');
      var pre = val('start-post');
      w.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(w, '2');
      w.dispatchEvent(new Event('input', {bubbles: true}));
      await T.sleep(1500);
      var h5 = await snap('ripple: hiatus 11/9 1 -> 2 wks'); h5.postMoved = pre + ' -> ' + val('start-post');
      C('H5', 'Ripple on: the all-phase hiatus at 11/9 grown to 2 weeks pushes Post; Post stays left wherever it shares a week with Prod Prep',
        /^post x\d+$/.test(h5.left) && val('start-post') !== pre, h5, 'post xN, Post moved');
      out.notice = ($('colswap-notice') && !$('colswap-notice').hidden) ? $('colswap-notice').textContent : '';
      // Back to the swapped calendar of H0 (each undo is one step; how many the hiatus took does not matter here).
      for (var u = 0; u < 6 && !(val('start-post') === '2026-11-16' && !document.querySelector('#hiatus-list .hiatus-entry .hiatus-start[value="2026-11-09"]') && leftOne() === 'post x4' && rows() === h0.rows); u++) {
        $('undo-btn').click(); await T.sleep(400); await settle();
      }
      T.set('start-post', '2026-11-23');
      var h6 = await snap('Post typed 11/23');
      C('H6', 'Post\'s start typed a week later: Post left in every week it shares with Prod Prep (held before too)', h6.left === 'post x3', h6, 'post x3');
      // Typing 30 over 23 in the day passes 03 (11/2) first. The swap must survive the half-typed date.
      T.set('start-post', '2026-11-02'); await settle();
      T.set('start-post', '2026-11-30');
      var h9 = await snap('Post typed 11/2, then 11/30');
      C('H9', 'a date typed through a value on the way (11/2, then 11/30): Post still left in the two weeks it shares', h9.left === 'post x2', h9, 'post x2');
    }
    C('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
