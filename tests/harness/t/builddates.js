// builddates -- Build Around places a custom phase whose length is given by DATES (audit AUD2-068, the Nov 2026 audit's
// item 3.2, 14 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh builddates 600
//
// Before: a Dates phase built before the pin ended the CALENDAR day before the next phase (a Sunday before a Monday) and
// kept its calendar span, so a Mon-Fri phase became Wed-Sun, its first two working days fell out of the waterfall, and
// the phase before it was built to end on the Tuesday. After the pin it started on the next weekday and kept its span,
// so a Mon-Fri phase became Tue-Sat. Now a Dates phase Build Around places keeps its number of WEEKDAYS (Mon-Fri): built
// before, it ends on the last weekday before the next phase and starts that many weekdays back; built after (or pinned),
// it starts where it is put and ends that many weekdays on. A Mon-Fri phase stays Mon-Fri; no end falls on a weekend.
//
// On T.buildFixture() (synthetic) plus two custom phases:
//   VFX    Dates, Mon 12/7/26 - Fri 1/15/27 (30 weekdays)
//   Music  Days 20, starts Mon 3/1/27
//   B1-B3  pin Music, ends by Fri 5/7/27, the starting ticks: Music 4/12/27; VFX Mon 3/1/27 - Fri 4/9/27; the phase
//          built before VFX ends by Fri 2/26/27
//   B4     one undo step
//   F1-F2  VFX re-typed Mon 5/3/27 - Fri 5/28/27 (20 weekdays); pin Music, starts on Mon 3/1/27: Music's last day is
//          Mon 3/29 (Good Friday 3/26 is a holiday), VFX starts Tue 3/30 and ends Mon 4/26 (20 weekdays), not Sat 4/24
//   P1-P2  VFX pinned itself, "starts on" Wed 2/3/27: ends Tue 3/16/27 (30 weekdays), not Sun 3/14; "ends by" Wed
//          2/24/27: ends on that Wednesday and starts Thu 1/14/27, not Sat 1/16
//   E0     no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases, steps: []};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ var e = $(id); return e ? e.value : null; }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function q(s){ return document.querySelector(s); }
  function sig(){ return JSON.stringify(T.gridSignature()); }
  async function settled(){ var last = '', same = 0;
    await T.until(function () { var s = sig(); same = (s === last && s.length > 2) ? same + 1 : 0; last = s; return same >= 3; }, 'settled', 200, 100);
    await T.sleep(500); }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization', 'custom1', 'custom2'];
  function dow(iso){ return iso ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(iso + 'T00:00:00Z').getUTCDay()] : ''; }
  function wrapIso(){ var m = txt($('meta-production')).match(/(\d+)\/(\d+)\/(\d+)\s*$/); if(!m) return null;
    return '20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); }
  function state(label){ var st = {label: label}; KEYS.forEach(function (k) { st[k] = val('start-' + k); });
    st.vfxEnd = val('end-custom1'); st.vfx = dow(st.custom1) + ' ' + st.custom1 + ' - ' + dow(st.vfxEnd) + ' ' + st.vfxEnd;
    st.musicMeta = txt($('unitmeta-custom2')); st.vfxMeta = txt($('unitmeta-custom1')); st.wrap = wrapIso();
    st.msg = txt(q('#pop-solve [data-tools-msg]')); out.steps.push(st); return st; }
  async function build(key, edge, date){
    T.closePops(); await T.sleep(150); $('pop-solve-btn').click();
    await T.until(function () { return T.solveRow('production').getBoundingClientRect().height > 0; }, 'Build Around', 60, 100);
    await T.sleep(300);
    await T.solvePress(key, 'row');
    T.set('tool-solve-edge', edge); await T.sleep(150); T.set('tool-solve-date', date); await T.sleep(500);
    out.steps.push({panel: key + ' ' + edge + ' ' + date, list: txt(q('#pop-solve [data-solve-list]')).slice(0, 400), left: txt(q('#pop-solve [data-solve-left]')), go: txt($('tool-solve-go'))});
    $('tool-solve-go').click(); await settled();
  }
  async function undo(){ T.closePops(); await T.sleep(150); $('undo-btn').click(); await settled(); }
  // The phase built just before VFX: the latest-starting phase that starts before it, of those the build moved.
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="localization"]').length > 0; }, 'the calendar', 200, 100);
    await settled();
    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom1'); }, 'custom1', 60, 100);
    T.set('name-custom1', 'VFX'); await T.pickSelect('unit-custom1', 'dates');
    T.set('start-custom1', '2026-12-07'); await T.sleep(200); T.set('end-custom1', '2027-01-15'); await settled();
    $('add-phase-btn').click(); await T.until(function () { return !!$('start-custom2'); }, 'custom2', 60, 100);
    T.set('name-custom2', 'Music'); await T.pickSelect('unit-custom2', 'days');
    T.set('start-custom2', '2027-03-01'); await T.sleep(200); T.set('days-custom2', '20'); await settled();
    var base = sig(), s0 = state('A0');

    // ---- B: built BEFORE the pin ----
    await build('custom2', 'end', '2027-05-07');
    var s1 = state('B Music ends by Fri 5/7/27');
    add('B1', 'Music (Days 20) ends by Fri 5/7/27: starts Mon 4/12/27', s1.custom2 === '2027-04-12', s1, 'start-custom2 2027-04-12');
    add('B2', 'VFX (Dates, Mon-Fri) is built before it as Mon 3/1/27 - Fri 4/9/27, its 30 weekdays kept',
      s1.custom1 === '2027-03-01' && s1.vfxEnd === '2027-04-09', s1.vfx, 'Mon 2027-03-01 - Fri 2027-04-09');
    // Whatever was built before VFX: its start moved, and it ends by Fri 2/26/27 (Production: its wrap).
    var before = KEYS.filter(function (k) { return k !== 'custom1' && k !== 'custom2' && s1[k] && s1[k] !== s0[k] && s1[k] < s1.custom1; });
    out.builtBefore = before;
    add('B3', 'the phase built before VFX ends by Fri 2/26/27 (not mid-week on Tue 3/2)',
      before.indexOf('production') >= 0 && !!s1.wrap && s1.wrap <= '2027-02-26' && s1.wrap >= '2027-02-22', {builtBefore: before, wrap: s1.wrap, prod: s1.production}, 'Production wraps by 2027-02-26');
    await undo();
    add('B4', 'one Undo brings it all back', sig() === base && val('start-custom1') === '2026-12-07' && val('end-custom1') === '2027-01-15', state('B undo'), 'the grid before');

    // ---- F: built AFTER the pin ----
    T.set('start-custom1', '2027-05-03'); await T.sleep(200); T.set('end-custom1', '2027-05-28'); await settled();
    var f0 = state('F0');
    await build('custom2', 'start', '2027-03-01');
    var f1 = state('F Music starts Mon 3/1/27');
    out.f1list = out.steps[out.steps.length - 2];
    add('F1', 'the scenario: Music (Days 20) from Mon 3/1/27 ends Mon 3/29/27 (Good Friday 3/26 off)', /Mon 3\/29\/27/.test(f1.musicMeta), f1.musicMeta, '… → Mon 3/29/27');
    add('F2', 'VFX (Dates, Mon-Fri, 20 weekdays) is built after it as Tue 3/30/27 - Mon 4/26/27, never ending on a Saturday',
      f1.custom1 === '2027-03-30' && f1.vfxEnd === '2027-04-26', {before: f0.vfx, after: f1.vfx}, 'Tue 2027-03-30 - Mon 2027-04-26');
    await undo();

    // ---- P: VFX pinned itself ----
    T.set('start-custom1', '2026-12-07'); await T.sleep(200); T.set('end-custom1', '2027-01-15'); await settled();
    var p0 = state('P0');
    await build('custom1', 'start', '2027-02-03');
    var p1 = state('P VFX starts on Wed 2/3/27');
    add('P1', 'VFX pinned to start Wed 2/3/27 keeps its 30 weekdays: ends Tue 3/16/27, not Sun 3/14/27',
      p0.vfx === 'Mon 2026-12-07 - Fri 2027-01-15' && p1.custom1 === '2027-02-03' && p1.vfxEnd === '2027-03-16', {before: p0.vfx, after: p1.vfx}, 'Wed 2027-02-03 - Tue 2027-03-16');
    await undo();
    var pu = state('P undo');
    await build('custom1', 'end', '2027-02-24');
    var p2 = state('P VFX ends by Wed 2/24/27');
    add('P2', 'VFX pinned to end by Wed 2/24/27 ends on it and starts Thu 1/14/27 (30 weekdays), not Sat 1/16/27',
      pu.vfx === 'Mon 2026-12-07 - Fri 2027-01-15' && p2.vfxEnd === '2027-02-24' && p2.custom1 === '2027-01-14', {before: pu.vfx, after: p2.vfx}, 'Thu 2027-01-14 - Wed 2027-02-24');
    await undo();
    T.closePops();
    add('E0', 'no console errors', T.appHealth().errors.length === 0, {errors: T.appHealth().errors, modal: T.modalText()}, 'none');
  } catch (err) { add('EX', 'the leg threw', false, String(err && err.stack || err).slice(0, 800), 'no exception'); }
  T.done(out);
})(); });
