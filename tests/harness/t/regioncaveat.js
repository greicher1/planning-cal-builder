// regioncaveat -- the notes box under the location picker: every region's warning and labelled notes
// (FIX-PLAN.md 4.13; AUDIT-REPORT N-9; owner ruling 30 Sep 2026, "all seven, from the generator"; and since
// 29 Oct 2026 the owner's "Add any and all notes to the yellowish notes box to be as transparent as possible per
// region", every line reviewed by the owner).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh regioncaveat 150
//
// tools/gen_holidays.py's BOX table writes REGION_CAVEATS (the warning) and REGION_NOTES (the rest) beside HOLIDAYS,
// and reflectRegionUI() draws them in #union-caveat: the warning first (.rc-warn), then the same labelled lines for
// every region (.rc-line): Source (with a link), Holidays, Added from the crew agreement (Canada's tagged days only),
// Weekend holidays, Last checked.
//
// Phrases, not whole sentences: the text lives in the generator, and this leg must not become a second copy of it.
// Each warning phrase is one only that region's warning contains.
//
//   N0  None: the box is hidden and empty
//   B1  every offered place (24 since Mexico, 29 Oct 2026) shows the box with Source, Holidays, Weekend holidays and
//       Last checked, in that order,
//       a Source link that is http(s) and opens in a new tab, and a "Last checked" date
//   W1  each place shows exactly its expected warning, or none (US, BC, Ontario, Alberta, Saskatchewan and the
//       Atlantic three show none since the owner's edits)
//   A1  "Added from the crew agreement" shows on New Brunswick, Nova Scotia, PEI and Newfoundland only
//   P2  Berlin's warning is its unverified crew clause, not Studio Babelsberg (gone 29 Oct 2026, owner)
//   P3  Brandenburg's option is hidden in both selects (not offered), yet selecting it keeps de-brandenburg, DE-BB,
//       and its own box
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function box(){
    var e = document.getElementById('union-caveat');
    var shown = !!e && e.style.display !== 'none' && getComputedStyle(e).display !== 'none';
    var warns = e ? [].slice.call(e.querySelectorAll('.rc-warn')).map(txt) : [];
    var labels = e ? [].slice.call(e.querySelectorAll('.rc-line .rc-label')).map(txt) : [];
    var a = e ? e.querySelector('.rc-line a') : null;
    return {shown: shown, text: txt(e), warns: warns, labels: labels,
            link: a ? {href: a.getAttribute('href'), target: a.target, rel: a.rel, text: txt(a)} : null};
  }
  async function place(key){ T.set('union-place', key); await T.sleep(400); return box(); }
  // place -> the phrase only its warning has, or null for no warning.
  var WARN = {
    'us-general': null, 'us-new-york': null,
    'ca-alberta': null, 'ca-bc': null, 'ca-manitoba': 'proclaimed', 'ca-new-brunswick': null,
    'ca-newfoundland': null, 'ca-nwt': 'NWT’s legal holidays', 'ca-nova-scotia': null,
    'ca-nunavut': 'Nunavut’s legal holidays', 'ca-ontario': null, 'ca-pei': null,
    'ca-quebec': 'Pick either Good Friday OR Easter Monday', 'ca-saskatchewan': null, 'ca-yukon': 'Yukon’s legal holidays',
    'uk-london': 'Band 4', 'uk-wales': 'Band 4', 'uk-scotland': 'Band 4', 'uk-belfast': 'Band 4',
    'de-berlin': 'Berlin’s legal holidays', 'au-melbourne': 'Melbourne Cup Day', 'eu-lithuania': 'moves working days',
    'eu-france': 'Alsace-Moselle', 'mx-mexico': 'Mexico’s legal holidays'
  };
  var ADDED = {'ca-new-brunswick': 1, 'ca-nova-scotia': 1, 'ca-pei': 1, 'ca-newfoundland': 1};
  var CORE = ['Source:', 'Holidays:', 'Weekend holidays:', 'Last checked:'];
  try {
    await T.appReady();
    await T.sleep(800);
    var offered = [].slice.call(document.querySelectorAll('#union-place option')).filter(function (o) { return o.value && !o.hidden; })
      .map(function (o) { return o.value; });

    var n0 = await place('');
    add('N0', 'None: the box is hidden and empty', !n0.shown && n0.text === '', n0, 'hidden, empty');

    var badB = [], badW = [], badA = [], seen = {};
    for (var i = 0; i < offered.length; i++) {
      var v = offered[i], b = await place(v);
      seen[v] = b;
      var core = b.labels.filter(function (l) { return CORE.indexOf(l) !== -1; });
      if (!b.shown || JSON.stringify(core) !== JSON.stringify(CORE) || !b.link || !/^https?:\/\//.test(b.link.href) ||
          b.link.target !== '_blank' || !/noopener/.test(b.link.rel) || !/Last checked: \d{1,2} [A-Z][a-z]{2} 20\d\d/.test(b.text)) {
        badB.push(v + ' ' + JSON.stringify({shown: b.shown, labels: b.labels, link: b.link}));
      }
      var w = WARN.hasOwnProperty(v) ? WARN[v] : 'UNLISTED';
      if (w === null ? b.warns.length !== 0 : (b.warns.length !== 1 || b.warns[0].indexOf(w) === -1)) badW.push(v + ' ' + JSON.stringify(b.warns));
      var hasAdded = b.labels.indexOf('Added from the crew agreement:') !== -1;
      if (hasAdded !== !!ADDED[v]) badA.push(v + ' added=' + hasAdded);
    }
    add('B1', 'every offered place shows Source (with a link), Holidays, Weekend holidays and Last checked, in order',
      badB.length === 0 && offered.length === 24, {bad: badB, offered: offered.length}, '24 places, all four lines and a link each');
    add('W1', 'each place shows exactly its own warning, or none', badW.length === 0 && Object.keys(WARN).length === offered.length, {bad: badW}, 'as WARN');
    add('A1', '"Added from the crew agreement" shows on New Brunswick, Nova Scotia, PEI and Newfoundland only', badA.length === 0, {bad: badA}, 'four places');

    var p2 = seen['de-berlin'] || {};
    add('P2', 'Berlin warns about its unverified crew clause, and nothing about Studio Babelsberg',
      (p2.warns || []).length === 1 && !/Babelsberg/i.test(p2.text || ''), p2, 'one warning, no Babelsberg');

    var p3b = await place('de-brandenburg');
    var p3 = {value: document.getElementById('union-place').value,
              resolves: txt(document.getElementById('union-resolves')),
              hidden: [].slice.call(document.querySelectorAll('#union-place option[value="de-brandenburg"], select.region-mirror option[value="de-brandenburg"]'))
                .map(function (o) { return o.hidden; }),
              warns: p3b.warns, labels: p3b.labels};
    add('P3', 'Brandenburg is hidden in both selects, yet a calendar on it keeps de-brandenburg, DE-BB and its own box',
      p3.value === 'de-brandenburg' && /DE-BB/.test(p3.resolves) && p3.hidden.length === 2 && p3.hidden.every(Boolean) &&
      p3.warns.length === 1 && /Brandenburg’s legal holidays/.test(p3.warns[0]) && p3.labels.indexOf('Source:') !== -1,
      p3, 'de-brandenburg, DE-BB, hidden twice, its own warning and notes');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  var errs = (window.__ERR || []).slice(0, 10);
  cases.push({id: 'E0', title: 'no console errors', pass: errs.length === 0, observed: errs});
  T.done({test: 'regioncaveat', cases: cases, err: errs});
})(); });
