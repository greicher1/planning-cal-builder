// mxholidays -- Mexico as a Production Region: its legal holidays, the dated ones, and its notes box. A gate.sh
// AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh mxholidays 300
//
// Owner, 29 Oct 2026: "Can we add Mexico City", then "As "Mexico"" with the warning "These are Mexico's legal holidays
// but please confirm before locking dates." The list is the Ley Federal del Trabajo's Art. 74 (seven a year), plus the
// days it names without a date: the federal election Sundays (2027, 2030) and the presidential inauguration (1 Oct 2030).
// No weekend holiday moves (observance "none"). The film crew union's agreement was not found, hence the warning.
//
// The calendar is built on the page: Show Info 35 x 8 = 280 shoot days from Mon 3 Dec 2029, so Production covers all
// of 2030.
//
//   M0  both Region selects offer a "Latin America" group holding exactly mx-mexico, "Mexico"
//   M1  2030 lists exactly Art. 74's seven days, the election Sunday (2 Jun) and the inauguration (1 Oct): nine
//   M2  nothing is "(Observed)": a weekend holiday is not moved
//   M3  the inauguration (Tue 1 Oct 2030) costs a shoot day; the election (Sun 2 Jun 2030) does not
//   M4  the notes box: the owner's warning word for word, the Labour Law as Source with a diputados.gob.mx link,
//       and "stay put" for weekend holidays
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'mxholidays', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function byId(id) { return document.getElementById(id); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function rows(year) {
    var o = {};
    [].slice.call(document.querySelectorAll('#holiday-vis-list .hv-row')).forEach(function (r) {
      var en = r.querySelector('.hv-en'), hid = en ? en.getAttribute('data-hid') : '';
      if (hid.slice(-5) !== '@' + year) return;
      o[hid.slice(0, -5)] = { costs: !!r.querySelector('.hv-shoot') };
    });
    return o;
  }
  try {
    await T.appReady();
    await T.sleep(600);
    T.set('show-title', 'Mexico List');
    T.set('season-num', '1');
    T.set('shoot-days-per-ep', '8');
    T.set('num-episodes', '35');
    T.set('start-production', '2029-12-03');
    T.set('union-place', 'mx-mexico');
    await settle();

    var groups = [byId('union-place'), document.querySelector('select.region-mirror')].map(function (sel) {
      var g = sel ? [].slice.call(sel.querySelectorAll('optgroup')).filter(function (x) { return x.label === 'Latin America'; })[0] : null;
      return g ? [].slice.call(g.querySelectorAll('option')).map(function (o) { return o.value + '=' + txt(o); }) : null;
    });
    kase('M0', 'both selects offer "Latin America" with exactly mx-mexico "Mexico"',
      groups.every(function (g) { return JSON.stringify(g) === JSON.stringify(['mx-mexico=Mexico']); }), { observed: groups });

    var r = rows(2030), got = Object.keys(r).sort();
    var want = ['benito-ju-rezs-birthday', 'christmas-day', 'constitution-day', 'federal-election-day', 'independence-day',
                'labour-day', 'new-years-day', 'presidential-inauguration', 'revolution-day'];
    kase('M1', '2030 lists Art. 74\'s seven days, the election Sunday and the inauguration: nine',
      JSON.stringify(got) === JSON.stringify(want), { observed: got, expected: want });

    var observed = [].slice.call(document.querySelectorAll('#holiday-vis-list .hv-en')).map(function (e) { return e.getAttribute('data-hid'); })
      .filter(function (h) { return h.indexOf('-observed') !== -1; });
    kase('M2', 'nothing is "(Observed)": a weekend holiday is not moved', observed.length === 0, { observed: observed });

    var inaug = r['presidential-inauguration'], elect = r['federal-election-day'];
    kase('M3', 'the inauguration (Tue 1 Oct 2030) costs a shoot day; the election (Sun 2 Jun 2030) does not',
      !!inaug && inaug.costs === true && !!elect && elect.costs === false, { inauguration: inaug, election: elect });

    var cav = byId('union-caveat');
    var warns = cav ? [].slice.call(cav.querySelectorAll('.rc-warn')).map(txt) : [];
    var a = cav ? cav.querySelector('.rc-line a') : null;
    var boxText = txt(cav);
    kase('M4', 'the notes box: the owner\'s warning, the Labour Law as Source with its link, weekend holidays stay put',
      warns.length === 1 && warns[0].indexOf('These are Mexico’s legal holidays but please confirm before locking dates.') !== -1 &&
      /Ley Federal del Trabajo/.test(boxText) && !!a && /diputados\.gob\.mx/.test(a.getAttribute('href')) &&
      /Weekend holidays: stay put\./.test(boxText), { warns: warns, link: a && a.getAttribute('href'), text: boxText });
  } catch (e) { kase('EX', 'harness', false, { observed: String(e && e.stack || e) }); }
  var errs = (window.__ERR || []).slice(0, 10);
  kase('E0', 'no console errors', errs.length === 0, { errors: errs });
  out.err = errs;
  T.done(out);
})(); });
