// loadsparse -- a calendar file that does not name a field or a store opens with that field's DEFAULT, never with
// what the calendar before it left in memory (audit AUD2-005, 13 Nov 2026; CLAUDE.md "Restore unconditionally").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=v=sixids ./run.sh loadsparse 240
//   v = nohiatus | badhiatus | sixkeys | sixids | bare | scen          (default sixids; gate.sh runs all six)
//
// Every file the app writes names every field, so none of this is reachable from the app's own saves: it takes a
// file written outside the app, repaired by hand or damaged, or a scenario tab that names only some fields. Before
// the fix such a file kept the previous calendar's all-phase hiatuses (which move the wrap date), its phase dates,
// Simultaneous Post, Production's own break, episodes, extra month lanes, legacy day-note colours, view and sidebar
// tab, and the next Save wrote the mix into the second file.
//
// One run, one file B, loaded twice through the real File > Load path (openViaFakePicker):
//   1. FRESH: B is the first file this window loads. Its fields, hiatus rows and Save text are the reference.
//   2. carry-heavy.sptcal (a calendar with almost every store in use: an unlocked "CARRY-BREAK" hiatus on 8/3/26,
//      Sim Post on, a Production break, 22 episodes, month view, the Phases tab), and then EVERY saved field on the
//      page is changed to some other value (straight onto the node, as a previous calendar would have left it),
//      so a field that has no default cannot hide behind a value two calendars happen to share.
//   3. B again. Everything must match step 1, to the byte in what Save writes.
// The files (B):
//   nohiatus   v1.13.0-saved.sptcal without fields.hiatuses          (opens with NO all-phase hiatus)
//   badhiatus  the same with fields.hiatuses: null                   (the sanitizer drops it: the same)
//   sixkeys    without fields.hiatuses, mvExtraLanes, dayNoteColors, episodeDefs, viewMode, sidebarTab
//   sixids     sparse-generated.sptcal: six field ids and one hiatus, the shape of a file a tool would write
//   bare       {"version":1,"fields":{"byId":{}}}: nothing named at all, so it must open as a NEW calendar's fields.
//              This is the guard for a field added later: with a wrong default, or none where it needs one, N1
//              goes red (mutation run, 13 Nov 2026: savedFieldDefault without its phiatus-weeks line, N1 red on the
//              six phiatus-weeks boxes); a field the defaults never reach stays changed, and B1 goes red as well.
//   scen       a two-tab file whose parked tab is sparse-generated's snapshot: flipping to it must show exactly what
//              that snapshot shows loaded alone in a fresh window
// Red on the build before the fix: B2 and B3 in every run, B1 wherever the file names fewer ids than the page has.
try{var o=JSON.parse(localStorage.getItem('sptcal.prefs')||'{}')||{};delete o.hiatusRipple;localStorage.setItem('sptcal.prefs',JSON.stringify(o));}catch(e){}
window.__T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], W = [];
  var V = (function () { var m = /[?&]v=([a-z]+)/.exec(location.search); return m ? m[1] : 'sixids'; })();
  var out = {test: 'loadsparse', v: V, cases: cases};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); progress(id); }
  function progress(step){ var r = document.getElementById('R'); if(r) r.textContent = 'pending ' + step + ' ' + JSON.stringify(cases.map(function(c){ return c.id + ':' + c.pass; })); }
  function label(){ return ((document.getElementById('file-menu-label') || {}).textContent || '').trim(); }
  // The same fields collectFieldValues() saves: every id'd control outside the four transient / preference panels.
  function swept(){
    return Array.prototype.filter.call(document.querySelectorAll('input[id], select[id], textarea[id]'), function (el) {
      return !el.closest('.tools-menu') && !el.closest('.prefs-card') && !el.closest('.export-pdf-dlg') && !el.closest('.compare-dlg');
    });
  }
  function fields(){ var m = {}; swept().forEach(function (el) { m[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value; }); return m; }
  function hiatusRows(){
    return Array.prototype.map.call(document.querySelectorAll('#hiatus-list .hiatus-entry'), function (r) {
      return (r.querySelector('.hiatus-start') || {}).value + '/' + (r.querySelector('.hiatus-weeks') || {}).value + '/' + ((r.querySelector('.hiatus-name') || {}).value || '');
    });
  }
  function metas(){ var m = {}; document.querySelectorAll('.phase-meta').forEach(function (e) { var t = e.textContent.replace(/\s+/g, ' ').trim(); if (t && e.id) m[e.id] = t.slice(0, 90); }); return m; }
  function view(){
    var tab = document.querySelector('.side-tab-btn.active');
    return {fields: fields(), hiatuses: hiatusRows(), metas: metas(),
      viewBtn: (document.querySelector('#view-month-btn.active') ? 'month' : document.querySelector('#view-sheet-btn.active') ? 'sheet' : '?'),
      sideTab: tab ? tab.dataset.tab : '?',
      episodeRows: document.querySelectorAll('#episode-list .episode-row, #episodes-list .episode-row, .episode-row').length,
      customRows: document.querySelectorAll('#custom-phase-rows .phase-row').length};
  }
  function diff(a, b){ var d = []; Object.keys(Object.assign({}, a, b)).sort().forEach(function (k) { if (a[k] !== b[k]) d.push(k + ': ' + JSON.stringify(a[k]) + ' -> ' + JSON.stringify(b[k])); }); return d; }
  async function settled(){ var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(150); var s = JSON.stringify(T.gridSignature()) + '|' + JSON.stringify(fields()); if (s === last) same++; else { same = 0; last = s; } } }
  async function load(text, name){
    progress('load ' + name);
    // One fixed file time per name: a file with no Date Last Edited stamp takes its file time, and B loaded twice
    // must be the same file both times (loadcarry's note).
    var p = T.openViaFakePicker('/x.sptcal', name, {text: text, writes: W, mtime: Date.UTC(2026, 9, 1, 15) + 86400000 * (name.length % 7)});
    for (var g = 0; g < 40; g++) { await T.sleep(100); if (/Load another calendar/.test(T.modalText())) { T.clickModalButton('Load'); break; } }
    await p;
    var stem = name.replace('.sptcal', '');
    try { await T.until(function () { return label().indexOf(stem) !== -1; }, 'loaded ' + name, 200, 100); }
    catch (e) { throw new Error(String(e) + ' | label=' + label() + ' | modal=' + T.modalText() + ' | errs=' + JSON.stringify(T.appHealth().errors.slice(0, 3))); }
    await settled();
  }
  async function saveText(){
    await T.sleep(700);
    var n = W.length;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', code: 'KeyS', metaKey: true, ctrlKey: true, bubbles: true}));
    await T.until(function () { return W.length > n; }, 'a Save write', 150, 100);
    await T.sleep(600);
    return W[W.length - 1].text;
  }
  // Every saved field on the page gets a value it does not hold, written straight onto the node: the state a
  // previous calendar leaves behind. No event, so nothing recomputes and nothing is asked.
  function perturbAll(){
    var n = 0;
    swept().forEach(function (el) {
      if (el.type === 'checkbox' || el.type === 'radio') { el.checked = !el.checked; n++; return; }
      if (el.tagName === 'SELECT') {
        var other = Array.prototype.filter.call(el.options, function (o) { return o.value !== el.value && !o.disabled; });
        if (other.length) { el.value = other[other.length - 1].value; n++; }
        return;
      }
      if (el.type === 'date') { el.value = el.value === '2031-03-03' ? '2031-03-04' : '2031-03-03'; n++; return; }
      if (el.type === 'number' || /^\d*$/.test(el.value)) { el.value = el.value === '7' ? '9' : '7'; n++; return; }
      el.value = el.value + ' ZZ-CARRY'; n++;
    });
    return n;
  }
  try {
    await T.appReady(); await T.sleep(800);
    var boot = view();                                  // a new calendar, before anything loads
    var ref = JSON.parse(await (await fetch('/tests/fixtures/v1.13.0-saved.sptcal')).text());
    var gen = await (await fetch('/tests/fixtures/sparse-generated.sptcal')).text();
    var heavy = await (await fetch('/tests/fixtures/carry-heavy.sptcal')).text();
    var s = ref, bText, wantHiatus = [];
    if (V === 'nohiatus') { delete s.fields.hiatuses; }
    if (V === 'badhiatus') { s.fields.hiatuses = null; }
    if (V === 'sixkeys') { delete s.fields.hiatuses; delete s.mvExtraLanes; delete s.dayNoteColors; delete s.episodeDefs; delete s.viewMode; delete s.sidebarTab; }
    if (V === 'nohiatus' || V === 'badhiatus' || V === 'sixkeys') { s.fields.byId['show-title'] = {value: 'Second Show'}; bText = JSON.stringify(s); }
    if (V === 'sixids' || V === 'scen') { bText = gen; wantHiatus = ['2027-12-20/2/']; }
    if (V === 'bare') bText = '{"version":1,"fields":{"byId":{}}}';

    // ---- 1. FRESH: B is the first file this window loads ----------------------------------------------------
    await load(bText, 'second-show.sptcal');
    var fresh = view(), freshSaved = await saveText();
    out.freshSaved = freshSaved;

    // ---- 2. a calendar with almost every store in use, then every saved field changed -----------------------
    var aView, perturbed = 0, bView, bSaved;
    if (V === 'scen') {
      var top = JSON.parse(heavy);
      top.version = 2;
      top.scenarios = {current: 's1', counter: 2, tabs: [{id: 's1', name: 'Plan A'}, {id: 's2', name: 'Plan B', snapshot: JSON.parse(gen)}]};
      await load(JSON.stringify(top), 'two-plans.sptcal');
      aView = view();
      var tB = Array.prototype.filter.call(document.querySelectorAll('.sc-tab'), function (t) { return /Plan B/.test(t.textContent); })[0];
      add('T0', 'the two-tab file loads with Plan A on screen and a Plan B tab', !!tB && aView.fields['show-title'] === 'CARRY-TITLE',
        {tab: !!tB, title: aView.fields['show-title']}, 'CARRY-TITLE and a Plan B tab');
      // ---- 3. flip to the sparse tab ----
      if (tB) { tB.click(); await T.until(function () { return fields()['show-title'] === 'Generated Show'; }, 'Plan B on screen', 100, 100); await settled(); }
      bView = view();
      var whole = JSON.parse(await saveText());
      // What Save wrote for Plan B: the file's top level (the tab on screen), less the container's own keys.
      delete whole.scenarios; whole.version = 1;
      bSaved = whole;
    } else {
      await load(heavy, 'first-show.sptcal');
      aView = view();
      perturbed = perturbAll();
      // ---- 3. B again ----
      await load(bText, 'second-show.sptcal');
      bView = view();
      bSaved = await saveText();
    }
    out.perturbed = perturbed;

    add('A0', 'the first calendar really holds what must not carry: the CARRY-BREAK hiatus, Sim Post, a Production break, month view, the Phases tab',
      aView.hiatuses.some(function (h) { return /^2026-08-03\/2\/CARRY-BREAK/.test(h); }) && aView.fields['simpost-enabled'] === true &&
        aView.fields['phiatus-en-production'] === true && aView.viewBtn === 'month' && aView.sideTab === 'phases' && aView.customRows === 2,
      {hiatuses: aView.hiatuses, simpost: aView.fields['simpost-enabled'], prodBreak: aView.fields['phiatus-en-production'], view: aView.viewBtn, tab: aView.sideTab, customRows: aView.customRows},
      'all of them');

    var fd = diff(fresh.fields, bView.fields);
    add('B1', 'every saved field reads as it does loaded fresh (' + Object.keys(fresh.fields).length + ' fields' + (perturbed ? ', ' + perturbed + ' changed in between' : '') + ')',
      fd.length === 0, {differ: fd.length, first: fd.slice(0, 14)}, 'no field differs');
    add('B2', 'the all-phase hiatus rows are the file’s own (' + (wantHiatus.length ? wantHiatus.join(', ') : 'none') + '), fresh and after the first calendar',
      JSON.stringify(fresh.hiatuses) === JSON.stringify(wantHiatus) && JSON.stringify(bView.hiatuses) === JSON.stringify(wantHiatus),
      {fresh: fresh.hiatuses, after: bView.hiatuses}, JSON.stringify(wantHiatus));
    if (V === 'scen') {
      var fs = JSON.parse(freshSaved);
      // The view and the sidebar tab stay as they are on a flip (they are about the user, not the calendar), and
      // the stamp follows the file each snapshot came in, so those three keys are left out of the comparison.
      ['viewMode', 'sidebarTab', 'lastEdited'].forEach(function (k) { delete fs[k]; delete bSaved[k]; });
      var same = JSON.stringify(fs) === JSON.stringify(bSaved);
      add('B3', 'Save writes Plan B exactly as the same snapshot saves when loaded alone in a fresh window',
        same, {identical: same, keysDiffer: diff(Object.fromEntries(Object.keys(fs).map(function (k) { return [k, JSON.stringify(fs[k])]; })),
                                                 Object.fromEntries(Object.keys(bSaved).map(function (k) { return [k, JSON.stringify(bSaved[k])]; }))).map(function (x) { return x.slice(0, 160); }).slice(0, 8)},
        'identical');
    } else {
      var a = JSON.parse(freshSaved), b = JSON.parse(bSaved);
      add('B3', 'what Save writes after the first calendar is byte-identical to what it writes loaded fresh',
        freshSaved === bSaved, {identical: freshSaved === bSaved, freshBytes: freshSaved.length, afterBytes: bSaved.length,
          keysDiffer: diff(Object.fromEntries(Object.keys(a).map(function (k) { return [k, JSON.stringify(a[k])]; })),
                           Object.fromEntries(Object.keys(b).map(function (k) { return [k, JSON.stringify(b[k])]; }))).map(function (x) { return x.slice(0, 160); }).slice(0, 8)},
        'identical');
      add('B4', 'the dates are the file’s own: every phase line reads as it does loaded fresh, and the view and sidebar tab are the file’s (or the waterfall and Show info)',
        JSON.stringify(fresh.metas) === JSON.stringify(bView.metas) && bView.viewBtn === fresh.viewBtn && bView.sideTab === fresh.sideTab &&
          bView.customRows === 0 && (V === 'nohiatus' || V === 'badhiatus' || (bView.viewBtn === 'sheet' && bView.sideTab === 'show')),
        {fresh: {metas: fresh.metas, view: fresh.viewBtn, tab: fresh.sideTab}, after: {metas: bView.metas, view: bView.viewBtn, tab: bView.sideTab, customRows: bView.customRows}},
        'the same lines; the same view and tab');
      add('B5', 'the stores a file may leave out are empty or its own in what Save writes: no extra month lanes, no legacy note colours, no episode counter from the first calendar',
        JSON.stringify(b.mvExtraLanes) === '{}' && JSON.stringify(b.dayNoteColors) === '{}' && b.episodeCounter !== 22 &&
          (b.episodeDefs || []).length === (V === 'bare' ? 0 : V === 'sixids' ? 8 : 10),
        {mvExtraLanes: b.mvExtraLanes, dayNoteColors: b.dayNoteColors, episodeCounter: b.episodeCounter, episodes: (b.episodeDefs || []).length},
        '{} and {}; a counter that is not 22; the file’s own episode count');
    }
    if (V === 'nohiatus' || V === 'badhiatus' || V === 'sixkeys') {
      var pm = bView.metas['meta-production'] || '';
      add('D1', 'Production wraps on the file’s own date, 10/20/26, not two weeks late behind the first calendar’s break',
        /10\/20\/26/.test(pm) && !/11\/3\/26/.test(pm), {production: pm}, '... 6/29/26 → 10/20/26');
    }
    if (V === 'sixids' || V === 'scen') {
      add('D2', 'the generated calendar shows only Production: no other phase is dated, Sim Post is off, Production has no break',
        bView.fields['start-production'] === '2027-03-01' && bView.fields['start-writersRoom'] === '' && bView.fields['start-prePrep'] === '' &&
          bView.fields['start-prodPrep'] === '' && bView.fields['start-post'] === '' && bView.fields['start-localization'] === '' &&
          bView.fields['simpost-enabled'] === false && bView.fields['phiatus-en-production'] === false && bView.fields['phiatus-start-production'] === '',
        {prod: bView.fields['start-production'], wr: bView.fields['start-writersRoom'], pp: bView.fields['start-prePrep'], pr: bView.fields['start-prodPrep'],
         post: bView.fields['start-post'], loc: bView.fields['start-localization'], simpost: bView.fields['simpost-enabled'],
         prodBreak: bView.fields['phiatus-en-production'] + ' ' + bView.fields['phiatus-start-production'], metas: bView.metas},
        'Production from 2027-03-01 and nothing else');
    }
    if (V === 'bare') {
      // A file that names nothing opens as a new calendar's fields, one for one. (Its hiatus list is its own:
      // none, where a new calendar has the four default winter breaks.)
      var nd = diff(boot.fields, bView.fields);
      add('N1', 'a file that names no field opens with every field as a NEW calendar has it',
        nd.length === 0 && Object.keys(boot.fields).length === Object.keys(bView.fields).length,
        {differ: nd.length, first: nd.slice(0, 14), fields: Object.keys(bView.fields).length}, 'no field differs from the page before any load');
    }
    var errs0 = T.appHealth().errors.filter(function (e) { return !(V === 'badhiatus' && /not in a form the app writes/.test(String(e))); });
    add('E0', 'no console error, no native alert, no question left open', errs0.length === 0 && window.__alerts.length === 0 && !T.modalText(),
        {errors: T.appHealth().errors.slice(0, 5), alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) { cases.push({id: 'EX', title: 'the leg threw', pass: false, observed: String(e && e.stack || e), expected: 'no exception'}); }
  T.done(out);
})(); });
