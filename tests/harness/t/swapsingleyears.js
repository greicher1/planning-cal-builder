// swapsingleyears -- Single Column Mode shows the block swaps of EVERY year, not only the calendar's first (audit
// AUD2-058, owner decision D5 b: keep swapping, and a swap holds).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_PORT=8861 HARNESS_STATE=stintswap-chained ./run.sh swapsingleyears 200
//
// stintswap-chained.sptcal: two block swaps saved before sides existed, Casting <-> Prod Prep in 2027 and Post <-> Pre Prep
// in 2028. Single Column Mode has ONE column block, labelled with the first week's year, and before the fix only that
// year's swaps were read: the 2028 one never showed there, and an earlier Writer's Rm (first week in 2026) lost the 2027
// one too.
//   Y0  year blocks: both swaps show (Casting left of Prod Prep in 2027, Pre Prep left of Post in 2028)
//   Y1  Single Column on: both still show                                                           (red before)
//   Y2  Single Column, Writer's Rm typed 12/28/26: both still show                                    (red before)
//   Y3  Writer's Rm back to 8/2/27
//   Y4  Swap Column on Post there swaps the 2028 swap BACK: Post left of Pre Prep, and the 2028 entries are deleted
//       (nothing written under 2027, the first year)                                              (red before)
//   Y5  one undo: Pre Prep left again                                                              (red before)
//   Y6  Single Column off: the year blocks exactly as they opened, and the store as it opened
//   Y7  no swap notice, no console error, no native alert
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
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  async function settle() {
    await T.until(function () { return qa('#table-wrap td.sheet-phase-cell').length > 5; }, 'grid', 200, 100);
    var last = '', st = 0;
    await T.until(function () { var s = JSON.stringify(T.gridSignature()); st = (s === last) ? st + 1 : 0; last = s; return st >= 3; }, 'settled', 200, 100);
  }
  // Per year, which of the two sits left in the weeks they share: '2027:custom1 x4', '2028:prePrep x1', 'none'.
  function pair(a, b) {
    var o = {};
    qa('#table-wrap td.sheet-phase-cell[data-pkey]').forEach(function (td) { var k = td.dataset.pkey; if (k !== a && k !== b) return; (o[td.dataset.week] = o[td.dataset.week] || {})[k] = +td.dataset.own; });
    var by = {};
    Object.keys(o).sort().forEach(function (w) { if (!(a in o[w] && b in o[w])) return; var y = w.slice(0, 4); (by[y] = by[y] || []).push(o[w][a] < o[w][b] ? a : b); });
    return Object.keys(by).map(function (y) { var l = by[y]; return y + ':' + (l.every(function (x) { return x === l[0]; }) ? l[0] + ' x' + l.length : 'mixed ' + l.join(',')); }).join(' ') || 'none';
  }
  function notice() { var n = $('colswap-notice'); return n && !n.hidden ? (n.querySelector('.ln-text') || n).textContent.trim() : ''; }
  var written = [];
  var H = { name: 'swapsingleyears.sptcal', kind: 'file', queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (x) { return x === H; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'swapsingleyears.sptcal', {lastModified: 1}); },
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
  async function R(step) {
    await settle(); var s = await save();
    var r = {step: step, cp: pair('custom1', 'prodPrep'), pp: pair('post', 'prePrep'), store: store(s), notice: notice()};
    out.log.push(r); return r;
  }
  async function single(on) {
    await T.openSettings('prefs'); var b = $('one-col-btn'); if (b.checked !== on) b.click();
    await T.until(function () { return $('one-col-btn').checked === on; }, 'single ' + on, 60, 100);
    await T.closeSettings(); await T.sleep(300);
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
  try {
    await T.appReady(); await settle();
    var r0 = await R('open, year blocks');
    C('Y0', 'year blocks: both swaps show', r0.cp === '2027:custom1 x4' && r0.pp === '2028:prePrep x1', r0, {cp: '2027:custom1 x4', pp: '2028:prePrep x1'});

    await single(true);
    var r1 = await R('Single Column on');
    C('Y1', 'Single Column on: both swaps still show (the 2028 one too)', r1.cp === '2027:custom1 x4' && r1.pp === '2028:prePrep x1' && r1.store === r0.store, r1, {cp: r0.cp, pp: r0.pp, store: r0.store});

    T.set('start-writersRoom', '2026-12-28');
    var r2 = await R('Single Column, Writers Rm 12/28/26');
    C('Y2', 'Single Column, Writer\'s Rm typed 12/28/26 (first week in 2026): both still show', r2.cp === '2027:custom1 x4' && r2.pp === '2028:prePrep x1' && r2.store === r0.store, r2, {cp: r0.cp, pp: r0.pp});

    T.set('start-writersRoom', '2027-08-02');
    var r3 = await R('Writers Rm back');
    C('Y3', 'Writer\'s Rm back to 8/2/27: as on Y1', r3.cp === r1.cp && r3.pp === r1.pp, r3, {cp: r1.cp, pp: r1.pp});

    await swapColumn('post', -1);
    var r4 = await R('Swap Column on Post');
    var want4 = r0.store.split(' ').filter(function (e) { return e.indexOf('2028|') !== 0; }).join(' ');
    C('Y4', 'Swap Column on Post swaps the 2028 swap back: Post left, the 2028 entries deleted, nothing written under 2027', r4.pp === '2028:post x1' && r4.cp === '2027:custom1 x4' && r4.store === want4, r4, {pp: '2028:post x1', store: want4});

    $('undo-btn').click(); await settle();
    var r5 = await R('undo');
    C('Y5', 'one undo: Pre Prep left again, the store as it opened', r5.pp === '2028:prePrep x1' && r5.store === r0.store, r5, {pp: '2028:prePrep x1', store: r0.store});

    await single(false);
    var r6 = await R('Single Column off');
    C('Y6', 'Single Column off: the year blocks exactly as they opened', r6.cp === r0.cp && r6.pp === r0.pp && r6.store === r0.store, r6, r0);

    var notices = out.log.map(function (r) { return r.notice; }).filter(Boolean);
    C('Y7', 'no swap notice, no console error, no native alert', !notices.length && T.appHealth().errors.length === 0 && window.__alerts.length === 0,
      {notices: notices, errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
