// swapnewphase -- a phase added into one of a block swap's two columns pauses the swap WITH A NOTICE, and Swap Column
// takes it along (audit AUD2-059; owner decision D5 b; the finding's default: say so, do not move the new phase).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_PORT=8861 HARNESS_STATE=swap-holds ./run.sh swapnewphase 300
//
// swap-holds.sptcal: Pre-Prep 3/17/31 x6, Prod Prep 4/7/31 x14 (they share 4/7-4/21), Prod Prep swapped to the left.
// A phase added after Pre-Prep ends lands in Pre-Prep's column inside Prod Prep's run, so the stored exchange would put
// two phases in one column: applyStintSwaps refuses it (the standing "a drifted store yields no change" rule) and,
// before the fix, nothing said so -- Pre-Prep was back on the left, the file still held the swap.
//   N0  opened: Prod Prep left, no notice
//   N1-N4  Scout added at 5/5, 5/19, 6/9, 4/28 (4 weeks): Pre-Prep left (the swap paused), the store unchanged, and the
//       notice names Pre-Prep, Prod Prep, Scout and the week, in plain words                        (red before)
//   N5  Scout's start cleared: Prod Prep left again, the notice gone
//   N6  Scout at 5/5 again, then Swap Column on Prod Prep (as the notice says): Prod Prep left, Scout goes right with
//       Pre-Prep, every cell kept, the notice gone, and the file names all three
//   N7  one undo: paused again, with the notice                                                     (red before)
//   N8  the month view hides the notice (a swap is the waterfall's); back in the waterfall it shows again
//                                                                                                  (red before)
//   N9  the notice's × hides it, and an unrelated edit does not bring the same message back
//   N10 Writer's Rm hidden in the waterfall (Scout cleared): the swap holds
//   N11 no console error, no native alert
//
// ⚠️ Run against the BUILD (HARNESS_PAGE=/dist/index.html).
try { var o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {}; delete o.hiatusRipple; localStorage.setItem('sptcal.prefs', JSON.stringify(o)); } catch (e) {}
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases, log: []};
  function C(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(i) { return document.getElementById(i); }
  function val(i) { var e = $(i); return e ? e.value : null; }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  async function settle() {
    await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 5; }, 'grid', 200, 100);
    var last = '', st = 0;
    await T.until(function () { var s = JSON.stringify(T.gridSignature()); st = (s === last) ? st + 1 : 0; last = s; return st >= 3; }, 'settled', 200, 100);
  }
  function leftOne() {
    var o = {};
    qa('#table-wrap td.sheet-phase-cell').forEach(function (td) {
      var k = td.dataset.pkey; if (k !== 'prePrep' && k !== 'prodPrep') return;
      (o[td.dataset.week] = o[td.dataset.week] || {})[k] = +td.dataset.own;
    });
    var sh = Object.keys(o).filter(function (w) { return 'prePrep' in o[w] && 'prodPrep' in o[w]; }).sort();
    if (!sh.length) return 'none';
    var who = sh.map(function (w) { return o[w].prodPrep < o[w].prePrep ? 'prodPrep' : 'prePrep'; });
    return who.every(function (x) { return x === who[0]; }) ? who[0] + ' x' + sh.length : 'mixed ' + who.join(',');
  }
  // Where Scout sits against Prod Prep in the weeks they share: 'right x4', 'left x4', 'none'.
  function scoutSide() {
    var o = {};
    qa('#table-wrap td.sheet-phase-cell').forEach(function (td) {
      var k = td.dataset.pkey; if (k !== 'custom1' && k !== 'prodPrep') return;
      (o[td.dataset.week] = o[td.dataset.week] || {})[k] = +td.dataset.own;
    });
    var sh = Object.keys(o).filter(function (w) { return 'custom1' in o[w] && 'prodPrep' in o[w]; }).sort();
    if (!sh.length) return 'none';
    var who = sh.map(function (w) { return o[w].custom1 > o[w].prodPrep ? 'right' : 'left'; });
    return who.every(function (x) { return x === who[0]; }) ? who[0] + ' x' + sh.length : 'mixed ' + who.join(',');
  }
  function weeksOf(key) { return qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]').length; }
  function notice() { var n = $('colswap-notice'); return n && !n.hidden ? (n.querySelector('.ln-text') || n).textContent.trim() : ''; }
  var ENGINE = /\b(slot|lane|stint|col|cols|block)\b/i;
  var written = [];
  var H = { name: 'swapnewphase.sptcal', kind: 'file', queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (x) { return x === H; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'swapnewphase.sptcal', {lastModified: 1}); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length; window.showSaveFilePicker = async function () { return H; };
    await T.sleep(800);
    await T.until(function () { return !$('save-file-btn').disabled; }, 'save btn', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'save write', 100, 100);
    return JSON.parse(written[written.length - 1]);
  }
  function store(s) { var g = s.gridStintSwaps || {}; return Object.keys(g).sort().map(function (k) { return k + '>' + g[k].with + ':' + g[k].left; }).join(' '); }
  async function rec(step) {
    await settle(); var s = await save();
    var r = {step: step, left: leftOne(), scout: scoutSide(), store: store(s), notice: notice()};
    out.log.push(r); return r;
  }
  function firstCell(key) { return qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]').sort(function (a, b) { return a.dataset.week < b.dataset.week ? -1 : 1; })[0]; }
  async function swapColumn(key, dir) {
    var td = firstCell(key);
    td.scrollIntoView({block: 'center'}); await T.sleep(150);
    var r = td.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    td.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', isPrimary: true}));
    var btn = function () { return document.querySelector('.grid-swap-layer .grid-stint-btn'); };
    await T.until(function () { return btn() && btn().dataset.pkey === key; }, 'the Swap Column button on ' + key, 40, 50);
    btn().click(); await T.sleep(80);
    await T.until(function () { return !!document.querySelector('.grid-swap-knob[data-dir="' + dir + '"]'); }, 'the knob', 120, 100);
    T.altSwap(dir); await T.sleep(600);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  }
  var STORE0 = '2031|prePrep>prodPrep:false 2031|prodPrep>prePrep:true';
  try {
    await T.appReady(); await settle();
    var r0 = await rec('open');
    C('N0', 'opened: Prod Prep left, no notice', r0.left === 'prodPrep x3' && !r0.notice && r0.store === STORE0, r0, {left: 'prodPrep x3', store: STORE0});

    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom1'); }, 'custom row', 60, 100);
    T.set('name-custom1', 'Scout');
    var dates = ['2031-05-05', '2031-05-19', '2031-06-09', '2031-04-28'], shows = ['5/5/31', '5/19/31', '6/9/31', '4/28/31'];
    for (var i = 0; i < dates.length; i++) {
      T.set('start-custom1', dates[i]); T.set('weeks-custom1', '4');
      var r = await rec('Scout ' + dates[i]);
      var n = r.notice;
      C('N' + (i + 1), 'Scout added at ' + shows[i] + ': the swap pauses (Pre-Prep left, store unchanged) and the notice names Pre-Prep, Prod Prep, Scout and ' + shows[i] + ' in plain words',
        r.left === 'prePrep x3' && r.store === STORE0 && /Pre-Prep/.test(n) && /Prod Prep/.test(n) && /Scout/.test(n) && n.indexOf(shows[i]) >= 0 && /Swap Column/.test(n) && !ENGINE.test(n),
        r, {left: 'prePrep x3', store: STORE0, notice: 'names the three phases and ' + shows[i]});
    }

    T.set('start-custom1', '');
    var r5 = await rec('Scout cleared');
    C('N5', 'Scout\'s start cleared: Prod Prep left again, the notice gone', r5.left === 'prodPrep x3' && !r5.notice, r5, {left: 'prodPrep x3', notice: ''});

    T.set('start-custom1', '2031-05-05'); T.set('weeks-custom1', '4');
    var r6a = await rec('Scout at 5/5 again');
    await swapColumn('prodPrep', -1);
    var r6 = await rec('Swap Column on Prod Prep');
    C('N6', 'Swap Column on Prod Prep takes Scout along: Prod Prep left, Scout right of it, every cell kept, no notice, the file names all three',
      r6a.left === 'prePrep x3' && r6.left === 'prodPrep x3' && r6.scout === 'right x4' && !r6.notice && weeksOf('prodPrep') === 14 && weeksOf('prePrep') === 6 && weeksOf('custom1') === 4
        && /2031\|custom1>prodPrep/.test(r6.store) && /2031\|prePrep>prodPrep/.test(r6.store) && /2031\|prodPrep>/.test(r6.store),
      {before: r6a, after: r6, weeks: {prodPrep: weeksOf('prodPrep'), prePrep: weeksOf('prePrep'), custom1: weeksOf('custom1')}}, {left: 'prodPrep x3', scout: 'right x4'});

    $('undo-btn').click(); await settle();
    var r7 = await rec('undo');
    C('N7', 'one undo: paused again, with the notice', r7.left === 'prePrep x3' && r7.store === STORE0 && /Scout/.test(r7.notice), r7, {left: 'prePrep x3', store: STORE0, notice: 'names Scout'});

    $('view-month-btn').click(); await T.sleep(600);
    var inMonth = notice();
    $('view-sheet-btn').click(); await settle();
    var backSheet = notice();
    C('N8', 'the month view hides the notice; back in the waterfall it shows again', !inMonth && /Scout/.test(backSheet), {inMonth: inMonth, backSheet: backSheet}, {inMonth: '', backSheet: 'names Scout'});

    var x = document.querySelector('#colswap-notice .ln-x'); if (x) x.click();
    await T.sleep(200);
    var afterX = notice();
    T.set('weeks-custom1', '3'); await settle(); await T.sleep(300);
    var afterEdit = notice();
    C('N9', 'the × hides the notice, and an edit that leaves the same message does not bring it back', !!x && !afterX && !afterEdit, {afterX: afterX, afterEdit: afterEdit}, {afterX: '', afterEdit: ''});

    T.set('start-custom1', ''); await settle();
    var cb = document.querySelector('.phase-hidewf-cb[data-key="writersRoom"]') || (function () { var row = $('start-writersRoom'); for (var nd = row; nd; nd = nd.parentElement) { var c = nd.querySelector && nd.querySelector('.phase-hidewf-cb'); if (c) return c; } return null; })();
    if (cb) {
      cb.click();
      var r10 = await rec('Writers Rm hidden');
      C('N10', 'Writer\'s Rm hidden in the waterfall: the swap holds, no notice', r10.left === 'prodPrep x3' && !r10.notice, r10, {left: 'prodPrep x3'});
      cb.click(); await settle();
    } else C('N10', 'the hide box was found', false, 'no .phase-hidewf-cb', 'found');

    C('N11', 'no console error, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
