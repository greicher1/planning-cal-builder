// swapsingleorders -- in Single Column Mode one phase cannot follow two years' swaps at once: the first one shows, the
// other pauses WITH A NOTICE, and the same swap stored twice says nothing (audit AUD2-058, owner decision D5 b).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_PORT=8861 HARNESS_STATE=swapsingle-orders ./run.sh swapsingleorders 200
//
// swapsingle-orders.sptcal (synthetic, from swap-holds): Pre-Prep / Prod Prep swapped in 2031 (saved before sides);
// Localization 2/2/32 x6 added; Post swapped left of Production in 2031 and Localization swapped left of Post in 2032;
// a hand-edited copy of the Pre-Prep / Prod Prep pair under 2032, the other way round; and a hand-made 2033 swap asking
// for Writer's Rm left of Prod Prep, which Single Column Mode shows anyway.
//   O0  year blocks: every year shows its own -- Prod Prep left of Pre-Prep, Post left of Production in 2031,
//       Localization left of Post in 2032; no notice
//   O1  Single Column on: Prod Prep still left (the 2031 swap comes first and the 2032 copy is quiet), Post left of
//       Production (2031), and Localization's 2032 swap paused: Post is right of it (as before the fix, silently)
//   O2  ...and the notice names Post, Localization, 2031 and 2032, in plain words, and nothing about Pre-Prep, Prod Prep
//       or Writer's Rm: the 2032 copy is the same swap, and the 2033 one's order holds anyway, so neither is counted (red before)
//   O3  ...the file is unchanged
//   O4  Single Column off: as O0, no notice
//   O5  no console error, no native alert
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
  // Per year, which of the two sits left in the weeks they share: '2031:post x6', or 'none'.
  function pair(a, b) {
    var o = {};
    qa('#table-wrap td.sheet-phase-cell[data-pkey]').forEach(function (td) { var k = td.dataset.pkey; if (k !== a && k !== b) return; (o[td.dataset.week] = o[td.dataset.week] || {})[k] = +td.dataset.own; });
    var by = {};
    Object.keys(o).sort().forEach(function (w) { if (!(a in o[w] && b in o[w])) return; var y = w.slice(0, 4); (by[y] = by[y] || []).push(o[w][a] < o[w][b] ? a : b); });
    return Object.keys(by).map(function (y) { var l = by[y]; return y + ':' + (l.every(function (x) { return x === l[0]; }) ? l[0] + ' x' + l.length : 'mixed ' + l.join(',')); }).join(' ') || 'none';
  }
  function notice() { var n = $('colswap-notice'); return n && !n.hidden ? (n.querySelector('.ln-text') || n).textContent.trim() : ''; }
  var ENGINE = /\b(slot|lane|stint|col|cols|block)\b/i;
  var written = [];
  var H = { name: 'swapsingleorders.sptcal', kind: 'file', queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (x) { return x === H; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'swapsingleorders.sptcal', {lastModified: 1}); },
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
    var r = {step: step, pp: pair('prePrep', 'prodPrep'), po: pair('post', 'production'), pl: pair('post', 'localization'), store: store(s), notice: notice()};
    out.log.push(r); return r;
  }
  async function single(on) {
    await T.openSettings('prefs'); var b = $('one-col-btn'); if (b.checked !== on) b.click();
    await T.until(function () { return $('one-col-btn').checked === on; }, 'single ' + on, 60, 100);
    await T.closeSettings(); await T.sleep(300);
  }
  try {
    await T.appReady(); await settle();
    var r0 = await R('open, year blocks');
    C('O0', 'year blocks: each year shows its own swap, no notice',
      r0.pp === '2031:prodPrep x3' && /^2031:post x\d+$/.test(r0.po) && /^2032:localization x\d+$/.test(r0.pl) && !r0.notice, r0,
      {pp: '2031:prodPrep x3', po: '2031:post xN', pl: '2032:localization xN', notice: ''});

    await single(true);
    var r1 = await R('Single Column on');
    C('O1', 'Single Column on: Prod Prep left (2031 first, the 2032 copy quiet), Post left of Production, Localization\'s 2032 swap paused',
      r1.pp === '2031:prodPrep x3' && r1.po === r0.po && /^2032:post x\d+$/.test(r1.pl), r1,
      {pp: '2031:prodPrep x3', po: r0.po, pl: '2032:post xN'});
    var n = r1.notice;
    C('O2', '...the notice names Post, Localization, 2031 and 2032 in plain words, and nothing about Pre-Prep',
      /Post/.test(n) && /Localization/.test(n) && /2031/.test(n) && /2032/.test(n) && /Single Column Mode/.test(n) && !/Pre-Prep|Prod Prep|Writer|affected/.test(n) && !ENGINE.test(n), n,
      'Column order paused for Post and Localization (their 2032 swap): ...');
    C('O3', '...the file is unchanged', r1.store === r0.store, {now: r1.store, opened: r0.store}, 'as opened');

    await single(false);
    var r4 = await R('Single Column off');
    C('O4', 'Single Column off: as opened, no notice', r4.pp === r0.pp && r4.po === r0.po && r4.pl === r0.pl && r4.store === r0.store && !r4.notice, r4, r0);

    C('O5', 'no console error, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0, {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts}, 'none');
  } catch (e) { C('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 600), 'no exception'); }
  T.done(out);
})(); });
