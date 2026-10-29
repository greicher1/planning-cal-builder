// retiredplaces -- the US is two places now, and every calendar saved with one of the thirteen it had still opens
// on the same holidays. A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh retiredplaces 240
//
// Owner, 29 Oct 2026: "reduce the US list to just "U.S. Area Standards" and "New York"". The values of the twelve
// cities and states that went are in saved files (fields.byId['union-place']), and a <select> with no matching option
// coerces a value to '', so without RETIRED_PLACES (app.js) such a calendar would reopen with NO holidays and its
// shoot would move. Every one of them was a US-GEN place, so folding it into us-general moves no date; its name
// moves into Show info's Location, which the scenario band and Compare show, unless a Location was typed.
//
// Files are loaded through the real file menu (a fake picker). customunits.sptcal is a real file the app saved with
// us-atlanta and no Location; the other cases are that file's text with one value changed.
//
//   R0  both Region selects offer exactly two US places, us-general "U.S. Area Standards" and us-new-york "New York",
//       and none of the twelve retired values
//   R1  customunits.sptcal (us-atlanta, no Location): both selects show us-general, the Location reads "Atlanta",
//       and the place resolves to US-GEN
//   R2  ...and the grid is the one the same file draws with us-general written in it: no date moved
//   R3  Save writes union-place us-general and show-location "Atlanta"
//   R4  each of the twelve retired values loads as us-general with its own Location
//   R5  a typed Location wins over the place's name
//   R6  a two-scenario file: the current tab (us-new-york) is untouched; the parked tab (us-atlanta) opens as us-general
//       with Location "Atlanta" when switched to
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'retiredplaces', cases: [] };
  var RETIRED = {
    'us-atlanta': 'Atlanta', 'us-chicago': 'Chicago', 'us-florida': 'Florida', 'us-los-angeles': 'Los Angeles',
    'us-maryland': 'Maryland / DC', 'us-miami': 'Miami', 'us-new-mexico': 'New Mexico', 'us-new-orleans': 'New Orleans',
    'us-oahu': 'Oahu', 'us-pittsburgh': 'Pittsburgh', 'us-puerto-rico': 'Puerto Rico', 'us-san-francisco': 'San Francisco'
  };
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
  function region() { return (byId('union-place') || {}).value; }
  function mirror() { return (document.querySelector('select.region-mirror') || {}).value; }
  function loc() { return (byId('show-location') || {}).value; }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  var written = [];
  var loads = 0;
  function menuLabel() { return txt(byId('file-menu-label')); }
  async function load(text) {
    var stem = 'retired-load-' + (++loads), name = stem + '.sptcal';
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
  function withPlace(base, place, loc) {
    var s = JSON.parse(base);
    s.fields.byId['union-place'] = { value: place };
    if (loc !== undefined) s.fields.byId['show-location'] = { value: loc };
    return s;
  }

  try {
    await T.appReady();
    await settle();
    var base = await (await fetch('/tests/fixtures/customunits.sptcal')).text();

    await step('R0', async function () {
      function us(sel) {
        return [].slice.call(sel ? sel.querySelectorAll('option') : []).filter(function (o) { return /^us-/.test(o.value); })
          .map(function (o) { return o.value + '=' + o.textContent.trim(); });
      }
      var a = us(byId('union-place')), b = us(document.querySelector('select.region-mirror'));
      var want = ['us-general=U.S. Area Standards', 'us-new-york=New York'];
      kase('R0', 'both Region selects offer exactly U.S. Area Standards and New York in the US, and no retired place',
        JSON.stringify(a) === JSON.stringify(want) && JSON.stringify(b) === JSON.stringify(want), { settings: a, showInfo: b });
    });

    var grid1 = '';
    await step('R1', async function () {
      await load(base);
      grid1 = txt(byId('table-wrap'));
      kase('R1', 'customunits.sptcal (us-atlanta, no Location) opens as us-general in both selects, Location "Atlanta", resolving to US-GEN',
        region() === 'us-general' && mirror() === 'us-general' && loc() === 'Atlanta' && /US-GEN/.test(txt(byId('union-resolves'))),
        { settings: region(), showInfo: mirror(), location: loc(), resolves: txt(byId('union-resolves')) });
    });

    await step('R3', async function () {
      var s = await save();
      var b = s.fields.byId;
      kase('R3', 'Save writes union-place us-general and show-location "Atlanta"',
        b['union-place'].value === 'us-general' && b['show-location'].value === 'Atlanta',
        { place: b['union-place'], location: b['show-location'] });
    });

    await step('R2', async function () {
      await load(JSON.stringify(withPlace(base, 'us-general')));
      var grid2 = txt(byId('table-wrap'));
      kase('R2', 'the grid is the one the same file draws with us-general written in it: no date moved',
        grid1.length > 200 && grid1 === grid2 && loc() === '', { len1: grid1.length, len2: grid2.length, location: loc() });
    });

    await step('R4', async function () {
      var bad = [];
      var keys = Object.keys(RETIRED);
      for (var i = 0; i < keys.length; i++) {
        await load(JSON.stringify(withPlace(base, keys[i])));
        if (region() !== 'us-general' || mirror() !== 'us-general' || loc() !== RETIRED[keys[i]]) {
          bad.push(keys[i] + ' -> ' + region() + ' / ' + mirror() + ' / ' + loc());
        }
      }
      kase('R4', 'each of the twelve retired places loads as us-general with its own Location', bad.length === 0, { bad: bad });
    });

    await step('R5', async function () {
      await load(JSON.stringify(withPlace(base, 'us-miami', 'Coral Gables')));
      kase('R5', 'a typed Location wins over the place\'s name', region() === 'us-general' && loc() === 'Coral Gables',
        { settings: region(), location: loc() });
    });

    await step('R6', async function () {
      var parked = JSON.parse(base);
      var cur = withPlace(base, 'us-new-york');
      cur.version = 2;
      cur.scenarios = { current: 's1', counter: 2, tabs: [{ id: 's1', name: 'Plan A' }, { id: 's2', name: 'Plan B', snapshot: parked }] };
      await load(JSON.stringify(cur));
      var a = { settings: region(), location: loc() };
      var tabB = [].slice.call(document.querySelectorAll('.sc-tab')).filter(function (t) { return txt(t) === 'Plan B'; })[0];
      if (!tabB) throw new Error('no Plan B tab');
      tabB.click();
      await T.until(function () { return region() === 'us-general'; }, 'Plan B on screen', 60, 100);
      await settle();
      var b = { settings: region(), showInfo: mirror(), location: loc() };
      kase('R6', 'a two-scenario file: the current tab keeps us-new-york; the parked us-atlanta tab opens as us-general with Location "Atlanta"',
        a.settings === 'us-new-york' && a.location === '' && b.settings === 'us-general' && b.showInfo === 'us-general' && b.location === 'Atlanta',
        { planA: a, planB: b });
    });
  } catch (e) { kase('EX', 'harness', false, { observed: String(e && e.stack || e) }); }
  var errs = (window.__ERR || []).slice(0, 10);
  kase('E0', 'no console errors', errs.length === 0, { errors: errs });
  out.err = errs;
  T.done(out);
})(); });
