// swapsingleshift -- in Single Column Mode a block swap holds when the calendar's first week crosses New Year (audit
// AUD2-058, owner decision D5 b: keep swapping, and a swap holds).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_PORT=8861 HARNESS_STATE=swap-holds ./run.sh swapsingleshift 200
//
// swap-holds.sptcal: Writer's Rm 1/6/31 x14, Pre-Prep 3/17/31 x6, Prod Prep 4/7/31 x14; the file swaps Prod Prep left
// of Pre-Prep, stored under the year 2031. Single Column Mode has ONE column block, labelled with the calendar's first
// year, and before the fix only that year's swaps were read: <- 1 wk (first week 12/30/30) or an earlier Writer's Rm
// put Pre-Prep back on the left, on screen, in Excel and in the PDF, with nothing said.
//   S0  Single Column on: Prod Prep left in the three weeks they share
//   S1  <- 1 wk (first week 12/30/30): Prod Prep still left                                       (red before)
//   S2  ...and in the workbook: Prod Prep wk 1 in the column left of Pre-Prep Wk 4                (red before)
//   S3  ...and in the waterfall PDF: Prod Prep wk 1 drawn left of Pre-Prep Wk 4                    (red before)
//   S4  1 wk -> (back to 1/6/31): still left, and the file still holds exactly the 2031 swap
//   S5  Writer's Rm typed 12/16/30: still left                                                    (red before)
//   S6  ...swap back with Swap Column there: Pre-Prep left, and the 2031 entries are DELETED (no 2030 copy written)
//                                                                                                  (red before)
//   S7  ...swap again: Prod Prep left, written under 2030, the first year then                    (red before)
//   S8  Writer's Rm back to 1/6/31 (first year 2031 again): that 2030 swap still shows
//   S9  no swap notice through any of it, no console error, no native alert
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
  // Which of the two sits left in every week they share: 'prodPrep x3', 'prePrep x3', 'mixed ...' or 'none'.
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
  function notice() { var n = $('colswap-notice'); return n && !n.hidden ? (n.querySelector('.ln-text') || n).textContent.trim() : ''; }
  var written = [];
  var H = { name: 'swapsingleshift.sptcal', kind: 'file', queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (x) { return x === H; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'swapsingleshift.sptcal', {lastModified: 1}); },
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
    var r = {step: step, first: (qa('#table-wrap td[data-week]')[0] || {dataset: {}}).dataset.week, left: leftOne(), store: store(s), notice: notice()};
    out.log.push(r); return r;
  }
  async function single(on) {
    await T.openSettings('prefs'); var b = $('one-col-btn'); if (b.checked !== on) b.click();
    await T.until(function () { return $('one-col-btn').checked === on; }, 'single ' + on, 60, 100);
    await T.closeSettings(); await T.sleep(300);
  }
  function cell(wk, key) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + wk + '"]'); }
  function firstCell(key) { return qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]').sort(function (a, b) { return a.dataset.week < b.dataset.week ? -1 : 1; })[0]; }
  // Hover a phase's cell, press its Swap Column button, then Alt+arrow toward `dir` (the knob's own key path).
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
    var r0open = await rec('open');
    await single(true);
    var r0 = await rec('Single Column on');
    C('S0', 'Single Column on: Prod Prep left of Pre-Prep in the three weeks they share', r0.left === 'prodPrep x3', r0, 'prodPrep x3');

    $('shift-back-btn').click(); await T.until(function () { return val('start-writersRoom') === '2030-12-30'; }, '<- 1 wk', 60, 100);
    var r1 = await rec('<- 1 wk');
    C('S1', '<- 1 wk (first week 12/30/30): Prod Prep still left', r1.left === 'prodPrep x3' && r1.first === '2030-12-30', r1, 'prodPrep x3, first week 2030-12-30');

    // The workbook, read back with the page's own ExcelJS: the row holding Prod Prep wk 1 and Pre-Prep Wk 4.
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await xb.arrayBuffer());
    var xrow = null;
    wb.worksheets[0].eachRow(function (row) {
      var at = {};
      row.eachCell({includeEmpty: false}, function (c, n) {
        var v = c.value;   // a date cell is a formula (=A11+7), whose .text throws on a missing result
        var s = v && typeof v === 'object' ? (v.richText ? v.richText.map(function (r) { return r.text; }).join('') : '') : String(v == null ? '' : v);
        at[s] = n;
      });
      if (at['Prod Prep wk 1'] && at['Pre-Prep Wk 4']) xrow = {prodPrep: at['Prod Prep wk 1'], prePrep: at['Pre-Prep Wk 4']};
    });
    C('S2', '...and in the workbook: Prod Prep wk 1 in the column left of Pre-Prep Wk 4', !!xrow && xrow.prodPrep < xrow.prePrep, xrow, 'prodPrep column < prePrep column');

    // The waterfall PDF: each text run's x from its Tm, the two labels on one row.
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    var u8 = new Uint8Array(await pb.arrayBuffer());
    var xs = {};
    (await T.pdfInflated(u8)).forEach(function (t) {
      var re = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm|\(((?:\\.|[^\\)])*)\)\s*Tj/g, m, x = 0, y = 0;
      while ((m = re.exec(t))) {
        if (m[1] !== undefined) { x = +m[1]; y = +m[2]; continue; }
        var s = m[3].replace(/\\(.)/g, '$1'); if (s === 'Prod Prep wk 1' || s === 'Pre-Prep Wk 4') xs[s] = {x: x, y: y};
      }
    });
    var pp = xs['Prod Prep wk 1'], pr = xs['Pre-Prep Wk 4'];
    C('S3', '...and in the waterfall PDF: Prod Prep wk 1 drawn left of Pre-Prep Wk 4 on the same row', !!pp && !!pr && Math.abs(pp.y - pr.y) < 1 && pp.x < pr.x, xs, 'Prod Prep x < Pre-Prep x');

    $('shift-fwd-btn').click(); await T.until(function () { return val('start-writersRoom') === '2031-01-06'; }, '1 wk ->', 60, 100);
    var r2 = await rec('1 wk ->');
    C('S4', '1 wk -> (back to 1/6/31): still left, and the file holds exactly the 2031 swap', r2.left === 'prodPrep x3' && r2.store === STORE0, r2, {left: 'prodPrep x3', store: STORE0});

    T.set('start-writersRoom', '2030-12-16');
    var r3 = await rec('Writers Rm 12/16/30');
    C('S5', 'Writer\'s Rm typed 12/16/30: still left, the store unchanged', r3.left === 'prodPrep x3' && r3.store === STORE0, r3, {left: 'prodPrep x3', store: STORE0});

    await swapColumn('prePrep', -1);
    var r4 = await rec('swap back in Single Column');
    C('S6', '...swap back with Swap Column: Pre-Prep left, and the 2031 entries are deleted (nothing written under 2030)', r4.left === 'prePrep x3' && r4.store === '', r4, {left: 'prePrep x3', store: ''});

    await swapColumn('prodPrep', -1);
    var r5 = await rec('swap again in Single Column');
    C('S7', '...swap again: Prod Prep left, written under 2030 (the first year then)', r5.left === 'prodPrep x3' && /^2030\|prePrep>prodPrep:false 2030\|prodPrep>prePrep:true$/.test(r5.store), r5, {left: 'prodPrep x3', store: '2030 entries'});

    T.set('start-writersRoom', '2031-01-06');
    var r6 = await rec('Writers Rm back to 1/6/31');
    C('S8', 'Writer\'s Rm back to 1/6/31 (first year 2031): the swap made under 2030 still shows', r6.left === 'prodPrep x3' && r6.first === '2031-01-06' && r6.store === r5.store, r6, {left: 'prodPrep x3', store: r5.store});

    var notices = out.log.map(function (r) { return r.notice; }).filter(Boolean);
    C('S9', 'no swap notice through any of it, no console error, no native alert', !notices.length && T.appHealth().errors.length === 0 && window.__alerts.length === 0,
      {notices: notices, errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts, opened: r0open}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
