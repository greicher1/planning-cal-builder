// regioncaveat -- the caveat each holiday AGREEMENT carries shows under the location picker
// (FIX-PLAN.md 4.13; AUDIT-REPORT N-9; owner ruling 30 Sep 2026, "all seven, from the generator").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh regioncaveat 120
//
// tools/gen_holidays.py has always carried a caveat for seven agreements -- what their holiday list
// cannot express (Local 52's Juneteenth is inferred, not read; Quebec's employer picks Good Friday OR
// Easter Monday; Ontario's catch-all; the UK producer's bank-holiday option; Melbourne Cup's regional
// exception; Lithuania's working-day moves) -- but only holidays.json kept them, and none reached the
// app. The generator now emits REGION_CAVEATS beside HOLIDAYS, and reflectRegionUI() shows the
// place's own caveat and then its agreement's in #union-caveat.
//
// Phrases, not whole sentences: the text lives in the generator, and this leg must not become a
// second copy of it. Each phrase is one only that agreement's caveat contains.
//
//   P0  control: "Elsewhere in the U.S." (US-GEN, no caveat of either kind): hidden and empty
//   P1  control: Chicago's OWN caveat still shows, and nothing from an agreement (US-GEN has none)
//   A1..A10  every place that resolves to one of the seven agreements shows that agreement's line
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function caveat(){
    var e = document.getElementById('union-caveat');
    return {shown: !!e && e.style.display !== 'none' && getComputedStyle(e).display !== 'none',
            text: e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : null};
  }
  async function place(key){ T.set('union-place', key); await T.sleep(500); return caveat(); }
  var AGREEMENT_PHRASES = ['presence in Local 52 is inferred', 'add Easter Monday as a custom holiday',
    'ON4.02 ends in a catch-all', 'EXCEPT on Band 4 productions', 'Melbourne Cup Day applies statewide',
    'moves WORKING days around holidays'];
  function agreementLines(text){ return AGREEMENT_PHRASES.filter(function (ph) { return (text || '').indexOf(ph) >= 0; }); }
  var WANT = [
    ['A1', 'us-new-york', 'presence in Local 52 is inferred'],
    ['A2', 'ca-montreal', 'add Easter Monday as a custom holiday'],
    ['A3', 'ca-quebec', 'add Easter Monday as a custom holiday'],
    ['A4', 'ca-toronto', 'ON4.02 ends in a catch-all'],
    ['A5', 'ca-ontario', 'ON4.02 ends in a catch-all'],
    ['A6', 'uk-london', 'EXCEPT on Band 4 productions'],
    ['A7', 'uk-wales', 'EXCEPT on Band 4 productions'],
    ['A8', 'uk-belfast', 'EXCEPT on Band 4 productions'],
    ['A9', 'au-melbourne', 'Melbourne Cup Day applies statewide'],
    ['A10', 'eu-lithuania', 'moves WORKING days around holidays']
  ];
  try {
    await T.appReady();
    await T.sleep(800);
    var p0 = await place('us-general');
    add('P0', 'control: the general US list shows no caveat', !p0.shown && p0.text === '', p0, 'hidden, empty');
    var p1 = await place('us-chicago');
    add('P1', 'control: Chicago still shows its OWN caveat, and no agreement line',
      p1.shown && p1.text.indexOf('Area Standards proxy') >= 0 && agreementLines(p1.text).length === 0, p1, 'its own caveat only');
    for(var i = 0; i < WANT.length; i++){
      var w = WANT[i], got = await place(w[1]);
      add(w[0], w[1] + ' shows its agreement\'s caveat, and only that one',
        got.shown && got.text.indexOf(w[2]) >= 0 && agreementLines(got.text).length === 1, got, w[2]);
    }
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'regioncaveat', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
