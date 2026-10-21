// episodeprep -- per-episode prep, derived from the shoot, month view only (EPISODE-PREP-PLAN.md §11).
//
// THREE RUNS, chosen by the starting state:
//
//   HARNESS_PAGE=/dist/index.html ./run.sh episodeprep 400
//     LIVE + MINT. Builds the synthetic calendar below through the UI, asserts the Prep row while it is
//     edited, then saves it twice through the real Save path (only the OS picker stood in for): as
//     built (out.text -> tests/fixtures/episodeprep.sptcal) and after Schedule by -> Blocks
//     (out.textBlocks -> tests/fixtures/episodeprep-blocks.sptcal). See tests/fixtures/README.md.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=episodeprep ./run.sh episodeprep 400
//     RESTORE. The hand trace, the overlap's lanes and labels, the movers, save/load/undo, the M-5 trap,
//     and the "month view only" proof: the workbook and the waterfall PDF exported with prep ON and with
//     prep OFF (out.xlsxOn/xlsxOff/pdfOn/pdfOff), which gate.sh holds byte-identical.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=episodeprep-blocks ./run.sh episodeprep 400
//     BLOCKS. Prep per block (P4), labelled with the block's name, an overlap, and the Schedule-by switch
//     keeping both modes' lengths.
//
// THE NAME AND THE ORDER (owner, 19 Oct 2026): the Prep row sits directly ABOVE Production; its default
// name is "Episodic Prep" / "Block Prep" by Schedule mode; its pills read "Prep 302" / "Prep Block 2".
// Both fixtures were minted with the OLD default, "Prep", so RESTORE and BLOCKS also prove that a file
// saved before the change opens on the new default (R0, K0). Do not re-mint them without keeping one.
//
// THE CALENDAR (made-up 2027 dates and a made-up show shape; region Atlanta = US-GEN):
//   Prod Prep Mon 1/18/27 x 5 wk; Production from Mon 2/22/27, Season 3, 6 episodes x 5 days; Post Mon
//   4/19/27 x 8 wk; one all-phase hiatus, the week of Mon 3/15/27 (LOCKED, as every new hiatus row is).
//   Union holidays in range: Presidents' Day Mon 2/15/27, Good Friday Fri 3/26/27.
//   Shooting order 302, 301, 304, 303, 306, 305 (three drags). The shoot, 30 days:
//     302 2/22-2/26 | 301 3/1-3/5 | 304 3/8-3/12 | [hiatus 3/15-3/19] | 303 3/22-3/25, 3/29 [GF 3/26 skipped]
//     306 3/30-4/2, 4/5 | 305 4/6-4/9, 4/12
//   Prep: default 5 working days; 304 its own 8, 303 its own 10 (so two pairs of preps overlap).
//   Hand trace of plan §5 -- count back from the day before each episode's first shoot day, skipping
//   weekends, enabled union holidays and the hiatus:
//     Prep 302 (5)  2/12, 2/16-2/19          the first episode gets one (P3); Presidents' Day skipped
//     Prep 301 (5)  2/22-2/26                overlaps 302's shoot (the example's second lane)
//     Prep 304 (8)  2/24-2/26, 3/1-3/5       overlaps Prep 301 on 2/24-2/26
//     Prep 303 (10) 3/1-3/5, 3/8-3/12        jumps the hiatus; overlaps Prep 304 on 3/1-3/5, BOTH from Monday
//     Prep 306 (5)  3/22-3/25, 3/29          Good Friday skipped
//     Prep 305 (5)  3/30-4/2, 4/5
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {}, fails = [], checks = [];
  function check(cond, what){ checks.push({what: what, ok: !!cond}); if(!cond) fails.push(what); return !!cond; }
  function $(id){ return document.getElementById(id); }
  var DAY = 864e5;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function iso(d){ return d.toISOString().slice(0, 10); }
  function range(a, b){ var o = [], d = new Date(a + 'T00:00:00Z'), e = new Date(b + 'T00:00:00Z'); for(; d <= e; d = new Date(d.getTime() + DAY)) o.push(iso(d)); return o; }
  function wk(a, b){ return range(a, b).filter(function (x) { var g = new Date(x + 'T00:00:00Z').getUTCDay(); return g >= 1 && g <= 5; }); }
  function setEl(e, v){
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(e, v);
    ['input', 'change'].forEach(function (t) { e.dispatchEvent(new Event(t, {bubbles: true})); });
  }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 150, 100);
    await T.sleep(700);   // past the 500 ms undo debounce, so the next action is its own step
  }
  async function undo(){ $('undo-btn').click(); await settle(); }
  function tab(name){ var b = document.querySelector('.side-tab-btn[data-tab="' + name + '"]'); if(b) b.click(); }
  async function view(mode){ $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await T.sleep(300); }
  function shownEl(el){ return !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none'; }

  // ---- the month view, read back -------------------------------------------------------------------
  function monthOnScreen(){
    var t = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent || '';
    var m = /(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/.exec(t);
    return m ? new Date(Date.UTC(+m[2], MONTHS.indexOf(m[1]), 1)) : null;
  }
  // Every bar of the month on screen, row by row: which phase, its text (the pill's own, not its grey
  // span), its columns, its lane (grid row) and the dates it covers.
  function rowsOnScreen(){
    var first = monthOnScreen(); if(!first) return [];
    var gs = new Date(first.getTime() - first.getUTCDay() * DAY);
    return [].map.call(document.querySelectorAll('#table-wrap .mv-body > .mv-week'), function (w, k) {
      var start = new Date(gs.getTime() + 7 * k * DAY);
      var bars = [].map.call(w.querySelectorAll('.mv-pill'), function (p) {
        var gc = String(p.style.gridColumn || '').split('/').map(function (x) { return parseInt(x, 10); });
        var days = [];
        for(var c = gc[0] - 1; c <= gc[1] - 2; c++) days.push(iso(new Date(start.getTime() + c * DAY)));
        var sp = p.querySelector('.mv-pill-block'), txt = '';
        p.childNodes.forEach(function (n) { if(n !== sp) txt += n.textContent; });
        // A Production bar's text WITHOUT the "Shoot " it carries by default since 20 Oct 2026 (owner): this leg is about
        // prep, and halfdays D2s and barprefix hold the prefix. A prep pill never has one.
        return {ph: p.getAttribute('data-ph') || '', text: txt.trim().replace(/^Shoot /, ''), cols: String(p.style.gridColumn).replace(/\s+/g, ''),
                lane: parseInt(p.style.gridRow, 10), days: days, bg: p.style.backgroundColor};
      });
      return {start: iso(start), bars: bars};
    });
  }
  // Walk every month of the calendar's range (the view clamps at both ends), calling fn per month.
  async function eachMonth(fn){
    await view('month');
    await T.until(function () { return !!monthOnScreen(); }, 'the month grid', 100, 100);
    for(var g = 0; g < 40; g++){ var a = monthOnScreen().getTime(); $('mv-prev').click(); await T.sleep(60); if(monthOnScreen().getTime() === a) break; }
    for(var h = 0; h < 40; h++){
      fn(monthOnScreen(), rowsOnScreen());
      var b = monthOnScreen().getTime(); $('mv-next').click(); await T.sleep(60);
      if(monthOnScreen().getTime() === b) break;
    }
  }
  // prep label -> the sorted dates its pills cover, across every month.
  async function prepMap(){
    var m = {};
    await eachMonth(function (mo, rows) {
      rows.forEach(function (r) { r.bars.forEach(function (b) {
        if(b.ph !== 'episodePrep') return;
        (m[b.text] = m[b.text] || {});
        b.days.forEach(function (d) { m[b.text][d] = 1; });
      }); });
    });
    var o = {};
    Object.keys(m).sort().forEach(function (k) { o[k] = Object.keys(m[k]).sort().join(','); });
    return o;
  }
  function wantMap(w){ var o = {}; Object.keys(w).sort().forEach(function (k) { o[k] = w[k].slice().sort().join(','); }); return o; }
  function sameMap(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function mapDiff(a, b){
    var o = {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) { if(a[k] !== b[k]) o[k] = {got: a[k] || null, want: b[k] || null}; });
    return o;
  }
  // Every NON-prep bar of every month: what must not move when prep is switched on.
  async function otherBars(){
    var o = [];
    await eachMonth(function (mo, rows) {
      rows.forEach(function (r) { r.bars.forEach(function (b) {
        if(b.ph !== 'episodePrep') o.push(iso(mo) + '|' + r.start + '|' + b.ph + '|' + b.text + '|' + b.cols + '|' + b.lane);
      }); });
    });
    return o;
  }
  // One row (by its Sunday) of one month, for the lane checks.
  async function rowAt(monthLabel, sunday){
    var got = null;
    await eachMonth(function (mo, rows) {
      if(MONTHS[mo.getUTCMonth()] + ' ' + mo.getUTCFullYear() !== monthLabel) return;
      rows.forEach(function (r) { if(r.start === sunday) got = r; });
    });
    return got;
  }

  // ---- the sidebar ---------------------------------------------------------------------------------
  function prepList(){
    return [].map.call(document.querySelectorAll('#prep-rows .prep-unit-row'), function (r) {
      var inp = r.querySelector('input');
      return {kind: r.dataset.kind, name: (r.querySelector('.prep-unit-name') || {}).textContent, value: inp.value,
              placeholder: inp.placeholder, edited: inp.classList.contains('is-edited')};
    });
  }
  function prepBox(name){
    var r = [].find.call(document.querySelectorAll('#prep-rows .prep-unit-row'), function (x) {
      return ((x.querySelector('.prep-unit-name') || {}).textContent || '') === name; });
    return r ? r.querySelector('input') : null;
  }
  function epOrder(){
    return [].map.call(document.querySelectorAll('#episode-rows .episode-row'), function (r) { return r.querySelector('.ep-name').value; });
  }
  function rowOf(n){ return [].find.call(document.querySelectorAll('#episode-rows .episode-row'),
    function (r) { return r.querySelector('.ep-name').value === 'Episode ' + n; }); }
  // ⚠️ The Phases tab must be VISIBLE: a hidden panel measures 0x0, and every drop reads as "before".
  async function drag(n, target, side){
    tab('phases'); await T.sleep(150);
    var g = rowOf(n).querySelector('.ep-grip'), t = rowOf(target); t.scrollIntoView({block: 'center'});
    var b = t.getBoundingClientRect();
    var y = side === 'before' ? b.top + 2 : b.bottom - 2, dt = new DataTransfer();
    g.dispatchEvent(new DragEvent('dragstart', {bubbles: true, dataTransfer: dt}));
    t.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: dt, clientY: y}));
    t.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt, clientY: y}));
    g.dispatchEvent(new DragEvent('dragend', {bubbles: true, dataTransfer: dt}));
    await settle();
  }
  function reachable(el){
    if(!el) return false;
    el.scrollIntoView({block: 'center'});
    var r = el.getBoundingClientRect();
    return r.width > 0 && document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).indexOf(el) !== -1;
  }
  // "Pause prep on days marked Off" (owner, 20 Oct 2026). It was the Prep row's id-less checkbox; the owner
  // moved it the same day into the Settings window ▸ Calendar ▸ Month view (ruling 12), where it is the switch
  // #prep-pause-off inside .prefs-card -- so the sweep still never takes it. Clicked where a pointer would land:
  // the element on top at the centre of the switch's TRACK (the input itself is invisible) must be the track's.
  function pauseBox(){ return $('prep-pause-off'); }
  function pauseTrack(){ var cb = pauseBox(), r = cb && cb.closest('.mantine-Switch-root'); return r && r.querySelector('.mantine-Switch-track'); }
  function pauseText(){ var l = [].find.call(document.querySelectorAll('label[for="prep-pause-off"]'), function (x) { return x.textContent.trim(); }); return l ? l.textContent.trim() : ''; }
  async function clickPause(){
    if(!shownEl($('prep-row'))) await view('month');   // the card shows in the month view only, like the Prep row (P1)
    await T.openSettings('prefs');
    var tr = pauseTrack(), r = tr.getBoundingClientRect();
    var top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if(!top || !tr.contains(top)) throw new Error('the Pause prep switch is covered (' + (top && (top.className || top.tagName)) + ')');
    top.click();
    await settle();
    await T.closeSettings();
  }
  async function pickColour(index){
    $('swatch-episodePrep').click();
    await T.until(function () { return document.querySelectorAll('.phase-color-pop .pc-sw').length > index; }, 'the colour picker', 40, 100);
    document.querySelectorAll('.phase-color-pop .pc-sw')[index].click();
    await settle();
  }

  // ---- Save and Load through the real paths ---------------------------------------------------------
  // One log of every write, whichever handle made it: the first Save's (the stand-in picker's) or a
  // loaded file's (openViaFakePicker's `writes`), since Save writes back to the file last loaded.
  var written = [];
  function textOf(w){ return typeof w === 'string' ? w : w.text; }
  var saveHandle = { name: 'episodeprep.sptcal', kind: 'file',
    queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
    isSameEntry: async function(o){ return o === saveHandle; },
    getFile: async function(){ return new File([written.length ? textOf(written[written.length - 1]) : ''], 'episodeprep.sptcal', {lastModified: 1}); },
    createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
  async function save(){
    var n = written.length;
    window.showSaveFilePicker = async function(){ return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);   // flashSaveBtn
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return textOf(written[written.length - 1]);
  }
  var loads = 0;
  function menuLabel(){ return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text){
    var stem = 'prep-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/tests/fixtures/episodeprep.sptcal', name, {text: text, writes: written});
    // The unsaved-work question comes BEFORE the picker when the calendar is dirty: answer it.
    for(var i = 0; i < 40; i++){ await T.sleep(100); if(T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file’s name in the file menu', 100, 100);
    await settle();
  }
  async function exportsNow(tag){
    await view('sheet');
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob (' + tag + ')');
    out['xlsx' + tag] = T.b64(await xb.arrayBuffer());
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob (' + tag + ')');
    out['pdf' + tag] = T.b64(await pb.arrayBuffer());
    await view('month');
  }

  // ---- the hand traces --------------------------------------------------------------------------------
  var WANT_ON = wantMap({
    'Prep 302': ['2027-02-12'].concat(wk('2027-02-16', '2027-02-19')),
    'Prep 301': wk('2027-02-22', '2027-02-26'),
    'Prep 304': wk('2027-02-24', '2027-03-05'),
    'Prep 303': wk('2027-03-01', '2027-03-12'),
    'Prep 306': wk('2027-03-22', '2027-03-25').concat(['2027-03-29']),
    'Prep 305': wk('2027-03-30', '2027-04-05'),
  });
  // Shift All +1 week. The hiatus is LOCKED, so it stays on 3/15 and the shoot re-flows around it --
  // which is why prep cannot simply be the old runs plus seven days.
  //   302 3/1-3/5 | 301 3/8-3/12 | [hiatus] | 304 3/22-3/25, 3/29 | 303 3/30-4/2, 4/5 | 306 4/6-4/9, 4/12 | 305 4/13-4/16, 4/19
  //   Prep 303's 10 days count back from Mon 3/29: 3/29, [GF], 3/25-3/22, [hiatus], 3/12-3/8. (A first
  //   version of this trace stopped at 3/9, nine days; the leg caught it, and the app had it right.)
  var WANT_SHIFT = wantMap({
    'Prep 302': wk('2027-02-22', '2027-02-26'),
    'Prep 301': wk('2027-03-01', '2027-03-05'),
    'Prep 304': wk('2027-03-03', '2027-03-12'),
    'Prep 303': wk('2027-03-08', '2027-03-12').concat(wk('2027-03-22', '2027-03-25'), ['2027-03-29']),
    'Prep 306': wk('2027-03-30', '2027-04-05'),
    'Prep 305': wk('2027-04-06', '2027-04-12'),
  });
  // 305 dragged to the front: 305 2/22-2/26 | 302 3/1-3/5 | 301 3/8-3/12 | 304 3/22-3/25, 3/29 | 303 3/30-4/5 | 306 4/6-4/12
  var WANT_DRAG = wantMap({
    'Prep 305': ['2027-02-12'].concat(wk('2027-02-16', '2027-02-19')),
    'Prep 302': wk('2027-02-22', '2027-02-26'),
    'Prep 301': wk('2027-03-01', '2027-03-05'),
    'Prep 304': wk('2027-03-03', '2027-03-12'),
    'Prep 303': wk('2027-03-08', '2027-03-12').concat(wk('2027-03-22', '2027-03-25'), ['2027-03-29']),
    'Prep 306': wk('2027-03-30', '2027-04-05'),
  });
  // Blocks: 3 x 10 days, episodes split 2,2,2 in shooting order. Block 1 2/22-3/5 | Block 2 3/8-3/12,
  // [hiatus], 3/22-3/25, 3/29 | Block 3 3/30-4/12. Default 5; Block 3 its own 12.
  var WANT_BLOCKS = wantMap({
    'Prep Block 1': ['2027-02-12'].concat(wk('2027-02-16', '2027-02-19')),
    'Prep Block 2': wk('2027-03-01', '2027-03-05'),
    'Prep Block 3': wk('2027-03-04', '2027-03-12').concat(wk('2027-03-22', '2027-03-25'), ['2027-03-29']),
  });
  var ORDER = ['Episode 302', 'Episode 301', 'Episode 304', 'Episode 303', 'Episode 306', 'Episode 305'];
  out.want = {on: WANT_ON, shift: WANT_SHIFT, drag: WANT_DRAG, blocks: WANT_BLOCKS};

  try {
    await T.appReady();
    var st = (new URL(location.href)).searchParams.get('state') || '';
    out.run = st === 'episodeprep-blocks' ? 'blocks' : st ? 'restore' : 'live';

    if(!st){
      // ================= LIVE: build it through the UI =================
      T.set('show-title', 'Prep Fixture'); T.set('season-num', '3'); T.set('num-episodes', '6');
      T.set('shoot-days-per-ep', '5'); T.set('union-place', 'us-atlanta');
      T.set('start-prodPrep', '2027-01-18'); T.set('weeks-prodPrep', '5');
      T.set('start-production', '2027-02-22');
      T.set('start-post', '2027-04-19'); T.set('weeks-post', '8');
      T.addHiatus('2027-03-15', 1);
      await settle();
      await view('month'); tab('phases'); await T.sleep(200);
      out.health = T.appHealth();

      // L1: a blank default with no overrides draws nothing, and says so.
      out.blank = {map: await prepMap(), meta: $('prep-meta').textContent};
      check(sameMap(out.blank.map, {}) && /^No prep\./.test(out.blank.meta), 'L1 a blank default with no overrides draws no prep, and the row says why');
      // L2: the save format -- two id'd fields, and no id in the list.
      var sig = T.formSignature();
      out.ids = {prepDays: 'prep-days' in sig, prepName: 'prep-name' in sig, nameValue: sig['prep-name'],
                 inList: document.querySelectorAll('#prep-rows [id]').length};
      check(out.ids.prepDays && out.ids.prepName && out.ids.nameValue === 'Episodic Prep' && out.ids.inList === 0,
            'L2 prep-days and prep-name are in fields.byId, the name reads "Episodic Prep", and no box in the list has an id');
      // N1: the Prep row sits directly above Production's (owner, 19 Oct 2026).
      var nx = $('prep-row').nextElementSibling;
      out.order1 = {nextHasProduction: !!(nx && nx.querySelector('#name-production')),
                    rowsBefore: [].indexOf.call($('phase-rows').children, $('prep-row'))};
      check(out.order1.nextHasProduction, 'N1 the Prep row is directly above Production in the Phases card');
      // L3: month view only (P1).
      out.rowShown = {month: shownEl($('prep-row'))};
      await view('sheet'); out.rowShown.sheet = shownEl($('prep-row')); await view('month');
      check(out.rowShown.month && !out.rowShown.sheet, 'L3 the Prep row shows in the month view and is hidden in the waterfall');

      // L4: a typed prep length goes with a dropped episode, and the "Removed" warning names it.
      setEl(prepBox('Episode 306'), '3'); await settle();
      T.set('num-episodes', '5'); await settle();
      out.dropWarn = (($('ep-panel-warn') || {}).textContent || '').trim();
      check(/Removed Episode 306/.test(out.dropWarn), 'L4 lowering the count past an episode with its own prep length warns "Removed Episode 306"');
      T.set('num-episodes', '6'); await settle();
      check(prepBox('Episode 306') && prepBox('Episode 306').value === '', 'L4 the re-added Episode 306 has no prep length of its own');

      // The shooting order, by three real drags.
      await drag('302', '301', 'before'); await drag('304', '303', 'before'); await drag('306', '305', 'before');
      out.order = {episodes: epOrder(), prep: prepList().map(function (x) { return x.name; })};
      check(JSON.stringify(out.order.episodes) === JSON.stringify(ORDER), 'the shooting order is 302, 301, 304, 303, 306, 305');
      check(JSON.stringify(out.order.prep) === JSON.stringify(ORDER), 'L5 the prep list follows the shooting order');

      // L6: reachable by a real pointer.
      out.reach = {days: reachable($('prep-days')), name: reachable($('prep-name')), swatch: reachable($('swatch-episodePrep')),
                   box: reachable(prepBox('Episode 304'))};
      check(out.reach.days && out.reach.name && out.reach.swatch && out.reach.box, 'L6 the Prep row’s name, swatch, default and list boxes are hit-testable');

      // L7: the default draws every episode's prep; ONE undo takes it away.
      T.set('prep-days', '5'); await settle();
      out.defaultOnly = await prepMap();
      check(Object.keys(out.defaultOnly).length === 6, 'L7 a default of 5 draws six preps, the first episode included (P3)');
      check(prepList().every(function (x) { return x.placeholder === '5' && x.value === ''; }), 'L7 every box shows the default as its placeholder');
      await undo();
      out.afterUndo = {value: $('prep-days').value, map: await prepMap()};
      check(out.afterUndo.value === '' && sameMap(out.afterUndo.map, {}), 'L7 one undo removes the default and every prep');
      T.set('prep-days', '5'); await settle();

      // L8: a fraction is ringed, like every other day count.
      T.set('prep-days', '4.5'); await settle();
      var host = $('prep-days').closest('label');
      out.whole = {ringed: $('prep-days').classList.contains('is-invalid'), words: host && host.getAttribute('data-whole-err')};
      check(out.whole.ringed && out.whole.words === 'Whole days only', 'L8 a fractional default is ringed "Whole days only"');
      T.set('prep-days', '5'); await settle();

      // L9: the per-episode overrides (P2), and 0 = no prep for that one.
      setEl(prepBox('Episode 304'), '8'); await settle();
      setEl(prepBox('Episode 303'), '10'); await settle();
      out.edited = prepList().filter(function (x) { return x.edited; }).map(function (x) { return x.name + '=' + x.value; });
      check(out.edited.join() === 'Episode 304=8,Episode 303=10', 'L9 the two typed lengths are marked as edited');
      out.liveMap = await prepMap();
      check(sameMap(out.liveMap, WANT_ON), 'L9 every prep run matches the hand trace (built live)');
      if(!sameMap(out.liveMap, WANT_ON)) out.liveDiff = mapDiff(out.liveMap, WANT_ON);
      setEl(prepBox('Episode 305'), '0'); await settle();
      out.zero = await prepMap();
      check(!('Prep 305' in out.zero) && Object.keys(out.zero).length === 5, 'L9 an override of 0 gives that episode no prep');
      setEl(prepBox('Episode 305'), ''); await settle();
      check(sameMap(await prepMap(), WANT_ON), 'L9 clearing the 0 goes back to the default');

      // L10: no Show Info, no prep.
      T.set('season-num', ''); await settle();
      out.noInfo = {meta: $('prep-meta').textContent, map: await prepMap()};
      check(/Complete Show Info/.test(out.noInfo.meta) && sameMap(out.noInfo.map, {}), 'L10 with Show Info incomplete there is no prep, and the row says so');
      T.set('season-num', '3'); await settle();
      check(sameMap(await prepMap(), WANT_ON), 'L10 completing Show Info brings every prep back');

      // L11: the colour picker, one undo step.
      await pickColour(3);
      var teal = (await rowAt('February 2027', '2027-02-21')).bars.filter(function (b) { return b.ph === 'episodePrep'; });
      out.colour = {picked: teal.map(function (b) { return b.bg; }), swatch: $('swatch-episodePrep').style.backgroundColor};
      check(teal.length && teal.every(function (b) { return b.bg === 'rgb(213, 240, 238)'; }) && out.colour.swatch === 'rgb(213, 240, 238)',
            'L11 a picked colour (Light teal) paints every prep pill and the swatch');
      await undo();
      var purple = (await rowAt('February 2027', '2027-02-21')).bars.filter(function (b) { return b.ph === 'episodePrep'; });
      out.colour.undone = purple.map(function (b) { return b.bg; });
      check(purple.length && purple.every(function (b) { return b.bg === 'rgb(228, 223, 236)'; }), 'L11 one undo puts the default Light purple back');

      // S1: "Pause prep on days marked Off" (owner, 20 Oct 2026, by picker: "Switch, default: don't skip"; then,
      // the same day, "prep pause ... in the Settings window ... under This calendar", ruling 12). It is a switch in
      // the Settings window's Preferences tab (its Calendar tab until the two merged, 20 Oct 2026), unticked, and the Prep row has no box any more. Its id is new and SAFE
      // only because the card is .prefs-card: collectFieldValues() sweeps every other id'd control into
      // fields.byId, so outside it the id would re-cut the save format's id set. The snapshot's prepPauseOff key
      // is its one store.
      var pcb = pauseBox(), sigKeys = Object.keys(T.formSignature()).sort().join();
      if(!shownEl($('prep-row'))) await view('month');
      await T.openSettings('prefs');
      out.pause = {present: !!pcb && T.settingsTabOf(pcb) === 'prefs', checked: pcb && pcb.checked, id: pcb ? pcb.id : null,
                   skipped: !!pcb && !!pcb.closest('.prefs-card') && !('prep-pause-off' in T.formSignature()),
                   oldBox: !!document.querySelector('#prep-row input[type="checkbox"]'),
                   text: pauseText(), reach: reachable(pauseTrack())};
      check(out.pause.present && out.pause.checked === false && out.pause.text === 'Pause prep on days marked Off' && !out.pause.oldBox,
            'S1 Settings ▸ Calendar has an UNTICKED "Pause prep on days marked Off" switch, and the Prep row no box');
      check(out.pause.skipped, 'S1 the switch is inside .prefs-card, so fields.byId never holds its id');
      check(out.pause.reach, 'S1 the Pause prep switch is hit-testable');
      await T.closeSettings();
      // S2: this calendar has no Off mark and no own hiatus, so ticking it moves no prep run. One undo step.
      await clickPause();
      out.pause.ticked = {checked: pauseBox().checked, sameIds: Object.keys(T.formSignature()).sort().join() === sigKeys, map: await prepMap()};
      check(out.pause.ticked.checked && out.pause.ticked.sameIds, 'S2 a real click ticks it, and the id\'d field set is unchanged');
      check(sameMap(out.pause.ticked.map, WANT_ON), 'S2 ticked, with nothing to skip here, every prep run is unchanged');
      await undo();
      check(pauseBox().checked === false && sameMap(await prepMap(), WANT_ON), 'S2 one undo unticks it');

      // MINT: the Episodes fixture, then its Blocks twin.
      out.text = await save();
      var snap = JSON.parse(out.text);
      var pd = {};
      (snap.episodeDefs || []).forEach(function (e) { if('prepDays' in e) pd[e.name] = e.prepDays; });
      out.saved = {prepDays: (snap.fields.byId['prep-days'] || {}).value, prepName: (snap.fields.byId['prep-name'] || {}).value, perEp: pd,
                   colour: (snap.phaseColorOverride || {}).episodePrep};
      check(out.saved.prepDays === '5' && out.saved.prepName === 'Episodic Prep' && JSON.stringify(pd) === '{"Episode 303":"10","Episode 304":"8"}'
            && out.saved.colour === undefined, 'MINT the file carries prep-days 5, prep-name, and prepDays on exactly 304 and 303');
      check(!('prepPauseOff' in snap), 'MINT the switch is unticked, so the file carries no prepPauseOff key');

      T.set('show-mode', 'blocks'); T.set('num-blocks', '3'); T.set('days-per-block', '10'); await settle();
      out.blockName = $('prep-name').value;
      check(out.blockName === 'Block Prep', 'N2 switched to Blocks, the default name becomes "Block Prep"');
      out.blockList = prepList();
      check(out.blockList.map(function (x) { return x.kind + ':' + x.name; }).join() === 'block:Block 1,block:Block 2,block:Block 3',
            'B0 in Blocks mode the list holds the blocks (P4)');
      setEl(prepBox('Block 3'), '12'); await settle();
      out.liveBlocks = await prepMap();
      check(sameMap(out.liveBlocks, WANT_BLOCKS), 'B0 every block’s prep matches the hand trace (built live)');
      if(!sameMap(out.liveBlocks, WANT_BLOCKS)) out.liveBlocksDiff = mapDiff(out.liveBlocks, WANT_BLOCKS);
      out.textBlocks = await save();
      check(((JSON.parse(out.textBlocks).fields.byId['prep-name']) || {}).value === 'Block Prep', 'N2 the Blocks file saves the name "Block Prep"');
    }

    if(st === 'episodeprep'){
      // ================= RESTORE =================
      await T.until(function () { return document.querySelectorAll('#prep-rows .prep-unit-row').length === 6; }, 'the restored prep list', 200, 100);
      await settle();
      out.health = T.appHealth();
      tab('phases'); await T.sleep(200);
      out.restored = {days: $('prep-days').value, name: $('prep-name').value, list: prepList()};
      check(out.restored.days === '5' && out.restored.name === 'Episodic Prep',
            'R0 the default is restored, and the file’s old default name "Prep" opens as "Episodic Prep"');
      check(JSON.stringify(out.restored.list.map(function (x) { return x.name + '=' + x.value + (x.edited ? '*' : ''); }))
            === JSON.stringify(['Episode 302=', 'Episode 301=', 'Episode 304=8*', 'Episode 303=10*', 'Episode 306=', 'Episode 305=']),
            'R0 the list is in shooting order with 304’s and 303’s own lengths');

      out.map = await prepMap();
      check(sameMap(out.map, WANT_ON), 'R1 every prep run matches the hand trace, the first episode included');
      if(!sameMap(out.map, WANT_ON)) out.mapDiff = mapDiff(out.map, WANT_ON);

      // R2: the overlaps, in separate lanes under the shoot, each with its own label (P5).
      var r1 = await rowAt('February 2027', '2027-02-21'), r2 = await rowAt('March 2027', '2027-02-28');
      function laneOf(r, f){ var b = r && r.bars.filter(f); return (b && b.length === 1) ? b[0] : null; }
      var p1 = r1 && laneOf(r1, function (b) { return b.ph === 'production'; });
      var a1 = r1 && laneOf(r1, function (b) { return b.text === 'Prep 301'; }), b1 = r1 && laneOf(r1, function (b) { return b.text === 'Prep 304'; });
      var p2 = r2 && laneOf(r2, function (b) { return b.ph === 'production'; });
      var a2 = r2 && laneOf(r2, function (b) { return b.text === 'Prep 304'; }), b2 = r2 && laneOf(r2, function (b) { return b.text === 'Prep 303'; });
      out.lanes = {r1: r1, r2: r2};
      check(p1 && a1 && b1 && p1.text === 'Ep. 302' && a1.cols === '2/7' && b1.cols === '4/7' && a1.lane === p1.lane + 1 && b1.lane === p1.lane + 2,
            'R2 week of 2/21: Ep. 302 on top, Prep 301 (Mon-Fri) one lane down, Prep 304 (Wed-Fri) stacked under it');
      check(p2 && a2 && b2 && p2.text === 'Ep. 301' && a2.cols === '2/7' && b2.cols === '2/7' && a2.lane === p2.lane + 1 && b2.lane === p2.lane + 2,
            'R2 week of 2/28: two preps from the same Monday, Prep 304 then Prep 303, each in its own lane with its own name');
      check(r1 && r1.bars.filter(function (b) { return b.ph === 'episodePrep'; }).every(function (b) { return b.bg === 'rgb(228, 223, 236)'; }),
            'R2 prep pills are drawn in the default Light purple');

      // R3: month view only (P1).
      out.rowShown = {month: shownEl($('prep-row'))};
      await view('sheet'); out.rowShown.sheet = shownEl($('prep-row')); await view('month');
      check(out.rowShown.month && !out.rowShown.sheet, 'R3 the Prep row shows in the month view and is hidden in the waterfall');

      // R4: prep follows a Shift All, through the locked hiatus; ONE undo puts it back.
      $('pop-shift-btn').click(); await T.sleep(150);
      T.set('tool-shift-weeks', '1'); $('tool-shift-later').click(); await settle();
      out.shift = await prepMap();
      check(sameMap(out.shift, WANT_SHIFT), 'R4 after Shift All +1 wk every prep matches the shifted shoot’s hand trace');
      if(!sameMap(out.shift, WANT_SHIFT)) out.shiftDiff = mapDiff(out.shift, WANT_SHIFT);
      // R5 (on the shifted calendar): a first prep in a month no phase reaches still gets that month. With
      // Prod Prep cleared, Production is the first phase (Mon 3/1) and Prep 302 runs 2/22-2/26.
      T.set('start-prodPrep', ''); await settle();
      // ⚠️ REVISED 20 Oct 2026 (MONTH-NOTES-PLAN.md §3, "One month each side"): the view now pages one month before
      // the range it covers, so the walk starts on an empty January. February is still the first month with a bar.
      var firstMonth = null, firstPaged = null;
      await eachMonth(function (mo, rows) {
        var name = MONTHS[mo.getUTCMonth()] + ' ' + mo.getUTCFullYear();
        if(!firstPaged) firstPaged = name;
        if(!firstMonth && rows.some(function (r) { return r.bars.length; })) firstMonth = name;
      });
      out.firstMonth = firstMonth; out.firstPaged = firstPaged;
      check(firstMonth === 'February 2027' && firstPaged === 'January 2027', 'R5 the month view starts in February, the first prep’s month, though no phase does (and pages one month before it, to January)');
      await undo(); await undo();
      out.shiftUndone = await prepMap();
      check(sameMap(out.shiftUndone, WANT_ON) && $('start-prodPrep').value === '2027-01-18', 'R4 undo restores the calendar and every prep');

      // R6: prep follows a change of shooting order; ONE undo puts it back.
      await drag('305', '302', 'before');
      out.dragOrder = prepList().map(function (x) { return x.name; });
      out.drag = await prepMap();
      check(out.dragOrder[0] === 'Episode 305' && out.dragOrder[1] === 'Episode 302', 'R6 the prep list re-sequences with the drag');
      check(sameMap(out.drag, WANT_DRAG), 'R6 after the drag every prep follows its episode’s new days');
      if(!sameMap(out.drag, WANT_DRAG)) out.dragDiff = mapDiff(out.drag, WANT_DRAG);
      await undo();
      check(sameMap(await prepMap(), WANT_ON) && prepList()[0].name === 'Episode 302', 'R6 one undo restores the order and every prep');

      // R7: a per-episode length survives undo -- typed, then undone, the box and the runs come back.
      tab('phases'); await T.sleep(150);
      setEl(prepBox('Episode 301'), '7'); await settle();
      out.typed = await prepMap();
      check(out.typed['Prep 301'] === wk('2027-02-18', '2027-02-26').join(','), 'R7 Episode 301’s own 7 days: 2/18-2/26');
      await undo();
      check(prepBox('Episode 301').value === '' && sameMap(await prepMap(), WANT_ON), 'R7 one undo empties the box and restores the default run');

      // R8: renaming the row renames every pill; a name the user gives it replaces "Prep" before the unit.
      T.set('prep-name', 'Art Prep'); await settle();
      var renamed = await prepMap();
      check(Object.keys(renamed).sort().join() === 'Art Prep 301,Art Prep 302,Art Prep 303,Art Prep 304,Art Prep 305,Art Prep 306', 'R8 the pills take the row’s name');
      await undo();
      check($('prep-name').value === 'Episodic Prep' && sameMap(await prepMap(), WANT_ON), 'R8 one undo restores the name');

      // R9: survives Save and Load, through the real paths.
      var savedText = await save();
      var snap = JSON.parse(savedText);
      var pd = {};
      (snap.episodeDefs || []).forEach(function (e) { if('prepDays' in e) pd[e.name] = e.prepDays; });
      check((snap.fields.byId['prep-days'] || {}).value === '5' && JSON.stringify(pd) === '{"Episode 303":"10","Episode 304":"8"}',
            'R9 Save writes the default and exactly the two per-episode lengths');
      await load(savedText);
      out.reload = {map: await prepMap(), list: prepList().map(function (x) { return x.name + '=' + x.value; })};
      check(sameMap(out.reload.map, WANT_ON) && out.reload.list.join() === 'Episode 302=,Episode 301=,Episode 304=8,Episode 303=10,Episode 306=,Episode 305=',
            'R9 Loading the saved file brings back every prep and every length');
      // The ON side of the "month view only" proof, and the month view's other bars.
      out.otherOn = await otherBars();
      await exportsNow('On');

      // R10: a picked colour is saved and restored.
      await pickColour(3);
      var colouredText = await save();
      check((JSON.parse(colouredText).phaseColorOverride || {}).episodePrep === 3, 'R10 the colour saves as phaseColorOverride.episodePrep');
      await load(colouredText);
      var cr = await rowAt('February 2027', '2027-02-21');
      check($('swatch-episodePrep').style.backgroundColor === 'rgb(213, 240, 238)'
            && cr.bars.filter(function (b) { return b.ph === 'episodePrep'; }).every(function (b) { return b.bg === 'rgb(213, 240, 238)'; }),
            'R10 Load restores the colour on the swatch and the pills');

      // R11: ⛔ THE M-5 TRAP. The same calendar as a file saved before prep existed -- no prep-days, no
      // prep-name, no prepDays, no prep colour -- loaded AFTER this one (default 5, teal). Every prep
      // field must fall back to its default, never keep the previous file's, and nothing may be drawn.
      var old = JSON.parse(savedText);
      delete old.fields.byId['prep-days']; delete old.fields.byId['prep-name'];
      (old.episodeDefs || []).forEach(function (e) { delete e.prepDays; });
      (old.blockDefs || []).forEach(function (b) { delete b.prepDays; });
      if(old.phaseColorOverride) delete old.phaseColorOverride.episodePrep;
      delete old.prepPauseOff;
      // ...and with "Pause prep on days marked Off" TICKED on the calendar it replaces (owner, 20 Oct 2026).
      await clickPause();
      out.m5tick = pauseBox().checked;
      await load(JSON.stringify(old));
      out.m5 = {days: $('prep-days').value, name: $('prep-name').value, swatch: $('swatch-episodePrep').style.backgroundColor,
                list: prepList().map(function (x) { return x.value; }), map: await prepMap()};
      check(out.m5.days === '' && out.m5.name === 'Episodic Prep' && out.m5.swatch === 'rgb(228, 223, 236)' && out.m5.list.join('') === ''
            && sameMap(out.m5.map, {}), 'R11 an older calendar loaded after one with prep set opens with NO prep: default, name, colour and lengths all reset');
      tab('phases'); await T.sleep(150);
      check(out.m5tick === true && pauseBox().checked === false, 'R11 and with the Pause prep box UNTICKED, though the calendar before it had it ticked');
      // The OFF side: prep is gone, and nothing else in the month view moved -- Production keeps its lanes.
      out.otherOff = await otherBars();
      check(out.otherOn.length > 0 && JSON.stringify(out.otherOn) === JSON.stringify(out.otherOff),
            'R12 every non-prep bar of every month (' + out.otherOn.length + ') is identical with prep on and off: text, columns, lane');
      await exportsNow('Off');
      check(!!(out.xlsxOn && out.xlsxOff && out.pdfOn && out.pdfOff), 'R13 the workbook and the waterfall PDF were exported with prep on and off (gate.sh compares them)');
    }

    if(st === 'episodeprep-blocks'){
      // ================= BLOCKS (P4) =================
      await T.until(function () { return document.querySelectorAll('#prep-rows .prep-unit-row').length === 3; }, 'the restored block list', 200, 100);
      await settle();
      out.health = T.appHealth();
      tab('phases'); await T.sleep(200);
      out.restored = {mode: $('show-mode').value, name: $('prep-name').value, list: prepList()};
      check(out.restored.name === 'Block Prep', 'K0 the Blocks file’s old default name "Prep" opens as "Block Prep"');
      check(out.restored.mode === 'blocks' && out.restored.list.map(function (x) { return x.kind + ':' + x.name + '=' + x.value; }).join()
            === 'block:Block 1=,block:Block 2=,block:Block 3=12', 'K0 Blocks mode restores one box per block, Block 3 with its own 12');
      out.map = await prepMap();
      check(sameMap(out.map, WANT_BLOCKS), 'K1 every block’s prep matches the hand trace, Block 1 included');
      if(!sameMap(out.map, WANT_BLOCKS)) out.mapDiff = mapDiff(out.map, WANT_BLOCKS);
      var r = await rowAt('March 2027', '2027-02-28');
      var p = r && r.bars.filter(function (b) { return b.ph === 'production'; });
      var a = r && r.bars.filter(function (b) { return b.text === 'Prep Block 2'; }), b = r && r.bars.filter(function (b) { return b.text === 'Prep Block 3'; });
      out.lanes = r;
      check(p && p.length === 1 && a.length === 1 && b.length === 1 && p[0].text === 'Block 1' && a[0].cols === '2/7' && b[0].cols === '5/7'
            && a[0].lane === p[0].lane + 1 && b[0].lane === p[0].lane + 2,
            'K2 week of 2/28: Block 1 shooting, Prep Block 2 (Mon-Fri) under it, Prep Block 3 (Thu-Fri) stacked below');
      // K3: Schedule by keeps both modes' lengths (BLOCKS-PLAN §3: never discard the other mode's inputs).
      T.set('show-mode', 'episodes'); await settle();
      out.asEpisodes = await prepMap();
      check(sameMap(out.asEpisodes, WANT_ON), 'K3 switched to Episodes, the dormant per-episode lengths draw the Episodes hand trace');
      check($('prep-name').value === 'Episodic Prep', 'K3 switched to Episodes, the default name follows: "Episodic Prep"');
      T.set('show-mode', 'blocks'); await settle();
      check(sameMap(await prepMap(), WANT_BLOCKS), 'K3 switched back to Blocks, the per-block lengths draw again');
      check($('prep-name').value === 'Block Prep', 'K3 and the name follows back: "Block Prep"');
      // K4: a name the user typed is theirs: a mode switch keeps it, and the pills carry it.
      T.set('prep-name', 'Art Prep'); await settle();
      T.set('show-mode', 'episodes'); await settle();
      out.k4 = {name: $('prep-name').value, pills: Object.keys(await prepMap()).sort()};
      check(out.k4.name === 'Art Prep' && out.k4.pills.length === 6 && out.k4.pills.every(function (k) { return /^Art Prep 30\d$/.test(k); }),
            'K4 a typed name survives a Schedule-mode switch and names every pill ("Art Prep 30x")');
      T.set('show-mode', 'blocks'); await settle();
      check($('prep-name').value === 'Art Prep' && Object.keys(await prepMap()).sort().join() === 'Art Prep Block 1,Art Prep Block 2,Art Prep Block 3',
            'K4 and back in Blocks it still reads "Art Prep", pills "Art Prep Block 1-3"');
      // K5: typing passes through "Prep" on the way to "Prep Art", so the box is never rewritten while it
      // has the focus; leaving it with a default name puts this mode's back.
      tab('phases'); await T.sleep(100);
      $('prep-name').focus();
      setEl($('prep-name'), 'Prep'); await settle();
      out.k5 = {typing: $('prep-name').value, focused: document.activeElement === $('prep-name')};
      $('prep-name').blur(); $('prep-name').dispatchEvent(new Event('change', {bubbles: true})); await T.sleep(100);
      out.k5.left = $('prep-name').value;
      check(out.k5.focused && out.k5.typing === 'Prep' && out.k5.left === 'Block Prep',
            'K5 "Prep" is left alone while the box has the focus, and becomes "Block Prep" when it is left');
    }
  } catch (e) { out.EX = String(e && e.stack || e); fails.push('exception'); }
  out.fails = fails;
  out.checks = checks;
  out.pass = fails.length === 0 && !out.EX && !((out.health || {}).errors || []).length;
  out.err = (window.__ERR || []).slice(0, 8);
  T.done(out);
})(); });
