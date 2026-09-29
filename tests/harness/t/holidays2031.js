// holidays2031 -- the holiday data covers 2024-2031, and a shoot outside it says so
// (FIX-PLAN.md 2.5; AUDIT-REPORT M-7; owner, 25 Sep 2026: "only go up to 2031").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh holidays2031 150
//
// On v1.3.0 HOLIDAYS stopped at 2030 in every region, so a shoot running into 2031 skipped no
// holidays: the wrap came out early and the Holidays card listed nothing, with no notice. The data is
// regenerated from rules for 2024-2031 (2026-2030 identical row for row); Juneteenth is kept out of
// 2024 because it joined the IATSE lists on 1 Jan 2025; and a shoot day outside the covered years
// raises a line on the Production row.
//
// Each case is built on the page (no fixture): Show Info 10 x 8 = 80 shoot days, US General, and
// Production is the only dated phase.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function hasHid(hid){ return !!document.querySelector('#holiday-vis-list [data-hid="' + hid + '"]'); }
  function note(){ return ((document.getElementById('prod-hol-note') || {}).textContent || '').trim(); }
  function meta(){ return ((document.getElementById('meta-production') || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  async function startProduction(iso){
    T.set('start-production', iso);
    await T.sleep(900);
  }
  try {
    await T.appReady();
    await T.sleep(600);
    T.set('show-title', 'Holiday Coverage');
    T.set('season-num', '2');
    T.set('shoot-days-per-ep', '8');
    T.set('num-episodes', '10');
    T.set('union-place', 'us-general');
    await T.sleep(600);

    // H1: a shoot from 10/7/30 runs into 2031 -- the 2031 holidays must be skipped and listed.
    await startProduction('2030-10-07');
    var h1 = {meta: meta(), ny31: hasHid('new-years-day@2031'), mlk31: hasHid('martin-luther-king-jr-day@2031'), note: note()};
    add('H1', 'a shoot running into 2031 skips (and lists) the 2031 holidays',
      h1.ny31 && h1.mlk31, h1, "New Year's Day and MLK Day 2031 listed");
    add('H1n', 'inside the covered years there is no coverage notice', h1.note === '', {note: h1.note}, '(empty)');

    // H2: 2024 -- the data now reaches back, and Juneteenth is NOT a 2024 holiday.
    await startProduction('2024-06-03');
    var h2 = {meta: meta(), jun24: hasHid('juneteenth@2024'), jul24: hasHid('independence-day@2024'), lab24: hasHid('labor-day@2024'), note: note()};
    add('H2', 'a 2024 shoot lists 2024 holidays (Independence Day, Labor Day) but not Juneteenth 2024',
      h2.jul24 && h2.lab24 && !h2.jun24, h2, 'Independence + Labor Day yes, Juneteenth no');
    await startProduction('2025-06-02');
    add('H3', 'a 2025 shoot lists Juneteenth 2025 (effective 1 Jan 2025)', hasHid('juneteenth@2025'), {jun25: hasHid('juneteenth@2025')}, 'listed');

    // H4: past the data -- a shoot from 10/6/31 runs into 2032.
    await startProduction('2031-10-06');
    var h4 = {meta: meta(), note: note()};
    add('H4', 'a shoot running past 2031 raises the coverage notice, naming the uncovered year',
      /2024.2031/.test(h4.note) && /2032/.test(h4.note) && /no holidays/i.test(h4.note), h4, '"... only known for 2024–2031 ... in 2032 skip no holidays ..."');

    // H5: no region -- nothing to cover, no notice.
    T.set('union-place', '');
    await T.sleep(900);
    add('H5', 'with no Production Region there is no coverage notice', note() === '', {note: note(), place: document.getElementById('union-place').value}, '(empty)');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'holidays2031', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
