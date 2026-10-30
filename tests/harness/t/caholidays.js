// caholidays -- Canada's holidays on the crew agreements: every province and territory, the agreement tag on the
// days the practical list does not have, and the one-time strip for a calendar saved before the change. A gate.sh
// AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh caholidays 400
//
// Owner, 29 Oct 2026 (CANADA-HOLIDAYS-PLAN.md): a "practical production list" of Canadian union holidays is the
// source of truth, plus Truth and Reconciliation and the five statutory days it lacked. Alberta, Manitoba and Nova
// Scotia move from provincial statute onto their crew agreements; Saskatchewan, New Brunswick, PEI, Newfoundland and
// the three territories are added; and the days the practical list does not have carry the agreement's name as a tag
// in the Holidays list (plan §6), never in the holiday's name.
//
// The calendar is built on the page: Show Info 35 x 8 = 280 shoot days from Mon 1 Dec 2025, so Production covers all
// of 2026 and every 2026 holiday is listed. Counts are of 2026's days, "(Observed)" twins aside.
//
//   C0  #union-place's Canada group: all thirteen provinces and territories, alphabetical, and no city (the owner
//       dropped Montreal, Toronto and Vancouver the same day: each was its province's list again)
//   C1  each Canadian place lists its 2026 days -- AB 12, MB 12, NS 12, SK 12, NB 12, PE 11, NL 11, YT 11, NT 11,
//       NU 11, and BC 11, ON 11, QC 8 unchanged -- including the days the change named
//   C2  the agreement tag is on exactly the eight days of plan §6 and nowhere else in Canada, reading the agreement,
//       with a title that says why (and "statutory" only on the four that are)
//   C3  Production skips a day on each new list: NB Remembrance Day (Wed 11 Nov), NS Victoria Day (Mon 18 May), NL
//       Regatta Day (Wed 5 Aug), Nunavut Day (Thu 9 Jul) each "Costs a shoot day"
//   C4  the notes box shows Manitoba's proclaimed days, Saskatchewan's IATSE 295 source, Regatta Day's weather, and
//       each territory's unread agreement
//   N1  an Alberta calendar saved WITH the holidayLists stamp loads with no strip
//   N2  the same calendar without it (saved before 29 Oct 2026) raises the strip, naming Alberta's three new days
//   N3  Save writes holidayLists: 2 on an Alberta calendar, and no such key on a BC one
//   N4  the strip's x records holidayFixNoticeSeen2, and loading the unstamped file again raises nothing
//   R1  a calendar saved with each dropped city loads on its province (ca-montreal -> ca-quebec, ca-toronto ->
//       ca-ontario, ca-vancouver -> ca-bc) with the city in Show info's Location; a typed Location wins
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'caholidays', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
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
  // Every 2026 row of the Holidays list, "(Observed)" twins aside: hid -> {tag, title, costs}.
  function rows2026() {
    var o = {};
    [].slice.call(document.querySelectorAll('#holiday-vis-list .hv-row')).forEach(function (r) {
      var en = r.querySelector('.hv-en');
      var hid = en ? en.getAttribute('data-hid') : '';
      if (hid.slice(-5) !== '@2026' || hid.indexOf('-observed') !== -1) return;
      var tag = r.querySelector('.hv-src');
      o[hid] = { tag: tag ? txt(tag) : null, title: tag ? tag.getAttribute('title') : null, costs: !!r.querySelector('.hv-shoot') };
    });
    return o;
  }
  async function place(v) { T.set('union-place', v); await settle(); }
  function caveat() { return txt(byId('union-caveat')); }
  function strip() {
    var e = byId('holiday-notice');
    return { shown: !!e && !e.hidden, text: e ? txt(e.querySelector('.ln-text')) : null };
  }

  var written = [], loads = 0;
  function menuLabel() { return txt(byId('file-menu-label')); }
  async function load(text) {
    var stem = 'caholidays-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || T.clickModalButton('Discard') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  async function save() {
    var n = written.length;
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(200);
    return JSON.parse(written[written.length - 1].text);
  }
  function withPlace(base, v, stamp) {
    var s = JSON.parse(base);
    s.fields.byId['union-place'] = { value: v };
    delete s.holidayLists;
    if (stamp !== undefined) s.holidayLists = stamp;
    return JSON.stringify(s);
  }

  // place -> [2026 days, the days the change named (hids without the year)]
  var LISTS = {
    'ca-alberta':       [12, ['heritage-day', 'national-day-for-truth-and-reconciliation', 'boxing-day', 'alberta-family-day']],
    'ca-manitoba':      [12, ['civic-holiday', 'remembrance-day', 'boxing-day', 'national-day-for-truth-and-reconciliation']],
    'ca-nova-scotia':   [12, ['victoria-day', 'natal-day', 'national-day-for-truth-and-reconciliation', 'thanksgiving',
                              'remembrance-day', 'boxing-day', 'nova-scotia-heritage-day']],
    'ca-saskatchewan':  [12, ['saskatchewan-day', 'national-day-for-truth-and-reconciliation', 'boxing-day']],
    'ca-new-brunswick': [12, ['new-brunswick-day', 'family-day', 'remembrance-day', 'boxing-day']],
    'ca-pei':           [11, ['islander-day', 'remembrance-day', 'national-day-for-truth-and-reconciliation']],
    'ca-newfoundland':  [11, ['memorial-day-canada-day', 'regatta-day', 'victoria-day', 'remembrance-day']],
    'ca-yukon':         [11, ['national-indigenous-peoples-day', 'discovery-day']],
    'ca-nwt':           [11, ['national-indigenous-peoples-day', 'civic-holiday']],
    'ca-nunavut':       [11, ['nunavut-day', 'civic-holiday', 'national-day-for-truth-and-reconciliation']],
    'ca-bc':            [11, ['b-c-day']],
    'ca-ontario':       [11, ['civic-holiday']],
    'ca-quebec':        [8,  ['f-te-nationale-st-jean-baptiste']]
  };
  // place -> {hid: [tag, statutory]} -- plan §6. Every other Canadian place: none.
  var TAGS = {
    'ca-new-brunswick': { 'family-day': ['IATSE 849', true], 'remembrance-day': ['IATSE 849', true] },
    'ca-nova-scotia':   { 'nova-scotia-heritage-day': ['IATSE 849', true], 'natal-day': ['IATSE 849', false] },
    'ca-pei':           { 'remembrance-day': ['IATSE 849', true] },
    'ca-newfoundland':  { 'victoria-day': ['IATSE 709', false], 'regatta-day': ['IATSE 709', false],
                          'remembrance-day': ['IATSE 709', true] }
  };

  try {
    await T.appReady();
    await T.sleep(600);
    T.set('show-title', 'Canada Lists');
    T.set('season-num', '1');
    T.set('shoot-days-per-ep', '8');
    T.set('num-episodes', '35');
    T.set('start-production', '2025-12-01');
    await place('ca-bc');

    await step('C0', async function () {
      var g = [].slice.call(byId('union-place').querySelectorAll('optgroup')).filter(function (x) { return x.label === 'Canada'; })[0];
      var vals = g ? [].slice.call(g.querySelectorAll('option')).map(function (o) { return o.value; }) : [];
      var want = ['ca-alberta', 'ca-bc', 'ca-manitoba', 'ca-new-brunswick',
                  'ca-newfoundland', 'ca-nwt', 'ca-nova-scotia', 'ca-nunavut', 'ca-ontario', 'ca-pei', 'ca-quebec',
                  'ca-saskatchewan', 'ca-yukon'];
      kase('C0', 'the Canada group offers all thirteen provinces and territories, alphabetical, and no city',
        JSON.stringify(vals) === JSON.stringify(want), { observed: vals, expected: want });
    });

    var seen = {};
    await step('C1', async function () {
      var bad = [], got = {};
      var keys = Object.keys(LISTS);
      for (var i = 0; i < keys.length; i++) {
        await place(keys[i]);
        var r = rows2026();
        seen[keys[i]] = r;
        var n = Object.keys(r).length;
        var missing = LISTS[keys[i]][1].filter(function (h) { return !r[h + '@2026']; });
        got[keys[i]] = n;
        if (n !== LISTS[keys[i]][0] || missing.length) bad.push(keys[i] + ': ' + n + ' days, missing ' + missing.join(','));
      }
      kase('C1', 'each Canadian place lists its 2026 days, including the days the change named', bad.length === 0,
        { bad: bad, counts: got });
    });

    await step('C2', async function () {
      var bad = [];
      Object.keys(seen).forEach(function (pl) {
        var r = seen[pl], want = TAGS[pl] || {};
        Object.keys(r).forEach(function (hid) {
          var h = hid.slice(0, -5), w = want[h], t = r[hid];
          if (!w) { if (t.tag) bad.push(pl + ' ' + h + ' tagged ' + t.tag); return; }
          var titleOk = !!t.title && t.title.indexOf('practical production list') !== -1 && t.title.indexOf(w[0]) !== -1 &&
                        (t.title.indexOf('statutory holiday here too') !== -1) === w[1];
          if (t.tag !== w[0] || !titleOk) bad.push(pl + ' ' + h + ' -> ' + JSON.stringify(t));
        });
        Object.keys(want).forEach(function (h) { if (!r[h + '@2026']) bad.push(pl + ' ' + h + ' not listed'); });
      });
      kase('C2', 'the agreement tag is on exactly the eight days of plan §6, with its title, and nowhere else in Canada',
        bad.length === 0 && Object.keys(seen).length === 13, { bad: bad });
    });

    await step('C3', async function () {
      var want = [['ca-new-brunswick', 'remembrance-day@2026'], ['ca-nova-scotia', 'victoria-day@2026'],
                  ['ca-newfoundland', 'regatta-day@2026'], ['ca-nunavut', 'nunavut-day@2026']];
      var got = want.map(function (w) { var r = (seen[w[0]] || {})[w[1]]; return w[0] + ' ' + w[1] + ': ' + (r ? r.costs : 'not listed'); });
      kase('C3', 'Production skips a day on each new list ("Costs a shoot day")',
        got.every(function (g) { return / true/.test(g); }), { observed: got });
    });

    await step('C4', async function () {
      // The owner's wording since 29 Oct 2026 (the notes box): Manitoba's warning, Saskatchewan's Source line (its
      // warning went), Regatta Day's weather, and each territory's warning.
      // Newfoundland's Regatta Day warning went too (owner, same day): its box names the IATSE 709 source instead.
      var want = [['ca-manitoba', 'proclaimed'], ['ca-saskatchewan', 'IATSE Local 295'], ['ca-newfoundland', 'IATSE Local 709'],
                  ['ca-yukon', 'BC and Yukon film unions'], ['ca-nwt', 'Teamsters 362'], ['ca-nunavut', 'No crew agreement was found']];
      var bad = [];
      for (var i = 0; i < want.length; i++) {
        await place(want[i][0]);
        if (caveat().indexOf(want[i][1]) === -1) bad.push(want[i][0] + ': ' + caveat());
      }
      kase('C4', 'the new caveats show under the picker', bad.length === 0, { bad: bad });
    });

    var base = await (await fetch('/tests/fixtures/customunits.sptcal')).text();

    await step('N1', async function () {
      await load(withPlace(base, 'ca-alberta', 2));
      var s = strip();
      kase('N1', 'an Alberta calendar saved with the holidayLists stamp loads with no strip',
        byId('union-place').value === 'ca-alberta' && !s.shown, { place: byId('union-place').value, strip: s });
    });

    await step('N2', async function () {
      await load(withPlace(base, 'ca-alberta'));
      var s = strip();
      kase('N2', 'the same calendar without the stamp raises the strip, naming Alberta\'s three new days',
        s.shown && s.text.indexOf('Alberta now follows') !== -1 && s.text.indexOf('Heritage Day') !== -1 &&
        s.text.indexOf('Boxing Day') !== -1 && s.text.indexOf('9 days, now 12') !== -1, { strip: s });
    });

    await step('N3', async function () {
      var ab = await save();
      await load(withPlace(base, 'ca-bc'));
      var bc = await save();
      kase('N3', 'Save stamps holidayLists: 2 on an Alberta calendar, and writes no such key on a BC one',
        ab.holidayLists === 2 && !('holidayLists' in bc) && bc.fields.byId['union-place'].value === 'ca-bc',
        { alberta: ab.holidayLists, bcHasKey: ('holidayLists' in bc) });
    });

    await step('N4', async function () {
      await load(withPlace(base, 'ca-alberta'));
      var before = strip();
      byId('holiday-notice').querySelector('.ln-x').click();
      await T.sleep(200);
      var prefs = {};
      try { prefs = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); } catch (e) {}
      await load(withPlace(base, 'ca-alberta'));
      var after = strip();
      kase('N4', 'the x records holidayFixNoticeSeen2, and loading the unstamped file again raises nothing',
        before.shown && prefs.holidayFixNoticeSeen2 === true && !after.shown,
        { before: before.shown, pref: prefs.holidayFixNoticeSeen2, after: after.shown });
    });

    await step('R1', async function () {
      var want = [['ca-montreal', 'ca-quebec', 'Montreal'], ['ca-toronto', 'ca-ontario', 'Toronto'], ['ca-vancouver', 'ca-bc', 'Vancouver']];
      var bad = [];
      for (var i = 0; i < want.length; i++) {
        await load(withPlace(base, want[i][0]));
        var got = [byId('union-place').value, (document.querySelector('select.region-mirror') || {}).value, byId('show-location').value];
        if (got[0] !== want[i][1] || got[1] !== want[i][1] || got[2] !== want[i][2]) bad.push(want[i][0] + ' -> ' + got.join(' / '));
      }
      var typed = JSON.parse(withPlace(base, 'ca-toronto'));
      typed.fields.byId['show-location'] = { value: 'Hamilton' };
      await load(JSON.stringify(typed));
      if (byId('union-place').value !== 'ca-ontario' || byId('show-location').value !== 'Hamilton') bad.push('typed: ' + byId('union-place').value + ' / ' + byId('show-location').value);
      kase('R1', 'each dropped city loads on its province with the city as the Location, and a typed Location wins', bad.length === 0, { bad: bad });
    });
  } catch (e) { kase('EX', 'harness', false, { observed: String(e && e.stack || e) }); }
  var errs = (window.__ERR || []).slice(0, 10);
  kase('E0', 'no console errors', errs.length === 0, { errors: errs });
  out.err = errs;
  T.done(out);
})(); });
