// swapholds -- a block swap holds when one of its phases moves (owner, 6 Nov 2026: "so if you swap a column then move
// one of those column up, it should maintain the position its in"; FILL-INTENT-PLAN.md §8).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=swap-holds ./run.sh swapholds 400
//
// swap-holds.sptcal (tools/layout-study/fixtures.mjs): Pre-Prep 3/17 x6 and Prod Prep 4/7 x14 share three weeks, Pre-Prep
// left on its own; the file swaps them the way every build before 6 Nov 2026 saved a swap -- no side.
//   H1  it opens as it always did: Prod Prep left of Pre-Prep in the weeks they share
//   H2  the saved file now says which side each took: Prod Prep left, Pre-Prep right (the old swap written down)
//   H3  Prod Prep's ▲ five times (4/7 -> 3/3): Prod Prep stays left at every step. The old exchange flipped back on the
//       fourth (3/10), the week Prod Prep starts before Pre-Prep and the layout puts it left by itself
//   H4  a typed start, 2/24: still left
//   H5  a fresh swap with the knob (Pre-Prep's block, Alt+Left): Pre-Prep left, and the file records the new sides
//   H6  Prod Prep's ▼ twice: Pre-Prep stays left
//   H7  undo all the way back to H4's state is one step for the swap: Prod Prep left again
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. Red on the build before it at H2 and H3.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { cases: [] };
  function C(id, title, pass, observed, expected) { out.cases.push({ id: id, title: title, pass: !!pass, observed: observed, expected: expected }); }
  var J = function (x) { return JSON.stringify(x); };
  function $(id) { return document.getElementById(id); }
  async function settle() {
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell').length > 5; }, 'the grid', 200, 100);
    var last = '', stable = 0;
    await T.until(function () {
      var s = [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week + td.colSpan; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, 'a settled grid', 200, 100);
  }
  // Which of the two sits left in the weeks they share: 'prodPrep', 'prePrep', or 'none' (no shared week).
  function leftOne() {
    var o = {};
    document.querySelectorAll('#table-wrap td.sheet-phase-cell').forEach(function (td) {
      var k = td.dataset.pkey; if (k !== 'prePrep' && k !== 'prodPrep') return;
      (o[td.dataset.week] = o[td.dataset.week] || {})[k] = +td.dataset.own;
    });
    var shared = Object.keys(o).filter(function (w) { return 'prePrep' in o[w] && 'prodPrep' in o[w]; });
    if (!shared.length) return 'none';
    var who = shared.map(function (w) { return o[w].prodPrep < o[w].prePrep ? 'prodPrep' : 'prePrep'; });
    return who.every(function (x) { return x === who[0]; }) ? who[0] + ' x' + shared.length : 'mixed ' + who.join(',');
  }
  function upArrow(key, dir) {
    var n = $('start-' + key);
    for (var i = 0; i < 10 && n; i++) {
      n = n.parentElement; if (!n) break;
      var b = n.querySelectorAll('.ph-nudge-btn[data-nudge="' + dir + '"]');
      if (b.length === 1) return b[0]; if (b.length > 1) return null;
    }
    return null;
  }
  var written = [];
  var saveHandle = { name: 'swapholds.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'swapholds.sptcal', { lastModified: 1 }); },
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
  function sides(s) { var g = s.gridStintSwaps || {}; return { prePrep: (g['2031|prePrep'] || {}).left, prodPrep: (g['2031|prodPrep'] || {}).left }; }
  function cell(wk, key) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + wk + '"]'); }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
  function ptr(type, el, at) {
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y,
      button: 0, buttons: type === 'pointerup' || type === 'pointermove' ? 0 : 1, pointerId: 7, pointerType: 'mouse', isPrimary: true }));
  }
  async function hover(el) { var c = centre(el); ptr('pointermove', el, c); await T.sleep(80); }
  try {
    try { localStorage.clear(); } catch (e) {}
    await settle();
    C('H1', 'the old swap opens as it always did: Prod Prep left of Pre-Prep where they share weeks', leftOne() === 'prodPrep x3', leftOne(), 'prodPrep x3');
    var s1 = await save();
    C('H2', 'the saved file says which side each took: Prod Prep left, Pre-Prep right', J(sides(s1)) === J({ prePrep: false, prodPrep: true }), J(sides(s1)));
    var up = upArrow('prodPrep', -1), steps = [];
    for (var i = 0; i < 5 && up; i++) { up.click(); await T.sleep(250); await settle(); steps.push($('start-prodPrep').value + ' ' + leftOne()); }
    C('H3', 'Prod Prep up five weeks with its ▲ (4/7 -> 3/3): it stays left at every step, past Pre-Prep\'s start',
      !!up && steps.length === 5 && steps.every(function (x) { return / prodPrep x\d+$/.test(x); }) && /^2031-03-03 /.test(steps[4]), J(steps));
    T.set('start-prodPrep', '2031-02-24'); await settle();
    C('H4', 'a typed start, 2/24: still left', leftOne() === 'prodPrep x6', leftOne(), 'prodPrep x6');
    // H5: a fresh swap through the gesture. Pre-Prep's block button, then Alt+Left.
    var pp = cell('2031-03-24', 'prePrep');
    pp.scrollIntoView({ block: 'center' }); await T.sleep(150);
    var stintBtn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    await hover(pp);
    await T.until(function () { return stintBtn() && stintBtn().dataset.pkey === 'prePrep'; }, 'the Swap Column button on Pre-Prep', 40, 50);
    stintBtn().click(); await T.sleep(80);
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="-1"]'); }, 'the leftward knob', 120, 100);
    T.altSwap(-1);
    await T.until(function () { return leftOne() === 'prePrep x6'; }, 'the swap to land', 120, 100);
    await settle();
    var s5 = await save();
    C('H5', 'a fresh swap with the knob: Pre-Prep left, and the file records the new sides', leftOne() === 'prePrep x6' && J(sides(s5)) === J({ prePrep: true, prodPrep: false }),
      J({ left: leftOne(), sides: sides(s5) }));
    var down = upArrow('prodPrep', 1), steps2 = [];
    for (var j = 0; j < 2 && down; j++) { down.click(); await T.sleep(250); await settle(); steps2.push($('start-prodPrep').value + ' ' + leftOne()); }
    C('H6', 'Prod Prep down two weeks with its ▼: Pre-Prep stays left', !!down && steps2.length === 2 && steps2.every(function (x) { return / prePrep x\d+$/.test(x); }), J(steps2));
    $('undo-btn').click(); await settle();   // the ▼ burst is one step
    $('undo-btn').click(); await settle();   // the swap
    C('H7', 'undo the arrows, then the swap: Prod Prep left again (2/24)', leftOne() === 'prodPrep x6' && $('start-prodPrep').value === '2031-02-24', $('start-prodPrep').value + ' ' + leftOne());
    out.errors = (window.__ERR || []).slice(0, 6);
    C('E0', 'no engine errors', !out.errors.length, J(out.errors));
  } catch (e) {
    out.EX = e && (e.message || String(e));
    C('EX', 'the leg ran to the end', false, out.EX);
  }
  T.done(out);
})(); });
